import { UiUtil } from './ui-util'
import { ServiceUtil } from './service-util'
import { MetaUiUtil } from './meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 API
 */
export class MetaApi {
  /**
   * @description 현재 디바이스가 모바일 장비인지 체크
   ********************************************
   * @returns {Boolean} 모바일 장비 여부
   */
  static isMobileEnv() {
    return UiUtil.isMobileEnv()
  }

  /**
   * @description 현재 로케일 정보 리턴
   **************************************
   * @returns {String} 현재 브라우저의 로케일 정보
   */
  static currentLocale() {
    return UiUtil.currentLocale()
  }

  /**
   * @description 현재 액티브 된 화면의 라우팅 정보
   ******************************************
   * @returns {String} 현재 액티브 된 화면의 라우팅 정보
   */
  static currentRouting() {
    return UiUtil.currentRouting()
  }

  /**
   * @description 최종 애플리케이션 모듈 정보 리턴
   *****************************************
   * @returns {Object} 최종 애플리케이션 모듈
   */
  static getApplicationModuleInfo() {
    return UiUtil.getApplicationModuleInfo()
  }

  /**
   * @description 필터 폼 내의 에디터들이 가지고 있는 값을 키-값 형태로 추출
   *******************************************************
   * @param {Object} filterForm 그리드 필터 폼
   * @returns {Object} 필터 폼 내의 에디터들이 가지고 있는 값을 키-값 형태로 추출
   */
  static getFilterFormData(filterForm) {
    return UiUtil.getFilterFormData(filterForm)
  }

  /**
   * @description name으로 필터 폼 내 에디터를 찾아 값을 셋팅
   *****************************************************
   * @param {Object} filterForm 그리스트 필터 폼
   * @param {String} name 그리스트 필터 폼 내 에디터의 이름
   * @param {Object} value 설정할 값
   */
  static setSearchFormEditorValue(filterForm, name, value) {
    UiUtil.setSearchFormEditorValue(filterForm, name, value)
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
    return UiUtil.createEditorHtml(editorType, column, record, rowIndex)
  }

  /**
   * @description 에디터에 값을 설정한다.
   *********************************
   * @param {Object} editor 에디터
   * @param {String} newValue 설정할 값
   */
  static setValueToEditor(editor, newValue) {
    UiUtil.setValueToEditor(editor, newValue)
  }

  /**
   * @description popup 닫기
   ************************
   * @param {HTML} popup
   */
  static closePopupBy(popup) {
    UiUtil.closePopupBy(popup)
  }

  /**
   * @description 오픈하고자 하는 엘리먼트를 받아 팝업 오픈
   *************************************************
   * @param {String} popupTitle 팝업 타이틀
   * @param {String} popupSize 팝업 사이즈 ex) 'large', 'medium', 'small'
   * @param {String} element 팝업에 표시할 엘리먼트 HTML 문자열
   * @param {Boolean} backdrop 백드롭 여부
   * @returns {Object} 팝업 객체
   */
  static openPopupByElement(popupTitle, popupSize, element, backdrop) {
    return UiUtil.openPopupByElement(popupTitle, popupSize, element, backdrop)
  }

  /**
   * @description popupConfig에 포함된 element 정보를 이용해 팝업을 연다.
   **************************************************************
   * @param {String} title 팝업 타이틀
   * @param {Object} popupConfig 팝업 구성을 위한 설정 정보 ex) { module: '', location: '', tagname: '', size : '', popup_field: '', parent_field: '' }
   * @param {Object} paramData 팝업에 넘겨 줄 파라미터
   * @param {Function} popupCloseCallback 팝업 닫을 때 실행되기 위한 콜백 함수
   */
  static async openDynamicPopup(title, popupConfig, paramData, popupCloseCallback) {
    await UiUtil.openDynamicPopup(title, popupConfig, paramData, popupCloseCallback)
  }

  /**
   * @description tagname, routing으로 커스텀 엘리먼트 생성
   ****************************************************
   * @param {String} tagname 팝업에 포함할 태그 명
   * @param {String} routing 라우팅
   * @returns {HTMLElement} 커스텀 엘리먼트
   */
  static createCustomElement(tagname, routing) {
    return UiUtil.createCustomElement(tagname, routing)
  }

  /**
   * @description HTML 문자열을 elements로 변환
   **************************************
   * @param {String} htmlStr html 문자열
   * @returns {HTMLElement} 커스텀 엘리먼트
   */
  static htmlToElement(htmlStr) {
    return UiUtil.htmlToElement(htmlStr)
  }

