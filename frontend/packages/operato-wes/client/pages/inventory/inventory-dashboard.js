import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato-app/metapage/dist-client'

class InventoryDashboard extends localize(i18next)(PageView) {
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
        .btn:hover { background: var(--md-sys-color-surface-variant, #f0f0f0); }
        .btn-outline {
          background: transparent;
          color: var(--md-sys-color-primary);
          border: 1px solid var(--md-sys-color-primary);
        }
        .btn-outline:hover {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }

        /* ── 공통 패널 ── */
        .panel {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .panel-icon {
          font-size: 18px;
        }
        .panel-title {
          font-size: 14px;
          font-weight: 600;
          color: #1565c0;
        }
        .panel-sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
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

        /* ── KPI 카드 행 (5장) ── */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .kpi-card {
          background: var(--md-sys-color-surface);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 14px;
          border-left: 4px solid transparent;
        }
        .kpi-card.blue   { border-left-color: #1976d2; }
        .kpi-card.green  { border-left-color: #388e3c; }
        .kpi-card.orange { border-left-color: #f57c00; }
        .kpi-card.red    { border-left-color: #d32f2f; }
        .kpi-card.purple { border-left-color: #7b1fa2; }
        .kpi-icon {
          width: 52px; height: 52px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; flex-shrink: 0;
        }
        .kpi-icon.blue   { background: #e3f2fd; }
        .kpi-icon.green  { background: #e8f5e9; }
        .kpi-icon.orange { background: #fff3e0; }
        .kpi-icon.red    { background: #ffebee; }
        .kpi-icon.purple { background: #f3e5f5; }
        .kpi-body { flex: 1; min-width: 0; }
        .kpi-label { font-size: 12px; color: var(--md-sys-color-on-surface-variant); margin-bottom: 2px; }
        .kpi-value {
          font-size: 28px; font-weight: 700;
          color: var(--md-sys-color-on-surface); line-height: 1.1;
        }
        .kpi-value .unit { font-size: 13px; font-weight: 500; color: var(--md-sys-color-on-surface-variant); }
        .kpi-sub { font-size: 11px; color: var(--md-sys-color-on-surface-variant); margin-top: 2px; }

        /* ── 2열 그리드 ── */
        .row-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
          align-items: stretch;
        }
        .row-2col .panel {
          height: 100%;
          box-sizing: border-box;
        }

        /* ── 재고 이상 감지: 5개 미니 카드 ── */
        .anomaly-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        .anomaly-card {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-radius: 10px;
          padding: 12px 8px;
          text-align: center;
        }
        .anomaly-icon { font-size: 22px; margin-bottom: 4px; }
        .anomaly-value { font-size: 22px; font-weight: 700; color: var(--md-sys-color-on-surface); }
        .anomaly-value .unit { font-size: 13px; font-weight: 400; }
        .anomaly-label { font-size: 11px; color: var(--md-sys-color-on-surface-variant); margin-top: 3px; line-height: 1.3; }
        .anomaly-sub { font-size: 10px; color: #f57c00; margin-top: 2px; }

        /* ── 입출고 흐름: 5개 항목 ── */
        .flow-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        .flow-item {
          text-align: center;
          padding: 10px 6px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          border-radius: 10px;
        }
        .flow-arrow { font-size: 26px; margin-bottom: 6px; }
        .flow-value { font-size: 18px; font-weight: 700; color: var(--md-sys-color-on-surface); }
        .flow-value .unit { font-size: 12px; font-weight: 400; }
        .flow-label { font-size: 11px; color: var(--md-sys-color-on-surface-variant); margin-top: 3px; }

        /* ── 재고 정확도 KPI ── */
        .accuracy-body {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .accuracy-pct {
          font-size: 46px;
          font-weight: 700;
          color: #1565c0;
          line-height: 1;
          flex-shrink: 0;
        }
        .accuracy-stats { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
        .acc-stat-row { display: flex; align-items: center; gap: 8px; }
        .acc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .acc-dot.blue  { background: #2196f3; }
        .acc-dot.red   { background: #f44336; }
        .acc-stat-label { font-size: 12px; color: var(--md-sys-color-on-surface-variant); }
        .acc-stat-value { font-size: 14px; font-weight: 600; color: var(--md-sys-color-on-surface); }
        .sparkline-wrap { margin-top: 14px; overflow: hidden; }
        .sparkline-wrap svg { width: 100%; height: 70px; }

        /* ── TOP 위험 SKU 패널 ── */
        .top-risk-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .top-risk-panel .risk-scroll {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        /* ── TOP 위험 SKU 테이블 ── */
        .risk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .risk-table th {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          padding: 7px 10px; text-align: left; font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }
        .risk-table td {
          padding: 7px 10px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface);
        }
        .risk-table tr:last-child td { border-bottom: none; }
        .risk-table td.num { text-align: right; }
        .risk-table td.center { text-align: center; }
        .status-badge {
          font-size: 11px; font-weight: 600; padding: 2px 7px;
          border-radius: 10px; white-space: nowrap; display: inline-block;
        }
        .status-badge.danger  { background: #ffebee; color: #b71c1c; }
        .status-badge.warning { background: #fff3e0; color: #e65100; }
        .empty-msg { text-align: center; padding: 24px; color: var(--md-sys-color-on-surface-variant); font-size: 13px; }

        /* ── 3열 그리드 ── */
        .row-3col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 16px;
          align-items: stretch;
        }
        .row-3col .panel {
          height: 100%;
          box-sizing: border-box;
        }

        /* ── 장기 재고 현황 ── */
        .longterm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .longterm-item { text-align: center; padding: 10px; background: var(--md-sys-color-surface-variant,#f5f5f5); border-radius: 8px; }
        .longterm-period { font-size: 12px; font-weight: 600; color: #f57c00; margin-bottom: 4px; }
        .longterm-qty { font-size: 16px; font-weight: 700; color: var(--md-sys-color-on-surface); }
        .longterm-qty .unit { font-size: 11px; font-weight: 400; }
        .longterm-sku { font-size: 11px; color: var(--md-sys-color-on-surface-variant); margin-top: 2px; }

        /* ── 세트/실사 미니 KPI ── */
        .mini-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .mini-kpi { text-align: center; padding: 10px; background: var(--md-sys-color-surface-variant,#f5f5f5); border-radius: 8px; }
        .mini-kpi-label { font-size: 11px; color: var(--md-sys-color-on-surface-variant); margin-bottom: 4px; }
        .mini-kpi-value { font-size: 20px; font-weight: 700; color: var(--md-sys-color-on-surface); }
        .mini-kpi-value .unit { font-size: 12px; font-weight: 400; }
        .mini-kpi-sub { font-size: 11px; color: var(--md-sys-color-on-surface-variant); margin-top: 2px; }

        /* ── 로케이션 사용률 (전체 너비) ── */
        .loc-panel { margin-bottom: 16px; }
        .loc-body {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 24px;
          align-items: start;
        }

        /* 도넛 차트 그리드 */
        .donut-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .donut-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .donut-item svg { width: 100px; height: 100px; }
        .donut-label { font-size: 12px; color: var(--md-sys-color-on-surface-variant); text-align: center; }
        .donut-sub { font-size: 11px; color: var(--md-sys-color-on-surface-variant); }

        /* 로케이션 테이블 */
        .loc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .loc-table th {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          padding: 7px 12px; text-align: left; font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          white-space: nowrap;
        }
        .loc-table td {
          padding: 7px 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }
        .loc-table tr:last-child td { border-bottom: none; }
        .loc-table td.num { text-align: right; }
        .usage-bar-wrap { display: flex; align-items: center; gap: 6px; }
        .usage-bar-bg { flex: 1; height: 6px; border-radius: 3px; background: #e0e0e0; }
        .usage-bar-fill { height: 100%; border-radius: 3px; background: #2196f3; }
        .usage-bar-pct { font-size: 12px; white-space: nowrap; }
        .loc-status { font-size: 11px; color: var(--md-sys-color-on-surface-variant); }

        /* 분석 영역 */
        .loc-analysis { display: flex; flex-direction: column; gap: 10px; min-width: 180px; }
        .loc-analysis-title { font-size: 13px; font-weight: 600; color: var(--md-sys-color-on-surface); margin-bottom: 4px; }
        .analysis-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--md-sys-color-outline-variant,#eee); }
        .analysis-row:last-child { border-bottom: none; }
        .analysis-key { color: var(--md-sys-color-on-surface-variant); }
        .analysis-val { font-weight: 600; color: var(--md-sys-color-on-surface); }

        /* ── 반응형 ── */
        @media (max-width: 1400px) {
          .kpi-row { grid-template-columns: repeat(3, 1fr); }
          .donut-grid { grid-template-columns: repeat(2, 1fr); }
          .loc-body { grid-template-columns: 1fr; }
        }
        @media (max-width: 1100px) {
          .row-2col, .row-3col { grid-template-columns: 1fr; }
          .anomaly-grid, .flow-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .kpi-row { grid-template-columns: repeat(2, 1fr); }
          .anomaly-grid, .flow-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `
    ]
  }

  /** 반응형 속성 */
  static get properties() {
    return {
      _statusCounts: Object,
      _anomaly: Object,
      _flow: Object,
      _accuracy: Object,
      _topRiskSkus: Array,
      _longTerm: Object,
      _setStock: Object,
      _auditAdj: Object,
      _locUsage: Object
    }
  }

  /** 생성자 - 초기 상태 */
  constructor() {
    super()
    this._statusCounts = {}
    this._anomaly = {}
    this._flow = {}
    this._accuracy = {}
    this._topRiskSkus = []
    this._longTerm = {}
    this._setStock = {}
    this._auditAdj = {}
    this._locUsage = { types: [], analysis: {} }
  }

  /** 페이지 컨텍스트 */
  get context() {
    return { title: TermsUtil.tMenu('InventoryDashboard') }
  }

  /** 전체 렌더링 */
  render() {
    return html`
      <div>
        ${this._renderUtilBar()}
        ${this._renderKpiRow()}
        <div class="row-2col">
          ${this._renderAnomaly()}
          ${this._renderFlow()}
        </div>
        <div class="row-3col">
          ${this._renderLongTerm()}
          ${this._renderSetStock()}
          ${this._renderAuditAdjustment()}
        </div>
        ${this._renderLocationUsage()}
        <div class="row-2col" style="margin-top:16px">
          ${this._renderAccuracy()}
          ${this._renderTopRiskSku()}
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
    await Promise.all([
      this._fetch('status-counts',     '_statusCounts', {}),
      this._fetch('anomaly',           '_anomaly',      {}),
      this._fetch('flow',              '_flow',         {}),
      this._fetch('accuracy',          '_accuracy',     {}),
      this._fetch('top-risk-sku',      '_topRiskSkus',  []),
      this._fetch('long-term',         '_longTerm',     {}),
      this._fetch('set-stock',         '_setStock',     {}),
      this._fetch('audit-adjustment',  '_auditAdj',     {}),
      this._fetch('location-usage',    '_locUsage',     { types: [], analysis: {} })
    ])
  }

  /** 공통 fetch 헬퍼 */
  async _fetch(endpoint, prop, fallback) {
    try {
      const data = await ServiceUtil.restGet(`inv_dashboard/${endpoint}`)
      this[prop] = data || fallback
    } catch {
      this[prop] = fallback
    }
  }

  /** 상단 유틸 바 */
  _renderUtilBar() {
    const now = new Date()
    const dow = ['일','월','화','수','목','금','토'][now.getDay()]
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} (${dow})`
    return html`
      <div class="page-util-bar">
        <span class="util-date">📅 ${dateStr}</span>
        <button class="btn btn-outline" @click="${this._fetchAll}">🔄 새로고침</button>
        <button class="btn btn-outline" @click="${() => UiUtil.pageNavigate('inventories')}">📦 재고 현황</button>
        <button class="btn btn-outline" @click="${() => UiUtil.pageNavigate('inventory-transaction-list')}">📋 재고 이력</button>
      </div>
    `
  }

  /** KPI 카드 5장 */
  _renderKpiRow() {
    const s = this._statusCounts
    const fmt = v => Number(v || 0).toLocaleString()
    return html`
      <div class="kpi-row">
        <div class="kpi-card blue">
          <div class="kpi-icon blue">📦</div>
          <div class="kpi-body">
            <div class="kpi-label">전체 재고</div>
            <div class="kpi-value">${fmt(s.total_qty)}<span class="unit"> EA</span></div>
            <div class="kpi-sub">SKU / ${fmt(s.total_sku)}개</div>
          </div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-icon green">✅</div>
          <div class="kpi-body">
            <div class="kpi-label">가용 재고</div>
            <div class="kpi-value">${fmt(s.available_qty)}<span class="unit"> EA</span></div>
            <div class="kpi-sub">출고 가능</div>
          </div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-icon orange">📤</div>
          <div class="kpi-body">
            <div class="kpi-label">할당 재고</div>
            <div class="kpi-value">${fmt(s.reserved_qty)}<span class="unit"> EA</span></div>
            <div class="kpi-sub">출고 예약됨</div>
          </div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-icon red">🚚</div>
          <div class="kpi-body">
            <div class="kpi-label">입고 대기</div>
            <div class="kpi-value">${fmt(s.waiting_qty)}<span class="unit"> EA</span></div>
            <div class="kpi-sub">적치 전</div>
          </div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-icon purple">⚠️</div>
          <div class="kpi-body">
            <div class="kpi-label">부족 재고</div>
            <div class="kpi-value">${fmt(s.shortage_sku)}<span class="unit"> 개</span></div>
            <div class="kpi-sub">안전 재고 이하 SKU</div>
          </div>
        </div>
      </div>
    `
  }

  /** 재고 이상 감지 패널 */
  _renderAnomaly() {
    const a = this._anomaly
    const fmt = v => Number(v || 0).toLocaleString()
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-icon">⚠️</span>
          <span class="panel-title">재고 이상 감지</span>
        </div>
        <div class="anomaly-grid">
          <div class="anomaly-card">
            <div class="anomaly-icon">📊</div>
            <div class="anomaly-value">${fmt(a.diff_sku_count)}<span class="unit">개</span></div>
            <div class="anomaly-label">재고 차이 SKU</div>
          </div>
          <div class="anomaly-card">
            <div class="anomaly-icon">➖</div>
            <div class="anomaly-value">${fmt(a.negative_sku_count)}<span class="unit">개</span></div>
            <div class="anomaly-label">음수 재고</div>
          </div>
          <div class="anomaly-card">
            <div class="anomaly-icon">🕐</div>
            <div class="anomaly-value">${fmt(a.long_term_count)}<span class="unit">개</span></div>
            <div class="anomaly-label">장기 미출고</div>
            <div class="anomaly-sub">90일 이상</div>
          </div>
          <div class="anomaly-card">
            <div class="anomaly-icon">🔧</div>
            <div class="anomaly-value">${fmt(a.daily_adjust_count)}<span class="unit">건</span></div>
            <div class="anomaly-label">당일 조정 건수</div>
          </div>
          <div class="anomaly-card">
            <div class="anomaly-icon">📦</div>
            <div class="anomaly-value">${fmt(a.set_mismatch_count)}<span class="unit">건</span></div>
            <div class="anomaly-label">세트 불일치</div>
          </div>
        </div>
      </div>
    `
  }

  /** 입출고 흐름 패널 */
  _renderFlow() {
    const f = this._flow
    const fmt = v => Number(v || 0).toLocaleString()
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-icon">🔄</span>
          <span class="panel-title">입출고 흐름</span>
          <span class="panel-sub">(오늘 기준)</span>
        </div>
        <div class="flow-grid">
          <div class="flow-item">
            <div class="flow-arrow" style="color:#1976d2">⬇</div>
            <div class="flow-value">${fmt(f.inbound_qty)}<span class="unit"> EA</span></div>
            <div class="flow-label">입고</div>
          </div>
          <div class="flow-item">
            <div class="flow-arrow" style="color:#388e3c">⬆</div>
            <div class="flow-value">${fmt(f.outbound_qty)}<span class="unit"> EA</span></div>
            <div class="flow-label">출고</div>
          </div>
          <div class="flow-item">
            <div class="flow-arrow" style="color:#f57c00">↩</div>
            <div class="flow-value">${fmt(f.return_qty)}<span class="unit"> EA</span></div>
            <div class="flow-label">반품</div>
          </div>
          <div class="flow-item">
            <div class="flow-arrow" style="color:#1565c0">⇄</div>
            <div class="flow-value">${fmt(f.adjust_qty)}<span class="unit"> EA</span></div>
            <div class="flow-label">조정 입출고</div>
          </div>
          <div class="flow-item">
            <div class="flow-arrow" style="color:#616161">✂</div>
            <div class="flow-value">${fmt(f.split_qty)}<span class="unit"> EA</span></div>
            <div class="flow-label">세트 해제</div>
          </div>
        </div>
      </div>
    `
  }

  /** 재고 정확도 KPI 패널 */
  _renderAccuracy() {
    const a = this._accuracy
    const rate = Number(a.accuracy_rate || 0).toFixed(1)
    const counted = Number(a.counted_sku || 0).toLocaleString()
    const diff = Number(a.diff_sku || 0).toLocaleString()
    const diffRate = Number(a.diff_rate || 0).toFixed(1)
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-icon">🎯</span>
          <span class="panel-title">재고 정확도 KPI</span>
        </div>
        <div class="accuracy-body">
          <div class="accuracy-pct">${rate}%</div>
          <div class="accuracy-stats">
            <div class="acc-stat-row">
              <span class="acc-dot blue"></span>
              <span class="acc-stat-label">실사 완료 SKU</span>
              <span class="acc-stat-value">${counted}개</span>
            </div>
            <div class="acc-stat-row">
              <span class="acc-dot red"></span>
              <span class="acc-stat-label">차이 SKU</span>
              <span class="acc-stat-value">${diff}개, ${diffRate}%</span>
            </div>
          </div>
        </div>
        <div class="sparkline-wrap">
          ${this._renderSparkline()}
        </div>
      </div>
    `
  }

  /** 재고 정확도 스파크라인 SVG */
  _renderSparkline() {
    const w = 300, h = 60, padX = 10, padY = 8
    const points = [98.5, 99.0, 98.8, 99.2, 99.0, 99.1, 99.2]
    const labels = ['5/27','5/28','5/29','5/30','5/31','6/1','6/2']
    const min = Math.min(...points) - 0.5, max = 100
    const range = max - min
    const pts = points.map((v, i) => {
      const x = padX + (i / (points.length - 1)) * (w - 2 * padX)
      const y = h - padY - ((v - min) / range) * (h - 2 * padY)
      return `${x},${y}`
    }).join(' ')
    const labelEls = labels.map((lbl, i) => {
      const x = padX + (i / (labels.length - 1)) * (w - 2 * padX)
      return `<text x="${x}" y="${h + 14}" text-anchor="middle" font-size="9" fill="#999">${lbl}</text>`
    }).join('')
    return html`
      <svg viewBox="0 0 ${w} ${h + 18}" preserveAspectRatio="none" style="width:100%;height:auto;">
        <polyline points="${pts}" fill="none" stroke="#2196f3" stroke-width="1.8" stroke-linejoin="round"/>
        ${points.map((v, i) => {
          const x = padX + (i / (points.length - 1)) * (w - 2 * padX)
          const y = h - padY - ((v - min) / range) * (h - 2 * padY)
          return html`<circle cx="${x}" cy="${y}" r="2.5" fill="#2196f3"/>`
        })}
        ${labelEls}
      </svg>
    `
  }

  /** TOP 위험 SKU 패널 */
  _renderTopRiskSku() {
    const list = this._topRiskSkus || []
    return html`
      <div class="panel top-risk-panel">
        <div class="panel-header">
          <span class="panel-icon">⚠️</span>
          <span class="panel-title">TOP 위험 SKU</span>
          <a class="more-link" @click="${() => UiUtil.pageNavigate('inventories')}">더보기 &rsaquo;</a>
        </div>
        <div class="risk-scroll">
          ${list.length === 0
            ? html`<div class="empty-msg">위험 SKU가 없습니다.</div>`
            : html`
                <table class="risk-table">
                  <thead>
                    <tr>
                      <th style="width:36px">순위</th>
                      <th>상품명</th>
                      <th>현재 재고</th>
                      <th>안전 재고</th>
                      <th>상태</th>
                      <th>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list.map(row => html`
                      <tr>
                        <td class="center">${row.rank}</td>
                        <td>${row.sku_nm || row.sku_cd}</td>
                        <td class="num">${Number(row.current_qty || 0).toLocaleString()} EA</td>
                        <td class="num">${Number(row.safety_stock || 0).toLocaleString()} EA</td>
                        <td class="center">
                          <span class="status-badge ${row.status === '품절 위험' ? 'danger' : 'warning'}">
                            ${row.status === '품절 위험' ? '🚫 품절 위험' : '⚠ 안전재고 미달'}
                          </span>
                        </td>
                        <td>${row.remarks || '-'}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              `}
        </div>
      </div>
    `
  }

  /** 장기 재고 현황 패널 */
  _renderLongTerm() {
    const lt = this._longTerm
    const fmt = v => Number(v || 0).toLocaleString()
    const days = [
      { key: 'days_30',  label: '30일 이상' },
      { key: 'days_90',  label: '90일 이상' },
      { key: 'days_180', label: '180일 이상' }
    ]
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-icon">🕐</span>
          <span class="panel-title">장기 재고 현황</span>
          <span class="panel-sub">(미출고 기준)</span>
        </div>
        <div class="longterm-grid">
          ${days.map(d => {
            const item = lt[d.key] || {}
            return html`
              <div class="longterm-item">
                <div class="longterm-period">${d.label}</div>
                <div class="longterm-qty">${fmt(item.qty)}<span class="unit"> EA</span></div>
                <div class="longterm-sku">${fmt(item.sku_count)} SKU</div>
              </div>
            `
          })}
        </div>
      </div>
    `
  }

  /** 세트 재고 현황 패널 */
  _renderSetStock() {
    const s = this._setStock
    const fmt = v => Number(v || 0).toLocaleString()
    const items = [
      { label: '세트 SKU',     value: fmt(s.set_sku),          unit: '개' },
      { label: '세트 해제 예정', value: fmt(s.set_release_plan), unit: '건' },
      { label: '세트 불일치',   value: fmt(s.set_mismatch),     unit: '건' },
      { label: '날개 전환 예정', value: fmt(s.kit_convert_plan), unit: '건' }
    ]
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-icon">📦</span>
          <span class="panel-title">세트 재고 현황</span>
        </div>
        <div class="mini-kpi-grid">
          ${items.map(it => html`
            <div class="mini-kpi">
              <div class="mini-kpi-label">${it.label}</div>
              <div class="mini-kpi-value">${it.value}<span class="unit"> ${it.unit}</span></div>
            </div>
          `)}
        </div>
      </div>
    `
  }

  /** 실사/조정 현황 패널 */
  _renderAuditAdjustment() {
    const a = this._auditAdj
    const fmt = v => Number(v || 0).toLocaleString()
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-icon">📋</span>
          <span class="panel-title">실사 / 조정 현황</span>
          <span class="panel-sub">(이번 달)</span>
        </div>
        <div class="mini-kpi-grid">
          <div class="mini-kpi">
            <div class="mini-kpi-label">실사 건수</div>
            <div class="mini-kpi-value">${fmt(a.audit_count)}<span class="unit"> 건</span></div>
          </div>
          <div class="mini-kpi">
            <div class="mini-kpi-label">조정 입고</div>
            <div class="mini-kpi-value">${fmt(a.adjust_in_count)}<span class="unit"> 건</span></div>
            <div class="mini-kpi-sub">${fmt(a.adjust_in_qty)} EA</div>
          </div>
          <div class="mini-kpi">
            <div class="mini-kpi-label">조정 출고</div>
            <div class="mini-kpi-value">${fmt(a.adjust_out_count)}<span class="unit"> 건</span></div>
            <div class="mini-kpi-sub">${fmt(a.adjust_out_qty)} EA</div>
          </div>
          <div class="mini-kpi">
            <div class="mini-kpi-label">미확정 차이</div>
            <div class="mini-kpi-value">${fmt(a.pending_diff_count)}<span class="unit"> 건</span></div>
            <div class="mini-kpi-sub">${fmt(a.pending_diff_qty)} EA</div>
          </div>
        </div>
      </div>
    `
  }

  /** 로케이션 사용률 현황 패널 */
  _renderLocationUsage() {
    const loc = this._locUsage || { types: [], analysis: {} }
    const types = loc.types || []
    const analysis = loc.analysis || {}
    const fmt = v => Number(v || 0).toLocaleString()

    const colors = { '보관': '#2196f3', '피킹': '#4caf50', '불량': '#f44336', '보류': '#ff9800' }

    return html`
      <div class="panel loc-panel">
        <div class="panel-header">
          <span class="panel-icon">📍</span>
          <span class="panel-title">로케이션 사용률 현황</span>
        </div>
        <div class="loc-body">
          <!-- 도넛 차트 -->
          <div class="donut-grid">
            ${types.length === 0
              ? html`<div class="empty-msg" style="grid-column:1/-1">데이터 없음</div>`
              : types.map(t => this._renderDonut(t, colors[t.loc_group] || '#9e9e9e'))}
          </div>

          <!-- 상세 테이블 -->
          <table class="loc-table">
            <thead>
              <tr>
                <th>구분</th><th class="num">전체</th><th class="num">사용 중</th>
                <th class="num">가용</th><th>사용률</th><th>상태</th>
              </tr>
            </thead>
            <tbody>
              ${types.map(t => {
                const rate = Number(t.usage_rate || 0)
                const color = colors[t.loc_group] || '#9e9e9e'
                const status = rate >= 90 ? '포화' : rate >= 70 ? '보통' : '여유'
                return html`
                  <tr>
                    <td>${t.loc_group}</td>
                    <td class="num">${fmt(t.total)}</td>
                    <td class="num">${fmt(t.used)}</td>
                    <td class="num">${fmt(t.available)}</td>
                    <td>
                      <div class="usage-bar-wrap">
                        <div class="usage-bar-bg">
                          <div class="usage-bar-fill" style="width:${rate}%;background:${color}"></div>
                        </div>
                        <span class="usage-bar-pct">${rate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td><span class="loc-status">${status}</span></td>
                  </tr>
                `
              })}
            </tbody>
          </table>

          <!-- 효율 분석 -->
          <div class="loc-analysis">
            <div class="loc-analysis-title">가용 로케이션 / 효율 분석</div>
            <div class="analysis-row">
              <span class="analysis-key">가용 로케이션</span>
              <span class="analysis-val">${fmt(analysis.available)}개</span>
            </div>
            <div class="analysis-row">
              <span class="analysis-key">FULL 로케이션</span>
              <span class="analysis-val">${fmt(analysis.full)}개</span>
            </div>
            <div class="analysis-row">
              <span class="analysis-key">비효율 적치 로케이션</span>
              <span class="analysis-val">${fmt(analysis.inefficient)}개</span>
            </div>
            <div class="analysis-row">
              <span class="analysis-key">혼적 SKU 로케이션</span>
              <span class="analysis-val">${fmt(analysis.mixed_sku)}개</span>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /** 도넛 차트 SVG 렌더링 */
  _renderDonut(typeData, color) {
    const total = Number(typeData.total || 0)
    const used  = Number(typeData.used  || 0)
    const pct   = total > 0 ? Math.round(used / total * 100) : 0
    const r = 34, cx = 50, cy = 50, circ = 2 * Math.PI * r
    const filled = (pct / 100) * circ
    return html`
      <div class="donut-item">
        <svg viewBox="0 0 100 100">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="10"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
            stroke-dasharray="${filled} ${circ}"
            stroke-linecap="round"
            transform="rotate(-90 ${cx} ${cy})"/>
          <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="${color}">${pct}%</text>
          <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="9" fill="#999">${used}/${total}</text>
        </svg>
        <div class="donut-label">${typeData.loc_group} 로케이션</div>
      </div>
    `
  }
}

window.customElements.define('inventory-dashboard', InventoryDashboard)
