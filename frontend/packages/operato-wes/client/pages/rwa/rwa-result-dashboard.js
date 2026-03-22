import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

class RwaResultDashboard extends localize(i18next)(PageView) {
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

        /* 대시보드 레이아웃 */
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-large, 24px);
        }

        /* 섹션 타이틀 */
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--md-sys-color-on-background);
          margin-bottom: var(--spacing-medium, 16px);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* 필터 바 */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: 16px 24px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-group label {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
        }

        .filter-group input[type='date'] {
          padding: 6px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface);
        }

        .filter-separator {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .btn-search {
          padding: 8px 20px;
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .btn-search:hover {
          opacity: 0.9;
          box-shadow: var(--box-shadow-normal, 0 4px 8px rgba(0, 0, 0, 0.15));
        }

        /* KPI 카드 */
        .kpi-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--spacing-medium, 16px);
        }

        .kpi-card {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
          transition: all 0.2s ease;
        }

        .kpi-card:hover {
          box-shadow: var(--box-shadow-normal, 0 4px 8px rgba(0, 0, 0, 0.15));
          transform: translateY(-2px);
        }

        .kpi-card .label {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 8px;
        }

        .kpi-card .value {
          font-size: 28px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
        }

        .kpi-card .unit {
          font-size: 14px;
          font-weight: 400;
          color: var(--md-sys-color-on-surface-variant);
          margin-left: 4px;
        }

        .kpi-card.total {
          border-left: 4px solid #2196f3;
        }
        .kpi-card.inspected {
          border-left: 4px solid #ff9800;
        }
        .kpi-card.disposed {
          border-left: 4px solid #9c27b0;
        }
        .kpi-card.process-time {
          border-left: 4px solid #4caf50;
        }

        /* 차트 섹션 */
        .chart-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .chart-container {
          width: 100%;
          height: 280px;
          position: relative;
        }

        .chart-container.trend {
          height: 300px;
        }

        .chart-container canvas {
          max-height: 100%;
        }

        /* 차트 행 (검수 결과 + 처분 유형별) */
        .charts-row {
          display: flex;
          gap: var(--spacing-large, 24px);
        }

        .charts-row .chart-section:first-child {
          flex: 1;
        }

        .charts-row .chart-section:last-child {
          flex: 2;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
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
          .kpi-cards {
            grid-template-columns: repeat(2, 1fr);
          }
          .charts-row {
            flex-direction: column;
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      startDate: String,
      endDate: String,
      orders: Array,
      items: Array,
      kpiData: Object,
      typeStats: Object,
      inspectionResults: Object,
      dispositionStats: Object,
      dailyTrend: Array
    }
  }

  constructor() {
    super()
    this.loading = true
    this.orders = []
    this.items = []
    this.kpiData = {
      totalCount: 0,
      inspectedCount: 0,
      disposedCount: 0,
      avgProcessDays: 0
    }
    this.typeStats = {}
    this.inspectionResults = { goodQty: 0, defectQty: 0 }
    this.dispositionStats = {}
    this.dailyTrend = []

    // 기본 기간: 이번달 1일 ~ 오늘
    const now = new Date()
    this.startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    this.endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    this._typeChart = null
    this._inspectionChart = null
    this._dispositionChart = null
    this._trendChart = null
  }

  get context() {
    return { title: TermsUtil.tMenu('RwaResultDashboard') }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">데이터 로딩 중...</div>`
    }

    return html`
      <div class="dashboard-container">
        <!-- 필터 바 -->
        ${this._renderFilterBar()}

        <!-- KPI 카드 -->
        <section>
          <h3 class="section-title">📊 핵심 지표 (KPI)</h3>
          ${this._renderKpiCards()}
        </section>

        <!-- 차트 영역 -->
        ${this.orders.length > 0
          ? html`
              <!-- 반품 유형별 현황 -->
              <section class="chart-section">
                <h3 class="section-title">📈 반품 유형별 현황</h3>
                <div class="chart-container">
                  <canvas id="typeChart"></canvas>
                </div>
              </section>

              <!-- 검수 결과 + 처분 유형별 -->
              <div class="charts-row">
                <section class="chart-section">
                  <h3 class="section-title">🔍 검수 결과</h3>
                  <div class="chart-container">
                    <canvas id="inspectionChart"></canvas>
                  </div>
                </section>
                <section class="chart-section">
                  <h3 class="section-title">🗂️ 처분 유형별 현황</h3>
                  <div class="chart-container">
                    <canvas id="dispositionChart"></canvas>
                  </div>
                </section>
              </div>

              <!-- 일별 추이 -->
              <section class="chart-section">
                <h3 class="section-title">📉 일별 추이</h3>
                <div class="chart-container trend">
                  <canvas id="trendChart"></canvas>
                </div>
              </section>
            `
          : html`<div class="empty-state">조회 기간 내 반품 주문이 없습니다.</div>`}
      </div>
    `
  }

  /** 필터 바 렌더링 */
  _renderFilterBar() {
    return html`
      <div class="filter-bar">
        <div class="filter-group">
          <label>시작일</label>
          <input type="date" .value="${this.startDate}" @change="${e => this._onDateChange('startDate', e)}" />
        </div>
        <span class="filter-separator">~</span>
        <div class="filter-group">
          <label>종료일</label>
          <input type="date" .value="${this.endDate}" @change="${e => this._onDateChange('endDate', e)}" />
        </div>
        <button class="btn-search" @click="${this._onSearch}">조회</button>
      </div>
    `
  }

  /** KPI 카드 렌더링 */
  _renderKpiCards() {
    const kpi = this.kpiData
    return html`
      <div class="kpi-cards">
        <div class="kpi-card total">
          <div class="label">총 반품 건수</div>
          <div class="value">${kpi.totalCount}<span class="unit">건</span></div>
        </div>
        <div class="kpi-card inspected">
          <div class="label">검수 완료</div>
          <div class="value">${kpi.inspectedCount}<span class="unit">건</span></div>
        </div>
        <div class="kpi-card disposed">
          <div class="label">처분 완료</div>
          <div class="value">${kpi.disposedCount}<span class="unit">건</span></div>
        </div>
        <div class="kpi-card process-time">
          <div class="label">평균 처리 시간</div>
          <div class="value">${kpi.avgProcessDays}<span class="unit">일</span></div>
        </div>
      </div>
    `
  }

  /* ──────────────────────────────────── Lifecycle ──────────────────────────────────── */

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchData()
    }
  }

  pageDisposed(lifecycle) {
    if (this._typeChart) {
      this._typeChart.destroy()
      this._typeChart = null
    }
    if (this._inspectionChart) {
      this._inspectionChart.destroy()
      this._inspectionChart = null
    }
    if (this._dispositionChart) {
      this._dispositionChart.destroy()
      this._dispositionChart = null
    }
    if (this._trendChart) {
      this._trendChart.destroy()
      this._trendChart = null
    }
  }

  /* ──────────────────────────────────── Data Fetching ──────────────────────────────────── */

  async _fetchData() {
    try {
      this.loading = true

      // 1. 날짜 범위 내 모든 주문 조회
      await this._fetchOrders()

      // 2. 주문별 항목 조회
      await this._fetchItemsForOrders()

      // 3. 데이터 집계
      this._aggregateData()

      this.loading = false

      // 4. 차트 렌더링 (DOM 업데이트 후)
      this.updateComplete.then(() => this._renderAllCharts())
    } catch (err) {
      console.error('실적 분석 데이터 로딩 실패:', err)
      this.loading = false
    }
  }

  /** 날짜 범위 내 주문 조회 */
  async _fetchOrders() {
    try {
      const allOrders = await ServiceUtil.restGet('rwa_trx/rwa_orders')
      // 날짜 범위 필터
      this.orders = (allOrders || []).filter(order => {
        const reqDate = order.rwa_req_date
        if (!reqDate) return false
        return reqDate >= this.startDate && reqDate <= this.endDate
      })
    } catch (err) {
      console.error('주문 목록 조회 실패:', err)
      this.orders = []
    }
  }

  /** 각 주문의 항목 병렬 조회 */
  async _fetchItemsForOrders() {
    if (!this.orders.length) {
      this.items = []
      return
    }

    try {
      const allItems = await Promise.all(
        this.orders.map(order => ServiceUtil.restGet(`rwa_trx/rwa_orders/${order.id}/items`).catch(() => []))
      )
      this.items = allItems.flat()
    } catch (err) {
      console.error('항목 데이터 조회 실패:', err)
      this.items = []
    }
  }

  /* ──────────────────────────────────── Data Aggregation ──────────────────────────────────── */

  _aggregateData() {
    this._computeKPIs()
    this._aggregateByType()
    this._aggregateInspectionResults()
    this._aggregateByDisposition()
    this._aggregateByDate()
  }

  /** KPI 계산 */
  _computeKPIs() {
    const totalCount = this.orders.length
    const inspectedCount = this.orders.filter(o =>
      ['INSPECTED', 'DISPOSED', 'COMPLETED', 'CLOSED'].includes(o.status)
    ).length
    const disposedCount = this.orders.filter(o => ['DISPOSED', 'COMPLETED', 'CLOSED'].includes(o.status)).length

    // 평균 처리 시간 (요청일 → 완료일)
    let totalProcessDays = 0
    let processedCount = 0
    this.orders.forEach(order => {
      if (order.rwa_req_date && order.rwa_end_date) {
        const reqDate = new Date(order.rwa_req_date)
        const endDate = new Date(order.rwa_end_date)
        const diffDays = (endDate - reqDate) / (1000 * 60 * 60 * 24)
        totalProcessDays += diffDays
        processedCount++
      }
    })
    const avgProcessDays = processedCount > 0 ? (totalProcessDays / processedCount).toFixed(1) : 0

    this.kpiData = {
      totalCount,
      inspectedCount,
      disposedCount,
      avgProcessDays
    }
  }

  /** 반품 유형별 집계 */
  _aggregateByType() {
    const typeMap = {}
    this.orders.forEach(order => {
      const type = order.rwa_type || 'OTHER'
      typeMap[type] = (typeMap[type] || 0) + 1
    })
    this.typeStats = typeMap
  }

  /** 검수 결과 집계 (양품/불량) */
  _aggregateInspectionResults() {
    let goodQty = 0
    let defectQty = 0

    this.items.forEach(item => {
      goodQty += item.good_qty || 0
      defectQty += item.defect_qty || 0
    })

    this.inspectionResults = { goodQty, defectQty }
  }

  /** 처분 유형별 집계 */
  _aggregateByDisposition() {
    const dispMap = {}
    this.items.forEach(item => {
      if (item.disposition_type) {
        dispMap[item.disposition_type] = (dispMap[item.disposition_type] || 0) + (item.disposed_qty || 0)
      }
    })
    this.dispositionStats = dispMap
  }

  /** 일별 추이 집계 */
  _aggregateByDate() {
    const dateMap = {}

    // 반품 건수 (요청일 기준)
    this.orders.forEach(order => {
      const date = order.rwa_req_date
      if (!date) return
      if (!dateMap[date]) {
        dateMap[date] = { date, requestCount: 0, completedCount: 0 }
      }
      dateMap[date].requestCount++
    })

    // 처리 완료 건수 (완료일 기준)
    this.orders.forEach(order => {
      const date = order.rwa_end_date
      if (!date) return
      if (!dateMap[date]) {
        dateMap[date] = { date, requestCount: 0, completedCount: 0 }
      }
      dateMap[date].completedCount++
    })

    this.dailyTrend = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  }

  /* ──────────────────────────────────── Chart Rendering ──────────────────────────────────── */

  _renderAllCharts() {
    this._renderTypeChart()
    this._renderInspectionChart()
    this._renderDispositionChart()
    this._renderTrendChart()
  }

  /** 반품 유형별 Bar 차트 */
  _renderTypeChart() {
    const canvas = this.shadowRoot.querySelector('#typeChart')
    if (!canvas) return
    if (this._typeChart) this._typeChart.destroy()

    const labels = Object.keys(this.typeStats).map(type => this._rwaTypeLabel(type))
    const data = Object.values(this.typeStats)
    const colors = Object.keys(this.typeStats).map(type => this._rwaTypeColor(type))

    const ctx = canvas.getContext('2d')
    this._typeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '반품 건수',
            data,
            backgroundColor: colors,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => `${context.label}: ${context.parsed.y}건`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: value => `${value}건` }
          }
        }
      }
    })
  }

  /** 검수 결과 Doughnut 차트 */
  _renderInspectionChart() {
    const canvas = this.shadowRoot.querySelector('#inspectionChart')
    if (!canvas) return
    if (this._inspectionChart) this._inspectionChart.destroy()

    const { goodQty, defectQty } = this.inspectionResults
    if (goodQty === 0 && defectQty === 0) return

    const ctx = canvas.getContext('2d')
    this._inspectionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['양품', '불량'],
        datasets: [
          {
            data: [goodQty, defectQty],
            backgroundColor: ['#4CAF50', '#F44336'],
            borderWidth: 2,
            borderColor: '#fff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: context => {
                const total = goodQty + defectQty
                const pct = ((context.parsed / total) * 100).toFixed(1)
                return `${context.label}: ${context.parsed} EA (${pct}%)`
              }
            }
          }
        }
      }
    })
  }

  /** 처분 유형별 Bar 차트 */
  _renderDispositionChart() {
    const canvas = this.shadowRoot.querySelector('#dispositionChart')
    if (!canvas) return
    if (this._dispositionChart) this._dispositionChart.destroy()

    const labels = Object.keys(this.dispositionStats).map(type => this._dispositionTypeLabel(type))
    const data = Object.values(this.dispositionStats)
    const colors = Object.keys(this.dispositionStats).map(type => this._dispositionTypeColor(type))

    if (data.length === 0) return

    const ctx = canvas.getContext('2d')
    this._dispositionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '처분 수량',
            data,
            backgroundColor: colors,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => `${context.label}: ${context.parsed.y} EA`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: value => `${value} EA` }
          }
        }
      }
    })
  }

  /** 일별 추이 Line 차트 */
  _renderTrendChart() {
    const canvas = this.shadowRoot.querySelector('#trendChart')
    if (!canvas) return
    if (this._trendChart) this._trendChart.destroy()

    if (this.dailyTrend.length === 0) return

    const labels = this.dailyTrend.map(d => {
      const parts = d.date.split('-')
      return `${parts[1]}/${parts[2]}`
    })

    const ctx = canvas.getContext('2d')
    this._trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '반품 건수',
            data: this.dailyTrend.map(d => d.requestCount),
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: '처리 완료',
            data: this.dailyTrend.map(d => d.completedCount),
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: context => `${context.dataset.label}: ${context.parsed.y}건`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: value => `${value}건` }
          }
        }
      }
    })
  }

  /* ──────────────────────────────────── Event Handlers ──────────────────────────────────── */

  _onDateChange(field, e) {
    this[field] = e.target.value
  }

  _onSearch() {
    this._fetchData()
  }

  /* ──────────────────────────────────── Utilities ──────────────────────────────────── */

  _rwaTypeLabel(type) {
    const map = {
      CUSTOMER_RETURN: '고객 반품',
      VENDOR_RETURN: '공급사 반품',
      DEFECT_RETURN: '불량품',
      STOCK_ADJUST: '재고조정',
      EXPIRED_RETURN: '유통기한',
      OTHER: '기타'
    }
    return map[type] || type
  }

  _rwaTypeColor(type) {
    const map = {
      CUSTOMER_RETURN: '#2196F3',
      VENDOR_RETURN: '#4CAF50',
      DEFECT_RETURN: '#FF9800',
      STOCK_ADJUST: '#9C27B0',
      EXPIRED_RETURN: '#F44336',
      OTHER: '#9E9E9E'
    }
    return map[type] || '#9E9E9E'
  }

  _dispositionTypeLabel(type) {
    const map = {
      RESTOCK: '재입고',
      SCRAP: '폐기',
      REPAIR: '수리',
      RETURN_VENDOR: '반송',
      DONATION: '기부'
    }
    return map[type] || type
  }

  _dispositionTypeColor(type) {
    const map = {
      RESTOCK: '#4CAF50',
      SCRAP: '#F44336',
      REPAIR: '#FF9800',
      RETURN_VENDOR: '#2196F3',
      DONATION: '#9C27B0'
    }
    return map[type] || '#9E9E9E'
  }
}

window.customElements.define('rwa-result-dashboard', RwaResultDashboard)
