/**
 * @license Copyright © HatioLab Inc. All rights reserved.
 */

import '@operato/popup/ox-popup.js'
import { OxFormField } from '@operato/input'
import { OxPopup } from '@operato/popup'

import { css, html } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { scanImageData } from '@undecaf/zbar-wasm'

const barcodeIcon = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAYBAMAAAAfR1CMAAADKGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFNjM4RURDQkQ1OUExMUU5QkExMkQ4NUY3NkMxNzBFOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFNjM4RURDQ0Q1OUExMUU5QkExMkQ4NUY3NkMxNzBFOSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU2MzhFREM5RDU5QTExRTlCQTEyRDg1Rjc2QzE3MEU5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU2MzhFRENBRDU5QTExRTlCQTEyRDg1Rjc2QzE3MEU5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+55pr/QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAkUExURQAAAEdwTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEus/7UCWQwAAAALdFJOU9YAg3wKBFBDSz9PnvQNDgAAAE9JREFUGNNjEEQFDKLJSnCOklkgg9QUJFn3RgZhRyS+iCGDEIp2RSBfQICRkRGIgTSQL4jCF6ScvxsZYOFT2T50/6D7Fz080MMLPTzRwhsAHVspfelur08AAAAASUVORK5CYII=`

/**
 * Custom input component for barcode scanning.
 *
 * This component provides a text input field and a barcode scanning button. Users can input text
 * manually or scan barcodes using the device camera. Supported barcode formats include:
 *
 * - Code-39
 * - Code-93
 * - Code-128
 * - Codabar
 * - Databar/Expanded
 * - EAN/GTIN-5/8/13
 * - ISBN-10/13
 * - ISBN-13+2
 * - ISBN-13+5
 * - ITF (Interleaved 2 of 5)
 * - QR Code
 * - UPC-A/E
 *
 * @fires CustomEvent#change - Dispatched when the input value changes.
 * @fires KeyboardEvent#keydown - Dispatched when the Enter key is pressed (if not withoutEnter).
 *
 * @cssprop {String} --barcodescan-input-button-icon - Icon for the barcode scanning button.
 *
 * @customElement
 */
@customElement('operato-input-barcode')
export class OperatoInputBarcode extends OxFormField {
    static styles = [
        css`
      :host {
        display: flex;
        align-items: center;
        border: none;
        background-color: transparent;
        height: var(--ox-input-height, var(--form-element-height-medium));
      }

      * {
        align-self: stretch;
      }

      *:focus {
        outline: none;
      }

      input {
        flex: 1;
        width: 10px; /* intentionally width set */
        border: var(--ox-input-border, 1px solid var(--md-sys-color-outline));
        border-radius: var(--ox-input-radius, var(--md-sys-shape-corner-small));
        background-color: var(--ox-input-background-color, var(--md-sys-color-on-primary));
        color: var(--ox-input-color, var(--md-sys-color-on-primary-container));
        font-size: var(--md-sys-typescale-label-large-size, 0.875rem);

        box-sizing: border-box;
        padding-right: 35px;
      }

      input:focus {
        outline: none;
        border-color: var(--md-sys-color-secondary-fixed-dim);
      }

      #scan-button {
        display: block;
        position: relative;
        margin-left: -35px;
        width: 35px;
        border: none;
        background: var(--barcodescan-input-button-icon) no-repeat center center;
      }

      #scan-button[hidden] {
        display: none;
      }
    `
    ]

    /**
     * Indicates whether barcode scanning is enabled.
     * @property {Boolean} barcode
     */
    @property({ type: Boolean, attribute: true }) barcode?: boolean

    /**
     * Indicates whether barcode scanning is enabled.
     * @property {Boolean} scannable
     */
    @property({ type: Boolean, attribute: true }) scannable?: boolean

    /**
     * If true, the "Enter" key press event is not fired after scanning a barcode.
     * @property {Boolean} withoutEnter
     */
    @property({ attribute: 'without-enter', type: Boolean }) withoutEnter?: boolean

    /**
     * The value of the input field.
     * @property {String} declare value
     */
    @property({ type: String }) declare value?: string

    /**
     * If true, only English characters are allowed in the input field.
     * @property {Boolean} englishOnly
     */
    @property({ attribute: 'english-only', type: Boolean }) englishOnly?: boolean

    /**
     * If true, the input field is automatically selected after a change event.
     * @property {Boolean} selectAfterChange
     */
    @property({ attribute: 'select-after-change', type: Boolean }) selectAfterChange?: boolean

    @state() stream?: MediaStream

    @query('input') input!: HTMLInputElement

    private popup: OxPopup | null = null
    private video: HTMLVideoElement | null = null
    private _isMobile: boolean = 'ontouchstart' in window

    connectedCallback() {
        super.connectedCallback()

        if (navigator.mediaDevices) {
            ; (async () => {
                try {
                    var stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } })
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop())
                        this.scannable = true
                    }
                } catch (e) {
                    this.scannable = false
                    console.warn('this device not support camera for barcode scan', e)
                }
            })()
        } else {
            this.scannable = false
        }
    }

    disconnectedCallback() {
        this.stopScan()
    }

    render() {
        this.style.setProperty('--barcodescan-input-button-icon', `url(${barcodeIcon})`)

        return html`
      <input
        inputmode="none"
        type="text"
        .value=${this.value || ''}
        @change=${(e: Event) => this.onInputChange(e)}
        @keydown=${(e: KeyboardEvent) => this.onInputKeyDown(e)}
        @pointerdown=${() => this._onInputPointerDown()}
        @blur=${() => this._onInputBlur()}
        ?disabled=${this.disabled}
      />
      <button
        ?hidden=${!this.scannable}
        id="scan-button"
        @click=${(e: MouseEvent) => {
                this.scan(e)
            }}
        ?disabled=${this.disabled}
      ></button>
    `
    }

    onInputChange(e: Event) {
        e.stopPropagation()

        if (this.englishOnly) {
            /* englishOnly 인 경우에는 멀티바이트 문자들을 모두 제거한다. */
            this.value = this.input.value = this.input.value?.replace(/[^\x00-\x7F]/g, '')
        } else {
            this.value = this.input.value
        }

        if (this.selectAfterChange) {
            requestAnimationFrame(() => {
                this.input.select()
            })
        }

        this.dispatchEvent(
            new CustomEvent('change', {
                detail: this.value
            })
        )
    }

    onInputKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.isComposing) {
            /* Even if the value has not changed, the enter key triggers a change event. */
            e.preventDefault() /* Prevent change event from occurring twice. */

            this.input.dispatchEvent(new CustomEvent('change'))
        } else if (this.englishOnly && !e.metaKey && !e.ctrlKey && !e.altKey && /^Key/.test(e.code)) {
            e.stopPropagation()
            e.preventDefault()

            /* englishOnly 인 경우에 문자들은 여기에서 처리한다. 멀티바이트 문자들이 대부분 알파벳의 자모음을 조합하므로, ... */
            const key = e.shiftKey ? e.code.charAt(3) : e.code.charAt(3).toLowerCase()
            const value = this.input.value

            const start = this.input.selectionStart || 0
            const end = this.input.selectionEnd || start

            this.input.value = [value.substring(0, start), key, value.substring(end)].join('')
            this.input.setSelectionRange(start + 1, start + 1)
        }
    }

    private _onInputPointerDown() {
        if (this._isMobile) {
            this.input.setAttribute('inputmode', 'text')
        }
    }

    private _onInputBlur() {
        if (this._isMobile) {
            this.input.setAttribute('inputmode', 'none')
        }
    }

    async scan(e: MouseEvent) {
        try {
            if (this.popup) {
                this.stopScan()
            }

            this.popup = OxPopup.open({
                template: html`
          <video></video>
          <md-icon
            style="position: fixed; right: 0; top: 0; color: red; tabindex: 0"
            @click=${() => {
                        this.stopScan()
                    }}
            >close</md-icon
          >
        `,
                width: '100vw',
                height: '100dvh'
            })

            this.video! = this.popup.querySelector('video') as HTMLVideoElement

            var constraints = { audio: false, video: { facingMode: 'environment' } } /* backside camera first */
            this.stream = await navigator.mediaDevices.getUserMedia(constraints)

            this.video.srcObject = this.stream
            this.video.play()

            this.video.onloadedmetadata = async e => {
                var canvas = new OffscreenCanvas(
                    this.video!.videoWidth || this.video!.width,
                    this.video!.videoHeight || this.video!.height
                )

                var context = canvas.getContext('2d', {
                    willReadFrequently: true
                })

                const detect = async () => {
                    try {
                        if (!this.stream?.active) {
                            return
                        }

                        context!.drawImage(this.video!, 0, 0, canvas.width, canvas.height)
                        const imageData = context!.getImageData(0, 0, canvas.width, canvas.height)
                        const symbols = await scanImageData(imageData)
                        const result = symbols[0]?.decode()

                        if (result) {
                            this.stopScan()

                            var input = this.input
                            input.focus()
                            this.value = input.value = String(result)

                            if (!this.withoutEnter) {
                                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
                            }
                        } else {
                            requestAnimationFrame(async () => await detect())
                        }
                    } catch (e) {
                        console.warn(e)
                        this.stopScan()
                    }
                }

                await detect()
            }
        } catch (err) {
            /*
             * 1. stream device 문제로 예외 발생한 경우.
             * 2. 뒤로가기 등으로 popup이 종료된 경우에도 NotFoundException: Video stream has ended before any code could be detected. 이 발생한다.
             */
            console.warn(err)
        }
    }

    stopScan() {
        if (this.video) {
            this.video.pause()
            this.video.srcObject = null
        }

        if (this.popup) {
            this.popup.close()
            this.popup = null
        }

        this.stream?.getTracks().forEach(track => track.stop())
    }
}
