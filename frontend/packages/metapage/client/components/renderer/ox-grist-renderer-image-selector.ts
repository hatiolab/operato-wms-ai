import { FieldRenderer } from '@operato/data-grist'
import { html } from 'lit'
import { until } from 'lit/directives/until.js'
import gql from 'graphql-tag'
import { buildArgs, client } from '@operato/graphql'


const IMAGE_FALLBACK = new URL('../../../assets/images/no-image.png', import.meta.url).href

async function getAttachment(id:string):Promise<any>{
  var params = {
    filters:[{name:"id", operator:"eq", value:id}],
    sortings:[],
    pagination:{page:0, limit:0}
  }

  var response = await client.query({
      query: gql`
        {
          attachments(${buildArgs(params)}) {
            items {
              id
              fullpath
            }
            total
          }
        }      
      `
  })

  let result = response.data?.attachments?.items || []

  return result[0]
}

export const OxGristRendererImageSelector: FieldRenderer = (value, column, record, rowIndex, field) => {
  const { width, height } = column.record.options || {}

  if (!value || typeof value !== 'string') {
    return html` <img
      src=${IMAGE_FALLBACK}
      width=${width}
      height=${height}
      style="object-fit: contain; max-width: 100%;"
      onerror="this.src !== '${IMAGE_FALLBACK}' && (this.src = '${IMAGE_FALLBACK}')"/>`
  }
  
  return html`${until(
    getAttachment(value).then(attach => {
      const { fullpath } = attach || { fullpath: '' }
      return html` <img
        src=${fullpath}
        width=${width}
        height=${height}
        style="object-fit: contain; max-width: 100%;"
        onerror="this.src !== '${IMAGE_FALLBACK}' && (this.src = '${IMAGE_FALLBACK}')"
      />`
    })
  )}`
}
