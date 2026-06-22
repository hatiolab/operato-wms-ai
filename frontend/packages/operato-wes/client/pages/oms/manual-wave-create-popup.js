import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 수동 웨이브 생성 팝업
 *
 * B2C(biz_type=B2C_OUT) 주문 중 wave_no가 없고 REGISTERED/CONFIRMED 상태인 주문을 표시한다.
 * '출고 준비' 버튼으로 주문별로 확정+할당(confirm_and_allocate)을 순차 처리하고
 * 처리 결과를 그리드의 '출고 준비 상태' 컬럼에 실시간 반영한다.
 *
 * @fires wave-ready - 출고 준비 처리 완료 시 발생
 */
class ManualWaveCreatePopup extends localize(i18next)(LitElement) {
  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 400px;
          overflow: hidden;
        }

        /* 작업장 선택 바 */
        .station-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .station-bar label {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
        }

        .station-bar select {
          flex: 0 0 220px;
          padding: 5px 10px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          background: var(--md-sys-color-surface, #fff);
          outline: none;
          cursor: pointer;
        }

        .station-bar select:focus {
          box-shadow: 0 0 0 2px rgba(25,118,210,0.2);
        }

        .station-bar .required-hint {
          font-size: 12px;
          color: var(--md-sys-color-error, #d32f2f);
        }

        /* 상단 요약 */
        .summary-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 20px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #616161);
          flex-shrink: 0;
        }

        .summary-bar .count {
          font-weight: 700;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-bar .ready-count {
          font-weight: 700;
          color: #4CAF50;
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

        .data-table tbody tr.ready {
          background: #F1F8E9;
        }

        .data-table tbody tr.error {
          background: #FFEBEE;
        }

        .data-table tbody tr.processing {
          background: #FFF8E1;
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
        .status-badge.confirmed { background: #E3F2FD; color: #1565C0; }
        .status-badge.allocated { background: #E8F5E9; color: #2E7D32; }
        .status-badge.back_order { background: #FFF3E0; color: #E65100; }
        .status-badge.error { background: #FFEBEE; color: #C62828; }
        .status-badge.processing { background: #FFF9C4; color: #F57F17; }

        /* 체크박스 */
        .data-table input[type='checkbox'] {
          width: 15px;
          height: 15px;
          cursor: pointer;
          accent-color: var(--md-sys-color-primary, #1976D2);
        }

        /* 로딩 */
        .loading-row td {
          text-align: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        /* 빈 상태 */
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

        .btn-default {
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
        }

        .btn-default:hover:not(:disabled) {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }

        /* 진행 중 스피너 */
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
      orders: Array,
      loading: Boolean,
      processing: Boolean,
      currentProcessingId: String,
      statusOptions: Array,
      stationOptions: Array,
      stationCd: String,
      waveNo: String
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.orders = []
    this.loading = false
    this.processing = false
    this.currentProcessingId = null
    this.statusOptions = []
    this.stationOptions = []
    this.stationCd = ''
    this.waveNo = ''
  }

  /** 화면 렌더링 */
  render() {
    const readyCount = this.orders.filter(o => o._readyStatus === 'ALLOCATED').length
    const totalCount = this.orders.length

    return html`
      <!-- 작업장 선택 -->
      <!-- 상단 요약 + 작업장 선택 (한 행) -->
      <div class="summary-bar">
        <span>${TermsUtil.tLabel('wave_no') || '웨이브번호'}: <span class="count">${this.waveNo || '-'}</span></span>
        <span style="color:var(--md-sys-color-outline-variant,#ccc)">|</span>
        <span>조회된 주문: <span class="count">${totalCount}건</span></span>
        <span>출고 준비 완료: <span class="ready-count">${readyCount}건</span></span>
        <!-- 작업장 선택 (준비완료 우측) -->
        <span style="color:var(--md-sys-color-outline-variant,#ccc)">|</span>
        <label style="flex-shrink:0; font-size:12px; font-weight:700; color:var(--md-sys-color-on-surface-variant,#555); white-space:nowrap;">
          🏭 ${TermsUtil.tLabel('station_cd') || '작업장'}<span style="color:var(--md-sys-color-error,#d32f2f)">*</span>
        </label>
        <select style="padding:3px 8px; border:1px solid var(--md-sys-color-primary,#1976D2); border-radius:6px; font-size:12px; font-weight:600; color:var(--md-sys-color-on-surface,#333); background:var(--md-sys-color-surface,#fff); outline:none; cursor:pointer; flex-shrink:0;"
          .value="${this.stationCd}"
          @change="${e => { this.stationCd = e.target.value }}">
          <option value="">-- 선택 --</option>
          ${this.stationOptions.map(opt => html`
            <option value="${opt.name}" ?selected="${this.stationCd === opt.name}">
              ${opt.description || opt.name}
            </option>
          `)}
        </select>
        <!-- 웨이브 최대 500건 안내 (우측) -->
        <span style="margin-left:auto; font-size:12px; color:var(--md-sys-color-on-surface-variant,#888); background:var(--md-sys-color-surface,#fff); border:1px solid var(--md-sys-color-outline-variant,#ddd); border-radius:4px; padding:2px 8px; flex-shrink:0;">
          웨이브 당 최대 500건
        </span>
        ${this.processing ? html`
          <span><span class="spinner"></span>처리 중...</span>
        ` : ''}
      </div>

      <!-- 주문 그리드 -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="center" style="width:36px;"></th>
              <th>${TermsUtil.tLabel('wave_no') || '웨이브번호'}</th>
              <th>${TermsUtil.tLabel('shipment_no') || '출고번호'}</th>
              <th>${TermsUtil.tLabel('ref_order_no') || '원주문번호'}</th>
              <th>${TermsUtil.tLabel('invoice_no') || '송장번호'}</th>
              <th>${TermsUtil.tLabel('com_cd') || '화주사'}</th>
              <th>${TermsUtil.tLabel('cust_cd') || '거래처'}</th>
              <th>${TermsUtil.tLabel('orderer_nm') || '고객명'}</th>
              <th>${TermsUtil.tLabel('order_date') || '주문일'}</th>
              <th class="right">${TermsUtil.tLabel('order_qty') || '주문수량'}</th>
              <th class="center">${TermsUtil.tLabel('status') || '상태'}</th>
              <th class="center">${TermsUtil.tLabel('ready_status') || '출고 준비 상태'}</th>
            </tr>
          </thead>
          <tbody>
            ${this.loading ? html`
              <tr class="loading-row">
                <td colspan="10"><span class="spinner"></span> 로딩 중...</td>
              </tr>
            ` : this.orders.length === 0 ? html`
              <tr class="empty-row">
                <td colspan="10">📭 출고 준비 대상 B2C 주문이 없습니다</td>
              </tr>
            ` : this.orders.map(order => this._renderRow(order))}
          </tbody>
        </table>
      </div>

      <!-- 하단 버튼 -->
      <div class="action-bar">
        <span style="flex:1; font-size:12px; color:var(--md-sys-color-on-surface-variant,#888); line-height:1.4;">
          💡 <strong>출고 준비</strong> 버튼을 눌러 먼저 출고 준비를 한 후, 주문이 할당 완료 상태인지 확인한 후<br>
          &nbsp;&nbsp;&nbsp;&nbsp;<strong>웨이브 생성</strong> 버튼을 눌러 웨이브 생성 처리하세요.<br>
          &nbsp;&nbsp;&nbsp;&nbsp;웨이브 생성 전 <strong>작업장 선택</strong>을 해주세요.
        </span>
        <button class="btn btn-primary"
          ?disabled="${this.processing || this.orders.length === 0}"
          @click="${this._startReadyProcess}">
          🚀 출고 준비
        </button>
        <button class="btn btn-primary"
          style="background: linear-gradient(135deg, #7B1FA2, #4A148C);"
          ?disabled="${this.processing || this.orders.length === 0}"
          @click="${this._confirmWave}">
          🌊 웨이브 생성
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
    const isReady = order._readyStatus === 'ALLOCATED'
    const isError = order._readyStatus === 'ERROR' || order._readyStatus === 'BACK_ORDER'
    const isProcessing = order.id === this.currentProcessingId

    return html`
      <tr class="${isReady ? 'ready' : isError ? 'error' : isProcessing ? 'processing' : ''}">
        <td class="center">
          ${isReady ? html`<input type="checkbox" checked disabled />` : ''}
        </td>
        <td>${order.wave_no || '-'}</td>
        <td>${order.shipment_no || '-'}</td>
        <td>${order.ref_order_no || '-'}</td>
        <td>${order.invoice_no || '-'}</td>
        <td>${order.com_cd || '-'}</td>
        <td>${order.cust_cd || '-'}</td>
        <td>${order.cust_nm || '-'}</td>
        <td>${order.order_date || '-'}</td>
        <td class="right">${order.total_order}</td>
        <td class="center">
          <span class="status-badge ${(order.status || '').toLowerCase()}">
            ${this._statusLabel(order.status)}
          </span>
        </td>
        <td class="center">
          ${isProcessing ? html`
            <span class="status-badge processing"><span class="spinner"></span>처리중</span>
          ` : order._readyStatus ? html`
            <span class="status-badge ${order._readyStatus.toLowerCase()}">${this._readyStatusLabel(order._readyStatus)}</span>
          ` : html`
            <span style="color:#bbb">-</span>
          `}
        </td>
      </tr>
    `
  }

  /** 컴포넌트 연결 시 데이터 조회 */
  connectedCallback() {
    super.connectedCallback()
    Promise.all([this._fetchStatusOptions(), this._fetchStationOptions(), this._fetchOrders()])
  }

  /** PACKING_STATION 공통코드 조회 */
  async _fetchStationOptions() {
    try {
      const codeMaster = await ServiceUtil.codeItems('PACKING_STATION')
      if (!codeMaster || !codeMaster.id) return
      this.stationOptions = codeMaster.items || []
      // 옵션이 하나이면 자동 선택
      if (this.stationOptions.length === 1) {
        this.stationCd = this.stationOptions[0].name
      }
    } catch (e) {
      console.error('PACKING_STATION 공통코드 조회 실패:', e)
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

  /**
   * B2C 출고 준비 대상 주문 조회
   * biz_type=B2C_OUT, wave_no 없음, 상태: REGISTERED / CONFIRMED
   */
  async _fetchOrders() {
    this.loading = true
    try {
      const filters = [
        { name: 'biz_type', value: 'B2C_OUT' },
        { name: 'wave_no', operator: 'is_blank' },
        { name: 'status', operator: 'in', value: 'REGISTERED,CONFIRMED,ALLOCATED' }
      ]
      const query = encodeURIComponent(JSON.stringify(filters))
      const sort = encodeURIComponent(JSON.stringify([{ name: 'created_at' }]))
      const result = await ServiceUtil.restGet(
        `shipment_orders?query=${query}&sort=${sort}&limit=500`
      )
      this.orders = (result?.items || result || []).map(o => ({ ...o, _readyStatus: null }))
    } catch (e) {
      console.error('출고 준비 대상 주문 조회 실패:', e)
      UiUtil.showToast('error', '주문 조회에 실패했습니다.')
      this.orders = []
    } finally {
      this.loading = false
    }
  }

  /**
   * 출고 준비 처리 시작 — 미처리 주문을 순차적으로 confirm_and_allocate 처리
   */
  async _startReadyProcess() {
    // 1. 처리 대상 주문이 있는지 체크
    if (this.orders.length === 0) {
      UiUtil.showToast('error', '웨이브 생성할 대상 주문이 없습니다.')
      return
    }

    // 2. 프로그레스 바 진행
    this.processing = true

    // 3. 주문별 확정 + 할당 순차 처리
    for (const order of this.orders) {
      this.currentProcessingId = order.id
      this.requestUpdate()

      await ServiceUtil.restPost(`oms_trx/shipment_orders/${order.id}/confirm_and_allocate`, {}, null, null,
        (result) => {
          const newStatus = result?.status
          const invoiceNo = result?.invoice_no
          this.orders = this.orders.map(o =>
            o.id === order.id
              ? { ...o, status: newStatus, _readyStatus: newStatus, invoice_no: invoiceNo }
              : o
          )
        },
        (error) => {
          console.error(`출고 준비 실패 (${order.shipment_no}):`, error)
          this.orders = this.orders.map(o =>
            o.id === order.id ? { ...o, _readyStatus: 'ERROR' } : o
          )
        }
      )
    }

    // 4. 프로그레스 바 중단
    this.processing = false
    this.currentProcessingId = null

    const doneCount = this.orders.filter(o => o._readyStatus === 'ALLOCATED').length
    UiUtil.showToast('success', `출고 준비 완료: ${doneCount}/${this.orders.length}건`)
  }

  /**
   * 웨이브 생성 처리
   * ALLOCATED 상태 주문을 config_wave로 웨이브에 구성한다.
   */
  async _confirmWave() {
    // 1. 작업장 체크
    if (!this.stationCd) {
      UiUtil.showToast('warning', '작업장을 선택해주세요. 웨이브 생성을 진행할 수 없습니다.')
      return
    }

    // 2. 할당 주문 필터링
    const allocatedOrders = this.orders.filter(o => o.status === 'ALLOCATED')

    // 3. 할당 주문 개수 체크
    if (allocatedOrders.length === 0) {
      UiUtil.showToast('warning', '할당 상태의 주문이 없어서 웨이브 구성을 할 수 없습니다.')
      return
    }

    // 4. 웨이브 생성 confirm
    const stationLabel = this.stationOptions.find(o => o.name === this.stationCd)?.description || this.stationCd
    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `작업장 [${stationLabel}] 에서 웨이브 생성합니다.\n구성 주문: ${allocatedOrders.length}개. 진행하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    // 5. 프로그레스 바 진행
    this.processing = true

    // 6. 웨이브 생성 — 전체 대상 주문 ID + 작업장 전달
    try {
      const payload = { stationCd: this.stationCd, orders: allocatedOrders };
      await ServiceUtil.restPost('oms_trx/waves/config_wave', payload, null, null,
        (result) => {
          this.waveNo = result?.wave?.wave_no || ''
          const allocatedIds = new Set(allocatedOrders.map(o => o.id))
          this.orders = this.orders.map(o =>
            allocatedIds.has(o.id) ? { ...o, wave_no: this.waveNo } : o
          )

          UiUtil.showToast('success', `웨이브 생성 완료! 웨이브번호: ${this.waveNo} (${result?.order_count || allocatedOrders.length}건)`)
        },
        (error) => {
          console.error('웨이브 생성 실패:', error)
          UiUtil.showToast('error', '웨이브 생성 처리 중 오류가 발생했습니다.')
        }
      )

      if (this.waveNo) {
        this.dispatchEvent(new CustomEvent('wave-ready', {
          bubbles: true,
          composed: true,
          detail: { wave_no: this.waveNo, order_count: allocatedOrders.length }
        }))
      }
    } catch (e) {
      console.error('웨이브 생성 실패:', e)
      UiUtil.showToast('error', '웨이브 생성 처리 중 오류가 발생했습니다.')
    } finally {
      this.processing = false
    }
  }

  /** 팝업 닫기 */
  _close() {
    UiUtil.closePopupBy(this)
  }

  /** 주문 상태 한글 라벨 — SHIPMENT_ORDER_STATUS 공통코드 참조 */
  _statusLabel(status) {
    if (!status) return '-'
    const opt = this.statusOptions.find(o => o.name === status)
    return opt ? (opt.description || opt.name) : status
  }

  /** 출고 준비 상태 한글 라벨 */
  _readyStatusLabel(status) {
    const map = {
      ALLOCATED: '✅ 준비완료',
      BACK_ORDER: '⚠ 백오더',
      ERROR: '❌ 오류'
    }
    return map[status] || status
  }
}

window.customElements.define('manual-wave-create-popup', ManualWaveCreatePopup)
