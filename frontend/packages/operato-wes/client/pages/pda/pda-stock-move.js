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
 * 스캔 순서:
 * 1. To 로케이션 스캔 (목적지 — 1회 확정 후 잠금)
 * 2. From 로케이션 스캔 (이동 출발지)
 * 3. 바코드 스캔 → 성공 시 목록 추가 후 From + 바코드 클리어, From 포커스
 *                → 실패 시 바코드만 클리어, 바코드 포커스 유지
 * 4. 2~3 반복 → 이동 사유 입력 → 이동 버튼
 *
 * Inventory는 (domainId, locCd, barcode) 복합 유니크이므로 From 로케이션으로
 * 이동 대상 재고를 정확히 특정한다.
 *
 * 화면 모드: scan(스캔 + 목록) → complete(완료 결과)
 */
@customElement('pda-stock-move')
export class PdaStockMove extends connect(store)(PageView) {
  /** 화면 모드: scan / complete */
  @state() mode = 'scan'

  /** 목적지 로케이션 코드 (1회 확정) */
  @state() toLocCd = ''

  /** 목적지 로케이션 전체 정보 */
  @state() toLocation = null

  /** From 로케이션 코드 (바코드 스캔 성공마다 초기화) */
  @state() fromLocCd = ''

  /** From 로케이션 전체 정보 */
  @state() fromLocation = null

  /** 스캔하여 추가된 재고 목록 */
  @state() scannedItems = []

  /** API 처리 중 */
  @state() processing = false

  /** 마지막 스캔 피드백 */
  @state() lastFeedback = null

  /** 완료 처리 결과 */
  @state() moveResult = null

  /** 이동 사유 */
  @state() reason = ''

  /** 목적지 로케이션 스캔 입력 */
  @query('#toLocationInput') _toLocationInput

  /** From 로케이션 스캔 입력 */
  @query('#fromLocationInput') _fromLocationInput

  /** 재고 바코드 스캔 입력 */
  @query('#barcodeInput') _barcodeInput

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

        .scan-area {
          padding: 8px 12px 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
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
          box-shadow: 0 1px 4px rgba(25, 118, 210, 0.15);
        }

        .scan-row.done {
          border-color: #4CAF50;
          background: #f1f8f1;
        }

        .scan-row .row-label {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #666);
          min-width: 72px;
          white-space: nowrap;
        }

