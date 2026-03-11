import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'
import { ScrollbarStyles } from '@operato/styles'

import { CustomButtonMixin } from '../mixin/custom-button-mixin'
import { TermsUtil } from '../utils/terms-util'
import { ServiceUtil } from '../utils/service-util'
import { MetaUiUtil } from '../utils/meta-ui-util'
import { MetaApi } from '../utils/meta-api'

import '@operato/input/ox-input-code.js'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 기본 코드 편집기 엘리먼트
 */
export class BasicCodeEditorElement extends CustomButtonMixin(p13n(localize(i18next)(LitElement))) {
  /**
   * @description 프로퍼티 정의
   *****************************
   * @returns {Object} 프로퍼티 정보
   */
  static get properties() {
    return {
      subTitle: String,
      codeField: String,
      codeValueOrg: String,
      codeValueNew: String
    }
  }

  /**
   * @description 스타일 정의
   *****************************
   * @returns {Array} 스타일 정보
   */
  static get styles() {
    let styles = [
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow-x: overlay;
          background-color: var(--md-sys-color-background);
        }

        legend {
          margin: 10px;
          text-transform: capitalize;
          padding: var(--legend-padding);
          font: var(--legend-font);
          color: var(--md-sys-color-primary);
          border-bottom: var(--legend-border-bottom);
        }

        ox-input-code {
          margin: 10px;
          overflow-y: auto;
          flex: 1;
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
   ***********************************************
   */
  async connectedCallback() {
    if (super.connectedCallback) {
      await super.connectedCallback()
    }

    this.resource_url = this.parent_id ? this.menu.resource_url.replace(':id', this.parent_id) : this.resource_url
    if (this.save_url) {
      this.save_url = this.parent_id ? this.save_url.replace(':id', this.parent_id) : this.save_url
    }

    if (this.resource_url || this.save_url) {
      let data = this.resource_url
        ? await ServiceUtil.restGet(this.resource_url)
        : await ServiceUtil.restPost(this.save_url)
      this.subTitle = this.menu.title
      this.codeField = this.menu.desc_field

      if (data) {
        let codeValue = data[this.codeField]
        if (codeValue) {
          if (typeof codeValue === 'object') {
            this.codeValueNew = this.codeValueOrg = JSON.stringify(codeValue, null, 4)
          } else {
            this.codeValueNew = this.codeValueOrg = String(codeValue)
          }
        }
      }
    }
  }

  /**
   * @description 서치 폼을 사용할 지 여부
   ***********************************
   */
  useSearchForm() {
    return false
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
   * @override Life Cycle - render
   *********************************
   * @returns {Array}
   */
  render() {
    return html`
      <legend>${this.subTitle}</legend>
      <ox-input-code mode="javascript" value=${this.codeValueNew} tab-size="4"></ox-input-code>
      ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
    `
  }

  /**
   * @description 기본 버튼을 사용 하기 위해 기본 버튼 override
   *****************************************************
   * @returns {Array}
   */
  filterBasicButton() {
    return this.actions.filter(action => action.type && action.type.startsWith('basic'))
  }

  /**
   * @description 코드 에디터
   *************************
   * @returns {Object}
   */
  get getCodeEditor() {
    return this.renderRoot.querySelector('ox-input-code')
  }

  /**
   * @override 커스텀 버튼 핸들러 오버라이드
   ***********************************
   * @returns {Object}
   */
  async customBtnEventHandler(customAction) {
    let result = await super.customBtnEventHandler(customAction)
    if (result) {
      this.codeValueNew = this.codeValueOrg = typeof result === 'object' ? JSON.stringify(result, null, 4) : result
    }
  }

  /**
   * @description 저장 버튼 클릭 핸들러
   *********************************
   */
  async save() {
    if (this.codeValueOrg == this.getCodeEditor.value) {
      MetaApi.showToast('info', TermsUtil.tText('NOTHING_CHANGED'))
    } else {
      let saveObject = this.getFormViewDataAll()
      await ServiceUtil.restPut(this.save_url, saveObject)
    }
  }

  /**
   * @description 폼에 현재 설정된 데이터 리턴
   **************************************
   * @returns {Object} 화면에 표현되어 있는 현재 데이터 (수정된 값 반영)
   */
  getFormViewData() {
    let saveObject = {}
    saveObject[this.codeField] = this.getCodeEditor.value
    return saveObject
  }

  /**
   * @description 폼 내 변경되지 않은 정보 포함해서 모든 필드의 정보를 Object 형태로 리턴
   ******************************************************
   * @returns {Object}
   */
  getFormViewDataAll() {
    let saveObject = { id: this.parent_id, ...this.getFormViewData() }
    return saveObject
  }
}

customElements.define('basic-code-editor-element', BasicCodeEditorElement)
