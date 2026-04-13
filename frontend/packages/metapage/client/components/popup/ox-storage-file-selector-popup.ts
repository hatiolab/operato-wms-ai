import { css, html, LitElement, TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { ServiceUtil } from '../../utils/service-util'
import './ox-storage-upload-popup.js'

interface BrowseItem {
  name: string
  path: string
  type: 'FILE' | 'FOLDER'
  size?: number
  last_modified?: string
  has_children?: boolean
}

interface TreeNode {
  name: string
  path: string
  has_children: boolean
  _open: boolean
  _children: TreeNode[] | null
}

/**
 * 스토리지 파일 셀렉터 팝업 컴포넌트.
 *
 * domain-storage-browser.js 화면과 동일한 트리+목록 구조를 제공하되,
 * 관리/편집 기능(업로드, 폴더 추가, 삭제, 작업 메뉴)은 제외하고
 * 파일 선택에 특화된 팝업이다.
 *
 * `domain-mode` 속성에 따라 두 가지 모드로 동작한다.
 * - 기본: 스토리지 전체 트리 표시 (시스템 관리자용)
 * - domain-mode: 현재 로그인 도메인 하위 폴더/파일만 표시
 *
 * 파일 선택 완료 시 `file-selected` 이벤트 발생 (detail: BrowseItem)
 * 닫기/취소 시 `close` 이벤트 발생
 *
 * @example
 * ```html
 * <ox-storage-file-selector-popup
 *   ?open="${this._selectorOpen}"
 *   domain-mode
 *   @file-selected="${e => this._onFileSelected(e.detail)}"
 *   @close="${() => { this._selectorOpen = false }}">
 * </ox-storage-file-selector-popup>
 * ```
 */
@customElement('ox-storage-file-selector-popup')
export class OxStorageFileSelectorPopup extends LitElement {
  static styles = css`
    :host { display: contents; }

    /* ── 오버레이 ── */
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    /* ── 다이얼로그 ── */
    .dialog {
      background: #fff;
      border-radius: 8px;
      width: min(880px, 90vw);
      height: min(580px, 85vh);
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.22);
      overflow: hidden;
    }

    /* ── 헤더 ── */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid #e0e0e0;
      background: #fff;
      flex-shrink: 0;
    }

    .dialog-title {
      font-size: 15px;
      font-weight: 600;
      color: #212121;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .upload-btn {
      padding: 5px 12px;
      border: 1px solid #bdbdbd;
      border-radius: 5px;
      background: #f5f5f5;
      color: #424242;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .upload-btn:hover { background: #e0e0e0; border-color: #9e9e9e; }

    .close-btn {
      background: none;
      border: none;
      color: #757575;
      font-size: 20px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
    }

    .close-btn:hover { background: #f5f5f5; color: #212121; }

    /* ── 브레드크럼 ── */
    .breadcrumb {
      display: flex;
      align-items: center;
      padding: 7px 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      font-size: 12px;
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 2px;
    }

    .crumb {
      color: #1976d2;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
    }

    .crumb:hover { background: #e3f2fd; }
    .crumb.current { color: #424242; cursor: default; font-weight: 600; }
    .sep { color: #9e9e9e; padding: 0 2px; }

    /* ── 본문 레이아웃 ── */
    .body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ── 트리 패널 ── */
    .tree-panel {
      width: 220px;
      min-width: 160px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      background: #fafafa;
      flex-shrink: 0;
    }

    .tree-node {
      display: flex;
      align-items: center;
      padding: 5px 8px;
      cursor: pointer;
      font-size: 12px;
      color: #424242;
      white-space: nowrap;
      user-select: none;
    }

    .tree-node:hover { background: #f0f0f0; }
    .tree-node.selected { background: #e3f2fd; color: #1976d2; font-weight: 600; }

    .toggle {
      width: 16px;
      text-align: center;
      color: #9e9e9e;
      font-size: 10px;
      flex-shrink: 0;
    }

    .tree-icon { margin: 0 4px; flex-shrink: 0; }
    .tree-children { display: none; }
    .tree-children.open { display: block; }

    /* ── 파일 목록 패널 ── */
    .list-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #fff;
    }

    .list-toolbar {
      padding: 7px 16px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 12px;
      color: #757575;
      flex-shrink: 0;
    }

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
      padding: 9px 12px;
      text-align: left;
      font-weight: 600;
      color: #424242;
      border-bottom: 2px solid #e0e0e0;
      white-space: nowrap;
      z-index: 1;
    }

    tbody td {
      padding: 7px 12px;
      border-bottom: 1px solid #f0f0f0;
      color: #616161;
    }

    tbody tr { cursor: pointer; }
    tbody tr:hover { background: #fafafa; }
    tbody tr.file-selected { background: #e3f2fd; }
    tbody tr.file-selected td { color: #1565c0; font-weight: 600; }

    .col-name {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #1976d2;
    }

    .col-name.folder { color: #424242; }
    .col-right { text-align: right; }

    /* ── 빈 상태 / 로딩 ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #9e9e9e;
      font-size: 13px;
      gap: 8px;
    }

    .empty-icon { font-size: 40px; }
    .loading { padding: 24px; text-align: center; color: #9e9e9e; font-size: 13px; }

    /* ── 푸터 ── */
    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
      flex-shrink: 0;
      gap: 12px;
    }

    .selected-file-info {
      flex: 1;
      font-size: 13px;
      color: #1976d2;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .selected-file-info.empty { color: #9e9e9e; }

    .footer-actions { display: flex; gap: 8px; flex-shrink: 0; }

    .btn {
      padding: 7px 18px;
      border: none;
      border-radius: 5px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-primary { background: #1976d2; color: #fff; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { background: #e0e0e0; color: #9e9e9e; cursor: not-allowed; }
    .btn-default { background: #f5f5f5; color: #424242; border: 1px solid #e0e0e0; }
    .btn-default:hover { background: #eeeeee; }
  `

  /** 팝업 열림 여부 */
  @property({ type: Boolean }) open: boolean = false

  /**
   * 도메인 모드 — true 이면 현재 로그인 도메인 하위만 표시.
   * false(기본)이면 스토리지 전체 트리 표시.
   */
  @property({ type: Boolean, attribute: 'domain-mode' }) domainMode: boolean = false

  @state() private _domainRoot: string = ''
  @state() private _currentPath: string = ''
  @state() private _items: BrowseItem[] = []
  @state() private _treeNodes: TreeNode[] = []
  @state() private _loading: boolean = false
  @state() private _selectedFile: BrowseItem | null = null
  @state() private _uploadOpen: boolean = false

  render() {
    if (!this.open) return html``

    return html`
      <div class="overlay" @click="${this._onOverlayClick}">
        <div class="dialog">
          ${this._renderHeader()}
          ${this._renderBreadcrumb()}
          <div class="body">
            <div class="tree-panel">
              ${this._treeNodes.length === 0
                ? html`<div class="loading">로딩 중...</div>`
                : this._treeNodes.map(node => this._renderTreeNode(node, 0))}
            </div>
            <div class="list-panel">
              ${this._renderListPanel()}
            </div>
          </div>
          ${this._renderFooter()}
        </div>
      </div>

      <ox-storage-upload-popup
        ?open="${this._uploadOpen}"
        @upload-complete="${this._onUploadComplete}"
        @close="${() => { this._uploadOpen = false }}"
      ></ox-storage-upload-popup>
    `
  }

  /** 헤더 렌더링 */
  private _renderHeader(): TemplateResult {
    return html`
      <div class="dialog-header">
        <span class="dialog-title">📂 파일 선택</span>
        <div class="header-actions">
          <button class="upload-btn" @click="${() => { this._uploadOpen = true }}">⬆ 업로드</button>
          <button class="close-btn" @click="${this._close}">✕</button>
        </div>
      </div>
    `
  }

  /**
   * 브레드크럼 렌더링
   *
   * domain-mode: 도메인 루트를 '/'로 표시
   * 관리자 모드: 스토리지 루트를 '/'로 표시
   */
  private _renderBreadcrumb(): TemplateResult {
    const rootPath = this.domainMode ? this._domainRoot : ''
    const relativePath = this._currentPath === rootPath
      ? ''
      : this._currentPath.substring(rootPath ? rootPath.length + 1 : 0)
    const segments = relativePath ? relativePath.split('/').filter(Boolean) : []

    return html`
      <div class="breadcrumb">
        <span
          class="crumb ${segments.length === 0 ? 'current' : ''}"
          @click="${() => this._navigateTo(rootPath)}"
        >📁 /</span>
        ${segments.map((seg, idx) => {
          const prefix = rootPath ? rootPath + '/' : ''
          const path = prefix + segments.slice(0, idx + 1).join('/')
          const isCurrent = idx === segments.length - 1
          return html`
            <span class="sep">›</span>
            <span
              class="crumb ${isCurrent ? 'current' : ''}"
              @click="${() => this._navigateTo(path)}"
            >${seg}</span>
          `
        })}
      </div>
    `
  }

  /** 트리 노드 렌더링 (재귀) */
  private _renderTreeNode(node: TreeNode, depth: number): TemplateResult {
    const isSelected = node.path === this._currentPath
    return html`
      <div>
        <div
          class="tree-node ${isSelected ? 'selected' : ''}"
          style="padding-left: ${8 + depth * 16}px"
          @click="${() => this._navigateTo(node.path)}"
        >
          <span
            class="toggle"
            @click="${(e: Event) => { e.stopPropagation(); this._toggleTreeNode(node) }}"
          >${node.has_children ? (node._open ? '▼' : '▶') : ''}</span>
          <span class="tree-icon">📁</span>
          ${node.name}
        </div>
        ${node._open && node._children
          ? html`<div class="tree-children open">
              ${node._children.map(child => this._renderTreeNode(child, depth + 1))}
            </div>`
          : html``}
      </div>
    `
  }

  /** 파일 목록 패널 렌더링 */
  private _renderListPanel(): TemplateResult {
    if (this._loading) {
      return html`<div class="loading">로딩 중...</div>`
    }
    if (this._items.length === 0) {
      return html`
        <div class="empty-state">
          <span class="empty-icon">📂</span>
          <span>파일이 없습니다.</span>
        </div>
      `
    }

    const folders = this._items.filter(i => i.type === 'FOLDER')
    const files = this._items.filter(i => i.type === 'FILE')

    return html`
      <div class="list-toolbar">
        📁 ${folders.length}개 폴더&nbsp;&nbsp;📄 ${files.length}개 파일
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th class="col-right" style="width:100px">크기</th>
              <th style="width:150px">수정일</th>
            </tr>
          </thead>
          <tbody>
            ${this._items.map(item => html`
              <tr
                class="${item.type === 'FILE' && this._selectedFile?.path === item.path ? 'file-selected' : ''}"
                @click="${() => this._onItemClick(item)}"
                @dblclick="${() => this._onItemDblClick(item)}"
              >
                <td>
                  <span class="col-name ${item.type === 'FOLDER' ? 'folder' : ''}">
                    ${item.type === 'FOLDER' ? '📁' : '📄'} ${item.name}
                  </span>
                </td>
                <td class="col-right">${item.type === 'FILE' ? this._formatSize(item.size) : '-'}</td>
                <td>${item.last_modified ? item.last_modified.substring(0, 16).replace('T', ' ') : '-'}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `
  }

  /** 푸터 렌더링 — 선택 파일 정보 + 확인/취소 버튼 */
  private _renderFooter(): TemplateResult {
    return html`
      <div class="dialog-footer">
        <span class="selected-file-info ${this._selectedFile ? '' : 'empty'}">
          ${this._selectedFile
            ? html`📄 ${this._selectedFile.name}`
            : '파일을 선택하세요.'}
        </span>
        <div class="footer-actions">
          <button class="btn btn-default" @click="${this._close}">취소</button>
          <button
            class="btn btn-primary"
            ?disabled="${!this._selectedFile}"
            @click="${this._confirm}"
          >확인</button>
        </div>
      </div>
    `
  }

  /** open 전환 시 초기화 및 데이터 로드 */
  async updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open') && this.open) {
      this._reset()
      if (this.domainMode) {
        await this._initDomainMode()
      } else {
        await this._initAdminMode()
      }
    }
  }

  /** 내부 상태 초기화 */
  private _reset() {
    this._domainRoot = ''
    this._currentPath = ''
    this._items = []
    this._treeNodes = []
    this._loading = false
    this._selectedFile = null
  }

  /** 도메인 모드 초기화 — domain-root 조회 후 해당 경로부터 로드 */
  private async _initDomainMode() {
    const data = await (ServiceUtil as any).restGet('storage/domain-root')
    if (data?.domain_root) {
      this._domainRoot = data.domain_root
    }
    this._currentPath = this._domainRoot
    await this._loadTree(this._domainRoot)
    await this._loadFiles(this._domainRoot)
  }

  /** 관리자 모드 초기화 — 스토리지 루트부터 로드 */
  private async _initAdminMode() {
    this._currentPath = ''
    await this._loadTree('')
    await this._loadFiles('')
  }

  /** 지정 경로 하위 폴더를 트리 루트로 로드 */
  private async _loadTree(path: string) {
    const data = await (ServiceUtil as any).restGet(
      `storage/browse?path=${encodeURIComponent(path)}&folders_only=true`
    )
    if (data) {
      this._treeNodes = (data.items || []).map((i: any) => ({
        ...i,
        _open: false,
        _children: null
      }))
    }
  }

  /** 지정 경로의 파일/폴더 목록 로드 */
  private async _loadFiles(path: string) {
    this._loading = true
    this.requestUpdate()
    const data = await (ServiceUtil as any).restGet(
      `storage/browse?path=${encodeURIComponent(path)}`
    )
    this._loading = false
    if (data) {
      this._items = data.items || []
      this._selectedFile = null
    }
    this.requestUpdate()
  }

  /** 경로 이동 — domain-mode 시 도메인 루트 상위 이동 불가 */
  private async _navigateTo(path: string) {
    if (this.domainMode && this._domainRoot && !path.startsWith(this._domainRoot)) return
    this._currentPath = path
    await this._loadFiles(path)
  }

  /** 트리 노드 펼침/접힘 — 자식 폴더 lazy load */
  private async _toggleTreeNode(node: TreeNode) {
    node._open = !node._open
    if (node._open && !node._children) {
      const data = await (ServiceUtil as any).restGet(
        `storage/browse?path=${encodeURIComponent(node.path)}&folders_only=true`
      )
      node._children = data
        ? (data.items || []).map((i: any) => ({ ...i, _open: false, _children: null }))
        : []
    }
    this.requestUpdate()
  }

  /**
   * 항목 클릭 처리
   * - 폴더: 해당 폴더로 이동
   * - 파일: 선택 (하이라이트)
   */
  private _onItemClick(item: BrowseItem) {
    if (item.type === 'FOLDER') {
      this._navigateTo(item.path)
    } else {
      this._selectedFile = item
      this.requestUpdate()
    }
  }

  /**
   * 항목 더블클릭 처리
   * - 폴더: 해당 폴더로 이동
   * - 파일: 선택 즉시 확인 (file-selected 이벤트 발생)
   */
  private _onItemDblClick(item: BrowseItem) {
    if (item.type === 'FILE') {
      this._selectedFile = item
      this._confirm()
    }
  }

  /** 확인 — file-selected 이벤트 발생 후 닫기 */
  private _confirm() {
    if (!this._selectedFile) return
    this.dispatchEvent(
      new CustomEvent('file-selected', {
        bubbles: true,
        composed: true,
        detail: { ...this._selectedFile }
      })
    )
    this._close()
  }

  /** 업로드 완료 — 현재 폴더 파일 목록 갱신 */
  private async _onUploadComplete() {
    this._uploadOpen = false
    await this._loadFiles(this._currentPath)
  }

  /** 닫기 이벤트 발생 */
  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))
  }

  /** 오버레이 외부 클릭 시 닫기 */
  private _onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this._close()
  }

  private _formatSize(bytes?: number): string {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}
