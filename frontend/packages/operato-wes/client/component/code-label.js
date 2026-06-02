import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { fetchCodeMap } from './common-code-cache.js'

/**
 * 공통코드 라벨 표시 컴포넌트
 *
 * 코드값(value)을 공통코드(codeName)에서 조회하여 표시명(description)으로 변환해 보여준다.
 * 공통코드는 캐싱되어 동일 그룹에 대한 중복 API 호출이 발생하지 않는다.
 * 코드 맵에 없는 값은 원래 value 를 그대로 표시하므로, fallback 처리가 별도로 필요 없다.
 *
 * @property {string} codeName  - 공통코드 그룹명 (예: 'INBOUND_TYPE', 'DISPOSITION_TYPE')
 * @property {string} value     - 표시할 코드값 (예: '1', 'RESTOCK')
 * @property {string} fallback  - 코드 맵에 없을 때 표시할 대체 문자열 (기본: value 그대로)
 *
 * @fires —  이벤트 없음 (읽기 전용 컴포넌트)
 *
 * @example
 * <!-- 인라인 텍스트 / 그리드 셀 내부 -->
 * <code-label code-name="INBOUND_TYPE" value="1"></code-label>
 * <!-- 렌더링 결과: "보세 입고" -->
 *
 * <code-label code-name="DISPOSITION_TYPE" .value=${item.disposition_type}></code-label>
 *
 * <!-- 그리드 column 템플릿 예시 (ox-grist 커스텀 렌더러) -->
 * {
 *   type: 'string',
 *   name: 'inbound_type',
 *   header: TermsUtil.tLabel('inbound-type'),
 *   renderer: { show: (column, record) =>
 *     html`<code-label code-name="INBOUND_TYPE" .value=${record.inbound_type}></code-label>`
 *   }
 * }
 */
@customElement('code-label')
export class CodeLabel extends LitElement {
  /** 공통코드 그룹명 (HTML attribute: code-name) */
  @property({ type: String, attribute: 'code-name' }) codeName = ''

  /** 표시할 코드값 */
  @property({ type: String }) value = ''

  /** 코드 맵에 없을 때 보여줄 대체 문자열. 생략 시 value 그대로 표시. */
  @property({ type: String }) fallback = ''

  /** 내부 표시 라벨 */
  @state() _label = ''

  static get styles() {
    return css`
      :host {
        display: inline;
      }
    `
  }

  /** codeName 또는 value 변경 시 라벨 재조회 */
  async updated(changedProps) {
    if (changedProps.has('codeName') || changedProps.has('value')) {
      await this._resolveLabel()
    }
  }

  /**
   * 공통코드 맵에서 현재 value 에 대응하는 표시명을 조회한다.
   * 조회에 실패하거나 값이 없으면 fallback 또는 value 를 그대로 사용한다.
   */
  async _resolveLabel() {
    if (!this.codeName) {
      this._label = this.value ?? ''
      return
    }
    if (this.value === '' || this.value === null || this.value === undefined) {
      this._label = ''
      return
    }
    const map = await fetchCodeMap(this.codeName)
    this._label = map.get(String(this.value)) ?? (this.fallback || String(this.value))
  }

  render() {
    return html`<span>${this._label}</span>`
  }
}
