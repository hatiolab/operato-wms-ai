import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxInputBarcode } from '@operato/input'

/**
 * RWA 반품 입고 작업 화면 (PDA)
 *
 * 화면 모드:
 * - 주문 선택 모드: 작업 가능한 반품 주문 목록 + 바코드 스캔
 * - 입고 작업 모드: 항목 체크리스트 + 현재 항목 입고 폼
 *
 * 작업 흐름:
 * 1. 주문 선택 (바코드 스캔 또는 목록에서 클릭)
 * 2. 항목별 입고 처리 (바코드 스캔 → 수량/로케이션 입력 → 확인)
 * 3. 다음 항목 자동 이동
 * 4. 모든 항목 완료 후 입고 완료
 *
 * PDA 최적화:
 * - 큰 터치 버튼, 큰 폰트
 * - 바코드 스캔 자동 포커스
 * - 음성 피드백
 */
class RwaReceiveWork extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background, #f5f5f5);
          height: 100%;
          overflow: auto;
        }

        /* PDA 헤더 */
        .pda-header {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .pda-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .back-btn {
          background: none;
          border: none;
          color: inherit;
          font-size: 24px;
          cursor: pointer;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* 컨텐츠 */
        .pda-content {
          padding: 16px;
          max-width: 480px;
          margin: 0 auto;
        }

        /* 주문 선택 화면 */
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

        .scan-input input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 18px;
          outline: none;
        }

        .scan-input input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* ox-input-barcode 스타일 */
        .scan-input ox-input-barcode {
          flex: 1;
          --barcodescan-input-font-size: 18px;
          --barcodescan-input-padding: 14px 16px;
          --barcodescan-input-border-radius: 8px;
        }

        .form-group ox-input-barcode {
          width: 100%;
          --barcodescan-input-font-size: 16px;
          --barcodescan-input-padding: 12px;
          --barcodescan-input-border-radius: 8px;
        }

        .scan-btn,
        .refresh-btn {
          min-width: 56px;
          min-height: 56px;
          background: var(--md-sys-color-secondary-container, #E3F2FD);
          border: none;
          border-radius: 8px;
          font-size: 24px;
          cursor: pointer;
        }

        .refresh-btn {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
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
          border-left: 4px solid #00BCD4;
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

        .order-badge.RECEIVING {
          background: #E0F7FA;
          color: #00838F;
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
          background: linear-gradient(90deg, #00BCD4, #00ACC1);
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
          color: var(--md-sys-color-primary, #1976D2);
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 16px;
          box-sizing: border-box;
          outline: none;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
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

        /* 버튼 */
        .pda-btn {
          min-height: 52px;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .pda-btn:active {
          transform: scale(0.97);
        }

        .pda-btn.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .pda-btn.success {
          background: #4CAF50;
          color: #fff;
        }

        .pda-btn.warning {
          background: #FF9800;
          color: #fff;
        }

        .pda-btn.outline {
          background: var(--md-sys-color-surface, #fff);
          border: 2px solid var(--md-sys-color-outline, #ccc);
          color: var(--md-sys-color-on-surface, #333);
        }

        .pda-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          gap: 8px;
        }

        .form-actions .pda-btn {
          flex: 1;
        }

        .bottom-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bottom-actions .pda-btn {
          width: 100%;
        }

        /* 피드백 토스트 */
        .feedback-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
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
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          10% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          90% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .empty-state .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state .message {
          font-size: 16px;
        }

        /* 로딩 */
        .loading {
          text-align: center;
          padding: 60px 20px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      screen: String,              // 'order-select' | 'work'
      orders: Array,               // 작업 가능한 반품 주문 목록
      selectedOrder: Object,       // 선택된 주문
      orderItems: Array,           // 주문의 항목 목록
      currentItemIndex: Number,    // 현재 작업 중인 항목 인덱스
      scanValue: String,           // 바코드 스캔 값
      rwaQty: Number,             // 입고 수량
      locCd: String,              // 입고 로케이션
      appearance: String,          // 외관 상태
      remarks: String,             // 비고
      feedbackMsg: String,
      feedbackType: String
    }
  }

  constructor() {
    super()
    this.loading = false
    this.screen = 'order-select'
    this.orders = []
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this.scanValue = ''
    this.rwaQty = 0
    this.locCd = ''
    this.appearance = 'GOOD'
    this.remarks = ''
    this.feedbackMsg = ''
    this.feedbackType = ''
  }

  get context() {
    return {
      title: TermsUtil.tMenu('RwaReceiveWork')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      ${this.screen === 'order-select' ? this._renderOrderSelect() : this._renderWorkScreen()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
    `
  }

  _renderOrderSelect() {
    if (this.loading) {
      return html`
        <div class="pda-content">
          <div class="loading">주문 목록 로딩 중...</div>
        </div>
      `
    }

    return html`
      <div class="pda-content">
        <div class="order-select-section">
        <div class="scan-input-group">
          <label>반품번호 스캔 또는 검색</label>
          <div class="scan-input">
            <ox-input-barcode
              placeholder="반품번호 스캔"
              @change="${e => { this.scanValue = e.target.value; this._onScanSearch() }}"
            ></ox-input-barcode>
            <button class="refresh-btn" @click="${this._refresh}" title="새로고침">⟳</button>
          </div>
        </div>

        ${this.orders.length > 0
          ? html`
              <div class="order-list-title">작업 가능 주문 (${this.orders.length}건)</div>
              <div class="order-list">
                ${this.orders.map(order => html`
                  <div class="order-item" @click="${() => this._selectOrder(order)}">
                    <div class="order-no">${order.rwa_no}</div>
                    <div class="order-info">
                      ${order.cust_nm || '-'} | ${order.rwa_type ? this._rwaTypeLabel(order.rwa_type) : '-'}
                    </div>
                    <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
                  </div>
                `)}
              </div>
            `
          : html`
              <div class="empty-state">
                <div class="icon">📥</div>
                <div class="message">작업 가능한 반품 주문이 없습니다</div>
              </div>
            `}
        </div>
      </div>
    `
  }

  _renderWorkScreen() {
    if (!this.selectedOrder) {
      return html`
        <div class="pda-content">
          <div class="empty-state">주문을 선택해주세요</div>
        </div>
      `
    }

    const completedCount = this.orderItems.filter(i => i._completed).length
    const totalCount = this.orderItems.length
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return html`
      <div class="pda-content">
        ${this._renderProgressBar(completedCount, totalCount, progressPct)}
        ${this._renderOrderInfo()}
        ${this._renderItemChecklist()}
        ${this.currentItemIndex >= 0 ? this._renderCurrentItemForm() : ''}
        ${this._renderBottomActions()}
      </div>
    `
  }

  _renderProgressBar(completedCount, totalCount, progressPct) {
    return html`
      <div class="progress-section">
        <div class="progress-bar-container">
          <div
            class="progress-bar-fill ${progressPct >= 100 ? 'complete' : ''}"
            style="width: ${Math.min(progressPct, 100)}%"
          ></div>
        </div>
        <div class="progress-label">
          <span>진행: ${completedCount}/${totalCount} 항목</span>
          <span>${progressPct}%</span>
        </div>
      </div>
    `
  }

  _renderOrderInfo() {
    return html`
      <div class="order-info-card">
        <div class="title">${this.selectedOrder.rwa_no}</div>
        <div class="detail-row">
          <span>고객:</span>
          <span class="value">${this.selectedOrder.cust_nm || '-'}</span>
        </div>
        <div class="detail-row">
          <span>화주:</span>
          <span class="value">${this.selectedOrder.com_cd || '-'}</span>
        </div>
        <div class="detail-row">
          <span>유형:</span>
          <span class="value">${this._rwaTypeLabel(this.selectedOrder.rwa_type)}</span>
        </div>
      </div>
    `
  }

  _renderItemChecklist() {
    return html`
      <div class="item-checklist">
        <div class="title">입고 항목 체크리스트</div>
        ${this.orderItems.map((item, idx) => html`
          <div class="checklist-item ${item._completed ? 'completed' : ''} ${idx === this.currentItemIndex ? 'active' : ''}">
            <div class="icon">
              ${item._completed ? '✓' : idx === this.currentItemIndex ? '→' : '☐'}
            </div>
            <div class="sku-info">
              <div class="sku-name">${item.sku_cd} - ${item.sku_nm}</div>
              <div class="qty">${item.rwa_qty || 0} / ${item.rwa_req_qty || 0} EA</div>
            </div>
          </div>
        `)}
      </div>
    `
  }

  _renderCurrentItemForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return ''

    return html`
      <div class="current-item-form">
        <div class="title">현재 항목: ${item.sku_cd} (${item.sku_nm})</div>

        <div class="form-group">
          <label>바코드</label>
          <ox-input-barcode
            placeholder="SKU 바코드 스캔"
            @change="${e => { this._onBarcodeScanResult(e.target.value) }}"
          ></ox-input-barcode>
        </div>

        <div class="form-group">
          <label>입고 수량</label>
          <div class="qty-input-group">
            <input
              type="number"
              inputmode="numeric"
              placeholder="0"
              .value="${this.rwaQty || ''}"
              @input="${e => { this.rwaQty = parseInt(e.target.value) || 0 }}"
            />
            <span class="qty-label">/ ${item.rwa_req_qty} EA</span>
          </div>
        </div>

        <div class="form-group">
          <label>입고 로케이션</label>
          <ox-input-barcode
            placeholder="로케이션 스캔"
            .value="${this.locCd}"
            @change="${e => { this.locCd = e.target.value }}"
          ></ox-input-barcode>
        </div>

        <div class="form-group">
          <label>외관 상태</label>
          <select .value="${this.appearance}" @change="${e => { this.appearance = e.target.value }}">
            <option value="GOOD">양호</option>
            <option value="DAMAGE">손상</option>
            <option value="DEFECT">파손</option>
          </select>
        </div>

        <div class="form-group">
          <label>비고</label>
          <textarea
            placeholder="추가 정보 입력"
            .value="${this.remarks}"
            @input="${e => { this.remarks = e.target.value }}"
          ></textarea>
        </div>

        <div class="form-actions">
          <button class="pda-btn primary" @click="${this._confirmCurrentItem}">확인</button>
          <button class="pda-btn outline" @click="${this._skipCurrentItem}">스킵</button>
        </div>
      </div>
    `
  }

  _renderBottomActions() {
    const allCompleted = this.orderItems.every(i => i._completed || i._skipped)

    return html`
      <div class="bottom-actions">
        <button class="pda-btn success" ?disabled="${!allCompleted}" @click="${this._completeReceive}">
          입고 완료
        </button>
        <button class="pda-btn warning" @click="${this._backToOrderSelect}">일시정지</button>
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
      await this._fetchOrders()
      this.loading = false
    } catch (err) {
      console.error('주문 조회 실패:', err)
      this.loading = false
    }
  }

  async _fetchOrders() {
    const [approved, receiving] = await Promise.all([
      ServiceUtil.restGet('rwa_trx/rwa_orders?status=APPROVED').catch(() => []),
      ServiceUtil.restGet('rwa_trx/rwa_orders?status=RECEIVING').catch(() => [])
    ])
    this.orders = [...(approved || []), ...(receiving || [])]
  }

  async _selectOrder(order) {
    try {
      this.selectedOrder = order
      this.screen = 'work'

      const items = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${order.id}/items`)

      this.orderItems = (items || []).map(item => ({
        ...item,
        _completed: (item.rwa_qty || 0) >= (item.rwa_req_qty || 0),
        _skipped: false
      }))

      this.currentItemIndex = this.orderItems.findIndex(i => !i._completed && !i._skipped)
      if (this.currentItemIndex < 0) this.currentItemIndex = 0

      this._initCurrentItemForm()
    } catch (err) {
      this._showFeedback('항목 조회 실패', 'error')
      console.error(err)
    }
  }

  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this._refresh()
  }

  /* ============================================================
   * 입고 처리
   * ============================================================ */

  async _confirmCurrentItem() {
    const item = this.orderItems[this.currentItemIndex]

    // 유효성 검증
    if (!this.rwaQty || this.rwaQty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'error')
      this._speakFeedback('수량을 입력해주세요')
      return
    }

    if (this.rwaQty > item.rwa_req_qty) {
      this._showFeedback('요청 수량을 초과할 수 없습니다', 'error')
      this._speakFeedback('요청 수량을 초과할 수 없습니다')
      return
    }

    if (!this.locCd) {
      this._showFeedback('로케이션을 입력해주세요', 'error')
      this._speakFeedback('로케이션을 입력해주세요')
      return
    }

    try {
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/receive`,
        {
          rwaQty: this.rwaQty,
          locCd: this.locCd
        }
      )

      this.orderItems[this.currentItemIndex]._completed = true
      this.orderItems = [...this.orderItems]

      this._showFeedback('입고 완료', 'success')
      this._speakFeedback('입고 완료')

      setTimeout(() => {
        this._moveToNextItem()
      }, 500)
    } catch (err) {
      this._showFeedback(err.message || '입고 실패', 'error')
      this._speakFeedback('입고 실패')
    }
  }

  _skipCurrentItem() {
    this.orderItems[this.currentItemIndex]._skipped = true
    this.orderItems = [...this.orderItems]
    this._moveToNextItem()
  }

  _moveToNextItem() {
    const nextIndex = this.orderItems.findIndex(
      (item, idx) => idx > this.currentItemIndex && !item._completed && !item._skipped
    )

    if (nextIndex >= 0) {
      this.currentItemIndex = nextIndex
      this._initCurrentItemForm()
    } else {
      this._showFeedback('모든 항목 입고 완료', 'success')
      this.currentItemIndex = -1
    }
  }

  async _completeReceive() {
    const completedCount = this.orderItems.filter(i => i._completed).length
    const totalCount = this.orderItems.length

    if (completedCount < totalCount) {
      const result = await UiUtil.showAlertPopup(
        'title.confirm',
        `${totalCount - completedCount}개 항목이 미완료 상태입니다.\n그래도 입고를 완료하시겠습니까?`,
        'question',
        'confirm',
        'cancel'
      )
      if (!result.confirmButton) return
    }

    this._showFeedback('입고 완료되었습니다', 'success')

    setTimeout(() => {
      this._backToOrderSelect()
    }, 1500)
  }

  /* ============================================================
   * 바코드 스캔
   * ============================================================ */

  _onScanKeydown(e) {
    if (e.key === 'Enter') {
      this._onScanSearch()
    }
  }

  _onScanSearch() {
    const value = (this.scanValue || '').trim()
    if (!value) return

    const found = this.orders.find(o => o.rwa_no === value || o.id === value)

    if (found) {
      this._selectOrder(found)
      this.scanValue = ''
    } else {
      this._showFeedback('주문을 찾을 수 없습니다', 'error')
      this._speakFeedback('주문을 찾을 수 없습니다')
    }
  }

  _onBarcodeScanResult(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return

    const item = this.orderItems[this.currentItemIndex]

    if (item.sku_cd === trimmed || item.barcode === trimmed) {
      this._showFeedback('스캔 완료', 'success')
      this._speakFeedback('스캔 완료')
    } else {
      this._showFeedback('SKU 불일치', 'error')
      this._speakFeedback('SKU 불일치')
    }
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _initCurrentItemForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return

    this.scanValue = ''
    this.rwaQty = item.rwa_req_qty || 0
    this.locCd = item.temp_loc_cd || item.loc_cd || ''
    this.appearance = 'GOOD'
    this.remarks = ''
  }

  _showFeedback(msg, type = 'info') {
    this.feedbackMsg = msg
    this.feedbackType = type

    setTimeout(() => {
      this.feedbackMsg = ''
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
      // 무시
    }
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
      APPROVED: '승인',
      RECEIVING: '입고중'
    }
    return map[status] || status || '-'
  }
}

window.customElements.define('rwa-receive-work', RwaReceiveWork)
