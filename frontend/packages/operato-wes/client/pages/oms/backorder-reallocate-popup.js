import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 백오더 재할당 팝업
 *
 * BACK_ORDER(재고 부족) 상태인 출하 주문을 대상으로 재고 재할당을 처리한다.
 * - 전체 데이터(최대 5000건)는 메모리(_ordersMap)에 보관하고 DOM은 현재 페이지(100건)만 렌더링
 * - 처리 루프는 orders 객체를 직접 변경하고, UI는 _tick 카운터로 300ms 간격 throttle 업데이트
 *
 * @fires realloc-done - 재할당 처리 완료 시 발생
 */
class BackorderReallocatePopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 400px;
          overflow: hidden;
        }

        /* ===== 상단 요약 섹션 ===== */
        .summary-section {
          flex-shrink: 0;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .settings-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 8px 20px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e8e8e8);
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #616161);
          flex-wrap: wrap;
        }

        .settings-row .value {
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .vdiv { color: var(--md-sys-color-outline-variant, #ccc); }

        .progress-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 20px;
          background: var(--md-sys-color-surface, #fff);
        }

        .progress-track {
          width: 100%;
          height: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .stat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 3px;
          font-weight: 600;
        }
        .stat-item .n { font-size: 14px; }
        .stat-item.total   { color: var(--md-sys-color-on-surface-variant, #555); }
        .stat-item.done    { color: #2E7D32; }
        .stat-item.err     { color: #C62828; }
        .stat-item.bo      { color: #E65100; }
        .stat-item.pending { color: #777; }
        .stat-item.pct     { margin-left: auto; font-size: 13px; color: var(--md-sys-color-primary, #1976D2); }

        .current-order-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .jump-btn {
          background: none;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          font-size: 11px;
          padding: 1px 7px;
          cursor: pointer;
          color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
        }
        .jump-btn:hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }

        .elapsed-time {
          margin-left: auto;
          font-size: 12px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--md-sys-color-on-surface-variant, #666);
          letter-spacing: 0.5px;
        }

        /* ===== 필터 칩 ===== */
        .fchip {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid transparent;
          user-select: none;
          transition: all 0.15s;
        }
        .fchip.all   { background: #EEF2FF; color: #3F51B5; }
        .fchip.done  { background: #E8F5E9; color: #2E7D32; }
        .fchip.err   { background: #FFEBEE; color: #C62828; }
        .fchip.bo    { background: #FFF3E0; color: #E65100; }
        .fchip.pend  { background: #F5F5F5; color: #555; }
        .fchip.active { border-color: currentColor; }

        /* ===== 검색 바 ===== */
        .search-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 20px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .srch-field {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .srch-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #616161);
          white-space: nowrap;
        }

        .srch-input, .srch-select {
          height: 28px;
          padding: 0 8px;
          font-size: 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
        }

        .srch-input:focus, .srch-select:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .srch-date { width: 130px; }
        .srch-input { width: 120px; }
        .srch-select { width: 120px; cursor: pointer; }

        .srch-buttons {
          display: flex;
          gap: 6px;
          margin-left: auto;
        }

        .btn-srch-reset {
          height: 28px;
          padding: 0 12px;
          font-size: 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface-variant, #555);
          cursor: pointer;
        }
        .btn-srch-reset:hover { background: var(--md-sys-color-surface-variant, #f0f0f0); }

        /* ===== 테이블 ===== */
        .table-wrap {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 8px;
        }

        .data-table thead {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .data-table th {
          padding: 9px 12px;
          text-align: left;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }

        .data-table th.center,
        .data-table td.center { text-align: center; }
        .data-table th.right,
        .data-table td.right  { text-align: right; }

        .data-table tbody tr {
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
        }
        .data-table tbody tr.row-ready      { background: #F1F8E9; }
        .data-table tbody tr.row-error      { background: #FFEBEE; }
        .data-table tbody tr.row-backorder  { background: #FFF8E1; }
        .data-table tbody tr.row-processing { background: #E3F2FD; }
        .data-table tbody tr.row-selected   { outline: 2px solid var(--md-sys-color-primary, #1976D2); outline-offset: -2px; }

        .data-table td {
          padding: 8px 12px;
          color: var(--md-sys-color-on-surface, #424242);
          vertical-align: middle;
        }

        .row-no {
          font-size: 11px;
          color: #bbb;
        }

        /* 상태 배지 */
        .sbadge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .sbadge.registered  { background: #EDE7F6; color: #5E35B1; }
        .sbadge.confirmed   { background: #E3F2FD; color: #1565C0; }
        .sbadge.allocated   { background: #E8F5E9; color: #2E7D32; }
        .sbadge.back_order  { background: #FFF3E0; color: #E65100; }
        .sbadge.error       { background: #FFEBEE; color: #C62828; }
        .sbadge.processing  { background: #E3F2FD; color: #1565C0; }

        .loading-row td,
        .empty-row td {
          text-align: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 14px;
        }

        /* ===== 페이지네이션 ===== */
        .pagination-bar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          flex-shrink: 0;
        }

        .pbtn {
          min-width: 32px;
          padding: 4px 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ddd);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          transition: all 0.15s;
        }
        .pbtn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pbtn:not(:disabled):hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .pbtn.active {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .page-info {
          padding: 0 10px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          font-weight: 600;
        }

        .pagination-left {
          position: absolute;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .select-all-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #555);
          cursor: pointer;
          user-select: none;
        }

        .select-all-label input[type="checkbox"] {
          width: 14px;
          height: 14px;
          cursor: pointer;
          accent-color: var(--md-sys-color-primary, #1976D2);
        }

        .selected-count {
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
          background: color-mix(in srgb, var(--md-sys-color-primary, #1976D2) 10%, transparent);
          border-radius: 12px;
        }

        /* ===== 하단 버튼 ===== */
        .action-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface, #fff);
          flex-shrink: 0;
        }

        .hint-text {
          flex: 1;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #888);
          line-height: 1.4;
        }

        .btn {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-primary { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #1565C0; }
        .btn-default {
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }
        .btn-default:hover:not(:disabled) { background: var(--md-sys-color-surface-variant, #f5f5f5); }

        .btn-pause {
          background: var(--md-sys-color-surface, #fff);
          color: #E65100;
          border: 1px solid #E65100;
        }
        .btn-pause:hover:not(:disabled) { background: #FFF3E0; }
        .btn-pause.resuming {
          background: #E65100;
          color: #fff;
        }
        .btn-pause.resuming:hover:not(:disabled) { background: #BF360C; }

        .spinner {
          display: inline-block;
          width: 11px;
          height: 11px;
          border: 2px solid #e0e0e0;
          border-top-color: var(--md-sys-color-primary, #1976D2);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 3px;
          flex-shrink: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `
    ]
  }

  /** 반응형 속성 */
  static get properties() {
    return {
      orders: Array,
      loading: Boolean,
      processing: Boolean,
      currentProcessingId: String,
      statusOptions: Array,
      currentPage: Number,
      pageSize: Number,
      filterStatus: String,
      _tick: Number,
      _paused: Boolean,
      _srchDate: String,
      _srchRefOrderNo: String,
      _srchOrdererNm: String,
      _srchReceiverNm: String,
      _srchOrderStatus: String
    }
  }

  constructor() {
    super()
    this.orders = []
    this.loading = false
    this.processing = false
    this.currentProcessingId = null
    this.statusOptions = []
    this.currentPage = 1
    this.pageSize = 100
    this.filterStatus = null
    this._tick = 0
    this._paused = false
    this._srchDate = ''
    this._srchRefOrderNo = ''
    this._srchOrdererNm = ''
    this._srchReceiverNm = ''
    this._srchOrderStatus = ''
    this._selectedIds = new Set()
    this._ordersMap = new Map()
    this._updateTimer = null
    this._processStartTime = null
    this._resumeResolve = null
    this._lastScrolledId = null
    this._pausedAt = null
    this._totalPausedMs = 0
  }

  // ─── computed getters ────────────────────────────────────────────────────

  get _stats() {
    let done = 0, err = 0, bo = 0
    for (const o of this.orders) {
      if (o._reallocStatus === 'ALLOCATED') done++
      else if (o._reallocStatus === 'ERROR') err++
      else if (o._reallocStatus === 'BACK_ORDER') bo++
    }
    const processed = done + err + bo
    return {
      total: this.orders.length,
      done,
      err,
      bo,
      pending: this.orders.length - processed,
      processed
    }
  }

  get _filteredOrders() {
    let orders = this.orders

    switch (this.filterStatus) {
      case 'ALLOCATED':  orders = orders.filter(o => o._reallocStatus === 'ALLOCATED'); break
      case 'ERROR':      orders = orders.filter(o => o._reallocStatus === 'ERROR'); break
      case 'BACK_ORDER': orders = orders.filter(o => o._reallocStatus === 'BACK_ORDER'); break
      case 'PENDING':    orders = orders.filter(o => !o._reallocStatus); break
    }

    if (this._srchDate)
      orders = orders.filter(o => (o.order_date || '').startsWith(this._srchDate))
    if (this._srchRefOrderNo) {
      const q = this._srchRefOrderNo.toLowerCase()
      orders = orders.filter(o => (o.ref_order_no || '').toLowerCase().includes(q))
    }
    if (this._srchOrdererNm) {
      const q = this._srchOrdererNm.toLowerCase()
      orders = orders.filter(o => (o.orderer_nm || '').toLowerCase().includes(q))
    }
    if (this._srchReceiverNm) {
      const q = this._srchReceiverNm.toLowerCase()
      orders = orders.filter(o => (o.receiver_nm || '').toLowerCase().includes(q))
    }
    if (this._srchOrderStatus)
      orders = orders.filter(o => o.status === this._srchOrderStatus)

    return orders
  }

  get _totalPages() {
    return Math.max(1, Math.ceil(this._filteredOrders.length / this.pageSize))
  }

  get _visibleOrders() {
    const start = (this.currentPage - 1) * this.pageSize
    return this._filteredOrders.slice(start, start + this.pageSize)
  }

  // ─── render ──────────────────────────────────────────────────────────────

  render() {
    return html`
      ${this._renderSummarySection()}
      ${this._renderSearchBar()}
      <div class="table-wrap">${this._renderTable()}</div>
      ${this._renderPaginationBar()}
      ${this._renderActionBar()}
    `
  }

  _renderSummarySection() {
    const s = this._stats
    const pct = s.total > 0 ? Math.round(s.processed / s.total * 100) : 0
    const cur = this.currentProcessingId ? this._ordersMap.get(this.currentProcessingId) : null

    return html`
      <div class="summary-section">

        <!-- 설정 행 -->
        <div class="settings-row">
          <span>📦 BACK_ORDER(재고 부족) 주문 재할당</span>
          <span class="vdiv">|</span>
          <span>조회 기준: <span class="value">전체 도메인 BACK_ORDER 주문</span></span>
          <!-- 필터 칩 -->
          <div style="margin-left:auto;display:flex;gap:5px;align-items:center;">
            ${this._renderFilterBar(s)}
          </div>
        </div>

        <!-- 진행 행 -->
        <div class="progress-row">
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="stat-row">
            <span class="stat-item total">전체 <span class="n">${s.total.toLocaleString()}</span>건</span>
            <span class="vdiv">|</span>
            <span class="stat-item done">✅ 완료 <span class="n">${s.done.toLocaleString()}</span></span>
            <span class="stat-item bo">⚠ 재고부족 <span class="n">${s.bo.toLocaleString()}</span></span>
            <span class="stat-item err">❌ 오류 <span class="n">${s.err.toLocaleString()}</span></span>
            <span class="stat-item pending">⏳ 대기 <span class="n">${s.pending.toLocaleString()}</span></span>
            <span class="stat-item pct">재할당 완료율 : ${pct}% (${s.processed.toLocaleString()} / ${s.total.toLocaleString()})</span>
          </div>

          ${this._processStartTime ? html`
            <div class="current-order-row">
              ${cur ? html`
                <span class="spinner"></span>
                <span>처리 중: <strong>${cur.shipment_no}</strong>
                  ${cur.receiver_nm ? html`· ${cur.receiver_nm}` : ''}
                </span>
                <button class="jump-btn" @click="${this._jumpToCurrentOrder}">이 주문 페이지로 이동</button>
              ` : ''}
              <span class="elapsed-time">재할당 경과 시간 ⏱ ${this._formatElapsed()}</span>
            </div>
          ` : ''}
        </div>

      </div>
    `
  }

  _renderFilterBar(s) {
    const f = this.filterStatus
    return html`
      <span class="fchip all  ${!f ? 'active' : ''}"
        @click="${() => this._setFilter(null)}">전체 ${s.total.toLocaleString()}</span>
      <span class="fchip done ${f === 'ALLOCATED' ? 'active' : ''}"
        @click="${() => this._setFilter('ALLOCATED')}">✅ 완료 ${s.done.toLocaleString()}</span>
      <span class="fchip bo   ${f === 'BACK_ORDER' ? 'active' : ''}"
        @click="${() => this._setFilter('BACK_ORDER')}">⚠ 재고부족 ${s.bo.toLocaleString()}</span>
      <span class="fchip err  ${f === 'ERROR' ? 'active' : ''}"
        @click="${() => this._setFilter('ERROR')}">❌ 오류 ${s.err.toLocaleString()}</span>
      <span class="fchip pend ${f === 'PENDING' ? 'active' : ''}"
        @click="${() => this._setFilter('PENDING')}">⏳ 대기 ${s.pending.toLocaleString()}</span>
    `
  }

  _renderSearchBar() {
    return html`
      <div class="search-bar">
        <label class="srch-field">
          <span class="srch-label">주문일</span>
          <input type="date" class="srch-input srch-date"
            .value="${this._srchDate || ''}"
            @change="${e => { this._srchDate = e.target.value; this.currentPage = 1 }}" />
        </label>
        <label class="srch-field">
          <span class="srch-label">외부참조번호</span>
          <input type="text" class="srch-input" placeholder="외부 참조 번호"
            .value="${this._srchRefOrderNo || ''}"
            @input="${e => { this._srchRefOrderNo = e.target.value; this.currentPage = 1 }}" />
        </label>
        <label class="srch-field">
          <span class="srch-label">주문자</span>
          <input type="text" class="srch-input" placeholder="주문자명"
            .value="${this._srchOrdererNm || ''}"
            @input="${e => { this._srchOrdererNm = e.target.value; this.currentPage = 1 }}" />
        </label>
        <label class="srch-field">
          <span class="srch-label">수신자</span>
          <input type="text" class="srch-input" placeholder="수신자명"
            .value="${this._srchReceiverNm || ''}"
            @input="${e => { this._srchReceiverNm = e.target.value; this.currentPage = 1 }}" />
        </label>
        <label class="srch-field">
          <span class="srch-label">상태</span>
          <select class="srch-select"
            .value="${this._srchOrderStatus || ''}"
            @change="${e => { this._srchOrderStatus = e.target.value; this.currentPage = 1 }}">
            <option value="">전체</option>
            ${(this.statusOptions || []).map(opt => html`
              <option value="${opt.name}" ?selected="${this._srchOrderStatus === opt.name}">
                ${opt.description || opt.name}
              </option>
            `)}
          </select>
        </label>
        <div class="srch-buttons">
          <button class="btn btn-srch-reset" @click="${this._resetSearch}">초기화</button>
        </div>
      </div>
    `
  }

  _renderTable() {
    const rows = this._visibleOrders
    return html`
      <table class="data-table">
        <thead>
          <tr>
            <th class="center" style="width:36px;">
              <input type="checkbox"
                style="width:14px;height:14px;cursor:pointer;accent-color:var(--md-sys-color-primary,#1976D2);"
                .checked="${this._visibleOrders.length > 0 && this._visibleOrders.every(o => this._selectedIds.has(o.id))}"
                .indeterminate="${this._visibleOrders.some(o => this._selectedIds.has(o.id)) && !this._visibleOrders.every(o => this._selectedIds.has(o.id))}"
                @change="${this._toggleSelectAll}" />
            </th>
            <th class="center" style="width:44px;">#</th>
            <th>${TermsUtil.tLabel('wave_no') || '웨이브번호'}</th>
            <th>${TermsUtil.tLabel('shipment_no') || '출고번호'}</th>
            <th>${TermsUtil.tLabel('ref_order_no') || '원주문번호'}</th>
            <th>${TermsUtil.tLabel('invoice_no') || '송장번호'}</th>
            <th>${TermsUtil.tLabel('cust_nm') || '거래처'}</th>
            <th>${TermsUtil.tLabel('orderer_nm') || '주문자'}</th>
            <th>${TermsUtil.tLabel('receiver_nm') || '수취인'}</th>
            <th>${TermsUtil.tLabel('order_date') || '주문일'}</th>
            <th class="right">${TermsUtil.tLabel('order_qty') || '주문수량'}</th>
            <th class="center">${TermsUtil.tLabel('status') || '상태'}</th>
            <th class="center">재할당 상태</th>
          </tr>
        </thead>
        <tbody>
          ${this.loading ? html`
            <tr class="loading-row">
              <td colspan="13"><span class="spinner"></span> 로딩 중...</td>
            </tr>
          ` : rows.length === 0 ? html`
            <tr class="empty-row">
              <td colspan="13">📭 BACK_ORDER 상태의 주문이 없습니다</td>
            </tr>
          ` : rows.map((order, idx) => this._renderRow(order, idx))}
        </tbody>
      </table>
    `
  }

  _renderRow(order, idx) {
    const isReady = order._reallocStatus === 'ALLOCATED'
    const isError = order._reallocStatus === 'ERROR'
    const isBackOrder = order._reallocStatus === 'BACK_ORDER'
    const isProcessing = order.id === this.currentProcessingId
    const rowClass = isProcessing ? 'row-processing'
      : isReady ? 'row-ready'
        : isError ? 'row-error'
          : isBackOrder ? 'row-backorder'
            : ''
    const rowNo = (this.currentPage - 1) * this.pageSize + idx + 1
    const isSelected = this._selectedIds.has(order.id)

    return html`
      <tr class="${rowClass} ${isSelected ? 'row-selected' : ''}">
        <td class="center" style="padding:0 4px;">
          <input type="checkbox"
            style="width:14px;height:14px;cursor:pointer;accent-color:var(--md-sys-color-primary,#1976D2);"
            .checked="${isSelected}"
            @change="${() => this._toggleSelectOrder(order.id)}" />
        </td>
        <td class="center row-no">${rowNo}</td>
        <td>${order.wave_no || '-'}</td>
        <td>${order.shipment_no || '-'}</td>
        <td>${order.ref_order_no || '-'}</td>
        <td>${order.invoice_no || '-'}</td>
        <td>${order.cust_nm || '-'}</td>
        <td>${order.orderer_nm || '-'}</td>
        <td>${order.receiver_nm || '-'}</td>
        <td>${order.order_date || '-'}</td>
        <td class="right">${order.total_order}</td>
        <td class="center">
          <span class="sbadge ${(order.status || '').toLowerCase()}">
            ${this._statusLabel(order.status)}
          </span>
        </td>
        <td class="center">
          ${isProcessing ? html`
            <span class="sbadge processing"><span class="spinner"></span>처리중</span>
          ` : order._reallocStatus ? html`
            <span class="sbadge ${order._reallocStatus.toLowerCase()}">
              ${this._reallocStatusLabel(order._reallocStatus)}
            </span>
          ` : html`<span style="color:#ccc;">-</span>`}
        </td>
      </tr>
    `
  }

  _renderPaginationBar() {
    const total = this._totalPages
    const cur = this.currentPage
    if (total <= 1) return ''

    const selCount = this._selectedIds.size
    return html`
      <div class="pagination-bar">
        <div class="pagination-left">
          <label class="select-all-label">
            <input type="checkbox"
              .checked="${this.orders.length > 0 && this.orders.every(o => this._selectedIds.has(o.id))}"
              .indeterminate="${this._selectedIds.size > 0 && !this.orders.every(o => this._selectedIds.has(o.id))}"
              @change="${this._toggleSelectAllOrders}" />
            전체 선택
          </label>
          ${selCount > 0 ? html`
            <span class="selected-count">✔ ${selCount.toLocaleString()}건 선택됨</span>
          ` : ''}
        </div>
        <button class="pbtn" ?disabled="${cur === 1}"     @click="${() => this._goToPage(1)}">«</button>
        <button class="pbtn" ?disabled="${cur === 1}"     @click="${() => this._goToPage(cur - 1)}">‹</button>
        ${this._pageNumbers(cur, total).map(p => p === '...' ? html`
          <span style="padding:0 2px;color:#bbb;">…</span>
        ` : html`
          <button class="pbtn ${p === cur ? 'active' : ''}"
            @click="${() => this._goToPage(p)}">${p}</button>
        `)}
        <button class="pbtn" ?disabled="${cur === total}" @click="${() => this._goToPage(cur + 1)}">›</button>
        <button class="pbtn" ?disabled="${cur === total}" @click="${() => this._goToPage(total)}">»</button>
        <span class="page-info">
          ${cur} / ${total} 페이지 (${this._filteredOrders.length.toLocaleString()}건)
        </span>
      </div>
    `
  }

  _renderActionBar() {
    return html`
      <div class="action-bar">
        <span class="hint-text">
          💡 <strong>재할당</strong>으로 BACK_ORDER 주문에 대해 재고 재할당을 시도합니다.<br>
          &nbsp;&nbsp;&nbsp;&nbsp;재고 부족이 해소된 경우 ALLOCATED로, 여전히 부족하면 BACK_ORDER로 유지됩니다.
        </span>
        <button class="btn btn-primary"
          ?disabled="${this.processing || this.orders.length === 0}"
          @click="${this._startReallocProcess}">
          🔄 재할당
        </button>
        <button class="btn btn-pause ${this._paused ? 'resuming' : ''}"
          ?disabled="${!this.processing}"
          @click="${this._togglePause}">
          ${this._paused ? '▶ 재개' : '⏸ 일시 중지'}
        </button>
        <button class="btn btn-default"
          ?disabled="${this.processing}"
          @click="${this._close}">
          닫기
        </button>
      </div>
    `
  }

  // ─── lifecycle ───────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback()
    Promise.all([this._fetchStatusOptions(), this._fetchOrders()])
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._stopTimer()
  }

  // ─── data ────────────────────────────────────────────────────────────────

  async _fetchStatusOptions() {
    try {
      const codeMaster = await ServiceUtil.codeItems('SHIPMENT_ORDER_STATUS')
      if (!codeMaster?.id) return
      this.statusOptions = codeMaster.items || []
    } catch (e) {
      console.error('SHIPMENT_ORDER_STATUS 공통코드 조회 실패:', e)
    }
  }

  /** BACK_ORDER 상태 주문 전체 조회 (최대 5000건) */
  async _fetchOrders() {
    this.loading = true
    try {
      const filters = [{ name: 'status', value: 'BACK_ORDER' }]
      const query = encodeURIComponent(JSON.stringify(filters))
      const sort = encodeURIComponent(JSON.stringify([{ name: 'created_at' }]))
      const result = await ServiceUtil.restGet(
        `shipment_orders?query=${query}&sort=${sort}&limit=5000`
      )
      const items = (result?.items || result || []).map(o => ({
        ...o,
        _reallocStatus: null
      }))
      this.orders = items
      this._ordersMap = new Map(items.map(o => [o.id, o]))
      this._selectedIds = new Set(items.map(o => o.id))
    } catch (e) {
      console.error('BACK_ORDER 주문 조회 실패:', e)
      UiUtil.showToast('error', '주문 조회에 실패했습니다.')
      this.orders = []
    } finally {
      this.loading = false
    }
  }

  // ─── processing ──────────────────────────────────────────────────────────

  /** 재할당 처리 시작 */
  async _startReallocProcess() {
    if (this._selectedIds.size === 0) {
      UiUtil.showToast('warning', '재할당할 주문이 없습니다.')
      return
    }

    const targets = this.orders.filter(o =>
      this._selectedIds.has(o.id) && o._reallocStatus !== 'ALLOCATED'
    )

    if (targets.length === 0) {
      UiUtil.showToast('info', '선택된 주문이 모두 이미 재할당 완료 상태입니다.')
      return
    }

    const totalCount = this.orders.length
    const selectedCount = this._selectedIds.size
    const confirmMsg = selectedCount === totalCount
      ? `${targets.length.toLocaleString()}건 재할당 처리하시겠습니까?`
      : `총 ${totalCount.toLocaleString()}건 중에 ${targets.length.toLocaleString()}건만 재할당 처리하시겠습니까?`

    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm', confirmMsg, 'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    this.processing = true
    this._processStartTime = Date.now()
    this._pausedAt = null
    this._totalPausedMs = 0
    this._startTimer()

    let successCnt = 0, backOrderCnt = 0, errorCnt = 0

    for (const order of targets) {
      if (order._reallocStatus === 'ALLOCATED') continue

      if (this._paused) {
        await new Promise(resolve => { this._resumeResolve = resolve })
      }

      this.currentProcessingId = order.id

      await new Promise(resolve => {
        ServiceUtil.restPost(
          `oms_trx/shipment_orders/${order.id}/confirm_and_allocate`, {}, null, null,
          result => {
            const o = this._ordersMap.get(order.id)
            if (o) {
              const isBackOrder = result?.back_order === true
              o.status = result?.status || (isBackOrder ? 'BACK_ORDER' : 'ALLOCATED')
              o._reallocStatus = isBackOrder ? 'BACK_ORDER' : 'ALLOCATED'
            }
            if (result?.back_order) backOrderCnt++
            else successCnt++
            resolve()
          },
          err => {
            console.error(`재할당 실패 (${order.shipment_no}):`, err)
            const o = this._ordersMap.get(order.id)
            if (o) o._reallocStatus = 'ERROR'
            errorCnt++
            resolve()
          }
        )
      })
    }

    this._stopTimer()
    this.processing = false
    this.currentProcessingId = null
    this._paused = false
    this._resumeResolve = null
    this._tick++

    UiUtil.showToast(
      errorCnt === 0 && backOrderCnt === 0 ? 'success' : 'warning',
      `재할당 완료 — 성공: ${successCnt}건, 재고부족: ${backOrderCnt}건, 오류: ${errorCnt}건`
    )

    this.dispatchEvent(new CustomEvent('realloc-done', {
      bubbles: true, composed: true,
      detail: { successCnt, backOrderCnt, errorCnt }
    }))
  }

  // ─── pagination / filter / select helpers ────────────────────────────────

  _pageNumbers(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', cur - 1, cur, cur + 1, '...', total]
  }

  _goToPage(page) {
    this.currentPage = Math.max(1, Math.min(page, this._totalPages))
  }

  _setFilter(status) {
    this.filterStatus = status
    this.currentPage = 1
  }

  _resetSearch() {
    this._srchDate = ''
    this._srchRefOrderNo = ''
    this._srchOrdererNm = ''
    this._srchReceiverNm = ''
    this._srchOrderStatus = ''
    this.currentPage = 1
  }

  _toggleSelectAll() {
    const visible = this._visibleOrders
    const allSelected = visible.every(o => this._selectedIds.has(o.id))
    if (allSelected) {
      visible.forEach(o => this._selectedIds.delete(o.id))
    } else {
      visible.forEach(o => this._selectedIds.add(o.id))
    }
    this._tick++
  }

  _toggleSelectAllOrders() {
    const allSelected = this.orders.length > 0 && this.orders.every(o => this._selectedIds.has(o.id))
    if (allSelected) {
      this._selectedIds.clear()
    } else {
      this.orders.forEach(o => this._selectedIds.add(o.id))
    }
    this._tick++
  }

  _toggleSelectOrder(id) {
    if (this._selectedIds.has(id)) {
      this._selectedIds.delete(id)
    } else {
      this._selectedIds.add(id)
    }
    this._tick++
  }

  _togglePause() {
    if (!this.processing) return
    this._paused = !this._paused
    if (this._paused) {
      this._pausedAt = Date.now()
    } else {
      if (this._pausedAt) {
        this._totalPausedMs += Date.now() - this._pausedAt
        this._pausedAt = null
      }
      if (this._resumeResolve) {
        this._resumeResolve()
        this._resumeResolve = null
      }
    }
  }

  _jumpToCurrentOrder() {
    if (!this.currentProcessingId) return
    this.filterStatus = null
    const idx = this.orders.findIndex(o => o.id === this.currentProcessingId)
    if (idx >= 0) this.currentPage = Math.floor(idx / this.pageSize) + 1
  }

  _close() {
    UiUtil.closePopupBy(this)
  }

  // ─── timer helpers ───────────────────────────────────────────────────────

  _startTimer() {
    if (this._updateTimer) return
    this._updateTimer = setInterval(() => {
      this._autoFollowProcessing()
      this._tick++
    }, 300)
  }

  _autoFollowProcessing() {
    if (!this.processing || this.filterStatus !== null || !this.currentProcessingId) return
    const idx = this.orders.findIndex(o => o.id === this.currentProcessingId)
    if (idx < 0) return
    const targetPage = Math.floor(idx / this.pageSize) + 1
    if (targetPage !== this.currentPage) this.currentPage = targetPage

    if (this._lastScrolledId !== this.currentProcessingId) {
      this._lastScrolledId = this.currentProcessingId
      this.updateComplete.then(() => {
        const row = this.shadowRoot?.querySelector('tr.row-processing')
        if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }
  }

  _stopTimer() {
    if (!this._updateTimer) return
    clearInterval(this._updateTimer)
    this._updateTimer = null
  }

  // ─── label helpers ───────────────────────────────────────────────────────

  _formatElapsed() {
    if (!this._processStartTime) return '00:00'
    const currentPausedMs = this._pausedAt ? (Date.now() - this._pausedAt) : 0
    const sec = Math.floor((Date.now() - this._processStartTime - this._totalPausedMs - currentPausedMs) / 1000)
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const pad = n => String(n).padStart(2, '0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  }

  _statusLabel(status) {
    if (!status) return '-'
    const opt = this.statusOptions.find(o => o.name === status)
    return opt ? (opt.description || opt.name) : status
  }

  _reallocStatusLabel(status) {
    const map = {
      ALLOCATED:  '✅ 재할당완료',
      BACK_ORDER: '⚠ 재고부족',
      ERROR:      '❌ 오류'
    }
    return map[status] || status
  }
}

window.customElements.define('backorder-reallocate-popup', BackorderReallocatePopup)
