import '@operato/data-grist'
import '@operato/input/ox-input-file.js'

import gql from 'graphql-tag'
import { css, html, LitElement } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'

import {
  ColumnConfig,
  DataGrist,
  FetchOption,
  FieldRenderer,
  FilterValue,
  GristData,
  GristRecord,
  PaginationConfig,
  SortersConfig
} from '@operato/data-grist'
import { buildArgs, client } from '@operato/graphql'
import { ScrollbarStyles } from '@operato/styles'
import { copyToClipboard, sleep } from '@operato/utils'

const FETCH_ATTACHMENT_LIST_GQL = (listParam: any) => {
  return gql`
  {
    attachments(${buildArgs(listParam)}) {
      items {
        id
        name
        description
        mimetype
        encoding
        category
        fullpath
        path
        createdAt
        updatedAt
      }
      total
    }
  }
`
}

const DELETE_ATTACHMENT_GQL = gql`
  mutation DeleteAttachment($id: String!) {
    deleteAttachment(id: $id)
  }
`

const CREATE_ATTACHMENTS_GQL = gql`
  mutation ($attachments: [NewAttachment!]!) {
    createAttachments(attachments: $attachments) {
      id
      name
      description
      mimetype
      encoding
      category
      path
      createdAt
      updatedAt
    }
  }
`

@customElement('ox-attachment-category-list-popup')
export class OxAttachmentCategoryListPopup extends LitElement {
  static styles = [
    ScrollbarStyles,
    css`
      :host {
        display: flex;

        width: 100%;

        --grid-record-emphasized-background-color: red;
        --grid-record-emphasized-color: yellow;
      }

      ox-grist {
        flex: 1;
        overflow-y: auto;

        --grid-record-emphasized-background-color: red;
        --grid-record-emphasized-color: yellow;
      }

      #headroom {
        align-items: center;
        padding: var(--padding-default) var(--spacing-large);
        border-top: 2px solid rgba(0, 0, 0, 0.2);
        background-color: var(--md-sys-color-surface);
        box-shadow: var(--box-shadow);
      }

      #filters {
        display: flex;
        flex-direction: row;
        place-content: space-between;
        margin: var(--margin-default) 0;
      }

      select {
        border: 0;
        outline: none;
        text-align: right;
      }

      @media only screen and (max-width: 460px) {
        #filters {
          flex-direction: column;
        }
      }
    `
  ]

  @property({ type: String }) category: string = ''
  @property({ type: Boolean }) creatable: boolean = false
  @property({ type: Boolean, attribute: 'without-search' }) withoutSearch: boolean = false

  @query('ox-grist') grist!: DataGrist
  @query('ox-input-file') fileUploader!: any

  render() {
    return html`
      <ox-grist .config=${this.gristConfig} .mode=${'CARD'} auto-fetch .fetchHandler=${this.fetchHandler.bind(this)}>
        <div slot="headroom" id="headroom">
          <div id="filters">
            <ox-filters-form autofocus .withoutSearch=${this.withoutSearch}></ox-filters-form>
          </div>

          <ox-input-file
            accept="*/*"
            multiple="true"
            hide-filelist
            @change=${this.onCreateAttachment.bind(this)}
          ></ox-input-file>
        </div>
      </ox-grist>
    `
  }

  async fetchHandler({ page = 1, limit = 100, sortings = [], filters = [] }: FetchOption) {
    const { items: records, total } = await this.getAttachments({ page, limit, filters, sortings })

    return {
      total,
      records
    }
  }

