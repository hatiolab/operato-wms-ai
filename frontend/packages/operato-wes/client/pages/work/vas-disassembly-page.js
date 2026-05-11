import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { OxInputBarcode } from '@operato/input'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

import { HardwareScannerService } from './hardware-scanner-service.js'
import { voiceService } from './voice-service.js'

/**
 * VAS 해체 PDA 작업 화면
 *
 * 세트 해체(DISASSEMBLY) 유형 주문만 표시.
 * 작업 단계는 1단계(자재 투입)만 제공.
 *
 * PDA 특화:
 * - 큰 터치 버튼 (최소 44x44px)
 * - 바코드 스캐너 입력 연동
 * - 음성 안내 (성공/실패 피드백)
 */
class VasDisassemblyPage extends localize(i18next)(PageView) {
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

        /* 산출 품목 카드 헤더 (품목명 + + 버튼) */
        .item-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .item-card-header .item-info {
          flex: 1;
        }

        .add-row-btn {
          flex-shrink: 0;
          min-width: 44px;
          min-height: 44px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 22px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition: all 0.15s;
        }

        .add-row-btn:active {
          transform: scale(0.93);
        }

        /* 산출 행 목록 */
        .output-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }

        .output-row {
          display: flex;
          align-items: stretch;
          gap: 8px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-radius: 8px;
          padding: 5px 10px;
        }

        .output-row.confirmed {
          background: #e8f5e9;
          border-left: 3px solid #4CAF50;
        }

        /* 입력 필드 영역 (수량 + 날짜 세로 배치) */
        .output-row .row-fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .output-row .row-field-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .output-row .row-field-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          width: 47px;
          flex-shrink: 0;
        }

        .output-row .row-qty-input {
          flex: 1;
          padding: 5px 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 17px;
          font-weight: 700;
          text-align: center;
          background: #fff;
          min-width: 0;
        }

        .output-row .row-qty-input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        .output-row .row-qty-input:disabled {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
        }

        .output-row .date-wrap {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .output-row .row-date-input {
          width: 100%;
          padding: 5px 36px 5px 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 15px;
          background: #fff;
          box-sizing: border-box;
          appearance: none;
          -webkit-appearance: none;
          color: var(--md-sys-color-on-surface, #333);
        }

        .output-row .row-date-input::-webkit-calendar-picker-indicator {
          display: none;
        }

        .output-row .row-date-input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        .output-row .row-date-input:disabled {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
        }

        .output-row .date-icon-btn {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .output-row .date-icon-btn:disabled {
          opacity: 0.4;
          pointer-events: none;
        }

        /* 하단 버튼 행 (우측 정렬) */
        .output-row .row-bottom-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 4px;
        }

        .output-row .confirm-row-btn {
          min-width: 47px;
          min-height: 31px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          padding: 4px 8px;
          transition: all 0.15s;
        }

        .output-row .confirm-row-btn.done {
          background: #4CAF50;
        }

        .output-row .confirm-row-btn:active {
          transform: scale(0.95);
        }

        .output-row .confirm-row-btn:disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .output-row .remove-row-btn {
          min-width: 47px;
          min-height: 27px;
          border: 1px solid currentColor;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          background: transparent;
          color: var(--md-sys-color-error, #d32f2f);
          padding: 4px;
          line-height: 1;
          transition: all 0.15s;
        }

        .output-row .remove-row-btn.cancel {
          color: var(--md-sys-color-on-surface-variant, #888);
          border-color: var(--md-sys-color-on-surface-variant, #888);
        }

        .output-row .remove-row-btn:active {
          transform: scale(0.93);
        }

        /* 수량 합계 표시 */
        .qty-summary {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 6px;
          text-align: right;
        }

        .qty-summary.over {
          color: var(--md-sys-color-error, #d32f2f);
          font-weight: 700;
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
      orders: Array,
      bomMap: Object,
      selectedOrder: Object,
      orderItems: Array,
      bomItems: Array,
      scanValue: String,
      feedbackMsg: String,
      feedbackType: String,
      voiceEnabled: Boolean
    }
  }

  /** 생성자 - 해체 작업 화면 초기값 설정 */
  constructor() {
    super()
    this.loading = false
    this.filterStatus = 'ALL'
    this.screen = 'order-select'
    this.orders = []
    this.bomMap = {}
    this.selectedOrder = null
    this.orderItems = []
    this.bomItems = []
    this.scanValue = ''
    this.feedbackMsg = ''
    this.feedbackType = ''
    this.voiceEnabled = voiceService.enabled
    this._scannerService = null
  }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: TermsUtil.tMenu('VasDisassemblyPage')
    }
  }

  /** 화면 렌더링 - 주문 선택 또는 작업 화면 분기 */
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
   * 작업 화면 (1단계만)
   * ============================================================ */

  /** 작업 화면 렌더링 (주문 정보 + 1단계 자재 투입) */
  _renderWorkScreen() {
    return html`
      <div class="pda-content">
        <!-- 주문 요약 정보 -->
        ${this._renderOrderInfoCard()}

        <!-- 1단계: 자재 투입 -->
        ${this._renderStep1Picking()}

        <!-- 하단 버튼 -->
        ${this._renderBottomActions()}
      </div>
    `
  }

  /** 선택된 주문 요약 정보 카드 렌더링 */
  _renderOrderInfoCard() {
    const order = this.selectedOrder
    if (!order) return ''

    return html`
      <div class="order-info-card">
        <div class="title">${order.vas_no} | (${this.bomMap[order.vas_bom_id]?.set_sku_cd || '-'} / ${this.bomMap[order.vas_bom_id]?.set_sku_nm || '-'})</div>
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
      </div>
    `
  }

  /** 해체 산출 품목 렌더링 - BOM 하위품목 기준으로 해체 시 나오는 품목 리스트 표시 */
  _renderStep1Picking() {
    const planQty = this.selectedOrder?.plan_qty || 0
    const isReadOnly = ['COMPLETED', 'CLOSED'].includes(this.selectedOrder?.status)

    return html`
      <h3 style="margin: 0 0 12px; font-size: 16px;">해체 산출 품목</h3>

      <!-- 품목 목록 -->
      <div class="pick-list">
        ${this.bomItems.length === 0
        ? html`<div class="loading">산출 품목 조회 중...</div>`
        : this.bomItems.map((item, itemIdx) => {
            const totalQty = (item.component_qty || 0) * planQty
            const confirmedSum = (item._rows || []).filter(r => r.confirmed).reduce((s, r) => s + (Number(r.qty) || 0), 0)
            const isOver = confirmedSum > totalQty
            return html`
              <div class="pick-item">
                <div class="item-card-header">
                  <div class="item-info">
                    <div class="sku-name">${item.sku_cd} / ${item.sku_nm}</div>
                    <div class="sku-info">세트 1개당: ${item.component_qty || 0} ${item.unit || 'EA'}</div>
                    <div class="pick-input-row" style="margin-top: 8px;">
                      <span class="req-qty" style="font-size: 20px; font-weight: 700; color: var(--md-sys-color-on-surface, #333);">
                        ${totalQty} ${item.unit || 'EA'}
                      </span>
                    </div>
                  </div>
                  ${isReadOnly ? '' : html`
                    <button class="add-row-btn" @click="${() => this._addRow(itemIdx)}" title="행 추가">+</button>
                  `}
                </div>

                <!-- 입력 행 목록 -->
                ${(item._rows || []).length > 0 ? html`
                  <div class="output-rows">
                    ${(item._rows).map((row, rowIdx) => html`
                      <div class="output-row ${row.confirmed ? 'confirmed' : ''}">
                        <div class="row-fields">
                          <div class="row-field-item">
                            <span class="row-field-label">수량</span>
                            <input
                              class="row-qty-input"
                              type="number"
                              inputmode="numeric"
                              min="1"
                              placeholder="수량 입력"
                              .value="${row.qty}"
                              ?disabled="${row.confirmed}"
                              @input="${e => this._updateRow(itemIdx, rowIdx, 'qty', e.target.value)}"
                            />
                          </div>
                          <div class="row-field-item">
                            <span class="row-field-label">유통기한</span>
                            <div class="date-wrap">
                              <input
                                class="row-date-input"
                                type="date"
                                id="date-${itemIdx}-${rowIdx}"
                                .value="${row.expiry}"
                                ?disabled="${row.confirmed}"
                                @change="${e => this._updateRow(itemIdx, rowIdx, 'expiry', e.target.value)}"
                              />
                              <button
                                class="date-icon-btn"
                                ?disabled="${row.confirmed}"
                                @click="${() => this._openDatePicker(itemIdx, rowIdx)}"
                              >&#x1F4C5;</button>
                            </div>
                          </div>
                          <div class="row-bottom-actions">
                            ${row.confirmed
                              ? html`
                                <button class="confirm-row-btn done" disabled>✓</button>
                                <button class="remove-row-btn cancel" @click="${() => this._cancelConfirmRow(itemIdx, rowIdx)}" title="확정 취소">↩</button>
                              `
                              : html`
                                <button class="confirm-row-btn" @click="${() => this._confirmRow(itemIdx, rowIdx, totalQty)}">확정</button>
                                <button class="remove-row-btn" @click="${() => this._removeRow(itemIdx, rowIdx)}" title="삭제">✕</button>
                              `
                            }
                          </div>
                        </div>
                      </div>
                    `)}
                  </div>
                  <div class="qty-summary ${isOver ? 'over' : ''}">
                    확정 합계: ${confirmedSum} / ${totalQty} ${item.unit || 'EA'}
                    ${isOver ? ' ⚠ 초과' : ''}
                  </div>
                ` : ''}
              </div>
            `
          })}
      </div>
    `
  }

  /** 하단 액션 버튼 렌더링 */
  _renderBottomActions() {
    const isReadOnly = ['COMPLETED', 'CLOSED'].includes(this.selectedOrder?.status)

    if (isReadOnly) {
      return html`
        <div class="bottom-actions">
          <button class="pda-btn outline" @click="${this._backToOrderSelect}">목록으로</button>
        </div>
      `
    }

    return html`
      <div class="bottom-actions">
        <button class="pda-btn outline" @click="${this._backToOrderSelect}">취소</button>
        <button class="pda-btn primary" @click="${this._nextStep}">완료</button>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  /** 페이지 활성화 시 작업 주문 목록 조회 + 스캐너 서비스 시작 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
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

  /** 세트 해체 VAS 주문 목록 조회 */
  async _fetchOrders() {
    try {
      this.loading = true
      const data = await ServiceUtil.restGet('vas_trx/monitor/orders', {
        status: 'MATERIAL_READY,IN_PROGRESS,COMPLETED,CLOSED',
        vasType: 'DISASSEMBLY'
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

  /** 해체 BOM 하위품목(VasBomItem) 조회 - 해체 시 산출되는 품목 목록 */
  async _fetchBomItems(bomId) {
    if (!bomId) {
      this.bomItems = []
      return
    }
    try {
      const data = await ServiceUtil.restGet(`vas_boms/${bomId}/items`)
      this.bomItems = (data || []).map(item => ({ ...item, _rows: [] }))
    } catch (err) {
      console.error('BOM 하위품목 조회 실패:', err)
      this.bomItems = []
    }
  }

  /** 상태 필터 토글 — 같은 카드를 다시 클릭하면 전체(ALL)로 복귀 */
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
    await Promise.all([
      this._fetchOrderItems(order.id),
      this._fetchBomItems(order.vas_bom_id)
    ])

    if (['COMPLETED', 'CLOSED'].includes(order.status)) {
      voiceService.guide(`주문 ${order.vas_no} 선택. 완료된 작업입니다`)
    } else {
      voiceService.guide(`주문 ${order.vas_no} 선택. 해체 산출 품목을 확인해주세요`)
    }
  }

  /** 주문 선택 화면으로 돌아가기 */
  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this.bomItems = []
    this._fetchOrders()
  }

  /** 바코드/번호로 주문 검색 후 매칭 주문 자동 선택 */
  async _onScanSearch() {
    const value = (this.scanValue || '').trim()
    if (!value) return

    const found = this.orders.find(o => o.vas_no === value || o.id === value)
    if (found) {
      this._selectOrder(found)
      this.scanValue = ''
      return
    }

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

  /* ============================================================
   * 산출 행 관리
   * ============================================================ */

  /** 품목에 새 입력 행 추가 */
  _addRow(itemIdx) {
    const items = [...this.bomItems]
    const item = { ...items[itemIdx] }
    item._rows = [...(item._rows || []), { qty: '', expiry: '', confirmed: false }]
    items[itemIdx] = item
    this.bomItems = items
  }

  /** 행의 필드 값 업데이트 */
  _updateRow(itemIdx, rowIdx, field, value) {
    const items = [...this.bomItems]
    const item = { ...items[itemIdx] }
    const rows = [...item._rows]
    rows[rowIdx] = { ...rows[rowIdx], [field]: value }
    item._rows = rows
    items[itemIdx] = item
    this.bomItems = items
  }

  /** 행 확정 - 수량 검증 후 confirmed 처리 */
  _confirmRow(itemIdx, rowIdx, totalQty) {
    const item = this.bomItems[itemIdx]
    const row = item._rows[rowIdx]
    const qty = Number(row.qty)

    if (!qty || qty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'error')
      return
    }

    const confirmedSum = item._rows
      .filter((r, i) => r.confirmed && i !== rowIdx)
      .reduce((s, r) => s + (Number(r.qty) || 0), 0)

    if (confirmedSum + qty > totalQty) {
      this._showFeedback(`수량 합계(${confirmedSum + qty})가 산출 수량(${totalQty})을 초과합니다`, 'error')
      return
    }

    const items = [...this.bomItems]
    const updItem = { ...items[itemIdx] }
    const rows = [...updItem._rows]
    rows[rowIdx] = { ...rows[rowIdx], confirmed: true }
    updItem._rows = rows
    items[itemIdx] = updItem
    this.bomItems = items
    voiceService.success('확정 완료')
  }

  /** 행 확정 취소 */
  _cancelConfirmRow(itemIdx, rowIdx) {
    const items = [...this.bomItems]
    const item = { ...items[itemIdx] }
    const rows = [...item._rows]
    rows[rowIdx] = { ...rows[rowIdx], confirmed: false }
    item._rows = rows
    items[itemIdx] = item
    this.bomItems = items
  }

  /** 행 삭제 */
  _removeRow(itemIdx, rowIdx) {
    const items = [...this.bomItems]
    const item = { ...items[itemIdx] }
    item._rows = item._rows.filter((_, i) => i !== rowIdx)
    items[itemIdx] = item
    this.bomItems = items
  }

  /** 달력 날짜 선택기 열기 */
  _openDatePicker(itemIdx, rowIdx) {
    const input = this.shadowRoot.querySelector(`#date-${itemIdx}-${rowIdx}`)
    if (!input) return
    if (input.showPicker) {
      input.showPicker()
    } else {
      input.click()
    }
  }

  /** 완료 버튼 - 확정 행 검증 후 해체 완료 API 호출 */
  async _nextStep() {
    // 1. 모든 품목에 확정 행이 최소 1개 이상 있는지 검증
    const noRows = this.bomItems.find(item => !(item._rows || []).some(r => r.confirmed))
    if (noRows) {
      this._showFeedback(`'${noRows.sku_nm}' 품목에 확정된 행이 없습니다`, 'error')
      return
    }

    // 2. 미확정 행(입력 중인 행)이 남아있으면 경고
    const pendingRows = this.bomItems.some(item =>
      (item._rows || []).some(r => !r.confirmed)
    )
    if (pendingRows) {
      this._showFeedback('확정되지 않은 행이 있습니다. 확정 후 완료해주세요', 'error')
      return
    }

    // 3. 산출 행 목록 구성 [{skuCd, qty, expiryDate}]
    const outputs = []
    for (const item of this.bomItems) {
      for (const row of item._rows) {
        outputs.push({
          skuCd: item.sku_cd,
          qty: Number(row.qty),
          expiryDate: row.expiry || null
        })
      }
    }

    try {
      await ServiceUtil.restPost(
        `vas_trx/vas_orders/${this.selectedOrder.id}/complete_disassembly`,
        outputs
      )
      this._showFeedback('해체 작업이 완료되었습니다', 'success')
      voiceService.success('작업 완료')
      setTimeout(() => this._backToOrderSelect(), 1500)
    } catch (err) {
      this._showFeedback(err.message || '완료 처리 실패', 'error')
    }
  }

  /* ============================================================
   * 하드웨어 스캐너 전역 핸들링
   * ============================================================ */

  /** 전역 스캔 라우팅 — 화면 컨텍스트에 따라 적절한 핸들러로 전달 */
  _handleGlobalScan(barcode) {
    if (this.screen === 'order-select') {
      this.scanValue = barcode
      this._onScanSearch()
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

window.customElements.define('vas-disassembly-page', VasDisassemblyPage)
