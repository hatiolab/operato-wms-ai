import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil } from '../utils/service-util'
import { UiUtil } from '../utils/ui-util'
import '../components/popup/ox-storage-upload-popup.js'

/**
 * 엑셀 임포트 템플릿 상세/편집 팝업.
 * - 기본 정보 (name, import_url, validate_url, guide_* 필드) 편집
 * - 컬럼 목록 (col_role=column / common_param 탭 분리)
 * - xlsx 다운로드 버튼
 * 신규 생성 시 templateId=null로 호출.
 */
class ExcelTemplateDetail extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          background: var(--md-sys-color-surface, #fff);
          overflow: hidden;
          width: 100%;  /* 팝업 래퍼 너비에 맞춤 */
          height: 100%; /* 팝업 래퍼 높이에 맞춤 */
        }

        /* ── 메인 탭 바 ── */
        .main-tab-bar {
          display: flex;
          flex-shrink: 0;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface-container, #f7f7f7);
          padding: 0 20px;
        }
        .main-tab {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: transparent;
          border: none;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: -2px;
          border-bottom: 3px solid transparent;
          white-space: nowrap;
        }
        .main-tab.active {
          color: var(--md-sys-color-primary, #1976D2);
          border-bottom: 3px solid var(--md-sys-color-primary, #1976D2);
        }
        .main-tab:hover:not(.active) {
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface-variant, #eee);
        }

        /* ── 탭 패널 ── */
        .tab-panel {
          display: none;
          flex: 1;         /* 호스트 남은 높이를 채움 (col-panel용) */
          overflow: hidden;
          flex-direction: column;
        }
        .tab-panel.active { display: flex; }

        /* 기본 정보 탭 패널: 내용 크기에 맞게 유지 (flex: 1 재정의) */
        .info-panel {
          flex: none;      /* 늘어나지 않고 내용 높이만큼만 */
          overflow-y: auto;
          padding: 20px;
          gap: 20px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
          margin-bottom: 10px;
          padding-bottom: 4px;
          border-bottom: 2px solid var(--md-sys-color-primary, #1976D2);
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 24px;
          margin-bottom: 20px;
        }
        .field { display: flex; flex-direction: column; gap: 4px; }
        .field label {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #555);
        }
        .field label .req { color: #e53935; margin-left: 2px; }
        .field input, .field textarea, .field select {
          padding: 7px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface, #fff);
          transition: border-color .15s;
        }
        .field input:focus, .field textarea:focus, .field select:focus {
          outline: none;
          border-color: var(--md-sys-color-primary, #1976D2);
        }
        .field textarea { resize: vertical; min-height: 80px; }

        /* 컬럼 탭 패널: .tab-panel의 flex: 1 + overflow: hidden 상속 */
        .col-panel {
          /* tab-panel에서 flex: 1 과 overflow: hidden 상속 — 별도 재정의 불필요 */
        }

        /* 컬럼 서브 탭 (데이터 컬럼 / 공통 파라미터) */
        .sub-tab-bar {
          display: flex;
          flex-shrink: 0;
          gap: 2px;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          padding: 0 16px;
          background: var(--md-sys-color-surface, #fff);
        }
        .sub-tab {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 6px 6px 0 0;
          color: var(--md-sys-color-on-surface-variant, #666);
          background: transparent;
          border: none;
          margin-bottom: -2px;
          border-bottom: 2px solid transparent;
        }
        .sub-tab.active {
          color: var(--md-sys-color-primary, #1976D2);
          border-bottom: 2px solid var(--md-sys-color-primary, #1976D2);
        }

        .col-toolbar {
          display: flex;
          flex-shrink: 0;
          gap: 8px;
          padding: 8px 16px;
          background: var(--md-sys-color-surface-container, #f9f9f9);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e8e8e8);
        }
        .grid-wrap {
          flex: 1;     /* col-panel(flex:1, height 확정)의 남은 공간을 채워 그리드 스크롤 */
          overflow: auto;
        }

        /* 버튼 */
        .btn {
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-sm { padding: 5px 10px; font-size: 11px; }
        .btn-primary { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .btn-primary:hover { background: #1565C0; }
        .btn-secondary { background: #546E7A; color: #fff; }
        .btn-secondary:hover { background: #455A64; }
        .btn-danger { background: #C62828; color: #fff; }
        .btn-danger:hover { background: #B71C1C; }
        .btn-outline {
          background: transparent;
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }
        .btn-outline:hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .btn:disabled { opacity: .5; cursor: not-allowed; }

        /* 그리드 테이블 — min-width로 가로 스크롤 보장 */
        table { min-width: 820px; width: 100%; border-collapse: collapse; font-size: 12px; }
        th {
          position: sticky;
          top: 0;
          z-index: 1;
          padding: 7px 8px;
          text-align: left;
          font-weight: 700;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          color: var(--md-sys-color-on-surface-variant, #555);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #ddd);
          white-space: nowrap;
        }
        td {
          padding: 6px 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          vertical-align: middle;
        }
        td input, td select {
          width: 100%;
          padding: 4px 6px;
          border: 1px solid var(--md-sys-color-outline-variant, #ddd);
          border-radius: 4px;
          font-size: 12px;
          background: var(--md-sys-color-surface, #fff);
        }
        td input:focus, td select:focus {
          outline: none;
          border-color: var(--md-sys-color-primary, #1976D2);
        }
        td input[type="checkbox"] { width: auto; }
        td input[type="number"] { width: 70px; }
        .empty-msg { padding: 24px; text-align: center; color: #999; font-size: 13px; }

        /* 푸터 */
        .popup-footer {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface-container, #f9f9f9);
          margin-top: auto; /* 기본 정보 탭에서 내용이 compact할 때 하단 고정 */
        }
        .spacer { flex: 1; }

        .modified { background: #FFF9C4 !important; }
        .new-row { background: #E8F5E9 !important; }

        /* 상세 확장 행 */
        .detail-row td {
          background: var(--md-sys-color-surface-container-low, #f3f6ff);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #dde3f8);
        }
        .detail-row label {
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #555);
          display: block;
          margin-bottom: 3px;
        }
        .detail-row input {
          width: 100%;
          padding: 4px 6px;
          border: 1px solid var(--md-sys-color-outline-variant, #ddd);
          border-radius: 4px;
          font-size: 12px;
          background: var(--md-sys-color-surface, #fff);
          box-sizing: border-box;
        }
        .btn-expand {
          padding: 2px 6px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #666);
          line-height: 1.4;
        }
        .btn-expand:hover { background: var(--md-sys-color-surface-variant, #eee); }
        .btn-expand.expanded {
          background: var(--md-sys-color-primary-container, #dde3f8);
          border-color: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-primary, #1976D2);
        }
      `
    ]
  }

  static get properties() {
    return {
      templateId: String,
      onSaved: Object,
      _template: Object,
      _columns: Array,
      _mainTab: String,  // 'info' | 'columns'
      _colRole: String,  // 'column' | 'common_param'
      _loading: Boolean,
      _saving: Boolean,
      _uploadOpen: Boolean,
      _expandedRows: Object
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this._template = {}
    this._columns = []
    this._mainTab = 'info'
    this._colRole = 'column'
    this._loading = false
    this._saving = false
    this._uploadOpen = false
    this._expandedRows = new Set()
    if (this.templateId) {
      this._fetchTemplate()
    } else {
      this._addColumn()
    }
  }

  render() {
    const t = this._template || {}
    const isNew = !this.templateId
    const tabCols = (this._columns || [])
      .filter(c => c.col_role === this._colRole && !c._deleted)
      .sort((a, b) => (a.col_order || 0) - (b.col_order || 0))

    return html`
      <!-- 메인 탭 바 -->
      <div class="main-tab-bar">
        <button class="main-tab ${this._mainTab === 'info' ? 'active' : ''}"
          @click=${() => this._mainTab = 'info'}>
          기본 정보
        </button>
        <button class="main-tab ${this._mainTab === 'columns' ? 'active' : ''}"
          @click=${() => this._mainTab = 'columns'}>
          컬럼 설정 (${this._countByRole('column') + this._countByRole('common_param')}개)
        </button>
      </div>

      <!-- 기본 정보 탭 패널 -->
      <div class="tab-panel info-panel ${this._mainTab === 'info' ? 'active' : ''}">
        <div>
          <div class="section-title">기본 정보</div>
          <div class="form-grid">
            ${this._renderField('name', '템플릿명', t.name, true)}
            ${this._renderField('description', '설명', t.description)}
            ${this._renderField('import_url', '임포트 URL', t.import_url, true, 'text',
      '예: outbound/shipment_orders/import_by_excel')}
            ${this._renderField('validate_url', '검증 URL', t.validate_url, false, 'text',
        '예: outbound/shipment_orders/validate_import (없으면 검증 생략)')}
            <div class="field" style="flex-direction:row;align-items:center;gap:8px;padding-top:4px">
              <input type="checkbox" id="confirm_flag_chk"
                .checked=${!!t.confirm_flag}
                @change=${e => this._onFieldChange('confirm_flag', e.target.checked)}>
              <label for="confirm_flag_chk" style="cursor:pointer">확정 여부 (확정된 템플릿만 임포트 화면에서 사용 가능)</label>
            </div>
          </div>
        </div>
        <div>
          <div class="section-title">작성 가이드 (xlsx 두 번째 시트에 삽입)</div>
          <div class="form-grid">
            ${this._renderField('guide_screen_path', '사용 화면 경로', t.guide_screen_path, false, 'text',
          '예: /outbound/shipment-order-import')}
            <div></div>
            ${this._renderTextarea('guide_purpose', '사용 목적', t.guide_purpose)}
            ${this._renderTextarea('guide_warnings', '주의사항 (줄바꿈으로 구분)', t.guide_warnings)}
          </div>
        </div>
      </div>

      <!-- 컬럼 설정 탭 패널 -->
      <div class="tab-panel col-panel ${this._mainTab === 'columns' ? 'active' : ''}">
        <!-- 서브 탭 (데이터 컬럼 / 공통 파라미터) -->
        <div class="sub-tab-bar">
          <button class="sub-tab ${this._colRole === 'column' ? 'active' : ''}"
            @click=${() => this._colRole = 'column'}>
            데이터 컬럼 (${this._countByRole('column')}개)
          </button>
          <button class="sub-tab ${this._colRole === 'common_param' ? 'active' : ''}"
            @click=${() => this._colRole = 'common_param'}>
            공통 파라미터 (${this._countByRole('common_param')}개)
          </button>
        </div>

        <!-- 컬럼 조작 툴바 -->
        <div class="col-toolbar">
          <button class="btn btn-primary btn-sm" @click=${this._addColumn}>+ 행 추가</button>
          <button class="btn btn-danger btn-sm" @click=${this._deleteChecked}>선택 삭제</button>
          <button class="btn btn-secondary btn-sm" @click=${this._moveUp}>위로</button>
          <button class="btn btn-secondary btn-sm" @click=${this._moveDown}>아래로</button>
          <button class="btn btn-secondary btn-sm" @click=${this._reorderAll}>순서 정렬</button>
        </div>

        <!-- 컬럼 그리드 -->
        <div class="grid-wrap">
          ${tabCols.length === 0
        ? html`<div class="empty-msg">컬럼이 없습니다. [+ 행 추가]로 추가하세요.</div>`
        : html`
              <table>
                <thead>
                  <tr>
                    <th style="width:24px"><input type="checkbox" @change=${this._onCheckAll}></th>
                    <th style="width:50px">순서</th>
                    <th style="width:110px">시스템 키</th>
                    <th style="width:160px">표시명</th>
                    <th style="width:110px">타입</th>
                    <th style="width:55px">너비</th>
                    <th style="width:40px">필수</th>
                    ${this._colRole === 'column' ? html`
                      <th style="width:40px">숨김</th>
                      <th style="width:60px">임포트제외</th>
                      <th style="width:70px">템플릿제외</th>
                    ` : ''}
                    <th style="width:130px">기본값</th>
                    <th style="width:36px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${tabCols.map((col, i) => this._renderColRow(col, i))}
                </tbody>
              </table>
            `
      }
        </div>
      </div>

      <!-- 푸터 -->
      <div class="popup-footer">
        ${!isNew ? html`
          <button class="btn btn-outline"
            ?disabled=${!t.confirm_flag}
            title=${!t.confirm_flag ? '확정되지 않은 템플릿입니다' : '템플릿 xlsx 파일 다운로드'}
            @click=${this._onDownloadXlsx}>템플릿 다운로드</button>
          <button class="btn btn-outline"
            ?disabled=${!t.confirm_flag}
            title=${!t.confirm_flag ? '확정되지 않은 템플릿입니다' : '템플릿 xlsx 파일을 업로드합니다'}
            @click=${this._onUploadTemplate}>템플릿 업로드</button>
          <ox-storage-upload-popup
            ?open=${this._uploadOpen}
            @upload-complete=${this._onUploadComplete}
            @close=${() => { this._uploadOpen = false }}
          ></ox-storage-upload-popup>
        ` : ''}
        <div class="spacer"></div>
        <button class="btn btn-primary" ?disabled=${this._saving}
          @click=${this._onSave}>${this._saving ? '저장 중...' : '저장'}</button>
        <button class="btn btn-outline" @click=${this._onClose}>취소</button>
      </div>
    `
  }

  /** 인풋 필드 렌더링 */
  _renderField(key, label, value, required = false, type = 'text', placeholder = '') {
    return html`
      <div class="field">
        <label>${label}${required ? html`<span class="req">*</span>` : ''}</label>
        <input type="${type}" .value=${value || ''} placeholder="${placeholder}"
          @input=${e => this._onFieldChange(key, e.target.value)}>
      </div>
    `
  }

  /** textarea 필드 렌더링 */
  _renderTextarea(key, label, value) {
    return html`
      <div class="field">
        <label>${label}</label>
        <textarea .value=${value || ''}
          @input=${e => this._onFieldChange(key, e.target.value)}></textarea>
      </div>
    `
  }

  /** 컬럼 행 렌더링 — 메인 행 + 조건부 확장 상세 행 */
  _renderColRow(col, i) {
    const isColumn = this._colRole === 'column'
    const expanded = this._expandedRows.has(col)
    const colCount = isColumn ? 12 : 9
    return html`
      <tr class="${col._new ? 'new-row' : col._modified ? 'modified' : ''}">
        <td><input type="checkbox" .checked=${col._checked || false}
          @change=${e => this._onColCheck(col, e.target.checked)}></td>
        <td><input type="number" .value=${col.col_order ?? i + 1} style="width:46px"
          @change=${e => this._onColChange(col, 'col_order', parseInt(e.target.value))}></td>
        <td><input .value=${col.col_key || ''} placeholder="예: shipment_no"
          @input=${e => this._onColChange(col, 'col_key', e.target.value)}></td>
        <td><input .value=${col.col_label || ''} placeholder="예: 출고번호"
          @input=${e => this._onColChange(col, 'col_label', e.target.value)}></td>
        <td>
          <select @change=${e => this._onColChange(col, 'col_type', e.target.value)}>
            ${['text', 'number', 'date', 'boolean', 'select', 'key_value_select', 'api_select', 'code_select'].map(ct => html`
              <option value="${ct}" ?selected=${col.col_type === ct}>${ct}</option>
            `)}
          </select>
        </td>
        <td><input type="number" .value=${col.col_width || 18} style="width:50px"
          @change=${e => this._onColChange(col, 'col_width', parseInt(e.target.value))}></td>
        <td style="text-align:center">
          <input type="checkbox" .checked=${col.required || false}
            @change=${e => this._onColChange(col, 'required', e.target.checked)}>
        </td>
        ${isColumn ? html`
          <td style="text-align:center">
            <input type="checkbox" .checked=${col.grid_hidden || false}
              @change=${e => this._onColChange(col, 'grid_hidden', e.target.checked)}>
          </td>
          <td style="text-align:center">
            <input type="checkbox" .checked=${col.import_skip || false}
              @change=${e => this._onColChange(col, 'import_skip', e.target.checked)}>
          </td>
          <td style="text-align:center">
            <input type="checkbox" .checked=${col.template_skip || false}
              @change=${e => this._onColChange(col, 'template_skip', e.target.checked)}>
          </td>
        ` : ''}
        <td><input .value=${col.default_value || ''} placeholder="기본값"
          @input=${e => this._onColChange(col, 'default_value', e.target.value)}></td>
        <td style="text-align:center">
          <button class="btn-expand ${expanded ? 'expanded' : ''}"
            title="선택 소스·설명 ${expanded ? '접기' : '펼치기'}"
            @click=${() => this._toggleExpand(col)}>${expanded ? '▼' : '▶'}</button>
        </td>
      </tr>
      ${expanded ? html`
        <tr class="detail-row">
          <td colspan="${colCount}" style="padding:8px 20px 10px">
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 2fr;gap:8px;align-items:end">
              <div>
                <label>선택 소스</label>
                <input .value=${col.select_source || ''}
                  placeholder="쉼표 구분 값, 키:값 쌍, REST URL, 공통코드명 등"
                  @input=${e => this._onColChange(col, 'select_source', e.target.value)}>
              </div>
              <div>
                <label>값 키</label>
                <input .value=${col.select_value_key || ''}
                  placeholder="예: name"
                  @input=${e => this._onColChange(col, 'select_value_key', e.target.value)}>
              </div>
              <div>
                <label>표시 키</label>
                <input .value=${col.select_label_key || ''}
                  placeholder="예: description"
                  @input=${e => this._onColChange(col, 'select_label_key', e.target.value)}>
              </div>
              <div>
                <label>참조 컬럼</label>
                <input .value=${col.import_ref_col || ''}
                  placeholder="예: reason_cd"
                  title="임포트 시 해당 컬럼의 원본 셀값(역변환 전)을 이 컬럼 값으로 사용"
                  @input=${e => this._onColChange(col, 'import_ref_col', e.target.value)}>
              </div>
              <div>
                <label>컬럼 설명</label>
                <input .value=${col.col_desc || ''}
                  placeholder="작성 가이드에 표시될 컬럼 설명"
                  @input=${e => this._onColChange(col, 'col_desc', e.target.value)}>
              </div>
            </div>
          </td>
        </tr>
      ` : ''}
    `
  }

  /** 템플릿 조회 */
  async _fetchTemplate() {
    this._loading = true
    try {
      const [tmpl, colResult] = await Promise.all([
        ServiceUtil.restGet(`excel_templates/${this.templateId}`),
        ServiceUtil.restGet(`excel_template_columns?query=${encodeURIComponent(JSON.stringify([{ name: 'template_id', operator: 'eq', value: this.templateId }]))}&limit=500&sort=${encodeURIComponent(JSON.stringify([{ field: 'col_role', ascending: true }, { field: 'col_order', ascending: true }]))}`)
      ])
      this._template = tmpl || {}
      this._columns = (colResult?.items || []).map(c => ({ ...c }))
      if (!this._columns.some(c => c.col_role === 'column')) {
        this._addColumn()
      }
    } catch (e) {
      console.error('템플릿 조회 실패:', e)
      UiUtil.showToast('error', '템플릿 조회에 실패했습니다.')
    } finally {
      this._loading = false
    }
  }

  /** 기본 정보 필드 변경 */
  _onFieldChange(key, value) {
    this._template = { ...this._template, [key]: value }
  }

  /** 컬럼 필드 변경 */
  _onColChange(col, key, value) {
    col[key] = value
    col._modified = true
    this.requestUpdate()
  }

  /** 행 체크박스 */
  _onColCheck(col, checked) {
    col._checked = checked
    this.requestUpdate()
  }

  _onCheckAll(e) {
    const visible = (this._columns || []).filter(c => c.col_role === this._colRole && !c._deleted)
    visible.forEach(c => { c._checked = e.target.checked })
    this.requestUpdate()
  }

  /** 컬럼 추가 */
  _addColumn() {
    const role = this._colRole
    const sameRole = (this._columns || []).filter(c => c.col_role === role && !c._deleted)
    const maxOrder = sameRole.reduce((m, c) => Math.max(m, c.col_order || 0), 0)
    const newCol = {
      _new: true,
      col_role: role,
      col_order: (Math.floor(maxOrder / 10) + 1) * 10,
      col_key: '',
      col_label: '',
      col_type: 'text',
      col_width: 18,
      required: false,
      grid_hidden: false,
      import_skip: false
    }
    this._columns = [...(this._columns || []), newCol]
  }

  /** 선택 행 삭제 표시 */
  _deleteChecked() {
    const checked = (this._columns || []).filter(c => c._checked && c.col_role === this._colRole)
    if (checked.length === 0) { UiUtil.showToast('warning', '삭제할 행을 선택하세요.'); return }
    checked.forEach(c => {
      if (c._new) {
        this._columns = this._columns.filter(x => x !== c)
      } else {
        c._deleted = true
        c._checked = false
      }
    })
    this.requestUpdate()
  }

  /** col_order 기준으로 정렬된 현재 탭 컬럼 목록 반환 */
  _visibleSorted() {
    return (this._columns || [])
      .filter(c => c.col_role === this._colRole && !c._deleted)
      .sort((a, b) => (a.col_order || 0) - (b.col_order || 0))
  }

  /** 위로 이동 */
  _moveUp() {
    const visible = this._visibleSorted()
    const checked = visible.filter(c => c._checked)
    if (checked.length !== 1) { UiUtil.showToast('warning', '이동할 행을 1개 선택하세요.'); return }
    const col = checked[0]
    const idx = visible.indexOf(col)
    if (idx === 0) return
    const prev = visible[idx - 1]
    const tmpOrder = col.col_order
    col.col_order = prev.col_order
    prev.col_order = tmpOrder
    col._modified = true
    prev._modified = true
    this.requestUpdate()
  }

  /** 아래로 이동 */
  _moveDown() {
    const visible = this._visibleSorted()
    const checked = visible.filter(c => c._checked)
    if (checked.length !== 1) { UiUtil.showToast('warning', '이동할 행을 1개 선택하세요.'); return }
    const col = checked[0]
    const idx = visible.indexOf(col)
    if (idx === visible.length - 1) return
    const next = visible[idx + 1]
    const tmpOrder = col.col_order
    col.col_order = next.col_order
    next.col_order = tmpOrder
    col._modified = true
    next._modified = true
    this.requestUpdate()
  }

  /** 현재 표시 순서대로 col_order를 10, 20, 30, ... 으로 재부여 */
  _reorderAll() {
    const visible = this._visibleSorted()
    visible.forEach((col, i) => {
      const newOrder = (i + 1) * 10
      if (col.col_order !== newOrder) {
        col.col_order = newOrder
        col._modified = true
      }
    })
    this.requestUpdate()
  }

  _countByRole(role) {
    return (this._columns || []).filter(c => c.col_role === role && !c._deleted).length
  }

  /** 상세 행 토글 */
  _toggleExpand(col) {
    const s = new Set(this._expandedRows)
    if (s.has(col)) s.delete(col)
    else s.add(col)
    this._expandedRows = s
  }

  /** xlsx 다운로드 */
  _onDownloadXlsx() {
    if (!this.templateId) return
    const url = `/rest/excel_templates/${this.templateId}/xlsx`
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  /** 템플릿 파일 업로드 — ox-storage-upload-popup 열기 */
  _onUploadTemplate() {
    this._uploadOpen = true
  }

  /** 업로드 완료 → template_attachment_id 갱신 후 리프레시 */
  async _onUploadComplete(e) {
    const attachId = e.detail?.attachment_id
    if (!attachId) {
      UiUtil.showToast('error', '업로드된 첨부파일 ID를 찾을 수 없습니다.')
      return
    }
    try {
      await ServiceUtil.restPut(`excel_templates/${this.templateId}`, {
        ...this._template,
        template_attachment_id: attachId
      })
      UiUtil.showToast('success', '템플릿 파일이 업로드되었습니다.')
      await this._fetchTemplate()
    } catch (e) {
      console.error('template_attachment_id 갱신 실패:', e)
      UiUtil.showToast('error', `갱신에 실패했습니다: ${e.message || ''}`)
    }
  }

  /** 저장 — 현재 탭에 따라 기본 정보 또는 컬럼만 저장 */
  async _onSave() {
    if (this._mainTab === 'info') {
      await this._saveInfo()
    } else {
      await this._saveColumns()
    }
  }

  /** 기본 정보 저장 */
  async _saveInfo() {
    const t = this._template || {}
    if (!t.name || !t.name.trim()) { UiUtil.showToast('warning', '템플릿명은 필수입니다.'); return }
    if (!t.import_url || !t.import_url.trim()) { UiUtil.showToast('warning', '임포트 URL은 필수입니다.'); return }

    this._saving = true
    try {
      let saved
      if (this.templateId) {
        saved = await ServiceUtil.restPut(`excel_templates/${this.templateId}`, t)
      } else {
        saved = await ServiceUtil.restPost('excel_templates', t)
        this.templateId = saved?.id
      }
      UiUtil.showToast('success', '기본 정보가 저장되었습니다.')
      if (this.onSaved) this.onSaved()
      await this._fetchTemplate()
    } catch (e) {
      console.error('기본 정보 저장 실패:', e)
      UiUtil.showToast('error', `저장에 실패했습니다: ${e.message || ''}`)
    } finally {
      this._saving = false
    }
  }

  /** 컬럼 설정 저장 */
  async _saveColumns() {
    if (!this.templateId) {
      UiUtil.showToast('warning', '기본 정보를 먼저 저장해주세요.')
      this._mainTab = 'info'
      return
    }

    this._saving = true
    try {
      const toSave = (this._columns || []).map(c => {
        const col = { ...c }
        delete col._new
        delete col._modified
        delete col._checked
        delete col._deleted
        if (!col.template_id) col.template_id = this.templateId
        if (c._deleted) col.cud_flag_ = 'd'
        else if (c._new) col.cud_flag_ = 'c'
        else col.cud_flag_ = 'u'
        return col
      })

      if (toSave.length > 0) {
        await ServiceUtil.restPost('excel_template_columns/update_multiple', toSave)
      }

      UiUtil.showToast('success', '컬럼 설정이 저장되었습니다.')
      if (this.onSaved) this.onSaved()
      await this._fetchTemplate()
    } catch (e) {
      console.error('컬럼 저장 실패:', e)
      UiUtil.showToast('error', `저장에 실패했습니다: ${e.message || ''}`)
    } finally {
      this._saving = false
    }
  }

  /** 팝업 닫기 */
  _onClose() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('excel-template-detail', ExcelTemplateDetail)
