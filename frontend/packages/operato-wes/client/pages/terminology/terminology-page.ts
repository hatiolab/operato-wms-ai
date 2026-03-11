import '@material/web/icon/icon.js'

import '@operato/data-grist'
import '@operato/context/ox-context-page-toolbar.js'
import '@operato/input/ox-input-select-buttons.js'

import { css, html } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import gql from 'graphql-tag'

import { store, CustomAlert, PageView } from '@operato/shell'
import { client } from '@operato/graphql'
import { DataGrist, FetchOption, GristRecord } from '@operato/data-grist'
import { i18next, localize } from '@operato/i18n'
import { CommonHeaderStyles, ScrollbarStyles } from '@operato/styles'
import { isMobileDevice } from '@operato/utils'
import { getLanguages } from '@things-factory/auth-base/dist-client'

@customElement('terminology-page')
export class TerminologyPage extends connect(store)(localize(i18next)(PageView)) {
  static styles = [
    ScrollbarStyles,
    CommonHeaderStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;

        overflow: hidden;

        --grid-header-padding: 2px 0 2px 9px;
      }

      ox-grist {
        overflow-y: auto;
        flex: 1;
      }
    `
  ]

  @state() private gristConfig: any
  @state() private mode: 'CARD' | 'GRID' | 'LIST' = isMobileDevice() ? 'CARD' : 'GRID'
  @state() private state?: string[]

  @query('ox-grist') private grist!: DataGrist

  get context() {
    return {
      title: i18next.t('title.terminology'),
      search: {
        handler: (search: string) => {
          this.grist.searchText = search
        },
        value: this.grist?.searchText || ''
      },
      filter: {
        handler: () => {
          this.grist.toggleHeadroom()
        }
      },
      help: 'operato-wes/terminology',
      actions: [
        {
          title: i18next.t('button.clear-cache'),
          action: this.clearCache.bind(this),
          icon: 'ink_eraser'
        },
        {
          title: i18next.t('button.save'),
          action: this.save.bind(this),
          icon: 'save'
        },
        {
          title: i18next.t('button.delete'),
          action: this.delete.bind(this),
          icon: 'delete',
          emphasis: {
            danger: true
          }
        }
      ],
      exportable: {
        name: i18next.t('button.export'),
        data: this.exportHandler.bind(this)
      },
      toolbar: false
    }
  }

  async getFilterStatus() {
    return (await getLanguages()).map(({ code, display }) => {
      return { value: code, display }
    })
  }

  render() {
    const mode = this.mode || (isMobileDevice() ? 'LIST' : 'GRID')

    return html`
      <ox-grist .mode=${mode} .config=${this.gristConfig} .fetchHandler=${this.fetchHandler.bind(this)}>
        <div slot="headroom" class="header">
          <div class="title">${i18next.t('title.terminology')}</div>

          <div class="filters">
            <ox-filters-form autofocus></ox-filters-form>
          </div>

