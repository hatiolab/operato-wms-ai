import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 포장 지시 상세 팝업
 *
 * 기능:
 * - 포장 지시 헤더 + 상태 배지 + 상태별 액션 버튼
 * - 수평 상태 타임라인 (6단계)
 * - 3탭: 기본정보 / 포장 항목 / 포장 박스
 * - 포장 항목·박스 탭 lazy loading
 *
 * @fires order-updated - 상태 변경 후 발생. detail: { packingOrderId }
 *
 * @example
 * const el = document.createElement('packing-order-detail')
 * el.packingOrderId = orderId
 * el.addEventListener('order-updated', () => this._fetchData())
 * UiUtil.openPopupByElement('포장 지시 상세', 'large', el, true)
 */
class PackingOrderDetail extends localize(i18next)(LitElement) {
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

        .status-badge.CREATED { background: #7B1FA2; }
        .status-badge.IN_PROGRESS { background: #FF9800; }
        .status-badge.COMPLETED { background: #2196F3; }
        .status-badge.LABEL_PRINTED { background: #1565C0; }
        .status-badge.MANIFESTED { background: #303F9F; }
        .status-badge.SHIPPED { background: #4CAF50; }
        .status-badge.CANCELLED { background: #D32F2F; }

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

        /* 수평 상태 타임라인 */
        .status-timeline {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 4px 0;
          overflow-x: auto;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 64px;
        }

        .timeline-step .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--md-sys-color-outline-variant);
          transition: all 0.2s;
        }

        .timeline-step.completed .dot {
          background: var(--md-sys-color-primary);
        }

        .timeline-step.active .dot {
          background: var(--md-sys-color-primary);
          box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.2);
        }

        .timeline-step .label {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
        }

        .timeline-step.completed .label,
        .timeline-step.active .label {
          color: var(--md-sys-color-primary);
          font-weight: 600;
        }

        .timeline-connector {
          flex: 1;
          height: 2px;
          min-width: 16px;
          background: var(--md-sys-color-outline-variant);
          margin-bottom: 18px;
        }

        .timeline-connector.completed {
          background: var(--md-sys-color-primary);
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

        /* 정보 그리드 */
        .info-grid {
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

        /* 섹션 구분 */
        .info-section-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
          margin: 20px 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .info-section-title:first-child {
          margin-top: 0;
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

        /* 포장 항목 상태 배지 */
        .item-status {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .item-status.WAIT { background: #9E9E9E; }
        .item-status.INSPECTED { background: #2196F3; }
        .item-status.PACKED { background: #4CAF50; }
        .item-status.SHORT { background: #F44336; }
        .item-status.CANCEL { background: #D32F2F; }

        /* 박스 상태 배지 */
        .box-status {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .box-status.OPEN { background: #FF9800; }
        .box-status.CLOSED { background: #2196F3; }
        .box-status.SHIPPED { background: #4CAF50; }

        /* 부족수량 강조 */
        .qty-short {
          color: #F44336;
          font-weight: 600;
        }

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

        /* 반응형 */
        @media screen and (max-width: 800px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      packingOrderId: String,
      order: Object,
      items: Array,
      boxes: Array,
      activeTab: Number,
      loading: Boolean,
      actionLoading: Boolean
    }
  }

  constructor() {
    super()
    this.packingOrderId = null
    this.order = null
    this.items = null
    this.boxes = null
    this.activeTab = 0
    this.loading = true
    this.actionLoading = false
  }

  connectedCallback() {
    super.connectedCallback()
    if (this.packingOrderId) {
      this._fetchOrder()
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">데이터 로딩 중...</div>`
    }

    if (!this.order) {
      return html`<div class="empty-state"><div class="text">포장 지시 정보를 찾을 수 없습니다</div></div>`
    }

    return html`
      ${this._renderHeader()}
      ${this._renderTabs()}
      <div class="tab-content">
        <div class="tab-panel ${this.activeTab === 0 ? 'active' : ''}">${this._renderBasicInfoTab()}</div>
        <div class="tab-panel ${this.activeTab === 1 ? 'active' : ''}">${this._renderItemsTab()}</div>
        <div class="tab-panel ${this.activeTab === 2 ? 'active' : ''}">${this._renderBoxesTab()}</div>
      </div>
    `
  }

  /* ============================================================
   * 렌더링 -- 헤더
   * ============================================================ */

  _renderHeader() {
    const o = this.order
    return html`
      <div class="detail-header">
        <div class="header-top">
          <div class="header-title">
            <h2>${o.pack_order_no || '-'}</h2>
            <span class="status-badge ${o.status}">${this._statusLabel(o.status)}</span>
          </div>
          <div class="header-actions">
            ${this._renderActionButtons()}
          </div>
        </div>

        ${this._renderTimeline()}
      </div>
    `
  }

  _renderTimeline() {
    const steps = [
      { key: 'CREATED', label: '생성' },
      { key: 'IN_PROGRESS', label: '진행중' },
      { key: 'COMPLETED', label: '완료' },
      { key: 'LABEL_PRINTED', label: '라벨출력' },
      { key: 'MANIFESTED', label: '매니페스트' },
      { key: 'SHIPPED', label: '출하' }
    ]

    const status = this.order?.status
    if (status === 'CANCELLED') {
      return html``
    }

    const statusOrder = steps.map(s => s.key)
    const currentIdx = statusOrder.indexOf(status)

    return html`
      <div class="status-timeline">
        ${steps.map((step, idx) => html`
          ${idx > 0 ? html`<div class="timeline-connector ${idx <= currentIdx ? 'completed' : ''}"></div>` : ''}
          <div class="timeline-step ${idx < currentIdx ? 'completed' : ''} ${idx === currentIdx ? 'active' : ''}">
            <div class="dot"></div>
            <span class="label">${step.label}</span>
          </div>
        `)}
      </div>
    `
  }

  _renderActionButtons() {
    const s = this.order?.status
    return html`
      ${s === 'CREATED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._startOrder}">시작</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'IN_PROGRESS' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._completeOrder}">완료</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'COMPLETED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._printLabel}">라벨출력</button>
        <button class="action-btn secondary" ?disabled="${this.actionLoading}" @click="${this._confirmShipping}">출하확정</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'LABEL_PRINTED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._manifest}">매니페스트</button>
        <button class="action-btn secondary" ?disabled="${this.actionLoading}" @click="${this._confirmShipping}">출하확정</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'MANIFESTED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._confirmShipping}">출하확정</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelOrder}">취소</button>
      ` : ''}
      ${s === 'SHIPPED' ? html`
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelShipping}">출하취소</button>
      ` : ''}
    `
  }

  /* ============================================================
   * 렌더링 -- 탭 바
   * ============================================================ */

  _renderTabs() {
    return html`
      <div class="tab-bar">
        <div class="tab-item ${this.activeTab === 0 ? 'active' : ''}" @click="${() => this._switchTab(0)}">
          기본정보
        </div>
        <div class="tab-item ${this.activeTab === 1 ? 'active' : ''}" @click="${() => this._switchTab(1)}">
          포장 항목
        </div>
        <div class="tab-item ${this.activeTab === 2 ? 'active' : ''}" @click="${() => this._switchTab(2)}">
          포장 박스
        </div>
      </div>
    `
  }

  /* ============================================================
   * Tab 0: 기본정보
   * ============================================================ */

  _renderBasicInfoTab() {
    const o = this.order
    return html`
      <div class="info-section-title">포장 지시 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">포장지시번호</span>
          <span class="info-value">${o.pack_order_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">피킹작업번호</span>
          <span class="info-value">${o.pick_task_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">출하번호</span>
          <span class="info-value">${o.shipment_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">웨이브번호</span>
          <span class="info-value">${o.wave_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">주문일</span>
          <span class="info-value">${o.order_date || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">화주사</span>
          <span class="info-value">${o.com_cd || '-'}</span>
        </div>
      </div>

      <div class="info-section-title">작업 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">창고</span>
          <span class="info-value">${o.wh_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">작업자</span>
          <span class="info-value">${o.worker_id || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">검수유형</span>
          <span class="info-value">${this._inspTypeLabel(o.insp_type)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">검수결과</span>
          <span class="info-value">${this._inspResultLabel(o.insp_result)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">택배사</span>
          <span class="info-value">${o.carrier_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">도크</span>
          <span class="info-value">${o.dock_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">스테이션</span>
          <span class="info-value">${o.station_cd || '-'}</span>
        </div>
      </div>

      <div class="info-section-title">수량 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">총 박스수</span>
          <span class="info-value">${o.total_box ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">총 중량 (kg)</span>
          <span class="info-value">${o.total_wt ?? '-'}</span>
        </div>
      </div>

      <div class="info-section-title">처리 이력</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">시작일시</span>
          <span class="info-value">${this._formatDateTime(o.started_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">완료일시</span>
          <span class="info-value">${this._formatDateTime(o.completed_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">매니페스트일시</span>
          <span class="info-value">${this._formatDateTime(o.manifested_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">출하일시</span>
          <span class="info-value">${this._formatDateTime(o.shipped_at)}</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * Tab 1: 포장 항목
   * ============================================================ */

  _renderItemsTab() {
    if (this.items === null) {
      return html`<div class="loading">포장 항목 로딩 중...</div>`
    }

    if (!this.items || !this.items.length) {
      return html`<div class="empty-state"><div class="icon">📦</div><div class="text">포장 항목이 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>상품명</th>
            <th>바코드</th>
            <th>로트번호</th>
            <th>유통기한</th>
            <th class="text-right">주문수량</th>
            <th class="text-right">검수수량</th>
            <th class="text-right">포장수량</th>
            <th class="text-right">부족수량</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          ${this.items.map(item => html`
            <tr>
              <td>${item.sku_cd || '-'}</td>
              <td>${item.sku_nm || '-'}</td>
              <td>${item.barcode || '-'}</td>
              <td>${item.lot_no || '-'}</td>
              <td>${item.expired_date || '-'}</td>
              <td class="text-right">${item.order_qty ?? 0}</td>
              <td class="text-right">${item.insp_qty ?? 0}</td>
              <td class="text-right">${item.pack_qty ?? 0}</td>
              <td class="text-right ${(item.short_qty || 0) > 0 ? 'qty-short' : ''}">${item.short_qty ?? 0}</td>
              <td><span class="item-status ${item.status}">${this._itemStatusLabel(item.status)}</span></td>
            </tr>
          `)}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">총 항목:</span>
          <span class="value">${this.items.length}건</span>
        </div>
        <div class="summary-item">
          <span class="label">총 주문:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.order_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 검수:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.insp_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 포장:</span>
          <span class="value">${this.items.reduce((s, i) => s + (i.pack_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 부족:</span>
          <span class="value ${this.items.reduce((s, i) => s + (i.short_qty || 0), 0) > 0 ? 'qty-short' : ''}">
            ${this.items.reduce((s, i) => s + (i.short_qty || 0), 0)} EA
          </span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * Tab 2: 포장 박스
   * ============================================================ */

  _renderBoxesTab() {
    if (this.boxes === null) {
      return html`<div class="loading">포장 박스 로딩 중...</div>`
    }

    if (!this.boxes || !this.boxes.length) {
      return html`<div class="empty-state"><div class="icon">📦</div><div class="text">포장 박스가 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>박스순번</th>
            <th>박스유형</th>
            <th class="text-right">박스중량 (kg)</th>
            <th class="text-right">품목수</th>
            <th class="text-right">수량</th>
            <th>송장번호</th>
            <th>차량번호</th>
            <th>라벨출력</th>
            <th>라벨출력일시</th>
            <th>출하일시</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          ${this.boxes.map(box => html`
            <tr>
              <td>${box.box_seq ?? '-'}</td>
              <td>${box.box_type_cd || '-'}</td>
              <td class="text-right">${box.box_wt ?? '-'}</td>
              <td class="text-right">${box.total_item ?? 0}</td>
              <td class="text-right">${box.total_qty ?? 0}</td>
              <td>${box.invoice_no || '-'}</td>
              <td>${box.vehicle_no || '-'}</td>
              <td>${box.label_printed_flag ? html`<span style="color:#4CAF50">&#10004;</span>` : html`<span style="color:#9E9E9E">&#10008;</span>`}</td>
              <td>${this._formatDateTime(box.label_printed_at)}</td>
              <td>${this._formatDateTime(box.shipped_at)}</td>
              <td><span class="box-status ${box.status}">${this._boxStatusLabel(box.status)}</span></td>
            </tr>
          `)}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">총 박스:</span>
          <span class="value">${this.boxes.length}건</span>
        </div>
        <div class="summary-item">
          <span class="label">총 품목:</span>
          <span class="value">${this.boxes.reduce((s, b) => s + (b.total_item || 0), 0)}건</span>
        </div>
        <div class="summary-item">
          <span class="label">총 수량:</span>
          <span class="value">${this.boxes.reduce((s, b) => s + (b.total_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 중량:</span>
          <span class="value">${this.boxes.reduce((s, b) => s + (b.box_wt || 0), 0).toFixed(2)} kg</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  async _fetchOrder() {
    this.loading = true
    try {
      const data = await ServiceUtil.restGet('packing_orders/' + this.packingOrderId)
      this.order = data
    } catch (error) {
      console.error('포장 지시 상세 조회 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: '포장 지시 상세 조회에 실패했습니다' } }))
    } finally {
      this.loading = false
    }
  }

  async _fetchItems() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/packing_orders/' + this.packingOrderId + '/items')
      this.items = data || []
    } catch (error) {
      console.error('포장 항목 조회 실패:', error)
      this.items = []
    }
  }

  async _fetchBoxes() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/packing_orders/' + this.packingOrderId + '/boxes')
      this.boxes = data || []
    } catch (error) {
      console.error('포장 박스 조회 실패:', error)
      this.boxes = []
    }
  }

  /* ============================================================
   * 탭 전환 (lazy loading)
   * ============================================================ */

  _switchTab(index) {
    this.activeTab = index

    if (index === 1 && this.items === null) {
      this._fetchItems()
    }

    if (index === 2 && this.boxes === null) {
      this._fetchBoxes()
    }
  }

  /* ============================================================
   * 액션
   * ============================================================ */

  async _startOrder() {
    const result = await UiUtil.showAlertPopup('title.confirm', '포장 작업을 시작하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/packing_orders/' + this.packingOrderId + '/start')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '포장 작업이 시작되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('포장 작업 시작 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '포장 작업 시작에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  async _completeOrder() {
    const result = await UiUtil.showAlertPopup('title.confirm', '포장 작업을 완료하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/packing_orders/' + this.packingOrderId + '/complete')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '포장 작업이 완료되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('포장 작업 완료 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '포장 작업 완료에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  async _printLabel() {
    const result = await UiUtil.showAlertPopup('title.confirm', '라벨을 출력하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/packing_orders/' + this.packingOrderId + '/print_label')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '라벨이 출력되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('라벨 출력 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '라벨 출력에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  async _manifest() {
    const result = await UiUtil.showAlertPopup('title.confirm', '매니페스트를 처리하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/packing_orders/' + this.packingOrderId + '/manifest')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '매니페스트가 처리되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('매니페스트 처리 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '매니페스트 처리에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  async _confirmShipping() {
    const result = await UiUtil.showAlertPopup('title.confirm', '출하를 확정하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/packing_orders/' + this.packingOrderId + '/confirm_shipping')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '출하가 확정되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('출하 확정 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '출하 확정에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  async _cancelOrder() {
    const result = await UiUtil.showAlertPopup('title.confirm', '포장 지시를 취소하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', 'warning', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/packing_orders/' + this.packingOrderId + '/cancel')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '포장 지시가 취소되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('포장 지시 취소 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '포장 지시 취소에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  async _cancelShipping() {
    const result = await UiUtil.showAlertPopup('title.confirm', '출하를 취소하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', 'warning', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/packing_orders/' + this.packingOrderId + '/cancel_shipping')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '출하가 취소되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('출하 취소 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '출하 취소에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  async _refreshAfterAction() {
    this.items = null
    this.boxes = null
    await this._fetchOrder()
    this._dispatchOrderUpdated()

    if (this.activeTab === 1) {
      this._fetchItems()
    } else if (this.activeTab === 2) {
      this._fetchBoxes()
    }
  }

  _dispatchOrderUpdated() {
    this.dispatchEvent(
      new CustomEvent('order-updated', {
        composed: true,
        bubbles: true,
        detail: { packingOrderId: this.packingOrderId }
      })
    )
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _statusLabel(status) {
    const labels = {
      CREATED: '생성',
      IN_PROGRESS: '진행중',
      COMPLETED: '완료',
      LABEL_PRINTED: '라벨출력',
      MANIFESTED: '매니페스트',
      SHIPPED: '출하',
      CANCELLED: '취소'
    }
    return labels[status] || status || '-'
  }

  _itemStatusLabel(status) {
    const labels = {
      WAIT: '대기',
      INSPECTED: '검수완료',
      PACKED: '포장완료',
      SHORT: '부족',
      CANCEL: '취소'
    }
    return labels[status] || status || '-'
  }

  _boxStatusLabel(status) {
    const labels = {
      OPEN: '오픈',
      CLOSED: '마감',
      SHIPPED: '출하'
    }
    return labels[status] || status || '-'
  }

  _inspTypeLabel(type) {
    const labels = {
      FULL: '전수검수',
      SAMPLE: '샘플검수',
      SKIP: '검수생략'
    }
    return labels[type] || type || '-'
  }

  _inspResultLabel(result) {
    const labels = {
      PASS: '합격',
      FAIL: '불합격',
      PENDING: '대기'
    }
    return labels[result] || result || '-'
  }

  _formatDateTime(dateValue) {
    if (!dateValue) return '-'
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return '-'
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
}

customElements.define('packing-order-detail', PackingOrderDetail)
