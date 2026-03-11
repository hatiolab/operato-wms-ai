import { LitElement, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'
import { MetaGristMixin } from '../mixin/meta-grist-mixin'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 마스터 - 디테일 그리드에서 디테일 그리드 엘리먼트
 */
export class BasicGristDetailElement extends MetaGristMixin(p13n(localize(i18next)(LitElement))) {
  /**
   * @override
   *************
   */
  async connectedCallback() {
    this.gristId = 'ox-grist-detail'

    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-grist-detail-element', BasicGristDetailElement)
