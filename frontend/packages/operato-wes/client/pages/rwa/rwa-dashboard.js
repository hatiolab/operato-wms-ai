import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

import './rwa-order-new'

/**
 * 반품(RWA) 대시보드 화면
 *
 * KPI 요약, 반품 처리 프로세스 현황, 재고 현황(도넛), 상세 현황,
 * 일별 추이 차트, 재고 추이 차트, 최근 알림을 표시한다.
 */
class RwaDashboard extends localize(i18next)(PageView) {
  /** 컴포넌트 스타일 */
  static get styles() {
    return [
      css`
        :host {
          display: block;
          background-color: var(--md-sys-color-background, #f5f5f5);
          padding: var(--padding-wide, 20px);
          overflow: auto;
        }

        /* 공통 패널 */
        .panel {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          padding: 20px;
        }

        .panel-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #1a1a1a);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-title .sub {
          font-size: 12px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-left: 6px;
        }

        /* ── 페이지 헤더 ── */
        .page-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-bottom: 14px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          padding: 7px 14px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-outline {
          background: transparent;
          color: var(--md-sys-color-primary, #1976D2);
          border: 1px solid var(--md-sys-color-primary, #1976D2);
        }

        .btn-outline:hover {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        /* ── KPI 카드 행 ── */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .kpi-card {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 3px solid transparent;
        }

        .kpi-card.rcv       { border-top-color: #1976D2; }
        .kpi-card.insp-prog { border-top-color: #7B1FA2; }
        .kpi-card.insp-done { border-top-color: #388E3C; }
        .kpi-card.good      { border-top-color: #0097A7; }
        .kpi-card.defect    { border-top-color: #F57C00; }
        .kpi-card.shipped   { border-top-color: #C62828; }
        .kpi-card.rate      { border-top-color: #546E7A; }

        .kpi-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #444);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kpi-label .period {
          font-size: 10px;
          font-weight: 400;
          background: var(--md-sys-color-surface-variant, #f0f0f0);
          border-radius: 4px;
          padding: 1px 5px;
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        /* 아이콘 + 숫자 가로 배치 */
        .kpi-body {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .kpi-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .kpi-icon.rcv       { background: #E3F2FD; }
        .kpi-icon.insp-prog { background: #F3E5F5; }
        .kpi-icon.insp-done { background: #E8F5E9; }
        .kpi-icon.good      { background: #E0F7FA; }
        .kpi-icon.defect    { background: #FFF3E0; }
        .kpi-icon.shipped   { background: #FFEBEE; }
        .kpi-icon.rate      { background: #ECEFF1; }

        .kpi-value {
          font-size: 24px;
          font-weight: 800;
          color: var(--md-sys-color-on-surface, #1a1a1a);
          line-height: 1;
        }

        .kpi-value .unit {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant, #888);
          margin-left: 2px;
        }

        .kpi-trend {
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .kpi-trend.up   { color: #D32F2F; }
        .kpi-trend.down { color: #1565C0; }

        /* ── 중단 3분할 ── */
        .mid-row {
          display: grid;
          grid-template-columns: 5fr 3fr 3fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        /* ── 프로세스 플로우 ── */
        .process-flow {
          display: flex;
          align-items: flex-start;
          gap: 0;
        }

        .process-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .step-icon-wrap {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .step-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid var(--md-sys-color-outline-variant, #ddd);
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          margin: 0 auto;
        }

        .step-arrow {
          flex: 1;
          height: 2px;
          background: var(--md-sys-color-outline-variant, #ddd);
          margin: 0 -1px;
          align-self: center;
          margin-top: 0;
        }

        .step-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-top: 8px;
          text-align: center;
          white-space: nowrap;
        }

        .step-current {
          font-size: 16px;
          font-weight: 800;
          color: var(--md-sys-color-on-surface, #222);
          text-align: center;
        }

        .step-current .unit { font-size: 11px; font-weight: 400; }

        .step-prev {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #999);
          text-align: center;
        }

        .process-rates {
          display: flex;
          margin-top: 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #eee);
          padding-top: 10px;
        }

        .rate-cell {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .rate-label {
          font-size: 10px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .rate-bar-wrap {
          width: 80%;
          height: 6px;
          background: var(--md-sys-color-outline-variant, #eee);
          border-radius: 3px;
          overflow: hidden;
        }

        .rate-bar {
          height: 100%;
          background: #1976D2;
          border-radius: 3px;
          transition: width 0.6s ease;
        }

        .rate-pct {
          font-size: 11px;
          font-weight: 600;
          color: #1976D2;
        }

        /* ── 도넛 차트 ── */
        .donut-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .donut-svg-wrap {
          position: relative;
          width: 160px;
          height: 160px;
          flex-shrink: 0;
        }

        .donut-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .donut-center-label {
          font-size: 10px;
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .donut-center-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--md-sys-color-on-surface, #222);
          line-height: 1.1;
        }

        .donut-center-unit {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #888);
        }

        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .legend-label { flex: 1; color: var(--md-sys-color-on-surface-variant, #666); }
        .legend-value { font-weight: 700; color: var(--md-sys-color-on-surface, #222); }
        .legend-pct   { color: var(--md-sys-color-on-surface-variant, #888); font-size: 11px; min-width: 40px; text-align: right; }

        /* ── 재고 상세 테이블 ── */
        .detail-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .detail-table th {
          padding: 8px 10px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          border-bottom: 2px solid var(--md-sys-color-outline-variant, #eee);
          text-align: left;
        }

        .detail-table th.right, .detail-table td.right { text-align: right; }

        .detail-table td {
          padding: 7px 10px;
          color: var(--md-sys-color-on-surface-variant, #555);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f5f5f5);
        }

        .detail-table td.sub { padding-left: 20px; color: #999; }

        .detail-table tr.total-row td {
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          background: var(--md-sys-color-surface-variant, #fafafa);
        }

        .detail-table td.good-pct  { color: #388E3C; font-weight: 700; }
        .detail-table td.defect-pct { color: #D32F2F; font-weight: 700; }

        .detail-note {
          margin-top: 10px;
          background: #E3F2FD;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 11px;
          color: #1565C0;
          line-height: 1.5;
        }

        /* ── 하단 3분할 ── */
        .bottom-row {
          display: grid;
          grid-template-columns: 5fr 5fr 4fr;
          gap: 16px;
        }

        /* ── 기간 토글 버튼 ── */
        .period-btns {
          display: flex;
          gap: 4px;
        }

        .period-btn {
          padding: 3px 10px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface-variant);
          transition: all 0.2s;
        }

        .period-btn.active {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
          border-color: var(--md-sys-color-primary, #1976D2);
          font-weight: 600;
        }

        /* ── SVG 차트 공통 ── */
        .chart-wrap {
          width: 100%;
          height: 220px;
          position: relative;
        }

        .chart-wrap svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .chart-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }

        .chart-legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .legend-line {
          width: 20px;
          height: 3px;
          border-radius: 2px;
        }

        .legend-bar {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        /* ── 알림 ── */
        .alert-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alert-item {
          display: flex;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-variant, #fafafa);
        }

        .alert-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .alert-icon.DANGER  { background: #FFEBEE; }
        .alert-icon.INFO    { background: #E3F2FD; }
        .alert-icon.SUCCESS { background: #E8F5E9; }
        .alert-icon.WARNING { background: #FFF3E0; }

        .alert-body { flex: 1; min-width: 0; }

        .alert-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
        }

        .alert-msg {
          font-size: 11px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .alert-time {
          font-size: 10px;
          color: var(--md-sys-color-on-surface-variant, #aaa);
          flex-shrink: 0;
          align-self: flex-start;
          white-space: nowrap;
        }

        .more-link {
          font-size: 12px;
          color: var(--md-sys-color-primary, #1976D2);
          cursor: pointer;
          text-decoration: none;
        }
      `
    ]
  }

