import { css, html } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'
import '@operato-app/metapage/dist-client/components/popup/ox-storage-upload-popup.js'

/**
 * 도메인 스토리지 파일 브라우저 화면
 *
 * - storage-browser.js 와 동일한 기능이나 로그인한 도메인 하위 경로만 접근 가능
 * - 업로드 경로: {storage.path}/{domainId}/[dirRule]/ (백엔드 buildBasePath 자동 적용)
 * - 브라우징 루트: GET /rest/storage/domain-root 로 받은 domain_root (= domainId 문자열)
 */
class DomainStorageBrowser extends localize(i18next)(PageView) {
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

        /* 액션 버튼 */
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

        /* 드롭다운 액션 메뉴 */
        .action-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
        }
        .action-menu {
          position: fixed;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          z-index: 2001;
          min-width: 160px;
          padding: 4px 0;
          overflow: hidden;
        }
        .action-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          font-size: 13px;
          color: #424242;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
        }
        .action-menu-item:hover { background: #f5f5f5; }
        .action-menu-item.danger { color: #d32f2f; }
        .action-menu-item.danger:hover { background: #fdecea; }
        .action-menu-divider {
          height: 1px;
          background: #f0f0f0;
          margin: 4px 0;
        }

        /* 이미지 미리보기 팝업 */
        .image-preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
        }
        .image-preview-box {
          position: relative;
          background: #1a1a1a;
          border-radius: 8px;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5);
        }
        .image-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #111;
          color: #e0e0e0;
          font-size: 13px;
          flex-shrink: 0;
        }
        .image-preview-header .file-name {
          font-weight: 600;
          word-break: break-all;
        }
        .image-preview-close {
          background: none;
          border: none;
          color: #bdbdbd;
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
          flex-shrink: 0;
        }
        .image-preview-close:hover { color: #fff; }
        .image-preview-body {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 16px;
          flex: 1;
        }
        .image-preview-body img {
          max-width: 85vw;
          max-height: calc(90vh - 60px);
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }
        .image-preview-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 10px 16px;
          background: #111;
          flex-shrink: 0;
        }

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
      _domainRoot: String,
      _mkdirDialogOpen: Boolean,
      _mkdirName: String,
      _uploadOpen: Boolean,
      _actionMenu: Object,
      _imagePreview: Object
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
    this._domainRoot = ''
    this._mkdirDialogOpen = false
    this._mkdirName = ''
    this._uploadOpen = false
    this._actionMenu = null
    this._imagePreview = null
  }

  get context() {
    return { title: TermsUtil.tMenu('domain-storage-browser') }
  }

  /** 전체 화면 렌더링 */
  render() {
    return html`
      <div class="page-header">
        <h2>${TermsUtil.tMenu('domain-storage-browser')}</h2>
        <div class="header-actions">
          <button class="btn btn-primary" @click="${() => { this._uploadOpen = true; this.requestUpdate() }}">⬆ ${TermsUtil.tButton('upload')}</button>
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

      <ox-storage-upload-popup
        ?open="${this._uploadOpen}"
        @upload-complete="${this._onUploadComplete}"
        @close="${() => { this._uploadOpen = false; this.requestUpdate() }}">
      </ox-storage-upload-popup>
      ${this._mkdirDialogOpen ? this._renderMkdirDialog() : ''}
      ${this._actionMenu ? this._renderActionMenu() : ''}
      ${this._imagePreview ? this._renderImagePreview() : ''}
    `
  }

  /**
   * 브레드크럼 렌더링 — 도메인 루트를 '/'로 표시하고 하위 경로만 세그먼트로 표시
   *
   * currentPath 예시: "11" → "/" / "11/folder" → "/folder" / "11/folder/sub" → "/folder/sub"
   */
  _renderBreadcrumb() {
    if (!this._domainRoot) return html``
    const relativePath = this.currentPath === this._domainRoot
      ? ''
      : this.currentPath.substring(this._domainRoot.length + 1)
    const segments = relativePath ? relativePath.split('/').filter(Boolean) : []
    return html`
      <div class="breadcrumb">
        <span class="crumb ${segments.length === 0 ? 'current' : ''}"
              @click="${() => this._navigateTo(this._domainRoot)}">📁 /</span>
        ${segments.map((seg, idx) => {
      const path = this._domainRoot + '/' + segments.slice(0, idx + 1).join('/')
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
    const isSelected = node.path === this.currentPath
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
          ${node.name}
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
                  <button class="action-btn" @click="${e => this._showActionMenu(item, e)}">···</button>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `
  }

  /** 페이지 활성화 시 도메인 루트 조회 후 초기 로드 */
  async pageUpdated(_changes, _lifecycle) {
    if (this.active) {
      await this._initDomainRoot()
    }
  }

  /** 현재 도메인 루트 경로를 조회하고 초기 트리/목록을 로드 */
  async _initDomainRoot() {
    const data = await ServiceUtil.restGet('storage/domain-root')
    if (!data) return
    this._domainRoot = data.domain_root   // e.g. "11"
    this.currentPath = this._domainRoot
    await this._loadTree(this._domainRoot)
    await this._fetchList(this._domainRoot)
  }

  /** 지정 경로 하위 폴더 목록을 트리에 로드 */
  async _loadTree(path) {
    const data = await ServiceUtil.restGet(`storage/browse?path=${encodeURIComponent(path)}&folders_only=true`)
    if (!data) return
    this.treeNodes = data.items.map(item => ({ ...item, _open: false, _children: null }))
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

  /** 경로 이동 — 도메인 루트 상위로는 이동 불가 */
  async _navigateTo(path) {
    if (!path.startsWith(this._domainRoot)) return
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

  /** 액션 메뉴 열기 — 버튼 위치 기준으로 드롭다운 표시 */
  _showActionMenu(item, event) {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    this._actionMenu = { item, x: rect.left, y: rect.bottom + 4 }
    this.requestUpdate()
  }

  /** 액션 메뉴 닫기 */
  _closeActionMenu() {
    this._actionMenu = null
    this.requestUpdate()
  }

  /** 액션 메뉴 드롭다운 렌더링 */
  _renderActionMenu() {
    const { item, x, y } = this._actionMenu
    const menuStyle = `left:${x}px; top:${y}px;`
    const isImage = item.type === 'FILE' && this._isImageFile(item.name)
    return html`
      <div class="action-menu-overlay" @click="${this._closeActionMenu}"></div>
      <div class="action-menu" style="${menuStyle}">
        ${isImage ? html`
          <div class="action-menu-item"
            @click="${() => { this._closeActionMenu(); this._openImagePreview(item) }}">
            🖼 이미지 보기
          </div>
        ` : ''}
        ${item.type === 'FILE' ? html`
          <div class="action-menu-item"
            @click="${() => { this._closeActionMenu(); this._downloadFile(item) }}">
            ⬇ 다운로드
          </div>
        ` : ''}
        <div class="action-menu-item"
          @click="${() => {
            navigator.clipboard.writeText(item.path)
            UiUtil.showToast('info', '경로가 클립보드에 복사됐습니다.')
            this._closeActionMenu()
          }}">
          📋 경로 복사
        </div>
        <div class="action-menu-divider"></div>
        <div class="action-menu-item danger"
          @click="${() => { this._closeActionMenu(); this._confirmDelete([item.path]) }}">
          🗑 삭제
        </div>
      </div>
    `
  }

  /** 파일명이 이미지 확장자인지 확인 */
  _isImageFile(name) {
    if (!name) return false
    const ext = name.toLowerCase().split('.').pop()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
  }

  /** 이미지 미리보기 팝업 열기 */
  _openImagePreview(item) {
    this._imagePreview = {
      name: item.name,
      url: `/rest/storage/download?path=${encodeURIComponent(item.path)}`
    }
    this.requestUpdate()
  }

  /** 이미지 미리보기 팝업 닫기 */
  _closeImagePreview() {
    this._imagePreview = null
    this.requestUpdate()
  }

  /** 이미지 미리보기 팝업 렌더링 */
  _renderImagePreview() {
    const { name, url } = this._imagePreview
    return html`
      <div class="image-preview-overlay"
        @click="${e => { if (e.target === e.currentTarget) this._closeImagePreview() }}">
        <div class="image-preview-box">
          <div class="image-preview-header">
            <span class="file-name">🖼 ${name}</span>
            <button class="image-preview-close" @click="${this._closeImagePreview}">✕</button>
          </div>
          <div class="image-preview-body">
            <img src="${url}" alt="${name}"
              @error="${e => { e.target.alt = '이미지를 불러올 수 없습니다.' }}" />
          </div>
          <div class="image-preview-footer">
            <button class="btn btn-default" @click="${this._closeImagePreview}">닫기</button>
            <button class="btn btn-primary"
              @click="${() => { const a = document.createElement('a'); a.href = url; a.download = name; a.click() }}">
              ⬇ 다운로드
            </button>
          </div>
        </div>
      </div>
    `
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
    let successCount = 0
    for (const path of paths) {
      try {
        const response = await fetch('/rest/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ path })
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const msg = data?.message || data?.error || data?.reason || '삭제 실패'
          UiUtil.showToast('error', msg)
        } else {
          successCount++
        }
      } catch (e) {
        UiUtil.showToast('error', `삭제 중 오류: ${e.message}`)
      }
    }
    if (successCount > 0) {
      UiUtil.showToast('success', `${successCount}개 항목이 삭제됐습니다.`)
    }
    this.selectedPaths = []
    await this._refresh()
  }

  /** 업로드 완료 이벤트 핸들러 — 토스트 표시 후 목록 갱신 */
  async _onUploadComplete(e) {
    UiUtil.showToast('success', `"${e.detail.name}" 업로드 완료`)
    await this._refresh()
  }

  /** 새 폴더 다이얼로그 열기 */
  _openMkdirDialog() {
    this._mkdirName = ''
    this._mkdirDialogOpen = true
    this.requestUpdate()
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

  /** 새 폴더 다이얼로그 렌더링 — 생성 위치를 도메인 루트 기준 상대경로로 표시 */
  _renderMkdirDialog() {
    const relativePath = this.currentPath === this._domainRoot
      ? ''
      : this.currentPath.substring(this._domainRoot.length + 1)
    const currentLabel = relativePath ? `/${relativePath}` : '/'
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

    const newPath = this.currentPath.endsWith('/')
      ? this.currentPath + name
      : this.currentPath + '/' + name
    try {
      await ServiceUtil.restPost('storage/mkdir', { path: newPath })
      this._closeMkdirDialog()
      UiUtil.showToast('success', `폴더 "${name}"이(가) 생성됐습니다.`)
      await this._refresh()
    } catch (e) {
      UiUtil.showToast('error', '폴더 생성에 실패했습니다.')
    }
  }

  /** 새로고침 — 트리는 도메인 루트부터, 목록은 현재 경로 */
  async _refresh() {
    await this._loadTree(this._domainRoot)
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

window.customElements.define('domain-storage-browser', DomainStorageBrowser)
