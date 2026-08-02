import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 재고 이동 조회 화면
 *
 * inventory_trans 기반 이동 이력 목록 조회.
 * 상단 KPI 5종, 중단 테이블, 하단 상세정보 + 이동 흐름 타임라인.
 *
 * API: GET /rest/inv_move_list/summary|list|timeline
 */
class InventoryMoveList extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-background, #f5f5f5);
          padding: 10px;
          box-sizing: border-box;
          overflow: hidden;
          gap: 8px;
        }

        /* ── 검색 필터 ── */
        .filter-section {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 8px;
          padding: 10px 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          flex-shrink: 0;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: flex-end;
        }

        .filter-row + .filter-row { margin-top: 8px; }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .filter-item label {
          font-size: 10px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #888);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .filter-item input,
        .filter-item select {
          height: 32px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 12px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #222);
          outline: none;
          min-width: 110px;
        }

        .filter-item input:focus,
        .filter-item select:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 날짜 범위 */
        .date-range-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .date-range-row input { width: 120px; }

        .date-sep {
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .quick-btns {
          display: flex;
          gap: 3px;
          margin-top: 3px;
        }

        .quick-btn {
          height: 22px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface-variant, #666);
          transition: all 0.2s;
        }

        .quick-btn:hover,
        .quick-btn.active {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 검색/초기화 버튼 */
        .filter-actions {
          display: flex;
          gap: 6px;
          align-items: flex-end;
          margin-left: auto;
        }

        .btn {
          height: 32px;
          padding: 0 14px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-primary { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .btn-primary:hover { background: #1565C0; }
        .btn-secondary {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }
        .btn-secondary:hover { background: #e0e0e0; }
        .btn-icon { width: 32px; height: 32px; padding: 0; font-size: 16px; display: flex; align-items: center; justify-content: center; }

        /* ── KPI 카드 ── */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          flex-shrink: 0;
        }

        .kpi-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 10px;
          padding: 12px 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .kpi-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .kpi-icon-wrap.total   { background: #E3F2FD; }
        .kpi-icon-wrap.in      { background: #E8F5E9; }
        .kpi-icon-wrap.out     { background: #FFF3E0; }
        .kpi-icon-wrap.loc     { background: #E0F2F1; }
        .kpi-icon-wrap.adj     { background: #ECEFF1; }

        .kpi-info { flex: 1; min-width: 0; }

        .kpi-label {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #888);
          font-weight: 500;
          white-space: nowrap;
        }

        .kpi-value {
          font-size: 20px;
          font-weight: 800;
          line-height: 1.2;
          white-space: nowrap;
        }

        .kpi-value.total { color: #1565C0; }
        .kpi-value.in    { color: #2E7D32; }
        .kpi-value.out   { color: #E65100; }
        .kpi-value.loc   { color: #00695C; }
        .kpi-value.adj   { color: #546E7A; }

        .kpi-value .unit {
          font-size: 12px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant, #aaa);
          margin-left: 2px;
        }

        .kpi-sub {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #aaa);
          margin-top: 1px;
        }

        /* ── 메인 영역 (테이블 + 하단 상세) ── */
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: row;
          min-height: 0;
          gap: 8px;
        }

        /* ── 결과 테이블 패널 ── */
        .result-panel {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          flex: 7;
          min-height: 0;
          min-width: 0;
          overflow: hidden;
        }

        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
          flex-shrink: 0;
        }

        .result-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #222);
        }

        .result-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .result-meta strong {
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 14px;
        }

        .page-size-select {
          height: 28px;
          padding: 0 6px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          font-size: 12px;
          background: var(--md-sys-color-surface, #fff);
        }

        .table-wrap {
          flex: 1;
          overflow: auto;
          min-height: 0;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .data-table thead {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .data-table th {
          padding: 8px 10px;
          text-align: center;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          font-size: 11px;
          white-space: nowrap;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          border-right: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .data-table th:last-child { border-right: none; }

        .data-table td {
          padding: 7px 10px;
          color: var(--md-sys-color-on-surface-variant, #555);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          border-right: 1px solid var(--md-sys-color-outline-variant, #f8f8f8);
          white-space: nowrap;
        }

        .data-table td:last-child { border-right: none; }

        .data-table tbody tr {
          cursor: pointer;
          transition: background 0.15s;
        }

        .data-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .data-table tbody tr.selected {
          background: #E3F2FD;
        }

        .td-right { text-align: right; font-variant-numeric: tabular-nums; }
        .td-center { text-align: center; }
        .td-nm { max-width: 160px; overflow: hidden; text-overflow: ellipsis; }

        /* 이동구분 뱃지 */
        .cat-badge {
          display: inline-block;
          padding: 1px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .cat-badge.입고       { background: #E8F5E9; color: #2E7D32; }
        .cat-badge.출고       { background: #FFEBEE; color: #C62828; }
        .cat-badge.로케이션이동 { background: #E3F2FD; color: #1565C0; }
        .cat-badge.재고조정    { background: #E0F2F1; color: #00695C; }
        .cat-badge.기타       { background: #F5F5F5; color: #757575; }

        /* 상태 뱃지 */
        .status-badge {
          display: inline-block;
          padding: 1px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          background: #E8F5E9;
          color: #2E7D32;
        }

        /* 페이지네이션 */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 14px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #eee);
          flex-shrink: 0;
        }

        .page-btn {
          min-width: 28px;
          height: 28px;
          padding: 0 6px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 12px;
          cursor: pointer;
          color: var(--md-sys-color-on-surface, #333);
          transition: all 0.2s;
        }

        .page-btn:hover:not(:disabled) { background: var(--md-sys-color-surface-variant, #f0f0f0); }
        .page-btn.active { background: var(--md-sys-color-primary, #1976D2); color: #fff; border-color: var(--md-sys-color-primary, #1976D2); font-weight: 600; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .page-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #888);
          padding: 0 6px;
        }

        /* 빈 상태 */
        .empty-msg {
          text-align: center;
          padding: 40px 20px;
          color: var(--md-sys-color-on-surface-variant, #aaa);
          font-size: 13px;
        }

        /* ── 우측 이동 흐름 패널 ── */
        .timeline-panel {
          flex: 3;
          background: var(--md-sys-color-surface, #fff);
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          padding: 10px 14px;
          overflow: auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .timeline-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
          flex-shrink: 0;
        }

        /* 이동 흐름 타임라인 */
        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .timeline-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 4px 0;
          position: relative;
        }

        .timeline-item:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 11px;
          top: 26px;
          bottom: 0;
          width: 2px;
          background: var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .timeline-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #43A047;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 12px;
          color: #fff;
          z-index: 1;
          position: relative;
        }

        .timeline-content { flex: 1; min-width: 0; }

        .timeline-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .timeline-loc {
          font-size: 11px;
          color: var(--md-sys-color-primary, #1976D2);
          margin-top: 1px;
          font-weight: 500;
        }

        .timeline-time {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #999);
          margin-top: 1px;
        }

        .tl-device {
          font-size: 10px;
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface-variant, #666);
          border-radius: 4px;
          padding: 0 5px;
          margin-left: 4px;
        }

        .timeline-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 80px;
          color: var(--md-sys-color-on-surface-variant, #bbb);
          font-size: 12px;
        }
      `
    ]
  }

  static get properties() {
    return {
      _summary: { type: Object },
      _items: { type: Array },
      _totalCount: { type: Number },
      _page: { type: Number },
      _limit: { type: Number },
      _loading: { type: Boolean },
      _selected: { type: Object },
      _timeline: { type: Array },
      _activeQuick: { type: String }
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
    this._selected = null
    this._timeline = []
    this._activeQuick = '1month'

    const today = this._todayStr()
    this._fromDate = this._daysAgoStr(29)
    this._toDate = today
  }

  get context() {
    return { title: TermsUtil.tMenu('InventoryMoveList', '재고 이동 조회') }
  }

  async pageUpdated(_changes, _lifecycle) {
    if (this.active) {
      await this._search()
    }
  }

  // ──────────────── 날짜 헬퍼 ────────────────

  _todayStr() { return new Date().toISOString().split('T')[0] }

  _daysAgoStr(n) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  }

  _setQuickDate(type) {
    const today = this._todayStr()
    this._activeQuick = type
    switch (type) {
      case 'today': this._fromDate = today; this._toDate = today; break
      case 'yesterday': { const y = this._daysAgoStr(1); this._fromDate = y; this._toDate = y; break }
      case '7days': this._fromDate = this._daysAgoStr(6); this._toDate = today; break
      case '1month': this._fromDate = this._daysAgoStr(29); this._toDate = today; break
    }
    this.shadowRoot.querySelector('#fromDate').value = this._fromDate
    this.shadowRoot.querySelector('#toDate').value = this._toDate
    this.requestUpdate()
  }

  // ──────────────── 검색 ────────────────

  _buildParams() {
    const p = {
      from_date: this.shadowRoot.querySelector('#fromDate').value,
      to_date: this.shadowRoot.querySelector('#toDate').value
    }
    const cat = this.shadowRoot.querySelector('#tranCategory').value
    if (cat) p.tran_category = cat
    const sku = this.shadowRoot.querySelector('#skuCd').value
    if (sku) p.sku_cd = sku
    const loc = this.shadowRoot.querySelector('#locCd').value
    if (loc) p.loc_cd = loc
    const wkr = this.shadowRoot.querySelector('#workerId').value
    if (wkr) p.worker_id = wkr
    const doc = this.shadowRoot.querySelector('#refDocNo').value
    if (doc) p.ref_doc_no = doc
    const lot = this.shadowRoot.querySelector('#lotNo').value
    if (lot) p.lot_no = lot
    return p
  }

  async _search() {
    this._page = 1
    this._selected = null
    this._timeline = []
    await Promise.all([this._fetchSummary(), this._fetchList()])
  }

  async _fetchSummary() {
    try {
      const res = await ServiceUtil.restGet('inv_move_list/summary', this._buildParams())
      this._summary = res || {}
    } catch (e) {
      this._summary = {}
    }
  }

  async _fetchList() {
    this._loading = true
    try {
      const params = { ...this._buildParams(), page: this._page, limit: this._limit }
      const res = await ServiceUtil.restGet('inv_move_list/list', params)
      this._items = res?.items || []
      this._totalCount = res?.total_count || 0
    } catch (e) {
      this._items = []
      this._totalCount = 0
    } finally {
      this._loading = false
    }
  }

  async _onRowClick(item) {
    this._selected = item
    this._timeline = []
    if (item.group_id) {
      try {
        const res = await ServiceUtil.restGet('inv_move_list/timeline', { group_id: item.group_id })
        this._timeline = res || []
      } catch (e) {
        this._timeline = []
      }
    }
    if (!this._timeline.length) {
      this._timeline = [{
        tran_type: item.tran_type,
        tran_at: item.tran_at,
        worker_nm: item.worker_nm,
        device_cd: item.device_cd,
        loc_cd: item.from_loc_cd,
        to_loc_cd: item.to_loc_cd
      }]
    }
  }

  _onReset() {
    const today = this._todayStr()
    this._fromDate = this._daysAgoStr(29)
    this._toDate = today
    this._activeQuick = '1month'
    this.shadowRoot.querySelector('#fromDate').value = this._fromDate
    this.shadowRoot.querySelector('#toDate').value = this._toDate
    this.shadowRoot.querySelector('#tranCategory').value = ''
    this.shadowRoot.querySelector('#skuCd').value = ''
    this.shadowRoot.querySelector('#locCd').value = ''
    this.shadowRoot.querySelector('#workerId').value = ''
    this.shadowRoot.querySelector('#refDocNo').value = ''
    this.shadowRoot.querySelector('#lotNo').value = ''
    this._summary = {}
    this._items = []
    this._totalCount = 0
    this._selected = null
    this._timeline = []
  }

  async _goPage(page) {
    const total = Math.ceil(this._totalCount / this._limit)
    if (page < 1 || page > total) return
    this._page = page
    await this._fetchList()
  }

  async _onLimitChange(e) {
    this._limit = Number(e.target.value)
    this._page = 1
    await this._fetchList()
  }

  // ──────────────── 포맷 헬퍼 ────────────────

  _fmt(v) {
    if (v === undefined || v === null) return '0'
    return Number(v).toLocaleString()
  }

  _tranTypeLabel(tranType) {
    const map = {
      IN: '입고', IN_INSP: '입고검수', IN_CANCEL: '입고취소', NEW: '신규입고',
      OUT: '출고', OUT_CANCEL: '출고취소',
      MOVE_IN: '위치이동(입)', MOVE_OUT: '위치이동(출)',
      SPLIT: '분할', SPLIT_NEW: '분할(신)', MERGE: '합병', MERGE_OUT: '합병(출)',
      ADJUST: '재고조정', SCRAP: '폐기', COUNT: '실사', HOLD: '보류', RELEASE_HOLD: '보류해제',
      ALLOCATE: '할당', DEALLOCATE: '할당해제', RWA_RESTOCK: '반품입고',
      VAS_IN: 'VAS입고', VAS_OUT: 'VAS출고'
    }
    return map[tranType] || tranType
  }

  _renderTimeline() {
    if (!this._selected) {
      return html`<div class="timeline-empty">행을 선택하면 이동 흐름이 표시됩니다.</div>`
    }
    if (!this._timeline.length) {
      return html`<div class="timeline-empty">이동 흐름 데이터가 없습니다.</div>`
    }
    return html`
      <div class="timeline-list">
        ${this._timeline.map(t => {
      const label = this._tranTypeLabel(t.tran_type)
      const loc = t.to_loc_cd ? `${t.loc_cd} → ${t.to_loc_cd}` : (t.loc_cd || '')
      return html`
            <div class="timeline-item">
              <div class="timeline-dot">✓</div>
              <div class="timeline-content">
                <div class="timeline-label">${label}${t.device_cd ? html` <span class="tl-device">${t.device_cd}</span>` : ''}</div>
                ${loc ? html`<div class="timeline-loc">${loc}</div>` : ''}
                <div class="timeline-time">${t.tran_at}${t.worker_nm ? ' · ' + t.worker_nm : ''}</div>
              </div>
            </div>
          `
    })}
      </div>
    `
  }

  _renderDetailPanel() {
    const d = this._selected
    if (!d) return html`<div class="detail-empty">행을 클릭하면 상세 정보가 표시됩니다.</div>`
    return html`
      <div class="detail-grid">
        <div class="detail-item"><span class="dl">이동일시</span><span class="dv">${d.tran_at || '-'}</span></div>
        <div class="detail-item"><span class="dl">상품코드</span><span class="dv">${d.sku_cd || '-'}</span></div>
        <div class="detail-item"><span class="dl">출발 로케이션</span><span class="dv">${d.from_loc_cd || '-'}</span></div>
        <div class="detail-item"><span class="dl">Lot 번호</span><span class="dv">${d.lot_no || '-'}</span></div>

        <div class="detail-item"><span class="dl">이동구분</span><span class="dv">${d.tran_category || '-'}</span></div>
        <div class="detail-item"><span class="dl">상품명</span><span class="dv">${d.sku_nm || '-'}</span></div>
        <div class="detail-item"><span class="dl">도착 로케이션</span><span class="dv">${d.to_loc_cd || '-'}</span></div>
        <div class="detail-item"><span class="dl">유통기한</span><span class="dv">${d.expired_date || '-'}</span></div>

        <div class="detail-item"><span class="dl">이동사유</span><span class="dv">${d.move_reason || '-'}</span></div>
        <div class="detail-item"><span class="dl">총 EA 수량</span><span class="dv">${this._fmt(d.ea_qty)} EA</span></div>
        <div class="detail-item"><span class="dl">PDA ID</span><span class="dv">${d.device_cd || '-'}</span></div>
        <div class="detail-item"><span class="dl">비고</span><span class="dv">${d.remarks || '-'}</span></div>

        <div class="detail-item"><span class="dl">문서번호</span><span class="dv">${d.ref_doc_no || '-'}</span></div>
        <div class="detail-item"><span class="dl">작업자 ID</span><span class="dv">${d.worker_id || '-'}</span></div>
        <div class="detail-item"><span class="dl">작업자명</span><span class="dv">${d.worker_nm || '-'}</span></div>
        <div class="detail-item"><span class="dl">상태</span><span class="dv">완료</span></div>
      </div>
    `
  }

  _renderPagination() {
    const totalPages = Math.max(1, Math.ceil(this._totalCount / this._limit))
    const cur = this._page
    const start = Math.max(1, cur - 2)
    const end = Math.min(totalPages, start + 4)
    const pages = []
    for (let i = start; i <= end; i++) pages.push(i)

    return html`
      <div class="pagination">
        <button class="page-btn" ?disabled=${cur === 1} @click=${() => this._goPage(1)}>«</button>
        <button class="page-btn" ?disabled=${cur === 1} @click=${() => this._goPage(cur - 1)}>‹</button>
        ${pages.map(p => html`
          <button class="page-btn ${p === cur ? 'active' : ''}" @click=${() => this._goPage(p)}>${p}</button>
        `)}
        <button class="page-btn" ?disabled=${cur === totalPages} @click=${() => this._goPage(cur + 1)}>›</button>
        <button class="page-btn" ?disabled=${cur === totalPages} @click=${() => this._goPage(totalPages)}>»</button>
        <span class="page-info">${cur} / ${totalPages} 페이지</span>
      </div>
    `
  }

  render() {
    const s = this._summary

    return html`
      <!-- ── 검색 필터 ── -->
      <div class="filter-section">
        <!-- 행 1 -->
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

          <!-- 이동구분 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('category', '이동구분')}</label>
            <select id="tranCategory">
              <option value="">전체</option>
              <option value="입고">입고</option>
              <option value="출고">출고</option>
              <option value="로케이션이동">로케이션이동</option>
              <option value="재고조정">재고조정</option>
            </select>
          </div>

          <!-- 상품코드/명 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('sku_cd', '상품코드/명')}</label>
            <input id="skuCd" type="text" placeholder="상품코드 또는 상품명" style="min-width:110px" />
          </div>

          <!-- 로케이션 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('loc_cd', '로케이션')}</label>
            <input id="locCd" type="text" placeholder="로케이션 코드" style="min-width:80px" />
          </div>

          <!-- 문서번호 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('ref_doc_no', '문서번호')}</label>
            <input id="refDocNo" type="text" placeholder="입고번호 또는 출고번호 입력" style="min-width:100px" />
          </div>

          <!-- 작업자 ID -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('worker_id', '작업자 ID')}</label>
            <input id="workerId" type="text" placeholder="작업자 ID 또는 이름 입력" style="min-width:70px" />
          </div>

          <!-- Lot 번호 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('lot_no', 'Lot 번호')}</label>
            <input id="lotNo" type="text" placeholder="Lot 번호 입력" style="min-width:70px" />
          </div>

          <!-- 버튼 -->
          <div class="filter-actions">
            <button class="btn btn-secondary btn-icon" title="초기화" @click=${this._onReset}>↺</button>
            <button class="btn btn-primary btn-icon" title="조회" @click=${this._search.bind(this)}>🔍</button>
          </div>
        </div>

        <!-- 기간 빠른 선택 -->
        <div class="quick-btns" style="margin-top:4px">
          <button class="quick-btn ${this._activeQuick === 'today' ? 'active' : ''}" @click=${() => this._setQuickDate('today')}>오늘</button>
          <button class="quick-btn ${this._activeQuick === 'yesterday' ? 'active' : ''}" @click=${() => this._setQuickDate('yesterday')}>어제</button>
          <button class="quick-btn ${this._activeQuick === '7days' ? 'active' : ''}" @click=${() => this._setQuickDate('7days')}>7일</button>
          <button class="quick-btn ${this._activeQuick === '1month' ? 'active' : ''}" @click=${() => this._setQuickDate('1month')}>1개월</button>
        </div>

      </div>

      <!-- ── KPI 카드 ── -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon-wrap total">⇄</div>
          <div class="kpi-info">
            <div class="kpi-label">총 이동 수량</div>
            <div class="kpi-value total">${this._fmt(s.total_ea_qty)}<span class="unit">EA</span></div>
            <div class="kpi-sub">건수 · ${this._fmt(s.total_count)}건</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap in">↓</div>
          <div class="kpi-info">
            <div class="kpi-label">입고 이동 수량</div>
            <div class="kpi-value in">${this._fmt(s.in_ea_qty)}<span class="unit">EA</span></div>
            <div class="kpi-sub">건수 · ${this._fmt(s.in_count)}건</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap out">↑</div>
          <div class="kpi-info">
            <div class="kpi-label">출고 이동 수량</div>
            <div class="kpi-value out">${this._fmt(s.out_ea_qty)}<span class="unit">EA</span></div>
            <div class="kpi-sub">건수 · ${this._fmt(s.out_count)}건</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap loc">⇌</div>
          <div class="kpi-info">
            <div class="kpi-label">로케이션 이동</div>
            <div class="kpi-value loc">${this._fmt(s.loc_move_ea_qty)}<span class="unit">EA</span></div>
            <div class="kpi-sub">건수 · ${this._fmt(s.loc_move_count)}건</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap adj">≡</div>
          <div class="kpi-info">
            <div class="kpi-label">재고조정</div>
            <div class="kpi-value adj">${this._fmt(s.adj_ea_qty)}<span class="unit">EA</span></div>
            <div class="kpi-sub">건수 · ${this._fmt(s.adj_count)}건</div>
          </div>
        </div>
      </div>

      <!-- ── 메인 영역 ── -->
      <div class="main-area">
        <!-- 결과 테이블 패널 -->
        <div class="result-panel">
          <div class="result-header">
            <span class="result-title">검색 결과</span>
            <div class="result-meta">
              <span>총 <strong>${this._totalCount.toLocaleString()}</strong>건</span>
              <select class="page-size-select" @change=${this._onLimitChange.bind(this)}>
                <option value="20">20개씩 보기</option>
                <option value="50" selected>50개씩 보기</option>
                <option value="100">100개씩 보기</option>
              </select>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>이동일시</th>
                  <th>이동구분</th>
                  <th>이동사유</th>
                  <th>상품코드</th>
                  <th>상품명</th>
                  <th>총 EA 수량</th>
                  <th>출발 로케이션</th>
                  <th>도착 로케이션</th>
                  <th>PDA ID</th>
                  <th>작업자 ID</th>
                  <th>작업자명</th>
                  <th>문서번호</th>
                  <th>Lot 번호</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                ${this._items.length === 0
        ? html`<tr><td colspan="15" class="empty-msg">조회된 데이터가 없습니다.</td></tr>`
        : this._items.map((item, idx) => html`
                    <tr class="${this._selected && this._selected.id === item.id ? 'selected' : ''}"
                        @click=${() => this._onRowClick(item)}>
                      <td class="td-center">${(this._page - 1) * this._limit + idx + 1}</td>
                      <td>${item.tran_at || ''}</td>
                      <td class="td-center">
                        <span class="cat-badge ${item.tran_category || '기타'}">${item.tran_category || item.tran_type}</span>
                      </td>
                      <td>${item.move_reason || '-'}</td>
                      <td>${item.sku_cd || ''}</td>
                      <td class="td-nm">${item.sku_nm || ''}</td>
                      <td class="td-right">${this._fmt(item.ea_qty)}</td>
                      <td class="td-center">${item.from_loc_cd || '-'}</td>
                      <td class="td-center">${item.to_loc_cd || '-'}</td>
                      <td class="td-center">${item.device_cd || '-'}</td>
                      <td class="td-center">${item.worker_id || '-'}</td>
                      <td>${item.worker_nm || '-'}</td>
                      <td>${item.ref_doc_no || '-'}</td>
                      <td>${item.lot_no || '-'}</td>
                      <td class="td-center"><span class="status-badge">완료</span></td>
                    </tr>
                  `)
      }
              </tbody>
            </table>
          </div>

          ${this._renderPagination()}
        </div>

        <!-- 우측 이동 흐름 -->
        <div class="timeline-panel">
          <div class="timeline-title">이동 흐름</div>
          ${this._renderTimeline()}
        </div>
      </div>
    `
  }
}

customElements.define('inventory-move-list', InventoryMoveList)
