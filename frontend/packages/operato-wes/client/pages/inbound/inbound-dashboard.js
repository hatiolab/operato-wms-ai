import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { openPopup } from '@operato/layout'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

import './receiving-order-import-popup'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 날짜를 YYYY-MM-DD 문자열로 변환 */
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

class InboundDashboard extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background: var(--md-sys-color-background);
          padding: 20px;
          overflow: auto;
          box-sizing: border-box;
        }

        /* ── 페이지 상단 유틸 바 ── */
        .page-util-bar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .util-date {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-right: auto;
        }
        .btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid var(--md-sys-color-outline, #bbb);
          background: var(--md-sys-color-surface);
          font-size: 13px;
          cursor: pointer;
          color: var(--md-sys-color-on-surface);
          transition: all 0.2s ease;
        }
        .btn:hover {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }
        .btn-outline {
          background: transparent;
          color: var(--md-sys-color-primary);
          border: 1px solid var(--md-sys-color-primary);
        }
        .btn-outline:hover {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        /* ── KPI 카드 그리드 ── */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .kpi-card {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: 16px 14px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .kpi-icon.blue   { background: #e3f2fd; }
        .kpi-icon.green  { background: #e8f5e9; }
        .kpi-icon.red    { background: #ffebee; }
        .kpi-icon.purple { background: #f3e5f5; }
        .kpi-icon.orange { background: #fff3e0; }
        .kpi-body { flex: 1; min-width: 0; }
        .kpi-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .kpi-value {
          font-size: 26px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
          line-height: 1.1;
        }
        .kpi-value .unit {
          font-size: 14px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
        }
        .kpi-sub {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 2px;
        }

        /* ── 카드 패널 공통 ── */
        .panel {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .panel-title {
          font-size: 15px;
          font-weight: 600;
          color: #1565c0;
        }
        .panel-title.red { color: #b71c1c; }

        /* ── 캘린더 범례 ── */
        .legend-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }
        .legend-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .legend-dot.normal { background: #2196f3; }
        .legend-dot.urgent { background: #f44336; }
        .legend-dot.done   { background: #4caf50; }
        .legend-dot.delay  { background: #ff9800; }

        /* ── 캘린더 네비게이션 ── */
        .cal-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .nav-btn {
          background: none;
          border: 1px solid var(--md-sys-color-outline, #ccc);
          border-radius: 6px;
          width: 26px;
          height: 26px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--md-sys-color-on-surface);
        }
        .nav-btn:hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .today-btn {
          padding: 3px 10px;
          border: 1px solid var(--md-sys-color-outline, #ccc);
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
        }
        .today-btn:hover { background: var(--md-sys-color-surface-variant, #f5f5f5); }
        .cal-month-label {
          font-size: 16px;
          font-weight: 600;
          min-width: 110px;
          text-align: center;
          color: var(--md-sys-color-on-surface);
        }

        /* ── 캘린더 그리드 ── */
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
        }
        .cal-day-header {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 2px;
          color: var(--md-sys-color-on-surface-variant);
        }
        .cal-day-header.sun { color: #f44336; }
        .cal-day-header.sat { color: #1565c0; }
        .cal-cell {
          min-height: 78px;
          border: 1px solid var(--md-sys-color-outline-variant, #e8e8e8);
          border-radius: 6px;
          padding: 4px 5px;
          background: var(--md-sys-color-surface);
          box-sizing: border-box;
        }
        .cal-cell.empty {
          background: var(--md-sys-color-surface-variant, #f9f9f9);
          border-color: transparent;
        }
        .cal-cell.today { border-color: #2196f3; }
        .cal-num-wrap {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 3px;
        }
        .cal-num {
          font-size: 12px;
          font-weight: 500;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: var(--md-sys-color-on-surface);
        }
        .cal-num.sun { color: #f44336; }
        .cal-num.sat { color: #1565c0; }
        .cal-cell.today .cal-num {
          background: #2196f3;
          color: #fff;
        }
        .cal-event {
          font-size: 10px;
          border-radius: 3px;
          padding: 2px 5px;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.4;
        }
        .cal-event.normal { background: #e3f2fd; color: #0d47a1; }
        .cal-event.urgent { background: #ffebee; color: #b71c1c; }
        .cal-event.done   { background: #e8f5e9; color: #1b5e20; }
        .cal-event.delay  { background: #fff3e0; color: #e65100; }

        /* ── 권고 리스트 ── */
        .badge {
          background: #f44336;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 10px;
        }
        .more-link {
          margin-left: auto;
          font-size: 13px;
          color: var(--md-sys-color-primary, #1565c0);
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }
        .more-link:hover { text-decoration: underline; }
        .repl-table-wrap {
          overflow-x: auto;
        }
        .repl-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .repl-table th {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          padding: 8px 12px;
          text-align: left;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }
        .repl-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface);
        }
        .repl-table tr:last-child td { border-bottom: none; }
        .repl-table tr:hover td {
          background: var(--md-sys-color-surface-variant, #f9f9f9);
        }
        .repl-table td.num { text-align: right; }
        .empty-msg {
          text-align: center;
          padding: 32px;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
        }

        /* ── 하단 5:5 좌우 배치 ── */
        .bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
          align-items: start;
        }
        .bottom-row .panel {
          margin-bottom: 0;
        }

        /* ── 우측 패널 (입고 권고 + 공지사항) ── */
        .right-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .right-col .panel {
          margin-bottom: 0;
          height: 223px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .right-col .repl-table-wrap,
        .right-col .notice-list,
        .right-col .empty-msg {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        /* ── 공지사항 ── */
        .notice-list {
          display: flex;
          flex-direction: column;
        }
        .notice-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e8e8e8);
        }
        .notice-item:last-child { border-bottom: none; }
        .notice-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 10px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .notice-badge.urgent { background: #ffebee; color: #b71c1c; }
        .notice-badge.info   { background: #e8f5e9; color: #1b5e20; }
        .notice-badge.normal { background: #f5f5f5; color: #616161; }
        .notice-title {
          flex: 1;
          font-size: 13px;
          color: var(--md-sys-color-on-surface);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .notice-date {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── 반응형 ── */
        @media (max-width: 1400px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 1100px) {
          .bottom-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `
    ]
  }

  /** 반응형 속성 */
  static get properties() {
    return {
      _summary: Object,
      _calYear: Number,
      _calMonth: Number,
      _calEvents: Array,
      _replenList: Array,
      _notices: Array
    }
  }

  /** 생성자 - 초기 상태 */
  constructor() {
    super()
    const now = new Date()
    this._summary = {}
    this._calYear = now.getFullYear()
    this._calMonth = now.getMonth()
    this._calEvents = []
    this._replenList = []
    this._notices = []
  }

  /** 페이지 컨텍스트 (브라우저 탭 타이틀) */
  get context() {
    return { title: TermsUtil.tMenu('InboundDashboard') }
  }

  /** 전체 렌더링 */
  render() {
    return html`
      <div>
        ${this._renderUtilBar()}
        ${this._renderKpiCards()}
        <div class="bottom-row">
          ${this._renderCalendar()}
          <div class="right-col">
            ${this._renderReplenishmentList()}
            ${this._renderNotices()}
          </div>
        </div>
      </div>
    `
  }

  /** 페이지 활성화 시 데이터 로드 */
  async pageUpdated(changes, lifecycle) {
    if (this.active) {
      await this._fetchAll()
    }
  }

  /** 전체 데이터 조회 */
  async _fetchAll() {
    await Promise.all([this._fetchSummary(), this._fetchCalEvents(), this._fetchReplenList(), this._fetchNotices()])
  }

  /** KPI 요약 데이터 조회 */
  async _fetchSummary() {
    try {
      const data = await ServiceUtil.restGet('inbound_dashboard/summary')
      this._summary = data || {}
    } catch {
      this._summary = {}
    }
  }

  /** 캘린더 이벤트 조회 */
  async _fetchCalEvents() {
    try {
      const data = await ServiceUtil.restGet(
        `inbound_dashboard/calendar-events?year=${this._calYear}&month=${this._calMonth + 1}`
      )
      this._calEvents = data || []
    } catch {
      this._calEvents = []
    }
  }

  /** 입고 권고 리스트 조회 */
  async _fetchReplenList() {
    try {
      const data = await ServiceUtil.restGet('inbound_dashboard/replenishment-list')
      this._replenList = data || []
    } catch {
      this._replenList = []
    }
  }

  /** 공지사항 조회 */
  async _fetchNotices() {
    try {
      const data = await ServiceUtil.restGet('inbound_dashboard/notices')
      this._notices = data || []
    } catch {
      this._notices = []
    }
  }

  /** 상단 유틸 바 (날짜 + 액션 버튼) */
  _renderUtilBar() {
    const now = new Date()
    const dow = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()]
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} (${dow})`
    return html`
      <div class="page-util-bar">
        <span class="util-date">📅 ${dateStr}</span>
        <button class="btn btn-outline" @click="${this._fetchAll}">🔍 새로고침</button>
        <button class="btn btn-outline" @click="${this._openImportPopup}">📥 주문 임포트</button>
        <button class="btn btn-outline" @click="${() => this._navigateTo('receivings')}">📝 입고 현황</button>
        <button class="btn btn-outline" @click="${() => this._navigateTo('inventories')}">📦 재고 조회</button>
      </div>
    `
  }

  /** KPI 카드 6개 렌더링 */
  _renderKpiCards() {
    const s = this._summary
    const fmt = v => Number(v || 0).toLocaleString()
    return html`
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon blue">📦</div>
          <div class="kpi-body">
            <div class="kpi-label">오늘 입고 예정</div>
            <div class="kpi-value">${fmt(s.today_count)}<span class="unit"> 건</span></div>
            <div class="kpi-sub">예정 수량 ${fmt(s.today_qty)} EA</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon green">✅</div>
          <div class="kpi-body">
            <div class="kpi-label">입고 완료율</div>
            <div class="kpi-value">${s.completion_rate || 0}<span class="unit"> %</span></div>
            <div class="kpi-sub">이번 달 누적 기준</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon red">🚨</div>
          <div class="kpi-body">
            <div class="kpi-label">긴급 입고 건수</div>
            <div class="kpi-value">${fmt(s.urgent_count)}<span class="unit"> 건</span></div>
            <div class="kpi-sub">예정 수량 ${fmt(s.urgent_qty)} EA</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon purple">🚚</div>
          <div class="kpi-body">
            <div class="kpi-label">입고 지연 건수</div>
            <div class="kpi-value">${fmt(s.delayed_count)}<span class="unit"> 건</span></div>
            <div class="kpi-sub">지연 수량 ${fmt(s.delayed_qty)} EA</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon orange">⚠️</div>
          <div class="kpi-body">
            <div class="kpi-label">안전재고 미달</div>
            <div class="kpi-value">${fmt(s.safety_shortage_count)}<span class="unit"> 개</span></div>
            <div class="kpi-sub">SKU 기준</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon blue">📊</div>
          <div class="kpi-body">
            <div class="kpi-label">입고 예정 수량 (이번 주)</div>
            <div class="kpi-value">${fmt(s.weekly_qty)}<span class="unit"> EA</span></div>
            <div class="kpi-sub">${s.weekly_start || ''} ~ ${s.weekly_end || ''} 기준</div>
          </div>
        </div>
      </div>
    `
  }

  /** 월간 입고 캘린더 렌더링 */
  _renderCalendar() {
    const cells = this._buildCalendarCells()
    const monthLabel = `${this._calYear}년 ${this._calMonth + 1}월`
    return html`
      <div class="panel">
        <!-- 패널 헤더: 제목 + 범례 + 오늘 버튼 -->
        <div class="panel-header">
          <span class="panel-title">월간 입고 캘린더</span>
          <div class="legend-wrap">
            <span class="legend-item"><span class="legend-dot normal"></span>일반 입고</span>
            <span class="legend-item"><span class="legend-dot urgent"></span>긴급 입고</span>
            <span class="legend-item"><span class="legend-dot done"></span>입고 완료</span>
            <span class="legend-item"><span class="legend-dot delay"></span>지연/이슈</span>
          </div>
          <button class="today-btn" @click="${this._goToday}">오늘</button>
        </div>

        <!-- 월 이동 네비게이션 -->
        <div class="cal-nav">
          <button class="nav-btn" @click="${this._prevMonth}">&#8249;</button>
          <span class="cal-month-label">${monthLabel}</span>
          <button class="nav-btn" @click="${this._nextMonth}">&#8250;</button>
        </div>

        <!-- 캘린더 그리드 -->
        <div class="cal-grid">
          ${DAY_LABELS.map(
      (d, i) => html`
              <div class="cal-day-header ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>
            `
    )}
          ${cells.map(cell => this._renderCalCell(cell))}
        </div>
      </div>
    `
  }

  /** 캘린더 셀 하나 렌더링 */
  _renderCalCell(cell) {
    if (!cell) return html`<div class="cal-cell empty"></div>`

    const { day, isToday, dow, events } = cell
    const numClass = dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''
    return html`
      <div class="cal-cell ${isToday ? 'today' : ''}">
        <div class="cal-num-wrap">
          <span class="cal-num ${numClass}">${day}</span>
        </div>
        ${events.map(
      ev => html`
            <div class="cal-event ${ev.event_type?.toLowerCase() || 'normal'}" title="${ev.event_label}">
              ${ev.event_label}${ev.event_qty ? html` <br />${Number(ev.event_qty).toLocaleString()} EA` : ''}
            </div>
          `
    )}
      </div>
    `
  }

  /** 캘린더 셀 배열 생성 (선행 빈칸 포함) */
  _buildCalendarCells() {
    const now = new Date()
    const today = toDateStr(now.getFullYear(), now.getMonth(), now.getDate())
    const year = this._calYear
    const month = this._calMonth
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(year, month, d)
      const dow = (firstDow + d - 1) % 7
      cells.push({
        day: d,
        dateStr,
        isToday: dateStr === today,
        dow,
        events: this._getEventsForDay(dateStr)
      })
    }
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  /** 특정 날짜의 캘린더 이벤트 필터링 */
  _getEventsForDay(dateStr) {
    return (this._calEvents || []).filter(ev => ev.event_date === dateStr)
  }

  /** 입고 권고 리스트 렌더링 */
  _renderReplenishmentList() {
    const list = this._replenList || []
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title red">입고 권고 리스트</span>
          ${list.length > 0 ? html`<span class="badge">${list.length}건</span>` : ''}
          <a class="more-link" @click="${() => UiUtil.pageNavigate('inventories')}">더보기 &rsaquo;</a>
        </div>
        <div class="repl-table-wrap">
          ${list.length === 0
        ? html`<div class="empty-msg">권고 항목이 없습니다.</div>`
        : html`
                <table class="repl-table">
                  <thead>
                    <tr>
                      <th>${TermsUtil.tLabel('sku_nm')}</th>
                      <th>${TermsUtil.tLabel('current_qty')}</th>
                      <th>${TermsUtil.tLabel('safety_qty')}</th>
                      <th>권고수량</th>
                      <th>예상 품절일</th>
                      <th>권고 사유</th>
                      <th>${TermsUtil.tLabel('remarks')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list.map(
          row => html`
                        <tr>
                          <td>${row.sku_nm}</td>
                          <td class="num">${Number(row.current_qty || 0).toLocaleString()} EA</td>
                          <td class="num">${Number(row.safety_qty || 0).toLocaleString()} EA</td>
                          <td class="num">${Number(row.recommended_qty || 0).toLocaleString()} EA</td>
                          <td>${row.expected_shortage_date || '-'}</td>
                          <td>${row.reason || '-'}</td>
                          <td>${row.remarks || '-'}</td>
                        </tr>
                      `
        )}
                  </tbody>
                </table>
              `}
        </div>
      </div>
    `
  }

  /** 공지사항 렌더링 */
  _renderNotices() {
    const list = this._notices || []
    const badgeClass = type => {
      if (type === 'URGENT') return 'urgent'
      if (type === 'INFO') return 'info'
      return 'normal'
    }
    const badgeLabel = type => {
      if (type === 'URGENT') return '긴급'
      if (type === 'INFO') return '안내'
      return '일반'
    }
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">공지사항</span>
          <a class="more-link">더보기 &rsaquo;</a>
        </div>
        ${list.length === 0
          ? html`<div class="empty-msg">공지사항이 없습니다.</div>`
          : html`
              <div class="notice-list">
                ${list.map(
                  item => html`
                    <div class="notice-item">
                      <span class="notice-badge ${badgeClass(item.notice_type)}">${badgeLabel(item.notice_type)}</span>
                      <span class="notice-title">${item.notice_title}</span>
                      <span class="notice-date">${item.notice_date || ''}</span>
                    </div>
                  `
                )}
              </div>
            `}
      </div>
    `
  }

  /** 이전 월로 이동 */
  _prevMonth() {
    if (this._calMonth === 0) {
      this._calYear -= 1
      this._calMonth = 11
    } else {
      this._calMonth -= 1
    }
    this._fetchCalEvents()
  }

  /** 다음 월로 이동 */
  _nextMonth() {
    if (this._calMonth === 11) {
      this._calYear += 1
      this._calMonth = 0
    } else {
      this._calMonth += 1
    }
    this._fetchCalEvents()
  }

  /** 오늘 달로 이동 */
  _goToday() {
    const now = new Date()
    this._calYear = now.getFullYear()
    this._calMonth = now.getMonth()
    this._fetchCalEvents()
  }

  /** 입고 주문 임포트 팝업 열기 */
  _openImportPopup() {
    openPopup(
      html`<receiving-order-import-popup
        @import-completed="${() => this._fetchAll()}"
      ></receiving-order-import-popup>`,
      { backdrop: true, size: 'large', title: '입고 주문 임포트' }
    )
  }

  /** 지정 페이지로 이동 */
  _navigateTo(page, filter) {
    UiUtil.pageNavigate(page, filter || {})
  }
}

window.customElements.define('inbound-dashboard', InboundDashboard)
