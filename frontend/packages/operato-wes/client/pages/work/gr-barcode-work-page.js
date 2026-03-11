import { html } from 'lit-element'

import { PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { p13n } from '@operato/p13n'

import { GristRenderMixin } from '@operato-app/metapage/dist-client/mixin/grist-render-mixin'
import { UiUtil } from '@operato-app/metapage/dist-client/utils/ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description [Goods Receipt] Barcode Base Work Page
 */
export class GrBarcodeWorkPage extends GristRenderMixin(p13n(localize(i18next)(PageView))) {
  /**
   * @description filter basic button
   **********************************
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
              action.name == 'reset_all' ||
              action.name == 'clear_all') &&
            this.grist
        )
      : []
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
   * @description Clear all search form
   ****************************************
   */
  clear_all() {
    this.searchForm.reset()
    this.reset_grid()
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

  /**
   * @override page updated callback
   ************************************
   */
  async pageUpdated(changes, lifecycle, before) {
    await super.pageUpdated(changes, lifecycle, before)
    this.clear_all()
  }

  // 여기까지 MetaMobileGristMixin

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

    this.focusOnDefaultInputElement()
  }

  /**
   * @description Default focus
   ******************************
   */
  focusOnDefaultInputElement() {
    this.findSearchFormInput('loc_cd').focus()
  }

  /**
   * @override Callback after transaction success
   ************************************************
   */
  async trxSuccessCallback() {
    if (this.is_popup === true) {
      history.back()
      return
    }

    this.reset_all()
  }

  /**
   * @description Reset search form
   ****************************************
   */
  async reset_search_form() {
    this.findSearchFormInput('barcode').value = ''
    this.findSearchFormInput('loc_cd').value = ''
    this.focusOnDefaultInputElement()
  }

  /**
   * @description Find search form input element
   ***********************************************
   * @param elementName input element name
   */
  findSearchFormInput(elementName) {
    let sh = this.searchForm.shadowRoot
    return sh.querySelector(`input[name=${elementName}]`)
  }

  /**
   * @override Override Data Fetch Handler
   ******************************************
   */
  async fetchHandler(fetchParam) {
    // 1. extract original grid data
    let records = this.grist.data.records ? this.grist.data.records : []
    // 2. scanned barcode data
    let results = await super.fetchHandler(fetchParam)
    // 3. check if scanned barcode data is duplicated with grid original data
    let validData = this.checkDataDuplicated(records, results.records[0])
    // 4. reset barcode & focus on
    this.resetBarcodeAndFocus()
    // 5. scanned data is valid then
    if (validData) records.push(validData)
    // 6. return results
    return { records: records, total: records.total }
  }

  /**
   * @description Reset input element & focus
   ******************************************
   */
  resetBarcodeAndFocus() {
    this.findSearchFormInput('barcode').value = ''
    this.findSearchFormInput('barcode').focus()
  }

  /**
   * @description Check data duplicated
   ***********************************
   * @param records original grid data
   * @param item new scanned data
   */
  checkDataDuplicated(records, item) {
    if (records.length == 0) {
      return item
    } else {
      let duplicatedItem = records.find(r => r.id == item.id)
      if (duplicatedItem) {
        UiUtil.showToast('info', 'This barcode [' + item.barcode + '] is already scanned!')
        return null
      } else {
        return item
      }
    }
  }
}

customElements.define('gr-barcode-work-page', GrBarcodeWorkPage)