  /** 페이지 속성 */
  static get properties() {
    return {
      _summary: { type: Object },
      _process: { type: Array },
      _stockStatus: { type: Object },
      _stockDetail: { type: Object },
      _dailyTrend: { type: Array },
      _stockTrend: { type: Array },
      _alerts: { type: Array },
      _dailyDays: { type: Number },
      _stockDays: { type: Number }
    }
  }

  constructor() {
    super()
    this._summary = {}
    this._process = []
    this._stockStatus = {}
    this._stockDetail = { defect_types: [] }
    this._dailyTrend = []
    this._stockTrend = []
    this._alerts = []
    this._dailyDays = 7
    this._stockDays = 7
  }

  get context() {
    return { title: TermsUtil.tMenu('RwaHome', '반품 대시보드') }
  }

  /** 페이지 활성화 시 데이터 로드 */
  async pageUpdated(changes, lifecycle) {
    if (this.active) {
      await this._fetchAll()
    }
  }

  /** 전체 데이터 병렬 로드 */
  async _fetchAll() {
    await Promise.all([
      this._fetch('rwa_dashboard/summary', '_summary', {}),
      this._fetch('rwa_dashboard/process', '_process', []),
      this._fetch('rwa_dashboard/stock-status', '_stockStatus', {}),
      this._fetch('rwa_dashboard/stock-detail', '_stockDetail', { defect_types: [] }),
      this._fetchTrend('daily', this._dailyDays),
      this._fetchTrend('stock', this._stockDays),
      this._fetch('rwa_dashboard/alerts', '_alerts', [])
    ])
  }

