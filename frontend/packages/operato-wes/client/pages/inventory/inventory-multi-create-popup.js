import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'
import { store } from '@operato/shell'
import { IMPORT } from '@things-factory/import-base'

/**
 * 멀티 재고 생성 팝업 (W23-ST-DS-17)
 *
 * 엑셀 파일을 임포트하여 대량 재고를 건별로 생성한다.
 * - 전체 데이터는 메모리(_itemsMap)에 보관, DOM은 현재 페이지(100건)만 렌더링
 * - 처리 루프는 items 객체를 직접 변경, UI는 _tick 카운터로 300ms throttle 업데이트
 * - 오류 발생 시 처리 결과 컬럼에 오류 메시지 표시
 *
 * 엑셀 컬럼: wh_cd, com_cd, sku_cd, loc_cd, inv_qty, lot_no, expired_date, reason_cd, remarks
 */
class InventoryMultiCreatePopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 400px;
          overflow: hidden;
        }

        /* ===== 업로드 단계 ===== */
        .upload-phase {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 40px;
          gap: 20px;
        }

        .drop-zone {
          width: 100%;
          max-width: 560px;
          border: 2px dashed var(--md-sys-color-outline-variant, #bdbdbd);
          border-radius: 12px;
          padding: 48px 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--md-sys-color-surface-variant, #fafafa);
        }
        .drop-zone:hover,
        .drop-zone.dragover {
          border-color: var(--md-sys-color-primary, #1976d2);
          background: color-mix(in srgb, var(--md-sys-color-primary, #1976d2) 6%, transparent);
        }
        .drop-zone .dz-icon  { font-size: 52px; display: block; margin-bottom: 12px; }
        .drop-zone .dz-main  { font-size: 15px; color: var(--md-sys-color-on-surface, #424242); margin-bottom: 6px; font-weight: 500; }
        .drop-zone .dz-sub   { font-size: 13px; color: var(--md-sys-color-on-surface-variant, #9e9e9e); }
        .drop-zone .dz-file  { margin-top: 12px; font-size: 14px; color: var(--md-sys-color-primary, #1976d2); font-weight: 500; }

        .upload-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .upload-hint {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #9e9e9e);
          text-align: center;
          line-height: 1.6;
        }

        /* ===== 그리드 단계 공통 ===== */
        .summary-section {
          flex-shrink: 0;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .settings-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 20px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e8e8e8);
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #616161);
          flex-wrap: wrap;
        }
        .settings-row .file-nm { font-weight: 700; color: var(--md-sys-color-primary, #1976D2); }
        .vdiv { color: var(--md-sys-color-outline-variant, #ccc); }

        .req-field { display: flex; align-items: center; gap: 4px; }
        .req-label { font-size: 12px; font-weight: 600; color: var(--md-sys-color-on-surface-variant, #616161); white-space: nowrap; }
        .req-label::after { content: ' *'; color: #C62828; }
        .req-input {
          height: 26px;
          padding: 0 8px;
          font-size: 12px;
          border: 1.5px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
          width: 100px;
        }
        .req-input:focus { border-color: var(--md-sys-color-primary, #1976D2); }
        .req-input:disabled { background: var(--md-sys-color-surface-variant, #f0f0f0); opacity: 0.7; }
        .req-input.empty { border-color: #E53935; background: #FFF8F8; }
        .req-select {
          height: 28px;
          padding: 0 24px 0 8px;
          font-size: 12px;
          border: 1.5px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
          min-width: 130px;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23666' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 6px center;
        }
        .req-select:focus { border-color: var(--md-sys-color-primary, #1976D2); }
        .req-select:disabled { background-color: var(--md-sys-color-surface-variant, #f0f0f0); opacity: 0.7; cursor: default; }
        .req-select.empty { border-color: #E53935; background-color: #FFF8F8; }

        .progress-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 20px;
          background: var(--md-sys-color-surface, #fff);
        }

        .progress-track {
          width: 100%;
          height: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .stat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          flex-wrap: wrap;
        }
        .stat-item { display: flex; align-items: center; gap: 3px; font-weight: 600; }
        .stat-item .n { font-size: 14px; }
        .stat-item.total   { color: var(--md-sys-color-on-surface-variant, #555); }
        .stat-item.done    { color: #2E7D32; }
        .stat-item.err     { color: #C62828; }
        .stat-item.pending { color: #777; }
        .stat-item.pct     { margin-left: auto; font-size: 13px; color: var(--md-sys-color-primary, #1976D2); }

        .current-item-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #888);
        }
        .jump-btn {
          background: none;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 4px;
          font-size: 11px;
          padding: 1px 7px;
          cursor: pointer;
          color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
        }
        .jump-btn:hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }

        .elapsed-time {
          margin-left: auto;
          font-size: 12px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--md-sys-color-on-surface-variant, #666);
          letter-spacing: 0.5px;
        }

        /* ===== 필터 칩 ===== */
        .fchip {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid transparent;
          user-select: none;
          transition: all 0.15s;
        }
        .fchip.all  { background: #EEF2FF; color: #3F51B5; }
        .fchip.done { background: #E8F5E9; color: #2E7D32; }
        .fchip.err  { background: #FFEBEE; color: #C62828; }
        .fchip.pend { background: #F5F5F5; color: #555; }
        .fchip.active { border-color: currentColor; }

        /* ===== 검색 바 ===== */
        .search-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 20px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }
        .srch-field { display: flex; align-items: center; gap: 5px; }
        .srch-label { font-size: 12px; color: var(--md-sys-color-on-surface-variant, #616161); white-space: nowrap; }
        .srch-input {
          height: 28px;
          padding: 0 8px;
          font-size: 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
          width: 110px;
        }
        .srch-input:focus { border-color: var(--md-sys-color-primary, #1976D2); }
        .btn-srch-reset {
          height: 28px;
          padding: 0 12px;
          font-size: 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface-variant, #555);
          cursor: pointer;
          margin-left: auto;
        }
        .btn-srch-reset:hover { background: var(--md-sys-color-surface-variant, #f0f0f0); }

        /* ===== 테이블 ===== */
        .table-wrap {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 8px;
        }
        .data-table thead {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }
        .data-table th {
          padding: 9px 10px;
          text-align: left;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }
        .data-table th.center,
        .data-table td.center { text-align: center; }
        .data-table th.right,
        .data-table td.right  { text-align: right; }
        .data-table tbody tr {
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
        }
        .data-table tbody tr.row-done       { background: #F1F8E9; }
        .data-table tbody tr.row-error      { background: #FFEBEE; }
        .data-table tbody tr.row-processing { background: #E3F2FD; }
        .data-table td {
          padding: 7px 10px;
          color: var(--md-sys-color-on-surface, #424242);
          vertical-align: middle;
        }
        .row-no { font-size: 11px; color: #bbb; }

        .result-cell {
          font-size: 11px;
          max-width: 180px;
          word-break: break-all;
        }
        .result-cell.done  { color: #2E7D32; font-weight: 600; }
        .result-cell.error { color: #C62828; }
        .result-cell.proc  { color: var(--md-sys-color-primary, #1976D2); }

        .loading-row td,
        .empty-row td {
          text-align: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 14px;
        }

        /* ===== 페이지네이션 ===== */
        .pagination-bar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          flex-shrink: 0;
        }
        .pbtn {
          min-width: 32px;
          padding: 4px 8px;
          border: 1px solid var(--md-sys-color-outline-variant, #ddd);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          transition: all 0.15s;
        }
        .pbtn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pbtn:not(:disabled):hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .pbtn.active {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border-color: var(--md-sys-color-primary, #1976D2);
        }
        .page-info {
          padding: 0 10px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          font-weight: 600;
        }

        /* ===== 하단 버튼 ===== */
        .action-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface, #fff);
          flex-shrink: 0;
        }
        .btn {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-primary { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #1565C0; }
        .btn-default {
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }
        .btn-default:hover:not(:disabled) { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .btn-danger { background: #C62828; color: #fff; }
        .btn-danger:hover:not(:disabled) { background: #B71C1C; }
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
          width: 11px;
          height: 11px;
          border: 2px solid #e0e0e0;
          border-top-color: var(--md-sys-color-primary, #1976D2);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 3px;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `
    ]
  }

  /** 반응형 속성 */
  static get properties() {
    return {
      phase: String,
      items: Array,
      processing: Boolean,
      currentProcessingIdx: Number,
      filterStatus: String,
      currentPage: Number,
      pageSize: Number,
      _tick: Number,
      _paused: Boolean,
      _whCd: String,
      _comCd: String,
      _whOptions: Array,
      _comOptions: Array,
      _srchSkuCd: String,
      _srchSkuNm: String,
      _srchLocCd: String
    }
  }

  constructor() {
    super()
    this.phase = 'upload'
    this.items = []
    this.processing = false
    this.currentProcessingIdx = -1
    this.filterStatus = null
    this.currentPage = 1
    this.pageSize = 100
    this._tick = 0
    this._paused = false
    this._whCd = ''
    this._comCd = ''
    this._whOptions = []
    this._comOptions = []
    this._srchSkuCd = ''
    this._srchSkuNm = ''
    this._srchLocCd = ''
    this._itemsMap = new Map()
    this._selectedFile = null
    this._updateTimer = null
    this._processStartTime = null
    this._resumeResolve = null
    this._lastScrolledIdx = -1
    this._pausedAt = null
    this._totalPausedMs = 0
    this._dragover = false
  }

  // ─── computed getters ────────────────────────────────────────────────────

  get _stats() {
    let done = 0, err = 0
    for (const it of this.items) {
      if (it._createStatus === 'DONE') done++
      else if (it._createStatus === 'ERROR') err++
    }
    return {
      total: this.items.length,
      done,
      err,
      pending: this.items.length - done - err,
      processed: done + err
    }
  }

  get _filteredItems() {
    let items = this.items
    switch (this.filterStatus) {
      case 'DONE': items = items.filter(it => it._createStatus === 'DONE'); break
      case 'ERROR': items = items.filter(it => it._createStatus === 'ERROR'); break
      case 'PENDING': items = items.filter(it => !it._createStatus); break
    }
    if (this._srchSkuCd) {
      const q = this._srchSkuCd.toLowerCase()
      items = items.filter(it => (it.sku_cd || '').toLowerCase().includes(q))
    }
    if (this._srchSkuNm) {
      const q = this._srchSkuNm.toLowerCase()
      items = items.filter(it => (it.sku_nm || '').toLowerCase().includes(q))
    }
    if (this._srchLocCd) {
      const q = this._srchLocCd.toLowerCase()
      items = items.filter(it => (it.loc_cd || '').toLowerCase().includes(q))
    }
    return items
  }

  get _totalPages() {
    return Math.max(1, Math.ceil(this._filteredItems.length / this.pageSize))
  }

  get _visibleItems() {
    const start = (this.currentPage - 1) * this.pageSize
    return this._filteredItems.slice(start, start + this.pageSize)
  }

  // ─── render ──────────────────────────────────────────────────────────────

  render() {
    return this.phase === 'upload' ? this._renderUploadPhase() : this._renderGridPhase()
  }

  _renderUploadPhase() {
    return html`
      <div class="upload-phase">
        <div
          class="drop-zone ${this._dragover ? 'dragover' : ''}"
          @click="${this._openFileDialog}"
          @dragover="${this._onDragOver}"
          @dragleave="${this._onDragLeave}"
          @drop="${this._onDrop}"
        >
          <span class="dz-icon">📊</span>
          <div class="dz-main">엑셀 파일을 드래그하거나 클릭하여 업로드</div>
          <div class="dz-sub">.xlsx / .xls 지원 · 최대 20MB</div>
          ${this._selectedFile ? html`
            <div class="dz-file">📄 ${this._selectedFile.name} (${this._fmtFileSize(this._selectedFile.size)})</div>
          ` : ''}
        </div>

        <div class="upload-actions">
          <button class="btn btn-default" @click="${this._downloadTemplate}">📥 템플릿 다운로드</button>
          <button class="btn btn-default" @click="${this._close}">닫기</button>
        </div>

        <div class="upload-hint">
          필수 컬럼: <strong>wh_cd</strong>(창고) · <strong>com_cd</strong>(화주사) · <strong>sku_cd</strong>(상품코드) · <strong>loc_cd</strong>(로케이션) · <strong>inv_qty</strong>(재고수량)<br>
          선택 컬럼: lot_no · expired_date · reason_cd · remarks
        </div>
      </div>
    `
  }

  _renderGridPhase() {
    return html`
      ${this._renderSummarySection()}
      ${this._renderSearchBar()}
      <div class="table-wrap">${this._renderTable()}</div>
      ${this._renderPaginationBar()}
      ${this._renderActionBar()}
    `
  }

  _renderSummarySection() {
    const s = this._stats
    const pct = s.total > 0 ? Math.round(s.processed / s.total * 100) : 0
    const cur = this.currentProcessingIdx >= 0 ? this.items[this.currentProcessingIdx] : null

    return html`
      <div class="summary-section">
        <div class="settings-row">
          <span>📊 멀티 재고 생성</span>
          ${this._selectedFile ? html`
            <span class="vdiv">|</span>
            <span>파일: <span class="file-nm">${this._selectedFile.name}</span></span>
          ` : ''}
          <span class="vdiv">|</span>
          <label class="req-field">
            <span class="req-label">창고</span>
            <select class="req-select ${!this._whCd ? 'empty' : ''}"
              ?disabled="${this.processing}"
              .value="${this._whCd || ''}"
              @change="${e => { this._whCd = e.target.value }}">
              <option value="">-- 선택 --</option>
              ${this._whOptions.map(o => html`
                <option value="${o.value}" ?selected="${this._whCd === o.value}">${o.label}</option>
              `)}
            </select>
          </label>
          <label class="req-field">
            <span class="req-label">화주사</span>
            <select class="req-select ${!this._comCd ? 'empty' : ''}"
              ?disabled="${this.processing}"
              .value="${this._comCd || ''}"
              @change="${e => { this._comCd = e.target.value }}">
              <option value="">-- 선택 --</option>
              ${this._comOptions.map(o => html`
                <option value="${o.value}" ?selected="${this._comCd === o.value}">${o.label}</option>
              `)}
            </select>
          </label>
          <div style="margin-left:auto;display:flex;gap:5px;align-items:center;">
            ${this._renderFilterChips(s)}
          </div>
        </div>

        <div class="progress-row">
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="stat-row">
            <span class="stat-item total">전체 <span class="n">${s.total.toLocaleString()}</span>건</span>
            <span class="vdiv">|</span>
            <span class="stat-item done">✅ 완료 <span class="n">${s.done.toLocaleString()}</span></span>
            <span class="stat-item err">❌ 오류 <span class="n">${s.err.toLocaleString()}</span></span>
            <span class="stat-item pending">⏳ 대기 <span class="n">${s.pending.toLocaleString()}</span></span>
            <span class="stat-item pct">생성 완료율: ${pct}% (${s.processed.toLocaleString()} / ${s.total.toLocaleString()})</span>
          </div>

          ${this._processStartTime ? html`
            <div class="current-item-row">
              ${cur ? html`
                <span class="spinner"></span>
                <span>처리 중: <strong>${cur.sku_cd}</strong> · ${this._whCd} · ${cur.loc_cd}</span>
                <button class="jump-btn" @click="${this._jumpToCurrent}">해당 페이지로 이동</button>
              ` : ''}
              <span class="elapsed-time">경과 시간 ⏱ ${this._fmtElapsed()}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  _renderFilterChips(s) {
    const f = this.filterStatus
    return html`
      <span class="fchip all  ${!f ? 'active' : ''}" @click="${() => this._setFilter(null)}">
        전체 ${s.total.toLocaleString()}</span>
      <span class="fchip done ${f === 'DONE' ? 'active' : ''}" @click="${() => this._setFilter('DONE')}">
        ✅ 완료 ${s.done.toLocaleString()}</span>
      <span class="fchip err  ${f === 'ERROR' ? 'active' : ''}" @click="${() => this._setFilter('ERROR')}">
        ❌ 오류 ${s.err.toLocaleString()}</span>
      <span class="fchip pend ${f === 'PENDING' ? 'active' : ''}" @click="${() => this._setFilter('PENDING')}">
        ⏳ 대기 ${s.pending.toLocaleString()}</span>
    `
  }

  _renderSearchBar() {
    return html`
      <div class="search-bar">
        <label class="srch-field">
          <span class="srch-label">상품코드</span>
          <input class="srch-input" type="text"
            .value="${this._srchSkuCd || ''}"
            @input="${e => { this._srchSkuCd = e.target.value; this.currentPage = 1 }}" />
        </label>
        <label class="srch-field">
          <span class="srch-label">상품명</span>
          <input class="srch-input" type="text"
            .value="${this._srchSkuNm || ''}"
            @input="${e => { this._srchSkuNm = e.target.value; this.currentPage = 1 }}" />
        </label>
        <label class="srch-field">
          <span class="srch-label">로케이션</span>
          <input class="srch-input" type="text"
            .value="${this._srchLocCd || ''}"
            @input="${e => { this._srchLocCd = e.target.value; this.currentPage = 1 }}" />
        </label>
        <button class="btn-srch-reset" @click="${this._resetSearch}">초기화</button>
      </div>
    `
  }

  _renderTable() {
    const rows = this._visibleItems
    return html`
      <table class="data-table">
        <thead>
          <tr>
            <th class="center" style="width:44px;">#</th>
            <th>${TermsUtil.tLabel('sku_cd') || '상품코드'}</th>
            <th>${TermsUtil.tLabel('sku_nm') || '상품명'}</th>
            <th>${TermsUtil.tLabel('loc_cd') || '로케이션'}</th>
            <th class="right">${TermsUtil.tLabel('inv_qty') || '재고수량'}</th>
            <th>${TermsUtil.tLabel('lot_no') || 'Lot번호'}</th>
            <th>${TermsUtil.tLabel('expired_date') || '소비기한'}</th>
            <th>${TermsUtil.tLabel('reason') || '사유'}</th>
            <th>${TermsUtil.tLabel('reason_cd') || '사유코드'}</th>
            <th>${TermsUtil.tLabel('remarks') || '비고'}</th>
            <th>${TermsUtil.tLabel('barcode') || '바코드'}</th>
            <th style="min-width:140px;">처리 결과</th>
          </tr>
        </thead>
        <tbody>
          ${this.items.length === 0 ? html`
            <tr class="empty-row"><td colspan="12">📭 엑셀 파일을 먼저 업로드하세요</td></tr>
          ` : rows.length === 0 ? html`
            <tr class="empty-row"><td colspan="12">검색 결과가 없습니다</td></tr>
          ` : rows.map((item, idx) => this._renderRow(item, idx))}
        </tbody>
      </table>
    `
  }

  _renderRow(item, idx) {
    const isProcessing = item._idx === this.currentProcessingIdx
    const rowClass = isProcessing ? 'row-processing'
      : item._createStatus === 'DONE' ? 'row-done'
        : item._createStatus === 'ERROR' ? 'row-error'
          : ''
    const rowNo = (this.currentPage - 1) * this.pageSize + idx + 1

    return html`
      <tr class="${rowClass}">
        <td class="center row-no">${rowNo}</td>
        <td>${item.sku_cd || '-'}</td>
        <td>${item.sku_nm || '-'}</td>
        <td>${item.loc_cd || '-'}</td>
        <td class="right">${item.inv_qty ?? '-'}</td>
        <td>${item.lot_no || '-'}</td>
        <td>${item.expired_date || '-'}</td>
        <td>${item.reason || '-'}</td>
        <td>${item.reason_cd || '-'}</td>
        <td>${item.remarks || '-'}</td>
        <td>${item.barcode || '-'}</td>
        <td>
          ${isProcessing ? html`
            <span class="result-cell proc"><span class="spinner"></span>처리중...</span>
          ` : item._createStatus === 'DONE' ? html`
            <span class="result-cell done">✅ 생성 완료</span>
          ` : item._createStatus === 'ERROR' ? html`
            <span class="result-cell error" title="${item._errorMsg || ''}">❌ ${item._errorMsg || '오류'}</span>
          ` : html`
            <span style="color:#ccc;font-size:12px;">-</span>
          `}
        </td>
      </tr>
    `
  }

  _renderPaginationBar() {
    if (this.phase !== 'grid') return ''
    const total = this._totalPages
    const cur = this.currentPage
    if (total <= 1 && this.items.length <= this.pageSize) return ''

    return html`
      <div class="pagination-bar">
        <button class="pbtn" ?disabled="${cur === 1}"     @click="${() => this._goPage(1)}">«</button>
        <button class="pbtn" ?disabled="${cur === 1}"     @click="${() => this._goPage(cur - 1)}">‹</button>
        ${this._pageNums(cur, total).map(p => p === '...' ? html`
          <span style="padding:0 2px;color:#bbb;">…</span>
        ` : html`
          <button class="pbtn ${p === cur ? 'active' : ''}" @click="${() => this._goPage(p)}">${p}</button>
        `)}
        <button class="pbtn" ?disabled="${cur === total}" @click="${() => this._goPage(cur + 1)}">›</button>
        <button class="pbtn" ?disabled="${cur === total}" @click="${() => this._goPage(total)}">»</button>
        <span class="page-info">${cur} / ${total} 페이지 (${this._filteredItems.length.toLocaleString()}건)</span>
      </div>
    `
  }

  _renderActionBar() {
    const s = this._stats
    const allDone = s.total > 0 && s.pending === 0
    const hasPending = s.pending > 0

    return html`
      <div class="action-bar">
        <button class="btn btn-default"
          ?disabled="${this.processing}"
          @click="${this._backToUpload}">
          📁 파일 재선택
        </button>
        ${!this._whCd || !this._comCd ? html`
          <span style="font-size:12px;color:#E53935;font-weight:500;padding:0 8px;line-height:1.5;">
            현재 화면에서는 하나의 창고, 하나의 화주사 단위로 여러 건의 재고를 생성할 수 있습니다.<br>
            재고 생성 전에 반드시 창고, 화주사를 선택하세요.
          </span>
        ` : ''}
        <div style="flex:1;"></div>
        ${allDone ? html`
          <span style="font-size:13px;color:#2E7D32;font-weight:600;">
            ✅ 완료: ${s.done.toLocaleString()}건 / 오류: ${s.err.toLocaleString()}건
          </span>
        ` : ''}
        <button class="btn btn-primary"
          ?disabled="${this.processing || !hasPending}"
          @click="${this._startCreateProcess}">
          ✨ 재고 생성
        </button>
        <button class="btn btn-pause ${this._paused ? 'resuming' : ''}"
          ?disabled="${!this.processing}"
          @click="${this._togglePause}">
          ${this._paused ? '▶ 재개' : '⏸ 일시 중지'}
        </button>
        <button class="btn btn-default"
          ?disabled="${this.processing}"
          @click="${this._close}">
          닫기
        </button>
      </div>
    `
  }

  // ─── lifecycle ───────────────────────────────────────────────────────────

  async connectedCallback() {
    super.connectedCallback()
    this._fetchWhOptions()
    this._fetchComOptions()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._stopTimer()
  }

  // ─── file handling ───────────────────────────────────────────────────────

  async _fetchWhOptions() {
    try {
      const result = await ServiceUtil.restGet('warehouses?limit=500&select=wh_cd,wh_nm')
      this._whOptions = (result?.items || []).map(w => ({ value: w.wh_cd, label: `${w.wh_cd} · ${w.wh_nm}` }))
      if (this._whOptions.length === 1) this._whCd = this._whOptions[0].value
    } catch (e) {
      console.warn('창고 목록 조회 실패:', e)
    }
  }

  async _fetchComOptions() {
    try {
      const result = await ServiceUtil.restGet('companies/my_companies')
      const list = Array.isArray(result) ? result : (result?.items || [])
      this._comOptions = list.map(c => ({ value: c.name, label: `${c.name} · ${c.description || ''}` }))
      if (this._comOptions.length === 1) this._comCd = this._comOptions[0].value
    } catch (e) {
      console.warn('화주사 목록 조회 실패:', e)
    }
  }

  _openFileDialog() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.addEventListener('change', e => {
      if (e.target.files && e.target.files.length > 0) this._processFile(e.target.files[0])
    })
    input.click()
  }

  _onDragOver(e) {
    e.preventDefault()
    this._dragover = true
    this.requestUpdate()
  }

  _onDragLeave(e) {
    e.preventDefault()
    this._dragover = false
    this.requestUpdate()
  }

  _onDrop(e) {
    e.preventDefault()
    this._dragover = false
    const files = e.dataTransfer.files
    if (files && files.length > 0) this._processFile(files[0])
  }

  _processFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      UiUtil.showToast('error', '.xlsx 또는 .xls 파일만 지원합니다.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      UiUtil.showToast('error', '파일 크기는 20MB 이하여야 합니다.')
      return
    }
    this._selectedFile = file
    const reader = new FileReader()
    reader.onload = e => {
      store.dispatch({
        type: IMPORT,
        importable: { extension: ext, handler: this._onExcelParsed.bind(this) },
        data: e.target.result
      })
    }
    reader.readAsArrayBuffer(file)
  }

  /** Excel 파싱 완료 콜백 */
  _onExcelParsed(records) {
    const rawData = records.header ? records.data : records
    if (!rawData || rawData.length === 0) {
      UiUtil.showToast('warning', '파일에서 데이터를 읽을 수 없습니다.')
      return
    }

    // 빈 행 제거 + 한글 레이블 행 제거
    // 한글 레이블 행: inv_qty 컬럼 값이 숫자가 아닌 문자 (예: "재고수량", "★ 재고수량")
    const filtered = rawData.filter(row => {
      const hasValue = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')
      if (!hasValue) return false
      // inv_qty 가 숫자로 변환 불가능하면 헤더/레이블 행으로 간주하고 제외
      const invVal = row['inv_qty'] ?? row['재고수량'] ?? row['INV_QTY']
      if (invVal !== null && invVal !== undefined) {
        const n = parseFloat(String(invVal))
        if (isNaN(n)) return false
      }
      return true
    })

    if (filtered.length === 0) {
      UiUtil.showToast('warning', '유효한 데이터가 없습니다. 템플릿 파일을 사용하고 있는지 확인하세요.')
      return
    }
    const items = filtered.map((raw, idx) => this._mapRow(raw, idx))
    this.items = items
    this._itemsMap = new Map(items.map(it => [it._idx, it]))
    this.currentPage = 1
    this.filterStatus = null
    this.phase = 'grid'
    UiUtil.showToast('success', `${items.length.toLocaleString()}건 로드됐습니다.`)
  }

  /** 엑셀 행 → 내부 item 매핑 (한글/영문 헤더 모두 지원) */
  _mapRow(raw, idx) {
    // ExcelJS 수식 셀: bootstrap.js가 { formula, result } 객체를 .toString() → "[object Object]"
    // 이를 무효 값으로 처리하고 빈 문자열을 반환
    const g = (keys) => {
      for (const k of keys) {
        const v = raw[k]
        if (v === undefined || v === null) continue
        const s = String(v).trim()
        if (s === '' || s === '[object Object]') continue
        return s
      }
      return ''
    }
    const num = (keys) => {
      const v = g(keys)
      return v ? parseFloat(v) : null
    }
    // ExcelJS 날짜 셀: Date 객체가 .toString()된 문자열 → YYYY-MM-DD 변환
    const parseDate = (keys) => {
      const v = g(keys)
      if (!v) return ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
      const d = new Date(v)
      if (isNaN(d.getTime())) return v
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    // reason(사유 한글명) → reason_cd(코드) 역매핑
    // 엑셀 수식 셀이 "[object Object]"로 깨지는 경우 대비
    const REASON_MAP = { '발견': 'DISCOVERY', '누락': 'OMISSION', '조정': 'ADJUST', '요청': 'REQUEST', '반품': 'RETURN', '기타': 'ETC' }
    const reasonNm = g(['reason', '사유', 'REASON_NM'])
    const reasonCd = g(['reason_cd', '사유코드', 'REASON_CD']) || REASON_MAP[reasonNm] || ''

    return {
      _idx: idx,
      _createStatus: null,
      _errorMsg: null,
      wh_cd: g(['wh_cd', '창고', 'WH_CD', '창고코드']),
      com_cd: g(['com_cd', '화주사', 'COM_CD', '화주사코드']),
      sku_cd: g(['sku_cd', '상품코드', 'SKU_CD', '품목코드']),
      sku_nm: '',
      barcode: '',
      loc_cd: g(['loc_cd', '로케이션', 'LOC_CD', '로케이션코드']),
      inv_qty: num(['inv_qty', '재고수량', 'INV_QTY', '수량']),
      lot_no: g(['lot_no', 'Lot번호', 'LOT_NO', 'LOT번호', 'lot번호']),
      expired_date: parseDate(['expired_date', '소비기한', 'EXPIRED_DATE', '유통기한']),
      reason: reasonNm,
      reason_cd: reasonCd,
      remarks: g(['remarks', '비고', 'REMARKS'])
    }
  }

  // ─── processing ──────────────────────────────────────────────────────────

  /** 재고 생성 처리 시작 */
  async _startCreateProcess() {
    const pending = this.items.filter(it => !it._createStatus)
    if (pending.length === 0) {
      UiUtil.showToast('info', '처리할 대기 항목이 없습니다.')
      return
    }

    // 창고/화주사 필수 입력 검증
    if (!this._whCd || !this._comCd) {
      UiUtil.showToast('warning', '창고(wh_cd)와 화주사(com_cd)를 입력해주세요.')
      return
    }

    // 필수 컬럼 검증
    const invalid = pending.filter(it => !it.sku_cd || !it.loc_cd || it.inv_qty == null)
    if (invalid.length > 0) {
      const first = invalid[0]
      UiUtil.showToast(
        'warning',
        `필수 컬럼 누락 행이 ${invalid.length}건 있습니다. (행 ${first._idx + 1}: sku_cd/loc_cd/inv_qty 확인 필요)`
      )
      return
    }

    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `${pending.length.toLocaleString()}건의 재고를 생성하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    this.processing = true
    this._processStartTime = Date.now()
    this._pausedAt = null
    this._totalPausedMs = 0
    this._startTimer()

    let doneCnt = 0, errCnt = 0

    for (const item of pending) {
      if (this._paused) {
        await new Promise(resolve => { this._resumeResolve = resolve })
      }

      this.currentProcessingIdx = item._idx

      await new Promise(resolve => {
        ServiceUtil.restPost(
          'inventory_trx/create_inventory',
          {
            wh_cd: this._whCd,
            com_cd: this._comCd,
            sku_cd: item.sku_cd,
            loc_cd: item.loc_cd,
            inv_qty: item.inv_qty,
            lot_no: item.lot_no || null,
            expired_date: item.expired_date || null,
            reason_cd: item.reason_cd || null,
            remarks: item.remarks || null
          },
          null, null,
          result => {
            item._createStatus = 'DONE'
            item.sku_nm = result?.sku_nm || item.sku_nm || ''
            item.barcode = result?.barcode || ''
            doneCnt++
            resolve()
          },
          err => {
            console.error(`재고 생성 실패 (행 ${item._idx + 1}, sku=${item.sku_cd}):`, err)
            item._createStatus = 'ERROR'
            item._errorMsg = err?.message || err?.data?.message || err?.error || '처리 오류'
            errCnt++
            resolve()
          }
        )
      })
    }

    this._stopTimer()
    this.processing = false
    this.currentProcessingIdx = -1
    this._paused = false
    this._resumeResolve = null
    this._tick++

    UiUtil.showToast(
      errCnt === 0 ? 'success' : 'warning',
      `재고 생성 완료 — 성공: ${doneCnt.toLocaleString()}건, 오류: ${errCnt.toLocaleString()}건`
    )

    this.dispatchEvent(new CustomEvent('inventory-created', {
      bubbles: true, composed: true,
      detail: { doneCnt, errCnt }
    }))
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  _setFilter(status) {
    this.filterStatus = status
    this.currentPage = 1
  }

  _resetSearch() {
    this._srchSkuCd = ''
    this._srchSkuNm = ''
    this._srchLocCd = ''
    this.currentPage = 1
  }

  _goPage(page) {
    this.currentPage = Math.max(1, Math.min(page, this._totalPages))
  }

  _pageNums(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', cur - 1, cur, cur + 1, '...', total]
  }

  _togglePause() {
    if (!this.processing) return
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

  _jumpToCurrent() {
    if (this.currentProcessingIdx < 0) return
    this.filterStatus = null
    const page = Math.floor(this.currentProcessingIdx / this.pageSize) + 1
    this.currentPage = page
  }

  _backToUpload() {
    if (this.processing) return
    this.phase = 'upload'
    this.items = []
    this._itemsMap = new Map()
    this._selectedFile = null
    this.filterStatus = null
    this.currentPage = 1
    this._processStartTime = null
    this._whCd = ''
    this._comCd = ''
  }

  _close() {
    UiUtil.closePopupBy(this)
  }

  async _downloadTemplate() {
    const settingName = 'template.inventory.multi.create'
    try {
      const query = JSON.stringify([{ name: 'name', value: settingName }])
      const result = await ServiceUtil.restGet(`settings?query=${encodeURIComponent(query)}`)
      const items = result?.items || []
      if (items.length === 0 || !items[0].value) {
        UiUtil.showToast('warning', '템플릿 파일이 설정되어 있지 않습니다. (설정명: ' + settingName + ')')
        return
      }
      const link = document.createElement('a')
      link.href = `/rest/attachments/${items[0].value}/download`
      link.click()
    } catch (e) {
      console.error('템플릿 다운로드 실패:', e)
      UiUtil.showToast('error', '템플릿 다운로드에 실패했습니다.')
    }
  }

  // ─── timer ───────────────────────────────────────────────────────────────

  _startTimer() {
    if (this._updateTimer) return
    this._updateTimer = setInterval(() => {
      this._autoFollow()
      this._tick++
    }, 300)
  }

  _stopTimer() {
    if (!this._updateTimer) return
    clearInterval(this._updateTimer)
    this._updateTimer = null
  }

  _autoFollow() {
    if (!this.processing || this.filterStatus !== null || this.currentProcessingIdx < 0) return
    const targetPage = Math.floor(this.currentProcessingIdx / this.pageSize) + 1
    if (targetPage !== this.currentPage) this.currentPage = targetPage

    if (this._lastScrolledIdx !== this.currentProcessingIdx) {
      this._lastScrolledIdx = this.currentProcessingIdx
      this.updateComplete.then(() => {
        const row = this.shadowRoot?.querySelector('tr.row-processing')
        if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }
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

  _fmtFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}

window.customElements.define('inventory-multi-create-popup', InventoryMultiCreatePopup)
