import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

class RwaHome extends localize(i18next)(PageView) {
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
        .status-card.request { border-left: 4px solid #9E9E9E; }
        .status-card.receiving { border-left: 4px solid #00BCD4; }
        .status-card.inspecting { border-left: 4px solid #FF9800; }
        .status-card.disposing { border-left: 4px solid #9C27B0; }

        /* 차트 컨테이너 */
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

        #typeChart {
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
          background: #FFF3E0;
          border-left: 4px solid #FF9800;
        }

        .alert-item.warning {
          background: #FFEBEE;
          border-left-color: #F44336;
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

          .quick-actions {
            grid-template-columns: 1fr;
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      statusCounts: Object,
      typeStats: Object,
      alerts: Array
    }
  }

  constructor() {
    super()
    this.loading = true
    this.statusCounts = {
      REQUEST: 0,
      RECEIVING: 0,
      INSPECTING: 0,
      DISPOSED: 0
    }
    this.typeStats = {
      CUSTOMER_RETURN: 0,
      VENDOR_RETURN: 0,
      DEFECT_RETURN: 0,
      OTHER: 0
    }
    this.alerts = []
  }

  get context() {
    return {
      title: `반품 대시보드`
    }
  }

  render() {
    return html`
      <!--h2>🏠 반품 대시보드</h2>
      <p page-description>이 메뉴는 Operato WES 반품을 관리하는 메뉴입니다.</p-->

      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : html`
            <div class="dashboard-container">
              <!-- 오늘의 반품 현황 -->
              <section>
                <h3 class="section-title">📊 오늘의 반품 현황</h3>
                <div class="status-cards">
                  <div class="status-card request" @click="${() => this._navigateTo('rwa-orders', 'REQUEST')}">
                    <div class="label">요청대기</div>
                    <div class="count">${this.statusCounts.REQUEST || 0}</div>
                    <div class="subtitle">승인 대기 중</div>
                  </div>
                  <div class="status-card receiving" @click="${() => this._navigateTo('rwa-receive-list')}">
                    <div class="label">입고중</div>
                    <div class="count">${this.statusCounts.RECEIVING || 0}</div>
                    <div class="subtitle">입고 진행 중</div>
                  </div>
                  <div class="status-card inspecting" @click="${() => this._navigateTo('rwa-inspections')}">
                    <div class="label">검수중</div>
                    <div class="count">${this.statusCounts.INSPECTING || 0}</div>
                    <div class="subtitle">검수 진행 중</div>
                  </div>
                  <div class="status-card disposing" @click="${() => this._navigateTo('rwa-dispositions')}">
                    <div class="label">처분중</div>
                    <div class="count">${this.statusCounts.DISPOSED || 0}</div>
                    <div class="subtitle">처분 결정 대기</div>
                  </div>
                </div>
              </section>

              <!-- 반품 유형별 현황 -->
              <section class="chart-section">
                <h3 class="section-title">📈 반품 유형별 현황</h3>
                <div class="chart-container">
                  <canvas id="typeChart"></canvas>
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
                <!--h3 class="section-title">🎯 바로가기</h3-->
                <div class="quick-actions">
                  <button class="quick-action-btn" @click="${this._openRwaOrderNew}">
                    <span class="icon">📝</span>반품 요청
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('rwa-receive-list')}">
                    <span class="icon">📥</span>입고 처리
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('rwa-inspections')}">
                    <span class="icon">🔍</span>검수 작업
                  </button>
                  <button class="quick-action-btn" @click="${() => this._navigateTo('rwa-dispositions')}">
                    <span class="icon">🗂️</span>처분 결정
                  </button>
                </div>
              </section>
            </div>
          `}
    `
  }

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchDashboardData()
    }
  }

  async _fetchDashboardData() {
    try {
      this.loading = true

      // 상태별 건수 조회
      const statusResponse = await this._fetchStatusCounts()
      this.statusCounts = statusResponse

      // 유형별 통계 조회
      const typeResponse = await this._fetchTypeStats()
      this.typeStats = typeResponse

      // 알림 데이터 생성
      this.alerts = await this._generateAlerts()

      this.loading = false

      // 차트 렌더링
      this.updateComplete.then(() => this._renderChart())
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error)
      this.loading = false
    }
  }

  async _fetchStatusCounts() {
    try {
      const data = await ServiceUtil.restGet('rwa_trx/dashboard/status-counts')
      return data || { REQUEST: 0, RECEIVING: 0, INSPECTING: 0, DISPOSED: 0 }
    } catch (error) {
      console.error('상태별 건수 조회 실패:', error)
      return { REQUEST: 0, RECEIVING: 0, INSPECTING: 0, DISPOSED: 0 }
    }
  }

  async _fetchTypeStats() {
    try {
      const data = await ServiceUtil.restGet('rwa_trx/dashboard/type-stats')
      return data || { CUSTOMER_RETURN: 0, VENDOR_RETURN: 0, DEFECT_RETURN: 0, OTHER: 0 }
    } catch (error) {
      console.error('유형별 통계 조회 실패:', error)
      return { CUSTOMER_RETURN: 0, VENDOR_RETURN: 0, DEFECT_RETURN: 0, OTHER: 0 }
    }
  }

  async _generateAlerts() {
    try {
      const data = await ServiceUtil.restGet('rwa_trx/dashboard/alerts')
      return data || []
    } catch (error) {
      console.error('알림 데이터 조회 실패:', error)
      return []
    }
  }

  _renderChart() {
    const canvas = this.shadowRoot.querySelector('#typeChart')
    if (!canvas) return

    // 기존 차트가 있으면 삭제
    if (this._chart) {
      this._chart.destroy()
    }

    const ctx = canvas.getContext('2d')
    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['고객 반품', '공급사 반품', '불량품', '기타'],
        datasets: [
          {
            label: '반품 건수',
            data: [
              this.typeStats.CUSTOMER_RETURN || 0,
              this.typeStats.VENDOR_RETURN || 0,
              this.typeStats.DEFECT_RETURN || 0,
              this.typeStats.OTHER || 0
            ],
            backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#9E9E9E'],
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
                return `${context.label}: ${context.parsed.y}건`
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 10,
              callback: value => `${value}건`
            }
          }
        }
      }
    })
  }

  _navigateTo(page, filter) {
    UiUtil.pageNavigate(page, filter ? { status: filter } : null)
  }

  /**
   * 반품 요청 등록 팝업 열기
   */
  _openRwaOrderNew() {
    const element = document.createElement('rwa-order-new')
    element.addEventListener('order-created', () => {
      this._fetchDashboardData()
    })
    UiUtil.openPopupByElement('반품 요청 등록', 'large', element, true)
  }

  /**
   * 반품 요청 상세 팝업 열기
   */
  _openRwaOrderDetail(orderId) {
    const element = document.createElement('rwa-order-detail')
    element.rwaOrderId = orderId
    element.addEventListener('order-updated', () => {
      this._fetchDashboardData()
    })
    UiUtil.openPopupByElement('반품 상세', 'large', element, true)
  }

  pageDisposed(lifecycle) {
    // Chart 정리
    if (this._chart) {
      this._chart.destroy()
      this._chart = null
    }
  }
}

window.customElements.define('rwa-home', RwaHome)
