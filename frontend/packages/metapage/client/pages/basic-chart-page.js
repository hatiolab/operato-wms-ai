import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { MetaChartMixin } from '../mixin/meta-chart-mixin'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 차트 페이지 - 검색 폼 / 차트
 */
export class BasicChartPage extends MetaChartMixin(p13n(localize(i18next)(PageView))) {
  static get properties() {
    return {}
  }

  constructor() {
    super()
  }
}

customElements.define('basic-chart-page', BasicChartPage)
