import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

import { voiceService } from './voice-service.js'

/**
 * RWA 반품 처분 결정 작업 화면 (PDA)
 *
 * 화면 모드:
 * - 주문 선택 모드: 처분 가능한 반품 주문 목록 + 바코드 스캔
 * - 처분 작업 모드: 항목 체크리스트 + 현재 항목 처분 폼
 *
 * 작업 흐름:
 * 1. 주문 선택 (바코드 스캔 또는 목록에서 클릭)
 * 2. 항목별 처분 결정 (양품/불량 각각 처분 유형 결정)
 * 3. 처분 유형별 필수 정보 입력
 * 4. 다음 항목 자동 이동
 * 5. 모든 항목 완료 후 처분 완료
 *
 * 처분 유형:
 * - RESTOCK (재입고): location_id, stock_status
 * - SCRAP (폐기): scrap_method, scrap_reason
 * - RETURN_VENDOR (공급사 반송): supplier_id, tracking_no
 * - REPAIR (수리/재가공): repair_vendor, estimated_date
 *
 * PDA 최적화:
 * - 큰 터치 버튼, 큰 폰트
 * - 바코드 스캔 자동 포커스
 * - 음성 피드백
 */
class RwaDispositionWork extends localize(i18next)(PageView) {
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
          background: var(--md-sys-color-primary, #9C27B0);
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
          border-color: var(--md-sys-color-primary, #9C27B0);
        }

        .scan-btn,
        .refresh-btn {
          min-width: 56px;
          min-height: 56px;
          background: var(--md-sys-color-secondary-container, #E1BEE7);
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
          border-left: 4px solid #9C27B0;
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
          background: #E1BEE7;
          color: #6A1B9A;
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
          background: linear-gradient(90deg, #9C27B0, #7B1FA2);
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

        .order-info-card .detail-row .value.good {
          color: #4CAF50;
        }

        .order-info-card .detail-row .value.defect {
          color: #F44336;
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
          background: #F3E5F5;
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
          color: #9C27B0;
        }

        .checklist-item .sku-info {
          flex: 1;
        }

        .checklist-item .sku-name {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .checklist-item .qty {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .checklist-item .qty .good {
          color: #4CAF50;
        }

        .checklist-item .qty .defect {
          color: #F44336;
        }

        /* 처분 폼 섹션 */
        .disposition-form {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .disposition-form .form-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--md-sys-color-primary, #9C27B0);
        }

        .disposition-section {
          margin-bottom: 20px;
          padding: 16px;
          background: var(--md-sys-color-surface-variant, #f9f9f9);
          border-radius: 8px;
        }

        .disposition-section:last-child {
          margin-bottom: 0;
        }

        .disposition-section .section-header {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .disposition-section .section-header.good {
          color: #4CAF50;
        }

        .disposition-section .section-header.defect {
          color: #F44336;
        }

        .disposition-section .qty-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          background: rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 6px;
        }

        .form-group label .required {
          color: #F44336;
        }

        .form-group input[type="text"],
        .form-group input[type="date"],
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--md-sys-color-primary, #9C27B0);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        /* 처분 유형 라디오 */
        .disposition-type-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .disposition-type-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .disposition-type-item:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .disposition-type-item.selected {
          border-color: var(--md-sys-color-primary, #9C27B0);
          background: #F3E5F5;
        }

        .disposition-type-item input[type="radio"] {
          min-width: 20px;
          min-height: 20px;
          margin: 0;
        }

        .disposition-type-item label {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin: 0;
        }

        /* 하단 액션 버튼 */
        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .action-btn {
          flex: 1;
          min-height: 52px;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:active {
          transform: scale(0.98);
        }

        .action-btn.primary {
          background: var(--md-sys-color-primary, #9C27B0);
          color: var(--md-sys-color-on-primary, #fff);
        }

        .action-btn.primary:hover {
          background: #7B1FA2;
        }

        .action-btn.secondary {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface, #333);
        }

        .action-btn.success {
          background: #4CAF50;
          color: #fff;
        }

        .action-btn.success:hover {
          background: #388E3C;
        }

        /* 피드백 토스트 */
        .feedback-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--md-sys-color-inverse-surface, #333);
          color: var(--md-sys-color-inverse-on-surface, #fff);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          z-index: 100;
          animation: fadeInOut 2s ease-in-out;
        }

        .feedback-toast.success {
          background: #4CAF50;
        }

        .feedback-toast.error {
          background: #F44336;
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

        /* 로딩 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 60px 20px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant, #666);
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

        /* 정보 메시지 */
        .info-message {
          background: #E3F2FD;
          border-left: 4px solid #2196F3;
          padding: 12px 16px;
          border-radius: 4px;
          font-size: 13px;
          color: #1565C0;
          margin-bottom: 12px;
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      screen: String, // 'order-select' | 'work'
      orders: Array,
      selectedOrder: Object,
      orderItems: Array,
      currentItemIndex: Number,
      scanValue: String,
      // 양품 처분
      goodDispositionType: String,
      goodLocationId: String,
      goodStockStatus: String,
      goodScrapMethod: String,
      goodScrapReason: String,
      goodSupplierId: String,
      goodTrackingNo: String,
      goodRepairVendor: String,
      goodRepairDate: String,
      // 불량 처분
      defectDispositionType: String,
      defectLocationId: String,
      defectStockStatus: String,
      defectScrapMethod: String,
      defectScrapReason: String,
      defectSupplierId: String,
      defectTrackingNo: String,
      defectRepairVendor: String,
      defectRepairDate: String,
      // 피드백
      feedbackMsg: String,
      feedbackType: String
    }
  }

  constructor() {
    super()
    this.loading = true
    this.screen = 'order-select'
    this.orders = []
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this.scanValue = ''
    this._resetDispositionForm()
    this.feedbackMsg = ''
    this.feedbackType = ''
  }

  get context() {
    return {
      title: TermsUtil.tMenu('RwaDispositionWork')
    }
  }

  _resetDispositionForm() {
    this.goodDispositionType = ''
    this.goodLocationId = ''
    this.goodStockStatus = 'GOOD'
    this.goodScrapMethod = ''
    this.goodScrapReason = ''
    this.goodSupplierId = ''
    this.goodTrackingNo = ''
    this.goodRepairVendor = ''
    this.goodRepairDate = ''

    this.defectDispositionType = ''
    this.defectLocationId = ''
    this.defectStockStatus = 'DEFECT'
    this.defectScrapMethod = ''
    this.defectScrapReason = ''
    this.defectSupplierId = ''
    this.defectTrackingNo = ''
    this.defectRepairVendor = ''
    this.defectRepairDate = ''
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      ${this.screen === 'order-select' ? this._renderOrderSelect() : this._renderWorkScreen()}
      ${this.feedbackMsg ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>` : ''}
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
            <label>반품 주문 스캔 또는 검색</label>
            <div class="scan-input">
              <input
                type="text"
                placeholder="바코드 스캔 또는 번호 입력"
                .value="${this.scanValue}"
                @input="${e => {
                  this.scanValue = e.target.value
                }}"
                @keydown="${this._onScanKeydown}"
                autofocus
              />
              <button class="scan-btn" @click="${this._onScanSearch}" title="검색">🔍</button>
              <button class="refresh-btn" @click="${this._refresh}" title="새로고침">⟳</button>
            </div>
          </div>

          ${this.orders.length > 0
            ? html`
                <div class="order-list-title">처분 대기 주문 (${this.orders.length}건)</div>
                <div class="order-list">
                  ${this.orders.map(
                    order => html`
                      <div class="order-item" @click="${() => this._selectOrder(order)}">
                        <div class="order-no">${order.rwa_no}</div>
                        <div class="order-info">${order.cust_nm || ''} • 항목 ${this._getItemCount(order)}건</div>
                        <span class="order-badge">${this._statusLabel(order.status)}</span>
                      </div>
                    `
                  )}
                </div>
              `
            : html`
                <div class="empty-state">
                  <span class="empty-icon">🗂️</span>
                  <span class="empty-message">처분 대기 중인 반품이 없습니다</span>
                </div>
              `}
        </div>
      </div>
    `
  }

  _renderWorkScreen() {
    if (!this.selectedOrder || this.orderItems.length === 0) {
      return html`
        <div class="pda-content">
          <div class="loading">항목 로딩 중...</div>
        </div>
      `
    }

    const completedCount = this.orderItems.filter(i => i._completed).length
    const totalCount = this.orderItems.length
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const allCompleted = completedCount === totalCount

    return html`
      <div class="pda-content">
        <!-- 진행률 -->
        <div class="progress-section">
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${allCompleted ? 'complete' : ''}" style="width: ${progressPct}%"></div>
          </div>
          <div class="progress-label">
            <span>처분 진행</span>
            <span>${completedCount} / ${totalCount} (${progressPct}%)</span>
          </div>
        </div>

        <!-- 주문 정보 -->
        <div class="order-info-card">
          <div class="title">${this.selectedOrder.rwa_no}</div>
          <div class="detail-row">
            <span>고객사:</span>
            <span class="value">${this.selectedOrder.cust_nm || '-'}</span>
          </div>
          <div class="detail-row">
            <span>전체 항목:</span>
            <span class="value">${totalCount}건</span>
          </div>
          <div class="detail-row">
            <span>상태:</span>
            <span class="value">${this._statusLabel(this.selectedOrder.status)}</span>
          </div>
        </div>

        <!-- 항목 체크리스트 -->
        <div class="item-checklist">
          <div class="title">처분 항목</div>
          ${this.orderItems.map(
            (item, idx) => html`
              <div
                class="checklist-item ${idx === this.currentItemIndex ? 'active' : ''} ${item._completed
                  ? 'completed'
                  : ''}"
              >
                <span class="icon">${item._completed ? '✓' : idx === this.currentItemIndex ? '●' : '○'}</span>
                <div class="sku-info">
                  <div class="sku-name">${item.sku_cd || '-'}</div>
                  <div class="qty">
                    양품 <span class="good">${item.good_qty || 0}</span> / 불량
                    <span class="defect">${item.defect_qty || 0}</span>
                  </div>
                </div>
              </div>
            `
          )}
        </div>

        <!-- 현재 항목 처분 폼 -->
        ${!allCompleted ? this._renderDispositionForm() : this._renderCompletionMessage()}

        <!-- 하단 액션 버튼 -->
        ${!allCompleted
          ? html`
              <div class="action-buttons">
                <button class="action-btn secondary" @click="${this._skipItem}">스킵</button>
                <button class="action-btn primary" @click="${this._completeDisposition}">처분 확정</button>
              </div>
            `
          : html`
              <div class="action-buttons">
                <button class="action-btn secondary" @click="${this._finishWork}">작업 종료</button>
                <button class="action-btn success" @click="${this._completeAndFinish}">주문 완료</button>
              </div>
            `}
      </div>
    `
  }

  _renderDispositionForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return ''

    const hasGood = (item.good_qty || 0) > 0
    const hasDefect = (item.defect_qty || 0) > 0

    return html`
      <div class="disposition-form">
        <div class="form-title">🗂️ 현재 항목 처분 결정</div>

        <div class="info-message">
          ✓ 검수 완료: 양품 <strong>${item.good_qty || 0}</strong> / 불량 <strong>${item.defect_qty || 0}</strong>
        </div>

        <!-- SKU 정보 -->
        <div class="disposition-section" style="background: #E3F2FD; border-left: 4px solid #2196F3;">
          <div style="font-size: 14px; color: #1565C0; margin-bottom: 8px;">
            <strong>상품 정보</strong>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
            상품 코드: <strong style="color: #333;">${item.sku_cd || '-'}</strong>
          </div>
          <div style="font-size: 13px; color: #666;">
            상품명: <strong style="color: #333;">${item.sku_nm || '-'}</strong>
          </div>
        </div>

        <!-- 양품 처분 -->
        ${hasGood ? this._renderGoodDisposition(item) : ''}

        <!-- 불량 처분 -->
        ${hasDefect ? this._renderDefectDisposition(item) : ''}
      </div>
    `
  }

  _renderGoodDisposition(item) {
    return html`
      <div class="disposition-section">
        <div class="section-header good">
          ✓ 양품 처분 <span class="qty-badge">${item.good_qty} EA</span>
        </div>

        <div class="form-group">
          <label>처분 유형 <span class="required">*</span></label>
          <div class="disposition-type-group">
            ${this._renderDispositionTypeOption('good', 'RESTOCK', '재입고')}
            ${this._renderDispositionTypeOption('good', 'SCRAP', '폐기')}
            ${this._renderDispositionTypeOption('good', 'RETURN_VENDOR', '공급사 반송')}
            ${this._renderDispositionTypeOption('good', 'REPAIR', '수리/재가공')}
          </div>
        </div>

        ${this._renderDispositionTypeFields('good', this.goodDispositionType)}
      </div>
    `
  }

  _renderDefectDisposition(item) {
    return html`
      <div class="disposition-section">
        <div class="section-header defect">
          ✗ 불량 처분 <span class="qty-badge">${item.defect_qty} EA</span>
        </div>

        <div class="form-group">
          <label>처분 유형 <span class="required">*</span></label>
          <div class="disposition-type-group">
            ${this._renderDispositionTypeOption('defect', 'SCRAP', '폐기')}
            ${this._renderDispositionTypeOption('defect', 'RETURN_VENDOR', '공급사 반송')}
            ${this._renderDispositionTypeOption('defect', 'REPAIR', '수리/재가공')}
            ${this._renderDispositionTypeOption('defect', 'RESTOCK', '재입고 (B급)')}
          </div>
        </div>

        ${this._renderDispositionTypeFields('defect', this.defectDispositionType)}
      </div>
    `
  }

  _renderDispositionTypeOption(target, value, label) {
    const currentValue = target === 'good' ? this.goodDispositionType : this.defectDispositionType
    const isSelected = currentValue === value

    return html`
      <div class="disposition-type-item ${isSelected ? 'selected' : ''}">
        <input
          type="radio"
          name="${target}-disposition-type"
          .value="${value}"
          .checked="${isSelected}"
          @change="${() => this._onDispositionTypeChange(target, value)}"
          id="${target}-${value}"
        />
        <label for="${target}-${value}">${label}</label>
      </div>
    `
  }

  _renderDispositionTypeFields(target, type) {
    if (!type) return ''

    const prefix = target === 'good' ? 'good' : 'defect'

    switch (type) {
      case 'RESTOCK':
        return html`
          <div class="form-group">
            <label>재입고 로케이션 <span class="required">*</span></label>
            <input
              type="text"
              placeholder="예: A-01-05"
              .value="${this[`${prefix}LocationId`]}"
              @input="${e => {
                this[`${prefix}LocationId`] = e.target.value
              }}"
            />
          </div>
          <div class="form-group">
            <label>재고 상태 <span class="required">*</span></label>
            <select
              .value="${this[`${prefix}StockStatus`]}"
              @change="${e => {
                this[`${prefix}StockStatus`] = e.target.value
              }}"
            >
              <option value="GOOD">양품</option>
              <option value="GRADE_B">B급</option>
              <option value="DISCOUNT">할인 상품</option>
              <option value="SAMPLE">샘플</option>
            </select>
          </div>
        `

      case 'SCRAP':
        return html`
          <div class="form-group">
            <label>폐기 방법 <span class="required">*</span></label>
            <select
              .value="${this[`${prefix}ScrapMethod`]}"
              @change="${e => {
                this[`${prefix}ScrapMethod`] = e.target.value
              }}"
            >
              <option value="">선택하세요</option>
              <option value="INCINERATION">소각</option>
              <option value="LANDFILL">매립</option>
              <option value="RECYCLE">재활용</option>
              <option value="DESTRUCTION">파쇄/파기</option>
            </select>
          </div>
          <div class="form-group">
            <label>폐기 사유 <span class="required">*</span></label>
            <textarea
              placeholder="폐기 사유를 상세히 기록하세요"
              .value="${this[`${prefix}ScrapReason`]}"
              @input="${e => {
                this[`${prefix}ScrapReason`] = e.target.value
              }}"
            ></textarea>
          </div>
        `

      case 'RETURN_VENDOR':
        return html`
          <div class="form-group">
            <label>공급사 <span class="required">*</span></label>
            <input
              type="text"
              placeholder="공급사 코드 또는 이름"
              .value="${this[`${prefix}SupplierId`]}"
              @input="${e => {
                this[`${prefix}SupplierId`] = e.target.value
              }}"
            />
          </div>
          <div class="form-group">
            <label>반송 운송장 번호</label>
            <input
              type="text"
              placeholder="운송장 번호 입력"
              .value="${this[`${prefix}TrackingNo`]}"
              @input="${e => {
                this[`${prefix}TrackingNo`] = e.target.value
              }}"
            />
          </div>
        `

      case 'REPAIR':
        return html`
          <div class="form-group">
            <label>수리 업체 <span class="required">*</span></label>
            <input
              type="text"
              placeholder="수리 업체명"
              .value="${this[`${prefix}RepairVendor`]}"
              @input="${e => {
                this[`${prefix}RepairVendor`] = e.target.value
              }}"
            />
          </div>
          <div class="form-group">
            <label>예상 완료일</label>
            <input
              type="date"
              .value="${this[`${prefix}RepairDate`]}"
              @input="${e => {
                this[`${prefix}RepairDate`] = e.target.value
              }}"
            />
          </div>
        `

      default:
        return ''
    }
  }

  _renderCompletionMessage() {
    return html`
      <div class="order-info-card" style="text-align: center; background: #E8F5E9; border: 2px solid #4CAF50;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <div style="font-size: 18px; font-weight: 700; color: #2E7D32;">모든 항목 처분 완료!</div>
        <div style="font-size: 14px; color: #666; margin-top: 8px;">
          주문 완료 버튼을 눌러 재고 처리를 진행하거나, 작업 종료 버튼으로 나중에 처리할 수 있습니다.
        </div>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

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
      this.loading = this.screen === 'order-select'

      // INSPECTED 상태 주문 조회
      const orders = await ServiceUtil.restGet('rwa_trx/rwa_orders?status=INSPECTED').catch(() => [])
      this.orders = orders || []

      this.loading = false
    } catch (err) {
      console.error('반품 처분 주문 조회 실패:', err)
      this.loading = false
    }
  }

  /* ============================================================
   * 주문 선택
   * ============================================================ */

  async _selectOrder(order) {
    try {
      this.selectedOrder = order
      this.screen = 'work'

      // 항목 조회
      const items = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${order.id}/items`)
      this.orderItems = (items || []).map(item => ({
        ...item,
        _completed: item.disposition_type ? true : false
      }))

      // 첫 미완료 항목으로 이동
      this.currentItemIndex = this.orderItems.findIndex(item => !item._completed)
      if (this.currentItemIndex === -1) {
        this.currentItemIndex = 0
      }

      this._initCurrentItemForm()
    } catch (err) {
      console.error('반품 항목 조회 실패:', err)
      UiUtil.showToast('error', '항목 조회 실패')
    }
  }

  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this._refresh()
  }

  _onScanKeydown(e) {
    if (e.key === 'Enter') {
      this._onScanSearch()
    }
  }

  _onScanSearch() {
    if (!this.scanValue.trim()) return

    const found = this.orders.find(
      order => order.rwa_no && order.rwa_no.toUpperCase().includes(this.scanValue.toUpperCase())
    )

    if (found) {
      this._selectOrder(found)
      this.scanValue = ''
    } else {
      this._showFeedback('error', '해당 반품 주문을 찾을 수 없습니다')
      voiceService.error('해당 반품 주문을 찾을 수 없습니다')
    }
  }

  /* ============================================================
   * 처분 처리
   * ============================================================ */

  _initCurrentItemForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return

    this._resetDispositionForm()

    // 양품이 있으면 기본값: 재입고
    if ((item.good_qty || 0) > 0) {
      this.goodDispositionType = 'RESTOCK'
    }

    // 불량이 있으면 기본값: 폐기
    if ((item.defect_qty || 0) > 0) {
      this.defectDispositionType = 'SCRAP'
    }
  }

  _onDispositionTypeChange(target, value) {
    if (target === 'good') {
      this.goodDispositionType = value
    } else {
      this.defectDispositionType = value
    }
    this.requestUpdate()
  }

  async _completeDisposition() {
    const item = this.orderItems[this.currentItemIndex]

    // 유효성 검증
    const hasGood = (item.good_qty || 0) > 0
    const hasDefect = (item.defect_qty || 0) > 0

    if (hasGood && !this.goodDispositionType) {
      UiUtil.showToast('error', '양품 처분 유형을 선택하세요')
      return
    }

    if (hasDefect && !this.defectDispositionType) {
      UiUtil.showToast('error', '불량 처분 유형을 선택하세요')
      return
    }

    // 필수 입력 검증
    if (hasGood && !this._validateDispositionFields('good', this.goodDispositionType)) {
      return
    }

    if (hasDefect && !this._validateDispositionFields('defect', this.defectDispositionType)) {
      return
    }

    try {
      // 양품 처분 API 호출
      if (hasGood) {
        await this._callDisposeAPI(item, 'GOOD', this.goodDispositionType, 'good')
      }

      // 불량 처분 API 호출
      if (hasDefect) {
        await this._callDisposeAPI(item, 'DEFECT', this.defectDispositionType, 'defect')
      }

      // 음성 피드백
      voiceService.success(`${item.sku_cd} 처분 완료`)

      // 완료 표시
      this.orderItems[this.currentItemIndex]._completed = true

      // 다음 항목으로 이동
      this._moveToNextItem()
    } catch (err) {
      console.error('처분 처리 실패:', err)
      UiUtil.showToast('error', err.message || '처분 처리 실패')
    }
  }

  _validateDispositionFields(prefix, type) {
    switch (type) {
      case 'RESTOCK':
        if (!this[`${prefix}LocationId`]) {
          UiUtil.showToast('error', '재입고 로케이션을 입력하세요')
          return false
        }
        break

      case 'SCRAP':
        if (!this[`${prefix}ScrapMethod`]) {
          UiUtil.showToast('error', '폐기 방법을 선택하세요')
          return false
        }
        if (!this[`${prefix}ScrapReason`]) {
          UiUtil.showToast('error', '폐기 사유를 입력하세요')
          return false
        }
        break

      case 'RETURN_VENDOR':
        if (!this[`${prefix}SupplierId`]) {
          UiUtil.showToast('error', '공급사를 입력하세요')
          return false
        }
        break

      case 'REPAIR':
        if (!this[`${prefix}RepairVendor`]) {
          UiUtil.showToast('error', '수리 업체를 입력하세요')
          return false
        }
        break
    }

    return true
  }

  async _callDisposeAPI(item, qualityType, dispositionType, prefix) {
    const payload = {
      qualityType,
      dispositionType,
      disposedQty: qualityType === 'GOOD' ? item.good_qty : item.defect_qty
    }

    // 처분 유형별 추가 필드
    switch (dispositionType) {
      case 'RESTOCK':
        payload.locationId = this[`${prefix}LocationId`]
        payload.stockStatus = this[`${prefix}StockStatus`]
        break

      case 'SCRAP':
        payload.scrapMethod = this[`${prefix}ScrapMethod`]
        payload.scrapReason = this[`${prefix}ScrapReason`]
        break

      case 'RETURN_VENDOR':
        payload.supplierId = this[`${prefix}SupplierId`]
        payload.trackingNo = this[`${prefix}TrackingNo`] || null
        break

      case 'REPAIR':
        payload.repairVendor = this[`${prefix}RepairVendor`]
        payload.estimatedDate = this[`${prefix}RepairDate`] || null
        break
    }

    await ServiceUtil.restPost(`rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/dispose`, payload)
  }

  _skipItem() {
    this.orderItems[this.currentItemIndex]._skipped = true
    this._moveToNextItem()
  }

  _moveToNextItem() {
    const nextIndex = this.orderItems.findIndex((item, idx) => idx > this.currentItemIndex && !item._completed)

    if (nextIndex !== -1) {
      this.currentItemIndex = nextIndex
      this._initCurrentItemForm()
    } else {
      // 모든 항목 완료
      voiceService.success('모든 항목 처분 완료')
      this._showFeedback('success', '모든 항목 처분 완료! 주문 완료 또는 작업 종료를 선택하세요')
    }

    // 강제 리렌더링
    this.requestUpdate()
  }

  async _finishWork() {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${this.selectedOrder.rwa_no} 처분 작업을 종료하시겠습니까?`,
      'question',
      'confirm',
      'cancel'
    )

    if (result.confirmButton) {
      this._backToOrderSelect()
      UiUtil.showToast('success', '처분 작업 종료')
    }
  }

  async _completeAndFinish() {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${this.selectedOrder.rwa_no} 주문을 완료 처리하시겠습니까?\n재고 처리가 진행됩니다.`,
      'question',
      'confirm',
      'cancel'
    )

    if (result.confirmButton) {
      try {
        await ServiceUtil.restPost(`rwa_trx/rwa_orders/${this.selectedOrder.id}/complete`)
        voiceService.success('주문 완료 처리되었습니다')
        UiUtil.showToast('success', `${this.selectedOrder.rwa_no} 주문 완료`)
        this._backToOrderSelect()
      } catch (err) {
        console.error('주문 완료 실패:', err)
        voiceService.error('주문 완료 처리에 실패했습니다')
        UiUtil.showToast('error', err.message || '주문 완료 실패')
      }
    }
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _showFeedback(type, message) {
    this.feedbackType = type
    this.feedbackMsg = message
    setTimeout(() => {
      this.feedbackMsg = ''
    }, 2000)
  }

  _statusLabel(status) {
    const map = {
      INSPECTED: '검수완료',
      DISPOSED: '처분완료'
    }
    return map[status] || status || '-'
  }

  _getItemCount(order) {
    return order.item_count || order.items?.length || '-'
  }
}

window.customElements.define('rwa-disposition-work', RwaDispositionWork)
