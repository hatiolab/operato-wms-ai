import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'
import { SearchFormRenderMixin } from './search-form-render-mixin'
import { CustomButtonMixin } from './custom-button-mixin'

import { ValueUtil } from '../utils/value-util'
import { MetaApi } from '../utils/meta-api'
import { MetaUiUtil } from '../utils/meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메뉴에 설정된 폼 내용을 기준으로 화면을 그리기 위한 믹스인
 */
export const MetaFormMixin = superClass =>
  class extends SearchFormRenderMixin(CustomButtonMixin(superClass)) {
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
            align-items: center;
            overflow-x: overlay;

            background-color: var(--record-view-background-color);
          }

          :host > * {
            align-self: stretch;
          }

          #container {
            align-self: auto;

            display: grid;
            grid-template-columns: 2fr 3fr 2fr 3fr;
            grid-auto-rows: min-content;
            grid-gap: var(--spacing-large) 0;

            padding: var(--spacing-large) var(--spacing-huge);
            font-size: 16px; /* for ios safari */
            flex: 1;
            width: 100%;
            max-width: 1300px;
            box-sizing: border-box;
          }

          label {
            display: flex;
            align-items: center;
            position: relative;
            text-transform: capitalize;
            padding: var(--record-view-item-padding);
            font: var(--record-view-label-font);
            color: var(--record-view-label-color);
            text-align: right;
            padding-right: var(--spacing-large);
          }

          label[wide] {
            grid-column: 1 / 2;
          }

          label md-icon {
            display: none;
          }

          label > span {
            margin-left: auto;
          }

          label[editable] md-icon {
            display: inline-block;
            font-size: var(--record-view-label-icon-size);
            opacity: 0.5;
          }

          operato-input-editor {
            background-color: var(
              --record-view-grid-field-background-color,
              var(--md-sys-color-surface-container-lowest)
            );
            border: var(--record-view-grid-field-border);
            border-radius: var(--md-sys-shape-corner-small);
            padding: var(--spacing-tiny) var(--spacing-small);

            font: var(--record-view-font);
            color: var(--record-view-color);

            max-width: 360px;
          }

          operato-input-editor[editing='true'] {
            border: var(--record-view-edit-border);
          }

          operato-input-editor:focus-within {
            color: var(--record-view-focus-color);
            font-weight: bold;
          }

          operato-input-editor[wide] {
            grid-column: 2 / 5;
            width: 100%;
            max-width: 986px;
          }

          :first-child + operato-input-editor {
            color: var(--record-view-focus-color);
            font-weight: bold;
          }

          @media only screen and (max-width: 1000px) {
            #container {
              grid-template-columns: 2fr 3fr;
              padding: var(--spacing-medium);
            }

            label[wide] {
              grid-column: 1 / 2;
            }

            operato-input-editor[wide] {
              grid-column: 2 / 3;
              width: 100%;
              max-width: 360px;
            }
          }

          @media only screen and (max-width: 600px) {
            #container {
              grid-template-columns: 2fr 3fr;
              padding: var(--spacing-medium);
            }

            label[wide] {
              grid-column: 1 / 2;
            }

            operato-input-editor[wide] {
              grid-column: 1 / 3;
              width: 100%;
              max-width: unset;
            }
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

      // 메뉴 파라미터 서치폼 사용 여부에 따라 조회....
      if (this.useSearchForm()) {
        this.searchForm.submit()
      } else {
        this.fetchHandler()
      }
    }

    /**
     * @description 기본 저장 버튼을 사용 하기 위해 기본 버튼 필더 override
     ***********************************
     * @returns
     */
    filterBasicButton() {
      return this.actions.filter(action => action.name == 'save')
    }

    /**
     * @description Life Cycle - render
     * 아래 div id container의 style="${sizeStyle}"는 사이즈에 맞게 컬럼갯수 조정을 위해 제거했음-정연희
     ***********************************
     */
    render() {
      var columns = this.form_fields.filter(column => !column.hidden)
      var rowIndex = 0

      let fieldSize = this.menuParamValue('field-size', '1fr,2fr')
      let fieldSizeArr = fieldSize.split(',')
      let sizeStyle = `grid-template-columns:${fieldSizeArr[0]} ${fieldSizeArr[1]};`

      return html`
        ${this.getSearchFormHtml ? html`${this.getSearchFormHtml()}` : html``}

        <div id="container">
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
     * @param {Object} fetchResult { total: Number, records: Object }
     */
    responseDataSet(fetchResult) {
      let resObj = fetchResult.records
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
      let params = this.getFormViewData()
      if (!params || Object.keys(params).length == 0) {
        MetaApi.showToast('info', TermsUtil.tText('NOTHING_CHANGED'))
      } else {
        params = this.setParentIdFieldByElement(params)
        await this.requestRestService('PUT', this.saveUrl, params)
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
      if (isIncludeId == undefined) isIncludeId = true

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

      if (isIncludeId) {
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
      if (isIncludeId == undefined) isIncludeId = true

      inputs.forEach(input => {
        let formConfig = this.form_fields.filter(x => x.name == input.id)[0]
        // save_ignore 체크
        if (ValueUtil.isNotEmpty(formConfig) && !formConfig.save_ignore) {
          params[input.id] = input._getValue
        }
      })

      if (isIncludeId) {
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
