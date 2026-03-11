import '@operato/form/ox-search-form.js'

import { css, html } from 'lit-element'

import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

import { SearchFormRenderMixin } from './search-form-render-mixin'
import { CustomGristButtonMixin } from './custom-grist-button-mixin'

import { MetaUiUtil } from '../utils/meta-ui-util'
import { ValueUtil } from '../utils/value-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 그리스트 관련 믹스 인
 */
export const GristRenderMixin = superClass =>
  class extends SearchFormRenderMixin(CustomGristButtonMixin(superClass)) {
    /**
     * @description 그리스트 스타일
     ****************************
     */
    static getGristStyle() {
      let styles = [
        CommonGristStyles,
        CommonHeaderStyles,
        css`
          ox-grist {
            overflow-y: auto;
            flex: 1;
          }

          ox-filters-form {
            flex: 1;
          }
        `
      ]

      // 서치 폼 스타일 추가
      if (this.getSearchFormStyle) {
        styles.push(...this.getSearchFormStyle())
      }

      // 버튼 콘테이너 스타일 추가 (팝업으로 로드시 사용)  
      styles.push(...MetaUiUtil.getPopupButtonContainerStyles())


      return styles
    }

    /**
     * @description 그리스트 설정 생성
     ******************************
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
        let pagesInts = paramPagination.split(',').map(page => { return parseInt(page) })
        pagination = { pages: pagesInts }
      }

      // 모바일 (CARD, LIST) 형식인 경우 표시할 필드 리스트
      let listFields = [this.menu.title_field, this.menu.desc_field]
      let paramListFields = this.menuParamValue('grid-list-fields', '[]')
      let paramListFieldsArr = JSON.parse(paramListFields)
      if (paramListFieldsArr.length > 0) {
        listFields = paramListFieldsArr
      }

      // Tree Grist
      let tree = this.menuParamValueToObject('grist-tree', undefined)
     
      // 그리스트 설정 리턴
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

      if(tree){
        gristConf.columns.splice(2, 0, {
          type : "tree",
          name : tree.columnName? tree.columnName : "path",
          label : true,
          header : tree.columnName? tree.columnName : "path",
          record : {
            editable : false,
            options : {
              selectable : true
            }
          },
          width : 120,
          handlers : {
            contextmenu : "contextmenu-tree-mutation"
          }
        })
      }

      // 그리드 행 컬러 관련 설정 추출
      let rowColorConfig = JSON.parse(this.menuParamValue('row-color', '[]'))
      if(rowColorConfig && rowColorConfig.length > 0) {
        gristConf.rows.classifier = (record, rowIndex) => {
          // 조건에 따라 색상을 2개 배열로 리턴 [BACKGROUP_COLOR, FONT_COLOR] 순으로 ...
          for(let idx = 0 ; idx < rowColorConfig.length ; idx++) {
            let rowColorConf = rowColorConfig[idx]
            let recordValue = record[rowColorConf.col_name]

            if (recordValue == rowColorConf.col_value) {
              return {
                emphasized: [rowColorConf.background_color, rowColorConf.font_color]
              }
            }
            if (rowColorConf.col_value === '$EMPTY' && ValueUtil.isEmpty(recordValue)) {
              return {
                emphasized: [rowColorConf.background_color, rowColorConf.font_color]
              }
            }
            if (rowColorConf.col_value === '$NOT_EMPTY' && ValueUtil.isNotEmpty(recordValue)) {
              return {
                emphasized: [rowColorConf.background_color, rowColorConf.font_color]
              }
            }
          }
        }
      }

      if(tree){
        gristConf.tree = tree
      }

      // 그리드 설정 리턴
      return gristConf
    }

    /**
     * @description 공통 그리드 엘리먼트
     ********************************
     */
    getGridHtml() {
      return MetaUiUtil.getBasicGristHtml(this)
    }

    /**
     * @description 서치 폼 리턴
     ***************************
     */
    get searchForm() {
      // 메뉴 파라미터 옵션에 따라 다른 처리..
      return this.useFilterForm()
        ? this.renderRoot.querySelector('ox-filters-form')
        : this.useSearchForm()
          ? this.renderRoot.querySelector('ox-search-form')
          : undefined
    }

    /**
     * @description 그리드 리턴
     **************************
     */
    get grist() {
      return !this.renderRoot || !this.renderRoot.querySelector ? undefined : this.renderRoot.querySelector('ox-grist')
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
