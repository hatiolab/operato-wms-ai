import { css, html, LitElement } from 'lit-element'
import { store } from '@operato/shell'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'
import { IMPORT } from '@things-factory/import-base'
import '@things-factory/import-ui-excel'

/**
 * 출고주문 엑셀 일괄 임포트 팝업
 *
 * 엑셀 파일에서 출고주문번호 목록을 읽어
 * 출하완료(SHIPPED) 상태의 출고주문을 일괄 연동한다.
 *
 * 완료 시 'shipment-orders-imported' 커스텀 이벤트를 발생시킨다.
 * detail: { orders: [{id, shipment_no}], items: [{skuCd, skuNm, rwaReqQty, sourceType, sourceNo, ...}] }
 */
class RwaShipmentImportPopup extends LitElement {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

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

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

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
          font-size: 13px;
        }

        .preview-table th {
          background: #f5f5f5;
          padding: 8px 12px;
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
          padding: 7px 12px;
          border-bottom: 1px solid #eeeeee;
          color: #424242;
        }

        .preview-table .center {
          text-align: center;
          color: #9e9e9e;
        }

        /* 결과 화면 */
        .result-container {
          padding: 8px 0;
        }

        .result-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .result-card {
          flex: 1;
          padding: 16px;
          border-radius: 10px;
          text-align: center;
        }

        .result-card.success {
          background: #e8f5e9;
          border: 1px solid #a5d6a7;
        }

        .result-card.error {
          background: #fff3e0;
          border: 1px solid #ffcc80;
        }

        .result-card .card-count {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }

        .result-card.success .card-count {
          color: #2e7d32;
        }

        .result-card.error .card-count {
          color: #e65100;
        }

        .result-card .card-label {
          font-size: 13px;
          color: #757575;
        }

        .result-list-title {
          font-size: 13px;
          font-weight: 600;
          color: #424242;
          margin: 16px 0 8px;
        }

        .result-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 4px;
          font-size: 13px;
        }

        .result-row.success {
          background: #f1f8f1;
        }

        .result-row.error {
          background: #fff8f0;
        }

        .result-row .status-icon {
          font-size: 15px;
          flex-shrink: 0;
        }

        .result-row .order-no {
          font-weight: 600;
          color: #212121;
          min-width: 160px;
        }

        .result-row .detail {
          color: #757575;
          font-size: 12px;
        }

        .result-row.error .detail {
          color: #bf360c;
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
          gap: 16px;
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
          to { transform: rotate(360deg); }
        }

        .loading-progress {
          font-size: 13px;
          color: #9e9e9e;
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

        .btn-default:hover { background: #eeeeee; }

        .btn-primary {
          background: #1976d2;
          color: #fff;
        }

        .btn-primary:hover { background: #1565c0; }

        .btn-primary:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
        }

        .btn-success {
          background: #4caf50;
          color: #fff;
        }

        .btn-success:hover { background: #388e3c; }
      `
    ]
  }

  static get properties() {
    return {
      currentStep: { type: Number },
      selectedFile: { type: Object },
      parsedOrders: { type: Array },
      processing: { type: Boolean },
      processedCount: { type: Number },
      results: { type: Array }
    }
  }

  constructor() {
    super()
    this.currentStep = 1
    this.selectedFile = null
    this.parsedOrders = []
    this.processing = false
    this.processedCount = 0
    this.results = []
    this._dragover = false
  }

  render() {
    return html`
      <div class="step-indicator">
        <div class="step ${this.currentStep === 1 ? 'active' : 'completed'}">
          <div class="dot">${this.currentStep > 1 ? '✓' : '1'}</div>
          <div class="step-label">파일 업로드</div>
        </div>
        <div class="step-line ${this.currentStep > 1 ? 'completed' : ''}"></div>
        <div class="step ${this.currentStep === 2 ? 'active' : ''}">
          <div class="dot">2</div>
          <div class="step-label">처리 결과</div>
        </div>
      </div>

      <div class="content">
        ${this.processing
          ? html`
              <div class="loading-overlay">
                <div class="spinner"></div>
                <span>출고주문 조회 중...</span>
                <span class="loading-progress">${this.processedCount} / ${this.parsedOrders.length} 처리 중</span>
              </div>
            `
          : this.currentStep === 1
            ? this._renderStep1()
            : this._renderStep2()}
      </div>

      <div class="button-area">
        ${this.currentStep === 1
          ? html`
              <button class="btn btn-default" @click="${this._close}">취소</button>
              <button
                class="btn btn-primary"
                ?disabled="${this.parsedOrders.length === 0}"
                @click="${this._executeImport}"
              >📥 임포트 실행 (${this.parsedOrders.length}건)</button>
            `
          : html`
              <button class="btn btn-default" @click="${this._close}">닫기</button>
              ${this.results.some(r => r.status === 'success')
                ? html`<button class="btn btn-success" @click="${this._applyAndClose}">✓ 적용하고 닫기</button>`
                : ''}
            `}
      </div>
    `
  }

  /** Step 1: 파일 업로드 + 미리보기 */
  _renderStep1() {
    return html`
      <div class="template-buttons">
        <button class="template-btn" @click="${this._downloadTemplate}">📥 템플릿 다운로드</button>
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
        <div class="sub-text">지원: .xlsx, .xls (최대 10MB) — 열: 출고주문번호</div>
        ${this.selectedFile
          ? html`<div class="file-name">📄 ${this.selectedFile.name}</div>`
          : ''}
      </div>

      ${this.parsedOrders.length > 0 ? html`
        <div class="preview-header">📋 미리보기 (${this.parsedOrders.length}건)</div>
        <div class="table-scroll">
          <table class="preview-table">
            <thead>
              <tr>
                <th class="center" style="width:50px">행</th>
                <th>출고주문번호</th>
              </tr>
            </thead>
            <tbody>
              ${this.parsedOrders.map((row, idx) => html`
                <tr>
                  <td class="center">${idx + 1}</td>
                  <td>${row.shipment_no}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      ` : ''}
    `
  }

  /** Step 2: 처리 결과 */
  _renderStep2() {
    const successList = this.results.filter(r => r.status === 'success')
    const errorList = this.results.filter(r => r.status === 'error')

    return html`
      <div class="result-container">
        <div class="result-summary">
          <div class="result-card success">
            <div class="card-count">${successList.length}</div>
            <div class="card-label">✅ 성공</div>
          </div>
          <div class="result-card error">
            <div class="card-count">${errorList.length}</div>
            <div class="card-label">⚠️ 실패</div>
          </div>
        </div>

        ${successList.length > 0 ? html`
          <div class="result-list-title">✅ 연동 성공</div>
          ${successList.map(r => html`
            <div class="result-row success">
              <span class="status-icon">📦</span>
              <span class="order-no">${r.shipment_no}</span>
              <span class="detail">상품 ${r.itemCount}건 연동</span>
            </div>
          `)}
        ` : ''}

        ${errorList.length > 0 ? html`
          <div class="result-list-title">⚠️ 처리 실패</div>
          ${errorList.map(r => html`
            <div class="result-row error">
              <span class="status-icon">❌</span>
              <span class="order-no">${r.shipment_no}</span>
              <span class="detail">${r.message}</span>
            </div>
          `)}
        ` : ''}
      </div>
    `
  }

  /** 파일 선택 대화상자 열기 */
  _openFileDialog() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.addEventListener('change', e => this._processFile(e.target.files[0]))
    input.click()
  }

  _handleDragOver(e) {
    e.preventDefault()
    this._dragover = true
    this.requestUpdate()
  }

  _handleDragLeave(e) {
    e.preventDefault()
    this._dragover = false
    this.requestUpdate()
  }

  _handleDrop(e) {
    e.preventDefault()
    this._dragover = false
    const files = e.dataTransfer.files
    if (files && files.length > 0) this._processFile(files[0])
  }

  /** Excel 파일 파싱 */
  _processFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
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
      store.dispatch({
        type: IMPORT,
        importable: {
          extension: ext,
          handler: this._onParsed.bind(this)
        },
        data: e.target.result
      })
    }
    reader.readAsArrayBuffer(file)
  }

  /**
   * 엑셀 파싱 결과 처리
   * 헤더 컬럼: '출고주문번호' 또는 'shipment_no' 중 하나
   */
  _onParsed(records) {
    const rows = records.header ? records.data : records
    if (!rows || rows.length === 0) {
      UiUtil.showToast('warning', '파일에서 데이터를 읽을 수 없습니다.')
      return
    }

    const parsed = []
    for (const row of rows) {
      const no = (
        row['출고주문번호'] ||
        row['shipment_no'] ||
        row['ShipmentNo'] ||
        row['SHIPMENT_NO'] ||
        ''
      ).toString().trim()

      if (no) parsed.push({ shipment_no: no })
    }

    if (parsed.length === 0) {
      UiUtil.showToast('warning', "출고주문번호 데이터가 없습니다. '출고주문번호' 열이 있는지 확인해 주세요.")
      return
    }

    // 중복 제거
    const seen = new Set()
    this.parsedOrders = parsed.filter(r => {
      if (seen.has(r.shipment_no)) return false
      seen.add(r.shipment_no)
      return true
    })

    this.requestUpdate()
  }

  /** 임포트 실행 — 출고주문 일괄 조회 및 검증 */
  async _executeImport() {
    if (this.parsedOrders.length === 0) return

    this.processing = true
    this.processedCount = 0
    const results = []

    for (const row of this.parsedOrders) {
      const no = row.shipment_no
      try {
        // 출고주문 존재 확인
        const orderData = await ServiceUtil.searchByPagination(
          'shipment_orders',
          [{ name: 'shipment_no', value: no }],
          null, 1, 1
        )
        const order = orderData?.items?.[0]

        if (!order) {
          results.push({ shipment_no: no, status: 'error', message: '출고주문을 찾을 수 없습니다' })
          continue
        }

        // 출하완료 상태 체크
        if (order.status !== 'SHIPPED') {
          results.push({ shipment_no: no, status: 'error', message: `출하완료 상태가 아닙니다 (현재: ${order.status})` })
          continue
        }

        // 출고주문 상품 조회
        const itemData = await ServiceUtil.restGet(`shipment_orders/${order.id}/items`)
        const orderItems = itemData?.items || itemData || []

        results.push({
          shipment_no: no,
          status: 'success',
          order: { id: order.id, shipment_no: order.shipment_no },
          items: orderItems.map(oi => ({
            skuCd: oi.sku_cd || '',
            skuNm: oi.sku_nm || '',
            rwaReqQty: oi.order_qty || 1,
            returnReason: '',
            boxQty: 0,
            sourceType: 'SHIPMENT',
            sourceNo: order.shipment_no
          })),
          itemCount: orderItems.length
        })
      } catch (err) {
        results.push({ shipment_no: no, status: 'error', message: err.message || '조회 실패' })
      } finally {
        this.processedCount++
        this.requestUpdate()
      }
    }

    this.results = results
    this.processing = false
    this.currentStep = 2
  }

  /** 성공한 주문/상품을 부모에 전달하고 팝업 닫기 */
  _applyAndClose() {
    const successResults = this.results.filter(r => r.status === 'success')
    const orders = successResults.map(r => r.order)
    const items = successResults.flatMap(r => r.items)

    this.dispatchEvent(new CustomEvent('shipment-orders-imported', {
      bubbles: true,
      composed: true,
      detail: { orders, items }
    }))

    UiUtil.closePopupBy(this)
  }

  /**
   * 템플릿 다운로드
   * BOM 포함 CSV로 생성 (Excel에서 한글 정상 표시)
   */
  _downloadTemplate() {
    const csvContent = '출고주문번호\nSO-XXXXXX-XXXXX\n'
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '출고주문_임포트_템플릿.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  _close() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('rwa-shipment-import-popup', RwaShipmentImportPopup)
