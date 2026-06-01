import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * RWA(반품) 통합 PDA 작업 화면
 *
 * 3개의 개별 화면(입고/검수/처분)을 하나로 통합.
 * vas-work-page 레이아웃 기준:
 * - 주문 선택 화면: 대기(REQUEST/APPROVED) / 작업중(RECEIVING/RECEIVED/INSPECTING/INSPECTED/DISPOSING) / 완료(COMPLETED/CANCELLED/REJECTED) 카드
 * - 작업 화면: 선택된 주문의 현재 단계에 따라 입고/검수/처분 UI 동적 전환
 *
 * 상태 흐름:
 *   REQUEST → APPROVED → RECEIVING → RECEIVED → INSPECTING → INSPECTED → DISPOSING → COMPLETED
 *   (CANCELLED / REJECTED: 언제든 가능)
 */
class RwaWork extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--md-sys-color-background, #f5f5f5);
          overflow: hidden;
          font-family: var(--theme-font, 'Noto Sans KR', sans-serif);
        }

        /* ======================================
         * 요약 카드 (대기 / 작업중 / 완료)
         * ====================================== */
        .summary-cards {
          display: flex;
          gap: 8px;
          padding: 12px 16px 0;
        }

        .summary-card {
          flex: 1;
          padding: 10px 8px;
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          background: var(--md-sys-color-surface, #fff);
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
          transition: all .15s;
          border: 2px solid transparent;
        }

        .summary-card[active] { border-color: var(--md-sys-color-primary, #1976D2); }
        .summary-card:active { transform: scale(.97); }

        .summary-card .count {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
        }

        .summary-card .card-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
        }

        .summary-card.waiting .count  { color: #F57C00; }
        .summary-card.working .count  { color: #1976D2; }
        .summary-card.done .count     { color: #4CAF50; }

        /* ======================================
         * 주문 목록
         * ====================================== */
        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .order-item {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
          cursor: pointer;
          transition: all .15s;
        }

        .order-item:active { transform: scale(.98); }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .order-no {
          font-size: 15px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
        }

        .order-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          color: #fff;
          background: #9E9E9E;
        }

        .order-badge.REQUEST    { background: #FF9800; }
        .order-badge.APPROVED   { background: #2196F3; }
        .order-badge.RECEIVING  { background: #03A9F4; }
        .order-badge.RECEIVED   { background: #00BCD4; }
        .order-badge.INSPECTING { background: #9C27B0; }
        .order-badge.INSPECTED  { background: #673AB7; }
        .order-badge.DISPOSING  { background: #FF5722; }
        .order-badge.COMPLETED  { background: #4CAF50; }
        .order-badge.REJECTED   { background: #F44336; }
        .order-badge.CANCELLED  { background: #9E9E9E; }

        .sub-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* ======================================
         * 작업 화면 공통
         * ====================================== */
        .work-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .work-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--md-sys-color-surface, #fff);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .back-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          font-size: 22px;
          cursor: pointer;
          padding: 0;
          color: var(--md-sys-color-on-surface, #333);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .work-title {
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
        }

        .work-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ======================================
         * 정보 카드
         * ====================================== */
        .info-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
        }

        .info-card .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          font-size: 14px;
        }

        .info-card .info-row .label { color: var(--md-sys-color-on-surface-variant, #666); }
        .info-card .info-row .value { font-weight: 600; color: var(--md-sys-color-on-surface, #222); }

        /* ======================================
         * 아이템 카드 (입고/검수)
         * ====================================== */
        .item-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
          border-left: 4px solid transparent;
        }

        .item-card.active  { border-left-color: var(--md-sys-color-primary, #1976D2); }
        .item-card.done    { border-left-color: #4CAF50; opacity: .7; }

        .item-card .sku-info {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .item-card .qty-info {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* ======================================
         * 폼 그룹
         * ====================================== */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #555);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 14px;
          border: 1.5px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 10px;
          font-size: 15px;
          color: var(--md-sys-color-on-surface, #222);
          background: var(--md-sys-color-surface, #fff);
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
        }

        .qty-row {
          display: flex;
          gap: 12px;
        }

        .qty-row .form-group { flex: 1; }

        /* ======================================
         * 액션 버튼
         * ====================================== */
        .action-bar {
          padding: 12px 16px;
          background: var(--md-sys-color-surface, #fff);
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          display: flex;
          gap: 10px;
        }

        .action-btn {
          flex: 1;
          min-height: 50px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all .15s;
        }

        .action-btn:active { transform: scale(.97); }

        .action-btn.primary  { background: var(--md-sys-color-primary, #1976D2); color: var(--md-sys-color-on-primary, #fff); }
        .action-btn.secondary { background: var(--md-sys-color-surface-variant, #eee); color: var(--md-sys-color-on-surface, #333); }
        .action-btn.success  { background: #4CAF50; color: #fff; }
        .action-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ======================================
         * 피드백 토스트
         * ====================================== */
        .feedback-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 24px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          z-index: 9999;
          animation: fadeOut 2.5s forwards;
        }

        .feedback-toast.success { background: #4CAF50; }
        .feedback-toast.error   { background: #F44336; }
        .feedback-toast.warning { background: #FF9800; }

        @keyframes fadeOut {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }

        /* ======================================
         * 단계 표시
         * ====================================== */
        .phase-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
        }

        .phase-badge.receive  { background: #03A9F4; }
        .phase-badge.inspect  { background: #9C27B0; }
        .phase-badge.dispose  { background: #FF5722; }
        .phase-badge.done     { background: #4CAF50; }

        /* 빈 상태 */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--md-sys-color-on-surface-variant, #888);
          gap: 8px;
        }

        .empty-state .empty-icon { font-size: 40px; opacity: .4; }
        .empty-state .empty-text { font-size: 14px; }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: var(--md-sys-color-on-surface-variant, #888);
          font-size: 14px;
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      screen: String,         // 'order-select' | 'work'
      filterStatus: String,   // 'WAITING' | 'WORKING' | 'DONE' | null
      orders: Array,
      selectedOrder: Object,
      orderItems: Array,
      currentItemIndex: Number,
      actionLoading: Boolean,
      feedbackMsg: String,
      feedbackType: String,
      // 현재 작업 단계
      workPhase: String,      // 'receive' | 'inspect' | 'dispose'
      // 입고 폼
      rcvQty: Number,
      rcvLocCd: String,
      // 검수 폼
      goodQty: Number,
      defectQty: Number,
      defectType: String,
      defectDesc: String,
      remarks: String,
      // 처분 폼
      dispType: String,
      dispLocCd: String,
      dispExpiredDate: String,
      dispScrapMethod: String,
    }
  }

  constructor() {
    super()
    this.loading = true
    this.screen = 'order-select'
    this.filterStatus = null
    this.orders = []
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this.actionLoading = false
    this.feedbackMsg = ''
    this.feedbackType = ''
    this.workPhase = 'receive'
    this._resetForms()
  }

  get context() {
    return {
      title: TermsUtil.tMenu('RwaWork')
    }
  }

  /** 모든 입력 폼 초기화 */
  _resetForms() {
    this.rcvQty = 0
    this.rcvLocCd = ''
    this.goodQty = 0
    this.defectQty = 0
    this.defectType = ''
    this.defectDesc = ''
    this.remarks = ''
    this.dispType = ''
    this.dispLocCd = ''
    this.dispExpiredDate = ''
    this.dispScrapMethod = ''
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  connectedCallback() {
    super.connectedCallback()
    this._fetchOrders()
  }

  /* ============================================================
   * 렌더링 진입점
   * ============================================================ */

  render() {
    return html`
      ${this.screen === 'order-select' ? this._renderOrderSelect() : this._renderWorkScreen()}
      ${this.feedbackMsg ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>` : ''}
    `
  }

  /* ============================================================
   * 주문 선택 화면
   * ============================================================ */

  /** 주문 선택 화면: 상태 요약 카드 + 필터링된 주문 목록 */
  _renderOrderSelect() {
    // 상태 분류
    const WAITING_STATUS  = ['REQUEST', 'APPROVED']
    const WORKING_STATUS  = ['RECEIVING', 'RECEIVED', 'INSPECTING', 'INSPECTED', 'DISPOSING']
    const DONE_STATUS     = ['COMPLETED', 'CANCELLED', 'REJECTED']

    const waiting = this.orders.filter(o => WAITING_STATUS.includes(o.status))
    const working = this.orders.filter(o => WORKING_STATUS.includes(o.status))
    const done    = this.orders.filter(o => DONE_STATUS.includes(o.status))

    const filtered =
      this.filterStatus === 'WAITING' ? waiting
      : this.filterStatus === 'WORKING' ? working
      : this.filterStatus === 'DONE'    ? done
      : [...waiting, ...working]

    return html`
      <!-- 상태 요약 카드 -->
      <div class="summary-cards">
        <div class="summary-card waiting"
          ?active="${this.filterStatus === 'WAITING'}"
          @click="${() => this._toggleFilter('WAITING')}">
          <div class="count">${waiting.length}</div>
          <div class="card-label">대기</div>
        </div>
        <div class="summary-card working"
          ?active="${this.filterStatus === 'WORKING'}"
          @click="${() => this._toggleFilter('WORKING')}">
          <div class="count">${working.length}</div>
          <div class="card-label">작업중</div>
        </div>
        <div class="summary-card done"
          ?active="${this.filterStatus === 'DONE'}"
          @click="${() => this._toggleFilter('DONE')}">
          <div class="count">${done.length}</div>
          <div class="card-label">완료</div>
        </div>
      </div>

      <!-- 주문 목록 -->
      <div class="task-list">
        ${this.loading
          ? html`<div class="loading">주문 목록 조회 중...</div>`
          : filtered.length === 0
            ? html`
                <div class="empty-state">
                  <span class="empty-icon">📦</span>
                  <span class="empty-text">해당 반품 주문이 없습니다</span>
                </div>`
            : filtered.map(order => html`
                <div class="order-item" @click="${() => this._selectOrder(order)}">
                  <div class="card-header">
                    <span class="order-no">${order.rwa_req_no || order.rwa_no || '-'}</span>
                    <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
                  </div>
                  <div class="sub-info">
                    ${this._rwaTypeLabel(order.rwa_type)} | ${order.com_cd || '-'}
                    ${order.cust_nm ? ` · ${order.cust_nm}` : ''}
                  </div>
                </div>
              `)
        }
      </div>
    `
  }

  /* ============================================================
   * 작업 화면 (입고/검수/처분 통합)
   * ============================================================ */

  /** 작업 화면 전체 레이아웃 */
  _renderWorkScreen() {
    const order = this.selectedOrder
    const phase = this._getWorkPhase(order?.status)

    return html`
      <div class="work-screen">
        <!-- 헤더 -->
        <div class="work-header">
          <button class="back-btn" @click="${this._backToOrderSelect}">←</button>
          <div class="work-title">${order?.rwa_req_no || order?.rwa_no || '-'}</div>
          <span class="phase-badge ${phase}">${this._phaseLabel(phase)}</span>
        </div>

        <!-- 주문 정보 -->
        <div class="work-body">
          <div class="info-card">
            <div class="info-row">
              <span class="label">상태</span>
              <span class="value">
                <span class="order-badge ${order?.status}">${this._statusLabel(order?.status)}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="label">반품 유형</span>
              <span class="value">${this._rwaTypeLabel(order?.rwa_type)}</span>
            </div>
            ${order?.cust_nm ? html`
              <div class="info-row">
                <span class="label">거래처</span>
                <span class="value">${order.cust_nm}</span>
              </div>` : ''}
            ${order?.rwa_req_date ? html`
              <div class="info-row">
                <span class="label">요청일</span>
                <span class="value">${order.rwa_req_date}</span>
              </div>` : ''}
          </div>

          <!-- 단계별 작업 UI -->
          ${phase === 'receive'  ? this._renderReceivePhase()
          : phase === 'inspect'  ? this._renderInspectPhase()
          : phase === 'dispose'  ? this._renderDisposePhase()
          : this._renderDonePhase()}
        </div>

        <!-- 작업 버튼 -->
        ${phase !== 'done' ? html`
          <div class="action-bar">
            <button class="action-btn secondary" @click="${this._backToOrderSelect}">목록</button>
            <button class="action-btn primary"
              ?disabled="${this.actionLoading}"
              @click="${this._handleAction}">
              ${this.actionLoading ? '처리중...' : this._actionLabel(phase)}
            </button>
          </div>` : html`
          <div class="action-bar">
            <button class="action-btn secondary" @click="${this._backToOrderSelect}">목록으로</button>
          </div>`}
      </div>
    `
  }

  /** 입고 단계 UI */
  _renderReceivePhase() {
    const items = this.orderItems.filter(i => !['RECEIVED', 'INSPECTED', 'DISPOSED', 'COMPLETED'].includes(i.status))
    const currentItem = items[0]

    if (!currentItem) {
      return html`
        <div class="empty-state">
          <span class="empty-icon">✅</span>
          <span class="empty-text">모든 아이템 입고 완료</span>
        </div>`
    }

    return html`
      <div class="item-card active">
        <div class="sku-info">${currentItem.sku_cd} · ${currentItem.sku_nm || '-'}</div>
        <div class="qty-info">반품 요청 수량: ${currentItem.rwa_req_qty || currentItem.rwa_qty || 0} EA</div>
      </div>

      <div class="form-group">
        <label>입고 수량</label>
        <input type="number" min="0"
          .value="${String(this.rcvQty)}"
          @input="${e => { this.rcvQty = Number(e.target.value) }}"
          placeholder="입고 수량 입력" />
      </div>

      <div class="form-group">
        <label>보관 로케이션</label>
        <input type="text"
          .value="${this.rcvLocCd}"
          @input="${e => { this.rcvLocCd = e.target.value }}"
          placeholder="로케이션 코드 (예: TEMP-01)" />
      </div>

      <!-- 아이템 진행 현황 -->
      <div class="info-card">
        <div style="font-size:13px; font-weight:600; margin-bottom:8px; color: var(--md-sys-color-on-surface-variant)">항목 현황</div>
        ${this.orderItems.map(item => html`
          <div class="info-row">
            <span class="label">${item.sku_cd}</span>
            <span class="value ${['RECEIVED','INSPECTED','DISPOSED','COMPLETED'].includes(item.status) ? 'done' : ''}">
              ${item.rwa_qty || 0} EA · ${this._statusLabel(item.status)}
            </span>
          </div>
        `)}
      </div>
    `
  }

  /** 검수 단계 UI */
  _renderInspectPhase() {
    const items = this.orderItems.filter(i => i.status === 'RECEIVED' || i.status === 'INSPECTING')
    const currentItem = items[0]

    if (!currentItem) {
      return html`
        <div class="empty-state">
          <span class="empty-icon">✅</span>
          <span class="empty-text">모든 아이템 검수 완료</span>
        </div>`
    }

    return html`
      <div class="item-card active">
        <div class="sku-info">${currentItem.sku_cd} · ${currentItem.sku_nm || '-'}</div>
        <div class="qty-info">입고 수량: ${currentItem.rwa_qty || 0} EA</div>
      </div>

      <div class="qty-row">
        <div class="form-group">
          <label>양품 수량</label>
          <input type="number" min="0"
            .value="${String(this.goodQty)}"
            @input="${e => { this.goodQty = Number(e.target.value) }}"
            placeholder="0" />
        </div>
        <div class="form-group">
          <label>불량 수량</label>
          <input type="number" min="0"
            .value="${String(this.defectQty)}"
            @input="${e => { this.defectQty = Number(e.target.value) }}"
            placeholder="0" />
        </div>
      </div>

      ${this.defectQty > 0 ? html`
        <div class="form-group">
          <label>불량 유형</label>
          <select .value="${this.defectType}"
            @change="${e => { this.defectType = e.target.value }}">
            <option value="">선택하세요</option>
            <option value="DAMAGED">파손</option>
            <option value="EXPIRED">유통기한 초과</option>
            <option value="WRONG_ITEM">오배송 (잘못된 상품)</option>
            <option value="MISSING_PARTS">부품 누락</option>
            <option value="FUNCTIONAL_DEFECT">기능 결함</option>
          </select>
        </div>
        <div class="form-group">
          <label>불량 상세</label>
          <input type="text"
            .value="${this.defectDesc}"
            @input="${e => { this.defectDesc = e.target.value }}"
            placeholder="불량 내용 간략 기재" />
        </div>` : ''}

      <div class="form-group">
        <label>비고</label>
        <input type="text"
          .value="${this.remarks}"
          @input="${e => { this.remarks = e.target.value }}"
          placeholder="추가 메모 (선택)" />
      </div>
    `
  }

  /** 처분 단계 UI */
  _renderDisposePhase() {
    const items = this.orderItems.filter(i => i.status === 'INSPECTED')
    const currentItem = items[0]

    if (!currentItem) {
      return html`
        <div class="empty-state">
          <span class="empty-icon">✅</span>
          <span class="empty-text">모든 아이템 처분 완료</span>
        </div>`
    }

    return html`
      <div class="item-card active">
        <div class="sku-info">${currentItem.sku_cd} · ${currentItem.sku_nm || '-'}</div>
        <div class="qty-info">
          양품: ${currentItem.good_qty || 0} EA &nbsp;|&nbsp; 불량: ${currentItem.defect_qty || 0} EA
        </div>
      </div>

      <div class="form-group">
        <label>처분 유형</label>
        <select .value="${this.dispType}"
          @change="${e => { this.dispType = e.target.value }}">
          <option value="">선택하세요</option>
          <option value="RESTOCK">재입고 (정상 재고)</option>
          <option value="SCRAP">폐기</option>
          <option value="REPAIR">수리/재가공</option>
          <option value="RETURN_VENDOR">공급업체 반송</option>
          <option value="DONATION">기부</option>
        </select>
      </div>

      ${this.dispType === 'RESTOCK' ? html`
        <div class="form-group">
          <label>재입고 로케이션</label>
          <input type="text"
            .value="${this.dispLocCd}"
            @input="${e => { this.dispLocCd = e.target.value }}"
            placeholder="예: A-01-05" />
        </div>
        <div class="form-group">
          <label>소비기한 (선택)</label>
          <input type="date"
            .value="${this.dispExpiredDate}"
            @change="${e => { this.dispExpiredDate = e.target.value }}" />
        </div>` : ''}

      ${this.dispType === 'SCRAP' ? html`
        <div class="form-group">
          <label>폐기 방법</label>
          <select .value="${this.dispScrapMethod}"
            @change="${e => { this.dispScrapMethod = e.target.value }}">
            <option value="">선택하세요</option>
            <option value="INCINERATION">소각</option>
            <option value="LANDFILL">매립</option>
            <option value="RECYCLE">재활용</option>
          </select>
        </div>` : ''}
    `
  }

  /** 완료 단계 UI */
  _renderDonePhase() {
    return html`
      <div class="info-card" style="text-align:center; background:#E8F5E9; border: 2px solid #4CAF50;">
        <div style="font-size:48px; margin-bottom:12px;">✅</div>
        <div style="font-size:18px; font-weight:700; color:#2E7D32;">반품 처리 완료</div>
        <div style="font-size:13px; color:#666; margin-top:8px;">
          목록으로 돌아가세요
        </div>
      </div>
    `
  }

  /* ============================================================
   * 이벤트 핸들러
   * ============================================================ */

  /** 필터 토글 */
  _toggleFilter(status) {
    this.filterStatus = this.filterStatus === status ? null : status
  }

  /** 주문 선택 */
  async _selectOrder(order) {
    this.selectedOrder = order
    this.screen = 'work'
    this._resetForms()
    await this._fetchOrderItems(order.id)
    this.workPhase = this._getWorkPhase(order.status)
    this.requestUpdate()
  }

  /** 목록으로 돌아가기 */
  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this._resetForms()
    this._fetchOrders()
  }

  /** 단계별 작업 실행 */
  async _handleAction() {
    const phase = this._getWorkPhase(this.selectedOrder?.status)

    if (phase === 'receive')  await this._doReceive()
    else if (phase === 'inspect') await this._doInspect()
    else if (phase === 'dispose') await this._doDispose()
  }

  /** 입고 처리 */
  async _doReceive() {
    const items = this.orderItems.filter(i => !['RECEIVED', 'INSPECTED', 'DISPOSED', 'COMPLETED'].includes(i.status))
    if (items.length === 0) { UiUtil.showToast('warning', '입고할 아이템이 없습니다'); return }

    const item = items[0]
    if (!this.rcvQty || this.rcvQty <= 0) { UiUtil.showToast('error', '입고 수량을 입력하세요'); return }

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/receive`,
        { rwa_qty: this.rcvQty, loc_cd: this.rcvLocCd || null }
      )
      this._showFeedback('success', `${item.sku_cd} 입고 완료 (${this.rcvQty}EA)`)
      this._resetForms()
      await this._refreshOrder()
    } catch (err) {
      UiUtil.showToast('error', err.message || '입고 처리 실패')
    } finally {
      this.actionLoading = false
    }
  }

  /** 검수 처리 */
  async _doInspect() {
    const items = this.orderItems.filter(i => i.status === 'RECEIVED' || i.status === 'INSPECTING')
    if (items.length === 0) { UiUtil.showToast('warning', '검수할 아이템이 없습니다'); return }

    const item = items[0]
    const totalQty = (this.goodQty || 0) + (this.defectQty || 0)
    if (totalQty <= 0) { UiUtil.showToast('error', '양품 또는 불량 수량을 입력하세요'); return }
    if (this.defectQty > 0 && !this.defectType) { UiUtil.showToast('error', '불량 유형을 선택하세요'); return }

    this.actionLoading = true
    try {
      // 검수 데이터 저장
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/inspect`,
        {
          insp_type: 'VISUAL',
          insp_qty: totalQty,
          good_qty: this.goodQty || 0,
          defect_qty: this.defectQty || 0,
          defect_type: this.defectType || null,
          defect_desc: this.defectDesc || null,
          photo_url: null,
          remarks: this.remarks || null
        }
      )
      // 검수 완료 (배치 바코드 채번)
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/complete_inspection`, {}
      )
      this._showFeedback('success', `${item.sku_cd} 검수 완료 (양품 ${this.goodQty}EA / 불량 ${this.defectQty}EA)`)
      this._resetForms()
      await this._refreshOrder()
    } catch (err) {
      UiUtil.showToast('error', err.message || '검수 처리 실패')
    } finally {
      this.actionLoading = false
    }
  }

  /** 처분 처리 */
  async _doDispose() {
    const items = this.orderItems.filter(i => i.status === 'INSPECTED')
    if (items.length === 0) { UiUtil.showToast('warning', '처분할 아이템이 없습니다'); return }

    const item = items[0]
    if (!this.dispType) { UiUtil.showToast('error', '처분 유형을 선택하세요'); return }
    if (this.dispType === 'RESTOCK' && !this.dispLocCd) {
      UiUtil.showToast('error', '재입고 로케이션을 입력하세요'); return
    }

    const dispQty = (item.good_qty || 0) + (item.defect_qty || 0)

    this.actionLoading = true
    try {
      await ServiceUtil.restPost(
        `rwa_trx/rwa_orders/${this.selectedOrder.id}/items/${item.id}/dispose`,
        {
          disposition_type: this.dispType,
          disposition_qty: dispQty,
          restock_loc_cd: this.dispLocCd || null,
          restock_expired_date: this.dispExpiredDate || null,
          scrap_method: this.dispScrapMethod || null,
          stock_impact_flag: true
        }
      )
      this._showFeedback('success', `${item.sku_cd} 처분 완료`)
      this._resetForms()
      await this._refreshOrder()
    } catch (err) {
      UiUtil.showToast('error', err.message || '처분 처리 실패')
    } finally {
      this.actionLoading = false
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 반품 주문 목록 조회 */
  async _fetchOrders() {
    this.loading = true
    try {
      const data = await ServiceUtil.restGet('rwa_trx/rwa_orders')
      this.orders = Array.isArray(data) ? data : (data?.items || [])
    } catch (err) {
      console.error('반품 주문 조회 실패:', err)
      this.orders = []
    } finally {
      this.loading = false
    }
  }

  /** 반품 주문 아이템 조회 */
  async _fetchOrderItems(orderId) {
    try {
      const data = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${orderId}/items`)
      this.orderItems = Array.isArray(data) ? data : (data?.items || [])
    } catch (err) {
      console.error('반품 아이템 조회 실패:', err)
      this.orderItems = []
    }
  }

  /** 주문 상태 갱신 후 화면 업데이트 */
  async _refreshOrder() {
    try {
      const data = await ServiceUtil.restGet(`rwa_trx/rwa_orders/${this.selectedOrder.id}`)
      this.selectedOrder = data
      await this._fetchOrderItems(this.selectedOrder.id)
      this.workPhase = this._getWorkPhase(this.selectedOrder.status)
    } catch (err) {
      console.error('주문 갱신 실패:', err)
    }
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /**
   * 현재 주문 상태 → 작업 단계 결정
   * REQUEST/APPROVED → 입고 대기 (receive)
   * RECEIVING/RECEIVED → 입고 단계 (receive)
   * INSPECTING/INSPECTED → 검수 단계 (inspect)
   * DISPOSING → 처분 단계 (dispose)
   * COMPLETED/CANCELLED/REJECTED → 완료 (done)
   */
  _getWorkPhase(status) {
    if (!status) return 'receive'
    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status)) return 'done'
    if (['INSPECTING', 'INSPECTED'].includes(status)) return 'inspect'
    if (['DISPOSING'].includes(status)) return 'dispose'
    return 'receive' // REQUEST, APPROVED, RECEIVING, RECEIVED
  }

  /** 작업 단계 라벨 */
  _phaseLabel(phase) {
    const labels = { receive: '입고', inspect: '검수', dispose: '처분', done: '완료' }
    return labels[phase] || phase
  }

  /** 단계별 액션 버튼 라벨 */
  _actionLabel(phase) {
    const labels = { receive: '입고 처리', inspect: '검수 완료', dispose: '처분 완료' }
    return labels[phase] || '확인'
  }

  /** 상태 코드 → 한국어 라벨 */
  _statusLabel(status) {
    const labels = {
      REQUEST: '반품요청', APPROVED: '승인', RECEIVING: '입고중', RECEIVED: '입고완료',
      INSPECTING: '검수중', INSPECTED: '검수완료', DISPOSING: '처리중',
      COMPLETED: '완료', REJECTED: '거부', CANCELLED: '취소', DISPOSED: '처분완료'
    }
    return labels[status] || status || '-'
  }

  /** 반품 유형 → 한국어 라벨 */
  _rwaTypeLabel(type) {
    const labels = {
      CUSTOMER_RETURN: '고객 반품', VENDOR_RETURN: '공급업체 반품',
      DEFECT_RETURN: '불량품 반품', STOCK_ADJUST: '재고 조정', EXPIRED_RETURN: '유통기한 임박'
    }
    return labels[type] || type || '-'
  }

  /** 피드백 메시지 표시 (2.5초 후 자동 소멸) */
  _showFeedback(type, msg) {
    this.feedbackType = type
    this.feedbackMsg = msg
    setTimeout(() => { this.feedbackMsg = ''; this.requestUpdate() }, 2500)
  }
}

customElements.define('rwa-work', RwaWork)
