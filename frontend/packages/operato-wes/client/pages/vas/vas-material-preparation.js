import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxPrompt } from '@operato/popup/ox-prompt.js'

/**
 * VAS 자재 준비 관리 화면
 *
 * 기능:
 * - APPROVED/MATERIAL_READY 상태 주문의 자재 준비 현황
 * - 주문별 자재 항목(vas_order_items) 확장/축소 표시
 * - 개별/전체 자재 할당 (allocate)
 * - 개별/전체 자재 피킹 (pick)
 * - 모든 자재 피킹 완료 시 자동 MATERIAL_READY 전환
 */
class VasMaterialPreparation extends localize(i18next)(PageView) {
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

        .filter-chip.material-ready {
          background: #E8F5E9;
          color: #2E7D32;
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

        .order-card.MATERIAL_READY {
          border-left: 4px solid #4CAF50;
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

        .vas-no {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .vas-type-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          background: #E3F2FD;
          color: #1565C0;
        }

        .set-sku {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .plan-qty {
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

        .card-status-badge.APPROVED {
          background: #E3F2FD;
          color: #1565C0;
        }

        .card-status-badge.MATERIAL_READY {
          background: #E8F5E9;
          color: #2E7D32;
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

        /* 진행 바 (자재 준비 진행률) */
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
          background: linear-gradient(90deg, #2196F3, #1976D2);
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

        .card-action-btn.success {
          background: #4CAF50;
          color: #fff;
          border-color: transparent;
        }

        .card-action-btn.success:hover {
          background: #388E3C;
        }

        .card-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* 확장 영역: 자재 테이블 */
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

        .item-status-badge.PLANNED {
          background: #F5F5F5;
          color: #757575;
        }

        .item-status-badge.ALLOCATED {
          background: #E3F2FD;
          color: #1565C0;
        }

        .item-status-badge.PICKING {
          background: #FFF3E0;
          color: #E65100;
        }

        .item-status-badge.PICKED {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .item-action-btn {
          padding: 4px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 4px;
        }

        .item-action-btn:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .item-action-btn.allocate {
          color: #1565C0;
          border-color: #90CAF9;
        }

        .item-action-btn.allocate:hover {
          background: #E3F2FD;
        }

        .item-action-btn.pick {
          color: #2E7D32;
          border-color: #A5D6A7;
        }

        .item-action-btn.pick:hover {
          background: #E8F5E9;
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
      bomMap: Object,
      itemsMap: Object,
      expandedOrderId: String,
      statusFilter: String
    }
  }

  constructor() {
    super()
    this.loading = true
    this.orders = []
    this.bomMap = {}
    this.itemsMap = {}
    this.expandedOrderId = null
    this.statusFilter = 'ALL'
  }

  get context() {
    return {
      title: '유통 가공 자재 준비 관리'
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      <div class="page-header">
        <h2>유통 가공 자재 준비 관리</h2>
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
    const approved = this.orders.filter(o => o.status === 'APPROVED').length
    const materialReady = this.orders.filter(o => o.status === 'MATERIAL_READY').length

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
          주문 확정 <span class="chip-count">${approved}</span>
        </div>
        <div
          class="filter-chip material-ready ${this.statusFilter === 'MATERIAL_READY' ? 'active' : ''}"
          @click="${() => { this.statusFilter = 'MATERIAL_READY' }}"
        >
          자재 준비 완료 <span class="chip-count">${materialReady}</span>
        </div>
      </div>
    `
  }

  _renderOrderCard(order) {
    const isExpanded = this.expandedOrderId === order.id
    const items = this.itemsMap[order.id] || []
    const totalItems = items.length
    const allocatedCount = items.filter(i => i.alloc_qty > 0).length
    const pickedCount = items.filter(i => i.picked_qty > 0).length
    const progressPct = totalItems > 0 ? Math.round((pickedCount / totalItems) * 100) : 0
    const bom = this.bomMap[order.vas_bom_id]

    const canAllocate = order.status === 'APPROVED' && items.some(i => !i.alloc_qty || i.alloc_qty === 0)
    const canPick = items.some(i => i.alloc_qty > 0 && (!i.picked_qty || i.picked_qty === 0))

    return html`
      <div class="order-card ${order.status}">
        <!-- 카드 헤더 (클릭으로 확장/축소) -->
        <div class="card-header" @click="${() => this._toggleExpand(order)}">
          <div class="card-title-area">
            <span class="vas-no">${order.vas_no}</span>
            <span class="vas-type-badge">${this._vasTypeLabel(order.vas_type)}</span>
            <span class="set-sku">${bom?.set_sku_cd || ''} / ${bom?.set_sku_nm || ''}</span>
            <span class="plan-qty">(${order.plan_qty || 0} EA)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="card-status-badge ${order.status}">${this._statusLabel(order.status)}</span>
            <span class="toggle-icon ${isExpanded ? 'expanded' : ''}">▼</span>
          </div>
        </div>

        <!-- 자재 준비 요약 -->
        <div class="card-summary">
          <div class="summary-item">
            자재: <span class="value">${totalItems}건</span>
          </div>
          <div class="summary-item">
            할당: <span class="value ${allocatedCount === totalItems && totalItems > 0 ? 'ok' : 'warn'}">${allocatedCount}/${totalItems}</span>
          </div>
          <div class="summary-item">
            피킹: <span class="value ${pickedCount === totalItems && totalItems > 0 ? 'ok' : 'warn'}">${pickedCount}/${totalItems}</span>
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
            ?disabled="${!canAllocate}"
            @click="${e => { e.stopPropagation(); this._allocateAll(order) }}"
          >전체 할당</button>
          <button
            class="card-action-btn success"
            ?disabled="${!canPick}"
            @click="${e => { e.stopPropagation(); this._pickAll(order) }}"
          >전체 피킹</button>
          <button
            class="card-action-btn"
            @click="${e => { e.stopPropagation(); this._viewDetail(order) }}"
          >상세 보기</button>
        </div>

        <!-- 확장: 자재 테이블 -->
        ${isExpanded ? this._renderItemsSection(order, items) : ''}
      </div>
    `
  }

  _renderItemsSection(order, items) {
    if (!items || items.length === 0) {
      return html`
        <div class="items-section">
          <div style="text-align: center; padding: 20px; color: #999; font-size: 13px;">
            자재 항목이 없습니다
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
              <th>자재명</th>
              <th style="text-align:right">필요수량</th>
              <th style="text-align:right">할당수량</th>
              <th style="text-align:right">피킹수량</th>
              <th>소스 로케이션</th>
              <th>LOT</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => html`
              <tr>
                <td>${idx + 1}</td>
                <td>${item.sku_cd || '-'}</td>
                <td>${item.sku_nm || '-'}</td>
                <td class="number">${item.req_qty || 0}</td>
                <td class="number">${item.alloc_qty || 0}</td>
                <td class="number">${item.picked_qty || 0}</td>
                <td>${item.src_loc_cd || '-'}</td>
                <td>${item.lot_no || '-'}</td>
                <td>
                  <span class="item-status-badge ${item.status || 'PLANNED'}">
                    ${this._itemStatusLabel(item.status)}
                  </span>
                </td>
                <td>
                  <button
                    class="item-action-btn allocate"
                    ?disabled="${item.status !== 'PLANNED'}"
                    @click="${() => this._allocateItem(order, item)}"
                  >할당</button>
                  <button
                    class="item-action-btn pick"
                    ?disabled="${item.status !== 'ALLOCATED'}"
                    @click="${() => this._pickItem(order, item)}"
                  >피킹</button>
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
        <span class="empty-icon">\u{1F4E6}</span>
        <span class="empty-message">자재 준비 대기 중인 주문이 없습니다</span>
        <span class="empty-sub">승인 완료된 VAS 주문이 이곳에 표시됩니다</span>
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

      // APPROVED, MATERIAL_READY 상태 주문 조회
      const data = await ServiceUtil.restGet('vas_trx/monitor/orders')
      this.orders = (data || []).filter(o =>
        o.status === 'APPROVED' || o.status === 'MATERIAL_READY'
      )

      // BOM 정보 일괄 조회
      await this._fetchBomMap(this.orders)

      // 모든 주문의 자재 항목 일괄 조회
      await this._fetchAllItems(this.orders)

      this.loading = false
    } catch (err) {
      console.error('자재 준비 데이터 조회 실패:', err)
      this.loading = false
    }
  }

  async _fetchBomMap(orders) {
    const bomIds = [...new Set(orders.map(o => o.vas_bom_id).filter(Boolean))]
    const newBomIds = bomIds.filter(id => !this.bomMap[id])

    if (newBomIds.length === 0) return

    try {
      const results = await Promise.all(
        newBomIds.map(id => ServiceUtil.restGet(`vas_boms/${id}`).catch(() => null))
      )

      const updated = { ...this.bomMap }
      results.forEach((bom, i) => {
        if (bom) updated[newBomIds[i]] = bom
      })
      this.bomMap = updated
    } catch (err) {
      console.error('BOM 조회 실패:', err)
    }
  }

  async _fetchAllItems(orders) {
    try {
      const results = await Promise.all(
        orders.map(o =>
          ServiceUtil.restGet(`vas_orders/${o.id}/items`).catch(() => [])
        )
      )

      const updated = { ...this.itemsMap }
      orders.forEach((order, i) => {
        updated[order.id] = results[i] || []
      })
      this.itemsMap = updated
    } catch (err) {
      console.error('자재 항목 조회 실패:', err)
    }
  }

  async _fetchItems(orderId) {
    try {
      const items = await ServiceUtil.restGet(`vas_orders/${orderId}/items`)
      this.itemsMap = { ...this.itemsMap, [orderId]: items || [] }
    } catch (err) {
      console.error('자재 항목 조회 실패:', err)
    }
  }

  /* ============================================================
   * 자재 할당
   * ============================================================ */

  async _allocateItem(order, item) {
    const result = await OxPrompt.open({
      title: `${item.sku_cd} 자재 할당`,
      text: `필요수량: ${item.req_qty}\n할당수량, 소스 로케이션, LOT을 입력하세요.`,
      type: 'prompt',
      fields: [
        { name: 'allocQty', label: '할당수량', type: 'number', value: String(item.req_qty || 0) },
        { name: 'srcLocCd', label: '소스 로케이션', type: 'text', value: item.src_loc_cd || '' },
        { name: 'lotNo', label: 'LOT 번호', type: 'text', value: item.lot_no || '' }
      ],
      confirmButton: { text: '할당' },
      cancelButton: { text: '취소' }
    })

    if (!result.confirmButton) return

    try {
      await ServiceUtil.restPost(`vas_trx/vas_order_items/${item.id}/allocate`, {
        allocQty: Number(result.fields?.allocQty || item.req_qty),
        srcLocCd: result.fields?.srcLocCd || '',
        lotNo: result.fields?.lotNo || ''
      })

      UiUtil.showToast('success', `${item.sku_cd} 할당 완료`)
      await this._fetchItems(order.id)
    } catch (err) {
      UiUtil.showToast('error', err.message || '자재 할당 실패')
    }
  }

  async _allocateAll(order) {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${order.vas_no}의 모든 자재를 필요수량으로 일괄 할당하시겠습니까?`,
      'question',
      'confirm',
      'cancel'
    )

    if (!result.confirmButton) return

    try {
      const items = this.itemsMap[order.id] || []
      const allocItems = items
        .filter(i => !i.alloc_qty || i.alloc_qty === 0)
        .map(i => ({
          itemId: i.id,
          allocQty: i.req_qty,
          srcLocCd: i.src_loc_cd || '',
          lotNo: i.lot_no || ''
        }))

      if (allocItems.length === 0) {
        UiUtil.showToast('info', '할당할 자재가 없습니다')
        return
      }

      await ServiceUtil.restPost(`vas_trx/vas_orders/${order.id}/allocate_all`, allocItems)

      UiUtil.showToast('success', `${order.vas_no} 전체 할당 완료 (${allocItems.length}건)`)
      await this._fetchItems(order.id)
    } catch (err) {
      UiUtil.showToast('error', err.message || '전체 할당 실패')
    }
  }

  /* ============================================================
   * 자재 피킹
   * ============================================================ */

  async _pickItem(order, item) {
    const result = await OxPrompt.open({
      title: `${item.sku_cd} 피킹`,
      text: `할당수량: ${item.alloc_qty}\n피킹수량을 입력하세요.`,
      type: 'prompt',
      fields: [
        { name: 'pickedQty', label: '피킹수량', type: 'number', value: String(item.alloc_qty || 0) }
      ],
      confirmButton: { text: '피킹' },
      cancelButton: { text: '취소' }
    })

    if (!result.confirmButton) return

    try {
      await ServiceUtil.restPost(`vas_trx/vas_order_items/${item.id}/pick`, {
        pickedQty: Number(result.fields?.pickedQty || item.alloc_qty)
      })

      UiUtil.showToast('success', `${item.sku_cd} 피킹 완료`)
      await this._fetchItems(order.id)
      // 모든 자재 피킹 완료 시 주문 상태가 자동 전환될 수 있으므로 주문 목록도 갱신
      await this._refresh()
    } catch (err) {
      UiUtil.showToast('error', err.message || '자재 피킹 실패')
    }
  }

  async _pickAll(order) {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${order.vas_no}의 모든 할당 자재를 일괄 피킹하시겠습니까?`,
      'question',
      'confirm',
      'cancel'
    )

    if (!result.confirmButton) return

    try {
      const items = this.itemsMap[order.id] || []
      const pickItems = items
        .filter(i => i.alloc_qty > 0 && (!i.picked_qty || i.picked_qty === 0))
        .map(i => ({
          itemId: i.id,
          pickedQty: i.alloc_qty
        }))

      if (pickItems.length === 0) {
        UiUtil.showToast('info', '피킹할 자재가 없습니다')
        return
      }

      await ServiceUtil.restPost(`vas_trx/vas_orders/${order.id}/pick_all`, pickItems)

      UiUtil.showToast('success', `${order.vas_no} 전체 피킹 완료 (${pickItems.length}건)`)
      // 주문 상태가 MATERIAL_READY로 자동 전환될 수 있으므로 전체 갱신
      await this._refresh()
    } catch (err) {
      UiUtil.showToast('error', err.message || '전체 피킹 실패')
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

  _statusLabel(status) {
    const map = {
      APPROVED: '승인 완료',
      MATERIAL_READY: '자재 준비 완료'
    }
    return map[status] || status || '-'
  }

  _itemStatusLabel(status) {
    const map = {
      PLANNED: '대기',
      ALLOCATED: '할당됨',
      PICKING: '피킹중',
      PICKED: '피킹완료',
      IN_USE: '사용중',
      COMPLETED: '완료'
    }
    return map[status] || status || '대기'
  }
}

window.customElements.define('vas-material-preparation', VasMaterialPreparation)
