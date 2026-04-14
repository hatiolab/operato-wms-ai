import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 입고 적치 작업 화면
 *
 * 입고 완료(END) 후 WAITING 상태의 재고를 실제 창고 로케이션에 배치(적치)하는 화면.
 * 입고번호 스캔 → 재고 바코드 스캔 → 로케이션 스캔 → 적치 확정
 *
 * 화면 모드: list(입고번호 스캔) → work(항목 스캔) → complete(완료 확인)
 */
@customElement('pda-inbound-putaway')
export class PdaInboundPutaway extends connect(store)(PageView) {
  /** 화면 모드: list / work / complete */
  @state() mode = 'list'

  /** 입고번호 입력 상태 (list 모드) */
  @state() rcvNoInput = ''
  /** 목록 로딩 중 */
  @state() loading = false
  /** API 처리 중 */
  @state() processing = false

  /** 현재 작업 중인 입고번호 */
  @state() currentRcvNo = ''
  /** 적치 대상 재고 목록 — WAITING (미완료) */
  @state() workItems = []
  /** 적치 완료 재고 목록 — STORED */
  @state() doneItems = []
  /** 현재 처리 대상 항목 인덱스 */
  @state() currentItemIndex = -1
  /** 탭 키 (todo / done) */
  @state() currentTabKey = 'todo'
  /** 마지막 스캔 피드백 */
  @state() lastFeedback = null
  /** 작업 시작 시각 */
  @state() startedAt = null

  /**
   * 스캔 단계
   *  'barcode'  — 재고 바코드 스캔 대기
   *  'location' — 로케이션 스캔/입력 대기
   */
  @state() scanStep = 'barcode'
  /** 스캔된 재고 바코드 */
  @state() scannedBarcode = ''
  /** 적치할 로케이션 코드 */
  @state() locCd = ''

  /** 적치 대기 건수 (전체) */
  @state() waitingCount = 0
  /** 오늘 적치 완료 건수 (전체) */
  @state() storedCount = 0

