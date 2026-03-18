import { MetaGristMixin } from '@operato-app/metapage/dist-client/mixin/meta-grist-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author yang
 * @description 출고 작업 화면
 */
export class InvWorkPage extends MetaGristMixin(p13n(localize(i18next)(PageView))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

window.customElements.define('inv-work-page', InvWorkPage)
