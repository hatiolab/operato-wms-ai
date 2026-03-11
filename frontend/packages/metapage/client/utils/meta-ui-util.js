import '@material/web/button/elevated-button.js'

import { css, html, nothing } from 'lit'
import {
  ScrollbarStyles,
  CommonGristStyles,
  CommonButtonStyles,
  CommonHeaderStyles,
  ButtonContainerStyles
} from '@operato/styles'
import { i18next } from '@operato/i18n'
import { getEditor, getRenderer } from '@operato/data-grist'
import { operatoGetMenuMeta, currentRouteMenu } from '@operato-app/operatofill'

import { TermsUtil } from './terms-util'
import { ValueUtil } from './value-util'
import { ServiceUtil } from './service-util'
import { UiUtil } from './ui-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 메타 UI에서 필요한 유틸리티 함수 정의
 */
export class MetaUiUtil {
  /**
   * @description 기본 그리스트 페이지 프로퍼티 리턴
   ***************************************
   * @returns {Object} 기본 그리스트 페이지 프로퍼티
   */
  static getBasicGristPageProperties() {
    return {
      config: Object, // 그리드 설정
      total: Number, // 페이지
      records: Array, // 그리드 조회 데이터
      sort_fields: Object, // 메뉴 메타에 설정 된 정렬
      actions: Object, // is_page 의 경우 사용 되는 버튼 액션
      grid_config: Object, // 메뉴 메타의 그리드 설정
      menu: Object, // 메뉴 정보
      menu_params: Object, // 메뉴 파라미터 정보
      search_hidden_fields: Object, // 필터에 설정된 히든 필드 에 대한 정보
      select_fields: Object, // 조회 대상 필드
      use_add_button: Boolean, // 추가 버튼 사용 여부
      route_name: String, // is_element 타입의 경우 routing 명칭 (element 속성으로 소유자가 호출할때 지정해야함)
      grid_view_options: Array, // GRID 표현 옵션 ( CARD, LIST, GRID )
      grid_mode: String, // 현재 그리드 표현
      search_form_fields: Array, // 서치폼 구성 설정 정보
      fetch_callback: Object, // 그리드 또는 서치폼 에서 조회 이벤트 발생시 callback 을 받기 위한 함수
      button_elements: Array, // is_element 타입에서 그려질 버튼 element
      form_fields: Array, // 메뉴 폼 정보
      is_page: Boolean, // 현재 문서의 page 여부
      is_popup: Boolean, // 현재 문서의 popup 여부
      open_params: Object,
      parent_id: String, // is_element 타입의 경우 소유자 id (element 속성으로 소유자가 호출할때 지정해야함)
      resource_url: String, // 조회 URL
      save_url: String, // 저장 URL
      cud_flag_converter: Array, // CUD 플래그 컨버터 함수
      parent_is_popup: Boolean // 현재 문서의 상위 객체 (M/D 타입의 MASTER) 가 팝업 인지 여부
    }
  }

  /**
   * @description 메뉴 라우팅 혹은 메뉴 명으로 메뉴 메타 정보 조회
   **********************************************
   * @param {String} menuName 메뉴 라우팅 혹은 메뉴 명
   * @returns {Object} 메뉴 메타 정보
   */
  static async findMenuMeta(menuName) {
    const menuMeta = await operatoGetMenuMeta(menuName)
    const { form_fields = [], search_form_fields = [], grid_config = [], menu, actions = [] } = menuMeta

    return {
      ...menuMeta,
      form_fields: form_fields.map(form_field => {
        return { ...form_field, header: i18next.t(form_field.header) }
      }),
      search_form_fields: search_form_fields.map(search_form_field => {
        const { props } = search_form_field
        return {
          ...search_form_field,
          label: i18next.t(search_form_field.label),
          props: props && {
            ...props,
            placeholder: props.placeholder && i18next.t(props.placeholder)
          }
        }
      }),
      grid_config: grid_config.map(config => {
        const { imex, filter } = config
        return {
          ...config,
          header: i18next.t(config.header),
          imex: imex && {
            ...imex,
            header: imex.header && i18next.t(imex.header)
          },
          filter: filter && {
            ...filter,
            label: filter.label && i18next.t(filter.label),
            props: filter.props && {
              ...filter.props,
              placeholder: filter.props.placeholder && i18next.t(filter.props.placeholder)
            }
          }
        }
      }),
      menu: menu && {
        ...menu,
        title: i18next.t(menu.title)
      },
      actions: actions.map(action => {
        return {
          ...action,
          title: i18next.t(action.title)
        }
      })
    }
  }

  /**
   * @description 메뉴 메타 정보를 조회한 후 파싱...
   *********************************************
   * @param {HTMLElement} pageView
   * @returns {Object} 메뉴 메타 정보
   */
  static async getMenuMeta(pageView) {
    let currentRouting = MetaUiUtil.getCurrentRouting(pageView)
    return await MetaUiUtil.findMenuMeta(currentRouting)
  }

  /**
   * @description 현재 화면에 대한 라우팅 정보 리턴
   *********************************************
   * @param {HTMLElement} view
   * @returns {Object} 메뉴 메타 정보
   */
  static getCurrentRouting(view) {
    if (view.is_page == undefined) {
      view.is_page = view.route_name == undefined ? true : false
    }

    return view.is_element ? view.route_name : currentRouteMenu()
  }

  /**
   * @description 파라미터로 받은 pageLimits로 페이지네이션 페이지 수를 표시
   ********************************************
   * @param {Array} 페이지네이션 페이지 수 배열
   * @returns {Object} 페이지네이션 페이지 수
   */
  static getGristPaginationCustomConfig(...pageLimits) {
    return { pages: pageLimits }
  }

  /**
   * @description 그리스트 기본 gutter 설정 리턴
   ********************************************
   * @param {Boolean} useRowSelector 행 선택 기능 사용 여부
   * @param {Boolean} multiple 여러 행 선택 가능 여부
   * @returns {Object} 그리스트 기본 gutter 설정
   */
  static getGristGuttersConfig(useRowSelector, multiple) {
    let configList = [
      { type: 'gutter', gutterName: 'dirty' },
      { type: 'gutter', gutterName: 'sequence' }
    ]

    if (useRowSelector) {
      configList.push({ type: 'gutter', gutterName: 'row-selector', multiple: multiple })
    }

    return configList
  }

