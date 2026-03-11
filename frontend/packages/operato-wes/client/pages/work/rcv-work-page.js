import { MetaGristMixin } from '@operato-app/metapage/dist-client/mixin/meta-grist-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 입고 작업 화면
 */
export class RcvWorkPage extends MetaGristMixin(p13n(localize(i18next)(PageView))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('rcv-work-page', RcvWorkPage)
