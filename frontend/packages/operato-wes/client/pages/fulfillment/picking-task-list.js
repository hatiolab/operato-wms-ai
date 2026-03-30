import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { openPopup } from '@operato/layout'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'

import './picking-task-detail'

/**
 * 피킹 지시 목록 화면
 *
 * 피킹 지시를 조회하고, 상세 팝업을 통해 확인 및 일괄 취소 기능 제공
 */
class PickingTaskList extends localize(i18next)(PageView) {
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
        [page-description] {
          margin: var(--page-description-margin);
          font: var(--page-description-font);
          color: var(--page-description-color);
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
          grid-template-columns: repeat(4, 1fr);
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
        .summary-card.completed { border-left: 4px solid #4CAF50; }
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
        .badge.completed { background: #E8F5E9; color: #2E7D32; }
        .badge.cancelled { background: #FFEBEE; color: #D32F2F; }

        .text-red {
          color: #D32F2F;
          font-weight: 600;
        }

        /* 체크박스 */
        .data-table input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
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
      items: Array,
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
    this.items = []
    this.statusSummary = { CREATED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 }
    this.searchParams = {
      order_date_from: this._todayStr(),
      order_date_to: this._todayStr(),
      status: '',
      pick_type: '',
      pick_method: '',
      wave_no: '',
      worker_id: '',
      shipment_no: ''
    }
    this.currentPage = 1
    this.totalCount = 0
    this.pageSize = 20
  }

  get context() {
    return { title: i18next.t('menu.PickingTaskWork', { defaultValue: '피킹 지시 목록' }) }
  }

  render() {
    return html`
      <div class="page-container">
        <h2>${i18next.t('menu.PickingTaskWork', { defaultValue: '피킹 지시 목록' })}</h2>

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
                <option value="CANCELLED">${i18next.t('label.cancelled', { defaultValue: '취소' })}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.pick_type', { defaultValue: '피킹유형' })}</label>
              <select .value="${this.searchParams.pick_type}"
                @change="${e => this._updateSearch('pick_type', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="TOTAL">TOTAL</option>
                <option value="ZONE">ZONE</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.pick_method', { defaultValue: '피킹방식' })}</label>
              <select .value="${this.searchParams.pick_method}"
                @change="${e => this._updateSearch('pick_method', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="WCS">WCS</option>
                <option value="PAPER">PAPER</option>
                <option value="INSPECT">INSPECT</option>
                <option value="PICK">PICK</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}</label>
              <input type="text" placeholder="${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}"
                .value="${this.searchParams.wave_no}"
                @change="${e => this._updateSearch('wave_no', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.worker_id', { defaultValue: '작업자' })}</label>
              <input type="text" placeholder="${i18next.t('label.worker_id', { defaultValue: '작업자' })}"
                .value="${this.searchParams.worker_id}"
                @change="${e => this._updateSearch('worker_id', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</label>
              <input type="text" placeholder="${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}"
                .value="${this.searchParams.shipment_no}"
                @change="${e => this._updateSearch('shipment_no', e.target.value)}" />
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
          <div class="summary-card cancelled" @click="${() => this._filterByStatus('CANCELLED')}">
            <div class="label">${i18next.t('label.cancelled', { defaultValue: '취소' })}</div>
            <div class="count">${this.statusSummary.CANCELLED || 0}</div>
          </div>
        </section>

        <!-- 액션 버튼 -->
        <section class="action-bar">
          <button class="btn btn-danger" @click="${this._batchCancel}">
            ${i18next.t('button.batch_cancel', { defaultValue: '일괄 취소' })}
          </button>
        </section>

        <!-- 데이터 테이블 -->
        <section class="table-section">
          ${this.loading
        ? html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
        : this.items.length === 0
          ? html`
                  <div class="empty-state">
                    <div class="icon">📋</div>
                    <div class="message">${i18next.t('label.no_data', { defaultValue: '조회 결과가 없습니다' })}</div>
                  </div>
                `
          : html`
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th class="center">
                          <input type="checkbox" @change="${this._toggleSelectAll}" />
                        </th>
                        <th>${i18next.t('label.pick_task_no', { defaultValue: '피킹번호' })}</th>
                        <th>${i18next.t('label.wave_no', { defaultValue: '웨이브' })}</th>
                        <th>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</th>
                        <th class="center">${i18next.t('label.pick_type', { defaultValue: '피킹유형' })}</th>
                        <th class="center">${i18next.t('label.pick_method', { defaultValue: '피킹방식' })}</th>
                        <th class="center">${i18next.t('label.worker_id', { defaultValue: '작업자' })}</th>
                        <th class="right">${i18next.t('label.plan_total', { defaultValue: '계획수량' })}</th>
                        <th class="right">${i18next.t('label.result_total', { defaultValue: '실적수량' })}</th>
                        <th class="right">${i18next.t('label.short_total', { defaultValue: '부족수량' })}</th>
                        <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.items.map(item => html`
                          <tr>
                            <td class="center">
                              <input type="checkbox" .checked="${item._selected || false}"
                                @change="${e => this._toggleSelect(item, e.target.checked)}" />
                            </td>
                            <td>
                              <span class="link" @click="${() => this._openDetail(item.id)}">${item.pick_task_no}</span>
                            </td>
                            <td>${item.wave_no || '-'}</td>
                            <td>${item.shipment_no || '-'}</td>
                            <td class="center">
                              <span class="badge ${(item.pick_type || '').toLowerCase()}">${item.pick_type || '-'}</span>
                            </td>
                            <td class="center">
                              <span class="badge">${item.pick_method || '-'}</span>
                            </td>
                            <td class="center">${item.worker_id || '-'}</td>
                            <td class="right">${this._formatNumber(item.plan_total)}</td>
                            <td class="right">${this._formatNumber(item.result_total)}</td>
                            <td class="right">
                              <span class="${(item.short_total || 0) > 0 ? 'text-red' : ''}">
                                ${this._formatNumber(item.short_total)}
                              </span>
                            </td>
                            <td class="center">
                              <span class="badge ${(item.status || '').toLowerCase()}">${this._statusLabel(item.status)}</span>
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
        this._fetchItems(),
        this._fetchStatusSummary()
      ])
    } catch (error) {
      console.error('피킹 지시 데이터 로딩 실패:', error)
    } finally {
      this.loading = false
    }
  }

  async _fetchItems() {
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
      if (this.searchParams.pick_type) {
        filters.push({ name: 'pick_type', value: this.searchParams.pick_type })
      }
      if (this.searchParams.pick_method) {
        filters.push({ name: 'pick_method', value: this.searchParams.pick_method })
      }
      if (this.searchParams.wave_no) {
        filters.push({ name: 'wave_no', operator: 'like', value: this.searchParams.wave_no })
      }
      if (this.searchParams.worker_id) {
        filters.push({ name: 'worker_id', value: this.searchParams.worker_id })
      }
      if (this.searchParams.shipment_no) {
        filters.push({ name: 'shipment_no', operator: 'like', value: this.searchParams.shipment_no })
      }

      const queryStr = encodeURIComponent(JSON.stringify(filters))
      const sortStr = encodeURIComponent(JSON.stringify([{ name: 'created_at', desc: true }]))
      const url = `picking_tasks?page=${this.currentPage}&limit=${this.pageSize}&query=${queryStr}&sort=${sortStr}`

      const response = await ServiceUtil.restGet(url)
      if (response) {
        this.items = (response.items || []).map(item => ({ ...item, _selected: false }))
        this.totalCount = response.total || 0
      }
    } catch (error) {
      console.error('피킹 지시 목록 조회 실패:', error)
      this.items = []
      this.totalCount = 0
    }
  }

  async _fetchStatusSummary() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/dashboard/picking_status')
      if (data) {
        this.statusSummary = {
          CREATED: data.CREATED || 0,
          IN_PROGRESS: data.IN_PROGRESS || 0,
          COMPLETED: data.COMPLETED || 0,
          CANCELLED: data.CANCELLED || 0
        }
      }
    } catch (error) {
      console.error('피킹 상태 요약 조회 실패:', error)
    }
  }

  _updateSearch(field, value) {
    this.searchParams = { ...this.searchParams, [field]: value }
  }

  _resetSearch() {
    this.searchParams = {
      order_date_from: this._todayStr(),
      order_date_to: this._todayStr(),
      status: '',
      pick_type: '',
      pick_method: '',
      wave_no: '',
      worker_id: '',
      shipment_no: ''
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

  _openDetail(id) {
    openPopup(
      html`<picking-task-detail
        .pickingTaskId="${id}"
        @task-updated="${() => this._fetchData()}"
      ></picking-task-detail>`,
      {
        backdrop: true,
        size: 'large',
        title: i18next.t('title.picking_task_detail', { defaultValue: '피킹 지시 상세' })
      }
    )
  }

  _toggleSelectAll(e) {
    const checked = e.target.checked
    this.items = this.items.map(item => ({ ...item, _selected: checked }))
  }

  _toggleSelect(item, checked) {
    this.items = this.items.map(i => i.id === item.id ? { ...i, _selected: checked } : i)
  }

  async _batchCancel() {
    const selectedItems = this.items.filter(item => item._selected)
    if (selectedItems.length === 0) {
      UiUtil.showToast(i18next.t('message.select_items', { defaultValue: '취소할 항목을 선택하세요.' }))
      return
    }

    if (!confirm(i18next.t('message.confirm_batch_cancel', { defaultValue: `선택한 ${selectedItems.length}건을 취소하시겠습니까?` }))) {
      return
    }

    try {
      const promises = selectedItems.map(item =>
        ServiceUtil.restPost('ful_trx/picking_tasks/' + item.id + '/cancel')
      )
      await Promise.all(promises)
      UiUtil.showToast(i18next.t('message.batch_cancel_success', { defaultValue: '일괄 취소가 완료되었습니다.' }))
      this._fetchData()
    } catch (error) {
      console.error('일괄 취소 실패:', error)
      UiUtil.showToast(i18next.t('message.batch_cancel_fail', { defaultValue: '일괄 취소 중 오류가 발생했습니다.' }))
    }
  }

  _statusLabel(status) {
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      IN_PROGRESS: i18next.t('label.in_progress', { defaultValue: '진행중' }),
      COMPLETED: i18next.t('label.completed', { defaultValue: '완료' }),
      CANCELLED: i18next.t('label.cancelled', { defaultValue: '취소' })
    }
    return labels[status] || status
  }

  _formatNumber(value) {
    if (value == null) return '-'
    return Number(value).toLocaleString()
  }

  _todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    this._fetchItems()
  }
}

window.customElements.define('picking-task-list', PickingTaskList)
