import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 출고주문 송장 라벨 일괄 출력 팝업
 *
 * 최근 출고주문을 최대 200건까지 조회하고 Zebra 네트워크 프린터로 일괄 출력한다.
 * 선택한 라벨의 ZPL은 백엔드에서 한 번의 TCP 연결로 연속 전송하며, 화면은
 * Zebra Host Status 기반의 작업 상태를 짧은 간격으로 조회해 출력시간과 진행률을 갱신한다.
 */
class ShipmentLabelPrintPopup extends localize(i18next)(LitElement) {
  /** 팝업 화면 스타일을 반환한다. */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 540px;
          overflow: hidden;
          color: var(--md-sys-color-on-surface, #263238);
          background: var(--md-sys-color-surface, #fff);
        }

        .summary {
          flex-shrink: 0;
          padding: 14px 20px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface-container-low, #fafafa);
        }

        .description {
          margin-bottom: 10px;
          color: var(--md-sys-color-on-surface-variant, #607d8b);
          font-size: 13px;
        }

        .printer-line {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 30px;
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #dfe4e7);
          border-radius: 8px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 13px;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #9e9e9e;
          box-shadow: 0 0 0 3px rgba(158, 158, 158, 0.12);
        }

        .status-dot.ready {
          background: #2e7d32;
          box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.12);
        }

        .status-dot.error {
          background: #c62828;
          box-shadow: 0 0 0 3px rgba(198, 40, 40, 0.12);
        }

        .printer-name {
          font-weight: 700;
        }

        .printer-detail {
          color: var(--md-sys-color-on-surface-variant, #607d8b);
        }

        .printer-state {
          margin-left: auto;
          font-weight: 700;
          color: #616161;
        }

        .printer-state.ready {
          color: #2e7d32;
        }

        .printer-state.error {
          color: #c62828;
        }

        .progress-section {
          flex-shrink: 0;
          padding: 12px 20px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .progress-head {
          display: flex;
          align-items: center;
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 700;
        }

        .progress-value {
          margin-left: auto;
          color: var(--md-sys-color-primary, #1565c0);
          font-variant-numeric: tabular-nums;
        }

        .progress-track {
          height: 12px;
          overflow: hidden;
          border-radius: 6px;
          background: var(--md-sys-color-surface-variant, #e8edf0);
        }

        .progress-fill {
          height: 100%;
          border-radius: 6px;
          background: linear-gradient(90deg, #1976d2, #42a5f5);
          transition: width 0.2s ease;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(120px, 1fr));
          gap: 8px;
          margin-top: 11px;
        }

        .metric {
          padding: 9px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #e2e7ea);
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
        }

        .metric-label {
          display: block;
          margin-bottom: 4px;
          color: var(--md-sys-color-on-surface-variant, #78909c);
          font-size: 11px;
        }

        .metric-value {
          display: block;
          font-size: 18px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .metric-value.success {
          color: #2e7d32;
        }

        .metric-value.failure {
          color: #c62828;
        }

        .current-line {
          min-height: 18px;
          margin-top: 8px;
          color: var(--md-sys-color-on-surface-variant, #546e7a);
          font-size: 12px;
        }

        .current-line strong {
          color: var(--md-sys-color-primary, #1565c0);
        }

        .table-wrap {
          flex: 1;
          overflow: auto;
          padding: 0 20px;
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
          background: var(--md-sys-color-surface-container, #f5f7f8);
        }

        th {
          padding: 9px 10px;
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #dfe4e7);
          color: var(--md-sys-color-on-surface-variant, #546e7a);
          text-align: left;
          white-space: nowrap;
        }

        td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #edf0f2);
          white-space: nowrap;
        }

        th.center,
        td.center {
          text-align: center;
        }

        tbody tr.printing {
          background: #e3f2fd;
        }

        tbody tr.completed {
          background: #f1f8e9;
        }

        tbody tr.failed {
          background: #ffebee;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 58px;
          padding: 3px 8px;
          border-radius: 10px;
          background: #eceff1;
          color: #546e7a;
          font-size: 11px;
          font-weight: 700;
        }

        .badge.printing {
          background: #bbdefb;
          color: #0d47a1;
        }

        .badge.completed {
          background: #c8e6c9;
          color: #1b5e20;
        }

        .badge.failed {
          background: #ffcdd2;
          color: #b71c1c;
        }

        .empty {
          padding: 46px 10px;
          color: var(--md-sys-color-on-surface-variant, #90a4ae);
          text-align: center;
        }

        .action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 9px;
          flex-shrink: 0;
          padding: 11px 20px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface, #fff);
        }

        .quantity-control {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--md-sys-color-on-surface-variant, #546e7a);
          font-size: 13px;
          font-weight: 700;
        }

        .quantity-control input {
          width: 86px;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #b0bec5);
          border-radius: 7px;
          color: var(--md-sys-color-on-surface, #263238);
          background: var(--md-sys-color-surface, #fff);
          font-size: 14px;
          font-weight: 700;
          text-align: right;
        }

        .quantity-control input:disabled {
          opacity: 0.55;
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        button {
          min-width: 92px;
          padding: 9px 18px;
          border: 0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .primary {
          color: #fff;
          background: var(--md-sys-color-primary, #1565c0);
        }

        .secondary {
          border: 1px solid var(--md-sys-color-outline-variant, #cfd8dc);
          color: var(--md-sys-color-on-surface, #37474f);
          background: var(--md-sys-color-surface, #fff);
        }

        @media (max-width: 900px) {
          .metric-grid {
            grid-template-columns: repeat(2, minmax(120px, 1fr));
          }
        }
      `
    ]
  }

  /** 반응형 속성 정의를 반환한다. */
  static get properties() {
    return {
      orders: Array,
      printer: Object,
      loading: Boolean,
      printing: Boolean,
      completedCount: Number,
      failedCount: Number,
      currentIndex: Number,
      currentDurationMs: Number,
      totalElapsedMs: Number,
      averageDurationMs: Number,
      printQuantity: Number,
      printTargetCount: Number,
      _tick: Number
    }
  }

  /** 팝업의 초기 상태를 설정한다. */
  constructor() {
    super()
    this.orders = []
    this.printer = null
    this.loading = false
    this.printing = false
    this.completedCount = 0
    this.failedCount = 0
    this.currentIndex = -1
    this.currentDurationMs = 0
    this.totalElapsedMs = 0
    this.averageDurationMs = 0
    this.printQuantity = 200
    this.printTargetCount = 0
    this._tick = 0
    this._startedAt = null
    this._currentStartedAt = null
    this._timer = null
    this._durationTotalMs = 0
    this._batchJobId = null
    this._polling = false
  }

  /** 팝업 연결 시 주문 목록과 프린터 상태를 조회한다. */
  connectedCallback() {
    super.connectedCallback()
    this._load()
  }

  /** 팝업 해제 시 진행 타이머를 정리한다. */
  disconnectedCallback() {
    super.disconnectedCallback()
    this._polling = false
    this._stopTimer()
  }

  /** 팝업 본문을 렌더링한다. */
  render() {
    return html`
      ${this._renderSummary()}
      ${this._renderProgress()}
      ${this._renderTable()}
      ${this._renderActions()}
    `
  }

  /** 프린터 연결 요약을 렌더링한다. */
  _renderSummary() {
    const ready = Boolean(this.printer?.ready)
    return html`
      <section class="summary">
        <div class="description">${TermsUtil.tText('label_print_description')}</div>
        <div class="printer-line">
          <span class="status-dot ${ready ? 'ready' : 'error'}"></span>
          <span class="printer-name">${this.printer?.printer_name || '-'}</span>
          <span class="printer-detail">
            ${this.printer
              ? `${this.printer.printer_ip}:${this.printer.printer_port} · ${this.printer.printer_driver || '-'} · ${this.printer.dpi || '-'} DPI`
              : '-'}
          </span>
          <span class="printer-state ${ready ? 'ready' : 'error'}">
            ${ready ? TermsUtil.tText('printer_ready') : TermsUtil.tText('printer_unavailable')}
          </span>
        </div>
      </section>
    `
  }

  /** 진행률과 출력시간 지표를 렌더링한다. */
  _renderProgress() {
    const processed = this.completedCount + this.failedCount
    const total = this.printTargetCount || this._effectivePrintCount()
    const percent = total > 0 ? Math.round(processed / total * 100) : 0
    const current = this.currentIndex >= 0 ? this.orders[this.currentIndex] : null

    return html`
      <section class="progress-section">
        <div class="progress-head">
          <span>${TermsUtil.tText('print_progress')}</span>
          <span class="progress-value">${processed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <span class="metric-label">${TermsUtil.tLabel('total')}</span>
            <span class="metric-value">${total.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">${TermsUtil.tText('printed_count')}</span>
            <span class="metric-value success">${this.completedCount.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">${TermsUtil.tText('failed_count')}</span>
            <span class="metric-value failure">${this.failedCount.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">${TermsUtil.tText('current_label_time')}</span>
            <span class="metric-value">${this._formatSeconds(this.currentDurationMs)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">${TermsUtil.tText('average_label_time')}</span>
            <span class="metric-value">${this._formatSeconds(this.averageDurationMs)}</span>
          </div>
        </div>

        <div class="current-line">
          <span>${TermsUtil.tText('total_print_time')}: <strong>${this._formatElapsed(this.totalElapsedMs)}</strong></span>
          ${this.printing && current ? html`
            <span>
              · ${TermsUtil.tText('printing_now')}:
              <strong>${current.shipment_no || current.id}</strong>
            </span>
          ` : ''}
        </div>
      </section>
    `
  }

  /** 출고주문 목록을 렌더링한다. */
  _renderTable() {
    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>${TermsUtil.tLabel('shipment_no')}</th>
              <th>${TermsUtil.tLabel('ref_order_no')}</th>
              <th>${TermsUtil.tLabel('invoice_no')}</th>
              <th>${TermsUtil.tLabel('receiver_nm')}</th>
              <th>${TermsUtil.tLabel('order_date')}</th>
              <th class="center">${TermsUtil.tLabel('status')}</th>
              <th class="center">${TermsUtil.tText('current_label_time')}</th>
              <th class="center">${TermsUtil.tLabel('result')}</th>
            </tr>
          </thead>
          <tbody>
            ${this.loading ? html`
              <tr><td class="empty" colspan="9">${TermsUtil.tText('loading')}</td></tr>
            ` : this.orders.length === 0 ? html`
              <tr><td class="empty" colspan="9">${TermsUtil.tText('No Data')}</td></tr>
            ` : this.orders
              .slice(0, this._effectivePrintCount())
              .map((order, index) => this._renderOrderRow(order, index))}
          </tbody>
        </table>
      </div>
    `
  }

  /** 출고주문 한 행을 렌더링한다. */
  _renderOrderRow(order, index) {
    const printStatus = order._printStatus || 'WAITING'
    return html`
      <tr class="${printStatus.toLowerCase()}">
        <td class="center">${index + 1}</td>
        <td>${order.shipment_no || '-'}</td>
        <td>${order.ref_order_no || '-'}</td>
        <td>${order.invoice_no || '-'}</td>
        <td>${order.receiver_nm || '-'}</td>
        <td>${order.order_date || '-'}</td>
        <td class="center">${order.status || '-'}</td>
        <td class="center">${order._durationMs ? this._formatSeconds(order._durationMs) : '-'}</td>
        <td class="center">
          <span class="badge ${printStatus.toLowerCase()}">${this._printStatusText(printStatus)}</span>
        </td>
      </tr>
    `
  }

  /** 하단 출력 및 닫기 버튼을 렌더링한다. */
  _renderActions() {
    return html`
      <div class="action-bar">
        <label class="quantity-control">
          <span>${TermsUtil.tLabel('print_count')}</span>
          <input
            type="number"
            min="1"
            max="200"
            .value="${String(this.printQuantity)}"
            ?disabled="${this.loading || this.printing || this.orders.length === 0}"
            @change="${this._onPrintQuantityChange}">
        </label>
        <div class="action-buttons">
          <button class="secondary" ?disabled="${this.printing}" @click="${this._close}">
            ${TermsUtil.tButton('close')}
          </button>
          <button
            class="primary"
            ?disabled="${this.loading || this.printing || !this.printer?.ready || this.orders.length === 0}"
            @click="${this._startPrint}">
            ${this.printing ? TermsUtil.tText('printing_now') : TermsUtil.tButton('print')}
          </button>
        </div>
      </div>
    `
  }

  /** 주문과 프린터 정보를 병렬로 조회한다. */
  async _load() {
    this.loading = true
    try {
      const [ordersResult, printerResult] = await Promise.all([
        ServiceUtil.restGet('shipment_label_print/orders?limit=200'),
        ServiceUtil.restGet('shipment_label_print/printer')
      ])
      const items = ordersResult?.items || ordersResult || []
      this.orders = items.map(order => ({
        ...order,
        _printStatus: 'WAITING',
        _durationMs: 0,
        _error: null
      }))
      this.printQuantity = Math.min(200, this.orders.length)
      this.printTargetCount = 0
      this.printer = printerResult
    } catch (error) {
      console.error('송장 라벨 출력 정보 조회 실패:', error)
      this.orders = []
      this.printer = null
      UiUtil.showToast('error', TermsUtil.tText('label_print_load_failed'))
    } finally {
      this.loading = false
    }
  }

  /** 표시된 출고주문의 고속 배치 출력 작업을 시작한다. */
  async _startPrint() {
    const printCount = this._effectivePrintCount()
    const targetOrders = this.orders.slice(0, printCount)
    const confirmed = await UiUtil.showAlertPopup(
      'title.confirm',
      `${TermsUtil.tText('label_print_confirm')} (${targetOrders.length.toLocaleString()})`,
      'question',
      'confirm',
      'cancel'
    )
    if (!confirmed) {
      return
    }

    this._resetProgress()
    this.printTargetCount = targetOrders.length
    this.printing = true
    this._startedAt = performance.now()
    this._batchJobId = null
    this._polling = true
    this._startTimer()

    try {
      const startResult = await ServiceUtil.restPost(
        'shipment_label_print/batches',
        {
          shipment_order_ids: targetOrders.map(order => order.id)
        }
      )
      const initialStatus = startResult?.item || startResult
      this._batchJobId = initialStatus?.job_id
      if (!this._batchJobId) {
        throw new Error(TermsUtil.tText('print_failed'))
      }
      const finalStatus = await this._pollBatchUntilFinished(initialStatus)
      if (finalStatus?.status === 'FAILED') {
        UiUtil.showToast('error', finalStatus.error_message || TermsUtil.tText('print_failed'))
      } else if (finalStatus?.status === 'COMPLETED') {
        UiUtil.showToast('success', TermsUtil.tText('label_print_finished'))
      }
    } catch (error) {
      console.error('송장 라벨 배치 출력 실패:', error)
      UiUtil.showToast('error', error?.message || TermsUtil.tText('print_failed'))
    } finally {
      this._polling = false
      this.printing = false
      this.currentIndex = -1
      this._currentStartedAt = null
      this._stopTimer()
      this._tick++
    }
  }

  /** 출력 작업이 끝날 때까지 백엔드 상태를 짧은 간격으로 조회한다. */
  async _pollBatchUntilFinished(initialStatus) {
    let status = initialStatus
    let consecutiveErrors = 0

    while (this._polling) {
      this._applyBatchStatus(status)
      if (status?.status === 'COMPLETED' || status?.status === 'FAILED') {
        return status
      }

      await this._wait(100)
      try {
        const result = await ServiceUtil.restGet(`shipment_label_print/batches/${this._batchJobId}`)
        status = result?.item || result
        consecutiveErrors = 0
      } catch (error) {
        consecutiveErrors++
        if (consecutiveErrors >= 5) {
          throw error
        }
        await this._wait(300)
      }
    }
    return status
  }

  /** 백엔드 배치 작업 상태를 화면 지표와 주문 행에 반영한다. */
  _applyBatchStatus(status) {
    if (!status) {
      return
    }

    const previousCompletedCount = this.completedCount
    const totalCount = Math.max(0, Number(status.total_count) || this.printTargetCount)
    const completedCount = Math.min(totalCount, Math.max(0, Number(status.completed_count) || 0))
    const failedCount = Math.min(
      Math.max(0, totalCount - completedCount),
      Math.max(0, Number(status.failed_count) || 0)
    )
    const durationMs = Math.max(
      0,
      Number(status.last_label_elapsed_ms) || Number(status.average_label_elapsed_ms) || 0
    )

    this.printTargetCount = totalCount
    this.completedCount = completedCount
    this.failedCount = failedCount
    this.currentIndex = Number.isInteger(Number(status.current_index))
      ? Number(status.current_index)
      : -1
    this.currentDurationMs = durationMs
    this.averageDurationMs = Math.max(0, Number(status.average_label_elapsed_ms) || 0)
    this.totalElapsedMs = Math.max(0, Number(status.total_elapsed_ms) || 0)

    for (let index = previousCompletedCount; index < completedCount; index++) {
      const order = this.orders[index]
      if (order) {
        order._printStatus = 'COMPLETED'
        order._durationMs = durationMs
      }
    }

    if (status.status === 'PRINTING' && this.currentIndex >= 0) {
      const currentOrder = this.orders[this.currentIndex]
      if (currentOrder) {
        currentOrder._printStatus = 'PRINTING'
      }
    }

    if (status.status === 'FAILED') {
      for (let index = completedCount; index < totalCount; index++) {
        const order = this.orders[index]
        if (order) {
          order._printStatus = 'FAILED'
          order._error = status.error_message
        }
      }
    }

    this._tick++
    this._scrollToCurrent()
  }

  /** 출력 진행 상태를 초기화한다. */
  _resetProgress() {
    this.completedCount = 0
    this.failedCount = 0
    this.currentIndex = -1
    this.currentDurationMs = 0
    this.totalElapsedMs = 0
    this.averageDurationMs = 0
    this._durationTotalMs = 0
    this._batchJobId = null
    this.orders.forEach(order => {
      order._printStatus = 'WAITING'
      order._durationMs = 0
      order._error = null
    })
  }

  /** 입력한 출력 수량을 1~200 범위와 조회된 주문 수에 맞게 보정한다. */
  _onPrintQuantityChange(event) {
    const requested = Number(event.target.value)
    const maximum = Math.min(200, this.orders.length)
    this.printQuantity = maximum > 0
      ? Math.max(1, Math.min(Number.isFinite(requested) ? Math.floor(requested) : 1, maximum))
      : 0
    event.target.value = String(this.printQuantity)
    this.printTargetCount = 0
    this._resetProgress()
  }

  /** 현재 입력값을 기준으로 실제 출력할 주문 수를 반환한다. */
  _effectivePrintCount() {
    if (this.orders.length === 0) {
      return 0
    }
    const requested = Number(this.printQuantity)
    const normalized = Number.isFinite(requested) ? Math.floor(requested) : 1
    return Math.max(1, Math.min(normalized, 200, this.orders.length))
  }

  /** 100ms 간격으로 화면의 전체 경과시간을 갱신한다. */
  _startTimer() {
    this._stopTimer()
    this._timer = setInterval(() => {
      const now = performance.now()
      if (this._startedAt != null) {
        this.totalElapsedMs = Math.round(now - this._startedAt)
      }
      this._tick++
    }, 100)
  }

  /** 출력시간 갱신 타이머를 정리한다. */
  _stopTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  /** 지정한 시간 동안 다음 상태 조회를 대기한다. */
  _wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  /** 현재 출력 중인 행을 보이는 영역으로 이동한다. */
  _scrollToCurrent() {
    this.updateComplete.then(() => {
      const row = this.shadowRoot?.querySelector('tr.printing')
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  /** 출력 상태 코드를 다국어 표시 문자열로 변환한다. */
  _printStatusText(status) {
    const names = {
      WAITING: 'print_waiting',
      PRINTING: 'printing_now',
      COMPLETED: 'print_completed',
      FAILED: 'print_failed'
    }
    return TermsUtil.tText(names[status] || 'print_waiting')
  }

  /** 밀리초를 초 단위 문자열로 변환한다. */
  _formatSeconds(milliseconds) {
    return `${(Number(milliseconds || 0) / 1000).toFixed(2)}s`
  }

  /** 밀리초를 HH:MM:SS.s 형식으로 변환한다. */
  _formatElapsed(milliseconds) {
    const totalTenths = Math.floor(Number(milliseconds || 0) / 100)
    const hours = Math.floor(totalTenths / 36000)
    const minutes = Math.floor((totalTenths % 36000) / 600)
    const seconds = Math.floor((totalTenths % 600) / 10)
    const tenths = totalTenths % 10
    const pad = value => String(value).padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${tenths}`
  }

  /** 현재 팝업을 닫는다. */
  _close() {
    UiUtil.closePopupBy(this)
  }
}

customElements.define('shipment-label-print-popup', ShipmentLabelPrintPopup)
