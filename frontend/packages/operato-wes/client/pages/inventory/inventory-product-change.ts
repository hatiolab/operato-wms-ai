import '@things-factory/barcode-ui'

import { PropertyValues, html, css } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, ValueUtil, TermsUtil, UiUtil, MetaApi, OperatoUtil, PrintUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { i18next, localize } from '@operato/i18n'
import { CommonButtonStyles, CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

import { DataGrist, FetchOption } from '@operato/data-grist'

import { isMobileDevice } from '@operato/utils'
import { OxSelect } from '@operato/input'
import { PdaCommonStyles } from '../styles/pda-common-styles'

@customElement('inventory-product-change')
export class InventoryProductChange extends connect(store)(PageView) {
  static get styles() {
    return [
      CommonGristStyles,
      CommonHeaderStyles,
      PdaCommonStyles,
      css`
        .hidden {
          display: none;
        }
        .visible {
          display: block;
        }
       .container {
        display: flex;
        gap: 20px;
        background: #f5f7fa;
        border-radius: 8px;
        padding: 20px;
        font-family: Arial, sans-serif;
      }

      .column {
        flex: 1;
        text-align: center;
        padding: 15px;
        background: white;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .label {
        color: #666;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .value {
        color: #2c7be5;
        font-size: 24px;
        font-weight: bold;
      }
      `
    ]
  }
  @query('#scan-ox-grist') protected _scanGrist!: DataGrist

  @query(`#oxSelectWarehouse`) private _oxWarehouseSelect!: OxSelect
  @query('#oxSelectLotNo') private _oxLotNoSelect!: OxSelect
  @query('#oxSelectProduct') private _oxProductSelect!: OxSelect
  @query('#oxSelectOrderNo') private _oxOrderNoSelect!: OxSelect


  // 当前选择的TabId = 默认Tab编辑显示
  @state() protected currentTabKey: string = 'scanTab'

  // 是否显示仓库
  @state() protected _isWarehouseShow: boolean = false
  // 仓库编码
  @state() protected _wcId: string = ''
  // 仓库下拉列表框
  @state() protected _warehouseList: any[] = []

  // 是否显示批次
  @state() protected _isLotShow: boolean = true
  // 批次ID
  @state() protected _lotNo: string = ''
  // 批次下拉列表框
  @state() protected _lotNoList: any[] = []

  // 是否显示供应商
  @state() protected _isProductShow: boolean = true
  // 产品ID
  @state() protected _replaceProductId: string = ''

  // 规格形态
  @state() protected _specMaterialRawCate: string = ''
  @state() protected _specShape: string = ''
  @state() protected _productColor: string = ''
  @state() protected _productAttr: string = ''
  @state() protected _finishedProductGranule: string = ''
  @state() protected _produceCd: string = ''
  // 客户下拉列表框
  @state() protected _productList: any[] = []

  // 是否显示日期控件
  @state() protected _isProcessDateShow: boolean = true
  // 工单
  @state() protected _processWoValue: string = ''

  // 仓库术语
  @state() protected _warehouseTermTitle: string = 'wh_cd'

  // 单据结果列表
  @state() protected _resultOrderList: any[] = []

  // 处理URL&参数
  @state() protected _processUrl: string = ''

  // 是否显示库位
  @state() protected _isSHowScanLocControl: boolean = false

  // 订单号术语
  @state() protected _scanTermTitle: string = 'lpn'

  // 列表显示模式
  @state() private mode: string = 'GRID'
  @state() private modeOrder: 'CARD' | 'GRID' | 'LIST' = isMobileDevice() ? 'CARD' : 'GRID'
  @state() protected gristConfig: any

  @state() protected gristConfigOrder: any
  // 单位
  @state() protected _uomSelectDatas: any[] = []

  // 扫描发货列表
  @state() protected _scanItemList: any[] = []

  @property({ type: String }) itemId?: string
  @property({ type: Object }) params: any

  render() {
    return html`
     
      <div class="pda-search-form">
      ${this.getWoDataHtml()}
      ${this._isWarehouseShow ? this.getWarehouseSelectHtml() : this.getEmptyHtml()}
      ${this._isLotShow ? this.getLotNoSelectHtml() : this.getEmptyHtml()}

      </div>
     
      <div class="pda-search-form">
         ${this._isProductShow ? this.getReplaceProductHtml() : this.getEmptyHtml()}
      </div>
      
       <div class="root_container">
     

       ${this.getScanHtml()} 
  
       </div>
    `
  }

  /**
  * 空元素
  * @returns
  */
  getEmptyHtml() {
    return html``
  }

  /**
   * 仓库检索区域
   * @returns
   */
  getWarehouseSelectHtml() {
    return html`
     
      <!--仓库信息-->
        <label>${TermsUtil.tLabel(this._warehouseTermTitle)}</label>
        <ox-select
          id="oxSelectWarehouse"
          data-value
          placeholder=""
          .value=${this._wcId}
          @change=${(e: Event) => {
        this._wcId = (e.target as HTMLInputElement).value
      }}
        >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._warehouseList.map(
        item => html` <div option value=${item.id}>${item.name} (${item.description})</div> `
      )}
          </ox-popup-list>
        </ox-select>
    `
  }

  /**
   * 批次检索区域
   * @returns
   */
  getLotNoSelectHtml() {
    return html`
     
      <!--批次信息-->
        <label>${TermsUtil.tLabel('lot_no')}<span style="color:red;">*</span></label>
        <ox-select
          id="oxSelectLotNo"
          data-value
          placeholder=""
          .value=${this._lotNo}
      
          @change=${(e: Event) => {
        let newLotNo = (e.target as HTMLInputElement).value

        if (this._lotNo !== newLotNo) {
          this._lotNoChange(newLotNo)
        }
        this._lotNo = (e.target as HTMLInputElement).value
      }}

            >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._lotNoList.map(
        item => html` <div option value=${item.lot_no}>${item.lot_no}</div> `
      )}
          </ox-popup-list>
        </ox-select>
        
    `
  }

  /**
   * 工单信息
   * @returns
   */
  getWoDataHtml() {
    return html`
     <label>${TermsUtil.tLabel('work_order_id')}</label>
        <input
         id="workOrderNo"
         name="workOrderNo"
          type="text"
          .value=${this._processWoValue}
          
          @keydown=${e => {
        this.scanWorkOrder(e)
      }}

        />`
  }

  /**
   * 替换产品检索区域
   * @returns
   */
  getReplaceProductHtml() {
    return html`
     
      <!--替换产品信息-->
        <label>${TermsUtil.tLabel('replacement_products')}<span style="color:red;">*</span></label>
        <ox-select
          id="oxSelectProduct"
          data-value
          placeholder=""
          .value=${this._replaceProductId}
          @change=${(e: Event) => {
        this._replaceProductId = (e.target as HTMLInputElement).value
        this._productChange(this._replaceProductId)

      }}
        >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._productList.map(
        item => html` <div option value=${item.id}>${item.product_cd} (${item.product_nm})</div> `
      )}
        </ox-popup-list>
        </ox-select>
    `
  }

  /**
   * 修改属性区域
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
       
           ${this.getReplaceProductAtrtHtml()}
        </div>
        ${this.getListHtml()}
      </div>
    `
  }

  /**
  * 产品替换属性显示
  * @returns
  */
  getReplaceProductAtrtHtml() {
    return html`
    <label>
      <span>${TermsUtil.tLabel('spec_material_raw_cate')}</span>
      
          </label>
          <input
            name="spec_material_raw_cate"
            id="spec_material_raw_cate"
            disabled
            placeholder="${TermsUtil.tLabel('spec_material_raw_cate')}"
            value ="${this._specMaterialRawCate}"
          ></ox-input-barcode>

            <label>
      <span>${TermsUtil.tLabel('spec_shape')}</span>
           
          </label>
          <input
            name="spec_shape"
            id="spec_shape"
            disabled
            value ="${this._specShape}"
            placeholder="${TermsUtil.tLabel('spec_shape')}"
          ></ox-input-barcode>

                     <label>
      <span>${TermsUtil.tLabel('product_color')}</span>
           
          </label>
          <input
            name="product_color"
            id="product_color"
             value ="${this._productColor}"
            placeholder="${TermsUtil.tLabel('product_color')}"
          ></ox-input-barcode>

          <label>
      <span>${TermsUtil.tLabel('finished_product_granule_spec6')}</span>
           
          </label>
          <input
            name="finished_product_granule"
            id="finished_product_granule"
            disabled
            value ="${this._finishedProductGranule}"
            placeholder="${TermsUtil.tLabel('finished_product_granule_spec6')}"
          ></ox-input-barcode>

          <label>
      <span><span style="color:red;">*</span>${TermsUtil.tLabel('product_attribute')}</span>
            
          </label>
          <input
            name="product_attribute"
            id="product_attribute"
            disabled
            value ="${this._productAttr}"
            placeholder="${TermsUtil.tLabel('product_attribute')}"
          ></ox-input-barcode>

          <label>
      <span><span style="color:red;">*</span>${TermsUtil.tLabel('produce_cd')}</span>
            
          </label>
          <input
            name="produce_cd"
            id="produce_cd"
            value ="${this._produceCd}"
            placeholder="${TermsUtil.tLabel('produce_cd')}"
          ></ox-input-barcode>
          `
  }


  /**
   * 产品批次对应库存列表
   * @returns
   */
  getListHtml() {
    const mode = this.mode || (isMobileDevice() ? 'CARD' : 'CARD')

    return html`
      <ox-grist id="scan-ox-grist" .mode=${mode} .config=${this.gristConfig}> </ox-grist>
    `
  }


  get context() {
    return {
      title: i18next.t('menu.InventoryProductChange'),
      actions: [
        {
          title: i18next.t('button.reset'),
          action: this.reset.bind(this),
          ...CommonButtonStyles.clear
        },
        {
          title: i18next.t('button.confirm'),
          action: this.save.bind(this),
          ...CommonButtonStyles.save
        }
        ,
        {
          title: i18next.t('button.print'),
          action: this.print.bind(this),
          ...CommonButtonStyles.print
        }
      ]
    }
  }

  /**
   * 打印处理
   */
  async print() {

    if (ValueUtil.isEmpty(this._scanGrist.selected)) {
      await UiUtil.showAlertPopup('title.error', TermsUtil.tText('select_item'), 'error', 'confirm', '')
      return
    }

    // 批次不能为空
    if (ValueUtil.isEmpty(this._lotNo)) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('lot_no') }),
        'error',
        'confirm',
        ''
      )

      return
    }

    // 判断是否查询到库存
    if (this._scanItemList.length == 0) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('No Data', {}),
        'error',
        'confirm',
        ''
      )
      return
    }


    let confirm = await UiUtil.showAlertPopup('button.print', 'text.are_you_sure', 'question', 'confirm', 'cancel')

    if (confirm) {
      let pdfUrl = 'stock_work/print_labels?'

      this._scanGrist.selected.forEach(f => {
        pdfUrl += `inventoryIds=${f.id}&`
      })

      await PrintUtil.ghostPrintPdf(pdfUrl, null)

    }
  }

  /**
  * 选择批次发送变化
  * 
  * @param val 
  */
  async _lotNoChange(val: string) {

    this._scanItemList = []
    // 重新加载投料列表数据
    this.updateResultGristData()

    let searchData = {
      lot_no: val,
    }

    await ServiceUtil.restPost(
      'stock_work/inventory/change/search/inventory/lotno',
      searchData,
      '',
      '',
      (e: any) => {

        for (let i = 0; i < e.length; i++) {

          let rowData = {
            id: e[i].id,
            product_id: e[i].product_id,
            product_cd: e[i].product.product_cd,
            product_nm: e[i].product.product_nm,
            barcode: e[i].barcode,
            lot_no: e[i].lot_no,
            bag_no: e[i].bag_no,
            produce_cd: e[i].produce_cd,
            product_attribute: e[i].product_attribute,
            inv_qty: e[i].inv_qty,
            qty_unit: e[i].qty_unit ? e[i].qty_unit : ''
          }

          this._produceCd = e[i].produce_cd
          // 将结果添加到对应的列表中
          this._scanItemList.push(rowData)
          this._scanItemList.reverse()

        }


        // 重新加载投料列表数据
        this.updateResultGristData()
      },
      (e: any) => {
        // 出错操作
        // LPN输入框
        // this.setFocus(true)
      }
    )
  }

  /**
  * 保存列表数据
  */
  async save() {

    // 批次不能为空
    if (ValueUtil.isEmpty(this._replaceProductId)) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('replacement_products') }),
        'error',
        'confirm',
        ''
      )

      return
    }

    // 产品属性
    let priductAttr = this.findFormInput('product_attribute').value
    if (ValueUtil.isEmpty(priductAttr)) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('product_attribute') }),
        'error',
        'confirm',
        ''
      )
      return
    }


    // 出品编码
     let produceCd = this.findFormInput('produce_cd').value
    if (ValueUtil.isEmpty(produceCd)) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('produce_cd') }),
        'error',
        'confirm',
        ''
      )
      return
    }


    if (ValueUtil.isEmpty(this._scanGrist.selected)) {
      await UiUtil.showAlertPopup('title.error', TermsUtil.tText('select_item'), 'error', 'confirm', '')
      return
    }

    // 判断选择的库存和改之前的库存是否一致

    for (let i = 0; i < this._scanGrist.selected.length; i++) {

      let inventoryTmp = this._scanGrist.selected[i]
      // 不允许产品ID一样
      if (ValueUtil.isEquals(inventoryTmp.product_id, this._replaceProductId)) {
        await UiUtil.showAlertPopup(
          'title.error',
          TermsUtil.tText('product_select_same', { value: inventoryTmp.barcode}),
          'error',
          'confirm',
          ''
        )
        this._replaceProductId = ''
        return
      }

    }


    // 扫描列表数据是否为空判断
    if (ValueUtil.isEmpty(this._scanItemList)) {
      await UiUtil.showAlertPopup('title.error', TermsUtil.tText('No Data'), 'error', 'confirm', '')
      return
    }

    // 提交数据
    let submitData = {
      work_order_id: this.findFormInput('workOrderNo').value,
      product_attr: this._productAttr,
      produce_cd: this.findFormInput('produce_cd').value,
      replace_product_id: this._replaceProductId,
      lot_no: this._lotNo,
      inventorys: this._scanGrist.selected
    }

    await ServiceUtil.restPost(
      'stock_work/inventory/change/save',
      submitData,
      'button.save',
      'text.are_you_sure',
      (e: any) => {
        // 成功后执行操作,
        this._scanItemList = []
        // 重新加载投料列表数据
        this.updateResultGristData()

        for (let i = 0; i < e.result.length; i++) {

          let rowData = {
            id: e.result[i].id,
            product_id: e.result[i].product_id,
            product_cd: e.result[i].product.product_cd,
            product_nm: e.result[i].product.product_nm,
            barcode: e.result[i].barcode,
            lot_no: e.result[i].lot_no,
            bag_no: e.result[i].bag_no,
            produce_cd: e.result[i].produce_cd,
            product_attribute: e.result[i].product_attribute,
            inv_qty: e.result[i].inv_qty,
            qty_unit: e.result[i].qty_unit ? e.result[i].qty_unit : ''
          }

          // 将结果添加到对应的列表中
          this._scanItemList.push(rowData)
          this._scanItemList.reverse()

        }

        // 重新加载投料列表数据
        this.updateResultGristData()


      },
      (e: any) => {
        // 出错操作
        // this.setFocus(true)
      }
    )
  }

  /**
  * 输入工单后回车
  * @param e
  */
  async scanWorkOrder(e) {
    // 判断是否按下回车键
    if (!ValueUtil.isEquals('Enter', e.key)) {
      return
    }

    // 取得输入值
    let valueStr = e.target.value
    // 判断是否输入
    if (ValueUtil.isEmpty(valueStr)) {
      return
    }


    let woNo = this.findFormInput('workOrderNo').value


    // 设置扫描查询数据
    let qrCodeData = {
      woNo: woNo
    }

    // 查询对应的拣货数据
    this._lotNoList = await ServiceUtil.restGet(
      'stock_work/inventory/change/search/lot/bywo',
      qrCodeData
    )

  }
 
  /**
 * @description Find search form input element
 ***********************************************
 * @param elementName input element name
 */
  findFormInput(elementName) {
    let val = this.renderRoot.querySelector(`input[name=${elementName}]`) as HTMLInputElement; // 添加 as HTMLInputElement
    return val;

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
  * 保存列表数据
  */
  async reset() {

    // 情况检索部
    this.reset_search_form()
    // 清空表格
    this.reset_grist()
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

    // 仓库列表
    if (this._oxWarehouseSelect) {
      this._oxWarehouseSelect.value = ''
    }
    // 客户列表
    if (this._oxLotNoSelect) {
      this._oxLotNoSelect.value = ''
    }
    // 供应商列表
    if (this._oxProductSelect) {
      this._oxProductSelect.value = ''
    }
    // 订单号列表
    if (this._oxOrderNoSelect) {
      this._oxOrderNoSelect.value = ''
    }
    this._wcId = ''
    this._lotNo = ''
    this._replaceProductId = ''
    this._processWoValue = ''
    this.findFormInput('workOrderNo').value = ''
    this._resultOrderList = []

    this._specMaterialRawCate = ''
    this._specShape = ''
    this._productColor = ''
    this._productAttr = ''
    this._finishedProductGranule = ''
    this._produceCd = ''

    this.findFormInput('workOrderNo').focus()
  }


  /**
   * 列表数据更新
   * @returns
   */
  async clearResultGristData() {

    if (this._scanGrist) {
      this._scanGrist.data = {
        total: 0,
        records: []
      }
    }

    this._scanItemList = []

  }

  /**
   * Page Init
   * @param lifecycle
   */
  async pageInitialized(lifecycle: any) {

    // 仓库显示的时候查询仓库信息
    if (this._isWarehouseShow) {
      this.getWarehouseList()
    }

    // 客户显示的时候查询客户信息
    if (this._isLotShow) {
      this.getLotNoList()
      this.getProductList()
    }

    // 供应商显示的时候查询供应商信息
    if (this._isProductShow) {
      this.getProductList()
    }

    this.getScanGristConfig()

    this.requestUpdate()
  }

  /**
   * @description Check data duplicated
   ***********************************
   * @param records original grid data
   * @param item new scanned data
   */
  checkDataDuplicated(records, item, termNm, termVal) {
    if (records.length == 0) {
      return item
    } else {
      let duplicatedItem = records.find(r => r.id == item.id)
      if (duplicatedItem) {
        UiUtil.showToast('info', TermsUtil.tText('ALREADY_SCANNED', { value1: termNm, value2: termVal }))
        return null
      } else {
        return item
      }
    }

  }

  /**
   * 选择产品时候
   * @param val 
   */
  async _productChange(val: string) {

    // 清空当前产品情报区域
    this._specMaterialRawCate = ''
    this._specShape = ''
    this._productColor = ''
    this._productAttr = ''
    this._finishedProductGranule = ''

    if (ValueUtil.isEmpty(val)) {
      
      return
    }

    // 批次不能为空
    if (ValueUtil.isEmpty(this._lotNo)) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('lot_no') }),
        'error',
        'confirm',
        ''
      )
      this._replaceProductId = ''
      this.findFormInput('workOrderNo').focus()
      return
    }

    // 判断是否查询到库存
    if (this._scanItemList.length == 0) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('No Data', {}),
        'error',
        'confirm',
        ''
      )
      this._replaceProductId = ''
      this.findFormInput('workOrderNo').focus()
      return
    }


    let productInfo = await ServiceUtil.restGet('stock_work/inventory/change/search/product/id', { productId: this._replaceProductId, lotNo: this._lotNo })

    if (ValueUtil.isNotEmpty(productInfo)) {
      // 材料
      this._specMaterialRawCate = productInfo.product_spec
      this._specShape = productInfo.product_spec2
      this._productColor = productInfo.product_color
      this._productAttr = productInfo.product_attribute
      this._finishedProductGranule = productInfo.product_spec6

      return;
    }
  }

  /**
 * @description Check data duplicated
 ***********************************
 * @param records original grid data
 * @param item new scanned data
 */
  checkDataDuplicated4Loc(records, item, termNm, termVal) {
    if (records.length == 0) {
      return item
    } else {
      let duplicatedItem = records.find(r => r.received_loc_cd == item)
      if (duplicatedItem) {
        UiUtil.showToast('info', TermsUtil.tText('ALREADY_SCANNED', { value1: termNm, value2: termVal }))
        return null
      } else {
        return item
      }
    }

  }


  /**
   * 选择单据改变事件方法
   * @param val 
   */
  async _orderIdChange(val: string) {

  }

  /**
   * 获取仓库列表
   */
  protected async getWarehouseList() {
    // 初始化获取仓库列表
    // this._warehouseList = await WmsBaseDataUtil.getWarehousAllList();
  }

  /**
  * 获取客户列表
  */
  async getLotNoList() {
    // 初始化获取客户列表
    // this._LotNoList = await WmsBaseDataUtil.getLotNosAllList();
  }

  /**
  * 获取供应商列表
  */
  async getProductList() {
    // 初始化获取客户列表
    // 查询对应的拣货数据
    this._productList = await ServiceUtil.restGet(
      'stock_work/inventory/change/search/productlst',
      null
    )
  }

  /**
   * 列表数据更新
   * @param param0
   * @returns
   */
  async updateResultGristData() {
    this._scanGrist.data = {
      total: this._scanItemList ? this._scanItemList.length : 0,
      records: this._scanItemList ? this._scanItemList : []
    }
  }

  /**
  * 列表Grist配置
  */
  async getScanGristConfig() {
    this.gristConfig = {

      pagination: { infinite: true },

      list: {
        fields: ['barcode', 'product_cd', 'product_nm', 'lot_no', 'inv_qty', 'qty_unit', 'bag_no','product_attribute','produce_cd'],
        details: []
      },
      columns: [
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        { type: 'gutter', gutterName: 'sequence' },
        {
          type: 'string',
          name: 'id',
          header: i18next.t('label.id'),
          hidden: true
        },
        {
          type: 'string',
          name: 'gi_line_no',
          header: i18next.t('label.gi_line_no'),
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
        }, {
          type: 'string',
          name: 'bag_no',
          label: true,
          header: i18next.t('label.bag_no'),
          record: {
            editable: false
          },
          width: 150
        }, {
          type: 'string',
          name: 'product_attribute',
          label: true,
          header: i18next.t('label.product_attribute'),
          record: {
            editable: false
          },
          width: 150
        }, {
          type: 'string',
          name: 'produce_cd',
          label: true,
          header: i18next.t('label.produce_cd'),
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
  }
}
