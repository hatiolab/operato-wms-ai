import { css, html } from 'lit-element'

import { CommonGristStyles } from '@operato/styles'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { PageView } from '@operato/shell'
import { MetaChartMixin, MetaUiUtil } from '@operato-app/metapage'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 일별 실적 차트
 */
export class DailyResultChart extends MetaChartMixin(p13n(localize(i18next)(PageView))) {
  /**
   * @description 프로퍼티
   *******************************
   * @returns {Object} 프로퍼티 키-값 형태 오브젝트
   */
  static get properties() {
    return {}
  }

  /**
   * @description 스타일
   *******************************
   * @returns {Array} 스타일 리스트
   */
  static get styles() {
    return [
      CommonGristStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .container {
          overflow-y: auto;
          flex: 0.95;
        }
      `
    ]
  }

  constructor() {
    super()
  }

  /**
   * @description 화면 렌더링
   *******************************
   * @returns HTML
   */
  render() {
    return html` ${this.getChartHtml} `
  }

  /**
   * @description 타이틀 / 버튼 설정
   *******************************
   */
  get context() {
    return MetaUiUtil.createPageContextObject(this)
  }
}

customElements.define('daily-result-chart', DailyResultChart)
