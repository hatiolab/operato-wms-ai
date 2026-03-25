import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxInputBarcode } from '@operato/input'

import { HardwareScannerService } from './hardware-scanner-service.js'
import { voiceService } from './voice-service.js'

/**
 * B2C 출고 확정 PDA 작업 화면
 *
 * 화면 모드:
 * - order-scan: 출고 지시 선택 (PICKED 상태 목록 + 바코드 스캔)
 * - confirm: 출고 정보 확인 + 운송장 등록 + 출고 확정
 * - complete: 출고 확정 완료 (결과 요약 + 다음 건)
 *
 * 작업 흐름:
 * 1. 출고 지시 선택 (바코드 스캔 또는 목록 클릭)
 * 2. 출고 정보 확인 + 운송장 번호 등록
 * 3. 출고 확정 (PICKED → END)
 * 4. 완료 후 다음 건 또는 3초 자동 복귀
 *
 * Express Mode:
 * - 운송장 스캔 시 자동 확정 → Stage 1 즉시 복귀
 * - 대량 출고 확정 시 최소 터치로 연속 처리
 */
class OutboundReleaseWork extends localize(i18next)(PageView) {
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

        .pda-content {
          padding: 16px;
          max-width: 480px;
          margin: 0 auto;
        }

        /* 헤더 */
        .pda-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .pda-header .title {
          font-size: 18px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .pda-header .actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .icon-btn {
          min-width: 44px;
          min-height: 44px;
          border-radius: 50%;
          border: none;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .icon-btn.voice-on {
          background: var(--md-sys-color-primary, #2196F3);
          color: #fff;
        }

        .icon-btn.voice-off {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .icon-btn.back {
          background: transparent;
          color: var(--md-sys-color-on-surface-variant, #666);
          font-size: 24px;
        }

        /* Express Mode 토글 */
        .express-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--md-sys-color-surface, #fff);
          border-radius: 10px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .express-toggle label {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          flex: 1;
        }

        .express-toggle .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
          background: #ccc;
          border-radius: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .express-toggle .toggle-switch.active {
          background: #4CAF50;
        }

        .express-toggle .toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .express-toggle .toggle-switch.active::after {
          transform: translateX(22px);
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

        /* 출고 지시 목록 */
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

        .order-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 4px solid #FF9800;
        }

        .order-card:active {
          transform: scale(0.98);
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }

        .order-card .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .order-card .order-no {
          font-size: 17px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .order-card .receiver {
          font-size: 15px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .order-card .order-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          font-size: 13px;
          color: #999;
        }

        .order-card .status-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          background: #FFF3E0;
          color: #E65100;
        }

        /* 통계 카드 */
        .stats-row {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .stat-card {
          flex: 1;
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .stat-card .stat-value {
          font-size: 28px;
          font-weight: 700;
        }

        .stat-card .stat-label {
          font-size: 13px;
          color: #999;
          margin-top: 4px;
        }

        .stat-card.pending .stat-value { color: #FF9800; }
        .stat-card.completed .stat-value { color: #4CAF50; }

        /* 정보 섹션 (Stage 2) */
        .info-section {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .info-section .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-primary, #2196F3);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 15px;
          border-bottom: 1px solid #F5F5F5;
        }

        .info-row:last-child { border-bottom: none; }
        .info-row .label { color: #999; min-width: 80px; }
        .info-row .value { font-weight: 500; color: #333; text-align: right; }

        /* 아이템 목록 */
        .item-list {
          max-height: 200px;
          overflow-y: auto;
          margin-top: 8px;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #F0F0F0;
          font-size: 14px;
        }

        .item-row:last-child { border-bottom: none; }

        .item-row .sku-info { flex: 1; min-width: 0; }

        .item-row .sku-cd {
          font-size: 12px;
          color: #999;
        }

        .item-row .sku-nm {
          font-weight: 500;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-row .qty {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #2196F3);
          min-width: 50px;
          text-align: right;
        }

        .item-summary {
          text-align: right;
          font-size: 13px;
          color: #999;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #E0E0E0;
        }

        /* 배송 메모 강조 */
        .delivery-memo {
          background: #FFF8E1;
          border-left: 3px solid #FFC107;
          border-radius: 0 8px 8px 0;
          padding: 10px 14px;
          margin-top: 8px;
          font-size: 14px;
          color: #795548;
        }

        /* 운송장 등록 영역 */
        .invoice-section {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .invoice-section .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-primary, #2196F3);
          margin-bottom: 12px;
        }

        .invoice-section .field-group {
          margin-bottom: 12px;
        }

        .invoice-section .field-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 6px;
        }

        .invoice-section select {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 16px;
          background: #fff;
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
          box-sizing: border-box;
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        .invoice-section select:focus {
          border-color: #2196F3;
        }

        .invoice-section ox-input-barcode {
          width: 100%;
          --barcodescan-input-font-size: 18px;
          --barcodescan-input-padding: 14px 16px;
          --barcodescan-input-border-radius: 8px;
        }

        /* 출력 버튼 행 */
        .print-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .btn-print {
          flex: 1;
          min-height: 44px;
          border: 1px solid #E0E0E0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #555;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
        }

        .btn-print:active {
          background: #F5F5F5;
        }

        /* 액션 버튼 */
        .pda-btn {
          min-height: 52px;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 17px;
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

        .pda-btn:disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .pda-btn.confirm {
          background: linear-gradient(135deg, #4CAF50, #388E3C);
          color: #fff;
          font-size: 18px;
          min-height: 56px;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .pda-btn.confirm:active {
          box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
        }

        .pda-btn.primary {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: #fff;
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
        }

        /* 완료 화면 */
        .completion-card {
          text-align: center;
          background: #E8F5E9;
          border: 2px solid #4CAF50;
          border-radius: 16px;
          padding: 32px 16px;
          margin-bottom: 24px;
        }

        .completion-card .icon {
          font-size: 56px;
          margin-bottom: 12px;
        }

        .completion-card .message {
          font-size: 22px;
          font-weight: 700;
          color: #2E7D32;
        }

        .completion-stats {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .completion-stats .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          font-size: 15px;
        }

        .completion-stats .stat-row:last-child {
          border-bottom: none;
        }

        .completion-stats .stat-row .label {
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .completion-stats .stat-row .value {
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        /* 자동 복귀 안내 */
        .auto-return-msg {
          text-align: center;
          font-size: 13px;
          color: #999;
          margin-top: 12px;
        }

        /* 하단 여백 */
        .bottom-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
          padding-bottom: 24px;
        }

        /* 피드백 토스트 */
        .feedback-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 14px 28px;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          z-index: 100;
          animation: fadeInOut 2s ease forwards;
          max-width: 90%;
          text-align: center;
        }

        .feedback-toast.success { background: #4CAF50; }
        .feedback-toast.error { background: #F44336; }
        .feedback-toast.warning { background: #FF9800; }
        .feedback-toast.info { background: #2196F3; }

        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translateX(-50%) translateY(20px); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          85%  { opacity: 1; transform: translateX(-50%) translateY(0); }
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
      expressMode: Boolean,
      voiceEnabled: Boolean,
      pendingOrders: Array,
      selectedOrder: Object,
      releaseItems: Array,
      deliveryInfo: Object,
      dlvVendCd: String,
      invoiceNo: String,
      todayPending: Number,
      todayCompleted: Number,
      startTime: Number,
      feedbackMsg: String,
      feedbackType: String
    }
  }

  constructor() {
    super()
    this.loading = false
    this.screen = 'order-scan'
    this.expressMode = false
    this.voiceEnabled = voiceService.enabled
    this.pendingOrders = []
    this.selectedOrder = null
    this.releaseItems = []
    this.deliveryInfo = {}
    this.dlvVendCd = ''
    this.invoiceNo = ''
    this.todayPending = 0
    this.todayCompleted = 0
    this.startTime = 0
    this.feedbackMsg = ''
    this.feedbackType = ''
    this._scannerService = null
    this._autoReturnTimer = null
  }

  get context() {
    return {
      title: TermsUtil.tMenu('OutboundReleaseWork')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      ${this.screen === 'order-scan'
        ? this._renderOrderScan()
        : this.screen === 'confirm'
          ? this._renderConfirm()
          : this._renderComplete()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
    `
  }

  /* ============================================================
   * Stage 1: 출고 지시 스캔
   * ============================================================ */

  _renderOrderScan() {
    return html`
      <div class="pda-content">
        <div class="pda-header">
          <div class="title">📦 출고 확정</div>
          <div class="actions">
            <button
              class="icon-btn ${this.voiceEnabled ? 'voice-on' : 'voice-off'}"
              @click="${this._toggleVoice}"
            >${this.voiceEnabled ? '🔊' : '🔇'}</button>
          </div>
        </div>

        <div class="express-toggle">
          <label>⚡ 연속 처리 모드</label>
          <div
            class="toggle-switch ${this.expressMode ? 'active' : ''}"
            @click="${this._toggleExpressMode}"
          ></div>
        </div>

        <div class="scan-input-group">
          <label>출고 지시번호 스캔</label>
          <div class="scan-input">
            <ox-input-barcode
              placeholder="출고 지시번호 스캔"
              @change="${e => { this._onScanReleaseOrder(e.target.value) }}"
            ></ox-input-barcode>
            <button class="refresh-btn" @click="${() => this._loadPendingOrders()}" title="새로고침">↻</button>
          </div>
        </div>

        ${this.loading
          ? html`<div class="loading">출고 지시 조회 중...</div>`
          : this.pendingOrders.length > 0
            ? html`
                <div class="order-list-title">오늘의 출고 확정 대기 (${this.pendingOrders.length}건)</div>
                <div class="order-list">
                  ${this.pendingOrders.map(order => this._renderOrderCard(order))}
                </div>
              `
            : html`
                <div class="empty-state">
                  <span class="empty-icon">✅</span>
                  <span class="empty-text">출고 확정 대기 건이 없습니다</span>
                </div>
              `}

        <div class="stats-row">
          <div class="stat-card pending">
            <div class="stat-value">${this.todayPending}</div>
            <div class="stat-label">대기</div>
          </div>
          <div class="stat-card completed">
            <div class="stat-value">${this.todayCompleted}</div>
            <div class="stat-label">완료</div>
          </div>
        </div>
      </div>
    `
  }

  _renderOrderCard(order) {
    return html`
      <div class="order-card" @click="${() => this._selectOrder(order)}">
        <div class="order-header">
          <div class="order-no">📋 ${order.rls_ord_no || '-'}</div>
          <span class="receiver">${order.receiver_nm || ''}</span>
        </div>
        <div class="order-meta">
          <span>${order.total_line_cnt || 0}건 / ${order.rls_type || '일반출고'}</span>
          <span class="status-badge">PICKED</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * Stage 2: 출고 정보 확인 & 운송장 등록
   * ============================================================ */

  _renderConfirm() {
    const order = this.selectedOrder || {}
    const dlv = this.deliveryInfo || {}
    const totalQty = this.releaseItems.reduce((sum, item) => sum + (item.rls_qty || item.ord_qty || 0), 0)

    return html`
      <div class="pda-content">
        <div class="pda-header">
          <button class="icon-btn back" @click="${this._backToOrderScan}">←</button>
          <div class="title">📦 출고 확정</div>
          <div class="actions">
            <button
              class="icon-btn ${this.voiceEnabled ? 'voice-on' : 'voice-off'}"
              @click="${this._toggleVoice}"
            >${this.voiceEnabled ? '🔊' : '🔇'}</button>
          </div>
        </div>

        <!-- 출고 정보 -->
        <div class="info-section">
          <div class="section-title">📦 출고 정보</div>
          <div class="info-row">
            <span class="label">출고번호</span>
            <span class="value">${order.rls_ord_no || '-'}</span>
          </div>
          <div class="info-row">
            <span class="label">유형</span>
            <span class="value">${order.rls_type || '일반출고'}</span>
          </div>
          <div class="info-row">
            <span class="label">출고일</span>
            <span class="value">${order.rls_req_date || '-'}</span>
          </div>

          <div class="section-title" style="margin-top: 16px">📋 출고 상품</div>
          <div class="item-list">
            ${this.releaseItems.map(item => html`
              <div class="item-row">
                <div class="sku-info">
                  <div class="sku-cd">${item.sku_cd || ''}</div>
                  <div class="sku-nm">${item.sku_nm || item.sku_cd || '-'}</div>
                </div>
                <div class="qty">× ${item.rls_qty || item.ord_qty || 0}</div>
              </div>
            `)}
          </div>
          <div class="item-summary">${this.releaseItems.length}품목 / ${totalQty}개</div>
        </div>

        <!-- 배송 정보 -->
        <div class="info-section">
          <div class="section-title">🚚 배송 정보</div>
          <div class="info-row">
            <span class="label">수신인</span>
            <span class="value">${dlv.receiver_nm || '-'}</span>
          </div>
          <div class="info-row">
            <span class="label">전화번호</span>
            <span class="value">${dlv.receiver_phone || '-'}</span>
          </div>
          <div class="info-row">
            <span class="label">주소</span>
            <span class="value">${dlv.receiver_addr || '-'}</span>
          </div>
          ${dlv.memo ? html`
            <div class="delivery-memo">📝 ${dlv.memo}</div>
          ` : ''}
        </div>

        <!-- 운송장 등록 -->
        <div class="invoice-section">
          <div class="section-title">📝 운송장 등록</div>

          <div class="field-group">
            <label>배송 업체</label>
            <select
              .value="${this.dlvVendCd}"
              @change="${e => { this.dlvVendCd = e.target.value }}"
            >
              <option value="">-- 배송 업체 선택 --</option>
              <option value="CJ">CJ대한통운</option>
              <option value="HANJIN">한진택배</option>
              <option value="LOTTE">롯데택배</option>
              <option value="LOGEN">로젠택배</option>
              <option value="POST">우체국택배</option>
              <option value="ETC">기타</option>
            </select>
          </div>

          <div class="field-group">
            <label>운송장 번호</label>
            <ox-input-barcode
              placeholder="운송장 번호 스캔/입력"
              .value="${this.invoiceNo}"
              @change="${e => { this._onScanInvoice(e.target.value) }}"
            ></ox-input-barcode>
          </div>
        </div>

        <!-- 출력 버튼 -->
        <div class="print-actions">
          <button class="btn-print" @click="${this._printReleaseLabel}">🏷️ 라벨</button>
          <button class="btn-print" @click="${this._printTradeStatement}">📄 거래명세서</button>
        </div>

        <!-- 출고 확정 버튼 -->
        <div class="bottom-actions">
          <button
            class="pda-btn confirm"
            ?disabled="${!this.invoiceNo || !this.dlvVendCd}"
            @click="${this._confirmRelease}"
          >✅ 출고 확정</button>
        </div>
      </div>
    `
  }

  /* ============================================================
   * Stage 3: 출고 확정 완료
   * ============================================================ */

  _renderComplete() {
    const order = this.selectedOrder || {}
    const elapsed = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0
    const min = Math.floor(elapsed / 60)
    const sec = elapsed % 60
    const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    const totalQty = this.releaseItems.reduce((sum, item) => sum + (item.rls_qty || item.ord_qty || 0), 0)

    return html`
      <div class="pda-content">
        <div class="pda-header">
          <div class="title">📦 출고 확정</div>
          <div class="actions">
            <button
              class="icon-btn ${this.voiceEnabled ? 'voice-on' : 'voice-off'}"
              @click="${this._toggleVoice}"
            >${this.voiceEnabled ? '🔊' : '🔇'}</button>
          </div>
        </div>

        <div class="completion-card">
          <div class="icon">✅</div>
          <div class="message">출고 확정 완료</div>
        </div>

        <div class="completion-stats">
          <div class="stat-row">
            <span class="label">출고 번호</span>
            <span class="value">${order.rls_ord_no || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="label">수신인</span>
            <span class="value">${(this.deliveryInfo || {}).receiver_nm || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="label">운송장</span>
            <span class="value">${this.invoiceNo || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="label">배송업체</span>
            <span class="value">${this._getDlvVendName(this.dlvVendCd)}</span>
          </div>
          <div class="stat-row">
            <span class="label">상품</span>
            <span class="value">${this.releaseItems.length}품목 / ${totalQty}개</span>
          </div>
          <div class="stat-row">
            <span class="label">처리시간</span>
            <span class="value">${timeStr}</span>
          </div>
        </div>

        <div class="print-actions">
          <button class="btn-print" @click="${this._printReleaseLabel}">🏷️ 라벨</button>
          <button class="btn-print" @click="${this._printTradeStatement}">📄 거래명세서</button>
        </div>

        <div class="stats-row">
          <div class="stat-card pending">
            <div class="stat-value">${this.todayPending}</div>
            <div class="stat-label">대기</div>
          </div>
          <div class="stat-card completed">
            <div class="stat-value">${this.todayCompleted}</div>
            <div class="stat-label">완료</div>
          </div>
        </div>

        <div class="bottom-actions">
          <button class="pda-btn primary" @click="${this._resetToScan}">📦 다음 출고 확정</button>
        </div>

        <div class="auto-return-msg">3초 후 자동으로 다음 건 스캔 대기...</div>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      if (!this._scannerService) {
        this._scannerService = new HardwareScannerService({
          onScan: barcode => this._handleGlobalScan(barcode)
        })
      }
      this._scannerService.start()

      if (this.screen === 'order-scan') {
        await this._loadPendingOrders()
      }
    } else {
      this._scannerService?.stop()
    }
  }

  pageDisposed(lifecycle) {
    if (this._scannerService) {
      this._scannerService.stop()
      this._scannerService = null
    }
    if (this._autoReturnTimer) {
      clearTimeout(this._autoReturnTimer)
      this._autoReturnTimer = null
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  async _loadPendingOrders() {
    try {
      this.loading = true
      const today = this._todayStr()

      const data = await ServiceUtil.restGet('release_orders', {
        status: 'PICKED',
        rls_req_date: today
      })
      this.pendingOrders = (data?.items || data || [])
      this.todayPending = this.pendingOrders.length

      const completed = await ServiceUtil.restGet('release_orders', {
        status: 'END',
        rls_req_date: today
      })
      this.todayCompleted = (completed?.items || completed || []).length

      this.loading = false
    } catch (err) {
      console.error('출고 목록 조회 실패:', err)
      this.pendingOrders = []
      this.loading = false
    }
  }

  async _loadOrderDetail(orderId) {
    try {
      const items = await ServiceUtil.restGet('release_order_items', {
        release_order_id: orderId
      })
      this.releaseItems = (items?.items || items || [])

      const dlvList = await ServiceUtil.restGet('delivery_infos', {
        release_order_id: orderId
      })
      this.deliveryInfo = (dlvList?.items || dlvList || [])[0] || {}

      this.invoiceNo = this.deliveryInfo.invoice_no || ''
      this.dlvVendCd = this.deliveryInfo.dlv_vend_cd || ''
    } catch (err) {
      console.error('출고 상세 조회 실패:', err)
      this.releaseItems = []
      this.deliveryInfo = {}
    }
  }

  /* ============================================================
   * 바코드 스캔
   * ============================================================ */

  _handleGlobalScan(barcode) {
    if (this.screen === 'order-scan') {
      this._onScanReleaseOrder(barcode)
    } else if (this.screen === 'confirm') {
      this._onScanInvoice(barcode)
    }
  }

  async _onScanReleaseOrder(barcode) {
    const value = (barcode || '').trim()
    if (!value) return

    // 목록에서 찾기
    const found = this.pendingOrders.find(
      o => o.rls_ord_no === value || o.id === value
    )

    if (found) {
      this._selectOrder(found)
      return
    }

    // 목록에 없으면 API로 직접 조회
    try {
      const data = await ServiceUtil.restGet('release_orders', {
        rls_ord_no: value
      })
      const order = (data?.items || data || [])[0]
      if (!order) {
        this._showFeedback('출고 지시를 찾을 수 없습니다', 'error')
        voiceService.error('출고 지시를 찾을 수 없습니다')
        return
      }
      if (order.status !== 'PICKED') {
        this._showFeedback(`출고 확정할 수 없는 상태입니다 (${order.status})`, 'warning')
        voiceService.warning('출고 확정할 수 없는 상태입니다')
        return
      }
      this._selectOrder(order)
    } catch (err) {
      this._showFeedback('조회 실패', 'error')
      voiceService.error('조회에 실패했습니다')
    }

    this._refocusBarcodeInput()
  }

  async _selectOrder(order) {
    this.selectedOrder = order
    this.startTime = Date.now()
    await this._loadOrderDetail(order.id)
    this.screen = 'confirm'
    voiceService.guide(`${order.rls_ord_no}. 운송장 번호를 스캔해주세요`)
  }

  async _onScanInvoice(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return

    this.invoiceNo = trimmed
    this._showFeedback('운송장 번호 등록됨', 'success')
    voiceService.success('운송장 등록 완료')

    // Express Mode: 배송업체 선택 상태면 자동 확정
    if (this.expressMode && this.dlvVendCd) {
      await this._confirmRelease()
    }
  }

  /* ============================================================
   * 출고 확정
   * ============================================================ */

  async _confirmRelease() {
    if (!this.invoiceNo) {
      this._showFeedback('운송장 번호를 입력해주세요', 'warning')
      voiceService.warning('운송장 번호를 입력해주세요')
      return
    }
    if (!this.dlvVendCd) {
      this._showFeedback('배송 업체를 선택해주세요', 'warning')
      voiceService.warning('배송 업체를 선택해주세요')
      return
    }

    try {
      // 배송 정보 업데이트
      if (this.deliveryInfo.id) {
        await ServiceUtil.restPut(`delivery_infos/${this.deliveryInfo.id}`, {
          invoice_no: this.invoiceNo,
          dlv_vend_cd: this.dlvVendCd,
          dlv_type: 'COURIER'
        })
      }

      // 출고 확정 API
      await ServiceUtil.restPost(
        `outbound_trx/release_orders/${this.selectedOrder.id}/close_by_params`,
        {
          invoiceNo: this.invoiceNo,
          dlvVendCd: this.dlvVendCd,
          dlvType: 'COURIER'
        }
      )

      this.todayCompleted++
      this.todayPending = Math.max(0, this.todayPending - 1)

      if (this.expressMode) {
        // Express: Stage 1로 즉시 복귀
        voiceService.success(`출고 확정 완료. ${this.todayCompleted}건째`)
        this._showFeedback(`출고 확정 완료 (${this.todayCompleted}건)`, 'success')
        this._resetToScan()
      } else {
        // 일반: Stage 3 표시
        voiceService.success('출고 확정이 완료되었습니다')
        this.screen = 'complete'
        this._startAutoReturn()
      }
    } catch (err) {
      console.error('출고 확정 실패:', err)
      this._showFeedback('출고 확정 실패', 'error')
      voiceService.error('출고 확정에 실패했습니다')
    }
  }

  /* ============================================================
   * 출력
   * ============================================================ */

  async _printReleaseLabel() {
    if (!this.selectedOrder) return
    try {
      await ServiceUtil.restPost(
        `outbound_trx/release_orders/${this.selectedOrder.id}/print_release_label`
      )
      this._showFeedback('배송 라벨 출력 요청', 'info')
    } catch (err) {
      console.error('라벨 출력 실패:', err)
      this._showFeedback('출력 요청 실패', 'error')
    }
  }

  async _printTradeStatement() {
    if (!this.selectedOrder) return
    try {
      await ServiceUtil.restPost(
        `outbound_trx/release_orders/${this.selectedOrder.id}/print_release_sheet`
      )
      this._showFeedback('거래명세서 출력 요청', 'info')
    } catch (err) {
      console.error('거래명세서 출력 실패:', err)
      this._showFeedback('출력 요청 실패', 'error')
    }
  }

  /* ============================================================
   * 화면 전환
   * ============================================================ */

  _resetToScan() {
    if (this._autoReturnTimer) {
      clearTimeout(this._autoReturnTimer)
      this._autoReturnTimer = null
    }
    this.selectedOrder = null
    this.releaseItems = []
    this.deliveryInfo = {}
    this.invoiceNo = ''
    this.dlvVendCd = ''
    this.screen = 'order-scan'
    this._loadPendingOrders()
  }

  _backToOrderScan() {
    this.selectedOrder = null
    this.releaseItems = []
    this.deliveryInfo = {}
    this.invoiceNo = ''
    this.dlvVendCd = ''
    this.screen = 'order-scan'
    this._loadPendingOrders()
  }

  _startAutoReturn() {
    this._autoReturnTimer = setTimeout(() => {
      this._resetToScan()
    }, 3000)
  }

  /* ============================================================
   * 하드웨어 스캐너
   * ============================================================ */

  _refocusBarcodeInput() {
    requestAnimationFrame(() => {
      const el = this.renderRoot.querySelector('.invoice-section ox-input-barcode')
        || this.renderRoot.querySelector('.scan-input ox-input-barcode')
      if (el) {
        const input = el.renderRoot?.querySelector('input')
        if (input) {
          input.value = ''
          input.focus()
        }
      }
    })
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  _getDlvVendName(code) {
    const map = {
      CJ: 'CJ대한통운',
      HANJIN: '한진택배',
      LOTTE: '롯데택배',
      LOGEN: '로젠택배',
      POST: '우체국택배',
      ETC: '기타'
    }
    return map[code] || code || '-'
  }

  _toggleExpressMode() {
    this.expressMode = !this.expressMode
    this._showFeedback(
      this.expressMode ? '연속 처리 모드 ON' : '연속 처리 모드 OFF',
      'info'
    )
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

  _toggleVoice() {
    this.voiceEnabled = voiceService.toggle()
    this._showFeedback(this.voiceEnabled ? '음성 안내 ON' : '음성 안내 OFF', 'info')
  }
}

window.customElements.define('outbound-release-work', OutboundReleaseWork)
