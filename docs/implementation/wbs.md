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

> 최종 업데이트: 2026-06-26 | Week 2~3 작업 85% 완료 (83 / 98)

### 모듈별 완성도

| 모듈 | 백엔드 | 프론트엔드 | 비고 |
|------|--------|------------|------|
| **BASE** (기준정보) | 98% | 85% | SKU·Location·Customer 등 신규 필드 전체 화면 반영 완료 |
| **INBOUND** (입고) | 95% | 80% | 검수반려·PDA 입고·PDA 적치 완료, sku-barcode-input 연동 완료 |
| **STOCK** (재고) | 92% | 85% | 재고 이동·조회·분할/병합 PDA 완료, 재고 실사 PDA 미완 |
| **OMS** (주문관리) | 95% | 90% | 자동 웨이브·취소 백프로세스 완료, B2B 출고 준비 팝업·거래명세서 출력 완료 |
| **FULFILLMENT** (피킹/포장) | 97% | 97% | PC·PDA 피킹/포장 전체 완료, B2C/B2B 포장 화면 결품 처리 UI 완료, 피킹 단계 3단계 부족 처리 설계 완료(N-7~N-10 구현 예정), completePackingOrder() short_qty 누락 버그 설계 확정 |
| **VAS** (유통가공) | 90% | 85% | 세트 조립/해체 end-to-end 완료, 피킹 시 세트 처리 정책 완료 |
| **RWA** (반품) | 95% | 90% | SKU명 자동조회·전체 플로우 테스트·재고 트랜잭션 연결 완료 |
| **PARCEL** (택배사 연동) | 60% | — | CJ 1Day Token·주소정제·송장채번 구현, 집하요청·추적·출력 미완 |

### 핵심 미구현 목록 (요약)

