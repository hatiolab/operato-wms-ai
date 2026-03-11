import { store, navigate } from '@operato/shell'
import { OxPrompt } from '@operato/popup/ox-prompt.js'
import { openPopup } from '@operato/layout'
import { closePopup } from '@operato/popup'
import { getEditor } from '@operato/data-grist'
import { isMobileDevice } from '@operato/utils'

import { currentLocale } from '@operato-app/operatofill'

import { TermsUtil } from './terms-util'
import { ValueUtil } from './value-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description UI 관련 유틸리티 함수 정의
 */
export class UiUtil {
  /**
   * @description 현재 디바이스가 모바일 장비인지 체크
   **************************************
   * @returns {Boolean} 모바일 장비 여부
   */
  static isMobileEnv() {
    return isMobileDevice()
  }

  /**
   * @description 현재 로케일 정보 리턴
   **************************************
   * @returns {String} 현재 브라우저의 로케일 정보
   */
  static currentLocale() {
    currentLocale()
  }

  /**
   * @description 최종 애플리케이션 모듈 정보 리턴
   *****************************************
   * @returns {Object} 최종 애플리케이션 모듈
   */
  static getApplicationModuleInfo() {
    let modules = store.getState().app.modules
    return modules[modules.length - 1]
  }

  /**
   * @description 현재 액티브 된 화면의 라우팅 정보
   **************************************
   * @returns {String} 현재 액티브 된 화면의 라우팅 정보
   */
  static currentRouting() {
    return store.getState().route.page
  }

  /**
   * @description popup 닫기
   ************************
   * @param {HTML} popup
   */
  static closePopupBy(popup) {
    closePopup(popup)
  }

  /**
   * @description 오픈하고자 하는 엘리먼트를 받아 팝업 오픈
   *************************************************
   * @param {String} popupTitle 팝업 타이틀
   * @param {String} popupSize 팝업 사이즈 ex) 'large', 'medium', 'small'
   * @param {String} element 팝업에 표시할 엘리먼트
   * @param {Boolean} backdrop 백드롭 여부
   * @returns {Object} popup
   */
  static openPopupByElement(popupTitle, popupSize, element, backdrop) {
    return openPopup(element, {
      backdrop: true,
      size: popupSize,
      title: popupTitle,
      backdrop: backdrop
    })
  }

  /**
   * @description 동적 임포트
   *******************************
   * @param {String} module 모듈명
   * @param {Object} popupConfig 팝업 구성을 위한 설정 정보 ex) { module: 'metapage', import: '{"module":"metapage", "import":"pages/basic-grist-element.js', tagname: 'basic-grist-element', menu: 'menu_name', size: 'large | medium | small', popup_field: '', parent_field: '', title: '', title_field: '', popup_closer_async: true }
   */
  static async dynamicImport(module, popupConfig) {
    // 동적 임포트는 지원하지 않음, 임포트는 무조건 Static으로 되어야 함...
  }

