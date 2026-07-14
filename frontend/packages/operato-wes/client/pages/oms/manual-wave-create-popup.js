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
        .fchip.all     { background: #EEF2FF; color: #3F51B5; }
        .fchip.done    { background: #E8F5E9; color: #2E7D32; }
        .fchip.err     { background: #FFEBEE; color: #C62828; }
        .fchip.bo      { background: #FFF3E0; color: #E65100; }
        .fchip.pend    { background: #F5F5F5; color: #555; }
        .fchip.active  { border-color: currentColor; }

        /* ===== 테이블 ===== */
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
        .btn-wave { background: linear-gradient(135deg, #7B1FA2, #4A148C); color: #fff; }
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

        .btn-exclude {
          background: var(--md-sys-color-surface, #fff);
          color: #C62828;
          border: 1px solid #C62828;
        }
        .btn-exclude:hover:not(:disabled) { background: #FFEBEE; }

        .btn-dealloc {
          background: var(--md-sys-color-surface, #fff);
          color: #6A1B9A;
          border: 1px solid #6A1B9A;
        }
        .btn-dealloc:hover:not(:disabled) { background: #F3E5F5; }

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
      _paused: Boolean,     // 출고 준비 일시 중지 상태
      _srchDate: String,
      _srchRefOrderNo: String,
      _srchOrdererNm: String,
      _srchReceiverNm: String,
      _srchOrderStatus: String,
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
    this._paused = false
    this._srchDate = ''
    this._srchRefOrderNo = ''
    this._srchOrdererNm = ''
    this._srchReceiverNm = ''
    this._srchOrderStatus = ''
    this._selectedIds = new Set() // 선택된 주문 id 집합
    this._ordersMap = new Map()   // id → order 객체 (O(1) 조회)
    this._updateTimer = null
    this._processStartTime = null
    this._resumeResolve = null    // 일시 중지 해제용 Promise resolver
    this._lastScrolledId = null   // 스크롤 중복 방지용 마지막 스크롤 대상 ID
    this._pausedAt = null         // 일시 중지 시작 시각
    this._totalPausedMs = 0       // 누적 중지 시간(ms)
  }

  // ─── computed getters ────────────────────────────────────────────────────

  /** 전체 집계 통계 */
  get _stats() {
    let done = 0, err = 0, bo = 0
    for (const o of this.orders) {
      if (o._readyStatus === 'ALLOCATED') done++
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
    let orders = this.orders

    // 출고 준비 상태 칩 필터
    switch (this.filterStatus) {
      case 'ALLOCATED': orders = orders.filter(o => o._readyStatus === 'ALLOCATED'); break
      case 'ERROR':     orders = orders.filter(o => o._readyStatus === 'ERROR'); break
      case 'BACK_ORDER':orders = orders.filter(o => o._readyStatus === 'BACK_ORDER'); break
      case 'PENDING':   orders = orders.filter(o => !o._readyStatus); break
    }

    // 검색 바 필터 (메모리 조회)
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

  /** 전체 페이지 수 */
  get _totalPages() {
    return Math.max(1, Math.ceil(this._filteredOrders.length / this.pageSize))
  }

  /** 전체 주문이 모두 할당 완료 상태인지 여부 */
  get _allAllocated() {
    return this.orders.length > 0 && this.orders.every(o => o._readyStatus === 'ALLOCATED')
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
      ${this._renderSearchBar()}
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
            <span class="stat-item pct">출고 준비 완료율 : ${pct}% (${s.processed.toLocaleString()} / ${s.total.toLocaleString()})</span>
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
              <span class="elapsed-time">출고 준비 경과 시간 ⏱ ${this._formatElapsed()}</span>
            </div>
          ` : ''}
        </div>

      </div>
    `
  }

  /** 검색 바 (주문일/외부참조번호/주문자/수신자/상태) */
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

  /** 검색 조건 초기화 */
  _resetSearch() {
    this._srchDate = ''
    this._srchRefOrderNo = ''
    this._srchOrdererNm = ''
    this._srchReceiverNm = ''
    this._srchOrderStatus = ''
    this.currentPage = 1
  }

  /** 상태별 필터 칩 (settings-row 우측에 인라인 렌더링) */
  _renderFilterBar(s) {
    const f = this.filterStatus
    return html`
      <span class="fchip all  ${!f ? 'active' : ''}"
        @click="${() => this._setFilter(null)}">전체 ${s.total.toLocaleString()}</span>
      <span class="fchip done ${f === 'ALLOCATED' ? 'active' : ''}"
        @click="${() => this._setFilter('ALLOCATED')}">✅ 완료 ${s.done.toLocaleString()}</span>
      <span class="fchip err  ${f === 'ERROR' ? 'active' : ''}"
        @click="${() => this._setFilter('ERROR')}">❌ 오류 ${s.err.toLocaleString()}</span>
      <span class="fchip bo   ${f === 'BACK_ORDER' ? 'active' : ''}"
        @click="${() => this._setFilter('BACK_ORDER')}">⚠ 백오더 ${s.bo.toLocaleString()}</span>
      <span class="fchip pend ${f === 'PENDING' ? 'active' : ''}"
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
            <th class="center">${TermsUtil.tLabel('ready_status') || '출고 준비 상태'}</th>
          </tr>
        </thead>
        <tbody>
          ${this.loading ? html`
            <tr class="loading-row">
              <td colspan="13"><span class="spinner"></span> 로딩 중...</td>
            </tr>
          ` : rows.length === 0 ? html`
            <tr class="empty-row">
              <td colspan="13">📭 표시할 주문이 없습니다</td>
            </tr>
          ` : rows.map((order, idx) => this._renderRow(order, idx))}
        </tbody>
      </table>
    `
  }

  /** 단일 행 렌더링 */
  _renderRow(order, idx) {
    const isReady = order._readyStatus === 'ALLOCATED'
    const isError = order._readyStatus === 'ERROR'
    const isBackOrder = order._readyStatus === 'BACK_ORDER'
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

  /** 하단 액션 바 */
  _renderActionBar() {
    return html`
      <div class="action-bar">
        <span class="hint-text">
          💡 <strong>출고 준비</strong>로 확정·할당 후, 할당 완료된 주문으로 <strong>웨이브 생성</strong>을 진행하세요.
        </span>
        <button class="btn btn-primary"
          ?disabled="${this.processing || this.orders.length === 0 || this._allAllocated}"
          @click="${this._startReadyProcess}">
          🚀 출고 준비
        </button>
        <button class="btn btn-pause ${this._paused ? 'resuming' : ''}"
          ?disabled="${!this.processing}"
          @click="${this._togglePause}">
          ${this._paused ? '▶ 재개' : '⏸ 일시 중지'}
        </button>
        <button class="btn btn-wave"
          ?disabled="${this.processing || this.orders.length === 0}"
          @click="${this._confirmWave}">
          🌊 웨이브 생성
        </button>
        <button class="btn btn-dealloc"
          ?disabled="${this.processing}"
          @click="${this._deallocateSelected}">
          🔓 할당 해제
        </button>
        <button class="btn btn-exclude"
          ?disabled="${this.processing}"
          @click="${this._excludeSelected}">
          🗑 주문 제외
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

  /** 출고 준비 일시 중지 / 재개 토글 */
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

  /** 현재 페이지 전체 선택 / 해제 토글 (테이블 헤더 체크박스) */
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

  /** 전체 주문 선택 / 해제 토글 (페이지네이션 바 체크박스) */
  _toggleSelectAllOrders() {
    const allSelected = this.orders.length > 0 && this.orders.every(o => this._selectedIds.has(o.id))
    if (allSelected) {
      this._selectedIds.clear()
    } else {
      this.orders.forEach(o => this._selectedIds.add(o.id))
    }
    this._tick++
  }

  /** 개별 행 선택 토글 */
  _toggleSelectOrder(id) {
    if (this._selectedIds.has(id)) {
      this._selectedIds.delete(id)
    } else {
      this._selectedIds.add(id)
    }
    this._tick++
  }

  /** 선택한 주문을 리스트에서 제외 */
  async _excludeSelected() {
    if (this._selectedIds.size === 0) {
      UiUtil.showToast('warning', '선택된 주문이 없습니다.')
      return
    }
    const cnt = this._selectedIds.size
    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `${cnt.toLocaleString()}건 주문 제외 처리하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    this.orders = this.orders.filter(o => !this._selectedIds.has(o.id))
    this._ordersMap = new Map(this.orders.map(o => [o.id, o]))
    this._selectedIds.clear()
    this._tick++
  }

  /** 선택한 주문 할당 해제 */
  async _deallocateSelected() {
    // 전체 선택 여부: 선택 없음이거나 전체 주문이 모두 선택된 경우
    const isFullSelection = this._selectedIds.size === 0 || this._selectedIds.size === this.orders.length
    let toProcess

    if (this._selectedIds.size === 0) {
      // 선택 없음 → 전체 ALLOCATED 주문 처리 여부 확인
      const allAllocated = this.orders.filter(o => o.status === 'ALLOCATED')
      if (allAllocated.length === 0) {
        UiUtil.showToast('warning', '할당 완료 상태인 주문이 없습니다.')
        return
      }
      const confirmed = await UiUtil.showAlertPopup(
        'label.confirm',
        `선택된 주문이 없습니다. 혹시 할당 완료된 전체 주문(${allAllocated.length.toLocaleString()}건) 할당 해제하시겠습니까?`,
        'question', 'confirm', 'cancel'
      )
      if (!confirmed) return
      toProcess = allAllocated
    } else {
      const selectedOrders = this.orders.filter(o => this._selectedIds.has(o.id))

      if (isFullSelection) {
        // 전체 선택: 비ALLOCATED 스킵, ALLOCATED만 처리
        toProcess = selectedOrders.filter(o => o.status === 'ALLOCATED')
        if (toProcess.length === 0) {
          UiUtil.showToast('warning', '할당 완료 상태인 주문이 없습니다.')
          return
        }
      } else {
        // 부분 선택: 비ALLOCATED 발견 시 에러 후 중단
        const nonAllocated = selectedOrders.find(o => o.status !== 'ALLOCATED')
        if (nonAllocated) {
          UiUtil.showToast('error',
            `출고 주문 (${nonAllocated.shipment_no || nonAllocated.id}, 주문자: ${nonAllocated.orderer_nm || '-'}, 수신자: ${nonAllocated.receiver_nm || '-'}) 주문은 할당 완료 상태가 아니라서 할당 해제할 수 없습니다.`)
          return
        }
        toProcess = selectedOrders
      }
    }

    const confirmDealloc = await UiUtil.showAlertPopup(
      'label.confirm',
      `${toProcess.length.toLocaleString()}건 할당 해제 처리하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmDealloc) return

    this.processing = true
    this._pausedAt = null
    this._totalPausedMs = 0
    this._startTimer()
    let successCnt = 0
    let errorCnt = 0

    for (const order of toProcess) {
      if (this._paused) {
        await new Promise(resolve => { this._resumeResolve = resolve })
      }
      this.currentProcessingId = order.id

      await new Promise(resolve => {
        ServiceUtil.restPost(`oms_trx/shipment_orders/deallocate`, { id: order.id }, null, null,
          () => {
            const o = this._ordersMap.get(order.id)
            if (o) {
              o.status = 'CONFIRMED'
              o._readyStatus = null
            }
            successCnt++
            resolve()
          },
          () => {
            const o = this._ordersMap.get(order.id)
            if (o) o._readyStatus = 'ERROR'
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
    this._selectedIds.clear()
    this._tick++
    UiUtil.showToast('success', `할당 해제 완료 — 성공: ${successCnt}건, 오류: ${errorCnt}건`)
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
      const sort = encodeURIComponent(JSON.stringify([{ name: 'created_at' }]))
      const result = await ServiceUtil.restGet(
        `shipment_orders?query=${query}&sort=${sort}&limit=5000`
      )
      const items = (result?.items || result || []).map(o => ({
        ...o,
        _readyStatus: o.status === 'ALLOCATED' ? 'ALLOCATED' : null
      }))
      this.orders = items
      this._ordersMap = new Map(items.map(o => [o.id, o]))
      this._selectedIds.clear()
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

    if (this._allAllocated) {
      UiUtil.showToast('info', '모든 주문이 할당 완료 상태라서 바로 웨이브 생성할 수 있습니다.')
      return
    }

    this.processing = true
    this._processStartTime = Date.now()
    this._pausedAt = null
    this._totalPausedMs = 0
    this._startTimer()

    for (const order of this.orders) {
      // 이미 성공 처리된 건은 스킵 (재실행 시 오류 건만 재처리)
      if (order._readyStatus === 'ALLOCATED') continue

      // 이미 할당 완료 상태이면 서비스 호출 생략하고 완료 처리
      if (order.status === 'ALLOCATED') {
        order._readyStatus = 'ALLOCATED'
        continue
      }

      // 일시 중지 상태이면 재개 신호가 올 때까지 대기
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
              o.status = result?.status
              o._readyStatus = result?.status
              o.invoice_no = result?.invoice_no
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
    this._paused = false
    this._resumeResolve = null
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

  /** 300ms 간격으로 _tick을 증가시켜 LitElement 재렌더링을 유발, 자동 페이지 이동 병행 */
  _startTimer() {
    if (this._updateTimer) return
    this._updateTimer = setInterval(() => {
      this._autoFollowProcessing()
      this._tick++
    }, 300)
  }

  /** 처리 중 + 전체 필터 상태일 때 현재 처리 중인 주문 페이지로 자동 이동 및 스크롤 */
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

  /** 처리 시작 시각으로부터 경과 시간을 MM:SS 또는 HH:MM:SS 형식으로 반환 */
  _formatElapsed() {
    if (!this._processStartTime) return '00:00'
    const currentPausedMs = this._pausedAt ? (Date.now() - this._pausedAt) : 0
    const sec = Math.floor((Date.now() - this._processStartTime - this._totalPausedMs - currentPausedMs) / 1000)
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const pad = n => String(n).padStart(2, '0')
    return h > 0
      ? `${pad(h)}:${pad(m)}:${pad(s)}`
      : `${pad(m)}:${pad(s)}`
  }

  /** SHIPMENT_ORDER_STATUS 공통코드 기반 상태 라벨 */
  _statusLabel(status) {
    if (!status) return '-'
    const opt = this.statusOptions.find(o => o.name === status)
    return opt ? (opt.description || opt.name) : status
  }

  /** 출고 준비 처리 결과 라벨 */
  _readyStatusLabel(status) {
    const map = {
      ALLOCATED: '✅ 준비완료',
      BACK_ORDER: '⚠ 백오더',
      ERROR: '❌ 오류',
    }
    return map[status] || status
  }
}

window.customElements.define('manual-wave-create-popup', ManualWaveCreatePopup)