  /**
   * @description 페이지 이동
   **************************************
   * @param {String} url 페이지 URL (route 값)
   * @param {Object} params 페이지 파라미터, null 가능
   */
  static pageNavigate(url, params) {
    UiUtil.pageNavigate(url, params)
  }

  /**
   * @description 페이지 이동 (주소표시줄에 파라미터 미표시)
   **************************************
   * @param {String} url 페이지 URL (route 값)
   * @param {Object} params 페이지 파라미터, null 가능
   */
  static pageNavigateWithSilenceOfParams(url, params) {
    UiUtil.pageNavigateWithSilenceOfParams(url, params)
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
    return UiUtil.getStore(accessor1, accessor2, accessor3)
  }

  /**
   * @description 커스텀 이벤트 전파
   *************************************
   * @param {String} eventName 이벤트 이름
   * @param {Object} eventDetail 이벤트 상세 정보
   */
  static fireCustomEvent(eventName, eventDetail) {
    UiUtil.fireCustomEvent(eventName, eventDetail)
  }

  /**
   * @description 토스트 메시지 표시
   *************************************
   * @param {String} type 토스트 타입
   * @param {String} message 메시지
   */
  static showToast(type, message) {
    UiUtil.showToast(type, message)
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
    return await UiUtil.showAlertPopup(titleCode, textCode, type, confirmButtonCode, cancelButtonCode)
  }

  /**
   * @description 공통 코드 명으로 공통 코드 리스트 조회 후 리턴
   **************************************
   * @param {String} codeName 공통 코드 명
   * @returns {Array} 코드 리스트
   */
  static async codeItems(codeName) {
    return await ServiceUtil.codeItems(codeName)
  }

  /**
   * @description code selector 에디터를 위한 공통 코드 조회
   **************************************
   * @param {String} codeName 공통 코드 명
   * @returns {Array} 설정값 클리어를 위해 빈 값이 추가된 코드 리스트
   */
  static async getCodeSelectorData(codeName) {
    return await ServiceUtil.getCodeSelectorData(codeName)
  }

  /**
   * @description 커스텀 서비스를 호출해 코드 정보를 가져온다.
   * 시나리오에서는 [{name : name, description : description}] 형태의 배열로 리턴한다.
   ****************************************
   * @param {String} name 시나리오 명
   * @param {Array} args 시나리오 호출을 위한 변수
   */
  static async getCodeByCustomService(name, args) {
    return await ServiceUtil.getCodeByCustomService(name, args)
  }

  /**
   * @description 응답이 처리된 후 REST 서비스 Error 메시지 표시
   ****************************************************
   * @param {Object} response 응답
   */
  static async showRestErrorResponse(response) {
    await ServiceUtil.showRestErrorResponse(response)
  }

  /**
   * @description REST 서비스 실행 시 발생한 예외 표시
   *************************************************
   * @param {Object} exception graphql 에러
   */
  static async showRestException(exception) {
    await ServiceUtil.showRestException(exception)
  }

  /**
   * @description 그리드 데이터 내보내기
   *********************************
   * @param {Boolean} isElement 팝업으로 실행 중인지 여부
   * @param {String} exportTitle 그리드 내보내기 용 타이틀
   * @param {Grist} grist 그리드 오브젝트
   * @returns {Object} { header: headerSetting, data: data } or Not
   */
  static async exportableData(isElement, exportTitle, grist) {
    return await ServiceUtil.exportableData(isElement, exportTitle, grist)
  }

  /**
   * @description 데이터 리스트 페이지네이션 조회
   ******************************************
   * @param {String} url REST 서비스 URL
   * @param {Array} filters 조회 조건
   * @param {Array} sortings 소팅 조건
   * @param {Number} page 현재 페이지
   * @param {Number} limit 페이지 당 표시할 레코드 건수
   * @param {String} selectFields 조회할 필드 리스트
   * @returns {Array} 조회 결과 { items : [{...}], total : 100 }
   */
  static async searchByPagination(url, filters, sortings, page, limit, selectFields) {
    return await ServiceUtil.searchByPagination(url, filters, sortings, page, limit, selectFields)
  }

  /**
   * @description 레코드의 id를 이용해 데이터 한 건 조회
   *********************************************
   * @param {String} url 조회할 query 함수명
   * @param {String} id 레코드 ID
   * @param {String} selectFields 조회할 필드 리스트
   * @return {Object} 조회한 레코드
   */
  static async findOne(url, id, selectFields) {
    return await ServiceUtil.findOne(url, id, selectFields)
  }

