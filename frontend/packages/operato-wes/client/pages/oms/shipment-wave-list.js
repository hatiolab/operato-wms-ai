import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { openPopup } from '@operato/layout'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'

import './auto-wave-create-popup'
import './shipment-wave-detail'

/**
 * 웨이브 관리 화면
 *
 * 웨이브를 조회·생성하고, 확정(릴리스)하여 Fulfillment/WCS에 인계
 */
class ShipmentWaveList extends localize(i18next)(PageView) {
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

        .btn-success {
          background: #7B1FA2;
          color: white;
        }

        .btn-success:hover {
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
        .summary-card.released { border-left: 4px solid #303F9F; }
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
        .badge.released { background: #E8EAF6; color: #303F9F; }
        .badge.completed { background: #E8F5E9; color: #2E7D32; }
        .badge.cancelled { background: #FFEBEE; color: #D32F2F; }

        /* 진행률 바 */
        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: var(--md-sys-color-outline-variant);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar .fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #7B1FA2, #4CAF50);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
          min-width: 36px;
          text-align: right;
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
      waves: Array,
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
    this.waves = []
    this.statusSummary = { CREATED: 0, RELEASED: 0, COMPLETED: 0, CANCELLED: 0 }
    this.searchParams = {
      waveDateFrom: this._todayStr(),
      waveDateTo: this._todayStr(),
      status: '',
      pickType: '',
      carrierCd: ''
    }
    this.currentPage = 1
    this.totalCount = 0
    this.pageSize = 20
  }

  get context() {
    return { title: i18next.t('title.shipment-wave-list', { defaultValue: '웨이브 관리' }) }
  }

  render() {
    return html`
      <div class="page-container">
        <h2>${i18next.t('title.shipment-wave-list', { defaultValue: '웨이브 관리' })}</h2>

        <!-- 검색 조건 -->
        <section class="search-section">
          <div class="search-form">
            <div class="form-group">
              <label>${i18next.t('label.wave_date_from', { defaultValue: '웨이브일(시작)' })}</label>
              <input type="date" .value="${this.searchParams.waveDateFrom}"
                @change="${e => this._updateSearch('waveDateFrom', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.wave_date_to', { defaultValue: '웨이브일(종료)' })}</label>
              <input type="date" .value="${this.searchParams.waveDateTo}"
                @change="${e => this._updateSearch('waveDateTo', e.target.value)}" />
            </div>
            <div class="form-group">
              <label>${i18next.t('label.status', { defaultValue: '상태' })}</label>
              <select .value="${this.searchParams.status}"
                @change="${e => this._updateSearch('status', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="CREATED">${i18next.t('label.created', { defaultValue: '생성' })}</option>
                <option value="RELEASED">${i18next.t('label.released', { defaultValue: '확정' })}</option>
                <option value="COMPLETED">${i18next.t('label.completed', { defaultValue: '완료' })}</option>
                <option value="CANCELLED">${i18next.t('label.cancelled', { defaultValue: '취소' })}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.pick_type', { defaultValue: '피킹유형' })}</label>
              <select .value="${this.searchParams.pickType}"
                @change="${e => this._updateSearch('pickType', e.target.value)}">
                <option value="">${i18next.t('label.all', { defaultValue: '전체' })}</option>
                <option value="TOTAL">TOTAL</option>
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="ZONE">ZONE</option>
              </select>
            </div>
            <div class="form-group">
              <label>${i18next.t('label.carrier_cd', { defaultValue: '택배사' })}</label>
              <input type="text" placeholder="${i18next.t('label.carrier_cd', { defaultValue: '택배사 코드' })}"
                .value="${this.searchParams.carrierCd}"
                @change="${e => this._updateSearch('carrierCd', e.target.value)}" />
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
          <div class="summary-card released" @click="${() => this._filterByStatus('RELEASED')}">
            <div class="label">${i18next.t('label.released', { defaultValue: '확정' })}</div>
            <div class="count">${this.statusSummary.RELEASED || 0}</div>
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
          <button class="btn btn-success" @click="${this._openCreateModal}">
            ${i18next.t('button.auto_wave_create', { defaultValue: '자동 웨이브 생성' })}
          </button>
        </section>

        <!-- 데이터 테이블 -->
        <section class="table-section">
          ${this.loading
        ? html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
        : this.waves.length === 0
          ? html`
                  <div class="empty-state">
                    <div class="icon">🌊</div>
                    <div class="message">${i18next.t('label.no_data', { defaultValue: '조회 결과가 없습니다' })}</div>
                  </div>
                `
          : html`
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}</th>
                        <th class="center">${i18next.t('label.wave_date', { defaultValue: '일자' })}</th>
                        <th class="center">${i18next.t('label.wave_seq', { defaultValue: '순번' })}</th>
                        <th class="center">${i18next.t('label.pick_type', { defaultValue: '피킹유형' })}</th>
                        <th class="center">${i18next.t('label.exe_type', { defaultValue: '실행유형' })}</th>
                        <th>${i18next.t('label.carrier_cd', { defaultValue: '택배사' })}</th>
                        <th class="right">${i18next.t('label.plan_order_count', { defaultValue: '계획주문수' })}</th>
                        <th class="right">${i18next.t('label.plan_sku_count', { defaultValue: '계획SKU수' })}</th>
                        <th class="right">${i18next.t('label.plan_total_qty', { defaultValue: '계획수량' })}</th>
                        <th class="right">${i18next.t('label.result_order_count', { defaultValue: '실적주문수' })}</th>
                        <th class="right">${i18next.t('label.result_total_qty', { defaultValue: '실적수량' })}</th>
                        <th>${i18next.t('label.progress', { defaultValue: '진행률' })}</th>
                        <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.waves.map(wave => {
            const progress = this._calcProgress(wave)
            return html`
                          <tr>
                            <td>
                              <span class="link" @click="${() => this._navigateToDetail(wave.id)}">${wave.waveNo}</span>
                            </td>
                            <td class="center">${wave.waveDate}</td>
                            <td class="center">${wave.waveSeq}</td>
                            <td class="center">
                              <span class="badge ${(wave.pickType || '').toLowerCase()}">${wave.pickType || '-'}</span>
                            </td>
                            <td class="center">
                              <span class="badge">${wave.exeType || '-'}</span>
                            </td>
                            <td>${wave.carrierCd || '-'}</td>
                            <td class="right">${this._formatNumber(wave.planOrderCount)}</td>
                            <td class="right">${this._formatNumber(wave.planSkuCount)}</td>
                            <td class="right">${this._formatNumber(wave.planTotalQty)}</td>
                            <td class="right">${this._formatNumber(wave.resultOrderCount)}</td>
                            <td class="right">${this._formatNumber(wave.resultTotalQty)}</td>
                            <td>
                              <div class="progress-bar-container">
                                <div class="progress-bar">
                                  <div class="fill" style="width: ${progress}%"></div>
                                </div>
                                <span class="progress-text">${progress}%</span>
                              </div>
                            </td>
                            <td class="center">
                              <span class="badge ${(wave.status || '').toLowerCase()}">${this._statusLabel(wave.status)}</span>
                            </td>
                          </tr>
                        `
          })}
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

  /** 자동 웨이브 생성 팝업 열기 */
  _openWaveNewPopup() {
    openPopup(
      html`<auto-wave-create-popup
        @wave-created="${() => {
          this._onWaveCreated()
        }}"
      ></auto-wave-create-popup>`,
      {
        backdrop: true,
        size: 'large',
        title: i18next.t('title.auto_wave_create', { defaultValue: '자동 웨이브 생성' })
      }
    )
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
        this._fetchWaves(),
        this._fetchStatusSummary()
      ])
    } catch (error) {
      console.error('웨이브 데이터 로딩 실패:', error)
    } finally {
      this.loading = false
    }
  }

