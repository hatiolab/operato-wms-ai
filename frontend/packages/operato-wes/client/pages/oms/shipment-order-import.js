import { css, html } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { PageView, store } from '@operato/shell'
import { ServiceUtil, UiUtil, ValueUtil } from '@operato-app/metapage/dist-client'

import '@things-factory/import-ui-excel'
import { IMPORT } from '@things-factory/import-base'

/**
 * 주문 임포트 - 3단계 마법사
 *
 * Step 1: 파일 업로드 (임포트 유형 선택 + Excel 드래그앤드롭)
 * Step 2: 검증/미리보기 (서버 검증 결과 표시)
 * Step 3: 결과 확인 (임포트 완료 요약)
 */
class ShipmentOrderImport extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background, #fafafa);
          padding: var(--padding-wide, 24px);
          overflow: auto;
        }
        h2 {
          margin: var(--title-margin);
          font: var(--title-font);
          color: var(--title-text-color);
        }

        /* 마법사 컨테이너 */
        .wizard-container {
          max-width: 960px;
          margin: 0 auto;
        }

        /* 스텝 인디케이터 */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          gap: 0;
        }
        .step-indicator .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 0 0 auto;
        }
        .step-indicator .step .dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: #bdbdbd;
          z-index: 1;
        }
        .step-indicator .step.active .dot {
          background: #1976d2;
          box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.2);
        }
        .step-indicator .step.completed .dot {
          background: #4caf50;
        }
        .step-indicator .step .step-label {
          margin-top: 8px;
          font-size: 12px;
          color: #757575;
          white-space: nowrap;
        }
        .step-indicator .step.active .step-label {
          color: #1976d2;
          font-weight: 600;
        }
        .step-indicator .step.completed .step-label {
          color: #4caf50;
        }
        .step-indicator .line {
          width: 80px;
          height: 2px;
          background: #e0e0e0;
          margin: 0 8px;
          margin-bottom: 20px;
        }
        .step-indicator .line.completed {
          background: #4caf50;
        }

        /* 카드 */
        .card {
          background: #fff;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        /* Step 1: 파일 업로드 */
        .import-type-selector {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .import-type-selector label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .import-type-selector label:hover {
          border-color: #90caf9;
        }
        .import-type-selector label.selected {
          border-color: #1976d2;
          background: #e3f2fd;
        }
        .import-type-selector input[type='radio'] {
          display: none;
        }

        .drop-zone {
          border: 2px dashed #bdbdbd;
          border-radius: 12px;
          padding: 48px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #fafafa;
        }
        .drop-zone:hover,
        .drop-zone.dragover {
          border-color: #1976d2;
          background: #e3f2fd;
        }
        .drop-zone .icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        .drop-zone .main-text {
          font-size: 16px;
          color: #424242;
          margin-bottom: 8px;
        }
        .drop-zone .sub-text {
          font-size: 13px;
          color: #9e9e9e;
        }
        .drop-zone .file-name {
          margin-top: 12px;
          font-size: 14px;
          color: #1976d2;
          font-weight: 500;
        }

        .template-buttons {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          justify-content: center;
        }
        .template-btn {
          padding: 8px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
          color: #616161;
          transition: all 0.2s;
        }
        .template-btn:hover {
          background: #f5f5f5;
          border-color: #bdbdbd;
        }

        /* Step 2: 검증 결과 */
        .validation-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          font-size: 14px;
        }
        .validation-summary .total {
          color: #424242;
          font-weight: 600;
        }
        .validation-summary .valid {
          color: #4caf50;
          font-weight: 600;
        }
        .validation-summary .error {
          color: #f44336;
          font-weight: 600;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .preview-table th {
          background: #f5f5f5;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: #424242;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
        }
        .preview-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #eeeeee;
          color: #616161;
        }
        .preview-table tr.error-row {
          background: #ffebee;
        }
        .preview-table .status-icon {
          font-size: 16px;
        }
        .preview-table .error-text {
          color: #f44336;
          font-size: 12px;
        }
        .preview-table .center {
          text-align: center;
        }
        .preview-table .right {
          text-align: right;
        }
        .table-scroll {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .exclude-option {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #616161;
        }
        .exclude-option input[type='checkbox'] {
          width: 18px;
          height: 18px;
        }

        /* Step 3: 결과 */
        .result-container {
          text-align: center;
        }
        .result-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .result-title {
          font-size: 22px;
          font-weight: 600;
          color: #4caf50;
          margin-bottom: 24px;
        }
        .result-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 360px;
          margin: 0 auto 32px;
          text-align: left;
        }
        .result-stats .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 16px;
          background: #f5f5f5;
          border-radius: 6px;
          font-size: 14px;
        }
        .result-stats .stat-row .label {
          color: #616161;
        }
        .result-stats .stat-row .value {
          font-weight: 600;
          color: #424242;
        }

        /* 버튼 영역 */
        .button-area {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-default {
          background: #f5f5f5;
          color: #616161;
          border: 1px solid #e0e0e0;
        }
        .btn-default:hover {
          background: #eeeeee;
        }
        .btn-primary {
          background: #1976d2;
          color: #fff;
        }
        .btn-primary:hover {
          background: #1565c0;
        }
        .btn-primary:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
        }
        .btn-success {
          background: #4caf50;
          color: #fff;
        }
        .btn-success:hover {
          background: #388e3c;
        }

        /* 로딩 */
        .loading-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          color: #757575;
          font-size: 14px;
          gap: 12px;
        }
        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e0e0e0;
          border-top-color: #1976d2;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      currentStep: Number,
      importType: String,
      selectedFile: Object,
      parsedData: Array,
      validationResult: Object,
      importResult: Object,
      excludeErrors: Boolean,
      processing: Boolean
    }
  }

  constructor() {
    super()
    this.currentStep = 1
    this.importType = 'B2C'
    this.selectedFile = null
    this.parsedData = []
    this.validationResult = null
    this.importResult = null
    this.excludeErrors = true
    this.processing = false
  }

  render() {
    return html`
      <h2>${i18next.t('title.ShipmentOrderImport', { defaultValue: '주문 임포트' })}</h2>

      <div class="wizard-container">
        <!-- 스텝 인디케이터 -->
        ${this._renderStepIndicator()}

        <!-- 스텝 내용 -->
        <div class="card">
          ${this.processing
            ? html`
                <div class="loading-overlay">
                  <div class="spinner"></div>
                  <span>처리 중...</span>
                </div>
              `
            : this.currentStep === 1
              ? this._renderStep1()
              : this.currentStep === 2
                ? this._renderStep2()
                : this._renderStep3()}
        </div>
      </div>
    `
  }

  /** 스텝 인디케이터 */
  _renderStepIndicator() {
    const steps = [
      { no: 1, label: '파일 업로드' },
      { no: 2, label: '검증/미리보기' },
      { no: 3, label: '결과 확인' }
    ]
    return html`
      <div class="step-indicator">
        ${steps.map(
          (step, idx) => html`
            ${idx > 0 ? html`<div class="line ${this.currentStep > step.no ? 'completed' : ''}"></div>` : ''}
            <div class="step ${this.currentStep === step.no ? 'active' : this.currentStep > step.no ? 'completed' : ''}">
              <div class="dot">${this.currentStep > step.no ? '✓' : step.no}</div>
              <div class="step-label">${step.label}</div>
            </div>
          `
        )}
      </div>
    `
  }

  /** Step 1: 파일 업로드 */
  _renderStep1() {
    return html`
      <h3 style="margin-top:0; margin-bottom:20px; font-size:16px; color:#424242;">Step 1: 파일 업로드</h3>

      <div style="margin-bottom:16px; font-size:14px; color:#616161;">임포트 유형</div>
      <div class="import-type-selector">
        <label class="${this.importType === 'B2C' ? 'selected' : ''}" @click="${() => (this.importType = 'B2C')}">
          <input type="radio" name="importType" value="B2C" ?checked="${this.importType === 'B2C'}" />
          B2C 출고
        </label>
        <label class="${this.importType === 'B2B' ? 'selected' : ''}" @click="${() => (this.importType = 'B2B')}">
          <input type="radio" name="importType" value="B2B" ?checked="${this.importType === 'B2B'}" />
          B2B 출고
        </label>
      </div>

      <div
        class="drop-zone ${this._dragover ? 'dragover' : ''}"
        @click="${this._openFileDialog}"
        @dragover="${this._handleDragOver}"
        @dragleave="${this._handleDragLeave}"
        @drop="${this._handleDrop}"
      >
        <span class="icon">📁</span>
        <div class="main-text">여기에 Excel 파일을 드래그하거나 클릭하여 업로드하세요</div>
        <div class="sub-text">지원: .xlsx, .xls (최대 10MB)</div>
        ${this.selectedFile ? html`<div class="file-name">📄 ${this.selectedFile.name} (${this._formatFileSize(this.selectedFile.size)})</div>` : ''}
      </div>

      <div class="template-buttons">
        <button class="template-btn" @click="${() => this._downloadTemplate('b2c')}">📥 B2C 템플릿 다운로드</button>
        <button class="template-btn" @click="${() => this._downloadTemplate('b2b')}">📥 B2B 템플릿 다운로드</button>
      </div>

      <div class="button-area">
        <button class="btn btn-default" @click="${this._cancel}">취소</button>
        <button class="btn btn-primary" ?disabled="${!this.selectedFile || this.parsedData.length === 0}" @click="${this._goToStep2}">
          다음 →
        </button>
      </div>
    `
  }

  /** Step 2: 검증/미리보기 */
  _renderStep2() {
    const result = this.validationResult
    if (!result) return html``

    const rows = result.rows || []
    return html`
      <h3 style="margin-top:0; margin-bottom:20px; font-size:16px; color:#424242;">Step 2: 검증/미리보기</h3>

      <div class="validation-summary">
        <span class="total">전체 ${result.total}건</span>
        <span>|</span>
        <span class="valid">✅ 성공 ${result.valid}건</span>
        <span>|</span>
        <span class="error">❌ 오류 ${result.error}건</span>
      </div>

      <div class="table-scroll">
        <table class="preview-table">
          <thead>
            <tr>
              <th class="center">행</th>
              <th>참조번호</th>
              <th>SKU</th>
              <th>상품명</th>
              <th class="right">수량</th>
              <th class="center">상태</th>
              <th>오류 내용</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              row => html`
                <tr class="${row.valid ? '' : 'error-row'}">
                  <td class="center">${row.rowNo}</td>
                  <td>${row.refOrderNo || ''}</td>
                  <td>${row.skuCd || ''}</td>
                  <td>${row.skuNm || ''}</td>
                  <td class="right">${row.orderQty || 0}</td>
                  <td class="center"><span class="status-icon">${row.valid ? '✅' : '❌'}</span></td>
                  <td class="error-text">${row.errorMessages ? row.errorMessages.join(', ') : ''}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>

      ${result.error > 0
        ? html`
            <div class="exclude-option">
              <input type="checkbox" id="excludeErrors" ?checked="${this.excludeErrors}" @change="${e => (this.excludeErrors = e.target.checked)}" />
              <label for="excludeErrors">오류 행 제외하고 등록 (${result.valid}건만 처리)</label>
            </div>
          `
        : ''}

      <div class="button-area">
        <button class="btn btn-default" @click="${this._goToStep1}">← 이전</button>
        <button class="btn btn-default" @click="${this._cancel}">취소</button>
        <button class="btn btn-primary" ?disabled="${result.valid === 0}" @click="${this._executeImport}">임포트 실행</button>
      </div>
    `
  }

  /** Step 3: 결과 확인 */
  _renderStep3() {
    const result = this.importResult
    if (!result) return html``

    return html`
      <div class="result-container">
        <div class="result-icon">✅</div>
        <div class="result-title">임포트 완료</div>

        <div class="result-stats">
          <div class="stat-row">
            <span class="label">총 처리 행</span>
            <span class="value">${result.totalRows}건</span>
          </div>
          <div class="stat-row">
            <span class="label">신규 주문 생성</span>
            <span class="value">${result.orderCount}건 (헤더)</span>
          </div>
          <div class="stat-row">
            <span class="label">신규 주문 상세</span>
            <span class="value">${result.itemCount}건 (라인)</span>
          </div>
          <div class="stat-row">
            <span class="label">배송 정보 생성</span>
            <span class="value">${result.deliveryCount}건</span>
          </div>
          ${this.validationResult && this.validationResult.error > 0
            ? html`
                <div class="stat-row">
                  <span class="label">건너뛴 행 (오류)</span>
                  <span class="value">${this.validationResult.error}건</span>
                </div>
              `
            : ''}
        </div>

        <div style="display:flex; gap:12px; justify-content:center;">
          <button class="btn btn-primary" @click="${() => this._navigateTo('shipment-orders')}">주문 목록으로 이동</button>
          <button class="btn btn-success" @click="${this._resetWizard}">추가 임포트</button>
        </div>
      </div>
    `
  }

  /** 페이지 활성화 시 초기화 */
  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      this._resetWizard()
    }
  }

  /** 파일 선택 대화상자 열기 */
  _openFileDialog() {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.xlsx,.xls'
    fileInput.addEventListener('change', e => this._handleFileSelect(e))
    fileInput.click()
  }

  /** 드래그 오버 */
  _handleDragOver(e) {
    e.preventDefault()
    this._dragover = true
    this.requestUpdate()
  }

  /** 드래그 떠남 */
  _handleDragLeave(e) {
    e.preventDefault()
    this._dragover = false
    this.requestUpdate()
  }

  /** 드롭 */
  _handleDrop(e) {
    e.preventDefault()
    this._dragover = false
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      this._processFile(files[0])
    }
  }

  /** 파일 선택 이벤트 */
  _handleFileSelect(e) {
    const files = e.target.files
    if (files && files.length > 0) {
      this._processFile(files[0])
    }
  }

  /** 파일 처리 - Excel 파싱 */
  _processFile(file) {
    const extension = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(extension)) {
      UiUtil.showToast('error', 'xlsx 또는 xls 파일만 지원합니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      UiUtil.showToast('error', '파일 크기는 10MB 이하여야 합니다.')
      return
    }

    this.selectedFile = file

    const reader = new FileReader()
    reader.onload = e => {
      const data = e.target.result
      store.dispatch({
        type: IMPORT,
        importable: {
          extension,
          handler: this._onExcelParsed.bind(this)
        },
        data
      })
    }
    reader.readAsArrayBuffer(file)
  }

  /** Excel 파싱 완료 콜백 */
  _onExcelParsed(records) {
    const importData = records.header ? records.data : records
    if (importData && importData.length > 0) {
      this.parsedData = importData
      this.requestUpdate()
    } else {
      UiUtil.showToast('warning', '파일에서 데이터를 읽을 수 없습니다.')
    }
  }

  /** Step 1 → Step 2: 서버 검증 요청 */
  async _goToStep2() {
    if (!this.parsedData || this.parsedData.length === 0) return

    try {
      this.processing = true
      const apiUrl =
        this.importType === 'B2C'
          ? 'oms_trx/shipment_orders/import/excel/b2c'
          : 'oms_trx/shipment_orders/import/excel/b2b'

      const result = await ServiceUtil.restPost(apiUrl, this.parsedData)
      if (result) {
        this.validationResult = result
        this.currentStep = 2
      }
    } catch (error) {
      console.error('검증 요청 실패:', error)
      UiUtil.showToast('error', '검증 요청에 실패했습니다.')
    } finally {
      this.processing = false
    }
  }

  /** Step 2 → Step 1: 이전 단계 */
  _goToStep1() {
    this.currentStep = 1
    this.validationResult = null
  }

  /** Step 2 → Step 3: 임포트 실행 */
  async _executeImport() {
    if (!this.validationResult) return

    try {
      this.processing = true

      // 유효한 행만 필터링하여 원본 데이터에서 추출
      let dataToImport = this.parsedData
      if (this.excludeErrors && this.validationResult.error > 0) {
        const validRowNos = this.validationResult.rows.filter(r => r.valid).map(r => r.rowNo)
        dataToImport = this.parsedData.filter((_, idx) => validRowNos.includes(idx + 1))
      }

      const result = await ServiceUtil.restPost('oms_trx/shipment_orders/import/confirm', dataToImport)
      if (result) {
        this.importResult = result
        this.currentStep = 3
      }
    } catch (error) {
      console.error('임포트 실행 실패:', error)
      UiUtil.showToast('error', '임포트 실행에 실패했습니다.')
    } finally {
      this.processing = false
    }
  }

  /** 마법사 초기화 */
  _resetWizard() {
    this.currentStep = 1
    this.importType = 'B2C'
    this.selectedFile = null
    this.parsedData = []
    this.validationResult = null
    this.importResult = null
    this.excludeErrors = true
    this.processing = false
    this._dragover = false
  }

  /** 취소 - 이전 페이지로 */
  _cancel() {
    history.back()
  }

  /** 페이지 이동 */
  _navigateTo(page) {
    UiUtil.pageNavigate(page, {})
  }

  /** 템플릿 다운로드 */
  _downloadTemplate(type) {
    UiUtil.showToast('info', `${type.toUpperCase()} 템플릿 다운로드는 준비 중입니다.`)
  }

  /** 파일 크기 포맷 */
  _formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  /** 페이지 해제 시 정리 */
  pageDisposed(lifecycle) {
    this._resetWizard()
  }
}

window.customElements.define('shipment-order-import', ShipmentOrderImport)
