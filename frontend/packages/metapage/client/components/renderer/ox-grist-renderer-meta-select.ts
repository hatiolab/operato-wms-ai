import { html } from 'lit'
import { until } from 'lit/directives/until.js'

import { FieldRenderer, SelectOption, SelectOptionObject } from '@operato/data-grist'

/**
 * @description ???
 *************************
 * @param options 
 * @param value 
 * @returns 
 */
function buildOptions(options: SelectOption[], value: any) {
  const selectOptionObjects = options.map(option => {
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

  var res = selectOptionObjects
    ? selectOptionObjects.filter((option: any) => option.value == String(value == null ? '' : value))
    : []

  if (res.length) {
    return html`<span>${res[0].display || res[0].name || ''}</span>`
  }

  return html`<span>${value}</span>`
}

/**
 * @description ???
 ******************************
 * @param value
 * @param column 
 * @param record 
 * @param rowIndex 
 * @param field 
 * @returns 
 */
export const OxGristRendererMetaSelect: FieldRenderer = (value, column, record, rowIndex, field) => {
  if (value == null) {
    return ''
  }

  var rowOptionField = column.record.rowOptionField && record[column.record.rowOptionField]
  var options = rowOptionField?.options ? rowOptionField.options : column.record.options

  if (!options) {
    console.error(`options value for select '${column.name}' column is mandatory.`)

  } else if (typeof options == 'function') {
    options = options.call(null, value, column, record, rowIndex, field)

    if (options instanceof Promise) {
      return html`${until(
        options.then(options => buildOptions(options, value)),
        value
      )}`
    } else {
      return buildOptions((options || []) as SelectOption[], value)
    }
  } else {
    return buildOptions((options || []) as SelectOption[], value)
  }
}