  /**
   * @description popupConfig에 포함된 엘리먼트 정보를 이용해 팝업을 연다
   **************************************************************
   * @param {String} title 팝업 타이틀
   * @param {Object} popupConfig 팝업 구성을 위한 설정 정보 ex) { module: 'metapage', import: '{"module":"metapage", "import":"pages/basic-grist-element.js', tagname: 'basic-grist-element', menu: 'menu_name', size: 'large | medium | small', popup_field: '', parent_field: '', title: '', title_field: '', popup_closer_async: true }
   * @param {Object} paramData 팝업에 넘겨 줄 파라미터
   * @param {String} parentIdValue 실행할 팝업에 넘겨줄 부모 ID 값
   * @param {Function} popupCloseCallback 팝업 닫을 때 실행되기 위한 콜백 함수
   */
  static async openDynamicPopup(title, popupConfig, paramData, parentIdValue, popupCloseCallback) {
    // 타이틀 값이 없을 때 popupConfig에서 추출
    if (!title) {
      let recordTitle = popupConfig.title_field ? paramData[popupConfig.title_field] : ''
      let basicTitle = ValueUtil.isNotEmpty(popupConfig.title) ? TermsUtil.t(popupConfig.title) : ''
      title =
        ValueUtil.isNotEmpty(recordTitle) && ValueUtil.isNotEmpty(basicTitle)
          ? `${basicTitle} (${recordTitle})`
          : ValueUtil.isNotEmpty(basicTitle)
            ? basicTitle
            : ValueUtil.isNotEmpty(recordTitle)
              ? recordTitle
              : ''
    }

    // 부모 필드
    if (!parentIdValue) {
      parentIdValue = ValueUtil.isNotEmpty(popupConfig.parent_field)
        ? ValueUtil.getParams(paramData, ...popupConfig.parent_field.split('.'))
        : undefined
    }

    // 팝업 엘리먼트 생성
    let htmlText = `<${popupConfig.tagname} route_name='${popupConfig.menu}' parent_id='${parentIdValue}'></${popupConfig.tagname}>`
    let htmlElement = UiUtil.htmlToElement(htmlText)
    htmlElement.is_popup = true
    htmlElement.parent_menu_id = popupConfig.parent_menu_id

    // 팝업 엘리먼트의 특정 변수에 파라미터 값 설정
    if (ValueUtil.isNotEmpty(popupConfig.popup_field)) {
      htmlElement[popupConfig.popup_field] = paramData
    }

    // 팝업 오픈
    let popup = UiUtil.openPopupByElement(title, popupConfig.size, htmlElement, true)

    // 팝업 close handler
    if (popupCloseCallback) {
      let popupCloserAsync = popupConfig.popup_closer_async ? true : false

      if (popupCloserAsync) {
        popup.onclosed = async e => {
          await popupCloseCallback()
        }
      } else {
        popup.onclosed = () => {
          popupCloseCallback()
        }
      }
    }
  }

  /**
   * @description tagname, routing으로 커스텀 엘리먼트 생성
   ****************************************************
   * @param {String} tagname 팝업에 포함할 태그 명
   * @param {String} routing 라우팅
   * @returns {HTMLElement} 커스텀 엘리먼트
   */
  static createCustomElement(tagname, routing) {
    let htmlStr = `<${tagname} route_name='${routing}'></${tagname}>`
    return UiUtil.htmlToElement(htmlStr)
  }

  /**
   * @description HTML 문자열을 elements로 변환
   **************************************
   * @param {String} htmlString html 문자열
   * @returns {HTMLElement} 커스텀 엘리먼트
   */
  static htmlToElement(htmlString) {
    var template = document.createElement('template')
    template.innerHTML = htmlString
    var elements = template.content.childNodes
    var element = elements[0]
    template.content.removeChild(element)
    return element
  }

  /**
   * @description 페이지 이동
   **************************************
   * @param {String} url 페이지 URL (route 값)
   * @param {Object} params 페이지 파라미터, null 가능
   */
  static pageNavigate(url, params) {
    let paramStr = params ? '?' : ''

    if (params) {
      paramStr += 'pass=' + JSON.stringify(params)
    }

    navigate(`${url}${paramStr}`)
  }

  /**
   * @description 페이지 이동(주소표시줄에 파라미터 미표시)
   **************************************
   * @param {String} url 페이지 URL (route 값)
   * @param {Object} params 페이지 파라미터, null 가능
   */
  static pageNavigateWithSilenceOfParams(page, params) {
    history.pushState({}, '', page)
    store.dispatch({
      type: 'UPDATE_PAGE',
      page,
      params: { pass: JSON.stringify(params) }
    })
  }

  /**
   * @description store의 정보 추출
   ****************************************************
   * @param {String} accessor1 스토어 액세서 1, 빈 값 가능
   * @param {String} accessor2 스토어 액세서 2, 빈 값 가능
   * @param {String} accessor3 스토어 액세서 3, 빈 값 가능
   * @returns {Object} store 정보
   */
  static getStore(accessor1, accessor2, accessor3) {
    let store = store.getState()

    if (accessor1 && accessor2 && accessor3) {
      return store[accessor1][accessor2][accessor3]
    } else if (accessor1 && accessor2) {
      return store[accessor1][accessor2]
    } else if (accessor1) {
      return store[accessor1]
    } else {
      return store
    }
  }

