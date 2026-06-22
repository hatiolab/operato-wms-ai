# 출고 재고 부족 대응 프로세스 설계

> 작성일: 2026-06-22  
> 대상 모듈: `oms` (주문/할당) + `fulfillment` (피킹/포장/출하)

---

## 목차

1. [부족 발생 시점 분류](#1-부족-발생-시점-분류)
2. [전체 출고 흐름과 부족 발생 지점](#2-전체-출고-흐름과-부족-발생-지점)
3. [Case A — 할당 단계 부족](#3-case-a--할당-단계-부족)
4. [Case B — 피킹 단계 부족 (INDIVIDUAL)](#4-case-b--피킹-단계-부족-individual)
5. [Case C — 피킹 단계 부족 (TOTAL)과 포장 단계 확정](#5-case-c--피킹-단계-부족-total과-포장-단계-확정)
6. [부족분 후속 처리 — 부족 피킹 → 포장 → 출하](#6-부족분-후속-처리--부족-피킹--포장--출하)
7. [상태 흐름 정의](#7-상태-흐름-정의)
8. [구현 현황](#8-구현-현황)
9. [수정·추가 구현 항목](#9-수정추가-구현-항목)

---

## 1. 부족 발생 시점 분류

출고 프로세스에서 재고 부족은 세 시점에 발생할 수 있다.

| 시점 | Case | 원인 | 현재 처리 |
|------|------|------|----------|
| **재고 할당** | A | 가용 재고 < 주문 수량 | BACK_ORDER → 보충 지시 생성 (구현됨) |
| **피킹 작업** (INDIVIDUAL) | B | 할당된 로케이션의 실재고 불일치 | 부분·전량 부족 처리 (일부 버그) |
| **피킹 작업** (TOTAL) + **포장 작업** | C | 총량 부족 후 주문별 배분 불확실 | 포장 시점에 작업자가 확정 (미구현) |

---

## 2. 전체 출고 흐름과 부족 발생 지점

```
주문 등록 (REGISTERED)
    │
    ▼
주문 확정 (CONFIRMED)
    │
    ▼
┌───┴─────────────────────────────────────────────────────────────┐
│ 재고 할당                                                         │
│  가용 재고 조회 → stock_allocations 생성 → inventories.reserved_qty │
│                                                                   │
│  전량 할당 성공 ──────────────────────→ ALLOCATED ──────────────┐ │
│  부족 발생 (가용 재고 < 주문 수량)                                │ │
│    ├─ 부분 할당: 가용분만 할당 ──→ BACK_ORDER ─[Case A]──────┐ │ │
│    └─ 전량 미할당: 할당 0 ───────→ BACK_ORDER ─[Case A]──────┘ │ │
└────────────────────────────────────────────────────────────────┘ │
                                                                    │
             ┌─────────────────── 재고 입고 후 재할당 ─────────────────┘
             │                  (Case A 정상 복귀 경로)
             ▼
    ALLOCATED (전량 할당 완료)
             │
             ▼
    웨이브 생성 (WAVED)
             │
             ▼
    피킹 지시 생성/릴리즈 (RELEASED → PICKING)
             │
    ┌────────┴──────────────────────────────────────────────────────┐
    │ 피킹 작업                                                      │
    │                                                               │
    │ [INDIVIDUAL 피킹]                    [TOTAL 피킹]            │
    │  주문 1건 = 피킹 지시 1건             웨이브 N건 = 피킹 지시 1건│
    │                                                               │
    │  정상 → PICKED ──────────────────→ PICKED (총량 정상)        │
    │  부분 부족 → PICKED [Case B]         부분 부족 → SHORT        │
    │  (pick_qty>0, short_qty>0)           (총량 부족량 기록)        │
    │  전량 부족 → SHORT  [Case B]          [Case C]                │
    └────────────────────────────────────────────────────────────── ┘
             │                                        │
    ┌────────▼─────────┐                    ┌────────▼──────────┐
    │ 포장 지시 생성    │                    │ 포장 지시 생성     │
    │ (INDIVIDUAL)     │                    │ (TOTAL)           │
    │ order_qty=pick_qty│                   │ order_qty=alloc_qty│
    │ short_qty 기록   │                    │ (원래 주문량 유지) │
    └────────┬─────────┘                    └────────┬──────────┘
             │                                        │
             ▼                                        ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 포장 작업                                                    │
    │                                                             │
    │  [정상] 전량 검수/포장 → COMPLETED → 출하                   │
    │                                                             │
    │  [부족 있음]                                                │
    │  INDIVIDUAL: short_qty 항목 표시 → [부족 처리] 버튼        │
    │  TOTAL: wave 부족 경고 표시 → 작업자가 아이템별 결정         │
    │              [Case C: 포장 시점 부족 확정]                  │
    │                                                             │
    │  부족 아이템 있음 → PackingOrder: SHORT (출하 차단)         │
    └──────────────────────────────┬──────────────────────────────┘
                                   │
               ┌───────────────────┴──────────────────────┐
               │                                          │
    ┌──────────▼────────────┐               ┌─────────────▼────────────────┐
    │ 정상 출하              │               │ 부족 포장 주문 후속 처리       │
    │ COMPLETED 포장 주문    │               │ [관리자] SHORT 주문 모아서     │
    │ → 송장 발행 → 출하     │               │ 부족분 토털 피킹 지시 생성     │
    └───────────────────────┘               └─────────────┬────────────────┘
                                                          │
                                            ┌─────────────▼────────────────┐
                                            │ 부족분 피킹 → 원본 포장 주문  │
                                            │ 분배 → SHORT 해소            │
                                            │ PackingOrder: SHORT→COMPLETED │
                                            │ → 출하                        │
                                            └──────────────────────────────┘
```

---

## 3. Case A — 할당 단계 부족

### 발생 원인

- 해당 SKU의 가용 재고(`inv_qty - reserved_qty`)가 주문 수량에 미달
- 재고 자체가 없거나, 다른 주문에 이미 예약된 경우

### 현재 처리 흐름

```
allocateShipmentOrders() 실행
  ↓
ShipmentOrderItem별 가용 재고 조회
  ↓
  전량 할당 성공: ShipmentOrderItem.alloc_qty = order_qty, short_qty = 0
  부분/전량 미달: ShipmentOrderItem.alloc_qty = 가용분, short_qty = 미달분
  ↓
hasShort 여부로 주문 상태 분기
  → ALLOCATED  (전량 할당 완료)
  → BACK_ORDER (1개 품목이라도 부족)
    + 보충 지시 자동 생성 (OmsReplenishOrderService.createReplenishForOrder)
```

### BACK_ORDER 주문의 후속 흐름

```
BACK_ORDER
  │
  ├─ [경로 1] 재고 입고 → 재할당 시도
  │    allocateShipmentOrders() 재실행 (CONFIRMED/BACK_ORDER 상태 허용)
  │    전량 할당 성공 → ALLOCATED → 정상 진행
  │
  └─ [경로 2] 부족분 재고가 지속 없음 → 주문 취소 또는 백오더 유지
```

### 제약 사항

- **BACK_ORDER 주문은 웨이브/피킹 지시 생성 불가** (의도적 차단)
- 부분 할당이 된 경우에도 전체 BACK_ORDER → 할당된 수량도 피킹 불가
- 이유: 부분 출하 시 운영 복잡도 증가, 추가 배송비 발생

> **결정**: 부분 할당 상태에서의 부분 출하는 현재 지원하지 않음.  
> 전량 할당 후에만 피킹 진행. (정책 변경 시 별도 설계 필요)

---

## 4. Case B — 피킹 단계 부족 (INDIVIDUAL)

### 발생 원인

- 재고 할당은 완료됐으나 실물 재고와 시스템 재고 불일치
- 해당 로케이션 SKU가 없거나, 수량이 적거나, 바코드 오류

### 처리 설계

| 케이스 | pick_qty | short_qty | PickingTaskItem.status | stock_allocations 처리 |
|--------|----------|-----------|----------------------|----------------------|
| 정상 피킹 | = order_qty | 0 | PICKED | 유지 |
| **부분 부족** | > 0, < order_qty | > 0 | **PICKED** | short_qty만큼 부분 해제 |
| **전량 부족** | 0 | = order_qty | SHORT | 전체 해제 |

#### 부분 부족 처리 상세

```
shortItem() 호출 (pick_qty=3, short_qty=7)
  ↓
1. PickingTaskItem: pick_qty=3, short_qty=7, status=PICKED
2. deallocateShortQty(): short_qty 7EA만큼 stock_allocations 해제
   - alloc_qty 전체가 short_qty 이하 → deallocateInventory() (전체 삭제)
   - alloc_qty 일부만 해제 → alloc_qty 조정 + reserved_qty 환원
3. 피킹 완료 후 updateShipmentOrdersAfterPicking():
   - 해당 주문의 모든 PickingTaskItem 완료 확인
   - pick_qty > 0 → ShipmentOrder: PICKING → PACKING
   - pick_qty = 0 → ShipmentOrder: PICKING → BACK_ORDER
   - ShipmentOrderItem.short_qty 갱신
```

#### 전량 부족 처리 상세

```
shortItem() 호출 (pick_qty=0, short_qty=10)
  ↓
1. PickingTaskItem: pick_qty=0, short_qty=10, status=SHORT
2. deallocateShortQty(): 전체 stock_allocations 해제
3. 피킹 완료 후 updateShipmentOrdersAfterPicking():
   - 모든 PickingTaskItem이 SHORT → ShipmentOrder: BACK_ORDER
```

#### 포장 지시 생성 (INDIVIDUAL)

```
createPackingOrders() 조건: PICKED + SHORT 전체 포함

PackingOrderItem 생성 규칙:
  ┌─────────────────────────────┬──────────────┬───────────┬──────────┬────────────┐
  │ PickingTaskItem 케이스       │ order_qty    │ short_qty │ status   │ 포장 필요  │
  ├─────────────────────────────┼──────────────┼───────────┼──────────┼────────────┤
  │ PICKED, pick_qty=10, short=0│ 10           │ 0         │ WAIT     │ ✅ 있음    │
  │ PICKED, pick_qty=3,  short=7│ 3            │ 7         │ WAIT     │ ✅ 있음    │
  │ SHORT,  pick_qty=3,  short=7│ 3            │ 7         │ WAIT     │ ✅ 있음    │
  │ (B-1 수정 전 구 데이터)      │              │           │          │            │
  │ SHORT,  pick_qty=0, short=10│ 0            │ 10        │ SHORT    │ ❌ 없음    │
  └─────────────────────────────┴──────────────┴───────────┴──────────┴────────────┘

전량 부족(pick_qty=0) → STATUS_SHORT로 즉시 생성
  → 포장 작업자가 부족 항목 인지 가능
  → completePackingOrder()에서 SHORT 감지 → PackingOrder.STATUS_SHORT → 출하 차단
```

#### 포장 화면에서의 처리

- `short_qty > 0`인 아이템: "⚠ 3EA 중 7EA 부족" 표시
- 포장 가능한 3EA 검수/포장 진행
- 포장 완료 시 → [Case C 포장 부족 확정] 동일하게 SHORT 분기 처리

---

## 5. Case C — 피킹 단계 부족 (TOTAL)과 포장 단계 확정

### TOTAL 피킹 부족의 구조적 문제

```
TOTAL 피킹: 웨이브 5개 주문의 SKU-001 합산 12EA 지시
  → 실제 피킹 8EA (4EA 부족)

PickingTaskItem: order_qty=12, pick_qty=8, short_qty=4, status=SHORT

문제: "4EA 부족"은 알지만, 어느 주문(A/B/C/D/E)이 부족한지 알 수 없음
```

### 설계 결정: 포장 시점 결정 (Option 3)

피킹 시 총 부족 수량만 기록하고, **포장 작업자가 실물 분류 후 어느 주문이 부족한지 확정한다.**

이유:
- 소터(Sorter)/DPS가 없는 환경에서 시스템이 임의로 배분하면 불공정
- 포장 작업자가 실물을 보면서 분류하는 것이 현실적

#### TOTAL 피킹 처리 상세

```
shortItem() 호출 (TOTAL 피킹, pick_qty=8, short_qty=4)
  ↓
1. PickingTaskItem: pick_qty=8, short_qty=4, status=SHORT
2. deallocateShortQty(): shipmentOrderItemId = null → 호출 안 함
   → stock_allocations 수정 없음 (원래 할당 유지)
3. updateShipmentOrdersAfterPicking(): 호출 안 함 (TOTAL은 별도)
```

#### 포장 지시 생성 (TOTAL)

```
createPackingOrdersFromBatch() 기존 로직 유지:
  stock_allocations.alloc_qty → PackingOrderItem.order_qty (원래 주문량)
  PackingOrderItem.short_qty = 0  (생성 시점에는 알 수 없음)

포장 화면 진입 시 wave 부족 경고 별도 조회:
  SELECT sku_cd, SUM(short_qty) AS wave_short_qty
  FROM picking_task_items
  WHERE pick_task_id = :pickTaskId AND short_qty > 0
  GROUP BY sku_cd
  → "⚠ SKU-001 4EA 부족 발생 — 포장 시 부족 처리 필요"
```

#### 포장 작업 중 부족 확정

```
[포장 작업자 행동]
  실물: SKU-001 8EA를 5개 주문에 분류
  주문D에 배정할 4EA가 없음
  → 포장 화면에서 주문D의 SKU-001 아이템에 [부족 처리] 클릭
  → 부족 수량 입력 (4EA)

[시스템 처리]
  POST /rest/ful_trx/packing_orders/{id}/items/{itemId}/short
    { short_qty: 4 }
  → PackingOrderItem: status = SHORT, short_qty = 4
```

#### 포장 완료 판단

```
completePackingOrder() 실행
  ↓
SHORT 상태 PackingOrderItem 집계
  ↓
  COUNT = 0 → PackingOrder.status = COMPLETED → 출하 가능
  COUNT > 0 → PackingOrder.status = SHORT    → 출하 차단
```

---

## 6. 부족분 후속 처리 — 부족 피킹 → 포장 → 출하

Case B 부분 부족 / Case C TOTAL 부족으로 인해 `PackingOrder.status = SHORT`가 된 주문들에 대한 후속 처리.

### 6-1. SHORT 포장 주문 관리 (관리자)

```sql
-- SHORT 포장 주문 목록
SELECT po.pack_order_no, po.shipment_no, poi.sku_cd, poi.short_qty
FROM packing_orders po
JOIN packing_order_items poi ON poi.packing_order_id = po.id
WHERE po.domain_id = :domainId
  AND po.status = 'SHORT'
  AND poi.status = 'SHORT'
ORDER BY poi.sku_cd, po.pack_order_no
```

### 6-2. 부족분 토털 피킹 지시 생성

관리자가 SHORT 포장 주문들을 선택 → 부족분 토털 피킹 지시 생성

```
SHORT 포장 주문 A: SKU-001 4EA, SKU-002 2EA
SHORT 포장 주문 B: SKU-001 3EA
SHORT 포장 주문 C: SKU-002 5EA
                 ↓ SKU별 합산
PickingTask (TOTAL, shortage_flag = true)
  PickingTaskItem: SKU-001  7EA (A의 4EA + B의 3EA)
  PickingTaskItem: SKU-002  7EA (A의 2EA + C의 5EA)

shortage_packing_mappings (연결 매핑):
  pick_task_id → packing_order_id, packing_order_item_id, short_qty
```

### 6-3. 부족분 피킹 후 포장 주문 분배

부족분 피킹 완료 후 원본 포장 주문으로 수량 분배:

```
매핑 테이블 기반으로 각 SHORT PackingOrderItem에 수량 할당
PackingOrderItem: status = SHORT → WAIT (재포장 대기)
PackingOrder: 모든 SHORT 아이템 해소 시 SHORT → COMPLETED
```

### 6-4. 부족분 포장 및 출하

```
PackingOrder: COMPLETED → 송장 발행 → 출하
기존 박스(부분 포장분)와 부족분 박스를 동일 운송장으로 묶거나
별도 박스로 추가 출하 (운영 정책에 따라)
```

---

## 7. 상태 흐름 정의

### ShipmentOrder

```
REGISTERED
  → CONFIRMED
  → ALLOCATED  (전량 할당)
  → BACK_ORDER (할당 부족 — 재할당 가능)
  → WAVED      (웨이브 편입)
  → RELEASED   (피킹 지시 생성됨)
  → PICKING    (피킹 진행 중)
  → PACKING    (피킹 완료, pick_qty > 0)
  → BACK_ORDER (피킹 전량 부족, pick_qty = 0)
  → SHIPPED
  → CLOSED
  → CANCELLED
```

> BACK_ORDER는 할당 단계와 피킹 단계 양쪽에서 진입 가능

### PickingTask

```
CREATED → IN_PROGRESS → COMPLETED → CANCELLED
```

### PickingTaskItem

```
WAIT → RUN → PICKED  (정상 또는 부분 부족: pick_qty > 0)
           → SHORT   (전량 부족: pick_qty = 0)
```

> 부분 부족: `status = PICKED`, `pick_qty > 0`, `short_qty > 0`

### PackingOrder

```
CREATED
  → IN_PROGRESS
  → COMPLETED    (부족 없음 → 정상 출하 가능)
  → SHORT        (부족 아이템 있음 → 출하 차단)  ← 신규 추가 필요
      → COMPLETED (부족분 해소 후)
  → LABEL_PRINTED
  → MANIFESTED
  → SHIPPED
  → CANCELLED
```

### PackingOrderItem

```
WAIT → INSPECTED → PACKED   (정상)
                 → SHORT     (부족 처리, 이미 존재)
     → CANCEL
```

---

## 8. 구현 현황

### ✅ 구현 완료

| 항목 | 위치 | 내용 |
|------|------|------|
| 재고 할당 | `OmsShipmentOrderService.allocateShipmentOrders()` | 가용 재고 조회 → stock_allocations 생성, BACK_ORDER 분기 |
| 할당 부족 보충 지시 자동 생성 | `OmsReplenishOrderService.createReplenishForOrder()` | BACK_ORDER 시 자동 호출 |
| 할당 해제 | `OmsShipmentOrderService.deallocateShipmentOrder()` | stock_allocations 삭제, reserved_qty 환원 |
| 피킹 부족 처리 API | `FulfillmentPickingService.shortItem()` | pick_qty / short_qty 기록, STATUS_SHORT 설정 |
| INDIVIDUAL 재고 해제 | `FulfillmentPickingService.deallocateShortQty()` | short_qty만큼 stock_allocations 해제, reserved_qty 환원 |
| 피킹 완료 후 주문 상태 갱신 | `FulfillmentPickingService.updateShipmentOrdersAfterPicking()` | PACKING / BACK_ORDER 분기, ShipmentOrderItem.short_qty 갱신 |
| PC 피킹 화면 부족 처리 버튼 | `fulfillment-picking-pc.js` | F4 / [부족 처리] 버튼, 수량 입력 다이얼로그 |
| PDA 피킹 화면 부족 처리 | `pda-fulfillment-picking.js` | 전량 부족 고정 처리 (pick_qty = 0) |
| 피킹 부족 처리 상태 분기 **(B-1)** | `FulfillmentPickingService.shortItem()` | pick_qty > 0 → STATUS_PICKED, pick_qty = 0 → STATUS_SHORT |
| 포장 지시 생성 (INDIVIDUAL) **(B-2, B-3)** | `FulfillmentTransactionService.createPackingOrders()` | PICKED + SHORT 전체 포함, 전량 부족은 STATUS_SHORT로 생성, short_qty 저장 |
| 포장 지시 생성 (TOTAL) | `FulfillmentTransactionService.createPackingOrdersFromBatch()` | stock_allocations → PackingOrderItem |
| 포장 완료 처리 (기존) | `FulfillmentPackingService.completePackingOrder()` | INSPECTED → PACKED, COMPLETED 처리 |
| 출하 상태 검증 | `FulfillmentShippingService` | COMPLETED/LABEL_PRINTED/MANIFESTED 외 차단 (SHORT 자동 차단됨) |
| `PackingOrder.STATUS_SHORT` 상수 **(N-1)** | `PackingOrder.java` | `"SHORT"` 상수 추가 — 부족 아이템 있어 출하 차단 상태 |
| 포장 완료 SHORT 분기 **(N-2)** | `FulfillmentPackingService.completePackingOrder()` | SHORT 아이템 존재 시 `STATUS_SHORT` 로 완료, 아니면 `STATUS_COMPLETED` |
| 포장 아이템 부족 처리 서비스 **(N-3)** | `FulfillmentPackingService.shortPackingOrderItem()` | WAIT/INSPECTED → SHORT, short_qty 저장 |
| 포장 아이템 부족 처리 API **(N-3)** | `FulfillmentTransactionController` | `POST /rest/ful_trx/packing_orders/{id}/items/{item_id}/short` |
| B2C 포장 화면 부족 처리 UI **(N-4)** | `fulfillment-b2c-packing-pc.js` | 부족 경고 배너, SHORT 행 표시, [부족 처리] 버튼, 다이얼로그, 완료 경고 |
| B2B 포장 화면 부족 처리 UI **(N-4)** | `fulfillment-b2b-packing-pc.js` | 동일 (B2B: 운송장 없음, 거래명세서 출력 흐름 유지) |

### ⚠ 버그 — 수정 완료

| # | 항목 | 위치 | 수정 내용 |
|---|------|------|----------|
| B-1 | 부분 부족 시 STATUS_SHORT 오설정 | `FulfillmentPickingService.shortItem()` | `pick_qty > 0` → STATUS_PICKED, `pick_qty = 0` → STATUS_SHORT 분기 |
| B-2 | 포장 지시 아이템 생성 로직 | `FulfillmentTransactionService.createPackingOrders()` | PICKED + SHORT 전체 포함, 전량 부족(pick_qty=0)은 STATUS_SHORT로 즉시 생성 |
| B-3 | PackingOrderItem.short_qty 미저장 | `FulfillmentTransactionService.createPackingOrders()` | `pti.getShortQty()` 실제 값 저장 |

### ❌ 미구현 (후속 처리 — 별도 설계 필요)

| # | 항목 | 관련 내용 |
|---|------|-----------|
| F-1 | `shortage_packing_mappings` 테이블 생성 | 부족분 피킹 지시 ↔ 원본 포장 주문 연결 매핑 |
| F-2 | 부족분 토털 피킹 지시 생성 API | `POST /rest/ful_trx/shortage_picking/create` |
| F-3 | 부족분 포장 주문 분배 API | `POST /rest/ful_trx/shortage_picking/{pickTaskId}/distribute` |
| F-4 | SHORT 포장 주문 관리 화면 | `shortage-packing-list.js` — SHORT 목록 조회 + 부족분 피킹 지시 생성 버튼 |

---

## 9. 수정·추가 구현 항목

### 9-1. [B-1 완료] shortItem() 상태 분기

**파일**: `src/main/java/operato/wms/fulfillment/service/FulfillmentPickingService.java`

```java
// 부분 부족(pick_qty > 0)은 PICKED 유지 → 포장 지시 생성 대상 포함
// 전량 부족(pick_qty = 0)은 SHORT → 포장 지시에서 STATUS_SHORT로 생성
String newStatus = pickQty > 0 ? PickingTaskItem.STATUS_PICKED : PickingTaskItem.STATUS_SHORT;
item.setStatus(newStatus);
```

### 9-2. [B-2, B-3 완료] createPackingOrders() 수정

**파일**: `src/main/java/operato/wms/fulfillment/service/FulfillmentTransactionService.java`

```java
// PICKED + SHORT 전체 조회 (전량 부족 항목 포함)
String pickItemSql = "SELECT * FROM picking_task_items"
    + " WHERE domain_id = :domainId AND pick_task_id = :pickTaskId"
    + " AND status IN (:picked, :short)"
    + " ORDER BY rank";

// PackingOrderItem 생성 시 상태 분기
double pickQty = pti.getPickQty() != null ? pti.getPickQty() : 0.0;
double shortQty = pti.getShortQty() != null ? pti.getShortQty() : 0.0;
poi.setOrderQty(pickQty);
poi.setShortQty(shortQty);
// 전량 부족(pick_qty=0)은 처음부터 SHORT — 포장 작업 없이 출하 차단 대상으로 표시
poi.setStatus(pickQty == 0 ? PackingOrderItem.STATUS_SHORT : PackingOrderItem.STATUS_WAIT);
```

### 9-3. [N-1 ✅ 완료] PackingOrder.STATUS_SHORT 추가

**파일**: `src/main/java/operato/wms/fulfillment/entity/PackingOrder.java`

```java
public static final String STATUS_SHORT = "SHORT";
```

### 9-4. [N-2 ✅ 완료] completePackingOrder() SHORT 분기 처리

**파일**: `src/main/java/operato/wms/fulfillment/service/FulfillmentPackingService.java`

```java
// L154 이후, 상태 업데이트 SQL 앞에 추가
String shortCheckSql = "SELECT COUNT(*) FROM packing_order_items"
    + " WHERE domain_id = :domainId AND packing_order_id = :id AND status = 'SHORT'";
int shortCount = this.queryManager.selectBySql(shortCheckSql,
    ValueUtil.newMap("domainId,id", domainId, id), Integer.class);

String finalStatus = shortCount > 0
    ? PackingOrder.STATUS_SHORT
    : PackingOrder.STATUS_COMPLETED;

// 기존 SQL의 STATUS_COMPLETED → finalStatus로 교체
```

### 9-5. [N-3 ✅ 완료] 포장 아이템 부족 처리 API 추가

**파일**: `src/main/java/operato/wms/fulfillment/service/FulfillmentPackingService.java`

```java
/**
 * 포장 아이템 부족 처리
 * - PackingOrderItem.status = SHORT
 * - PackingOrderItem.short_qty = params.short_qty
 */
public Map<String, Object> shortPackingOrderItem(String packingOrderId, String itemId,
        Map<String, Object> params) { ... }
```

**파일**: `src/main/java/operato/wms/fulfillment/rest/PackingOrderController.java` (또는 `FulfillmentTransactionController.java`)

```
POST /rest/ful_trx/packing_orders/{id}/items/{itemId}/short
  body: { short_qty: 4 }
```

### 9-6. [N-4 ✅ 완료] 포장 PC 화면 부족 처리 UI 추가

**파일**: `frontend/packages/operato-wes/client/pages/fulfillment/fulfillment-b2c-packing-pc.js`  
**파일**: `frontend/packages/operato-wes/client/pages/fulfillment/fulfillment-b2b-packing-pc.js`

| 추가 항목 | 구현 내용 |
|-----------|-----------|
| 부족 경고 배너 | `status=SHORT` 또는 `short_qty > 0` 아이템 존재 시 검수 테이블 위 주황 배너 표시 |
| SHORT 아이템 행 표시 | 주황 배경 + 취소선 + `부족` 빨간 뱃지, `short_qty` 표시 |
| [부족 처리] 버튼 | 현재 아이템 패널에 추가 — WAIT/INSPECTED 상태 아이템에만 표시 |
| 부족 처리 다이얼로그 | 주문/검수/부족 수량 표시 + "출하가 차단됩니다" 경고, 확인 시 API 호출 |
| API 연동 | `POST /rest/ful_trx/packing_orders/{id}/items/{item_id}/short` |
| completedCount 산정 | `SHORT` 아이템은 완료 카운트에 포함 (추가 검수 불필요) |
| 바코드 스캔 | `SHORT` 아이템은 SKU 매칭에서 제외 |
| 완료 단계 진입 경고 | SHORT 아이템 존재 시 완료 버튼 주황색 + "N건 포함 (출하가 차단됩니다)" 표시 |
| 포장 패널 요약 | "전체 일치" 행에 부족 건수 및 출하 차단 표시 |

### 9-7. [F-1~F-4 ❌ 미구현] 부족분 토털 피킹 지시 생성

> 신규 테이블 및 복수 화면 필요. 별도 설계 후 구현 예정.

**신규 테이블**:

```sql
CREATE TABLE shortage_packing_mappings (
  id                    VARCHAR PRIMARY KEY,
  domain_id             BIGINT NOT NULL,
  pick_task_id          VARCHAR NOT NULL,       -- 부족전용 피킹 지시 ID
  packing_order_id      VARCHAR NOT NULL,
  packing_order_item_id VARCHAR NOT NULL,
  short_qty             NUMERIC NOT NULL,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP
);
```

**신규 API**:

```
POST /rest/ful_trx/shortage_picking/create
  body: { packing_order_ids: [...] }
  → SHORT 포장 주문 선택 → SKU별 short_qty 합산 → PickingTask(TOTAL) 생성
  → shortage_packing_mappings 등록

POST /rest/ful_trx/shortage_picking/{pickTaskId}/distribute
  → 부족분 피킹 완료 후 원본 포장 주문으로 수량 분배
  → PackingOrderItem(SHORT) → WAIT, PackingOrder(SHORT) → COMPLETED (전체 해소 시)
```

**신규 화면**:

```
fulfillment/shortage-packing-list.js
  → packing_orders WHERE status = 'SHORT' 목록
  → 선택 후 부족분 피킹 지시 생성 버튼
```

---

## 10. 구현 현황 요약

### ✅ 완료된 항목 (2026-06-22 기준)

| 순서 | 항목 | 상태 |
|------|------|------|
| B-1 | `shortItem()` 상태 분기 버그 수정 | ✅ 완료 |
| B-2 | `createPackingOrders()` PICKED+SHORT 포함 | ✅ 완료 |
| B-3 | `PackingOrderItem.short_qty` 저장 | ✅ 완료 |
| N-1 | `PackingOrder.STATUS_SHORT` 상수 추가 | ✅ 완료 |
| N-2 | `completePackingOrder()` SHORT 분기 | ✅ 완료 |
| N-3 | 포장 아이템 부족 처리 서비스 + API | ✅ 완료 |
| N-4 | B2C/B2B 포장 PC 화면 부족 처리 UI | ✅ 완료 |

### ❌ 미구현 항목 (후속 처리 — 별도 설계 필요)

| 순서 | 항목 | 이유 |
|------|------|------|
| F-1 | `shortage_packing_mappings` 테이블 설계·생성 | 부족분 피킹↔포장 매핑 저장소 |
| F-2 | 부족분 토털 피킹 지시 생성 API | SHORT 포장 주문 SKU별 합산 → PickingTask 생성 |
| F-3 | 부족분 포장 주문 분배 API | 피킹 완료 후 원본 SHORT 아이템 WAIT 복원 |
| F-4 | SHORT 포장 주문 관리 화면 | 목록 조회 + 부족분 피킹 지시 생성 트리거 |
