import { css, html } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 스토리지 파일 브라우저 화면
 *
 * - 좌측: 디렉토리 트리 (lazy load)
 * - 우측: 선택 경로의 파일/폴더 목록
 */
class StorageBrowser extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-background, #fafafa);
          overflow: hidden;
        }

        /* 헤더 */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid #e0e0e0;
          background: #fff;
          flex-shrink: 0;
        }
        .page-header h2 {
          margin: 0;
          font: var(--title-font);
          color: var(--title-text-color);
        }
        .header-actions {
          display: flex;
          gap: 8px;
        }

        /* 브레드크럼 */
        .breadcrumb {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 2px;
        }
        .breadcrumb .crumb {
          color: #1976d2;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 3px;
        }
        .breadcrumb .crumb:hover { background: #e3f2fd; }
        .breadcrumb .crumb.current { color: #424242; cursor: default; font-weight: 600; }
        .breadcrumb .sep { color: #9e9e9e; padding: 0 2px; }

        /* 메인 레이아웃 */
        .main-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* 트리 패널 */
        .tree-panel {
          width: 240px;
          min-width: 180px;
          border-right: 1px solid #e0e0e0;
          overflow-y: auto;
          background: #fff;
          flex-shrink: 0;
        }
        .tree-node {
          display: flex;
          align-items: center;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 13px;
          color: #424242;
          white-space: nowrap;
          user-select: none;
        }
        .tree-node:hover { background: #f5f5f5; }
        .tree-node.selected { background: #e3f2fd; color: #1976d2; font-weight: 600; }
        .tree-node .toggle {
          width: 16px;
          text-align: center;
          color: #9e9e9e;
          font-size: 10px;
          flex-shrink: 0;
        }
        .tree-node .icon { margin: 0 4px; flex-shrink: 0; }
        .tree-children { display: none; }
        .tree-children.open { display: block; }

        /* 파일 목록 패널 */
        .list-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #fff;
        }

        /* 툴바 */
        .list-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          border-bottom: 1px solid #e0e0e0;
          flex-shrink: 0;
        }
        .list-info { font-size: 13px; color: #757575; }

        /* 테이블 */
        .table-wrap {
          flex: 1;
          overflow-y: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        thead th {
          position: sticky;
          top: 0;
          background: #f5f5f5;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: #424242;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
          z-index: 1;
        }
        tbody td {
          padding: 8px 12px;
          border-bottom: 1px solid #f0f0f0;
          color: #616161;
        }
        tbody tr:hover { background: #fafafa; }
        .col-name { cursor: pointer; display: flex; align-items: center; gap: 6px; color: #1976d2; }
        .col-name:hover { text-decoration: underline; }
        .col-right { text-align: right; }
        .col-center { text-align: center; }

        /* 버튼 */
        .btn {
          padding: 7px 16px;
          border: none;
          border-radius: 5px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary { background: #1976d2; color: #fff; }
        .btn-primary:hover { background: #1565c0; }
        .btn-danger { background: #f44336; color: #fff; }
        .btn-danger:hover { background: #d32f2f; }
        .btn-default { background: #f5f5f5; color: #424242; border: 1px solid #e0e0e0; }
        .btn-default:hover { background: #eeeeee; }
        .btn:disabled { background: #e0e0e0; color: #9e9e9e; cursor: not-allowed; }

        /* 액션 메뉴 */
        .action-btn {
          background: none;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 3px 8px;
          cursor: pointer;
          font-size: 12px;
          color: #616161;
        }
        .action-btn:hover { background: #f5f5f5; }

        /* 빈 상태 */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: #9e9e9e;
          font-size: 14px;
          gap: 8px;
        }
        .empty-icon { font-size: 48px; }

        /* 로딩 */
        .loading { padding: 24px; text-align: center; color: #9e9e9e; font-size: 13px; }

        /* 업로드 다이얼로그 */
        .upload-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .upload-dialog {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          width: 480px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .upload-dialog h3 {
          margin: 0;
          font-size: 16px;
          color: #212121;
        }
        .upload-field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #616161;
          margin-bottom: 4px;
        }
        .upload-field select,
        .upload-field input[type="text"],
        .upload-field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 9px 12px;
          border: 1px solid #bdbdbd;
          border-radius: 5px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }
        .upload-field select:focus,
        .upload-field input[type="text"]:focus,
        .upload-field textarea:focus { border-color: #1976d2; }
        .upload-field textarea { resize: vertical; min-height: 64px; }
        /* 드롭존 */
        .drop-zone {
          border: 2px dashed #bdbdbd;
          border-radius: 8px;
          padding: 32px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #9e9e9e;
          font-size: 13px;
        }
        .drop-zone.drag-over {
          border-color: #1976d2;
          background: #e3f2fd;
          color: #1976d2;
        }
        .drop-zone .drop-icon { font-size: 36px; display: block; margin-bottom: 8px; }
        .drop-zone .selected-file {
          margin-top: 8px;
          font-size: 13px;
          color: #212121;
          font-weight: 600;
          word-break: break-all;
        }
        /* 업로드 진행 */
        .upload-progress {
          background: #e3f2fd;
          border-radius: 5px;
          padding: 10px 14px;
          font-size: 13px;
          color: #1976d2;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid #bbdefb;
          border-top-color: #1976d2;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .upload-dialog .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 4px;
        }

        /* 새 폴더 다이얼로그 */
        .mkdir-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .mkdir-dialog {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          width: 360px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        .mkdir-dialog h3 {
          margin: 0 0 16px;
          font-size: 16px;
          color: #212121;
        }
        .mkdir-dialog input {
          width: 100%;
          box-sizing: border-box;
          padding: 9px 12px;
          border: 1px solid #bdbdbd;
          border-radius: 5px;
          font-size: 14px;
          outline: none;
        }
        .mkdir-dialog input:focus { border-color: #1976d2; }
        .mkdir-dialog .dialog-hint {
          font-size: 12px;
          color: #9e9e9e;
          margin-top: 6px;
        }
        .mkdir-dialog .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
        }
      `
    ]
  }

  static get properties() {
    return {
      currentPath: String,
      items: Array,
      treeNodes: Array,
      selectedPaths: Array,
      loading: Boolean,
      _mkdirDialogOpen: Boolean,
      _mkdirName: String,
      _uploadDialogOpen: Boolean,
      _uploadFile: Object,
      _uploadStorageId: String,
      _uploadDescription: String,
      _uploadTag: String,
      _uploading: Boolean,
      _dragOver: Boolean,
      _storages: Array
    }
  }

  /** 초기 상태 설정 */
  constructor() {
    super()
    this.currentPath = ''
    this.items = []
    this.treeNodes = []
    this.selectedPaths = []
    this.loading = false
    this._mkdirDialogOpen = false
    this._mkdirName = ''
    this._uploadDialogOpen = false
    this._uploadFile = null
    this._uploadStorageId = ''
    this._uploadDescription = ''
    this._uploadTag = ''
    this._uploading = false
    this._dragOver = false
    this._storages = []
  }

  get context() {
    return { title: TermsUtil.tMenu('storage-browser') }
  }

  /** 전체 화면 렌더링 */
  render() {
    return html`
      <div class="page-header">
        <h2>${TermsUtil.tMenu('storage-browser')}</h2>
        <div class="header-actions">
          <button class="btn btn-primary" @click="${this._openUploadDialog}">⬆ ${TermsUtil.tButton('upload')}</button>
          <button class="btn btn-default" @click="${this._openMkdirDialog}">📁+ ${TermsUtil.tButton('add_folder')}</button>
          <button class="btn btn-default" @click="${this._refresh}">🔄 ${TermsUtil.tButton('refresh')}</button>
          <button class="btn btn-danger"
            ?disabled="${this.selectedPaths.length === 0}"
            @click="${this._deleteSelected}">
            🗑 ${TermsUtil.tButton('delete')} (${this.selectedPaths.length})
          </button>
        </div>
      </div>

      ${this._renderBreadcrumb()}

      <div class="main-layout">
        <div class="tree-panel">
          ${this.treeNodes.length === 0
        ? html`<div class="loading">로딩 중...</div>`
        : this.treeNodes.map(node => this._renderTreeNode(node, 0))}
        </div>
        <div class="list-panel">
          ${this._renderListPanel()}
        </div>
      </div>

      ${this._uploadDialogOpen ? this._renderUploadDialog() : ''}
      ${this._mkdirDialogOpen ? this._renderMkdirDialog() : ''}
    `
  }

  /** 브레드크럼 렌더링 */
  _renderBreadcrumb() {
    const segments = this.currentPath ? this.currentPath.split('/').filter(Boolean) : []
    return html`
      <div class="breadcrumb">
        <span class="crumb ${segments.length === 0 ? 'current' : ''}"
              @click="${() => this._navigateTo('')}">📁 /</span>
        ${segments.map((seg, idx) => {
      const path = segments.slice(0, idx + 1).join('/')
      const isCurrent = idx === segments.length - 1
      return html`
            <span class="sep">›</span>
            <span class="crumb ${isCurrent ? 'current' : ''}"
                  @click="${() => this._navigateTo(path)}">${seg}</span>
          `
    })}
      </div>
    `
  }

  /** 트리 노드 렌더링 (재귀) */
  _renderTreeNode(node, depth) {
    const isSelected = node.path === this.currentPath || (node.path === '' && this.currentPath === '')
    const indent = depth * 16
    return html`
      <div>
        <div class="tree-node ${isSelected ? 'selected' : ''}"
             style="padding-left: ${8 + indent}px"
             @click="${() => this._onTreeNodeClick(node)}">
          <span class="toggle"
                @click="${e => { e.stopPropagation(); this._toggleTreeNode(node) }}">
            ${node.has_children ? (node._open ? '▼' : '▶') : ''}
          </span>
          <span class="icon">📁</span>
          ${node.name || '/'}
        </div>
        ${node._open && node._children
        ? html`<div class="tree-children open">
              ${node._children.map(child => this._renderTreeNode(child, depth + 1))}
            </div>`
        : ''}
      </div>
    `
  }

  /** 우측 목록 패널 렌더링 */
  _renderListPanel() {
    if (this.loading) {
      return html`<div class="loading">로딩 중...</div>`
    }
    if (this.items.length === 0) {
      return html`
        <div class="empty-state">
          <span class="empty-icon">📂</span>
          <span>파일이 없습니다.</span>
        </div>
      `
    }

    const folders = this.items.filter(i => i.type === 'FOLDER')
    const files = this.items.filter(i => i.type === 'FILE')

    return html`
      <div class="list-toolbar">
        <span class="list-info">
          📁 ${folders.length}개 폴더&nbsp;&nbsp;📄 ${files.length}개 파일
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:36px">
                <input type="checkbox" @change="${this._toggleSelectAll}" />
              </th>
              <th>이름</th>
              <th class="col-right" style="width:100px">크기</th>
              <th style="width:160px">수정일</th>
              <th style="width:80px">작업</th>
            </tr>
          </thead>
          <tbody>
            ${this.items.map(item => html`
              <tr>
                <td class="col-center">
                  <input type="checkbox"
                    .checked="${this.selectedPaths.includes(item.path)}"
                    @change="${e => this._toggleSelect(e, item.path)}" />
                </td>
                <td>
                  <span class="col-name" @click="${() => this._onItemClick(item)}">
                    ${item.type === 'FOLDER' ? '📁' : '📄'} ${item.name}
                  </span>
                </td>
                <td class="col-right">${item.type === 'FILE' ? this._formatSize(item.size) : '-'}</td>
                <td>${item.last_modified ? item.last_modified.substring(0, 16).replace('T', ' ') : '-'}</td>
                <td>
                  <button class="action-btn" @click="${() => this._showActionMenu(item)}">···</button>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `
  }

  /** 페이지 활성화 시 초기 로드 */
  async pageUpdated(_changes, _lifecycle) {
    if (this.active) {
      await this._loadTree('')
      await this._fetchList('')
    }
  }

  /** 트리 루트 또는 특정 경로 하위 폴더 로드 */
  async _loadTree(path) {
    let newPath = path ? (path.endsWith('/') ? path.substring(0, path.length - 1) : path) : ''
    const data = await ServiceUtil.restGet(`storage/browse?path=${newPath}&folders_only=true`)
    if (!data) return

    if (!path) {
      this.treeNodes = data.items.map(item => ({ ...item, _open: false, _children: null }))
    }
    this.requestUpdate()
  }

  /** 우측 목록 로드 */
  async _fetchList(path) {
    this.loading = true
    this.requestUpdate()
    const data = await ServiceUtil.restGet(`storage/browse?path=${encodeURIComponent(path)}`)
    this.loading = false
    if (data) {
      this.items = data.items || []
      this.selectedPaths = []
    }
    this.requestUpdate()
  }

  /** 경로 이동 */
  async _navigateTo(path) {
    this.currentPath = path
    await this._fetchList(path)
  }

  /** 트리 노드 클릭 — 우측 목록 갱신 */
  async _onTreeNodeClick(node) {
    await this._navigateTo(node.path)
  }

  /** 트리 노드 펼침/접힘 */
  async _toggleTreeNode(node) {
    node._open = !node._open
    if (node._open && !node._children) {
      const data = await ServiceUtil.restGet(`storage/browse?path=${encodeURIComponent(node.path)}&folders_only=true`)
      node._children = data ? data.items.map(i => ({ ...i, _open: false, _children: null })) : []
    }
    this.requestUpdate()
  }

  /** 항목 클릭 — 폴더면 이동, 파일이면 다운로드 */
  _onItemClick(item) {
    if (item.type === 'FOLDER') {
      this._navigateTo(item.path)
    } else {
      this._downloadFile(item)
    }
  }

  /** 파일 다운로드 */
  _downloadFile(item) {
    const link = document.createElement('a')
    link.href = `/rest/storage/download?path=${encodeURIComponent(item.path)}`
    link.download = item.name
    link.click()
  }

  /** 액션 메뉴 (다운로드 / 삭제 / 경로 복사) */
  _showActionMenu(item) {
    UiUtil.showMenu([
      {
        label: '⬇ 다운로드',
        action: () => this._downloadFile(item),
        hidden: item.type === 'FOLDER'
      },
      {
        label: '📋 경로 복사',
        action: () => {
          navigator.clipboard.writeText(item.path)
          UiUtil.showToast('info', '경로가 클립보드에 복사됐습니다.')
        }
      },
      {
        label: '🗑 삭제',
        action: () => this._confirmDelete([item.path])
      }
    ])
  }

  /** 전체 선택/해제 */
  _toggleSelectAll(e) {
    this.selectedPaths = e.target.checked ? this.items.map(i => i.path) : []
    this.requestUpdate()
  }

  /** 개별 선택/해제 */
  _toggleSelect(e, path) {
    if (e.target.checked) {
      this.selectedPaths = [...this.selectedPaths, path]
    } else {
      this.selectedPaths = this.selectedPaths.filter(p => p !== path)
    }
    this.requestUpdate()
  }

  /** 선택 항목 삭제 */
  _deleteSelected() {
    this._confirmDelete(this.selectedPaths)
  }

  /** 삭제 확인 후 실행 */
  async _confirmDelete(paths) {
    if (!confirm(`${paths.length}개 항목을 삭제하시겠습니까?`)) return
    for (const path of paths) {
      await ServiceUtil.restPost('attachments/delete_by_path', { path })
    }
    UiUtil.showToast('success', `${paths.length}개 항목이 삭제됐습니다.`)
    await this._fetchList(this.currentPath)
  }

  /** 업로드 다이얼로그 열기 — 스토리지 목록도 함께 로드 */
  async _openUploadDialog() {
    this._uploadFile = null
    this._uploadStorageId = ''
    this._uploadDescription = ''
    this._uploadTag = ''
    this._uploading = false
    this._dragOver = false
    this._uploadDialogOpen = true
    this.requestUpdate()
    await this._loadStorages()
  }

  /** 업로드 다이얼로그 닫기 */
  _closeUploadDialog() {
    this._uploadDialogOpen = false
    this.requestUpdate()
  }

  /** 스토리지 목록 로드 */
  async _loadStorages() {
    const data = await ServiceUtil.restGet('storage/storages')
    if (data && data.items) {
      this._storages = data.items
      // 기본 스토리지 자동 선택
      const def = this._storages.find(s => s.default_flag) || this._storages[0]
      if (def) this._uploadStorageId = def.id
    }
    this.requestUpdate()
  }

  /** 업로드 다이얼로그 렌더링 */
  _renderUploadDialog() {
    const canUpload = this._uploadFile && this._uploadStorageId && !this._uploading
    return html`
      <div class="upload-overlay" @click="${e => { if (e.target === e.currentTarget) this._closeUploadDialog() }}">
        <div class="upload-dialog">
          <h3>⬆ 파일 업로드</h3>

          <!-- 드롭존 -->
          <div class="drop-zone ${this._dragOver ? 'drag-over' : ''}"
            @click="${() => this.shadowRoot.querySelector('#upload-file-input').click()}"
            @dragover="${e => { e.preventDefault(); this._dragOver = true; this.requestUpdate() }}"
            @dragleave="${() => { this._dragOver = false; this.requestUpdate() }}"
            @drop="${this._onFileDrop}">
            <span class="drop-icon">📄</span>
            ${this._uploadFile
        ? html`<div class="selected-file">📎 ${this._uploadFile.name} (${this._formatSize(this._uploadFile.size)})</div>`
        : html`<div>파일을 끌어다 놓거나 클릭하여 선택</div>`
      }
          </div>
          <input id="upload-file-input" type="file" style="display:none"
            @change="${this._onFileSelect}" />

          <!-- 스토리지 선택 -->
          <div class="upload-field">
            <label>스토리지 *</label>
            <select .value="${this._uploadStorageId}"
              @change="${e => { this._uploadStorageId = e.target.value; this.requestUpdate() }}">
              <option value="">-- 스토리지 선택 --</option>
              ${this._storages.map(s => html`
                <option value="${s.id}" ?selected="${s.id === this._uploadStorageId}">
                  ${s.name}${s.default_flag ? ' (기본)' : ''}
                </option>
              `)}
            </select>
          </div>

          <!-- 설명 -->
          <div class="upload-field">
            <label>설명</label>
            <textarea placeholder="첨부파일에 대한 설명을 입력하세요"
              .value="${this._uploadDescription}"
              @input="${e => { this._uploadDescription = e.target.value }}"></textarea>
          </div>

          <!-- 태그 -->
          <div class="upload-field">
            <label>태그</label>
            <input type="text" placeholder="태그 (선택)"
              .value="${this._uploadTag}"
              @input="${e => { this._uploadTag = e.target.value }}" />
          </div>

          <!-- 업로드 진행 중 -->
          ${this._uploading ? html`
            <div class="upload-progress">
              <div class="spinner"></div>
              업로드 중...
            </div>
          ` : ''}

          <div class="dialog-actions">
            <button class="btn btn-default" ?disabled="${this._uploading}" @click="${this._closeUploadDialog}">취소</button>
            <button class="btn btn-primary" ?disabled="${!canUpload}" @click="${this._submitUpload}">업로드</button>
          </div>
        </div>
      </div>
    `
  }

  /** 파일 드롭 처리 */
  _onFileDrop(e) {
    e.preventDefault()
    this._dragOver = false
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      this._uploadFile = file
    }
    this.requestUpdate()
  }

  /** 파일 선택 처리 */
  _onFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) {
      this._uploadFile = file
    }
    this.requestUpdate()
  }

  /** 파일 업로드 실행 */
  async _submitUpload() {
    if (!this._uploadFile || !this._uploadStorageId) return

    this._uploading = true
    this.requestUpdate()

    try {
      const formData = new FormData()
      formData.append('file', this._uploadFile)
      formData.append('storage_id', this._uploadStorageId)
      if (this._uploadDescription) formData.append('description', this._uploadDescription)
      if (this._uploadTag) formData.append('tag', this._uploadTag)

      const response = await fetch('/rest/storage/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      const result = await response.json()
      this._closeUploadDialog()
      UiUtil.showToast('success', `"${result.name}" 업로드 완료`)
      await this._refresh()
    } catch (e) {
      UiUtil.showToast('error', `업로드 실패: ${e.message}`)
      this._uploading = false
      this.requestUpdate()
    }
  }

  /** 새 폴더 다이얼로그 열기 */
  _openMkdirDialog() {
    this._mkdirName = ''
    this._mkdirDialogOpen = true
    this.requestUpdate()
    // 다이얼로그가 렌더된 후 input에 포커스
    this.updateComplete.then(() => {
      const input = this.shadowRoot.querySelector('.mkdir-dialog input')
      if (input) input.focus()
    })
  }

  /** 새 폴더 다이얼로그 닫기 */
  _closeMkdirDialog() {
    this._mkdirDialogOpen = false
    this._mkdirName = ''
    this.requestUpdate()
  }

  /** 새 폴더 다이얼로그 렌더링 */
  _renderMkdirDialog() {
    const currentLabel = this.currentPath ? `/${this.currentPath}` : '/'
    return html`
      <div class="mkdir-overlay" @click="${e => { if (e.target === e.currentTarget) this._closeMkdirDialog() }}">
        <div class="mkdir-dialog">
          <h3>📁 새 폴더 만들기</h3>
          <input
            type="text"
            placeholder="폴더 이름"
            .value="${this._mkdirName}"
            @input="${e => { this._mkdirName = e.target.value }}"
            @keydown="${e => { if (e.key === 'Enter') this._submitMkdir(); if (e.key === 'Escape') this._closeMkdirDialog() }}"
          />
          <p class="dialog-hint">생성 위치: ${currentLabel}</p>
          <div class="dialog-actions">
            <button class="btn btn-default" @click="${this._closeMkdirDialog}">취소</button>
            <button class="btn btn-primary" @click="${this._submitMkdir}">만들기</button>
          </div>
        </div>
      </div>
    `
  }

  /** 새 폴더 생성 실행 */
  async _submitMkdir() {
    const name = (this._mkdirName || '').trim()
    if (!name) {
      UiUtil.showToast('warn', '폴더 이름을 입력하세요.')
      return
    }
    if (name.includes('/') || name.includes('\\')) {
      UiUtil.showToast('warn', '폴더 이름에 / 또는 \\ 는 사용할 수 없습니다.')
      return
    }

    const newPath = this.currentPath ? (this.currentPath.endsWith('/') ? this.currentPath + name : this.currentPath + '/' + name) : name
    try {
      await ServiceUtil.restPost('storage/mkdir', { path: newPath })
      this._closeMkdirDialog()
      UiUtil.showToast('success', `폴더 "${name}"이(가) 생성됐습니다.`)
      await this._refresh()
    } catch (e) {
      UiUtil.showToast('error', '폴더 생성에 실패했습니다.')
    }
  }

  /** 새로고침 */
  async _refresh() {
    await this._loadTree('')
    await this._fetchList(this.currentPath)
  }

  /** 파일 크기 포맷 */
  _formatSize(bytes) {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}

window.customElements.define('storage-browser', StorageBrowser)
