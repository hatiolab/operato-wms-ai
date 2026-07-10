import '@things-factory/barcode-ui'
import { html, css, LitElement } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 재고바코드 스캔 입력 컴포넌트 (공급처 라벨 입고용)
 *
 * 공급처가 부착한 라벨의 재고바코드를 스캔하면 supplier_shipments 를 조회하여
 * 어떤 상품(sku_cd)·LOT·소비기한인지 인식하고 `inventory-scan` 이벤트로 전달한다.
 * 기존 sku-barcode-input(상품코드/88코드 스캔)과 달리, 스캔값을 SKU로 해석하지 않고
 * 재고바코드 그대로 supplier_shipments 를 조회한다는 점이 다르다.
 *
 * operato-input-barcode는 카메라 스캔 버튼을 내장하며, PDA 하드웨어 스캐너와도 연동된다.
 *
 * @property {string} placeholder - 바코드 입력 필드 placeholder 힌트 텍스트
 * @property {boolean} disabled - 입력 비활성화
 *
 * @fires inventory-scan - 재고바코드 조회 성공 시 발생
 *   detail: { barcode, sku_cd, sku_nm, lot_no, expired_date, com_cd, wh_cd, loc_cd }
 *
 * @example
 * <inventory-barcode-input
 *   placeholder="재고바코드 스캔"
 *   @inventory-scan=${e => this._onInventoryScan(e.detail)}>
 * </inventory-barcode-input>
 */
@customElement('inventory-barcode-input')
export class InventoryBarcodeInput extends LitElement {
  /** 바코드 입력 placeholder 힌트 텍스트 */
  @property({ type: String }) placeholder = ''

  /** 입력 비활성화 여부 */
  @property({ type: Boolean }) disabled = false

  /** API 호출 중 */
  @state() _processing = false

  /** 오류/안내 피드백 */
  @state() _feedback = null

  /** 입력값 존재 여부 (placeholder 숨김 처리용) */
  @state() _hasValue = false

  /** operato-input-barcode 엘리먼트 참조 (값 초기화용) */
  @query('operato-input-barcode') _barcodeEl

  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return css`
      :host {
        display: block;
        position: relative;
        width: 100%;
      }

      .barcode-wrapper {
        position: relative;
        width: 100%;
      }

      operato-input-barcode {
        width: 100%;
      }

      /* placeholder 오버레이 — pointer-events: none으로 클릭 투과 */
      .placeholder-hint {
        position: absolute;
        top: 50%;
        left: 8px;
        right: 40px; /* 카메라 버튼 영역 확보 */
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--md-sys-color-outline, #aaa);
        font-size: var(--md-sys-typescale-label-large-size, 0.875rem);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        z-index: 1;
      }

      /* 포커스 중이거나 값이 있으면 placeholder 숨김 */
      .barcode-wrapper:focus-within .placeholder-hint {
        display: none;
      }

      /* 피드백 메시지 */
      .feedback {
        margin-top: 4px;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.85rem;
        line-height: 1.4;
      }
      .feedback.error {
        background: #fdecea;
        color: #c62828;
        border: 1px solid #ef9a9a;
      }
      .feedback.info {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid #90caf9;
      }
    `
  }

  /** 컴포넌트 렌더링 */
  render() {
    const placeholderText = this.placeholder || (TermsUtil.tLabel('scan_inventory_barcode') || '재고바코드 스캔')

    return html`
      <div class="barcode-wrapper">
        <operato-input-barcode
          ?disabled=${this.disabled || this._processing}
          @change=${this._onBarcodeChange}>
        </operato-input-barcode>

        ${!this._hasValue ? html`
          <span class="placeholder-hint">${placeholderText}</span>
        ` : ''}
      </div>

      ${this._feedback ? html`
        <div class="feedback ${this._feedback.type}">${this._feedback.message}</div>
      ` : ''}
    `
  }

  /**
   * operato-input-barcode change 이벤트 처리
   * @param {Event} e - change 이벤트
   */
  _onBarcodeChange(e) {
    const barcode = e.target.value
    this._hasValue = Boolean(barcode)
    this._onScan(barcode)
  }

  /**
   * 재고바코드 스캔 처리 — supplier_shipments 단건 조회 후 inventory-scan 이벤트 dispatch
   * @param {string} barcode - 스캔된 재고바코드
   */
  async _onScan(barcode) {
    if (!barcode || !barcode.trim()) return
    // operato-input-barcode에서 Enter 키 입력 시 change 이벤트가 2회 발생하는 이슈 방어
    if (this._processing) return

    this._feedback = null
    this._processing = true

    try {
      const q = encodeURIComponent(barcode.trim())
      const ss = await ServiceUtil.restGet(`supplier_shipments/find_by_barcode?barcode=${q}`)

      if (!ss || !ss.sku_cd) {
        this._setFeedback(
          'error',
          TermsUtil.tText('inventory_barcode_not_found') ||
            `재고바코드에 해당하는 입고예정 정보를 찾을 수 없습니다: ${barcode}`
        )
        navigator.vibrate?.(200)
        return
      }

      this.dispatchEvent(
        new CustomEvent('inventory-scan', {
          detail: {
            barcode: ss.barcode,
            sku_cd: ss.sku_cd,
            sku_nm: ss.sku_nm,
            lot_no: ss.lot_no,
            expired_date: ss.expired_date,
            com_cd: ss.com_cd,
            wh_cd: ss.wh_cd,
            loc_cd: ss.loc_cd
          },
          bubbles: true,
          composed: true
        })
      )
    } catch (err) {
      const msg =
        err?.message ||
        (TermsUtil.tText('inventory_barcode_resolve_error') || '재고바코드 조회 중 오류가 발생했습니다.')
      this._setFeedback('error', msg)
      navigator.vibrate?.(200)
    } finally {
      this._processing = false
      this._clearBarcodeInput()
    }
  }

  /** operato-input-barcode 입력값 초기화 (스캔 처리 후 호출) */
  _clearBarcodeInput() {
    if (this._barcodeEl) {
      this._barcodeEl.value = ''
    }
    this._hasValue = false
  }

  /**
   * 피드백 메시지 설정
   * @param {'error'|'info'} type - 피드백 유형
   * @param {string} message - 표시할 메시지
   */
  _setFeedback(type, message) {
    this._feedback = { type, message }
  }

  /** 피드백 메시지 초기화 */
  clearFeedback() {
    this._feedback = null
  }

  /** 내부 barcode input에 포커스 — PDA 하드웨어 스캐너 연동용 */
  focus() {
    this._barcodeEl?.input?.focus()
  }

  /** 외부에서 바코드 값을 직접 주입 — barcode-listener 연동용 */
  scan(barcode) {
    this._onScan(barcode)
  }
}
