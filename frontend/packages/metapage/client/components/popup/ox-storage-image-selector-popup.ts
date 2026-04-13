import { css, html, LitElement, TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { ServiceUtil } from '../../utils/service-util'
import './ox-storage-upload-popup.js'

interface ImageItem {
  name: string
  path: string
  attachment_id?: string
  size?: number
  last_modified?: string
  description?: string
}

interface TreeNode {
  name: string
  path: string
  has_children: boolean
  _open: boolean
  _children: TreeNode[] | null
}

/** 이미지 파일 확장자 목록 */
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'])

/**
 * 스토리지 이미지 셀렉터 팝업 컴포넌트.
 *
 * 좌측 폴더 트리에서 폴더를 선택하면 우측에 해당 폴더의 이미지 파일만
 * 썸네일 카드 형태로 표시한다. 폴더는 우측 목록에 표시하지 않는다.
 *
 * 각 썸네일 카드에는 이미지 미리보기, 파일명, 크기, 설명(있는 경우)을 표시한다.
 *
 * `domain-mode` 속성에 따라 두 가지 모드로 동작한다.
 * - 기본: 스토리지 전체 트리 표시 (시스템 관리자용)
 * - domain-mode: 현재 로그인 도메인 하위 폴더/파일만 표시
 *
 * 이미지 선택 완료 시 `image-selected` 이벤트 발생 (detail: ImageItem)
 * 닫기/취소 시 `close` 이벤트 발생
 *
 * @example
 * ```html
 * <ox-storage-image-selector-popup
 *   ?open="${this._selectorOpen}"
 *   domain-mode
 *   @image-selected="${e => this._onImageSelected(e.detail)}"
 *   @close="${() => { this._selectorOpen = false }}">
 * </ox-storage-image-selector-popup>
 * ```
 */
@customElement('ox-storage-image-selector-popup')
export class OxStorageImageSelectorPopup extends LitElement {
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
      width: min(960px, 92vw);
      height: min(620px, 88vh);
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

    /* ── 이미지 그리드 패널 ── */
    .grid-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #fff;
    }

    .grid-toolbar {
      padding: 7px 16px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 12px;
      color: #757575;
      flex-shrink: 0;
    }

    .grid-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
      gap: 14px;
      align-content: start;
    }

    /* ── 썸네일 카드 ── */
    .image-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      background: #fafafa;
      display: flex;
      flex-direction: column;
    }

    .image-card:hover {
      border-color: #90caf9;
      box-shadow: 0 2px 10px rgba(25, 118, 210, 0.18);
    }

    .image-card.selected {
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.25);
    }

    /* 썸네일 영역 — 1:1 비율 */
    .card-thumb-wrap {
      width: 100%;
      aspect-ratio: 1;
      overflow: hidden;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .card-thumb-error {
      font-size: 36px;
      color: #bdbdbd;
    }

    /* 카드 하단 정보 */
    .card-info {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .card-name {
      font-size: 12px;
      font-weight: 600;
      color: #212121;
      word-break: break-all;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-size {
      font-size: 11px;
      color: #9e9e9e;
    }

    .card-desc {
      font-size: 11px;
      color: #616161;
      margin-top: 2px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── 빈 상태 / 로딩 ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #9e9e9e;
      font-size: 13px;
      gap: 10px;
    }

    .empty-icon { font-size: 48px; }
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

    .selected-info {
      flex: 1;
      font-size: 13px;
      color: #1976d2;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .selected-info.empty { color: #9e9e9e; }

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
  @state() private _images: ImageItem[] = []
  @state() private _treeNodes: TreeNode[] = []
  @state() private _loading: boolean = false
  @state() private _selectedImage: ImageItem | null = null
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
            <div class="grid-panel">
              ${this._renderGridPanel()}
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
        <span class="dialog-title">🖼 이미지 선택</span>
        <div class="header-actions">
          <button class="upload-btn" @click="${() => { this._uploadOpen = true }}">⬆ 업로드</button>
          <button class="close-btn" @click="${this._close}">✕</button>
        </div>
      </div>
    `
  }

  /** 브레드크럼 렌더링 */
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

  /** 이미지 그리드 패널 렌더링 */
  private _renderGridPanel(): TemplateResult {
    if (this._loading) {
      return html`<div class="loading">로딩 중...</div>`
    }
    if (this._images.length === 0) {
      return html`
        <div class="empty-state">
          <span class="empty-icon">🖼</span>
          <span>이미지 파일이 없습니다.</span>
        </div>
      `
    }

    return html`
      <div class="grid-toolbar">
        🖼 ${this._images.length}개 이미지
      </div>
      <div class="grid-wrap">
        <div class="image-grid">
          ${this._images.map(img => this._renderImageCard(img))}
        </div>
      </div>
    `
  }

  /** 썸네일 카드 렌더링 */
  private _renderImageCard(img: ImageItem): TemplateResult {
    const isSelected = this._selectedImage?.path === img.path
    const thumbUrl = `/rest/storage/download?path=${encodeURIComponent(img.path)}`

    return html`
      <div
        class="image-card ${isSelected ? 'selected' : ''}"
        @click="${() => this._selectImage(img)}"
        @dblclick="${() => { this._selectImage(img); this._confirm() }}"
      >
        <div class="card-thumb-wrap">
          <img
            class="card-thumb"
            src="${thumbUrl}"
            alt="${img.name}"
            loading="lazy"
            @error="${(e: Event) => this._onThumbError(e)}"
          />
        </div>
        <div class="card-info">
          <div class="card-name" title="${img.name}">${img.name}</div>
          <div class="card-size">${this._formatSize(img.size)}</div>
          ${img.description
            ? html`<div class="card-desc" title="${img.description}">${img.description}</div>`
            : html``}
        </div>
      </div>
    `
  }

  /** 썸네일 로드 실패 시 대체 아이콘 표시 */
  private _onThumbError(e: Event) {
    const img = e.target as HTMLImageElement
    img.style.display = 'none'
    const wrap = img.parentElement
    if (wrap) {
      const icon = document.createElement('span')
      icon.className = 'card-thumb-error'
      icon.textContent = '🖼'
      wrap.appendChild(icon)
    }
  }

  /** 푸터 렌더링 */
  private _renderFooter(): TemplateResult {
    return html`
      <div class="dialog-footer">
        <span class="selected-info ${this._selectedImage ? '' : 'empty'}">
          ${this._selectedImage
            ? html`🖼 ${this._selectedImage.name}`
            : '이미지를 선택하세요.'}
        </span>
        <div class="footer-actions">
          <button class="btn btn-default" @click="${this._close}">취소</button>
          <button
            class="btn btn-primary"
            ?disabled="${!this._selectedImage}"
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
    this._images = []
    this._treeNodes = []
    this._loading = false
    this._selectedImage = null
  }

  /** 도메인 모드 초기화 */
  private async _initDomainMode() {
    const data = await (ServiceUtil as any).restGet('storage/domain-root')
    if (data?.domain_root) {
      this._domainRoot = data.domain_root
    }
    this._currentPath = this._domainRoot
    await this._loadTree(this._domainRoot)
    // 'image' 폴더가 있으면 자동 선택, 없으면 루트 표시
    const moved = await this._autoSelectImageFolder()
    if (!moved) {
      await this._loadImages(this._domainRoot)
    }
  }

  /** 관리자 모드 초기화 */
  private async _initAdminMode() {
    this._currentPath = ''
    await this._loadTree('')
    // 'image' 폴더가 있으면 자동 선택, 없으면 루트 표시
    const moved = await this._autoSelectImageFolder()
    if (!moved) {
      await this._loadImages('')
    }
  }

  /**
   * 트리 최상위 노드 중 이름이 'image'인 폴더를 찾아 자동으로 선택한다.
   * 해당 폴더를 트리에서 펼치고 이미지 목록을 로드한다.
   * @returns 'image' 폴더를 찾아 이동했으면 true, 없으면 false
   */
  private async _autoSelectImageFolder(): Promise<boolean> {
    const imageNode = this._treeNodes.find(
      node => node.name.toLowerCase() === 'image'
    )
    if (!imageNode) return false

    // 트리에서 펼침 처리
    imageNode._open = true
    if (!imageNode._children) {
      const data = await (ServiceUtil as any).restGet(
        `storage/browse?path=${encodeURIComponent(imageNode.path)}&folders_only=true`
      )
      imageNode._children = data
        ? (data.items || []).map((i: any) => ({ ...i, _open: false, _children: null }))
        : []
    }

    // 해당 폴더로 이동
    this._currentPath = imageNode.path
    await this._loadImages(imageNode.path)
    return true
  }

  /** 지정 경로 하위 폴더 트리 로드 */
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

  /**
   * 지정 경로의 이미지 파일 목록 로드.
   * browse API 결과에서 이미지 확장자 파일만 필터링한다.
   */
  private async _loadImages(path: string) {
    this._loading = true
    this.requestUpdate()
    const data = await (ServiceUtil as any).restGet(
      `storage/browse?path=${encodeURIComponent(path)}`
    )
    this._loading = false
    if (data) {
      this._images = (data.items || [])
        .filter((i: any) => i.type === 'FILE' && this._isImageFile(i.name))
        .map((i: any) => ({
          name: i.name,
          path: i.path,
          attachment_id: i.attachment_id,
          size: i.size,
          last_modified: i.last_modified,
          description: i.description
        }))
      this._selectedImage = null
    }
    this.requestUpdate()
  }

  /** 경로 이동 */
  private async _navigateTo(path: string) {
    if (this.domainMode && this._domainRoot && !path.startsWith(this._domainRoot)) return
    this._currentPath = path
    await this._loadImages(path)
  }

  /** 트리 노드 펼침/접힘 */
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

  /** 이미지 선택 */
  private _selectImage(img: ImageItem) {
    this._selectedImage = img
    this.requestUpdate()
  }

  /** 확인 — image-selected 이벤트 발생 후 닫기 */
  private _confirm() {
    if (!this._selectedImage) return
    this.dispatchEvent(
      new CustomEvent('image-selected', {
        bubbles: true,
        composed: true,
        detail: { ...this._selectedImage }
      })
    )
    this._close()
  }

  /** 업로드 완료 — 현재 폴더 이미지 목록 갱신 */
  private async _onUploadComplete() {
    this._uploadOpen = false
    await this._loadImages(this._currentPath)
  }

  /** 닫기 이벤트 발생 */
  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))
  }

  /** 오버레이 외부 클릭 시 닫기 */
  private _onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this._close()
  }

  /** 파일명이 이미지 확장자인지 확인 */
  private _isImageFile(name: string): boolean {
    const ext = (name || '').toLowerCase().split('.').pop() || ''
    return IMAGE_EXTS.has(ext)
  }

  private _formatSize(bytes?: number): string {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}
