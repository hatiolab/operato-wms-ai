import { css, html } from 'lit-element'

import { i18next, localize } from '@operato/i18n'
import { PageView } from '@operato/shell'
import { ServiceUtil, TermsUtil } from '@operato-app/metapage/dist-client'
import { OxInputBarcode } from '@operato/input'

import { HardwareScannerService } from './hardware-scanner-service.js'
import { voiceService } from './voice-service.js'

/**
 * VAS 자재 피킹 PDA 화면
 *
 * 화면 모드:
 * - 주문 선택 모드: 피킹 대상 VAS 주문 목록 + 바코드 스캔
 * - 피킹 작업 모드: 자재 체크리스트 + 바코드 스캔 + 수량 입력
 *
 * 작업 흐름:
 * 1. 주문 선택 (바코드 스캔 또는 목록에서 클릭)
 * 2. 자재 체크리스트 확인
 * 3. SKU 바코드 스캔 → 자재 자동 매칭
 * 4. 로케이션 이동 → 수량 확인 → 피킹 확인
 * 5. 다음 자재 자동 이동
 * 6. 전체 피킹 완료 후 주문 선택 화면 복귀
 *
 * PDA 최적화:
 * - OxInputBarcode 바코드 스캔 컴포넌트
 * - 큰 터치 버튼, 큰 폰트
 * - 로케이션 대형 안내 표시
 * - 음성 피드백
 */
class VasPdaPick extends localize(i18next)(PageView) {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          background: var(--md-sys-color-surface, #fafafa);
          height: 100%;
          overflow: hidden;
          font-family: var(--md-sys-typescale-body-large-font, sans-serif);
        }