        .scan-row.active .row-label { color: var(--md-sys-color-primary, #1976D2); }
        .scan-row.done .row-label { color: #2e7d32; }

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

        .reason-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px 4px;
          flex-shrink: 0;
        }

        .reason-row input {
          flex: 1;
          padding: 6px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-container-lowest, #fff);
          outline: none;
        }

        .reason-row input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .divider {
          height: 1px;
          background: var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
          margin: 2px 0;
        }

        .scan-feedback {
          margin: 2px 12px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .scan-feedback.success { background: #e8f5e9; color: #2e7d32; }
        .scan-feedback.error { background: #ffebee; color: #c62828; }
        .scan-feedback.warning { background: #fff8e1; color: #f57f17; }

        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 12px;
          flex-shrink: 0;
        }

        .list-header .list-count {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .scanned-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 12px 6px;
        }

        .scanned-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          margin-bottom: 5px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .scanned-card .seq {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scanned-card .info {
          flex: 1;
          min-width: 0;
        }

        .scanned-card .barcode {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .scanned-card .sub {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .scanned-card .loc-arrow {
          flex-shrink: 0;
          font-size: 11px;
          color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
          white-space: nowrap;
        }

        .scanned-card .btn-remove {
          flex-shrink: 0;
          padding: 3px 7px;
          border: none;
          border-radius: 4px;
          background: #ffebee;
          color: #c62828;
          font-size: 11px;
          cursor: pointer;
        }

        .empty-guide {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 20px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant, #bbb);
        }

        .empty-guide .guide-icon { font-size: 44px; margin-bottom: 10px; }
        .empty-guide .guide-text { font-size: 13px; }

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

        .btn-primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-primary:active:not(:disabled) { opacity: 0.85; }

        .btn-secondary {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #333);
        }

        .btn-secondary:active { opacity: 0.8; }

        .complete-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px 24px;
          text-align: center;
          overflow-y: auto;
        }

        .complete-section .check-icon { font-size: 64px; margin-bottom: 14px; }
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
          padding-bottom: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .result-card .stat-row:last-child { border-bottom: none; padding-bottom: 0; }
        .result-card .stat-row .r-label { color: var(--md-sys-color-on-surface-variant, #666); }
        .result-card .stat-row .r-value { font-weight: 600; }
        .result-card .stat-row .r-value.success { color: #2e7d32; }
        .result-card .stat-row .r-value.error { color: #c62828; }
        .result-card .stat-row .r-value.primary { color: var(--md-sys-color-primary, #1976D2); }

        .complete-section .btn-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 360px;
        }

        .complete-section .btn-group button {
          padding: 13px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .loading-overlay {
          text-align: center;
          padding: 16px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 13px;
          flex-shrink: 0;
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
    if (this.mode === 'complete') return this._renderCompleteMode()
    return this._renderScanMode()
  }

  /** scan 모드 렌더링 */
  _renderScanMode() {
    const canMove = this.toLocCd && this.scannedItems.length > 0 && this.reason.trim()
    const fromActive = this.toLocCd && !this.fromLocCd
    const barcodeActive = this.toLocCd && this.fromLocCd

    return html`
      <div class="scan-area">
        <!-- 1단계: 목적지(To) 로케이션 — 최초 1회 확정 -->
        <div class="scan-row ${this.toLocCd ? 'done' : 'active'}">
          <span class="row-label">${TermsUtil.tLabel('to_loc_cd') || 'To 로케이션'}</span>
          ${this.toLocCd ? html`
            <span class="confirmed-value">${this.toLocCd}</span>
            <button class="btn-clear" @click=${this._clearToLocation}>변경</button>
          ` : html`
            <ox-input-barcode id="toLocationInput"
              placeholder="${TermsUtil.tLabel('scan_location') || '목적지 로케이션 스캔'}"
              ?disabled=${this.processing}
              @change=${e => this._onScanToLocation(e.target.value)}>
            </ox-input-barcode>
          `}
        </div>

        <!-- 2단계: From 로케이션 — 바코드 스캔 성공마다 초기화 -->
        <div class="scan-row ${this.fromLocCd ? 'done' : (fromActive ? 'active' : '')}">
          <span class="row-label">${TermsUtil.tLabel('from_loc_cd') || 'From 로케이션'}</span>
          ${this.fromLocCd ? html`
            <span class="confirmed-value">${this.fromLocCd}</span>
            <button class="btn-clear" @click=${this._clearFromLocation}>변경</button>
          ` : html`
            <ox-input-barcode id="fromLocationInput"
              placeholder="${this.toLocCd
          ? (TermsUtil.tLabel('scan_from_location') || 'From 로케이션 스캔')
          : 'To 로케이션 스캔 후 입력 가능'}"
              ?disabled=${this.processing || !this.toLocCd}
              @change=${e => this._onScanFromLocation(e.target.value)}>
            </ox-input-barcode>
          `}
        </div>

        <!-- 3단계: 바코드 — From + To 모두 확정 후 활성화 -->
        <div class="scan-row ${barcodeActive ? 'active' : ''}">
          <span class="row-label">${TermsUtil.tLabel('barcode') || '바코드'}</span>
          <ox-input-barcode id="barcodeInput"
            placeholder="${barcodeActive
        ? (TermsUtil.tLabel('scan_barcode') || '재고 바코드 스캔')
        : '로케이션 스캔 후 입력 가능'}"
            ?disabled=${this.processing || !barcodeActive}
            @change=${e => this._onScanBarcode(e.target.value)}>
          </ox-input-barcode>
        </div>
      </div>

      <!-- 이동 사유 -->
      <div class="reason-row">
        <input type="text"
          placeholder="이동 사유 (필수)"
          .value=${this.reason}
          @input=${e => (this.reason = e.target.value)}>
      </div>

      <div class="divider"></div>

      ${this.lastFeedback ? html`
        <div class="scan-feedback ${this.lastFeedback.type}">${this.lastFeedback.message}</div>
      ` : ''}

      ${this.processing ? html`
        <div class="loading-overlay">${TermsUtil.tText('processing') || '처리 중...'}</div>
      ` : ''}

      <!-- 스캔 목록 -->
      ${this.scannedItems.length > 0 ? html`
        <div class="list-header">
          <span class="list-count">
            ${TermsUtil.tLabel('total') || '총'} ${this.scannedItems.length}건 스캔됨
          </span>
        </div>
        <div class="scanned-list">
          ${this.scannedItems.map((item, idx) => html`
            <div class="scanned-card">
              <div class="seq">${idx + 1}</div>
              <div class="info">
                <div class="barcode">${item.barcode}</div>
                <div class="sub">
                  ${item.sku_cd}${item.sku_nm ? ` (${item.sku_nm})` : ''}
                  · ${TermsUtil.tLabel('inv_qty') || '수량'}: ${item.inv_qty ?? '-'}
                </div>
              </div>
              <span class="loc-arrow">${item.loc_cd} → ${this.toLocCd}</span>
              <button class="btn-remove" @click=${() => this._removeItem(idx)}>✕</button>
            </div>
          `)}
        </div>
      ` : html`
        <div class="empty-guide">
          <div class="guide-icon">📦</div>
          <div class="guide-text">
            ${!this.toLocCd
          ? (TermsUtil.tLabel('scan_location') || '먼저 목적지 로케이션을 스캔하세요')
          : !this.fromLocCd
            ? (TermsUtil.tLabel('scan_from_location') || 'From 로케이션을 스캔하세요')
            : (TermsUtil.tLabel('scan_barcode') || '재고 바코드를 스캔하세요')}
          </div>
        </div>
      `}

      <div class="footer-area">
        <button class="btn-primary"
          ?disabled=${this.processing || !canMove}
          @click=${this._confirmMove}>
          ${this.processing
        ? (TermsUtil.tText('processing') || '처리 중...')
        : `${TermsUtil.tButton('move') || '이동'} (${this.scannedItems.length}건)`}
        </button>
        <button class="btn-secondary" ?disabled=${this.processing} @click=${this._reset}>
          ${TermsUtil.tButton('reset') || '초기화'}
        </button>
      </div>
    `
  }

  /** complete 모드 렌더링 — 처리 결과 요약 */
  _renderCompleteMode() {
    const res = this.moveResult
    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tText('processed') || '재고 이동 완료!'}</h3>

        <div class="result-card">
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tLabel('to_loc_cd') || '목적지 로케이션'}</span>
            <span class="r-value primary">${res?.toLocCd || '-'}</span>
          </div>
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tLabel('total') || '처리 건수'}</span>
            <span class="r-value">${res?.total || 0}건</span>
          </div>
          <div class="stat-row">
            <span class="r-label">${TermsUtil.tLabel('success') || '성공'}</span>
            <span class="r-value success">${res?.success || 0}건</span>
          </div>
          ${res?.failed > 0 ? html`
            <div class="stat-row">
              <span class="r-label">${TermsUtil.tTitle('failure') || '실패'}</span>
              <span class="r-value error">${res.failed}건</span>
            </div>
          ` : ''}
        </div>

        <div class="btn-group">
          <button class="btn-primary" @click=${this._reset}>
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
   * 목적지(To) 로케이션 스캔 핸들러
   * POST /rest/inventory_trx/validate_location_for_move
   * @param {string} locCd
   */
  async _onScanToLocation(locCd) {
    if (!locCd || this.processing) return

    this.processing = true
    try {
      await ServiceUtil.restPost('inventory_trx/validate_location_for_move', {
        to_loc_cd: locCd
      }, null, null, (location) => {
        this.toLocCd = location.loc_cd
        this.toLocation = location
        const locInfo = location.loc_type ? ` (${location.loc_type})` : ''
        this._showFeedback(`목적지: ${location.loc_cd}${locInfo} — From 로케이션을 스캔하세요`, 'success')
        if (this._toLocationInput) this._toLocationInput.value = ''
        setTimeout(() => this._focusFromLocationInput(), 150)

      }, (err) => {
        this._showFeedback(err?.msg || '유효하지 않은 로케이션입니다', 'error')
        navigator.vibrate?.(200)
        if (this._toLocationInput) this._toLocationInput.value = ''
      })

    } catch (error) {
      this._showFeedback(error.message || '유효하지 않은 로케이션입니다', 'error')
      navigator.vibrate?.(200)
      if (this._toLocationInput) this._toLocationInput.value = ''

    } finally {
      this.processing = false
    }
  }

  /**
   * From 로케이션 스캔 핸들러
   * POST /rest/inventory_trx/validate_location_for_move
   * @param {string} locCd
   */
  async _onScanFromLocation(locCd) {
    if (!locCd || this.processing) return

    this.processing = true
    try {
      await ServiceUtil.restPost('inventory_trx/validate_location_for_move', {
        from_loc_cd: locCd
      }, null, null, (location) => {
        this.fromLocCd = location.loc_cd
        this.fromLocation = location
        const locInfo = location.loc_type ? ` (${location.loc_type})` : ''
        this._showFeedback(`From: ${location.loc_cd}${locInfo} — 바코드를 스캔하세요`, 'success')
        if (this._fromLocationInput) this._fromLocationInput.value = ''
        setTimeout(() => this._focusBarcodeInput(), 150)

      }, (err) => {
        this._showFeedback(err?.msg || '유효하지 않은 로케이션입니다', 'error')
        navigator.vibrate?.(200)
        if (this._fromLocationInput) this._fromLocationInput.value = ''
      })

    } catch (error) {
      this._showFeedback(error.message || '유효하지 않은 로케이션입니다', 'error')
      navigator.vibrate?.(200)
      if (this._fromLocationInput) this._fromLocationInput.value = ''

    } finally {
      this.processing = false
    }
  }

  /**
   * 재고 바코드 스캔 핸들러
   * - 성공: 목록 추가 → From 로케이션 + 바코드 초기화 → From 포커스
   * - 실패: 바코드만 초기화 → 바코드 포커스 유지
   * POST /rest/inventory_trx/validate_barcode_for_move
   * @param {string} barcode
   */
  async _onScanBarcode(barcode) {
    if (!barcode || this.processing || !this.fromLocCd || !this.toLocCd) return

    if (this.scannedItems.some(i => i.barcode === barcode && i.loc_cd === this.fromLocCd)) {
      this._showFeedback(`이미 추가된 바코드입니다: ${barcode}`, 'warning')
      navigator.vibrate?.(200)
      if (this._barcodeInput) this._barcodeInput.value = ''
      setTimeout(() => this._focusBarcodeInput(), 100)
      return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost('inventory_trx/validate_barcode_for_move', {
        barcode,
        from_loc_cd: this.fromLocCd,
        to_loc_cd: this.toLocCd
      }, null, null, (inv) => {
        this.scannedItems = [...this.scannedItems, inv]
        this._showFeedback(`추가됨: ${inv.sku_cd} (${this.fromLocCd} → ${this.toLocCd})`, 'success')
        // 성공: From 로케이션 + 바코드 모두 초기화, From 포커스
        this.fromLocCd = ''
        this.fromLocation = null
        if (this._fromLocationInput) this._fromLocationInput.value = ''
        if (this._barcodeInput) this._barcodeInput.value = ''
        setTimeout(() => this._focusFromLocationInput(), 100)

      }, (err) => {
        this._showFeedback('이동 불가한 재고입니다', 'error')
        navigator.vibrate?.(200)
        // 실패: 바코드만 초기화, 바코드 포커스 유지
        if (this._barcodeInput) this._barcodeInput.value = ''
        setTimeout(() => this._focusBarcodeInput(), 100)
      })

    } catch (error) {
      this._showFeedback(error.message || '이동 불가한 재고입니다', 'error')
      navigator.vibrate?.(200)
      // 실패: 바코드만 초기화, 바코드 포커스 유지
      if (this._barcodeInput) this._barcodeInput.value = ''
      setTimeout(() => this._focusBarcodeInput(), 100)

    } finally {
      this.processing = false
    }
  }

  /**
   * 목록에서 항목 제거
   * @param {number} idx
   */
  _removeItem(idx) {
    this.scannedItems = this.scannedItems.filter((_, i) => i !== idx)
  }

  /**
   * 목적지 로케이션 초기화 — From + 스캔 목록도 함께 초기화
   */
  _clearToLocation() {
    this.toLocCd = ''
    this.toLocation = null
    this.fromLocCd = ''
    this.fromLocation = null
    this.scannedItems = []
    this.lastFeedback = null
    setTimeout(() => this._focusToLocationInput(), 150)
  }

  /**
   * From 로케이션만 초기화
   */
  _clearFromLocation() {
    this.fromLocCd = ''
    this.fromLocation = null
    this.lastFeedback = null
    setTimeout(() => this._focusFromLocationInput(), 150)
  }

  /**
   * 일괄 재고 이동 — scannedItems 순서대로 API 호출
   * POST /rest/inventory_trx/{id}/move_inventory
   */
  async _confirmMove() {
    if (!this.toLocCd || !this.scannedItems.length) return

    this.processing = true
    let success = 0
    let failed = 0

    try {
      for (const inv of this.scannedItems) {
        try {
          await ServiceUtil.restPost(`inventory_trx/${inv.id}/move_inventory`, {
            from_loc_cd: inv.loc_cd,
            to_loc_cd: this.toLocCd,
            reason: this.reason || ''
          }, null, null, (result) => {
            success++
          }, (err) => {
            failed++
          })

        } catch {
          failed++
        }
      }

      this.moveResult = {
        toLocCd: this.toLocCd,
        total: this.scannedItems.length,
        success,
        failed
      }

      document.dispatchEvent(new CustomEvent('notify', {
        detail: {
          level: failed === 0 ? 'info' : 'warn',
          message: `재고 이동 완료: ${success}건 성공${failed > 0 ? `, ${failed}건 실패` : ''}`
        }
      }))

      if (success > 0) {
        this.mode = 'complete'
      }
    } finally {
      this.processing = false
    }
  }

  /**
   * 전체 초기화
   */
  _reset() {
    this.mode = 'scan'
    this.toLocCd = ''
    this.toLocation = null
    this.fromLocCd = ''
    this.fromLocation = null
    this.scannedItems = []
    this.reason = ''
    this.lastFeedback = null
    this.moveResult = null
    setTimeout(() => this._focusToLocationInput(), 200)
  }

  /**
   * 피드백 메시지 표시
   * @param {string} message
   * @param {string} type — 'success' | 'error' | 'warning'
   */
  _showFeedback(message, type) {
    this.lastFeedback = { type, message }
  }

  /** 목적지 로케이션 입력 필드 포커스 */
  _focusToLocationInput() {
    if (this._toLocationInput) this._toLocationInput.input?.focus()
  }

  /** From 로케이션 입력 필드 포커스 */
  _focusFromLocationInput() {
    if (this._fromLocationInput) this._fromLocationInput.input?.focus()
  }

  /** 바코드 입력 필드 포커스 */
  _focusBarcodeInput() {
    if (this._barcodeInput) this._barcodeInput.input?.focus()
  }
}
