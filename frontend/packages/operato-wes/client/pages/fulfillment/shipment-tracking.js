import { css, html } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, ValueUtil } from '@operato-app/metapage/dist-client'

/**
 * 출고 추적 화면
 *
 * 송장번호/출고번호/포장번호/피킹번호/웨이브번호/원주문번호 중 하나를 입력하면
 * 주문 → 웨이브 → 피킹 → 포장 → 박스/출하 전체 이력을 한 화면에서 조회한다.
 */
class ShipmentTracking extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background);
          padding: var(--padding-wide);
          overflow: auto;
        }

        .page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-large, 24px);
          max-width: 1200px;
          margin: 0 auto;
        }

        h2 {
          margin: var(--title-margin);
          font: var(--title-font);
          color: var(--title-text-color);
        }

        /* ==================== 검색 섹션 ==================== */
        .search-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .search-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .search-field label {
          font-size: 12px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
        }

        .search-field select,
        .search-field input {
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          font-size: 14px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
          outline: none;
        }

        .search-field select {
          width: 160px;
        }

        .search-field input {
          width: 320px;
        }

        .search-field input:focus,
        .search-field select:focus {
          border-color: var(--md-sys-color-primary);
        }

        .btn-search {
          height: 40px;
          padding: 0 24px;
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-search:hover {
          opacity: 0.9;
        }

        /* ==================== 결과 없음 / 로딩 ==================== */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          color: var(--md-sys-color-on-surface-variant);
        }

        .empty-state .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state .message {
          font-size: 16px;
        }

        .loading {
          text-align: center;
          padding: 60px 0;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 15px;
        }

        /* ==================== 요약 카드 ==================== */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .summary-card {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: 20px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .summary-card .card-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 8px;
        }

        .summary-card .card-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          word-break: break-all;
        }

        .summary-card .card-sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 6px;
        }

        /* ==================== 타임라인 ==================== */
        .timeline-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: var(--spacing-large, 24px);
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .timeline-section .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          margin-bottom: 20px;
        }

        .timeline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 1;
          flex: 1;
        }

        .timeline-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--md-sys-color-surface-variant);
          border: 2px solid var(--md-sys-color-outline-variant);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
          transition: all 0.3s;
        }

        .timeline-step.active .timeline-dot {
          background: var(--md-sys-color-primary);
          border-color: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .timeline-step.passed .timeline-dot {
          background: #4CAF50;
          border-color: #4CAF50;
          color: #fff;
        }

        .timeline-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          text-align: center;
        }

        .timeline-step.active .timeline-label,
        .timeline-step.passed .timeline-label {
          color: var(--md-sys-color-on-surface);
          font-weight: 600;
        }

        .timeline-time {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .timeline-connector {
          flex: 1;
          height: 2px;
          background: var(--md-sys-color-outline-variant);
          margin: 0 -8px;
          margin-bottom: 42px;
        }

        .timeline-connector.passed {
          background: #4CAF50;
        }

        /* ==================== 탭 ==================== */
        .tab-section {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.1));
          overflow: hidden;
        }

        .tab-bar {
          display: flex;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .tab-item {
          padding: 14px 24px;
          font-size: 14px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-item:hover {
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface-variant);
        }

        .tab-item.active {
          color: var(--md-sys-color-primary);
          border-bottom-color: var(--md-sys-color-primary);
          font-weight: 600;
        }

        .tab-content {
          padding: var(--spacing-large, 24px);
        }

        /* ==================== 정보 그리드 ==================== */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
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

        /* ==================== 데이터 테이블 ==================== */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .data-table thead {
          background: var(--md-sys-color-surface-variant);
        }

        .data-table th {
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          font-size: 12px;
        }

        .data-table td {
          padding: 10px 12px;
          color: var(--md-sys-color-on-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .data-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant);
        }

        th.center,
        td.center {
          text-align: center;
        }

        th.right,
        td.right {
          text-align: right;
        }

        /* ==================== 뱃지 ==================== */
        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge.created {
          background: #f3e5f5;
          color: #7b1fa2;
        }
        .badge.in_progress {
          background: #fff3e0;
          color: #ff9800;
        }
        .badge.completed,
        .badge.inspected {
          background: #e3f2fd;
          color: #2196f3;
        }
        .badge.packed {
          background: #e0f2f1;
          color: #00897b;
        }
        .badge.shipped {
          background: #e8f5e9;
          color: #4caf50;
        }
        .badge.cancelled {
          background: #ffebee;
          color: #d32f2f;
        }
        .badge.allocated {
          background: #e8eaf6;
          color: #3f51b5;
        }
        .badge.released {
          background: #fff8e1;
          color: #f9a825;
        }

        /* ==================== 섹션 구분 ==================== */
        .sub-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          margin: 20px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .sub-title:first-child {
          margin-top: 0;
        }

        .no-data {
          text-align: center;
          padding: 30px 0;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
        }

        /* ==================== 반응형 ==================== */
        @media (max-width: 768px) {
          .summary-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .search-row {
            flex-wrap: wrap;
          }

          .search-field input {
            width: 100%;
          }

          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      searchKeyword: String,
      searchType: String,
      loading: Boolean,
      searched: Boolean,
      notFound: Boolean,
      activeTab: Number,
      shipmentOrder: Object,
      shipmentOrderItems: Array,
      stockAllocations: Array,
      wave: Object,
      pickingTask: Object,
      pickingTaskItems: Array,
      packingOrder: Object,
      packingOrderItems: Array,
      packingBoxes: Array
    }
  }

  constructor() {
    super()
    this.searchKeyword = ''
    this.searchType = 'auto'
    this.loading = false
    this.searched = false
    this.notFound = false
    this.activeTab = 0
    this.shipmentOrder = null
    this.shipmentOrderItems = []
    this.stockAllocations = []
    this.wave = null
    this.pickingTask = null
    this.pickingTaskItems = []
    this.packingOrder = null
    this.packingOrderItems = []
    this.packingBoxes = []
  }

  get context() {
    return {
      title: i18next.t('menu.ShipmentTracking', { defaultValue: '출고 추적' })
    }
  }

  render() {
    return html`
      <div class="page-container">
        <h2>${i18next.t('menu.ShipmentTracking', { defaultValue: '출고 추적' })}</h2>

        <!-- 검색 섹션 -->
        ${this._renderSearchSection()}

        <!-- 결과 영역 -->
        ${this.loading
          ? html`<div class="loading">${i18next.t('label.loading', { defaultValue: '데이터 로딩 중...' })}</div>`
          : this.notFound
            ? html`
                <div class="empty-state">
                  <div class="icon">🔍</div>
                  <div class="message">${i18next.t('label.tracking_not_found', { defaultValue: '검색 결과가 없습니다. 다른 번호로 조회해 주세요.' })}</div>
                </div>
              `
            : !this.searched
              ? html`
                  <div class="empty-state">
                    <div class="icon">📦</div>
                    <div class="message">${i18next.t('label.tracking_guide', { defaultValue: '송장번호, 출고번호, 원주문번호 등을 입력하고 조회하세요.' })}</div>
                  </div>
                `
              : html`
                  ${this._renderSummaryCards()}
                  ${this._renderTimeline()}
                  ${this._renderTabs()}
                `}
      </div>
    `
  }

  // ==================== 검색 섹션 ====================

  _renderSearchSection() {
    return html`
      <div class="search-section">
        <div class="search-row">
          <div class="search-field">
            <label>${i18next.t('label.search_type', { defaultValue: '검색 유형' })}</label>
            <select .value=${this.searchType} @change=${e => (this.searchType = e.target.value)}>
              <option value="auto">${i18next.t('label.auto_detect', { defaultValue: '자동 감지' })}</option>
              <option value="invoice">${i18next.t('label.invoice_no', { defaultValue: '송장번호' })}</option>
              <option value="shipment">${i18next.t('label.shipment_no', { defaultValue: '출고번호' })}</option>
              <option value="ref_order">${i18next.t('label.ref_order_no', { defaultValue: '원주문번호' })}</option>
              <option value="packing">${i18next.t('label.pack_order_no', { defaultValue: '포장번호' })}</option>
              <option value="picking">${i18next.t('label.pick_task_no', { defaultValue: '피킹번호' })}</option>
              <option value="wave">${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}</option>
            </select>
          </div>
          <div class="search-field" style="flex:1">
            <label>${i18next.t('label.keyword', { defaultValue: '검색어' })}</label>
            <input
              type="text"
              placeholder="${i18next.t('label.tracking_placeholder', { defaultValue: '송장번호, 출고번호, 원주문번호 등 입력' })}"
              .value=${this.searchKeyword}
              @input=${e => (this.searchKeyword = e.target.value)}
              @keyup=${e => e.key === 'Enter' && this._search()}
            />
          </div>
          <button class="btn-search" @click=${this._search}>
            ${i18next.t('button.search', { defaultValue: '조회' })}
          </button>
        </div>
      </div>
    `
  }

  // ==================== 요약 카드 ====================

  _renderSummaryCards() {
    const order = this.shipmentOrder || {}
    const wave = this.wave
    const packing = this.packingOrder
    const boxes = this.packingBoxes || []

    const invoiceNo = boxes.length > 0 ? boxes[0].invoice_no : null

    return html`
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-title">${i18next.t('label.ref_order_no', { defaultValue: '원주문번호' })}</div>
          <div class="card-value">${order.ref_order_no || '-'}</div>
          <div class="card-sub">${order.cust_nm || ''}</div>
        </div>
        <div class="summary-card">
          <div class="card-title">${i18next.t('label.shipment_no', { defaultValue: '출고번호' })}</div>
          <div class="card-value">${order.shipment_no || '-'}</div>
          <div class="card-sub">
            <span class="badge ${(order.status || '').toLowerCase()}">${this._statusLabel(order.status)}</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-title">${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}</div>
          <div class="card-value">${wave ? wave.wave_no : order.wave_no || '-'}</div>
          <div class="card-sub">${wave ? this._pickTypeLabel(wave.pick_type) : ''}</div>
        </div>
        <div class="summary-card">
          <div class="card-title">${i18next.t('label.invoice_no', { defaultValue: '송장번호' })}</div>
          <div class="card-value">${invoiceNo || '-'}</div>
          <div class="card-sub">${order.carrier_cd || ''} ${boxes.length > 0 ? `(${boxes.length}Box)` : ''}</div>
        </div>
      </div>
    `
  }

  // ==================== 타임라인 ====================

  _renderTimeline() {
    const order = this.shipmentOrder || {}
    const wave = this.wave
    const picking = this.pickingTask
    const packing = this.packingOrder

    const steps = [
      {
        label: i18next.t('label.order_received', { defaultValue: '주문접수' }),
        icon: '1',
        time: this._formatDateTime(order.confirmed_at),
        done: !!order.id
      },
      {
        label: i18next.t('label.allocated', { defaultValue: '재고할당' }),
        icon: '2',
        time: this._formatDateTime(order.allocated_at),
        done: !!order.allocated_at
      },
      {
        label: i18next.t('label.wave_released', { defaultValue: '웨이브' }),
        icon: '3',
        time: this._formatDateTime(order.released_at),
        done: !!order.released_at || !!wave
      },
      {
        label: i18next.t('label.picking', { defaultValue: '피킹' }),
        icon: '4',
        time: this._formatDateTime(picking ? picking.completed_at : null),
        done: picking && ['COMPLETED', 'CANCELLED'].includes(picking.status),
        active: picking && picking.status === 'IN_PROGRESS'
      },
      {
        label: i18next.t('label.packing', { defaultValue: '포장' }),
        icon: '5',
        time: this._formatDateTime(packing ? packing.completed_at : null),
        done: packing && ['COMPLETED', 'SHIPPED'].includes(packing.status),
        active: packing && packing.status === 'IN_PROGRESS'
      },
      {
        label: i18next.t('label.shipped', { defaultValue: '출하' }),
        icon: '6',
        time: this._formatDateTime(packing ? packing.shipped_at : order.shipped_at),
        done: (packing && packing.status === 'SHIPPED') || order.status === 'SHIPPED'
      }
    ]

    return html`
      <div class="timeline-section">
        <div class="section-title">${i18next.t('label.process_flow', { defaultValue: '처리 흐름' })}</div>
        <div class="timeline">
          ${steps.map(
            (step, i) => html`
              ${i > 0 ? html`<div class="timeline-connector ${step.done || step.active ? 'passed' : ''}"></div>` : ''}
              <div class="timeline-step ${step.done ? 'passed' : step.active ? 'active' : ''}">
                <div class="timeline-dot">${step.done ? '✓' : step.icon}</div>
                <div class="timeline-label">${step.label}</div>
                <div class="timeline-time">${step.time || ''}</div>
              </div>
            `
          )}
        </div>
      </div>
    `
  }

  // ==================== 탭 ====================

  _renderTabs() {
    const tabs = [
      i18next.t('label.order_info', { defaultValue: '주문 정보' }),
      i18next.t('label.picking', { defaultValue: '피킹' }),
      i18next.t('label.packing', { defaultValue: '포장' }),
      i18next.t('label.box_invoice', { defaultValue: '박스/송장' })
    ]

    return html`
      <div class="tab-section">
        <div class="tab-bar">
          ${tabs.map(
            (tab, i) =>
              html`<div class="tab-item ${this.activeTab === i ? 'active' : ''}" @click=${() => (this.activeTab = i)}>
                ${tab}
              </div>`
          )}
        </div>
        <div class="tab-content">
          ${this.activeTab === 0
            ? this._renderOrderTab()
            : this.activeTab === 1
              ? this._renderPickingTab()
              : this.activeTab === 2
                ? this._renderPackingTab()
                : this._renderBoxTab()}
        </div>
      </div>
    `
  }

  // ==================== 탭1: 주문 정보 ====================

  _renderOrderTab() {
    const order = this.shipmentOrder || {}
    const items = this.shipmentOrderItems || []
    const allocs = this.stockAllocations || []

    return html`
      <div class="sub-title">${i18next.t('label.shipment_order', { defaultValue: '출고 주문' })}</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">${i18next.t('label.shipment_no', { defaultValue: '출고번호' })}</span>
          <span class="info-value">${order.shipment_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.ref_order_no', { defaultValue: '원주문번호' })}</span>
          <span class="info-value">${order.ref_order_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.status', { defaultValue: '상태' })}</span>
          <span class="info-value">
            <span class="badge ${(order.status || '').toLowerCase()}">${this._statusLabel(order.status)}</span>
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.order_date', { defaultValue: '주문일자' })}</span>
          <span class="info-value">${order.order_date || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.ship_by_date', { defaultValue: '출고예정일' })}</span>
          <span class="info-value">${order.ship_by_date || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.wave_no', { defaultValue: '웨이브번호' })}</span>
          <span class="info-value">${order.wave_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.cust_cd', { defaultValue: '고객코드' })}</span>
          <span class="info-value">${order.cust_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.cust_nm', { defaultValue: '고객명' })}</span>
          <span class="info-value">${order.cust_nm || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.carrier_cd', { defaultValue: '운송사' })}</span>
          <span class="info-value">${order.carrier_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.total_item', { defaultValue: '총 품목' })}</span>
          <span class="info-value">${this._formatNumber(order.total_item)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.total_order', { defaultValue: '총 주문수량' })}</span>
          <span class="info-value">${this._formatNumber(order.total_order)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.total_shipped', { defaultValue: '총 출하수량' })}</span>
          <span class="info-value">${this._formatNumber(order.total_shipped)}</span>
        </div>
      </div>

      <!-- 주문 아이템 -->
      <div class="sub-title">${i18next.t('label.order_items', { defaultValue: '주문 아이템' })} (${items.length})</div>
      ${items.length === 0
        ? html`<div class="no-data">${i18next.t('label.no_data', { defaultValue: '데이터 없음' })}</div>`
        : html`
            <table class="data-table">
              <thead>
                <tr>
                  <th class="center">#</th>
                  <th>${i18next.t('label.sku_cd', { defaultValue: 'SKU' })}</th>
                  <th>${i18next.t('label.sku_nm', { defaultValue: '상품명' })}</th>
                  <th class="right">${i18next.t('label.order_qty', { defaultValue: '주문수량' })}</th>
                  <th class="right">${i18next.t('label.alloc_qty', { defaultValue: '할당수량' })}</th>
                  <th class="right">${i18next.t('label.shipped_qty', { defaultValue: '출하수량' })}</th>
                  <th class="center">${i18next.t('label.barcode', { defaultValue: '바코드' })}</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(
                  item => html`
                    <tr>
                      <td class="center">${item.line_no}</td>
                      <td>${item.sku_cd}</td>
                      <td>${item.sku_nm || '-'}</td>
                      <td class="right">${this._formatNumber(item.order_qty)}</td>
                      <td class="right">${this._formatNumber(item.alloc_qty)}</td>
                      <td class="right">${this._formatNumber(item.shipped_qty)}</td>
                      <td class="center">${item.barcode || '-'}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          `}

      <!-- 재고 할당 -->
      ${allocs.length > 0
        ? html`
            <div class="sub-title">${i18next.t('label.stock_allocations', { defaultValue: '재고 할당 내역' })} (${allocs.length})</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>${i18next.t('label.sku_cd', { defaultValue: 'SKU' })}</th>
                  <th>${i18next.t('label.loc_cd', { defaultValue: '로케이션' })}</th>
                  <th class="right">${i18next.t('label.alloc_qty', { defaultValue: '할당수량' })}</th>
                  <th>${i18next.t('label.alloc_strategy', { defaultValue: '할당전략' })}</th>
                  <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
                  <th class="center">${i18next.t('label.allocated_at', { defaultValue: '할당일시' })}</th>
                </tr>
              </thead>
              <tbody>
                ${allocs.map(
                  a => html`
                    <tr>
                      <td>${a.sku_cd}</td>
                      <td>${a.loc_cd || '-'}</td>
                      <td class="right">${this._formatNumber(a.alloc_qty)}</td>
                      <td>${a.alloc_strategy || '-'}</td>
                      <td class="center">
                        <span class="badge ${(a.status || '').toLowerCase()}">${this._statusLabel(a.status)}</span>
                      </td>
                      <td class="center">${this._formatDateTime(a.allocated_at)}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          `
        : ''}
    `
  }

  // ==================== 탭2: 피킹 ====================

  _renderPickingTab() {
    const task = this.pickingTask
    const items = this.pickingTaskItems || []

    if (!task) {
      return html`<div class="no-data">${i18next.t('label.no_picking_data', { defaultValue: '피킹 정보가 없습니다.' })}</div>`
    }

    return html`
      <div class="sub-title">${i18next.t('label.picking_task', { defaultValue: '피킹 지시' })}</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">${i18next.t('label.pick_task_no', { defaultValue: '피킹번호' })}</span>
          <span class="info-value">${task.pick_task_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.pick_type', { defaultValue: '피킹유형' })}</span>
          <span class="info-value">${this._pickTypeLabel(task.pick_type)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.status', { defaultValue: '상태' })}</span>
          <span class="info-value">
            <span class="badge ${(task.status || '').toLowerCase()}">${this._statusLabel(task.status)}</span>
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.plan_total', { defaultValue: '계획수량' })}</span>
          <span class="info-value">${this._formatNumber(task.plan_total)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.result_total', { defaultValue: '실적수량' })}</span>
          <span class="info-value">${this._formatNumber(task.result_total)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.short_total', { defaultValue: '부족수량' })}</span>
          <span class="info-value">${this._formatNumber(task.short_total)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.started_at', { defaultValue: '시작일시' })}</span>
          <span class="info-value">${this._formatDateTime(task.started_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.completed_at', { defaultValue: '완료일시' })}</span>
          <span class="info-value">${this._formatDateTime(task.completed_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.worker_id', { defaultValue: '작업자' })}</span>
          <span class="info-value">${task.worker_id || '-'}</span>
        </div>
      </div>

      <!-- 피킹 아이템 -->
      <div class="sub-title">${i18next.t('label.picking_items', { defaultValue: '피킹 아이템' })} (${items.length})</div>
      ${items.length === 0
        ? html`<div class="no-data">${i18next.t('label.no_data', { defaultValue: '데이터 없음' })}</div>`
        : html`
            <table class="data-table">
              <thead>
                <tr>
                  <th class="center">${i18next.t('label.rank', { defaultValue: '순번' })}</th>
                  <th>${i18next.t('label.sku_cd', { defaultValue: 'SKU' })}</th>
                  <th>${i18next.t('label.sku_nm', { defaultValue: '상품명' })}</th>
                  <th>${i18next.t('label.from_loc_cd', { defaultValue: '출발 로케이션' })}</th>
                  <th>${i18next.t('label.to_loc_cd', { defaultValue: '도착 로케이션' })}</th>
                  <th class="right">${i18next.t('label.order_qty', { defaultValue: '지시수량' })}</th>
                  <th class="right">${i18next.t('label.pick_qty', { defaultValue: '피킹수량' })}</th>
                  <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(
                  item => html`
                    <tr>
                      <td class="center">${item.rank}</td>
                      <td>${item.sku_cd}</td>
                      <td>${item.sku_nm || '-'}</td>
                      <td>${item.from_loc_cd || '-'}</td>
                      <td>${item.to_loc_cd || '-'}</td>
                      <td class="right">${this._formatNumber(item.order_qty)}</td>
                      <td class="right">${this._formatNumber(item.pick_qty)}</td>
                      <td class="center">
                        <span class="badge ${(item.status || '').toLowerCase()}">${this._statusLabel(item.status)}</span>
                      </td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          `}
    `
  }

  // ==================== 탭3: 포장 ====================

  _renderPackingTab() {
    const packing = this.packingOrder
    const items = this.packingOrderItems || []

    if (!packing) {
      return html`<div class="no-data">${i18next.t('label.no_packing_data', { defaultValue: '포장 정보가 없습니다.' })}</div>`
    }

    return html`
      <div class="sub-title">${i18next.t('label.packing_order', { defaultValue: '포장 지시' })}</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">${i18next.t('label.pack_order_no', { defaultValue: '포장번호' })}</span>
          <span class="info-value">${packing.pack_order_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.pick_task_no', { defaultValue: '피킹번호' })}</span>
          <span class="info-value">${packing.pick_task_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.status', { defaultValue: '상태' })}</span>
          <span class="info-value">
            <span class="badge ${(packing.status || '').toLowerCase()}">${this._statusLabel(packing.status)}</span>
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.insp_type', { defaultValue: '검수유형' })}</span>
          <span class="info-value">${packing.insp_type || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.insp_result', { defaultValue: '검수결과' })}</span>
          <span class="info-value">${packing.insp_result || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.station_cd', { defaultValue: '작업대' })}</span>
          <span class="info-value">${packing.station_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.total_box', { defaultValue: '총 박스' })}</span>
          <span class="info-value">${this._formatNumber(packing.total_box)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.total_wt', { defaultValue: '총 중량(kg)' })}</span>
          <span class="info-value">${packing.total_wt != null ? Number(packing.total_wt).toFixed(2) : '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.carrier_cd', { defaultValue: '운송사' })}</span>
          <span class="info-value">${packing.carrier_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.started_at', { defaultValue: '시작일시' })}</span>
          <span class="info-value">${this._formatDateTime(packing.started_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.completed_at', { defaultValue: '완료일시' })}</span>
          <span class="info-value">${this._formatDateTime(packing.completed_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${i18next.t('label.shipped_at', { defaultValue: '출하일시' })}</span>
          <span class="info-value">${this._formatDateTime(packing.shipped_at)}</span>
        </div>
      </div>

      <!-- 포장 아이템 -->
      <div class="sub-title">${i18next.t('label.packing_items', { defaultValue: '포장 아이템' })} (${items.length})</div>
      ${items.length === 0
        ? html`<div class="no-data">${i18next.t('label.no_data', { defaultValue: '데이터 없음' })}</div>`
        : html`
            <table class="data-table">
              <thead>
                <tr>
                  <th>${i18next.t('label.sku_cd', { defaultValue: 'SKU' })}</th>
                  <th>${i18next.t('label.sku_nm', { defaultValue: '상품명' })}</th>
                  <th class="right">${i18next.t('label.order_qty', { defaultValue: '주문수량' })}</th>
                  <th class="right">${i18next.t('label.insp_qty', { defaultValue: '검수수량' })}</th>
                  <th class="right">${i18next.t('label.pack_qty', { defaultValue: '포장수량' })}</th>
                  <th class="right">${i18next.t('label.short_qty', { defaultValue: '부족수량' })}</th>
                  <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(
                  item => html`
                    <tr>
                      <td>${item.sku_cd}</td>
                      <td>${item.sku_nm || '-'}</td>
                      <td class="right">${this._formatNumber(item.order_qty)}</td>
                      <td class="right">${this._formatNumber(item.insp_qty)}</td>
                      <td class="right">${this._formatNumber(item.pack_qty)}</td>
                      <td class="right">${this._formatNumber(item.short_qty)}</td>
                      <td class="center">
                        <span class="badge ${(item.status || '').toLowerCase()}">${this._statusLabel(item.status)}</span>
                      </td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          `}
    `
  }

  // ==================== 탭4: 박스/송장 ====================

  _renderBoxTab() {
    const boxes = this.packingBoxes || []

    if (boxes.length === 0) {
      return html`<div class="no-data">${i18next.t('label.no_box_data', { defaultValue: '박스/송장 정보가 없습니다.' })}</div>`
    }

    return html`
      <div class="sub-title">${i18next.t('label.packing_boxes', { defaultValue: '박스 목록' })} (${boxes.length})</div>
      <table class="data-table">
        <thead>
          <tr>
            <th class="center">${i18next.t('label.box_seq', { defaultValue: '박스순번' })}</th>
            <th>${i18next.t('label.box_type_cd', { defaultValue: '박스유형' })}</th>
            <th class="right">${i18next.t('label.total_item', { defaultValue: '품목수' })}</th>
            <th class="right">${i18next.t('label.total_qty', { defaultValue: '수량' })}</th>
            <th class="right">${i18next.t('label.box_wt', { defaultValue: '중량(kg)' })}</th>
            <th>${i18next.t('label.invoice_no', { defaultValue: '송장번호' })}</th>
            <th class="center">${i18next.t('label.label_printed', { defaultValue: '라벨출력' })}</th>
            <th class="center">${i18next.t('label.status', { defaultValue: '상태' })}</th>
          </tr>
        </thead>
        <tbody>
          ${boxes.map(
            box => html`
              <tr>
                <td class="center">${box.box_seq}</td>
                <td>${box.box_type_cd || '-'}</td>
                <td class="right">${this._formatNumber(box.total_item)}</td>
                <td class="right">${this._formatNumber(box.total_qty)}</td>
                <td class="right">${box.box_wt != null ? Number(box.box_wt).toFixed(2) : '-'}</td>
                <td>${box.invoice_no || '-'}</td>
                <td class="center">${box.label_printed_flag ? '✓' : '-'}</td>
                <td class="center">
                  <span class="badge ${(box.status || '').toLowerCase()}">${this._statusLabel(box.status)}</span>
                </td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `
  }

  // ==================== 검색 ====================

  async _search() {
    const keyword = (this.searchKeyword || '').trim()
    if (!keyword) return

    this.loading = true
    this.searched = true
    this.notFound = false

    try {
      const type = this.searchType || 'auto'
      const response = await ServiceUtil.restGet(
        `ful_trx/tracking?keyword=${encodeURIComponent(keyword)}&type=${type}`
      )

      this.shipmentOrder = response.shipment_order
      this.shipmentOrderItems = response.shipment_order_items || []
      this.stockAllocations = response.stock_allocations || []
      this.wave = response.wave
      this.pickingTask = response.picking_task
      this.pickingTaskItems = response.picking_task_items || []
      this.packingOrder = response.packing_order
      this.packingOrderItems = response.packing_order_items || []
      this.packingBoxes = response.packing_boxes || []

      if (!this.shipmentOrder) {
        this.notFound = true
      }
    } catch (e) {
      this.notFound = true
      console.error('Tracking search failed:', e)
    } finally {
      this.loading = false
    }
  }

  // ==================== 유틸리티 ====================

  _statusLabel(status) {
    if (!status) return '-'
    const labels = {
      CREATED: i18next.t('label.created', { defaultValue: '생성' }),
      CONFIRMED: i18next.t('label.confirmed', { defaultValue: '확정' }),
      ALLOCATED: i18next.t('label.allocated', { defaultValue: '할당' }),
      RELEASED: i18next.t('label.released', { defaultValue: '릴리스' }),
      IN_PROGRESS: i18next.t('label.in_progress', { defaultValue: '진행중' }),
      COMPLETED: i18next.t('label.completed', { defaultValue: '완료' }),
      INSPECTED: i18next.t('label.inspected', { defaultValue: '검수완료' }),
      PACKED: i18next.t('label.packed', { defaultValue: '포장완료' }),
      SHIPPED: i18next.t('label.shipped', { defaultValue: '출하완료' }),
      CANCELLED: i18next.t('label.cancelled', { defaultValue: '취소' }),
      LABEL_PRINTED: i18next.t('label.label_printed', { defaultValue: '라벨출력' }),
      MANIFESTED: i18next.t('label.manifested', { defaultValue: '매니페스트' }),
      OPEN: i18next.t('label.open', { defaultValue: '열림' }),
      CLOSED: i18next.t('label.closed', { defaultValue: '닫힘' })
    }
    return labels[status] || status
  }

  _pickTypeLabel(pickType) {
    if (!pickType) return '-'
    const labels = {
      INDIVIDUAL: i18next.t('label.individual', { defaultValue: '개별 피킹' }),
      TOTAL: i18next.t('label.total', { defaultValue: '토탈 피킹' })
    }
    return labels[pickType] || pickType
  }

  _formatNumber(value) {
    if (value == null) return '-'
    return Number(value).toLocaleString()
  }

  _formatDateTime(dateValue) {
    if (!dateValue) return ''
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return ''
    const Y = d.getFullYear()
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const D = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}`
  }
}

window.customElements.define('shipment-tracking', ShipmentTracking)
