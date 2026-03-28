import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { openPopup } from '@operato/layout'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'

import './shipment-order-detail'

/**
 * 재고 할당 현황 화면
 *
 * 출하 주문에 대한 재고 할당(SOFT/HARD) 상태를 조회·모니터링
 */
class StockAllocationList extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background);
          padding: var(--padding-wide);
          overflow: auto;
        }
        h2 {
          margin: var(--title-margin);
          font: var(--title-font);
          color: var(--title-text-color);
        }

        .page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-large, 24px);
        }

        /* 페이지 헤더 */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header h2 {
          margin: 0;
        }

        /* 상태 요약 카드 */
        .status-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--spacing-medium, 16px);
        }

        .summary-card {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-medium, 16px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .summary-card:hover {
          box-shadow: var(--box-shadow-normal, 0 4px 8px rgba(0, 0, 0, 0.15));
          transform: translateY(-2px);
        }

        .summary-card .label {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 4px;
        }

        .summary-card .count {
          font-size: 28px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
        }

        .summary-card.soft { border-left: 4px solid #FF9800; }
        .summary-card.hard { border-left: 4px solid #1565C0; }
        .summary-card.released { border-left: 4px solid #303F9F; }
        .summary-card.expired { border-left: 4px solid #9E9E9E; }
        .summary-card.cancelled { border-left: 4px solid #D32F2F; }

        /* 검색 조건 */
        .search-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .search-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-medium, 16px);
          align-items: end;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
        }

        .form-group input,
        .form-group select {
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          font-size: 14px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--md-sys-color-primary);
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
        }

        .search-actions {
          display: flex;
          gap: 8px;
          align-items: end;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .btn-primary:hover {
          opacity: 0.9;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .btn-secondary {
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface-variant);
        }

        .btn-secondary:hover {
          background: var(--md-sys-color-outline-variant);
        }

        .btn-outline {
          background: transparent;
          color: var(--md-sys-color-primary);
          border: 1px solid var(--md-sys-color-primary);
        }

        .btn-outline:hover {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        /* 데이터 테이블 */
        .table-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .data-table thead {
          background: var(--md-sys-color-surface-variant);
        }

        .data-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 13px;
          white-space: nowrap;
        }

        .data-table th.center,
        .data-table td.center {
          text-align: center;
        }

        .data-table th.right,
        .data-table td.right {
          text-align: right;
        }

        .data-table tbody tr {
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          transition: background 0.15s ease;
        }

        .data-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant);
        }

        .data-table tbody tr.expiring-soon {
          background: #FFEBEE;
          animation: pulse 2s infinite;
        }

        .data-table tbody tr.expiring-soon:hover {
          background: #FFCDD2;
        }

        .data-table td {
          padding: 12px 16px;
          color: var(--md-sys-color-on-surface);
        }

        .data-table .link {
          color: var(--md-sys-color-primary);
          cursor: pointer;
          text-decoration: none;
          font-weight: 500;
        }

        .data-table .link:hover {
          text-decoration: underline;
        }

        /* 상태 배지 */
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.soft { background: #FFF3E0; color: #E65100; }
        .badge.hard { background: #E3F2FD; color: #1565C0; }
        .badge.released { background: #E8EAF6; color: #303F9F; }
        .badge.expired { background: #F5F5F5; color: #616161; }
        .badge.cancelled { background: #FFEBEE; color: #D32F2F; }

        /* 전략 배지 */
        .strategy-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          background: #F3E5F5;
          color: #7B1FA2;
        }

        /* 만료 임박 강조 */
        .expiring-text {
          color: #C62828;
          font-weight: 700;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }

        /* 페이지네이션 */
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
        }

        .pagination .info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .pagination .controls {
          display: flex;
          gap: 4px;
        }

        .pagination .controls button {
          padding: 6px 12px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 6px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
          cursor: pointer;
          font-size: 13px;
        }

        .pagination .controls button:hover {
          background: var(--md-sys-color-surface-variant);
        }

        .pagination .controls button.active {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          border-color: var(--md-sys-color-primary);
        }

        .pagination .controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 48px 16px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .empty-state .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state .message {
          font-size: 16px;
        }

        /* 로딩 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant);
        }

        /* 반응형 */
        @media screen and (max-width: 768px) {
          .status-summary {
            grid-template-columns: repeat(2, 1fr);
          }
          .search-form {
            grid-template-columns: 1fr;
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      allocations: Array,
      statusSummary: Object,
      searchParams: Object,
      currentPage: Number,
      totalCount: Number,
      pageSize: Number
    }
  }

  constructor() {
    super()
    this.loading = true
    this.allocations = []
    this.statusSummary = { SOFT: 0, HARD: 0, RELEASED: 0, EXPIRED: 0, CANCELLED: 0 }
    this.searchParams = {
      status: '',
      skuCd: '',
      shipmentNo: '',
      allocStrategy: '',
      locCd: ''
    }
    this.currentPage = 1
    this.totalCount = 0
    this.pageSize = 20
  }

  get context() {
    return { title: i18next.t('title.stock-allocation-list', { defaultValue: '재고 할당 현황' }) }
  }

  render() {
    return html`
      <div class="page-container">
        <!-- 페이지 헤더 -->
        <div class="page-header">
          <h2>${i18next.t('title.stock-allocation-list', { defaultValue: '재고 할당 현황' })}</h2>
          <button class="btn btn-outline" @click="${this._refresh}">
            ${i18next.t('button.refresh', { defaultValue: '새로고침' })}
          </button>
        </div>

        <!-- 상태 요약 카드 -->
        <section class="status-summary">
          <div class="summary-card soft" @click="${() => this._filterByStatus('SOFT')}">
            <div class="label">${i18next.t('label.soft_alloc', { defaultValue: '임시 할당' })}</div>
            <div class="count">${this._formatNumber(this.statusSummary.SOFT)}</div>
          </div>
          <div class="summary-card hard" @click="${() => this._filterByStatus('HARD')}">
            <div class="label">${i18next.t('label.hard_alloc', { defaultValue: '확정 할당' })}</div>
            <div class="count">${this._formatNumber(this.statusSummary.HARD)}</div>
          </div>
          <div class="summary-card released" @click="${() => this._filterByStatus('RELEASED')}">
            <div class="label">${i18next.t('label.released', { defaultValue: '릴리스' })}</div>
            <div class="count">${this._formatNumber(this.statusSummary.RELEASED)}</div>
          </div>
          <div class="summary-card expired" @click="${() => this._filterByStatus('EXPIRED')}">
            <div class="label">${i18next.t('label.expired', { defaultValue: '만료' })}</div>
            <div class="count">${this._formatNumber(this.statusSummary.EXPIRED)}</div>
          </div>
          <div class="summary-card cancelled" @click="${() => this._filterByStatus('CANCELLED')}">
            <div class="label">${i18next.t('label.cancelled', { defaultValue: '취소' })}</div>
            <div class="count">${this._formatNumber(this.statusSummary.CANCELLED)}</div>
          </div>
        </section>

        <!-- 검색 조건 -->
        <section class="search-section">
          <div class="search-form">
            <div class="form-group">
              <label>${i18next.t('label.status', { defaultValue: '상태' })}</label>
              <select .value="${this.searchParams.status}"
                @change="${e => this._updateSearch('status', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="SOFT">${i18next.t('label.soft_alloc', { defaultValue: '임시 할당' })}</option>
                <option value="HARD">${i18next.t('label.hard_alloc', { defaultValue: '확정 할당' })}</option>
                <option value="RELEASED">${i18next.t('label.released', { defaultValue: '릴리스' })}</option>
                <option value="EXPIRED">${i18next.t('label.expired', { defaultValue: '만료' })}</option>
                <option value="CANCELLED">${i18next.t('label.cancelled', { defaultValue: '취소' })}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.sku_cd', { defaultValue: 'SKU' })}</label>
              <input type="text" placeholder="${i18next.t('label.sku_cd', { defaultValue: 'SKU 코드' })}"
                .value="${this.searchParams.skuCd}"
                @change="${e => this._updateSearch('skuCd', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</label>
              <input type="text" placeholder="${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}"
                .value="${this.searchParams.shipmentNo}"
                @change="${e => this._updateSearch('shipmentNo', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.alloc_strategy', { defaultValue: '할당 전략' })}</label>
              <select .value="${this.searchParams.allocStrategy}"
                @change="${e => this._updateSearch('allocStrategy', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="FEFO">FEFO</option>
                <option value="FIFO">FIFO</option>
                <option value="LEFO">LEFO</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.loc_cd', { defaultValue: '로케이션' })}</label>
              <input type="text" placeholder="${i18next.t('label.loc_cd', { defaultValue: '로케이션 코드' })}"
                .value="${this.searchParams.locCd}"
                @change="${e => this._updateSearch('locCd', e.target.value)}" />
            </div>
            <div class="search-actions">
              <button class="btn btn-secondary" @click="${this._resetSearch}">
                ${i18next.t('button.reset', { defaultValue: '초기화' })}
              </button>
              <button class="btn btn-primary" @click="${this._search}">
                ${i18next.t('button.search', { defaultValue: '조회' })}
              </button>
            </div>
          </div>
        </section>

        <!-- 데이터 테이블 -->
        <section class="table-section">
          ${this.loading
            ? html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
            : this.allocations.length === 0
              ? html`
                  <div class="empty-state">
                    <div class="icon">📦</div>
                    <div class="message">${i18next.t('label.no_data', { defaultValue: '조회 결과가 없습니다' })}</div>
                  </div>
                `
              : html`
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${i18next.t('label.shipment_order_id', { defaultValue: '출하번호' })}</th>
                        <th>${i18next.t('label.sku_cd', { defaultValue: 'SKU' })}</th>
                        <th>${i18next.t('label.barcode', { defaultValue: '바코드' })}</th>
                        <th>${i18next.t('label.loc_cd', { defaultValue: '로케이션' })}</th>
                        <th>${i18next.t('label.lot_no', { defaultValue: '로트' })}</th>
                        <th class="center">${i18next.t('label.expired_date', { defaultValue: '유통기한' })}</th>
                        <th class="right">${i18next.t('label.alloc_qty', { defaultValue: '할당수량' })}</th>
                        <th class="center">${i18next.t('label.alloc_strategy', { defaultValue: '전략' })}</th>
                        <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
                        <th class="center">${i18next.t('label.allocated_at', { defaultValue: '할당일시' })}</th>
                        <th class="center">${i18next.t('label.expired_at', { defaultValue: '만료일시' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.allocations.map(alloc => html`
                        <tr class="${this._isSoftExpiringSoon(alloc) ? 'expiring-soon' : ''}">
                          <td>
                            <span class="link" @click="${() => this._openOrderDetail(alloc.shipmentOrderId)}">${alloc.shipmentOrderId || '-'}</span>
                          </td>
                          <td>${alloc.skuCd || '-'}</td>
                          <td>${alloc.barcode || '-'}</td>
                          <td>${alloc.locCd || '-'}</td>
                          <td>${alloc.lotNo || '-'}</td>
                          <td class="center">${alloc.expiredDate || '-'}</td>
                          <td class="right">${this._formatNumber(alloc.allocQty)}</td>
                          <td class="center">
                            ${alloc.allocStrategy
                              ? html`<span class="strategy-badge">${alloc.allocStrategy}</span>`
                              : '-'}
                          </td>
                          <td class="center">
                            <span class="badge ${(alloc.status || '').toLowerCase()}">${this._statusLabel(alloc.status)}</span>
                          </td>
                          <td class="center">${this._formatDateTime(alloc.allocatedAt)}</td>
                          <td class="center">
                            ${alloc.status === 'SOFT' && alloc.expiredAt
                              ? html`<span class="${this._isSoftExpiringSoon(alloc) ? 'expiring-text' : ''}">${this._formatDateTime(alloc.expiredAt)}</span>`
                              : '-'}
                          </td>
                        </tr>
                      `)}
                    </tbody>
                  </table>

                  <!-- 페이지네이션 -->
                  <div class="pagination">
                    <span class="info">
                      ${i18next.t('label.total_count', { defaultValue: '전체' })} ${this.totalCount}${i18next.t('label.count_unit', { defaultValue: '건' })}
                      ${this.currentPage}/${this._totalPages}
                    </span>
                    <div class="controls">
                      <button ?disabled="${this.currentPage <= 1}" @click="${() => this._goPage(this.currentPage - 1)}">◀</button>
                      ${this._pageButtons.map(p => html`
                        <button class="${p === this.currentPage ? 'active' : ''}" @click="${() => this._goPage(p)}">${p}</button>
                      `)}
                      <button ?disabled="${this.currentPage >= this._totalPages}" @click="${() => this._goPage(this.currentPage + 1)}">▶</button>
                    </div>
                  </div>
                `
          }
        </section>
      </div>
    `
  }

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchData()
    }
  }

  async _fetchData() {
    try {
      this.loading = true
      await Promise.all([
        this._fetchAllocations(),
        this._fetchStatusSummary()
      ])
    } catch (error) {
      console.error('재고 할당 데이터 로딩 실패:', error)
    } finally {
      this.loading = false
    }
  }

  async _fetchAllocations() {
    try {
      let filters = []
      if (this.searchParams.status) {
        filters.push({ name: 'status', value: this.searchParams.status })
      }
      if (this.searchParams.skuCd) {
        filters.push({ name: 'skuCd', operator: 'like', value: this.searchParams.skuCd })
      }
      if (this.searchParams.shipmentNo) {
        filters.push({ name: 'shipmentOrderId', operator: 'like', value: this.searchParams.shipmentNo })
      }
      if (this.searchParams.allocStrategy) {
        filters.push({ name: 'allocStrategy', value: this.searchParams.allocStrategy })
      }
      if (this.searchParams.locCd) {
        filters.push({ name: 'locCd', operator: 'like', value: this.searchParams.locCd })
      }

      const queryStr = encodeURIComponent(JSON.stringify(filters))
      const sortStr = encodeURIComponent(JSON.stringify([{ name: 'createdAt', desc: true }]))
      const url = `stock_allocations?page=${this.currentPage}&limit=${this.pageSize}&query=${queryStr}&sort=${sortStr}`

      const response = await ServiceUtil.restGet(url)
      if (response) {
        this.allocations = response.items || []
        this.totalCount = response.total || 0
      }
    } catch (error) {
      console.error('재고 할당 목록 조회 실패:', error)
      this.allocations = []
      this.totalCount = 0
    }
  }

  async _fetchStatusSummary() {
    try {
      const statuses = ['SOFT', 'HARD', 'RELEASED', 'EXPIRED', 'CANCELLED']
      const summary = {}

      await Promise.all(
        statuses.map(async status => {
          try {
            const query = encodeURIComponent(JSON.stringify([{ name: 'status', value: status }]))
            const response = await ServiceUtil.restGet(`stock_allocations?limit=1&query=${query}`)
            summary[status] = response?.total || 0
          } catch {
            summary[status] = 0
          }
        })
      )

      this.statusSummary = summary
    } catch (error) {
      console.error('할당 상태 요약 조회 실패:', error)
    }
  }

  _refresh() {
    this._fetchData()
  }

  _updateSearch(field, value) {
    this.searchParams = { ...this.searchParams, [field]: value }
  }

  _resetSearch() {
    this.searchParams = {
      status: '',
      skuCd: '',
      shipmentNo: '',
      allocStrategy: '',
      locCd: ''
    }
    this.currentPage = 1
    this._fetchData()
  }

  _search() {
    this.currentPage = 1
    this._fetchData()
  }

  _filterByStatus(status) {
    this.searchParams = { ...this.searchParams, status }
    this.currentPage = 1
    this._fetchData()
  }

  _openOrderDetail(orderId) {
    if (!orderId) return
    openPopup(
      html`<shipment-order-detail
        .orderId="${orderId}"
        @order-updated="${() => this._fetchData()}"
      ></shipment-order-detail>`,
      {
        backdrop: true,
        size: 'large',
        title: i18next.t('title.shipment_order_detail', { defaultValue: '출하 주문 상세' })
      }
    )
  }

  _statusLabel(status) {
    const labels = {
      SOFT: i18next.t('label.soft_alloc', { defaultValue: '임시 할당' }),
      HARD: i18next.t('label.hard_alloc', { defaultValue: '확정 할당' }),
      RELEASED: i18next.t('label.released', { defaultValue: '릴리스' }),
      EXPIRED: i18next.t('label.expired', { defaultValue: '만료' }),
      CANCELLED: i18next.t('label.cancelled', { defaultValue: '취소' })
    }
    return labels[status] || status
  }

  _strategyLabel(strategy) {
    const labels = {
      FEFO: 'FEFO (선출고 우선)',
      FIFO: 'FIFO (선입선출)',
      LEFO: 'LEFO (후입선출)',
      MANUAL: i18next.t('label.manual', { defaultValue: '수동' })
    }
    return labels[strategy] || strategy || '-'
  }

  _isSoftExpiringSoon(alloc) {
    if (alloc.status !== 'SOFT' || !alloc.expiredAt) return false
    try {
      const expiredTime = new Date(alloc.expiredAt).getTime()
      const now = Date.now()
      const thirtyMinutes = 30 * 60 * 1000
      return expiredTime > now && (expiredTime - now) < thirtyMinutes
    } catch {
      return false
    }
  }

  _formatDateTime(dateValue) {
    if (!dateValue) return '-'
    try {
      if (dateValue.length >= 16) {
        return dateValue.substring(0, 16).replace('T', ' ')
      }
      return dateValue
    } catch {
      return dateValue
    }
  }

  _formatNumber(value) {
    if (value == null) return '0'
    return Number(value).toLocaleString()
  }

  get _totalPages() {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize))
  }

  get _pageButtons() {
    const total = this._totalPages
    const current = this.currentPage
    const pages = []
    const start = Math.max(1, current - 2)
    const end = Math.min(total, start + 4)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  _goPage(page) {
    if (page < 1 || page > this._totalPages) return
    this.currentPage = page
    this._fetchAllocations()
  }
}

window.customElements.define('stock-allocation-list', StockAllocationList)
