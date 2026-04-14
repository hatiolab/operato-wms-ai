import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 입고 작업 화면
 *
 * 창고에서 PDA로 입고 주문을 선택한 뒤, 상품 바코드를 스캔하여
 * 항목별 실제 입고 수량을 입력·확인하는 화면.
 *
 * 화면 모드: list(주문 목록) → work(항목 스캔) → complete(완료 확인)
 */
@customElement('pda-inbound-receiving')
export class PdaInboundReceiving extends connect(store)(PageView) {
  /** 화면 모드: list / work / complete */
  @state() mode = 'list'

  /** 입고 주문 목록 */
  @state() taskList = []
  /** 목록 필터 상태 */
  @state() filterStatus = 'ALL'
  /** 목록 로딩 중 */
  @state() loading = false
  /** API 처리 중 */
  @state() processing = false

  /** 선택된 입고 주문 헤더 */
  @state() currentReceiving = null
  /** 선택된 입고 주문의 항목 목록 */
  @state() receivingItems = []
  /** 현재 처리 대상 항목 인덱스 */
  @state() currentItemIndex = -1
  /** 실제 입고 수량 입력값 */
  @state() rcvQty = 0
  /** 완료 항목 수 */
  @state() completedCount = 0
  /** 전체 항목 수 */
  @state() totalCount = 0
  /** 탭 키 (todo / done) */
  @state() currentTabKey = 'todo'
  /** 마지막 스캔 피드백 */
  @state() lastFeedback = null
  /** 작업 시작 시각 */
  @state() startedAt = null

  /** 상품 바코드 스캔 입력 */
  @query('#barcodeInput') _barcodeInput
  /** 입고번호 스캔 입력 */
  @query('#rcvScanInput') _rcvScanInput

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

