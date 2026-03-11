import '@material/web/button/text-button.js'
import '@material/web/button/elevated-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'

import { html, css, render } from 'lit'

import { CommonButtonStyles } from '@operato/styles'

import { ValueUtil } from '../utils/value-util'
import { UiUtil } from '../utils/ui-util'
import { MetaUiUtil } from '../utils/meta-ui-util'
import { MetaApi } from '../utils/meta-api'
import { i18next } from '@operato/i18n'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 서비스를 이용하는 페이지, 엘레먼트의 최상위 오브젝트
 */
export const MetaUtilMixin = baseElement =>
  class extends baseElement {
    /**
     * @description 기본 스타일 정의
     ***********************************
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
          .container {
            overflow-y: auto;
            flex: 0.95;
          }
        `
      ]

      // 검색 폼 스타일 추가
      if (this.getSearchFormStyle) {
        styles.push(...this.getSearchFormStyle())
      }

      // 그리스트 스타일 추가
      if (this.getGristStyle) {
        styles.push(...this.getGristStyle())
      }

      // 버튼 콘테이너 스타일 추가 (엘리먼트로 로드시 사용)
      if (this.getButtonContainerStyle) {
        styles.push(...this.getButtonContainerStyle())
      }

      return styles
    }

    /**
     * @description 기본 프로퍼티
     **************************
     */
    static get properties() {
      return MetaApi.getBasicGristPageProperties()
    }

    /**
     * @description 현재 문서의 Element 여부
     ************************
     * @returns {Boolean}
     */
    get is_element() {
      return !this.is_page
    }

    /**
     * @description 타이틀 / 버튼 설정
     ******************************
     */
    get context() {
      return MetaUiUtil.createPageContextObject(this)
    }

    /**
     * @description Lifecycle - connectedCallback
     *********************************************
     */
    async connectedCallback() {
      if (super.connectedCallback) {
        await super.connectedCallback()
      }
    }

    /**
     * @override firstUpdated
     ************************************************
     * 페이지 init이 완료되면 그리드/서치 폼에 대한 설정을 한다.
     */
    async firstUpdated() {
      /***********************************************************************
       *                  엘리먼트 로드시 버튼 생성 ( ex: popup )
       ***********************************************************************/
      // 버튼 생성
      if (this.is_element || this.isMultiLayoutPage()) {
        // 커스텀 버튼 생성
        let buttons = this.getCustomButtons ? [...this.getCustomButtons()] : []

        // 기본 버튼 생성
        if (this.getBasicButtons) {
          buttons.push(...this.getBasicButtons())
        }

        // 버튼 설정에 따라 정렬
        this.button_elements = ValueUtil.arraySortBy(buttons, 'rank')
      }

      /***********************************************************************
       *                  그리스트가 존재하면 그리스트 및 그리스트 버튼 설정
       ***********************************************************************/
      this.setupGrist()
    }

    /**
     * @description 그리스트 설정 셋업
     ******************************
     */
    setupGrist() {
      // 그리스트 설정 생성
      if (this.createGristConfig) {
        this.config = this.createGristConfig()
      }

      // 그리스트 설정에 버튼 설정 추가
      if (this.config && this.getGristButtons) {
        this.config.columns.push(...this.getGristButtons())
      }

      // 그리스트 설정에 그리드 설정 추가
      if (this.config && this.grid_config && this.grid_config.length > 0) {
        let gridColumns = this.grid_config.map(c => {
          // 그리드 에디터가 mask인 경우 ...
          if (c.type == 'mask') {
            c.record.renderer = (value, column, record, rowIndex, field) => {
              let maskVal = ''
              if (value) {
                let valCount = value.length
                for (let i = 1; i <= valCount; i++) {
                  maskVal += '*'
                }
              } else {
                maskVal = '********'
              }

              return maskVal
            }

            // translation인 경우 ...
          } else if (c.type == 'translation') {
            c.record.renderer = (value, column, record, rowIndex, field) => {
              return value && value.indexOf('.') > 0 ? i18next.t(value) : value
            }
          }

          // 최초 입력 후 저장 이후에 편집 불가
          if (c.record && c.record.format && c.record.format == 'readonly-after-create') {
            delete c.record.format
            c.record.editable = (value, column, record, rowIndex, field) => {
              return !record.id
            }
          }

          // 필수값 Validator
          let requiredFlag = false
          let dataLengthFlag = false

          if (
            c.name &&
            c.name != 'id' &&
            c.name != 'domain_id' &&
            c.name != 'creator_id' &&
            c.name != 'updater_id' &&
            c.name != 'created_at' &&
            c.name != 'updated_at' &&
            c.rank &&
            c.rank > 0 &&
            c.width > 0 &&
            !c.hidden &&
            c.record &&
            c.record.mandatory &&
            c.record.mandatory == true
          ) {
            requiredFlag = true
          }

          // 문자 최대 수 Validator ddd
          if (
            c.name &&
            c.name != 'id' &&
            c.name != 'creator_id' &&
            c.name != 'updater_id' &&
            c.rank &&
            c.rank > 0 &&
            !c.hidden &&
            c.width > 0 &&
            c.record &&
            c.record.size &&
            c.record.size > 0
          ) {
            dataLengthFlag = true
          }

          if (requiredFlag && dataLengthFlag) {
            UiUtil.addGridColumnValidator(c, 'required && data-max-length')
          } else if (requiredFlag) {
            UiUtil.addGridColumnValidator(c, 'required')
          } else if (dataLengthFlag) {
            UiUtil.addGridColumnValidator(c, 'data-max-length')
          }

          // 컬럼 정보 리턴
          return c
        })

        this.config.columns.push(...gridColumns)
      }
    }

    /**
     * @description 문서 내 attribute, properties 변경 시 문서 update 조건 설정
     ****************************************
     * @param {Map} changeProperties
     * @returns {Boolean} 업데이트 여부
     */
    shouldUpdate(changeProperties) {
      let { isConnected = false } = { isConnected: this.isConnected }
      return isConnected ? (this.is_page ? super.shouldUpdate(changeProperties) : true) : false
    }

    /**
     * @description 메뉴 파라미터의 값을 추출
     **************************************
     * @param {String} menuParamName
     * @param {*} defaultValue
     * @returns {*}
     */
    menuParamValue(menuParamName, defaultValue) {
      var paramValue = this.menu_params[menuParamName]
      return paramValue ? paramValue : defaultValue
    }

    /**
     * @description 메뉴 파라미터의 값을 추출해 Object 로 변환후 return
     **************************************
     * @param {String} menuParamName
     * @param {*} defaultValue
     * @returns {*}
     */
    menuParamValueToObject(menuParamName, defaultValue) {
      var paramValue = this.menuParamValue(menuParamName, defaultValue)
      return paramValue ? JSON.parse(paramValue) : defaultValue
    }

    /**
     * @description 버튼 엘리먼트를 생성해 리턴한다.
     ***************************************
     * @param {String} name
     * @param {String} label
     * @param {String} style
     * @returns {HTML}
     */
    createButtonElement(name, label, style) {
      style = name == 'template' ? 'download' : style ? style : name
      const btnStyle = CommonButtonStyles[style] || {
        icon: style,
        emphasis: {
          raised: true,
          outlined: false,
          dense: false,
          danger: false
        }
      }

      const { raised, outlined, dense, danger} = btnStyle.emphasis

      const template = html`
        <button ?dense=${dense} ?raised=${raised} ?outlined=${outlined} ?danger=${danger} ?ok=${name=="save"}>
          <md-icon>${style || 'done'}</md-icon><span>${label}</span>
        </button>
      `

      const container = document.createElement('div')
      render(template, container)

      const element = container.firstElementChild
      return container.removeChild(element)
    }

    /**
     * @description 페이지가 아닌 화면에 버튼 HTML을 추가
     *********************************************
     * @returns {HTML}
     */
    getButtonHtml() {
      return MetaUiUtil.getButtonContainer(this)
    }

    /**
     * @description parameter에 부모 객체의 ID 값을 추가한다.
     ************************************
     * @description 엘레멘트 로드시 부모 객체의 아이디가 데이터에 포함되어야 하는 경우가 있다.
     * @description menu param detail_parent_id 의 필드를 patches 리스트 또는 오브젝트에 반영 한다.
     * @param {Array | Object} patches
     * @returns
     */
    setParentIdFieldByElement(patches) {
      // 팝업의 경우 parent_id 필드를 찾아 데이터를 채워 준다.
      if (this.is_element) {
        // parent_id 변경
        let detailParentId = this.menuParamValue('detail_parent_id')

        if (ValueUtil.isNotEmpty(detailParentId)) {
          if (Array.isArray(patches)) {
            patches.forEach(element => {
              element[detailParentId] = this.parent_id
            })
          } else {
            patches[detailParentId] = this.parent_id
          }
        }
      }

      return patches
    }

    /**
     * @description 단일 페이지가 아닌 여러 엘리먼트를 포함하는 layout 인지 여부
     * 이 결과 값으로 페이지가 기본 제공하는 버튼을 사용할 지 엘리먼트에서 그리는 버튼을 사용할지 판단.
     ***********************************************
     * @returns {Boolean}
     */
    isMultiLayoutPage() {
      return this.menu_params?.['master-detail'] ? true : false
    }

    /**
     * @description 메뉴 파라미터에서 서치폼 사용 여부를 리턴한다.
     ************************************
     * @returns {Boolean}
     */
    useSearchForm() {
      return this.menuParamValue('use-search-form', 'true') == 'true' ? true : false
    }

    /**
     * @description 메뉴 파라미터에서 필터폼 사용 여부를 리턴한다.
     ************************************
     * @returns {Boolean}
     */
    useFilterForm() {
      return this.menuParamValue('use-filter-form', 'true') == 'true' ? true : false
    }

    /**
     * @description 메뉴 파라미터에서 페이지 로드시 그리스트 auto-fetch 기능 사용 여부를 리턴한다.
     ************************************
     * @returns {Boolean}
     */
    useGristAutoFetch() {
      return this.menuParamValue('use-auto-fetch', 'true') == 'true' ? true : false
    }

     /**
     * @description 是否使用顶部添加按钮
     ************************************
     * @returns {Boolean}
     */
     useFilterAddButton() {
      return this.menuParamValue('use-filter-add-button', 'true') == 'true' ? true : false
    }
    
    /**
     * @description 부모 객체에서 parent_id 변경시 resourceUrl, saveUrl을 갱신하고 재조회한다.
     *********************************
     * @param {String} newVal
     */
    set_parent_id(newVal) {
      this.parent_id = newVal

      this.resource_url = this.menu.resource_url.replace(':id', this.parent_id)
      if (this.menu.save_url) {
        this.save_url = this.menu.save_url.replace(':id', this.parent_id)
      }

      // 조회 실행
      if (this.is_element) {
        if (this.grist) {
          this.grist.fetch()
        } else if (this.useSearchForm() && this.searchForm) {
          this.searchForm.submit()
        } else {
          this.fetchHandler()
        }
      }
    }

    /**
     * @description 메뉴 메타 정보에서 버튼 이름으로 로직 정보를 추출한다.
     *********************************************************
     * @param {String} buttonName 버튼 이름
     * @returns {Object}
     */
    getButtonActionLogic(buttonName) {
      let actions = this.actions.filter(x => x.name == buttonName)
      return !actions || !actions[0] || !actions[0].logic ? undefined : JSON.parse(actions[0].logic)
    }

    /**
     * Document 내의 attribute 변화를 감지 및 로깅 (개발용)
     **************************************
     * @param {String} name
     * @param {*} oldVal
     * @param {*} newVal
     */
    /*attributeChangedCallback(name, oldVal, newVal) {
      console.log(this.tagName, 'attribute change: ', name, oldVal, newVal);
      super.attributeChangedCallback(name, oldVal, newVal);
    }*/
  }
