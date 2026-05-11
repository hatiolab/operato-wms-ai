import '@operato/barcode/ox-barcode.js'

import { css, html, LitElement } from 'lit'

import { TermsUtil } from '../../utils/terms-util'
import { UiUtil } from '../../utils/ui-util'

/**
 * 바코드/QR코드 표시 팝업
 *
 * barcodeValue 파라미터를 받아 QR Code·PDF417·DataMatrix·Code128 중 선택하여
 * 바코드 이미지를 표시한다. 이미지 클릭 시 PNG 파일로 다운로드된다.
 *
 * @property {string} barcodeValue - 인코딩할 값 (필수)
 * @property {string} barcodeType  - 초기 바코드 유형 (기본값: 'qrcode')
 * @property {string} title        - 바코드 상단에 표시할 제목/레이블 (선택)
 *
 * @example
 * import('@operato-app/metapage/dist-client/components/popup/ox-barcode-popup')
 * const el = document.createElement('ox-barcode-popup')
 * el.barcodeValue = inv.barcode
 * el.title = inv.sku_nm
 * openPopup(el, { backdrop: true, size: 'small', title: '바코드' })
 *
 * // 또는 html 태그로 직접
 * openPopup(
 *   html`<ox-barcode-popup barcodeValue="${inv.barcode}" title="${inv.sku_nm}">
 *        </ox-barcode-popup>`,
 *   { backdrop: true, size: 'small', title: '바코드' }
 * )
 */
export class OxBarcodePopup extends LitElement {
  /** Lit 반응형 프로퍼티 정의 */
  static get properties() {
    return {
      /** 인코딩할 바코드 값 */
      barcodeValue: { type: String },
      /** 초기 바코드 유형 (bwip-js bcid) */
      barcodeType: { type: String },
      /** 바코드 상단 표시 제목 */
      title: { type: String },
      /** 현재 선택된 바코드 유형 (내부 토글용) */
      _currentType: { type: String, state: true }
    }
  }

  constructor() {
    super()
    this.barcodeValue = ''
    this.barcodeType = 'qrcode'
    this.title = ''
    this._currentType = 'qrcode'
  }

  /**
   * 지원 바코드 유형 목록
   * bcid: bwip-js 바코드 타입 식별자
   */
  static get TYPES() {
    return [
      { bcid: 'qrcode', label: 'QR Code', width: 20, height: 20, scale: 4, includetext: false },
      { bcid: 'pdf417', label: 'PDF417', width: 80, height: 12, scale: 3, includetext: false },
      { bcid: 'datamatrix', label: 'DataMatrix', width: 20, height: 20, scale: 4, includetext: false },
      { bcid: 'code128', label: 'Code128', width: 80, height: 14, scale: 3, includetext: true }
    ]
  }

  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 24px 16px;
        background: var(--md-sys-color-surface, #fff);
        min-width: 260px;
        gap: 12px;
        box-sizing: border-box;
      }

      .barcode-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface, #333);
        text-align: center;
        word-break: break-all;
        line-height: 1.4;
      }

      /* 바코드 이미지 영역 — 클릭 시 ox-barcode 자체 다운로드 동작 */
      .barcode-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        border-radius: 10px;
        border: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        padding: 16px;
        width: 100%;
        box-sizing: border-box;
      }

      ox-barcode {
        width: 100%;
        max-width: 220px;
        cursor: pointer;
      }

      .barcode-value {
        font-size: 13px;
        font-weight: 500;
        color: var(--md-sys-color-on-surface-variant, #555);
        text-align: center;
        word-break: break-all;
        letter-spacing: 0.5px;
      }

      .download-hint {
        font-size: 11px;
        color: var(--md-sys-color-outline, #aaa);
        text-align: center;
      }

      /* 유형 선택 탭 */
      .type-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .type-tab {
        padding: 4px 12px;
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        color: var(--md-sys-color-on-surface-variant, #666);
        background: var(--md-sys-color-surface-container-lowest, #fff);
        cursor: pointer;
      }

      .type-tab.active {
        background: var(--md-sys-color-primary, #1976D2);
        border-color: var(--md-sys-color-primary, #1976D2);
        color: #fff;
      }

      .type-tab:hover:not(.active) {
        background: var(--md-sys-color-surface-variant, #f0f0f0);
      }

      /* 닫기 버튼 */
      .btn-close {
        width: 100%;
        padding: 11px;
        border: none;
        border-radius: 10px;
        background: var(--md-sys-color-surface-variant, #e0e0e0);
        color: var(--md-sys-color-on-surface-variant, #333);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 4px;
      }

      .btn-close:active {
        opacity: 0.8;
      }
    `
  }

  /** barcodeType 변경 시 _currentType 초기화 */
  willUpdate(changedProps) {
    if (changedProps.has('barcodeType')) {
      this._currentType = this.barcodeType || 'qrcode'
    }
  }

  /** 화면 렌더링 */
  render() {
    const typeCfg = OxBarcodePopup.TYPES.find(t => t.bcid === this._currentType)
      || OxBarcodePopup.TYPES[0]

    return html`
      ${this.title ? html`
        <div class="barcode-title">${this.title}</div>
      ` : ''}

      <!-- 바코드 이미지 — 클릭 시 ox-barcode 내장 PNG 다운로드 -->
      <div class="barcode-wrap">
        <ox-barcode
          bcid="${typeCfg.bcid}"
          .value="${this.barcodeValue}"
          bcWidth="${typeCfg.width}"
          bcHeight="${typeCfg.height}"
          bcScale="${typeCfg.scale}"
          ?includetext="${typeCfg.includetext}">
        </ox-barcode>
      </div>

      <!-- 바코드 값 텍스트 -->
      <div class="barcode-value">${this.barcodeValue}</div>

      <div class="download-hint">
        ${TermsUtil.tText('click_to_download') || '이미지를 클릭하면 PNG로 다운로드됩니다'}
      </div>

      <!-- 유형 선택 탭 -->
      <div class="type-tabs">
        ${OxBarcodePopup.TYPES.map(t => html`
          <button
            class="type-tab ${this._currentType === t.bcid ? 'active' : ''}"
            @click="${() => { this._currentType = t.bcid }}">
            ${t.label}
          </button>
        `)}
      </div>

      <!-- 닫기 -->
      <button class="btn-close" @click="${this._close}">
        ${TermsUtil.tButton('close') || '닫기'}
      </button>
    `
  }

  /** 팝업 닫기 */
  _close() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('ox-barcode-popup', OxBarcodePopup)
