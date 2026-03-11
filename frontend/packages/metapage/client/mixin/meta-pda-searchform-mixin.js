import '@material/web/icon/icon.js'

import { css, html } from 'lit-element'

import { MetaPdaSearchInputChangeHandlerMixin } from './meta-pda-search-input-change-handler-mixin'
import { UiUtil } from '../utils/ui-util'
import { TermsUtil } from '../utils/terms-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 기반 PDA 검색 폼 믹스인
 */
export const MetaPdaSearchformMixin = superClass => 
  class extends MetaPdaSearchInputChangeHandlerMixin(superClass) {

  /**
   * @description 검색 폼 스타일
   ****************************
   */
  static getSearchFormStyle() {
    return [
      css`
        ox-search-form {
          overflow: visible;
        }
      `
    ]
  }

  /**
   * @override
   **************
   */
  async firstUpdated() {
    // 검색 폼 사용시 체크박스를 3 상태로 변경
    this.search_form_fields.forEach(current => {
      if (current.type == 'checkbox') {
        current['attrs'] = ['indeterminate']
      }
    })

    if (super.firstUpdated) {
      await super.firstUpdated()
    }
  }

  /**
   * @description 검색 폼 HTML
   **********************************
   * @return {Object} 검색 폼 HTML Object
   */
  getSearchFormHtml() {
    if (this.useSearchForm()) {
      return html` <ox-search-form
        id="search-form"
        autofocus
        .fields=${this.search_form_fields}
        @submit=${(e) => this.fetchHandler(e) }
      >
      </ox-search-form>`
    } else {
      return html``
    }
  }

  /**
   * @description 검색 폼 리턴
   ******************************
   * @return {String} 검색 폼 정보
   */
  get searchForm() {
    return this.useSearchForm() ? this.renderRoot.querySelector('ox-search-form') : undefined
  }

  /**
   * @description Reset search form
   **********************************
   */
  async reset_search_form() {
    this.searchForm.reset()
    this.focusOnDefaultInputElement()
  }

  /**
   * @description Reset search form for next work
   *************************************************
   */
  async reset_for_next_work() {
    if(this.searchForm) {
      let resetPartials = JSON.parse(this.menuParamValue('reset_for_next_work', '[]'))
      if(resetPartials && resetPartials.length > 0) {
        // reset partial
        this.searchForm.reset(resetPartials)
        let partialInput = this.findSearchFormInput(resetPartials[0])
        if(partialInput) partialInput.focus()
      }
    }
  }

  /** 
   * @description Parse search form related settings from menu parameters
   **************************************************************************
   */
  parseSearchFormMeta() {
    // 기본 resourceUrl 설정
    this.defaultResourceUrl = this.menu.resource_url

    // 검색 필드 액션 리스트
    this.searchInputActions = JSON.parse(this.menuParamValue('search-input-actions', '[]'))

    // 검색 필드별 순회 ...
    if (this.searchForm) {
      // 키보드 숨김 필드 리스트
      let hideKeyboardSearchData = this.menuParamValue('hide-keyboard-search', '[]')
      let hideKeyBoardSearch = JSON.parse(hideKeyboardSearchData)

      // 포커스 순서
      this.focusInputList = JSON.parse(this.menuParamValue('enter-focus-step', '[]'))

      // 검색 필드 순회
      this.search_form_fields.forEach(sff => {
        // placeholder가 있다면 placeholder 처리
        let placeholder = this.inputActionElementPlaceholder(sff.name, null)
        if(placeholder) {
          let element = this.findSearchFormInput(sff.name)
          let displayName = TermsUtil.t(placeholder)
          element.setAttribute('placeholder', displayName)
        }

        sff.onchange = async (value, searchForm) => {
          return await this.searchInputEventHandler(value, searchForm, sff)
        }

        // 키보드 숨김 처리
        if(hideKeyBoardSearch.includes(sff.name)) {
          let element = this.findSearchFormInput(sff.name)
          if(element) {
            element.setAttribute('barcode', '')
            element.onfocus = UiUtil.hideKeyboard
          }
        }
      })
    }
  }
}