  async _fetchWaves() {
    try {
      let queryParts = []
      queryParts.push(`[{"name":"waveDate","operator":"gte","value":"${this.searchParams.waveDateFrom}"}]`)

      let filters = []
      if (this.searchParams.waveDateFrom) {
        filters.push({ name: 'waveDate', operator: 'gte', value: this.searchParams.waveDateFrom })
      }
      if (this.searchParams.waveDateTo) {
        filters.push({ name: 'waveDate', operator: 'lte', value: this.searchParams.waveDateTo })
      }
      if (this.searchParams.status) {
        filters.push({ name: 'status', value: this.searchParams.status })
      }
      if (this.searchParams.pickType) {
        filters.push({ name: 'pickType', value: this.searchParams.pickType })
      }
      if (this.searchParams.carrierCd) {
        filters.push({ name: 'carrierCd', operator: 'like', value: this.searchParams.carrierCd })
      }

      const queryStr = encodeURIComponent(JSON.stringify(filters))
      const sortStr = encodeURIComponent(JSON.stringify([{ name: 'waveDate', desc: true }, { name: 'waveSeq', desc: true }]))
      const url = `shipment_waves?page=${this.currentPage}&limit=${this.pageSize}&query=${queryStr}&sort=${sortStr}`

      const response = await ServiceUtil.restGet(url)
      if (response) {
        this.waves = response.items || []
        this.totalCount = response.total || 0
      }
    } catch (error) {
      console.error('웨이브 목록 조회 실패:', error)
      this.waves = []
      this.totalCount = 0
    }
  }

  async _fetchStatusSummary() {
    try {
      const waveDate = this.searchParams.waveDateFrom || this._todayStr()
      const data = await ServiceUtil.restGet(`oms_dashboard/wave_stats?wave_date=${waveDate}`)
      if (data) {
        this.statusSummary = {
          CREATED: data.CREATED || 0,
          RELEASED: data.RELEASED || 0,
          COMPLETED: data.COMPLETED || 0,
          CANCELLED: data.CANCELLED || 0
        }
      }
    } catch (error) {
      console.error('웨이브 상태 요약 조회 실패:', error)
    }
  }

  _updateSearch(field, value) {
    this.searchParams = { ...this.searchParams, [field]: value }
  }

  _resetSearch() {
    this.searchParams = {
      waveDateFrom: this._todayStr(),
      waveDateTo: this._todayStr(),
      status: '',
      pickType: '',
      carrierCd: ''
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

  _openCreateModal() {
    this._openWaveNewPopup()
  }

  _onWaveCreated() {
    this._fetchData()
  }

  _navigateToDetail(id) {
    openPopup(
      html`<shipment-wave-detail
        .waveId="${id}"
        @wave-updated="${() => this._fetchData()}"
      ></shipment-wave-detail>`,
      {
        backdrop: true,
        size: 'large',
        title: i18next.t('title.wave_detail', { defaultValue: '웨이브 상세' })
      }
    )
  }

  _calcProgress(wave) {
    const plan = wave.planOrderCount || 0
    const result = wave.resultOrderCount || 0
    if (plan === 0) return 0
    return Math.min(100, Math.round((result / plan) * 100))
  }

  _statusLabel(status) {
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      RELEASED: i18next.t('label.released', { defaultValue: '확정' }),
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
    this._fetchWaves()
  }
}

window.customElements.define('shipment-wave-list', ShipmentWaveList)
