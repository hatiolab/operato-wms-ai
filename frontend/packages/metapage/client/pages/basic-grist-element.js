import { MetaGristMixin } from '../mixin/meta-grist-mixin'

import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 그리드 엘리먼트
 */
export class BasicGristElement extends MetaGristMixin(p13n(localize(i18next)(LitElement))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }

    // 코딩...
  }
}

customElements.define('basic-grist-element', BasicGristElement)
