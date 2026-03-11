import '@material/web/button/elevated-button.js'

import { css, html } from 'lit-element'
import { ButtonContainerStyles, ScrollbarStyles } from '@operato/styles'
import { store } from '@operato/shell'

import '@things-factory/import-ui-excel'
import { IMPORT } from '@things-factory/import-base'

import { RestServiceMixin } from './rest-service-mixin'

import { TermsUtil } from '../utils/terms-util'
import { ServiceUtil } from '../utils/service-util'
import { MetaApi } from '../utils/meta-api'
import { MetaUiUtil } from '../utils/meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 기반 임포트 기능 동작 믹스인
 */
export const MetaImportMixin = superClass =>
  class extends RestServiceMixin(superClass) {
    /**
     * @description 프로퍼티
     ****************************
     */
    static get properties() {
      return {
        importHandler: Object,
        config: Object,
        records: Array,
        parent_id: String
      }
    }

    /**
     * @description 스타일
     ****************************
     */
    static get styles() {
      let styles = [
        ButtonContainerStyles,
        ScrollbarStyles,
        css`
          :host {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-color: white;
          }

          .grist {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow-y: auto;
          }

          ox-grist {
            overflow-y: hidden;
            flex: 1;
          }

          h2 {
            padding: var(--subtitle-padding);
            font: var(--subtitle-font);
            color: var(--subtitle-text-color);
            border-bottom: var(--subtitle-border-bottom);
          }
        `
      ]

      // 버튼 콘테이너 스타일 추가 (팝업으로 로드시 사용)  
      styles.push(...MetaUiUtil.getPopupButtonContainerStyles())

      return styles
    }

    /**
     * @description lifecycle - connectedCallback
     **********************************************
     */
    async connectedCallback() {
      let menuMeta = await MetaApi.getMenuMeta(this)
      this.menu = menuMeta.menu
      let gridConfig = menuMeta.grid_config
      this.config = this.createGristConfig(gridConfig)
      this.set_parent_id(this.parent_id)

      if(menuMeta.actions && menuMeta.actions.length > 0){
        menuMeta.actions.forEach(x=>{
          if(x.name == 'template') {
            this.templateId = x.logic
          }
        })
      }

      if (super.connectedCallback) {
        await super.connectedCallback()
      }
    }

    /**
     * @description lifecycle render
     *********************************
     * @returns {Object} html
     */
    render() {
      return html`
        <div class="grist">
          <ox-grist .mode=${MetaApi.isMobileEnv() ? 'LIST' : 'GRID'} .config=${this.config}></ox-grist>
        </div>

        <div footer>
          ${this.templateId
            ? html`
                <button
                  @click=${async () => {
                    this.downloadTemplate()
                  }}
                >
                  <md-icon>cloud_download</md-icon>
                  <span>${TermsUtil.tButton('download_template')}</span>
                </button>
              `
            : html``}
          <button
            @click=${async () => {
              this.importXlsxFile()
            }}
          >
            <md-icon>cloud_upload</md-icon>
            <span>${TermsUtil.tButton('import')}</span>
          </button>
          <button ok
            @click=${async () => {
              this.saveData()
            }}
          >
            <md-icon>save</md-icon>
            <span>${TermsUtil.tButton('save')}</span>
          </button>
          <button @click=${e => history.back()}><md-icon>cancel</md-icon><span>${TermsUtil.tButton('cancel')}</span></button>
        </div>
      `
    }

    /**
     * @description lifecycle firstUpdated
     **************************************
     */
    firstUpdated() {
      this.dataGrist.data = {
        records: this.records ? this.records : [],
        total: this.records ? this.records.length : 0
      }
    }

    /**
     * @description 부모 객체에서 parent_id 변경시 resourceUrl, saveUrl을 갱신하고 재조회한다.
     *********************************
     * @param {String} newVal
     */
    set_parent_id(newVal) {
      if (newVal) {
        this.parent_id = newVal

        if (this.menu.resource_url) {
          this.resource_url = this.menu.resource_url.replace(':id', this.parent_id)
        }

        if (this.menu.save_url) {
          this.save_url = this.menu.save_url.replace(':id', this.parent_id)
        }
      }
    }

    /**
     * @description 데이터 그리스트 리턴
     ********************************
     * @returns {Object}
     */
    get dataGrist() {
      return this.renderRoot.querySelector('ox-grist')
    }

    /**
     * @description 현재 선택 레코드 리스트
     *************************************
     * @returns {Array} 현재 선택 레코드 리스트
     */
    getCurrentRecord() {
      let selectedRecords = this.dataGrist.selected
      const reg = /__\w+__/

      return selectedRecords.map(record => {
        const tempRecord = { cud_flag_: 'c' }
        for (let key in record) {
          if (!reg.test(key)) {
            tempRecord[key] = record[key]
          }
        }

        return tempRecord
      })
    }

    /**
     * @description 템플릿 다운로드 URL로 사용
     *************************************
     * @returns {String}
     */
    get resourceUrl() {
      return this.resource_url
    }

    /**
     * @description 저장 URL
     ***********************
     * @returns {String}
     */
    get saveUrl() {
      return this.save_url
    }

    /**
     * @description 그리스트 설정 생성
     ******************************
     * @param {Array} columns
     */
    createGristConfig(columns) {
      // 그리스트 설정 리턴
      return {
        pagination: { infinite: true },
        rows: {
          selectable: { multiple: true },
          appendable: false,
          handlers: { click: 'select-row-toggle' }
        },
        sorters: [],
        columns: [
          { type: 'gutter', gutterName: 'dirty' },
          { type: 'gutter', gutterName: 'sequence' },
          { type: 'gutter', gutterName: 'row-selector', multiple: true },
          ...columns
        ]
      }
    }

    /**
     * @description 임포트 데이터 저장 처리
     **********************************
     */
    async saveData() {
      const patches = this.getCurrentRecord()
      if (patches && patches.length > 0) {
        const answer = await MetaApi.showAlertPopup('label.import', 'text.are_you_sure', 'question', 'import', 'cancel')
        if (answer || answer.value) {
          let result = await MetaApi.updateMultiple(this.save_url, patches)
          if (result) {
            history.back()
          }
        }
      } else {
        MetaApi.showAlertPopup('text.nothing_selected', 'text.there_is_nothing_to_save', 'info', 'confirm')
        history.back()
      }
    }

    /**
     * @description 템플릿 파일 다운로드
     ********************************
     */
    async downloadTemplate() {
      const tempalteId = this.templateId
      ServiceUtil.templateFileDownload(tempalteId)
    }

    /**
     * @description 임포트 대상 엑셀 파일 선택 완료시
     ******************************************
     */
    async importXlsxFile() {
      let _self = this
      const fileTypes = ['xlsx']
      const fileUpload = document.createElement('input')
      fileUpload.setAttribute('type', 'file')
      fileUpload.setAttribute('accept', fileTypes)
      fileUpload.hidden = true

      fileUpload.addEventListener('change', event => {
        // 임포트 대상 엑셀 파일 읽기 준비
        const fileObj = event.currentTarget.files[0]
        const extension = fileObj.name.split('.').pop()
        const reader = new FileReader()

        // 파일 선택 후에 데이터 파싱까지 완료된 이후
        reader.onload = function (e) {
          const data = e.target.result
          store.dispatch({
            type: IMPORT,
            importable: {
              extension,
              handler: _self.updateGridData.bind(_self)
            },
            data
          })
        }

        // 엑셀 파일 읽기
        reader.readAsArrayBuffer(fileObj)
      })

      document.body.appendChild(fileUpload)
      fileUpload.click()
    }

    /**
     * @description 엑셀 임포트 처리
     *****************************
     * @param {Array} records
     */
    updateGridData(records) {
      let importData = records.header ? records.data : records
      if (importData && importData.length > 0) {
        this.records = importData
        this.records.forEach(i => {
          i.__selected__ = true
        })
        this.dataGrist.data = {
          records: this.records,
          total: this.records.length
        }
      } else {
        MetaApi.showAlertPopup('text.nothing_selected', 'text.there_is_nothing_to_save', 'info', 'confirm')
      }
    }
  }