  /**
   * @description 그리스트 선택 모드 설정
   ****************************************
   * @returns {Object} 그리스트 선택 모드 설정
   */
  static getGristSelectableConfig(multiple) {
    return { selectable: { multiple: multiple } }
  }

  /**
   * @description 메뉴 메타 정보를 기반으로 그리드 설정 셋을 파싱하여 리턴
   ************************************************
   * @param {Object} pageView 페이지
   * @returns {Object} 그리드 설정 셋
   */
  static async parseGridConfigSet(pageView) {
    // 1. 그리드 옵션
    let gridOption = MetaUiUtil.getGridOptionSet(pageView)

    // 2. 그리드 리스트 설정
    let gridList = MetaUiUtil.getGridListSet(pageView)

    // 3. 그리드 row 설정
    let gridRow = MetaUiUtil.getGridRowSet(pageView)

    // 4. 그리드 버튼 설정
    let gridButton = MetaUiUtil.getGridButtonSet(pageView)

    // 5. 그리드 컬럼 설정
    let gridColumns = await MetaUiUtil.getGridColumnSet(pageView)

    // 6. default 그리드 gutter
    let gutterConfigs = MetaUiUtil.getGristGuttersConfig(gridOption.use_row_checker, gridRow.selectable.multiple)

    // 7. 필터 폼에 검색 조건 필드 정의
    if (pageView.useFilterForm == true) {
      gridColumns = MetaUiUtil.setGridColumnSearchOption(pageView, gridColumns)
    }

    // 8. 그리드 최종 Configuration
    return {
      list: gridList,
      pagination: gridOption.pages,
      sorters: gridOption.sorters,
      rows: gridRow,
      columns: [...gutterConfigs, ...gridButton, ...gridColumns]
    }
  }

  /**
   * @description 메뉴 메타 정보를 기반으로 폼 설정 셋을 파싱하여 리턴
   ************************************************
   * @param {Object} pageView 페이지
   * @returns {Object} 폼 설정 셋
   */
  static async parseFormConfigSet(pageView) {
    let formColumnConfig = pageView.formColumnConfig
    let columns = []

    for (let idx = 0; idx < formColumnConfig.length; idx++) {
      let {
        type = 'string',
        name = undefined,
        header = undefined,
        hidden = false,
        editable = true,
        mandatory = false,
        align = 'left',
        select_opt = undefined,
        object_opt = undefined
      } = formColumnConfig[idx]

      // 컬럼 config 으로 변경 및 문자열 처리
      let column = {
        type: type,
        name: name,
        header_txt: ValueUtil.isEmpty(header) ? TermsUtil.tLabel(name) : TermsUtil.tLabel(header),
        header: {
          renderer: function (column) {
            return column.header_txt
          }
        },
        hidden: hidden,
        record: {
          editable: editable,
          mandatory: mandatory,
          align: align,
          classifier: function () {},
          renderer: getRenderer(type)
        }
      }

      if (editable) {
        column.record.editor = getEditor(type)
      }

      // select-option
      if (type === 'select' && ValueUtil.isNotEmpty(select_opt)) {
        if (Array.isArray(select_opt)) {
          column.record.options = select_opt
        } else {
          if (select_opt.type === 'code') {
            // 공통 코드
            column.record.options = await ServiceUtil.getCodeSelectorData(select_opt.name)
          } else if (select_opt.type === 'diy-service') {
            // 커스텀 서비스
            column.record.options = await ServiceUtil.getCodeByCustomService(select_opt.name, select_opt.args)
          }
        }
      }

      // object-option
      if (type === 'object' && ValueUtil.isNotEmpty(object_opt)) {
        column.record.options = object_opt
      }

      columns.push(column)
    }

    return columns
  }

  /**
   * @description 메타 설정에서 그리드 옵션을 추출
   *****************************************
   * @param {Object} pageView
   * @returns {Object}
   */
  static getGridOptionSet(pageView) {
    let gridConfig = pageView.gridConfig
    pageView.useFilterForm = gridConfig && gridConfig.use_filter_form != undefined ? gridConfig.use_filter_form : true

    let {
      mobile_mode = 'LIST',
      desk_mode = 'GRID',
      view_mode = [],
      use_row_checker = true,
      sorters = [],
      pages = [50, 100, 500, 1000]
    } = ValueUtil.isEmpty(gridConfig.option) ? {} : gridConfig.option

    // 페이지 설정 변환
    if (pages === 'unlimited' || pages === '-1') {
      pageView.infinityPage = true
      pages = { infinite: true }
    } else {
      pageView.infinityPage = false
      pages.sort(function (a, b) {
        return a - b
      })
      pages = { pages: pages }
    }

    // 모바일 데스크 뷰 모드
    if (ValueUtil.isNotEmpty(view_mode)) {
      if (view_mode.length == 1) {
        desk_mode = view_mode[0]
        mobile_mode = view_mode[0]
      } else if (view_mode.length >= 2) {
        if (!view_mode.includes(mobile_mode)) {
          mobile_mode = view_mode[1]
        }

        if (!view_mode.includes(desk_mode)) {
          desk_mode = view_mode[0]
        }
      }
    }

    pageView.gridMobileMode = mobile_mode
    pageView.gridDeskMode = desk_mode
    pageView.grid_view_options = view_mode
    pageView.grid_mode = UiUtil.isMobileEnv() ? pageView.gridMobileMode : pageView.gridDeskMode

    return {
      use_row_checker: use_row_checker,
      sorters: sorters,
      pages: pages
    }
  }

  /**
   * @description 메타 설정에서 그리드 리스트 설정을 추출
   ***********************************************
   * @param {Object} pageView
   * @returns {Object}
   */
  static getGridListSet(pageView) {
    let gridList = {
      fields: [ValueUtil.getParams(pageView.menuInfo, 'name'), ValueUtil.getParams(pageView.menuInfo, 'desc')]
    }

    // 기본 리스트 설정과 메타에서 가져온 설정 merge
    if (pageView.gridConfig.list) {
      Object.assign(gridList, pageView.gridConfig.list)
    }

    return gridList
  }

