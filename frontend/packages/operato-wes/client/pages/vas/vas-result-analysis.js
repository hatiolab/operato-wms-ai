import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

class VasResultAnalysis extends localize(i18next)(PageView) {
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

        .kpi-card.plan {
          border-left: 4px solid #2196f3;
        }
        .kpi-card.completed {
          border-left: 4px solid #4caf50;
        }
        .kpi-card.defect {
          border-left: 4px solid #f44336;
        }
        .kpi-card.achieve {
          border-left: 4px solid #ff9800;
        }
        .kpi-card.defect-rate {
          border-left: 4px solid #9c27b0;
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

        /* 차트 행 (유형별 + 불량 분포) */
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

        /* 실적 테이블 */
        .result-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .result-table thead th {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          padding: 10px 12px;
          text-align: center;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #ddd);
          white-space: nowrap;
        }

        .result-table tbody td {
          padding: 10px 12px;
          text-align: center;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
          color: var(--md-sys-color-on-surface);
        }

        .result-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant, #f9f9f9);
        }

        .result-table tfoot td {
          padding: 10px 12px;
          text-align: center;
          border-top: 2px solid var(--md-sys-color-outline-variant, #ddd);
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .result-table .warn {
          color: #f44336;
          font-weight: 600;
        }

        .vas-type-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          color: #fff;
        }

        .vas-type-badge.SET_ASSEMBLY {
          background: #2196f3;
        }
        .vas-type-badge.DISASSEMBLY {
          background: #4caf50;
        }
        .vas-type-badge.REPACK {
          background: #ff9800;
        }
        .vas-type-badge.LABEL {
          background: #9c27b0;
        }
        .vas-type-badge.CUSTOM {
          background: #9e9e9e;
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
      results: Array,
      bomMap: Object,
      kpiData: Object,
      typeAnalysis: Array,
      dailyTrend: Array
    }
  }

  constructor() {
    super()
    this.loading = true
    this.orders = []
    this.results = []
    this.bomMap = {}
    this.kpiData = { totalPlanQty: 0, totalCompletedQty: 0, totalDefectQty: 0, avgAchieveRate: 0, avgDefectRate: 0 }
    this.typeAnalysis = []
    this.dailyTrend = []

    // 기본 기간: 이번달 1일 ~ 오늘
    const now = new Date()
    this.startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    this.endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    this._typeChart = null
    this._trendChart = null
    this._defectChart = null
  }

