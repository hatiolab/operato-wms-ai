import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 상품(SKU) 검색 입력 컴포넌트
 *
 * 텍스트 입력이 불편한 PDA 환경을 위해, 필드를 터치하면 검색 팝업(바텀 시트)을 띄운다.
 * 팝업에서는 텍스트 입력을 최소화하고 드롭다운으로 범위를 좁혀 상품을 고른다.
 *
 * - 제품 유형(mat_type) 드롭다운: 범위가 넓은 대분류
 * - 품목 구분(sku_type) 드롭다운: 선택된 제품 유형에 종속되는 소분류
 * - 상품명 텍스트 입력 + 엔터/돋보기: 상품명(sku_nm)만 like 검색 (상품코드는 검색 대상 제외)
 * - 하단 리스트를 스크롤하여 상품 선택
 *
 * 화주사(comCd)의 전체 SKU를 팝업 최초 진입 시 1회 로드한 뒤,
 * 드롭다운·텍스트 필터링은 모두 클라이언트 메모리에서 수행한다(PDA 응답성 확보).
 *
 * @property {string}  value       - 선택된 상품 코드(sku_cd)
 * @property {string}  comCd       - 화주사 코드(이 화주사의 상품만 조회)
 * @property {string}  placeholder - 미선택 시 표시 문구
 * @property {boolean} disabled    - 비활성화 여부
 *
 * @fires sku-select - 상품 선택 시 발생. detail: { sku_cd, sku_nm, sku }
 *
 * @example
 * <sku-search-input
 *   .comCd=${this.comCd}
 *   .value=${this.skuCd}
 *   @sku-select=${e => { this.skuCd = e.detail.sku_cd }}>
 * </sku-search-input>
 */
@customElement('sku-search-input')
export class SkuSearchInput extends LitElement {
  /** 선택된 상품 코드 */
  @property({ type: String }) value = ''
  /** 화주사 코드 (이 화주사 상품만 조회) */
  @property({ type: String }) comCd = ''
  /** 미선택 시 표시 문구 */
  @property({ type: String }) placeholder = '상품 선택'
  /** 비활성화 여부 */
  @property({ type: Boolean }) disabled = false

  /** 팝업 열림 여부 */
  @state() _open = false
  /** 화주사 전체 상품 목록 (1회 로드 후 캐시) */
  @state() _allSkus = []
  /** 상품 로딩 중 */
  @state() _loading = false
  /** 선택된 제품 유형(mat_type) */
  @state() _matType = ''
  /** 선택된 품목 구분(sku_type) */
  @state() _skuType = ''
  /** 텍스트 입력 중인 검색어 */
  @state() _term = ''
  /** 실제 적용된(엔터/돋보기) 검색어 */
  @state() _appliedTerm = ''
  /** 선택된 상품 표시 라벨 */
  @state() _selectedLabel = ''

  /** 로드 완료된 화주사 코드 (comCd 변경 감지용) */
  _loadedComCd = null

