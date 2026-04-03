import { css, html, LitElement } from 'lit-element'
import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 피킹 작업 상세 팝업
 *
 * 기능:
 * - 피킹 작업 헤더 + 상태 배지 + 상태별 액션 버튼
 * - 수평 상태 타임라인 (3단계: CREATED → IN_PROGRESS → COMPLETED)
 * - 2탭: 기본정보 / 피킹 항목
 * - 피킹 항목 탭 lazy loading
 *
 * @fires task-updated - 상태 변경 후 발생. detail: { pickingTaskId }
 *
 * @example
 * const el = document.createElement('picking-task-detail')
 * el.pickingTaskId = taskId
 * el.addEventListener('task-updated', () => this._fetchData())
 * UiUtil.openPopupByElement('피킹 작업 상세', 'large', el, true)
 */
class PickingTaskDetail extends localize(i18next)(LitElement) {
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

        .status-badge.CREATED { background-color: #7B1FA2; }
        .status-badge.IN_PROGRESS { background-color: #FF9800; }
        .status-badge.COMPLETED { background-color: #4CAF50; }
        .status-badge.CANCELLED { background-color: #D32F2F; }

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

        /* 항목 상태 배지 */
        .item-status {
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .item-status.WAIT { background: #9E9E9E; }
        .item-status.RUN { background: #FF9800; }
        .item-status.PICKED { background: #4CAF50; }
        .item-status.SHORT { background: #F44336; }
        .item-status.CANCEL { background: #D32F2F; }

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

  /** 컴포넌트 반응형 속성 정의 */
  static get properties() {
    return {
      pickingTaskId: String,
      parent_id: String, // pickingTaskId 별칭 (외부에서 parent_id로 전달 시 자동 매핑)
      task: Object,
      pickingItems: Array,
      activeTab: Number,
      loading: Boolean,
      actionLoading: Boolean
    }
  }

  /** 생성자 - 초기 상태값 설정 */
  constructor() {
    super()
    this.pickingTaskId = null
    this.parent_id = null
    this.task = null
    this.pickingItems = null
    this.activeTab = 0
    this.loading = true
    this.actionLoading = false
  }

  /** 속성 변경 후 실행 (pickingTaskId 변경 시 데이터 조회) */
  updated(changedProps) {
    // parent_id 파라미터가 전달되면 pickingTaskId로 복사 (외부 호환성)
    if (changedProps.has('parent_id') && this.parent_id && !this.pickingTaskId) {
      this.pickingTaskId = this.parent_id
    }

    if (changedProps.has('pickingTaskId') && this.pickingTaskId) {
      this._fetchTask()
    }
  }

  /** 화면 렌더링 */
  render() {
    if (this.loading) {
      return html`<div class="loading">데이터 로딩 중...</div>`
    }

    if (!this.task) {
      return html`<div class="empty-state"><div class="text">피킹 작업 정보를 찾을 수 없습니다</div></div>`
    }

    return html`
      ${this._renderHeader()}
      ${this._renderTabs()}
      <div class="tab-content">
        <div class="tab-panel ${this.activeTab === 0 ? 'active' : ''}">${this._renderBasicInfoTab()}</div>
        <div class="tab-panel ${this.activeTab === 1 ? 'active' : ''}">${this._renderPickingItemsTab()}</div>
      </div>
    `
  }

  /* ============================================================
   * 렌더링 — 헤더
   * ============================================================ */

  /** 헤더 영역 렌더링 (타이틀, 상태 배지, 액션 버튼, 타임라인) */
  _renderHeader() {
    const t = this.task
    return html`
      <div class="detail-header">
        <div class="header-top">
          <div class="header-title">
            <h2>${t.pick_task_no || '-'}</h2>
            <span class="status-badge ${t.status}">${this._statusLabel(t.status)}</span>
          </div>
          <div class="header-actions">
            ${this._renderActionButtons()}
          </div>
        </div>

        ${this._renderTimeline()}
      </div>
    `
  }

  /** 수평 상태 타임라인 렌더링 (3단계) */
  _renderTimeline() {
    const steps = [
      { key: 'CREATED', label: '생성' },
      { key: 'IN_PROGRESS', label: '진행중' },
      { key: 'COMPLETED', label: '완료' }
    ]

    const status = this.task?.status
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

  /** 상태별 액션 버튼 렌더링 */
  _renderActionButtons() {
    const s = this.task?.status
    return html`
      ${s === 'CREATED' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._startTask}">피킹 시작</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelTask}">취소</button>
      ` : ''}
      ${s === 'IN_PROGRESS' ? html`
        <button class="action-btn primary" ?disabled="${this.actionLoading}" @click="${this._completeTask}">피킹 완료</button>
        <button class="action-btn danger" ?disabled="${this.actionLoading}" @click="${this._cancelTask}">취소</button>
      ` : ''}
    `
  }

  /* ============================================================
   * 렌더링 — 탭 바
   * ============================================================ */

  /** 탭 바 렌더링 (기본정보/피킹항목) */
  _renderTabs() {
    const itemCount = this.pickingItems ? this.pickingItems.length : 0
    return html`
      <div class="tab-bar">
        <div class="tab-item ${this.activeTab === 0 ? 'active' : ''}" @click="${() => this._switchTab(0)}">
          기본정보
        </div>
        <div class="tab-item ${this.activeTab === 1 ? 'active' : ''}" @click="${() => this._switchTab(1)}">
          피킹 항목${this.pickingItems ? ` (${itemCount})` : ''}
        </div>
      </div>
    `
  }

  /* ============================================================
   * Tab 0: 기본정보
   * ============================================================ */

  /** 기본정보 탭 렌더링 */
  _renderBasicInfoTab() {
    const t = this.task
    return html`
      <div class="info-section-title">작업 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">피킹작업번호</span>
          <span class="info-value">${t.pick_task_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">웨이브번호</span>
          <span class="info-value">${t.wave_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">출하번호</span>
          <span class="info-value">${t.shipment_no || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">주문일</span>
          <span class="info-value">${t.order_date || '-'}</span>
        </div>
      </div>

      <div class="info-section-title">조직 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">화주사</span>
          <span class="info-value">${t.com_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">창고</span>
          <span class="info-value">${t.wh_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">피킹유형</span>
          <span class="info-value">${this._pickTypeLabel(t.pick_type)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">피킹방식</span>
          <span class="info-value">${this._pickMethodLabel(t.pick_method)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">존</span>
          <span class="info-value">${t.zone_cd || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">작업자</span>
          <span class="info-value">${t.worker_id || '-'}</span>
        </div>
      </div>

      <div class="info-section-title">계획 수량</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">계획 오더수</span>
          <span class="info-value">${t.plan_order ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">계획 품목수</span>
          <span class="info-value">${t.plan_item ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">계획 총수량</span>
          <span class="info-value">${t.plan_total ?? '-'}</span>
        </div>
      </div>

      <div class="info-section-title">실적 수량</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">실적 오더수</span>
          <span class="info-value">${t.result_order ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">실적 품목수</span>
          <span class="info-value">${t.result_item ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">실적 총수량</span>
          <span class="info-value">${t.result_total ?? '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">부족 총수량</span>
          <span class="info-value ${(t.short_total || 0) > 0 ? 'qty-short' : ''}">${t.short_total ?? '-'}</span>
        </div>
      </div>

      <div class="info-section-title">처리 이력</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">시작일시</span>
          <span class="info-value">${this._formatDateTime(t.started_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">완료일시</span>
          <span class="info-value">${this._formatDateTime(t.completed_at)}</span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * Tab 1: 피킹 항목
   * ============================================================ */

  /** 피킹 항목 탭 렌더링 */
  _renderPickingItemsTab() {
    if (this.pickingItems === null) {
      return html`<div class="loading">피킹 항목 로딩 중...</div>`
    }

    if (!this.pickingItems || !this.pickingItems.length) {
      return html`<div class="empty-state"><div class="icon">📋</div><div class="text">피킹 항목이 없습니다</div></div>`
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>순번</th>
            <th>SKU</th>
            <th>상품명</th>
            <th>출고 로케이션</th>
            <th>투입 로케이션</th>
            <th>바코드</th>
            <th class="text-right">지시수량</th>
            <th class="text-right">피킹수량</th>
            <th class="text-right">부족수량</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          ${this.pickingItems.map(item => html`
            <tr>
              <td>${item.rank || '-'}</td>
              <td>${item.sku_cd || '-'}</td>
              <td>${item.sku_nm || '-'}</td>
              <td>${item.from_loc_cd || '-'}</td>
              <td>${item.to_loc_cd || '-'}</td>
              <td>${item.barcode || '-'}</td>
              <td class="text-right">${item.order_qty ?? 0}</td>
              <td class="text-right">${item.pick_qty ?? 0}</td>
              <td class="text-right ${(item.short_qty || 0) > 0 ? 'qty-short' : ''}">${item.short_qty ?? 0}</td>
              <td><span class="item-status ${item.status}">${this._itemStatusLabel(item.status)}</span></td>
            </tr>
          `)}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <span class="label">총 항목:</span>
          <span class="value">${this.pickingItems.length}건</span>
        </div>
        <div class="summary-item">
          <span class="label">총 지시:</span>
          <span class="value">${this.pickingItems.reduce((s, i) => s + (i.order_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 피킹:</span>
          <span class="value">${this.pickingItems.reduce((s, i) => s + (i.pick_qty || 0), 0)} EA</span>
        </div>
        <div class="summary-item">
          <span class="label">총 부족:</span>
          <span class="value ${this.pickingItems.reduce((s, i) => s + (i.short_qty || 0), 0) > 0 ? 'qty-short' : ''}">
            ${this.pickingItems.reduce((s, i) => s + (i.short_qty || 0), 0)} EA
          </span>
        </div>
      </div>
    `
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  /** 피킹 작업 헤더 정보 조회 */
  async _fetchTask() {
    this.loading = true
    try {
      const data = await ServiceUtil.restGet('picking_tasks/' + this.pickingTaskId)
      this.task = data
    } catch (error) {
      console.error('피킹 작업 상세 조회 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: '피킹 작업 상세 조회에 실패했습니다' } }))
    } finally {
      this.loading = false
    }
  }

  /** 피킹 항목 목록 조회 */
  async _fetchPickingItems() {
    try {
      const data = await ServiceUtil.restGet('ful_trx/picking_tasks/' + this.pickingTaskId + '/items')
      this.pickingItems = data || []
    } catch (error) {
      console.error('피킹 항목 조회 실패:', error)
      this.pickingItems = []
    }
  }

  /* ============================================================
   * 탭 전환 (lazy loading)
   * ============================================================ */

  /** 탭 전환 (lazy loading) */
  _switchTab(index) {
    this.activeTab = index

    if (index === 1 && this.pickingItems === null) {
      this._fetchPickingItems()
    }
  }

  /* ============================================================
   * 액션
   * ============================================================ */

  /** 피킹 작업 시작 */
  async _startTask() {
    const result = await UiUtil.showAlertPopup('label.confirm', '피킹을 시작하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/picking_tasks/' + this.pickingTaskId + '/start')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '피킹이 시작되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('피킹 시작 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '피킹 시작에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 피킹 작업 완료 */
  async _completeTask() {
    const result = await UiUtil.showAlertPopup('label.confirm', '피킹을 완료 처리하시겠습니까?', 'question', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/picking_tasks/' + this.pickingTaskId + '/complete')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '피킹이 완료되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('피킹 완료 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '피킹 완료에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 피킹 작업 취소 */
  async _cancelTask() {
    const result = await UiUtil.showAlertPopup('label.confirm', '피킹 작업을 취소하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', 'warning', 'confirm', 'cancel')
    if (!result) return

    this.actionLoading = true
    try {
      await ServiceUtil.restPost('ful_trx/picking_tasks/' + this.pickingTaskId + '/cancel')
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: '피킹 작업이 취소되었습니다' } }))
      await this._refreshAfterAction()
    } catch (error) {
      console.error('피킹 작업 취소 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: error.message || '피킹 작업 취소에 실패했습니다' } }))
    } finally {
      this.actionLoading = false
    }
  }

  /** 액션 실행 후 데이터 새로고침 */
  async _refreshAfterAction() {
    await this._fetchTask()
    this.pickingItems = null
    this._dispatchTaskUpdated()
  }

  /** 부모 컴포넌트에 변경 이벤트 발행 */
  _dispatchTaskUpdated() {
    this.dispatchEvent(
      new CustomEvent('task-updated', {
        composed: true,
        bubbles: true,
        detail: { pickingTaskId: this.pickingTaskId }
      })
    )
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  /** 피킹 상태 한글 라벨 반환 */
  _statusLabel(status) {
    const labels = {
      CREATED: '생성',
      IN_PROGRESS: '진행중',
      COMPLETED: '완료',
      CANCELLED: '취소'
    }
    return labels[status] || status || '-'
  }

  /** 피킹 항목 상태 한글 라벨 반환 */
  _itemStatusLabel(status) {
    const labels = {
      WAIT: '대기',
      RUN: '진행',
      PICKED: '피킹완료',
      SHORT: '부족',
      CANCEL: '취소'
    }
    return labels[status] || status || '-'
  }

  /** 피킹 유형 한글 라벨 반환 */
  _pickTypeLabel(type) {
    const labels = {
      ORDER: '오더 피킹',
      BATCH: '배치 피킹',
      ZONE: '존 피킹',
      WAVE: '웨이브 피킹'
    }
    return labels[type] || type || '-'
  }

  /** 피킹 방식 한글 라벨 반환 */
  _pickMethodLabel(type) {
    const labels = {
      WCS: 'WCS 위임',
      PAPER: '페이퍼 처리',
      INSPECT: '검수와 함께 피킹',
      PICK: '피킹'
    }
    return labels[type] || type || '-'
  }

  /** 날짜/시간을 YYYY-MM-DD HH:mm 형식으로 포맷 */
  _formatDateTime(dateValue) {
    if (!dateValue) return '-'
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return '-'
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
}

customElements.define('picking-task-detail', PickingTaskDetail)
