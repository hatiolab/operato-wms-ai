import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'
import * as XLSX from 'xlsx'

const MAX_IMPORT_ROWS = 20000
const DEFAULT_CHUNK_ROWS = 200
const MIN_CHUNK_ROWS = 20
const MAX_CHUNK_ROWS = 2000

/**
 * 출하주문 대량 엑셀 등록 파일럿 팝업.
 *
 * 전체 파일 검증을 먼저 수행하고, 참조 주문번호 그룹을 유지한 청크 단위로 등록한다.
 */
class ShipmentOrderBulkImportPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일을 반환한다. */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 520px;
          color: var(--md-sys-color-on-surface, #212121);
          background: var(--md-sys-color-surface, #fff);
        }

        .content {
          flex: 1;
          overflow: auto;
          padding: 20px;
        }

        .guide {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #eef5ff;
          color: #174a7e;
          font-size: 13px;
          line-height: 1.6;
        }

        .type-row, .button-row, .summary-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .type-row {
          margin-bottom: 14px;
        }

        .type-option {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #d5dbe3;
          border-radius: 8px;
          cursor: pointer;
        }

        .type-option.selected {
          border-color: #1976d2;
          background: #eaf3ff;
        }

        .chunk-size-control {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          color: #475467;
          font-size: 13px;
          font-weight: 600;
        }

        .chunk-size-control input {
          width: 88px;
          height: 34px;
          box-sizing: border-box;
          padding: 0 9px;
          border: 1px solid #c8d0da;
          border-radius: 8px;
          background: #fff;
          color: #263238;
          text-align: right;
        }

        .chunk-size-control input:disabled {
          opacity: .5;
        }

        .drop-zone {
          padding: 38px 24px;
          border: 2px dashed #b9c2cf;
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          background: #fafbfd;
        }

        .drop-zone.dragover {
          border-color: #1976d2;
          background: #eef6ff;
        }

        .drop-icon {
          display: block;
          margin-bottom: 8px;
          font-size: 40px;
        }

        .file-name {
          margin-top: 10px;
          font-weight: 700;
          color: #1565c0;
        }

        .button-row {
          margin-top: 14px;
        }

        button {
          min-height: 34px;
          padding: 0 14px;
          border: 1px solid #c8d0da;
          border-radius: 8px;
          background: #fff;
          color: #263238;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        button.primary {
          border-color: #1976d2;
          background: #1976d2;
          color: #fff;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        .summary-row {
          margin: 18px 0 12px;
        }

        .summary-card {
          min-width: 130px;
          padding: 12px 14px;
          border: 1px solid #e1e5ea;
          border-radius: 10px;
          background: #fff;
        }

        .summary-label {
          color: #667085;
          font-size: 11px;
        }

        .summary-value {
          margin-top: 3px;
          font-size: 20px;
          font-weight: 800;
        }

        .summary-card.error .summary-value {
          color: #c62828;
        }

        .summary-card.success .summary-value {
          color: #2e7d32;
        }

        .progress-panel {
          margin-top: 16px;
          padding: 14px;
          border: 1px solid #e1e5ea;
          border-radius: 10px;
          background: #fafafa;
        }

        .progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
          color: #344054;
          font-size: 12px;
          font-weight: 700;
        }

        .elapsed-time {
          min-width: 58px;
          font-variant-numeric: tabular-nums;
          text-align: right;
        }

        .progress-track {
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e7ed;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: #1976d2;
          transition: width .2s ease;
        }

        .progress-text {
          margin-top: 7px;
          color: #52606d;
          font-size: 12px;
        }

        .error-table-wrap {
          margin-top: 14px;
          overflow: auto;
          border: 1px solid #e1e5ea;
          border-radius: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th, td {
          padding: 8px 10px;
          border-bottom: 1px solid #edf0f3;
          text-align: left;
          vertical-align: top;
        }

        th {
          position: sticky;
          top: 0;
          background: #f5f7fa;
          color: #475467;
        }

        td.error-message {
          min-width: 280px;
          color: #b42318;
          white-space: normal;
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 18px;
          border-top: 1px solid #e1e5ea;
          background: #fafafa;
        }
      `
    ]
  }

  /** 반응형 속성을 정의한다. */
  static get properties() {
    return {
      _importType: String,
      _file: Object,
      _rows: Array,
      _phase: String,
      _processed: Number,
      _total: Number,
      _validCount: Number,
      _errorCount: Number,
      _successCount: Number,
      _failedCount: Number,
      _dragover: Boolean,
      _message: String,
      _chunkSize: Number,
      _elapsedSeconds: Number
    }
  }

  /** 초기 상태를 설정한다. */
  constructor() {
    super()
    this._importType = 'B2C_OUT'
    this._file = null
    this._rows = []
    this._phase = 'SELECT'
    this._processed = 0
    this._total = 0
    this._validCount = 0
    this._errorCount = 0
    this._successCount = 0
    this._failedCount = 0
    this._dragover = false
    this._message = ''
    this._chunkSize = DEFAULT_CHUNK_ROWS
    this._elapsedSeconds = 0
    this._timerId = null
    this._timerStartedAt = null
  }

  /** 컴포넌트가 제거될 때 경과 시간 타이머를 정리한다. */
  disconnectedCallback() {
    this._stopTimer()
    super.disconnectedCallback()
  }

  /** 현재 상태에 맞는 팝업 화면을 렌더링한다. */
  render() {
    const progress = this._total > 0 ? Math.round((this._processed / this._total) * 100) : 0
    const errors = this._rows.filter(row => row._valid === false || row._createStatus === 'ERROR').slice(0, 100)
    const running = this._phase === 'PARSING' || this._phase === 'VALIDATING' || this._phase === 'IMPORTING'

    return html`
      <div class="content">
        <div class="guide">${TermsUtil.tText('shipment_bulk_import_description')}</div>

        <div class="type-row">
          <label class="type-option ${this._importType === 'B2C_OUT' ? 'selected' : ''}">
            <input type="radio" name="import-type" value="B2C_OUT"
              .checked=${this._importType === 'B2C_OUT'}
              ?disabled=${running}
              @change=${this._onImportTypeChange}>
            ${TermsUtil.tText('shipment_bulk_import_b2c')}
          </label>
          <label class="type-option ${this._importType === 'B2B_OUT' ? 'selected' : ''}">
            <input type="radio" name="import-type" value="B2B_OUT"
              .checked=${this._importType === 'B2B_OUT'}
              ?disabled=${running}
              @change=${this._onImportTypeChange}>
            ${TermsUtil.tText('shipment_bulk_import_b2b')}
          </label>
          <label class="chunk-size-control"
            title=${TermsUtil.tText('shipment_bulk_import_chunk_size_hint')}>
            <span>${TermsUtil.tText('shipment_bulk_import_chunk_size')}</span>
            <input type="number"
              min=${MIN_CHUNK_ROWS}
              max=${MAX_CHUNK_ROWS}
              step="20"
              .value=${String(this._chunkSize)}
              ?disabled=${running}
              @change=${this._onChunkSizeChange}>
          </label>
        </div>

        <div class="drop-zone ${this._dragover ? 'dragover' : ''}"
          @click=${this._openFilePicker}
          @dragover=${this._onDragOver}
          @dragleave=${this._onDragLeave}
          @drop=${this._onDrop}>
          <span class="drop-icon">📂</span>
          <div>${TermsUtil.tText('shipment_bulk_import_file_guide')}</div>
          ${this._file ? html`<div class="file-name">${this._file.name}</div>` : ''}
          <input id="bulk-file-input" type="file" accept=".xlsx" hidden
            ?disabled=${running}
            @change=${this._onFileInput}>
        </div>

        <div class="button-row">
          <button ?disabled=${running} @click=${this._downloadTemplate}>
            ${TermsUtil.tButton('template')}
          </button>
          <button class="primary" ?disabled=${!this._file || running} @click=${this._parseSelectedFile}>
            ${TermsUtil.tButton('validate')}
          </button>
          <button class="primary"
            ?disabled=${this._phase !== 'VALIDATED' || this._errorCount > 0}
            @click=${this._importValidatedRows}>
            ${TermsUtil.tButton('import')}
          </button>
          <button ?disabled=${running} @click=${this._reset}>
            ${TermsUtil.tButton('reset')}
          </button>
        </div>

        ${this._rows.length > 0 ? html`
          <div class="summary-row">
            ${this._renderSummaryCard('shipment_bulk_import_total_rows', this._rows.length)}
            ${this._renderSummaryCard('shipment_bulk_import_total_orders', this._groupRows(this._rows).length)}
            ${this._renderSummaryCard('shipment_bulk_import_valid_rows', this._validCount, 'success')}
            ${this._renderSummaryCard('shipment_bulk_import_error_rows', this._errorCount, 'error')}
            ${this._renderSummaryCard('shipment_bulk_import_registered_rows', this._successCount, 'success')}
          </div>
        ` : ''}

        ${this._total > 0 || running || this._elapsedSeconds > 0 ? html`
          <div class="progress-panel">
            <div class="progress-header">
              <span>${TermsUtil.tText('shipment_bulk_import_progress')}</span>
              <span class="elapsed-time">
                ${TermsUtil.tText('shipment_bulk_import_elapsed_time')} ${this._formatElapsedTime()}
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${progress}%"></div>
            </div>
            ${this._total > 0 ? html`
              <div class="progress-text">
                ${this._processed.toLocaleString()} / ${this._total.toLocaleString()} (${progress}%)
              </div>
            ` : ''}
            ${this._message ? html`<div class="progress-text">${this._message}</div>` : ''}
          </div>
        ` : ''}

        ${errors.length > 0 ? html`
          <div class="error-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>${TermsUtil.tLabel('row_no')}</th>
                  <th>${TermsUtil.tLabel('ref_order_no')}</th>
                  <th>${TermsUtil.tLabel('sku_cd')}</th>
                  <th>${TermsUtil.tLabel('error_message')}</th>
                </tr>
              </thead>
              <tbody>
                ${errors.map(row => html`
                  <tr>
                    <td>${row._sourceRowNo}</td>
                    <td>${row.ref_order_no || ''}</td>
                    <td>${row.sku_cd || ''}</td>
                    <td class="error-message">${this._rowErrorMessage(row)}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <button ?disabled=${running} @click=${this._close}>
          ${TermsUtil.tButton('close')}
        </button>
      </div>
    `
  }

  /**
   * 요약 카드를 렌더링한다.
   * @param {string} labelKey 라벨 용어 키
   * @param {number} value 표시 값
   * @param {string} styleClass 상태 스타일
   * @returns {import('lit-element').TemplateResult} 요약 카드
   */
  _renderSummaryCard(labelKey, value, styleClass = '') {
    return html`
      <div class="summary-card ${styleClass}">
        <div class="summary-label">${TermsUtil.tText(labelKey)}</div>
        <div class="summary-value">${Number(value || 0).toLocaleString()}</div>
      </div>
    `
  }

  /** B2C/B2B 임포트 유형을 변경한다. */
  _onImportTypeChange(event) {
    this._importType = event.target.value
  }

  /** 사용자가 입력한 처리 단위를 허용 범위로 보정한다. */
  _onChunkSizeChange(event) {
    const requestedSize = Number.parseInt(event.target.value, 10)
    const safeSize = Number.isFinite(requestedSize) ? requestedSize : DEFAULT_CHUNK_ROWS
    this._chunkSize = Math.min(MAX_CHUNK_ROWS, Math.max(MIN_CHUNK_ROWS, safeSize))
    event.target.value = String(this._chunkSize)
  }

  /** 숨겨진 파일 선택기를 연다. */
  _openFilePicker() {
    if (this._phase === 'VALIDATING' || this._phase === 'IMPORTING') return
    this.shadowRoot.getElementById('bulk-file-input')?.click()
  }

  /** 드래그 중인 파일의 기본 동작을 막고 강조 상태를 켠다. */
  _onDragOver(event) {
    event.preventDefault()
    this._dragover = true
  }

  /** 드래그 강조 상태를 해제한다. */
  _onDragLeave() {
    this._dragover = false
  }

  /** 드롭된 파일을 선택한다. */
  _onDrop(event) {
    event.preventDefault()
    this._dragover = false
    const file = event.dataTransfer?.files?.[0]
    if (file) this._selectFile(file)
  }

  /** 파일 입력에서 선택된 파일을 반영한다. */
  _onFileInput(event) {
    const file = event.target.files?.[0]
    if (file) this._selectFile(file)
  }

  /**
   * 선택 파일의 확장자를 확인하고 상태에 반영한다.
   * @param {File} file 선택 파일
   */
  _selectFile(file) {
    if (!String(file.name || '').toLowerCase().endsWith('.xlsx')) {
      UiUtil.showToast('warning', TermsUtil.tText('shipment_bulk_import_xlsx_only'))
      return
    }
    this._resetResults()
    this._file = file
  }

  /** 선택한 엑셀을 파싱하고 전체 검증을 실행한다. */
  async _parseSelectedFile() {
    if (!this._file) return
    this._startTimer()
    this._phase = 'PARSING'
    this._message = TermsUtil.tText('shipment_bulk_import_parsing')
    try {
      const parsed = await this._parseExcel(this._file)
      if (parsed.length === 0) {
        throw new Error(TermsUtil.tText('shipment_bulk_import_empty_file'))
      }
      if (parsed.length > MAX_IMPORT_ROWS) {
        throw new Error(TermsUtil.tText('shipment_bulk_import_row_limit', [MAX_IMPORT_ROWS.toLocaleString()]))
      }

      this._rows = parsed.map((row, index) => ({
        ...row,
        _sourceRowNo: index + 2,
        _valid: undefined,
        _errorMessages: [],
        _createStatus: null,
        _createMessage: ''
      }))
      await this._validateRows()
    } catch (error) {
      this._stopTimer()
      this._phase = 'ERROR'
      this._message = this._extractErrorMessage(error)
      UiUtil.showToast('error', this._message)
    }
  }

  /**
   * SheetJS 파서로 첫 번째 시트의 엑셀 데이터를 읽는다.
   * @param {File} file 엑셀 파일
   * @returns {Promise<Array>} 정규화된 행 목록
   */
  async _parseExcel(file) {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array', cellDates: true })
    const firstSheetName = workbook.SheetNames?.[0]
    if (!firstSheetName) return []

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
      defval: null,
      raw: true
    })
    return rows.map(row => this._normalizeRow(row)).filter(row => this._hasRowValue(row))
  }

  /**
   * 엑셀 행의 키와 값을 서버 전송 형식으로 정규화한다.
   * @param {Object} source 원본 행
   * @returns {Object} 정규화 행
   */
  _normalizeRow(source) {
    const row = {}
    Object.entries(source || {}).forEach(([rawKey, rawValue]) => {
      const key = String(rawKey || '').trim().toLowerCase()
      if (!key) return
      row[key] = this._normalizeCellValue(key, rawValue)
    })
    if (!row.biz_type) row.biz_type = this._importType
    return row
  }

  /**
   * 컬럼 유형에 맞게 셀 값을 변환한다.
   * @param {string} key 컬럼명
   * @param {*} value 셀 값
   * @returns {*} 정규화된 값
   */
  _normalizeCellValue(key, value) {
    if (value === null || value === undefined) return null
    if (value instanceof Date) {
      return this._formatDate(value)
    }
    if (key === 'order_qty' || key === 'unit_price') {
      const numberValue = Number(String(value).replaceAll(',', '').trim())
      return Number.isFinite(numberValue) ? numberValue : value
    }
    if (key.endsWith('_date')) {
      return this._formatDate(value)
    }
    return typeof value === 'string' ? value.trim() : value
  }

  /**
   * 날짜 값을 YYYY-MM-DD 문자열로 변환한다.
   * @param {*} value 날짜 값
   * @returns {string} 날짜 문자열
   */
  _formatDate(value) {
    if (!value) return ''
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
      if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
    }
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 행에 실제 주문 데이터가 있는지 확인한다.
   * @param {Object} row 확인할 행
   * @returns {boolean} 데이터 존재 여부
   */
  _hasRowValue(row) {
    return ['ref_order_no', 'com_cd', 'wh_cd', 'sku_cd'].some(key => {
      const value = row[key]
      return value !== null && value !== undefined && String(value).trim() !== ''
    })
  }

  /** 전체 데이터를 청크별로 서버 검증한다. */
  async _validateRows() {
    const chunks = this._buildChunks(this._rows)
    this._phase = 'VALIDATING'
    this._processed = 0
    this._total = this._rows.length
    this._validCount = 0
    this._errorCount = 0
    this._successCount = 0
    this._failedCount = 0
    this._message = TermsUtil.tText('shipment_bulk_import_validating')

    for (const chunk of chunks) {
      const url = `oms_trx/shipment_orders/import/bulk/validate/${this._importType}`
      try {
        const result = await ServiceUtil.restPost(url, chunk.rows.map(row => this._requestRow(row)))
        const resultRows = result?.rows || []
        chunk.rows.forEach((row, index) => {
          const checked = resultRows[index] || {}
          row._valid = checked.valid === true
          row._errorMessages = checked.error_messages || []
          if (checked.sku_nm) row.sku_nm = checked.sku_nm
        })
      } catch (error) {
        const message = this._extractErrorMessage(error)
        chunk.rows.forEach(row => {
          row._valid = false
          row._errorMessages = [message]
        })
      }
      this._processed += chunk.rows.length
      this._refreshValidationCounts()
      this.requestUpdate()
    }

    this._phase = 'VALIDATED'
    this._message = this._errorCount > 0
      ? TermsUtil.tText('shipment_bulk_import_validation_failed')
      : TermsUtil.tText('shipment_bulk_import_validation_complete')
    this._stopTimer()
  }

  /** 검증된 전체 데이터를 청크별로 등록한다. */
  async _importValidatedRows() {
    if (this._errorCount > 0 || this._rows.length === 0) return
    this._startTimer()
    const chunks = this._buildChunks(this._rows)
    this._phase = 'IMPORTING'
    this._processed = 0
    this._total = this._rows.length
    this._successCount = 0
    this._failedCount = 0
    this._message = TermsUtil.tText('shipment_bulk_import_importing')

    for (const chunk of chunks) {
      try {
        const result = await ServiceUtil.restPost(
          `oms_trx/shipment_orders/import/bulk/confirm/${this._importType}`,
          chunk.rows.map(row => this._requestRow(row))
        )
        if (result?.success === true) {
          chunk.rows.forEach(row => {
            row._createStatus = 'OK'
            row._createMessage = ''
          })
        } else {
          this._applyImportErrors(chunk.rows, result?.rows || [])
          this._failedCount = this._rows.filter(row => row._createStatus === 'ERROR').length
          break
        }
      } catch (error) {
        const message = this._extractErrorMessage(error)
        chunk.rows.forEach(row => {
          row._createStatus = 'ERROR'
          row._createMessage = message
        })
        this._failedCount = this._rows.filter(row => row._createStatus === 'ERROR').length
        break
      }

      this._processed += chunk.rows.length
      this._successCount = this._rows.filter(row => row._createStatus === 'OK').length
      this.requestUpdate()
    }

    this._phase = this._failedCount > 0 ? 'ERROR' : 'COMPLETED'
    this._message = this._failedCount > 0
      ? TermsUtil.tText('shipment_bulk_import_partial_failed')
      : TermsUtil.tText('shipment_bulk_import_complete')
    this._stopTimer()

    if (this._failedCount === 0) {
      UiUtil.showToast('success', this._message)
      this.dispatchEvent(new CustomEvent('import-completed', {
        bubbles: true,
        composed: true,
        detail: {
          rows: this._rows.length,
          orders: this._groupRows(this._rows).length
        }
      }))
    } else {
      UiUtil.showToast('error', this._message)
    }
  }

  /**
   * 등록 응답의 오류를 원본 행에 적용한다.
   * @param {Array} rows 청크 행
   * @param {Array} resultRows 검증 결과 행
   */
  _applyImportErrors(rows, resultRows) {
    rows.forEach((row, index) => {
      const result = resultRows[index] || {}
      row._createStatus = 'ERROR'
      row._createMessage = (result.error_messages || []).join(', ')
    })
  }

  /**
   * 서버 전송에서 화면 전용 속성을 제외한다.
   * @param {Object} row 화면 행
   * @returns {Object} API 요청 행
   */
  _requestRow(row) {
    const result = {}
    Object.entries(row || {}).forEach(([key, value]) => {
      if (!key.startsWith('_')) result[key] = value
    })
    return result
  }

  /**
   * 참조 주문번호를 기준으로 행을 그룹화한다.
   * @param {Array} rows 전체 행
   * @returns {Array<{key: string, rows: Array}>} 주문 그룹 목록
   */
  _groupRows(rows) {
    const groups = []
    const byKey = new Map()
    ;(rows || []).forEach((row, index) => {
      const key = row.ref_order_no ? String(row.ref_order_no) : `__EMPTY_${index}`
      if (!byKey.has(key)) {
        const group = { key, rows: [] }
        byKey.set(key, group)
        groups.push(group)
      }
      byKey.get(key).rows.push(row)
    })
    return groups
  }

  /**
   * 주문 그룹을 분리하지 않고 요청 청크를 생성한다.
   * @param {Array} rows 전체 행
   * @returns {Array<{groups: Array, rows: Array}>} 요청 청크 목록
   */
  _buildChunks(rows) {
    const chunks = []
    let chunk = { groups: [], rows: [] }
    this._groupRows(rows).forEach(group => {
      const rowLimitReached = chunk.rows.length > 0
        && chunk.rows.length + group.rows.length > this._chunkSize
      if (rowLimitReached) {
        chunks.push(chunk)
        chunk = { groups: [], rows: [] }
      }
      chunk.groups.push(group)
      chunk.rows.push(...group.rows)
    })
    if (chunk.rows.length > 0) chunks.push(chunk)
    return chunks
  }

  /** 경과 시간 타이머를 0초부터 시작한다. */
  _startTimer() {
    this._stopTimer()
    this._elapsedSeconds = 0
    this._timerStartedAt = Date.now()
    this._timerId = window.setInterval(() => {
      this._updateElapsedTime()
    }, 1000)
  }

  /** 실행 중인 경과 시간 타이머를 중지한다. */
  _stopTimer() {
    this._updateElapsedTime()
    if (this._timerId !== null) {
      window.clearInterval(this._timerId)
      this._timerId = null
    }
    this._timerStartedAt = null
  }

  /** 경과 시간을 0초로 초기화한다. */
  _resetTimer() {
    this._stopTimer()
    this._elapsedSeconds = 0
  }

  /** 타이머 시작 시각을 기준으로 실제 경과 초를 갱신한다. */
  _updateElapsedTime() {
    if (this._timerStartedAt !== null) {
      this._elapsedSeconds = Math.floor((Date.now() - this._timerStartedAt) / 1000)
    }
  }

  /**
   * 경과 시간을 mm:ss 문자열로 변환한다.
   * @returns {string} 분:초 경과 시간
   */
  _formatElapsedTime() {
    const minutes = Math.floor(this._elapsedSeconds / 60)
    const seconds = this._elapsedSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  /** 검증 성공·오류 건수를 다시 계산한다. */
  _refreshValidationCounts() {
    this._validCount = this._rows.filter(row => row._valid === true).length
    this._errorCount = this._rows.filter(row => row._valid === false).length
  }

  /**
   * 행의 검증 또는 등록 오류 메시지를 반환한다.
   * @param {Object} row 오류 행
   * @returns {string} 오류 메시지
   */
  _rowErrorMessage(row) {
    if (row._createMessage) return row._createMessage
    return (row._errorMessages || []).join(', ')
  }

  /**
   * 다양한 오류 응답에서 사용자 메시지를 추출한다.
   * @param {*} error 오류 객체
   * @returns {string} 오류 메시지
   */
  _extractErrorMessage(error) {
    return error?.msg || error?.message || TermsUtil.tText('shipment_bulk_import_unknown_error')
  }

  /** 현재 유형의 기존 출고주문 템플릿을 내려받는다. */
  async _downloadTemplate() {
    const settingName = this._importType === 'B2B_OUT'
      ? 'template.outbound.b2b.order'
      : 'template.outbound.b2c.order'
    try {
      const query = encodeURIComponent(JSON.stringify([{ name: 'name', value: settingName }]))
      const result = await ServiceUtil.restGet(`settings?query=${query}`)
      const attachmentId = result?.items?.[0]?.value
      if (!attachmentId) {
        UiUtil.showToast('warning', TermsUtil.tText('shipment_bulk_import_template_missing'))
        return
      }
      const link = document.createElement('a')
      link.href = `/rest/attachments/${attachmentId}/download`
      link.click()
    } catch (error) {
      UiUtil.showToast('error', this._extractErrorMessage(error))
    }
  }

  /** 파일과 처리 결과를 모두 초기화한다. */
  _reset() {
    this._file = null
    this._rows = []
    this._phase = 'SELECT'
    this._resetResults()
    const input = this.shadowRoot.getElementById('bulk-file-input')
    if (input) input.value = ''
  }

  /** 처리 집계 상태를 초기화한다. */
  _resetResults() {
    this._resetTimer()
    this._processed = 0
    this._total = 0
    this._validCount = 0
    this._errorCount = 0
    this._successCount = 0
    this._failedCount = 0
    this._message = ''
    if (this._phase !== 'SELECT') this._phase = 'SELECT'
  }

  /** 팝업을 닫는다. */
  _close() {
    this._stopTimer()
    UiUtil.closePopupBy(this)
  }
}

window.customElements.define('shipment-order-bulk-import-popup', ShipmentOrderBulkImportPopup)
