import { css, html, LitElement } from 'lit-element'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 출고주문 검색 팝업
 *
 * 출하완료(SHIPPED) 상태의 출고주문을 기간/번호/웨이브번호로 검색하여
 * 멀티 선택 후 반품 주문에 일괄 연동한다.
 *
 * - 검색 조건: 출고주문 요청일(order_date) 기간, 출고주문번호, 웨이브번호
 * - status='SHIPPED' 는 항상 강제 적용 (출하완료 주문만 노출)
 * - 여러 건 선택 후 '선택 완료' 시 각 주문의 상품을 조회하여
 *   'shipment-orders-imported' 커스텀 이벤트로 부모에 전달 (엑셀 임포트와 동일 형식)
 *   detail: { orders: [{id, shipment_no}], items: [{skuCd, skuNm, rwaReqQty, sourceType, sourceNo, ...}] }
 */
class RwaShipmentSearchPopup extends LitElement {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        /* 검색 조건 영역 */
        .search-area {
          flex-shrink: 0;
          padding: 10px 16px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
        }

        .search-fields {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 8px 14px;
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1 1 200px;
        }

        .search-field.date-field {
          flex: 2 1 360px;
        }

        .search-field label {
          font-size: 11px;
          font-weight: 600;
          color: #616161;
        }

        .search-field .date-range {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .search-field input {
          padding: 5px 8px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 13px;
          background: #fff;
          color: #333;
          box-sizing: border-box;
          width: 100%;
        }

        .search-field .date-range input {
          flex: 1;
          min-width: 0;
        }

        .search-field .date-range .tilde {
          color: #9e9e9e;
          flex-shrink: 0;
        }

        .search-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }

        .search-btn {
          padding: 6px 20px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          background: #1976d2;
          color: #fff;
        }