  /** 단일 API fetch 헬퍼 */
  async _fetch(endpoint, prop, fallback) {
    try {
      const res = await ServiceUtil.restGet(endpoint)
      this[prop] = res || fallback
    } catch (e) {
      console.error(`${endpoint} 조회 실패`, e)
      this[prop] = fallback
    }
  }

  /** 추이 fetch */
  async _fetchTrend(type, days) {
    try {
      const res = await ServiceUtil.restGet(`rwa_dashboard/${type}-trend`, { days })
      if (type === 'daily') this._dailyTrend = res || []
      else this._stockTrend = res || []
    } catch (e) {
      if (type === 'daily') this._dailyTrend = []
      else this._stockTrend = []
    }
  }

  /** 기간 변경 핸들러 */
  async _onDailyPeriod(days) {
    this._dailyDays = days
    await this._fetchTrend('daily', days)
  }

  async _onStockPeriod(days) {
    this._stockDays = days
    await this._fetchTrend('stock', days)
  }

  /** 페이지 이동 */
  _navigateTo(page, filter) {
    UiUtil.pageNavigate(page, { filter })
  }

  /** 반품 요청 팝업 열기 */
  _openRwaOrderNew() {
    UiUtil.openPopupByElement('rwa-order-new', {})
  }

  // ──────────────────────────────────── 포맷 헬퍼 ────────────────────────────────────

  _fmt(val) {
    if (val === undefined || val === null) return '0'
    return Number(val).toLocaleString()
  }

  _renderTrend(rate, unit = '%') {
    if (!rate && rate !== 0) return html`<span class="kpi-trend">-</span>`
    const up = rate > 0
    return html`<span class="kpi-trend ${up ? 'up' : 'down'}">
      전일대비 ${up ? '▲' : '▼'}${Math.abs(rate)}${unit}
    </span>`
  }

  // ──────────────────────────────────── 도넛 차트 ────────────────────────────────────

  _renderDonut(good, defect, total) {
    const r = 58, cx = 80, cy = 80
    const circ = 2 * Math.PI * r

    const goodPct = total > 0 ? good / total : 0
    const goodFill = goodPct * circ
    const defectFill = (1 - goodPct) * circ

    return html`
      <svg viewBox="0 0 160 160">
        <!-- 불량 (빨강, 기본 배경) -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
          stroke="#EF5350" stroke-width="22" />
        <!-- 가용 (초록) -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
          stroke="#43A047" stroke-width="22"
          stroke-dasharray="${goodFill} ${circ}"
          stroke-dashoffset="0"
          transform="rotate(-90 ${cx} ${cy})" />
      </svg>
      <div class="donut-center">
        <div class="donut-center-label">총 재고</div>
        <div class="donut-center-value">${this._fmt(total)}</div>
        <div class="donut-center-unit">건</div>
      </div>
    `
  }

  // ──────────────────────────────────── 바 + 라인 차트 ────────────────────────────────────

