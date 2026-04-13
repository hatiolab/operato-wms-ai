import { css, html, LitElement, TemplateResult } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'

import { ServiceUtil } from '../../utils/service-util'
import { UiUtil } from '../../utils/ui-util'

interface FolderNode {
  name: string
  path: string
  has_children: boolean
  _open: boolean
  _children: FolderNode[] | null
}

/**
 * 폴더 트리 기반 스토리지 파일 업로드 팝업 컴포넌트.
 *
 * `domain-mode` 속성에 따라 두 가지 모드로 동작한다.
 * - 기본 (domain-mode 없음): 스토리지 전체 폴더 트리 표시 (시스템 관리자용)
 * - domain-mode: 현재 로그인 도메인 하위 폴더 트리만 표시 (도메인 사용자용)
 *
 * 업로드 완료 시 `upload-complete` 이벤트 발생 (detail: { name, attachment_id, path })
 * 닫기/취소 시 `close` 이벤트 발생
 *
 * @example 관리자용 (전체 폴더)
 * ```html
 * <ox-storage-folder-upload-popup
 *   ?open="${this._uploadOpen}"
 *   @upload-complete="${this._onUploadComplete}"
 *   @close="${() => { this._uploadOpen = false }}">
 * </ox-storage-folder-upload-popup>
 * ```
 *
 * @example 도메인 사용자용 (도메인 폴더만)
 * ```html
 * <ox-storage-folder-upload-popup
 *   ?open="${this._uploadOpen}"
 *   domain-mode
 *   @upload-complete="${this._onUploadComplete}"
 *   @close="${() => { this._uploadOpen = false }}">
 * </ox-storage-folder-upload-popup>
 * ```
 */
@customElement('ox-storage-folder-upload-popup')
export class OxStorageFolderUploadPopup extends LitElement {
  static styles = css`
    :host { display: contents; }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: #fff;
      border-radius: 8px;
      padding: 24px;
      width: 480px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .dialog h3 {
      margin: 0;
      font-size: 16px;
      color: #212121;
    }

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

    .drop-icon { font-size: 36px; display: block; margin-bottom: 8px; }

    .selected-file {
      margin-top: 8px;
      font-size: 13px;
      color: #212121;
      font-weight: 600;
      word-break: break-all;
    }

    /* 필드 공통 */
    .field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #616161;
      margin-bottom: 4px;
    }

    .field input[type='text'],
    .field textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border: 1px solid #bdbdbd;
      border-radius: 5px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }

    .field input[type='text']:focus,
    .field textarea:focus { border-color: #1976d2; }

    .field textarea { resize: vertical; min-height: 64px; }

    /* 폴더 트리 */
    .tree-wrap {
      border: 1px solid #bdbdbd;
      border-radius: 5px;
      max-height: 180px;
      overflow-y: auto;
      background: #fafafa;
    }

    .tree-root {
      display: flex;
      align-items: center;
      padding: 5px 8px;
      cursor: pointer;
      font-size: 12px;
      color: #424242;
      user-select: none;
    }

    .tree-root:hover { background: #f0f0f0; }
    .tree-root.selected { background: #e3f2fd; color: #1976d2; font-weight: 600; }

    .tree-node {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
      color: #424242;
      white-space: nowrap;
      user-select: none;
    }

    .tree-node:hover { background: #f5f5f5; }
    .tree-node.selected { background: #e3f2fd; color: #1976d2; font-weight: 600; }

    .toggle {
      width: 14px;
      text-align: center;
      font-size: 9px;
      color: #9e9e9e;
      flex-shrink: 0;
    }

    .tree-children { display: none; }
    .tree-children.open { display: block; }

    .selected-path {
      font-size: 12px;
      color: #1976d2;
      padding: 5px 10px;
      background: #e3f2fd;
      border-radius: 4px;
      word-break: break-all;
      margin-top: 4px;
    }

    /* 업로드 진행 */
    .progress {
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
      width: 16px;
      height: 16px;
      border: 2px solid #bbdefb;
      border-top-color: #1976d2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* 버튼 */
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

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
    .btn-primary:disabled { background: #e0e0e0; color: #9e9e9e; cursor: not-allowed; }
    .btn-default { background: #f5f5f5; color: #424242; border: 1px solid #e0e0e0; }
    .btn-default:hover { background: #eeeeee; }
    .btn-default:disabled { color: #9e9e9e; cursor: not-allowed; }
  `

