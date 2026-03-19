import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * VAS 작업 지시 생성 팝업
 *
 * 2단계 위자드:
 * - 1단계: 기본 정보 (화주사, 창고, BOM, 요청일, 계획수량, 우선순위, 작업장)
 * - 2단계: 소요 자재 확인 (BOM 자동 전개, 재고 확인)
 */
class VasOrderNewPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        /* 위자드 스텝 인디케이터 */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 24px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          gap: 8px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .step.active {
          color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
        }

        .step.completed {
          color: var(--md-sys-color-primary, #4CAF50);
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
          background: var(--md-sys-color-outline-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .step.active .step-number {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .step.completed .step-number {
          background: var(--md-sys-color-primary, #4CAF50);
          color: #fff;
        }

        .step-divider {
          width: 40px;
          height: 2px;
          background: var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .step-divider.active {
          background: var(--md-sys-color-primary, #1976D2);
        }

        /* 폼 영역 */
        .form-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px 20px 12px 20px;
        }

        .form-section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .form-group label .required {
          color: #F44336;
          margin-left: 2px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 14px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
        }

        .form-group input:disabled,
        .form-group select:disabled {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        /* BOM 정보 표시 */
        .bom-info {
          background: var(--md-sys-color-surface-variant, #f0f7ff);
          border: 1px solid var(--md-sys-color-primary-container, #bbdefb);
          border-radius: 8px;
          padding: 12px 16px;
          margin-top: 8px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .bom-info-item {
          display: flex;
          gap: 4px;
        }

        .bom-info-item .info-label {
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .bom-info-item .info-value {
          font-weight: 600;
        }

        /* 소요 자재 테이블 */
        .material-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }

        .material-table th {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          padding: 10px 12px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #555);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .material-table th.right {
          text-align: right;
        }

        .material-table td {
          padding: 10px 12px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
        }

        .material-table td.right {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .material-table tr:last-child td {
          border-bottom: none;
        }

        /* 재고 상태 뱃지 */
        .stock-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .stock-badge.sufficient {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .stock-badge.shortage {
          background: #FFF3E0;
          color: #E65100;
        }

        .stock-badge.unknown {
          background: #F5F5F5;
          color: #757575;
        }

        /* 경고 메시지 */
        .warning-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          margin-top: 16px;
          background: #FFF3E0;
          border: 1px solid #FFE0B2;
          border-radius: 8px;
          font-size: 13px;
          color: #E65100;
        }

        /* 하단 버튼 영역 */
        .button-bar {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface, #fff);
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

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .btn-cancel:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-prev {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          color: var(--md-sys-color-on-surface, #333);
        }

        .btn-prev:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-next {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-next:hover:not(:disabled) {
          background: #1565C0;
        }

        .btn-save {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-save:hover:not(:disabled) {
          background: #1565C0;
        }

        .btn-save:active:not(:disabled) {
          transform: scale(0.98);
        }

        /* 로딩 */
        .loading-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 14px;
        }

        /* 반응형 */
        @media screen and (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      step: Number,
      saving: Boolean,
      bomList: Array,
      bomItems: Array,
      formData: Object,
      selectedBom: Object,
      loadingBomItems: Boolean,
      stockInfo: Object
    }
  }

  /** 생성자 - 위자드 초기 단계 및 폼 데이터 초기화 */
  constructor() {
    super()
    this.step = 1
    this.saving = false
    this.bomList = []
    this.bomItems = []
    this.formData = {
      comCd: '',
      whCd: '',
      vasBomId: '',
      vasReqDate: this._todayStr(),
      planQty: '',
      priority: 'NORMAL',
      workLocCd: '',
      remarks: ''
    }
    this.selectedBom = null
    this.loadingBomItems = false
    this.stockInfo = {}
  }

  /** 컴포넌트가 DOM에 연결될 때 BOM 목록 조회 */
  connectedCallback() {
    super.connectedCallback()
    this._fetchBomList()
  }

  /** 화면 렌더링 - 스텝 인디케이터, 폼 내용, 하단 버튼 구성 */
  render() {
    return html`
      <!-- 스텝 인디케이터 -->
      ${this._renderStepIndicator()}

      <!-- 폼 내용 -->
      <div class="form-content">
        ${this.step === 1 ? this._renderStep1() : this._renderStep2()}
      </div>

      <!-- 하단 버튼 -->
      ${this._renderButtons()}
    `
  }

  /** 위자드 단계 표시기 렌더링 (1단계: 기본정보, 2단계: 소요자재) */
  _renderStepIndicator() {
    return html`
      <div class="step-indicator">
        <div class="step ${this.step === 1 ? 'active' : 'completed'}">
          <span class="step-number">${this.step > 1 ? '\u2713' : '1'}</span>
          <span>기본 정보</span>
        </div>
        <div class="step-divider ${this.step > 1 ? 'active' : ''}"></div>
        <div class="step ${this.step === 2 ? 'active' : ''}">
          <span class="step-number">2</span>
          <span>소요 자재 확인</span>
        </div>
      </div>
    `
  }

  /** 1단계 렌더링 - 기본 정보 입력 폼 (화주사, 창고, BOM, 요청일, 수량 등) */
  _renderStep1() {
    return html`
      <div class="form-section-title">기본 정보 입력</div>
      <div class="form-grid">
        <div class="form-group">
          <label>화주사<span class="required">*</span></label>
          <input
            type="text"
            .value="${this.formData.comCd}"
            @input="${e => this._updateField('comCd', e.target.value)}"
            placeholder="화주사 코드"
          />
        </div>

        <div class="form-group">
          <label>창고<span class="required">*</span></label>
          <input
            type="text"
            .value="${this.formData.whCd}"
            @input="${e => this._updateField('whCd', e.target.value)}"
            placeholder="창고 코드"
          />
        </div>

        <div class="form-group full-width">
          <label>세트 상품 선택<span class="required">*</span></label>
          <select @change="${this._onBomSelect}">
            <option value="">-- 세트 상품을 선택하세요 --</option>
            ${this.bomList.map(
      bom => html`
                <option value="${bom.id}" ?selected="${this.formData.vasBomId === bom.id}">
                  ${bom.bom_no} : ${bom.set_sku_nm || bom.set_sku_cd} (${this._vasTypeLabel(bom.vas_type)})
                </option>
              `
    )}
          </select>
          ${this.selectedBom
        ? html`
                <div class="bom-info">
                  <div class="bom-info-item">
                    <span class="info-label">BOM번호:</span>
                    <span class="info-value">${this.selectedBom.bom_no}</span>
                  </div>
                  <div class="bom-info-item">
                    <span class="info-label">세트상품:</span>
                    <span class="info-value">${this.selectedBom.set_sku_cd}</span>
                  </div>
                  <div class="bom-info-item">
                    <span class="info-label">유형:</span>
                    <span class="info-value">${this._vasTypeLabel(this.selectedBom.vas_type)}</span>
                  </div>
                  <div class="bom-info-item">
                    <span class="info-label">구성품목:</span>
                    <span class="info-value">${this.selectedBom.component_count || 0}개</span>
                  </div>
                </div>
              `
        : ''}
        </div>

        <div class="form-group">
          <label>요청일<span class="required">*</span></label>
          <input
            type="date"
            .value="${this.formData.vasReqDate}"
            @input="${e => this._updateField('vasReqDate', e.target.value)}"
          />
        </div>

        <div class="form-group">
          <label>계획 수량 (EA)<span class="required">*</span></label>
          <input
            type="number"
            min="1"
            .value="${this.formData.planQty}"
            @input="${e => this._updateField('planQty', e.target.value)}"
            placeholder="세트 수량"
          />
        </div>

        <div class="form-group">
          <label>우선순위</label>
          <select @change="${e => this._updateField('priority', e.target.value)}">
            <option value="LOW" ?selected="${this.formData.priority === 'LOW'}">낮음</option>
            <option value="NORMAL" ?selected="${this.formData.priority === 'NORMAL'}">보통</option>
            <option value="HIGH" ?selected="${this.formData.priority === 'HIGH'}">높음</option>
          </select>
        </div>

        <div class="form-group">
          <label>작업장 로케이션</label>
          <input
            type="text"
            .value="${this.formData.workLocCd}"
            @input="${e => this._updateField('workLocCd', e.target.value)}"
            placeholder="작업장 코드 (예: VAS-ZONE-01)"
          />
        </div>

        <div class="form-group full-width">
          <label>비고</label>
          <textarea
            .value="${this.formData.remarks}"
            @input="${e => this._updateField('remarks', e.target.value)}"
            placeholder="특이사항이 있으면 입력하세요"
          ></textarea>
        </div>
      </div>
    `
  }

  /** 2단계 렌더링 - BOM 소요 자재 목록 및 재고 상태 확인 */
  _renderStep2() {
    if (this.loadingBomItems) {
      return html`<div class="loading-overlay">소요 자재를 조회하고 있습니다...</div>`
    }

    if (!this.bomItems || this.bomItems.length === 0) {
      return html`<div class="empty-state">BOM 구성 품목이 없습니다.</div>`
    }

    const planQty = parseFloat(this.formData.planQty) || 0
    const shortageItems = this.bomItems.filter(item => {
      const reqQty = planQty * (item.component_qty || 0)
      const stockQty = this.stockInfo[item.sku_cd] || 0
      return stockQty > 0 && stockQty < reqQty
    })

    return html`
      <div class="form-section-title">소요 자재 확인</div>

      <div class="bom-info">
        <div class="bom-info-item">
          <span class="info-label">BOM:</span>
          <span class="info-value">${this.selectedBom?.bom_no} - ${this.selectedBom?.set_sku_nm || this.selectedBom?.set_sku_cd}</span>
        </div>
        <div class="bom-info-item">
          <span class="info-label">계획수량:</span>
          <span class="info-value">${planQty} EA</span>
        </div>
      </div>

      <table class="material-table">
        <thead>
          <tr>
            <th>순번</th>
            <th>SKU</th>
            <th>상품명</th>
            <th class="right">단위수량</th>
            <th class="right">소요량</th>
            <th class="right">재고</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          ${this.bomItems.map((item, idx) => {
      const reqQty = planQty * (item.component_qty || 0)
      const stockQty = this.stockInfo[item.sku_cd]
      const hasStock = stockQty !== undefined && stockQty !== null
      const sufficient = hasStock && stockQty >= reqQty

      return html`
              <tr>
                <td>${idx + 1}</td>
                <td>${item.sku_cd}</td>
                <td>${item.sku_nm || '-'}</td>
                <td class="right">${item.component_qty} ${item.unit || 'EA'}</td>
                <td class="right">${reqQty.toLocaleString()}</td>
                <td class="right">${hasStock ? stockQty.toLocaleString() : '-'}</td>
                <td>
                  ${hasStock
          ? sufficient
            ? html`<span class="stock-badge sufficient">\u2713 충분</span>`
            : html`<span class="stock-badge shortage">\u26A0 부족 (${(reqQty - stockQty).toLocaleString()})</span>`
          : html`<span class="stock-badge unknown">- 미확인</span>`}
                </td>
              </tr>
            `
    })}
        </tbody>
      </table>

      ${shortageItems.length > 0
        ? html`
            <div class="warning-message">
              \u26A0 재고 부족 자재가 ${shortageItems.length}건 있습니다. 작업 지시를 생성하면 자재 배정 시 부족이 발생할 수 있습니다.
            </div>
          `
        : ''}
    `
  }

  /** 하단 버튼 렌더링 - 단계에 따라 이전/다음/저장 버튼 표시 */
  _renderButtons() {
    return html`
      <div class="button-bar">
        <button class="btn btn-cancel" @click="${this._onCancel}" ?disabled="${this.saving}">취소</button>
        ${this.step === 2
        ? html`<button class="btn btn-prev" @click="${this._goToPrevStep}" ?disabled="${this.saving}">\u2190 이전</button>`
        : ''}
        ${this.step === 1
        ? html`<button class="btn btn-next" @click="${this._goToNextStep}">다음 \u2192</button>`
        : html`<button class="btn btn-save" @click="${this._onSave}" ?disabled="${this.saving}">
              ${this.saving ? '저장 중...' : '저장'}
            </button>`}
      </div>
    `
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 활성 상태인 BOM 목록 조회 (세트 상품 선택 드롭다운용) */
  async _fetchBomList() {
    try {
      const filters = [{ name: 'status', value: 'ACTIVE' }]
      const data = await ServiceUtil.searchByPagination('vas_boms', filters, null, 1, 100)
      this.bomList = data?.items || []
    } catch (err) {
      console.error('BOM 목록 조회 실패:', err)
      this.bomList = []
    }
  }

  /** 선택한 BOM의 구성 품목 목록 조회 및 재고 정보 연계 */
  async _fetchBomItems(bomId) {
    try {
      this.loadingBomItems = true
      const data = await ServiceUtil.restGet(`vas_boms/${bomId}/items`)
      this.bomItems = data || []
      this.loadingBomItems = false

      // 재고 정보 조회
      await this._fetchStockInfo()
    } catch (err) {
      console.error('BOM 구성 품목 조회 실패:', err)
      this.bomItems = []
      this.loadingBomItems = false
    }
  }

  /** BOM 구성 품목별 재고 수량 조회 (SKU/창고 기준) */
  async _fetchStockInfo() {
    this.stockInfo = {}

    for (const item of this.bomItems) {
      try {
        const filters = [
          { name: 'sku_cd', value: item.sku_cd },
          ...(this.formData.whCd ? [{ name: 'wh_cd', value: this.formData.whCd }] : [])
        ]
        const data = await ServiceUtil.searchByPagination('inventories', filters, null, 1, 1)
        const items = data?.items || []
        if (items.length > 0) {
          this.stockInfo = {
            ...this.stockInfo,
            [item.sku_cd]: items[0].stock_qty || items[0].available_qty || 0
          }
        }
      } catch (err) {
        // 재고 조회 실패 시 무시 (미확인 상태로 표시)
      }
    }

    this.requestUpdate()
  }

  /* ============================================================
   * 이벤트 핸들러
   * ============================================================ */

  /** 폼 필드값 변경 (불변성 유지를 위해 spread 연산자 사용) */
  _updateField(field, value) {
    this.formData = { ...this.formData, [field]: value }
  }

  /** BOM 선택 변경 시 화주사/창고 자동 설정 및 VAS 유형 반영 */
  _onBomSelect(e) {
    const bomId = e.target.value
    this._updateField('vasBomId', bomId)

    if (bomId) {
      this.selectedBom = this.bomList.find(b => b.id === bomId) || null
      // BOM의 화주사 코드를 자동 설정
      if (this.selectedBom && this.selectedBom.com_cd && !this.formData.comCd) {
        this._updateField('comCd', this.selectedBom.com_cd)
      }
      // BOM의 창고 코드를 자동 설정
      if (this.selectedBom && this.selectedBom.wh_cd && !this.formData.whCd) {
        this._updateField('whCd', this.selectedBom.wh_cd)
      }
      // VAS 유형 설정
      if (this.selectedBom) {
        this.formData.vasType = this.selectedBom.vas_type
      }
    } else {
      this.selectedBom = null
      this.bomItems = []
    }
  }

  /** 다음 단계로 이동 - 필수 입력값 검증 후 BOM 구성 품목 조회 */
  _goToNextStep() {
    // 필수 입력값 검증
    const errors = this._validateStep1()
    if (errors.length > 0) {
      this._showNotification(errors.join('\n'), 'error')
      return
    }

    // 2단계로 이동하며 BOM 구성 품목 조회
    this.step = 2
    if (this.formData.vasBomId) {
      this._fetchBomItems(this.formData.vasBomId)
    }
  }

  /** 이전 단계(1단계)로 돌아가기 */
  _goToPrevStep() {
    this.step = 1
  }

  /** 취소 버튼 클릭 - popup-closed 이벤트 발행 후 팝업 닫기 */
  _onCancel() {
    this.dispatchEvent(
      new CustomEvent('popup-closed', {
        composed: true,
        bubbles: true,
        detail: { cancelled: true }
      })
    )
    this._closePopup()
  }

  /** 저장 버튼 클릭 - 작업 지시 생성 API 호출 후 order-created 이벤트 발행 */
  async _onSave() {
    if (this.saving) return

    try {
      this.saving = true

      const requestBody = {
        com_cd: this.formData.comCd,
        wh_cd: this.formData.whCd,
        vas_bom_id: this.formData.vasBomId,
        vas_req_date: this.formData.vasReqDate,
        plan_qty: parseFloat(this.formData.planQty),
        priority: this.formData.priority,
        work_loc_cd: this.formData.workLocCd || null,
        vas_type: this.formData.vasType || this.selectedBom?.vas_type || 'SET_ASSEMBLY',
        remarks: this.formData.remarks || null
      }

      const result = await ServiceUtil.restPost('vas_trx/vas_orders', requestBody)

      if (!result) {
        throw new Error('저장 실패')
      }

      this.dispatchEvent(
        new CustomEvent('order-created', {
          composed: true,
          bubbles: true,
          detail: { order: result }
        })
      )

      this._closePopup()
    } catch (err) {
      console.error('작업 지시 생성 실패:', err)
      this._showNotification(err.message || '작업 지시 생성에 실패했습니다.', 'error')
    } finally {
      this.saving = false
    }
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** 1단계 필수 입력값 검증 (화주사, BOM, 요청일, 계획수량) */
  _validateStep1() {
    const errors = []
    if (!this.formData.comCd) errors.push('화주사를 입력해주세요.')
    if (!this.formData.vasBomId) errors.push('BOM을 선택해주세요.')
    if (!this.formData.vasReqDate) errors.push('요청일을 입력해주세요.')
    if (!this.formData.planQty || parseFloat(this.formData.planQty) <= 0) {
      errors.push('계획 수량을 1 이상 입력해주세요.')
    }
    return errors
  }

  /** 오늘 날짜를 YYYY-MM-DD 형식 문자열로 반환 */
  _todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  /** VAS 유형 코드를 한글 라벨로 변환 */
  _vasTypeLabel(type) {
    const labels = {
      SET_ASSEMBLY: '세트 구성',
      DISASSEMBLY: '세트 해체',
      REPACK: '재포장',
      LABEL: '라벨링',
      CUSTOM: '기타'
    }
    return labels[type] || type || '-'
  }

  /** 알림 메시지 표시 (notify 커스텀 이벤트 발행) */
  _showNotification(message, type = 'info') {
    document.dispatchEvent(
      new CustomEvent('notify', {
        detail: { message, type }
      })
    )
  }

  /** 현재 팝업 닫기 */
  _closePopup() {
    UiUtil.closePopupBy(this)
  }
}

window.customElements.define('vas-order-new-popup', VasOrderNewPopup)
