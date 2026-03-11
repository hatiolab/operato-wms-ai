import { CustomButtonMixin } from './custom-button-mixin'

import { UiUtil } from '../utils/ui-util'
import { MetaApi } from '../utils/meta-api'
import { ServiceUtil } from '../utils/service-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 그리스트 내 버튼 관련 믹스 인
 */
export const CustomGristButtonMixin = superClass =>
  class extends CustomButtonMixin(superClass) {
    /**
     * @description 메뉴 버튼 설정에서 그리드 버튼만 가져와 설정 셋을 만든다.
     ************************************************************
     * @description 그리스트가 없으면 빈 배열을 리턴한다.
     * @returns {Array} 그리스트 버튼 설정 셋트
     */
    getGristButtons() {
      if (this.grist) {
        // 버튼 설정에서 grid 버튼만 필터
        let configGutters = this.actions.filter(action => action.type && action.type.startsWith('grid'))
        return configGutters.map(element => {
          let gutter = {
            type: 'gutter',
            gutterName: 'button',
            icon: element.style,
            handlers: {
              click: (_columns, _data, _column, record, _rowIndex) => {
                this.gristButtonEventHandler(element, record)
              }
            }
          }

          // 그리드 상태 체크서비스 일때 아이콘 변경 및 서비스 url 별도로 서비스 가능
          if (element.type == 'grid-status-service') {
            let logics = JSON.parse(element.logic)
            gutter.icon = record => {
              if (!record) return element.style

              for (var idx = 0; idx < logics.length; idx++) {
                let logic = logics[idx]
                let icon = logic.icon ? logic.icon : element.style
                let useIcon = true

                Object.keys(logic)
                  .filter(x => x != 'url' && x != 'route' && x != 'icon')
                  .forEach(key => {
                    let compareValue = logic[key]

                    if (compareValue == '') {
                      if ((record[key] == undefined || record[key] == null || record[key] == '') == false) {
                        useIcon = false
                      }
                    } else {
                      if (compareValue != record[key]) {
                        useIcon = false
                      }
                    }
                  })

                if (useIcon) {
                  return icon
                }
              }
            }
          }

          return gutter
        })
      } else {
        return []
      }
    }

    /**
     * @description 버튼 이벤트 핸들링 가능 여부
     **************************************
     * @param {Object} action
     * @param {Object} record
     * @return {Boolean} 버튼 실행 여부 리턴
     */
    async buttonEventHandlable(action, record) {
      // 일반 그리드는 id가 있는지가 판단 조건 - 없으면 새로 생성할 레코드이므로 버튼이 처리되면 안 됨
      // 모바일 용 CARD, LIST 경우는 빈 레코드가 없으므로 무조건 true
      if (this.grid_mode == 'GRID' && !record.id) return false

      // 사용자 액션 확인 설정이 되었다면 확인 창 표시
      if (action.confirm_flag == true && await UiUtil.confirmTransaction('button.' + action.name) != true) return false

      // 리턴
      return true;
    }

    /**
     * @description 그리스트 gutter 버튼 이벤트 처리자
     *****************************************
     * @param {Object} action
     * @param {Object} record
     */
    async gristButtonEventHandler(action, record) {
      // 버튼 실행 여부 체크
      if (await this.buttonEventHandlable(action, record) != true) return

      // 버튼 로직 추출
      let actionType = action.type
      let actionLogic =
        actionType == 'grid-editor-popup' ||
        actionType == 'grid-popup-link' ||
        actionType == 'grid-pass-param' ||
        actionType == 'grid-status-service' ||
        actionType == 'grid-file-download' ||
        actionType == 'grid-attributes'
          ? JSON.parse(action.logic)
          : null

      // 그리드 선택 항목의 ID 값
      let idVal = this.menu.id_field ? record[this.menu.id_field] : ''

      // 페이지 이동
      if (action.type == 'grid-page-link') {
        MetaApi.pageNavigateWithSilenceOfParams(action.logic.replace(':id', idVal), record)

        // 편집기 페이지로 이동
      } else if (action.type == 'grid-editor-popup') {
        actionLogic.parent_menu_id = this.menu.id
        actionLogic.module = 'metapage'
        actionLogic.import = 'pages/basic-code-editor-element.js'
        actionLogic.tagname = 'basic-code-editor-element'
        await UiUtil.openDynamicPopup(null, actionLogic, record, idVal)

      // 팝업 오픈
      } else if (action.type == 'grid-popup-link') {
        // 팝업 클로저 함수
        let closerCallbackFunc = this.getPopupCloseCallbackFunc(actionLogic)
        // 팝업 설정에 부모 메뉴 ID 전달
        actionLogic.parent_menu_id = this.menu.id
        // 팝업 오픈
        await UiUtil.openDynamicPopup(null, actionLogic, record, idVal, closerCallbackFunc)

      // 서비스 호출
      } else if (action.type == 'grid-service') {
        await this.requestRestService(action.method, action.logic.replace(':id', idVal), record)

      // 그리드 항목 선택시 선택 항목을 파라미터 패싱 처리
      } else if (action.type == 'grid-pass-param') {
        this.passParametersToTarget(actionLogic, record)

      // 그리드 항목별 상태에 따른 아이콘 변경 및 클릭 시 처리
      } else if (action.type == 'grid-status-service') {
        for (var idx = 0; idx < actionLogic.length; idx++) {
          let logic = actionLogic[idx]
          let isMatch = true

          Object.keys(logic)
            .filter(x => x != 'url' && x != 'route' && x != 'icon')
            .forEach(key => {
              let compareValue = logic[key]
              let itemValue = record[key]
              isMatch = (compareValue && itemValue && compareValue == itemValue) || (!compareValue && !itemValue)
            })

          if (isMatch) {
            if(logic.url) {
              await this.requestRestService(action.method, logic.url.replace(':id', idVal), record)
            } else if(logic.route) {
              MetaApi.pageNavigate(logic.route.replace(':id', idVal), record)
            }
          }
        }
      // 그리드 로우 데이터 또는 설정된 값을 참조로 파일 다운로드 
      } else if (action.type =='grid-file-download'){
        let refType = actionLogic.refType
        let refBy = actionLogic.refBy

        if(refBy.includes(":")){
          // :{String}.{String}.{String}
          // Data Row 에서 설정된 값을 찾아 refBy 로 사용 한다. 
          refBy = refBy.substring(1)

          let findObj = record
          refBy.split(",").reduce((acc, cur, idx) =>{
            findObj = findObj[cur]
          },0);

          refBy = findObj
        }

        await ServiceUtil.fileDownload(refType, refBy)
      
        // 그리드 확장 속성 버튼 
      } else if (action.type == 'grid-attributes' ){
        actionLogic.tagname = 'basic-attributes-element'
        actionLogic.import = 'pages/basic-attributes-element.js'
        actionLogic.popup_field = "logic"

        await UiUtil.openDynamicPopup(null, actionLogic, actionLogic, record.id)

      }
    }

    /**
     * @description 메뉴 파라미터 설정에 따라 record 데이터를 logic[idx].dest_element.dest_attr로 전달.
     *****************************************************************************************
     * @param {Array} logic 메뉴 파리미터 설정
     * @param {Object} data 그리드 선택 record
     */
    passParametersToTarget(logic, data) {
      // 배열이 아니면 배열로 변환
      let logicArr = Array.isArray(logic) ? logic : [{ logic }]

      // loop 돌면서 파라미터 전달
      logicArr.forEach(param => {
        let destElement = this.renderRoot.querySelector(`#${param.dest_element}`)
        if (destElement) {
          if (destElement[`set_${param.dest_attr}`]) {
            destElement[`set_${param.dest_attr}`](data[param.source_attr])
          }
        }
      })
    }

    /**
     * @description 팝업 클로즈 콜백 함수를 추출
     ********************************************
     * @param {Object} popupConfig 팝업 Configuration
     * @return {Function}
     */
    getPopupCloseCallbackFunc(popupConfig) {
      if (popupConfig && popupConfig.close_handler) {
        let closeHandler = popupConfig.close_handler
        if (closeHandler == 'parent.fetch') {
          return () => {
            if (this.parentFetch) {
              this.parentFetch()
            }

            if (this.grist) {
              this.grist.fetch()
            } else if (this.useSearchForm()) {
              this.searchForm.submit()
            } else {
              if (this.fetchHandler) {
                this.fetchHandler()
              }
            }
          }
        }
      }

      return null
    }
  }
