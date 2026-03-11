import '@things-factory/barcode-ui'
import { PropertyValues } from 'lit'
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
import { p13n } from '@operato/p13n'
import { css, html, LitElement } from 'lit-element'
import '@operato/input/ox-checkbox.js'
@customElement('pda-wms-peer-to-peer-popup')
export class WipSemiProductInboundPopup extends p13n(localize(i18next)(LitElement)) {
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
           button {
          font-size: 20px;
        }

               
    `
    ]
  }
  @query('#scan-ox-grist') private _scanGrist!: DataGrist
  @query('#order-ox-grist') private _orderGrist!: DataGrist
  @query(`#oxSelectWarehouse`) private _oxWarehouseSelect!: OxSelect
  @query('#oxSelectZone') private _oxZoneSelect!: OxSelect
  @query('#oxSelectLoc') private _oxLocSelect!: OxSelect
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
  // 移动仓库编码
  @state() protected _wcCdTo: string = ''
  // 仓库下拉列表框
  @state() protected _warehouseList: any[] = []

  // 移动库区编码
  @state() protected _zoneCdTo: string = ''
  // 库区下拉列表框
  @state() protected _zoneList: any[] = []

  // 移动库位编码
  @state() protected _locCdTo: string = ''
  // 库位下拉列表框
  @state() protected _locList: any[] = []


  // 日期
  @state() protected _releaseOrderDate: string = ''//OperatoUtil.getTodayStr()
  // 列表显示模式
  @state() private mode: string = 'CARD'
  @state() private modeOrder: 'CARD' | 'GRID' | 'LIST' = isMobileDevice() ? 'CARD' : 'GRID'
  @state() private gristConfig: any

  @state() private gristConfigOrder: any
  // 单位
  @state() private _uomSelectDatas: any[] = []
  // 查询库位详细信息
  @state() private _seacherLocationRecord: any = {}
  // 扫描发货列表
  @state() private _scanShipmentlList: any[] = []

  // 拣货单明细信息
  @state() private _showOrderList: any[] = []

  @property({ type: String }) itemId?: string
  @property({ type: Object }) params: any

  @property({ type: Boolean }) isDisabled = false
  // 源库位
  @property({ type: Object }) locCd: any
  // 条码
  @property({ type: Object }) barcode: any