        .header-bar button.danger {
          border-color: var(--md-sys-color-error, #d32f2f);
          color: var(--md-sys-color-error, #d32f2f);
          background: var(--md-sys-color-surface-container-lowest, #fff);
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
        .scan-task-order {
          padding: 8px 12px 12px;
        }

        .scan-task-order label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          display: block;
          margin-bottom: 4px;
        }

        .scan-task-order .scan-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-task-order .scan-row ox-input-barcode {
          flex: 1;
        }

        .scan-task-order .btn-refresh {
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

        .scan-task-order .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* 입고 주문 카드 목록 */
        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }

        .task-card {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .task-card:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .task-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .task-card .task-no {
          font-weight: bold;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .task-card .status-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .task-card .status-badge.ready {
          background: #fff3e0;
          color: #ff9800;
        }

        .task-card .status-badge.start {
          background: #e3f2fd;
          color: #1976d2;
        }

        .task-card .status-badge.end {
          background: #e8f5e9;
          color: #4CAF50;
        }

        .task-card .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 6px;
        }

        .task-card .progress-bar {
          height: 4px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }

        .task-card .progress-bar .fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 2px;
          transition: width 0.3s;
        }

        /* 진행률 바 */
        .progress-section {
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
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
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 현재 입고 항목 */
        .current-item-section {
          margin: 4px 12px;
          padding: 12px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
        }

        .location-display {
          text-align: center;
          padding: 4px 0 8px;
          font-size: 26px;
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

        .barcode-input {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .barcode-input label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
        }

        .barcode-input ox-input-barcode {
          flex: 1;
        }

        /* 수량 입력 행 */
        .qty-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .qty-input-row label {
          flex: 0 0 auto;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .qty-input-row input {
          flex: 1;
          min-width: 0;
          width: 0;
          height: 36px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          box-sizing: border-box;
        }

        .qty-input-row .btn-qty {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .qty-input-row .btn-qty:active {
          opacity: 0.8;
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
          margin: 8px 12px 0;
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

        /* 탭 콘텐츠 — 항목 목록 */
        .tab-content {
          padding: 8px 12px;
          overflow-y: auto;
          max-height: 280px;
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

        .item-card .loc {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .sku {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .qty-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .qty-badge.done {
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

        /* 빈 목록 */
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
      title: TermsUtil.tMenu('ReceivingWork') || '입고 작업'
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
    const rcvNo = this.currentReceiving?.rcv_no || ''

    if (this.mode === 'complete') {
      return html`
        <div class="header-bar">
          <span class="title">
            <button class="back-btn" @click=${this._goBack}>◀</button>
            입고번호 : ${rcvNo}
          </span>
        </div>
      `
    }

    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          입고번호 : ${rcvNo}
        </span>
        <div class="actions">
          <button class="primary"
            ?disabled=${this.processing || !this.rcvQty}
            @click=${this._confirmReceive}>
            ${TermsUtil.tButton('confirm') || '확인'}
          </button>
          <button class="primary"
            ?disabled=${this.processing}
            @click=${this._closeReceiving}>
            ${TermsUtil.tButton('complete') || '작업완료'}
          </button>
        </div>
      </div>
    `
  }

  /** list 모드 렌더링 — 현황 요약, 입고주문 목록, 입고번호 스캔 */
  _renderListMode() {
    if (this.loading) {
      return html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
    }

    const ready = this.taskList.filter(t => t.status === 'READY')
    const start = this.taskList.filter(t => t.status === 'START')
    const end = this.taskList.filter(t => t.status === 'END')
    const filtered =
      this.filterStatus === 'READY' ? ready
        : this.filterStatus === 'START' ? start
          : this.filterStatus === 'END' ? end
            : [...ready, ...start]

    return html`
      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active=${this.filterStatus === 'READY'}
          @click=${() => this._toggleFilter('READY')}>
          <div class="count">${ready.length}</div>
          <div class="card-label">${TermsUtil.tLabel('wait') || '대기'}</div>
        </div>
        <div class="summary-card"
          ?active=${this.filterStatus === 'START'}
          @click=${() => this._toggleFilter('START')}>
          <div class="count">${start.length}</div>
          <div class="card-label">${TermsUtil.tLabel('in_progress') || '진행중'}</div>
        </div>
        <div class="summary-card done"
          ?active=${this.filterStatus === 'END'}
          @click=${() => this._toggleFilter('END')}>
          <div class="count">${end.length}</div>
          <div class="card-label">${TermsUtil.tLabel('completed') || '완료'}</div>
        </div>
      </div>

      <div class="task-list">
        ${filtered.length === 0
        ? html`<div class="empty-message">${TermsUtil.tText('No Data') || '입고 대기 주문이 없습니다'}</div>`
        : filtered.map(r => this._renderTaskCard(r))}
      </div>

      <div class="scan-task-order">
        <label>${TermsUtil.tLabel('rcv_no') || '입고번호 스캔'}</label>
        <div class="scan-row">
          <ox-input-barcode id="rcvScanInput"
            placeholder="입고번호 스캔"
            @change=${e => this._onScanReceivingNo(e.target.value)}>
          </ox-input-barcode>
          <button class="btn-refresh" @click=${this._refresh}>
            ${TermsUtil.tButton('refresh') || '새로고침'}
          </button>
        </div>
      </div>
    `
  }

  /** 입고 주문 카드 렌더링 */
  _renderTaskCard(r) {
    const isStart = r.status === 'START'
    const finishedItems = r.finished_items || 0
    const totalItems = r.total_items || 0
    const progressPct = totalItems > 0 ? Math.round((finishedItems / totalItems) * 100) : 0

    return html`
      <div class="task-card" @click=${() => this._selectReceiving(r)}>
        <div class="card-header">
          <span class="task-no">입고번호 : ${r.rcv_no}</span>
          <span class="status-badge ${(r.status || '').toLowerCase()}">
            ${r.status === 'READY' ? (TermsUtil.tLabel('wait') || '대기')
        : r.status === 'START' ? (TermsUtil.tLabel('in_progress') || '진행중')
          : (TermsUtil.tLabel('completed') || '완료')}
          </span>
        </div>
        <div class="sub-info">
          화주사 : ${r.com_cd || ''} | 공급사 : ${r.vend_cd || ''} | 입고 예정일 : ${r.rcv_req_date || ''}
          ${totalItems ? ` · ${totalItems}건` : ''}
        </div>
        ${isStart ? html`
          <div class="progress-bar">
            <div class="fill" style="width: ${progressPct}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /** work 모드 렌더링 — 진행률, 현재 항목, 바코드 스캔, 수량 입력, 탭 */
  _renderWorkMode() {
    const progressPct = this.totalCount > 0
      ? Math.round((this.completedCount / this.totalCount) * 100) : 0
    const totalQty = this.receivingItems.reduce((s, i) => s + (i.rcv_exp_qty || 0), 0)
    const doneQty = this.receivingItems.reduce((s, i) => s + (i.rcv_qty || 0), 0)
    const currentItem = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null

    return html`
      <div class="progress-section">
        <div class="progress-bar-large">
          <div class="fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${this.completedCount}/${this.totalCount}건 (${doneQty}/${totalQty})</div>
      </div>

      ${currentItem ? html`
        <div class="current-item-section">
          ${currentItem.loc_cd
          ? html`<div class="location-display">${currentItem.loc_cd}</div>`
          : ''}
          <div class="item-info">
            <div class="sku">
              #${currentItem.rcv_exp_seq} : ${currentItem.sku_cd}
              ${currentItem.sku_nm ? html`<span style="font-weight:normal;font-size:13px;"> (${currentItem.sku_nm})</span>` : ''}
            </div>
            <div class="qty">
              예정: ${currentItem.rcv_exp_qty || 0}
            </div>
            ${currentItem.lot_no ? html`
              <div class="lot">
                LOT: ${currentItem.lot_no}
                ${currentItem.expired_date ? ` · 유통기한: ${currentItem.expired_date}` : ''}
              </div>
            ` : ''}
          </div>

          <div class="barcode-input">
            <label>${TermsUtil.tLabel('scan_barcode') || '상품 바코드 스캔'}</label>
            <ox-input-barcode id="barcodeInput"
              placeholder="바코드 스캔"
              ?disabled=${this.processing}
              @change=${e => this._onScanBarcode(e.target.value)}>
            </ox-input-barcode>
          </div>

          <div class="qty-input-row">
            <label>${TermsUtil.tLabel('rcv_qty') || '입고수량'}</label>
            <button class="btn-qty"
              @click=${() => { if (this.rcvQty > 0) this.rcvQty-- }}>−</button>
            <input type="number" min="0"
              .value=${String(this.rcvQty)}
              @input=${e => (this.rcvQty = parseInt(e.target.value) || 0)} />
            <button class="btn-qty"
              @click=${() => { this.rcvQty++ }}>+</button>
          </div>

          ${this.lastFeedback ? html`
            <div class="scan-feedback ${this.lastFeedback.type}">
              ${this.lastFeedback.message}
            </div>
          ` : ''}
        </div>
      ` : html`
        <div class="current-item-section">
          <div class="item-info" style="text-align:center; padding: 12px 0;">
            모든 항목의 입고가 완료되었습니다 ✅
          </div>
        </div>
      `}

      ${this._renderWorkTabs()}
      ${this._renderWorkTabContent()}
    `
  }

  /** work 모드 탭 바 렌더링 — 미완료/완료 탭 */
  _renderWorkTabs() {
    const todoItems = this.receivingItems.filter(i => i.status !== 'END' && i.status !== 'CANCEL')
    const doneItems = this.receivingItems.filter(i => i.status === 'END')

    return html`
      <div class="tabs">
        <div class="tab" ?activate=${'todo' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'todo')}>
          <span>${TermsUtil.tLabel('not_completed') || '미완료'}</span>
          <span class="badge">${todoItems.length}</span>
        </div>
        <div class="tab" ?activate=${'done' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'done')}>
          <span>${TermsUtil.tLabel('completed') || '완료'}</span>
          <span class="badge">${doneItems.length}</span>
        </div>
      </div>
    `
  }

  /** work 모드 탭 콘텐츠 렌더링 — 미완료/완료 항목 목록 */
  _renderWorkTabContent() {
    const items = this.currentTabKey === 'todo'
      ? this.receivingItems.filter(i => i.status !== 'END' && i.status !== 'CANCEL')
      : this.receivingItems.filter(i => i.status === 'END')

    if (!items.length) {
      return html`
        <div class="tab-content">
          <div class="empty-message">
            ${this.currentTabKey === 'todo' ? '미완료 항목 없음' : '완료 항목 없음'}
          </div>
        </div>
      `
    }

    return html`
      <div class="tab-content">
        ${items.map(item => {
      const idx = this.receivingItems.indexOf(item)
      const isCurrent = idx === this.currentItemIndex
      const isDone = item.status === 'END'
      const icon = isDone ? '✅' : isCurrent ? '▶' : '☐'

      return html`
            <div class="item-card" @click=${() => !isDone && (this.currentItemIndex = idx)}>
              <span class="icon">${icon}</span>
              <div class="info">
                <div class="loc">
                  #${item.rcv_exp_seq || '-'}
                  ${item.loc_cd ? `로케이션 : ${item.loc_cd}` : ''}
                  상품 : ${item.sku_cd} 
                </div>
                <div class="sku">${item.sku_nm || ''}</div>
              </div>
              <span class="qty-badge ${isDone ? 'done' : ''}">
                ${isDone
          ? `${item.rcv_qty || 0}/${item.rcv_exp_qty || 0}`
          : `${item.rcv_exp_qty || 0}`}
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
    const totalRcvQty = this.receivingItems.reduce((s, i) => s + (i.rcv_qty || 0), 0)
    const doneCount = this.receivingItems.filter(i => i.status === 'END').length

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('processed') || '처리 완료!'}</h3>

        <div class="result-card">
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('rcv_no') || '입고번호'}</span>
            <span class="value">${this.currentReceiving?.rcv_no || ''}</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tText('processed') || '처리 완료'}</span>
            <span class="value">${doneCount}건</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('rcv_qty') || '입고 수량'}</span>
            <span class="value">${totalRcvQty}</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('elapsed_time') || '소요 시간'}</span>
            <span class="value">${min}분 ${sec}초</span>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn-next" @click=${this._selectNextTask}>
            ${TermsUtil.tLabel('next_work') || '다음 작업'}
          </button>
          <button class="btn-list" @click=${this._goBack}>
            ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /** 페이지 초기화 — 입고 주문 목록 조회 */
  pageInitialized() {
    this._loadTaskList()
  }

  /** 입고 주문 목록 조회 (READY + START 상태) */
  async _loadTaskList() {
    this.loading = true
    try {
      const query = JSON.stringify([
        { name: 'status', operator: 'in', value: 'READY,START,END' },
        { name: 'rcv_req_date', operator: 'eq', value: ValueUtil.todayFormatted() }
      ])
      const result = await ServiceUtil.restGet(`receivings?query=${encodeURIComponent(query)}&limit=100`)
      this.taskList = result?.items || result || []
    } catch (error) {
      console.error('입고 주문 목록 조회 실패:', error)
      this.taskList = []
    } finally {
      this.loading = false
    }
  }

  /** 입고 항목 목록 조회 + 현재 항목 설정 */
  async _loadReceivingItems(receivingId) {
    try {
      const result = await ServiceUtil.restGet(`receivings/${receivingId}/items`)
      this.receivingItems = result?.items || result || []
      this.totalCount = this.receivingItems.length
      this.completedCount = this.receivingItems.filter(i => i.status === 'END').length
      this._moveToNextItem()
    } catch (error) {
      console.error('입고 항목 조회 실패:', error)
      this.receivingItems = []
    }
  }

  /** 입고번호 바코드 스캔으로 빠른 선택 */
  _onScanReceivingNo(barcode) {
    if (!barcode) return
    const r = this.taskList.find(t => t.rcv_no === barcode)
    if (r) {
      this._selectReceiving(r)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `입고번호를 찾을 수 없습니다: ${barcode}` }
      }))
      navigator.vibrate?.(200)
    }
    if (this._rcvScanInput) {
      this._rcvScanInput.value = ''
    }
  }

  /** 입고 주문 선택 → 작업 시작 → 항목 로드 → work 모드 전환 */
  async _selectReceiving(r) {
    if (this.processing) return
    this.processing = true

    try {
      if (r.status === 'READY') {
        await ServiceUtil.restPost(`inbound_trx/receiving_orders/${r.id}/start`)
        r.status = 'START'
      }

      this.currentReceiving = r
      this.startedAt = Date.now()
      this.lastFeedback = null
      this.currentTabKey = 'todo'
      this.rcvQty = 0

      await this._loadReceivingItems(r.id)
      this._setInitialRcvQty()
      this.mode = 'work'

      setTimeout(() => this._focusBarcodeInput(), 200)
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '입고 작업을 시작할 수 없습니다' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 상품 바코드 스캔 핸들러 — 현재 항목 또는 전체에서 매칭 */
  _onScanBarcode(barcode) {
    if (!barcode || this.processing) return

    const currentItem = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null

    // 1. 현재 항목과 매칭
    if (currentItem && (currentItem.barcode === barcode || currentItem.sku_cd === barcode)) {
      this.rcvQty = currentItem.rcv_exp_qty || 1
      this._showFeedback(`${currentItem.sku_cd} 매칭 — ${this.rcvQty} 확인`, 'success')
      this._resetBarcodeInput()
      return
    }

    // 2. 전체 미완료 항목에서 검색
    const matchIndex = this.receivingItems.findIndex(
      item => item.status !== 'END' && item.status !== 'CANCEL' &&
        (item.barcode === barcode || item.sku_cd === barcode)
    )

    if (matchIndex >= 0) {
      this.currentItemIndex = matchIndex
      const item = this.receivingItems[matchIndex]
      this.rcvQty = item.rcv_exp_qty || 1
      this._showFeedback(`${item.sku_cd} 매칭${item.loc_cd ? ` (${item.loc_cd})` : ''} — ${this.rcvQty}`, 'success')
      this._resetBarcodeInput()
      return
    }

    // 3. 이미 완료된 항목인지 확인
    const doneItem = this.receivingItems.find(
      item => item.status === 'END' &&
        (item.barcode === barcode || item.sku_cd === barcode)
    )

    if (doneItem) {
      this._showFeedback(`이미 입고 완료된 상품입니다: ${doneItem.sku_cd}`, 'warning')
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'warn', message: '이미 입고 완료된 상품입니다' }
      }))
    } else {
      this._showFeedback(`일치하는 상품을 찾을 수 없습니다: ${barcode}`, 'error')
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `일치하는 상품을 찾을 수 없습니다: ${barcode}` }
      }))
      navigator.vibrate?.(200)
    }

    this._resetBarcodeInput()
  }

  /** 입고 확인 API 호출 — 현재 항목 수량 확정 후 라인 완료 */
  async _confirmReceive() {
    const item = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null
    if (!item) {
      this._showFeedback('입고할 항목이 없습니다', 'warning')
      return
    }

    const qty = this.rcvQty
    if (!qty || qty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'warning')
      return
    }

    this.processing = true
    try {
      const body = {
        ...item,
        rcv_qty: qty
      }
      await ServiceUtil.restPost(`inbound_trx/receiving_orders/line/${item.id}/finish`, body)

      // 서버에서 최신 항목 목록 재조회 (미완료/완료 탭 갱신)
      await this._loadReceivingItems(this.currentReceiving.id)

      this._showFeedback(`입고 완료 (${this.completedCount}/${this.totalCount})`, 'success')

      if (this.completedCount >= this.totalCount) {
        await this._onAllItemsCompleted()
      } else {
        this._setInitialRcvQty()
        setTimeout(() => this._focusBarcodeInput(), 200)
      }
    } catch (error) {
      this._showFeedback(error.message || '입고 확인 실패', 'error')
    } finally {
      this.processing = false
    }
  }

  /** 입고 마감 API 호출 — 전체 완료 처리 */
  async _closeReceiving() {
    if (!this.currentReceiving) return

    const remaining = this.receivingItems.filter(i => i.status !== 'END' && i.status !== 'CANCEL')
    if (remaining.length > 0) {
      const confirmed = await UiUtil.showAlertPopup(
        'label.confirm',
        `미완료 항목 ${remaining.length}건이 있습니다. 입고 작업을 완료하시겠습니까?`,
        'question', 'confirm', 'cancel'
      )
      if (!confirmed) return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost(`inbound_trx/receiving_orders/${this.currentReceiving.id}/close`)

      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '입고 마감 완료' }
      }))

      this.mode = 'complete'
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '입고 마감 처리에 실패했습니다' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 모든 항목 완료 시 자동 마감 처리 */
  async _onAllItemsCompleted() {
    document.dispatchEvent(new CustomEvent('notify', {
      detail: { level: 'info', message: '모든 항목 입고 완료 — 마감 처리 중...' }
    }))
    await this._closeReceiving()
  }

  /** 요약 카드 필터 토글 — 동일 카드 재클릭 시 전체(ALL)로 복귀 */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? 'ALL' : status
  }

  /** 목록 새로고침 */
  async _refresh() {
    await this._loadTaskList()
  }

  /** 목록 화면으로 복귀 */
  async _goBack() {
    this.mode = 'list'
    this.currentReceiving = null
    this.receivingItems = []
    this.currentItemIndex = -1
    this.lastFeedback = null
    await this._loadTaskList()
  }

  /** 다음 입고 작업 자동 선택 */
  async _selectNextTask() {
    await this._loadTaskList()
    const next = this.taskList.find(t => t.status === 'READY')
    if (next) {
      this._selectReceiving(next)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '대기 중인 입고 작업이 없습니다' }
      }))
      this._goBack()
    }
  }

  /** 다음 미완료 항목으로 인덱스 이동 */
  _moveToNextItem() {
    const nextIdx = this.receivingItems.findIndex(i => i.status !== 'END' && i.status !== 'CANCEL')
    this.currentItemIndex = nextIdx
  }

  /** 현재 항목의 rcv_exp_qty로 rcvQty 초기값 설정 */
  _setInitialRcvQty() {
    const currentItem = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null
    this.rcvQty = currentItem ? (currentItem.rcv_exp_qty || 1) : 0
  }

  /** 피드백 메시지 표시 */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }

  /** 바코드 입력 필드에 포커스 설정 */
  _focusBarcodeInput() {
    this._resetBarcodeInput()
  }

  /** 바코드 입력 필드 초기화 및 포커스 복귀 */
  _resetBarcodeInput() {
    if (this._barcodeInput) {
      this._barcodeInput.input.value = ''
      this._barcodeInput.input.focus()
    }
  }
}
