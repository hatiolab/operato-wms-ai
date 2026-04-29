import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * VAS BOM 검색 팝업
 *
 * 사용법:
 *   const el = document.createElement('vas-bom-search-popup')
 *   el.addEventListener('bom-selected', e => { ... e.detail.bom ... })
 *   UiUtil.openPopupByElement('세트 상품 검색', 'large', el, true)
 */
class VasBomSearchPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 정의 */
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

        /* 검색 영역 */
        .search-area {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          background: var(--md-sys-color-surface);
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .search-field.f-bom     { flex: 2; }
        .search-field.f-sku-cd  { flex: 2; }
        .search-field.f-sku-nm  { flex: 3; }
        .search-field.f-com     { flex: 1.5; }
        .search-field.f-type    { flex: 1.5; }

        .search-field label {
          font-size: 12px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
        }

        .search-field input,
        .search-field select {
          padding: 8px 10px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface);
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }

        .search-field input:focus,
        .search-field select:focus {
          border-color: var(--md-sys-color-primary);
        }

        .search-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
          padding-bottom: 1px;
        }

        .search-actions button {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-search {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .btn-search:hover {
          opacity: 0.9;
        }

        .btn-reset {
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface-variant);
          border: 1px solid var(--md-sys-color-outline-variant) !important;
        }

        .btn-reset:hover {
          background: #e0e0e0;
        }

        /* 목록 영역 */
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

        th,
        td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          font-size: 13px;
        }

        th {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          white-space: nowrap;
        }

        td.center {
          text-align: center;
        }

        tbody tr {
          cursor: pointer;
          transition: background 0.15s;
        }

        tbody tr:hover {
          background: var(--md-sys-color-primary-container);
        }

        /* 상태 뱃지 */
        .status-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-badge.active {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .status-badge.inactive {
          background: #F5F5F5;
          color: #757575;
        }

        /* 유형 뱃지 */
        .type-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          background: var(--md-sys-color-secondary-container, #E3F2FD);
          color: var(--md-sys-color-on-secondary-container, #1565C0);
        }

        /* 빈 상태 */
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

        /* 로딩 */
        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
        }

        /* 페이지네이션 */
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

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      boms: Array,
      loading: Boolean,
      searchForm: Object,
      page: Number,
      totalCount: Number
    }
  }

  /** 생성자 - 검색 폼 및 목록 초기화 */
  constructor() {
    super()
    this.boms = []
    this.loading = false
    this.searchForm = {
      bomNo: '',
      setSkuCd: '',
      setSkuNm: '',
      vasType: 'SET_ASSEMBLY',
      comCd: ''
    }
    this.page = 1
    this.totalCount = 0
    this._limit = 20
  }

  /** 컴포넌트 마운트 시 전체 목록 초기 조회 */
  connectedCallback() {
    super.connectedCallback()
    this._search()
  }

  /** 화면 렌더링 - 검색 영역, 목록, 페이지네이션 */
  render() {
    const totalPages = Math.max(1, Math.ceil(this.totalCount / this._limit))

    return html`
      <!-- 검색 영역 (한 줄) -->
      <div class="search-area">
        <div class="search-field f-bom">
          <label>BOM 코드</label>
          <input
            type="text"
            placeholder="BOM 코드 입력"
            .value="${this.searchForm.bomNo}"
            @input="${e => this._updateSearchForm('bomNo', e.target.value)}"
            @keydown="${e => e.key === 'Enter' && this._onSearch()}"
          />
        </div>

        <div class="search-field f-sku-cd">
          <label>세트상품코드</label>
          <input
            type="text"
            placeholder="세트상품코드 입력"
            .value="${this.searchForm.setSkuCd}"
            @input="${e => this._updateSearchForm('setSkuCd', e.target.value)}"
            @keydown="${e => e.key === 'Enter' && this._onSearch()}"
          />
        </div>

        <div class="search-field f-sku-nm">
          <label>상품명</label>
          <input
            type="text"
            placeholder="상품명 입력"
            .value="${this.searchForm.setSkuNm}"
            @input="${e => this._updateSearchForm('setSkuNm', e.target.value)}"
            @keydown="${e => e.key === 'Enter' && this._onSearch()}"
          />
        </div>

        <div class="search-field f-com">
          <label>화주사</label>
          <input
            type="text"
            placeholder="화주사 코드"
            .value="${this.searchForm.comCd}"
            @input="${e => this._updateSearchForm('comCd', e.target.value)}"
            @keydown="${e => e.key === 'Enter' && this._onSearch()}"
          />
        </div>

        <div class="search-field f-type">
          <label>유형</label>
          <select
            .value="${this.searchForm.vasType}"
            @change="${e => this._updateSearchForm('vasType', e.target.value)}"
          >
            <option value="">전체</option>
            <option value="SET_ASSEMBLY" ?selected="${this.searchForm.vasType === 'SET_ASSEMBLY'}">세트 구성</option>
            <option value="DISASSEMBLY" ?selected="${this.searchForm.vasType === 'DISASSEMBLY'}">세트 해체</option>
            <option value="REPACK" ?selected="${this.searchForm.vasType === 'REPACK'}">재포장</option>
            <option value="LABEL" ?selected="${this.searchForm.vasType === 'LABEL'}">라벨링</option>
            <option value="CUSTOM" ?selected="${this.searchForm.vasType === 'CUSTOM'}">기타</option>
          </select>
        </div>

        <div class="search-actions">
          <button class="btn-reset" @click="${this._onReset}">초기화</button>
          <button class="btn-search" @click="${this._onSearch}">🔍 검색</button>
        </div>
      </div>

      <!-- 목록 영역 -->
      <div class="list-area">
        ${this.loading
          ? html`<div class="loading-state">검색 중...</div>`
          : this.boms.length === 0
            ? html`
                <div class="empty-state">
                  <div class="icon">📦</div>
                  <div class="text">검색 결과가 없습니다</div>
                </div>
              `
            : html`
                <table>
                  <thead>
                    <tr>
                      <th style="width:50px" class="center">순서</th>
                      <th style="width:160px">BOM 코드</th>
                      <th style="width:140px">세트상품코드</th>
                      <th>상품명</th>
                      <th style="width:110px">유형</th>
                      <th style="width:100px">화주사</th>
                      <th style="width:80px" class="center">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.boms.map(
                      (bom, idx) => html`
                        <tr @click="${() => this._selectBom(bom)}">
                          <td class="center">${(this.page - 1) * this._limit + idx + 1}</td>
                          <td>${bom.bom_no || '-'}</td>
                          <td>${bom.set_sku_cd || '-'}</td>
                          <td>${bom.set_sku_nm || '-'}</td>
                          <td>
                            <span class="type-badge">${this._vasTypeLabel(bom.vas_type)}</span>
                          </td>
                          <td>${bom.com_cd || '-'}</td>
                          <td class="center">
                            <span class="status-badge ${bom.status === 'ACTIVE' ? 'active' : 'inactive'}">
                              ${bom.status === 'ACTIVE' ? '활성' : '비활성'}
                            </span>
                          </td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              `}
      </div>

      <!-- 페이지네이션 -->
      ${!this.loading && this.boms.length > 0
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

  /* ============================================================
   * 이벤트 핸들러
   * ============================================================ */

  /** 검색 버튼 클릭 - 페이지 1로 초기화 후 검색 */
  _onSearch() {
    this.page = 1
    this._search()
  }

  /** 초기화 버튼 클릭 - 검색 폼 초기화 후 세트 구성 기준 검색 */
  _onReset() {
    this.searchForm = {
      bomNo: '',
      setSkuCd: '',
      setSkuNm: '',
      vasType: 'SET_ASSEMBLY',
      comCd: ''
    }
    this.page = 1
    this._search()
  }

  /** 이전 페이지 이동 */
  _prevPage() {
    if (this.page > 1) {
      this.page--
      this._search()
    }
  }

  /** 다음 페이지 이동 */
  _nextPage() {
    const totalPages = Math.ceil(this.totalCount / this._limit)
    if (this.page < totalPages) {
      this.page++
      this._search()
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** BOM 목록 조회 (검색 조건 기반 페이지네이션) */
  async _search() {
    this.loading = true
    try {
      const filters = []

      if (this.searchForm.bomNo && this.searchForm.bomNo.trim()) {
        filters.push({ name: 'bom_no', value: this.searchForm.bomNo.trim() })
      }
      if (this.searchForm.setSkuCd && this.searchForm.setSkuCd.trim()) {
        filters.push({ name: 'set_sku_cd', value: this.searchForm.setSkuCd.trim() })
      }
      if (this.searchForm.setSkuNm && this.searchForm.setSkuNm.trim()) {
        filters.push({ name: 'set_sku_nm', value: this.searchForm.setSkuNm.trim() })
      }
      if (this.searchForm.vasType) {
        filters.push({ name: 'vas_type', value: this.searchForm.vasType })
      }
      if (this.searchForm.comCd && this.searchForm.comCd.trim()) {
        filters.push({ name: 'com_cd', value: this.searchForm.comCd.trim() })
      }

      const sort = [{ field: 'bom_no', ascending: true }]
      const data = await ServiceUtil.searchByPagination('vas_boms', filters, sort, this.page, this._limit)
      this.boms = data?.items || []
      this.totalCount = data?.total || 0
    } catch (err) {
      console.error('BOM 목록 조회 실패:', err)
      this.boms = []
      this.totalCount = 0
    } finally {
      this.loading = false
    }
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** 검색 폼 필드값 업데이트 (불변성 유지) */
  _updateSearchForm(field, value) {
    this.searchForm = { ...this.searchForm, [field]: value }
  }

  /** BOM 행 선택 → 부모에 이벤트 전달 후 팝업 닫기 */
  _selectBom(bom) {
    this.dispatchEvent(
      new CustomEvent('bom-selected', {
        composed: true,
        bubbles: true,
        detail: { bom }
      })
    )
    UiUtil.closePopupBy(this)
  }

  /** VAS 유형 코드를 한글 라벨로 변환 */
  _vasTypeLabel(type) {
    const labels = {
      SET_ASSEMBLY: '세트 구성',
      DISASSEMBLY: '세트 해체',
      REPACK: '재포장',
      LABEL: '라벨링',
      CUSTOM: '기타'
    }
    return labels[type] || type || '-'
  }
}

customElements.define('vas-bom-search-popup', VasBomSearchPopup)
