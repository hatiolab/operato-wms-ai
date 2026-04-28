import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * SKU 검색 팝업
 *
 * 사용법:
 *   const el = document.createElement('rwa-sku-search-popup')
 *   el.comCd = 'COM001'  // 선택적: 화주사 필터
 *   el.addEventListener('sku-selected', e => { ... e.detail.sku ... })
 *   UiUtil.openPopupByElement('SKU 검색', 'large', el, true)
 */
class RwaSkuSearchPopup extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-background);
          overflow: hidden;
        }

        .search-bar {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          background: var(--md-sys-color-surface);
        }

        .search-bar input {
          flex: 1;
          padding: 9px 12px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface);
          outline: none;
        }

        .search-bar input:focus {
          border-color: var(--md-sys-color-primary);
        }

        .search-bar button {
          padding: 9px 20px;
          border: none;
          border-radius: 8px;
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .search-bar button:hover {
          opacity: 0.9;
        }

        .list-area {
          flex: 1;
          overflow: auto;
          padding: 0 20px 16px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          position: sticky;
          top: 0;
          background: var(--md-sys-color-surface-variant);
          z-index: 1;
        }

        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          font-size: 14px;
        }

        th {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          white-space: nowrap;
        }

        tbody tr {
          cursor: pointer;
          transition: background 0.15s;
        }

        tbody tr:hover {
          background: var(--md-sys-color-primary-container);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .empty-state .icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.4;
        }

        .empty-state .text {
          font-size: 14px;
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
          background: var(--md-sys-color-surface);
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .pagination button {
          padding: 6px 14px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 6px;
          background: transparent;
          font-size: 13px;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination button:not(:disabled):hover {
          background: var(--md-sys-color-surface-variant);
        }
      `
    ]
  }

  static get properties() {
    return {
      comCd: String,
      skus: Array,
      loading: Boolean,
      keyword: String,
      page: Number,
      totalCount: Number
    }
  }

  constructor() {
    super()
    this.comCd = ''
    this.skus = []
    this.loading = false
    this.keyword = ''
    this.page = 1
    this.totalCount = 0
    this._limit = 20
  }

  connectedCallback() {
    super.connectedCallback()
    this._search()
  }

  render() {
    const totalPages = Math.max(1, Math.ceil(this.totalCount / this._limit))

    return html`
      <div class="search-bar">
        <input
          type="text"
          placeholder="${i18next.t('placeholder.sku_cd_or_nm', { defaultValue: 'SKU 코드 또는 상품명 입력' })}"
          .value="${this.keyword}"
          @input="${e => { this.keyword = e.target.value }}"
          @keydown="${e => e.key === 'Enter' && this._onSearch()}"
        />
        <button @click="${this._onSearch}">🔍 ${i18next.t('button.search', { defaultValue: '검색' })}</button>
      </div>

      <div class="list-area">
        ${this.loading
          ? html`<div class="loading-state">검색 중...</div>`
          : this.skus.length === 0
            ? html`
                <div class="empty-state">
                  <div class="icon">📦</div>
                  <div class="text">${i18next.t('text.no_sku_found', { defaultValue: '검색 결과가 없습니다' })}</div>
                </div>
              `
            : html`
                <table>
                  <thead>
                    <tr>
                      <th style="width:140px">${i18next.t('label.sku_cd', { defaultValue: 'SKU 코드' })}</th>
                      <th>${i18next.t('label.sku_nm', { defaultValue: '상품명' })}</th>
                      <th style="width:160px">${i18next.t('label.sku_barcd', { defaultValue: '바코드' })}</th>
                      <th style="width:120px">${i18next.t('label.com_cd', { defaultValue: '화주사' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.skus.map(
                      sku => html`
                        <tr @click="${() => this._selectSku(sku)}">
                          <td>${sku.sku_cd || ''}</td>
                          <td>${sku.sku_nm || ''}</td>
                          <td>${sku.sku_barcd || ''}</td>
                          <td>${sku.com_cd || ''}</td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              `}
      </div>

      ${!this.loading && this.skus.length > 0
        ? html`
            <div class="pagination">
              <button ?disabled="${this.page <= 1}" @click="${this._prevPage}">◀ 이전</button>
              <span>${this.page} / ${totalPages} (총 ${this.totalCount}건)</span>
              <button ?disabled="${this.page >= totalPages}" @click="${this._nextPage}">다음 ▶</button>
            </div>
          `
        : ''}
    `
  }

  /** 검색 버튼 클릭 */
  _onSearch() {
    this.page = 1
    this._search()
  }

  /** 이전 페이지 */
  _prevPage() {
    if (this.page > 1) {
      this.page--
      this._search()
    }
  }

  /** 다음 페이지 */
  _nextPage() {
    const totalPages = Math.ceil(this.totalCount / this._limit)
    if (this.page < totalPages) {
      this.page++
      this._search()
    }
  }

  /** SKU 목록 조회 */
  async _search() {
    this.loading = true
    try {
      const filters = []

      if (this.comCd) {
        filters.push({ name: 'com_cd', value: this.comCd })
      }

      if (this.keyword && this.keyword.trim()) {
        filters.push({ name: 'sku_cd', value: this.keyword.trim() })
      }

      const sort = [{ field: 'sku_cd', ascending: true }]
      const data = await ServiceUtil.searchByPagination('sku', filters, sort, this.page, this._limit)
      this.skus = data?.items || []
      this.totalCount = data?.total || 0
    } catch (err) {
      console.error('SKU 목록 조회 실패:', err)
      this.skus = []
      this.totalCount = 0
    } finally {
      this.loading = false
    }
  }

  /** SKU 행 선택 → 부모에 이벤트 전달 후 팝업 닫기 */
  _selectSku(sku) {
    this.dispatchEvent(
      new CustomEvent('sku-selected', {
        composed: true,
        bubbles: true,
        detail: { sku }
      })
    )
    UiUtil.closePopupBy(this)
  }
}

customElements.define('rwa-sku-search-popup', RwaSkuSearchPopup)
