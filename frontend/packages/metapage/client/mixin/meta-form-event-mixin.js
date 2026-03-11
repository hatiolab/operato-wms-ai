import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'

import { CustomButtonMixin } from './custom-button-mixin'

import { ValueUtil } from '../utils/value-util'
import { MetaUiUtil } from '../utils/meta-ui-util'


/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메뉴에 설정된 폼 내용을 기준으로 화면을 그린다.
 * 폼 내용으로 버튼 이벤트를 처리 한다. (서치 폼을 사용 하지 않고 그린 폼 내용을 기준으로 검색)
 */
export const MetaFormEventMixin = superClass =>
  class extends CustomButtonMixin(superClass) {
    /**
     * @description 스타일 정보
     *************************
     */
    static get styles() {
      let styles = [
        css`
          :host {
            display: flex;
            flex-direction: column;
            overflow-x: overlay;
            background-color: var(--md-sys-color-background);
          }

          #container {
            display: grid;
            grid-template-columns: 0.5fr 2fr;
            grid-auto-rows: min-content;
            grid-gap: var(--record-view-gap);
            padding: var(--record-view-padding);
            background-color: var(--record-view-background-color);

            overflow-y: auto;
            flex: 1;
          }

          label {
            display: flex;
            align-items: center;
            position: relative;
            text-transform: capitalize;

            padding: var(--record-view-item-padding);
            border-bottom: var(--record-view-border-bottom);
            font: var(--record-view-label-font);
            color: var(--record-view-label-color);
          }

          label md-icon {
            display: none;
          }

          label[editable] md-icon {
            --md-icon-size: var(--record-view-label-icon-size);
            display: inline-block;
            opacity: 0.5;
          }

          operato-input-editor {
            border-top: none;
            border-bottom: var(--record-view-border-bottom);
            background-color: transparent;
          }

          operato-input-editor[editing='true'] {
            border-bottom: var(--record-view-edit-border-bottom);
          }

          operato-input-editor:focus-within {
            color: var(--record-view-focus-color);
            font-weight: bold;
          }
        `
      ]

      // 버튼 콘테이너 스타일 추가 (엘리먼트로 로드시 사용)
      if (this.getButtonContainerStyle) {
        styles.push(...this.getButtonContainerStyle())
      }

      // 버튼 콘테이너 스타일 추가 (팝업으로 로드시 사용)  
      styles.push(...MetaUiUtil.getPopupButtonContainerStyles())


      return styles
    }

    /**
     * @description Life Cycle - connectedCallback
     **********************************************
     */
    async connectedCallback() {
      // 조회시 callBack 함수 지정
      this.fetch_callback = this.responseDataSet

      if (super.connectedCallback) {
        await super.connectedCallback()
      }
    }

    /**
     * @description Life Cycle - firstUpdated
     ******************************************
     */
    async firstUpdated() {
      // 기본 버튼 및 커스텀 버튼 생성
      if (super.firstUpdated) {
        await super.firstUpdated()
      }
    }

    /**
     * @description 기본 버튼을 사용 하기 위해 기본 버튼 필터 override - reset, show, refresh 버튼 만 사용 가능
     ***********************************
     * @returns {Array}
     */
    filterBasicButton() {
      return this.actions.filter(action => action.name == 'reset' || action.name == 'show' || action.name == 'refresh')
    }

    /**
     * @description 커스텀 버튼을 사용 하기 위해 커스텀 버튼 필터 override
     *  service-from... , popup-form... 만 사용 가능
     ************************************************************
     * @returns {Array}
     */
    filterCustomButton() {
      return this.actions.filter(
        action => action.type && (action.type.startsWith('service-form') || action.type.startsWith('popup-form'))
      )
    }

    /**
     * @description Life Cycle - render
     ***********************************
     */
    render() {
      let columns = this.form_fields.filter(column => !column.hidden)
      let rowIndex = 0

      return html`
        <div id="container">
          ${columns.map(column => {
            let { editable, mandatory } = column.record
            return html`
              <label ?editable=${editable}
                ><span>${mandatory ? '*' : ''}${column.header}</span>
                <md-icon>edit</md-icon>
              </label>
              <operato-input-editor
                id=${column.name}
                .column=${column}
                rowIndex=${++rowIndex}
                editable=${editable}
              ></operato-input-editor>
            `
          })}
        </div>
        ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
      `
    }

    /**
     * @description 조회 결과 셋
     ***************************
     * @param {Object} fetchResult { total: Number, records: Object }
     */
    responseDataSet(fetchResult) {
      let resObj = fetchResult.records

      if (Array.isArray(resObj)) {
        resObj = resObj[0]
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

    /**
     * @description 화면에서 그려진 데이터 중 변경된 내용을 가져온다.
     *****************************************************
     * @returns {Object}
     */
    getFormViewData() {
      // operato-input-editor 전부 가져오기
      let inputObject = this.renderRoot.querySelectorAll('operato-input-editor')
      let params = {}

      // 변경 여부 및 저장 파라미터 셋팅
      inputObject.forEach(input => {
        if (ValueUtil.isNotEmpty(input._dirtyValue)) {
          let formConfig = this.form_fields.filter(x => x.name == input.id)[0]

          // 저장 시 무시 여부, 수정 가능 여부 체크
          if (ValueUtil.isNotEmpty(formConfig) && !formConfig.save_ignore && formConfig.record.editable) {
            params[input.id] = input._dirtyValue
          }
        }
      })

      if (this.parent_id) {
        params.id = this.parent_id
      } else if (this.formId) {
        params.id = this.formId
      }

      return params
    }

    /**
     * @description 조회 버튼 액션
     ****************************
     */
    show() {
      // 전체 필드의 데이터 추출
      let inputList = this.renderRoot.querySelectorAll('operato-input-editor')

      // ?
      /*let inputValues = {};
    inputList.forEach(x => {
      let value = x._getValue;

      if(ValueUtil.isNotEmpty(value)) {
        inputValues[x.id] = value;
      }
    })*/

      // 무슨 코드 ?
      let value = {}
      inputList.forEach(x => {
        if (x.column.type == 'select-combo') {
          value[x.id] = [0, 1, 2, 3, 4].map(idx => {
            let option = Math.random().toString(36).substring(2)
            return { name: option, value: option }
          })
        } else {
          value[x.id] = Math.random().toString(36).substring(2)
        }
      })

      this.responseDataSet({
        records: value
      })
    }

    /**
     * @description 새로고침 버튼 액션
     ******************************
     */
    refresh() {
      this.show()
    }

    /**
     * @description 초기화 버튼 액션
     ****************************
     */
    reset() {
      let logic = this.getButtonActionLogic('reset')
      this.renderRoot.querySelectorAll('operato-input-editor').forEach(x => {
        // 제외 필드 제외하고 초기화
        if (ValueUtil.isEmpty(logic) || !logic.except_fields.includes(x.id)) {
          x.clear()
        }
      })
    }

    /**
     * @description 메뉴 메타 정보에서 버튼 이름으로 로직 정보를 추출한다.
     *********************************************************
     * @param {String} name 버튼 이름
     * @returns {Object}
     */
    getButtonActionLogic(name) {
      let actions = this.actions.filter(x => x.name == name)

      if (ValueUtil.isEmpty(actions) || ValueUtil.isEmpty(actions[0].logic)) {
        return undefined
      } else {
        return JSON.parse(actions[0].logic)
      }
    }
  }
