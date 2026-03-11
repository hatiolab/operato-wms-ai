import { MetaPdaSimpleScreenMixin } from '@operato-app/metapage/dist-client/mixin/meta-pda-simple-screen-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @description Stocktake PDA 화면
 */
export class PdaStocktakePage extends MetaPdaSimpleScreenMixin(p13n(localize(i18next)(PageView))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }

  /**
   * @override
   */
  async trxSuccessCallback() {
    this.reset_grid()

    const searchFormQueryFilters = await this.searchForm.getQueryFilters()
    if (searchFormQueryFilters.length > 0) {
      this.fetchHandler(this.searchForm)
    }
  }
}

customElements.define('pda-stocktake-page', PdaStocktakePage)
