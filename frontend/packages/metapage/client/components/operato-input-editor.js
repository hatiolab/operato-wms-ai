import '@material/web/icon/icon.js'
import '@things-factory/barcode-ui'

import { LitElement, css, html } from 'lit-element'
import { getEditor } from '@operato/data-grist'
import { UiUtil } from '../utils/ui-util'
import { ValueUtil } from '../utils/value-util'

/**
 * @license
 * Copyright © HatioLab Inc. All rights reserved.
 * @author Shortstop <shortstop@hatiolab.com>
 * @description InputEditor
 */
export class OperatoInputEditor extends LitElement {
  /**
   * @override 스타일
   *******************
   */
  static get styles() {
    return [
      css`
        ox-input-code {
          display: grid;
          height: 31vh;
          margin-bottom: 7px;
          overflow: auto;
        }
        textarea {
          flex: 1;
          resize: none;
          border-color: var(--primary-color);
          margin-bottom: 7px;
          height: 20vh;
          outline: none;
        }
      `
    ]
  }

  /**
   * @override properties
   *************************
   */
  static get properties() {
    return {
      column: Object,
      rowIndex: Number,
      editable: false
    }
  }

  /**
   * @override firstUpdated
   **************************
   */
  async firstUpdated() {
    if (super.firstUpdated) {
      await super.firstUpdated()
    }

    // resource-selector 의 경우 event 로 변경된 값을 받아야 한다. 
    if(this.column.type == 'resource-selector'){
      this.addEventListener('field-change', e => {
        let { after, before, column, record, row } = e.detail
        this.getInput().value = after
      })
    }

    this.setReadOnly()
  }

  /**
   * @override render
   ********************
   */
  render() {
    return html` ${this.getOperatoEditor()} `
  }

  /**
   * @description 변경된 값을 리턴 : 변경된 값이 있으면 변경된 값을, 없으면 ''를 리턴한다.
   **********************************************
   * @returns
   */
  get _dirtyValue() {
    const inputObj = this.getInput()
    if (this.column.type == 'code-editor' || this.column.type == 'textarea') {
      if (inputObj.value == inputObj.org_value) {
        return ''
      }

      return this.getInput().value
    } else if(this.column.type == 'datetime'){
      if (inputObj._dirtyValue == inputObj.org_value) {
        return ''
      }

      return this.getInput()._dirtyValue

    } else if(this.column.type == 'checkbox'){
      if (inputObj._dirtyValue == inputObj.org_value) {
        return ''
      }

      return inputObj._dirtyValue
    } else if(this.column.type == 'resource-selector'){
      if(ValueUtil.isEmpty(inputObj.value)) return ''
      if(ValueUtil.isEmpty(inputObj.org_value)) return inputObj.value
      
      if(inputObj.value.id == inputObj.org_value.id) return ''

      return inputObj.value

    } else {
      return inputObj._dirtyValue
    }
  }

  /**
   * @description Input 엘리먼트의 값을 리턴
   *************************************
   * @returns
   */
  get _getValue() {
    let element = this.getLeafInput()
    return element.value
  }

  /**
   * @description 값을 에디터에 전달 (readonly 처리)
   ********************************
   * @param {String} newVal
   */
  setValue(newVal) {
    if (this.column.type == 'select-combo') {
      this.clear()

      let initValue = ''
      let optionHtml = ''

      for (let idx = 0; idx < newVal.length; idx++) {
        if (idx == 0) {
          initValue = newVal[idx].value
        }
        optionHtml += `<div option value="${newVal[idx].value}">${newVal[idx].name}</div>`
      }

      this.getLeafInput().innerHTML = optionHtml
      this.getInput().value = initValue
    } else if(this.column.type == 'datetime'){
      var datetime = new Date(newVal)
      var tzoffset = datetime.getTimezoneOffset() * 60000 //offset in milliseconds

      var setVal = new Date(newVal - tzoffset).toISOString().slice(0, -1)
      this.getInput().value = setVal
      this.getInput().org_value = newVal
      this.getInput()._dirtyValue = newVal
    } else {
      this.getInput().value = newVal
      this.getInput().org_value = newVal
    }
  }

  /**
   * @description 모든 내용을 지운다.
   *******************************
   */
  clear() {
    this.getInput().value = ''
    this.getInput().org_value = ''

    // select 콤보의 경우 option 도 삭제
    if (this.column.type == 'select') {
      let element = this.getLeafInput()
      element.options.length = 0
    } else if (this.column.type == 'select-combo') {
      let element = this.getLeafInput()
      element.innerHTML = ''
    } else if (this.column.type == 'barcode') {
      let element = this.getLeafInput()
      element.value = ''
    }
  }

  /**
   * @description 인풋 객체를 가져온다.
   ********************************
   * @returns {HTMLElement}
   */
  getInput() {
    if (this.column.type == 'code-editor' || this.column.type == 'textarea') {
      return this.renderRoot.firstElementChild.firstElementChild
    } else {
      return this.renderRoot.firstElementChild
    }
  }

  /**
   * @description 엘리먼트 내 최 하단 인풋 객체를 가져온다. (readonly 처리용)
   ****************************************************************
   * @returns {HTMLElement}
   */
  getLeafInput() {
    if (this.column.type == 'code-editor') {
      return this.renderRoot.querySelector('ox-input-code')
    } else if (this.column.type == 'textarea') {
      return this.renderRoot.querySelector('textarea')
    } else if (this.column.type == 'select-combo') {
      return this.renderRoot.querySelector('ox-select').firstElementChild
    } else if (this.column.type == 'barcode') {
      return this.renderRoot.querySelector('ox-input-barcode').renderRoot.querySelector('input')
    } else if (this.column.type == 'resource-selector') {
      return this.getInput()
    } else {
      return this.renderRoot.firstElementChild.editor
    }
  }

  /**
   * @description 에디터를 생성한다.
   ******************************
   * @returns {HTML}
   */
  getOperatoEditor() {
    if (this.column.type == 'code-editor') {
      return html` <div>
        <ox-input-code mode="javascript" tab-size="2"></ox-input-code>
      </div>`
    } else if (this.column.type == 'textarea') {
      return html` <div style="display:flex">
        <textarea></textarea>
      </div>`
    } else if (this.column.type == 'barcode') {
      return html`<ox-input-barcode></ox-input-barcode>`
    } else if (this.column.type == 'select-combo') {
      return html` <ox-select>
        <ox-popup-list align-left nowrap></ox-popup-list>
      </ox-select>`
    } else {
      return getEditor(this.column.type)('', this.column, this.column.record, this.rowIndex, {})
    }
  }

  /**
   * @description input 오브젝트에 readOnly 옵션 적용
   **********************************************
   */
  setReadOnly() {
    if (this.editable === true) return

    let editable = String(this.editable)
    let hideKeyboard = this.getAttribute('hideKeyboard') == null ? false : true
    let inputObj = this.getLeafInput()
    let tagName = inputObj.tagName.toUpperCase()

    if (editable == 'false') {
      if (tagName === 'SELECT') {
        inputObj.disabled = true
      } else if (this.column.type == 'code-editor') {
        inputObj.editor.options.readOnly = true
      } else {
        inputObj.readOnly = true
      }
    } else if (hideKeyboard == true) {
      if (tagName == 'INPUT') {
        inputObj.setAttribute('barcode', '')
        inputObj.onfocus = UiUtil.hideKeyboard
      }
    }
  }
}

customElements.define('operato-input-editor', OperatoInputEditor)
