import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 보충 작업 화면 (W23-RE-2)
 *
 * 보충 지시 번호를 스캔하여 작업을 시작하고, 아이템별로 from_loc의 재고를
 * to_loc으로 이동한 뒤 완료 처리한다.
 *
 * 화면 모드: ready(지시 스캔) → work(아이템 작업) → complete(완료)
 */
@customElement('pda-oms-replenish')
export class PdaOmsReplenish extends connect(store)(PageView) {
  /** 화면 모드: ready / work / complete */
  @state() mode = 'ready'

  /** 보충 지시 정보 */
  @state() replenishOrder = null

  /** 보충 아이템 목록 */
  @state() replenishItems = []

  /** 현재 작업 중인 아이템 인덱스 */
  @state() currentItemIdx = 0

  /** 스캔한 재고 정보 */
  @state() scannedInventory = null

  /** 작업자가 수동 스캔한 도착 로케이션 코드 (to_loc_cd가 null인 아이템용) */
  @state() scannedToLocCd = null

  /** API 처리 중 */
  @state() processing = false

  /** 피드백 메시지 */
  @state() lastFeedback = null

  /** 보충 지시 번호 입력 */
  @query('#replenishInput') _replenishInput

  /** 도착 로케이션 스캔 입력 */
  @query('#toLocInput') _toLocInput

  /** 재고 바코드 스캔 입력 */
  @query('#barcodeInput') _barcodeInput

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

