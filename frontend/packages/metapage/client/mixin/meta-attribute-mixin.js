import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'
import { CustomButtonMixin } from './custom-button-mixin'

import { ValueUtil } from '../utils/value-util'
import { MetaApi } from '../utils/meta-api'
import { MetaUiUtil } from '../utils/meta-ui-util'
import { ServiceUtil } from '../utils/service-util'
import { TermsUtil } from '../utils/terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author yang 
 * @description 메뉴에 설정된 폼 내용을 기준으로 화면을 그리려 확장 속성을 추가 하기 위한 믹스인
 */
export const MetaAttributeMixin = superClass =>
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
            grid-template-columns: 1fr 2fr;
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
     * @description 기본 버튼 및 커스텀 버튼 생성 code 데이터 조회
     *****************************************************
     */
    async firstUpdated() {
      // 기본 버튼 및 커스텀 버튼 생성
      if (super.firstUpdated) {
        await super.firstUpdated()
      }

      this.fetchHandler()
    }

    /**
     * @description 기본 저장 버튼을 사용 하기 위해 기본 버튼 필더 override
     ***********************************
     * @returns
     */
    filterBasicButton() {
      return [{
        auth: "update",
        confirm_flag: false,
        name: "save",
        title: TermsUtil.t("button.save"),
        type: "basic"
      }]
    }

    /**
     * @description 검색폼 사용 여부 override 
     ***********************************
     * @returns
     */
    useSearchForm(){
      return false
    }

    /**
     * @description 조회
     ***********************************
     * @returns
     */
    async fetchHandler() {

      let findOneUrl = `${this.resourceUrl}/${this.parent_id}`
      let response = await ServiceUtil.restGet(findOneUrl, null)

      this.responseDataSet(response)
    }

    /**
     * @description Life Cycle - render
     ***********************************
     */
    render() {
      var columns = this.form_fields.filter(column => !column.hidden)
      var rowIndex = 0

      let fieldSize = this.menuParamValue('field-size', '1fr,2fr')
      let fieldSizeArr = fieldSize.split(',')
      let sizeStyle = `grid-template-columns:${fieldSizeArr[0]} ${fieldSizeArr[1]};`

      return html`
        <div id="container" style="${sizeStyle}">
          ${columns.map(column => {
            let { editable, mandatory } = column.record
            return html`
              <label ?editable=${editable}
                ><span>${mandatory ? '*' : ''}${column.header}</span>
                <md-icon>edit</md-icon>
              </label>
              <operato-input-editor id=${column.name} .column=${column} rowIndex=${++rowIndex} editable=${editable}>
              </operato-input-editor>
            `
          })}
        </div>
        ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
      `
    }

    /**
     * @description 조회 결과 셋
     ***************************
     * @param {Object} response 
     */
    responseDataSet(response) {
      let attrString = response[this.logic.field]
      if(ValueUtil.isEmpty(attrString)) return 

      let resObj = JSON.parse(attrString)
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
     * @description 저장 버튼 오버라이드
     *******************************
     */
    async save() {
      let params = this.getFormViewData(false)

      if (!params || Object.keys(params).length == 0) {
        MetaApi.showToast('info', TermsUtil.tText('NOTHING_CHANGED'))
      } else {
        let allFields = this.getFormViewDataAll(false)
        let saveParam = {id: this.parent_id }
        saveParam[this.logic.field] = JSON.stringify(allFields)

        let updateUrl = `${this.resourceUrl}/${this.parent_id}`
        await this.requestRestService('PUT', updateUrl, saveParam)
      }
    }

    /**
     * @description 폼 내 값이 변경된 모든 필드의 정보를 Object 형태로 리턴한다
     ******************************************************
     * @returns {Object}
     */
    getFormViewData(isIncludeId) {
      let inputs = this.renderRoot.querySelectorAll('operato-input-editor')
      let params = {}
      if(isIncludeId == undefined) isIncludeId = true


      inputs.forEach(input => {
        let inputVal = input._dirtyValue
        if (!ValueUtil.isEmpty(inputVal)) {
          let formConfig = this.form_fields.filter(x => x.name == input.id)[0]
          // save_ignore 체크
          if (ValueUtil.isNotEmpty(formConfig) && !formConfig.save_ignore) {
            params[input.id] = inputVal
          }
        }
      })


      if(isIncludeId){
        // id 필드는 필수이므로 추가
        if (this.parent_id) {
          params.id = this.parent_id
        } else if (this.formId) {
          params.id = this.formId
        }
      }

      return params
    }

    /**
     * @description 폼 내 변경되지 않은 정보 포함해서 모든 필드의 정보를 Object 형태로 리턴
     ************************************************************************
     * @returns {Object}
     */
    getFormViewDataAll(isIncludeId) {
      let inputs = this.renderRoot.querySelectorAll('operato-input-editor')
      let params = {}
      if(isIncludeId == undefined) isIncludeId = true

      inputs.forEach(input => {
        let formConfig = this.form_fields.filter(x => x.name == input.id)[0]
        // save_ignore 체크
        if (ValueUtil.isNotEmpty(formConfig) && !formConfig.save_ignore) {
          params[input.id] = input._getValue
        }
      })

      if(isIncludeId){
        // id 필드는 필수이므로 추가
        if (this.parent_id) {
          params.id = this.parent_id
        } else if (this.formId) {
          params.id = this.formId
        }
      }

      return params
    }
  }
