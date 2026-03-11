import { MetaUtilMixin } from './meta-util-mixin'
import { ServiceUtil } from '../utils/service-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description REST 서비스 관련 믹스 인
 */
export const RestServiceMixin = (superClass) => class extends MetaUtilMixin(superClass) {
  /**
   * @description 메소드, 서비스 URL, 파라미터 정보로 REST 서비스를 호출
   ************************************************************
   * @param {String} method 메소드 (GET / PUT / POST / DELETE)
   * @param {String} url 서비스 URL
   * @param {Object} params 파라미터
   * @param {Function} successCallBack 서비스 호출 성공 콜백
   */
  async requestRestService(method, url, params, successCallBack) {
    if (method == 'GET') {
      return await ServiceUtil.restGet(url, params);
    } else {
      if(!successCallBack) {
        successCallBack = this.trxSuccessCallback.bind(this)
      }

      if(method == 'PUT') {
        return await ServiceUtil.restPut(url, params, null, null, successCallBack);
  
      } else if(method == 'POST') {
        return await ServiceUtil.restPost(url, params, null, null, successCallBack);
  
      } else if(method == 'DELETE') {
        return await ServiceUtil.restDelete(url, params, null, null, successCallBack);
  
      } else {
        return null;
      }
    }
  }

  /**
   * @description REST 서비스 후 성공 콜백
   ************************************
   */
  async trxSuccessCallback() {
    /*if (this.is_popup === true) {
      history.back();
      return;
    }*/

    if(this.parentFetch) {
      this.parentFetch();
    }

    if (this.grist) {
      this.grist.fetch();
    } else if (this.useSearchForm()) {
      this.searchForm.submit();
    } else {
      if(this.fetchHandler) {
        this.fetchHandler();
      }
    }
  }
}