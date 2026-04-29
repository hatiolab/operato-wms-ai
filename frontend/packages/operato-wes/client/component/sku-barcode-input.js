import '@things-factory/barcode-ui'
import { html, css, LitElement } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'

/**
 * SKU 바코드 스캔 입력 컴포넌트
 *
 * 바코드를 스캔하면 서버 API로 SKU 정보를 조회하고,
 * 결과가 1건이면 즉시 `sku-select` 이벤트를 발생시키고,
 * 복수이면 선택 팝업을 띄워 작업자가 선택하도록 한다.
 *
 * ox-input-barcode는 카메라 스캔 버튼을 내장하며, 모바일에서
 * 카메라 권한이 있으면 자동으로 버튼이 활성화된다.
 *
 * @property {string} comCd - 화주사 코드 (선택, 없으면 전체 검색)
 * @property {string} placeholder - 바코드 입력 필드 placeholder 힌트 텍스트
 * @property {boolean} disabled - 입력 비활성화
 * @property {boolean} skipInventory - 재고 바코드 조회 스킵 여부 (입고·VAS 등 재고가 없는 화면에서 true)
 *
 * @fires sku-select - 상품 선택 완료 시 발생
 *   detail: { com_cd, sku_cd, sku_nm, barcode }
 *
 * @example
 * <sku-barcode-input
 *   .comCd=${'COM001'}
 *   placeholder="상품 바코드 스캔"
 *   @sku-select=${e => this._onSkuSelect(e.detail)}>
 * </sku-barcode-input>
 */
@customElement('sku-barcode-input')
export class SkuBarcodeInput extends LitElement {
  /** 화주사 코드 (빈 문자열이면 전체 검색) */
  @property({ type: String }) comCd = ''

  /** 바코드 입력 placeholder 힌트 텍스트 */
  @property({ type: String }) placeholder = ''

  /** 입력 비활성화 여부 */
  @property({ type: Boolean }) disabled = false

  /**
   * 재고 바코드(inventories.barcode) 조회 스킵 여부
   * true이면 API의 1단계(재고 바코드 직접 매칭)를 건너뛰고 SKU 마스터만 조회.
   * 입고·유통가공처럼 재고가 아직 없는 화면에서 사용.
   */
  @property({ type: Boolean }) skipInventory = false

  /** API 호출 중 */
  @state() _processing = false

  /** 복수 결과 팝업용 후보 목록 */
  @state() _candidates = []

  /** 선택 팝업 표시 여부 */
  @state() _showPopup = false

  /** 오류/안내 피드백 */
  @state() _feedback = null

  /** 입력값 존재 여부 (placeholder 숨김 처리용) */
  @state() _hasValue = false

  /** ox-input-barcode 엘리먼트 참조 (값 초기화용) */
  @query('ox-input-barcode') _barcodeEl

  /** 컴포넌트 스타일 정의 */
  static get styles() {
    return css`
      :host {
        display: block;
        position: relative;
        width: 100%;
      }

      /* ox-input-barcode는 placeholder를 지원하지 않으므로
         wrapper + 절대위치 오버레이로 placeholder 효과를 구현 */
      .barcode-wrapper {
        position: relative;
        width: 100%;
      }

      ox-input-barcode {
        width: 100%;
      }

      /* placeholder 오버레이 — pointer-events: none으로 클릭 투과 */
      .placeholder-hint {
        position: absolute;
        top: 50%;
        left: 8px;
        right: 40px; /* 카메라 버튼 영역 확보 */
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--md-sys-color-outline, #aaa);
        font-size: var(--md-sys-typescale-label-large-size, 0.875rem);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        z-index: 1;
      }

      /* 포커스 중이거나 값이 있으면 placeholder 숨김
         (:focus-within은 Shadow DOM 내부 포커스도 감지함) */
      .barcode-wrapper:focus-within .placeholder-hint {
        display: none;
      }

      /* 피드백 메시지 */
      .feedback {
        margin-top: 4px;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.85rem;
        line-height: 1.4;
      }
      .feedback.error {
        background: #fdecea;
        color: #c62828;
        border: 1px solid #ef9a9a;
      }
      .feedback.info {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid #90caf9;
      }

      /* 선택 팝업 — 모바일: 바텀 시트 */
      .popup-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .popup-sheet {
        background: var(--md-sys-color-surface, #fff);
        border-radius: 16px 16px 0 0;
        width: 100%;
        max-height: 70vh;
        overflow-y: auto;
        padding: 16px 0 env(safe-area-inset-bottom, 16px);
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
      }

      .popup-handle {
        width: 40px;
        height: 4px;
        background: var(--md-sys-color-outline, #ccc);
        border-radius: 2px;
        margin: 0 auto 12px;
      }

      .popup-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--md-sys-color-on-surface, #111);
        padding: 0 16px 12px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
      }

      .popup-cancel {
        display: block;
        width: calc(100% - 32px);
        margin: 12px 16px 0;
        padding: 12px;
        background: transparent;
        border: 1px solid var(--md-sys-color-outline, #ccc);
        border-radius: 8px;
        font-size: 0.9rem;
        color: var(--md-sys-color-on-surface-variant, #555);
        cursor: pointer;
        text-align: center;
      }

      .candidate-item {
        display: flex;
        flex-direction: column;
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
        cursor: pointer;
        transition: background 0.15s;
        gap: 2px;
      }
      .candidate-item:active {
        background: var(--md-sys-color-surface-variant, #f5f5f5);
      }

      .candidate-sku-cd {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--md-sys-color-primary, #1976d2);
      }
      .candidate-sku-nm {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface, #333);
      }
      .candidate-com-cd {
        font-size: 0.78rem;
        color: var(--md-sys-color-on-surface-variant, #777);
      }

      /* PC: 중앙 모달 */
      @media (min-width: 768px) {
        .popup-backdrop {
          align-items: center;
        }

        .popup-sheet {
          border-radius: 12px;
          width: 480px;
          max-width: 90vw;
          max-height: 60vh;
          padding: 16px 0 16px;
        }

        .popup-handle {
          display: none;
        }

        .candidate-item:hover {
          background: var(--md-sys-color-surface-variant, #f5f5f5);
        }
      }
    `
  }

