import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * B2B 단건 출고 준비 팝업
 *
 * 단일 출고 주문의 상세 아이템을 표시하고, '출고 준비(confirm_and_allocate)'와
 * '피킹 지시 생성(direct_picking/create)' 처리를 제공한다.
 * 작업장(stationCd) 선택 없이는 피킹 지시 생성 불가.
 *
 * @property {Object} order - 외부에서 전달받은 출고 주문 객체
 * @fires picking-started - 피킹 지시 생성 처리 완료 시 발생
 */
class ShipmentOrderReadyPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 480px;
          overflow: hidden;
        }

        /* 주문 정보 요약 바 */
        .info-bar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px 20px;
          padding: 12px 20px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 13px;
          flex-shrink: 0;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .info-item .label {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .info-item .value {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #333);
        }

        .info-divider {
          color: var(--md-sys-color-outline-variant, #ccc);
          font-size: 16px;
        }

        /* 작업장 / 작업자 수 컨트롤 */
        .control-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 13px;
          flex-shrink: 0;
        }

        .control-bar label {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant, #555);
          white-space: nowrap;
        }

        .control-bar select,
        .control-bar input[type='number'] {
          padding: 4px 8px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface, #fff);
          outline: none;
        }

        .control-bar select {
          min-width: 180px;
          cursor: pointer;
        }

        .control-bar select:focus,
        .control-bar input[type='number']:focus {
          box-shadow: 0 0 0 2px rgba(25,118,210,0.2);
        }

        .control-bar input[type='number'] {
          width: 64px;
          text-align: center;
        }

        .control-divider {
          color: var(--md-sys-color-outline-variant, #ccc);
        }

        /* 준비 완료 상태 배너 */
        .ready-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .ready-banner.allocated {
          background: #E8F5E9;
          color: #2E7D32;
          border-bottom: 1px solid #A5D6A7;
        }

        .ready-banner.back_order {
          background: #FFF3E0;
          color: #E65100;
          border-bottom: 1px solid #FFCC80;
        }

        .ready-banner.error {
          background: #FFEBEE;
          color: #C62828;
          border-bottom: 1px solid #EF9A9A;
        }

        /* 테이블 영역 */
        .table-wrap {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 8px;
        }

        .data-table thead {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        .data-table th {
          padding: 9px 12px;
          text-align: left;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }

        .data-table th.center,
        .data-table td.center { text-align: center; }

        .data-table th.right,
        .data-table td.right { text-align: right; }

        .data-table tbody tr {
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          transition: background 0.1s;
        }

        .data-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant, #fafafa);
        }

        .data-table tbody tr.allocated {
          background: #F1F8E9;
        }

        .data-table tbody tr.back-order {
          background: #FFF3E0;
        }

        .data-table td {
          padding: 8px 12px;
          color: var(--md-sys-color-on-surface, #424242);
          vertical-align: middle;
        }

        /* 상태 배지 */
        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge.registered { background: #EDE7F6; color: #5E35B1; }
        .status-badge.confirmed  { background: #E3F2FD; color: #1565C0; }
        .status-badge.allocated  { background: #E8F5E9; color: #2E7D32; }
        .status-badge.back_order { background: #FFF3E0; color: #E65100; }

        /* 로딩 / 빈 상태 */
        .loading-row td,
        .empty-row td {
          text-align: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 14px;
        }

        /* 하단 버튼 영역 */
        .action-bar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface, #fff);
          flex-shrink: 0;
        }

        .action-bar .hint {
          flex: 1;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #888);
          line-height: 1.5;
        }

        .btn {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1565C0;
        }

        .btn-picking {
          background: linear-gradient(135deg, #2E7D32, #1B5E20);
          color: #fff;
        }

        .btn-picking:hover:not(:disabled) {
          background: linear-gradient(135deg, #1B5E20, #0a3d0a);
        }

        .btn-default {
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }

        .btn-default:hover:not(:disabled) {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        /* 스피너 */
        .spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 4px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `
    ]
  }

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      parent_id: String,
      orderId: String,
      order: Object,
      orderItems: Array,
      loading: Boolean,
      processing: Boolean,
      statusOptions: Array,
      stationOptions: Array,
      stationCd: String,
      inputWorkers: Number,
      readyStatus: String
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.parent_id = null
    this.orderId = null
    this.order = null
    this.orderItems = []
    this.loading = false
    this.processing = false
    this.statusOptions = []
    this.stationOptions = []
    this.stationCd = ''
    this.inputWorkers = 1
    this.readyStatus = null
  }

  /** 화면 렌더링 */
  render() {
    const order = this.order || {}
    const totalSkuCount = this.orderItems.length
    const totalQty = this.orderItems.reduce((sum, i) => sum + (i.order_qty || 0), 0)

    return html`
      <!-- 주문 정보 요약 -->
      <div class="info-bar">
        <div class="info-item">
          <span class="label">${TermsUtil.tLabel('shipment_no') || '출고번호'}</span>
          <span class="value">${order.shipment_no || '-'}</span>
        </div>
        <span class="info-divider">|</span>
        <div class="info-item">
          <span class="label">${TermsUtil.tLabel('ref_order_no') || '원주문번호'}</span>
          <span class="value">${order.ref_order_no || '-'}</span>
        </div>
        <span class="info-divider">|</span>
        <div class="info-item">
          <span class="label">${TermsUtil.tLabel('cust_nm') || '거래처'}</span>
          <span class="value" style="color:var(--md-sys-color-primary,#1976D2)">${order.cust_nm || order.cust_cd || '-'}</span>
        </div>
        <span class="info-divider">|</span>
        <div class="info-item">
          <span class="label">총 상품 수</span>
          <span class="value" style="color:var(--md-sys-color-primary,#1976D2)">${totalSkuCount}종</span>
        </div>
        <span class="info-divider">|</span>
        <div class="info-item">
          <span class="label">총 주문 수량</span>
          <span class="value" style="color:var(--md-sys-color-primary,#1976D2)">${totalQty}EA</span>
        </div>
        <div class="info-item" style="margin-left:auto;">
          <span class="label">${TermsUtil.tLabel('status') || '상태'}</span>
          <span class="status-badge ${(order.status || '').toLowerCase()}">${this._statusLabel(order.status)}</span>
        </div>
      </div>

      <!-- 작업장 / 작업자 수 선택 -->
      <div class="control-bar">
        <label>🏭 ${TermsUtil.tLabel('station_cd') || '출고 작업장'}<span style="color:var(--md-sys-color-error,#d32f2f)">*</span></label>
        <select .value="${this.stationCd}"
          @change="${e => { this.stationCd = e.target.value }}">
          <option value="">-- 선택 --</option>
          ${this.stationOptions.map(opt => html`
            <option value="${opt.name}" ?selected="${this.stationCd === opt.name}">
              ${opt.description || opt.name}
            </option>
          `)}
        </select>
        <!--span class="control-divider">|</span>
        <label>👷 작업자 수</label>
        <input type="number" min="1"
          .value="${this.inputWorkers}"
          @change="${e => { this.inputWorkers = Math.max(1, parseInt(e.target.value) || 1) }}" />-->
        ${this.processing ? html`
          <span style="margin-left:8px;"><span class="spinner"></span>처리 중...</span>
        ` : ''}
      </div>

      <!-- 출고 준비 결과 배너 -->
      ${this.readyStatus ? html`
        <div class="ready-banner ${this.readyStatus.toLowerCase()}">
          ${this.readyStatus === 'ALLOCATED' ? '✅ 출고 준비 완료 — 피킹 지시 생성이 가능합니다.' : ''}
          ${this.readyStatus === 'BACK_ORDER' ? '⚠ 재고 부족으로 백오더 처리되었습니다.' : ''}
          ${this.readyStatus === 'ERROR' ? '❌ 출고 준비 처리 중 오류가 발생했습니다.' : ''}
        </div>
      ` : ''}
      <!-- 피킹 불가 상태 배너 -->
      ${this.order && !this._isPickableStatus() ? html`
        <div class="ready-banner error">
          ${this._pickableMessage(this.order.status)}
        </div>
      ` : ''}

      <!-- 주문 상세 아이템 목록 -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="center" style="width:40px;">No.</th>
              <th>${TermsUtil.tLabel('sku_cd') || 'SKU 코드'}</th>
              <th>${TermsUtil.tLabel('sku_nm') || '상품명'}</th>
              <th class="right">${TermsUtil.tLabel('order_qty') || '주문 수량'}</th>
              <th class="right">${TermsUtil.tLabel('alloc_qty') || '할당 수량'}</th>
              <th class="right">${TermsUtil.tLabel('short_qty') || '부족 수량'}</th>
              <th class="right">${TermsUtil.tLabel('shipped_qty') || '출고 수량'}</th>
              <th class="center">${TermsUtil.tLabel('status') || '상태'}</th>
            </tr>
          </thead>
          <tbody>
            ${this.loading ? html`
              <tr class="loading-row">
                <td colspan="7"><span class="spinner"></span> 로딩 중...</td>
              </tr>
            ` : this.orderItems.length === 0 ? html`
              <tr class="empty-row">
                <td colspan="7">📭 주문 상세 항목이 없습니다</td>
              </tr>
            ` : this.orderItems.map((item, idx) => this._renderItemRow(item, idx))}
          </tbody>
        </table>
      </div>

      <!-- 하단 버튼 -->
      <div class="action-bar">
        <span class="hint">
          💡 <strong>출고 준비</strong>를 먼저 실행하여 재고 할당 상태를 확인하세요.<br>
          &nbsp;&nbsp;&nbsp;&nbsp;할당 완료 후 <strong>피킹 지시 생성</strong>을 눌러 B2B 피킹 지시를 생성합니다.<br>
          &nbsp;&nbsp;&nbsp;&nbsp;피킹 지시 생성 전 <strong>출고 작업장</strong>을 반드시 선택해주세요.
        </span>
        <button class="btn btn-primary"
          ?disabled="${this.processing || !['REGISTERED', 'CONFIRMED'].includes(this.order?.status)}"
          @click="${this._readyOrder}">
          🚀 출고 준비
        </button>
        <button class="btn btn-picking"
          ?disabled="${this.processing || this.order?.status !== 'ALLOCATED'}"
          @click="${this._startPicking}">
          📦 피킹 지시 생성
        </button>
        <button class="btn btn-default"
          ?disabled="${this.processing}"
          @click="${this._close}">
          닫기
        </button>
      </div>
    `
  }

  /**
   * 주문 상세 아이템 행 렌더링
   * @param {object} item
   * @param {number} idx
   */
  _renderItemRow(item, idx) {
    const isAllocated = item.status === 'ALLOCATED'
    const isBackOrder = item.status === 'BACK_ORDER'
    return html`
      <tr class="${isAllocated ? 'allocated' : isBackOrder ? 'back-order' : ''}">
        <td class="center">${idx + 1}</td>
        <td>${item.sku_cd || '-'}</td>
        <td>${item.sku_nm || '-'}</td>
        <td class="right">${item.order_qty ?? '-'}</td>
        <td class="right">${item.alloc_qty != null ? item.alloc_qty : '-'}</td>
        <td class="right">${item.short_qty != null ? item.short_qty : '-'}</td>
        <td class="right">${item.shipped_qty != null ? item.shipped_qty : '-'}</td>
        <td class="center">
          <span class="status-badge ${(item.status || '').toLowerCase()}">
            ${item.status || '-'}
          </span>
        </td>
      </tr>
    `
  }

  /** 컴포넌트 연결 시 초기 데이터 조회 */
  connectedCallback() {
    super.connectedCallback()
    this._fetchStatusOptions()
    this._fetchStationOptions()
    this._fetchOrderWithItems()
  }

  /**
   * ShipmentOrder 조회 후 상세 아이템 조회
   * parent_id가 있으면 orderId로 사용한다.
   * orderId 프로퍼티 기준으로 조회, order 객체가 이미 있으면 아이템만 조회한다.
   */
  async _fetchOrderWithItems() {
    if (this.parent_id && !this.orderId) {
      this.orderId = this.parent_id
    }
    if (!this.order && this.orderId) {
      await this._fetchOrder()
    }
    await this._fetchOrderItems()
  }

  /** 출고 주문 단건 조회 */
  async _fetchOrder() {
    try {
      this.order = await ServiceUtil.restGet(`shipment_orders/${this.orderId}`)
    } catch (e) {
      console.error('출고 주문 조회 실패:', e)
      UiUtil.showToast('error', '주문 정보 조회에 실패했습니다.')
    }
  }

  /** SHIPMENT_ORDER_STATUS 공통코드 조회 */
  async _fetchStatusOptions() {
    try {
      const codeMaster = await ServiceUtil.codeItems('SHIPMENT_ORDER_STATUS')
      if (!codeMaster || !codeMaster.id) return
      this.statusOptions = codeMaster.items || []
    } catch (e) {
      console.error('SHIPMENT_ORDER_STATUS 공통코드 조회 실패:', e)
    }
  }

  /** PACKING_STATION 공통코드 조회 */
  async _fetchStationOptions() {
    try {
      const codeMaster = await ServiceUtil.codeItems('PACKING_STATION')
      if (!codeMaster || !codeMaster.id) return
      this.stationOptions = codeMaster.items || []
      if (this.stationOptions.length === 1) {
        this.stationCd = this.stationOptions[0].name
      }
    } catch (e) {
      console.error('PACKING_STATION 공통코드 조회 실패:', e)
    }
  }

  /** 주문 상세 아이템 조회 */
  async _fetchOrderItems() {
    const id = this.order?.id || this.orderId
    if (!id) return
    this.loading = true
    try {
      const result = await ServiceUtil.restGet(`shipment_orders/${id}/items`)
      this.orderItems = result?.items || result || []
    } catch (e) {
      console.error('주문 상세 아이템 조회 실패:', e)
      UiUtil.showToast('error', '주문 상세 조회에 실패했습니다.')
      this.orderItems = []
    } finally {
      this.loading = false
    }
  }

  /**
   * 출고 준비 처리 — confirm_and_allocate 호출
   * 완료 후 주문을 재조회하여 최신 상태를 반영한다.
   */
  async _readyOrder() {
    if (!this.order?.id) return
    this.processing = true
    try {
      await new Promise((resolve, reject) => {
        ServiceUtil.restPost(
          `oms_trx/shipment_orders/${this.order.id}/confirm_and_allocate`,
          {},
          null,
          null,
          resolve,
          reject
        )
      })
      // API 응답 구조에 의존하지 않고 주문 재조회로 최신 상태 반영
      await this._fetchOrder()
      const newStatus = this.order?.status
      this.readyStatus = newStatus
      await this._fetchOrderItems()
      UiUtil.showToast('success', `출고 준비 완료: ${this._statusLabel(newStatus)}`)
    } catch (e) {
      console.error('출고 준비 실패:', e)
      this.readyStatus = 'ERROR'
      UiUtil.showToast('error', '출고 준비 처리 중 오류가 발생했습니다.')
    } finally {
      this.processing = false
    }
  }

  /**
   * 피킹 지시 생성 처리 — ful_trx/direct_picking/create 호출
   * 작업장 미선택 시 경고 후 중단.
   */
  async _startPicking() {
    // 1. 피킹 가능 상태 확인 (ALLOCATED만 허용)
    if (this.order?.status !== 'ALLOCATED') {
      UiUtil.showToast('error', `할당 완료(ALLOCATED) 상태에서만 피킹 지시 생성이 가능합니다. 현재 상태: ${this.order?.status}`)
      return
    }

    // 2. 작업장 선택 확인
    if (!this.stationCd) {
      UiUtil.showToast('warning', '출고 작업장을 선택해주세요.')
      return
    }

    // 3. 피킹 지시 생성 확인
    const stationLabel = this.stationOptions.find(o => o.name === this.stationCd)?.description || this.stationCd
    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `작업장 [${stationLabel}]으로 피킹 지시를 생성합니다.\n진행하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    // 4. 피킹 지시 생성 API 호출
    this.processing = true
    try {
      const payload = {
        id: this.order.id,
        station_cd: this.stationCd
      }
      await ServiceUtil.restPost(
        'ful_trx/direct_picking/create',
        payload,
        null,
        null,
        (result) => {
          UiUtil.showToast('success', '피킹 지시가 생성되었습니다.')
          this.dispatchEvent(new CustomEvent('picking-started', {
            bubbles: true,
            composed: true,
            detail: { order: this.order, stationCd: this.stationCd, result }
          }))
          this._close()
        },
        (error) => {
          console.error('피킹 지시 생성 실패:', error)
          UiUtil.showToast('error', '피킹 지시 생성 중 오류가 발생했습니다.')
        }
      )
    } catch (e) {
      console.error('피킹 지시 생성 실패:', e)
      UiUtil.showToast('error', '피킹 지시 생성 중 오류가 발생했습니다.')
    } finally {
      this.processing = false
    }
  }

  /** 주문 상태 한글 라벨 — SHIPMENT_ORDER_STATUS 공통코드 참조 */
  _statusLabel(status) {
    if (!status) return '-'
    const opt = this.statusOptions.find(o => o.name === status)
    return opt ? (opt.description || opt.name) : status
  }

  /** 피킹 가능한 주문 상태인지 확인 — REGISTERED · CONFIRMED · ALLOCATED만 허용 */
  _isPickableStatus() {
    return ['REGISTERED', 'CONFIRMED', 'ALLOCATED'].includes(this.order?.status)
  }

  /** 
   * 피킹 가능한 주문 상태인지 확인 — REGISTERED · CONFIRMED · ALLOCATED만 허용 
   */
  _pickableMessage(status) {
    if (status === 'ALLOCATED') {
      return '할당이 완료되어 피킹 가능한 주문입니다. [피킹지시] 버튼을 눌러 피킹 지시 생성하세요.'
    } else if (status === 'REGISTERED' || status === 'CONFIRMED') {
      return '먼저 [출고준비] 버튼을 눌러 할당을 완료한 후 [피킹지시] 버튼을 눌러 피킹을 시작하세요.'
    } else if (status === 'BACK_ORDER') {
      return '⛔ 재고 부족으로 할당이 되지 않은 주문입니다. 재고를 확보하여 할당을 완료한 후 다시 시도해주세요.'
    } else if (status === 'PICKING' || status === 'PACKING' || status === 'SHIPPED') {
      return '⛔ 이미 피킹 지시가 완료된 주문입니다.'
    } else if (status === 'CLOSED') {
      return '⛔ 이미 마감된 주문입니다.'
    } else if (status === 'CANCELLED') {
      return '⛔ 취소된 주문입니다.'
    } else {
      return '⛔ 알 수 없는 상태의 주문입니다.'
    }
  }

  /** 팝업 닫기 */
  _close() {
    UiUtil.closePopupBy(this)
  }
}

window.customElements.define('shipment-order-ready-popup', ShipmentOrderReadyPopup)
