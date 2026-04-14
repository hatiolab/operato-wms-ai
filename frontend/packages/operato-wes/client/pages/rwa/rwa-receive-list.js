import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxPrompt } from '@operato/popup/ox-prompt.js'

/**
 * 반품 입고 목록 화면
 *
 * 기능:
 * - APPROVED/RECEIVING 상태 반품 주문의 입고 관리
 * - 주문별 반품 항목(rwa_order_items) 확장/축소 표시
 * - 개별 항목 입고 (수량 + 로케이션 입력)
 * - 전체 항목 일괄 입고 시작
 * - 입고 진행률 시각화
 */
class RwaReceiveList extends localize(i18next)(PageView) {
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

        .filter-chip.approved {
          background: #E3F2FD;
          color: #1565C0;
        }

        .filter-chip.receiving {
          background: #E0F7FA;
          color: #00838F;
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

        .order-card.APPROVED {
          border-left: 4px solid #2196F3;
        }

        .order-card.RECEIVING {
          border-left: 4px solid #00BCD4;
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

        .card-status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .card-status-badge.APPROVED {
          background: #E3F2FD;
          color: #1565C0;
        }

        .card-status-badge.RECEIVING {
          background: #E0F7FA;
          color: #00838F;
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
          background: linear-gradient(90deg, #00BCD4, #00ACC1);
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

        .item-status-badge.APPROVED {
          background: #E3F2FD;
          color: #1565C0;
        }

        .item-status-badge.RECEIVING {
          background: #E0F7FA;
          color: #00838F;
        }

        .item-status-badge.COMPLETED {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .item-action-btn {
          padding: 4px 10px;
          border: 1px solid #80DEEA;
          border-radius: 4px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          color: #00838F;
        }

        .item-action-btn:hover {
          background: #E0F7FA;
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
      title: TermsUtil.tMenu('RwaReceiveList')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      <div class="page-header">
        <h2>반품 입고 관리</h2>
        <button class="btn-icon" @click="${this._refresh}">🔍 새로고침</button>
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
    const approved = this.orders.filter(o => o.status === 'APPROVED').length
    const receiving = this.orders.filter(o => o.status === 'RECEIVING').length

    return html`
      <div class="filter-bar">
        <div
          class="filter-chip all ${this.statusFilter === 'ALL' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'ALL' }}"
        >
          전체 <span class="chip-count">${all}</span>
        </div>
        <div
          class="filter-chip approved ${this.statusFilter === 'APPROVED' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'APPROVED' }}"
        >
          승인 <span class="chip-count">${approved}</span>
        </div>
        <div
          class="filter-chip receiving ${this.statusFilter === 'RECEIVING' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'RECEIVING' }}"
        >
          입고중 <span class="chip-count">${receiving}</span>
        </div>
      </div>
    `
  }

  _renderOrderCard(order) {
    const isExpanded = this.expandedOrderId === order.id
    const items = this.itemsMap[order.id] || []
    const totalItems = items.length
    const receivedCount = items.filter(i => (i.rwa_qty || 0) > 0).length
    const totalReqQty = items.reduce((s, i) => s + (i.rwa_req_qty || 0), 0)
    const totalRwaQty = items.reduce((s, i) => s + (i.rwa_qty || 0), 0)
    const totalBoxQty = items.reduce((s, i) => s + (i.box_qty || 0), 0)
    const progressPct = totalItems > 0 ? Math.round((receivedCount / totalItems) * 100) : 0

    const canStartReceive = order.status === 'APPROVED'

    return html`
      <div class="order-card ${order.status}">
        <!-- 카드 헤더 -->
        <div class="card-header" @click="${() => this._toggleExpand(order)}">
          <div class="card-title-area">
            <span class="rwa-no">${order.rwa_no}</span>
            <span class="rwa-type-badge">${this._rwaTypeLabel(order.rwa_type)}</span>
            <span class="cust-info">${order.cust_nm || ''}${order.cust_cd ? ` (${order.cust_cd})` : ''}</span>
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
            요청: <span class="value">${totalReqQty} EA</span>
          </div>
          <div class="summary-item">
            입고: <span class="value ${totalRwaQty >= totalReqQty && totalReqQty > 0 ? 'ok' : 'warn'}">${totalRwaQty}/${totalReqQty} EA</span>
          </div>
          ${totalBoxQty > 0 ? html`
            <div class="summary-item">
              박스: <span class="value">${totalBoxQty}</span>
            </div>
          ` : ''}
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
            ?disabled="${!canStartReceive}"
            @click="${e => { e.stopPropagation(); this._startReceive(order) }}"
          >입고 시작</button>
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
              <th style="text-align:right">요청수량</th>
              <th style="text-align:right">입고수량</th>
              <th>로케이션</th>
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
                <td class="number">${item.rwa_req_qty || 0}</td>
                <td class="number">${item.rwa_qty || 0}</td>
                <td>${item.loc_cd || item.temp_loc_cd || '-'}</td>
                <td>
                  <span class="item-status-badge ${item.status || 'APPROVED'}">
                    ${this._itemStatusLabel(item.status)}
                  </span>
                </td>
                <td>
                  <button
                    class="item-action-btn"
                    ?disabled="${(item.rwa_qty || 0) >= (item.rwa_req_qty || 0) && (item.rwa_req_qty || 0) > 0}"
                    @click="${() => this._receiveItem(order, item)}"
                  >입고</button>
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
        <span class="empty-icon">\u{1F4E5}</span>
        <span class="empty-message">입고 대기 중인 반품이 없습니다</span>
        <span class="empty-sub">승인 완료된 반품 주문이 이곳에 표시됩니다</span>
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

      // APPROVED + RECEIVING 상태 주문 병렬 조회
      const [approvedOrders, receivingOrders] = await Promise.all([
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=APPROVED').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=RECEIVING').catch(() => [])
      ])
      this.orders = [...(approvedOrders || []), ...(receivingOrders || [])]

      // 모든 주문의 항목 일괄 조회
      await this._fetchAllItems(this.orders)

      this.loading = false
    } catch (err) {
      console.error('반품 입고 데이터 조회 실패:', err)
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
   * 입고 처리
   * ============================================================ */

  async _startReceive(order) {
    const items = this.itemsMap[order.id] || []
    const pendingItems = items.filter(i => !(i.rwa_qty > 0))

    if (pendingItems.length === 0) {
      UiUtil.showToast('info', '입고할 항목이 없습니다')
      return
    }

    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${order.rwa_no}의 전체 항목(${pendingItems.length}건)을 입고 처리하시겠습니까?\n각 항목의 요청수량으로 입고됩니다.`,
      'question',
      'confirm',
      'cancel'
    )

    if (!result.confirmButton) return

    try {
      for (const item of pendingItems) {
        await ServiceUtil.restPost(
          `rwa_trx/rwa_orders/${order.id}/items/${item.id}/receive`,
          {
            rwaQty: item.rwa_req_qty,
            locCd: item.temp_loc_cd || item.loc_cd || ''
          }
        )
      }

      UiUtil.showToast('success', `${order.rwa_no} 입고 완료 (${pendingItems.length}건)`)
      await this._refresh()
    } catch (err) {
      UiUtil.showToast('error', err.message || '입고 처리 실패')
    }
  }

  async _receiveItem(order, item) {
    const result = await OxPrompt.open({
      title: `${item.sku_cd} 입고`,
      text: `요청수량: ${item.rwa_req_qty}\n입고수량과 로케이션을 입력하세요.`,
      type: 'prompt',
      fields: [
        { name: 'rwaQty', label: '입고수량', type: 'number', value: String(item.rwa_req_qty || 0) },
        { name: 'locCd', label: '로케이션', type: 'text', value: item.temp_loc_cd || item.loc_cd || '' }
      ],
      confirmButton: { text: '입고' },
      cancelButton: { text: '취소' }
    })

    if (!result.confirmButton) return

    try {
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${order.id}/items/${item.id}/receive`,
        {
          rwaQty: Number(result.fields?.rwaQty || item.rwa_req_qty),
          locCd: result.fields?.locCd || ''
        }
      )

      UiUtil.showToast('success', `${item.sku_cd} 입고 완료`)
      await this._fetchItems(order.id)
      await this._refresh()
    } catch (err) {
      UiUtil.showToast('error', err.message || '입고 처리 실패')
    }
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
      APPROVED: '승인',
      RECEIVING: '입고중'
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

window.customElements.define('rwa-receive-list', RwaReceiveList)