  // 点对点模式
  @property({ type: Object }) peerModel: any


  
  get context() {
    return {
      title: i18next.t('menu.PdaWmsPeerToPeer'),
      help: 'operato-wes/pda-wms-peer-to-peer',
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
      <div class="pda-search-form">${this.getFromLocationHtml()}</div>
      <div class="pda-search-form">${this.getToLocationHtml()}</div>
   
       <div class="root_container">
         ${this.getScanHtml()} 
      </div>
      ${this.getButtonHtml()}
    `
  }

  /**
   * 检索区域
   * @returns
   */
  getFromLocationHtml() {
    return html`
     
        <label>
            <span><span style="color:red;"></span>${TermsUtil.tLabel('wh_cd')}</span>
                   <md-icon>edit</md-icon>
                </label>
                <input
                    .value=${this._seacherLocationRecord.wh_nm}
                    @input=${(e: Event) => this.locCd = (e.target as HTMLInputElement).value}
                    name="inputBoxNo"
                    readonly
                    id="idInputBoxNo"
                    placeholder="${TermsUtil.tLabel('box_id')}"
                ></input>

                <label>
            <span><span style="color:red;"></span>${TermsUtil.tLabel('zone_cd')}</span>
                   <md-icon>edit</md-icon>
                </label>
                <input
                    .value=${this._seacherLocationRecord.zone_nm}
                    @input=${(e: Event) => this.locCd = (e.target as HTMLInputElement).value}
                    name="inputBoxNo"
                    readonly
                    id="idInputBoxNo"
                    placeholder="${TermsUtil.tLabel('box_id')}"
                ></input>

<label>
            <span><span style="color:red;"></span>${TermsUtil.tLabel('loc_cd')}</span>
                   <md-icon>edit</md-icon>
                </label>
                <input
                    .value=${this.locCd}
                    @input=${(e: Event) => this.locCd = (e.target as HTMLInputElement).value}
                    name="inputBoxNo"
                    readonly
                    id="idInputBoxNo"
                    placeholder="${TermsUtil.tLabel('box_id')}"
                ></input>
       
    `
  }

  /**
   * 检索区域
   * @returns
   */
  getToLocationHtml() {
    return html`
     
      <!--仓库信息-->
        <label>${TermsUtil.tLabel('wh_cd')}</label>
        <ox-select
          id="oxSelectWarehouse"
          data-value
          placeholder=""
         .disabled=${this.isDisabled}
          .value=${this._wcCdTo}
          @change=${(e: Event) => {
        let newWhCd = (e.target as HTMLInputElement).value
        if (this._wcCdTo !== newWhCd) {
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

        <!--库区信息-->
        <label>${TermsUtil.tLabel('to_zone_cd')}</label>
        <ox-select
          id="oxSelectZone"
          data-value
          placeholder=""
          .value=${this._zoneCdTo}
          @change=${(e: Event) => {
        let newZoneCd = (e.target as HTMLInputElement).value
        if (this._zoneCdTo !== newZoneCd) {
          this._toZoneChange(newZoneCd)
        }
      }}
        >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._zoneList.map(
        item => html` <div option value=${item.zone_cd}>${item.zone_cd} (${item.zone_nm})</div> `
      )}
          </ox-popup-list>
        </ox-select>

         <!--库位信息-->
        <label>${TermsUtil.tLabel('to_loc_cd')}</label>
        <ox-select
          id="oxSelectloc"
          data-value
          placeholder=""
          .value=${this._locCdTo}
          @change=${(e: Event) => {
        this._locCdTo = (e.target as HTMLInputElement).value
      }}
        >
      <ox-popup-list with-search>
            <div option value=''></div> 
            ${this._locList.map(
        item => html` <div option value=${item.loc_cd}>${item.loc_cd}</div> `
      )}
          </ox-popup-list>
        </ox-select>

    `
  }

  /**
 * 入库申请列表
 * @returns
 */
  getButtonHtml() {

    return html`
       
        <div id="button-container" class="button-container">
          <button @click="${this.save.bind(this)}"><md-icon>save</md-icon>${i18next.t('button.process')}</button>
        </div>
      `
  }
  /**
   * 扫描区域
   * @returns
   */
  getScanHtml() {
    return html`

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

  async _toWarehouseChange(val: string) {
    let confirmOK = true

    let oldWhCdTo = this._wcCdTo

    if (confirmOK) {
      this._wcCdTo = val

      if (ValueUtil.isNotEmpty(this._warehouseList)) {
        let list = this._warehouseList.filter(x => x.wh_cd === this._wcCdTo)
        if (ValueUtil.isEmpty(list)) return

        // this._workOrderInfo = list[0]

        console.log(this.peerModel)

        // 设置扫描查询数据
    let queryData = {
      whCd: this._wcCdTo,
      model: this.peerModel
    }
        // 获取库区列表
        this._zoneList = await ServiceUtil.restGet(
          'workhomes/peer/getWarehouseZones',
          queryData
        )
        this._zoneCdTo = ''
        if (ValueUtil.isEmpty(this._zoneList)) {
          this._zoneList = []
          this._zoneCdTo = ''
        }
      } else {
        this._zoneList = []
        this._zoneCdTo = ''
      }

      this.requestUpdate()
    } else {
      this._wcCdTo = oldWhCdTo
    }
  }

  async _toZoneChange(val: string) {
    let confirmOK = true

    let oldZoneCdTo = this._zoneCdTo

    if (confirmOK) {
      this._zoneCdTo = val

      if (ValueUtil.isNotEmpty(this._zoneList)) {
        let list = this._zoneList.filter(x => x.zone_cd === this._zoneCdTo)
        if (ValueUtil.isEmpty(list)) return

        // 获取库位列表
        this._locList = []
        this._locCdTo = ''
        let queryData = {
          whCd: this._wcCdTo,
          model: this.peerModel,
          zoneCd:this._zoneCdTo
        }
        this._locList = await ServiceUtil.restGet(
          'workhomes/peer/getWarehouseLocations',
          queryData
        )

        if (ValueUtil.isEmpty(this._locList)) {
          this._locList = []
          this._locCdTo = ''
        }
      } else {
        this._locList = []
        this._locCdTo = ''
      }

      this.requestUpdate()
    } else {
      this._zoneCdTo = oldZoneCdTo
    }
  }


  async searchLocation4Peer() {

    // 设置扫描查询数据
    let qrCodeData = {
      whCd: 'whCd',
      zoneCd: 'this._orderId'
    }
    // 查询对应的拣货数据
    let searchReslutLst = await ServiceUtil.restGet(
      'workhomes/search/peer-to-peer/location/ready/multi/pda',
      qrCodeData
    )

    if (ValueUtil.isNotEmpty(searchReslutLst)) {

      for (let i = 0; i < searchReslutLst.length; i++) {

        await this._scanShipmentlList.push(searchReslutLst[i])
        await this._scanShipmentlList.reverse()
        // 重新加载扫描列表数据
        await this.updateResultGristData()
      }
    }

  }



  async searchLocation4PeerByLocCd() {

    // 设置扫描查询数据
    let qrCodeData = {
      locCd: this.locCd
    }
    // 查询对应的拣货数据
    this._seacherLocationRecord = await ServiceUtil.restGet(
      'workhomes/search/peer-to-peer/location/find/bycode',
      qrCodeData
    )

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
    let scanCd = e.target.value

    if (ValueUtil.isEmpty(scanCd)) {
      return
    }
    // 设置扫描查询数据
    let queruData = {
      whCd: this._seacherLocationRecord.wh_cd,
      scaLocCd: scanCd
    }
    // 查询对应的拣货数据
    let locationScan = await ServiceUtil.restGet(
      'workhomes/search/peer-to-peer/location/scan',
      queruData
    )

    if (ValueUtil.isEmpty(locationScan)) {
      this._oxInputBarCode.value = ''
      this._oxInputBarCode.renderRoot.querySelector('input')?.focus()
      return
    }

    this._locCdTo = locationScan.loc_cd
    this._oxInputBarCode.value = ''
    this._oxInputBarCode.renderRoot.querySelector('input')?.focus()

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

    this._oxScamBarcode.value = '';

    this._oxWarehouseSelect.value = ''

    this._oxOrderNoSelect.value = ''
    this._wcCdTo = ''

    this._releaseOrderDate = ''
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
    if (ValueUtil.isEmpty(this._locCdTo)) {
      await UiUtil.showAlertPopup(
        'title.error',
        TermsUtil.tText('SHOULD_NOT_BE_EMPTY', { value: TermsUtil.tLabel('to_loc_cd') }),
        'error',
        'confirm',
        ''
      )
      return
    }

    // 发货数据是否为空判断
    if (ValueUtil.isEmpty(this._locCdTo)) {
      await UiUtil.showAlertPopup('title.error', TermsUtil.tText('No Data'), 'error', 'confirm', '')
      return
    }

    let peerToPeerLocation  = {
      loc_cd : this.locCd,
      to_loc_cd : this._locCdTo,
      barcode:this.barcode,
      peer_model:this.peerModel
    }

    await ServiceUtil.restPost(
      'workhomes/peer-to-peer/start',
      peerToPeerLocation,
      'button.save',
      'text.are_you_sure',
      (e: any) => {
       
        UiUtil.closePopupBy(this)
        // // 重新获取统计明细
        // this._totalOnloadMaterialGrist.fetch()
      },
      (e: any) => {
        // 出错操作
      }
    )
  }

  /**
   * 列表数据更新
   * @param param0
   * @returns
   */
  async updateResultGristData() {
    // this._scanGrist.data = {
    //   total: this._scanShipmentlList ? this._scanShipmentlList.length : 0,
    //   records: this._scanShipmentlList ? this._scanShipmentlList : []
    // }
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
    this._scanShipmentlList = []
    this._showOrderList = []
  }

  /**
 * Page Init exec
 * @param lifecycle
 */
  async connectedCallback() {
    super.connectedCallback()

    await this.searchLocation4PeerByLocCd()

    await this.getWarehouseList()
    this._wcCdTo = this._seacherLocationRecord.wh_cd;
    await this._toWarehouseChange(this._seacherLocationRecord.wh_cd)
    this.getScanGristConfig()

  }

  /**
   * 扫描发货列表Grist配置
   */
  async getScanGristConfig() {
    this.gristConfig = {
      pagination: { infinite: true },
      list: {
        fields: ['loc_cd', 'zone_cd', 'wh_cd', 'loc_type', 'restrict_type', 'completely_fill_flag'],
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
          name: 'wh_cd',
          header: i18next.t('label.gi_line_no'),
          hidden: true
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
          name: 'loc_type',
          label: true,
          header: i18next.t('label.loc_type'),
          record: {
            editable: false
          },
          width: 200
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
   * 获取仓库列表
   */
  async getWarehouseList() {
    // 初始化获取仓库列表
    this._warehouseList = await ServiceUtil.restGet('workhomes/getWarehouseList', {})
  }


}



