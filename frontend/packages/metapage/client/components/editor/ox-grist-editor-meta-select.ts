import { html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { until } from 'lit/directives/until.js'

import { OxGristEditor, SelectOption, SelectOptionObject, GristRecord } from '@operato/data-grist'

function buildOptions(options: any[], value: any, column: any, record: GristRecord) {
  var refParams = [] as string[]

  // 관계 필드 풀기
  if(column.ref_params && column.ref_params != '') {
    var refParamArr = column.ref_params.split(',').filter(x => x.includes(':') == true)

    refParams.push(refParamArr.map(param => {
      return param.substring(param.indexOf(':') + 1)
    }))
  }

  const selectOptionObjects = options.filter(option => {
    // 관계 필드가 없다 return all
    if(refParams.length == 0) return true

    // 셀렉트 옵션에 전체( '' ) 이 포함되어 있다 return true
    if(option.value == '') return true

    // 관계 필드 값에 따라 데이터 필더링 
    for(var idx = 0 ; idx < refParams.length ; idx++) {
      var checkVal = record[refParams[idx]]
      var fieldIdx = idx + 1

      if(option['rel_field_' + fieldIdx] != checkVal) {
        return false
      }
    }

    return true

  }).map(option => {
    switch (typeof option) {
      case 'string':
        return {
          display: option,
          value: option
        }
      case 'object':
        return {
          display: option.display || option.name,
          value: option.value
        }
      default:
        return option
    }
  }) as SelectOptionObject[]

  return html`
    <select>
      ${selectOptionObjects.map(
        (option: any) => html`
          <option ?selected=${option.value == value} value=${option.value}>${option.display}</option>
        `
      )}
    </select>
  `
}

@customElement('ox-grist-editor-meta-select')
export class OxGristEditorMetaSelect extends OxGristEditor {
  get editorTemplate() {
    var rowOptionField = this.record[this.column.record.rowOptionField || '']
    var { options = [] } = rowOptionField ? rowOptionField : this.column.record

    if (typeof options == 'function') {
      options = options.call(null, this.value, this.column, this.record, this.rowIndex, this.field)

      if (options instanceof Promise) {
        return html`${until(options.then(options => buildOptions(options, this.value, this.column, this.record)))}`
      } else {
        return buildOptions((options || []) as SelectOption[], rowOptionField.display || this.value, this.column, this.record)
      }
    } else {
      return buildOptions((options || []) as SelectOption[], this.value, this.column, this.record)
    }
  }
}