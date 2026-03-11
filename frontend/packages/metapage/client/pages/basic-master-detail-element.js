import { MetaMasterDetailMixin } from '../mixin/meta-master-detail-mixin'

import { i18next, localize } from '@operato/i18n'
import { LitElement } from 'lit-element'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 마스터 디테일 엘리먼트
 */
export class BasicMasterDetailElement extends MetaMasterDetailMixin(p13n(localize(i18next)(LitElement))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-master-detail-element', BasicMasterDetailElement)
