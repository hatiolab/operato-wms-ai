import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { openPopup } from '@operato/layout'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

import './packing-order-detail'

/**
 * 풀필먼트 검수/포장 PC 화면
 *
 * 2패널 레이아웃:
 * - 좌측: CREATED / IN_PROGRESS 상태 포장 주문 목록 (필터/검색)
 * - 우측: 검수 작업 → 포장/운송장 → 출고 확정
 *
 * 작업 흐름:
 * 1. 좌측에서 포장 주문 선택 (카드 클릭 또는 바코드 스캔)
 * 2. 우측 검수: 바코드 스캔 → 항목 매칭 → 검수 확인 (수량 1이면 자동)
 * 3. 전체 검수 완료 → 포장 정보 + 운송장 입력
 * 4. 출고 확정 → 배송 라벨/거래명세서 출력
 *
 * 바코드 입력: USB 바코드 스캐너 (키보드 에뮬레이션)
 */
class FulfillmentPackingPc extends localize(i18next)(PageView) {
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

        /* ===== 포장 주문 카드 ===== */
        .order-card {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 6px;
          border: 1px solid #F0F0F0;
          border-left: 3px solid #FF9800;
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

        .order-card.completed {
          border-left-color: #4CAF50;
          opacity: 0.7;
        }

        .order-card.urgent {
          border-left-color: #F44336;
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

        /* ===== 바코드 입력 영역 ===== */
        .barcode-area {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 16px;
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

        /* ===== 검수 항목 테이블 ===== */
        .inspection-table-wrap {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 16px;
        }

        .inspection-table {
          width: 100%;
          border-collapse: collapse;
        }

        .inspection-table th {
          background: var(--md-sys-color-surface-variant, #F5F5F5);
          padding: 8px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
        }

        .inspection-table td {
          padding: 8px 12px;
          font-size: 13px;
          border-bottom: 1px solid #F0F0F0;
          color: var(--md-sys-color-on-surface, #424242);
        }

        .inspection-table tr.completed {
          background: #E8F5E9;
        }

        .inspection-table tr.completed td {
          color: #9E9E9E;
        }

        .inspection-table tr.current {
          background: #FFF3E0;
          font-weight: 600;
          border-left: 3px solid #FF9800;
        }

        .inspection-table tr:hover:not(.completed) {
          background: var(--md-sys-color-surface-variant, #F5F5F5);
        }

        .inspection-table .col-num { width: 40px; text-align: center; }
        .inspection-table .col-sku { width: 120px; font-family: 'Courier New', monospace; }
        .inspection-table .col-lot { width: 100px; }
        .inspection-table .col-exp { width: 100px; }
        .inspection-table .col-qty { width: 100px; text-align: right; font-variant-numeric: tabular-nums; }
        .inspection-table .col-status { width: 40px; text-align: center; font-size: 16px; }

        /* ===== 현재 스캔 대상 패널 ===== */
        .current-item-panel {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 16px;
          border-left: 4px solid #FF9800;
        }

        .current-item-panel .item-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .current-item-panel .sku-code {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          font-size: 15px;
          color: var(--md-sys-color-on-surface, #212121);
        }

        .current-item-panel .sku-name {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #616161);
        }

        .current-item-panel .item-detail {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #757575);
          margin-bottom: 12px;
        }

        .current-item-panel .qty-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .current-item-panel .qty-row label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
        }

        .current-item-panel .qty-row input {
          width: 80px;
          padding: 6px 10px;
          font-size: 15px;
          border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          text-align: center;
          outline: none;
        }

        .current-item-panel .qty-row input:focus {
          border-color: var(--md-sys-color-primary, #2196F3);
        }

        .current-item-panel .qty-row .unit {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #757575);
        }

        .current-item-panel .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 12px;
        }

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

        /* ===== 포장/운송장 영역 ===== */
        .packing-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .info-card {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }

        .info-card h4 {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #616161);
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-card .info-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
        }

        .info-card .info-row .label {
          color: var(--md-sys-color-on-surface-variant, #757575);
        }

        .info-card .info-row .value {
          color: var(--md-sys-color-on-surface, #212121);
          font-weight: 500;
        }

        .packing-form {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 16px;
        }

        .packing-form h4 {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #616161);
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          align-items: center;
        }

        .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          margin-bottom: 4px;
        }

        .form-group select,
        .form-group input {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          box-sizing: border-box;
          outline: none;
          background: var(--md-sys-color-surface, white);
        }

        .form-group select:focus,
        .form-group input:focus {
          border-color: var(--md-sys-color-primary, #2196F3);
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.12);
        }

        .tracking-area {
          background: var(--md-sys-color-surface, white);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 16px;
        }

        .tracking-area h4 {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #616161);
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tracking-area input {
          width: 100%;
          padding: 10px 14px;
          font-size: 15px;
          font-family: 'Courier New', monospace;
          border: 2px solid var(--md-sys-color-outline-variant, #E0E0E0);
          border-radius: 6px;
          box-sizing: border-box;
          outline: none;
        }

        .tracking-area input:focus {
          border-color: var(--md-sys-color-primary, #2196F3);
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.15);
        }

        /* ===== 버튼 ===== */
        .btn-release {
          width: 100%;
          padding: 12px 24px;
          background: linear-gradient(135deg, #4CAF50, #2E7D32);
          color: white;
          font-size: 15px;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
          margin-bottom: 16px;
        }

        .btn-release:hover {
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .btn-release:disabled {
          background: #BDBDBD;
          box-shadow: none;
          cursor: default;
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
          0%   { opacity: 0; transform: translateX(100px); }
          10%  { opacity: 1; transform: translateX(0); }
          85%  { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(100px); }
        }

        /* ===== 로딩 ===== */
        .loading-text {
          text-align: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #757575);
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      loading: Boolean,
      rightPanelMode: String,
      packingOrders: Array,
      filterStatus: String,
      searchKeyword: String,
      selectedOrder: Object,
      packingItems: Array,
      deliveryInfo: Object,
      currentItemIndex: Number,
      completedCount: Number,
      totalCount: Number,
      lastScannedItem: Object,
      boxType: String,
      boxCount: Number,
      boxWeight: Number,
      trackingNo: String,
      feedbackMsg: String,
      feedbackType: String,
      startTime: Number
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.loading = true
    this.rightPanelMode = 'empty'
    this.packingOrders = []
    this.filterStatus = 'ALL'
    this.searchKeyword = ''
    this.selectedOrder = null
    this.packingItems = []
    this.deliveryInfo = null
    this.currentItemIndex = -1
    this.completedCount = 0
    this.totalCount = 0
    this.lastScannedItem = null
    this.boxType = 'SMALL'
    this.boxCount = 1
    this.boxWeight = 0
    this.trackingNo = ''
    this.feedbackMsg = ''
    this.feedbackType = ''
    this.startTime = 0
    this._keyHandler = null
  }

  /** 페이지 컨텍스트 반환 - 브라우저 타이틀 등에 사용 */
  get context() {
    return {
      title: TermsUtil.tMenu('FulfillmentPackingPc')
    }
  }

  /* ==============================================================
   * 렌더링
   * ============================================================== */

  /** 화면 렌더링 - 헤더, 좌우 패널, 상태바 출력 */
  render() {
    return html`
      <div class="page-header">
        <h2>${TermsUtil.tMenu('FulfillmentPackingPc')}</h2>
        <div class="header-actions">
          <button class="btn btn-outline" @click="${this._refresh}">${TermsUtil.tButton('refresh')}</button>
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
            <span class="stat-value">${this.packingOrders.filter(o => o.status === 'COMPLETED').length}건</span>
          </span>
          <span>
            <span class="stat-label">대기</span>
            <span class="stat-value">${this.packingOrders.filter(o => o.status === 'CREATED' || o.status === 'IN_PROGRESS').length}건</span>
          </span>
          <span>
            <span class="stat-label">전체</span>
            <span class="stat-value">${this.packingOrders.length}건</span>
          </span>
        </div>
        <!--span>${new Date().toLocaleTimeString('ko-KR')}</span-->
      </div>

      ${this.feedbackMsg ? html`
        <div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>
      ` : ''}
    `
  }

  /* ===== 좌측 패널 ===== */

  /** 좌측 패널 렌더링 - 검색, 필터, 포장 주문 카드 목록 */
  _renderLeftPanel() {
    const filtered = this._getFilteredOrders()

    return html`
      <div class="left-panel">
        <div class="search-area">
          <input
            type="text"
            placeholder="포장번호 또는 고객명 검색"
            .value="${this.searchKeyword}"
            @input="${e => { this.searchKeyword = e.target.value }}"
          />
        </div>

        <div class="filter-chips">
          ${this._renderFilterChip('ALL', '전체', this.packingOrders.length)}
          ${this._renderFilterChip('IN_PROGRESS', '대기', this.packingOrders.filter(o => o.status === 'CREATED' || o.status === 'IN_PROGRESS').length)}
          ${this._renderFilterChip('COMPLETED', '완료', this.packingOrders.filter(o => o.status === 'COMPLETED').length)}
        </div>

        <div class="order-list">
          <div class="order-list-header">검수/포장 대기: ${filtered.filter(o => o.status === 'CREATED' || o.status === 'IN_PROGRESS').length}건</div>
          ${filtered.length === 0
        ? html`<div class="loading-text">포장 주문이 없습니다</div>`
        : filtered.map(order => this._renderOrderCard(order))
      }
        </div>
      </div>
    `
  }

  /** 필터 칩 렌더링 - 상태별 포장 주문 필터링 버튼 */
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

  /** 포장 주문 카드 렌더링 - 포장번호, 고객명, 진행률 표시 */
  _renderOrderCard(order) {
    const isSelected = this.selectedOrder && this.selectedOrder.id === order.id
    const isCompleted = order.status != 'CREATED' && order.status != 'IN_PROGRESS'
    const customerNm = order.cust_nm || ''
    const itemCount = order.total_items || 0
    const totalQty = order.total_qty || 0
    const progressPct = order.total_items > 0 ? Math.round((order.packed_qty / order.total_items) * 100) : 0

    return html`
      <div
        class="order-card ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}"
        @click="${() => this._onSelectOrder(order)}"
      >
        <div class="order-no">포장 번호 : ${order.pack_order_no || '-'}</div>
        <div class="order-no">출고 번호 : ${order.shipment_no || '-'}</div>
        <div class="meta">${customerNm}${itemCount ? ` | ${itemCount}종 ${totalQty}EA` : ''}</div>
        ${progressPct > 0 && progressPct < 100 ? html`
          <div class="progress-mini">
            <div class="progress-mini-fill" style="width: ${progressPct}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /* ===== 우측 패널 ===== */

  /** 우측 패널 렌더링 - 모드에 따라 빈 화면/검수/포장/완료 화면 선택 */
  _renderRightPanel() {
    switch (this.rightPanelMode) {
      case 'inspection':
        return this._renderInspectionPanel()
      case 'packing':
        return this._renderPackingPanel()
      case 'complete':
        return this._renderCompletePanel()
      default:
        return this._renderEmptyPanel()
    }
  }

  /** 빈 상태 패널 렌더링 - 포장 주문 미선택 시 안내 메시지 */
  _renderEmptyPanel() {
    return html`
      <div class="right-panel">
        <div class="empty-panel">
          <span class="icon">📦</span>
          <span class="message">좌측 목록에서 포장 주문을 선택하세요</span>
          <span class="sub">또는 포장번호를 스캔하세요</span>
          <input
            type="text"
            placeholder="포장번호 스캔"
            @keydown="${e => { if (e.key === 'Enter') this._onScanPackingOrder(e.target.value); e.target.value = '' }}"
          />
        </div>
      </div>
    `
  }

  /** 검수 패널 렌더링 - 바코드 스캔, 검수 항목 테이블, 진행률 표시 */
  _renderInspectionPanel() {
    const order = this.selectedOrder
    if (!order) return this._renderEmptyPanel()

    const progressPct = this.totalCount > 0 ? Math.round((this.completedCount / this.totalCount) * 100) : 0
    const currentItem = this.packingItems[this.currentItemIndex]

    return html`
      <div class="right-panel">
        <div class="right-panel-header">
          <div class="order-info">
            포장 번호 : ${order.pack_order_no} (주문번호 : ${order.shipment_no})
            <span>${order.cust_nm || ''}</span>
          </div>
          <button class="btn-close" @click="${this._closeWork}">닫기</button>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${this.completedCount}/${this.totalCount} 완료 (${progressPct}%)</div>

        <div class="right-panel-content">
          <!-- 바코드 스캔 영역 -->
          <div class="barcode-area">
            <label>바코드 스캔</label>
            <input
              id="barcodeInput"
              type="text"
              placeholder="바코드를 스캔하세요"
              @keydown="${this._onBarcodeInput}"
              autofocus
            />
            ${this.lastScannedItem ? html`
              <div class="last-scan">
                마지막 스캔:
                <span class="${this.lastScannedItem.success ? 'success' : 'error'}">
                  ${this.lastScannedItem.message}
                </span>
              </div>
            ` : ''}
          </div>

          <!-- 검수 항목 테이블 -->
          <div class="inspection-table-wrap">
            <table class="inspection-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-sku">상품 코드</th>
                  <th>상품명</th>
                  <th class="col-lot">LOT</th>
                  <th class="col-exp">유통기한</th>
                  <th class="col-qty">검수/수량</th>
                  <th class="col-status">상태</th>
                </tr>
              </thead>
              <tbody>
                ${this.packingItems.map((item, idx) => {
      const isCompleted = item.status === 'COMPLETED'
      const isCurrent = idx === this.currentItemIndex && !isCompleted

      return html`
                    <tr class="${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                      <td class="col-num">${idx + 1}</td>
                      <td class="col-sku">${item.sku_cd || item.product_cd || '-'}</td>
                      <td>${item.sku_nm || item.product_nm || '-'}</td>
                      <td class="col-lot">${item.lot_no || '-'}</td>
                      <td class="col-exp">${item.expired_date ? item.expired_date.substring(0, 10) : '-'}</td>
                      <td class="col-qty">${item.insp_qty || 0} / ${item.pack_qty || item.order_qty || 0}</td>
                      <td class="col-status">${isCompleted ? '✅' : isCurrent ? '→' : '☐'}</td>
                    </tr>
                  `
    })}
              </tbody>
            </table>
          </div>

          <!-- 현재 스캔 대상 패널 -->
          ${currentItem && currentItem.status !== 'COMPLETED' ? html`
            <div class="current-item-panel">
              <div class="item-header">
                <span class="sku-code">상품 : ${currentItem.sku_cd || currentItem.product_cd || '-'}</span>
                <span class="sku-name">상품명 : ${currentItem.sku_nm || currentItem.product_nm || '-'}</span>
              </div>
              ${currentItem.lot_no || currentItem.expired_date ? html`
                <div class="item-detail">
                  ${currentItem.lot_no ? `LOT: ${currentItem.lot_no}` : ''}
                  ${currentItem.lot_no && currentItem.expired_date ? ' | ' : ''}
                  ${currentItem.expired_date ? `유통기한: ${currentItem.expired_date.substring(0, 10)}` : ''}
                </div>
              ` : ''}
              <div class="qty-row">
                <label>주문 수량: ${currentItem.pack_qty || currentItem.order_qty || 0} EA</label>
                <span style="margin-left: auto">검수 수량: <strong>${currentItem.insp_qty || 0}</strong> / ${currentItem.pack_qty || currentItem.order_qty || 0} EA</span>
              </div>
              <div class="actions">
                <button class="btn-confirm" @click="${this._confirmInspection}">검수 완료</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  /* ===== 포장/운송장 화면 ===== */

  /** 포장 패널 렌더링 - 포장 정보 입력, 운송장 등록, 출고 확정 */
  _renderPackingPanel() {
    const order = this.selectedOrder
    if (!order) return this._renderEmptyPanel()

    const elapsed = this._formatElapsed(Date.now() - this.startTime)
    const canRelease = this.trackingNo.trim().length > 0

    return html`
      <div class="right-panel">
        <div class="right-panel-header">
          <div class="order-info">
            ${order.pack_order_no}
            <span>${order.cust_nm || ''}</span>
          </div>
          <button class="btn-close" @click="${this._closeWork}">닫기</button>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" style="width: 100%"></div>
        </div>
        <div class="progress-text">${this.totalCount}/${this.totalCount} 검수 완료 (100%)</div>

        <div class="right-panel-content">
          <!-- 요약 + 배송 정보 -->
          <div class="packing-section">
            <div class="info-card">
              <h4>검수/포장 완료 요약</h4>
              <div class="info-row"><span class="label">총 품목</span><span class="value">${this.totalCount}종</span></div>
              <div class="info-row"><span class="label">총 수량</span><span class="value">${this.packingItems.reduce((s, i) => s + (i.pack_qty || i.order_qty || 0), 0)} EA</span></div>
              <div class="info-row"><span class="label">검수 소요</span><span class="value">${elapsed}</span></div>
              <div class="info-row"><span class="label">전체 일치</span><span class="value" style="color:#4CAF50">✅</span></div>
            </div>
            <div class="info-card">
              <h4>주문 정보</h4>
              <div class="info-row"><span class="label">고객명</span><span class="value">${order.cust_nm || '-'}</span></div>
              <div class="info-row"><span class="label">출고번호</span><span class="value">${order.shipment_no || '-'}</span></div>
              <div class="info-row"><span class="label">포장번호</span><span class="value">${order.pack_order_no || '-'}</span></div>
              <div class="info-row"><span class="label">주문일자</span><span class="value">${order.order_date || '-'}</span></div>
            </div>
          </div>

          <!-- 포장 정보 -->
          <div class="packing-form">
            <h4>포장 정보</h4>
            <div class="form-row">
              <div class="form-group">
                <label>박스 유형</label>
                <select .value="${this.boxType}" @change="${e => { this.boxType = e.target.value }}">
                  <option value="SMALL">소형</option>
                  <option value="MEDIUM">중형</option>
                  <option value="LARGE">대형</option>
                  <option value="XLARGE">특대형</option>
                </select>
              </div>
              <div class="form-group">
                <label>박스 수량</label>
                <input type="number" min="1" .value="${String(this.boxCount)}" @input="${e => { this.boxCount = Number(e.target.value) || 1 }}" />
              </div>
              <div class="form-group">
                <label>박스 중량 (kg)</label>
                <input type="number" min="0" step="0.1" .value="${String(this.boxWeight)}" @input="${e => { this.boxWeight = Number(e.target.value) || 0 }}" />
              </div>
            </div>
          </div>

          <!-- 운송장 등록 -->
          <div class="tracking-area">
            <h4>운송장 등록</h4>
            <input
              id="trackingInput"
              type="text"
              placeholder="운송장번호 스캔 또는 입력"
              .value="${this.trackingNo}"
              @input="${e => { this.trackingNo = e.target.value }}"
              @keydown="${e => { if (e.key === 'Enter') this._confirmRelease() }}"
            />
          </div>

          <!-- 출고 확정 버튼 -->
          <button
            class="btn-release"
            ?disabled="${!canRelease}"
            @click="${this._confirmRelease}"
          >출고 확정</button>
        </div>
      </div>
    `
  }

  /* ===== 완료 화면 ===== */

  /** 완료 패널 렌더링 - 출고 완료 통계, 라벨 출력, 다음 검수 시작 */
  _renderCompletePanel() {
    const order = this.selectedOrder
    if (!order) return this._renderEmptyPanel()

    const elapsed = this._formatElapsed(Date.now() - this.startTime)

    return html`
      <div class="right-panel">
        <div class="right-panel-header">
          <div class="order-info">${order.pack_order_no}</div>
          <button class="btn-close" @click="${this._closeWork}">닫기</button>
        </div>

        <div class="right-panel-content">
          <div class="complete-panel">
            <div class="check-icon">✅</div>
            <h3>출고 완료!</h3>

            <div class="complete-stats">
              <div class="stat-row"><span class="label">포장 주문</span><span class="value">${order.pack_order_no}</span></div>
              <div class="stat-row"><span class="label">고객</span><span class="value">${order.cust_nm || '-'}</span></div>
              <div class="stat-row"><span class="label">총 품목 / 수량</span><span class="value">${this.totalCount}종 / ${this.packingItems.reduce((s, i) => s + (i.pack_qty || i.order_qty || 0), 0)} EA</span></div>
              <div class="stat-row"><span class="label">박스</span><span class="value">${this._boxTypeLabel(this.boxType)} × ${this.boxCount}개</span></div>
              <div class="stat-row"><span class="label">운송장</span><span class="value">${this.trackingNo}</span></div>
              <div class="stat-row"><span class="label">소요 시간</span><span class="value">${elapsed}</span></div>
            </div>

            <div class="complete-actions">
              <button class="btn-action" @click="${this._popupPackingDetail}">상세</button>
              <button class="btn-action" @click="${this._printPackingLabel}">배송 라벨 출력</button>
              <button class="btn-action primary" @click="${this._startNextInspection}">다음 검수 시작 →</button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /* ==============================================================
   * 생명주기
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

  /** 페이지 해제 시 키보드 단축키 이벤트 리스너 제거 */
  pageDisposed(lifecycle) {
    this._removeKeyboardShortcuts()
  }

  /* ==============================================================
   * 데이터 조회
   * ============================================================== */

  /** 포장 주문 목록 새로고침 - 당일 INSPECTED/COMPLETED 주문 조회 */
  async _refresh() {
    try {
      this.loading = this.packingOrders.length === 0

      const today = new Date().toISOString().substring(0, 10)
      const [waitingOrders, completedOrders] = await Promise.all([
        ServiceUtil.restGet(`ful_trx/packing_orders/todo?order_date=${today}`).catch(() => []),
        ServiceUtil.restGet(`ful_trx/packing_orders/done?order_date=${today}`).catch(() => []),
      ])

      const allOrders = [...(waitingOrders || []), ...(completedOrders || [])]

      // 항목 수/수량 계산을 위해 항목도 조회
      const itemResults = await Promise.all(
        allOrders.map(o =>
          ServiceUtil.restGet(`ful_trx/packing_order_items?packing_order_id=${o.id}`).catch(() => [])
        )
      )

      allOrders.forEach((order, i) => {
        order._progressPct = order.total_items > 0 ? Math.round((order.packed_qty / order.total_items) * 100) : 0
      })

      this.packingOrders = allOrders
      this.loading = false
    } catch (err) {
      console.error('포장 주문 조회 실패:', err)
      this.loading = false
    }
  }

  /** 포장 항목 조회 - 포장 주문 ID로 검수 항목 목록 로드 */
  async _loadPackingItems(packingOrderId) {
    try {
      const items = await ServiceUtil.restGet(`ful_trx/packing_order_items?packing_order_id=${packingOrderId}`)
      this.packingItems = Array.isArray(items) ? items : []
      this.totalCount = this.packingItems.length
      this.completedCount = this.packingItems.filter(i => i.status === 'COMPLETED').length
      this._moveToNextItem()
    } catch (err) {
      console.error('포장 항목 조회 실패:', err)
      this.packingItems = []
    }
  }

  /* ==============================================================
   * 좌측 패널: 필터/검색/선택
   * ============================================================== */

  /** 필터 및 검색어 적용하여 포장 주문 목록 반환 */
  _getFilteredOrders() {
    let orders = this.packingOrders

    if (this.filterStatus !== 'ALL') {
      orders = orders.filter(o => o.status === this.filterStatus)
    }

    if (this.searchKeyword) {
      const kw = this.searchKeyword.toLowerCase()
      orders = orders.filter(o =>
        (o.pack_order_no || '').toLowerCase().includes(kw) ||
        (o.cust_nm || '').toLowerCase().includes(kw)
      )
    }

    return orders
  }

  /** 포장 주문 선택 - 검수 작업 시작 또는 완료 건 조회 */
  async _onSelectOrder(order) {
    if (order.status === 'COMPLETED') {
      // 완료 건은 읽기 전용으로 보기
      this.selectedOrder = order
      this.rightPanelMode = 'complete'
      await this._loadPackingItems(order.id)
      return
    }

    // CREATED 상태인 경우 IN_PROGRESS로 전환
    if (order.status === 'CREATED') {
      try {
        await ServiceUtil.restPost(`ful_trx/packing_orders/${order.id}/start`, {})
        order.status = 'IN_PROGRESS'
      } catch (err) {
        console.error('포장 주문 시작 실패:', err)
        this._showFeedback('error', '포장 주문 시작 처리 중 오류가 발생했습니다')
        return
      }
    }

    this.selectedOrder = order
    this.rightPanelMode = 'inspection'
    this.startTime = Date.now()
    this.lastScannedItem = null

    await this._loadPackingItems(order.id)

    this._recommendBoxType()

    // 바코드 입력에 포커스
    await this.updateComplete
    const input = this.shadowRoot?.getElementById('barcodeInput')
    if (input) input.focus()
  }

  /** 포장번호 바코드 스캔 - 일치하는 포장 주문 자동 선택 */
  async _onScanPackingOrder(barcode) {
    if (!barcode || !barcode.trim()) return
    const order = this.packingOrders.find(o => o.pack_order_no === barcode.trim())
    if (order) {
      await this._onSelectOrder(order)
    } else {
      this._showFeedback('error', '해당 포장 주문을 찾을 수 없습니다')
    }
  }

  /* ==============================================================
   * 우측 패널: 검수 작업
   * ============================================================== */

  /** 바코드 입력 처리 - Enter 키 입력 시 항목 매칭 및 검수 수량 자동 1 증가 */
  _onBarcodeInput(e) {
    if (e.key !== 'Enter') return
    const barcode = e.target.value.trim()
    if (!barcode) return

    // 미완료 항목 중 바코드 매칭
    const matchIndex = this.packingItems.findIndex(
      (item, idx) => item.status !== 'COMPLETED' && (item.barcode === barcode || item.sku_cd === barcode)
    )

    if (matchIndex >= 0) {
      const item = this.packingItems[matchIndex]
      const orderQty = item.pack_qty || item.order_qty || 1
      const currentInspQty = item.insp_qty || 0

      // 이미 검수 수량이 주문 수량 이상이면 추가 스캔 차단
      if (currentInspQty >= orderQty) {
        this.lastScannedItem = {
          success: false,
          message: `${item.sku_cd} — 이미 검수가 완료된 상품입니다 (${currentInspQty}/${orderQty})`
        }
        this._showFeedback('warning', `${item.sku_cd} 이미 검수 완료 (${currentInspQty}/${orderQty})`)
        e.target.value = ''
        e.target.focus()
        return
      }

      this.currentItemIndex = matchIndex

      // 검수 수량 1 증가
      const newInspQty = currentInspQty + 1

      // 로컬 상태 업데이트
      this.packingItems = this.packingItems.map((it, idx) =>
        idx === matchIndex ? { ...it, insp_qty: newInspQty } : it
      )

      this.lastScannedItem = {
        success: true,
        message: `${item.sku_cd} (${item.sku_nm}) — ${newInspQty}/${orderQty} ✅`
      }

      // 주문 수량에 도달하면 자동 검수 완료
      if (newInspQty >= orderQty) {
        this._confirmInspection()
      } else {
        this._showFeedback('success', `${item.sku_cd} 스캔 완료 (${newInspQty}/${orderQty})`)
      }
    } else {
      this.lastScannedItem = {
        success: false,
        message: `바코드 "${barcode}" — 일치하는 상품이 없습니다`
      }
      this._showFeedback('error', '일치하는 상품이 없습니다')
    }

    e.target.value = ''
    e.target.focus()
  }

  /** 검수 확인 - 현재 항목 검수 완료 처리 및 다음 항목으로 이동 */
  async _confirmInspection() {
    const item = this.packingItems[this.currentItemIndex]
    if (!item) return

    const confirmQty = item.insp_qty || (item.pack_qty || item.order_qty || 1)

    try {
      await ServiceUtil.restPost(
        `ful_trx/packing_order_items/${item.id}/finish`,
        {
          barcode: item.barcode || '',
          packQty: confirmQty,
          lotNo: item.lot_no || '',
          expiredDate: item.expired_date || ''
        }
      )

      // 로컬 상태 업데이트
      this.packingItems = this.packingItems.map((it, idx) =>
        idx === this.currentItemIndex ? { ...it, status: 'COMPLETED' } : it
      )
      this.completedCount = this.packingItems.filter(i => i.status === 'COMPLETED').length

      this._showFeedback('success', `검수 완료 (${this.completedCount}/${this.totalCount})`)

      // 전체 완료 확인
      if (this.completedCount >= this.totalCount) {
        this._onInspectionComplete()
      } else {
        this._moveToNextItem()
        // 바코드 입력에 포커스
        await this.updateComplete
        const input = this.shadowRoot?.getElementById('barcodeInput')
        if (input) input.focus()
      }
    } catch (err) {
      console.error('검수 확인 실패:', err)
      this._showFeedback('error', '검수 처리 중 오류가 발생했습니다')
    }
  }

  /** 다음 미완료 항목으로 이동 - 현재 인덱스 이후 또는 처음부터 검색 */
  _moveToNextItem() {
    const nextIdx = this.packingItems.findIndex(
      (item, idx) => idx > this.currentItemIndex && item.status !== 'COMPLETED'
    )

    if (nextIdx >= 0) {
      this.currentItemIndex = nextIdx
    } else {
      // 앞쪽에서 미완료 항목 찾기
      const firstIdx = this.packingItems.findIndex(item => item.status !== 'COMPLETED')
      this.currentItemIndex = firstIdx >= 0 ? firstIdx : -1
    }
  }

  /** 검수 완료 처리 - 포장 정보 입력 화면으로 전환 */
  _onInspectionComplete() {
    this.rightPanelMode = 'packing'
    this._recommendBoxType()

    // 운송장 입력에 포커스
    setTimeout(async () => {
      await this.updateComplete
      const input = this.shadowRoot?.getElementById('trackingInput')
      if (input) input.focus()
    }, 100)
  }

  /* ==============================================================
   * 우측 패널: 포장/운송장/출고 확정
   * ============================================================== */

  /** 박스 유형 추천 - 총 수량에 따라 박스 크기 자동 선택 */
  _recommendBoxType() {
    const totalQty = this.packingItems.reduce((s, i) => s + (i.pack_qty || i.order_qty || 0), 0)
    if (totalQty <= 3) this.boxType = 'SMALL'
    else if (totalQty <= 10) this.boxType = 'MEDIUM'
    else if (totalQty <= 30) this.boxType = 'LARGE'
    else this.boxType = 'XLARGE'
  }

  /** 출고 확정 - 포장/운송장 정보로 포장 주문 완료 처리 */
  async _confirmRelease() {
    if (!this.trackingNo.trim()) {
      this._showFeedback('warning', '운송장번호를 입력해주세요')
      return
    }

    try {
      await ServiceUtil.restPost(
        `ful_trx/packing_orders/${this.selectedOrder.id}/complete`,
        {
          boxType: this.boxType,
          boxCount: this.boxCount,
          boxWeight: this.boxWeight,
          trackingNo: this.trackingNo.trim()
        }
      )

      this._showFeedback('success', '출고가 완료되었습니다')
      this.rightPanelMode = 'complete'

      // 좌측 목록 갱신
      this._refresh()
    } catch (err) {
      console.error('출고 확정 실패:', err)
      this._showFeedback('error', '출고 확정 중 오류가 발생했습니다')
    }
  }

  /* ==============================================================
   * 우측 패널: 완료
   * ============================================================== */

  /** 포장 상세 조회 팝업 */
  async _popupPackingDetail() {
    openPopup(
      html`<packing-order-detail
        .packingOrderId="${this.selectedOrder.id}"
        @order-updated="${() => this._refresh()}"
      ></packing-order-detail>`,
      {
        backdrop: true,
        size: 'large',
        title: i18next.t('title.packing_order_detail', { defaultValue: '검수/포장/출하 상세' })
      }
    )
  }

  /** 배송 라벨 출력 요청 - 백엔드 API 호출 */
  async _printPackingLabel() {
    if (!this.selectedOrder) return
    try {
      await ServiceUtil.restPost(`ful_trx/packing_orders/${this.selectedOrder.id}/print_label`, {})
      this._showFeedback('info', '배송 라벨 출력 요청 완료')
    } catch (err) {
      console.error('배송 라벨 출력 실패:', err)
      this._showFeedback('error', '출력 요청 중 오류가 발생했습니다')
    }
  }

  /** 다음 검수 시작 - 대기 중인 다음 포장 주문 자동 선택 */
  _startNextInspection() {
    const nextOrder = this.packingOrders.find(o => (o.status === 'IN_PROGRESS' || o.status === 'CREATED') && (!this.selectedOrder || o.id !== this.selectedOrder.id))
    if (nextOrder) {
      this._onSelectOrder(nextOrder)
    } else {
      this._closeWork()
      this._showFeedback('info', '대기 중인 포장 주문이 없습니다')
    }
  }

  /* ==============================================================
   * 공통
   * ============================================================== */

  /** 작업 닫기 - 우측 패널 초기화 및 빈 화면으로 전환 */
  _closeWork() {
    this.rightPanelMode = 'empty'
    this.selectedOrder = null
    this.packingItems = []
    this.deliveryInfo = null
    this.currentItemIndex = -1
    this.completedCount = 0
    this.totalCount = 0
    this.lastScannedItem = null
    this.trackingNo = ''
  }

  /** 피드백 토스트 메시지 표시 - 2.5초 후 자동 숨김 */
  _showFeedback(type, message) {
    this.feedbackMsg = message
    this.feedbackType = type
    setTimeout(() => {
      this.feedbackMsg = ''
      this.feedbackType = ''
    }, 2500)
  }

  /** 키보드 단축키 설정 - F2/F5/F8/Esc 키 이벤트 리스너 등록 */
  _setupKeyboardShortcuts() {
    this._removeKeyboardShortcuts()
    this._keyHandler = (e) => {
      if (e.key === 'F2') {
        e.preventDefault()
        if (this.rightPanelMode === 'inspection') this._confirmInspection()
      } else if (e.key === 'F5') {
        e.preventDefault()
        this._refresh()
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (this.rightPanelMode === 'packing') this._confirmRelease()
      } else if (e.key === 'Escape') {
        if (this.rightPanelMode !== 'empty') this._closeWork()
      }
    }
    document.addEventListener('keydown', this._keyHandler)
  }

  /** 키보드 단축키 제거 - 이벤트 리스너 해제 */
  _removeKeyboardShortcuts() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler)
      this._keyHandler = null
    }
  }

  /** 경과 시간 포맷 - 밀리초를 "분 초" 형식으로 변환 */
  _formatElapsed(ms) {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}분 ${sec < 10 ? '0' : ''}${sec}초`
  }

  /** 박스 유형 라벨 변환 - 코드값을 한글 표시명으로 변환 */
  _boxTypeLabel(type) {
    const map = { SMALL: '소형', MEDIUM: '중형', LARGE: '대형', XLARGE: '특대형' }
    return map[type] || type || '-'
  }
}

window.customElements.define('fulfillment-packing-pc', FulfillmentPackingPc)
