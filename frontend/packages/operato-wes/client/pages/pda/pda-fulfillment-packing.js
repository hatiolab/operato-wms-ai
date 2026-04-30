import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'
import '../../component/sku-barcode-input.js'

/**
 * PDA 포장 화면
 *
 * 피킹 완료 후 포장 스테이션에서 작업자가 PDA로 상품 바코드를 스캔하여
 * 검수(inspection)하고, 포장 정보(박스/운송장)를 입력하여 출고를 확정하는 화면.
 * PC 포장 화면(fulfillment-packing-pc.js)의 PDA 최적화 버전.
 */
@customElement('pda-fulfillment-packing')
export class PdaFulfillmentPacking extends connect(store)(PageView) {
  /** 화면 모드: list / inspection / packing / complete */
  @state() mode = 'list'

  /** 포장 지시 목록 */
  @state() packingOrders = []
  /** 필터 상태 */
  @state() filterStatus = 'ALL'
  /** 로딩 상태 */
  @state() loading = false

  /** 선택된 포장 지시 */
  @state() selectedOrder = null
  /** 검수 항목 목록 */
  @state() packingItems = []
  /** 현재 검수 항목 인덱스 */
  @state() currentItemIndex = -1
  /** 검수 완료 항목 수 */
  @state() completedCount = 0
  /** 총 검수 항목 수 */
  @state() totalCount = 0
  /** 마지막 스캔 결과 */
  @state() lastScannedItem = null
  /** 탭 키 (waiting / done) */
  @state() currentTabKey = 'waiting'
  /** API 처리 중 */
  @state() processing = false

  /** 박스 유형 */
  @state() boxType = 'MEDIUM'
  /** 박스 수량 */
  @state() boxCount = 1
  /** 박스 중량 */
  @state() boxWeight = 0
  /** 운송장번호 */
  @state() trackingNo = ''

  /** 작업 시작 시각 */
  @state() startedAt = null

