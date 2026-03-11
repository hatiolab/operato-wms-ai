import { html } from 'lit-element'

import { GristRenderMixin } from './grist-render-mixin'
import { ValueUtil } from '../utils/value-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 모바일 그리스트 렌더링 믹스 인
 */
export const MetaMobileGristMixin = superClass =>
  class extends GristRenderMixin(superClass) {
    /**
     * @override
     */
    filterBasicButton() {
      return this.actions
        ? this.actions.filter(
            action =>
              (action.name == 'add' ||
                action.name == 'save' ||
                action.name == 'delete' ||
                action.name == 'reset_search_form' ||
                action.name == 'reset_grid' ||
                action.name == 'reset_all') &&
              this.grist
          )
        : []
    }

    /**
     * @description 메뉴 메타 정보에서 버튼 이름으로 로직 정보를 추출한다.
     *********************************************************
     * @param {String} name 버튼 이름
     * @returns {Object}
     */
    getButtonActionLogic(name) {
      let actions = this.actions.filter(x => x.name == name)

      if (ValueUtil.isEmpty(actions) || ValueUtil.isEmpty(actions[0].logic)) {
        return undefined
      } else {
        return JSON.parse(actions[0].logic)
      }
    }

    /**
     * @description 검색 폼 리셋
     **************************
     */
    async reset_search_form() {
      // 모바일에서는 ox-filter-form을 사용하지 않고 search-form만 사용
      // TODO 리셋을 하지 않을 필드를 제외하고 리셋 처리 필요
      this.searchForm.reset()

      /*let logic = this.getButtonActionLogic('reset_search_form');
    let formFields = this.renderRoot.querySelectorAll('operato-input-editor');
    formFields.forEach(x => {
      // 제외 필드 제외하고 초기화 
      if(ValueUtil.isEmpty(logic) || !logic.except_fields.includes(x.id)) {
        x.clear();
      }
    })*/
    }

    /**
     * @description 그리드 리셋
     **************************
     */
    reset_grid() {
      if (this.grist) this.grist.data = {}
    }

    /**
     * @description 검색 폼 & 그리드 리셋
     **********************************
     */
    reset_all() {
      if (this.searchForm) {
        this.reset_search_form()
      }

      if (this.grist) {
        this.reset_grid()
      }
    }

    /**
     * 버튼 측에서 트랜잭션 처리 후 액션 - 폼, 그리드 리셋 처리
     */

    /**
     * @override
     **************
     */
    async fetchHandler(fetchParam) {
      let records = this.grist.data.records ? this.grist.data.records : []
      let results = await super.fetchHandler(fetchParam)

      if (!results) {
        return { records: records, total: records.total }
      } else {
        let newRecords = results.records
        newRecords.forEach(rec => {
          records.push(rec)
        })
        return { records: records, total: results.total }
      }
    }

    /**
     * @description Life Cycle - render
     ************************************
     * @returns HTML
     */
    render() {
      return html`
        ${this.getGridHtml ? html`${this.getGridHtml()} ` : html``}
        ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
      `
    }
  }
