import '@material/web/icon/icon.js'

import { OxGristEditor } from '@operato/data-grist'
import { customElement } from 'lit/decorators.js'
import { css, html } from 'lit'
import { ScrollbarStyles } from '@operato/styles'
import { PopupHandle, openPopup } from '@operato/layout'
import { i18next } from '@operato/i18n'
import '@operato/attachment/ox-attachment-list.js'
import './../popup/ox-attachment-category-list-popup'

const IMAGE_FALLBACK = new URL('../../../assets/images/no-image.png', import.meta.url).href

@customElement('ox-grist-editor-image-selector')
export class OxGristEditorImageSelector extends OxGristEditor {
  static styles = [
    ScrollbarStyles,
    css`
      :host {
        position: relative;
        box-sizing: border-box;

        display: flex;
        flex-direction: column;
        place-content: center;
        border-radius: var(--border-radius);
        padding: var(--padding-default, 9px);
        min-height: 100px;
        text-transform: capitalize;

        border: var(--file-uploader-border);
        background-color: var(--md-sys-color-background);
        font: var(--file-uploader-font) !important;
        color: var(--file-uploader-color);

        overflow: hidden;
      }

      :host(.candrop) {
        background-color: var(--file-uploader-candrop-background-color);
      }

      img {
        min-height: 100%;
        margin: auto;
      }

      [overlay] {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        opacity: 0%;
        background-color: var(--md-sys-color-surface);

        display: flex;
        place-content: center;
      }

      [overlay]:hover {
        opacity: 50%;
      }

      label {
        border: none;
        flex: 1;
        display: flex;
        place-content: center;
      }

      md-icon {
        align-self: center;

        color: var(--file-uploader-icon-color, black);
        --md-icon-size: var(--file-uploader-icon-size, 36px);
      }
    `
  ]

  private popup?: PopupHandle

  _ondblclick(e) {
    e.stopPropagation()
    this.openSelector()
  }

  _onkeydown(e) {
    const key = e.key

    if (key == 'Enter') {
      e.stopPropagation()
      this.openSelector()
    }
  }

  async openSelector(){
    var template = html`
      <ox-attachment-category-list-popup
        .creatable=${true}
        .category=${'image'}
        @attachment-selected=${async (e: CustomEvent) => {
          var attachment = e.detail.attachment

          // 값 변경 이벤트 처리
          this.dispatchEvent(
            new CustomEvent('field-change', {
              bubbles: true,
              composed: true,
              detail: {
                before: this.value,
                after: attachment.id,
                record: this.record,
                column: this.column,
                row: this.row
              }
            })
          )

          this.popup && this.popup.close()
        }}
      ></ox-attachment-category-list-popup>
    `

    this.popup = openPopup(template, {
      backdrop: true,
      size: 'large',
      title: i18next.t('title.select attachment')
    })

  }


  get editorTemplate() {
    return html`<img
      src=${IMAGE_FALLBACK}
      style="max-width:100%;"/>

      <div overlay>
        <label>
          <md-icon>upload</md-icon>
        </label>
      </div>
    `
  }
}
