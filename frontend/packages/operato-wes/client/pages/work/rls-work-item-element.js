import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { MetaMobileFormMixin } from '@operato-app/metapage/dist-client/mixin/meta-mobile-form-mixin'

import { UiUtil } from '@operato-app/metapage/dist-client/utils/ui-util'
import { ValueUtil } from '@operato-app/metapage/dist-client/utils/value-util'
import { ServiceUtil } from '@operato-app/metapage/dist-client/utils/service-util'
import { TermsUtil } from '@operato-app/metapage/dist-client/utils/terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 출고 상세 처리 화면
 */
export class RlsWorkItemElement extends MetaMobileFormMixin(p13n(localize(i18next)(LitElement))) {
  async connectedCallback() {
    await super.connectedCallback()
    this.locCdMaster = this.search_form_fields.filter(x => x.name == 'loc_cd')[0].options
  }
  /**
   * @override 조회 결과 셋
   ***************************
   * @param {Object} fetchResult { total: Number, records: Object }
   */
  responseDataSet(fetchResult) {
    let resObj = fetchResult.records
    if (resObj) {
      if (Array.isArray(resObj)) {
        // 재고 바코드 정보 조회 시
        if (resObj.length == 1) {
          this.setLocCdCombo([resObj[0].loc_cd])
          this.updateFormViewData(resObj[0])
        } else {
          this.setLocCdCombo(
            resObj.map(x => {
              return x.loc_cd
            })
          )
          this.buildSelectLocation()
        }
      } else {
        this.setLocCdCombo([])
        // 출고 주문 상세 정보 조회 시
        Object.keys(resObj).forEach(key => {
          this.updateFormFieldData(key, resObj[key])
        })
      }
    }
  }

  /**
   * 로케이션 콤보 그리기
   ***************************
   * @param {List} selectLocCd
   */
  setLocCdCombo(selectLocCd) {
    let name = 'loc_cd'
    // 기존 location 삭제
    this.search_form_fields.filter(x => x.name == name)[0].options = []
    this.searchForm.requestUpdate()

    // 조회 결과 기준으로 filter
    let locCdCombo = selectLocCd.length == 1 ? [] : [{ name: '', value: '', display: '' }]
    selectLocCd.forEach(locCd => {
      let option = this.locCdMaster.filter(x => x.value == locCd)[0]
      if (option) {
        locCdCombo.push(option)
      }
    })

    // searchForm 갱신
    this.search_form_fields.filter(x => x.name == name)[0].options = locCdCombo
    this.searchForm.requestUpdate()
  }

  /**
   * 재고 바코드 정보로 출고 바코드 정보 설정
   ***********************************
   * @param {Object} inventory
   */
  updateFormViewData(inventory) {
    Object.keys(inventory).forEach(key => {
      if (key == 'expired_date' || key == 'lot_no' || key == 'barcode' || key == 'loc_cd') {
        this.updateFormFieldData(key, inventory[key])
      } else if (key == 'inv_qty') {
        let invQty = inventory[key]
        let ordQty = this.getFormFieldData('ord_qty')
        let rlsQty = invQty > ordQty ? ordQty : invQty
        this.updateFormFieldData('rls_qty', rlsQty)
      }
    })
  }

  /**
   * 폼 필드 이름으로 값 조회
   ***********************************
   * @param {String} fieldName
   * @param {String} fieldValue
   */
  getFormFieldData(fieldName) {
    let params = this.getFormViewDataAll()
    let formFieldData = null
    Object.keys(params).forEach(key => {
      if (key == fieldName) {
        formFieldData = params[key]
        return
      }
    })
    return formFieldData
  }

  /**
   * 폼 필드에 값 설정
   ***********************************
   * @param {String} fieldName
   * @param {String} fieldValue
   */
  updateFormFieldData(fieldName, fieldValue) {
    let element = this.renderRoot.querySelector(`#${fieldName}`)
    if (ValueUtil.isNotEmpty(element)) {
      element.setValue(fieldValue)
    }
  }

  /**
   * 동일 바코드가 여러 로케이션에 존재하는 경우 검색 정보에 셀렉터로 설정해서 사용자가 선택할 수 있도록 ...
   ***********************************
   * @param {Array} inventories
   */
  buildSelectLocation() {
    UiUtil.showToast('info', TermsUtil.tText('outbound_job_multiple_loc'))
  }
}

customElements.define('rls-work-item-element', RlsWorkItemElement)
