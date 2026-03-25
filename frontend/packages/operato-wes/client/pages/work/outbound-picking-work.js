import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxInputBarcode } from '@operato/input'

import { HardwareScannerService } from './hardware-scanner-service.js'
import { voiceService } from './voice-service.js'

/**
 * B2C 출고 피킹 PDA 작업 화면
 *
 * 화면 모드:
 * - order-select: 피킹 지시 선택 (WAIT/RUN 상태 목록 + 바코드 스캔)
 * - work: 피킹 작업 (항목 체크리스트 + 바코드 스캔 + 수량 확인)
 * - complete: 피킹 완료 (통계 + 출력 + 네비게이션)
 *
 * 작업 흐름:
 * 1. 피킹 지시 선택 (바코드 스캔 또는 목록 클릭)
 * 2. 피킹 작업 시작 (WAIT→RUN 전이)
 * 3. 항목별 피킹: 로케이션 이동 → 바코드 스캔 → 수량 확인 → 피킹 확인
 * 4. 전체 완료 후 통계/출력/다음작업
 *
 * PDA 최적화:
 * - OxInputBarcode 바코드 스캔 컴포넌트
 * - 큰 터치 버튼, 큰 폰트
 * - 로케이션 대형 안내 표시
 * - 음성 피드백 (VoiceService)
 * - 하드웨어 스캐너 (HardwareScannerService)
 */
class OutboundPickingWork extends localize(i18next)(PageView) {
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

        .icon-btn.close {
          background: transparent;
          color: var(--md-sys-color-on-surface-variant, #666);
          font-size: 24px;
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

        /* 피킹 지시 목록 */
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
        }

        .order-card:active {
          transform: scale(0.98);
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }

        .order-card.wait {
          border-left: 4px solid #2196F3;
        }

        .order-card.run {
          border-left: 4px solid #FF9800;
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

        .order-card .action-label {
          font-size: 14px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 16px;
        }

        .order-card.wait .action-label {
          background: #E3F2FD;
          color: #1565C0;
        }

        .order-card.run .action-label {
          background: #FFF3E0;
          color: #E65100;
        }

        .order-card .order-stats {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 4px;
        }

        .order-card .order-stats .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .order-card .mini-progress {
          height: 6px;
          background: #E0E0E0;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 8px;
        }

        .order-card .mini-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #4CAF50);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        /* 진행률 바 */
        .progress-section {
          margin-bottom: 16px;
        }

        .progress-bar-container {
          width: 100%;
          height: 10px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #4CAF50);
          transition: width 0.6s ease;
          border-radius: 5px;
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

        /* 현재 피킹 항목 카드 */
        .current-item-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .current-item-card .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 12px;
        }

        /* 로케이션 안내 */
        .location-display {
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          padding: 16px 24px;
          background: #E3F2FD;
          border: 2px solid #2196F3;
          border-radius: 12px;
          color: #1565C0;
          letter-spacing: 2px;
          margin-bottom: 16px;
        }

        .location-display .loc-label {
          font-size: 12px;
          font-weight: 600;
          color: #1976D2;
          letter-spacing: 0;
          margin-bottom: 4px;
        }

        /* 상품 정보 */
        .sku-info-block {
          margin-bottom: 16px;
        }

        .sku-info-block .sku-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          padding: 4px 0;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .sku-info-block .sku-row .label {
          min-width: 70px;
        }

        .sku-info-block .sku-row .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          text-align: right;
        }

        .qty-highlight {
          font-size: 20px;
          font-weight: 700;
          color: #E65100;
          text-align: center;
          padding: 8px;
          background: #FFF3E0;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        /* 바코드 스캔 영역 */
        .barcode-section {
          margin-bottom: 16px;
        }

        .barcode-section label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 6px;
        }

        .barcode-section ox-input-barcode {
          width: 100%;
          --barcodescan-input-font-size: 18px;
          --barcodescan-input-padding: 14px 16px;
          --barcodescan-input-border-radius: 8px;
        }

        .barcode-matched {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #E8F5E9;
          border: 1px solid #4CAF50;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #2E7D32;
          margin-top: 8px;
        }

        /* 수량 입력 */
        .qty-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .qty-input-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          min-width: 50px;
        }

