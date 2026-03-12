# 프론트엔드 코드 품질 체크리스트

> 최종 업데이트: 2026-03-12
> 기준: [frontend-quality.md](frontend-quality.md) 분석 결과

이 문서는 프론트엔드 코드 품질 개선 작업의 진행 상황을 추적하기 위한 체크리스트입니다.

---

## 📊 전체 현황

| 우선순위 | 총 항목 | 완료 | 진행 중 | 미착수 | 완료율 |
|---------|--------|------|---------|--------|--------|
| 🔴 P1 | 3 | 0 | 0 | 3 | 0% |
| 🟡 P2 | 4 | 0 | 0 | 4 | 0% |
| 🟢 P3 | 2 | 0 | 0 | 2 | 0% |
| **합계** | **9** | **0** | **0** | **9** | **0%** |

---

## 🔴 P1 - 최우선 (Critical)

### 1. TypeScript `any` 타입 구체화 (주요 파일)

- [ ] **pda-wms-shipment-quantity.ts (25회 사용)**
  - 파일: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-quantity.ts`
  - [ ] `_orderList: any[]` → `_orderList: Order[]` (interface 정의)
  - [ ] `_orderItemList: any[]` → `_orderItemList: OrderItem[]`
  - [ ] `_shippingOrderList: any[]` → `_shippingOrderList: ShippingOrder[]`
  - [ ] `_locationList: any[]` → `_locationList: Location[]`
  - [ ] 나머지 21개 any 타입 구체화

- [ ] **inventory-product-change.ts (18회 사용)**
  - 파일: `frontend/packages/operato-wes/client/pages/inventory/inventory-product-change.ts`
  - [ ] `_orderList: any` → `_orderList: Order[]`
  - [ ] `_orderItemList: any` → `_orderItemList: OrderItem[]`
  - [ ] `gristConfig: any` → `gristConfig: GristConfig`
  - [ ] 나머지 15개 any 타입 구체화

- [ ] **pda-wms-peer-to-peer-popup.ts**
  - 파일: `frontend/packages/operato-wes/client/pages/pda/pda-wms-peer-to-peer-popup.ts`
  - [ ] 상태 관리 프로퍼티 any 타입 구체화 (다수)

- [ ] **terminology-page.ts**
  - 파일: `frontend/packages/operato-wes/client/pages/terminology/terminology-page.ts:42`
  - [ ] `gristConfig: any` → `gristConfig: GristConfig`
  - [ ] `patchField: any` → 적절한 타입 정의

- [ ] **terminology-mutation.ts (서버 코드)**
  - 파일: `frontend/packages/operato-wes/server/graphql/terminology-mutation.ts`
  - [ ] `context: any` → `context: GraphQLContext` (interface 정의)
  - [ ] `patch: any` → `patch: TerminologyPatch`
  - [ ] 모든 GraphQL resolver에 타입 적용

- [ ] **공통 타입 정의 파일 생성**
  - [ ] `frontend/packages/operato-wes/client/types/index.ts` 생성
  - [ ] Order, OrderItem, Location 등 공통 interface 정의
  - [ ] GristConfig, GraphQLContext 등 설정 타입 정의

**영향도**: 매우 높음 | **난이도**: 중간
**예상 소요**: 2-3주

---

### 2. console.log 제거 (프로덕션 빌드 설정)

- [ ] **프로덕션 코드 console.log 제거**
  - [ ] `operatofill/client/operatofill.ts:428` — `console.log(err)` 제거 또는 Logger로 교체
  - [ ] `pda-wms-peer-to-peer-popup.ts:568` — `console.log(this.peerModel)` 제거
  - [ ] `pda-wms-transfer-in-barcode.ts:590` — `console.log(this._showOrderList)` 제거
  - [ ] `pda-wms-shipment-barcode-manually.ts:617` — `console.log(tempOrderList)` 제거
  - [ ] `pda-wms-shipment-barcode-manually.ts:823` — `console.log(this._pickedInfo)` 제거

- [ ] **주석 처리된 console.log 제거**
  - [ ] `metapage/client/mixin/meta-util-mixin.js:428` — 주석 코드 삭제

- [ ] **빌드 설정 개선**
  - [ ] Terser 설정에 `drop_console: true` 추가
  - [ ] 또는 rollup-plugin-strip 설치 및 설정
  - [ ] 프로덕션 빌드 시 자동 제거 확인

- [ ] **Logger 클래스 도입 (선택)**
  - [ ] `frontend/packages/metapage/client/utils/logger.ts` 생성
  - [ ] 환경별 로그 레벨 설정 (개발: debug, 운영: error)
  - [ ] console.log 대신 Logger.debug() 사용

**영향도**: 중간 | **난이도**: 낮음
**관련 파일**: 위 명시된 파일들 + 빌드 설정
**예상 소요**: 2-3일

---

### 3. 큰 파일 분리 (PDA 페이지 1,000줄+)

- [ ] **meta-ui-util.js (1,628줄) 분리**
  - 파일: `frontend/packages/metapage/client/utils/meta-ui-util.js`
  - [ ] 함수별 분석 및 카테고리 분류
  - [ ] form 관련 → `meta-form-util.js`
  - [ ] grid 관련 → `meta-grid-util.js`
  - [ ] validation 관련 → `meta-validation-util.js`
  - [ ] UI 렌더링 → `meta-render-util.js`

- [ ] **pda-wms-shipment-barcode-manually.ts (1,444줄) 분리**
  - 파일: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-barcode-manually.ts`
  - [ ] 비즈니스 로직 → `shipment-barcode-service.ts`
  - [ ] UI 렌더링 → 컴포넌트 메서드로 유지
  - [ ] 유틸리티 함수 → `shipment-barcode-utils.ts`
  - [ ] 이벤트 핸들러 → Mixin 또는 별도 클래스

