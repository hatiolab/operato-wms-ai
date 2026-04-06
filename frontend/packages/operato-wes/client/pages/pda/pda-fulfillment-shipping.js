import '@things-factory/barcode-ui'
import { html, css } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { ServiceUtil, ValueUtil, TermsUtil, UiUtil } from '@operato-app/metapage/dist-client'
import { store, PageView } from '@operato/shell'
import { CommonGristStyles, CommonHeaderStyles } from '@operato/styles'

/**
 * PDA 출하 확정 화면
 *
 * 도크 코드를 선택하고 송장번호를 바코드 스캔하여 출하 확정(SHIPPED)하는 PDA 화면.
 * 공통코드 DOCK_CODE에서 도크 목록을 조회하고, 선택한 도크의 출하 대기 건 목록을 표시한다.
 * 송장 스캔 시 건별 즉시 출하 확정, 전체확정 버튼으로 일괄 처리도 가능하다.
 */
@customElement('pda-fulfillment-shipping')
export class PdaFulfillmentShipping extends connect(store)(PageView) {
  @state() dockCd = ''
  @state() dockList = []
  @state() waitingList = []
  @state() scannedList = []
  @state() currentTabKey = 'scanned'
  @state() loading = false
  @state() processing = false

  @query('#oxScanBarcode') _oxInputBarCode

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

        /* 액션 버튼 행 */
        .action-buttons {
          display: flex;
          align-items: center;
          padding: 4px 12px;
          gap: 8px;
        }

        .action-buttons .spacer {
          flex: 1;
        }

