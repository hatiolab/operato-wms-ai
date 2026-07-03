import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import './rwa-sku-search-popup.js'
import './rwa-shipment-import-popup.js'
import './rwa-shipment-search-popup.js'

/**
 * 반품 요청 등록 팝업
 *
 * 기능:
 * - 2단계 폼: 기본 정보 → 반품 항목
 * - 반품 지시 + 상세 항목 일괄 생성
 * - API: POST /rest/rwa_trx/rwa_orders/with_items
 */
class RwaOrderNew extends localize(i18next)(LitElement) {
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

        /* 스텝 인디케이터 */
        .step-indicator {
          padding: 12px 24px;
          background: var(--md-sys-color-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .step {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface-variant);
        }

        .step.active .step-number {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .step.completed .step-number {
          background: #4CAF50;
          color: white;
        }

        .step-divider {
          width: 32px;
          height: 2px;
          background: var(--md-sys-color-outline-variant);
        }

        .step.completed + .step-divider {
          background: #4CAF50;
        }

        /* 폼 컨텐츠 */
        .form-content {
          flex: 1;
          overflow: auto;
          padding: 24px;
        }

        .form-section {
          display: none;
        }

        .form-section.active {
          display: block;
        }

        /* 폼 그리드 */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-grid .full-width {
          grid-column: 1 / -1;
        }

        /* 폼 필드 */
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
          color: #F44336;
          margin-left: 2px;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          padding: 10px 12px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface);
          outline: none;
          transition: border-color 0.2s;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          border-color: var(--md-sys-color-primary);
        }

        .form-field textarea {
          min-height: 40px;
          resize: vertical;
        }

        .checkbox-field {
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }

        .checkbox-field input[type='checkbox'] {
          width: 18px;
          height: 18px;
          accent-color: var(--md-sys-color-primary);
        }

