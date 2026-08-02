import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 입출고 현황 화면
 *
 * 기간별 입출고 KPI 요약 및 상세 내역을 조회한다.
 * API: GET /rest/inout_status/summary, /rest/inout_status/list
 */
class InoutStatus extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--md-sys-color-background);
          padding: 10px;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* 검색 필터 영역 */
        .filter-section {
          background: var(--md-sys-color-surface);
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
          margin-bottom: 10px;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: flex-end;
        }

        .filter-row + .filter-row {
          margin-top: 6px;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 140px;
        }

        .filter-item.wide { min-width: 200px; }

        .filter-item label {
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-item input,
        .filter-item select {
          height: 36px;
          padding: 0 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 13px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
          outline: none;
        }

        .filter-item input:focus,
        .filter-item select:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 기간 날짜 입력 */
        .date-range-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .date-range-row input {
          height: 36px;
          padding: 0 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 13px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
          outline: none;
          width: 130px;
        }

        .date-sep {
          color: var(--md-sys-color-on-surface-variant);
          font-weight: 600;
          padding: 0 2px;
        }

        /* 기간 빠른 선택 버튼 */
        .quick-btns {
          display: flex;
          gap: 4px;
          margin-top: 4px;
        }

        .quick-btn {
          height: 26px;
          padding: 0 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface-variant);
          transition: all 0.2s;
        }

        .quick-btn:hover {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 액션 버튼 */
        .filter-actions {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          margin-left: auto;
        }

        .btn {
          height: 36px;
          padding: 0 18px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-primary:hover { background: #1565C0; }

        .btn-secondary {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }

        .btn-secondary:hover { background: #e0e0e0; }
        .btn-icon { width: 32px; height: 32px; padding: 0; font-size: 16px; display: flex; align-items: center; justify-content: center; }

        .btn-outline {
          background: transparent;
          color: var(--md-sys-color-primary, #1976D2);
          border: 1px solid var(--md-sys-color-primary, #1976D2);
        }

        .btn-outline:hover { background: rgba(25, 118, 210, 0.08); }

        /* KPI 카드 */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 10px;
        }

        .kpi-card {
          background: var(--md-sys-color-surface);
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .kpi-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
          font-weight: 500;
        }

        .kpi-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
        }

        .kpi-value .unit {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          margin-left: 4px;
        }

        .kpi-trend {
          font-size: 12px;
          font-weight: 600;
        }

        .kpi-trend.up { color: #F44336; }
        .kpi-trend.down { color: #2196F3; }
        .kpi-trend.neutral { color: var(--md-sys-color-on-surface-variant); }

        .kpi-card.in .kpi-value { color: #1565C0; }
        .kpi-card.out .kpi-value { color: #E65100; }
        .kpi-card.return .kpi-value { color: #6A1B9A; }
        .kpi-card.change .kpi-value { color: #2E7D32; }
        .kpi-card.count .kpi-value { color: #37474F; }

        /* 결과 테이블 영역 */
        .result-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .result-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .result-count {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .result-count strong {
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 16px;
        }

        .page-size-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .page-size-wrap label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .page-size-wrap select {
          height: 30px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 12px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
        }

        /* 테이블 */
        .table-wrap {
          overflow: auto;
          flex: 1;
          min-height: 0;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .data-table thead {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .data-table th {
          padding: 11px 12px;
          text-align: center;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          font-size: 12px;
          white-space: nowrap;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          border-right: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .data-table th:last-child { border-right: none; }

        .data-table td {
          padding: 9px 12px;
          color: var(--md-sys-color-on-surface-variant);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          border-right: 1px solid var(--md-sys-color-outline-variant, #f5f5f5);
          white-space: nowrap;
        }

        .data-table td:last-child { border-right: none; }

        .data-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant, #fafafa);
        }

        .data-table td.center,
        .data-table th.left { text-align: left; }
        .data-table td.left { text-align: left; }
        .data-table td.right { text-align: right; font-variant-numeric: tabular-nums; }

        .td-nm {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 구분 뱃지 */
        .cat-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .cat-badge.입고 { background: #E3F2FD; color: #1565C0; }
        .cat-badge.출고 { background: #FFF3E0; color: #E65100; }
        .cat-badge.반품 { background: #F3E5F5; color: #6A1B9A; }
        .cat-badge.기타 { background: #F5F5F5; color: #757575; }

        /* 상태 뱃지 */
        .status-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background: #E8F5E9;
          color: #2E7D32;
        }

        .status-badge.empty {
          background: transparent;
          color: var(--md-sys-color-on-surface-variant);
        }

        /* 숫자 강조 */
        .qty-in { color: #1565C0; font-weight: 600; }
        .qty-out { color: #E65100; font-weight: 600; }
        .qty-return { color: #6A1B9A; font-weight: 600; }
        .qty-zero { color: #ccc; }

        /* 페이지네이션 */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 16px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .page-btn {
          min-width: 34px;
          height: 34px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface);
          font-size: 13px;
          cursor: pointer;
          color: var(--md-sys-color-on-surface);
          transition: all 0.2s;
        }

        .page-btn:hover:not(:disabled) {
          background: var(--md-sys-color-surface-variant);
        }

        .page-btn.active {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border-color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          padding: 0 8px;
        }

        /* 빈 상태 */
        .empty-msg {
          text-align: center;
          padding: 60px 20px;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
        }
      `
    ]
  }

  /** 페이지 속성 정의 */
  static get properties() {
    return {
      _summary: { type: Object },
      _items: { type: Array },
      _totalCount: { type: Number },
      _page: { type: Number },
      _limit: { type: Number },
      _loading: { type: Boolean },
      _customers: { type: Array }
    }
  }

  constructor() {
    super()
    this._summary = {}
    this._items = []
    this._totalCount = 0
    this._page = 1
    this._limit = 50
    this._loading = false
    this._customers = []

    const today = this._todayStr()
    this._fromDate = today
    this._toDate = today
  }

  /** 페이지 컨텍스트 (타이틀) */
  get context() {
    return { title: TermsUtil.tLabel('inout_status', '입출고 현황') }
  }

  /** 페이지 활성화 시 거래처 목록 로드 */
  async pageUpdated(_changes, _lifecycle) {
    if (this.active && this._customers.length === 0) {
      await this._fetchCustomers()
    }
  }

  /** 거래처 목록 조회 */
  async _fetchCustomers() {
    try {
      const data = await ServiceUtil.searchByPagination('customers', [], null, 1, 500)
      this._customers = data?.items || []
    } catch (e) {
      this._customers = []
    }
  }

  /** 오늘 날짜 문자열 */
  _todayStr() {
    return new Date().toISOString().split('T')[0]
  }

  /** N일 전 날짜 문자열 */
  _daysAgoStr(n) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  }

  /** 기간 빠른 선택 */
  _setQuickDate(type) {
    const today = this._todayStr()
    switch (type) {
      case 'today':
        this._fromDate = today; this._toDate = today; break
      case 'yesterday': {
        const y = this._daysAgoStr(1)
        this._fromDate = y; this._toDate = y; break
      }
      case '7days':
        this._fromDate = this._daysAgoStr(6); this._toDate = today; break
      case '1month':
        this._fromDate = this._daysAgoStr(29); this._toDate = today; break
    }
    this.shadowRoot.querySelector('#fromDate').value = this._fromDate
    this.shadowRoot.querySelector('#toDate').value = this._toDate
  }

  /** 조회 */
  async _onSearch() {
    this._page = 1
    await Promise.all([this._fetchSummary(), this._fetchList()])
  }

  /** 초기화 */
  _onReset() {
    const today = this._todayStr()
    this._fromDate = today
    this._toDate = today
    this.shadowRoot.querySelector('#fromDate').value = today
    this.shadowRoot.querySelector('#toDate').value = today
    this.shadowRoot.querySelector('#category').value = ''
    this.shadowRoot.querySelector('#custCd').value = ''
    this.shadowRoot.querySelector('#tranType').value = ''
    this.shadowRoot.querySelector('#skuCd').value = ''
    this._summary = {}
    this._items = []
    this._totalCount = 0
  }

  /** KPI 요약 조회 */
  async _fetchSummary() {
    const params = this._buildParams()
    try {
      const res = await ServiceUtil.restGet('inout_status/summary', params)
      this._summary = res || {}
    } catch (e) {
      console.error('inout_status/summary 조회 실패', e)
      this._summary = {}
    }
  }

  /** 상세 목록 조회 */
  async _fetchList() {
    this._loading = true
    const params = { ...this._buildParams(), page: this._page, limit: this._limit }
    try {
      const res = await ServiceUtil.restGet('inout_status/list', params)
      this._items = (res && res.items) || []
      this._totalCount = (res && res.total_count) || 0
    } catch (e) {
      console.error('inout_status/list 조회 실패', e)
      this._items = []
      this._totalCount = 0
    } finally {
      this._loading = false
    }
  }

  /** 검색 파라미터 빌드 */
  _buildParams() {
    const p = {
      from_date: this.shadowRoot.querySelector('#fromDate').value,
      to_date: this.shadowRoot.querySelector('#toDate').value
    }
    const cat = this.shadowRoot.querySelector('#category').value
    if (cat) p.category = cat
    const cust = this.shadowRoot.querySelector('#custCd').value
    if (cust) p.cust_cd = cust
    const tt = this.shadowRoot.querySelector('#tranType').value
    if (tt) p.tran_type = tt
    const sku = this.shadowRoot.querySelector('#skuCd').value
    if (sku) p.sku_cd = sku
    return p
  }

  /** 페이지 이동 */
  async _goPage(page) {
    const totalPages = Math.ceil(this._totalCount / this._limit)
    if (page < 1 || page > totalPages) return
    this._page = page
    await this._fetchList()
  }

  /** 페이지 크기 변경 */
  async _onLimitChange(e) {
    this._limit = Number(e.target.value)
    this._page = 1
    await this._fetchList()
  }

  /** 엑셀 다운로드 (미구현, UI 표시 목적) */
  _onExcelDownload() {
    alert('엑셀 다운로드는 준비 중입니다.')
  }

  /** 증감률 표시 */
  _renderTrend(rate) {
    if (rate === undefined || rate === null || rate === 0) {
      return html`<span class="kpi-trend neutral">-</span>`
    }
    const up = rate > 0
    const cls = up ? 'up' : 'down'
    const arrow = up ? '↑' : '↓'
    return html`<span class="kpi-trend ${cls}">${up ? '+' : ''}${rate}% ${arrow}</span>`
  }

  /** KPI 값 포맷 */
  _fmt(val) {
    if (val === undefined || val === null) return '0'
    return Number(val).toLocaleString()
  }

  /** 구분 뱃지 */
  _renderCatBadge(cat) {
    return html`<span class="cat-badge ${cat}">${cat}</span>`
  }

  /** 상태 뱃지 */
  _renderStatusBadge(status) {
    if (!status) return html`<span class="status-badge empty">-</span>`
    return html`<span class="status-badge">${status}</span>`
  }

  /** 수량 셀 렌더링 */
  _renderQty(qty, cls) {
    if (!qty || qty === 0) return html`<span class="qty-zero">-</span>`
    return html`<span class="${cls}">${Number(qty).toLocaleString()}</span>`
  }

  /** 페이지 버튼 렌더링 */
  _renderPagination() {
    const total = this._totalCount
    const limit = this._limit
    const current = this._page
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const pages = []
    const start = Math.max(1, current - 2)
    const end = Math.min(totalPages, start + 4)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return html`
      <div class="pagination">
        <button class="page-btn" ?disabled=${current === 1} @click=${() => this._goPage(1)}>«</button>
        <button class="page-btn" ?disabled=${current === 1} @click=${() => this._goPage(current - 1)}>‹</button>
        ${pages.map(p => html`
          <button class="page-btn ${p === current ? 'active' : ''}" @click=${() => this._goPage(p)}>${p}</button>
        `)}
        <button class="page-btn" ?disabled=${current === totalPages} @click=${() => this._goPage(current + 1)}>›</button>
        <button class="page-btn" ?disabled=${current === totalPages} @click=${() => this._goPage(totalPages)}>»</button>
        <span class="page-info">${current} / ${totalPages} 페이지</span>
      </div>
    `
  }

  render() {
    const s = this._summary

    return html`
      <!-- 검색 필터 -->
      <div class="filter-section">
        <div class="filter-row">
          <!-- 기간 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('period', '기간')}</label>
            <div class="date-range-row">
              <input id="fromDate" type="date" .value=${this._fromDate}
                @change=${e => { this._fromDate = e.target.value }} />
              <span class="date-sep">~</span>
              <input id="toDate" type="date" .value=${this._toDate}
                @change=${e => { this._toDate = e.target.value }} />
            </div>
          </div>

          <!-- 구분 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('category', '구분')}</label>
            <select id="category">
              <option value="">전체</option>
              <option value="입고">입고</option>
              <option value="출고">출고</option>
              <option value="반품">반품</option>
            </select>
          </div>

          <!-- 거래처 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('cust_cd', '거래처')}</label>
            <select id="custCd">
              <option value="">전체</option>
              ${this._customers.map(c => html`
                <option value="${c.cust_cd}">${c.cust_nm || c.cust_cd}</option>
              `)}
            </select>
          </div>

          <!-- 입출고 구분 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('tran_type', '입출고 구분')}</label>
            <select id="tranType">
              <option value="">전체</option>
              <option value="IN">IN (입고)</option>
              <option value="IN_INSP">IN_INSP (검사입고)</option>
              <option value="OUT">OUT (출고)</option>
              <option value="OUT_CANCEL">OUT_CANCEL (출고취소)</option>
              <option value="RWA_RESTOCK">RWA_RESTOCK (반품입고)</option>
              <option value="ADJUST">ADJUST (조정)</option>
              <option value="COUNT">COUNT (실사)</option>
            </select>
          </div>

          <!-- 상품코드 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('sku_cd', '상품코드')}</label>
            <input id="skuCd" type="text" placeholder="상품코드 입력" />
          </div>

          <!-- 버튼 -->
          <div class="filter-actions">
            <button class="btn btn-primary btn-icon" title="조회" @click=${this._onSearch}>🔍</button>
            <button class="btn btn-secondary btn-icon" title="초기화" @click=${this._onReset}>↺</button>
            <button class="btn btn-outline btn-icon" title="엑셀 다운로드" @click=${this._onExcelDownload}>⬇</button>
          </div>
        </div>
        <!-- 기간 빠른 선택 버튼 -->
        <div class="quick-btns">
          <button class="quick-btn" @click=${() => this._setQuickDate('today')}>오늘</button>
          <button class="quick-btn" @click=${() => this._setQuickDate('yesterday')}>어제</button>
          <button class="quick-btn" @click=${() => this._setQuickDate('7days')}>7일</button>
          <button class="quick-btn" @click=${() => this._setQuickDate('1month')}>1개월</button>
        </div>
      </div>

      <!-- KPI 카드 -->
      <div class="kpi-row">
        <div class="kpi-card in">
          <div class="kpi-label">${TermsUtil.tLabel('in_qty', '총 입고수량')}</div>
          <div class="kpi-value">
            ${this._fmt(s.total_in_qty)}
            <span class="unit">EA</span>
          </div>
          ${this._renderTrend(s.in_qty_rate)}
        </div>

        <div class="kpi-card out">
          <div class="kpi-label">${TermsUtil.tLabel('out_qty', '총 출고수량')}</div>
          <div class="kpi-value">
            ${this._fmt(s.total_out_qty)}
            <span class="unit">EA</span>
          </div>
          ${this._renderTrend(s.out_qty_rate)}
        </div>

        <div class="kpi-card return">
          <div class="kpi-label">${TermsUtil.tLabel('return_qty', '총 반품수량')}</div>
          <div class="kpi-value">
            ${this._fmt(s.total_return_qty)}
            <span class="unit">EA</span>
          </div>
          ${this._renderTrend(s.return_qty_rate)}
        </div>

        <div class="kpi-card change">
          <div class="kpi-label">${TermsUtil.tLabel('stock_change_qty', '총 재고변동수량')}</div>
          <div class="kpi-value">
            ${this._fmt(s.total_stock_change)}
            <span class="unit">EA</span>
          </div>
          ${this._renderTrend(s.stock_change_rate)}
        </div>

        <div class="kpi-card count">
          <div class="kpi-label">${TermsUtil.tLabel('inout_count', '입출고 건수')}</div>
          <div class="kpi-value">
            ${this._fmt(s.total_count)}
            <span class="unit">건</span>
          </div>
          ${this._renderTrend(s.count_rate)}
        </div>
      </div>

      <!-- 상세 테이블 -->
      <div class="result-section">
        <div class="result-header">
          <span class="result-title">
            ${TermsUtil.tLabel('inout_status', '입출고 상세 내역')}
          </span>
          <div style="display:flex; align-items:center; gap:16px;">
            <span class="result-count">
              총 <strong>${this._totalCount.toLocaleString()}</strong>건
            </span>
            <div class="page-size-wrap">
              <label>페이지 크기</label>
              <select @change=${this._onLimitChange}>
                <option value="20">20건</option>
                <option value="50" selected>50건</option>
                <option value="100">100건</option>
              </select>
            </div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${TermsUtil.tLabel('tran_date', '일자')}</th>
                <th>${TermsUtil.tLabel('category', '구분')}</th>
                <th>${TermsUtil.tLabel('tran_type', '입출고구분')}</th>
                <th>${TermsUtil.tLabel('cust_cd', '거래처코드')}</th>
                <th class="left">${TermsUtil.tLabel('cust_nm', '거래처명')}</th>
                <th>${TermsUtil.tLabel('sku_cd', '상품코드')}</th>
                <th class="left">${TermsUtil.tLabel('sku_nm', '상품명')}</th>
                <th>${TermsUtil.tLabel('in_qty', '입고수량')}</th>
                <th>${TermsUtil.tLabel('out_qty', '출고수량')}</th>
                <th>${TermsUtil.tLabel('rwa_qty', '반품수량')}</th>
                <th>${TermsUtil.tLabel('stock_change_qty', '재고변동수량')}</th>
                <th>${TermsUtil.tLabel('ref_order_no', '참조 주문번호')}</th>
                <th>${TermsUtil.tLabel('status', '상태')}</th>
                <th class="left">${TermsUtil.tLabel('remarks', '비고')}</th>
              </tr>
            </thead>
            <tbody>
              ${this._items.length === 0
        ? html`
                  <tr>
                    <td colspan="17" class="empty-msg">
                      ${this._loading ? '조회 중...' : '조회된 데이터가 없습니다.'}
                    </td>
                  </tr>`
        : this._items.map((row, idx) => {
          const no = (this._page - 1) * this._limit + idx + 1
          return html`
                    <tr>
                      <td class="center">${no}</td>
                      <td class="center">${row.tran_date || '-'}</td>
                      <td class="center">${this._renderCatBadge(row.category || '기타')}</td>
                      <td class="center" style="font-size:11px;">${row.tran_type || '-'}</td>
                      <td class="center">${row.cust_cd || '-'}</td>
                      <td class="left td-nm">${row.cust_nm || '-'}</td>
                      <td class="center">${row.sku_cd || '-'}</td>
                      <td class="left td-nm">${row.sku_nm || '-'}</td>
                      <td class="right">${this._renderQty(row.in_qty, 'qty-in')}</td>
                      <td class="right">${this._renderQty(row.out_qty, 'qty-out')}</td>
                      <td class="right">${this._renderQty(row.rwa_qty, 'qty-return')}</td>
                      <td class="right">${row.tran_qty != null ? Number(row.tran_qty).toLocaleString() : '-'}</td>
                      <td class="center">${row.ref_order_no || '-'}</td>
                      <td class="center">${this._renderStatusBadge(row.doc_status)}</td>
                      <td class="left">${row.remarks || '-'}</td>
                    </tr>
                  `
        })
      }
            </tbody>
          </table>
        </div>

        ${this._totalCount > 0 ? this._renderPagination() : ''}
      </div>
    `
  }
}

customElements.define('inout-status', InoutStatus)
