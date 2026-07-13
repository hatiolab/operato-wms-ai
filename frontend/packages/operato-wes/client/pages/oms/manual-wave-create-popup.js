import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 수동 웨이브 생성 팝업
 *
 * B2C(biz_type=B2C_OUT) 주문 중 wave_no가 없고 REGISTERED/CONFIRMED/ALLOCATED 상태인 주문을 표시한다.
 * - 전체 데이터(최대 5000건)는 메모리(_ordersMap)에 보관하고 DOM은 현재 페이지(100건)만 렌더링
 * - 처리 루프는 orders 객체를 직접 변경하고, UI는 _tick 카운터로 300ms 간격 throttle 업데이트
 * - 처리 중 페이지 이동 자유, 상단 요약은 항상 고정 표시
 *
 * @fires wave-ready - 웨이브 생성 완료 시 발생
 */
class ManualWaveCreatePopup extends localize(i18next)(LitElement) {
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
        .stat-item.total    { color: var(--md-sys-color-on-surface-variant, #555); }
        .stat-item.done     { color: #2E7D32; }
        .stat-item.err      { color: #C62828; }
        .stat-item.bo       { color: #E65100; }
        .stat-item.pending  { color: #777; }
        .stat-item.pct      { margin-left: auto; font-size: 13px; color: var(--md-sys-color-primary, #1976D2); }

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
        .fchip.all     { background: #EEF2FF; color: #3F51B5; }
        .fchip.done    { background: #E8F5E9; color: #2E7D32; }
        .fchip.err     { background: #FFEBEE; color: #C62828; }
        .fchip.bo      { background: #FFF3E0; color: #E65100; }
        .fchip.pend    { background: #F5F5F5; color: #555; }
        .fchip.active  { border-color: currentColor; }

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
        .btn-wave { background: linear-gradient(135deg, #7B1FA2, #4A148C); color: #fff; }
        .btn-default {
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }
        .btn-default:hover:not(:disabled) { background: var(--md-sys-color-surface-variant, #f5f5f5); }

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
      waveNo: String,
      inputPickers: Number,
      inspFlag: Boolean,
      currentPage: Number,
      pageSize: Number,
      filterStatus: String,
      _tick: Number,        // 300ms throttle용 내부 카운터 — 직접 사용하지 않음
    }
  }

  constructor() {
    super()
    this.orders = []
    this.loading = false
    this.processing = false
    this.currentProcessingId = null
    this.statusOptions = []
    this.waveNo = ''
    this.inputPickers = 1
    this.inspFlag = false
    this.currentPage = 1
    this.pageSize = 100
    this.filterStatus = null
    this._tick = 0
    this._ordersMap = new Map()   // id → order 객체 (O(1) 조회)
    this._updateTimer = null
  }

  // ─── computed getters ────────────────────────────────────────────────────

  /** 전체 집계 통계 */
  get _stats() {
    let done = 0, err = 0, bo = 0
    for (const o of this.orders) {
      if (o._readyStatus === 'ALLOCATED')  done++
      else if (o._readyStatus === 'ERROR') err++
      else if (o._readyStatus === 'BACK_ORDER') bo++
    }
    const processed = done + err + bo
    return {
      total: this.orders.length,
      done,
      err,
      bo,
      pending: this.orders.length - processed,
      processed,
    }
  }

  /** 필터 적용된 전체 목록 */
  get _filteredOrders() {
    switch (this.filterStatus) {
      case 'ALLOCATED':   return this.orders.filter(o => o._readyStatus === 'ALLOCATED')
      case 'ERROR':       return this.orders.filter(o => o._readyStatus === 'ERROR')
      case 'BACK_ORDER':  return this.orders.filter(o => o._readyStatus === 'BACK_ORDER')
      case 'PENDING':     return this.orders.filter(o => !o._readyStatus)
      default:            return this.orders
    }
  }

  /** 전체 페이지 수 */
  get _totalPages() {
    return Math.max(1, Math.ceil(this._filteredOrders.length / this.pageSize))
  }

  /** 현재 페이지에 표시할 목록 (pageSize개) */
  get _visibleOrders() {
    const start = (this.currentPage - 1) * this.pageSize
    return this._filteredOrders.slice(start, start + this.pageSize)
  }

  // ─── render ──────────────────────────────────────────────────────────────

  render() {
    return html`
      ${this._renderSummarySection()}
      <div class="table-wrap">${this._renderTable()}</div>
      ${this._renderPaginationBar()}
      ${this._renderActionBar()}
    `
  }

  /** 상단 요약 섹션 (설정 행 + 진행 행 + 필터 탭) */
  _renderSummarySection() {
    const s = this._stats
    const pct = s.total > 0 ? Math.round(s.processed / s.total * 100) : 0
    const cur = this.currentProcessingId ? this._ordersMap.get(this.currentProcessingId) : null

    return html`
      <div class="summary-section">

        <!-- 설정 행 -->
        <div class="settings-row">
          <span>${TermsUtil.tLabel('wave_no') || '웨이브번호'}:
            <span class="value">${this.waveNo || '-'}</span>
          </span>
          <span class="vdiv">|</span>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700;">
            <input type="checkbox"
              style="width:15px;height:15px;cursor:pointer;accent-color:var(--md-sys-color-primary,#1976D2);"
              .checked="${this.inspFlag}"
              @change="${e => { this.inspFlag = e.target.checked }}" />
            🔍 검수 여부
          </label>
          <span class="vdiv">|</span>
          <span style="font-weight:700;">👷 작업자 수</span>
          <input type="number" min="1"
            style="width:60px;padding:3px 8px;border:1px solid var(--md-sys-color-primary,#1976D2);border-radius:6px;font-size:12px;font-weight:600;text-align:center;"
            .value="${this.inputPickers}"
            @change="${e => { this.inputPickers = Math.max(1, parseInt(e.target.value) || 1) }}" />
          <!-- 상태별 필터 — 오른쪽 정렬 -->
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
            <span class="stat-item err">❌ 오류 <span class="n">${s.err.toLocaleString()}</span></span>
            <span class="stat-item bo">⚠ 백오더 <span class="n">${s.bo.toLocaleString()}</span></span>
            <span class="stat-item pending">⏳ 대기 <span class="n">${s.pending.toLocaleString()}</span></span>
            <span class="stat-item pct">${pct}% (${s.processed.toLocaleString()} / ${s.total.toLocaleString()})</span>
          </div>

          ${cur ? html`
            <div class="current-order-row">
              <span class="spinner"></span>
              <span>처리 중: <strong>${cur.shipment_no}</strong>
                ${cur.receiver_nm ? html`· ${cur.receiver_nm}` : ''}
              </span>
              <button class="jump-btn" @click="${this._jumpToCurrentOrder}">이 주문으로 이동</button>
            </div>
          ` : ''}
        </div>

      </div>
    `
  }

  /** 상태별 필터 칩 (settings-row 우측에 인라인 렌더링) */
  _renderFilterBar(s) {
    const f = this.filterStatus
    return html`
      <span class="fchip all  ${!f ? 'active' : ''}"
        @click="${() => this._setFilter(null)}">전체 ${s.total.toLocaleString()}</span>
      <span class="fchip done ${f === 'ALLOCATED'  ? 'active' : ''}"
        @click="${() => this._setFilter('ALLOCATED')}">✅ 완료 ${s.done.toLocaleString()}</span>
      <span class="fchip err  ${f === 'ERROR'       ? 'active' : ''}"
        @click="${() => this._setFilter('ERROR')}">❌ 오류 ${s.err.toLocaleString()}</span>
      <span class="fchip bo   ${f === 'BACK_ORDER'  ? 'active' : ''}"
        @click="${() => this._setFilter('BACK_ORDER')}">⚠ 백오더 ${s.bo.toLocaleString()}</span>
      <span class="fchip pend ${f === 'PENDING'     ? 'active' : ''}"
        @click="${() => this._setFilter('PENDING')}">⏳ 대기 ${s.pending.toLocaleString()}</span>
    `
  }

  /** 데이터 테이블 (현재 페이지만 렌더링) */
  _renderTable() {
    const rows = this._visibleOrders
    return html`
      <table class="data-table">
        <thead>
          <tr>
            <th class="center" style="width:44px;">#</th>
            <th>${TermsUtil.tLabel('wave_no')       || '웨이브번호'}</th>
            <th>${TermsUtil.tLabel('shipment_no')   || '출고번호'}</th>
            <th>${TermsUtil.tLabel('ref_order_no')  || '원주문번호'}</th>
            <th>${TermsUtil.tLabel('invoice_no')    || '송장번호'}</th>
            <th>${TermsUtil.tLabel('cust_nm')       || '거래처'}</th>
            <th>${TermsUtil.tLabel('orderer_nm')    || '주문자'}</th>
            <th>${TermsUtil.tLabel('receiver_nm')   || '수취인'}</th>
            <th>${TermsUtil.tLabel('order_date')    || '주문일'}</th>
            <th class="right">${TermsUtil.tLabel('order_qty') || '주문수량'}</th>
            <th class="center">${TermsUtil.tLabel('status')   || '상태'}</th>
            <th class="center">${TermsUtil.tLabel('ready_status') || '출고 준비 상태'}</th>
          </tr>
        </thead>
        <tbody>
          ${this.loading ? html`
            <tr class="loading-row">
              <td colspan="12"><span class="spinner"></span> 로딩 중...</td>
            </tr>
          ` : rows.length === 0 ? html`
            <tr class="empty-row">
              <td colspan="12">📭 표시할 주문이 없습니다</td>
            </tr>
          ` : rows.map((order, idx) => this._renderRow(order, idx))}
        </tbody>
      </table>
    `
  }

  /** 단일 행 렌더링 */
  _renderRow(order, idx) {
    const isReady      = order._readyStatus === 'ALLOCATED'
    const isError      = order._readyStatus === 'ERROR'
    const isBackOrder  = order._readyStatus === 'BACK_ORDER'
    const isProcessing = order.id === this.currentProcessingId
    const rowClass = isProcessing ? 'row-processing'
                   : isReady     ? 'row-ready'
                   : isError     ? 'row-error'
                   : isBackOrder ? 'row-backorder'
                   : ''
    const rowNo = (this.currentPage - 1) * this.pageSize + idx + 1

    return html`
      <tr class="${rowClass}">
        <td class="center row-no">${rowNo}</td>
        <td>${order.wave_no       || '-'}</td>
        <td>${order.shipment_no   || '-'}</td>
        <td>${order.ref_order_no  || '-'}</td>
        <td>${order.invoice_no    || '-'}</td>
        <td>${order.cust_nm       || '-'}</td>
        <td>${order.orderer_nm    || '-'}</td>
        <td>${order.receiver_nm   || '-'}</td>
        <td>${order.order_date    || '-'}</td>
        <td class="right">${order.total_order}</td>
        <td class="center">
          <span class="sbadge ${(order.status || '').toLowerCase()}">
            ${this._statusLabel(order.status)}
          </span>
        </td>
        <td class="center">
          ${isProcessing ? html`
            <span class="sbadge processing"><span class="spinner"></span>처리중</span>
          ` : order._readyStatus ? html`
            <span class="sbadge ${order._readyStatus.toLowerCase()}">
              ${this._readyStatusLabel(order._readyStatus)}
            </span>
          ` : html`<span style="color:#ccc;">-</span>`}
        </td>
      </tr>
    `
  }

  /** 페이지네이션 바 */
  _renderPaginationBar() {
    const total = this._totalPages
    const cur   = this.currentPage
    if (total <= 1) return ''

    return html`
      <div class="pagination-bar">
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

  /** 하단 액션 바 */
  _renderActionBar() {
    return html`
      <div class="action-bar">
        <span class="hint-text">
          💡 <strong>출고 준비</strong>로 확정·할당 후, 할당 완료된 주문으로 <strong>웨이브 생성</strong>을 진행하세요.
        </span>
        <button class="btn btn-primary"
          ?disabled="${this.processing || this.orders.length === 0}"
          @click="${this._startReadyProcess}">
          🚀 출고 준비
        </button>
        <button class="btn btn-wave"
          ?disabled="${this.processing || this.orders.length === 0}"
          @click="${this._confirmWave}">
          🌊 웨이브 생성
        </button>
        <button class="btn btn-default"
          ?disabled="${this.processing}"
          @click="${this._close}">
          닫기
        </button>
      </div>
    `
  }

  // ─── pagination helpers ──────────────────────────────────────────────────

  /** 페이지 번호 배열 생성 (스마트 윈도우) */
  _pageNumbers(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (cur <= 4)        return [1, 2, 3, 4, 5, '...', total]
    if (cur >= total - 3) return [1, '...', total-4, total-3, total-2, total-1, total]
    return [1, '...', cur - 1, cur, cur + 1, '...', total]
  }

  _goToPage(page) {
    this.currentPage = Math.max(1, Math.min(page, this._totalPages))
  }

  _setFilter(status) {
    this.filterStatus = status
    this.currentPage  = 1
  }

  /** 현재 처리 중인 주문이 있는 페이지로 이동 */
  _jumpToCurrentOrder() {
    if (!this.currentProcessingId) return
    this.filterStatus = null
    const idx = this.orders.findIndex(o => o.id === this.currentProcessingId)
    if (idx >= 0) this.currentPage = Math.floor(idx / this.pageSize) + 1
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

  /** B2C 출고 준비 대상 주문 전체 조회 (최대 5000건) */
  async _fetchOrders() {
    this.loading = true
    try {
      const filters = [
        { name: 'biz_type', value: 'B2C_OUT' },
        { name: 'wave_no', operator: 'is_blank' },
        { name: 'status', operator: 'in', value: 'REGISTERED,CONFIRMED,ALLOCATED' }
      ]
      const query = encodeURIComponent(JSON.stringify(filters))
      const sort  = encodeURIComponent(JSON.stringify([{ name: 'created_at' }]))
      const result = await ServiceUtil.restGet(
        `shipment_orders?query=${query}&sort=${sort}&limit=5000`
      )
      const items = (result?.items || result || []).map(o => ({ ...o, _readyStatus: null }))
      this.orders    = items
      this._ordersMap = new Map(items.map(o => [o.id, o]))
    } catch (e) {
      console.error('출고 준비 대상 주문 조회 실패:', e)
      UiUtil.showToast('error', '주문 조회에 실패했습니다.')
      this.orders = []
    } finally {
      this.loading = false
    }
  }

  // ─── processing ──────────────────────────────────────────────────────────

  /** 출고 준비 처리 시작 — orders 배열 직접 변경, 300ms throttle로 UI 업데이트 */
  async _startReadyProcess() {
    if (this.orders.length === 0) {
      UiUtil.showToast('error', '웨이브 생성할 대상 주문이 없습니다.')
      return
    }

    this.processing = true
    this._startTimer()

    for (const order of this.orders) {
      // 이미 성공 처리된 건은 스킵 (재실행 시 오류 건만 재처리)
      if (order._readyStatus === 'ALLOCATED') continue

      this.currentProcessingId = order.id

      await new Promise(resolve => {
        ServiceUtil.restPost(
          `oms_trx/shipment_orders/${order.id}/confirm_and_allocate`, {}, null, null,
          result => {
            const o = this._ordersMap.get(order.id)
            if (o) {
              o.status       = result?.status
              o._readyStatus = result?.status
              o.invoice_no   = result?.invoice_no
            }
            resolve()
          },
          err => {
            console.error(`출고 준비 실패 (${order.shipment_no}):`, err)
            const o = this._ordersMap.get(order.id)
            if (o) o._readyStatus = 'ERROR'
            resolve()
          }
        )
      })
    }

    this._stopTimer()
    this.processing = false
    this.currentProcessingId = null
    this._tick++  // 최종 렌더링 강제

    const s = this._stats
    UiUtil.showToast('success',
      `출고 준비 완료 — 완료: ${s.done.toLocaleString()}, 오류: ${s.err.toLocaleString()}, 백오더: ${s.bo.toLocaleString()}`
    )
  }

  /** 웨이브 생성 처리 */
  async _confirmWave() {
    const allocatedOrders = this.orders.filter(o => o.status === 'ALLOCATED')
    if (allocatedOrders.length === 0) {
      UiUtil.showToast('warning', '할당 상태의 주문이 없어서 웨이브 구성을 할 수 없습니다.')
      return
    }

    const inspectionLabel = this.inspFlag ? '검수 있음' : '검수 없음'
    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `웨이브 생성합니다. (${inspectionLabel})\n구성 주문: ${allocatedOrders.length.toLocaleString()}개. 진행하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    this.processing = true
    try {
      const payload = { inspFlag: this.inspFlag, inputPickers: this.inputPickers, orders: allocatedOrders }
      await ServiceUtil.restPost('oms_trx/waves/config_wave', payload, null, null,
        result => {
          this.waveNo = result?.wave?.wave_no || ''
          const ids = new Set(allocatedOrders.map(o => o.id))
          for (const o of this.orders) {
            if (ids.has(o.id)) o.wave_no = this.waveNo
          }
          this._tick++
          UiUtil.showToast('success',
            `웨이브 생성 완료! 웨이브번호: ${this.waveNo} (${result?.order_count || allocatedOrders.length}건)`
          )
        },
        err => {
          console.error('웨이브 생성 실패:', err)
          UiUtil.showToast('error', '웨이브 생성 처리 중 오류가 발생했습니다.')
        }
      )
      if (this.waveNo) {
        this.dispatchEvent(new CustomEvent('wave-ready', {
          bubbles: true,
          composed: true,
          detail: { wave_no: this.waveNo, order_count: allocatedOrders.length }
        }))
      }
    } finally {
      this.processing = false
    }
  }

  _close() {
    UiUtil.closePopupBy(this)
  }

  // ─── timer helpers ───────────────────────────────────────────────────────

  /** 300ms 간격으로 _tick을 증가시켜 LitElement 재렌더링을 유발 */
  _startTimer() {
    if (this._updateTimer) return
    this._updateTimer = setInterval(() => { this._tick++ }, 300)
  }

  _stopTimer() {
    if (!this._updateTimer) return
    clearInterval(this._updateTimer)
    this._updateTimer = null
  }

  // ─── label helpers ───────────────────────────────────────────────────────

  /** SHIPMENT_ORDER_STATUS 공통코드 기반 상태 라벨 */
  _statusLabel(status) {
    if (!status) return '-'
    const opt = this.statusOptions.find(o => o.name === status)
    return opt ? (opt.description || opt.name) : status
  }

  /** 출고 준비 처리 결과 라벨 */
  _readyStatusLabel(status) {
    const map = {
      ALLOCATED:  '✅ 준비완료',
      BACK_ORDER: '⚠ 백오더',
      ERROR:      '❌ 오류',
    }
    return map[status] || status
  }
}

window.customElements.define('manual-wave-create-popup', ManualWaveCreatePopup)
