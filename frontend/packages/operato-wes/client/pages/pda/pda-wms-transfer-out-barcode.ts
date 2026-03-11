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

@customElement('pda-wms-transfer-out-barcode')
export class PdaWmsTransferOutBarcode extends connect(store)(PageView) {
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
      `
    ]
  }
  @query('#scan-ox-grist') private _scanGrist!: DataGrist
  @query('#order-ox-grist') private _orderGrist!: DataGrist
  @query(`#oxSelectWarehouse`) private _oxWarehouseSelect!: OxSelect
  @query('#oxSelectOrderNo') private _oxOrderNoSelect!: OxSelect
  @query('#oxScanBarcode') private _oxScamBarcode!: OxInputBarcode

  @query(`ox-input-barcode`) _oxInputBarCode!: OxInputBarcode
 
  // 订单中的状态
  @state() private status_all_scaned: string = 'ALL SCANNED'
  @state() private status_picked: string = 'PICKED'

  // 当前选择的TabId = 默认Tab编辑显示
  @state() private currentTabKey: string = 'scanTab'

  // 拣货单列表
  @state() protected _pickedOrderList: any[] = []
  // 仓库编码
  @state() protected _wcCd: string = ''
  // 仓库下拉列表框
  @state() protected _warehouseList: any[] = []
  // 目标仓库
  @state() protected _toWhCd: string = ''
  // 客户下拉列表框
  @state() protected _customerList: any[] = []
  // 订单ID
  @state() protected _orderId: string = ''
  // 订单详细信息
  @state() protected _orderInfo: any = {}

  // 日期
  @state() protected _releaseOrderDate: string = ''//OperatoUtil.getTodayStr()
  // 列表显示模式
  @state() private mode: string = 'CARD'
  @state() private modeOrder: 'CARD' | 'GRID' | 'LIST' = isMobileDevice() ? 'CARD' : 'GRID'
  @state() private gristConfig: any

  @state() private gristConfigOrder: any
  // 单位
  @state() private _uomSelectDatas: any[] = []
  // 拣货单明细信息
  @state() private _pickedInfo: any = {}
  // 扫描发货列表
  @state() private _scanShipmentlList: any[] = []

  // 拣货单明细信息
  @state() private _showOrderList: any[] = []

  @property({ type: String }) itemId?: string
  @property({ type: Object }) params: any

  get context() {
    return {
      title: i18next.t('menu.PdaWmsTransferOutBarcode'),
      help: 'operato-wes/pda-wms-transfer-out-barcode',
      actions: [
        {
          title: i18next.t('button.reset'),
          action: this.reset.bind(this),
          ...CommonButtonStyles.clear
        },
        {
          title: i18next.t('button.release_end'),
          action: this.save.bind(this),
          ...CommonButtonStyles.save
        }
      ]
    }
  }

  render() {
    return html`
      <div class="pda-search-form">${this.getSearchHtml()}</div>
      <div class="root_container">${this.getTabsHtml()} ${this.getScanHtml()} ${this.getOrderHtml()}</div>
    `
  }

