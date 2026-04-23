import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 수불 현황 화면 (W23-SF-2)
 *
 * 기능:
 * - 기간·화주사·창고·SKU·거래유형 조건으로 수불 이력 조회
 * - 결과를 테이블로 표시 (페이지네이션)
 * - API: GET /rest/inventory_hists/transactions
 */
class InventoryTransactionList extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background);
          padding: var(--padding-wide);
          overflow: auto;
        }

        /* 페이지 헤더 */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .page-header h2 {
          margin: 0;
          font: var(--title-font);
          color: var(--title-text-color);
        }

        /* 검색 필터 영역 */
        .filter-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: 20px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.08));
          margin-bottom: 20px;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 160px;
        }

        .filter-item.date-range {
          flex-direction: row;
          align-items: flex-end;
          gap: 8px;
          min-width: auto;
        }

        .filter-item.date-range .filter-item {
          min-width: 140px;
        }

        .filter-item label {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
        }

        .filter-item label span.required {
          color: #F44336;
          margin-left: 2px;
        }

        .filter-item input,
        .filter-item select {
          height: 38px;
          padding: 0 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 14px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
          outline: none;
          transition: border-color 0.2s;
        }

        .filter-item input:focus,
        .filter-item select:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .date-sep {
          padding-bottom: 8px;
          color: var(--md-sys-color-on-surface-variant);
          font-weight: 600;
        }

        .filter-actions {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          margin-left: auto;
        }

        .btn {
          height: 38px;
          padding: 0 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-primary:hover {
          background: #1565C0;
        }

        .btn-secondary {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }

        .btn-secondary:hover {
          background: var(--md-sys-color-outline-variant, #e0e0e0);
        }

        /* 결과 영역 */
        .result-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.08));
          overflow: hidden;
        }

        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .result-count {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .result-count strong {
          color: var(--md-sys-color-on-surface);
          font-size: 16px;
        }

        /* 테이블 */
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
          padding: 12px 12px;
          text-align: left;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          font-size: 12px;
          white-space: nowrap;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .data-table th.center,
        .data-table td.center {
          text-align: center;
        }

        .data-table th.right,
        .data-table td.right {
          text-align: right;
        }

        .data-table td {
          padding: 10px 12px;
          color: var(--md-sys-color-on-surface-variant, #555);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          white-space: nowrap;
        }

        .data-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant, #fafafa);
        }

        .data-table td.sku-nm {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 거래유형 뱃지 */
        .tran-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .tran-badge.IN {
          background: #E3F2FD;
          color: #1565C0;
        }

        .tran-badge.IN-INSP {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .tran-badge.OUT {
          background: #FFF3E0;
          color: #E65100;
        }

        .tran-badge.OUT_CANCEL {
          background: #FFEBEE;
          color: #C62828;
        }

        .tran-badge.RESERVE {
          background: #F3E5F5;
          color: #6A1B9A;
        }

        .tran-badge.MERGE {
          background: #E0F7FA;
          color: #006064;
        }

        .tran-badge.ADJUST {
          background: #FFF8E1;
          color: #F57F17;
        }

        .tran-badge.default {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* 페이지네이션 */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .page-btn {
          min-width: 36px;
          height: 36px;
          padding: 0 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--md-sys-color-on-surface);
        }

        .page-btn:hover:not(:disabled) {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          min-width: 120px;
          text-align: center;
        }

        /* 빈 상태 / 로딩 */
        .empty-state,
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 12px;
        }

        .empty-state .icon,
        .loading-state .icon {
          font-size: 48px;
        }

        .empty-state p,
        .loading-state p {
          margin: 0;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 15px;
        }

        .empty-state .sub,
        .loading-state .sub {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          opacity: 0.7;
        }

        /* 반응형 */
        @media screen and (max-width: 1024px) {
          .filter-row {
            flex-direction: column;
          }

          .filter-item.date-range {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-actions {
            margin-left: 0;
            flex-direction: row;
          }
        }
      `
    ]
  }

  /** 반응형 속성 */
  static get properties() {
    return {
      loading: Boolean,
      searched: Boolean,
      items: Array,
      totalCount: Number,
      page: Number,
      limit: Number,
      fromDate: String,
      toDate: String,
      comCd: String,
      whCd: String,
      skuCd: String,
      tranCd: String
    }
  }

  /** 거래유형 목록 */
  static get TRAN_TYPES() {
    return [
      { code: '', label: '전체' },
      { code: 'IN', label: '입고 (IN)' },
      { code: 'IN-INSP', label: '입고검수 (IN-INSP)' },
      { code: 'OUT', label: '출고 (OUT)' },
      { code: 'OUT_CANCEL', label: '출고취소 (OUT_CANCEL)' },
      { code: 'MOVE', label: '이동 (MOVE)' },
      { code: 'RESERVE', label: '할당 (RESERVE)' },
      { code: 'SPLIT', label: '분할 (SPLIT)' },
      { code: 'MERGE', label: '병합 (MERGE)' },
      { code: 'HOLD', label: '잠금 (HOLD)' },
      { code: 'RELEASE_HOLD', label: '잠금해제 (RELEASE_HOLD)' },
      { code: 'ADJUST', label: '재고조정 (ADJUST)' },
      { code: 'SCRAP', label: '불량 (SCRAP)' },
      { code: 'NEW', label: '임의 생성 (NEW)' }
    ]
  }

  /** 생성자 - 오늘 기준 30일 기간 기본값 설정 */
  constructor() {
    super()
    this.loading = false
    this.searched = false
    this.items = []
    this.totalCount = 0
    this.page = 1
    this.limit = 50
    this.comCd = ''
    this.whCd = ''
    this.skuCd = ''
    this.tranCd = ''

    const today = new Date()
    this.toDate = this._formatDate(today)
    const from = new Date(today)
    from.setDate(from.getDate() - 30)
    this.fromDate = this._formatDate(from)
  }

  /** 페이지 타이틀 */
  get context() {
    return {
      title: TermsUtil.tMenu('InventoryLedger')
    }
  }

  /** 렌더링 */
  render() {
    return html`
      <div class="page-header">
        <h2>수불 현황</h2>
      </div>

      ${this._renderFilterSection()}
      ${this._renderResultSection()}
    `
  }

  /** 검색 필터 영역 렌더링 */
  _renderFilterSection() {
    return html`
      <div class="filter-section">
        <div class="filter-row">
          <!-- 기간 -->
          <div class="filter-item date-range">
            <div class="filter-item">
              <label>${TermsUtil.tLabel('from_date')}<span class="required">*</span></label>
              <input
                type="date"
                .value="${this.fromDate}"
                @change="${e => { this.fromDate = e.target.value }}"
              />
            </div>
            <span class="date-sep">~</span>
            <div class="filter-item">
              <label>${TermsUtil.tLabel('to_date')}<span class="required">*</span></label>
              <input
                type="date"
                .value="${this.toDate}"
                @change="${e => { this.toDate = e.target.value }}"
              />
            </div>
          </div>

          <!-- 화주사 코드 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('com_cd')}</label>
            <input
              type="text"
              placeholder="화주사 코드"
              .value="${this.comCd}"
              @input="${e => { this.comCd = e.target.value }}"
              @keydown="${this._onKeydown}"
            />
          </div>

          <!-- 창고 코드 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('wh_cd')}</label>
            <input
              type="text"
              placeholder="창고 코드"
              .value="${this.whCd}"
              @input="${e => { this.whCd = e.target.value }}"
              @keydown="${this._onKeydown}"
            />
          </div>

          <!-- SKU 코드 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('sku_cd')}</label>
            <input
              type="text"
              placeholder="SKU 코드"
              .value="${this.skuCd}"
              @input="${e => { this.skuCd = e.target.value }}"
              @keydown="${this._onKeydown}"
            />
          </div>

          <!-- 거래유형 -->
          <div class="filter-item">
            <label>${TermsUtil.tLabel('transaction_type')}</label>
            <select
              .value="${this.tranCd}"
              @change="${e => { this.tranCd = e.target.value }}"
            >
              ${InventoryTransactionList.TRAN_TYPES.map(
      t => html`<option value="${t.code}" ?selected="${this.tranCd === t.code}">${t.label}</option>`
    )}
            </select>
          </div>

          <!-- 버튼 -->
          <div class="filter-actions">
            <button class="btn btn-primary" @click="${this._search}">조회</button>
            <button class="btn btn-secondary" @click="${this._reset}">초기화</button>
          </div>
        </div>
      </div>
    `
  }

  /** 결과 테이블 영역 렌더링 */
  _renderResultSection() {
    if (!this.searched && !this.loading) {
      return html`
        <div class="result-section">
          <div class="empty-state">
            <span class="icon">🔍</span>
            <p>조회 조건을 입력하고 조회 버튼을 클릭하세요</p>
            <p class="sub">기간은 필수 입력 항목입니다</p>
          </div>
        </div>
      `
    }

    if (this.loading) {
      return html`
        <div class="result-section">
          <div class="loading-state">
            <span class="icon">⏳</span>
            <p>데이터 조회 중...</p>
          </div>
        </div>
      `
    }

    const totalPages = Math.ceil(this.totalCount / this.limit) || 1

    return html`
      <div class="result-section">
        <div class="result-header">
          <span class="result-count">
            총 <strong>${this.totalCount.toLocaleString()}</strong>건
          </span>
          <span class="result-count">
            ${this.limit}건 / 페이지
          </span>
        </div>

        ${this.items.length === 0
        ? html`
              <div class="empty-state">
                <span class="icon">📭</span>
                <p>조회된 데이터가 없습니다</p>
                <p class="sub">조건을 변경하여 다시 조회하세요</p>
              </div>
            `
        : html`
              <div style="overflow-x: auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>거래일시</th>
                      <th class="center">거래유형</th>
                      <th>창고</th>
                      <th>화주사</th>
                      <th>SKU 코드</th>
                      <th>SKU 명</th>
                      <th>로케이션</th>
                      <th>바코드</th>
                      <th class="right">재고 수량</th>
                      <th>입고 번호</th>
                      <th>출고 주문 번호</th>
                      <th>LOT 번호</th>
                      <th>시리얼 번호</th>
                      <th>유효기한</th>
                      <th>제조일자</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.items.map(item => this._renderRow(item))}
                  </tbody>
                </table>
              </div>
              ${this._renderPagination(totalPages)}
            `}
      </div>
    `
  }

  /** 테이블 행 렌더링 */
  _renderRow(item) {
    const tranCd = item.last_tran_cd || ''
    const tranLabel = this._tranLabel(tranCd)
    const badgeClass = this._tranBadgeClass(tranCd)

    return html`
      <tr>
        <td>${item.created_at ? this._formatDateTime(item.created_at) : '-'}</td>
        <td class="center">
          <span class="tran-badge ${badgeClass}">${tranLabel}</span>
        </td>
        <td>${item.wh_cd || '-'}</td>
        <td>${item.com_cd || '-'}</td>
        <td>${item.sku_cd || '-'}</td>
        <td class="sku-nm" title="${item.sku_nm || ''}">${item.sku_nm || '-'}</td>
        <td>${item.loc_cd || '-'}</td>
        <td>${item.barcode || '-'}</td>
        <td class="right">${item.inv_qty != null ? Number(item.inv_qty).toLocaleString() : '-'}</td>
        <td>${item.rcv_no || '-'}</td>
        <td>${item.rls_ord_no || '-'}</td>
        <td>${item.lot_no || '-'}</td>
        <td>${item.serial_no || '-'}</td>
        <td>${item.expired_date || '-'}</td>
        <td>${item.prod_date || '-'}</td>
      </tr>
    `
  }

  /** 페이지네이션 렌더링 */
  _renderPagination(totalPages) {
    return html`
      <div class="pagination">
        <button
          class="page-btn"
          ?disabled="${this.page <= 1}"
          @click="${() => this._goPage(1)}"
        >«</button>
        <button
          class="page-btn"
          ?disabled="${this.page <= 1}"
          @click="${() => this._goPage(this.page - 1)}"
        >‹</button>

        <span class="page-info">${this.page} / ${totalPages} 페이지</span>

        <button
          class="page-btn"
          ?disabled="${this.page >= totalPages}"
          @click="${() => this._goPage(this.page + 1)}"
        >›</button>
        <button
          class="page-btn"
          ?disabled="${this.page >= totalPages}"
          @click="${() => this._goPage(totalPages)}"
        >»</button>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  /** 페이지 활성화 시 자동 조회하지 않음 (사용자가 직접 조회) */
  async pageUpdated(changes, lifecycle, before) {
    // 조회 조건은 유지, 자동 재조회 없음
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 조회 실행 */
  async _search() {
    if (!this.fromDate || !this.toDate) {
      alert('조회 기간(시작일, 종료일)을 입력하세요.')
      return
    }

    this.page = 1
    await this._fetchData()
  }

  /** 페이지 이동 */
  async _goPage(p) {
    this.page = p
    await this._fetchData()
  }

  /** API 호출 */
  async _fetchData() {
    try {
      this.loading = true
      this.searched = true

      const params = new URLSearchParams({
        from_date: this.fromDate,
        to_date: this.toDate,
        page: String(this.page),
        limit: String(this.limit)
      })

      if (this.comCd) params.set('com_cd', this.comCd)
      if (this.whCd) params.set('wh_cd', this.whCd)
      if (this.skuCd) params.set('sku_cd', this.skuCd)
      if (this.tranCd) params.set('tran_cd', this.tranCd)

      const data = await ServiceUtil.restGet(`inventory_hists/transactions?${params.toString()}`)

      this.items = data?.items || []
      this.totalCount = data?.total_count || 0
    } catch (err) {
      console.error('수불 현황 조회 실패:', err)
      this.items = []
      this.totalCount = 0
    } finally {
      this.loading = false
    }
  }

  /* ============================================================
   * 이벤트 핸들러
   * ============================================================ */

  /** Enter 키로 조회 */
  _onKeydown(e) {
    if (e.key === 'Enter') {
      this._search()
    }
  }

  /** 필터 초기화 */
  _reset() {
    const today = new Date()
    this.toDate = this._formatDate(today)
    const from = new Date(today)
    from.setDate(from.getDate() - 30)
    this.fromDate = this._formatDate(from)
    this.comCd = ''
    this.whCd = ''
    this.skuCd = ''
    this.tranCd = ''
    this.searched = false
    this.items = []
    this.totalCount = 0
    this.page = 1
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** 날짜를 yyyy-MM-dd 포맷으로 변환 */
  _formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /** ISO 날짜문자열을 yyyy-MM-dd HH:mm 포맷으로 변환 */
  _formatDateTime(dateStr) {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      const y = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${mo}-${day} ${h}:${min}`
    } catch {
      return dateStr
    }
  }

  /** 거래유형 코드 → 한글 레이블 */
  _tranLabel(code) {
    const map = {
      'IN': '입고',
      'IN-INSP': '입고검수',
      'OUT': '출고',
      'OUT_CANCEL': '출고취소',
      'RESERVE': '할당',
      'MOVE': '이동',
      'SPLIT': '분할',
      'MERGE': '병합',
      'ADJUST': '재고조정',
      'HOLD': '잠금',
      'RELEASE_HOLD': '잠금해제',
      'NEW': '임의 생성',
      'SCRAP': '불량'
    }
    return map[code] || code || '-'
  }

  /** 거래유형 코드 → 뱃지 CSS 클래스 */
  _tranBadgeClass(code) {
    const validCodes = ['IN', 'IN-INSP', 'OUT', 'OUT_CANCEL', 'RESERVE', 'MERGE', 'ADJUST', 'MOVE', 'SPLIT', 'HOLE', 'RELEASE_HOLD', 'NEW', 'SCRAP']
    return validCodes.includes(code) ? code : 'default'
  }
}

window.customElements.define('inventory-transaction-list', InventoryTransactionList)
