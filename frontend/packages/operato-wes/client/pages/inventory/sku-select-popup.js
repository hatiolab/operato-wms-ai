import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 상품마스터 선택 팝업 (돋보기 조회용)
 *
 * 상품코드/상품명으로 상품마스터를 검색하고, 행을 클릭하면 선택되어 닫힌다.
 * 여는 쪽에서 `onSelect` 콜백(프로퍼티)을 지정하면, 선택된 상품 { sku_cd, sku_nm } 을 전달한다.
 */
class SkuSelectPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          padding: 16px 20px;
          gap: 12px;
          min-width: 620px;
          height: 100%;
          box-sizing: border-box;
          background: var(--md-sys-color-surface, #fff);
        }

        .search-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
        }

        label {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        input {
          height: 32px;
          padding: 0 10px;
          font-size: 14px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: var(--md-sys-color-primary, #1976d2);
        }

        button.search {
          height: 32px;
          padding: 0 16px;
          font-size: 14px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
          background: var(--md-sys-color-secondary-container, #e0e7ef);
          color: var(--md-sys-color-on-secondary-container, #33475b);
        }

        .count {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .grid-wrap {
          flex: 1;
          overflow: auto;
          border: 1px solid var(--md-sys-color-outline-variant, #ddd);
          border-radius: 4px;
          min-height: 260px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th,
        td {
          padding: 7px 10px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        thead th {
          position: sticky;
          top: 0;
          background: var(--md-sys-color-surface-variant, #f5f7f9);
          font-weight: 700;
          z-index: 1;
        }

        tbody tr {
          cursor: pointer;
        }

        tbody tr:hover {
          background: var(--md-sys-color-primary-container, #d5e6fb);
        }

        .empty {
          padding: 24px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant, #999);
        }
      `
    ]
  }

  /** 프로퍼티 */
  static get properties() {
    return {
      skuCdFilter: { type: String },
      skuNmFilter: { type: String },
      skus: { type: Array },
      total: { type: Number }
    }
  }

  /** 생성자 */
  constructor() {
    super()
    this.skuCdFilter = ''
    this.skuNmFilter = ''
    this.skus = []
    this.total = 0
    // 선택 시 호출될 콜백 (여는 쪽에서 주입)
    this.onSelect = null
  }

  /** lifecycle - 초기 상품 목록 조회 */
  async connectedCallback() {
    super.connectedCallback()
    await this._search()
  }

  /** 상품마스터 검색 */
  async _search() {
    const conds = []
    if (this.skuCdFilter && this.skuCdFilter.trim()) {
      conds.push({ name: 'sku_cd', operator: 'like', value: this.skuCdFilter.trim() })
    }
    if (this.skuNmFilter && this.skuNmFilter.trim()) {
      conds.push({ name: 'sku_nm', operator: 'like', value: this.skuNmFilter.trim() })
    }
    const q = encodeURIComponent(JSON.stringify(conds))
    const res = await ServiceUtil.restGet(`sku?select=sku_cd,sku_nm&query=${q}&page=1&limit=10000`)
    this.skus = (res && (res.items || (Array.isArray(res) ? res : []))) || []
    this.total = res && res.total != null ? res.total : this.skus.length
  }

  /** 행 선택 - 콜백 호출 후 팝업 닫기 */
  _select(sku) {
    if (typeof this.onSelect === 'function') {
      this.onSelect({ sku_cd: sku.sku_cd, sku_nm: sku.sku_nm })
    }
    UiUtil.closePopupBy(this)
  }

  /** lifecycle render */
  render() {
    return html`
      <div class="search-row">
        <div class="field">
          <label>${TermsUtil.tLabel('sku_cd')}</label>
          <input
            type="text"
            .value=${this.skuCdFilter}
            @input=${e => (this.skuCdFilter = e.target.value)}
            @keydown=${e => e.key === 'Enter' && this._search()}
          />
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('sku_nm')}</label>
          <input
            type="text"
            .value=${this.skuNmFilter}
            @input=${e => (this.skuNmFilter = e.target.value)}
            @keydown=${e => e.key === 'Enter' && this._search()}
          />
        </div>
        <button class="search" @click=${() => this._search()}>${TermsUtil.tButton('search')}</button>
      </div>

      <div class="count">${i18next.t('label.total', { defaultValue: '총' })} ${this.total}${i18next.t('label.count_unit', { defaultValue: '건' })}</div>

      <div class="grid-wrap">
        ${this.skus && this.skus.length > 0
          ? html`
              <table>
                <thead>
                  <tr>
                    <th>${TermsUtil.tLabel('sku_cd')}</th>
                    <th>${TermsUtil.tLabel('sku_nm')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.skus.map(
                    sku => html`
                      <tr @click=${() => this._select(sku)}>
                        <td>${sku.sku_cd}</td>
                        <td>${sku.sku_nm}</td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `
          : html`<div class="empty">${TermsUtil.tText('there_is_no_data', 'No records')}</div>`}
      </div>
    `
  }
}

customElements.define('sku-select-popup', SkuSelectPopup)
