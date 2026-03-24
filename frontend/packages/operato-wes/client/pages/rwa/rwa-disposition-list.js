import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 반품 처분 대기 목록 화면
 *
 * 기능:
 * - INSPECTED/DISPOSED 상태 반품 주문의 처분 관리
 * - 주문별 검수 결과 (양품/불량) 표시
 * - 처분 유형별, 불량 유형별 필터링
 * - 처분 대기 시간 모니터링
 * - 처분 결정 작업 화면 연동
 */
class RwaDispositionList extends localize(i18next)(PageView) {
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

        /* 검색 바 */
        .search-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          align-items: center;
        }

        .search-input {
          flex: 1;
          max-width: 400px;
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 14px;
        }

        /* 필터 칩 */
        .filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
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

        .filter-chip.inspected {
          background: #fff9c4;
          color: #827717;
        }

        .filter-chip.disposed {
          background: #e1bee7;
          color: #6a1b9a;
        }

        .filter-chip.completed {
          background: #c8e6c9;
          color: #2e7d32;
        }

        .filter-chip.active {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .chip-count {
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

        .order-card.INSPECTED {
          border-left: 4px solid #cddc39;
        }

        .order-card.DISPOSED {
          border-left: 4px solid #9c27b0;
        }

        .order-card.COMPLETED {
          border-left: 4px solid #4caf50;
        }

        /* 카드 헤더 */
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
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

        .card-status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .card-status-badge.INSPECTED {
          background: #fff9c4;
          color: #827717;
        }

        .card-status-badge.DISPOSED {
          background: #e1bee7;
          color: #6a1b9a;
        }

        .card-status-badge.COMPLETED {
          background: #c8e6c9;
          color: #2e7d32;
        }

        /* 카드 요약 */
        .card-summary {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 20px 12px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
          flex-wrap: wrap;
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

        .summary-item .value.good {
          color: #4caf50;
        }

        .summary-item .value.defect {
          color: #f44336;
        }

        .summary-item .value.warn {
          color: #ff9800;
        }

        /* 검수 결과 섹션 */
        .inspection-results {
          padding: 0 20px 12px;
          font-size: 13px;
        }

        .inspection-results .section-title {
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .inspection-item {
          padding: 4px 0;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .inspection-item .sku-cd {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .defect-type-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          background: #ffebee;
          color: #c62828;
          margin-left: 4px;
        }

        /* 처분 결과 섹션 */
        .disposition-results {
          padding: 0 20px 12px;
          font-size: 13px;
        }

        .disposition-item {
          padding: 4px 0;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .disposition-type-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 4px;
        }

        .disposition-type-badge.RESTOCK {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .disposition-type-badge.SCRAP {
          background: #ffebee;
          color: #c62828;
        }

        .disposition-type-badge.REPAIR {
          background: #fff3e0;
          color: #e65100;
        }

        .disposition-type-badge.RETURN_VENDOR {
          background: #e3f2fd;
          color: #1565c0;
        }

        .disposition-type-badge.DONATION {
          background: #f3e5f5;
          color: #6a1b9a;
        }

        /* 진행 바 */
        .progress-bar-container {
          padding: 0 20px 12px;
        }

        .progress-bar-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 4px;
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
          background: linear-gradient(90deg, #9c27b0, #7b1fa2);
        }

        .progress-bar-fill.complete {
          background: linear-gradient(90deg, #4caf50, #388e3c);
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
          background: var(--md-sys-color-primary, #1976d2);
          color: #fff;
          border-color: transparent;
        }

        .card-action-btn.primary:hover {
          background: #1565c0;
        }

        .card-action-btn.complete {
          background: #4caf50;
          color: #fff;
          border-color: transparent;
        }

        .card-action-btn.complete:hover {
          background: #388e3c;
        }

        .card-action-btn.close-btn {
          background: #616161;
          color: #fff;
          border-color: transparent;
        }

        .card-action-btn.close-btn:hover {
          background: #424242;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .empty-state mwc-icon {
          font-size: 64px;
          opacity: 0.3;
          margin-bottom: 16px;
        }

        .empty-state-message {
          font-size: 16px;
          margin-bottom: 8px;
        }

        .empty-state-hint {
          font-size: 13px;
          opacity: 0.7;
        }

        /* 로딩 */
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      orders: Array,
      filterStatus: String,
      filterDispositionType: String,
      filterDefectType: String,
      searchKeyword: String,
      stats: Object
    }
  }

  constructor() {
    super()

    this.loading = false
    this.orders = []
    this.filterStatus = 'ALL'
    this.filterDispositionType = 'ALL'
    this.filterDefectType = 'ALL'
    this.searchKeyword = ''
    this.stats = { total: 0, inspected: 0, disposed: 0, completed: 0 }
  }

  get context() {
    return {
      title: TermsUtil.tMenu('RwaDispositionList')
    }
  }

  async pageUpdated() {
    if (this.active) {
      await this._refresh()
    }
  }

  async _refresh() {
    this.loading = true
    try {
      // INSPECTED + DISPOSED + COMPLETED 상태 주문 조회
      const [inspected, disposed, completed] = await Promise.all([
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=INSPECTED'),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=DISPOSED'),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=COMPLETED')
      ])

      // 각 주문별 항목 조회 (검수 결과 포함)
      const ordersWithItems = await Promise.all(
        [...(inspected || []), ...(disposed || []), ...(completed || [])].map(async order => {
          const items = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${order.id}/items`)
          return {
            ...order,
            items: items || [],
            _itemCount: items?.length || 0,
            _goodQty: items?.reduce((sum, item) => sum + (item.goodQty || 0), 0) || 0,
            _defectQty: items?.reduce((sum, item) => sum + (item.defectQty || 0), 0) || 0,
            _disposedCount: items?.filter(item => item.status === 'DISPOSED').length || 0,
            _pendingCount: items?.filter(item => item.status === 'INSPECTED').length || 0
          }
        })
      )

      this.orders = ordersWithItems
      this._updateStats()
    } catch (err) {
      UiUtil.showToast('error', err.message || '데이터 조회 실패')
    } finally {
      this.loading = false
    }
  }

  _updateStats() {
    this.stats = {
      total: this.orders.length,
      inspected: this.orders.filter(o => o.status === 'INSPECTED').length,
      disposed: this.orders.filter(o => o.status === 'DISPOSED').length,
      completed: this.orders.filter(o => o.status === 'COMPLETED').length
    }
  }

  get filteredOrders() {
    return this.orders.filter(order => {
      // 상태 필터
      if (this.filterStatus && this.filterStatus !== 'ALL' && order.status !== this.filterStatus) {
        return false
      }

      // 검색어 필터
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase()
        if (!order.rwaNo?.toLowerCase().includes(keyword) && !order.custNm?.toLowerCase().includes(keyword)) {
          return false
        }
      }

      // 처분 유형 필터 (항목별 처분 유형 확인)
      if (this.filterDispositionType && this.filterDispositionType !== 'ALL') {
        const hasMatchingDisposition = order.items?.some(item => item.dispositionType === this.filterDispositionType)
        if (!hasMatchingDisposition) {
          return false
        }
      }

      // 불량 유형 필터
      if (this.filterDefectType && this.filterDefectType !== 'ALL') {
        const hasMatchingDefect = order.items?.some(item => item.defectType === this.filterDefectType)
        if (!hasMatchingDefect) {
          return false
        }
      }

      return true
    })
  }

  _onSearch() {
    this.requestUpdate()
  }

  _onFilterChange(filterName, value) {
    this[filterName] = value
    this.requestUpdate()
  }

  async _startDisposition(order) {
    UiUtil.pageNavigate('rwa-disposition-work', { orderId: order.id })
  }

  async _openDetail(order) {
    const element = document.createElement('rwa-order-detail')
    element.rwaOrderId = order.id
    element.addEventListener('order-updated', () => {
      this._refresh()
    })
    UiUtil.openPopupByElement('반품 상세', 'large', element, true)
  }

  async _completeOrder(order) {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${order.rwaNo} 주문을 완료 처리하시겠습니까?\n재고 처리가 진행됩니다.`,
      'question',
      'confirm',
      'cancel'
    )

    if (result.confirmButton) {
      try {
        await ServiceUtil.restPost(`rwa_trx/rwa_orders/${order.id}/complete`)
        UiUtil.showToast('success', `${order.rwaNo} 완료 처리되었습니다`)
        await this._refresh()
      } catch (err) {
        console.error('주문 완료 실패:', err)
        UiUtil.showToast('error', err.message || '완료 처리 실패')
      }
    }
  }

  async _closeOrder(order) {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${order.rwaNo} 주문을 마감 처리하시겠습니까?\n마감 후에는 변경할 수 없습니다.`,
      'question',
      'confirm',
      'cancel'
    )

    if (result.confirmButton) {
      try {
        await ServiceUtil.restPost(`rwa_trx/rwa_orders/${order.id}/close`)
        UiUtil.showToast('success', `${order.rwaNo} 마감 처리되었습니다`)
        await this._refresh()
      } catch (err) {
        console.error('주문 마감 실패:', err)
        UiUtil.showToast('error', err.message || '마감 처리 실패')
      }
    }
  }

  _getWaitingTime(order) {
    if (order.status !== 'INSPECTED') {
      return '-'
    }

    // 가장 최근 검수 완료 시간 찾기
    const latestInspectedAt = order.items
      ?.map(item => item.inspectedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0]

    if (!latestInspectedAt) {
      return '-'
    }

    const diffMs = Date.now() - new Date(latestInspectedAt).getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      return '< 1h'
    } else if (diffHours >= 24) {
      return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`
    } else {
      return `${diffHours}h`
    }
  }

  _getDispositionTypeLabel(type) {
    const labelMap = {
      RESTOCK: '재입고',
      SCRAP: '폐기',
      REPAIR: '수리',
      RETURN_VENDOR: '반송',
      DONATION: '기부'
    }
    return labelMap[type] || type
  }

  _getDefectTypeLabel(type) {
    const labelMap = {
      DAMAGED: '파손',
      EXPIRED: '유통기한',
      WRONG_ITEM: '오배송',
      MISSING_PARTS: '부품누락',
      FUNCTIONAL_DEFECT: '기능불량'
    }
    return labelMap[type] || type
  }

  _formatDate(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  _formatTime(dateStr) {
    if (!dateStr) return '-'
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      return '방금'
    } else if (diffHours < 24) {
      return `${diffHours}h 전`
    } else {
      return `${Math.floor(diffHours / 24)}d 전`
    }
  }

  render() {
    return html`
      <div class="page-header">
        <h2>🗂️ ${i18next.t('menu.RwaDispositionList')}</h2>
        <button class="btn-icon" @click="${this._refresh}">
          <mwc-icon>refresh</mwc-icon>
          ${TermsUtil.tButton('refresh')}
        </button>
      </div>

      <!-- 검색 바 -->
      <div class="search-bar">
        <input
          type="text"
          class="search-input"
          placeholder="반품번호 또는 고객명 검색"
          .value="${this.searchKeyword || ''}"
          @input="${e => (this.searchKeyword = e.target.value)}"
          @keypress="${e => e.key === 'Enter' && this._onSearch()}"
        />
        <button class="btn-icon" @click="${this._onSearch}">
          <mwc-icon>search</mwc-icon>
        </button>
      </div>

      <!-- 상태 필터 -->
      <div class="filter-bar">
        <div
          class="filter-chip all ${this.filterStatus === 'ALL' || !this.filterStatus ? 'active' : ''}"
          @click="${() => this._onFilterChange('filterStatus', 'ALL')}"
        >
          전체
          <span class="chip-count">${this.stats?.total || 0}</span>
        </div>
        <div
          class="filter-chip inspected ${this.filterStatus === 'INSPECTED' ? 'active' : ''}"
          @click="${() => this._onFilterChange('filterStatus', 'INSPECTED')}"
        >
          검수완료
          <span class="chip-count">${this.stats?.inspected || 0}</span>
        </div>
        <div
          class="filter-chip disposed ${this.filterStatus === 'DISPOSED' ? 'active' : ''}"
          @click="${() => this._onFilterChange('filterStatus', 'DISPOSED')}"
        >
          처분완료
          <span class="chip-count">${this.stats?.disposed || 0}</span>
        </div>
        <div
          class="filter-chip completed ${this.filterStatus === 'COMPLETED' ? 'active' : ''}"
          @click="${() => this._onFilterChange('filterStatus', 'COMPLETED')}"
        >
          완료
          <span class="chip-count">${this.stats?.completed || 0}</span>
        </div>
      </div>

      <!-- 주문 카드 목록 -->
      ${this.loading
        ? html`<div class="loading">데이터 로딩 중...</div>`
        : this.filteredOrders.length === 0
        ? html`
            <div class="empty-state">
              <mwc-icon>inventory_2</mwc-icon>
              <div class="empty-state-message">처분 대기 항목이 없습니다</div>
              <div class="empty-state-hint">검수 완료된 반품이 여기에 표시됩니다</div>
            </div>
          `
        : html`
            <div class="order-cards">
              ${this.filteredOrders.map(order => this._renderOrderCard(order))}
            </div>
            <div style="text-align: center; margin-top: 16px; color: #999; font-size: 13px;">
              총 ${this.filteredOrders.length}건 표시
            </div>
          `}
    `
  }

  _renderOrderCard(order) {
    const waitingTime = this._getWaitingTime(order)
    const isOverdue = order.status === 'INSPECTED' && waitingTime.includes('d')
    const progressPercent = order._itemCount > 0 ? Math.round((order._disposedCount / order._itemCount) * 100) : 0

    return html`
      <div class="order-card ${order.status}">
        <!-- 헤더 -->
        <div class="card-header">
          <div class="card-title-area">
            <span class="rwa-no">${order.rwaNo}</span>
            <span class="card-status-badge ${order.status}">
              ${order.status === 'INSPECTED' ? '검수완료' : order.status === 'DISPOSED' ? '처분완료' : '완료'}
            </span>
          </div>
          <div style="text-align: right; font-size: 13px;">
            <div style="color: var(--md-sys-color-on-surface-variant, #666);">
              ${order.status === 'INSPECTED' ? '대기' : '완료'}:
              <span style="font-weight: 600; color: ${isOverdue ? '#F44336' : '#333'};">
                ${order.status === 'INSPECTED' ? waitingTime : this._formatTime(order.disposedAt)}
              </span>
              ${isOverdue ? html`<mwc-icon style="color: #F44336; font-size: 16px;">warning</mwc-icon>` : ''}
            </div>
          </div>
        </div>

        <!-- 요약 -->
        <div class="card-summary">
          <div class="summary-item">고객: <span class="value">${order.custNm || '-'}</span></div>
          <div class="summary-item">반품 유형: <span class="value">${order.rwaType || '-'}</span></div>
          <div class="summary-item">
            ${order.status === 'INSPECTED' ? '검수일' : '처분일'}:
            <span class="value">${this._formatDate(order.inspectedAt || order.disposedAt)}</span>
          </div>
          <div class="summary-item">양품: <span class="value good">${order._goodQty || 0}</span></div>
          <div class="summary-item">불량: <span class="value defect">${order._defectQty || 0}</span></div>
        </div>

        <!-- 검수 결과 또는 처분 결과 -->
        ${order.status === 'INSPECTED'
          ? this._renderInspectionResults(order)
          : this._renderDispositionResults(order)}

        <!-- 진행 바 -->
        <div class="progress-bar-container">
          <div class="progress-bar-label">
            ${order._disposedCount} / ${order._itemCount} 항목 처분 완료 (${progressPercent}%)
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill ${progressPercent === 100 ? 'complete' : ''}" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <!-- 액션 -->
        <div class="card-actions">
          ${order.status === 'INSPECTED'
            ? html`
                <button class="card-action-btn primary" @click="${() => this._startDisposition(order)}">
                  처분 결정
                </button>
                <button class="card-action-btn" @click="${() => this._openDetail(order)}">상세 조회</button>
              `
            : order.status === 'DISPOSED'
            ? html`
                <button class="card-action-btn complete" @click="${() => this._completeOrder(order)}">완료</button>
                <button class="card-action-btn" @click="${() => this._openDetail(order)}">처분 조회</button>
              `
            : html`
                <button class="card-action-btn close-btn" @click="${() => this._closeOrder(order)}">마감</button>
                <button class="card-action-btn" @click="${() => this._openDetail(order)}">상세 조회</button>
              `}
        </div>
      </div>
    `
  }

  _renderInspectionResults(order) {
    return html`
      <div class="inspection-results">
        <div class="section-title">📊 검수 결과 (${order._itemCount}개 항목)</div>
        ${order.items?.map(
          item => html`
            <div class="inspection-item">
              • <span class="sku-cd">${item.skuCd}</span> (${item.skuNm}): 양품
              <span style="color: #4CAF50; font-weight: 600;">${item.goodQty || 0}</span> / 불량
              <span style="color: #F44336; font-weight: 600;">${item.defectQty || 0}</span>
              ${item.defectType ? html`<span class="defect-type-badge">${this._getDefectTypeLabel(item.defectType)}</span>` : ''}
            </div>
          `
        )}
      </div>
    `
  }

  _renderDispositionResults(order) {
    return html`
      <div class="disposition-results">
        <div class="section-title">🗂️ 처분 결과 (${order._disposedCount}개 항목)</div>
        ${order.items
          ?.filter(item => item.dispositionType)
          .map(
            item => html`
              <div class="disposition-item">
                • <span class="sku-cd">${item.skuCd}</span> (${item.skuNm}):
                <span class="disposition-type-badge ${item.dispositionType}">
                  ${this._getDispositionTypeLabel(item.dispositionType)}
                </span>
                ${item.disposedQty || 0}개
                ${item.dispositionType === 'SCRAP' && item.scrapMethod
                  ? html`<span style="font-size: 11px; color: #999;">(${item.scrapMethod})</span>`
                  : ''}
              </div>
            `
          )}
      </div>
    `
  }
}

customElements.define('rwa-disposition-list', RwaDispositionList)
