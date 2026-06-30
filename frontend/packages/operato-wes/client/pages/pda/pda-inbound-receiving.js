import '@things-factory/barcode-ui'
import '../../component/sku-barcode-input.js'
import '../../component/barcode-listener.js'
import '../../component/numeric-keypad-input.js'
import '../../component/code-select.js'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { MetaApi, ServiceUtil, TermsUtil, UiUtil, ValueUtil, PrintUtil } from '@operato-app/metapage/dist-client'
import { operatoGet } from '@operato-app/operatofill'
import '@operato-app/metapage/dist-client/components/input/operato-input-barcode'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 입고 작업 화면
 *
 * 창고에서 PDA로 입고 주문을 선택한 뒤, 상품 바코드를 스캔하여
 * 항목별 실제 입고 수량을 입력·확인하는 화면.
 *
 * 화면 모드: list(주문 목록) → work(항목 스캔) → complete(완료 확인)
 */
@customElement('pda-inbound-receiving')
export class PdaInboundReceiving extends connect(store)(PageView) {
  /** 화면 모드: list / work / complete */
  @state() mode = 'list'

  /** 입고 주문 목록 */
  @state() taskList = []
  /** vend_cd → vend_nm 매핑 (목록 표시용) */
  _vendorMap = {}
  /** 목록 필터 상태 */
  @state() filterStatus = 'ALL'
  /** 목록 로딩 중 */
  @state() loading = false
  /** API 처리 중 */
  @state() processing = false
  /** 조회 기준 날짜 */
  @state() orderDate = ValueUtil.todayFormatted()
  /** 상태별 건수 요약 { ready, start, completed, total } */
  @state() taskSummary = { ready: 0, start: 0, completed: 0, total: 0 }

  /** 선택된 입고 주문 헤더 */
  @state() currentReceiving = null
  /** 선택된 입고 주문의 항목 목록 */
  @state() receivingItems = []
  /** 현재 처리 대상 항목 인덱스 */
  @state() currentItemIndex = -1
  /** 실제 입고 수량 입력값 */
  @state() rcvQty = 0
  /** 불량 사유 코드 */
  @state() defectReasonCode = ''
  /** 소비기한 입력값 (yyyy-MM-dd) */
  @state() expiredDate = ''
  /** LOT 번호 입력값 */
  @state() lotNo = ''
  /** 화주사명 (코드 → 명칭 표시용) */
  @state() _comNm = ''
  /** 공급처명 (코드 → 명칭 표시용) */
  @state() _vendNm = ''
  /** 상품 선택 팝업 표시 여부 */
  @state() _showItemPicker = false
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
  /** 현재 항목 바코드 스캔 완료 여부 */
  @state() barcodeScanned = false
  /** 항목 목록 로딩 중 (work 화면 진입 초기 깜빡임 방지) */
  @state() itemsLoading = false
  /** 완료된 주문 조회 전용 모드 — 버튼/탭 입력 비활성화 */
  @state() viewOnly = false

  /** SKU 바코드 스캔 입력 컴포넌트 */
  @query('sku-barcode-input') _skuBarcodeInput
  /** 입고번호 스캔 입력 */
  @query('#rcvScanInput') _rcvScanInput

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
          flex-shrink: 0;
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