  /**
   * @description 메타 설정에서 그리드 Row 옵션을 추출
   *********************************************
   * @param {Object} pageView
   * @returns {Object}
   */
  static getGridRowSet(pageView) {
    // 기본 옵션, 메타와 상관없이 그리드 로우 멀티 셀렉트는 false, click 이벤트는 없다.
    let { multiple_select = false, click = undefined } = ValueUtil.isEmpty(pageView.gridConfig.row)
      ? {}
      : pageView.gridConfig.row

    let retObject = {
      selectable: { multiple: multiple_select },
      appendable: pageView.useButtonAdd
    }

    if (ValueUtil.isNotEmpty(click)) {
      retObject.handlers = { click: click }
    }

    return retObject
  }

  /**
   * @description 메타 설정에서 그리드 버튼 옵션을 추출
   **********************************************
   * @param {Object} pageView
   * @returns {Array}
   */
  static getGridButtonSet(pageView) {
    let gridButtons = pageView.gridConfig.button
    return ValueUtil.isEmpty(gridButtons)
      ? []
      : // 그리드 버튼 정보로 버튼 설정 정보를 구성하여 리턴
        gridButtons.map(btn => {
          // 기본 그리드 버튼
          let button = { type: 'gutter', gutterName: 'button' }

          // 레코드 특정 필드 값 조건에 따라서 아이콘을 변경 ...
          if (ValueUtil.isNotEmpty(btn.icon)) {
            // 아이콘이 Array 타입
            if (Array.isArray(btn.icon)) {
              // 지정 된 조건에 따라 아이콘을 바꾼다.
              button.icon = record => {
                if (ValueUtil.isNotEmpty(record)) {
                  // 지정된 조건 Loop
                  for (let i = 0; i < btn.icon.length; i++) {
                    let logic = btn.icon[i]
                    let useIcon = ValueUtil.compareObjectValues(
                      logic,
                      record,
                      Object.keys(logic).filter(key => key != 'icon')
                    )
                    if (useIcon === true) {
                      return logic.icon
                    }
                  }
                }
              }
            } else {
              button.icon = btn.icon
            }
          }

          // 이름이 지정되어 있으면 변환
          if (ValueUtil.isNotEmpty(btn.name)) {
            // TODO Tooltip
            button = ValueUtil.setParams(button, btn, 'name', true)
          }

          // 버튼 유형이 기본이면 ( 그리스트 기본 제공 기능 및 추가 기능 )
          if (btn.type === 'basic') {
            button.handlers = { click: ValueUtil.getParams(btn, 'logic') }

            // 버튼 유형이 커스텀이면 ...
          } else {
            button.handlers = {
              click: (_columns, _data, _column, record, _rowIdx) => {
                if (record.id) {
                  MetaUiUtil.gristButtonHandler(pageView, btn, record)
                }
              }
            }
          }

          return button
        })
  }

  /**
   * @description 메타 데이터에서 그리드 렌더링 config 을 생성
   ***********************************************
   * @param {Object} pageView 페이지
   * @returns {Array} 그리드 컬럼 설정 리스트
   */
  static async getGridColumnSet(pageView) {
    let gridColumnConfig = pageView.gridColumnConfig

    // 메타에 그리드 컬럼 정보가 없으면
    if (ValueUtil.isEmpty(gridColumnConfig)) {
      return []
    }

    let columns = []
    for (let idx = 0; idx < gridColumnConfig.length; idx++) {
      let {
        type = 'string',
        name = undefined,
        header = undefined,
        hidden = false,
        editable = true,
        mandatory = false,
        sortable = false,
        align = 'left',
        width = 0,
        exportable = false,
        select_opt = undefined,
        object_opt = undefined
      } = gridColumnConfig[idx]

      // 컬럼 config 으로 변경 및 문자열 처리
      let column = {
        type: type,
        name: name,
        header: ValueUtil.isEmpty(header) ? '' : TermsUtil.tLabel(header),
        hidden: hidden,
        sortable: sortable,
        width: width,
        record: { editable: editable, mandatory: mandatory, align: align }
      }

      // select-option
      if (type === 'select' && ValueUtil.isNotEmpty(select_opt)) {
        // 코드 데이터 ...
        if (Array.isArray(select_opt)) {
          column.record.options = select_opt
        } else {
          // 공통 코드
          if (select_opt.type === 'code') {
            column.record.options = await ServiceUtil.getCodeSelectorData(select_opt.name)
            // 시나리오
          } else if (select_opt.type === 'diy-service') {
            column.record.options = await ServiceUtil.getCodeByCustomService(select_opt.name, select_opt.args)
            // 엔티티
          } else if (select_opt.type == 'entity') {
            // TODO
            // column.record.options = await ServiceUtil.getCodeByCustomService(select_opt.name, select_opt.args)
          }
        }
        // object-option
      } else if (type === 'object' && ValueUtil.isNotEmpty(object_opt)) {
        column.record.options = object_opt
      }

      // 내보내기 버튼 사용, 컬럼 내보내기 옵션
      if (pageView.useButtonExport === true && exportable === true) {
        column.imex = { header: column.header, key: column.name, width: column.width / 6, type: column.type }
      }

      columns.push(column)
    }

    return columns
  }

  /**
   * @description 필터 폼에 검색 조건 필드 정의
   *****************************************
   * @param {HTMLElement} pageView 페이지
   * @param {Array} gridColumns 그리드 컬럼 설정
   * @returns
   */
  static setGridColumnSearchOption(pageView, gridColumns) {
    let searchConfig = pageView.searchConfig

    if (searchConfig) {
      searchConfig.forEach(config => {
        if (typeof config === 'string') {
          gridColumns
            .filter(col => col.name == config)
            .forEach(col => {
              col.filter = 'search'
            })
        } else if (typeof config === 'object') {
          gridColumns
            .filter(col => col.name == config.name)
            .forEach(col => {
              col.filter = config
            })
        }
      })
    }

    return gridColumns
  }

