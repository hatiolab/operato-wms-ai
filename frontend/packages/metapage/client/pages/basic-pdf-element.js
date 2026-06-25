import '@operato/form/ox-search-form.js'

import { css, html, LitElement } from 'lit-element'
import { ScrollbarStyles, CommonGristStyles, ButtonContainerStyles, CommonHeaderStyles } from '@operato/styles'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'
import { MetaSetMixin } from '../mixin/meta-set-mixin'
import { MetaApi } from '../utils/meta-api'
import { operatoGet } from '@operato-app/operatofill'

import * as pdfjsLib from 'pdfjs-dist'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 PDF 뷰어 엘리먼트
 */
export class BasicPdfElement extends MetaSetMixin(p13n(localize(i18next)(LitElement))) {
  static get styles() {
    let styles = [
      ButtonContainerStyles,
      ScrollbarStyles,
      CommonGristStyles,
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow-x: overlay;
          background-color: var(--md-sys-color-background);
        }

        :host([file]) {
          display: inherit;
        }

        search-form {
          display: none;
          overflow: visible;
        }

        .mobile-print-bar {
          display: flex;
          justify-content: flex-end;
          padding: 8px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .mobile-print-btn {
          padding: 8px 24px;
          background: var(--md-sys-color-primary, #1976d2);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }

      `
    ]
    return styles
  }

  static get properties() {
    return {
      parent_id: String,
      resource_url: String,
      notSupportedMessage: String,
      notSupportedLinkMessage: String,
      mediaType: String,
      height: String,
      width: String,
      file: Object,
      _pdfDataForPrint: Object
    }
  }

  constructor() {
    super()

    this.mediaType = 'application/pdf'
    this.height = '100%'
    this.width = '100%'
    this.notSupportedMessage = 'It appears your Web browser is not configured to display files. No worries, just'
    this.notSupportedLinkMessage = 'click here to download the file.'

    if (MetaApi.isMobileEnv()) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    }
  }

  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }

    let menuMeta = await MetaApi.getMenuMeta(this)
    let menu = menuMeta.menu
    this.search_form_fields = []
    this.resource_url = menu.resource_url
  }

  /**
   * 안드로이드에서의 동작을 위해 pdfjsLib 라이브러리로 PDF 로딩
   */
  async loadPdf(data) {
    const canvasContainer = this.shadowRoot.getElementById('canvas-container')

    try {
      const loadingTask = pdfjsLib.getDocument(data)
      const pdfDoc = await loadingTask.promise
      clearInterval(this.intervalId)
      canvasContainer.innerHTML = '';

      var numPages = pdfDoc.numPages;
      for (var pageNum = 1; pageNum <= numPages; pageNum++) {
        await this.renderPdfPage(canvasContainer, pdfDoc, pageNum);
      }

    } catch (err) {
      clearTimeout(this.intervalId)
      let errTitle = 'Failed to load PDF! - '
      canvasContainer.innerHTML = errTitle + err;
      console.error(errTitle, err)
    }
  }

  /**
   * PDF 페이지 별 렌더링
   * 
   * @param {*} canvasContainer 
   * @param {*} pdfDoc 
   * @param {*} pageNo 
   */
  async renderPdfPage(canvasContainer, pdfDoc, pageNo) {
    // Create a new canvas element for each page
    var canvas = document.createElement('canvas');
    canvas.id = 'canvas-' + pageNo;
    canvasContainer.appendChild(canvas);

    // Using promise to fetch the page
    pdfDoc.getPage(pageNo).then(function (page) {
      var viewport = page.getViewport({ scale: 1 });
      canvas.height = viewport.height; // Set canvas height for each page
      canvas.width = viewport.width; // Set canvas width for each page

      // Render PDF page into canvas context
      var ctx = canvas.getContext('2d');
      var renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        intent: 'print'
      };
      page.render(renderContext).promise
    });
  }

  /**
   * @description 렌더링
   **********************
   * @returns {Object}
   */
  /** 모바일에서 PDF blob을 새 탭으로 열어 Chrome PDF 뷰어의 인쇄 기능 사용 */
  _onMobilePrint() {
    if (!this._pdfDataForPrint) return

    // 매번 새 blob URL을 생성 — 재사용 시 Chrome이 다운로드 팝업으로 전환하는 문제 방지
    const blobUrl = URL.createObjectURL(new Blob([this._pdfDataForPrint], { type: this.mediaType }))
    const a = document.createElement('a')
    a.href = blobUrl
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
  }

  render() {
    if (MetaApi.isMobileEnv()) {
      return html`
        <ox-search-form
          id="search-form"
          .fields=${this.search_form_fields}
          @submit=${e => this.fetchHandler(e)}
        ></ox-search-form>
        <div class="mobile-print-bar">
          <button class="mobile-print-btn" @click=${this._onMobilePrint}>
            ${i18next.t('button.print') || '인쇄'}
          </button>
        </div>
        <div id='canvas-container'>Loading ...</div>
      `
    } else {
      return html`
        <ox-search-form
          id="search-form"
          .fields=${this.search_form_fields}
          @submit=${e => this.fetchHandler(e)}
        ></ox-search-form>
        <object data="${this.file}" type="${this.mediaType}" width="${this.width}" height="${this.height}">
          <p>${this.notSupportedMessage} <a href="${this.file}">${this.notSupportedLinkMessage}</a></p>
        </object>
      }
      `
    }
  }

  /**
   * @description 검색 폼
   **********************
   * @returns {Object}
   */
  get searchForm() {
    return this.renderRoot.querySelector('ox-search-form')
  }

  /**
   * @description 기본 버튼 및 커스텀 버튼 생성 code 데이터 조회
   *****************************************************
   */
  async firstUpdated() {
    if (super.firstUpdated) {
      await super.firstUpdated()
    }

    this.intervalId = setInterval(() => {
      if (this.shadowRoot.getElementById('canvas-container')) {
        let msg = this.shadowRoot.getElementById('canvas-container').innerHTML
        this.shadowRoot.getElementById('canvas-container').innerHTML = msg + '.'
      }
    }, 300)

    this.fetchHandler()
  }

  /**
   * @description 조회
   ********************
   * @returns {Object}
   */
  async fetchHandler() {
    let params = {}
    let url = this.resource_url ? this.resource_url : `printouts/show_pdf/by_template/${this.parent_id}`
    url = url.replace(':id', this.parent_id)
    url = `stream/${url}`

    let res = await operatoGet(url, params, false)
    let data = await res.arrayBuffer()

    if (MetaApi.isMobileEnv()) {
      // pdfjsLib.getDocument()가 ArrayBuffer를 Worker로 transfer하면 원본이 비워지므로 인쇄용 복사본을 미리 보관
      this._pdfDataForPrint = data.slice(0)
      await this.loadPdf(data)

    } else {
      var fileObj = new Blob([data], { type: this.mediaType })
      this.file = URL.createObjectURL(fileObj)
    }

    return {}
  }

  async fetchBaseUrl() {
    let urlRes = await fetch('base_url', {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json'
      }
    })

    let result = await urlRes.json()
    let baseUrl = result.baseUrl
    return baseUrl
  }

  /**
   * @description 부모 객체에서 parent_id 변경시 resourceUrl, saveUrl을 갱신하고 재조회한다.
   *********************************
   * @param {String} newVal
   */
  set_parent_id(newVal) {
    this.parent_id = newVal
  }
}

customElements.define('basic-pdf-element', BasicPdfElement)
