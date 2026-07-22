import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 출고 상품 매칭 - 간편 등록 팝업
 *
 * 공급처(드롭다운) + 공급처 상품명(텍스트) 을 입력받는 작은 팝업.
 * "확인" 시 실행할 로직은 추후 정의 예정이며, 현재는 입력값 수집/검증 및 stub 처리만 한다.
 *
 * @fires mapping-confirmed - "확인" 클릭 시 입력값과 함께 발생 (추후 로직 연동용)
 */
class ShipmentProductMappingPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          padding: 20px;
          gap: 16px;
          min-width: 420px;
          background: var(--md-sys-color-surface, #fff);
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        select,
        input {
          height: 34px;
          padding: 0 10px;
          font-size: 14px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          background: #fff;
          box-sizing: border-box;
        }

        select:focus,
        input:focus {
          outline: none;
          border-color: var(--md-sys-color-primary, #1976d2);
        }

        .footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }

        button {
          min-width: 72px;
          height: 34px;
          padding: 0 16px;
          font-size: 14px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button.cancel {
          background: var(--md-sys-color-surface-variant, #eceff1);
          color: var(--md-sys-color-on-surface-variant, #455a64);
        }

        button.confirm {
          background: var(--md-sys-color-primary, #1976d2);
          color: #fff;
        }
      `
    ]
  }

  /** 프로퍼티 */
  static get properties() {
    return {
      vendors: { type: Array },
      vendCd: { type: String },
      extProdNm: { type: String }
    }
  }

  /** 생성자 */
  constructor() {
    super()
    this.vendors = []
    this.vendCd = ''
    this.extProdNm = ''
  }

  /** lifecycle - 팝업 로드 시 공급처 목록 조회 */
  async connectedCallback() {
    super.connectedCallback()
    await this._fetchVendors()
  }

  /** 공급처(거래처) 목록을 조회하여 드롭다운을 채운다 */
  async _fetchVendors() {
    const res = await ServiceUtil.restGet('vendors?select=vend_cd,vend_nm,com_cd&limit=1000')
    const items = (res && (res.items || (Array.isArray(res) ? res : []))) || []
    // 공급처명 기준 정렬
    this.vendors = items.sort((a, b) => (a.vend_nm || '').localeCompare(b.vend_nm || ''))
  }

  /** lifecycle render */
  render() {
    return html`
      <div class="field">
        <label>${TermsUtil.tLabel('vend_cd')}</label>
        <select @change=${e => (this.vendCd = e.target.value)}>
          <option value="">-</option>
          ${this.vendors.map(
            v => html`<option value=${v.vend_cd} ?selected=${this.vendCd === v.vend_cd}>${v.vend_nm} (${v.vend_cd})</option>`
          )}
        </select>
      </div>

      <div class="field">
        <label>${TermsUtil.tLabel('ext_prod_nm')}</label>
        <input
          type="text"
          .value=${this.extProdNm}
          @input=${e => (this.extProdNm = e.target.value)}
          placeholder=${TermsUtil.tLabel('ext_prod_nm')}
        />
      </div>

      <div class="footer">
        <button class="cancel" @click=${() => this._onCancel()}>${TermsUtil.tButton('cancel')}</button>
        <button class="confirm" @click=${() => this._onConfirm()}>${TermsUtil.tButton('confirm')}</button>
      </div>
    `
  }

  /** "취소" 클릭 - 팝업 닫기 */
  _onCancel() {
    UiUtil.closePopupBy(this)
  }

  /**
   * "확인" 클릭 - 공급처/공급처 상품명을 넘겨 상품 검색 팝업(2단계)을 연다.
   */
  _onConfirm() {
    if (!this.vendCd) {
      UiUtil.showToast('warning', TermsUtil.tLabel('vend_cd'))
      return
    }
    if (!this.extProdNm || !this.extProdNm.trim()) {
      UiUtil.showToast('warning', TermsUtil.tLabel('ext_prod_nm'))
      return
    }

    const vendor = (this.vendors || []).find(v => v.vend_cd === this.vendCd) || {}

    // 2단계 상품 검색/선택 팝업 생성 및 값 전달
    const el = document.createElement('shipment-product-mapping-search-popup')
    el.comCd = vendor.com_cd || ''
    el.vendCd = this.vendCd
    el.vendNm = vendor.vend_nm || ''
    el.extProdNm = this.extProdNm.trim()

    // 1단계 팝업을 먼저 닫고, 오버레이 정리 후(다음 틱) 2단계 팝업을 연다
    // (동기로 연달아 닫기/열기 하면 오버레이 매니저가 충돌하여 2단계가 열리지 않음)
    UiUtil.closePopupBy(this)
    setTimeout(() => UiUtil.openPopupByElement('공급처 상품 매칭', 'large', el, true), 100)
  }
}

customElements.define('shipment-product-mapping-popup', ShipmentProductMappingPopup)
