import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { openPopup } from '@operato/layout'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'

import './packing-order-detail'

/**
 * 포장 주문 목록 화면
 *
 * 검수/포장/출하 주문을 조회하고, 라벨 출력/매니페스트/출하 확정/취소 등의 일괄 처리를 수행
 */
class PackingOrderList extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background);
          padding: var(--padding-wide);
          overflow: auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header h2 {
          margin: 0;
          font: var(--title-font);
          color: var(--title-text-color);
        }
        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-large, 24px);
        }

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

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-success {
          background: #4CAF50;
          color: white;
        }

        .btn-success:hover {
          opacity: 0.9;
        }

        .btn-warning {
          background: #FF9800;
          color: white;
        }

        .btn-warning:hover {
          opacity: 0.9;
        }

        .btn-info {
          background: #1565C0;
          color: white;
        }

        .btn-info:hover {
          opacity: 0.9;
        }

        .btn-danger {
          background: #D32F2F;
          color: white;
        }

        .btn-danger:hover {
          opacity: 0.9;
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

        /* 상태 요약 카드 */
        .status-summary {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
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

        .summary-card.created { border-left: 4px solid #7B1FA2; }
        .summary-card.in_progress { border-left: 4px solid #FF9800; }
        .summary-card.completed { border-left: 4px solid #2196F3; }
        .summary-card.label_printed { border-left: 4px solid #1565C0; }
        .summary-card.manifested { border-left: 4px solid #303F9F; }
        .summary-card.shipped { border-left: 4px solid #4CAF50; }
        .summary-card.cancelled { border-left: 4px solid #D32F2F; }

        /* 액션 버튼 영역 */
        .action-bar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
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

        /* 체크박스 */
        .data-table input[type='checkbox'] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        /* 상태 배지 */
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.created { background: #F3E5F5; color: #7B1FA2; }
        .badge.in_progress { background: #FFF3E0; color: #E65100; }
        .badge.completed { background: #E3F2FD; color: #1565C0; }
        .badge.label_printed { background: #E8EAF6; color: #1565C0; }
        .badge.manifested { background: #E8EAF6; color: #303F9F; }
        .badge.shipped { background: #E8F5E9; color: #2E7D32; }
        .badge.cancelled { background: #FFEBEE; color: #D32F2F; }

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
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .header-actions {
            flex-wrap: wrap;
          }
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

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      loading: Boolean,
      orders: Array,
      statusSummary: Object,
      searchParams: Object,
      currentPage: Number,
      totalCount: Number,
      pageSize: Number,
      selectedIds: Array
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.orders = []
    this.statusSummary = {
      CREATED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      LABEL_PRINTED: 0,
      MANIFESTED: 0,
      SHIPPED: 0,
      CANCELLED: 0
    }
    this.searchParams = {
      order_date_from: this._todayStr(),
      order_date_to: this._todayStr(),
      status: '',
      insp_type: '',
      carrier_cd: '',
      dock_cd: '',
      pack_order_no: '',
      wave_no: ''
    }
    this.currentPage = 1
    this.totalCount = 0
    this.pageSize = 20
    this.selectedIds = []
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return { title: i18next.t('menu.PackingOrderWork', { defaultValue: '포장 주문 관리' }) }
  }

  /** 화면 렌더링 */
  render() {
    return html`
      <div class="page-container">
        <div class="page-header">
          <h2>${i18next.t('menu.PackingOrderWork', { defaultValue: '포장 주문 관리' })}</h2>
          <div class="header-actions">
            <button class="btn btn-outline" @click="${this._search}">
              🔍 ${i18next.t('button.search', { defaultValue: '조회' })}
            </button>
            <button class="btn btn-outline" @click="${this._resetSearch}">
              🔄 ${i18next.t('button.reset', { defaultValue: '초기화' })}
            </button>
          </div>
        </div>

        <!-- 검색 조건 -->
        <section class="search-section">
          <div class="search-form">
            <div class="form-group">
              <label>${i18next.t('label.order_date_from', { defaultValue: '주문일(시작)' })}</label>
              <input type="date" .value="${this.searchParams.order_date_from}"
                @change="${e => this._updateSearch('order_date_from', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.order_date_to', { defaultValue: '주문일(종료)' })}</label>
              <input type="date" .value="${this.searchParams.order_date_to}"
                @change="${e => this._updateSearch('order_date_to', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.status', { defaultValue: '상태' })}</label>
              <select .value="${this.searchParams.status}"
                @change="${e => this._updateSearch('status', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="CREATED">${i18next.t('label.created', { defaultValue: '생성' })}</option>
                <option value="IN_PROGRESS">${i18next.t('label.in_progress', { defaultValue: '진행중' })}</option>
                <option value="COMPLETED">${i18next.t('label.completed', { defaultValue: '완료' })}</option>
                <option value="LABEL_PRINTED">${i18next.t('label.label_printed', { defaultValue: '라벨출력' })}</option>
                <option value="MANIFESTED">${i18next.t('label.manifested', { defaultValue: '적하' })}</option>
                <option value="SHIPPED">${i18next.t('label.shipped', { defaultValue: '출하완료' })}</option>
                <option value="CANCELLED">${i18next.t('label.cancelled', { defaultValue: '취소' })}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.insp_type', { defaultValue: '검수유형' })}</label>
              <select .value="${this.searchParams.insp_type}"
                @change="${e => this._updateSearch('insp_type', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="FULL">FULL</option>
                <option value="SAMPLING">SAMPLING</option>
                <option value="SKIP">SKIP</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.carrier_cd', { defaultValue: '택배사' })}</label>
              <input type="text" placeholder="${i18next.t('label.carrier_cd', { defaultValue: '택배사 코드' })}"
                .value="${this.searchParams.carrier_cd}"
                @change="${e => this._updateSearch('carrier_cd', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.dock_cd', { defaultValue: '도크' })}</label>
              <input type="text" placeholder="${i18next.t('label.dock_cd', { defaultValue: '도크 코드' })}"
                .value="${this.searchParams.dock_cd}"
                @change="${e => this._updateSearch('dock_cd', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.pack_order_no', { defaultValue: '포장번호' })}</label>
              <input type="text" placeholder="${i18next.t('label.pack_order_no', { defaultValue: '포장번호' })}"
                .value="${this.searchParams.pack_order_no}"
                @change="${e => this._updateSearch('pack_order_no', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}</label>
              <input type="text" placeholder="${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}"
                .value="${this.searchParams.wave_no}"
                @change="${e => this._updateSearch('wave_no', e.target.value)}" />
            </div>
          </div>
        </section>

        <!-- 상태 요약 -->
        <section class="status-summary">
          <div class="summary-card created" @click="${() => this._filterByStatus('CREATED')}">
            <div class="label">${i18next.t('label.created', { defaultValue: '생성' })}</div>
            <div class="count">${this.statusSummary.CREATED || 0}</div>
          </div>
          <div class="summary-card in_progress" @click="${() => this._filterByStatus('IN_PROGRESS')}">
            <div class="label">${i18next.t('label.in_progress', { defaultValue: '진행중' })}</div>
            <div class="count">${this.statusSummary.IN_PROGRESS || 0}</div>
          </div>
          <div class="summary-card completed" @click="${() => this._filterByStatus('COMPLETED')}">
            <div class="label">${i18next.t('label.completed', { defaultValue: '완료' })}</div>
            <div class="count">${this.statusSummary.COMPLETED || 0}</div>
          </div>
          <div class="summary-card label_printed" @click="${() => this._filterByStatus('LABEL_PRINTED')}">
            <div class="label">${i18next.t('label.label_printed', { defaultValue: '라벨출력' })}</div>
            <div class="count">${this.statusSummary.LABEL_PRINTED || 0}</div>
          </div>
          <div class="summary-card manifested" @click="${() => this._filterByStatus('MANIFESTED')}">
            <div class="label">${i18next.t('label.manifested', { defaultValue: '적하' })}</div>
            <div class="count">${this.statusSummary.MANIFESTED || 0}</div>
          </div>
          <div class="summary-card shipped" @click="${() => this._filterByStatus('SHIPPED')}">
            <div class="label">${i18next.t('label.shipped', { defaultValue: '출하완료' })}</div>
            <div class="count">${this.statusSummary.SHIPPED || 0}</div>
          </div>
          <div class="summary-card cancelled" @click="${() => this._filterByStatus('CANCELLED')}">
            <div class="label">${i18next.t('label.cancelled', { defaultValue: '취소' })}</div>
            <div class="count">${this.statusSummary.CANCELLED || 0}</div>
          </div>
        </section>

        <!-- 액션 버튼 -->
        <section class="action-bar">
          <button class="btn btn-info" @click="${this._printLabelBatch}">
            🖨️ ${i18next.t('button.print_label', { defaultValue: '라벨 출력' })}
          </button>
          <button class="btn btn-warning" @click="${this._manifestBatch}">
            📄 ${i18next.t('button.manifest', { defaultValue: '매니페스트' })}
          </button>
          <button class="btn btn-success" @click="${this._confirmShippingBatch}">
            ✅ ${i18next.t('button.confirm_shipping', { defaultValue: '일괄 출하 확정' })}
          </button>
          <button class="btn btn-danger" @click="${this._cancelBatch}">
            🚫 ${i18next.t('button.cancel_batch', { defaultValue: '일괄 취소' })}
          </button>
        </section>

        <!-- 데이터 테이블 -->
        <section class="table-section">
          ${this.loading
        ? html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
        : this.orders.length === 0
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
                        <th class="center">
                          <input type="checkbox"
                            .checked="${this._isAllSelected}"
                            @change="${this._toggleSelectAll}" />
                        </th>
                        <th>${i18next.t('label.pack_order_no', { defaultValue: '포장번호' })}</th>
                        <th>${i18next.t('label.pick_task_no', { defaultValue: '피킹번호' })}</th>
                        <th>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</th>
                        <th>${i18next.t('label.wave_no', { defaultValue: '웨이브' })}</th>
                        <!--th class="center">${i18next.t('label.insp_type', { defaultValue: '검수유형' })}</th-->
                        <th class="center">${i18next.t('label.carrier_cd', { defaultValue: '택배사' })}</th>
                        <th class="right">${i18next.t('label.total_box', { defaultValue: '박스수' })}</th>
                        <th class="right">${i18next.t('label.total_wt', { defaultValue: '총중량(kg)' })}</th>
                        <th class="center">${i18next.t('label.dock_cd', { defaultValue: '도크' })}</th>
                        <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.orders.map(order => html`
                        <tr>
                          <td class="center">
                            <input type="checkbox"
                              .checked="${this.selectedIds.includes(order.id)}"
                              @change="${e => this._toggleSelect(order.id, e.target.checked)}" />
                          </td>
                          <td>
                            <span class="link" @click="${() => this._openDetail(order.id)}">${order.pack_order_no}</span>
                          </td>
                          <td>${order.pick_task_no || '-'}</td>
                          <td>${order.shipment_no || '-'}</td>
                          <td>${order.wave_no || '-'}</td>
                          <!--td class="center">
                            <span class="badge ${(order.insp_type || '').toLowerCase()}">${order.insp_type || '-'}</span>
                          </td-->
                          <td class="center">${order.carrier_cd || '-'}</td>
                          <td class="right">${this._formatNumber(order.total_box)}</td>
                          <td class="right">${this._formatWeight(order.total_wt)}</td>
                          <td class="center">${order.dock_cd || '-'}</td>
                          <td class="center">
                            <span class="badge ${(order.status || '').toLowerCase()}">${this._statusLabel(order.status)}</span>
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

  /** 페이지 활성화 시 데이터 조회 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchData()
    }
  }

  /** 데이터 일괄 조회 (주문 목록 + 상태 요약) */
  async _fetchData() {
    try {
      this.loading = true
      await Promise.all([
        this._fetchOrders(),
        this._fetchStatusSummary()
      ])
    } catch (error) {
      console.error('포장 주문 데이터 로딩 실패:', error)
    } finally {
      this.loading = false
    }
  }

  /** 포장 주문 목록 조회 */
  async _fetchOrders() {
    try {
      let filters = []
      if (this.searchParams.order_date_from) {
        filters.push({ name: 'order_date', operator: 'gte', value: this.searchParams.order_date_from })
      }
      if (this.searchParams.order_date_to) {
        filters.push({ name: 'order_date', operator: 'lte', value: this.searchParams.order_date_to })
      }
      if (this.searchParams.status) {
        filters.push({ name: 'status', value: this.searchParams.status })
      }
      if (this.searchParams.insp_type) {
        filters.push({ name: 'insp_type', value: this.searchParams.insp_type })
      }
      if (this.searchParams.carrier_cd) {
        filters.push({ name: 'carrier_cd', operator: 'like', value: this.searchParams.carrier_cd })
      }
      if (this.searchParams.dock_cd) {
        filters.push({ name: 'dock_cd', operator: 'like', value: this.searchParams.dock_cd })
      }
      if (this.searchParams.pack_order_no) {
        filters.push({ name: 'pack_order_no', operator: 'like', value: this.searchParams.pack_order_no })
      }
      if (this.searchParams.wave_no) {
        filters.push({ name: 'wave_no', operator: 'like', value: this.searchParams.wave_no })
      }

      const queryStr = encodeURIComponent(JSON.stringify(filters))
      const sortStr = encodeURIComponent(JSON.stringify([{ name: 'created_at', desc: true }]))
      const url = `packing_orders?page=${this.currentPage}&limit=${this.pageSize}&query=${queryStr}&sort=${sortStr}`

      const response = await ServiceUtil.restGet(url)
      if (response) {
        this.orders = response.items || []
        this.totalCount = response.total || 0
      }
    } catch (error) {
      console.error('포장 주문 목록 조회 실패:', error)
      this.orders = []
      this.totalCount = 0
    }
  }

  /** 포장 상태 요약 조회 */
  async _fetchStatusSummary() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/dashboard/packing_status_by_period', { order_date_from: this.searchParams.order_date_from, order_date_to: this.searchParams.order_date_to })
      if (data) {
        this.statusSummary = {
          CREATED: data.created || 0,
          IN_PROGRESS: data.in_progress || 0,
          COMPLETED: data.completed || 0,
          LABEL_PRINTED: data.label_printed || 0,
          MANIFESTED: data.manifested || 0,
          SHIPPED: data.shipped || 0,
          CANCELLED: data.cancelled || 0
        }
      }
    } catch (error) {
      console.error('포장 상태 요약 조회 실패:', error)
    }
  }

  /** 검색 조건 단일 필드 업데이트 */
  _updateSearch(field, value) {
    this.searchParams = { ...this.searchParams, [field]: value }
  }

  /** 검색 조건 초기화 */
  _resetSearch() {
    this.searchParams = {
      order_date_from: this._todayStr(),
      order_date_to: this._todayStr(),
      status: '',
      insp_type: '',
      carrier_cd: '',
      dock_cd: '',
      pack_order_no: '',
      wave_no: ''
    }
    this.currentPage = 1
    this.selectedIds = []
    this._fetchData()
  }

  /** 검색 실행 (첫 페이지부터 재조회) */
  _search() {
    this.currentPage = 1
    this.selectedIds = []
    this._fetchData()
  }

  /** 상태별 필터링 */
  _filterByStatus(status) {
    this.searchParams = { ...this.searchParams, status }
    this.currentPage = 1
    this.selectedIds = []
    this._fetchData()
  }

  /** 전체 선택 여부 확인 */
  get _isAllSelected() {
    return this.orders.length > 0 && this.selectedIds.length === this.orders.length
  }

  /** 전체 선택 토글 */
  _toggleSelectAll(e) {
    if (e.target.checked) {
      this.selectedIds = this.orders.map(o => o.id)
    } else {
      this.selectedIds = []
    }
    this.requestUpdate()
  }

  /** 개별 항목 선택 토글 */
  _toggleSelect(id, checked) {
    if (checked) {
      this.selectedIds = [...this.selectedIds, id]
    } else {
      this.selectedIds = this.selectedIds.filter(sid => sid !== id)
    }
    this.requestUpdate()
  }

  /** 선택된 주문 목록 반환 */
  _getSelectedOrders() {
    return this.orders.filter(o => this.selectedIds.includes(o.id))
  }

  /** 일괄 라벨 출력 (COMPLETED 상태만) */
  async _printLabelBatch() {
    const selected = this._getSelectedOrders().filter(o => o.status === 'COMPLETED')
    if (selected.length === 0) {
      UiUtil.showToast(i18next.t('message.select_completed_orders', { defaultValue: '완료 상태의 주문을 선택해주세요.' }))
      return
    }

    try {
      for (const order of selected) {
        await ServiceUtil.restPost(`ful_trx/packing_orders/${order.id}/print_label`)
      }
      UiUtil.showToast(i18next.t('message.print_label_success', { defaultValue: '라벨 출력이 완료되었습니다.' }))
      this.selectedIds = []
      await this._fetchData()
    } catch (error) {
      console.error('라벨 출력 실패:', error)
      UiUtil.showToast(i18next.t('message.print_label_fail', { defaultValue: '라벨 출력에 실패했습니다.' }))
    }
  }

  /** 일괄 매니페스트 (LABEL_PRINTED 상태만) */
  async _manifestBatch() {
    const selected = this._getSelectedOrders().filter(o => o.status === 'LABEL_PRINTED')
    if (selected.length === 0) {
      UiUtil.showToast(i18next.t('message.select_label_printed_orders', { defaultValue: '라벨출력 상태의 주문을 선택해주세요.' }))
      return
    }

    try {
      for (const order of selected) {
        await ServiceUtil.restPost(`ful_trx/packing_orders/${order.id}/manifest`)
      }
      UiUtil.showToast(i18next.t('message.manifest_success', { defaultValue: '매니페스트가 완료되었습니다.' }))
      this.selectedIds = []
      await this._fetchData()
    } catch (error) {
      console.error('매니페스트 실패:', error)
      UiUtil.showToast(i18next.t('message.manifest_fail', { defaultValue: '매니페스트에 실패했습니다.' }))
    }
  }

  /** 일괄 출하 확정 (COMPLETED/LABEL_PRINTED/MANIFESTED 상태) */
  async _confirmShippingBatch() {
    const validStatuses = ['COMPLETED', 'LABEL_PRINTED', 'MANIFESTED']
    const selected = this._getSelectedOrders().filter(o => validStatuses.includes(o.status))
    if (selected.length === 0) {
      UiUtil.showToast(i18next.t('message.select_shippable_orders', { defaultValue: '출하 가능한 주문을 선택해주세요. (완료/라벨출력/적하 상태)' }))
      return
    }

    try {
      const ids = selected.map(o => o.id)
      await ServiceUtil.restPost('ful_trx/packing_orders/confirm_shipping_batch', { ids })
      UiUtil.showToast(i18next.t('message.confirm_shipping_success', { defaultValue: '출하 확정이 완료되었습니다.' }))
      this.selectedIds = []
      await this._fetchData()
    } catch (error) {
      console.error('출하 확정 실패:', error)
      UiUtil.showToast(i18next.t('message.confirm_shipping_fail', { defaultValue: '출하 확정에 실패했습니다.' }))
    }
  }

  /** 일괄 취소 (SHIPPED 제외) */
  async _cancelBatch() {
    const selected = this._getSelectedOrders().filter(o => o.status !== 'SHIPPED')
    if (selected.length === 0) {
      UiUtil.showToast(i18next.t('message.select_cancellable_orders', { defaultValue: '취소 가능한 주문을 선택해주세요. (출하완료 상태 제외)' }))
      return
    }

    try {
      for (const order of selected) {
        await ServiceUtil.restPost(`ful_trx/packing_orders/${order.id}/cancel`)
      }
      UiUtil.showToast(i18next.t('message.cancel_success', { defaultValue: '취소가 완료되었습니다.' }))
      this.selectedIds = []
      await this._fetchData()
    } catch (error) {
      console.error('취소 실패:', error)
      UiUtil.showToast(i18next.t('message.cancel_fail', { defaultValue: '취소에 실패했습니다.' }))
    }
  }

  /** 상세 팝업 열기 */
  _openDetail(id) {
    openPopup(
      html`<packing-order-detail
        .packingOrderId="${id}"
        @order-updated="${() => this._fetchData()}"
      ></packing-order-detail>`,
      {
        backdrop: true,
        size: 'large',
        title: i18next.t('title.packing_order_detail', { defaultValue: '검수/포장/출하 상세' })
      }
    )
  }

  /** 포장 상태 한글 라벨 반환 */
  _statusLabel(status) {
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      IN_PROGRESS: i18next.t('label.in_progress', { defaultValue: '진행중' }),
      COMPLETED: i18next.t('label.completed', { defaultValue: '완료' }),
      LABEL_PRINTED: i18next.t('label.label_printed', { defaultValue: '라벨출력' }),
      MANIFESTED: i18next.t('label.manifested', { defaultValue: '적하' }),
      SHIPPED: i18next.t('label.shipped', { defaultValue: '출하완료' }),
      CANCELLED: i18next.t('label.cancelled', { defaultValue: '취소' })
    }
    return labels[status] || status
  }

  /** 숫자를 천단위 구분자 포맷으로 반환 */
  _formatNumber(value) {
    if (value == null) return '-'
    return Number(value).toLocaleString()
  }

  /** 중량을 소수점 포함 천단위 구분자 포맷으로 반환 */
  _formatWeight(value) {
    if (value == null) return '-'
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
  }

  /** 오늘 날짜를 YYYY-MM-DD 형식 문자열로 반환 */
  _todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  /** 전체 페이지 수 계산 */
  get _totalPages() {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize))
  }

  /** 페이지네이션 버튼 배열 생성 (현재 페이지 기준 ±2) */
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

  /** 지정 페이지로 이동 */
  _goPage(page) {
    if (page < 1 || page > this._totalPages) return
    this.currentPage = page
    this.selectedIds = []
    this._fetchOrders()
  }
}

window.customElements.define('packing-order-list', PackingOrderList)