- [ ] **pda-wms-transfer-in-barcode.ts (1,409줄) 분리**
  - 파일: `frontend/packages/operato-wes/client/pages/pda/pda-wms-transfer-in-barcode.ts`
  - [ ] 비즈니스 로직 → `transfer-in-service.ts`
  - [ ] UI 렌더링 → 컴포넌트 메서드로 유지
  - [ ] 유틸리티 함수 → `transfer-in-utils.ts`

- [ ] **pda-wms-transfer-out-barcode.ts (1,323줄) 분리**
  - 파일: `frontend/packages/operato-wes/client/pages/pda/pda-wms-transfer-out-barcode.ts`
  - [ ] 비즈니스 로직 → `transfer-out-service.ts`
  - [ ] UI 렌더링 → 컴포넌트 메서드로 유지

- [ ] **pda-wms-shipment-barcode.ts (1,216줄) 분리**
  - 파일: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-barcode.ts`
  - [ ] 공통 로직을 shipment-barcode-manually.ts와 공유

- [ ] **pda-wms-shipment-quantity.ts (1,205줄) 분리**
  - 파일: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-quantity.ts`
  - [ ] 수량 계산 로직 → `quantity-calculator.ts`
  - [ ] 비즈니스 로직 → `shipment-quantity-service.ts`

- [ ] **inventory-product-change.ts (1,141줄) 분리**
  - 파일: `frontend/packages/operato-wes/client/pages/inventory/inventory-product-change.ts`
  - [ ] 재고 변경 로직 → `inventory-change-service.ts`
  - [ ] 제품 관리 로직 → `product-manager.ts`

**영향도**: 높음 | **난이도**: 높음
**예상 소요**: 4-6주

---

## 🟡 P2 - 중요 (High)

### 4. 환경 설정 환경변수화 (config.*.js)

- [ ] **config.development.js 환경변수화**
  - 파일: `frontend/packages/operato-wes/config/config.development.js`
  - [ ] `port: 5907` → `port: process.env.PORT || 5907`
  - [ ] `baseUrl: 'http://localhost:9191/rest'` → `baseUrl: process.env.API_BASE_URL || '...'`
  - [ ] DB 설정도 환경변수화

- [ ] **config.production.js 환경변수화**
  - 파일: `frontend/packages/operato-wes/config/config.production.js`
  - [ ] `port` 환경변수화
  - [ ] `baseUrl` 환경변수화

- [ ] **operatofill config 환경변수화**
  - 파일: `frontend/packages/operatofill/config/config.development.js`
  - 파일: `frontend/packages/operatofill/config/config.production.js`
  - [ ] `baseUrl: 'http://localhost:9500/rest'` → 환경변수

- [ ] **.env 파일 템플릿 생성**
  - [ ] `frontend/.env.example` 생성
  - [ ] 필요한 환경변수 목록 작성
  - [ ] README에 환경변수 설정 방법 추가

**영향도**: 중간 | **난이도**: 낮음
**관련 파일**: `frontend/packages/*/config/*.js`
**예상 소요**: 1-2일

---

### 5. TODO 주석 이슈 트래커 이관