  /**
   * @description 그리드에서 선택된 행의 ID 리턴
   **************************************
   * @param {Object} grist 그리스트
   * @param {Boolean} alertWhenEmpty 선택된 행이 없는 경우 팝업을 실행할 것인지 여부
   * @returns {Array} 선택 ID 리스트
   */
  static getSelectedIdList(grist, alertWhenEmpty) {
    return ServiceUtil.getSelectedIdList(grist, alertWhenEmpty)
  }

  /**
   * @description 그리스트의 선택된 레코드 삭제 처리
   **************************************
   * @param {Object} grist 그리스트
   * @param {Object} url 삭제 처리할 REST 서비스 명
   * @returns {Boolean} 삭제 성공 여부
   */
  static async deleteListByGristSelected(grist, url) {
    return await ServiceUtil.deleteListByGristSelected(grist, url)
  }

  /**
   * @description 그리스트에서 변경, 추가된 여러 데이터를 한 꺼번에 업데이트
   ***************************************************
   * @param {Object} grist 그리스트
   * @param {String} url updateMultiple을 위한 REST 서비스 명
   * @returns {Boolean} 업데이트 성공 여부
   */
  static async updateMultipleData(grist, url) {
    return await ServiceUtil.updateMultipleData(grist, url)
  }

  /**
   * @description 변경, 추가된 여러 데이터를 한 꺼번에 업데이트
   ***************************************************
   * @param {String} url updateMultiple을 위한 REST 서비스 명
   * @param {Array} patches 변경, 추가된 여러 데이터
   * @returns {Boolean} 업데이트 성공 여부
   */
  static async updateMultiple(url, patches) {
    return await ServiceUtil.updateMultiple(url, patches)
  }

  /**
   * @description 그리스트에서 변경, 추가된 내용 추출
   ********************************************
   * @param {Array} grist 그리스트
   * @returns {Array} 그리스트에서 변경, 추가된 데이터 리스트
   */
  static patchesForUpdateMultiple(grist) {
    return ServiceUtil.patchesForUpdateMultiple(grist)
  }

  /**
   * @description 시나리오 서비스를 호출
   **********************************
   * @param {String} buttonName 시나리오 호출할 버튼 명, 버튼 명이 없다면 사용자에게 확인 과정을 생략한다.
   * @param {String} scenarioName 호출할 시나리오 명
   * @param {Object} variables 시나리오 호출 변수
   * @returns {Object | Boolean} 시나리오 호출 response or false
   */
  static async callCustomService(buttonName, scenarioName, variables) {
    return await ServiceUtil.callCustomService(buttonName, scenarioName, variables)
  }

  /**
   * @description 메뉴 라우팅 혹은 메뉴 명으로 메뉴 메타 정보 조회
   **********************************************
   * @param {String} menuName 메뉴 라우팅 혹은 메뉴 명
   * @returns {Object} 메뉴 메타 정보
   */
  static async findMenuMeta(menuName) {
    return await MetaUiUtil.findMenuMeta(menuName)
  }
  /**
   * @description 현재 사용자, 메뉴에 해당 하는 그리드 개인화 정보 조회
   **********************************************
   * @param {String} menuId 메뉴 ID
   * @returns {Object} 그리드 개인화 오브젝트
   */
  static async findMenuGridPersnalTemplate(menuId) {
    return await MetaUiUtil.findMenuGridPersnalTemplate(menuId)
  }

  /**
   * @description 기본 그리스트 페이지 프로퍼티 리턴
   ***************************************
   * @returns {Object} 기본 그리스트 페이지 프로퍼티
   */
  static getBasicGristPageProperties() {
    return MetaUiUtil.getBasicGristPageProperties()
  }

  /**
   * @description 그리스트 기본 gutter 설정 리턴
   ********************************************
   * @param {Boolean} useRowSelector 행 선택 기능 사용 여부
   * @param {Boolean} multiple 여러 행 선택 가능 여부
   * @returns {Object} 그리스트 기본 gutter 설정
   */
  static getGristGuttersConfig(useRowSelector, multiple) {
    return MetaUiUtil.getGristGuttersConfig(useRowSelector, multiple)
  }

  /**
   * @description 그리스트 선택 모드 설정
   ****************************************
   * @returns {Object} 그리스트 선택 모드 설정
   */
  static getGristSelectableConfig(multiple) {
    return MetaUiUtil.getGristSelectableConfig(multiple)
  }

