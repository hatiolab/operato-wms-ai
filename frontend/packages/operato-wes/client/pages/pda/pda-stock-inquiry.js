import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'
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
@customElement('pda-stock-inquiry')
export class PdaStockInquiry extends connect(store)(PageView) {
  /** 화면 모드: list / detail / history / add */
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
    remarks: ''
  }
  /** 창고 목록 (select 옵션용) */
  @state() warehouses = []
  /** 화주사 목록 (select 옵션용) */
  @state() companies = []

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

        .search-row ox-input-barcode {
          flex: 1;
          --input-height: 30px;
          --input-font-size: 13px;
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
      title: TermsUtil.tMenu('InventoryWork') || '재고 조회'
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    switch (this.mode) {
      case 'detail': return this._renderDetailMode()
      case 'history': return this._renderHistoryMode()
      case 'add': return this._renderAddMode()
      default: return this._renderListMode()
    }
  }

  /** list 모드 렌더링 — 검색 조건 + 재고 목록 */
  _renderListMode() {
    return html`
      <div class="search-area">
        <div class="search-row">
          <span class="s-label">${TermsUtil.tLabel('barcode') || '바코드'}</span>
          <ox-input-barcode
            placeholder="${TermsUtil.tLabel('scan_barcode') || '재고 바코드 스캔/입력'}"
            @change=${e => this._onBarcodeChange(e.target.value)}>
          </ox-input-barcode>
        </div>
        <div class="search-row">
          <span class="s-label">${TermsUtil.tLabel('loc_cd') || '로케이션'}</span>
          <ox-input-barcode
            placeholder="${TermsUtil.tLabel('loc_cd') || '로케이션 코드 스캔/입력'}"
            @change=${e => { this.searchLocCd = e.target.value; this._search() }}>
          </ox-input-barcode>
        </div>
        <div class="search-row">
          <span class="s-label">${TermsUtil.tLabel('sku_cd') || '상품코드'}</span>
          <ox-input-barcode
            placeholder="${TermsUtil.tLabel('sku_cd') || '상품 코드/바코드 스캔/입력'}"
            @change=${e => { this.searchSkuCd = e.target.value; this._search() }}>
          </ox-input-barcode>
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
            재고 바코드·로케이션·상품 코드로\n재고를 조회하세요
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
            <span class="barcode-text">${inv.barcode}</span>
            <span class="status-badge ${statusCls}">${inv.status || '-'}</span>
          </div>
          <div class="sub-row">
            ${inv.sku_cd || '-'}${inv.sku_nm ? ` (${inv.sku_nm})` : ''}
          </div>
          <div class="sub-row">
            ${TermsUtil.tLabel('loc_cd') || '로케이션'}: ${inv.loc_cd || '-'}
            ${inv.lot_no ? ` · LOT: ${inv.lot_no}` : ''}
            ${inv.expired_date ? ` · ${inv.expired_date}` : ''}
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
        <span class="title">${TermsUtil.tButton('detail') || '재고 상세'}</span>
      </div>

      <div class="detail-body">
        <div class="detail-card">
          <div class="detail-barcode-area">
            <div class="detail-barcode">${inv.barcode}</div>
            <span class="status-badge ${statusCls}">${inv.status || '-'}</span>
          </div>

          ${this._detailRow(TermsUtil.tLabel('sku_cd') || 'SKU', `${inv.sku_cd || '-'}${inv.sku_nm ? ` (${inv.sku_nm})` : ''}`)}
          ${this._detailRow(TermsUtil.tLabel('loc_cd') || '로케이션', inv.loc_cd || '-', 'highlight')}
          ${this._detailRow(TermsUtil.tLabel('inv_qty') || '재고 수량', inv.inv_qty ?? '-')}
          ${this._detailRow(TermsUtil.tLabel('reserved_qty') || '할당 수량', inv.reserved_qty ?? '0', inv.reserved_qty > 0 ? 'danger' : '')}
          ${this._detailRow(TermsUtil.tLabel('lot_no') || 'LOT 번호', inv.lot_no || '-')}
          ${this._detailRow(TermsUtil.tLabel('expired_date') || '유효기간', inv.expired_date || '-')}
          ${this._detailRow(TermsUtil.tLabel('com_cd') || '화주사', inv.com_cd || '-')}
          ${this._detailRow(TermsUtil.tLabel('wh_cd') || '창고', inv.wh_cd || '-')}
          ${this._detailRow(TermsUtil.tLabel('rcv_no') || '입고번호', inv.rcv_no || '-')}
          ${this._detailRow(TermsUtil.tLabel('created_at') || '입고 시간', createdAt)}
          ${this._detailRow(TermsUtil.tLabel('last_tran_cd') || '마지막 트랜잭션', inv.last_tran_cd || '-')}
          ${this._detailRow(TermsUtil.tLabel('remarks') || '비고', inv.remarks || '-')}
        </div>
      </div>

      <div class="footer-area">
        <button class="btn-secondary" @click=${this._goHistory}>
          ${TermsUtil.tMenu('InventoryHist') || '이력 보기'}
        </button>
        <button class="btn-primary" @click=${this._goList}>
          ${TermsUtil.tButton('go_list') || '메인 화면'}
        </button>
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
    return html`
      <div class="header-bar">
        <button class="back-btn" @click=${() => (this.mode = 'detail')}>◀</button>
        <span class="title">${inv?.barcode || ''} · ${TermsUtil.tMenu('InventoryHist') || '재고 이력'}</span>
      </div>

      ${this.historyLoading ? html`
        <div class="loading-overlay">${TermsUtil.tLabel('loading') || '조회 중...'}</div>
      ` : this.historyItems.length > 0 ? html`
        <div class="result-count">${this.historyItems.length}건</div>
        <div class="history-list">
          ${this.historyItems.map(h => html`
            <div class="history-card">
              <div class="h-top">
                <span class="h-tran">${h.last_tran_cd || '-'}</span>
                <span class="h-seq">#${h.hist_seq || '-'}</span>
              </div>
              <div class="h-info">
                ${TermsUtil.tLabel('loc_cd') || '로케이션'}: ${h.loc_cd || '-'}
                · ${TermsUtil.tLabel('inv_qty') || '수량'}: ${h.inv_qty ?? '-'}
                ${h.lot_no ? ` · LOT: ${h.lot_no}` : ''}
                ${h.rcv_no ? ` · ${h.rcv_no}` : ''}
              </div>
              <div class="h-date">
                ${h.created_at ? h.created_at.substring(0, 16).replace('T', ' ') : '-'}
              </div>
            </div>
          `)}
        </div>
      ` : html`
        <div class="empty-guide">
          <div class="guide-icon">📋</div>
          <div class="guide-text">${TermsUtil.tLabel('no_history') || '이력 데이터가 없습니다'}</div>
        </div>
      `}

      <div class="footer-area">
        <button class="btn-secondary" @click=${() => (this.mode = 'detail')}>
          ${TermsUtil.tButton('back') || '뒤로'}
        </button>
      </div>
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
            ${TermsUtil.tLabel('sku_cd') || '상품 코드'}
            <span class="required">*</span>
          </label>
          <input type="text"
            placeholder="${TermsUtil.tLabel('sku_cd') || '상품 코드 입력'}"
            .value=${this.addForm.sku_cd}
            @input=${e => this._updateAddForm('sku_cd', e.target.value)}>
        </div>

        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('loc_cd') || '로케이션'}
            <span class="required">*</span>
          </label>
          <input type="text"
            placeholder="${TermsUtil.tLabel('loc_cd') || '로케이션 코드 입력'}"
            .value=${this.addForm.loc_cd}
            @input=${e => this._updateAddForm('loc_cd', e.target.value)}>
        </div>

        <div class="form-field">
          <label>
            ${TermsUtil.tLabel('inv_qty') || '재고 수량'}
            <span class="required">*</span>
          </label>
          <input type="number"
            min="1"
            placeholder="0"
            .value=${this.addForm.inv_qty}
            @input=${e => this._updateAddForm('inv_qty', e.target.value)}>
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

  /** 페이지 초기화 */
  pageInitialized() {
    this.mode = 'list'
    this.inventories = []
    this.searchBarcode = ''
    this.searchLocCd = ''
    this.searchSkuCd = ''
    this.lastFeedback = null
  }

  /**
   * 바코드 스캔/입력 시 자동 조회 트리거
   * @param {string} barcode
   */
  async _onBarcodeChange(barcode) {
    if (!barcode) return
    this.searchBarcode = barcode
    await this._search()
  }

  /**
   * 재고 검색 — 입력된 조건으로 inventories 조회
   * GET /rest/inventories?query=...
   */
  async _search() {
    const conditions = []

    if (this.searchBarcode) {
      conditions.push({ name: 'barcode', operator: 'eq', value: this.searchBarcode })
    }
    if (this.searchLocCd) {
      conditions.push({ name: 'loc_cd', operator: 'eq', value: this.searchLocCd })
    }
    if (this.searchSkuCd) {
      conditions.push({ name: 'sku_cd', operator: 'contains', value: this.searchSkuCd })
    }

    if (!conditions.length) {
      this._showFeedback('조회 조건을 하나 이상 입력하세요', 'warning')
      return
    }

    this.loading = true
    this.lastFeedback = null
    try {
      const query = JSON.stringify(conditions)
      const sort = JSON.stringify([{ name: 'created_at', desc: true }])
      const result = await ServiceUtil.restGet(
        `inventories?query=${encodeURIComponent(query)}&sort=${encodeURIComponent(sort)}&limit=100`
      )
      this.inventories = result?.items || result || []

      if (!this.inventories.length) {
        this._showFeedback('조회 결과가 없습니다', 'warning')
      }
    } catch (error) {
      this._showFeedback(error.message || '재고 조회에 실패했습니다', 'error')
    } finally {
      this.loading = false
    }
  }

  /**
   * 검색 조건 및 결과 초기화
   */
  _resetSearch() {
    this.searchBarcode = ''
    this.searchLocCd = ''
    this.searchSkuCd = ''
    this.inventories = []
    this.lastFeedback = null
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
   * GET /rest/inventory_hists/by_inventory_id/{id}
   */
  async _goHistory() {
    if (!this.selectedInventory) return

    this.mode = 'history'
    this.historyItems = []
    this.historyLoading = true
    try {
      const result = await ServiceUtil.restGet(
        `inventory_hists/by_inventory_id/${this.selectedInventory.id}`
      )
      this.historyItems = result || []
    } catch (error) {
      this._showFeedback(error.message || '이력 조회에 실패했습니다', 'error')
    } finally {
      this.historyLoading = false
    }
  }

  /**
   * 재고 추가 화면으로 이동 — 창고·화주사 마스터 로드
   */
  async _goAdd() {
    this.addForm = {
      wh_cd: '',
      com_cd: '',
      sku_cd: '',
      loc_cd: '',
      inv_qty: '',
      lot_no: '',
      expired_date: '',
      remarks: ''
    }
    this.lastFeedback = null
    this.mode = 'add'
    await this._loadMasterData()
  }

  /**
   * 창고·화주사 마스터 데이터 로드
   * GET /rest/warehouses, GET /rest/companies
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
      await ServiceUtil.restPost('inventory_trx/create_inventory', {
        wh_cd,
        com_cd,
        sku_cd,
        loc_cd,
        inv_qty: qty,
        lot_no: this.addForm.lot_no || null,
        expired_date: this.addForm.expired_date || null,
        remarks: this.addForm.remarks || null
      })

      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: `재고 추가 완료: ${sku_cd} → ${loc_cd}` }
      }))

      this._goList()
    } catch (error) {
      this._showFeedback(error.message || '재고 추가에 실패했습니다', 'error')
    } finally {
      this.processing = false
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