  get context() {
    return { title: '유통가공 실적 분석' }
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
          <h3 class="section-title">핵심 지표 (KPI)</h3>
          ${this._renderKpiCards()}
        </section>

        <!-- 차트 영역 -->
        ${this.orders.length > 0
          ? html`
              <!-- 유형별 실적 + 불량 분포 -->
              <div class="charts-row">
                <section class="chart-section">
                  <h3 class="section-title">유형별 실적 분석</h3>
                  <div class="chart-container">
                    <canvas id="typeAchieveChart"></canvas>
                  </div>
                </section>
                <section class="chart-section">
                  <h3 class="section-title">유형별 불량 분포</h3>
                  <div class="chart-container">
                    <canvas id="defectChart"></canvas>
                  </div>
                </section>
              </div>

              <!-- 일별 실적 추이 -->
              <section class="chart-section">
                <h3 class="section-title">일별 실적 추이</h3>
                <div class="chart-container trend">
                  <canvas id="dailyTrendChart"></canvas>
                </div>
              </section>

              <!-- 주문별 실적 상세 -->
              <section class="chart-section">
                <h3 class="section-title">주문별 실적 상세 (${this.orders.length}건)</h3>
                ${this._renderResultsTable()}
              </section>
            `
          : html`<div class="empty-state">조회 기간 내 완료된 주문이 없습니다.</div>`}
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
        <div class="kpi-card plan">
          <div class="label">총 계획량</div>
          <div class="value">${this._formatNumber(kpi.totalPlanQty)}<span class="unit">EA</span></div>
        </div>
        <div class="kpi-card completed">
          <div class="label">총 완성량</div>
          <div class="value">${this._formatNumber(kpi.totalCompletedQty)}<span class="unit">EA</span></div>
        </div>
        <div class="kpi-card defect">
          <div class="label">총 불량량</div>
          <div class="value">${this._formatNumber(kpi.totalDefectQty)}<span class="unit">EA</span></div>
        </div>
        <div class="kpi-card achieve">
          <div class="label">평균 달성률</div>
          <div class="value">${kpi.avgAchieveRate}<span class="unit">%</span></div>
        </div>
        <div class="kpi-card defect-rate">
          <div class="label">평균 불량률</div>
          <div class="value">${kpi.avgDefectRate}<span class="unit">%</span></div>
        </div>
      </div>
    `
  }

  /** 실적 상세 테이블 렌더링 */
  _renderResultsTable() {
    return html`
      <table class="result-table">
        <thead>
          <tr>
            <th>작업번호</th>
            <th>유형</th>
            <th>세트 상품</th>
            <th>계획량</th>
            <th>완성량</th>
            <th>불량</th>
            <th>달성률</th>
            <th>불량률</th>
            <th>작업요청일</th>
          </tr>
        </thead>
        <tbody>
          ${this.orders.map(order => {
            const planQty = order.plan_qty || 0
            const completedQty = order.completed_qty || 0
            const orderResults = this.results.filter(r => r.vas_order_id === order.id)
            const defectQty = orderResults.reduce((sum, r) => sum + (r.defect_qty || 0), 0)
            const achieveRate = planQty > 0 ? (completedQty / planQty) * 100 : 0
            const defectRate = completedQty + defectQty > 0 ? (defectQty / (completedQty + defectQty)) * 100 : 0
            const bom = this.bomMap[order.vas_bom_id]

            return html`
              <tr>
                <td>${order.vas_no || '-'}</td>
                <td><span class="vas-type-badge ${order.vas_type}">${this._vasTypeLabel(order.vas_type)}</span></td>
                <td>${bom ? `${bom.set_sku_cd} / ${bom.set_sku_nm}` : '-'}</td>
                <td>${this._formatNumber(planQty)}</td>
                <td>${this._formatNumber(completedQty)}</td>
                <td>${defectQty > 0 ? defectQty : '-'}</td>
                <td>${achieveRate.toFixed(1)}%</td>
                <td class="${defectRate > 5 ? 'warn' : ''}">${defectRate.toFixed(1)}%</td>
                <td>${order.vas_req_date || '-'}</td>
              </tr>
            `
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">합계</td>
            <td>${this._formatNumber(this.kpiData.totalPlanQty)}</td>
            <td>${this._formatNumber(this.kpiData.totalCompletedQty)}</td>
            <td>${this._formatNumber(this.kpiData.totalDefectQty)}</td>
            <td>${this.kpiData.avgAchieveRate}%</td>
            <td>${this.kpiData.avgDefectRate}%</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
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
    if (this._trendChart) {
      this._trendChart.destroy()
      this._trendChart = null
    }
    if (this._defectChart) {
      this._defectChart.destroy()
      this._defectChart = null
    }
  }

  /* ──────────────────────────────────── Data Fetching ──────────────────────────────────── */

  async _fetchData() {
    try {
      this.loading = true

      // 1. COMPLETED/CLOSED 주문 조회
      await this._fetchOrders()

      // 2. 주문별 실적 조회
      await this._fetchResultsForOrders()

      // 3. BOM 정보 캐싱
      await this._fetchBomMap(this.orders)

      // 4. 데이터 집계
      this._aggregateData()

      this.loading = false

      // 5. 차트 렌더링 (DOM 업데이트 후)
      this.updateComplete.then(() => this._renderAllCharts())
    } catch (err) {
      console.error('실적 분석 데이터 로딩 실패:', err)
      this.loading = false
    }
  }

  /** COMPLETED/CLOSED 상태 주문 조회 후 날짜 필터 적용 */
  async _fetchOrders() {
    try {
      const allOrders = await ServiceUtil.restGet('vas_trx/monitor/orders', { status: 'COMPLETED,CLOSED' })
      // 날짜 범위 필터
      this.orders = (allOrders || []).filter(order => {
        const reqDate = order.vas_req_date
        if (!reqDate) return false
        return reqDate >= this.startDate && reqDate <= this.endDate
      })
    } catch (err) {
      console.error('주문 목록 조회 실패:', err)
      this.orders = []
    }
  }

  /** 각 주문의 실적 레코드 병렬 조회 */
  async _fetchResultsForOrders() {
    if (!this.orders.length) {
      this.results = []
      return
    }

    try {
      const allResults = await Promise.all(
        this.orders.map(order => ServiceUtil.restGet(`vas_orders/${order.id}/results`).catch(() => []))
      )
      this.results = allResults.flat()
    } catch (err) {
      console.error('실적 데이터 조회 실패:', err)
      this.results = []
    }
  }

  /** BOM 정보 캐싱 (vas-work-monitor.js 동일 패턴) */
  async _fetchBomMap(orders) {
    const bomIds = [...new Set(orders.map(o => o.vas_bom_id).filter(Boolean))]
    const newBomIds = bomIds.filter(id => !this.bomMap[id])
    if (newBomIds.length === 0) return

    try {
      const results = await Promise.all(newBomIds.map(id => ServiceUtil.restGet(`vas_boms/${id}`).catch(() => null)))
      const updated = { ...this.bomMap }
      results.forEach((bom, i) => {
        if (bom) updated[newBomIds[i]] = bom
      })
      this.bomMap = updated
    } catch (err) {
      console.error('BOM 조회 실패:', err)
    }
  }

  /* ──────────────────────────────────── Data Aggregation ──────────────────────────────────── */

  _aggregateData() {
    this._computeKPIs()
    this._aggregateByType()
    this._aggregateByDate()
  }

  /** KPI 계산: 총 계획량, 완성량, 불량, 달성률, 불량률 */
  _computeKPIs() {
    let totalPlanQty = 0
    let totalCompletedQty = 0
    let totalDefectQty = 0

    this.orders.forEach(order => {
      totalPlanQty += order.plan_qty || 0
      totalCompletedQty += order.completed_qty || 0
    })

    this.results.forEach(result => {
      totalDefectQty += result.defect_qty || 0
    })

    const avgAchieveRate = totalPlanQty > 0 ? ((totalCompletedQty / totalPlanQty) * 100).toFixed(1) : '0.0'
    const avgDefectRate =
      totalCompletedQty + totalDefectQty > 0
        ? ((totalDefectQty / (totalCompletedQty + totalDefectQty)) * 100).toFixed(1)
        : '0.0'

    this.kpiData = { totalPlanQty, totalCompletedQty, totalDefectQty, avgAchieveRate, avgDefectRate }
  }

  /** 유형별 집계: vas_type별 계획량/완성량/불량 */
  _aggregateByType() {
    const typeMap = {}

    this.orders.forEach(order => {
      const type = order.vas_type || 'UNKNOWN'
      if (!typeMap[type]) {
        typeMap[type] = { type, planQty: 0, completedQty: 0, defectQty: 0 }
      }
      typeMap[type].planQty += order.plan_qty || 0
      typeMap[type].completedQty += order.completed_qty || 0
    })

    // 주문-유형 매핑
    const orderTypeMap = {}
    this.orders.forEach(o => {
      orderTypeMap[o.id] = o.vas_type
    })

    this.results.forEach(result => {
      const type = orderTypeMap[result.vas_order_id] || 'UNKNOWN'
      if (typeMap[type]) {
        typeMap[type].defectQty += result.defect_qty || 0
      }
    })

    this.typeAnalysis = Object.values(typeMap)
  }

  /** 일별 집계: work_date별 완성량/불량 */
  _aggregateByDate() {
    const dateMap = {}

    this.results.forEach(result => {
      const date = result.work_date
      if (!date) return
      if (!dateMap[date]) {
        dateMap[date] = { date, resultQty: 0, defectQty: 0 }
      }
      dateMap[date].resultQty += result.result_qty || 0
      dateMap[date].defectQty += result.defect_qty || 0
    })

    this.dailyTrend = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  }

  /* ──────────────────────────────────── Chart Rendering ──────────────────────────────────── */

  _renderAllCharts() {
    this._renderTypeChart()
    this._renderDefectChart()
    this._renderTrendChart()
  }

  /** 유형별 실적 Grouped Bar 차트 */
  _renderTypeChart() {
    const canvas = this.shadowRoot.querySelector('#typeAchieveChart')
    if (!canvas) return
    if (this._typeChart) this._typeChart.destroy()

    const labels = this.typeAnalysis.map(t => this._vasTypeLabel(t.type))
    const ctx = canvas.getContext('2d')

    this._typeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '계획량',
            data: this.typeAnalysis.map(t => t.planQty),
            backgroundColor: '#2196F3',
            borderRadius: 6
          },
          {
            label: '완성량',
            data: this.typeAnalysis.map(t => t.completedQty),
            backgroundColor: '#4CAF50',
            borderRadius: 6
          },
          {
            label: '불량량',
            data: this.typeAnalysis.map(t => t.defectQty),
            backgroundColor: '#F44336',
            borderRadius: 6
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
              label: context => `${context.dataset.label}: ${context.parsed.y} EA`
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

  /** 유형별 불량 분포 Doughnut 차트 */
  _renderDefectChart() {
    const canvas = this.shadowRoot.querySelector('#defectChart')
    if (!canvas) return
    if (this._defectChart) this._defectChart.destroy()

    const typeColors = {
      SET_ASSEMBLY: '#2196F3',
      DISASSEMBLY: '#4CAF50',
      REPACK: '#FF9800',
      LABEL: '#9C27B0',
      CUSTOM: '#9E9E9E',
      UNKNOWN: '#757575'
    }

    const filtered = this.typeAnalysis.filter(t => t.defectQty > 0)

    if (filtered.length === 0) {
      // 불량 없으면 빈 차트 표시 안 함
      return
    }

    const ctx = canvas.getContext('2d')
    this._defectChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: filtered.map(t => this._vasTypeLabel(t.type)),
        datasets: [
          {
            data: filtered.map(t => t.defectQty),
            backgroundColor: filtered.map(t => typeColors[t.type] || '#757575'),
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
                const total = context.dataset.data.reduce((s, v) => s + v, 0)
                const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0'
                return `${context.label}: ${context.parsed} EA (${pct}%)`
              }
            }
          }
        }
      }
    })
  }

  /** 일별 실적 추이 Line 차트 */
  _renderTrendChart() {
    const canvas = this.shadowRoot.querySelector('#dailyTrendChart')
    if (!canvas) return
    if (this._trendChart) this._trendChart.destroy()

    if (this.dailyTrend.length === 0) return

    const labels = this.dailyTrend.map(d => {
      // YYYY-MM-DD → MM/DD
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
            label: '완성량',
            data: this.dailyTrend.map(d => d.resultQty),
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: '불량량',
            data: this.dailyTrend.map(d => d.defectQty),
            borderColor: '#F44336',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
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
              label: context => `${context.dataset.label}: ${context.parsed.y} EA`
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

  /* ──────────────────────────────────── Event Handlers ──────────────────────────────────── */

  _onDateChange(field, e) {
    this[field] = e.target.value
  }

  _onSearch() {
    this._fetchData()
  }

  /* ──────────────────────────────────── Utilities ──────────────────────────────────── */

  _vasTypeLabel(type) {
    const map = {
      SET_ASSEMBLY: '세트구성',
      DISASSEMBLY: '세트해체',
      REPACK: '재포장',
      LABEL: '라벨링',
      CUSTOM: '기타'
    }
    return map[type] || type || '-'
  }

  _formatNumber(num) {
    return num ? num.toLocaleString() : 0
  }
}

window.customElements.define('vas-result-analysis', VasResultAnalysis)
