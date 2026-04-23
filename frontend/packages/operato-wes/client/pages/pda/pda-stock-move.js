import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 재고 이동 작업 화면 (W23-SF-4)
 *
 * 재고 바코드를 스캔하여 현재 재고 정보를 확인하고,
 * 목적지 로케이션을 스캔한 뒤 이동을 확정한다.
 *
 * 화면 모드: scan(바코드·로케이션 스캔) → complete(완료 확인)
 */
@customElement('pda-stock-move')
export class PdaStockMove extends connect(store)(PageView) {
  /**
   * 화면 모드
   *  'scan'     — 바코드·로케이션 스캔 단계
   *  'complete' — 이동 완료 결과 표시
   */
  @state() mode = 'scan'

  /**
   * 스캔 단계
   *  'barcode'  — 재고 바코드 스캔 대기
   *  'location' — 목적지 로케이션 스캔 대기
   */
  @state() scanStep = 'barcode'

  /** API 처리 중 */
  @state() processing = false

  /** 스캔한 재고 정보 */
  @state() inventory = null

  /** 목적지 로케이션 코드 */
  @state() toLocCd = ''

  /** 이동 사유 */
  @state() reason = ''

  /** 마지막 스캔 피드백 */
  @state() lastFeedback = null

  /** 마지막 완료 이동 정보 */
  @state() lastMove = null

  /** 재고 바코드 스캔 입력 */
  @query('#barcodeInput') _barcodeInput

  /** 로케이션 스캔 입력 */
  @query('#locationInput') _locationInput

  /** 이동 사유 입력 */
  @query('#reasonInput') _reasonInput

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

