import { MetaGristChartMixin } from '../mixin/meta-grist-chart-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 그리드 & 차트 페이지 - 검색 폼 / 그리드 / 차트
 */
export class BasicGristChartPage extends MetaGristChartMixin(p13n(localize(i18next)(PageView))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-grist-chart-page', BasicGristChartPage)
