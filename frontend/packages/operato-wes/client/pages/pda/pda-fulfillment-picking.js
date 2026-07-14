import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'
import '@operato-app/metapage/dist-client/components/input/operato-input-barcode'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 피킹 화면
 *
 * 창고 내 보관랙을 돌아다니며 PDA로 상품 바코드를 스캔하여 피킹 작업을 수행하는 화면.
 * 피킹 지시를 선택한 뒤, 피킹 경로(rank) 순으로 로케이션과 상품 정보를 안내받고,
 * 바코드 스캔으로 피킹을 확인한다.
 * PC 피킹 화면(fulfillment-picking-pc.js)의 PDA 최적화 버전.
 */
@customElement('pda-fulfillment-picking')
export class PdaFulfillmentPicking extends connect(store)(PageView) {
  /** 화면 모드: list / work / complete */
  @state() mode = 'list'

  /** 피킹 지시 목록 */
  @state() taskList = []
  /** 필터 상태 */
  @state() filterStatus = 'ALL'
  /** 로딩 상태 */
  @state() loading = false
  /** API 처리 중 */
  @state() processing = false
  /** 조회 일자 */
  @state() orderDate = ValueUtil.todayFormatted()
  /** 현재 페이지 */
  @state() listPage = 1
  /** 전체 피킹 지시 건수 (서버 집계) */
  @state() totalTaskCount = 0
  /** 피킹 지시 건수 요약 { total, waiting, completed } */
  @state() taskSummary = { total: 0, waiting: 0, completed: 0 }

  /** 페이지당 건수 */
  _listPageSize = 10

  /** 선택된 피킹 지시 */
  @state() currentTask = null
  /** 피킹 항목 전체 목록 */
  @state() taskItems = []
  /** 현재 피킹 대상 항목 인덱스 */
  @state() currentItemIndex = -1
  /** 피킹 수량 입력값 */
  @state() pickQty = 0
  /** 완료 항목 수 */
  @state() completedCount = 0
  /** 전체 항목 수 */
  @state() totalCount = 0
  /** 탭 키 (todo / done) */
  @state() currentTabKey = 'todo'
  /** 마지막 스캔 피드백 */
  @state() lastFeedback = null
  /** 작업 시작 시각 */
  @state() startedAt = null

