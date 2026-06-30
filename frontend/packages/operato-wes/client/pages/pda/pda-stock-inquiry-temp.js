import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import '../../component/sku-barcode-input.js'
import '../../component/sku-search-input.js'
import '../../component/code-label.js'
import '../../component/code-select.js'
import '../../component/location-input.js'
import '../../component/numeric-keypad-input.js'
import '../../component/entity-label.js'
import { customElement, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { MetaApi, ServiceUtil, TermsUtil, UiUtil, PrintUtil } from '@operato-app/metapage/dist-client'
import '@operato-app/metapage/dist-client/components/input/operato-input-barcode'
import { operatoGet } from '@operato-app/operatofill'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 재고 조회 화면 (W23-SF-5)
 *
 * 재고 바코드·로케이션·상품 코드로 재고를 조회하고
 * 상세 정보 확인·이력 조회·신규 재고 추가를 수행하는 PDA 화면.
 *
 * 화면 모드:
 *   list    — 검색 조건 입력 + 재고 목록
 *   detail  — 재고 상세 정보
 *   history — 재고 이력 목록
 *   add     — 신규 재고 추가 폼
 */
@customElement('pda-stock-inquiry-temp')
export class PdaStockInquiryTemp extends connect(store)(PageView) {
  /** 화면 모드: list / detail / history / add / adjust */
  @state() mode = 'list'

  /** 검색 조건: 재고 바코드 */
  @state() searchBarcode = ''
  /** 검색 조건: 로케이션 코드 */
  @state() searchLocCd = ''
  /** 검색 조건: 상품 코드 또는 상품 바코드 */
  @state() searchSkuCd = ''
  /** 목록 로딩 중 */
  @state() loading = false
  /** API 처리 중 */
  @state() processing = false
  /** 조회된 재고 목록 */
  @state() inventories = []

  /** 상세 화면에 표시할 재고 */
  @state() selectedInventory = null
  /** 이력 목록 */
  @state() historyItems = []
  /** 이력 로딩 중 */
  @state() historyLoading = false

  /**
   * 신규 재고 추가 폼 데이터
   * POST /rest/inventory_trx/create_inventory 파라미터
   */
  @state() addForm = {
    wh_cd: '',
    com_cd: '',
    sku_cd: '',
    loc_cd: '',
    inv_qty: '',
    lot_no: '',
    expired_date: '',
    reason_cd: '',
    remarks: ''
  }
  /** 창고 목록 (select 옵션용) */
  @state() warehouses = []
  /** 화주사 목록 (select 옵션용) */
  @state() companies = []

  /** 바코드 입력 필드 값 유무 (placeholder overlay 제어용) */
  @state() _hasBarcodeValue = false
  /** 로케이션 스캔 후 해당 위치의 상품 목록 (상품 콤보용) */
  @state() _skuOptions = []
  /** 로케이션별 상품 목록 조회 중 */
  @state() _locSkuLoading = false

  /** 재고 조정 수량 입력값 */
  @state() _adjQty = ''
  /** 재고 조정 비고값 */
  @state() _adjReason = ''
  /** 재고 조정 사유 코드 선택값 */
  @state() _adjReasonCd = ''
  /** 재고 조정 사유 명 */
  _adjReasonNm = ''
  /** 재고 조정 소비기한 입력값 */
  @state() _adjExpiredDate = ''

  /** 피킹 유형: OUTBOUND(출고) | SET(세트) | PREPACK(선포장) */
  @state() _pickType = 'OUTBOUND'
  /** 피킹 수량 */
  @state() _pickQty = 0

  /** 재고 이동 To 로케이션 코드 */
  @state() _moveToLocCd = ''
  /** 재고 이동 수량 입력값 */
  @state() _moveQty = ''
  /** 재고 이동 사유 코드 선택값 */
  @state() _moveReasonCd = ''
  /** 재고 이동 사유 명 */
  _moveReasonNm = ''
  /** 재고 이동 To 로케이션 유효성 검증 결과 */
  @state() _moveToLocation = null

  /** 재고 병합 대상 바코드 입력값 */
  @state() _mergeBarcode = ''
  /** 재고 병합 대상 로케이션 코드 입력값 */
  @state() _mergeMergeLocCd = ''
  /** 재고 병합 사유 입력값 */
  @state() _mergeReason = ''
  /** 재고 병합 대상 재고 유효성 검증 결과 */
  @state() _mergeInventory = null

  /** 피드백 메시지 */
  @state() lastFeedback = null

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

        /* 헤더 바 (detail / history / add 모드) */
        .header-bar {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: var(--md-sys-color-surface-container-low, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
          gap: 6px;
        }

        .header-bar .back-btn {
          background: none;
          border: none;
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 18px;
          cursor: pointer;
          padding: 4px 6px;
          flex-shrink: 0;
        }

        .header-bar .title {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 검색 영역 */
        .search-area {
          padding: 10px 12px 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }

        .search-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-row .s-label {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          min-width: 56px;
          white-space: nowrap;
        }

        .search-row operato-input-barcode {
          flex: 1;
          --input-height: 30px;
          --input-font-size: 13px;
        }

        .search-row sku-barcode-input {
          flex: 1;
        }

        /* operato-input-barcode는 placeholder를 지원하지 않으므로
           wrapper + 절대위치 오버레이로 placeholder 효과를 구현 */
        .ox-input-wrapper {
          flex: 1;
          position: relative;
        }

        .ox-input-wrapper operato-input-barcode {
          width: 100%;
        }

        .ox-input-wrapper input {
          width: 100%;
          box-sizing: border-box;
        }

        .ox-placeholder {
          position: absolute;
          top: 50%;
          left: 8px;
          right: 40px;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--md-sys-color-outline, #aaa);
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          z-index: 1;
        }

        .ox-input-wrapper:focus-within .ox-placeholder {
          display: none;
        }

        .search-row input {
          flex: 1;
          padding: 6px 10px;
          height: 30px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-container-lowest, #fff);
          outline: none;
          box-sizing: border-box;
        }

        .search-row input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .search-row select {
          flex: 1;
          padding: 6px 10px;
          height: 30px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-container-lowest, #fff);
          outline: none;
          box-sizing: border-box;
          cursor: pointer;
        }

        .search-row select:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .search-row select:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .search-row location-input {
          flex: 1;
        }

        .btn-search {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 10px;
          background: var(--md-sys-color-secondary, #388E3C);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-search:active { opacity: 0.85; }

        /* 구분선 */
        .divider {
          height: 1px;
          background: var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        /* 결과 건수 */
        .result-count {
          padding: 4px 12px 2px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #888);
          flex-shrink: 0;
        }

        /* 재고 목록 */
        .inventory-list {
          flex: 1;
          overflow-y: auto;
          padding: 6px 12px;
        }

        .inventory-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin-bottom: 6px;
          border-radius: 10px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .inventory-card:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .inventory-card .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--md-sys-color-outline, #999);
        }

        .inventory-card .status-dot.stored { background: #4CAF50; }
        .inventory-card .status-dot.waiting { background: #FF9800; }
        .inventory-card .status-dot.hold { background: var(--md-sys-color-error, #d32f2f); }

        .inventory-card .info {
          flex: 1;
          min-width: 0;
        }

        .inventory-card .barcode-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
        }

        .inventory-card .barcode-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .inventory-card .sub-row {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .inventory-card .qty-col {
          flex-shrink: 0;
          text-align: right;
        }

        .inventory-card .qty-col .qty {
          font-size: 15px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .inventory-card .qty-col .reserved {
          font-size: 11px;
          color: var(--md-sys-color-error, #d32f2f);
        }

        /* 상태 배지 */
        .status-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #555);
          flex-shrink: 0;
        }

        .status-badge.stored { background: #e8f5e9; color: #2e7d32; }
        .status-badge.waiting { background: #fff3e0; color: #e65100; }
        .status-badge.hold { background: #ffebee; color: #c62828; }

        /* 빈 안내 */
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
          font-size: 52px;
          margin-bottom: 14px;
        }

        .empty-guide .guide-text {
          font-size: 14px;
          line-height: 1.6;
        }

        /* 하단 버튼 */
        .footer-area {
          display: flex;
          gap: 8px;
          padding: 8px 12px 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .footer-area button {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .footer-area.compact button {
          padding: 8px;
          font-size: 12px;
          border-radius: 8px;
        }

        .btn-primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-secondary {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #333);
        }

        .btn-primary:active { opacity: 0.85; }
        .btn-secondary:active { opacity: 0.8; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

        /* 상세 화면 */
        .detail-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px;
        }

        .detail-card {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .detail-card .detail-barcode-area {
          padding: 14px 16px 10px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .detail-card .detail-barcode {
          font-size: 20px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          letter-spacing: 1px;
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .detail-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid var(--md-sys-color-surface-variant, #f0f0f0);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row .d-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #888);
          flex-shrink: 0;
          min-width: 96px;
        }

        .detail-row .d-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 190px;
        }

        .detail-row .d-value.highlight {
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 15px;
        }

        .detail-row .d-value.danger {
          color: var(--md-sys-color-error, #d32f2f);
        }

        /* 이력 목록 */
        .history-list {
          flex: 1;
          overflow-y: auto;
          padding: 6px 12px;
        }

        .history-card {
          padding: 10px 12px;
          margin-bottom: 6px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .history-card .h-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .history-card .h-tran {
          font-size: 12px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .history-card .h-seq {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #aaa);
        }

        .history-card .h-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        .history-card .h-date {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #aaa);
          margin-top: 4px;
        }

        /* 재고 추가 폼 */
        .add-form {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-field {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-field label {
          flex-shrink: 0;
          width: 72px;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          text-align: right;
        }

        .form-field label .required {
          color: var(--md-sys-color-error, #d32f2f);
          margin-left: 2px;
        }

        .form-field operato-input-barcode {
          flex: 1;
        }

        .form-field code-select,
        .form-field location-input,
        .form-field numeric-keypad-input,
        .form-field sku-search-input {
          flex: 1;
          min-width: 0;
        }

        .btn-qty {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .btn-qty:active {
          opacity: 0.8;
        }

        .radio-group {
          flex: 1;
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .radio-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: normal;
          color: var(--md-sys-color-on-surface, #333);
          cursor: pointer;
          width: auto;
          text-align: left;
        }

        .radio-group input[type="radio"] {
          flex: none;
          width: 18px;
          height: 18px;
          accent-color: var(--md-sys-color-primary, #1976D2);
          cursor: pointer;
          margin: 0;
          padding: 0;
          border: none;
        }

        .form-field input,
        .form-field select {
          flex: 1;
          padding: 9px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-container-lowest, #fff);
          outline: none;
        }

        .form-field input:focus,
        .form-field select:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 피드백 */
        .scan-feedback {
          margin: 4px 12px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .scan-feedback.success { background: #e8f5e9; color: #2e7d32; }
        .scan-feedback.error { background: #ffebee; color: #c62828; }
        .scan-feedback.warning { background: #fff8e1; color: #f57f17; }

        /* 로딩 */
        .loading-overlay {
          text-align: center;
          padding: 30px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 13px;
          flex: 1;
        }
      `
    ]
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: TermsUtil.tMenu('InventoryWorkTemp') || '재고작업(임시)'
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    switch (this.mode) {
      case 'detail': return this._renderDetailMode()
      case 'history': return this._renderHistoryMode()
      case 'add': return this._renderAddMode()
      case 'adjust': return this._renderAdjustMode()
      case 'move': return this._renderMoveMode()
      case 'pick': return this._renderPickMode()
      case 'merge': return this._renderMergeMode()
      default: return this._renderListMode()
    }
  }

  /** list 모드 렌더링 — 검색 조건 + 재고 목록 */
  _renderListMode() {
    return html`
      <div class="search-area">
        <!-- 1. 상품 (상품 검색 컴포넌트) -->
        <div class="search-row">
          <span class="s-label">${TermsUtil.tLabel('sku') || '상품'}</span>
          <sku-search-input
            .value=${this.searchSkuCd}
            placeholder="${TermsUtil.tText('select_sku') || '상품 선택'}"
            @sku-select=${e => this._onSearchSkuSelect(e.detail)}>
          </sku-search-input>
        </div>
        <!-- 2. 로케이션 -->
        <div class="search-row">
          <span class="s-label">${TermsUtil.tLabel('loc_cd') || '로케이션'}</span>
          <location-input
            id="locCdInput"
            placeholder="${TermsUtil.tLabel('loc_cd') || '로케이션 코드 입력'}"
            @location-select=${e => this._onLocSelect(e.detail.loc_cd)}
            @location-clear=${this._onLocClear}>
          </location-input>
        </div>
        <!-- 3. 바코드 -->
        <div class="search-row">
          <span class="s-label">${TermsUtil.tLabel('barcode') || '바코드'}</span>
          <div class="ox-input-wrapper">
            <operato-input-barcode
              id="barcodeInput"
              @change=${e => this._onBarcodeChange(e.target.value)}>
            </operato-input-barcode>
            ${!this._hasBarcodeValue ? html`
              <span class="ox-placeholder">${TermsUtil.tLabel('scan_barcode') || '재고 바코드 스캔/입력'}</span>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="divider"></div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      ${this.loading ? html`
        <div class="loading-overlay">${TermsUtil.tLabel('loading') || '조회 중...'}</div>
      ` : this.inventories.length > 0 ? html`
        <div class="result-count">
          ${TermsUtil.tLabel('total') || '전체'} ${this.inventories.length}건
        </div>
        <div class="inventory-list">
          ${this.inventories.map(inv => this._renderInventoryCard(inv))}
        </div>
      ` : html`
        <div class="empty-guide">
          <div class="guide-icon">🔍</div>
          <div class="guide-text">
            로케이션·상품 코드·재고 바코드로 재고를 조회하세요
          </div>
        </div>
      `}

      <div class="footer-area compact">
        <button class="btn-search" @click=${this._search}>
          ${TermsUtil.tButton('search') || '조회'}
        </button>
        <button class="btn-secondary" @click=${this._resetSearch}>
          ${TermsUtil.tButton('reset') || '초기화'}
        </button>
        <button class="btn-primary" @click=${this._goAdd}>
          ${TermsUtil.tButton('add') || '재고 추가'}
        </button>
      </div>
    `
  }

  /**
   * 재고 카드 렌더링
   * @param {object} inv
   */
  _renderInventoryCard(inv) {
    const statusCls = (inv.status || '').toLowerCase()
    return html`
      <div class="inventory-card" @click=${() => this._goDetail(inv)}>
        <div class="status-dot ${statusCls}"></div>
        <div class="info">
          <div class="barcode-row">
            <span class="barcode-text">${inv.barcode}</span> | <span class="barcode-text">${inv.loc_cd}</span>
            <span class="status-badge ${statusCls}"><code-label code-name="INVENTORY_STATUS" .value=${inv.status || ''}></code-label></span>
          </div>
          <div class="sub-row">
            ${inv.sku_nm} (${inv.sku_cd})
          </div>
          <div class="sub-row">
            ${inv.expired_date ? `소비기한: ${inv.expired_date}` : ''} ${inv.lot_no ? ` | LOT No.: ${inv.lot_no}` : ''}
          </div>
        </div>
        <div class="qty-col">
          <div class="qty">${inv.inv_qty ?? 0}</div>
          ${inv.reserved_qty > 0 ? html`
            <div class="reserved">할당 ${inv.reserved_qty}</div>
          ` : ''}
        </div>
      </div>
    `
  }

  /** detail 모드 렌더링 — 재고 상세 정보 */
  _renderDetailMode() {
    const inv = this.selectedInventory
    if (!inv) return html``

    const statusCls = (inv.status || '').toLowerCase()
    const createdAt = inv.created_at ? inv.created_at.substring(0, 16).replace('T', ' ') : '-'

    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${this._goList}>◀</button>
        <span class="title">${inv.barcode} . ${TermsUtil.tButton('detail') || '재고 상세'}</span>
        <button class="btn-secondary" style="margin-left:auto; padding: 4px 10px; font-size:13px;" @click=${this._printBarcode}>
          🖨️ ${TermsUtil.tButton('print') || '인쇄'}
        </button>
      </div>

      <div class="detail-body">
        <div class="detail-card">
          <div class="detail-barcode-area">
            <div class="detail-barcode">로케이션: ${inv.loc_cd}</div>
            <span class="status-badge ${statusCls}"><code-label code-name="INVENTORY_STATUS" .value=${inv.status}></span>
          </div>

          ${this._detailRow(TermsUtil.tLabel('sku_cd') || 'SKU', `${inv.sku_cd || '-'}`)}
          ${this._detailRow(TermsUtil.tLabel('sku_nm') || '품명', `${inv.sku_nm}`)}
          ${this._detailRow(TermsUtil.tLabel('inv_qty') || '재고 수량', inv.inv_qty ?? '-')}
          ${this._detailRow(TermsUtil.tLabel('available_qty') || '가용 수량', (inv.inv_qty ?? 0) - (inv.reserved_qty ?? 0), 'highlight')}
          ${this._detailRow(TermsUtil.tLabel('reserved_qty') || '할당 수량', inv.reserved_qty ?? '0', inv.reserved_qty > 0 ? 'danger' : '')}
          ${this._detailRow(TermsUtil.tLabel('lot_no') || 'LOT 번호', inv.lot_no || '-')}
          ${this._detailRow(TermsUtil.tLabel('expired_date') || '유효기간', inv.expired_date || '-')}
          ${this._detailRow(TermsUtil.tLabel('com_cd') || '화주사', html`<entity-label table="companies" key-col="com_cd" display-col="com_nm" .value=${inv.com_cd || ''} .fallback=${inv.com_cd || '-'}></entity-label>`)}
          ${this._detailRow(TermsUtil.tLabel('wh_cd') || '창고', html`<entity-label table="warehouses" key-col="wh_cd" display-col="wh_nm" .value=${inv.wh_cd || ''} .fallback=${inv.wh_cd || '-'}></entity-label>`)}
          ${this._detailRow(TermsUtil.tLabel('rcv_no') || '입고번호', inv.rcv_no || '-')}
          ${this._detailRow(TermsUtil.tLabel('last_tran_cd') || '마지막 트랜잭션', html`<code-label code-name="INVENTORY_TRANSACTION" .value=${inv.last_tran_cd || ''}></code-label>`)}
          ${this._detailRow(TermsUtil.tLabel('remarks') || '비고', inv.remarks || '-')}
          ${this._detailRow(TermsUtil.tLabel('created_at') || '입고 시간', createdAt)}
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px; padding: 8px 12px 12px; border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0); flex-shrink:0;">
        <div class="footer-area compact" style="padding:0; border:none;">
          <button class="btn-secondary" @click=${this._goHistory}>
            ${TermsUtil.tMenu('InventoryHist') || '이력'}
          </button>
          <button class="btn-secondary" @click=${this._goMove}>
            ${TermsUtil.tButton('move') || '이동'}
          </button>
          <button class="btn-secondary" @click=${this._goMerge}>
            ${TermsUtil.tButton('merge') || '병합'}
          </button>
          <button class="btn-secondary" @click=${this._goAdjust}>
            ${TermsUtil.tButton('adjust') || '조정'}
          </button>
          <button class="btn-secondary"
            ?disabled=${inv.status === 'BAD'}
            @click=${this._goPick}>
            ${TermsUtil.tButton('picking') || '피킹'}
          </button>
        </div>
      </div>
    `
  }

  /**
   * 상세 행 렌더링 헬퍼
   * @param {string} label
   * @param {*} value
   * @param {string} valueCls
   */
  _detailRow(label, value, valueCls = '') {
    return html`
      <div class="detail-row">
        <span class="d-label">${label}</span>
        <span class="d-value ${valueCls}">${value}</span>
      </div>
    `
  }

  /** history 모드 렌더링 — 재고 이력 목록 */
  _renderHistoryMode() {
    const inv = this.selectedInventory
    let histSeq = this.historyItems.length

    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${() => (this.mode = 'detail')}>◀</button>
        <span class="title">${inv?.barcode || ''} · ${TermsUtil.tMenu('InventoryTran') || '재고 트랜잭션'}</span>
      </div>

      ${this.historyLoading ? html`
        <div class="loading-overlay">${TermsUtil.tLabel('loading') || '조회 중...'}</div>
      ` : this.historyItems.length > 0 ? html`
        <div class="result-count">${this.historyItems.length}건</div>
        <div class="history-list">
          ${this.historyItems.map(h => html`
            <div class="history-card">
              <div class="h-top">
                <span class="h-tran">${TermsUtil.tLabel('loc_cd') || '로케이션'}: ${h.loc_cd || '-'} / ${h.to_loc_cd || '-'}</span>
                <span class="h-seq">#${histSeq-- || '-'} <code-label code-name="INVENTORY_TRAN_TYPE" .value=${h.tran_type || ''}></code-label></span>
              </div>
              <div class="h-info">
                ${TermsUtil.tLabel('tran_qty') + ' (이전 / 이후)' || '변경 수량 (이전 / 이후)'}: ${h.before_qty ?? '-'} / ${h.after_qty ?? '-'}
              </div>
              <div class="h-info" style="margin-top:2px;">
                ${TermsUtil.tLabel('expired_date') || '소비기한'}: ${h.expired_date || '-'} ${TermsUtil.tLabel('reason') || '사유'}: <code-label code-name="INV_ADJUST_REASON" .value=${h.reason_cd || ''}></code-label>
              </div>
              <div class="h-date">
                ${h.worker_id} / ${h.tran_at}
              </div>
            </div>
          `)}
        </div>
      ` : html`
        <div class="empty-guide">
          <div class="guide-icon">📋</div>
          <div class="guide-text">${TermsUtil.tText('No Data') || '이력 데이터가 없습니다'}</div>
        </div>
      `}
    `
  }

  /** add 모드 렌더링 — 신규 재고 추가 폼 */
  _renderAddMode() {
    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${this._goList}>◀</button>
        <span class="title">${TermsUtil.tMenu('NewInventory') || '재고 추가'}</span>
      </div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      <div class="add-form">
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('wh_cd') || '창고'}
            <span class="required">*</span>
          </label>
          <select
            @change=${e => this._updateAddForm('wh_cd', e.target.value)}>
            <option value="">-- ${TermsUtil.tButton('select') || '선택'} --</option>
            ${this.warehouses.map(wh => html`
              <option value="${wh.wh_cd}" ?selected=${this.addForm.wh_cd === wh.wh_cd}>
                ${wh.wh_cd}${wh.wh_nm ? ` (${wh.wh_nm})` : ''}
              </option>
            `)}
          </select>
        </div>

        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('com_cd') || '화주사'}
            <span class="required">*</span>
          </label>
          <select
            @change=${e => this._updateAddForm('com_cd', e.target.value)}>
            <option value="">-- ${TermsUtil.tButton('select') || '선택'} --</option>
            ${this.companies.map(c => html`
              <option value="${c.com_cd}" ?selected=${this.addForm.com_cd === c.com_cd}>
                ${c.com_cd}${c.com_nm ? ` (${c.com_nm})` : ''}
              </option>
            `)}
          </select>
        </div>

        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('sku') || '상품'}
            <span class="required">*</span>
          </label>
          <sku-search-input
            .comCd=${this.addForm.com_cd}
            .value=${this.addForm.sku_cd}
            placeholder="${TermsUtil.tText('select_sku') || '상품 선택'}"
            @sku-select=${e => this._updateAddForm('sku_cd', e.detail.sku_cd)}>
          </sku-search-input>
        </div>

        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('loc_cd') || '로케이션'}
            <span class="required">*</span>
          </label>
          <location-input
            id="addLocInput"
            placeholder="${TermsUtil.tLabel('loc_cd') || '로케이션 코드 입력'}"
            @location-select=${e => this._updateAddForm('loc_cd', e.detail.loc_cd)}
            @location-clear=${() => this._updateAddForm('loc_cd', '')}>
          </location-input>
        </div>

        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('inv_qty') || '재고 수량'}
            <span class="required">*</span>
          </label>
          <button class="btn-qty"
            @click=${() => this._updateAddForm('inv_qty', Math.max(1, (Number(this.addForm.inv_qty) || 0) - 1))}>−</button>
          <numeric-keypad-input
            .value=${this.addForm.inv_qty}
            .min=${1}
            ?disabled=${this.processing}
            @change=${e => this._updateAddForm('inv_qty', e.detail.value)}>
          </numeric-keypad-input>
          <button class="btn-qty"
            @click=${() => this._updateAddForm('inv_qty', (Number(this.addForm.inv_qty) || 0) + 1)}>+</button>
        </div>

        <div class="form-field">
          <label>${TermsUtil.tLabel('lot_no') || 'LOT 번호'}</label>
          <input type="text"
            placeholder="${TermsUtil.tLabel('lot_no') || 'LOT 번호 입력'}"
            .value=${this.addForm.lot_no}
            @input=${e => this._updateAddForm('lot_no', e.target.value)}>
        </div>

        <div class="form-field">
          <label>${TermsUtil.tLabel('expired_date') || '유통기한'}</label>
          <input type="date"
            .value=${this.addForm.expired_date}
            @input=${e => this._updateAddForm('expired_date', e.target.value)}>
        </div>

        <div class="form-field">
          <label>${TermsUtil.tLabel('reason_cd') || '사유 코드'}</label>
          <code-select
            code-name="INV_NEW_REASON"
            .value=${this.addForm.reason_cd}
            @change=${e => this._updateAddForm('reason_cd', e.detail.value)}>
          </code-select>
        </div>

        <div class="form-field">
          <label>${TermsUtil.tLabel('remarks') || '비고'}</label>
          <input type="text"
            placeholder="${TermsUtil.tLabel('remarks') || '비고 입력'}"
            .value=${this.addForm.remarks}
            @input=${e => this._updateAddForm('remarks', e.target.value)}>
        </div>
      </div>

      <div class="footer-area">
        <button class="btn-primary"
          ?disabled=${this.processing}
          @click=${this._submitAdd}>
          ${this.processing
        ? (TermsUtil.tText('processing') || '처리 중...')
        : (TermsUtil.tButton('save') || '저장')}
        </button>
        <button class="btn-secondary" ?disabled=${this.processing} @click=${this._goList}>
          ${TermsUtil.tButton('cancel') || '취소'}
        </button>
      </div>
    `
  }

  /** adjust 모드 렌더링 — 재고 조정 폼 */
  _renderAdjustMode() {
    const inv = this.selectedInventory
    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${() => (this.mode = 'detail')}>◀</button>
        <span class="title">${inv?.barcode || '-'} . ${TermsUtil.tButton('adjust') || '재고 조정'}</span>
      </div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      <div class="add-form">
        <!-- 현재 재고 정보 (읽기 전용) -->
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_nm') || 'SKU 명'}</label>
          <input type="text" readonly .value=${inv?.sku_nm || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_cd') || 'SKU'}</label>
          <input type="text" readonly .value=${inv?.sku_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('loc_cd') || '로케이션'}</label>
          <input type="text" readonly .value=${inv?.loc_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('expired_date') || '소비기한'}</label>
          <input type="text" readonly .value=${inv?.expired_date || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('lot_no') || 'LOT 번호'}</label>
          <input type="text" readonly .value=${inv?.lot_no || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('inv_qty') || '재고 수량'}</label>
          <input type="text" readonly .value=${inv?.inv_qty ?? '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('reserved_qty') || '예약 수량'}</label>
          <input type="text" readonly .value=${inv?.reserved_qty ?? '0'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('available_qty') || '가용 수량'}</label>
          <input type="text" readonly .value=${(inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-primary, #1976D2); font-weight: 600;">
        </div>

        <div style="height:1px; background: var(--md-sys-color-outline-variant,#e0e0e0); margin: 4px 0;"></div>

        <!-- 조정 입력 -->
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('to_qty') || '조정 수량'}
            <span class="required">*</span>
          </label>
          <button class="btn-qty"
            @click=${() => (this._adjQty = Math.max(0, (this._adjQty || 0) - 1))}>−</button>
          <numeric-keypad-input
            .value=${this._adjQty}
            .min=${0}
            ?disabled=${this.processing}
            @change=${e => (this._adjQty = e.detail.value)}>
          </numeric-keypad-input>
          <button class="btn-qty"
            @click=${() => (this._adjQty = (this._adjQty || 0) + 1)}>+</button>
        </div>
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('reason_cd') || '사유 코드'}
            <span class="required">*</span>
          </label>
          <code-select
            code-name="INV_ADJUST_REASON"
            .value=${this._adjReasonCd}
            @change=${e => { this._adjReasonCd = e.detail.value; this._adjReasonNm = e.detail.label || '' }}>
          </code-select>
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('expired_date') || '소비기한'}</label>
          <input type="date"
            .value=${this._adjExpiredDate}
            ?disabled=${this.processing}
            @change=${e => (this._adjExpiredDate = e.target.value)}>
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('remarks') || '비고'}</label>
          <input type="text"
            placeholder="${TermsUtil.tLabel('remarks') || '비고 (선택)'}"
            .value=${this._adjReason}
            @input=${e => (this._adjReason = e.target.value)}>
        </div>
      </div>

      <div class="footer-area">
        <button class="btn-primary"
          ?disabled=${this.processing}
          @click=${this._submitAdjust}>
          ${this.processing
        ? (TermsUtil.tText('processing') || '처리 중...')
        : (TermsUtil.tButton('adjust') || '조정')}
        </button>
        <button class="btn-secondary" ?disabled=${this.processing}
          @click=${() => (this.mode = 'detail')}>
          ${TermsUtil.tButton('cancel') || '취소'}
        </button>
      </div>
    `
  }

  /** move 모드 렌더링 — 재고 부분/전체 이동 폼 */
  _renderMoveMode() {
    const inv = this.selectedInventory
    const availableQty = (inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)
    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${() => (this.mode = 'detail')}>◀</button>
        <span class="title">${inv?.barcode} . ${TermsUtil.tButton('move') || '재고 이동'}</span>
      </div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      <div class="add-form">
        <!-- 현재 재고 정보 (읽기 전용) -->
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_nm') || 'SKU 명'}</label>
          <input type="text" readonly .value=${inv?.sku_nm || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_cd') || 'SKU'}</label>
          <input type="text" readonly .value=${inv?.sku_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('from_loc_cd') || 'From 로케이션'}</label>
          <input type="text" readonly .value=${inv?.loc_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('expired_date') || '소비기한'}</label>
          <input type="text" readonly .value=${inv?.expired_date || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('lot_no') || 'LOT 번호'}</label>
          <input type="text" readonly .value=${inv?.lot_no || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('inv_qty') || '재고 수량'}</label>
          <input type="text" readonly .value=${inv?.inv_qty ?? '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('reserved_qty') || '예약 수량'}</label>
          <input type="text" readonly .value=${inv?.reserved_qty ?? '0'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('available_qty') || '가용 수량'}</label>
          <input type="text" readonly .value=${availableQty}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-primary, #1976D2); font-weight: 600;">
        </div>

        <div style="height:1px; background: var(--md-sys-color-outline-variant,#e0e0e0); margin: 4px 0;"></div>

        <!-- 이동 입력 -->
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('to_loc_cd') || 'To 로케이션'}
            <span class="required">*</span>
          </label>
          <location-input
            id="moveToLocInput"
            placeholder="${TermsUtil.tLabel('to_loc_cd') || 'To 로케이션 입력'}"
            @location-select=${e => this._onMoveToLocSelect(e.detail.loc_cd)}>
          </location-input>
        </div>
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('move_qty') || '이동 수량'}
            <span class="required">*</span>
          </label>
          <button class="btn-qty"
            @click=${() => (this._moveQty = Math.max(1, (this._moveQty || 0) - 1))}>−</button>
          <numeric-keypad-input
            .value=${this._moveQty}
            .min=${1}
            .max=${availableQty}
            ?disabled=${this.processing}
            @change=${e => (this._moveQty = e.detail.value)}>
          </numeric-keypad-input>
          <button class="btn-qty"
            @click=${() => (this._moveQty = Math.min(availableQty, (this._moveQty || 0) + 1))}>+</button>
        </div>
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('reason_cd') || '이동 사유'}
            <span class="required">*</span>
          </label>
          <code-select
            code-name="INV_MOVE_REASON"
            .value=${this._moveReasonCd}
            @change=${e => { this._moveReasonCd = e.detail.value; this._moveReasonNm = e.detail.label || '' }}>
          </code-select>
        </div>
      </div>

      <div class="footer-area">
        <button class="btn-primary"
          ?disabled=${this.processing}
          @click=${this._submitMove}>
          ${this.processing
        ? (TermsUtil.tText('processing') || '처리 중...')
        : (TermsUtil.tButton('move') || '이동')}
        </button>
        <button class="btn-secondary" ?disabled=${this.processing}
          @click=${() => (this.mode = 'detail')}>
          ${TermsUtil.tButton('cancel') || '취소'}
        </button>
      </div>
    `
  }

  /** pick 모드 렌더링 — 피킹 폼 */
  _renderPickMode() {
    const inv = this.selectedInventory
    const availableQty = (inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)

    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${() => (this.mode = 'detail')}>◀</button>
        <span class="title">${inv?.barcode} . ${TermsUtil.tButton('picking') || '피킹'}</span>
      </div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      <div class="add-form">
        <!-- 현재 재고 정보 (읽기 전용) -->
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_nm') || 'SKU 명'}</label>
          <input type="text" readonly .value=${inv?.sku_nm || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_cd') || 'SKU'}</label>
          <input type="text" readonly .value=${inv?.sku_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('from_loc_cd') || 'From 로케이션'}</label>
          <input type="text" readonly .value=${inv?.loc_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('available_qty') || '가용 수량'}</label>
          <input type="text" readonly .value=${availableQty}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-primary, #1976D2); font-weight: 600;">
        </div>

        <div style="height:1px; background: var(--md-sys-color-outline-variant,#e0e0e0); margin: 4px 0;"></div>

        <!-- 피킹 입력 -->
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('pick_type') || '피킹 유형'}
            <span class="required">*</span>
          </label>
          <div class="radio-group">
            <label>
              <input type="radio" name="pickType" value="OUTBOUND"
                ?checked=${this._pickType === 'OUTBOUND'}
                @change=${() => (this._pickType = 'OUTBOUND')}>
              출고
            </label>
            <label>
              <input type="radio" name="pickType" value="SET"
                ?checked=${this._pickType === 'SET'}
                @change=${() => (this._pickType = 'SET')}>
              세트
            </label>
            <label>
              <input type="radio" name="pickType" value="PREPACK"
                ?checked=${this._pickType === 'PREPACK'}
                @change=${() => (this._pickType = 'PREPACK')}>
              선포장
            </label>
          </div>
        </div>
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('pick_qty') || '피킹 수량'}
            <span class="required">*</span>
          </label>
          <button class="btn-qty"
            @click=${() => (this._pickQty = Math.max(1, (this._pickQty || 0) - 1))}>−</button>
          <numeric-keypad-input
            .value=${this._pickQty}
            .min=${1}
            .max=${availableQty}
            ?disabled=${this.processing}
            @change=${e => (this._pickQty = e.detail.value)}>
          </numeric-keypad-input>
          <button class="btn-qty"
            @click=${() => (this._pickQty = Math.min(availableQty, (this._pickQty || 0) + 1))}>+</button>
        </div>
      </div>

      <div class="footer-area">
        <button class="btn-primary"
          ?disabled=${this.processing}
          @click=${this._submitPick}>
          ${this.processing
        ? (TermsUtil.tText('processing') || '처리 중...')
        : (TermsUtil.tButton('picking') || '피킹')}
        </button>
        <button class="btn-secondary" ?disabled=${this.processing}
          @click=${() => (this.mode = 'detail')}>
          ${TermsUtil.tButton('cancel') || '취소'}
        </button>
      </div>
    `
  }

  /** merge 모드 렌더링 — 재고 병합 폼 */
  _renderMergeMode() {
    const inv = this.selectedInventory
    const validated = !!this._mergeInventory
    const availableQty = (inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)

    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${() => (this.mode = 'detail')}>◀</button>
        <span class="title">${inv?.barcode} . ${TermsUtil.tButton('merge') || '재고 병합'}</span>
      </div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''
      }

      <div class="add-form">
        <!-- 기준 재고 정보 (읽기 전용) -->
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_nm') || 'SKU 명'}</label>
          <input type="text" readonly .value=${inv?.sku_nm || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('sku_cd') || 'SKU'}</label>
          <input type="text" readonly .value=${inv?.sku_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('loc_cd') || '로케이션'}</label>
          <input type="text" readonly .value=${inv?.loc_cd || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('expired_date') || '소비기한'}</label>
          <input type="text" readonly .value=${inv?.expired_date || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('lot_no') || 'LOT 번호'}</label>
          <input type="text" readonly .value=${inv?.lot_no || '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('inv_qty') || '재고 수량'}</label>
          <input type="text" readonly .value=${inv?.inv_qty ?? '-'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('reserved_qty') || '예약 수량'}</label>
          <input type="text" readonly .value=${inv?.reserved_qty ?? '0'}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-on-surface-variant, #666);">
        </div>
        <div class="form-field">
          <label>${TermsUtil.tLabel('available_qty') || '가용 수량'}</label>
          <input type="text" readonly .value=${availableQty}
            style="background: var(--md-sys-color-surface-variant, #f5f5f5); color: var(--md-sys-color-primary, #1976D2); font-weight: 600;">
        </div>

        <div style="height:1px; background: var(--md-sys-color-outline-variant,#e0e0e0); margin: 4px 0;"></div>

        <!-- 병합 대상 입력 -->
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('merge_barcode') || '병합 바코드'}
            <span class="required">*</span>
          </label>
          <operato-input-barcode
            id="mergeBarcodeInput"
            placeholder="${TermsUtil.tLabel('merge_barcode') || '병합 바코드 스캔/입력'}"
            @change=${e => this._onMergeBarcodeChange(e.target.value)}>
          </operato-input-barcode>
        </div>
        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('loc_cd') || '로케이션'}
            <span class="required">*</span>
          </label>
          <location-input
            id="mergeLocCdInput"
            placeholder="${TermsUtil.tLabel('loc_cd') || '로케이션 입력'}"
            @location-select=${e => this._onMergeLocSelect(e.detail.loc_cd)}>
          </location-input>
        </div>
      ${validated ? html`
          <div class="scan-feedback success" style="margin:0;">
            ${this._mergeInventory.sku_cd || ''} · ${this._mergeInventory.loc_cd || ''} · ${this._mergeInventory.inv_qty ?? 0}개 확인
          </div>
        ` : ''
      }
    <div class="form-field">
      <label>
        ${TermsUtil.tLabel('reason') || '사유'}
        <span class="required">*</span>
      </label>
      <input type="text"
        placeholder="${TermsUtil.tLabel('reason') || '병합 사유 입력'}"
            .value=${this._mergeReason}
      @input=${e => (this._mergeReason = e.target.value)}>
    </div>
      </div >

      <div class="footer-area">
        <button class="btn-primary"
          ?disabled=${this.processing || !validated}
          @click=${this._submitMerge}>
          ${this.processing
        ? (TermsUtil.tText('processing') || '처리 중...')
        : (TermsUtil.tButton('merge') || '병합')}
        </button>
        <button class="btn-secondary" ?disabled=${this.processing}
          @click=${() => (this.mode = 'detail')}>
      ${TermsUtil.tButton('cancel') || '취소'}
        </button >
      </div >
      `
  }

  /** 페이지 초기화 */
  async pageInitialized() {
    this.mode = 'list'
    this.inventories = []
    this.searchBarcode = ''
    this.searchLocCd = ''
    this.searchSkuCd = ''
    this._skuOptions = []
    this._locSkuLoading = false
    this._hasBarcodeValue = false
    this.lastFeedback = null

    setTimeout(() => {
      const locInput = this.shadowRoot?.querySelector('#locCdInput')
      if (locInput) locInput.focus()
    }, 100)

    await this._loadMasterData()
  }

  /**
   * 바코드 스캔/입력 시 조회 후 바코드 입력 클리어 + 포커스 유지
   * @param {string} barcode
   */
  async _onBarcodeChange(barcode) {
    if (!barcode) {
      this.searchBarcode = ''
      this._hasBarcodeValue = false
      return
    }

    this._hasBarcodeValue = true
    this.searchBarcode = barcode
    await this._search()

    // 입력값 초기화 후 바코드 입력에 포커스 유지 (연속 스캔 대응)
    this.searchBarcode = ''
    this._hasBarcodeValue = false
    const oxInput = this.shadowRoot?.querySelector('#barcodeInput')
    const innerInput = oxInput?.shadowRoot?.querySelector('input')
    if (innerInput) {
      innerInput.value = ''
      innerInput.focus()
    }
  }

  /**
   * 상품 검색 컴포넌트에서 상품 선택 시 — 해당 상품(sku_cd)의 모든 재고를 즉시 조회
   * @param {object} detail - { sku_cd, sku_nm, sku }
   */
  async _onSearchSkuSelect(detail) {
    this.searchSkuCd = detail?.sku_cd || ''
    if (!this.searchSkuCd) {
      this.inventories = []
      return
    }
    await this._search()
  }

  /**
   * 로케이션 선택 시 — 선택된 상품 조건에 로케이션을 추가 필터로 적용하여 재조회
   * @param {string} locCd
   */
  async _onLocSelect(locCd) {
    this.searchLocCd = locCd
    await this._search()
  }

  /**
   * 로케이션 입력 클리어 시 — 로케이션 필터만 해제하고 (상품 조건이 있으면) 재조회
   */
  async _onLocClear() {
    this.searchLocCd = ''
    if (this.searchSkuCd || this.searchBarcode) {
      await this._search()
    } else {
      this.inventories = []
    }
  }

  /**
   * 재고 검색 — 입력된 조건으로 inventories 조회
   * GET /rest/inventories?query=...
   */
  async _search() {
    const conditions = [{ name: 'status', operator: 'eq', value: 'STORED' }]

    if (this.searchBarcode) {
      conditions.push({ name: 'barcode', operator: 'eq', value: this.searchBarcode })
    }
    if (this.searchLocCd) {
      conditions.push({ name: 'loc_cd', operator: 'eq', value: this.searchLocCd })
    }
    if (this.searchSkuCd) {
      conditions.push({ name: 'sku_cd', operator: 'eq', value: this.searchSkuCd })
    }

    if (!conditions.length) {
      this._showFeedback('조회 조건을 하나 이상 입력하세요', 'warning')
      return
    }

    this.loading = true
    this.lastFeedback = null
    try {
      const query = JSON.stringify(conditions)
      const result = await ServiceUtil.restGet(
        `inventories?query=${encodeURIComponent(query)}&limit=200`
      )
      const items = result?.items || result || []
      // 소비기한 정렬: ①소비기한 없음 최상단 ②임박순(가까운 날짜 먼저) ③같으면 재고수량 적은 순
      this.inventories = this._sortByExpiry(items)

      if (!this.inventories.length) {
        this._showFeedback('조회 결과가 없습니다', 'warning')
      }

    } catch (error) {
      this._updateErrorFeedback(error.message || '재고 조회에 실패했습니다')

    } finally {
      this.loading = false
    }
  }

  /**
   * 재고 목록 소비기한 정렬
   * ① 소비기한 없는(빈값) 재고를 최상단
   * ② 소비기한이 있는 것끼리는 임박한 순(가까운 날짜 먼저)
   * ③ 소비기한이 같으면 재고수량(inv_qty)이 적은 것부터
   * @param {Array} items
   * @returns {Array} 정렬된 배열
   */
  _sortByExpiry(items) {
    return [...items].sort((a, b) => {
      const ae = a.expired_date || ''
      const be = b.expired_date || ''
      if (!ae && be) return -1   // a는 소비기한 없음 → 위로
      if (ae && !be) return 1    // b는 소비기한 없음 → 위로
      if (ae !== be) return ae < be ? -1 : 1   // 임박순(오름차순)
      // 소비기한 동일(또는 둘 다 없음) → 재고수량 적은 순
      return (a.inv_qty ?? 0) - (b.inv_qty ?? 0)
    })
  }

  /**
   * 검색 조건 및 결과 초기화
   */
  _resetSearch() {
    this.searchBarcode = ''
    this.searchLocCd = ''
    this.searchSkuCd = ''
    this._hasBarcodeValue = false
    this._skuOptions = []
    this.inventories = []
    this.lastFeedback = null

    // operato-input-barcode (shadow DOM 내부 input 클리어)
    const barcodeEl = this.shadowRoot?.querySelector('#barcodeInput')
    const barcodeInner = barcodeEl?.shadowRoot?.querySelector('input')
    if (barcodeInner) barcodeInner.value = ''

    // location-input 컴포넌트 클리어
    const locInput = this.shadowRoot?.querySelector('#locCdInput')
    if (locInput) {
      locInput.clear()
    }
    // 상품 검색 컴포넌트는 .value=${this.searchSkuCd} 바인딩이라 searchSkuCd 초기화로 함께 해제됨
  }

  /**
   * 상세 화면으로 이동
   * @param {object} inv
   */
  _goDetail(inv) {
    this.selectedInventory = inv
    this.lastFeedback = null
    this.mode = 'detail'
  }

  /**
   * 이력 화면으로 이동 — 선택된 재고의 이력 조회
   * GET /rest/inventory_trans/by_inventory_id/{id}
   */
  async _goHistory() {
    if (!this.selectedInventory) return

    this.mode = 'history'
    this.historyItems = []
    this.historyLoading = true
    try {
      const result = await ServiceUtil.restGet(
        `inventory_trans/by_inventory_id/${this.selectedInventory.id}`
      )
      this.historyItems = result || []

    } catch (error) {
      this._updateErrorFeedback(error.message || '이력 조회에 실패했습니다')

    } finally {
      this.historyLoading = false
    }
  }

  /**
   * 재고 추가 화면으로 이동 — 창고·화주사 마스터 + 사유 코드 로드
   */
  async _goAdd() {
    this.addForm = {
      wh_cd: 'WH001',
      com_cd: 'GRAIN_ON',
      sku_cd: '',
      loc_cd: '',
      inv_qty: '',
      lot_no: '',
      expired_date: '',
      reason_cd: 'ADJUST',
      remarks: ''
    }
    this.lastFeedback = null
    this.mode = 'add'
  }

  /**
   * 창고·화주사 마스터 데이터 로드
   */
  async _loadMasterData() {
    try {
      const [whResult, comResult] = await Promise.all([
        ServiceUtil.restGet('warehouses?limit=200'),
        ServiceUtil.restGet('companies?limit=200')
      ])
      this.warehouses = whResult?.items || whResult || []
      this.companies = comResult?.items || comResult || []
    } catch (error) {
      console.error('마스터 데이터 로드 실패:', error)
    }
  }

  /**
   * 추가 폼 필드 업데이트
   * @param {string} field
   * @param {*} value
   */
  _updateAddForm(field, value) {
    this.addForm = { ...this.addForm, [field]: value }
  }

  /**
   * 신규 재고 저장
   * POST /rest/inventory_trx/create_inventory
   */
  async _submitAdd() {
    const { wh_cd, com_cd, sku_cd, loc_cd, inv_qty } = this.addForm

    if (!wh_cd || !com_cd || !sku_cd || !loc_cd || !inv_qty) {
      this._showFeedback('필수 항목(창고, 화주사, 상품코드, 로케이션, 수량)을 모두 입력하세요', 'warning')
      return
    }

    const qty = parseInt(inv_qty, 10)
    if (!qty || qty <= 0) {
      this._showFeedback('재고 수량은 1 이상이어야 합니다', 'warning')
      return
    }

    this.processing = true
    try {
      // 콜백 대신 성공 여부를 플래그로 받아 await 흐름을 콜백 밖에서 유지 (인쇄 확인 팝업 처리)
      let success = false
      let errMsg = null
      await ServiceUtil.restPost('inventory_trx/create_inventory', {
        wh_cd,
        com_cd,
        sku_cd,
        loc_cd,
        inv_qty: qty,
        lot_no: this.addForm.lot_no || null,
        expired_date: this.addForm.expired_date || null,
        reason_cd: this.addForm.reason_cd || null,
        remarks: this.addForm.remarks || null
      }, null, null,
        () => { success = true },
        (err) => { errMsg = err?.msg || '재고 추가에 실패했습니다' }
      )

      if (success) {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `재고 추가 완료: ${sku_cd} → ${loc_cd}` }
        }))

        // 저장 성공 → 라벨 인쇄 여부 확인
        const doPrint = await UiUtil.showAlertPopup(
          'label.confirm',
          TermsUtil.tText('confirm_print_label') || '재고 라벨을 인쇄하시겠습니까?',
          'question', 'confirm', 'cancel'
        )
        if (doPrint) {
          const created = await this._findCreatedInventory()
          if (created?.id) {
            // PDF 뷰어로 이동 — 뷰어에서 나가면 이미 초기화면이므로 그대로 복귀
            await this._openBarcodeLabel(created)
          } else {
            document.dispatchEvent(new CustomEvent('notify', {
              detail: { level: 'warn', message: '생성된 재고를 찾지 못해 인쇄를 건너뜁니다' }
            }))
          }
        }

        this._goList()

      } else if (errMsg) {
        this._updateErrorFeedback(errMsg)
      }

    } catch (error) {
      this._updateErrorFeedback(error.message || '재고 추가에 실패했습니다')

    } finally {
      this.processing = false
    }
  }

  /**
   * 방금 생성한 재고 재조회 — create_inventory 응답에 id가 없어 조건+최신순으로 1건 조회
   * @returns {Promise<object|null>} 가장 최근 생성된 일치 재고 (없으면 null)
   */
  async _findCreatedInventory() {
    const { wh_cd, com_cd, sku_cd, loc_cd, lot_no } = this.addForm
    try {
      const conditions = [
        { name: 'com_cd', operator: 'eq', value: com_cd },
        { name: 'wh_cd', operator: 'eq', value: wh_cd },
        { name: 'sku_cd', operator: 'eq', value: sku_cd },
        { name: 'loc_cd', operator: 'eq', value: loc_cd }
      ]
      if (lot_no) conditions.push({ name: 'lot_no', operator: 'eq', value: lot_no })
      const query = encodeURIComponent(JSON.stringify(conditions))
      const sort = encodeURIComponent(JSON.stringify([{ name: 'created_at', desc: true }]))
      const result = await ServiceUtil.restGet(`inventories?query=${query}&sort=${sort}&limit=1`)
      const items = result?.items || result || []
      return items[0] || null
    } catch (e) {
      console.error('생성 재고 재조회 실패:', e)
      return null
    }
  }

  /**
   * 재고 조정 화면으로 이동
   */
  _goAdjust() {
    const inv = this.selectedInventory
    this._adjQty = inv?.inv_qty ?? 0
    this._adjExpiredDate = inv?.expired_date || ''
    this._adjReason = ''
    this._adjReasonCd = ''
    this._adjReasonNm = ''
    this.lastFeedback = null
    this.mode = 'adjust'
  }

  /**
   * 피킹 화면으로 이동
   */
  _goPick() {
    const inv = this.selectedInventory
    // 불량(BAD) 재고는 피킹 불가
    if (inv?.status === 'BAD') {
      this._showFeedback('불량(파손) 재고는 피킹할 수 없습니다', 'warning')
      return
    }
    this._pickType = 'OUTBOUND'
    this._pickQty = (inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)
    this.lastFeedback = null
    this.mode = 'pick'
  }

  /**
   * 피킹 확정 API 호출
   * POST /rest/inventory_trx/{id}/pick_inventory
   */
  async _submitPick() {
    if (!this._pickQty || this._pickQty <= 0) {
      this._showFeedback('피킹 수량은 1 이상이어야 합니다', 'warning')
      return
    }

    const inv = this.selectedInventory
    const availableQty = (inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)
    if (this._pickQty > availableQty) {
      this._showFeedback(`피킹 수량(${this._pickQty})이 가용 수량(${availableQty})을 초과합니다`, 'warning')
      return
    }

    const toLocLabel = this._pickType === 'SET' ? 'VAS-01 (유통가공)' : this._pickType === 'PREPACK' ? 'PREPACK (선포장)' : 'STG-01 (출고대기)'

    this.processing = true
    try {
      await ServiceUtil.restPost(`inventory_trx/${inv.id}/pick_inventory`, {
        tran_cd: this._pickType,
        to_qty: this._pickQty
      }, null, null, () => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `피킹 완료: ${inv.barcode} → ${toLocLabel} (${this._pickQty})` }
        }))
        this._goList()
      }, (err) => {
        this._updateErrorFeedback(err?.msg || '피킹 처리에 실패했습니다')
      })
    } catch (error) {
      this._updateErrorFeedback(error?.message || '피킹 처리에 실패했습니다')
    } finally {
      this.processing = false
    }
  }

  /**
   * 재고 이동 화면으로 이동
   * 가용 수량을 이동 수량 기본값으로 설정하고 To 로케이션에 포커스
   */
  _goMove() {
    const inv = this.selectedInventory
    this._moveToLocCd = ''
    this._moveQty = (inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)
    this._moveReasonCd = ''
    this._moveReasonNm = ''
    this._moveToLocation = null
    this.lastFeedback = null
    this.mode = 'move'
    setTimeout(() => {
      this.shadowRoot?.querySelector('#moveToLocInput')?.focus()
    }, 100)
  }

  /**
   * To 로케이션 선택 후 유효성 검증
   * @param {string} locCd
   */
  async _onMoveToLocSelect(locCd) {
    if (locCd === this.selectedInventory?.loc_cd) {
      this._moveToLocCd = ''
      this._moveToLocation = null
      this.shadowRoot?.querySelector('#moveToLocInput')?.clear()
      this._updateErrorFeedback('현재 로케이션과 동일합니다. 다른 로케이션을 입력하세요.')
      return
    }

    try {
      await ServiceUtil.restPost('inventory_trx/validate_location_for_move', {
        to_loc_cd: locCd
      }, null, null, (res) => {
        this._moveToLocCd = locCd
        this._moveToLocation = res
        this._showFeedback(`${locCd} 로케이션 확인`, 'success')
      }, (err) => {
        this._moveToLocCd = ''
        this._moveToLocation = null
        this.shadowRoot?.querySelector('#moveToLocInput')?.clear()
        this._updateErrorFeedback(err?.msg || '유효하지 않은 로케이션입니다')
      })
    } catch (error) {
      this._moveToLocCd = ''
      this._moveToLocation = null
      this.shadowRoot?.querySelector('#moveToLocInput')?.clear()
      this._updateErrorFeedback(error?.message || '유효하지 않은 로케이션입니다')
    }
  }

  /**
   * 재고 이동 확정 API 호출
   * POST /rest/inventory_trx/{id}/move_inventory
   * to_qty 지정 시 서비스 레이어에서 자동 분할 처리
   */
  async _submitMove() {
    if (!this._moveToLocCd || !this._moveToLocation) {
      this._showFeedback('To 로케이션을 입력하고 유효성을 확인하세요', 'warning')
      return
    }
    if (!this._moveQty) {
      this._showFeedback('이동 수량을 입력하세요', 'warning')
      return
    }
    if (!this._moveReasonCd) {
      this._showFeedback('이동 사유 코드를 선택하세요', 'warning')
      return
    }

    const qty = this._moveQty
    if (!qty || qty <= 0) {
      this._showFeedback('이동 수량은 1 이상이어야 합니다', 'warning')
      return
    }

    const inv = this.selectedInventory
    const availableQty = (inv?.inv_qty ?? 0) - (inv?.reserved_qty ?? 0)
    if (qty > availableQty) {
      this._showFeedback(`이동 수량(${qty})이 가용 수량(${availableQty})을 초과합니다`, 'warning')
      return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost(`inventory_trx/${inv.id}/move_inventory`, {
        to_loc_cd: this._moveToLocCd,
        to_qty: qty,
        reason_cd: this._moveReasonCd,
        reason: this._moveReasonNm || null
      }, null, null, (res) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `재고 이동 완료: ${inv.barcode} → ${this._moveToLocCd} (${qty})` }
        }))
        this._goList()
      }, (err) => {
        this._updateErrorFeedback(err?.msg || '재고 이동에 실패했습니다')
      })

    } catch (error) {
      this._updateErrorFeedback(error?.message || '재고 이동에 실패했습니다')

    } finally {
      this.processing = false
    }
  }

  /**
   * 재고 병합 화면으로 이동
   * 병합 대상 입력 초기화 후 병합 바코드 입력에 포커스
   */
  _goMerge() {
    this._mergeBarcode = ''
    this._mergeMergeLocCd = ''
    this._mergeReason = ''
    this._mergeInventory = null
    this.lastFeedback = null
    this.mode = 'merge'
    setTimeout(() => {
      const oxInput = this.shadowRoot?.querySelector('#mergeBarcodeInput')
      const innerInput = oxInput?.shadowRoot?.querySelector('input')
      if (innerInput) innerInput.focus()
    }, 100)
  }

  /**
   * 병합 바코드 스캔/입력 처리
   * 로케이션도 입력된 경우 재고 존재 여부 즉시 검증
   * @param {string} barcode
   */
  async _onMergeBarcodeChange(barcode) {
    if (!barcode) return
    this._mergeBarcode = barcode
    this._mergeInventory = null
    if (this._mergeMergeLocCd) {
      await this._validateMergeInventory()
    } else {
      this.shadowRoot?.querySelector('#mergeLocCdInput')?.focus()
    }
  }

  /**
   * 병합 로케이션 선택 — 바코드도 입력된 경우 즉시 검증
   * @param {string} locCd
   */
  async _onMergeLocSelect(locCd) {
    this._mergeMergeLocCd = locCd
    this._mergeInventory = null
    if (this._mergeBarcode) {
      await this._validateMergeInventory()
    }
  }

  /**
   * 병합 대상 재고 존재 여부 검증 - TODO inventory_trx/validate_inventory_for_merge 로 변경 필요
   * POST /rest/inventory_trx/validate_inventory_for_merge
   * 존재하면 _mergeInventory에 저장, 오류 시 입력 초기화
   */
  async _validateMergeInventory() {
    const inv = this.selectedInventory

    // 기준 재고와 동일한 바코드 + 로케이션이면 자기 자신 병합 — 차단
    if (this._mergeBarcode === inv?.barcode && this._mergeMergeLocCd === inv?.loc_cd) {
      this.clearForValidateMergeFailed('기준 재고와 동일한 재고입니다. 다른 재고를 입력하세요.')
      return
    }

    try {
      await ServiceUtil.restPost('inventory_trx/validate_inventory_for_merge', {
        merge_barcode: this._mergeBarcode,
        merge_loc_cd: this._mergeMergeLocCd,
        base_inventory_id: inv?.id
      }, null, null, (res) => {
        this._mergeInventory = res
        this._showFeedback(
          `${res.sku_cd || ''} · ${res.loc_cd || ''} · ${res.inv_qty ?? 0}개 확인`,
          'success'
        )
      }, (err) => {
        this.clearForValidateMergeFailed(err?.msg || '병합 처리를 할 수 있는 재고가 아닙니다')
      })

    } catch (error) {
      this.clearForValidateMergeFailed(error?.message || '병합 처리를 할 수 있는 재고가 아닙니다')
    }
  }

  /**
   * 병합 대상 재고 검증 실패 시 입력값 초기화
   */
  clearForValidateMergeFailed(errMsg) {
    this._mergeInventory = null
    this._mergeBarcode = ''
    this._mergeMergeLocCd = ''

    const barcodeOx = this.shadowRoot?.querySelector('#mergeBarcodeInput')
    const innerBarcode = barcodeOx?.shadowRoot?.querySelector('input')
    if (innerBarcode) innerBarcode.value = ''

    this.shadowRoot?.querySelector('#mergeLocCdInput')?.clear()

    this._updateErrorFeedback(errMsg)
  }

  /**
   * 피드백 메시지 표시
   * @param {*} msg
   */
  _updateErrorFeedback(msg) {
    this._showFeedback(msg, 'error')
    navigator.vibrate?.(200)
  }

  /**
   * 재고 병합 확정 API 호출
   * POST /rest/inventory_trx/{id}/merge_inventory
   */
  async _submitMerge() {
    if (!this._mergeInventory) {
      this._showFeedback('병합 대상 재고를 확인하세요', 'warning')
      return
    }
    if (!this._mergeReason || !this._mergeReason.trim()) {
      this._showFeedback('병합 사유를 입력하세요', 'warning')
      return
    }

    const inv = this.selectedInventory
    this.processing = true

    try {
      await ServiceUtil.restPost(`inventory_trx/${inv.id}/merge_inventory`, {
        merge_barcode: this._mergeBarcode,
        merge_loc_cd: this._mergeMergeLocCd,
        reason: this._mergeReason.trim()
      }, null, null, (res) => {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: {
            level: 'info',
            message: `재고 병합 완료: ${this._mergeBarcode}(${this._mergeMergeLocCd}) → ${inv.barcode}`
          }
        }))
        this._goList()

      }, (err) => {
        this._updateErrorFeedback(err?.msg || '재고 병합에 실패했습니다')
      })

    } catch (error) {
      this._updateErrorFeedback(error.message || '재고 병합에 실패했습니다')

    } finally {
      this.processing = false
    }
  }

  /**
   * 재고 조정 확정 API 호출
   * POST /rest/inventory_trx/{id}/adjust_inventory
   */
  async _submitAdjust() {
    if (!this._adjQty && this._adjQty !== 0) {
      this._showFeedback('조정 수량을 입력하세요', 'warning')
      return
    }
    if (!this._adjReasonCd) {
      this._showFeedback('사유 코드를 선택하세요', 'warning')
      return
    }

    const qty = this._adjQty ?? 0
    const inv = this.selectedInventory
    const reservedQty = inv?.reserved_qty ?? 0
    const expiredDateChanged = this._adjExpiredDate !== (inv?.expired_date || '')
    if (qty === (inv?.inv_qty ?? 0) && !expiredDateChanged) {
      this._showFeedback('변경된 내용이 없습니다.', 'warning')
      return
    }
    if (qty < reservedQty) {
      this._showFeedback(`조정 수량(${qty})이 예약 수량(${reservedQty})보다 작을 수 없습니다`, 'warning')
      return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost(`inventory_trx/${inv.id}/adjust_inventory`, {
        to_qty: qty,
        expired_date: this._adjExpiredDate || null,
        remarks: this._adjReason?.trim() || null,
        reason_cd: this._adjReasonCd,
        reason: this._adjReasonNm || null
      }, null, null, (result) => {
        const diff = qty - (inv.inv_qty ?? 0)
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `재고 조정 완료: ${inv.barcode} (${inv.inv_qty} → ${qty}, ${diffStr})` }
        }))

        this.selectedInventory = result || inv
        this.lastFeedback = null
        this.mode = 'detail'
      }, (err) => {
        this._updateErrorFeedback(err?.msg || '재고 조정에 실패했습니다')
      })

    } catch (error) {
      this._updateErrorFeedback(error.message || '재고 조정에 실패했습니다')

    } finally {
      this.processing = false
    }
  }

  /**
   * 재고 바코드 라벨 인쇄
   */
  async _printBarcode() {
    await this._openBarcodeLabel(this.selectedInventory)
  }

  /**
   * 재고 바코드 라벨 인쇄 (입고작업 PDA pda-inbound-receiving 와 동일 방식)
   * - 모바일: download_barcode 를 ArrayBuffer로 받아 Blob URL 생성 후 PDF 뷰어 새 탭으로 표시
   * - PC: InventoryBarcode 동적 PDF 팝업 표시
   * @param {object} inv - 재고 객체 (id 사용)
   */
  async _openBarcodeLabel(inv) {
    if (!inv || !inv.id) {
      this._showFeedback('인쇄할 재고 정보가 없습니다', 'warning')
      return
    }
    try {
      const isMobile = 'ontouchstart' in window
      if (isMobile) {
        const res = await operatoGet(`inventories/${inv.id}/download_barcode`, {}, false)
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
        }, inv, inv.id, null)
      }
    } catch (err) {
      console.warn('재고 라벨 인쇄 실패:', err)
      this._showFeedback(TermsUtil.tText('print_failed') || '라벨 인쇄 중 오류가 발생했습니다', 'error')
    }
  }

  /**
   * 메인 목록 화면으로 복귀
   */
  _goList() {
    this.mode = 'list'
    this.selectedInventory = null
    this.historyItems = []
    this.lastFeedback = null
  }

  /**
   * 피드백 메시지 표시
   * @param {string} message
   * @param {string} type — 'success' | 'error' | 'warning'
   */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }
}