  /**
   * @description 페이지네이션 기본 페이지 수 [20, 30, 50, 100]
   ********************************************
   * @returns {Object} 페이지네이션 기본 페이지 수
   */
  static getGristPaginationDefaultConfig() {
    return MetaUiUtil.getGristPaginationCustomConfig(20, 30, 50, 100)
  }

  /**
   * @description 페이지네이션 페이지 수 [50, 100, 500, 1000]
   ********************************************
   * @returns {Object} 페이지네이션 페이지 수
   */
  static getGristPagination50Config() {
    return MetaUiUtil.getGristPaginationCustomConfig(50, 100, 500, 1000)
  }

  /**
   * @description 페이지네이션 페이지 수 [100, 500, 1000, 50000]
   ********************************************
   * @returns {Object} 페이지네이션 페이지 수
   */
  static getGristPagination100Config() {
    return MetaUiUtil.getGristPaginationCustomConfig(100, 500, 1000, 5000)
  }

  /**
   * @description 페이지네이션 페이지 수 [1000, 5000, 10000, 50000, 100000]
   ********************************************
   * @returns {Object} 페이지네이션 페이지 수
   */
  static getGristPaginationMaxConfig() {
    return MetaUiUtil.getGristPaginationCustomConfig(1000, 5000, 10000, 50000, 100000)
  }

  /**
   * @description 파라미터로 받은 pageLimits로 페이지네이션 페이지 수를 표시
   ********************************************
   * @param {Array} 페이지네이션 페이지 수 배열
   * @returns {Object} 페이지네이션 페이지 수
   */
  static getGristPaginationCustomConfig(...pageLimits) {
    return MetaUiUtil.getGristPaginationCustomConfig(...pageLimits)
  }

  /**
   * @description 메뉴 메타 정보를 조회
   **********************************
   * @param {HTMLElement} pageView
   * @returns {Object} 메뉴 메타 정보
   */
  static async getMenuMeta(pageView) {
    return await MetaUiUtil.getMenuMeta(pageView)
  }

  /**
   * @description 현재 화면에 대한 라우팅 정보 리턴
   *********************************************
   * @param {HTMLElement} view
   * @returns {Object} 메뉴 메타 정보
   */
  static getCurrentRouting(view) {
    return MetaUiUtil.getCurrentRouting(view)
  }

  /**
   * @description 메뉴 메타 정보를 기반으로 그리드 설정 셋을 파싱하여 리턴
   ************************************************
   * @param {Object} pageView 페이지
   * @returns {Object} 그리드 설정 셋
   */
  static async parseGridConfigSet(pageView) {
    return await MetaUiUtil.parseGridConfigSet(pageView)
  }

  /**
   * @description 메뉴 메타 정보를 기반으로 폼 설정 셋을 파싱하여 리턴
   ************************************************
   * @param {Object} pageView 페이지
   * @returns {Object} 폼 설정 셋
   */
  static async parseFormConfigSet(pageView) {
    return await MetaUiUtil.parseFormConfigSet(pageView)
  }

  /**
   * @description 그리스트 Hidden 컬럼 설정 리턴
   *****************************************
   * @param {String} type 컬럼 타입
   * @param {String} name 컬럼 명
   * @returns {Object} 그리스트 Hidden 컬럼 설정
   */
  static getGristHiddenColumnConfig(type, name) {
    return MetaUiUtil.getGristHiddenColumnConfig(type, name)
  }

