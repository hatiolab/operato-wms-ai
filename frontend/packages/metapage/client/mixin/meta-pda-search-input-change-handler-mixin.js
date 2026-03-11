import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'

import { UiUtil } from '../utils/ui-util'
import { TermsUtil } from '../utils/terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description Meta 기반 PDA용 기본 검색 조건 값 변경 이벤트 핸들러
 * - 메뉴 파라미터 설정 스펙
 * [{
    "input_name" : "wh_cd",
    "resource_url" : "no-service",
    "return_type" : "na",
    "form_submit" : false
  }, {
    "input_name" : "gr_plan_date",
    "resource_url" : "gr_orders/search_by/plan_date",
    "return_type" : "data_pass",
    "data_pass_dest_type" : "search",
    "data_pass_dest_element" : "gr_order_no",
    "form_submit" : false
  }, {
    "input_name" : "gr_order_no",
    "resource_url" : "gr_orders/:gr_order_no",
    "return_type" : "data_pass",
    "data_pass_dest_type" : "search",
    "data_pass_dest_element" : "info-form",
    "form_submit" : false
  }, {
    "input_name" : "loc_cd",
    "resource_url" : "",
    "return_type" : "na",
    "form_submit" : false
  }, {
    "input_name" : "barcode",
    "placeholder" : "text.scan_barcode",
    "resource_url" : "",
    "return_type" : "data_pass",
    "data_pass_dest_type" : "grid-data",
    "form_submit" : false,
    "check_duplicated" : true,
    "self_focusing" : true
  }, {
    "input_name" : "barcode",
    "placeholder" : "text.scan_barcode",
    "resource_url" : "",
    "return_type" : "data_pass",
    "data_pass_dest_type" : "popup-form",
    "data_pass_popup_ref_button" : "product-receiving-work",
    "form_submit" : false,
    "check_duplicated" : true,
    "self_focusing" : true
  }]
 */
