import { html } from 'lit'

/**
 * @description 그리드 ResourceFormatSelector 타입 렌더러
 *****************************************************
 * @param {Object} value
 * @param {Object} column
 * @param {Object} record
 * @param {Number} rowIndex
 * @param {String} field
 * @returns
 */
export const OxGristRendererResourceFormatSelector = (value, column, record, rowIndex, field) => {
  let text = ''
  
  if (value) {
    if(typeof value == 'string') {
      text = value
    } else if (typeof value == 'object') {
      let meta = column.record.options.meta
      let { title_field = 'name', desc_field = 'description' } = meta
      text = value[title_field] ? value[title_field] : ''
      text = value[desc_field] ? `${text} (${value[desc_field]})` : text  
    }
  }

  return html`<span data-reactive-tooltip>${text}</span>`
}