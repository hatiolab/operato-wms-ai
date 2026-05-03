import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { OxInputBarcode } from '@operato/input'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

import { HardwareScannerService } from './hardware-scanner-service.js'
import { voiceService } from './voice-service.js'

/**
 * VAS PDA 작업 화면
 *
 * 3단계 위자드:
 * - 1단계: 자재 피킹 (바코드 스캔, 수량 입력)
 * - 2단계: 작업 수행 (완성 수량, 불량 수량 입력)
 * - 3단계: 적치 (로케이션 바코드 스캔, 작업 완료)
 *
 * PDA 특화:
 * - 큰 터치 버튼 (최소 44x44px)
 * - 바코드 스캐너 입력 연동
 * - 음성 안내 (성공/실패 피드백)
 */
class VasWorkPage extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          background: var(--md-sys-color-surface, #fafafa);
          height: 100%;
          overflow-y: auto;
          font-family: var(--md-sys-typescale-body-large-font, sans-serif);
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

        .pda-header .back-btn {
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

        /* 컨텐츠 영역 (작업 화면용) */
        .pda-content {
          padding: 16px;
          flex: 1;
        }

        /* 주문 선택 화면 */
        .order-select-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .scan-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .scan-input-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
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

        .scan-input .scan-btn {
          min-width: 56px;
          min-height: 56px;
          background: var(--md-sys-color-secondary-container, #E3F2FD);
          border: none;
          border-radius: 8px;
          font-size: 24px;
          cursor: pointer;
        }

        /* 주문 목록 */
        .order-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .order-list-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 4px;
        }

        .order-item {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .order-item:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .order-item .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-item .order-no {
          font-size: 14px;
          font-weight: bold;
          color: var(--md-sys-color-on-surface, #333);
        }

        .order-item .order-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .order-item .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 6px;
        }

        .order-badge.APPROVED {
          background: #fff3e0;
          color: #ff9800;
        }
        .order-badge.MATERIAL_READY {
          background: #fff3e0;
          color: #ff9800;
        }
        .order-badge.IN_PROGRESS {
          background: #e3f2fd;
          color: #1976d2;
        }
        .order-badge.COMPLETED,
        .order-badge.CLOSED {
          background: #e8f5e9;
          color: #4CAF50;
        }

        /* 스텝 인디케이터 */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 16px 0;
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
          color: #fff;
          background: var(--md-sys-color-outline, #bbb);
          transition: all 0.3s ease;
        }

        .step-dot.active {
          background: var(--md-sys-color-primary, #1976D2);
          transform: scale(1.1);
        }

        .step-dot.completed {
          background: #4CAF50;
        }

        .step-line {
          width: 40px;
          height: 3px;
          background: var(--md-sys-color-outline, #ddd);
          transition: all 0.3s ease;
        }

        .step-line.active {
          background: #4CAF50;
        }

        /* 주문 정보 카드 */
        .order-info-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .order-info-card .title {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
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

        /* 자재 피킹 리스트 (Step 1) */
        .pick-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pick-item {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .pick-item.picked {
          border-left: 4px solid #4CAF50;
          opacity: 0.85;
        }

        .pick-item.active {
          border-left: 4px solid var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
        }

        .pick-item .sku-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .pick-item .sku-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .pick-item .pick-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }

        .pick-item .pick-input-row input {
          width: 80px;
          padding: 10px 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 18px;
          font-weight: 700;
          text-align: center;
        }

        .pick-item .pick-input-row input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        .pick-item .pick-input-row .req-qty {
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .pick-item .pick-confirm-btn {
          min-width: 44px;
          min-height: 44px;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          cursor: pointer;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          padding: 8px 16px;
          font-weight: 600;
        }

        .pick-item .pick-confirm-btn.done {
          background: #4CAF50;
        }

        .pick-item .pick-confirm-btn:active {
          transform: scale(0.95);
        }

        /* 진행률 */
        .progress-section {
          margin: 16px 0;
        }

        .progress-bar-container {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 8px;
          height: 12px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          transition: width 0.3s ease;
        }

        .progress-bar-fill.complete {
          background: #4CAF50;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        /* 작업 수행 (Step 2) */
        .work-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .work-input-group {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .work-input-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 8px;
        }

        .work-input-group input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          box-sizing: border-box;
        }

        .work-input-group input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        .work-input-group .unit {
          text-align: center;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        /* 적치 (Step 3) */
        .putaway-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .putaway-loc {
          background: #fff;
          border-radius: 12px;
          padding: 24px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .putaway-loc .scanned-loc {
          font-size: 28px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
          margin-top: 8px;
          min-height: 40px;
        }

        .expiry-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .expiry-card label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 8px;
        }

        .expiry-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .expiry-input-row input {
          flex: 1;
          min-width: 0;
          padding: 14px 16px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 20px;
          font-weight: 700;
          box-sizing: border-box;
          min-height: 52px;
        }

        @media (max-width: 760px) {
          .expiry-input-row input {
            flex-basis: 100%;
          }

          .expiry-clear-btn {
            width: 100%;
          }
        }

        .expiry-input-row input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        .expiry-clear-btn {
          min-height: 52px;
          min-width: 88px;
          border: 2px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 8px;
          background: transparent;
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        /* PDA 버튼 (44x44px 최소) */
        .pda-btn {
          min-height: 52px;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          padding: 14px 24px;
          transition: all 0.15s ease;
          width: 100%;
        }

        .pda-btn:active {
          transform: scale(0.97);
        }

        .pda-btn.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
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
          background: transparent;
          color: var(--md-sys-color-primary, #1976D2);
          border: 2px solid var(--md-sys-color-primary, #1976D2);
        }

        .pda-btn.danger {
          background: #F44336;
          color: #fff;
        }

        .pda-btn:disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        /* 하단 버튼 바 */
        .bottom-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-bottom: 24px;
        }

        .bottom-actions .pda-btn {
          flex: 1;
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

        /* 음성 안내 토글 */
        .voice-toggle {
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 20;
          min-width: 44px;
          min-height: 44px;
          border-radius: 50%;
          border: none;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        .voice-toggle.on {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .voice-toggle.off {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* 상태 요약 카드 */
        /* 상태 요약 카드 */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px 12px;
          flex-shrink: 0;
        }

        .summary-card {
          text-align: center;
          padding: 10px 4px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: all 0.15s;
          border: 2px solid transparent;
        }

        .summary-card[active] {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 6px rgba(25,118,210,0.25);
        }

        .summary-card:active {
          transform: scale(0.96);
        }

        .summary-card .count {
          font-size: 22px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-card .card-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .summary-card.waiting .count { color: var(--md-sys-color-error, #d32f2f); }
        .summary-card.done .count    { color: #4CAF50; }

        /* 주문 목록 스크롤 영역 */
        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }

        /* 하단 고정 스캔 영역 */
        .scan-bottom {
          padding: 8px 12px 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .scan-bottom label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-bottom: 4px;
        }

        .scan-row {
          display: flex;
          gap: 8px;
        }

        .scan-row ox-input-barcode {
          flex: 1;
          --barcodescan-input-font-size: 18px;
          --barcodescan-input-padding: 14px 16px;
          --barcodescan-input-border-radius: 8px;
        }

        .btn-refresh {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      loading: Boolean,
      filterStatus: String,
      screen: String,
      step: Number,
      orders: Array,
      bomMap: Object,
      selectedOrder: Object,
      orderItems: Array,
      scanValue: String,
      completedQty: Number,
      defectQty: Number,
      putawayLoc: String,
      expiredDate: String,
      feedbackMsg: String,
      feedbackType: String,
      voiceEnabled: Boolean,
      resultBarcodes: Array
    }
  }

  /** 생성자 - PDA 작업 화면 초기값 설정 */
  constructor() {
    super()
    this.loading = false
    this.filterStatus = 'ALL'
    this.screen = 'order-select'
    this.step = 1
    this.orders = []
    this.bomMap = {}
    this.selectedOrder = null
    this.orderItems = []
    this.scanValue = ''
    this.completedQty = 0
    this.defectQty = 0
    this.putawayLoc = ''
    this.expiredDate = ''
    this.feedbackMsg = ''
    this.feedbackType = ''
    this.voiceEnabled = voiceService.enabled
    this.resultBarcodes = []
    this._scannerService = null
  }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: TermsUtil.tMenu('VasWorkPage')
    }
  }

  /** 화면 렌더링 - 주문 선택 또는 3단계 작업 화면 분기 */
  render() {
    return html`
      <button
        class="voice-toggle ${this.voiceEnabled ? 'on' : 'off'}"
        @click="${this._toggleVoice}"
        title="${this.voiceEnabled ? '음성 안내 ON' : '음성 안내 OFF'}"
      >${this.voiceEnabled ? '\u{1F50A}' : '\u{1F507}'}</button>
      ${this.screen === 'order-select' ? this._renderOrderSelect() : this._renderWorkScreen()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
    `
  }

  /* ============================================================
   * 주문 선택 화면
   * ============================================================ */

  /** 주문 선택 화면 렌더링 (상태 요약 카드 + 주문 목록 + 하단 바코드 스캔) */
  _renderOrderSelect() {
    const waiting = this.orders.filter(o => o.status === 'MATERIAL_READY')
    const working = this.orders.filter(o => o.status === 'IN_PROGRESS')
    const done = this.orders.filter(o => o.status === 'COMPLETED' || o.status === 'CLOSED')
    const filtered =
      this.filterStatus === 'WAITING' ? waiting
        : this.filterStatus === 'WORKING' ? working
          : this.filterStatus === 'DONE' ? done
            : [...waiting, ...working]

    return html`
      <!-- 상태 요약 카드 -->
      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active="${this.filterStatus === 'WAITING'}"
          @click="${() => this._toggleFilter('WAITING')}">
          <div class="count">${waiting.length}</div>
          <div class="card-label">대기</div>
        </div>
        <div class="summary-card working"
          ?active="${this.filterStatus === 'WORKING'}"
          @click="${() => this._toggleFilter('WORKING')}">
          <div class="count">${working.length}</div>
          <div class="card-label">작업중</div>
        </div>
        <div class="summary-card done"
          ?active="${this.filterStatus === 'DONE'}"
          @click="${() => this._toggleFilter('DONE')}">
          <div class="count">${done.length}</div>
          <div class="card-label">완료</div>
        </div>
      </div>

      <!-- 주문 목록 -->
      <div class="task-list">
        ${this.loading
          ? html`<div class="loading">주문 목록 조회 중...</div>`
          : filtered.length === 0
            ? html`<div class="empty-state"><span class="empty-icon">&#x1F4CB;</span><span class="empty-text">해당 주문이 없습니다</span></div>`
            : html`<div class="order-list">${filtered.map(order => html`
                <div class="order-item" @click="${() => this._selectOrder(order)}">
                  <div class="card-header">
                    <span class="order-no">${order.vas_no || '-'}</span>
                    <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
                  </div>
                  <div class="sub-info">
                    ${this._vasTypeLabel(order.vas_type)} | ${this.bomMap[order.vas_bom_id]?.set_sku_cd || '-'} / ${this.bomMap[order.vas_bom_id]?.set_sku_nm || '-'} · 계획: ${order.plan_qty || 0} EA
                  </div>
                </div>
              `)}</div>`}
      </div>

      <!-- VAS 주문번호 스캔 (하단) -->
      <div class="scan-bottom">
        <label>작업번호 스캔</label>
        <div class="scan-row">
          <ox-input-barcode
            placeholder="바코드 스캔 또는 번호 입력"
            @change="${e => { this.scanValue = e.target.value; this._onScanSearch() }}"
          ></ox-input-barcode>
          <button class="btn-refresh" @click="${this._refresh}">새로고침</button>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 3단계 작업 화면
   * ============================================================ */

  /** 작업 화면 렌더링 (스텝 인디케이터 + 주문 정보 + 단계별 내용) */
  _renderWorkScreen() {
    return html`
      <div class="pda-content">
        <!-- 스텝 인디케이터 -->
        ${this._renderStepIndicator()}

        <!-- 주문 요약 정보 -->
        ${this._renderOrderInfoCard()}

        <!-- 단계별 내용 -->
        ${this.step === 1
        ? this._renderStep1Picking()
        : this.step === 2
          ? this._renderStep2Work()
          : this._renderStep3Putaway()}

        <!-- 하단 버튼 -->
        ${this._renderBottomActions()}
      </div>
    `
  }

  /** 3단계 스텝 인디케이터 렌더링 (피킹 → 작업 → 적치) */
  _renderStepIndicator() {
    return html`
      <div class="step-indicator">
        <div class="step-dot ${this.step === 1 ? 'active' : this.step > 1 ? 'completed' : ''}">
          ${this.step > 1 ? '\u2713' : '1'}
        </div>
        <div class="step-line ${this.step > 1 ? 'active' : ''}"></div>
        <div class="step-dot ${this.step === 2 ? 'active' : this.step > 2 ? 'completed' : ''}">
          ${this.step > 2 ? '\u2713' : '2'}
        </div>
        <div class="step-line ${this.step > 2 ? 'active' : ''}"></div>
        <div class="step-dot ${this.step === 3 ? 'active' : ''}">3</div>
      </div>
    `
  }

  /** 선택된 주문 요약 정보 카드 렌더링 */
  _renderOrderInfoCard() {
    const order = this.selectedOrder
    if (!order) return ''

    const isCompleted = ['COMPLETED', 'CLOSED'].includes(order.status)

    return html`
      <div class="order-info-card">
        <div class="title">${order.vas_no} | (${this.bomMap[order.vas_bom_id].set_sku_cd} / ${this.bomMap[order.vas_bom_id].set_sku_nm})</div>
        <div class="detail-row">
          <span>유형</span>
          <span class="value">${this._vasTypeLabel(order.vas_type)}</span>
        </div>
        <div class="detail-row">
          <span>계획 수량</span>
          <span class="value">${order.plan_qty || 0} EA</span>
        </div>
        <div class="detail-row">
          <span>상태</span>
          <span class="value">${this._statusLabel(order.status)}</span>
        </div>
        ${isCompleted ? html`
          <div class="detail-row">
            <span>완성품 바코드</span>
            <span class="value">
              ${this.resultBarcodes.length > 0
                ? this.resultBarcodes.join(', ')
                : '-'}
            </span>
          </div>
        ` : ''}
      </div>
    `
  }

  /** 1단계 렌더링 - 자재 투입 (품목별 바코드 스캔, 수량 입력, 확인) */
  _renderStep1Picking() {
    const pickedCount = this.orderItems.filter(i => i._picked).length
    const totalCount = this.orderItems.length
    const progressPct = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0

    return html`
      <h3 style="margin: 0 0 12px; font-size: 16px;">1단계: 자재 투입</h3>

      <!-- 진행률 -->
      <div class="progress-section">
        <div class="progress-bar-container">
          <div
            class="progress-bar-fill ${progressPct === 100 ? 'complete' : ''}"
            style="width: ${progressPct}%"
          ></div>
        </div>
        <div class="progress-label">
          <span>진행: ${pickedCount}/${totalCount} 품목</span>
          <span>${progressPct}%</span>
        </div>
      </div>

      <!-- 자재 목록 -->
      <div class="pick-list">
        ${this.orderItems.length === 0
        ? html`<div class="loading">자재 정보 조회 중...</div>`
        : this.orderItems.map((item, idx) => html`
              <div class="pick-item ${item._picked ? 'picked' : ''} ${item._active ? 'active' : ''}">
                <div class="sku-name">${item.sku_cd} / ${item.sku_nm}</div>
                <div class="sku-info">
                  로케이션: ${item.src_loc_cd || '-'}
                </div>
                <div class="pick-input-row">
                  <input
                    type="number"
                    inputmode="numeric"
                    placeholder="수량"
                    .value="${item._pickedQty || ''}"
                    readonly
                    ?disabled="${item._picked}"
                    style="cursor: default; background: var(--md-sys-color-surface-variant, #f5f5f5);"
                  />
                  <span class="req-qty">/ ${item.alloc_qty || item.req_qty || 0} EA</span>
                  <button
                    class="pick-confirm-btn ${item._picked ? 'done' : ''}"
                    @click="${() => this._confirmPick(idx)}"
                    ?disabled="${item._picked}"
                  >
                    ${item._picked ? '\u2713' : '확인'}
                  </button>
                </div>
              </div>
            `)}
      </div>
    `
  }

  /** 2단계 렌더링 - 작업 수행 (완성 수량, 불량 수량 입력) */
  _renderStep2Work() {
    const planQty = this.selectedOrder?.plan_qty || 0

    return html`
      <h3 style="margin: 0 0 12px; font-size: 16px;">2단계: 작업 수행</h3>

      <div class="work-section">
        <div class="work-input-group">
          <label>완성 수량</label>
          <input
            type="number"
            inputmode="numeric"
            placeholder="0"
            .value="${this.completedQty || ''}"
            @input="${e => { this.completedQty = parseFloat(e.target.value) || 0 }}"
          />
          <div class="unit">계획: ${planQty} EA</div>
        </div>

        <div class="work-input-group">
          <label>불량 수량</label>
          <input
            type="number"
            inputmode="numeric"
            placeholder="0"
            .value="${this.defectQty || ''}"
            @input="${e => { this.defectQty = parseFloat(e.target.value) || 0 }}"
          />
          <div class="unit">EA</div>
        </div>

        ${this.completedQty + this.defectQty > planQty
        ? html`<div style="color: #F44336; font-size: 14px; font-weight: 600; text-align: center;">
              &#x26A0; 완성 + 불량 수량이 계획 수량(${planQty})을 초과합니다
            </div>`
        : this.completedQty > 0 && this.completedQty + this.defectQty < planQty
        ? html`<div style="color: #FF9800; font-size: 14px; font-weight: 600; text-align: center;">
              &#x26A0; 완성 + 불량 수량(${this.completedQty + this.defectQty})이 계획 수량(${planQty})보다 부족합니다
            </div>`
        : ''}
      </div>
    `
  }

  /** 3단계 렌더링 - 적치 로케이션 바코드 스캔 (완료/마감 주문은 조회 전용) */
  _renderStep3Putaway() {
    const isReadOnly = ['COMPLETED', 'CLOSED'].includes(this.selectedOrder?.status)

    return html`
      <h3 style="margin: 0 0 12px; font-size: 16px;">3단계: 적치${isReadOnly ? html` <span style="font-size:12px; color:#4CAF50; font-weight:400;">(완료됨)</span>` : ''}</h3>

      <div class="putaway-section">
        <div class="putaway-loc">
          <label style="font-size: 14px; color: var(--md-sys-color-on-surface-variant, #666);">
            적치 로케이션
          </label>
          <div class="scanned-loc">${this.putawayLoc || '-'}</div>
        </div>

        ${isReadOnly ? '' : html`
          <div class="scan-input-group">
            <label>로케이션 바코드 스캔</label>
            <div class="scan-input">
              <ox-input-barcode
                placeholder="로케이션 바코드 스캔"
                @change="${e => { this.putawayLoc = e.target.value; this._onLocScanConfirm() }}"
              ></ox-input-barcode>
            </div>
          </div>
        `}

        <div class="expiry-card">
          <label>완성품 유통기한</label>
          <div class="expiry-input-row">
            <input
              type="date"
              .value="${this.expiredDate || ''}"
              ?disabled="${isReadOnly}"
              @input="${e => { this.expiredDate = e.target.value || '' }}"
            />
            ${isReadOnly ? '' : html`
              <button
                type="button"
                class="expiry-clear-btn"
                @click="${() => { this.expiredDate = '' }}"
              >초기화</button>
            `}
          </div>
        </div>
      </div>
    `
  }

  /** 하단 액션 버튼 렌더링 (단계에 따라 이전/다음/완료 버튼) */
  _renderBottomActions() {
    const isReadOnly = ['COMPLETED', 'CLOSED'].includes(this.selectedOrder?.status)

    // 완료/마감 주문: 목록으로 버튼만 표시 (이전/다음/완료 불가)
    if (isReadOnly) {
      return html`
        <div class="bottom-actions">
          <button class="pda-btn outline" @click="${this._backToOrderSelect}">목록으로</button>
        </div>
      `
    }

    return html`
      <div class="bottom-actions">
        ${this.step > 1
        ? html`<button class="pda-btn outline" @click="${this._prevStep}">&#x2190; 이전</button>`
        : html`<button class="pda-btn outline" @click="${this._backToOrderSelect}">취소</button>`}

        ${this.step < 3
        ? html`<button class="pda-btn primary" @click="${this._nextStep}">다음 &#x2192;</button>`
        : html`<button class="pda-btn success" @click="${this._completeWork}">완료</button>`}
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  /** 페이지 활성화 시 작업 주문 목록 조회 + 스캐너 서비스 시작 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      // 하드웨어 스캐너 서비스 시작
      if (!this._scannerService) {
        this._scannerService = new HardwareScannerService({
          onScan: barcode => this._handleGlobalScan(barcode)
        })
      }
      this._scannerService.start()

      await this._fetchOrders()
    } else {
      this._scannerService?.stop()
    }
  }

  /** 페이지 해제 시 스캐너 서비스 정리 */
  pageDisposed(lifecycle) {
    if (this._scannerService) {
      this._scannerService.stop()
      this._scannerService = null
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 작업 가능한 VAS 주문 목록 조회 (주문 확정/자재 준비 완료/작업 중) */
  async _fetchOrders() {
    try {
      this.loading = true
      const data = await ServiceUtil.restGet('vas_trx/monitor/orders', {
        status: 'MATERIAL_READY,IN_PROGRESS,COMPLETED,CLOSED'
      })
      this.orders = data || []

      // BOM 정보 일괄 조회
      await this._fetchBomMap(this.orders)

      this.loading = false
    } catch (err) {
      console.error('주문 목록 조회 실패:', err)
      this.orders = []
      this.loading = false
    }
  }

  /** 주문 목록의 고유 vas_bom_id로 BOM 정보 일괄 조회 */
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

  /** 작업 주문의 자재 항목(VasOrderItem) 목록 조회 */
  async _fetchOrderItems(orderId) {
    try {
      const data = await ServiceUtil.restGet(`vas_trx/vas_orders/${orderId}/items`)
      this.orderItems = (data || []).map(item => ({
        ...item,
        _picked: ['IN_USE', 'COMPLETED'].includes(item.status),
        _pickedQty: item.used_qty || item.picked_qty || '',
        _active: false
      }))

      // 첫 번째 미피킹 항목 활성화
      const firstUnpicked = this.orderItems.findIndex(i => !i._picked)
      if (firstUnpicked >= 0) {
        this.orderItems[firstUnpicked]._active = true
        this.orderItems = [...this.orderItems]
      }
    } catch (err) {
      console.error('자재 항목 조회 실패:', err)
      this.orderItems = []
    }
  }

  /** 완성품 유통기한 기본값 조회 */
  async _fetchDefaultExpiredDate(orderId) {
    try {
      const data = await ServiceUtil.restGet(`vas_trx/vas_orders/${orderId}/default_expired_date`)
      return data?.expiredDate || ''
    } catch (err) {
      console.error('완성품 유통기한 기본값 조회 실패:', err)
      return ''
    }
  }

  /**
   * 상태 필터 토글 — 같은 카드를 다시 클릭하면 전체(ALL)로 복귀
   */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? 'ALL' : status
  }

  /** 목록 새로고침 */
  async _refresh() {
    await this._fetchOrders()
  }

  /* ============================================================
   * 주문 선택 및 화면 전환
   * ============================================================ */

  /** 작업 주문 선택 → 작업 화면으로 전환 */
  async _selectOrder(order) {
    this.selectedOrder = order
    this.screen = 'work'
    this.step = 1
    this.completedQty = 0
    this.defectQty = 0
    this.putawayLoc = ''
    this.expiredDate = ''
    await this._fetchOrderItems(order.id)
    this.expiredDate = await this._fetchDefaultExpiredDate(order.id)
    this.completedQty = Number(order.completed_qty || 0)
    this.defectQty = this._calcDefectQtyFromLoss()

    if (['COMPLETED', 'CLOSED'].includes(order.status)) {
      // 완료/마감 주문은 무조건 3단계(조회 전용)로 이동, 적치 로케이션 복원
      this.putawayLoc = order.dest_loc_cd || ''
      this.step = 3
      this._fetchResultBarcodes(order.id)
      voiceService.guide(`주문 ${order.vas_no} 선택. 완료된 작업입니다`)
    } else if (this._shouldSkipResultInputStep(order)) {
      this.step = 3
      voiceService.guide(`주문 ${order.vas_no} 선택. 적치 로케이션을 스캔해주세요`)
    } else if (this._shouldSkipMaterialInputStep(order)) {
      this.step = 2
      voiceService.guide(`주문 ${order.vas_no} 선택. 완성 수량과 불량 수량을 입력해주세요`)
    } else {
      voiceService.guide(`주문 ${order.vas_no} 선택. 자재를 투입해주세요`)
    }
  }

  /** 주문 선택 화면으로 돌아가기 */
  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this.step = 1
    this.expiredDate = ''
    this.resultBarcodes = []
    this._fetchOrders()
  }

  /** 완성품 바코드 목록 조회 (완료/마감 주문용) */
  async _fetchResultBarcodes(orderId) {
    try {
      const data = await ServiceUtil.restGet(`vas_trx/vas_orders/${orderId}/result_barcodes`)
      this.resultBarcodes = Array.isArray(data) ? data : []
    } catch (e) {
      this.resultBarcodes = []
    }
  }

  /** 바코드/번호로 주문 검색 후 매칭 주문 자동 선택 */
  /** 주문번호 바코드 스캔 — 오늘 목록에 없으면 날짜 무관 API 추가 조회 */
  async _onScanSearch() {
    const value = (this.scanValue || '').trim()
    if (!value) return

    // 1. 오늘 목록에서 먼저 탐색
    const found = this.orders.find(o => o.vas_no === value || o.id === value)
    if (found) {
      this._selectOrder(found)
      this.scanValue = ''
      return
    }

    // 2. 오늘 목록에 없으면 날짜 무관 API 조회
    try {
      const order = await ServiceUtil.restGet('vas_trx/vas_orders/find_by_no', { vas_no: value })
      if (order) {
        await this._fetchBomMap([order])
        this._selectOrder(order)
        this.scanValue = ''
      } else {
        this._showFeedback('주문을 찾을 수 없습니다', 'error')
        voiceService.error('주문을 찾을 수 없습니다')
      }
    } catch (e) {
      this._showFeedback('주문을 찾을 수 없습니다', 'error')
      voiceService.error('주문을 찾을 수 없습니다')
    }
  }

  /** 작업중 주문의 자재가 모두 투입중이면 자재 투입 단계를 건너뛸지 판단 */
  _shouldSkipMaterialInputStep(order) {
    return order.status === 'IN_PROGRESS' &&
      this._hasMaterialInputCompleted()
  }

  /** 작업중 주문의 실적이 이미 저장되어 있으면 작업 수행 단계를 건너뛸지 판단 */
  _shouldSkipResultInputStep(order) {
    return this._shouldSkipMaterialInputStep(order) &&
      Number(order.completed_qty || 0) > 0
  }

  /** 모든 자재가 투입 상태인지 확인 */
  _hasMaterialInputCompleted() {
    return this.orderItems.length > 0 &&
      this.orderItems.every(item => ['IN_USE', 'COMPLETED'].includes(item.status))
  }

  /** 디테일 손실 수량으로 불량 수량 계산 */
  _calcDefectQtyFromLoss() {
    const losses = this.orderItems
      .map(item => Number(item.loss_qty || 0))
      .filter(qty => qty > 0)

    if (losses.length === 0) return 0

    const planQty = Number(this.selectedOrder?.plan_qty || 0)
    const totalReqQty = this.orderItems.reduce((sum, item) => sum + Number(item.req_qty || 0), 0)
    const totalLossQty = losses.reduce((sum, qty) => sum + qty, 0)

    if (planQty > 0 && totalReqQty > 0) {
      return totalLossQty / (totalReqQty / planQty)
    }

    return Math.max(...losses)
  }

  /** 입력된 불량 수량을 디테일 손실 수량으로 반영 */
  _applyLossQuantities(defectQty) {
    const safeDefectQty = Number(defectQty || 0)
    const planQty = Number(this.selectedOrder?.plan_qty || 0)
    const items = this.orderItems.map(item => {
      const reqQty = Number(item.req_qty || 0)
      const lossQty = planQty > 0 ? safeDefectQty * (reqQty / planQty) : safeDefectQty

      return {
        ...item,
        loss_qty: lossQty
      }
    })

    this.orderItems = items
  }

  /* ============================================================
   * Step 1: 자재 투입
   * ============================================================ */

  /** 피킹 수량 입력 처리 */
  _onPickQtyInput(idx, value) {
    const items = [...this.orderItems]
    items[idx] = { ...items[idx], _pickedQty: value }
    this.orderItems = items
  }

  /** 개별 자재 확인 - 작업자가 자재 보유 여부를 현장에서 확인하는 UI 동작 (API 호출 없음) */
  _confirmPick(idx) {
    const item = this.orderItems[idx]
    const pickedQty = parseFloat(item._pickedQty)
    const reqQty = item.alloc_qty || item.req_qty || 0

    if (!pickedQty || pickedQty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'error')
      return
    }

    if (pickedQty < reqQty) {
      this._showFeedback(`피킹 수량(${pickedQty})이 목표 수량(${reqQty})에 미달합니다`, 'error')
      return
    }

    if (pickedQty > reqQty) {
      this._showFeedback('요청 수량을 초과할 수 없습니다', 'error')
      return
    }

    const items = [...this.orderItems]
    items[idx] = { ...items[idx], _picked: true, _active: false }

    // 다음 미확인 항목 활성화
    const nextUnpicked = items.findIndex((i, i2) => i2 > idx && !i._picked)
    if (nextUnpicked >= 0) {
      items[nextUnpicked] = { ...items[nextUnpicked], _active: true }
    }

    this.orderItems = items
    this._showFeedback('자재 확인', 'success')
    voiceService.success('확인 완료')
  }

  /* ============================================================
   * 단계 이동
   * ============================================================ */

  /** 다음 단계로 이동 - 각 단계별 유효성 검증 수행 */
  async _nextStep() {
    if (this.step === 1) {
      // 모든 자재 투입 완료 확인
      const allPicked = this.orderItems.every(i => i._picked)
      if (!allPicked && this.orderItems.length > 0) {
        this._showFeedback('모든 자재를 투입해주세요.', 'error')
        return
      }

      // 작업 시작 API 호출
      try {
        if (this.selectedOrder.status !== 'IN_PROGRESS') {
          const items = this.orderItems.map(item => ({
            itemId: item.id,
            usedQty: Number(item._pickedQty || item.used_qty || item.picked_qty || item.alloc_qty || item.req_qty || 0)
          }))

          await ServiceUtil.restPost(`vas_trx/vas_orders/${this.selectedOrder.id}/start`, { items })
          this.selectedOrder = { ...this.selectedOrder, status: 'IN_PROGRESS' }
        }
      } catch (err) {
        this._showFeedback(err.message || '작업 시작 실패', 'error')
        return
      }
    }

    if (this.step === 2) {
      // 실적 수량 검증
      if (this.completedQty <= 0) {
        this._showFeedback('완성 수량을 입력해주세요', 'error')
        return
      }

      const planQty = Number(this.selectedOrder?.plan_qty || 0)
      const totalResultQty = this.completedQty + (this.defectQty || 0)
      if (totalResultQty !== planQty) {
        this._showFeedback(
          `완성 + 불량 수량(${totalResultQty})이 계획 수량(${planQty})과 일치해야 합니다`,
          'error'
        )
        voiceService.error('완성 수량과 불량 수량의 합이 계획 수량과 일치해야 합니다')
        return
      }

      // 실적 등록 API 호출
      try {
        await ServiceUtil.restPost(`vas_trx/vas_orders/${this.selectedOrder.id}/results`, {
          result_qty: this.completedQty,
          defect_qty: this.defectQty
        })
        this.selectedOrder = {
          ...this.selectedOrder,
          completed_qty: this.completedQty
        }
        this._applyLossQuantities(this.defectQty)
        this._showFeedback('실적 등록 완료', 'success')
        voiceService.success('실적 등록 완료. 적치 로케이션을 스캔해주세요')
      } catch (err) {
        this._showFeedback(err.message || '실적 등록 실패', 'error')
        return
      }
    }

    this.step = Math.min(this.step + 1, 3)

    // 능동적 단계 안내
    if (this.step === 2) {
      voiceService.guide('완성 수량과 불량 수량을 입력해주세요')
    }
  }

  /** 이전 단계로 돌아가기 */
  _prevStep() {
    this.step = Math.max(this.step - 1, 1)
  }

  /* ============================================================
   * Step 3: 적치 및 작업 완료
   * ============================================================ */

  /** 로케이션 바코드 스캔 확인 — DB에 존재하는 로케이션 코드인지 검증 */
  async _onLocScanConfirm() {
    const value = (this.putawayLoc || '').trim()
    if (!value) return

    try {
      const filters = [{ name: 'loc_cd', value }]
      const data = await ServiceUtil.searchByPagination('locations', filters, [], 1, 1)
      const exists = data?.total > 0

      if (!exists) {
        this.putawayLoc = ''
        this._showFeedback('존재하지 않는 로케이션입니다', 'error')
        voiceService.error('존재하지 않는 로케이션입니다')
        return
      }

      this._showFeedback(`로케이션: ${value}`, 'success')
      voiceService.success(`로케이션 ${value} 스캔 완료`)
    } catch (e) {
      this.putawayLoc = ''
      this._showFeedback('로케이션 조회 중 오류가 발생했습니다', 'error')
    }
  }

  /** 작업 완료 - 완료 API 호출 후 주문 선택 화면으로 복귀 */
  async _completeWork() {
    if (!this.putawayLoc) {
      this._showFeedback('적치 로케이션을 스캔해주세요', 'error')
      return
    }

    try {
      await ServiceUtil.restPost(`vas_trx/vas_orders/${this.selectedOrder.id}/complete`, {
        destLocCd: this.putawayLoc,
        expiredDate: this.expiredDate || null
      })
      this._showFeedback('작업 완료!', 'success')
      voiceService.success('작업이 완료되었습니다')

      // 2초 후 주문 선택 화면으로 복귀
      setTimeout(() => {
        this._backToOrderSelect()
      }, 2000)
    } catch (err) {
      this._showFeedback(err.message || '작업 완료 실패', 'error')
      voiceService.error('작업 완료 실패')
    }
  }

  /* ============================================================
   * 하드웨어 스캐너 전역 핸들링
   * ============================================================ */

  /** 전역 스캔 라우팅 — 화면/단계 컨텍스트에 따라 적절한 핸들러로 전달 */
  _handleGlobalScan(barcode) {
    if (this.screen === 'order-select') {
      this.scanValue = barcode
      this._onScanSearch()
    } else if (this.screen === 'work') {
      const isReadOnly = ['COMPLETED', 'CLOSED'].includes(this.selectedOrder?.status)
      if (isReadOnly) return  // 완료/마감 주문은 스캔 입력 차단

      if (this.step === 1) {
        this._onSkuBarcodeScan(barcode)
      } else if (this.step === 3) {
        this.putawayLoc = barcode
        this._onLocScanConfirm()
      }
    }
  }

  /** Step 1 투입 중 SKU 바코드 스캔 — 자재 매칭 및 활성화 */
  _onSkuBarcodeScan(barcode) {
    const trimmed = (barcode || '').trim()
    if (!trimmed) return

    const matchIdx = this.orderItems.findIndex(
      item => !item._picked && (item.sku_cd === trimmed || item.barcode === trimmed)
    )

    if (matchIdx >= 0) {
      const items = this.orderItems.map((item, idx) => ({
        ...item,
        _active: idx === matchIdx
      }))
      this.orderItems = items
      this._showFeedback(`${this.orderItems[matchIdx].sku_cd} 자재 확인`, 'success')
      voiceService.success('자재 확인')
    } else {
      this._showFeedback('해당 자재를 찾을 수 없습니다', 'error')
      voiceService.error('자재를 찾을 수 없습니다')
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
      PLAN: '등록 중',
      APPROVED: '주문 확정',
      MATERIAL_READY: '자재 준비 완료',
      IN_PROGRESS: '작업 중',
      COMPLETED: '완료',
      CLOSED: '마감'
    }
    return map[status] || status || '-'
  }

  /** 화면 하단 피드백 토스트 표시 (2초 후 자동 사라짐) */
  _showFeedback(msg, type = 'success') {
    this.feedbackMsg = msg
    this.feedbackType = type

    if (this._feedbackTimer) clearTimeout(this._feedbackTimer)
    this._feedbackTimer = setTimeout(() => {
      this.feedbackMsg = ''
      this.feedbackType = ''
    }, 2000)
  }

  /** 음성 안내 ON/OFF 토글 */
  _toggleVoice() {
    this.voiceEnabled = voiceService.toggle()
    this._showFeedback(this.voiceEnabled ? '음성 안내 ON' : '음성 안내 OFF', 'info')
  }
}

window.customElements.define('vas-work-page', VasWorkPage)