  @query('#barcodeInput') _barcodeInput
  @query('#taskScanInput') _taskScanInput

  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      CommonGristStyles,
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-surface, #fafafa);
          overflow-y: auto;
        }

        /* 헤더 바 — 서브 네비게이션 (시스템 타이틀 바와 구분) */
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--md-sys-color-surface-container-low, #f5f5f5);
          color: var(--md-sys-color-on-surface, #333);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .header-bar .title {
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .header-bar .back-btn {
          background: none;
          border: none;
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
        }

        .header-bar .actions {
          display: flex;
          gap: 8px;
        }

        .header-bar button {
          padding: 5px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .header-bar button:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .header-bar button.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .header-bar button:disabled {
          opacity: 0.4;
        }

        .header-bar button.danger {
          border-color: var(--md-sys-color-error, #d32f2f);
          color: var(--md-sys-color-error, #d32f2f);
          background: var(--md-sys-color-surface-container-lowest, #fff);
        }

        /* 현황 요약 카드 */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px 12px;
        }

        .summary-card {
          text-align: center;
          padding: 10px 4px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.15s;
          border: 2px solid transparent;
        }

        .summary-card[active] {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 6px rgba(25, 118, 210, 0.25);
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

        .summary-card.waiting .count {
          color: var(--md-sys-color-error, #d32f2f);
        }

        .summary-card.done .count {
          color: #4CAF50;
        }

        .summary-card.all .count {
          color: #757575;
        }

        /* 날짜 필터 */
        .date-filter {
          padding: 8px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .date-filter .filter-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .date-filter input[type='date'] {
          flex: 1;
          padding: 7px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          border-radius: 6px;
          font-size: 13px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
        }

        .date-filter input[type='date']:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .date-filter .btn-search {
          flex-shrink: 0;
          padding: 7px 14px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 6px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .date-filter .btn-search:active {
          opacity: 0.85;
        }

        /* 피킹번호 스캔 입력 */
        .scan-task-order {
          padding: 8px 12px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-task-order label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .scan-task-order operato-input-barcode {
          flex: 1;
          min-width: 0;
        }

        .scan-task-order .btn-refresh {
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

        .scan-task-order .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* 페이지네이션 */
        .list-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .list-pagination button {
          padding: 4px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 12px;
          cursor: pointer;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .list-pagination button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* 목록 진행률 섹션 */
        .list-progress-section {
          padding: 6px 12px 4px;
          flex-shrink: 0;
        }

        .list-progress-bar {
          height: 6px;
          background: var(--md-sys-color-surface-variant, #E0E0E0);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 5px;
        }

        .list-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #4CAF50);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .list-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .list-progress-header strong {
          color: var(--md-sys-color-on-surface, #333);
        }

        /* 피킹 지시 카드 목록 */
        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }

        .task-card {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .task-card:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .task-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .task-card .task-no {
          font-weight: bold;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .task-card .status-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .task-card .status-badge.created {
          background: #fff3e0;
          color: #ff9800;
        }

        .task-card .status-badge.in_progress {
          background: #e3f2fd;
          color: #1976d2;
        }

        .task-card .status-badge.end,
        .task-card .status-badge.completed {
          background: #e8f5e9;
          color: #4CAF50;
        }

        .task-card .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .task-card .wave-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 5px;
        }

        .task-card .biz-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .task-card .biz-badge.b2c {
          background: #EDE7F6;
          color: #6A1B9A;
        }

        .task-card .biz-badge.b2b {
          background: #E3F2FD;
          color: #1565C0;
        }

        .task-card .wave-no {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
        }

        .task-card .progress-bar {
          height: 4px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }

        .task-card .progress-bar .fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 2px;
          transition: width 0.3s;
        }

        /* 진행률 바 */
        .progress-section {
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar-large {
          flex: 1;
          height: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-large .fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .progress-text {
          flex-shrink: 0;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 현재 피킹 항목 */
        .current-item-section {
          margin: 4px 12px;
          padding: 0px 12px 8px 12px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
        }

        .location-display {
          text-align: center;
          padding: 6px 0;
          font-size: 28px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          letter-spacing: 2px;
        }

        .item-info {
          font-size: 14px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          margin-top: 8px;
        }

        .item-info .sku {
          font-weight: bold;
          font-size: 15px;
        }

        .item-info .qty {
          font-size: 16px;
          font-weight: bold;
          margin-top: 4px;
        }

        .item-info .lot {
          font-size: 12px;
          margin-top: 4px;
          opacity: 0.8;
        }

        .barcode-input {
          margin-top: 10px;
        }

        .barcode-input label {
          display: block;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          margin-bottom: 4px;
        }

        .barcode-tap-btn {
          display: inline-block;
          padding: 1px 8px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px dashed var(--md-sys-color-primary, #1976D2);
          border-radius: 4px;
          color: var(--md-sys-color-primary, #1565c0);
          font-weight: bold;
          cursor: pointer;
          font-size: 13px;
          user-select: none;
        }

        .barcode-tap-btn:active {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .current-item-section operato-input-barcode {
          width: 100%;
        }

        /* 수량 입력 */
        .qty-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .qty-input-row label {
          flex: 0.3;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .qty-input-row input {
          flex: 0.4;
          height: 30px;
          padding: 0 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          box-sizing: border-box;
        }

        .qty-input-row input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        .qty-input-row .unit {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-primary-container, #1565c0);
        }

        .qty-input-row .btn-pick {
          flex: 0.2;
          padding: 8px 20px;
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }

        .qty-input-row .btn-pick:active {
          opacity: 0.9;
        }

        .qty-input-row .btn-pick:disabled {
          opacity: 0.4;
        }

        /* 스캔 피드백 */
        .scan-feedback {
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .scan-feedback.success {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .scan-feedback.error {
          background: #ffebee;
          color: #c62828;
        }

        .scan-feedback.warning {
          background: #fff3e0;
          color: #e65100;
        }

        /* 탭 바 */
        .tabs {
          display: flex;
          margin: 8px 12px 0;
          gap: 2px;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-on-primary-container, #1565c0);
          border-radius: 8px 8px 0 0;
          font-size: 13px;
          cursor: pointer;
          opacity: 0.65;
          transition: all 0.15s;
        }

        .tab[activate] {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          opacity: 1;
          font-weight: bold;
        }

        .tab .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.15);
          font-size: 11px;
          font-weight: bold;
        }

        .tab[activate] .badge {
          background: rgba(255, 255, 255, 0.3);
        }

        /* 탭 콘텐츠 */
        .tab-content {
          flex: 1;
          overflow-y: auto;
          margin: 0 12px 12px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 0 8px 8px 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* 항목 카드 */
        .item-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .item-card:last-child {
          border-bottom: none;
        }

        .item-card .icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .item-card .info {
          flex: 1;
          min-width: 0;
        }

        .item-card .loc {
          font-weight: bold;
          font-size: 13px;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .item-card .sku {
          font-size: 12px;
          color: var(--md-sys-color-on-surface, #333);
          margin-top: 2px;
        }

        .item-card .name {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .qty-badge {
          font-size: 13px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .item-card .qty-badge.picked {
          color: #4CAF50;
        }

        .item-card .qty-badge.short {
          color: #ff9800;
        }

        /* 완료 화면 */
        .complete-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
        }

        .complete-section .check-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .complete-section h3 {
          margin: 0 0 16px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .complete-section .result-card {
          width: 100%;
          max-width: 320px;
          padding: 16px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: left;
          font-size: 14px;
          line-height: 1.8;
          color: var(--md-sys-color-on-surface, #333);
        }

        .complete-section .result-card .label {
          color: var(--md-sys-color-on-surface-variant, #666);
          font-size: 12px;
        }

        .complete-section .btn-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .complete-section .btn-group button {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .complete-section .btn-next {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
        }

        .complete-section .btn-list {
          background: transparent;
          color: var(--md-sys-color-primary, #1976D2);
          border: 1px solid var(--md-sys-color-primary, #1976D2);
        }

        /* 빈 상태 메시지 */
        .empty-message {
          text-align: center;
          padding: 40px 20px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 14px;
        }

        /* 로딩 */
        .loading-overlay {
          text-align: center;
          padding: 30px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }
      `
    ]
  }

  get context() {
    return {
      title: TermsUtil.tMenu('FulfillmentPickingWork')
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    return html`
      ${this.mode !== 'list' ? this._renderHeader() : ''}
      ${this.mode === 'list'
        ? this._renderListMode()
        : this.mode === 'work'
          ? this._renderWorkMode()
          : this._renderCompleteMode()}
    `
  }

  /** 헤더 바 렌더링 — work/complete 모드 타이틀 및 버튼 */
  _renderHeader() {
    const taskNo = this.currentTask?.pick_task_no || ''
    const headerInfo = this.currentTask.wave_no ? '(웨이브: ' + this.currentTask.wave_no + ')' : '(주문: ' + this.currentTask.shipment_no + ')'

    if (this.mode === 'complete') {
      return html`
        <div class="header-bar">
          <span class="title">
            <button class="back-btn" @click=${this._goBack}>◀</button>
            ${taskNo} ${headerInfo}
          </span>
        </div>
      `
    }

    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          ${taskNo} ${headerInfo}
        </span>
        <div class="actions">
          <button class="primary" ?disabled=${this.processing || !this.pickQty}
            @click=${this._confirmPick}>
            ${TermsUtil.tButton('confirm') || '확인'}
          </button>
          <button class="primary" @click=${this._completeTask}
            ?disabled=${this.processing}>
            ${TermsUtil.tButton('complete') || '작업완료'}
          </button>
          <button class="danger" @click=${this._shortCurrentItem}
            ?disabled=${this.processing || this.currentItemIndex < 0}>
            ${TermsUtil.tButton('short') || '부족'}
          </button>
        </div>
      </div>
    `
  }

  /** list 모드 렌더링 — 날짜 필터, 진행률, 현황 요약, 피킹 지시 목록, 페이지네이션, 피킹번호 스캔 */
  _renderListMode() {
    const totalPages = Math.max(1, Math.ceil(this.totalTaskCount / this._listPageSize))
    const safePage = Math.min(this.listPage, totalPages)

    const summaryTotal = this.taskSummary?.total || 0
    const summaryCreated = this.taskSummary?.created || 0
    const summaryInProgress = this.taskSummary?.in_progress || 0
    const summaryCompleted = this.taskSummary?.completed || 0
    const progressPct = summaryTotal > 0 ? (summaryCompleted / summaryTotal) * 100 : 0
    const progressPctDisplay = progressPct.toFixed(1)

    return html`
      <div class="date-filter">
        <div class="filter-row">
          <input
            type="date"
            .value="${this.orderDate}"
            @change=${e => { this.orderDate = e.target.value }}
          />
          <button class="btn-search" @click=${() => { this.filterStatus = 'ALL'; this._loadTaskList(1); }}>🔍 검색</button>
        </div>
      </div>

      <div class="list-progress-section">
        <div class="list-progress-bar">
          <div class="list-progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="list-progress-header">
          <span>피킹 ${progressPctDisplay}%</span>
          <span>진행 <strong>${summaryCreated + summaryInProgress}</strong> / 완료 <strong>${summaryCompleted}</strong> (총 ${summaryTotal}건)</span>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active=${this.filterStatus === 'CREATED'}
          @click=${() => this._toggleFilter('CREATED')}>
          <div class="count">${summaryCreated}</div>
          <div class="card-label">${TermsUtil.tLabel('wait') || '대기'}</div>
        </div>
        <div class="summary-card"
          ?active=${this.filterStatus === 'IN_PROGRESS'}
          @click=${() => this._toggleFilter('IN_PROGRESS')}>
          <div class="count">${summaryInProgress}</div>
          <div class="card-label">${TermsUtil.tLabel('in_progress') || '진행'}</div>
        </div>
        <div class="summary-card done"
          ?active=${this.filterStatus === 'COMPLETED'}
          @click=${() => this._toggleFilter('COMPLETED')}>
          <div class="count">${summaryCompleted}</div>
          <div class="card-label">${TermsUtil.tLabel('completed') || '완료'}</div>
        </div>
        <div class="summary-card all"
          ?active=${this.filterStatus === 'ALL'}
          @click=${() => this._toggleFilter('ALL')}>
          <div class="count">${summaryTotal}</div>
          <div class="card-label">${TermsUtil.tLabel('all') || '전체'}</div>
        </div>
      </div>

      ${this.loading
        ? html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
        : html`
          <div class="task-list">
            ${this.taskList.length === 0
            ? html`<div class="empty-message">${this.totalTaskCount === 0 && this.filterStatus === 'ALL' ? '날짜를 선택하고 검색하세요' : '해당 상태의 피킹 작업이 없습니다'}</div>`
            : this.taskList.map(task => this._renderTaskCard(task))}
          </div>

          ${totalPages > 1 ? html`
            <div class="list-pagination">
              <button ?disabled="${safePage <= 1}" @click="${() => this._loadTaskList(safePage - 1)}">◀</button>
              <span>${safePage} / ${totalPages} (${this.totalTaskCount}건)</span>
              <button ?disabled="${safePage >= totalPages}" @click="${() => this._loadTaskList(safePage + 1)}">▶</button>
            </div>
          ` : ''}
        `}

      <div class="scan-task-order">
        <label>${TermsUtil.tLabel('pick_task_no') || '피킹지시'}</label>
        <operato-input-barcode id="taskScanInput"
          placeholder="피킹지시번호 스캔"
          @change=${e => this._onScanPickingTask(e.target.value)}>
        </operato-input-barcode>
      </div>
    `
  }

  /** 피킹 지시 카드 렌더링 */
  _renderTaskCard(task) {
    const isInProgress = task.status === 'IN_PROGRESS'
    const pickedItems = task.picked_items || 0
    const totalItems = task.total_items || 0
    const progressPct = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0
    const isB2C = !!task.wave_no

    const pickTypeLabel = task.pick_type === 'INDIVIDUAL'
      ? (TermsUtil.tLabel('individual_pick') || '개별피킹')
      : task.pick_type === 'TOTAL'
        ? (TermsUtil.tLabel('total_pick') || '토탈피킹')
        : task.pick_type || ''

    return html`
      <div class="task-card" @click=${() => this._selectTask(task)}>
        <div class="card-header">
          <span class="task-no">피킹지시: ${task.pick_task_no}</span>
          <span class="status-badge ${(task.status || '').toLowerCase()}">
            ${task.status === 'CREATED' ? (TermsUtil.tLabel('wait') || '대기')
        : task.status === 'IN_PROGRESS' ? (TermsUtil.tLabel('in_progress') || '진행중')
          : (TermsUtil.tLabel('completed') || '완료')}
          </span>
        </div>
        ${isB2C ? html`
          <div class="wave-row">
            <span class="biz-badge b2c">B2C</span>
            <span class="wave-no">웨이브번호 : ${task.wave_no}</span>
          </div>
        ` : html`
          <div class="wave-row">
            <span class="biz-badge b2b">B2B</span>
            <span class="wave-no">주문번호 : ${task.shipment_no}</span>
          </div>
        `}
        <div class="sub-info">
          <span>${pickTypeLabel}</span>
          <span>|</span>
          <span>주문 : ${task.plan_order || 0} | 상품 : ${task.plan_item || 0} | 수량 : ${task.plan_total || 0} | (${pickedItems}/${totalItems})</span>
        </div>
        ${isInProgress ? html`
          <div class="progress-bar">
            <div class="fill" style="width: ${progressPct}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /** work 모드 렌더링 — 진행률, 현재 항목(로케이션+상품), 바코드 스캔, 수량, 탭 */
  _renderWorkMode() {
    const progressPct = this.totalCount > 0 ? Math.round((this.completedCount / this.totalCount) * 100) : 0
    const totalQty = this.taskItems.reduce((s, i) => s + (i.order_qty || 0), 0)
    const doneQty = this.taskItems.reduce((s, i) => s + (i.pick_qty || 0), 0)
    const currentItem = this.currentItemIndex >= 0 ? this.taskItems[this.currentItemIndex] : null

    return html`
      <div class="progress-section">
        <div class="progress-bar-large">
          <div class="fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${this.completedCount}/${this.totalCount}건 (${doneQty}/${totalQty} EA)</div>
      </div>

      ${currentItem ? html`
        <div class="current-item-section">
          <div class="location-display">${currentItem.from_loc_cd}</div>
          <div class="item-info">
            <div class="sku">상품 : ${currentItem.sku_cd} ${currentItem.sku_nm ? `(${currentItem.sku_nm})` : ''} / 예정 수량 : ${currentItem.order_qty || 0} EA</div>
            <div class="lot">재고 바코드 :
              ${currentItem.barcode
          ? html`<span class="barcode-tap-btn" @click=${() => this._onScanBarcode(currentItem.barcode)}>${currentItem.barcode}</span>`
          : '-'}
            </div>
            ${currentItem.lot_no ? html`<div class="lot">LOT: ${currentItem.lot_no} ${currentItem.expired_date ? `· ${currentItem.expired_date}` : ''}</div>` : ''}
          </div>
          <div class="barcode-input">
            <operato-input-barcode id="barcodeInput"
              placeholder="재고 바코드 스캔"
              ?disabled=${this.processing}
              @change=${e => this._onScanBarcode(e.target.value)}>
            </operato-input-barcode>
          </div>
          <div class="qty-input-row">
            <label>피킹수량</label>
            <input type="number" min="1" .value=${String(this.pickQty)}
              @input=${e => (this.pickQty = parseInt(e.target.value) || 0)} />
            <!--button class="btn-pick" ?disabled=${this.processing || !this.pickQty}
              @click=${this._confirmPick}>
              ${TermsUtil.tButton('confirm') || '확인'}
            </button-->
          </div>
          ${this.lastFeedback ? html`
            <div class="scan-feedback ${this.lastFeedback.type}">
              ${this.lastFeedback.message}
            </div>
          ` : ''}
        </div>
      ` : html`
        <div class="current-item-section">
          <div class="item-info">모든 항목의 피킹이 완료되었습니다</div>
        </div>
      `}

      ${this._renderWorkTabs()}
      ${this._renderWorkTabContent()}
    `
  }

  /** work 모드 탭 바 렌더링 — 피킹목록/완료목록 탭 */
  _renderWorkTabs() {
    const todoItems = this.taskItems.filter(i => i.status === 'RUN' || i.status === 'WAIT')
    const doneItems = this.taskItems.filter(i => i.status === 'PICKED' || i.status === 'SHORT')

    return html`
      <div class="tabs">
        <div class="tab" ?activate=${'todo' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'todo')}>
          <span>${TermsUtil.tLabel('pick_list') || '피킹목록'}</span>
          <span class="badge">${todoItems.length}</span>
        </div>
        <div class="tab" ?activate=${'done' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'done')}>
          <span>${TermsUtil.tLabel('done_list') || '완료목록'}</span>
          <span class="badge">${doneItems.length}</span>
        </div>
      </div>
    `
  }

  /** work 모드 탭 콘텐츠 렌더링 — 미완료/완료 항목 목록 */
  _renderWorkTabContent() {
    const items = this.currentTabKey === 'todo'
      ? this.taskItems.filter(i => i.status === 'RUN' || i.status === 'WAIT')
      : this.taskItems.filter(i => i.status === 'PICKED' || i.status === 'SHORT')

    if (!items.length) {
      return html`<div class="tab-content"><div class="empty-message">
        ${this.currentTabKey === 'todo' ? '피킹 대기 항목 없음' : '완료 항목 없음'}
      </div></div>`
    }

    return html`
      <div class="tab-content">
        ${items.map(item => {
      const isCurrentItem = this.taskItems.indexOf(item) === this.currentItemIndex
      const icon = item.status === 'PICKED' ? '✅'
        : item.status === 'SHORT' ? '⚠️'
          : isCurrentItem ? '▶' : '☐'
      const qtyClass = item.status === 'PICKED' ? 'picked' : item.status === 'SHORT' ? 'short' : ''

      return html`
            <div class="item-card">
              <span class="icon">${icon}</span>
              <div class="info">
                <div class="loc">#${item.rank} 로케이션 : ${item.from_loc_cd}</div>
                <div class="sku">상품 : ${item.sku_cd} ${item.sku_nm || '-'}</div>
                <div class="name">재고 바코드 : ${item.barcode || '-'}</div>
                <!--div class="name">${item.sku_nm || '-'}</div-->
              </div>
              <span class="qty-badge ${qtyClass}">
                ${item.status === 'PICKED' ? `${item.pick_qty || 0}/${item.order_qty || 0}`
          : item.status === 'SHORT' ? `S:${item.short_qty || 0}`
            : `${item.order_qty || 0}EA`}
              </span>
            </div>
          `
    })}
      </div>
    `
  }

  /** complete 모드 렌더링 — 완료 통계 + 다음작업/목록 버튼 */
  _renderCompleteMode() {
    const elapsed = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0
    const min = Math.floor(elapsed / 60)
    const sec = elapsed % 60
    const pickedQty = this.taskItems.reduce((s, i) => s + (i.pick_qty || 0), 0)
    const shortQty = this.taskItems.reduce((s, i) => s + (i.short_qty || 0), 0)
    const pickedCount = this.taskItems.filter(i => i.status === 'PICKED').length
    const shortCount = this.taskItems.filter(i => i.status === 'SHORT').length

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tLabel('picking_complete') || '피킹 완료!'}</h3>

        <div class="result-card">
          <div><span class="label">${TermsUtil.tLabel('wave_no') || '웨이브번호'}:</span> ${this.currentTask?.wave_no}</div>
          <div><span class="label">${TermsUtil.tLabel('pick_task_no') || '피킹지시'}:</span> ${this.currentTask?.pick_task_no}</div>
          <div><span class="label">${TermsUtil.tLabel('pick_type') || '피킹유형'}:</span> ${this.currentTask?.pick_type}</div>
          <div><span class="label">${TermsUtil.tLabel('picked_qty') || '피킹수량'}:</span> ${pickedQty} EA</div>
          <div><span class="label">${TermsUtil.tLabel('short_qty') || '부족수량'}:</span> ${shortQty} EA</div>
          <div><span class="label">${TermsUtil.tText('processed') || '처리건수'}:</span> ${this.totalCount}건 (완료 ${pickedCount} / 부족 ${shortCount})</div>
          <div><span class="label">${TermsUtil.tLabel('elapsed_time') || '소요시간'}:</span> ${min}분 ${sec}초</div>
        </div>

        <div class="btn-group">
          <button class="btn-next" @click=${this._selectNextTask}>
            ${TermsUtil.tLabel('next_picking') || '다음 피킹 작업'}
          </button>
          <button class="btn-list" @click=${this._goBack}>
            ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /** 페이지 초기화 — 오늘 날짜로 목록 조회 */
  pageInitialized() {
    this._loadTaskList(1)
  }

  /** 피킹 지시 목록 조회 (날짜 기반, 상태별 서버 페이지네이션) */
  async _loadTaskList(page = 1) {
    if (!page || typeof page !== 'number') page = 1
    this.loading = true
    try {
      const params = new URLSearchParams({
        order_date: this.orderDate,
        page: page,
        size: this._listPageSize
      })
      if (this.filterStatus && this.filterStatus !== 'ALL') {
        params.append('status', this.filterStatus)
      }
      const result = await ServiceUtil.restGet(`ful_trx/picking_tasks/list?${params}`)
      this.taskList = result?.items || []
      this.totalTaskCount = result?.total || 0
      this.listPage = page
      await this._fetchTaskSummary()
    } catch (error) {
      console.error('피킹 지시 목록 조회 실패:', error)
      this.taskList = []
      this.totalTaskCount = 0
    } finally {
      this.loading = false
    }
  }

  /** 피킹 지시 건수 요약 조회 (count API) */
  async _fetchTaskSummary() {
    try {
      const params = new URLSearchParams({ order_date: this.orderDate })
      const result = await ServiceUtil.restGet(`ful_trx/picking_tasks/summary/count?${params}`).catch(() => null)
      this.taskSummary = result || { total: 0, created: 0, in_progress: 0, completed: 0 }
    } catch (err) {
      console.error('피킹 지시 건수 조회 실패:', err)
    }
  }

  /** 피킹 항목 목록 조회 + 현재 항목 설정 */
  async _loadTaskItems(taskId) {
    try {
      const items = await ServiceUtil.restGet(`ful_trx/picking_tasks/${taskId}/items`)
      this.taskItems = items || []
      this.totalCount = this.taskItems.length
      this.completedCount = this.taskItems.filter(i => i.status === 'PICKED' || i.status === 'SHORT').length
      this._moveToNextItem()
    } catch (error) {
      console.error('피킹 항목 조회 실패:', error)
      this.taskItems = []
    }
  }

  /** 바코드 스캔으로 피킹 지시 서버 조회 (피킹지시번호·주문번호·웨이브번호 모두 지원) */
  async _onScanPickingTask(barcode) {
    if (!barcode || this.processing) return
    if (this._taskScanInput) this._taskScanInput.value = ''

    try {
      const params = new URLSearchParams({ barcode, order_date: this.orderDate })
      const task = await ServiceUtil.restGet(`ful_trx/picking_tasks/find?${params}`)
      if (task && task.id) {
        this._selectTask(task)
      } else {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: `피킹 지시를 찾을 수 없습니다: ${barcode}` }
        }))
        navigator.vibrate?.(200)
      }
    } catch (err) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `조회 실패: ${err?.message || barcode}` }
      }))
      navigator.vibrate?.(200)
    }
  }

  /** 피킹 지시 선택 → 시작 → 항목 로드 → work 모드 전환 */
  async _selectTask(task) {
    if (this.processing) return
    this.processing = true

    try {
      if (task.status === 'CREATED') {
        await ServiceUtil.restPost(`ful_trx/picking_tasks/${task.id}/start`, {}, null, null, async (res) => {
          task.status = 'IN_PROGRESS'
          this.currentTask = task
          this.startedAt = Date.now()
          this.lastFeedback = null
          this.currentTabKey = 'todo'
          this.pickQty = 0

          await this._loadTaskItems(task.id)
          this._setInitialPickQty()
          this.mode = 'work'

          setTimeout(() => this._focusBarcodeInput(), 200)
        }, (err) => {
          document.dispatchEvent(new CustomEvent('notify', {
            detail: { level: 'error', message: err?.msg || '피킹 지시를 시작할 수 없습니다' }
          }))
        })
      } else if (task.status === 'IN_PROGRESS') {
        this.currentTask = task
        this.startedAt = Date.now()
        this.lastFeedback = null
        this.currentTabKey = 'todo'
        this.pickQty = 0

        await this._loadTaskItems(task.id)
        this._setInitialPickQty()
        this.mode = 'work'

        setTimeout(() => this._focusBarcodeInput(), 200)
      }

    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '피킹 지시를 시작할 수 없습니다' }
      }))

    } finally {
      this.processing = false
    }
  }

  /** 바코드 스캔 핸들러 — 현재 항목 또는 전체에서 매칭 후 수량 자동 설정 */
  _onScanBarcode(barcode) {
    if (!barcode || this.processing) return

    const currentItem = this.currentItemIndex >= 0 ? this.taskItems[this.currentItemIndex] : null

    // 1. 현재 항목과 매칭 시도
    if (currentItem && currentItem.barcode === barcode) {
      this.pickQty = currentItem.order_qty || 1
      this.lastFeedback = {
        type: 'success',
        message: `${currentItem.sku_cd} 매칭 — ${this.pickQty}EA 확인`
      }
      this._resetBarcodeInput()
      return
    }

    // 2. 전체 미완료 항목에서 검색
    const matchIndex = this.taskItems.findIndex(
      item => (item.status === 'RUN' || item.status === 'WAIT') &&
        item.barcode === barcode
    )

    if (matchIndex >= 0) {
      this.currentItemIndex = matchIndex
      const item = this.taskItems[matchIndex]
      this.pickQty = item.order_qty || 1
      this.lastFeedback = {
        type: 'success',
        message: `${item.sku_cd} 매칭 (${item.from_loc_cd}) — ${this.pickQty}EA`
      }
      this._resetBarcodeInput()
      return
    }

    // 3. 이미 완료된 항목인지 확인
    const doneItem = this.taskItems.find(
      item => (item.status === 'PICKED' || item.status === 'SHORT') &&
        item.barcode === barcode
    )

    if (doneItem) {
      this.lastFeedback = {
        type: 'warning',
        message: `이미 피킹 완료된 상품입니다: ${doneItem.sku_cd}`
      }
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'warn', message: '이미 피킹 완료된 상품입니다' }
      }))
    } else {
      // 4. 미발견
      this.lastFeedback = {
        type: 'error',
        message: `일치하는 상품을 찾을 수 없습니다: ${barcode}`
      }
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `일치하는 상품을 찾을 수 없습니다: ${barcode}` }
      }))
      navigator.vibrate?.(200)
    }

    this._resetBarcodeInput()
  }

  /** 피킹 확인 API 호출 — 현재 항목 수량 확정 */
  async _confirmPick() {
    const item = this.currentItemIndex >= 0 ? this.taskItems[this.currentItemIndex] : null
    if (!item) {
      this._showFeedback('피킹할 항목이 없습니다', 'warning')
      return
    }

    const qty = this.pickQty
    if (!qty || qty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'warning')
      return
    }

    if (qty > (item.order_qty || 0)) {
      this._showFeedback(`지시 수량(${item.order_qty})을 초과할 수 없습니다`, 'warning')
      return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost(
        `ful_trx/picking_tasks/${this.currentTask.id}/items/${item.id}/pick`,
        { pick_qty: qty, from_loc_cd: item.from_loc_cd, barcode: item.barcode }, null, null, (res) => {
          this.taskItems = this.taskItems.map((it, idx) =>
            idx === this.currentItemIndex ? { ...it, status: 'PICKED', pick_qty: qty } : it
          )
          this.completedCount = this.taskItems.filter(i => i.status === 'PICKED' || i.status === 'SHORT').length
          this._showFeedback(`피킹 완료 (${this.completedCount}/${this.totalCount})`, 'success')

          if (this.completedCount >= this.totalCount) {
            this._onAllItemsCompleted()
          } else {
            this._moveToNextItem()
            this._setInitialPickQty()
            setTimeout(() => this._focusBarcodeInput(), 200)
          }
        }, (err) => {
          this._showFeedback(err?.msg || '피킹 확인 실패', 'error')
        }
      )
    } catch (error) {
      this._showFeedback(error.message || '피킹 확인 실패', 'error')

    } finally {
      this.processing = false
    }
  }

  /**
   * 부족(결품) 처리 — 실제 집은 수량만큼만 피킹하고, 부족분은 결품 처리한다.
   * 입력한 수량(pickQty)을 실제 피킹 수량으로 보고, (지시수량 - 피킹수량)을 결품 수량으로 넘긴다.
   * 서버는 결품분을 예약 해제한 뒤 다른 PICKABLE 재고에서 재할당하여 새 피킹 라인(RUN)을 추가하므로,
   * 처리 후 목록을 재조회하여 재할당된 라인을 즉시 노출한다.
   */
  async _shortCurrentItem() {
    const item = this.currentItemIndex >= 0 ? this.taskItems[this.currentItemIndex] : null
    if (!item) return

    const orderQty = item.order_qty || 0
    const pickedQty = this.pickQty || 0 // 실제 집은 수량 (수량 입력 필드값, 0이면 전량 결품)
    const shortQty = orderQty - pickedQty

    if (shortQty <= 0) {
      this._showFeedback('부족 수량이 없습니다. 전량 피킹이면 [확정]을 눌러주세요', 'warning')
      return
    }

    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `${item.sku_cd} (${item.from_loc_cd})\n피킹 ${pickedQty} / 결품 ${shortQty}\n결품 수량은 다른 재고에서 재할당됩니다.`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    this.processing = true
    try {
      await ServiceUtil.restPost(
        `ful_trx/picking_tasks/${this.currentTask.id}/items/${item.id}/short`,
        { short_qty: shortQty, pick_qty: pickedQty }, null, null, async (res) => {
          // 재할당으로 새 피킹 라인이 추가됐을 수 있으므로 서버에서 목록 재조회
          await this._loadTaskItems(this.currentTask.id)
          this._setInitialPickQty()

          const reallocated = res?.reallocated_qty || 0
          const remain = res?.short_remain_qty || 0
          let msg = `피킹 ${pickedQty} / 결품 ${shortQty}`
          if (reallocated > 0) msg += ` · ${reallocated}개 재할당`
          if (remain > 0) msg += ` · ${remain}개 재고부족`
          this._showFeedback(msg, remain > 0 ? 'warning' : 'info')

          if (this.completedCount >= this.totalCount) {
            this._onAllItemsCompleted()
          } else {
            setTimeout(() => this._focusBarcodeInput(), 200)
          }

        }, (err) => {
          this._showFeedback(err?.msg || '부족 처리 실패', 'error')
        }
      )

    } catch (error) {
      this._showFeedback(error.message || '부족 처리 실패', 'error')

    } finally {
      this.processing = false
    }
  }

  /** 피킹 완료 API 호출 — 전체 완료 처리 */
  async _completeTask() {
    if (!this.currentTask) return

    const remaining = this.taskItems.filter(i => i.status === 'RUN' || i.status === 'WAIT')
    if (remaining.length > 0) {
      const confirmed = await UiUtil.showAlertPopup(
        'label.confirm',
        `미완료 항목 ${remaining.length}건이 있습니다. 작업을 완료하시겠습니까?`,
        'question', 'confirm', 'cancel'
      )
      if (!confirmed) return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost(`ful_trx/picking_tasks/${this.currentTask.id}/complete`, {}, null, null, (res) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: '피킹 완료' }
        }))
        this.mode = 'complete'
        this._fetchTaskSummary()

      }, (err) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: err?.msg || '피킹 완료 처리에 실패했습니다' }
        }))
      })

    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '피킹 완료 처리에 실패했습니다' }
      }))

    } finally {
      this.processing = false
    }
  }

  /** 모든 항목 완료 시 자동 완료 처리 안내 */
  async _onAllItemsCompleted() {
    document.dispatchEvent(new CustomEvent('notify', {
      detail: { level: 'info', message: '모든 항목 피킹 완료 — 작업 완료 처리 중...' }
    }))
    await this._completeTask()
  }

  /** 요약 카드 필터 토글 — 동일 카드 재클릭 시 전체(ALL)로 복귀, 서버 재조회 */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? 'ALL' : status
    this._loadTaskList(1)
  }

  /** 목록 새로고침 (현재 페이지 유지) */
  async _refresh() {
    await this._loadTaskList(this.listPage)
  }

  /** 목록 화면으로 복귀 */
  async _goBack() {
    this.mode = 'list'
    this.currentTask = null
    this.taskItems = []
    this.currentItemIndex = -1
    this.lastFeedback = null
    await this._loadTaskList(this.listPage)
  }

  /** 다음 피킹 지시 자동 선택 */
  async _selectNextTask() {
    await this._loadTaskList(1)
    const nextTask = this.taskList.find(t => t.status === 'CREATED')
    if (nextTask) {
      this._selectTask(nextTask)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '대기 중인 피킹 작업이 없습니다' }
      }))
      this._goBack()
    }
  }

  /** 다음 미완료 항목으로 인덱스 이동 */
  _moveToNextItem() {
    const nextIdx = this.taskItems.findIndex(i => i.status === 'RUN' || i.status === 'WAIT')
    this.currentItemIndex = nextIdx
  }

  /** 현재 항목의 order_qty로 pickQty 초기값 설정 */
  _setInitialPickQty() {
    const currentItem = this.currentItemIndex >= 0 ? this.taskItems[this.currentItemIndex] : null
    this.pickQty = currentItem ? (currentItem.order_qty || 1) : 0
  }

  /** 피드백 메시지 표시 */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }

  /** 바코드 입력 필드에 포커스 설정 */
  _focusBarcodeInput() {
    setTimeout(() => {
      this._resetBarcodeInput();
    }, 100)
  }

  /** 바코드 입력 필드 초기화 및 포커스 복귀 */
  _resetBarcodeInput() {
    if (this._barcodeInput) {
      this._barcodeInput.input.value = ''
      this._barcodeInput.input.focus()
    }
  }
}
