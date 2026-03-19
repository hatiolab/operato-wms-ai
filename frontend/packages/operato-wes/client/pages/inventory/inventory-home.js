import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

class InventoryHome extends localize(i18next)(PageView) {
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

        /* 재고 현황 카드 그리드 */
        .status-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        .status-card.total { border-left: 4px solid #2196F3; }
        .status-card.stored { border-left: 4px solid #4CAF50; }
        .status-card.reserved { border-left: 4px solid #FF9800; }
        .status-card.shortage { border-left: 4px solid #F44336; }

        /* 차트 컨테이너 */
        .chart-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .chart-container {
          width: 100%;
          height: 300px;
          position: relative;
        }

        #statusChart {
          max-height: 300px;
        }

        /* 유효기한/로케이션 카드 */
        .stat-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--spacing-medium, 16px);
        }

        .stat-card {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-medium, 16px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
          text-align: center;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          box-shadow: var(--box-shadow-normal, 0 4px 8px rgba(0, 0, 0, 0.15));
          transform: translateY(-2px);
        }

        .stat-card .label {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 8px;
        }

        .stat-card .count {
          font-size: 28px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
        }

        .stat-card .details {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 4px;
        }

        .stat-card.normal { border-left: 4px solid #4CAF50; }
        .stat-card.imminent { border-left: 4px solid #FF9800; }
        .stat-card.expired { border-left: 4px solid #F44336; }
        .stat-card.storage { border-left: 4px solid #2196F3; }
        .stat-card.picking { border-left: 4px solid #4CAF50; }
        .stat-card.other { border-left: 4px solid #9E9E9E; }

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

        .alert-item.warning {
          background: #FFF3E0;
          border-left: 4px solid #FF9800;
        }

        .alert-item.error {
          background: #FFEBEE;
          border-left: 4px solid #F44336;
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
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        @media screen and (max-width: 768px) {
          .status-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .stat-cards {
            grid-template-columns: 1fr;
          }

          .quick-actions {
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
      statusCounts: Object,
      statusStats: Object,
      expireStats: Object,
      locationStats: Object,
      alerts: Array
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.statusCounts = {
      total_sku: 0,
      total_qty: 0,
      stored_qty: 0,
      reserved_qty: 0,
      picking_qty: 0,
      locked_qty: 0,
      bad_qty: 0,
      shortage_count: 0
    }
    this.statusStats = {
      STORED: 0,
      RESERVED: 0,
      PICKING: 0,
      LOCKED: 0,
      BAD: 0
    }
    this.expireStats = {
      NORMAL: { sku_count: 0, qty: 0 },
      IMMINENT: { sku_count: 0, qty: 0 },
      EXPIRED: { sku_count: 0, qty: 0 }
    }
    this.locationStats = {
      STORAGE: { total: 0, used: 0, usage_rate: 0 },
      PICKING: { total: 0, used: 0, usage_rate: 0 },
      OTHER: { total: 0, used: 0, usage_rate: 0 }
    }
    this.alerts = []
  }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: `재고 관리 대시보드`
    }
  }

  /** 화면 렌더링 - 로딩 상태이면 로딩 표시, 아니면 대시보드 전체 출력 */
  render() {
    return html`
      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : html`
            <div class="dashboard-container">
              <!-- 재고 현황 카드 -->
              <section>
                <h3 class="section-title">📦 재고 현황</h3>
                <div class="status-cards">
                  <div class="status-card total" @click="${() => this._navigateTo('inventories')}">
                    <div class="label">전체 재고</div>
                    <div class="count">${this.statusCounts.total_sku || 0}</div>
                    <div class="subtitle">SKU / ${this._formatNumber(this.statusCounts.total_qty || 0)}개</div>
                  </div>
                  <div class="status-card stored" @click="${() => this._navigateTo('inventories', { status: 'STORED' })}">
                    <div class="label">가용 재고</div>
                    <div class="count">${this._formatNumber(this.statusCounts.stored_qty || 0)}</div>
                    <div class="subtitle">출고 가능</div>
                  </div>
                  <div class="status-card reserved" @click="${() => this._navigateTo('inventories', { status: 'RESERVED' })}">
                    <div class="label">할당 재고</div>
                    <div class="count">${this._formatNumber(this.statusCounts.reserved_qty || 0)}</div>
                    <div class="subtitle">출고 예약됨</div>
                  </div>
                  <div class="status-card shortage">
                    <div class="label">부족 재고</div>
                    <div class="count">${this.statusCounts.shortage_count || 0}</div>
                    <div class="subtitle">안전재고 미만</div>
                  </div>
                </div>
              </section>

              <!-- 재고 상태별 차트 -->
              <section class="chart-section">
                <h3 class="section-title">📊 재고 상태별 현황</h3>
                <div class="chart-container">
                  <canvas id="statusChart"></canvas>
                </div>
              </section>

              <!-- 유효기한 상태 -->
              <section>
                <h3 class="section-title">📅 유효기한 상태</h3>
                <div class="stat-cards">
                  <div class="stat-card normal">
                    <div class="label">정상 재고</div>
                    <div class="count">${this.expireStats.NORMAL?.sku_count || 0}</div>
                    <div class="details">${this._formatNumber(this.expireStats.NORMAL?.qty || 0)}개</div>
                  </div>
                  <div class="stat-card imminent">
                    <div class="label">유효기한 임박</div>
                    <div class="count">${this.expireStats.IMMINENT?.sku_count || 0}</div>
                    <div class="details">${this._formatNumber(this.expireStats.IMMINENT?.qty || 0)}개 (30일 이내)</div>
                  </div>
                  <div class="stat-card expired">
                    <div class="label">유효기한 만료</div>
                    <div class="count">${this.expireStats.EXPIRED?.sku_count || 0}</div>
                    <div class="details">${this._formatNumber(this.expireStats.EXPIRED?.qty || 0)}개</div>
                  </div>
                </div>
              </section>

              <!-- 로케이션 유형별 통계 -->
              <section>
                <h3 class="section-title">📍 로케이션 사용 현황</h3>
                <div class="stat-cards">
                  <div class="stat-card storage">
                    <div class="label">보관 로케이션</div>
                    <div class="count">${this.locationStats.STORAGE?.usage_rate?.toFixed(1) || 0}%</div>
                    <div class="details">${this.locationStats.STORAGE?.used || 0} / ${this.locationStats.STORAGE?.total || 0}</div>
                  </div>
                  <div class="stat-card picking">
                    <div class="label">피킹 로케이션</div>
                    <div class="count">${this.locationStats.PICKING?.usage_rate?.toFixed(1) || 0}%</div>
                    <div class="details">${this.locationStats.PICKING?.used || 0} / ${this.locationStats.PICKING?.total || 0}</div>
                  </div>
                  <div class="stat-card other">
                    <div class="label">기타 로케이션</div>
                    <div class="count">${this.locationStats.OTHER?.usage_rate?.toFixed(1) || 0}%</div>
                    <div class="details">${this.locationStats.OTHER?.used || 0} / ${this.locationStats.OTHER?.total || 0}</div>
                  </div>
                </div>
              </section>

              <!-- 주의 항목 -->
              ${this.alerts && this.alerts.length > 0
            ? html`
                    <section class="alerts-section">
                      <h3 class="section-title">⚠️ 주의 항목</h3>
                      ${this.alerts.map(
              alert => html`
                          <div class="alert-item ${alert.type}">
                            <span class="icon">${alert.icon}</span>
                            <span class="message">${alert.message}</span>
                          </div>
                        `
            )}
                    </section>
                  `
            : ''}

              <!-- 바로가기 -->
              <section>
                <div class="quick-actions">
                  <button class="quick-action-btn" @click="${() => this._navigateTo('inventories')}">
                    <span class="icon">🔍</span>재고 조회
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('stock-adjustments')}">
                    <span class="icon">⚙️</span>재고 조정
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('stocktakes')}">
                    <span class="icon">📋</span>실사 작업
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('stock-moves')}">
                    <span class="icon">🔄</span>재고 이동
                  </button>
                </div>
              </section>
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

      // 재고 현황 조회
      const statusCountsResponse = await this._fetchStatusCounts()
      this.statusCounts = statusCountsResponse

      // 재고 상태별 통계
      const statusStatsResponse = await this._fetchStatusStats()
      this.statusStats = statusStatsResponse

      // 유효기한 상태별 통계
      const expireStatsResponse = await this._fetchExpireStats()
      this.expireStats = expireStatsResponse

      // 로케이션 통계
      const locationStatsResponse = await this._fetchLocationStats()
      this.locationStats = locationStatsResponse

      // 알림 데이터
      this.alerts = await this._fetchAlerts()

      this.loading = false

      // 차트 렌더링
      this.updateComplete.then(() => this._renderChart())
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error)
      this.loading = false
    }
  }

  /** 재고 현황 조회 (전체/가용/할당/부족) */
  async _fetchStatusCounts() {
    try {
      const data = await ServiceUtil.restGet('inventory_trx/dashboard/status-counts')
      return data || {
        total_sku: 0,
        total_qty: 0,
        stored_qty: 0,
        reserved_qty: 0,
        picking_qty: 0,
        locked_qty: 0,
        bad_qty: 0,
        shortage_count: 0
      }
    } catch (error) {
      console.error('재고 현황 조회 실패:', error)
      return {
        total_sku: 0,
        total_qty: 0,
        stored_qty: 0,
        reserved_qty: 0,
        picking_qty: 0,
        locked_qty: 0,
        bad_qty: 0,
        shortage_count: 0
      }
    }
  }

  /** 재고 상태별 통계 조회 */
  async _fetchStatusStats() {
    try {
      const data = await ServiceUtil.restGet('inventory_trx/dashboard/status-stats')
      return data || { STORED: 0, RESERVED: 0, PICKING: 0, LOCKED: 0, BAD: 0 }
    } catch (error) {
      console.error('재고 상태별 통계 조회 실패:', error)
      return { STORED: 0, RESERVED: 0, PICKING: 0, LOCKED: 0, BAD: 0 }
    }
  }

  /** 유효기한 상태별 통계 조회 */
  async _fetchExpireStats() {
    try {
      const data = await ServiceUtil.restGet('inventory_trx/dashboard/expire-stats')
      return (
        data || {
          NORMAL: { sku_count: 0, qty: 0 },
          IMMINENT: { sku_count: 0, qty: 0 },
          EXPIRED: { sku_count: 0, qty: 0 }
        }
      )
    } catch (error) {
      console.error('유효기한 통계 조회 실패:', error)
      return {
        NORMAL: { sku_count: 0, qty: 0 },
        IMMINENT: { sku_count: 0, qty: 0 },
        EXPIRED: { sku_count: 0, qty: 0 }
      }
    }
  }

  /** 로케이션 유형별 통계 조회 */
  async _fetchLocationStats() {
    try {
      const data = await ServiceUtil.restGet('inventory_trx/dashboard/location-stats')
      return (
        data || {
          STORAGE: { total: 0, used: 0, usage_rate: 0 },
          PICKING: { total: 0, used: 0, usage_rate: 0 },
          OTHER: { total: 0, used: 0, usage_rate: 0 }
        }
      )
    } catch (error) {
      console.error('로케이션 통계 조회 실패:', error)
      return {
        STORAGE: { total: 0, used: 0, usage_rate: 0 },
        PICKING: { total: 0, used: 0, usage_rate: 0 },
        OTHER: { total: 0, used: 0, usage_rate: 0 }
      }
    }
  }

  /** 대시보드 알림 데이터 조회 */
  async _fetchAlerts() {
    try {
      const data = await ServiceUtil.restGet('inventory_trx/dashboard/alerts')
      return data || []
    } catch (error) {
      console.error('알림 데이터 조회 실패:', error)
      return []
    }
  }

  /** Chart.js를 이용한 재고 상태별 막대 차트 렌더링 */
  _renderChart() {
    const canvas = this.shadowRoot.querySelector('#statusChart')
    if (!canvas) return

    // 기존 차트가 있으면 삭제
    if (this._chart) {
      this._chart.destroy()
    }

    const ctx = canvas.getContext('2d')
    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['보관 중', '예약됨', '피킹 중', '잠김', '불량'],
        datasets: [
          {
            label: '재고 수량',
            data: [
              this.statusStats.STORED || 0,
              this.statusStats.RESERVED || 0,
              this.statusStats.PICKING || 0,
              this.statusStats.LOCKED || 0,
              this.statusStats.BAD || 0
            ],
            backgroundColor: [
              '#2196F3', // 파란색 (STORED)
              '#FF9800', // 주황색 (RESERVED)
              '#9C27B0', // 보라색 (PICKING)
              '#9E9E9E', // 회색 (LOCKED)
              '#F44336' // 빨간색 (BAD)
            ],
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: context => {
                return `${context.label}: ${this._formatNumber(context.parsed.y)}개`
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => this._formatNumber(value)
            }
          }
        }
      }
    })
  }

  /** 숫자 포맷팅 (천단위 콤마) */
  _formatNumber(num) {
    return num ? num.toLocaleString() : 0
  }

  /** 지정된 페이지로 이동 (필터 조건 포함 가능) */
  _navigateTo(page, filter) {
    UiUtil.pageNavigate(page, filter ? filter : {})
  }

  /** 페이지 해제 시 Chart 인스턴스 정리 */
  pageDisposed(lifecycle) {
    // Chart 정리
    if (this._chart) {
      this._chart.destroy()
      this._chart = null
    }
  }
}

window.customElements.define('inventory-home', InventoryHome)
