# Operato WMS — 서비스 오픈 WBS

> 작성일: 2026-04-17  
> 기준: 서비스 오픈까지 약 3주 잔여  
> 제외 범위: `operato.wms.outbound` 모듈 (OMS + Fulfillment 모듈로 대체)

---

## 목차

1. [현황 요약](#1-현황-요약)
2. [Week 1 — 오픈 필수 (Critical)](#2-week-1--오픈-필수-critical)
3. [Week 2~3 — 오픈 전 완성 (Required)](#3-week-23--오픈-전-완성-required)
4. [오픈 후 즉시 (Hot-fix / Quick-win)](#4-오픈-후-즉시-hot-fix--quick-win)
5. [중기 (1~3개월)](#5-중기-13개월)
6. [장기 (3개월 이후)](#6-장기-3개월-이후)

---

## 1. 현황 요약

### 모듈별 완성도

| 모듈 | 백엔드 | 프론트엔드 | 비고 |
|------|--------|------------|------|
| **BASE** (기준정보) | 95% | 70% | 신규 필드 추가됨, 화면 미반영 |
| **INBOUND** (입고) | 80% | 60% | 유통기한 계산, 검수반려 미구현 |
| **STOCK** (재고) | 70% | 40% | 프론트 페이지 대부분 미구현 |
| **OMS** (주문관리) | 75% | 80% | 자동 웨이브, 취소 백프로세스 미구현 |
| **FULFILLMENT** (피킹/포장) | 80% | 85% | B2B 피킹, 재고부족 처리 미구현 |
| **VAS** (유통가공) | 65% | 75% | 재고 처리 로직 미구현 |
| **RWA** (반품) | 70% | 80% | 테스트 미완료, SKU명 조회 미구현 |

### 핵심 미구현 목록 (요약)

```
[백엔드]
- InventoryTransactionService TODO 3건 미구현
- StocktakeController 재고실사 상태 자동화 3건
- VasBom 번호 채번 로직
- VasTransactionService 재고 처리 로직
- RwaOrderItem SKU명 자동 조회
- InventoryDashboardService 부족재고 계산
- OMS 웨이브 자동 할당 / 백 프로세스
- 보충 지시 → 재고 트랜잭션 연결
- 재고 할당 시 피킹존 제한 로직

[프론트엔드]
- stock/ 페이지 디렉토리 미구현
- 수불 현황 화면 미구현
- 재고 실사 화면 개선 필요
- 사용자-화주사 매핑 컴포넌트
- DB 마이그레이션 파일 전무
```

---

## 2. Week 1 — 오픈 필수 (Critical)

> 이것이 없으면 오픈 불가. 반드시 1주 내 완료.  
> 기간: 2026-04-17 ~ 2026-04-24

### 2-1. [STOCK] 재고 트랜잭션 핵심 로직 완성

**담당 모듈**: `operato.wms.stock.service.StockTransactionService`

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-S-1 | 재고 할당 피킹존 제한 | 재고 할당 시 `loc_type = PICKABLE` 로케이션에서만 할당하도록 쿼리 수정 | `StockTransactionService.searchAvailableInventory()` | 2026-04-18 | 100% | ☑ | StoragePolicy.releaseStrategy 기반 FEFO/FIFO/LIFO 분기, 윈도우함수 needQty 최적화 포함 |
| W1-S-2 | 로케이션 유효성 검증 | 적치/이동 시 `del_flag=false`, `restrict_type` 체크, 혼적 불가 로케이션 검증 추가 | `StockTransactionService.findAndCheckLocation()` | 2026-04-18 | 100% | ☑ | restrictType(MOVE/IN/OUT/SCRAP) 분기, mixableFlag 혼적 체크(`checkMixableLocation()`), RCV-WAIT 존 차단 구현됨 |
| W1-S-3 | 주문 마감 재고 차감 연결 | `OmsShipmentOrderService.close()`에서 `StockTransactionService.closeShipmentInventory()` 호출 연결 | `OmsShipmentOrderService` | 2026-04-19 | 100% | ☑ | `closeShipmentOrder()` → stock_allocations 순회 → `closeShipmentInventory()` 호출 구현됨 |
| W1-S-4 | StockTransactionService TODO 해소 | Line 216 미구현 TODO 처리 | `StockTransactionService.java` | 2026-04-19 | 100% | ☑ | `mergeInventory(Long, InvTransaction)` 구현 완료 (barcode+locCd로 재고 조회 후 병합). allocate/dealloc/split/close 전부 구현됨 |

### 2-2. [OMS] 주문 취소 백 프로세스 최소 구현

**담당 모듈**: `operato.wms.oms`

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-O-1 | 주문 취소 | `REGISTERED, BACK_ORDER → CANCELLED` 상태 복귀 | `OmsShipmentOrderService.cancelShipmentOrders()` | 2026-04-24 | 100% | ☑ | REGISTERED·CONFIRMED·ALLOCATED·BACK_ORDER·WAVED·RELEASED 취소 가능. PICKING·PACKING·SHIPPED·CLOSED·CANCELLED 취소 불가(예외). CONFIRMED 취소 시 confirmed_at null 초기화, WAVED/RELEASED 취소 시 wave_no null 초기화 |
| W1-O-2 | 주문 확정 취소 | `CONFIRMED → REGISTERED` 상태 복귀 | `OmsShipmentOrderService.cancelConfirmShipmentOrders()` | 2026-04-24 | 100% | ☑ | `cancelConfirmShipmentOrders()` 신규 구현, confirmed_at null 초기화. 엔드포인트: `POST /rest/oms_trx/shipment_orders/cancel_confirm`, `cancel_confirm_list`. WmsOmsConstants 훅 상수 추가 |
| W1-O-3 | 주문 할당 해제 | `ALLOCATED → CONFIRMED` 상태 복귀, 할당 재고 해제 | `OmsShipmentOrderService.deallocateShipmentOrder()` | 2026-04-20 | 100% | ☑ | stock_allocations 순회 → deallocateInventory() 호출, 주문 상태 REGISTERED 복귀 구현됨 |
| W1-O-4 | 웨이브 확정 취소 | 웨이브 상태 `RELEASED → CREATED`, 소속 주문 상태 복귀, 피킹 지시 삭제 | `OmsWaveService.cancelWaveRelease()` | 2026-04-20 | 100% | ☑ | `cancelWaveRelease()` (WAVE RELEASED→CREATED), Wave 소속 주문 RELEASED/PICKING → WAVED 변경, WaveCancelledEvent 발행 → FulfillmentEventListener 피킹 지시 삭제 연동 |
| W1-O-5 | 웨이브 취소 | 웨이브 상태 `CREATED → CANCELLED`, 소속 주문의 상태 복귀 | `OmsWaveService.cancelWave()` | 2026-04-20 | 100% | ☑ | `cancelWave()` (WAVE CREATED→CANCELLED) 구현, 소속 주문 Wave 정보 NULL, 상태는 ALLOCATED 로 변경됨 |
| W1-O-6 | 주문 마감 취소 | 주문 상태 `CLOSED → SHIPPED`, 재고 차감 복귀 | `OmsShipmentOrderService.cancelCloseShipmentOrder()` | 2026-04-24 | 100% | ☑ | `cancelCloseShipmentOrder()` 신규 구현: stock_allocations(RELEASED→HARD) 복귀, inv_qty·reserved_qty 복원, ShipmentOrder→SHIPPED·closed_at null. 엔드포인트: `POST /rest/oms_trx/shipment_orders/{id}/cancel_close`. WmsOmsConstants 훅 상수 추가 |

### 2-3. [INBOUND] 입고 핵심 보완

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-I-1 | 유통기한 자동 계산 | 제조일 입력 시 SKU 마스터의 `shelfLifeDays` 기반 유통기한 자동 계산 | `InboundTransactionService` | 2026-04-21 | 100% | ☑ | `finishReceivingOrderLine()`에서 prdDate 있고 expiredDate 비어있을 때 `calculateExpiryDateForItem()` 호출 → `SKU.prdExpiredPeriod` 기반 자동 계산 |
| W1-I-2 | 적치 추천 로케이션 | 적치 시 `tempType`, `comCd`, `restrictType` 조건 맞는 빈 로케이션 추천 반환 | `InboundTransactionService` | 2026-04-22 | 100% | ☑ | `recommendPutawayLocations()` 구현. StoragePolicy.putawayStrategy 기반 FIXED/ZONE/NEAREST/RANDOM 분기. API: `GET /rest/inbound_trx/putaway/recommend_locations` |

### 2-4. [VAS] BOM 번호 채번 구현

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-V-1 | VasBom 번호 채번 | `BOM-YYYYMMDD-XXXXX` 형식 자동 채번 구현 (시퀀스 or DB MAX+1) | `VasBom.java:303` | 2026-04-22 | 100% | ☑ | `beforeCreate()`에서 `RangedSeq.increaseSequence()`로 도메인별 일련번호 채번, `BOM{domainId}-yyMMdd-XXXXX` 형식 완성 |
| W1-V-2 | VAS 재고 처리 연결 | VAS 작업 완료 시 구성품 재고 차감, 세트 SKU 재고 증가 | `VasTransactionService.java` | 2026-04-22 | 100% | ☑ | `processInventoryByVasType()` 구현. SET_ASSEMBLY: BOM 구성품 차감(`VAS-OUT`) → 세트 SKU 재고 생성. DISASSEMBLY: 세트 SKU 차감 → 구성품 재고 생성. REPACK/LABEL/CUSTOM 스킵. |

### 2-5. [RWA] SKU명 자동 조회

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-R-1 | RwaOrderItem SKU명 조회 | `beforeCreate()`에서 `sku_cd`로 SKU 조회 후 `sku_nm` 자동 세팅 | `RwaOrderItem.java:600` | 2026-04-22 | 100% | ☑ | `beforeCreate()`에서 `rwa_orders` 서브쿼리로 `com_cd` 조회 후 `sku_nm` 자동 세팅 구현됨 |

### 2-6. [FULFILLMENT] B2B 피킹 구현

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-F-1 | B2B 피킹 API | 웨이브 없이 주문별 직접 피킹 처리 엔드포인트 추가 | `FulfillmentPickingService`, `FulfillmentTransactionController` | 2026-04-23 | 100% | ☑ | `createB2bPickingTasks()` 신규 구현: biz_type=B2B_OUT·status=ALLOCATED 검증, wave_no=null·INDIVIDUAL 고정, ALLOCATED→PICKING. 엔드포인트: `POST /rest/ful_trx/b2b_picking/create`, `create_list`. PickingTask.waveNo nullable 변경. WmsFulfillmentConstants 훅 상수 추가 |
| W1-F-2 | 피킹 재고 부족 처리 | 피킹 시 할당 재고 부족이면 보충 지시 자동 생성 또는 부분 피킹 처리 | `FulfillmentPickingService` | 2026-04-23 | 100% | ☑ | `shortItem()` 확장: `auto_replenish=true` 파라미터 추가 시 보충 지시 자동 생성. `createReplenishFromShortItem()` 신규: PICKABLE 외 동일 창고에서 SKU 가용 재고 탐색 → ReplenishOrder+ReplenishOrderItem 생성(replenish_no RangedSeq 채번). 재고 없으면 `reason=NO_STOCK` 반환. 엔드포인트: `POST /rest/ful_trx/picking_tasks/{id}/items/{item_id}/create_replenish`. WmsFulfillmentConstants 훅 상수 추가. ReplenishOrderItem.remarks에 pickTaskItemId 연결 |

### 2-7. [STOCK] 재고실사(Stocktake) 상태 자동화

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-ST-1 | 실사 PCS 자동 계산 | 실사 항목 등록 시 로케이션별 SKU 총 PCS 자동 계산 | `StocktakeController.java` | 2026-04-24 | 100% | ☑ | `/start` 호출 시 stocktake_items 순회 → inventories에서 `SUM(inv_qty)` 조회 후 `total_qty` 일괄 업데이트. stocktake.plan_sku 집계 포함 |
| W1-ST-2 | 차이 PCS 자동 계산 | 전산 수량 vs 실사 수량 차이 자동 계산 | `StocktakeController.java` | 2026-04-24 | 100% | ☑ | `/finish` 호출 시 `diff_qty = stocktake_qty - total_qty` 일괄 계산·업데이트. stocktake 헤더 result_sku/diff_sku 집계 포함 |
| W1-ST-3 | 실사 취소 처리 | 실사 상태 `CANCEL` 변경 로직 구현 | `StocktakeController.java:313` | 2026-04-24 | 100% | ☑ | `/cancel` 엔드포인트에서 `STATUS_CANCEL` 변경 + 커스텀 훅(pre/post) 연동 구현 완료. TODO 주석만 잔존 |

### 2-8. [필드 로직] 엔티티 정의 필드 비즈니스 로직 연결

엔티티에 컬럼은 정의되어 있으나 서비스 로직에서 실제로 사용하지 않는 필드들.

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W1-FL-1 | SKU lotFlag 로트 추적 강제 | 입고 시 `lotFlag=true`인 SKU는 로트 번호 필수 입력 검증 추가 | `InboundTransactionService` | 2026-04-23 | 100% | ☑ | `finishReceivingOrderLine()` 내 inspFlag 체크 이후 SKU 조회 → lotFlag+lotNo 검증 추가 |
| W1-FL-2 | SKU serialFlag 시리얼 추적 강제 | 입고 시 `serialFlag=true`인 SKU는 시리얼 번호 필수 입력 검증 추가 | `InboundTransactionService` | 2026-04-23 | 100% | ☑ | `ReceivingItem`에 `serial_no` 컬럼 추가 후 `finishReceivingOrderLine()`에서 serialFlag+serialNo 검증 추가 |
| W1-FL-3 | Location maxWeight/maxQty 초과 검증 | 적치·이동 시 로케이션 최대 중량·수량 초과 여부 검증. 초과 시 오류 반환 | `InventoryTransactionService` | 2026-04-23 | 100% | ☑ | `checkLocationCapacity()` 신규 메서드 추가 (Inventory/StockTransactionService 양쪽) → `createInventory`, `putAway`, `moveInventory` 3곳에서 호출 |
| W1-FL-4 | Location skuCd 고정 SKU 적치 제한 | `skuCd` 지정 로케이션에 다른 SKU 적치 시 오류 처리 | `InventoryTransactionService` | 2026-04-24 | 100% | ☑ | `checkFixedSkuLocation()` 신규 메서드 추가 → `createInventory`, `putAway`, `moveInventory` 3곳에서 `checkMixableLocation` 이후 호출 |
| W1-FL-5 | BoxType 자동 선택 알고리즘 | 포장 시 주문 총 부피·중량 기준 최적 BoxType 자동 선택 (`sortNo` 우선순위 적용) | `FulfillmentPackingService` | 2026-04-24 | 100% | ☑ | `selectOptimalBoxType()` private 메서드 추가 → `completePackingOrder()`에서 boxType 미지정 시 자동 호출. SKU의 sku_wt·sku_vol JOIN 집계 후 max_weight·box_vol 조건 충족 BoxType 중 sort_no 최솟값 선택 |
| W1-FL-6 | CourierContract 유효성 검증 | 출하 시 `status=ACTIVE`, `contractStartDate~contractEndDate` 범위 내 여부 검증 | `FulfillmentShippingService` | 2026-04-24 | 100% | ☑ | `validateCourierContract()` private 메서드 추가 → `printLabel()` 상태 검증 이후 호출 |

### Week 1 진행 현황

| 항목 | 수치 |
|------|------|
| 전체 작업 수 | 26개 |
| 완료 (☑) | 24개 (W1-S-1~4, W1-O-1~6, W1-I-1~2, W1-V-1~2, W1-R-1, W1-ST-1~3, W1-FL-1~6) |
| 진행 중 | 0개 |
| 미시작 | 2개 (W1-F-1, W1-F-2) |
| 전체 진행율 | 92% (완료 24 / 전체 26) |

---

## 3. Week 2~3 — 오픈 전 완성 (Required)

> 오픈 품질을 위해 3주 내 완료해야 할 항목.  
> 기간: 2026-04-25 ~ 2026-05-08

### 3-1. [STOCK] 프론트엔드 화면 구현

현재 `frontend/pages/stock/` 디렉토리가 비어 있음. 최소 아래 화면은 오픈 전 필요.

| 작업번호 | 화면명 | 파일명 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---------|--------|--------|------|--------|--------|------|------|
| W23-SF-1 | 재고 현황 | `stock-inventory-list.js` | 로케이션별·SKU별 재고 조회 (필터: 화주사, 창고, 존) | 2026-04-25 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| W23-SF-2 | 수불 현황 | `inventory-transaction-list.js` | 기간별 입출고 이력 (inventory_hists 기반) | 2026-04-26 | 100% | ☑ | 백엔드 API + 프론트엔드 완료 |
| W23-SF-3 | 재고 실사 목록 | `stock-stocktake-list.js` | 실사 지시 생성/조회/확정 | 2026-04-27 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| W23-SF-4 | 재고 이동 (PDA) | `pda-stock-move.js` | PDA 재고 이동 (바코드 스캔 → 목적지 로케이션 스캔 → 이동 확정) | 2026-04-28 | 100% | ☑ | PDA 화면으로 구현 완료 |
| W23-SF-5 | 재고 조회 (PDA) | `pda-stock-inquiry.js` | PDA 바코드 스캔으로 재고 상세 정보 조회 (재고 바코드로 조회, 상품 코드, 상품 바코드로 조회, 로케이션 코드로 조회), 재고 추가 기능 | 2026-04-30 | 100% | ☑ | PDA 화면 구현 완료. W23-SF-6(재고 조정) 통합 |
| W23-SF-6 | 재고 병합 (PDA) | `pda-stock-merge.js` | PDA 바코드 스캔으로 동일 SKU 재고 병합 | 2026-05-02 | 0% | ☐ | |

### 3-2. [OMS] 웨이브 자동 할당 완성

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-WA-1 | 자동 웨이브 그루핑 룰 | 배송유형·거래처·화주사 조건으로 주문 자동 그루핑 | `OmsWaveService` | 2026-04-25 | 0% | ☐ | |
| W23-WA-2 | 자동 웨이브 생성 스케줄러 | 특정 시각 자동 웨이브 생성 스케줄러 (Spring `@Scheduled`) | `OmsWaveScheduler` (신규) | 2026-04-28 | 0% | ☐ | |
| W23-WA-3 | 웨이브 확정 팝업 연동 | 피킹 유형, 배송 유형, 택배사 코드, 검수 여부, 작업자 수 처리 | `FulfillmentTransactionController` | 2026-04-29 | 0% | ☐ | |

### 3-3. [OMS] 보충 지시 완성

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-RE-1 | 보충 지시 생성 | 피킹존 재고 부족 감지 → `ReplenishOrder` 자동 생성 | `OmsReplenishOrderService` | 2026-04-28 | 100% | ☑ | 재고 할당 시 BACK_ORDER 발생 → 자동 생성. 수동 생성 API(create_from_order/orders) 추가. start/complete/cancel 엔드포인트를 OmsReplenishOrderService에서 ReplenishOrderController로 노출 |
| W23-RE-2 | 보충 작업 처리 | PDA 보충 작업 → 재고 이동 트랜잭션 연결 | `InvTransactionController` | 2026-04-29 | 100% | ☑ | `OmsReplenishOrderService.completeReplenishItem()` 신규 (result_qty 기록 + 전체 완료 시 헤더 자동 COMPLETED). PDA 화면 `pda-oms-replenish.js` 신규: 보충번호 스캔 → 바코드 스캔 → move_inventory → complete 연속 처리 |

### 3-4. [BASE] 사용자-화주사 매핑

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-UA-1 | 사용자-화주사 매핑 API | 사용자별 접근 가능 화주사 코드 목록 조회 API | `WmsBaseService`, `UserCompanyController` | 2026-04-29 | 100% | ☑ | |
| W23-UA-2 | 화주사 선택 컴포넌트 | 로그인 사용자 권한 내 화주사 선택 드롭다운 공통 컴포넌트 | `MenuMetaService` (REF_TYPE_URL 구현) | 2026-04-30 | 100% | ☑ | |

### 3-5. [INBOUND] 입고 검수 반려 기능

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-IR-1 | 검수 반려 API | 입고 항목 반려 처리 → `REJECTED` 상태, 반려 사유 기록 | `InboundTransactionController` | 2026-04-30 | 0% | ☐ | |
| W23-IR-2 | 반려 재고 처리 | 반려 항목 불량 로케이션 이동 또는 반품 처리 플로우 | `InboundTransactionService` | 2026-05-01 | 0% | ☐ | |

### 3-6. [STOCK] 부족 재고 알림

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-SA-1 | 부족 재고 계산 | `SKU.safetyStock` 기준 부족 재고 SKU 목록 계산 | `InventoryDashboardService.java:95` | 2026-05-01 | 100% | ☑ | `getShortageSkus()` 신규 메서드 추가 → `getDashboardStatusCounts()`에 `shortage_sku` 집계, `getDashboardAlerts()`에 부족 재고 알림 추가, `GET /shortage-skus` 엔드포인트 추가 |
| W23-SA-2 | 부족 재고 알림 노출 | 재고 대시보드에 부족 재고 경고 배지 표시 | `InventoryDashboardService.java:385` | 2026-05-01 | 100% | ☑ | 4번째 상태 카드를 "부족 재고 SKU" 배지 카드로 교체(`shortage_sku`), 알림 아이템에 건수 배지 CSS+HTML 추가 |

### 3-7. [OMS] 추가 취소 백 프로세스

> **설계 원칙**: 취소는 영구 종료가 아닌 **리셋** — 작업자 교대·실수 등의 사유로 처음부터 재작업 가능하게 복귀. 재고 할당(stock_allocations/reserved_qty)은 유지하여 재할당 없이 즉시 재작업 가능.

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-CB-1 | 피킹 취소 | PickingTask 리셋 (IN_PROGRESS → CREATED), PickingTaskItem WAIT 복귀·실적 수량 초기화, ShipmentOrder 상태 유지(PICKING) | `FulfillmentPickingService.cancelPickingTask()` | 2026-04-21 | 100% | ☑ | `cancelPickingTask()` 리셋 방식으로 재구현: PickingTask→CREATED, worker_id·started_at·실적 수량 null/0 초기화, PickingTaskItem→WAIT·pick_qty/short_qty 0 초기화, stock_allocations 유지 |
| W23-CB-2 | 포장 취소 | PackingOrder 리셋 (CREATED/IN_PROGRESS/COMPLETED → CREATED), 박스 삭제, PackingOrderItem WAIT 복귀·수량 초기화, ShipmentOrder 상태 유지(PACKING) | `FulfillmentPackingService.cancelPackingOrder()` | 2026-05-02 | 100% | ☑ | `cancelPackingOrder()` 리셋 방식으로 재구현: PackingOrder→CREATED, packing_boxes 삭제, PackingOrderItem→WAIT·insp_qty/pack_qty/packing_box_id 초기화, LABEL_PRINTED 이후는 리셋 불가(송장 취소 필요), stock_allocations 유지 |
| W23-CB-3 | 출하 취소 | 출하 확정 취소 → 포장 완료 상태 복귀 (SHIPPED → COMPLETED), ShipmentOrder PACKING 복귀, shipped_qty 롤백 | `FulfillmentShippingService.cancelShipping()` | 2026-05-03 | 100% | ☑ | `cancelShipping()` 재구현: PackingOrder→COMPLETED·PackingBox→CLOSED 복귀, ShipmentOrder→PACKING, ShipmentOrderItem.shipped_qty 0 롤백, stock_allocations 유지(재출하 확정 즉시 가능) |

### 3-8. [VAS] 유통가공 완성 및 테스트

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-VA-1 | 세트 상품 조립 재고 처리 | VAS 완료 시 구성품 재고 차감 → 세트 SKU 재고 생성 end-to-end 테스트 | `VasTransactionService` | 2026-05-03 | 0% | ☐ | |
| W23-VA-2 | 세트 해체 재고 처리 | 세트 SKU 재고 차감 → 구성품 재고 생성 | `VasTransactionService` | 2026-05-04 | 0% | ☐ | |
| W23-VA-3 | 피킹 시 세트 상품 처리 | 세트 상품 피킹 시 구성품 재고 차감 vs 세트 재고 차감 정책 결정 및 구현 | `FulfillmentPickingService` | 2026-05-05 | 0% | ☐ | |

### 3-9. [RWA] 반품 전체 플로우 테스트

| 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|--------|--------|------|------|
| W23-RW-1 | 반품 접수 → 검수 → 처분 end-to-end 테스트 | 정상 재입고 / 불량 처리 / 폐기 전 경로 검증 | 2026-05-05 | 0% | ☐ | |
| W23-RW-2 | 반품 재고 트랜잭션 연결 | 검수 완료 후 재입고 처리 시 `InventoryTransactionService.in()` 연결 | 2026-05-06 | 0% | ☐ | |

### 3-10. [BASE] 신규 필드 화면 반영

이번 세션에서 Entity에 추가한 필드들이 프론트 화면에 미반영 상태.

| 작업번호 | 엔티티 | 추가 필드 | 작업 | 예정일 | 진행율 | 완료 | 비고 |
|---------|--------|-----------|------|--------|--------|------|------|
| W23-BF-0 | StoragePolicy | 보관 정책 마스터 엔티티 생성, entity_meta 등록, 15개 운영 필드 추가 | `StoragePolicy.java`, `entity_columns`, `common_codes` | 2026-04-20 | 100% | ☑ | putaway_strategy/release_strategy/wave 정책 등 포함 |
| W23-BF-1 | SKU | lotFlag, serialFlag, hazmatFlag, safetyStock, reorderPoint | 상품 등록/수정 화면 필드 추가 | 2026-05-05 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| W23-BF-2 | Location | comCd, skuCd, sortNo, maxWeight, maxQty | 로케이션 관리 화면 필드 추가 | 2026-05-06 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| W23-BF-3 | Customer | deliveryZipCd, deliveryAddr, defaultCarrierCd, leadTimeDays | 거래처 관리 화면 필드 추가 | 2026-05-06 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| W23-BF-4 | CourierContract | status, contractNm, contractStartDate/EndDate, 요금 필드 | 택배 계약 관리 화면 필드 추가 | 2026-05-07 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| W23-BF-5 | Warehouse | 담당자, 시설 규모, 온도, 운영 시간 필드 | 창고 관리 화면 필드 추가 | 2026-05-07 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |

### 3-11. [인프라] DB 마이그레이션 파일 작성

현재 `frontend/packages/operato-wes/server/migrations/` 디렉토리가 비어 있음.

| 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|--------|--------|------|------|
| W23-DB-1 | 기존 테이블 ALTER 마이그레이션 | SKU, Location, Customer, Warehouse, BoxType, CourierContract 신규 컬럼 DDL | 2026-05-07 | 100% | ☑ | |
| W23-DB-2 | 마이그레이션 실행 검증 | 로컬 → 스테이징 순으로 실행 후 무결성 확인 | 2026-05-08 | 100% | ☑ | |

### 3-12. [필드 로직] 로케이션·창고·SKU 운영 규칙 구현

엔티티에 컬럼은 있으나 우선순위가 낮아 Week 2~3으로 미룬 필드 로직들.

| 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---------|------|------|------|--------|--------|------|------|
| W23-FL-1 | Location sortNo 피킹 동선 정렬 | 피킹 태스크 생성 시 `Location.sortNo` 순으로 정렬하여 이동 동선 최적화 | `FulfillmentPickingService` | 2026-05-02 | 0% | ☐ | |
| W23-FL-2 | SKU hazmatFlag 위험물 로케이션 제한 | `hazmatFlag=true`인 SKU는 hazmat 허용 로케이션에만 적치 가능하도록 검증 | `InventoryTransactionService`, `InboundTransactionService` | 2026-05-03 | 0% | ☐ | |
| W23-FL-3 | SKU reorderPoint 재주문점 알림 | 가용 재고가 `reorderPoint` 이하로 떨어지면 재고 대시보드 경고 또는 보충 지시 자동 생성 | `InventoryDashboardService` | 2026-05-05 | 0% | ☐ | |
| W23-FL-4 | Warehouse 온도 조건 매칭 검증 | 적치 시 `SKU.tempType`과 `Warehouse.tempMin/tempMax` 호환성 검증 | `InboundTransactionService` | 2026-05-06 | 0% | ☐ | |
| W23-FL-5 | Warehouse 수용 용량 초과 경고 | 입고 시 `Warehouse.maxPalletCnt` 기준 용량 초과 여부 사전 경고 | `InboundTransactionService` | 2026-05-07 | 0% | ☐ | |

### Week 2~3 진행 현황

| 항목 | 수치 |
|------|------|
| 전체 작업 수 | 38개 |
| 완료 (☑) | 22개 (W23-SF-1~5, W23-UA-1~2, W23-SA-1~2, W23-CB-1~3, W23-BF-0~5, W23-DB-1~2, W23-RE-1~2) |
| 진행 중 | 0개 |
| 미시작 (☐) | 16개 (W23-SF-6, W23-WA-1~3, W23-IR-1~2, W23-VA-1~3, W23-RW-1~2, W23-FL-1~5) |
| 전체 진행율 | 58% (완료 22 / 전체 38) |

---

## 4. 오픈 후 즉시 (Hot-fix / Quick-win)

> 오픈 직후 1~2주 내 처리. 운영 안정화 최우선.

### 4-1. [OMS] 주문 상황 조회 화면

| # | 항목 | 내용 |
|---|------|------|
| Q-1 | 출고 상황 실시간 조회 | 주문별 현재 상태(할당/피킹/포장/출하) 한눈에 조회 |
| Q-2 | 피킹 상황 조회 | 웨이브별 피킹 진행률, 잔여 수량 모니터링 |

### 4-2. [STOCK] 일별 마감 기능

| # | 항목 | 내용 | 파일 |
|---|------|------|------|
| DC-1 | 일별 마감 처리 API | 일 마감 시 재고 스냅샷 생성 (inventory_hists daily snapshot) | `InvTransactionController` |
| DC-2 | 일별 마감 조회 화면 | 날짜별 재고 현황 조회, 수불 집계 | 프론트엔드 |

### 4-3. [INBOUND] 입고지시서 / 바코드 라벨 출력

| # | 항목 | 내용 |
|---|------|------|
| PR-1 | 입고지시서 Report 개선 | 현재 구현된 출력 기능의 레이아웃/내용 검증 및 수정 |
| PR-2 | 바코드 라벨 출력 | 입고 처리 시 상품 바코드 라벨 자동 출력 연동 |

### 4-4. [FULFILLMENT] 피킹 재고 부족 알림

| # | 항목 | 내용 |
|---|------|------|
| PA-1 | 피킹 부족 실시간 알림 | 피킹 중 재고 부족 발생 시 관리자 SSE 알림 |
| PA-2 | 부족 재고 보충 즉시 지시 | 부족 감지 시 보충 지시 자동 생성 연동 |

### 4-5. [BASE] Carrier(운송사) 마스터 구현

현재 `Customer.defaultCarrierCd`, `CourierContract.dlvVendCd` 참조 대상인 운송사 마스터 없음.

| # | 항목 | 내용 |
|---|------|------|
| CA-1 | Carrier Entity 생성 | `master-table-design.md` 스펙 기반 Entity/Controller 생성 |
| CA-2 | 운송사 관리 화면 | 운송사 등록/수정/조회 화면 |

---

## 5. 중기 (1~3개월)

> 서비스 안정화 후 기능 확장.

### 5-1. [OMS] 외부 OMS 연동 (샤방넷)

| # | 항목 | 내용 |
|---|------|------|
| EX-1 | 샤방넷 주문 수신 API | 샤방넷 → WMS 주문 Push 수신 Webhook 구현 |
| EX-2 | 주문 상태 콜백 | WMS 출하 확정 → 샤방넷 배송 상태 업데이트 전송 |
| EX-3 | 운송장 번호 연동 | 택배사 운송장 자동 발급 → 주문에 매핑 |

### 5-2. [BASE] 택배사 API 연동

| # | 항목 | 내용 |
|---|------|------|
| TA-1 | 운송장 자동 발급 | Carrier.apiEndpoint 기반 택배사 API 호출, CourierContract 대역 소진 | `CourierContractController` + 신규 Service |
| TA-2 | 배송 추적 연동 | Carrier.trackingUrl 기반 배송 조회 화면 연동 |

### 5-3. [BASE] SkuBarcode / SkuUom 마스터 구현

| # | 항목 | 내용 |
|---|------|------|
| MB-1 | SkuBarcode Entity/Controller | 다중 바코드 등록, PDA 스캔 시 SKU 역조회 API |
| MB-2 | SkuUom Entity/Controller | 단위 환산 마스터, 입고 수량 자동 환산 연동 |

### 5-4. [STOCK] 재고 고도화

| # | 항목 | 내용 |
|---|------|------|
| SA-1 | 슬로팅 룰 구현 | `SlottingRule` 마스터 기반 입고 적치 로케이션 자동 배정 |
| SA-2 | 보충 룰 자동화 | `ReplenishRule` 마스터 기반 피킹존 자동 보충 트리거 |
| SA-3 | ABC 분석 | SKU별 출고 빈도 분석, ABC 등급 자동 분류 |
| SA-4 | 창고 간 이동 | 멀티 창고 환경 재고 이동 지시/처리 |

### 5-5. [BASE] InspectionSpec / StoragePolicy 구현

| # | 항목 | 내용 |
|---|------|------|
| IS-1 | InspectionSpec Entity/Controller | 화주사·SKU별 검수 기준 마스터 구현 |
| IS-2 | 입고 검수 연동 | 검수 시 InspectionSpec 자동 조회, 샘플 수량 계산 |
| SP-1 | StoragePolicy Entity/Controller | 화주사별 FIFO/FEFO, 혼적 정책 마스터 구현 |
| SP-2 | 재고 불출 순서 적용 | 출고 할당 시 화주사 StoragePolicy 기반 FIFO/FEFO 적용 |

### 5-6. [정산] 기본 정산 기능

| # | 항목 | 내용 |
|---|------|------|
| BI-1 | BillingPolicy Entity/Controller | 화주사별 보관료·처리료 단가 마스터 구현 |
| BI-2 | 월 보관료 자동 계산 | 일별 재고량 × 단가 집계 → 정산서 생성 |
| BI-3 | 입출고 처리료 집계 | 기간별 처리 건수 × 단가 집계 |

### 5-7. [대시보드] 모니터링 화면

| # | 항목 | 내용 |
|---|------|------|
| DA-1 | 입고 대시보드 개선 | 당일 입고 예정 vs 실적 실시간 현황 |
| DA-2 | 출고 대시보드 | 웨이브별 피킹률, 출하율 실시간 모니터링 |
| DA-3 | 재고 현황 대시보드 | 창고별 점유율, 이상 재고(불량/홀드) 현황 |
| DA-4 | 생산성 분석 | 작업자별 피킹 실적, 시간당 처리량 |

### 5-8. [Holiday] 공휴일 마스터 구현

| # | 항목 | 내용 |
|---|------|------|
| HD-1 | Holiday Entity/Controller | 법정 공휴일·창고 휴무일 마스터 |
| HD-2 | 납기일 계산 연동 | Customer.leadTimeDays 적용 시 공휴일 제외 처리 |

---

## 6. 장기 (3개월 이후)

> 경쟁력 강화 및 고도화.

### 6-1. [설비 연동] DPS / DAS 연동

| # | 항목 | 내용 |
|---|------|------|
| EQ-1 | DPS 피킹 연동 | Digital Picking System 피킹 지시 전송/완료 수신 |
| EQ-2 | DAS 분류 연동 | Digital Assorting System 분류 지시 전송/완료 수신 |
| EQ-3 | 설비 마스터 구현 | Equipment Entity/Controller, 설비별 작업 이력 |

### 6-2. [ERP 연동]

| # | 항목 | 내용 |
|---|------|------|
| ERP-1 | 재고 현황 동기화 | WMS 재고 → ERP 재고 주기적 동기화 |
| ERP-2 | 발주 연동 | ERP 발주 → WMS 입고 예정 자동 생성 |
| ERP-3 | 정산 연동 | WMS 정산 데이터 → ERP 전표 자동 생성 |

### 6-3. [ReturnPolicy / ReplenishRule] 마스터 구현

| # | 항목 | 내용 |
|---|------|------|
| RP-1 | ReturnPolicy Entity/Controller | 화주사별 반품 정책 마스터 구현 |
| RP-2 | 반품 처리 정책 자동 적용 | RWA 처리 시 ReturnPolicy 자동 조회 |
| RR-1 | ReplenishRule Entity/Controller | 피킹존 보충 규칙 마스터 |
| RR-2 | 보충 스케줄러 | 주기적 피킹존 재고 점검 → 자동 보충 지시 생성 |

### 6-4. [모니터링 고도화]

| # | 항목 | 내용 |
|---|------|------|
| MO-1 | 3D 재고 맵 | Three.js 기반 창고 3D 시각화 (로케이션별 재고 히트맵) |
| MO-2 | 실시간 작업 모니터링 | SSE 기반 피킹/포장 작업 실시간 현황판 |
| MO-3 | 이상 재고 자동 감지 | 재고 불일치, 유통기한 임박, 장기 재고 자동 알림 |

### 6-5. [분석 / BI]

| # | 항목 | 내용 |
|---|------|------|
| BI-1 | 기간별 입출고 분석 리포트 | 화주사별, 기간별 입출고 통계 차트 |
| BI-2 | 작업 생산성 리포트 | 시간대별, 작업자별 처리량 분석 |
| BI-3 | 재고 회전율 분석 | SKU별 재고 회전율, 데드스탁 탐지 |
| BI-4 | 정산 리포트 자동화 | 화주사 월 청구서 자동 생성 및 이메일 발송 |

---

## 부록: 전체 WBS 요약

| 단계 | 기간 | 항목 수 | 핵심 목표 |
|------|------|---------|-----------|
| **Week 1** | ~1주 | 23개 | 재고 트랜잭션 안정화, 취소 백프로세스 최소화, VAS/RWA 핵심 버그 해소, 필드 로직 연결 |
| **Week 2~3** | ~3주 | 40개 | 화면 완성, 자동화 기능, DB 마이그레이션, 신규 필드 화면 반영, 운영 규칙 구현 |
| **오픈 후 즉시** | 1~2주 | 15개 | 운영 안정화, 상황 조회, 일별 마감, Carrier 마스터 |
| **중기** | 1~3개월 | 30개 | 외부 연동, 정산, 대시보드, 마스터 고도화 |
| **장기** | 3개월+ | 20개 | DPS/ERP 연동, 3D 모니터링, BI 분석 |