  get gristConfig() {
    return {
      list: {
        thumbnail: 'thumbnail',
        fields: ['name'],
        details: ['updatedAt']
      },
      columns: [
        {
          type: 'gutter',
          gutterName: 'dirty'
        },
        {
          type: 'gutter',
          gutterName: 'sequence'
        },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'open_in_new',
          handlers: {
            click: (
              columns: ColumnConfig[],
              data: GristData,
              column: ColumnConfig,
              record: GristRecord,
              rowIndex: number,
              target: HTMLElement
            ): void => {
              window.open(record.fullpath, '_blank')
            }
          }
        },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'link',
          handlers: {
            click: async (
              columns: ColumnConfig[],
              data: GristData,
              column: ColumnConfig,
              record: GristRecord,
              rowIndex: number,
              target: HTMLElement
            ): Promise<void> => {
              var { protocol, hostname, port } = location
              await copyToClipboard(`${protocol}//${hostname}:${port}${record.fullpath}`)

              target.setAttribute('data-tooltip', 'url copied!')

              const rect = target.getBoundingClientRect()
              target.style.setProperty('--tooltip-top', `${rect.top}px`)
              target.style.setProperty('--tooltip-left', `${rect.left}px`)

              await sleep(2000)
              target.removeAttribute('data-tooltip')
            }
          }
        },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'delete',
          handlers: {
            click: async (
              columns: ColumnConfig[],
              data: GristData,
              column: ColumnConfig,
              record: GristRecord,
              rowIndex: number,
              target: HTMLElement
            ): Promise<void> => {
              await this.deleteAttachment(record.id!)
              this.refreshAttachments()
            }
          }
        },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'save_alt',
          handlers: {
            click: (
              columns: ColumnConfig[],
              data: GristData,
              column: ColumnConfig,
              record: GristRecord,
              rowIndex: number,
              target: HTMLElement
            ): void => {
              const element = document.createElement('a')
              element.setAttribute('href', record.fullpath)
              element.setAttribute('download', record.name!)
              document.body.appendChild(element)
              element.click()
              element.remove()
            }
          }
        },
        {
          type: 'string',
          name: 'id',
          hidden: true
        },
        {
          type: 'string',
          name: 'name',
          header: 'name',
          record: {
            editable: true,
            align: 'left'
          },
          width: 200,
          filter: 'search',
          sortable: true
        },
        {
          type: 'string',
          name: 'description',
          header: 'description',
          record: {
            editable: true,
            align: 'left'
          },
          width: 200,
          filter: 'search'
        },
        {
          type: 'select-buttons',
          name: 'category',
          header: 'category',
          record: {
            editable: false
          },
          hidden: true
        },
        {
          type: 'image',
          name: 'thumbnail',
          hidden: true,
          record: {
            editable: false,
            renderer: function (value, column, record, rowIndex, owner) {
              return record.category == 'image'
                ? html` <img src=${record.fullpath} style="max-width: 100%; max-height: 100%;" /> `
                : record.category == 'video'
                  ? html` <video src=${record.fullpath} style="width: 100%; height: 100%;" controls></video> `
                  : html`
                      <div style="width: 100%; height: 100%;" etc>
                        <md-icon style="--md-icon-size: 24px;">insert_drive_file</md-icon>
                        <span>${record.path.substr(record.path.lastIndexOf('.'))}</span>
                      </div>
                    `
            } as FieldRenderer
          },
          handlers: {
            click: (
              columns: ColumnConfig[],
              data: GristData,
              column: ColumnConfig,
              record: GristRecord,
              rowIndex: number,
              target: HTMLElement
            ): void => {
              this.onClickSelect(record)
            }
          },
          width: 120
        },
        {
          type: 'datetime',
          name: 'updatedAt',
          header: 'updated at',
          record: {
            editable: true
          },
          sortable: true,
          width: 180
        },
        {
          type: 'datetime',
          name: 'createdAt',
          header: 'created at',
          record: {
            editable: true
          },
          sortable: true,
          width: 180
        }
      ],
      rows: {
        appendable: false,
        selectable: {
          multiple: true
        },
        handlers: {
          click: 'select-row-toggle'
        },
        classifier: function (
          record: GristRecord,
          rowIndex: number
        ): { emphasized?: boolean | string | string[]; [key: string]: any } | void {}
      },
      sorters: [
        {
          name: 'name',
          desc: false
        }
      ],
      pagination: {
        pages: [20, 30, 50, 100, 200]
      }
    }
  }

  async firstUpdated() {
    this.refreshAttachments()
  }

  onClickSelect(attachment: any) {
    this.dispatchEvent(
      new CustomEvent('attachment-selected', {
        composed: true,
        bubbles: true,
        detail: {
          attachment
        }
      })
    )
  }

  async onCreateAttachment(e: CustomEvent) {
    const files = e.detail

    await this.createAttachments(files)
    this.refreshAttachments()
  }

  async onDeleteAttachment(id: string) {
    await this.deleteAttachment(id)

    this.refreshAttachments()
  }

  async refreshAttachments() {
    this.grist.fetch()
  }

  async getAttachments({
    page = 1,
    limit = 30,
    filters = [],
    sortings = []
  }: { page?: number; limit?: number; filters?: FilterValue[]; sortings?: SortersConfig } = {}) {
    var pagination: PaginationConfig = {
      limit,
      page
    }

    if(this.category){
      filters.push({name:"category", operator:"eq", value:this.category})
    }

    var params = {
      filters,
      sortings,
      pagination
    }

    var attachmentListResponse = await client.query({
      query: FETCH_ATTACHMENT_LIST_GQL(params)
    })

    return attachmentListResponse?.data?.attachments || {}
  }

  async createAttachments(files: File[]) {
    /*
      ref. https://github.com/jaydenseric/graphql-multipart-request-spec#client
    */

    const response = await client.mutate({
      mutation: CREATE_ATTACHMENTS_GQL,
      variables: {
        attachments: files.map(file => {
          return { file }
        })
      },
      context: {
        hasUpload: true
      }
    })
  }

  async deleteAttachment(id: string) {
    const response = await client.mutate({
      mutation: DELETE_ATTACHMENT_GQL,
      variables: {
        id
      }
    })

    return response.data
  }
}