  /**
   * @description 그리스트 기본 컬럼 설정
   ***********************************
   * @param {String} type
   * @param {String} name
   * @param {String} align
   * @param {Boolean} editable
   * @param {Boolean} sortable
   * @param {Number} width
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static getGristColumnConfig(type, name, align, editable, sortable, width) {
    return MetaUiUtil.getGristColumnConfig(type, name, align, editable, sortable, width)
  }

  /**
   * @description 그리스트 컬럼 설정
   ***********************************
   * @param {String} type
   * @param {String} name
   * @param {String} displayName
   * @param {String} align
   * @param {Boolean} editable
   * @param {Boolean} sortable
   * @param {Number} width
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static getGristColumnConfig2(type, name, displayName, align, editable, sortable, width) {
    return MetaUiUtil.getGristColumnConfig2(type, name, displayName, align, editable, sortable, width)
  }

  /**
   * @description 그리스트 Selector 컬럼 설정
   ***********************************
   * @param {String} name
   * @param {String} displayName
   * @param {String} align
   * @param {Boolean} sortable
   * @param {Number} width
   * @param {Boolean} mandatory
   * @param {Array} optionValues
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static getGristSelectorColumnConfig(name, displayName, align, sortable, width, mandatory, optionValues) {
    return MetaUiUtil.getGristSelectorColumnConfig(name, displayName, align, sortable, width, mandatory, optionValues)
  }

  /**
   * @description 그리스트 Code Selector 컬럼 설정
   ***********************************
   * @param {String} name
   * @param {String} displayName
   * @param {String} align
   * @param {Boolean} sortable
   * @param {Number} width
   * @param {Boolean} mandatory
   * @param {String} codeName
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static async getGristCodeSelectorColumnConfig(name, displayName, align, sortable, width, mandatory, codeName) {
    return MetaUiUtil.getGristCodeSelectorColumnConfig(name, displayName, align, sortable, width, mandatory, codeName)
  }

  /**
   * @description 그리스트 검색 필드 설정
   ************************************
   * @param {String} name
   * @param {String} type
   * @param {String} label
   * @param {String} operator
   * @param {Array} optionValues
   * @returns {Object} 그리스트 검색 필드 설정
   */
  static getGristSearchColumnConfig(name, type, label, operator, optionValues) {
    return MetaUiUtil.getGristSearchColumnConfig(name, type, label, operator, optionValues)
  }

  /**
   * @description 기본 컨텍스트 버튼이 아닌 커스텀 버튼 컨테이너 스타일
   *********************************************************
   * @returns {Array} 커스텀 버튼 컨테이너 CSS 리턴
   */
  static getCustomButtonContainerStyles() {
    return MetaUiUtil.getCustomButtonContainerStyles()
  }

  /**
   * @description 그리스트 강조 스타일 리턴
   **********************************
   * @returns {Array} 그리스트 강조 스타일 CSS
   */
  static getGristEmphasizedStyles() {
    return MetaUiUtil.getGristEmphasizedStyles()
  }

  /**
   * @description 기본 그리스트 스타일 리턴
   ************************************
   * @returns {Array} 기본 그리스트 스타일 CSS 리턴
   */
  static getBasicGristStyles() {
    return MetaUiUtil.getBasicGristStyles()
  }

  /**
   * @description 기본 폽 스타일 리턴
   ************************************
   * @returns {Array} 기본 폼 스타일 CSS 리턴
   */
  static getBasicFormStyles() {
    return MetaUiUtil.getBasicFormStyles()
  }

  /**
   * @description 기본 마스터 디테일 그리스트 스타일 리턴
   ************************************
   * @param {String} masterDetailType top-down / left-right
   * @returns {Array} 마스터 디테일 그리스트 스타일 CSS
   */
  static getBasicMasterDetailGristStyle(masterDetailType) {
    return MetaUiUtil.getBasicMasterDetailGristStyle(masterDetailType)
  }

  /**
   * @description 기본 폼 스타일 리턴
   ************************************
   * @returns {Array} 기본 폼 스타일 CSS 리턴
   */
  static getBasicFormStyles() {
    return MetaUiUtil.getBasicFormStyles()
  }

  /**
   * @description 그리드 설정에 버튼 이름이 buttonName인 버튼이 있는지 체크
   ***********************************************
   * @param {Object} gridConfig 그리드 설정
   * @param {String} buttonName 버튼 명
   * @returns
   */
  static isGridButtonExist(gridConfig, buttonName) {
    return MetaUiUtil.isGridButtonExist(gridConfig, buttonName)
  }

  /**
   * @description 그리드 설정에서 셀렉트 컬럼을 추출
   *******************************************
   * @param {Array} gridColumns 그리드 컬럼 설정
   * @returns {String} 셀렉트 필드 정보
   */
  static getSelectColumns(gridColumns) {
    return MetaUiUtil.getSelectColumns(gridColumns)
  }

  /**
   * @description pageView의 그리드 정보로 기본 그리스트 Html을 생성하여 리턴
   ********************************
   * @param {String} pageView 페이지 뷰
   * @returns {HTMLElement} 그리스트 HTML
   */
  static getBasicGristHtml(pageView) {
    return MetaUiUtil.getBasicGristHtml(pageView)
  }

  /**
   * @description pageView의 폽 정보로 기본 폼 Html을 생성하여 리턴
   ********************************
   * @param {String} pageView 페이지 뷰
   * @returns {HTMLElement} 그리스트 HTML
   */
  static getBasicFormHtml(pageView) {
    return MetaUiUtil.getBasicFormHtml(pageView)
  }
}