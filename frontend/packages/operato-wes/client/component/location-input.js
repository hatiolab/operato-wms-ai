import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { ServiceUtil } from '@operato-app/metapage/dist-client'

/**
 * 로케이션 자동완성 입력 컴포넌트
 *
 * 텍스트를 입력할 때마다 로케이션 목록을 조회하여 드롭다운으로 표시하고,
 * 선택 시 `location-select` 이벤트를 발생시킨다.
 *
 * @property {string}  placeholder - 입력창 placeholder 텍스트
 * @property {boolean} disabled    - 비활성화 여부
 *
 * @fires location-select - 로케이션 선택 시 발생
 *   detail: { loc_cd, loc_nm, ...location } — 선택된 로케이션 전체 객체
 * @fires location-clear - 입력값이 비워질 때 발생
 *
 * @method clear()  - 입력값 및 드롭다운 초기화
 * @method focus()  - 입력창에 포커스
 *
 * @example
 * <location-input
 *   placeholder="로케이션 코드 입력"
 *   @location-select=${e => this._onLocSelect(e.detail)}
 *   @location-clear=${this._onLocClear}>
 * </location-input>
 */
@customElement('location-input')
export class LocationInput extends LitElement {
  /** 입력창 placeholder */
  @property({ type: String }) placeholder = '로케이션 코드 입력'

  /** 비활성화 여부 */
  @property({ type: Boolean }) disabled = false

  /** 자동완성 후보 목록 */
  @state() _searchResults = []

  _searchTimer = null

  static get styles() {
    return css`
      :host {
        display: block;
        position: relative;
      }

      input {
        width: 100%;
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

      input:focus {
        border-color: var(--md-sys-color-primary, #1976D2);
      }

      input:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 100;
        background: var(--md-sys-color-surface-container-lowest, #fff);
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 6px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
        max-height: 160px;
        overflow-y: auto;
        margin-top: 2px;
      }

      .dropdown-item {
        padding: 8px 12px;
        font-size: 13px;
        cursor: pointer;
        color: var(--md-sys-color-on-surface, #333);
        border-bottom: 1px solid var(--md-sys-color-surface-variant, #f0f0f0);
      }

      .dropdown-item:last-child {
        border-bottom: none;
      }

      .dropdown-item:active {
        background: var(--md-sys-color-surface-variant, #f0f0f0);
      }
    `
  }

  /** 텍스트 입력 시 200ms 디바운스로 로케이션 조회 */
  async _onInput(e) {
    const val = e.target.value
    clearTimeout(this._searchTimer)

    if (!val) {
      this._searchResults = []
      this.dispatchEvent(new CustomEvent('location-clear', { bubbles: true, composed: true }))
      return
    }

    this._searchTimer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(JSON.stringify([{ name: 'loc_cd', operator: 'contains', value: val }]))
        const result = await ServiceUtil.restGet(`locations?query=${query}&limit=20`)
        this._searchResults = result?.items || result || []
      } catch (err) {
        this._searchResults = []
      }
    }, 200)
  }

  /** 드롭다운 항목 선택 */
  _onSelect(loc) {
    this._searchResults = []
    const input = this.shadowRoot?.querySelector('input')
    if (input) input.value = loc.loc_cd
    this.dispatchEvent(new CustomEvent('location-select', {
      detail: loc,
      bubbles: true,
      composed: true
    }))
  }

  /** blur 시 드롭다운 닫기 (mousedown 선택이 먼저 처리되도록 150ms 지연) */
  _onBlur() {
    setTimeout(() => { this._searchResults = [] }, 150)
  }

  /** 외부에서 입력값과 드롭다운 초기화 */
  clear() {
    this._searchResults = []
    const input = this.shadowRoot?.querySelector('input')
    if (input) input.value = ''
  }

  /** 외부에서 포커스 설정 */
  focus() {
    this.shadowRoot?.querySelector('input')?.focus()
  }

  render() {
    return html`
      <input
        type="text"
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        @input=${this._onInput}
        @blur=${this._onBlur}
        autocomplete="off">
      ${this._searchResults.length ? html`
        <div class="dropdown">
          ${this._searchResults.map(loc => html`
            <div class="dropdown-item" @mousedown=${() => this._onSelect(loc)}>
              ${loc.loc_cd}${loc.loc_nm ? ` (${loc.loc_nm})` : ''}
            </div>
          `)}
        </div>
      ` : ''}
    `
  }
}
