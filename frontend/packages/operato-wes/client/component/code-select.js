import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { fetchCodeItems } from './common-code-cache.js'

/**
 * 공통코드 드롭다운 셀렉트 컴포넌트
 *
 * 공통코드 그룹(codeName)을 지정하면 해당 코드의 항목 목록을 자동으로 불러와
 * <select> 드롭다운으로 렌더링한다. 선택 시 `change` 이벤트를 발생시킨다.
 * 공통코드는 캐싱되어 동일 그룹에 대한 중복 API 호출이 발생하지 않는다.
 *
 * @property {string}  codeName   - 공통코드 그룹명 (예: 'INBOUND_TYPE', 'LOCATION_TYPE')
 * @property {string}  value      - 현재 선택된 코드값
 * @property {string}  placeholder - 빈 옵션 표시 텍스트 (기본: 빈 문자열)
 * @property {boolean} disabled   - 선택 비활성화 여부
 * @property {boolean} allowEmpty - 빈 옵션(미선택) 허용 여부 (기본: true)
 *
 * @fires change - 선택 변경 시 발생
 *   detail: { value: string, label: string } — 선택된 코드값과 표시 명칭
 *
 * @example
 * <!-- 기본 사용 -->
 * <code-select
 *   code-name="INBOUND_TYPE"
 *   .value=${this.inboundType}
 *   @change=${e => this.inboundType = e.detail.value}>
 * </code-select>
 *
 * <!-- 빈 옵션 없이, placeholder 지정 -->
 * <code-select
 *   code-name="DISPOSITION_TYPE"
 *   placeholder="처분 유형 선택"
 *   .value=${this.dispositionType}
 *   ?allow-empty=${false}
 *   @change=${e => this.dispositionType = e.detail.value}>
 * </code-select>
 *
 * <!-- 비활성화 -->
 * <code-select
 *   code-name="REPAIR_STATUS"
 *   .value=${item.repair_status}
 *   ?disabled=${true}>
 * </code-select>
 */
@customElement('code-select')
export class CodeSelect extends LitElement {
  /** 공통코드 그룹명 (HTML attribute: code-name) */
  @property({ type: String, attribute: 'code-name' }) codeName = ''

  /** 현재 선택된 코드값 */
  @property({ type: String }) value = ''

  /** 빈 옵션 표시 텍스트 */
  @property({ type: String }) placeholder = ''

  /** 선택 비활성화 여부 */
  @property({ type: Boolean }) disabled = false

  /** 빈 옵션(미선택) 허용 여부 (HTML attribute: allow-empty) */
  @property({ type: Boolean, attribute: 'allow-empty' }) allowEmpty = true

  /** 공통코드 항목 목록 */
  @state() _items = []

  static get styles() {
    return css`
      :host {
        display: inline-block;
      }

      select {
        width: 100%;
        height: 32px;
        padding: 0 8px;
        border: 1px solid var(--select-border-color, #ccc);
        border-radius: 4px;
        background: var(--select-bg-color, #fff);
        color: var(--select-text-color, #333);
        font-size: var(--select-font-size, 13px);
        cursor: pointer;
        outline: none;
        appearance: auto;
        box-sizing: border-box;
      }

      select:focus {
        border-color: var(--select-focus-border-color, #1976d2);
        box-shadow: 0 0 0 2px var(--select-focus-shadow-color, rgba(25, 118, 210, 0.2));
      }

      select:disabled {
        background: var(--select-disabled-bg, #f5f5f5);
        color: var(--select-disabled-color, #999);
        cursor: not-allowed;
      }
    `
  }

  /** codeName 변경 시 항목 목록 재조회 */
  async updated(changedProps) {
    if (changedProps.has('codeName') && this.codeName) {
      await this._loadItems()
    }
  }

  /**
   * 공통코드 항목 목록을 API에서 불러온다.
   * 동일 codeName 은 캐시에서 즉시 반환된다.
   */
  async _loadItems() {
    this._items = await fetchCodeItems(this.codeName)
  }

  /**
   * 드롭다운 선택 변경 이벤트 처리.
   * 선택된 값을 내부 상태에 반영하고 부모에게 `change` 이벤트를 전달한다.
   */
  _onChange(e) {
    const val = e.target.value
    this.value = val
    const item = this._items.find(i => String(i.name) === val)
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: val, label: item?.description || val },
        bubbles: true,
        composed: true
      })
    )
  }

  render() {
    return html`
      <select .value=${this.value} ?disabled=${this.disabled} @change=${this._onChange}>
        ${this.allowEmpty ? html`<option value="">${this.placeholder}</option>` : ''}
        ${this._items.map(
          item => html`
            <option value="${item.name}" ?selected=${this.value === String(item.name)}>
              ${item.description || item.name}
            </option>
          `
        )}
      </select>
    `
  }
}
