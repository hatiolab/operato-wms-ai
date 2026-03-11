import { css, html, nothing } from 'lit-element'

import { MetaSetMixin } from './meta-set-mixin'
import { MetaUiUtil } from '../utils/meta-ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 기반 PDA 리스트 믹스 인
 */
export const MetaPdaListMixin = superClass => class extends MetaSetMixin(superClass) {
  /**
   * @description 리스트 스타일
   ****************************
   */
  static getListStyle() {
    return [
      css`
        ox-grist {
          overflow-y: auto;
          flex: 1;
        }
      `
    ]
  }

  /**
   * @override
   **************
   */
  disconnectedCallback() {
    if(super.disconnectedCallback) {
      super.disconnectedCallback()
    }

    let eventName = `${this.menu.id}-griddata-update-event`
    document.removeEventListener(eventName, this.updateGridRecord.bind(this))
  }

  /**
   * @description 그리드 구성을 위해 메뉴 메타 정보로 부터 그리드 설정 생성
   ************************************************************
   */
  createGristConfig() {
    // 그리드 멀티 선택 옵션 설정
    let paramMultiSelect = this.menuParamValue('grid_multiple_select')
    let gridMultipleSelect = paramMultiSelect ? paramMultiSelect === 'true' : true

    // 페이지 사용 여부에 따라 그리드 내 페이지네이션 설정
    let pagination = { pages: [50, 100, 500, 1000] }
    let paramPagination = this.menuParamValue('pagination')

    // 페이지 사용 안 함
    if (this.menu.use_pagination == false) {
      pagination = { infinite: true }

    // 페이지 옵션이 menu_param에 설정됨
    } else if (paramPagination) {
      let pagesInts = paramPagination.split(',').map(page => {
        return parseInt(page)
      })
      pagination = { pages: pagesInts }
    }

    // 모바일 (CARD, LIST) 형식인 경우 표시할 필드 리스트
    let listFields = [this.menu.title_field, this.menu.desc_field]
    let paramListFields = this.menuParamValue('grid-list-fields', '[]')
    let paramListFieldsArr = JSON.parse(paramListFields)
    if (paramListFieldsArr.length > 0) {
      listFields = paramListFieldsArr
    }

    // 그리스트 설정 생성
    let gristConf = {
      list: {
        fields: listFields
      },
      pagination: pagination,
      rows: {
        selectable: { multiple: gridMultipleSelect },
        appendable: this.use_add_button,
        handlers: { click: 'select-row-toggle' }
      },
      sorters: [...this.sort_fields],
      columns: [
        { type: 'gutter', gutterName: 'dirty' },
        { type: 'gutter', gutterName: 'sequence' },
        { type: 'gutter', gutterName: 'row-selector', multiple: gridMultipleSelect }
      ]
    }

    // 그리드 업데이트 이벤트 구독
    let gridDataUpdateEventName = `${this.menu.id}-griddata-update-event`
    document.addEventListener(gridDataUpdateEventName, this.updateGridRecord.bind(this))

    // 그리드 행 컬러 관련 설정 추출
    let rowColorConfig = JSON.parse(this.menuParamValue('row-color', '[]'))
    if(rowColorConfig && rowColorConfig.length > 0) {
      gristConf.rows.classifier = (record, rowIndex) => {
        // 조건에 따라 색상을 2개 배열로 리턴 [BACKGROUP_COLOR, FONT_COLOR] 순으로 ...
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

    // 그리스트 설정 리턴
    return gristConf
  }

  /**
   * @description 그리드 HTML 리턴
   ******************************
   */
  getGridHtml() {
    let gristElementId = this.gristId ? this.gristId : 'ox-grist'
    let gridMode = this.grid_mode
    let gristConfigSet = this.config
    let explicitFetchFlag = true

    if (this.useFilterForm()) {
      return html`<ox-grist
        id=${gristElementId}
        .config=${gristConfigSet}
        ?explicit-fetch=${explicitFetchFlag}
        .mode=${gridMode}
        .fetchHandler=${this.fetchHandler.bind(this)}
      >
        ${MetaUiUtil.getGridDetailHtml(this)}
      </ox-grist>`

    } else if (this.useSearchForm() && !this.tagName.includes('-MASTER-')) {
      return html`${this.getSearchFormHtml(this)}
        <ox-grist
          id=${gristElementId}
          .config=${gristConfigSet}
          ?explicit-fetch=${explicitFetchFlag}
          .mode=${gridMode}
          .fetchHandler=${this.fetchHandler.bind(this)}
        >
        </ox-grist>`

    } else {
      return html` <ox-grist
        id=${gristElementId}
        .config=${gristConfigSet}
        ?explicit-fetch=${explicitFetchFlag}
        .mode=${gridMode}
        .fetchHandler=${this.fetchHandler.bind(this)}
      >
      </ox-grist>`
    }
  }

  /**
   * @description 그리드 리턴
   **************************
   */
  get grist() {
    return !this.renderRoot || !this.renderRoot.querySelector ? undefined : this.renderRoot.querySelector('ox-grist')
  }
  
  /**
   * @description 그리드 리셋
   **************************
   */
  reset_grid() {
    if (this.grist) this.grist.data = {}
  }

  /**
   * @description 그리드의 행 정보를 찾아서 폼에서 변경된 정보 업데이트
   **********************************************************
   * @param {Object} event
   */
  updateGridRecord(event) {
    let formData = event.detail

    if (this.grist && this.grist.data && this.grist.data.records) {
      let records = JSON.parse(JSON.stringify(this.grist.data.records))
      let foundData = records.find(record => {
        return record.id == formData.id
      })

      if(foundData) {
        Object.keys(foundData).forEach(key => {
          let oldValue = foundData[key]
          let newValue = formData[key]

          if(oldValue != newValue) {
            foundData[key] = newValue
          }
        })

        this.grist.data = { records : records, total : records.length }
      }
    }
  }

  /**
   * @description 그리드에서 신규/변경된 레코드 추출
   ********************************************
   * @returns
   */
  getPatches() {
    let cudRecords = this.grist.dirtyRecords

    if (cudRecords && cudRecords.length) {
      return cudRecords.map(record => {
        record.cud_flag_ = record.__dirty__ == 'M' ? 'u' : 'c'
        delete record['__dirty__']
        return record
      })
    } else {
      return undefined
    }
  }
}