export const MetaPdaSearchInputChangeHandlerMixin = superClass =>
  class extends superClass {
    /**
     * @description properties
     ****************************
     */
    static get properties() {
      return {
        lastSearchInputName: String, // 현재 검색 입력값 수정 input element
        defaultResourceUrl: String, // 기본 리소스 URL
        searchInputActions: Array, // 검색 폼 input element에 정의된 액션
        focusInputList: Array, // focus 순서를 위한 리스트
        firstFocusInput: Object // 첫번째 포커스 input element
      }
    }

    /**
     * @description Input Event Handler
     ***********************************
     * @param {Object} value
     * @param {Object} searchForm
     * @param {Object} searchFormField
     * @return {Boolean} form submit 여부
     */
    async searchInputEventHandler(value, searchForm, searchFormField) {
      // 1. 값 체크
      if (!value) return false

      // 2. 폼 필드 소스 추출
      let searchInputName = searchFormField.name
      this.lastSearchInputName = searchInputName

      // 3. input action 설정값이 존재하는지 체크
      let processStep = this.isInputActionExist(searchInputName)

      // 4. input action 설정이 아예 존재하지 않는다면 form submit 처리
      if (processStep != 1) return processStep == 0

      // 5. 처리 전 Validation
      if (processStep > 0)
        processStep = await this.searchInputChangeBeforeHandling(searchFormField, searchInputName, value)

      // 6. 처리 준비
      if (processStep > 0)
        processStep = await this.searchInputChangeReadyHandling(searchFormField, searchInputName, value)

      // 7. 처리
      if (processStep > 0) processStep = await this.searchInputChangeDoHandling(searchFormField, searchInputName, value)

      // 8. 처리 후 처리
      if (processStep >= 0)
        processStep = await this.searchInputChangeAfterHandling(searchFormField, searchInputName, value, processStep)

      // 9. 최종 결과에 따른 os-search-form에서 form submit을 처리할 지 여부를 리턴
      let formSubmitFlag = processStep >= 0 ? this.inputActionSettingFormSubmit(searchInputName) : false

      // 10. form submit을 처리한다고 하면 서비스 URL을 기본 URL로 교체
      if (formSubmitFlag) this.resource_url = this.buildUrlBySearchData(this.defaultResourceUrl)

      // 11. form submit 여부
      return formSubmitFlag
    }

    /**
     * @description Before Input Change Event Handling
     ***************************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async searchInputChangeBeforeHandling(searchFormField, searchInputName, value) {
      // 1. Check duplicated check setting value
      if (
        this.inputActionSettingCheckDuplicated(searchInputName) == true &&
        this.isDuplicatedSearchInputData(searchFormField, searchInputName, value) === true
      ) {
        this.findSearchFormInput(searchInputName).value = ''
        return -1
      }

      // 2. Go to next step
      return 1
    }

    /**
     * @description Ready Input Change Event Handling
     **************************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async searchInputChangeReadyHandling(searchFormField, searchInputName, value) {
      // 1. 해당 필드에 매핑된 url을 resource_url을 변경 & 서비스 호출
      this.resource_url = this.inputActionSettingResourceUrl(searchInputName, value, this.defaultResourceUrl)
      // 2. processStep 리턴
      return 1
    }

    /**
     * @description Do Input Change Event Handling
     ***********************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async searchInputChangeDoHandling(searchFormField, searchInputName, value) {
      // URL이 no-service이면 서비스 호출 안 함
      if (this.resourceUrl != 'no-service') {
        // 1. 응답 데이터의 유형 체크
        let returnType = this.inputActionSettingReturnType(searchInputName, 'na')

        // 2. 리턴 유형이 na이면 서비스 호출 후 종료
        if (returnType == 'na') {
          return await this.dataPassToNone(searchFormField, searchInputName, value)

          // 3. 리턴 유형이 data_pass이면 서비스 호출 결과를 다른 엘리먼트에 전달
        } else if (returnType == 'data_pass') {
          let dataPassDestType = this.inputActionSettingDataPassDestType(searchInputName, 'search')

          // 데이터 조회 후 데이터를 전달할 타겟 유형별로 ...
          if (dataPassDestType) {
            // 3.1 데이터 조회 결과를 검색 폼에 적용
            if (dataPassDestType.startsWith('search')) {
              return await this.dataPassToSearch(dataPassDestType, searchFormField, searchInputName, value)

              // 3.2 데이터 조회 결과를 그리드에 적용
            } else if (dataPassDestType.startsWith('grid')) {
              return await this.dataPassToGrid(dataPassDestType, searchFormField, searchInputName, value)

              // 3.3 데이터 조회 결과를 일반 폼에 적용
            } else if (dataPassDestType.startsWith('form')) {
              return await this.dataPassToForm(dataPassDestType, searchFormField, searchInputName, value)

              // 3.4 데이터 조회 결과를 팝업 폼에 적용
            } else if (dataPassDestType.startsWith('popup-form')) {
              return await this.dataPassToPopupForm(dataPassDestType, searchFormField, searchInputName, value)

              // 3.5 data_pass_dest_type 설정값이 유효하지 않은 경우
            } else {
              return this.showToastAndReturnCode(
                'warn',
                'Invalid setting value [' + dataPassDestType + '] of menu parameter [data_pass_dest_type]',
                0
              )
            }
          } else {
            return this.showToastAndReturnCode(
              'warn',
              'Setting value of menu parameter [data_pass_dest_type] does not exist!',
              0
            )
          }
        } else {
          return this.showToastAndReturnCode(
            'warn',
            'Invalid setting value [' + returnType + '] of menu parameter [return_type]',
            0
          )
        }
      }

      // 결과 처리
      return this.resourceUrl == 'no-service' ? 1 : -1
    }

    /**
     * @description After Input Change Event Handling
     **************************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @param {Number} processStep
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async searchInputChangeAfterHandling(searchFormField, searchInputName, value, processStep) {
      // 1. Self 포커스 이동 처리
      if (processStep == 0) {
        let selfInput = this.findSearchFormInput(searchInputName)
        selfInput.value = ''
        selfInput.focus()
        // 2. Next 포커스 이동 처리
      } else {
        this.moveFocusToNextInput(searchInputName)
      }
      // 3. 리턴
      return 1
    }

    /**
     * @description 검색 조건 필드값이 변경될 때 서비스 호출
     ************************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Object} 서비스 호출 후 응답 객체
     */
    async callSearchService(searchFormField, searchInputName, value) {
      // 1. 검색 폼으로 부터 파라미터 구성
      let fetchParam = await this.fetchParamSetter(this.searchForm)
      // 2. 구성된 파라미터로 서비스 호출
      let response = await this.fetchByResource(fetchParam)
      // 3. 에러 케이스
      if (!response) return null
      // 4. searchServiceFetchHandler 핸들러가 존재한다면 핸들러로 응답 결과 핸들링 처리
      if (this.searchServiceFetchHandler) {
        response = this.searchServiceFetchHandler(response)
      }
      // 5. 응답 리턴
      return response
    }

    /**
     * @override Form submit 이후 resultSet 커스터마이징
     *************************************************
     * @param {Object} resultSet
     * @param {Object} response
     * @return {Object} 결과 셋 가공
     */
    fetch_callback(resultSet, response) {
      if (!response) {
        let lastSearchInput = this.findSearchFormInput(this.lastSearchInputName)
        if (lastSearchInput) {
          lastSearchInput.value = ''
          lastSearchInput.focus()
        }
        return resultSet
      } else {
        return resultSet
      }
    }

    /**
     * @description 데이터 조회 후 데이터 패스 안 함
     ******************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async dataPassToNone(searchFormField, searchInputName, value) {
      // 데이터 조회
      let result = await this.callSearchService(searchFormField, searchInputName, value)
      // 에러 발생시 0 리턴
      return result ? 1 : 0
    }

    /**
     * @description 데이터 조회 후 결과를 검색 폼에 적용
     *********************************************
     * @param {String} dataPassDestType
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async dataPassToSearch(dataPassDestType, searchFormField, searchInputName, value) {
      // 1. 서비스 호출
      let results = await this.callSearchService(searchFormField, searchInputName, value)
      // 에러 발생시 리턴 0
      if (!results) return 0
      // 2. 데이터 전달 대상 엘리먼트 명 추출
      let dataPassInputNames = this.inputActionSettingDataPassDestElement(searchInputName, '')
      // 3. 전달 엘리먼트에 값 전달
      if (dataPassInputNames) {
        // 3.1 전달 엘리먼트를 ','로 구분하여
        let dataPassInputNameArr = dataPassInputNames.split(',')
        // 3.2 하나 이상이면 서비스 결과로 부터 개별 값을 찾아서 전달
        if (dataPassInputNameArr.length > 1) {
          if (Array.isArray(results)) {
            return this.showToastAndReturnCode('warn', 'Service result type is not object but array!', 0)
          }

          for (let i = 0; i < dataPassInputNameArr.length; i++) {
            let inputBindInfo = dataPassInputNameArr[i]
            // 검색 조건 필드 명
            let inputName = inputBindInfo.indexOf(':') > 0 ? inputBindInfo.split(':')[0] : inputBindInfo
            // 검색 조건 필드에 전달할 값 매핑 설정
            let mappingName = inputBindInfo.indexOf(':') > 0 ? inputBindInfo.split(':')[1] : inputBindInfo
            // 검색 필드 추출
            let searchInput = this.findSearchFormInput(inputName)
            // 검색 필드가 존재한다면
            if (searchInput) {
              let inputValue = results[inputName]
              // 레코드 매핑 필드 명에 '.'이 존재하면 해당 정보는 object 형식이므로 이에 대한 값 매칭 처리
              if (mappingName.indexOf('.') > 0) {
                let mappingNameArr = mappingName.split('.')
                let mappingObjName = mappingNameArr[0]
                let mapingFieldName = mappingNameArr[1]
                let mappingObjVal = results[mappingObjName]
                if (mappingObjVal) {
                  inputValue = mappingObjVal[mapingFieldName]
                } else {
                  return this.showToastAndReturnCode(
                    'warn',
                    'Service data named [' + inputName + '] data does not exist!',
                    0
                  )
                }
              }
              searchInput.value = inputValue
            } else {
              return this.showToastAndReturnCode(
                'warn',
                'Search Input element named [' + inputName + '] does not exist!',
                0
              )
            }
          }

          return 1
          // 3.3 하나이면 엘리먼트를 찾아서 엘리먼트에 서비스 호출 결과 설정
        } else {
          let searchInput = this.findSearchFormInput(dataPassInputNames)
          if (searchInput) {
            if (searchInput.nodeName == 'SELECT' && Array.isArray(results)) {
              // 1. select options 제거
              searchInput.options.length = 0
              // 2. select options 값 추가
              results.forEach(r => {
                let option = document.createElement('option')
                option.innerText = r.name
                searchInput.append(option)
              })
            } else {
              // select input 종류별로 값 설정 ...
              searchInput.value = typeof results == 'string' ? results : results[searchInputName]
            }

            return 1
          } else {
            return this.showToastAndReturnCode(
              'warn',
              'Search Input element named [' + dataPassInputNames + '] does not exist',
              0
            )
          }
        }
        // 4. 전달 엘리먼트 설정값이 없다면 에러
      } else {
        return this.showToastAndReturnCode('warn', 'Menu parameter [data_pass_dest_element] value does not exist', 0)
      }
    }

    /**
     * @description 데이터 조회 후 결과를 그리드에 적용
     ********************************************
     * @param {String} dataPassDestType
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async dataPassToGrid(dataPassDestType, searchFormField, searchInputName, value) {
      // 1. 그리드 대상을 설정에서 가져와서 ...
      let targetGrid = this.grist
      // 2. 이전 데이터 보관
      let oriRecords = JSON.parse(
        JSON.stringify(targetGrid.data && targetGrid.data.records ? targetGrid.data.records : [])
      )
      // 3. 서비스 호출
      let results = await this.callSearchService(searchFormField, searchInputName, value)
      // 4. 응답이 없다면 서비스 호출에 문제 발생함
      if (!results) return 0
      // 5. 결과 체크
      let list = this.resultSetToList(results)
      // 6. 데이터 전달 유형이 grid-list이면 그리드 데이터를 갱신
      if (dataPassDestType == 'grid-list') {
        targetGrid.data = { records: list, total: list.length }
        // 7. 데이터 전달 유형이 grid-data이면 조회한 데이터를 그리드 데이터에 추가
      } else if (dataPassDestType == 'grid-data') {
        if (list) {
          list.forEach(rec => {
            oriRecords.unshift(rec)
          })
          targetGrid.data = { records: oriRecords, total: oriRecords.length }
        }
      }

      return 1
    }

    /**
     * @description 데이터 조회 후 결과를 리스트로 추출
     ********************************************
     * @param {Object} result
     * @return {Array} 배열 데이터
     */
    resultSetToList(result) {
      if (!result) {
        return null
      } else if (Array.isArray(result)) {
        return result
      } else {
        if (result.items && Array.isArray(result.items)) {
          return result.items
        } else if (result.records && Array.isArray(result.records)) {
          return result.records
        }
      }
    }

    /**
     * @description 데이터 조회 후 결과를 폼에 적용
     *****************************************
     * @param {String} dataPassDestType
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async dataPassToForm(dataPassDestType, searchFormField, searchInputName, value) {
      // TODO 테스트 필요
      // 1. 서비스 호출
      let results = await this.callSearchService(searchFormField, searchInputName, value)
      // 2. 서비스 호출 오류 발생시 리턴 0
      if (!results) return 0

      // 3. data_pass_dest_element 설정값을 추출하여
      let destFormName = this.inputActionSettingDataPassDestElement(searchInputName, '*')
      // 4. 설정값으로 폼을 찾아서
      let destForm = this.renderRoot.querySelector(`[name="${elementName}"]`)
      // 5. 폼을 찾았다면 찾은 폼에 서비스 호출 데이터 결과를 바인딩
      if (destForm) {
        destForm.setValues(results)
        return 1
        // 6. 폼을 못 찾았다면 에러 출력
      } else {
        return this.showToastAndReturnCode('warn', 'Form [' + destFormName + '] does not exist!', 0)
      }
    }

    /**
     * @description 데이터 조회 후 결과를 팝업 폼에 적용
     *********************************************
     * @param {String} dataPassDestType
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async dataPassToPopupForm(dataPassDestType, searchFormField, searchInputName, value) {
      // 1. 서비스 호출
      let result = await this.callSearchService(searchFormField, searchInputName, value)
      // 2. 응답이 없다면 서비스 호출에 문제 발생함
      if (!result) return 0

      // 3. 팝업 실행을 위한 참조 버튼 정보 추출 (popup_ref_button)
      let refButtonName = this.inputActionSettingDataPassPopupRefButton(searchInputName, '')
      if (!refButtonName) {
        return this.showToastAndReturnCode('warn', `Popop button setting of ${searchInputName} doesn't exist!`, 0)
      }

      // 4. 팝업 실행을 위한 참조 버튼 설정 추출
      let btnAction = this.actions.find(a => {
        return a.name == refButtonName
      })
      if (!btnAction) {
        return this.showToastAndReturnCode('warn', `Button setting named [${refButtonName}] doesn't exist!`, 0)
      }

      // 5. popup close callback handler
      let popupLogic = JSON.parse(btnAction.logic)
      let closerCallbackFunc = this.getPopupCloseCallbackFunc(popupLogic)
      let idValue = popupLogic.parent_field ? result[popupLogic.parent_field] : record.id ? record.id : ''

      // 6. 팝업 실행 title, popupConfig, paramData, parentIdValue, popupCloseCallback
      await UiUtil.openDynamicPopup(null, popupLogic, result, idValue, closerCallbackFunc)
      return 1
    }

    /**
     * @override custom-button-mixin#getPopupCloseCallbackFunc
     ***********************************************************
     * @param {Object} popupConfig
     */
    getPopupCloseCallbackFunc(popupConfig) {
      if (popupConfig && popupConfig.close_handler && popupConfig.close_handler == 'parent.fetch') {
        // resourceUrl을 설정
        this.resource_url = this.buildUrlBySearchData(this.defaultResourceUrl)
        return () => {
          this.fetchHandler(this.searchForm)
        }
      }
    }

    /**
     * @description 입력한 검색 조건이 중복 데이터인지 체크
     ***********************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 중복 데이터 여부
     */
    isDuplicatedSearchInputData(searchFormField, searchInputName, value) {
      if (!this.grist || !this.grist.data || !this.grist.data.records || this.grist.data.records.length == 0) {
        return false
      } else {
        let duplicated = this.grist.data.records.find(r => {
          return r[searchInputName] == value
        })
        if (duplicated) {
          UiUtil.showToast('warn', '[' + TermsUtil.tLabel(searchInputName) + '] value is duplicated!')
        }
        return duplicated ? true : false
      }
    }

    /**
     * @description Find search form input element
     ***********************************************
     * @param elementName input element name
     */
    findSearchFormInput(elementName) {
      let sh = this.searchForm.renderRoot
      return sh.querySelector(`[name="${elementName}"]`)
    }

    /**
     * @description Focus default input
     *************************************
     */
    focusOnDefaultInputElement() {
      let firstFocusInput = this.firstFocusInputElement()
      if (firstFocusInput) {
        firstFocusInput.value = ''
        firstFocusInput.focus()
      }
    }

    /**
     * @description First focus input element
     ******************************************
     * @return {Object}
     */
    firstFocusInputElement() {
      if (this.firstFocusInput) {
        return this.firstFocusInput
      }

      if (this.focusInputList && this.focusInputList.length > 0) {
        let input = this.focusInputList[0]
        input = input.replace('search.', '')
        this.firstFocusInput = this.findSearchFormInput(input)
      }

      return this.firstFocusInput
    }

    /**
     * @description 다음 검색 필드로 포커스 이동
     **************************************
     * @param {String} searchInputName
     */
    moveFocusToNextInput(searchInputName) {
      // self-focusing 값을 초기화 하고 재focusing
      if (this.inputActionSettingSelfFocus(searchInputName) === true) {
        let currentInput = this.findSearchFormInput(searchInputName)
        currentInput.value = ''
        currentInput.focus()
      } else {
        if (this.focusInputList && this.focusInputList.length > 0) {
          // focusInputList 배열에서 현재 인덱스를 찾아 다음 인덱스를 설정
          let inputIdx = this.focusInputList.indexOf(searchInputName)
          let nextInputIdx = inputIdx + 1
          if (inputIdx < 0) {
            inputIdx = this.focusInputList.indexOf('search.' + searchInputName)
            nextInputIdx = inputIdx + 1
          }

          // 다음 인덱스에 해당하는 Element를 설정
          const nextInputName = this.focusInputList[nextInputIdx].replace('search.', '')
          const nextInputElement = this.findSearchFormInput(nextInputName)

          // nextInputName이 현재 index보다 이전에 이미 존재하면
          // 순환 focusing으로 간주하여 사이 input값들 초기화
          if (
            this.focusInputList.findIndex(
              inputName => inputName == nextInputName || inputName.replace('search.', '') == nextInputName
            ) < inputIdx
          ) {
            for (inputIdx; inputIdx < this.focusInputList.length; inputIdx++) {
              const inputNameToClear = this.focusInputList[inputIdx].replace('search.', '')
              const inputElementToClear = this.findSearchFormInput(inputNameToClear)
              inputElementToClear.value = ''
            }
            nextInputElement.value = ''
          }

          nextInputElement.focus()
        }
      }
    }

    /**
     * @description showToast & return code
     *******************************************
     * @param {*} toastType
     * @param {*} toastMsg
     * @param {*} returnCode
     * @returns
     */
    showToastAndReturnCode(toastType, toastMsg, returnCode) {
      UiUtil.showToast(toastType, toastMsg)
      return returnCode
    }

    /**
     * @description URL replace by search form data
     *************************************************
     * @param {String} url
     * @return {String} replaced url
     */
    buildUrlBySearchData(url) {
      let searchUrl = url
      // 검색 폼 값 정보로 :field_name 부분을 모두 값으로 치환
      let formData = this.searchForm.serialize()
      Object.keys(formData).forEach(key => {
        let val = formData[key]
        if (val) searchUrl = searchUrl.replace(':' + key, val)
      })
      return searchUrl
    }

    /**
     * @description 데이터 조회를 위한 리소스 URL 설정값
     **********************************************
     * @param {String} searchInputName
     * @param {String} value
     * @param {String} defaultUrl
     * @return {Boolean}
     */
    inputActionSettingResourceUrl(searchInputName, value, defaultUrl) {
      let url = this.inputActionSettingByInputName(searchInputName, 'resource_url', null)
      url = url ? url.replaceAll(':value', value) : defaultUrl
      return this.buildUrlBySearchData(url)
    }

    /**
     * @description 서비스 호출 후 응답 데이터를 리스트에 적용할 지 여부 설정값
     **************************************************************
     * @param {String} searchInputName
     * @param {String} defaultValue
     * @return {String} na (서비스 호출 후 액션 없음) / data_pass (서비스 호출 후 응답 데이터 전달)
     */
    inputActionSettingReturnType(searchInputName, defaultValue) {
      return this.inputActionSettingByInputName(searchInputName, 'return_type', defaultValue)
    }

    /**
     * @description 서비스 호출 후 Form submit을 ox-search-form에 넘길 지 여부 설정값
     *************************************************************************
     * @param {String} searchInputName
     * @return {Boolean} true / false
     */
    inputActionSettingFormSubmit(searchInputName) {
      return this.inputActionSettingByInputName(searchInputName, 'form_submit', false)
    }

    /**
     * @description 서비스 호출 전 중복 체크 여부 설정값
     ********************************************
     * @param {String} searchInputName
     * @return {Boolean} true / false
     */
    inputActionSettingCheckDuplicated(searchInputName) {
      return this.inputActionSettingByInputName(searchInputName, 'check_duplicated', false)
    }

    /**
     * @description 포커스 이동을 자기 자신으로 할수 있는지 여부 설정값
     *******************************************************
     * @param {String} searchInputName
     * @return {Boolean} true / false
     */
    inputActionSettingSelfFocus(searchInputName) {
      return this.inputActionSettingByInputName(searchInputName, 'self_focusing', false)
    }

    /**
     * @description 데이터 조회 후 데이터를 전달할 타겟 유형 설정값
     *****************************************************
     * @param {String} searchInputName
     * @param {String} defaultValue
     * @return {String} search / form / grid
     */
    inputActionSettingDataPassDestType(searchInputName, defaultValue) {
      return this.inputActionSettingByInputName(searchInputName, 'data_pass_dest_type', defaultValue)
    }

    /**
     * @description 팝업 실행을 위한 참조 버튼명 설정값
     ********************************************
     * @param {String} searchInputName
     * @param {String} defaultValue
     * @return {String} 팝업을 처리할 버튼명
     */
    inputActionSettingDataPassPopupRefButton(searchInputName, defaultValue) {
      return this.inputActionSettingByInputName(searchInputName, 'data_pass_popup_ref_button', defaultValue)
    }

    /**
     * @description 데이터 조회 후 데이터를 전달할 타겟 엘리먼트 명 설정값
     **********************************************************
     * @param {String} searchInputName
     * @param {String} defaultValue
     * @return {String} 엘리먼트 명
     */
    inputActionSettingDataPassDestElement(searchInputName, defaultValue) {
      return this.inputActionSettingByInputName(searchInputName, 'data_pass_dest_element', defaultValue)
    }

    /**
     * @description 검색 필드 입력 필드의 placeholder 설정값
     **********************************************************
     * @param {String} searchInputName
     * @param {String} defaultValue
     * @return {String} 검색 조건 필드 placeholder
     */
    inputActionElementPlaceholder(searchInputName, defaultValue) {
      return this.inputActionSettingByInputName(searchInputName, 'placeholder', defaultValue)
    }

    /**
     * @description 데이터 조회 후 데이터를 전달할 타겟 엘리먼트 명 설정값
     **********************************************************
     * @param {String} searchInputName
     * @param {String} defaultValue
     * @return {String} 엘리먼트 명
     */
    isInputActionExist(searchInputName) {
      if (this.searchInputActions && this.searchInputActions.length > 0) {
        let input = this.searchInputActions.find(i => {
          return i.input_name == searchInputName
        })
        return input ? 1 : -1
      } else {
        return 0
      }
    }

    /**
     * @description input action list의 설정값을 추출
     **********************************************
     * @param {String} searchInputName
     * @param {String} settingName
     * @param {Object} defaultValue
     * @return {Object}
     */
    inputActionSettingByInputName(searchInputName, settingName, defaultValue) {
      let input = null

      if (this.searchInputActions && this.searchInputActions.length > 0) {
        input = this.searchInputActions.find(i => {
          return i.input_name == searchInputName
        })
      }

      return input ? input[settingName] : defaultValue
    }
  }