        .action-buttons button {
          padding: 4px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .action-buttons button:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .action-buttons button.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-on-primary, #fff);
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .action-buttons button:disabled {
          opacity: 0.4;
        }

        /* 도크 선택 */
        .dock-section {
          padding: 8px 12px;
          background: var(--md-sys-color-surface-container-low, #f5f5f5);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .dock-section label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-bottom: 4px;
          display: block;
        }

        .dock-section ox-select {
          width: 100%;
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
        }

        .summary-card .count {
          font-size: 22px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-card .sub-count {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
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

        /* 스캔 섹션 */
        .scan-section {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-radius: 8px;
          margin: 4px 12px;
        }

        .scan-section label {
          font-size: 13px;
          font-weight: bold;
          color: var(--md-sys-color-on-primary-container, #1565c0);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .scan-section ox-input-barcode {
          flex: 1;
          min-width: 0;
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

        /* 스캔 결과 카드 */
        .scan-result-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .scan-result-card:last-child {
          border-bottom: none;
        }

        .scan-result-card .icon-check {
          color: #4CAF50;
          font-size: 20px;
          flex-shrink: 0;
        }

        .scan-result-card .info {
          flex: 1;
          min-width: 0;
        }

        .scan-result-card .invoice {
          font-weight: bold;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .scan-result-card .detail {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
        }

        .scan-result-card .time {
          color: var(--md-sys-color-on-surface-variant, #999);
          font-size: 12px;
          flex-shrink: 0;
        }

        /* 대기 목록 카드 */
        .waiting-card {
          padding: 10px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .waiting-card:last-child {
          border-bottom: none;
        }

        .waiting-card .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .waiting-card .pack-no {
          font-weight: bold;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
        }

        .waiting-card .box-count {
          font-size: 12px;
          color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
        }

        .waiting-card .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .waiting-card .invoices {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #999);
          margin-top: 4px;
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
      title: TermsUtil.tMenu('FulfillmentShippingWork')
    }
  }

  /** 화면 렌더링 — 도크 선택, 액션 버튼, 현황, 스캔, 탭 영역 */
  render() {
    return html`
      ${this._renderSummary()}
      ${this._renderActionButtons()}
      ${this._renderScanSection()}
      ${this._renderTabs()}
      ${this._renderTabContent()}
    `
  }

  /** 액션 버튼 렌더링, 도크 선택 셀렉트박스 렌더링 — 초기화/전체확정 버튼 인라인 배치 */
  _renderActionButtons() {
    return html`
      <div class="action-buttons">
        <ox-select id="oxDockSelect" .value=${this.dockCd}
          @change=${e => this._onDockChange(e.target.value)}>
          <ox-popup-list>
            <div option value="">${TermsUtil.tLabel('dock_cd')} ${TermsUtil.tButton('select')}</div>
            ${this.dockList?.map(d => html`
              <div option value=${d.dock_cd}>
                ${d.dock_nm || d.dock_cd} (${d.waiting_count}건)
              </div>
            `)}
          </ox-popup-list>
        </ox-select>

        <span class="spacer"></span>
        <button @click=${this._refresh}>${TermsUtil.tButton('refresh') || '새로고침'}</button>
        <button @click=${this._reset}>${TermsUtil.tButton('reset') || '초기화'}</button>
        <button class="primary" ?disabled=${!this.dockCd || !this.waitingList.length}
          @click=${this._confirmAll}>${TermsUtil.tButton('confirm_all') || '전체 확정'}</button>
      </div>
    `
  }

  /** 현황 요약 카드 렌더링 — 대기/출하완료/총 건수 표시 */
  _renderSummary() {
    // const waitingCount = this.waitingList.length
    // const scannedCount = this.scannedList.length
    // const totalCount = waitingCount + scannedCount
    const waitingBoxCount = this.waitingList.reduce((sum, w) => sum + (w.boxes?.length || 0), 0)
    const scannedBoxCount = this.scannedList.length

    return html`
      <div class="summary-cards">
        <div class="summary-card waiting">
          <div class="count">${waitingBoxCount}</div>
          <div class="card-label">대기</div>
        </div>
        <div class="summary-card done">
          <div class="count">${scannedBoxCount}</div>
          <div class="card-label">출하 완료</div>
        </div>
        <div class="summary-card">
          <div class="count">${waitingBoxCount + scannedBoxCount}</div>
          <div class="card-label">총</div>
        </div>
      </div>
    `
  }

  /** 바코드 스캔 입력 섹션 렌더링 */
  _renderScanSection() {
    return html`
      <div class="scan-section">
        <label>${TermsUtil.tLabel('invoice_no') || '송장 스캔'}</label>
        <ox-input-barcode id="oxScanBarcode"
          placeholder="송장번호 스캔"
          ?disabled=${!this.dockCd || this.processing}
          @change=${e => this._onScanInvoice(e.target.value)}>
        </ox-input-barcode>
      </div>
    `
  }

  /** 탭 바 렌더링 — 스캔결과/대기목록 탭 전환 */
  _renderTabs() {
    return html`
      <div class="tabs">
        <div class="tab" ?activate=${'scanned' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'scanned')}>
          <span>스캔결과</span>
          <span class="badge">${this.scannedList.length}</span>
        </div>
        <div class="tab" ?activate=${'waiting' === this.currentTabKey}
          @click=${() => (this.currentTabKey = 'waiting')}>
          <span>대기목록</span>
          <span class="badge">${this.waitingList.length}</span>
        </div>
      </div>
    `
  }

  /** 탭 콘텐츠 렌더링 — 현재 탭에 따라 스캔/대기 목록 표시 */
  _renderTabContent() {
    if (this.loading) {
      return html`<div class="tab-content"><div class="loading-overlay">로딩 중...</div></div>`
    }

    return html`
      <div class="tab-content">
        ${'scanned' === this.currentTabKey ? this._renderScannedTab() : this._renderWaitingTab()}
      </div>
    `
  }

  /** 스캔 결과 탭 렌더링 — 출하 확정된 송장 목록 표시 */
  _renderScannedTab() {
    if (!this.scannedList.length) {
      return html`<div class="empty-message">스캔된 송장이 없습니다</div>`
    }

    return html`
      ${this.scannedList.map(s => html`
        <div class="scan-result-card">
          <span class="icon-check">✅</span>
          <div class="info">
            <div class="invoice">${s.invoice_no}</div>
            <div class="detail">${s.carrier_cd || ''} | ${s.pack_order_no} | ${s.shipment_no || ''}</div>
          </div>
          <span class="time">${this._formatTime(s.scanned_at)}</span>
        </div>
      `)}
    `
  }

  /** 대기 목록 탭 렌더링 — 출하 대기 중인 포장 주문 카드 목록 */
  _renderWaitingTab() {
    if (!this.dockCd) {
      return html`<div class="empty-message">도크를 먼저 선택해주세요</div>`
    }

    if (!this.waitingList.length) {
      return html`<div class="empty-message">출하 대기 건이 없습니다</div>`
    }

    return html`
      ${this.waitingList.map(w => html`
        <div class="waiting-card">
          <div class="header">
            <span class="pack-no">${w.pack_order_no}</span>
            <span class="box-count">${w.boxes?.length || w.total_box || 0}박스</span>
          </div>
          <div class="sub-info">
            ${w.shipment_no || ''} | ${w.carrier_cd || ''} | ${w.status}
          </div>
          ${w.boxes?.length ? html`
            <div class="invoices">
              📦 ${w.boxes.map(b => b.invoice_no).filter(Boolean).join(' / ') || '송장번호 없음'}
            </div>
          ` : ''}
        </div>
      `)}
    `
  }

  /** 페이지 초기화 — 도크 목록 조회 */
  pageInitialized() {
    this._loadDockList()
  }

  /** 도크 목록 조회 API 호출 */
  async _loadDockList() {
    try {
      this.dockList = await ServiceUtil.restGet('ful_trx/shipping/dock_list', {})
    } catch (error) {
      console.error('도크 목록 조회 실패:', error)
      this.dockList = []
    }
  }

  /** 선택한 도크의 출하 대기 목록 조회 */
  async _loadWaitingList() {
    if (!this.dockCd) {
      this.waitingList = []
      return
    }

    this.loading = true
    try {
      const data = await ServiceUtil.restGet('ful_trx/shipping/waiting_list', { dock_cd: this.dockCd })
      this.waitingList = data?.items || []
    } catch (error) {
      console.error('출하 대기 목록 조회 실패:', error)
      this.waitingList = []
    } finally {
      this.loading = false
    }
  }

  /** 도크 변경 이벤트 — 미배정 포장 지시에 도크 배정 후 대기 목록 재조회 */
  async _onDockChange(dockCd) {
    this.dockCd = dockCd
    this.scannedList = []
    if (dockCd) {
      await this._assignDock(dockCd)
      await this._loadWaitingList()
      this._focusBarcodeInput()
    } else {
      this.waitingList = []
    }
  }

  /** 미배정 포장 지시에 선택한 도크를 일괄 배정 */
  async _assignDock(dockCd) {
    try {
      const result = await ServiceUtil.restPost('ful_trx/shipping/assign_dock', { dock_cd: dockCd })
      if (result?.assigned_count > 0) {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'info', message: `${result.assigned_count}건의 포장 지시에 도크(${dockCd})를 배정했습니다` }
        }))
        await this._loadDockList()
      }
    } catch (error) {
      console.error('도크 배정 실패:', error)
    }
  }

  /** 송장번호 스캔 처리 — 중복 확인 후 출하 확정 API 호출 및 목록 갱신 */
  async _onScanInvoice(invoiceNo) {
    if (!invoiceNo || this.processing) return
    this.processing = true

    try {
      // 1. 중복 체크 (클라이언트 측)
      if (this.scannedList.some(s => s.invoice_no === invoiceNo)) {
        document.dispatchEvent(new CustomEvent('notify', {
          detail: { level: 'warn', message: `이미 출하 확정된 송장입니다: ${invoiceNo}` }
        }))
        return
      }

      // 2. 출하 확정 API 호출
      const result = await ServiceUtil.restPost('ful_trx/shipping/confirm_by_invoice', {
        dock_cd: this.dockCd,
        invoice_no: invoiceNo
      })

      // 3. 스캔 완료 목록에 추가 (최신이 위)
      this.scannedList = [{
        invoice_no: invoiceNo,
        pack_order_no: result.pack_order_no,
        shipment_no: result.shipment_no,
        carrier_cd: result.carrier_cd,
        scanned_at: new Date()
      }, ...this.scannedList]

      // 4. 대기 목록에서 제거 (전체 박스 스캔 완료 시)
      if (result.all_boxes_scanned) {
        this.waitingList = this.waitingList.filter(w => w.pack_order_no !== result.pack_order_no)
      } else {
        // 부분 스캔: 해당 주문의 박스 목록에서 스캔된 박스 제거
        this.waitingList = this.waitingList.map(w => {
          if (w.pack_order_no === result.pack_order_no && w.boxes) {
            return {
              ...w,
              boxes: w.boxes.filter(b => b.invoice_no !== invoiceNo)
            }
          }
          return w
        })
      }

      // 5. 성공 피드백
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'info', message: `✓ ${invoiceNo} 출하 확정` }
      }))

      // 스캔결과 탭으로 전환
      this.currentTabKey = 'scanned'

    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '출하 확정 실패' }
      }))
      navigator.vibrate?.(200)
    } finally {
      this.processing = false
      this._resetBarcodeInput()
    }
  }

  /** 전체 출하 확정 — 대기 목록 전체를 일괄 출하 처리 */
  async _confirmAll() {
    const ids = this.waitingList.map(w => w.id)
    if (!ids.length) return

    const confirmed = await UiUtil.showAlertPopup(
      'label.confirm',
      `${this.dockCd}의 대기 중인 ${ids.length}건을 모두 출하 확정하시겠습니까?`,
      'question', 'confirm', 'cancel'
    )
    if (!confirmed) return

    this.processing = true
    try {
      const result = await ServiceUtil.restPost('ful_trx/packing_orders/confirm_shipping_batch', { ids })

      document.dispatchEvent(new CustomEvent('notify', {
        detail: {
          level: 'info',
          message: `출하 확정: ${result.success_count}건 성공, ${result.fail_count}건 실패`
        }
      }))

      // 도크 목록 및 대기 목록 재조회
      await this._loadDockList()
      await this._loadWaitingList()
      this.scannedList = []
    } catch (error) {
      document.dispatchEvent(new CustomEvent('notify', {
        detail: { level: 'error', message: error.message || '일괄 출하 확정 실패' }
      }))
    } finally {
      this.processing = false
    }
  }

  /** 새로고침 — 도크 목록 및 대기 목록 재조회 */
  async _refresh() {
    await this._loadDockList()
    if (this.dockCd) {
      await this._loadWaitingList()
    }
  }

  /** 화면 초기화 — 도크/대기/스캔 목록 리셋 후 도크 목록 재조회 */
  async _reset() {
    this.dockCd = ''
    this.waitingList = []
    this.scannedList = []
    this.currentTabKey = 'scanned'
    await this._loadDockList()
  }

  /** 바코드 입력 필드에 포커스 설정 (딜레이 적용) */
  _focusBarcodeInput() {
    setTimeout(() => {
      this._resetBarcodeInput()
    }, 200)
  }

  /** 바코드 입력 필드 초기화 및 포커스 복귀 */
  _resetBarcodeInput() {
    if (this._oxInputBarCode) {
      this._oxInputBarCode.input.value = ''
      this._oxInputBarCode.input.focus()
    }
  }

  /** 시간 값을 HH:mm 포맷으로 변환 */
  _formatTime(dateValue) {
    if (!dateValue) return ''
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
}