  /**
   * 检索区域
   * @returns
   */
  getSearchHtml() {
    return html`
     
      <!--仓库信息-->
        <label>${TermsUtil.tLabel('from_wh_cd')}</label>
        <ox-select
          id="oxSelectWarehouse"
          data-value
          placeholder=""
          .value=${this._wcCd}
          @change=${(e: Event) => {
            this._wcCd = (e.target as HTMLInputElement).value
          }}
        >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._warehouseList.map(
              item => html` <div option value=${item.wh_cd}>${item.wh_cd} (${item.wh_nm})</div> `
            )}
          </ox-popup-list>
        </ox-select>

      <!--目标仓库信息-->
        <label>${TermsUtil.tLabel('to_wh_cd')}</label>
        <ox-select
          id="oxSelectWarehouse"
          data-value
          placeholder=""
          .value=${this._toWhCd}
          @change=${(e: Event) => {
            this._toWhCd = (e.target as HTMLInputElement).value
          }}
        >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._warehouseList.map(
              item => html` <div option value=${item.wh_cd}>${item.wh_cd} (${item.wh_nm})</div> `
            )}
          </ox-popup-list>
        </ox-select>

        <label>${TermsUtil.tLabel('procurement_plan_date')}</label>
        <input
          type="date"
          .value=${this._releaseOrderDate}
          @change=${(e: Event) => {
            this._releaseOrderDate = (e.target as HTMLInputElement).value
            this.getPickedOrderList()
          }}
        />
        <!--拣货单号-->
        <label>${TermsUtil.tLabel('procurement_order_no')}</label>
        <ox-select
          id="oxSelectOrderNo"
          data-value
          placeholder = '${TermsUtil.tLabel('procurement_order_no')}'
          .value=${this._orderId}
          @change=${(e: Event) => {
            let newOrderId = (e.target as HTMLInputElement).value
            if (this._orderId !== newOrderId) {
              this._pickOrderIdChange(newOrderId)
            }
            this._orderId = (e.target as HTMLInputElement).value
          }}
        >
          <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._pickedOrderList.map(
              item => html` <div option value=${item.procurement_order_no}>${item.procurement_order_no}</div> `
            )}
          </ox-popup-list>
        </ox-select>
      </div>
    `
  }

  /**
   * tab区域
   * @returns
   */
  getTabsHtml() {
    return html`
      <div class="tabs">
        <!--扫描列表-->
        <div
          id="scanTab"
          class="tab"
          ?activate="${'scanTab' === this.currentTabKey}"
          @click="${() => (this.currentTabKey = 'scanTab')}"
        >
          <md-icon>edit_note</md-icon>
          <span>${TermsUtil.tTitle('Scan Area')}</span>
        </div>
        <!--订单信息-->
        <div
          id="orderTab"
          class="tab"
          ?activate="${'orderTab' === this.currentTabKey}"
          @click="${() => (this.currentTabKey = 'orderTab')}"
        >
          <md-icon>format_list_numbered</md-icon>
          <span>${TermsUtil.tTitle('Order List')}</span>
        </div>
      </div>
    `
  }

  /**
   * 扫描区域
   * @returns
   */
  getScanHtml() {
    return html`
      <div
        class="tab-contents"
        id="tab-content-scanTab"
        style="${'scanTab' == this.currentTabKey ? 'display:flex' : 'display:none'}"
      >
        <div class="pda-search-form">
          <label
            ><span>*${TermsUtil.tLabel('barcode')}</span>
            <md-icon>edit</md-icon>
          </label>
          <ox-input-barcode
            name="txtQrCode"
            id="oxScanBarcode"
            placeholder="${TermsUtil.tLabel('scan_barcode')}"
            @keydown=${e => {
              this.scanBarCode(e)
            }}
          ></ox-input-barcode>
        </div>
        ${this.getListHtml()}
      </div>
    `
  }