        /* 날짜 필터 */
        .date-filter {
          padding: 8px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
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

        .date-filter .btn-search:active { opacity: 0.85; }

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

        .summary-card.waiting .count { color: var(--md-sys-color-error, #d32f2f); }
        .summary-card.in-progress .count { color: #1976d2; }
        .summary-card.done .count { color: #4CAF50; }
        .summary-card.all .count { color: #757575; }

        /* 입고번호 스캔 입력 */
        .scan-task-order {
          padding: 8px 12px 12px;
        }

        .scan-task-order label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          display: block;
          margin-bottom: 4px;
        }

        .scan-task-order .scan-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-task-order .scan-row operato-input-barcode {
          flex: 1;
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

        /* 입고 주문 카드 목록 */
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

        .task-card .status-badge.ready {
          background: #fff3e0;
          color: #ff9800;
        }

        .task-card .status-badge.start {
          background: #e3f2fd;
          color: #1976d2;
        }

        .task-card .status-badge.end {
          background: #e8f5e9;
          color: #4CAF50;
        }

        .task-card .status-badge.approved {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .task-card .status-badge.putaway {
          background: #ede7f6;
          color: #6a1b9a;
        }

        .task-card .status-badge.stored {
          background: #e0f2f1;
          color: #00695c;
        }

        .task-card .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 6px;
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
          padding: 4px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
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

        /* 현재 입고 항목 */
        .current-item-section {
          margin: 2px 12px;
          padding: 8px 10px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .location-display {
          text-align: center;
          padding: 4px 0 8px;
          font-size: 26px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          letter-spacing: 2px;
        }

        .item-info {
          font-size: 14px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
        }

        .item-info .sku {
          font-weight: bold;
          font-size: 15px;
        }

        .item-info .qty {
          font-size: 14px;
          margin-top: 4px;
        }

        .item-info .lot {
          font-size: 12px;
          margin-top: 4px;
          opacity: 0.8;
        }

        .barcode-input {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .barcode-input label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
        }

        .barcode-input sku-barcode-input {
          flex: 1;
        }

        /* 바코드 스캔 우측 상품 선택 버튼 */
        .barcode-input .btn-item-picker {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          font-size: 16px;
          cursor: pointer;
        }
        .barcode-input .btn-item-picker:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }
        .barcode-input .btn-item-picker:disabled {
          opacity: 0.4;
        }

        /* 미완료 탭 항목 — 선택 불가 */
        .item-card.no-select {
          cursor: default;
        }

        /* 완료된 주문 조회 시 완료 탭 항목 — 선택 가능 */
        .item-card.selectable {
          cursor: pointer;
        }
        .item-card.selectable:active {
          opacity: 0.85;
        }

        /* 상품 선택 팝업 (바텀 시트) */
        .picker-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .picker-sheet {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 16px 16px 0 0;
          width: 100%;
          max-height: 70vh;
          overflow-y: auto;
          padding: 12px 12px env(safe-area-inset-bottom, 16px);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
        }
        .picker-handle {
          width: 40px;
          height: 4px;
          background: var(--md-sys-color-outline, #ccc);
          border-radius: 2px;
          margin: 0 auto 12px;
        }
        .picker-title {
          font-size: 15px;
          font-weight: 600;
          padding: 0 4px 10px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
          color: var(--md-sys-color-on-surface, #222);
        }
        .picker-empty {
          text-align: center;
          padding: 24px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }
        .picker-item {
          padding: 10px 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          cursor: pointer;
        }
        .picker-item:active {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }
        .picker-item .p-nm {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #222);
        }
        .picker-item .p-sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #777);
          margin-top: 2px;
        }
        .picker-cancel {
          width: 100%;
          margin-top: 10px;
          padding: 12px;
          border: 1px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          background: transparent;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #555);
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .picker-backdrop { align-items: center; }
          .picker-sheet { border-radius: 12px; width: 420px; max-width: 90vw; }
          .picker-handle { display: none; }
        }

        /* 수량 입력 행 */
        .qty-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }

        .qty-input-row label {
          flex: 0 0 auto;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .qty-input-row numeric-keypad-input {
          flex: 1;
          min-width: 0;
        }

        .qty-input-row .btn-qty {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .qty-input-row .btn-qty:active {
          opacity: 0.8;
        }

        /* 일반 입력 행 (불량사유/소비기한/LOT) */
        .field-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }

        .field-row label {
          flex: 0 0 auto;
          min-width: 56px;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .field-row input,
        .field-row code-select {
          flex: 1;
          min-width: 0;
        }

        .field-row input {
          height: 32px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 15px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          box-sizing: border-box;
        }

        /* 스캔 피드백 */
        .scan-feedback {
          margin-top: 8px;
          padding: 8px 12px;
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
          background: #fff8e1;
          color: #f57f17;
        }

        /* 탭 */
        .tabs {
          display: flex;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          margin: 4px 12px 0;
          flex-shrink: 0;
        }

        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }

        .tab[activate] {
          color: var(--md-sys-color-primary, #1976D2);
          border-bottom-color: var(--md-sys-color-primary, #1976D2);
        }

        .tab .badge {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
          border-radius: 10px;
          padding: 1px 7px;
          font-size: 11px;
        }

        .tab[activate] .badge {
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-primary, #1976D2);
        }

        /* 탭 콘텐츠 — 항목 목록 */
        .tab-content {
          padding: 8px 12px;
          overflow-y: auto;
          min-height: calc(100svh - 290px);
        }

        .item-card {
          display: flex;
          align-items: center;
          gap: 1px;
          padding: 8px 10px;
          margin-bottom: 6px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .item-card .icon {
          font-size: 18px;
          flex-shrink: 0;
          width: 24px;
          text-align: center;
        }

        .item-card .info {
          flex: 1;
          min-width: 0;
        }

        .item-card .loc {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .sku {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .qty-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .qty-badge.done {
          background: #e8f5e9;
          color: #2e7d32;
        }

        /* 완료 항목 카드 — 정보(전체폭) / 인쇄·수량 2행 구조로 상품명 잘림 방지 */
        .item-card.done-card {
          flex-direction: column;
          align-items: stretch;
        }
        .item-card.done-card .card-main {
          display: flex;
          align-items: center;
          gap: 1px;
        }
        .item-card.done-card .card-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 1px;
        }
        /* 완료 항목은 상품명을 전체 폭에서 줄바꿈하여 모두 표시 */
        .item-card.done-card .sku {
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
        }

        .item-card.current {
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border: 2px solid var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.25);
        }

        .item-card.current .icon {
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 20px;
        }

        .item-card.current .sku {
          color: var(--md-sys-color-primary, #1976D2);
          font-weight: 700;
        }

        .item-card.current .qty-badge {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        /* 완료 화면 */
        .complete-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 20px 24px;
          text-align: center;
        }

        .complete-section .check-icon {
          font-size: 64px;
          margin-bottom: 12px;
        }

        .complete-section h3 {
          font-size: 20px;
          font-weight: 700;
          color: #4caf50;
          margin: 0 0 20px;
        }

        .result-card {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 10px;
          padding: 16px 20px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
          text-align: left;
        }

        .result-card .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .result-card .stat-row .label {
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .result-card .stat-row .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .complete-section .btn-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 360px;
        }

        .complete-section .btn-group button {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-next {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-list {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #333);
        }

        /* 빈 목록 */
        .empty-message {
          text-align: center;
          padding: 32px 16px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #999);
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

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: TermsUtil.tMenu('ReceivingWork') || '입고 작업'
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
    const rcvNo = this.currentReceiving?.rcv_no || ''

    if (this.mode === 'complete') {
      return html`
        <div class="header-bar">
          <span class="title">
            <button class="back-btn" @click=${this._goBack}>◀</button>
            입고번호 : ${rcvNo}
          </span>
        </div>
      `
    }

    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          입고번호 : ${rcvNo}
        </span>
        <div class="actions">
          <button
            ?disabled=${this.processing || !this.currentReceiving?.id}
            @click=${this._printBarcodeSheet}>
            🖨️ ${TermsUtil.tButton('print') || '인쇄'}
          </button>
          <button class="primary"
            ?disabled=${this.viewOnly || this.processing || !this.rcvQty || !this.barcodeScanned}
            @click=${this._confirmReceive}>
            ${TermsUtil.tButton('confirm') || '확인'}
          </button>
          <button class="danger"
            ?disabled=${this.viewOnly || this.processing || !this.barcodeScanned || !this.defectReasonCode}
            @click=${this._defectReceive}>
            ${TermsUtil.tButton('defect') || '불량'}
          </button>
          <button class="primary"
            ?disabled=${this.viewOnly || this.processing}
            @click=${this._closeReceiving}>
            ${TermsUtil.tButton('complete') || '작업완료'}
          </button>
        </div>
      </div>
    `
  }

  /** list 모드 렌더링 — 날짜 필터, 진행률, 현황 요약 카드, 입고주문 목록, 입고번호 스캔 */
  _renderListMode() {
    const DONE_STATUSES = new Set(['END', 'APPROVED', 'PUTAWAY', 'STORED'])
    const ready = this.taskList.filter(t => t.status === 'READY')
    const start = this.taskList.filter(t => t.status === 'START')
    const end = this.taskList.filter(t => DONE_STATUSES.has(t.status))
    const all = [...ready, ...start, ...end]
    const filtered =
      this.filterStatus === 'READY' ? ready
        : this.filterStatus === 'START' ? start
          : this.filterStatus === 'END' ? end
            : all

    const emptyMessage =
      this.filterStatus === 'READY' ? '대기 중인 입고 주문이 없습니다' :
        this.filterStatus === 'START' ? '작업 중인 입고 주문이 없습니다' :
          this.filterStatus === 'END' ? '오늘 완료된 입고 주문이 없습니다' :
            '조회된 입고 주문이 없습니다'

    const progressPct = all.length > 0 ? (end.length / all.length) * 100 : 0
    const progressPctDisplay = progressPct.toFixed(1)

    return html`
      <barcode-listener
        @barcode-scanned=${e => this._onScanReceivingNo(e.detail.barcode)}>
      </barcode-listener>

      <div class="date-filter">
        <div class="filter-row">
          <input
            type="date"
            .value="${this.orderDate}"
            @change=${e => { this.orderDate = e.target.value }}
          />
          <button class="btn-search" @click=${() => { this.filterStatus = 'ALL'; this._loadTaskList(); }}>🔍 검색</button>
        </div>
      </div>

      <div class="list-progress-section">
        <div class="list-progress-bar">
          <div class="list-progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="list-progress-header">
          <span>입고 ${progressPctDisplay}%</span>
          <span>진행 <strong>${ready.length + start.length}</strong> / 완료 <strong>${end.length}</strong> (총 ${all.length}건)</span>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active=${this.filterStatus === 'READY'}
          @click=${() => this._toggleFilter('READY')}>
          <div class="count">${ready.length}</div>
          <div class="card-label">${TermsUtil.tLabel('wait') || '대기'}</div>
        </div>
        <div class="summary-card in-progress"
          ?active=${this.filterStatus === 'START'}
          @click=${() => this._toggleFilter('START')}>
          <div class="count">${start.length}</div>
          <div class="card-label">${TermsUtil.tLabel('in_progress') || '작업중'}</div>
        </div>
        <div class="summary-card done"
          ?active=${this.filterStatus === 'END'}
          @click=${() => this._toggleFilter('END')}>
          <div class="count">${end.length}</div>
          <div class="card-label">${TermsUtil.tLabel('completed') || '완료'}</div>
        </div>
        <div class="summary-card all"
          ?active=${this.filterStatus === 'ALL'}
          @click=${() => this._toggleFilter('ALL')}>
          <div class="count">${all.length}</div>
          <div class="card-label">${TermsUtil.tLabel('all') || '전체'}</div>
        </div>
      </div>

      ${this.loading
        ? html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
        : html`
          <div class="task-list">
            ${filtered.length === 0
            ? html`<div class="empty-message">${emptyMessage}</div>`
            : filtered.map(r => this._renderTaskCard(r))}
          </div>
        `}

      <div class="scan-task-order">
        <label>${TermsUtil.tLabel('rcv_no') || '입고번호 스캔'}</label>
        <div class="scan-row">
          <operato-input-barcode id="rcvScanInput"
            placeholder="입고번호 스캔"
            @change=${e => this._onScanReceivingNo(e.target.value)}>
          </operato-input-barcode>
          <button class="btn-refresh" @click=${this._refresh}>
            ${TermsUtil.tButton('refresh') || '새로고침'}
          </button>
        </div>
      </div>
    `
  }

  /** 입고 주문 카드 렌더링 */
  _renderTaskCard(r) {
    const isStart = r.status === 'START'
    const finishedItems = r.finished_items || 0
    const totalItems = r.total_items || 0
    const progressPct = totalItems > 0 ? Math.round((finishedItems / totalItems) * 100) : 0

    return html`
      <div class="task-card" @click=${() => this._selectReceiving(r)}>
        <div class="card-header">
          <span class="task-no">${r._skuNm || r.sku_nm || '-'}</span>
          <span class="status-badge ${(r.status || '').toLowerCase()}">
            ${{
        READY: TermsUtil.tLabel('wait') || '대기',
        START: TermsUtil.tLabel('in_progress') || '진행중',
        END: TermsUtil.tLabel('completed') || '입고완료',
        APPROVED: TermsUtil.tLabel('approved') || '검수승인',
        PUTAWAY: TermsUtil.tLabel('putaway') || '적치중',
        STORED: TermsUtil.tLabel('stored') || '적치완료'
      }[r.status] || r.status}
          </span>
        </div>
        <div class="sub-info">
          ${TermsUtil.tLabel('rcv_no') || '입고번호'}: ${r.rcv_no} | ${TermsUtil.tLabel('vend_cd') || '공급처'}: ${this._vendorMap[r.vend_cd] || r.vend_cd || ''} | ${TermsUtil.tLabel('rcv_req_date') || '입고 예정일'}: ${r.rcv_req_date || ''}
          ${totalItems ? ` · ${totalItems}건` : ''}
        </div>
        ${isStart ? html`
          <div class="progress-bar">
            <div class="fill" style="width: ${progressPct}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /** work 모드 렌더링 — 진행률, 현재 항목, 바코드 스캔, 수량 입력, 탭 */
  _renderWorkMode() {
    const progressPct = this.totalCount > 0
      ? Math.round((this.completedCount / this.totalCount) * 100) : 0
    const totalQty = this.receivingItems.reduce((s, i) => s + (i.rcv_exp_qty || 0), 0)
    const doneQty = this.receivingItems.reduce((s, i) => s + (i.rcv_qty || 0), 0)
    const currentItem = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null

    const rcv = this.currentReceiving

    return html`
      <barcode-listener
        @barcode-scanned=${e => this._skuBarcodeInput?.scan(e.detail.barcode)}>
      </barcode-listener>

      <div class="progress-section">
        <div class="progress-bar-large">
          <div class="fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${this.completedCount}/${this.totalCount}건 (${doneQty}/${totalQty})</div>
      </div>

      <!-- 입고 주문 요약 정보 -->
      <div style="
        display:flex; gap:10px; flex-wrap:wrap;
        padding:4px 12px;
        font-size:12px;
        color:var(--md-sys-color-on-surface-variant,#666);
        border-bottom:1px solid var(--md-sys-color-outline-variant,#e0e0e0);
        background:var(--md-sys-color-surface-container-low,#f5f5f5);
        flex-shrink:0;
      ">
        <span>📅 ${TermsUtil.tLabel('rcv_req_date') || '입고예정일'}: <strong>${rcv?.rcv_req_date || '-'}</strong></span>
        <span>🏢 ${TermsUtil.tLabel('com_cd') || '화주사'}: <strong>${this._comNm || rcv?.com_cd || '-'}</strong></span>
        <span>🚚 ${TermsUtil.tLabel('vend_cd') || '공급사'}: <strong>${this._vendNm || rcv?.vend_cd || '-'}</strong></span>
      </div>

      ${this.itemsLoading ? html`
        <div class="current-item-section">
          <div class="item-info" style="text-align:center; padding: 12px 0; opacity:0.6;">
            항목 로딩 중...
          </div>
        </div>
      ` : html`
        <div class="current-item-section">
          ${currentItem?.loc_cd
          ? html`<div class="location-display">${currentItem.loc_cd}</div>`
          : ''}
          <div class="item-info">
            <div class="sku">
              ${currentItem
          ? html`#${currentItem.rcv_exp_seq} : ${currentItem.sku_nm || currentItem.sku_cd}${currentItem.sku_nm ? html`<span style="font-weight:normal;font-size:13px;"> (${currentItem.sku_cd})</span>` : ''}`
          : '-'}
            </div>
            <div class="qty">
              예정: ${currentItem ? (currentItem.rcv_exp_qty || 0) : ''}
            </div>
            ${currentItem?.lot_no ? html`
              <div class="lot">
                LOT: ${currentItem.lot_no}
                ${currentItem.expired_date ? ` · 유통기한: ${currentItem.expired_date}` : ''}
              </div>
            ` : ''}
          </div>

          <div class="barcode-input">
            <label>${TermsUtil.tLabel('scan_barcode') || '상품 바코드 스캔'}</label>
            <sku-barcode-input
              .comCd=${this.currentReceiving?.com_cd || ''}
              placeholder="${TermsUtil.tLabel('scan_barcode') || '상품 바코드 스캔'}"
              ?disabled=${this.processing || this.viewOnly}
              skipInventory
              @sku-select=${e => this._onSkuSelect(e.detail)}>
            </sku-barcode-input>
            <button class="btn-item-picker" title="상품 선택"
              ?disabled=${this.viewOnly}
              @click=${() => { this._showItemPicker = true }}>📋</button>
          </div>

          <div class="qty-input-row">
            <label>${TermsUtil.tLabel('rcv_qty') || '입고수량'}</label>
            <button class="btn-qty" ?disabled=${!currentItem}
              @click=${() => this._setRcvQty(this.rcvQty - 1)}>−</button>
            <numeric-keypad-input
              .value=${this.rcvQty}
              .min=${0}
              ?disabled=${this.processing || this.viewOnly || !currentItem}
              @change=${e => this._setRcvQty(e.detail.value)}>
            </numeric-keypad-input>
            <button class="btn-qty" ?disabled=${!currentItem}
              @click=${() => this._setRcvQty(this.rcvQty + 1)}>+</button>
          </div>

          ${currentItem ? html`
            <!-- 소비기한 -->
            <div class="field-row">
              <label>${TermsUtil.tLabel('expired_date') || '소비기한'}</label>
              <input type="date"
                .value=${this.expiredDate}
                ?disabled=${this.processing || this.viewOnly}
                @focus=${this._pauseScan}
                @blur=${this._resumeScan}
                @change=${e => (this.expiredDate = e.target.value)} />
            </div>

            <!-- LOT 번호 -->
            <div class="field-row">
              <label>${TermsUtil.tLabel('lot_no') || 'LOT'}</label>
              <input type="text"
                .value=${this.lotNo}
                ?disabled=${this.processing || this.viewOnly}
                @input=${e => (this.lotNo = e.target.value)} />
            </div>

            <!-- 불량 사유 코드 -->
            <div class="field-row">
              <label>${TermsUtil.tLabel('defect_reason') || '불량사유'}</label>
              <code-select
                code-name="INBOUND_DEFECT_REASON"
                placeholder="${TermsUtil.tText('select_one') || '사유 선택'}"
                .value=${this.defectReasonCode}
                ?disabled=${this.processing || this.viewOnly}
                @change=${e => { this.defectReasonCode = e.detail.value }}>
              </code-select>
            </div>
          ` : ''}

          ${this.lastFeedback ? html`
            <div class="scan-feedback ${this.lastFeedback.type}">
              ${this.lastFeedback.message}
            </div>
          ` : ''}
        </div>
      `}

      ${this._renderWorkTabs()}
      ${this._renderWorkTabContent()}
      ${this._renderItemPicker()}
    `
  }

  /**
   * 항목이 완료(작업완료 또는 그 이후 단계) 상태인지 여부.
   * 입고완료(END)뿐 아니라 검수승인(APPROVED)·적치중(PUTAWAY)·적치완료(STORED)도 완료로 간주한다.
   * (검수승인 시 디테일 상태가 END→APPROVED로 바뀌어도 완료 탭에 그대로 표시되도록 보장)
   * @param {string} status - 항목 상태 코드
   * @returns {boolean} 완료 단계이면 true
   */
  _isItemDone(status) {
    return status === 'END' || status === 'APPROVED' || status === 'PUTAWAY' || status === 'STORED'
  }

  /** work 모드 탭 바 렌더링 — 미완료/완료 탭 */
  _renderWorkTabs() {
    const todoItems = this.receivingItems.filter(i => !this._isItemDone(i.status) && i.status !== 'CANCEL' && i.status !== 'BAD' && i.status !== 'SHORT')
    const doneItems = this.receivingItems.filter(i => this._isItemDone(i.status))

    return html`
      <div class="tabs">
        <div class="tab"
          ?activate=${'todo' === this.currentTabKey}
          ?disabled=${this.viewOnly}
          style=${this.viewOnly ? 'opacity:0.4; pointer-events:none; cursor:not-allowed;' : ''}
          @click=${() => { if (!this.viewOnly) this.currentTabKey = 'todo' }}>
          <span>${TermsUtil.tLabel('not_completed') || '미완료'}</span>
          <span class="badge">${todoItems.length}</span>
        </div>
        <div class="tab" ?activate=${'done' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'done')}>
          <span>${TermsUtil.tLabel('completed') || '완료'}</span>
          <span class="badge">${doneItems.length}</span>
        </div>
      </div>
    `
  }

  /** work 모드 탭 콘텐츠 렌더링 — 미완료/완료 항목 목록 */
  _renderWorkTabContent() {
    const items = this.currentTabKey === 'todo'
      ? this.receivingItems.filter(i => !this._isItemDone(i.status) && i.status !== 'CANCEL' && i.status !== 'BAD' && i.status !== 'SHORT')
      : this.receivingItems.filter(i => this._isItemDone(i.status))

    if (!items.length) {
      return html`
        <div class="tab-content">
          <div class="empty-message">
            ${this.currentTabKey === 'todo' ? '미완료 항목 없음' : '완료 항목 없음'}
          </div>
        </div>
      `
    }

    return html`
      <div class="tab-content">
        ${items.map(item => {
      const idx = this.receivingItems.indexOf(item)
      const isCurrent = idx === this.currentItemIndex
      const isDone = this._isItemDone(item.status)
      const icon = isDone ? '✅' : isCurrent ? '▶' : '☐'
      // 완료된 주문 조회(viewOnly) 시에만 완료 탭 항목을 사용자가 선택 가능
      const selectable = this.viewOnly && this.currentTabKey === 'done'

      // 완료 항목: 상품명이 잘리지 않도록 정보(전체폭) 행 / 인쇄·수량 행 2단 구조
      const infoBlock = html`
              <div class="info">
                <div class="loc">
                  #${item.rcv_exp_seq || '-'}
                  ${item.loc_cd ? `로케이션 : ${item.loc_cd}` : ''}
                  상품 : ${item.sku_cd}
                </div>
                <div class="sku">${item.sku_nm || ''}</div>
                ${isDone && item.barcode ? html`
                  <div class="loc">${item.barcode}</div>
                  <div class="loc">${TermsUtil.tLabel('expired_date')}: ${item.expired_date || '-'} | ${TermsUtil.tLabel('lot_no')}: ${item.lot_no || '-'}</div>
                ` : ''}
              </div>`

      if (isDone) {
        return html`
            <div class="item-card done-card ${isCurrent ? 'current' : ''} ${selectable ? 'selectable' : 'no-select'}"
              @click=${selectable ? () => { this.currentItemIndex = idx } : null}>
              <div class="card-main">
                <span class="icon">${icon}</span>
                ${infoBlock}
              </div>
              <div class="card-actions">
                <span class="qty-badge done">
                  ${item.rcv_qty || 0}
                </span>
              </div>
            </div>
          `
      }

      return html`
            <div class="item-card ${isCurrent ? 'current' : ''} ${selectable ? 'selectable' : 'no-select'}"
              @click=${selectable ? () => { this.currentItemIndex = idx } : null}>
              <span class="icon">${icon}</span>
              ${infoBlock}
              <span class="qty-badge">
                ${item.rcv_exp_qty || 0}
              </span>
            </div>
          `
    })}
      </div>
    `
  }

  /** 상품 선택 팝업 렌더링 — 미완료 항목 목록에서 선택 */
  _renderItemPicker() {
    if (!this._showItemPicker) return ''
    const items = this.receivingItems.filter(i => !this._isItemDone(i.status) && i.status !== 'CANCEL' && i.status !== 'BAD' && i.status !== 'SHORT')
    return html`
      <div class="picker-backdrop" @click=${() => { this._showItemPicker = false }}>
        <div class="picker-sheet" @click=${e => e.stopPropagation()}>
          <div class="picker-handle"></div>
          <div class="picker-title">${TermsUtil.tText('select_one') || '상품 선택'} (${items.length})</div>
          ${items.length === 0
        ? html`<div class="picker-empty">미완료 항목 없음</div>`
        : items.map(item => html`
              <div class="picker-item" @click=${() => this._pickItem(item)}>
                <div class="p-nm">${item.sku_nm || item.sku_cd}</div>
                <div class="p-sub">#${item.rcv_exp_seq} · ${item.sku_cd}${item.loc_cd ? ` · ${item.loc_cd}` : ''} · ${TermsUtil.tLabel('rcv_exp_qty') || '예정'} ${item.rcv_exp_qty || 0}</div>
              </div>
            `)}
          <button class="picker-cancel" @click=${() => { this._showItemPicker = false }}>
            ${TermsUtil.tButton('cancel') || '취소'}
          </button>
        </div>
      </div>
    `
  }

  /**
   * 팝업에서 상품 선택 — 바코드 스캔과 동일하게 현재 항목으로 설정
   * @param {object} item - 선택된 미완료 항목
   */
  _pickItem(item) {
    this._showItemPicker = false
    const idx = this.receivingItems.indexOf(item)
    if (idx < 0) return
    this.currentItemIndex = idx
    this._setInitialRcvQty()
    this.barcodeScanned = true
    this._showFeedback(`${item.sku_nm || item.sku_cd} ${TermsUtil.tText('selected') || '선택'} — ${this.rcvQty}`, 'success')
  }

  /** complete 모드 렌더링 — 완료 통계 + 버튼 */
  _renderCompleteMode() {
    const elapsed = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0
    const min = Math.floor(elapsed / 60)
    const sec = elapsed % 60
    const totalRcvQty = this.receivingItems.reduce((s, i) => s + (i.rcv_qty || 0), 0)
    const doneCount = this.receivingItems.filter(i => this._isItemDone(i.status)).length

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('processed') || '처리 완료!'}</h3>

        <div class="result-card">
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('rcv_no') || '입고번호'}</span>
            <span class="value">${this.currentReceiving?.rcv_no || ''}</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tText('processed') || '처리 완료'}</span>
            <span class="value">${doneCount}건</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('rcv_qty') || '입고 수량'}</span>
            <span class="value">${totalRcvQty}</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('elapsed_time') || '소요 시간'}</span>
            <span class="value">${min}분 ${sec}초</span>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn-next" @click=${this._selectNextTask}>
            ${TermsUtil.tLabel('next_work') || '다음 작업'}
          </button>
          <button class="btn-list" @click=${this._goBack}>
            ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /** 페이지 초기화 — 입고 주문 목록 조회 */
  pageInitialized() {
    this._loadTaskList()
  }

  /**
   * 입고 주문 목록 조회
   * - 대기(READY): 오늘 입고 예정일 기준
   * - 작업중(START): 날짜 무관 (현재 진행 중인 모든 주문)
   * - 완료: 오늘 완료일(rcv_end_date) 기준, END 이후 상태(APPROVED/PUTAWAY/STORED) 포함
   */
  async _loadTaskList() {
    this.loading = true
    try {
      const date = this.orderDate || ValueUtil.todayFormatted()

      const [readyResult, startResult, endResult, vendorResult] = await Promise.all([
        ServiceUtil.restGet(`receivings?query=${encodeURIComponent(JSON.stringify([
          { name: 'status', operator: 'eq', value: 'READY' },
          { name: 'rcv_req_date', operator: 'eq', value: date }
        ]))}&limit=100`),
        ServiceUtil.restGet(`receivings?query=${encodeURIComponent(JSON.stringify([
          { name: 'status', operator: 'eq', value: 'START' }
        ]))}&limit=100`),
        ServiceUtil.restGet(`receivings?query=${encodeURIComponent(JSON.stringify([
          { name: 'status', operator: 'in', value: 'END,APPROVED,PUTAWAY,STORED' },
          { name: 'rcv_end_date', operator: 'eq', value: date }
        ]))}&limit=100`),
        ServiceUtil.restGet('vendors?select=vend_cd,vend_nm&limit=500')
      ])

      const vendors = vendorResult?.items || vendorResult || []
      this._vendorMap = Object.fromEntries(vendors.map(v => [v.vend_cd, v.vend_nm]))

      this.taskList = [
        ...(readyResult?.items || readyResult || []),
        ...(startResult?.items || startResult || []),
        ...(endResult?.items || endResult || [])
      ]

      // 1주문-1상품 관계 — 각 입고주문의 상품명을 디테일에서 일괄 조회하여 매핑
      await this._loadTaskSkuNames()
    } catch (error) {
      console.error('입고 주문 목록 조회 실패:', error)
      this.taskList = []
    } finally {
      this.loading = false
    }
  }

  /**
   * 입고주문 목록의 상품명 조회 — 각 주문의 상세(receivings/{id}/items)에서 첫 상품명을 가져와 매핑.
   * (ReceivingItem은 receivings/{id}/items 커스텀 경로로만 조회 가능하므로 주문별로 조회)
   */
  async _loadTaskSkuNames() {
    const targets = this.taskList.filter(t => t.id)
    if (!targets.length) return
    try {
      const results = await Promise.all(targets.map(t =>
        ServiceUtil.restGet(`receivings/${t.id}/items`)
          .then(r => ({ id: t.id, items: r?.items || r || [] }))
          .catch(() => ({ id: t.id, items: [] }))
      ))
      const map = {}
      for (const { id, items } of results) {
        const it = items[0]
        if (it) map[id] = it.sku_nm || it.sku_cd || ''
      }
      this.taskList = this.taskList.map(t => ({ ...t, _skuNm: map[t.id] || '' }))
    } catch (e) {
      console.warn('입고주문 상품명 조회 실패:', e)
    }
  }

  /** 입고 항목 목록 조회 + 현재 항목 설정 */
  async _loadReceivingItems(receivingId) {
    this.itemsLoading = true
    try {
      const result = await ServiceUtil.restGet(`receivings/${receivingId}/items`)
      this.receivingItems = result?.items || result || []
      // 불량(BAD) 라인은 작업 대상 건수에서 제외 (진행률·자동마감 기준)
      this.totalCount = this.receivingItems.filter(i => i.status !== 'BAD' && i.status !== 'SHORT').length
      this.completedCount = this.receivingItems.filter(i => this._isItemDone(i.status)).length
      // 자동 선택하지 않음 — 사용자가 바코드 스캔 또는 상품 선택 팝업으로 직접 선택
      this.currentItemIndex = -1
      // 화주사·공급처 명칭 조회 (상단 표시용)
      await this._loadComVendNames(this.currentReceiving)
    } catch (error) {
      console.error('입고 항목 조회 실패:', error)
      this.receivingItems = []
    } finally {
      this.itemsLoading = false
    }
  }

  /**
   * 화주사·공급처 코드 → 명칭 조회 (상단 요약 표시용)
   * @param {object} r - 입고 주문 헤더 (com_cd, vend_cd 사용)
   */
  async _loadComVendNames(r) {
    this._comNm = r?.com_cd || ''
    this._vendNm = r?.vend_cd || ''
    try {
      if (r?.com_cd) {
        const res = await ServiceUtil.searchByPagination('companies', [{ name: 'com_cd', value: r.com_cd }], null, 1, 1)
        const c = res?.items?.[0]
        if (c) this._comNm = c.com_nm || r.com_cd
      }
      if (r?.vend_cd) {
        const res = await ServiceUtil.searchByPagination('vendors', [{ name: 'vend_cd', value: r.vend_cd }], null, 1, 1)
        const v = res?.items?.[0]
        if (v) this._vendNm = v.vend_nm || r.vend_cd
      }
    } catch (e) {
      console.warn('화주사/공급처명 조회 실패:', e)
    }
  }

  /** 입고번호 바코드 스캔으로 빠른 선택 — 오늘자 목록에 없으면 API로 직접 조회 */
  async _onScanReceivingNo(barcode) {
    if (!barcode) return

    if (this._rcvScanInput) {
      this._rcvScanInput.value = ''
    }

    // 1. 오늘자 목록에서 먼저 찾기
    const cached = this.taskList.find(t => t.rcv_no === barcode)
    if (cached) {
      this._selectReceiving(cached)
      return
    }

    // 2. 날짜 제한 없이 API 직접 조회 (이전 날짜 입고주문 처리용)
    this.processing = true
    try {
      const query = JSON.stringify([
        { name: 'rcv_no', operator: 'eq', value: barcode },
        { name: 'status', operator: 'in', value: 'READY,START' }
      ])
      const result = await ServiceUtil.restGet(`receivings?query=${encodeURIComponent(query)}&limit=1`)
      const found = (result?.items || result || [])[0]

      if (found) {
        this.processing = false
        await this._selectReceiving(found)
      } else {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: `처리 가능한 입고주문을 찾을 수 없습니다: ${barcode}` }
        }))
        navigator.vibrate?.(200)
      }
    } catch (err) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `입고번호 조회 실패: ${barcode}` }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 입고 주문 선택 → 작업 시작 → 항목 로드 → work 모드 전환 */
  async _selectReceiving(r) {
    const DONE_STATUSES = new Set(['END', 'APPROVED', 'PUTAWAY', 'STORED'])

    // 완료된 주문 — 조회 전용(viewOnly)으로 work 뷰 진입
    if (DONE_STATUSES.has(r.status)) {
      if (this.processing) return
      this.processing = true
      try {
        this.currentReceiving = r
        this.viewOnly = true
        this.currentTabKey = 'done'
        this.lastFeedback = null
        this.rcvQty = 0
        await this._loadReceivingItems(r.id)
        // 완료 탭 최상단 항목 자동 선택 (완료된 주문 조회 시)
        const firstDoneIdx = this.receivingItems.findIndex(i => this._isItemDone(i.status))
        this.currentItemIndex = firstDoneIdx
        this.mode = 'work'
      } catch (error) {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: error.message || '항목을 불러올 수 없습니다' }
        }))
      } finally {
        this.processing = false
      }
      return
    }

    if (this.processing) return
    this.processing = true

    try {
      if (r.status === 'READY') {
        // start API 호출 — 콜백 밖에서 await하기 위해 성공 여부만 수집
        let startSuccess = false
        await ServiceUtil.restPost(
          `inbound_trx/receiving_orders/${r.id}/start`, {}, null, null,
          () => { startSuccess = true },
          (err) => {
            document.dispatchEvent(new CustomEvent('notify', {
              detail: { level: 'error', message: err?.msg || '입고 작업을 시작할 수 없습니다' }
            }))
          }
        )
        if (startSuccess) {
          r.status = 'START'
          this.currentReceiving = r
          this.viewOnly = false
          this.startedAt = Date.now()
          this.lastFeedback = null
          this.currentTabKey = 'todo'
          this.rcvQty = 0
          await this._loadReceivingItems(r.id)  // Fix 1: await 추가
          this._setInitialRcvQty()
          this.mode = 'work'
        }

      } else if (r.status === 'START') {
        this.currentReceiving = r
        this.viewOnly = false
        this.startedAt = Date.now()
        this.lastFeedback = null
        this.currentTabKey = 'todo'
        this.rcvQty = 0
        await this._loadReceivingItems(r.id)
        this._setInitialRcvQty()
        this.mode = 'work'
      }

    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '입고 작업을 시작할 수 없습니다' }
      }))

    } finally {
      this.processing = false
    }
  }

  /**
   * sku-barcode-input에서 상품 선택 완료 시 — API가 이미 바코드를 sku_cd로 해석한 결과
   * @param {{ com_cd, sku_cd, sku_nm, barcode }} detail - 선택된 상품 정보
   */
  _onSkuSelect({ sku_cd }) {
    if (this.processing) return

    const currentItem = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null

    // 1. 현재 항목과 sku_cd 매칭
    if (currentItem && currentItem.sku_cd === sku_cd) {
      this._setInitialRcvQty()
      this.barcodeScanned = true
      this._showFeedback(`${sku_cd} 매칭 — ${this.rcvQty} 확인`, 'success')
      return
    }

    // 2. 전체 미완료 항목에서 sku_cd 검색
    const matchIndex = this.receivingItems.findIndex(
      item => item.status !== 'END' && item.status !== 'CANCEL' && item.status !== 'BAD' && item.status !== 'SHORT' && item.sku_cd === sku_cd
    )

    if (matchIndex >= 0) {
      this.currentItemIndex = matchIndex
      const item = this.receivingItems[matchIndex]
      this._setInitialRcvQty()
      this.barcodeScanned = true
      this._showFeedback(`${sku_cd} 매칭${item.loc_cd ? ` (${item.loc_cd})` : ''} — ${this.rcvQty}`, 'success')
      return
    }

    // 3. 이미 완료된 항목인지 확인
    const doneItem = this.receivingItems.find(item => item.status === 'END' && item.sku_cd === sku_cd)

    if (doneItem) {
      this._showFeedback(`이미 입고 완료된 상품입니다: ${sku_cd}`, 'warning')
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'warn', message: '이미 입고 완료된 상품입니다' }
      }))
    } else {
      this._showFeedback(`입고 주문에 없는 상품입니다: ${sku_cd}`, 'error')
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `입고 주문에 없는 상품입니다: ${sku_cd}` }
      }))
      navigator.vibrate?.(200)
    }
  }

  /** 입고 확인 API 호출 — 현재 항목 수량 확정 후 라인 완료 */
  async _confirmReceive() {
    const item = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null
    if (!item) {
      this._showFeedback('입고할 항목이 없습니다', 'warning')
      return
    }

    const qty = this.rcvQty
    if (!qty || qty <= 0) {
      this._showFeedback('수량을 입력해주세요', 'warning')
      return
    }

    this.processing = true
    try {
      // Fix 2: 콜백 패턴 대신 성공 여부를 플래그로 받아 await 흐름을 콜백 밖에서 유지
      let success = false
      let errMsg = null
      // rcv_qty(정상분)로 finish하면 백엔드가 (예정 − rcv_qty)만큼 불량 라인으로 분할하여
      // BAD 상태 + NG 로케이션 불량 재고를 생성한다. (defect_reason_code 가 있을 때)
      // 소비기한·LOT은 백엔드(finishReceivingOrderLine)가 그대로 저장한다.
      await ServiceUtil.restPost(
        `inbound_trx/receiving_orders/line/${item.id}/finish`,
        {
          ...item,
          rcv_qty: qty,
          expired_date: this.expiredDate || item.expired_date,
          lot_no: this.lotNo || item.lot_no
        },
        null, null,
        () => { success = true },
        (err) => { errMsg = err?.msg || err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || '입고 확인 실패' }
      )

      if (success) {
        await this._loadReceivingItems(this.currentReceiving.id)
        this._showFeedback(`입고 완료 (${this.completedCount}/${this.totalCount})`, 'success')
        if (this.completedCount >= this.totalCount) {
          await this._onAllItemsCompleted()
        } else {
          this._setInitialRcvQty()
        }
      } else if (errMsg) {
        this._showFeedback(errMsg, 'error')
      }

    } catch (error) {
      this._showFeedback(error.message || '입고 확인 실패', 'error')

    } finally {
      this.processing = false
    }
  }

  /** 불량 처리 API 호출 — 현재 항목을 불량으로 등록 */
  async _defectReceive() {
    const item = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null
    if (!item) {
      this._showFeedback('처리할 항목이 없습니다', 'warning')
      return
    }

    this.processing = true
    try {
      let success = false
      let errMsg = null
      await ServiceUtil.restPost(
        `inbound_trx/receiving_orders/line/${item.id}/defect`,
        {
          ...item,
          rcv_qty: this.rcvQty,
          expired_date: this.expiredDate || item.expired_date,
          lot_no: this.lotNo || item.lot_no,
          defect_reason_code: this.defectReasonCode || null
        },
        null, null,
        () => { success = true },
        (err) => { errMsg = err?.msg || err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || '불량 처리 실패' }
      )

      if (success) {
        await this._loadReceivingItems(this.currentReceiving.id)
        this._showFeedback(`불량 처리 완료 (${this.completedCount}/${this.totalCount})`, 'success')
        if (this.completedCount >= this.totalCount) {
          await this._onAllItemsCompleted()
        } else {
          this._setInitialRcvQty()
        }
      } else if (errMsg) {
        this._showFeedback(errMsg, 'error')
      }

    } catch (error) {
      this._showFeedback(error.message || '불량 처리 실패', 'error')

    } finally {
      this.processing = false
    }
  }

  /** 입고 마감 API 호출 — 전체 완료 처리 */
  async _closeReceiving() {
    if (!this.currentReceiving) return

    const remaining = this.receivingItems.filter(i => i.status !== 'END' && i.status !== 'CANCEL' && i.status !== 'BAD' && i.status !== 'SHORT')
    if (remaining.length > 0) {
      const confirmed = await this._confirmDialog(`미완료 항목 ${remaining.length}건이 있습니다. 입고 작업을 완료하시겠습니까?`)
      if (!confirmed) return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost(`inbound_trx/receiving_orders/${this.currentReceiving.id}/close`, {}, null, null, (res) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: '입고 마감 완료' }
        }))
        this.mode = 'complete'

      }, (err) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'error', message: err?.msg || '입고 마감 처리에 실패했습니다' }
        }))
      })

    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '입고 마감 처리에 실패했습니다' }
      }))

    } finally {
      this.processing = false
    }
  }

  /** 모든 항목 완료 시 마감 처리 — 최종 확인 후 마감 */
  async _onAllItemsCompleted() {
    const totalRcvQty = this.receivingItems.reduce((s, i) => s + (i.rcv_qty || 0), 0)
    const confirmed = await this._confirmDialog(`모든 항목(${this.totalCount}건, 총 ${totalRcvQty}개) 입고 완료.\n마감 처리하시겠습니까?`)
    if (!confirmed) return
    await this._closeReceiving()
  }

  /** 요약 카드 필터 토글 — 동일 카드 재클릭 시 전체(ALL)로 복귀 */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? 'ALL' : status
  }

  /** 목록 새로고침 */
  async _refresh() {
    await this._loadTaskList()
  }

  /** 목록 화면으로 복귀 */
  async _goBack() {
    this.mode = 'list'
    this.currentReceiving = null
    this.receivingItems = []
    this.currentItemIndex = -1
    this.lastFeedback = null
    this.barcodeScanned = false
    this.rcvQty = 0
    this.itemsLoading = false
    await this._loadTaskList()
  }

  /** 다음 입고 작업 자동 선택 */
  async _selectNextTask() {
    await this._loadTaskList()
    const next = this.taskList.find(t => t.status === 'READY')
    if (next) {
      this._selectReceiving(next)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '대기 중인 입고 작업이 없습니다' }
      }))
      this._goBack()
    }
  }

  /** 탭 목록에서 항목 직접 선택 — 입력 필드 및 바코드 스캔 상태 초기화 */
  _selectItem(idx) {
    this.currentItemIndex = idx
    this._setInitialRcvQty()
  }

  /** 다음 미완료 항목으로 인덱스 이동 */
  _moveToNextItem() {
    const nextIdx = this.receivingItems.findIndex(i => i.status !== 'END' && i.status !== 'CANCEL' && i.status !== 'BAD' && i.status !== 'SHORT')
    this.currentItemIndex = nextIdx
  }

  /** 현재 항목 기준으로 입력 필드 초기값 설정 — 항목 전환 시 바코드 스캔 상태 초기화 */
  _setInitialRcvQty() {
    const currentItem = this.currentItemIndex >= 0 ? this.receivingItems[this.currentItemIndex] : null
    this.rcvQty = currentItem ? (currentItem.rcv_exp_qty || 1) : 0
    this.defectReasonCode = ''
    this.expiredDate = currentItem?.expired_date || ''
    this.lotNo = currentItem?.lot_no || ''
    this.barcodeScanned = false
  }

  /**
   * 입고수량 설정 — 음수만 방지하고 예정수량 초과(오버수량) 입력은 허용한다.
   * (현장: 예정 1000개인데 1100개가 들어오는 경우가 있어 초과 입고를 허용)
   * @param {number} qty - 입력된 입고수량
   */
  _setRcvQty(qty) {
    this.rcvQty = Math.max(0, qty)
  }

  /** 스캔 일시정지 — 날짜 선택 등 팝업/포커스 입력 중 스캔 오인식 방지 */
  _pauseScan() {
    document.dispatchEvent(new CustomEvent('barcode-listener-pause'))
  }

  /** 스캔 재개 */
  _resumeScan() {
    document.dispatchEvent(new CustomEvent('barcode-listener-resume'))
  }

  /**
   * 확인 팝업 표시 — 팝업이 떠 있는 동안 스캔(및 capture 재포커스)을 일시정지하여
   * barcode-listener가 모달 다이얼로그의 포커스를 가로채 팝업이 즉시 닫히는 충돌을 방지한다.
   * @param {string} message - 확인 메시지
   * @returns {Promise<boolean>} 사용자가 확인했으면 true
   */
  async _confirmDialog(message) {
    this._pauseScan()
    try {
      return await UiUtil.showAlertPopup('label.confirm', message, 'question', 'confirm', 'cancel')
    } finally {
      // 팝업 닫힌 직후 잔여 포커스 이벤트가 정리될 시간을 두고 스캔 재개
      setTimeout(() => this._resumeScan(), 100)
    }
  }

  /**
   * 재고 바코드 라벨 인쇄 — 완료 항목의 재고 라벨 출력
   * 입고 완료 항목은 loc_cd가 없으므로 barcode로 재고(inventory)를 조회해 로케이션을 확보한다.
   * 모바일: PDF를 새 탭에서 열어 인쇄 / PC: 라벨 미리보기 팝업
   * @param {object} item - 완료된 입고 항목 (barcode 사용)
   */
  async _printBarcode(item) {
    if (!item.barcode) return
    try {
      // barcode로 재고 조회 — find_by는 결과 없을 때 빈 응답(JSON 파싱 오류)이라 목록 검색 사용
      const comCd = this.currentReceiving?.com_cd
      const whCd = this.currentReceiving?.wh_cd
      const inventory = await ServiceUtil.restGet(`inventories/find_by?com_cd=${encodeURIComponent(comCd)}&wh_cd=${encodeURIComponent(whCd)}&barcode=${encodeURIComponent(item.barcode)}&loc_cd=${encodeURIComponent('_RCV_WAIT_')}`)
      // 재고 조회 실패 시 리턴
      if (!inventory || !inventory.id) {
        this._showFeedback('입고 대기 존에 적치 대기 중인 재고가 없습니다.', 'error')
        return
      }

      const isMobile = 'ontouchstart' in window
      if (isMobile) {
        const res = await operatoGet(`inventories/${inventory.id}/download_barcode`, {}, false)
        const data = await res.arrayBuffer()
        const file = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
        PrintUtil.openPdfInNewTab(file)
      } else {
        MetaApi.openDynamicPopup(TermsUtil.tMenu('InventoryBarcode'), {
          module: 'metapage',
          import: 'pages/basic-pdf-element.js',
          tagname: 'basic-pdf-element',
          menu: 'InventoryBarcode',
          size: 'large',
          title_field: 'name'
        }, inventory, inventory.id, null)
      }
    } catch (err) {
      console.warn('재고 라벨 인쇄 실패:', err)
      this._showFeedback(TermsUtil.tText('print_failed') || '라벨 인쇄 중 오류가 발생했습니다', 'error')
    }
  }

  /**
   * 입고 지시 전체 재고 바코드 라벨 일괄 인쇄
   * 백엔드에서 rcv_no로 생성된 모든 inventories를 조회하여 MULTI_BARCODE_SHEET PDF로 출력
   */
  async _printBarcodeSheet() {
    if (!this.currentReceiving?.id) return
    try {
      const res = await operatoGet(`inbound_trx/receiving_orders/${this.currentReceiving.id}/download_barcode_sheets`, {}, false)
      const data = await res.arrayBuffer()
      const file = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      PrintUtil.openPdfInNewTab(file)
    } catch (err) {
      console.warn('바코드 시트 인쇄 실패:', err)
      this._showFeedback(err.message || '바코드 라벨 PDF 생성에 실패했습니다', 'error')
    }
  }

  /** 피드백 메시지 표시 */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }

}
