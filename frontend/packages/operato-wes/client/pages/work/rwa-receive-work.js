import { css, html } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { OxInputBarcode } from '@operato/input'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { voiceService } from './voice-service.js'
import '../../component/entity-label.js'
import '../../component/sku-barcode-input.js'
import '../../component/barcode-listener.js'
import '../../component/numeric-keypad-input.js'

/**
 * RWA 반품 통합 PDA 작업 화면
 *
 * vas-work-page 레이아웃 기준으로 구현:
 * - 주문 선택 화면: 대기 / 작업중 / 완료 요약 카드 + 주문 목록
 * - 작업 화면: 2단계 스텝
 *   - Step 1: 반품 입고  — 항목별 수량 + 로케이션 입력 → POST .../items/{id}/receive
 *   - Step 2: 검수       — 양품/불량 수량, 불량 유형    → POST .../items/{id}/inspect → 즉시 완료
 *
 * 상태 흐름:
 *   APPROVED → RECEIVING → RECEIVED → INSPECTING → COMPLETED / CANCELLED / REJECTED
 */
class RwaReceiveWork extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-background, #f5f5f5);
          overflow: hidden;
          font-family: var(--theme-font, 'Noto Sans KR', sans-serif);
        }

        /* ======================================
         * 상태 요약 카드
         * ====================================== */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 12px 16px 0;
          flex-shrink: 0;
        }

        .summary-card {
          text-align: center;
          padding: 10px 4px;
          border-radius: 12px;
          background: var(--md-sys-color-surface, #fff);
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
          cursor: pointer;
          transition: all .15s;
          border: 2px solid transparent;
        }

        .summary-card[active] {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 6px rgba(25,118,210,.25);
        }

        .summary-card:active { transform: scale(.96); }

        .summary-card .count {
          font-size: 22px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-card .card-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .summary-card.waiting .count  { color: #F57C00; }
        .summary-card.working .count  { color: #1976D2; }
        .summary-card.done    .count  { color: #4CAF50; }

        /* ======================================
         * 주문 목록
         * ====================================== */
        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .order-item {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
          cursor: pointer;
          transition: all .15s;
        }

        .order-item:active { transform: scale(.98); }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .order-no {
          font-size: 15px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
        }

        .order-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          color: #fff;
          background: #9E9E9E;
        }

        .order-badge.APPROVED   { background: #2196F3; }
        .order-badge.RECEIVING  { background: #03A9F4; }
        .order-badge.INSPECTING { background: #9C27B0; }
        .order-badge.INSPECTED  { background: #673AB7; }
        .order-badge.DISPOSING  { background: #FF5722; }
        .order-badge.COMPLETED  { background: #4CAF50; }
        .order-badge.REJECTED   { background: #F44336; }
        .order-badge.CANCELLED  { background: #9E9E9E; }

        .sub-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* ======================================
         * 하단 바코드 스캔 (주문 선택 화면)
         * ====================================== */
        .scan-bottom {
          padding: 8px 16px 12px;
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
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        /* ======================================
         * 작업 화면 공통
         * ====================================== */
        .work-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .work-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--md-sys-color-surface, #fff);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .back-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          font-size: 22px;
          cursor: pointer;
          padding: 0;
          color: var(--md-sys-color-on-surface, #333);
        }

        .work-title {
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
        }

        /* ======================================
         * 스텝 인디케이터
         * ====================================== */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 8px 0;
          flex-shrink: 0;
          background: var(--md-sys-color-surface, #fff);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .step-dot {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: var(--md-sys-color-outline, #bbb);
          transition: all .3s;
        }

        .step-dot.active    { background: var(--md-sys-color-primary, #1976D2); transform: scale(1.1); }
        .step-dot.completed { background: #4CAF50; }

        .step-line {
          width: 40px;
          height: 3px;
          background: var(--md-sys-color-outline, #ddd);
          transition: all .3s;
        }

        .step-line.active { background: #4CAF50; }

        .step-label {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #888);
          text-align: center;
          margin-top: 4px;
        }

        .step-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        /* ======================================
         * 작업 콘텐츠
         * ====================================== */
        .work-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* 상품 바코드 스캔 바 (상품 목록 화면) */
        .scan-bar {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 8px 12px;
          background: var(--md-sys-color-surface, #fff);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }
        .scan-bar .scan-input {
          flex: 1;
          min-width: 0;
        }
        .scan-bar .btn-picker {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 8px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 18px;
          cursor: pointer;
        }
        .scan-bar .btn-picker:active { background: rgba(25,118,210,.1); }

        /* 상품 카드 목록 (상품별 구분) */
        .item-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .item-card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--md-sys-color-surface, #fff);
          border: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          border-left: 4px solid var(--md-sys-color-outline, #bbb);
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        .item-card-row.receive { border-left-color: #FB8C00; }
        .item-card-row.inspect { border-left-color: #1976D2; }
        .item-card-row.done    { border-left-color: #4CAF50; opacity: .85; }
        .item-card-row .ic-main { min-width: 0; }
        .item-card-row .ic-sku {
          font-size: 14px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          margin-right: 6px;
        }
        .item-card-row .ic-nm {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }
        .item-card-row .ic-side {
          flex-shrink: 0;
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .item-card-row .ic-qty { font-size: 13px; font-weight: 600; color: var(--md-sys-color-on-surface, #333); }
        .item-card-row .ic-stage { font-size: 12px; font-weight: 700; }
        .item-card-row .ic-stage.receive { color: #FB8C00; }
        .item-card-row .ic-stage.inspect { color: #1976D2; }
        .item-card-row .ic-stage.done    { color: #4CAF50; }

        /* 입고 화면 — 고정 로케이션 안내 */
        .loc-note {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
          padding: 2px 2px;
        }
        .loc-note strong { color: var(--md-sys-color-on-surface, #222); }

        /* 상품 선택 팝업 (바텀 시트) */
        .picker-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
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
          box-shadow: 0 -4px 20px rgba(0,0,0,.2);
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
        }
        .picker-empty { text-align: center; padding: 24px; color: #999; }
        .picker-item {
          padding: 10px 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          cursor: pointer;
        }
        .picker-item:active { background: var(--md-sys-color-surface-variant, #f0f0f0); }
        .picker-item .pi-nm { font-size: 14px; font-weight: 600; color: var(--md-sys-color-on-surface, #222); }
        .picker-item .pi-sub { font-size: 12px; color: var(--md-sys-color-on-surface-variant, #777); margin-top: 2px; }
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

        .info-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
        }

        .info-card .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          font-size: 14px;
        }

        .info-card .info-row .lbl { color: var(--md-sys-color-on-surface-variant, #666); }
        .info-card .info-row .val { font-weight: 600; color: var(--md-sys-color-on-surface, #222); }

        .item-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
          border-left: 4px solid var(--md-sys-color-primary, #1976D2);
        }

        .item-card .sku-info {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .item-card .qty-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* 항목 진행 현황 리스트 */
        .items-progress {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
        }

        .items-progress .progress-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 8px;
        }

        .progress-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          font-size: 13px;
        }

        .progress-item .sku { color: var(--md-sys-color-on-surface, #333); }
        .progress-item .status-done    { color: #4CAF50; font-weight: 600; }
        .progress-item .status-todo    { color: var(--md-sys-color-on-surface-variant, #999); }
        .progress-item .status-current { color: #1976D2; font-weight: 700; }

        .progress-item.selectable {
          cursor: pointer;
          border-radius: 8px;
          margin: 0 -8px;
          padding: 4px 8px;
          transition: background .1s;
        }
        .progress-item.selectable:active { background: rgba(25,118,210,.08); }

        .progress-item.current-item {
          background: rgba(25,118,210,.08);
          border-radius: 8px;
          margin: 0 -8px;
          padding: 4px 8px;
        }

        /* ======================================
         * 폼 그룹
         * ====================================== */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        .form-group ox-input-barcode {
          --barcodescan-input-font-size: 16px;
          --barcodescan-input-padding: 12px 14px;
          --barcodescan-input-border-radius: 10px;
          --barcodescan-input-border: 1.5px solid var(--md-sys-color-outline-variant, #ccc);
          --barcodescan-input-background: var(--md-sys-color-surface, #fff);
          width: 100%;
          box-sizing: border-box;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 14px;
          border: 1.5px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 10px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface, #222);
          background: var(--md-sys-color-surface, #fff);
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 불량 유형/상세/비고 등 일반 입력 — 타이트하게 (수량 number 입력 제외) */
        .form-group select,
        .form-group input:not([type='number']),
        .form-group textarea {
          padding: 7px 10px;
          font-size: 14px;
        }

        .form-group input[type='number'] {
          font-size: 20px;
          font-weight: 700;
          text-align: center;
        }

        /* 양품 수량 표시 — 불량 수량 키패드 컴포넌트와 높이 맞춤 */
        .form-group input[type='number'].good-qty-field {
          min-height: 32px;
          padding: 0 8px;
          font-size: 18px;
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .qty-row {
          display: flex;
          gap: 12px;
        }

        .qty-row .form-group { flex: 1; }

        /* ======================================
         * 인라인 확인 버튼 (수량 입력 우측)
         * ====================================== */
        .qty-confirm-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .qty-confirm-row .form-group { flex: 1; }

        .btn-confirm-inline {
          flex-shrink: 0;
          height: 46px;
          padding: 0 18px;
          border: none;
          border-radius: 10px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all .15s;
        }

        .btn-confirm-inline:active   { transform: scale(.97); }
        .btn-confirm-inline:disabled { opacity: .5; cursor: not-allowed; }

        /* ======================================
         * 하단 액션 버튼
         * ====================================== */
        .action-bar {
          padding: 8px 12px;
          background: var(--md-sys-color-surface, #fff);
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .action-btn {
          flex: 1;
          min-height: 44px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all .15s;
        }

        .action-btn:active { transform: scale(.97); }
        .action-btn:disabled { opacity: .5; cursor: not-allowed; }

        .action-btn.primary   { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .action-btn.secondary { background: var(--md-sys-color-surface-variant, #eee); color: var(--md-sys-color-on-surface, #333); }
        .action-btn.success   { background: #4CAF50; color: #fff; }
        .action-btn.outline   {
          background: transparent;
          color: var(--md-sys-color-primary, #1976D2);
          border: 2px solid var(--md-sys-color-primary, #1976D2);
        }

        /* ======================================
         * 완료 화면
         * ====================================== */
        .done-card {
          background: #E8F5E9;
          border: 2px solid #4CAF50;
          border-radius: 12px;
          padding: 32px 16px;
          text-align: center;
        }

        .done-card .done-icon  { font-size: 48px; margin-bottom: 12px; }
        .done-card .done-title { font-size: 20px; font-weight: 700; color: #2E7D32; }
        .done-card .done-sub   { font-size: 13px; color: #666; margin-top: 8px; }

        /* ======================================
         * 반품 완료 요약 화면
         * ====================================== */
        .complete-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .complete-header {
          padding: 24px 16px 16px;
          text-align: center;
          background: var(--md-sys-color-surface, #fff);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .complete-header .complete-icon { font-size: 52px; margin-bottom: 8px; }

        .complete-header .complete-title {
          font-size: 20px;
          font-weight: 700;
          color: #2E7D32;
          margin-bottom: 4px;
        }

        .complete-header .complete-rwa-no {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .complete-header .complete-meta {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #888);
          margin-top: 4px;
        }

        .complete-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .complete-section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 6px;
        }

        .complete-item-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
          border-left: 4px solid #4CAF50;
        }

        .complete-item-card .item-sku {
          font-size: 15px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          margin-bottom: 8px;
        }

        .complete-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding: 3px 0;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
        }

        .complete-item-row:last-child { border-bottom: none; }

        .complete-item-row .row-label {
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .complete-item-row .row-val {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #222);
        }

        .complete-item-row .row-val.good   { color: #2E7D32; }
        .complete-item-row .row-val.defect { color: #C62828; }

        /* ======================================
         * 피드백 토스트
         * ====================================== */
        .feedback-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 24px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          z-index: 9999;
          animation: fadeOut 2s forwards;
        }

        .feedback-toast.success { background: #4CAF50; }
        .feedback-toast.error   { background: #F44336; }
        .feedback-toast.warning { background: #FF9800; }

        @keyframes fadeOut {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        /* ======================================
         * 공통 유틸
         * ====================================== */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          color: var(--md-sys-color-on-surface-variant, #999);
          gap: 8px;
        }

        .empty-state .empty-icon { font-size: 40px; opacity: .4; }
        .empty-state .empty-text { font-size: 14px; }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #888);
          font-size: 14px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          margin: 0 0 2px;
        }

        .warn-text {
          color: #F44336;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
        }
      `
    ]
  }

  /** 반응형 속성 정의 */
  static get properties() {
    return {
      loading:          { type: Boolean },
      screen:           { type: String },    // 'order-select' | 'work' | 'complete'
      filterStatus:     { type: String },    // 'WAITING' | 'WORKING' | 'DONE' | null
      orders:           { type: Array },
      selectedOrder:    { type: Object },
      orderItems:       { type: Array },
      currentItemIndex: { type: Number },
      step:             { type: Number },    // 1 | 2
      actionLoading:    { type: Boolean },
      feedbackMsg:      { type: String },
      feedbackType:     { type: String },
      // Step 1 - 입고 폼
      rcvQty:           { type: Number },
      locCd:            { type: String },
      // Step 2 - 검수 폼
      goodQty:          { type: Number },
      defectQty:        { type: Number },
      defectType:       { type: String },
      defectDesc:       { type: String },
      inspRemarks:      { type: String },
      // 기본 RETURN 로케이션
      returnLocCd:          { type: String },
      // Step 1 에서 선택된 아이템 ID
      selectedOrderItemId:  { type: String },
      // Step 2 에서 선택된 아이템 ID
      selectedInspItemId:   { type: String },
      // 주문 진입 시점의 초기 상태 (isDone 판단용 — 작업 중 상태 변경과 구분)
      enteredOrderStatus:   { type: String },
      // 상품 목록 화면 — 상품 선택 팝업 표시 여부
      showItemPicker:       { type: Boolean }
    }
  }

  /** 생성자 */
  constructor() {
    super()
    this.loading = false
    this.screen = 'order-select'
    this.filterStatus = 'WAITING'
    this.orders = []
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = 0
    this.step = 1
    this.actionLoading = false
    this.feedbackMsg = ''
    this.feedbackType = ''
    this.returnLocCd = ''
    this.selectedOrderItemId = ''
    this.selectedInspItemId = ''
    this.enteredOrderStatus = ''
    this.showItemPicker = false
    this._resetForms()
  }

  /** 페이지 컨텍스트 (타이틀) */
  get context() {
    return { title: TermsUtil.tMenu('RwaReceiveWork') }
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  /** 페이지 활성화 시 주문 목록 + RETURN 로케이션 조회 (작업/완료 화면에서는 재조회 안 함) */
  async pageUpdated(changes, lifecycle) {
    if (this.active && this.screen === 'order-select') {
      await Promise.all([
        this._fetchOrders(),
        this._fetchReturnLocation()
      ])
    }
  }

  /** 업데이트 후 — 토스트 표시 시 fadeOut 애니메이션 재생 보장 (동일 DOM 노드 재사용 대응) */
  updated(changed) {
    super.updated?.(changed)
    if (changed.has('feedbackMsg') && this.feedbackMsg) {
      const el = this.renderRoot?.querySelector('.feedback-toast')
      if (el) {
        el.style.animation = 'none'
        void el.offsetWidth // 강제 reflow
        el.style.animation = ''
      }
    }
  }

  /* ============================================================
   * 렌더링 진입점
   * ============================================================ */

  /** 화면 렌더링 — 주문 선택 / 작업 / 완료 화면 분기 */
  render() {
    return html`
      ${this.screen === 'order-select' ? this._renderOrderSelect()
        : this.screen === 'item-list'  ? this._renderItemList()
        : this.screen === 'complete'   ? this._renderCompleteScreen()
        : this._renderWorkScreen()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
    `
  }

  /* ============================================================
   * 주문 선택 화면
   * ============================================================ */

  /** 주문 선택 화면 — 상태 카드 + 주문 목록 + 하단 바코드 스캔 */
  _renderOrderSelect() {
    const WAITING_STATUS = ['APPROVED']
    const WORKING_STATUS = ['RECEIVING', 'RECEIVED', 'INSPECTING', 'INSPECTED', 'DISPOSING', 'DISPOSED']
    const DONE_STATUS    = ['COMPLETED', 'CANCELLED', 'REJECTED']

    const sortOrders = list => [...list].sort((a, b) => {
      const dateA = (a.rwa_req_date || '').slice(0, 10)
      const dateB = (b.rwa_req_date || '').slice(0, 10)
      if (dateB !== dateA) return dateB.localeCompare(dateA)
      return (b.rwa_req_no || '').localeCompare(a.rwa_req_no || '')
    })

    const today = new Date().toISOString().slice(0, 10)
    // 대기/작업중: 날짜 무관 (과거 승인 반품주문도 노출), 완료: 당일만
    const waiting = sortOrders(this.orders.filter(o => WAITING_STATUS.includes(o.status)))
    const working = sortOrders(this.orders.filter(o => WORKING_STATUS.includes(o.status)))
    const done    = sortOrders(this.orders.filter(o => DONE_STATUS.includes(o.status) && (o.updated_at || '').slice(0, 10) === today))

    const filtered =
      this.filterStatus === 'WAITING' ? waiting
      : this.filterStatus === 'WORKING' ? working
      : this.filterStatus === 'DONE'    ? done
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
            ? html`
                <div class="empty-state">
                  <span class="empty-icon">📦</span>
                  <span class="empty-text">해당 반품 주문이 없습니다</span>
                </div>`
            : filtered.map(order => html`
                <div class="order-item" @click="${() => this._selectOrder(order)}">
                  <div class="card-header">
                    <span class="order-no">${order.rwa_no || order.rwa_req_no || '-'}</span>
                    <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
                  </div>
                  <div class="sub-info">
                    ${this._rwaTypeLabel(order.rwa_type)} |
                    <entity-label table="companies" key-col="com_cd" display-col="com_nm"
                      .value="${order.com_cd || ''}" .fallback="${order.com_cd || '-'}"></entity-label>
                    ${order.cust_nm ? ` · ${order.cust_nm}` : ''}
                  </div>
                  <div class="sub-info" style="margin-top:3px; font-size:12px; color:var(--md-sys-color-on-surface-variant,#999)">
                    요청일: ${order.rwa_req_date || '-'}
                  </div>
                </div>
              `)
        }
      </div>

      <!-- 하단 바코드 스캔 -->
      <div class="scan-bottom">
        <label>주문번호 스캔</label>
        <div class="scan-row">
          <ox-input-barcode
            placeholder="바코드 스캔 또는 주문번호 입력"
            @change="${e => this._onScanSearch(e.target.value)}"
          ></ox-input-barcode>
          <button class="btn-refresh" @click="${this._fetchOrders}">새로고침</button>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 작업 화면 — 3단계
   * ============================================================ */

  /** 작업 화면 전체 레이아웃 */
  /* ============================================================
   * 상품 목록(허브) 화면 — 상품 단위 작업의 시작점
   * ============================================================ */

  /** 상품별 작업 단계 판단 — 'RECEIVE'(입고 필요) | 'INSPECT'(검수 필요) | 'DONE'(완료) */
  _itemStage(item) {
    const received = ['RECEIVED', 'INSPECTING', 'INSPECTED', 'DISPOSED', 'COMPLETED'].includes(item.status)
    const inspected = ['INSPECTED', 'DISPOSED', 'COMPLETED'].includes(item.status)
    if (!received) return 'RECEIVE'
    if (!inspected) return 'INSPECT'
    return 'DONE'
  }

  /** 상품 목록 화면 — 개별 상품을 선택해 입고→검수 진행 */
  _renderItemList() {
    const order = this.selectedOrder
    const doneCount = this.orderItems.filter(i => this._itemStage(i) === 'DONE').length
    const allCompleted = this.orderItems.length > 0 && this.orderItems.every(i => i.status === 'COMPLETED')

    return html`
      <!-- 포커스 없이도 스캔 가능 (전역 키 입력 수신) -->
      <barcode-listener @barcode-scanned="${e => this._onItemListScan(e.detail.barcode)}"></barcode-listener>

      <div class="work-screen">
        <!-- 헤더 -->
        <div class="work-header">
          <button class="back-btn" @click="${this._backToOrderSelect}">←</button>
          <div class="work-title">${order?.rwa_no || order?.rwa_req_no || '-'}</div>
          <span class="order-badge ${order?.status}">${this._statusLabel(order?.status)}</span>
        </div>

        <!-- 상품 바코드 스캔 -->
        <div class="scan-bar">
          <sku-barcode-input
            class="scan-input"
            .comCd="${order?.com_cd || ''}"
            placeholder="상품코드 / 바코드 스캔"
            skipInventory
            @sku-select="${e => this._onItemSkuSelect(e.detail)}"
          ></sku-barcode-input>
          <button class="btn-picker" title="상품 선택" @click="${() => { this.showItemPicker = true }}">📋</button>
        </div>

        <!-- 상품 목록 -->
        <div class="work-body">
          <p class="section-title">반품 상품 (완료 ${doneCount} / 전체 ${this.orderItems.length})</p>
          <div class="item-cards">
            ${this.orderItems.map(item => {
      const stage = this._itemStage(item)
      const label = stage === 'DONE'
        ? `✓ 완료 · 양품 ${item.good_qty || 0} / 불량 ${item.defect_qty || 0}`
        : stage === 'INSPECT' ? '검수 필요' : '입고 필요'
      const cls = stage === 'DONE' ? 'done' : stage === 'INSPECT' ? 'inspect' : 'receive'
      return html`
                <div class="item-card-row ${cls}">
                  <div class="ic-main">
                    <span class="ic-sku">${item.sku_cd}</span>
                    <span class="ic-nm">${item.sku_nm || '-'}</span>
                  </div>
                  <div class="ic-side">
                    <span class="ic-qty">${item.rwa_req_qty || item.rwa_qty || 0} EA</span>
                    <span class="ic-stage ${cls}">${label}</span>
                  </div>
                </div>
              `
    })}
          </div>
        </div>

        <!-- 하단 버튼 -->
        <div class="action-bar">
          <button class="action-btn secondary" @click="${this._backToOrderSelect}">주문 목록</button>
          <button class="action-btn success"
            ?disabled="${!allCompleted || this.actionLoading}"
            @click="${this._finishWork}">
            ${this.actionLoading ? '처리중...' : '반품 완료'}
          </button>
        </div>
      </div>

      ${this._renderItemPicker()}
    `
  }

  /** 상품 선택 팝업 — 목록에서 직접 선택해 작업 진입 */
  _renderItemPicker() {
    if (!this.showItemPicker) return ''
    return html`
      <div class="picker-backdrop" @click="${() => { this.showItemPicker = false }}">
        <div class="picker-sheet" @click="${e => e.stopPropagation()}">
          <div class="picker-handle"></div>
          <div class="picker-title">상품 선택 (${this.orderItems.length})</div>
          ${this.orderItems.length === 0
        ? html`<div class="picker-empty">항목 없음</div>`
        : this.orderItems.map(item => {
          const stage = this._itemStage(item)
          const label = stage === 'DONE' ? '완료' : stage === 'INSPECT' ? '검수 필요' : '입고 필요'
          return html`
                <div class="picker-item" @click="${() => { this.showItemPicker = false; this._openItemWork(item) }}">
                  <div class="pi-nm">${item.sku_cd} · ${item.sku_nm || '-'}</div>
                  <div class="pi-sub">${item.rwa_req_qty || item.rwa_qty || 0} EA · ${label}</div>
                </div>
              `
        })}
          <button class="picker-cancel" @click="${() => { this.showItemPicker = false }}">취소</button>
        </div>
      </div>
    `
  }

  /** 상품 바코드 스캔(sku-barcode-input) 결과 → 해당 상품 작업 진입 */
  _onItemSkuSelect(detail) {
    const skuCd = detail?.sku_cd
    const item = this.orderItems.find(i => i.sku_cd === skuCd)
    if (!item) {
      this._showFeedback(`[${skuCd || '?'}] 반품 항목에 없는 상품입니다`, 'error')
      voiceService.error('반품 항목에 없는 상품입니다')
      return
    }
    this._openItemWork(item)
  }

  /** barcode-listener 스캔 → sku-barcode-input과 동일한 해석 경로로 처리 (88바코드 대응) */
  _onItemListScan(barcode) {
    const el = this.renderRoot?.querySelector('sku-barcode-input')
    if (el) el._onScan(barcode)
  }

  /** 상품 목록으로 복귀 */
  _goToItemList() {
    this.selectedOrderItemId = ''
    this.selectedInspItemId = ''
    this._resetForms()
    this.step = 1
    this.screen = 'item-list'
  }

  /** 상품 선택 → 작업 화면 진입 (미입고면 입고 단계, 입고완료면 검수 단계) */
  _openItemWork(item) {
    this.selectedOrderItemId = item.id
    this.selectedInspItemId = item.id
    const stage = this._itemStage(item)
    if (stage === 'RECEIVE') {
      this.step = 1
      this.rcvQty = item.rwa_req_qty || item.rwa_qty || 0
      this.locCd = item.loc_cd || this.returnLocCd || ''
    } else {
      this._enterInspectForItem(item)
    }
    this.screen = 'work'
    this.requestUpdate()
  }

  /** 검수 단계 진입 — 해당 상품의 양품/불량 폼 초기화 */
  _enterInspectForItem(item) {
    this.selectedOrderItemId = item.id
    this.selectedInspItemId = item.id
    const total = item.rwa_qty || 0
    if (['INSPECTED', 'DISPOSED', 'COMPLETED'].includes(item.status)) {
      this.defectQty = item.defect_qty || 0
      this.goodQty = (item.good_qty != null) ? item.good_qty : Math.max(0, total - this.defectQty)
    } else {
      this.defectQty = 0
      this.goodQty = total
    }
    this.defectType = ''
    this.defectDesc = ''
    this.inspRemarks = ''
    this.step = 2
  }

  /** 작업 화면에서 입고 단계로 이동 (같은 상품) */
  _workToReceive() {
    const item = this.orderItems.find(i => i.id === (this.selectedInspItemId || this.selectedOrderItemId))
    if (!item) return
    this.selectedOrderItemId = item.id
    this.rcvQty = item.rwa_qty || item.rwa_req_qty || 0
    this.locCd = item.loc_cd || this.returnLocCd || ''
    this.step = 1
  }

  /** 작업 화면에서 검수 단계로 이동 (같은 상품, 이미 입고된 경우) */
  _workToInspect() {
    const item = this.orderItems.find(i => i.id === (this.selectedOrderItemId || this.selectedInspItemId))
    if (!item) return
    this._enterInspectForItem(item)
  }

  /* ============================================================
   * 작업 화면 (단일 상품: 입고 / 검수)
   * ============================================================ */

  _renderWorkScreen() {
    const order = this.selectedOrder
    const currentItem = this.orderItems.find(
      i => i.id === (this.step === 1 ? this.selectedOrderItemId : this.selectedInspItemId)
    )

    return html`
      <div class="work-screen">
        <!-- 헤더 -->
        <div class="work-header">
          <button class="back-btn" @click="${this._goToItemList}">←</button>
          <div class="work-title">${currentItem?.sku_cd || order?.rwa_no || '-'}</div>
          <span class="order-badge ${order?.status}">${this._statusLabel(order?.status)}</span>
        </div>

        <!-- 스텝 인디케이터 -->
        ${this._renderStepIndicator()}

        <!-- 콘텐츠 -->
        <div class="work-body">
          ${this.step === 1 ? this._renderStep1Receive() : this._renderStep2Inspect()}
        </div>

        <!-- 하단 버튼 -->
        ${this._renderActionBar()}
      </div>
    `
  }

  /** 스텝 인디케이터 */
  _renderStepIndicator() {
    const s = this.step
    return html`
      <div class="step-indicator">
        <div class="step-wrap">
          <div class="step-dot ${s === 1 ? 'active' : s > 1 ? 'completed' : ''}">
            ${s > 1 ? '✓' : '1'}
          </div>
          <div class="step-label">입고</div>
        </div>
        <div class="step-line ${s > 1 ? 'active' : ''}"></div>
        <div class="step-wrap">
          <div class="step-dot ${s === 2 ? 'active' : ''}">2</div>
          <div class="step-label">검수</div>
        </div>
      </div>
    `
  }

  /** 하단 액션 버튼 (단일 상품 작업 — 확인은 폼 내부 인라인 버튼) */
  _renderActionBar() {
    const currentItem = this.orderItems.find(
      i => i.id === (this.selectedOrderItemId || this.selectedInspItemId)
    )
    const received = currentItem &&
      ['RECEIVED', 'INSPECTING', 'INSPECTED', 'DISPOSED', 'COMPLETED'].includes(currentItem.status)

    // ── Step 1: [목록] · [검수 →](입고완료 상품만) ──
    if (this.step === 1) {
      return html`
        <div class="action-bar">
          <button class="action-btn secondary" @click="${this._goToItemList}">목록</button>
          <button class="action-btn primary"
            ?disabled="${!received}"
            @click="${this._workToInspect}">
            검수 →
          </button>
        </div>
      `
    }

    // ── Step 2: [← 입고] · [목록] ──
    return html`
      <div class="action-bar">
        <button class="action-btn secondary" @click="${this._workToReceive}">← 입고</button>
        <button class="action-btn secondary" @click="${this._goToItemList}">목록</button>
      </div>
    `
  }

  /* ============================================================
   * Step 1: 반품 입고
   * ============================================================ */

  /** Step 1 — 항목별 입고 수량 + 로케이션 입력 */
  _renderStep1Receive() {
    const currentItem = this.selectedOrderItemId
      ? this.orderItems.find(i => i.id === this.selectedOrderItemId)
      : this._getCurrentStepItems()[0]

    const doneStatuses = ['RECEIVED', 'INSPECTING', 'INSPECTED', 'DISPOSED', 'COMPLETED']
    const receivedCount = this.orderItems.filter(i => doneStatuses.includes(i.status)).length

    return html`
      <p class="section-title">입고 작업 (완료 ${receivedCount} / 전체 ${this.orderItems.length})</p>

      ${currentItem ? html`
        <div class="item-card">
          <div class="sku-info">${currentItem.sku_cd} · ${currentItem.sku_nm || '-'}</div>
          <div class="qty-info">반품 요청 수량: ${currentItem.rwa_req_qty || currentItem.rwa_qty || 0} EA</div>
        </div>

        <div class="qty-confirm-row">
          <div class="form-group">
            <label>입고 수량</label>
            <input
              type="number"
              inputmode="numeric"
              min="0"
              placeholder="0"
              .value="${this.rcvQty || ''}"
              @input="${e => { this.rcvQty = Number(e.target.value) }}"
            />
          </div>
          <button class="btn-confirm-inline"
            ?disabled="${this.actionLoading}"
            @click="${this._doReceive}">
            ${this.actionLoading ? '...' : '확인'}
          </button>
        </div>

        <div class="loc-note">📍 보관 로케이션: <strong>${this.returnLocCd || '반품대기존'}</strong> (자동)</div>
      ` : html`
        <div class="empty-state">
          <span class="empty-icon">📦</span>
          <span class="empty-text">입고할 항목이 없습니다</span>
        </div>
      `}
    `
  }

  /* ============================================================
   * Step 2: 검수
   * ============================================================ */

  /** Step 2 — 양품/불량 수량 입력, 항목 선택 가능, 확인 버튼 인라인 */
  _renderStep2Inspect() {
    const currentItem = this.selectedInspItemId
      ? this.orderItems.find(i => i.id === this.selectedInspItemId)
      : this._getCurrentStepItems()[0]

    const completedCount = this.orderItems.filter(i => i.status === 'COMPLETED').length
    const totalQty = currentItem ? (currentItem.rwa_qty || 0) : 0

    return html`
      <p class="section-title">검수 작업 (완료 ${completedCount} / 전체 ${this.orderItems.length})</p>

      ${currentItem ? html`
        <div class="item-card">
          <div class="sku-info">${currentItem.sku_cd} · ${currentItem.sku_nm || '-'}</div>
          <div class="qty-info">입고 수량: ${totalQty} EA</div>
        </div>
      ` : ''}

      <!-- 불량 수량 입력 → 양품 자동 계산 (양품 = 입고수량 − 불량) -->
      <div class="qty-confirm-row">
        <div class="qty-row" style="flex:1">
          <div class="form-group">
            <label>양품 수량 (자동)</label>
            <input
              type="number"
              readonly
              tabindex="-1"
              class="good-qty-field"
              .value="${this.goodQty != null ? this.goodQty : ''}"
            />
          </div>
          <div class="form-group">
            <label>불량 수량</label>
            <numeric-keypad-input
              .value="${this.defectQty != null ? this.defectQty : 0}"
              .min="${0}"
              .max="${totalQty}"
              placeholder="0"
              @change="${e => {
                const d = Math.max(0, Math.min(totalQty, e.detail.value || 0))
                this.defectQty = d
                this.goodQty = Math.max(0, totalQty - d)
              }}"
            ></numeric-keypad-input>
          </div>
        </div>
        <button class="btn-confirm-inline"
          ?disabled="${this.actionLoading}"
          @click="${this._doInspect}">
          ${this.actionLoading ? '...' : '확인'}
        </button>
      </div>

      ${this.defectQty > 0 ? html`
        <div class="form-group">
          <label>불량 유형</label>
          <select @change="${e => { this.defectType = e.target.value }}">
            <option value="">선택하세요</option>
            <option value="DAMAGED">파손</option>
            <option value="EXPIRED">유통기한 초과</option>
            <option value="WRONG_ITEM">오배송</option>
            <option value="MISSING_PARTS">부품 누락</option>
            <option value="FUNCTIONAL_DEFECT">기능 결함</option>
          </select>
        </div>
        <div class="form-group">
          <label>불량 상세</label>
          <input
            type="text"
            placeholder="불량 내용 간략 기재"
            .value="${this.defectDesc}"
            @input="${e => { this.defectDesc = e.target.value }}"
          />
        </div>
      ` : ''}

      <div class="form-group">
        <label>비고 (선택)</label>
        <input
          type="text"
          placeholder="추가 메모"
          .value="${this.inspRemarks}"
          @input="${e => { this.inspRemarks = e.target.value }}"
        />
      </div>
    `
  }



  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 반품 주문 목록 조회 (APPROVED ~ COMPLETED 전체) */
  async _fetchOrders() {
    this.loading = true
    try {
      const [approved, receiving, received, inspecting, inspected, disposing, disposed, completed, cancelled, rejected] = await Promise.all([
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=APPROVED').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=RECEIVING').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=RECEIVED').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=INSPECTING').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=INSPECTED').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=DISPOSING').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=DISPOSED').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=COMPLETED').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=CANCELLED').catch(() => []),
        ServiceUtil.restGet('rwa_trx/rwa_orders?status=REJECTED').catch(() => [])
      ])
      this.orders = [...approved, ...receiving, ...received, ...inspecting, ...inspected, ...disposing, ...disposed, ...completed, ...cancelled, ...rejected]
    } catch (err) {
      console.error('반품 주문 조회 실패:', err)
      this.orders = []
    } finally {
      this.loading = false
    }
  }

  /** 반품 주문 아이템 조회 */
  async _fetchOrderItems(orderId) {
    try {
      const data = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${orderId}/items`)
      this.orderItems = Array.isArray(data) ? data : (data?.items || [])
    } catch (err) {
      console.error('반품 아이템 조회 실패:', err)
      this.orderItems = []
    }
  }

  /** 주문 + 아이템 상태 갱신 */
  async _refreshOrder() {
    try {
      const data = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${this.selectedOrder.id}`)
      this.selectedOrder = data
      await this._fetchOrderItems(this.selectedOrder.id)
    } catch (err) {
      console.error('주문 갱신 실패:', err)
    }
  }

  /* ============================================================
   * 이벤트 핸들러
   * ============================================================ */

  /** 필터 토글 */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? null : status
  }

  /** 주문 선택 → 상품 목록(허브) 화면으로 전환 */
  async _selectOrder(order) {
    this.selectedOrder = order
    this.enteredOrderStatus = order.status  // 진입 시점 상태 저장
    this._resetForms()
    await this._fetchOrderItems(order.id)

    // 완료된 주문은 반품완료 요약 화면으로 바로 이동
    if (order.status === 'COMPLETED') {
      this.screen = 'complete'
      this.requestUpdate()
      return
    }

    // 상품 단위 작업: 상품 목록 화면에서 개별 상품을 선택해 입고→검수 진행
    this.screen = 'item-list'
    this.step = 1
    this.requestUpdate()
  }

  /** 주문번호 바코드 스캔으로 검색 */
  _onScanSearch(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return
    const found = this.orders.find(o => o.rwa_req_no === trimmed || o.rwa_no === trimmed || o.id === trimmed)
    if (found) {
      this._selectOrder(found)
    } else {
      this._showFeedback('주문을 찾을 수 없습니다', 'error')
    }
  }

  /** 목록으로 돌아가기 */
  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this.step = 1
    this._resetForms()
    this._fetchOrders()
  }

  /* ============================================================
   * 각 단계별 처리 로직
   * ============================================================ */

  /** Step 1: 입고 처리 (신규 입고 및 완료 항목 수정 모두 처리) */
  async _doReceive() {
    if (!this.selectedOrder) return
    const item = this.selectedOrderItemId
      ? this.orderItems.find(i => i.id === this.selectedOrderItemId)
      : this._getCurrentStepItems()[0]
    if (!item) return

    if (!this.rcvQty || this.rcvQty <= 0) {
      this._showFeedback('입고 수량을 입력하세요', 'error')
      voiceService.error('입고 수량을 입력하세요')
      return
    }
    // 반품 입고는 항상 반품대기존(returnLocCd)으로 자동 입고
    const locCd = this.returnLocCd || this.locCd || ''

    // 완료 항목 수정 시 변경 여부 체크 (수량만)
    const doneStatuses = ['RECEIVED', 'INSPECTING', 'INSPECTED', 'DISPOSED', 'COMPLETED']
    const isAlreadyReceived = doneStatuses.includes(item.status)
    if (isAlreadyReceived) {
      const sameQty = Number(this.rcvQty) === Number(item.rwa_qty)
      if (sameQty) {
        this._showFeedback('변경된 값이 없습니다', 'warning')
        return
      }
    }

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/receive`,
        { rwaQty: this.rcvQty, locCd }
      )
      this._showFeedback(
        isAlreadyReceived
          ? `${item.sku_cd} 입고 정보 수정 완료`
          : `${item.sku_cd} 입고 완료 (${this.rcvQty}EA)`,
        'success'
      )
      voiceService.success(isAlreadyReceived ? '수정 완료' : '입고 완료')
      await this._refreshOrder()
      // 입고 완료 → 같은 상품의 검수 단계로 자동 전환
      const refreshed = this.orderItems.find(i => i.id === item.id) || item
      this._enterInspectForItem(refreshed)
    } catch (err) {
      this._showFeedback(err.message || '입고 처리 실패', 'error')
      voiceService.error('입고 실패')
    } finally {
      this.actionLoading = false
    }
  }

  /** Step 2: 검수 처리 (신규 및 완료 항목 수정 모두 처리) */
  async _doInspect() {
    if (!this.selectedOrder) return
    const item = this.selectedInspItemId
      ? this.orderItems.find(i => i.id === this.selectedInspItemId)
      : this._getCurrentStepItems()[0]
    if (!item) return

    const total = (this.goodQty || 0) + (this.defectQty || 0)
    if (total <= 0) {
      this._showFeedback('양품 또는 불량 수량을 입력하세요', 'error')
      return
    }
    if (this.defectQty > 0 && !this.defectType) {
      this._showFeedback('불량 유형을 선택하세요', 'error')
      return
    }

    // 완료 항목 수정 시 변경 여부 체크
    const isAlreadyInspected = ['INSPECTED', 'COMPLETED'].includes(item.status)
    if (isAlreadyInspected) {
      const sameGood = Number(this.goodQty) === Number(item.good_qty)
      const sameDef  = Number(this.defectQty) === Number(item.defect_qty)
      if (sameGood && sameDef) {
        this._showFeedback('변경된 값이 없습니다', 'warning')
        return
      }
    }

    this.actionLoading = true
    try {
      // 검수기록 저장 + 완료(대기존 → 양품/불량존 이동)를 하나의 트랜잭션으로 처리 (R4)
      // 양품/불량 로케이션이 없으면 서버가 에러를 던지고 전체 롤백됨 (R2)
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/inspect_complete`,
        {
          insp_type: 'VISUAL',
          insp_qty: total,
          good_qty: this.goodQty || 0,
          defect_qty: this.defectQty || 0,
          defect_type: this.defectType || null,
          defect_desc: this.defectDesc || null,
          photo_url: null,
          remarks: this.inspRemarks || null
        }
      )
      this._showFeedback(
        isAlreadyInspected ? `${item.sku_cd} 검수 정보 수정 완료` : `${item.sku_cd} 검수 완료`,
        'success'
      )
      voiceService.success(isAlreadyInspected ? '수정 완료' : '검수 완료')
      this.defectType = ''
      this.defectDesc = ''
      this.inspRemarks = ''
      await this._refreshOrder()
      // 검수 완료 → 상품 목록으로 복귀
      this._goToItemList()
    } catch (err) {
      // 로케이션 미존재 등으로 실패 시 — 전체 롤백되어 검수기록/완료 모두 반영 안 됨
      await this._refreshOrder()
      const msg = err.message || '검수 처리 실패'
      this._alertError(msg)
      voiceService.error('검수 실패')
    } finally {
      this.actionLoading = false
    }
  }

  /** 차단성 에러 안내 — 토스트 + 팝업(로케이션 미생성 등 조치가 필요한 경우) */
  _alertError(msg) {
    this._showFeedback(msg, 'error')
    try {
      UiUtil.showToast?.({ type: 'error', message: msg })
    } catch (e) { /* noop */ }
    // 로케이션 미생성처럼 조치가 필요한 오류는 확인을 강제하는 팝업으로도 안내
    if (/로케이션/.test(msg)) {
      window.alert(msg)
    }
  }

  /**
   * 검수 완료 후 반품 완료 요약 화면으로 전환
   */
  async _finishWork() {
    voiceService.success('반품 완료 처리되었습니다')
    await this._refreshOrder()
    this.screen = 'complete'
  }

  /**
   * 반품 완료 요약 화면 — 처리 결과를 한눈에 표시
   */
  _renderCompleteScreen() {
    const order = this.selectedOrder
    const completedAt = order?.updated_at || new Date().toLocaleString('ko-KR', { hour12: false })

    return html`
      <div class="complete-screen">
        <!-- 완료 헤더 -->
        <div class="complete-header">
          <div class="complete-icon">✅</div>
          <div class="complete-title">반품 처리 완료</div>
          <div class="complete-rwa-no">${order?.rwa_no || order?.rwa_req_no || '-'}</div>
          <div class="complete-meta">
            ${this._rwaTypeLabel(order?.rwa_type)} &nbsp;|&nbsp;
            <entity-label table="companies" key-col="com_cd" display-col="com_nm" .value="${order?.com_cd || ''}" .fallback="${order?.com_cd || '-'}"></entity-label>
            ${order?.cust_nm ? ` · ${order.cust_nm}` : ''}
          </div>
          <div class="complete-meta">완료 시각: ${completedAt}</div>
        </div>

        <!-- 항목별 처리 결과 -->
        <div class="complete-body">
          <div class="complete-section-title">📦 반품 항목별 처리 결과</div>

          ${this.orderItems.map(item => html`
            <div class="complete-item-card">
              <div class="item-sku">${item.sku_cd} &nbsp; ${item.sku_nm || ''}</div>

              <div class="complete-item-row">
                <span class="row-label">입고 수량</span>
                <span class="row-val">${item.rwa_qty || 0} EA</span>
              </div>
              <div class="complete-item-row">
                <span class="row-label">양품</span>
                <span class="row-val good">${item.good_qty || 0} EA</span>
              </div>
              <div class="complete-item-row">
                <span class="row-label">불량</span>
                <span class="row-val ${(item.defect_qty || 0) > 0 ? 'defect' : ''}">${item.defect_qty || 0} EA</span>
              </div>
            </div>
          `)}
        </div>

        <!-- 목록으로 버튼 -->
        <div class="action-bar">
          <button class="action-btn primary" @click="${this._backToOrderSelect}">목록으로</button>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** 모든 폼 초기화 */
  _resetForms() {
    this.rcvQty = 0
    this.locCd = this.returnLocCd || ''
    this.goodQty = 0
    this.defectQty = 0
    this.defectType = ''
    this.defectDesc = ''
    this.inspRemarks = ''
    this.selectedOrderItemId = ''
    this.selectedInspItemId = ''
  }

  /**
   * 현재 step에서 처리할 아이템 목록 반환
   *   Step 1: 미입고 항목 (RECEIVED 이상 상태 제외)
   *   Step 2: 입고 완료 항목 (RECEIVED 또는 INSPECTING)
   */
  _getCurrentStepItems() {
    if (!this.orderItems.length) return []
    if (this.step === 1) {
      return this.orderItems.filter(i =>
        !['RECEIVED', 'INSPECTING', 'INSPECTED', 'DISPOSED', 'COMPLETED'].includes(i.status)
      )
    }
    if (this.step === 2) {
      return this.orderItems.filter(i =>
        ['RECEIVED', 'INSPECTING'].includes(i.status)
      )
    }
    return []
  }

  /** 상태 코드 → 한국어 */
  _statusLabel(status) {
    const labels = {
      REQUEST: '반품요청', APPROVED: '승인대기', RECEIVING: '입고중', RECEIVED: '입고완료',
      INSPECTING: '검수중', INSPECTED: '검수완료', DISPOSING: '처분중',
      COMPLETED: '완료', REJECTED: '거부', CANCELLED: '취소', DISPOSED: '처분완료'
    }
    return labels[status] || status || '-'
  }

  /** 반품 유형 → 한국어 */
  _rwaTypeLabel(type) {
    const labels = {
      CUSTOMER_RETURN: '고객 반품', VENDOR_RETURN: '공급업체 반품',
      DEFECT_RETURN: '불량품 반품', STOCK_ADJUST: '재고 조정', EXPIRED_RETURN: '유통기한 임박'
    }
    return labels[type] || type || '-'
  }

  /**
   * RETURN 유형 로케이션 중 첫 번째(loc_cd 정렬)를 기본 보관 로케이션으로 설정
   */
  async _fetchReturnLocation() {
    try {
      const data = await ServiceUtil.searchByPagination(
        'locations',
        [{ name: 'loc_type', value: 'RETURN' }],
        null,
        1, 10
      )
      const items = data?.items || []
      if (items.length > 0) {
        // loc_cd 오름차순 정렬 후 첫 번째 선택
        items.sort((a, b) => (a.loc_cd || '').localeCompare(b.loc_cd || ''))
        this.returnLocCd = items[0].loc_cd
        this.locCd = this.returnLocCd
      }
    } catch (err) {
      console.error('RETURN 로케이션 조회 실패:', err)
    }
  }

  /** 피드백 토스트 표시 (2초 후 소멸) */
  _showFeedback(msg, type = 'success') {
    this.feedbackMsg = msg
    this.feedbackType = type
    if (this._feedbackTimer) clearTimeout(this._feedbackTimer)
    this._feedbackTimer = setTimeout(() => {
      this.feedbackMsg = ''
      this.feedbackType = ''
    }, 2000)
  }
}

window.customElements.define('rwa-receive-work', RwaReceiveWork)
