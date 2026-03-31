import '@operato/form/ox-search-form.js'

import { css } from 'lit-element'
import { ButtonContainerStyles, CommonButtonStyles } from '@operato/styles'

import { BasicButtonMixin } from './basic-button-mixin'

import { TermsUtil } from '../utils/terms-util'
import { UiUtil } from '../utils/ui-util'
import { PrintUtil } from '../utils/print-util'
import { MetaApi } from '../utils/meta-api'
import { ServiceUtil } from '../utils/service-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 커스텀 버튼 동작 믹스인
 */
export const CustomButtonMixin = superClass =>
  class extends BasicButtonMixin(superClass) {
    /**
     * @description 버튼 컨테이너 스타일
     ********************************
     */
    static getButtonContainerStyle() {
      return [ButtonContainerStyles]
    }

    /**
     * @description Page Context 생성에서 사용될 버튼 액션 정의
     * - 버튼 타입 중 Grid 리스트 옵션을 선택 한 경우 : get grist() 함수가 페이지 내에 없으면 그리지 않는다.
     * - 버튼 타입 중 Search-From을 선택 한 경우에는 : get searchForm() 함수가 없으면 그리지 않는다.
     ************************************************
     * @returns {Array}
     */
    getCustomActions() {
      // 멀티 레이아웃이면 커스텀 버튼을 사용하지 않음
      if (this.isMultiLayoutPage()) {
        return []
        // 커스텀 버튼에 액션을 연결
      } else {
        return this.filterCustomButton()
          .map(e => {
            // 지원되지 않는 타입 확인 continue
            if (this.isCurrentNotSupportedType(e)) {
              return { name: '_unsupported_' }
            } else {
              // custom 버튼 함수
              e.action = async () => {
                await this.customBtnEventHandler(e)
              }

              let style = e.style ? e.style : e.name
              let btnStyle = CommonButtonStyles[style] || {
                icon: e.style,
                emphasis: {
                  raised: true,
                  outlined: false,
                  dense: false,
                  danger: false
                }
              }

              Object.assign(e, btnStyle)
              return e
            }
          })
          .filter(e => e.name != '_unsupported_')
      }
    }

    /**
     * @description 커스텀 버튼 element를 생성한다.
     * 문서가 페이지로 로딩된 경우에는 빈 배열 리턴 아니면 버튼을 생성해 리턴한다.
     ******************************************
     * @returns {Array}
     */
    getCustomButtons() {
      // 멀티 레이아웃이면 커스텀 버튼을 사용하지 않음
      if (this.is_page && !this.isMultiLayoutPage()) {
        return []
      } else {
        return this.filterCustomButton().map(e => {
          // 지원되지 않는 타입 확인
          if (this.isCurrentNotSupportedType(e)) {
            return { name: '_unsupported_' }
            // 커스텀 버튼 생성
          } else {
            let buttonElement = this.createButtonElement(e.name, e.title, e.style)
            buttonElement['rank'] = e.rank
            // 커스텀 버튼 함수
            buttonElement.onclick = async () => {
              await this.customBtnEventHandler(e)
            }
            return buttonElement
          }
        })
      }
    }

    /**
     * @description 메타 actions에서 커스텀 버튼 조건으로 filtering
     ************************
     * @returns {Array}
     */
    filterCustomButton() {
      return (this.actions || []).filter(action => {
        return (
          action.type &&
          !action.type.startsWith('grid-') &&
          (action.type.startsWith('service-') ||
            action.type.startsWith('popup-form') ||
            action.type.startsWith('popup-link') ||
            action.type.startsWith('page-link') ||
            action.type.startsWith('print-'))
        )
      })
    }

    /**
     * @description 버튼의 타입에 따라 현재 문서에서 지원되지 않는 기능을 확인한다.
     *  - list, selected 타입은 그리스트가 필수
     *  - search-form 타입은 서치 폼이 필수
     ****************************************************************
     * @param {Object} action
     * @returns {Boolean} 해당 페이지가 해당 버튼을 지원하는지 여부
     */
    isCurrentNotSupportedType(action) {
      // 그리스트가 없는 경우 list, selected 타입은 지원하지 않음
      if (
        (action.type.endsWith('list') || action.type.endsWith('selected') || action.type.endsWith('changed')) &&
        !this.grist
      ) {
        return true
      }

      // 서치 폼이 없는 경우 search-form 타입은 지원하지 않음
      /*if (action.type.endsWith('search-form') && !this.searchForm) {
        return true;
      }*/

      return false
    }

    /**
     * @description 커스텀 버튼 핸들러 액션
     **********************************
     * @param {Object} customAction
     */
    async customBtnEventHandler(customAction) {
      // 사용자 확인 체크
      if (customAction.confirm_flag == true && await UiUtil.confirmTransaction('button.' + customAction.name) != true) return

      let customLogic = { method: customAction.method }
      // 정규 서비스 or 커스텀 서비스 호출
      if (customAction.type.startsWith('service-')) {
        customLogic['action'] = 'service'
        customLogic['param_data'] = customAction.type.replace('service-', '')
        customLogic['logic'] = customAction.logic

        // PDF 인쇄 서비스 호출
      } else if (customAction.type.startsWith('print-pdf')) {
        customLogic['action'] = 'print-pdf'
        customLogic['param_data'] = customAction.type.replace('print-pdf-', '')
        customLogic['logic'] = customAction.logic

        // ZPL 기반 바코드 출력 서비스 호출
      } else if (customAction.type.startsWith('print-barcode')) {
        customLogic['action'] = 'print-barcode'
        customLogic['param_data'] = customAction.type.replace('print-barcode-', '')
        customLogic['logic'] = customAction.logic

        // 페이지 이동
      } else if (customAction.type.startsWith('page-link-')) {
        customLogic['action'] = 'page'
        customLogic['param_data'] = customAction.type.replace('page-link-', '')
        customLogic['logic'] = customAction.logic

        // 팝업 열기
      } else if (customAction.type.startsWith('popup-link-')) {
        customLogic['action'] = 'popup'
        customLogic['param_data'] = customAction.type.replace('popup-link-', '')
        customLogic['logic'] = JSON.parse(customAction.logic)

        // Diy Export Excel
      } else if (customAction.type.startsWith('print-excel')) {
        customLogic['action'] = 'print-excel'
        customLogic['param_data'] = customAction.type.replace('print-excel-', '')
        customLogic['logic'] = JSON.parse(customAction.logic)
      }

      // 파라미터로 전달할 데이터 추출
      let parameters = await this.getCustomButtonParams(customLogic)
      if (parameters) {
        parameters = parameters == 'ok' ? undefined : parameters

        // 페이지 이동
        if (customLogic.action == 'page') {
          MetaApi.pageNavigate(customLogic.logic, parameters)

          // 팝업 처리
        } else if (customLogic.action == 'popup') {
          // 팝업 설정
          let popupConf = customLogic.logic
          // 팝업 클로저 함수
          let closerCallbackFunc = this.getPopupCloseCallbackFunc(popupConf)
          // 부모 화면에서 넘어온 레코드의 ID 값
          let parentIdVal =
            parameters && parameters.id
              ? parameters.id
              : (popupConf && popupConf.parent_field ? popupConf.parent_field : undefined)
          // 팝업 설정에 부모 화면 메뉴 ID 정보 추가
          popupConf.parent_menu_id = this.menu.id
          // 동적 팝업 오픈
          await UiUtil.openDynamicPopup(null, popupConf, parameters, parentIdVal, closerCallbackFunc)

          // 바코드 인쇄 처리
        } else if (customLogic.action == 'print-barcode') {
          await PrintUtil.printLabelByService(customLogic.logic, parameters)

          // PDF 인쇄 처리
        } else if (customLogic.action == 'print-pdf') {
          let pdfUrl = customLogic.logic.replace(':id', parameters.id)
          await PrintUtil.ghostPrintPdf(pdfUrl, parameters)

          // Diy Export Excel
        } else if (customLogic.action == 'print-excel') {
          let logic = customLogic.logic
          let fileName = logic.filename ? logic.filename : null
          let excelUrl = logic.url.replace(':id', parameters.id)
          await ServiceUtil.excelFileDownload('stream/' + excelUrl, null, fileName)

          // 서비스 (정규 서비스 or 커스텀 서비스)
        } else if (customLogic.action == 'service') {
          if (customLogic.logic.indexOf(':id') >= 0) {
            customLogic.logic = customLogic.logic.replace(':id', this.is_element ? this.parent_id : parameters.id)
          }

          if (customLogic.param_data == 'form-param' || customLogic.param_data == 'form-param-all') {
            return await this.requestRestService(customLogic.method, customLogic.logic + '?' + parameters)
          } else {
            if (customLogic.param_data == 'search-form') {
              return await this.requestRestService(customLogic.method, customLogic.logic, { form: parameters })
            } else if (customLogic.param_data == 'list' || customLogic.param_data == 'changed') {
              // return await this.requestRestService(customLogic.method, customLogic.logic, { list: parameters })
              return await this.requestRestService(customLogic.method, customLogic.logic, parameters)
            } else if (customLogic.param_data == 'selected') {
              return await this.requestRestService(customLogic.method, customLogic.logic, { data: parameters })
            } else if (customLogic.param_data == 'selected-bare' || customLogic.param_data == 'changed-bare') {
              return await this.requestRestService(customLogic.method, customLogic.logic, parameters)
            } else {
              return await this.requestRestService(customLogic.method, customLogic.logic, parameters)
            }
          }
        }
      }

      return null
    }

    /**
     * @description 커스텀 버튼 파라미터를 생성한다.
     ********************************************
     * @param {String} customLogic 커스텀 버튼 설정 정보
     * @return {Object}
     */
    async getCustomButtonParams(customLogic) {
      /**
       * 파라미터 타입
       *  - none (파라미터 없음)
       *  - search-form (검색 폼 파라미터 전달)
       *  - selected (선택한 그리드 항목 파라미터 전달)
       *  - list (선택한 그리드 항목 리스트 파라미터 전달)
       *  - chagned (그리드에서 변경된 리스트 파라미터 전달)
       *  - form-map (폼 뷰 데이터를 오브젝트 파라미터로 전달)
       *  - form-param (폼 뷰 데이터를 파라미터로 전달)
       */
      let paramType = customLogic.param_data

      // 파라미터 사용 안 하는 경우
      if (paramType == 'none') {
        return 'ok'
      }

      // 검색 폼 값을 파라미터로 사용하는 경우 (search-form, ox-filter-form 두 가지 타입)
      if (paramType == 'search-form') {
        let formFilters = this.searchForm ? await this.searchForm.getQueryFilters() : []
        let formParams = {}
        formFilters.forEach(filter => {
          formParams[filter.name] = filter.value
        })

        return formParams
      }

      // 그리드 전체 데이터를 파라미터로 사용하는 경우
      if (paramType == 'list-all') {
        return this.grist.dirtyData.records
      }

      // 여러 개의 선택한 그리드 리스트 혹은 선택한 하나의 항목을 파라미터로 사용하는 경우
      if (paramType == 'list' || paramType == 'selected' || paramType == 'selected-bare') {
        let selectedList = this.grist.selected

        if (!selectedList || selectedList.length == 0) {
          MetaApi.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
          return undefined
        }

        return paramType == 'list' ? selectedList : selectedList[0]
      }

      // 그리드에서 사용자가 변경한 정보를 리스트로 리턴
      if (paramType == 'changed' || paramType == 'changed-bare') {
        let changedRows = this.getPatches()

        if (!changedRows || changedRows.length == 0) {
          MetaApi.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
          return undefined
        }

        return changedRows
      }

      // 폼 뷰 데이터를 파라미터로 사용
      if (
        paramType == 'form-map' ||
        paramType == 'form-param' ||
        paramType == 'form-map-all' ||
        paramType == 'form-param-all'
      ) {
        if (!this.getFormViewData) {
          return undefined
        }

        let formMap = paramType.endsWith('all') ? this.getFormViewDataAll() : this.getFormViewData()
        if (paramType.startsWith('form-map')) {
          // form-map은 데이터를 그대로 리턴
          return formMap
        } else {
          // form-param은 문자열로 가공된 결과를 리턴
          let paramString = ''
          Object.keys(formMap).forEach(key => {
            paramString += `${key} = ${formMap[key]} & `
          })

          return paramString
        }
      }

      return undefined
    }

    /**
     * @description 팝업 클로즈 콜백 함수를 추출
     ********************************************
     * @param {Object} popupConfig 팝업 Configuration
     * @return {Function}
     */
    getPopupCloseCallbackFunc(popupConfig) {
      if (popupConfig && popupConfig.close_handler) {
        if (popupConfig.close_handler == 'parent.fetch') {
          return this.fetchHandler.bind(this)
        }
      }

      return null
    }
  }
