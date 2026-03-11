import { html } from 'lit'

import { OxGristEditor } from '@operato/data-grist'
import { openPopup } from '@operato/layout'

import { TermsUtil } from '../../utils/terms-util'
import { ServiceUtil } from '../../utils/service-util'

import '../popup/ox-resource-selector-popup'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description 리소스 셀렉터 (그리드 에디터)
 *   선택했을 때 그리드 컬럼에 '타이틀 필드(설명 필드)' 형식으로 표시되고 실제값은 타이틀 필드 값이 넘어감
 */
export class OxGristEditorResourceFormatSelector extends OxGristEditor {
  /**
   * @description 프로퍼티
   ***********************
   */
  static get properties() {
    return {
      value: Object,
      column: Object,
      record: Object,
      rowIndex: Number,
      field: Object,
      popup: Object
    }
  }

  /**
   * @override firstUpdated
   **************************
   */
  async firstUpdated() {
    super.firstUpdated()
  }

  /**
   * @description 클릭 이벤트 핸들러
   *******************************
   * @param {Object} e
   */
  _ondblclick(e) {
    e.stopPropagation()
    this.openSelector()
  }

  /**
   * @description 키 다운 이벤트 핸들러
   *********************************
   * @param {Object} e
   */
  _onkeydown(e) {
    const key = e.key

    if (key == 'Enter') {
      e.stopPropagation()
      this.openSelector()
    }
  }

  /**
   * @description 그리드에 표시될 내용 렌더링
   **************************************
   */
  get editorTemplate() {
    let text = ''

    if (this.value) {
      if (typeof this.value == 'object') {
        let meta = this.column.record.options.meta
        text = meta.title_field ? this.value[meta.title_field] : ''
      } else {
        text = this.value
      }
    }

    return html`
      ${!text ? html`<span tabindex="0"></span>` : html` <span tabindex="0" style="flex:1">${text}</span> `}
    `
  }

  /**
   * @description 셀렉터 팝업 화면을 그리기 위한 메타 정보 추출
   ***************************************************
   * @returns 
   */
  async findScreenMeta() {
    let screenMeta = this.column.record && this.column.record.options && this.column.record.options.screen_meta ? this.column.record.options.screen_meta : null

    if(!screenMeta) {
      // 컬럼 정보
      let refColType = this.column.ref_col_type
      let refColName = this.column.ref_col_name

      // 참조 정보가 entity인 경우
      if (refColType == 'Entity') {
        screenMeta = await ServiceUtil.restGet(`entities/${refColName}/screen_menu_meta?codes_on_search_form=true`, {})

      // 참조 정보가 menu인 경우
      } else if (refColType == 'Menu') {
        screenMeta = await ServiceUtil.restGet(`menus/${refColName}/screen_menu_meta?is_tran_term=false&codes_on_search_form=true&buttons_off=true&params_off=true`, {})
      
      // 참조 정보가 url인 경우
      } else if (refColType == 'URL') {
        screenMeta = await ServiceUtil.restGet(refColName, {})
      }

      if(!this.column.record.options) this.column.record.options = {}
      this.column.record.options.screen_meta = screenMeta
    }

    return screenMeta
  }

  /**
   * @description 리소스 셀렉터 팝업을 오픈한다.
   ***************************************
   */
  async openSelector() {
    // 팝업 플래그 삭제
    if (this.popup) delete this.popup

    // 화면을 그리기 위한 메타 정보 추출
    let screenMeta = await this.findScreenMeta()
    // 선택 레코드의 타이틀 필드
    let titleField = this.column.record.options.meta.title_field
    // 현재 값
    let value = this.value || ''

    // 값이 변경된 경우 변경 이벤트
    const confirmCallback = selected => {
      this.dispatchEvent(
        new CustomEvent('field-change', {
          bubbles: true,
          composed: true,
          detail: {
            before: value,
            after: selected && titleField ? selected[titleField] : null,
            record: this.record,
            column: this.column,
            row: this.row
          }
        })
      )
    }

    // 리소스 셀렉터 팝업 템플릿 생성
    let template = html`
      <ox-resource-selector-popup
        .record=${this.record}
        .value=${value}
        .column_meta=${this.column}
        .screen_meta=${screenMeta}
        .confirmCallback=${confirmCallback.bind(this)}>
      </ox-resource-selector-popup>
    `

    // 팝업 오픈
    this.popup = openPopup(template, {
      backdrop: true,
      size: 'large',
      title: TermsUtil.tLabel(this.column.name)
    })
  }
}

customElements.define('ox-grist-editor-resource-format-selector', OxGristEditorResourceFormatSelector)
