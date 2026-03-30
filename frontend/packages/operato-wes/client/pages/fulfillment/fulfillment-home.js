import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

class FulfillmentHome extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 정의 */
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

        /* 상태 카드 그리드 */
        .status-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: var(--spacing-medium, 16px);
        }

        .status-card {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .status-card:hover {
          box-shadow: var(--box-shadow-normal, 0 4px 8px rgba(0, 0, 0, 0.15));
          transform: translateY(-2px);
        }

        .status-card .label {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 8px;
        }

        .status-card .count {
          font-size: 32px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
        }

        .status-card .subtitle {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 4px;
        }

        /* 피킹 상태별 색상 */
        .status-card.created { border-left: 4px solid #7B1FA2; }
        .status-card.in-progress { border-left: 4px solid #FF9800; }
        .status-card.completed { border-left: 4px solid #4CAF50; }
        .status-card.cancelled { border-left: 4px solid #D32F2F; }

        /* 패킹/출하 상태별 색상 */
        .status-card.pack-created { border-left: 4px solid #7B1FA2; }
        .status-card.pack-in-progress { border-left: 4px solid #FF9800; }
        .status-card.pack-completed { border-left: 4px solid #2196F3; }
        .status-card.label-printed { border-left: 4px solid #1565C0; }
        .status-card.manifested { border-left: 4px solid #303F9F; }
        .status-card.shipped { border-left: 4px solid #4CAF50; }
        .status-card.pack-cancelled { border-left: 4px solid #D32F2F; }

        /* 차트 섹션 */
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-large, 24px);
        }

        .chart-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .chart-container {
          width: 100%;
          height: 250px;
          position: relative;
        }

        .chart-container canvas {
          max-height: 250px;
        }

        /* 알림 영역 */
        .alerts-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
        }

        .alert-item:last-child {
          margin-bottom: 0;
        }

        .alert-item.danger {
          background: #FFEBEE;
          border-left: 4px solid #F44336;
        }

        .alert-item.warning {
          background: #FFF3E0;
          border-left: 4px solid #FF9800;
        }

        .alert-item.info {
          background: #E3F2FD;
          border-left: 4px solid #2196F3;
        }

        .alert-item .icon {
          font-size: 24px;
        }

        .alert-item .message {
          flex: 1;
          font-size: 14px;
          color: var(--md-sys-color-on-surface);
        }

        /* 바로가기 버튼 */
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--spacing-medium, 16px);
        }

        .quick-action-btn {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          border: none;
          border-radius: 8px;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .quick-action-btn:hover {
          background: var(--md-sys-color-primary-container);
          box-shadow: var(--box-shadow-normal, 0 4px 8px rgba(0, 0, 0, 0.15));
          transform: translateY(-2px);
        }

        .quick-action-btn .icon {
          margin-right: 8px;
        }

        /* 최근 피킹 작업 테이블 */
        .recent-orders-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .orders-table th {
          text-align: left;
          padding: 10px 12px;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant);
          font-weight: 600;
          font-size: 13px;
        }

        .orders-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface);
        }

        .orders-table tr:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .orders-table .link {
          color: var(--md-sys-color-primary);
          cursor: pointer;
          text-decoration: none;
        }

        .orders-table .link:hover {
          text-decoration: underline;
        }

        .orders-table .right {
          text-align: right;
        }

        .orders-table .center {
          text-align: center;
        }

        /* 상태 배지 */
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .status-badge.CREATED { background: #7B1FA2; }
        .status-badge.IN_PROGRESS { background: #FF9800; }
        .status-badge.COMPLETED { background: #2196F3; }
        .status-badge.LABEL_PRINTED { background: #1565C0; }
        .status-badge.MANIFESTED { background: #303F9F; }
        .status-badge.SHIPPED { background: #4CAF50; }
        .status-badge.CANCELLED { background: #D32F2F; }

        /* 피킹 유형 배지 */
        .pick-type-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background: #E3F2FD;
          color: #1565C0;
        }

        .pick-type-badge.INDIVIDUAL { background: #E1F5FE; color: #0277BD; }
        .pick-type-badge.TOTAL { background: #E8EAF6; color: #283593; }
        .pick-type-badge.ZONE { background: #F3E5F5; color: #6A1B9A; }

        /* 로딩 상태 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant);
        }

        /* 반응형 */
        @media screen and (max-width: 1024px) {
          .charts-row {
            grid-template-columns: 1fr;
          }
        }

        @media screen and (max-width: 768px) {
          .status-cards {
            grid-template-columns: repeat(3, 1fr);
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }
        }

        @media screen and (max-width: 480px) {
          .status-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      loading: Boolean,
      pickingStatus: Object,
      packingStatus: Object,
      shippingStatus: Object,
      workerPerformance: Array,
      alerts: Array,
      recentPickingTasks: Array
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.pickingStatus = {}
    this.packingStatus = {}
    this.shippingStatus = { hourly_stats: [] }
    this.workerPerformance = []
    this.alerts = []
    this.recentPickingTasks = []
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: '피킹/검수/포장 대시보드'
    }
  }

  /** 상태 한글 라벨 매핑 */
  _statusLabel(status) {
    const labels = {
      CREATED: '생성',
      IN_PROGRESS: '진행중',
      COMPLETED: '완료',
      LABEL_PRINTED: '라벨출력',
      MANIFESTED: '적하목록',
      SHIPPED: '출하완료',
      CANCELLED: '취소'
    }
    return labels[status] || status
  }

  /** 피킹 유형 한글 라벨 매핑 */
  _pickTypeLabel(pickType) {
    const labels = {
      INDIVIDUAL: '개별피킹',
      TOTAL: '토탈피킹',
      ZONE: '존피킹'
    }
    return labels[pickType] || pickType
  }

  /** 화면 렌더링 */
  render() {
    return html`
      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : html`
            <div class="dashboard-container">
              <!-- 1 피킹 현황 (상태별 카드) -->
              <section>
                <h3 class="section-title">피킹 현황</h3>
                <div class="status-cards">
                  <div class="status-card created" @click="${() => this._navigateTo('picking-task-list', { status: 'CREATED' })}">
                    <div class="label">생성</div>
                    <div class="count">${this.pickingStatus.created || 0}</div>
                    <div class="subtitle">CREATED</div>
                  </div>
                  <div class="status-card in-progress" @click="${() => this._navigateTo('picking-task-list', { status: 'IN_PROGRESS' })}">
                    <div class="label">진행중</div>
                    <div class="count">${this.pickingStatus.in_progress || 0}</div>
                    <div class="subtitle">IN_PROGRESS</div>
                  </div>
                  <div class="status-card completed" @click="${() => this._navigateTo('picking-task-list', { status: 'COMPLETED' })}">
                    <div class="label">완료</div>
                    <div class="count">${this.pickingStatus.completed || 0}</div>
                    <div class="subtitle">COMPLETED</div>
                  </div>
                  <div class="status-card cancelled" @click="${() => this._navigateTo('picking-task-list', { status: 'CANCELLED' })}">
                    <div class="label">취소</div>
                    <div class="count">${this.pickingStatus.cancelled || 0}</div>
                    <div class="subtitle">CANCELLED</div>
                  </div>
                </div>
              </section>

              <!-- 2 패킹/출하 현황 (상태별 카드) -->
              <section>
                <h3 class="section-title">패킹/출하 현황</h3>
                <div class="status-cards">
                  <div class="status-card pack-created" @click="${() => this._navigateTo('packing-order-list', { status: 'CREATED' })}">
                    <div class="label">생성</div>
                    <div class="count">${this.packingStatus.created || 0}</div>
                    <div class="subtitle">CREATED</div>
                  </div>
                  <div class="status-card pack-in-progress" @click="${() => this._navigateTo('packing-order-list', { status: 'IN_PROGRESS' })}">
                    <div class="label">진행중</div>
                    <div class="count">${this.packingStatus.in_progress || 0}</div>
                    <div class="subtitle">IN_PROGRESS</div>
                  </div>
                  <div class="status-card pack-completed" @click="${() => this._navigateTo('packing-order-list', { status: 'COMPLETED' })}">
                    <div class="label">완료</div>
                    <div class="count">${this.packingStatus.completed || 0}</div>
                    <div class="subtitle">COMPLETED</div>
                  </div>
                  <div class="status-card label-printed" @click="${() => this._navigateTo('packing-order-list', { status: 'LABEL_PRINTED' })}">
                    <div class="label">라벨출력</div>
                    <div class="count">${this.packingStatus.label_printed || 0}</div>
                    <div class="subtitle">LABEL_PRINTED</div>
                  </div>
                  <div class="status-card manifested" @click="${() => this._navigateTo('packing-order-list', { status: 'MANIFESTED' })}">
                    <div class="label">적하목록</div>
                    <div class="count">${this.packingStatus.manifested || 0}</div>
                    <div class="subtitle">MANIFESTED</div>
                  </div>
                  <div class="status-card shipped" @click="${() => this._navigateTo('packing-order-list', { status: 'SHIPPED' })}">
                    <div class="label">출하완료</div>
                    <div class="count">${this.packingStatus.shipped || 0}</div>
                    <div class="subtitle">SHIPPED</div>
                  </div>
                  <div class="status-card pack-cancelled" @click="${() => this._navigateTo('packing-order-list', { status: 'CANCELLED' })}">
                    <div class="label">취소</div>
                    <div class="count">${this.packingStatus.cancelled || 0}</div>
                    <div class="subtitle">CANCELLED</div>
                  </div>
                </div>
              </section>

              <!-- 3 피킹 유형별 현황 + 4 시간대별 출하 현황 -->
              <div class="charts-row">
                <section class="chart-section">
                  <h3 class="section-title">피킹 유형별 현황</h3>
                  <div class="chart-container">
                    <canvas id="pickTypeChart"></canvas>
                  </div>
                </section>

                <section class="chart-section">
                  <h3 class="section-title">시간대별 출하 현황</h3>
                  <div class="chart-container">
                    <canvas id="hourlyShippingChart"></canvas>
                  </div>
                </section>
              </div>

              <!-- 5 작업자별 실적 -->
              <section class="chart-section">
                <h3 class="section-title">작업자별 실적</h3>
                <div class="chart-container">
                  <canvas id="workerPerformanceChart"></canvas>
                </div>
              </section>

              <!-- 6 주의 항목 (알림) -->
              ${this.alerts && this.alerts.length > 0
            ? html`
                    <section class="alerts-section">
                      <h3 class="section-title">주의 항목</h3>
                      ${this.alerts.map(
              alert => html`
                          <div class="alert-item ${alert.type}">
                            <span class="icon">${alert.type === 'danger' ? '!!' : alert.type === 'warning' ? '!' : 'i'}</span>
                            <span class="message">${alert.message}</span>
                          </div>
                        `
            )}
                    </section>
                  `
            : ''}

              <!-- 7 바로가기 -->
              <section>
                <div class="quick-actions">
                  <button class="quick-action-btn" @click="${() => this._navigateTo('picking-task-list')}">
                    피킹 목록
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('packing-order-list')}">
                    포장 목록
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('fulfillment-progress')}">
                    진행 현황
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('oms-home')}">
                    OMS 대시보드
                  </button>
                </div>
              </section>

              <!-- 8 최근 피킹 작업 내역 -->
              ${this.recentPickingTasks && this.recentPickingTasks.length > 0
            ? html`
                    <section class="recent-orders-section">
                      <h3 class="section-title">최근 피킹 작업</h3>
                      <table class="orders-table">
                        <thead>
                          <tr>
                            <th>피킹번호</th>
                            <th>웨이브번호</th>
                            <th class="center">피킹유형</th>
                            <th>작업자</th>
                            <th class="right">예정수량</th>
                            <th class="right">실적수량</th>
                            <th class="center">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${this.recentPickingTasks.map(
              task => html`
                              <tr>
                                <td><span class="link" @click="${() => this._navigateToPickingDetail(task)}">${task.pick_task_no || ''}</span></td>
                                <td>${task.wave_no || ''}</td>
                                <td class="center"><span class="pick-type-badge ${task.pick_type || ''}">${this._pickTypeLabel(task.pick_type)}</span></td>
                                <td>${task.worker_id || ''}</td>
                                <td class="right">${task.plan_total || 0}</td>
                                <td class="right">${task.result_total || 0}</td>
                                <td class="center"><span class="status-badge ${task.status}">${this._statusLabel(task.status)}</span></td>
                              </tr>
                            `
            )}
                        </tbody>
                      </table>
                    </section>
                  `
            : ''}
            </div>
          `}
    `
  }

  /** 페이지 활성화 시 대시보드 데이터 조회 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchDashboardData()
    }
  }

  /** 대시보드 데이터 일괄 조회 */
  async _fetchDashboardData() {
    try {
      this.loading = true

      const [pickingStatus, packingStatus, shippingStatus, workerPerformance, recentPickingTasks] = await Promise.all([
        this._fetchPickingStatus(),
        this._fetchPackingStatus(),
        this._fetchShippingStatus(),
        this._fetchWorkerPerformance(),
        this._fetchRecentPickingTasks()
      ])

      this.pickingStatus = pickingStatus
      this.packingStatus = packingStatus
      this.shippingStatus = shippingStatus
      this.workerPerformance = workerPerformance
      this.recentPickingTasks = recentPickingTasks

      // 알림 생성
      this.alerts = this._buildAlerts()

      this.loading = false

      this.updateComplete.then(() => this._renderCharts())
    } catch (error) {
      console.error('Fulfillment 대시보드 데이터 로딩 실패:', error)
      this.loading = false
    }
  }

  /** 피킹 현황 조회 */
  async _fetchPickingStatus() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/dashboard/picking_status')
      return data || {}
    } catch (error) {
      console.error('피킹 현황 조회 실패:', error)
      return {}
    }
  }

  /** 패킹 현황 조회 */
  async _fetchPackingStatus() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/dashboard/packing_status')
      return data || {}
    } catch (error) {
      console.error('패킹 현황 조회 실패:', error)
      return {}
    }
  }

  /** 출하 현황 조회 */
  async _fetchShippingStatus() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/dashboard/shipping_status')
      return data || { hourly_stats: [] }
    } catch (error) {
      console.error('출하 현황 조회 실패:', error)
      return { hourly_stats: [] }
    }
  }

  /** 작업자별 실적 조회 */
  async _fetchWorkerPerformance() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/dashboard/worker_performance')
      return data || []
    } catch (error) {
      console.error('작업자별 실적 조회 실패:', error)
      return []
    }
  }

  /** 최근 피킹 작업 조회 */
  async _fetchRecentPickingTasks() {
    try {
      const data = await ServiceUtil.restGet('picking_tasks?page=1&limit=5&sort=' + encodeURIComponent('[{"field":"created_at","ascending":false}]'))
      return (data && data.items) ? data.items : []
    } catch (error) {
      console.error('최근 피킹 작업 조회 실패:', error)
      return []
    }
  }

  /** 알림 목록 생성 */
  _buildAlerts() {
    const alerts = []

    // SHORT 피킹 알림 (피킹 완료 중 실적 < 예정인 경우)
    const shortPicks = (this.pickingStatus.short_picks || 0)
    if (shortPicks > 0) {
      alerts.push({
        type: 'danger',
        message: `SHORT 피킹이 ${shortPicks}건 발생했습니다. 재고를 확인하세요.`
      })
    }

    // 검수 실패 알림
    const inspectionFails = (this.packingStatus.inspection_fails || 0)
    if (inspectionFails > 0) {
      alerts.push({
        type: 'warning',
        message: `검수 불합격 ${inspectionFails}건이 있습니다. 확인이 필요합니다.`
      })
    }

    // 지연 출하 알림
    const pendingShipment = (this.shippingStatus.pending_shipment || 0)
    if (pendingShipment > 0) {
      alerts.push({
        type: 'info',
        message: `출하 지연 건이 ${pendingShipment}건 있습니다. 배송 스케줄을 확인하세요.`
      })
    }

    return alerts
  }

  /** 차트 일괄 렌더링 */
  _renderCharts() {
    this._renderPickTypeChart()
    this._renderHourlyShippingChart()
    this._renderWorkerPerformanceChart()
  }

  /** 3 피킹 유형별 도넛 차트 렌더링 */
  _renderPickTypeChart() {
    const canvas = this.shadowRoot.querySelector('#pickTypeChart')
    if (!canvas) return

    if (this._pickTypeChart) {
      this._pickTypeChart.destroy()
    }

    const individual = this.pickingStatus.individual || 0
    const total = this.pickingStatus.total_pick || 0
    const zone = this.pickingStatus.zone || 0

    const ctx = canvas.getContext('2d')
    this._pickTypeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['개별피킹', '토탈피킹', '존피킹'],
        datasets: [{
          data: [individual, total, zone],
          backgroundColor: ['#03A9F4', '#1976D2', '#7B1FA2']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.raw}건`
            }
          }
        }
      }
    })
  }

  /** 4 시간대별 출하 수직 막대 차트 렌더링 */
  _renderHourlyShippingChart() {
    const canvas = this.shadowRoot.querySelector('#hourlyShippingChart')
    if (!canvas) return

    if (this._hourlyShippingChart) {
      this._hourlyShippingChart.destroy()
    }

    const hourlyStats = this.shippingStatus.hourly_stats || []
    const labels = hourlyStats.map(h => `${h.hour}시`)
    const shippedData = hourlyStats.map(h => h.shipped_count || 0)
    const boxData = hourlyStats.map(h => h.box_count || 0)

    const ctx = canvas.getContext('2d')
    this._hourlyShippingChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '출하건수',
            data: shippedData,
            backgroundColor: '#4CAF50',
            borderRadius: 6
          },
          {
            label: '박스수',
            data: boxData,
            backgroundColor: '#81C784',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.raw}건`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    })
  }

  /** 5 작업자별 실적 수평 막대 차트 렌더링 */
  _renderWorkerPerformanceChart() {
    const canvas = this.shadowRoot.querySelector('#workerPerformanceChart')
    if (!canvas) return

    if (this._workerPerformanceChart) {
      this._workerPerformanceChart.destroy()
    }

    const labels = this.workerPerformance.map(w => w.worker_nm || w.worker_id || '미지정')
    const pickCountData = this.workerPerformance.map(w => w.pick_count || 0)
    const packCountData = this.workerPerformance.map(w => w.pack_count || 0)

    const ctx = canvas.getContext('2d')
    this._workerPerformanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '피킹건수',
            data: pickCountData,
            backgroundColor: '#42A5F5',
            borderRadius: 6
          },
          {
            label: '패킹건수',
            data: packCountData,
            backgroundColor: '#66BB6A',
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.raw}건`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { callback: v => `${v}건` }
          }
        }
      }
    })
  }

  /** 지정된 페이지로 이동 */
  _navigateTo(page, filter) {
    UiUtil.pageNavigate(page, filter ? filter : {})
  }

  /** 피킹 작업 상세 페이지로 이동 */
  _navigateToPickingDetail(task) {
    if (task && task.id) {
      UiUtil.pageNavigate('picking-task-detail', { id: task.id })
    }
  }

  /** 페이지 해제 시 Chart 인스턴스 정리 */
  pageDisposed(lifecycle) {
    if (this._pickTypeChart) {
      this._pickTypeChart.destroy()
      this._pickTypeChart = null
    }
    if (this._hourlyShippingChart) {
      this._hourlyShippingChart.destroy()
      this._hourlyShippingChart = null
    }
    if (this._workerPerformanceChart) {
      this._workerPerformanceChart.destroy()
      this._workerPerformanceChart = null
    }
  }
}

window.customElements.define('fulfillment-home', FulfillmentHome)
