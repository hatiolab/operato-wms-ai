import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'

import { ScrollbarStyles } from '@operato/styles'
import { getEditor, getRenderer } from '@operato/data-grist'

import { SearchFormRenderMixin } from './search-form-render-mixin'
import { CustomButtonMixin } from './custom-button-mixin'

import { TermsUtil } from '../utils/terms-util'
import { ValueUtil } from '../utils/value-util'
import { UiUtil } from '../utils/ui-util'
import { MetaApi } from '../utils/meta-api'
import { MetaUiUtil } from '../utils/meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메뉴에 설정된 폼 내용을 기준으로 모바일 용 폼 화면을 그리기 위한 믹스인
 */
export const MetaMobileFormMixin = superClass =>
  class extends SearchFormRenderMixin(CustomButtonMixin(superClass)) {
    /**
     * @description 스타일 정보
     *************************
     */
    static get styles() {
      let styles = [
        ScrollbarStyles,
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

          .root_container {
            display: flex;
            flex: 1;
            flex-direction: column;
            padding: var(--record-view-padding);
            overflow-y: auto;
            height: 100%;
            border-bottom: var(--record-view-border-bottom);
          }

          h2 {
            border: var(--grist-title-border);
            font: var(--grist-title-font);
            color: var(--secondary-color);
            margin: var(--grist-title-margin);
            padding-bottom: var(--grist-title-with-grid-padding);
            padding-top: var(--grist-title-with-grid-padding);
            border-bottom: var(--subtitle-border-bottom);
          }

          h2 md-icon {
            --md-icon-size: var(--grist-title-icon-size);
            vertical-align: middle;
            margin: var(--grist-title-icon-margin);
            color: var(--grist-title-icon-color);
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
            --md-icon-size: var(--record-view-label-icon-size);
            display: inline-block;
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
     * @description Life cycle - connectedCallback
     ***********************************************
     */
    async connectedCallback() {
      // 조회시 callBack 함수 지정
      this.fetch_callback = this.responseDataSet

      if (super.connectedCallback) {
        await super.connectedCallback()
      }
    }

    /**
     * @description Life cycle - disconnectedCallback
     **************************************************
     */
    disconnectedCallback() {
      if (super.disconnectedCallback) {
        super.disconnectedCallback()
      }

      // 팝업이 연결 해제될 때 Key Up 이벤트 해제
      this.onkeyup = null
    }

    /**
     * @override Life cycle - firstUpdated
     ***************************************
     */
    async firstUpdated() {
      // 기본 버튼 및 커스텀 버튼 생성
      if (super.firstUpdated) {
        await super.firstUpdated()
      }

      // 서치 폼에 키보드 숨김 설정
      if (this.searchForm) {
        let hideKeyBoardSearch = JSON.parse(this.menuParamValue('hide-keyboard-search', '[]'))
        hideKeyBoardSearch.forEach(x => {
          let element = this.searchForm.renderRoot.querySelector(`[name="${x}"]`)
          if (element) {
            element.setAttribute('barcode', '')
            element.onfocus = UiUtil.hideKeyboard
          }
        })
      }

      // 엔터 포커스 순서
      this.enterFocusStep = JSON.parse(this.menuParamValue('enter-focus-step', '[]'))
      if (this.enterFocusStep.length > 0) {
        // 이벤트 연결
        for (var i = 0; i < this.enterFocusStep.length; i++) {
          let currentFocus = this.enterFocusStep[i]
          let element = this.findDocumentElement(currentFocus)
          if (element) {
            // 최초 검색 되는 객체를 디폴트로 한다.
            if (!this.defaultFocusEle) {
              this.defaultFocusEle = element
            }

            element.doc = this
            element.focusname = currentFocus
            element.onkeyup = this.onEnterFocusStep
          }
        }
      }

      // 로딩시 자동 데이터 조회 설정
      let dataFetchMode = this.menuParamValue('data-fetch-mode', 'service')

      // 메뉴 파라미터 서치 폼 사용 여부에 따라 조회....
      if (dataFetchMode == 'service') {
        this.useSearchForm() ? await this.searchForm.submit() : await this.fetchHandler()
      } else if (dataFetchMode == 'grid-data') {
        // 그리드에서 선택한 데이터를 폼 로딩 ...
        let gridDataAccessor = this.menuParamValue('grid-pass-data-accessor', 'record')
        let passData = this[gridDataAccessor]
        this.setFormData(passData)
      }

      // 1.5 초후 디폴트 포커스
      setTimeout(() => this.onEnterFocusStep('default'), 1500)
    }

    /**
     * @override from basic-button-mixin
     *************************************
     * @returns
     */
    filterBasicButton() {
      return this.actions.filter(
        action => action.name == 'save' || action.name == 'grid_update' || action.name == 'close'
      )
    }

    /**
     * @description 문서 내 Enter 키를 받아 다음 포커스를 이동한다.
     *****************************************************
     */
    onEnterFocusStep(event) {
      if (event != 'default' && (!event.key || event.key.toLowerCase() != 'enter')) return

      let nextFocusEle = undefined
      if (event === 'default') {
        nextFocusEle = this.defaultFocusEle
      } else {
        let doc = event.currentTarget.doc
        let step = doc.enterFocusStep
        let name = event.currentTarget.focusname
        let stepIdx = step.indexOf(name)
        let nextIdx = stepIdx + 1

        if (stepIdx < 0) nextIdx = 0
        else nextIdx = nextIdx >= step.length ? 0 : nextIdx

        for (let idx = nextIdx; idx != stepIdx; idx++) {
          let element = doc.findDocumentElement(step[idx])

          if (element) {
            nextFocusEle = element
            break
          }

          if (idx + 1 == step.length) {
            idx = -1
          }
        }
      }

      if (nextFocusEle) {
        if (nextFocusEle.focus) {
          nextFocusEle.focus()
        }

        if (nextFocusEle.select) {
          nextFocusEle.select()
        }
      }
    }

    /**
     * @description 문서 내 포커스 이름을 가진 엘리먼트를 찾아 리턴
     *****************************************************
     * @param {String} focusStepName
     * @returns
     */
    findDocumentElement(focusStepName) {
      let setNames = focusStepName.split('.')
      let sectionName = setNames[0]
      let elementName = setNames[1]
      let element = undefined

      if (sectionName == 'search') {
        // 서치 폼 엘리먼트
        if (this.searchForm) {
          element = this.searchForm.renderRoot.querySelector(`[name="${elementName}"]`)
        }
      } else {
        // 폼 엘리먼트
        let input = this.renderRoot.querySelector(`#${elementName}`)
        if (input) {
          element = input.getLeafInput()
        }
      }

      return element
    }

    /**
     * @override render
     ********************
     */
    render() {
      // 1. 메뉴에 설정한 폼 정보 리스트
      let columns = this.form_fields.filter(column => !column.hidden)

      // 2. 모바일 (PDA / Tablet) 키보드 숨김 처리용 설정
      let hideKeyBoardCols = JSON.parse(this.menuParamValue('hide-keyboard-column', '[]'))
      let rowIndex = 0

      // 3. 필드 : 값 사이즈 비율 정보
      let fieldSize = this.menuParamValue('field-size', '1fr,2fr')
      let fieldSizeArr = fieldSize.split(',')
      let sizeStyle = `height:auto;grid-template-columns:${fieldSizeArr[0]} ${fieldSizeArr[1]};`

      // 4. (폼을 타이틀별로 구분하기 위한) 카테고리 설정
      let categoryJson = this.menuParamValue('form-category', '[]')
      let category = categoryJson != '[]' ? JSON.parse(categoryJson) : null

      // 5-1. 카테고리 설정이 없는 경우
      if (category == null || ValueUtil.isEmpty(category)) {
        return html`
          ${this.getSearchFormHtml ? html`${this.getSearchFormHtml()}` : html``}
          <div id="container" class="content_container">
            ${columns.map(column => {
              let { editable, mandatory } = column.record
              let hideKeyboard = hideKeyBoardCols.includes(column.name)
              return html`
                <label ?editable=${editable}
                  ><span>${mandatory ? '*' : ''}${column.header}</span>
                  <md-icon>edit</md-icon>
                </label>
                <operato-input-editor
                  ?hideKeyboard=${hideKeyboard}
                  id=${column.name}
                  .column=${column}
                  rowIndex=${++rowIndex}
                  editable=${editable}
                >
                </operato-input-editor>
              `
            })}
          </div>
          ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
        `
        // 5-2. 카테고리 설정이 있는 경우
      } else {
        return html`
          ${this.getSearchFormHtml ? html`${this.getSearchFormHtml()}` : html``}
          <div class="root_container">
            ${category.map(config => {
              let categoryCols = columns.filter(x => config.columns.includes(x.name))
              return html`
                ${ValueUtil.isEmpty(config.display)
                  ? html``
                  : html`
                      <h2>
                        <md-icon>list_alt</md-icon>${TermsUtil.t(config.display) || TermsUtil.tTitle(config.display)}
                      </h2>
                    `}

                <div id="container" class="content_container" style="${sizeStyle}">
                  ${categoryCols.map(column => {
                    let hideKeyboard = hideKeyBoardCols.includes(column.name)
                    let { editable = false, mandatory = false } = column.record

                    column.record.classifier = function () {}
                    column.record.renderer = getRenderer(column.type)

                    if (editable) {
                      column.record.editor = getEditor(column.type)
                    }

                    return html`
                      <label ?editable=${editable}
                        ><span>${mandatory ? '*' : ''}${column.header}</span>
                        <md-icon>edit</md-icon>
                      </label>
                      <operato-input-editor
                        ?hideKeyboard=${hideKeyboard}
                        id=${column.name}
                        .column=${column}
                        rowIndex=${++rowIndex}
                        editable=${editable}
                      >
                      </operato-input-editor>
                    `
                  })}
                </div>
              `
            })}
          </div>
          ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
        `
      }
    }

    /**
     * @description 조회 결과 셋
     ***************************
     * @param {Object} fetchResult { total: Number, records: Object }
     */
    responseDataSet(fetchResult) {
      let resObj = fetchResult.records
      this.setFormData(resObj)
    }

    /**
     * @override save form data
     ****************************
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
     * @override 폼 정보를 그리드의 행에 전달
     ***********************************
     */
    grid_update() {
      if (this.is_element && this.parent_menu_id) {
        // 그리드 데이터 업데이트 커스텀 이벤트 발생 처리
        let eventName = `${this.parent_menu_id}-griddata-update-event`
        let formData = this.getFormViewData()
        UiUtil.fireCustomEvent(eventName, formData)
      }

      history.back()
    }

    /**
     * @override 팝업 close
     **********************
     */
    close() {
      history.back()
    }

    /**
     * @description set form data
     *******************************
     * @param record
     */
    setFormData(record) {
      let inputs = this.renderRoot.querySelectorAll('operato-input-editor')
      inputs.forEach(input => {
        let value = record[input.id]
        if (value) {
          let formConfig = this.form_fields.filter(x => x.name == input.id)[0]
          // save_ignore 체크
          if (formConfig && !formConfig.save_ignore) {
            input.setValue(value)
          }
        }
      })
    }

    /**
     * @description 폼 내 값이 변경된 모든 필드의 정보를 Object 형태로 리턴한다
     ******************************************************
     * @returns {Object}
     */
    getFormViewData() {
      let inputs = this.renderRoot.querySelectorAll('operato-input-editor')
      let params = {}

      inputs.forEach(input => {
        let formConfig = this.form_fields.filter(x => x.name == input.id)[0]
        // save_ignore 체크
        if (ValueUtil.isNotEmpty(formConfig) && !formConfig.save_ignore) {
          params[input.id] = input._getValue
        }
      })

      // id 필드는 필수이므로 추가
      if (this.parent_id) {
        params.id = this.parent_id
      } else if (this.formId) {
        params.id = this.formId
      }

      return params
    }

    /**
     * @description 폼 내 모든 필드의 정보를 Object 형태로 리턴한다
     ******************************************************
     * @returns {Object}
     */
    getFormViewDataAll() {
      let inputs = this.renderRoot.querySelectorAll('operato-input-editor')
      let params = {}

      inputs.forEach(input => {
        let formConfig = this.form_fields.filter(x => x.name == input.id)[0]
        // save_ignore 체크
        if (ValueUtil.isNotEmpty(formConfig) && !formConfig.save_ignore) {
          params[input.id] = input._getValue
        }
      })

      // id 필드는 필수이므로 추가
      if (this.parent_id) {
        params.id = this.parent_id
      } else if (this.formId) {
        params.id = this.formId
      }

      return params
    }

    /**
     * @override rest-service-mixin
     ************************************
     */
    async trxSuccessCallback() {
      if (this.is_popup === true) {
        history.back()
      }
    }
  }
