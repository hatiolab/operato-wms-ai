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
 * @description 메뉴에 설정된 폼 내용을 기준으로 화면을 그리기 위한 믹스인
 */
export const ColumnFormMixin = superClass =>
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
            flex: 1;
            flex-direction: column;
            overflow-x: overlay;
            background-color: var(--md-sys-color-background);
          }

          .container {
            display: grid;
            grid-auto-rows: min-content;
            grid-gap: var(--record-view-gap);
            padding: var(--record-view-padding);
            overflow-y: auto;
            height: 100%;
            border-bottom: var(--record-view-border-bottom);
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

          .content_container {
            display: grid;
            grid-auto-rows: min-content;
            grid-gap: var(--record-view-gap);
            padding: var(--record-view-padding);
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

          ox-grid-field {
            border-top: none;
            border-bottom: var(--record-view-border-bottom);
            font: var(--record-view-font);
            color: var(--record-view-color);
            background-color: transparent;
            margin-right: 10px;
          }

          ox-grid-field[editing='true'] {
            border-bottom: var(--record-view-edit-border-bottom);
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
     * @description 프로퍼티 정의
     **************************
     */
    static get properties() {
      return {
        record: Object
      }
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

      // 인풋 키 이벤트 처리
      this.renderRoot.addEventListener('keydown', e => {
        switch (e.key) {
          case 'Esc':
          case 'Escape':
          /* TODO 편집이 취소되어야 한다. */
          case 'Enter':
            /* 먼저, focus를 옮겨놓아야, focusout 으로 인해서 popup이 닫히는 것을 방지할 수 있다. */
            this.focus()

            if (this.currentTarget) {
              this.currentTarget.removeAttribute('editing')
            }

            this.currentTarget = null
            break
          default:
        }
      })

      // 인풋 클릭 처리 (readOnly <> editing)
      this.renderRoot.addEventListener('click', e => {
        e.stopPropagation()

        // target should be 'ox-grid-field'
        let target = e.target

        if (this.currentTarget) {
          this.focus()
          this.currentTarget.removeAttribute('editing')
        }

        if (target.tagName !== 'OX-GRID-FIELD' || !target.column.record.editable) {
          this.focus()
          this.currentTarget = null
        } else {
          this.currentTarget = target
          target.setAttribute('editing', 'true')
        }
      })

      // 폼뷰의 인풋에서 발생되는 변경 이벤트 처리
      this.addEventListener('field-change', e => {
        let { after, before, column, record, row } = e.detail

        /* compare changes */
        if (ValueUtil.isEquals(after, before)) {
          return
        }

        let validation = column.validation
        if (validation && typeof validation == 'function') {
          if (!validation.call(this, after, before, record, column)) {
            return
          }
        }

        let colName = column.name

        // 변경 값 셋팅
        record[colName] = after

        // 변경 필드 정보
        record.__dirtyfields__ = record.__dirtyfields__ || {}
        record.__dirtyfields__[colName] = {
          before: record && record.__origin__ ? record.__origin__[colName] : null,
          after: record[colName]
        }

        // 같은 값으로 변경 되었다면
        if (ValueUtil.isEquals(record.__dirtyfields__[colName].before, record.__dirtyfields__[colName].after)) {
          delete record.__dirtyfields__[colName]
        }

        // dirty flag
        record.__dirty__ = ValueUtil.isNotEmpty(record.__dirtyfields__) ? 'M' : ''
        this.record = { ...record }
      })
    }

    /**
     * @description 기본 버튼 및 커스텀 버튼 생성 code 데이터 조회
     *****************************************************
     */
    async firstUpdated() {
      // 1. 기본 버튼 및 커스텀 버튼 생성
      if (super.firstUpdated) {
        await super.firstUpdated()
      }

      // 2. 검색 폼에 키보드 숨김 설정
      if (this.searchForm) {
        let hideKeyboardSearchData = this.menuParamValue('hide-keyboard-search', '[]')
        if (hideKeyboardSearchData && hideKeyboardSearchData.length > 0) {
          let hideKeyBoardSearch = JSON.parse(hideKeyboardSearchData)

          hideKeyBoardSearch.forEach(x => {
            let element = this.searchForm.renderRoot.querySelector(`[name="${x}"]`)
            if (element) {
              element.setAttribute('barcode', '')
              element.onfocus = UiUtil.hideKeyboard
            }
          })
        }
      }

      // 3. 엔터 포커스 순서
      let enterFocusStep = JSON.parse(this.menuParamValue('enter-focus-step', '[]'))
      this.enterFocusStep = enterFocusStep

      if (enterFocusStep.length > 0) {
        // 이벤트 연결
        for (var i = 0; i < enterFocusStep.length; i++) {
          let element = this.findDocumentElement(enterFocusStep[i])
          if (element) {
            // 최초 검색 되는 객체를 디폴트로 한다.
            if (!this.defaultFocusEle) {
              this.defaultFocusEle = element
            }

            element.doc = this
            element.focusname = enterFocusStep[i]
            element.onkeyup = this.onEnterFocusStep
          }
        }
      }

      // 4. 메뉴 파라미터 서치폼 사용 여부에 따라 조회....
      if (this.useSearchForm()) {
        await this.searchForm.submit()
      } else {
        await this.fetchHandler()
      }

      setTimeout(
        function () {
          // 엔터 이벤트 강제 발생 기본 포커스 셋팅
          this.onEnterFocusStep('default')
        }.bind(this),
        1500
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
        nextFocusEle.focus()
        nextFocusEle.select()
      }
    }

    /**
     * @description 문서내 포커스 이름을 가진 엘리먼트를 찾아 리턴
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
     * @description 기본 저장 버튼을 사용 하기 위해 기본 버튼 필더 override
     ***********************************
     * @returns
     */
    filterBasicButton() {
      return this.actions.filter(action => action.name == 'save')
    }

    /**
     * @description Life Cycle - render
     ***********************************
     */
    render() {
      // 1. 메뉴에 설정한 폼 정보 리스트
      var columns = this.form_fields.filter(column => !column.hidden)

      // 2. 모바일 (PDA / Tablet) 키보드 숨김 처리용 설정
      let hideKeyBoardCols = JSON.parse(this.menuParamValue('hide-keyboard-column', '[]'))
      let rowIndex = 0

      // 3. 필드 : 값 사이즈 비율 정보
      let fieldSize = this.menuParamValue('field-size', '1fr,2fr')
      let fieldSizeArr = fieldSize.split(',')
      let record = this.record || {}

      // 4. (폼을 타이틀별로 구분하기 위한) 카테고리 설정
      let categoryJson = this.menuParamValue('form-category', '[]')
      let category = JSON.parse(categoryJson)

      return html`
        ${this.getSearchFormHtml ? html`${this.getSearchFormHtml()}` : html``}
        <div class="root_container">
          ${category.map(config => {
            let categoryCols = columns.filter(x => config.columns.includes(x.name))

            // 그리드 구분 스타일
            let divStyle = 'height:auto;grid-template-columns:'
            if (!config.col_count) config.col_count = 1

            for (let i = 0; i < config.col_count; i++) {
              divStyle += ` ${fieldSizeArr.join(' ')}`
            }

            divStyle += ';'

            return html`
              ${ValueUtil.isEmpty(config.display)
                ? html``
                : html`
                    <h2>
                      <md-icon>list_alt</md-icon>${TermsUtil.t(config.display) || TermsUtil.tTitle(config.display)}
                    </h2>
                  `}
              <div id="content_container" class="content_container" style="${divStyle}">
                ${categoryCols.map(column => {
                  let { editable = false, mandatory = false } = column.record
                  let hideKeyboard = hideKeyBoardCols.includes(column.name)

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
                      id=${column.name}
                      ?hideKeyboard=${hideKeyboard}
                      editable=${editable}
                      .column=${column}
                      rowIndex=${++rowIndex}
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

    /**
     * @description 폼에 현재 설정된 데이터 리턴
     **************************************
     * @returns {Object} 화면에 표현되어 있는 현재 데이터 (수정된 값 반영)
     */
    getFormViewData() {
      return this.currentData
    }

    /**
     * @description 폼 내 변경되지 않은 정보 포함해서 모든 필드의 정보를 Object 형태로 리턴
     ******************************************************
     * @returns {Object}
     */
    getFormViewDataAll() {
      return this.currentData
    }

    /**
     * @description 현재 데이터
     *************************
     * @returns {Object} 화면에 표현되어 있는 현재 데이터 (수정된 값 반영)
     */
    get currentData() {
      return this.removeGarbageData(this.record)
    }

    /**
     * @description 최초 조회된 원본 데이터
     **********************************
     * @returns {Object} 원본 데이터 (변경 값 무시)
     */
    get orgData() {
      return this.removeGarbageData(this.record.__origin__)
    }

    /**
     * @description 변경된 데이터
     **************************
     * @returns {Object} 변경된 데이터만
     */
    get dirtyData() {
      if (ValueUtil.isEmpty(this.record.__dirtyfields__)) {
        return {}
      }

      let retData = {}
      Object.entries(this.record.__dirtyfields__).map(([key, value]) => {
        if (key.startsWith('__') == false) {
          retData[key] = value.after
        }
      })

      return retData
    }

    /**
     * @description 레코드 데이터에서 필요없는 메타 데이터 삭제 후 리턴
     *******************************************************
     * @returns {Object} __ 로 시작되는 필드명 삭제
     */
    removeGarbageData(data) {
      let retData = {}

      Object.entries(data).map(([key, value]) => {
        if (key.startsWith('__') == false) {
          retData[key] = value
        }
      })

      return retData
    }

    /**
     * @description 트랜잭션을 위한 변경 데이터 + cuFlag 가져오기
     ***********************
     * @returns {Object}
     */
    get patchData() {
      let dirtyData = this.dirtyData
      let recordData = this.record

      if (ValueUtil.isEmpty(dirtyData)) {
        return {}
      }

      // 기존 데이터 존재 여부 - 변경 플래그 판단
      if (ValueUtil.isNotEmpty(recordData.id)) {
        dirtyData.id = recordData.id
        dirtyData.cuFlag = 'u'
      } else {
        dirtyData.cuFlag = 'c'
      }

      return dirtyData
    }

    /**
     * @description 저장 버튼 오버라이드
     *******************************
     */
    async save() {
      let patches = this.patchData

      // 변경 여부 메시지 처리
      if (ValueUtil.isEmpty(patches)) {
        MetaApi.showAlertPopup('title.info', 'text.NOTHING_CHANGED')
      } else {
        let result = await this.requestRestService('PUT', this.saveUrl, patches)
        if (result) {
          await this.fetchHandler()
        }
      }
    }

    /**
     * @description 조회 결과 셋
     ***************************
     * @param {Object} fetchResult { total: Number, records: Object }
     */
    responseDataSet(fetchResult) {
      /*if(ValueUtil.isEmpty(this.parent_id)) return;

    let resObj = fetchResult.records;

    if(Array.isArray(resObj)) {
      resObj = resObj[0];
    } 

    resObj['__seq__'] = 1;
    let orgData = {};
    Object.assign(orgData, resObj)
    resObj['__origin__'] = orgData;

    this.record = { ...resObj };*/

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
  }
