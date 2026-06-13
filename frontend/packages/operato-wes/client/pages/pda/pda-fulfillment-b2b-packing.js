import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { MetaApi, ServiceUtil, TermsUtil, ValueUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'
import '../../component/sku-barcode-input.js'

/**
 * PDA B2B 전용 검수/포장 화면
 *
 * pda-fulfillment-b2c-packing.js 기반 B2B 전용 버전:
 * - biz_type = B2B_OUT 고정
 * - 출고일자로 포장 주문 조회 (웨이브 차수 없음)
 * - 운송장번호 입력 없음 (B2B는 거래명세서로 대체)
 * - 출고 확정 후 거래명세서 출력 제공
 */
@customElement('pda-fulfillment-b2b-packing')
export class PdaFulfillmentB2bPacking extends connect(store)(PageView) {
  /** 화면 모드: list / inspection / packing / complete */
  @state() mode = 'list'

  /** 출고 일자 */
  @state() orderDate = ValueUtil.todayFormatted()
  /** 작업장 코드 */
  @state() filterStationCd = ''
  /** 작업장 옵션 목록 */
  @state() stationOptions = []

  /** 포장 지시 목록 */
  @state() packingOrders = []
  /** 로딩 상태 */
  @state() loading = false

  /** 선택된 포장 지시 */
  @state() selectedOrder = null
  /** 검수 항목 목록 */
  @state() packingItems = []
  /** 현재 검수 항목 인덱스 */
  @state() currentItemIndex = -1
  /** 검수 완료 항목 수 */
  @state() completedCount = 0
  /** 총 검수 항목 수 */
  @state() totalCount = 0
  /** 마지막 스캔 결과 */
  @state() lastScannedItem = null
  /** 탭 키 (waiting / done) */
  @state() currentTabKey = 'waiting'
  /** API 처리 중 */
  @state() processing = false

  /** 박스 유형 */
  @state() boxType = 'MEDIUM'
  /** 박스 수량 */
  @state() boxCount = 1
  /** 박스 중량 */
  @state() boxWeight = 0

  /** 작업 시작 시각 */
  @state() startedAt = null

  /** 포장 주문 건수 요약 { total, waiting, completed } */
  @state() orderSummary = { total: 0, waiting: 0, completed: 0 }

  /** 현재 페이지 번호 */
  @state() listPage = 1

  /** 서버에서 반환한 전체 주문 건수 (페이지네이션 계산용) */
  @state() totalOrderCount = 0

  /** 페이지당 표시 건수 */
  _listPageSize = 10

  @query('sku-barcode-input') _skuBarcodeInput
  @query('#packOrderScanInput') _packOrderScanInput

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

        /* 헤더 바 */
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

        /* 날짜/작업장 필터 영역 */
        .date-filter {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 12px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .date-filter .filter-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .date-filter input[type='date'] {
          flex: 1;
          min-width: 0;
          height: 36px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          box-sizing: border-box;
        }

        .date-filter select {
          width: 100%;
          height: 36px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          box-sizing: border-box;
        }

        .date-filter input:focus,
        .date-filter select:focus {
          outline: none;
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .date-filter .btn-search {
          flex-shrink: 0;
          height: 36px;
          padding: 0 12px;
          border: none;
          border-radius: 6px;
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .date-filter .btn-search:active {
          opacity: 0.85;
        }

        /* 진행 프로그레스 바 */
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

        /* 포장 지시 카드 목록 */
        .order-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px;
        }

        .order-card {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .order-card:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .order-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-card .pack-no {
          font-weight: bold;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .order-card .status-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .order-card .status-badge.created {
          background: #fff3e0;
          color: #ff9800;
        }

        .order-card .status-badge.in_progress {
          background: #e3f2fd;
          color: #1976d2;
        }

        .order-card .status-badge.completed,
        .order-card .status-badge.label_printed,
        .order-card .status-badge.manifested,
        .order-card .status-badge.shipped {
          background: #e8f5e9;
          color: #4CAF50;
        }

        .order-card .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 6px;
        }

        .order-card .progress-bar {
          height: 4px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }

        .order-card .progress-bar .fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 2px;
          transition: width 0.3s;
        }

        /* 페이지네이션 */
        .list-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          flex-shrink: 0;
        }

        .list-pagination button {
          padding: 5px 14px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          font-size: 13px;
          cursor: pointer;
          color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
        }

        .list-pagination button:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .list-pagination button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* 포장번호 스캔 입력 */
        .scan-pack-order {
          padding: 8px 12px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-pack-order label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .scan-pack-order ox-input-barcode {
          flex: 1;
          min-width: 0;
        }

        /* 진행률 바 (검수 모드) */
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

        /* 현재 검수 항목 */
        .current-item-section {
          margin: 4px 12px;
          padding: 12px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
        }

        .current-item-section .item-info {
          font-size: 14px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
        }

        .current-item-section .item-info .sku {
          font-weight: bold;
          font-size: 15px;
        }

        .current-item-section .item-info .qty {
          font-size: 16px;
          font-weight: bold;
          margin-top: 4px;
        }

        .current-item-section .item-info .lot {
          font-size: 12px;
          margin-top: 4px;
          opacity: 0.8;
        }

        /* 수량 직접 입력 행 */
        .current-item-section .qty-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
        }

        .current-item-section .qty-input-row label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .current-item-section .qty-input-row input[type='number'] {
          flex: 1;
          height: 28px;
          padding: 0 8px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          border: 2px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 6px;
          background: #fff;
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
          min-width: 0;
        }

        .current-item-section .qty-input-row input[type='number']:focus {
          border-color: var(--md-sys-color-secondary, #388E3C);
          box-shadow: 0 0 0 2px rgba(56, 142, 60, 0.2);
        }

        .current-item-section .qty-input-row .unit {
          flex-shrink: 0;
          font-size: 13px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .current-item-section .barcode-input {
          margin-top: 10px;
        }

        .current-item-section .barcode-input label {
          display: block;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          margin-bottom: 4px;
        }

        .current-item-section sku-barcode-input {
          width: 100%;
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

        /* 검수 항목 카드 */
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

        .item-card .sku {
          font-weight: bold;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .item-card .name {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .qty-badge {
          font-size: 13px;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* 포장 정보 입력 */
        .packing-section {
          padding: 12px;
          flex: 1;
          overflow-y: auto;
        }

        .packing-section .complete-banner {
          text-align: center;
          padding: 16px;
          background: #e8f5e9;
          border-radius: 8px;
          margin-bottom: 16px;
          color: #2e7d32;
          font-weight: 600;
        }

        .packing-section .form-group {
          margin-bottom: 14px;
        }

        .packing-section .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-bottom: 6px;
        }

        .box-type-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .box-type-chip {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
        }

        .box-type-chip[active] {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .packing-section input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 14px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          box-sizing: border-box;
        }

        .packing-section input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        /* 하단 버튼 그룹 (출고확정 + 거래명세서) */
        .btn-action-group {
          display: flex;
          gap: 8px;
          margin: 12px;
        }

        .btn-confirm {
          flex: 1;
          padding: 14px;
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
        }

        .btn-confirm:active {
          opacity: 0.9;
        }

        .btn-confirm:disabled {
          opacity: 0.4;
        }

        .btn-trade {
          flex: 1;
          padding: 14px;
          background: #1565C0;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }

        .btn-trade:active {
          opacity: 0.9;
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
          flex-direction: column;
          gap: 10px;
          margin-top: 24px;
          width: 100%;
          max-width: 320px;
        }

        .complete-section .btn-group button {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
        }

        .complete-section .btn-next {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
        }

        .complete-section .btn-statement {
          background: #1565C0;
          color: #fff;
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
      title: TermsUtil.tMenu('FulfillmentB2BPackingWork')
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    return html`
      ${this.mode !== 'list' ? this._renderHeader() : ''}
      ${this.mode === 'list'
        ? this._renderListMode()
        : this.mode === 'inspection'
          ? this._renderInspectionMode()
          : this.mode === 'packing'
            ? this._renderPackingMode()
            : this._renderCompleteMode()}
    `
  }

  /** 헤더 바 렌더링 — inspection/packing/complete 모드 타이틀 및 버튼 */
  _renderHeader() {
    const packOrderNo = this.selectedOrder?.pack_order_no || ''
    const custNm = this.selectedOrder?.cust_nm || ''

    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          ${packOrderNo} (${custNm})
        </span>
        <div class="actions">
          ${this.mode === 'inspection' ? html`
            <button @click=${this._skipItem}
              ?disabled=${this.processing || this.currentItemIndex < 0}>
              ${TermsUtil.tButton('skip') || '건너뛰기'}
            </button>
            <button class="primary" @click=${this._onInspectionComplete}
              ?disabled=${this.processing}>
              ${TermsUtil.tLabel('inspection_complete') || '검수완료'}
            </button>
          ` : ''}
        </div>
      </div>
    `
  }

  /** list 모드 렌더링 — 날짜 필터, 진행 프로그레스, 포장 지시 목록, 포장번호 스캔 */
  _renderListMode() {
    const totalPages = Math.max(1, Math.ceil(this.totalOrderCount / this._listPageSize))
    const safePage = Math.min(this.listPage, totalPages)

    const summaryTotal = this.orderSummary?.total || 0
    const summaryCompleted = this.orderSummary?.completed || 0
    const summaryWaiting = this.orderSummary?.waiting || 0
    const progressPct = summaryTotal > 0 ? (summaryCompleted / summaryTotal) * 100 : 0
    const progressPctDisplay = progressPct.toFixed(1)

    return html`
      <div class="date-filter">
        <div class="filter-row">
          <input
            type="date"
            title="출고 일자"
            .value="${this.orderDate}"
            @change=${e => { this.orderDate = e.target.value }}
          />
          <button class="btn-search" @click=${this._loadPackingOrders}>🔍</button>
        </div>
        <select
          title="작업장"
          .value="${this.filterStationCd}"
          @change=${e => { this.filterStationCd = e.target.value }}
        >
          <option value="">작업장 전체</option>
          ${this.stationOptions.map(opt => html`
            <option value="${opt.name}" ?selected=${this.filterStationCd === opt.name}>
              ${opt.description || opt.name}
            </option>
          `)}
        </select>
      </div>

      <div class="list-progress-section">
        <div class="list-progress-bar">
          <div class="list-progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="list-progress-header">
          <span>검수/포장 ${progressPctDisplay}%</span>
          <span>대기 <strong>${summaryWaiting}</strong> / 완료 <strong>${summaryCompleted}</strong> (총 ${summaryTotal}건)</span>
        </div>
      </div>

      ${this.loading
        ? html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
        : html`
          <div class="order-list">
            ${this.packingOrders.length === 0
            ? html`<div class="empty-message">${this.totalOrderCount === 0 ? '출고 일자를 선택하고 검색하세요' : '포장 작업이 없습니다'}</div>`
            : this.packingOrders.map(order => this._renderOrderCard(order))}
          </div>

          ${totalPages > 1 ? html`
            <div class="list-pagination">
              <button ?disabled="${safePage <= 1}" @click="${() => this._goToPage(safePage - 1)}">◀</button>
              <span>${safePage} / ${totalPages} (${this.totalOrderCount}건)</span>
              <button ?disabled="${safePage >= totalPages}" @click="${() => this._goToPage(safePage + 1)}">▶</button>
            </div>
          ` : ''}

          <div class="scan-pack-order">
            <label>${TermsUtil.tLabel('pack_order_no') || '포장번호'}</label>
            <ox-input-barcode id="packOrderScanInput"
              placeholder="포장번호 / 출고번호 스캔"
              @change=${e => this._onScanPackingOrder(e.target.value)}>
            </ox-input-barcode>
          </div>
        `}
    `
  }

  /** 포장 지시 카드 렌더링 */
  _renderOrderCard(order) {
    const isInProgress = order.status === 'IN_PROGRESS'
    const packedQty = order.packed_qty || 0
    const totalItems = order.total_items || order.total_item || 0
    const progressPct = totalItems > 0 ? Math.round((packedQty / totalItems) * 100) : 0

    return html`
      <div class="order-card" @click=${() => this._selectOrder(order)}>
        <div class="card-header">
          <span class="pack-no">주문번호: ${order.shipment_no}</span>
          <span class="status-badge ${(order.status || '').toLowerCase()}">
            ${order.status === 'CREATED' ? (TermsUtil.tLabel('wait') || '대기')
        : order.status === 'IN_PROGRESS' ? (TermsUtil.tLabel('in_progress') || '진행중')
          : (TermsUtil.tLabel('completed') || '완료')}
          </span>
        </div>
        <div class="sub-info">
          ${order.cust_nm || ''} · ${totalItems}종 ${order.total_qty || 0}EA
          ${order.station_cd ? html` · <strong>${this._stationLabel(order.station_cd)}</strong>` : ''}
        </div>
        ${isInProgress ? html`
          <div class="progress-bar">
            <div class="fill" style="width: ${progressPct}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /** inspection 모드 렌더링 — 진행률, 현재 항목, 바코드 스캔, 탭 */
  _renderInspectionMode() {
    const progressPct = this.totalCount > 0 ? Math.round((this.completedCount / this.totalCount) * 100) : 0
    const totalQty = this.packingItems.reduce((s, i) => s + (i.order_qty || 0), 0)
    const doneQty = this.packingItems.reduce((s, i) => s + (i.insp_qty || 0), 0)
    const currentItem = this.currentItemIndex >= 0 ? this.packingItems[this.currentItemIndex] : null

    return html`
      <div class="progress-section">
        <div class="progress-bar-large">
          <div class="fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${this.completedCount}/${this.totalCount}종 (${doneQty}/${totalQty} EA)</div>
      </div>

      ${currentItem ? html`
        <div class="current-item-section">
          <div class="item-info">
            <div class="sku">상품: ${currentItem.sku_cd} / 주문: ${this.selectedOrder.shipment_no}</div>
            <div class="lot">${currentItem.sku_nm}</div>
            <div class="qty">주문 수량 : ${currentItem.order_qty || 0} / 소비기한 : ${currentItem.expired_date || ''}</div>
          </div>

          <div class="qty-input-row">
            <label>검수 수량</label>
            <input type="number"
              min="0"
              max="${currentItem.order_qty || 0}"
              .value="${String(currentItem.insp_qty || 0)}"
              @change=${e => this._onManualQtyInput(this.currentItemIndex, e.target.value)}
              @focus=${e => e.target.select()}
            />
            <span class="unit">/ ${currentItem.order_qty || 0} EA</span>
          </div>

          <div class="barcode-input">
            <sku-barcode-input
              .comCd="${this.selectedOrder?.com_cd || ''}"
              placeholder="상품 바코드 스캔"
              ?disabled=${this.processing}
              @sku-select=${this._onSkuSelect}>
            </sku-barcode-input>
          </div>
          ${this.lastScannedItem ? html`
            <div class="scan-feedback ${this.lastScannedItem.success ? 'success' : 'error'}">
              ${this.lastScannedItem.message}
            </div>
          ` : ''}
        </div>
      ` : html`
        <div class="current-item-section">
          <div class="item-info">모든 항목이 검수 완료되었습니다</div>
        </div>
      `}

      ${this._renderInspectionTabs()}
      ${this._renderInspectionTabContent()}
    `
  }

  /** 검수 모드 탭 바 렌더링 */
  _renderInspectionTabs() {
    const waitingItems = this.packingItems.filter(i => i.status !== 'COMPLETED')
    const doneItems = this.packingItems.filter(i => i.status === 'COMPLETED')

    return html`
      <div class="tabs">
        <div class="tab" ?activate=${'waiting' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'waiting')}>
          <span>${TermsUtil.tLabel('wait') || '대기'}</span>
          <span class="badge">${waitingItems.length}</span>
        </div>
        <div class="tab" ?activate=${'done' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'done')}>
          <span>${TermsUtil.tLabel('completed') || '완료'}</span>
          <span class="badge">${doneItems.length}</span>
        </div>
      </div>
    `
  }

  /** 검수 모드 탭 콘텐츠 렌더링 */
  _renderInspectionTabContent() {
    const items = this.currentTabKey === 'waiting'
      ? this.packingItems.filter(i => i.status !== 'COMPLETED')
      : this.packingItems.filter(i => i.status === 'COMPLETED')

    if (!items.length) {
      return html`<div class="tab-content"><div class="empty-message">
        ${this.currentTabKey === 'waiting' ? '대기 항목 없음' : '완료 항목 없음'}
      </div></div>`
    }

    return html`
      <div class="tab-content">
        ${items.map(item => {
      const isCurrentItem = this.packingItems.indexOf(item) === this.currentItemIndex
      const icon = item.status === 'COMPLETED' ? '✅' : isCurrentItem ? '▶' : '☐'

      return html`
            <div class="item-card">
              <span class="icon">${icon}</span>
              <div class="info">
                <div class="sku">${item.sku_cd}</div>
                <div class="name">${item.sku_nm || '-'}</div>
              </div>
              <span class="qty-badge">${item.insp_qty || 0}/${item.order_qty || 0}</span>
            </div>
          `
    })}
      </div>
    `
  }

  /** packing 모드 렌더링 — 포장 정보 입력 + 출고 확정 + 거래명세서 출력 (B2B: 운송장 없음) */
  _renderPackingMode() {
    return html`
      <div class="packing-section">
        <div class="complete-banner">
          ✅ ${TermsUtil.tLabel('inspection_complete') || '검수 완료'} — ${this.totalCount}종 전체 확인
        </div>

        <div class="form-group">
          <label>${TermsUtil.tLabel('box_type_cd') || '박스 유형'}</label>
          <div class="box-type-chips">
            ${['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'].map(t => html`
              <span class="box-type-chip" ?active=${this.boxType === t}
                @click=${() => (this.boxType = t)}>${t}</span>
            `)}
          </div>
        </div>

        <div class="form-group">
          <label>${TermsUtil.tLabel('box_qty') || '박스 수량'}</label>
          <input type="number" min="1" .value=${String(this.boxCount)}
            @input=${e => (this.boxCount = parseInt(e.target.value) || 1)} />
        </div>

        <div class="form-group">
          <label>${TermsUtil.tLabel('box_wt') || '박스 중량 (kg)'}</label>
          <input type="number" min="0" step="0.1" .value=${String(this.boxWeight)}
            @input=${e => (this.boxWeight = parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <div class="btn-action-group">
        <button class="btn-confirm"
          ?disabled=${this.processing}
          @click=${this._confirmRelease}>
          ${TermsUtil.tButton('confirm_release') || '출고 확정'}
        </button>
        <button class="btn-trade"
          @click=${this._printDeliveryStatement}>
          ${TermsUtil.tButton('print_trade_statement') || '거래명세서'}
        </button>
      </div>
    `
  }

  /** complete 모드 렌더링 — 완료 통계 + 거래명세서 출력 + 다음작업/목록 버튼 */
  _renderCompleteMode() {
    const isViewMode = !this.startedAt
    const totalQty = this.packingItems.reduce((s, i) => s + (i.insp_qty || i.pack_qty || i.order_qty || 0), 0)

    let timeInfo = ''
    if (isViewMode) {
      timeInfo = this.selectedOrder?.completed_at || '-'
    } else {
      const elapsed = Math.round((Date.now() - this.startedAt) / 1000)
      const min = Math.floor(elapsed / 60)
      const sec = elapsed % 60
      timeInfo = `${min}분 ${sec}초`
    }

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tLabel('packing_complete') || '포장 완료!'}</h3>

        <div class="result-card">
          <div><span class="label">${TermsUtil.tLabel('pack_order_no') || '포장지시'}:</span> ${this.selectedOrder?.pack_order_no}</div>
          <div><span class="label">${TermsUtil.tLabel('shipment_no') || '주문번호'}:</span> ${this.selectedOrder?.shipment_no}</div>
          <div><span class="label">${TermsUtil.tLabel('cust_nm') || '고객명'}:</span> ${this.selectedOrder?.cust_nm}</div>
          <div><span class="label">${TermsUtil.tLabel('pack_qty') || '포장 수량'}:</span> ${totalQty} EA (${this.totalCount}종)</div>
          <div><span class="label">${TermsUtil.tLabel('box_type_cd') || '박스유형'}:</span> ${this.boxType} × ${this.boxCount}</div>
          <div><span class="label">${isViewMode ? (TermsUtil.tLabel('completed_at') || '완료시각') : (TermsUtil.tLabel('elapsed_time') || '소요시간')}:</span> ${timeInfo}</div>
        </div>

        <div class="btn-group">
          <button class="btn-statement" @click=${this._printDeliveryStatement}>
            ${TermsUtil.tButton('print_trade_statement') || '거래명세서 출력'}
          </button>
          ${!isViewMode ? html`
            <button class="btn-next" @click=${this._selectNextOrder}>
              ${TermsUtil.tButton('next_packing') || '다음 포장 작업'}
            </button>
          ` : ''}
          <button class="btn-list" @click=${this._goBack}>
            ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /* ==================== Lifecycle ==================== */

  /** 페이지 초기화 — 작업장 옵션 로드 후 당일 데이터 자동 조회 */
  async pageInitialized() {
    await this._fetchStationOptions()
    this._loadPackingOrders()
  }

  /* ==================== Data Loading ==================== */

  /** PACKING_STATION 공통코드 목록 조회 */
  async _fetchStationOptions() {
    try {
      const codeMaster = await ServiceUtil.codeItems('PACKING_STATION')
      this.stationOptions = codeMaster?.items || []
    } catch (err) {
      this.stationOptions = []
    }
  }

  /** 포장 지시 목록 조회 (B2B_OUT, 날짜/작업장 기반 서버 페이지네이션) */
  async _loadPackingOrders(page = 1) {
    if (!page || typeof page !== 'number') page = 1

    this.loading = true
    try {
      const params = new URLSearchParams({
        biz_type: 'B2B_OUT',
        order_date: this.orderDate,
        page: page,
        size: this._listPageSize
      })
      if (this.filterStationCd) params.append('station_cd', this.filterStationCd)
      const result = await ServiceUtil.restGet(`ful_trx/packing_orders/list?${params}`)
      this.packingOrders = result?.items || []
      this.totalOrderCount = result?.total || 0
      this.listPage = page
      await this._fetchOrderSummary()
    } catch (error) {
      console.error('포장 지시 목록 조회 실패:', error)
      this.packingOrders = []
      this.totalOrderCount = 0
    } finally {
      this.loading = false
    }
  }

  /** 페이지 이동 */
  async _goToPage(page) {
    await this._loadPackingOrders(page)
  }

  /** 포장 주문 건수 요약 조회 (count API) */
  async _fetchOrderSummary() {
    try {
      const params = new URLSearchParams({
        biz_type: 'B2B_OUT',
        order_date: this.orderDate
      })
      if (this.filterStationCd) params.append('station_cd', this.filterStationCd)
      const result = await ServiceUtil.restGet(`ful_trx/packing_orders/summary/count?${params}`).catch(() => null)
      this.orderSummary = result || { total: 0, waiting: 0, completed: 0 }
    } catch (err) {
      console.error('포장 주문 건수 조회 실패:', err)
    }
  }

  /** 포장 항목 목록 조회 + 현재 항목 설정 */
  async _loadPackingItems(orderId) {
    try {
      const items = await ServiceUtil.restGet('ful_trx/packing_order_items', { packing_order_id: orderId })
      this.packingItems = (items || []).map(item =>
        (item.status === 'PACKED' || item.status === 'INSPECTED')
          ? { ...item, status: 'COMPLETED' }
          : item
      )
      this.totalCount = this.packingItems.length
      this.completedCount = this.packingItems.filter(i => i.status === 'COMPLETED').length
      this._moveToNextItem()
    } catch (error) {
      console.error('포장 항목 조회 실패:', error)
      this.packingItems = []
    }
  }

  /** 포장 박스 목록 조회 → 박스 상태 변수에 반영 */
  async _loadPackingBoxes(orderId) {
    try {
      const boxes = await ServiceUtil.restGet(`ful_trx/packing_orders/${orderId}/boxes`)
      if (boxes && boxes.length > 0) {
        const firstBox = boxes[0]
        this.boxType = firstBox.box_type_cd || 'MEDIUM'
        this.boxCount = boxes.length
        this.boxWeight = firstBox.box_wt || 0
      } else {
        this.boxType = 'MEDIUM'
        this.boxCount = 0
        this.boxWeight = 0
      }
    } catch (error) {
      console.error('포장 박스 조회 실패:', error)
      this.boxType = 'MEDIUM'
      this.boxCount = 0
      this.boxWeight = 0
    }
  }

  /* ==================== Event Handlers ==================== */

  /** 포장 지시 선택 → 완료 주문은 상세 보기, 미완료 주문은 작업 시작 */
  async _selectOrder(order) {
    if (this.processing) return
    this.processing = true

    try {
      if (!['CREATED', 'IN_PROGRESS'].includes(order.status)) {
        this.selectedOrder = order
        this.startedAt = null
        await this._loadPackingItems(order.id)
        await this._loadPackingBoxes(order.id)
        this.mode = 'complete'
        return
      }

      if (order.status === 'CREATED') {
        await ServiceUtil.restPost(`ful_trx/packing_orders/${order.id}/start`, {}, null, null, async (_res) => {
          order.status = 'IN_PROGRESS'
          this.selectedOrder = order
          this.startedAt = Date.now()
          this.lastScannedItem = null
          this.currentTabKey = 'waiting'

          await this._loadPackingItems(order.id)
          this._recommendBoxType()
          this.mode = 'inspection'

          setTimeout(() => this._focusBarcodeInput(), 200)

        }, (err) => {
          document.dispatchEvent(new CustomEvent('notify', {
            detail: { level: 'error', message: err?.msg || '포장 작업을 시작할 수 없습니다' }
          }))
        })
      } else if (order.status === 'IN_PROGRESS') {
        this.selectedOrder = order
        this.startedAt = Date.now()
        this.lastScannedItem = null
        this.currentTabKey = 'waiting'

        await this._loadPackingItems(order.id)
        this._recommendBoxType()
        this.mode = 'inspection'

        setTimeout(() => this._focusBarcodeInput(), 200)
      }
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '포장 작업을 시작할 수 없습니다' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 포장번호 바코드 스캔으로 빠른 선택 (서버 단건 조회) */
  async _onScanPackingOrder(barcode) {
    if (!barcode) return
    if (this._packOrderScanInput) this._packOrderScanInput.value = ''

    try {
      const params = new URLSearchParams({
        biz_type: 'B2B_OUT',
        order_date: this.orderDate,
        barcode
      })
      if (this.filterStationCd) params.append('station_cd', this.filterStationCd)
      const order = await ServiceUtil.restGet(`ful_trx/packing_orders/find?${params}`)
      if (order) {
        this._selectOrder(order)
      } else {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: `포장번호를 찾을 수 없습니다: ${barcode}` }
        }))
        navigator.vibrate?.(200)
      }
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: '조회 중 오류가 발생했습니다' }
      }))
    }
  }

  /** 검수 수량 직접 입력 처리 */
  async _onManualQtyInput(itemIndex, value) {
    const item = this.packingItems[itemIndex]
    if (!item) return
    const orderQty = item.pack_qty || item.order_qty || 1
    const qty = Math.max(0, Math.min(Number(value) || 0, orderQty))

    this.packingItems = this.packingItems.map((it, idx) =>
      idx === itemIndex ? { ...it, insp_qty: qty } : it
    )

    if (qty > 0) {
      this.lastScannedItem = {
        success: qty >= orderQty,
        message: `${item.sku_cd} — 수량 입력: ${qty}/${orderQty}`
      }
    }

    if (qty >= orderQty) {
      await this._confirmInspection(itemIndex)
    }
  }

  /** 상품 바코드 스캔 처리 */
  async _onSkuSelect(e) {
    if (this.processing) return
    const { sku_cd, sku_nm } = e.detail

    const matchIndex = this.packingItems.findIndex(
      item => item.status !== 'COMPLETED' &&
        (item.sku_cd === sku_cd || item.product_cd === sku_cd)
    )

    if (matchIndex >= 0) {
      const item = this.packingItems[matchIndex]
      const orderQty = item.pack_qty || item.order_qty || 1
      const currentInspQty = item.insp_qty || 0

      if (currentInspQty >= orderQty) {
        this.lastScannedItem = { success: false, message: `${item.sku_cd} — 이미 검수 완료` }
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'warn', message: '이미 검수 완료된 상품입니다' }
        }))
        return
      }

      this.currentItemIndex = matchIndex
      const newInspQty = currentInspQty + 1

      this.packingItems = this.packingItems.map((it, idx) =>
        idx === matchIndex ? { ...it, insp_qty: newInspQty } : it
      )

      this.lastScannedItem = {
        success: true,
        message: `${item.sku_cd} (${item.sku_nm || sku_nm || ''}) — ${newInspQty}/${orderQty} ✅`
      }

      if (newInspQty >= orderQty) {
        await this._confirmInspection(matchIndex)
      } else {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `스캔 확인 (${newInspQty}/${orderQty})` }
        }))
        this._focusBarcodeInput()
      }
    } else {
      this.lastScannedItem = { success: false, message: `포장 항목에 없는 상품: ${sku_cd}` }
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `포장 항목에 없는 상품입니다: ${sku_cd}` }
      }))
      navigator.vibrate?.(200)
      this._focusBarcodeInput()
    }
  }

  /** 검수 완료 API 호출 */
  async _confirmInspection(itemIndex) {
    const item = this.packingItems[itemIndex]
    if (!item) return

    this.processing = true
    try {
      const confirmQty = item.insp_qty || item.pack_qty || item.order_qty || 1
      await ServiceUtil.restPost(`ful_trx/packing_order_items/${item.id}/finish`, {
        barcode: item.barcode || '',
        packQty: confirmQty,
        lotNo: item.lot_no || '',
        expiredDate: item.expired_date || ''
      }, null, null, (_res) => {
        this.packingItems = this.packingItems.map((it, idx) =>
          idx === itemIndex ? { ...it, status: 'COMPLETED' } : it
        )
        this.completedCount = this.packingItems.filter(i => i.status === 'COMPLETED').length

        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `검수 완료 (${this.completedCount}/${this.totalCount})` }
        }))

        if (this.completedCount >= this.totalCount) {
          this._onInspectionComplete()
        } else {
          this._moveToNextItem()
          this.currentTabKey = 'done'
          setTimeout(() => {
            this.currentTabKey = 'waiting'
            this._focusBarcodeInput()
          }, 800)
        }

      }, (err) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: err?.msg || '검수 처리 중 오류' }
        }))
      })

    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '검수 처리 중 오류' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 전체 검수 완료 → packing 모드 전환 (B2B: 운송장 없음) */
  _onInspectionComplete() {
    this.mode = 'packing'
  }

  /** 출고 확정 API 호출 (B2B: 운송장 없음) */
  async _confirmRelease() {
    this.processing = true
    try {
      await ServiceUtil.restPost(`ful_trx/packing_orders/${this.selectedOrder.id}/complete`, {
        boxType: this.boxType,
        boxCount: this.boxCount,
        boxWeight: this.boxWeight,
        trackingNo: ''
      }, null, null, (_res) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: '출고 확정 완료' }
        }))
        this.mode = 'complete'
        this._fetchOrderSummary()
      }, (err) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: err?.msg || '출고 확정 실패' }
        }))
      })

    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '출고 확정 실패' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 거래명세서 출력 — B2B 전용, PDA는 새 탭에서 PDF 뷰어 사용 */
  _printDeliveryStatement() {
    if (!this.selectedOrder) return

    window.open(
      `/rest/stream/packing_orders/${this.selectedOrder.id}/download_packing_sheet`,
      '_blank'
    )
  }

  /** 현재 항목 건너뛰기 */
  _skipItem() {
    this._moveToNextItem()
    this.lastScannedItem = null
    this._focusBarcodeInput()
  }

  /** 목록 화면으로 복귀 */
  async _goBack() {
    this.mode = 'list'
    this.selectedOrder = null
    this.packingItems = []
    this.currentItemIndex = -1
    await this._loadPackingOrders()
  }

  /** 다음 포장 지시 자동 선택 */
  async _selectNextOrder() {
    await this._loadPackingOrders()
    const nextOrder = this.packingOrders.find(o => o.status === 'CREATED' || o.status === 'IN_PROGRESS')
    if (nextOrder) {
      this._selectOrder(nextOrder)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '대기 중인 포장 작업이 없습니다' }
      }))
      this._goBack()
    }
  }

  /* ==================== Helpers ==================== */

  /** 다음 미완료 항목으로 인덱스 이동 */
  _moveToNextItem() {
    const nextIdx = this.packingItems.findIndex(i => i.status !== 'COMPLETED')
    this.currentItemIndex = nextIdx
  }

  /** 수량 기반 박스 유형 자동 추천 */
  _recommendBoxType() {
    const totalQty = this.packingItems.reduce((s, i) => s + (i.pack_qty || i.order_qty || 0), 0)
    if (totalQty <= 3) this.boxType = 'SMALL'
    else if (totalQty <= 10) this.boxType = 'MEDIUM'
    else if (totalQty <= 30) this.boxType = 'LARGE'
    else this.boxType = 'XLARGE'
  }

  /** 바코드 입력 필드에 포커스 설정 */
  _focusBarcodeInput() {
    setTimeout(() => this._skuBarcodeInput?.focus(), 100)
  }

  /** station_cd를 공통코드 description으로 변환 */
  _stationLabel(stationCd) {
    const opt = this.stationOptions.find(o => o.name === stationCd)
    return opt?.description || stationCd
  }
}
