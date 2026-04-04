import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

class OutboundHome extends localize(i18next)(PageView) {
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
        .status-card.reg { border-left: 4px solid #9E9E9E; }
        .status-card.ready { border-left: 4px solid #2196F3; }
        .status-card.run { border-left: 4px solid #FF9800; }
        .status-card.end { border-left: 4px solid #4CAF50; }

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

        /* 피킹/사업유형 카드 */
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

        .stat-card.wait { border-left: 4px solid #2196F3; }
        .stat-card.picking { border-left: 4px solid #FF9800; }
        .stat-card.picked { border-left: 4px solid #4CAF50; }
        .stat-card.b2b { border-left: 4px solid #9C27B0; }
        .stat-card.b2c { border-left: 4px solid #FF5722; }

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
      statusCounts: Object,
      typeStats: Object,
      pickingStats: Object,
      bizTypeStats: Object,
      alerts: Array
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.statusCounts = {
      REG: 0,
      READY: 0,
      RUN: 0,
      END: 0
    }
    this.typeStats = {
      NORMAL: 0,
      RETURN: 0,
      TRANSFER: 0,
      SCRAP: 0,
      ETC: 0
    }
    this.pickingStats = {
      WAIT: 0,
      RUN: 0,
      END: 0
    }
    this.bizTypeStats = {
      B2B: 0,
      B2C: 0
    }
    this.alerts = []
  }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: `출고 관리 대시보드`
    }
  }

  /** 화면 렌더링 - 로딩 상태이면 로딩 표시, 아니면 대시보드 전체 출력 */
  render() {
    return html`
      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : html`
            <div class="dashboard-container">
              <!-- 오늘의 출고 현황 -->
              <section>
                <div class="page-header">
                  <h2>오늘의 출고 현황</h2>
                  <div class="header-actions">
                    <button class="btn btn-outline" @click="${() => this._fetchDashboardData()}">${i18next.t('button.refresh', { defaultValue: '새로고침' })}</button>
                    <button class="btn btn-outline" @click="${() => this._navigateTo('release-orders')}">출고 지시 관리</button>
                    <button class="btn btn-outline" @click="${() => this._navigateTo('picking-orders')}">피킹 작업</button>
                    <button class="btn btn-outline" @click="${() => this._navigateTo('release-orders', { status: 'END' })}">출고 실적 조회</button>
                    <button class="btn btn-outline" @click="${() => this._navigateTo('inventories')}">재고 조회</button>
                  </div>
                </div>
                <div class="status-cards">
                  <div class="status-card reg" @click="${() => this._navigateTo('release-orders', { status: 'REG', rls_ord_date: ValueUtil.todayFormatted() })}">
                    <div class="label">작성중</div>
                    <div class="count">${this.statusCounts.REG || 0}</div>
                    <div class="subtitle">출고 준비</div>
                  </div>
                  <div class="status-card ready" @click="${() => this._navigateTo('release-orders', { status: 'READY', rls_ord_date: ValueUtil.todayFormatted() })}">
                    <div class="label">대기</div>
                    <div class="count">${this.statusCounts.READY || 0}</div>
                    <div class="subtitle">출고 대기</div>
                  </div>
                  <div class="status-card run" @click="${() => this._navigateTo('release-orders', { status: 'RUN', rls_ord_date: ValueUtil.todayFormatted() })}">
                    <div class="label">작업중</div>
                    <div class="count">${this.statusCounts.RUN || 0}</div>
                    <div class="subtitle">진행 중</div>
                  </div>
                  <div class="status-card end" @click="${() => this._navigateTo('release-orders', { status: 'END', rls_ord_date: ValueUtil.todayFormatted() })}">
                    <div class="label">완료</div>
                    <div class="count">${this.statusCounts.END || 0}</div>
                    <div class="subtitle">오늘 완료</div>
                  </div>
                </div>
              </section>

              <!-- 출고 유형별 현황 -->
              <section class="chart-section">
                <h3 class="section-title">출고 유형별 현황</h3>
                <div class="chart-container">
                  <canvas id="typeChart"></canvas>
                </div>
              </section>

              <!-- 피킹 현황 -->
              <section>
                <h3 class="section-title">피킹 현황</h3>
                <div class="stat-cards">
                  <div class="stat-card wait">
                    <div class="label">피킹 대기</div>
                    <div class="count">${this.pickingStats.WAIT || 0}</div>
                  </div>
                  <div class="stat-card picking">
                    <div class="label">피킹 중</div>
                    <div class="count">${this.pickingStats.RUN || 0}</div>
                  </div>
                  <div class="stat-card picked">
                    <div class="label">피킹 완료</div>
                    <div class="count">${this.pickingStats.END || 0}</div>
                  </div>
                </div>
              </section>

              <!-- 사업 유형별 현황 -->
              <section>
                <h3 class="section-title">사업 유형별 현황</h3>
                <div class="stat-cards">
                  <div class="stat-card b2b">
                    <div class="label">B2B 출고</div>
                    <div class="count">${this.bizTypeStats.B2B || 0}</div>
                  </div>
                  <div class="stat-card b2c">
                    <div class="label">B2C 출고</div>
                    <div class="count">${this.bizTypeStats.B2C || 0}</div>
                  </div>
                </div>
              </section>

              <!-- 주의 항목 -->
              ${this.alerts && this.alerts.length > 0
            ? html`
                    <section class="alerts-section">
                      <h3 class="section-title">주의 항목</h3>
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

  /** 대시보드 데이터 일괄 조회 (상태별 건수, 유형별 통계, 피킹 통계, 사업 유형 통계, 알림) */
  async _fetchDashboardData() {
    try {
      this.loading = true

      // 상태별 건수 조회
      const statusResponse = await this._fetchStatusCounts()
      this.statusCounts = statusResponse

      // 유형별 통계 조회
      const typeResponse = await this._fetchTypeStats()
      this.typeStats = typeResponse

      // 피킹 통계 조회
      const pickingResponse = await this._fetchPickingStats()
      this.pickingStats = pickingResponse

      // 사업 유형 통계 조회
      const bizTypeResponse = await this._fetchBizTypeStats()
      this.bizTypeStats = bizTypeResponse

      // 알림 데이터 생성
      this.alerts = await this._fetchAlerts()

      this.loading = false

      // 차트 렌더링
      this.updateComplete.then(() => this._renderChart())
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error)
      this.loading = false
    }
  }

  /** 출고 상태별 건수 조회 (작성중/대기/작업중/완료) */
  async _fetchStatusCounts() {
    try {
      const data = await ServiceUtil.restGet('outbound_trx/dashboard/status-counts')
      return data || { REG: 0, READY: 0, RUN: 0, END: 0 }
    } catch (error) {
      console.error('상태별 건수 조회 실패:', error)
      return { REG: 0, READY: 0, RUN: 0, END: 0 }
    }
  }

  /** 출고 유형별 통계 조회 (일반/반품/이동/폐기/기타) */
  async _fetchTypeStats() {
    try {
      const data = await ServiceUtil.restGet('outbound_trx/dashboard/type-stats')
      return data || { NORMAL: 0, RETURN: 0, TRANSFER: 0, SCRAP: 0, ETC: 0 }
    } catch (error) {
      console.error('유형별 통계 조회 실패:', error)
      return { NORMAL: 0, RETURN: 0, TRANSFER: 0, SCRAP: 0, ETC: 0 }
    }
  }

  /** 피킹 현황 통계 조회 (대기/진행중/완료) */
  async _fetchPickingStats() {
    try {
      const data = await ServiceUtil.restGet('outbound_trx/dashboard/picking-stats')
      return data || { WAIT: 0, RUN: 0, END: 0 }
    } catch (error) {
      console.error('피킹 통계 조회 실패:', error)
      return { WAIT: 0, RUN: 0, END: 0 }
    }
  }

  /** 사업 유형별 통계 조회 (B2B/B2C) */
  async _fetchBizTypeStats() {
    try {
      const data = await ServiceUtil.restGet('outbound_trx/dashboard/business-type-stats')
      return data || { B2B: 0, B2C: 0 }
    } catch (error) {
      console.error('사업 유형 통계 조회 실패:', error)
      return { B2B: 0, B2C: 0 }
    }
  }

  /** 대시보드 알림 데이터 조회 (지연, 피킹 대기 등) */
  async _fetchAlerts() {
    try {
      const data = await ServiceUtil.restGet('outbound_trx/dashboard/alerts')
      return data || []
    } catch (error) {
      console.error('알림 데이터 조회 실패:', error)
      return []
    }
  }

  /** Chart.js를 이용한 출고 유형별 막대 차트 렌더링 */
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
        labels: ['일반 출고', '반품 출고', '이동 출고', '폐기 출고', '기타 출고'],
        datasets: [
          {
            label: '출고 건수',
            data: [
              this.typeStats.NORMAL || 0,
              this.typeStats.RETURN || 0,
              this.typeStats.TRANSFER || 0,
              this.typeStats.SCRAP || 0,
              this.typeStats.ETC || 0
            ],
            backgroundColor: ['#2196F3', '#F44336', '#9C27B0', '#FF5722', '#9E9E9E'],
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

window.customElements.define('outbound-home', OutboundHome)