  /**
   * @description 컨텍스트 오브젝트 생성
   **********************************
   * @param {Object} pageView
   * @returns {Object} 컨텍스트 오브젝트
   */
  static createPageContextObject(pageView) {
    let actions = []
    // 커스텀 버튼 생성
    if (pageView.getCustomActions) {
      actions.push(...pageView.getCustomActions())
    }

    let basicButtons = {}
    // 기본 버튼 생성
    if (pageView.getBasicActions) {
      basicButtons = pageView.getBasicActions()
      if (basicButtons.actions) {
        actions.push(...basicButtons.actions)
      }
    }

    // 버튼 순서 정렬
    actions = ValueUtil.arraySortBy(actions, 'rank')
    let context = {
      title: pageView.menu?.title,
      actions: actions
    }

    // 엑셀 export 버튼
    if (basicButtons.exportable) {
      context['exportable'] = basicButtons.exportable
    }

    return context
  }

  /**
   * @description 메뉴 컨텍스트에서 사용할 버튼 정보 추출
   **********************************************
   * @param {Object} pageView 페이지 뷰
   * @returns {Array} 버튼 엘리먼트 리스트
   */
  static getContextButtons(pageView) {
    let buttonConfig = pageView.buttonConfig
    return ValueUtil.isEmpty(buttonConfig)
      ? []
      : buttonConfig
          .filter(b => b.name != 'export' && b.name != 'import' && b.name != 'add')
          .map(btn => {
            let {
              name = undefined,
              label = undefined,
              style = undefined,
              type = 'basic',
              action = undefined,
              logic = undefined
            } = btn

            if (ValueUtil.isEmpty(name)) {
              return { title: '-1' }
            }

            if (ValueUtil.isEmpty(label)) label = name
            if (ValueUtil.isEmpty(style)) style = name
            if (ValueUtil.isEmpty(action)) action = name

            return {
              title: TermsUtil.tButton(label),
              action: MetaUiUtil.getButtonActionHandler(pageView, type, action, logic),
              ...(ValueUtil.isNotEmpty(style) ? CommonButtonStyles[style] : [])
            }
          })
          .filter(btn => btn.title != '-1')
  }

  /**
   * @description element로 로드시 버튼 element를 container에 직접 추가
   ******************************************************************
   * @param {Object} pageView 페이지 뷰
   * @returns {Array}  버튼 엘리먼트 리스트
   */
  static getContainerButtons(pageView) {
    let buttonConfig = pageView && pageView.buttonConfig ? pageView.buttonConfig : null
    return !buttonConfig
      ? []
      : buttonConfig
          .filter(b => b.name != 'add')
          .map(b => {
            let {
              name = undefined,
              label = undefined,
              style = undefined,
              type = 'basic',
              action = undefined,
              logic = undefined
            } = b

            if (ValueUtil.isEmpty(label)) label = name
            if (ValueUtil.isEmpty(style)) style = name
            if (ValueUtil.isEmpty(action)) action = name

            let btn = MetaUiUtil.createButtonElement(TermsUtil.tButton(label))
            btn.onclick = MetaUiUtil.getButtonActionHandler(pageView, type, action, logic)
            return btn
          })
  }

  /**
   * @description 버튼 엘리먼트를 생성
   ********************************
   * @param {String} buttonName
   * @returns {HTMLElement} 버튼 엘리먼트
   */
  static createButtonElement(buttonName) {
    let btnHtml = `<button>${buttonName}</button>`
    return UiUtil.htmlToElement(btnHtml)
  }

  /**
   * @description 버튼과 연결할 핸들러를 리턴
   *************************************
   * @param {Object} pageView
   * @param {String} type
   * @param {String} action
   * @param {Object} logic
   * @returns {Function} 버튼 클릭시 실행될 액션 핸들러
   */
  static getButtonActionHandler(pageView, type, action, logic) {
    if (type == 'basic') {
      if (pageView[action]) {
        return pageView[action].bind(pageView)
      }
    } else if (type == 'custom') {
      return () => MetaUiUtil.customButtonHandler(pageView, logic)
    }

    // 버튼과 연결된 함수가 없습니다.
    return () => {
      UiUtil.showAlertPopup('title.warning', 'text.button_bind_func_is_not_exist', 'info', 'confirm')
    }
  }

  /**
   * @description 그리스트 버튼에 대한 커스텀 액션 분기
   *******************************************
   * @param {Object} pageView
   * @param {Object} actionInfo
   * @param {Object} record
   */
  static async gristButtonHandler(pageView, actionInfo, record) {
    let action = ValueUtil.getParams(actionInfo, 'logic')
    let eventType = ValueUtil.getParams(action, 'type')

    if (eventType === 'form') {
      // 상세 폼뷰는 기본 정의된 로직으로 셋팅
      action.parent_menu_id = pageView.menu.id
      action.tagname = 'basic-form-element'
      action.import = 'pages/basic-form-element.js'
      action.parent_field = 'id'
      await UiUtil.openDynamicPopup(null, action, record)
    } else if (eventType === 'pass_param') {
      // 다른 객체로 파라미터 전달
      MetaUiUtil.gristButtonPassParam(pageView, action, record)
    } else if (eventType === 'page') {
      // page 이동
      UiUtil.pageNavigate(action.url, record)
    } else if (eventType === 'popup') {
      // 팝업 설정에 부모 메뉴 ID 전달
      action.parent_menu_id = pageView.menu.id
      // popup 오픈
      await UiUtil.openDynamicPopup(null, action, record)
    } else if (eventType === 'scenario') {
      // scenario 호출
      await MetaUiUtil.commonButtonCallScenario(pageView, action, record)
    } else if (eventType === 'value_reference') {
      // 설정된 조건에 따라 커스텀 로직 처리
      await MetaUiUtil.gristButtonValueReference(pageView, action, record)
    }
  }

