import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { MetaApi, ServiceUtil, TermsUtil, UiUtil, PrintUtil } from '@operato-app/metapage/dist-client'
import '@operato-app/metapage/dist-client/components/input/operato-input-barcode'
import '../../component/barcode-listener.js'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'
import { operatoGet } from '@operato-app/operatofill'

/**
 * PDA 입고 적치 작업 화면
 *
 * 입고 완료(END) 후 WAITING 상태의 재고를 실제 창고 로케이션에 배치(적치)하는 화면.
 * 입고번호 스캔 → 재고 바코드 스캔 → 로케이션 스캔 → 적치 확정
 *
 * 화면 모드: list(입고번호 스캔) → work(항목 스캔) → complete(완료 확인)
 */
@customElement('pda-inbound-putaway')
export class PdaInboundPutaway extends connect(store)(PageView) {
  /** 화면 모드: list / work / complete */
  @state() mode = 'list'

  /** 입고번호 입력 상태 (list 모드) */
  @state() rcvNoInput = ''
  /** 목록 로딩 중 */
  @state() loading = false
  /** API 처리 중 */
  @state() processing = false
  /** 입고 목록 필터: ALL / WAITING / STORED */
  @state() listFilter = 'ALL'

  /** 현재 작업 중인 입고번호 */
  @state() currentRcvNo = ''
  /** 적치 대상 재고 목록 — WAITING (미완료) */
  @state() workItems = []
  /** 적치 완료 재고 목록 — STORED */
  @state() doneItems = []
  /** 현재 처리 대상 항목 인덱스 */
  @state() currentItemIndex = -1
  /** 탭 키 (todo / done) */
  @state() currentTabKey = 'todo'
  /** 마지막 스캔 피드백 */
  @state() lastFeedback = null
  /** 작업 시작 시각 */
  @state() startedAt = null

  /** 화주사 명칭 (상단 요약 표시용) */
  @state() _comNm = ''
  /** 상품 선택 팝업 표시 여부 */
  @state() _showItemPicker = false
  /** 로케이션 텍스트 입력 like 검색 결과 (자동완성 드롭다운) */
  @state() _locSearchResults = []
  /** 로케이션 검색 debounce 타이머 (참조 보관용) */
  _locSearchTimer = null

  /**
   * 스캔 단계
   *  'barcode'  — 재고 바코드 스캔 대기
   *  'location' — 로케이션 스캔/입력 대기
   */
  @state() scanStep = 'barcode'
  /** 스캔된 재고 바코드 */
  @state() scannedBarcode = ''
  /** 적치할 로케이션 코드 */
  @state() locCd = ''
  /** 입력한 적치 수량 */
  @state() putawayQty = 0

  /** 적치 대기 입고 목록 (list 모드 중단 표시) */
  @state() receivingList = []
  /** vend_cd → vend_nm 매핑 (목록 표시용) */
  _vendorMap = {}
  /** 추천 로케이션 목록 (work 모드 스텝 2 진입 시 조회) */
  @state() recommendedLocations = []
  /** 추천 로케이션 조회 중 */
  @state() loadingLocations = false

  /** 재고 바코드 스캔 입력 */
  @query('#barcodeInput') _barcodeInput
  /** 로케이션 스캔 입력 */
  @query('#locationInput') _locationInput
  /** 입고번호 스캔 입력 */
  @query('#rcvNoInput') _rcvNoInput

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
          overflow: hidden;
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

        /* 현황 요약 카드 */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
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
        .summary-card.done .count { color: #4CAF50; }

        /* 입고번호 스캔 입력 */
        .scan-rcv-no {
          padding: 8px 12px 12px;
        }

        .scan-rcv-no .scan-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-rcv-no .scan-row label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          white-space: nowrap;
        }

        .scan-rcv-no .scan-row operato-input-barcode {
          flex: 1;
        }

