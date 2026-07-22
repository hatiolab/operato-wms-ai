import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 출고 상품 매칭 - 상품 검색/선택 팝업 (2단계)
 *
 * 1단계 팝업에서 넘어온 공급처/공급처 상품명을 상단에 표시하고, 수량을 입력받는다.
 * 하단 상품마스터 그리드에서 우리 WMS 상품을 검색/선택하여 매칭한다.
 * "저장" 시 실행할 로직은 추후 정의 예정 (현재는 값 수집/검증 + 이벤트 발생 stub).
 *
 * @fires mapping-saved - "저장" 클릭 시 매칭 값과 함께 발생 (추후 로직 연동용)
 */
class ShipmentProductMappingSearchPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          padding: 16px 20px;
          gap: 14px;
          min-width: 760px;
          height: 100%;
          box-sizing: border-box;
          background: var(--md-sys-color-surface, #fff);
        }

        .row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
          min-width: 180px;
        }

        label {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        input,
        .readonly {
          height: 32px;
          padding: 0 10px;
          font-size: 14px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
        }

        .readonly {
          background: var(--md-sys-color-surface-variant, #f2f4f6);
          color: var(--md-sys-color-on-surface, #333);
        }

        .search-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .search-row .field {
          flex: 1;
        }

        button {
          height: 32px;
          padding: 0 16px;
          font-size: 14px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
        }

        button.search {
          background: var(--md-sys-color-secondary-container, #e0e7ef);
          color: var(--md-sys-color-on-secondary-container, #33475b);
        }

        button.save {
          background: var(--md-sys-color-primary, #1976d2);
          color: #fff;
          min-width: 90px;
        }

        .count {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          font-weight: 600;
        }

        .grid-wrap {
          flex: 1;
          overflow: auto;
          border: 1px solid var(--md-sys-color-outline-variant, #ddd);
          border-radius: 4px;
          min-height: 240px;
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
          background: var(--md-sys-color-surface-variant, #f0f4f8);
        }

        tbody tr.selected {
          background: var(--md-sys-color-primary-container, #d5e6fb);
        }

        .footer {
          display: flex;
          justify-content: flex-end;
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
      comCd: { type: String },
      vendCd: { type: String },
      vendNm: { type: String },
      extProdNm: { type: String },
      qty: { type: Number },
      skuCdFilter: { type: String },
      skuNmFilter: { type: String },
      skus: { type: Array },
      total: { type: Number },
      selectedSkuCd: { type: String }
    }
  }

  /** 생성자 */
  constructor() {
    super()
    this.comCd = ''
    this.vendCd = ''
    this.vendNm = ''
    this.extProdNm = ''
    this.qty = 1
    this.skuCdFilter = ''
    this.skuNmFilter = ''
    this.skus = []
    this.total = 0
    this.selectedSkuCd = ''
  }

  /** lifecycle - 초기 상품 목록 조회 */
  async connectedCallback() {
    super.connectedCallback()
    await this._search()
  }

  /** 상품마스터 검색 (상품코드/상품명 필터) */
  async _search() {
    const conds = []
    if (this.skuCdFilter && this.skuCdFilter.trim()) {
      conds.push({ name: 'sku_cd', operator: 'like', value: this.skuCdFilter.trim() })
    }
    if (this.skuNmFilter && this.skuNmFilter.trim()) {
      conds.push({ name: 'sku_nm', operator: 'like', value: this.skuNmFilter.trim() })
    }
    const q = encodeURIComponent(JSON.stringify(conds))
    // 상품마스터 전체 로드 (도메인 최대 수백 건 규모라 단일 조회로 충분)
    const res = await ServiceUtil.restGet(`sku?select=sku_cd,sku_nm&query=${q}&page=1&limit=10000`)
    this.skus = (res && (res.items || (Array.isArray(res) ? res : []))) || []
    this.total = res && res.total != null ? res.total : this.skus.length
  }

  /** 그리드 행 선택/해제 토글 (선택된 행 재클릭 시 해제) */
  _selectRow(sku) {
    this.selectedSkuCd = this.selectedSkuCd === sku.sku_cd ? '' : sku.sku_cd
  }

  /** lifecycle render */
  render() {
    return html`
      <div class="row">
        <div class="field">
          <label>${TermsUtil.tLabel('vend_cd')}</label>
          <div class="readonly">${this.vendNm ? `${this.vendNm} (${this.vendCd})` : this.vendCd}</div>
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('ext_prod_nm')}</label>
          <div class="readonly">${this.extProdNm}</div>
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('order_qty')}</label>
          <input
            type="number"
            min="1"
            .value=${String(this.qty)}
            @input=${e => (this.qty = Number(e.target.value))}
          />
        </div>
      </div>

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
                      <tr
                        class=${this.selectedSkuCd === sku.sku_cd ? 'selected' : ''}
                        @click=${() => this._selectRow(sku)}
                      >
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

      <div class="footer">
        <button class="save" @click=${() => this._onSave()}>${TermsUtil.tButton('save')}</button>
      </div>
    `
  }

  /**
   * "저장" 클릭 - 매칭 규칙을 shipment_product_mappings 에 등록한다.
   * 성공 시 팝업을 닫고 부모 그리드를 새로고침한다.
   */
  async _onSave() {
    if (!this.selectedSkuCd) {
      UiUtil.showToast('warning', TermsUtil.tLabel('sku_cd'))
      return
    }
    if (!this.qty || this.qty <= 0) {
      UiUtil.showToast('warning', TermsUtil.tLabel('order_qty'))
      return
    }

    const selected = (this.skus || []).find(s => s.sku_cd === this.selectedSkuCd) || {}
    const payload = {
      com_cd: this.comCd,
      vend_cd: this.vendCd,
      ext_prod_nm: this.extProdNm,
      sku_cd: this.selectedSkuCd,
      sku_nm: selected.sku_nm || '',
      order_qty: this.qty
    }

    // 매칭 규칙 저장 (create)
    await ServiceUtil.restPost(
      'shipment_product_mappings',
      payload,
      null,
      null,
      () => {
        this.dispatchEvent(new CustomEvent('mapping-saved', { detail: payload, bubbles: true, composed: true }))
        // 팝업을 닫은 뒤(다음 틱) 대상 화면 그리드를 새로고침한다
        UiUtil.closePopupBy(this)
        setTimeout(() => this._refreshParentGrist(), 150)
      },
      () => {
        UiUtil.showToast(
          'error',
          i18next.t('text.failed_to_save', { defaultValue: '저장에 실패했습니다. (중복 매칭 여부를 확인해주세요)' })
        )
      }
    )
  }

  /**
   * 저장 후 대상 화면의 상품 매칭 그리드를 재조회한다.
   * 팝업 자신은 ox-grist를 포함하지 않으므로, 문서에서 처음 발견되는 ox-grist(=대상 화면 그리드)를 새로고침한다.
   */
  _refreshParentGrist() {
    // shadow DOM을 포함해 문서 내 모든 ox-grist를 수집하여 재조회한다.
    // (숨겨진 탭의 그리드까지 갱신되지만 무해하며, 현재 화면 그리드가 확실히 새로고침된다)
    const grists = []
    const collect = root => {
      const found = root.querySelectorAll ? root.querySelectorAll('ox-grist') : []
      found.forEach(g => grists.push(g))
      const all = root.querySelectorAll ? root.querySelectorAll('*') : []
      for (const el of all) {
        if (el.shadowRoot) collect(el.shadowRoot)
      }
    }
    collect(document)
    grists.forEach(g => {
      if (typeof g.fetch === 'function') {
        try {
          g.fetch()
        } catch (e) {
          /* ignore */
        }
      }
    })
  }
}

customElements.define('shipment-product-mapping-search-popup', ShipmentProductMappingSearchPopup)