  /**
   * 订单区域
   * @returns
   */
  getOrderHtml() {
    return html`
      <div
        class="tab-contents"
        id="tab-content-scanTab"
        style="${'orderTab' == this.currentTabKey ? 'display:flex' : 'display:none'}"
      >
        ${this.getOrderListHtml()}
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

  /**
   * 扫描发货列表
   * @returns
   */
  getOrderListHtml() {
    const mode = this.modeOrder || (isMobileDevice() ? 'CARD' : 'GRID')

    return html` <ox-grist id="order-ox-grist" .mode=${mode} .config=${this.gristConfigOrder}> </ox-grist> `
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

  /**
   * 扫描二维码
   * @param barcode
   */
  async getShipmentList(pickOrderNo: any, rowData: any) {
    let records = this._orderGrist.data.records ? this._orderGrist.data.records : []
   
    if (ValueUtil.isNotEmpty(this._showOrderList) &&  this._showOrderList.length > 0) {

      for (let i = 0; i < this._showOrderList.length; i++) {
        if (this._showOrderList[i].product_id == rowData.product_id) {
          this._showOrderList[i].scanned_qty = this._showOrderList[i].scanned_qty + rowData.picked_qty
          this._showOrderList[i].picked_qty = this._showOrderList[i].scanned_qty
          this.updateShipmentStatus(this._showOrderList[i]);
        }
      }
    } else {
      let orderSeachData = {
        pickingOrderNo: pickOrderNo
      }
      let tempOrderList = await ServiceUtil.restGet(
        'outbound_work/transfer_orders/release/summary/barcode/show/multi/' + pickOrderNo,
        orderSeachData
      )

      // 判断是否查询到结果
      if (ValueUtil.isNotEmpty(tempOrderList) && ValueUtil.isNotEmpty(tempOrderList)) {
        for (let i = 0; i < tempOrderList.length; i++) {

          let scanQty = 0;
          if (tempOrderList[i].product_id == rowData.product_id) {
            scanQty = rowData.picked_qty;
          }

          let rowDataOrder = {
            id: tempOrderList[i].id,
            product_id: tempOrderList[i].product_id,
            product_nm: tempOrderList[i].product.product_nm,
            product_cd: tempOrderList[i].product.product_cd,
            order_qty: tempOrderList[i].order_qty,
            picked_qty: scanQty,
            issued_qty: tempOrderList[i].issued_qty,
            scanned_qty: scanQty,
            qty_unit: tempOrderList[i].qty_unit ? tempOrderList[i].qty_unit : '',
            line_no: tempOrderList[i].line_no,
            status: tempOrderList[i].status
          }
          this.updateShipmentStatus(rowDataOrder);
          // 将结果添加到对应的列表中
          await this._showOrderList.push(rowDataOrder)
        }
      }
    }
    // 重新加载订单列表数据
    await this.updateResultOrderGristData()
  }

   /**
   * 检查扫描的数量释放超出订单数量
   * @param barcode
   */
  async checkScanOrderTotalQty(rowData: any) {
    let returnValue = true;
    if (ValueUtil.isNotEmpty(this._showOrderList) &&  this._showOrderList.length > 0) {

      for (let i = 0; i < this._showOrderList.length; i++) {
        if (this._showOrderList[i].product_id == rowData.product_id) {
          let checkQty  = this._showOrderList[i].scanned_qty + rowData.picked_qty

          if(checkQty> this._showOrderList[i].order_qty){
            await UiUtil.showAlertPopup(
              'title.error',
              TermsUtil.tText('EXCEEDING_THE_DETAILED_ORDER_QTY', { value1: rowData.product_cd+"("+rowData.product_nm+")",value2: this._showOrderList[i].line_no,value3: this._showOrderList[i].order_qty}),
              'error',
              'confirm',
              ''
            )
            returnValue = false; 
          }
        }
      }
    } 
    return returnValue
  }

  /**
   * 扫描二维码
   * @param barcode
   */
  async scanBarCode(e) {

    // 判断是否按下回车键
    if (!ValueUtil.isEquals('Enter', e.key)) {
      return
    }
    // 取得输入值
    let barcode = e.target.value

    if (ValueUtil.isEmpty(barcode)) {
      return
    }
     
    // 判断单据号是否选择
    if (ValueUtil.isEmpty(this._orderId)) {
    
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('procurement_order_no') }),
        'error',
        'confirm',
        ''
      )
      return
    }
  
    // 设置扫描查询数据
    let qrCodeData = {
      sancCode: barcode,
      pickingOrderNo: this._orderId
    }

    // 查询对应的拣货数据
    this._pickedInfo = await ServiceUtil.restGet(
      'outbound_work/transfer_orders/release/barcode/ready/multi/pda',
      qrCodeData
    )

    if (ValueUtil.isEmpty(this._pickedInfo)) {
      this._oxInputBarCode.value = ''
      this._oxInputBarCode.renderRoot.querySelector('input')?.focus()
      return
    }
  
    // 检查是否扫描重复项
    let checkDuplicated = this.checkDataDuplicated(this._scanShipmentlList, this._pickedInfo)
    if (ValueUtil.isEmpty(checkDuplicated)) {
      this._oxInputBarCode.value = ''
      this._oxInputBarCode.renderRoot.querySelector('input')?.focus()
      return
    }

    // 判断是否查询到结果
    if (ValueUtil.isNotEmpty(this._pickedInfo) && ValueUtil.isNotEmpty(this._pickedInfo.barcode)) {

      let scanFlag = false
      if(!ValueUtil.isEquals(this._pickedInfo.fifo_barcode,barcode)) {

          // 拣货单是否选择判断
          const answer = await UiUtil.showAlertPopup('button.confirm', TermsUtil.tText('NOT_IN_COMPLIANCE_WITH_FIFO', { value1: this._pickedInfo.fifo_barcode, value2: this._pickedInfo.fifo_loc_cd}), 'question', 'confirm', 'cancel')
          if (answer || answer.value) {
            scanFlag = true
          } else {
            this._oxInputBarCode.value = ''
            this._oxInputBarCode.renderRoot.querySelector('input')?.focus()
            return
          }
            
         
      } else {
        scanFlag = true
      }

      if(!scanFlag) {
        return
      }
      
      let rowData = {
        id: this._pickedInfo.id,
        product_cd: this._pickedInfo.product.product_cd,
        product_nm: this._pickedInfo.product.product_nm,
        barcode: this._pickedInfo.barcode,
        lot_no: this._pickedInfo.lot_no,
        product_id: this._pickedInfo.product_id,
        reserved_qty: this._pickedInfo.inv_qty,
        picked_qty: this._pickedInfo.inv_qty,
        inv_qty: this._pickedInfo.inv_qty,
        picking_order_no: this._pickedInfo.barcode,
        qty_unit: this._pickedInfo.qty_unit ? this._pickedInfo.qty_unit : ''
      }

      // 检查扫描的数量释放超出订单数量
      let isCheck = await this.checkScanOrderTotalQty(rowData)
      if(!isCheck) {
        this._oxInputBarCode.value = ''
        this._oxInputBarCode.renderRoot.querySelector('input')?.focus()
        return
      } 
      // 将结果添加到对应的列表中
      await this._scanShipmentlList.push(rowData)
      await this._scanShipmentlList.reverse()
      // 重新加载扫描列表数据
      await this.updateResultGristData()
      this._oxInputBarCode.value = ''
      this._oxInputBarCode.focus()

      // 查询订单信息
      this.getShipmentList(qrCodeData.pickingOrderNo, rowData)
    } 
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
    this.clearResultGristData()
   }

  /**
   * @description Reset search form
   ****************************************
   */
   async reset_search_form() {

     this._oxScamBarcode.value = '';

     this._oxWarehouseSelect.value = ''
     this._oxOrderNoSelect.value = ''
     this._wcCd=''
     this._toWhCd=''
     this._orderId=''
     this._releaseOrderDate=''
     this._oxInputBarCode.renderRoot.querySelector('input')?.focus()
     this._oxInputBarCode.focus()
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
   * 保存列表数据
   */
  async save() {
    // 拣货单是否选择判断
    if (ValueUtil.isEmpty(this._orderId)) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('picking_order_no') }),
        'error',
        'confirm',
        ''
      )
      return
    }

    // 发货数据是否为空判断
    if (ValueUtil.isEmpty(this._scanShipmentlList)) {
      await UiUtil.showAlertPopup('title.error', TermsUtil.tText('No Data'), 'error', 'confirm', '')
      return
    }

    let submitModel = { inventorys: this._scanShipmentlList, order_no: this._orderId }

    await ServiceUtil.restPost(
      'outbound_work/transfer_orders/release/barcode/go/multi',
      submitModel,
      'button.save',
      'text.are_you_sure',
      (e: any) => {
        // 发货成功后执行操作,
        // 清空扫描&订单列表
        this._scanShipmentlList = []
        this._showOrderList = []
        // 拣货信息清空
        this._pickedInfo = {}
        // 重新加载投料列表数据
        this.updateResultGristData()
        this.updateResultOrderGristData()
        this.reset_search_form()

      },
      (e: any) => {
        // 出错操作
      }
    )
  }

  /**
   * 删除列表数据
   */
  async delete(rowIndex: any) {
    if (!this._scanShipmentlList) return

    let confirm = await UiUtil.showAlertPopup('button.delete', 'text.are_you_sure', 'question', 'confirm', 'cancel')

    if (confirm) {
      let rowResult = this._scanShipmentlList[rowIndex]
      // 删除发货数据指定行
      await this._scanShipmentlList.splice(rowIndex, 1)

      if (ValueUtil.isNotEmpty(this._showOrderList)) {

        for (let i = 0; i < this._showOrderList.length; i++) {
          if (this._showOrderList[i].product_id == rowResult.product_id) {
            this._showOrderList[i].scanned_qty = this._showOrderList[i].scanned_qty - rowResult.picked_qty
            this._showOrderList[i].picked_qty = this._showOrderList[i].scanned_qty
            this.updateShipmentStatus(this._showOrderList[i])
          }
        }
      }

      // 重新加载列表数据
      await this.updateResultGristData()
      await this.updateResultOrderGristData()
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
  
  /**
   * 列表数据更新
   * @param param0
   * @returns
   */
  async updateResultOrderGristData() {
    this._orderGrist.data = {
      total: this._showOrderList ? this._showOrderList.length : 0,
      records: this._showOrderList ? this._showOrderList : []
    }
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
    this._orderGrist.data = {
      total: 0,
      records: []
    }
    this._scanShipmentlList=[]
    this._showOrderList=[]
  }

  /**
   * Page Init
   * @param lifecycle
   */
  pageInitialized(lifecycle: any) {
    this.getUomSelectDatas()
    this.getWarehouseList()
    this.getCustomerList()
    this.getScanGristConfig()
    this.getOrderListlGristConfig()
    this.requestUpdate()
  }

  /**
   * 扫描发货列表Grist配置
   */
  async getScanGristConfig() {
    this.gristConfig = {
      pagination: { infinite: true },
      list: {
        fields: ['barcode', 'product_cd', 'product_nm', 'lot_no', 'picked_qty', 'qty_unit'],
        details: []
      },
      columns: [
        { type: 'gutter', gutterName: 'sequence' },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'delete',
          title: i18next.t('button.delete'),
          handlers: {
            click: (_columns, _data, _column, record, _rowIndex) => {
              this.delete(_rowIndex)
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
          name: 'product_id',
          header: i18next.t('label.product_id'),
          hidden: true
        },
        {
          type: 'string',
          name: 'picking_order_no',
          header: i18next.t('label.picking_order_no'),
          hidden: true
        },
        {
          type: 'string',
          name: 'product_cd',
          label: true,
          header: i18next.t('label.product_cd'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'product_nm',
          label: true,
          header: i18next.t('label.product_nm'),
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
          width: 200
        },
        {
          type: 'string',
          name: 'lot_no',
          label: true,
          header: i18next.t('label.lot_no'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'number',
          name: 'picked_qty',
          label: true,
          header: i18next.t('label.picked_qty'),
          record: {
            editable: false
          },
          width: 80
        },
        {
          type: 'number',
          name: 'inv_qty',
          label: true,
          header: i18next.t('label.inv_qty'),
          record: {
            editable: false
          },
          width: 80
        },
        {
          type: 'select',
          name: 'qty_unit',
          label: true,
          header: i18next.t('label.qty_unit'),
          record: {
            editable: false,
            options: this._uomSelectDatas
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
  }

  /**
   * 扫描发货列表Grist配置
   */
  async getOrderListlGristConfig() {
    this.gristConfigOrder = {
      pagination: { infinite: true },
      list: {
        fields: [
          'product_nm',
          'product_cd',
          'line_no',
          'order_qty',
          'scanned_qty',
          'picked_qty',
          'issued_qty',
          'qty_unit'
        
        ],
        details: []
      },
      columns: [
        { type: 'gutter', gutterName: 'sequence' },
        {
          type: 'string',
          name: 'id',
          header: i18next.t('label.id'),
          hidden: true
        },
        {
          type: 'string',
          name: 'product_cd',
          label: true,
          header: i18next.t('label.product_cd'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'product_cd',
          label: true,
          header: i18next.t('label.product_cd'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'product_nm',
          label: true,
          header: i18next.t('label.product_nm'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'number',
          name: 'order_qty',
          label: true,
          header: i18next.t('label.order_qty'),
          record: {
            editable: false
          },
          width: 80
        },
        {
          type: 'number',
          name: 'picked_qty',
          label: true,
          header: i18next.t('label.picked_qty'),
          hidden: true,
          record: {
            editable: false
          },
          width: 80
        },
        {
          type: 'number',
          name: 'issued_qty',
          label: true,
          header: i18next.t('label.issued_qty'),
          record: {
            editable: false
          },
          width: 80
        },
        {
          type: 'number',
          name: 'scanned_qty',
          label: true,
          header: i18next.t('label.scanned_qty'),
          record: {
            editable: false
          },
          width: 80
        },
        {
          type: 'select',
          name: 'qty_unit',
          label: true,
          header: i18next.t('label.qty_unit'),
          record: {
            editable: false,
            options: this._uomSelectDatas
          },
          width: 80
        },
        {
          type: 'string',
          name: 'line_no',
          label: true,
          header: i18next.t('label.line_no'),
          record: {
            editable: false
          },
          width: 150
        },
        {
          type: 'string',
          name: 'status',
          label: true,
           hidden: true,
          header: i18next.t('label.status'),
          record: {
            editable: false
          },
          width: 150
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
      col_name: 'status',
      col_value: this.status_all_scaned,
      background_color: 'orange',
      font_color: 'black'
    }]

    if(rowColorConfig && rowColorConfig.length > 0) {
      this.gristConfigOrder.rows.classifier = (record, rowIndex) => {
        // 根据条件返回两个数组中的颜色，顺序为 [BACKGROUP_COLOR, FONT_COLOR]...
        for(let idx = 0 ; idx < rowColorConfig.length ; idx++) {
          let rowColorConf = rowColorConfig[idx]
          let recordValue = record[rowColorConf.col_name]
          if(recordValue == rowColorConf.col_value) {
            return {
              emphasized: [rowColorConf.background_color, rowColorConf.font_color]
            }
          }
        }
      }
    }
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

  /**
   * 获取拣货单列表
   */
  async getPickedOrderList() {
    // 初始化获取拣货单列表
    this._pickedOrderList = await ServiceUtil.restGet('procurement_orders/getTransferOrderList/byDate', {
      orderDate: this._releaseOrderDate,
      whCd: this._wcCd,
      toWhCd: this._toWhCd,
      giType : '00'
    })

    if (ValueUtil.isNotEmpty(this._pickedOrderList)) {
      this._orderInfo = this._pickedOrderList[0]
      this._orderId = this._pickedOrderList[0].procurement_order_no
    } else {
      this._orderInfo = {}
      this._orderId = ''
      this._pickedOrderList = []
    }

     this._pickOrderIdChange(this._orderId)
  }

  /**
   * 选择单据改变事件方法
   * @param val 
   */
  async _pickOrderIdChange(val: string) {
    this._oxInputBarCode.value = ''
    this._oxInputBarCode.renderRoot.querySelector('input')?.focus()
  }

  /**
   * 获取仓库列表
   */
  async getWarehouseList() {
    // 初始化获取仓库列表
    this._warehouseList = await ServiceUtil.restGet('warehouses/getWarehouseList', {})
  }

  /**
  * 获取客户列表
  */
  async getCustomerList() {
    // 初始化获取客户列表
    this._customerList = await ServiceUtil.restGet('customers/getCustomerList', {})
  }

  /**
    * Get UOM
    */
  async getUomSelectDatas() {
    this._uomSelectDatas = await ServiceUtil.getCodeSelectorData('QTY_UOM')
  }
}
