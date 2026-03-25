import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * B2C 피킹 작업 PC 화면
 *
 * 2패널 레이아웃:
 * - 좌측: WAIT/RUN 상태 피킹 지시 목록 (필터/검색)
 * - 우측: empty → work (피킹 작업) → complete (완료)
 *
 * 작업 흐름:
 * 1. 좌측에서 피킹 지시 선택 (카드 클릭 또는 바코드 스캔)
 * 2. WAIT → start API → RUN 전환
 * 3. 항목별: 로케이션 확인 → 바코드 스캔 → 수량 입력 → 피킹 확인
 * 4. 전체 완료 → 통계 + 피킹 지시서 출력 + 다음 작업
 *
 * 바코드 입력: USB 바코드 스캐너 (키보드 에뮬레이션)
 * 키보드 단축키: F2(확인), F3(건너뛰기), F5(새로고침), Escape(닫기)
 */
class OutboundPickingPc extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: var(--md-sys-color-background, #FAFAFA);
          font-family: var(--md-sys-typescale-body-large-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
          overflow: hidden;
        }

        /* ===== 페이지 헤더 ===== */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: var(--md-sys-color-surface, white);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .page-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #212121);
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: var(--md-sys-color-surface, #fff);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
          color: var(--md-sys-color-on-surface, #333);
        }

        .btn-icon:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        /* ===== 메인 컨텐츠 (2패널) ===== */
        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* ===== 좌측 패널 ===== */
        .left-panel {
          width: 350px;
          min-width: 300px;
          background: var(--md-sys-color-surface, white);
          border-right: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .search-area {
          padding: 12px 16px;
          border-bottom: 1px solid #F0F0F0;
        }

        .search-area input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          font-size: 13px;
          box-sizing: border-box;
          outline: none;
        }

        .search-area input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
        }

        .filter-chips {
          display: flex;
          gap: 6px;
          padding: 8px 16px;
          border-bottom: 1px solid #F0F0F0;
          flex-wrap: wrap;
        }

        .filter-chip {
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 12px;
          cursor: pointer;
          border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          background: var(--md-sys-color-surface, white);
          transition: all 0.15s;
          color: var(--md-sys-color-on-surface, #333);
        }

        .filter-chip:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .filter-chip.active {
          background: var(--md-sys-color-primary, #1976D2);
          color: white;
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .filter-chip .badge {
          display: inline-block;
          min-width: 16px;
          padding: 0 4px;
          border-radius: 8px;
          font-size: 11px;
          text-align: center;
          margin-left: 4px;
          background: rgba(0,0,0,0.08);
        }

        .filter-chip.active .badge {
          background: rgba(255,255,255,0.3);
        }

        .order-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .order-list-header {
          padding: 4px 8px 8px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #757575);
        }

        /* ===== 피킹 지시 카드 ===== */
        .order-card {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 6px;
          border: 1px solid #F0F0F0;
          border-left: 3px solid #2196F3;
          cursor: pointer;
          transition: all 0.15s;
        }

        .order-card:hover {
          background: var(--md-sys-color-surface-variant, #F5F5F5);
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .order-card.selected {
          border-left-color: var(--md-sys-color-primary, #2196F3);
          background: #E3F2FD;
          border-color: #90CAF9;
        }

        .order-card.run {
          border-left-color: #FF9800;
        }

        .order-card .order-no {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #212121);
        }

        .order-card .meta {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #757575);
          margin-top: 2px;
        }

        .order-card .action-label {
          float: right;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .order-card.run .action-label {
          color: #E65100;
        }

        .order-card .vendor-badge {
          display: inline-block;
          background: #E3F2FD;
          color: #1565C0;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 11px;
          margin-top: 4px;
        }

        .order-card .progress-mini {
          height: 3px;
          background: #E0E0E0;
          border-radius: 2px;
          margin-top: 6px;
          overflow: hidden;
        }

        .order-card .progress-mini-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #4CAF50);
          border-radius: 2px;
          transition: width 0.3s;
        }

        /* ===== 우측 패널 ===== */
        .right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--md-sys-color-background, #FAFAFA);
        }

        .right-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: var(--md-sys-color-surface, white);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
        }

        .right-panel-header .order-info {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #212121);
        }

        .right-panel-header .order-info span {
          color: var(--md-sys-color-on-surface-variant, #757575);
          font-weight: 400;
          margin-left: 8px;
        }

        .btn-close {
          background: transparent;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          padding: 4px 12px;
          font-size: 13px;
          cursor: pointer;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .btn-close:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .right-panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }

        /* 진행률 바 */
        .progress-bar {
          height: 8px;
          background: #E0E0E0;
          border-radius: 4px;
          overflow: hidden;
          margin: 0 24px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #4CAF50);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-text {
          text-align: right;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #757575);
          padding: 4px 24px 8px;
        }

        /* ===== 빈 상태 ===== */
        .empty-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: var(--md-sys-color-on-surface-variant, #757575);
        }

        .empty-panel .icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-panel .message {
          font-size: 15px;
          margin-bottom: 8px;
        }

        .empty-panel .sub {
          font-size: 13px;
          color: #9E9E9E;
        }

        .empty-panel input {
          margin-top: 16px;
          padding: 10px 14px;
          font-size: 14px;
          border: 2px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          width: 300px;
          text-align: center;
          outline: none;
        }

        .empty-panel input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* ===== 현재 피킹 항목 패널 ===== */
        .current-item-panel {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 16px;
          border-left: 4px solid #FF9800;
        }

        .current-item-panel .section-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #616161);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .location-display {
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          padding: 12px 20px;
          background: #E3F2FD;
          border: 2px solid #2196F3;
          border-radius: 8px;
          color: #1565C0;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        .item-info-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 12px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .item-info-grid .label {
          color: var(--md-sys-color-on-surface-variant, #757575);
          font-weight: 500;
        }

        .item-info-grid .value {
          color: var(--md-sys-color-on-surface, #212121);
          font-weight: 500;
        }

        .item-info-grid .value.mono {
          font-family: 'Courier New', monospace;
        }

        .item-info-grid .value.qty {
          font-size: 16px;
          font-weight: 700;
          color: #1565C0;
        }

        /* ===== 바코드 입력 영역 ===== */
        .barcode-area {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 12px 0;
          margin-bottom: 12px;
        }

        .barcode-area label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          margin-bottom: 8px;
          display: block;
        }

        .barcode-area input {
          width: 100%;
          padding: 10px 14px;
          font-size: 15px;
          font-family: 'Courier New', monospace;
          border: 2px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          box-sizing: border-box;
          outline: none;
        }

        .barcode-area input:focus {
          border-color: var(--md-sys-color-primary, #2196F3);
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.15);
        }

        .last-scan {
          margin-top: 8px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #616161);
        }

        .last-scan .success { color: #4CAF50; font-weight: 600; }
        .last-scan .error { color: #F44336; font-weight: 600; }

        /* 수량 입력 행 */
        .qty-input-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .qty-input-row label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
        }

        .qty-input-row input {
          width: 80px;
          padding: 6px 10px;
          font-size: 15px;
          border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          text-align: center;
          outline: none;
        }

        .qty-input-row input:focus {
          border-color: var(--md-sys-color-primary, #2196F3);
        }

        .qty-input-row .unit {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #757575);
        }

        .current-item-panel .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 12px;
        }

        .btn-skip {
          padding: 8px 16px;
          background: var(--md-sys-color-surface-variant, #F5F5F5);
          color: var(--md-sys-color-on-surface-variant, #757575);
          border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-skip:hover { background: #EEEEEE; }

        .btn-confirm {
          padding: 8px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }

        .btn-confirm:hover { background: #388E3C; }
        .btn-confirm:disabled { background: #BDBDBD; cursor: default; }

        /* ===== 피킹 항목 테이블 ===== */
        .picking-table-wrap {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 16px;
        }

        .picking-table {
          width: 100%;
          border-collapse: collapse;
        }

        .picking-table th {
          background: var(--md-sys-color-surface-variant, #F5F5F5);
          padding: 8px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
        }

        .picking-table td {
          padding: 8px 12px;
          font-size: 13px;
          border-bottom: 1px solid #F0F0F0;
          color: var(--md-sys-color-on-surface, #424242);
        }

        .picking-table tr.completed {
          background: #E8F5E9;
        }

        .picking-table tr.completed td {
          color: #9E9E9E;
        }

        .picking-table tr.current {
          background: #FFF3E0;
          font-weight: 600;
          border-left: 3px solid #FF9800;
        }

        .picking-table tr:hover:not(.completed) {
          background: var(--md-sys-color-surface-variant, #F5F5F5);
          cursor: pointer;
        }

        .picking-table .col-num { width: 40px; text-align: center; }
        .picking-table .col-loc { width: 120px; font-family: 'Courier New', monospace; }
        .picking-table .col-sku { width: 140px; font-family: 'Courier New', monospace; }
        .picking-table .col-name { }
        .picking-table .col-qty { width: 80px; text-align: right; font-variant-numeric: tabular-nums; }
        .picking-table .col-pick-qty { width: 80px; text-align: right; font-variant-numeric: tabular-nums; }
        .picking-table .col-status { width: 50px; text-align: center; font-size: 16px; }

        /* ===== 완료 화면 ===== */
        .complete-panel {
          text-align: center;
          padding: 20px 0;
        }

        .complete-panel .check-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .complete-panel h3 {
          font-size: 20px;
          font-weight: 700;
          color: #4CAF50;
          margin: 0 0 16px;
        }

        .complete-stats {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 20px;
          text-align: left;
        }

        .complete-stats .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 14px;
          border-bottom: 1px solid #F0F0F0;
        }

        .complete-stats .stat-row:last-child {
          border-bottom: none;
        }

        .complete-stats .stat-row .label {
          color: var(--md-sys-color-on-surface-variant, #757575);
        }

        .complete-stats .stat-row .value {
          color: var(--md-sys-color-on-surface, #212121);
          font-weight: 600;
        }

        .complete-actions {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, white);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
          transition: all 0.15s;
          color: var(--md-sys-color-on-surface, #333);
        }

        .btn-action:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .btn-action.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: white;
          border-color: transparent;
        }

        .btn-action.primary:hover {
          background: #1565C0;
        }

        .btn-action-bottom {
          display: inline-block;
          margin-top: 12px;
          padding: 8px 16px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, white);
          font-size: 13px;
          cursor: pointer;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .btn-action-bottom:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        /* ===== 하단 상태바 ===== */
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 24px;
          background: #263238;
          color: #B0BEC5;
          font-size: 12px;
        }

        .status-bar .stats {
          display: flex;
          gap: 16px;
        }

        .status-bar .stat-label { color: #78909C; }
        .status-bar .stat-value { color: #ECEFF1; font-weight: 600; margin-left: 4px; }

        /* ===== 피드백 토스트 ===== */
        .feedback-toast {
          position: fixed;
          top: 60px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          z-index: 1000;
          max-width: 360px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideInOut 2.5s ease forwards;
        }

        .feedback-toast.success { background: #4CAF50; }
        .feedback-toast.error { background: #F44336; }
        .feedback-toast.warning { background: #FF9800; }
        .feedback-toast.info { background: #2196F3; }

        @keyframes slideInOut {
          0%   { opacity: 0; transform: translateX(20px); }
          15%  { opacity: 1; transform: translateX(0); }
          85%  { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(20px); }
        }

        .loading-text {
          padding: 20px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 13px;
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      rightPanelMode: String,
      pickingOrders: Array,
      filterStatus: String,
      searchKeyword: String,
      selectedOrderId: String,
      pickingOrder: Object,
      pickingItems: Array,
      currentItemIndex: Number,
      barcodeMatched: Boolean,
      pickQty: Number,
      lastScannedItem: Object,
      completedCount: Number,
      totalCount: Number,
      startTime: Number,
      statsEnd: Number,
      feedbackMsg: String,
      feedbackType: String
    }
  }

  constructor() {
    super()
    this.loading = true
    this.rightPanelMode = 'empty'
    this.pickingOrders = []
    this.filterStatus = 'ALL'
    this.searchKeyword = ''
    this.selectedOrderId = null
    this.pickingOrder = null
    this.pickingItems = []
    this.currentItemIndex = -1
    this.barcodeMatched = false
    this.pickQty = 0
    this.lastScannedItem = null
    this.completedCount = 0
    this.totalCount = 0
    this.startTime = 0
    this.statsEnd = 0
    this.feedbackMsg = ''
    this.feedbackType = ''
    this._keyHandler = null
  }

  get context() {
    return {
      title: TermsUtil.tMenu('OutboundPickingPc')
    }
  }

  /* ==============================================================
   * 렌더링
   * ============================================================== */

  render() {
    const waitCount = this.pickingOrders.filter(o => o.status === 'WAIT').length
    const runCount = this.pickingOrders.filter(o => o.status === 'RUN').length

    return html`
      <div class="page-header">
        <h2>B2C 피킹 작업</h2>
        <div class="header-actions">
          <button class="btn-icon" @click="${this._refresh}">↻ 새로고침 (F5)</button>
        </div>
      </div>

      <div class="main-content">
        ${this._renderLeftPanel()}
        ${this._renderRightPanel()}
      </div>

      <div class="status-bar">
        <div class="stats">
          <span>
            <span class="stat-label">완료</span>
            <span class="stat-value">${this.statsEnd}건</span>
          </span>
          <span>
            <span class="stat-label">대기</span>
            <span class="stat-value">${waitCount}건</span>
          </span>
          <span>
            <span class="stat-label">진행</span>
            <span class="stat-value">${runCount}건</span>
          </span>
          <span>
            <span class="stat-label">오늘 총</span>
            <span class="stat-value">${this.pickingOrders.length + this.statsEnd}건</span>
          </span>
        </div>
        <span>${new Date().toLocaleTimeString('ko-KR')}</span>
      </div>

      ${this.feedbackMsg ? html`
        <div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>
      ` : ''}
    `
  }

  /* ===== 좌측 패널 ===== */

  _renderLeftPanel() {
    const filtered = this._getFilteredOrders()
    const waitCount = this.pickingOrders.filter(o => o.status === 'WAIT').length
    const runCount = this.pickingOrders.filter(o => o.status === 'RUN').length

    return html`
      <div class="left-panel">
        <div class="search-area">
          <input
            type="text"
            placeholder="피킹지시번호 검색"
            .value="${this.searchKeyword}"
            @input="${e => { this.searchKeyword = e.target.value }}"
          />
        </div>

        <div class="filter-chips">
          ${this._renderFilterChip('ALL', '전체', this.pickingOrders.length)}
          ${this._renderFilterChip('WAIT', '대기', waitCount)}
          ${this._renderFilterChip('RUN', '진행', runCount)}
        </div>

        <div class="order-list">
          <div class="order-list-header">피킹 지시: ${filtered.length}건</div>
          ${this.loading
            ? html`<div class="loading-text">조회 중...</div>`
            : filtered.length === 0
              ? html`<div class="loading-text">피킹 지시가 없습니다</div>`
              : filtered.map(order => this._renderPickingOrderCard(order))
          }
        </div>
      </div>
    `
  }

  _renderFilterChip(status, label, count) {
    return html`
      <div
        class="filter-chip ${this.filterStatus === status ? 'active' : ''}"
        @click="${() => { this.filterStatus = status }}"
      >
        ${label}<span class="badge">${count}</span>
      </div>
    `
  }

  _renderPickingOrderCard(order) {
    const isSelected = this.selectedOrderId === order.id
    const isRun = order.status === 'RUN'
    const progressPct = order.progress_rate || 0

    return html`
      <div
        class="order-card ${isSelected ? 'selected' : ''} ${isRun ? 'run' : ''}"
        @click="${() => this._onSelectOrder(order)}"
      >
        <div class="order-no">
          📋 ${order.pick_order_no || '-'}
          <span class="action-label">${isRun ? '계속 →' : '시작 →'}</span>
        </div>
        <div class="meta">
          주문: ${order.plan_order || 0}건 | SKU: ${order.plan_sku || 0}종 | 수량: ${order.plan_pcs || 0}pcs
        </div>
        ${order.wave_no ? html`<span class="vendor-badge">wave: ${order.wave_no}</span>` : ''}
        ${isRun && progressPct > 0 ? html`
          <div class="progress-mini">
            <div class="progress-mini-fill" style="width: ${Math.min(progressPct, 100)}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /* ===== 우측 패널 ===== */

  _renderRightPanel() {
    switch (this.rightPanelMode) {
      case 'work':
        return this._renderWorkPanel()
      case 'complete':
        return this._renderCompletePanel()
      default:
        return this._renderEmptyPanel()
    }
  }

  _renderEmptyPanel() {
    return html`
      <div class="right-panel">
        <div class="empty-panel">
          <span class="icon">📦</span>
          <span class="message">좌측 목록에서 피킹 지시를 선택하세요</span>
          <span class="sub">또는 피킹 지시번호를 스캔하세요</span>
          <input
            type="text"
            placeholder="피킹 지시번호 스캔"
            @keydown="${e => { if (e.key === 'Enter') { this._onScanPickingOrder(e.target.value); e.target.value = '' } }}"
          />
        </div>
      </div>
    `
  }

  _renderWorkPanel() {
    const order = this.pickingOrder
    if (!order) return this._renderEmptyPanel()

    const completedCount = this.pickingItems.filter(i => i.status === 'END').length
    const totalCount = this.pickingItems.length
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return html`
      <div class="right-panel">
        <div class="right-panel-header">
          <div class="order-info">
            📋 ${order.pick_order_no || '-'}
            <span>주문 ${order.plan_order || 0}건 | SKU ${order.plan_sku || 0}종</span>
          </div>
          <button class="btn-close" @click="${this._confirmBackToList}">닫기</button>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${completedCount}/${totalCount} 항목 (${progressPct}%)</div>

        <div class="right-panel-content">
          ${this.currentItemIndex >= 0 ? this._renderCurrentItemPanel() : ''}
          ${this._renderItemTable()}
          <button class="btn-action-bottom" @click="${this._confirmBackToList}">🏠 목록으로 (Esc)</button>
        </div>
      </div>
    `
  }

  _renderCurrentItemPanel() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return ''

    return html`
      <div class="current-item-panel">
        <div class="section-title">📍 현재 피킹 항목</div>

        <div class="location-display">${item.from_loc_cd || '미지정'}</div>

        <div class="item-info-grid">
          <span class="label">SKU</span>
          <span class="value mono">${item.sku_cd || '-'}</span>
          <span class="label">상품명</span>
          <span class="value">${item.sku_nm || '-'}</span>
          ${item.lot_no ? html`
            <span class="label">LOT</span>
            <span class="value">${item.lot_no}</span>
          ` : ''}
          ${item.expired_date ? html`
            <span class="label">유통기한</span>
            <span class="value">${item.expired_date}</span>
          ` : ''}
          <span class="label">지시 수량</span>
          <span class="value qty">${item.order_qty || 0} EA</span>
        </div>

        <div class="barcode-area">
          <label>🔍 바코드 스캔</label>
          <input
            id="barcodeInput"
            type="text"
            placeholder="상품 바코드 스캔"
            @keydown="${this._onBarcodeInput}"
          />
          ${this.lastScannedItem ? html`
            <div class="last-scan">
              <span class="${this.lastScannedItem.success ? 'success' : 'error'}">
                ${this.lastScannedItem.message}
              </span>
            </div>
          ` : ''}
        </div>

        <div class="qty-input-row">
          <label>수량</label>
          <input
            id="qtyInput"
            type="number"
            inputmode="numeric"
            .value="${String(this.pickQty || '')}"
            @input="${e => { this.pickQty = parseFloat(e.target.value) || 0 }}"
            @keydown="${e => { if (e.key === 'Enter') this._confirmPick() }}"
          />
          <span class="unit">/ ${item.order_qty || 0} EA</span>
        </div>

        <div class="actions">
          <button class="btn-skip" @click="${this._skipCurrentItem}">건너뛰기 (F3)</button>
          <button
            class="btn-confirm"
            ?disabled="${!this.barcodeMatched}"
            @click="${this._confirmPick}"
          >✓ 피킹 확인 (F2)</button>
        </div>
      </div>
    `
  }

  _renderItemTable() {
    return html`
      <div class="picking-table-wrap">
        <table class="picking-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-loc">로케이션</th>
              <th class="col-sku">SKU코드</th>
              <th class="col-name">상품명</th>
              <th class="col-qty">지시수량</th>
              <th class="col-pick-qty">피킹수량</th>
              <th class="col-status">상태</th>
            </tr>
          </thead>
          <tbody>
            ${this.pickingItems.map((item, idx) => {
              const isCompleted = item.status === 'END'
              const isCurrent = idx === this.currentItemIndex
              return html`
                <tr
                  class="${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}"
                  @click="${() => this._focusItem(idx)}"
                >
                  <td class="col-num">${idx + 1}</td>
                  <td class="col-loc">${item.from_loc_cd || '-'}</td>
                  <td class="col-sku">${item.sku_cd || '-'}</td>
                  <td class="col-name">${item.sku_nm || '-'}</td>
                  <td class="col-qty">${item.order_qty || 0}</td>
                  <td class="col-pick-qty">${isCompleted ? (item.pick_qty || item.order_qty || 0) : '-'}</td>
                  <td class="col-status">${isCompleted ? '✅' : isCurrent ? '→' : '☐'}</td>
                </tr>
              `
            })}
          </tbody>
        </table>
      </div>
    `
  }

  _renderCompletePanel() {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0
    const timeStr = this._formatElapsed(elapsed)

    return html`
      <div class="right-panel">
        <div class="right-panel-header">
          <div class="order-info">📋 ${this.pickingOrder?.pick_order_no || '-'}</div>
          <button class="btn-close" @click="${this._closeWork}">닫기</button>
        </div>
        <div class="right-panel-content">
          <div class="complete-panel">
            <div class="check-icon">✅</div>
            <h3>피킹 완료!</h3>

            <div class="complete-stats">
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

            <div class="complete-actions">
              <button class="btn-action" @click="${this._printPickingSheet}">📄 피킹 지시서 출력</button>
              <button class="btn-action primary" @click="${this._startNextPicking}">📋 다음 피킹 지시 (Enter)</button>
              <button class="btn-action" @click="${this._closeWork}">🏠 목록으로</button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /* ==============================================================
   * 라이프사이클
   * ============================================================== */

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._refresh()
      this._setupKeyboardShortcuts()
    } else {
      this._removeKeyboardShortcuts()
    }
  }

  pageDisposed(lifecycle) {
    this._removeKeyboardShortcuts()
  }

  /* ==============================================================
   * 데이터 로딩
   * ============================================================== */

  async _refresh() {
    try {
      this.loading = true
      const today = this._todayStr()

      const [activeData, endData] = await Promise.all([
        ServiceUtil.restGet('picking_orders', { status: 'WAIT,RUN', order_date: today }),
        ServiceUtil.restGet('picking_orders', { status: 'END', order_date: today })
      ])

      this.pickingOrders = activeData?.items || activeData || []
      const endList = endData?.items || endData || []
      this.statsEnd = endList.length

      this.loading = false
    } catch (err) {
      console.error('피킹 지시 조회 실패:', err)
      this.pickingOrders = []
      this.loading = false
    }
  }

  async _loadPickingItems(pickingOrderId) {
    try {
      const data = await ServiceUtil.restGet(`picking_orders/${pickingOrderId}/items`)
      this.pickingItems = (data?.items || data || []).sort((a, b) => (a.rank || 0) - (b.rank || 0))
      this.totalCount = this.pickingItems.length
      this.completedCount = this.pickingItems.filter(i => i.status === 'END').length
    } catch (err) {
      console.error('피킹 항목 조회 실패:', err)
      this.pickingItems = []
      this.totalCount = 0
      this.completedCount = 0
    }
  }

  /* ==============================================================
   * 좌측 패널 로직
   * ============================================================== */

  _getFilteredOrders() {
    let list = [...this.pickingOrders]

    if (this.filterStatus !== 'ALL') {
      list = list.filter(o => o.status === this.filterStatus)
    }

    if (this.searchKeyword) {
      const kw = this.searchKeyword.toLowerCase()
      list = list.filter(o =>
        (o.pick_order_no || '').toLowerCase().includes(kw) ||
        (o.wave_no || '').toLowerCase().includes(kw)
      )
    }

    return list
  }

  async _onSelectOrder(order) {
    try {
      this.loading = true
      this.selectedOrderId = order.id

      if (order.status === 'WAIT') {
        await ServiceUtil.restPost(`outbound_trx/picking_orders/${order.id}/start`)
      }

      await this._loadPickingItems(order.id)

      this.pickingOrder = order
      this.rightPanelMode = 'work'
      this.startTime = Date.now()
      this.loading = false

      this._moveToNextItem(true)
      this._showFeedback('피킹 작업을 시작합니다', 'info')

      setTimeout(() => this._focusBarcodeInput(), 200)
    } catch (err) {
      console.error('피킹 작업 시작 실패:', err)
      this._showFeedback(err.message || '피킹 작업 시작 실패', 'error')
      this.loading = false
    }
  }

  _onScanPickingOrder(barcode) {
    const value = (barcode || '').trim()
    if (!value) return

    const found = this.pickingOrders.find(
      o => o.pick_order_no === value || String(o.id) === value
    )
    if (found) {
      this._onSelectOrder(found)
    } else {
      this._showFeedback('피킹 지시를 찾을 수 없습니다', 'error')
    }
  }

  /* ==============================================================
   * 바코드 처리
   * ============================================================== */

  _onBarcodeInput(e) {
    if (e.key !== 'Enter') return
    const barcode = e.target.value.trim()
    if (!barcode) return

    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return

    if (item.barcode === barcode || item.sku_cd === barcode || item.product_cd === barcode) {
      this.barcodeMatched = true
      this.lastScannedItem = { success: true, message: '✓ 바코드 확인 완료' }
      this._showFeedback('✓ 바코드 확인 완료', 'success')
      this._autoConfirmIfSingleQty()
    } else {
      this.barcodeMatched = false
      this.lastScannedItem = { success: false, message: '✗ 바코드가 일치하지 않습니다' }
      this._showFeedback('✗ 바코드가 일치하지 않습니다', 'error')
    }

    e.target.value = ''
    e.target.focus()
  }

  _autoConfirmIfSingleQty() {
    const item = this.pickingItems[this.currentItemIndex]
    if (item && (item.order_qty || 0) <= 1 && this.barcodeMatched) {
      this._confirmPick()
    }
  }

  async _focusBarcodeInput() {
    await this.updateComplete
    const input = this.shadowRoot?.getElementById('barcodeInput')
    if (input) {
      input.value = ''
      input.focus()
    }
  }

  /* ==============================================================
   * 피킹 확인
   * ============================================================== */

  async _confirmPick() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return

    if (!this.barcodeMatched) {
      this._showFeedback('바코드를 먼저 스캔해주세요', 'warning')
      return
    }

    const qty = this.pickQty
    if (!qty || qty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'warning')
      return
    }

    if (qty > (item.order_qty || 0)) {
      this._showFeedback('지시 수량을 초과할 수 없습니다', 'warning')
      return
    }

    try {
      await ServiceUtil.restPut(`picking_orders/item/operator/${item.id}`, {
        barcode: item.barcode || item.sku_cd,
        fromLocCd: item.from_loc_cd,
        lotNo: item.lot_no || '',
        pickQty: qty,
        pickBox: 0,
        pickEa: qty
      })

      const items = [...this.pickingItems]
      items[this.currentItemIndex] = {
        ...items[this.currentItemIndex],
        status: 'END',
        pick_qty: qty
      }
      this.pickingItems = items
      this.completedCount = items.filter(i => i.status === 'END').length

      const remaining = this.totalCount - this.completedCount
      this._showFeedback(`피킹 완료 (${this.completedCount}/${this.totalCount})`, 'success')

      setTimeout(() => {
        if (remaining === 0) {
          this._onPickingComplete()
        } else {
          this._moveToNextItem()
          this._focusBarcodeInput()
        }
      }, 300)
    } catch (err) {
      console.error('피킹 확인 실패:', err)
      this._showFeedback(err.message || '피킹 확인 실패', 'error')
    }
  }

  _skipCurrentItem() {
    this._showFeedback('항목 건너뛰기', 'info')
    this._moveToNextItem()
    this._focusBarcodeInput()
  }

  _moveToNextItem(initial = false) {
    const startIdx = initial ? 0 : this.currentItemIndex + 1

    let nextIdx = this.pickingItems.findIndex(
      (item, idx) => idx >= startIdx && item.status !== 'END'
    )

    if (nextIdx < 0 && !initial) {
      nextIdx = this.pickingItems.findIndex(item => item.status !== 'END')
    }

    if (nextIdx >= 0) {
      this.currentItemIndex = nextIdx
      this._initPickForm()
    } else {
      this.currentItemIndex = -1
      if (!initial) this._onPickingComplete()
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
    this._focusBarcodeInput()
  }

  _initPickForm() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return
    this.pickQty = item.order_qty || 0
    this.barcodeMatched = false
    this.lastScannedItem = null
  }

  /* ==============================================================
   * 완료 처리
   * ============================================================== */

  _onPickingComplete() {
    this.rightPanelMode = 'complete'
    this._showFeedback('모든 피킹이 완료되었습니다!', 'success')
    this._refresh()
  }

  async _printPickingSheet() {
    if (!this.pickingOrder) return
    try {
      await ServiceUtil.restPost(
        `outbound_trx/picking_orders/${this.pickingOrder.id}/print_picking_sheet`
      )
      this._showFeedback('피킹 지시서 출력 요청 완료', 'success')
    } catch (err) {
      console.error('피킹 지시서 출력 실패:', err)
      this._showFeedback('출력 요청 실패', 'error')
    }
  }

  async _startNextPicking() {
    this._closeWork()
    await this._refresh()

    const next = this.pickingOrders.find(o => o.status === 'WAIT')
    if (next) {
      this._onSelectOrder(next)
    } else {
      this._showFeedback('대기 중인 피킹 지시가 없습니다', 'info')
    }
  }

  _closeWork() {
    this.rightPanelMode = 'empty'
    this.selectedOrderId = null
    this.pickingOrder = null
    this.pickingItems = []
    this.currentItemIndex = -1
    this.barcodeMatched = false
    this.pickQty = 0
    this.lastScannedItem = null
    this.completedCount = 0
    this.totalCount = 0
    this.startTime = 0
  }

  _confirmBackToList() {
    if (this.rightPanelMode === 'work') {
      const incomplete = this.pickingItems.filter(i => i.status !== 'END').length
      if (incomplete > 0) {
        if (!confirm(`미완료 항목이 ${incomplete}건 있습니다. 목록으로 돌아가시겠습니까?`)) {
          return
        }
      }
    }
    this._closeWork()
    this._refresh()
  }

  /* ==============================================================
   * 키보드 단축키
   * ============================================================== */

  _setupKeyboardShortcuts() {
    if (this._keyHandler) return
    this._keyHandler = (e) => {
      if (e.key === 'F2' && this.rightPanelMode === 'work') {
        e.preventDefault()
        this._confirmPick()
      } else if (e.key === 'F3' && this.rightPanelMode === 'work') {
        e.preventDefault()
        this._skipCurrentItem()
      } else if (e.key === 'F5') {
        e.preventDefault()
        this._refresh()
      } else if (e.key === 'Escape') {
        this._confirmBackToList()
      } else if (e.key === 'Enter' && this.rightPanelMode === 'complete') {
        this._startNextPicking()
      }
    }
    document.addEventListener('keydown', this._keyHandler)
  }

  _removeKeyboardShortcuts() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler)
      this._keyHandler = null
    }
  }

  /* ==============================================================
   * 유틸리티
   * ============================================================== */

  _todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  _calcTotalPickedQty() {
    return this.pickingItems.reduce((sum, item) => sum + (item.pick_qty || item.order_qty || 0), 0)
  }

  _formatElapsed(ms) {
    const totalSec = Math.round(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}분 ${sec}초`
  }

  _showFeedback(msg, type = 'info') {
    this.feedbackMsg = msg
    this.feedbackType = type
    if (this._feedbackTimer) clearTimeout(this._feedbackTimer)
    this._feedbackTimer = setTimeout(() => {
      this.feedbackMsg = ''
      this.feedbackType = ''
    }, 2500)
  }
}

window.customElements.define('outbound-picking-pc', OutboundPickingPc)
