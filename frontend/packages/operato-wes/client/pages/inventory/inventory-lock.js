import { css, html } from 'lit-element'
import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { GristRenderMixin } from '@operato-app/metapage/dist-client/mixin/grist-render-mixin'


import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, ValueUtil, TermsUtil, UiUtil,MetaApi,OperatoUtil } from '@operato-app/metapage/dist-client'

import { CommonButtonStyles, CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * @license
 * @author Nextosd 
 * @description Inventory Lock Custom Page
 */
export class InventoryLock extends GristRenderMixin(p13n(localize(i18next)(PageView))) {
    
  static get styles() {
    return [
      CommonGristStyles,
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: var(--md-sys-color-background);

          --grid-header-padding: 2px 0 2px 9px;
        }
      `
    ]
  }
  
  /**
   * @description filter basic button
   **********************************
   */
  filterBasicButton() {
    return this.actions
      ? this.actions.filter(
          action =>
            (action.name == 'hold') &&
            this.grist
        )
      : []
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
      <div class="md-typescale-body-medium-prominent">
      ${this.getEditHtml()}
      </div>
    `
  }

  /**
   * 检索区域
   * @returns
   */
  getEditHtml() {
    return html`
      <!--锁定编码-->
        <label filter-title><span>${TermsUtil.tLabel('lock_cd')}</span></label>
        <input type="text" id="lock_code" name="lock_code"> 
        <!--备注-->
        <label>${TermsUtil.tLabel('remark')}</label>
        <input type="text" id="lock_remark" name="lock_remark" style="width: 200px;">   
    `
  }

  /**
   * @override page updated callback
   ************************************
   */
  async pageUpdated(changes, lifecycle, before) {
    await super.pageUpdated(changes, lifecycle, before)
  }

  /**
   * @override
   *****************
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
   * @description lock inventory data
   ****************************************
   */
   async hold() {
     let records = this.grist.data.records ? this.grist.data.records : []
     let selectedRows = this.grist ? this.grist.selected : []
     if (!selectedRows || selectedRows.length == 0) {
       MetaApi.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
     } else {

       let checkLockValue = this.findFormInput('lock_code').value
       if (ValueUtil.isEmpty(checkLockValue)) {
         await UiUtil.showAlertPopup(
           'title.error',
           TermsUtil.tError('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('lock_cd') }),
           'error',
           'confirm',
           ''
         )
         return
       }

       let checkRemarkValue = this.findFormInput('lock_remark').value
       if (ValueUtil.isEmpty(checkRemarkValue)) {
         await UiUtil.showAlertPopup(
           'title.error',
           TermsUtil.tError('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('remark') }),
           'error',
           'confirm',
           ''
         )
         return
       }

       let invTrxData = {
         inventory_selected_row: selectedRows,
         lock_code: checkLockValue,
         lock_remarks: checkRemarkValue,
       }

       await ServiceUtil.restPost(
         'inventories/locked',
         invTrxData,
         'button.save',
         'text.are_you_sure',
         (e) => {
           this.grist.fetch()
           this.findFormInput('lock_code').value = ''
           this.findFormInput('lock_remark').value = ''
         },
         (e) => {

         }
       )
     }

  }

  /**
   * @description Find search form input element
   ***********************************************
   * @param elementName input element name
   */
  findFormInput(elementName) {

    return this.renderRoot.querySelector(`input[name=${elementName}]`)
  }

  /**
   * @description Check data duplicated
   ***********************************
   * @param records original grid data
   * @param items new scanned data
   */
  checkDataDuplicated(records, items) {
    if (records.length == 0) {
      return items
    } else {
      let invalidIds = records.map(r => {
        let invalidData = items.find(i => r.id == i.id)
        return invalidData ? invalidData.id : null
      })

      if (invalidIds && invalidIds.length > 0) {
        // null 제거
        invalidIds = invalidIds.filter(e => true)
        return items.filter(i => {
          return !invalidIds.includes(i.id)
        })
      } else {
        return items
      }
    }
  }
}

customElements.define('inventory-lock', InventoryLock)
