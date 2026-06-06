import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { fetchEntityLabel } from './entity-label-cache.js'

/**
 * 범용 엔티티 라벨 표시 컴포넌트
 *
 * 임의의 테이블(table)에서 기준 컬럼(key-col)으로 값(value)을 검색하여
 * 표시 컬럼(display-col)의 값을 렌더링한다.
 * 결과는 캐싱되므로 동일 조합의 중복 API 호출이 발생하지 않는다.
 *
 * @property {string} table       - 조회 대상 테이블명 (예: 'companies', 'warehouses')
 * @property {string} key-col     - 검색 기준 컬럼명 (예: 'com_cd', 'wh_cd')
 * @property {string} display-col - 표시할 컬럼명 (예: 'com_nm', 'wh_nm')
 * @property {string} value       - 검색할 값 (예: 'GRAIN_ON', 'WH001')
 * @property {string} fallback    - 조회 결과가 없을 때 표시할 대체 문자열 (기본: value 그대로)
 *
 * @fires — 이벤트 없음 (읽기 전용 컴포넌트)
 *
 * @example
 * <!-- 화주사 코드 → 화주사명 -->
 * <entity-label table="companies" key-col="com_cd" display-col="com_nm" value="GRAIN_ON"></entity-label>
 * <!-- 렌더링 결과: "(주)로지온코리아" -->
 *
 * <!-- 창고 코드 → 창고명 (동적 바인딩) -->
 * <entity-label table="warehouses" key-col="wh_cd" display-col="wh_nm" .value="${item.wh_cd}"></entity-label>
 *
 * <!-- 거래처 코드 → 거래처명, 없으면 '-' 표시 -->
 * <entity-label table="customers" key-col="cust_cd" display-col="cust_nm" .value="${order.cust_cd}" fallback="-"></entity-label>
 */
@customElement('entity-label')
export class EntityLabel extends LitElement {
  /** 조회 대상 테이블명 */
  @property({ type: String }) table = ''

  /** 검색 기준 컬럼명 (HTML attribute: key-col) */
  @property({ type: String, attribute: 'key-col' }) keyCol = ''

  /** 표시할 컬럼명 (HTML attribute: display-col) */
  @property({ type: String, attribute: 'display-col' }) displayCol = ''

  /** 검색할 값 */
  @property({ type: String }) value = ''

  /** 조회 결과가 없을 때 보여줄 대체 문자열. 생략 시 value 그대로 표시. */
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

  /** table / keyCol / displayCol / value 변경 시 라벨 재조회 */
  async updated(changedProps) {
    if (
      changedProps.has('table') ||
      changedProps.has('keyCol') ||
      changedProps.has('displayCol') ||
      changedProps.has('value')
    ) {
      await this._resolveLabel()
    }
  }

  /**
   * 캐시 또는 API 를 통해 표시 라벨을 결정한다.
   * 조회 실패 또는 결과 없음 → fallback → value 순으로 폴백.
   */
  async _resolveLabel() {
    if (!this.table || !this.keyCol || !this.displayCol) {
      this._label = this.value ?? ''
      return
    }
    if (this.value === '' || this.value === null || this.value === undefined) {
      this._label = this.fallback || ''
      return
    }
    const result = await fetchEntityLabel(this.table, this.keyCol, this.displayCol, this.value)
    this._label = result || this.fallback || String(this.value)
  }

  render() {
    return html`<span>${this._label}</span>`
  }
}