        /* 반품 항목 테이블 */
        .items-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .items-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .add-item-btn {
          padding: 8px 16px;
          border: 1px dashed var(--md-sys-color-primary);
          border-radius: 8px;
          background: transparent;
          color: var(--md-sys-color-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-item-btn:hover {
          background: var(--md-sys-color-primary-container);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: var(--md-sys-color-surface);
          border-radius: 8px;
          overflow: hidden;
        }

        thead {
          background: var(--md-sys-color-surface-variant);
        }

        th,
        td {
          padding: 4px 12px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          font-size: 13px;
        }

        th {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        td input,
        td select {
          width: 100%;
          padding: 3px 8px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface);
          outline: none;
          box-sizing: border-box;
        }

        td input:focus,
        td select:focus {
          border-color: var(--md-sys-color-primary);
        }

        td input[type='number'] {
          text-align: right;
          width: 80px;
        }

        .delete-btn {
          width: 26px;
          height: 26px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #C62828;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .delete-btn:hover {
          background: #FFEBEE;
        }

        .sku-input-wrap {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .sku-input-wrap input {
          flex: 1;
          min-width: 0;
        }

        .sku-search-btn {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 6px;
          background: var(--md-sys-color-surface-variant);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }

        .sku-search-btn:hover {
          background: var(--md-sys-color-primary-container);
          border-color: var(--md-sys-color-primary);
        }

        /* 합계 영역 */
        .summary-row {
          display: flex;
          gap: 24px;
          margin-top: 16px;
          padding: 12px 16px;
          background: var(--md-sys-color-surface-variant);
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .summary-item .label {
          color: var(--md-sys-color-on-surface-variant);
        }

        .summary-item .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        /* 빈 항목 안내 */
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

        .empty-items .text {
          font-size: 14px;
        }

        /* 푸터 버튼 영역 */
        .popup-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--md-sys-color-surface);
        }

        .footer-left,
        .footer-right {
          display: flex;
          gap: 8px;
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

        .btn.primary:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn.secondary {
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface);
        }

        .btn.secondary:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        .btn.danger {
          background: transparent;
          color: #C62828;
          border: 1px solid #EF9A9A;
        }

        .btn.danger:hover {
          background: #FFEBEE;
        }

        /* 자동완성 드롭다운 */
        .autocomplete-wrap {
          position: relative;
        }

        .autocomplete-wrap input {
          width: 100%;
          box-sizing: border-box;
        }

        .autocomplete-list {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 9999;
          background: var(--md-sys-color-surface);
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
          max-height: 220px;
          overflow-y: auto;
        }

        .autocomplete-item {
          padding: 10px 14px;
          cursor: pointer;
          font-size: 14px;
          color: var(--md-sys-color-on-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          transition: background 0.12s;
        }

        .autocomplete-item:last-child {
          border-bottom: none;
        }

        .autocomplete-item:hover,
        .autocomplete-item.selected,
        .autocomplete-item.highlighted {
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-on-primary-container, #0d47a1);
        }

        .autocomplete-empty {
          padding: 10px 14px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          text-align: center;
        }

        /* 출고주문 연동 */
        .shipment-order-wrap {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .shipment-order-wrap input {
          flex: 1;
        }

        .shipment-order-add-btn {
          flex-shrink: 0;
          padding: 10px 16px;
          border: 1px solid var(--md-sys-color-primary);
          border-radius: 8px;
          background: transparent;
          color: var(--md-sys-color-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .shipment-order-add-btn:hover {
          background: var(--md-sys-color-primary-container);
        }

        .shipment-order-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .shipment-search-btn {
          flex-shrink: 0;
          padding: 10px 16px;
          border: 1px solid var(--md-sys-color-primary);
          border-radius: 8px;
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .shipment-search-btn:hover {
          background: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
        }

        .shipment-excel-btn {
          flex-shrink: 0;
          padding: 10px 14px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface-variant);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .shipment-excel-btn:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        /* 출고주문 연동 라벨 행 (라벨 + 전체 삭제 버튼) */
        .shipment-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .shipment-clear-btn {
          padding: 3px 10px;
          border: 1px solid #ef9a9a;
          border-radius: 6px;
          background: transparent;
          color: #C62828;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .shipment-clear-btn:hover {
          background: #FFEBEE;
        }

        .shipment-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .shipment-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px 4px 12px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-on-primary-container, #0d47a1);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }

        .shipment-chip .chip-remove {
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.12);
          color: inherit;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          transition: background 0.15s;
        }

        .shipment-chip .chip-remove:hover {
          background: rgba(0, 0, 0, 0.24);
        }

        /* 그룹 헤더 행 */
        .group-header-row td {
          background: var(--md-sys-color-surface-variant);
          font-weight: 600;
          font-size: 12px;
          color: var(--md-sys-color-on-surface);
          padding: 4px 12px;
          border-bottom: 2px solid var(--md-sys-color-outline-variant);
        }

        .group-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .badge.shipment {
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-on-primary-container, #0d47a1);
        }

        .badge.manual {
          background: #fff3e0;
          color: #e65100;
        }

        .cell-text {
          font-size: 13px;
          color: var(--md-sys-color-on-surface);
          padding: 6px 2px;
          display: block;
        }
      `
    ]
  }

  static get properties() {
    return {
      currentStep: Number,
      rwaOrder: Object,
      items: Array,
      saving: Boolean,
      companies: Array,
      warehouses: Array,
      customers: Array,
      /** 자동완성 입력값 */
      companyInput: String,
      warehouseInput: String,
      customerInput: String,
      /** 자동완성 드롭다운 표시 여부 */
      showCompanySuggestions: Boolean,
      showWarehouseSuggestions: Boolean,
      showCustomerSuggestions: Boolean,
      /** 자동완성 키보드 하이라이트 인덱스 (-1: 없음) */
      companyHighlight: Number,
      warehouseHighlight: Number,
      customerHighlight: Number,
      /** 출고주문 연동 */
      shipmentOrderInput: String,
      shipmentOrders: Array,
      shipmentOrderLoading: Boolean
    }
  }

  constructor() {
    super()
    this.currentStep = 1
    this.saving = false

    const today = new Date().toISOString().slice(0, 10)
    this.rwaOrder = {
      rwaType: 'CUSTOMER_RETURN',
      comCd: '',
      whCd: '',
      custCd: '',
      custNm: '',
      orderNo: '',
      rwaReqDate: today,
      inspFlag: true,
      qcFlag: false,
      remarks: ''
    }
    this.items = []
    this.companies = []
    this.warehouses = []
    this.customers = []
    this.companyInput = ''
    this.warehouseInput = ''
    this.customerInput = ''
    this.showCompanySuggestions = false
    this.showWarehouseSuggestions = false
    this.showCustomerSuggestions = false
    this.companyHighlight = -1
    this.warehouseHighlight = -1
    this.customerHighlight = -1
    this.shipmentOrderInput = ''
    this.shipmentOrders = []
    this.shipmentOrderLoading = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._fetchCompanies()
    this._fetchWarehouses()
  }

  get context() {


    return {


      title: TermsUtil.tMenu('RwaOrderNew')


    }


  }



  render() {
    return html`
      <!-- 스텝 인디케이터 -->
      <div class="step-indicator">
        <div class="step ${this.currentStep === 1 ? 'active' : this.currentStep > 1 ? 'completed' : ''}">
          <span class="step-number">${this.currentStep > 1 ? '✓' : '1'}</span>
          <span>기본 정보</span>
        </div>
        <span class="step-divider"></span>
        <div class="step ${this.currentStep === 2 ? 'active' : ''}">
          <span class="step-number">2</span>
          <span>반품 항목</span>
        </div>
      </div>

      <!-- 폼 -->
      <div class="form-content">
        <!-- 1단계: 기본 정보 -->
        <div class="form-section ${this.currentStep === 1 ? 'active' : ''}">
          ${this._renderStep1()}
        </div>

        <!-- 2단계: 반품 항목 -->
        <div class="form-section ${this.currentStep === 2 ? 'active' : ''}">
          ${this._renderStep2()}
        </div>
      </div>

      <!-- 푸터 -->
      <div class="popup-footer">
        <div class="footer-left">
          ${this.currentStep === 2
        ? html`<button class="btn secondary" @click="${this._prevStep}">← 이전</button>`
        : html`<button class="btn danger" @click="${this._close}">취소</button>`}
        </div>
        <div class="footer-right">
          ${this.currentStep === 1
        ? html`<button class="btn primary" @click="${this._nextStep}">다음 →</button>`
        : html`<button class="btn primary" ?disabled="${this.saving}" @click="${this._save}">
                ${this.saving ? '저장 중...' : '저장'}
              </button>`}
        </div>
      </div>
    `
  }

  /**
   * 1단계: 기본 정보 폼
   */
  _renderStep1() {
    return html`
      <div class="form-grid">
        <div class="form-field">
          <label>반품 유형 <span class="required">*</span></label>
          <select .value="${this.rwaOrder.rwaType}" @change="${e => this._updateOrder('rwaType', e.target.value)}">
            <option value="CUSTOMER_RETURN">고객 반품</option>
            <option value="VENDOR_RETURN">공급업체 반품</option>
            <option value="DEFECT_RETURN">불량품 반품</option>
            <option value="STOCK_ADJUST">재고 조정</option>
            <option value="EXPIRED_RETURN">유통기한 임박</option>
          </select>
        </div>

        <div class="form-field">
          <label>반품 요청일 <span class="required">*</span></label>
          <input type="date" .value="${this.rwaOrder.rwaReqDate}" @change="${e => this._updateOrder('rwaReqDate', e.target.value)}" />
        </div>

        <div class="form-field">
          <label>화주사 <span class="required">*</span></label>
          <div class="autocomplete-wrap">
            <input
              type="text"
              placeholder="화주사 코드 또는 이름 입력"
              .value="${this.companyInput}"
              @input="${e => {
                this.companyInput = e.target.value
                this.showCompanySuggestions = true
                this.companyHighlight = -1
                if (!e.target.value) this._onCompanySelect('')
              }}"
              @focus="${() => { this.showCompanySuggestions = true }}"
              @blur="${() => setTimeout(() => { this.showCompanySuggestions = false; this.companyHighlight = -1 }, 180)}"
              @keydown="${e => this._onAutocompleteKeydown(e, 'company')}"
            />
            ${this.showCompanySuggestions ? html`
              <div class="autocomplete-list">
                ${this._filteredCompanies.length > 0
                  ? this._filteredCompanies.map((c, idx) => html`
                      <div
                        class="autocomplete-item ${this.rwaOrder.comCd === c.com_cd ? 'selected' : ''} ${this.companyHighlight === idx ? 'highlighted' : ''}"
                        @mousedown="${() => this._selectCompany(c.com_cd)}"
                      >${c.com_cd} - ${c.com_nm || c.name || c.com_cd}</div>
                    `)
                  : html`<div class="autocomplete-empty">검색 결과 없음</div>`
                }
              </div>
            ` : ''}
          </div>
        </div>

        <div class="form-field">
          <label>창고 <span class="required">*</span></label>
          <div class="autocomplete-wrap">
            <input
              type="text"
              placeholder="창고 코드 또는 이름 입력"
              .value="${this.warehouseInput}"
              @input="${e => {
                this.warehouseInput = e.target.value
                this.showWarehouseSuggestions = true
                this.warehouseHighlight = -1
                if (!e.target.value) this._updateOrder('whCd', '')
              }}"
              @focus="${() => { this.showWarehouseSuggestions = true }}"
              @blur="${() => setTimeout(() => { this.showWarehouseSuggestions = false; this.warehouseHighlight = -1 }, 180)}"
              @keydown="${e => this._onAutocompleteKeydown(e, 'warehouse')}"
            />
            ${this.showWarehouseSuggestions ? html`
              <div class="autocomplete-list">
                ${this._filteredWarehouses.length > 0
                  ? this._filteredWarehouses.map((w, idx) => html`
                      <div
                        class="autocomplete-item ${this.rwaOrder.whCd === w.wh_cd ? 'selected' : ''} ${this.warehouseHighlight === idx ? 'highlighted' : ''}"
                        @mousedown="${() => this._selectWarehouse(w.wh_cd)}"
                      >${w.wh_cd} - ${w.wh_nm || w.name || w.wh_cd}</div>
                    `)
                  : html`<div class="autocomplete-empty">검색 결과 없음</div>`
                }
              </div>
            ` : ''}
          </div>
        </div>

        <div class="form-field">
          <label>거래처</label>
          <div class="autocomplete-wrap">
            <input
              type="text"
              placeholder="거래처 코드 또는 이름 입력"
              .value="${this.customerInput}"
              ?disabled="${!this.rwaOrder.comCd}"
              @input="${e => {
                this.customerInput = e.target.value
                this.showCustomerSuggestions = true
                this.customerHighlight = -1
                if (!e.target.value) this._onCustomerSelect('')
              }}"
              @focus="${() => { this.showCustomerSuggestions = true }}"
              @blur="${() => setTimeout(() => { this.showCustomerSuggestions = false; this.customerHighlight = -1 }, 180)}"
              @keydown="${e => this._onAutocompleteKeydown(e, 'customer')}"
            />
            ${this.showCustomerSuggestions && this.rwaOrder.comCd ? html`
              <div class="autocomplete-list">
                ${this._filteredCustomers.length > 0
                  ? this._filteredCustomers.map((c, idx) => html`
                      <div
                        class="autocomplete-item ${this.rwaOrder.custCd === c.cust_cd ? 'selected' : ''} ${this.customerHighlight === idx ? 'highlighted' : ''}"
                        @mousedown="${() => this._selectCustomer(c.cust_cd)}"
                      >${c.cust_cd} - ${c.cust_nm || c.name || c.cust_cd}</div>
                    `)
                  : html`<div class="autocomplete-empty">검색 결과 없음</div>`
                }
              </div>
            ` : ''}
          </div>
        </div>

