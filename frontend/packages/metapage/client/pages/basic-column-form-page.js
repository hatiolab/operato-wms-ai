import { ColumnFormMixin } from '../mixin/column-form-mixin'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 컬럼 구분 폼 페이지
 */
export class BasicColumnFormPage extends ColumnFormMixin(p13n(localize(i18next)(PageView))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-column-form-page', BasicColumnFormPage)
