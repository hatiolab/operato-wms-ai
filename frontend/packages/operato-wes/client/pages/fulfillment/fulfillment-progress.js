import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { openPopup } from '@operato/layout'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'

import './picking-task-detail'

/**
 * 풀필먼트 진행 현황 화면
 *
 * 피킹 -> 포장 -> 출하 전체 파이프라인을 읽기 전용으로 모니터링하는 화면.
 * fulfillment_progress 뷰를 통해 데이터를 조회한다.
 */
class FulfillmentProgress extends localize(i18next)(PageView) {
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

        /* 페이지 헤더 */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-medium, 16px);
        }

        .page-header h2 {
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
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

        /* 피킹 상태 배지 */
        .badge.pick-created { background: #F3E5F5; color: #7B1FA2; }
        .badge.pick-in_progress { background: #FFF3E0; color: #FF9800; }
        .badge.pick-completed { background: #E8F5E9; color: #4CAF50; }
        .badge.pick-cancelled { background: #FFEBEE; color: #D32F2F; }

        /* 포장 상태 배지 */
        .badge.pack-created { background: #F3E5F5; color: #7B1FA2; }
        .badge.pack-in_progress { background: #FFF3E0; color: #FF9800; }
        .badge.pack-completed { background: #E3F2FD; color: #2196F3; }
        .badge.pack-label_printed { background: #E3F2FD; color: #1565C0; }
        .badge.pack-manifested { background: #E8EAF6; color: #303F9F; }
        .badge.pack-shipped { background: #E8F5E9; color: #4CAF50; }
        .badge.pack-cancelled { background: #FFEBEE; color: #D32F2F; }

        /* 일반 배지 */
        .badge.type-badge { background: #E8EAF6; color: #303F9F; }

        /* 부족수량 강조 */
        .short-qty { color: #D32F2F; font-weight: 600; }

        /* 포장 미생성 힌트 */
        .empty-hint {
          color: #9E9E9E;
          font-size: 11px;
          font-style: italic;
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
          .search-form {
            grid-template-columns: 1fr;
          }

          .header-actions {
            flex-wrap: wrap;
          }
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      loading: Boolean,
      items: Array,
      searchParams: Object,
      currentPage: Number,
      totalCount: Number,
      pageSize: Number
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.items = []
    this.searchParams = {
      order_date_from: this._todayStr(),
      order_date_to: this._todayStr(),
      wave_no: '',
      shipment_no: '',
      pick_status: '',
      pack_status: '',
      pick_type: ''
    }
    this.currentPage = 1
    this.totalCount = 0
    this.pageSize = 20
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return { title: i18next.t('menu.FulfillmentProgress', { defaultValue: '피킹/검수/포장 진행 현황' }) }
  }

  /** 화면 렌더링 */
  render() {
    return html`
      <div class="page-container">
        <div class="page-header">
          <h2>${i18next.t('title.FulfillmentProgress', { defaultValue: '피킹/검수/포장 진행 현황' })}</h2>
          <div class="header-actions">
            <button class="btn btn-outline" @click="${this._search}">
              ${i18next.t('button.search', { defaultValue: '조회' })}
            </button>
            <button class="btn btn-outline" @click="${this._resetSearch}">
              ${i18next.t('button.reset', { defaultValue: '초기화' })}
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
              <label>${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}</label>
              <input type="text" placeholder="${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}"
                .value="${this.searchParams.wave_no}"
                @change="${e => this._updateSearch('wave_no', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</label>
              <input type="text" placeholder="${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}"
                .value="${this.searchParams.shipment_no}"
                @change="${e => this._updateSearch('shipment_no', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.pick_status', { defaultValue: '피킹상태' })}</label>
              <select .value="${this.searchParams.pick_status}"
                @change="${e => this._updateSearch('pick_status', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="CREATED">${i18next.t('label.created', { defaultValue: '생성' })}</option>
                <option value="IN_PROGRESS">${i18next.t('label.in_progress', { defaultValue: '진행중' })}</option>
                <option value="COMPLETED">${i18next.t('label.completed', { defaultValue: '완료' })}</option>
                <option value="CANCELLED">${i18next.t('label.cancelled', { defaultValue: '취소' })}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.pack_status', { defaultValue: '포장상태' })}</label>
              <select .value="${this.searchParams.pack_status}"
                @change="${e => this._updateSearch('pack_status', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="CREATED">${i18next.t('label.created', { defaultValue: '생성' })}</option>
                <option value="IN_PROGRESS">${i18next.t('label.in_progress', { defaultValue: '진행중' })}</option>
                <option value="COMPLETED">${i18next.t('label.completed', { defaultValue: '완료' })}</option>
                <option value="LABEL_PRINTED">${i18next.t('label.label_printed', { defaultValue: '송장출력' })}</option>
                <option value="MANIFESTED">${i18next.t('label.manifested', { defaultValue: '매니페스트' })}</option>
                <option value="SHIPPED">${i18next.t('label.shipped', { defaultValue: '출하완료' })}</option>
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
          </div>
        </section>

        <!-- 데이터 테이블 -->
        <section class="table-section">
          ${this.loading
        ? html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
        : this.items.length === 0
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
                        <th>${i18next.t('label.pick_task_no', { defaultValue: '피킹번호' })}</th>
                        <th>${i18next.t('label.wave_no', { defaultValue: '웨이브' })}</th>
                        <th>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</th>
                        <th class="center">${i18next.t('label.pick_type', { defaultValue: '피킹유형' })}</th>
                        <th class="right">${i18next.t('label.plan_total', { defaultValue: '계획수량' })}</th>
                        <th class="right">${i18next.t('label.pick_result_qty', { defaultValue: '피킹실적' })}</th>
                        <th class="right">${i18next.t('label.short_total', { defaultValue: '부족수량' })}</th>
                        <th class="center">${i18next.t('label.pick_status', { defaultValue: '피킹상태' })}</th>
                        <th>${i18next.t('label.pack_order_no', { defaultValue: '포장번호' })}</th>
                        <th class="right">${i18next.t('label.total_box', { defaultValue: '박스수' })}</th>
                        <th class="center">${i18next.t('label.dock_cd', { defaultValue: '도크' })}</th>
                        <th class="center">${i18next.t('label.pack_status', { defaultValue: '포장상태' })}</th>
                        <th class="center">${i18next.t('label.shipped_at', { defaultValue: '출하일시' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.items.map(row => html`
                        <tr>
                          <td>
                            <span class="link" @click="${() => this._openTaskDetail(row.id)}">${row.pick_task_no}</span>
                          </td>
                          <td>${row.wave_no || '-'}</td>
                          <td>${row.shipment_no || '-'}</td>
                          <td class="center">
                            <span class="badge type-badge">${row.pick_type || '-'}</span>
                          </td>
                          <td class="right">${this._formatNumber(row.plan_total)}</td>
                          <td class="right">${this._formatNumber(row.pick_result_qty)}</td>
                          <td class="right">
                            ${row.short_total > 0
              ? html`<span class="short-qty">${this._formatNumber(row.short_total)}</span>`
              : this._formatNumber(row.short_total)}
                          </td>
                          <td class="center">
                            ${row.pick_status
              ? html`<span class="badge pick-${row.pick_status.toLowerCase()}">${this._pickStatusLabel(row.pick_status)}</span>`
              : '-'}
                          </td>
                          <td>
                            ${row.pack_order_no
              ? row.pack_order_no
              : row.pick_type === 'TOTAL'
                ? html`<span class="empty-hint">${i18next.t('label.pack_not_created', { defaultValue: '포장 미생성' })}</span>`
                : '-'}
                          </td>
                          <td class="right">${this._formatNumber(row.total_box)}</td>
                          <td class="center">${row.dock_cd || '-'}</td>
                          <td class="center">
                            ${row.pack_status
              ? html`<span class="badge pack-${row.pack_status.toLowerCase()}">${this._packStatusLabel(row.pack_status)}</span>`
              : '-'}
                          </td>
                          <td class="center">${row.shipped_at || '-'}</td>
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

  /** 데이터 일괄 조회 */
  async _fetchData() {
    try {
      this.loading = true
      await this._fetchItems()
    } catch (error) {
      console.error('풀필먼트 진행 현황 데이터 로딩 실패:', error)
    } finally {
      this.loading = false
    }
  }

  /** 진행 현황 목록 조회 */
  async _fetchItems() {
    try {
      let filters = []
      if (this.searchParams.order_date_from) {
        filters.push({ name: 'order_date', operator: 'gte', value: this.searchParams.order_date_from })
      }
      if (this.searchParams.order_date_to) {
        filters.push({ name: 'order_date', operator: 'lte', value: this.searchParams.order_date_to })
      }
      if (this.searchParams.wave_no) {
        filters.push({ name: 'wave_no', operator: 'like', value: this.searchParams.wave_no })
      }
      if (this.searchParams.shipment_no) {
        filters.push({ name: 'shipment_no', operator: 'like', value: this.searchParams.shipment_no })
      }
      if (this.searchParams.pick_status) {
        filters.push({ name: 'pick_status', value: this.searchParams.pick_status })
      }
      if (this.searchParams.pack_status) {
        filters.push({ name: 'pack_status', value: this.searchParams.pack_status })
      }
      if (this.searchParams.pick_type) {
        filters.push({ name: 'pick_type', value: this.searchParams.pick_type })
      }

      const queryStr = encodeURIComponent(JSON.stringify(filters))
      const sortStr = encodeURIComponent(JSON.stringify([{ name: 'pick_task_no', desc: true }]))
      const url = `fulfillment_progress?page=${this.currentPage}&limit=${this.pageSize}&query=${queryStr}&sort=${sortStr}`

      const response = await ServiceUtil.restGet(url)
      if (response) {
        this.items = response.items || []
        this.totalCount = response.total || 0
      }
    } catch (error) {
      console.error('풀필먼트 진행 현황 목록 조회 실패:', error)
      this.items = []
      this.totalCount = 0
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
      wave_no: '',
      shipment_no: '',
      pick_status: '',
      pack_status: '',
      pick_type: ''
    }
    this.currentPage = 1
    this._fetchData()
  }

  /** 검색 실행 (첫 페이지부터 재조회) */
  _search() {
    this.currentPage = 1
    this._fetchData()
  }

  /** 피킹 상세 팝업 열기 */
  _openTaskDetail(id) {
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

  /** 피킹 상태 한글 라벨 반환 */
  _pickStatusLabel(status) {
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      IN_PROGRESS: i18next.t('label.in_progress', { defaultValue: '진행중' }),
      COMPLETED: i18next.t('label.completed', { defaultValue: '완료' }),
      CANCELLED: i18next.t('label.cancelled', { defaultValue: '취소' })
    }
    return labels[status] || status
  }

  /** 포장 상태 한글 라벨 반환 */
  _packStatusLabel(status) {
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      IN_PROGRESS: i18next.t('label.in_progress', { defaultValue: '진행중' }),
      COMPLETED: i18next.t('label.completed', { defaultValue: '완료' }),
      LABEL_PRINTED: i18next.t('label.label_printed', { defaultValue: '송장출력' }),
      MANIFESTED: i18next.t('label.manifested', { defaultValue: '매니페스트' }),
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
    this._fetchItems()
  }
}

window.customElements.define('fulfillment-progress', FulfillmentProgress)