        <div class="form-field">
          <label>비고</label>
          <input type="text" placeholder="비고" .value="${this.rwaOrder.remarks}" @input="${e => this._updateOrder('remarks', e.target.value)}" />
        </div>

        <!-- 원 주문번호: 미사용으로 숨김 처리 (추후 활성화 예정) -->

        <!-- 검수 필요 / 품질검사 필요 체크박스: 미사용으로 숨김 처리 (추후 활성화 예정) -->

        <!-- 출고주문 연동 -->
        <div class="form-field full-width">
          <div class="shipment-label-row">
            <label>출고주문 연동</label>
            ${this.shipmentOrders.length > 0 ? html`
              <button class="shipment-clear-btn" title="연동된 출고주문 전체 삭제"
                @click="${this._clearShipmentOrders}">✕ 전체 삭제 (${this.shipmentOrders.length})</button>
            ` : ''}
          </div>
          <div class="shipment-order-wrap">
            <input
              type="text"
              placeholder="출고주문번호 입력 후 Enter 또는 추가 버튼 클릭"
              .value="${this.shipmentOrderInput}"
              ?disabled="${this.shipmentOrderLoading}"
              @input="${e => { this.shipmentOrderInput = e.target.value }}"
              @keydown="${e => e.key === 'Enter' && this._addShipmentOrder()}"
            />
            <button
              class="shipment-order-add-btn"
              ?disabled="${!this.shipmentOrderInput || this.shipmentOrderLoading}"
              @click="${this._addShipmentOrder}"
            >${this.shipmentOrderLoading ? '조회 중...' : '+ 추가'}</button>
            <button
              class="shipment-search-btn"
              title="출하완료된 출고주문을 검색하여 선택합니다"
              @click="${this._openShipmentSearchPopup}"
            >🔍 검색</button>
            <button
              class="shipment-excel-btn"
              title="엑셀 파일로 출고주문을 일괄 등록합니다"
              @click="${this._openShipmentImportPopup}"
            >📊 엑셀 일괄 등록</button>
          </div>
          ${this.shipmentOrders.length > 0 ? html`
            <div class="shipment-chips">
              ${this.shipmentOrders.map(so => html`
                <span class="shipment-chip">
                  📦 ${so.shipment_no}
                  <button class="chip-remove" title="제거" @click="${() => this._removeShipmentOrder(so.shipment_no)}">✕</button>
                </span>
              `)}
            </div>
          ` : ''}
        </div>

