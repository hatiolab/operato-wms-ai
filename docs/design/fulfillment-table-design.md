# Fulfillment 모듈 설계 문서

> 작성일: 2026-03-26
> 패키지: `operato.wms.fulfillment`
> 역할: 풀필먼트 실행 — 피킹·검수/포장·출하 확정
> 대상: B2C 풀필먼트 센터 (일 100~10,000건), B2B 납품

---

## 목차

1. [개요](#1-개요)
2. [모듈 범위 및 아키텍처](#2-모듈-범위-및-아키텍처)
3. [표준 프로세스](#3-표준-프로세스)
4. [상태 전이 다이어그램](#4-상태-전이-다이어그램)
5. [테이블 설계](#5-테이블-설계)
6. [ER 다이어그램](#6-er-다이어그램)
7. [공통코드 및 상수](#7-공통코드-및-상수)
8. [주요 설정값](#8-주요-설정값)
9. [API 목록](#9-api-목록)
10. [재고 연동](#10-재고-연동)
11. [OMS 모듈 연동](#11-oms-모듈-연동)
12. [커스텀 서비스 (DIY)](#12-커스텀-서비스-diy)

---

## 1. 개요

### 1.1 모듈 정의

Fulfillment 모듈은 OMS 모듈이 확정한 웨이브를 인계받아 **피킹·검수/포장·출하**를 실행하는 **오퍼레이션 계층**입니다.
"어떻게, 어디서, 누가 작업할 것인가"를 실행하고 결과를 기록합니다.

```
OMS (계획 계층)                          Fulfillment (실행 계층)
─────────────────────────────          ─────────────────────────────
 주문 수신 → 확인 → 할당 → 웨이브         피킹 → 검수/포장 → 라벨 → 출하
 "무엇을, 얼마나, 언제까지"               "어떻게, 어디서, 누가"
```

- **입력**: OMS 웨이브 확정 시 `FulfillmentReleaseRequest` (주문 목록, 할당 내역, 보충 지시)
- **출력**: `PickingStartedEvent`, `PackingStartedEvent`, `ShipmentCompletedEvent` 이벤트 발행
- **범위**: 피킹 실행이 필요한 경우만 처리 (WCS는 OMS에서 직접 API 호출)

### 1.2 지원 작업 유형

| 작업 유형 | 설명 | 피킹 방식 | 검수 | 포장 |
|----------|------|----------|------|------|
| B2C 풀필먼트 (낱개) | 단품 주문, 1SKU 1개 | 개별 피킹 | 생략 가능 | 간이 포장 |
| B2C 풀필먼트 (합포장) | 복수 SKU 주문 | 토탈 피킹 → 분배 | 전수 검수 | 박스 포장 |
| B2B 납품 | 대량 단일 거래처 | 개별 피킹 | 생략 | 팔레트/박스 |
| 반품 재출고 | 반품 후 재출고 | 개별 피킹 | 전수 검수 | 재포장 |

### 1.3 피킹 유형별 흐름

#### 개별 피킹 (INDIVIDUAL) — 오더 피킹

```
웨이브 인계 → 주문별 피킹 지시 생성 (1 주문 = 1 피킹 지시)
  → 피킹(PDA/RF) → 검수/포장 → 라벨 → 출하
```

- 주문 단위로 피킹 → 포장까지 1:1 연결
- B2B, 소량 B2C에 적합

#### 토탈 피킹 (TOTAL) — 합산 피킹

```
웨이브 인계 → SKU별 합산 피킹 지시 생성 (N 주문 = 1 피킹 지시)
  → 합산 피킹(카트/컨베이어)
  → 포장 스테이션에서 주문별 분배(수작업 / 오더 피킹 또는 WCS 위임)
  → 검수/포장 → 라벨 → 출하
```

- 동일 SKU를 한 번에 피킹하여 효율 극대화
- 대량 B2C에 적합 (일 1,000건 이상)

#### 존 피킹 (ZONE) — 릴레이 피킹

```
웨이브 인계 → 존별 피킹 지시 생성 (N 존 = N 피킹 지시)
  → 존별 피킹 → 합류 지점에서 합산
  → 검수/포장 → 라벨 → 출하
```

- 대형 창고에서 존별 분할 작업
- 존 경계를 넘지 않으므로 이동 거리 최소화

### 1.4 테이블 구성 요약

| # | 테이블 | 엔티티 | 설명 | 유형 |
|---|--------|--------|------|------|
| 1 | `picking_tasks` | PickingTask | 피킹 지시 (헤더) | 실테이블 |
| 2 | `picking_task_items` | PickingTaskItem | 피킹 지시 상세 | 실테이블 |
| 3 | `packing_orders` | PackingOrder | 검수/포장/출하 지시 (헤더) | 실테이블 |
| 4 | `packing_order_items` | PackingOrderItem | 검수/포장 상세 | 실테이블 |
| 5 | `packing_boxes` | PackingBox | 포장 박스 | 실테이블 |
| 6 | `fulfillment_progress` | FulfillmentProgress | 풀필먼트 진행 현황 뷰 | 뷰 (ignoreDdl) |

> OMS 모듈의 `shipment_orders`, `stock_allocations` 등을 참조하되, 테이블명은 **완전히 분리**됩니다.
> 기존 outbound 모듈의 `picking_orders`, `picking_order_items`와도 독립적인 신규 테이블입니다.

---

## 2. 모듈 범위 및 아키텍처

### 2.1 OMS ↔ Fulfillment 역할 분리

```
┌───────────────────────────────────────────────────────────────────┐
│                        OMS 모듈                                    │
│  operato.wms.oms                                                   │
│                                                                     │
│  주문 수신 → 확인 → 재고 할당 → 웨이브 생성 → 웨이브 확정           │
│                                                                     │
│  주요 엔티티:                                                       │
│  ShipmentOrder, ShipmentWave, ShipmentDelivery,                    │
│  ReplenishOrder, StockAllocation                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ releaseWave()
                            │ FulfillmentReleaseRequest
                            │  - waveNo, pickType, inspFlag
                            │  - orders[], allocations[], replenishes[]
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                   Fulfillment 모듈                                  │
│  operato.wms.fulfillment                                           │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ 피킹 지시 │→│ 검수/포장     │→│ 라벨 발행 │→│ 출하 확정     │  │
│  │(Picking) │  │(Inspection/  │  │(Label)   │  │(Shipping)    │  │
│  │          │  │  Packing)    │  │          │  │              │  │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────────┘  │
│                                                                     │
│  주요 엔티티:                                                       │
│  PickingTask, PackingOrder, PackingBox                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ ApplicationEvent 발행
                            │  - PickingStartedEvent
                            │  - PackingStartedEvent
                            │  - ShipmentCompletedEvent
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│  OMS 이벤트 리스너 (OmsEventListener)                               │
│  RELEASED → PICKING → PACKING → SHIPPED                           │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 모듈 내부 레이어

```
operato.wms.fulfillment/
├── entity/                 ← 엔티티 (5 실테이블 + 1 뷰)
│   ├── PickingTask.java
│   ├── PickingTaskItem.java
│   ├── PackingOrder.java
│   ├── PackingOrderItem.java
│   ├── PackingBox.java
│   └── FulfillmentProgress.java
├── rest/                   ← REST 컨트롤러
│   ├── PickingTaskController.java
│   ├── PackingOrderController.java
│   ├── PackingBoxController.java
│   ├── FulfillmentProgressController.java
│   └── FulfillmentTransactionController.java  ← 트랜잭션 API
├── service/                ← 비즈니스 로직
│   ├── FulfillmentTransactionService.java     ← 풀필먼트 트랜잭션
│   ├── FulfillmentPickingService.java         ← 피킹 로직
│   ├── FulfillmentPackingService.java         ← 검수/포장 로직
│   ├── FulfillmentShippingService.java        ← 출하 로직
│   └── FulfillmentEventPublisher.java         ← OMS 이벤트 발행
├── query/store/            ← 쿼리 스토어
├── config/                 ← 모듈 설정
├── util/                   ← 유틸리티
└── web/initializer/        ← 모듈 초기화
```

### 2.3 이벤트 발행 구조

Fulfillment 모듈은 작업 진행 시 **Spring ApplicationEvent**를 발행하고,
OMS 모듈의 `OmsEventListener`가 이를 구독하여 `ShipmentOrder` 상태를 업데이트합니다.

```
┌──────────────────────┐     publish      ┌──────────────────────┐
│  FulfillmentEvent-   │ ──────────────→  │  OmsEventListener    │
│  Publisher           │  ApplicationEvent │                      │
│                      │                   │  onPickingStarted()  │
│  publishPicking-     │                   │  onPackingStarted()  │
│  Started()           │                   │  onShipmentCompleted │
│  publishPacking-     │                   │  ()                  │
│  Started()           │                   │                      │
│  publishShipment-    │                   │  ShipmentOrder 상태   │
│  Completed()         │                   │  업데이트             │
└──────────────────────┘                   └──────────────────────┘
```

> **단방향 원칙**: Fulfillment → OMS는 이벤트로 통지. OMS → Fulfillment는 서비스 직접 호출(인계, 취소).

---

## 3. 표준 프로세스

### 3.1 B2C 개별 피킹 프로세스 (INDIVIDUAL)

```
[OMS 웨이브 확정 (RELEASED)]                     ← releaseWave()
    ↓
[피킹 지시 생성]                                  ← createPickingTasks()
    ├─ 주문별 1건의 PickingTask 생성
    ├─ StockAllocation 기반 PickingTaskItem 생성
    └─ 재고 상태: ALLOCATED → PICKING
    ↓
[피킹 시작 (→ IN_PROGRESS)]                      ← startPickingTask()
    ├─ PDA 바코드 첫 스캔으로 피킹 시작
    ├─ PickingStartedEvent 발행 → OMS PICKING
    ├─ 수량 차이 시 short_qty 기록
    └─ 피킹 항목별 pick_qty 업데이트
    ↓
[피킹 완료 (→ COMPLETED)]                        ← completePickingTask()
    ├─ 전체 항목 피킹 완료 확인
    ├─ 부족분 처리 (SHORT 항목 → OMS PartialShipmentEvent)
    └─ 자동 검수/포장 지시 생성 (설정 시)
    ↓
[검수/포장 (PackingOrder)]                        ← createPackingOrder()
    ├─ 검수 유형: FULL(전수) / SAMPLING(표본) / SKIP(생략)
    ├─ 피킹 수량 vs 주문 수량 대조
    ├─ 박스 유형 결정 (BOX/BAG/ENVELOPE)
    ├─ PackingBox 생성 + 아이템 매핑
    └─ PackingStartedEvent 발행 → OMS PACKING
    ↓
[포장 완료 (PackingOrder → COMPLETED)]            ← completePackingOrder()
    ├─ 최종 포장 수량/박스 수 확정
    └─ 택배사/송장번호 매핑
    ↓
[라벨 출력 (→ LABEL_PRINTED)]                     ← printLabel()
    └─ 운송장 라벨 출력
    ↓
[적하 목록 전송 (→ MANIFESTED)]                    ← createManifest()
    └─ 매니페스트 전송
    ↓
[출하 확정 (→ SHIPPED)]                           ← confirmShipping()
    ├─ 재고 최종 차감: PICKING → OUT
    ├─ ShipmentCompletedEvent 발행 → OMS SHIPPED
    └─ OMS ShipmentOrder.shipped_qty 업데이트
```

### 3.2 B2C 토탈 피킹 프로세스 (BATCH/TOTAL)

```
[OMS 웨이브 확정 (RELEASED)]
    ↓
[합산 피킹 지시 생성]                              ← createBatchPickingTask()
    ├─ 웨이브 내 N건 주문의 동일 SKU를 합산
    ├─ 1건의 PickingTask + SKU별 PickingTaskItem
    └─ item에 shipment_order_id = NULL (합산이므로)
    ↓
[합산 피킹 시작]                                   ← startPickingTask()
    ├─ PickingStartedEvent 발행 (waveNo 단위) → OMS PICKING
    ├─ 카트 또는 컨테이너에 SKU별 합산 수량 피킹
    ├─ 피킹존 순서(로케이션 경로) 최적화
    └─ PDA/RF로 스캔 확인
    ↓
[합산 피킹 완료]                                   ← completePickingTask()
    ↓
[주문별 분배 + 검수/포장]                          ← createPackingOrdersFromBatch()
    ├─ 합산 피킹 결과를 주문별로 분배
    ├─ 주문별 PackingOrder 생성 (N건)
    ├─ 수작업 분류 또는 분류 설비 사용 시 WCS 위임
    ├─ 검수 실행 (수량 대조)
    ├─ 박스 포장 + 라벨 부착
    └─ PackingStartedEvent 발행 (주문별)
    ↓
[출하 확정]                                        ← confirmShipping()
    ├─ PackingOrder 상태: → SHIPPED
    ├─ ShipmentCompletedEvent 발행 (주문별)
    └─ 웨이브 내 전체 출하 완료 시 → OMS Wave COMPLETED
```

### 3.3 B2B 납품 프로세스

```
[OMS 인계 (RELEASED)]
    ↓
[피킹 지시 생성 (개별)]                            ← createPickingTasks()
    ├─ 대량 단일 주문 → 1건의 PickingTask
    └─ 팔레트 단위 피킹
    ↓
[피킹 시작 (PDA)]                                  ← startPickingTask()
    ├─ PickingStartedEvent 발행 → OMS PICKING
    ├─ 로케이션 → 팔레트/박스 단위 피킹
    └─ 실수량 기록
    ↓
[피킹 완료]                                        ← completePickingTask()
    ↓
[검수 생략 → 출하 확정]                            ← confirmShipping()
    ├─ 검수 설정이 SKIP이면 포장 단계 생략
    ├─ 차량 번호/도크 할당
    └─ ShipmentCompletedEvent 발행
```

### 3.4 간소화 프로세스 (소규모 창고)

```
[OMS 인계]  →  [피킹 + 즉시 출하]  →  [출하 완료]
                 startAndComplete()    confirmShipping()
```

**생략 가능 항목**:
- **검수/포장**: `ful.packing.auto-skip.single-item = true` 설정 시 단품 주문은 포장 생략
- **출하 지시**: `ful.shipping.auto-create.on-packing = true` 설정 시 포장 완료 즉시 출하 생성
- **별도 라벨**: `ful.label.auto-print.on-packing = true` 설정 시 포장 시 자동 라벨 출력

---

## 4. 상태 전이 다이어그램

### 4.1 피킹 지시 (PickingTask) 상태

```
CREATED ─→ IN_PROGRESS ─→ COMPLETED
   │              │
   │              └── completePickingTask()
   └──────────────── startPickingTask()

 * CANCELLED: cancelPickingTask() — 어느 상태에서든 취소 가능 (단, IN_PROGRESS 이후는 확인 필요)
```

| 상태 | 코드 | 설명 | 주체 |
|------|------|------|------|
| 생성 | `CREATED` | 피킹 지시 생성, 작업 대기 | 시스템 |
| 진행 중 | `IN_PROGRESS` | 피킹 작업 진행 중 (PDA 스캔 시작) | 작업자 |
| 완료 | `COMPLETED` | 전체 피킹 완료 | 작업자/시스템 |
| 취소 | `CANCELLED` | 피킹 지시 취소 | 관리자 |

### 4.2 피킹 지시 상세 (PickingTaskItem) 상태

```
WAIT ─→ RUN ─→ PICKED
  │       │
  │       └── 부족 발생 시: → SHORT
  └──────── 취소 시: → CANCEL
```

| 상태 | 코드 | 설명 |
|------|------|------|
| 대기 | `WAIT` | 피킹 대기 |
| 진행 | `RUN` | 피킹 중 (스캔 시작) |
| 완료 | `PICKED` | 피킹 완료 (pick_qty = order_qty) |
| 부족 | `SHORT` | 피킹 부족 (pick_qty < order_qty, short_qty > 0) |
| 취소 | `CANCEL` | 피킹 취소 |

### 4.3 검수/포장/출하 (PackingOrder) 상태

```
CREATED ─→ IN_PROGRESS ─→ COMPLETED ─→ LABEL_PRINTED ─→ MANIFESTED ─→ SHIPPED
  │              │              │              │                │
  │              │              │              │                └── confirmShipping()
  │              │              │              └──────────────── createManifest()
  │              │              └──────────────────────────────── printLabel()
  │              └── completePackingOrder()
  └──────────────── startPackingOrder()

 * CANCELLED: cancelPackingOrder() 또는 cancelShipping() (출하 후 취소)
```

| 상태 | 코드 | 설명 | 주체 |
|------|------|------|------|
| 생성 | `CREATED` | 포장 지시 생성, 작업 대기 | 시스템 |
| 진행 중 | `IN_PROGRESS` | 검수/포장 작업 진행 중 | 작업자 |
| 완료 | `COMPLETED` | 검수/포장 완료, 출하 대기 | 작업자/시스템 |
| 라벨 출력 | `LABEL_PRINTED` | 운송장/라벨 출력 완료 | 시스템 |
| 적하 목록 | `MANIFESTED` | 적하 목록(매니페스트) 전송 완료 | 시스템 |
| 출하 완료 | `SHIPPED` | 최종 출하 확정 (차량 상차 완료) | 작업자/시스템 |
| 취소 | `CANCELLED` | 취소 (포장 전 취소 또는 출하 후 취소) | 관리자 |

### 4.4 포장 박스 (PackingBox) 상태

```
OPEN ─→ CLOSED ─→ SHIPPED
```

| 상태 | 코드 | 설명 |
|------|------|------|
| 열림 | `OPEN` | 포장 진행 중 (아이템 투입 가능) |
| 닫힘 | `CLOSED` | 포장 완료 (봉함, 중량 확정) |
| 출하 | `SHIPPED` | 출하 확정 |

---

## 5. 테이블 설계

> 모든 테이블은 `ElidomStampHook`을 상속하여 `domain_id`, `created_at`, `updated_at` 필드를 자동 포함합니다.

### 5.1 picking_tasks — 피킹 지시 (헤더)

OMS 웨이브 확정 시 생성되는 피킹 작업 단위. 개별 피킹은 주문별 1건, 토탈 피킹은 웨이브별 1건 생성.

**Lifecycle**:
- `@PrePersist` — `pick_task_no` 자동 채번, `status` 기본값 `CREATED`

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `pick_task_no` | VARCHAR | N | 30 | 피킹 지시 번호 (자동 채번, UNIQUE) |
| `wave_no` | VARCHAR | N | 30 | 웨이브 번호 (FK → shipment_waves) |
| `shipment_order_id` | VARCHAR | Y | 40 | 출하 주문 ID (개별 피킹 시, FK → shipment_orders) |
| `shipment_no` | VARCHAR | Y | 30 | 출하 주문 번호 (개별 피킹 시) |
| `order_date` | VARCHAR | N | 10 | 작업 일자 (YYYY-MM-DD) |
| `com_cd` | VARCHAR | N | 30 | 화주사 코드 |
| `wh_cd` | VARCHAR | N | 30 | 창고 코드 |
| `pick_type` | VARCHAR | N | 20 | 피킹 유형 (INDIVIDUAL/TOTAL/ZONE) |
| `pick_method` | VARCHAR | Y | 20 | 피킹 방식 (WCS/PAPER/INSPECT/PICK) |
| `zone_cd` | VARCHAR | Y | 30 | 존 코드 (존 피킹 시) |
| `worker_id` | VARCHAR | Y | 40 | 피킹 작업자 ID |
| `priority_cd` | VARCHAR | Y | 10 | 우선순위 코드 (URGENT/HIGH/NORMAL/LOW) |
| `estimated_time` | INTEGER | Y | - | 예상 소요 시간 (분) — 피킹 지시 생성 시 plan_item 기반 산출 |
| `plan_order` | INTEGER | Y | - | 계획 주문 수 |
| `plan_item` | INTEGER | Y | - | 계획 SKU 종 수 |
| `plan_total` | DOUBLE | Y | - | 계획 총 수량 |
| `result_order` | INTEGER | Y | - | 실적 주문 수 |
| `result_item` | INTEGER | Y | - | 실적 SKU 종 수 |
| `result_total` | DOUBLE | Y | - | 실적 총 수량 |
| `short_total` | DOUBLE | Y | - | 부족 총 수량 |
| `status` | VARCHAR | N | 20 | 상태 (CREATED/IN_PROGRESS/COMPLETED/CANCELLED) |
| `started_at` | VARCHAR | Y | 20 | 작업 시작 일시 |
| `completed_at` | VARCHAR | Y | 20 | 작업 완료 일시 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_picking_tasks_0` | `domain_id, pick_task_no` | Y |
| `ix_picking_tasks_1` | `domain_id, wave_no` | N |
| `ix_picking_tasks_2` | `domain_id, shipment_order_id` | N |
| `ix_picking_tasks_3` | `domain_id, order_date, status` | N |
| `ix_picking_tasks_4` | `domain_id, com_cd, wh_cd` | N |
| `ix_picking_tasks_5` | `domain_id, worker_id, status` | N |
| `ix_picking_tasks_6` | `domain_id, pick_type, status` | N |

---

### 5.2 picking_task_items — 피킹 지시 상세

피킹 지시의 개별 작업 항목. 재고 로케이션별 피킹 수량을 관리.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `pick_task_id` | VARCHAR | N | 40 | FK → picking_tasks |
| `shipment_order_id` | VARCHAR | Y | 40 | FK → shipment_orders (개별 피킹 시) |
| `shipment_order_item_id` | VARCHAR | Y | 40 | FK → shipment_order_items |
| `stock_allocation_id` | VARCHAR | Y | 40 | FK → stock_allocations |
| `inventory_id` | VARCHAR | N | 40 | FK → inventories |
| `rank` | INTEGER | N | - | 순번 (피킹 경로 순서) |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | 100 | 상품명 |
| `barcode` | VARCHAR | Y | 50 | 재고 바코드 |
| `from_loc_cd` | VARCHAR | N | 30 | 출발 로케이션 (피킹존) |
| `to_loc_cd` | VARCHAR | Y | 30 | 도착 로케이션 (포장 스테이션/출하 도크) |
| `lot_no` | VARCHAR | Y | 50 | 로트 번호 |
| `serial_no` | VARCHAR | Y | 50 | 시리얼 번호 |
| `expired_date` | VARCHAR | Y | 10 | 유통기한 |
| `order_qty` | DOUBLE | N | - | 지시 수량 |
| `pick_qty` | DOUBLE | Y | - | 실적 수량 (기본값 0) |
| `short_qty` | DOUBLE | Y | - | 부족 수량 (기본값 0) |
| `status` | VARCHAR | Y | 20 | 상태 (WAIT/RUN/PICKED/SHORT/CANCEL) |
| `picked_at` | VARCHAR | Y | 20 | 피킹 완료 시각 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_picking_task_items_0` | `domain_id, pick_task_id, rank` | Y |
| `ix_picking_task_items_1` | `domain_id, pick_task_id, sku_cd` | N |
| `ix_picking_task_items_2` | `domain_id, pick_task_id, from_loc_cd` | N |
| `ix_picking_task_items_3` | `domain_id, pick_task_id, barcode` | N |
| `ix_picking_task_items_4` | `domain_id, pick_task_id, status` | N |
| `ix_picking_task_items_5` | `domain_id, pick_task_id, inventory_id` | N |
| `ix_picking_task_items_6` | `domain_id, shipment_order_id` | N |
| `ix_picking_task_items_7` | `domain_id, stock_allocation_id` | N |

---

### 5.3 packing_orders — 검수/포장 지시 (헤더)

피킹 완료 후 생성되는 검수+포장 통합 작업 단위. 개별 피킹은 주문별 1건, 토탈 피킹은 분배 후 주문별 1건 생성.

**Lifecycle**:
- `@PrePersist` — `pack_order_no` 자동 채번, `status` 기본값 `CREATED`

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `pack_order_no` | VARCHAR | N | 30 | 포장 지시 번호 (자동 채번, UNIQUE) |
| `pick_task_no` | VARCHAR | Y | 30 | 연결 피킹 지시 번호 |
| `shipment_order_id` | VARCHAR | Y | 40 | FK → shipment_orders |
| `shipment_no` | VARCHAR | Y | 30 | 출하 주문 번호 |
| `wave_no` | VARCHAR | Y | 30 | 웨이브 번호 |
| `order_date` | VARCHAR | N | 10 | 작업 일자 |
| `com_cd` | VARCHAR | N | 30 | 화주사 코드 |
| `wh_cd` | VARCHAR | N | 30 | 창고 코드 |
| `insp_type` | VARCHAR | Y | 20 | 검수 유형 (FULL/SAMPLING/SKIP) |
| `insp_result` | VARCHAR | Y | 10 | 검수 결과 (PASS/FAIL) |
| `station_cd` | VARCHAR | Y | 30 | 포장 스테이션 코드 |
| `worker_id` | VARCHAR | Y | 40 | 작업자 ID |
| `insp_qty` | DOUBLE | Y | - | 검수 수량 |
| `total_box` | INTEGER | Y | - | 포장 박스 수 |
| `carrier_cd` | VARCHAR | Y | 30 | 택배사 코드 |
| `carrier_service_type` | VARCHAR | Y | 20 | 택배 서비스 유형 (STANDARD/EXPRESS/SAME_DAY/NEXT_DAY/ECONOMY) |
| `total_wt` | DOUBLE | Y | - | 총 중량 (kg) |
| `dock_cd` | VARCHAR | Y | 30 | 출하 도크 코드 |
| `label_template_cd` | VARCHAR | Y | 36 | 라벨 템플릿 코드 |
| `status` | VARCHAR | N | 20 | 상태 (CREATED/IN_PROGRESS/COMPLETED/LABEL_PRINTED/MANIFESTED/SHIPPED/CANCELLED) |
| `started_at` | VARCHAR | Y | 20 | 작업 시작 일시 |
| `completed_at` | VARCHAR | Y | 20 | 작업 완료 일시 |
| `manifested_at` | VARCHAR | Y | 20 | 적하 목록 전송 일시 |
| `shipped_at` | VARCHAR | Y | 20 | 출하 확정 일시 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_packing_orders_0` | `domain_id, pack_order_no` | Y |
| `ix_packing_orders_1` | `domain_id, shipment_order_id` | N |
| `ix_packing_orders_2` | `domain_id, wave_no` | N |
| `ix_packing_orders_3` | `domain_id, pick_task_no` | N |
| `ix_packing_orders_4` | `domain_id, order_date, status` | N |
| `ix_packing_orders_5` | `domain_id, station_cd, status` | N |
| `ix_packing_orders_6` | `domain_id, carrier_cd, status` | N |
| `ix_packing_orders_7` | `domain_id, dock_cd, status` | N |

---

### 5.4 packing_order_items — 검수/포장 상세

포장 지시의 SKU별 상세. 검수 수량과 포장 수량을 개별 관리.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `packing_order_id` | VARCHAR | N | 40 | FK → packing_orders |
| `shipment_order_item_id` | VARCHAR | Y | 40 | FK → shipment_order_items |
| `packing_box_id` | VARCHAR | Y | 40 | FK → packing_boxes (포장 후 매핑) |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | 100 | 상품명 |
| `barcode` | VARCHAR | Y | 50 | 바코드 |
| `lot_no` | VARCHAR | Y | 50 | 로트 번호 |
| `expired_date` | VARCHAR | Y | 10 | 유통기한 |
| `order_qty` | DOUBLE | N | - | 지시 수량 (= 피킹 실적) |
| `insp_qty` | DOUBLE | Y | - | 검수 수량 (기본값 0) |
| `pack_qty` | DOUBLE | Y | - | 포장 수량 (기본값 0) |
| `short_qty` | DOUBLE | Y | - | 부족 수량 (기본값 0) |
| `status` | VARCHAR | Y | 20 | 상태 (WAIT/INSPECTED/PACKED/SHORT/CANCEL) |
| `remarks` | VARCHAR | Y | 1000 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_packing_order_items_0` | `domain_id, packing_order_id` | N |
| `ix_packing_order_items_1` | `domain_id, packing_order_id, sku_cd` | N |
| `ix_packing_order_items_2` | `domain_id, packing_box_id` | N |
| `ix_packing_order_items_3` | `domain_id, shipment_order_item_id` | N |
| `ix_packing_order_items_4` | `domain_id, packing_order_id, status` | N |

---

### 5.5 packing_boxes — 포장 박스

포장 단위. 하나의 포장 지시에 N개 박스. 합포장 주문은 복수 박스 가능.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `packing_order_id` | VARCHAR | N | 40 | FK → packing_orders |
| `box_seq` | INTEGER | N | - | 박스 순번 (포장 지시 내 UNIQUE) |
| `box_type_cd` | VARCHAR | Y | 20 | 박스 유형 코드 (BOX/BAG/ENVELOPE/PALLET, FK → 박스유형 마스터) |
| `box_wt` | DOUBLE | Y | - | 박스 중량 (kg) |
| `total_item` | INTEGER | Y | - | 포함 아이템 종 수 |
| `total_qty` | DOUBLE | Y | - | 포함 총 수량 |
| `invoice_no` | VARCHAR | Y | 50 | 송장 번호 (택배 운송장 번호) |
| `vehicle_no` | VARCHAR | Y | 30 | 차량 번호 |
| `label_printed_flag` | BOOLEAN | Y | - | 라벨 출력 여부 |
| `label_printed_at` | VARCHAR | Y | 20 | 라벨 출력 일시 |
| `shipped_at` | VARCHAR | Y | 20 | 박스별 출하 확정 일시 |
| `status` | VARCHAR | Y | 20 | 상태 (OPEN/CLOSED/SHIPPED) |
| `remarks` | VARCHAR | Y | 500 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_packing_boxes_0` | `domain_id, packing_order_id, box_seq` | Y |
| `ix_packing_boxes_1` | `domain_id, packing_order_id` | N |
| `ix_packing_boxes_2` | `domain_id, invoice_no` | N |
| `ix_packing_boxes_3` | `domain_id, status` | N |

---

### 5.6 fulfillment_progress — 풀필먼트 진행 현황 뷰

피킹→포장→출하 전체 진행 현황을 조인한 뷰. `ignoreDdl = true`.

```sql
CREATE OR REPLACE VIEW fulfillment_progress AS
SELECT
    pt.id,
    pt.pick_task_no,
    pt.wave_no,
    pt.shipment_order_id,
    pt.shipment_no,
    pt.order_date,
    pt.com_cd, pt.wh_cd,
    pt.pick_type, pt.pick_method,
    pt.worker_id,
    pt.plan_order, pt.plan_item, pt.plan_total,
    pt.result_total AS pick_result_qty,
    pt.short_total,
    pt.status AS pick_status,
    pt.started_at AS pick_started_at,
    pt.completed_at AS pick_completed_at,
    po.pack_order_no,
    po.insp_type, po.insp_result,
    po.total_box,
    po.carrier_cd,
    po.total_wt,
    po.dock_cd,
    po.status AS pack_status,
    po.started_at AS pack_started_at,
    po.completed_at AS pack_completed_at,
    po.manifested_at,
    po.shipped_at,
    pt.domain_id,
    pt.created_at, pt.updated_at
FROM
    picking_tasks pt
    LEFT OUTER JOIN packing_orders po
        ON pt.domain_id = po.domain_id
        AND (
            -- 개별 피킹: shipment_order_id 기반 매칭
            (pt.pick_type != 'TOTAL' AND pt.shipment_order_id = po.shipment_order_id)
            OR
            -- 토탈 피킹: wave_no 기반 매칭 (shipment_order_id가 NULL)
            (pt.pick_type = 'TOTAL' AND pt.wave_no = po.wave_no)
        )
```

---

## 6. ER 다이어그램

```
                    (OMS 모듈)
┌─────────────────────┐       ┌──────────────────────┐
│   shipment_waves    │       │  stock_allocations   │
│                     │       │                      │
│ wave_no (UNIQUE)    │       │ inventory_id         │
│ pick_type           │       │ alloc_qty            │
│ status              │       │ status               │
└─────────┬───────────┘       └──────────┬───────────┘
          │ 1:N (wave_no)                │ 1:1 (stock_allocation_id)
          │                              │
          │    (Fulfillment 모듈)        │
┌─────────▼───────────┐                 │
│   picking_tasks     │                 │
│                     │                 │
│ pick_task_no (UNQ)  │                 │
│ wave_no (FK)        │                 │
│ shipment_order_id   │                 │
│ pick_type           │                 │
│ worker_id           │                 │
│ status              │                 │
└─────────┬───────────┘                 │
          │ 1:N                         │
          │                             │
┌─────────▼───────────┐                │
│ picking_task_items  │────────────────┘
│                     │
│ inventory_id (FK)   │
│ stock_allocation_id │
│ shipment_order_id   │
│ sku_cd / barcode    │
│ from_loc_cd         │
│ order_qty / pick_qty│
│ short_qty           │
│ status              │
└─────────────────────┘

┌─────────────────────┐      ┌──────────────────────┐
│   packing_orders    │──1:N─│   packing_boxes      │
│                     │      │                      │
│ pack_order_no (UNQ) │      │ box_seq              │
│ pick_task_no        │      │ box_type_cd          │
│ shipment_order_id   │      │ box_wt               │
│ insp_type           │      │ total_qty            │
│ carrier_cd          │      │ invoice_no           │
│ dock_cd             │      │ status               │
│ status              │      └──────────────────────┘
└─────────┬───────────┘
          │ 1:N
          │
┌─────────▼───────────┐
│ packing_order_items │
│                     │
│ packing_box_id (FK) │
│ sku_cd / barcode    │
│ order_qty           │
│ insp_qty / pack_qty │
│ status              │
└─────────────────────┘
```

---

## 7. 공통코드 및 상수

### 7.1 피킹 유형 (pickType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `PICK_TYPE_INDIVIDUAL` | `INDIVIDUAL` | 개별 피킹 (오더 피킹, 주문 1건 = 피킹 1건) |
| `PICK_TYPE_TOTAL` | `TOTAL` | 토탈 피킹 (합산 피킹, 웨이브 내 SKU 합산) |
| `PICK_TYPE_ZONE` | `ZONE` | 존 피킹 (릴레이 피킹, 존별 분할 작업) |

### 7.2 피킹 방식 (pickMethod)

| 코드 | 값 | 설명 |
|------|-----|------|
| `PICK_METHOD_WCS` | `WCS` | WCS에 위임 (자동화 설비가 피킹 수행) |
| `PICK_METHOD_PAPER` | `PAPER` | 페이퍼 처리 (종이 피킹리스트 출력 후 수작업 피킹) |
| `PICK_METHOD_INSPECT` | `INSPECT` | 검수와 함께 피킹 (피킹과 검수를 동시 수행) |
| `PICK_METHOD_PICK` | `PICK` | 피킹 (PDA/RF 등 단말기로 피킹만 수행) |

### 7.3 pick_type · pick_method 비교

두 필드는 피킹 작업의 서로 다른 측면을 정의한다.

| 필드 | 질문 | 역할 |
|------|------|------|
| `pick_type` | **"무엇을"** 묶는가? | 주문을 어떤 전략으로 묶어서 피킹 지시를 생성할 것인가 (주문 단위 전략) |
| `pick_method` | **"어떻게"** 처리하는가? | 피킹 작업을 어떤 방식으로 처리할 것인가 (처리 방식) |

**pick_type에 따른 피킹 지시 생성 차이** (주문 100건, 웨이브 1개 기준):

| pick_type | 생성되는 피킹 지시 수 | 설명 |
|-----------|---------------------|------|
| `INDIVIDUAL` | 100건 | 주문 1건 = 피킹 1건 |
| `TOTAL` | 1건 | 웨이브 내 전체 SKU 합산 → 피킹 1건 |
| `ZONE` | 존 수만큼 (예: 3건) | 존별로 분할하여 피킹 지시 생성 |

#### 주요 운영 조합 예시

| 시나리오 | pick_type | pick_method | 설명 |
|---------|-----------|-------------|------|
| 자동화 대형 창고 | `ZONE` | `WCS` | 존별 분할 후 자동화 설비가 피킹 수행 |
| 소규모 수작업 | `INDIVIDUAL` | `PAPER` | 주문별 종이 리스트로 수작업 피킹 |
| B2C 소품종 (검수 동시) | `TOTAL` | `INSPECT` | SKU 합산 피킹하면서 동시에 검수 수행 |
| B2B / 일반 피킹 | `INDIVIDUAL` | `PICK` | 주문별 PDA/RF로 피킹만 수행 |

### 7.4 검수 유형 (inspType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `INSP_TYPE_FULL` | `FULL` | 전수 검수 (모든 아이템 수량 대조) |
| `INSP_TYPE_SAMPLING` | `SAMPLING` | 표본 검수 (일부만 검수) |
| `INSP_TYPE_SKIP` | `SKIP` | 검수 생략 |

### 7.5 포장 유형 (boxTypeCd)

| 코드 | 값 | 설명 |
|------|-----|------|
| `BOX_TYPE_BOX` | `BOX` | 종이 박스 |
| `BOX_TYPE_BAG` | `BAG` | 비닐 봉투 |
| `BOX_TYPE_ENVELOPE` | `ENVELOPE` | 봉투/패드 봉투 |
| `BOX_TYPE_PALLET` | `PALLET` | 팔레트 (B2B) |

### 7.6 라벨 유형 (labelType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `LABEL_TYPE_SHIPPING` | `SHIPPING` | 운송장 라벨 (송장 번호 포함) |
| `LABEL_TYPE_INVOICE` | `INVOICE` | 거래명세서 (B2B) |
| `LABEL_TYPE_GIFT` | `GIFT` | 선물 포장 라벨 |
| `LABEL_TYPE_CONTENT` | `CONTENT` | 내용물 표기 라벨 |

### 7.7 검수 결과 (inspResult)

| 코드 | 값 | 설명 |
|------|-----|------|
| `INSP_RESULT_PASS` | `PASS` | 검수 통과 |
| `INSP_RESULT_FAIL` | `FAIL` | 검수 실패 (재검수 필요) |

### 7.8 피킹 지시 상태 (PickingTask Status)

| 코드 | 값 | 설명 |
|------|-----|------|
| `STATUS_CREATED` | `CREATED` | 생성 |
| `STATUS_IN_PROGRESS` | `IN_PROGRESS` | 진행 중 |
| `STATUS_COMPLETED` | `COMPLETED` | 완료 |
| `STATUS_CANCELLED` | `CANCELLED` | 취소 |

### 7.9 포장 상세 상태 (PackingOrderItem Status)

| 코드 | 값 | 설명 |
|------|-----|------|
| `STATUS_WAIT` | `WAIT` | 대기 |
| `STATUS_INSPECTED` | `INSPECTED` | 검수 완료 |
| `STATUS_PACKED` | `PACKED` | 포장 완료 |
| `STATUS_SHORT` | `SHORT` | 부족 |
| `STATUS_CANCEL` | `CANCEL` | 취소 |

---

## 8. 주요 설정값

`RuntimeEnvItem`에 등록하여 화주사/창고별 설정 가능.

### 8.1 피킹 설정

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `ful.picking.default-method` | `PICK` | 기본 피킹 방식 (WCS/PAPER/INSPECT/PICK) |
| `ful.picking.path-optimize.enabled` | `true` | 피킹 경로 최적화 (로케이션 순서 정렬) |
| `ful.picking.path-optimize.strategy` | `S_SHAPE` | 경로 최적화 전략 (S_SHAPE/NEAREST/ZONE_SEQ) |
| `ful.picking.short-pick.allowed` | `true` | 부족 피킹 허용 (false 시 전량 피킹 필수) |
| `ful.picking.batch.max-items-per-cart` | `30` | 카트 피킹 시 최대 아이템 수 |

### 8.2 검수/포장 설정

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `ful.packing.default-insp-type` | `FULL` | 기본 검수 유형 (FULL/SAMPLING/SKIP) |
| `ful.packing.auto-skip.single-item` | `true` | 단품 주문 검수/포장 자동 생략 |
| `ful.packing.auto-create.on-pick-complete` | `true` | 피킹 완료 시 자동 포장 지시 생성 |
| `ful.packing.auto-box-type.enabled` | `false` | 수량/크기 기반 자동 박스 유형 결정 |
| `ful.packing.weight-check.enabled` | `false` | 포장 후 중량 검증 |
| `ful.packing.weight-check.tolerance-pct` | `5` | 중량 오차 허용 범위 (%) |

### 8.3 출하 설정

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `ful.shipping.auto-create.on-packing` | `true` | 포장 완료 시 자동 출하 지시 생성 |
| `ful.shipping.auto-confirm.on-label` | `false` | 라벨 출력 시 자동 출하 확정 |
| `ful.shipping.manifest.enabled` | `false` | 적하 목록(매니페스트) 전송 여부 |
| `ful.shipping.manifest.api-url` | - | 적하 목록 전송 API URL |
| `ful.shipping.dock.auto-assign.enabled` | `false` | 출하 도크 자동 배정 |

### 8.4 라벨/전표 설정

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `ful.label.auto-print.on-packing` | `false` | 포장 완료 시 자동 라벨 출력 |
| `ful.label.shipping.template` | - | 운송장 라벨 템플릿 코드 |
| `ful.label.invoice.template` | - | 거래명세서 템플릿 코드 |
| `ful.label.picking-list.template` | - | 피킹 리스트 출력 템플릿 |
| `ful.label.printer.default-id` | - | 기본 프린터 ID |

---

## 9. API 목록

Base URL: `/rest/ful_trx`

> **구현 상태 범례**: ✅ = Controller + Service 완료, Service = Service 메서드만 구현 (Controller 미작성), 빈칸 = 미구현

### 9.1 피킹 트랜잭션 API

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `picking_tasks/create` | 피킹 지시 생성 (OMS 웨이브 인계) | Service |
| POST | `picking_tasks/{id}/start` | 피킹 시작 (CREATED → IN_PROGRESS) | Service |
| POST | `picking_tasks/{id}/items/{item_id}/pick` | 개별 아이템 피킹 확인 (스캔) | Service |
| POST | `picking_tasks/{id}/items/{item_id}/short` | 피킹 부족 처리 | Service |
| POST | `picking_tasks/{id}/complete` | 피킹 완료 (IN_PROGRESS → COMPLETED) | Service |
| POST | `picking_tasks/{id}/cancel` | 피킹 취소 (→ CANCELLED) | Service |
| POST | `picking_tasks/{id}/start_and_complete` | 피킹 시작+완료 일괄 처리 (간소화 프로세스용, CREATED → COMPLETED) | |
| GET | `picking_tasks/{id}/items` | 피킹 항목 목록 조회 | Service |
| GET | `picking_tasks/worker/{worker_cd}` | 작업자별 할당 목록 조회 | Service |

### 9.2 검수/포장 트랜잭션 API

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `packing_orders/create` | 포장 지시 생성 (개별 피킹 완료 후, 1건) | Service |
| POST | `packing_orders/create_from_batch` | 토탈 피킹 후 주문별 포장 지시 일괄 생성 (N건) | Service |
| POST | `packing_orders/{id}/start` | 검수/포장 시작 (CREATED → IN_PROGRESS) | Service |
| POST | `packing_orders/{id}/items/{item_id}/inspect` | 아이템 검수 (수량 대조) | Service |
| POST | `packing_orders/{id}/items/{item_id}/pack` | 아이템 포장 (박스 투입) | Service |
| POST | `packing_orders/{id}/boxes/create` | 박스 생성 (OPEN) | Service |
| POST | `packing_orders/{id}/boxes/{box_id}/close` | 박스 닫기 (OPEN → CLOSED) | Service |
| POST | `packing_orders/{id}/complete` | 포장 완료 (IN_PROGRESS → COMPLETED) | Service |
| POST | `packing_orders/{id}/cancel` | 포장 취소 (→ CANCELLED) | Service |
| GET | `packing_orders/{id}/items` | 포장 항목 목록 조회 | Service |
| GET | `packing_orders/{id}/boxes` | 포장 박스 목록 조회 | Service |

### 9.3 출하 트랜잭션 API

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `packing_orders/{id}/print_label` | 운송장 라벨 출력 (COMPLETED → LABEL_PRINTED) | Service |
| POST | `packing_orders/{id}/manifest` | 적하 목록 전송 (LABEL_PRINTED → MANIFESTED) | Service |
| POST | `packing_orders/{id}/confirm_shipping` | 출하 확정 (→ SHIPPED) | Service |
| POST | `packing_orders/confirm_shipping_batch` | 복수 출하 일괄 확정 | Service |
| POST | `packing_orders/{id}/cancel_shipping` | 출하 취소 (SHIPPED → CANCELLED, 재고 복원) | Service |
| POST | `packing_boxes/{id}/update_invoice` | 박스별 송장 번호 업데이트 | Service |

### 9.4 대시보드/현황 API

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| GET | `dashboard/picking_status` | 피킹 진행 현황 (상태별 건수) | Service |
| GET | `dashboard/packing_status` | 검수/포장 진행 현황 | Service |
| GET | `dashboard/shipping_status` | 출하 진행 현황 | Service |
| GET | `dashboard/worker_performance` | 작업자별 실적 (피킹 건수, 수량, 시간) | Service |
| GET | `dashboard/wave_progress/{wave_no}` | 웨이브별 풀필먼트 진행률 | Service |
| GET | `dashboard/dock_status` | 도크별 출하 현황 | Service |

### 9.5 CRUD API

각 엔티티별 기본 CRUD 컨트롤러:

| 엔티티 | Base URL | 설명 |
|--------|----------|------|
| PickingTask | `/rest/picking_tasks` | 피킹 지시 CRUD |
| PickingTaskItem | 상위에 포함 | `{id}/items`로 조회 |
| PackingOrder | `/rest/packing_orders` | 포장 지시 CRUD |
| PackingOrderItem | 상위에 포함 | `{id}/items`로 조회 |
| PackingBox | `/rest/packing_boxes` | 포장 박스 CRUD |
| FulfillmentProgress | `/rest/fulfillment_progress` | 진행 현황 조회 (읽기 전용) |

---

## 10. 재고 연동

### 10.1 재고 상태 변화 (Fulfillment 단계)

| 시점 | 재고 상태 | 마지막 트랜잭션 | 설명 |
|------|----------|------------|------|
| OMS 할당 완료 (인계 전) | `ALLOCATED` | `ALLOC` | 재고 할당됨 (가용 재고 차감) |
| 피킹 지시 생성 | `PICKING` | `PICK_START` | 피킹 대상으로 전환 |
| 피킹 완료 확인 | `PICKING` | `PICK` | 물리적 피킹 완료 (재고 위치 이동) |
| 출하 확정 | 재고 삭제/차감 | `OUT` | 최종 출고 처리 (inv_qty 차감) |
| 피킹 부족 (SHORT) | `STORED` | `PICK_SHORT` | 부족 수량만큼 재고 복원 |
| 출하 취소 | `STORED` | `OUT_CANCEL` | 출하 취소 → 재고 복원 |

### 10.2 피킹 시 재고 차감 프로세스

```
1. 피킹 지시 생성 시
   ├─ stock_allocations.status: HARD → RELEASED
   ├─ inventories.status: ALLOCATED → PICKING
   └─ inventories.last_tran_cd: PICK_START

2. 피킹 항목별 스캔 확인 시
   ├─ picking_task_items.pick_qty += 피킹수량
   ├─ picking_task_items.status: WAIT → RUN → PICKED
   └─ (재고 수량은 아직 미차감 — 출하 확정 시 최종 차감)

3. 피킹 완료 시 (전체 항목 피킹 확인 후)
   ├─ picking_task.status: IN_PROGRESS → COMPLETED
   ├─ inventories.last_tran_cd: PICK (피킹 완료 확인)
   └─ (재고 수량은 아직 미차감 — 출하 확정 시 최종 차감)

4. 피킹 부족 발생 시
   ├─ picking_task_items.short_qty = order_qty - pick_qty
   ├─ picking_task_items.status: → SHORT
   ├─ inventories.status: PICKING → STORED (부족 수량분)
   ├─ stock_allocations.status: RELEASED → CANCELLED (부족분)
   └─ OMS에 PartialShipmentEvent 발행
```

### 10.3 출하 확정 시 최종 재고 처리

```
1. 출하 확정 (confirmShipping)
   ├─ inventories.inv_qty -= shipped_qty
   ├─ inventories.reserved_qty -= shipped_qty
   ├─ inventories.status: PICKING → STORED (잔여) 또는 EMPTY (전량 출고)
   ├─ inventories.last_tran_cd: OUT
   ├─ stock_allocations.status: RELEASED → COMPLETED (출고 완료)
   ├─ InventoryHist 기록 생성 (트랜잭션 이력)
   └─ shipment_order_items.shipped_qty 업데이트 (OMS)

2. 출하 취소 시
   ├─ inventories.inv_qty += cancelled_qty
   ├─ inventories.reserved_qty += cancelled_qty
   ├─ inventories.status: → STORED
   ├─ inventories.last_tran_cd: OUT_CANCEL
   ├─ stock_allocations.status: RELEASED → CANCELLED (할당 취소)
   └─ InventoryHist 기록 생성
```

---

## 11. OMS 모듈 연동

### 11.1 인계 수신 (OMS → Fulfillment)

OMS 모듈이 `releaseWave()` 실행 시, `FulfillmentTransactionService.createPickingTasks()`를 직접 호출합니다.

```java
/**
 * OMS에서 Fulfillment로 전달하는 인계 데이터
 * 위치: operato.wms.common.dto.FulfillmentReleaseRequest
 */
public class FulfillmentReleaseRequest {
    private String waveNo;                     // 웨이브 번호
    private String pickType;                   // 피킹 유형 (INDIVIDUAL/TOTAL/ZONE)
    private String pickMethod;                 // 피킹 방식 (WCS/PAPER/INSPECT/PICK)
    private Boolean inspFlag;                  // 검수 여부
    private List<ShipmentOrder> orders;        // 출하 주문 목록
    private List<StockAllocation> allocations; // 할당 내역
    private List<ReplenishOrder> replenishes;  // 보충 지시 (선택)
}
```

**인계 처리 로직**:

```java
/**
 * Fulfillment 인계 수신 — 피킹 지시 생성
 * 위치: operato.wms.fulfillment.service.FulfillmentTransactionService
 */
@Transactional
public List<PickingTask> createPickingTasks(FulfillmentReleaseRequest request) {
    // 1. wave_no가 없으면 가상 웨이브 자동 생성
    if (ValueUtil.isEmpty(request.getWaveNo())) {
        String virtualWaveNo = generateVirtualWaveNo(request);
        request.setWaveNo(virtualWaveNo);
    }

    // 2. 피킹 유형별 분기
    String pickType = request.getPickType();

    switch (pickType) {
        case "INDIVIDUAL":
            // 주문별 1건씩 PickingTask 생성
            return createIndividualPickingTasks(request);

        case "TOTAL":
            // 웨이브별 1건의 합산 PickingTask 생성
            return createBatchPickingTask(request);

        case "ZONE":
            // 존별 N건의 PickingTask 생성
            return createZonePickingTasks(request);
    }
}
```

**가상 웨이브 자동 생성 (B2B 등 웨이브 없는 인계)**:

`picking_tasks.wave_no`는 NOT NULL이므로, 웨이브 없이 직접 인계되는 경우(B2B 납품 등) 가상 웨이브를 자동 생성합니다.

| 항목 | 규칙 |
|------|------|
| 생성 조건 | `FulfillmentReleaseRequest.waveNo`가 NULL 또는 빈 문자열인 경우 |
| 채번 형식 | `VW-{YYYYMMDD}-{SEQ}` (예: `VW-20260328-001`) |
| OMS 웨이브 생성 | 가상 웨이브 번호로 `ShipmentWave` 레코드를 함께 생성 (pick_type, order_count 등 기본값 세팅) |
| 주문에 반영 | 인계 대상 `ShipmentOrder.wave_no`에도 가상 웨이브 번호를 세팅 |
| 이벤트 호환 | 가상 웨이브도 일반 웨이브와 동일하게 이벤트 발행/수신 가능 |

```java
/**
 * 가상 웨이브 자동 생성
 * 위치: operato.wms.fulfillment.service.FulfillmentTransactionService
 */
private String generateVirtualWaveNo(FulfillmentReleaseRequest request) {
    // 1. 가상 웨이브 번호 채번 (VW-YYYYMMDD-SEQ)
    String virtualWaveNo = (String) BeanUtil.get(ICustomService.class)
        .doCustomService(Domain.currentDomainId(),
            "diy-generate-virtual-wave-no", ValueUtil.newMap("request", request));

    // 2. OMS ShipmentWave 레코드 생성
    ShipmentWave wave = new ShipmentWave();
    wave.setDomainId(Domain.currentDomainId());
    wave.setWaveNo(virtualWaveNo);
    wave.setWaveDate(DateUtil.todayStr());
    wave.setWaveSeq(0);  // 가상 웨이브는 0차로 세팅
    wave.setComCd(request.getOrders().get(0).getComCd());
    wave.setWhCd(request.getOrders().get(0).getWhCd());
    wave.setPickType(request.getPickType());
    wave.setPlanOrder(request.getOrders().size());
    wave.setStatus(ShipmentWave.STATUS_RELEASED);
    wave.setReleasedAt(DateUtil.now());
    queryManager.insert(wave);

    // 3. 인계 대상 주문에 wave_no 세팅
    for (ShipmentOrder order : request.getOrders()) {
        order.setWaveNo(virtualWaveNo);
        queryManager.update(order, "waveNo");
    }

    return virtualWaveNo;
}
```

> **설계 원칙**: Fulfillment 모듈은 `wave_no`를 기준으로 피킹→포장→출하 전체를 추적합니다.
> 웨이브 없는 인계도 가상 웨이브로 감싸서 동일한 처리 경로를 유지함으로써 이벤트 발행, fulfillment_progress 뷰, 대시보드가 일관되게 동작합니다.

### 11.2 이벤트 발행 (Fulfillment → OMS)

Fulfillment 모듈은 작업 진행 시 **Spring ApplicationEvent**를 발행합니다.

#### 11.2.1 이벤트 클래스

이벤트 클래스는 공통 패키지에 위치:

```
operato.wms.common.event/
├── FulfillmentEvent.java          ← 추상 베이스
├── PickingStartedEvent.java
├── PackingStartedEvent.java
├── ShipmentCompletedEvent.java
├── ShipmentFailedEvent.java
└── PartialShipmentEvent.java
```

#### 11.2.2 이벤트 발행 시점

| 이벤트 | 발행 시점 | 페이로드 | OMS 상태 변경 |
|--------|----------|----------|--------------|
| `PickingStartedEvent` | 피킹 시작 시 (startPickingTask — 첫 스캔) | shipmentOrderId, waveNo, pickerId, startedAt | RELEASED → PICKING |
| `PackingStartedEvent` | 검수/포장 시작 시 | shipmentOrderId, waveNo, packerId, startedAt | PICKING → PACKING |
| `ShipmentCompletedEvent` | 출하 확정 시 | shipmentOrderId, carrierCd, boxCount, shippedAt | PACKING → SHIPPED |
| `ShipmentFailedEvent` | 출하 실패 시 | shipmentOrderId, reason, failedAt | 관리자 알림 |
| `PartialShipmentEvent` | 부분 출하 시 | shipmentOrderId, shippedQty, shortQty | BACK_ORDER 처리 |

#### 11.2.3 토탈 피킹 시 이벤트 처리

토탈 피킹은 N건 주문을 1건의 PickingTask로 합산하므로 `shipmentOrderId`가 NULL입니다.
이벤트에 `waveNo`를 페이로드에 포함하고, OMS 리스너가 웨이브 내 전체 주문을 일괄 업데이트합니다.

**피킹 유형별 이벤트 페이로드 차이**:

| 피킹 유형 | shipmentOrderId | waveNo | OMS 업데이트 방식 |
|-----------|----------------|--------|------------------|
| 개별 (INDIVIDUAL) | 주문 ID (설정됨) | 웨이브 번호 | `shipmentOrderId`로 1건 업데이트 |
| 토탈 (TOTAL) | **NULL** | 웨이브 번호 | `waveNo`로 웨이브 내 N건 일괄 업데이트 |
| 존 (ZONE) | 주문 ID (설정됨) | 웨이브 번호 | `shipmentOrderId`로 1건 업데이트 |

**OMS 리스너 분기 처리**:

```java
/**
 * OMS 이벤트 리스너 — 피킹 시작 이벤트 수신
 * 위치: operato.wms.oms.service.OmsEventListener
 */
@EventListener
public void onPickingStarted(PickingStartedEvent event) {
    if (ValueUtil.isNotEmpty(event.getShipmentOrderId())) {
        // 개별/존 피킹: 단건 업데이트
        ShipmentOrder order = queryManager.select(ShipmentOrder.class,
            event.getShipmentOrderId());
        order.setStatus(ShipmentOrder.STATUS_PICKING);
        queryManager.update(order, "status");

    } else if (ValueUtil.isNotEmpty(event.getWaveNo())) {
        // 토탈 피킹: 웨이브 내 RELEASED 상태 주문 일괄 업데이트
        ShipmentOrder condition = new ShipmentOrder();
        condition.setDomainId(Domain.currentDomainId());
        condition.setWaveNo(event.getWaveNo());
        condition.setStatus(ShipmentOrder.STATUS_RELEASED);

        List<ShipmentOrder> orders = queryManager.selectList(condition);
        for (ShipmentOrder order : orders) {
            order.setStatus(ShipmentOrder.STATUS_PICKING);
        }
        queryManager.updateBatch(orders, "status");
    }
}
```

**이벤트별 처리 요약** (피킹 유형에 따른 차이):

| 이벤트 | 개별 피킹 | 토탈 피킹 |
|--------|----------|----------|
| `PickingStartedEvent` | shipmentOrderId 1건 → PICKING | waveNo로 N건 일괄 → PICKING |
| `PackingStartedEvent` | shipmentOrderId 1건 → PACKING | 분배 후 주문별 발행 → 1건씩 PACKING |
| `ShipmentCompletedEvent` | shipmentOrderId 1건 → SHIPPED | 주문별 발행 → 1건씩 SHIPPED |

> **핵심**: 피킹 시작만 `waveNo` 기반 일괄 처리이고, 포장/출하는 주문별 분배 이후이므로 `shipmentOrderId` 기반 개별 처리.

#### 11.2.4 이벤트 발행 코드

```java
/**
 * Fulfillment 이벤트 발행 서비스
 * 위치: operato.wms.fulfillment.service.FulfillmentEventPublisher
 */
@Component
public class FulfillmentEventPublisher {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    /**
     * 피킹 시작 이벤트 발행
     */
    public void publishPickingStarted(String shipmentOrderId, String waveNo,
            String pickerId) {
        this.eventPublisher.publishEvent(
            new PickingStartedEvent(shipmentOrderId, waveNo, pickerId,
                DateUtil.now()));
    }

    /**
     * 검수/포장 시작 이벤트 발행
     */
    public void publishPackingStarted(String shipmentOrderId, String waveNo,
            String packerId) {
        this.eventPublisher.publishEvent(
            new PackingStartedEvent(shipmentOrderId, waveNo, packerId,
                DateUtil.now()));
    }

    /**
     * 출하 완료 이벤트 발행
     */
    public void publishShipmentCompleted(String shipmentOrderId,
            String carrierCd, Integer boxCount) {
        this.eventPublisher.publishEvent(
            new ShipmentCompletedEvent(shipmentOrderId, carrierCd, boxCount,
                DateUtil.now()));
    }

    /**
     * 출하 실패 이벤트 발행
     */
    public void publishShipmentFailed(String shipmentOrderId, String reason) {
        this.eventPublisher.publishEvent(
            new ShipmentFailedEvent(shipmentOrderId, reason, DateUtil.now()));
    }

    /**
     * 부분 출하 이벤트 발행
     */
    public void publishPartialShipment(String shipmentOrderId,
            Double shippedQty, Double shortQty) {
        this.eventPublisher.publishEvent(
            new PartialShipmentEvent(shipmentOrderId, shippedQty, shortQty));
    }
}
```

### 11.3 취소 수신 (OMS → Fulfillment)

OMS에서 주문 취소 시 Fulfillment 모듈의 작업도 함께 취소합니다.

```java
/**
 * OMS 취소 수신 처리
 * 위치: operato.wms.fulfillment.service.FulfillmentTransactionService
 */
@Transactional
public void cancelByShipmentOrder(String shipmentOrderId) {
    // 1. 피킹 지시 취소
    PickingTask pickingTask = findPickingTaskByShipmentOrder(shipmentOrderId);
    if (pickingTask != null && !"COMPLETED".equals(pickingTask.getStatus())) {
        cancelPickingTask(pickingTask.getId());
    }

    // 2. 포장/출하 지시 취소
    PackingOrder packingOrder = findPackingOrderByShipmentOrder(shipmentOrderId);
    if (packingOrder != null) {
        if ("SHIPPED".equals(packingOrder.getStatus())) {
            // 출하 완료 후 취소: 재고 복원 포함 (10.3 step 2)
            cancelShipping(packingOrder.getId());
        } else {
            cancelPackingOrder(packingOrder.getId());
        }
    }

    // 3. 재고 상태 복원 (미출하 건: PICKING → STORED)
    restoreInventoryOnCancel(shipmentOrderId);
}
```

### 11.4 OMS ↔ Fulfillment 상태 매핑

```
┌─────────────────────┐                    ┌─────────────────────┐
│   Fulfillment       │   ApplicationEvent │        OMS          │
│                     │                    │                     │
│  피킹 시작 (첫 스캔) ┼── publish ────────→│  RELEASED → PICKING │
│  (PickingStarted)   │                    │                     │
│                     │                    │                     │
│  포장 시작 ──────────┼── publish ────────→│  PICKING → PACKING  │
│  (PackingStarted)   │                    │                     │
│                     │                    │                     │
│  출하 확정 ──────────┼── publish ────────→│  PACKING → SHIPPED  │
│  (ShipmentCompleted)│                    │                     │
│                     │                    │                     │
│  부분 출하 ──────────┼── publish ────────→│  → BACK_ORDER       │
│  (PartialShipment)  │                    │                     │
└─────────────────────┘                    │                     │
                                           │    서비스 직접 호출  │
  Fulfillment ◀────────────────────────────│  cancelByShipment-  │
  cancelByShipmentOrder()                  │  Order()            │
                                           └─────────────────────┘
```

---

## 12. 커스텀 서비스 (DIY)

### 12.1 개요

모든 트랜잭션 API는 **전 처리(pre) → 본 로직 → 후 처리(post)** 패턴으로 실행됩니다.

```
[API 호출]
    ↓
[1. 커스텀 서비스 전 처리 (pre)]     ← customSvc.doCustomService(domainId, "diy-ful-pre-xxx", params)
    ↓
[2. 본 로직 실행]                     ← fulfillmentTrxService.xxx()
    ↓
[3. 커스텀 서비스 후 처리 (post)]    ← customSvc.doCustomService(domainId, "diy-ful-post-xxx", params)
    ↓
[응답 반환]
```

### 12.2 네이밍 규칙

```
diy-ful-{pre|post}-{method-name}
```

| 구성 요소 | 규칙 | 예시 |
|----------|------|------|
| 접두사 | `diy-` (고정) | `diy-` |
| 모듈명 | `ful-` (고정) | `ful-` |
| 시점 | `pre-` (전 처리) / `post-` (후 처리) | `pre-`, `post-` |
| 메서드명 | snake-case, API 메서드명 기준 | `create-picking-tasks` |

### 12.3 트랜잭션 API별 커스텀 서비스 목록

#### 12.3.1 피킹 지시 생성 (OMS 인계)

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_CREATE_PICKING` | `diy-ful-pre-create-picking-tasks` | 전 | `{request}` (FulfillmentReleaseRequest) |
| `TRX_FUL_POST_CREATE_PICKING` | `diy-ful-post-create-picking-tasks` | 후 | `{request, pickingTasks}` |

#### 12.3.2 피킹 시작

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_START_PICKING` | `diy-ful-pre-start-picking-task` | 전 | `{pickingTask}` |
| `TRX_FUL_POST_START_PICKING` | `diy-ful-post-start-picking-task` | 후 | `{pickingTask, result}` |

#### 12.3.3 피킹 항목 확인 (스캔)

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_PICK_ITEM` | `diy-ful-pre-pick-item` | 전 | `{pickingTask, pickingTaskItem, pickQty}` |
| `TRX_FUL_POST_PICK_ITEM` | `diy-ful-post-pick-item` | 후 | `{pickingTask, pickingTaskItem, pickQty, result}` |

#### 12.3.4 피킹 완료

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_COMPLETE_PICKING` | `diy-ful-pre-complete-picking-task` | 전 | `{pickingTask}` |
| `TRX_FUL_POST_COMPLETE_PICKING` | `diy-ful-post-complete-picking-task` | 후 | `{pickingTask, result}` |

#### 12.3.5 포장 시작

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_START_PACKING` | `diy-ful-pre-start-packing-order` | 전 | `{packingOrder}` |
| `TRX_FUL_POST_START_PACKING` | `diy-ful-post-start-packing-order` | 후 | `{packingOrder, result}` |

#### 12.3.6 검수 확인

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_INSPECT_ITEM` | `diy-ful-pre-inspect-item` | 전 | `{packingOrder, packingOrderItem, inspQty}` |
| `TRX_FUL_POST_INSPECT_ITEM` | `diy-ful-post-inspect-item` | 후 | `{packingOrder, packingOrderItem, inspQty, result}` |

#### 12.3.7 포장 완료

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_COMPLETE_PACKING` | `diy-ful-pre-complete-packing-order` | 전 | `{packingOrder}` |
| `TRX_FUL_POST_COMPLETE_PACKING` | `diy-ful-post-complete-packing-order` | 후 | `{packingOrder, boxes, result}` |

#### 12.3.8 라벨 출력

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_PRINT_LABEL` | `diy-ful-pre-print-label` | 전 | `{packingOrder}` |
| `TRX_FUL_POST_PRINT_LABEL` | `diy-ful-post-print-label` | 후 | `{packingOrder, labelData, result}` |

#### 12.3.9 출하 확정

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_CONFIRM_SHIPPING` | `diy-ful-pre-confirm-shipping` | 전 | `{packingOrder}` |
| `TRX_FUL_POST_CONFIRM_SHIPPING` | `diy-ful-post-confirm-shipping` | 후 | `{packingOrder, result}` |

#### 12.3.10 출하 취소

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_FUL_PRE_CANCEL_SHIPPING` | `diy-ful-pre-cancel-shipping` | 전 | `{packingOrder}` |
| `TRX_FUL_POST_CANCEL_SHIPPING` | `diy-ful-post-cancel-shipping` | 후 | `{packingOrder, result}` |

### 12.4 상수 정의 클래스

```java
/**
 * Fulfillment 트랜잭션 커스텀 서비스 상수
 * 위치: operato.wms.fulfillment.WmsFulfillmentConstants
 */
public class WmsFulfillmentConstants {

    // === 피킹 지시 생성 ===
    public static final String TRX_FUL_PRE_CREATE_PICKING = "diy-ful-pre-create-picking-tasks";
    public static final String TRX_FUL_POST_CREATE_PICKING = "diy-ful-post-create-picking-tasks";

    // === 피킹 시작 ===
    public static final String TRX_FUL_PRE_START_PICKING = "diy-ful-pre-start-picking-task";
    public static final String TRX_FUL_POST_START_PICKING = "diy-ful-post-start-picking-task";

    // === 피킹 항목 확인 ===
    public static final String TRX_FUL_PRE_PICK_ITEM = "diy-ful-pre-pick-item";
    public static final String TRX_FUL_POST_PICK_ITEM = "diy-ful-post-pick-item";

    // === 피킹 완료 ===
    public static final String TRX_FUL_PRE_COMPLETE_PICKING = "diy-ful-pre-complete-picking-task";
    public static final String TRX_FUL_POST_COMPLETE_PICKING = "diy-ful-post-complete-picking-task";

    // === 포장 시작 ===
    public static final String TRX_FUL_PRE_START_PACKING = "diy-ful-pre-start-packing-order";
    public static final String TRX_FUL_POST_START_PACKING = "diy-ful-post-start-packing-order";

    // === 검수 확인 ===
    public static final String TRX_FUL_PRE_INSPECT_ITEM = "diy-ful-pre-inspect-item";
    public static final String TRX_FUL_POST_INSPECT_ITEM = "diy-ful-post-inspect-item";

    // === 포장 완료 ===
    public static final String TRX_FUL_PRE_COMPLETE_PACKING = "diy-ful-pre-complete-packing-order";
    public static final String TRX_FUL_POST_COMPLETE_PACKING = "diy-ful-post-complete-packing-order";

    // === 라벨 출력 ===
    public static final String TRX_FUL_PRE_PRINT_LABEL = "diy-ful-pre-print-label";
    public static final String TRX_FUL_POST_PRINT_LABEL = "diy-ful-post-print-label";

    // === 출하 확정 ===
    public static final String TRX_FUL_PRE_CONFIRM_SHIPPING = "diy-ful-pre-confirm-shipping";
    public static final String TRX_FUL_POST_CONFIRM_SHIPPING = "diy-ful-post-confirm-shipping";

    // === 출하 취소 ===
    public static final String TRX_FUL_PRE_CANCEL_SHIPPING = "diy-ful-pre-cancel-shipping";
    public static final String TRX_FUL_POST_CANCEL_SHIPPING = "diy-ful-post-cancel-shipping";
}
```

### 12.5 구현 패턴 (FulfillmentTransactionController 예시)

```java
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/ful_trx")
@ServiceDesc(description = "Fulfillment Transaction Service API")
public class FulfillmentTransactionController extends AbstractRestService {

    @Autowired
    private FulfillmentTransactionService fulTrxService;

    @Autowired
    private ICustomService customSvc;

    /**
     * 피킹 시작 (CREATED → IN_PROGRESS)
     */
    @RequestMapping(value = "picking_tasks/{id}/start", method = RequestMethod.POST)
    @ApiDesc(description = "Start Picking Task")
    public BaseResponse startPickingTask(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        // 1. 조회
        PickingTask pickingTask = this.queryManager.select(PickingTask.class, id);

        // 2. 커스텀 서비스 - 전 처리
        Map<String, Object> params = ValueUtil.newMap("pickingTask", pickingTask);
        this.customSvc.doCustomService(domainId,
            WmsFulfillmentConstants.TRX_FUL_PRE_START_PICKING, params);

        // 3. 본 로직 실행
        PickingTask result = this.fulTrxService.startPickingTask(pickingTask);

        // 4. 커스텀 서비스 - 후 처리
        params.put("result", result);
        this.customSvc.doCustomService(domainId,
            WmsFulfillmentConstants.TRX_FUL_POST_START_PICKING, params);

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출하 확정 (→ SHIPPED)
     */
    @RequestMapping(value = "packing_orders/{id}/confirm_shipping", method = RequestMethod.POST)
    @ApiDesc(description = "Confirm Shipping")
    public BaseResponse confirmShipping(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        // 1. 조회
        PackingOrder packingOrder = this.queryManager.select(PackingOrder.class, id);

        // 2. 커스텀 서비스 - 전 처리
        Map<String, Object> params = ValueUtil.newMap("packingOrder", packingOrder);
        this.customSvc.doCustomService(domainId,
            WmsFulfillmentConstants.TRX_FUL_PRE_CONFIRM_SHIPPING, params);

        // 3. 본 로직 실행 (재고 차감 + 이벤트 발행)
        PackingOrder result = this.fulTrxService.confirmShipping(packingOrder);

        // 4. 커스텀 서비스 - 후 처리
        params.put("result", result);
        this.customSvc.doCustomService(domainId,
            WmsFulfillmentConstants.TRX_FUL_POST_CONFIRM_SHIPPING, params);

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }
}
```

### 12.6 커스텀 서비스 활용 예시

#### 특정 화주사 출하 시 ERP 연동

```java
/**
 * name: diy-ful-post-confirm-shipping
 */
// params: {packingOrder: PackingOrder, result: PackingOrder}
def packingOrder = params.get("packingOrder")

// 특정 화주사는 출하 확정 시 ERP에 즉시 통보
if (packingOrder.comCd == "COMPANY_A") {
    def erpService = xyz.elidom.sys.util.BeanUtil.get("erpApiService")
    erpService.notifyShipmentConfirmed(
        packingOrder.shipmentNo, packingOrder.carrierCd)
}
```

#### 피킹 부족 발생 시 관리자 알림

```java
/**
 * name: diy-ful-post-pick-item
 */
// params: {pickingTask: PickingTask, pickingTaskItem: PickingTaskItem, pickQty, result}
def item = params.get("pickingTaskItem")

// 피킹 부족 발생 시 관리자 알림
if (item.shortQty > 0) {
    def notifyService = xyz.elidom.sys.util.BeanUtil.get("notificationService")
    notifyService.sendAlert("PICK_SHORT",
        "피킹 부족: ${item.skuCd} / 부족수량: ${item.shortQty}")
}
```

---

## 기존 outbound 모듈과의 대비

| 항목 | 기존 outbound | 신규 Fulfillment |
|------|-------------|------------------|
| 피킹 지시 | `picking_orders` / `picking_order_items` | `picking_tasks` / `picking_task_items` |
| 검수/포장 | (없음 — 피킹 후 바로 출고) | `packing_orders` / `packing_order_items` |
| 포장 박스 | (없음) | `packing_boxes` ← **신규** |
| 출하 지시 | (release_orders에 통합) | `packing_orders`에 통합 (출하 필드 포함) |
| OMS 연동 | (없음 — 자체 완결) | 이벤트 기반 상태 동기화 ← **신규** |
| 재고 할당 추적 | (없음) | `stock_allocation_id` 연결 ← **신규** |
| 검수 관리 | (없음) | `insp_type`, `insp_result` ← **신규** |
| 피킹 부족 | (없음) | `short_qty`, SHORT 상태 ← **신규** |
| 라벨/매니페스트 | (없음) | LABEL_PRINTED, MANIFESTED 상태 ← **신규** |
| 커스텀 서비스 | (없음) | `diy-ful-pre/post-*` ← **신규** |
