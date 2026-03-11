import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'
import { MetaSetMixin } from './meta-set-mixin'

import { ValueUtil } from '../utils/value-util'
import { TermsUtil } from '../utils/terms-util'
import { MetaApi } from '../utils/meta-api'
import { UiUtil } from '../utils/ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메뉴에 설정된 폼 내용을 기준으로 화면을 그리기 위한 믹스인
 */
export const MetaTabMixin = superClass =>
  class extends MetaSetMixin(superClass) {
    /**
     * @description 스타일 정보
     *************************
     */
    static get styles() {
      let styles = [
        css`
          :host {
            display: flex;
            flex: 1;
            flex-direction: column;
            overflow-x: overlay;
            background-color: var(--md-sys-color-background);
            color: var(--md-sys-color-on-background);
          }
          .tabs {
            display: flex;
          }
          .tab {
            display: flex;
            gap: var(--spacing-small);
            background-color: var(--md-sys-color-primary-container);
            color: var(--md-sys-color-on-primary-container);
            margin-top: var(--margin-default);
            padding: var(--padding-narrow) var(--padding-wide) 0 var(--padding-wide);
            border-radius: 9px 9px 0 0;
            border-right: 1px solid rgba(0, 0, 0, 0.4);
            text-transform: capitalize;
            opacity: 0.7;
            font-size: 15px;
            cursor: pointer;
          }
          .tab[activate] {
            background-color: var(--md-sys-color-primary);
            color: var(--md-sys-color-on-primary);
            box-shadow: 2px -2px 2px 0px rgba(0, 0, 0, 0.15);
            opacity: 1;
            font-weight: bold;
          }
          .tab > md-icon {
            width: 15px;
            height: 20px;
            padding: 0;
            margin: 0;
            --md-icon-size: 15px;
            vertical-align: middle;
          }
          .content-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background-color: var(--md-sys-color-surface);
            color: var(--md-sys-color-on-surface);
            border-radius: var(--border-radius) var(--border-radius) var(--border-radius);
            border: var(--border-dim-color);
            border-width: 1px;
            box-shadow: var(--box-shadow);
            overflow: auto;
          }
          .tab-contents {
            display: flex;
            flex: 1;
            flex-direction: column;
            overflow-x: overlay;
            background-color: var(--md-sys-color-surface-variant);
            color: var(--md-sys-color-on-surface-variant);
          }
        `
      ]      

      return styles
    }

    /**
     * @description 프로퍼티 정의
     ***************************
     * @returns {Object} 프로퍼티
     */
    static get properties() {
      return {
        /**
         * @description 탭 상세 렌터링 정보
         *******************************
         * @type {Object}
         */
        tabRenderConfig: Array,

        /**
         * @description 현재 선택된 탭
         *****************************
         * @type {String}
         */
        currentTabKey: String,

        /**
         * @description 렌더링 된 탭 객체
         ******************************
         * @type {Array}
         */
        tabElements: Object
      }
    }

    /**
     * @description Life Cycle - connectedCallback
     **********************************************
     */
    async connectedCallback() {
      this.currentTabKey = undefined

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
    }

    /**
     * @description 탭객체는 버튼을 포함 하지 않음
     ***********************************
     * @returns
     */
    filterBasicButton() {
      return []
    }

    /**
     * @description 탭객체는 버튼을 포함 하지 않음
     ***********************************
     * @returns
     */
    filterCustomButton() {
      return []
    }

    /**
     * @description Life Cycle - render
     ***********************************
     */
    render() {
      if (!this.tabRenderConfig) {
        this.tabRenderConfig = JSON.parse(this.menuParamValue('tab-list', []))
      }

      if (this.tabRenderConfig.length == 0) {
        return html``
      }

      let tabs = this.tabRenderConfig
      if (!this.currentTabKey) this.currentTabKey = tabs[0]?.id || undefined

      return html`
        <div class="tabs">
          ${tabs.map(tab => {
            let label = TermsUtil.t(tab.display) || TermsUtil.tLabel(tab.display)
            let key = tab.id

            return html`
              <div class="tab" ?activate="${key === this.currentTabKey}" @click="${() => (this.currentTabKey = key)}">
                ${tab.icon ? html`<md-icon>${tab.icon}</md-icon>` : html``}
                <span>${label}</span>
              </div>
            `
          })}
        </div>

        <div class="content-container">
          ${tabs.map(tab => {
            let displayStyle = 'display:none'
            let key = tab.id
            if (key == this.currentTabKey) {
              displayStyle = 'display:flex'
            }

            return html` <div class="tab-contents" style="${displayStyle}">${this.getTabContents(tab)}</div> `
          })}
        </div>
      `
    }

    getTabContents(tabConfig) {
      if (!this.tabElements) {
        this.tabElements = {}
      }

      if (Object.keys(this.tabElements).filter(key => key == tabConfig.id).length > 0) {
        if (this.parent_id) {
          this.tabElements[tabConfig.id].parent_id = this.parent_id
        }

        return this.tabElements[tabConfig.id]
      }

      let htmlText = `<${tabConfig.tagname} id='${tabConfig.id}' route_name='${tabConfig.menu}' style="flex:1;"></${tabConfig.tagname}>`
      let tabElement = UiUtil.htmlToElement(htmlText)
      tabElement.parent_is_popup = this.is_popup
      if (this.parentFetch) {
        tabElement.parentFetch = this.parentFetch
      }

      if (this.parent_id) {
        tabElement.parent_id = this.parent_id
      }

      this.tabElements[tabConfig.id] = tabElement
      return tabElement
    }

    async fetchHandler() {
      if (!this.parent_id) return

      if (this.tabElements) {
        Object.keys(this.tabElements).forEach(key => {
          this.tabElements[key].set_parent_id(this.parent_id)
        })
      }
    }
  }
