import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { ServiceUtil } from '@operato-app/metapage/dist-client'

/**
 * 로케이션 자동완성 입력 컴포넌트
 *
 * - 존(Zone) 콤보박스: 초기화 시 존 목록을 조회하여 표시.
 *   존을 선택하면 해당 존의 로케이션 목록을 드롭다운으로 즉시 표시.
 * - 텍스트 입력: 존 미선택 시 입력 문자로 로케이션 자동완성.
 *   존 선택 시 존 + 입력 문자 조건으로 필터링.
 *
 * @property {string}  placeholder - 텍스트 입력창 placeholder
 * @property {boolean} disabled    - 비활성화 여부
 * @property {string}  locTypes    - 허용 로케이션 타입(loc_type) 콤마 목록. 지정 시 해당 타입만 조회
 *                                    (예: 'STORE,PICKABLE' — 보관·피킹가능 로케이션만)
 * @property {string}  whCd        - 현재 창고 코드. 지정 시 해당 창고의 로케이션만 조회
 *
 * @fires location-select - 로케이션 선택 시 발생
 *   detail: { loc_cd, loc_nm, ...location } — 선택된 로케이션 전체 객체
 * @fires location-clear - 입력값이 비워질 때 발생
 *
 * @method clear()  - 입력값·존 선택·드롭다운 초기화
 * @method focus()  - 텍스트 입력창에 포커스
 */
@customElement('location-input')
export class LocationInput extends LitElement {
  /** 텍스트 입력창 placeholder */
  @property({ type: String }) placeholder = '로케이션 코드 입력'

  /** 비활성화 여부 */
  @property({ type: Boolean }) disabled = false

  /** 허용 로케이션 타입(loc_type) 콤마 목록 — 지정 시 해당 타입만 조회 (예: 'STORE,PICKABLE') */
  @property({ type: String }) locTypes = ''

  /** 현재 창고 코드 — 지정 시 해당 창고의 로케이션만 조회 */
  @property({ type: String }) whCd = ''

  /** 존 목록 */
  @state() _zones = []

  /** 선택된 존 코드 */
  @state() _selectedZoneCd = ''

  /** 자동완성/존 선택 후보 목록 */
  @state() _searchResults = []

  _searchTimer = null

  static get styles() {
    return css`
      :host {
        display: flex;
        align-items: center;
        gap: 6px;
        position: relative;
      }

      select {
        flex-shrink: 0;
        height: 30px;
        padding: 0 6px;
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 6px;
        font-size: 13px;
        color: var(--md-sys-color-on-surface, #333);
        background: var(--md-sys-color-surface-container-lowest, #fff);
        cursor: pointer;
        outline: none;
        max-width: 100px;
      }

      select:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .input-wrap {
        flex: 1;
        position: relative;
        min-width: 0;
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

  /**
   * 공통 조회 조건 — locTypes(loc_type in)·whCd(wh_cd eq) 지정 시 필터에 포함
   * @returns {Array} 기본 필터 배열
   */
  _baseFilters() {
    const filters = []
    if (this.locTypes) filters.push({ name: 'loc_type', operator: 'in', value: this.locTypes })
    if (this.whCd) filters.push({ name: 'wh_cd', operator: 'eq', value: this.whCd })
    return filters
  }

  /** 컴포넌트 연결 시 존 목록 조회 */
  async connectedCallback() {
    super.connectedCallback()
    try {
      const result = await ServiceUtil.restGet(`locations/zones`)
      this._zones = result?.items || result || []
    } catch (err) {
      this._zones = []
    }
  }

  /** 존 콤보박스 선택 시 해당 존의 로케이션 목록 즉시 조회 */
  async _onZoneChange(e) {
    const zoneCd = e.target.value
    this._selectedZoneCd = zoneCd
    this._searchResults = []

    const input = this.shadowRoot?.querySelector('input')
    if (input) input.value = ''

    if (!zoneCd) {
      this.dispatchEvent(new CustomEvent('location-clear', { bubbles: true, composed: true }))
      return
    }

    try {
      const textVal = input?.value?.trim() || ''
      const filters = [...this._baseFilters(), { name: 'zone_cd', operator: 'eq', value: zoneCd }]
      if (textVal) filters.push({ name: 'loc_cd', operator: 'contains', value: textVal })
      const query = encodeURIComponent(JSON.stringify(filters))
      const sort = encodeURIComponent(JSON.stringify([{ field: 'loc_cd', ascending: true }]))
      const result = await ServiceUtil.restGet(`locations?query=${query}&sort=${sort}&limit=1000`)
      this._searchResults = result?.items || result || []
    } catch (err) {
      this._searchResults = []
    }
  }

  /** 텍스트 입력 시 200ms 디바운스로 로케이션 조회 */
  async _onInput(e) {
    const val = e.target.value
    clearTimeout(this._searchTimer)

    if (!val && !this._selectedZoneCd) {
      this._searchResults = []
      this.dispatchEvent(new CustomEvent('location-clear', { bubbles: true, composed: true }))
      return
    }

    this._searchTimer = setTimeout(async () => {
      try {
        const filters = [...this._baseFilters()]
        if (this._selectedZoneCd) filters.push({ name: 'zone_cd', operator: 'eq', value: this._selectedZoneCd })
        if (val) filters.push({ name: 'loc_cd', operator: 'contains', value: val })
        const query = encodeURIComponent(JSON.stringify(filters))
        const sort = encodeURIComponent(JSON.stringify([{ field: 'loc_cd', ascending: true }]))
        const result = await ServiceUtil.restGet(`locations?query=${query}&sort=${sort}&limit=1000`)
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

  /** 외부에서 입력값·존 선택·드롭다운 초기화 */
  clear() {
    this._searchResults = []
    this._selectedZoneCd = ''
    const input = this.shadowRoot?.querySelector('input')
    if (input) input.value = ''
    const select = this.shadowRoot?.querySelector('select')
    if (select) select.value = ''
  }

  /** 외부에서 텍스트 입력창에 포커스 */
  focus() {
    this.shadowRoot?.querySelector('input')?.focus()
  }

  render() {
    return html`
      ${this._zones.length ? html`
        <select
          ?disabled=${this.disabled}
          @change=${this._onZoneChange}>
          <option value="">존 전체</option>
          ${this._zones.map(z => html`
            <option value=${z.zone_cd} ?selected=${this._selectedZoneCd === z.zone_cd}>
              ${z.zone_cd}
            </option>
          `)}
        </select>
      ` : ''}

      <div class="input-wrap">
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
      </div>
    `
  }
}
