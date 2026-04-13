import { FieldRenderer } from '@operato/data-grist'
import { html } from 'lit'
import { until } from 'lit/directives/until.js'
import gql from 'graphql-tag'
import { buildArgs, client } from '@operato/graphql'

const IMAGE_FALLBACK = new URL('../../../assets/images/no-image.png', import.meta.url).href

export async function getAttachmentByGraphql(id: string): Promise<any> {
  var params = {
    filters: [{ name: 'id', operator: 'eq', value: id }],
    sortings: [],
    pagination: { page: 0, limit: 0 }
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

/**
 * attachment id로 백엔드 REST API를 호출하여 스토리지 경로를 조회한다.
 * GET /rest/attachments/{id} → { path } → fullpath 구성
 */
async function getAttachment(id: string): Promise<any> {
  const response = await fetch(`/rest/attachments/${encodeURIComponent(id)}`, {
    credentials: 'include'
  })
  if (!response.ok) return null
  const att = await response.json()
  if (!att?.path) return null
  return {
    id: att.id,
    fullpath: `/rest/storage/download?path=${encodeURIComponent(att.path)}`
  }
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