  /**
   * @description 커스텀 이벤트 전파
   *************************************
   * @param {String} eventName 이벤트 이름
   * @param {Object} eventDetail 이벤트 상세 정보
   */
  static fireCustomEvent(eventName, eventDetail) {
    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail: eventDetail
      })
    )
  }

  /**
   * @description 토스트 메시지 표시
   *************************************
   * @param {String} type 토스트 타입
   * @param {String} message 메시지
   */
  static showToast(type, message) {
    document.dispatchEvent(
      new CustomEvent('notify', {
        detail: { type, message, option: { timer: UiUtil.getNotificationTimer() } }
      })
    )
  }

  /**
   * @description Alert 메시지 창 표시
   *************************************
   * @param {String} titleCode Alert 제목 표시를 위한 용어 이름, 예) title.confirm
   * @param {String} textCode Alert 텍스트 표시를 위한 용어 이름 예) text.are_you_sure
   * @param {String} type Alert 창 유형 - info, error, warning ...
   * @param {String} confirmButtonCode 확인 버튼 표시를 위한 용어 이름 예) confirm
   * @param {String} cancelButtonCode 취소 버튼 표시를 위한 용어 이름 예) cancel
   * @returns {Object} Alert 팝업
   */
  static async showAlertPopup(titleCode, textCode, type, confirmButtonCode, cancelButtonCode) {
    let alert = {
      title: TermsUtil.t(titleCode, null, titleCode),
      text: TermsUtil.t(textCode, null, textCode)
    }

    if (type) {
      alert['type'] = type
    }

    if (confirmButtonCode) {
      alert['confirmButton'] = { text: TermsUtil.tButton(confirmButtonCode) }
    }

    if (cancelButtonCode) {
      alert['cancelButton'] = { text: TermsUtil.tButton(cancelButtonCode) }
    }

    return await OxPrompt.open(alert)
  }

  /**
   * @description 트랜잭션 실행 전 사용자 확인
   ***************************************
   * @param {String} actionName
   * @returns
   */
  static async confirmTransaction(actionName) {
    return await UiUtil.showAlertPopup(actionName, 'text.are_you_sure', 'question', 'confirm', 'cancel')
  }

  /**
   * @description 필터 폼 내의 에디터들이 가지고 있는 값을 키-값 형태로 추출
   *******************************************************
   * @param {Object} filterForm 그리드 필터 폼
   * @returns {Object} 필터 폼 내의 에디터들이 가지고 있는 값을 키-값 형태로 추출
   */
  static getFilterFormData(filterForm) {
    let formValues = {}

    if (ValueUtil.isNotEmpty(filterForm)) {
      let filters = filterForm.filters()

      if (ValueUtil.isNotEmpty(filters)) {
        filters.forEach(f => {
          if (ValueUtil.isNotEmpty(f.value)) {
            item[f.name] = f.value ? f.value : null
          }
        })
      }
    }

    return formValues
  }

  /**
   * @description name으로 필터 폼 내 에디터를 찾아 값을 셋팅
   *****************************************************
   * @param {Object} filterForm 그리스트 필터 폼
   * @param {String} name 그리스트 필터 폼 내 에디터의 이름
   * @param {Object} value 설정할 값
   */
  static setSearchFormEditorValue(filterForm, name, value) {
    if (ValueUtil.isNotEmpty(filterForm)) {
      let editor = filterForm.renderRoot?.querySelector(`[name='${name}']`)

      if (ValueUtil.isNotEmpty(editor)) {
        editor.value = value
      }
    }
  }

  /**
   * @description 파라미터를 기준으로 유형에 맞는 에디터를 생성한다.
   ******************************************************
   * @param {String} editorType 에디터 유형
   * @param {Object} column 컬럼 Object
   * @param {Object} record 레코드 Object
   * @param {Number} rowIndex 추가할 열 Index
   * @returns {HTMLElement} HTML 에디터
   */
  static createEditorHtml(editorType, column, record, rowIndex) {
    return getEditor(editorType)('', column, record, rowIndex, {})
  }

  /**
   * @description 에디터에 값을 설정한다.
   *********************************
   * @param {Object} editor 에디터
   * @param {String} newValue 설정할 값
   */
  static setValueToEditor(editor, newValue) {
    let input = UiUtil.getLeafInput(editor)
    input.value = newValue
  }

  /**
   * @description 엘리먼트 내 최 하단 Input Element를 추출
   ************************************************
   * @param {Object} editor 에디터
   * @returns {HTMLElement} 엘리먼트 내 최 하단 Input Element
   */
  static getLeafInput(editor) {
    let editorType = editor.getType()

    if (editorType == 'code-editor') {
      return editor.renderRoot.querySelector('ox-input-code')
    } else if (editorType == 'textarea') {
      return editor.renderRoot.querySelector('textarea')
    } else if (editorType == 'select-combo') {
      return editor.renderRoot.querySelector('ox-select').firstElementChild
    } else if (editorType == 'barcode') {
      return editor.renderRoot.querySelector('ox-input-barcode').renderRoot.querySelector('input')
    } else {
      return editor.renderRoot.firstElementChild.editor
    }
  }

  /**
   * 시스템 적으로(사용자의 터치가 아닌 javascript를 통한) 포커스가 해당 input으로 이동하면
   * 모바일 환경에서의 soft-keyboard를 표시하지 않음
   *********************************************
   * @param {Object} event on-focus event
   */
  static hideKeyboard(event) {
    const inputElement = event.currentTarget
    inputElement.setAttribute('readonly', '')
    setTimeout(() => {
      inputElement.removeAttribute('readonly')
    }, 100)
  }

  /**
   * 그리드 Validation 함수 등록
   *****************************
   * @param {Object} gridColumn 그리드 컬럼 설정 오브젝트
   * @param {String} validatorName Validation 명
   */
  static addGridColumnValidator(gridColumn, validatorName) {
    if (validatorName == 'required') {
      UiUtil.addGridColumnRequiredValidator(gridColumn)
    } else if (validatorName == 'data-max-length') {
      UiUtil.addGridColumnLengthValidator(gridColumn)
    } else if (validatorName == 'required && data-max-length') {
      UiUtil.addGridColumnRequiredLengthValidator(gridColumn)
    }
  }

  /**
   * 그리드 Validation 필수 컬럼 체크 함수 등록
   ***************************************
   * @param {Object} gridColumn 그리드 컬럼 설정 오브젝트
   */
  static addGridColumnRequiredValidator(gridColumn) {
    gridColumn.validation = async (after, before, record, column) => {
      let isError = false
      if (column.type == 'checkbox') {
        if (!(after === true || after === false)) isError = true
      } else {
        if (!after || after == '') isError = true
      }

      if (isError === true) {
        let errMsg = TermsUtil.tText('required_error') + ' (' + gridColumn.header + ')'
        await UiUtil.showAlertPopup('title.error', errMsg, 'question', 'confirm', 'cancel')
        return false
      }

      return true
    }
  }

  /**
   * 그리드 Validation 데이터 길이 체크 함수 등록
   ****************************************
   * @param {Object} gridColumn 그리드 컬럼 설정 오브젝트
   */
  static addGridColumnLengthValidator(gridColumn) {
    gridColumn.validation = async (after, before, record, column) => {
      let dataLength = gridColumn.record.size
      if (after && after.length > dataLength) {
        let errMsg = TermsUtil.tError('MAX_LENGTH_OF_X_IS_Y', {
          name: gridColumn.header,
          value: gridColumn.record.size
        })
        await UiUtil.showAlertPopup('title.error', errMsg, 'question', 'confirm', 'cancel')
        return false
      }

      return true
    }
  }

  /**
   * 그리드 Validation 필수값 && 데이터 길이 체크 함수 등록
   ****************************************
   * @param {Object} gridColumn 그리드 컬럼 설정 오브젝트
   */
  static addGridColumnRequiredLengthValidator(gridColumn) {
    gridColumn.validation = async (after, before, record, column) => {
      let isError = false
      if (column.type == 'checkbox') {
        if (!(after === true || after === false)) isError = true
      } else {
        if (!after || after == '') isError = true
      }

      if (isError === true) {
        let errMsg = TermsUtil.tText('required_error') + ' (' + gridColumn.header + ')'
        await UiUtil.showAlertPopup('title.error', errMsg, 'question', 'confirm', 'cancel')
        return false
      }

      let dataLength = gridColumn.record.size
      if (after && after.length > dataLength) {
        let errMsg2 = TermsUtil.tError('MAX_LENGTH_OF_X_IS_Y', {
          name: gridColumn.header,
          value: gridColumn.record.size
        })
        await UiUtil.showAlertPopup('title.error', errMsg2, 'question', 'confirm', 'cancel')
        return false
      }

      return true
    }
  }

  /**
   * Notification timer 설정 리턴
   **************************************
   * @param {Number} notification time
   */
  static getNotificationTimer() {
    let notificationObj = store.getState().notification
    return notificationObj.notificationTimer ? notificationObj.notificationTimer : 5000
  }
}