  /** 팝업 열림 여부 */
  @property({ type: Boolean }) open: boolean = false

  /**
   * 도메인 모드 — true 이면 현재 로그인 도메인 하위 폴더만 표시.
   * false(기본)이면 스토리지 전체 폴더 트리 표시 (관리자용).
   */
  @property({ type: Boolean, attribute: 'domain-mode' }) domainMode: boolean = false

  @state() private _domainRoot: string = ''
  @state() private _folderTree: FolderNode[] = []
  @state() private _selectedPath: string | null = null  // null = 미선택
  @state() private _file: File | null = null
  @state() private _description: string = ''
  @state() private _tag: string = ''
  @state() private _uploading: boolean = false
  @state() private _dragOver: boolean = false

  @query('#file-input') private _fileInput!: HTMLInputElement

  render() {
    if (!this.open) return html``

    const canUpload = this._file !== null && this._selectedPath !== null && !this._uploading
    const rootLabel = this.domainMode ? '/ (도메인 루트)' : '/ (루트)'
    const rootPath = this.domainMode ? this._domainRoot : ''

    return html`
      <div class="overlay" @click="${this._onOverlayClick}">
        <div class="dialog">
          <h3>⬆ 파일 업로드</h3>

          <!-- 드롭존 -->
          <div
            class="drop-zone ${this._dragOver ? 'drag-over' : ''}"
            @click="${() => this._fileInput.click()}"
            @dragover="${this._onDragOver}"
            @dragleave="${this._onDragLeave}"
            @drop="${this._onDrop}"
          >
            <span class="drop-icon">📄</span>
            ${this._file
              ? html`<div class="selected-file">📎 ${this._file.name} (${this._formatSize(this._file.size)})</div>`
              : html`<div>파일을 끌어다 놓거나 클릭하여 선택</div>`}
          </div>
          <input id="file-input" type="file" style="display:none" @change="${this._onFileSelect}" />

          <!-- 폴더 트리 -->
          <div class="field">
            <label>저장 폴더 *</label>
            <div class="tree-wrap">
              <!-- 루트 노드 -->
              <div
                class="tree-root ${this._selectedPath === rootPath ? 'selected' : ''}"
                @click="${() => { this._selectedPath = rootPath; this.requestUpdate() }}"
              >
                📁 ${rootLabel}
              </div>
              ${this._renderNodes(this._folderTree, 0)}
            </div>
            <!-- 선택 경로 표시 -->
            ${this._selectedPath !== null
              ? html`<div class="selected-path">📁 ${this._displayPath(this._selectedPath)}</div>`
              : ''}
          </div>

          <!-- 설명 -->
          <div class="field">
            <label>설명</label>
            <textarea
              placeholder="첨부파일에 대한 설명을 입력하세요"
              .value="${this._description}"
              @input="${(e: Event) => { this._description = (e.target as HTMLTextAreaElement).value }}"
            ></textarea>
          </div>

          <!-- 태그 -->
          <div class="field">
            <label>태그</label>
            <input
              type="text"
              placeholder="태그 (선택)"
              .value="${this._tag}"
              @input="${(e: Event) => { this._tag = (e.target as HTMLInputElement).value }}"
            />
          </div>

          <!-- 업로드 진행 중 -->
          ${this._uploading
            ? html`<div class="progress"><div class="spinner"></div> 업로드 중...</div>`
            : ''}

          <div class="actions">
            <button class="btn btn-default" ?disabled="${this._uploading}" @click="${this._close}">취소</button>
            <button class="btn btn-primary" ?disabled="${!canUpload}" @click="${this._submit}">업로드</button>
          </div>
        </div>
      </div>
    `
  }

