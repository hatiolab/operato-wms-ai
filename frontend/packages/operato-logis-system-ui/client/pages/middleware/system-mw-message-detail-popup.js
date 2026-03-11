import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ScrollbarStyles } from '@operato/styles'

import { CustomButtonMixin } from '@operato-app/metapage/dist-client/mixin/custom-button-mixin'
import { TermsUtil } from '@operato-app/metapage/dist-client/utils/terms-util'
import { ServiceUtil } from '@operato-app/metapage/dist-client/utils/service-util'
import { MetaApi } from '@operato-app/metapage/dist-client/utils/meta-api'

import '@operato/input/ox-input-code.js'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Yang
 * @description 미들웨어 메시지 상세보기
 */
export class SystemMwMessageDetailPopup extends CustomButtonMixin(localize(i18next)(LitElement)) {
  /**
   * @description 프로퍼티 정의
   *****************************
   * @returns {Object} 프로퍼티 정보
   */
  static get properties() {
    return {
      subTitle: String,
      codeField: String,
      codeValueOrg: String,
      codeValueNew: String
    }
  }

  /**
   * @description 스타일 정의
   *****************************
   * @returns {Array} 스타일 정보
   */
  static get styles() {
    let styles = [
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow-x: overlay;
          background-color: var(--md-sys-color-background);
        }
        legend {
          margin: 10px;
          text-transform: capitalize;
          padding: var(--legend-padding);
          font: var(--legend-font);
          color: var(--md-sys-color-primary);
          border-bottom: var(--legend-border-bottom);
        }
        ox-input-code {
          margin: 10px;
          overflow-y: auto;
          flex: 1;
        }
      `
    ]

    // 버튼 콘테이너 스타일 추가 (엘리먼트로 로드시 사용)
    if (this.getButtonContainerStyle) {
      styles.push(...this.getButtonContainerStyle())
    }

    return styles
  }

  /**
   * @description Life Cycle - connectedCallback
   ***********************************************
   */
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
    this.resource_url = this.menu.resource_url
      .replace(':id', this.parent_id)
      .replace(':source_id', this.message.source_id.replaceAll('/', '.'))
      .replace(':dest_id', this.message.dest_id.replaceAll('/', '.'))
    if (this.resource_url) {
      let data = await ServiceUtil.restGet(this.resource_url)
      this.subTitle = this.menu.title

      if (data) {
        data.detail.routed_queues = JSON.parse(data.detail.routed_queues)
        data.detail.body = JSON.parse(data.detail.body)

        let msg = JSON.stringify(data, null, 4)
        this.messageValue = msg
      }
    }
  }

  /**
   * @description Life Cycle - firstUpdated
   ******************************************
   */
  async firstUpdated() {
    // 기본 버튼 및 커스텀 버튼 생성
    if (super.firstUpdated) {
      await super.firstUpdated()
    }
  }

  /**
   * @override Life Cycle - render
   *********************************
   * @returns {Array}
   */
  render() {
    return html`
      <legend>${this.subTitle}</legend>
      <ox-input-code mode="javascript" value=${this.messageValue} tab-size="4"></ox-input-code>
      ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
    `
  }

  /**
   * @description 기본 버튼을 사용 하기 위해 기본 버튼 override
   *****************************************************
   * @returns {Array}
   */
  filterBasicButton() {
    return []
  }
}

customElements.define('system-mw-message-detail-popup', SystemMwMessageDetailPopup)
