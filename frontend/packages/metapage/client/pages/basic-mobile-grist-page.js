import { MetaMobileGristMixin } from '../mixin/meta-mobile-grist-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 그리드 페이지
 */
export class BasicMobileGristPage extends MetaMobileGristMixin(p13n(localize(i18next)(PageView))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-mobile-grist-page', BasicMobileGristPage)
