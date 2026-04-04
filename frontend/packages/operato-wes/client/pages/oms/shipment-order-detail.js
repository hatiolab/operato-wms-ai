import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 출하 주문 상세 팝업
 *
 * 기능:
 * - 출하 주문 헤더 + 상태 배지 + 상태별 액션 버튼
 * - 수평 상태 타임라인 (9단계)
 * - 4탭: 기본정보 / 주문상세 / 배송정보 / 할당내역
 * - 배송·할당 탭 lazy loading
 *
 * @fires order-updated - 상태 변경 후 발생. detail: { shipmentOrderId }
 *
 * @example
 * const el = document.createElement('shipment-order-detail')
 * el.shipmentOrderId = orderId
 * el.addEventListener('order-updated', () => this._fetchData())
 * UiUtil.openPopupByElement('출하 주문 상세', 'large', el, true)
 */
class ShipmentOrderDetail extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          background-color: var(--md-sys-color-background);
          overflow: hidden;
          height: 100%;
        }

        /* 헤더 영역 */
        .detail-header {
          background: var(--md-sys-color-surface);
          padding: 20px 24px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .status-badge {
          padding: 4px 14px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 600;
          color: white;
        }

        .status-badge.REGISTERED { background-color: #9E9E9E; }
        .status-badge.CONFIRMED { background-color: #2196F3; }
        .status-badge.ALLOCATED { background-color: #1565C0; }
        .status-badge.BACK_ORDER { background-color: #F44336; }
        .status-badge.WAVED { background-color: #7B1FA2; }
        .status-badge.RELEASED { background-color: #303F9F; }
        .status-badge.PICKING { background-color: #FF9800; }
        .status-badge.PACKING { background-color: #FFB74D; color: #333; }
        .status-badge.SHIPPED { background-color: #4CAF50; }
        .status-badge.CLOSED { background-color: #424242; }
        .status-badge.CANCELLED { background-color: #D32F2F; }

        .type-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          background: var(--md-sys-color-surface-variant);
          padding: 4px 12px;
          border-radius: 14px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.primary {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .action-btn.primary:hover:not(:disabled) {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .action-btn.danger {
          background: transparent;
          color: #C62828;
          border: 1px solid #EF9A9A;
        }

        .action-btn.danger:hover:not(:disabled) {
          background: #FFEBEE;
        }

        .action-btn.secondary {
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface);
        }

        .action-btn.secondary:hover:not(:disabled) {
          background: var(--md-sys-color-surface-container-highest);
        }

        /* 수평 상태 타임라인 */
        .status-timeline {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 4px 0;
          overflow-x: auto;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 64px;
        }

        .timeline-step .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--md-sys-color-outline-variant);
          transition: all 0.2s;
        }

        .timeline-step.completed .dot {
          background: var(--md-sys-color-primary);
        }

        .timeline-step.active .dot {
          background: var(--md-sys-color-primary);
          box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.2);
        }

        .timeline-step .label {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
        }

        .timeline-step .time {
          font-size: 10px;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
          opacity: 0.7;
        }

        .timeline-step.completed .label,
        .timeline-step.active .label {
          color: var(--md-sys-color-primary);
          font-weight: 600;
        }

        .timeline-step.completed .time,
        .timeline-step.active .time {
          color: var(--md-sys-color-primary);
          opacity: 0.8;
        }

        .timeline-connector {
          flex: 1;
          height: 2px;
          min-width: 16px;
          background: var(--md-sys-color-outline-variant);
          margin-bottom: 32px;
        }

        .timeline-connector.completed {
          background: var(--md-sys-color-primary);
        }

        /* 탭 바 */
        .tab-bar {
          display: flex;
          background: var(--md-sys-color-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          padding: 0 24px;
        }

        .tab-item {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-item:hover {
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface-container-highest);
        }

        .tab-item.active {
          color: var(--md-sys-color-primary);
          border-bottom-color: var(--md-sys-color-primary);
          font-weight: 600;
        }

        /* 탭 콘텐츠 */
        .tab-content {
          flex: 1;
          overflow: auto;
          padding: 24px;
        }

        .tab-panel {
          display: none;
        }

        .tab-panel.active {
          display: block;
        }

        /* 정보 그리드 */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .info-item.full-width {
          grid-column: 1 / -1;
        }

        .info-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .info-value {
          font-size: 15px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface);
        }

        /* 섹션 구분 */
        .info-section-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          margin: 20px 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .info-section-title:first-child {
          margin-top: 0;
        }

        /* 테이블 */
        table {
          width: 100%;
          border-collapse: collapse;
          background: var(--md-sys-color-surface);
          border-radius: 8px;
          overflow: hidden;
        }

        thead {
          background: var(--md-sys-color-surface-variant);
        }

        th,
        td {
          padding: 10px 14px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          font-size: 14px;
        }

        th {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        td {
          color: var(--md-sys-color-on-surface-variant);
        }

        tbody tr:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        .text-right {
          text-align: right;
        }

        /* 항목 상태 배지 */
        .item-status {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .item-status.REGISTERED { background: #9E9E9E; }
        .item-status.CONFIRMED { background: #2196F3; }
        .item-status.ALLOCATED { background: #1565C0; }
        .item-status.BACK_ORDER { background: #F44336; }
        .item-status.WAVED { background: #7B1FA2; }
        .item-status.RELEASED { background: #303F9F; }
        .item-status.PICKING { background: #FF9800; }
        .item-status.PACKING { background: #FFB74D; color: #333; }
        .item-status.SHIPPED { background: #4CAF50; }
        .item-status.CLOSED { background: #424242; }
        .item-status.CANCELLED { background: #D32F2F; }

        /* 할당 상태 배지 */
        .alloc-status {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .alloc-status.SOFT { background: #FF9800; }
        .alloc-status.HARD { background: #1565C0; }
        .alloc-status.RELEASED { background: #303F9F; }
        .alloc-status.EXPIRED { background: #9E9E9E; }
        .alloc-status.CANCELLED { background: #D32F2F; }

        /* 부족수량 강조 */
        .qty-short {
          color: #F44336;
          font-weight: 600;
        }

        /* 합계 영역 */
        .summary-row {
          display: flex;
          gap: 24px;
          margin-top: 16px;
          padding: 12px 16px;
          background: var(--md-sys-color-surface-variant);
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .summary-item .label {
          color: var(--md-sys-color-on-surface-variant);
        }

        .summary-item .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        /* 우선순위 배지 */
        .priority-badge {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }

        .priority-badge.URGENT { background: #FFEBEE; color: #C62828; }
        .priority-badge.HIGH { background: #FFF3E0; color: #E65100; }
        .priority-badge.NORMAL { background: #E3F2FD; color: #1565C0; }
        .priority-badge.LOW { background: #F5F5F5; color: #757575; }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 48px 20px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .empty-state .icon {
          font-size: 40px;
          opacity: 0.4;
          margin-bottom: 8px;
        }

        .empty-state .text {
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
        @media screen and (max-width: 800px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      shipmentOrderId: String,
      parent_id: String,  // shipmentOrderId의 별칭
      order: Object,
      items: Array,
      delivery: Object,
      allocations: Array,
      activeTab: Number,
      loading: Boolean,
      actionLoading: Boolean
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.shipmentOrderId = null
    this.parent_id = null
    this.order = null
    this.items = []
    this.delivery = null
    this.allocations = null
    this.activeTab = 0
    this.loading = true
    this.actionLoading = false
  }

  /** 속성 변경 감지 - parent_id가 설정되면 shipmentOrderId에 복사 */
  updated(changedProperties) {
    super.updated(changedProperties)
    // parent_id가 설정되면 shipmentOrderId에 복사
    if (changedProperties.has('parent_id') && this.parent_id && !this.shipmentOrderId) {
      this.shipmentOrderId = this.parent_id
    }
  }

  /** 컴포넌트 연결 시 주문 데이터 조회 */
  connectedCallback() {
    super.connectedCallback()
    // parent_id 또는 shipmentOrderId 중 하나라도 있으면 데이터 조회
    const orderId = this.shipmentOrderId || this.parent_id
    if (orderId) {
      this.shipmentOrderId = orderId
      this._fetchOrderData()
    }
  }

  /** 화면 렌더링 - 로딩 상태 또는 주문 상세 전체 출력 */
  render() {
    if (this.loading) {
      return html`<div class="loading">데이터 로딩 중...</div>`
    }

    if (!this.order) {
      return html`<div class="empty-state"><div class="text">출하 주문 정보를 찾을 수 없습니다</div></div>`
    }

    return html`
      ${this._renderHeader()}
      ${this._renderTabs()}
      <div class="tab-content">
        <div class="tab-panel ${this.activeTab === 0 ? 'active' : ''}">${this._renderBasicInfoTab()}</div>
        <div class="tab-panel ${this.activeTab === 1 ? 'active' : ''}">${this._renderItemsTab()}</div>
        <div class="tab-panel ${this.activeTab === 2 ? 'active' : ''}">${this._renderDeliveryTab()}</div>
        <div class="tab-panel ${this.activeTab === 3 ? 'active' : ''}">${this._renderAllocationsTab()}</div>
      </div>
    `
  }

  /* ============================================================
   * 렌더링 — 헤더
   * ============================================================ */

  /** 헤더 영역 렌더링 - 주문번호, 상태 배지, 액션 버튼, 타임라인 */
  _renderHeader() {
    const o = this.order
    return html`
      <div class="detail-header">
        <div class="header-top">
          <div class="header-title">
            <h2>${o.shipment_no || '-'}</h2>
            <span class="status-badge ${o.status}">${this._statusLabel(o.status)}</span>
            ${o.biz_type ? html`<span class="type-label">${this._bizTypeLabel(o.biz_type)}</span>` : ''}
            ${o.priority_cd && o.priority_cd !== 'NORMAL'
        ? html`<span class="priority-badge ${o.priority_cd}">${this._priorityLabel(o.priority_cd)}</span>`
        : ''}
          </div>
          <div class="header-actions">
            ${this._renderActionButtons()}
          </div>
        </div>

        ${this._renderTimeline()}
      </div>
    `
  }

  /** 수평 상태 타임라인 렌더링 - 등록부터 마감까지 9단계 + 시간 표시 */
  _renderTimeline() {
    const o = this.order
    const steps = [
      { key: 'REGISTERED', label: '등록', time: o.created_at },
      { key: 'CONFIRMED', label: '확정', time: o.confirmed_at },
      { key: 'ALLOCATED', label: '할당', time: o.allocated_at },
      { key: 'WAVED', label: '웨이브' },
      { key: 'RELEASED', label: '인계', time: o.released_at },
      { key: 'PICKING', label: '피킹' },
      { key: 'PACKING', label: '패킹' },
      { key: 'SHIPPED', label: '출하', time: o.shipped_at },
      { key: 'CLOSED', label: '마감', time: o.closed_at }
    ]

    const status = o?.status
    if (status === 'CANCELLED' || status === 'BACK_ORDER') {
      return html``
    }

    const statusOrder = steps.map(s => s.key)
    const currentIdx = statusOrder.indexOf(status)

    return html`
      <div class="status-timeline">
        ${steps.map((step, idx) => html`
          ${idx > 0 ? html`<div class="timeline-connector ${idx <= currentIdx ? 'completed' : ''}"></div>` : ''}
          <div class="timeline-step ${idx < currentIdx ? 'completed' : ''} ${idx === currentIdx ? 'active' : ''}">
            <div class="dot"></div>
            <span class="label">${step.label}</span>
            ${step.time ? html`<span class="time">${this._formatShortTime(step.time)}</span>` : ''}
          </div>
        `)}
      </div>
    `
  }

  /** 액션 버튼 렌더링 - 상태별로 확정/할당/취소 등 버튼 표시 */
  _renderActionButtons() {
    const s = this.order?.status
    return html`
      ${s === 'REGISTERED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._confirmOrder}">확정</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'CONFIRMED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._allocateOrder}">할당</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'ALLOCATED' ? html`
        <button class="action-btn secondary" ?disabled="${this.actionLoading}" @click="${this._deallocateOrder}">할당해제</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'BACK_ORDER' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._allocateOrder}">재할당</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'WAVED' ? html`
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'SHIPPED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._closeOrder}">마감</button>
      ` : ''}
    `
  }

  /* ============================================================
   * 렌더링 — 탭 바
   * ============================================================ */

  /** 탭 바 렌더링 - 기본정보/주문상세/배송정보/할당내역 */
  _renderTabs() {
    return html`
      <div class="tab-bar">
        <div class="tab-item ${this.activeTab === 0 ? 'active' : ''}" @click="${() => this._switchTab(0)}">
          기본정보
        </div>
        <div class="tab-item ${this.activeTab === 1 ? 'active' : ''}" @click="${() => this._switchTab(1)}">
          주문상세 (${this.items.length})
        </div>
        <div class="tab-item ${this.activeTab === 2 ? 'active' : ''}" @click="${() => this._switchTab(2)}">
          배송정보
        </div>
        <div class="tab-item ${this.activeTab === 3 ? 'active' : ''}" @click="${() => this._switchTab(3)}">
          할당내역
        </div>
      </div>
    `
  }

  /* ============================================================
   * Tab 0: 기본정보
   * ============================================================ */

  /** 기본정보 탭 렌더링 - 주문정보, 조직정보, 유형정보, 수량정보, 처리이력 */
  _renderBasicInfoTab() {
    const o = this.order
    return html`
      <div class="info-section-title">주문 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">출하번호</span>
          <span class="info-value">${o.shipment_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">참조번호</span>
          <span class="info-value">${o.ref_order_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">주문일</span>
          <span class="info-value">${o.order_date || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">출하기한</span>
          <span class="info-value">${o.ship_by_date || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">마감시간</span>
          <span class="info-value">${o.cutoff_time || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">우선순위</span>
          <span class="info-value">
            <span class="priority-badge ${o.priority_cd || 'NORMAL'}">${this._priorityLabel(o.priority_cd)}</span>
          </span>
        </div>
      </div>

      <div class="info-section-title">조직 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">화주사</span>
          <span class="info-value">${o.com_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">고객</span>
          <span class="info-value">${o.cust_nm || o.cust_cd || '-'} ${o.cust_cd && o.cust_nm ? `(${o.cust_cd})` : ''}</span>
        </div>
        <div class="info-item">
          <span class="info-label">창고</span>
          <span class="info-value">${o.wh_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">웨이브</span>
          <span class="info-value">${o.wave_no || '-'}</span>
        </div>
      </div>

      <div class="info-section-title">유형 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">업무유형</span>
          <span class="info-value">${this._bizTypeLabel(o.biz_type)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">출하유형</span>
          <span class="info-value">${this._shipTypeLabel(o.ship_type)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">피킹방식</span>
          <span class="info-value">${this._pickMethodLabel(o.pick_method)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">배송유형</span>
          <span class="info-value">${this._dlvTypeLabel(o.dlv_type)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">택배사</span>
          <span class="info-value">${o.carrier_cd || '-'}</span>
        </div>
      </div>

      <div class="info-section-title">수량 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">총 품목수</span>
          <span class="info-value">${o.total_item ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">총 주문수량</span>
          <span class="info-value">${o.total_order ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">총 할당수량</span>
          <span class="info-value">${o.total_alloc ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">총 출하수량</span>
          <span class="info-value">${o.total_shipped ?? '-'}</span>
        </div>
      </div>

      <div class="info-section-title">처리 이력</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">확정일시</span>
          <span class="info-value">${this._formatDateTime(o.confirmed_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">할당일시</span>
          <span class="info-value">${this._formatDateTime(o.allocated_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">인계일시</span>
          <span class="info-value">${this._formatDateTime(o.released_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">출하일시</span>
          <span class="info-value">${this._formatDateTime(o.shipped_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">마감일시</span>
          <span class="info-value">${this._formatDateTime(o.closed_at)}</span>
        </div>
        ${o.remarks ? html`
          <div class="info-item full-width">
            <span class="info-label">비고</span>
            <span class="info-value">${o.remarks}</span>
          </div>
        ` : ''}
      </div>
    `
  }

  /* ============================================================
   * Tab 1: 주문상세 (Items)
   * ============================================================ */

  /** 주문상세 탭 렌더링 - 주문 항목 테이블 및 합계 */
  _renderItemsTab() {
    if (!this.items.length) {
      return html`<div class="empty-state"><div class="icon">📦</div><div class="text">주문 항목이 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>라인</th>
            <th>SKU</th>
            <th>상품명</th>
            <th class="text-right">주문수량</th>
            <th class="text-right">할당수량</th>
            <th class="text-right">부족수량</th>
            <th class="text-right">출하수량</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          ${this.items.map(item => html`
            <tr>
              <td>${item.line_no || '-'}</td>
              <td>${item.sku_cd || '-'}</td>
              <td>${item.sku_nm || '-'}</td>
              <td class="text-right">${item.order_qty ?? 0}</td>
              <td class="text-right">${item.alloc_qty ?? 0}</td>
              <td class="text-right ${(item.short_qty || 0) > 0 ? 'qty-short' : ''}">${item.short_qty ?? 0}</td>
              <td class="text-right">${item.shipped_qty ?? 0}</td>
              <td><span class="item-status ${item.status}">${this._statusLabel(item.status)}</span></td>
            </tr>
          `)}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">총 항목:</span>
          <span class="value">${this.items.length}건</span>
        </div>
        <div class="summary-item">
          <span class="label">총 주문:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.order_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 할당:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.alloc_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 부족:</span>
          <span class="value ${this.items.reduce((s, i) => s + (i.short_qty || 0), 0) > 0 ? 'qty-short' : ''}">
            ${this.items.reduce((s, i) => s + (i.short_qty || 0), 0)} EA
          </span>
        </div>
        <div class="summary-item">
          <span class="label">총 출하:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.shipped_qty || 0), 0)} EA</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * Tab 2: 배송정보
   * ============================================================ */

  /** 배송정보 탭 렌더링 - 발송인/주문자/수취인 정보 */
  _renderDeliveryTab() {
    if (this.delivery === null) {
      return html`<div class="loading">배송정보 로딩 중...</div>`
    }

    if (!this.delivery || !this.delivery.id) {
      return html`<div class="empty-state"><div class="icon">🚚</div><div class="text">배송정보가 없습니다</div></div>`
    }

    const d = this.delivery
    return html`
      <div class="info-section-title">발송인</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">이름</span>
          <span class="info-value">${d.sender_nm || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">연락처</span>
          <span class="info-value">${d.sender_phone || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">우편번호</span>
          <span class="info-value">${d.sender_zip_cd || '-'}</span>
        </div>
        <div class="info-item full-width">
          <span class="info-label">주소</span>
          <span class="info-value">${d.sender_addr || '-'} ${d.sender_addr2 || ''}</span>
        </div>
      </div>

      <div class="info-section-title">주문자</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">이름</span>
          <span class="info-value">${d.orderer_nm || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">연락처</span>
          <span class="info-value">${d.orderer_phone || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">우편번호</span>
          <span class="info-value">${d.orderer_zip_cd || '-'}</span>
        </div>
        <div class="info-item full-width">
          <span class="info-label">주소</span>
          <span class="info-value">${d.orderer_addr || '-'} ${d.orderer_addr2 || ''}</span>
        </div>
      </div>

      <div class="info-section-title">수취인</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">이름</span>
          <span class="info-value">${d.receiver_nm || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">연락처</span>
          <span class="info-value">${d.receiver_phone || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">우편번호</span>
          <span class="info-value">${d.receiver_zip_cd || '-'}</span>
        </div>
        <div class="info-item full-width">
          <span class="info-label">주소</span>
          <span class="info-value">${d.receiver_addr || '-'} ${d.receiver_addr2 || ''}</span>
        </div>
      </div>

      ${d.delivery_memo ? html`
        <div class="info-section-title">배송 메모</div>
        <div class="info-grid">
          <div class="info-item full-width">
            <span class="info-value">${d.delivery_memo}</span>
          </div>
        </div>
      ` : ''}
    `
  }

  /* ============================================================
   * Tab 3: 할당내역
   * ============================================================ */

  /** 할당내역 탭 렌더링 - 재고 할당 테이블 및 합계 */
  _renderAllocationsTab() {
    if (this.allocations === null) {
      return html`<div class="loading">할당내역 로딩 중...</div>`
    }

    if (!this.allocations || !this.allocations.length) {
      return html`<div class="empty-state"><div class="icon">📋</div><div class="text">할당 내역이 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>바코드</th>
            <th>로케이션</th>
            <th>로트번호</th>
            <th>유통기한</th>
            <th class="text-right">할당수량</th>
            <th>전략</th>
            <th>상태</th>
            <th>할당일시</th>
          </tr>
        </thead>
        <tbody>
          ${this.allocations.map(a => html`
            <tr>
              <td>${a.sku_cd || '-'}</td>
              <td>${a.barcode || '-'}</td>
              <td>${a.loc_cd || '-'}</td>
              <td>${a.lot_no || '-'}</td>
              <td>${a.expired_date || '-'}</td>
              <td class="text-right">${a.alloc_qty ?? 0}</td>
              <td>${this._allocStrategyLabel(a.alloc_strategy)}</td>
              <td><span class="alloc-status ${a.status}">${this._allocStatusLabel(a.status)}</span></td>
              <td>${this._formatDateTime(a.created_at)}</td>
            </tr>
          `)}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">총 할당건:</span>
          <span class="value">${this.allocations.length}건</span>
        </div>
        <div class="summary-item">
          <span class="label">총 할당수량:</span>
          <span class="value">${this.allocations.reduce((s, a) => s + (a.alloc_qty || 0), 0)} EA</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 출하 주문 헤더 및 항목 데이터 조회 */
  async _fetchOrderData() {
    this.loading = true
    try {
      const [order, items] = await Promise.all([
        ServiceUtil.restGet(`shipment_orders/${this.shipmentOrderId}`),
        ServiceUtil.restGet(`shipment_orders/${this.shipmentOrderId}/items`)
      ])
      this.order = order
      this.items = items || []
    } catch (error) {
      console.error('출하 주문 상세 조회 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: '출하 주문 상세 조회에 실패했습니다' } }))
    } finally {
      this.loading = false
    }
  }

  /** 배송정보 조회 (lazy loading) */
  async _fetchDelivery() {
    try {
      const query = JSON.stringify([{ name: 'shipmentOrderId', value: this.shipmentOrderId }])
      const result = await ServiceUtil.restGet(`shipment_deliveries?query=${encodeURIComponent(query)}`)
      this.delivery = result?.items?.[0] || {}
    } catch (error) {
      console.error('배송정보 조회 실패:', error)
      this.delivery = {}
    }
  }

  /** 할당내역 조회 (lazy loading) */
  async _fetchAllocations() {
    try {
      const query = JSON.stringify([{ name: 'shipmentOrderId', value: this.shipmentOrderId }])
      const result = await ServiceUtil.restGet(`stock_allocations?query=${encodeURIComponent(query)}`)
      this.allocations = result?.items || []
    } catch (error) {
      console.error('할당내역 조회 실패:', error)
      this.allocations = []
    }
  }

  /* ============================================================
   * 탭 전환 (lazy loading)
   * ============================================================ */

  /** 탭 전환 - 배송정보/할당내역 탭은 lazy loading */
  _switchTab(index) {
    this.activeTab = index

    if (index === 2 && this.delivery === null) {
      this._fetchDelivery()
    }

    if (index === 3 && this.allocations === null) {
      this._fetchAllocations()
    }
  }

  /* ============================================================
   * 액션
   * ============================================================ */

  /** 주문 확정 처리 */
  async _confirmOrder() {
    const result = await UiUtil.showAlertPopup('label.confirm', '주문을 확정하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('oms_trx/shipment_orders/confirm', { ids: [this.shipmentOrderId] })
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '주문이 확정되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('주문 확정 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '주문 확정에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 재고 할당 실행 */
  async _allocateOrder() {
    const result = await UiUtil.showAlertPopup('label.confirm', '재고 할당을 실행하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('oms_trx/shipment_orders/allocate', { ids: [this.shipmentOrderId] })
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '재고 할당이 완료되었습니다' } }))
      this.allocations = null
      await this._refreshAfterAction()
    } catch (error) {
      console.error('재고 할당 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '재고 할당에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 할당 해제 처리 */
  async _deallocateOrder() {
    const result = await UiUtil.showAlertPopup('label.confirm', '할당을 해제하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('oms_trx/shipment_orders/deallocate', { id: this.shipmentOrderId })
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '할당이 해제되었습니다' } }))
      this.allocations = null
      await this._refreshAfterAction()
    } catch (error) {
      console.error('할당 해제 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '할당 해제에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 주문 취소 처리 */
  async _cancelOrder() {
    const result = await UiUtil.showAlertPopup('label.confirm', '주문을 취소하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', 'warning', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('oms_trx/shipment_orders/cancel', { ids: [this.shipmentOrderId] })
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '주문이 취소되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('주문 취소 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '주문 취소에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 주문 마감 처리 */
  async _closeOrder() {
    const result = await UiUtil.showAlertPopup('label.confirm', '주문을 마감하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(`oms_trx/shipment_orders/${this.shipmentOrderId}/close`, {})
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '주문이 마감되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('주문 마감 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '주문 마감에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 액션 실행 후 데이터 새로고침 및 이벤트 발행 */
  async _refreshAfterAction() {
    await this._fetchOrderData()
    this._dispatchOrderUpdated()
  }

  /** order-updated 커스텀 이벤트 발행 */
  _dispatchOrderUpdated() {
    this.dispatchEvent(
      new CustomEvent('order-updated', {
        composed: true,
        bubbles: true,
        detail: { shipmentOrderId: this.shipmentOrderId }
      })
    )
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** 주문 상태 코드를 한글 라벨로 변환 */
  _statusLabel(status) {
    const labels = {
      REGISTERED: '등록',
      CONFIRMED: '확정',
      ALLOCATED: '할당',
      BACK_ORDER: '부족',
      WAVED: '웨이브',
      RELEASED: '인계',
      PICKING: '피킹',
      PACKING: '패킹',
      SHIPPED: '출하',
      CLOSED: '마감',
      CANCELLED: '취소'
    }
    return labels[status] || status || '-'
  }

  /** 업무유형 코드를 한글 라벨로 변환 */
  _bizTypeLabel(type) {
    const labels = {
      B2C_OUT: 'B2C 출고',
      B2B_OUT: 'B2B 출고',
      TRANSFER_OUT: '이관 출고',
      RETURN_OUT: '반품 출고'
    }
    return labels[type] || type || '-'
  }

  /** 출하유형 코드를 한글 라벨로 변환 */
  _shipTypeLabel(type) {
    const labels = {
      NORMAL: '일반 출하',
      RETURN: '반품 출하',
      EXCHANGE: '교환 출하',
      TRANSFER: '이관 출하',
      SAMPLE: '샘플 출하',
      DISPOSAL: '폐기 출하'
    }
    return labels[type] || type || '-'
  }

  /** 피킹방식 코드를 한글 라벨로 변환 */
  _pickMethodLabel(type) {
    const labels = {
      WCS: 'WCS 위임',
      PAPER: '페이퍼 처리',
      INSPECT: '검수와 함께 피킹',
      PICK: '피킹'
    }
    return labels[type] || type || '-'
  }

  /** 배송유형 코드를 한글 라벨로 변환 */
  _dlvTypeLabel(type) {
    const labels = {
      STANDARD: '일반 배송',
      EXPRESS: '특급 배송',
      SAME_DAY: '당일 배송',
      DAWN: '새벽 배송'
    }
    return labels[type] || type || '-'
  }

  /** 우선순위 코드를 한글 라벨로 변환 */
  _priorityLabel(priority) {
    const labels = {
      URGENT: '긴급',
      HIGH: '높음',
      NORMAL: '보통',
      LOW: '낮음'
    }
    return labels[priority] || priority || '보통'
  }

  /** 할당 상태 코드를 한글 라벨로 변환 */
  _allocStatusLabel(status) {
    const labels = {
      SOFT: '임시할당',
      HARD: '확정할당',
      RELEASED: '인계완료',
      EXPIRED: '만료',
      CANCELLED: '취소'
    }
    return labels[status] || status || '-'
  }

  /** 할당 전략 코드를 한글 라벨로 변환 */
  _allocStrategyLabel(strategy) {
    const labels = {
      FEFO: 'FEFO',
      FIFO: 'FIFO',
      LEFO: 'LEFO',
      MANUAL: '수동'
    }
    return labels[strategy] || strategy || '-'
  }

  /** 날짜 시간 포맷팅 (YYYY-MM-DD HH:mm) */
  _formatDateTime(dateValue) {
    if (!dateValue) return '-'
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return '-'
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  /** 타임라인용 간략 시간 포맷팅 (MM/DD HH:mm) */
  _formatShortTime(dateValue) {
    if (!dateValue) return ''
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return ''
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
}

customElements.define('shipment-order-detail', ShipmentOrderDetail)