  /**
   * @description 커스텀 버튼에 대한 액션 분기
   ***************************************
   * @param {Object} pageView
   * @param {Object} logic
   */
  static async customButtonHandler(pageView, logic) {
    // logic이 설정되지 않았으면 return
    if (ValueUtil.isEmpty(logic)) {
      return
    }

    let grist = pageView.grist
    let filterForm = pageView.filterForm

    let eventType = ValueUtil.getParams(logic, 'type')
    let paramInfo = ValueUtil.getParams(logic, 'param')
    let includeGristParams = paramInfo.filter(p => p.startsWith('grist'))

    // 오류 메시지 처리
    if (ValueUtil.isNotEmpty(includeGristParams)) {
      // 그리스트 존재 여부
      if (!grist) {
        // 그리드가 없습니다.
        UiUtil.showAlertPopup('title.info', 'text.grid_is_not_exist', 'info', 'confirm')
        return
      }

      // 그리스트 데이터 존재 여부
      if ((grist && grist.data ? grist.data.records : []).length == 0) {
        // 비어있는 그리드 입니다.
        UiUtil.showAlertPopup('title.info', 'text.grid_data_is_empty', 'info', 'confirm')
        return
      }

      if (paramInfo.includes('grist_one') || paramInfo.includes('grist_selected')) {
        // 선택된 행이 있는지 확인
        let selectedRows = grist ? grist.selected : []

        if (ValueUtil.isEmpty(selectedRows)) {
          // 선택된 항목이 없습니다.
          UiUtil.showAlertPopup('text.nothing_selected', 'text.there_is_no_selected_items', 'info', 'confirm')
          return
        }

        if (paramInfo.includes('grist_one')) {
          // 하나의 행만 선택 되었는지 확인
          if (selectedRows.length > 1) {
            //  하나의 항목만 선택해주세요.
            UiUtil.showAlertPopup('title.info', 'text.please_select_only_one', 'info', 'confirm')
            return
          }
        }
      }
    }

    let params = {}

    if (paramInfo.includes('filter')) {
      if (!filterForm) {
        UiUtil.showAlertPopup('title.info', 'text.search_form_is_not_exist', 'info', 'confirm')
        return
      }

      let filterValues = filterForm ? await filterForm.getQueryFilters() : []
      params['filter'] = filterValues
    }

    if (paramInfo.includes('grist_all')) {
      params['grist'] = grist.data.records
    } else if (paramInfo.includes('grist_one')) {
      params['grist'] = grist.selected[0]
    } else if (paramInfo.includes('grist_selected')) {
      params['grist'] = grist.selected
    }

    if (eventType === 'page') {
      // 페이지 이동
      UiUtil.pageNavigate(logic.url, params['grist'])
    } else if (eventType === 'popup') {
      let convParam = {
        ...(params['grist'] ? params['grist'] : {}),
        ...(params['filter'] ? params['filter'] : {})
      }
      // 팝업 설정에 부모 메뉴 ID 전달
      logic.parent_menu_id = pageView.menu.id
      // 팝업 오픈
      await UiUtil.openDynamicPopup(null, logic, convParam)
    } else if (eventType === 'scenario') {
      // 시나리오 호출
      await MetaUiUtil.commonButtonCallScenario(pageView, logic, params)
    }
  }

  /**
   * @description 파라미터 전달 버튼 처리
   ************************************
   * @param {Object} pageView
   * @param {Object} action
   * @param {Object} record
   */
  static gristButtonPassParam(pageView, action, record) {
    // 파라미터 전달 정보
    let passInfo = action.pass_field

    // Object Key로 Element 검색.
    Object.keys(passInfo).forEach(elementId => {
      let targetElement = pageView.shadowRoot.querySelector(`#${elementId}`)

      // 대상 엘리먼트에 매치할 필드 정보
      let matchInfo = passInfo[elementId]

      // 필드 정보 Loop tField : target , sField : source
      Object.keys(matchInfo).forEach(tField => {
        let sField = matchInfo[tField]
        // param 값이 * 이면 record 전체
        let param = sField === '*' ? record : record[sField]
        // tElement.tField에 파라미터 set
        targetElement[tField] = param
      })
    })
  }

  /**
   * @description 시나리오 호출 버튼 처리
   ******************************************
   * @param {Object} pageView
   * @param {Object} action
   * @param {Object or Array} params
   */
  static async commonButtonCallScenario(pageView, action, params) {
    // 시나리오 호출
    let response = await ServiceUtil.callCustomService('service', action.name, params)

    // 처리중 에러가 발생했거나 시나리오 호출 후 처리가 없으면 return
    if (!response.errors && ValueUtil.isNotEmpty(action.after) && action.after === 'fetch') {
      pageView.grist.fetch()
    }
  }

  /**
   * @description 설정된 조건과 record 의 값을 비교. 로직 처리
   ************************************************
   * @param {Object} pageView
   * @param {Object} config
   * @param {Object} record
   */
  static async gristButtonValueReference(pageView, config, record) {
    // 지정된 조건 Loop
    for (let idx = 0; idx < config.relation.length; idx++) {
      let relation = config.relation[idx]
      let useRelation = ValueUtil.compareObjectValues(
        relation,
        record,
        Object.keys(relation).filter(key => key != 'logic')
      )
      if (useRelation === true) {
        // 조건 체크 후 버튼 핸들러 호출
        await MetaUiUtil.gristButtonHandler(pageView, relation, record)
      }
    }
  }

  /**
   * @description 그리스트 Hidden 컬럼 설정
   ***********************************
   * @param {String} type
   * @param {String} name
   * @returns {Object} 그리스트 Hidden 컬럼 설정
   */
  static getGristHiddenColumnConfig(type, name) {
    return {
      type: type,
      name: name,
      sortable: false,
      hidden: true
    }
  }

