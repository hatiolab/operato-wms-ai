import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxInputBarcode } from '@operato/input'

/**
 * VAS PDA 실적 등록 화면
 *
 * 화면 모드:
 * - 주문 선택 모드: IN_PROGRESS 상태 VAS 주문 목록 + 바코드 스캔
 * - 실적 등록 모드: 완성/불량 수량 입력 → 적치 로케이션 스캔 → 작업 완료
 *
 * 작업 흐름:
 * 1. 주문 선택 (바코드 스캔 또는 목록에서 클릭)
 * 2. Step 1: 완성 수량 + 불량 수량 입력 → [실적 등록]
 * 3. Step 2: 적치 로케이션 바코드 스캔 → [작업 완료]
 * 4. 주문 선택 화면으로 자동 복귀
 *
 * PDA 최적화:
 * - OxInputBarcode 바코드 스캔 컴포넌트
 * - 큰 터치 버튼, 큰 폰트
 * - 음성 피드백
 */
class VasPdaResult extends localize(i18next)(PageView) {
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

        .order-badge.IN_PROGRESS {
          background: #FFF3E0;
          color: #E65100;
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

        /* 스텝 인디케이터 */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 20px;
        }

        .step-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .step-dot.active {
          background: #FF9800;
          color: #fff;
        }

        .step-dot.completed {
          background: #4CAF50;
          color: #fff;
        }

        .step-line {
          width: 40px;
          height: 3px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
        }

        .step-line.active {
          background: #4CAF50;
        }

