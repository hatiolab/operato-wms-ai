import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 재고 단건 생성 팝업 (연속 등록용)
 *
 * 재고 현황 화면의 "단건 생성" 버튼으로 호출된다.
 * 저장해도 팝업이 닫히지 않고, 창고/화주사는 유지한 채 나머지 입력만 초기화되어 연속 등록이 가능하다.
 * 저장 시 inventory_trx/create_inventory 를 호출하고, 성공하면 뒤 화면의 재고 그리드를 새로고침한다.
 *
 * @fires inventory-created - 재고 생성 성공 시 발생
 */
class InventoryQuickCreatePopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          padding: 18px 20px;
          gap: 14px;
          min-width: 560px;
          background: var(--md-sys-color-surface, #fff);
        }

        .row {
          display: flex;
          gap: 14px;
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

        label .req {
          color: var(--md-sys-color-error, #d32f2f);
          margin-left: 2px;
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

        .input-with-btn {
          display: flex;
          gap: 6px;
        }

        .input-with-btn input {
          flex: 1;
          min-width: 0;
        }

        button.icon-btn {
          width: 36px;
          min-width: 36px;
          height: 34px;
          padding: 0;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          background: var(--md-sys-color-surface-variant, #eceff1);
          cursor: pointer;
          font-size: 15px;
          line-height: 1;
        }

        .footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 6px;
        }

        button {
          min-width: 78px;
          height: 34px;
          padding: 0 16px;
          font-size: 14px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button.close {
          background: var(--md-sys-color-surface-variant, #eceff1);
          color: var(--md-sys-color-on-surface-variant, #455a64);
        }

        button.save {
          background: var(--md-sys-color-primary, #1976d2);
          color: #fff;
        }

        button[disabled] {
          opacity: 0.5;
          cursor: default;
        }
      `
    ]
  }

  /** 프로퍼티 */
  static get properties() {
    return {
      whCd: { type: String },
      comCd: { type: String },
      skuCd: { type: String },
      locCd: { type: String },
      invQty: { type: Number },
      lotNo: { type: String },
      expiredDate: { type: String },
      reasonCd: { type: String },
      remarks: { type: String },
      whOptions: { type: Array },
      comOptions: { type: Array },
      reasonOptions: { type: Array },
      saving: { type: Boolean }
    }
  }

  /** 생성자 */
  constructor() {
    super()
    this.whCd = ''
    this.comCd = ''
    this.skuCd = ''
    this.locCd = ''
    this.invQty = null
    this.lotNo = ''
    this.expiredDate = ''
    this.reasonCd = ''
    this.remarks = ''
    this.whOptions = []
    this.comOptions = []
    this.reasonOptions = []
    this.saving = false
  }

  /** lifecycle - 창고/화주사/사유 옵션 로드 */
  async connectedCallback() {
    super.connectedCallback()
    await Promise.all([this._fetchWarehouses(), this._fetchCompanies(), this._fetchReasons()])
  }

  /** 창고 목록 조회 */
  async _fetchWarehouses() {
    const res = await ServiceUtil.restGet('warehouses?select=wh_cd,wh_nm&limit=500')
    this.whOptions = (res && res.items) || []
  }

  /** 화주사 목록 조회 */
  async _fetchCompanies() {
    const res = await ServiceUtil.restGet('companies?select=com_cd,com_nm&limit=500')
    this.comOptions = (res && res.items) || []
  }

  /** 재고 생성 사유 공통코드(INV_NEW_REASON) 조회 */
  async _fetchReasons() {
    try {
      this.reasonOptions = await ServiceUtil.getCodeSelectorData('INV_NEW_REASON')
    } catch (e) {
      this.reasonOptions = [{ value: '', display: '' }]
    }
  }

  /** lifecycle render */
  render() {
    return html`
      <div class="row">
        <div class="field">
          <label>${TermsUtil.tLabel('wh_cd')}<span class="req">*</span></label>
          <select @change=${e => (this.whCd = e.target.value)}>
            <option value="">-</option>
            ${this.whOptions.map(
              w => html`<option value=${w.wh_cd} ?selected=${this.whCd === w.wh_cd}>${w.wh_nm} (${w.wh_cd})</option>`
            )}
          </select>
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('com_cd')}<span class="req">*</span></label>
          <select @change=${e => (this.comCd = e.target.value)}>
            <option value="">-</option>
            ${this.comOptions.map(
              c => html`<option value=${c.com_cd} ?selected=${this.comCd === c.com_cd}>${c.com_nm} (${c.com_cd})</option>`
            )}
          </select>
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('inv_qty')}<span class="req">*</span></label>
          <input
            type="number"
            min="1"
            .value=${this.invQty == null ? '' : String(this.invQty)}
            @input=${e => (this.invQty = e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>${TermsUtil.tLabel('sku_cd')}<span class="req">*</span></label>
          <div class="input-with-btn">
            <input type="text" .value=${this.skuCd} @input=${e => (this.skuCd = e.target.value)} />
            <button class="icon-btn" title=${i18next.t('label.search', { defaultValue: '상품 선택' })} @click=${() => this._openSkuPicker()}>🔍</button>
          </div>
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('loc_cd')}<span class="req">*</span></label>
          <input type="text" .value=${this.locCd} @input=${e => (this.locCd = e.target.value)} />
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('expired_date')}</label>
          <input type="date" .value=${this.expiredDate} @input=${e => (this.expiredDate = e.target.value)} />
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>${TermsUtil.tLabel('lot_no')}</label>
          <input type="text" .value=${this.lotNo} @input=${e => (this.lotNo = e.target.value)} />
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('reason_cd')}</label>
          <select @change=${e => (this.reasonCd = e.target.value)}>
            ${this.reasonOptions.map(
              r => html`<option value=${r.value} ?selected=${this.reasonCd === r.value}>${r.display}</option>`
            )}
          </select>
        </div>
        <div class="field">
          <label>${TermsUtil.tLabel('remarks')}</label>
          <input type="text" .value=${this.remarks} @input=${e => (this.remarks = e.target.value)} />
        </div>
      </div>

      <div class="footer">
        <button class="close" @click=${() => this._onClose()}>${TermsUtil.tButton('close')}</button>
        <button class="save" ?disabled=${this.saving} @click=${() => this._onSave()}>${TermsUtil.tButton('save')}</button>
      </div>
    `
  }

  /** "닫기" - 팝업 닫기 */
  _onClose() {
    UiUtil.closePopupBy(this)
  }

  /** 돋보기 - 상품마스터 선택 팝업을 열고, 선택된 상품코드를 입력란에 채운다 */
  _openSkuPicker() {
    const el = document.createElement('sku-select-popup')
    el.onSelect = sku => {
      this.skuCd = sku.sku_cd
    }
    UiUtil.openPopupByElement(i18next.t('label.sku_cd', { defaultValue: '상품 선택' }), 'large', el, true)
  }

  /**
   * "저장" - 재고 단건 생성. 성공해도 팝업은 닫지 않고, 창고/화주사만 유지한 채 나머지를 초기화한다.
   */
  async _onSave() {
    if (!this.whCd || !this.comCd) {
      UiUtil.showToast('warning', i18next.t('text.required_wh_com', { defaultValue: '창고와 화주사를 선택해주세요.' }))
      return
    }
    if (!this.skuCd || !this.skuCd.trim() || !this.locCd || !this.locCd.trim() || !this.invQty || this.invQty <= 0) {
      UiUtil.showToast('warning', i18next.t('text.required_sku_loc_qty', { defaultValue: '상품코드/로케이션/재고수량을 입력해주세요.' }))
      return
    }

    const payload = {
      wh_cd: this.whCd,
      com_cd: this.comCd,
      sku_cd: this.skuCd.trim(),
      loc_cd: this.locCd.trim(),
      inv_qty: this.invQty,
      lot_no: this.lotNo || null,
      expired_date: this.expiredDate || null,
      reason_cd: this.reasonCd || null,
      remarks: this.remarks || null
    }

    this.saving = true
    await ServiceUtil.restPost(
      'inventory_trx/create_inventory',
      payload,
      null,
      null,
      () => {
        this.dispatchEvent(new CustomEvent('inventory-created', { detail: payload, bubbles: true, composed: true }))
        this._resetForNext()
        this._refreshParentGrist()
      },
      () => {
        UiUtil.showToast('error', i18next.t('text.failed_to_save', { defaultValue: '재고 생성에 실패했습니다.' }))
      }
    )
    this.saving = false
  }

  /** 연속 등록을 위해 창고/화주사는 유지하고 나머지 입력을 초기화한다 */
  _resetForNext() {
    this.skuCd = ''
    this.locCd = ''
    this.invQty = null
    this.lotNo = ''
    this.expiredDate = ''
    this.reasonCd = ''
    this.remarks = ''
    // 상품코드 입력란에 포커스
    this.updateComplete.then(() => {
      const el = this.renderRoot.querySelectorAll('input[type="text"]')[0]
      if (el) el.focus()
    })
  }

  /**
   * 뒤 화면의 재고 그리드를 새로고침한다.
   * 팝업 자신은 ox-grist를 포함하지 않으므로 문서 내 모든 ox-grist를 재조회한다.
   */
  _refreshParentGrist() {
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

customElements.define('inventory-quick-create-popup', InventoryQuickCreatePopup)
