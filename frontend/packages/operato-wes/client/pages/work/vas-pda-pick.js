import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxInputBarcode } from '@operato/input'

/**
 * VAS 자재 피킹 PDA 화면
 *
 * 화면 모드:
 * - 주문 선택 모드: 피킹 대상 VAS 주문 목록 + 바코드 스캔
 * - 피킹 작업 모드: 자재 체크리스트 + 바코드 스캔 + 수량 입력
 *
 * 작업 흐름:
 * 1. 주문 선택 (바코드 스캔 또는 목록에서 클릭)
 * 2. 자재 체크리스트 확인
 * 3. SKU 바코드 스캔 → 자재 자동 매칭
 * 4. 로케이션 이동 → 수량 확인 → 피킹 확인
 * 5. 다음 자재 자동 이동
 * 6. 전체 피킹 완료 후 주문 선택 화면 복귀
 *
 * PDA 최적화:
 * - OxInputBarcode 바코드 스캔 컴포넌트
 * - 큰 터치 버튼, 큰 폰트
 * - 로케이션 대형 안내 표시
 * - 음성 피드백
 */
class VasPdaPick extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background, #f5f5f5);
          height: 100%;
          overflow: auto;
          font-family: var(--md-sys-typescale-body-large-font, sans-serif);
        }

        /* 컨텐츠 */
        .pda-content {
          padding: 16px;
          max-width: 480px;
          margin: 0 auto;
        }

        /* 스캔 입력 */
        .scan-input-group {
          margin-bottom: 16px;
        }

        .scan-input-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 8px;
        }

        .scan-input {
          display: flex;
          gap: 8px;
        }

        .scan-input ox-input-barcode {
          flex: 1;
          --barcodescan-input-font-size: 18px;
          --barcodescan-input-padding: 14px 16px;
          --barcodescan-input-border-radius: 8px;
        }

        .refresh-btn {
          min-width: 56px;
          min-height: 56px;
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          border: none;
          border-radius: 8px;
          font-size: 24px;
          cursor: pointer;
          color: var(--md-sys-color-on-surface, #333);
        }

        .refresh-btn:active {
          transform: scale(0.95);
        }

        /* 주문 목록 */
        .order-list-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 12px;
        }

        .order-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .order-item {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 4px solid #FF9800;
        }

        .order-item:active {
          transform: scale(0.98);
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }

        .order-item .order-no {
          font-size: 18px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .order-item .order-info {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .order-item .order-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
        }

        .order-badge.APPROVED {
          background: #E3F2FD;
          color: #1565C0;
        }

        .order-badge.MATERIAL_READY {
          background: #FFF3E0;
          color: #E65100;
        }

        /* 진행률 바 */
        .progress-section {
          margin-bottom: 16px;
        }

        .progress-bar-container {
          width: 100%;
          height: 12px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #F57C00);
          transition: width 0.6s ease;
          border-radius: 8px;
        }

        .progress-bar-fill.complete {
          background: linear-gradient(90deg, #4CAF50, #388E3C);
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        /* 주문 정보 카드 */
        .order-info-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .order-info-card .title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .order-info-card .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          padding: 4px 0;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .order-info-card .detail-row .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        /* 항목 체크리스트 */
        .item-checklist {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .item-checklist .title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 14px;
          cursor: pointer;
        }

        .checklist-item:last-child {
          border-bottom: none;
        }

        .checklist-item.active {
          background: #FFF3E0;
          margin: 0 -16px;
          padding: 10px 16px;
          border-radius: 8px;
        }

        .checklist-item .icon {
          font-size: 20px;
          min-width: 24px;
          text-align: center;
        }

        .checklist-item.completed .icon {
          color: #4CAF50;
        }

        .checklist-item.active .icon {
          color: #FF9800;
        }

        .checklist-item .sku-info {
          flex: 1;
        }

        .checklist-item .sku-name {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .checklist-item .qty {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .checklist-item .qty strong {
          color: #E65100;
          font-weight: 700;
        }

        /* 현재 항목 폼 */
        .current-item-form {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .current-item-form .title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #E65100;
        }

        /* 로케이션 안내 */
        .location-guide {
          background: #FFF3E0;
          border: 2px solid #FF9800;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          text-align: center;
        }

        .location-guide .loc-label {
          font-size: 13px;
          font-weight: 600;
          color: #E65100;
          margin-bottom: 4px;
        }

        .location-guide .loc-value {
          font-size: 28px;
          font-weight: 700;
          color: #E65100;
        }

        .location-guide .lot-info {
          font-size: 13px;
          color: #795548;
          margin-top: 4px;
        }

        /* 폼 그룹 */
        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 16px;
          box-sizing: border-box;
          outline: none;
        }

        .form-group input:focus {
          border-color: #FF9800;
        }

        .qty-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty-input-group input {
          flex: 1;
        }

        .qty-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 폼 액션 버튼 */
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .form-actions .pda-btn {
          flex: 1;
        }

        /* 버튼 */
        .pda-btn {
          min-height: 52px;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pda-btn:active {
          transform: scale(0.97);
        }

        .pda-btn.primary {
          background: #FF9800;
          color: #fff;
        }

        .pda-btn.success {
          background: #4CAF50;
          color: #fff;
        }

        .pda-btn.warning {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface, #333);
        }

        .pda-btn.outline {
          background: transparent;
          color: #FF9800;
          border: 2px solid #FF9800;
        }

        .pda-btn:disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        /* 하단 액션 */
        .bottom-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
          padding-bottom: 24px;
        }

        .bottom-actions .pda-btn {
          width: 100%;
        }

        /* 피드백 토스트 */
        .feedback-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          z-index: 100;
          animation: fadeInOut 2s ease forwards;
        }

        .feedback-toast.success {
          background: #4CAF50;
        }

        .feedback-toast.error {
          background: #F44336;
        }

        .feedback-toast.info {
          background: #2196F3;
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }

        /* 로딩 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 48px 16px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .empty-state .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .empty-state .empty-text {
          font-size: 16px;
        }

        /* 피킹 완료 메시지 */
        .completion-card {
          text-align: center;
          background: #E8F5E9;
          border: 2px solid #4CAF50;
          border-radius: 12px;
          padding: 24px 16px;
          margin-bottom: 16px;
        }

        .completion-card .icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .completion-card .message {
          font-size: 18px;
          font-weight: 700;
          color: #2E7D32;
        }

        .completion-card .sub-message {
          font-size: 14px;
          color: #666;
          margin-top: 8px;
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      screen: String,
      orders: Array,
      bomMap: Object,
      scanValue: String,
      selectedOrder: Object,
      orderItems: Array,
      currentItemIndex: Number,
      pickQty: Number,
      feedbackMsg: String,
      feedbackType: String
    }
  }

  constructor() {
    super()
    this.loading = false
    this.screen = 'order-select'
    this.orders = []
    this.bomMap = {}
    this.scanValue = ''
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this.pickQty = 0
    this.feedbackMsg = ''
    this.feedbackType = ''
  }

  get context() {
    return {
      title: TermsUtil.tMenu('VasPdaPick')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      ${this.screen === 'order-select'
        ? this._renderOrderSelect()
        : this._renderPickWork()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
    `
  }

  /* ============================================================
   * 주문 선택 화면
   * ============================================================ */

  _renderOrderSelect() {
    return html`
      <div class="pda-content">
        <div class="scan-input-group">
          <label>VAS 주문번호 스캔 또는 검색</label>
          <div class="scan-input">
            <ox-input-barcode
              placeholder="주문번호 스캔"
              @change="${e => { this.scanValue = e.target.value; this._onScanSearch() }}"
            ></ox-input-barcode>
            <button class="refresh-btn" @click="${this._refresh}" title="새로고침">\u21bb</button>
          </div>
        </div>

        ${this.loading
          ? html`<div class="loading">주문 목록 조회 중...</div>`
          : this.orders.length > 0
            ? html`
                <div class="order-list-title">피킹 대상 주문 (${this.orders.length}건)</div>
                <div class="order-list">
                  ${this.orders.map(order => this._renderOrderCard(order))}
                </div>
              `
            : html`
                <div class="empty-state">
                  <span class="empty-icon">\u{1F4E6}</span>
                  <span class="empty-text">피킹 대상 주문이 없습니다</span>
                </div>
              `}
      </div>
    `
  }

  _renderOrderCard(order) {
    const bom = this.bomMap[order.vas_bom_id]

    return html`
      <div class="order-item" @click="${() => this._selectOrder(order)}">
        <div class="order-no">${order.vas_no || '-'}</div>
        <div class="order-info">
          ${this._vasTypeLabel(order.vas_type)} | ${bom?.set_sku_cd || '-'} / ${bom?.set_sku_nm || '-'}
        </div>
        <div class="order-info">
          계획: ${order.plan_qty || 0} EA
        </div>
        <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
      </div>
    `
  }

  /* ============================================================
   * 피킹 작업 화면
   * ============================================================ */

  _renderPickWork() {
    if (!this.selectedOrder) return ''

    const pickedCount = this.orderItems.filter(i => i._picked).length
    const totalCount = this.orderItems.length
    const progressPct = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0
    const allPicked = pickedCount === totalCount && totalCount > 0

    return html`
      <div class="pda-content">
        ${this._renderOrderSummary()}
        ${this._renderProgressBar(pickedCount, totalCount, progressPct)}
        ${!allPicked ? this._renderBarcodeScanner() : ''}
        ${allPicked ? this._renderCompletionMessage() : ''}
        ${this._renderItemChecklist()}
        ${this.currentItemIndex >= 0 ? this._renderPickForm() : ''}
        ${this._renderBottomActions(allPicked)}
      </div>
    `
  }

  _renderOrderSummary() {
    const order = this.selectedOrder
    const bom = this.bomMap[order.vas_bom_id]

    return html`
      <div class="order-info-card">
        <div class="title">${order.vas_no}</div>
        <div class="detail-row">
          <span>세트상품</span>
          <span class="value">${bom?.set_sku_cd || '-'} / ${bom?.set_sku_nm || '-'}</span>
        </div>
        <div class="detail-row">
          <span>VAS유형</span>
          <span class="value">${this._vasTypeLabel(order.vas_type)}</span>
        </div>
        <div class="detail-row">
          <span>계획수량</span>
          <span class="value">${order.plan_qty || 0} EA</span>
        </div>
      </div>
    `
  }

  _renderProgressBar(pickedCount, totalCount, progressPct) {
    return html`
      <div class="progress-section">
        <div class="progress-bar-container">
          <div
            class="progress-bar-fill ${progressPct >= 100 ? 'complete' : ''}"
            style="width: ${Math.min(progressPct, 100)}%"
          ></div>
        </div>
        <div class="progress-label">
          <span>피킹 진행: ${pickedCount}/${totalCount} 품목</span>
          <span>${progressPct}%</span>
        </div>
      </div>
    `
  }

  _renderBarcodeScanner() {
    return html`
      <div class="scan-input-group">
        <label>자재 SKU 바코드 스캔</label>
        <div class="scan-input">
          <ox-input-barcode
            placeholder="SKU 바코드 스캔"
            @change="${e => this._onSkuBarcodeScan(e.target.value)}"
          ></ox-input-barcode>
        </div>
      </div>
    `
  }

  _renderItemChecklist() {
    return html`
      <div class="item-checklist">
        <div class="title">자재 피킹 체크리스트</div>
        ${this.orderItems.map((item, idx) => html`
          <div
            class="checklist-item ${item._picked ? 'completed' : ''} ${idx === this.currentItemIndex ? 'active' : ''}"
            @click="${() => this._focusItem(idx)}"
          >
            <div class="icon">
              ${item._picked ? '\u2713' : idx === this.currentItemIndex ? '\u2192' : '\u2610'}
            </div>
            <div class="sku-info">
              <div class="sku-name">${item.sku_cd} - ${item.sku_nm}</div>
              <div class="qty">
                ${item.picked_qty || 0} / ${item.alloc_qty || item.req_qty || 0} EA
                ${item.src_loc_cd ? html` | <strong>${item.src_loc_cd}</strong>` : ''}
                ${item.lot_no ? html` | LOT: ${item.lot_no}` : ''}
              </div>
            </div>
          </div>
        `)}
      </div>
    `
  }

  _renderPickForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return ''

    const reqQty = item.alloc_qty || item.req_qty || 0

    return html`
      <div class="current-item-form">
        <div class="title">\u{1F4E6} ${item.sku_cd} (${item.sku_nm})</div>

        <div class="location-guide">
          <div class="loc-label">피킹 로케이션</div>
          <div class="loc-value">${item.src_loc_cd || '미지정'}</div>
          ${item.lot_no ? html`<div class="lot-info">LOT: ${item.lot_no}</div>` : ''}
        </div>

        <div class="form-group">
          <label>피킹 수량</label>
          <div class="qty-input-group">
            <input
              type="number"
              inputmode="numeric"
              placeholder="0"
              .value="${this.pickQty || ''}"
              @input="${e => { this.pickQty = parseInt(e.target.value) || 0 }}"
            />
            <span class="qty-label">/ ${reqQty} EA</span>
          </div>
        </div>

        <div class="form-actions">
          <button class="pda-btn primary" @click="${this._confirmPick}">피킹 확인</button>
          <button class="pda-btn outline" @click="${this._skipItem}">스킵</button>
        </div>
      </div>
    `
  }

  _renderCompletionMessage() {
    return html`
      <div class="completion-card">
        <div class="icon">\u2705</div>
        <div class="message">모든 자재 피킹 완료!</div>
        <div class="sub-message">주문 목록으로 돌아가거나 다음 작업을 진행하세요.</div>
      </div>
    `
  }

  _renderBottomActions(allPicked) {
    return html`
      <div class="bottom-actions">
        ${allPicked
          ? html`<button class="pda-btn success" @click="${this._completeAllPick}">피킹 작업 완료</button>`
          : ''}
        <button class="pda-btn warning" @click="${this._backToOrderSelect}">주문 목록으로</button>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  async pageUpdated(changes, lifecycle, before) {
    if (this.active && this.screen === 'order-select') {
      await this._refresh()
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  async _refresh() {
    try {
      this.loading = true
      const data = await ServiceUtil.restGet('vas_trx/monitor/orders', {
        status: 'APPROVED,MATERIAL_READY'
      })
      this.orders = data || []
      await this._fetchBomMap(this.orders)
      this.loading = false
    } catch (err) {
      console.error('주문 목록 조회 실패:', err)
      this.orders = []
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
      results.forEach((bom, i) => { if (bom) updated[newBomIds[i]] = bom })
      this.bomMap = updated
    } catch (err) {
      console.error('BOM 조회 실패:', err)
    }
  }

  async _fetchOrderItems(orderId) {
    try {
      const data = await ServiceUtil.restGet(`vas_trx/vas_orders/${orderId}/items`)
      this.orderItems = (data || []).map(item => ({
        ...item,
        _picked: item.pick_status === 'PICKED' || (item.picked_qty > 0 && item.picked_qty >= (item.alloc_qty || item.req_qty)),
        _pickedQty: item.picked_qty || 0
      }))

      this.currentItemIndex = this.orderItems.findIndex(i => !i._picked)
      if (this.currentItemIndex >= 0) {
        this._initPickForm()
      }
    } catch (err) {
      console.error('자재 항목 조회 실패:', err)
      this.orderItems = []
    }
  }

  /* ============================================================
   * 주문 선택 / 화면 전환
   * ============================================================ */

  async _selectOrder(order) {
    this.selectedOrder = order
    this.screen = 'pick-work'
    await this._fetchOrderItems(order.id)
  }

  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this._refresh()
  }

  /* ============================================================
   * 바코드 스캔 처리
   * ============================================================ */

  _onScanSearch() {
    const value = (this.scanValue || '').trim()
    if (!value) return

    const found = this.orders.find(o => o.vas_no === value || o.id === value)
    if (found) {
      this._selectOrder(found)
      this.scanValue = ''
    } else {
      this._showFeedback('주문을 찾을 수 없습니다', 'error')
      this._speakFeedback('주문을 찾을 수 없습니다')
    }
  }

  _onSkuBarcodeScan(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return

    const matchIdx = this.orderItems.findIndex(
      (item) => !item._picked && (item.sku_cd === trimmed || item.barcode === trimmed)
    )

    if (matchIdx >= 0) {
      this.currentItemIndex = matchIdx
      this._initPickForm()
      this._showFeedback(`${this.orderItems[matchIdx].sku_cd} 자재 확인`, 'success')
      this._speakFeedback('자재 확인')
    } else {
      const alreadyPicked = this.orderItems.find(
        item => item._picked && (item.sku_cd === trimmed || item.barcode === trimmed)
      )
      if (alreadyPicked) {
        this._showFeedback('이미 피킹 완료된 자재입니다', 'info')
        this._speakFeedback('이미 피킹 완료')
      } else {
        this._showFeedback('해당 자재를 찾을 수 없습니다', 'error')
        this._speakFeedback('자재를 찾을 수 없습니다')
      }
    }
  }

  /* ============================================================
   * 피킹 처리
   * ============================================================ */

  async _confirmPick() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return

    const reqQty = item.alloc_qty || item.req_qty || 0

    if (!this.pickQty || this.pickQty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'error')
      this._speakFeedback('수량을 입력해주세요')
      return
    }

    if (this.pickQty > reqQty) {
      this._showFeedback('요청 수량을 초과할 수 없습니다', 'error')
      this._speakFeedback('요청 수량 초과')
      return
    }

    try {
      await ServiceUtil.restPost(`vas_trx/vas_order_items/${item.id}/pick`, {
        pickedQty: this.pickQty
      })

      const items = [...this.orderItems]
      items[this.currentItemIndex] = {
        ...items[this.currentItemIndex],
        _picked: true,
        _pickedQty: this.pickQty,
        picked_qty: this.pickQty
      }
      this.orderItems = items

      this._showFeedback('피킹 완료', 'success')
      this._speakFeedback('피킹 완료')

      setTimeout(() => this._moveToNextItem(), 500)
    } catch (err) {
      this._showFeedback(err.message || '피킹 실패', 'error')
      this._speakFeedback('피킹 실패')
    }
  }

  _focusItem(idx) {
    const item = this.orderItems[idx]
    if (item._picked) {
      this._showFeedback('이미 피킹 완료된 항목입니다', 'info')
      return
    }
    this.currentItemIndex = idx
    this._initPickForm()
  }

  _skipItem() {
    this._moveToNextItem()
  }

  _moveToNextItem() {
    const nextIndex = this.orderItems.findIndex(
      (item, idx) => idx > this.currentItemIndex && !item._picked
    )

    if (nextIndex >= 0) {
      this.currentItemIndex = nextIndex
      this._initPickForm()
    } else {
      const wrapIndex = this.orderItems.findIndex(item => !item._picked)
      if (wrapIndex >= 0) {
        this.currentItemIndex = wrapIndex
        this._initPickForm()
      } else {
        this.currentItemIndex = -1
        this._showFeedback('모든 자재 피킹 완료!', 'success')
        this._speakFeedback('모든 자재 피킹 완료')
      }
    }
  }

  _initPickForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return
    this.pickQty = item.alloc_qty || item.req_qty || 0
  }

  _completeAllPick() {
    this._showFeedback('피킹 작업 완료!', 'success')
    this._speakFeedback('피킹 작업이 완료되었습니다')

    setTimeout(() => {
      this._backToOrderSelect()
    }, 1500)
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
      APPROVED: '주문 확정',
      MATERIAL_READY: '자재 준비 완료'
    }
    return map[status] || status || '-'
  }

  _showFeedback(msg, type = 'info') {
    this.feedbackMsg = msg
    this.feedbackType = type
    if (this._feedbackTimer) clearTimeout(this._feedbackTimer)
    this._feedbackTimer = setTimeout(() => {
      this.feedbackMsg = ''
      this.feedbackType = ''
    }, 2000)
  }

  _speakFeedback(text) {
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.rate = 1.1
        window.speechSynthesis.speak(utterance)
      }
    } catch (e) {
      // 음성 합성 미지원 환경 무시
    }
  }
}

window.customElements.define('vas-pda-pick', VasPdaPick)