        /* 요약 카드 */
        .summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--md-sys-color-surface-container-low, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .summary-bar .summary-label {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .summary-bar .summary-count {
          font-size: 16px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-bar .btn-refresh {
          padding: 4px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .summary-bar .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* 안내 영역 */
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
          font-size: 56px;
          margin-bottom: 16px;
        }

        .empty-guide .guide-text {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .empty-guide .guide-sub {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #aaa);
        }

        /* 바코드 스캔 영역 */
        .barcode-scan-area {
          padding: 10px 12px 4px;
        }

        .scan-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 1px 4px rgba(25, 118, 210, 0.15);
          border: 2px solid var(--md-sys-color-primary, #1976D2);
        }

        .scan-row.inactive {
          border-color: var(--md-sys-color-outline-variant, #e0e0e0);
          box-shadow: none;
          background: var(--md-sys-color-surface-container-lowest, #fff);
        }

        .scan-row .step-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .scan-row .step-badge.done-badge {
          background: #4CAF50;
        }

        .scan-row .step-label {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
          white-space: nowrap;
          min-width: 60px;
        }

        .scan-row.inactive .step-label {
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .scan-row ox-input-barcode {
          flex: 1;
          min-width: 0;
          --input-height: 28px;
          --input-font-size: 13px;
        }

        .scan-row .confirmed-value {
          flex: 1;
          font-size: 15px;
          font-weight: bold;
          color: #2e7d32;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .scan-row.inactive .confirmed-value {
          color: var(--md-sys-color-on-surface-variant, #999);
          font-weight: normal;
          font-size: 13px;
        }

        /* 재고 정보 카드 */
        .inventory-card {
          margin: 8px 12px;
          padding: 12px 14px;
          border-radius: 10px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .inventory-card .barcode-text {
          font-size: 18px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .inventory-card .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 12px;
        }

        .inventory-card .info-item {
          display: flex;
          flex-direction: column;
        }

        .inventory-card .info-item .info-label {
          font-size: 11px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          opacity: 0.75;
          margin-bottom: 1px;
        }

        .inventory-card .info-item .info-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .inventory-card .info-item .info-value.loc {
          font-size: 15px;
          color: var(--md-sys-color-error, #d32f2f);
        }

        /* 이동 사유 입력 */
        .reason-area {
          padding: 4px 12px;
        }

        .reason-area label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 4px;
        }

        .reason-area input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-sizing: border-box;
          outline: none;
        }

        .reason-area input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 확정 버튼 */
        .confirm-area {
          padding: 8px 12px;
        }

        .btn-confirm-move {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .btn-confirm-move:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-confirm-move:active:not(:disabled) {
          opacity: 0.85;
        }

        /* 피드백 */
        .scan-feedback {
          margin: 4px 12px;
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

        /* 완료 화면 */
        .complete-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px 24px;
          text-align: center;
          flex: 1;
        }

        .complete-section .check-icon {
          font-size: 72px;
          margin-bottom: 16px;
        }

        .complete-section h3 {
          font-size: 22px;
          font-weight: 700;
          color: #4caf50;
          margin: 0 0 24px;
        }

        .result-card {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 12px;
          padding: 18px 22px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 28px;
          text-align: left;
        }

        .result-card .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .result-card .stat-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .result-card .stat-row .r-label {
          color: var(--md-sys-color-on-surface-variant, #666);
          flex-shrink: 0;
          margin-right: 8px;
        }

        .result-card .stat-row .r-value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .result-card .stat-row .r-value.arrow {
          color: var(--md-sys-color-primary, #1976D2);
        }

        .complete-section .btn-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 360px;
        }

        .complete-section .btn-group button {
          padding: 14px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-continue {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-back {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #333);
        }

        /* 로딩 */
        .loading-overlay {
          text-align: center;
          padding: 20px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 13px;
        }
      `
    ]
  }

  /** 페이지 컨텍스트 반환 */
  get context() {
    return {
      title: TermsUtil.tMenu('InventoryMoveWork') || '재고 이동'
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    if (this.mode === 'complete') {
      return this._renderCompleteMode()
    }
    return this._renderScanMode()
  }

  /** scan 모드 렌더링 — 바코드·로케이션 스캔 단계 */
  _renderScanMode() {
    return html`
      <!--div class="summary-bar">
        <div>
          <span class="summary-label"></span>
          <span class="summary-count"></span>
        </div>
        <button class="btn-refresh" @click=${this._reset}>
          ${TermsUtil.tButton('reset') || '초기화'}
        </button>
      </div-->

      ${this.processing ? html`
        <div class="loading-overlay">${TermsUtil.tText('processing') || '처리 중...'}</div>
      ` : ''}

      <!-- 스텝 1: 재고 바코드 스캔 -->
      <div class="barcode-scan-area">
        <div class="scan-row ${this.scanStep !== 'barcode' ? 'inactive' : ''}">
          <span class="step-badge ${this.inventory ? 'done-badge' : ''}">
            ${this.inventory ? '✓' : '1'}
          </span>
          <span class="step-label">${TermsUtil.tLabel('barcode') || '바코드'}</span>
          ${this.scanStep === 'barcode' ? html`
            <ox-input-barcode id="barcodeInput"
              placeholder="${TermsUtil.tLabel('scan_barcode') || '재고 바코드 스캔'}"
              ?disabled=${this.processing}
              @change=${e => this._onScanBarcode(e.target.value)}>
            </ox-input-barcode>
          ` : html`
            <span class="confirmed-value">${this.inventory?.barcode || ''}</span>
          `}

          <button class="btn-back" @click=${this._reset}>
            ${TermsUtil.tButton('reset') || '처음으로'}
          </button>
        </div>
      </div>

      <!-- 재고 정보 카드 -->
      ${this.inventory ? html`
        <div class="inventory-card">
          <div class="barcode-text">${this.inventory.barcode}</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('com_cd') || '화주사'}</span>
              <span class="info-value">${this.inventory.com_cd || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('sku_cd') || 'SKU'}</span>
              <span class="info-value">${this.inventory.sku_cd || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('sku_nm') || 'SKU명'}</span>
              <span class="info-value">${this.inventory.sku_nm || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('lot_no') || 'LOT'}</span>
              <span class="info-value">${this.inventory.lot_no || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('inv_qty') || '재고 수량'}</span>
              <span class="info-value">${this.inventory.inv_qty ?? '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('reserved_qty') || '할당 수량'}</span>
              <span class="info-value">${this.inventory.reserved_qty ?? '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('expired_date') || '유효기간'}</span>
              <span class="info-value">${this.inventory.expired_date || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${TermsUtil.tLabel('loc_cd') || '현재 로케이션'}</span>
              <span class="info-value loc">${this.inventory.loc_cd || '-'}</span>
            </div>
          </div>
        </div>
      ` : html`
        <div class="empty-guide">
          <div class="guide-icon">📦</div>
          <div class="guide-text">${TermsUtil.tLabel('scan_barcode') || '이동할 재고의 바코드를 스캔하세요'}</div>
        </div>
      `}

      <!-- 스텝 2: 목적지 로케이션 스캔 -->
      ${this.inventory ? html`
        <div class="barcode-scan-area">
          <div class="scan-row ${this.scanStep !== 'location' ? 'inactive' : ''}">
            <span class="step-badge ${this.toLocCd ? 'done-badge' : ''}">
              ${this.toLocCd ? '✓' : '2'}
            </span>
            <span class="step-label">${TermsUtil.tLabel('to_loc_cd') || '이동 로케이션'}</span>
            ${this.scanStep === 'location' ? html`
              <ox-input-barcode id="locationInput"
                placeholder="${TermsUtil.tLabel('scan_location') || '목적지 로케이션 스캔'}"
                ?disabled=${this.processing}
                @change=${e => this._onScanLocation(e.target.value)}>
              </ox-input-barcode>
            ` : this.toLocCd ? html`
              <span class="confirmed-value">${this.toLocCd}</span>
            ` : html`
              <span class="confirmed-value" style="color: var(--md-sys-color-on-surface-variant,#999); font-weight:normal; font-size:13px;">
                ${TermsUtil.tLabel('waiting_barcode_scan') || '바코드 스캔 후 활성화'}
              </span>
            `}
          </div>
        </div>

        <!-- 이동 사유 -->
        <div class="reason-area">
          <label>${TermsUtil.tLabel('reason') || '이동 사유 (선택)'}</label>
          <input id="reasonInput"
            type="text"
            placeholder="${TermsUtil.tLabel('reason') || '이동 사유를 입력하세요'}"
            .value=${this.reason}
            @input=${e => (this.reason = e.target.value)}>
        </div>
      ` : ''}

      <!-- 피드백 -->
      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      <!-- 확정 버튼 -->
      ${this.inventory ? html`
        <div class="confirm-area">
          <button class="btn-confirm-move"
            ?disabled=${this.processing || !this.toLocCd}
            @click=${this._confirmMove}>
            ${this.processing
          ? (TermsUtil.tText('processing') || '처리 중...')
          : (TermsUtil.tButton('move') || '이동')}
          </button>
        </div>
      ` : ''}
    `
  }

  /** complete 모드 렌더링 — 이동 완료 결과 */
  _renderCompleteMode() {
    const move = this.lastMove
    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('processed') || '재고 이동 완료!'}</h3>

        <div class="result-card">
          ${move ? html`
            <div class="stat-row">
              <span class="r-label">${TermsUtil.tLabel('barcode') || '바코드'}</span>
              <span class="r-value">${move.barcode}</span>
            </div>
            <div class="stat-row">
              <span class="r-label">${TermsUtil.tLabel('sku_cd') || 'SKU'}</span>
              <span class="r-value">${move.sku_cd}</span>
            </div>
            <div class="stat-row">
              <span class="r-label">${TermsUtil.tLabel('path') || '이동 경로'}</span>
              <span class="r-value arrow">${move.from_loc_cd} → ${move.to_loc_cd}</span>
            </div>
            <div class="stat-row">
              <span class="r-label">${TermsUtil.tLabel('inv_qty') || '수량'}</span>
              <span class="r-value">${move.qty}</span>
            </div>
          ` : ''}
        </div>

        <div class="btn-group">
          <button class="btn-continue" @click=${this._reset}>
            ${TermsUtil.tText('continue') || '계속 이동'}
          </button>
        </div>
      </div>
    `
  }

  /** 페이지 초기화 */
  pageInitialized() {
    this._reset()
  }

  /**
   * 재고 바코드 스캔 핸들러 (스텝 1)
   * GET /rest/inventories?query=[{name:'barcode',operator:'eq',value:barcode}]
   * @param {string} barcode
   */
  async _onScanBarcode(barcode) {
    if (!barcode || this.processing) return

    this.processing = true
    try {
      const query = JSON.stringify([{ name: 'barcode', operator: 'eq', value: barcode }])
      const result = await ServiceUtil.restGet(`inventories?query=${encodeURIComponent(query)}&limit=1`)
      const items = result?.items || result || []

      if (!items.length) {
        this._showFeedback(`재고를 찾을 수 없습니다: ${barcode}`, 'error')
        navigator.vibrate?.(200)
        this._resetBarcodeInput()
        return
      }

      const inv = items[0]

      if (inv.status === 'HOLD') {
        this._showFeedback(`홀드 상태의 재고는 이동할 수 없습니다: ${barcode}`, 'warning')
        navigator.vibrate?.(200)
        this._resetBarcodeInput()
        return
      }

      if (inv.reserved_qty > 0) {
        this._showFeedback(`피킹 예약(할당)된 재고는 이동할 수 없습니다: ${barcode}`, 'warning')
        navigator.vibrate?.(200)
        this._resetBarcodeInput()
        return
      }

      this.inventory = inv
      this.scanStep = 'location'
      this._showFeedback(`상품 ${inv.sku_cd} — 목적지 로케이션을 스캔하세요`, 'success')
      this._resetBarcodeInput()
      setTimeout(() => this._focusLocationInput(), 150)

    } catch (error) {
      this._showFeedback(error.message || '재고 조회에 실패했습니다', 'error')
      navigator.vibrate?.(200)
      this._resetBarcodeInput()
    } finally {
      this.processing = false
    }
  }

  /**
   * 목적지 로케이션 스캔 핸들러 (스텝 2)
   * @param {string} locCd
   */
  _onScanLocation(locCd) {
    if (!locCd || this.processing) return

    if (locCd === this.inventory?.loc_cd) {
      this._showFeedback('현재 로케이션과 동일합니다. 다른 로케이션을 스캔하세요.', 'warning')
      navigator.vibrate?.(200)
      if (this._locationInput) {
        this._locationInput.value = ''
      }
      return
    }

    this.toLocCd = locCd
    this._showFeedback(`목적지 로케이션: ${locCd} — 이동 버튼을 눌러주세요`, 'success')
    if (this._locationInput) {
      this._locationInput.value = ''
    }
  }

  /**
   * 재고 이동 확정 API 호출
   * POST /rest/inventory_trx/{id}/move_inventory
   */
  async _confirmMove() {
    if (!this.inventory || !this.toLocCd) return

    this.processing = true
    try {
      let res = await ServiceUtil.restPost(`inventory_trx/${this.inventory.id}/move_inventory`, {
        to_loc_cd: this.toLocCd,
        reason: this.reason || ''
      })

      if (res == null || res.id == null) {
        this._showFeedback('재고 이동 처리에 실패했습니다', 'error')
        navigator.vibrate?.(200)
        return
      }

      this.lastMove = {
        barcode: this.inventory.barcode,
        sku_cd: this.inventory.sku_cd,
        from_loc_cd: this.inventory.loc_cd || '-',
        to_loc_cd: this.toLocCd,
        qty: this.inventory.inv_qty
      }

      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: `재고 이동 완료: ${this.inventory.barcode} → ${this.toLocCd}` }
      }))

      this.mode = 'complete'
    } catch (error) {
      this._showFeedback(error.message || '재고 이동 처리에 실패했습니다', 'error')
      navigator.vibrate?.(200)
    } finally {
      this.processing = false
    }
  }

  /**
   * 전체 초기화 — 처음 상태로 되돌림
   */
  _reset() {
    this.mode = 'scan'
    this.inventory = null
    this.scanStep = 'barcode'
    this.toLocCd = ''
    this.reason = ''
    this.lastFeedback = null
    this.lastMove = null
    setTimeout(() => this._focusBarcodeInput(), 200)
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
   * 재고 바코드 입력 필드 초기화 및 포커스
   */
  _resetBarcodeInput() {
    if (this._barcodeInput) {
      this._barcodeInput.value = ''
    }
  }

  /**
   * 재고 바코드 입력 필드에 포커스
   */
  _focusBarcodeInput() {
    if (this._barcodeInput) {
      this._barcodeInput.input?.focus()
    }
  }

  /**
   * 로케이션 입력 필드에 포커스
   */
  _focusLocationInput() {
    if (this._locationInput) {
      this._locationInput.input?.focus()
    }
  }
}
