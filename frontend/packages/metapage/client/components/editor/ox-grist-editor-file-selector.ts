import { OxGristEditor } from '@operato/data-grist'
import { customElement, property, state } from 'lit/decorators.js'
import { css, html } from 'lit'
import { ScrollbarStyles } from '@operato/styles'
import '../popup/ox-storage-file-selector-popup.js'
import '../popup/ox-storage-upload-popup.js'

/**
 * 파일 경로를 값으로 저장하는 Grist 셀 에디터.
 *
 * 더블클릭 또는 Enter 키로 열리는 패널에서
 * - 스토리지 파일 브라우저로 기존 파일 선택 (ox-storage-file-selector-popup)
 * - 새 파일 업로드 (ox-storage-upload-popup)
 * 두 가지 방식 중 하나로 파일을 지정할 수 있다.
 *
 * 저장 값: 스토리지 기준 상대 경로 (예: "16/uploads/abc123.pdf")
 *
 * 컬럼 설정 예:
 * ```js
 * {
 *   type: 'string',
 *   name: 'file_path',
 *   editor: { type: 'file-selector', domainMode: true }
 * }
 * ```
 */
@customElement('ox-grist-editor-file-selector')
export class OxGristEditorFileSelector extends OxGristEditor {
  static styles = [
    ScrollbarStyles,
    css`
      :host {
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        border-radius: var(--border-radius);
        padding: 6px 10px;
        min-height: 48px;
        border: var(--file-uploader-border);
        background-color: var(--md-sys-color-background);
        font: var(--file-uploader-font) !important;
        color: var(--file-uploader-color);
        overflow: visible;
        cursor: pointer;
        user-select: none;
      }

      /* ── 파일 표시 영역 ── */
      .file-display {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        overflow: hidden;
      }

      .file-name {
        font-size: 13px;
        color: #212121;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }

      .placeholder {
        font-size: 13px;
        color: #9e9e9e;
        font-style: italic;
      }

      /* ── 버튼 그룹 ── */
      .btn-group {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        flex-shrink: 0;
      }

      .action-btn {
        padding: 3px 10px;
        border: 1px solid #bdbdbd;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        background: #f5f5f5;
        color: #424242;
        white-space: nowrap;
        transition: background 0.15s;
      }

      .action-btn:hover { background: #eeeeee; border-color: #9e9e9e; }

      .action-btn.primary {
        background: #1976d2;
        color: #fff;
        border-color: #1976d2;
      }

      .action-btn.primary:hover { background: #1565c0; }

      .action-btn.danger {
        color: #d32f2f;
        border-color: #ef9a9a;
      }

      .action-btn.danger:hover { background: #fdecea; border-color: #d32f2f; }

      /* ── 오버레이 힌트 ── */
      [overlay] {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        background-color: var(--md-sys-color-surface, #fff);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        transition: opacity 0.15s;
      }

      :host(:hover) [overlay] { opacity: 0.08; }
    `
  ]

  /**
   * 도메인 모드 — true 이면 파일 셀렉터를 현재 도메인 하위로 제한.
   * 컬럼 설정에서 `editor: { domainMode: true }` 로 지정.
   */
  @property({ type: Boolean, attribute: 'domain-mode' }) domainMode: boolean = true

  /** 파일 셀렉터 팝업 열림 여부 */
  @state() private _selectorOpen: boolean = false

  /** 업로드 팝업 열림 여부 */
  @state() private _uploadOpen: boolean = false

  /** 더블클릭 — 파일 셀렉터 열기 */
  _ondblclick(e: MouseEvent) {
    e.stopPropagation()
    this._selectorOpen = true
    this.requestUpdate()
  }

  /** Enter 키 — 파일 셀렉터 열기 */
  _onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.stopPropagation()
      this._selectorOpen = true
      this.requestUpdate()
    }
  }

  /** 파일 셀렉터에서 파일 선택 완료 */
  private _onFileSelected(e: CustomEvent) {
    const { path } = e.detail
    this._emitChange(path)
    this._selectorOpen = false
    this.requestUpdate()
  }

  /** 업로드 완료 — 업로드된 파일 경로를 값으로 저장 */
  private _onUploadComplete(e: CustomEvent) {
    const { path } = e.detail
    this._emitChange(path)
    this._uploadOpen = false
    this.requestUpdate()
  }

  /** 값 변경 이벤트 발행 */
  private _emitChange(newValue: string) {
    this.dispatchEvent(
      new CustomEvent('field-change', {
        bubbles: true,
        composed: true,
        detail: {
          before: this.value,
          after: newValue,
          record: this.record,
          column: this.column,
          row: this.row
        }
      })
    )
  }

  /** 선택 파일 초기화 */
  private _clear(e: MouseEvent) {
    e.stopPropagation()
    this._emitChange('')
  }

  /**
   * 에디터 셀 템플릿.
   *
   * 두 팝업 컴포넌트를 함께 렌더링하고 버튼으로 각각 열 수 있도록 한다.
   */
  get editorTemplate() {
    const fileName = this._extractFileName(this.value as string)

    return html`
      <!-- 현재 선택된 파일 표시 -->
      <div class="file-display">
        ${fileName
          ? html`<span class="file-name" title="${this.value}">📄 ${fileName}</span>`
          : html`<span class="placeholder">파일을 선택하세요</span>`}
      </div>

      <!-- 액션 버튼 -->
      <div class="btn-group">
        <button
          class="action-btn primary"
          @click="${(e: MouseEvent) => { e.stopPropagation(); this._selectorOpen = true; this.requestUpdate() }}"
        >📂 선택</button>
        <button
          class="action-btn"
          @click="${(e: MouseEvent) => { e.stopPropagation(); this._uploadOpen = true; this.requestUpdate() }}"
        >⬆ 업로드</button>
        ${fileName
          ? html`
              <button
                class="action-btn danger"
                @click="${this._clear}"
              >✕</button>
            `
          : html``}
      </div>

      <!-- 파일 셀렉터 팝업 -->
      <ox-storage-file-selector-popup
        ?open="${this._selectorOpen}"
        ?domain-mode="${this.domainMode}"
        @file-selected="${this._onFileSelected}"
        @close="${() => { this._selectorOpen = false; this.requestUpdate() }}"
      ></ox-storage-file-selector-popup>

      <!-- 업로드 팝업 -->
      <ox-storage-upload-popup
        ?open="${this._uploadOpen}"
        @upload-complete="${this._onUploadComplete}"
        @close="${() => { this._uploadOpen = false; this.requestUpdate() }}"
      ></ox-storage-upload-popup>

      <div overlay></div>
    `
  }

  /**
   * 스토리지 경로에서 파일명만 추출한다.
   * 예: "16/uploads/abc123.pdf" → "abc123.pdf"
   */
  private _extractFileName(path: string): string {
    if (!path) return ''
    return path.split('/').pop() || path
  }
}