        /* 실적 입력 폼 */
        .result-form {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .result-form .section-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #E65100;
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

        .form-group input {
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

        .warning-msg {
          color: #F44336;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          padding: 8px;
          background: #FFEBEE;
          border-radius: 8px;
          margin-top: 8px;
        }

        /* 로케이션 안내 */
        .location-section {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .location-section .section-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #E65100;
        }

        .location-section ox-input-barcode {
          width: 100%;
          --barcodescan-input-font-size: 16px;
          --barcodescan-input-padding: 12px;
          --barcodescan-input-border-radius: 8px;
        }

        .location-display {
          background: #FFF3E0;
          border: 2px solid #FF9800;
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
          text-align: center;
        }

        .location-display .loc-label {
          font-size: 13px;
          font-weight: 600;
          color: #E65100;
          margin-bottom: 4px;
        }

        .location-display .loc-value {
          font-size: 28px;
          font-weight: 700;
          color: #E65100;
        }

        /* 등록 완료 뱃지 */
        .result-registered {
          text-align: center;
          background: #E8F5E9;
          border: 2px solid #4CAF50;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .result-registered .icon {
          font-size: 32px;
          margin-bottom: 4px;
        }

        .result-registered .message {
          font-size: 16px;
          font-weight: 700;
          color: #2E7D32;
        }

        .result-registered .detail {
          font-size: 14px;
          color: #666;
          margin-top: 4px;
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
          width: 100%;
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
      step: Number,
      resultQty: Number,
      defectQty: Number,
      destLocCd: String,
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
    this.step = 1
    this.resultQty = 0
    this.defectQty = 0
    this.destLocCd = ''
    this.feedbackMsg = ''
    this.feedbackType = ''
  }

  get context() {
    return {
      title: TermsUtil.tMenu('VasPdaResult')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      ${this.screen === 'order-select'
        ? this._renderOrderSelect()
        : this._renderResultWork()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
    `
  }

  /* ============================================================
   * 주문 선택 화면
   * ============================================================ */

  /** 주문 선택 화면 렌더링 (IN_PROGRESS 상태 주문) */
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
                <div class="order-list-title">실적 등록 대상 주문 (${this.orders.length}건)</div>
                <div class="order-list">
                  ${this.orders.map(order => this._renderOrderCard(order))}
                </div>
              `
            : html`
                <div class="empty-state">
                  <span class="empty-icon">\u{1F4CB}</span>
                  <span class="empty-text">실적 등록 대상 주문이 없습니다</span>
                </div>
              `}
      </div>
    `
  }

  /** 주문 카드 렌더링 */
  _renderOrderCard(order) {
    const bom = this.bomMap[order.vas_bom_id]

    return html`
      <div class="order-item" @click="${() => this._selectOrder(order)}">
        <div class="order-no">${order.vas_no || '-'}</div>
        <div class="order-info">
          ${this._vasTypeLabel(order.vas_type)} | ${bom?.set_sku_cd || '-'} / ${bom?.set_sku_nm || '-'}
        </div>
        <div class="order-info">
          계획: ${order.plan_qty || 0} EA | 완성: ${order.completed_qty || 0} EA
        </div>
        <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
      </div>
    `
  }

  /* ============================================================
   * 실적 등록 화면
   * ============================================================ */

  /** 실적 등록 화면 렌더링 */
  _renderResultWork() {
    if (!this.selectedOrder) return ''

    return html`
      <div class="pda-content">
        ${this._renderStepIndicator()}
        ${this._renderOrderSummary()}
        ${this.step === 1 ? this._renderStep1ResultInput() : this._renderStep2Putaway()}
        <div class="bottom-actions">
          <button class="pda-btn warning" @click="${this._backToOrderSelect}">주문 목록으로</button>
        </div>
      </div>
    `
  }

  /** 2단계 스텝 인디케이터 */
  _renderStepIndicator() {
    return html`
      <div class="step-indicator">
        <div class="step-dot ${this.step === 1 ? 'active' : this.step > 1 ? 'completed' : ''}">
          ${this.step > 1 ? '\u2713' : '1'}
        </div>
        <div class="step-line ${this.step > 1 ? 'active' : ''}"></div>
        <div class="step-dot ${this.step === 2 ? 'active' : ''}">2</div>
      </div>
    `
  }

  /** 주문 요약 카드 */
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
        <div class="detail-row">
          <span>기등록 완성</span>
          <span class="value">${order.completed_qty || 0} EA</span>
        </div>
      </div>
    `
  }

  /** Step 1: 완성/불량 수량 입력 */
  _renderStep1ResultInput() {
    const planQty = this.selectedOrder?.plan_qty || 0
    const totalQty = (this.resultQty || 0) + (this.defectQty || 0)
    const isOver = totalQty > planQty

    return html`
      <div class="result-form">
        <div class="section-title">1단계: 실적 수량 입력</div>

        <div class="form-group">
          <label>완성 수량</label>
          <div class="qty-input-group">
            <input
              type="number"
              inputmode="numeric"
              placeholder="0"
              .value="${this.resultQty || ''}"
              @input="${e => { this.resultQty = parseInt(e.target.value) || 0 }}"
            />
            <span class="qty-label">/ ${planQty} EA</span>
          </div>
        </div>

        <div class="form-group">
          <label>불량 수량</label>
          <div class="qty-input-group">
            <input
              type="number"
              inputmode="numeric"
              placeholder="0"
              .value="${this.defectQty || ''}"
              @input="${e => { this.defectQty = parseInt(e.target.value) || 0 }}"
            />
            <span class="qty-label">EA</span>
          </div>
        </div>

        ${isOver
          ? html`<div class="warning-msg">\u26A0 완성 + 불량(${totalQty})이 계획 수량(${planQty})을 초과합니다</div>`
          : ''}

        <div style="margin-top: 16px;">
          <button class="pda-btn primary" @click="${this._registerResult}">실적 등록</button>
        </div>
      </div>
    `
  }

  /** Step 2: 적치 로케이션 스캔 + 작업 완료 */
  _renderStep2Putaway() {
    return html`
      <div class="result-registered">
        <div class="icon">\u2705</div>
        <div class="message">실적 등록 완료</div>
        <div class="detail">완성: ${this.resultQty} EA / 불량: ${this.defectQty} EA</div>
      </div>

      <div class="location-section">
        <div class="section-title">2단계: 적치 로케이션</div>

        <div class="scan-input-group" style="margin-bottom: 0;">
          <label>적치 로케이션 바코드 스캔</label>
          <ox-input-barcode
            placeholder="로케이션 스캔"
            @change="${e => this._onLocBarcodeScan(e.target.value)}"
          ></ox-input-barcode>
        </div>

        ${this.destLocCd
          ? html`
              <div class="location-display">
                <div class="loc-label">적치 로케이션</div>
                <div class="loc-value">${this.destLocCd}</div>
              </div>
            `
          : ''}

        <div style="margin-top: 16px;">
          <button class="pda-btn success" @click="${this._completeWork}" ?disabled="${!this.destLocCd}">작업 완료</button>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  /** 페이지 활성화 시 주문 목록 자동 조회 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active && this.screen === 'order-select') {
      await this._refresh()
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** IN_PROGRESS 주문 목록 + BOM 캐시 조회 */
  async _refresh() {
    try {
      this.loading = true
      const data = await ServiceUtil.restGet('vas_trx/monitor/orders', {
        status: 'IN_PROGRESS'
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

  /** BOM 정보 일괄 조회 (캐시) */
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

  /* ============================================================
   * 주문 선택 / 화면 전환
   * ============================================================ */

  /** 주문 선택 → 실적 등록 화면 전환 */
  _selectOrder(order) {
    this.selectedOrder = order
    this.screen = 'result-work'
    this.step = 1
    this.resultQty = 0
    this.defectQty = 0
    this.destLocCd = ''
  }

  /** 주문 선택 화면으로 복귀 */
  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.step = 1
    this.resultQty = 0
    this.defectQty = 0
    this.destLocCd = ''
    this._refresh()
  }

  /* ============================================================
   * 바코드 스캔 처리
   * ============================================================ */

  /** 주문번호 바코드 스캔 검색 */
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

  /** 적치 로케이션 바코드 스캔 */
  _onLocBarcodeScan(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return

    this.destLocCd = trimmed
    this._showFeedback(`로케이션: ${trimmed}`, 'success')
    this._speakFeedback(`로케이션 ${trimmed} 스캔 완료`)
  }

  /* ============================================================
   * 실적 등록 / 작업 완료
   * ============================================================ */

  /** Step 1: 실적 수량 등록 API 호출 → Step 2로 전환 */
  async _registerResult() {
    if (!this.resultQty || this.resultQty <= 0) {
      this._showFeedback('완성 수량을 입력해주세요', 'error')
      this._speakFeedback('완성 수량을 입력해주세요')
      return
    }

    try {
      await ServiceUtil.restPost(`vas_trx/vas_orders/${this.selectedOrder.id}/results`, {
        result_qty: this.resultQty,
        defect_qty: this.defectQty || 0
      })

      this._showFeedback('실적 등록 완료', 'success')
      this._speakFeedback('실적 등록 완료')
      this.step = 2
    } catch (err) {
      this._showFeedback(err.message || '실적 등록 실패', 'error')
      this._speakFeedback('실적 등록 실패')
    }
  }

  /** Step 2: 작업 완료 API 호출 → 주문 선택 화면 복귀 */
  async _completeWork() {
    if (!this.destLocCd) {
      this._showFeedback('적치 로케이션을 스캔해주세요', 'error')
      this._speakFeedback('로케이션을 스캔해주세요')
      return
    }

    try {
      await ServiceUtil.restPost(`vas_trx/vas_orders/${this.selectedOrder.id}/complete`)

      this._showFeedback('작업 완료!', 'success')
      this._speakFeedback('작업이 완료되었습니다')

      setTimeout(() => {
        this._backToOrderSelect()
      }, 1500)
    } catch (err) {
      this._showFeedback(err.message || '작업 완료 실패', 'error')
      this._speakFeedback('작업 완료 실패')
    }
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** VAS 유형 코드를 한글 라벨로 변환 */
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

  /** 주문 상태 코드를 한글 라벨로 변환 */
  _statusLabel(status) {
    const map = {
      IN_PROGRESS: '작업 중',
      COMPLETED: '완료'
    }
    return map[status] || status || '-'
  }

  /** 화면 하단 피드백 토스트 표시 (2초 후 자동 사라짐) */
  _showFeedback(msg, type = 'info') {
    this.feedbackMsg = msg
    this.feedbackType = type
    if (this._feedbackTimer) clearTimeout(this._feedbackTimer)
    this._feedbackTimer = setTimeout(() => {
      this.feedbackMsg = ''
      this.feedbackType = ''
    }, 2000)
  }

  /** 음성 피드백 (Web Speech API) */
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

window.customElements.define('vas-pda-result', VasPdaResult)