        .search-btn:hover { background: #1565c0; }
        .search-btn:disabled { background: #bdbdbd; cursor: not-allowed; }

        /* 결과 영역 — 좌(그리드) / 화살표 / 우(선택함) 3단 */
        .content {
          flex: 1;
          overflow: hidden;
          padding: 16px 24px;
          display: flex;
          gap: 12px;
          align-items: stretch;
          min-height: 0;
        }

        .pane {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .left-pane {
          flex: 1 1 auto;
          min-width: 0;
        }

        .right-pane {
          flex: 0 0 300px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fafafa;
          overflow: hidden;
        }

        /* 중앙 화살표 버튼 열 (상하 배치) */
        .arrow-col {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
        }

        .arrow-btn {
          width: 40px;
          height: 40px;
          border: 1px solid #90caf9;
          border-radius: 8px;
          background: #fff;
          color: #1976d2;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .arrow-btn:hover:not(:disabled) {
          background: #1976d2;
          color: #fff;
        }

        .arrow-btn:disabled {
          border-color: #e0e0e0;
          color: #bdbdbd;
          cursor: not-allowed;
        }

        .pane-title {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 600;
          color: #424242;
          padding: 8px 10px;
          background: #f0f0f0;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pane-title .cnt { color: #1976d2; }

        .result-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 13px;
          color: #616161;
          flex-shrink: 0;
        }

        .result-info .selected-count {
          font-weight: 600;
          color: #1976d2;
        }

        .table-scroll {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: auto;
          flex: 1 1 auto;
          min-height: 0;
        }

        /* 페이지네이션 */
        .pagination {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 8px;
          font-size: 12px;
          color: #616161;
        }

        .pagination button {
          padding: 5px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          background: #fff;
          color: #424242;
          font-size: 12px;
          cursor: pointer;
        }

        .pagination button:hover:not(:disabled) {
          background: #f0f7ff;
          border-color: #90caf9;
        }

        .pagination button:disabled {
          color: #bdbdbd;
          cursor: not-allowed;
        }

        /* 출고주문번호 클릭 → 상품 미리보기 (클릭 위치 팝오버) */
        td .no-link {
          color: #1976d2;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        td .no-link:hover {
          color: #0d47a1;
        }

        .item-popover {
          position: absolute;
          z-index: 10000;
          width: 260px;
          background: #fff;
          border: 1px solid #cfd8dc;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          padding: 8px 0;
          font-size: 12px;
        }

        .item-popover .pop-head {
          padding: 2px 12px 8px;
          margin: 0 0 4px;
          border-bottom: 1px solid #eee;
          font-weight: 700;
          color: #212121;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 상품 목록 — 5개까지만 보이고 그 이상은 스크롤 */
        .item-popover .pop-body {
          max-height: 115px;
          overflow-y: auto;
        }

        .item-popover .pop-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 12px;
        }

        .item-popover .pop-row .pi-nm {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #424242;
        }

        .item-popover .pop-row .pi-cd {
          color: #9e9e9e;
          font-size: 11px;
        }

        .item-popover .pop-row .pi-qty {
          flex-shrink: 0;
          font-weight: 600;
          color: #1976d2;
        }

        .item-popover .pop-empty,
        .item-popover .pop-loading {
          padding: 12px;
          text-align: center;
          color: #9e9e9e;
        }

        /* 우측 선택함 카드 목록 */
        .right-list {
          flex: 1 1 auto;
          overflow-y: auto;
          padding: 8px;
          min-height: 0;
        }

        .right-card {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: #fff;
          padding: 8px 10px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .right-card:hover {
          border-color: #90caf9;
        }

        .right-card.checked {
          background: #e3f2fd;
          border-color: #1976d2;
        }

        .right-card .rc-top {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #212121;
        }

        .right-card .rc-no {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .right-card .rc-sub {
          margin-top: 3px;
          font-size: 11px;
          color: #757575;
          line-height: 1.5;
        }

        .right-empty {
          text-align: center;
          padding: 32px 12px;
          color: #9e9e9e;
          font-size: 12px;
          line-height: 1.6;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th {
          background: #f5f5f5;
          padding: 8px 12px;
          text-align: left;
          font-weight: 600;
          color: #424242;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        td {
          padding: 7px 12px;
          border-bottom: 1px solid #eeeeee;
          color: #424242;
          white-space: nowrap;
        }

        th.check-col,
        td.check-col {
          width: 40px;
          text-align: center;
        }

        td.num {
          text-align: right;
        }

        tr.selectable {
          cursor: pointer;
        }

        tr.selectable:hover {
          background: #f0f7ff;
        }

        tr.selected {
          background: #e3f2fd;
        }

        tr.selected:hover {
          background: #d6ebfd;
        }

        input[type='checkbox'] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .empty {
          text-align: center;
          padding: 40px;
          color: #9e9e9e;
          font-size: 14px;
        }

        /* 로딩 */
        .loading-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          color: #757575;
          font-size: 14px;
          gap: 16px;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e0e0e0;
          border-top-color: #1976d2;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* 버튼 영역 */
        .button-area {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
          flex-shrink: 0;
          background: #fff;
        }

        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-default {
          background: #f5f5f5;
          color: #616161;
          border: 1px solid #e0e0e0;
        }

        .btn-default:hover { background: #eeeeee; }

        .btn-primary {
          background: #4caf50;
          color: #fff;
        }

        .btn-primary:hover { background: #388e3c; }

        .btn-primary:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
        }
      `
    ]
  }

  static get properties() {
    return {
      fromDate: { type: String },
      toDate: { type: String },
      shipmentNo: { type: String },
      waveNo: { type: String },
      custNm: { type: String },
      orders: { type: Array },
      movedOrders: { type: Array },
      leftChecked: { type: Object },
      rightChecked: { type: Object },
      page: { type: Number },
      total: { type: Number },
      linkedShipmentNos: { type: Array },
      popover: { type: Object },
      loading: { type: Boolean },
      applying: { type: Boolean },
      searched: { type: Boolean }
    }
  }

  constructor() {
    super()
    const today = this._formatDate(new Date())
    const from = new Date()
    from.setDate(from.getDate() - 7)
    this.fromDate = this._formatDate(from)
    this.toDate = today
    this.shipmentNo = ''
    this.waveNo = ''
    this.custNm = ''
    this.orders = []          // 좌측 검색 결과 (원본)
    this.movedOrders = []     // 우측 선택함으로 이동된 주문
    this.leftChecked = new Set()   // 좌측 그리드 체크 (→ 이동 대상)
    this.rightChecked = new Set()  // 우측 선택함 체크 (← 복귀 대상)
    this.page = 1
    this.total = 0
    this._limit = 100
    this.linkedShipmentNos = []    // 연동화면에 이미 연동된 출고주문번호 (검색 후보에서 제외)
    this.popover = null            // 출고주문 상품 미리보기 팝오버 { x, y, order, items, loading }
    this.loading = false
    this.applying = false
    this.searched = false
    this._boundClosePopover = () => this._closePopover()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._boundClosePopover, true)
  }

  /** 우측 선택함으로 이동된 id 집합 */
  get _movedIds() {
    return new Set(this.movedOrders.map(o => o.id))
  }

  /**
   * 좌측에 실제 표시할 주문
   * - 우측 선택함으로 이동된 주문 제외
   * - 연동화면에 이미 연동된 주문 제외 (정책상 아예 노출 안 함)
   *   → 추후 "이미 연동된 것도 보여주되 표시" 로 바꾸려면 이 필터를 제거하고
   *     행에 '이미 연동됨' 뱃지/비활성화 처리를 추가하면 됨
   */
  get _leftVisible() {
    const moved = this._movedIds
    const linked = new Set(this.linkedShipmentNos || [])
    return this.orders.filter(o => !moved.has(o.id) && !linked.has(o.shipment_no))
  }

  /** 최초 표시 시 자동 검색 */
  firstUpdated() {
    this._search()
  }

  /** Date → yyyy-MM-dd 문자열 변환 */
  _formatDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  render() {
    const leftVisible = this._leftVisible
    const allSelected = leftVisible.length > 0 && this.leftChecked.size === leftVisible.length
    const totalPages = Math.max(1, Math.ceil(this.total / this._limit))

    return html`
      <div class="search-area">
        <div class="search-fields">
          <div class="search-field date-field">
            <label>출고주문 요청일</label>
            <div class="date-range">
              <input type="date" .value="${this.fromDate}"
                @input="${e => { this.fromDate = e.target.value }}" />
              <span class="tilde">~</span>
              <input type="date" .value="${this.toDate}"
                @input="${e => { this.toDate = e.target.value }}" />
            </div>
          </div>
          <div class="search-field">
            <label>출고주문번호</label>
            <input type="text" placeholder="출고주문번호 (부분 검색)"
              .value="${this.shipmentNo}"
              @input="${e => { this.shipmentNo = e.target.value }}"
              @keydown="${e => e.key === 'Enter' && this._onSearch()}" />
          </div>
          <div class="search-field">
            <label>웨이브번호</label>
            <input type="text" placeholder="웨이브번호 (부분 검색)"
              .value="${this.waveNo}"
              @input="${e => { this.waveNo = e.target.value }}"
              @keydown="${e => e.key === 'Enter' && this._onSearch()}" />
          </div>
          <div class="search-field">
            <label>거래처</label>
            <input type="text" placeholder="거래처명 (부분 검색)"
              .value="${this.custNm}"
              @input="${e => { this.custNm = e.target.value }}"
              @keydown="${e => e.key === 'Enter' && this._onSearch()}" />
          </div>
        </div>
        <div class="search-actions">
          <button class="search-btn" ?disabled="${this.loading}" @click="${this._onSearch}">
            🔍 ${this.loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </div>

      <div class="content">
        <!-- 좌: 검색 결과 그리드 -->
        <div class="pane left-pane">
          ${this.loading
        ? html`
                <div class="loading-overlay">
                  <div class="spinner"></div>
                  <span>출고주문 조회 중...</span>
                </div>
              `
        : leftVisible.length === 0
          ? html`<div class="empty">${this.searched ? '출하완료된 출고주문이 없습니다.' : '검색 조건을 입력하고 검색하세요.'}</div>`
          : html`
                  <div class="result-info">
                    <span>총 <strong>${this.total}</strong>건 (출하완료)</span>
                    <span class="selected-count">${this.leftChecked.size}건 체크</span>
                  </div>
                  <div class="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th class="check-col">
                            <input type="checkbox" .checked="${allSelected}"
                              @change="${this._toggleSelectAll}" />
                          </th>
                          <th>출고주문번호</th>
                          <th>웨이브번호</th>
                          <th>거래처</th>
                          <th>주문일자</th>
                          <th>상품수</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${leftVisible.map(o => {
            const checked = this.leftChecked.has(o.id)
            return html`
                            <tr class="selectable ${checked ? 'selected' : ''}"
                              @click="${() => this._toggleRow(o.id)}">
                              <td class="check-col">
                                <input type="checkbox" .checked="${checked}"
                                  @click="${e => e.stopPropagation()}"
                                  @change="${() => this._toggleRow(o.id)}" />
                              </td>
                              <td>
                                <span class="no-link" title="상품 미리보기"
                                  @click="${e => this._openItemPopover(e, o)}">${o.shipment_no || '-'}</span>
                              </td>
                              <td>${o.wave_no || '-'}</td>
                              <td>${o.cust_nm || o.cust_cd || '-'}</td>
                              <td>${o.order_date || '-'}</td>
                              <td class="num">${o.total_item ?? '-'}</td>
                            </tr>
                          `
          })}
                      </tbody>
                    </table>
                  </div>
                  <div class="pagination">
                    <button ?disabled="${this.page <= 1}" @click="${this._prevPage}">◀ 이전</button>
                    <span>${this.page} / ${totalPages} (100건씩)</span>
                    <button ?disabled="${this.page >= totalPages}" @click="${this._nextPage}">다음 ▶</button>
                  </div>
                `}
        </div>

        <!-- 중앙: 이동 화살표 -->
        <div class="arrow-col">
          <button class="arrow-btn" title="선택함으로 이동"
            ?disabled="${this.leftChecked.size === 0}"
            @click="${this._moveRight}">▶</button>
          <button class="arrow-btn" title="검색결과로 복귀"
            ?disabled="${this.rightChecked.size === 0}"
            @click="${this._moveLeft}">◀</button>
        </div>

        <!-- 우: 선택함 -->
        <div class="pane right-pane">
          <div class="pane-title">
            <span>선택된 출고주문</span>
            <span class="cnt">${this.movedOrders.length}건</span>
          </div>
          ${this.movedOrders.length === 0
        ? html`<div class="right-empty">왼쪽에서 주문을 체크한 후<br />▶ 버튼으로 이동하세요</div>`
        : html`
                <div class="right-list">
                  ${this.movedOrders.map(o => {
          const checked = this.rightChecked.has(o.id)
          return html`
                      <div class="right-card ${checked ? 'checked' : ''}"
                        @click="${() => this._toggleRightCard(o.id)}">
                        <div class="rc-top">
                          <input type="checkbox" .checked="${checked}"
                            @click="${e => e.stopPropagation()}"
                            @change="${() => this._toggleRightCard(o.id)}" />
                          <span class="rc-no">${o.shipment_no || '-'}</span>
                        </div>
                        <div class="rc-sub">
                          ${o.cust_nm || o.cust_cd || '-'} · ${o.order_date || '-'}<br />
                          ${o.wave_no ? `웨이브 ${o.wave_no} · ` : ''}상품 ${o.total_item ?? '-'} · 주문 ${o.total_order ?? '-'}
                        </div>
                      </div>
                    `
        })}
                </div>
              `}
        </div>
      </div>

      <div class="button-area">
        <button class="btn btn-default" @click="${this._close}">취소</button>
        <button class="btn btn-primary"
          ?disabled="${this.movedOrders.length === 0 || this.applying}"
          @click="${this._applyAndClose}">
          ${this.applying ? '연동 처리 중...' : `✓ 선택 완료 (${this.movedOrders.length}건)`}
        </button>
      </div>

      ${this._renderItemPopover()}
    `
  }

  /** 출고주문 상품 미리보기 팝오버 (클릭 위치에 표시) */
  _renderItemPopover() {
    if (!this.popover) return ''
    const { x, y, order, items, loading } = this.popover
    return html`
      <div class="item-popover" style="left:${x}px; top:${y}px;">
        <div class="pop-head">📦 ${order.shipment_no}</div>
        <div class="pop-body">
          ${loading
        ? html`<div class="pop-loading">상품 조회 중...</div>`
        : (items && items.length > 0)
          ? items.map(it => html`
                <div class="pop-row">
                  <span class="pi-nm">${it.sku_nm || '-'} <span class="pi-cd">${it.sku_cd || ''}</span></span>
                  <span class="pi-qty">${it.order_qty ?? '-'}</span>
                </div>
              `)
          : html`<div class="pop-empty">상품 정보가 없습니다</div>`}
        </div>
      </div>
    `
  }

  /**
   * 출고주문번호 클릭 → 클릭 위치에 상품 미리보기 팝오버 표시
   * 아무 곳이나 클릭하면 닫힘 (document 캡처 리스너)
   */
  async _openItemPopover(e, order) {
    e.stopPropagation()

    // 팝오버는 :host 기준 absolute 배치 (모달 다이얼로그에 transform이 걸려
    // fixed가 뷰포트 기준으로 동작하지 않으므로 호스트 상대 좌표로 계산)
    const hostRect = this.getBoundingClientRect()
    const pw = 260
    const ph = 260
    let x = e.clientX - hostRect.left + 4
    let y = e.clientY - hostRect.top + 4
    if (x + pw > hostRect.width) x = Math.max(4, hostRect.width - pw - 8)
    if (y + ph > hostRect.height) y = Math.max(4, hostRect.height - ph - 8)

    this.popover = { x, y, order, items: [], loading: true }

    // 다음 틱에 닫기 리스너 등록 (여는 클릭이 즉시 닫지 않도록)
    document.removeEventListener('click', this._boundClosePopover, true)
    setTimeout(() => document.addEventListener('click', this._boundClosePopover, true), 0)

    try {
      const itemData = await ServiceUtil.restGet(`shipment_orders/${order.id}/items`)
      const items = itemData?.items || itemData || []
      // 조회 도중 다른 주문으로 바뀌지 않은 경우에만 반영
      if (this.popover && this.popover.order.id === order.id) {
        this.popover = { ...this.popover, items, loading: false }
      }
    } catch (err) {
      console.error(`출고주문 [${order.shipment_no}] 상품 조회 실패:`, err)
      if (this.popover && this.popover.order.id === order.id) {
        this.popover = { ...this.popover, items: [], loading: false }
      }
    }
  }

  /** 팝오버 닫기 */
  _closePopover() {
    this.popover = null
    document.removeEventListener('click', this._boundClosePopover, true)
  }

  /** 검색 버튼/Enter — 1페이지부터 재검색 */
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
    const totalPages = Math.max(1, Math.ceil(this.total / this._limit))
    if (this.page < totalPages) {
      this.page++
      this._search()
    }
  }

  /** 검색 실행 — 출하완료 출고주문 조회 (선택함으로 이동된 주문은 좌측에서 제외됨) */
  async _search() {
    this.loading = true
    this.leftChecked = new Set()
    try {
      const filters = [{ name: 'status', operator: 'eq', value: 'SHIPPED' }]
      if (this.fromDate) filters.push({ name: 'order_date', operator: 'gte', value: this.fromDate })
      if (this.toDate) filters.push({ name: 'order_date', operator: 'lte', value: this.toDate })
      if (this.shipmentNo && this.shipmentNo.trim()) {
        filters.push({ name: 'shipment_no', operator: 'like', value: this.shipmentNo.trim() })
      }
      if (this.waveNo && this.waveNo.trim()) {
        filters.push({ name: 'wave_no', operator: 'like', value: this.waveNo.trim() })
      }
      if (this.custNm && this.custNm.trim()) {
        filters.push({ name: 'cust_nm', operator: 'like', value: this.custNm.trim() })
      }

      const res = await ServiceUtil.searchByPagination(
        'shipment_orders',
        filters,
        [{ name: 'order_date', desc: true }],
        this.page, this._limit
      )
      this.orders = res?.items || []
      this.total = res?.total || 0
    } catch (err) {
      console.error('출고주문 검색 실패:', err)
      UiUtil.showToast('error', err.message || '출고주문 검색에 실패했습니다')
      this.orders = []
      this.total = 0
    } finally {
      this.searched = true
      this.loading = false
    }
  }

  /** 좌측 행 체크 토글 */
  _toggleRow(id) {
    const next = new Set(this.leftChecked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.leftChecked = next
  }

  /** 좌측 전체 체크/해제 토글 */
  _toggleSelectAll(e) {
    if (e.target.checked) {
      this.leftChecked = new Set(this._leftVisible.map(o => o.id))
    } else {
      this.leftChecked = new Set()
    }
  }

  /** 우측 선택함 카드 체크 토글 */
  _toggleRightCard(id) {
    const next = new Set(this.rightChecked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.rightChecked = next
  }

  /** ▶ 좌측 체크 주문을 우측 선택함으로 이동 (멀티) */
  _moveRight() {
    if (this.leftChecked.size === 0) return
    const toMove = this.orders.filter(o => this.leftChecked.has(o.id) && !this._movedIds.has(o.id))
    this.movedOrders = [...this.movedOrders, ...toMove]
    this.leftChecked = new Set()
  }

  /** ◀ 우측 체크 주문을 검색결과로 복귀 (멀티) */
  _moveLeft() {
    if (this.rightChecked.size === 0) return
    this.movedOrders = this.movedOrders.filter(o => !this.rightChecked.has(o.id))
    this.rightChecked = new Set()
  }

  /**
   * 우측 선택함의 출고주문들의 상품을 조회하여 부모에 전달
   * 엑셀 임포트와 동일한 'shipment-orders-imported' 이벤트/형식 사용
   */
  async _applyAndClose() {
    if (this.movedOrders.length === 0) return

    this.applying = true
    try {
      const selectedOrders = this.movedOrders
      const orders = []
      const items = []

      for (const order of selectedOrders) {
        try {
          const itemData = await ServiceUtil.restGet(`shipment_orders/${order.id}/items`)
          const orderItems = itemData?.items || itemData || []

          orders.push({ id: order.id, shipment_no: order.shipment_no })
          for (const oi of orderItems) {
            items.push({
              skuCd: oi.sku_cd || '',
              skuNm: oi.sku_nm || '',
              rwaReqQty: oi.order_qty || 1,
              returnReason: '',
              boxQty: 0,
              sourceType: 'SHIPMENT',
              sourceNo: order.shipment_no
            })
          }
        } catch (err) {
          console.error(`출고주문 [${order.shipment_no}] 상품 조회 실패:`, err)
          UiUtil.showToast('warning', `출고주문 [${order.shipment_no}] 상품 조회 실패`)
        }
      }

      if (orders.length === 0) {
        UiUtil.showToast('warning', '연동할 출고주문이 없습니다')
        return
      }

      this.dispatchEvent(new CustomEvent('shipment-orders-imported', {
        bubbles: true,
        composed: true,
        detail: { orders, items }
      }))

      UiUtil.closePopupBy(this)
    } finally {
      this.applying = false
    }
  }

  _close() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('rwa-shipment-search-popup', RwaShipmentSearchPopup)