  _renderDailyChart(data) {
    if (!data || data.length === 0) {
      return html`<div style="text-align:center;padding:80px 0;color:#aaa;font-size:13px;">데이터 없음</div>`
    }

    const W = 480, H = 200
    const padL = 36, padR = 36, padT = 12, padB = 30
    const chartW = W - padL - padR
    const chartH = H - padT - padB
    const n = data.length

    const maxRcv = Math.max(...data.map(d => Number(d.rcv_count) || 0), 1)
    const maxRate = 100

    const barW = Math.max(8, (chartW / n) * 0.35)
    const gap = chartW / n

    const toX = i => padL + i * gap + gap / 2
    const toY = (v, max) => padT + chartH - (v / max) * chartH
    const toYr = v => padT + chartH - (v / maxRate) * chartH

    // 바 그룹
    const bars = data.map((d, i) => {
      const x = toX(i)
      const rcv = Number(d.rcv_count) || 0
      const ship = Number(d.ship_count) || 0
      const hRcv = (rcv / maxRcv) * chartH
      const hShip = (ship / maxRcv) * chartH
      return html`
        <rect x="${x - barW - 1}" y="${padT + chartH - hRcv}" width="${barW}" height="${hRcv}"
          fill="#1976D2" rx="2" opacity="0.85" />
        <rect x="${x + 1}" y="${padT + chartH - hShip}" width="${barW}" height="${hShip}"
          fill="#43A047" rx="2" opacity="0.85" />
      `
    })

    // 검수완료 라인
    const inspPoints = data
      .map((d, i) => `${toX(i)},${toY(Number(d.insp_count) || 0, maxRcv)}`)
      .join(' ')

    // 처리율 라인
    const ratePoints = data
      .map((d, i) => `${toX(i)},${toYr(Number(d.process_rate) || 0)}`)
      .join(' ')

    // X 레이블
    const xlabels = data.map((d, i) => {
      const label = (d.date || '').slice(5) // MM-DD
      return html`<text x="${toX(i)}" y="${H - 2}" text-anchor="middle" font-size="10" fill="#aaa">${label}</text>`
    })

    // Y 레이블 (왼쪽)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const v = Math.round(maxRcv * t)
      const y = toY(v, maxRcv)
      return html`
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#f0f0f0" stroke-width="1" />
        <text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="9" fill="#ccc">${v}</text>
      `
    })

    // Y 레이블 (오른쪽 - 처리율%)
    const yTicksR = [0, 25, 50, 75, 100].map(v => {
      const y = toYr(v)
      return html`<text x="${W - padR + 4}" y="${y + 4}" text-anchor="start" font-size="9" fill="#FF9800">${v}%</text>`
    })

    return html`
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${yTicks}
        ${yTicksR}
        ${bars}
        <polyline points="${inspPoints}" fill="none" stroke="#7B1FA2" stroke-width="2" stroke-linejoin="round" />
        ${data.map((d, i) => html`<circle cx="${toX(i)}" cy="${toY(Number(d.insp_count) || 0, maxRcv)}" r="3" fill="#7B1FA2"/>`)}
        <polyline points="${ratePoints}" fill="none" stroke="#FF9800" stroke-width="2"
          stroke-dasharray="5,3" stroke-linejoin="round" />
        ${data.map((d, i) => html`<circle cx="${toX(i)}" cy="${toYr(Number(d.process_rate) || 0)}" r="3" fill="#FF9800"/>`)}
        ${xlabels}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#e0e0e0" stroke-width="1"/>
      </svg>
    `
  }

  // ──────────────────────────────────── 재고 추이 라인 차트 ────────────────────────────────────

  _renderStockChart(data) {
    if (!data || data.length === 0) {
      return html`<div style="text-align:center;padding:80px 0;color:#aaa;font-size:13px;">데이터 없음</div>`
    }

    const W = 480, H = 200
    const padL = 36, padR = 12, padT = 12, padB = 30
    const chartW = W - padL - padR
    const chartH = H - padT - padB
    const n = data.length

    const maxGood = Math.max(...data.map(d => Number(d.good_count) || 0), 1)
    const maxDefect = Math.max(...data.map(d => Number(d.defect_count) || 0), 1)
    const maxVal = Math.max(maxGood, maxDefect, 1)

    const toX = i => padL + (i / (n - 1 || 1)) * chartW
    const toY = v => padT + chartH - (v / maxVal) * chartH

    const goodPoints = data.map((d, i) => `${toX(i)},${toY(Number(d.good_count) || 0)}`).join(' ')
    const defectPoints = data.map((d, i) => `${toX(i)},${toY(Number(d.defect_count) || 0)}`).join(' ')

    const xlabels = data.map((d, i) => {
      if (n <= 8 || i % Math.ceil(n / 7) === 0) {
        return html`<text x="${toX(i)}" y="${H - 2}" text-anchor="middle" font-size="10" fill="#aaa">${(d.date || '').slice(5)}</text>`
      }
      return ''
    })

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const v = Math.round(maxVal * t)
      const y = toY(v)
      return html`
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#f0f0f0" stroke-width="1" />
        <text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="9" fill="#ccc">${v}</text>
      `
    })

    return html`
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${yTicks}
        <!-- 가용 재고 (초록) -->
        <polyline points="${goodPoints}" fill="none" stroke="#43A047" stroke-width="2.5" stroke-linejoin="round"/>
        ${data.map((d, i) => html`<circle cx="${toX(i)}" cy="${toY(Number(d.good_count) || 0)}" r="3.5" fill="#43A047"/>`)}
        <!-- 불량 재고 (빨강) -->
        <polyline points="${defectPoints}" fill="none" stroke="#EF5350" stroke-width="2.5" stroke-linejoin="round"/>
        ${data.map((d, i) => html`<circle cx="${toX(i)}" cy="${toY(Number(d.defect_count) || 0)}" r="3.5" fill="#EF5350"/>`)}
        ${xlabels}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#e0e0e0" stroke-width="1"/>
      </svg>
    `
  }

  // ──────────────────────────────────── Render ────────────────────────────────────

  render() {
    const s = this._summary
    const proc = this._process
    const stock = this._stockStatus
    const detail = this._stockDetail
    const alerts = this._alerts

    const goodCnt = Number(stock.good_count) || 0
    const defectCnt = Number(stock.defect_count) || 0
    const totalCnt = Number(stock.total_count) || goodCnt + defectCnt

    return html`
      <!-- ── 페이지 헤더 ── -->
      <div class="page-header">
        <div class="header-actions">
          <button class="btn btn-outline" @click="${() => this._fetchAll()}">🔍 새로고침</button>
          <button class="btn btn-outline" @click="${this._openRwaOrderNew}">📝 반품 요청</button>
          <button class="btn btn-outline" @click="${() => this._navigateTo('rwa-receive-list')}">📦 입고 처리</button>
          <button class="btn btn-outline" @click="${() => this._navigateTo('rwa-inspection-list')}">🔬 검수 작업</button>
          <button class="btn btn-outline" @click="${() => this._navigateTo('rwa-disposition-list')}">⚖️ 처분 결정</button>
        </div>
      </div>

      <!-- ── KPI 카드 ── -->
      <div class="kpi-row">
        <!-- 반품 입고 -->
        <div class="kpi-card rcv">
          <div class="kpi-label">반품 입고 <span class="period">어제</span></div>
          <div class="kpi-body">
            <div class="kpi-icon rcv">📥</div>
            <div class="kpi-value">${this._fmt(s.rcv_count)}<span class="unit">건</span></div>
          </div>
          ${this._renderTrend(s.rcv_rate)}
        </div>
        <!-- 검수 진행 -->
        <div class="kpi-card insp-prog">
          <div class="kpi-label">검수 진행 <span class="period">현재</span></div>
          <div class="kpi-body">
            <div class="kpi-icon insp-prog">🔍</div>
            <div class="kpi-value">${this._fmt(s.insp_prog_count)}<span class="unit">건</span></div>
          </div>
          ${this._renderTrend(s.insp_prog_rate)}
        </div>
        <!-- 검수 완료 -->
        <div class="kpi-card insp-done">
          <div class="kpi-label">검수 완료 <span class="period">어제</span></div>
          <div class="kpi-body">
            <div class="kpi-icon insp-done">✅</div>
            <div class="kpi-value">${this._fmt(s.insp_done_count)}<span class="unit">건</span></div>
          </div>
          ${this._renderTrend(s.insp_done_rate)}
        </div>
        <!-- 가용 재고 -->
        <div class="kpi-card good">
          <div class="kpi-label">가용 재고 <span class="period">현재</span></div>
          <div class="kpi-body">
            <div class="kpi-icon good">📦</div>
            <div class="kpi-value">${this._fmt(s.good_stock_count)}<span class="unit">건</span></div>
          </div>
          ${this._renderTrend(s.good_stock_rate)}
        </div>
        <!-- 불량 재고 -->
        <div class="kpi-card defect">
          <div class="kpi-label">불량 재고 <span class="period">현재</span></div>
          <div class="kpi-body">
            <div class="kpi-icon defect">⚠️</div>
            <div class="kpi-value">${this._fmt(s.defect_stock_count)}<span class="unit">건</span></div>
          </div>
          ${this._renderTrend(s.defect_stock_rate)}
        </div>
        <!-- 반품 출고 -->
        <div class="kpi-card shipped">
          <div class="kpi-label">반품 출고 <span class="period">어제</span></div>
          <div class="kpi-body">
            <div class="kpi-icon shipped">🚚</div>
            <div class="kpi-value">${this._fmt(s.shipped_count)}<span class="unit">건</span></div>
          </div>
          ${this._renderTrend(s.shipped_rate)}
        </div>
        <!-- 처리율 -->
        <div class="kpi-card rate">
          <div class="kpi-label">처리율 <span class="period">어제</span></div>
          <div class="kpi-body">
            <div class="kpi-icon rate">📊</div>
            <div class="kpi-value">${s.process_rate || 0}<span class="unit">%</span></div>
          </div>
          ${this._renderTrend(s.process_rate_diff, '%p')}
        </div>
      </div>

      <!-- ── 중단 3분할 ── -->
      <div class="mid-row">
        <!-- 반품 처리 프로세스 현황 -->
        <div class="panel">
          <div class="panel-title">반품 처리 프로세스 현황</div>
          <div class="process-flow">
            ${proc.map((step, idx) => html`
              <div class="process-step">
                <div class="step-icon-wrap">
                  ${idx > 0 ? html`<div class="step-arrow"></div>` : ''}
                  <div class="step-icon">
                    ${{ rcv: '📥', insp_prog: '🔍', insp_done: '✅', good: '📦', defect: '⚠️', shipped: '🚚' }[step.key] || '•'}
                  </div>
                  ${idx < proc.length - 1 ? html`<div class="step-arrow"></div>` : ''}
                </div>
                <div class="step-name">${step.label}</div>
                <div class="step-current">${this._fmt(step.current)}<span class="unit">건</span></div>
                <div class="step-prev">전일 ${this._fmt(step.prev)}건</div>
              </div>
            `)}
          </div>

          <!-- 완료율 바 -->
          <div class="process-rates">
            ${proc.map(step => html`
              <div class="rate-cell">
                ${step.rate > 0 ? html`
                  <div class="rate-label">완료율</div>
                  <div class="rate-bar-wrap">
                    <div class="rate-bar" style="width:${Math.min(step.rate, 100)}%"></div>
                  </div>
                  <div class="rate-pct">${step.rate}%</div>
                ` : html`<div class="rate-label" style="color:transparent">-</div><div class="rate-pct">-</div>`}
              </div>
            `)}
          </div>
        </div>

        <!-- 반품 재고 현황 (도넛) -->
        <div class="panel">
          <div class="panel-title">반품 재고 현황 <span class="sub">(현재)</span></div>
          <div class="donut-wrap">
            <div class="donut-svg-wrap">
              ${this._renderDonut(goodCnt, defectCnt, totalCnt)}
            </div>
            <div class="donut-legend">
              <div class="legend-item">
                <div class="legend-dot" style="background:#43A047"></div>
                <span class="legend-label">가용 재고</span>
                <span class="legend-value">${this._fmt(goodCnt)}건</span>
                <span class="legend-pct">(${stock.good_pct || 0}%)</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background:#EF5350"></div>
                <span class="legend-label">불량 재고</span>
                <span class="legend-value">${this._fmt(defectCnt)}건</span>
                <span class="legend-pct">(${stock.defect_pct || 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 반품 재고 상세 현황 -->
        <div class="panel">
          <div class="panel-title">반품 재고 상세 현황 <span class="sub">(현재)</span></div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>구분</th>
                <th class="right">건수</th>
                <th class="right">비율</th>
              </tr>
            </thead>
            <tbody>
              <tr class="total-row">
                <td>가용 재고</td>
                <td class="right">${this._fmt(detail.good_count)}건</td>
                <td class="right good-pct">${detail.good_pct || 0}%</td>
              </tr>
              <tr class="total-row">
                <td>불량 재고</td>
                <td class="right">${this._fmt(detail.defect_count)}건</td>
                <td class="right defect-pct">${detail.defect_pct || 0}%</td>
              </tr>
              ${(detail.defect_types || []).map(t => html`
                <tr>
                  <td class="sub">- ${t.label}</td>
                  <td class="right">${this._fmt(t.count)}건</td>
                  <td class="right">${t.pct}%</td>
                </tr>
              `)}
            </tbody>
          </table>
          <div class="detail-note">
            가용 재고는 정기적으로 우리 센터로 이동됩니다.<br/>
            근접 이동 예정일을 확인하시기 바랍니다.
          </div>
        </div>
      </div>

      <!-- ── 하단 3분할 ── -->
      <div class="bottom-row">
        <!-- 일별 입고·출고 추이 -->
        <div class="panel">
          <div class="panel-title">
            일별 반품 입고 및 출고 추이
            <div class="period-btns">
              <button class="period-btn ${this._dailyDays === 7 ? 'active' : ''}" @click=${() => this._onDailyPeriod(7)}>최근 7일</button>
              <button class="period-btn ${this._dailyDays === 30 ? 'active' : ''}" @click=${() => this._onDailyPeriod(30)}>최근 30일</button>
            </div>
          </div>
          <div class="chart-wrap">
            ${this._renderDailyChart(this._dailyTrend)}
          </div>
          <div class="chart-legend">
            <div class="chart-legend-item">
              <div class="legend-bar" style="background:#1976D2"></div> 입고
            </div>
            <div class="chart-legend-item">
              <div class="legend-bar" style="background:#43A047"></div> 출고
            </div>
            <div class="chart-legend-item">
              <div class="legend-line" style="background:#7B1FA2"></div> 검수 완료
            </div>
            <div class="chart-legend-item">
              <div class="legend-line" style="background:#FF9800; border-top: 2px dashed #FF9800; height:0;"></div> 처리율(%)
            </div>
          </div>
        </div>

        <!-- 반품 재고 추이 -->
        <div class="panel">
          <div class="panel-title">
            반품 재고 추이
            <div class="period-btns">
              <button class="period-btn ${this._stockDays === 7 ? 'active' : ''}" @click=${() => this._onStockPeriod(7)}>최근 7일</button>
              <button class="period-btn ${this._stockDays === 30 ? 'active' : ''}" @click=${() => this._onStockPeriod(30)}>최근 30일</button>
            </div>
          </div>
          <div class="chart-wrap">
            ${this._renderStockChart(this._stockTrend)}
          </div>
          <div class="chart-legend">
            <div class="chart-legend-item">
              <div class="legend-line" style="background:#43A047"></div> 가용 재고
            </div>
            <div class="chart-legend-item">
              <div class="legend-line" style="background:#EF5350"></div> 불량 재고
            </div>
          </div>
        </div>

        <!-- 최근 알림 -->
        <div class="panel">
          <div class="panel-title">
            최근 알림
            <span class="more-link">더보기 ›</span>
          </div>
          <div class="alert-list">
            ${alerts.length === 0
        ? html`<div style="text-align:center;padding:40px 0;color:#aaa;font-size:13px;">알림이 없습니다.</div>`
        : alerts.map(a => html`
                <div class="alert-item">
                  <div class="alert-icon ${a.type}">
                    ${{ DANGER: '🔴', INFO: 'ℹ️', SUCCESS: '✅', WARNING: '🟠' }[a.type] || '•'}
                  </div>
                  <div class="alert-body">
                    <div class="alert-title">${a.title}</div>
                    <div class="alert-msg">${a.message}</div>
                  </div>
                  <div class="alert-time">${a.time_ago}</div>
                </div>
              `)
      }
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('rwa-dashboard', RwaDashboard)