  /**
   * @description 그리스트 기본 컬럼 설정
   ***********************************
   * @param {String} type
   * @param {String} name
   * @param {String} align
   * @param {Boolean} editable
   * @param {Boolean} sortable
   * @param {Number} width
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static getGristColumnConfig(type, name, align, editable, sortable, width) {
    return {
      type: type,
      name: name,
      header: TermsUtil.tLabel(name),
      record: {
        align: align,
        editable: editable
      },
      sortable: sortable,
      width: width
    }
  }

  /**
   * @description 그리스트 컬럼 설정
   ***********************************
   * @param {String} type
   * @param {String} name
   * @param {String} displayName
   * @param {String} align
   * @param {Boolean} editable
   * @param {Boolean} sortable
   * @param {Number} width
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static getGristColumnConfig2(type, name, displayName, align, editable, sortable, width) {
    return {
      type: type,
      name: name,
      header: TermsUtil.tLabel(displayName),
      record: {
        align: align,
        editable: editable
      },
      sortable: sortable,
      width: width
    }
  }

  /**
   * @description 그리스트 Selector 컬럼 설정
   ***********************************
   * @param {String} name
   * @param {String} displayName
   * @param {String} align
   * @param {Boolean} sortable
   * @param {Number} width
   * @param {Boolean} mandatory
   * @param {Array} optionValues
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static getGristSelectorColumnConfig(name, displayName, align, sortable, width, mandatory, optionValues) {
    return {
      type: 'select',
      name: name,
      header: TermsUtil.tLabel(displayName),
      record: {
        align: align,
        editable: true,
        mandatory: mandatory,
        options: optionValues
      },
      sortable: sortable,
      width: width
    }
  }

  /**
   * @description 그리스트 Code Selector 컬럼 설정
   ***********************************
   * @param {String} name
   * @param {String} displayName
   * @param {String} align
   * @param {Boolean} sortable
   * @param {Number} width
   * @param {Boolean} mandatory
   * @param {String} codeName
   * @returns {Object} 그리스트 기본 컬럼 설정
   */
  static async getGristCodeSelectorColumnConfig(name, displayName, align, sortable, width, mandatory, codeName) {
    let optionValue = await ServiceUtil.getCodeSelectorData(codeName)
    return MetaUiUtil.getGristSelectorColumnConfig(name, displayName, align, sortable, width, mandatory, optionValue)
  }

  /**
   * @description 그리스트 검색 필드 설정
   ************************************
   * @param {String} name
   * @param {String} type
   * @param {String} label
   * @param {String} operator
   * @param {Array} optionValues
   * @returns {Object} 그리스트 검색 필드 설정
   */
  static getGristSearchColumnConfig(name, type, label, operator, optionValues) {
    let column = {
      name: name,
      type: type,
      label: TermsUtil.tLabel(label),
      operator: operator
    }

    if (optionValues) {
      column.options = optionValues
    }

    return column
  }

  /**
   * @description 기본 컨텍스트 버튼이 아닌 커스텀 버튼 컨테이너 스타일
   *********************************************************
   * @returns {Array} 커스텀 버튼 컨테이너 CSS 리턴
   */
  static getCustomButtonContainerStyles() {
    return [ButtonContainerStyles]
  }

  /**
   * @description 팝업화면에서 사용할 버튼 컨테이너 스타일
   *********************************************************
   * @returns {Array} 팝업화면에서 사용할 버튼 컨테이너 CSS 리턴
   */
  static getPopupButtonContainerStyles() {
    return [
      css`
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
  }

  /**
   * @description 그리스트 강조 스타일 리턴
   **********************************
   * @returns {Array} 그리스트 강조 스타일 CSS
   */
  static getGristEmphasizedStyles() {
    return [
      css`
        :host {
          --grid-record-emphasized-background-color: red;
          --grid-record-emphasized-color: yellow;
        }
      `
    ]
  }

  /**
   * @description 기본 그리스트 스타일 리턴
   ************************************
   * @returns {Array} 기본 그리스트 스타일 CSS 리턴
   */
  static getBasicGristStyles() {
    return [
      ScrollbarStyles,
      CommonGristStyles,
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow-x: overlay;
          background-color: var(--md-sys-color-background);
        }

        ox-grist {
          overflow-y: auto;
          flex: 1;
        }

        ox-filters-form {
          flex: 1;
        }
      `,
      ...MetaUiUtil.getGristEmphasizedStyles(),
      ...MetaUiUtil.getCustomButtonContainerStyles(),
      ...MetaUiUtil.getPopupButtonContainerStyles()
    ]
  }

  /**
   * @description 기본 마스터 디테일 그리스트 스타일 리턴
   ************************************
   * @param {String} masterDetailType top-down / left-right
   * @returns {Array} 마스터 디테일 그리스트 스타일 CSS
   */
  static getBasicMasterDetailGristStyle(masterDetailType) {
    if (masterDetailType == 'top-down') {
      return MetaUiUtil.getMasterDetailTopDownGristStyle()
    } else {
      return MetaUiUtil.getMasterDetailLeftRightGristStyle()
    }
  }