        /* ready 모드 */
        .ready-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          gap: 20px;
        }

        .ready-section .guide-icon { font-size: 56px; }
        .ready-section .guide-text {
          font-size: 15px;
          color: var(--md-sys-color-on-surface-variant, #666);
          text-align: center;
        }

        .ready-section ox-input-barcode {
          width: 100%;
          max-width: 320px;
        }

        /* 지시 정보 헤더 */
        .order-header {
          padding: 10px 14px 6px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          flex-shrink: 0;
        }

        .order-header .order-no {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-primary-container, #0d47a1);
        }

        .order-header .order-meta {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #555);
          margin-top: 2px;
        }

        .order-header .progress-bar-wrap {
          margin-top: 6px;
          height: 5px;
          background: rgba(0,0,0,0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .order-header .progress-bar {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 3px;
          transition: width 0.3s;
        }

        /* 아이템 목록 */
        .item-list {
          flex: 1;
          overflow-y: auto;
          padding: 6px 12px 4px;
        }

        .item-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 12px;
          margin-bottom: 6px;
          border-radius: 10px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 2px solid transparent;
          cursor: pointer;
        }

        .item-card.active {
          border-color: var(--md-sys-color-primary, #1976D2);
          background: #e8f0fe;
        }

        .item-card.done {
          border-color: #4caf50;
          background: #f1f8f1;
          opacity: 0.75;
        }

        .item-card .item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .item-card .sku {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .status-badge {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 10px;
        }

        .status-badge.waiting {
          background: #fff3e0;
          color: #e65100;
        }

        .status-badge.done {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .item-card .loc-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        .item-card .loc-arrow { color: var(--md-sys-color-primary, #1976D2); font-weight: 700; }

        .item-card .qty-row {
          display: flex;
          gap: 14px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .item-card .qty-row .val { font-weight: 600; color: var(--md-sys-color-on-surface, #333); }

        /* 바코드 스캔 영역 */
        .scan-area {
          padding: 8px 12px 4px;
          flex-shrink: 0;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .scan-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .scan-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface-container-lowest, #fff);
        }

        .scan-row.active {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .scan-row.done {
          border-color: #4caf50;
          background: #f1f8f1;
        }

        .scan-row .row-label {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #666);
          min-width: 72px;
        }

        .scan-row.active .row-label { color: var(--md-sys-color-primary, #1976D2); }
        .scan-row.done .row-label { color: #2e7d32; }

        .scan-row .confirmed-value {
          flex: 1;
          font-size: 14px;
          font-weight: 700;
          color: #2e7d32;
        }

        .scan-row .btn-clear {
          flex-shrink: 0;
          padding: 3px 8px;
          border: none;
          border-radius: 4px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #555);
          font-size: 11px;
          cursor: pointer;
        }

        .scan-row ox-input-barcode {
          flex: 1;
          --input-height: 28px;
          --input-font-size: 13px;
        }

        /* 스캔 확인 카드 */
        .confirm-card {
          margin: 6px 12px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #e8f0fe;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-shrink: 0;
        }

        .confirm-card .inv-info {
          flex: 1;
          min-width: 0;
        }

        .confirm-card .inv-sku {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .confirm-card .inv-meta {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #555);
          margin-top: 2px;
        }

        .confirm-card .btn-confirm {
          flex-shrink: 0;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .confirm-card .btn-cancel {
          flex-shrink: 0;
          padding: 8px 10px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #555);
          font-size: 12px;
          cursor: pointer;
        }

        /* 피드백 */
        .scan-feedback {
          margin: 3px 12px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .scan-feedback.success { background: #e8f5e9; color: #2e7d32; }
        .scan-feedback.error { background: #ffebee; color: #c62828; }
        .scan-feedback.warning { background: #fff8e1; color: #f57f17; }

        .loading-overlay {
          text-align: center;
          padding: 8px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 13px;
          flex-shrink: 0;
        }

        /* 완료 화면 */
        .complete-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px 24px;
          text-align: center;
          overflow-y: auto;
        }

        .complete-section .check-icon { font-size: 64px; margin-bottom: 12px; }

        .complete-section h3 {
          font-size: 20px;
          font-weight: 700;
          color: #4caf50;
          margin: 0 0 20px;
        }

        .result-card {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 12px;
          padding: 16px 20px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
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
          padding-bottom: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .result-card .stat-row:last-child { border-bottom: none; padding-bottom: 0; }
        .result-card .stat-row .r-label { color: var(--md-sys-color-on-surface-variant, #666); }
        .result-card .stat-row .r-value { font-weight: 600; color: var(--md-sys-color-on-surface, #222); }
        .result-card .stat-row .r-value.primary { color: var(--md-sys-color-primary, #1976D2); }
        .result-card .stat-row .r-value.success { color: #2e7d32; }

        .complete-section .btn-new {
          padding: 13px 32px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          cursor: pointer;
          width: 100%;
          max-width: 360px;
        }
      `
    ]
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: TermsUtil.tMenu('OmsReplenishWork') || '보충 작업'
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    if (this.mode === 'complete') return this._renderCompleteMode()
    if (this.mode === 'work') return this._renderWorkMode()
    return this._renderReadyMode()
  }

  /** ready 모드 렌더링 */
  _renderReadyMode() {
    return html`
      <div class="ready-section">
        <div class="guide-icon">📋</div>
        <div class="guide-text">${TermsUtil.tLabel('replenish_no') || '보충 지시 번호를 스캔하세요'}</div>
        <ox-input-barcode id="replenishInput"
          placeholder="${TermsUtil.tLabel('replenish_no') || '보충 지시 번호'}"
          ?disabled=${this.processing}
          @change=${e => this._onScanReplenishNo(e.target.value)}>
        </ox-input-barcode>
        ${this.processing ? html`<div class="loading-overlay">${TermsUtil.tText('loading') || '조회 중...'}</div>` : ''}
        ${this.lastFeedback ? html`
          <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
        ` : ''}
      </div>
    `
  }

  /** work 모드 렌더링 */
  _renderWorkMode() {
    const order = this.replenishOrder
    const items = this.replenishItems
    const doneCount = items.filter(i => i._done).length
    const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0
    const currentItem = items[this.currentItemIdx]

    return html`
      <!-- 지시 정보 헤더 -->
      <div class="order-header">
        <div class="order-no">${order?.replenish_no || ''}</div>
        <div class="order-meta">
          ${TermsUtil.tLabel('wh_cd') || '창고'}: ${order?.wh_cd || ''} ·
          ${doneCount}/${items.length} ${TermsUtil.tButton('complete') || '완료'}
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
      </div>

      <!-- 아이템 목록 -->
      <div class="item-list">
        ${items.map((item, idx) => html`
          <div class="item-card ${item._done ? 'done' : idx === this.currentItemIdx ? 'active' : ''}"
            @click=${() => this._selectItem(idx)}>
            <div class="item-top">
              <span class="sku">${item.sku_cd}${item.sku_nm ? ` · ${item.sku_nm}` : ''}</span>
              <span class="status-badge ${item._done ? 'done' : 'waiting'}">
                ${item._done ? (TermsUtil.tButton('complete') || '완료') : (TermsUtil.tLabel('wait') || '대기')}
              </span>
            </div>
            <div class="loc-row">
              <span>${item.from_loc_cd}</span>
              <span class="loc-arrow">→</span>
              <span>${item.to_loc_cd}</span>
            </div>
            <div class="qty-row">
              <span>${TermsUtil.tLabel('order_qty') || '지시'}: <span class="val">${item.order_qty}</span></span>
              <span>${TermsUtil.tLabel('result_qty') || '실적'}: <span class="val">${item.result_qty || 0}</span></span>
            </div>
          </div>
        `)}
      </div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      ${this.processing ? html`<div class="loading-overlay">${TermsUtil.tText('processing') || '처리 중...'}</div>` : ''}

      <!-- 재고 확인 카드 (바코드 스캔 완료 시) -->
      ${this.scannedInventory ? html`
        <div class="confirm-card">
          <div class="inv-info">
            <div class="inv-sku">${this.scannedInventory.sku_cd}${this.scannedInventory.sku_nm ? ` · ${this.scannedInventory.sku_nm}` : ''}</div>
            <div class="inv-meta">
              ${this.scannedInventory.loc_cd} → ${this._effectiveToLoc(currentItem)} ·
              ${TermsUtil.tLabel('inv_qty') || '수량'}: ${this.scannedInventory.inv_qty}
            </div>
          </div>
          <button class="btn-cancel" @click=${this._cancelScan}>✕</button>
          <button class="btn-confirm" ?disabled=${this.processing} @click=${this._confirmMove}>
            ${TermsUtil.tButton('confirm') || '이동 확인'}
          </button>
        </div>
      ` : currentItem && !currentItem._done ? html`
        <!-- 단계별 스캔 영역 -->
        <div class="scan-area">
          <!-- Step 1: to_loc 스캔 (to_loc_cd가 없는 아이템만) -->
          ${!currentItem.to_loc_cd ? html`
            <div class="scan-row ${this.scannedToLocCd ? 'done' : 'active'}">
              <span class="row-label">${TermsUtil.tLabel('to_loc_cd') || '도착 로케이션'}</span>
              ${this.scannedToLocCd ? html`
                <span class="confirmed-value">${this.scannedToLocCd}</span>
                <button class="btn-clear" @click=${this._clearToLoc}>변경</button>
              ` : html`
                <ox-input-barcode id="toLocInput"
                  placeholder="${TermsUtil.tLabel('scan_to_loc') || '도착 로케이션 스캔'}"
                  ?disabled=${this.processing}
                  @change=${e => this._onScanToLoc(e.target.value)}>
                </ox-input-barcode>
              `}
            </div>
          ` : ''}

          <!-- Step 2: 재고 바코드 스캔 -->
          <div class="scan-row ${!currentItem.to_loc_cd && !this.scannedToLocCd ? '' : 'active'}">
            <span class="row-label">${TermsUtil.tLabel('barcode') || '바코드'}</span>
            <ox-input-barcode id="barcodeInput"
              placeholder="${!currentItem.to_loc_cd && !this.scannedToLocCd
          ? (TermsUtil.tLabel('scan_to_loc_first') || '도착 로케이션 스캔 후 입력 가능')
          : (TermsUtil.tLabel('scan_barcode') || '출발지 재고 바코드 스캔')}"
              ?disabled=${this.processing || (!currentItem.to_loc_cd && !this.scannedToLocCd)}
              @change=${e => this._onScanBarcode(e.target.value)}>
            </ox-input-barcode>
          </div>

          <!-- 이동 경로 안내 -->
          <div class="scan-title" style="color: var(--md-sys-color-on-surface-variant, #888); font-weight: 400;">
            ${currentItem.from_loc_cd} → ${this._effectiveToLoc(currentItem) || '?'}
          </div>
        </div>
      ` : ''}
    `
  }

  /** complete 모드 렌더링 */
  _renderCompleteMode() {
    const order = this.replenishOrder
    const doneCount = this.replenishItems.filter(i => i._done).length
    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('Success to Process') || '보충 작업 완료!'}</h3>
        <div class="result-card">
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tLabel('replenish_no') || '보충 번호'}</span>
            <span class="r-value primary">${order?.replenish_no || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tLabel('wh_cd') || '창고'}</span>
            <span class="r-value">${order?.wh_cd || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tButton('complete') || '완료 아이템'}</span>
            <span class="r-value success">${doneCount}건</span>
          </div>
        </div>
        <button class="btn-new" @click=${this._reset}>
          ${TermsUtil.tButton('new_work') || '새 작업'}
        </button>
      </div>
    `
  }

  /** 페이지 초기화 */
  pageInitialized() {
    this._reset()
  }

  /**
   * 보충 지시 번호 스캔 핸들러
   * GET /rest/replenish_orders?query=[replenishNo=XXX]
   * POST /rest/replenish_orders/start/{id}
   * @param {string} replenishNo
   */
  async _onScanReplenishNo(replenishNo) {
    if (!replenishNo || this.processing) return
    this.processing = true
    try {
      // 보충 지시 조회
      const result = await ServiceUtil.restGet(
        `replenish_orders?query=${encodeURIComponent(JSON.stringify([{ name: 'replenishNo', value: replenishNo, operator: 'eq' }]))}&limit=1`
      )
      const orders = result?.items || []
      if (!orders.length) {
        this._showFeedback(`보충 지시를 찾을 수 없습니다: ${replenishNo}`, 'error')
        if (this._replenishInput) this._replenishInput.value = ''
        return
      }

      const order = orders[0]
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        this._showFeedback(`처리할 수 없는 상태입니다: ${order.status}`, 'error')
        if (this._replenishInput) this._replenishInput.value = ''
        return
      }

      // CREATED 상태면 시작 처리
      if (order.status === 'CREATED') {
        await ServiceUtil.restPost(`replenish_orders/start/${order.id}`, {})
        order.status = 'IN_PROGRESS'
      }

      // 아이템 조회
      const items = await ServiceUtil.restGet(`replenish_orders/${order.id}/items`)
      const enrichedItems = (Array.isArray(items) ? items : []).map(item => ({
        ...item,
        _done: (item.result_qty != null && item.result_qty > 0)
      }))

      this.replenishOrder = order
      this.replenishItems = enrichedItems
      this.currentItemIdx = enrichedItems.findIndex(i => !i._done)
      this.scannedToLocCd = null
      this.lastFeedback = null
      this.mode = 'work'

      const firstItem = enrichedItems[this.currentItemIdx]
      if (firstItem && !firstItem.to_loc_cd) {
        setTimeout(() => this._focusToLocInput(), 200)
      } else {
        setTimeout(() => this._focusBarcodeInput(), 200)
      }

    } catch (error) {
      this._showFeedback(error.message || '조회 실패', 'error')
      if (this._replenishInput) this._replenishInput.value = ''
    } finally {
      this.processing = false
    }
  }

  /**
   * 도착 로케이션 스캔 핸들러 (to_loc_cd가 null인 아이템용)
   * POST /rest/inventory_trx/validate_location_for_move
   * @param {string} locCd
   */
  async _onScanToLoc(locCd) {
    if (!locCd || this.processing) return
    this.processing = true
    try {
      const location = await ServiceUtil.restPost('inventory_trx/validate_location_for_move', {
        to_loc_cd: locCd
      })
      if (location && location.id) {
        this.scannedToLocCd = location.loc_cd
        this.lastFeedback = null
        if (this._toLocInput) this._toLocInput.value = ''
        setTimeout(() => this._focusBarcodeInput(), 150)
      } else {
        this._showFeedback('유효하지 않은 로케이션입니다', 'error')
        navigator.vibrate?.(200)
        if (this._toLocInput) this._toLocInput.value = ''
      }
    } catch (error) {
      this._showFeedback(error.message || '유효하지 않은 로케이션입니다', 'error')
      navigator.vibrate?.(200)
      if (this._toLocInput) this._toLocInput.value = ''
    } finally {
      this.processing = false
    }
  }

  /**
   * 재고 바코드 스캔 핸들러
   * POST /rest/inventory_trx/validate_barcode_for_move
   * @param {string} barcode
   */
  async _onScanBarcode(barcode) {
    if (!barcode || this.processing) return
    const currentItem = this.replenishItems[this.currentItemIdx]
    if (!currentItem) return

    const toLocCd = this._effectiveToLoc(currentItem)
    if (!toLocCd) return

    this.processing = true
    try {
      const inv = await ServiceUtil.restPost('inventory_trx/validate_barcode_for_move', {
        barcode,
        to_loc_cd: toLocCd
      })

      if (inv && inv.id) {
        this.scannedInventory = inv
        this.lastFeedback = null
      } else {
        this._showFeedback('이동 불가한 재고입니다', 'error')
        navigator.vibrate?.(200)
        if (this._barcodeInput) this._barcodeInput.value = ''
      }
    } catch (error) {
      this._showFeedback(error.message || '이동 불가한 재고입니다', 'error')
      navigator.vibrate?.(200)
      if (this._barcodeInput) this._barcodeInput.value = ''
    } finally {
      this.processing = false
    }
  }

  /**
   * 이동 확인 — move_inventory 후 items/{itemId}/complete 호출
   * POST /rest/inventory_trx/{id}/move_inventory
   * POST /rest/replenish_orders/{id}/items/{itemId}/complete
   */
  async _confirmMove() {
    const currentItem = this.replenishItems[this.currentItemIdx]
    const inv = this.scannedInventory
    if (!currentItem || !inv || this.processing) return

    const toLocCd = this._effectiveToLoc(currentItem)

    this.processing = true
    try {
      // 재고 물리 이동
      await ServiceUtil.restPost(`inventory_trx/${inv.id}/move_inventory`, {
        to_loc_cd: toLocCd,
        reason: 'REPLENISH'
      })

      // 아이템 완료 기록
      const completeResult = await ServiceUtil.restPost(
        `replenish_orders/${this.replenishOrder.id}/items/${currentItem.id}/complete`,
        { result_qty: inv.inv_qty }
      )

      // 로컬 상태 업데이트
      this.replenishItems = this.replenishItems.map((item, idx) =>
        idx === this.currentItemIdx
          ? { ...item, result_qty: inv.inv_qty, _done: true }
          : item
      )
      this.scannedInventory = null
      this.scannedToLocCd = null
      this._showFeedback(`${currentItem.sku_cd} 보충 완료 (${inv.inv_qty}개)`, 'success')

      // 완료 처리 여부 확인
      if (completeResult?.order_completed) {
        this.mode = 'complete'
        return
      }

      // 다음 미완료 아이템으로 이동
      const updatedItems = this.replenishItems
      let nextIdx = updatedItems.findIndex((item, idx) => idx > this.currentItemIdx && !item._done)
      if (nextIdx < 0) nextIdx = updatedItems.findIndex(item => !item._done)

      if (nextIdx >= 0) {
        this.currentItemIdx = nextIdx
        const nextItem = updatedItems[nextIdx]
        if (!nextItem.to_loc_cd) {
          setTimeout(() => this._focusToLocInput(), 150)
        } else {
          setTimeout(() => this._focusBarcodeInput(), 150)
        }
      } else {
        this.mode = 'complete'
      }

    } catch (error) {
      this._showFeedback(error.message || '처리 실패', 'error')
      navigator.vibrate?.(200)
    } finally {
      this.processing = false
    }
  }

  /**
   * 스캔 취소 — 바코드 재스캔 가능하도록 초기화
   */
  _cancelScan() {
    this.scannedInventory = null
    this.lastFeedback = null
    if (this._barcodeInput) this._barcodeInput.value = ''
    setTimeout(() => this._focusBarcodeInput(), 150)
  }

  /**
   * 도착 로케이션 초기화 — to_loc 재스캔
   */
  _clearToLoc() {
    this.scannedToLocCd = null
    this.scannedInventory = null
    this.lastFeedback = null
    if (this._barcodeInput) this._barcodeInput.value = ''
    setTimeout(() => this._focusToLocInput(), 150)
  }

  /**
   * 아이템 선택 (대기 아이템만 선택 가능)
   * @param {number} idx
   */
  _selectItem(idx) {
    if (this.replenishItems[idx]?._done) return
    this.currentItemIdx = idx
    this.scannedInventory = null
    this.scannedToLocCd = null
    this.lastFeedback = null
    const item = this.replenishItems[idx]
    if (item && !item.to_loc_cd) {
      setTimeout(() => this._focusToLocInput(), 150)
    } else {
      setTimeout(() => this._focusBarcodeInput(), 150)
    }
  }

  /**
   * 전체 초기화
   */
  _reset() {
    this.mode = 'ready'
    this.replenishOrder = null
    this.replenishItems = []
    this.currentItemIdx = 0
    this.scannedInventory = null
    this.scannedToLocCd = null
    this.lastFeedback = null
    this.processing = false
    setTimeout(() => {
      if (this._replenishInput) this._replenishInput.input?.focus()
    }, 200)
  }

  /**
   * 현재 아이템의 실제 도착 로케이션 반환
   * to_loc_cd가 있으면 그것을, 없으면 작업자가 스캔한 scannedToLocCd 반환
   * @param {Object} item
   */
  _effectiveToLoc(item) {
    return item?.to_loc_cd || this.scannedToLocCd || null
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
   * 도착 로케이션 입력 포커스
   */
  _focusToLocInput() {
    if (this._toLocInput) this._toLocInput.input?.focus()
  }

  /**
   * 바코드 입력 포커스
   */
  _focusBarcodeInput() {
    if (this._barcodeInput) this._barcodeInput.input?.focus()
  }
}
