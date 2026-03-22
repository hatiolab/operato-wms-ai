import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * RWA 반품 검수 작업 화면 (PDA)
 *
 * 화면 모드:
 * - 주문 선택 모드: 검수 가능한 반품 주문 목록 + 바코드 스캔
 * - 검수 작업 모드: 항목 체크리스트 + 현재 항목 검수 폼
 *
 * 작업 흐름:
 * 1. 주문 선택 (바코드 스캔 또는 목록에서 클릭)
 * 2. 항목별 검수 처리 (양품/불량 수량, 불량 유형, 사진 첨부)
 * 3. 다음 항목 자동 이동
 * 4. 모든 항목 완료 후 검수 완료
 *
 * PDA 최적화:
 * - 큰 터치 버튼, 큰 폰트
 * - 바코드 스캔 자동 포커스
 * - 음성 피드백
 */
class RwaInspectionWork extends localize(i18next)(PageView) {
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

        .order-badge.RECEIVING {
          background: #E0F7FA;
          color: #00838F;
        }

        .order-badge.INSPECTING {
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
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        /* 현재 항목 검수 폼 */
        .current-item-form {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .current-item-form .form-title {
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
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 6px;
        }

        .form-group label .required {
          color: #F44336;
        }

        .form-group input[type="number"],
        .form-group input[type="text"],
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
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-group .qty-input-group {
          display: flex;
          gap: 12px;
        }

        .form-group .qty-input-group > div {
          flex: 1;
        }

        /* 사진 첨부 */
        .photo-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .photo-upload {
          border: 2px dashed var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          padding: 16px 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .photo-upload.camera,
        .photo-upload.gallery {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
        }

        .photo-upload.camera {
          background: #E3F2FD;
          border-color: #90CAF9;
          color: #1565C0;
        }

        .photo-upload.gallery {
          background: #F3E5F5;
          border-color: #CE93D8;
          color: #6A1B9A;
        }

        .photo-upload.camera:active,
        .photo-upload.gallery:active {
          transform: scale(0.98);
        }

        .photo-upload input[type="file"] {
          display: none;
        }

        .photo-preview {
          margin-top: 12px;
        }

        .photo-preview img {
          max-width: 300px;
          max-height: 300px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .photo-remove {
          margin-top: 8px;
          padding: 6px 12px;
          background: #F44336;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
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
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
        }

        .action-btn.primary:hover {
          background: #1565C0;
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
      goodQty: Number,
      defectQty: Number,
      defectType: String,
      defectDesc: String,
      photoFile: Object,
      photoPreview: String,
      remarks: String,
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
    this.goodQty = 0
    this.defectQty = 0
    this.defectType = ''
    this.defectDesc = ''
    this.photoFile = null
    this.photoPreview = null
    this.remarks = ''
    this.feedbackMsg = ''
    this.feedbackType = ''
  }

  get context() {
    return {
      title: TermsUtil.tMenu('RwaInspectionWork')
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
          <label>반품 주문 스캔 또는 검색</label>
          <div class="scan-input">
            <input
              type="text"
              placeholder="바코드 스캔 또는 번호 입력"
              .value="${this.scanValue}"
              @input="${e => { this.scanValue = e.target.value }}"
              @keydown="${this._onScanKeydown}"
              autofocus
            />
            <button class="scan-btn" @click="${this._onScanSearch}" title="검색">🔍</button>
            <button class="refresh-btn" @click="${this._refresh}" title="새로고침">⟳</button>
          </div>
        </div>

        ${this.orders.length > 0
          ? html`
              <div class="order-list-title">검수 가능 주문 (${this.orders.length}건)</div>
              <div class="order-list">
                ${this.orders.map(order => html`
                  <div class="order-item" @click="${() => this._selectOrder(order)}">
                    <div class="order-no">${order.rwa_no}</div>
                    <div class="order-info">
                      ${order.cust_nm || ''} • 항목 ${this._getItemCount(order)}건
                    </div>
                    <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
                  </div>
                `)}
              </div>
            `
          : html`
              <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <span class="empty-message">검수 대기 중인 반품이 없습니다</span>
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
          <div
            class="progress-bar-fill ${allCompleted ? 'complete' : ''}"
            style="width: ${progressPct}%"
          ></div>
        </div>
        <div class="progress-label">
          <span>검수 진행</span>
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
        <div class="title">검수 항목</div>
        ${this.orderItems.map((item, idx) => html`
          <div class="checklist-item ${idx === this.currentItemIndex ? 'active' : ''} ${item._completed ? 'completed' : ''}">
            <span class="icon">${item._completed ? '✓' : idx === this.currentItemIndex ? '●' : '○'}</span>
            <div class="sku-info">
              <div class="sku-name">${item.sku_cd || '-'}</div>
              <div class="qty">입고: ${item.rwa_qty || 0} EA</div>
            </div>
          </div>
        `)}
      </div>

      <!-- 현재 항목 검수 폼 -->
      ${!allCompleted ? this._renderInspectionForm() : this._renderCompletionMessage()}

      <!-- 하단 액션 버튼 -->
      ${!allCompleted
        ? html`
            <div class="action-buttons">
              <button class="action-btn secondary" @click="${this._skipItem}">스킵</button>
              <button class="action-btn primary" @click="${this._completeInspection}">검수 완료</button>
            </div>
          `
        : html`
            <div class="action-buttons">
              <button class="action-btn success" @click="${this._finishWork}">작업 종료</button>
            </div>
          `}
      </div>
    `
  }

  _renderInspectionForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return ''

    return html`
      <div class="current-item-form">
        <div class="form-title">🔍 현재 항목 검수</div>

        <!-- SKU 정보 -->
        <div class="form-group">
          <label>상품 코드</label>
          <input type="text" .value="${item.sku_cd || '-'}" readonly />
        </div>

        <div class="form-group">
          <label>상품명</label>
          <input type="text" .value="${item.sku_nm || '-'}" readonly />
        </div>

        <div class="form-group">
          <label>입고 수량</label>
          <input type="number" .value="${item.rwa_qty || 0}" readonly />
        </div>

        <!-- 양품/불량 수량 -->
        <div class="form-group">
          <label>수량 입력 <span class="required">*</span></label>
          <div class="qty-input-group">
            <div>
              <label>양품</label>
              <input
                type="number"
                min="0"
                .value="${this.goodQty}"
                @input="${e => { this.goodQty = Number(e.target.value) }}"
                placeholder="0"
              />
            </div>
            <div>
              <label>불량</label>
              <input
                type="number"
                min="0"
                .value="${this.defectQty}"
                @input="${e => { this.defectQty = Number(e.target.value) }}"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <!-- 불량 유형 -->
        ${this.defectQty > 0
          ? html`
              <div class="form-group">
                <label>불량 유형 <span class="required">*</span></label>
                <select .value="${this.defectType}" @change="${e => { this.defectType = e.target.value }}">
                  <option value="">선택하세요</option>
                  <option value="DAMAGED">파손/손상</option>
                  <option value="EXPIRED">유통기한 경과</option>
                  <option value="WRONG_ITEM">상품 오배송</option>
                  <option value="MISSING_PARTS">부품 누락</option>
                  <option value="FUNCTIONAL_DEFECT">기능 불량</option>
                </select>
              </div>

              <div class="form-group">
                <label>불량 설명</label>
                <textarea
                  .value="${this.defectDesc}"
                  @input="${e => { this.defectDesc = e.target.value }}"
                  placeholder="불량 상태를 상세히 기록하세요"
                ></textarea>
              </div>
            `
          : ''}

        <!-- 사진 첨부 -->
        <div class="form-group">
          <label>사진 첨부 (선택)</label>
          <div class="photo-actions">
            <div class="photo-upload camera" @click="${this._openCamera}">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                @change="${this._onPhotoSelect}"
                id="cameraInput"
              />
              <span>📷 카메라 촬영</span>
            </div>
            <div class="photo-upload gallery" @click="${this._openGallery}">
              <input
                type="file"
                accept="image/*"
                @change="${this._onPhotoSelect}"
                id="galleryInput"
              />
              <span>🖼️ 갤러리 선택</span>
            </div>
          </div>
          ${this.photoPreview
            ? html`
                <div class="photo-preview">
                  <img src="${this.photoPreview}" alt="검수 사진" />
                  <br />
                  <button class="photo-remove" @click="${this._removePhoto}">사진 삭제</button>
                </div>
              `
            : ''}
        </div>

        <!-- 비고 -->
        <div class="form-group">
          <label>비고</label>
          <textarea
            .value="${this.remarks}"
            @input="${e => { this.remarks = e.target.value }}"
            placeholder="추가 메모"
          ></textarea>
        </div>
      </div>
    `
  }

  _renderCompletionMessage() {
    return html`
      <div class="order-info-card" style="text-align: center; background: #E8F5E9; border: 2px solid #4CAF50;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <div style="font-size: 18px; font-weight: 700; color: #2E7D32;">모든 항목 검수 완료!</div>
        <div style="font-size: 14px; color: #666; margin-top: 8px;">
          작업 종료 버튼을 눌러 주문 선택 화면으로 돌아가세요.
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

      // RECEIVING + INSPECTING 상태 주문 조회
      const [receivingOrders, inspectingOrders] = await Promise.all([
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=RECEIVING').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=INSPECTING').catch(() => [])
      ])
      this.orders = [...(receivingOrders || []), ...(inspectingOrders || [])]

      this.loading = false
    } catch (err) {
      console.error('반품 검수 주문 조회 실패:', err)
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
        _completed: (item.good_qty || 0) > 0 || (item.defect_qty || 0) > 0
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
      this._speak('해당 반품 주문을 찾을 수 없습니다')
    }
  }

  /* ============================================================
   * 검수 처리
   * ============================================================ */

  _initCurrentItemForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return

    this.goodQty = item.rwa_qty || 0  // 기본값: 입고수량 전량 양품
    this.defectQty = 0
    this.defectType = ''
    this.defectDesc = ''
    this.photoFile = null
    this.photoPreview = null
    this.remarks = ''
  }

  _openCamera() {
    const input = this.shadowRoot.querySelector('#cameraInput')
    if (input) input.click()
  }

  _openGallery() {
    const input = this.shadowRoot.querySelector('#galleryInput')
    if (input) input.click()
  }

  _onPhotoSelect(e) {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) {
      UiUtil.showToast('error', '이미지 파일만 첨부 가능합니다')
      return
    }

    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      UiUtil.showToast('error', '파일 크기는 5MB 이하만 가능합니다')
      return
    }

    this.photoFile = file

    // 미리보기
    const reader = new FileReader()
    reader.onload = (event) => {
      this.photoPreview = event.target.result
    }
    reader.readAsDataURL(file)
  }

  _removePhoto() {
    this.photoFile = null
    this.photoPreview = null

    const cameraInput = this.shadowRoot.querySelector('#cameraInput')
    if (cameraInput) cameraInput.value = ''
    const galleryInput = this.shadowRoot.querySelector('#galleryInput')
    if (galleryInput) galleryInput.value = ''
  }

  async _completeInspection() {
    const item = this.orderItems[this.currentItemIndex]

    // 유효성 검증
    if ((this.goodQty === null || this.goodQty === 0) && (this.defectQty === null || this.defectQty === 0)) {
      UiUtil.showToast('error', '양품 또는 불량 수량을 입력하세요')
      return
    }

    if (this.defectQty > 0 && !this.defectType) {
      UiUtil.showToast('error', '불량 수량이 있으면 불량 유형을 선택하세요')
      return
    }

    try {
      // 사진 Base64 변환
      let photoUrl = null
      if (this.photoFile) {
        photoUrl = await this._convertPhotoToBase64(this.photoFile)
      }

      // 검수 API 호출
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/inspect`,
        {
          inspType: 'VISUAL',
          inspQty: (this.goodQty || 0) + (this.defectQty || 0),
          goodQty: this.goodQty || 0,
          defectQty: this.defectQty || 0,
          defectType: this.defectType || null,
          defectDesc: this.defectDesc || null,
          photoUrl: photoUrl,
          remarks: this.remarks || null
        }
      )

      // 음성 피드백
      this._speak(`${item.sku_cd} 검수 완료`)

      // 완료 표시
      this.orderItems[this.currentItemIndex]._completed = true

      // 다음 항목으로 이동
      this._moveToNextItem()
    } catch (err) {
      console.error('검수 처리 실패:', err)
      UiUtil.showToast('error', err.message || '검수 처리 실패')
    }
  }

  async _convertPhotoToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  _skipItem() {
    this.orderItems[this.currentItemIndex]._skipped = true
    this._moveToNextItem()
  }

  _moveToNextItem() {
    const nextIndex = this.orderItems.findIndex((item, idx) =>
      idx > this.currentItemIndex && !item._completed
    )

    if (nextIndex !== -1) {
      this.currentItemIndex = nextIndex
      this._initCurrentItemForm()
    } else {
      // 모든 항목 완료
      this._showFeedback('success', '모든 항목 검수 완료! 작업 종료 버튼을 눌러주세요')
    }

    // 강제 리렌더링
    this.requestUpdate()
  }

  async _finishWork() {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      `${this.selectedOrder.rwa_no} 검수 작업을 종료하시겠습니까?`,
      'question',
      'confirm',
      'cancel'
    )

    if (result.confirmButton) {
      this._backToOrderSelect()
      UiUtil.showToast('success', '검수 작업 종료')
    }
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _speak(message) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.lang = 'ko-KR'
      utterance.rate = 1.1
      window.speechSynthesis.speak(utterance)
    }
  }

  _showFeedback(type, message) {
    this.feedbackType = type
    this.feedbackMsg = message
    setTimeout(() => {
      this.feedbackMsg = ''
    }, 2000)
  }

  _statusLabel(status) {
    const map = {
      RECEIVING: '입고완료',
      INSPECTING: '검수중',
      INSPECTED: '검수완료'
    }
    return map[status] || status || '-'
  }

  _getItemCount(order) {
    // 주문 객체에서 항목 수 추정 (실제 API 응답에 따라 조정 필요)
    return order.item_count || order.items?.length || '-'
  }
}

window.customElements.define('rwa-inspection-work', RwaInspectionWork)