  /** open 전환 시 초기화 및 폴더 트리 로드 */
  async updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open') && this.open) {
      this._reset()
      if (this.domainMode) {
        await this._initDomainMode()
      } else {
        await this._loadFolderTree('')
      }
    }
  }

  /** 내부 상태 초기화 */
  private _reset() {
    this._domainRoot = ''
    this._folderTree = []
    this._selectedPath = null
    this._file = null
    this._description = ''
    this._tag = ''
    this._uploading = false
    this._dragOver = false
  }

  /**
   * 도메인 모드 초기화 — domain-root API 로 도메인 루트 경로를 받아
   * 해당 경로 하위 폴더를 트리로 로드한다.
   */
  private async _initDomainMode() {
    const data = await (ServiceUtil as any).restGet('storage/domain-root')
    if (data?.domain_root) {
      this._domainRoot = data.domain_root
    }
    await this._loadFolderTree(this._domainRoot)
  }

  /** 지정 경로 하위 폴더 목록을 트리 루트로 로드 */
  private async _loadFolderTree(path: string) {
    const data = await (ServiceUtil as any).restGet(
      `storage/browse?path=${encodeURIComponent(path)}&folders_only=true`
    )
    if (data) {
      this._folderTree = (data.items || []).map((i: any) => ({
        ...i,
        _open: false,
        _children: null
      }))
    }
  }

  /** 트리 노드 펼침/접힘 — 자식 폴더 lazy load */
  private async _toggleNode(node: FolderNode) {
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

  /** 폴더 트리 노드 재귀 렌더링 */
  private _renderNodes(nodes: FolderNode[], depth: number): TemplateResult[] {
    return nodes.map(
      node => html`
        <div>
          <div
            class="tree-node ${this._selectedPath === node.path ? 'selected' : ''}"
            style="padding-left: ${8 + depth * 14}px"
            @click="${() => { this._selectedPath = node.path; this.requestUpdate() }}"
          >
            <span
              class="toggle"
              @click="${(e: Event) => { e.stopPropagation(); this._toggleNode(node) }}"
            >
              ${node.has_children ? (node._open ? '▼' : '▶') : ''}
            </span>
            📁 ${node.name}
          </div>
          ${node._open && node._children
            ? html`<div class="tree-children open">${this._renderNodes(node._children, depth + 1)}</div>`
            : html``}
        </div>
      `
    )
  }

  /**
   * 선택된 경로를 사용자에게 보여줄 표시 문자열로 변환.
   * - 관리자 모드: '/{path}'
   * - 도메인 모드: 도메인 루트를 '/'로 치환하여 상대 경로 표시
   */
  private _displayPath(path: string): string {
    if (this.domainMode && this._domainRoot) {
      const rel = path === this._domainRoot ? '' : path.substring(this._domainRoot.length + 1)
      return '/' + rel
    }
    return path === '' ? '/' : '/' + path
  }

  /** 파일 업로드 실행 */
  private async _submit() {
    if (this._file === null || this._selectedPath === null) return

    this._uploading = true

    try {
      const formData = new FormData()
      formData.append('file', this._file)
      formData.append('target_path', this._selectedPath)
      if (this._description) formData.append('description', this._description)
      if (this._tag) formData.append('tag', this._tag)

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

      this.dispatchEvent(
        new CustomEvent('upload-complete', {
          bubbles: true,
          composed: true,
          detail: { name: result.name, attachment_id: result.attachment_id, path: result.path }
        })
      )
      this._close()
    } catch (e: any) {
      ;(UiUtil as any).showToast('error', `업로드 실패: ${e.message}`)
      this._uploading = false
    }
  }

  /** 닫기 이벤트 발생 */
  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))
  }

  private _onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this._close()
  }

  private _onDragOver(e: DragEvent) {
    e.preventDefault()
    this._dragOver = true
  }

  private _onDragLeave() {
    this._dragOver = false
  }

  private _onDrop(e: DragEvent) {
    e.preventDefault()
    this._dragOver = false
    const file = e.dataTransfer?.files?.[0]
    if (file) this._file = file
  }

  private _onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) this._file = file
  }

  private _formatSize(bytes: number): string {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}
