import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { store } from '@operato/shell'
import { IMPORT } from '@things-factory/import-base'
import { ServiceUtil } from '../../utils/service-util'
import { UiUtil } from '../../utils/ui-util'

/**
 * 동적 엑셀 임포트 범용 팝업 (W23-FR-6).
 *
 * 사용법:
 *   UiUtil.openPopupBy('dynamic-excel-import-popup', {
 *     templateName: 'my_import_template',  // excel_templates.name
 *     onComplete: (results) => { ... }
 *   })
 *
 * 처리 흐름:
 *   1. 업로드 단계: 드래그앤드롭 or 파일 선택 → IMPORT 액션으로 파싱
 *   2. 그리드 단계:
 *      - common_param 입력 영역 (위)
 *      - 파싱 결과 그리드 (아래, 동적 컬럼)
 *      - [검증] → validate_url 호출 (선택)
 *      - [임포트] → 행별 import_url 호출
 *
 * _createStatus: null(대기) | 'OK' | 'ERROR'
 * _valid: true(유효) | false(검증오류) | undefined(미검증)
 */
class DynamicExcelImportPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 420px;
          overflow: hidden;
          background: var(--md-sys-color-surface, #fff);
        }

        /* ── 업로드 단계 ── */
        .upload-phase {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 20px;
          position: relative;
        }
        .drop-zone {
          width: 100%;
          max-width: 520px;
          border: 2px dashed var(--md-sys-color-outline-variant, #bdbdbd);
          border-radius: 12px;
          padding: 48px 32px;
          text-align: center;
          cursor: pointer;
          transition: all .2s;
          background: var(--md-sys-color-surface-variant, #fafafa);
        }
        .drop-zone:hover, .drop-zone.dragover {
          border-color: var(--md-sys-color-primary, #1976D2);
          background: color-mix(in srgb, var(--md-sys-color-primary, #1976D2) 6%, transparent);
        }
        .dz-icon { font-size: 52px; display: block; margin-bottom: 12px; }
        .dz-main { font-size: 15px; font-weight: 500; color: var(--md-sys-color-on-surface, #424242); margin-bottom: 6px; }
        .dz-sub  { font-size: 13px; color: var(--md-sys-color-on-surface-variant, #9e9e9e); }
        .dz-file { margin-top: 12px; font-size: 14px; font-weight: 500; color: var(--md-sys-color-primary, #1976D2); }

        /* ── 그리드 단계 ── */
        .grid-phase {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* 파일 정보 + 공통 파라미터 바 */
        .info-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: var(--md-sys-color-surface-container, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-wrap: wrap;
          font-size: 13px;
        }
        .file-nm { font-weight: 700; color: var(--md-sys-color-primary, #1976D2); }
        .vdiv { color: #ccc; }

        /* 공통 파라미터 입력 영역 */
        .common-params {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: var(--md-sys-color-surface, #fff);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-wrap: wrap;
        }
        .param-field { display: flex; align-items: center; gap: 6px; font-size: 13px; }
        .param-field label { font-weight: 600; color: var(--md-sys-color-on-surface-variant, #555); white-space: nowrap; }
        .param-field label .req { color: #e53935; }
        .param-field input, .param-field select {
          height: 28px;
          padding: 0 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 12px;
          background: var(--md-sys-color-surface, #fff);
          min-width: 100px;
          max-width: 160px;
        }
        .param-field input:focus, .param-field select:focus {
          outline: none;
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 필터 칩 */
        .filter-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          flex-wrap: wrap;
        }
        .chip {
          padding: 3px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface-variant, #555);
          transition: all .15s;
        }
        .chip.active { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .chip.ok    { background: #2E7D32; color: #fff; }
        .chip.error { background: #C62828; color: #fff; }
        .chip.invalid { background: #E65100; color: #fff; }

        /* 그리드 */
        .grid-wrap { flex: 1; overflow: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap; }
        th {
          position: sticky;
          top: 0;
          z-index: 1;
          padding: 7px 10px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          color: var(--md-sys-color-on-surface-variant, #555);
          font-weight: 700;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #ddd);
          text-align: left;
        }
        td {
          padding: 6px 10px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        tr.status-ok { background: #F1F8E9; }
        tr.status-error { background: #FFEBEE; }
        tr.status-invalid { background: #FFF3E0; }
        tr.status-skip { opacity: .45; }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }
        .badge-pending  { background: #E3F2FD; color: #0D47A1; }
        .badge-ok       { background: #E8F5E9; color: #1B5E20; }
        .badge-error    { background: #FFEBEE; color: #B71C1C; }
        .badge-invalid  { background: #FFF3E0; color: #BF360C; }
        .err-msg { font-size: 11px; color: #C62828; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }

        /* 진행률 바 */
        .progress-section {
          flex-shrink: 0;
          padding: 6px 16px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface-container, #f9f9f9);
        }
        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background: var(--md-sys-color-outline-variant, #e0e0e0);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .progress-bar-fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 3px;
          transition: width .3s;
        }
        .progress-text { font-size: 12px; color: var(--md-sys-color-on-surface-variant, #555); }

        /* 하단 버튼 영역 */
        .popup-footer {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface-container, #f9f9f9);
        }
        .spacer { flex: 1; }
        .btn {
          padding: 7px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn:disabled { opacity: .5; cursor: not-allowed; }
        .btn-primary  { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .btn-primary:hover:not(:disabled)  { background: #1565C0; }
        .btn-warning  { background: #E65100; color: #fff; }
        .btn-warning:hover:not(:disabled)  { background: #BF360C; }
        .btn-outline  {
          background: transparent;
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }
        .btn-outline:hover:not(:disabled) { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .btn-pause {
          background: var(--md-sys-color-surface, #fff);
          color: #E65100;
          border: 1px solid #E65100;
        }
        .btn-pause:hover:not(:disabled) { background: #FFF3E0; }
        .btn-pause.resuming { background: #E65100; color: #fff; }
        .btn-pause.resuming:hover:not(:disabled) { background: #BF360C; }

        .spinner {
          display: inline-block;
          width: 10px;
          height: 10px;
          border: 2px solid #e0e0e0;
          border-top-color: var(--md-sys-color-primary, #1976D2);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 4px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .elapsed-time {
          margin-left: auto;
          font-size: 12px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--md-sys-color-on-surface-variant, #666);
          letter-spacing: 0.5px;
        }
      `
    ]
  }

  static get properties() {
    return {
      /** 템플릿 이름 (excel_templates.name) */
      templateName: String,
      /** 부모 ID — 설정 시 templateName으로 할당 (templateName 미설정인 경우) */
      parent_id: String,
      /** 완료 콜백 */
      onComplete: Object,

      /** 내부 상태 */
      _phase: String,      // 'upload' | 'grid'
      _template: Object,
      _columns: Array,     // col_role='column' 컬럼 목록
      _params: Array,      // col_role='common_param' 컬럼 목록
      _selectMaps: Object, // { col_key: { label→value } } (select 타입 역방향)
      _rows: Array,        // 파싱된 데이터 행 배열
      _commonValues: Object, // 공통 파라미터 값 { col_key: value }
      _filterChip: String, // 'all'|'pending'|'ok'|'error'|'invalid'
      _apiOptions: Object, // { col_key: [{value, label}] } — api_select 옵션 캐시
      _codeSelectMaps: Object, // { col_key: { labelValue → codeValue } } — code_select 역변환 맵
      _running: Boolean,
      _paused: Boolean,
      _processed: Number,
      _total: Number,
      _fileName: String,
      _loadingTemplate: Boolean
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this._phase = 'upload'
    this._template = null
    this._columns = []
    this._params = []
    this._selectMaps = {}
    this._rows = []
    this._commonValues = {}
    this._filterChip = 'all'
    this._apiOptions = {}
    this._codeSelectMaps = {}
    this._running = false
    this._paused = false
    this._processed = 0
    this._total = 0
    this._fileName = ''
    this._loadingTemplate = false
    this._resumeResolve = null
    this._processStartTime = null
    this._pausedAt = null
    this._totalPausedMs = 0
    this._updateTimer = null

    if (!this.templateName && this.parent_id) {
      this.templateName = this.parent_id
    }
    if (this.templateName) {
      this._loadTemplate()
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._stopTimer()
  }

  render() {
    return this._phase === 'upload' ? this._renderUpload() : this._renderGrid()
  }

  /** ── 업로드 단계 렌더링 ── */
  _renderUpload() {
    return html`
      <div class="upload-phase">
        <div class="drop-zone"
          @dragover=${this._onDragOver}
          @dragleave=${this._onDragLeave}
          @drop=${this._onDrop}
          @click=${this._onClickZone}
        >
          <span class="dz-icon">📂</span>
          <div class="dz-main">엑셀 파일을 드래그하거나 클릭하여 선택하세요</div>
          <div class="dz-sub">.xlsx 파일만 지원합니다</div>
          ${this._fileName ? html`<div class="dz-file">선택된 파일: ${this._fileName}</div>` : ''}
          <input id="file-input" type="file" accept=".xlsx" style="display:none"
            @change=${this._onFileInput}>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${this._loadingTemplate
        ? html`<span style="font-size:13px;color:#999">템플릿 로딩 중...</span>`
        : html`
              <button class="btn btn-primary" ?disabled=${!this._fileName || this._loadingTemplate}
                @click=${this._onConfirmUpload}>다음 (데이터 확인)</button>
            `
      }
          <button class="btn btn-outline" @click=${this._onClose}>취소</button>
        </div>
        ${this._template?.guide_purpose ? html`
          <div style="font-size:12px;color:#666;text-align:center;max-width:480px;line-height:1.6">
            ${this._template.guide_purpose}
          </div>
        ` : ''}
        <div style="position:absolute;bottom:16px;left:16px">
          <button class="btn btn-outline"
            ?disabled=${!this._template?.template_attachment_id}
            title=${this._template?.template_attachment_id ? '템플릿 xlsx 파일 다운로드' : '등록된 템플릿 파일이 없습니다'}
            @click=${this._onDownloadTemplate}>템플릿 다운로드</button>
        </div>
      </div>
    `
  }

  /** ── 그리드 단계 렌더링 ── */
  _renderGrid() {
    const visibleRows = this._filteredRows()
    const counts = this._counts()
    const progress = this._total > 0 ? Math.round((this._processed / this._total) * 100) : 0
    const hasValidateUrl = !!(this._template?.validate_url)
    const hasErrors = counts.error > 0

    return html`
      <div class="grid-phase">
        <!-- 공통 파라미터 입력 -->
        ${this._params.length > 0 ? html`
          <div class="common-params">
            <span style="font-size:12px;font-weight:700;color:#555;white-space:nowrap">공통 파라미터:</span>
            ${this._params.map(p => this._renderParamField(p))}
          </div>
        ` : ''}

        <!-- 필터 칩 -->
        <div class="filter-bar">
          <button class="chip ${this._filterChip === 'all' ? 'active' : ''}" @click=${() => this._filterChip = 'all'}>
            전체 ${this._rows.length}
          </button>
          <button class="chip ${this._filterChip === 'pending' ? 'active' : ''}" @click=${() => this._filterChip = 'pending'}>
            대기 ${counts.pending}
          </button>
          <button class="chip ok ${this._filterChip === 'ok' ? 'active' : ''}" @click=${() => this._filterChip = 'ok'}>
            완료 ${counts.ok}
          </button>
          <button class="chip error ${this._filterChip === 'error' ? 'active' : ''}" @click=${() => this._filterChip = 'error'}>
            오류 ${counts.error}
          </button>
          ${counts.invalid > 0 ? html`
            <button class="chip invalid ${this._filterChip === 'invalid' ? 'active' : ''}" @click=${() => this._filterChip = 'invalid'}>
              검증오류 ${counts.invalid}
            </button>
          ` : ''}
        </div>

        <!-- 진행률 -->
        ${this._total > 0 ? html`
          <div class="progress-section">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width:${progress}%"></div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="progress-text">
                ${this._paused ? html`<span style="color:#E65100;font-weight:700">⏸ 일시정지</span> — ` : this._running ? html`<span class="spinner"></span>` : ''}
                ${this._processed} / ${this._total} 처리 완료 (${progress}%)
              </div>
              ${this._processStartTime ? html`<span class="elapsed-time">⏱ ${this._fmtElapsed()}</span>` : ''}
            </div>
          </div>
        ` : ''}

        <!-- 데이터 그리드 -->
        <div class="grid-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th style="width:80px">상태</th>
                ${(this._columns || []).filter(c => !c.grid_hidden).map(c => html`<th>${c.col_label || c.col_key}</th>`)}
                <th style="min-width:160px">처리 결과</th>
              </tr>
            </thead>
            <tbody>
              ${visibleRows.length === 0
        ? html`<tr><td colspan="99" style="text-align:center;padding:30px;color:#999">데이터가 없습니다.</td></tr>`
        : visibleRows.map((row, i) => this._renderRow(row, i + 1))
      }
            </tbody>
          </table>
        </div>

        <!-- 하단 버튼 -->
        <div class="popup-footer">
          <button class="btn btn-outline" ?disabled=${this._running}
            @click=${() => { this._phase = 'upload'; this._rows = []; this._fileName = '' }}>파일 재선택</button>
          ${hasValidateUrl ? html`
            <button class="btn btn-outline" ?disabled=${this._running}
              @click=${this._onValidate}>검증</button>
          ` : ''}
          ${hasErrors ? html`
            <button class="btn btn-warning" ?disabled=${this._running}
              @click=${() => this._startImport(true)}>오류 재처리</button>
          ` : ''}
          <div class="spacer"></div>
          ${this._running
        ? html`
              <button class="btn btn-pause ${this._paused ? 'resuming' : ''}" @click=${this._onPauseResume}>
                ${this._paused ? '▶ 재개' : '⏸ 일시정지'}
              </button>
            `
        : html`
              <button class="btn btn-primary" @click=${() => this._startImport(false)}>임포트</button>
            `
      }
          <button class="btn btn-outline" ?disabled=${this._running && !this._paused}
            @click=${this._onClose}>닫기</button>
        </div>
      </div>
    `
  }

  /** 공통 파라미터 입력 필드 렌더링 */
  _renderParamField(param) {
    const val = (this._commonValues || {})[param.col_key] || ''
    return html`
      <div class="param-field">
        <label>${param.col_label || param.col_key}${param.required ? html`<span class="req">*</span>` : ''}</label>
        ${this._renderParamInput(param, val)}
      </div>
    `
  }

  /** 파라미터 타입별 입력 위젯 렌더링 */
  _renderParamInput(param, val) {
    const onChange = e => {
      this._commonValues = { ...this._commonValues, [param.col_key]: e.target.value }
    }
    if (param.col_type === 'api_select') {
      const options = this._apiOptions?.[param.col_key] || []
      return html`
        <select @change=${onChange}>
          <option value="">-- 선택 --</option>
          ${options.map(o => html`<option value="${o.value}" ?selected=${val === o.value}>${o.label}</option>`)}
        </select>
      `
    }
    if (param.col_type === 'select' || param.col_type === 'key_value_select') {
      const options = this._buildParamOptions(param)
      return html`
        <select @change=${onChange}>
          <option value="">-- 선택 --</option>
          ${options.map(o => html`<option value="${o.value}" ?selected=${val === o.value}>${o.label}</option>`)}
        </select>
      `
    }
    if (param.col_type === 'boolean') {
      return html`
        <select @change=${onChange}>
          <option value="" ?selected=${!val}>-- 선택 --</option>
          <option value="TRUE" ?selected=${val === 'TRUE'}>TRUE</option>
          <option value="FALSE" ?selected=${val === 'FALSE'}>FALSE</option>
        </select>
      `
    }
    return html`<input type="text" .value=${val} placeholder="${param.default_value || ''}" @input=${onChange}>`
  }

  /** 파라미터 선택 옵션 빌드 */
  _buildParamOptions(param) {
    if (!param.select_source) return []
    return param.select_source.split(',').map(part => {
      part = part.trim()
      if (param.col_type === 'key_value_select') {
        const [v, l] = part.split(':', 2)
        return { value: v.trim(), label: l ? l.trim() : v.trim() }
      }
      return { value: part, label: part }
    })
  }

  /** 데이터 행 렌더링 */
  _renderRow(row, idx) {
    const status = row._createStatus
    const valid = row._valid
    let rowClass = ''
    if (status === 'OK') rowClass = 'status-ok'
    else if (status === 'ERROR') rowClass = 'status-error'
    else if (valid === false) rowClass = 'status-invalid'

    const badge = this._statusBadge(status, valid)
    const visibleCols = (this._columns || []).filter(c => !c.grid_hidden)

    return html`
      <tr class="${rowClass}">
        <td style="color:#999">${idx}</td>
        <td>${badge}</td>
        ${visibleCols.map(col => {
      const raw = row[col.col_key]
      let display = raw != null ? String(raw) : ''
      // date 타입: YYYY-MM-DD 포맷
      if (col.col_type === 'date' && raw != null) display = this._formatDate(raw)
      // boolean 타입: ✓/✗ 표시
      if (col.col_type === 'boolean' && raw != null) display = String(raw).toUpperCase() === 'TRUE' ? '✓' : '✗'
      // select 타입: value→label 변환
      const map = (this._selectMaps || {})[col.col_key]
      if (map && raw != null && map[raw] != null) display = `${map[raw]} (${raw})`
      return html`<td title="${display}">${display}</td>`
    })}
        <td>
          ${status === 'ERROR'
        ? html`<span class="err-msg" title="${row._errorMessage || ''}">❌ ${row._errorMessage || '오류'}</span>`
        : valid === false
          ? html`<span class="err-msg" title="${row._validMessage || ''}">⚠ ${row._validMessage || '검증 오류'}</span>`
          : status === 'OK'
            ? html`<span style="color:#2E7D32;font-size:12px">✓ 완료</span>`
            : html`<span style="color:#999;font-size:12px">대기</span>`
      }
        </td>
      </tr>
    `
  }

  /** Date/문자열 → YYYY-MM-DD 포맷 */
  _formatDate(val) {
    if (!val) return ''
    const d = val instanceof Date ? val : new Date(val)
    if (isNaN(d.getTime())) return String(val)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  /** 상태 배지 렌더링 */
  _statusBadge(status, valid) {
    if (status === 'OK') return html`<span class="status-badge badge-ok">완료</span>`
    if (status === 'ERROR') return html`<span class="status-badge badge-error">오류</span>`
    if (valid === false) return html`<span class="status-badge badge-invalid">검증오류</span>`
    return html`<span class="status-badge badge-pending">대기</span>`
  }

  /** 필터링된 행 목록 */
  _filteredRows() {
    const rows = this._rows || []
    switch (this._filterChip) {
      case 'pending': return rows.filter(r => !r._createStatus && r._valid !== false)
      case 'ok': return rows.filter(r => r._createStatus === 'OK')
      case 'error': return rows.filter(r => r._createStatus === 'ERROR')
      case 'invalid': return rows.filter(r => r._valid === false)
      default: return rows
    }
  }

  /** 행 상태 집계 */
  _counts() {
    const rows = this._rows || []
    return {
      pending: rows.filter(r => !r._createStatus && r._valid !== false).length,
      ok: rows.filter(r => r._createStatus === 'OK').length,
      error: rows.filter(r => r._createStatus === 'ERROR').length,
      invalid: rows.filter(r => r._valid === false).length
    }
  }

  /** 템플릿 설정 로드 */
  async _loadTemplate() {
    if (!this.templateName) return
    this._loadingTemplate = true
    try {
      // name으로 조회
      const result = await ServiceUtil.restGet(`excel_templates/show_by_name?name=${encodeURIComponent(this.templateName)}`)
      this._template = result

      if (result?.id) {
        const colResult = await ServiceUtil.restGet(
          `excel_template_columns?query=${encodeURIComponent(JSON.stringify([{ name: 'template_id', value: result.id, operator: 'eq' }]))}&limit=500&sort=${encodeURIComponent(JSON.stringify([{ field: 'col_role', ascending: true }, { field: 'col_order', ascending: true }]))}`
        )
        const allCols = colResult?.items || []
        this._columns = allCols.filter(c => c.col_role === 'column')
        this._params = allCols.filter(c => c.col_role === 'common_param')

        // 기본값 설정
        const defaults = {}
        this._params.forEach(p => { if (p.default_value) defaults[p.col_key] = p.default_value })

        // select/key_value_select 타입 중 옵션이 1개뿐이면 자동 선택
        this._params.forEach(p => {
          if (defaults[p.col_key]) return
          if ((p.col_type === 'select' || p.col_type === 'key_value_select') && p.select_source) {
            const options = this._buildParamOptions(p)
            if (options.length === 1) defaults[p.col_key] = options[0].value
          }
        })
        this._commonValues = defaults

        // _selectMaps 빌드
        this._selectMaps = this._buildSelectMaps(this._columns)

        // code_select 역변환 맵 비동기 로드 (select_label_key가 설정된 컬럼)
        this._fetchCodeSelectMaps(this._columns)

        // api_select 파라미터 옵션 비동기 로드
        this._fetchApiSelectOptions(this._params)
      }
    } catch (e) {
      console.error('템플릿 로드 실패:', e)
      UiUtil.showToast('error', `템플릿 "${this.templateName}" 로드에 실패했습니다.`)
    } finally {
      this._loadingTemplate = false
    }
  }

  /**
   * api_select 파라미터의 옵션 목록을 select_source URL에서 로드해 _apiOptions에 캐싱.
   * col_key 규칙: *_cd → 값 필드, *_nm → 레이블 필드.
   */
  async _fetchApiSelectOptions(params) {
    const targets = (params || []).filter(p => p.col_type === 'api_select' && p.select_source)
    if (!targets.length) return
    const opts = { ...this._apiOptions }
    await Promise.all(targets.map(async p => {
      try {
        const res = await ServiceUtil.restGet(p.select_source)
        const items = Array.isArray(res) ? res : (res?.items || [])
        const valueField = p.select_value_key || p.col_key
        const labelField = p.select_label_key || p.col_key.replace(/_cd$/, '_nm')
        opts[p.col_key] = items
          .map(item => ({
            value: item[valueField] ?? '',
            label: item[labelField] || item[valueField] || ''
          }))
          .filter(o => o.value !== '')

        // 옵션이 1개뿐이고 아직 값이 없으면 자동 선택
        if (opts[p.col_key].length === 1 && !this._commonValues[p.col_key]) {
          this._commonValues = { ...this._commonValues, [p.col_key]: opts[p.col_key][0].value }
        }
      } catch (e) {
        console.warn(`api_select 옵션 로드 실패 (${p.col_key}):`, e)
        opts[p.col_key] = []
      }
    }))
    this._apiOptions = opts
  }

  /**
   * select/key_value_select 타입의 역방향 매핑 빌드.
   * { col_key: { label: value } } 구조.
   */
  _buildSelectMaps(columns) {
    const maps = {}
      ; (columns || []).forEach(col => {
        if (!col.select_source) return
        if (col.col_type === 'select' || col.col_type === 'key_value_select') {
          const map = {}
          col.select_source.split(',').forEach(part => {
            part = part.trim()
            if (col.col_type === 'key_value_select') {
              const [v, l] = part.split(':', 2)
              map[v.trim()] = l ? l.trim() : v.trim()
            } else {
              map[part] = part
            }
          })
          maps[col.col_key] = map
        }
      })
    return maps
  }

  /**
   * code_select 컬럼 중 select_label_key가 설정된 것의 역변환 맵을 사전 로드.
   * { col_key: { labelValue → codeValue } } 구조로 _codeSelectMaps에 저장.
   * 임포트 시 엑셀 셀의 label값(description)을 code값(name)으로 치환하는 데 사용.
   */
  async _fetchCodeSelectMaps(columns) {
    const targets = (columns || []).filter(
      c => c.col_type === 'code_select' && c.select_label_key && c.select_source
    )
    if (!targets.length) return

    const maps = { ...this._codeSelectMaps }
    await Promise.all(targets.map(async col => {
      try {
        const codeQuery = encodeURIComponent(JSON.stringify([{ name: 'name', value: col.select_source, operator: 'eq' }]))
        const codeResult = await ServiceUtil.restGet(`common_codes?query=${codeQuery}&limit=1`)
        const codeGroup = codeResult?.items?.[0]
        if (!codeGroup) return

        const detailQuery = encodeURIComponent(JSON.stringify([{ name: 'parent_id', value: codeGroup.id, operator: 'eq' }]))
        const detailSort = encodeURIComponent(JSON.stringify([{ field: 'rank', ascending: true }]))
        const detailResult = await ServiceUtil.restGet(`common_code_details?query=${detailQuery}&sort=${detailSort}&limit=500`)
        const details = detailResult?.items || []

        const labelKey = col.select_label_key           // 엑셀에 표시된 필드 (예: description)
        const valueKey = col.select_value_key || 'name' // 임포트 시 실제 전송할 필드 (예: name)
        const map = {}
        details.forEach(d => {
          const label = d[labelKey]
          const value = d[valueKey]
          if (label != null && label !== '' && value != null) map[String(label)] = value
        })
        maps[col.col_key] = map
      } catch (e) {
        console.warn(`code_select 역변환 맵 로드 실패 (${col.col_key}):`, e)
        maps[col.col_key] = {}
      }
    }))
    this._codeSelectMaps = maps
  }

  /* ── 파일 선택 / 드래그앤드롭 ── */

  _onDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add('dragover')
  }
  _onDragLeave(e) {
    e.currentTarget.classList.remove('dragover')
  }
  _onDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('dragover')
    const file = e.dataTransfer?.files?.[0]
    if (file) this._selectFile(file)
  }
  _onClickZone() {
    this.shadowRoot.getElementById('file-input')?.click()
  }
  _onFileInput(e) {
    const file = e.target.files?.[0]
    if (file) this._selectFile(file)
  }

  _selectFile(file) {
    if (!file.name.endsWith('.xlsx')) {
      UiUtil.showToast('warning', '.xlsx 파일만 지원합니다.')
      return
    }
    this._fileName = file.name
    this._pendingFile = file
    this.requestUpdate()
  }

  /** 파일 확인 → IMPORT 액션으로 파싱 → 그리드 단계로 전환 */
  async _onConfirmUpload() {
    if (!this._pendingFile) return
    if (!this._template) {
      UiUtil.showToast('warning', '템플릿이 아직 로드되지 않았습니다. 잠시 후 다시 시도하세요.')
      return
    }
    try {
      const parsed = await this._parseExcelFile(this._pendingFile)
      if (!parsed || parsed.length === 0) {
        UiUtil.showToast('warning', '파싱된 데이터가 없습니다. 파일을 확인하세요.')
        return
      }
      this._rows = parsed.map(row => ({
        ...row,
        _createStatus: null,
        _valid: undefined,
        _errorMessage: null,
        _validMessage: null
      }))
      this._total = 0
      this._processed = 0
      this._phase = 'grid'
    } catch (e) {
      console.error('엑셀 파싱 실패:', e)
      UiUtil.showToast('error', `파일 파싱에 실패했습니다: ${e.message || ''}`)
    }
  }

  /**
   * IMPORT redux 액션으로 xlsx 파싱.
   * excelToObj()는 헤더 셀 값(소문자)을 키로 반환하므로
   * col_label → col_key 역매핑 후 resolve한다.
   */
  _parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop().toLowerCase()
      const reader = new FileReader()
      reader.onload = e => {
        store.dispatch({
          type: IMPORT,
          importable: {
            extension: ext,
            handler: records => {
              const rows = Array.isArray(records) ? records : (records?.data || records?.items || [])
              // 파싱 키(한글 레이블 소문자 또는 col_key) → col_key 로 정규화
              const labelToKey = {}
                ; (this._columns || []).forEach(c => {
                  if (c.col_label) labelToKey[c.col_label.toLowerCase()] = c.col_key
                  if (c.col_key) labelToKey[c.col_key.toLowerCase()] = c.col_key
                })
              const colKeys = new Set((this._columns || []).map(c => c.col_key).filter(Boolean))
              const normalized = rows
                .map(row => {
                  const obj = {}
                  Object.entries(row).forEach(([k, v]) => {
                    const key = labelToKey[k.toLowerCase()] || k
                    obj[key] = v
                  })
                  return obj
                })
                .filter(row => {
                  // col_key 컬럼 중 하나라도 값이 있으면 유효한 행
                  return [...colKeys].some(k => {
                    const v = row[k]
                    return v !== null && v !== undefined && String(v).trim() !== ''
                  })
                })
              resolve(normalized)
            }
          },
          data: e.target.result
        })
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  /* ── 검증 ── */

  /** validate_url 호출 — rows + _commonValues 전송 */
  async _onValidate() {
    const url = this._template?.validate_url
    if (!url) return
    const rows = this._rows.filter(r => !r._createStatus)
    if (rows.length === 0) { UiUtil.showToast('warning', '검증할 데이터가 없습니다.'); return }

    try {
      const body = { rows, _commonValues: this._commonValues }
      const result = await ServiceUtil.restPost(url, body)
      // result 예: [{ row_index, valid, message }, ...] 또는 rows 그대로 반환
      if (Array.isArray(result)) {
        result.forEach(r => {
          const idx = r.row_index != null ? r.row_index : null
          const target = idx != null ? this._rows[idx] : null
          if (target) {
            target._valid = r.valid !== false
            target._validMessage = r.message || null
          }
        })
      }
      this.requestUpdate()
      UiUtil.showToast('success', '검증 완료')
    } catch (e) {
      console.error('검증 실패:', e)
      UiUtil.showToast('error', `검증에 실패했습니다: ${e.message || ''}`)
    }
  }

  /* ── 임포트 ── */

  /**
   * 임포트 루프 시작.
   * @param {boolean} includeErrors - true: 오류 행도 재처리
   */
  async _startImport(includeErrors) {
    const baseUrl = this._template?.import_url
    if (!baseUrl) { UiUtil.showToast('error', '임포트 URL이 설정되지 않았습니다.'); return }
    const url = this._template?.id ? `${baseUrl}?template_id=${encodeURIComponent(this._template.id)}` : baseUrl

    // 필수 공통 파라미터 검증
    const missingParams = (this._params || []).filter(p => {
      if (!p.required) return false
      const val = (this._commonValues || {})[p.col_key]
      return val === undefined || val === null || String(val).trim() === ''
    })
    if (missingParams.length > 0) {
      const names = missingParams.map(p => p.col_label || p.col_key).join(', ')
      UiUtil.showToast('warning', `필수 공통 파라미터를 입력하세요: ${names}`)
      return
    }

    // 처리 대상 행 결정
    const targets = this._rows.filter(r => {
      if (r._createStatus === 'OK') return false
      if (!includeErrors && r._createStatus === 'ERROR') return false
      // 기본 임포트: _valid=false 행 제외
      if (!includeErrors && r._valid === false) return false
      return true
    })

    if (targets.length === 0) {
      UiUtil.showToast('warning', '처리할 데이터가 없습니다.')
      return
    }

    this._running = true
    this._paused = false
    this._total = targets.length
    this._processed = 0
    this._filterChip = 'all'
    this._processStartTime = Date.now()
    this._pausedAt = null
    this._totalPausedMs = 0
    this._resumeResolve = null
    this._startTimer()

    for (const row of targets) {
      // 일시정지 대기 — Promise 기반 (polling 없음)
      if (this._paused) {
        await new Promise(resolve => { this._resumeResolve = resolve })
      }
      if (!this._running) break

      // import_skip 제외, import_url로 전송할 바디 구성
      const body = this._buildImportBody(row)
      // import 서비스 호출
      await ServiceUtil.restPost(url, body, null, null, (res) => {
        if (res && typeof res === 'object') Object.assign(row, res)
        row._createStatus = 'OK'
        row._errorMessage = null
      }, (err) => {
        row._createStatus = 'ERROR'
        row._errorMessage = err?.msg || this._extractErrorMessage(err)
      })

      this._processed++
    }

    this._stopTimer()
    this._running = false
    this._paused = false
    this._resumeResolve = null
    this.requestUpdate()

    const counts = this._counts()
    const elapsed = this._fmtElapsed()
    UiUtil.showToast(
      counts.error > 0 ? 'warning' : 'success',
      `임포트 완료: 성공 ${counts.ok}건, 오류 ${counts.error}건 (소요시간 ${elapsed})`
    )

    if (this.onComplete) this.onComplete(this._rows)
  }

  /** 임포트 바디 구성 — import_skip 컬럼 제외, 공통 파라미터 병합 */
  _buildImportBody(row) {
    const body = { ...this._commonValues }
    const columns = this._columns || []

    // 원본 셀값 스냅샷 — import_ref_col이 역변환 전 값을 참조하기 위해 먼저 캡처
    const originalValues = {}
    columns.forEach(col => { originalValues[col.col_key] = row[col.col_key] })

    columns.forEach(col => {
      if (col.import_skip) return

      // import_ref_col: 참조 컬럼의 원본 셀값(역변환 전)을 이 컬럼 값으로 사용
      if (col.import_ref_col) {
        const refVal = originalValues[col.import_ref_col]
        if (refVal != null && refVal !== '') body[col.col_key] = refVal
        return
      }

      let val = row[col.col_key]
      if (val == null || val === '') return

      if (col.col_type === 'date') {
        val = this._formatDate(val)
      } else if (col.col_type === 'boolean') {
        val = String(val).toUpperCase() === 'TRUE'
      } else if (col.col_type === 'code_select' && col.select_label_key) {
        // select_label_key 설정 시: 엑셀 셀의 label값을 code값으로 역변환
        const codeMap = (this._codeSelectMaps || {})[col.col_key] || {}
        val = codeMap[String(val)] ?? val
      }

      body[col.col_key] = val
    })

    return body
  }

  /** 에러 메시지 추출 */
  _extractErrorMessage(e) {
    if (!e) return '알 수 없는 오류'
    try {
      if (typeof e === 'string') return e
      if (e.message) return e.message
      const text = JSON.stringify(e)
      return text.length > 100 ? text.substring(0, 100) + '...' : text
    } catch (_) {
      return '알 수 없는 오류'
    }
  }

  _onPauseResume() {
    if (!this._running) return
    this._paused = !this._paused
    if (this._paused) {
      this._pausedAt = Date.now()
    } else {
      if (this._pausedAt) {
        this._totalPausedMs += Date.now() - this._pausedAt
        this._pausedAt = null
      }
      if (this._resumeResolve) {
        this._resumeResolve()
        this._resumeResolve = null
      }
    }
  }

  _startTimer() {
    if (this._updateTimer) return
    this._updateTimer = setInterval(() => { this.requestUpdate() }, 300)
  }

  _stopTimer() {
    if (!this._updateTimer) return
    clearInterval(this._updateTimer)
    this._updateTimer = null
  }

  _fmtElapsed() {
    if (!this._processStartTime) return '00:00'
    const curPaused = this._pausedAt ? (Date.now() - this._pausedAt) : 0
    const sec = Math.floor((Date.now() - this._processStartTime - this._totalPausedMs - curPaused) / 1000)
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const p = n => String(n).padStart(2, '0')
    return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
  }

  /** 템플릿 xlsx 다운로드 — template_attachment_id 기반 */
  _onDownloadTemplate() {
    const attachId = this._template?.template_attachment_id
    if (!attachId) {
      UiUtil.showToast('warning', '등록된 템플릿 파일이 없습니다.')
      return
    }
    const a = document.createElement('a')
    a.href = `/rest/attachments/${attachId}/download`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  _onClose() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('dynamic-excel-import-popup', DynamicExcelImportPopup)
