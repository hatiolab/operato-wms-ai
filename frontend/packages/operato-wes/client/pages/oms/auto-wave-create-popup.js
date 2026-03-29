import { css, html, LitElement } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { ServiceUtil, UiUtil } from '@operato-app/metapage/dist-client'

/**
 * 자동 웨이브 생성 팝업
 *
 * ALLOCATED 상태 주문을 그룹핑 기준에 따라 웨이브로 자동 생성한다.
 * openPopup()으로 열리며, 생성 완료 시 'wave-created' 커스텀 이벤트를 발생시킨다.
 *
 * @fires wave-created - 웨이브 생성 완료 시 발생. detail: { wave_count, total_orders, waves }
 *
 * @example
 * openPopup(
 *   html`<auto-wave-create-popup
 *     @wave-created="${() => this._fetchData()}"
 *   ></auto-wave-create-popup>`,
 *   { backdrop: true, size: 'large', title: '자동 웨이브 생성' }
 * )
 */
class AutoWaveCreatePopup extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        /* 폼 영역 */
        .form-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px 20px 12px 20px;
        }

        .form-section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .two-panel {
          display: flex;
          gap: 24px;
          margin-top: 16px;
        }

        .panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .panel-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .form-group select,
        .form-group input {
          padding: 10px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          font-size: 14px;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface, #333);
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group select:focus,
        .form-group input:focus {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
        }

        /* 체크박스 그룹 */
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--md-sys-color-on-surface, #333);
          cursor: pointer;
        }

        .checkbox-group input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        /* 대상 건수 정보 */
        .preview-info {
          background: var(--md-sys-color-surface-variant, #f0f7ff);
          border: 1px solid var(--md-sys-color-primary-container, #bbdefb);
          border-radius: 8px;
          padding: 12px 16px;
          margin-top: 8px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        /* 하단 버튼 영역 */
        .button-bar {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface, #fff);
        }

        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .btn-cancel:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-save {
          background: var(--md-sys-color-primary, #1976D2);
          color: #fff;
        }

        .btn-save:hover:not(:disabled) {
          background: #1565C0;
        }

        .btn-save:active:not(:disabled) {
          transform: scale(0.98);
        }

        /* 반응형 */
        @media screen and (max-width: 600px) {
          .two-panel {
            flex-direction: column;
          }
        }
      `
    ]
  }

  static get properties() {
    return {
      groupByCarrier: Boolean,
      groupByCust: Boolean,
      groupByBizType: Boolean,
      pickType: String,
      pickMethod: String,
      maxOrderCount: Number,
      previewCount: Number,
      creating: Boolean
    }
  }

  constructor() {
    super()
    this.groupByCarrier = true
    this.groupByCust = false
    this.groupByBizType = false
    this.pickType = 'TOTAL'
    this.pickMethod = 'PICK'
    this.maxOrderCount = 200
    this.previewCount = 0
    this.creating = false
  }

  /** 컴포넌트가 DOM에 연결될 때 대상 건수 조회 */
  connectedCallback() {
    super.connectedCallback()
    this._fetchPreviewCount()
  }

  render() {
    return html`
      <!-- 폼 내용 -->
      <div class="form-content">
        <div class="form-section-title">웨이브 생성 조건</div>
        <div class="preview-info">
          할당 ${i18next.t('label.status_orders', { defaultValue: '상태 주문' })}: <strong>${this.previewCount}${i18next.t('label.count_unit', { defaultValue: '건' })}</strong>
        </div>

        <div class="two-panel">
          <!-- 좌측: 그룹핑 기준 -->
          <div class="panel">
            <div class="panel-title">${i18next.t('label.wave_group_by', { defaultValue: '그룹핑 기준' })}</div>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" .checked="${this.groupByCarrier}"
                  @change="${e => { this.groupByCarrier = e.target.checked }}" />
                ${i18next.t('label.by_carrier', { defaultValue: '택배사별 (carrier_cd)' })}
              </label>
              <label>
                <input type="checkbox" .checked="${this.groupByCust}"
                  @change="${e => { this.groupByCust = e.target.checked }}" />
                ${i18next.t('label.by_customer', { defaultValue: '고객별 (cust_cd)' })}
              </label>
              <label>
                <input type="checkbox" .checked="${this.groupByBizType}"
                  @change="${e => { this.groupByBizType = e.target.checked }}" />
                ${i18next.t('label.by_biz_type', { defaultValue: '업무유형별 (biz_type)' })}
              </label>
            </div>
          </div>

          <!-- 우측: 피킹/실행 유형, 최대 주문수 -->
          <div class="panel">
            <div class="panel-title">${i18next.t('label.wave_options', { defaultValue: '웨이브 옵션' })}</div>
            <div class="form-group">
              <label>${i18next.t('label.pick_type', { defaultValue: '피킹 유형' })}</label>
              <select .value="${this.pickType}"
                @change="${e => { this.pickType = e.target.value }}">
                <option value="TOTAL">토털 피킹</option>
                <option value="ZONE">존별 피킹</option>
                <option value="INDIVIDUAL">개별 피킹</option>
              </select>
            </div>

            <div class="form-group">
              <label>${i18next.t('label.pick_method', { defaultValue: '피킹 방식' })}</label>
              <select .value="${this.pickMethod}"
                @change="${e => { this.pickMethod = e.target.value }}">
                <option value="PICK">${i18next.t('label.pick_method_pick', { defaultValue: '피킹' })}</option>
                <option value="INSPECT">${i18next.t('label.pick_method_inspect', { defaultValue: '검수와 함께 피킹' })}</option>
                <option value="PAPER">${i18next.t('label.pick_method_paper', { defaultValue: '페이퍼 처리' })}</option>
                <option value="WCS">${i18next.t('label.pick_method_wcs', { defaultValue: 'WCS 위임' })}</option>
              </select>
            </div>

            <div class="form-group">
              <label>${i18next.t('label.max_order_count', { defaultValue: '웨이브당 최대 주문수' })}</label>
              <input type="number" min="1" .value="${String(this.maxOrderCount)}"
                @change="${e => { this.maxOrderCount = parseInt(e.target.value) || 200 }}" />
            </div>
          </div>
        </div>
      </div>

      <!-- 하단 버튼 -->
      <div class="button-bar">
        <button class="btn btn-cancel" @click="${this._onCancel}" ?disabled="${this.creating}">
          ${i18next.t('button.cancel', { defaultValue: '취소' })}
        </button>
        <button class="btn btn-save" @click="${this._execute}" ?disabled="${this.creating || this.previewCount === 0}">
          ${this.creating
        ? i18next.t('label.processing', { defaultValue: '처리 중...' })
        : i18next.t('button.create', { defaultValue: '생성' })}
        </button>
      </div>
    `
  }

  /** 대상 건수 조회 */
  async _fetchPreviewCount() {
    try {
      const data = await ServiceUtil.restGet(`oms_trx/waves/preview?order_date=${this._todayStr()}`)
      this.previewCount = data?.total_orders || 0
    } catch (error) {
      console.error('대상 건수 조회 실패:', error)
      this.previewCount = 0
    }
  }

  /** 자동 웨이브 생성 실행 */
  async _execute() {
    try {
      this.creating = true

      const groupBy = []
      if (this.groupByCarrier) groupBy.push('carrier_cd')
      if (this.groupByCust) groupBy.push('cust_cd')
      if (this.groupByBizType) groupBy.push('biz_type')

      const params = {
        group_by: groupBy,
        pick_type: this.pickType,
        pick_method: this.pickMethod,
        max_order_count: this.maxOrderCount,
        order_date: this._todayStr()
      }

      const result = await ServiceUtil.restPost('oms_trx/waves/create', params)

      if (result) {
        const msg = `${result.wave_count || 0}개 웨이브 생성 완료 (주문 ${result.total_orders || 0}건)`
        document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'info', message: msg } }))

        this.dispatchEvent(new CustomEvent('wave-created', {
          detail: result,
          bubbles: true,
          composed: true
        }))

        this._closePopup()
      }
    } catch (error) {
      console.error('자동 웨이브 생성 실패:', error)
      document.dispatchEvent(new CustomEvent('notify', { detail: { level: 'error', message: '웨이브 생성에 실패했습니다' } }))
    } finally {
      this.creating = false
    }
  }

  /** 취소 버튼 클릭 */
  _onCancel() {
    this._closePopup()
  }

  /** 현재 팝업 닫기 */
  _closePopup() {
    UiUtil.closePopupBy(this)
  }

  _todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

window.customElements.define('auto-wave-create-popup', AutoWaveCreatePopup)
