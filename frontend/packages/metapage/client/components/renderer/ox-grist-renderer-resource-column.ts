import { html } from 'lit'
import { FieldRenderer } from '@operato/data-grist'

/**
 * @description 그리드 ResourceColumn 타입 렌더러
 *********************************************
 * @param {Object} value
 * @param {Object} column
 * @param {Object} record
 * @param {Number} rowIndex
 * @param {String} field
 * @returns
 */
export const OxGristRendererResourceColumn: FieldRenderer = (value, column, record, rowIndex, field) => {
  let text = ''
  
  if (value) {
    if(typeof value == 'string') {
      text = value
    } else if (typeof value == 'object') {
      if(column.record.resource_display){
        let display = column.record.resource_display
        Object.keys(value).forEach(key=>{
          let field = `:${key}`
          if(display.includes(field)){
            display = display.replaceAll(field, value[key])
          }
        })

        text = display
      } else {
        let meta = column.record.options.meta
        let { title_field = 'name', desc_field = 'description' } = meta
        text = value[title_field] ? value[title_field] : ''
        text = value[desc_field] ? `${text} (${value[desc_field]})` : text  
      }
    }
  }
  
  return html`<span data-reactive-tooltip>${text}</span>`
}
