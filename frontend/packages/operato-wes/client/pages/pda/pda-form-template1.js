import { MetaMobileFormMixin } from '@operato-app/metapage/client/mixin/meta-mobile-form-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 폼 기반 PDA 템플릿
 */
export class PdaFormTemplate1 extends MetaMobileFormMixin(localize(i18next)(PageView)) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('pda-form-template1', PdaFormTemplate1)
