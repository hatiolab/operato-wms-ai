import { MetaMobileFormMixin } from '../mixin/meta-mobile-form-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 모바일 (폰, PDA, 태블릿) 폼 페이지
 */
export class BasicMobileFormPage extends MetaMobileFormMixin(p13n(localize(i18next)(PageView))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-mobile-form-page', BasicMobileFormPage)
