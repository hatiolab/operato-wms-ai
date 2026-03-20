import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * VAS 작업 진행 모니터링 화면
 *
 * 기능:
 * - 작업중/승인/자재준비 상태 주문의 실시간 진행 현황
 * - 10초 간격 자동 새로고침 (Polling)
 * - 프로그레스 바로 진행률 시각화
 * - 자재 준비 상태, 작업 진행률, 경과 시간 표시
 * - 알림 영역 (자재 부족, 작업 지연)
 */
class VasWorkMonitor extends localize(i18next)(PageView) {
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

        /* 페이지 헤더 */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .page-header h2 {
          margin: 0;
          font: var(--title-font);
          color: var(--title-text-color);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .auto-refresh-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .auto-refresh-label .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4CAF50;
          animation: pulse 2s infinite;
        }

        .auto-refresh-label .dot.paused {
          background: #9E9E9E;
          animation: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .btn-icon {
          background: var(--md-sys-color-surface, #fff);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        /* 필터 바 */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: var(--box-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.08));
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .filter-group label {
          color: var(--md-sys-color-on-surface-variant, #666);
          font-weight: 500;
        }

        .filter-group select {
          padding: 6px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          background: var(--md-sys-color-surface, #fff);
          outline: none;
        }

        .filter-divider {
          width: 1px;
          height: 24px;
          background: var(--md-sys-color-outline-variant, #e0e0e0);
        }

        /* 통계 요약 */
        .summary-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .summary-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .summary-chip:hover {
          transform: translateY(-1px);
        }

        .summary-chip.all {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
        }

        .summary-chip.in-progress {
          background: #FFF3E0;
          color: #E65100;
        }

        .summary-chip.approved {
          background: #E3F2FD;
          color: #1565C0;
        }

        .summary-chip.material-ready {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .summary-chip.active {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .summary-chip .chip-count {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        /* 작업 카드 목록 */
        .order-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 20px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.08));
          transition: all 0.2s;
        }

        .order-card:hover {
          box-shadow: var(--box-shadow-normal, 0 4px 12px rgba(0, 0, 0, 0.12));
        }

        .order-card.high-priority {
          border-left: 4px solid #F44336;
        }

        .order-card.normal-priority {
          border-left: 4px solid #FF9800;
        }

        .order-card.low-priority {
          border-left: 4px solid #4CAF50;
        }

        /* 카드 헤더 */
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-title .vas-no {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .card-title .vas-type-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          background: #E3F2FD;
          color: #1565C0;
        }

        .card-title .set-sku {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .card-title .plan-qty {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .card-status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .card-status-badge.IN_PROGRESS {
          background: #FFF3E0;
          color: #E65100;
        }

        .card-status-badge.APPROVED {
          background: #E3F2FD;
          color: #1565C0;
        }

        .card-status-badge.MATERIAL_READY {
          background: #E8F5E9;
          color: #2E7D32;
        }

        /* 프로그레스 바 */
        .progress-section {
          margin-bottom: 14px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .progress-header .progress-label {
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .progress-header .progress-value {
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .progress-bar-bg {
          width: 100%;
          height: 10px;
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          border-radius: 5px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.6s ease;
          background: linear-gradient(90deg, #FF9800, #F57C00);
        }

        .progress-bar-fill.complete {
          background: linear-gradient(90deg, #4CAF50, #388E3C);
        }

        .progress-bar-fill.high {
          background: linear-gradient(90deg, #FF9800, #F57C00);
        }

        .progress-bar-fill.low {
          background: linear-gradient(90deg, #2196F3, #1976D2);
        }

        /* 상세 지표 */
        .card-metrics {
          display: flex;
          gap: 24px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .metric-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }

        .metric-item .metric-icon {
          font-size: 16px;
        }

        .metric-item .metric-label {
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .metric-item .metric-value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .metric-item .metric-value.ok {
          color: #2E7D32;
        }

        .metric-item .metric-value.warn {
          color: #E65100;
        }

        /* 카드 액션 */
        .card-actions {
          display: flex;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #eee);
          flex-wrap: wrap;
        }

        .card-action-btn {
          padding: 6px 14px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--md-sys-color-on-surface, #333);
        }

        .card-action-btn:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .card-action-btn.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border-color: transparent;
        }

        .card-action-btn.primary:hover {
          background: #1565C0;
        }

        .card-action-btn.success {
          background: #4CAF50;
          color: #fff;
          border-color: transparent;
        }

        .card-action-btn.success:hover {
          background: #388E3C;
        }

        /* 알림 영역 */
        .alerts-section {
          margin-top: 24px;
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 20px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.08));
        }

        .alerts-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-bottom: 12px;
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          margin-bottom: 8px;
          border-radius: 8px;
          font-size: 13px;
        }

        .alert-item:last-child {
          margin-bottom: 0;
        }

        .alert-item.warning {
          background: #FFF3E0;
          border-left: 3px solid #FF9800;
          color: #E65100;
        }

        .alert-item.error {
          background: #FFEBEE;
          border-left: 3px solid #F44336;
          color: #C62828;
        }

        .alert-item.info {
          background: #E3F2FD;
          border-left: 3px solid #2196F3;
          color: #1565C0;
        }

        /* 빈 상태 */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-state .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state .empty-message {
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .empty-state .empty-sub {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #999);
          margin-top: 4px;
        }

        /* 로딩 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 60px;
          font-size: 15px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* 반응형 */
        @media screen and (max-width: 768px) {
          .card-metrics {
            gap: 12px;
          }

          .summary-bar {
            flex-wrap: wrap;
          }

          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-divider {
            display: none;
          }
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      loading: Boolean,
      orders: Array,
      alerts: Array,
      statusFilter: String,
      autoRefresh: Boolean,
      lastRefreshed: String
    }
  }

  /** 생성자 - 초기 상태값 및 자동 새로고침 타이머 초기화 */
  constructor() {
    super()
    this.loading = true
    this.orders = []
    this.alerts = []
    this.statusFilter = 'ALL'
    this.autoRefresh = true
    this.lastRefreshed = ''
    this._refreshTimer = null
  }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: '유통가공 작업 진행 모니터링'
    }
  }

  /** 화면 렌더링 - 헤더, 필터, 요약 칩, 작업 카드 목록, 알림 구성 */
  render() {
    return html`
      <!-- 페이지 헤더 -->
      <div class="page-header">
        <h2>유통가공 작업 진행 모니터링</h2>
        <div class="header-actions">
          <div class="auto-refresh-label">
            <span class="dot ${this.autoRefresh ? '' : 'paused'}"></span>
            ${this.autoRefresh ? '10초 자동 새로고침' : '자동 새로고침 꺼짐'}
          </div>
          <button class="btn-icon" @click="${this._toggleAutoRefresh}">
            ${this.autoRefresh ? '일시정지' : '재개'}
          </button>
          <button class="btn-icon" @click="${this._refresh}">
            새로고침
          </button>
        </div>
      </div>

      <!-- 필터 바 -->
      ${this._renderFilterBar()}

      <!-- 통계 요약 칩 -->
      ${this._renderSummaryBar()}

      <!-- 작업 카드 목록 -->
      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : this._filteredOrders.length === 0
          ? this._renderEmptyState()
          : html`
              <div class="order-cards">
                ${this._filteredOrders.map(order => this._renderOrderCard(order))}
              </div>
            `}

      <!-- 알림 영역 -->
      ${this.alerts && this.alerts.length > 0 ? this._renderAlerts() : ''}
    `
  }

  /** 상태 필터 바 렌더링 (전체/작업중/자재준비/승인됨) */
  _renderFilterBar() {
    return html`
      <div class="filter-bar">
        <div class="filter-group">
          <label>상태:</label>
          <select @change="${e => { this.statusFilter = e.target.value }}">
            <option value="ALL" ?selected="${this.statusFilter === 'ALL'}">전체</option>
            <option value="IN_PROGRESS" ?selected="${this.statusFilter === 'IN_PROGRESS'}">작업중</option>
            <option value="MATERIAL_READY" ?selected="${this.statusFilter === 'MATERIAL_READY'}">자재준비</option>
            <option value="APPROVED" ?selected="${this.statusFilter === 'APPROVED'}">승인됨</option>
          </select>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group">
          <span style="color: var(--md-sys-color-on-surface-variant, #999); font-size: 12px;">
            마지막 갱신: ${this.lastRefreshed || '-'}
          </span>
        </div>
      </div>
    `
  }

  /** 상태별 건수 요약 칩 렌더링 (클릭 시 필터 변경) */
  _renderSummaryBar() {
    const all = this.orders.length
    const inProgress = this.orders.filter(o => o.status === 'IN_PROGRESS').length
    const approved = this.orders.filter(o => o.status === 'APPROVED').length
    const materialReady = this.orders.filter(o => o.status === 'MATERIAL_READY').length

    return html`
      <div class="summary-bar">
        <div
          class="summary-chip all ${this.statusFilter === 'ALL' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'ALL' }}"
        >
          전체 <span class="chip-count">${all}</span>
        </div>
        <div
          class="summary-chip in-progress ${this.statusFilter === 'IN_PROGRESS' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'IN_PROGRESS' }}"
        >
          작업중 <span class="chip-count">${inProgress}</span>
        </div>
        <div
          class="summary-chip material-ready ${this.statusFilter === 'MATERIAL_READY' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'MATERIAL_READY' }}"
        >
          자재준비 <span class="chip-count">${materialReady}</span>
        </div>
        <div
          class="summary-chip approved ${this.statusFilter === 'APPROVED' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'APPROVED' }}"
        >
          승인대기 <span class="chip-count">${approved}</span>
        </div>
      </div>
    `
  }

  /** 개별 작업 주문 카드 렌더링 (진행률, 자재 상태, 지표, 액션 버튼) */
  _renderOrderCard(order) {
    const planQty = order.plan_qty || 0
    const completedQty = order.completed_qty || 0
    const progressPct = planQty > 0 ? Math.round((completedQty / planQty) * 100) : 0

    const totalItems = order.total_items || 0
    const pickedItems = order.picked_items || 0
    const materialPct = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0

    const priority = (order.priority || 'NORMAL').toLowerCase()
    const elapsed = this._getElapsedTime(order.started_at)
    const startTime = this._formatTime(order.started_at)

    return html`
      <div class="order-card ${priority}-priority">
        <!-- 카드 헤더 -->
        <div class="card-header">
          <div class="card-title">
            <span class="vas-no">${order.vas_no}</span>
            <span class="vas-type-badge">${this._vasTypeLabel(order.vas_type)}</span>
            <span class="set-sku">${order.set_sku_cd || ''}</span>
            <span class="plan-qty">(${planQty} EA)</span>
          </div>
          <span class="card-status-badge ${order.status}">${this._statusLabel(order.status)}</span>
        </div>

        <!-- 프로그레스 바 -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">작업 진행률</span>
            <span class="progress-value">${progressPct}% (${completedQty} / ${planQty} EA)</span>
          </div>
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill ${progressPct >= 100 ? 'complete' : progressPct >= 50 ? 'high' : 'low'}"
              style="width: ${Math.min(progressPct, 100)}%"
            ></div>
          </div>
        </div>

        <!-- 상세 지표 -->
        <div class="card-metrics">
          <div class="metric-item">
            <span class="metric-icon">\u{1F4E6}</span>
            <span class="metric-label">자재:</span>
            <span class="metric-value ${materialPct >= 100 ? 'ok' : 'warn'}">
              ${materialPct}% (${pickedItems}/${totalItems})
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-icon">\u{1F4CB}</span>
            <span class="metric-label">실적:</span>
            <span class="metric-value">${completedQty} / ${planQty} EA</span>
          </div>
          ${order.worker_id
        ? html`
                <div class="metric-item">
                  <span class="metric-icon">\u{1F464}</span>
                  <span class="metric-label">작업자:</span>
                  <span class="metric-value">${order.worker_id}</span>
                </div>
              `
        : ''}
          ${startTime
        ? html`
                <div class="metric-item">
                  <span class="metric-icon">\u{1F552}</span>
                  <span class="metric-label">시작:</span>
                  <span class="metric-value">${startTime}</span>
                </div>
              `
        : ''}
          ${elapsed
        ? html`
                <div class="metric-item">
                  <span class="metric-icon">\u{23F1}</span>
                  <span class="metric-label">경과:</span>
                  <span class="metric-value">${elapsed}</span>
                </div>
              `
        : ''}
          ${order.priority === 'HIGH'
        ? html`
                <div class="metric-item">
                  <span class="metric-icon">\u{1F534}</span>
                  <span class="metric-value warn">높은 우선순위</span>
                </div>
              `
        : ''}
        </div>

        <!-- 액션 버튼 -->
        <div class="card-actions">
          ${this._renderCardActions(order)}
        </div>
      </div>
    `
  }

  /** 카드 하단 액션 버튼 렌더링 (상태에 따라 작업시작/완료/상세보기) */
  _renderCardActions(order) {
    const status = order.status
    const actions = []

    if (status === 'APPROVED') {
      actions.push(html`
        <button class="card-action-btn primary" @click="${() => this._startWork(order)}">작업 시작</button>
      `)
    }

    if (status === 'IN_PROGRESS') {
      actions.push(html`
        <button class="card-action-btn success" @click="${() => this._completeWork(order)}">작업 완료</button>
      `)
    }

    if (status === 'MATERIAL_READY') {
      actions.push(html`
        <button class="card-action-btn primary" @click="${() => this._startWork(order)}">작업 시작</button>
      `)
    }

    actions.push(html`
      <button class="card-action-btn" @click="${() => this._viewDetail(order)}">상세 보기</button>
    `)

    return actions
  }

  /** 알림 영역 렌더링 (자재 부족, 작업 지연 등 경고 표시) */
  _renderAlerts() {
    return html`
      <div class="alerts-section">
        <div class="alerts-title">\u{1F6A8} 알림</div>
        ${this.alerts.map(
      alert => html`
            <div class="alert-item ${alert.type || 'warning'}">
              <span>${alert.icon || '\u26A0'}</span>
              <span>${alert.message}</span>
            </div>
          `
    )}
      </div>
    `
  }

  /** 작업 목록이 비어있을 때 빈 상태 표시 */
  _renderEmptyState() {
    return html`
      <div class="empty-state">
        <span class="empty-icon">\u{2705}</span>
        <span class="empty-message">현재 진행 중인 작업이 없습니다</span>
        <span class="empty-sub">작업 지시가 승인되면 이곳에 표시됩니다</span>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  /** 현재 필터 조건에 맞는 주문 목록 반환 */
  get _filteredOrders() {
    if (this.statusFilter === 'ALL') return this.orders
    return this.orders.filter(o => o.status === this.statusFilter)
  }

  /** 페이지 활성화 시 데이터 새로고침 및 자동 갱신 시작 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._refresh()
      this._startAutoRefresh()
    }
  }

  /** 페이지 해제 시 자동 새로고침 타이머 정리 */
  pageDisposed(lifecycle) {
    this._stopAutoRefresh()
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 모니터링 데이터 새로고침 (주문 목록 + 알림 동시 조회) */
  async _refresh() {
    try {
      this.loading = this.orders.length === 0

      const [ordersData, alertsData] = await Promise.all([
        ServiceUtil.restGet('vas_trx/monitor/orders'),
        ServiceUtil.restGet('vas_trx/dashboard/alerts')
      ])

      this.orders = ordersData || []
      this.alerts = alertsData || []

      this.lastRefreshed = this._nowTimeStr()
      this.loading = false
    } catch (err) {
      console.error('모니터링 데이터 조회 실패:', err)
      this.loading = false
    }
  }

  /* ============================================================
   * 자동 새로고침
   * ============================================================ */

  /** 10초 간격 자동 새로고침 타이머 시작 */
  _startAutoRefresh() {
    this._stopAutoRefresh()
    if (this.autoRefresh) {
      this._refreshTimer = setInterval(() => {
        this._refresh()
      }, 10000)
    }
  }

  /** 자동 새로고침 타이머 중지 */
  _stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer)
      this._refreshTimer = null
    }
  }

  /** 자동 새로고침 토글 (켜기/끄기) */
  _toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh
    if (this.autoRefresh) {
      this._startAutoRefresh()
    } else {
      this._stopAutoRefresh()
    }
  }

  /* ============================================================
   * 액션 핸들러
   * ============================================================ */

  /** 작업 시작 API 호출 후 화면 갱신 */
  async _startWork(order) {
    try {
      await ServiceUtil.restPost(`vas_trx/vas_orders/${order.id}/start`)
      await this._refresh()
    } catch (err) {
      this._notify(err.message || '작업 시작 실패', 'error')
    }
  }

  /** 작업 완료 API 호출 후 화면 갱신 */
  async _completeWork(order) {
    try {
      await ServiceUtil.restPost(`vas_trx/vas_orders/${order.id}/complete`)
      await this._refresh()
    } catch (err) {
      this._notify(err.message || '작업 완료 실패', 'error')
    }
  }

  /** 주문 상세 팝업 열기 */
  _viewDetail(order) {
    const element = document.createElement('vas-order-detail')
    element.vasOrderId = order.id

    UiUtil.openPopupByElement(
      `${order.vas_no} 상세`,
      'large',
      element,
      true
    )
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** VAS 유형 코드를 한글 라벨로 변환 */
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

  /** 주문 상태 코드를 한글 라벨로 변환 */
  _statusLabel(status) {
    const map = {
      PLAN: '계획',
      APPROVED: '승인',
      MATERIAL_READY: '자재준비',
      IN_PROGRESS: '작업중',
      COMPLETED: '완료',
      CLOSED: '마감',
      CANCELLED: '취소'
    }
    return map[status] || status || '-'
  }

  /** 작업 시작 시각으로부터 경과 시간 계산 (예: "2h 30m") */
  _getElapsedTime(startedAt) {
    if (!startedAt) return null
    const start = new Date(startedAt)
    const now = new Date()
    const diff = now - start

    if (diff < 0) return null

    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)

    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  /** 날짜 문자열을 HH:MM 시간 형식으로 변환 */
  _formatTime(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  /** 현재 시각을 HH:MM:SS 문자열로 반환 */
  _nowTimeStr() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }

  /** 알림 메시지 표시 (notify 커스텀 이벤트 발행) */
  _notify(message, type = 'info') {
    document.dispatchEvent(
      new CustomEvent('notify', {
        detail: { message, type }
      })
    )
  }
}

window.customElements.define('vas-work-monitor', VasWorkMonitor)
