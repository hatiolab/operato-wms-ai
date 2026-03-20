import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil, ValueUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxPrompt } from '@operato/popup/ox-prompt.js'
import '@material/web/tabs/tabs.js'
import '@material/web/tabs/primary-tab.js'

/**
 * VAS 작업 지시 상세 팝업
 *
 * 기능:
 * - 작업 지시 기본 정보 조회
 * - 소요 자재 목록 (vas_order_items)
 * - 실적 내역 (vas_results)
 * - 이력 조회
 * - 승인/취소/작업 시작 액션
 */
class VasOrderDetail extends localize(i18next)(LitElement) {
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
          padding: var(--spacing-large, 24px);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-medium, 16px);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-medium, 16px);
        }

        .header-title h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }

        .status-badge {
          padding: 6px 16px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 500;
          color: white;
        }

        .status-badge.PLAN { background-color: #9E9E9E; }
        .status-badge.APPROVED { background-color: #2196F3; }
        .status-badge.MATERIAL_READY { background-color: #4CAF50; }
        .status-badge.IN_PROGRESS { background-color: #FF9800; }
        .status-badge.COMPLETED { background-color: #9C27B0; }
        .status-badge.CLOSED { background-color: #424242; }
        .status-badge.CANCELLED { background-color: #F44336; }

        .header-actions {
          display: flex;
          gap: var(--spacing-small, 8px);
        }

        .header-actions .action-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .header-actions .action-btn.primary {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .header-actions .action-btn.primary:hover {
          background: #1565C0;
          box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3);
        }

        .header-actions .action-btn.danger {
          background: var(--md-sys-color-surface, #fff);
          color: #C62828;
          border: 1px solid #EF9A9A;
        }

        .header-actions .action-btn.danger:hover {
          background: #FFEBEE;
        }

        .header-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-medium, 16px);
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item.full-width {
          grid-column: 1 / -1;
        }

        .info-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .info-value {
          font-size: 16px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface);
        }

        /* 탭 영역 */
        .detail-tabs {
          background: var(--md-sys-color-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        /* 탭 컨텐츠 */
        .tab-content {
          flex: 1;
          overflow: auto;
          padding: var(--spacing-large, 24px);
        }

        .tab-panel {
          display: none;
        }

        .tab-panel.active {
          display: block;
        }

        /* 테이블 스타일 */
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

        th, td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        th {
          font-weight: 600;
          font-size: 14px;
          color: var(--md-sys-color-on-surface);
        }

        td {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        tbody tr:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        /* 2열 레이아웃 */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-large, 24px);
        }

        .info-grid table {
          margin: 0;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: var(--spacing-xxlarge, 48px);
          color: var(--md-sys-color-on-surface-variant);
        }

        .empty-state mwc-icon {
          font-size: 64px;
          opacity: 0.3;
          margin-bottom: var(--spacing-medium, 16px);
        }

        /* 로딩 상태 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: var(--spacing-xxlarge, 48px);
        }
      `
    ]
  }

  static get properties() {
    return {
      vasOrderId: String,
      vasOrder: Object,
      vasBom: Object,
      items: Array,
      results: Array,
      activeTab: Number
    }
  }

  constructor() {
    super()
    this.vasOrderId = null
    this.vasOrder = null
    this.vasBom = null
    this.items = []
    this.results = []
    this.activeTab = 0
  }

  /**
   * 컴포넌트가 DOM에 연결될 때 데이터 조회
   */
  connectedCallback() {
    super.connectedCallback()
    if (this.vasOrderId) {
      this.fetchVasOrder()
    }
  }

  /**
   * VAS 주문 조회
   */
  async fetchVasOrder() {
    try {
      this.vasOrder = await ServiceUtil.restGet(`vas_orders/${this.vasOrderId}`)

      if (this.vasOrder) {
        // BOM, 소요 자재 및 실적 조회
        await Promise.all([
          this.fetchVasBom(),
          this.fetchOrderItems(),
          this.fetchResults()
        ])
      } else {
        UiUtil.showToast('error', TermsUtil.tText('fetch_failed'))
      }
    } catch (error) {
      console.error('Failed to fetch VAS order:', error)
      UiUtil.showToast('error', TermsUtil.tText('error_occurred'))
    }
  }

  /**
   * VAS BOM 조회
   */
  async fetchVasBom() {
    if (!this.vasOrder?.vas_bom_id) {
      this.vasBom = null
      return
    }

    try {
      this.vasBom = await ServiceUtil.restGet(`vas_boms/${this.vasOrder.vas_bom_id}`)
    } catch (error) {
      console.error('Failed to fetch VAS BOM:', error)
      this.vasBom = null
    }
  }

  /**
   * 소요 자재 조회
   */
  async fetchOrderItems() {
    try {
      this.items = await ServiceUtil.restGet(`vas_orders/${this.vasOrderId}/items`) || []
    } catch (error) {
      console.error('Failed to fetch order items:', error)
      this.items = []
    }
  }

  /**
   * 실적 조회
   */
  async fetchResults() {
    try {
      this.results = await ServiceUtil.restGet(`vas_orders/${this.vasOrderId}/results`) || []
    } catch (error) {
      console.error('Failed to fetch results:', error)
      this.results = []
    }
  }

  /**
   * 작업 지시 승인
   */
  async approveOrder() {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      TermsUtil.tText('confirm_approve'),
      'question',
      'confirm',
      'cancel'
    )

    if (!result.confirmButton) return

    try {
      const data = await ServiceUtil.restPost(`vas_trx/vas_orders/${this.vasOrderId}/approve`, {
        approvedBy: 'CURRENT_USER' // TODO: 실제 사용자 ID로 대체
      })

      if (data) {
        UiUtil.showToast('success', TermsUtil.tText('approved'))
        this.fetchVasOrder()
        this.dispatchEvent(new CustomEvent('order-updated', {
          composed: true,
          bubbles: true,
          detail: { vasOrderId: this.vasOrderId }
        }))
      }
    } catch (error) {
      console.error('Failed to approve order:', error)
      UiUtil.showToast('error', TermsUtil.tText('error_occurred'))
    }
  }

  /**
   * 작업 지시 취소
   */
  async cancelOrder() {
    const result = await OxPrompt.open({
      title: TermsUtil.tText('cancel_reason'),
      text: TermsUtil.tText('enter_cancel_reason'),
      type: 'prompt',
      confirmButton: { text: TermsUtil.tButton('confirm') },
      cancelButton: { text: TermsUtil.tButton('cancel') }
    })

    if (!result.confirmButton || !result.text) return

    try {
      const data = await ServiceUtil.restPost(`vas_trx/vas_orders/${this.vasOrderId}/cancel`, {
        cancelReason: result.text
      })

      if (data) {
        UiUtil.showToast('success', TermsUtil.tText('cancelled'))
        this.fetchVasOrder()
        this.dispatchEvent(new CustomEvent('order-updated', {
          composed: true,
          bubbles: true,
          detail: { vasOrderId: this.vasOrderId }
        }))
      }
    } catch (error) {
      console.error('Failed to cancel order:', error)
      UiUtil.showToast('error', TermsUtil.tText('error_occurred'))
    }
  }

  /**
   * 작업 시작
   */
  async startWork() {
    const result = await UiUtil.showAlertPopup(
      'title.confirm',
      TermsUtil.tText('confirm_start_work'),
      'question',
      'confirm',
      'cancel'
    )

    if (!result.confirmButton) return

    try {
      const data = await ServiceUtil.restPost(`vas_trx/vas_orders/${this.vasOrderId}/start`, {})

      if (data) {
        UiUtil.showToast('success', TermsUtil.tText('work_started'))
        this.fetchVasOrder()
        this.dispatchEvent(new CustomEvent('order-updated', {
          composed: true,
          bubbles: true,
          detail: { vasOrderId: this.vasOrderId }
        }))
      }
    } catch (error) {
      console.error('Failed to start work:', error)
      UiUtil.showToast('error', TermsUtil.tText('error_occurred'))
    }
  }

  /**
   * 탭 전환
   */
  switchTab(index) {
    this.activeTab = index
  }

  /**
   * 팝업 닫기
   */
  /**
   * 상태 라벨 반환
   */
  getStatusLabel(status) {
    const labels = {
      'PLAN': TermsUtil.tLabel('draft'),
      'APPROVED': TermsUtil.tLabel('approved'),
      'MATERIAL_READY': TermsUtil.tLabel('material_ready'),
      'IN_PROGRESS': TermsUtil.tLabel('in_progress'),
      'COMPLETED': TermsUtil.tLabel('completed'),
      'CLOSED': TermsUtil.tLabel('closed'),
      'CANCELLED': TermsUtil.tLabel('cancelled')
    }
    return labels[status] || status
  }

  /**
   * 액션 버튼 표시 여부
   */
  canApprove() {
    return this.vasOrder?.status === 'PLAN'
  }

  canCancel() {
    return this.vasOrder?.status && !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(this.vasOrder.status)
  }

  canStartWork() {
    return this.vasOrder?.status === 'MATERIAL_READY'
  }

  render() {
    if (!this.vasOrder) {
      return html`
        <div class="loading">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `
    }

    return html`
      <!-- 헤더 -->
      <div class="detail-header">
        <div class="header-top">
          <div class="header-title">
            <h2>${this.vasOrder.vas_no || '-'}</h2>
            <span class="status-badge ${this.vasOrder.status}">
              ${this.getStatusLabel(this.vasOrder.status)}
            </span>
          </div>

          <div class="header-actions">
            ${this.canApprove() ? html`
              <button class="action-btn primary" @click="${this.approveOrder}">
                ${TermsUtil.tButton('approve')}
              </button>
            ` : ''}

            ${this.canStartWork() ? html`
              <button class="action-btn primary" @click="${this.startWork}">
                ${TermsUtil.tButton('start_work')}
              </button>
            ` : ''}

            ${this.canCancel() ? html`
              <button class="action-btn danger" @click="${this.cancelOrder}">
                ${TermsUtil.tButton('cancel')}
              </button>
            ` : ''}
          </div>
        </div>

        <div class="header-info">
          <div class="info-item">
            <span class="info-label">${TermsUtil.tLabel('company')}</span>
            <span class="info-value">${this.vasOrder.com_cd || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${TermsUtil.tMenu('Warehouse')}</span>
            <span class="info-value">${this.vasOrder.wh_cd || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${TermsUtil.tLabel('vas_type')}</span>
            <span class="info-value">${this.vasOrder.vas_type || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${TermsUtil.tLabel('set_sku_cd')}</span>
            <span class="info-value">${this.vasBom?.set_sku_cd || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${TermsUtil.tLabel('set_sku_nm')}</span>
            <span class="info-value">${this.vasBom?.set_sku_nm || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${TermsUtil.tLabel('plan_qty')}</span>
            <span class="info-value">${this.vasOrder.plan_qty || 0} EA</span>
          </div>
          <div class="info-item">
            <span class="info-label">${TermsUtil.tLabel('work_date')}</span>
            <span class="info-value">${this.vasOrder.vas_req_date || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${TermsUtil.tLabel('priority')}</span>
            <span class="info-value">${this.vasOrder.priority || '-'}</span>
          </div>
          <!-- 비고는 전체 너비 차지 -->
          <div class="info-item full-width">
            <span class="info-label">${TermsUtil.tLabel('remarks')}</span>
            <span class="info-value">${this.vasOrder.remarks || '-'}</span>
          </div>
        </div>
      </div>

      <!-- 탭 -->
      <div class="detail-tabs">
        <md-tabs>
          <md-primary-tab @click="${() => this.switchTab(0)}" ?active="${this.activeTab === 0}">
            ${TermsUtil.tLabel('materials')} (${this.items.length})
          </md-primary-tab>
          <md-primary-tab @click="${() => this.switchTab(1)}" ?active="${this.activeTab === 1}">
            ${TermsUtil.tLabel('result')} (${this.results.length})
          </md-primary-tab>
        </md-tabs>
      </div>

      <!-- 탭 컨텐츠 -->
      <div class="tab-content">
        <!-- 소요 자재 탭 -->
        <div class="tab-panel ${this.activeTab === 0 ? 'active' : ''}">
          ${this.renderMaterials()}
        </div>

        <!-- 실적 내역 탭 -->
        <div class="tab-panel ${this.activeTab === 1 ? 'active' : ''}">
          ${this.renderResults()}
        </div>
      </div>
    `
  }

  /**
   * 소요 자재 탭 렌더링
   */
  renderMaterials() {
    if (!this.items || this.items.length === 0) {
      return html`
        <div class="empty-state">
          <mwc-icon>inventory_2</mwc-icon>
          <div>${TermsUtil.tText('no_materials')}</div>
        </div>
      `
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>${TermsUtil.tLabel('seq')}</th>
            <th>${TermsUtil.tLabel('sku_nm')}</th>
            <th>${TermsUtil.tLabel('sku_cd')}</th>
            <th>${TermsUtil.tLabel('req_qty')}</th>
            <th>${TermsUtil.tLabel('alloc_qty')}</th>
            <th>${TermsUtil.tLabel('pick_qty')}</th>
            <th>${TermsUtil.tLabel('status')}</th>
          </tr>
        </thead>
        <tbody>
          ${this.items.map((item, index) => html`
            <tr>
              <td>${index + 1}</td>
              <td>${item.sku_nm || '-'}</td>
              <td>${item.sku_cd || '-'}</td>
              <td>${item.req_qty || 0}</td>
              <td>${item.alloc_qty || 0}</td>
              <td>${item.pick_qty || 0}</td>
              <td>${item.status || '-'}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `
  }

  /**
   * 실적 내역 탭 렌더링
   */
  renderResults() {
    if (!this.results || this.results.length === 0) {
      return html`
        <div class="empty-state">
          <mwc-icon>assignment</mwc-icon>
          <div>${TermsUtil.tText('no_results')}</div>
        </div>
      `
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>${TermsUtil.tLabel('result_type')}</th>
            <th>${TermsUtil.tLabel('set_sku_nm')}</th>
            <th>${TermsUtil.tLabel('set_sku_cd')}</th>
            <th>${TermsUtil.tLabel('result_qty')}</th>
            <th>${TermsUtil.tLabel('defect_qty')}</th>
            <th>${TermsUtil.tLabel('work_date')}</th>
          </tr>
        </thead>
        <tbody>
          ${this.results.map(result => html`
            <tr>
              <td>${result.result_type || '-'}</td>
              <td>${result.set_sku_nm || '-'}</td>
              <td>${result.set_sku_cd || '-'}</td>
              <td>${result.result_qty || 0}</td>
              <td>${result.defect_qty || 0}</td>
              <td>${ValueUtil.formatDate(result.work_date)}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `
  }
}

customElements.define('vas-order-detail', VasOrderDetail)
