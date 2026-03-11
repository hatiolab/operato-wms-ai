import '@operato/form/ox-search-form.js'

import { css, html } from 'lit-element'

import { MetaUiUtil } from '../utils/meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 검색 폼 렌더링 관련 믹스 인
 */
export const SearchFormRenderMixin = superClass =>
  class extends superClass {
    /**
     * @description 검색 폼 스타일
     ****************************
     */
    static getSearchFormStyle() {
      return [
        css`
          search-form {
            overflow: visible;
          }
        `
      ]
    }

    /**
     * @description Life Cycle - firstUpdated
     ******************************************
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
     *********************************
     * @return {String} 검색 폼 렌더 정보
     */
    getSearchFormHtml() {
      return MetaUiUtil.getSearchFormHtml(this)
    }

    /**
     * @description 검색 폼 리턴
     ******************************
     * @return {String} 검색 폼 정보
     */
    get searchForm() {
      return this.useSearchForm() ? this.renderRoot.querySelector('ox-search-form') : undefined
    }
  }
