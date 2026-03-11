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
 * @description 메타 기반 PDA 화면 믹스인
 */
export const MetaPdaSimpleScreenMixin = superClass =>
  class extends MetaPdaSearchformMixin(MetaPdaListMixin(CustomGristButtonMixin(superClass))) {
    /**
     * @description 그리스트 스타일
     ****************************
     */
    static getGristStyle() {
      let styles = [CommonGristStyles, CommonHeaderStyles]

      // 검색 폼 스타일 추가
      if (this.getSearchFormStyle) {
        styles.push(...this.getSearchFormStyle())
      }

      // 그리드 스타일 추가
      if (this.getListStyle) {
        styles.push(...this.getListStyle())
      }

      // 버튼 콘테이너 스타일 추가 (팝업으로 로드시 사용)
      styles.push(...MetaUiUtil.getPopupButtonContainerStyles())

      return styles
    }

    /**
     * @override
     **************
     */
    async firstUpdated() {
      if (super.firstUpdated) {
        await super.firstUpdated()
      }

      // parse search form meta
      this.parseSearchFormMeta()

      // parse grist configuration
      this.createGristConfig()
    }

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
     * @description 검색 폼 & 그리드 리셋
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
     * @description Remove selected items
     ****************************************
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
     * @description override, 그리드 버튼 추가
     ****************************************
     */
    getGristButtons() {
      const gristButtons = []
      if (super.getGristButtons) {
        gristButtons.push(...super.getGristButtons())
      }

      // grid, card상의 remove 버튼 추가
      if (this.actions.find(action => action.name == 'remove_from_grid')) {
        gristButtons.push({
          type: 'gutter',
          gutterName: 'button',
          icon: 'delete',
          danger: true,
          handlers: {
            click: async (columns, data, column, record, rowIndex) => {
              const answer = await UiUtil.showAlertPopup(
                'button.delete',
                'text.are_you_sure',
                'question',
                'delete',
                'cancel'
              )
              if (answer || answer.value) {
                let records = JSON.parse(JSON.stringify(this.grist.data.records))
                const clickedRecordId = record.id
                let newRecords = records.filter(r => {
                  return r.id != clickedRecordId
                })
                this.grist.data = { records: newRecords, total: records.total }
              }
            }
          },
          width: 40
        })
      }
      return gristButtons
    }

    /**
     * @override
     **************
     */
    async fetchHandler(fetchParam) {
      let results = await super.fetchHandler(fetchParam)
      this.grist.data = results
    }

    /**
     * @description Life Cycle - render
     ************************************
     * @returns HTML
     */
    render() {
      return html`
        ${this.getGridHtml ? html`${this.getGridHtml()}` : html``}
        ${this.getButtonHtml ? html`${this.getButtonHtml()}` : html``}
      `
    }

    /**
     * @override Callback after transaction success
     ************************************************
     */
    async trxSuccessCallback() {
      return this.is_popup ? history.back() : this.reset_grid()
    }
  }