```
[일반 잔여 2건]
- W23-SF-7: 재고 실사 PDA 화면 (pda-stock-count.js)
- W23-FR-3: KIOSK 작업 화면 서비스 오류 메시지 처리
[재고 1건]
- W23-ST-DS-2: 재고 조정 이력 엔티티, 화면 정의
[커스터마이징 2건]
- W23-CUST-LK-7: B2C 웨이브 별 주문 화면 추가
- W23-CUST-LK-9: B2C 주문 임포트 각 쇼핑몰 별 구현
[택배사 연동 1건]
- W23-CT-LT-4: 대한통운 송장 출력
[기타 2건]
- W23-ETC-3: 라벨 프린터 연동
- W23-ETC-4: 상품, 세트 상품 마스터 엑셀 임포트
[재고 부족 대응 3건 — 설계 완료/구현 중]
- W23-SHORTAGE-3: 피킹 단계 3단계 부족 처리 (30% — 설계 리뷰·논리 오류 수정 완료, N-7~N-10 구현 필요)
- W23-SHORTAGE-5: 결품 발생한 패킹 주문 모아서 토털 피킹 지시
- W23-SHORTAGE-6: 결품 피킹 완료 후 검수/포장 처리
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
| W1-F-3 | B2B 피킹 화면 | B2B용 직접 피킹 화면 | 화면 추가 필요 | 2026-06-22 | 100% | ☑ | |

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
| 전체 작업 수 | 27개 |
| 완료 (☑) | 27개 (W1-S-1~4, W1-O-1~6, W1-I-1~2, W1-V-1~2, W1-R-1, W1-F-1~3, W1-ST-1~3, W1-FL-1~6) |
| 진행 중 | 0개 |
| 미시작 | 0개 |
| 전체 진행율 | 100% (완료 27 / 전체 27) |

---

## 3. Week 2~3 — 오픈 전 완성 (Required)

> 오픈 품질을 위해 3주 내 완료해야 할 항목.  
> 기간: 2026-04-25 ~ 2026-05-08

### 3-1. [STOCK] 프론트엔드 화면 구현

현재 `frontend/pages/stock/` 디렉토리가 비어 있음. 최소 아래 화면은 오픈 전 필요.

| # | 작업번호 | 화면명 | 파일명 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|--------|------|--------|--------|------|------|
| 1 | W23-SF-1 | 재고 현황 | `stock-inventory-list.js` | 로케이션별·SKU별 재고 조회 (필터: 화주사, 창고, 존) | 2026-04-25 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| 2 | W23-SF-2 | 수불 현황 | `inventory-transaction-list.js` | 기간별 입출고 이력 (inventory_hists 기반) | 2026-04-26 | 100% | ☑ | 백엔드 API + 프론트엔드 완료 |
| 3 | W23-SF-3 | 재고 실사 목록 | `stock-stocktake-list.js` | 실사 지시 생성/조회/확정 | 2026-04-27 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| 4 | W23-SF-4 | 재고 이동 (PDA) | `pda-stock-move.js` | PDA 재고 이동 (바코드 스캔 → 목적지 로케이션 스캔 → 이동 확정) | 2026-04-28 | 100% | ☑ | PDA 화면으로 구현 완료 |
| 5 | W23-SF-5 | 재고 조회 (PDA) | `pda-stock-inquiry.js` | PDA 바코드 스캔으로 재고 상세 정보 조회 (재고 바코드로 조회, 상품 코드, 상품 바코드로 조회, 로케이션 코드로 조회), 재고 추가 기능 | 2026-04-30 | 100% | ☑ | PDA 화면 구현 완료. W23-SF-6(재고 조정) 통합 |
| 6 | W23-SF-6 | 재고 병합 (PDA) | `pda-stock-inquiry.js` | PDA 바코드 스캔으로 동일 SKU 재고 병합, 소비기한이 다르면 병합 불가능 | 2026-05-02 | 100% | ☑ | W23-SF-5(재고 조정) 통합 |
| 7 | W23-SF-7 | 재고 실사 (PDA) | `pda-stock-count.js` | PDA 바코드 스캔으로 재고 실사 | 2026-05-02 | 0% | ☐ | |
| 8 | W23-SF-8 | PDA 입고, 검수/포장, 실사 등 화면 | `pda-inbound-receiving.js`, `pda-fulfillment-picking.js`, `pda-fulfillment-packing.js`, `fulfillment-picking-pc`, `fulfillment-packing-pc` | 상품 바코드 스캔 시도 상품을 찾을 수 있도록 (서버에 요청) | 2026-04-29 | 100% | ☑ | |
| 9 | W23-SF-9 | PDA 입고 화면 | `pda-inbound-receiving.js` | 상품 코드 스캔 하지 않으면 확정 버튼 처리할 수 없도록 수정 | 2026-04-29 | 100% | ☑ | |
| 10 | W23-SF-10 | PDA 적치 화면 | `pda-stock-putaway.js` | 적치 전략에 따라 로케이션 추천 | 2026-04-29 | 100% | ☑ | |
| 11 | W23-SF-11 | PDA 적치 화면 | `pda-inbound-putaway.js` | 입고 정보 상태 관리를 입고 & 적치 하나로 통합 - 화면에서 대기, 완료, 합계 수량과 입고 리스트를 표시 | 2026-04-29 | 100% | ☑ | list 모드 중단에 입고별 WAITING/STORED 건수 카드 리스트 추가. 카드 클릭 시 입고번호 스캔과 동일 동작. 백엔드 `GET /putaway/receiving-list` 신규 |
| 12 | W23-SF-12 | PDA 출고 피킹 화면 | `pda-fulfillment-picking.js` | 상품 바코드 스캔이 아닌 재고 바코드 스캔으로 피킹하도록 수정 | 2026-04-29 | 100% | ☑ | |
| 13 | W23-SF-13 | PDA 입고 검수 기능 추가 | 소비기한 입력 기능, 불량 수량 입력 기능 불량 발생시 사유 코드 입력 기능 | `pda-inbound-receiving.js` | 2026-06-25 | 100% | ☑ | |
| 14 | W23-SF-14 | PDA 화면에서 PDF 인쇄 기능 | PDF, 라벨 인쇄 기능 | PDA 공통 | 2026-06-26 | 100% | ☑ | |
| 15 | W23-SF-15 | PDA 편의성 | 바코드 컴포넌트 - 모바일 화면에서는 키보드 입력이 올라오지 않게 수정 | 2026-06-30 | 100% | ☑ | |

### 3-2. [OMS] 웨이브 자동 할당 완성

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|------|------|------|
| 1 | W23-WA-1 | 자동 웨이브 그루핑 룰 | 배송유형·거래처·화주사 조건으로 주문 자동 그루핑 | `OmsWaveService` | 2026-04-25 | 100% | ☑ | `createAutoWaves()`에 `wh_cd`/`com_cd` 필터 추가, `buildGroupKey()`에 `com_cd`/`dlv_type`/`ship_by_date` 케이스 추가 |
| 2 | W23-WA-2 | 자동 웨이브 생성 스케줄러 | 특정 시각 자동 웨이브 생성 스케줄러 (Quartz) | `OmsWaveJob` (신규) | 2026-04-28 | 100% | ☑ | `OmsWaveJob extends AbstractJob` 신규 (handler_type=static), `WmsOmsConfigConstants`에 설정 상수 6개 추가. 트리거는 otarepo-core Quartz 프레임워크가 담당 — jobs 테이블에 handler=`operato.wms.oms.job.OmsWaveJob` 등록으로 활성화 |
| 3 | W23-WA-3 | B2C 웨이브 확정 팝업 연동 | 피킹 유형, 배송 유형, 택배사 코드, 검수 여부, 포장 스테이션, 작업자 수 처리 | `FulfillmentTransactionController` | 2026-06-23 | 100% | ☑ | |
| 4 | W23-WA-4 | PDA 웨이브 확정 팝업에서 검수 여부 입력 기능 | 검수를 안 한다는 설정이면 피킹 완료시 출하까지 일괄 완료 처리  | `FulfillmentTransactionController` | 2026-06-25 | 100% | ☑ | |

### 3-3. [OMS] 보충 지시

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|-------|
| 1 | W23-RE-1 | 보충 지시 생성 | 피킹존 재고 부족 감지 → `ReplenishOrder` 자동 생성 | `OmsReplenishOrderService` | 2026-04-28 | 100% | ☑ | 재고 할당 시 BACK_ORDER 발생 → 자동 생성. 수동 생성 API(create_from_order/orders) 추가. start/complete/cancel 엔드포인트를 OmsReplenishOrderService에서 ReplenishOrderController로 노출 |
| 2 | W23-RE-2 | 보충 작업 처리 | PDA 보충 작업 → 재고 이동 트랜잭션 연결 | `InvTransactionController` | 2026-04-29 | 100% | ☑ | `OmsReplenishOrderService.completeReplenishItem()` 신규 (result_qty 기록 + 전체 완료 시 헤더 자동 COMPLETED). PDA 화면 `pda-oms-replenish.js` 신규: 보충번호 스캔 → 바코드 스캔 → move_inventory → complete 연속 처리 |

### 3-4. [BASE] 사용자-화주사 매핑

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|--------|------|------|
| 1 | W23-UA-1 | 사용자-화주사 매핑 API | 사용자별 접근 가능 화주사 코드 목록 조회 API | `WmsBaseService`, `UserCompanyController` | 2026-04-29 | 100% | ☑ | |
| 2 | W23-UA-2 | 화주사 선택 컴포넌트 | 로그인 사용자 권한 내 화주사 선택 드롭다운 공통 컴포넌트 | `MenuMetaService` (REF_TYPE_URL 구현) | 2026-04-30 | 100% | ☑ | |

### 3-5. [INBOUND] 입고 검수 반려 기능

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|--------|------|------|
| 1 | W23-IR-1 | 검수 반려 API | 입고 항목 반려 처리 → `REJECTED` 상태, 반려 사유 기록 | `InboundTransactionController` | 2026-04-30 | 100% | ☑ | `STATUS_REJECTED` 상수 추가, `rejectReceivingOrderLine()` 서비스 메서드, `POST receiving_orders/line/{id}/reject` + `POST receiving_orders/line/reject` 엔드포인트 추가, 자동 마감 체크 SQL에 REJECTED 제외 처리 |
| 2 | W23-IR-2 | 반려 재고 처리 | 반려 항목 불량 로케이션 이동 또는 반품 처리 플로우 | `InboundTransactionService` | 2026-05-01 | 100% | ☑ | `processRejectedReceivingItem()` 신규 — DEFECT 로케이션 조회 후 불량(BAD) 재고 생성, `closeReceivingOrder()`에서 REJECTED 아이템 skip 처리, `createInventoriesByReceivingOrder()`에서 STATUS_END만 재고 생성(REJECTED 자동 제외) |

### 3-6. [STOCK] 부족 재고 알림

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|--------|------|------|
| 1 | W23-SA-1 | 부족 재고 계산 | `SKU.safetyStock` 기준 부족 재고 SKU 목록 계산 | `InventoryDashboardService.java:95` | 2026-05-01 | 100% | ☑ | `getShortageSkus()` 신규 메서드 추가 → `getDashboardStatusCounts()`에 `shortage_sku` 집계, `getDashboardAlerts()`에 부족 재고 알림 추가, `GET /shortage-skus` 엔드포인트 추가 |
| 2 | W23-SA-2 | 부족 재고 알림 노출 | 재고 대시보드에 부족 재고 경고 배지 표시 | `InventoryDashboardService.java:385` | 2026-05-01 | 100% | ☑ | 4번째 상태 카드를 "부족 재고 SKU" 배지 카드로 교체(`shortage_sku`), 알림 아이템에 건수 배지 CSS+HTML 추가 |

### 3-7. [OMS] 추가 취소 백 프로세스

> **설계 원칙**: 취소는 영구 종료가 아닌 **리셋** — 작업자 교대·실수 등의 사유로 처음부터 재작업 가능하게 복귀. 재고 할당(stock_allocations/reserved_qty)은 유지하여 재할당 없이 즉시 재작업 가능.

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|--------|------|------|
| 1 | W23-CB-1 | 피킹 취소 | PickingTask 리셋 (IN_PROGRESS → CREATED), PickingTaskItem WAIT 복귀·실적 수량 초기화, ShipmentOrder 상태 유지(PICKING) | `FulfillmentPickingService.cancelPickingTask()` | 2026-04-21 | 100% | ☑ | `cancelPickingTask()` 리셋 방식으로 재구현: PickingTask→CREATED, worker_id·started_at·실적 수량 null/0 초기화, PickingTaskItem→WAIT·pick_qty/short_qty 0 초기화, stock_allocations 유지 |
| 2 | W23-CB-2 | 포장 취소 | PackingOrder 리셋 (CREATED/IN_PROGRESS/COMPLETED → CREATED), 박스 삭제, PackingOrderItem WAIT 복귀·수량 초기화, ShipmentOrder 상태 유지(PACKING) | `FulfillmentPackingService.cancelPackingOrder()` | 2026-05-02 | 100% | ☑ | `cancelPackingOrder()` 리셋 방식으로 재구현: PackingOrder→CREATED, packing_boxes 삭제, PackingOrderItem→WAIT·insp_qty/pack_qty/packing_box_id 초기화, LABEL_PRINTED 이후는 리셋 불가(송장 취소 필요), stock_allocations 유지 |
| 3 | W23-CB-3 | 출하 취소 | 출하 확정 취소 → 포장 완료 상태 복귀 (SHIPPED → COMPLETED), ShipmentOrder PACKING 복귀, shipped_qty 롤백 | `FulfillmentShippingService.cancelShipping()` | 2026-05-03 | 100% | ☑ | `cancelShipping()` 재구현: PackingOrder→COMPLETED·PackingBox→CLOSED 복귀, ShipmentOrder→PACKING, ShipmentOrderItem.shipped_qty 0 롤백, stock_allocations 유지(재출하 확정 즉시 가능) |

### 3-8. [VAS] 유통가공 완성 및 테스트

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|--------|------|------|
| 1 | W23-VA-1 | 세트 상품 조립 재고 처리 | VAS 완료 시 구성품 재고 차감 → 세트 SKU 재고 생성 end-to-end 테스트 | `VasTransactionService` | 2026-05-03 | 100% | ☑ | |
| 2 | W23-VA-2 | 세트 해체 재고 처리 | 세트 SKU 재고 차감 → 구성품 재고 생성 | `VasTransactionService` | 2026-05-04 | 100% | ☑ | |
| 3 | W23-VA-3 | 피킹 시 세트 상품 처리 | 세트 상품 피킹 시 구성품 재고 차감 vs 세트 재고 차감 정책 결정 및 구현 | `FulfillmentPickingService` | 2026-05-05 | 100% | ☑ | |
| 4 | W23-VA-4 | 세트 상품 해체 시 구성품 누락 수량 관리 | 세트 상품 해체 시 구성품 누락 수량 관리 | | 2026-07-05 | 0% | ☑ | |

### 3-9. [RWA] 반품 전체 플로우 테스트

| # | 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|
| 1 | W23-RW-1 | 반품 접수 → 검수 → 처분 end-to-end 테스트 | 정상 재입고 / 불량 처리 / 폐기 전 경로 검증 | 2026-06-05 | 100% | ☑ | |
| 2 | W23-RW-2 | 반품 재고 트랜잭션 연결 | 검수 완료 후 재입고 처리 시 `InventoryTransactionService.in()` 연결 | 2026-06-06 | 100% | ☑ | |

### 3-10. [BASE] 신규 필드 화면 반영

이번 세션에서 Entity에 추가한 필드들이 프론트 화면에 미반영 상태.

| # | 작업번호 | 엔티티 | 추가 필드 | 작업 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|--------|-----------|------|--------|--------|------|------|
| 1 | W23-BF-0 | StoragePolicy | 보관 정책 마스터 엔티티 생성, entity_meta 등록, 15개 운영 필드 추가 | `StoragePolicy.java`, `entity_columns`, `common_codes` | 2026-04-20 | 100% | ☑ | putaway_strategy/release_strategy/wave 정책 등 포함 |
| 2 | W23-BF-1 | SKU | lotFlag, serialFlag, hazmatFlag, safetyStock, reorderPoint | 상품 등록/수정 화면 필드 추가 | 2026-05-05 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| 3 | W23-BF-2 | Location | comCd, skuCd, sortNo, maxWeight, maxQty | 로케이션 관리 화면 필드 추가 | 2026-05-06 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| 4 | W23-BF-3 | Customer | deliveryZipCd, deliveryAddr, defaultCarrierCd, leadTimeDays | 거래처 관리 화면 필드 추가 | 2026-05-06 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| 5 | W23-BF-4 | CourierContract | status, contractNm, contractStartDate/EndDate, 요금 필드 | 택배 계약 관리 화면 필드 추가 | 2026-05-07 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |
| 6 | W23-BF-5 | Warehouse | 담당자, 시설 규모, 온도, 운영 시간 필드 | 창고 관리 화면 필드 추가 | 2026-05-07 | 100% | ☑ | 메뉴 메타(entity_columns)로 처리 완료 |

### 3-11. [인프라] DB 마이그레이션 파일 작성

현재 `frontend/packages/operato-wes/server/migrations/` 디렉토리가 비어 있음.

| # | 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|
| 1 | W23-DB-1 | 기존 테이블 ALTER 마이그레이션 | SKU, Location, Customer, Warehouse, BoxType, CourierContract 신규 컬럼 DDL | 2026-05-07 | 100% | ☑ | |
| 2 | W23-DB-2 | 마이그레이션 실행 검증 | 로컬 → 스테이징 순으로 실행 후 무결성 확인 | 2026-05-08 | 100% | ☑ | |

### 3-12. [필드 로직] 로케이션·창고·SKU 운영 규칙 구현

엔티티에 컬럼은 있으나 우선순위가 낮아 Week 2~3으로 미룬 필드 로직들.

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|--------|------|------|
| 1 | W23-FL-1 | Location sortNo 피킹 동선 정렬 | 피킹 태스크 생성 시 `Location.sortNo` 순으로 정렬하여 이동 동선 최적화 | `FulfillmentPickingService` | 2026-05-02 | 100% | ☑ | |
| 2 | W23-FL-2 | SKU hazmatFlag 위험물 로케이션 제한 | `hazmatFlag=true`인 SKU는 hazmat 허용 로케이션에만 적치 가능하도록 검증 | `StockTransactionService`, `InboundTransactionService` | 2026-05-03 | 100% | ☑ | |
| 3 | W23-FL-3 | SKU reorderPoint 재주문점 알림 | 가용 재고가 `reorderPoint` 이하로 떨어지면 재고 대시보드 경고 또는 보충 지시 자동 생성 | `InventoryDashboardService` | 2026-05-05 | 100% | ☑ | |
| 4 | W23-FL-4 | Warehouse 온도 조건 매칭 검증 | 적치 시 `SKU.tempType`과 `Warehouse.tempMin/tempMax` 호환성 검증 | `InboundTransactionService` | 2026-05-06 | 100% | ☑ | |
| 5 | W23-FL-5 | Warehouse 수용 용량 초과 경고 | 입고 시 `Warehouse.maxPalletCnt` 기준 용량 초과 여부 사전 경고 | `InboundTransactionService` | 2026-05-07 | 100% | ☑ | |

### 3-13. [프레임워크] 프레임워크 기능 개선

| # | 작업번호 | 항목 | 내용 | 파일 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|------|--------|--------|------|------|
| 1 | W23-FR-1 | 백엔드 서비스 호출 구조 수정 | 서비스 호출 - 에러 발생시 클라이언트에서 에러 메시지를 받을 수 없음 | ExceptionHandler 구조 파악 및 수정 | 2026-04-29 | 100% | ☑ | |
| 2 | W23-FR-2 | PDA 작업 화면에 서비스 호출 오류 처리 | PDA 작업 화면에서 호출하는 서비스에서 오류가 발생시 해당 오류를 메세지로 클라이언트에서 표시하도록 수정.| 개별 작업 화면에서 처리 | 2026-05-19 | 100% | ☑ | |
| 3 | W23-FR-3 | KIOSK 작업 화면에 서비스 호출 오류 처리 | KIOSK 작업 화면에서 호출하는 서비스에서 오류가 발생시 해당 오류를 메세지로 클라이언트에서 표시하도록 수정.| 개별 작업 화면에서 처리 | 2026-05-30 | 0% | ☐ | |
| 4 | W23-FR-4 | 상품 코드, 바코드, 재고 바코드 모두 조회 가능한 컴포넌트 | 상품 코드, 상품 바코드, 재고 바코드로 조회하여 여러 상품이 나오는 경우 하나를 선택할 수 있는 팝업까지 제공하는 SKU 바코드 검색 컴포넌트. | `sku-barcode-input.js` | 2026-04-29 | 100% | ☑ | |

### 3-14. [기타] 기타

| # | 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|
| 1 | W23-ETC-1 | 재고 바코드 키 (바코드 + 로케이션) | 재고 바코드 키에 맞게 모든 프로세스 (특히 피킹, 재고 트랜잭션) 제대로 처리되는지 확인 | 2026-05-02 | 100% | ☑ | |
| 2 | W23-ETC-2 | 출고 주문에 송장 번호 컬럼 추가 | 송장 채번시 택배사 연동하여 송장 번호 생성하고, 주문 정보에 송장 번호 매핑 | 2026-05-15 | 100% | ☑ | |
| 3 | W23-ETC-3 | 송장 출력 기능, 라벨 프린터 연동 | 송장 출력 기능, 라벨 프린터 연동 처리 | 2026-06-31 | 0% | ☐ | |
| 4 | W23-ETC-4 | 상품, 세트 상품 마스터 엑셀 임포트 | 상품, 세트 상품 마스터 엑셀 임포트 | 2026-06-30 | 0% | ☐ | |
| 5 | W23-ETC-5 | 재고 이력 삭제 | 재고 이력 테이블 삭제, 재고 트랜잭션으로 대체 | 2026-06-25 | 100% | ☑ | |
| 6 | W23-ETC-6 | 재고 바코드 라벨 수정 | 재고 바코드 라벨 및 데이터 바인딩 로직 Fix | 2026-06-26 | 100% | ☑ | |
| 7 | W23-ETC-7 | 입,출고 주문 수동 생성 기능 | 입고, B2B 출고, B2C 출고 주문 수동 생성 기능 (엑셀에서 붙여넣기 가능하게) | 2026-06-27 | 0% | ☐ | |
| 8 | W23-ETC-8 | 재고 조정 작업 화면 | 여러 건의 재고 조정 처리하는 화면 | 2026-06-27 | 0% | ☐ | |
| 9 | W23-ETC-9 | 재고 이력 추적 화면 | 재고 이력 추적 화면 | 2026-06-29 | 0% | ☐ | |
| 10 | W23-ETC-10 | 출고 주문 패턴화 해서 소팅 처리 | 주문 패턴 소팅 순으로 패킹지시서 출력 | 2026-06-29 | 0% | ☐ | |

### 3-15. [커스터마이징] 로지온 코리아

| # | 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|
| 1 | W23-CUST-LK-1 | 주문 임포트 시 웨이브 번호 없는 주문 최대 500건 웨이브 구성 | 주문 임포트 시 웨이브 번호 없는 주문 최대 500건 웨이브 구성 | 2026-05-13 | 100% | ☑ | |
| 2 | W23-CUST-LK-2 | B2B, B2C 주문 화면 분리 | B2B, B2C 주문 화면 분리 | 2026-05-13 | 100% | ☑ | |
| 3 | W23-CUST-LK-3 | B2C 주문 프로세스 커스터마이징 | 주문 임포트 : 기본값 처리 (커스텀 서비스) 구현, 주문 확인 : 주소 정제, 할당 : 송장 채번, 할당 | 2026-06-17 | 100% | ☑ | |
| 4 | W23-CUST-LK-4 | B2B 주문 프로세스 커스터마이징 | 주문 할당 : 주문 확인 자동 처리, 웨이브 없는 피킹 지원, 패킹 스테이션 지정, 거래명세서 출력 | 2026-05-13 | 100% | ☑ | shipment-order-ready-popup.js 신규 구현: confirm_and_allocate·direct_picking/create_list·패킹 스테이션 지정 완료, 거래명세서 출력 기능 추가 |
| 5 | W23-CUST-LK-5 | B2C 검수, 포장 프로세스 커스터마이징 | 옵션으로 송장 출력 연동 | 2026-05-17 | 100% | ☑ | |
| 6 | W23-CUST-LK-6 | B2B 검수, 포장 프로세스 커스터마이징 | 옵션으로 거래명세서 출력 연동 | 2026-05-31 | 100% | ☑ | |
| 7 | W23-CUST-LK-7 | B2C 웨이브 별 주문 화면 추가 | B2C 웨이브 별 주문 화면 추가 | 2026-05-20 | 0% | ☐ | |
| 8 | W23-CUST-LK-8 | 포장 완료 시 출하 완료까지 처리 | 커스텀 서비스 구현 | 2026-05-16 | 100% | ☑ | |
| 9 | W23-CUST-LK-9 | B2C 주문 임포트 각 쇼핑몰 별 구현 | 쇼핑몰 별 주문 임포트 화면 구현 | 2026-06-26 | 0% | ☐ | |

### 3-16. [택배사 연동] 대한통운

| # | 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|
| 0 | W23-CT-LT-0 | 택배 서비스 모듈 구성 및 서비스 추상화 | 택배 서비스 모듈 구성 및 서비스 추상화 | 2026-06-17 | 100% | ☑ | |
| 1 | W23-CT-LT-1 | 인증 토큰 | 1 Day Token API | 2026-06-17 | 100% | ☑ | |
| 2 | W23-CT-LT-2 | 수취인 주소 정보 검증 | 주소 정제 - 대한통운 주소정제 API | 2026-06-17 | 100% | ☑ | |
| 3 | W23-CT-LT-3 | 대한통운 연동 - 송장 채번 | 대한통운 송장 채번 기능 | 2026-06-17 | 100% | ☑ | |
| 4 | W23-CT-LT-4 | 대한통운 연동 - 송장 출력 | 대한통운 송장 출력 기능 | 2026-07-05 | 0% | ☐ | |


### 3-17. [재고] 수불 이력 & 재고 트랜잭션

| # | 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|
| 1 | W23-ST-DS-1 | 재고 트랜잭션 이력, 수불 서머리 정의 | 엔티티, 트랜잭션 이력, 서머리 테이블, 화면 디자인  | 2026-05-25 | 100% | ☑ | |
| 2 | W23-ST-DS-2 | 재고 조정 이력 엔티티, 화면 정의 | 엔티티, 조정 이력 테이블, 화면 디자인  | 2026-05-26 | 0% | ☐ | |
| 3 | W23-ST-DS-3 | 재고 생성 시 재고 트랜잭션 생성 | 재고 생성 시 재고 트랜잭션 생성 구현, 기존 InventoryHists 사용 중단 | 2026-05-26 | 100% | ☑ | |
| 4 | W23-ST-DS-4 | 재고 조정 시 재고 트랜잭션 생성 |  | 2026-05-27 | 100% | ☑ | |
| 5 | W23-ST-DS-5 | 재고 폐기 시 재고 트랜잭션 생성 |  | 2026-05-27 | 100% | ☑ | |
| 6 | W23-ST-DS-6 | 재고 홀드 시 재고 트랜잭션 생성 |  | 2026-05-27 | 100% | ☑ | |
| 7 | W23-ST-DS-7 | 재고 홀드 해제 시 재고 트랜잭션 생성 |  | 2026-05-27 | 100% | ☑ | |
| 8 | W23-ST-DS-8 | 재고 이동 시 재고 트랜잭션 생성 |  | 2026-05-29 | 100% | ☑ | |
| 9 | W23-ST-DS-9 | 재고 분할 시 재고 트랜잭션 생성 |  | 2026-05-29 | 100% | ☑ | |
| 10 | W23-ST-DS-10 | 재고 병합 시 재고 트랜잭션 생성 |  | 2026-05-29 | 100% | ☑ | |
| 11 | W23-ST-DS-11 | 입고 시 재고 트랜잭션 생성 |  | 2026-05-30 | 100% | ☑ | |
| 12 | W23-ST-DS-12 | 출고 시 재고 트랜잭션 생성 |  | 2026-05-30 | 100% | ☑ | |
| 13 | W23-ST-DS-13 | 반품 입고 시 재고 트랜잭션 생성 |  | 2026-06-02 | 100% | ☑ | |
| 14 | W23-ST-DS-14 | 일별 재고 수불 집계 구현 |  | 2026-06-02 | 100% | ☑ | |
| 15 | W23-ST-DS-15 | 재고 트랜잭션 이력, 수불 이력 화면 | 화면 구현  | 2026-05-25 | 100% | ☑ | |

### 3-18. [재고] 재고 부족 대응 프로세스

| # | 작업번호 | 항목 | 내용 | 예정일 | 진행율 | 완료 | 비고 |
|---|--------|------|------|--------|--------|------|------|
| 1 | W23-SHORTAGE-1 | 출고 주문 재고 할당 시 재고 부족시 부족 처리 | 재고 부족 처리 - 주문 상태 BACK_ORDER 처리 | 2026-06-23 | 100% | ☑ | |
| 2 | W23-SHORTAGE-2 | 주문 상태가 재고 부족 (BACK_ORDER) 상태인 경우 처리 | 백오더 주문 건별 보충 지시 처리 | 2026-06-23 | 100% | ☑ | |
| 3 | W23-SHORTAGE-3 | 피킹 작업 시 실 재고가 부족시 결품 처리 | 피킹 존에 재고가 있다면 자동 재할당 보충 존에 재고가 있다면 보충 지시 생성 아예 재고가 없으면 작업 화면에 재고 없음 표시 | 2026-06-25 | 30% | ☐ | 설계 리뷰·논리 오류 수정 완료(2026-06-26). N-7 자동 재할당·N-8 보충 지시 생성·N-9 REPLENISH_WAIT 상태·N-10 피킹 UI 구현 필요 |
| 4 | W23-SHORTAGE-4 | 패킹 작업 시 실 재고 부족시 결품 처리 | 패킹 작업 화면에서 결품 처리 버튼 | 2026-06-24 | 100% | ☑ | N-1~N-3·N-5·N-6 완료. N-4(completePackingOrder short_qty>0 누락 버그) 설계 확정, 구현 필요 |
| 5 | W23-SHORTAGE-5 | 웨이브 별 결품 발생한 패킹 정보 모아서 피킹 지시 | 결품 발생한 패킹 주문을 모두 모아서 한 번에 토털 피킹 지시 | 2026-06-25 | 0% | ☐ | |
| 6 | W23-SHORTAGE-6 | 결품 피킹 완료 후 검수/포장 처리 | 결품 피킹 완료 후 검수/포장 처리 | 2026-06-25 | 0% | ☐ | |

### Week 2~3 진행 현황

| 항목 | 수치 |
|------|------|
| 전체 작업 수 | 98개 |
| 완료 (☑) | 83개 (W23-SF-1~6·8~14, W23-UA-1~2, W23-SA-1~2, W23-CB-1~3, W23-BF-0~5, W23-DB-1~2, W23-RE-1~2, W23-FL-1~5, W23-IR-1~2, W23-WA-1~4, W23-VA-1~3, W23-RW-1~2, W23-FR-1~2·4, W23-ETC-1~2·5~6, W23-CUST-LK-1~6·8, W23-CT-LT-0~3, W23-ST-DS-1·3~15, W23-SHORTAGE-1~2·4) |
| 진행 중 | 1개 (W23-SHORTAGE-3 30%) |
| 미완료 (☐) | 14개 (W23-SF-7, W23-FR-3, W23-ST-DS-2, W23-ETC-3~4·7~10, W23-CUST-LK-7·9, W23-CT-LT-4, W23-SHORTAGE-5~6) |
| 전체 진행율 | 85% (완료 83 / 전체 98) |

---

## 4. 오픈 후 즉시 (Hot-fix / Quick-win)

> 오픈 직후 1~2주 내 처리. 운영 안정화 최우선.

### 4-1. [OMS] 주문 상황 조회 화면

| # | 항목 | 내용 |
|---|------|------|
| Q-1 | 출고 상황 실시간 조회 | 주문별 현재 상태(할당/피킹/포장/출하) 한 눈에 조회 |
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
| BI-4 | 로지온 코리아 커스터마이징 | 로지온 코리아 정산 기능 커스터마이징 |

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

| 단계 | 기간 | 전체 | 완료 | 진행율 | 핵심 목표 |
|------|------|------|------|--------|-----------|
| **Week 1** | ~1주 | 27개 | 27/27 | **100%** | 재고 트랜잭션 안정화, 취소 백프로세스 최소화, VAS/RWA 핵심 버그 해소, 필드 로직 연결 |
| **Week 2~3** | ~3주 | 98개 | 83/98 | **85%** | 화면 완성, 자동화 기능, DB 마이그레이션, 신규 필드 화면 반영, 운영 규칙 구현 |
| **오픈 후 즉시** | 1~2주 | 10개 | 0/10 | 0% | 운영 안정화, 상황 조회, 일별 마감, Carrier 마스터 |
| **중기** | 1~3개월 | 25개 | 0/25 | 0% | 외부 연동, 정산, 대시보드, 마스터 고도화 |
| **장기** | 3개월+ | 17개 | 0/17 | 0% | DPS/ERP 연동, 3D 모니터링, BI 분석 |
| **합계** | — | 177개 | 110/177 | **62%** | — |
