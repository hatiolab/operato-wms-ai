import '@things-factory/barcode-ui'
import { PropertyValues, html, css } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, ValueUtil, TermsUtil, UiUtil, OperatoUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { CommonButtonStyles, CommonGristStyles, CommonHeaderStyles } from '@operato/styles'
import { OxPrompt } from '@operato/popup/ox-prompt.js'
import { SearchFormStyles } from '@things-factory/form-ui/client/styles'
// const logo = new URL('/assets/images/hatiolab-logo.png', import.meta.url).href
import { DataGrist, FetchOption } from '@operato/data-grist'
import { OxInputBarcode } from '@operato/input'
import { isMobileDevice } from '@operato/utils'
import { OxSelect } from '@operato/input'
import { openPopup } from '@operato/layout'

@customElement('pda-wms-peer-to-peer')
export class PdaWmsPeerToPeer extends connect(store)(PageView) {
  static get styles() {
    return [
      CommonGristStyles,
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow: hidden;

          --grid-header-padding: 2px 0 2px 9px;
        }

        .pda-search-form {
          position: relative;
          display: grid;
          background-color:var(--search-form-background-color, var(--md-sys-color-surface));
          grid-template-columns: repeat(24, 1fr);
          grid-gap: var(--form-grid-gap);
          grid-auto-rows: minmax(24px, auto);
          padding: var(--spacing-small);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .pda-search-form label {
          grid-column: span 3;
          text-align: right;
          align-self: center;
          text-transform: capitalize;

          color: var(--md-sys-color-on-primary-container);
          font: var(--label-font);
        }

        label md-icon {
          --md-icon-size: var(--record-view-label-icon-size);
          display: inline-block;
          opacity: 0.5;
        }

        .pda-search-form input,
        .pda-search-form ox-input-barcode,
        .pda-search-form ox-select {
          grid-column: span 9;

          border: var(--input-field-border);
          border-bottom: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: var(--input-field-border-radius);
          padding: var(--spacing-tiny);
          font: var(--input-field-font);
          max-width: 85%;
          color: var(--input-field-color, var(--md-sys-color-on-surface-variant));
          background-color: var(--md-sys-color-surface-container-lowest);
        }

        .pda-search-form ox-select {
          max-width: calc(85% + 18px);
        }

        .pda-search-form input[type='checkbox'],
        .pda-search-form input[type='radio'] {
          justify-self: end;
          align-self: center;
          grid-column: span 3 / auto;
          position: relative;
          left: 17px;
        }

        .pda-search-form input[type='checkbox'] + label,
        .pda-search-form input[type='radio'] + label {
          padding-left: 17px;
          text-align: left;
          align-self: center;
          grid-column: span 9 / auto;

          font: var(--form-sublabel-font);
          color: var(--form-sublabel-color, var(--md-sys-color-secondary));
        }
        ox-popup-list {
          max-height: 300px;
          overflow: auto;
        }

        input:focus {
          outline: none;
          border: 1px solid var(--focus-background-color);
        }
        input[type='checkbox'] {
          margin: 0;
        }

        [search] {
          position: absolute;
          right: 1%;
          bottom: 15px;
          color: var(--pda-search-form-icon-color, var(--md-sys-color-primary));
        }

        .tab-contents .pda-search-form{
          background-color:var(--md-sys-color-on-primary);
          border:var(--input-field-border)
        }
        .pda-search-form ox-input-barcode{
          background-color:transparent;
          --md-sys-color-on-primary:transparent;
          background:var(--barcodescan-input-button-icon) no-repeat 98.5% center;
        }

        @media screen and (max-width: 460px) {
          .pda-search-form {
            grid-template-columns: repeat(12, 1fr);
            grid-gap: var(--spacing-medium);
            background-color: var(--md-sys-color-surface);

            max-height: 100%;
            overflow-y: auto;
          }
          .pda-search-form label {
            padding-right: 5px;
            color: var(--md-sys-color-on-surface);
          }
          .pda-search-form input,
          .pda-search-form ox-select {
            grid-column: span 8;
            max-width: 100%;
            color: var(--md-sys-color-on-surface);
          }
          .pda-search-form input[type='checkbox'],
          .pda-search-form input[type='radio'] {
            justify-self: end;
            align-self: center;
            grid-column: span 3 / auto;
          }

          .pda-search-form input[type='checkbox'] + label,
          .pda-search-form input[type='radio'] + label {
            grid-column: span 8 / auto;
            align-self: center;
            position: relative;
            left: 5px;
            color: var(--md-sys-color-on-surface);
          }

          [search] {
            right: 3%;
            color: var(--md-sys-color-on-surface);
          }

          .root_container {
            padding: 0 !important;
          }
        }
        @media (min-width: 461px) and (max-width: 1024px) {
          .pda-search-form ox-select {
            max-width: calc(85% + 10px);
          }
        }
        @media screen and (min-width: 1201px) and (max-width: 2000px) {
          .pda-search-form {
            grid-template-columns: repeat(36, 1fr);
          }
          .pda-search-form input,
          .pda-search-form ox-select {
            max-width: 90%;
          }
          .pda-search-form ox-select {
            max-width: calc(90% + 18px);
          }
        }

        @media screen and (min-width: 2001px) {
          .pda-search-form {
            grid-template-columns: repeat(48, 1fr);
          }
          .pda-search-form input,
          .pda-search-form ox-select {
            max-width: 90%;
          }
          .pda-search-form ox-select {
            max-width: calc(90% + 18px);
          }
          [search] {
            right: 0.8%;
          }
        }

        .ox-input-barcode {
          border-bottom: var(--record-view-edit-border-bottom);
        }

        .ox-grist {
          overflow-y: auto;
          flex: 1;
          min-height: 250px;
        }

        .tabs {
          display: flex;
        }

        .tab-contents {
          display: flex;
          flex: 1;
          flex-direction: column;
          overflow-x: overlay;
          background-color: var(--md-sys-color-background);
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
        .root_container {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: var(--record-view-padding);
          overflow-y: auto;
          height: 100%;
          border-bottom: var(--record-view-border-bottom);
        }

        .content_container ox-select {
          grid-column: span 8;
          max-width: 100%;
          color: var(--md-sys-color-on-surface);
        }

        .radio-group {
      display: flex;
      gap: 1rem;
      padding: 1rem;
    }
    
    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    
    input[type="radio"] {
      width: 1.2em;
      height: 1.2em;
    }
      `
    ]
  }
  @query('#scan-ox-grist') private _scanGrist!: DataGrist

  @query(`#oxSelectWarehouse`) private _oxWarehouseSelect!: OxSelect
  @query('#oxSelectCustomer') private _oxCustomerSelect!: OxSelect
  @query('#oxSelectOrderNo') private _oxOrderNoSelect!: OxSelect

  // 订单中的状态
  @state() private status_all_scaned: string = 'ALL SCANNED'
  @state() private status_picked: string = 'PICKED'

  // 当前选择的TabId = 默认Tab编辑显示
  @state() private currentTabKey: string = 'scanTab'

  // 仓库编码
  @state() protected _wcCd: string = ''
  // 仓库下拉列表框
  @state() protected _warehouseList: any[] = []

  // 日期
  @state() protected _releaseOrderDate: string = ''//OperatoUtil.getTodayStr()
  // 列表显示模式
  @state() private mode: string = 'CARD'
  @state() private modeOrder: 'CARD' | 'GRID' | 'LIST' = isMobileDevice() ? 'CARD' : 'GRID'
  @state() private gristConfig: any

  // 扫描发货列表
  @state() private _scanShipmentlList: any[] = []

  @property({ type: String }) itemId?: string
  @property({ type: Object }) params: any

  @property({ type: String }) peerSelectValue = '10'

  get context() {
    return {
      title: i18next.t('menu.PdaWmsPeerToPeer'),
      help: 'operato-wes/pda-wms-peer-to-peer',
      actions: [
        {
          title: i18next.t('button.reset'),
          action: this.reset.bind(this),
          ...CommonButtonStyles.clear
        }
      ]
    }
  }

  render() {
    return html`
      <div class="pda-search-form">${this.getSearchHtml()}</div>
      <div class="radio-group">
           
      
              <div >
                <input
                  type="radio"
                  id="purpose_20"
                  name="purpose"
                  .value=${Purpose.MOVE}
                  @change=${(e: Event) => {
        let newVal = (e.target as HTMLInputElement).value
        if (this.peerSelectValue !== newVal) {
          this._onInputTaxInvoice(newVal)
        }
      }}
                  checked
                />
                <label for="purpose_20">${TermsUtil.tLabel('moving_warehouse')}</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="purpose_10"
                  name="purpose"
                  .value=${Purpose.SHIPMENT}
             @change=${(e: Event) => {
        let newVal = (e.target as HTMLInputElement).value
        if (this.peerSelectValue !== newVal) {
          this._onInputTaxInvoice(newVal)
        }
      }}
              
                />
                <label for="purpose_10">${TermsUtil.tLabel('moving_shipment')}</label>
              </div>
  
          </div>
      <div class="root_container">${this.getListHtml()} </div>
    `
  }

  /**
   * 检索区域
   * @returns
   */
  getSearchHtml() {
    return html`
     
      <!--仓库信息-->
        <label>${TermsUtil.tLabel('wh_cd')}</label>
        <ox-select
          id="oxSelectWarehouse"
          data-value
          placeholder=""
          .value=${this._wcCd}
          @change=${(e: Event) => {
        let newWhCd = (e.target as HTMLInputElement).value
        if (this._wcCd !== newWhCd) {
          this._wcCd = newWhCd
          this._toWarehouseChange(newWhCd)
        }
      }}
        >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._warehouseList.map(
        item => html` <div option value=${item.wh_cd}>${item.wh_cd} (${item.wh_nm})</div> `
      )}
          </ox-popup-list>
        </ox-select>

         </div>
          
    `
  }

  /**
   * 扫描发货列表
   * @returns
   */
  getListHtml() {
    const mode = this.mode || (isMobileDevice() ? 'CARD' : 'CARD')

    return html`
      <ox-grist id="scan-ox-grist" .mode=${mode} .config=${this.gristConfig}> </ox-grist>
    `
  }

  updated(changes: PropertyValues<this>) {
    /*
     * If this page properties are changed, this callback will be invoked.
     * This callback will be called back only when this page is activated.
     */
    if (changes.has('itemId') || changes.has('params')) {
      /* do something */
    }
  }

  stateChanged(state: any) {
    /*
     * application wide state changed
     *
     */
  }

  pageUpdated(changes: any, lifecycle: any, before: any) {
    if (this.active) {
      /*
       * this page is activated
       */
      this.itemId = lifecycle.resourceId
      this.params = lifecycle.params
    } else {
      /* this page is deactivated */
    }
  }

  pageDisposed(lifecycle: any) {
    /*
     * This page is disposed.
     * It's right time to release system resources.
     *
     * - called just before (re)pageInitialized
     * - called right after when i18next resource updated (loaded, changed, ..)
     * - called right after this.pageReset()
     * - called right after this.pageDispose()
     */
  }


  async searchLocation4Peer() {

    // 设置扫描查询数据
    let queryData = {
      whCd: this._wcCd,
      zoneCd: ''
    }
    // 查询对应的拣货数据
    let searchReslutLst = await ServiceUtil.restGet(
      'workhomes/search/peer-to-peer/location/ready/multi/pda',
      queryData
    )

    if (ValueUtil.isNotEmpty(searchReslutLst)) {

      for (let i = 0; i < searchReslutLst.length; i++) {

        await this._scanShipmentlList.push(searchReslutLst[i])
        await this._scanShipmentlList.reverse()
        // 重新加载扫描列表数据
        await this.updateResultGristData()
      }
    } else {
      this.clearResultGristData()
    }

  }

  async _toWarehouseChange(val: string) {
    this.clearResultGristData()
    this.searchLocation4Peer()
  }
  /**
  * 保存列表数据
  */
  async reset() {

    // 情况检索部
    this.reset_search_form();
    // 清空表格
    this.reset_grist();
  }

  /**
  * @description Reset search form
  ****************************************
  */
  async reset_grist() {
    this.clearResultGristData();
  }

  /**
   * @description Reset search form
   ****************************************
   */
  async reset_search_form() {
    this._oxWarehouseSelect.value = ''
    this._oxCustomerSelect.value = ''
    this._oxOrderNoSelect.value = ''
    this._wcCd = ''
    this._releaseOrderDate = ''
  }

  /**
   * @description Find search form input element
   ***********************************************
   * @param elementName input element name
   */
  findSearchFormInput(elementName) {
    return this.renderRoot.querySelector(`input[name=${elementName}]`)
  }

  /**
   * 删除列表数据
   */
  async showPopup(rowIndex: any) {
    if (!this._scanShipmentlList) return

    let popup = openPopup(html` <pda-wms-peer-to-peer-popup .locCd=${this._scanShipmentlList[rowIndex].loc_cd}  .barcode=${this._scanShipmentlList[rowIndex].barcode}  .peerModel=${this.peerSelectValue} ></pda-wms-peer-to-peer-popup> `, {
      size: 'large',
      title: `${i18next.t('menu.PdaWmsPeerToPeer')}`,
      backdrop: true
    })

    // close handler
    if (popup) {
      // 打印完关闭页面回调事件
      popup.onclosed = () => {
        // 重新加载列表数据
        // this._lotGrist.fetch()
      }
    }

  }

  /**
   * 列表数据更新
   * @param param0
   * @returns
   */
  async updateResultGristData() {
    this._scanGrist.data = {
      total: this._scanShipmentlList ? this._scanShipmentlList.length : 0,
      records: this._scanShipmentlList ? this._scanShipmentlList : []
    }
  }

  /**
  * 删除列表数据
  */
  async updateShipmentStatus(rowReslut: any) {
    if (rowReslut.order_qty == (rowReslut.issued_qty + rowReslut.scanned_qty)) {
      rowReslut.status = this.status_all_scaned
    } else {
      rowReslut.status = this.status_picked
    }
    return rowReslut
  }
  async _onInputTaxInvoice(val: string) {

    this.peerSelectValue= val
  }

  /**
   * 列表数据更新
   * @returns
   */
  async clearResultGristData() {
    this._scanGrist.data = {
      total: 0,
      records: []
    }
    this._scanShipmentlList = []
  }

  /**
   * Page Init
   * @param lifecycle
   */
  pageInitialized(lifecycle: any) {
    this.getWarehouseList()

    if(ValueUtil.isNotEmpty(this._warehouseList)) {
      this._wcCd =  this._warehouseList[0].wh_cd
    }
    
    this.getScanGristConfig()

    this.searchLocation4Peer()
    this.requestUpdate()
  }

  /**
   * 扫描发货列表Grist配置
   */
  async getScanGristConfig() {
    this.gristConfig = {
      pagination: { infinite: true },
      list: {
        fields: ['loc_cd', 'zone_cd', 'wh_cd', 'restrict_type','barcode', 'completely_fill_flag'],
        details: []
      },
      columns: [
        { type: 'gutter', gutterName: 'sequence' },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'edit',
          title: i18next.t('button.delete'),
          handlers: {
            click: (_columns, _data, _column, record, _rowIndex) => {
              this.showPopup(_rowIndex)
            }
          }
        },
        {
          type: 'string',
          name: 'id',
          header: i18next.t('label.id'),
          hidden: true
        },
        {
          type: 'string',
          name: 'wh_cd',
          label: true,
          header: i18next.t('label.wh_cd'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'zone_cd',
          label: true,
          header: i18next.t('label.zone_cd'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'loc_cd',
          label: true,
          header: i18next.t('label.loc_cd'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'barcode',
          label: true,
          header: i18next.t('label.barcode'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'restrict_type',
          label: true,
          header: i18next.t('label.restrict_type'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'number',
          name: 'completely_fill_flag',
          label: true,
          header: i18next.t('label.completely_fill_flag'),
          record: {
            editable: false
          },
          width: 80
        }
      ],
      rows: {
        appendable: false,
        selectable: {
          multiple: true
        }
      },
      sorters: []
    }

    // 设置行颜色配置信息
    let rowColorConfig = [{
      col_name: 'completely_fill_flag',
      col_value: '1',
      background_color: 'orange',
      font_color: 'black'
    }]

    if (rowColorConfig && rowColorConfig.length > 0) {
      this.gristConfig.rows.classifier = (record, rowIndex) => {
        // 根据条件返回两个数组中的颜色，顺序为 [BACKGROUP_COLOR, FONT_COLOR]...
        for (let idx = 0; idx < rowColorConfig.length; idx++) {
          let rowColorConf = rowColorConfig[idx]
          let recordValue = record[rowColorConf.col_name]
          if (recordValue == rowColorConf.col_value) {
            return {
              emphasized: [rowColorConf.background_color, rowColorConf.font_color]
            }
          }
        }
      }
    }
  }

  /**
   * 获取仓库列表
   */
  async getWarehouseList() {
    // 初始化获取仓库列表
    this._warehouseList = await ServiceUtil.restGet('workhomes/getWarehouseList', {})
  }

}

export enum Purpose {
  MOVE = '10',
  SHIPMENT = '20'
}
export const PURPOSE = {
  [Purpose.MOVE]: i18next.t('label.moving_warehouse'),
  [Purpose.SHIPMENT]: '移动并出库'
}
