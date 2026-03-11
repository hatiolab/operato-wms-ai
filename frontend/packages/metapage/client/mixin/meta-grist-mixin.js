import { html } from 'lit-element'

import { GristRenderMixin } from './grist-render-mixin'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 그리스트 렌더링 믹스 인
 */
export const MetaGristMixin = (superClass) => class extends GristRenderMixin(superClass) {
  /**
   * @description Life Cycle - render
   *************************
   * @returns HTML
   */
  render() {
    return html `
      ${this.getGridHtml ? html`${this.getGridHtml()} ` : html``}
      ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
    `
  }
}