import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * 재고 이동 이력 추적 화면
 *
 * 상단: 화주사·상품코드·상품명 검색 조건
 * 중단 좌: 상품별 재고현황 그리드 (클릭 → 우측 갱신)
 * 중단 우: 바코드별 재고 리스트 (클릭 → 하단 갱신)
 * 하단: 이동 이력 그리드 (입고·이동·수신·출고·조정·폐기)
 */
class InventoryMoveTracker extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-background);
          padding: var(--padding-wide, 16px);
          box-sizing: border-box;
          overflow: hidden;
          gap: 12px;
        }

        /* 검색 영역 */
        .search-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
          background: var(--md-sys-color-surface);
          border-radius: 10px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          flex-shrink: 0;
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .search-field label {
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
        }

        .search-field input,
        .search-field select {
          height: 36px;
          min-width: 140px;
          padding: 0 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 13px;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
          outline: none;
          cursor: pointer;
        }

        .search-field input:focus,
        .search-field select:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .search-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .btn {
          height: 36px;
          padding: 0 18px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-primary:hover { background: #1565C0; }

        .btn-secondary {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }

        .btn-secondary:hover { background: #e0e0e0; }

        /* 중단 2개 그리드 */
        .middle-section {
          display: flex;
          gap: 12px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* 하단 이력 그리드 */
        .history-section {
          flex-shrink: 0;
          height: 280px;
        }

        /* 공통 패널 */
        .panel {
          display: flex;
          flex-direction: column;
          background: var(--md-sys-color-surface);
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        .middle-section .panel { flex: 1; min-width: 0; }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
          flex-shrink: 0;
        }

        .panel-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .panel-count {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }

        /* 테이블 공통 */
        .table-wrap {
          flex: 1;
          overflow: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        thead {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        th {
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        th.right, td.right { text-align: right; }
        th.center, td.center { text-align: center; }

        td {
          padding: 7px 10px;
          color: var(--md-sys-color-on-surface-variant, #555);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          white-space: nowrap;
        }

        tbody tr { cursor: pointer; }

        tbody tr:hover { background: var(--md-sys-color-surface-variant, #fafafa); }

        tbody tr.selected {
          background: var(--md-sys-color-primary-container, #e3f2fd) !important;
          color: var(--md-sys-color-on-primary-container, #0d47a1);
        }

        tbody tr.selected td { color: inherit; }

        /* 트랜잭션 유형 뱃지 */
        .tran-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .tran-badge.NEW { background: #E3F2FD; color: #1565C0; }
        .tran-badge.MOVE_OUT { background: #E8F5E9; color: #2E7D32; }
        .tran-badge.MOVE_IN { background: #F3E5F5; color: #6A1B9A; }
        .tran-badge.SPLIT { background: #E0F7FA; color: #00695C; }
        .tran-badge.OUT { background: #FFF3E0; color: #E65100; }
        .tran-badge.ADJUST { background: #FFF8E1; color: #F57F17; }
        .tran-badge.SCRAP { background: #FFEBEE; color: #C62828; }

        /* 이동 화살표 */
        .loc-arrow {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
        }

        .loc-arrow .arrow { color: var(--md-sys-color-on-surface-variant); }

        /* 빈 상태 */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 16px;
          gap: 6px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .empty-state .icon { font-size: 32px; opacity: 0.4; }
        .empty-state p { margin: 0; font-size: 13px; }
      `
    ]
  }

  /** 반응형 속성 */
  static get properties() {
    return {
      _comCd: String,
      _skuCd: String,
      _skuNm: String,
      _companies: Array,
      _stockSummary: Array,
      _inventoryList: Array,
      _moveHistory: Array,
      _selectedSkuIdx: Number,
      _selectedInvIdx: Number
    }
  }

  /** tran_type → 표시 레이블 */
  static get TRAN_LABELS() {
    return {
      'NEW': '추가',
      'IN': '입고',
      'MOVE_OUT': '이동 (OUT)',
      'MOVE_IN': '이동 (IN)',
      'OUT': '출고',
      'ADJUST_PLUS': '조정(+)',
      'ADJUST_MINUS': '조정(-)',
      'ADJUST': '조정',
      'SCRAP': '폐기'
    }
  }

  /** tran_type → 뱃지 CSS 클래스 */
  static get TRAN_BADGE_CLASS() {
    return {
      'NEW': 'NEW',
      "IN": 'IN',
      'MOVE_OUT': 'MOVE_OUT',
      'MOVE_IN': 'MOVE_IN',
      'OUT': 'OUT',
      'ADJUST_PLUS': 'ADJUST',
      'ADJUST_MINUS': 'ADJUST',
      'ADJUST': 'ADJUST',
      'SCRAP': 'SCRAP'
    }
  }

  constructor() {
    super()
    this._comCd = ''
    this._skuCd = ''
    this._skuNm = ''
    this._companies = []
    this._stockSummary = []
    this._inventoryList = []
    this._moveHistory = []
    this._selectedSkuIdx = -1
    this._selectedInvIdx = -1
  }

  /** 페이지 진입 시 화주사 목록 로드 */
  async pageInitialized() {
    try {
      const result = await ServiceUtil.restGet('companies?limit=200')
      this._companies = result?.items || result || []
    } catch (e) {
      console.error('화주사 목록 로드 실패:', e)
    }
  }

  /** 페이지 타이틀 */
  get context() {
    return {
      title: TermsUtil.tMenu('InventoryMoveTracker') || '재고 이동 이력 추적'
    }
  }

  /** 전체 렌더링 */
  render() {
    return html`
      ${this._renderSearchBar()}
      <div class="middle-section">
        ${this._renderStockSummaryPanel()}
        ${this._renderInventoryListPanel()}
      </div>
      <div class="history-section panel">
        ${this._renderMoveHistoryContent()}
      </div>
    `
  }

  /** 검색 조건 영역 */
  _renderSearchBar() {
    return html`
      <div class="search-bar">
        <div class="search-field">
          <select
            @change="${e => { this._comCd = e.target.value }}"
          >
            <option value="">${TermsUtil.tLabel('com_cd') || '화주사 선택'}</option>
            ${this._companies.map(c => html`
              <option value="${c.com_cd}" ?selected="${this._comCd === c.com_cd}">
                ${c.com_cd}${c.com_nm ? ` (${c.com_nm})` : ''}
              </option>
            `)}
          </select>
        </div>

        <div class="search-field">
          <input
            type="text"
            placeholder="${TermsUtil.tLabel('sku_cd') || '상품 코드'}"
            .value="${this._skuCd}"
            @input="${e => { this._skuCd = e.target.value }}"
            @keydown="${this._onKeydown}"
          />
        </div>

        <div class="search-field">
          <input
            type="text"
            placeholder="${TermsUtil.tLabel('sku_nm') || '상품명'}"
            .value="${this._skuNm}"
            @input="${e => { this._skuNm = e.target.value }}"
            @keydown="${this._onKeydown}"
          />
        </div>

        <div class="search-actions">
          <button class="btn btn-primary" @click="${this._onSearchClick}">
            ${TermsUtil.tButton('search') || '조회'}
          </button>
          <button class="btn btn-secondary" @click="${this._onResetClick}">
            ${TermsUtil.tButton('reset') || '초기화'}
          </button>
        </div>
      </div>
    `
  }

  /** 중단 좌측: 상품별 재고현황 */
  _renderStockSummaryPanel() {
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">${TermsUtil.tMenu('InventoriesBySku') || '상품별 재고현황'}</span>
          <span class="panel-count">${this._stockSummary.length}건</span>
        </div>
        <div class="table-wrap">
          ${this._stockSummary.length === 0
        ? this._renderEmptyState('재고가 없습니다')
        : html`
              <table>
                <thead>
                  <tr>
                    <th>${TermsUtil.tLabel('com_cd') || '화주사'}</th>
                    <th>${TermsUtil.tLabel('sku_cd') || '상품코드'}</th>
                    <th>${TermsUtil.tLabel('sku_nm') || '상품명'}</th>
                    <th class="right">${TermsUtil.tLabel('inv_qty') || '재고수량'}</th>
                    <th class="right">${TermsUtil.tLabel('reserved_qty') || '예약수량'}</th>
                    <th class="right">${TermsUtil.tLabel('available_qty') || '가용수량'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._stockSummary.map((row, idx) => html`
                    <tr
                      class="${this._selectedSkuIdx === idx ? 'selected' : ''}"
                      @click="${() => this._onSkuRowClick(row, idx)}"
                    >
                      <td>${row.com_cd || ''}</td>
                      <td>${row.sku_cd || ''}</td>
                      <td>${row.sku_nm || ''}</td>
                      <td class="right">${this._fmtQty(row.inv_qty)}</td>
                      <td class="right">${this._fmtQty(row.reserved_qty)}</td>
                      <td class="right">${this._fmtQty(row.avail_qty)}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            `}
        </div>
      </div>
    `
  }

  /** 중단 우측: 바코드별 재고 리스트 */
  _renderInventoryListPanel() {
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">${TermsUtil.tMenu('InventoryDetailsBySku') || '상품별 재고 리스트'}</span>
          <span class="panel-count">${this._inventoryList.length}건</span>
        </div>
        <div class="table-wrap">
          ${this._inventoryList.length === 0
        ? this._renderEmptyState(this._selectedSkuIdx >= 0 ? '재고가 없습니다' : '상품을 선택하세요')
        : html`
              <table>
                <thead>
                  <tr>
                    <th>${TermsUtil.tLabel('barcode') || '바코드'}</th>
                    <th>${TermsUtil.tLabel('loc_cd') || '로케이션'}</th>
                    <th>${TermsUtil.tLabel('expired_date') || '소비기한'}</th>
                    <th>${TermsUtil.tLabel('lot_no') || 'Lot No'}</th>
                    <th class="right">${TermsUtil.tLabel('inv_qty') || '재고수량'}</th>
                    <th class="right">${TermsUtil.tLabel('reserved_qty') || '예약수량'}</th>
                    <th class="right">${TermsUtil.tLabel('available_qty') || '가용수량'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._inventoryList.map((row, idx) => html`
                    <tr
                      class="${this._selectedInvIdx === idx ? 'selected' : ''}"
                      @click="${() => this._onInventoryRowClick(row, idx)}"
                    >
                      <td>${row.barcode || ''}</td>
                      <td>${row.loc_cd || ''}</td>
                      <td>${row.expired_date || ''}</td>
                      <td>${row.lot_no || ''}</td>
                      <td class="right">${this._fmtQty(row.inv_qty)}</td>
                      <td class="right">${this._fmtQty(row.reserved_qty)}</td>
                      <td class="right">${this._fmtQty(row.avail_qty)}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            `}
        </div>
      </div>
    `
  }

  /** 하단: 이동 이력 */
  _renderMoveHistoryContent() {
    return html`
      <div class="panel-header">
        <span class="panel-title">${TermsUtil.tMenu('InventoryMoveTracker') || '이동 이력'}</span>
        <span class="panel-count">${this._moveHistory.length}건</span>
      </div>
      <div class="table-wrap">
        ${this._moveHistory.length === 0
        ? this._renderEmptyState(this._selectedInvIdx >= 0 ? '이력이 없습니다' : '재고를 선택하세요')
        : html`
            <table>
              <thead>
                <tr>
                  <th class="center">${TermsUtil.tLabel('tran_type') || '유형'}</th>
                  <th>${TermsUtil.tLabel('from_loc_cd') || 'From 로케이션'}</th>
                  <th>${TermsUtil.tLabel('to_loc_cd') || 'To 로케이션'}</th>
                  <th class="right">${TermsUtil.tLabel('tran_qty') || '수량'}</th>
                  <th class="right">${TermsUtil.tLabel('before_qty') || '이전수량'}</th>
                  <th class="right">${TermsUtil.tLabel('after_qty') || '이후수량'}</th>
                  <th>${TermsUtil.tLabel('tran_at') || '처리일시'}</th>
                  <th>${TermsUtil.tLabel('reason_cd') || '사유 코드'}</th>
                  <th>${TermsUtil.tLabel('reason') || '사유'}</th>
                  <th>${TermsUtil.tLabel('remarks') || '비고'}</th>
                </tr>
              </thead>
              <tbody>
                ${this._moveHistory.map(row => html`
                  <tr>
                    <td class="center">
                      <span class="tran-badge ${InventoryMoveTracker.TRAN_BADGE_CLASS[row.tran_type] || 'ADJUST'}">
                        ${InventoryMoveTracker.TRAN_LABELS[row.tran_type] || row.tran_type}
                      </span>
                    </td>
                    <td>${row.loc_cd || ''}</td>
                    <td>${row.to_loc_cd || ''}</td>
                    <td class="right">${this._fmtQty(row.tran_qty)}</td>
                    <td class="right">${this._fmtQty(row.before_qty)}</td>
                    <td class="right">${this._fmtQty(row.after_qty)}</td>
                    <td>${this._fmtDateTime(row.tran_at)}</td>
                    <td>${row.reason_cd || ''}</td>
                    <td>${row.reason || ''}</td>
                    <td>${row.remarks || ''}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          `}
      </div>
    `
  }

  /** 빈 상태 표시 */
  _renderEmptyState(message) {
    return html`
      <div class="empty-state">
        <div class="icon">📦</div>
        <p>${message}</p>
      </div>
    `
  }

  /** 조회 버튼 클릭 */
  async _onSearchClick() {
    await this._fetchStockSummary()
    this._inventoryList = []
    this._moveHistory = []
    this._selectedSkuIdx = -1
    this._selectedInvIdx = -1
  }

  /** 초기화 버튼 클릭 */
  _onResetClick() {
    this._comCd = ''
    this._skuCd = ''
    this._skuNm = ''
    this._stockSummary = []
    this._inventoryList = []
    this._moveHistory = []
    this._selectedSkuIdx = -1
    this._selectedInvIdx = -1
  }

  /** Enter 키 검색 */
  _onKeydown(e) {
    if (e.key === 'Enter') this._onSearchClick()
  }

  /** 상품행 선택 → 재고 리스트 갱신 */
  async _onSkuRowClick(row, idx) {
    this._selectedSkuIdx = idx
    this._selectedInvIdx = -1
    this._moveHistory = []
    await this._fetchInventoryList(row.com_cd, row.sku_cd)
  }

  /** 재고행 선택 → 이동 이력 갱신 */
  async _onInventoryRowClick(row, idx) {
    this._selectedInvIdx = idx
    await this._fetchMoveHistory(row.barcode)
  }

  /** 상품별 재고현황 API 호출 */
  async _fetchStockSummary() {
    const params = new URLSearchParams()
    if (this._comCd) params.set('com_cd', this._comCd)
    if (this._skuCd) params.set('sku_cd', this._skuCd)
    if (this._skuNm) params.set('sku_nm', this._skuNm)

    const result = await ServiceUtil.restGet(`inventory-tracker/stock-summary?${params}`)
    this._stockSummary = result || []
  }

  /** 바코드별 재고 리스트 API 호출 */
  async _fetchInventoryList(comCd, skuCd) {
    const params = new URLSearchParams({ com_cd: comCd, sku_cd: skuCd })
    const result = await ServiceUtil.restGet(`inventory-tracker/inventory-list?${params}`)
    this._inventoryList = result || []
  }

  /** 이동 이력 API 호출 */
  async _fetchMoveHistory(barcode) {
    const params = new URLSearchParams({ barcode })
    const result = await ServiceUtil.restGet(`inventory-tracker/move-history?${params}`)
    this._moveHistory = result || []
  }

  /** 수량 포맷 (소수점 불필요하면 정수로) */
  _fmtQty(val) {
    if (val === null || val === undefined) return ''
    const n = Number(val)
    return isNaN(n) ? val : (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString())
  }

  /** 날짜시간 포맷 */
  _fmtDateTime(val) {
    if (!val) return ''
    const s = String(val)
    return s.length >= 19 ? s.substring(0, 19).replace('T', ' ') : s
  }
}

customElements.define('inventory-move-tracker', InventoryMoveTracker)