  static get styles() {
    return css`
      :host { display: block; width: 100%; }

      /* 닫힌 상태: 터치하면 팝업이 열리는 필드 */
      .field {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        box-sizing: border-box;
        padding: 9px 12px;
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 8px;
        font-size: 14px;
        color: var(--md-sys-color-on-surface, #333);
        background: var(--md-sys-color-surface-container-lowest, #fff);
        cursor: pointer;
      }
      .field.placeholder { color: var(--md-sys-color-outline, #aaa); }
      .field:active { background: var(--md-sys-color-surface-variant, #f0f0f0); }
      .field .field-text {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .field .field-icon { flex-shrink: 0; font-size: 14px; }
      :host([disabled]) .field { opacity: 0.45; pointer-events: none; }

      /* 팝업 (바텀 시트) */
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .sheet {
        background: var(--md-sys-color-surface, #fff);
        border-radius: 16px 16px 0 0;
        width: 100%;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        padding: 12px 12px env(safe-area-inset-bottom, 16px);
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
        box-sizing: border-box;
      }
      .handle {
        width: 40px;
        height: 4px;
        background: var(--md-sys-color-outline, #ccc);
        border-radius: 2px;
        margin: 0 auto 10px;
        flex-shrink: 0;
      }
      .sheet-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface, #222);
        padding: 0 4px 8px;
        flex-shrink: 0;
      }

      /* 검색어 입력 행 */
      .search-bar {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
        margin-bottom: 8px;
      }
      .search-bar input {
        flex: 1;
        min-width: 0;
        height: 38px;
        box-sizing: border-box;
        padding: 0 12px;
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 8px;
        font-size: 14px;
        color: var(--md-sys-color-on-surface, #333);
        background: var(--md-sys-color-surface-container-lowest, #fff);
        outline: none;
      }
      .search-bar input:focus { border-color: var(--md-sys-color-primary, #1976D2); }
      .search-bar .btn-search {
        flex-shrink: 0;
        width: 44px;
        height: 38px;
        border: none;
        border-radius: 8px;
        background: var(--md-sys-color-primary, #1976D2);
        color: #fff;
        font-size: 16px;
        cursor: pointer;
      }
      .search-bar .btn-search:active { opacity: 0.85; }

      /* 드롭다운 행 */
      .filter-row {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
        margin-bottom: 8px;
      }
      .filter-row .filter-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .filter-row label {
        font-size: 11px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface-variant, #666);
        padding-left: 2px;
      }
      .filter-row select {
        width: 100%;
        box-sizing: border-box;
        height: 36px;
        padding: 0 8px;
        border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        border-radius: 8px;
        font-size: 13px;
        color: var(--md-sys-color-on-surface, #333);
        background: var(--md-sys-color-surface-container-lowest, #fff);
        outline: none;
        cursor: pointer;
      }
      .filter-row select:focus { border-color: var(--md-sys-color-primary, #1976D2); }

      /* 결과 건수 */
      .result-count {
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant, #888);
        padding: 2px 4px 6px;
        flex-shrink: 0;
      }

      /* 상품 리스트 */
      .sku-list {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        min-height: 120px;
      }
      .sku-item {
        padding: 10px 10px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
        cursor: pointer;
      }
      .sku-item:active { background: var(--md-sys-color-surface-variant, #f0f0f0); }
      .sku-item.selected { background: var(--md-sys-color-primary-container, #e3f2fd); }
      .sku-item .nm {
        font-size: 14px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface, #222);
      }
      .sku-item .sub {
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant, #777);
        margin-top: 2px;
      }
      .empty {
        text-align: center;
        padding: 28px 16px;
        color: var(--md-sys-color-on-surface-variant, #999);
        font-size: 13px;
      }

      .btn-cancel {
        flex-shrink: 0;
        width: 100%;
        margin-top: 8px;
        padding: 12px;
        border: 1px solid var(--md-sys-color-outline, #ccc);
        border-radius: 8px;
        background: transparent;
        font-size: 14px;
        color: var(--md-sys-color-on-surface-variant, #555);
        cursor: pointer;
      }

      @media (min-width: 768px) {
        .backdrop { align-items: center; }
        .sheet { border-radius: 12px; width: 440px; max-width: 92vw; max-height: 80vh; }
        .handle { display: none; }
      }
    `
  }

  /** value/comCd 외부 변경 반영 */
  willUpdate(changed) {
    if (changed.has('comCd') && this.comCd !== this._loadedComCd) {
      // 화주사 변경 시 캐시 무효화 (다음 팝업 진입 시 재로드)
      this._allSkus = []
      this._loadedComCd = null
    }
    if (changed.has('value')) {
      this._syncSelectedLabel()
    }
  }

  /** 선택된 value에 해당하는 표시 라벨 동기화 */
  _syncSelectedLabel() {
    if (!this.value) {
      this._selectedLabel = ''
      return
    }
    const found = this._allSkus.find(s => s.sku_cd === this.value)
    this._selectedLabel = found
      ? `${found.sku_nm || found.sku_cd} (${found.sku_cd})`
      : this.value
  }

  /** 필드 터치 → 팝업 열기 + 상품 로드 */
  async _openPopup() {
    if (this.disabled) return
    this._open = true
    this._matType = ''
    this._skuType = ''
    this._term = ''
    this._appliedTerm = ''
    if (this._loadedComCd !== (this.comCd || '') || !this._allSkus.length) {
      await this._loadSkus()
    }
  }

  /** 팝업 닫기 */
  _closePopup() {
    this._open = false
  }

  /** 화주사 상품 전체 로드 */
  async _loadSkus() {
    this._loading = true
    try {
      const filters = []
      if (this.comCd) filters.push({ name: 'com_cd', operator: 'eq', value: this.comCd })
      const query = encodeURIComponent(JSON.stringify(filters))
      const result = await ServiceUtil.restGet(`sku?query=${query}&limit=1000`)
      const items = result?.items || result || []
      // 상품명 기준 클라이언트 정렬 (서버 정렬 파라미터 형식 의존 제거)
      this._allSkus = items.sort((a, b) => (a.sku_nm || '').localeCompare(b.sku_nm || '', 'ko'))
      this._loadedComCd = this.comCd || ''
      this._syncSelectedLabel()
    } catch (e) {
      console.error('상품 목록 조회 실패:', e)
      this._allSkus = []
    } finally {
      this._loading = false
    }
  }