        .qty-input-group input {
          flex: 1;
          padding: 12px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          box-sizing: border-box;
          outline: none;
        }

        .qty-input-group input:focus {
          border-color: #2196F3;
        }

        .qty-input-group .unit {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 액션 버튼 */
        .form-actions {
          display: flex;
          gap: 12px;
        }

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
        }

        .pda-btn:active {
          transform: scale(0.97);
        }

        .pda-btn:disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .pda-btn.confirm {
          flex: 2;
          background: linear-gradient(135deg, #4CAF50, #388E3C);
          color: #fff;
          font-size: 18px;
          min-height: 56px;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .pda-btn.confirm:active {
          box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
        }

        .pda-btn.skip {
          flex: 1;
          background: #F5F5F5;
          color: #757575;
          font-size: 15px;
          border: 1px solid #E0E0E0;
        }

        .pda-btn.primary {
          background: #2196F3;
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
          color: #2196F3;
          border: 2px solid #2196F3;
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
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 12px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 14px;
          cursor: pointer;
        }

        .checklist-item:last-child {
          border-bottom: none;
        }

        .checklist-item.completed {
          opacity: 0.6;
        }

        .checklist-item.active {
          background: #FFF3E0;
          margin: 0 -16px;
          padding: 10px 16px;
          border-radius: 8px;
          border-left: 3px solid #FF9800;
        }

        .checklist-item .icon {
          font-size: 18px;
          min-width: 24px;
          text-align: center;
        }

        .checklist-item.completed .icon { color: #4CAF50; }
        .checklist-item.active .icon { color: #FF9800; }
        .checklist-item .icon { color: #BDBDBD; }

        .checklist-item .item-info {
          flex: 1;
          min-width: 0;
        }

        .checklist-item .item-loc {
          font-weight: 700;
          color: #1565C0;
          font-size: 13px;
        }

        .checklist-item .item-sku {
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .checklist-item .item-qty {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 하단 액션 */
        .bottom-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
          padding-bottom: 24px;
        }

        .bottom-actions .pda-btn {
          width: 100%;
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
      pickingOrders: Array,
      pickingOrder: Object,
      pickingItems: Array,
      currentItemIndex: Number,
      completedCount: Number,
      totalCount: Number,
      scanValue: String,
      pickQty: Number,
      barcodeMatched: Boolean,
      feedbackMsg: String,
      feedbackType: String,
      voiceEnabled: Boolean,
      startTime: Number
    }
  }

  constructor() {
    super()
    this.loading = false
    this.screen = 'order-select'
    this.pickingOrders = []
    this.pickingOrder = null
    this.pickingItems = []
    this.currentItemIndex = -1
    this.completedCount = 0
    this.totalCount = 0
    this.scanValue = ''
    this.pickQty = 0
    this.barcodeMatched = false
    this.feedbackMsg = ''
    this.feedbackType = ''
    this.voiceEnabled = voiceService.enabled
    this.startTime = 0
    this._scannerService = null
  }

  get context() {
    return {
      title: TermsUtil.tMenu('OutboundPickingWork')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`
      ${this.screen === 'order-select'
        ? this._renderOrderSelect()
        : this.screen === 'work'
          ? this._renderPickWork()
          : this._renderComplete()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
    `
  }

  /* ============================================================
   * 1단계: 피킹 지시 선택 화면
   * ============================================================ */

  _renderOrderSelect() {
    return html`
      <div class="pda-content">
        <div class="pda-header">
          <div class="title">📦 B2C 피킹 작업</div>
          <div class="actions">
            <button
              class="icon-btn ${this.voiceEnabled ? 'voice-on' : 'voice-off'}"
              @click="${this._toggleVoice}"
            >${this.voiceEnabled ? '🔊' : '🔇'}</button>
          </div>
        </div>

        <div class="scan-input-group">
          <label>피킹 지시번호 스캔</label>
          <div class="scan-input">
            <ox-input-barcode
              placeholder="피킹 지시번호 스캔"
              @change="${e => { this.scanValue = e.target.value; this._onScanPickingOrder() }}"
            ></ox-input-barcode>
            <button class="refresh-btn" @click="${this._loadPickingOrders}" title="새로고침">↻</button>
          </div>
        </div>

        ${this.loading
          ? html`<div class="loading">피킹 지시 조회 중...</div>`
          : this.pickingOrders.length > 0
            ? html`
                <div class="order-list-title">오늘의 피킹 지시 (${this.pickingOrders.length}건)</div>
                <div class="order-list">
                  ${this.pickingOrders.map(order => this._renderPickingOrderCard(order))}
                </div>
              `
            : html`
                <div class="empty-state">
                  <span class="empty-icon">📋</span>
                  <span class="empty-text">피킹 대상 지시가 없습니다</span>
                </div>
              `}
      </div>
    `
  }

  _renderPickingOrderCard(order) {
    const statusClass = (order.status || '').toLowerCase()
    const isRun = order.status === 'RUN'
    const progressPct = order.progress_rate || 0

    return html`
      <div class="order-card ${statusClass}" @click="${() => this._startPickingWork(order)}">
        <div class="order-header">
          <div class="order-no">📋 ${order.pick_order_no || '-'}</div>
          <span class="action-label">${isRun ? '계속 →' : '시작 →'}</span>
        </div>
        <div class="order-stats">
          <span>주문: <span class="value">${order.plan_order || 0}건</span></span>
          <span>SKU: <span class="value">${order.plan_sku || 0}종</span></span>
          <span>수량: <span class="value">${order.plan_pcs || 0}pcs</span></span>
        </div>
        ${isRun ? html`
          <div class="mini-progress">
            <div class="mini-progress-fill" style="width: ${Math.min(progressPct, 100)}%"></div>
          </div>
          <div style="font-size:12px;color:#E65100;margin-top:4px;text-align:right">${Math.round(progressPct)}%</div>
        ` : ''}
      </div>
    `
  }

  /* ============================================================
   * 3단계: 피킹 작업 화면
   * ============================================================ */

  _renderPickWork() {
    if (!this.pickingOrder) return ''

    const completedCount = this.pickingItems.filter(i => i.status === 'END').length
    const totalCount = this.pickingItems.length
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return html`
      <div class="pda-content">
        <!-- 헤더 -->
        <div class="pda-header">
          <div class="title">📦 ${this.pickingOrder.pick_order_no || ''}</div>
          <div class="actions">
            <button
              class="icon-btn ${this.voiceEnabled ? 'voice-on' : 'voice-off'}"
              @click="${this._toggleVoice}"
            >${this.voiceEnabled ? '🔊' : '🔇'}</button>
            <button class="icon-btn close" @click="${this._confirmBackToList}">✕</button>
          </div>
        </div>

        <!-- 진행률 -->
        <div class="progress-section">
          <div class="progress-bar-container">
            <div
              class="progress-bar-fill ${progressPct >= 100 ? 'complete' : ''}"
              style="width: ${Math.min(progressPct, 100)}%"
            ></div>
          </div>
          <div class="progress-label">
            <span>${completedCount}/${totalCount} 항목</span>
            <span>${progressPct}%</span>
          </div>
        </div>

        <!-- 현재 피킹 항목 -->
        ${this.currentItemIndex >= 0 ? this._renderCurrentItem() : ''}

        <!-- 항목 체크리스트 -->
        ${this._renderItemChecklist()}

        <!-- 하단 액션 -->
        <div class="bottom-actions">
          <button class="pda-btn warning" @click="${this._confirmBackToList}">🏠 목록으로</button>
        </div>
      </div>
    `
  }

  _renderCurrentItem() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return ''

    return html`
      <div class="current-item-card">
        <div class="section-title">📍 현재 피킹 항목</div>

        <!-- 로케이션 -->
        <div class="location-display">
          <div class="loc-label">피킹 로케이션</div>
          ${item.from_loc_cd || '미지정'}
        </div>

        <!-- 상품 정보 -->
        <div class="sku-info-block">
          <div class="sku-row">
            <span class="label">SKU</span>
            <span class="value">${item.sku_cd || '-'}</span>
          </div>
          <div class="sku-row">
            <span class="label">상품명</span>
            <span class="value">${item.sku_nm || '-'}</span>
          </div>
          ${item.lot_no ? html`
            <div class="sku-row">
              <span class="label">LOT</span>
              <span class="value">${item.lot_no}</span>
            </div>
          ` : ''}
          ${item.expired_date ? html`
            <div class="sku-row">
              <span class="label">유통기한</span>
              <span class="value">${item.expired_date}</span>
            </div>
          ` : ''}
        </div>

        <!-- 지시 수량 -->
        <div class="qty-highlight">
          지시: ${item.order_qty || 0} EA
        </div>

        <!-- 바코드 스캔 -->
        <div class="barcode-section">
          <label>🔍 바코드 스캔</label>
          <ox-input-barcode
            placeholder="상품 바코드 스캔"
            @change="${e => this._onBarcodeScan(e.target.value)}"
          ></ox-input-barcode>
          ${this.barcodeMatched ? html`
            <div class="barcode-matched">✓ 바코드 확인 완료</div>
          ` : ''}
        </div>

        <!-- 수량 입력 -->
        <div class="qty-input-group">
          <label>수량</label>
          <input
            type="number"
            inputmode="numeric"
            .value="${this.pickQty || ''}"
            @input="${e => { this.pickQty = parseFloat(e.target.value) || 0 }}"
          />
          <span class="unit">/ ${item.order_qty || 0} EA</span>
        </div>

        <!-- 액션 버튼 -->
        <div class="form-actions">
          <button class="pda-btn skip" @click="${this._skipCurrentItem}">건너뛰기</button>
          <button
            class="pda-btn confirm"
            ?disabled="${!this.barcodeMatched}"
            @click="${this._confirmPick}"
          >✓ 피킹확인</button>
        </div>
      </div>
    `
  }

  _renderItemChecklist() {
    return html`
      <div class="item-checklist">
        <div class="title">피킹 항목 목록</div>
        ${this.pickingItems.map((item, idx) => {
          const isCompleted = item.status === 'END'
          const isActive = idx === this.currentItemIndex
          return html`
            <div
              class="checklist-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}"
              @click="${() => this._focusItem(idx)}"
            >
              <div class="icon">
                ${isCompleted ? '✓' : isActive ? '→' : '☐'}
              </div>
              <div class="item-info">
                <div class="item-loc">${item.from_loc_cd || '-'}</div>
                <div class="item-sku">${item.sku_cd} ${item.sku_nm ? `- ${item.sku_nm}` : ''}</div>
              </div>
              <div class="item-qty">× ${item.order_qty || 0}</div>
            </div>
          `
        })}
      </div>
    `
  }

  /* ============================================================
   * 4단계: 피킹 완료 화면
   * ============================================================ */

  _renderComplete() {
    const elapsed = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    const timeStr = `${minutes}분 ${seconds}초`

    return html`
      <div class="pda-content">
        <div class="completion-card">
          <div class="icon">✅</div>
          <div class="message">피킹 완료!</div>
        </div>

        <div class="completion-stats">
          <div class="stat-row">
            <span class="label">피킹 지시</span>
            <span class="value">${this.pickingOrder?.pick_order_no || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="label">총 SKU</span>
            <span class="value">${this.totalCount}종</span>
          </div>
          <div class="stat-row">
            <span class="label">총 수량</span>
            <span class="value">${this._calcTotalPickedQty()} EA</span>
          </div>
          <div class="stat-row">
            <span class="label">소요 시간</span>
            <span class="value">${timeStr}</span>
          </div>
        </div>

        <div class="bottom-actions">
          <button class="pda-btn primary" @click="${this._printPickingSheet}">📄 피킹 지시서 출력</button>
          <button class="pda-btn success" @click="${this._startNextPicking}">📋 다음 피킹 지시</button>
          <button class="pda-btn warning" @click="${this._backToOrderSelect}">🏠 목록으로 돌아가기</button>
        </div>
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

      if (this.screen === 'order-select') {
        await this._loadPickingOrders()
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
  }

  /* ============================================================
   * 1단계: 데이터 조회
   * ============================================================ */

  async _loadPickingOrders() {
    try {
      this.loading = true
      const data = await ServiceUtil.restGet('picking_orders', {
        status: 'WAIT,RUN',
        order_date: this._todayStr()
      })
      this.pickingOrders = (data?.items || data || [])
      this.loading = false
    } catch (err) {
      console.error('피킹 지시 조회 실패:', err)
      this.pickingOrders = []
      this.loading = false
    }
  }

  _onScanPickingOrder() {
    const value = (this.scanValue || '').trim()
    if (!value) return

    const found = this.pickingOrders.find(
      o => o.pick_order_no === value || o.id === value
    )
    if (found) {
      this._startPickingWork(found)
      this.scanValue = ''
    } else {
      this._showFeedback('피킹 지시를 찾을 수 없습니다', 'error')
      voiceService.error('피킹 지시를 찾을 수 없습니다')
    }
  }

  /* ============================================================
   * 2단계: 피킹 작업 시작
   * ============================================================ */

  async _startPickingWork(order) {
    try {
      this.loading = true

      // WAIT 상태인 경우 시작 API 호출
      if (order.status === 'WAIT') {
        await ServiceUtil.restPost(`outbound_trx/picking_orders/${order.id}/start`)
      }

      // 피킹 항목 로딩
      const items = await ServiceUtil.restGet(`picking_orders/${order.id}/items`)
      this.pickingItems = (items?.items || items || []).sort((a, b) => (a.rank || 0) - (b.rank || 0))
      this.totalCount = this.pickingItems.length
      this.completedCount = this.pickingItems.filter(i => i.status === 'END').length

      this.pickingOrder = order
      this.screen = 'work'
      this.startTime = Date.now()
      this.loading = false

      // 첫 미완료 항목으로 이동
      this._moveToNextItem(true)

      voiceService.guide(`피킹 작업을 시작합니다. 총 ${this.totalCount}건입니다.`)
    } catch (err) {
      console.error('피킹 작업 시작 실패:', err)
      this._showFeedback('피킹 작업 시작 실패', 'error')
      voiceService.error('피킹 작업 시작에 실패했습니다')
      this.loading = false
    }
  }

  /* ============================================================
   * 3단계: 바코드 스캔 처리
   * ============================================================ */

  _onBarcodeScan(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return

    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return

    if (item.barcode === trimmed || item.sku_cd === trimmed) {
      this.barcodeMatched = true
      this._showFeedback('바코드 확인 완료', 'success')
      voiceService.success('확인되었습니다')
    } else {
      this.barcodeMatched = false
      this._showFeedback('바코드가 일치하지 않습니다', 'error')
      voiceService.error('바코드가 일치하지 않습니다')
    }

    this._refocusBarcodeInput()
  }

  /* ============================================================
   * 3단계: 피킹 확인
   * ============================================================ */

  async _confirmPick() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return

    if (!this.barcodeMatched) {
      this._showFeedback('바코드를 먼저 스캔해주세요', 'warning')
      voiceService.warning('바코드를 먼저 스캔해주세요')
      return
    }

    if (!this.pickQty || this.pickQty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'error')
      voiceService.error('수량을 입력해주세요')
      return
    }

    if (this.pickQty > (item.order_qty || 0)) {
      this._showFeedback('지시 수량을 초과할 수 없습니다', 'warning')
      voiceService.warning('지시 수량을 초과할 수 없습니다')
      return
    }

    try {
      // Operator 전용 API 호출
      await ServiceUtil.restPut(`picking_orders/item/operator/${item.id}`, {
        barcode: item.barcode || item.sku_cd,
        fromLocCd: item.from_loc_cd,
        lotNo: item.lot_no || '',
        pickQty: this.pickQty,
        pickBox: 0,
        pickEa: this.pickQty
      })

      // 로컬 상태 업데이트
      const items = [...this.pickingItems]
      items[this.currentItemIndex] = {
        ...items[this.currentItemIndex],
        status: 'END',
        pick_qty: this.pickQty
      }
      this.pickingItems = items
      this.completedCount = items.filter(i => i.status === 'END').length

      const remaining = this.totalCount - this.completedCount
      this._showFeedback(`피킹 완료 (${this.completedCount}/${this.totalCount})`, 'success')
      voiceService.success(`피킹 완료. ${this.completedCount} / ${this.totalCount}`)

      // 다음 항목으로 이동 또는 완료
      setTimeout(() => {
        if (remaining === 0) {
          this._onPickingComplete()
        } else {
          this._moveToNextItem()
        }
      }, 500)
    } catch (err) {
      console.error('피킹 확인 실패:', err)
      this._showFeedback(err.message || '피킹 확인 실패', 'error')
      voiceService.error('피킹 확인에 실패했습니다')
    }
  }

  _skipCurrentItem() {
    this._showFeedback('항목 건너뛰기', 'info')
    this._moveToNextItem()
  }

  _moveToNextItem(initial = false) {
    const startIdx = initial ? 0 : this.currentItemIndex + 1

    // 현재 위치 이후에서 미완료 항목 찾기
    let nextIdx = this.pickingItems.findIndex(
      (item, idx) => idx >= startIdx && item.status !== 'END'
    )

    // 못 찾으면 처음부터 다시 탐색 (wrap-around)
    if (nextIdx < 0 && !initial) {
      nextIdx = this.pickingItems.findIndex(item => item.status !== 'END')
    }

    if (nextIdx >= 0) {
      this.currentItemIndex = nextIdx
      this._initPickForm()

      const item = this.pickingItems[nextIdx]
      if (item.from_loc_cd) {
        voiceService.guide(`${item.from_loc_cd}으로 이동하세요`)
      }
    } else {
      // 모든 항목 완료
      this.currentItemIndex = -1
      this._onPickingComplete()
    }
  }

  _focusItem(idx) {
    const item = this.pickingItems[idx]
    if (!item) return
    if (item.status === 'END') {
      this._showFeedback('이미 피킹 완료된 항목입니다', 'info')
      return
    }
    this.currentItemIndex = idx
    this._initPickForm()
  }

  _initPickForm() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return
    this.pickQty = item.order_qty || 0
    this.barcodeMatched = false
  }

  /* ============================================================
   * 4단계: 피킹 완료
   * ============================================================ */

  _onPickingComplete() {
    this.screen = 'complete'
    voiceService.success('모든 피킹이 완료되었습니다')
  }

  async _printPickingSheet() {
    if (!this.pickingOrder) return
    try {
      await ServiceUtil.restPost(
        `outbound_trx/picking_orders/${this.pickingOrder.id}/print_picking_sheet`
      )
      this._showFeedback('피킹 지시서 출력 요청 완료', 'success')
      voiceService.success('피킹 지시서 출력 요청 완료')
    } catch (err) {
      console.error('피킹 지시서 출력 실패:', err)
      this._showFeedback('출력 요청 실패', 'error')
    }
  }

  async _startNextPicking() {
    this.screen = 'order-select'
    this.pickingOrder = null
    this.pickingItems = []
    this.currentItemIndex = -1
    this.barcodeMatched = false
    await this._loadPickingOrders()
  }

  _backToOrderSelect() {
    this.screen = 'order-select'
    this.pickingOrder = null
    this.pickingItems = []
    this.currentItemIndex = -1
    this.barcodeMatched = false
    this._loadPickingOrders()
  }

  _confirmBackToList() {
    const incomplete = this.pickingItems.filter(i => i.status !== 'END').length
    if (incomplete > 0) {
      if (!confirm(`미완료 항목이 ${incomplete}건 있습니다. 목록으로 돌아가시겠습니까?`)) {
        return
      }
    }
    this._backToOrderSelect()
  }

  /* ============================================================
   * 하드웨어 스캐너 전역 핸들링
   * ============================================================ */

  _handleGlobalScan(barcode) {
    if (this.screen === 'order-select') {
      this.scanValue = barcode
      this._onScanPickingOrder()
    } else if (this.screen === 'work') {
      this._onBarcodeScan(barcode)
    }
  }

  _refocusBarcodeInput() {
    requestAnimationFrame(() => {
      const el = this.renderRoot.querySelector('.barcode-section ox-input-barcode')
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

  _calcTotalPickedQty() {
    return this.pickingItems.reduce((sum, item) => sum + (item.pick_qty || item.order_qty || 0), 0)
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

window.customElements.define('outbound-picking-work', OutboundPickingWork)
