import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil, ValueUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 보충 작업 화면 (W23-RE-2)
 *
 * 오늘의 보충 지시 현황(대기/진행중/완료)을 상단에 표시하고, 지시를 선택하거나
 * 번호를 스캔하여 아이템별 재고 이동 작업을 수행한다.
 *
 * 화면 모드: list(지시 목록) → work(아이템 작업) → complete(완료)
 */
@customElement('pda-oms-replenish')
export class PdaOmsReplenish extends connect(store)(PageView) {
  /** 화면 모드: list / work / complete */
  @state() mode = 'list'

  /** 오늘의 보충 지시 목록 */
  @state() taskList = []
  /** 목록 필터 상태 */
  @state() filterStatus = 'CREATED'
  /** 목록 로딩 중 */
  @state() loading = false

  /** 선택된 보충 지시 */
  @state() replenishOrder = null
  /** 보충 아이템 목록 */
  @state() replenishItems = []
  /** 현재 작업 중인 아이템 인덱스 */
  @state() currentItemIdx = 0
  /** 스캔한 재고 정보 */
  @state() scannedInventory = null
  /** 작업자가 수동 스캔한 도착 로케이션 코드 (to_loc_cd가 null인 아이템용) */
  @state() scannedToLocCd = null
  /** API 처리 중 */
  @state() processing = false
  /** 피드백 메시지 */
  @state() lastFeedback = null

