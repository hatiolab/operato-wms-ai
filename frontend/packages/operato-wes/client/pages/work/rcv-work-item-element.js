import { LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { MetaMobileFormMixin } from '@operato-app/metapage/dist-client/mixin/meta-mobile-form-mixin'

import { UiUtil } from '@operato-app/metapage/dist-client/utils/ui-util'
import { ValueUtil } from '@operato-app/metapage/dist-client/utils/value-util'
import { ServiceUtil } from '@operato-app/metapage/dist-client/utils/service-util'
import { TermsUtil } from '@operato-app/metapage/dist-client/utils/terms-util'
import { PrintUtil } from '@operato-app/metapage/dist-client/utils/print-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 입고 상세 처리 화면
 */
export class RcvWorkItemElement extends MetaMobileFormMixin(p13n(localize(i18next)(LitElement))) {
  /**
   * @description 조회 결과 셋
   ***************************
   * @param {Object} fetchResult { total: Number, records: Object }
   */
  responseDataSet(fetchResult) {
    super.responseDataSet(fetchResult)

    // 1. 폼 데이터 정보 추출
    let formData = fetchResult.records

    // 2. 인쇄 매수 기본값 설정
    let printCountElement = this.renderRoot.querySelector(`#print_count`)
    printCountElement.setValue(1)

    // 3. 입고 수량 기본값 설정
    let rcvQtyElement = this.renderRoot.querySelector(`#rcv_qty`)
    rcvQtyElement.setValue(formData.rcv_exp_qty)
  }

  /**
   * @override 메소드, 서비스 URL, 파라미터 정보로 REST 서비스를 호출
   ************************************************************
   * @param {String} method 메소드 (GET / PUT / POST / DELETE)
   * @param {String} url 서비스 URL
   * @param {Object} params 파라미터
   * @param {Function} successCallBack 서비스 호출 성공 콜백
   */
  async requestRestService(method, url, params, successCallBack) {
    if (method == 'GET') {
      return await ServiceUtil.restGet(url, params)
    } else {
      if (!successCallBack) {
        successCallBack = this.trxSuccessCallback.bind(this)
      }

      if (method == 'PUT') {
        return await ServiceUtil.restPut(url, params, null, null, successCallBack)
      } else if (method == 'POST') {
        if (this.checkFormData()) {
          let response = await ServiceUtil.restPost(url, params, null, null, successCallBack)
          await this.printReceivingItemLabel(response)
          return response
        }
      } else if (method == 'DELETE') {
        return await ServiceUtil.restDelete(url, params, null, null, successCallBack)
      } else {
        return null
      }
    }
  }

  /**
   * @override 폼 정보를 체크
   ****************************************
   * @return {Boolean} 폼 정보가 유효한 지 여부
   */
  checkFormData() {
    let formData = this.getFormViewDataAll()

    if (ValueUtil.isEmpty(formData.status)) {
      UiUtil.showAlertPopup('title.warn', '입고 처리할 수 있는 상태가 아닙니다.', 'error', 'confirm')
      return false
    }

    if (formData.status == 'END') {
      UiUtil.showAlertPopup('title.warn', '입고 처리가 이미 완료되었습니다.', 'error', 'confirm')
      return false
    }

    if (!formData.rcv_qty || formData.rcv_qty < 1) {
      UiUtil.showAlertPopup('title.warn', '입고 수량이 없거나 0보다 작습니다.', 'error', 'confirm')
      return false
    }

    if (ValueUtil.isEmpty(formData.expired_date)) {
      UiUtil.showAlertPopup('title.warn', 'Date Code 정보가 없습니다.', 'error', 'confirm')
      return false
    }

    if (!formData.print_count || formData.print_count < 1) {
      UiUtil.showAlertPopup('title.warn', '인쇄 매수 정보가 없거나 0보다 작습니다.', 'error', 'confirm')
      return false
    }

    return true
  }

  /**
   * @override 입고 라벨 출력
   *********************************************
   * @param {Object} receivingItem 입고 상세 주문
   */
  async printReceivingItemLabel(receivingItem) {
    let printCount = this.getFormViewDataAll().print_count
    PrintUtil.printLabelByService(this.save_url, { receivingItem: receivingItem }, printCount)
  }
}

customElements.define('rcv-work-item-element', RcvWorkItemElement)
