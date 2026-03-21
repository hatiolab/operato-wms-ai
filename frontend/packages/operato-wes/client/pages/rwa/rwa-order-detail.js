import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxPrompt } from '@operato/popup/ox-prompt.js'

/**
 * 반품 요청 상세 팝업
 *
 * 기능:
 * - 반품 요청 기본 정보 + 상태 배지 + 액션 버튼
 * - 4탭: 반품항목 / 검수내역 / 처분결정 / 이력
 * - 검수/처분 탭 lazy loading
 * - 승인/거부/완료/마감 트랜잭션
 */
class RwaOrderDetail extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          background-color: var(--md-sys-color-background);
          overflow: hidden;
          height: 100%;
        }

        /* 헤더 영역 */
        .detail-header {
          background: var(--md-sys-color-surface);
          padding: 20px 24px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .status-badge {
          padding: 4px 14px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 600;
          color: white;
        }

        .status-badge.REQUEST { background-color: #9E9E9E; }
        .status-badge.APPROVED { background-color: #2196F3; }
        .status-badge.RECEIVING { background-color: #00BCD4; }
        .status-badge.INSPECTING { background-color: #FF9800; }
        .status-badge.INSPECTED { background-color: #CDDC39; color: #333; }
        .status-badge.DISPOSED { background-color: #9C27B0; }
        .status-badge.COMPLETED { background-color: #4CAF50; }
        .status-badge.CLOSED { background-color: #616161; }
        .status-badge.REJECTED { background-color: #F44336; }
        .status-badge.CANCELLED { background-color: #F44336; }

        .type-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          background: var(--md-sys-color-surface-variant);
          padding: 4px 12px;
          border-radius: 14px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.primary {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        .action-btn.primary:hover:not(:disabled) {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .action-btn.danger {
          background: transparent;
          color: #C62828;
          border: 1px solid #EF9A9A;
        }

        .action-btn.danger:hover:not(:disabled) {
          background: #FFEBEE;
        }

        .action-btn.secondary {
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface);
        }

        .action-btn.secondary:hover:not(:disabled) {
          background: var(--md-sys-color-surface-container-highest);
        }

        /* 정보 그리드 */
        .header-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .info-item.full-width {
          grid-column: 1 / -1;
        }

        .info-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .info-value {
          font-size: 15px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface);
        }

        /* 탭 바 */
        .tab-bar {
          display: flex;
          background: var(--md-sys-color-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          padding: 0 24px;
        }

        .tab-item {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-item:hover {
          color: var(--md-sys-color-on-surface);
          background: var(--md-sys-color-surface-container-highest);
        }

        .tab-item.active {
          color: var(--md-sys-color-primary);
          border-bottom-color: var(--md-sys-color-primary);
          font-weight: 600;
        }

        /* 탭 콘텐츠 */
        .tab-content {
          flex: 1;
          overflow: auto;
          padding: 24px;
        }

        .tab-panel {
          display: none;
        }

        .tab-panel.active {
          display: block;
        }

        /* 테이블 */
        table {
          width: 100%;
          border-collapse: collapse;
          background: var(--md-sys-color-surface);
          border-radius: 8px;
          overflow: hidden;
        }

        thead {
          background: var(--md-sys-color-surface-variant);
        }

        th,
        td {
          padding: 10px 14px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          font-size: 14px;
        }

        th {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        td {
          color: var(--md-sys-color-on-surface-variant);
        }

        tbody tr:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        .text-right {
          text-align: right;
        }

        /* 항목 상태 배지 */
        .item-status {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .item-status.REQUEST { background: #9E9E9E; }
        .item-status.APPROVED { background: #2196F3; }
        .item-status.RECEIVING { background: #00BCD4; }
        .item-status.INSPECTED { background: #CDDC39; color: #333; }
        .item-status.DISPOSED { background: #9C27B0; }
        .item-status.COMPLETED { background: #4CAF50; }

        /* 검수 결과 배지 */
        .insp-result {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }

        .insp-result.PASS { background: #E8F5E9; color: #2E7D32; }
        .insp-result.FAIL { background: #FFEBEE; color: #C62828; }
        .insp-result.PARTIAL { background: #FFF3E0; color: #E65100; }

        /* 합계 영역 */
        .summary-row {
          display: flex;
          gap: 24px;
          margin-top: 16px;
          padding: 12px 16px;
          background: var(--md-sys-color-surface-variant);
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .summary-item .label {
          color: var(--md-sys-color-on-surface-variant);
        }

        .summary-item .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        /* 타임라인 */
        .timeline {
          position: relative;
          padding-left: 36px;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 13px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: var(--md-sys-color-outline-variant);
        }

        .timeline-item {
          position: relative;
          margin-bottom: 20px;
          padding: 14px 18px;
          background: var(--md-sys-color-surface);
          border-radius: 10px;
          border: 1px solid var(--md-sys-color-outline-variant);
        }

        .timeline-item::before {
          content: '';
          position: absolute;
          left: -29px;
          top: 18px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--md-sys-color-primary);
          border: 2px solid var(--md-sys-color-surface);
        }

        .timeline-item.future {
          opacity: 0.4;
        }

        .timeline-item.future::before {
          background: var(--md-sys-color-outline-variant);
        }

        .timeline-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .timeline-label {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .timeline-date {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .timeline-desc {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 2px;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 48px 20px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .empty-state .icon {
          font-size: 40px;
          opacity: 0.4;
          margin-bottom: 8px;
        }

        .empty-state .text {
          font-size: 14px;
        }

        /* 로딩 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant);
        }
      `
    ]
  }

  static get properties() {
    return {
      rwaOrderId: String,
      rwaOrder: Object,
      items: Array,
      inspections: Object,
      dispositions: Object,
      activeTab: Number,
      loading: Boolean,
      actionLoading: Boolean
    }
  }

  constructor() {
    super()
    this.rwaOrderId = null
    this.rwaOrder = null
    this.items = []
    this.inspections = {}
    this.dispositions = {}
    this.activeTab = 0
    this.loading = true
    this.actionLoading = false
  }

  connectedCallback() {
    super.connectedCallback()
    if (this.rwaOrderId) {
      this._fetchOrderData()
    }
  }

  get context() {


    return {


      title: TermsUtil.tMenu('RwaOrderDetail')


    }


  }



  render() {
    if (this.loading) {
      return html`<div class="loading">데이터 로딩 중...</div>`
    }

    if (!this.rwaOrder) {
      return html`<div class="empty-state"><div class="text">반품 정보를 찾을 수 없습니다</div></div>`
    }

    return html`
      ${this._renderHeader()}
      ${this._renderTabs()}
      <div class="tab-content">
        <div class="tab-panel ${this.activeTab === 0 ? 'active' : ''}">${this._renderItemsTab()}</div>
        <div class="tab-panel ${this.activeTab === 1 ? 'active' : ''}">${this._renderInspectionsTab()}</div>
        <div class="tab-panel ${this.activeTab === 2 ? 'active' : ''}">${this._renderDispositionsTab()}</div>
        <div class="tab-panel ${this.activeTab === 3 ? 'active' : ''}">${this._renderTimelineTab()}</div>
      </div>
    `
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  _renderHeader() {
    const o = this.rwaOrder
    return html`
      <div class="detail-header">
        <div class="header-top">
          <div class="header-title">
            <h2>${o.rwa_no || '-'}</h2>
            <span class="status-badge ${o.status}">${this._statusLabel(o.status)}</span>
            <span class="type-label">${this._rwaTypeLabel(o.rwa_type)}</span>
          </div>
          <div class="header-actions">
            ${this._renderActionButtons()}
          </div>
        </div>

        <div class="header-info">
          <div class="info-item">
            <span class="info-label">고객</span>
            <span class="info-value">${o.cust_nm || '-'} ${o.cust_cd ? `(${o.cust_cd})` : ''}</span>
          </div>
          <div class="info-item">
            <span class="info-label">화주사</span>
            <span class="info-value">${o.com_cd || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">창고</span>
            <span class="info-value">${o.wh_cd || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">원 주문번호</span>
            <span class="info-value">${o.order_no || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">요청일</span>
            <span class="info-value">${o.rwa_req_date || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">반품 사유</span>
            <span class="info-value">${this._returnReasonLabel(o.return_reason)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">검수 필요</span>
            <span class="info-value">${o.insp_flag ? '예' : '아니오'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">품질검사</span>
            <span class="info-value">${o.qc_flag ? '예' : '아니오'}</span>
          </div>
          ${o.return_reason_desc
            ? html`
                <div class="info-item full-width">
                  <span class="info-label">상세 사유</span>
                  <span class="info-value">${o.return_reason_desc}</span>
                </div>
              `
            : ''}
          ${o.remarks
            ? html`
                <div class="info-item full-width">
                  <span class="info-label">비고</span>
                  <span class="info-value">${o.remarks}</span>
                </div>
              `
            : ''}
        </div>
      </div>
    `
  }

  _renderActionButtons() {
    const s = this.rwaOrder?.status
    return html`
      ${s === 'REQUEST'
        ? html`
            <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._approveOrder}">승인</button>
            <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._rejectOrder}">거부</button>
          `
        : ''}
      ${s === 'INSPECTED' || s === 'DISPOSED'
        ? html`<button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._completeOrder}">완료</button>`
        : ''}
      ${s === 'COMPLETED'
        ? html`<button class="action-btn secondary" ?disabled="${this.actionLoading}" @click="${this._closeOrder}">마감</button>`
        : ''}
    `
  }

  _renderTabs() {
    return html`
      <div class="tab-bar">
        <div class="tab-item ${this.activeTab === 0 ? 'active' : ''}" @click="${() => this._switchTab(0)}">
          반품항목 (${this.items.length})
        </div>
        <div class="tab-item ${this.activeTab === 1 ? 'active' : ''}" @click="${() => this._switchTab(1)}">
          검수내역
        </div>
        <div class="tab-item ${this.activeTab === 2 ? 'active' : ''}" @click="${() => this._switchTab(2)}">
          처분결정
        </div>
        <div class="tab-item ${this.activeTab === 3 ? 'active' : ''}" @click="${() => this._switchTab(3)}">
          이력
        </div>
      </div>
    `
  }

  /** 탭 0: 반품 항목 */
  _renderItemsTab() {
    if (!this.items.length) {
      return html`<div class="empty-state"><div class="icon">📦</div><div class="text">반품 항목이 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>순번</th>
            <th>SKU 코드</th>
            <th>상품명</th>
            <th class="text-right">요청수량</th>
            <th class="text-right">입고수량</th>
            <th class="text-right">양품</th>
            <th class="text-right">불량</th>
            <th class="text-right">처분</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          ${this.items.map(
            (item, idx) => html`
              <tr>
                <td>${item.rwa_seq || idx + 1}</td>
                <td>${item.sku_cd || '-'}</td>
                <td>${item.sku_nm || '-'}</td>
                <td class="text-right">${item.rwa_req_qty || 0}</td>
                <td class="text-right">${item.rwa_qty || 0}</td>
                <td class="text-right">${item.good_qty || 0}</td>
                <td class="text-right">${item.defect_qty || 0}</td>
                <td class="text-right">${item.disposed_qty || 0}</td>
                <td><span class="item-status ${item.status}">${this._statusLabel(item.status)}</span></td>
              </tr>
            `
          )}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">총 항목:</span>
          <span class="value">${this.items.length}건</span>
        </div>
        <div class="summary-item">
          <span class="label">총 요청:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.rwa_req_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 입고:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.rwa_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">양품:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.good_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">불량:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.defect_qty || 0), 0)} EA</span>
        </div>
      </div>
    `
  }

  /** 탭 1: 검수 내역 */
  _renderInspectionsTab() {
    const allInspections = []
    this.items.forEach(item => {
      const insps = this.inspections[item.id] || []
      insps.forEach(insp => {
        allInspections.push({ ...insp, _sku_cd: item.sku_cd, _sku_nm: item.sku_nm })
      })
    })

    if (!allInspections.length) {
      return html`<div class="empty-state"><div class="icon">🔍</div><div class="text">검수 내역이 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>상품명</th>
            <th>검수유형</th>
            <th class="text-right">양품</th>
            <th class="text-right">불량</th>
            <th>불량유형</th>
            <th>결과</th>
            <th>검수자</th>
            <th>검수일시</th>
          </tr>
        </thead>
        <tbody>
          ${allInspections.map(
            insp => html`
              <tr>
                <td>${insp._sku_cd || '-'}</td>
                <td>${insp._sku_nm || '-'}</td>
                <td>${this._inspTypeLabel(insp.insp_type)}</td>
                <td class="text-right">${insp.good_qty || 0}</td>
                <td class="text-right">${insp.defect_qty || 0}</td>
                <td>${this._defectTypeLabel(insp.defect_type)}</td>
                <td><span class="insp-result ${insp.insp_result}">${this._inspResultLabel(insp.insp_result)}</span></td>
                <td>${insp.insp_by || '-'}</td>
                <td>${this._formatDateTime(insp.insp_at)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `
  }

  /** 탭 2: 처분 결정 */
  _renderDispositionsTab() {
    const allDispositions = []
    this.items.forEach(item => {
      const disp = this.dispositions[item.id]
      if (disp) {
        allDispositions.push({ ...disp, _sku_cd: item.sku_cd, _sku_nm: item.sku_nm })
      }
    })

    if (!allDispositions.length) {
      return html`<div class="empty-state"><div class="icon">🗂️</div><div class="text">처분 내역이 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>상품명</th>
            <th>처분유형</th>
            <th class="text-right">수량</th>
            <th>로케이션</th>
            <th>처분사유</th>
            <th>처분자</th>
            <th>처분일시</th>
          </tr>
        </thead>
        <tbody>
          ${allDispositions.map(
            d => html`
              <tr>
                <td>${d._sku_cd || '-'}</td>
                <td>${d._sku_nm || '-'}</td>
                <td>${this._dispositionTypeLabel(d.disposition_type)}</td>
                <td class="text-right">${d.disposition_qty || 0}</td>
                <td>${d.restock_loc_cd || d.scrap_loc_cd || '-'}</td>
                <td>${d.disposition_reason || '-'}</td>
                <td>${d.disposed_by || '-'}</td>
                <td>${this._formatDateTime(d.disposed_at)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `
  }

  /** 탭 3: 이력 타임라인 */
  _renderTimelineTab() {
    const o = this.rwaOrder
    const statusOrder = ['REQUEST', 'APPROVED', 'RECEIVING', 'INSPECTING', 'INSPECTED', 'DISPOSED', 'COMPLETED', 'CLOSED']
    const currentIdx = statusOrder.indexOf(o.status)

    const events = [
      { label: '반품 요청 생성', date: o.created_at, desc: null, reached: true },
      {
        label: o.status === 'REJECTED' ? '반품 거부' : '반품 승인',
        date: o.approved_at,
        desc: o.approved_by ? `담당: ${o.approved_by}` : null,
        reached: o.status === 'REJECTED' || currentIdx >= 1
      },
      { label: '입고 시작', date: null, desc: null, reached: currentIdx >= 2 },
      {
        label: '검수 완료',
        date: o.inspected_at,
        desc: o.inspected_by ? `검수자: ${o.inspected_by}` : null,
        reached: currentIdx >= 4
      },
      {
        label: '처분 완료',
        date: o.disposed_at,
        desc: o.disposed_by ? `담당: ${o.disposed_by}` : null,
        reached: currentIdx >= 5
      },
      { label: '완료', date: null, desc: null, reached: currentIdx >= 6 },
      { label: '마감', date: null, desc: null, reached: currentIdx >= 7 }
    ]

    return html`
      <div class="timeline">
        ${events.map(
          e => html`
            <div class="timeline-item ${e.reached ? '' : 'future'}">
              <div class="timeline-head">
                <span class="timeline-label">${e.label}</span>
                <span class="timeline-date">${this._formatDateTime(e.date)}</span>
              </div>
              ${e.desc ? html`<div class="timeline-desc">${e.desc}</div>` : ''}
            </div>
          `
        )}
      </div>
    `
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  async _fetchOrderData() {
    this.loading = true
    try {
      const [order, items] = await Promise.all([
        ServiceUtil.restGet(`rwa_trx/rwa_orders/${this.rwaOrderId}`),
        ServiceUtil.restGet(`rwa_trx/rwa_orders/${this.rwaOrderId}/items`)
      ])
      this.rwaOrder = order
      this.items = items || []
    } catch (error) {
      console.error('반품 상세 조회 실패:', error)
      UiUtil.showToast('error', '반품 상세 조회에 실패했습니다')
    } finally {
      this.loading = false
    }
  }

  async _fetchAllInspections() {
    try {
      const results = await Promise.all(
        this.items.map(item =>
          ServiceUtil.restGet(`rwa_trx/rwa_orders/${this.rwaOrderId}/items/${item.id}/inspections`)
            .then(data => ({ itemId: item.id, data: data || [] }))
            .catch(() => ({ itemId: item.id, data: [] }))
        )
      )
      const inspMap = {}
      results.forEach(r => {
        inspMap[r.itemId] = r.data
      })
      this.inspections = inspMap
    } catch (error) {
      console.error('검수 내역 조회 실패:', error)
    }
  }

  async _fetchAllDispositions() {
    try {
      const results = await Promise.all(
        this.items.map(item =>
          ServiceUtil.restGet(`rwa_trx/rwa_orders/${this.rwaOrderId}/items/${item.id}/disposition`)
            .then(data => ({ itemId: item.id, data: data || null }))
            .catch(() => ({ itemId: item.id, data: null }))
        )
      )
      const dispMap = {}
      results.forEach(r => {
        if (r.data) dispMap[r.itemId] = r.data
      })
      this.dispositions = dispMap
    } catch (error) {
      console.error('처분 내역 조회 실패:', error)
    }
  }

  /* ============================================================
   * 탭 전환 (lazy loading)
   * ============================================================ */

  _switchTab(index) {
    this.activeTab = index

    if (index === 1 && Object.keys(this.inspections).length === 0 && this.items.length > 0) {
      this._fetchAllInspections()
    }

    if (index === 2 && Object.keys(this.dispositions).length === 0 && this.items.length > 0) {
      this._fetchAllDispositions()
    }
  }

  /* ============================================================
   * 액션
   * ============================================================ */

  async _approveOrder() {
    const result = await UiUtil.showAlertPopup('title.confirm', '반품 요청을 승인하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result.confirmButton) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(`rwa_trx/rwa_orders/${this.rwaOrderId}/approve`, { approvedBy: '' })
      UiUtil.showToast('success', '반품이 승인되었습니다')
      await this._fetchOrderData()
      this._dispatchOrderUpdated()
    } catch (error) {
      console.error('반품 승인 실패:', error)
      UiUtil.showToast('error', error.message || '반품 승인에 실패했습니다')
    } finally {
      this.actionLoading = false
    }
  }

  async _rejectOrder() {
    const result = await OxPrompt.open({
      title: '거부 사유',
      text: '거부 사유를 입력해주세요',
      type: 'prompt',
      confirmButton: { text: '확인' },
      cancelButton: { text: '취소' }
    })
    if (!result.confirmButton || !result.text) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(`rwa_trx/rwa_orders/${this.rwaOrderId}/reject`, {
        rejectedBy: '',
        rejectReason: result.text
      })
      UiUtil.showToast('success', '반품이 거부되었습니다')
      await this._fetchOrderData()
      this._dispatchOrderUpdated()
    } catch (error) {
      console.error('반품 거부 실패:', error)
      UiUtil.showToast('error', error.message || '반품 거부에 실패했습니다')
    } finally {
      this.actionLoading = false
    }
  }

  async _completeOrder() {
    const result = await UiUtil.showAlertPopup('title.confirm', '반품을 완료 처리하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result.confirmButton) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(`rwa_trx/rwa_orders/${this.rwaOrderId}/complete`, {})
      UiUtil.showToast('success', '반품이 완료 처리되었습니다')
      await this._fetchOrderData()
      this._dispatchOrderUpdated()
    } catch (error) {
      console.error('반품 완료 실패:', error)
      UiUtil.showToast('error', error.message || '반품 완료에 실패했습니다')
    } finally {
      this.actionLoading = false
    }
  }

  async _closeOrder() {
    const result = await UiUtil.showAlertPopup('title.confirm', '반품을 마감 처리하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result.confirmButton) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(`rwa_trx/rwa_orders/${this.rwaOrderId}/close`, {})
      UiUtil.showToast('success', '반품이 마감 처리되었습니다')
      await this._fetchOrderData()
      this._dispatchOrderUpdated()
    } catch (error) {
      console.error('반품 마감 실패:', error)
      UiUtil.showToast('error', error.message || '반품 마감에 실패했습니다')
    } finally {
      this.actionLoading = false
    }
  }

  _dispatchOrderUpdated() {
    this.dispatchEvent(
      new CustomEvent('order-updated', {
        composed: true,
        bubbles: true,
        detail: { rwaOrderId: this.rwaOrderId }
      })
    )
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _statusLabel(status) {
    const labels = {
      REQUEST: '요청',
      APPROVED: '승인',
      RECEIVING: '입고중',
      INSPECTING: '검수중',
      INSPECTED: '검수완료',
      DISPOSED: '처분완료',
      COMPLETED: '완료',
      CLOSED: '마감',
      REJECTED: '거부',
      CANCELLED: '취소'
    }
    return labels[status] || status || '-'
  }

  _rwaTypeLabel(type) {
    const labels = {
      CUSTOMER_RETURN: '고객 반품',
      VENDOR_RETURN: '공급업체 반품',
      DEFECT_RETURN: '불량품 반품',
      STOCK_ADJUST: '재고 조정',
      EXPIRED_RETURN: '유통기한 임박'
    }
    return labels[type] || type || '-'
  }

  _returnReasonLabel(reason) {
    const labels = {
      DEFECT: '상품 하자',
      WRONG_ITEM: '오배송',
      CUSTOMER_CHANGE: '고객 변심',
      DAMAGED: '파손',
      EXPIRED: '유통기한',
      OTHER: '기타'
    }
    return labels[reason] || reason || '-'
  }

  _inspTypeLabel(type) {
    const labels = { VISUAL: '외관 검수', FUNCTIONAL: '기능 검수', FULL: '전수 검수' }
    return labels[type] || type || '-'
  }

  _inspResultLabel(result) {
    const labels = { PASS: '합격', FAIL: '불합격', PARTIAL: '부분 합격' }
    return labels[result] || result || '-'
  }

  _defectTypeLabel(type) {
    const labels = {
      DAMAGED: '파손',
      EXPIRED: '유통기한',
      WRONG_ITEM: '오배송',
      MISSING_PARTS: '부품 누락',
      FUNCTIONAL_DEFECT: '기능 불량'
    }
    return labels[type] || type || '-'
  }

  _dispositionTypeLabel(type) {
    const labels = {
      RESTOCK: '재입고',
      SCRAP: '폐기',
      REPAIR: '수리',
      RETURN_VENDOR: '공급사 반송',
      DONATION: '기부'
    }
    return labels[type] || type || '-'
  }

  _formatDateTime(dateValue) {
    if (!dateValue) return '-'
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return '-'
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
}

customElements.define('rwa-order-detail', RwaOrderDetail)