  @query('sku-barcode-input') _skuBarcodeInput
  @query('#trackingInput') _trackingInput
  @query('#packOrderScanInput') _packOrderScanInput

  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      CommonGristStyles,
      CommonHeaderStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-surface, #fafafa);
          overflow-y: auto;
        }

        /* 헤더 바 — 서브 네비게이션 (시스템 타이틀 바와 구분) */
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--md-sys-color-surface-container-low, #f5f5f5);
          color: var(--md-sys-color-on-surface, #333);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .header-bar .title {
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .header-bar .back-btn {
          background: none;
          border: none;
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
        }

        .header-bar .actions {
          display: flex;
          gap: 8px;
        }

        .header-bar button {
          padding: 5px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .header-bar button:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .header-bar button.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .header-bar button:disabled {
          opacity: 0.4;
        }

        /* 현황 요약 카드 */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px 12px;
        }

        .summary-card {
          text-align: center;
          padding: 10px 4px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.15s;
          border: 2px solid transparent;
        }

        .summary-card[active] {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 6px rgba(25, 118, 210, 0.25);
        }

        .summary-card .count {
          font-size: 22px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-card .card-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .summary-card.waiting .count {
          color: var(--md-sys-color-error, #d32f2f);
        }

        .summary-card.done .count {
          color: #4CAF50;
        }

        /* 포장 지시 카드 목록 */
        .order-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px;
        }

        .order-card {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .order-card:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .order-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-card .pack-no {
          font-weight: bold;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .order-card .status-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .order-card .status-badge.created {
          background: #fff3e0;
          color: #ff9800;
        }

        .order-card .status-badge.in_progress {
          background: #e3f2fd;
          color: #1976d2;
        }

        .order-card .status-badge.completed {
          background: #e8f5e9;
          color: #4CAF50;
        }

        .order-card .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 6px;
        }

        .order-card .progress-bar {
          height: 4px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }

        .order-card .progress-bar .fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 2px;
          transition: width 0.3s;
        }

        /* 포장번호 스캔 입력 + 새로고침 */
        .scan-pack-order {
          padding: 8px 12px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-pack-order label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        .scan-pack-order ox-input-barcode {
          flex: 1;
          min-width: 0;
        }

        .scan-pack-order .btn-refresh {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .scan-pack-order .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* 진행률 바 */
        .progress-section {
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar-large {
          flex: 1;
          height: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-large .fill {
          height: 100%;
          background: var(--md-sys-color-primary, #1976D2);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .progress-text {
          flex-shrink: 0;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 현재 검수 항목 */
        .current-item-section {
          margin: 4px 12px;
          padding: 12px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
        }

        .current-item-section .item-info {
          font-size: 14px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
        }

        .current-item-section .item-info .sku {
          font-weight: bold;
          font-size: 15px;
        }

        .current-item-section .item-info .qty {
          font-size: 16px;
          font-weight: bold;
          margin-top: 4px;
        }

        .current-item-section .item-info .lot {
          font-size: 12px;
          margin-top: 4px;
          opacity: 0.8;
        }

        .current-item-section .barcode-input {
          margin-top: 10px;
        }

        .current-item-section .barcode-input label {
          display: block;
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          margin-bottom: 4px;
        }

        .current-item-section sku-barcode-input {
          width: 100%;
        }

        /* 스캔 피드백 */
        .scan-feedback {
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .scan-feedback.success {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .scan-feedback.error {
          background: #ffebee;
          color: #c62828;
        }

        .scan-feedback.warning {
          background: #fff3e0;
          color: #e65100;
        }

        /* 탭 바 */
        .tabs {
          display: flex;
          margin: 8px 12px 0;
          gap: 2px;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          color: var(--md-sys-color-on-primary-container, #1565c0);
          border-radius: 8px 8px 0 0;
          font-size: 13px;
          cursor: pointer;
          opacity: 0.65;
          transition: all 0.15s;
        }

        .tab[activate] {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          opacity: 1;
          font-weight: bold;
        }

        .tab .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.15);
          font-size: 11px;
          font-weight: bold;
        }

        .tab[activate] .badge {
          background: rgba(255, 255, 255, 0.3);
        }

        /* 탭 콘텐츠 */
        .tab-content {
          flex: 1;
          overflow-y: auto;
          margin: 0 12px 12px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 0 8px 8px 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* 검수 항목 카드 */
        .item-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .item-card:last-child {
          border-bottom: none;
        }

        .item-card .icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .item-card .info {
          flex: 1;
          min-width: 0;
        }

        .item-card .sku {
          font-weight: bold;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .item-card .name {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-card .qty-badge {
          font-size: 13px;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* 포장 정보 입력 (packing 모드) */
        .packing-section {
          padding: 12px;
          flex: 1;
          overflow-y: auto;
        }

        .packing-section .complete-banner {
          text-align: center;
          padding: 16px;
          background: #e8f5e9;
          border-radius: 8px;
          margin-bottom: 16px;
          color: #2e7d32;
          font-weight: 600;
        }

        .packing-section .form-group {
          margin-bottom: 14px;
        }

        .packing-section .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-bottom: 6px;
        }

        .box-type-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .box-type-chip {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
        }

        .box-type-chip[active] {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .packing-section input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 14px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          box-sizing: border-box;
        }

        .packing-section input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          outline: none;
        }

        .btn-confirm {
          display: block;
          width: calc(100% - 24px);
          margin: 12px;
          padding: 14px;
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }

        .btn-confirm:active {
          opacity: 0.9;
        }

        .btn-confirm:disabled {
          opacity: 0.4;
        }

        /* 완료 화면 (complete 모드) */
        .complete-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
        }

        .complete-section .check-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .complete-section h3 {
          margin: 0 0 16px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .complete-section .result-card {
          width: 100%;
          max-width: 320px;
          padding: 16px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: left;
          font-size: 14px;
          line-height: 1.8;
          color: var(--md-sys-color-on-surface, #333);
        }

        .complete-section .result-card .label {
          color: var(--md-sys-color-on-surface-variant, #666);
          font-size: 12px;
        }

        .complete-section .btn-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .complete-section .btn-group button {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .complete-section .btn-next {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border: none;
        }

        .complete-section .btn-list {
          background: transparent;
          color: var(--md-sys-color-primary, #1976D2);
          border: 1px solid var(--md-sys-color-primary, #1976D2);
        }

        /* 빈 상태 메시지 */
        .empty-message {
          text-align: center;
          padding: 40px 20px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 14px;
        }

        /* 로딩 */
        .loading-overlay {
          text-align: center;
          padding: 30px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }
      `
    ]
  }

  get context() {
    return {
      title: TermsUtil.tMenu('FulfillmentPackingWork')
    }
  }

  /** 화면 렌더링 — 모드별 분기 */
  render() {
    return html`
      ${this.mode !== 'list' ? this._renderHeader() : ''}
      ${this.mode === 'list'
        ? this._renderListMode()
        : this.mode === 'inspection'
          ? this._renderInspectionMode()
          : this.mode === 'packing'
            ? this._renderPackingMode()
            : this._renderCompleteMode()}
    `
  }

  /** 헤더 바 렌더링 — inspection/packing/complete 모드 타이틀 및 버튼 */
  _renderHeader() {
    const orderNo = this.selectedOrder?.pack_order_no || ''
    return html`
      <div class="header-bar">
        <span class="title">
          <button class="back-btn" @click=${this._goBack}>◀</button>
          ${orderNo}
        </span>
        <div class="actions">
          ${this.mode === 'inspection' ? html`
            <button @click=${this._skipItem}
              ?disabled=${this.processing || this.currentItemIndex < 0}>
              ${TermsUtil.tButton('skip') || '건너뛰기'}
            </button>
            <button class="primary" @click=${this._onInspectionComplete}
              ?disabled=${this.processing}>
              ${TermsUtil.tLabel('inspection_complete') || '검수완료'}
            </button>
          ` : ''}
        </div>
      </div>
    `
  }

  /** list 모드 렌더링 — 현황 요약, 필터, 포장 지시 목록, 포장번호 스캔 */
  _renderListMode() {
    if (this.loading) {
      return html`<div class="loading-overlay">${TermsUtil.tLabel('loading') || '로딩 중...'}</div>`
    }

    const waiting = this.packingOrders.filter(o => o.status === 'CREATED')
    const inProgress = this.packingOrders.filter(o => o.status === 'IN_PROGRESS')
    const done = this.packingOrders.filter(o => !['CREATED', 'IN_PROGRESS', 'CANCELLED'].includes(o.status))
    const filtered = this.filterStatus === 'CREATED' ? waiting
      : this.filterStatus === 'IN_PROGRESS' ? inProgress
        : this.filterStatus === 'DONE' ? done
          : this.packingOrders

    return html`
      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active=${this.filterStatus === 'CREATED'}
          @click=${() => this._toggleFilter('CREATED')}>
          <div class="count">${waiting.length}</div>
          <div class="card-label">${TermsUtil.tLabel('wait') || '대기'}</div>
        </div>
        <div class="summary-card"
          ?active=${this.filterStatus === 'IN_PROGRESS'}
          @click=${() => this._toggleFilter('IN_PROGRESS')}>
          <div class="count">${inProgress.length}</div>
          <div class="card-label">${TermsUtil.tLabel('in_progress') || '진행중'}</div>
        </div>
        <div class="summary-card done"
          ?active=${this.filterStatus === 'DONE'}
          @click=${() => this._toggleFilter('DONE')}>
          <div class="count">${done.length}</div>
          <div class="card-label">${TermsUtil.tLabel('completed') || '완료'}</div>
        </div>
      </div>

      <div class="order-list">
        ${filtered.length === 0
        ? html`<div class="empty-message">${TermsUtil.tText('no_packing_data') || '포장 작업이 없습니다'}</div>`
        : filtered.map(order => this._renderOrderCard(order))}
      </div>

      <div class="scan-pack-order">
        <label>${TermsUtil.tLabel('pack_order_no') || '포장지시번호'}</label>
        <ox-input-barcode id="packOrderScanInput"
          placeholder="포장번호 스캔"
          @change=${e => this._onScanPackingOrder(e.target.value)}>
        </ox-input-barcode>
        <button class="btn-refresh" @click=${this._refresh}>${TermsUtil.tButton('refresh') || '새로고침'}</button>
      </div>
    `
  }

  /** 포장 지시 카드 렌더링 */
  _renderOrderCard(order) {
    const isInProgress = order.status === 'IN_PROGRESS'
    const packedQty = order.packed_qty || 0
    const totalItems = order.total_items || order.total_item || 0
    const progressPct = totalItems > 0 ? Math.round((packedQty / totalItems) * 100) : 0

    return html`
      <div class="order-card" @click=${() => this._selectOrder(order)}>
        <div class="card-header">
          <span class="pack-no">포장지시번호: ${order.pack_order_no}</span>
          <span class="status-badge ${(order.status || '').toLowerCase()}">
            ${order.status === 'CREATED' ? (TermsUtil.tLabel('wait') || '대기')
        : order.status === 'IN_PROGRESS' ? (TermsUtil.tLabel('in_progress') || '진행중')
          : (TermsUtil.tLabel('completed') || '완료')}
          </span>
        </div>
        <div class="sub-info">
          ${order.shipment_no || ''} · ${order.carrier_cd || ''} · ${order.total_items || 0}종 ${order.total_qty || 0}EA
        </div>
        ${isInProgress ? html`
          <div class="progress-bar">
            <div class="fill" style="width: ${progressPct}%"></div>
          </div>
        ` : ''}
      </div>
    `
  }

  /** inspection 모드 렌더링 — 진행률, 현재 항목, 바코드 스캔, 탭 */
  _renderInspectionMode() {
    const progressPct = this.totalCount > 0 ? Math.round((this.completedCount / this.totalCount) * 100) : 0
    const totalQty = this.packingItems.reduce((s, i) => s + (i.order_qty || 0), 0)
    const doneQty = this.packingItems.reduce((s, i) => s + (i.insp_qty || 0), 0)
    const currentItem = this.currentItemIndex >= 0 ? this.packingItems[this.currentItemIndex] : null

    return html`
      <div class="progress-section">
        <div class="progress-bar-large">
          <div class="fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="progress-text">${this.completedCount}/${this.totalCount}종 (${doneQty}/${totalQty} EA)</div>
      </div>

      ${currentItem ? html`
        <div class="current-item-section">
          <div class="item-info">
            <div class="sku">상품 : ${currentItem.sku_cd} ${currentItem.sku_nm ? `(${currentItem.sku_nm})` : ''}</div>
            <div class="qty">검수 수량 : ${currentItem.insp_qty || 0} / ${currentItem.order_qty || 0} EA</div>
            ${currentItem.lot_no ? html`<div class="lot">LOT: ${currentItem.lot_no} ${currentItem.expired_date ? `· ${currentItem.expired_date}` : ''}</div>` : ''}
          </div>
          <div class="barcode-input">
            <sku-barcode-input
              .comCd="${this.selectedOrder?.com_cd || ''}"
              placeholder="상품 바코드 스캔"
              ?disabled=${this.processing}
              @sku-select=${this._onSkuSelect}>
            </sku-barcode-input>
          </div>
          ${this.lastScannedItem ? html`
            <div class="scan-feedback ${this.lastScannedItem.success ? 'success' : 'error'}">
              ${this.lastScannedItem.message}
            </div>
          ` : ''}
        </div>
      ` : html`
        <div class="current-item-section">
          <div class="item-info">모든 항목이 검수 완료되었습니다</div>
        </div>
      `}

      ${this._renderInspectionTabs()}
      ${this._renderInspectionTabContent()}
    `
  }

  /** 검수 모드 탭 바 렌더링 */
  _renderInspectionTabs() {
    const waitingItems = this.packingItems.filter(i => i.status !== 'COMPLETED')
    const doneItems = this.packingItems.filter(i => i.status === 'COMPLETED')

    return html`
      <div class="tabs">
        <div class="tab" ?activate=${'waiting' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'waiting')}>
          <span>${TermsUtil.tLabel('wait') || '대기'}</span>
          <span class="badge">${waitingItems.length}</span>
        </div>
        <div class="tab" ?activate=${'done' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'done')}>
          <span>${TermsUtil.tLabel('completed') || '완료'}</span>
          <span class="badge">${doneItems.length}</span>
        </div>
      </div>
    `
  }

  /** 검수 모드 탭 콘텐츠 렌더링 */
  _renderInspectionTabContent() {
    const items = this.currentTabKey === 'waiting'
      ? this.packingItems.filter(i => i.status !== 'COMPLETED')
      : this.packingItems.filter(i => i.status === 'COMPLETED')

    if (!items.length) {
      return html`<div class="tab-content"><div class="empty-message">
        ${this.currentTabKey === 'waiting' ? '대기 항목 없음' : '완료 항목 없음'}
      </div></div>`
    }

    return html`
      <div class="tab-content">
        ${items.map((item, idx) => {
      const isCurrentItem = this.packingItems.indexOf(item) === this.currentItemIndex
      const icon = item.status === 'COMPLETED' ? '✅' : isCurrentItem ? '▶' : '☐'

      return html`
            <div class="item-card">
              <span class="icon">${icon}</span>
              <div class="info">
                <div class="sku">${item.sku_cd}</div>
                <div class="name">${item.sku_nm || '-'}</div>
              </div>
              <span class="qty-badge">${item.insp_qty || 0}/${item.order_qty || 0}</span>
            </div>
          `
    })}
      </div>
    `
  }

  /** packing 모드 렌더링 — 포장 정보 입력 + 출고 확정 버튼 */
  _renderPackingMode() {
    return html`
      <div class="packing-section">
        <div class="complete-banner">
          ✅ ${TermsUtil.tLabel('inspection_complete') || '검수 완료'} — ${this.totalCount}종 전체 확인
        </div>

        <div class="form-group">
          <label>${TermsUtil.tLabel('box_type_cd') || '박스 유형'}</label>
          <div class="box-type-chips">
            ${['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'].map(t => html`
              <span class="box-type-chip" ?active=${this.boxType === t}
                @click=${() => (this.boxType = t)}>${t}</span>
            `)}
          </div>
        </div>

        <div class="form-group">
          <label>${TermsUtil.tLabel('box_qty') || '박스 수량'}</label>
          <input type="number" min="1" .value=${String(this.boxCount)}
            @input=${e => (this.boxCount = parseInt(e.target.value) || 1)} />
        </div>

        <div class="form-group">
          <label>${TermsUtil.tLabel('box_wt') || '박스 중량 (kg)'}</label>
          <input type="number" min="0" step="0.1" .value=${String(this.boxWeight)}
            @input=${e => (this.boxWeight = parseFloat(e.target.value) || 0)} />
        </div>

        <div class="form-group">
          <label>${TermsUtil.tLabel('invoice_no') || '운송장번호'}</label>
          <ox-input-barcode id="trackingInput"
            placeholder="운송장번호 스캔 또는 입력"
            @change=${e => (this.trackingNo = e.target.value)}>
          </ox-input-barcode>
        </div>
      </div>

      <button class="btn-confirm"
        ?disabled=${this.processing}
        @click=${this._confirmRelease}>
        ${TermsUtil.tButton('confirm_release') || '출고 확정'}
      </button>
    `
  }

  /** complete 모드 렌더링 — 완료 통계 + 다음작업/목록 버튼 */
  _renderCompleteMode() {
    const isViewMode = !this.startedAt
    const totalQty = this.packingItems.reduce((s, i) => s + (i.insp_qty || i.pack_qty || i.order_qty || 0), 0)

    let timeInfo = ''
    if (isViewMode) {
      timeInfo = this.selectedOrder?.completed_at || '-'
    } else {
      const elapsed = Math.round((Date.now() - this.startedAt) / 1000)
      const min = Math.floor(elapsed / 60)
      const sec = elapsed % 60
      timeInfo = `${min}분 ${sec}초`
    }

    return html`
      <div class="complete-section">
        <div class="check-icon">✅</div>
        <h3>${TermsUtil.tLabel('packing_complete') || '포장 완료!'}</h3>

        <div class="result-card">
          <div><span class="label">${TermsUtil.tLabel('pack_order_no') || '포장지시'}:</span> ${this.selectedOrder?.pack_order_no}</div>
          <div><span class="label">${TermsUtil.tLabel('pack_qty') || '포장 수량'}:</span> ${totalQty} EA (${this.totalCount}종)</div>
          <div><span class="label">${TermsUtil.tLabel('box_type_cd') || '박스유형'}:</span> ${this.boxType} × ${this.boxCount}</div>
          <div><span class="label">${TermsUtil.tLabel('invoice_no') || '운송장'}:</span> ${this.trackingNo}</div>
          <div><span class="label">${TermsUtil.tLabel('carrier_cd') || '택배사'}:</span> ${this.selectedOrder?.carrier_cd || '-'}</div>
          <div><span class="label">${isViewMode ? (TermsUtil.tLabel('completed_at') || '완료시각') : (TermsUtil.tLabel('elapsed_time') || '소요시간')}:</span> ${timeInfo}</div>
        </div>

        <div class="btn-group">
          ${!isViewMode ? html`
            <button class="btn-next" @click=${this._selectNextOrder}>
              ${TermsUtil.tButton('next_packing') || '다음 포장 작업'}
            </button>
          ` : ''}
          <button class="btn-list" @click=${this._goBack}>
            ${TermsUtil.tButton('go_list') || '목록으로'}
          </button>
        </div>
      </div>
    `
  }

  /* ==================== Lifecycle ==================== */

  /** 페이지 초기화 — 포장 지시 목록 조회 */
  pageInitialized() {
    this._loadPackingOrders()
  }

  /* ==================== Data Loading ==================== */

  /** 포장 지시 목록 조회 (todo + done) */
  async _loadPackingOrders() {
    this.loading = true
    try {
      const [todo, done] = await Promise.all([
        ServiceUtil.restGet('ful_trx/packing_orders/todo', {}),
        ServiceUtil.restGet('ful_trx/packing_orders/done', {})
      ])
      this.packingOrders = [...(todo || []), ...(done || [])]
    } catch (error) {
      console.error('포장 지시 목록 조회 실패:', error)
      this.packingOrders = []
    } finally {
      this.loading = false
    }
  }

  /** 포장 항목 목록 조회 + 현재 항목 설정 */
  async _loadPackingItems(orderId) {
    try {
      const items = await ServiceUtil.restGet('ful_trx/packing_order_items', { packing_order_id: orderId })
      this.packingItems = items || []
      this.totalCount = this.packingItems.length
      this.completedCount = this.packingItems.filter(i => i.status === 'PACKED' || i.status === 'INSPECTED').length
      this._moveToNextItem()
    } catch (error) {
      console.error('포장 항목 조회 실패:', error)
      this.packingItems = []
    }
  }

  /** 포장 박스 목록 조회 → 박스/운송장 상태 변수에 반영 */
  async _loadPackingBoxes(orderId) {
    try {
      const boxes = await ServiceUtil.restGet(`ful_trx/packing_orders/${orderId}/boxes`)
      if (boxes && boxes.length > 0) {
        const firstBox = boxes[0]
        this.boxType = firstBox.box_type_cd || '-'
        this.boxCount = boxes.length
        this.boxWeight = firstBox.box_wt || 0
        this.trackingNo = firstBox.invoice_no || '-'
      } else {
        this.boxType = '-'
        this.boxCount = 0
        this.boxWeight = 0
        this.trackingNo = '-'
      }
    } catch (error) {
      console.error('포장 박스 조회 실패:', error)
      this.boxType = '-'
      this.boxCount = 0
      this.boxWeight = 0
      this.trackingNo = '-'
    }
  }

  /* ==================== Event Handlers ==================== */

  /** 포장 지시 선택 → 완료 주문은 상세 보기, 미완료 주문은 작업 시작 */
  async _selectOrder(order) {
    if (this.processing) return
    this.processing = true

    try {
      // 완료된 주문 → 상세 보기 (complete 모드)
      if (!['CREATED', 'IN_PROGRESS'].includes(order.status)) {
        this.selectedOrder = order
        this.startedAt = null
        await this._loadPackingItems(order.id)
        await this._loadPackingBoxes(order.id)
        this.mode = 'complete'
        return
      }

      if (order.status === 'CREATED') {
        await ServiceUtil.restPost(`ful_trx/packing_orders/${order.id}/start`, {})
        order.status = 'IN_PROGRESS'
      }

      this.selectedOrder = order
      this.startedAt = Date.now()
      this.lastScannedItem = null
      this.currentTabKey = 'waiting'
      this.trackingNo = ''

      await this._loadPackingItems(order.id)
      this._recommendBoxType()
      this.mode = 'inspection'

      setTimeout(() => this._focusBarcodeInput(), 200)
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '포장 작업을 시작할 수 없습니다' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 포장번호 바코드 스캔으로 빠른 선택 */
  _onScanPackingOrder(barcode) {
    if (!barcode) return
    const order = this.packingOrders.find(o => o.pack_order_no === barcode)
    if (order) {
      this._selectOrder(order)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `포장번호를 찾을 수 없습니다: ${barcode}` }
      }))
      navigator.vibrate?.(200)
    }
    if (this._packOrderScanInput) {
      this._packOrderScanInput.value = ''
    }
  }

  /** 상품 바코드 스캔 처리 — sku-barcode-input이 SKU 해석 후 발생시키는 sku-select 이벤트 핸들러 */
  async _onSkuSelect(e) {
    if (this.processing) return
    const { sku_cd, sku_nm } = e.detail

    const matchIndex = this.packingItems.findIndex(
      item => item.status !== 'COMPLETED' &&
        (item.sku_cd === sku_cd || item.product_cd === sku_cd)
    )

    if (matchIndex >= 0) {
      const item = this.packingItems[matchIndex]
      const orderQty = item.pack_qty || item.order_qty || 1
      const currentInspQty = item.insp_qty || 0

      if (currentInspQty >= orderQty) {
        this.lastScannedItem = { success: false, message: `${item.sku_cd} — 이미 검수 완료` }
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'warn', message: '이미 검수 완료된 상품입니다' }
        }))
        return
      }

      this.currentItemIndex = matchIndex
      const newInspQty = currentInspQty + 1

      this.packingItems = this.packingItems.map((it, idx) =>
        idx === matchIndex ? { ...it, insp_qty: newInspQty } : it
      )

      this.lastScannedItem = {
        success: true,
        message: `${item.sku_cd} (${item.sku_nm || sku_nm || ''}) — ${newInspQty}/${orderQty} ✅`
      }

      if (newInspQty >= orderQty) {
        await this._confirmInspection(matchIndex)
      } else {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `스캔 확인 (${newInspQty}/${orderQty})` }
        }))
      }
    } else {
      this.lastScannedItem = { success: false, message: `포장 항목에 없는 상품: ${sku_cd}` }
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: `포장 항목에 없는 상품입니다: ${sku_cd}` }
      }))
      navigator.vibrate?.(200)
    }
  }

  /** 검수 완료 API 호출 — 항목 상태 갱신 및 전체 완료 체크 */
  async _confirmInspection(itemIndex) {
    const item = this.packingItems[itemIndex]
    if (!item) return

    this.processing = true
    try {
      const confirmQty = item.insp_qty || item.pack_qty || item.order_qty || 1
      await ServiceUtil.restPost(`ful_trx/packing_order_items/${item.id}/finish`, {
        barcode: item.barcode || '',
        packQty: confirmQty,
        lotNo: item.lot_no || '',
        expiredDate: item.expired_date || ''
      })

      this.packingItems = this.packingItems.map((it, idx) =>
        idx === itemIndex ? { ...it, status: 'PACKED' } : it
      )
      this.completedCount = this.packingItems.filter(i => i.status === 'PACKED' || i.status === 'INSPECTED').length

      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: `검수 완료 (${this.completedCount}/${this.totalCount})` }
      }))

      if (this.completedCount >= this.totalCount) {
        this._onInspectionComplete()
      } else {
        this._moveToNextItem()
      }
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '검수 처리 중 오류' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 전체 검수 완료 → packing 모드 전환 */
  _onInspectionComplete() {
    this.mode = 'packing'
    setTimeout(() => {
      if (this._trackingInput) this._trackingInput.focus()
    }, 200)
  }

  /** 출고 확정 API 호출 — 포장 정보 전송 */
  async _confirmRelease() {
    if (!this.trackingNo.trim()) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'warn', message: '운송장번호를 입력해주세요' }
      }))
      return
    }

    this.processing = true
    try {
      await ServiceUtil.restPost(`ful_trx/packing_orders/${this.selectedOrder.id}/complete`, {
        boxType: this.boxType,
        boxCount: this.boxCount,
        boxWeight: this.boxWeight,
        trackingNo: this.trackingNo.trim()
      })

      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '출고 확정 완료' }
      }))

      this.mode = 'complete'
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '출고 확정 실패' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 현재 항목 건너뛰기 — 다음 미완료 항목으로 이동 */
  _skipItem() {
    this._moveToNextItem()
    this.lastScannedItem = null
    this._focusBarcodeInput()
  }

  /** 요약 카드 필터 토글 — 동일 카드 재클릭 시 전체(ALL)로 복귀 */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? 'ALL' : status
  }

  /** 목록 새로고침 */
  async _refresh() {
    await this._loadPackingOrders()
  }

  /** 목록 화면으로 복귀 */
  async _goBack() {
    this.mode = 'list'
    this.selectedOrder = null
    this.packingItems = []
    this.currentItemIndex = -1
    await this._loadPackingOrders()
  }

  /** 다음 포장 지시 자동 선택 */
  async _selectNextOrder() {
    await this._loadPackingOrders()
    const nextOrder = this.packingOrders.find(o => o.status === 'CREATED')
    if (nextOrder) {
      this._selectOrder(nextOrder)
    } else {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: '대기 중인 포장 작업이 없습니다' }
      }))
      this._goBack()
    }
  }

  /* ==================== Helpers ==================== */

  /** 다음 미완료 항목으로 인덱스 이동 */
  _moveToNextItem() {
    const nextIdx = this.packingItems.findIndex(i => i.status !== 'COMPLETED')
    this.currentItemIndex = nextIdx
  }

  /** 수량 기반 박스 유형 자동 추천 */
  _recommendBoxType() {
    const totalQty = this.packingItems.reduce((s, i) => s + (i.pack_qty || i.order_qty || 0), 0)
    if (totalQty <= 3) this.boxType = 'SMALL'
    else if (totalQty <= 10) this.boxType = 'MEDIUM'
    else if (totalQty <= 30) this.boxType = 'LARGE'
    else this.boxType = 'XLARGE'
  }

  /** 바코드 입력 필드에 포커스 설정 */
  _focusBarcodeInput() {
    setTimeout(() => this._skuBarcodeInput?.focus(), 100)
  }
}
