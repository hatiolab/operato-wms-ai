import { MetaPdaSimpleScreenMixin } from '../mixin/meta-pda-simple-screen-mixin'

import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 모바일 그리드 엘리먼트
 */
export class BasicPdaGristElement extends MetaPdaSimpleScreenMixin(p13n(localize(i18next)(LitElement))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-pda-grist-element', BasicPdaGristElement)
