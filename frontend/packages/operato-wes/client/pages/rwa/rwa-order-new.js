import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import './rwa-sku-search-popup.js'

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
          min-height: 60px;
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
          margin-bottom: 16px;
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
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          font-size: 14px;
        }

        th {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        td input,
        td select {
          width: 100%;
          padding: 6px 8px;
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
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #C62828;
          font-size: 18px;
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
      customers: Array
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
      returnReason: '',
      returnReasonDesc: '',
      inspFlag: true,
      qcFlag: false,
      remarks: ''
    }
    this.items = []
    this.companies = []
    this.warehouses = []
    this.customers = []
  }

  connectedCallback() {
    super.connectedCallback()
    this._fetchCompanies()
    this._fetchWarehouses()
    this._fetchCustomers()
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
          <select @change="${e => this._updateOrder('comCd', e.target.value)}">
            <option value="">-- 화주사 선택 --</option>
            ${this.companies.map(
      c => html`
                <option value="${c.com_cd}" ?selected="${this.rwaOrder.comCd === c.com_cd}">
                  ${c.com_cd} - ${c.com_nm || c.name || c.com_cd}
                </option>
              `
    )}
          </select>
        </div>

        <div class="form-field">
          <label>창고 <span class="required">*</span></label>
          <select @change="${e => this._updateOrder('whCd', e.target.value)}">
            <option value="">-- 창고 선택 --</option>
            ${this.warehouses.map(
      w => html`
                <option value="${w.wh_cd}" ?selected="${this.rwaOrder.whCd === w.wh_cd}">
                  ${w.wh_cd} - ${w.wh_nm || w.name || w.wh_cd}
                </option>
              `
    )}
          </select>
        </div>

        <div class="form-field">
          <label>거래처</label>
          <select @change="${e => this._onCustomerSelect(e.target.value)}">
            <option value="">-- 거래처 선택 --</option>
            ${this.customers.map(
      c => html`
                <option value="${c.cust_cd}" ?selected="${this.rwaOrder.custCd === c.cust_cd}">
                  ${c.cust_cd} - ${c.cust_nm || c.name || c.cust_cd}
                </option>
              `
    )}
          </select>
        </div>

        <div class="form-field">
          <label>원 주문번호</label>
          <input type="text" placeholder="원 주문번호" .value="${this.rwaOrder.orderNo}" @input="${e => this._updateOrder('orderNo', e.target.value)}" />
        </div>

        <div class="form-field">
          <label>반품 사유</label>
          <select .value="${this.rwaOrder.returnReason}" @change="${e => this._updateOrder('returnReason', e.target.value)}">
            <option value="">선택</option>
            <option value="DEFECT">상품 하자</option>
            <option value="WRONG_ITEM">오배송</option>
            <option value="CUSTOMER_CHANGE">고객 변심</option>
            <option value="DAMAGED">파손</option>
            <option value="EXPIRED">유통기한</option>
            <option value="OTHER">기타</option>
          </select>
        </div>

        <div class="form-field full-width">
          <label>상세 사유</label>
          <textarea placeholder="반품 사유를 상세히 입력하세요" .value="${this.rwaOrder.returnReasonDesc}" @input="${e => this._updateOrder('returnReasonDesc', e.target.value)}"></textarea>
        </div>

        <div class="form-field checkbox-field">
          <input type="checkbox" id="inspFlag" .checked="${this.rwaOrder.inspFlag}" @change="${e => this._updateOrder('inspFlag', e.target.checked)}" />
          <label for="inspFlag">검수 필요</label>
        </div>

        <div class="form-field checkbox-field">
          <input type="checkbox" id="qcFlag" .checked="${this.rwaOrder.qcFlag}" @change="${e => this._updateOrder('qcFlag', e.target.checked)}" />
          <label for="qcFlag">품질검사 필요</label>
        </div>

        <div class="form-field full-width">
          <label>비고</label>
          <textarea placeholder="비고" .value="${this.rwaOrder.remarks}" @input="${e => this._updateOrder('remarks', e.target.value)}"></textarea>
        </div>
      </div>
    `
  }

  /**
   * 2단계: 반품 항목 테이블
   */
  _renderStep2() {
    return html`
      <div class="items-header">
        <h3>반품 상품 목록 (${this.items.length}건)</h3>
        <button class="add-item-btn" @click="${this._addItem}">+ 항목 추가</button>
      </div>

      ${this.items.length === 0
        ? html`
            <div class="empty-items">
              <div class="icon">📦</div>
              <div class="text">반품 항목을 추가해주세요</div>
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
                  <th style="width:80px">박스</th>
                  <th style="width:50px"></th>
                </tr>
              </thead>
              <tbody>
                ${this.items.map(
          (item, idx) => html`
                    <tr>
                      <td style="text-align:center">${idx + 1}</td>
                      <td>
                        <div class="sku-input-wrap">
                          <input
                            type="text"
                            placeholder="SKU"
                            .value="${item.skuCd}"
                            @input="${e => this._updateItem(idx, 'skuCd', e.target.value)}"
                            @keydown="${e => e.key === 'Enter' && e.target.blur()}"
                            @blur="${e => this._lookupSkuByCode(idx, e.target.value)}"
                          />
                          <button
                            class="sku-search-btn"
                            title="${i18next.t('button.sku_search', { defaultValue: 'SKU 검색' })}"
                            @click="${() => this._openSkuSearch(idx)}"
                          >🔍</button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="상품명"
                          .value="${item.skuNm}"
                          @input="${e => this._updateItem(idx, 'skuNm', e.target.value)}"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          .value="${String(item.rwaReqQty)}"
                          @input="${e => this._updateItem(idx, 'rwaReqQty', Number(e.target.value))}"
                        />
                      </td>
                      <td>
                        <select .value="${item.returnReason}" @change="${e => this._updateItem(idx, 'returnReason', e.target.value)}">
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
                        <input
                          type="number"
                          min="0"
                          .value="${String(item.boxQty)}"
                          @input="${e => this._updateItem(idx, 'boxQty', Number(e.target.value))}"
                        />
                      </td>
                      <td>
                        <button class="delete-btn" @click="${() => this._removeItem(idx)}">✕</button>
                      </td>
                    </tr>
                  `
        )}
              </tbody>
            </table>

            <div class="summary-row">
              <div class="summary-item">
                <span class="label">총 항목:</span>
                <span class="value">${this.items.length}건</span>
              </div>
              <div class="summary-item">
                <span class="label">총 수량:</span>
                <span class="value">${this.items.reduce((sum, i) => sum + (i.rwaReqQty || 0), 0)} EA</span>
              </div>
              <div class="summary-item">
                <span class="label">총 박스:</span>
                <span class="value">${this.items.reduce((sum, i) => sum + (i.boxQty || 0), 0)}개</span>
              </div>
            </div>
          `}
    `
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

  /** 화주사 목록 조회 */
  async _fetchCompanies() {
    try {
      const data = await ServiceUtil.searchByPagination('companies', [], null, 1, 100)
      this.companies = data?.items || []
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

  /** 거래처 목록 조회 */
  async _fetchCustomers() {
    try {
      const data = await ServiceUtil.searchByPagination('customers', [], null, 1, 100)
      this.customers = data?.items || []
    } catch (err) {
      console.error('거래처 목록 조회 실패:', err)
      this.customers = []
    }
  }

  /**
   * 항목 추가
   */
  _addItem() {
    this.items = [
      ...this.items,
      {
        skuCd: '',
        skuNm: '',
        rwaReqQty: 1,
        returnReason: '',
        boxQty: 0
      }
    ]
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
        UiUtil.showToast('success', `반품 요청이 생성되었습니다 (${result.rwaNo || ''})`)
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
    // 팝업 컨테이너 닫기
    const popup = this.closest('.popup-layer') || this.closest('[popup]')
    if (popup) {
      popup.close?.()
    }
  }
}

customElements.define('rwa-order-new', RwaOrderNew)
