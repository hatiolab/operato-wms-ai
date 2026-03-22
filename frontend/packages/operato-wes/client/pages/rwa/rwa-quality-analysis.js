import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

class RwaQualityAnalysis extends localize(i18next)(PageView) {
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

        .chart-container.sku-rate {
          height: 350px;
        }

        .chart-container canvas {
          max-height: 100%;
        }

        /* 차트 행 (불량 유형별 + 처분별 분포) */
        .charts-row {
          display: flex;
          gap: var(--spacing-large, 24px);
        }

        .charts-row .chart-section:first-child {
          flex: 2;
        }

        .charts-row .chart-section:last-child {
          flex: 1;
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
      defectTypeStats: Object,
      defectDispositionStats: Object,
      defectTrend: Array,
      skuDefectRates: Array
    }
  }

  constructor() {
    super()
    this.loading = true
    this.orders = []
    this.items = []
    this.defectTypeStats = {}
    this.defectDispositionStats = {}
    this.defectTrend = []
    this.skuDefectRates = []

    // 기본 기간: 이번달 1일 ~ 오늘
    const now = new Date()
    this.startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    this.endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    this._defectTypeChart = null
    this._defectDispChart = null
    this._defectTrendChart = null
    this._skuRateChart = null
  }

  get context() {
    return { title: TermsUtil.tMenu('RwaQualityAnalysis') }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">데이터 로딩 중...</div>`
    }

    return html`
      <div class="dashboard-container">
        <!-- 필터 바 -->
        ${this._renderFilterBar()}

        <!-- 차트 영역 -->
        ${this.orders.length > 0
          ? html`
              <!-- 불량 유형별 + 처분별 분포 -->
              <div class="charts-row">
                <section class="chart-section">
                  <h3 class="section-title">⚠️ 불량 유형별 현황</h3>
                  <div class="chart-container">
                    <canvas id="defectTypeChart"></canvas>
                  </div>
                </section>
                <section class="chart-section">
                  <h3 class="section-title">🗂️ 처분별 불량품 분포</h3>
                  <div class="chart-container">
                    <canvas id="defectDispChart"></canvas>
                  </div>
                </section>
              </div>

              <!-- 불량 추이 -->
              <section class="chart-section">
                <h3 class="section-title">📉 불량 추이 (건수 + 비율)</h3>
                <div class="chart-container trend">
                  <canvas id="defectTrendChart"></canvas>
                </div>
              </section>

              <!-- SKU별 반품률 Top 10 -->
              <section class="chart-section">
                <h3 class="section-title">📊 SKU별 반품률 Top 10</h3>
                <div class="chart-container sku-rate">
                  <canvas id="skuRateChart"></canvas>
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

  /* ──────────────────────────────────── Lifecycle ──────────────────────────────────── */

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchData()
    }
  }

  pageDisposed(lifecycle) {
    if (this._defectTypeChart) {
      this._defectTypeChart.destroy()
      this._defectTypeChart = null
    }
    if (this._defectDispChart) {
      this._defectDispChart.destroy()
      this._defectDispChart = null
    }
    if (this._defectTrendChart) {
      this._defectTrendChart.destroy()
      this._defectTrendChart = null
    }
    if (this._skuRateChart) {
      this._skuRateChart.destroy()
      this._skuRateChart = null
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
      console.error('품질 분석 데이터 로딩 실패:', err)
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
    this._aggregateByDefectType()
    this._aggregateDefectByDisposition()
    this._aggregateDefectTrend()
    this._aggregateSKUDefectRates()
  }

  /** 불량 유형별 집계 */
  _aggregateByDefectType() {
    const typeMap = {}
    this.items.forEach(item => {
      if (item.defect_type && item.defect_qty > 0) {
        typeMap[item.defect_type] = (typeMap[item.defect_type] || 0) + item.defect_qty
      }
    })
    this.defectTypeStats = typeMap
  }

  /** 처분별 불량품 분포 */
  _aggregateDefectByDisposition() {
    const dispMap = {}
    this.items.forEach(item => {
      if (item.disposition_type && item.defect_qty > 0) {
        dispMap[item.disposition_type] = (dispMap[item.disposition_type] || 0) + item.defect_qty
      }
    })
    this.defectDispositionStats = dispMap
  }

  /** 일별 불량 추이 (건수 + 불량률) */
  _aggregateDefectTrend() {
    const dateMap = {}

    // 주문별로 요청일과 검수 결과 매핑
    this.orders.forEach(order => {
      const date = order.rwa_req_date
      if (!date) return
      if (!dateMap[date]) {
        dateMap[date] = { date, defectQty: 0, totalQty: 0 }
      }
    })

    // 항목별 집계
    const orderDateMap = {}
    this.orders.forEach(o => {
      orderDateMap[o.id] = o.rwa_req_date
    })

    this.items.forEach(item => {
      const date = orderDateMap[item.rwa_order_id]
      if (!date || !dateMap[date]) return

      dateMap[date].defectQty += item.defect_qty || 0
      dateMap[date].totalQty += (item.good_qty || 0) + (item.defect_qty || 0)
    })

    // 불량률 계산
    Object.values(dateMap).forEach(entry => {
      entry.defectRate = entry.totalQty > 0 ? ((entry.defectQty / entry.totalQty) * 100).toFixed(1) : 0
    })

    this.defectTrend = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  }

  /** SKU별 반품률 Top 10 */
  _aggregateSKUDefectRates() {
    const skuMap = {}

    this.items.forEach(item => {
      const skuCd = item.sku_cd
      if (!skuCd) return

      if (!skuMap[skuCd]) {
        skuMap[skuCd] = {
          skuCd,
          skuNm: item.sku_nm || '-',
          totalQty: 0,
          defectQty: 0
        }
      }

      skuMap[skuCd].totalQty += (item.good_qty || 0) + (item.defect_qty || 0)
      skuMap[skuCd].defectQty += item.defect_qty || 0
    })

    // 반품률 계산 및 정렬
    const skuList = Object.values(skuMap)
      .map(sku => ({
        ...sku,
        defectRate: sku.totalQty > 0 ? ((sku.defectQty / sku.totalQty) * 100).toFixed(1) : 0
      }))
      .filter(sku => sku.defectQty > 0)
      .sort((a, b) => b.defectRate - a.defectRate)
      .slice(0, 10)

    this.skuDefectRates = skuList
  }

  /* ──────────────────────────────────── Chart Rendering ──────────────────────────────────── */

  _renderAllCharts() {
    this._renderDefectTypeChart()
    this._renderDefectDispChart()
    this._renderDefectTrendChart()
    this._renderSKURateChart()
  }

  /** 불량 유형별 Bar 차트 */
  _renderDefectTypeChart() {
    const canvas = this.shadowRoot.querySelector('#defectTypeChart')
    if (!canvas) return
    if (this._defectTypeChart) this._defectTypeChart.destroy()

    const labels = Object.keys(this.defectTypeStats).map(type => this._defectTypeLabel(type))
    const data = Object.values(this.defectTypeStats)
    const colors = Object.keys(this.defectTypeStats).map(type => this._defectTypeColor(type))

    if (data.length === 0) return

    const ctx = canvas.getContext('2d')
    this._defectTypeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '불량 수량',
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

  /** 처분별 불량품 분포 Doughnut 차트 */
  _renderDefectDispChart() {
    const canvas = this.shadowRoot.querySelector('#defectDispChart')
    if (!canvas) return
    if (this._defectDispChart) this._defectDispChart.destroy()

    const labels = Object.keys(this.defectDispositionStats).map(type => this._dispositionTypeLabel(type))
    const data = Object.values(this.defectDispositionStats)
    const colors = Object.keys(this.defectDispositionStats).map(type => this._dispositionTypeColor(type))

    if (data.length === 0) return

    const ctx = canvas.getContext('2d')
    this._defectDispChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
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
                const total = data.reduce((s, v) => s + v, 0)
                const pct = ((context.parsed / total) * 100).toFixed(1)
                return `${context.label}: ${context.parsed} EA (${pct}%)`
              }
            }
          }
        }
      }
    })
  }

  /** 불량 추이 Line 차트 (dual axis) */
  _renderDefectTrendChart() {
    const canvas = this.shadowRoot.querySelector('#defectTrendChart')
    if (!canvas) return
    if (this._defectTrendChart) this._defectTrendChart.destroy()

    if (this.defectTrend.length === 0) return

    const labels = this.defectTrend.map(d => {
      const parts = d.date.split('-')
      return `${parts[1]}/${parts[2]}`
    })

    const ctx = canvas.getContext('2d')
    this._defectTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '불량 건수',
            data: this.defectTrend.map(d => d.defectQty),
            borderColor: '#F44336',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y'
          },
          {
            label: '불량률 (%)',
            data: this.defectTrend.map(d => d.defectRate),
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            ticks: { callback: value => `${value} EA` }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            max: 100,
            ticks: { callback: value => `${value}%` },
            grid: { drawOnChartArea: false }
          }
        }
      }
    })
  }

  /** SKU별 반품률 Top 10 Horizontal Bar 차트 */
  _renderSKURateChart() {
    const canvas = this.shadowRoot.querySelector('#skuRateChart')
    if (!canvas) return
    if (this._skuRateChart) this._skuRateChart.destroy()

    if (this.skuDefectRates.length === 0) return

    const labels = this.skuDefectRates.map(sku => `${sku.skuCd} (${sku.skuNm})`)
    const data = this.skuDefectRates.map(sku => sku.defectRate)

    const ctx = canvas.getContext('2d')
    this._skuRateChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '반품률 (%)',
            data,
            backgroundColor: '#FF9800',
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => `반품률: ${context.parsed.x}%`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: value => `${value}%` }
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

  _defectTypeLabel(type) {
    const map = {
      DAMAGED: '파손',
      EXPIRED: '유통기한',
      WRONG_ITEM: '오배송',
      MISSING_PARTS: '부품누락',
      FUNCTIONAL_DEFECT: '기능불량'
    }
    return map[type] || type
  }

  _defectTypeColor(type) {
    const map = {
      DAMAGED: '#F44336',
      EXPIRED: '#FF9800',
      WRONG_ITEM: '#2196F3',
      MISSING_PARTS: '#9C27B0',
      FUNCTIONAL_DEFECT: '#E91E63'
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

window.customElements.define('rwa-quality-analysis', RwaQualityAnalysis)
