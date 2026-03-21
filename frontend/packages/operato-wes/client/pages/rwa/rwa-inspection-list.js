import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 반품 검수 목록 화면
 *
 * 기능:
 * - RECEIVING/INSPECTING/INSPECTED 상태 반품 주문의 검수 관리
 * - 대기시간 표시 및 24시간 이상 경고
 * - 주문별 반품 항목(rwa_order_items) 확장/축소 표시
 * - 검수 진행률 시각화
 */
class RwaInspectionList extends localize(i18next)(PageView) {
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

        /* 필터 칩 */
        .filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .filter-chip {
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

        .filter-chip:hover {
          transform: translateY(-1px);
        }

        .filter-chip.all {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
        }

        .filter-chip.receiving {
          background: #E0F7FA;
          color: #00838F;
        }

        .filter-chip.inspecting {
          background: #FFF3E0;
          color: #E65100;
        }

        .filter-chip.inspected {
          background: #F1F8E9;
          color: #689F38;
        }

        .filter-chip.active {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .filter-chip .chip-count {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        /* 주문 카드 */
        .order-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          box-shadow: var(--box-shadow-light, 0 2px 4px rgba(0, 0, 0, 0.08));
          transition: all 0.2s;
          overflow: hidden;
        }

        .order-card:hover {
          box-shadow: var(--box-shadow-normal, 0 4px 12px rgba(0, 0, 0, 0.12));
        }

        .order-card.RECEIVING {
          border-left: 4px solid #00BCD4;
        }

        .order-card.INSPECTING {
          border-left: 4px solid #FF9800;
        }

        .order-card.INSPECTED {
          border-left: 4px solid #CDDC39;
        }

        /* 카드 헤더 */
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
        }

        .card-header:hover {
          background: var(--md-sys-color-surface-variant, #fafafa);
        }

        .card-title-area {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .rwa-no {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .rwa-type-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          background: #FFF3E0;
          color: #E65100;
        }

        .cust-info {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .wait-time {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant, #666);
          padding: 3px 8px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .wait-time.warning {
          color: #FF9800;
          font-weight: 600;
          background: #FFF3E0;
        }

        .wait-time.warning::after {
          content: ' ⚠️';
        }

        .card-status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .card-status-badge.RECEIVING {
          background: #E0F7FA;
          color: #00838F;
        }

        .card-status-badge.INSPECTING {
          background: #FFF3E0;
          color: #E65100;
        }

        .card-status-badge.INSPECTED {
          background: #F1F8E9;
          color: #689F38;
        }

        /* 카드 요약 */
        .card-summary {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 20px 12px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .summary-item .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .summary-item .value.ok {
          color: #2E7D32;
        }

        .summary-item .value.warn {
          color: #E65100;
        }

        /* 진행 바 */
        .progress-bar-container {
          padding: 0 20px 12px;
        }

        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease;
          background: linear-gradient(90deg, #FF9800, #F57C00);
        }

        .progress-bar-fill.complete {
          background: linear-gradient(90deg, #4CAF50, #388E3C);
        }

        /* 카드 액션 */
        .card-actions {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #eee);
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

        .card-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* 확장 영역: 항목 테이블 */
        .items-section {
          border-top: 1px solid var(--md-sys-color-outline-variant, #eee);
          padding: 16px 20px;
          background: var(--md-sys-color-surface-container, #fafafa);
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .items-table thead {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }

        .items-table th,
        .items-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .items-table th {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          font-size: 12px;
        }

        .items-table td {
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        .items-table td.number {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .items-table tbody tr:hover {
          background: var(--md-sys-color-surface, #fff);
        }

        .item-status-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .item-status-badge.RECEIVING {
          background: #E0F7FA;
          color: #00838F;
        }

        .item-status-badge.INSPECTING {
          background: #FFF3E0;
          color: #E65100;
        }

        .item-status-badge.INSPECTED {
          background: #F1F8E9;
          color: #689F38;
        }

        .item-status-badge.COMPLETED {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .item-action-btn {
          padding: 4px 10px;
          border: 1px solid #FFB74D;
          border-radius: 4px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          color: #E65100;
        }

        .item-action-btn:hover {
          background: #FFF3E0;
        }

        .item-action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* 토글 아이콘 */
        .toggle-icon {
          font-size: 18px;
          transition: transform 0.2s;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-left: 8px;
        }

        .toggle-icon.expanded {
          transform: rotate(180deg);
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
          .card-title-area {
            flex-wrap: wrap;
          }

          .card-summary {
            flex-wrap: wrap;
          }

          .filter-bar {
            flex-wrap: wrap;
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      orders: Array,
      itemsMap: Object,
      expandedOrderId: String,
      statusFilter: String
    }
  }

  constructor() {
    super()
    this.loading = true
    this.orders = []
    this.itemsMap = {}
    this.expandedOrderId = null
    this.statusFilter = 'ALL'
  }

  get context() {
    return {
      title: TermsUtil.tMenu('RwaInspectionList')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      <div class="page-header">
        <h2>반품 검수 관리</h2>
        <button class="btn-icon" @click="${this._refresh}">새로고침</button>
      </div>

      ${this._renderFilterBar()}

      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : this._filteredOrders.length === 0
          ? this._renderEmptyState()
          : html`
              <div class="order-cards">
                ${this._filteredOrders.map(order => this._renderOrderCard(order))}
              </div>
            `}
    `
  }

  _renderFilterBar() {
    const all = this.orders.length
    const receiving = this.orders.filter(o => o.status === 'RECEIVING').length
    const inspecting = this.orders.filter(o => o.status === 'INSPECTING').length
    const inspected = this.orders.filter(o => o.status === 'INSPECTED').length

    return html`
      <div class="filter-bar">
        <div
          class="filter-chip all ${this.statusFilter === 'ALL' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'ALL' }}"
        >
          전체 <span class="chip-count">${all}</span>
        </div>
        <div
          class="filter-chip receiving ${this.statusFilter === 'RECEIVING' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'RECEIVING' }}"
        >
          입고완료 <span class="chip-count">${receiving}</span>
        </div>
        <div
          class="filter-chip inspecting ${this.statusFilter === 'INSPECTING' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'INSPECTING' }}"
        >
          검수중 <span class="chip-count">${inspecting}</span>
        </div>
        <div
          class="filter-chip inspected ${this.statusFilter === 'INSPECTED' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'INSPECTED' }}"
        >
          검수완료 <span class="chip-count">${inspected}</span>
        </div>
      </div>
    `
  }

  _renderOrderCard(order) {
    const isExpanded = this.expandedOrderId === order.id
    const items = this.itemsMap[order.id] || []
    const totalItems = items.length
    const inspectedCount = items.filter(i => (i.good_qty || 0) > 0 || (i.defect_qty || 0) > 0).length
    const totalRwaQty = items.reduce((s, i) => s + (i.rwa_qty || 0), 0)
    const totalGoodQty = items.reduce((s, i) => s + (i.good_qty || 0), 0)
    const totalDefectQty = items.reduce((s, i) => s + (i.defect_qty || 0), 0)
    const progressPct = totalItems > 0 ? Math.round((inspectedCount / totalItems) * 100) : 0

    const canStartInspection = order.status === 'RECEIVING'

    // 대기시간 계산
    const waitTime = this._calculateWaitTime(order)

    return html`
      <div class="order-card ${order.status}">
        <!-- 카드 헤더 -->
        <div class="card-header" @click="${() => this._toggleExpand(order)}">
          <div class="card-title-area">
            <span class="rwa-no">${order.rwa_no}</span>
            <span class="rwa-type-badge">${this._rwaTypeLabel(order.rwa_type)}</span>
            <span class="cust-info">${order.cust_nm || ''}${order.cust_cd ? ` (${order.cust_cd})` : ''}</span>
            <span class="wait-time ${waitTime.isWarning ? 'warning' : ''}">${waitTime.display}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="card-status-badge ${order.status}">${this._statusLabel(order.status)}</span>
            <span class="toggle-icon ${isExpanded ? 'expanded' : ''}">▼</span>
          </div>
        </div>

        <!-- 요약 -->
        <div class="card-summary">
          <div class="summary-item">
            항목: <span class="value">${totalItems}건</span>
          </div>
          <div class="summary-item">
            입고: <span class="value">${totalRwaQty} EA</span>
          </div>
          <div class="summary-item">
            양품: <span class="value ${totalGoodQty > 0 ? 'ok' : ''}">${totalGoodQty} EA</span>
          </div>
          <div class="summary-item">
            불량: <span class="value ${totalDefectQty > 0 ? 'warn' : ''}">${totalDefectQty} EA</span>
          </div>
        </div>

        <!-- 진행률 바 -->
        <div class="progress-bar-container">
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill ${progressPct >= 100 ? 'complete' : ''}"
              style="width: ${Math.min(progressPct, 100)}%"
            ></div>
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div class="card-actions">
          <button
            class="card-action-btn primary"
            ?disabled="${!canStartInspection}"
            @click="${e => { e.stopPropagation(); this._startInspection(order) }}"
          >검수 시작</button>
          <button
            class="card-action-btn"
            @click="${e => { e.stopPropagation(); this._viewDetail(order) }}"
          >상세 보기</button>
        </div>

        <!-- 확장: 항목 테이블 -->
        ${isExpanded ? this._renderItemsSection(order, items) : ''}
      </div>
    `
  }

  _renderItemsSection(order, items) {
    if (!items || items.length === 0) {
      return html`
        <div class="items-section">
          <div style="text-align: center; padding: 20px; color: #999; font-size: 13px;">
            반품 항목이 없습니다
          </div>
        </div>
      `
    }

    return html`
      <div class="items-section">
        <table class="items-table">
          <thead>
            <tr>
              <th>순번</th>
              <th>SKU 코드</th>
              <th>상품명</th>
              <th style="text-align:right">입고수</th>
              <th style="text-align:right">양품</th>
              <th style="text-align:right">불량</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => html`
              <tr>
                <td>${item.rwa_seq || idx + 1}</td>
                <td>${item.sku_cd || '-'}</td>
                <td>${item.sku_nm || '-'}</td>
                <td class="number">${item.rwa_qty || 0}</td>
                <td class="number">${item.good_qty || 0}</td>
                <td class="number">${item.defect_qty || 0}</td>
                <td>
                  <span class="item-status-badge ${item.status || 'RECEIVING'}">
                    ${this._itemStatusLabel(item.status)}
                  </span>
                </td>
                <td>
                  <button
                    class="item-action-btn"
                    ?disabled="${(item.good_qty || 0) > 0 || (item.defect_qty || 0) > 0}"
                    @click="${() => this._inspectItem(order, item)}"
                  >검수</button>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `
  }

  _renderEmptyState() {
    return html`
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <span class="empty-message">검수 대기 중인 반품이 없습니다</span>
        <span class="empty-sub">입고 완료된 반품 주문이 이곳에 표시됩니다</span>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  get _filteredOrders() {
    if (this.statusFilter === 'ALL') return this.orders
    return this.orders.filter(o => o.status === this.statusFilter)
  }

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._refresh()
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  async _refresh() {
    try {
      this.loading = this.orders.length === 0

      // RECEIVING + INSPECTING + INSPECTED 상태 주문 병렬 조회
      const [receivingOrders, inspectingOrders, inspectedOrders] = await Promise.all([
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=RECEIVING').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=INSPECTING').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=INSPECTED').catch(() => [])
      ])
      this.orders = [...(receivingOrders || []), ...(inspectingOrders || []), ...(inspectedOrders || [])]

      // 모든 주문의 항목 일괄 조회
      await this._fetchAllItems(this.orders)

      this.loading = false
    } catch (err) {
      console.error('반품 검수 데이터 조회 실패:', err)
      this.loading = false
    }
  }

  async _fetchAllItems(orders) {
    try {
      const results = await Promise.all(
        orders.map(o =>
          ServiceUtil.restGet(`rwa_trx/rwa_orders/${o.id}/items`).catch(() => [])
        )
      )

      const updated = { ...this.itemsMap }
      orders.forEach((order, i) => {
        updated[order.id] = results[i] || []
      })
      this.itemsMap = updated
    } catch (err) {
      console.error('반품 항목 조회 실패:', err)
    }
  }

  async _fetchItems(orderId) {
    try {
      const items = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${orderId}/items`)
      this.itemsMap = { ...this.itemsMap, [orderId]: items || [] }
    } catch (err) {
      console.error('반품 항목 조회 실패:', err)
    }
  }

  /* ============================================================
   * 검수 처리
   * ============================================================ */

  async _startInspection(order) {
    UiUtil.pageNavigate('rwa-inspection-work')
  }

  async _inspectItem(order, item) {
    UiUtil.showToast('info', '개별 항목 검수 기능은 추후 구현 예정입니다')
    // TODO: 검수 팝업 또는 검수 작업 화면으로 이동
  }

  /* ============================================================
   * 액션 핸들러
   * ============================================================ */

  _toggleExpand(order) {
    if (this.expandedOrderId === order.id) {
      this.expandedOrderId = null
    } else {
      this.expandedOrderId = order.id
    }
  }

  _viewDetail(order) {
    const element = document.createElement('rwa-order-detail')
    element.rwaOrderId = order.id
    element.addEventListener('order-updated', () => {
      this._refresh()
    })

    UiUtil.openPopupByElement(
      `${order.rwa_no} 상세`,
      'large',
      element,
      true
    )
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _calculateWaitTime(order) {
    if (!order.rwa_req_date) {
      return { display: '-', isWarning: false }
    }

    const waitMs = Date.now() - new Date(order.rwa_req_date).getTime()
    const waitHours = Math.floor(waitMs / (1000 * 60 * 60))
    const waitDays = Math.floor(waitHours / 24)

    const display = waitDays > 0 ? `${waitDays}d` : `${waitHours}h`
    const isWarning = waitHours >= 24

    return { display, isWarning }
  }

  _rwaTypeLabel(type) {
    const map = {
      CUSTOMER_RETURN: '고객 반품',
      VENDOR_RETURN: '공급사 반품',
      DEFECT_RETURN: '불량품',
      STOCK_ADJUST: '재고 조정',
      EXPIRED_RETURN: '유통기한'
    }
    return map[type] || type || '-'
  }

  _statusLabel(status) {
    const map = {
      RECEIVING: '입고완료',
      INSPECTING: '검수중',
      INSPECTED: '검수완료'
    }
    return map[status] || status || '-'
  }

  _itemStatusLabel(status) {
    const map = {
      REQUEST: '요청',
      APPROVED: '승인',
      RECEIVING: '입고중',
      INSPECTING: '검수중',
      INSPECTED: '검수완료',
      DISPOSED: '처분완료',
      COMPLETED: '완료'
    }
    return map[status] || status || '대기'
  }
}

window.customElements.define('rwa-inspection-list', RwaInspectionList)
