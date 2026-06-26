import { LitElement, html, css } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'

/**
 * 바코드 스캐너 투명 리스너 컴포넌트
 *
 * Keyboard Event(Single) 모드 스캐너 대응.
 * 내부에 포커스를 유지하는 1px 투명 input을 렌더링하여
 * Android가 HID 키이벤트를 WebView로 라우팅하도록 보장한다.
 *
 * - 스캐너 입력: 문자 간격 100ms 이내 + Enter로 종료 → barcode-scanned 발행
 * - readonly + inputmode="none": 터치해도 가상 키보드 미표시
 * - blur 시 자동 재포커스: 다른 요소 터치 후에도 포커스 복원
 *
 * @fires barcode-scanned - 스캔 완료 시. detail: { barcode: string }
 *
 * @example
 * <barcode-listener
 *   @barcode-scanned=${e => this._onScan(e.detail.barcode)}>
 * </barcode-listener>
 */
@customElement('barcode-listener')
export class BarcodeListener extends LitElement {
  @query('#capture') _captureInput

  _buffer = ''
  _bufferTimer = null
  _refocusTimer = null

  static get styles() {
    return css`
      :host { display: contents; }

      #capture {
        position: fixed;
        top: 0;
        left: 0;
        width: 1px;
        height: 1px;
        opacity: 0.01;
        border: none;
        outline: none;
        padding: 0;
        margin: 0;
        pointer-events: none;
        z-index: -1;
      }
    `
  }

  connectedCallback() {
    super.connectedCallback()
    this._scheduleRefocus()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    clearTimeout(this._bufferTimer)
    clearTimeout(this._refocusTimer)
  }

  /** 렌더 완료 후 최초 포커스 */
  firstUpdated() {
    this._scheduleRefocus()
  }

  _scheduleRefocus() {
    clearTimeout(this._refocusTimer)
    this._refocusTimer = setTimeout(() => {
      // 사용자가 입력 필드에 포커스를 둔 상태라면 재포커스를 양보한다.
      // (operato-input-barcode 두 번 터치 시 자판이 올라오도록 보장)
      if (this._isEditableActive()) return
      this._captureInput?.focus()
    }, 50)
  }

  /**
   * 현재 활성 요소가 사용자가 직접 입력 중인 요소인지 판별.
   * Shadow DOM 경계를 관통하여 안쪽 활성 요소까지 추적한다.
   * (sku-barcode-input → operato-input-barcode → input 처럼 중첩된 경우 대응)
   * @returns {boolean} 입력 요소가 포커스를 가졌으면 true
   */
  _isEditableActive() {
    let el = document.activeElement
    while (el) {
      // 자기 자신(capture input)은 양보 대상이 아님
      if (el === this || el === this._captureInput) return false

      const tag = el.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      if (
        tag === 'operato-input-barcode' ||
        tag === 'ox-input-barcode' ||
        tag === 'sku-barcode-input'
      ) {
        return true
      }

      // Shadow DOM 안쪽 활성 요소로 한 단계 더 진입
      const next = el.shadowRoot?.activeElement
      if (!next || next === el) break
      el = next
    }
    return false
  }

  /** 포커스 잃으면 즉시 재포커스 — 다른 요소 탭 후에도 복원 */
  _onBlur() {
    this._scheduleRefocus()
  }

  /**
   * 키다운 이벤트로 바코드 버퍼링.
   * 스캐너는 문자 간격 100ms 이내로 전송하고 Enter로 종료.
   */
  _onKeydown(e) {
    if (e.key === 'Enter') {
      clearTimeout(this._bufferTimer)
      const barcode = this._buffer.trim()
      this._buffer = ''
      if (barcode) {
        this.dispatchEvent(new CustomEvent('barcode-scanned', {
          detail: { barcode },
          bubbles: true,
          composed: true
        }))
      }
      return
    }

    if (e.key.length === 1) {
      this._buffer += e.key
      clearTimeout(this._bufferTimer)
      this._bufferTimer = setTimeout(() => {
        this._buffer = ''
      }, 100)
    }
  }

  render() {
    return html`
      <input
        id="capture"
        type="text"
        inputmode="none"
        readonly
        autocomplete="off"
        @keydown=${this._onKeydown}
        @blur=${this._onBlur}
      />
    `
  }
}