  /** 컴포넌트 렌더링 */
  render() {
    const placeholderText = this.placeholder || (TermsUtil.tLabel('scan_barcode') || '바코드 스캔')

    return html`
      <div class="barcode-wrapper">
        <ox-input-barcode
          ?disabled=${this.disabled || this._processing}
          @change=${this._onBarcodeChange}>
        </ox-input-barcode>

        ${!this._hasValue ? html`
          <span class="placeholder-hint">${placeholderText}</span>
        ` : ''}
      </div>

      ${this._feedback ? html`
        <div class="feedback ${this._feedback.type}">${this._feedback.message}</div>
      ` : ''}

      ${this._showPopup ? this._renderPopup() : ''}
    `
  }

  /** 선택 팝업 렌더링 */
  _renderPopup() {
    return html`
      <div class="popup-backdrop" @click=${this._onBackdropClick}>
        <div class="popup-sheet" @click=${e => e.stopPropagation()}>
          <div class="popup-handle"></div>
          <div class="popup-title">
            ${TermsUtil.tText('select_one') || '상품 선택'} (${this._candidates.length}건)
          </div>

          ${this._candidates.map(item => html`
            <div class="candidate-item" @click=${() => this._selectCandidate(item)}>
              <span class="candidate-sku-cd">${item.sku_cd}</span>
              <span class="candidate-sku-nm">${item.sku_nm || '-'}</span>
              ${item.com_cd ? html`
                <span class="candidate-com-cd">${TermsUtil.tLabel('com_cd') || '화주사'}: ${item.com_cd}</span>
              ` : ''}
            </div>
          `)}

          <button class="popup-cancel" @click=${this._closePopup}>
            ${TermsUtil.tButton('cancel') || '취소'}
          </button>
        </div>
      </div>
    `
  }

  /**
   * ox-input-barcode의 change 이벤트 처리
   * @param {Event} e - change 이벤트
   */
  _onBarcodeChange(e) {
    const barcode = e.target.value
    this._hasValue = Boolean(barcode)
    this._onScan(barcode)
  }

  /**
   * 바코드 스캔 처리 — API 호출 후 결과에 따라 즉시 dispatch 또는 팝업 표시
   * @param {string} barcode - 스캔된 바코드 값
   */
  async _onScan(barcode) {
    if (!barcode || !barcode.trim()) return

    this._feedback = null
    this._processing = true

    try {
      const body = { barcode: barcode.trim() }
      if (this.comCd) body.com_cd = this.comCd
      if (this.skipInventory) body.skip_inventory = 'true'

      const candidates = await ServiceUtil.restPost('inventory_trx/resolve_barcode', body)

      if (!candidates || candidates.length === 0) {
        this._setFeedback('error', TermsUtil.tText('barcode_not_found') || `바코드에 해당하는 상품을 찾을 수 없습니다: ${barcode}`)
        return
      }

      if (candidates.length === 1) {
        this._dispatchSelect(candidates[0])
      } else {
        this._candidates = candidates
        this._showPopup = true
      }
    } catch (err) {
      const msg = err?.message || (TermsUtil.tText('barcode_resolve_error') || '바코드 조회 중 오류가 발생했습니다.')
      this._setFeedback('error', msg)
    } finally {
      this._processing = false
      this._clearBarcodeInput()
    }
  }

  /**
   * 팝업에서 후보 상품 선택
   * @param {object} item - 선택된 후보 항목
   */
  _selectCandidate(item) {
    this._closePopup()
    this._dispatchSelect(item)
  }

  /**
   * sku-select 커스텀 이벤트 dispatch
   * @param {object} item - { com_cd, sku_cd, sku_nm, barcode }
   */
  _dispatchSelect(item) {
    this.dispatchEvent(
      new CustomEvent('sku-select', {
        detail: item,
        bubbles: true,
        composed: true
      })
    )
  }

  /** ox-input-barcode 입력값 초기화 (스캔 처리 후 호출) */
  _clearBarcodeInput() {
    if (this._barcodeEl) {
      this._barcodeEl.value = ''
    }
    this._hasValue = false
  }

  /** 팝업 닫기 */
  _closePopup() {
    this._showPopup = false
    this._candidates = []
  }

  /** 팝업 배경 클릭 처리 */
  _onBackdropClick() {
    this._closePopup()
  }

  /**
   * 피드백 메시지 설정
   * @param {'error'|'info'} type - 피드백 유형
   * @param {string} message - 표시할 메시지
   */
  _setFeedback(type, message) {
    this._feedback = { type, message }
  }

  /** 피드백 메시지 초기화 */
  clearFeedback() {
    this._feedback = null
  }

  /** 내부 barcode input에 포커스 — PDA 하드웨어 스캐너 연동용 */
  focus() {
    this._barcodeEl?.input?.focus()
  }
}