        .scan-rcv-no .btn-refresh {
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

        .scan-rcv-no .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* 빈 안내 영역 */
        .empty-guide {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .empty-guide .guide-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .empty-guide .guide-text {
          font-size: 14px;
        }

        /* 추천 로케이션 칩 영역 */
        .recommend-locs {
          margin: 6px 0 2px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 6px;
        }

        .recommend-locs .rec-label {
          width: 100%;
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          margin-bottom: 2px;
        }

        .loc-chip {
          padding: 5px 12px;
          border-radius: 16px;
          border: 1.5px solid var(--md-sys-color-primary, #1976d2);
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976d2);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
          letter-spacing: 0.5px;
        }

        .loc-chip:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .loc-chip.loading-chip {
          color: var(--md-sys-color-on-surface-variant, #999);
          border-color: var(--md-sys-color-outline-variant, #ccc);
          pointer-events: none;
          font-size: 12px;
          font-weight: 400;
        }

        /* 진행률 바 */
        .progress-section {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
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
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 현재 적치 항목 카드 */
        .current-item-section {
          margin: 2px 12px;
          padding: 7px 10px 10px 8px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .barcode-display {
          text-align: center;
          padding: 4px 0 8px;
          font-size: 22px;
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

        /* 스캔 스텝 영역 — 한 줄 레이아웃 */
        .scan-step {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.5);
        }

        .scan-step.active {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 1px 4px rgba(25, 118, 210, 0.2);
        }

        .scan-step .step-badge {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .scan-step .step-badge.done-badge {
          background: #4CAF50;
        }

        .scan-step .step-label-text {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 700;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .scan-step operato-input-barcode {
          flex: 1;
          min-width: 0;
          --input-height: 24px;
          --input-font-size: 12px;
          font-size: 12px;
        }

        .scan-step input[type="number"] {
          flex: 1;
          height: 26px;
          min-width: 0;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          padding: 0 8px;
          font-size: 14px;
          font-weight: 600;
          text-align: right;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-container-lowest, #fff);
        }

        /* 로케이션 텍스트 입력 + 자동완성 드롭다운 */
        .scan-step .loc-input-wrap {
          flex: 1;
          min-width: 0;
          position: relative;
        }
        .scan-step .loc-text-input {
          width: 100%;
          box-sizing: border-box;
          height: 26px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          padding: 0 8px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-container-lowest, #fff);
        }
        .loc-dropdown {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          z-index: 50;
          background: var(--md-sys-color-surface, #fff);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
          max-height: 200px;
          overflow-y: auto;
        }
        .loc-dropdown-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
          padding: 8px 10px;
          font-size: 13px;
          cursor: pointer;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
        }
        .loc-dropdown-item:last-child {
          border-bottom: none;
        }
        .loc-dropdown-item:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }
        .loc-dropdown-item .ld-cd {
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
          letter-spacing: 0.5px;
        }
        .loc-dropdown-item .ld-nm {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #777);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 확정된 로케이션 변경 버튼 */
        .scan-step .btn-loc-change {
          flex-shrink: 0;
          padding: 4px 10px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .scan-step .btn-loc-change:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }
        .scan-step .btn-loc-change:disabled {
          opacity: 0.4;
        }

        /* 바코드 스캔 우측 상품 선택 버튼 */
        .scan-step .btn-item-picker {
          flex-shrink: 0;
          width: 28px;
          height: 26px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          font-size: 14px;
          cursor: pointer;
        }
        .scan-step .btn-item-picker:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }
        .scan-step .btn-item-picker:disabled {
          opacity: 0.4;
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

        /* 로케이션 확인 텍스트 (스텝 2 완료 후) */
        .location-confirmed {
          flex: 1;
          font-size: 16px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
          letter-spacing: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 확정 버튼 — 로케이션 행 인라인 */
        .btn-confirm {
          flex-shrink: 0;
          padding: 6px 14px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-confirm:disabled {
          opacity: 0.4;
        }

        .btn-confirm:active:not(:disabled) {
          opacity: 0.85;
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
          margin: 1px 12px 0;
          flex-shrink: 0;
        }

        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 0;
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

        /* 탭 콘텐츠 */
        .tab-content {
          padding: 8px 12px;
          overflow-y: auto;
          flex: 1;
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

        /* 미완료/완료 탭 항목 — 선택 불가 */
        .item-card.no-select {
          cursor: default;
        }

        /* 완료 항목 카드 — 정보(전체폭) / 인쇄·로케이션 2행 구조로 상품명 잘림 방지 */
        .item-card.done-card {
          flex-direction: column;
          align-items: stretch;
        }
        .item-card.done-card .card-main {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .item-card.done-card .card-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 6px;
        }
        /* 완료 항목은 상품명을 전체 폭에서 줄바꿈하여 모두 표시 */
        .item-card.done-card .sku {
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
        }

        /* 현재 선택(스캔) 항목 강조 */
        .item-card.current {
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border: 2px solid var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.25);
        }
        .item-card.current .icon {
          color: var(--md-sys-color-primary, #1976D2);
        }
        .item-card.current .sku {
          color: var(--md-sys-color-primary, #1976D2);
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

        .item-card .sku {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
        }

        .item-card .loc-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .loc-badge.done {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .item-card .btn-print {
          flex-shrink: 0;
          padding: 4px 10px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .item-card .btn-print:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
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

        /* 입고 목록 리스트 (list 모드 중단) */
        .rcv-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 12px 8px;
        }

        .rcv-card {
          padding: 10px 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: background 0.15s;
        }

        .rcv-card:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .rcv-card .rcv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .rcv-card .rcv-no {
          font-size: 14px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976d2);
        }

        .rcv-card .rcv-sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rcv-card .rcv-badges {
          display: flex;
          gap: 6px;
        }

        .rcv-card .badge-waiting {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          background: #ffebee;
          color: #c62828;
        }

        .rcv-card .badge-stored {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          background: #e8f5e9;
          color: #2e7d32;
        }

        /* 빈 메시지 */
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
      title: TermsUtil.tMenu('PutawayWork') || '적치 작업'
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
    if (this.mode === 'complete') {
      return html`
        <div class="header-bar">
          <span class="title">
            <button class="back-btn" @click=${this._goBack}>◀</button>
            입고번호 : ${this.currentRcvNo}
          </span>
        </div>
      `
    }

    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          입고번호 : ${this.currentRcvNo}
        </span>
        <div class="actions">
          <button class="primary"
            ?disabled=${this.processing}
            @click=${this._closeWork}>
            ${TermsUtil.tButton('complete') || '작업완료'}
          </button>
        </div>
      </div>
    `
  }

  /** list 모드 렌더링 — 입고 목록 + 입고번호 스캔 입력 */
  _renderListMode() {
    if (this.loading) {
      return html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
    }

    // 입고주문 단위 분류 (재고 건수가 아닌 입고주문 개수 기준)
    const waitingList = this.receivingList.filter(r => r.putaway_status === 'WAITING')
    const putawayList = this.receivingList.filter(r => r.putaway_status === 'PUTAWAY')
    // ALL은 대기 + 작업중만 표시 (완료 DONE 입고는 목록에서 제외)
    const filteredList =
      this.listFilter === 'WAITING' ? waitingList
        : this.listFilter === 'PUTAWAY' ? putawayList
          : [...waitingList, ...putawayList]

    return html`
      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active=${this.listFilter === 'WAITING'}
          @click=${() => this._toggleListFilter('WAITING')}>
          <div class="count">${waitingList.length}</div>
          <div class="card-label">${TermsUtil.tLabel('wait') || '대기'}</div>
        </div>
        <div class="summary-card"
          ?active=${this.listFilter === 'PUTAWAY'}
          @click=${() => this._toggleListFilter('PUTAWAY')}>
          <div class="count">${putawayList.length}</div>
          <div class="card-label">${TermsUtil.tLabel('in_progress') || '작업중'}</div>
        </div>
      </div>

      <div class="rcv-list">
        ${filteredList.length > 0
        ? filteredList.map(rcv => this._renderReceivingCard(rcv))
        : html`
            <div class="empty-guide">
              <div class="guide-icon">📦</div>
              <div class="guide-text">${TermsUtil.tLabel('scan_barcode') || '입고번호를 스캔하세요'}</div>
            </div>
          `}
      </div>

      <div class="scan-rcv-no">
        <div class="scan-row">
          <label>${TermsUtil.tLabel('rcv_no') || '입고번호'}</label>
          <operato-input-barcode id="rcvNoInput"
            placeholder="입고번호 스캔"
            @change=${e => this._onScanRcvNo(e.target.value)}>
          </operato-input-barcode>
          <button class="btn-refresh" @click=${this._refresh}>
            ${TermsUtil.tButton('refresh') || '새로고침'}
          </button>
        </div>
      </div>
    `
  }

  /** 입고 카드 렌더링 (list 모드 중단) */
  _renderReceivingCard(rcv) {
    return html`
      <div class="rcv-card" @click=${() => this._onScanRcvNo(rcv.rcv_no)}>
        <div class="rcv-header">
          <span class="rcv-no">${TermsUtil.tLabel('rcv_no') || '입고번호'}: ${rcv.rcv_no}</span>
          <div class="rcv-badges">
            ${rcv.waiting_count > 0 ? html`<span class="badge-waiting">${TermsUtil.tLabel('wait') || '대기'} ${rcv.waiting_count}</span>` : ''}
            ${rcv.stored_count > 0 ? html`<span class="badge-stored">${TermsUtil.tLabel('completed') || '완료'} ${rcv.stored_count}</span>` : ''}
          </div>
        </div>
        <div class="rcv-sub">
          ${TermsUtil.tLabel('vend_cd') || '공급처'}: ${this._vendorMap[rcv.vend_cd] || rcv.vend_cd || '-'} | ${TermsUtil.tLabel('rcv_req_date') || '입고 예정일'}: ${rcv.rcv_req_date || '-'}
        </div>
      </div>
    `
  }

  /** work 모드 렌더링 — 진행률, 현재 항목, 스캔 스텝, 탭 */
  _renderWorkMode() {
    const completedCount = this.doneItems.length
    const totalCount = this.workItems.length + completedCount
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const currentItem = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null

    return html`
      <barcode-listener
        @barcode-scanned=${e => this._onListenerScan(e.detail.barcode)}>
      </barcode-listener>

      <div class="progress-section">
        <div class="progress-bar-large">
          <div class="fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${completedCount}/${totalCount}건</div>
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
        <span>🏢 ${TermsUtil.tLabel('com_cd') || '화주사'}: <strong>${this._comNm || '-'}</strong></span>
      </div>

  ${this.workItems.length === 0 ? html`
        <div class="current-item-section">
          <div class="item-info" style="text-align:center; padding: 12px 0;">
            모든 항목의 적치가 완료되었습니다 ✅
          </div>
        </div>
      ` : html`
        <div class="current-item-section">
          ${currentItem ? html`<div class="barcode-display">재고 : ${currentItem.barcode}</div>` : ''}
          <div class="item-info">
            <div class="sku">
              ${currentItem
          ? html`${currentItem.sku_nm || currentItem.sku_cd}${currentItem.sku_nm ? html`<span style="font-weight:normal;font-size:13px;"> (${currentItem.sku_cd})</span>` : ''}`
          : '-'}
            </div>
            <div class="qty">
              ${currentItem ? html`${TermsUtil.tLabel('inv_qty') || '수량'}: ${currentItem.inv_qty || 0}` : ''}
            </div>
            ${currentItem?.lot_no ? html`
              <div class="lot">
                LOT: ${currentItem.lot_no}
                ${currentItem.expired_date ? ` · 유통기한: ${currentItem.expired_date}` : ''}
              </div>
            ` : ''}
          </div>

          ${this._renderScanSteps()}

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
   * barcode-listener(HID 스캐너) 스캔 입력 분기
   * 현재 스캔 단계에 따라 바코드/로케이션 스캔 핸들러로 전달
   * @param {string} barcode - 스캔된 값
   */
  _onListenerScan(barcode) {
    if (!barcode || this.processing) return
    if (this.scanStep === 'location') {
      this._onScanLocation(barcode, true)
    } else {
      this._onScanBarcode(barcode)
    }
  }

  /** 스캔 3단계 렌더링 — 바코드 → 로케이션 → 적치 수량 + 확정 */
  _renderScanSteps() {
    const step1Done = this.scanStep === 'location' || this.scanStep === 'qty'
    const step2Done = this.scanStep === 'qty'

    return html`
      <!-- 스텝 1: 재고 바코드 스캔 -->
      <div class="scan-step ${this.scanStep === 'barcode' ? 'active' : ''}">
        <span class="step-badge ${step1Done ? 'done-badge' : ''}">${step1Done ? '✓' : '1'}</span>
        <span class="step-label-text">${TermsUtil.tLabel('scan_barcode') || '바코드 스캔'}</span>
        ${this.scanStep === 'barcode' ? html`
          <operato-input-barcode id="barcodeInput"
            placeholder="바코드 스캔"
            ?disabled=${this.processing}
            @change=${e => this._onScanBarcode(e.target.value)}>
          </operato-input-barcode>
          <button class="btn-item-picker" title="상품 선택"
            ?disabled=${this.processing}
            @click=${() => { this._showItemPicker = true }}>📋</button>
        ` : html`
          <span style="flex:1;font-size:12px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${this.scannedBarcode || ''}
          </span>
        `}
      </div>

      ${this._renderRecommendedLocations()}

      <!-- 스텝 2: 로케이션 스캔 -->
      <div class="scan-step ${this.scanStep === 'location' ? 'active' : ''}">
        <span class="step-badge ${step2Done ? 'done-badge' : ''}">${step2Done ? '✓' : '2'}</span>
        <span class="step-label-text">${TermsUtil.tLabel('loc_cd') || '로케이션'}</span>
        ${this.scanStep === 'location' ? html`
          <div class="loc-input-wrap">
            <input type="text" id="locationInput" class="loc-text-input"
              placeholder="로케이션 스캔 / 입력"
              autocomplete="off"
              ?disabled=${this.processing}
              @input=${e => this._onLocInput(e.target.value)}
              @keydown=${e => this._onLocKeydown(e)}
              @blur=${() => this._onLocBlur()}>
            ${this._renderLocDropdown()}
          </div>
        ` : this.locCd ? html`
          <span class="location-confirmed">${this.locCd}</span>
          <button class="btn-loc-change"
            ?disabled=${this.processing}
            @click=${() => this._changeLocation()}>${TermsUtil.tButton('change') || '변경'}</button>
        ` : html`
          <span class="location-confirmed" style="opacity:0.4;">-</span>
        `}
      </div>

      <!-- 스텝 3: 적치 수량 입력 + 확정 버튼 (로케이션 확인 후 표시) -->
      ${this.locCd ? html`
        <div class="scan-step active">
          <span class="step-badge">3</span>
          <span class="step-label-text">${TermsUtil.tLabel('load_qty') || '적치 수량'}</span>
          <input type="number" id="putawayQtyInput"
            .value=${this.putawayQty}
            min="0"
            step="1"
            ?disabled=${this.processing}
            @input=${e => { this.putawayQty = parseFloat(e.target.value) || 0 }}>
          <button class="btn-confirm"
            ?disabled=${this.processing || !this.locCd}
            @click=${this._confirmPutaway}>
            ${TermsUtil.tButton('confirm') || '확정'}
          </button>
        </div>
      ` : ''}
    `
  }

  /** 추천 로케이션 칩 영역 렌더링 — 스텝 1 완료 후만 표시 */
  _renderRecommendedLocations() {
    const step1Done = this.scanStep === 'location' || !!this.locCd
    if (!step1Done) return ''

    if (this.loadingLocations) {
      return html`
        <div class="recommend-locs">
          <span class="rec-label">${TermsUtil.tLabel('recommend_location') || '추천 로케이션'}</span>
          <span class="loc-chip loading-chip">조회 중...</span>
        </div>
      `
    }

    if (!this.recommendedLocations.length) return ''

    return html`
      <div class="recommend-locs">
        <span class="rec-label">${TermsUtil.tLabel('recommend_location') || '추천 로케이션'}</span>
        ${this.recommendedLocations.map(loc => html`
          <button class="loc-chip" @click=${() => this._onScanLocation(loc.loc_cd)}>
            ${loc.loc_cd}
          </button>
        `)}
      </div>
    `
  }

  /** 로케이션 텍스트 입력 자동완성 드롭다운 렌더링 */
  _renderLocDropdown() {
    if (!this._locSearchResults.length) return ''
    return html`
      <div class="loc-dropdown">
        ${this._locSearchResults.map(loc => html`
          <div class="loc-dropdown-item" @click=${() => this._onScanLocation(loc.loc_cd)}>
            <span class="ld-cd">${loc.loc_cd}</span>
            ${loc.zone_cd ? html`<span class="ld-nm">${loc.zone_cd}</span>` : ''}
          </div>
        `)}
      </div>
    `
  }

  /**
   * 로케이션 텍스트 입력 핸들러 — 입력값으로 like 검색하여 드롭다운 갱신 (debounce 250ms)
   * @param {string} term - 현재까지 입력한 값
   */
  _onLocInput(term) {
    const value = (term || '').trim()
    clearTimeout(this._locSearchTimer)
    if (!value) {
      this._locSearchResults = []
      return
    }
    this._locSearchTimer = setTimeout(() => this._searchLocations(value), 250)
  }

  /**
   * 로케이션 like 검색 — 현재 창고(wh_cd)의 적치존(loc_type='STORE') 중 loc_cd가 입력값을 포함하는 로케이션
   * @param {string} term - 검색어
   */
  async _searchLocations(term) {
    const currentItem = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null
    const whCd = currentItem?.wh_cd || ''
    try {
      const filters = [
        { name: 'loc_cd', operator: 'like', value: term },
        { name: 'loc_type', operator: 'eq', value: 'STORE' }
      ]
      if (whCd) filters.push({ name: 'wh_cd', operator: 'eq', value: whCd })
      const res = await ServiceUtil.searchByPagination('locations', filters, null, 1, 10)
      this._locSearchResults = res?.items || []
    } catch (e) {
      console.warn('로케이션 검색 실패:', e)
      this._locSearchResults = []
    }
  }

  /** work 모드 탭 바 렌더링 */
  _renderWorkTabs() {
    return html`
    <div class="tabs">
      <div class="tab" ?activate=${'todo' === this.currentTabKey}
        @click=${() => (this.currentTabKey = 'todo')}>
        <span>${TermsUtil.tLabel('not_completed') || '미완료'}</span>
        <span class="badge">${this.workItems.length}</span>
      </div>
      <div class="tab" ?activate=${'done' === this.currentTabKey}
        @click=${() => (this.currentTabKey = 'done')}>
        <span>${TermsUtil.tLabel('completed') || '완료'}</span>
        <span class="badge">${this.doneItems.length}</span>
      </div>
    </div>
    `
  }

  /** work 모드 탭 콘텐츠 렌더링 */
  _renderWorkTabContent() {
    const isTodo = this.currentTabKey === 'todo'
    const items = isTodo ? this.workItems : this.doneItems

    if (!items.length) {
      return html`
        <div class="tab-content">
          <div class="empty-message">
            ${isTodo ? '미완료 항목 없음' : '완료 항목 없음'}
          </div>
        </div>
      `
    }

    return html`
      <div class="tab-content">
        ${items.map(item => {
      const isCurrent = isTodo && this.workItems.indexOf(item) === this.currentItemIndex
      const icon = isTodo ? (isCurrent ? '▶' : '☐') : '✅'

      // 상품 정보(전체폭) — 미완료/완료 공통
      const infoBlock = html`
              <div class="info">
                <div class="sku">${item.sku_nm || item.sku_cd}${item.sku_nm ? ` (${item.sku_cd})` : ''}</div>
                <div class="sub">
                  ${TermsUtil.tLabel('barcode')}: ${item.barcode} | ${TermsUtil.tLabel('qty')}: ${item.inv_qty}
                </div>
                <div class="sub">
                  ${TermsUtil.tLabel('expired_date')}: ${item.expired_date || '-'} | ${TermsUtil.tLabel('lot_no')}: ${item.lot_no || '-'}
                </div>
              </div>`

      // 완료 항목: 상품명이 잘리지 않도록 정보 행 / 인쇄·로케이션 행 2단 구조
      if (!isTodo) {
        return html`
            <div class="item-card done-card no-select">
              <div class="card-main">
                <span class="icon">${icon}</span>
                ${infoBlock}
              </div>
              <div class="card-actions">
                ${item.barcode && item.loc_cd ? html`
                  <button class="btn-print"
                    @click=${e => { e.stopPropagation(); this._printBarcode(item) }}>
                    🖨️ ${TermsUtil.tButton('print') || '인쇄'}
                  </button>
                  <span class="loc-badge done">${item.loc_cd || '-'}</span>
                ` : ''}
              </div>
            </div>
          `
      }

      return html`
            <div class="item-card ${isCurrent ? 'current' : ''} no-select">
              <span class="icon">${icon}</span>
              ${infoBlock}
              <span class="loc-badge">${item.inv_qty || 0}</span>
            </div>
          `
    })}
      </div>
    `
  }

  /** 상품 선택 팝업 렌더링 — 미완료(WAITING) 적치 항목 목록에서 선택 */
  _renderItemPicker() {
    if (!this._showItemPicker) return ''
    const items = this.workItems.filter(i => i.status === 'WAITING')
    return html`
      <div class="picker-backdrop" @click=${() => { this._showItemPicker = false }}>
        <div class="picker-sheet" @click=${e => e.stopPropagation()}>
          <div class="picker-handle"></div>
          <div class="picker-title">${TermsUtil.tText('select_one') || '상품 선택'} (${items.length})</div>
          ${items.length === 0
        ? html`<div class="picker-empty">미완료 항목 없음</div>`
        : items.map(item => html`
              <div class="picker-item" @click=${() => this._pickItem(item)}>
                <div class="p-nm">${item.sku_nm || item.sku_cd}${item.sku_nm ? ` (${item.sku_cd})` : ''}</div>
                <div class="p-sub">${item.barcode || '-'}· ${TermsUtil.tLabel('inv_qty') || '수량'} ${item.inv_qty || 0}</div>
                <div class="p-sub">${TermsUtil.tLabel('expired_date') || '소비기한'}: ${item.expired_date || '-'} · ${TermsUtil.tLabel('lot_no') || 'LOT NO.'}: ${item.lot_no || '-'}</div>
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
   * 팝업에서 상품 선택 — 바코드 스캔과 동일한 프로세스 실행
   * 선택 항목의 재고 바코드로 스캔 핸들러를 호출하여 로케이션 스텝으로 진행
   * @param {object} item - 선택된 미완료(WAITING) 항목
   */
  _pickItem(item) {
    this._showItemPicker = false
    if (!item?.barcode) return
    this._onScanBarcode(item.barcode)
  }

  /** complete 모드 렌더링 — 완료 통계 + 버튼 */
  _renderCompleteMode() {
    const elapsed = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0
    const min = Math.floor(elapsed / 60)
    const sec = elapsed % 60
    const doneCount = this.doneItems.length
    const totalCount = this.workItems.length + doneCount

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('processed') || '적치 완료!'}</h3>

        <div class="result-card">
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('rcv_no') || '입고번호'}</span>
            <span class="value">${this.currentRcvNo}</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tText('processed') || '처리 완료'}</span>
            <span class="value">${doneCount} / ${totalCount}건</span>
          </div>
          <div class="stat-row">
            <span class="label">${TermsUtil.tLabel('elapsed_time') || '소요 시간'}</span>
            <span class="value">${min}분 ${sec}초</span>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn-next" @click=${this._startNewWork}>
            ${TermsUtil.tLabel('next_work') || '다음 작업'}
          </button>
          <button class="btn-list" @click=${this._goBack}>
  ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /** 페이지 초기화 — 요약 건수 및 입고 목록 조회 */
  pageInitialized() {
    this.workItems = []
    this.currentRcvNo = ''
    this._loadReceivingList()
  }

  /**
   * 입고번호 스캔 핸들러 — 적치 대기 재고 목록 조회 후 work 모드 전환
   * @param {string} rcvNo
   */
  async _onScanRcvNo(rcvNo) {
    if (!rcvNo || this.processing) return

    // list 전체 로딩 오버레이(loading) 대신 processing 사용 — 화면 깜빡임 방지
    this.processing = true
    try {
      await this._loadWorkItems(rcvNo)

      if (!this.workItems.length && !this.doneItems.length) {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'warn', message: `적치 대기 재고가 없습니다: ${rcvNo}` }
        }))
        if (this._rcvNoInput) this._rcvNoInput.value = ''
        return
      }

      this.currentRcvNo = rcvNo
      this.startedAt = Date.now()
      this.currentTabKey = 'todo'
      this.lastFeedback = null
      this._resetScanStep()
      // 자동 선택하지 않음 — 사용자가 바코드 스캔 또는 상품 선택 팝업으로 직접 선택
      this.currentItemIndex = -1
      this.mode = 'work'

      setTimeout(() => this._focusBarcodeInput(), 200)
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '재고 조회에 실패했습니다' }
      }))
    } finally {
      this.processing = false
      if (this._rcvNoInput) this._rcvNoInput.value = ''
    }
  }

  /**
   * 재고 바코드 스캔 핸들러 (스텝 1)
   * inventories.barcode 값으로만 매칭 — 상품 코드/상품 바코드 입력 불허
   * @param {string} barcode
   */
  _onScanBarcode(barcode) {
    if (!barcode || this.processing) return

    const currentItem = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null

    // 1. 현재 항목과 재고 바코드 매칭
    if (currentItem && currentItem.barcode === barcode) {
      this.scannedBarcode = barcode
      this.scanStep = 'location'
      this._showFeedback(`${currentItem.sku_cd} 확인 — 로케이션을 스캔하세요`, 'success')
      this._resetBarcodeInput()
      this._loadRecommendedLocations(currentItem)
      setTimeout(() => this._focusLocationInput(), 100)
      return
    }

    // 2. 전체 미완료 항목에서 재고 바코드 검색
    const matchIndex = this.workItems.findIndex(
      item => item.status === 'WAITING' && item.barcode === barcode
    )

    if (matchIndex >= 0) {
      this.currentItemIndex = matchIndex
      this.scannedBarcode = barcode
      this.scanStep = 'location'
      this._showFeedback(`${this.workItems[matchIndex].sku_cd} 확인 — 로케이션을 스캔하세요`, 'success')
      this._resetBarcodeInput()
      this._loadRecommendedLocations(this.workItems[matchIndex])
      setTimeout(() => this._focusLocationInput(), 100)
      return
    }

    // 3. 이미 완료된 항목인지 확인 (doneItems는 STORED 항목만 보유)
    const doneItem = this.doneItems.find(item => item.barcode === barcode)

    if (doneItem) {
      this._showFeedback(`이미 적치 완료된 항목입니다: ${doneItem.sku_cd} → ${doneItem.loc_cd} `, 'warning')
    } else {
      this._showFeedback(`일치하는 재고 바코드를 찾을 수 없습니다: ${barcode} `, 'error')
      navigator.vibrate?.(200)
    }

    this._resetBarcodeInput()
  }

  /**
   * 로케이션 스캔/입력 핸들러 (스텝 2)
   * @param {string} locCd
   */
  async _onScanLocation(locCd, verify = false) {
    const value = (locCd || '').trim()
    if (!value || this.processing) return

    // 직접 입력/스캔 값은 실존 로케이션인지 검증 (추천칩·드롭다운 선택은 이미 검증된 값)
    if (verify) {
      const exists = await this._existsLocation(value)
      if (!exists) {
        this._showFeedback(`존재하지 않는 로케이션입니다: ${value}`, 'error')
        navigator.vibrate?.(200)
        return  // 확정하지 않고 입력/드롭다운 유지
      }
    }

    this.locCd = value
    this.scanStep = 'qty'
    const currentItem = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null
    this.putawayQty = currentItem ? (currentItem.inv_qty || 0) : 0
    this._showFeedback(`로케이션 확인: ${value} — 적치 수량을 확인하고 확정하세요`, 'success')
    // 자동완성 드롭다운 정리
    clearTimeout(this._locSearchTimer)
    this._locSearchResults = []
    if (this._locationInput) this._locationInput.value = ''
  }

  /**
   * 로케이션 입력 키다운 — Enter 시에만 확정(검증 포함). blur로는 확정하지 않는다.
   * @param {KeyboardEvent} e
   */
  _onLocKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this._onScanLocation(e.target.value, true)
    }
  }

  /**
   * 로케이션 입력 blur — 값을 확정하지 않고 드롭다운만 닫는다.
   * (드롭다운 항목 클릭이 blur보다 먼저 처리되도록 약간 지연)
   */
  _onLocBlur() {
    setTimeout(() => { this._locSearchResults = [] }, 200)
  }

  /**
   * 확정된 로케이션 변경 — 다시 로케이션 입력 단계로 복귀
   */
  _changeLocation() {
    if (this.processing || !this.locCd) return
    this.scanStep = 'location'
    this.locCd = ''
    this.putawayQty = 0
    clearTimeout(this._locSearchTimer)
    this._locSearchResults = []
    setTimeout(() => this._focusLocationInput(), 50)
  }

  /**
   * 로케이션 실존 여부 확인 — 현재 창고(wh_cd)의 동일 loc_cd 1건 조회
   * 조회 실패(네트워크 등) 시 true 반환하여 백엔드 최종 검증에 위임
   * @param {string} locCd
   * @returns {Promise<boolean>}
   */
  async _existsLocation(locCd) {
    const currentItem = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null
    const whCd = currentItem?.wh_cd || ''
    try {
      const filters = [{ name: 'loc_cd', operator: 'eq', value: locCd }]
      if (whCd) filters.push({ name: 'wh_cd', operator: 'eq', value: whCd })
      const res = await ServiceUtil.searchByPagination('locations', filters, null, 1, 1)
      return (res?.items?.length || 0) > 0
    } catch (e) {
      console.warn('로케이션 검증 실패:', e)
      return true
    }
  }

  /**
   * 적치 확정 API 호출
   * PUT /rest/inventory_trx/put_away/{inventory_id}
   */
  async _confirmPutaway() {
    const item = this.currentItemIndex >= 0 ? this.workItems[this.currentItemIndex] : null
    if (!item) {
      this._showFeedback('적치할 항목이 없습니다', 'warning')
      return
    }

    if (!this.locCd) {
      this._showFeedback('로케이션을 스캔해주세요', 'warning')
      return
    }

    // 적치 수량 검증 — 0 이하 / 재고 수량 초과 방지
    const qty = Number(this.putawayQty)
    if (!qty || qty <= 0) {
      this._showFeedback('적치 수량은 1 이상이어야 합니다', 'warning')
      return
    }
    if (qty > (item.inv_qty || 0)) {
      this._showFeedback(`적치 수량이 재고 수량(${item.inv_qty || 0})을 초과할 수 없습니다`, 'warning')
      return
    }

    this.processing = true
    try {
      // 콜백 패턴 대신 성공 여부를 플래그로 받아 await 흐름을 콜백 밖에서 유지
      let success = false
      let errMsg = null
      await ServiceUtil.restPut(`inventory_trx/put_away/${item.id}`, {
        barcode: item.barcode,
        loc_cd: this.locCd,
        inv_qty: this.putawayQty,
        to_qty: item.inv_qty
      }, null, null,
        () => { success = true },
        (err) => { errMsg = err?.msg || '적치 처리에 실패했습니다' }
      )

      if (success) {
        // 서버에서 최신 항목 목록 재조회
        await this._loadWorkItems(this.currentRcvNo)

        const completedCount = this.doneItems.length
        const totalCount = this.workItems.length + completedCount
        this._showFeedback(`적치 완료 (${completedCount} / ${totalCount})`, 'success')

        if (completedCount >= totalCount) {
          await this._onAllItemsCompleted()
        } else {
          // 자동으로 다음 항목을 선택하지 않음 — 사용자가 바코드 스캔/팝업으로 직접 선택
          this._resetScanStep()
          this.currentItemIndex = -1
          setTimeout(() => this._focusBarcodeInput(), 200)
        }
      } else if (errMsg) {
        this._showFeedback(errMsg, 'error')
        navigator.vibrate?.(200)
      }

    } catch (error) {
      this._showFeedback(error.message || '적치 처리에 실패했습니다', 'error')
      navigator.vibrate?.(200)

    } finally {
      this.processing = false
    }
  }

  /**
   * 적치 작업 완료 처리 — 미완료 항목이 있으면 확인 후 complete 모드 전환
   * 입고 주문 상태를 PUTAWAY → END로 업데이트
   */
  async _closeWork() {
    const remaining = this.workItems.filter(i => i.status === 'WAITING')
    if (remaining.length > 0) {
      const confirmed = await UiUtil.showAlertPopup(
        'label.confirm',
        `미완료 항목 ${remaining.length}건이 있습니다. 작업을 완료하시겠습니까?`,
        'question', 'confirm', 'cancel'
      )
      if (!confirmed) return
    }

    // 완료 처리 성공 시에만 complete 모드 전환 (실패 시 주문 상태가 안 바뀌므로 완료로 표시하지 않음)
    const ok = await this._completePutaway()
    if (ok) this.mode = 'complete'
  }

  /**
   * 모든 항목 완료 시 자동 complete 모드 전환
   * 입고 주문 상태를 PUTAWAY → END로 업데이트
   */
  async _onAllItemsCompleted() {
    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `모든 항목(${this.doneItems.length}건) 적치 완료.\n마감 처리하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return
    const ok = await this._completePutaway()
    if (ok) this.mode = 'complete'
  }

  /**
   * 입고 주문 적치 완료 처리 API 호출
   * POST /rest/inbound_trx/putaway/complete?rcv_no={rcvNo}
   * @returns {Promise<boolean>} 완료 처리 성공 여부 (실패 시 false — 호출부에서 complete 전환 차단)
   */
  async _completePutaway() {
    if (!this.currentRcvNo) return false
    let success = false
    let errMsg = null
    try {
      await ServiceUtil.restPost(
        `inbound_trx/putaway/complete?rcv_no=${encodeURIComponent(this.currentRcvNo)}`,
        {}, null, null,
        () => { success = true },
        (err) => { errMsg = err?.msg || err?.message || '적치 완료 처리에 실패했습니다' }
      )
    } catch (err) {
      errMsg = err?.message || '적치 완료 처리에 실패했습니다'
    }
    if (!success && errMsg) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: errMsg }
      }))
    }
    return success
  }

  /**
   * 새 작업 시작 — 목록 갱신 후 적치 대기(waiting_count > 0) 입고를 자동 선택
   */
  async _startNewWork() {
    await this._goBack()
    const next = this.receivingList.find(r => (r.waiting_count || 0) > 0)
    if (next) {
      this._onScanRcvNo(next.rcv_no)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '적치 대기 중인 입고가 없습니다' }
      }))
    }
  }

  /**
   * list 모드로 복귀 — 작업 상태 전체 초기화 후 요약·목록 재조회
   */
  async _goBack() {
    this.mode = 'list'
    this.currentRcvNo = ''
    this.workItems = []
    this.doneItems = []
    this.currentItemIndex = -1
    this.lastFeedback = null
    this.startedAt = null
    this.listFilter = 'ALL'
    this._comNm = ''
    this._showItemPicker = false
    this._resetScanStep()
    await this._loadReceivingList()
  }

  /**
   * 입고번호로 적치 대기(WAITING) + 완료(STORED) 재고 목록 재조회
   * @param {string} rcvNo
   */
  async _loadWorkItems(rcvNo) {
    try {
      const query = JSON.stringify([
        { name: 'rcv_no', operator: 'eq', value: rcvNo }
      ])
      const [waitingResult, doneResult] = await Promise.all([
        ServiceUtil.restGet(`inbound_trx/putaway/work_items?query=${encodeURIComponent(query)}&limit=200`),
        ServiceUtil.restGet(`inbound_trx/putaway/done_items?rcv_no=${encodeURIComponent(rcvNo)}`)
      ])
      this.workItems = waitingResult?.items || waitingResult || []
      this.doneItems = doneResult?.items || doneResult || []
      await this._loadComName()
    } catch (error) {
      console.error('적치 재고 목록 조회 실패:', error)
    }
  }

  /**
   * 화주사 코드 → 명칭 조회 (상단 요약 표시용)
   * 적치 항목의 화주사 코드(첫 항목 기준)로 companies에서 명칭을 조회한다.
   */
  async _loadComName() {
    const sample = this.workItems[0] || this.doneItems[0]
    const comCd = sample?.com_cd || ''
    this._comNm = comCd
    if (!comCd) return
    try {
      const res = await ServiceUtil.searchByPagination('companies', [{ name: 'com_cd', value: comCd }], null, 1, 1)
      const c = res?.items?.[0]
      if (c) this._comNm = c.com_nm || comCd
    } catch (e) {
      console.warn('화주사명 조회 실패:', e)
    }
  }

  /**
   * 새로고침 — 요약 건수 + 입고 목록 재조회 (list 모드 전용)
   */
  async _refresh() {
    await this._loadReceivingList()
  }

  /**
   * 적치 대기 입고 목록 조회 — 입고별 waiting/stored 건수 포함
   * GET /rest/inbound_trx/putaway/receiving-list
   */
  async _loadReceivingList() {
    try {
      const [data, vendorResult] = await Promise.all([
        ServiceUtil.restGet('inbound_trx/putaway/receiving_list'),
        ServiceUtil.restGet('vendors?select=vend_cd,vend_nm&limit=500')
      ])
      const vendors = vendorResult?.items || vendorResult || []
      this._vendorMap = Object.fromEntries(vendors.map(v => [v.vend_cd, v.vend_nm]))
      this.receivingList = data || []
    } catch (error) {
      console.error('입고 목록 조회 실패:', error)
      this.receivingList = []
    }
  }

  /**
   * 다음 WAITING 항목으로 인덱스 이동
   */
  _moveToNextItem() {
    const nextIdx = this.workItems.findIndex(i => i.status === 'WAITING')
    this.currentItemIndex = nextIdx
  }

  /**
   * 입고 목록 필터 토글 — 동일 카드 재클릭 시 전체(ALL)로 복귀
   * @param {string} filter — 'WAITING'(대기) | 'PUTAWAY'(작업중) | 'DONE'(완료)
   */
  _toggleListFilter(filter) {
    this.listFilter = this.listFilter === filter ? 'ALL' : filter
  }

  /**
   * 탭 목록에서 특정 항목 인덱스로 선택
   * @param {number} idx
   */
  _selectItemByIndex(idx) {
    this.currentItemIndex = idx
    this._resetScanStep()
    setTimeout(() => this._focusBarcodeInput(), 100)
  }

  /**
   * 피드백 메시지 표시
   * @param {string} message
   * @param {string} type — 'success' | 'error' | 'warning'
   */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }

  /**
   * 재고 바코드 라벨 PDF 출력
   * GET /rest/inventories/{barcode}/{loc_cd}/download_barcode
   * @param {object} item - 완료된 재고 항목 (barcode, loc_cd 사용)
   */
  async _printBarcode(item) {
    const barcode = encodeURIComponent(item.barcode)
    const locCd = encodeURIComponent(item.loc_cd)
    const isMobile = 'ontouchstart' in window

    if (isMobile) {
      let res = await operatoGet(`inventories/${barcode}/${locCd}/download_barcode`, {}, false)
      let data = await res.arrayBuffer()
      let fileObj = new Blob([data], { type: 'application/pdf' })
      let file = URL.createObjectURL(fileObj)
      PrintUtil.openPdfInNewTab(file)

      // 모바일: HTML 엔드포인트를 새 탭에서 열면 페이지 내부에서 window.print() 자동 실행
      // Android Chrome PDF 뷰어 탭에서는 외부 print() 호출이 무시되므로 HTML 방식 사용
      // const htmlUrl = `/rest/inventories/${barcode}/${locCd}/print_barcode_html`
      // window.open(htmlUrl, '_blank')

    } else {
      const inventory = await ServiceUtil.restGet(`inventories/find_by?barcode=${barcode}&loc_cd=${locCd}`)
      if (inventory && inventory.id) {
        MetaApi.openDynamicPopup(TermsUtil.tMenu('InventoryBarcode'), {
          "module": "metapage",
          "import": "pages/basic-pdf-element.js",
          "tagname": "basic-pdf-element",
          "menu": "InventoryBarcode",
          "size": "large",
          "title_field": "name"
        }, inventory, inventory.id, null)
      }
    }
  }

  /**
   * 추천 로케이션 조회
   * GET /rest/inbound_trx/putaway/recommend_locations
   * @param {object} item - 현재 재고 항목 (com_cd, wh_cd, sku_cd 사용)
   */
  async _loadRecommendedLocations(item) {
    this.recommendedLocations = []
    this.loadingLocations = true
    try {
      const params = new URLSearchParams({
        com_cd: item.com_cd || '',
        wh_cd: item.wh_cd || '',
        sku_cd: item.sku_cd || '',
        limit: '5'
      })
      const result = await ServiceUtil.restGet(`inbound_trx/putaway/recommend_locations?${params}`)
      this.recommendedLocations = result || []
    } catch (_) {
      this.recommendedLocations = []
    } finally {
      this.loadingLocations = false
    }
  }

  /**
   * 스캔 단계 초기화
   */
  _resetScanStep() {
    this.scanStep = 'barcode'
    this.scannedBarcode = ''
    this.locCd = ''
    this.putawayQty = 0
    this.recommendedLocations = []
    this.loadingLocations = false
    clearTimeout(this._locSearchTimer)
    this._locSearchResults = []
  }

  /**
   * 재고 바코드 입력 필드 초기화 및 포커스
   */
  _resetBarcodeInput() {
    if (this._barcodeInput) {
      this._barcodeInput.input.value = ''
      this._barcodeInput.input.focus()
    }
  }

  /**
   * 재고 바코드 입력 필드에 포커스
   */
  _focusBarcodeInput() {
    this._resetBarcodeInput()
  }

  /**
   * 로케이션 입력 필드에 포커스
   */
  _focusLocationInput() {
    if (this._locationInput) {
      this._locationInput.value = ''
      this._locationInput.focus()
    }
  }
}