          <ox-context-page-toolbar class="actions" .context=${this.context}></ox-context-page-toolbar>
        </div>
      </ox-grist>
    `
  }

  async pageInitialized(lifecycle) {
    this.gristConfig = {
      list: {
        fields: ['name', 'description'],
        details: ['active', 'updatedAt']
      },
      columns: [
        { type: 'gutter', gutterName: 'sequence' },
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        {
          type: 'string',
          name: 'id',
          header: i18next.t('field.id'),
          hidden: true,
          width: 0
        },
        {
          type: 'string',
          name: 'name',
          header: i18next.t('field.name'),
          record: {
            editable: true
          },
          filter: 'search',
          sortable: true,
          width: 250
        },
        {
          type: 'select',
          name: 'locale',
          header: i18next.t('field.locale'),
          record: {
            editable: true,
            options: [{ display: '', value: '' }, ...(await this.getFilterStatus())]
          },
          width: 90,
          filter: {
            type: 'select-buttons',
            operator: 'in'
          }
        },
        {
          type: 'select',
          name: 'category',
          label: true,
          header: i18next.t('field.category'),
          record: {
            editable: true,
            options: ['', 'button', 'field', 'label', 'menu', 'text', 'title']
          },
          width: 90,
          filter: 'in',
          imex: true
        },
        {
          type: 'string',
          name: 'display',
          label: true,
          header: i18next.t('field.display'),
          record: {
            editable: true
          },
          filter: 'search',
          sortable: true,
          width: 380
        },
        {
          type: 'resource-object',
          name: 'updater',
          header: i18next.t('field.updater'),
          record: {
            editable: false
          },
          sortable: true,
          width: 120
        },
        {
          type: 'datetime',
          name: 'updatedAt',
          header: i18next.t('field.updated_at'),
          record: {
            editable: false
          },
          sortable: true,
          width: 180
        }
      ],
      rows: {
        appendable: true,
        selectable: {
          multiple: true
        }
        /*handlers: {
          click: (columns, data, column, record, rowIndex) => {
            // TODO Implement the desired sub-view(like item-view) and use it in the popup content after importing
            const popup = openPopup(html` 
                <item-view item-id=${record.id} style="background-color: white;">
                </item-view> 
              `, {
              backdrop: true,
              size: 'large',
              title: i18next.t('text.item view')
            })
            popup.onclosed = () => {
              this.grist.fetch()
            }
          }
        }*/
      },
      sorters: [
        {
          name: 'name',
          desc: true
        }
      ]
    }
  }

  async pageUpdated(changes: any, lifecycle: any) {
    if (this.active) {
      // do something here when this page just became as active
    }
  }

  async fetchHandler({ page = 1, limit = 100, sortings = [], filters = [] }: FetchOption) {
    const response = await client.query({
      query: gql`
        query ($filters: [Filter!], $pagination: Pagination, $sortings: [Sorting!]) {
          terminologies(filters: $filters, pagination: $pagination, sortings: $sortings) {
            items {
              id
              name
              locale
              category
              display
              creator {
                id
                name
              }
              createdAt
              updater {
                id
                name
              }
              updatedAt
            }

            total
          }
        }
      `,
      variables: {
        filters,
        pagination: { page, limit },
        sortings
      }
    })

    return {
      total: response.data.terminologies.total || 0,
      records: response.data.terminologies.items || []
    }
  }

  exportHandler() {
    let records = [] as GristRecord
    if (this.grist.selected && this.grist.selected.length > 0) {
      records = this.grist.selected
    } else {
      records = this.grist.data.records
    }

    var headerSetting = this.grist.compiledConfig.columns
      .filter(column => column.type !== 'gutter' && column.record !== undefined && column.imex !== undefined)
      .map(column => {
        return column.imex === true
          ? {
              header: column.header.renderer(column),
              key: column.name,
              width: column.width,
              type: column.type
            }
          : column.imex
      })

    var data = records.map(item => {
      return {
        id: item.id,
        ...this.gristConfig.columns
          .filter(column => column.type !== 'gutter' && column.record !== undefined && column.imex !== undefined)
          .reduce((record, column) => {
            const key = column.imex === true ? column.name : column.imex.key
            record[key] = key
              .split('.')
              .reduce((obj, key) => (obj && obj[key] !== 'undefined' ? obj[key] : undefined), item)
            return record
          }, {})
      }
    })

    return { header: headerSetting, data: data }
  }

  async delete() {
    const selectedRecords = this.grist.selected

    if (!selectedRecords || selectedRecords.length == 0) {
      this.showToast(i18next.t('text.NOTHING_SELECTED'))
    } else {
      const answer = await CustomAlert({
        type: 'question',
        title: i18next.t('button.delete'),
        text: i18next.t('text.are_you_sure'),
        confirmButton: { text: i18next.t('button.delete') },
        cancelButton: { text: i18next.t('button.cancel') }
      })

      if (!answer) {
        return
      }

      let ids = selectedRecords.map(record => record.id)

      const response = await client.mutate({
        mutation: gql`
          mutation ($ids: [String!]!) {
            deleteTerminologies(ids: $ids)
          }
        `,
        variables: {
          ids
        }
      })

      this.grist.fetch()

      return response.data.deleteTerminologies
    }
  }

  async clearCache() {
    const response = await client.mutate({
      mutation: gql`
        mutation {
          clearTranslationsCache
        }
      `
    })

    if (!response.errors) {
      this.showToast(i18next.t('text.info_x_successfully', { x: i18next.t('text.clearing-cache') }))
    }
  }

  async save() {
    let changedRecords = this.grist.dirtyRecords

    if (!changedRecords || changedRecords.length == 0) {
      this.showToast(i18next.t('text.nothing_changed'))
    } else {
      const patches = changedRecords.map(patch => {
        const patchField: any = patch.id ? { id: patch.id } : {}
        const dirtyFields = patch.__dirtyfields__
        for (let key in dirtyFields) {
          patchField[key] = dirtyFields[key].after
        }
        patchField.cuFlag = patch.__dirty__

        return patchField
      })

      const response = await client.mutate({
        mutation: gql`
          mutation ($patches: [TerminologyPatch!]!) {
            updateMultipleTerminologies(patches: $patches) {
              id
            }
          }
        `,
        variables: {
          patches
        }
      })

      this.grist.fetch()
    }
  }

  showToast(message: string) {
    document.dispatchEvent(new CustomEvent('notify', { detail: { message } }))
  }
}
