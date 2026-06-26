import { html, css, LitElement } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { customElement, property, state } from 'lit/decorators.js'
import { TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 숫자 키패드 입력 컴포넌트
 *
 * 읽기 전용 표시 필드를 탭하면 가상 숫자 키패드 팝업(바텀 시트)이 떠서
 * PDA 기본 자판 없이 수량 등 숫자 값을 입력할 수 있다.
 *
 * 키패드: 0~9, 지우기(←), 전체삭제(C), 확인.
 * 확인 시 min/max 범위로 보정한 값을 반영하고 `change` 이벤트를 발생시킨다.
 *
 * @property {number} value - 현재 값
 * @property {number} min - 최소값 (기본 0)
 * @property {number} max - 최대값 (null이면 상한 없음)
 * @property {boolean} disabled - 입력 비활성화
 * @property {string} placeholder - 값이 없을 때 표시 필드에 보일 힌트
 *
 * @fires change - 값 확정 시 발생. detail: { value: number }
 *
 * @example
 * <numeric-keypad-input
 *   .value=${this.rcvQty}
 *   .max=${item.rcv_exp_qty}
 *   @change=${e => (this.rcvQty = e.detail.value)}>
 * </numeric-keypad-input>
 */
@customElement('numeric-keypad-input')
export class NumericKeypadInput extends LitElement {
  /** 현재 값 */
  @property({ type: Number }) value = 0

  /** 최소값 */
  @property({ type: Number }) min = 0

  /** 최대값 (null이면 상한 없음) */
  @property({ type: Number }) max = null

  /** 입력 비활성화 여부 */
  @property({ type: Boolean }) disabled = false

  /** 값이 없을 때 표시할 힌트 텍스트 */
  @property({ type: String }) placeholder = ''

  /** 키패드 팝업 표시 여부 */
  @state() _open = false

  /** 팝업 내 입력 중인 임시 문자열 */
  @state() _draft = ''

  /** 터치 디바이스(모바일/PDA) 여부 — false면 PC로 보고 키보드 직접 입력 */
  _isMobile = 'ontouchstart' in window

  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
      }

      /* 읽기 전용 표시 필드 — 탭하면 키패드 팝업 */
      .display-field {
        width: 100%;
        height: 100%;
        min-height: 32px;
        padding: 0 8px;
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        background: var(--md-sys-color-surface, #fff);
        color: var(--md-sys-color-on-surface, #333);
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
      }

      .display-field.placeholder {
        color: var(--md-sys-color-outline, #aaa);
        font-weight: normal;
      }

      .display-field[disabled] {
        opacity: 0.5;
        pointer-events: none;
      }

      /* PC용 키보드 직접 입력 필드 */
      .pc-input {
        width: 100%;
        height: 100%;
        min-height: 32px;
        padding: 0 8px;
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        background: var(--md-sys-color-surface, #fff);
        color: var(--md-sys-color-on-surface, #333);
        box-sizing: border-box;
        outline: none;
      }

      .pc-input:focus {
        border-color: var(--md-sys-color-primary, #1976d2);
      }

      .pc-input:disabled {
        opacity: 0.5;
      }

      /* 키패드 팝업 — 모바일: 바텀 시트 */
      .popup-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .popup-sheet {
        background: var(--md-sys-color-surface, #fff);
        border-radius: 16px 16px 0 0;
        width: 100%;
        padding: 16px 16px env(safe-area-inset-bottom, 16px);
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
      }

      .popup-handle {
        width: 40px;
        height: 4px;
        background: var(--md-sys-color-outline, #ccc);
        border-radius: 2px;
        margin: 0 auto 12px;
      }

      /* 입력값 미리보기 영역 */
      .draft-display {
        width: 100%;
        min-height: 48px;
        margin-bottom: 12px;
        padding: 8px 12px;
        border: 2px solid var(--md-sys-color-primary, #1976d2);
        border-radius: 10px;
        font-size: 28px;
        font-weight: bold;
        text-align: right;
        color: var(--md-sys-color-on-surface, #222);
        background: var(--md-sys-color-surface-container-low, #f7f7f7);
        box-sizing: border-box;
        letter-spacing: 1px;
      }

      /* 숫자 버튼 그리드 (3열) */
      .keypad-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .key {
        height: 56px;
        border: none;
        border-radius: 10px;
        font-size: 22px;
        font-weight: 600;
        cursor: pointer;
        background: var(--md-sys-color-surface-container-high, #ececec);
        color: var(--md-sys-color-on-surface, #222);
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
      }

      .key:active {
        background: var(--md-sys-color-surface-variant, #ddd);
      }

      .key.fn {
        background: var(--md-sys-color-surface-container, #e0e0e0);
        font-size: 18px;
        color: var(--md-sys-color-on-surface-variant, #555);
      }

      .key.clear {
        color: var(--md-sys-color-error, #d32f2f);
      }

      /* 확인 버튼 — 하단 전체 너비 */
      .btn-confirm {
        width: 100%;
        height: 52px;
        margin-top: 8px;
        border: none;
        border-radius: 10px;
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
        background: var(--md-sys-color-primary, #1976d2);
        color: var(--md-sys-color-on-primary, #fff);
      }

      .btn-confirm:active {
        opacity: 0.85;
      }

      /* PC: 중앙 모달 */
      @media (min-width: 768px) {
        .popup-backdrop {
          align-items: center;
        }

        .popup-sheet {
          border-radius: 12px;
          width: 360px;
          max-width: 90vw;
        }

        .popup-handle {
          display: none;
        }
      }
    `
  }

  /** 컴포넌트 렌더링 — PC는 키보드 입력 필드, 모바일은 표시 필드 + 키패드 팝업 */
  render() {
    // PC: 일반 number input으로 키보드 직접 입력
    if (!this._isMobile) {
      return html`
        <input
          class="pc-input"
          type="number"
          inputmode="numeric"
          .value=${this.value !== null && this.value !== undefined ? String(this.value) : ''}
          min=${ifDefined(this.min ?? undefined)}
          max=${ifDefined(this.max ?? undefined)}
          ?disabled=${this.disabled}
          @input=${this._onPcInput} />
      `
    }

    // 모바일/PDA: 표시 필드 탭 → 키패드 팝업
    const hasValue = this.value !== null && this.value !== undefined && this.value !== ''
    const displayText = hasValue ? String(this.value) : (this.placeholder || '')

    return html`
      <div
        class="display-field ${hasValue ? '' : 'placeholder'}"
        ?disabled=${this.disabled}
        @click=${this._openKeypad}>
        ${displayText}
      </div>

      ${this._open ? this._renderKeypad() : ''}
    `
  }

  /**
   * PC 키보드 입력 처리 — 값을 min/max로 보정 후 change 이벤트 발생
   * @param {Event} e - input 이벤트
   */
  _onPcInput(e) {
    let next = parseInt(e.target.value, 10)
    if (isNaN(next)) next = this.min ?? 0
    next = this._clampValue(next)
    this.value = next
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: next },
        bubbles: true,
        composed: true
      })
    )
  }

  /**
   * 값을 min/max 범위로 보정
   * @param {number} v - 입력값
   * @returns {number} 보정된 값
   */
  _clampValue(v) {
    let next = v
    if (this.min !== null && this.min !== undefined && next < this.min) next = this.min
    if (this.max !== null && this.max !== undefined && next > this.max) next = this.max
    return next
  }

  /** 키패드 팝업 렌더링 */
  _renderKeypad() {
    return html`
      <div class="popup-backdrop" @click=${this._cancel}>
        <div class="popup-sheet" @click=${e => e.stopPropagation()}>
          <div class="popup-handle"></div>

          <div class="draft-display">${this._draft || '0'}</div>

          <div class="keypad-grid">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
      n => html`<button class="key" @click=${() => this._appendDigit(n)}>${n}</button>`
    )}
            <button class="key fn clear" @click=${this._clear}>C</button>
            <button class="key" @click=${() => this._appendDigit(0)}>0</button>
            <button class="key fn" @click=${this._backspace}>←</button>
          </div>

          <button class="btn-confirm" @click=${this._confirm}>
            ${TermsUtil.tButton('confirm') || '확인'}
          </button>
        </div>
      </div>
    `
  }

  /** 컴포넌트 제거 시 — 팝업이 열린 채였다면 스캔 일시정지를 안전하게 해제 */
  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._open) {
      document.dispatchEvent(new CustomEvent('barcode-listener-resume'))
    }
  }

  /** 표시 필드 탭 — 키패드 열기, 현재 값을 입력 버퍼로 복사. 스캔 일시정지 */
  _openKeypad() {
    if (this.disabled) return
    this._draft = this.value ? String(this.value) : ''
    this._open = true
    document.dispatchEvent(new CustomEvent('barcode-listener-pause'))
  }

  /** 키패드 닫기 — 스캔 재개 */
  _closeKeypad() {
    this._open = false
    document.dispatchEvent(new CustomEvent('barcode-listener-resume'))
  }

  /**
   * 숫자 키 입력 — 입력 버퍼에 한 자리 추가
   * @param {number} digit - 0~9
   */
  _appendDigit(digit) {
    // 선행 0 방지: 버퍼가 '0'이면 교체
    if (this._draft === '0') {
      this._draft = String(digit)
    } else {
      this._draft = this._draft + String(digit)
    }
  }

  /** 지우기(←) — 마지막 한 자리 삭제 */
  _backspace() {
    this._draft = this._draft.slice(0, -1)
  }

  /** 전체삭제(C) — 입력 버퍼 초기화 */
  _clear() {
    this._draft = ''
  }

  /** 확인 — min/max 보정 후 값 확정, change 이벤트 발생 */
  _confirm() {
    let next = parseInt(this._draft, 10)
    if (isNaN(next)) next = this.min ?? 0
    next = this._clampValue(next)

    this.value = next
    this._closeKeypad()
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: next },
        bubbles: true,
        composed: true
      })
    )
  }

  /** 취소 — 값 변경 없이 팝업 닫기 */
  _cancel() {
    this._closeKeypad()
  }
}
