import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { openPopup } from '@operato/layout'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'
import './auto-wave-create-popup'

class OmsHome extends localize(i18next)(PageView) {
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

        /* 상태별 색상 */
        .status-card.registered { border-left: 4px solid #9E9E9E; }
        .status-card.confirmed { border-left: 4px solid #2196F3; }
        .status-card.allocated { border-left: 4px solid #1565C0; }
        .status-card.waved { border-left: 4px solid #7B1FA2; }
        .status-card.released { border-left: 4px solid #303F9F; }
        .status-card.back-order { border-left: 4px solid #F44336; }

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

        /* 최근 주문 테이블 */
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

        .status-badge.REGISTERED { background: #9E9E9E; }
        .status-badge.CONFIRMED { background: #2196F3; }
        .status-badge.ALLOCATED { background: #1565C0; }
        .status-badge.BACK_ORDER { background: #F44336; }
        .status-badge.WAVED { background: #7B1FA2; }
        .status-badge.RELEASED { background: #303F9F; }
        .status-badge.PICKING { background: #FF9800; }
        .status-badge.PACKING { background: #FFB74D; color: #333; }
        .status-badge.SHIPPED { background: #4CAF50; }
        .status-badge.CLOSED { background: #424242; }
        .status-badge.CANCELLED { background: #D32F2F; }

        /* 업무유형 배지 */
        .biz-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background: #E3F2FD;
          color: #1565C0;
        }

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
      statusCounts: Object,
      bizTypeStats: Object,
      channelStats: Array,
      waveStats: Object,
      allocationStats: Object,
      cutoffAlerts: Array,
      recentOrders: Array
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.statusCounts = {}
    this.bizTypeStats = { B2C_OUT: 0, B2B_OUT: 0, B2C_RTN: 0, B2B_RTN: 0 }
    this.channelStats = []
    this.waveStats = { CREATED: 0, RELEASED: 0, COMPLETED: 0, CANCELLED: 0 }
    this.allocationStats = { total_orders: 0, allocated_orders: 0, back_orders: 0, alloc_rate: 0, soft_alloc_expiring_soon: 0 }
    this.cutoffAlerts = []
    this.recentOrders = []
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: 'OMS 대시보드'
    }
  }

  /** 상태 한글 라벨 매핑 */
  _statusLabel(status) {
    const labels = {
      REGISTERED: '등록',
      CONFIRMED: '확정',
      ALLOCATED: '할당',
      BACK_ORDER: '부족',
      WAVED: '웨이브',
      RELEASED: '인계',
      PICKING: '피킹중',
      PACKING: '패킹중',
      SHIPPED: '출하완료',
      CLOSED: '마감',
      CANCELLED: '취소'
    }
    return labels[status] || status
  }

  /** 화면 렌더링 */
  render() {
    return html`
      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : html`
            <div class="dashboard-container">
              <!-- ① 오늘의 주문 현황 (상태별 카드) -->
              <section>
                <h3 class="section-title">오늘의 주문 현황</h3>
                <div class="status-cards">
                  <div class="status-card registered" @click="${() => this._navigateTo('shipment-orders', { status: 'REGISTERED', order_date: ValueUtil.todayFormatted() })}">
                    <div class="label">등록</div>
                    <div class="count">${this.statusCounts.REGISTERED || 0}</div>
                    <div class="subtitle">REGISTERED</div>
                  </div>
                  <div class="status-card confirmed" @click="${() => this._navigateTo('shipment-orders', { status: 'CONFIRMED', order_date: ValueUtil.todayFormatted() })}">
                    <div class="label">확정</div>
                    <div class="count">${this.statusCounts.CONFIRMED || 0}</div>
                    <div class="subtitle">CONFIRMED</div>
                  </div>
                  <div class="status-card allocated" @click="${() => this._navigateTo('shipment-orders', { status: 'ALLOCATED', order_date: ValueUtil.todayFormatted() })}">
                    <div class="label">할당</div>
                    <div class="count">${this.statusCounts.ALLOCATED || 0}</div>
                    <div class="subtitle">ALLOCATED</div>
                  </div>
                  <div class="status-card waved" @click="${() => this._navigateTo('shipment-waves', { wave_date: ValueUtil.todayFormatted() })}">
                    <div class="label">웨이브</div>
                    <div class="count">${this.statusCounts.WAVED || 0}</div>
                    <div class="subtitle">WAVED</div>
                  </div>
                  <div class="status-card released" @click="${() => this._navigateTo('shipment-orders', { status: 'RELEASED', order_date: ValueUtil.todayFormatted() })}">
                    <div class="label">인계</div>
                    <div class="count">${this.statusCounts.RELEASED || 0}</div>
                    <div class="subtitle">RELEASED</div>
                  </div>
                  <div class="status-card back-order" @click="${() => this._navigateTo('shipment-orders', { status: 'BACK_ORDER' })}">
                    <div class="label">부족</div>
                    <div class="count">${this.statusCounts.BACK_ORDER || 0}</div>
                    <div class="subtitle">BACK_ORDER</div>
                  </div>
                </div>
              </section>

              <!-- ② 업무유형별 현황 + ③ 채널별 현황 -->
              <div class="charts-row">
                <section class="chart-section">
                  <h3 class="section-title">업무 유형별 현황</h3>
                  <div class="chart-container">
                    <canvas id="bizTypeChart"></canvas>
                  </div>
                </section>

                <section class="chart-section">
                  <h3 class="section-title">고객(채널)별 현황</h3>
                  <div class="chart-container">
                    <canvas id="channelChart"></canvas>
                  </div>
                </section>
              </div>

              <!-- ④ 웨이브 진행 현황 -->
              <section class="chart-section">
                <h3 class="section-title">웨이브 진행 현황</h3>
                <div class="chart-container">
                  <canvas id="waveChart"></canvas>
                </div>
              </section>

              <!-- ⑤ 주의 항목 (알림) -->
              ${this.cutoffAlerts && this.cutoffAlerts.length > 0
            ? html`
                    <section class="alerts-section">
                      <h3 class="section-title">주의 항목</h3>
                      ${this.cutoffAlerts.map(
              alert => html`
                          <div class="alert-item ${alert.type}">
                            <span class="icon">${alert.type === 'danger' ? '🚨' : alert.type === 'warning' ? '⚠️' : '⏰'}</span>
                            <span class="message">${alert.message}</span>
                          </div>
                        `
            )}
                    </section>
                  `
            : ''}

              <!-- ⑥ 바로가기 -->
              <section>
                <div class="quick-actions">
                  <button class="quick-action-btn" @click="${() => this._navigateTo('shipment-orders')}">
                    <span class="icon">📋</span>주문 목록
                  </button>
                  <button class="quick-action-btn" @click="${() => this._openWaveNewPopup()}">
                    <span class="icon">🌊</span>웨이브 생성
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('shipment-order-import')}">
                    <span class="icon">📥</span>임포트
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('replenish-orders')}">
                    <span class="icon">🔄</span>보충 현황
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('inventories')}">
                    <span class="icon">📊</span>재고 조회
                  </button>
                </div>
              </section>

              <!-- ⑦ 최근 주문 내역 -->
              ${this.recentOrders && this.recentOrders.length > 0
            ? html`
                    <section class="recent-orders-section">
                      <h3 class="section-title">최근 주문 내역</h3>
                      <table class="orders-table">
                        <thead>
                          <tr>
                            <th>출하번호</th>
                            <th>고객</th>
                            <th class="center">업무유형</th>
                            <th class="right">수량</th>
                            <th class="center">상태</th>
                            <th>주문일</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${this.recentOrders.map(
              order => html`
                              <tr>
                                <td><span class="link" @click="${() => this._navigateToDetail(order)}">${order.shipment_no}</span></td>
                                <td>${order.cust_nm || ''}</td>
                                <td class="center"><span class="biz-badge">${order.biz_type || ''}</span></td>
                                <td class="right">${order.total_order || 0}</td>
                                <td class="center"><span class="status-badge ${order.status}">${this._statusLabel(order.status)}</span></td>
                                <td>${order.order_date || ''}</td>
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

      const [statusCounts, bizTypeStats, channelStats, waveStats, cutoffAlerts, recentOrders] = await Promise.all([
        this._fetchStatusCounts(),
        this._fetchBizTypeStats(),
        this._fetchChannelStats(),
        this._fetchWaveStats(),
        this._fetchCutoffAlerts(),
        this._fetchRecentOrders()
      ])

      this.statusCounts = statusCounts
      this.bizTypeStats = bizTypeStats
      this.channelStats = channelStats
      this.waveStats = waveStats
      this.cutoffAlerts = cutoffAlerts
      this.recentOrders = recentOrders

      this.loading = false

      this.updateComplete.then(() => this._renderCharts())
    } catch (error) {
      console.error('OMS 대시보드 데이터 로딩 실패:', error)
      this.loading = false
    }
  }

  /** 상태별 건수 조회 */
  async _fetchStatusCounts() {
    try {
      const data = await ServiceUtil.restGet('oms_dashboard/status_counts')
      return data || {}
    } catch (error) {
      console.error('상태별 건수 조회 실패:', error)
      return {}
    }
  }

  /** 업무 유형별 통계 조회 */
  async _fetchBizTypeStats() {
    try {
      const data = await ServiceUtil.restGet('oms_dashboard/biz_type_stats')
      return data || { B2C_OUT: 0, B2B_OUT: 0, B2C_RTN: 0, B2B_RTN: 0 }
    } catch (error) {
      console.error('업무유형별 통계 조회 실패:', error)
      return { B2C_OUT: 0, B2B_OUT: 0, B2C_RTN: 0, B2B_RTN: 0 }
    }
  }

  /** 채널별 통계 조회 */
  async _fetchChannelStats() {
    try {
      const data = await ServiceUtil.restGet('oms_dashboard/channel_stats')
      return data || []
    } catch (error) {
      console.error('채널별 통계 조회 실패:', error)
      return []
    }
  }

  /** 웨이브 현황 조회 */
  async _fetchWaveStats() {
    try {
      const data = await ServiceUtil.restGet('oms_dashboard/wave_stats')
      return data || { CREATED: 0, RELEASED: 0, COMPLETED: 0, CANCELLED: 0 }
    } catch (error) {
      console.error('웨이브 현황 조회 실패:', error)
      return { CREATED: 0, RELEASED: 0, COMPLETED: 0, CANCELLED: 0 }
    }
  }

  /** 마감 알림 조회 */
  async _fetchCutoffAlerts() {
    try {
      const data = await ServiceUtil.restGet('oms_dashboard/cutoff_alerts')
      return data || []
    } catch (error) {
      console.error('마감 알림 조회 실패:', error)
      return []
    }
  }

  /** 최근 주문 조회 (기존 CRUD API 활용) */
  async _fetchRecentOrders() {
    try {
      let today = ValueUtil.todayFormatted();
      const data = await ServiceUtil.restGet('shipment_orders?page=1&limit=5&query=' + encodeURIComponent('[{"name":"order_date","operator":"eq","value":"' + today + '"}]') + '&sort=' + encodeURIComponent('[{"field":"created_at","ascending":false}]'))
      return (data && data.items) ? data.items : []
    } catch (error) {
      console.error('최근 주문 조회 실패:', error)
      return []
    }
  }

  /** 차트 일괄 렌더링 */
  _renderCharts() {
    this._renderBizTypeChart()
    this._renderChannelChart()
    this._renderWaveChart()
  }

  /** ② 업무유형별 도넛 차트 렌더링 */
  _renderBizTypeChart() {
    const canvas = this.shadowRoot.querySelector('#bizTypeChart')
    if (!canvas) return

    if (this._bizTypeChart) {
      this._bizTypeChart.destroy()
    }

    const ctx = canvas.getContext('2d')
    this._bizTypeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['B2C 출고', 'B2B 출고', 'B2C 반품', 'B2B 반품'],
        datasets: [{
          data: [
            this.bizTypeStats.B2C_OUT || 0,
            this.bizTypeStats.B2B_OUT || 0,
            this.bizTypeStats.B2C_RTN || 0,
            this.bizTypeStats.B2B_RTN || 0
          ],
          backgroundColor: ['#03A9F4', '#1976D2', '#F44336', '#D32F2F']
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

  /** ③ 채널별 수평 막대 차트 렌더링 */
  _renderChannelChart() {
    const canvas = this.shadowRoot.querySelector('#channelChart')
    if (!canvas) return

    if (this._channelChart) {
      this._channelChart.destroy()
    }

    const labels = this.channelStats.map(c => c.cust_nm || c.cust_cd || '미지정')
    const data = this.channelStats.map(c => c.count || 0)

    const ctx = canvas.getContext('2d')
    this._channelChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '주문 건수',
          data: data,
          backgroundColor: '#42A5F5',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.raw}건`
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

  /** ④ 웨이브 진행 수평 막대 차트 렌더링 */
  _renderWaveChart() {
    const canvas = this.shadowRoot.querySelector('#waveChart')
    if (!canvas) return

    if (this._waveChart) {
      this._waveChart.destroy()
    }

    const ctx = canvas.getContext('2d')
    this._waveChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['생성(CREATED)', '확정(RELEASED)', '완료(COMPLETED)'],
        datasets: [{
          label: '웨이브 수',
          data: [
            this.waveStats.CREATED || 0,
            this.waveStats.RELEASED || 0,
            this.waveStats.COMPLETED || 0
          ],
          backgroundColor: ['#7B1FA2', '#303F9F', '#4CAF50'],
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.raw}건`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    })
  }

  /** 웨이브 생성 팝업 열기 */
  _openWaveNewPopup() {
    openPopup(
      html`<auto-wave-create-popup
        @wave-created="${() => {
          this._fetchDashboardData()
        }}"
      ></auto-wave-create-popup>`,
      {
        backdrop: true,
        size: 'medium',
        title: i18next.t('title.auto_wave_create', { defaultValue: '자동 웨이브 생성' })
      }
    )
  }

  /** 지정된 페이지로 이동 */
  _navigateTo(page, filter) {
    UiUtil.pageNavigate(page, filter ? filter : {})
  }

  /** 주문 상세 페이지로 이동 */
  _navigateToDetail(order) {
    if (order && order.id) {
      UiUtil.pageNavigate('shipment-order-item', { id: order.id })
    }
  }

  /** 페이지 해제 시 Chart 인스턴스 정리 */
  pageDisposed(lifecycle) {
    if (this._bizTypeChart) {
      this._bizTypeChart.destroy()
      this._bizTypeChart = null
    }
    if (this._channelChart) {
      this._channelChart.destroy()
      this._channelChart = null
    }
    if (this._waveChart) {
      this._waveChart.destroy()
      this._waveChart = null
    }
  }
}

window.customElements.define('oms-home', OmsHome)
