import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { MetaImportMixin } from '../mixin/meta-import-mixin'
import { p13n } from '@operato/p13n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 기반 임포트 엘리먼트
 */
export class BasicExcelImportElement extends MetaImportMixin(p13n(localize(i18next)(LitElement))) {
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }
  }
}

customElements.define('basic-excel-import-element', BasicExcelImportElement)