  /**
   * @description top-down 형태의 마스터 디테일 그리스트 스타일 리턴
   ************************************
   * @returns {Array} top-down 형태의 마스터 디테일 그리스트 스타일 CSS
   */
  static getMasterDetailTopDownGristStyle() {
    return [
      ButtonContainerStyles,
      CommonGristStyles,
      CommonHeaderStyles,
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow-x: auto;
          background-color: var(--md-sys-color-background);
        }

        .container {
          flex: 1;
          display: grid;
          overflow: hidden;
          grid-template-rows: 50% 50%;
        }

        .container_detail {
          background-color: var(--md-sys-color-background);
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
        }

        h2 {
          padding: var(--subtitle-padding);
          font: var(--subtitle-font);
          color: var(--subtitle-text-color);
          border-bottom: var(--subtitle-border-bottom);
        }

        .container_detail h2 {
          margin: var(--grist-title-margin);
          border: var(--grist-title-border);
          font: var(--grist-title-font);
          color: var(--secondary-color);
        }

        .container_detail h2 md-icon {
          --md-icon-size: var(--grist-title-icon-size);
          vertical-align: middle;
          margin: var(--grist-title-icon-margin);
          color: var(--grist-title-icon-color);
        }

        h2 {
          padding-bottom: var(--grist-title-with-grid-padding);
        }

        ox-grist {
          overflow-y: auto;
          flex: 1;
        }

        ox-filters-form {
          flex: 1;
        }
      `
    ]
  }

  /**
   * @description left-rigth 형태의 마스터 디테일 그리스트 스타일 리턴
   ************************************
   * @returns {Array} left-rigth 형태의 마스터 디테일 그리스트 스타일 CSS
   */
  static getMasterDetailLeftRightGristStyle() {
    return [
      ButtonContainerStyles,
      CommonGristStyles,
      CommonHeaderStyles,
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow-x: auto;
          background-color: var(--md-sys-color-background);
        }

        .container {
          flex: 1;
          display: grid;
          overflow: hidden;
          grid-template-columns: 50% 50%;
        }

        .container_detail {
          background-color: var(--md-sys-color-background);
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
        }

        h2 {
          padding: var(--subtitle-padding);
          font: var(--subtitle-font);
          color: var(--subtitle-text-color);
          border-bottom: var(--subtitle-border-bottom);
        }

        .container_detail h2 {
          margin: var(--grist-title-margin);
          border: var(--grist-title-border);
          font: var(--grist-title-font);
          color: var(--secondary-color);
        }

        .container_detail h2 md-icon {
          --md-icon-size: var(--grist-title-icon-size);
          vertical-align: middle;
          margin: var(--grist-title-icon-margin);
          color: var(--grist-title-icon-color);
        }

        h2 {
          padding-bottom: var(--grist-title-with-grid-padding);
        }

        ox-grist {
          overflow-y: auto;
          flex: 1;
        }

        ox-filters-form {
          flex: 1;
        }
      `
    ]
  }

  /**
   * @description 기본 폼 스타일 리턴
   ************************************
   * @returns {Array} 기본 폼 스타일 CSS 리턴
   */
  static getBasicFormStyles() {
    return [
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow-x: overlay;
          background-color: var(--md-sys-color-background);
        }

        ox-record-view-body {
          flex: 1;
          overflow-y: auto;
        }
      `,
      ...MetaUiUtil.getCustomButtonContainerStyles(),
      ...MetaUiUtil.getPopupButtonContainerStyles()
    ]
  }

  /**
   * @description 그리드 설정에 버튼 이름이 buttonName인 버튼이 있는지 체크
   ***********************************************
   * @param {Object} buttonConfig 버튼 설정
   * @param {String} buttonName 버튼 명
   * @returns
   */
  static isButtonExist(buttonConfig, buttonName) {
    let button = buttonConfig
      ? buttonConfig.find(b => {
          return b.name == buttonName
        })
      : null
    return button ? true : false
  }

  /**
   * @description 그리드 설정에 버튼 이름이 buttonName인 버튼이 있는지 체크
   ***********************************************
   * @param {Object} gridConfig 그리드 설정
   * @param {String} buttonName 버튼 명
   * @returns
   */
  static isGridButtonExist(gridConfig, buttonName) {
    let button =
      gridConfig && gridConfig.button
        ? gridConfig.button.find(b => {
            return b.name == buttonName
          })
        : null
    return button ? true : false
  }

  /**
   * @description 그리드 설정에서 셀렉트 컬럼을 추출
   *******************************************
   * @param {Array} gridColumns 그리드 컬럼 설정
   * @returns {String} 셀렉트 필드 정보
   */
  static getSelectColumns(gridColumns) {
    let fields = ''

    gridColumns
      .filter(x => x.type != 'gutter')
      .forEach(c => {
        fields += '\n'
        fields += c.type !== 'object' ? c.name : `${c.name}\n{${MetaUiUtil.getObjctColumnSelectFields(c)}}`
      })

    return fields
  }

  /**
   * Object 타입의 컬럼에 대한 셀렉트 필드 추출 후 리턴
   ****************************************
   * @param {Object} gridCol
   * @returns {String} Object 타입의 필드 문자열
   */
  static getObjctColumnSelectFields(gridCol) {
    let colStr = ''

    if (ValueUtil.isNotEmpty(gridCol.record.options) && ValueUtil.isNotEmpty(gridCol.record.options.select)) {
      // 설정에 정의가 되어 있으면
      gridCol.record.options.select.forEach(x => {
        if (x.type !== 'object' && x.name && x.name !== '') {
          colStr += `\n${x.name}`
        }
      })
    }

    if (colStr == '') {
      // 설정에 정의가 되어 있지 않으면 기본 id, name, description 필드
      colStr += '\nid\nname\ndescription'
    }

    return colStr
  }

  /**
   * @description pageView의 그리드 검색 폼 Html을 생성하여 리턴
   ************************************
   * @param {String} pageView 페이지 뷰
   * @returns {HTMLElement} 그리스트 HTML
   */
  static getSearchFormHtml(pageView) {
    if (pageView.useSearchForm()) {
      return html` <ox-search-form
        id="search-form"
        autofocus
        .fields=${pageView.search_form_fields}
        @submit=${e => (pageView.grist ? pageView.grist.fetch() : pageView.fetchHandler(pageView.searchForm))}
      >
      </ox-search-form>`
    } else {
      return html``
    }
  }

  /**
   * @description pageView의 그리드 정보로 기본 그리스트 Html을 생성하여 리턴
   ********************************
   * @param {String} pageView 페이지 뷰
   * @returns {HTMLElement} 그리스트 HTML
   */
  static getBasicGristHtml(pageView) {
    let gristElementId = pageView.gristId ? pageView.gristId : 'ox-grist'
    let gridMode = pageView.grid_mode
    let gristConfigSet = pageView.config
    // 다른 페이지 링크로 이동 된 경우 auto-fetch 기능을 사용 안 함
    let disableAutoFetch =
      pageView.lifecycle && pageView.lifecycle.params && pageView.lifecycle.params.pass ? true : false
    if (!disableAutoFetch) {
      disableAutoFetch = !(pageView.menuParamValue('use-auto-fetch', 'true') == 'true' ? true : false)
    }

    let accumulators = pageView.menuParamValueToObject('grist-column-accumulators', undefined)

    if (gristConfigSet) {
      gristConfigSet.columns.forEach(column => {
        if (column.filter && column.ref_related && column.ref_related != '') {
          column.filter.boundTo = [column.ref_related.split(',').join(',')]
        }
        if(accumulators){
          accumulators.forEach(item => {
            if(column.name === item.column_name){
              column.accumulator = item.accumulator
            }
          })
        }
      })

      if(accumulators && gristConfigSet.rows){
        gristConfigSet.rows.accumulator = true
      }
    }

    if (pageView.useFilterForm()) {
      return html`<ox-grist
        id=${gristElementId}
        .config=${gristConfigSet}
        ?explicit-fetch=${disableAutoFetch}
        .mode=${gridMode}
        .fetchHandler=${pageView.fetchHandler.bind(pageView)}
        .personalConfigProvider=${pageView.getPagePreferenceProvider(gristElementId)}
      >
        ${MetaUiUtil.getGridDetailHtml(pageView)}
        ${gridMode == 'GRID' ? html`<ox-grist-personalizer slot="setting"></ox-grist-personalizer>` : nothing}
      </ox-grist>`
    } else if (pageView.useSearchForm() && !pageView.tagName.includes('-MASTER-')) {
      return html`${MetaUiUtil.getSearchFormHtml(pageView)}
        <ox-grist
          id=${gristElementId}
          .config=${gristConfigSet}
          ?explicit-fetch="true"
          .mode=${gridMode}
          .fetchHandler=${pageView.fetchHandler.bind(pageView)}
          .personalConfigProvider=${pageView.getPagePreferenceProvider(gristElementId)}
        >
          ${gridMode == 'GRID' ? html`<ox-grist-personalizer slot="setting"></ox-grist-personalizer>` : nothing}
        </ox-grist>`
    } else {
      return html` <ox-grist
        id=${gristElementId}
        .config=${gristConfigSet}
        ?explicit-fetch=${disableAutoFetch}
        .mode=${gridMode}
        .fetchHandler=${pageView.fetchHandler.bind(pageView)}
        .personalConfigProvider=${pageView.getPagePreferenceProvider(gristElementId)}
      >
        ${gridMode == 'GRID' ? html`<ox-grist-personalizer slot="setting"></ox-grist-personalizer>` : nothing}
      </ox-grist>`
    }
  }

  /**
   * @description pageView의 폼 정보로 기본 폼 Html을 생성하여 리턴
   ********************************
   * @param {Object} pageView 페이지 뷰
   * @returns {HTMLElement} 폼을 HTML
   */
  static getBasicFormHtml(pageView) {
    let formConfigSet = pageView.formConfigSet
    if (!formConfigSet) {
      return html``
    } else {
      let formElementId = pageView.formBodyId ? pageView.formBodyId : 'ox-record-view-body'
      return html`
        <ox-record-view-body id=${formElementId} .columns=${formConfigSet || []} .record=${{}} .rowIndex=${1}>
        </ox-record-view-body>
      `
    }
  }

  /**
   * @description 그리드 상세 내용 HTML 생성
   **************************************
   * @param {Object} pageView 페이지 뷰
   * @returns {HTMLElement} 그리드 상세 내용 HTML
   */
  static getGridDetailHtml(pageView) {
    let useAddButton = (pageView.menuParamValue('use-filter-add-button', 'false') == 'true' ? true : false)//获取添加按钮
    let useFilterForm = pageView.useFilterForm
    let recordCreationCallback = pageView.recordCreationCallback
    let useSortButton = JSON.parse(pageView.menuParamValue('use-grid-sort-button', 'false'))

    return useFilterForm == false
      ? html``
      : html`
          <div slot="headroom" class="header">
            <div class="filters">
              <ox-filters-form></ox-filters-form>
              ${useSortButton
                ? html`
                    <div id="sorters">
                      <md-icon
                        @click=${e => {
                          const target = e.currentTarget
                          target.nextElementSibling.open({
                            right: 0,
                            top: target.offsetTop + target.offsetHeight
                          })
                        }}
                        >sort</md-icon
                      >
                      <ox-popup id="sorter-control">
                        <ox-sorters-control></ox-sorters-control>
                      </ox-popup>
                    </div>
                  `
                : html``}
              ${MetaUiUtil.getGridViewOption(pageView)}
              <ox-record-creator id="add" ?hidden="${!useAddButton}" .callback=${recordCreationCallback.bind(pageView)}>
                <button style="display: flex; justify-content: center">
                  <md-icon>add</md-icon>
                </button>
              </ox-record-creator>
            </div>
          </div>
        `
  }

  /**
   * @description 그리드 보기 옵션 버튼을 그린다.
   ****************************************
   * @param {Object} pageView 페이지 뷰
   * @return {HTMLElement} 그리드 뷰 옵션 HTML
   */
  static getGridViewOption(pageView) {
    if (ValueUtil.isEmpty(pageView.grid_view_options) || pageView.grid_view_options.length == 1) {
      return html``
    } else {
      return html`
        <div id="modes">
          ${pageView.grid_view_options.includes('GRID')
            ? html`<md-icon @click="${() => (pageView.grid_mode = 'GRID')}" ?active="${pageView.grid_mode == 'GRID'}"
                >grid_on</md-icon
              >`
            : ``}
          ${pageView.grid_view_options.includes('LIST')
            ? html`<md-icon @click="${() => (pageView.grid_mode = 'LIST')}" ?active="${pageView.grid_mode == 'LIST'}"
                >format_list_bulleted</md-icon
              >`
            : ``}
          ${pageView.grid_view_options.includes('CARD')
            ? html`<md-icon @click="${() => (pageView.grid_mode = 'CARD')}" ?active="${pageView.grid_mode == 'CARD'}"
                >apps</md-icon
              >`
            : ``}
        </div>
      `
    }
  }

  /**
   * @description 버튼 컨테이너 엘리먼트 생성
   *************************************
   * @param {Object} pageView
   * @returns {HTMLElement}
   */
  static getButtonContainer(pageView) {
    if ((pageView.is_page && !pageView.isMultiLayoutPage()) || ValueUtil.isEmpty(pageView.button_elements)) {
      return html``
    } else {
      if (pageView.is_popup === true || pageView.parent_is_popup === true) {
        return html`<div footer>${pageView.button_elements}</div>`
      } else {
        return html`<div id="button-container" class="button-container">${pageView.button_elements}</div>`
      }
    }
  }
}
