import '@material/web/button/elevated-button.js'

import { css, html, LitElement } from 'lit'
import { ButtonContainerStyles, CommonHeaderStyles } from '@operato/styles'
import { isMobileDevice } from '@operato/utils'

import { TermsUtil } from '../../utils/terms-util'
import { ValueUtil } from '../../utils/value-util'
import { ServiceUtil } from '../../utils/service-util'
import { UiUtil } from '../../utils/ui-util'
import { MetaApi } from '../../utils/meta-api'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 리소스 셀렉터 팝업 화면
 */
export class OxResourceSelectorPopup extends LitElement {
  /**
   * @description 스타일
   **********************
   */
  static get styles() {
    let style = [
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          background-color: var(--record-view-background-color);
        }

        ox-grist {
          overflow-y: hidden;
          flex: 1;
        }

        [footer] {
          text-align: right;
          background-color: var(--record-view-footer-background);
          box-shadow: var(--context-toolbar-shadow-line);
        }

        [footer] button {
          display: inline-block;
          align-items: center;
          justify-content: center;

          background-color: transparent;
          border: var(--record-view-footer-button-border);
          border-width: var(--record-view-footer-button-border-width);
          padding: var(--spacing-tiny) var(--spacing-medium);
          color: var(--record-view-footer-button-color);
          font-size: var(--md-sys-typescale-title-medium-size, 1rem);
          line-height: 2;
        }

        [footer] button * {
          vertical-align: middle;
        }

        [footer] button md-icon {
          --md-icon-size: var(--icon-size-small);
          margin-right: var(--spacing-small, 4px);
        }

        [footer] button[ok] {
          background-color: var(--record-view-footer-focus-background);
        }
      `
    ]

    return style
  }

  /**
   * @override connectedCallback
   ******************************
   */
  async connectedCallback() {
    // 1. 화면을 구성하기 위한 메타 정보 추출
    let meta = this.screen_meta

    // 2. 그리드 컬럼, 검색 폼 헤더 다국어 처리
    meta.grid_config.forEach(c => {
      c.header = TermsUtil.t(c.header)
      if (c.filter && c.filter.label) {
        c.filter.label = c.header
      }
    })

    // 3. 그리드 컬럼 구성을 위한 설정 컬럼 정보 추출
    this.menu = meta.menu
    this.select_fields = meta.select_fields
    this.search_hidden_fields = meta.search_hidden_fields
    this.sort_fields = meta.sort_fields
    this.permit_search_fields = meta.permit_search_fields
    this.search_form_fields = meta.grid_config
      .filter(c => c.filter)
      .map(c => {
        return c.filter
      })

    // 4. 리스트 타입 필드
    let listFields = this.menu.title_field ? [this.menu.title_field] : []
    if (this.menu.desc_field) listFields.push(this.menu.desc_field)

    // 5. 부모 그리드의 컬럼 메타 정보로 부터 팝업의 검색 조건에 초기값을 설정한다
    this.updateSearchFields(this.record)

    // 6. 최종 그리드 구성을 위한 설정
    this.gridConfig = {
      list: {
        fields: [...listFields]
      },
      pagination: {
        pages: [50, 100, 500, 1000]
      },
      rows: {
        selectable: {
          multiple: false
        },
        appendable: false,
        handlers: {
          click: 'select-row-toggle',
          dblclick: (columns, data, column, record, rowIndex, field) => {
            this.selectRecord(record)
          }
        }
      },
      columns: [
        {
          type: 'gutter',
          gutterName: 'dirty'
        },
        {
          type: 'gutter',
          gutterName: 'sequence'
        },
        {
          type: 'gutter',
          gutterName: 'row-selector',
          multiple: false
        },
        ...meta.grid_config
      ],
      sorters: [...this.sort_fields]
    }

    // 7. record-change 이벤트 처리
    if (this.column_meta.ref_related) {
      document.addEventListener('record-change', this.recordChangeEventListener.bind(this))
    }

    // 8. search Field boundTo 설정 
    this.gridConfig.columns.forEach(column => {
      if (column.filter && column.ref_related && column.ref_related != '') {
        column.filter.boundTo = [column.ref_related.split(',').join(',')]
      }
    })
  
    // 9. super
    await super.connectedCallback()
  }

  /**
   * @override disconnectedCallback
   ******************************
   */
  disconnectedCallback() {
    // 1. record-change 이벤트 해제
    if (this.column_meta.ref_related) {
      document.removeEventListener('record-change', this.recordChangeEventListener.bind(this))
    }

    // 2. super
    if (super.disconnectedCallback) {
      super.disconnectedCallback()
    }
  }

  /**
   * @description record-change 이벤트 리스너 : 참조 관계 필드 처리용
   ************************************************************
   * @param {Object} event
   */
  recordChangeEventListener(event) {
    let column = event.detail.column
    // event의 column과 해당 컬럼 이름이 같은 경우에만 처리
    if (this.column_meta.name != column.name) return

    let selected = event.detail.after[event.detail.column.name]
    let record = event.detail.after

    // 레코드 선택 후 참조 관계 필드 설정
    if (selected && column && column.ref_related) {
      let refRelatedArr = column.ref_related.split(',')
      for (let i = 0; i < refRelatedArr.length; i++) {
        let refRelatedInfo = refRelatedArr[i].split('=')
        let srcField = refRelatedInfo[0].trim()
        let tarField = refRelatedInfo.length == 2 ? refRelatedInfo[1].trim() : srcField
        let tarValue = tarField.startsWith(':') ? selected[tarField.substring(1)] : tarField
        // 메뉴 메타 정보의 참조 관계 필드 정보가 있다면 해당 정보에 따라서 선택된 레코드 값을 그리드의 현재 레코드 필드의 값에 할당 처리
        record[srcField] = tarValue
      }
    }
  }

  /**
   * @description 부모 그리드의 컬럼 메타 정보로 부터 팝업의 검색 조건에 초기값을 설정한다.
   *******************************************************************
   */
  updateSearchFields(record) {
    // 부모 그리드에서 올려준 컬럼 메타 정보의 ref_params 정보와 record 정보로 부터 검색 조건을 만들어서 검색 필드 기본값으로 설정한다.
    if (record && this.column_meta && this.column_meta.ref_params) {
      let refParamArr = this.column_meta.ref_params.split(',')
      for (let i = 0; i < refParamArr.length; i++) {
        // 참조 파라미터 정보 파싱하여 검색 조건 필드에 값을 설정
        let refParamInfo = refParamArr[i].split('=')
        let srcField = refParamInfo[0].trim()
        let tarField = refParamInfo.length == 2 ? refParamInfo[1].trim() : srcField
        let tarValue = tarField

        // 예를 들어 :vendor_id 값은 없으므로 vendor.id 형식도 처리
        if (tarField.startsWith(':')) {
          tarField = tarField.substring(1)
          if (tarField.includes('.')) {
            let tarFieldArr = tarField.split('.')
            tarValue = record[tarFieldArr[0]]? record[tarFieldArr[0]][tarFieldArr[1]] : ''
            tarValue = tarValue? tarValue : 'null'
          } else {
            tarValue = record[tarField]
          }
        }

        // 메뉴 메타 정보의 참조 관계 필드 정보가 있다면 해당 정보에 따라서 선택된 레코드 값을 그리드의 현재 레코드 필드의 값에 할당 처리
        if (tarValue) {
          let gridColumns = this.screen_meta.grid_config
          let searchColumn = gridColumns.find(f => {
            return f.name == srcField
          })
          if (searchColumn && searchColumn.filter) {
            searchColumn.filter.value = tarValue
            continue
          }
          let searchHiddenColumn = this.search_hidden_fields.find(f => {
            return f.name == srcField
          })
          if (searchHiddenColumn) {
            searchHiddenColumn.value = tarValue
            continue
          }
        }
      }
    }
  }

  /**
   * @override firstUpdated
   **************************
   */
  async firstUpdated() {
    await super.firstUpdated()
  }

  /**
   * @override render
   ********************
   */
  render() {
    return html`
      <ox-grist
        id="ox-grist"
        .config=${this.gridConfig}
        .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
        .fetchHandler=${this.fetchHandler.bind(this)}
      >
        <div slot="headroom" class="header">
          <div class="filters">
            <ox-filters-form></ox-filters-form>
          </div>
        </div>
      </ox-grist>

      <div footer>
        <button @click=${this.clickEmpty.bind(this)}>
          <md-icon>check_box_outline_blank</md-icon><span>${TermsUtil.tButton('empty')}</span>
        </button>
        <button @click=${this.clickCancel.bind(this)}>
          <md-icon>cancel</md-icon><span>${TermsUtil.tButton('cancel')}</span>
        </button>
        <button @click=${this.clickSelect.bind(this)} ok>
          <md-icon>done</md-icon><span>${TermsUtil.tButton('select')}</span>
        </button>
      </div>
    `
  }

  /**
   * @description 그리드 리턴
   **************************
   * @returns {Object} 그리드
   */
  get grist() {
    return this.renderRoot.querySelector('#ox-grist')
  }

  /**
   * @description 컬럼 조회
   ************************
   * @returns
   */
  async fetchHandler({ page = 0, limit = 0, sorters = [], filters = [] }) {
    // 1. 기본 필터 구성
    let operChangeFilters = filters
      .map(filter => {
        let operChangeFilter = Object.assign({}, filter)
        let filterList = this.search_form_fields.filter(x => x.name == filter.name)

        // resource selector 검색 필드인 경우
        if (!filterList || filterList.length == 0) {
          let refFieldName = filter.name + '_id'
          filterList = this.search_form_fields.filter(x => x.name == refFieldName)

          if (filterList && filterList.length > 0) {
            // filter 데이터를 { name: `${filter_name}_id`, operator: 'eq', value: 'id value' } 형태로 구성
            operChangeFilter.name = refFieldName
            operChangeFilter.operator = 'eq'
            if (
              filterList[0].type == 'resource-selector' &&
              typeof operChangeFilter.value == 'object' &&
              operChangeFilter.value.id
            ) {
              operChangeFilter.value = operChangeFilter.value.id
            }
            return operChangeFilter
          } else {
            return null
          }
          // 일반 필드인 경우
        } else {
          operChangeFilter.operator = filterList[0].props.searchOper
          return operChangeFilter
        }
      })
      .filter(f => f !== undefined && f !== null)

    // 1.1 숨김 필터와 설정 필터를 합침
    filters = [...this.search_hidden_fields, ...operChangeFilters]

    // 1.2 필터 값이 배열로 되어 있다면 ',' 로 수정
    filters.forEach(x => {
      if (Array.isArray(x.value)) {
        x.value = x.value.join(',')
      }
    })

    // 2. 데이터 액세스 권한 검색 필드 확인
    if (this.permit_search_fields && this.permit_search_fields.length > 0) {
      for (var idx = 0; idx < this.permit_search_fields.length; idx++) {
        let permitField = this.permit_search_fields[idx]
        let filter = filters.filter(x => x.name == permitField.name)
        let { label = permitField.label, value = '' } = filter.length > 0 ? filter[0] : {}

        if (((permitField.options || []).filter(x => x.value == value) || []).length == 0) {
          let errMsg = TermsUtil.tText('search-data-permit-error', [
            label,
            value.length == 0 ? TermsUtil.tLabel('all') : value
          ])
          MetaApi.showToast('info', errMsg)
          throw new Error(errMsg)
        }
      }
    }

    // 3. 정렬 조건 변경
    sorters = sorters.map(currentElement => {
      return {
        field: currentElement.name,
        ascending: currentElement.desc ? false : true
      }
    })

    // 4. 서비스 호출을 위한 파라미터 설정
    let params = [
      {
        name: 'select',
        value: encodeURI(this.select_fields.join(','))
      },
      {
        name: 'sort',
        value: encodeURI(JSON.stringify(sorters))
      },
      {
        name: 'query',
        value: encodeURI(JSON.stringify(filters))
      },
      {
        name: 'page',
        value: page
      },
      {
        name: 'limit',
        value: limit
      }
    ]

    // 5. 데이터 조회
    let searchUrl = this.menu.resource_url ? this.menu.resource_url : this.menu.search_url
    let res = await ServiceUtil.restGet(searchUrl, params)

    // 6. 결과 리턴
    return { total: res.total, records: res.items }
  }

  /**
   * @description 비우기 버튼 클릭시 액션
   **********************************
   * @returns
   */
  async clickEmpty(e) {
    this.confirmCallback && this.confirmCallback(null)
    UiUtil.closePopupBy(this)
  }

  /**
   * @description 취소 버튼 클릭시 액션
   *********************************
   * @returns
   */
  async clickCancel(e) {
    UiUtil.closePopupBy(this)
  }

  /**
   * @description 선택 버튼 클릭시 액션
   *********************************
   * @returns
   */
  async clickSelect(e) {
    let selected = this.grist.selected
    if (!selected || selected.length == 0) {
      MetaApi.showToast('info', TermsUtil.tText('NOTHING_SELECTED'))
    } else {
      // 선택 값 추출
      let selectedRecord = selected[0]
      // 선택시 값 설정
      this.selectRecord(selectedRecord)
    }
  }

  /**
   * @description 레코드 선택시 액션
   ******************************
   * @param {*} record
   */
  async selectRecord(record) {
    this.confirmCallback && this.confirmCallback(record)
    UiUtil.closePopupBy(this)
  }

  /**
   * @description editorType별로 매핑된 편집기 이름을 리턴
   *************************************************
   * @param {String} editorType
   */
  getEditorType(editorType) {
    if (ValueUtil.isEmpty(editorType)) {
      return 'string'
    }

    switch (editorType) {
      case 'resource-code':
        return 'select'
      case 'permit-resource-code':
        return 'select'
      case 'code-combo':
        return 'select'
      case 'code-column':
        return 'select'
      case 'date-picker':
        return 'date'
      case 'datetime-picker':
        return 'datetime'
      case 'readonly':
        return 'string'
    }

    return editorType
  }

  /**
   * @description 검색 editorType별로 매핑된 검색 편집기 이름을 리턴
   *********************************************************
   * @param {String} editorType
   */
  getSearchType(editorType) {
    if (ValueUtil.isEmpty(editorType)) {
      return 'string'
    }

    switch (editorType) {
      case 'resource-code':
        return 'select'
      case 'permit-resource-code':
        return 'select'
      case 'code-combo':
        return 'select'
      case 'date-picker':
        return 'date'
      case 'datetime-picker':
        return 'datetime'
      case 'readonly':
        return 'string'
    }

    return editorType
  }
}

customElements.define('ox-resource-selector-popup', OxResourceSelectorPopup)
