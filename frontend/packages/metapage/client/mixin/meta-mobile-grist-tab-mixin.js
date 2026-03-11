import { css, html } from 'lit-element'

import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

import { MetaPdaSearchformMixin } from './meta-pda-searchform-mixin'
import { MetaPdaListMixin } from './meta-pda-list-mixin'
import { CustomGristButtonMixin } from './custom-grist-button-mixin'

import { UiUtil } from '../utils/ui-util'
import { TermsUtil } from '../utils/terms-util'
import { MetaUiUtil } from '../utils/meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메뉴에 설정된 탭 내용을 기준으로 모바일 화면을 그리기 위한 믹스인
 */
export const MetaMobileGristTabMixin = superClass =>
  class extends MetaPdaSearchformMixin(MetaPdaListMixin(CustomGristButtonMixin(superClass))) {
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
     * @description 스타일 정보
     *************************
     */
    static get styles() {
      let styles = [
        CommonGristStyles,
        CommonHeaderStyles,
        css`
          :host {
            display: flex;
            flex-direction: column;
            overflow-x: overlay;
            background-color: var(--md-sys-color-background);
            color: var(--md-sys-color-on-background);
          }

          .container {
            overflow-y: auto;
            flex: 1;
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
            border: var(--border-dark-color);
            border-width: 1px;
            box-shadow: var(--box-shadow);
            overflow: auto;
          }

          .tab-contents {
            display: flex;
            flex: 1;
            flex-direction: column;
            overflow-x: overlay;
            background-color: var(--md-sys-color-background);
          }

          ox-grist {
            overflow-y: auto;
            flex: 1;
          }
        `
      ]

      // 검색 폼 스타일 추가
      if (this.getSearchFormStyle) {
        styles.push(...this.getSearchFormStyle())
      }

      // 버튼 콘테이너 스타일 추가 (엘리먼트로 로드시 사용)
      if (this.getButtonContainerStyle) {
        styles.push(...this.getButtonContainerStyle())
      }

      // 버튼 콘테이너 스타일 추가 (팝업으로 로드시 사용)  
      styles.push(...MetaUiUtil.getPopupButtonContainerStyles())


      return styles
    }

    /**
     * @override
     **************
     */
    async connectedCallback() {
      if (super.connectedCallback) {
        await super.connectedCallback()
      }
    }

    /**
     * @override
     **************
     */
    async firstUpdated() {
      if (super.firstUpdated) {
        await super.firstUpdated()
      }
    }

    /**
     * @override pageUpdated
     **************************
     * @param {*} changes
     * @param {*} lifecycle
     * @param {*} before
     * @returns
     */
    async pageUpdated(changes, lifecycle, before) {
      if (super.pageUpdated) {
        await super.pageUpdated(changes, lifecycle, before)
      }
    }

    /**
     * @override
     **************
     */
    disconnectedCallback() {
      if (super.disconnectedCallback) {
        super.disconnectedCallback()
      }

      let eventName = `${this.menu.id}-griddata-update-event`
      document.removeEventListener(eventName, this.updateGridRecord.bind(this))
    }

    /**
     * @override
     ***************
     * @returns HTML
     */
    render() {
      // parse search form meta
      this.parseSearchFormMeta()

      // parse grist configuration
      if (!this.config) this.setupGrist()

      // rendering
      return html`
        ${this.getSearchFormHtml ? html`${this.getSearchFormHtml()}` : html``}
        ${this.getGridHtml ? html`${this.getGridHtml()}` : html``}
        ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
      `
    }

    /**
     * @description 그리드 HTML 리턴
     ******************************
     */
    getGridHtml() {
      // 탭 설정이 없으면 파싱
      if (!this.tabRenderConfig) {
        // tab-list 메뉴 파라미터 파싱
        this.tabRenderConfig = JSON.parse(this.menuParamValue('tab-list', []))
        let mainTabTitle = this.menuParamValue('main-tab-title', 'label.order')
        // 메인 탭 설정 추가
        this.tabRenderConfig.unshift({
          id: 'ox-grist',
          display: mainTabTitle,
          icon: 'summarize',
          module: 'metapage',
          import: 'pages/basic-grist-element.js',
          tagname: 'basic-grist-element'
        })
      }

      let tabs = this.tabRenderConfig
      this.currentTabKey = this.currentTabKey || tabs[0]?.id

      return html`
        <div class="tabs">
          ${tabs.map(tab => {
            let label = TermsUtil.t(tab.display) || TermsUtil.tLabel(tab.display)
            let key = tab.id
            let tabId = 'tab_' + tab.id

            return html`
              <div
                id="${tabId}"
                class="tab"
                ?activate="${key === this.currentTabKey}"
                @click="${() => (this.currentTabKey = key)}"
              >
                ${tab.icon ? html`<md-icon>${tab.icon}</md-icon>` : html``}
                <span>${label}</span>
              </div>
            `
          })}
        </div>

        <div class="content-container">
          ${tabs.map(tab => {
            let tabContentId = 'tab-content_' + tab.id
            let displayStyle = tab.id == this.currentTabKey ? 'display:flex' : 'display:none'
            return html`
              <div class="tab-contents" id="${tabContentId}" style="${displayStyle}">${this.getTabContents(tab)}</div>
            `
          })}
        </div>
      `
    }

    /**
     * @description 탭 컨텐트
     *************************
     * @param {Object} tabConfig
     * @returns
     */
    getTabContents(tabConfig) {
      if (tabConfig.id == this.tabRenderConfig[0].id) {
        if (!this.mainTab) {
          let explicitFetchFlag = true
          this.mainTab = html`<ox-grist
            id=${tabConfig.id}
            .config=${this.config}
            ?explicit-fetch=${explicitFetchFlag}
            .mode=${this.grid_mode}
            .fetchHandler=${this.fetchHandler.bind(this)}
          >
          </ox-grist>`
        }
        return this.mainTab
      } else {
        this.tabElements = this.tabElements || {}
        let otherTab = this.tabElements[tabConfig.id] ? this.tabElements[tabConfig.id] : null

        if (!otherTab) {
          let htmlText = `<${tabConfig.tagname} id='${tabConfig.id}' route_name='${tabConfig.menu}' style="flex:1;"></${tabConfig.tagname}>`
          otherTab = UiUtil.htmlToElement(htmlText)
          otherTab.gristId = tabConfig.id
          this.tabElements[tabConfig.id] = otherTab
        }
        return otherTab
      }
    }

    /**
     * @override
     ***************
     * @returns HTML
     */
    filterBasicButton() {
      return this.actions
        ? this.actions.filter(
            action =>
              (action.name == 'add' ||
                action.name == 'save' ||
                action.name == 'delete' ||
                action.name == 'remove' ||
                action.name == 'reset_search_form' ||
                action.name == 'reset_grid' ||
                action.name == 'reset_for_next_work' ||
                action.name == 'reset_all') &&
              this.grist
          )
        : []
    }

    /**
     * @override 검색 폼 & 그리드 리셋
     **********************************
     */
    reset_all() {
      if (this.reset_search_form) {
        this.reset_search_form()
      }

      if (this.reset_grid) {
        this.reset_grid()
      }
    }

    /**
     * @override
     *************
     */
    reset_grid() {
      if (this.tabRenderConfig) {
        for (let i = 0; i < this.tabRenderConfig.length; i++) {
          let tabId = this.tabRenderConfig[i].id
          let grid = this.findGrist(tabId)
          if (grid) grid.data = {}
        }
      }
    }

    /**
     * @description Remove selected items
     ***************************************
     */
    async remove() {
      let selectedRecords = this.grist.selected

      if (!selectedRecords || selectedRecords.length == 0) {
        UiUtil.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
      } else {
        const answer = await UiUtil.showAlertPopup('button.delete', 'text.are_you_sure', 'question', 'delete', 'cancel')
        if (answer || answer.value) {
          let records = JSON.parse(JSON.stringify(this.grist.data.records))
          let newRecords = records.filter(r => {
            let matched = selectedRecords.find(sr => {
              return r.id == sr.id
            })
            return matched ? false : true
          })
          this.grist.data = { records: newRecords, total: records.total }
        }
      }
    }

    /**
     * @override
     *******************************
     * @param {Object} fetchParam
     */
    async fetchHandler(fetchParam) {
      // refresh-grids 값 : [{"grid_id" : "ox-grist", "refresh_url": "default" }, {"grid_id" : "ox-grist2", "refresh_url" : "outbound_work/picking_orders/picking/show/manual"}]
      let refreshGridStr = this.menuParamValue('refresh-grids', '[]')
      let refreshGridList = JSON.parse(refreshGridStr)

      // refresh-grids 값이 없으면 메인 그리드 ID & 메뉴의 기본 resource_url로 리프레쉬 처리
      if (refreshGridList.length == 0) {
        let mainGridId = this.menuParamValue('main-grist-id', this.tabRenderConfig[0].id)
        await this.fetchGridHandler(this.searchForm, mainGridId, this.menu.resource_url)

        // refresh-grids 값이 있으면 해당 배열 정보로 리프레쉬 처리
      } else {
        for (let i = 0; i < refreshGridList.length; i++) {
          let refreshGrid = refreshGridList[i]
          let refreshUrl = refreshGrid.refresh_url == 'default' ? this.menu.resource_url : refreshGrid.refresh_url
          await this.fetchGridHandler(this.searchForm, refreshGrid.grid_id, refreshUrl)
        }
      }
    }

    /**
     * @description fetch grid handler
     *******************************
     * @param {Object} fetchParam
     * @param {String} gridId
     * @param {String} refreshUrl
     */
    async fetchGridHandler(fetchParam, gridId, refreshUrl) {
      if (refreshUrl) this.resource_url = this.buildUrlBySearchData(refreshUrl)
      let results = await super.fetchHandler(fetchParam)

      if (gridId && results) {
        let refreshGrid = this.findGrist(gridId)
        if (refreshGrid) {
          let list = this.resultSetToList(results)
          refreshGrid.data = { records: list, total: list.length }
          this.activateTab(gridId)
        }
      }
    }

    /**
     * @override meta-pda-search-input-change-handler-mixin#dataPassToGrid
     ***********************************************************************
     * @param {String} dataPassDestType
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async dataPassToGrid(dataPassDestType, searchFormField, searchInputName, value) {
      // 1. 데이터 적용 대상 엘리먼트 이름을 설정에서 가져와서 ...
      let destEleName = this.inputActionSettingDataPassDestElement(searchInputName, this.tabRenderConfig[0].id)
      // 2. 그리드 대상을 추출
      let targetGrid = this.findGrist(destEleName)
      // 3. 이전 데이터 보관
      let oriRecords = JSON.parse(
        JSON.stringify(targetGrid.data && targetGrid.data.records ? targetGrid.data.records : [])
      )
      // 4. 서비스 호출
      let results = await this.callSearchService(searchFormField, searchInputName, value)
      // 5. 응답이 없다면 서비스 호출에 문제 발생함
      if (!results) return 1

      // 6. 결과 체크
      let list = this.resultSetToList(results)
      // 7. 데이터 전달 유형이 grid-list이면 그리드 데이터를 갱신
      if (dataPassDestType == 'grid-list') {
        targetGrid.data = { records: list, total: list.length }
        // 8. 데이터 전달 유형이 grid-data이면 조회한 데이터를 그리드 데이터에 추가
      } else if (dataPassDestType == 'grid-data') {
        if (list) {
          list.forEach(rec => {
            oriRecords.unshift(rec)
          })
          targetGrid.data = { records: oriRecords, total: oriRecords.length }
        }
      }

      return 1
    }

    /**
     * @override meta-pda-search-input-change-handler-mixin#searchInputChangeAfterHandling
     **************************************************
     * @param {Object} searchFormField
     * @param {String} searchInputName
     * @param {Object} value
     * @return {Boolean} 다음 스텝으로 이동할 지 여부
     */
    async searchInputChangeAfterHandling(searchFormField, searchInputName, value) {
      let result = super.searchInputChangeAfterHandling(searchFormField, searchInputName, value)
      let activateTabId = this.inputActionSettingByInputName(searchInputName, 'activate_tab_id', null)
      if(activateTabId) this.activateTab(activateTabId)
      return result
    }

    /**
     * @description gridId로 그리드를 찾아 리턴
     ***************************************
     * @param {String} gridId
     * @return {Object} grist
     */
    findGrist(gridId) {
      if (gridId == this.tabRenderConfig[0].id) {
        return this.renderRoot.querySelector(gridId)
      } else {
        let gristElement = this.tabElements[gridId]
        let grid = gristElement.shadowRoot.querySelector('ox-grist')
        return grid
      }
    }

    /**
     * @description 탭 활성화 처리
     ****************************
     * @param {String} tabId
     */
    activateTab(tabId) {
      let activeTabHtml = this.renderRoot.querySelector('#tab_' + tabId)

      if (activeTabHtml.hasAttribute('activate')) {
        return
      } else {
        activeTabHtml.setAttribute('activate', '')
        let activeTabContent = this.renderRoot.querySelector('#tab-content_' + tabId)
        activeTabContent.setAttribute('style', 'display:flex')

        for (let i = 0; i < this.tabRenderConfig.length; i++) {
          let currentTabId = this.tabRenderConfig[i].id
          if (tabId != currentTabId) {
            let tabHtml = this.renderRoot.querySelector('#tab_' + currentTabId)
            tabHtml.removeAttribute('activate')
            let tabContent = this.renderRoot.querySelector('#tab-content_' + currentTabId)
            tabContent.setAttribute('style', 'display:none')
          }
        }
      }
    }
  }
