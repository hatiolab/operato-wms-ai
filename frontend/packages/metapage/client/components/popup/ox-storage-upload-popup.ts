import { css, html, LitElement } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'

import { ServiceUtil } from '../../utils/service-util'
import { UiUtil } from '../../utils/ui-util'

/**
 * 스토리지 파일 업로드 팝업 컴포넌트.
 *
 * - 스토리지 선택, 설명/태그 입력, 드래그&드롭 업로드 지원
 * - 업로드 완료 시 `upload-complete` 이벤트 발생 (detail: { name, attachment_id, path })
 * - 닫기/취소 시 `close` 이벤트 발생
 *
 * @example
 * ```html
 * <ox-storage-upload-popup
 *   ?open="${this._uploadOpen}"
 *   @upload-complete="${this._onUploadComplete}"
 *   @close="${() => { this._uploadOpen = false }}">
 * </ox-storage-upload-popup>
 * ```
 */
@customElement('ox-storage-upload-popup')
export class OxStorageUploadPopup extends LitElement {
  static styles = css`
    :host { display: contents; }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
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

    .field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #616161;
      margin-bottom: 4px;
    }

    .field select,
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

    .field select:focus,
    .field input[type='text']:focus,
    .field textarea:focus {
      border-color: #1976d2;
    }

    .field textarea {
      resize: vertical;
      min-height: 64px;
    }

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

    .drop-icon {
      font-size: 36px;
      display: block;
      margin-bottom: 8px;
    }

    .selected-file {
      margin-top: 8px;
      font-size: 13px;
      color: #212121;
      font-weight: 600;
      word-break: break-all;
    }

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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

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
   * 기본 선택할 스토리지 이름. 전달 시 스토리지 목록에서 이름이 일치하는 항목을 자동 선택한다.
   * 일치하는 항목이 없으면 default_flag 스토리지 또는 첫 번째 스토리지가 자동 선택된다.
   */
  @property({ type: String, attribute: 'storage-info-name' }) storageInfoName: string = 'default'

  @state() private _storages: any[] = []
  @state() private _selectedStorageId: string = ''
  @state() private _file: File | null = null
  @state() private _description: string = ''
  @state() private _tag: string = ''
  @state() private _uploading: boolean = false
  @state() private _dragOver: boolean = false

  @query('#file-input') private _fileInput!: HTMLInputElement

  render() {
    if (!this.open) return html``

    const canUpload = !!this._file && !!this._selectedStorageId && !this._uploading

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

          <!-- 스토리지 선택 -->
          <div class="field">
            <label>스토리지 *</label>
            <select
              .value="${this._selectedStorageId}"
              @change="${(e: Event) => { this._selectedStorageId = (e.target as HTMLSelectElement).value }}"
            >
              <option value="">${this.storageInfoName ? `-- ${this.storageInfoName} --` : '-- 스토리지 선택 --'}</option>
              ${this._storages.map(
                s => html`
                  <option value="${s.id}" ?selected="${s.id === this._selectedStorageId}">
                    ${s.name}${s.default_flag ? ' (기본)' : ''}
                  </option>
                `
              )}
            </select>
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
            ? html`
                <div class="progress">
                  <div class="spinner"></div>
                  업로드 중...
                </div>
              `
            : ''}

          <div class="actions">
            <button class="btn btn-default" ?disabled="${this._uploading}" @click="${this._close}">취소</button>
            <button class="btn btn-primary" ?disabled="${!canUpload}" @click="${this._submit}">업로드</button>
          </div>
        </div>
      </div>
    `
  }

  /** open 전환 시 상태 초기화 및 스토리지 목록 로드 */
  async updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open') && this.open) {
      this._reset()
      await this._loadStorages()
    }
  }

  /** 내부 상태 초기화 */
  private _reset() {
    this._file = null
    this._selectedStorageId = ''
    this._description = ''
    this._tag = ''
    this._uploading = false
    this._dragOver = false
  }

  /** 스토리지 목록 로드 — storageInfoName prop 우선, 없으면 default_flag 스토리지 자동 선택 */
  private async _loadStorages() {
    const data = await (ServiceUtil as any).restGet('storage/storages')
    if (data?.items) {
      this._storages = data.items
      if (this.storageInfoName) {
        const matched = this._storages.find((s: any) => s.name === this.storageInfoName)
        this._selectedStorageId = matched ? matched.id : (this._storages.find((s: any) => s.default_flag) || this._storages[0])?.id || ''
      } else {
        const def = this._storages.find((s: any) => s.default_flag) || this._storages[0]
        if (def) this._selectedStorageId = def.id
      }
    }
  }

  /** 파일 업로드 실행 */
  private async _submit() {
    if (!this._file || !this._selectedStorageId) return

    this._uploading = true

    try {
      const formData = new FormData()
      formData.append('file', this._file)
      formData.append('storage_id', this._selectedStorageId)
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

  /** 닫기 — close 이벤트 발생 */
  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))
  }

  /** 오버레이 클릭 시 닫기 (다이얼로그 외부 클릭) */
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
