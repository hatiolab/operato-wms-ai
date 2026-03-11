import '@things-factory/form-ui'
import '@things-factory/import-ui'
import '@operato/data-grist/ox-grist.js'
import '@operato/data-grist/ox-filters-form.js'
import '@operato/data-grist/ox-sorters-control.js'
import '@operato/data-grist/ox-record-creator.js'
import '@material/web/button/elevated-button.js'

import gql from 'graphql-tag'
import { css, html } from 'lit-element'

import { client } from '@operato/graphql'
import { CommonButtonStyles, CommonGristStyles, CommonHeaderStyles } from '@operato/styles'
import { isMobileDevice } from '@operato/utils'
import { i18next, localize } from '@things-factory/i18n-base'
import { PageView } from '@things-factory/shell'
import { MetaApi } from '../../utils/meta-api'

class TemplateFileList extends localize(i18next)(PageView) {
  static get styles() {
    return [
      CommonGristStyles,
      CommonHeaderStyles,
      css`
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

  constructor() {
    super()
    this.mode = isMobileDevice() ? 'LIST' : 'GRID'
  }

  static get properties() {
    return {
      mode: String,
      config: Object
    }
  }

  get context() {
    return {
      title: i18next.t('menu.template-file-management'),
      actions: [
        {
          title: i18next.t('button.save'),
          action: this.updateTemplate.bind(this),
          ...CommonButtonStyles.save
        },
        {
          title: i18next.t('button.delete'),
          action: this.deleteTemplate.bind(this),
          ...CommonButtonStyles.delete
        }
      ]
    }
  }

  render() {
    let mode = this.mode

    return html`
      <ox-grist
        .config=${this.config}
        .mode=${mode}
        .fetchHandler=${this.fetchHandler.bind(this)}
      >
        <div slot="headroom" class="header">
          <div id="filters" class="filters">
            <ox-filters-form></ox-filters-form>

            <div id="modes">
              <md-icon @click=${() => (this.mode = 'GRID')} ?active=${mode == 'GRID'}>grid_on</md-icon>
              <md-icon @click=${() => (this.mode = 'LIST')} ?active=${mode == 'LIST'}>format_list_bulleted</md-icon>
              <md-icon @click=${() => (this.mode = 'CARD')} ?active=${mode == 'CARD'}>apps</md-icon>
            </div>

          </div>
        </div>
      </ox-grist>
    `
  }

  get grist() {
    return this.renderRoot.querySelector('ox-grist')
  }

  async fetchHandler({ page, limit, sortings = [], filters = [] }) {
    const response = await client.query({
      query: gql`
        query templateFiles($filters: [Filter!], $pagination: Pagination, $sortings: [Sorting!]) {
          templateFiles(filters: $filters, pagination: $pagination, sortings: $sortings) {
            items {
              id
              name
              description
              attachment{
                id
                name
                fullpath
              }
              updatedAt
              updater {
                id
                name
              }
            }
          }
        }
      `,
      variables: { filters, pagination: { page, limit }, sortings }
    })


    let records = response.data.templateFiles.items || []


    records.map(x=>{
      x.fileName = x.attachment?.name || undefined
      return x
    })

    return {
      records: records,
      total: response.data.templateFiles.total || 0
    }
  }

  pageInitialized(lifecycle) {
    this.config = {
      rows: {
        selectable: {
          multiple: true
        },
        handlers: {
          click: 'select-row-toggle'
        },
        classifier: function (record, rowIndex) {}
      },
      columns: [
        { type: 'gutter', gutterName: 'dirty' },
        { type: 'gutter', gutterName: 'sequence' },
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'download',
          handlers: {
            click: async(columns, data, column, record, rowIndex) => {
              if(record.fileName){
                fetch(record.attachment?.fullpath, { method: 'get', mode: 'no-cors', referrerPolicy: 'no-referrer' })
                .then(res => res.blob())
                .then(res => {
                  const element = document.createElement('a')
                  element.setAttribute('download', record.attachment?.name)
                  const href = URL.createObjectURL(res)
                  element.href = href
                  element.setAttribute('target', '_blank')
                  element.click()
                  URL.revokeObjectURL(href)
                })
              }
            }
          }
        },{
          type: 'string',
          name: 'name',
          record: { editable: true, mandatory: true },
          header: i18next.t('field.name'),
          filter: {
            operator:'i_like'
          },
          sortable: true,
          width: 200
        },{
          type: 'string',
          name: 'description',
          record: { editable: true },
          header: i18next.t('field.description'),
          filter: {
            operator:'i_like'
          },
          width: 150
        },{
          type: 'string',
          name: 'fileName',
          record: { editable: false },
          header: i18next.t('label.file'),
          width: 250
        },{
          type: 'file',
          name: 'attachmentFile',
          record: { editable: true },
          header: i18next.t('text.select_file'),
          width: 200
        },{
          type: 'object',
          name: 'updater',
          header: i18next.t('field.updater'),
          width: 120
        },{
          type: 'datetime',
          name: 'updatedAt',
          header: i18next.t('field.updated_at'),
          sortable: true,
          width: 200
        },{
          type: 'string',
          name: 'id',
          header: i18next.t('field.id'),
          width: 100
        }
      ]
    }
  }

  pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      this.grist.fetch()
    } 
  }


  async updateTemplate() {
    let patches = this.grist.dirtyRecords
    if (patches && patches.length) {
      patches = patches.map(patch => {
        let patchField = patch.id ? { id: patch.id } : {}
        const dirtyFields = patch.__dirtyfields__
        for (let key in dirtyFields) {
          patchField[key] = dirtyFields[key].after
        }
        if (patchField['attachmentFile'] instanceof FileList) {
          patchField['attachmentFile'] = patchField['attachmentFile'][0]
        }
        patchField.cuFlag = patch.__dirty__

        return patchField
      })

      const response = await client.mutate({
        mutation: gql`
          mutation updateMultipleTemplateFile($patches: [TemplateFilePatch!]!) {
            updateMultipleTemplateFile(patches: $patches) {
              id
            }
          }
        `,
        variables: { patches },
        context: { hasUpload: true }
      })

      if (!response.errors) {
        this.grist.fetch()
      }
    }
  }

  async deleteTemplate() {
    if (confirm(i18next.t('text.sure_to_x', { x: i18next.t('text.delete') }))) {
      const ids = this.grist.selected.map(record => record.id)
      if (ids && ids.length > 0) {
        const response = await client.mutate({
          mutation: gql`
            mutation ($ids: [String!]!) {
              deleteTemplateFiles(ids: $ids)
            }
          `,
          variables: {
            ids
          }
        })

        if (!response.errors) {
          this.grist.fetch()
          MetaApi.showToast('info', i18next.t('text.info_x_successfully', { x: i18next.t('text.delete') }))
        }
      }
    }
  }
}

customElements.define('template-file-list', TemplateFileList)