      </div>
    `
  }

  /**
   * 2단계: 반품 항목 테이블 (출고주문 그룹 + 수동 등록 그룹 구분 표시)
   */
  _renderStep2() {
    const groups = this._groupedItems
    const totalItems = this.items.length
    const totalQty = this.items.reduce((sum, i) => sum + (i.rwaReqQty || 0), 0)

    return html`
      <div class="items-header">
        <h3>반품 상품 목록 (${totalItems}건)</h3>
        <button class="add-item-btn" @click="${this._addItem}">+ 수동 추가</button>
      </div>

      ${totalItems === 0
        ? html`
            <div class="empty-items">
              <div class="icon">📦</div>
              <div class="text">출고주문을 연동하거나 항목을 직접 추가해주세요</div>
            </div>
          `
        : html`
            <table>
              <thead>
                <tr>
                  <th style="width:50px">순번</th>
                  <th style="width:130px">SKU 코드</th>
                  <th>상품명</th>
                  <th style="width:90px">반품 수량</th>
                  <th style="width:130px">반품 사유</th>
                  <th style="width:50px"></th>
                </tr>
              </thead>
              ${groups.map(group => html`
                <tbody>
                  <tr class="group-header-row">
                    <td colspan="6">
                      <span class="group-badge">
                        ${group.type === 'SHIPMENT'
                          ? html`<span class="badge shipment">출고주문</span> ${group.no}`
                          : html`<span class="badge manual">수동 등록</span>`}
                      </span>
                    </td>
                  </tr>
                  ${group.entries.length === 0 ? html`
                    <tr>
                      <td colspan="6" style="text-align:center;color:var(--md-sys-color-on-surface-variant);font-size:13px;padding:16px">
                        항목이 없습니다
                      </td>
                    </tr>
                  ` : group.entries.map(({ item, globalIdx }) => html`
                    <tr>
                      <td style="text-align:center">${globalIdx + 1}</td>
                      <td>
                        ${item.sourceType === 'SHIPMENT' ? html`
                          <span class="cell-text">${item.skuCd}</span>
                        ` : html`
                          <div class="sku-input-wrap">
                            <input
                              type="text"
                              placeholder="SKU"
                              .value="${item.skuCd}"
                              @input="${e => this._updateItem(globalIdx, 'skuCd', e.target.value)}"
                              @keydown="${e => e.key === 'Enter' && e.target.blur()}"
                              @blur="${e => this._lookupSkuByCode(globalIdx, e.target.value)}"
                            />
                            <button
                              class="sku-search-btn"
                              title="${i18next.t('button.sku_search', { defaultValue: 'SKU 검색' })}"
                              @click="${() => this._openSkuSearch(globalIdx)}"
                            >🔍</button>
                          </div>
                        `}
                      </td>
                      <td>
                        ${item.sourceType === 'SHIPMENT' ? html`
                          <span class="cell-text">${item.skuNm}</span>
                        ` : html`
                          <input
                            type="text"
                            placeholder="상품명"
                            .value="${item.skuNm}"
                            @input="${e => this._updateItem(globalIdx, 'skuNm', e.target.value)}"
                          />
                        `}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          .value="${String(item.rwaReqQty)}"
                          @input="${e => this._updateItem(globalIdx, 'rwaReqQty', Number(e.target.value))}"
                        />
                      </td>
                      <td>
                        <select .value="${item.returnReason}" @change="${e => this._updateItem(globalIdx, 'returnReason', e.target.value)}">
                          <option value="">선택</option>
                          <option value="DEFECT">상품 하자</option>
                          <option value="WRONG_ITEM">오배송</option>
                          <option value="CUSTOMER_CHANGE">고객 변심</option>
                          <option value="DAMAGED">파손</option>
                          <option value="EXPIRED">유통기한</option>
                          <option value="OTHER">기타</option>
                        </select>
                      </td>
                      <td>
                        <button class="delete-btn" @click="${() => this._removeItem(globalIdx)}">✕</button>
                      </td>
                    </tr>
                  `)}
                </tbody>
              `)}
            </table>

            <div class="summary-row">
              <div class="summary-item">
                <span class="label">총 항목:</span>
                <span class="value">${totalItems}건</span>
              </div>
              <div class="summary-item">
                <span class="label">총 수량:</span>
                <span class="value">${totalQty} EA</span>
              </div>
            </div>
          `}
    `
  }

  /**
   * 항목을 출고주문 그룹 / 수동 등록 그룹으로 분류하여 반환
   * 각 entry에 items 배열 내 전역 인덱스(globalIdx)를 포함
   */
  get _groupedItems() {
    const groups = []

    for (const so of this.shipmentOrders) {
      const entries = []
      this.items.forEach((item, globalIdx) => {
        if (item.sourceNo === so.shipment_no) entries.push({ item, globalIdx })
      })
      groups.push({ type: 'SHIPMENT', no: so.shipment_no, entries })
    }

    const manualEntries = []
    this.items.forEach((item, globalIdx) => {
      if (item.sourceType === 'MANUAL') manualEntries.push({ item, globalIdx })
    })
    if (manualEntries.length > 0 || groups.length === 0) {
      groups.push({ type: 'MANUAL', no: null, entries: manualEntries })
    }

    return groups
  }

  /**
   * 자동완성 키보드 네비게이션 처리
   * - ArrowDown: 다음 항목으로 하이라이트 이동
   * - ArrowUp: 이전 항목으로 하이라이트 이동
   * - Enter: 하이라이트된 항목 선택
   * - Escape: 드롭다운 닫기
   */
  _onAutocompleteKeydown(e, type) {
    const config = {
      company: {
        items: () => this._filteredCompanies,
        highlight: 'companyHighlight',
        show: 'showCompanySuggestions',
        select: item => this._selectCompany(item.com_cd)
      },
      warehouse: {
        items: () => this._filteredWarehouses,
        highlight: 'warehouseHighlight',
        show: 'showWarehouseSuggestions',
        select: item => this._selectWarehouse(item.wh_cd)
      },
      customer: {
        items: () => this._filteredCustomers,
        highlight: 'customerHighlight',
        show: 'showCustomerSuggestions',
        select: item => this._selectCustomer(item.cust_cd)
      }
    }

    const cfg = config[type]
    const items = cfg.items()
    const currentIdx = this[cfg.highlight]

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this[cfg.show] = true
      this[cfg.highlight] = Math.min(currentIdx + 1, items.length - 1)
      this._scrollHighlightedIntoView()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this[cfg.highlight] = Math.max(currentIdx - 1, -1)
      this._scrollHighlightedIntoView()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (currentIdx >= 0 && items[currentIdx]) {
        cfg.select(items[currentIdx])
        this[cfg.highlight] = -1
      }
    } else if (e.key === 'Escape') {
      this[cfg.show] = false
      this[cfg.highlight] = -1
    }
  }

  /**
   * 하이라이트된 자동완성 항목을 스크롤하여 보이도록 처리
   */
  _scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      const el = this.shadowRoot?.querySelector('.autocomplete-item.highlighted')
      if (el) el.scrollIntoView({ block: 'nearest' })
    })
  }

  /**
   * 텍스트 입력값으로 화주사 목록 필터링 (LIKE 검색)
   */
  get _filteredCompanies() {
    const q = (this.companyInput || '').toLowerCase().trim()
    if (!q) return this.companies
    return this.companies.filter(
      c =>
        (c.com_cd || '').toLowerCase().includes(q) ||
        (c.com_nm || c.name || '').toLowerCase().includes(q)
    )
  }

  /**
   * 텍스트 입력값으로 창고 목록 필터링 (LIKE 검색)
   */
  get _filteredWarehouses() {
    const q = (this.warehouseInput || '').toLowerCase().trim()
    if (!q) return this.warehouses
    return this.warehouses.filter(
      w =>
        (w.wh_cd || '').toLowerCase().includes(q) ||
        (w.wh_nm || w.name || '').toLowerCase().includes(q)
    )
  }

  /**
   * 텍스트 입력값으로 거래처 목록 필터링 (LIKE 검색)
   */
  get _filteredCustomers() {
    const q = (this.customerInput || '').toLowerCase().trim()
    if (!q) return this.customers
    return this.customers.filter(
      c =>
        (c.cust_cd || '').toLowerCase().includes(q) ||
        (c.cust_nm || c.name || '').toLowerCase().includes(q)
    )
  }

  /**
   * 화주사 자동완성에서 항목 선택
   */
  _selectCompany(comCd) {
    const comp = this.companies.find(c => c.com_cd === comCd)
    if (comp) {
      this.companyInput = `${comp.com_cd} - ${comp.com_nm || comp.name || comp.com_cd}`
      this.showCompanySuggestions = false
      this._onCompanySelect(comCd)
    }
  }

  /**
   * 창고 자동완성에서 항목 선택
   */
  _selectWarehouse(whCd) {
    const wh = this.warehouses.find(w => w.wh_cd === whCd)
    if (wh) {
      this.warehouseInput = `${wh.wh_cd} - ${wh.wh_nm || wh.name || wh.wh_cd}`
      this.showWarehouseSuggestions = false
      this._updateOrder('whCd', whCd)
    }
  }

  /**
   * 거래처 자동완성에서 항목 선택
   */
  _selectCustomer(custCd) {
    const cust = this.customers.find(c => c.cust_cd === custCd)
    if (cust) {
      this.customerInput = `${cust.cust_cd} - ${cust.cust_nm || cust.name || cust.cust_cd}`
      this.showCustomerSuggestions = false
      this._onCustomerSelect(custCd)
    }
  }

  /**
   * 주문 정보 업데이트
   */
  _updateOrder(field, value) {
    this.rwaOrder = { ...this.rwaOrder, [field]: value }
  }

  /**
   * 거래처 선택 시 코드 + 고객명 자동 설정
   */
  _onCustomerSelect(custCd) {
    if (custCd) {
      const cust = this.customers.find(c => c.cust_cd === custCd)
      this.rwaOrder = {
        ...this.rwaOrder,
        custCd,
        custNm: cust?.cust_nm || cust?.name || ''
      }
    } else {
      this.rwaOrder = { ...this.rwaOrder, custCd: '', custNm: '' }
    }
  }

  /** 화주사 목록 조회 (del_flag=false 인 활성 화주사만 조회, 1개면 자동 선택) */
  async _fetchCompanies() {
    try {
      const data = await ServiceUtil.searchByPagination('companies', [{ name: 'del_flag', value: false }], null, 1, 100)
      this.companies = data?.items || []
      if (this.companies.length === 1) {
        const comp = this.companies[0]
        const comCd = comp.com_cd
        this.companyInput = `${comp.com_cd} - ${comp.com_nm || comp.name || comp.com_cd}`
        this.rwaOrder = { ...this.rwaOrder, comCd }
        this._fetchCustomers(comCd)
      }
    } catch (err) {
      console.error('화주사 목록 조회 실패:', err)
      this.companies = []
    }
  }

  /**
   * 화주사 선택 시 comCd 업데이트 + 거래처 목록 재조회
   */
  _onCompanySelect(comCd) {
    this.rwaOrder = { ...this.rwaOrder, comCd, custCd: '', custNm: '' }
    this.customers = []
    this.customerInput = ''
    if (comCd) this._fetchCustomers(comCd)
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

  /** 거래처 목록 조회 (선택한 화주사의 거래처만 조회) */
  async _fetchCustomers(comCd) {
    if (!comCd) {
      this.customers = []
      return
    }
    try {
      const data = await ServiceUtil.searchByPagination('customers', [{ name: 'com_cd', value: comCd }], null, 1, 100)
      this.customers = data?.items || []
    } catch (err) {
      console.error('거래처 목록 조회 실패:', err)
      this.customers = []
    }
  }

  /**
   * 수동 항목 추가
   */
  _addItem() {
    this.items = [
      ...this.items,
      {
        skuCd: '',
        skuNm: '',
        rwaReqQty: 1,
        returnReason: '',
        boxQty: 0,
        sourceType: 'MANUAL',
        sourceNo: null
      }
    ]
  }

  /**
   * 출고주문 추가 버튼 / Enter 핸들러
   */
  _addShipmentOrder() {
    const no = (this.shipmentOrderInput || '').trim()
    if (!no) return
    this._lookupAndAddShipmentOrder(no)
  }

  /**
   * 출고주문번호로 API 조회 후 아이템 자동 등록
   * - shipment_orders에서 주문 존재 확인 (shipment_no 컬럼)
   * - shipment_order_items에서 주문 상품 목록 조회
   */
  async _lookupAndAddShipmentOrder(no) {
    if (this.shipmentOrders.find(so => so.shipment_no === no)) {
      UiUtil.showToast('warning', `출고주문 [${no}]은 이미 추가되어 있습니다`)
      return
    }

    this.shipmentOrderLoading = true
    try {
      const orderData = await ServiceUtil.searchByPagination(
        'shipment_orders',
        [{ name: 'shipment_no', value: no }],
        null, 1, 1
      )
      const order = orderData?.items?.[0]
      if (!order) {
        UiUtil.showToast('warning', `출고주문 [${no}]을 찾을 수 없습니다`)
        return
      }
      if (order.status !== 'SHIPPED') {
        UiUtil.showToast('warning', `출고주문 [${no}]은 출하완료 상태가 아닙니다 (현재: ${order.status})`)
        return
      }

      const itemData = await ServiceUtil.restGet(`shipment_orders/${order.id}/items`)
      const orderItems = itemData?.items || itemData || []

      this.shipmentOrders = [...this.shipmentOrders, { id: order.id, shipment_no: order.shipment_no }]

      const newItems = orderItems.map(oi => ({
        skuCd: oi.sku_cd || '',
        skuNm: oi.sku_nm || '',
        rwaReqQty: oi.order_qty || 1,
        returnReason: '',
        boxQty: 0,
        sourceType: 'SHIPMENT',
        sourceNo: order.shipment_no
      }))
      this.items = [...this.items, ...newItems]
      this.shipmentOrderInput = ''

      UiUtil.showToast('success', `출고주문 [${no}] 연동 완료 (${orderItems.length}건)`)
    } catch (err) {
      console.error('출고주문 조회 실패:', err)
      UiUtil.showToast('error', err.message || '출고주문 조회에 실패했습니다')
    } finally {
      this.shipmentOrderLoading = false
    }
  }

  /**
   * 출고주문 칩 제거 — 해당 출고주문의 모든 항목도 함께 제거
   */
  _removeShipmentOrder(no) {
    this.shipmentOrders = this.shipmentOrders.filter(so => so.shipment_no !== no)
    this.items = this.items.filter(item => item.sourceNo !== no)
  }

  /**
   * 연동된 출고주문 일괄 삭제 — 모든 출고주문 칩과 해당 출고주문에서 온 항목 제거
   * (수동 추가 항목은 유지)
   */
  _clearShipmentOrders() {
    const nos = new Set(this.shipmentOrders.map(so => so.shipment_no))
    this.items = this.items.filter(item => !nos.has(item.sourceNo))
    this.shipmentOrders = []
  }

  /**
   * 출고주문 엑셀 일괄 등록 팝업 열기
   * 팝업에서 'shipment-orders-imported' 이벤트를 수신하면 주문/상품을 일괄 반영
   */
  _openShipmentImportPopup() {
    const popup = document.createElement('rwa-shipment-import-popup')
    popup.addEventListener('shipment-orders-imported', e => this._mergeImportedShipmentOrders(e.detail))
    UiUtil.openPopupByElement('출고주문 엑셀 일괄 등록', 'large', popup, true)
  }

  /**
   * 출고주문 검색 팝업 열기
   * 출하완료 출고주문을 검색/멀티선택하여 연동 (엑셀 임포트와 동일한 이벤트 사용)
   */
  _openShipmentSearchPopup() {
    const popup = document.createElement('rwa-shipment-search-popup')
    // 이미 연동된 출고주문은 검색화면 후보에서 제외 (재추가 시도 자체를 방지)
    popup.linkedShipmentNos = this.shipmentOrders.map(so => so.shipment_no)
    popup.addEventListener('shipment-orders-imported', e => this._mergeImportedShipmentOrders(e.detail))
    UiUtil.openPopupByElement('출고주문 검색', 'large', popup, true)
  }

  /**
   * 검색/엑셀 팝업에서 전달된 출고주문/상품을 병합
   * 이미 추가된 주문은 제외하고 신규만 반영
   */
  _mergeImportedShipmentOrders({ orders, items }) {
    const existingNos = new Set(this.shipmentOrders.map(so => so.shipment_no))
    const newOrders = orders.filter(o => !existingNos.has(o.shipment_no))
    const newItems = items.filter(item => !existingNos.has(item.sourceNo))

    if (newOrders.length === 0) {
      UiUtil.showToast('warning', '새로 추가된 출고주문이 없습니다 (이미 등록된 주문 제외)')
      return
    }

    this.shipmentOrders = [...this.shipmentOrders, ...newOrders]
    this.items = [...this.items, ...newItems]
    UiUtil.showToast('success', `출고주문 ${newOrders.length}건 연동 완료`)
  }

  /**
   * 항목 업데이트
   */
  _updateItem(index, field, value) {
    const updated = [...this.items]
    updated[index] = { ...updated[index], [field]: value }
    this.items = updated
  }

  /**
   * 항목 삭제
   */
  _removeItem(index) {
    this.items = this.items.filter((_, i) => i !== index)
  }

  /**
   * 다음 단계
   */
  _nextStep() {
    if (!this._validateStep1()) return
    this.currentStep = 2
  }

  /**
   * 이전 단계
   */
  _prevStep() {
    this.currentStep = 1
  }

  /**
   * 1단계 유효성 검사
   */
  _validateStep1() {
    const { rwaType, comCd, whCd, rwaReqDate } = this.rwaOrder

    if (!rwaType) {
      UiUtil.showToast('warning', '반품 유형을 선택해주세요')
      return false
    }
    if (!comCd) {
      UiUtil.showToast('warning', '화주사를 입력해주세요')
      return false
    }
    if (!whCd) {
      UiUtil.showToast('warning', '창고를 입력해주세요')
      return false
    }
    if (!rwaReqDate) {
      UiUtil.showToast('warning', '반품 요청일을 입력해주세요')
      return false
    }

    return true
  }

  /**
   * 2단계 유효성 검사
   */
  _validateStep2() {
    if (this.items.length === 0) {
      UiUtil.showToast('warning', '반품 항목을 최소 1건 이상 추가해주세요')
      return false
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]
      if (!item.skuCd) {
        UiUtil.showToast('warning', `${i + 1}번 항목의 SKU 코드를 입력해주세요`)
        return false
      }
      if (!item.rwaReqQty || item.rwaReqQty <= 0) {
        UiUtil.showToast('warning', `${i + 1}번 항목의 반품 수량을 입력해주세요`)
        return false
      }
    }

    return true
  }

  /**
   * 저장 (반품 요청 생성)
   */
  async _save() {
    if (!this._validateStep2()) return

    this.saving = true

    try {
      const result = await ServiceUtil.restPost('rwa_trx/rwa_orders/with_items', {
        rwaOrder: this.rwaOrder,
        items: this.items
      })

      if (result) {
        UiUtil.showToast('success', `반품 요청이 생성되었습니다 (${result.rwa_req_no || ''})`)
        this.dispatchEvent(
          new CustomEvent('order-created', {
            composed: true,
            bubbles: true,
            detail: { rwaOrder: result }
          })
        )
        this._close()
      }
    } catch (error) {
      console.error('반품 요청 생성 실패:', error)
      UiUtil.showToast('error', error.message || '반품 요청 생성에 실패했습니다')
    } finally {
      this.saving = false
    }
  }

  /**
   * SKU 코드 blur 시 상품명 자동 조회 — 오류/미존재는 무시
   */
  async _lookupSkuByCode(idx, skuCd) {
    if (!skuCd || !skuCd.trim()) return

    try {
      const filters = [{ name: 'sku_cd', value: skuCd.trim() }]
      if (this.rwaOrder.comCd) {
        filters.push({ name: 'com_cd', value: this.rwaOrder.comCd })
      }
      const data = await ServiceUtil.searchByPagination('sku', filters, null, 1, 1)
      const sku = data?.items?.[0]
      if (sku) {
        this._updateItem(idx, 'skuNm', sku.sku_nm || '')
      }
    } catch (_) {
      // 오류 무시
    }
  }

  /**
   * SKU 검색 팝업 열기 — 선택 시 해당 행의 skuCd, skuNm 자동 입력
   */
  _openSkuSearch(itemIndex) {
    const element = document.createElement('rwa-sku-search-popup')
    if (this.rwaOrder.comCd) {
      element.comCd = this.rwaOrder.comCd
    }
    element.addEventListener('sku-selected', e => {
      const sku = e.detail.sku
      this._updateItem(itemIndex, 'skuCd', sku.sku_cd || '')
      this._updateItem(itemIndex, 'skuNm', sku.sku_nm || '')
    })
    UiUtil.openPopupByElement(
      i18next.t('title.sku_search', { defaultValue: 'SKU 검색' }),
      'large',
      element,
      true
    )
  }

  /**
   * 팝업 닫기
   */
  _close() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('rwa-order-new', RwaOrderNew)