        /* 작업 화면 3존 레이아웃 — 상단 고정 / 중앙 리스트 스크롤 / 하단 고정 */
        .work-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }

        /* 상단 고정존: 주문정보 · 진행률 · 스캔 · 현재자재(로케이션/수량/피킹확인) */
        .work-fixed-top {
          flex-shrink: 0;
          padding: 6px 12px 4px;
        }

        /* 중앙 스크롤존: 자재 체크리스트만 스크롤 (전체 화면 스크롤 방지) */
        .work-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 0 12px;
        }

        /* 하단 고정존: 완료 · 목록 버튼 */
        .work-fixed-bottom {
          flex-shrink: 0;
          padding: 8px 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          background: var(--md-sys-color-surface, #fafafa);
        }

        /* 스캔 입력 */
        .scan-input-group {
          margin-bottom: 6px;
        }

        .scan-input-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 3px;
        }

        .scan-input {
          display: flex;
          gap: 8px;
        }

        .scan-input ox-input-barcode {
          flex: 1;
          --barcodescan-input-font-size: 15px;
          --barcodescan-input-padding: 8px 12px;
          --barcodescan-input-border-radius: 8px;
        }

        /* 스캔 입력 우측 대상선택 버튼 */
        .scan-input .btn-target-picker {
          flex-shrink: 0;
          width: 40px;
          border: 1px solid var(--md-sys-color-primary, #1976D2);
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          font-size: 18px;
          cursor: pointer;
        }
        .scan-input .btn-target-picker:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }
        .scan-input .btn-target-picker:disabled {
          opacity: 0.4;
        }

        /* 대상 선택 팝업 (바텀 시트) */
        .picker-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .picker-sheet {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 16px 16px 0 0;
          width: 100%;
          max-height: 70vh;
          overflow-y: auto;
          padding: 12px 12px env(safe-area-inset-bottom, 16px);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
        }
        .picker-handle {
          width: 40px;
          height: 4px;
          background: var(--md-sys-color-outline, #ccc);
          border-radius: 2px;
          margin: 0 auto 12px;
        }
        .picker-title {
          font-size: 15px;
          font-weight: 600;
          padding: 0 4px 10px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
          color: var(--md-sys-color-on-surface, #222);
        }
        .picker-empty {
          text-align: center;
          padding: 24px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }
        .picker-item {
          padding: 10px 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #f0f0f0);
          cursor: pointer;
        }
        .picker-item:active {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }
        .picker-item .p-nm {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #222);
        }
        .picker-item .p-sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #777);
          margin-top: 2px;
        }
        .picker-cancel {
          width: 100%;
          margin-top: 10px;
          padding: 12px;
          border: 1px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          background: transparent;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant, #555);
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .picker-backdrop { align-items: center; }
          .picker-sheet { border-radius: 12px; width: 420px; max-width: 90vw; }
          .picker-handle { display: none; }
        }

        .btn-refresh {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-refresh:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        /* 주문 목록 */
        .order-list-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 12px;
        }

        .order-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ── 상태 요약 카드 ── */
        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px 12px;
          flex-shrink: 0;
        }

        .summary-card {
          text-align: center;
          padding: 10px 4px;
          border-radius: 8px;
          background: var(--md-sys-color-surface-container-lowest, #fff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.15s;
        }

        .summary-card[active] {
          border-color: var(--md-sys-color-primary, #1976D2);
          box-shadow: 0 2px 6px rgba(25,118,210,0.25);
        }

        .summary-card .count {
          font-size: 22px;
          font-weight: bold;
          color: var(--md-sys-color-primary, #1976D2);
        }

        .summary-card .card-label {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 4px;
        }

        .summary-card.waiting .count { color: #E65100; }
        .summary-card.working .count { color: #1976D2; }
        .summary-card.done .count { color: #4CAF50; }

        /* ── 주문 목록 스크롤 영역 ── */
        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }

        .order-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── 바코드 스캔 (하단 고정) ── */
        .scan-bottom {
          padding: 8px 12px 12px;
          border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
          flex-shrink: 0;
        }

        .scan-bottom label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
          display: block;
          margin-bottom: 4px;
        }

        .scan-bottom .scan-row {
          display: flex;
          gap: 8px;
        }

        .scan-bottom ox-input-barcode { flex: 1; }

        .order-item {
          background: var(--md-sys-color-surface-container-lowest, #fff);
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .order-item:active {
          background: var(--md-sys-color-surface-variant, #eee);
        }

        .order-item .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-item .order-no {
          font-size: 14px;
          font-weight: bold;
          color: var(--md-sys-color-on-surface, #333);
        }

        .order-item .order-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .order-item .sub-info {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-top: 6px;
        }

        .order-badge.APPROVED {
          background: #e3f2fd;
          color: #1976d2;
        }

        .order-badge.MATERIAL_READY {
          background: #e8f5e9;
          color: #388e3c;
        }

        .order-badge.IN_PROGRESS {
          background: #fff8e1;
          color: #f57f17;
        }

        .order-badge.COMPLETED {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .order-badge.CLOSED {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        /* 진행률 바 */
        .progress-section {
          margin-bottom: 6px;
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #F57C00);
          transition: width 0.6s ease;
          border-radius: 8px;
        }

        .progress-bar-fill.complete {
          background: linear-gradient(90deg, #4CAF50, #388E3C);
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        /* 주문 정보 — 타이트 1줄 헤더 */
        .order-info-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 2px 6px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #eee);
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
        }
        .order-info-bar .back-btn {
          flex-shrink: 0;
          border: none;
          background: none;
          color: var(--md-sys-color-primary, #1976D2);
          font-size: 18px;
          line-height: 1;
          padding: 2px 6px 2px 2px;
          cursor: pointer;
        }
        .order-info-bar .back-btn:active {
          opacity: 0.6;
        }
        .order-info-bar .oi-no {
          font-size: 15px;
          font-weight: 700;
          color: var(--md-sys-color-on-surface, #222);
          flex-shrink: 0;
        }
        .order-info-bar .oi-sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .order-info-bar .oi-sub strong { color: #E65100; }

        /* 주문 정보 카드 (미사용 — 하위호환 보존) */
        .order-info-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .order-info-card .title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .order-info-card .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          padding: 4px 0;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .order-info-card .detail-row .value {
          font-weight: 600;
          color: var(--md-sys-color-on-surface, #333);
        }

        /* 항목 체크리스트 — 스크롤존 내부, 타이트 */
        .item-checklist {
          background: #fff;
          border-radius: 10px;
          padding: 8px 12px;
          margin: 6px 0 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .item-checklist .title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        /* 체크리스트 항목 래퍼 (항목 + 상세 패널) */
        .checklist-item-wrapper {
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        }

        .checklist-item-wrapper:last-child {
          border-bottom: none;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 0;
          font-size: 13px;
          cursor: pointer;
        }

        .checklist-item.active {
          background: #FFF3E0;
          margin: 0 -12px;
          padding: 5px 12px;
          border-radius: 6px;
        }

        .checklist-item .icon {
          font-size: 16px;
          min-width: 18px;
          text-align: center;
        }

        .checklist-item.completed .icon {
          color: #4CAF50;
        }

        .checklist-item.active .icon {
          color: #FF9800;
        }

        .checklist-item .sku-info {
          flex: 1;
          min-width: 0;
          line-height: 1.25;
        }

        .checklist-item .sku-name {
          font-weight: 600;
          font-size: 13px;
          color: var(--md-sys-color-on-surface, #333);
          /* 긴 자재명은 줄바꿈하여 전체 표시 (자르지 않음) — 토글 버튼은 sku-info min-width:0 로 항상 유지 */
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .checklist-item .qty {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        .checklist-item .qty strong {
          color: #E65100;
          font-weight: 700;
        }

        /* 토글 버튼 */
        .realloc-badge {
          display: inline-block;
          margin-left: 6px;
          padding: 1px 7px;
          border-radius: 10px;
          background: var(--md-sys-color-tertiary-container, #ffe0b2);
          color: var(--md-sys-color-on-tertiary-container, #7a4f00);
          font-size: 11px;
          font-weight: 700;
          vertical-align: middle;
        }

        .item-actions {
          flex-shrink: 0;
          display: flex;
          gap: 4px;
          margin-right: 4px;
        }

        .item-actions .act-btn {
          min-width: 30px;
          min-height: 30px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface, #fff);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .item-actions .act-btn.del {
          color: var(--md-sys-color-error, #d32f2f);
          border-color: var(--md-sys-color-error, #d32f2f);
        }

        .item-actions .act-btn.cancel {
          color: var(--md-sys-color-primary, #1976d2);
          border-color: var(--md-sys-color-primary, #1976d2);
        }

        .item-actions .act-btn:active {
          background: var(--md-sys-color-surface-variant, #f0f0f0);
        }

        .toggle-detail-btn {
          flex-shrink: 0;
          min-width: 26px;
          min-height: 26px;
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 6px;
          background: var(--md-sys-color-surface-variant, #f5f5f5);
          color: var(--md-sys-color-on-surface-variant, #666);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }

        .toggle-detail-btn:active {
          background: var(--md-sys-color-primary-container, #e3f2fd);
        }

        .toggle-detail-btn.expanded {
          background: var(--md-sys-color-primary-container, #e3f2fd);
          border-color: var(--md-sys-color-primary, #1976D2);
          color: var(--md-sys-color-primary, #1976D2);
        }

        /* 재고 상세 패널 — 타이트 */
        .inv-detail-panel {
          margin: 0 0 4px 26px;
          border-radius: 6px;
          overflow: hidden;
        }

        /* 할당 바코드 카드 리스트 */
        .alloc-card-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .alloc-card {
          background: #f8f9ff;
          border: 1px solid #dde3f5;
          border-radius: 6px;
          padding: 5px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .alloc-card.scanned {
          background: #e8f5e9;
          border-color: #a5d6a7;
        }

        .alloc-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .alloc-barcode {
          font-size: 12px;
          font-weight: 700;
          color: #1a237e;
          word-break: break-all;
          flex: 1;
          min-width: 0;
        }

        .alloc-card.scanned .alloc-barcode {
          color: #2e7d32;
        }

        .alloc-loc {
          font-size: 12px;
          font-weight: 600;
          color: var(--md-sys-color-primary, #1976D2);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .alloc-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alloc-qty {
          font-size: 12px;
          color: #555;
        }

        .alloc-qty strong {
          color: #E65100;
        }

        .alloc-card.scanned .alloc-qty strong {
          color: #2e7d32;
        }

        .alloc-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 8px;
          white-space: nowrap;
        }

        .alloc-badge.pending {
          background: #fff3e0;
          color: #E65100;
        }

        .alloc-badge.done {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .location-guide.all-scanned {
          background: #e8f5e9;
          border-color: #a5d6a7;
        }

        .location-guide.all-scanned .loc-value {
          color: #2e7d32;
        }

        .scan-progress {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-primary, #1a73e8);
        }

        /* 현재 항목 폼 — 타이트 */
        .current-item-form {
          background: var(--md-sys-color-surface, #fff);
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .current-item-form .title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #E65100;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 로케이션 안내 — 타이트 (박스 높이 추가 -20%) */
        .location-guide {
          background: #FFF3E0;
          border: 1.5px solid #FF9800;
          border-radius: 8px;
          padding: 3px 8px;
          margin-bottom: 6px;
          text-align: center;
        }

        .location-guide .loc-label {
          font-size: 11px;
          font-weight: 600;
          color: #E65100;
          margin-bottom: 0;
        }

        .location-guide .loc-value {
          font-size: 15px;
          font-weight: 700;
          color: #E65100;
        }

        .location-guide .lot-info {
          font-size: 13px;
          color: #795548;
          margin-top: 4px;
        }

        /* 폼 그룹 */
        .form-group {
          margin-bottom: 6px;
        }

        .form-group label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          margin-bottom: 3px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 10px;
          border: 2px solid var(--md-sys-color-outline, #ccc);
          border-radius: 8px;
          font-size: 15px;
          box-sizing: border-box;
          outline: none;
        }

        .form-group input:focus {
          border-color: #FF9800;
        }

        .qty-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty-input-group input {
          flex: 1;
          min-width: 0;
        }

        /* 수량 입력 옆 인라인 '확인' 버튼 — 입력창 높이에 맞춰 컴팩트 */
        .qty-input-group .pda-btn {
          flex-shrink: 0;
          min-height: 38px;
          padding: 0 18px;
          font-size: 15px;
          border-radius: 8px;
        }

        .qty-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant, #666);
          white-space: nowrap;
        }

        /* 폼 액션 버튼 — 타이트 (기본 pda-btn보다 작게) */
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 6px;
        }

        .form-actions .pda-btn {
          min-height: 42px;
          padding: 8px 16px;
          font-size: 16px;
          border-radius: 8px;
        }

        .form-actions .pda-btn {
          flex: 1;
        }

        /* 버튼 */
        .pda-btn {
          min-height: 52px;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pda-btn:active {
          transform: scale(0.97);
        }

        .pda-btn.primary {
          background: #FF9800;
          color: #fff;
        }

        .pda-btn.success {
          background: #4CAF50;
          color: #fff;
        }

        .pda-btn.warning {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface, #333);
        }

        .pda-btn.outline {
          background: transparent;
          color: #FF9800;
          border: 2px solid #FF9800;
        }

        .pda-btn:disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        /* 하단 액션 — 고정존, 가로 배치로 1행 압축 */
        .bottom-actions {
          display: flex;
          flex-direction: row;
          gap: 8px;
        }

        .bottom-actions .pda-btn {
          flex: 1;
          min-height: 46px;
          padding: 10px 16px;
          font-size: 16px;
        }

        /* 피드백 토스트 */
        .feedback-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          z-index: 100;
          animation: fadeInOut 2s ease forwards;
        }

        .feedback-toast.success {
          background: #4CAF50;
        }

        .feedback-toast.error {
          background: #F44336;
        }

        .feedback-toast.info {
          background: #2196F3;
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }

        /* 로딩 */
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          font-size: 16px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 48px 16px;
          color: var(--md-sys-color-on-surface-variant, #999);
        }

        .empty-state .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .empty-state .empty-text {
          font-size: 16px;
        }

        /* 음성 토글 */
        .voice-toggle {
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 20;
          min-width: 44px;
          min-height: 44px;
          border-radius: 50%;
          border: none;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: background 0.2s;
        }

        .voice-toggle.on {
          background: var(--md-sys-color-primary, #FF9800);
          color: #fff;
        }

        .voice-toggle.off {
          background: var(--md-sys-color-surface-variant, #e0e0e0);
          color: var(--md-sys-color-on-surface-variant, #666);
        }

        /* 피킹 완료 메시지 — 타이트 */
        .completion-card {
          text-align: center;
          background: #E8F5E9;
          border: 2px solid #4CAF50;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 4px;
        }

        .completion-card .icon {
          font-size: 32px;
          margin-bottom: 4px;
        }

        .completion-card .message {
          font-size: 18px;
          font-weight: 700;
          color: #2E7D32;
        }

        .completion-card .sub-message {
          font-size: 14px;
          color: #666;
          margin-top: 8px;
        }
      `
    ]
  }

  static get properties() {
    return {
      loading: Boolean,
      picking: Boolean,
      screen: String,
      filterStatus: String,
      orders: Array,
      bomMap: Object,
      scanValue: String,
      selectedOrder: Object,
      orderItems: Array,
      currentItemIndex: Number,
      pickQty: Number,
      feedbackMsg: String,
      feedbackType: String,
      voiceEnabled: Boolean,
      expandedItems: Object,
      showTargetPicker: Boolean,
      showLocPicker: Boolean,
      locCandidates: Array,
      locPickerItem: Object
    }
  }

  constructor() {
    super()
    this.loading = false
    this.picking = false
    this.screen = 'order-select'
    this.filterStatus = 'ALL'
    this.orders = []
    this.bomMap = {}
    this.scanValue = ''
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this.pickQty = 0
    this.feedbackMsg = ''
    this.feedbackType = ''
    this.voiceEnabled = voiceService.enabled
    this.expandedItems = {}
    this.showTargetPicker = false
    this.showLocPicker = false
    this.locCandidates = []
    this.locPickerItem = null
    this._scannerService = null
  }

  get context() {
    return {
      title: TermsUtil.tMenu('VasPdaPick')
    }
  }

  /* ============================================================
   * 렌더링
   * ============================================================ */

  render() {
    return html`

      ${this.screen === 'order-select'
        ? this._renderOrderSelect()
        : this._renderPickWork()}
      ${this.feedbackMsg
        ? html`<div class="feedback-toast ${this.feedbackType}">${this.feedbackMsg}</div>`
        : ''}
      ${this._renderTargetPicker()}
      ${this._renderLocPicker()}
    `
  }

  /* ============================================================
   * 주문 선택 화면
   * ============================================================ */

  /** 주문 선택 화면 렌더링 — pda-inbound-receiving 레이아웃 */
  _renderOrderSelect() {
    // APPROVED: 자재 배정됨, 피킹 가능한 상태
    // MATERIAL_READY 이후: 자재 피킹 완료된 모든 상태 (VAS 작업 대기/진행/완료/마감)
    const pickable = this.orders.filter(o => o.status === 'APPROVED')
    const done = this.orders.filter(o => ['MATERIAL_READY', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(o.status))
    const filtered =
      this.filterStatus === 'WORKING' ? pickable
        : this.filterStatus === 'DONE' ? done
          : [...pickable, ...done]  // ALL: 전체 표시

    return html`
      <!-- 상태 요약 카드 -->
      <div class="summary-cards">
        <div class="summary-card"
          ?active="${this.filterStatus === 'ALL'}"
          @click="${() => this._toggleFilter('ALL')}">
          <div class="count">${this.orders.length}</div>
          <div class="card-label">전체</div>
        </div>
        <div class="summary-card working"
          ?active="${this.filterStatus === 'WORKING'}"
          @click="${() => this._toggleFilter('WORKING')}">
          <div class="count">${pickable.length}</div>
          <div class="card-label">피킹 가능</div>
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
            ? html`<div class="empty-state"><span class="empty-icon">\u{1F4E6}</span><span class="empty-text">해당 주문이 없습니다</span></div>`
            : html`<div class="order-list">${filtered.map(order => this._renderOrderCard(order))}</div>`}
      </div>

      <!-- VAS 주문번호 스캔 (하단) -->
      <div class="scan-bottom">
        <label>VAS 주문번호 스캔</label>
        <div class="scan-row">
          <ox-input-barcode
            placeholder="주문번호 스캔"
            @change="${e => { this.scanValue = e.target.value; this._onScanSearch() }}"
          ></ox-input-barcode>
          <button class="btn-refresh" @click="${this._refresh}">새로고침</button>
        </div>
      </div>
    `
  }

  /** 주문 카드 렌더링 — pda-inbound-receiving task-card 레이아웃 적용 */
  _renderOrderCard(order) {
    const bom = this.bomMap[order.vas_bom_id]

    return html`
      <div class="order-item" @click="${() => this._selectOrder(order)}">
        <div class="card-header">
          <span class="order-no">${order.vas_no || '-'}</span>
          <span class="order-badge ${order.status}">${this._statusLabel(order.status)}</span>
        </div>
        <div class="sub-info">
          ${this._vasTypeLabel(order.vas_type)} | ${bom?.set_sku_cd || '-'} / ${bom?.set_sku_nm || '-'} · 계획: ${order.plan_qty || 0} EA
        </div>
      </div>
    `
  }

  /* ============================================================
   * 피킹 작업 화면
   * ============================================================ */

  _renderPickWork() {
    if (!this.selectedOrder) return ''

    const pickedCount = this.orderItems.filter(i => i._picked).length
    const totalCount = this.orderItems.length
    const progressPct = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0
    const allPicked = pickedCount === totalCount && totalCount > 0

    return html`
      <div class="work-view">
        <!-- 상단 고정: 주문정보 · 진행률 · 스캔 · 현재 자재(로케이션/수량/피킹확인) -->
        <div class="work-fixed-top">
          ${this._renderOrderSummary()}
          ${this._renderProgressBar(pickedCount, totalCount, progressPct)}
          ${!allPicked ? this._renderBarcodeScanner() : ''}
          ${!allPicked && this.currentItemIndex >= 0 ? this._renderPickForm() : ''}
          ${allPicked ? this._renderCompletionMessage() : ''}
        </div>

        <!-- 중앙 스크롤: 자재 체크리스트만 스크롤 -->
        <div class="work-scroll">
          ${this._renderItemChecklist()}
        </div>

        <!-- 하단 고정: 전량 완료 시에만 '피킹 작업 완료' 표시 (목록 이동은 상단 ◀ 버튼) -->
        ${allPicked ? html`
          <div class="work-fixed-bottom">
            ${this._renderBottomActions(allPicked)}
          </div>
        ` : ''}
      </div>
    `
  }

  _renderOrderSummary() {
    const order = this.selectedOrder
    const bom = this.bomMap[order.vas_bom_id]

    // 타이트 UI — 3줄 카드 대신 1줄 압축 헤더 (◀ 뒤로 + 주문번호 + 세트상품 · VAS유형 · 계획수량)
    return html`
      <div class="order-info-bar">
        <button class="back-btn" @click="${this._backToOrderSelect}" title="주문 목록으로">◀</button>
        <span class="oi-no">${order.vas_no}</span>
        <span class="oi-sub">
          ${this._vasTypeLabel(order.vas_type)}
          · 계획 <strong>${order.plan_qty || 0}</strong> EA
        </span>
      </div>
    `
  }

  _renderProgressBar(pickedCount, totalCount, progressPct) {
    return html`
      <div class="progress-section">
        <div class="progress-bar-container">
          <div
            class="progress-bar-fill ${progressPct >= 100 ? 'complete' : ''}"
            style="width: ${Math.min(progressPct, 100)}%"
          ></div>
        </div>
        <div class="progress-label">
          <span>피킹 진행: ${pickedCount}/${totalCount} 품목</span>
          <span>${progressPct}%</span>
        </div>
      </div>
    `
  }

  _renderBarcodeScanner() {
    return html`
      <div class="scan-input-group">
        <label>재고 바코드 스캔</label>
        <div class="scan-input">
          <ox-input-barcode
            placeholder="재고 바코드 스캔"
            @change="${e => this._onInventoryBarcodeScan(e.target.value)}"
          ></ox-input-barcode>
          <button class="btn-target-picker" title="대상 선택"
            @click="${() => { this.showTargetPicker = true }}">📋</button>
        </div>
      </div>
    `
  }

  /**
   * 대상 선택 팝업 렌더링 — 스캔 대신 미스캔 재고(할당 바코드)를 목록에서 직접 선택
   * 미피킹 항목의 할당 바코드 중 아직 스캔하지 않은 것만 대상으로 표시
   */
  _renderTargetPicker() {
    if (!this.showTargetPicker) return ''

    // 미피킹 항목의 미스캔 할당 바코드를 대상 목록으로 수집
    const targets = []
    for (const item of this.orderItems) {
      if (item._picked) continue
      const barcodes = this._getAllocBarcodes(item)
      const scanned = item._scannedBarcodes || []
      for (const bcd of barcodes) {
        if (scanned.includes(bcd)) continue
        targets.push({
          barcode: bcd,
          skuCd: item.sku_cd,
          skuNm: item.sku_nm,
          loc: this._getLocForBarcode(item, bcd),
          qty: this._getAllocQtyForBarcode(item, bcd)
        })
      }
    }

    return html`
      <div class="picker-backdrop" @click="${() => { this.showTargetPicker = false }}">
        <div class="picker-sheet" @click="${e => e.stopPropagation()}">
          <div class="picker-handle"></div>
          <div class="picker-title">대상 선택 (${targets.length})</div>
          ${targets.length === 0
        ? html`<div class="picker-empty">미스캔 대상 없음</div>`
        : targets.map(t => html`
              <div class="picker-item" @click="${() => this._pickTarget(t.barcode)}">
                <div class="p-nm">${t.skuNm || t.skuCd}</div>
                <div class="p-sub">${t.skuCd}${t.loc ? ` · ${t.loc}` : ''} · 수량 ${t.qty}EA · ${t.barcode}</div>
              </div>
            `)}
          <button class="picker-cancel" @click="${() => { this.showTargetPicker = false }}">
            취소
          </button>
        </div>
      </div>
    `
  }

  /**
   * 팝업에서 대상 선택 — 바코드 스캔과 완전히 동일하게 처리
   * @param {string} barcode - 선택된 할당 바코드
   */
  _pickTarget(barcode) {
    this.showTargetPicker = false
    this._onInventoryBarcodeScan(barcode)
  }

  /** 아이템 액션 버튼 — 재할당(로케이션변경/삭제) 또는 피킹됨(피킹취소) */
  _renderItemActions(item) {
    const isRealloc = !!item.parent_item_id
    const picked = !!item._picked
    if (isRealloc && !picked) {
      return html`
        <div class="item-actions">
          <button class="act-btn edit" @click="${e => this._onChangeLocation(item, e)}" title="로케이션 변경">✏️</button>
          <button class="act-btn del" @click="${e => this._onDeleteReallocation(item, e)}" title="재할당 삭제">✕</button>
        </div>`
    }
    if (picked) {
      return html`
        <div class="item-actions">
          <button class="act-btn cancel" @click="${e => this._onCancelPick(item, e)}" title="피킹 취소">↩</button>
        </div>`
    }
    return ''
  }

  /** 피킹 취소 — 실적을 되돌리고 목록 재조회 */
  async _onCancelPick(item, e) {
    if (e) e.stopPropagation()
    if (this.picking) return
    this.picking = true
    try {
      await ServiceUtil.restPost(`vas_trx/vas_order_items/${item.id}/pick_cancel`, {})
      this._showFeedback('피킹 취소됨', 'success')
      voiceService.success('피킹 취소됨')
      await this._fetchOrderItems(this.selectedOrder.id)
    } catch (err) {
      this._showFeedback(err.message || '피킹 취소 실패', 'error')
      voiceService.error('피킹 취소 실패')
    } finally {
      this.picking = false
    }
  }

  /** 재할당 삭제 — 할당 해제 후 아이템 제거, 목록 재조회 */
  async _onDeleteReallocation(item, e) {
    if (e) e.stopPropagation()
    if (this.picking) return
    this.picking = true
    try {
      await ServiceUtil.restDelete(`vas_trx/vas_order_items/${item.id}/reallocation`, {})
      this._showFeedback('재할당 삭제됨', 'success')
      voiceService.success('재할당 삭제됨')
      await this._fetchOrderItems(this.selectedOrder.id)
    } catch (err) {
      this._showFeedback(err.message || '재할당 삭제 실패', 'error')
      voiceService.error('재할당 삭제 실패')
    } finally {
      this.picking = false
    }
  }

  /** 재할당 로케이션 변경 — 가용 재고 후보 조회 후 팝업 오픈 */
  async _onChangeLocation(item, e) {
    if (e) e.stopPropagation()
    try {
      const data = await ServiceUtil.restGet(`vas_trx/vas_order_items/${item.id}/available_inventories`)
      this.locCandidates = data || []
      this.locPickerItem = item
      this.showLocPicker = true
    } catch (err) {
      this._showFeedback(err.message || '가용 재고 조회 실패', 'error')
    }
  }

  /** 선택한 로케이션으로 재할당 (기존 자재할당 로직 재사용) */
  async _applyLocation(inv) {
    const item = this.locPickerItem
    this.showLocPicker = false
    if (!item) return
    this.picking = true
    try {
      await ServiceUtil.restPost(`vas_trx/vas_order_items/${item.id}/allocate`, {
        allocQty: item.alloc_qty || item.req_qty,
        srcLocCd: inv.loc_cd,
        lotNo: inv.lot_no || ''
      })
      this._showFeedback(`${inv.loc_cd} 로 재할당됨`, 'success')
      voiceService.success('로케이션 변경됨')
      await this._fetchOrderItems(this.selectedOrder.id)
    } catch (err) {
      this._showFeedback(err.message || '로케이션 변경 실패', 'error')
      voiceService.error('로케이션 변경 실패')
    } finally {
      this.picking = false
    }
  }

  /** 재할당 로케이션 선택 팝업 — 유통기한 없음 먼저 → 임박순 */
  _renderLocPicker() {
    if (!this.showLocPicker) return ''
    const item = this.locPickerItem
    const need = item ? (item.alloc_qty || item.req_qty || 0) : 0
    return html`
      <div class="picker-backdrop" @click="${() => { this.showLocPicker = false }}">
        <div class="picker-sheet" @click="${e => e.stopPropagation()}">
          <div class="picker-handle"></div>
          <div class="picker-title">로케이션 선택 (필요 ${need} EA · 유통기한 임박순)</div>
          ${this.locCandidates.length === 0
            ? html`<div class="picker-empty">가용 재고가 없습니다</div>`
            : this.locCandidates.map(inv => html`
                <div class="picker-item" @click="${() => this._applyLocation(inv)}">
                  <div class="p-nm">${inv.loc_cd} · ${inv.barcode || '-'}</div>
                  <div class="p-sub">
                    가용 ${inv.avail_qty} EA${inv.lot_no ? ` · LOT ${inv.lot_no}` : ''} ·
                    ${inv.expired_date ? `~${inv.expired_date}` : '유통기한 없음'}
                  </div>
                </div>
              `)}
          <button class="picker-cancel" @click="${() => { this.showLocPicker = false }}">취소</button>
        </div>
      </div>`
  }

  /** 자재 피킹 체크리스트 렌더링 — 항목별 토글 버튼 + 재고 상세 패널 */
  _renderItemChecklist() {
    return html`
      <div class="item-checklist">
        ${this.orderItems.map((item, idx) => html`
          <div class="checklist-item-wrapper">
            <!-- 항목 행 -->
            <div
              class="checklist-item ${item._picked ? 'completed' : ''} ${idx === this.currentItemIndex ? 'active' : ''}"
              @click="${() => this._focusItem(idx)}"
            >
              <div class="icon">
                ${item._picked ? '\u2713' : idx === this.currentItemIndex ? '\u2192' : '\u2610'}
              </div>
              <div class="sku-info">
                <div class="sku-name">
                  ${item.sku_nm} - ${item.sku_cd}
                  ${item.parent_item_id ? html`<span class="realloc-badge">재할당</span>` : ''}
                </div>
                <div class="qty">
                  ${item.picked_qty || 0} / ${item.alloc_qty || item.req_qty || 0} EA
                  ${item.src_loc_cd ? html` | <strong>${item.src_loc_cd}</strong>` : ''}
                </div>
              </div>
              <!-- 재할당/피킹취소 액션 -->
              ${this._renderItemActions(item)}
              <!-- 재고 상세 토글 버튼 -->
              <button
                class="toggle-detail-btn ${this.expandedItems[idx] ? 'expanded' : ''}"
                @click="${e => this._toggleItemDetail(idx, e)}"
                title="재고 상세 보기"
              >${this.expandedItems[idx] ? '\u25B2' : '\u25BC'}</button>
            </div>
            <!-- 재고 상세 패널 (토글 시 표시) -->
            ${this.expandedItems[idx] ? this._renderInvDetailPanel(item) : ''}
          </div>
        `)}
      </div>
    `
  }

  /** 재고 상세 패널 렌더링 — 카드형 레이아웃 (멀티 로케이션 분할배정 지원) */
  _renderInvDetailPanel(item) {
    const barcodes = (item.inv_barcds || item.inv_barcd || item.barcode || '').split(',').filter(Boolean)
    const allocQtys = (item.inv_alloc_qtys || '').split(',').filter(Boolean)
    const locCds = (item.inv_loc_cds || item.src_loc_cd || '').split(',').filter(Boolean)

    const cards = barcodes.length > 0
      ? barcodes.map((bcd, i) => {
          const qty = Number(allocQtys[i] || item.alloc_qty || item.req_qty || 0)
          const loc = locCds[i] || item.src_loc_cd || '-'
          const scanned = !!(item._scannedBarcodes && item._scannedBarcodes.includes(bcd))
          return html`
            <div class="alloc-card ${scanned ? 'scanned' : ''}">
              <div class="alloc-card-top">
                <span class="alloc-barcode">${bcd}</span>
                <span class="alloc-loc">${loc}</span>
                <span class="alloc-badge ${scanned ? 'done' : 'pending'}">
                  ${scanned ? '✓ 스캔완료' : '미스캔'}
                </span>
              </div>
            </div>`
        })
      : html`
          <div class="alloc-card ${item._picked ? 'scanned' : ''}">
            <div class="alloc-card-top">
              <span class="alloc-barcode">-</span>
              <span class="alloc-loc">${item.src_loc_cd || '-'}</span>
              <span class="alloc-badge ${item._picked ? 'done' : 'pending'}">
                ${item._picked ? '✓ 스캔완료' : '미스캔'}
              </span>
            </div>
          </div>`

    return html`
      <div class="inv-detail-panel">
        <div class="alloc-card-list">
          ${cards}
        </div>
      </div>
    `
  }

  _renderPickForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return ''

    const reqQty = item.alloc_qty || item.req_qty || 0
    const barcodes = this._getAllocBarcodes(item)
    const locs = (item.inv_loc_cds || item.src_loc_cd || '').split(',').filter(Boolean)
    const scanned = item._scannedBarcodes || []

    // 현재 아이템의 바코드를 모두 스캔했는지 (피킹 확인 버튼 유도 조건)
    const allBarcodesScanned = barcodes.length > 0 && scanned.length >= barcodes.length

    // 현재 아이템 내 다음 미스캔 바코드의 로케이션 (스캔 전 안내용)
    const nextUnscannedIdx = barcodes.findIndex(b => !scanned.includes(b))
    const currentItemNextLoc = nextUnscannedIdx >= 0
      ? (locs[nextUnscannedIdx] || item.src_loc_cd || '미지정')
      : (item.src_loc_cd || '미지정')

    // 멀티 바코드인 경우에만 스캔 진행 표시
    const scanProgress = barcodes.length > 1
      ? html`<div class="scan-progress">${scanned.length} / ${barcodes.length} 바코드 스캔</div>`
      : ''

    // 로케이션 안내
    // - 아직 미스캔 → 현재 아이템의 스캔할 로케이션 안내
    // - 스캔 직후 → 방금 스캔한 바코드의 로케이션을 표시 (다음으로 넘어가지 않음)
    // - 현재 아이템 전량 스캔 → 피킹 확인 유도 (확인 시 다음 아이템/로케이션으로 이동)
    const lastScanned = scanned.length > 0 ? scanned[scanned.length - 1] : null
    const locLabel = allBarcodesScanned
      ? '피킹 확인을 눌러주세요'
      : '피킹 로케이션'
    const locValue = lastScanned
      ? (this._getLocForBarcode(item, lastScanned) || '미지정')
      : currentItemNextLoc

    return html`
      <div class="current-item-form">
        <div class="title">\u{1F4E6} ${item.sku_nm} (${item.sku_cd})</div>

        <div class="location-guide ${allBarcodesScanned ? 'all-scanned' : ''}">
          <div class="loc-label">${locLabel}</div>
          <div class="loc-value">${locValue}</div>
          ${scanProgress}
        </div>

        <div class="form-group">
          <label>피킹 수량 (바코드 스캔 시 자동 누적)</label>
          <div class="qty-input-group">
            <input
              type="number"
              inputmode="numeric"
              placeholder="0"
              .value="${this.pickQty || ''}"
              @input="${e => { this.pickQty = parseInt(e.target.value) || 0 }}"
            />
            <span class="qty-label">/ ${reqQty} EA</span>
            <button class="pda-btn primary" ?disabled="${this.picking}" @click="${this._confirmPick}">
              ${this.picking ? '처리 중...' : '확인'}
            </button>
          </div>
        </div>
      </div>
    `
  }

  _renderCompletionMessage() {
    return html`
      <div class="completion-card">
        <div class="icon">\u2705</div>
        <div class="message">모든 자재 피킹 완료!</div>
        <div class="sub-message">주문 목록으로 돌아가거나 다음 작업을 진행하세요.</div>
      </div>
    `
  }

  _renderBottomActions() {
    // 전량 완료 시 '피킹 작업 완료'만 표시 (목록 이동은 상단 ◀ 버튼으로 대체)
    return html`
      <div class="bottom-actions">
        <button class="pda-btn success" @click="${this._completeAllPick}">피킹 작업 완료</button>
      </div>
    `
  }

  /* ============================================================
   * 생명주기
   * ============================================================ */

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      // 하드웨어 스캐너 서비스 시작
      if (!this._scannerService) {
        this._scannerService = new HardwareScannerService({
          onScan: barcode => this._handleGlobalScan(barcode)
        })
      }
      this._scannerService.start()

      if (this.screen === 'order-select') {
        await this._refresh()
      }
    } else {
      this._scannerService?.stop()
    }
  }

  /** 페이지 해제 시 스캐너 서비스 정리 */
  pageDisposed(lifecycle) {
    if (this._scannerService) {
      this._scannerService.stop()
      this._scannerService = null
    }
  }

  /** 업데이트 후 — 토스트 표시 시 fadeInOut 애니메이션 재생 보장 (동일 DOM 노드 재사용 대응) */
  updated(changed) {
    super.updated?.(changed)
    if (changed.has('feedbackMsg') && this.feedbackMsg) {
      const el = this.renderRoot?.querySelector('.feedback-toast')
      if (el) {
        el.style.animation = 'none'
        void el.offsetWidth
        el.style.animation = ''
      }
    }
  }

  /* ============================================================
   * 필터 토글
   * ============================================================ */

  /**
   * 상태 필터 토글 — 같은 카드를 다시 클릭하면 전체(ALL)로 복귀
   */
  _toggleFilter(status) {
    if (status === 'ALL') {
      this.filterStatus = 'ALL'
    } else {
      this.filterStatus = this.filterStatus === status ? 'ALL' : status
    }
  }

  /* ============================================================
   * 데이터 조회
   * ============================================================ */

  async _refresh() {
    try {
      this.loading = true
      const data = await ServiceUtil.restGet('vas_trx/monitor/orders', {
        status: 'APPROVED,MATERIAL_READY,IN_PROGRESS,COMPLETED,CLOSED'
      })
      this.orders = data || []
      await this._fetchBomMap(this.orders)
      this.loading = false
    } catch (err) {
      console.error('주문 목록 조회 실패:', err)
      this.orders = []
      this.loading = false
    }
  }

  async _fetchBomMap(orders) {
    const bomIds = [...new Set(orders.map(o => o.vas_bom_id).filter(Boolean))]
    const newBomIds = bomIds.filter(id => !this.bomMap[id])
    if (newBomIds.length === 0) return

    try {
      const results = await Promise.all(
        newBomIds.map(id => ServiceUtil.restGet(`vas_boms/${id}`).catch(() => null))
      )
      const updated = { ...this.bomMap }
      results.forEach((bom, i) => { if (bom) updated[newBomIds[i]] = bom })
      this.bomMap = updated
    } catch (err) {
      console.error('BOM 조회 실패:', err)
    }
  }

  async _fetchOrderItems(orderId) {
    try {
      const data = await ServiceUtil.restGet(`vas_trx/vas_orders/${orderId}/items`)
      this.orderItems = (data || []).map(item => {
        const isPicked = item.pick_status === 'PICKED'
          || ['PICKED', 'IN_USE', 'COMPLETED'].includes(item.status)
          || (item.picked_qty > 0 && item.picked_qty >= (item.alloc_qty || item.req_qty))
        // 이미 피킹 완료된 경우(PC 피킹 포함) 모든 할당 바코드를 스캔 완료로 처리
        const allBarcodes = (item.inv_barcds || item.inv_barcd || item.barcode || '')
          .split(',').filter(Boolean)
        return {
          ...item,
          _picked: isPicked,
          _pickedQty: item.picked_qty || 0,
          _scannedBarcodes: isPicked ? allBarcodes : []
        }
      })

      this.currentItemIndex = this.orderItems.findIndex(i => !i._picked)
      if (this.currentItemIndex >= 0) {
        this._initPickForm()
      }

      // 토글 기본값: 모든 항목 열린 상태
      const expanded = {}
      this.orderItems.forEach((_, idx) => { expanded[idx] = true })
      this.expandedItems = expanded
    } catch (err) {
      console.error('자재 항목 조회 실패:', err)
      this.orderItems = []
    }
  }

  /* ============================================================
   * 주문 선택 / 화면 전환
   * ============================================================ */

  async _selectOrder(order) {
    this.selectedOrder = order
    this.screen = 'pick-work'
    this.expandedItems = {}
    await this._fetchOrderItems(order.id)

    // 능동적 안내: 주문 선택 후 첫 자재 피킹 안내
    if (this.currentItemIndex >= 0) {
      const item = this.orderItems[this.currentItemIndex]
      voiceService.guide(`주문 ${order.vas_no} 선택. ${item.sku_nm || item.sku_cd} 재고 바코드를 스캔해주세요`)
    } else {
      voiceService.guide(`주문 ${order.vas_no} 선택. 모든 자재가 이미 피킹 완료되었습니다`)
    }
  }

  _backToOrderSelect() {
    this.screen = 'order-select'
    this.selectedOrder = null
    this.orderItems = []
    this.currentItemIndex = -1
    this.expandedItems = {}
    this._refresh()
  }

  /* ============================================================
   * 바코드 스캔 처리
   * ============================================================ */

  /** 주문번호 바코드 스캔 — 오늘 목록에 없으면 날짜 무관 API 추가 조회 */
  async _onScanSearch() {
    const value = (this.scanValue || '').trim()
    if (!value) return

    // 1. 오늘 목록에서 먼저 탐색
    const found = this.orders.find(o => o.vas_no === value || o.id === value)
    if (found) {
      this._selectOrder(found)
      this.scanValue = ''
      return
    }

    // 2. 오늘 목록에 없으면 날짜 무관 API 조회
    try {
      const order = await ServiceUtil.restGet('vas_trx/vas_orders/find_by_no', { vas_no: value })
      if (order) {
        await this._fetchBomMap([order])
        this._selectOrder(order)
        this.scanValue = ''
      } else {
        this._showFeedback('주문을 찾을 수 없습니다', 'error')
        voiceService.error('주문을 찾을 수 없습니다')
      }
    } catch (e) {
      this._showFeedback('주문을 찾을 수 없습니다', 'error')
      voiceService.error('주문을 찾을 수 없습니다')
    }
  }

  /** 아이템의 모든 할당 바코드 목록을 배열로 반환 */
  _getAllocBarcodes(item) {
    return (item.inv_barcds || item.inv_barcd || item.barcode || '').split(',').filter(Boolean)
  }

  /** 재고 바코드 스캔 처리 — 스캔마다 해당 바코드의 할당수량을 pickQty에 자동 누적 */
  _onInventoryBarcodeScan(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return

    // 미피킹 항목 중 해당 바코드를 가진 항목 탐색
    const matchIdx = this.orderItems.findIndex(
      item => !item._picked && this._getAllocBarcodes(item).includes(trimmed)
    )

    if (matchIdx >= 0) {
      const items = [...this.orderItems]
      const item = items[matchIdx]
      const prevScanned = item._scannedBarcodes || []

      // 이미 스캔한 바코드인지 확인
      if (prevScanned.includes(trimmed)) {
        this._showFeedback('이미 스캔한 바코드입니다', 'info')
        voiceService.warning('이미 스캔한 바코드입니다')
        this._refocusBarcodeInput('.scan-input ox-input-barcode')
        return
      }

      // 스캔된 바코드 기록 추가
      const scanned = [...prevScanned, trimmed]
      items[matchIdx] = { ...item, _scannedBarcodes: scanned }
      this.orderItems = items

      // 현재 아이템으로 포커스 이동 후 pickQty 누적 재계산
      this.currentItemIndex = matchIdx
      this._initPickForm()  // 스캔 누적 기반 pickQty 재계산

      const barcodes = this._getAllocBarcodes(items[matchIdx])
      const loc = this._getLocForBarcode(items[matchIdx], trimmed)
      const addedQty = this._getAllocQtyForBarcode(items[matchIdx], trimmed)
      this._showFeedback(
        `${items[matchIdx].sku_cd} +${addedQty}EA → 누계 ${this.pickQty}EA (${scanned.length}/${barcodes.length} 스캔)`,
        'success'
      )
      voiceService.success(`${addedQty}개 추가. 총 ${this.pickQty}개`)
    } else {
      const alreadyPicked = this.orderItems.find(
        item => item._picked && this._getAllocBarcodes(item).includes(trimmed)
      )
      if (alreadyPicked) {
        this._showFeedback('이미 피킹 완료된 재고입니다', 'info')
        voiceService.warning('이미 피킹 완료된 재고입니다')
      } else {
        this._showFeedback('해당 재고를 찾을 수 없습니다', 'error')
        voiceService.error('재고를 찾을 수 없습니다')
      }
    }

    // 연속 스캔을 위한 자동 재포커스
    this._refocusBarcodeInput('.scan-input ox-input-barcode')
  }

  /** 스캔된 바코드에 해당하는 로케이션 반환 */
  _getLocForBarcode(item, barcode) {
    const barcodes = (item.inv_barcds || item.inv_barcd || item.barcode || '').split(',').filter(Boolean)
    const locs = (item.inv_loc_cds || item.src_loc_cd || '').split(',').filter(Boolean)
    const idx = barcodes.indexOf(barcode)
    return idx >= 0 ? (locs[idx] || item.src_loc_cd) : item.src_loc_cd
  }

  /* ============================================================
   * 피킹 처리
   * ============================================================ */

  async _confirmPick() {
    if (this.picking) return  // 이중 클릭 방지

    const item = this.orderItems[this.currentItemIndex]
    if (!item) return

    const reqQty = item.alloc_qty || item.req_qty || 0
    const pickQty = this.pickQty || 0
    const barcodes = this._getAllocBarcodes(item)
    const scanned = item._scannedBarcodes || []

    // 수량 검증 — 재고 0(현물 없음)이면 0 피킹 확정도 허용, 초과만 차단
    if (pickQty < 0) {
      this._showFeedback('수량은 0 이상이어야 합니다', 'error')
      voiceService.error('수량을 확인해주세요')
      return
    }
    if (pickQty > reqQty) {
      this._showFeedback('요청 수량을 초과할 수 없습니다', 'error')
      voiceService.warning('요청 수량을 초과합니다')
      return
    }

    // 현물이 할당보다 적으면 부족 확정 (부족분은 백엔드가 자동 FEFO 재할당)
    const isShort = pickQty < reqQty

    // 전량 피킹인 경우에만 모든 할당 바코드 스캔을 강제한다.
    // 부족 확정은 수동 수량 입력으로 진행하므로 바코드 전량 스캔을 요구하지 않는다.
    if (!isShort && barcodes.length > 0 && scanned.length < barcodes.length) {
      this._showFeedback(`모든 재고 바코드를 스캔해주세요 (${scanned.length}/${barcodes.length})`, 'error')
      voiceService.error('모든 재고 바코드를 스캔해주세요')
      return
    }

    this.picking = true  // 버튼 잠금
    try {
      await ServiceUtil.restPost(`vas_trx/vas_order_items/${item.id}/pick`, {
        pickedQty: pickQty
      })

      if (isShort) {
        this._showFeedback(`${pickQty}EA 피킹 · 부족 ${reqQty - pickQty}EA 자동 재할당`, 'success')
        voiceService.success(`${pickQty}개 피킹, 부족분 재할당`)
      } else {
        this._showFeedback('피킹 완료', 'success')
        voiceService.success('피킹 완료')
      }

      // 부족 시 재할당 아이템이 새로 생성되므로 목록을 재조회하여 반영
      await this._fetchOrderItems(this.selectedOrder.id)

      setTimeout(() => {
        this.picking = false
        if (this.currentItemIndex < 0) {
          this._showFeedback('모든 자재 피킹 완료!', 'success')
        }
      }, 200)
    } catch (err) {
      // 재고 소진 등으로 재할당 실패 시 백엔드 트랜잭션이 롤백되어 피킹이 확정되지 않는다.
      this._showFeedback(err.message || '피킹 실패', 'error')
      voiceService.error(err.message || '피킹 실패')
      this.picking = false  // 실패 시에도 즉시 잠금 해제
    }
  }

  _focusItem(idx) {
    const item = this.orderItems[idx]
    if (item._picked) {
      this._showFeedback('이미 피킹 완료된 항목입니다', 'info')
      return
    }
    this.currentItemIndex = idx
    this._initPickForm()
  }

  _moveToNextItem() {
    const nextIndex = this.orderItems.findIndex(
      (item, idx) => idx > this.currentItemIndex && !item._picked
    )

    if (nextIndex >= 0) {
      this.currentItemIndex = nextIndex
      this._initPickForm()
      this._guideNextItem(nextIndex)
    } else {
      const wrapIndex = this.orderItems.findIndex(item => !item._picked)
      if (wrapIndex >= 0) {
        this.currentItemIndex = wrapIndex
        this._initPickForm()
        this._guideNextItem(wrapIndex)
      } else {
        this.currentItemIndex = -1
        this._showFeedback('모든 자재 피킹 완료!', 'success')
        voiceService.success('모든 자재 피킹 완료. 피킹 작업 완료 버튼을 눌러주세요')
      }
    }
  }

  /** 피킹 폼 초기화 — 이미 스캔된 바코드가 있으면 누적 수량부터 재개, 없으면 0 */
  _initPickForm() {
    const item = this.orderItems[this.currentItemIndex]
    if (!item) return

    const scannedBarcodes = item._scannedBarcodes || []
    const barcodes = this._getAllocBarcodes(item)
    const totalQty = item.alloc_qty || item.req_qty || 0

    if (scannedBarcodes.length === 0) {
      this.pickQty = 0
      return
    }

    // 모든 바코드를 스캔하면 총 할당수량으로 확정 (균등분배 floor 누락 방지)
    if (barcodes.length > 0 && scannedBarcodes.length >= barcodes.length) {
      this.pickQty = totalQty
      return
    }

    // 부분 스캔: 스캔된 바코드들의 할당수량만 합산
    let total = 0
    scannedBarcodes.forEach(bcd => {
      total += this._getAllocQtyForBarcode(item, bcd)
    })
    this.pickQty = total
  }

  /** 특정 바코드에 해당하는 할당 수량 반환 */
  _getAllocQtyForBarcode(item, barcode) {
    const barcodes = this._getAllocBarcodes(item)
    const qtys = (item.inv_alloc_qtys || '').split(',').filter(Boolean)
    const totalQty = item.alloc_qty || item.req_qty || 0
    const idx = barcodes.indexOf(barcode)
    if (idx >= 0 && qtys[idx]) return parseInt(qtys[idx])
    if (barcodes.length === 0) return totalQty
    // inv_alloc_qtys 없으면 균등 분배 — 나머지는 마지막 바코드에 배정해 합계 보존
    const base = Math.floor(totalQty / barcodes.length)
    const remainder = totalQty - base * barcodes.length
    return idx === barcodes.length - 1 ? base + remainder : base
  }

  _completeAllPick() {
    this._showFeedback('피킹 작업 완료!', 'success')
    voiceService.success('피킹 작업이 완료되었습니다')

    setTimeout(() => {
      this._backToOrderSelect()
    }, 1500)
  }

  /* ============================================================
   * 하드웨어 스캐너 전역 핸들링
   * ============================================================ */

  /** 전역 스캔 라우팅 — 주문 선택 또는 피킹 작업 컨텍스트에 따라 분기 */
  _handleGlobalScan(barcode) {
    if (this.screen === 'order-select') {
      this.scanValue = barcode
      this._onScanSearch()
    } else {
      this._onInventoryBarcodeScan(barcode)
    }
  }

  /** 항목 재고 상세 토글 — 이벤트 버블링 차단 후 토글 상태 변경 */
  _toggleItemDetail(idx, event) {
    event.stopPropagation()
    const updated = { ...this.expandedItems }
    updated[idx] = !updated[idx]
    this.expandedItems = updated
  }

  /** 스캔 처리 후 OxInputBarcode 입력에 자동 재포커스 */
  _refocusBarcodeInput(selector) {
    requestAnimationFrame(() => {
      const el = this.renderRoot.querySelector(selector)
      if (el) {
        const input = el.renderRoot?.querySelector('input')
        if (input) {
          input.value = ''
          input.focus()
        }
      }
    })
  }

  /* ============================================================
   * 유틸리티
   * ============================================================ */

  _vasTypeLabel(type) {
    const map = {
      SET_ASSEMBLY: '세트구성',
      DISASSEMBLY: '세트해체',
      REPACK: '재포장',
      LABEL: '라벨링',
      CUSTOM: '기타'
    }
    return map[type] || type || '-'
  }

  _statusLabel(status) {
    const map = {
      APPROVED: '주문 확정',
      MATERIAL_READY: '자재 준비 완료',
      IN_PROGRESS: '작업 중',
      COMPLETED: '완료',
      CLOSED: '마감'
    }
    return map[status] || status || '-'
  }

  _showFeedback(msg, type = 'info') {
    this.feedbackMsg = msg
    this.feedbackType = type
    if (this._feedbackTimer) clearTimeout(this._feedbackTimer)
    this._feedbackTimer = setTimeout(() => {
      this.feedbackMsg = ''
      this.feedbackType = ''
    }, 2000)
  }

  /** 음성 안내 ON/OFF 토글 */
  _toggleVoice() {
    this.voiceEnabled = voiceService.toggle()
    this._showFeedback(this.voiceEnabled ? '음성 안내 ON' : '음성 안내 OFF', 'info')
  }

  /** 다음 자재 능동적 음성 안내 */
  _guideNextItem(idx) {
    const item = this.orderItems[idx]
    if (!item) return
    voiceService.guide(`다음 자재. ${item.sku_nm || item.sku_cd}. ${item.src_loc_cd || ''} 로케이션`)
  }
}

window.customElements.define('vas-pda-pick', VasPdaPick)