  /** 보충 지시 번호 스캔 입력 (list 모드) */
  @query('#replenishScanInput') _replenishScanInput
  /** 도착 로케이션 스캔 입력 (work 모드) */
  @query('#toLocInput') _toLocInput
  /** 재고 바코드 스캔 입력 (work 모드) */
  @query('#barcodeInput') _barcodeInput

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
          overflow: hidden;
        }

        /* ── 헤더 바 (work 모드) ── */
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

        /* ── 현황 요약 카드 ── */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px 12px;
          flex-shrink: 0;
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

        /* ── 보충 지시 번호 스캔 영역 (list 모드 하단) ── */
        .scan-task-order {
          padding: 8px 12px 12px;
          flex-shrink: 0;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .scan-task-order label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          display: block;
          margin-bottom: 4px;
        }

        .scan-task-order .scan-row-outer {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-task-order .scan-row-outer ox-input-barcode {
          flex: 1;
        }

        .btn-refresh {
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

        .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* ── 보충 지시 카드 목록 ── */
        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 12px 8px;
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

        .task-card .status-badge.created {
          background: #fff3e0;
          color: #ff9800;
        }

        .task-card .status-badge.in_progress {
          background: #e3f2fd;
          color: #1976d2;
        }

        .task-card .status-badge.completed {
          background: #e8f5e9;
          color: #4CAF50;
        }

        .task-card .status-badge.cancelled {
          background: #fafafa;
          color: #999;
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

        /* ── 빈 목록 / 로딩 ── */
        .empty-message {
          text-align: center;
          padding: 32px 16px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .loading-overlay {
          text-align: center;
          padding: 30px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        /* ── 지시 정보 헤더 (work 모드) ── */
        .order-header {
          padding: 10px 14px 6px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          flex-shrink: 0;
        }

        .order-header .order-no {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-primary-container, #0d47a1);
        }

        .order-header .order-meta {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #555);
          margin-top: 2px;
        }

        .order-header .progress-bar-wrap {
          margin-top: 6px;
          height: 5px;
          background: rgba(0,0,0,0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .order-header .progress-bar {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 3px;
          transition: width 0.3s;
        }

        /* ── 아이템 목록 (work 모드) ── */
        .item-list {
          flex: 1;
          overflow-y: auto;
          padding: 6px 12px 4px;
        }

        .item-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 12px;
          margin-bottom: 6px;
          border-radius: 10px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 2px solid transparent;
          cursor: pointer;
        }

        .item-card.active {
          border-color: var(--md-sys-color-primary, #1976D2);
          background: #e8f0fe;
        }

        .item-card.done {
          border-color: #4caf50;
          background: #f1f8f1;
          opacity: 0.75;
        }

        .item-card .item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .item-card .sku {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .item-status-badge {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 10px;
        }

        .item-status-badge.waiting {
          background: #fff3e0;
          color: #e65100;
        }

        .item-status-badge.done {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .item-card .loc-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        .item-card .loc-arrow { color: var(--md-sys-color-primary, #1976D2); font-weight: 700; }

        .item-card .qty-row {
          display: flex;
          gap: 14px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .qty-row .val { font-weight: 600; color: var(--md-sys-color-on-surface, #333); }

        /* ── 바코드 스캔 영역 (work 모드) ── */
        .scan-area {
          padding: 8px 12px 4px;
          flex-shrink: 0;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .scan-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .scan-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface-container-lowest, #fff);
        }

        .scan-row.active {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .scan-row.done {
          border-color: #4caf50;
          background: #f1f8f1;
        }

        .scan-row .row-label {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #666);
          min-width: 72px;
        }

        .scan-row.active .row-label { color: var(--md-sys-color-primary, #1976D2); }
        .scan-row.done .row-label { color: #2e7d32; }

        .scan-row .confirmed-value {
          flex: 1;
          font-size: 14px;
          font-weight: 700;
          color: #2e7d32;
        }

        .scan-row .btn-clear {
          flex-shrink: 0;
          padding: 3px 8px;
          border: none;
          border-radius: 4px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #555);
          font-size: 11px;
          cursor: pointer;
        }

        .scan-row ox-input-barcode {
          flex: 1;
          --input-height: 28px;
          --input-font-size: 13px;
        }

        /* ── 재고 확인 카드 ── */
        .confirm-card {
          margin: 6px 12px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #e8f0fe;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-shrink: 0;
        }

        .confirm-card .inv-info {
          flex: 1;
          min-width: 0;
        }

        .confirm-card .inv-sku {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .confirm-card .inv-meta {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #555);
          margin-top: 2px;
        }

        .confirm-card .btn-confirm {
          flex-shrink: 0;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .confirm-card .btn-cancel {
          flex-shrink: 0;
          padding: 8px 10px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #555);
          font-size: 12px;
          cursor: pointer;
        }

        /* ── 스캔 피드백 ── */
        .scan-feedback {
          margin: 3px 12px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .scan-feedback.success { background: #e8f5e9; color: #2e7d32; }
        .scan-feedback.error { background: #ffebee; color: #c62828; }
        .scan-feedback.warning { background: #fff8e1; color: #f57f17; }

        .processing-overlay {
          text-align: center;
          padding: 8px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 13px;
          flex-shrink: 0;
        }

        /* ── 완료 화면 ── */
        .complete-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px 24px;
          text-align: center;
          overflow-y: auto;
        }

        .complete-section .check-icon { font-size: 64px; margin-bottom: 12px; }

        .complete-section h3 {
          font-size: 20px;
          font-weight: 700;
          color: #4caf50;
          margin: 0 0 20px;
        }

        .result-card {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 12px;
          padding: 16px 20px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
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
          padding-bottom: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .result-card .stat-row:last-child { border-bottom: none; padding-bottom: 0; }
        .result-card .stat-row .r-label { color: var(--md-sys-color-on-surface-variant, #666); }
        .result-card .stat-row .r-value { font-weight: 600; color: var(--md-sys-color-on-surface, #222); }
        .result-card .stat-row .r-value.primary { color: var(--md-sys-color-primary, #1976D2); }
        .result-card .stat-row .r-value.success { color: #2e7d32; }

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
      `
    ]
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: TermsUtil.tMenu('OmsReplenishWork') || '보충 작업'
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    if (this.mode === 'complete') return this._renderCompleteMode()
    if (this.mode === 'work') return html`${this._renderHeader()}${this._renderWorkMode()}`
    return this._renderListMode()
  }

  /** 헤더 바 렌더링 — work 모드 타이틀 및 뒤로가기 버튼 */
  _renderHeader() {
    const replenishNo = this.replenishOrder?.replenish_no || ''
    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          ${TermsUtil.tLabel('replenish_no') || '보충 번호'}: ${replenishNo}
        </span>
      </div>
    `
  }

  /** list 모드 렌더링 — 현황 요약 카드, 보충 지시 목록, 번호 스캔 */
  _renderListMode() {
    if (this.loading) {
      return html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
    }

    const created = this.taskList.filter(t => t.status === 'CREATED')
    const inProgress = this.taskList.filter(t => t.status === 'IN_PROGRESS')
    const completed = this.taskList.filter(t => t.status === 'COMPLETED')

    const filtered =
      this.filterStatus === 'CREATED' ? created
        : this.filterStatus === 'IN_PROGRESS' ? inProgress
          : this.filterStatus === 'COMPLETED' ? completed
            : this.taskList.filter(t => t.status !== 'CANCELLED')

    return html`
      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active=${this.filterStatus === 'CREATED'}
          @click=${() => this._toggleFilter('CREATED')}>
          <div class="count">${created.length}</div>
          <div class="card-label">${TermsUtil.tLabel('wait') || '대기'}</div>
        </div>
        <div class="summary-card"
          ?active=${this.filterStatus === 'IN_PROGRESS'}
          @click=${() => this._toggleFilter('IN_PROGRESS')}>
          <div class="count">${inProgress.length}</div>
          <div class="card-label">${TermsUtil.tLabel('in_progress') || '진행중'}</div>
        </div>
        <div class="summary-card done"
          ?active=${this.filterStatus === 'COMPLETED'}
          @click=${() => this._toggleFilter('COMPLETED')}>
          <div class="count">${completed.length}</div>
          <div class="card-label">${TermsUtil.tLabel('completed') || '완료'}</div>
        </div>
      </div>

      <div class="task-list">
        ${filtered.length === 0
          ? html`<div class="empty-message">${TermsUtil.tText('No Data') || '보충 지시가 없습니다'}</div>`
          : filtered.map(r => this._renderTaskCard(r))}
      </div>

      <div class="scan-task-order">
        <label>${TermsUtil.tLabel('replenish_no') || '보충 지시 번호 스캔'}</label>
        <div class="scan-row-outer">
          <ox-input-barcode id="replenishScanInput"
            placeholder="${TermsUtil.tLabel('replenish_no') || '보충 지시 번호'}"
            @change=${e => this._onScanReplenishNo(e.target.value)}>
          </ox-input-barcode>
          <button class="btn-refresh" @click=${this._refresh}>
            ${TermsUtil.tButton('refresh') || '새로고침'}
          </button>
        </div>
      </div>
    `
  }

  /** 보충 지시 카드 렌더링 */
  _renderTaskCard(r) {
    const isInProgress = r.status === 'IN_PROGRESS'
    const planTotal = r.plan_total || 0
    const resultTotal = r.result_total || 0
    const progressPct = isInProgress && planTotal > 0 && resultTotal > 0
      ? Math.round((resultTotal / planTotal) * 100)
      : 0

    const statusKey = (r.status || '').toLowerCase()
    const statusLabel =
      r.status === 'CREATED' ? (TermsUtil.tLabel('wait') || '대기')
        : r.status === 'IN_PROGRESS' ? (TermsUtil.tLabel('in_progress') || '진행중')
          : r.status === 'COMPLETED' ? (TermsUtil.tLabel('completed') || '완료')
            : (TermsUtil.tLabel('cancelled') || '취소')

    return html`
      <div class="task-card" @click=${() => this._selectOrder(r)}>
        <div class="card-header">
          <span class="task-no">${r.replenish_no}</span>
          <span class="status-badge ${statusKey}">${statusLabel}</span>
        </div>
        <div class="sub-info">
          창고: ${r.wh_cd || ''} | 화주사: ${r.com_cd || ''} | ${r.plan_item || 0}건
        </div>
        ${isInProgress && progressPct > 0 ? html`
          <div class="progress-bar">
            <div class="fill" style="width: ${progressPct}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /** work 모드 렌더링 — 지시 진행률, 아이템 목록, 스캔 영역 */
  _renderWorkMode() {
    const order = this.replenishOrder
    const items = this.replenishItems
    const doneCount = items.filter(i => i._done).length
    const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0
    const currentItem = items[this.currentItemIdx]

    return html`
      <!-- 지시 진행률 헤더 -->
      <div class="order-header">
        <div class="order-no">${order?.replenish_no || ''}</div>
        <div class="order-meta">
          ${TermsUtil.tLabel('wh_cd') || '창고'}: ${order?.wh_cd || ''} ·
          ${doneCount}/${items.length} ${TermsUtil.tButton('complete') || '완료'}
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
      </div>

      <!-- 아이템 목록 -->
      <div class="item-list">
        ${items.map((item, idx) => html`
          <div class="item-card ${item._done ? 'done' : idx === this.currentItemIdx ? 'active' : ''}"
            @click=${() => this._selectItem(idx)}>
            <div class="item-top">
              <span class="sku">${item.sku_cd}${item.sku_nm ? ` · ${item.sku_nm}` : ''}</span>
              <span class="item-status-badge ${item._done ? 'done' : 'waiting'}">
                ${item._done ? (TermsUtil.tButton('complete') || '완료') : (TermsUtil.tLabel('wait') || '대기')}
              </span>
            </div>
            <div class="loc-row">
              <span>${item.from_loc_cd}</span>
              <span class="loc-arrow">→</span>
              <span>${item.to_loc_cd || '?'}</span>
            </div>
            <div class="qty-row">
              <span>${TermsUtil.tLabel('order_qty') || '지시'}: <span class="val">${item.order_qty}</span></span>
              <span>${TermsUtil.tLabel('result_qty') || '실적'}: <span class="val">${item.result_qty || 0}</span></span>
            </div>
          </div>
        `)}
      </div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      ${this.processing ? html`
        <div class="processing-overlay">${TermsUtil.tText('processing') || '처리 중...'}</div>
      ` : ''}

      <!-- 재고 확인 카드 (바코드 스캔 완료 시) -->
      ${this.scannedInventory ? html`
        <div class="confirm-card">
          <div class="inv-info">
            <div class="inv-sku">${this.scannedInventory.sku_cd}${this.scannedInventory.sku_nm ? ` · ${this.scannedInventory.sku_nm}` : ''}</div>
            <div class="inv-meta">
              ${this.scannedInventory.loc_cd} → ${this._effectiveToLoc(currentItem)} ·
              ${TermsUtil.tLabel('inv_qty') || '수량'}: ${this.scannedInventory.inv_qty}
            </div>
          </div>
          <button class="btn-cancel" @click=${this._cancelScan}>✕</button>
          <button class="btn-confirm" ?disabled=${this.processing} @click=${this._confirmMove}>
            ${TermsUtil.tButton('confirm') || '이동 확인'}
          </button>
        </div>
      ` : currentItem && !currentItem._done ? html`
        <!-- 단계별 스캔 영역 -->
        <div class="scan-area">
          <!-- Step 1: to_loc 스캔 (to_loc_cd가 없는 아이템만) -->
          ${!currentItem.to_loc_cd ? html`
            <div class="scan-row ${this.scannedToLocCd ? 'done' : 'active'}">
              <span class="row-label">${TermsUtil.tLabel('to_loc_cd') || '도착 로케이션'}</span>
              ${this.scannedToLocCd ? html`
                <span class="confirmed-value">${this.scannedToLocCd}</span>
                <button class="btn-clear" @click=${this._clearToLoc}>변경</button>
              ` : html`
                <ox-input-barcode id="toLocInput"
                  placeholder="${TermsUtil.tLabel('scan_to_loc') || '도착 로케이션 스캔'}"
                  ?disabled=${this.processing}
                  @change=${e => this._onScanToLoc(e.target.value)}>
                </ox-input-barcode>
              `}
            </div>
          ` : ''}

          <!-- Step 2: 재고 바코드 스캔 -->
          <div class="scan-row ${!currentItem.to_loc_cd && !this.scannedToLocCd ? '' : 'active'}">
            <span class="row-label">${TermsUtil.tLabel('barcode') || '바코드'}</span>
            <ox-input-barcode id="barcodeInput"
              placeholder="${!currentItem.to_loc_cd && !this.scannedToLocCd
                ? (TermsUtil.tLabel('scan_to_loc_first') || '도착 로케이션 스캔 후 입력 가능')
                : (TermsUtil.tLabel('scan_barcode') || '출발지 재고 바코드 스캔')}"
              ?disabled=${this.processing || (!currentItem.to_loc_cd && !this.scannedToLocCd)}
              @change=${e => this._onScanBarcode(e.target.value)}>
            </ox-input-barcode>
          </div>

          <!-- 이동 경로 안내 -->
          <div class="scan-title" style="color: var(--md-sys-color-on-surface-variant, #888); font-weight: 400;">
            ${currentItem.from_loc_cd} → ${this._effectiveToLoc(currentItem) || '?'}
          </div>
        </div>
      ` : ''}
    `
  }

  /** complete 모드 렌더링 — 완료 통계 + 목록 복귀 버튼 */
  _renderCompleteMode() {
    const order = this.replenishOrder
    const doneCount = this.replenishItems.filter(i => i._done).length

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('Success to Process') || '보충 작업 완료!'}</h3>
        <div class="result-card">
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tLabel('replenish_no') || '보충 번호'}</span>
            <span class="r-value primary">${order?.replenish_no || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tLabel('wh_cd') || '창고'}</span>
            <span class="r-value">${order?.wh_cd || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tButton('complete') || '완료 아이템'}</span>
            <span class="r-value success">${doneCount}건</span>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn-next" @click=${this._goBack}>
            ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /** 페이지 초기화 — 오늘의 보충 지시 목록 조회 */
  pageInitialized() {
    this._loadTaskList()
  }

  /** 오늘의 보충 지시 목록 조회 (CREATED + IN_PROGRESS + COMPLETED) */
  async _loadTaskList() {
    this.loading = true
    try {
      const query = JSON.stringify([
        { name: 'status', operator: 'in', value: 'CREATED,IN_PROGRESS,COMPLETED' },
        { name: 'order_date', operator: 'eq', value: ValueUtil.todayFormatted() }
      ])
      const result = await ServiceUtil.restGet(`replenish_orders?query=${encodeURIComponent(query)}&limit=100`)
      this.taskList = result?.items || result || []
    } catch (error) {
      console.error('보충 지시 목록 조회 실패:', error)
      this.taskList = []
    } finally {
      this.loading = false
    }
  }

  /** 요약 카드 필터 토글 — 동일 카드 재클릭 시 전체(ALL)로 복귀 */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? 'ALL' : status
  }

  /** 목록 새로고침 */
  async _refresh() {
    await this._loadTaskList()
  }

  /** 목록 화면으로 복귀 — work/complete → list */
  async _goBack() {
    this.mode = 'list'
    this.replenishOrder = null
    this.replenishItems = []
    this.currentItemIdx = 0
    this.scannedInventory = null
    this.scannedToLocCd = null
    this.lastFeedback = null
    await this._loadTaskList()
  }

  /** 보충 지시 번호 바코드 스캔으로 빠른 선택 */
  _onScanReplenishNo(replenishNo) {
    if (!replenishNo) return
    const order = this.taskList.find(t => t.replenish_no === replenishNo)
    if (order) {
      this._selectOrder(order)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `보충 지시를 찾을 수 없습니다: ${replenishNo}` }
      }))
      navigator.vibrate?.(200)
    }
    if (this._replenishScanInput) this._replenishScanInput.value = ''
  }

  /**
   * 보충 지시 선택 → CREATED이면 시작 처리 → 아이템 로드 → work 모드 전환
   * @param {Object} order 보충 지시 객체
   */
  async _selectOrder(order) {
    if (this.processing) return

    if (order.status === 'COMPLETED') {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'warn', message: '이미 완료된 보충 지시입니다' }
      }))
      return
    }
    if (order.status === 'CANCELLED') {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: '취소된 보충 지시입니다' }
      }))
      return
    }

    this.processing = true
    try {
      if (order.status === 'CREATED') {
        await ServiceUtil.restPost(`replenish_orders/start/${order.id}`, {})
        order.status = 'IN_PROGRESS'
      }

      const items = await ServiceUtil.restGet(`replenish_orders/${order.id}/items`)
      const enrichedItems = (Array.isArray(items) ? items : []).map(item => ({
        ...item,
        _done: (item.result_qty != null && item.result_qty > 0)
      }))

      this.replenishOrder = order
      this.replenishItems = enrichedItems
      this.currentItemIdx = enrichedItems.findIndex(i => !i._done)
      this.scannedToLocCd = null
      this.scannedInventory = null
      this.lastFeedback = null
      this.mode = 'work'

      const firstItem = enrichedItems[this.currentItemIdx]
      if (firstItem && !firstItem.to_loc_cd) {
        setTimeout(() => this._focusToLocInput(), 200)
      } else {
        setTimeout(() => this._focusBarcodeInput(), 200)
      }
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '보충 작업을 시작할 수 없습니다' }
      }))
    } finally {
      this.processing = false
    }
  }

  /**
   * 도착 로케이션 스캔 핸들러 (to_loc_cd가 null인 아이템용)
   * @param {string} locCd
   */
  async _onScanToLoc(locCd) {
    if (!locCd || this.processing) return
    this.processing = true
    try {
      const location = await ServiceUtil.restPost('inventory_trx/validate_location_for_move', {
        to_loc_cd: locCd
      })
      if (location && location.id) {
        this.scannedToLocCd = location.loc_cd
        this.lastFeedback = null
        if (this._toLocInput) this._toLocInput.value = ''
        setTimeout(() => this._focusBarcodeInput(), 150)
      } else {
        this._showFeedback('유효하지 않은 로케이션입니다', 'error')
        navigator.vibrate?.(200)
        if (this._toLocInput) this._toLocInput.value = ''
      }
    } catch (error) {
      this._showFeedback(error.message || '유효하지 않은 로케이션입니다', 'error')
      navigator.vibrate?.(200)
      if (this._toLocInput) this._toLocInput.value = ''
    } finally {
      this.processing = false
    }
  }

  /**
   * 재고 바코드 스캔 핸들러
   * @param {string} barcode
   */
  async _onScanBarcode(barcode) {
    if (!barcode || this.processing) return
    const currentItem = this.replenishItems[this.currentItemIdx]
    if (!currentItem) return

    const toLocCd = this._effectiveToLoc(currentItem)
    if (!toLocCd) return

    this.processing = true
    try {
      const inv = await ServiceUtil.restPost('inventory_trx/validate_barcode_for_move', {
        barcode,
        to_loc_cd: toLocCd
      })

      if (inv && inv.id) {
        this.scannedInventory = inv
        this.lastFeedback = null
      } else {
        this._showFeedback('이동 불가한 재고입니다', 'error')
        navigator.vibrate?.(200)
        if (this._barcodeInput) this._barcodeInput.value = ''
      }
    } catch (error) {
      this._showFeedback(error.message || '이동 불가한 재고입니다', 'error')
      navigator.vibrate?.(200)
      if (this._barcodeInput) this._barcodeInput.value = ''
    } finally {
      this.processing = false
    }
  }

  /**
   * 이동 확인 — move_inventory 후 items/{itemId}/complete 호출
   */
  async _confirmMove() {
    const currentItem = this.replenishItems[this.currentItemIdx]
    const inv = this.scannedInventory
    if (!currentItem || !inv || this.processing) return

    const toLocCd = this._effectiveToLoc(currentItem)

    this.processing = true
    try {
      await ServiceUtil.restPost(`inventory_trx/${inv.id}/move_inventory`, {
        to_loc_cd: toLocCd,
        reason: 'REPLENISH'
      })

      const completeResult = await ServiceUtil.restPost(
        `replenish_orders/${this.replenishOrder.id}/items/${currentItem.id}/complete`,
        { result_qty: inv.inv_qty }
      )

      this.replenishItems = this.replenishItems.map((item, idx) =>
        idx === this.currentItemIdx
          ? { ...item, result_qty: inv.inv_qty, _done: true }
          : item
      )
      this.scannedInventory = null
      this.scannedToLocCd = null
      this._showFeedback(`${currentItem.sku_cd} 보충 완료 (${inv.inv_qty}개)`, 'success')

      if (completeResult?.order_completed) {
        this.mode = 'complete'
        return
      }

      const updatedItems = this.replenishItems
      let nextIdx = updatedItems.findIndex((item, idx) => idx > this.currentItemIdx && !item._done)
      if (nextIdx < 0) nextIdx = updatedItems.findIndex(item => !item._done)

      if (nextIdx >= 0) {
        this.currentItemIdx = nextIdx
        const nextItem = updatedItems[nextIdx]
        if (!nextItem.to_loc_cd) {
          setTimeout(() => this._focusToLocInput(), 150)
        } else {
          setTimeout(() => this._focusBarcodeInput(), 150)
        }
      } else {
        this.mode = 'complete'
      }

    } catch (error) {
      this._showFeedback(error.message || '처리 실패', 'error')
      navigator.vibrate?.(200)
    } finally {
      this.processing = false
    }
  }

  /** 스캔 취소 — 바코드 재스캔 가능하도록 초기화 */
  _cancelScan() {
    this.scannedInventory = null
    this.lastFeedback = null
    if (this._barcodeInput) this._barcodeInput.value = ''
    setTimeout(() => this._focusBarcodeInput(), 150)
  }

  /** 도착 로케이션 초기화 — to_loc 재스캔 */
  _clearToLoc() {
    this.scannedToLocCd = null
    this.scannedInventory = null
    this.lastFeedback = null
    if (this._barcodeInput) this._barcodeInput.value = ''
    setTimeout(() => this._focusToLocInput(), 150)
  }

  /**
   * 아이템 선택 — 대기 아이템만 선택 가능
   * @param {number} idx
   */
  _selectItem(idx) {
    if (this.replenishItems[idx]?._done) return
    this.currentItemIdx = idx
    this.scannedInventory = null
    this.scannedToLocCd = null
    this.lastFeedback = null
    const item = this.replenishItems[idx]
    if (item && !item.to_loc_cd) {
      setTimeout(() => this._focusToLocInput(), 150)
    } else {
      setTimeout(() => this._focusBarcodeInput(), 150)
    }
  }

  /**
   * 현재 아이템의 실제 도착 로케이션 반환
   * to_loc_cd가 있으면 그것을, 없으면 작업자가 스캔한 scannedToLocCd 반환
   * @param {Object} item
   */
  _effectiveToLoc(item) {
    return item?.to_loc_cd || this.scannedToLocCd || null
  }

  /**
   * 피드백 메시지 표시
   * @param {string} message
   * @param {string} type — 'success' | 'error' | 'warning'
   */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }

  /** 도착 로케이션 입력 포커스 */
  _focusToLocInput() {
    if (this._toLocInput) this._toLocInput.input?.focus()
  }

  /** 바코드 입력 포커스 */
  _focusBarcodeInput() {
    if (this._barcodeInput) this._barcodeInput.input?.focus()
  }
}
