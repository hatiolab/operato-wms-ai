import { OxPrompt } from '@operato/popup/ox-prompt.js'
import { openPopup } from '@operato/layout'

import {
  OperatoTerms,
  operatoGetData,
  operatoGet,
  operatoPostData,
  operatoPost,
  operatoPutData,
  operatoPut,
  operatoDelete,
  operatoUpdateMultiple
} from '@operato-app/operatofill'

export class OperatoUtil {
  /**
   * @description 오픈하고자 하는 엘리먼트를 받아 팝업 오픈
   *************************************************
   * @param {String} popupTitle 팝업 타이틀
   * @param {String} popupSize 'large', 'medium', 'small'
   * @param {String} element 팝업에 표시할 엘리먼트
   */
  static openPopupByElement(popupTitle, popupSize, element) {
    openPopup(element, {
      backdrop: true,
      size: popupSize,
      title: popupTitle
    })
  }

  /**
   * @description logic 에 포함된 element 정보를 이용해 팝업을 연다
   *************************************************
   * @param {String} tagname 팝업에 포함할 태그 명
   * @param {String} routing 라우팅
   */
  static createCustomElement(tagname, routing) {
    var template = document.createElement('template')
    template.innerHTML = `<${tagname} route_name='${routing}'></${tagname}>`
    var elements = template.content.childNodes
    var element = elements[0]
    template.content.removeChild(element)
    return element
  }

  /**
   * @description 토스트 메시지 표시
   *************************************************
   * @param {String} type 토스트 타입
   * @param {String} message 메시지
   */
  static showToast(type, message) {
    document.dispatchEvent(
      new CustomEvent('notify', {
        detail: {
          type,
          message
        }
      })
    )
  }

  /**
   * @description alert 박스 보기
   **************************************
   * @param {String} titleCode
   * @param {String} textCode
   * @param {String} type
   * @param {String} confirmButtonCode
   * @param {String} cancelButtonCode
   * @returns {Object}
   */
  static async showCustomAlert(titleCode, textCode, type, confirmButtonCode, cancelButtonCode) {
    return await this.showAlert(
      OperatoTerms.t1(titleCode),
      OperatoTerms.t1(textCode),
      type,
      confirmButtonCode,
      cancelButtonCode
    )
  }

  /**
   * @description alert 박스 보기 - title, text 번역없이 처리
   ********************************************************
   * @param {String} title
   * @param {String} text
   * @param {String} type
   * @param {String} confirmButtonCode
   * @param {String} cancelButtonCode
   * @returns {Object}
   */
  static async showAlert(title, text, type, confirmButtonCode, cancelButtonCode) {
    let alert = {
      title,
      text
    }

    if (type) {
      alert['type'] = type
    }

    if (confirmButtonCode) {
      alert['confirmButton'] = { text: OperatoTerms.t1(confirmButtonCode) }
    }

    if (cancelButtonCode) {
      alert['cancelButton'] = { text: OperatoTerms.t1(cancelButtonCode) }
    }

    return await OxPrompt.open(alert)
  }

  /**
   * @description Update Multiple 처리 전 데이터 처리
   ************************
   * @param {Objedt} data
   * @returns 업데이트 전 데이터 처리
   */
  static preprocessUpdateMultiple(data) {
    data.cud_flag_ = data.__dirty__ == 'M' ? 'u' : 'c'
    return OperatoUtil.simplifyUpdateMultipleData(data)
  }

  /**
   * @description Delete Multiple 처리 전 데이터 단순화 처리
   ************************
   * @param {Objedt} data
   * @returns 삭제 전 데이터 처리
   */
  static preprocessDeleteMultiple(data) {
    data.cud_flag_ = 'd'
    return OperatoUtil.simplifyUpdateMultipleData(data)
  }

  /**
   * @description Update Multiple 처리 전 데이터 단순화 처리
   ************************
   * @param {Objedt} data
   * @returns
   */
  static simplifyUpdateMultipleData(data) {
    delete data['creator']
    delete data['updater']
    delete data['created_at']
    delete data['updated_at']
    delete data['__dirty__']
    delete data['__dirtyfields__']
    delete data['__origin__']
    delete data['__seq__']
    delete data['__selected__']
    return data
  }

  /**
   * @description object, string, number, array 빈 값 여부 검사
   **************************************
   * @param {Object} param
   * @returns {Boolean}
   */
  static isEmpty(param) {
    if (param === undefined) {
      return true
    } else if (param === null) {
      return true
    } else if (typeof param === 'boolean') {
      return false
    } else if (typeof param === 'string' || typeof param === 'number') {
      if (param == '') return true
    } else if (Array.isArray(param)) {
      if (param.length == 0) return true
    } else if (typeof param === 'object') {
      if (Object.keys(param).length == 0) return true
    }

    return false
  }

  /**
   * @description REST GET 서비스 호출
   ************************
   * @param {String} url
   * @param {Array} params
   * @returns 서버에서 리턴한 JSON 데이터
   */
  static async restGetData(url, params) {
    return await operatoGetData(url, params, true)
  }

