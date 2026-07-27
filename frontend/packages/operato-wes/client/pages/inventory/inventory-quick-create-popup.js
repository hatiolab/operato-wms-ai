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

        /* 홀딩(자물쇠) 라벨 — 클릭하면 저장 시 값 유지 토글 */
        .hold-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
          cursor: pointer;
          user-select: none;
        }

        .hold-label .lock-icon {
          font-size: 12px;
          line-height: 1;
        }

        .hold-label:hover .hold-text {
          text-decoration: underline;
        }

        /* 홀딩된 항목 라벨 강조 (앰버) */
        .hold-label.locked {
          color: #e8820c;
          font-weight: 700;
        }

        /* 홀딩된 입력창 표시 (앰버 배경/테두리) */
        select.held,
        input.held {
          background: #fff8e1;
          border-color: #f5a623;
        }

        select.held:focus,
        input.held:focus {
          border-color: #e8820c;
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
      saving: { type: Boolean },
      held: { type: Object }
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
    // 홀딩 상태 — true인 항목은 저장 후에도 값이 초기화되지 않는다.
    // 창고/화주사는 기본 홀딩. 팝업을 새로 열면(=새 인스턴스) 이 기본값으로 초기화된다.
    this.held = { wh_cd: true, com_cd: true }
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
          ${this._renderHoldLabel('wh_cd', true)}
          <select class=${this.held['wh_cd'] ? 'held' : ''} @change=${e => (this.whCd = e.target.value)}>
            <option value="">-</option>
            ${this.whOptions.map(
              w => html`<option value=${w.wh_cd} ?selected=${this.whCd === w.wh_cd}>${w.wh_nm} (${w.wh_cd})</option>`
            )}
          </select>
        </div>
        <div class="field">
          ${this._renderHoldLabel('com_cd', true)}
          <select class=${this.held['com_cd'] ? 'held' : ''} @change=${e => (this.comCd = e.target.value)}>
            <option value="">-</option>
            ${this.comOptions.map(
              c => html`<option value=${c.com_cd} ?selected=${this.comCd === c.com_cd}>${c.com_nm} (${c.com_cd})</option>`
            )}
          </select>
        </div>
        <div class="field">
          ${this._renderHoldLabel('inv_qty', true)}
          <input
            type="number"
            min="1"
            class=${this.held['inv_qty'] ? 'held' : ''}
            .value=${this.invQty == null ? '' : String(this.invQty)}
            @input=${e => (this.invQty = e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </div>

      <div class="row">
        <div class="field">
          ${this._renderHoldLabel('sku_cd', true)}
          <div class="input-with-btn">
            <input type="text" class=${this.held['sku_cd'] ? 'held' : ''} .value=${this.skuCd} @input=${e => (this.skuCd = e.target.value)} />
            <button class="icon-btn" title=${i18next.t('label.search', { defaultValue: '상품 선택' })} @click=${() => this._openSkuPicker()}>🔍</button>
          </div>
        </div>
        <div class="field">
          ${this._renderHoldLabel('loc_cd', true)}
          <input type="text" class=${this.held['loc_cd'] ? 'held' : ''} .value=${this.locCd} @input=${e => (this.locCd = e.target.value)} />
        </div>
        <div class="field">
          ${this._renderHoldLabel('expired_date', false)}
          <input type="date" class=${this.held['expired_date'] ? 'held' : ''} .value=${this.expiredDate} @input=${e => (this.expiredDate = e.target.value)} />
        </div>
      </div>

      <div class="row">
        <div class="field">
          ${this._renderHoldLabel('lot_no', false)}
          <input type="text" class=${this.held['lot_no'] ? 'held' : ''} .value=${this.lotNo} @input=${e => (this.lotNo = e.target.value)} />
        </div>
        <div class="field">
          ${this._renderHoldLabel('reason_cd', false)}
          <select class=${this.held['reason_cd'] ? 'held' : ''} @change=${e => (this.reasonCd = e.target.value)}>
            ${this.reasonOptions.map(
              r => html`<option value=${r.value} ?selected=${this.reasonCd === r.value}>${r.display}</option>`
            )}
          </select>
        </div>
        <div class="field">
          ${this._renderHoldLabel('remarks', false)}
          <input type="text" class=${this.held['remarks'] ? 'held' : ''} .value=${this.remarks} @input=${e => (this.remarks = e.target.value)} />
        </div>
      </div>

      <div class="footer">
        <button class="close" @click=${() => this._onClose()}>${TermsUtil.tButton('close')}</button>
        <button class="save" ?disabled=${this.saving} @click=${() => this._onSave()}>${TermsUtil.tButton('save')}</button>
      </div>
    `
  }

  /**
   * 홀딩(자물쇠) 토글이 가능한 항목 라벨을 렌더한다.
   * 라벨(자물쇠 아이콘 포함) 클릭 시 해당 항목의 홀딩 상태가 토글되며,
   * 홀딩된 항목은 저장 후에도 값이 초기화되지 않는다. (값 변경은 언제든 가능)
   * @param {string} key 항목 키(용어 키 겸용, 예: 'wh_cd')
   * @param {boolean} required 필수 여부(빨간 * 표시)
   */
  _renderHoldLabel(key, required = false) {
    const locked = !!this.held[key]
    return html`
      <label
        class="hold-label ${locked ? 'locked' : ''}"
        title=${locked
          ? i18next.t('text.hold_locked', { defaultValue: '홀딩됨 — 클릭하면 해제 (저장 시 값 유지)' })
          : i18next.t('text.hold_unlocked', { defaultValue: '클릭하면 홀딩 (저장 시 값 유지)' })}
        @click=${() => this._toggleHold(key)}
      >
        <span class="lock-icon">${locked ? '🔒' : '🔓'}</span>
        <span class="hold-text">${TermsUtil.tLabel(key)}</span>${required ? html`<span class="req">*</span>` : ''}
      </label>
    `
  }

  /** 항목의 홀딩 상태를 토글한다 (저장 시 값 유지 여부) */
  _toggleHold(key) {
    this.held = { ...this.held, [key]: !this.held[key] }
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

  /** 연속 등록을 위해 홀딩되지 않은 항목만 초기화한다 (홀딩된 항목은 값 유지) */
  _resetForNext() {
    const resetters = {
      wh_cd: () => (this.whCd = ''),
      com_cd: () => (this.comCd = ''),
      inv_qty: () => (this.invQty = null),
      sku_cd: () => (this.skuCd = ''),
      loc_cd: () => (this.locCd = ''),
      expired_date: () => (this.expiredDate = ''),
      lot_no: () => (this.lotNo = ''),
      reason_cd: () => (this.reasonCd = ''),
      remarks: () => (this.remarks = '')
    }
    Object.keys(resetters).forEach(key => {
      if (!this.held[key]) resetters[key]()
    })
    // 상품코드가 홀딩되지 않았다면 상품코드 입력란에 포커스 (연속 등록 편의)
    this.updateComplete.then(() => {
      const el = this.renderRoot.querySelectorAll('input[type="text"]')[0]
      if (el && !this.held['sku_cd']) el.focus()
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
