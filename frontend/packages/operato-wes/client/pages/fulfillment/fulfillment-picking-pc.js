import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { openPopup } from '@operato/layout'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

import './picking-task-detail'

/**
 * Fulfillment 피킹 작업 PC 화면 (웨이브 기반)
 *
 * 2패널 레이아웃:
 * - 좌측: WAIT/IN_PROGRESS 상태 피킹 지시 목록 (필터/검색)
 * - 우측: empty → work (피킹 작업) → complete (완료)
 *
 * 작업 흐름:
 * 1. 좌측에서 피킹 지시 선택 (카드 클릭 또는 바코드 스캔)
 * 2. WAIT → start API → IN_PROGRESS 전환
 * 3. 항목별: 로케이션 확인 → 바코드 스캔 → 수량 입력 → 피킹 확인
 * 4. 전체 완료 → 통계 + 피킹 지시서 출력 + 다음 작업
 *
 * 바코드 입력: USB 바코드 스캐너 (키보드 에뮬레이션)
 * 키보드 단축키: F2(확인), F3(건너뛰기), F5(새로고침), Escape(닫기)
 */
class FulfillmentPickingPc extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 정의 */
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
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
        }

        .page-header h2 {
          margin: 0;
          font: var(--title-font);
          color: var(--title-text-color);
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-outline {
          background: transparent;
          color: var(--md-sys-color-primary);
          border: 1px solid var(--md-sys-color-primary);
        }

        .btn-outline:hover {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
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

        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .task-list-header {
          padding: 4px 8px 8px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #757575);
        }

        /* ===== 피킹 지시 카드 ===== */
        .task-card {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 6px;
          border: 1px solid #F0F0F0;
          border-left: 3px solid #2196F3;
          cursor: pointer;
          transition: all 0.15s;
        }

        .task-card:hover {
          background: var(--md-sys-color-surface-variant, #F5F5F5);
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .task-card.selected {
          border-left-color: var(--md-sys-color-primary, #2196F3);
          background: #E3F2FD;
          border-color: #90CAF9;
        }

        .task-card.in-progress {
          border-left-color: #FF9800;
        }

        .task-card .task-no {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #212121);
        }

        .task-card .meta {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #757575);
          margin-top: 2px;
        }

        .task-card .action-label {
          float: right;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .task-card.in-progress .action-label {
          color: #E65100;
        }

        .task-card .wave-badge {
          display: inline-block;
          background: #E3F2FD;
          color: #1565C0;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 11px;
          margin-top: 4px;
        }

        .task-card .progress-mini {
          height: 3px;
          background: #E0E0E0;
          border-radius: 2px;
          margin-top: 6px;
          overflow: hidden;
        }

        .task-card .progress-mini-fill {
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

        .right-panel-header .task-info {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #212121);
        }

        .right-panel-header .task-info span {
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

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      loading: Boolean,
      rightPanelMode: String,
      pickingTasks: Array,
      filterStatus: String,
      searchKeyword: String,
      selectedTaskId: String,
      pickingTask: Object,
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

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.rightPanelMode = 'empty'
    this.pickingTasks = []
    this.filterStatus = 'ALL'
    this.searchKeyword = ''
    this.selectedTaskId = null
    this.pickingTask = null
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

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: TermsUtil.tMenu('FulfillmentPickingPc')
    }
  }

  /* ==============================================================
   * 렌더링
   * ============================================================== */

  /** 화면 렌더링 - 페이지 헤더, 좌우 패널, 상태바, 피드백 토스트 표시 */
  render() {
    const waitCount = this.pickingTasks.filter(t => t.status === 'CREATED').length
    const runCount = this.pickingTasks.filter(t => t.status === 'IN_PROGRESS').length

    return html`
      <div class="page-header">
        <h2>${TermsUtil.tMenu('FulfillmentPickingPc')}</h2>
        <div class="header-actions">
          <button class="btn btn-outline" @click="${this._refresh}">🔍 ${TermsUtil.tButton('refresh')}</button>
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
            <span class="stat-label">총</span>
            <span class="stat-value">${this.pickingTasks.length + this.statsEnd}건</span>
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

  /** 좌측 패널 렌더링 - 검색, 필터 칩, 피킹 지시 목록 표시 */
  _renderLeftPanel() {
    const filtered = this._getFilteredTasks()
    const waitCount = this.pickingTasks.filter(t => t.status === 'CREATED').length
    const runCount = this.pickingTasks.filter(t => t.status === 'IN_PROGRESS').length

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
          ${this._renderFilterChip('ALL', '전체', this.pickingTasks.length)}
          ${this._renderFilterChip('CREATED', '대기', waitCount)}
          ${this._renderFilterChip('IN_PROGRESS', '진행', runCount)}
        </div>

        <div class="task-list">
          <div class="task-list-header">피킹 지시: ${filtered.length}건</div>
          ${this.loading
        ? html`<div class="loading-text">조회 중...</div>`
        : filtered.length === 0
          ? html`<div class="loading-text">피킹 지시가 없습니다</div>`
          : filtered.map(task => this._renderPickingTaskCard(task))
      }
        </div>
      </div>
    `
  }

  /** 필터 칩 렌더링 - 상태별 피킹 지시 필터링 */
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

  /** 피킹 지시 카드 렌더링 - 지시번호, 주문 정보, 진행률 표시 */
  _renderPickingTaskCard(task) {
    const isSelected = this.selectedTaskId === task.id
    const isRun = task.status === 'IN_PROGRESS'
    const progressPct = task.progress_rate || 0

    return html`
      <div
        class="task-card ${isSelected ? 'selected' : ''} ${isRun ? 'in-progress' : ''}"
        @click="${() => this._onSelectTask(task)}"
      >
        <div class="task-no">
          📋 ${task.pick_task_no || '-'}
          <span class="action-label">${isRun ? '계속 →' : '시작 →'}</span>
        </div>
        <div class="meta">
          주문: ${task.plan_order || 0}건 | 상품: ${task.plan_item || 0}종 | 수량: ${task.plan_total || 0}EA
        </div>
        ${task.wave_no ? html`<span class="wave-badge">wave: ${task.wave_no}</span>` : ''}
        ${isRun && progressPct > 0 ? html`
          <div class="progress-mini">
            <div class="progress-mini-fill" style="width: ${Math.min(progressPct, 100)}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /* ===== 우측 패널 ===== */

  /** 우측 패널 렌더링 - 모드에 따라 빈 화면, 작업 화면, 완료 화면 표시 */
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

  /** 빈 화면 렌더링 - 피킹 지시 선택 안내 및 바코드 스캔 입력 */
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
            @keydown="${e => { if (e.key === 'Enter') { this._onScanPickingTask(e.target.value); e.target.value = '' } }}"
          />
        </div>
      </div>
    `
  }

  /** 작업 화면 렌더링 - 피킹 지시 헤더, 진행률, 현재 항목, 항목 테이블 표시 */
  _renderWorkPanel() {
    const task = this.pickingTask
    if (!task) return this._renderEmptyPanel()

    const completedCount = this.pickingItems.filter(i => i.status === 'PICKED').length
    const totalCount = this.pickingItems.length
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return html`
      <div class="right-panel">
        <div class="right-panel-header">
          <div class="task-info">
            📋 ${task.pick_task_no || '-'}
            <span>주문 ${task.plan_order || 0}건 | 상품 ${task.plan_item || 0}종</span>
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

  /** 현재 피킹 항목 패널 렌더링 - 로케이션, SKU 정보, 바코드 입력, 수량 입력, 확인 버튼 */
  _renderCurrentItemPanel() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return ''

    return html`
      <div class="current-item-panel">
        <div class="section-title">📍 현재 피킹 항목</div>

        <div class="location-display">${item.from_loc_cd || '미지정'}</div>

        <div class="item-info-grid">
          <span class="label">상품 코드</span>
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
          <button class="btn-skip" @click="${this._skipCurrentItem}">건너뛰기</button>
          <button
            class="btn-confirm"
            ?disabled="${!this.barcodeMatched}"
            @click="${this._confirmPick}"
          >✓ 피킹 확인</button>
        </div>
      </div>
    `
  }

  /** 피킹 항목 테이블 렌더링 - 전체 피킹 항목 목록과 진행 상태 표시 */
  _renderItemTable() {
    return html`
      <div class="picking-table-wrap">
        <table class="picking-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-loc">로케이션</th>
              <th class="col-sku">상품 코드</th>
              <th class="col-name">상품 명</th>
              <th class="col-qty">지시 수량</th>
              <th class="col-pick-qty">피킹 수량</th>
              <th class="col-status">상태</th>
            </tr>
          </thead>
          <tbody>
            ${this.pickingItems.map((item, idx) => {
      const isCompleted = item.status === 'PICKED'
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
                  <td class="col-pick-qty">${isCompleted ? (item.pick_qty || 0) : '-'}</td>
                  <td class="col-status">${isCompleted ? '✅' : isCurrent ? '→' : '☐'}</td>
                </tr>
              `
    })}
          </tbody>
        </table>
      </div>
    `
  }

  /** 완료 화면 렌더링 - 완료 메시지, 통계, 피킹 지시서 출력 및 다음 작업 버튼 */
  _renderCompletePanel() {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0
    const timeStr = this._formatElapsed(elapsed)

    return html`
      <div class="right-panel">
        <div class="right-panel-header">
          <div class="task-info">📋 ${this.pickingTask?.pick_task_no || '-'}</div>
          <button class="btn-close" @click="${this._closeWork}">닫기</button>
        </div>
        <div class="right-panel-content">
          <div class="complete-panel">
            <div class="check-icon">✅</div>
            <h3>피킹 완료!</h3>

            <div class="complete-stats">
              <div class="stat-row">
                <span class="label">피킹 지시</span>
                <span class="value">${this.pickingTask?.pick_task_no || '-'}</span>
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

  /** 페이지 활성화 시 데이터 조회 및 키보드 단축키 설정 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._refresh()
      this._setupKeyboardShortcuts()
    } else {
      this._removeKeyboardShortcuts()
    }
  }

  /** 페이지 해제 시 키보드 단축키 정리 */
  pageDisposed(lifecycle) {
    this._removeKeyboardShortcuts()
  }

  /* ==============================================================
   * 데이터 로딩
   * ============================================================== */

  /** 피킹 지시 목록 새로고침 - 진행 중 및 완료된 지시 조회 */
  async _refresh() {
    try {
      this.loading = true

      const [activeData, endData] = await Promise.all([
        ServiceUtil.restGet('ful_trx/picking_tasks/todo'),
        ServiceUtil.restGet('ful_trx/picking_tasks/done')
      ])

      this.pickingTasks = activeData?.items || activeData || []
      const endList = endData?.items || endData || []
      this.statsEnd = endList.length

      this.loading = false
    } catch (err) {
      console.error('피킹 지시 조회 실패:', err)
      this.pickingTasks = []
      this.loading = false
    }
  }

  /** 피킹 항목 조회 - 선택된 피킹 지시의 세부 항목 로드 */
  async _loadPickingItems(pickingTaskId) {
    try {
      const data = await ServiceUtil.restGet(`ful_trx/picking_tasks/${pickingTaskId}/items`)
      this.pickingItems = (data?.items || data || []).sort((a, b) => (a.rank || 0) - (b.rank || 0))
      this.totalCount = this.pickingItems.length
      this.completedCount = this.pickingItems.filter(i => i.status === 'PICKED').length
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

  /** 필터링된 피킹 지시 목록 반환 - 상태 및 검색어로 필터링 */
  _getFilteredTasks() {
    let list = [...this.pickingTasks]

    if (this.filterStatus !== 'ALL' && this.filterStatus !== 'CANCELLED') {
      list = list.filter(t => t.status === this.filterStatus)
    }

    if (this.searchKeyword) {
      const kw = this.searchKeyword.toLowerCase()
      list = list.filter(t =>
        (t.pick_task_no || '').toLowerCase().includes(kw) ||
        (t.wave_no || '').toLowerCase().includes(kw)
      )
    }

    return list
  }

  /** 피킹 지시 선택 - 작업 시작 API 호출 및 우측 패널에 작업 화면 표시 */
  async _onSelectTask(task) {
    try {
      this.loading = true
      this.selectedTaskId = task.id

      if (task.status === 'CREATED') {
        await ServiceUtil.restPost(`ful_trx/picking_tasks/${task.id}/start`)
      }

      await this._loadPickingItems(task.id)

      this.pickingTask = task
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

  /** 피킹 지시 바코드 스캔 처리 - 지시번호로 피킹 지시 검색 및 선택 */
  _onScanPickingTask(barcode) {
    const value = (barcode || '').trim()
    if (!value) return

    const found = this.pickingTasks.find(
      t => t.pick_task_no === value || String(t.id) === value
    )
    if (found) {
      this._onSelectTask(found)
    } else {
      this._showFeedback('피킹 지시를 찾을 수 없습니다', 'error')
    }
  }

  /* ==============================================================
   * 바코드 처리
   * ============================================================== */

  /** 상품 바코드 입력 처리 - 순서 무관하게 바코드 매칭 및 수량 자동 증가 */
  _onBarcodeInput(e) {
    if (e.key !== 'Enter') return
    const barcode = e.target.value.trim()
    if (!barcode) return

    // 1. 현재 항목과 일치하는지 먼저 확인
    let item = this.pickingItems[this.currentItemIndex]
    let matchedIndex = this.currentItemIndex

    if (!item || (item.barcode !== barcode && item.sku_cd !== barcode)) {
      // 2. 현재 항목과 일치하지 않으면 미완료 항목 전체에서 검색
      matchedIndex = this.pickingItems.findIndex(
        (it) => it.status !== 'PICKED' && (it.barcode === barcode || it.sku_cd === barcode)
      )

      if (matchedIndex >= 0) {
        // 찾은 항목으로 자동 전환
        item = this.pickingItems[matchedIndex]
        this.currentItemIndex = matchedIndex
        this._initPickForm()
        this._showFeedback(`📦 ${item.sku_nm || item.sku_cd}로 전환`, 'info')
      } else {
        // 일치하는 항목이 없음
        this.barcodeMatched = false
        this.lastScannedItem = { success: false, message: '✗ 해당 상품이 피킹 목록에 없습니다' }
        this._showFeedback('✗ 해당 상품이 피킹 목록에 없습니다', 'error')
        e.target.value = ''
        e.target.focus()
        return
      }
    }

    // 3. 바코드 매칭 성공 - 수량 증가
    this.barcodeMatched = true
    const orderQty = item.order_qty || 0
    const currentQty = this.pickQty || 0

    if (currentQty < orderQty) {
      this.pickQty = currentQty + 1
      this.lastScannedItem = { success: true, message: `✓ 바코드 확인 완료 (${this.pickQty}/${orderQty})` }
      this._showFeedback(`✓ ${item.sku_nm || item.sku_cd} (${this.pickQty}/${orderQty})`, 'success')

      // 지시 수량과 일치하면 자동으로 피킹 확인
      if (this.pickQty === orderQty) {
        setTimeout(() => this._confirmPick(), 300)
      }
    } else {
      this.lastScannedItem = { success: false, message: '✗ 지시 수량을 초과할 수 없습니다' }
      this._showFeedback('✗ 지시 수량을 초과할 수 없습니다', 'warning')
    }

    e.target.value = ''
    e.target.focus()
  }

  /** 단일 수량 자동 확인 - 지시 수량이 1 이하이고 바코드 매칭 시 자동 피킹 확인 */
  _autoConfirmIfSingleQty() {
    const item = this.pickingItems[this.currentItemIndex]
    if (item && (item.pick_qty || 0) <= 1 && this.barcodeMatched) {
      this._confirmPick()
    }
  }

  /** 바코드 입력 필드 포커스 - 렌더링 완료 후 바코드 입력 필드로 포커스 이동 */
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

  /** 피킹 확인 처리 - 바코드 및 수량 검증 후 피킹 완료 API 호출 */
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
      await ServiceUtil.restPost(`ful_trx/picking_tasks/${this.selectedTaskId}/items/${item.id}/pick`, {
        pick_qty: qty,
        from_loc_cd: item.from_loc_cd,
        barcode: item.sku_cd
      })

      // 피킹 완료 시 화면 데이터 즉시 갱신 (백엔드 상태값은 'PICKED')
      const items = [...this.pickingItems]
      items[this.currentItemIndex] = {
        ...items[this.currentItemIndex],
        status: 'PICKED',
        pick_qty: qty
      }
      this.pickingItems = items
      this.completedCount = items.filter(i => i.status === 'PICKED').length

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

  /** 현재 항목 건너뛰기 - 다음 미완료 항목으로 이동 */
  _skipCurrentItem() {
    this._showFeedback('항목 건너뛰기', 'info')
    this._moveToNextItem()
    this._focusBarcodeInput()
  }

  /** 다음 항목으로 이동 - 미완료 항목 중 다음 항목 검색 및 포커스 */
  _moveToNextItem(initial = false) {
    const startIdx = initial ? 0 : this.currentItemIndex + 1

    let nextIdx = this.pickingItems.findIndex(
      (item, idx) => idx >= startIdx && item.status !== 'PICKED'
    )

    if (nextIdx < 0 && !initial) {
      nextIdx = this.pickingItems.findIndex(item => item.status !== 'PICKED')
    }

    if (nextIdx >= 0) {
      this.currentItemIndex = nextIdx
      this._initPickForm()
    } else {
      this.currentItemIndex = -1
      if (!initial) this._onPickingComplete()
    }
  }

  /** 특정 항목으로 포커스 이동 - 테이블에서 항목 클릭 시 호출 */
  _focusItem(idx) {
    const item = this.pickingItems[idx]
    if (!item) return
    if (item.status === 'PICKED') {
      this._showFeedback('이미 피킹 완료된 항목입니다', 'info')
      return
    }
    this.currentItemIndex = idx
    this._initPickForm()
    this._focusBarcodeInput()
  }

  /** 피킹 폼 초기화 - 현재 항목의 수량, 바코드 매칭 상태 초기화 */
  _initPickForm() {
    const item = this.pickingItems[this.currentItemIndex]
    if (!item) return
    this.pickQty = item.pick_qty || 0
    this.barcodeMatched = false
    this.lastScannedItem = null
  }

  /* ==============================================================
   * 완료 처리
   * ============================================================== */

  /** 피킹 완료 처리 - 백엔드 완료 API 호출 후 포장 지시 자동 생성 및 완료 화면으로 전환 */
  async _onPickingComplete() {
    if (!this.pickingTask) return

    try {
      // 백엔드에 피킹 지시 완료 요청 (insp_flag=true이면 포장 지시 자동 생성)
      const result = await ServiceUtil.restPost(`ful_trx/picking_tasks/${this.pickingTask.id}/complete`)

      this.rightPanelMode = 'complete'

      if (result?.packing_created) {
        const packInfo = result.pack_order_no
          ? `포장 지시 ${result.pack_order_no} 생성`
          : `포장 지시 ${result.pack_order_count}건 생성`
        this._showFeedback(`피킹 완료! ${packInfo}`, 'success')
      } else {
        this._showFeedback('모든 피킹이 완료되었습니다!', 'success')
      }

      this._refresh()
    } catch (err) {
      console.error('피킹 완료 처리 실패:', err)
      this._showFeedback(err.message || '피킹 완료 처리 실패', 'error')
    }
  }

  /** 피킹 지시서 출력 - 완료된 피킹 지시서 출력 API 호출 */
  async _printPickingSheet() {
    if (!this.pickingTask) return
    try {
      await ServiceUtil.restPost(
        `ful_trx/picking_tasks/${this.pickingTask.id}/print_picking_sheet`
      )
      this._showFeedback('피킹 지시서 출력 요청 완료', 'success')
    } catch (err) {
      console.error('피킹 지시서 출력 실패:', err)
      this._showFeedback('출력 요청 실패', 'error')
    }
  }

  /** 다음 피킹 작업 시작 - 대기 중인 다음 피킹 지시 자동 선택 */
  async _startNextPicking() {
    this._closeWork()
    await this._refresh()

    const next = this.pickingTasks.find(t => t.status === 'CREATED')
    if (next) {
      this._onSelectTask(next)
    } else {
      this._showFeedback('대기 중인 피킹 지시가 없습니다', 'info')
    }
  }

  /** 작업 화면 닫기 - 우측 패널 초기화 및 상태 리셋 */
  _closeWork() {
    this.rightPanelMode = 'empty'
    this.selectedTaskId = null
    this.pickingTask = null
    this.pickingItems = []
    this.currentItemIndex = -1
    this.barcodeMatched = false
    this.pickQty = 0
    this.lastScannedItem = null
    this.completedCount = 0
    this.totalCount = 0
    this.startTime = 0
  }

  /** 목록으로 돌아가기 확인 - 미완료 항목이 있으면 확인 후 목록으로 이동 */
  _confirmBackToList() {
    if (this.rightPanelMode === 'work') {
      const incomplete = this.pickingItems.filter(i => i.status !== 'PICKED').length
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

  /** 키보드 단축키 설정 - F2(확인), F3(건너뛰기), F5(새로고침), Esc(닫기), Enter(다음) */
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

  /** 키보드 단축키 해제 - 이벤트 리스너 제거 */
  _removeKeyboardShortcuts() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler)
      this._keyHandler = null
    }
  }

  /* ==============================================================
   * 유틸리티
   * ============================================================== */

  /** 오늘 날짜 문자열 반환 - YYYY-MM-DD 형식 */
  _todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  /** 총 피킹 수량 계산 - 모든 항목의 실제 피킹 수량 합계 */
  _calcTotalPickedQty() {
    return this.pickingItems.reduce((sum, item) => sum + (item.pick_qty || 0), 0)
  }

  /** 경과 시간 포맷 - 밀리초를 "분 초" 형식 문자열로 변환 */
  _formatElapsed(ms) {
    const totalSec = Math.round(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}분 ${sec}초`
  }

  /** 피드백 토스트 표시 - 화면 우측 상단에 메시지 표시 (2.5초 자동 숨김) */
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

window.customElements.define('fulfillment-picking-pc', FulfillmentPickingPc)
