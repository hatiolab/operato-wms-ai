import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { openPopup } from '@operato/layout'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import Chart from 'chart.js/auto'

import { vasEventClient } from './vas-event-client'
import './vas-order-new-popup'

class VasHome extends localize(i18next)(PageView) {
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
        /* 대시보드 레이아웃 */
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-large, 24px);
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
          font: var(--title-font);
          color: var(--title-text-color);
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
        .status-card.plan { border-left: 4px solid #9E9E9E; }
        .status-card.approved { border-left: 4px solid #2196F3; }
        .status-card.in-progress { border-left: 4px solid #FF9800; }
        .status-card.completed { border-left: 4px solid #4CAF50; }

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
      alerts: Array
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.statusCounts = {
      PLAN: 0,
      APPROVED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0
    }
    this.typeStats = {
      ASSEMBLY: 0,
      DISASSEMBLY: 0,
      REPACK: 0,
      LABELING: 0
    }
    this.alerts = []
    this._boundOnSseEvent = this._onSseEvent.bind(this)
  }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: TermsUtil.tMenu('VasHome')
    }
  }

  /** 화면 렌더링 - 로딩 상태이면 로딩 표시, 아니면 대시보드 전체 출력 */
  render() {
    return html`
      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : html`
            <div class="dashboard-container">
              <!-- 페이지 헤더 -->
              <div class="page-header">
                <h2>${TermsUtil.tMenu('VasHome')}</h2>
                <div class="header-actions">
                  <button class="btn btn-outline" @click="${() => this._fetchDashboardData()}">🔍 ${i18next.t('button.refresh', { defaultValue: '새로고침' })}</button>
                  <button class="btn btn-outline" @click="${this._openOrderNewPopup}">📝 ${i18next.t('button.vas_order_new', { defaultValue: '작업 지시 생성' })}</button>
                  <button class="btn btn-outline" @click="${() => this._navigateTo('vas-work-monitor', { status: 'IN_PROGRESS', vas_req_date: ValueUtil.todayFormatted() })}">📊 ${i18next.t('button.vas_work_monitor', { defaultValue: '작업 진행 현황' })}</button>
                  <button class="btn btn-outline" @click="${() => this._navigateTo('vas-results')}">📋 ${i18next.t('button.vas_results', { defaultValue: '실적 조회' })}</button>
                  <button class="btn btn-outline" @click="${() => this._navigateTo('vas-boms')}">📦 ${i18next.t('button.vas_boms', { defaultValue: '세트 상품 관리' })}</button>
                </div>
              </div>

              <!-- 오늘의 작업 현황 -->
              <section>
                <div class="status-cards">
                  <div class="status-card plan" @click="${() => this._navigateTo('vas-orders', { status: 'PLAN', vas_req_date: ValueUtil.todayFormatted() })}">
                    <div class="label">등록 중</div>
                    <div class="count">${this.statusCounts.PLAN || 0}</div>
                    <div class="subtitle">승인 대기</div>
                  </div>
                  <div class="status-card approved" @click="${() => this._navigateTo('vas-orders', { status: 'APPROVED', vas_req_date: ValueUtil.todayFormatted() })}">
                    <div class="label">승인 완료</div>
                    <div class="count">${this.statusCounts.APPROVED || 0}</div>
                    <div class="subtitle">작업 대기</div>
                  </div>
                  <div class="status-card in-progress" @click="${() => this._navigateTo('vas-work-monitor', { status: 'IN_PROGRESS', vas_req_date: ValueUtil.todayFormatted() })}">
                    <div class="label">작업 중</div>
                    <div class="count">${this.statusCounts.IN_PROGRESS || 0}</div>
                    <div class="subtitle">진행 중</div>
                  </div>
                  <div class="status-card completed" @click="${() => this._navigateTo('vas-results')}">
                    <div class="label">완료</div>
                    <div class="count">${this.statusCounts.COMPLETED || 0}</div>
                    <div class="subtitle">작업 완료</div>
                  </div>
                </div>
              </section>

              <!-- VAS 유형별 현황 -->
              <section class="chart-section">
                <h3 class="section-title">${i18next.t('title.vas_type_stats', { defaultValue: 'VAS 유형별 현황' })}</h3>
                <div class="chart-container">
                  <canvas id="typeChart"></canvas>
                </div>
              </section>

              <!-- 주의 항목 -->
              ${this.alerts && this.alerts.length > 0
            ? html`
                    <section class="alerts-section">
                      <h3 class="section-title">${i18next.t('title.alerts', { defaultValue: '주의 항목' })}</h3>
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

  /** 페이지 활성화 시 대시보드 데이터 조회 + SSE 연결 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchDashboardData()
      // SSE 연결
      vasEventClient.connect()
      vasEventClient.on('*', this._boundOnSseEvent)
    }
  }

  /** 대시보드 데이터 일괄 조회 (상태별 건수, 유형별 통계, 알림) */
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

  /** VAS 주문 상태별 건수 조회 (대기/승인/진행/완료) */
  async _fetchStatusCounts() {
    try {
      const data = await ServiceUtil.restGet('vas_trx/dashboard/status-counts')
      return data || { PLAN: 0, APPROVED: 0, IN_PROGRESS: 0, COMPLETED: 0 }
    } catch (error) {
      console.error('상태별 건수 조회 실패:', error)
      return { PLAN: 0, APPROVED: 0, IN_PROGRESS: 0, COMPLETED: 0 }
    }
  }

  /** VAS 유형별 통계 조회 (세트구성/해체/재포장/라벨링) */
  async _fetchTypeStats() {
    try {
      const data = await ServiceUtil.restGet('vas_trx/dashboard/type-stats')
      return data || { ASSEMBLY: 0, DISASSEMBLY: 0, REPACK: 0, LABELING: 0 }
    } catch (error) {
      console.error('유형별 통계 조회 실패:', error)
      return { ASSEMBLY: 0, DISASSEMBLY: 0, REPACK: 0, LABELING: 0 }
    }
  }

  /** 대시보드 알림 데이터 조회 (자재 부족, 지연 등) */
  async _generateAlerts() {
    try {
      const data = await ServiceUtil.restGet('vas_trx/dashboard/alerts')
      return data || []
    } catch (error) {
      console.error('알림 데이터 조회 실패:', error)
      return []
    }
  }

  /** Chart.js를 이용한 VAS 유형별 막대 차트 렌더링 */
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
        labels: ['세트 구성', '세트 해체', '재포장', '라벨링'],
        datasets: [
          {
            label: '작업 건수',
            data: [
              this.typeStats.ASSEMBLY || 0,
              this.typeStats.DISASSEMBLY || 0,
              this.typeStats.REPACK || 0,
              this.typeStats.LABELING || 0
            ],
            backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0'],
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

  /** 작업 지시 생성 팝업 열기 */
  _openOrderNewPopup() {
    openPopup(
      html`<vas-order-new-popup
        @order-created="${() => {
          this._fetchDashboardData()
        }}"
      ></vas-order-new-popup>`,
      {
        backdrop: true,
        size: 'large',
        title: '작업 지시 생성'
      }
    )
  }

  /** 지정된 페이지로 이동 (필터 조건 포함 가능) */
  _navigateTo(page, filter) {
    UiUtil.pageNavigate(page, filter ? filter : {})
  }

  /** SSE 이벤트 수신 시 대시보드 데이터 자동 갱신 */
  _onSseEvent(event) {
    this._fetchDashboardData()
  }

  /** 페이지 해제 시 Chart 인스턴스 + SSE 연결 정리 */
  pageDisposed(lifecycle) {
    // SSE 연결 해제
    vasEventClient.off('*', this._boundOnSseEvent)
    vasEventClient.disconnect()

    // Chart 정리
    if (this._chart) {
      this._chart.destroy()
      this._chart = null
    }
  }
}

window.customElements.define('vas-home', VasHome)
