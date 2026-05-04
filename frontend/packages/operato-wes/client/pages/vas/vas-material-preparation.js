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

        /* 날짜 네비게이터 */
        .date-nav {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .date-nav-btn {
          background: none;
          border: none;
          padding: 6px 10px;
          font-size: 18px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant, #555);
          cursor: pointer;
          transition: color 0.15s;
          line-height: 1;
        }

        .date-nav-btn:hover {
          color: var(--md-sys-color-primary, #1976D2);
        }

        .date-nav input[type="date"] {
          border: 1px solid var(--md-sys-color-outline-variant, #ddd);
          border-radius: 10px;
          padding: 9px 16px;
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #222);
          background: var(--md-sys-color-surface, #fff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          cursor: pointer;
          outline: none;
        }

        .date-nav input[type="date"]:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
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
          table-layout: fixed;
        }

        /* 순번 4% | SKU 10% | 자재명 20% | 필요/할당/피킹 6%×3 | 로케이션 10% | LOT 8% | 상태 8% | 액션 16% */
        .items-table colgroup col:nth-child(1)  { width: 4%; }
        .items-table colgroup col:nth-child(2)  { width: 10%; }
        .items-table colgroup col:nth-child(3)  { width: 20%; }
        .items-table colgroup col:nth-child(4)  { width: 6%; }
        .items-table colgroup col:nth-child(5)  { width: 6%; }
        .items-table colgroup col:nth-child(6)  { width: 6%; }
        .items-table colgroup col:nth-child(7)  { width: 10%; }
        .items-table colgroup col:nth-child(8)  { width: 8%; }
        .items-table colgroup col:nth-child(9)  { width: 8%; }
        .items-table colgroup col:nth-child(10) { width: 22%; }

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

        /* 할당 토글 버튼 */
        .alloc-toggle-btn {
          padding: 3px 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        .alloc-toggle-btn:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .alloc-toggle-btn.active {
          background: #E8EAF6;
          color: #3949AB;
          border-color: #9FA8DA;
        }

        /* 할당 서브 테이블 행 */
        .alloc-sub-row td {
          padding: 0;
          background: #F3F4FD;
          border-bottom: 2px solid #9FA8DA;
        }

        .alloc-sub-table-wrap {
          padding: 10px 16px;
        }

        .alloc-sub-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          table-layout: fixed;
        }

        .alloc-sub-table colgroup col:nth-child(1) { width: 30%; }
        .alloc-sub-table colgroup col:nth-child(2) { width: 20%; }
        .alloc-sub-table colgroup col:nth-child(3) { width: 15%; }
        .alloc-sub-table colgroup col:nth-child(4) { width: 15%; }
        .alloc-sub-table colgroup col:nth-child(5) { width: 20%; }

        .alloc-sub-table th {
          background: #E8EAF6;
          color: #3949AB;
          font-weight: 600;
          padding: 6px 10px;
          text-align: left;
          border-bottom: 1px solid #9FA8DA;
        }

        .alloc-sub-table th.center,
        .alloc-sub-table td.center {
          text-align: center;
        }

        .alloc-sub-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #C5CAE9;
          color: var(--md-sys-color-on-surface-variant, #555);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .alloc-sub-table tbody tr:last-child td {
          border-bottom: none;
        }

        .alloc-loading {
          padding: 8px 16px;
          font-size: 12px;
          color: #999;
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
      statusFilter: String,
      allocationsMap: Object,
      expandedItemIds: Object,
      targetDate: String
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
    this.allocationsMap = {}
    this.expandedItemIds = {}
    this.targetDate = this._todayStr()
  }

  /** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
  _todayStr() {
    return new Date().toISOString().slice(0, 10)
  }

  get context() {
    return {
      title: TermsUtil.tMenu('VasMaterialPreparation')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      <div class="page-header">
        <h2>유통 가공 자재 준비 관리</h2>
        <button class="btn-icon" @click="${this._refresh}">🔍 새로고침</button>
      </div>

      ${this._renderDateNav()}
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

  /** 날짜 네비게이터 렌더링 — 이전/다음 버튼 + 날짜 입력 + 오늘 버튼 */
  /** 날짜 네비게이터 렌더링 */
  _renderDateNav() {
    return html`
      <div class="date-nav">
        <button class="date-nav-btn" @click="${this._prevDay}" title="이전 날짜">‹</button>
        <input
          type="date"
          .value="${this.targetDate}"
          @change="${e => this._changeDate(e.target.value)}"
        />
        <button class="date-nav-btn" @click="${this._nextDay}" title="다음 날짜">›</button>
      </div>
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
          <colgroup>
            <col /><col /><col /><col /><col />
            <col /><col /><col /><col /><col />
          </colgroup>
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
                    ?disabled="${item.status !== 'PLANNED' && item.status !== 'ALLOCATED'}"
                    @click="${() => this._allocateItem(order, item)}"
                  >할당</button>
                  <button
                    class="item-action-btn pick"
                    ?disabled="${item.status !== 'ALLOCATED'}"
                    @click="${() => this._pickItem(order, item)}"
                  >피킹</button>
                  ${item.alloc_qty > 0 ? html`
                    <button
                      class="alloc-toggle-btn ${this.expandedItemIds[item.id] ? 'active' : ''}"
                      @click="${() => this._toggleItemAllocations(item)}"
                    >${this.expandedItemIds[item.id] ? '▲ 할당상세' : '▼ 할당상세'}</button>
                  ` : ''}
                </td>
              </tr>
              ${this.expandedItemIds[item.id] ? html`
                <tr class="alloc-sub-row">
                  <td colspan="10">${this._renderAllocSubTable(item)}</td>
                </tr>
              ` : ''}
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

  /** 날짜 변경 후 목록 재조회 */
  _changeDate(dateStr) {
    this.targetDate = dateStr
    this._refresh()
  }

  /** 하루 전으로 이동 */
  _prevDay() {
    const d = new Date(this.targetDate)
    d.setDate(d.getDate() - 1)
    this._changeDate(d.toISOString().slice(0, 10))
  }

  /** 하루 후로 이동 */
  _nextDay() {
    const d = new Date(this.targetDate)
    d.setDate(d.getDate() + 1)
    this._changeDate(d.toISOString().slice(0, 10))
  }


  async _refresh() {
    try {
      this.loading = this.orders.length === 0

      // APPROVED, MATERIAL_READY 상태 주문 조회 (선택한 날짜 기준)
      const data = await ServiceUtil.restGet('vas_trx/monitor/orders', {
        targetDate: this.targetDate
      })
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

    // 서버 시작 직후 elidom ORM 메타데이터 초기화 경쟁을 피하기 위해 순차 조회
    const updated = { ...this.bomMap }
    for (const id of newBomIds) {
      try {
        const bom = await ServiceUtil.restGet(`vas_boms/${id}`)
        if (bom) updated[id] = bom
      } catch (err) {
        // 첫 요청 실패 시 1회 재시도 (cold-start 대응)
        try {
          const bom = await ServiceUtil.restGet(`vas_boms/${id}`)
          if (bom) updated[id] = bom
        } catch (retryErr) {
          console.warn('BOM 조회 실패 (재시도 포함):', id, retryErr)
        }
      }
    }
    this.bomMap = updated
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

  async _fetchItemAllocations(itemId) {
    try {
      const allocs = await ServiceUtil.restGet(`vas_trx/vas_order_items/${itemId}/allocations`)
      this.allocationsMap = { ...this.allocationsMap, [itemId]: allocs || [] }
    } catch (err) {
      console.error('재고 할당 조회 실패:', err)
      this.allocationsMap = { ...this.allocationsMap, [itemId]: [] }
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

    if (!result) return

    try {
      const items = this.itemsMap[order.id] || []
      const allocItems = items
        .filter(i => !i.alloc_qty || i.alloc_qty === 0)
        .map(i => ({
          itemId: i.id,
          allocQty: i.req_qty,
          srcLocCd: '',
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

  async _toggleItemAllocations(item) {
    const isOpen = this.expandedItemIds[item.id]
    this.expandedItemIds = { ...this.expandedItemIds, [item.id]: !isOpen }

    if (!isOpen && !this.allocationsMap[item.id]) {
      await this._fetchItemAllocations(item.id)
    }
  }

  _renderAllocSubTable(item) {
    if (!(item.id in this.allocationsMap)) {
      return html`<div class="alloc-loading">로딩 중...</div>`
    }

    const allocs = this.allocationsMap[item.id]
    if (!allocs || allocs.length === 0) {
      return html`<div class="alloc-loading">할당 내역이 없습니다.</div>`
    }

    return html`
      <div class="alloc-sub-table-wrap">
        <table class="alloc-sub-table">
          <colgroup>
            <col /><col /><col /><col /><col />
          </colgroup>
          <thead>
            <tr>
              <th>바코드</th>
              <th>로케이션</th>
              <th class="center">할당수량</th>
              <th class="center">LOT</th>
              <th>유통기한</th>
            </tr>
          </thead>
          <tbody>
            ${allocs.map(a => html`
              <tr>
                <td>${a.barcode || '-'}</td>
                <td>${a.loc_cd || '-'}</td>
                <td class="center">${a.alloc_qty || 0}</td>
                <td class="center">${a.lot_no || '-'}</td>
                <td>${a.expired_date || '-'}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `
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