- [ ] **operato-wes TODO 항목**
  - [ ] `terminology-page.ts:209` — sub-view 구현 (이슈 생성)
  - [ ] `gi-barcode-manual-pick.js:183` — 바코드 팝업 (이슈 생성)

- [ ] **metapage TODO 항목**
  - [ ] `meta-ui-util.js:443` — Tooltip 구현 (이슈 생성)
  - [ ] `meta-ui-util.js:522` — getCodeByCustomService 구현 (이슈 생성)
  - [ ] `meta-pda-search-input-change-handler-mixin.js:473` — 테스트 필요 (이슈 생성)
  - [ ] `meta-mobile-grist-mixin.js:54` — 리셋 필드 제외 처리 (이슈 생성)

- [ ] **이슈 트래커 설정**
  - [ ] GitHub Issues 또는 Jira에 "기술 부채" 라벨 생성
  - [ ] 각 TODO를 이슈로 등록
  - [ ] 코드에 이슈 번호 링크 추가 (`// TODO: #123 - 설명`)

**영향도**: 낮음 | **난이도**: 낮음
**예상 소요**: 1일

---

### 6. 주석 처리된 코드 정리

- [ ] **pda-wms-peer-to-peer-popup.ts**
  - [ ] Line 11: logo URL 주석 코드 검토 및 삭제
  - [ ] Line 566: `this._workOrderInfo` 주석 코드 검토
  - [ ] Line 803: `this._totalOnloadMaterialGrist.fetch()` 검토
  - [ ] Lines 817-820: scanGrist.data 주석 코드 검토 및 삭제

- [ ] **pda-wms-peer-to-peer.ts**
  - [ ] Line 11: logo URL 주석 코드 검토
  - [ ] Line 562: `this._lotGrist.fetch()` 검토

- [ ] **inventory-product-change.ts**
  - [ ] Lines 521-523: LPN 입력 관련 주석 코드 검토

- [ ] **metapage/client/mixin/meta-util-mixin.js**
  - [ ] Lines 427-430: attributeChangedCallback 주석 코드 삭제

- [ ] **Git 히스토리 활용**
  - [ ] 각 주석 코드의 삭제 이유 확인
  - [ ] 필요 없으면 완전 삭제, 필요하면 복구

**영향도**: 낮음 | **난이도**: 낮음
**관련 파일**: 위 명시된 파일들
**예상 소요**: 2일

---

### 7. 중복 import 패턴 개선

- [ ] **PdaPageBase 베이스 클래스 생성**
  - [ ] `frontend/packages/operato-wes/client/pages/pda/base/pda-page-base.ts` 생성
  - [ ] 공통 import 통합:
    ```typescript
    import { PropertyValues, html, css } from 'lit'
    import { customElement, property, query, state } from 'lit/decorators.js'
    import { connect } from 'pwa-helpers/connect-mixin.js'
    import { ServiceUtil, ValueUtil, TermsUtil, UiUtil, OperatoUtil } from '@operato-app/metapage/dist-client'
    import { store, PageView } from '@operato/shell'
    import { i18next, localize } from '@operato/i18n'
    import { CommonButtonStyles, CommonGristStyles, CommonHeaderStyles } from '@operato/styles'
    ```
  - [ ] 공통 메서드 추출 (fetch 패턴, 에러 처리 등)

- [ ] **PDA 페이지들을 PdaPageBase 상속으로 변경**
  - [ ] pda-wms-shipment-quantity.ts
  - [ ] pda-wms-shipment-barcode.ts
  - [ ] pda-wms-shipment-barcode-manually.ts
  - [ ] pda-wms-transfer-in-barcode.ts
  - [ ] pda-wms-transfer-out-barcode.ts
  - [ ] pda-wms-peer-to-peer-popup.ts
  - [ ] 기타 PDA 페이지 10개 이상

- [ ] **공통 Mixin 추출**
  - [ ] DataFetchMixin — 데이터 로딩 공통 패턴
  - [ ] ValidationMixin — 입력 검증 공통 패턴
  - [ ] ErrorHandlingMixin — 에러 처리 공통 패턴

**영향도**: 중간 | **난이도**: 중간
**예상 소요**: 1주

---

## 🟢 P3 - 개선 (Medium)

### 8. 테스트 코드 작성 (유틸리티 함수)

- [ ] **ServiceUtil 단위 테스트**
  - 파일: `frontend/packages/metapage/client/utils/service-util.js`
  - [ ] `restGet()` 테스트
  - [ ] `restPost()` 테스트
  - [ ] `restPut()` 테스트
  - [ ] `restDelete()` 테스트
  - [ ] 에러 처리 테스트

