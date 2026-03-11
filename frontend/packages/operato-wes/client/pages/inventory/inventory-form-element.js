import { MetaFormMixin } from '@operato-app/metapage/dist-client/mixin/meta-form-mixin'

import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { ValueUtil } from '@operato-app/metapage/dist-client/utils/value-util'
import { UiUtil } from '@operato-app/metapage/dist-client/utils/ui-util'

import '@operato/input/ox-input-code.js'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @description Inventory 화면 폼 엘리먼트
 *
 */
export class InventoryFormElement extends MetaFormMixin(p13n(localize(i18next)(LitElement))) {
  async save() {
    let params = this.getFormViewData()
    if (!params || Object.keys(params).length == 0) {
      MetaApi.showToast('info', TermsUtil.tText('NOTHING_CHANGED'))
    } else {
      params = this.setParentIdFieldByElement(params)

      const result = await this.requestRestService('PUT', this.saveUrl, params, () => {
        history.back()
        return
      })
    }
  }

  responseDataSet(fetchResult) {
    let resObj = fetchResult.records

    if (resObj.length == 0) {
      history.back()
    }
    Object.keys(resObj).forEach(key => {
      let element = this.renderRoot.querySelector(`#${key}`)
      if (ValueUtil.isNotEmpty(element)) {
        element.setValue(resObj[key])
      }

      if (key == 'id') {
        this.formId = resObj[key]
      }
    })
  }
}

customElements.define('inventory-form-element', InventoryFormElement)
