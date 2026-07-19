import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'

import { UiUtil } from '../utils/ui-util'
import { TermsUtil } from '../utils/terms-util'
import { ServiceUtil } from '../utils/service-util'

/**
 * 엑셀 임포트 템플릿 목록 화면.
 * REST /rest/excel_templates 조회·삭제, 행 클릭 시 상세 팝업(excel-template-detail) 열기.
 */
class ExcelTemplateList extends localize(i18next)(LitElement) {
  /** @type {CSSResultArray} */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-surface, #fafafa);
        }
        .toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--md-sys-color-surface-container, #f0f0f0);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }
        .toolbar h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
          flex: 1;
        }
        .btn {
          padding: 7px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-primary { background: var(--md-sys-color-primary, #1976D2); color: #fff; }
        .btn-primary:hover { background: #1565C0; }
        .btn-danger { background: #C62828; color: #fff; }
        .btn-danger:hover { background: #B71C1C; }
        .btn-default {
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }
        .btn-default:hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }

        .table-wrap {
          flex: 1;
          overflow: auto;
          padding: 12px 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: var(--md-sys-color-surface, #fff);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.08);
        }
        thead tr {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }
        th {
          padding: 10px 14px;
          text-align: left;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #555);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }
        td {
          padding: 9px 14px;
          color: var(--md-sys-color-on-surface, #333);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          vertical-align: middle;
        }
        tr.selected { background: color-mix(in srgb, var(--md-sys-color-primary, #1976D2) 10%, transparent); }
        tbody tr:hover { background: var(--md-sys-color-surface-container, #f7f7f7); cursor: pointer; }
        .empty-row td { text-align: center; padding: 40px; color: #999; }
        .chk-col { width: 40px; text-align: center; }
        .url-col { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 12px; color: #555; }
        .date-col { white-space: nowrap; font-size: 12px; color: #888; }
        .btn-import {
          padding: 4px 10px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          white-space: nowrap;
        }
        .btn-import:hover { background: #1565C0; }
        .btn-import:disabled { opacity: .4; cursor: not-allowed; }
        .btn-download {
          padding: 4px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          white-space: nowrap;
        }
        .btn-download:hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .btn-download:disabled { opacity: .4; cursor: not-allowed; }
      `
    ]
  }

  static get properties() {
    return {
      _templates: Array,
      _loading: Boolean,
      _selected: Object
    }
  }

  /** 페이지 컨텍스트 (상단 타이틀) */
  get context() {
    return { title: TermsUtil.tMenu('ExcelTemplate') || '엑셀 임포트 템플릿 관리' }
  }

  connectedCallback() {
    super.connectedCallback()
    this._templates = []
    this._loading = false
    this._selected = new Set()
    this._fetchTemplates()
  }

  render() {
    const templates = this._templates || []
    return html`
      <div class="toolbar">
        <h2>${TermsUtil.tMenu('ExcelTemplate') || '엑셀 임포트 템플릿 관리'}</h2>
        <button class="btn btn-primary" @click=${this._onCreate}>${TermsUtil.tButton('create') || '신규 등록'}</button>
        <button class="btn btn-danger" @click=${this._onDelete}>${TermsUtil.tButton('delete') || '삭제'}</button>
        <button class="btn btn-default" @click=${this._fetchTemplates}>${TermsUtil.tButton('refresh') || '새로고침'}</button>
      </div>
      <div class="table-wrap">
        ${this._loading
        ? html`<div style="padding:40px;text-align:center;color:#999">로딩 중...</div>`
        : html`
            <table>
              <thead>
                <tr>
                  <th class="chk-col"><input type="checkbox" @change=${this._onCheckAll}></th>
                  <th style="width:70px;text-align:center">다운로드</th>
                  <th>${TermsUtil.tLabel('name') || '템플릿명'}</th>
                  <th>${TermsUtil.tLabel('description') || '설명'}</th>
                  <th class="url-col">${TermsUtil.tLabel('import_url') || '임포트 URL'}</th>
                  <th class="url-col">${TermsUtil.tLabel('validate_url') || '검증 URL'}</th>
                  <th class="date-col">${TermsUtil.tLabel('updated_at') || '수정일시'}</th>
                  <th style="width:60px;text-align:center">${TermsUtil.tLabel('confirm_flag') || '확정'}</th>
                  <th style="width:80px;text-align:center"></th>
                </tr>
              </thead>
              <tbody>
                ${templates.length === 0
            ? html`<tr class="empty-row"><td colspan="9">등록된 템플릿이 없습니다. [신규 등록]을 클릭하세요.</td></tr>`
            : templates.map(t => html`
                    <tr
                      class=${this._selected.has(t.id) ? 'selected' : ''}
                      @click=${() => this._onRowClick(t)}
                    >
                      <td class="chk-col" @click=${e => e.stopPropagation()}>
                        <input type="checkbox"
                          .checked=${this._selected.has(t.id)}
                          @change=${e => this._onCheckRow(e, t.id)}>
                      </td>
                      <td style="text-align:center" @click=${e => e.stopPropagation()}>
                        <button class="btn-download"
                          ?disabled=${!t.template_attachment_id}
                          title=${t.template_attachment_id ? '템플릿 xlsx 파일 다운로드' : '등록된 템플릿 파일이 없습니다'}
                          @click=${() => this._onDownload(t)}>다운로드</button>
                      </td>
                      <td><strong>${t.name}</strong></td>
                      <td>${t.description || ''}</td>
                      <td class="url-col" title="${t.import_url}">${t.import_url || ''}</td>
                      <td class="url-col" title="${t.validate_url}">${t.validate_url || ''}</td>
                      <td class="date-col">${t.updated_at ? t.updated_at.substring(0, 16) : ''}</td>
                      <td style="text-align:center">${t.confirm_flag ? '✓' : ''}</td>
                      <td style="text-align:center" @click=${e => e.stopPropagation()}>
                        <button class="btn-import"
                          title=${t.confirm_flag ? '임포트 팝업 열기' : '확정되지 않은 템플릿입니다'}
                          @click=${() => this._onImport(t)}>임포트</button>
                      </td>
                    </tr>
                  `)
          }
              </tbody>
            </table>
          `
      }
      </div>
    `
  }

  /** 템플릿 목록 조회 */
  async _fetchTemplates() {
    this._loading = true
    try {
      const sort = encodeURIComponent('[{"field":"updated_at","ascending":false}]')
      const result = await ServiceUtil.restGet(`excel_templates?limit=500&sort=${sort}`)
      this._templates = result?.items || []
    } catch (e) {
      console.error('템플릿 조회 실패:', e)
      UiUtil.showToast('error', '템플릿 목록 조회에 실패했습니다.')
    } finally {
      this._loading = false
    }
  }

  /** 템플릿 xlsx 파일 다운로드 */
  _onDownload(template) {
    if (!template.template_attachment_id) {
      UiUtil.showToast('warning', '등록된 템플릿 파일이 없습니다.')
      return
    }
    const a = document.createElement('a')
    a.href = `/rest/attachments/${template.template_attachment_id}/download`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  /** 임포트 버튼 → confirm_flag가 true인 경우에만 dynamic-excel-import-popup 팝업 */
  _onImport(template) {
    if (!template.confirm_flag) {
      UiUtil.showToast('warning', '확정되지 않은 템플릿입니다. 템플릿을 확정한 후 임포트하세요.')
      return
    }
    const el = document.createElement('dynamic-excel-import-popup')
    el.templateName = template.name
    UiUtil.openPopupByElement(
      (template.description || template.name) + ' — 임포트',
      'large', el, true
    )
  }

  /** 행 클릭 → 상세 팝업 */
  _onRowClick(template) {
    const el = document.createElement('excel-template-detail')
    el.templateId = template.id
    el.onSaved = () => this._fetchTemplates()
    UiUtil.openPopupByElement('엑셀 템플릿 편집', 'large', el, true)
  }

  /** 신규 등록 팝업 */
  _onCreate() {
    const el = document.createElement('excel-template-detail')
    el.templateId = null
    el.onSaved = () => this._fetchTemplates()
    UiUtil.openPopupByElement('엑셀 템플릿 신규 등록', 'large', el, true)
  }

  /** 선택 행 삭제 */
  async _onDelete() {
    const ids = [...this._selected]
    if (ids.length === 0) {
      UiUtil.showToast('warning', '삭제할 템플릿을 선택하세요.')
      return
    }
    const confirmed = await UiUtil.showAlertPopup(
      'title.confirm', 'text.are_you_sure', 'question', 'confirm', 'cancel'
    )
    if (!confirmed) return
    try {
      for (const id of ids) {
        await ServiceUtil.restDelete(`excel_templates/${id}`)
      }
      this._selected = new Set()
      this._fetchTemplates()
    } catch (e) {
      console.error('삭제 실패:', e)
      UiUtil.showToast('error', '삭제에 실패했습니다.')
    }
  }

  _onCheckAll(e) {
    if (e.target.checked) {
      this._selected = new Set(this._templates.map(t => t.id))
    } else {
      this._selected = new Set()
    }
    this.requestUpdate()
  }

  _onCheckRow(e, id) {
    const sel = new Set(this._selected)
    if (e.target.checked) sel.add(id)
    else sel.delete(id)
    this._selected = sel
    this.requestUpdate()
  }
}

customElements.define('excel-template-list', ExcelTemplateList)