- [ ] **ValueUtil 단위 테스트**
  - [ ] isEmpty() 테스트
  - [ ] newMap() 테스트
  - [ ] 기타 유틸리티 메서드 테스트

- [ ] **OperatoUtil 단위 테스트**
  - [ ] WMS 관련 유틸리티 함수 테스트

- [ ] **테스트 프레임워크 설정**
  - [ ] Vitest 또는 Jest 설치
  - [ ] 테스트 스크립트 추가 (`package.json`)
  - [ ] CI/CD에 테스트 추가

**영향도**: 높음 | **난이도**: 높음
**예상 소요**: 2-3주

---

### 9. 컴포넌트 책임 분리 (비즈니스 로직 추출)

- [ ] **Service 레이어 생성**
  - [ ] `frontend/packages/operato-wes/client/services/` 디렉토리 생성
  - [ ] PickingService.ts — 피킹 비즈니스 로직
  - [ ] ShipmentService.ts — 출하 비즈니스 로직
  - [ ] InventoryService.ts — 재고 비즈니스 로직
  - [ ] TransferService.ts — 재고 이동 비즈니스 로직

- [ ] **PDA 컴포넌트 리팩토링**
  - [ ] pda-wms-shipment-barcode-manually.ts
    - [ ] 비즈니스 로직 → ShipmentService로 이동
    - [ ] 컴포넌트는 UI 렌더링과 이벤트 핸들링만
  - [ ] pda-wms-transfer-in-barcode.ts
    - [ ] 비즈니스 로직 → TransferService로 이동
  - [ ] inventory-product-change.ts
    - [ ] 비즈니스 로직 → InventoryService로 이동

- [ ] **단일 책임 원칙 적용**
  - [ ] 각 컴포넌트 역할 명확화
  - [ ] 비즈니스 로직과 UI 로직 완전 분리
  - [ ] 재사용 가능한 Service 구조

**영향도**: 높음 | **난이도**: 높음
**예상 소요**: 4-6주

---

## 📋 진행 상황 업데이트 가이드

### 체크리스트 업데이트 방법

1. **작업 시작 시**
   - [ ] → [진행 중] 으로 표시
   - 전체 현황 테이블의 "진행 중" 개수 증가

2. **작업 완료 시**
   - [진행 중] → [x] 으로 표시
   - 전체 현황 테이블의 "완료" 개수 증가
   - 완료율 재계산

3. **하위 항목**
   - 모든 하위 항목이 완료되면 상위 항목도 완료 처리

### 완료율 계산

```
완료율 = (완료 항목 수 / 총 항목 수) × 100
```

---

## 🎯 마일스톤

### Phase 1: 긴급 개선 (2-3주)
- [ ] P1-2: console.log 제거 (프로덕션 빌드 설정)
- [ ] P2-4: 환경 설정 환경변수화
- [ ] P2-5: TODO 주석 이슈 트래커 이관
- [ ] P2-6: 주석 처리된 코드 정리

### Phase 2: 타입 안정성 개선 (3-4주)
- [ ] P1-1: TypeScript `any` 타입 구체화 (주요 파일)
- [ ] 공통 타입 정의 파일 생성
- [ ] Interface 문서화

### Phase 3: 아키텍처 개선 (6-8주)
- [ ] P1-3: 큰 파일 분리 (PDA 페이지)
- [ ] P2-7: 중복 import 패턴 개선
- [ ] PdaPageBase 베이스 클래스 생성

### Phase 4: 테스트 및 책임 분리 (8-12주)
- [ ] P3-8: 테스트 코드 작성 (유틸리티 함수)
- [ ] P3-9: 컴포넌트 책임 분리 (비즈니스 로직 추출)
- [ ] Service 레이어 구축

---

## 🎨 긍정적 측면 (유지)

다음 좋은 패턴들은 유지하고 확장해야 합니다:

✅ **중앙화된 API 통신** — `ServiceUtil` 패턴 계속 사용
✅ **스타일 재사용** — `CommonGristStyles` 등 공통 스타일
✅ **국제화(i18n)** — `i18next` + `localize` 데코레이터
✅ **Redux 상태 관리** — `connect(store)` 패턴
✅ **웹 컴포넌트** — Lit-Element 표준 준수

---

**다음 리뷰**: 2주 후
**책임자**: 프론트엔드 팀 리드
**관련 문서**: [frontend-quality.md](frontend-quality.md)
