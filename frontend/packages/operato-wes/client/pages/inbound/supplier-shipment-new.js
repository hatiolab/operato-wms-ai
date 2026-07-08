import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import '../rwa/rwa-sku-search-popup.js'

/**
 * 공급처 입고예정(ASN) 등록 팝업
 *
 * 기능:
 * - 상단 공통값(공급처/화주사/창고/로케이션) + 하단 상품 행 그리드(표시형)
 * - [＋추가] 시 상품 입력 서브팝업을 띄우고, 작성 후 추가하면 그리드에 행이 쌓임
 * - [저장] 시 각 행에 공통값을 복사하여 supplier_shipments/update_multiple 로 일괄 생성
 *   (asn_no·barcode·pallet_qty·플래그는 서버 beforeCreate에서 자동 채번/계산)
 */
class SupplierShipmentNew extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          background-color: var(--md-sys-color-background);
          overflow: hidden;
          height: 100%;
        }

        .form-content {
          flex: 1;
          overflow: auto;
          padding: 20px 24px;
        }

        /* 공통 헤더 */
        .header-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-field label {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
        }

        .form-field label .required {
          color: #f44336;
          margin-left: 2px;
        }

        .form-field select {
          padding: 10px 12px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface);
          outline: none;
        }

        .form-field select:focus {
          border-color: var(--md-sys-color-primary);
        }

        /* 상품 행 영역 */
        .items-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .items-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .add-item-btn {
          padding: 8px 16px;
          border: 1px solid var(--md-sys-color-primary);
          border-radius: 8px;
          background: transparent;
          color: var(--md-sys-color-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-item-btn:hover {
          background: var(--md-sys-color-primary-container);
        }

        /* 표시형 그리드 — 셀은 컬럼 구분선만, 행은 일체형 */
        .table-wrap {
          overflow-x: auto;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: var(--md-sys-color-surface);
          font-size: 13px;
        }

        /* 헤더 — 세로줄 없이 톤만, 소문자 라벨 느낌 */
        thead th {
          padding: 11px 14px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.2px;
          color: var(--md-sys-color-on-surface-variant);
          background: var(--md-sys-color-surface-variant);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          white-space: nowrap;
        }

        /* 셀 — 가로 구분선만 (세로 구분선 제거) */
        tbody td {
          padding: 11px 14px;
          text-align: left;
          color: var(--md-sys-color-on-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          white-space: nowrap;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        tbody tr {
          transition: background 0.12s;
        }

        tbody tr:hover {
          background: color-mix(in srgb, var(--md-sys-color-primary) 6%, transparent);
        }

        /* 상품코드 강조, 상품명은 살짝 진하게 */
        td.code {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        td.num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        td.center {
          text-align: center;
          color: var(--md-sys-color-on-surface-variant);
        }

        td.muted {
          color: var(--md-sys-color-on-surface-variant);
        }

        td.idx {
          text-align: center;
          color: var(--md-sys-color-on-surface-variant);
          font-variant-numeric: tabular-nums;
        }

        .del-cell {
          text-align: center;
        }

        .delete-btn {
          width: 26px;
          height: 26px;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.12s;
        }

        .delete-btn:hover {
          background: #ffebee;
          color: #c62828;
        }

        .empty-items {
          text-align: center;
          padding: 40px 20px;
          color: var(--md-sys-color-on-surface-variant);
          border: 2px dashed var(--md-sys-color-outline-variant);
          border-radius: 12px;
          margin-top: 8px;
        }

        .empty-items .icon {
          font-size: 40px;
          opacity: 0.4;
          margin-bottom: 8px;
        }

        .summary-row {
          display: flex;
          gap: 24px;
          margin-top: 14px;
          padding: 10px 16px;
          background: var(--md-sys-color-surface-variant);
          border-radius: 8px;
          font-size: 14px;
        }

        .summary-row .value {
          font-weight: 600;
        }

        /* 푸터 */
        .popup-footer {
          padding: 14px 24px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          background: var(--md-sys-color-surface);
        }

        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn.primary {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn.danger {
          background: transparent;
          color: #c62828;
          border: 1px solid #ef9a9a;
        }
      `
    ]
  }

  static get properties() {
    return {
      header: Object,
      items: Array,
      vendors: Array,
      companies: Array,
      warehouses: Array,
      locations: Array,
      saving: Boolean
    }
  }

  constructor() {
    super()
    this.header = { vendCd: '', comCd: '', whCd: '', locCd: '' }
    this.items = []
    this.vendors = []
    this.companies = []
    this.warehouses = []
    this.locations = []
    this.saving = false
  }

  /** 팝업 타이틀 설정 */
  get context() {
    return { title: TermsUtil.tMenu('SupplierShipmentNew') || '공급처 입고예정 등록' }
  }

  /** 최초 연결 시 공통값 코드 목록 조회 */
  connectedCallback() {
    super.connectedCallback()
    this._fetchVendors()
    this._fetchCompanies()
    this._fetchWarehouses()
  }

  /** 화면 렌더링 — 공통 헤더 + 상품 표시형 그리드 + 푸터 */
  render() {
    const totalQty = this.items.reduce((s, i) => s + (Number(i.expQty) || 0), 0)
    return html`
      <div class="form-content">
        <div class="header-grid">
          <div class="form-field">
            <label>공급처 <span class="required">*</span></label>
            <select .value="${this.header.vendCd}" @change="${e => this._updateHeader('vendCd', e.target.value)}">
              <option value="">선택</option>
              ${this.vendors.map(v => html`<option value="${v.vend_cd}" ?selected="${this.header.vendCd === v.vend_cd}">${v.vend_cd} - ${v.vend_nm || v.vend_cd}</option>`)}
            </select>
          </div>
          <div class="form-field">
            <label>화주사 <span class="required">*</span></label>
            <select .value="${this.header.comCd}" @change="${e => this._updateHeader('comCd', e.target.value)}">
              <option value="">선택</option>
              ${this.companies.map(c => html`<option value="${c.com_cd}" ?selected="${this.header.comCd === c.com_cd}">${c.com_nm || c.com_cd}</option>`)}
            </select>
          </div>
          <div class="form-field">
            <label>창고 <span class="required">*</span></label>
            <select .value="${this.header.whCd}" @change="${e => this._onWarehouseChange(e.target.value)}">
              <option value="">선택</option>
              ${this.warehouses.map(w => html`<option value="${w.wh_cd}" ?selected="${this.header.whCd === w.wh_cd}">${w.wh_cd} - ${w.wh_nm || w.wh_cd}</option>`)}
            </select>
          </div>
          <div class="form-field">
            <label>로케이션</label>
            <select .value="${this.header.locCd}" ?disabled="${!this.header.whCd}" @change="${e => this._updateHeader('locCd', e.target.value)}">
              <option value="">선택</option>
              ${this.locations.map(l => html`<option value="${l.loc_cd}" ?selected="${this.header.locCd === l.loc_cd}">${l.loc_cd}</option>`)}
            </select>
          </div>
        </div>

        <div class="items-header">
          <h3>상품 목록 (${this.items.length}건)</h3>
          <button class="add-item-btn" @click="${this._openAddItemPopup}">＋ 추가</button>
        </div>

        ${this.items.length === 0
          ? html`
              <div class="empty-items">
                <div class="icon">📦</div>
                <div>＋ 추가 버튼으로 발송할 상품을 등록해주세요</div>
              </div>
            `
          : html`
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width:40px">#</th>
                      <th style="width:150px">상품 코드</th>
                      <th style="width:200px">상품명</th>
                      <th style="width:80px">수량</th>
                      <th style="width:110px">소비기한</th>
                      <th style="width:110px">LOT 번호</th>
                      <th style="width:110px">입고예정일</th>
                      <th style="width:70px">박스입수</th>
                      <th style="width:90px">팔레트박스입수</th>
                      <th style="width:140px">비고</th>
                      <th style="width:40px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.items.map(
                      (item, idx) => html`
                        <tr>
                          <td class="idx">${idx + 1}</td>
                          <td class="code">${item.skuCd || ''}</td>
                          <td>${item.skuNm || ''}</td>
                          <td class="num">${item.expQty ?? ''}</td>
                          <td class="center">${item.expiredDate || '-'}</td>
                          <td class="muted">${item.lotNo || '-'}</td>
                          <td class="center">${item.eta || '-'}</td>
                          <td class="num">${item.boxInQty ?? '-'}</td>
                          <td class="num">${item.pltInQty ?? '-'}</td>
                          <td class="muted">${item.remarks || '-'}</td>
                          <td class="del-cell"><button class="delete-btn" title="삭제" @click="${() => this._removeItem(idx)}">✕</button></td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              </div>

              <div class="summary-row">
                <span>총 행: <span class="value">${this.items.length}건</span></span>
                <span>총 수량: <span class="value">${totalQty} EA</span></span>
              </div>
            `}
      </div>

      <div class="popup-footer">
        <button class="btn danger" @click="${this._close}">취소</button>
        <button class="btn primary" ?disabled="${this.saving}" @click="${this._save}">
          ${this.saving ? '저장 중...' : '저장'}
        </button>
      </div>
    `
  }

  /** 공급처 목록 조회 */
  async _fetchVendors() {
    try {
      const data = await ServiceUtil.searchByPagination('vendors', [], null, 1, 200)
      this.vendors = data?.items || []
    } catch (err) {
      console.error('공급처 목록 조회 실패:', err)
      this.vendors = []
    }
  }

  /** 화주사 목록 조회 (활성 화주사만, 1개면 자동 선택) */
  async _fetchCompanies() {
    try {
      const data = await ServiceUtil.searchByPagination('companies', [{ name: 'del_flag', value: false }], null, 1, 100)
      this.companies = data?.items || []
      if (this.companies.length === 1) {
        this._updateHeader('comCd', this.companies[0].com_cd)
      }
    } catch (err) {
      console.error('화주사 목록 조회 실패:', err)
      this.companies = []
    }
  }

  /** 창고 목록 조회 */
  async _fetchWarehouses() {
    try {
      const data = await ServiceUtil.searchByPagination('warehouses', [], null, 1, 100)
      this.warehouses = data?.items || []
    } catch (err) {
      console.error('창고 목록 조회 실패:', err)
      this.warehouses = []
    }
  }

  /** 선택된 창고의 로케이션 목록 조회 */
  async _fetchLocations(whCd) {
    if (!whCd) {
      this.locations = []
      return
    }
    try {
      const data = await ServiceUtil.searchByPagination('locations', [{ name: 'wh_cd', value: whCd }], null, 1, 200)
      this.locations = data?.items || []
    } catch (err) {
      console.error('로케이션 목록 조회 실패:', err)
      this.locations = []
    }
  }

  /** 공통 헤더 값 업데이트 */
  _updateHeader(field, value) {
    this.header = { ...this.header, [field]: value }
  }

  /** 창고 변경 시 로케이션 재조회 + 기존 로케이션 초기화 */
  _onWarehouseChange(whCd) {
    this.header = { ...this.header, whCd, locCd: '' }
    this._fetchLocations(whCd)
  }

  /**
   * 상품 입력 서브팝업 열기 — 작성 후 추가하면 그리드에 행 추가
   */
  _openAddItemPopup() {
    const element = document.createElement('supplier-shipment-item-new')
    element.comCd = this.header.comCd || ''
    element.addEventListener('item-added', e => {
      this.items = [...this.items, e.detail.item]
    })
    UiUtil.openPopupByElement('상품 추가', 'large', element, true)
  }

  /** 상품 행 삭제 */
  _removeItem(index) {
    this.items = this.items.filter((_, i) => i !== index)
  }

  /** 저장 전 유효성 검사 */
  _validate() {
    const { vendCd, comCd, whCd } = this.header
    if (!vendCd) {
      UiUtil.showToast('warning', '공급처를 선택해주세요')
      return false
    }
    if (!comCd) {
      UiUtil.showToast('warning', '화주사를 선택해주세요')
      return false
    }
    if (!whCd) {
      UiUtil.showToast('warning', '창고를 선택해주세요')
      return false
    }
    if (this.items.length === 0) {
      UiUtil.showToast('warning', '상품을 최소 1건 이상 추가해주세요')
      return false
    }
    return true
  }

  /**
   * 저장 — 각 행에 공통값을 복사하여 supplier_shipments/update_multiple 로 일괄 생성
   * asn_no·barcode·pallet_qty·플래그는 서버 beforeCreate에서 자동 처리
   */
  async _save() {
    if (!this._validate()) return
    this.saving = true

    const { vendCd, comCd, whCd, locCd } = this.header
    const payload = this.items.map(it => ({
      cud_flag_: 'c',
      vend_cd: vendCd,
      com_cd: comCd,
      wh_cd: whCd,
      loc_cd: locCd || null,
      sku_cd: it.skuCd,
      sku_nm: it.skuNm || null,
      exp_qty: Number(it.expQty),
      expired_date: it.expiredDate || null,
      lot_no: it.lotNo || null,
      eta: it.eta || null,
      box_in_qty: it.boxInQty ? Number(it.boxInQty) : null,
      plt_in_qty: it.pltInQty ? Number(it.pltInQty) : null,
      remarks: it.remarks || null
    }))

    try {
      await ServiceUtil.restPost('supplier_shipments/update_multiple', payload)
      UiUtil.showToast('success', `입고예정 ${payload.length}건이 등록되었습니다`)
      this.dispatchEvent(new CustomEvent('shipment-created', { composed: true, bubbles: true, detail: { count: payload.length } }))
      this._close()
    } catch (err) {
      console.error('입고예정 등록 실패:', err)
      UiUtil.showToast('error', err.message || '입고예정 등록에 실패했습니다')
    } finally {
      this.saving = false
    }
  }

  /** 팝업 닫기 */
  _close() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('supplier-shipment-new', SupplierShipmentNew)

/**
 * 공급처 입고예정 상품 입력 서브팝업
 *
 * - 상품(팝업 검색·상품명/박스·팔레트 입수 자동 반영), 수량, 소비기한, LOT, 입고예정일,
 *   박스입수, 팔레트박스입수, 비고 입력
 * - [추가] 시 유효성 검사 후 'item-added' 이벤트로 부모(메인 팝업)에 행 전달
 */
class SupplierShipmentItemNew extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          background-color: var(--md-sys-color-background);
          height: 100%;
        }

        .form-content {
          flex: 1;
          overflow: auto;
          padding: 20px 24px;
        }

        .form-body {
          max-width: 840px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding-top: 4px;
        }

        /* 섹션 */
        .section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--md-sys-color-primary);
        }

        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--md-sys-color-outline-variant);
        }

        /* 상품 선택 히어로 카드 */
        .sku-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          border-radius: 14px;
          border: 1.5px dashed var(--md-sys-color-outline-variant);
          background: var(--md-sys-color-surface);
          cursor: pointer;
          transition: all 0.15s;
        }

        .sku-card:not(.filled):hover {
          border-color: var(--md-sys-color-primary);
          background: var(--md-sys-color-primary-container);
        }

        .sku-card.filled {
          border-style: solid;
          border-color: var(--md-sys-color-primary);
          cursor: default;
        }

        .sku-card .sku-icon {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          background: var(--md-sys-color-primary-container);
        }

        .sku-card .sku-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .sku-card .sku-cd {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
        }

        .sku-card .sku-nm {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sku-card .sku-placeholder {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .sku-card .change-btn {
          flex-shrink: 0;
          padding: 7px 16px;
          border-radius: 8px;
          border: 1px solid var(--md-sys-color-outline-variant);
          background: transparent;
          color: var(--md-sys-color-primary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .sku-card .change-btn:hover {
          background: var(--md-sys-color-primary-container);
        }

        /* 필드 그리드 */
        .fields {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
        }

        .field label .req {
          color: #f44336;
          margin-left: 2px;
        }

        .field input {
          padding: 11px 13px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 9px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface);
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }

        .field input:focus {
          border-color: var(--md-sys-color-primary);
        }

        .popup-footer {
          padding: 14px 24px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          background: var(--md-sys-color-surface);
        }

        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn.primary {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .btn.danger {
          background: transparent;
          color: #c62828;
          border: 1px solid #ef9a9a;
        }
      `
    ]
  }

  static get properties() {
    return {
      comCd: String,
      item: Object
    }
  }

  constructor() {
    super()
    this.comCd = ''
    this.item = { skuCd: '', skuNm: '', expQty: '', expiredDate: '', lotNo: '', eta: '', boxInQty: '', pltInQty: '', remarks: '' }
  }

  /** 팝업 타이틀 설정 */
  get context() {
    return { title: '상품 추가' }
  }

  /** 상품 입력 폼 렌더링 — 상품 히어로 카드 + 수량·입수 / 추가 정보 섹션 */
  render() {
    const it = this.item
    const hasSku = !!it.skuCd
    return html`
      <div class="form-content">
        <div class="form-body">
          <!-- 상품 -->
          <div class="section">
            <div class="section-title">상품</div>
            <div class="sku-card ${hasSku ? 'filled' : ''}" @click="${() => (hasSku ? null : this._openSkuSearch())}">
              <div class="sku-icon">📦</div>
              <div class="sku-info">
                ${hasSku
                  ? html`
                      <span class="sku-cd">${it.skuCd}</span>
                      <span class="sku-nm">${it.skuNm || '-'}</span>
                    `
                  : html`<span class="sku-placeholder">클릭하여 상품을 검색하세요</span>`}
              </div>
              ${hasSku ? html`<button class="change-btn" @click="${e => { e.stopPropagation(); this._openSkuSearch() }}">변경</button>` : ''}
            </div>
          </div>

          <!-- 수량 · 입수 -->
          <div class="section">
            <div class="section-title">수량 · 입수</div>
            <div class="fields">
              <div class="field">
                <label>수량 <span class="req">*</span></label>
                <input type="number" min="0" placeholder="0" .value="${it.expQty}" @input="${e => this._update('expQty', e.target.value)}" />
              </div>
              <div class="field">
                <label>박스입수</label>
                <input type="number" min="0" placeholder="박스당 개수" .value="${it.boxInQty}" @input="${e => this._update('boxInQty', e.target.value)}" />
              </div>
              <div class="field">
                <label>팔레트박스입수</label>
                <input type="number" min="0" placeholder="팔레트당 박스" .value="${it.pltInQty}" @input="${e => this._update('pltInQty', e.target.value)}" />
              </div>
            </div>
          </div>

          <!-- 추가 정보 -->
          <div class="section">
            <div class="section-title">추가 정보</div>
            <div class="fields">
              <div class="field">
                <label>입고예정일</label>
                <input type="date" .value="${it.eta}" @input="${e => this._update('eta', e.target.value)}" />
              </div>
              <div class="field">
                <label>소비기한</label>
                <input type="date" .value="${it.expiredDate}" @input="${e => this._update('expiredDate', e.target.value)}" />
              </div>
              <div class="field">
                <label>LOT 번호</label>
                <input type="text" placeholder="선택 입력" .value="${it.lotNo}" @input="${e => this._update('lotNo', e.target.value)}" />
              </div>
              <div class="field full">
                <label>비고</label>
                <input type="text" placeholder="선택 입력" .value="${it.remarks}" @input="${e => this._update('remarks', e.target.value)}" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="popup-footer">
        <button class="btn danger" @click="${this._close}">취소</button>
        <button class="btn primary" @click="${this._add}">추가</button>
      </div>
    `
  }

  /** 입력값 업데이트 */
  _update(field, value) {
    this.item = { ...this.item, [field]: value }
  }

  /**
   * SKU 검색 팝업 열기 — 선택 시 상품코드/상품명 반영 + 박스/팔레트 입수 마스터값 자동 채움
   */
  _openSkuSearch() {
    const element = document.createElement('rwa-sku-search-popup')
    if (this.comCd) element.comCd = this.comCd
    element.addEventListener('sku-selected', e => {
      const sku = e.detail.sku
      this.item = { ...this.item, skuCd: sku.sku_cd || '', skuNm: sku.sku_nm || '' }
      this._prefillSkuMaster(sku.sku_cd, sku.com_cd || this.comCd)
    })
    UiUtil.openPopupByElement(i18next.t('title.sku_search', { defaultValue: 'SKU 검색' }), 'large', element, true)
  }

  /**
   * 선택한 SKU의 박스입수/팔레트박스입수를 마스터에서 조회하여 채움
   * (마스터에 값이 없으면 공급처가 직접 입력)
   */
  async _prefillSkuMaster(skuCd, comCd) {
    if (!skuCd) return
    try {
      const filters = [{ name: 'sku_cd', value: skuCd }]
      if (comCd) filters.push({ name: 'com_cd', value: comCd })
      const data = await ServiceUtil.searchByPagination('sku', filters, null, 1, 1)
      const sku = data?.items?.[0]
      if (sku) {
        const patch = {}
        if (sku.box_in_qty != null && sku.box_in_qty !== 0) patch.boxInQty = sku.box_in_qty
        if (sku.plt_in_qty != null && sku.plt_in_qty !== 0) patch.pltInQty = sku.plt_in_qty
        this.item = { ...this.item, ...patch }
      }
    } catch (_) {
      // 마스터 조회 실패는 무시
    }
  }

  /** 추가 — 유효성 검사 후 부모에 행 전달 */
  _add() {
    if (!this.item.skuCd) {
      UiUtil.showToast('warning', '상품을 선택해주세요')
      return
    }
    if (!this.item.expQty || Number(this.item.expQty) <= 0) {
      UiUtil.showToast('warning', '수량을 입력해주세요')
      return
    }
    this.dispatchEvent(new CustomEvent('item-added', { composed: true, bubbles: true, detail: { item: { ...this.item } } }))
    this._close()
  }

  /** 팝업 닫기 */
  _close() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('supplier-shipment-item-new', SupplierShipmentItemNew)