  /** 제품 유형(mat_type) 옵션 목록 — 전체 상품에서 distinct */
  get _matTypeOptions() {
    const set = new Set()
    for (const s of this._allSkus) {
      if (s.mat_type) set.add(s.mat_type)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'))
  }

  /** 품목 구분(sku_type) 옵션 목록 — 선택된 제품 유형에 종속 */
  get _skuTypeOptions() {
    const set = new Set()
    for (const s of this._allSkus) {
      if (this._matType && s.mat_type !== this._matType) continue
      if (s.sku_type) set.add(s.sku_type)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'))
  }

  /** 현재 필터(제품유형/품목구분/상품명 like)가 적용된 상품 목록 */
  get _filteredSkus() {
    const term = (this._appliedTerm || '').trim().toLowerCase()
    return this._allSkus.filter(s => {
      if (this._matType && s.mat_type !== this._matType) return false
      if (this._skuType && s.sku_type !== this._skuType) return false
      // 상품명(sku_nm)만 like 검색 — 상품코드는 검색 대상 제외
      if (term && !(s.sku_nm || '').toLowerCase().includes(term)) return false
      return true
    })
  }

  /** 제품 유형 선택 — 품목 구분은 초기화(종속 관계) */
  _onMatTypeChange(e) {
    this._matType = e.target.value
    this._skuType = ''
  }

  /** 품목 구분 선택 */
  _onSkuTypeChange(e) {
    this._skuType = e.target.value
  }

  /** 텍스트 입력값 보관 */
  _onTermInput(e) {
    this._term = e.target.value
  }

  /** 엔터 시 검색 적용 */
  _onTermKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this._applyTerm()
    }
  }

  /** 돋보기/엔터 — 상품명 like 검색 적용 */
  _applyTerm() {
    this._appliedTerm = this._term
  }

  /** 상품 선택 → 이벤트 발행 후 팝업 닫기 */
  _select(sku) {
    this.value = sku.sku_cd
    this._selectedLabel = `${sku.sku_nm || sku.sku_cd} (${sku.sku_cd})`
    this._open = false
    this.dispatchEvent(new CustomEvent('sku-select', {
      detail: { sku_cd: sku.sku_cd, sku_nm: sku.sku_nm, sku },
      bubbles: true,
      composed: true
    }))
  }

  render() {
    return html`
      <div class="field ${this._selectedLabel ? '' : 'placeholder'}"
        @click=${this._openPopup}>
        <span class="field-text">${this._selectedLabel || this.placeholder}</span>
        <span class="field-icon">🔍</span>
      </div>
      ${this._open ? this._renderPopup() : ''}
    `
  }

  /** 검색 팝업 렌더링 */
  _renderPopup() {
    const list = this._filteredSkus
    return html`
      <div class="backdrop" @click=${this._closePopup}>
        <div class="sheet" @click=${e => e.stopPropagation()}>
          <div class="handle"></div>
          <div class="sheet-title">${TermsUtil.tText('select_sku') || '상품 선택'}</div>

          <div class="search-bar">
            <input type="text"
              placeholder="${TermsUtil.tLabel('sku_nm') || '상품명'} ${TermsUtil.tButton('search') || '검색'}"
              autocomplete="off"
              .value=${this._term}
              @input=${this._onTermInput}
              @keydown=${this._onTermKeydown}>
            <button class="btn-search" @click=${this._applyTerm}>🔍</button>
          </div>

          <div class="filter-row">
            <div class="filter-col">
              <label>${TermsUtil.tLabel('mat_type') || '제품 유형'}</label>
              <select @change=${this._onMatTypeChange}>
                <option value="" ?selected=${!this._matType}>${TermsUtil.tText('all') || '전체'}</option>
                ${this._matTypeOptions.map(v => html`
                  <option value=${v} ?selected=${this._matType === v}>${v}</option>
                `)}
              </select>
            </div>
            <div class="filter-col">
              <label>${TermsUtil.tLabel('sku_type') || '품목 구분'}</label>
              <select @change=${this._onSkuTypeChange}>
                <option value="" ?selected=${!this._skuType}>${TermsUtil.tText('all') || '전체'}</option>
                ${this._skuTypeOptions.map(v => html`
                  <option value=${v} ?selected=${this._skuType === v}>${v}</option>
                `)}
              </select>
            </div>
          </div>

          <div class="result-count">
            ${this._loading
        ? (TermsUtil.tLabel('loading') || '조회 중...')
        : `${TermsUtil.tLabel('total') || '전체'} ${list.length}${TermsUtil.tText('count_unit') || '건'}`}
          </div>

          <div class="sku-list">
            ${this._loading
        ? ''
        : list.length === 0
          ? html`<div class="empty">${TermsUtil.tText('no_data') || '상품이 없습니다'}</div>`
          : list.map(sku => html`
                  <div class="sku-item ${this.value === sku.sku_cd ? 'selected' : ''}"
                    @click=${() => this._select(sku)}>
                    <div class="nm">${sku.sku_nm || sku.sku_cd}</div>
                    <div class="sub">
                      ${sku.sku_cd}
                      ${sku.mat_type ? ` · ${sku.mat_type}` : ''}
                      ${sku.sku_type ? ` · ${sku.sku_type}` : ''}
                    </div>
                  </div>
                `)}
          </div>

          <button class="btn-cancel" @click=${this._closePopup}>
            ${TermsUtil.tButton('cancel') || '취소'}
          </button>
        </div>
      </div>
    `
  }
}
