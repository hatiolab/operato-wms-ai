import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 집하 예약 팝업
 *
 * 웨이브에 속한 출하 주문 리스트를 표시하고, 체크박스로 선택한 주문에 대해
 * 택배 집하 예약(book_courier) 또는 예약 취소(cancel_book_courier) 처리를 수행한다.
 *
 * 사용 예시:
 *   UiUtil.openPopup({ tagname: 'courier-booking-popup', waveId: 'xxx', waveNo: 'W001' })
 *
 * @fires booking-done - 집하 예약 처리 완료 시 발생 (detail: { bookedCount })
 */
class CourierBookingPopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 */
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

        /* 상단 웨이브 정보 바 */
        .summary-bar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          padding: 10px 20px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 13px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          flex-shrink: 0;
        }

        .summary-bar .label {
          font-weight: 600;
          opacity: 0.75;
        }

        .summary-bar .value {
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-bar .value.booked {
          color: #2E7D32;
        }

        .summary-bar .divider {
          color: var(--md-sys-color-outline-variant, #ccc);
        }

        .summary-bar .spinner-wrap {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--md-sys-color-on-primary-container, #1565c0);
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
          padding: 9px 10px;
          text-align: left;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #616161);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }

        .data-table th.center,
        .data-table td.center { text-align: center; }

        .data-table tbody tr {
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          transition: background 0.1s;
        }

        .data-table tbody tr:hover {
          background: var(--md-sys-color-surface-variant, #fafafa);
        }

        .data-table tbody tr.booked {
          background: #F1F8E9;
        }

        .data-table tbody tr.cancelled {
          background: #FFF3E0;
        }

        .data-table tbody tr.error {
          background: #FFEBEE;
        }

        .data-table tbody tr.processing {
          background: #FFF8E1;
        }

        .data-table td {
          padding: 7px 10px;
          color: var(--md-sys-color-on-surface, #424242);
          vertical-align: middle;
        }

        /* 상태 배지 */
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        /* 주문 상태 */
        .badge.registered    { background: #EDE7F6; color: #5E35B1; }
        .badge.confirmed     { background: #E3F2FD; color: #1565C0; }
        .badge.allocated     { background: #E8F5E9; color: #2E7D32; }
        .badge.packing       { background: #E0F2F1; color: #00695C; }
        .badge.shipped       { background: #E3F2FD; color: #0D47A1; }
        .badge.back_order    { background: #FFF3E0; color: #E65100; }

        /* IF 상태 */
        .badge.booked            { background: #E8F5E9; color: #1B5E20; }
        .badge.booking_cancelled { background: #FFF3E0; color: #BF360C; }
        .badge.if-none           { background: #ECEFF1; color: #607D8B; }

        /* 처리 결과 */
        .badge.result-ok     { background: #E8F5E9; color: #1B5E20; }
        .badge.result-skip   { background: #F5F5F5; color: #9E9E9E; }
        .badge.result-error  { background: #FFEBEE; color: #C62828; }
        .badge.result-proc   { background: #FFF9C4; color: #F57F17; }

        /* 체크박스 */
        .data-table input[type='checkbox'] {
          width: 15px;
          height: 15px;
          cursor: pointer;
          accent-color: var(--md-sys-color-primary, #1976D2);
        }

        .data-table input[type='checkbox']:disabled {
          cursor: default;
          opacity: 0.45;
        }

        /* 전체선택 헤더 체크박스 */
        th.check-th {
          width: 36px;
        }

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

        .btn-success {
          background: #2E7D32;
          color: #fff;
        }

        .btn-success:hover:not(:disabled) {
          background: #1B5E20;
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

  /** 반응형 속성 */
  static get properties() {
    return {
      parent_id: String, // waveId 별칭 (외부에서 parent_id로 전달 시 자동 매핑)
      waveId: String,
      waveNo: String,
      waveInfo: Object,
      orders: Array,
      loading: Boolean,
      processing: Boolean,
      currentProcessingId: String,
      statusOptions: Array,
      ifStatusOptions: Array
    }
  }

  /** 초기값 */
  constructor() {
    super()
    this.parent_id = null
    this.waveId = ''
    this.waveNo = ''
    this.waveInfo = null
    this.orders = []
    this.loading = false
    this.processing = false
    this.currentProcessingId = null
    this.statusOptions = []
    this.ifStatusOptions = []
  }

  /** 화면 렌더링 */
  render() {
    const total = this.orders.length
    const booked = this.orders.filter(o => o.if_status === 'BOOKED').length
    const checked = this.orders.filter(o => o._checked).length
    const allChecked = total > 0 && this.orders.filter(o => !this._isAlreadyBooked(o)).length > 0
      && this.orders.filter(o => !this._isAlreadyBooked(o)).every(o => o._checked)

    return html`
      <!-- 상단: 웨이브 정보 + 집계 -->
      <div class="summary-bar">
        <span class="label">${TermsUtil.tLabel('wave_no') || '웨이브번호'}</span>
        <span class="value">${this.waveNo || this.waveInfo?.wave_no || '-'}</span>
        <span class="label">${TermsUtil.tLabel('wave_date') || '웨이브 일자'}</span>
        <span class="value">${this.waveInfo?.wave_date || '-'} / ${this.waveInfo?.wave_seq != null ? this.waveInfo.wave_seq + '차' : '-'}</span>
        <span class="divider">|</span>
        <span class="label">총 주문</span>
        <span class="value">${total}건</span>
        <span class="divider">|</span>
        <span class="label">집하 예약 완료</span>
        <span class="value booked">${booked}건</span>
        <span class="divider">|</span>
        <span class="label">선택</span>
        <span class="value">${checked}건</span>
        ${this.processing ? html`
          <span class="spinner-wrap">
            <span class="spinner"></span>처리 중...
          </span>
        ` : ''}
      </div>

      <!-- 중단: 주문 리스트 -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="center check-th">
                <input type="checkbox"
                  .checked="${allChecked}"
                  @change="${this._onToggleAll}" />
              </th>
              <th>${TermsUtil.tLabel('shipment_no') || '출고번호'}</th>
              <th>${TermsUtil.tLabel('ref_order_no') || '원주문번호'}</th>
              <th>${TermsUtil.tLabel('invoice_no') || '송장번호'}</th>
              <th>${TermsUtil.tLabel('com_cd') || '화주사'}</th>
              <th>${TermsUtil.tLabel('cust_cd') || '거래처'}</th>
              <th>${TermsUtil.tLabel('orderer_nm') || '고객명'}</th>
              <th>${TermsUtil.tLabel('order_date') || '주문일'}</th>
              <th class="right">${TermsUtil.tLabel('order_qty') || '주문수량'}</th>
              <th class="center">${TermsUtil.tLabel('status') || '출고상태'}</th>
              <th class="center">${TermsUtil.tButton('pickup') || '집하상태'}</th>
              <th class="center">처리결과</th>
            </tr>
          </thead>
          <tbody>
            ${this.loading ? html`
              <tr class="loading-row">
                <td colspan="9"><span class="spinner"></span> 조회 중...</td>
              </tr>
            ` : this.orders.length === 0 ? html`
              <tr class="empty-row">
                <td colspan="9">📭 웨이브에 포함된 주문이 없습니다</td>
              </tr>
            ` : this.orders.map(o => this._renderRow(o))}
          </tbody>
        </table>
      </div>

      <!-- 하단: 버튼 -->
      <div class="action-bar">
        <span class="hint">
          💡 집하 예약할 주문을 선택한 후 <strong>집하 예약</strong> 버튼을 누르세요.<br>
          &nbsp;&nbsp;&nbsp;&nbsp;이미 예약된 주문(🟢)은 선택에서 제외됩니다.
        </span>
        <button class="btn btn-success"
          ?disabled="${this.processing || this.orders.filter(o => o._checked).length === 0}"
          @click="${this._bookSelected}">
          🚚 집하 예약
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
   * 주문 행 렌더링
   * @param {object} order
   */
  _renderRow(order) {
    const isBooked = this._isAlreadyBooked(order)
    const isProcessing = order.id === this.currentProcessingId
    const rowClass = isProcessing ? 'processing'
      : order._result === 'OK' ? 'booked'
        : order._result === 'ERROR' ? 'error'
          : isBooked ? 'booked'
            : order.if_status === 'BOOKING_CANCELLED' ? 'cancelled'
              : ''

    return html`
      <tr class="${rowClass}">
        <td class="center">
          <input type="checkbox"
            .checked="${!!order._checked}"
            ?disabled="${isBooked || isProcessing || this.processing}"
            @change="${e => this._onToggleRow(order.id, e.target.checked)}" />
        </td>
        <td>${order.shipment_no || '-'}</td>
        <td>${order.ref_order_no || '-'}</td>
        <td>${order.invoice_no || '-'}</td>
        <td>${order.com_cd || '-'}</td>
        <td>${order.cust_cd || '-'}</td>
        <td>${order.cust_nm || '-'}</td>
        <td>${order.order_date || '-'}</td>
        <td class="right">${order.total_order ?? 0}</td>
        <td class="center">
          <span class="badge ${(order.status || '').toLowerCase()}">
            ${this._statusLabel(order.status)}
          </span>
        </td>
        <td class="center">
          ${this._renderIfStatusBadge(order.if_status)}
        </td>
        <td class="center">
          ${isProcessing ? html`
            <span class="badge result-proc"><span class="spinner"></span>처리중</span>
          ` : order._result === 'OK' ? html`
            <span class="badge result-ok">✅ 예약완료</span>
          ` : order._result === 'SKIP' ? html`
            <span class="badge result-skip">— 이미예약됨</span>
          ` : order._result === 'ERROR' ? html`
            <span class="badge result-error" title="${order._resultMsg || ''}">❌ 실패</span>
          ` : html`
            <span style="color:#bbb">-</span>
          `}
        </td>
      </tr>
    `
  }

  /** 컴포넌트 마운트 시 공통코드 조회 */
  connectedCallback() {
    super.connectedCallback()
    Promise.all([
      this._fetchStatusOptions(),
      this._fetchIfStatusOptions()
    ])
  }

  /**
   * 프로퍼티 변경 감지
   * connectedCallback 대신 여기서 처리하는 이유: openDynamicPopup 방식으로 열릴 때
   * parent_id가 DOM 연결 이후 세팅되는 경우 connectedCallback 시점에는 아직 null임
   */
  updated(changedProperties) {
    super.updated(changedProperties)

    // parent_id → waveId 매핑
    if (changedProperties.has('parent_id') && this.parent_id && !this.waveId) {
      this.waveId = this.parent_id
    }

    // waveId가 새로 설정되거나 변경되면 주문 조회
    if (changedProperties.has('waveId') && this.waveId) {
      this._fetchOrders()
    }
  }

  /** SHIPMENT_ORDER_STATUS 공통코드 조회 */
  async _fetchStatusOptions() {
    try {
      const code = await ServiceUtil.codeItems('SHIPMENT_ORDER_STATUS')
      this.statusOptions = code?.items || []
    } catch (e) {
      console.error('SHIPMENT_ORDER_STATUS 공통코드 조회 실패:', e)
    }
  }

  /** SHIPMENT_IF_STATUS 공통코드 조회 */
  async _fetchIfStatusOptions() {
    try {
      const code = await ServiceUtil.codeItems('SHIPMENT_IF_STATUS')
      this.ifStatusOptions = code?.items || []
    } catch (e) {
      console.error('SHIPMENT_IF_STATUS 공통코드 조회 실패:', e)
    }
  }

  /**
   * 웨이브별 출하 주문 조회
   * API: GET /rest/oms_trx/waves/{waveId}/orders
   */
  async _fetchOrders() {
    if (!this.waveId) return
    this.loading = true
    try {
      this.waveInfo = await ServiceUtil.restGet(`shipment_waves/${this.waveId}`)
      const data = await ServiceUtil.restGet(`oms_trx/waves/${this.waveId}/orders`)
      this.orders = (data || []).map(o => ({
        ...o,
        _checked: o.if_status !== 'BOOKED',
        _result: null,
        _resultMsg: null
      }))
    } catch (e) {
      console.error('웨이브 주문 조회 실패:', e)
      UiUtil.showToast('error', '주문 조회에 실패했습니다.')
      this.orders = []
    } finally {
      this.loading = false
    }
  }

  /**
   * 선택된 주문에 대해 집하 예약 처리
   * API: POST /rest/oms_trx/shipment_orders/{id}/book_courier
   */
  async _bookSelected() {
    const targets = this.orders.filter(o => o._checked && !this._isAlreadyBooked(o))
    if (targets.length === 0) {
      UiUtil.showToast('warning', '집하 예약할 주문을 선택해주세요.')
      return
    }

    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `선택한 ${targets.length}건에 대해 집하 예약을 진행하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    this.processing = true
    let successCount = 0
    let failCount = 0

    for (const order of targets) {
      this.currentProcessingId = order.id
      this.requestUpdate()

      await ServiceUtil.restPost(
        `oms_trx/shipment_orders/${order.id}/book_courier`,
        {},
        null, null,
        (result) => {
          successCount++
          this.orders = this.orders.map(o =>
            o.id === order.id
              ? { ...o, if_status: 'BOOKED', invoice_no: result?.invc_no || o.invoice_no, _result: 'OK', _checked: false }
              : o
          )
        },
        (error) => {
          failCount++
          const msg = error?.message || error?.msg || '오류 발생'
          this.orders = this.orders.map(o =>
            o.id === order.id ? { ...o, _result: 'ERROR', _resultMsg: msg } : o
          )
        }
      )
    }

    this.processing = false
    this.currentProcessingId = null

    if (failCount === 0) {
      UiUtil.showToast('success', `집하 예약 완료: ${successCount}건`)
    } else {
      UiUtil.showToast('warning', `집하 예약: 성공 ${successCount}건 / 실패 ${failCount}건`)
    }

    if (successCount > 0) {
      this.dispatchEvent(new CustomEvent('booking-done', {
        bubbles: true,
        composed: true,
        detail: { bookedCount: successCount }
      }))
    }
  }

  /** 전체 선택/해제 */
  _onToggleAll(e) {
    const checked = e.target.checked
    this.orders = this.orders.map(o =>
      this._isAlreadyBooked(o) ? o : { ...o, _checked: checked }
    )
  }

  /** 행 개별 선택 */
  _onToggleRow(id, checked) {
    this.orders = this.orders.map(o => o.id === id ? { ...o, _checked: checked } : o)
  }

  /** 팝업 닫기 */
  _close() {
    UiUtil.closePopupBy(this)
  }

  /**
   * 이미 집하 예약된 주문 여부
   * @param {object} order
   */
  _isAlreadyBooked(order) {
    return order.if_status === 'BOOKED'
  }

  /**
   * 주문 상태 라벨 — SHIPMENT_ORDER_STATUS 공통코드 참조
   * @param {string} status
   */
  _statusLabel(status) {
    if (!status) return '-'
    const opt = this.statusOptions.find(o => o.name === status)
    return opt ? (opt.description || opt.name) : status
  }

  /**
   * IF 상태 배지 렌더링
   * @param {string} ifStatus
   */
  _renderIfStatusBadge(ifStatus) {
    if (!ifStatus) {
      return html`<span class="badge if-none">미예약</span>`
    }
    const opt = this.ifStatusOptions.find(o => o.name === ifStatus)
    const label = opt ? (opt.description || opt.name) : ifStatus
    const cls = ifStatus === 'BOOKED' ? 'booked'
      : ifStatus === 'BOOKING_CANCELLED' ? 'booking_cancelled'
        : 'if-none'
    const icon = ifStatus === 'BOOKED' ? '🟢 '
      : ifStatus === 'BOOKING_CANCELLED' ? '🟠 '
        : ''
    return html`<span class="badge ${cls}">${icon}${label}</span>`
  }
}

window.customElements.define('courier-booking-popup', CourierBookingPopup)