  /**
   * @description REST GET 서비스 호출
   ************************
   * @param {String} url
   * @param {Array} params
   * @returns 서버에서 리턴한 response 정보
   */
  static async restGet(url, params) {
    return await operatoGet(url, params, false)
  }

  /**
   * @description REST POST 서비스 호출
   ************************
   * @param {String} url
   * @param {Array} params
   * @returns 서버에서 리턴한 JSON 데이터
   */
  static async restPostData(url, params) {
    return await operatoPostData(url, params, true)
  }

  /**
   * @description REST POST 서비스 호출
   ************************
   * @param {String} url
   * @param {Array} params
   * @returns 서버에서 리턴한 response 정보
   */
  static async restPost(url, params) {
    return await operatoPost(url, params, false)
  }

  /**
   * @description REST PUT 서비스 호출
   ************************
   * @param {String} url
   * @param {Object} params
   * @returns 서버에서 리턴한 JSON 데이터
   */
  static async restPutData(url, params) {
    return await operatoPutData(url, params, true)
  }

  /**
   * @description REST PUT 서비스 호출
   ************************
   * @param {String} url
   * @param {Object} params
   * @returns 서버에서 리턴한 response 정보
   */
  static async restPut(url, params) {
    return await operatoPut(url, params, false)
  }

  /**
   * Rest Delete 서비스
   ************************
   * @param {String} url
   * @param {Array} params
   * @returns
   */
  static async restDelete(url, params) {
    return await operatoDelete(url, params, false)
  }

  /**
   * @description REST Update Multiple 서비스 호출
   ************************
   * @param {Object} grist
   * @param {String} url
   * @returns 서버에서 리턴한 response 정보
   */
  static async restUpdateMultiple(grist, url) {
    let cudRecords = grist.dirtyRecords

    // 변경된 내용이 없음
    if (!cudRecords || cudRecords.length == 0) {
      OperatoUtil.showCustomAlert('title.info', 'text.NOTHING_CHANGED', 'info', 'button.confirm')
    } else {
      // 변경된 내용 추출
      let records = cudRecords.map(record => {
        return OperatoUtil.preprocessUpdateMultiple(record)
      })

      let res = await operatoUpdateMultiple(url, records)
      if (res && res.status < 300) {
        OperatoUtil.showToast('info', OperatoTerms.t1('text.Success to Save'))
        grist.fetch()
      }

      return res
    }
  }

  /**
   * @description REST Delete Multiple 서비스 호출
   ************************************************
   * @param {Object} grist
   * @param {String} url
   * @returns 서버에서 리턴한 response 정보
   */
  static async restDeleteMultiple(grist, url) {
    const records = grist.selected

    if (!records || records.length == 0) {
      OperatoUtil.showCustomAlert('title.info', 'text.NOTHING_SELECTED', 'info', 'button.confirm')
    } else {
      const answer = await OperatoUtil.showCustomAlert(
        'title.confirm',
        'text.Sure to Delete',
        'warning',
        'button.delete',
        'button.cancel'
      )
      if (answer) {
        records.forEach(record => OperatoUtil.preprocessDeleteMultiple(record))
        let res = await operatoUpdateMultiple(url, records)

        if (res && res.status < 300) {
          OperatoUtil.showToast('info', OperatoTerms.t1('text.Success to Delete'))
          grist.fetch()
        }

        return res
      }
    }
  }

  /**
   * @description 그리드의 레코드를 한꺼번에 업데이트
   **************************************
   * @param {String} grist
   * @param {Array} records
   * @param {String} url
   * @returns {Object} 업데이트 처리 응답
   */
  static async updateMultiple(grist, records, url) {
    let res = await operatoUpdateMultiple(url, records)

    if (res && res.status < 300) {
      OperatoUtil.showToast('info', OperatoTerms.t1('text.Success to Save'))
      grist.fetch()
    }

    return res
  }

  /**
   * @description 그리드의 레코드를 한꺼번에 삭제
   **************************************
   * @param {String} grist
   * @param {Array} records
   * @param {String} url
   * @returns {Object} 삭제 처리 응답
   */
  static async deleteMultiple(grist, records, url) {
    let res = await operatoUpdateMultiple(url, records)

    if (res && res.status < 300) {
      OperatoUtil.showToast('info', OperatoTerms.t1('text.Success to Delete'))
      grist.fetch()
    }

    return res
  }

  /**
   * @description 오늘 날짜 값 (YYYY-MM-DD) 리턴
   **************************************
   * @returns
   */
  static getTodayStr() {
    let d = new Date()
    return (
      d.getFullYear() +
      '-' +
      (d.getMonth() + 1 > 9 ? (d.getMonth() + 1).toString() : '0' + (d.getMonth() + 1)) +
      '-' +
      (d.getDate() > 9 ? d.getDate().toString() : '0' + d.getDate().toString())
    )
  }
}
