import { css, html, LitElement } from 'lit-element'
import { store } from '@operato/shell'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'
import { IMPORT } from '@things-factory/import-base'
import '@things-factory/import-ui-excel'

/**
 * 입고 주문 임포트 팝업
 *
 * 2단계 위자드:
 * - 1단계: Excel 파일 업로드 + 파싱 미리보기
 * - 2단계: 임포트 결과 확인
 *
 * API: POST /rest/inbound_trx/receiving_orders/import/excel
 */
class ReceivingOrderImportPopup extends LitElement {
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

        /* 스텝 인디케이터 */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 24px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          gap: 0;
          flex-shrink: 0;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 0 0 auto;
        }

        .step .dot {
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

        .step.active .dot {
          background: #1976d2;
          box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.2);
        }

        .step.completed .dot {
          background: #4caf50;
        }

        .step .step-label {
          margin-top: 6px;
          font-size: 12px;
          color: #757575;
          white-space: nowrap;
        }

        .step.active .step-label {
          color: #1976d2;
          font-weight: 600;
        }

        .step.completed .step-label {
          color: #4caf50;
        }

        .step-line {
          width: 80px;
          height: 2px;
          background: #e0e0e0;
          margin: 0 8px;
          margin-bottom: 20px;
        }

        .step-line.completed {
          background: #4caf50;
        }

        /* 콘텐츠 영역 */
        .content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        /* 드롭존 */
        .drop-zone {
          border: 2px dashed #bdbdbd;
          border-radius: 12px;
          padding: 48px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #fafafa;
          margin-bottom: 16px;
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

        /* 템플릿 다운로드 버튼 */
        .template-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
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

        /* 미리보기 테이블 */
        .preview-header {
          font-size: 14px;
          font-weight: 600;
          color: #424242;
          margin-bottom: 8px;
        }

        .table-scroll {
          max-height: 320px;
          overflow: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .preview-table th {
          background: #f5f5f5;
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          color: #424242;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .preview-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #eeeeee;
          color: #616161;
          white-space: nowrap;
        }

        .preview-table .center {
          text-align: center;
        }

        .preview-table .right {
          text-align: right;
        }

        /* 결과 */
        .result-container {
          text-align: center;
          padding: 16px 0;
        }

        .result-icon {
          font-size: 56px;
          margin-bottom: 12px;
        }

        .result-title {
          font-size: 20px;
          font-weight: 600;
          color: #4caf50;
          margin-bottom: 20px;
        }

        .result-stats {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 360px;
          margin: 0 auto 24px;
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

        /* 버튼 영역 */
        .button-area {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
          flex-shrink: 0;
          background: #fff;
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
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      currentStep: { type: Number },
      selectedFile: { type: Object },
      parsedData: { type: Array },
      importResult: { type: Object },
      processing: { type: Boolean }
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.currentStep = 1
    this.selectedFile = null
    this.parsedData = []
    this.importResult = null
    this.processing = false
    this._dragover = false
  }

  /** 화면 렌더링 - 2단계 위자드 (파일 업로드/미리보기 → 결과) */
  render() {
    return html`
      <!-- 스텝 인디케이터 -->
      <div class="step-indicator">
        <div class="step ${this.currentStep === 1 ? 'active' : 'completed'}">
          <div class="dot">${this.currentStep > 1 ? '✓' : '1'}</div>
          <div class="step-label">파일 업로드</div>
        </div>
        <div class="step-line ${this.currentStep > 1 ? 'completed' : ''}"></div>
        <div class="step ${this.currentStep === 2 ? 'active' : ''}">
          <div class="dot">2</div>
          <div class="step-label">결과 확인</div>
        </div>
      </div>

      <!-- 콘텐츠 -->
      <div class="content">
        ${this.processing
          ? html`
              <div class="loading-overlay">
                <div class="spinner"></div>
                <span>임포트 처리 중...</span>
              </div>
            `
          : this.currentStep === 1
            ? this._renderStep1()
            : this._renderStep2()}
      </div>

      <!-- 버튼 영역 -->
      <div class="button-area">
        ${this.currentStep === 1
          ? html`
              <button class="btn btn-default" @click="${this._close}">취소</button>
              <button
                class="btn btn-primary"
                ?disabled="${!this.selectedFile || this.parsedData.length === 0}"
                @click="${this._executeImport}"
              >
                📥 임포트 실행
              </button>
            `
          : html`
              <button class="btn btn-default" @click="${this._resetAndClose}">닫기</button>
              <button class="btn btn-success" @click="${this._resetWizard}">추가 임포트</button>
            `}
      </div>
    `
  }

  /** Step 1: 파일 업로드 + 미리보기 렌더링 */
  _renderStep1() {
    return html`
      <!-- 템플릿 다운로드 -->
      <div class="template-buttons">
        <button class="template-btn" @click="${this._downloadTemplate}">📥 템플릿 다운로드</button>
      </div>

      <!-- 드롭존 -->
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
        ${this.selectedFile
          ? html`<div class="file-name">📄 ${this.selectedFile.name} (${this._formatFileSize(this.selectedFile.size)})</div>`
          : ''}
      </div>

      <!-- 미리보기 -->
      ${this.parsedData && this.parsedData.length > 0
        ? html`
            <div class="preview-header">📋 미리보기 (${this.parsedData.length}건)</div>
            <div class="table-scroll">
              <table class="preview-table">
                <thead>
                  <tr>
                    <th class="center">행</th>
                    <th>입고번호</th>
                    <th>입고요청일</th>
                    <th>입고유형</th>
                    <th>창고</th>
                    <th>화주사</th>
                    <th>공급업체</th>
                    <th>SKU 코드</th>
                    <th>SKU 명</th>
                    <th>입고예정일</th>
                    <th class="right">예정수량</th>
                    <th>LOT 번호</th>
                    <th>유통기한</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.parsedData.map(
                    (row, idx) => html`
                      <tr>
                        <td class="center">${idx + 1}</td>
                        <td>${row.rcv_no || row.rcvNo || ''}</td>
                        <td>${row.rcv_req_date || row.rcvReqDate || ''}</td>
                        <td>${row.rcv_type || row.rcvType || ''}</td>
                        <td>${row.wh_cd || row.whCd || ''}</td>
                        <td>${row.com_cd || row.comCd || ''}</td>
                        <td>${row.vend_cd || row.vendCd || ''}</td>
                        <td>${row.sku_cd || row.skuCd || ''}</td>
                        <td>${row.sku_nm || row.skuNm || ''}</td>
                        <td>${row.rcv_exp_date || row.rcvExpDate || ''}</td>
                        <td class="right">${row.rcv_exp_qty || row.rcvExpQty || 0}</td>
                        <td>${row.lot_no || row.lotNo || ''}</td>
                        <td>${row.expired_date || row.expiredDate || ''}</td>
                        <td>${row.remarks || ''}</td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </div>
          `
        : ''}
    `
  }

  /** Step 2: 임포트 결과 렌더링 */
  _renderStep2() {
    const result = this.importResult
    return html`
      <div class="result-container">
        <div class="result-icon">✅</div>
        <div class="result-title">임포트 완료</div>
        <div class="result-stats">
          <div class="stat-row">
            <span class="label">처리 건수</span>
            <span class="value">${result ? result.length : 0}건</span>
          </div>
        </div>
        <p style="color:#757575; font-size:14px;">입고 현황에서 등록된 입고 주문을 확인하세요.</p>
      </div>
    `
  }

  /** 파일 선택 대화상자 열기 */
  _openFileDialog() {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.xlsx,.xls'
    fileInput.addEventListener('change', e => this._handleFileSelect(e))
    fileInput.click()
  }

  /** 드래그 오버 이벤트 처리 */
  _handleDragOver(e) {
    e.preventDefault()
    this._dragover = true
    this.requestUpdate()
  }

  /** 드래그 떠남 이벤트 처리 */
  _handleDragLeave(e) {
    e.preventDefault()
    this._dragover = false
    this.requestUpdate()
  }

  /** 파일 드롭 이벤트 처리 */
  _handleDrop(e) {
    e.preventDefault()
    this._dragover = false
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      this._processFile(files[0])
    }
  }

  /** 파일 선택 이벤트 처리 */
  _handleFileSelect(e) {
    const files = e.target.files
    if (files && files.length > 0) {
      this._processFile(files[0])
    }
  }

  /** Excel 파일 처리 - 파싱 및 미리보기 데이터 세팅 */
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

  /** Excel 파싱 완료 콜백 - 미리보기 데이터 세팅 */
  _onExcelParsed(records) {
    const importData = records.header ? records.data : records
    if (importData && importData.length > 0) {
      this.parsedData = importData
      this.requestUpdate()
    } else {
      UiUtil.showToast('warning', '파일에서 데이터를 읽을 수 없습니다.')
    }
  }

  /** 임포트 실행 - 서버 API 호출 */
  async _executeImport() {
    if (!this.parsedData || this.parsedData.length === 0) return

    try {
      this.processing = true
      const result = await ServiceUtil.restPost('inbound_trx/receiving_orders/import/excel', this.parsedData)
      if (result) {
        this.importResult = result
        this.currentStep = 2
        this.dispatchEvent(new CustomEvent('import-completed', { bubbles: true, composed: true }))
      }
    } catch (error) {
      console.error('임포트 실행 실패:', error)
      UiUtil.showToast('error', '임포트 실행에 실패했습니다.')
    } finally {
      this.processing = false
    }
  }

  /** 템플릿 다운로드 - Settings에서 Attachment ID 조회 후 다운로드 */
  async _downloadTemplate() {
    try {
      const query = JSON.stringify([{ name: 'name', value: 'template.inbound.order' }])
      const result = await ServiceUtil.restGet(`settings?query=${encodeURIComponent(query)}`)
      if (!result || !result.items || result.items.length === 0) {
        UiUtil.showToast('error', '템플릿 설정을 찾을 수 없습니다.')
        return
      }
      const attachmentId = result.items[0].value
      if (!attachmentId) {
        UiUtil.showToast('error', '템플릿 파일이 설정되어 있지 않습니다.')
        return
      }
      const link = document.createElement('a')
      link.href = `/rest/attachments/${attachmentId}/download`
      link.click()
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error)
      UiUtil.showToast('error', '템플릿 다운로드에 실패했습니다.')
    }
  }

  /** 위자드 초기화 */
  _resetWizard() {
    this.currentStep = 1
    this.selectedFile = null
    this.parsedData = []
    this.importResult = null
    this.processing = false
    this._dragover = false
  }

  /** 팝업 닫기 */
  _close() {
    UiUtil.closePopupBy(this)
  }

  /** 위자드 초기화 후 팝업 닫기 */
  _resetAndClose() {
    this._resetWizard()
    UiUtil.closePopupBy(this)
  }

  /** 파일 크기 포맷 변환 */
  _formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}

window.customElements.define('receiving-order-import-popup', ReceivingOrderImportPopup)