  /** 재고 바코드 스캔 입력 */
  @query('#barcodeInput') _barcodeInput
  /** 로케이션 스캔 입력 */
  @query('#locationInput') _locationInput
  /** 입고번호 스캔 입력 */
  @query('#rcvNoInput') _rcvNoInput

  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      CommonGristStyles,
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-surface, #fafafa);
          overflow-y: auto;
        }

        /* 헤더 바 */
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--md-sys-color-surface-container-low, #f5f5f5);
          color: var(--md-sys-color-on-surface, #333);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .header-bar .title {
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .header-bar .back-btn {
          background: none;
          border: none;
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
        }

        .header-bar .actions {
          display: flex;
          gap: 8px;
        }

        .header-bar button {
          padding: 5px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .header-bar button:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .header-bar button.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .header-bar button:disabled {
          opacity: 0.4;
        }

        /* 현황 요약 카드 */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px 12px;
        }

        .summary-card {
          text-align: center;
          padding: 10px 4px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.15s;
          border: 2px solid transparent;
        }

        .summary-card[active] {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 6px rgba(25, 118, 210, 0.25);
        }

        .summary-card .count {
          font-size: 22px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-card .card-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .summary-card.waiting .count { color: var(--md-sys-color-error, #d32f2f); }
        .summary-card.done .count { color: #4CAF50; }

        /* 입고번호 스캔 입력 */
        .scan-rcv-no {
          padding: 8px 12px 12px;
        }

        .scan-rcv-no .scan-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-rcv-no .scan-row label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          white-space: nowrap;
        }

        .scan-rcv-no .scan-row ox-input-barcode {
          flex: 1;
        }

        .scan-rcv-no .btn-refresh {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .scan-rcv-no .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* 빈 안내 영역 */
        .empty-guide {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .empty-guide .guide-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .empty-guide .guide-text {
          font-size: 14px;
        }

        /* 항목 카드 목록 (list 모드) */
        .item-preview-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 12px 8px;
        }

        .item-preview-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin-bottom: 6px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .item-preview-card:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .item-preview-card .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--md-sys-color-error, #d32f2f);
        }

        .item-preview-card .status-dot.done {
          background: #4CAF50;
        }

        .item-preview-card .info {
          flex: 1;
          min-width: 0;
        }

        .item-preview-card .sku {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-preview-card .sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
        }

        .item-preview-card .qty-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-preview-card .qty-badge.done {
          background: #e8f5e9;
          color: #2e7d32;
        }

        /* 진행률 바 */
        .progress-section {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
        }

        .progress-bar-large {
          flex: 1;
          height: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-large .fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .progress-text {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 현재 적치 항목 카드 */
        .current-item-section {
          margin: 2px 12px;
          padding: 7px 10px 10px 8px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
        }

        .barcode-display {
          text-align: center;
          padding: 4px 0 8px;
          font-size: 22px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          letter-spacing: 2px;
        }

        .item-info {
          font-size: 14px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
        }

        .item-info .sku {
          font-weight: bold;
          font-size: 15px;
        }

        .item-info .qty {
          font-size: 14px;
          margin-top: 4px;
        }

        .item-info .lot {
          font-size: 12px;
          margin-top: 4px;
          opacity: 0.8;
        }

        /* 스캔 스텝 영역 — 한 줄 레이아웃 */
        .scan-step {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.5);
        }

        .scan-step.active {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 1px 4px rgba(25, 118, 210, 0.2);
        }

        .scan-step .step-badge {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .scan-step .step-badge.done-badge {
          background: #4CAF50;
        }

        .scan-step .step-label-text {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 700;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .scan-step ox-input-barcode {
          flex: 1;
          min-width: 0;
          --input-height: 24px;
          --input-font-size: 12px;
          font-size: 12px;
        }

        /* 로케이션 확인 텍스트 (스텝 2 완료 후) */
        .location-confirmed {
          flex: 1;
          font-size: 16px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
          letter-spacing: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 확정 버튼 — 로케이션 행 인라인 */
        .btn-confirm {
          flex-shrink: 0;
          padding: 6px 14px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-confirm:disabled {
          opacity: 0.4;
        }

        .btn-confirm:active:not(:disabled) {
          opacity: 0.85;
        }

        /* 스캔 피드백 */
        .scan-feedback {
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .scan-feedback.success {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .scan-feedback.error {
          background: #ffebee;
          color: #c62828;
        }

        .scan-feedback.warning {
          background: #fff8e1;
          color: #f57f17;
        }

        /* 탭 */
        .tabs {
          display: flex;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          margin: 1px 12px 0;
        }

        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }

        .tab[activate] {
          color: var(--md-sys-color-primary, #1976D2);
          border-bottom-color: var(--md-sys-color-primary, #1976D2);
        }

        .tab .badge {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
          border-radius: 10px;
          padding: 1px 7px;
          font-size: 11px;
        }

        .tab[activate] .badge {
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-primary, #1976D2);
        }

        /* 탭 콘텐츠 */
        .tab-content {
          padding: 8px 12px;
          overflow-y: auto;
          max-height: 220px;
        }

        .item-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          margin-bottom: 6px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          cursor: pointer;
        }

        .item-card .icon {
          font-size: 18px;
          flex-shrink: 0;
          width: 24px;
          text-align: center;
        }

        .item-card .info {
          flex: 1;
          min-width: 0;
        }

        .item-card .sku {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
        }

        .item-card .loc-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .loc-badge.done {
          background: #e8f5e9;
          color: #2e7d32;
        }

        /* 완료 화면 */
        .complete-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 20px 24px;
          text-align: center;
        }

        .complete-section .check-icon {
          font-size: 64px;
          margin-bottom: 12px;
        }

        .complete-section h3 {
          font-size: 20px;
          font-weight: 700;
          color: #4caf50;
          margin: 0 0 20px;
        }

        .result-card {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 10px;
          padding: 16px 20px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
          text-align: left;
        }

        .result-card .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .result-card .stat-row .label {
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .result-card .stat-row .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .complete-section .btn-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 360px;
        }

        .complete-section .btn-group button {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-next {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-list {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #333);
        }

        /* 빈 메시지 */
        .empty-message {
          text-align: center;
          padding: 32px 16px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        /* 로딩 */
        .loading-overlay {
          text-align: center;
          padding: 30px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }
      `
    ]
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: TermsUtil.tMenu('PutawayWork') || '적치 작업'
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    return html`
      ${this.mode !== 'list' ? this._renderHeader() : ''}
      ${this.mode === 'list'
        ? this._renderListMode()
        : this.mode === 'work'
          ? this._renderWorkMode()
          : this._renderCompleteMode()}
    `
  }

  /** 헤더 바 렌더링 — work/complete 모드 타이틀 및 버튼 */
  _renderHeader() {
    if (this.mode === 'complete') {
      return html`
        <div class="header-bar">
          <span class="title">
            <button class="back-btn" @click=${this._goBack}>◀</button>
            입고번호 : ${this.currentRcvNo}
          </span>
        </div>
      `
    }

    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          입고번호 : ${this.currentRcvNo}
        </span>
        <div class="actions">
          <button class="primary"
            ?disabled=${this.processing}
            @click=${this._closeWork}>
            ${TermsUtil.tButton('complete') || '작업완료'}
          </button>
        </div>
      </div>
    `
  }

  /** list 모드 렌더링 — 입고번호 스캔 입력 + 결과 미리보기 */
  _renderListMode() {
    if (this.loading) {
      return html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
    }

    const hasItems = this.workItems.length >= 0

    return html`
      <div class="summary-cards">
        <div class="summary-card waiting">
          <div class="count">${this.waitingCount}</div>
          <div class="card-label">${TermsUtil.tLabel('wait') || '대기'}</div>
        </div>
        <div class="summary-card done">
          <div class="count">${this.storedCount}</div>
          <div class="card-label">${TermsUtil.tLabel('completed') || '완료'}</div>
        </div>
        <div class="summary-card">
          <div class="count">${this.waitingCount + this.storedCount}</div>
          <div class="card-label">${TermsUtil.tLabel('total') || '전체'}</div>
        </div>
      </div>

      <div class="item-preview-list">
        ${this.workItems.map(item => this._renderPreviewCard(item))}
      </div>
        
      ${this.workItems.length === 0 ? html`
      <div class="empty-guide">
        <div class="guide-icon">📦</div>
        <div class="guide-text">${TermsUtil.tLabel('scan_barcode') || '입고번호를 스캔하세요'}</div>
      </div>` : ''}

      <div class="scan-rcv-no">
        <div class="scan-row">
        <label>${TermsUtil.tLabel('rcv_no') || '입고번호'}</label>
        <ox-input-barcode id="rcvNoInput"
          placeholder="입고번호 스캔"
          @change=${e => this._onScanRcvNo(e.target.value)}>
        </ox-input-barcode>
        <button class="btn-refresh" @click=${this._refresh}>
          ${TermsUtil.tButton('refresh') || '새로고침'}
        </button>
      </div>
    `
  }

  /** list 모드 미리보기 카드 렌더링 */
  _renderPreviewCard(item) {
    const isDone = item.status === 'STORED'
    return html`
      <div class="item-preview-card" @click=${() => !isDone && this._selectItem(item)}>
        <div class="status-dot ${isDone ? 'done' : ''}"></div>
        <div class="info">
          <div class="sku">${item.sku_cd}${item.sku_nm ? ` (${item.sku_nm})` : ''}</div>
          <div class="sub">
            바코드: ${item.barcode || '-'}
            ${item.lot_no ? ` · LOT: ${item.lot_no}` : ''}
            ${isDone && item.loc_cd ? ` → ${item.loc_cd}` : ''}
          </div>
        </div>
        <span class="qty-badge ${isDone ? 'done' : ''}">${item.inv_qty || 0}</span>
      </div>
    `
  }

  /** work 모드 렌더링 — 진행률, 현재 항목, 스캔 스텝, 탭 */
  _renderWorkMode() {
    const completedCount = this.doneItems.length
    const totalCount = this.workItems.length + completedCount
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const currentItem = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null

    return html`
      <div class="progress-section">
        <div class="progress-bar-large">
          <div class="fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${completedCount}/${totalCount}건</div>
      </div>

  ${currentItem ? html`
        <div class="current-item-section">
          <div class="barcode-display">${currentItem.barcode}</div>
          <div class="item-info">
            <div class="sku">
              ${currentItem.sku_cd}
              ${currentItem.sku_nm ? html`<span style="font-weight:normal;font-size:13px;"> (${currentItem.sku_nm})</span>` : ''}
            </div>
            <div class="qty">
              ${TermsUtil.tLabel('inv_qty') || '수량'}: ${currentItem.inv_qty || 0} | ${TermsUtil.tLabel('com_cd') || '화주사'}: ${currentItem.com_cd || '-'}
            </div>
            ${currentItem.lot_no ? html`
              <div class="lot">
                LOT: ${currentItem.lot_no}
                ${currentItem.expired_date ? ` · 유통기한: ${currentItem.expired_date}` : ''}
              </div>
            ` : ''}
          </div>

          ${this._renderScanSteps()}

          ${this.lastFeedback ? html`
            <div class="scan-feedback ${this.lastFeedback.type}">
              ${this.lastFeedback.message}
            </div>
          ` : ''}
        </div>
      ` : html`
        <div class="current-item-section">
          <div class="item-info" style="text-align:center; padding: 12px 0;">
            모든 항목의 적치가 완료되었습니다 ✅
          </div>
        </div>
      `}

      ${this._renderWorkTabs()}
      ${this._renderWorkTabContent()}
`
  }

  /** 스캔 2단계 렌더링 — 각 단계를 한 줄로 배치, 확정 버튼은 로케이션 행에 인라인 */
  _renderScanSteps() {
    const step1Done = this.scanStep === 'location' || !!this.locCd
    const step2Done = !!this.locCd

    return html`
      <!-- 스텝 1: 재고 바코드 스캔 — 뱃지 + 라벨 + input -->
      <div class="scan-step ${this.scanStep === 'barcode' ? 'active' : ''}">
        <span class="step-badge ${step1Done ? 'done-badge' : ''}">${step1Done ? '✓' : '1'}</span>
        <span class="step-label-text">${TermsUtil.tLabel('scan_barcode') || '바코드 스캔'}</span>
        ${this.scanStep === 'barcode' ? html`
          <ox-input-barcode id="barcodeInput"
            placeholder="바코드 스캔"
            ?disabled=${this.processing}
            @change=${e => this._onScanBarcode(e.target.value)}>
          </ox-input-barcode>
        ` : html`
          <span style="flex:1;font-size:12px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${this.scannedBarcode || ''}
          </span>
        `}
      </div>

      <!-- 스텝 2: 로케이션 스캔 — 뱃지 + 라벨 + input + 확정 버튼 -->
      <div class="scan-step ${this.scanStep === 'location' ? 'active' : ''}">
        <span class="step-badge ${step2Done ? 'done-badge' : ''}">${step2Done ? '✓' : '2'}</span>
        <span class="step-label-text">${TermsUtil.tLabel('loc_cd') || '로케이션'}</span>
        ${this.scanStep === 'location' ? html`
          <ox-input-barcode id="locationInput"
            placeholder="로케이션 스캔"
            ?disabled=${this.processing}
            @change=${e => this._onScanLocation(e.target.value)}>
          </ox-input-barcode>
        ` : html`
          <span class="location-confirmed">${this.locCd || ''}</span>
        `}
        <button class="btn-confirm"
          ?disabled=${this.processing || !this.locCd}
          @click=${this._confirmPutaway}>
          ${TermsUtil.tButton('confirm') || '확정'}
        </button>
      </div>
    `
  }

  /** work 모드 탭 바 렌더링 */
  _renderWorkTabs() {
    return html`
    <div class="tabs">
      <div class="tab" ?activate=${'todo' === this.currentTabKey}
        @click=${() => (this.currentTabKey = 'todo')}>
        <span>${TermsUtil.tLabel('not_completed') || '미완료'}</span>
        <span class="badge">${this.workItems.length}</span>
      </div>
      <div class="tab" ?activate=${'done' === this.currentTabKey}
        @click=${() => (this.currentTabKey = 'done')}>
        <span>${TermsUtil.tLabel('completed') || '완료'}</span>
        <span class="badge">${this.doneItems.length}</span>
      </div>
    </div>
    `
  }

  /** work 모드 탭 콘텐츠 렌더링 */
  _renderWorkTabContent() {
    const isTodo = this.currentTabKey === 'todo'
    const items = isTodo ? this.workItems : this.doneItems

    if (!items.length) {
      return html`
        <div class="tab-content">
          <div class="empty-message">
            ${isTodo ? '미완료 항목 없음' : '완료 항목 없음'}
          </div>
        </div>
      `
    }

    return html`
      <div class="tab-content">
        ${items.map(item => {
      const isCurrent = isTodo && this.workItems.indexOf(item) === this.currentItemIndex
      const icon = isTodo ? (isCurrent ? '▶' : '☐') : '✅'

      return html`
            <div class="item-card"
              @click=${() => isTodo && this._selectItemByIndex(this.workItems.indexOf(item))}>
              <span class="icon">${icon}</span>
              <div class="info">
                <div class="sku">${item.sku_cd} ${item.sku_nm ? `(${item.sku_nm})` : ''}</div>
                <div class="sub">
                  ${item.barcode || '-'}
                  ${item.lot_no ? ` · LOT: ${item.lot_no}` : ''}
                </div>
              </div>
              <span class="loc-badge ${!isTodo ? 'done' : ''}">
                ${isTodo ? (item.inv_qty || 0) : (item.loc_cd || '-')}
              </span>
            </div>
          `
    })}
      </div>
    `
  }

  /** complete 모드 렌더링 — 완료 통계 + 버튼 */
  _renderCompleteMode() {
    const elapsed = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0
    const min = Math.floor(elapsed / 60)
    const sec = elapsed % 60
    const doneCount = this.doneItems.length
    const totalCount = this.workItems.length + doneCount

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('processed') || '적치 완료!'}</h3>

        <div class="result-card">
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('rcv_no') || '입고번호'}</span>
            <span class="value">${this.currentRcvNo}</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tText('processed') || '처리 완료'}</span>
            <span class="value">${doneCount} / ${totalCount}건</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('elapsed_time') || '소요 시간'}</span>
            <span class="value">${min}분 ${sec}초</span>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn-next" @click=${this._startNewWork}>
            ${TermsUtil.tLabel('next_work') || '다음 작업'}
          </button>
          <button class="btn-list" @click=${this._goBack}>
  ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /** 페이지 초기화 — 요약 건수 조회 */
  pageInitialized() {
    this.workItems = []
    this.currentRcvNo = ''
    this._loadPutawaySummary()
  }

  /**
   * 입고번호 스캔 핸들러 — 적치 대기 재고 목록 조회 후 work 모드 전환
   * @param {string} rcvNo
   */
  async _onScanRcvNo(rcvNo) {
    if (!rcvNo || this.loading) return

    this.loading = true
    try {
      await this._loadWorkItems(rcvNo)

      if (!this.workItems.length && !this.doneItems.length) {
        this._showFeedback(`적치 대기 재고가 없습니다: ${rcvNo}`, 'warning')
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'warn', message: `적치 대기 재고가 없습니다: ${rcvNo}` }
        }))
        if (this._rcvNoInput) this._rcvNoInput.value = ''
        return
      }

      this.currentRcvNo = rcvNo
      this.startedAt = Date.now()
      this.currentTabKey = 'todo'
      this.lastFeedback = null
      this._resetScanStep()
      this._moveToNextItem()
      this.mode = 'work'

      setTimeout(() => this._focusBarcodeInput(), 200)
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '재고 조회에 실패했습니다' }
      }))
    } finally {
      this.loading = false
      if (this._rcvNoInput) this._rcvNoInput.value = ''
    }
  }

  /**
   * 재고 바코드 스캔 핸들러 (스텝 1)
   * workItems 중 WAITING 상태의 항목과 매칭하여 currentItemIndex 설정
   * @param {string} barcode
   */
  _onScanBarcode(barcode) {
    if (!barcode || this.processing) return

    const currentItem = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null

    // 1. 현재 항목과 매칭
    if (currentItem && (currentItem.barcode === barcode || currentItem.sku_cd === barcode || currentItem.sku_bcd === barcode)) {
      this.scannedBarcode = barcode
      this.scanStep = 'location'
      this._showFeedback(`${currentItem.sku_cd} 확인 — 로케이션을 스캔하세요`, 'success')
      this._resetBarcodeInput()
      setTimeout(() => this._focusLocationInput(), 100)
      return
    }

    // 2. 전체 미완료 항목에서 검색
    const matchIndex = this.workItems.findIndex(
      item => item.status === 'WAITING' &&
        (item.barcode === barcode || item.sku_cd === barcode || item.sku_bcd === barcode)
    )

    if (matchIndex >= 0) {
      this.currentItemIndex = matchIndex
      this.scannedBarcode = barcode
      this.scanStep = 'location'
      this._showFeedback(`${this.workItems[matchIndex].sku_cd} 확인 — 로케이션을 스캔하세요`, 'success')
      this._resetBarcodeInput()
      setTimeout(() => this._focusLocationInput(), 100)
      return
    }

    // 3. 이미 완료된 항목인지 확인
    const doneItem = this.workItems.find(
      item => item.status === 'STORED' &&
        (item.barcode === barcode || item.sku_cd === barcode || item.sku_bcd === barcode)
    )

    if (doneItem) {
      this._showFeedback(`이미 적치 완료된 항목입니다: ${doneItem.sku_cd} → ${doneItem.loc_cd} `, 'warning')
    } else {
      this._showFeedback(`일치하는 재고를 찾을 수 없습니다: ${barcode} `, 'error')
      navigator.vibrate?.(200)
    }

    this._resetBarcodeInput()
  }

  /**
   * 로케이션 스캔/입력 핸들러 (스텝 2)
   * @param {string} locCd
   */
  _onScanLocation(locCd) {
    if (!locCd || this.processing) return
    this.locCd = locCd
    this._showFeedback(`로케이션 확인: ${locCd} — 확정 버튼을 눌러주세요`, 'success')
    if (this._locationInput) this._locationInput.value = ''
  }

  /**
   * 적치 확정 API 호출
   * PUT /rest/inventory_trx/put_away/{inventory_id}
   */
  async _confirmPutaway() {
    const item = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null
    if (!item) {
      this._showFeedback('적치할 항목이 없습니다', 'warning')
      return
    }

    if (!this.locCd) {
      this._showFeedback('로케이션을 스캔해주세요', 'warning')
      return
    }

    this.processing = true
    try {
      await ServiceUtil.restPut(`inventory_trx/put_away/${item.id}`, {
        barcode: item.barcode,
        loc_cd: this.locCd
      })

      // 서버에서 최신 항목 목록 재조회
      await this._loadWorkItems(this.currentRcvNo)

      const completedCount = this.doneItems.length
      const totalCount = this.workItems.length + completedCount
      this._showFeedback(`적치 완료 (${completedCount} / ${totalCount})`, 'success')

      if (completedCount >= totalCount) {
        await this._onAllItemsCompleted()
      } else {
        this._resetScanStep()
        this._moveToNextItem()
        setTimeout(() => this._focusBarcodeInput(), 200)
      }
    } catch (error) {
      this._showFeedback(error.message || '적치 처리에 실패했습니다', 'error')
      navigator.vibrate?.(200)
    } finally {
      this.processing = false
    }
  }

  /**
   * 적치 작업 완료 처리 — 미완료 항목이 있으면 확인 후 complete 모드 전환
   */
  async _closeWork() {
    const remaining = this.workItems.filter(i => i.status === 'WAITING')
    if (remaining.length > 0) {
      const confirmed = await UiUtil.showAlertPopup(
        'label.confirm',
        `미완료 항목 ${remaining.length}건이 있습니다.작업을 완료하시겠습니까 ? `,
        'question', 'confirm', 'cancel'
      )
      if (!confirmed) return
    }

    this.mode = 'complete'
  }

  /**
   * 모든 항목 완료 시 자동 complete 모드 전환
   */
  async _onAllItemsCompleted() {
    document.dispatchEvent(new CustomEvent('notify', {
      detail: { level: 'info', message: '모든 항목 적치 완료!' }
    }))
    this.mode = 'complete'
  }

  /**
   * 새 작업 시작 — list 모드로 복귀하고 입고번호 스캔 대기
   */
  _startNewWork() {
    this._goBack()
  }

  /**
   * list 모드로 복귀
   */
  _goBack() {
    this.mode = 'list'
    this.currentRcvNo = ''
    this.workItems = []
    this.doneItems = []
    this.currentItemIndex = -1
    this.lastFeedback = null
    this._resetScanStep()
  }

  /**
   * 입고번호로 적치 대기(WAITING) + 완료(STORED) 재고 목록 재조회
   * @param {string} rcvNo
   */
  async _loadWorkItems(rcvNo) {
    try {
      const query = JSON.stringify([
        { name: 'rcv_no', operator: 'eq', value: rcvNo }
      ])
      const [waitingResult, doneResult] = await Promise.all([
        ServiceUtil.restGet(`inbound_trx/putaway/work_items?query=${encodeURIComponent(query)}&limit=200`),
        ServiceUtil.restGet(`inbound_trx/putaway/done_items?rcv_no=${encodeURIComponent(rcvNo)}`)
      ])
      this.workItems = waitingResult?.items || waitingResult || []
      this.doneItems = doneResult?.items || doneResult || []
    } catch (error) {
      console.error('적치 재고 목록 조회 실패:', error)
    }
  }

  /**
   * 새로고침 — 대기/완료 요약 건수만 재조회 (list 모드 전용)
   */
  async _refresh() {
    await this._loadPutawaySummary()
  }

  /**
   * 적치 대기/완료 요약 건수 조회
   * GET /rest/inbound_dashboard/putaway-summary
   */
  async _loadPutawaySummary() {
    try {
      const data = await ServiceUtil.restGet('inbound_dashboard/putaway-summary')
      this.waitingCount = data?.waiting_count ?? 0
      this.storedCount = data?.stored_count ?? 0
    } catch (error) {
      console.error('적치 요약 조회 실패:', error)
    }
  }

  /**
   * 다음 WAITING 항목으로 인덱스 이동
   */
  _moveToNextItem() {
    const nextIdx = this.workItems.findIndex(i => i.status === 'WAITING')
    this.currentItemIndex = nextIdx
  }

  /**
   * 목록 카드 클릭으로 특정 항목 선택 (list 모드)
   * @param {object} item
   */
  _selectItem(item) {
    const idx = this.workItems.indexOf(item)
    if (idx < 0) return
    this.currentItemIndex = idx
    this.currentRcvNo = item.rcv_no || this.currentRcvNo
    this.startedAt = this.startedAt || Date.now()
    this.currentTabKey = 'todo'
    this.lastFeedback = null
    this._resetScanStep()
    this.mode = 'work'
    setTimeout(() => this._focusBarcodeInput(), 200)
  }

  /**
   * 탭 목록에서 특정 항목 인덱스로 선택
   * @param {number} idx
   */
  _selectItemByIndex(idx) {
    this.currentItemIndex = idx
    this._resetScanStep()
    setTimeout(() => this._focusBarcodeInput(), 100)
  }

  /**
   * 피드백 메시지 표시
   * @param {string} message
   * @param {string} type — 'success' | 'error' | 'warning'
   */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }

  /**
   * 스캔 단계 초기화
   */
  _resetScanStep() {
    this.scanStep = 'barcode'
    this.scannedBarcode = ''
    this.locCd = ''
  }

  /**
   * 재고 바코드 입력 필드 초기화 및 포커스
   */
  _resetBarcodeInput() {
    if (this._barcodeInput) {
      this._barcodeInput.input.value = ''
      this._barcodeInput.input.focus()
    }
  }

  /**
   * 재고 바코드 입력 필드에 포커스
   */
  _focusBarcodeInput() {
    this._resetBarcodeInput()
  }

  /**
   * 로케이션 입력 필드에 포커스
   */
  _focusLocationInput() {
    if (this._locationInput) {
      this._locationInput.input.value = ''
      this._locationInput.input.focus()
    }
  }
}
