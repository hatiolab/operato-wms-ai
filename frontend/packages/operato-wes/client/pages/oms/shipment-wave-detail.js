import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 웨이브 상세 팝업
 *
 * 기능:
 * - 웨이브 헤더 정보 + 상태 배지 + 상태별 액션 버튼
 * - 계획/실적/진행률 통계 박스
 * - 3탭: 주문 목록 / SKU 합산 / 보충 지시
 * - 주문·보충 탭 lazy loading
 *
 * @fires wave-updated - 상태 변경 후 발생. detail: { waveId }
 *
 * @example
 * const el = document.createElement('shipment-wave-detail')
 * el.waveId = waveId
 * el.addEventListener('wave-updated', () => this._fetchData())
 * openPopup(el, { backdrop: true, size: 'large', title: '웨이브 상세' })
 */
class ShipmentWaveDetail extends localize(i18next)(LitElement) {
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
          margin-bottom: 12px;
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

        .status-badge.CREATED { background-color: #7B1FA2; }
        .status-badge.RELEASED { background-color: #303F9F; }
        .status-badge.COMPLETED { background-color: #4CAF50; }
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
          background: transparent;
          color: var(--md-sys-color-primary);
          border: 1px solid var(--md-sys-color-outline);
        }

        .action-btn.secondary:hover:not(:disabled) {
          background: var(--md-sys-color-surface-container-highest);
        }

        /* 웨이브 기본정보 한 줄 */
        .wave-info {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 16px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .wave-info-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wave-info-item .label {
          color: var(--md-sys-color-on-surface-variant);
        }

        .wave-info-item .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        /* 통계 박스 */
        .stats-row {
          display: flex;
          gap: 16px;
        }

        .stat-box {
          flex: 1;
          background: var(--md-sys-color-surface-variant);
          border-radius: 12px;
          padding: 14px 18px;
        }

        .stat-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 10px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
        }

        .stat-item .label {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .stat-item .value {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        /* 진행률 바 */
        .progress-container {
          margin-top: 8px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--md-sys-color-primary);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .progress-text {
          margin-top: 6px;
          font-size: 20px;
          font-weight: 700;
          color: var(--md-sys-color-primary);
          text-align: center;
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

        /* 주문 상태 배지 */
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

        /* 보충 상태 배지 */
        .replenish-status {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .replenish-status.CREATED { background: #9E9E9E; }
        .replenish-status.IN_PROGRESS { background: #FF9800; }
        .replenish-status.COMPLETED { background: #4CAF50; }
        .replenish-status.CANCELLED { background: #D32F2F; }

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

        /* 주문 추가 팝업 오버레이 */
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .popup-container {
          background: var(--md-sys-color-surface);
          border-radius: 16px;
          width: 700px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .popup-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .popup-body {
          flex: 1;
          overflow: auto;
          padding: 16px 24px;
        }

        .popup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 24px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
        }

        .popup-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 12px;
        }

        /* 반응형 */
        @media screen and (max-width: 800px) {
          .stats-row {
            flex-direction: column;
          }

          .wave-info {
            flex-direction: column;
            gap: 8px;
          }
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      waveId: String,
      parent_id: String, // waveId 별칭 (외부에서 parent_id로 전달 시 자동 매핑)
      wave: Object,
      orders: Array,
      skuSummary: Array,
      replenishes: Array,
      activeTab: Number,
      loading: Boolean,
      actionLoading: Boolean,
      selectedOrderIds: Array,
      showAddOrderPopup: Boolean,
      allocatedOrders: Array,
      selectedAddOrderIds: Array
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.parent_id = null
    this.waveId = null
    this.wave = null
    this.orders = null
    this.skuSummary = null
    this.replenishes = null
    this.activeTab = 0
    this.loading = true
    this.actionLoading = false
    this.selectedOrderIds = []
    this.showAddOrderPopup = false
    this.allocatedOrders = []
    this.selectedAddOrderIds = []
  }

  /** 속성 변경 시 parent_id를 waveId로 매핑 */
  updated(changedProperties) {
    super.updated(changedProperties)
    // parent_id 파라미터가 전달되면 waveId로 복사 (외부 호환성)
    if (changedProperties.has('parent_id') && this.parent_id && !this.waveId) {
      this.waveId = this.parent_id
    }
  }

  /** 컴포넌트 연결 시 웨이브 데이터 조회 */
  connectedCallback() {
    super.connectedCallback()
    // parent_id 파라미터 지원 (waveId와 동일하게 처리)
    if (!this.waveId && this.parent_id) {
      this.waveId = this.parent_id
    }
    if (this.waveId) {
      this._fetchWaveData()
    }
  }

  /** 화면 렌더링 - 로딩 상태 또는 웨이브 상세 전체 출력 */
  render() {
    if (this.loading) {
      return html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
    }

    if (!this.wave) {
      return html`<div class="empty-state"><div class="text">${i18next.t('label.wave_not_found', { defaultValue: '웨이브 정보를 찾을 수 없습니다' })}</div></div>`
    }

    return html`
      ${this._renderHeader()}
      ${this._renderTabs()}
      <div class="tab-content">
        <div class="tab-panel ${this.activeTab === 0 ? 'active' : ''}">${this._renderOrdersTab()}</div>
        <div class="tab-panel ${this.activeTab === 1 ? 'active' : ''}">${this._renderSkuSummaryTab()}</div>
        <div class="tab-panel ${this.activeTab === 2 ? 'active' : ''}">${this._renderReplenishTab()}</div>
      </div>
      ${this.showAddOrderPopup ? this._renderAddOrderPopup() : ''}
    `
  }

  /* ============================================================
   * 렌더링 — 헤더
   * ============================================================ */

  /** 헤더 영역 렌더링 - 웨이브번호, 상태 배지, 액션 버튼, 통계 박스 */
  _renderHeader() {
    const w = this.wave

    return html`
      <div class="detail-header">
        <div class="header-top">
          <div class="header-title">
            <h2>${w.wave_no || '-'}</h2>
            <span class="status-badge ${w.status}">${this._statusLabel(w.status)}</span>
            ${w.pick_type ? html`<span class="type-label">${this._pickTypeLabel(w.pick_type)}</span>` : ''}
          </div>
          <div class="header-actions">
            ${this._renderActionButtons()}
          </div>
        </div>

        <div class="wave-info">
          <div class="wave-info-item">
            <span class="label">${i18next.t('label.wave_date', { defaultValue: '웨이브일' })}:</span>
            <span class="value">${w.wave_date || '-'}</span>
          </div>
          <div class="wave-info-item">
            <span class="label">${i18next.t('label.wave_seq', { defaultValue: '순번' })}:</span>
            <span class="value">${w.wave_seq || '-'}</span>
          </div>
          <div class="wave-info-item">
            <span class="label">${i18next.t('label.pick_method', { defaultValue: '피킹방식' })}:</span>
            <span class="value">${this._pickMethodLabel(w.pick_method)}</span>
          </div>
          <div class="wave-info-item">
            <span class="label">${i18next.t('label.carrier', { defaultValue: '택배사' })}:</span>
            <span class="value">${w.carrier_cd || '-'}</span>
          </div>
          ${w.insp_flag ? html`
            <div class="wave-info-item">
              <span class="label">${i18next.t('label.inspection', { defaultValue: '검수' })}:</span>
              <span class="value">${i18next.t('label.yes', { defaultValue: 'Y' })}</span>
            </div>
          ` : ''}
        </div>

        ${this._renderStats()}
      </div>
    `
  }

  /** 통계 박스 렌더링 - 계획/실적/진행률 */
  _renderStats() {
    const w = this.wave
    const progress = this._calcProgress()

    return html`
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-title">${i18next.t('label.plan', { defaultValue: '계획' })}</div>
          <div class="stat-item">
            <span class="label">${i18next.t('label.order_count', { defaultValue: '주문수' })}</span>
            <span class="value">${w.plan_order ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="label">${i18next.t('label.item_count', { defaultValue: '품목수' })}</span>
            <span class="value">${w.plan_item ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="label">${i18next.t('label.total_qty', { defaultValue: '총수량' })}</span>
            <span class="value">${w.plan_total ?? 0}</span>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-title">${i18next.t('label.result', { defaultValue: '실적' })}</div>
          <div class="stat-item">
            <span class="label">${i18next.t('label.order_count', { defaultValue: '주문수' })}</span>
            <span class="value">${w.result_order ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="label">${i18next.t('label.item_count', { defaultValue: '품목수' })}</span>
            <span class="value">${w.result_item ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="label">${i18next.t('label.total_qty', { defaultValue: '총수량' })}</span>
            <span class="value">${w.result_total ?? 0}</span>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-title">${i18next.t('label.progress', { defaultValue: '진행률' })}</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">${progress}%</div>
          </div>
        </div>
      </div>
    `
  }

  /** 액션 버튼 렌더링 - 상태별로 주문추가/제거/확정/취소 버튼 표시 */
  _renderActionButtons() {
    const s = this.wave?.status

    return html`
      ${s === 'CREATED' ? html`
        <button class="action-btn secondary" ?disabled="${this.actionLoading}" @click="${this._openAddOrderPopup}">
          ${i18next.t('button.add_orders', { defaultValue: '주문 추가' })}
        </button>
        <button class="action-btn secondary" ?disabled="${this.actionLoading || this.selectedOrderIds.length === 0}" @click="${this._removeSelectedOrders}">
          ${i18next.t('button.remove_orders', { defaultValue: '주문 제거' })}${this.selectedOrderIds.length > 0 ? ` (${this.selectedOrderIds.length})` : ''}
        </button>
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._releaseWave}">
          ${i18next.t('button.wave_release', { defaultValue: '웨이브 확정' })}
        </button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelWave}">
          ${i18next.t('button.wave_cancel', { defaultValue: '웨이브 취소' })}
        </button>
      ` : ''}
    `
  }

  /* ============================================================
   * 렌더링 — 탭 바
   * ============================================================ */

  /** 탭 바 렌더링 - 주문목록/SKU합산/보충지시 */
  _renderTabs() {
    const orderCount = this.orders ? this.orders.length : ''
    const replenishCount = this.replenishes ? this.replenishes.length : ''

    return html`
      <div class="tab-bar">
        <div class="tab-item ${this.activeTab === 0 ? 'active' : ''}" @click="${() => this._switchTab(0)}">
          ${i18next.t('label.order_list', { defaultValue: '주문 목록' })}${orderCount !== '' ? ` (${orderCount})` : ''}
        </div>
        <div class="tab-item ${this.activeTab === 1 ? 'active' : ''}" @click="${() => this._switchTab(1)}">
          ${i18next.t('label.sku_summary', { defaultValue: 'SKU 합산' })}
        </div>
        <div class="tab-item ${this.activeTab === 2 ? 'active' : ''}" @click="${() => this._switchTab(2)}">
          ${i18next.t('label.replenish_orders', { defaultValue: '보충 지시' })}${replenishCount !== '' ? ` (${replenishCount})` : ''}
        </div>
      </div>
    `
  }

  /* ============================================================
   * 렌더링 — Tab 0: 주문 목록
   * ============================================================ */

  /** 주문 목록 탭 렌더링 - 웨이브에 포함된 주문 테이블 및 합계 */
  _renderOrdersTab() {
    if (this.orders === null) {
      return html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
    }

    if (this.orders.length === 0) {
      return html`
        <div class="empty-state">
          <div class="icon">📋</div>
          <div class="text">${i18next.t('label.no_orders_in_wave', { defaultValue: '웨이브에 포함된 주문이 없습니다' })}</div>
        </div>
      `
    }

    const isCreated = this.wave?.status === 'CREATED'

    return html`
      <table>
        <thead>
          <tr>
            ${isCreated ? html`<th style="width:40px"><input type="checkbox" @change="${this._toggleAllOrders}" .checked="${this.selectedOrderIds.length > 0 && this.selectedOrderIds.length === this.orders.length}"></th>` : ''}
            <th>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</th>
            <th>${i18next.t('label.ref_no', { defaultValue: '참조번호' })}</th>
            <th>${i18next.t('label.customer', { defaultValue: '고객' })}</th>
            <th>${i18next.t('label.biz_type', { defaultValue: '업무유형' })}</th>
            <th>${i18next.t('label.ship_type', { defaultValue: '출하유형' })}</th>
            <th class="text-right">${i18next.t('label.order_qty', { defaultValue: '주문수량' })}</th>
            <th>${i18next.t('label.status', { defaultValue: '상태' })}</th>
          </tr>
        </thead>
        <tbody>
          ${this.orders.map(o => html`
            <tr>
              ${isCreated ? html`<td><input type="checkbox" .checked="${this.selectedOrderIds.includes(o.id)}" @change="${e => this._toggleOrderSelection(o.id, e)}"></td>` : ''}
              <td>${o.shipment_no || '-'}</td>
              <td>${o.ref_no || '-'}</td>
              <td>${o.cust_nm || o.cust_cd || '-'}</td>
              <td>${this._bizTypeLabel(o.biz_type)}</td>
              <td>${this._shipTypeLabel(o.ship_type)}</td>
              <td class="text-right">${o.total_order ?? 0}</td>
              <td><span class="item-status ${o.status}">${this._orderStatusLabel(o.status)}</span></td>
            </tr>
          `)}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">${i18next.t('label.total_orders', { defaultValue: '총 주문수' })}:</span>
          <span class="value">${this.orders.length}${i18next.t('label.count_unit', { defaultValue: '건' })}</span>
        </div>
        <div class="summary-item">
          <span class="label">${i18next.t('label.total_qty', { defaultValue: '총 수량' })}:</span>
          <span class="value">${this.orders.reduce((s, o) => s + (o.total_order || 0), 0)} EA</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 렌더링 — Tab 1: SKU 합산
   * ============================================================ */

  /** SKU 합산 탭 렌더링 - SKU별 합산 수량 및 주문건수 테이블 */
  _renderSkuSummaryTab() {
    if (this.skuSummary === null) {
      return html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
    }

    if (this.skuSummary.length === 0) {
      return html`
        <div class="empty-state">
          <div class="icon">📦</div>
          <div class="text">${i18next.t('label.no_sku_summary', { defaultValue: 'SKU 합산 데이터가 없습니다' })}</div>
        </div>
      `
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>${i18next.t('label.sku_cd', { defaultValue: 'SKU' })}</th>
            <th>${i18next.t('label.sku_nm', { defaultValue: '상품명' })}</th>
            <th class="text-right">${i18next.t('label.sum_qty', { defaultValue: '합산수량' })}</th>
            <th class="text-right">${i18next.t('label.order_count', { defaultValue: '주문건수' })}</th>
          </tr>
        </thead>
        <tbody>
          ${this.skuSummary.map(s => html`
            <tr>
              <td>${s.sku_cd || s.skuCd || '-'}</td>
              <td>${s.sku_nm || s.skuNm || '-'}</td>
              <td class="text-right">${s.total_qty ?? s.totalQty ?? 0}</td>
              <td class="text-right">${s.order_count ?? s.orderCount ?? 0}</td>
            </tr>
          `)}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">${i18next.t('label.total_sku', { defaultValue: '총 SKU종수' })}:</span>
          <span class="value">${this.skuSummary.length}</span>
        </div>
        <div class="summary-item">
          <span class="label">${i18next.t('label.total_qty', { defaultValue: '총 수량' })}:</span>
          <span class="value">${this.skuSummary.reduce((s, r) => s + (r.total_qty ?? r.totalQty ?? 0), 0)} EA</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 렌더링 — Tab 2: 보충 지시
   * ============================================================ */

  /** 보충 지시 탭 렌더링 - 웨이브 관련 보충 지시 목록 */
  _renderReplenishTab() {
    if (this.replenishes === null) {
      return html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
    }

    if (this.replenishes.length === 0) {
      return html`
        <div class="empty-state">
          <div class="icon">🔄</div>
          <div class="text">${i18next.t('label.no_replenish_orders', { defaultValue: '보충 지시가 없습니다' })}</div>
        </div>
      `
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>${i18next.t('label.replenish_no', { defaultValue: '보충번호' })}</th>
            <th>${i18next.t('label.order_date', { defaultValue: '지시일' })}</th>
            <th class="text-right">${i18next.t('label.plan_item', { defaultValue: '계획품목수' })}</th>
            <th class="text-right">${i18next.t('label.plan_total', { defaultValue: '계획수량' })}</th>
            <th class="text-right">${i18next.t('label.result_total', { defaultValue: '실적수량' })}</th>
            <th>${i18next.t('label.status', { defaultValue: '상태' })}</th>
          </tr>
        </thead>
        <tbody>
          ${this.replenishes.map(r => html`
            <tr>
              <td>${r.replenish_no || '-'}</td>
              <td>${r.order_date || '-'}</td>
              <td class="text-right">${r.plan_item ?? 0}</td>
              <td class="text-right">${r.plan_total ?? 0}</td>
              <td class="text-right">${r.result_total ?? 0}</td>
              <td><span class="replenish-status ${r.status}">${this._replenishStatusLabel(r.status)}</span></td>
            </tr>
          `)}
        </tbody>
      </table>
    `
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 웨이브 헤더, 주문 목록, SKU 합산 데이터 조회 */
  async _fetchWaveData() {
    this.loading = true
    try {
      // 1) 웨이브 헤더 조회
      const wave = await ServiceUtil.restGet(`shipment_waves/${this.waveId}`)
      this.wave = wave

      // 2) 주문 목록 조회 (트랜잭션 API)
      const orders = await ServiceUtil.restGet(`oms_trx/waves/${this.waveId}/orders`)
      this.orders = orders || []

      // 3) SKU 합산 조회 (트랜잭션 API)
      const skuSummary = await ServiceUtil.restGet(`oms_trx/waves/${this.waveId}/summary`)
      this.skuSummary = skuSummary || []
    } catch (error) {
      console.error('웨이브 상세 조회 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: i18next.t('message.wave_fetch_failed', { defaultValue: '웨이브 상세 조회에 실패했습니다' }) } }))
    } finally {
      this.loading = false
    }
  }

  /** 보충 지시 조회 (lazy loading) */
  async _fetchReplenishes() {
    try {
      const waveNo = this.wave?.wave_no
      if (!waveNo) {
        this.replenishes = []
        return
      }
      const query = JSON.stringify([{ name: 'waveNo', value: waveNo }])
      const result = await ServiceUtil.restGet(`replenish_orders?query=${encodeURIComponent(query)}`)
      this.replenishes = result?.items || []
    } catch (error) {
      console.error('보충 지시 조회 실패:', error)
      this.replenishes = []
    }
  }

  /* ============================================================
   * 탭 전환 (lazy loading)
   * ============================================================ */

  /** 탭 전환 - 보충 지시 탭은 lazy loading */
  _switchTab(index) {
    this.activeTab = index

    if (index === 2 && this.replenishes === null) {
      this._fetchReplenishes()
    }
  }

  /* ============================================================
   * 액션
   * ============================================================ */

  /** 웨이브 확정 처리 */
  async _releaseWave() {
    const w = this.wave
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${i18next.t('message.wave_release_confirm', { defaultValue: '웨이브를 확정(릴리스)하시겠습니까?' })}\n\n` +
      `${i18next.t('label.wave', { defaultValue: '웨이브' })}: ${w.wave_no}\n` +
      `${i18next.t('label.target_orders', { defaultValue: '대상 주문' })}: ${w.plan_order || 0}${i18next.t('label.count_unit', { defaultValue: '건' })}\n` +
      `${i18next.t('label.total_qty', { defaultValue: '총 수량' })}: ${w.plan_total || 0} EA`,
      'question',
      'confirm',
      'cancel'
    )
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(`oms_trx/waves/${this.waveId}/release`, {})
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: i18next.t('message.wave_released', { defaultValue: '웨이브가 확정되었습니다' }) } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('웨이브 확정 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || i18next.t('message.wave_release_failed', { defaultValue: '웨이브 확정에 실패했습니다' }) } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 웨이브 취소 처리 */
  async _cancelWave() {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      i18next.t('message.wave_cancel_confirm', { defaultValue: '웨이브를 취소하시겠습니까?\n포함된 주문은 할당 상태로 되돌아갑니다.' }),
      'warning',
      'confirm',
      'cancel'
    )
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(`oms_trx/waves/${this.waveId}/cancel`, {})
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: i18next.t('message.wave_cancelled', { defaultValue: '웨이브가 취소되었습니다' }) } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('웨이브 취소 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || i18next.t('message.wave_cancel_failed', { defaultValue: '웨이브 취소에 실패했습니다' }) } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 액션 실행 후 데이터 새로고침 및 이벤트 발행 */
  async _refreshAfterAction() {
    this.orders = null
    this.skuSummary = null
    this.replenishes = null
    this.selectedOrderIds = []
    await this._fetchWaveData()
    this._dispatchWaveUpdated()
  }

  /* ============================================================
   * 주문 체크박스 선택
   * ============================================================ */

  /** 주문 체크박스 개별 선택 처리 */
  _toggleOrderSelection(orderId, e) {
    if (e.target.checked) {
      this.selectedOrderIds = [...this.selectedOrderIds, orderId]
    } else {
      this.selectedOrderIds = this.selectedOrderIds.filter(id => id !== orderId)
    }
  }

  /** 주문 체크박스 전체 선택/해제 처리 */
  _toggleAllOrders(e) {
    if (e.target.checked) {
      this.selectedOrderIds = this.orders.map(o => o.id)
    } else {
      this.selectedOrderIds = []
    }
  }

  /* ============================================================
   * 주문 제거
   * ============================================================ */

  /** 선택된 주문을 웨이브에서 제거 */
  async _removeSelectedOrders() {
    if (this.selectedOrderIds.length === 0) return

    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${i18next.t('message.remove_orders_confirm', { defaultValue: '선택된 주문을 웨이브에서 제거하시겠습니까?' })}\n\n` +
      `${i18next.t('label.selected', { defaultValue: '선택' })}: ${this.selectedOrderIds.length}${i18next.t('label.count_unit', { defaultValue: '건' })}`,
      'question',
      'confirm',
      'cancel'
    )
    if (!result) return

    this.actionLoading = true
    try {
      const res = await ServiceUtil.restPost(`oms_trx/waves/${this.waveId}/remove_orders`, { ids: this.selectedOrderIds })
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: `${res.removedCount || 0}${i18next.t('label.count_unit', { defaultValue: '건' })} ${i18next.t('message.orders_removed', { defaultValue: '주문이 제거되었습니다' })}` }
      }))
      this.selectedOrderIds = []
      await this._refreshAfterAction()
    } catch (error) {
      console.error('주문 제거 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || i18next.t('message.remove_orders_failed', { defaultValue: '주문 제거에 실패했습니다' }) } }))
    } finally {
      this.actionLoading = false
    }
  }

  /* ============================================================
   * 주문 추가 팝업
   * ============================================================ */

  /** 주문 추가 팝업 열기 - ALLOCATED 상태 주문 조회 */
  async _openAddOrderPopup() {
    this.actionLoading = true
    try {
      const query = JSON.stringify([{ name: 'status', value: 'ALLOCATED' }])
      const result = await ServiceUtil.restGet(`shipment_orders?query=${encodeURIComponent(query)}&limit=500`)
      this.allocatedOrders = (result?.items || []).filter(o => !o.wave_no)
      this.selectedAddOrderIds = []
      this.showAddOrderPopup = true
    } catch (error) {
      console.error('ALLOCATED 주문 조회 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: i18next.t('message.fetch_allocated_failed', { defaultValue: 'ALLOCATED 주문 조회에 실패했습니다' }) } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 주문 추가 팝업 닫기 */
  _closeAddOrderPopup() {
    this.showAddOrderPopup = false
    this.allocatedOrders = []
    this.selectedAddOrderIds = []
  }

  /** 추가 팝업에서 주문 개별 선택 처리 */
  _toggleAddOrderSelection(orderId, e) {
    if (e.target.checked) {
      this.selectedAddOrderIds = [...this.selectedAddOrderIds, orderId]
    } else {
      this.selectedAddOrderIds = this.selectedAddOrderIds.filter(id => id !== orderId)
    }
  }

  /** 추가 팝업에서 주문 전체 선택/해제 처리 */
  _toggleAllAddOrders(e) {
    if (e.target.checked) {
      this.selectedAddOrderIds = this.allocatedOrders.map(o => o.id)
    } else {
      this.selectedAddOrderIds = []
    }
  }

  /** 선택된 주문을 웨이브에 추가 */
  async _confirmAddOrders() {
    if (this.selectedAddOrderIds.length === 0) return

    this.actionLoading = true
    try {
      const res = await ServiceUtil.restPost(`oms_trx/waves/${this.waveId}/add_orders`, { ids: this.selectedAddOrderIds })
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: `${res.addedCount || 0}${i18next.t('label.count_unit', { defaultValue: '건' })} ${i18next.t('message.orders_added', { defaultValue: '주문이 추가되었습니다' })}` }
      }))
      this._closeAddOrderPopup()
      await this._refreshAfterAction()
    } catch (error) {
      console.error('주문 추가 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || i18next.t('message.add_orders_failed', { defaultValue: '주문 추가에 실패했습니다' }) } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 주문 추가 팝업 렌더링 */
  _renderAddOrderPopup() {
    return html`
      <div class="popup-overlay" @click="${e => { if (e.target === e.currentTarget) this._closeAddOrderPopup() }}">
        <div class="popup-container">
          <div class="popup-header">
            <h3>${i18next.t('title.add_orders_to_wave', { defaultValue: '웨이브에 주문 추가' })}</h3>
            <button class="action-btn secondary" @click="${this._closeAddOrderPopup}">✕</button>
          </div>
          <div class="popup-body">
            <div class="popup-info">
              ${i18next.t('label.allocated_orders_available', { defaultValue: 'ALLOCATED 상태의 미배정 주문 목록입니다. 추가할 주문을 선택하세요.' })}
            </div>
            ${this.allocatedOrders.length === 0
        ? html`<div class="empty-state"><div class="text">${i18next.t('label.no_allocated_orders', { defaultValue: '추가 가능한 주문이 없습니다' })}</div></div>`
        : html`
                <table>
                  <thead>
                    <tr>
                      <th style="width:40px"><input type="checkbox" @change="${this._toggleAllAddOrders}" .checked="${this.selectedAddOrderIds.length > 0 && this.selectedAddOrderIds.length === this.allocatedOrders.length}"></th>
                      <th>${i18next.t('label.shipment_no', { defaultValue: '출하번호' })}</th>
                      <th>${i18next.t('label.ref_no', { defaultValue: '참조번호' })}</th>
                      <th>${i18next.t('label.customer', { defaultValue: '고객' })}</th>
                      <th>${i18next.t('label.biz_type', { defaultValue: '업무유형' })}</th>
                      <th class="text-right">${i18next.t('label.order_qty', { defaultValue: '주문수량' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.allocatedOrders.map(o => html`
                      <tr>
                        <td><input type="checkbox" .checked="${this.selectedAddOrderIds.includes(o.id)}" @change="${e => this._toggleAddOrderSelection(o.id, e)}"></td>
                        <td>${o.shipment_no || '-'}</td>
                        <td>${o.ref_order_no || '-'}</td>
                        <td>${o.cust_nm || o.cust_cd || '-'}</td>
                        <td>${this._bizTypeLabel(o.biz_type)}</td>
                        <td class="text-right">${o.total_order ?? 0}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              `}
          </div>
          <div class="popup-footer">
            <span style="flex:1;font-size:13px;color:var(--md-sys-color-on-surface-variant);align-self:center">
              ${this.selectedAddOrderIds.length > 0 ? `${this.selectedAddOrderIds.length}${i18next.t('label.count_unit', { defaultValue: '건' })} ${i18next.t('label.selected', { defaultValue: '선택됨' })}` : ''}
            </span>
            <button class="action-btn secondary" @click="${this._closeAddOrderPopup}">
              ${i18next.t('button.cancel', { defaultValue: '취소' })}
            </button>
            <button class="action-btn primary" ?disabled="${this.selectedAddOrderIds.length === 0 || this.actionLoading}" @click="${this._confirmAddOrders}">
              ${i18next.t('button.add', { defaultValue: '추가' })} (${this.selectedAddOrderIds.length})
            </button>
          </div>
        </div>
      </div>
    `
  }

  /** wave-updated 커스텀 이벤트 발행 */
  _dispatchWaveUpdated() {
    this.dispatchEvent(
      new CustomEvent('wave-updated', {
        composed: true,
        bubbles: true,
        detail: { waveId: this.waveId }
      })
    )
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** 웨이브 상태 코드를 한글 라벨로 변환 */
  _statusLabel(status) {
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      RELEASED: i18next.t('label.released', { defaultValue: '확정' }),
      COMPLETED: i18next.t('label.completed', { defaultValue: '완료' }),
      CANCELLED: i18next.t('label.cancelled', { defaultValue: '취소' })
    }
    return labels[status] || status
  }

  /** 주문 상태 코드를 한글 라벨로 변환 */
  _orderStatusLabel(status) {
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
    return labels[status] || status
  }

  /** 보충 지시 상태 코드를 한글 라벨로 변환 */
  _replenishStatusLabel(status) {
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      IN_PROGRESS: i18next.t('label.in_progress', { defaultValue: '진행중' }),
      COMPLETED: i18next.t('label.completed', { defaultValue: '완료' }),
      CANCELLED: i18next.t('label.cancelled', { defaultValue: '취소' })
    }
    return labels[status] || status
  }

  /** 피킹유형 코드를 한글 라벨로 변환 */
  _pickTypeLabel(type) {
    const labels = {
      TOTAL: i18next.t('label.total_picking', { defaultValue: '토털 피킹' }),
      INDIVIDUAL: i18next.t('label.individual_picking', { defaultValue: '개별 피킹' }),
      ZONE: i18next.t('label.zone_picking', { defaultValue: '존 피킹' })
    }
    return labels[type] || type || '-'
  }

  /** 피킹방식 코드를 한글 라벨로 변환 */
  _pickMethodLabel(type) {
    const labels = {
      WCS: i18next.t('label.pick_method_wcs', { defaultValue: 'WCS 위임' }),
      PAPER: i18next.t('label.pick_method_paper', { defaultValue: '페이퍼 처리' }),
      INSPECT: i18next.t('label.pick_method_inspect', { defaultValue: '검수와 함께 피킹' }),
      PICK: i18next.t('label.pick_method_pick', { defaultValue: '피킹' })
    }
    return labels[type] || type || '-'
  }

  /** 업무유형 코드를 한글 라벨로 변환 */
  _bizTypeLabel(type) {
    const labels = {
      B2C_OUT: 'B2C',
      B2B_OUT: 'B2B',
      STORE_OUT: '매장출고',
      RETURN_OUT: '반품출고'
    }
    return labels[type] || type || '-'
  }

  /** 출하유형 코드를 한글 라벨로 변환 */
  _shipTypeLabel(type) {
    const labels = {
      NORMAL: '일반',
      RETURN: '반품',
      EXCHANGE: '교환',
      PARCEL: '택배',
      FREIGHT: '화물',
      DIRECT: '직송',
      STORE_PICKUP: '매장픽업'
    }
    return labels[type] || type || '-'
  }

  /** 진행률 계산 - 계획 대비 실적 백분율 */
  _calcProgress() {
    const plan = this.wave?.plan_order || 0
    const result = this.wave?.result_order || 0
    if (plan === 0) return 0
    return Math.min(100, Math.round((result / plan) * 100))
  }

  /** 날짜 시간 포맷팅 (YYYY-MM-DD HH:mm) */
  _formatDateTime(dateValue) {
    if (!dateValue) return '-'
    try {
      const d = new Date(dateValue)
      if (isNaN(d.getTime())) return dateValue
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch {
      return dateValue
    }
  }
}

customElements.define('shipment-wave-detail', ShipmentWaveDetail)
