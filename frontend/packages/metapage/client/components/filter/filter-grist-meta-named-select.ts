import { html } from 'lit-html'
import { openPopup } from '@operato/layout'
import { TermsUtil } from '../../utils/terms-util'
import { ServiceUtil } from '../../utils/service-util'

import '../popup/ox-resource-selector-popup'
import { ColumnConfig, FilterConfig, FilterConfigObject, FilterSelectRenderer } from '@operato/data-grist'

/**
 * @description 리소스 셀렉터 팝업 실행
 **********************************
 * @param {Object} owner
 * @param {Object} input
 * @param {Object} column
 * @param {*} value
 */
async function openResourceSelector(owner: Element, input: HTMLInputElement, column: ColumnConfig, value: any) {
  // 화면을 그리기 위한 메타 정보 추출
  let screenMeta = await getResourceMeta(column, true)

  // 리소스 셀렉터 팝업의 레코드 선택시 콜백 함수
  const confirmCallback = selected => {
    // 해당 엔티티 혹은 메뉴의 타이틀 필드, 설명 필드값 추출
    let titleField = column.record.options.screen_meta.menu.title_field

    // 타이틀 값을 추출하여 셀렉터 표시값을 검색 필드 입력 컴포넌트에 설정
    let codeValue = selected && titleField ? selected[titleField] : ''
    input.value = codeValue

    // 검색 폼 코드값 입력 컴포넌트에 코드값을 설정
    let codeInput = findInputByColumnName(owner, column.name)
    codeInput.value = codeValue

    // change 이벤트 발생
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // 연관 컴포넌트 조회 조건 설정을 위해 필터 폼 레코드 추출 ...
  // @ts-ignore
  let refParams = column.ref_params
  let record = findRelatedRecord(owner, refParams)

  // 템플릿 구성
  let template = html`
    <ox-resource-selector-popup
      .value=${value}
      .record=${record}
      .column_meta=${column}
      .screen_meta=${screenMeta}
      .confirmCallback=${confirmCallback}>
    </ox-resource-selector-popup>`

  // 리소스 셀렉터 팝업 실행
  openPopup(template, {
    backdrop: true,
    size: 'large',
    title: TermsUtil.tLabel(column.name)
  })
}

/**
 * 메뉴 정의
 ************
 */
type Menu = {
  id?: string;
  name?: string;
  resource_url?: string;
  id_field?: string;
  title_field?: string;
  desc_field?: string;
}

/**
 * @description 리소스 메타 정보 조회
 **********************************
 * @param {Object} column
 * @param {Boolean} columnsOn
 * @returns {Object}
 */
async function getResourceMeta(column: ColumnConfig, columnsOn: boolean) {
  // 컬럼 정보에서 메타 관련 정보 추출
  const { record, filter } = column
  if(!record.options) record.options = {}

  // 리소스 메타 정보 스킴
  var screenMeta: {
    menu: Menu
    grid_config: any[]
    search_form_fields: any[]
    search_hidden_fields: any[]
    select_fields: string[]
    sort_fields: any[]
  }

  // 리소스 셀렉터 팝업을 구성하기 위해 메타 정보 추출
  if (record.options && record.options.screen_meta) {
    screenMeta = record.options.screen_meta

  } else {
    // 메타 데이터 조회 및 구성
    let refColType = (filter! as FilterConfig & { ref_col_type: string; ref_col_name: string }).ref_col_type
    let refColName = (filter! as FilterConfig & { ref_col_type: string; ref_col_name: string }).ref_col_name

    // 메타 정보 추출 - 참조 정보가 Entity인 경우
    if (refColType == 'Entity') {
      let serviceUrl = `entities/${refColName}/screen_menu_meta?columns_off=${!columnsOn}&codes_on_search_form=true`
      screenMeta = await ServiceUtil.restGet(serviceUrl, {})

    // 메타 정보 추출 - 참조 정보가 Menu인 경우
    } else if (refColType == 'Menu') {
      let serviceUrl = `menus/${refColName}/screen_menu_meta?columns_off=${!columnsOn}&is_tran_term=false&codes_on_search_form=true&buttons_off=true&params_off=true`
      screenMeta = await ServiceUtil.restGet(serviceUrl, {})
    }

    column.record.options.screen_meta = screenMeta!
  }

  return screenMeta!
}

/**
 * @description 참조 관계 관련해서 필터 폼의 레코드를 찾아 리턴
 ****************************************************
 * @param owner
 * @param refParams
 * @returns
 */
function findRelatedRecord(owner: Element, refParams: string) {
  let record = {}

  if(refParams) {
    // refParams를 ','로 구분하여 참조 파라미터 이름을 추출하여 아래 내용으로 값을 추출하여 record에 설정한다.
    let refParamsArr = refParams.split(',')
    for(let i = 0 ; i < refParamsArr.length ; i++) {
      let refParamStr = refParamsArr[i].trim()
      let refParamArr = refParamStr.split('=')
      let refParamName = refParamArr[0].trim()
      let releatedInput = findInputByColumnName(owner, refParamName)
      let relatedInputVal = releatedInput.value
      record[refParamName] = relatedInputVal
    }
  }

  return record
}

/**
 * @description 컬럼명으로 Input 엘리먼트를 찾기
 ********************************************
 * @param owner 
 * @param colName 
 * @returns {Element}
 */
function findInputByColumnName(owner: Element, colName: string) {
  return owner.tagName.toLowerCase() == 'ox-grid-header'
  ? //@ts-ignore
    owner.renderRoot.querySelector(`[name="${colName}"]`)
  : //@ts-ignore
    owner.renderRoot.querySelector(`form [name="${colName}"]`)
}

/**
 * @description 메타 기반의 ResourceFormatSelector 그리드 필터
 *********************************************************
 * @param {Object} column
 * @param {String} value
 * @param {Object} owner
 * @returns
 */
export const FilterGristMetaNamedSelect: FilterSelectRenderer = (column, value, owner) => {
  const { filter, name } = column
  const { operator = 'eq' } = filter as FilterConfigObject
  var text = value || ''

  return operator === 'eq' ? html`
    <input name="${name}" .value=${value || ''} type="text" hidden />
    <input
      type="text"
      readonly
      name="${name}_disp"
      .value=${text}
      @click=${e => {
        e.stopPropagation()
        const input = e.target
        // 리소스 셀렉터 팝업 실행
        openResourceSelector(owner, input, column, value)
      }}
    />
    <md-icon style="--md-icon-size: 18px;margin-left: -24px;">manage_search</md-icon>
  ` : html``
}