# OMS 모듈 설계 문서

> 작성일: 2026-03-26
> 패키지: `operato.wms.oms`
> 역할: 출고 주문 관리 — 주문 수신부터 웨이브 생성/재고 할당까지
> 대상: B2C 풀필먼트 센터 (일 100~10,000건, 멀티채널)

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
11. [Fulfillment / WCS 모듈 연동](#11-fulfillment--wcs-모듈-연동)
12. [커스텀 서비스 (DIY)](#12-커스텀-서비스-diy)

---

## 1. 개요

### 1.1 모듈 정의

OMS(Order Management System) 모듈은 출고 주문의 **수신·확인·할당·웨이브 생성**을 담당합니다.
"무엇을, 얼마나, 언제까지 출고할 것인가"를 결정하는 **계획/지시 계층**입니다.

실제 창고 오퍼레이션(피킹·패킹·검수·출하)은 `fulfillment` 모듈이 담당합니다.

```
oms (주문 수신 → 확인 → 할당 → 웨이브 → 보충 지시)
  ↓ 웨이브 확정 (pick_method별 분기)
  ├─ fulfillment (피킹 → 패킹 → 검수 → 라벨 → 분류 → 적재 → 출하)  ← PICK/PAPER/INSPECT
  └─ WCS API (DPS/DAS/소터 → 피킹/분류 → 출하)                      ← WCS
```

### 1.2 지원 업무 유형

| 업무 유형 | 코드 | 설명 |
|----------|------|------|
| B2C 출고 | `B2C_OUT` | 개인 소비자 대상 택배 출고 |
| B2B 출고 | `B2B_OUT` | 기업 대상 납품 출고 |
| B2C 반품 출고 | `B2C_RTN` | 소비자 반품에 대한 재출고 |
| B2B 반품 출고 | `B2B_RTN` | 기업 반품에 대한 재출고 |

### 1.3 지원 채널

| 채널 | 코드 | 설명 |
|------|------|------|
| 자사몰 | `OWN_MALL` | 자사 쇼핑몰 |
| 쿠팡 | `COUPANG` | 쿠팡 마켓플레이스 |
| 네이버 | `NAVER` | 네이버 스토어 |
| G마켓 | `GMARKET` | G마켓 |
| 옥션 | `AUCTION` | 옥션 |
| 11번가 | `11ST` | 11번가 |
| SSG | `SSG` | SSG닷컴 |
| 롯데온 | `LOTTE_ON` | 롯데온 |
| 기타 | `ETC` | 기타 채널 |

### 1.4 테이블 구성 요약

| # | 테이블 | 엔티티 | 설명 | 유형 |
|---|--------|--------|------|------|
| 1 | `shipment_orders` | ShipmentOrder | 출하 주문 (헤더) | 실테이블 |
| 2 | `shipment_order_items` | ShipmentOrderItem | 출하 주문 상세 | 실테이블 |
| 3 | `shipment_waves` | ShipmentWave | 출하 웨이브 | 실테이블 |
| 4 | `shipment_deliveries` | ShipmentDelivery | 배송 정보 | 실테이블 |
| 5 | `replenish_orders` | ReplenishOrder | 보충 지시 (헤더) | 실테이블 |
| 6 | `replenish_order_items` | ReplenishOrderItem | 보충 지시 상세 | 실테이블 |
| 7 | `stock_allocations` | StockAllocation | 재고 할당 | 실테이블 |
| 8 | `import_shipment_orders` | ImportShipmentOrder | 임포트 스테이징 | 임포트 모델 |
| 9 | `shipment_order_status` | ShipmentOrderStatus | 주문 현황 뷰 | 뷰 (ignoreDdl) |

> 기존 outbound 모듈의 `release_orders`, `waves`, `delivery_infos` 등과 테이블명이 **완전히 분리**됩니다.

---

## 2. 모듈 범위 및 아키텍처

### 2.1 모듈 간 역할 분리

```
┌───────────────────────────────────────────────────────────────────┐
│                        외부 시스템                                  │
│  쿠팡 API | 네이버 API | 자사몰 | ERP | Excel                      │
└─────────────────────────┬─────────────────────────────────────────┘
                          │ 주문 수신
┌─────────────────────────▼─────────────────────────────────────────┐
│                      OMS 모듈                                      │
│  operato.wms.oms                                                   │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │주문 수신  │→│주문 확인  │→│재고 할당  │→│웨이브 생성/보충   │  │
│  │(Import)  │  │(Confirm) │  │(Allocate)│  │(Wave/Replenish) │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┬─────────┘  │
│                                                       │            │
│  주요 엔티티:                                          │            │
│  ShipmentOrder, ShipmentWave, ShipmentDelivery,       │            │
│  ReplenishOrder, StockAllocation                      │            │
└───────────────────────────────────────────────────────┼────────────┘
                          웨이브 확정 → pick_method별 분기  │
                     ┌──────────────────┬────────────────┘
                     │                  │
          pick_method=PICK/PAPER/INSPECT│  pick_method=WCS
                     │                  │
┌────────────────────▼───────────┐  ┌───▼──────────────────────────────┐
│       Fulfillment 모듈          │  │         WCS (외부 시스템)         │
│  operato.wms.fulfillment       │  │  DPS / DAS / 소터 / 컨베이어     │
│                                 │  │                                   │
│  피킹→패킹→검수→라벨→분류→출하  │  │  WCS API로 피킹/분류 지시 전송   │
│                                 │  │  WCS가 설비 제어 및 작업 수행     │
│  주요 엔티티:                    │  │  작업 완료 시 콜백 이벤트 발행   │
│  PickingOrder, PackingOrder,    │  │                                   │
│  PackingBox, OutboundInspection,│  └───────────────────────────────────┘
│  ShippingLabel, ShippingManifest│
└─────────────────────────────────┘

  ※ 두 경로 모두 이벤트 기반으로 OMS에 상태 콜백
     (PickingStartedEvent, PackingStartedEvent, ShipmentCompletedEvent)
```

### 2.2 OMS 모듈 내부 레이어

```
operato.wms.oms/
├── entity/              ← 엔티티 (7 실테이블 + 2 뷰/임포트)
├── rest/                ← REST 컨트롤러
│   ├── ShipmentOrderController.java
│   ├── ShipmentWaveController.java
│   ├── ShipmentDeliveryController.java
│   ├── ReplenishOrderController.java
│   ├── ShipmentOrderStatusController.java
│   └── OmsTransactionController.java    ← 트랜잭션 API
├── service/             ← 비즈니스 로직
│   ├── OmsTransactionService.java       ← 주문 처리 트랜잭션
│   ├── OmsAllocationService.java        ← 재고 할당
│   ├── OmsWaveService.java              ← 웨이브 생성/관리
│   └── OmsImportService.java            ← 주문 임포트
├── query/store/         ← 쿼리 스토어
├── config/              ← 모듈 설정
├── util/                ← 유틸리티
└── web/initializer/     ← 모듈 초기화
```

---

## 3. 표준 프로세스

### 3.1 B2C 출고 프로세스 (풀필먼트)

```
[채널 주문 수신 (API/Excel)]                    ← importShipmentOrders()
    ↓
[주문 검증 + 등록 (→ REGISTERED)]               ← registerShipmentOrder()
    ↓
[주문 확정 (REGISTERED → CONFIRMED)]            ← confirmShipmentOrder()
    ├─ 주문 유효성 검증 (SKU 존재, 수량 양수)
    ├─ 배송 정보 검증 (수취인 주소)
    └─ 채널 주문 번호 중복 체크
    ↓
[재고 할당 (CONFIRMED → ALLOCATED)]             ← allocateShipmentOrder()
    ├─ FEFO/FIFO 기준 재고 선택
    ├─ stock_allocations 기록 생성
    └─ 재고 부족 시 → BACK_ORDER
    ↓
[웨이브 생성 (ALLOCATED → WAVED)]              ← createWave()
    ├─ 조건별 그룹핑 (채널/택배사/권역/마감시간)
    ├─ 토탈 피킹 / 개별 피킹 결정
    └─ 보충 지시 생성 (선택)
    ↓
[웨이브 확정 → pick_method별 분기]                ← releaseWave()
    ├─ ShipmentOrder 상태: WAVED → RELEASED
    │
    ├─ [A] pick_method = PICK/PAPER/INSPECT (Fulfillment 모듈)
    │      Fulfillment 모듈에 피킹 지시 생성 요청
    │
    └─ [B] pick_method = WCS (WCS API 호출)
           WCS에 피킹/분류 지시 전송 (REST API)
    ↓
    ═══════════════════════════════════════
    ↓  (이벤트 발행 → OMS 구독 — Fulfillment/WCS 공통)
[피킹 시작 (→ PICKING)]                         ← on(PickingStartedEvent)
    ↓
[피킹] → [패킹 시작 (→ PACKING)]               ← on(PackingStartedEvent)
    ↓
[패킹] → [검수] → [라벨] → [출하]
    ↓
[출하 완료 (→ SHIPPED)]                         ← on(ShipmentCompletedEvent)
    ↓
[정산/마감 (→ CLOSED)]                          ← closeShipmentOrder()
```

### 3.2 B2B 출고 프로세스 (납품)

```
[출고 예정 등록 (API/Excel)]                    ← importShipmentOrders()
    ↓
[주문 확정 (→ CONFIRMED)]                       ← confirmShipmentOrder()
    ↓
[재고 할당 (→ ALLOCATED)]                       ← allocateShipmentOrder()
    ↓
[웨이브 없이 직접 Fulfillment 인계]             ← releaseWithoutWave()
    ├─ 개별 피킹(INDIVIDUAL) 모드
    └─ ShipmentOrder 상태: ALLOCATED → RELEASED
    ↓
    ═══════════════════════════════════════
    ↓  (Fulfillment 모듈)
[피킹] → [출고 확정]
    ↓
[출하 완료 (→ SHIPPED → CLOSED)]
```

### 3.3 간소화 프로세스 (소규모 창고)

```
[주문 수신]  →  [확정+할당 (원클릭)]  →  [Fulfillment 인계]  →  [출하 완료]
               confirmAndAllocate()     releaseWithoutWave()
```

**생략 가능 항목**:
- **웨이브**: 소량 주문 시 개별 출고로 충분
- **보충 지시**: 피킹존 = 보관존인 소규모 창고에서 불필요
- **재고 할당**: 설정으로 할당 없이 바로 인계 가능

---

## 4. 상태 전이 다이어그램

### 4.1 출하 주문 (ShipmentOrder) 상태

```
                         OMS 주도                              이벤트 구독 (Fulfillment → OMS)
                    ┌─────────────────────────────────────┐  ┌──────────────────────────────┐
REGISTERED ─→ CONFIRMED ─→ ALLOCATED ─→ WAVED ─→ RELEASED ─→ PICKING ─→ PACKING ─→ SHIPPED ─→ CLOSED
     │             │             │          │          │          │          │          │
     │             │             │          │          │          │          │          └── closeShipmentOrder()
     │             │             │          │          │          │          └── on(PACKING_STARTED)
     │             │             │          │          │          └── on(PICKING_STARTED)
     │             │             │          │          └── completeShipment()
     │             │             │          └───────────── releaseWave()
     │             │             └──────────────────────── createWave()
     │             └────────────────────────────────────── allocateShipmentOrder()
     └──────────────────────────────────────────────────── confirmShipmentOrder()

 분기:
  CONFIRMED → BACK_ORDER (재고 부족)
  BACK_ORDER → ALLOCATED (재고 확보 후 재할당)

 취소 (어느 상태에서든):
  → CANCELLED   cancelShipmentOrder()
     ├─ ALLOCATED 이후: 할당 해제 (stock_allocations 삭제, 재고 RESERVED → STORED)
     ├─ WAVED 이후: 웨이브에서 제거
     └─ RELEASED 이후: Fulfillment에 취소 요청
```

> **이벤트 기반 상태 동기화**: RELEASED 이후 상태(PICKING/PACKING/SHIPPED)는 Fulfillment 모듈이 발행하는
> 이벤트를 OMS가 구독하여 업데이트합니다. Fulfillment는 OMS를 직접 호출하지 않으므로 느슨한 결합을 유지합니다.

| 상태 | 코드 | 설명 | 주체 |
|------|------|------|------|
| 등록 | `REGISTERED` | 주문 데이터 수신/등록 | OMS |
| 확정 | `CONFIRMED` | 주문 검증 완료, 할당 대기 | OMS |
| 할당 완료 | `ALLOCATED` | 재고 할당 완료, 웨이브 대기 | OMS |
| 재고 부족 | `BACK_ORDER` | 재고 부족으로 할당 불가 | OMS |
| 웨이브 완료 | `WAVED` | 웨이브에 포함됨 | OMS |
| 인계 완료 | `RELEASED` | Fulfillment에 인계됨 | OMS→FUL |
| 피킹 중 | `PICKING` | 피킹 작업 진행 중 | FUL→이벤트→OMS |
| 패킹 중 | `PACKING` | 패킹/검수 작업 진행 중 | FUL→이벤트→OMS |
| 출하 완료 | `SHIPPED` | 최종 출하 확정 | FUL→이벤트→OMS |
| 마감 | `CLOSED` | 정산/마감 완료 | OMS |
| 취소 | `CANCELLED` | 주문 취소 | OMS |

### 4.2 출하 웨이브 (ShipmentWave) 상태

```
CREATED ─→ RELEASED ─→ COMPLETED
  │             │
  │             └── Fulfillment 작업 완료 콜백
  └──────────── releaseWave()

  * CANCELLED: cancelWave()
```

| 상태 | 코드 | 설명 |
|------|------|------|
| 생성 | `CREATED` | 웨이브 생성, 주문 할당 중 |
| 확정 | `RELEASED` | 웨이브 확정, Fulfillment 인계 |
| 완료 | `COMPLETED` | 웨이브 내 모든 주문 출하 완료 |
| 취소 | `CANCELLED` | 웨이브 취소 |

### 4.3 보충 지시 (ReplenishOrder) 상태

```
CREATED ─→ IN_PROGRESS ─→ COMPLETED
  └── CANCELLED ──────────┘
```

### 4.4 재고 할당 (StockAllocation) 상태

```
SOFT ─→ HARD ─→ RELEASED
  │       │
  │       └── 웨이브 확정 시
  └──────── 할당 확정 시

  * EXPIRED: 타임아웃으로 자동 해제
  * CANCELLED: 주문 취소 시
```

---

## 5. 테이블 설계

> 모든 테이블은 `ElidomStampHook`을 상속하여 `domain_id`, `created_at`, `updated_at` 필드를 자동 포함합니다.

### 5.1 shipment_orders — 출하 주문 (헤더)

채널/고객으로부터 수신한 출고 주문의 헤더 정보.

**Lifecycle**:
- `@PrePersist` — `shipment_no` 자동 채번, `ref_order_no` 중복 체크

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `shipment_no` | VARCHAR | N | 30 | 출하 주문 번호 (자동 채번, UNIQUE) |
| `ref_order_no` | VARCHAR | Y | 50 | 외부 참조 주문번호 (B2C: 채널 주문번호, B2B: 거래처 PO번호) |
| `order_date` | VARCHAR | N | 10 | 주문 일자 (YYYY-MM-DD) |
| `ship_by_date` | VARCHAR | Y | 10 | 출하 기한 (YYYY-MM-DD) |
| `cutoff_time` | VARCHAR | Y | 5 | 마감 시간 (HH:mm) |
| `priority_cd` | VARCHAR | Y | 10 | 우선순위 (URGENT/NORMAL/LOW) |
| `wave_no` | VARCHAR | Y | 30 | 웨이브 번호 (FK → shipment_waves) |
| `com_cd` | VARCHAR | N | 30 | 화주사 코드 |
| `cust_cd` | VARCHAR | Y | 30 | 고객 코드 — B2C: 판매 채널 코드(OWN_MALL/COUPANG/NAVER/GMARKET/AUCTION/11ST/SSG/LOTTE_ON/ETC), B2B: 납품 거래처 코드. 섹션 1.3 채널 코드 참조 |
| `cust_nm` | VARCHAR | Y | 100 | 주문자명 — B2C: 주문자 이름(예: "홍길동"), B2B: 납품 거래처명(예: "삼성전자") |
| `wh_cd` | VARCHAR | N | 30 | 창고 코드 |
| `biz_type` | VARCHAR | Y | 10 | 업무 유형 (B2C_OUT/B2B_OUT/B2C_RTN/B2B_RTN) |
| `ship_type` | VARCHAR | Y | 20 | 출하 유형 (NORMAL/RETURN/TRANSFER/SCRAP/EXPORT/ETC) |
| `pick_method` | VARCHAR | Y | 20 | 피킹 방식 (WCS/PAPER/INSPECT/PICK) |
| `dlv_type` | VARCHAR | Y | 20 | 배송 유형 (PARCEL/FREIGHT/CHARTER/QUICK/PICKUP/DIRECT) |
| `carrier_cd` | VARCHAR | Y | 30 | 택배사 코드 |
| `carrier_service_type` | VARCHAR | Y | 20 | 택배 서비스 유형 (STANDARD/EXPRESS/SAME_DAY/NEXT_DAY/ECONOMY) |
| `to_wh_cd` | VARCHAR | Y | 30 | 목적 창고 코드 (이동 출고 시) |
| `total_item` | INTEGER | Y | - | 총 품목 수 |
| `total_order` | DOUBLE | Y | - | 총 주문 수량 |
| `total_alloc` | DOUBLE | Y | - | 총 할당 수량 |
| `total_shipped` | DOUBLE | Y | - | 총 출하 수량 |
| `label_template_cd` | VARCHAR | Y | 36 | 라벨 템플릿 코드 |
| `status` | VARCHAR | N | 20 | 상태 |
| `if_status` | VARCHAR | Y | 20 | 외부 시스템 연동 상태 (NONE/PENDING/SENT/CONFIRMED/FAILED) |
| `confirmed_at` | VARCHAR | Y | 20 | 확정 일시 |
| `allocated_at` | VARCHAR | Y | 20 | 할당 일시 |
| `released_at` | VARCHAR | Y | 20 | 인계 일시 |
| `shipped_at` | VARCHAR | Y | 20 | 출하 일시 |
| `closed_at` | VARCHAR | Y | 20 | 마감 일시 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_shipment_orders_0` | `domain_id, shipment_no` | Y |
| `ix_shipment_orders_1` | `domain_id, ref_order_no` | N |
| `ix_shipment_orders_2` | `domain_id, order_date, status` | N |
| `ix_shipment_orders_3` | `domain_id, wave_no` | N |
| `ix_shipment_orders_4` | `domain_id, com_cd, wh_cd` | N |
| `ix_shipment_orders_5` | `domain_id, biz_type, ship_type, pick_method` | N |
| `ix_shipment_orders_6` | `domain_id, cust_cd, order_date` | N |
| `ix_shipment_orders_7` | `domain_id, priority_cd, ship_by_date` | N |

---

### 5.2 shipment_order_items — 출하 주문 상세

출하 주문의 SKU별 상세 항목. 주문 수량, 할당 수량, 출하 수량을 관리.

**Lifecycle**:
- `@PrePersist` — `line_no` 자동 채번 (`MAX(line_no) + 1`)

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `shipment_order_id` | VARCHAR | N | 40 | FK → shipment_orders |
| `line_no` | VARCHAR | N | 5 | 라인 번호 (자동 채번) |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | 100 | 상품명 |
| `order_qty` | DOUBLE | N | - | 주문 수량 |
| `alloc_qty` | DOUBLE | Y | - | 할당 수량 |
| `short_qty` | DOUBLE | Y | - | 부족 수량 |
| `cancel_qty` | DOUBLE | Y | - | 취소 수량 |
| `shipped_qty` | DOUBLE | Y | - | 출하 수량 |
| `unit_price` | DOUBLE | Y | - | 단가 |
| `barcode` | VARCHAR | Y | 50 | 바코드 (요청) |
| `expired_date` | VARCHAR | Y | 10 | 유통기한 (요청) |
| `lot_no` | VARCHAR | Y | 50 | 로트 번호 (요청) |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 |
|----------|------|
| `ix_shipment_order_items_0` | `domain_id, shipment_order_id` |
| `ix_shipment_order_items_1` | `domain_id, shipment_order_id, sku_cd` |
| `ix_shipment_order_items_2` | `domain_id, shipment_order_id, line_no` |
| `ix_shipment_order_items_3` | `domain_id, shipment_order_id, barcode` |

---

### 5.3 shipment_waves — 출하 웨이브

동일 조건의 출하 주문을 묶어 일괄 처리하는 그룹핑 단위.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `wave_no` | VARCHAR | N | 30 | 웨이브 번호 (UNIQUE) |
| `wave_date` | VARCHAR | N | 10 | 웨이브 일자 |
| `wave_seq` | INTEGER | N | - | 웨이브 순번 (일자 내) |
| `com_cd` | VARCHAR | Y | 30 | 화주사 코드 |
| `wh_cd` | VARCHAR | Y | 30 | 창고 코드 |
| `pick_type` | VARCHAR | Y | 20 | 피킹 유형 (INDIVIDUAL/TOTAL/ZONE) |
| `pick_method` | VARCHAR | Y | 20 | 피킹 방식 (WCS/PAPER/INSPECT/PICK) |
| `dlv_type` | VARCHAR | Y | 20 | 배송 유형 (PARCEL/FREIGHT/CHARTER/QUICK/PICKUP/DIRECT) |
| `carrier_cd` | VARCHAR | Y | 30 | 택배사 코드 (택배사별 웨이브 시) |
| `insp_flag` | BOOLEAN | Y | - | 검수 여부 |
| `label_template_cd` | VARCHAR | Y | 36 | 라벨 템플릿 코드 |
| `plan_order` | INTEGER | Y | - | 계획 주문 수 |
| `plan_item` | INTEGER | Y | - | 계획 SKU 종 수 |
| `plan_total` | DOUBLE | Y | - | 계획 총 수량 |
| `result_order` | INTEGER | Y | - | 실적 주문 수 |
| `result_item` | INTEGER | Y | - | 실적 SKU 종 수 |
| `result_total` | DOUBLE | Y | - | 실적 총 수량 |
| `input_pickers` | INTEGER | Y | - | 투입 작업자 수 |
| `status` | VARCHAR | N | 20 | 상태 (CREATED/RELEASED/COMPLETED/CANCELLED) |
| `released_at` | VARCHAR | Y | 20 | 확정 일시 |
| `completed_at` | VARCHAR | Y | 20 | 완료 일시 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_shipment_waves_0` | `domain_id, wave_no` | Y |
| `ix_shipment_waves_1` | `domain_id, wave_date, wave_seq` | N |
| `ix_shipment_waves_2` | `domain_id, wave_date, com_cd, wh_cd` | N |
| `ix_shipment_waves_3` | `domain_id, wave_date, status` | N |
| `ix_shipment_waves_4` | `domain_id, wave_date, carrier_cd` | N |
| `ix_shipment_waves_5` | `domain_id, wave_date, pick_type` | N |

---

### 5.4 shipment_deliveries — 배송 정보

출하 주문에 대한 발송인/주문자/수취인 배송 정보. 출하 주문과 1:1 관계.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `shipment_order_id` | VARCHAR | N | 40 | FK → shipment_orders (UNIQUE) |
| `shipment_no` | VARCHAR | N | 30 | 출하 주문 번호 |
| **발송인** | | | | |
| `sender_cd` | VARCHAR | Y | 30 | 발송인 코드 |
| `sender_nm` | VARCHAR | Y | 100 | 발송인 명 |
| `sender_phone` | VARCHAR | Y | 20 | 발송인 전화 |
| `sender_phone2` | VARCHAR | Y | 20 | 발송인 전화2 |
| `sender_zip_cd` | VARCHAR | Y | 20 | 발송인 우편번호 |
| `sender_addr` | VARCHAR | Y | 200 | 발송인 주소 |
| `sender_addr2` | VARCHAR | Y | 200 | 발송인 상세주소 |
| **주문자** | | | | |
| `orderer_cd` | VARCHAR | Y | 30 | 주문자 코드 |
| `orderer_nm` | VARCHAR | Y | 100 | 주문자 명 |
| `orderer_phone` | VARCHAR | Y | 20 | 주문자 전화 |
| **수취인** | | | | |
| `receiver_cd` | VARCHAR | Y | 30 | 수취인 코드 |
| `receiver_nm` | VARCHAR | Y | 100 | 수취인 명 |
| `receiver_phone` | VARCHAR | Y | 20 | 수취인 전화 |
| `receiver_phone2` | VARCHAR | Y | 20 | 수취인 전화2 |
| `receiver_zip_cd` | VARCHAR | Y | 20 | 수취인 우편번호 |
| `receiver_addr` | VARCHAR | Y | 200 | 수취인 주소 |
| `receiver_addr2` | VARCHAR | Y | 200 | 수취인 상세주소 |
| **기타** | | | | |
| `delivery_memo` | VARCHAR | Y | 500 | 배송 메모 (요청사항) |
| `delivery_info_set` | VARCHAR | Y | 2000 | 배송 정보 세트 (JSON) |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_shipment_deliveries_0` | `domain_id, shipment_order_id` | Y |
| `ix_shipment_deliveries_1` | `domain_id, shipment_no` | Y |
| `ix_shipment_deliveries_2` | `domain_id, receiver_phone` | N |

---

### 5.5 replenish_orders — 보충 지시 (헤더)

피킹존 재고 부족 시 보관존에서 보충하는 지시 헤더. 웨이브 생성 시 자동 생성.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `replenish_no` | VARCHAR | N | 30 | 보충 지시 번호 (UNIQUE) |
| `wave_no` | VARCHAR | Y | 30 | 웨이브 번호 (FK → shipment_waves) |
| `order_date` | VARCHAR | N | 10 | 지시 일자 |
| `com_cd` | VARCHAR | N | 30 | 화주사 코드 |
| `wh_cd` | VARCHAR | N | 30 | 창고 코드 |
| `plan_item` | INTEGER | Y | - | 계획 SKU 수 |
| `plan_total` | DOUBLE | Y | - | 계획 총 수량 |
| `result_total` | DOUBLE | Y | - | 실적 총 수량 |
| `status` | VARCHAR | N | 20 | 상태 (CREATED/IN_PROGRESS/COMPLETED/CANCELLED) |
| `started_at` | VARCHAR | Y | 20 | 시작 일시 |
| `completed_at` | VARCHAR | Y | 20 | 완료 일시 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_replenish_orders_0` | `domain_id, replenish_no` | Y |
| `ix_replenish_orders_1` | `domain_id, wave_no` | N |
| `ix_replenish_orders_2` | `domain_id, order_date, status` | N |
| `ix_replenish_orders_3` | `domain_id, com_cd, wh_cd` | N |

---

### 5.6 replenish_order_items — 보충 지시 상세

보충 작업의 상세 항목. 보관존 → 피킹존 이동 지시.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `replenish_order_id` | VARCHAR | N | 40 | FK → replenish_orders |
| `rank` | INTEGER | N | - | 순위 (UNIQUE: domain_id + replenish_order_id + rank) |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | 100 | 상품명 |
| `from_loc_cd` | VARCHAR | N | 30 | 출발 로케이션 (보관존) |
| `to_loc_cd` | VARCHAR | N | 30 | 목적 로케이션 (피킹존) |
| `order_qty` | DOUBLE | N | - | 지시 수량 |
| `result_qty` | DOUBLE | Y | - | 실적 수량 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_replenish_order_items_0` | `domain_id, replenish_order_id, rank` | Y |
| `ix_replenish_order_items_1` | `domain_id, replenish_order_id, sku_cd` | N |
| `ix_replenish_order_items_2` | `domain_id, replenish_order_id, from_loc_cd` | N |
| `ix_replenish_order_items_3` | `domain_id, replenish_order_id, to_loc_cd` | N |

---

### 5.7 stock_allocations — 재고 할당

출하 주문 항목과 특정 재고 간의 할당 기록. 할당 라이프사이클 관리.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `shipment_order_id` | VARCHAR | N | 40 | FK → shipment_orders |
| `shipment_order_item_id` | VARCHAR | N | 40 | FK → shipment_order_items |
| `inventory_id` | VARCHAR | N | 40 | FK → inventories |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `barcode` | VARCHAR | Y | 50 | 재고 바코드 |
| `loc_cd` | VARCHAR | Y | 30 | 로케이션 코드 |
| `lot_no` | VARCHAR | Y | 50 | 로트 번호 |
| `expired_date` | VARCHAR | Y | 10 | 유통기한 |
| `alloc_qty` | DOUBLE | N | - | 할당 수량 |
| `alloc_strategy` | VARCHAR | Y | 20 | 할당 전략 (FEFO/FIFO/MANUAL) |
| `status` | VARCHAR | N | 20 | 상태 (SOFT/HARD/RELEASED/EXPIRED/CANCELLED) |
| `allocated_at` | VARCHAR | Y | 20 | 할당 일시 |
| `expired_at` | VARCHAR | Y | 20 | 만료 일시 (SOFT 할당 타임아웃) |
| `released_at` | VARCHAR | Y | 20 | 해제 일시 |
| `remarks` | VARCHAR | Y | 500 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_stock_allocations_0` | `domain_id, shipment_order_id` | N |
| `ix_stock_allocations_1` | `domain_id, shipment_order_item_id` | N |
| `ix_stock_allocations_2` | `domain_id, inventory_id` | N |
| `ix_stock_allocations_3` | `domain_id, sku_cd, status` | N |
| `ix_stock_allocations_4` | `domain_id, status` | N |
| `ix_stock_allocations_5` | `domain_id, expired_at, status` | N |

---

### 5.8 shipment_export_details — 수출 출고 상세

수출 출고 주문(`ship_type = EXPORT`)의 통관/물류 확장 정보. 출하 주문과 1:1 관계.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `shipment_order_id` | VARCHAR | N | 40 | FK → shipment_orders (UNIQUE) |
| `shipment_no` | VARCHAR | N | 30 | 출하 주문 번호 |
| **무역 조건** | | | | |
| `dest_country_cd` | VARCHAR | N | 5 | 목적지 국가 코드 (ISO 3166-1 alpha-2) |
| `origin_country_cd` | VARCHAR | Y | 5 | 원산지 국가 코드 |
| `incoterms` | VARCHAR | Y | 10 | 무역 조건 (FOB/CIF/EXW/DDP/DAP 등) |
| `currency_cd` | VARCHAR | Y | 5 | 통화 코드 (USD/EUR/JPY/CNY 등) |
| `total_amount_fc` | DOUBLE | Y | - | 총 금액 (외화) |
| `exchange_rate` | DOUBLE | Y | - | 환율 (KRW 기준) |
| **통관 정보** | | | | |
| `export_declaration_no` | VARCHAR | Y | 50 | 수출 신고 번호 |
| `export_license_no` | VARCHAR | Y | 50 | 수출 허가 번호 |
| `declared_at` | VARCHAR | Y | 20 | 신고 일시 |
| `customs_broker_cd` | VARCHAR | Y | 30 | 관세사 코드 |
| `customs_broker_nm` | VARCHAR | Y | 100 | 관세사명 |
| `customs_status` | VARCHAR | Y | 20 | 통관 상태 (PENDING/DECLARED/APPROVED/REJECTED) |
| **상업 서류** | | | | |
| `commercial_invoice_no` | VARCHAR | Y | 50 | 상업 송장 번호 |
| `lc_no` | VARCHAR | Y | 50 | L/C 번호 (신용장) |
| **운송 정보** | | | | |
| `transport_mode` | VARCHAR | Y | 10 | 운송 수단 (SEA/AIR/TRUCK/RAIL) |
| `bl_no` | VARCHAR | Y | 50 | B/L 번호 (선하증권) / AWB 번호 (항공화물운송장) |
| `vessel_nm` | VARCHAR | Y | 50 | 선박명 / 항공편명 |
| `voyage_no` | VARCHAR | Y | 30 | 항차 / 편명 |
| `port_of_loading` | VARCHAR | Y | 30 | 선적항 (출발지) |
| `port_of_discharge` | VARCHAR | Y | 30 | 양륙항 (목적지) |
| `etd` | VARCHAR | Y | 10 | 출항 예정일 |
| `eta` | VARCHAR | Y | 10 | 도착 예정일 |
| **컨테이너** | | | | |
| `container_no` | VARCHAR | Y | 30 | 컨테이너 번호 |
| `container_type` | VARCHAR | Y | 10 | 컨테이너 유형 (20FT/40FT/40HC) |
| `seal_no` | VARCHAR | Y | 30 | 봉인 번호 |
| **중량** | | | | |
| `total_net_wt` | DOUBLE | Y | - | 총 순중량 (kg) |
| `total_gross_wt` | DOUBLE | Y | - | 총 총중량 (kg) |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_shipment_export_details_0` | `domain_id, shipment_order_id` | Y |
| `ix_shipment_export_details_1` | `domain_id, shipment_no` | Y |
| `ix_shipment_export_details_2` | `domain_id, export_declaration_no` | N |
| `ix_shipment_export_details_3` | `domain_id, dest_country_cd` | N |
| `ix_shipment_export_details_4` | `domain_id, customs_status` | N |
| `ix_shipment_export_details_5` | `domain_id, bl_no` | N |

---

### 5.9 shipment_export_items — 수출 출고 품목 상세

수출 출고 품목별 HS 코드, 원산지, 외화 금액, 중량 정보. shipment_order_items와 1:1 관계.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `shipment_order_item_id` | VARCHAR | N | 40 | FK → shipment_order_items (UNIQUE) |
| `shipment_order_id` | VARCHAR | N | 40 | FK → shipment_orders |
| `hs_cd` | VARCHAR | Y | 20 | HS 코드 (관세 분류) |
| `origin_country_cd` | VARCHAR | Y | 5 | 원산지 국가 코드 |
| `unit_price_fc` | DOUBLE | Y | - | 외화 단가 |
| `amount_fc` | DOUBLE | Y | - | 외화 금액 |
| `net_wt` | DOUBLE | Y | - | 순중량 (kg) |
| `gross_wt` | DOUBLE | Y | - | 총중량 (kg) |
| `remarks` | VARCHAR | Y | 500 | 비고 |
| `attr01~03` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_shipment_export_items_0` | `domain_id, shipment_order_item_id` | Y |
| `ix_shipment_export_items_1` | `domain_id, shipment_order_id` | N |
| `ix_shipment_export_items_2` | `domain_id, hs_cd` | N |

---

### 5.10 import_shipment_orders — 임포트 스테이징

Excel/API 임포트 시 사용하는 스테이징 모델. `ignoreDdl = true`.
헤더 + 상세 + 배송 정보를 플랫 구조로 수신하여 정규화 처리.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK |
| **주문 헤더** | | | | |
| `shipment_no` | VARCHAR | Y | 30 | 출하 주문 번호 |
| `ref_order_no` | VARCHAR | Y | 50 | 외부 참조 주문번호 |
| `order_date` | VARCHAR | Y | 10 | 주문 일자 |
| `ship_by_date` | VARCHAR | Y | 10 | 출하 기한 |
| `com_cd` | VARCHAR | Y | 30 | 화주사 코드 |
| `cust_cd` | VARCHAR | Y | 30 | 고객 코드 — B2C: 판매 채널 코드(OWN_MALL/COUPANG 등), B2B: 납품 거래처 코드 |
| `cust_nm` | VARCHAR | Y | 100 | 주문자명 — B2C: 주문자 이름, B2B: 납품 거래처명 |
| `wh_cd` | VARCHAR | Y | 30 | 창고 코드 |
| `biz_type` | VARCHAR | Y | 10 | 업무 유형 |
| `ship_type` | VARCHAR | Y | 20 | 출하 유형 |
| `dlv_type` | VARCHAR | Y | 20 | 배송 유형 (PARCEL/FREIGHT/CHARTER/QUICK/PICKUP/DIRECT) |
| `priority_cd` | VARCHAR | Y | 10 | 우선순위 |
| **주문 상세** | | | | |
| `line_no` | VARCHAR | Y | 5 | 라인 번호 |
| `sku_cd` | VARCHAR | Y | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | 100 | 상품명 |
| `order_qty` | DOUBLE | Y | - | 주문 수량 |
| `unit_price` | DOUBLE | Y | - | 단가 |
| `expired_date` | VARCHAR | Y | 10 | 유통기한 |
| `lot_no` | VARCHAR | Y | 50 | 로트 번호 |
| `barcode` | VARCHAR | Y | 50 | 바코드 |
| **배송 정보** | | | | |
| `carrier_cd` | VARCHAR | Y | 30 | 택배사 코드 |
| `carrier_service_type` | VARCHAR | Y | 20 | 서비스 유형 |
| `sender_nm` | VARCHAR | Y | 100 | 발송인 명 |
| `sender_phone` | VARCHAR | Y | 20 | 발송인 전화 |
| `sender_zip_cd` | VARCHAR | Y | 20 | 발송인 우편번호 |
| `sender_addr` | VARCHAR | Y | 200 | 발송인 주소 |
| `orderer_nm` | VARCHAR | Y | 100 | 주문자 명 |
| `receiver_nm` | VARCHAR | Y | 100 | 수취인 명 |
| `receiver_phone` | VARCHAR | Y | 20 | 수취인 전화 |
| `receiver_zip_cd` | VARCHAR | Y | 20 | 수취인 우편번호 |
| `receiver_addr` | VARCHAR | Y | 200 | 수취인 주소 |
| `receiver_addr2` | VARCHAR | Y | 200 | 수취인 상세주소 |
| `delivery_memo` | VARCHAR | Y | 500 | 배송 메모 |
| **기타** | | | | |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

---

### 5.11 shipment_order_status — 주문 현황 뷰

출하 주문 + 상세 + 배송 정보를 조인한 복합 뷰. `ignoreDdl = true`.

```sql
CREATE OR REPLACE VIEW shipment_order_status AS
SELECT
    si.id,
    si.shipment_order_id,
    so.shipment_no, so.ref_order_no,
    so.order_date, so.ship_by_date, so.cutoff_time, so.priority_cd,
    so.wave_no, so.wh_cd, so.com_cd, so.cust_cd, so.cust_nm,
    so.biz_type, so.ship_type, so.pick_method, so.dlv_type,
    so.status,
    so.total_item, so.total_order, so.total_alloc, so.total_shipped,
    so.confirmed_at, so.allocated_at, so.released_at, so.shipped_at,
    si.line_no, si.sku_cd, si.sku_nm,
    si.order_qty, si.alloc_qty, si.shipped_qty, si.short_qty, si.cancel_qty,
    si.barcode, si.expired_date, si.lot_no,
    sd.receiver_nm, sd.receiver_phone, sd.receiver_zip_cd,
    sd.receiver_addr, sd.receiver_addr2, sd.delivery_memo,
    so.remarks,
    so.domain_id, si.created_at, si.updated_at
FROM
    shipment_orders so
    INNER JOIN shipment_order_items si ON so.id = si.shipment_order_id
    LEFT OUTER JOIN shipment_deliveries sd ON so.id = sd.shipment_order_id
```

---

## 6. ER 다이어그램

```
┌─────────────────────┐       ┌──────────────────────┐
│   shipment_waves    │       │  import_shipment_     │
│                     │       │       orders          │
│ wave_no (UNIQUE)    │       │ (스테이징 모델)        │
│ wave_date           │       └──────────────────────┘
│ pick_type           │
│ carrier_cd          │
│ status              │
└─────────┬───────────┘
          │ 1:N (wave_no)
          │
┌─────────▼───────────┐      ┌──────────────────────┐
│   shipment_orders   │──1:1─│ shipment_deliveries  │
│                     │      │                      │
│ shipment_no (UNIQUE)│      │ sender_*             │
│ ref_order_no        │      │ orderer_*            │
│ cust_cd / cust_nm   │      │ receiver_*           │
│ order_date          │      │ delivery_memo        │
│ ship_by_date        │      │                      │
│ priority_cd         │      │                      │
│ status              │      └──────────────────────┘
│                     │
│                     │──1:1─┌──────────────────────┐
│                     │      │ shipment_export_     │
│                     │      │     details          │
│                     │      │                      │
│                     │      │ dest_country_cd      │
│                     │      │ incoterms            │
│                     │      │ currency_cd          │
│                     │      │ customs_status       │
│                     │      │ bl_no                │
│                     │      │ container_no         │
└─────────┬───────────┘      └──────────────────────┘
          │ 1:N
          │
┌─────────▼───────────┐      ┌──────────────────────┐
│ shipment_order_items│──1:N─│  stock_allocations   │
│                     │      │                      │
│ sku_cd              │      │ inventory_id         │
│ order_qty           │      │ sku_cd               │
│ alloc_qty           │      │ alloc_qty            │
│ shipped_qty         │      │ alloc_strategy       │
│ short_qty           │      │ status               │
│ cancel_qty          │      │                      │
│                     │      └──────────────────────┘
│                     │
│                     │──1:1─┌──────────────────────┐
│                     │      │ shipment_export_     │
│                     │      │     items            │
│                     │      │                      │
│                     │      │ hs_cd                │
│                     │      │ origin_country_cd    │
│                     │      │ unit_price_fc        │
│                     │      │ net_wt / gross_wt    │
└─────────────────────┘      └──────────────────────┘

┌─────────────────────┐
│  replenish_orders   │
│                     │
│ replenish_no (UNQ)  │
│ wave_no (FK)        │
│ status              │
└─────────┬───────────┘
          │ 1:N
┌─────────▼───────────┐
│ replenish_order_    │
│       items         │
│                     │
│ sku_cd              │
│ from_loc_cd         │
│ to_loc_cd           │
│ order_qty           │
│ result_qty          │
└─────────────────────┘
```

---

## 7. 공통코드 및 상수

### 7.1 업무 유형 (bizType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `BIZ_TYPE_B2C_OUT` | `B2C_OUT` | B2C 출고 |
| `BIZ_TYPE_B2B_OUT` | `B2B_OUT` | B2B 출고 |
| `BIZ_TYPE_B2C_RTN` | `B2C_RTN` | B2C 반품 출고 |
| `BIZ_TYPE_B2B_RTN` | `B2B_RTN` | B2B 반품 출고 |

### 7.2 출하 유형 (shipType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `SHIP_TYPE_NORMAL` | `NORMAL` | 일반 출고 |
| `SHIP_TYPE_RETURN` | `RETURN` | 반품 출고 |
| `SHIP_TYPE_TRANSFER` | `TRANSFER` | 창고 이동 |
| `SHIP_TYPE_SCRAP` | `SCRAP` | 폐기 |
| `SHIP_TYPE_EXPORT` | `EXPORT` | 수출 출고 |
| `SHIP_TYPE_ETC` | `ETC` | 기타 출고 |

### 7.3 피킹 유형 (pickType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `PICK_TYPE_INDIVIDUAL` | `INDIVIDUAL` | 개별 피킹 (오더 피킹) |
| `PICK_TYPE_TOTAL` | `TOTAL` | 토탈 피킹 (합산 후 분배) |
| `PICK_TYPE_ZONE` | `ZONE` | 존 피킹 (릴레이 피킹) |

### 7.4 우선순위 (priorityCd)

| 코드 | 값 | 설명 |
|------|-----|------|
| `PRIORITY_URGENT` | `URGENT` | 긴급 (당일 출하 필수) |
| `PRIORITY_NORMAL` | `NORMAL` | 일반 |
| `PRIORITY_LOW` | `LOW` | 후순위 |

### 7.5 할당 전략 (allocStrategy)

| 코드 | 값 | 설명 |
|------|-----|------|
| `ALLOC_STRATEGY_FEFO` | `FEFO` | 유통기한 선입선출 |
| `ALLOC_STRATEGY_FIFO` | `FIFO` | 입고 시간 선입선출 |
| `ALLOC_STRATEGY_MANUAL` | `MANUAL` | 작업자 수동 선택 |

### 7.6 배송 유형 (dlvType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `DLV_TYPE_PARCEL` | `PARCEL` | 택배 (CJ대한통운, 한진, 롯데 등) |
| `DLV_TYPE_FREIGHT` | `FREIGHT` | 화물 (화물차) |
| `DLV_TYPE_CHARTER` | `CHARTER` | 용차 (차량 전세) |
| `DLV_TYPE_QUICK` | `QUICK` | 퀵서비스 (오토바이/다마스) |
| `DLV_TYPE_PICKUP` | `PICKUP` | 직접 인수 (고객/거래처 방문 수령) |
| `DLV_TYPE_DIRECT` | `DIRECT` | 직접 배송 (자사 차량) |

### 7.7 배송 서비스 유형 (carrierServiceType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `SERVICE_NEXT_DAY` | `NEXT_DAY` | 익일 배송 |
| `SERVICE_SAME_DAY` | `SAME_DAY` | 당일 배송 |
| `SERVICE_DAWN` | `DAWN` | 새벽 배송 |
| `SERVICE_STANDARD` | `STANDARD` | 일반 배송 (2~3일) |

### 7.8 인코텀즈 (incoterms)

| 코드 | 값 | 설명 |
|------|-----|------|
| `INCOTERMS_FOB` | `FOB` | 본선 인도 (Free On Board) |
| `INCOTERMS_CIF` | `CIF` | 운임·보험료 포함 (Cost, Insurance and Freight) |
| `INCOTERMS_EXW` | `EXW` | 공장 인도 (Ex Works) |
| `INCOTERMS_DDP` | `DDP` | 관세 지급 인도 (Delivered Duty Paid) |
| `INCOTERMS_DAP` | `DAP` | 목적지 인도 (Delivered At Place) |
| `INCOTERMS_FCA` | `FCA` | 운송인 인도 (Free Carrier) |
| `INCOTERMS_CFR` | `CFR` | 운임 포함 (Cost and Freight) |

### 7.9 통관 상태 (customsStatus)

| 코드 | 값 | 설명 |
|------|-----|------|
| `CUSTOMS_PENDING` | `PENDING` | 신고 대기 |
| `CUSTOMS_DECLARED` | `DECLARED` | 신고 완료 |
| `CUSTOMS_APPROVED` | `APPROVED` | 통관 승인 |
| `CUSTOMS_REJECTED` | `REJECTED` | 통관 반려 |

### 7.10 운송 수단 (transportMode)

| 코드 | 값 | 설명 |
|------|-----|------|
| `TRANSPORT_SEA` | `SEA` | 해상 운송 |
| `TRANSPORT_AIR` | `AIR` | 항공 운송 |
| `TRANSPORT_TRUCK` | `TRUCK` | 육상 운송 |
| `TRANSPORT_RAIL` | `RAIL` | 철도 운송 |

### 7.11 컨테이너 유형 (containerType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `CONTAINER_20FT` | `20FT` | 20피트 컨테이너 |
| `CONTAINER_40FT` | `40FT` | 40피트 컨테이너 |
| `CONTAINER_40HC` | `40HC` | 40피트 하이큐브 컨테이너 |
| `CONTAINER_LCL` | `LCL` | 혼적 화물 (Less than Container Load) |

---

## 8. 주요 설정값

`RuntimeEnvItem`에 등록하여 화주사/창고별 설정 가능.

### 8.1 주문 처리

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `oms.order.auto-confirm.enabled` | `false` | 주문 수신 시 자동 확정 여부 |
| `oms.order.duplicate-check.field` | `ref_order_no` | 중복 체크 기준 필드 |
| `oms.order.default-priority` | `NORMAL` | 기본 우선순위 |
| `oms.order.default-biz-type` | `B2C_OUT` | 기본 업무 유형 |

### 8.2 재고 할당

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `oms.allocation.strategy` | `FIFO` | 기본 할당 전략 |
| `oms.allocation.type` | `HARD` | 기본 할당 유형 (SOFT/HARD) |
| `oms.allocation.soft-timeout-minutes` | `30` | SOFT 할당 타임아웃 (분) |
| `oms.allocation.auto-allocate.on-confirm` | `true` | 확정 시 자동 할당 |
| `oms.allocation.allow-partial` | `true` | 부분 할당 허용 |
| `oms.allocation.back-order.enabled` | `true` | 재고 부족 시 BACK_ORDER 생성 |

### 8.3 웨이브

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `oms.wave.auto-create.enabled` | `false` | 할당 완료 시 자동 웨이브 생성 |
| `oms.wave.group-by` | `carrier_cd` | 웨이브 그룹핑 기준 (carrier_cd/cust_cd/biz_type) |
| `oms.wave.default-pick-type` | `TOTAL` | 기본 피킹 유형 |
| `oms.wave.max-order-count` | `200` | 웨이브당 최대 주문 수 |
| `oms.wave.cutoff-time` | `14:00` | 당일 출하 마감 시간 |

### 8.4 보충

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `oms.replenish.auto-create.on-wave` | `true` | 웨이브 생성 시 자동 보충 지시 |
| `oms.replenish.min-stock-rate` | `0.3` | 최소 재고 비율 (이하 시 보충) |

### 8.5 출력

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `oms.sheet.picking.template` | - | 피킹 지시서 출력 템플릿 |
| `oms.sheet.invoice.template` | - | 거래명세서 출력 템플릿 |
| `oms.label.template` | - | 출고 라벨 출력 템플릿 |

---

## 9. API 목록

Base URL: `/rest/oms_trx`

### 9.1 주문 수신/임포트

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `shipment_orders/import/excel/b2c` | B2C 주문 엑셀 임포트 | ✅ |
| POST | `shipment_orders/import/excel/b2b` | B2B 주문 엑셀 임포트 | ✅ |
| POST | `shipment_orders/import/confirm` | 주문 임포트 확정 (검증 후 등록) | ✅ |
| POST | `shipment_orders/import/api` | 외부 API 주문 수신 | |
| POST | `shipment_orders/import/channel/{channelCd}` | 채널별 주문 동기화 | |

### 9.2 주문 확정

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `shipment_orders/{id}/confirm` | 개별 주문 확정 (REGISTERED→CONFIRMED) | |
| POST | `shipment_orders/confirm` | 복수 주문 일괄 확정 | ✅ |
| POST | `shipment_orders/{id}/cancel_confirm` | 확정 취소 (CONFIRMED→REGISTERED) | |

### 9.3 재고 할당

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `shipment_orders/{id}/allocate` | 개별 주문 재고 할당 (CONFIRMED→ALLOCATED) | |
| POST | `shipment_orders/allocate` | 복수 주문 일괄 할당 | ✅ |
| POST | `shipment_orders/deallocate` | 할당 해제 (ALLOCATED→CONFIRMED) | ✅ |
| POST | `shipment_orders/{id}/confirm_and_allocate` | 확정+할당 원클릭 | ✅ |
| GET | `shipment_orders/{id}/allocations` | 할당 내역 조회 | |
| GET | `shipment_orders/{id}/available_inventories` | 가용 재고 조회 | |

### 9.4 웨이브 관리

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `waves/create` | 웨이브 생성 (주문 자동 그룹핑) | ✅ |
| POST | `waves/create_manual` | 수동 웨이브 생성 (주문 직접 선택) | ✅ |
| GET | `waves/preview` | 자동 웨이브 대상 건수 미리보기 | ✅ |
| POST | `waves/{id}/add_orders` | 웨이브에 주문 추가 | ✅ |
| POST | `waves/{id}/remove_orders` | 웨이브에서 주문 제거 | ✅ |
| POST | `waves/{id}/release` | 웨이브 확정 → Fulfillment 인계 | ✅ |
| POST | `waves/{id}/cancel` | 웨이브 취소 | ✅ |
| GET | `waves/{id}/orders` | 웨이브 내 주문 목록 | ✅ |
| GET | `waves/{id}/summary` | 웨이브 요약 (SKU 합산, 수량 등) | ✅ |

### 9.5 보충 지시

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `replenish_orders/create` | 보충 지시 생성 | |
| POST | `replenish_orders/{id}/start` | 보충 작업 시작 | ✅ |
| POST | `replenish_orders/{id}/complete` | 보충 완료 | ✅ |
| POST | `replenish_orders/{id}/cancel` | 보충 취소 | ✅ |
| GET | `replenish_orders/{id}/items` | 보충 상세 조회 | |

### 9.6 주문 취소/마감

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| POST | `shipment_orders/{id}/cancel` | 주문 취소 (→CANCELLED) | |
| POST | `shipment_orders/cancel` | 복수 주문 일괄 취소 | ✅ |
| POST | `shipment_orders/{id}/close` | 주문 마감 (SHIPPED→CLOSED) | ✅ |
| POST | `shipment_orders/close` | 복수 주문 일괄 마감 | |

### 9.7 조회/대시보드

Base URL: `/rest/oms_dashboard`

| Method | URL | 설명 | 구현 |
|--------|-----|------|:----:|
| GET | `status_counts` | 상태별 주문 건수 | ✅ |
| GET | `biz_type_stats` | 업무 유형별 통계 | ✅ |
| GET | `channel_stats` | 채널별 통계 | ✅ |
| GET | `wave_stats` | 웨이브별 진행 현황 | ✅ |
| GET | `allocation_stats` | 할당 현황 (할당율/부족율) | ✅ |
| GET | `back_orders` | 재고 부족 주문 목록 | |
| GET | `cutoff_alerts` | 마감 임박 주문 알림 | ✅ |

### 9.8 CRUD API

각 엔티티별 기본 CRUD 컨트롤러:

| 엔티티 | Base URL | 설명 |
|--------|----------|------|
| ShipmentOrder | `/rest/shipment_orders` | 출하 주문 CRUD |
| ShipmentOrderItem | 상위에 포함 | `{id}/items`로 조회 |
| ShipmentWave | `/rest/shipment_waves` | 웨이브 CRUD |
| ShipmentDelivery | `/rest/shipment_deliveries` | 배송 정보 CRUD |
| ReplenishOrder | `/rest/replenish_orders` | 보충 지시 CRUD |
| StockAllocation | `/rest/stock_allocations` | 할당 CRUD |
| ShipmentOrderStatus | `/rest/shipment_order_status` | 현황 조회 (읽기 전용) |

---

## 10. 재고 연동

### 10.1 재고 상태 변화 (OMS 단계)

| 시점 | 재고 상태 | lastTranCd | 설명 |
|------|----------|------------|------|
| SOFT 할당 | `SOFT_ALLOCATED` | `SOFT_ALLOC` | 소프트 할당 (해제 가능) |
| HARD 할당 | `ALLOCATED` | `ALLOC` | 하드 할당 (피킹 대상) |
| 할당 해제 | `STORED` | `DEALLOC` | 할당 해제 → 가용 재고 복원 |
| Fulfillment 인계 | `RESERVED` | `RESERVE` | 피킹 지시 생성 → 재고 예약 |

### 10.2 할당 전략별 재고 선택

| 전략 | 선택 기준 | SQL 예시 |
|------|----------|----------|
| `FEFO` | 유통기한 가장 가까운 재고 우선 | `ORDER BY expired_date ASC` |
| `FIFO` | 입고 시간이 가장 오래된 재고 우선 | `ORDER BY created_at ASC` |
| `MANUAL` | 작업자가 직접 선택 | UI에서 재고 선택 |

### 10.3 할당 프로세스 상세

```
1. 할당 요청
   ↓
2. 가용 재고 조회
   SELECT * FROM inventories
   WHERE domain_id = ? AND sku_cd = ? AND status = 'STORED'
     AND alloc_qty < stock_qty
   ORDER BY {전략별 정렬}
   ↓
3. 수량 확인
   ├─ 가용 >= 주문: 전량 할당
   ├─ 가용 < 주문 (부분 허용): 부분 할당 + short_qty 기록
   └─ 가용 = 0: BACK_ORDER 처리
   ↓
4. 할당 기록 생성
   INSERT INTO stock_allocations (...)
   ↓
5. 재고 상태 업데이트
   UPDATE inventories SET alloc_qty = alloc_qty + ?, status = 'ALLOCATED'
   ↓
6. 주문 상태 변경
   UPDATE shipment_orders SET status = 'ALLOCATED'
```

---

## 11. Fulfillment / WCS 모듈 연동

### 11.1 인계 분기 로직

웨이브 확정(`releaseWave()`) 시 `pick_method`에 따라 인계 대상이 분기됩니다:

```java
/**
 * 웨이브 확정 → pick_method별 분기
 */
public void releaseWave(String waveId) {
    ShipmentWave wave = findWave(waveId);
    List<ShipmentOrder> orders = findOrdersByWave(waveId);

    // 공통: 상태 변경
    orders.forEach(o -> o.setStatus("RELEASED"));
    wave.setStatus("RELEASED");

    // pick_method별 분기
    String pickMethod = wave.getPickMethod();  // 웨이브의 pick_method
    switch (pickMethod) {
        case "PICK":
        case "PAPER":
        case "INSPECT":
            // Fulfillment 모듈에 인계 (내부 서비스 호출)
            fulfillmentService.createPickingOrders(buildReleaseRequest(wave, orders));
            break;
        case "WCS":
            // WCS에 API 호출 (외부 시스템)
            wcsApiService.sendPickingRequest(buildWcsRequest(wave, orders));
            break;
    }
}
```

### 11.2 Fulfillment 인계 인터페이스

OMS → Fulfillment 인계 시 전달하는 데이터 (pick_method = PICK/PAPER/INSPECT):

```java
/**
 * OMS에서 Fulfillment로 전달하는 인계 데이터
 */
public class FulfillmentReleaseRequest {
    private String waveNo;                   // 웨이브 번호
    private String pickType;                 // 피킹 유형 (INDIVIDUAL/TOTAL/ZONE)
    private String pickMethod;               // 피킹 방식 (WCS/PAPER/INSPECT/PICK)
    private Boolean inspFlag;                // 검수 여부
    private List<ShipmentOrder> orders;      // 출하 주문 목록
    private List<StockAllocation> allocations; // 할당 내역
    private List<ReplenishOrder> replenishes;  // 보충 지시 (선택)
}
```

### 11.3 WCS 연동 인터페이스

OMS → WCS 전송 시 사용하는 데이터 (pick_method = WCS):

```java
/**
 * OMS에서 WCS로 전달하는 피킹/분류 지시 데이터
 */
public class WcsPickingRequest {
    private String waveNo;                   // 웨이브 번호
    private String pickType;                 // 피킹 유형 (INDIVIDUAL/TOTAL/ZONE)
    private String facilityType;             // 설비 유형 (DPS/DAS/SORTER/CONVEYOR)
    private List<WcsPickingItem> items;      // 피킹 지시 항목
    private List<WcsSortationItem> sortItems;// 분류 지시 항목 (토탈 피킹 시)
    private String callbackUrl;              // 완료 콜백 URL
}

public class WcsPickingItem {
    private String shipmentOrderId;          // 출하 주문 ID
    private String shipmentNo;               // 출하 주문 번호
    private String skuCd;                    // 상품 코드
    private String barcode;                  // 바코드
    private String locCd;                    // 로케이션 코드
    private String lotNo;                    // 로트 번호
    private Double orderQty;                 // 지시 수량
}
```

#### 11.3.1 WCS API 호출

| Method | URL | 설명 |
|--------|-----|------|
| POST | `{wcs.api.base-url}/picking/request` | 피킹 지시 전송 |
| POST | `{wcs.api.base-url}/sortation/request` | 분류 지시 전송 (토탈 피킹) |
| GET | `{wcs.api.base-url}/picking/{waveNo}/status` | 작업 진행 상태 조회 |
| POST | `{wcs.api.base-url}/picking/{waveNo}/cancel` | 작업 취소 요청 |

#### 11.3.2 WCS 콜백 수신

WCS가 작업 완료 시 OMS에 콜백합니다. OMS는 콜백 수신 후 동일한 이벤트를 발행하여
Fulfillment 경로와 동일한 상태 흐름을 따릅니다.

```java
/**
 * WCS 콜백 수신 컨트롤러
 * WCS가 호출하는 콜백 URL: POST /rest/oms_trx/wcs/callback
 */
@RestController
public class WcsCallbackController {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @PostMapping("/rest/oms_trx/wcs/callback/picking_started")
    public void onPickingStarted(@RequestBody WcsCallbackPayload payload) {
        // WCS 피킹 시작 → 동일 이벤트 발행
        eventPublisher.publishEvent(new PickingStartedEvent(
            payload.getShipmentOrderId(), payload.getWaveNo()));
    }

    @PostMapping("/rest/oms_trx/wcs/callback/completed")
    public void onCompleted(@RequestBody WcsCallbackPayload payload) {
        // WCS 작업 완료 → 동일 이벤트 발행
        eventPublisher.publishEvent(new ShipmentCompletedEvent(
            payload.getShipmentOrderId(), payload.getInvoiceNo()));
    }
}
```

> **핵심**: WCS 콜백도 동일한 ApplicationEvent를 발행하므로,
> OMS의 이벤트 리스너(`OmsEventListener`)가 Fulfillment/WCS 구분 없이 동일하게 처리합니다.

#### 11.3.3 WCS 설정값

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `oms.wcs.api.base-url` | - | WCS API 베이스 URL |
| `oms.wcs.api.auth-token` | - | WCS API 인증 토큰 |
| `oms.wcs.api.timeout-seconds` | `30` | API 호출 타임아웃 |
| `oms.wcs.callback.base-url` | - | OMS 콜백 수신 URL (WCS에 전달) |
| `oms.wcs.facility-type` | `DPS` | 기본 설비 유형 (DPS/DAS/SORTER) |
| `oms.wcs.retry.max-count` | `3` | API 호출 실패 시 재시도 횟수 |
| `oms.wcs.retry.interval-seconds` | `5` | 재시도 간격 (초) |

### 11.4 이벤트 기반 상태 동기화

Fulfillment/WCS 모두 작업 진행 시 **Spring ApplicationEvent를 발행**하고,
OMS 모듈이 이를 **구독(EventListener)**하여 ShipmentOrder 상태를 업데이트합니다.

> Fulfillment/WCS → OMS 직접 호출 없음. 이벤트만 발행하므로 **느슨한 결합** 유지.
> WCS의 경우 콜백 수신 컨트롤러(11.3.2)가 동일한 이벤트를 발행합니다.

#### 11.4.1 Fulfillment/WCS가 발행하는 이벤트

| 이벤트 클래스 | 발행 시점 | 페이로드 |
|--------------|----------|----------|
| `PickingStartedEvent` | 피킹 지시 첫 스캔 시 | shipmentOrderId, waveNo, pickerId, startedAt |
| `PackingStartedEvent` | 패킹/검수 작업 시작 시 | shipmentOrderId, waveNo, packerId, startedAt |
| `ShipmentCompletedEvent` | 출하 확정 (운송장 부착 완료) | shipmentOrderId, carrierCd, shippedAt |
| `ShipmentFailedEvent` | 출하 실패 (피킹 불가 등) | shipmentOrderId, reason, failedAt |
| `PartialShipmentEvent` | 부분 출하 | shipmentOrderId, shippedQty, shortQty |

#### 11.4.2 OMS의 이벤트 리스너

```java
/**
 * Fulfillment/WCS 이벤트를 구독하여 ShipmentOrder 상태를 업데이트
 * OMS 모듈에 위치: operato.wms.oms.service.OmsEventListener
 */
@Component
public class OmsEventListener {

    @EventListener
    public void onPickingStarted(PickingStartedEvent event) {
        // RELEASED → PICKING
        shipmentOrderService.updateStatus(event.getShipmentOrderId(), "PICKING");
    }

    @EventListener
    public void onPackingStarted(PackingStartedEvent event) {
        // PICKING → PACKING
        shipmentOrderService.updateStatus(event.getShipmentOrderId(), "PACKING");
    }

    @EventListener
    public void onShipmentCompleted(ShipmentCompletedEvent event) {
        // PACKING → SHIPPED
        shipmentOrderService.completeShipment(event.getShipmentOrderId(),
            event.getInvoiceNo(), event.getShippedAt());
    }

    @EventListener
    public void onShipmentFailed(ShipmentFailedEvent event) {
        // 예외 처리 (관리자 알림, 로그 기록)
        shipmentOrderService.handleShipmentFailure(event.getShipmentOrderId(),
            event.getReason());
    }
}
```

#### 11.4.3 이벤트 클래스 위치

이벤트 클래스는 **공통 패키지**에 위치하여 OMS/Fulfillment/WCS 콜백 컨트롤러가 참조:

```
operato.wms.common.event/          ← 공통 이벤트 정의
├── FulfillmentEvent.java          ← 추상 베이스
├── WaveReleasedEvent.java         ← OMS → Fulfillment 웨이브 확정 이벤트
├── WaveCancelledEvent.java        ← OMS → Fulfillment 웨이브 확정 취소 이벤트
├── PickingStartedEvent.java
├── PackingStartedEvent.java
├── ShipmentCompletedEvent.java
├── ShipmentFailedEvent.java
└── PartialShipmentEvent.java
```

> **동일 JVM 내 이벤트**: Spring `ApplicationEventPublisher`를 사용하므로 별도 메시지 브로커 불필요.
> 향후 마이크로서비스 분리 시 Kafka/RabbitMQ로 교체 가능.

#### 11.4.4 OMS가 발행하는 이벤트 (OMS → Fulfillment)

OMS는 상위 모듈로서 Fulfillment를 직접 의존하지 않고 이벤트를 발행합니다:

| 이벤트 클래스 | 발행 시점 | 페이로드 | 구독자 |
|--------------|----------|----------|--------|
| `WaveReleasedEvent` | 웨이브 확정 시 | domainId, waveId, waveNo, pickType, pickMethod, orderCount | Fulfillment.FulfillmentEventListener |
| `WaveCancelledEvent` | 웨이브 확정 취소 시 | domainId, waveId, waveNo | Fulfillment.FulfillmentEventListener |

**이벤트 발행 예시:**

```java
// OmsTransactionService.java
@Autowired
private ApplicationEventPublisher eventPublisher;

public Map<String, Object> releaseWave(String id) {
    // 웨이브 상태 변경 후 이벤트 발행
    WaveReleasedEvent event = new WaveReleasedEvent(
        domainId, id, wave.getWaveNo(), wave.getPickType(),
        wave.getPickMethod(), orderCount
    );
    this.eventPublisher.publishEvent(event);
    // Fulfillment에서 자동으로 피킹 지시 생성
}

public Map<String, Object> cancelWaveRelease(String id) {
    // 피킹 지시 상태 확인 후 이벤트 발행
    WaveCancelledEvent event = new WaveCancelledEvent(
        domainId, id, wave.getWaveNo()
    );
    this.eventPublisher.publishEvent(event);
    // Fulfillment에서 자동으로 피킹 지시 삭제
}
```

**Fulfillment 이벤트 리스너:**

```java
// FulfillmentEventListener.java
@Component
public class FulfillmentEventListener {

    @Autowired
    private FulfillmentTransactionService fulfillmentTrxService;

    @EventListener
    public void onWaveReleased(WaveReleasedEvent event) {
        // 피킹 지시 자동 생성
        Map<String, Object> params = new HashMap<>();
        params.put("wave_no", event.getWaveNo());
        params.put("pick_type", event.getPickType());
        params.put("pick_method", event.getPickMethod());
        fulfillmentTrxService.createPickingTasks(params);
    }

    @EventListener
    public void onWaveCancelled(WaveCancelledEvent event) {
        // 피킹 지시 자동 삭제 (WAIT 상태만)
        fulfillmentTrxService.deletePickingTasksByWave(event.getWaveNo());
    }
}
```

> **의존성 역전**: OMS(상위) → Fulfillment(하위)는 이벤트 발행으로 느슨한 결합 유지.
> Fulfillment → OMS는 API 호출 가능 (하위가 상위 의존은 허용).

### 11.5 OMS ↔ Fulfillment/WCS 상태 매핑

| OMS 상태 | 이벤트 | 트리거 | 발행 주체 |
|---------|--------|--------|----------|
| `RELEASED` | (인계 완료) | `releaseWave()` | OMS 직접 설정 |
| `PICKING` | `PickingStartedEvent` | 첫 바코드 스캔 / WCS 피킹 시작 | Fulfillment 또는 WCS 콜백 |
| `PACKING` | `PackingStartedEvent` | 패킹 스테이션 스캔 / WCS 분류 완료 | Fulfillment 또는 WCS 콜백 |
| `SHIPPED` | `ShipmentCompletedEvent` | 운송장 부착 완료 | Fulfillment 또는 WCS 콜백 |
| `CANCELLED` | (취소 요청) | `cancelShipmentOrder()` | OMS → Fulfillment/WCS (직접 호출) |

```
┌─────────────────┐                    ┌─────────────────────┐
│   Fulfillment   │   ApplicationEvent │        OMS          │
│ (INDIVIDUAL/    │                    │                     │
│  ZONE)          │                    │                     │
│  피킹 시작 ──────┼── publish ────────→│  RELEASED → PICKING │
│  패킹 시작 ──────┼── publish ────────→│  PICKING → PACKING  │
│  출하 완료 ──────┼── publish ────────→│  PACKING → SHIPPED  │
└─────────────────┘                    │                     │
                                       │                     │
┌─────────────────┐   HTTP 콜백 →      │                     │
│   WCS (외부)     │   ApplicationEvent │                     │
│ (DPS/DAS/소터)  │                    │                     │
│  피킹 시작 ──────┼── callback ───────→│  RELEASED → PICKING │
│  분류 완료 ──────┼── callback ───────→│  PICKING → PACKING  │
│  출하 완료 ──────┼── callback ───────→│  PACKING → SHIPPED  │
└─────────────────┘                    │                     │
                                       │    직접 호출 (예외)  │
  Fulfillment ◀────────────────────────│  cancelOrder()      │
  WCS API     ◀────────────────────────│  cancelWcsOrder()   │
                                       └─────────────────────┘
```

> **단방향 원칙**: Fulfillment/WCS → OMS는 이벤트로, OMS → Fulfillment/WCS는 서비스/API 호출로.
> 취소는 OMS가 직접 호출하는 유일한 예외이며, Fulfillment는 서비스 호출, WCS는 API 호출.

### 11.6 웨이브 확정 및 확정 취소

#### 11.6.1 웨이브 확정 프로세스

웨이브 확정 시 OMS는 `WaveReleasedEvent`를 발행하여 Fulfillment에 피킹 지시 생성을 트리거합니다.

**흐름:**

```
[사용자가 웨이브 확정 버튼 클릭]
    ↓
[OMS.releaseWave()]
    ├─ 1. 웨이브 상태 변경: CREATED → RELEASED
    ├─ 2. 주문 상태 변경: WAVED → RELEASED
    ├─ 3. 재고 할당 상태 변경: SOFT → HARD
    ├─ 4. WaveReleasedEvent 발행 (domainId, waveId, waveNo, pickType, pickMethod, orderCount)
    ↓
[Fulfillment.onWaveReleased() 자동 실행]
    ├─ 5. createPickingTasks() 호출
    │   ├─ pick_type=INDIVIDUAL → 주문별 피킹 지시 생성
    │   └─ pick_type=TOTAL → SKU+로케이션별 토털 피킹 지시 생성
    ├─ 6. PickingTask, PickingTaskItem 생성
    └─ 7. 주문 상태 변경: RELEASED → PICKING
```

**구현 코드:**

```java
// OmsTransactionService.java
public Map<String, Object> releaseWave(String id) {
    Long domainId = Domain.currentDomainId();
    ShipmentWave wave = this.findWave(domainId, id);

    // 상태 확인
    if (!ShipmentWave.STATUS_CREATED.equals(wave.getStatus())) {
        throw new RuntimeException("CREATED 상태의 웨이브만 확정할 수 있습니다");
    }

    // 1. 웨이브 상태 변경
    wave.setStatus(ShipmentWave.STATUS_RELEASED);
    this.queryManager.update(wave);

    // 2. 주문 상태 변경: WAVED → RELEASED
    String updOrdersSql = "UPDATE shipment_orders SET status = :newStatus, updated_at = now() " +
        "WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :oldStatus";
    this.queryManager.executeBySql(updOrdersSql, ValueUtil.newMap(
        "domainId,waveNo,oldStatus,newStatus",
        domainId, wave.getWaveNo(), ShipmentOrder.STATUS_WAVED, ShipmentOrder.STATUS_RELEASED
    ));

    // 3. 재고 할당 상태 변경: SOFT → HARD
    String updAllocSql = "UPDATE stock_allocations SET status = :newStatus, updated_at = now() " +
        "WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :oldStatus";
    this.queryManager.executeBySql(updAllocSql, ValueUtil.newMap(
        "domainId,waveNo,oldStatus,newStatus",
        domainId, wave.getWaveNo(), StockAllocation.STATUS_SOFT, StockAllocation.STATUS_HARD
    ));

    // 4. 주문 건수 조회
    Integer orderCount = this.queryManager.selectBySql(
        "SELECT COUNT(*) FROM shipment_orders WHERE domain_id = :domainId AND wave_no = :waveNo",
        ValueUtil.newMap("domainId,waveNo", domainId, wave.getWaveNo()), Integer.class
    );

    // ===== 5. 이벤트 발행: Fulfillment 모듈에 피킹 지시 생성 트리거 =====
    WaveReleasedEvent event = new WaveReleasedEvent(
        domainId, id, wave.getWaveNo(), wave.getPickType(),
        wave.getPickMethod(), orderCount != null ? orderCount : 0
    );
    this.eventPublisher.publishEvent(event);

    Map<String, Object> result = new HashMap<>();
    result.put("success", true);
    result.put("order_count", orderCount);
    return result;
}
```

#### 11.6.2 웨이브 확정 취소 프로세스

웨이브 확정 후 피킹이 시작되기 전이라면 확정을 취소할 수 있습니다.

**취소 가능 조건:**

| 조건 | 설명 |
|------|------|
| 웨이브 상태 | `RELEASED` (확정됨) |
| 피킹 지시 상태 | 모든 피킹 지시가 `WAIT` (대기 중) |
| 피킹 진행 여부 | 어떤 주문도 피킹이 시작되지 않음 (`IN_PROGRESS`, `COMPLETED` 없음) |

**취소 불가능한 경우:**

- 피킹 지시 중 하나라도 `IN_PROGRESS` 또는 `COMPLETED` 상태
- 웨이브 상태가 `RELEASED`가 아님 (`CREATED`, `COMPLETED`, `CANCELLED`)

**흐름:**

```
[사용자가 웨이브 확정 취소 버튼 클릭]
    ↓
[OMS.cancelWaveRelease()]
    ├─ 1. 웨이브 상태 확인 (RELEASED?)
    ├─ 2. 피킹 지시 상태 확인 (모두 WAIT?)
    │   └─ ❌ 하나라도 IN_PROGRESS/COMPLETED → Exception
    ├─ 3. 웨이브 상태 변경: RELEASED → CREATED
    ├─ 4. 주문 상태 변경: RELEASED → CREATED
    ├─ 5. 재고 할당 상태 변경: HARD → SOFT (선택적)
    ├─ 6. WaveCancelledEvent 발행 (domainId, waveId, waveNo)
    ↓
[Fulfillment.onWaveCancelled() 자동 실행]
    ├─ 7. 피킹 지시 상태 재확인 (WAIT만 삭제)
    ├─ 8. PickingTask, PickingTaskItem 삭제
    └─ 9. 주문 상태 변경: PICKING → CREATED (만약 상태가 변경되었다면 원복)
```

**구현 코드:**

```java
// OmsTransactionService.java
public Map<String, Object> cancelWaveRelease(String id) {
    Long domainId = Domain.currentDomainId();
    ShipmentWave wave = this.findWave(domainId, id);

    // 1. 웨이브 상태 확인
    if (!ShipmentWave.STATUS_RELEASED.equals(wave.getStatus())) {
        throw new RuntimeException("RELEASED 상태의 웨이브만 확정 취소할 수 있습니다");
    }

    // 2. Fulfillment 모듈에서 피킹 지시 상태 확인 (API 호출)
    // NOTE: 이벤트로 삭제 요청하기 전에 미리 확인
    String checkSql = "SELECT COUNT(*) FROM picking_tasks " +
        "WHERE domain_id = :domainId AND wave_no = :waveNo AND status != :waitStatus";
    Integer inProgressCount = this.queryManager.selectBySql(checkSql,
        ValueUtil.newMap("domainId,waveNo,waitStatus", domainId, wave.getWaveNo(), "WAIT"),
        Integer.class
    );

    if (inProgressCount != null && inProgressCount > 0) {
        throw new RuntimeException(
            "피킹이 이미 진행 중인 주문이 있어 웨이브 확정을 취소할 수 없습니다 (" + inProgressCount + "건)"
        );
    }

    // 3. 웨이브 상태 변경: RELEASED → CREATED
    wave.setStatus(ShipmentWave.STATUS_CREATED);
    this.queryManager.update(wave);

    // 4. 주문 상태 변경: RELEASED → CREATED
    String updOrdersSql = "UPDATE shipment_orders SET status = :newStatus, updated_at = now() " +
        "WHERE domain_id = :domainId AND wave_no = :waveNo AND status IN (:oldStatuses)";
    this.queryManager.executeBySql(updOrdersSql, ValueUtil.newMap(
        "domainId,waveNo,oldStatuses,newStatus",
        domainId, wave.getWaveNo(),
        Arrays.asList(ShipmentOrder.STATUS_RELEASED, ShipmentOrder.STATUS_PICKING),
        ShipmentOrder.STATUS_CREATED
    ));

    // 5. (선택) 재고 할당 상태 변경: HARD → SOFT
    // NOTE: 비즈니스 정책에 따라 생략 가능 (HARD 유지)
    // String updAllocSql = "UPDATE stock_allocations SET status = :newStatus ...";

    // ===== 6. 이벤트 발행: Fulfillment 모듈에 피킹 지시 삭제 트리거 =====
    WaveCancelledEvent event = new WaveCancelledEvent(
        domainId, id, wave.getWaveNo()
    );
    this.eventPublisher.publishEvent(event);

    Map<String, Object> result = new HashMap<>();
    result.put("success", true);
    result.put("wave_no", wave.getWaveNo());
    return result;
}
```

**Fulfillment 이벤트 리스너:**

```java
// FulfillmentEventListener.java
@EventListener
public void onWaveCancelled(WaveCancelledEvent event) {
    try {
        Long domainId = event.getDomainId();
        String waveNo = event.getWaveNo();

        // 1. 피킹 지시 조회
        String findSql = "SELECT * FROM picking_tasks " +
            "WHERE domain_id = :domainId AND wave_no = :waveNo";
        List<PickingTask> tasks = this.queryManager.selectListBySql(findSql,
            ValueUtil.newMap("domainId,waveNo", domainId, waveNo),
            PickingTask.class, 0, 0
        );

        if (tasks.isEmpty()) {
            System.out.println("[Fulfillment] 삭제할 피킹 지시가 없습니다: wave_no=" + waveNo);
            return;
        }

        // 2. WAIT 상태 확인 (안전장치)
        for (PickingTask task : tasks) {
            if (!PickingTask.STATUS_WAIT.equals(task.getStatus())) {
                throw new RuntimeException(
                    "피킹 지시 [" + task.getPickTaskNo() + "]가 WAIT 상태가 아니므로 삭제할 수 없습니다"
                );
            }
        }

        // 3. 피킹 지시 아이템 삭제
        String delItemsSql = "DELETE FROM picking_task_items " +
            "WHERE domain_id = :domainId AND pick_task_id IN (" +
            tasks.stream().map(t -> "'" + t.getId() + "'").collect(Collectors.joining(",")) +
            ")";
        this.queryManager.executeBySql(delItemsSql,
            ValueUtil.newMap("domainId", domainId)
        );

        // 4. 피킹 지시 삭제
        String delTasksSql = "DELETE FROM picking_tasks " +
            "WHERE domain_id = :domainId AND wave_no = :waveNo AND status = :status";
        this.queryManager.executeBySql(delTasksSql,
            ValueUtil.newMap("domainId,waveNo,status", domainId, waveNo, PickingTask.STATUS_WAIT)
        );

        System.out.println(String.format(
            "[Fulfillment] 웨이브 확정 취소 완료 - wave_no: %s, 삭제된 피킹 지시: %d건",
            waveNo, tasks.size()
        ));

    } catch (Exception e) {
        System.err.println(String.format(
            "[Fulfillment] 웨이브 확정 취소 실패 - wave_no: %s, error: %s",
            event.getWaveNo(), e.getMessage()
        ));
        e.printStackTrace();
        // 에러를 상위로 전파하지 않음 (OMS 트랜잭션 롤백 방지)
    }
}
```

#### 11.6.3 상태 변경 요약

| 대상 | 확정 시 | 확정 취소 시 |
|------|---------|-------------|
| 웨이브 | CREATED → RELEASED | RELEASED → CREATED |
| 주문 | WAVED → RELEASED | RELEASED → WAVED |
| 재고 할당 | SOFT → HARD | HARD → SOFT (선택적) |
| 피킹 지시 | ✅ 생성 (WAIT) | ❌ 삭제 |
| 피킹 아이템 | ✅ 생성 (WAIT) | ❌ 삭제 |

---

## 12. 커스텀 서비스 (DIY)

### 12.1 개요

모든 트랜잭션 API는 **전 처리(pre) → 본 로직 → 후 처리(post)** 패턴으로 실행됩니다.
화주사·창고별로 커스터마이징이 필요한 경우, `ICustomService`를 통해 등록된 DIY 서비스가 자동 호출됩니다.

```
[API 호출]
    ↓
[1. 커스텀 서비스 전 처리 (pre)]     ← customSvc.doCustomService(domainId, "diy-oms-pre-xxx", params)
    ↓
[2. 본 로직 실행]                     ← omsTransactionService.xxx()
    ↓
[3. 커스텀 서비스 후 처리 (post)]    ← customSvc.doCustomService(domainId, "diy-oms-post-xxx", params)
    ↓
[응답 반환]
```

> 커스텀 서비스가 등록되지 않은 경우 조용히 스킵됩니다 (에러 없음).

### 12.2 네이밍 규칙

```
diy-oms-{pre|post}-{method-name}
```

| 구성 요소 | 규칙 | 예시 |
|----------|------|------|
| 접두사 | `diy-` (고정) | `diy-` |
| 모듈명 | `oms-` (고정) | `oms-` |
| 시점 | `pre-` (전 처리) / `post-` (후 처리) | `pre-`, `post-` |
| 메서드명 | snake-case, API 메서드명 기준 | `import-shipment-orders` |

### 12.3 파라미터 규칙

| 시점 | 파라미터 구성 | 설명 |
|------|-------------|------|
| **전 처리 (pre)** | API로 넘어온 모든 파라미터를 `Map<String, Object>`로 전달 | 데이터 검증, 보정, 차단 가능 |
| **후 처리 (post)** | 전 처리 파라미터 + 트랜잭션 서비스 실행 결과를 `Map`에 추가 | 결과 기반 후속 처리 가능 |

### 12.4 트랜잭션 API별 커스텀 서비스 목록

#### 12.4.1 주문 임포트

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_IMPORT_SHIPMENT` | `diy-oms-pre-import-shipment-orders` | 전 | `{biz_type, list}` |
| `TRX_OMS_POST_IMPORT_SHIPMENT` | `diy-oms-post-import-shipment-orders` | 후 | `{biz_type, list, shipmentOrders}` |

```java
// 전 처리: 임포트 데이터 검증/보정
Map<String, Object> preParams = ValueUtil.newMap("biz_type,list", bizType, importList);
this.customSvc.doCustomService(domainId, TRX_OMS_PRE_IMPORT_SHIPMENT, preParams);

// 본 로직
List<ShipmentOrder> result = this.omsTrxService.importShipmentOrders(importList, bizType);

// 후 처리: 임포트 결과 기반 후속 처리 (외부 시스템 알림 등)
preParams.put("shipmentOrders", result);
this.customSvc.doCustomService(domainId, TRX_OMS_POST_IMPORT_SHIPMENT, preParams);
```

#### 12.4.2 주문 확정

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_CONFIRM_SHIPMENT` | `diy-oms-pre-confirm-shipment-order` | 전 | `{shipmentOrder}` |
| `TRX_OMS_POST_CONFIRM_SHIPMENT` | `diy-oms-post-confirm-shipment-order` | 후 | `{shipmentOrder, result}` |

#### 12.4.3 재고 할당

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_ALLOCATE_SHIPMENT` | `diy-oms-pre-allocate-shipment-order` | 전 | `{shipmentOrder}` |
| `TRX_OMS_POST_ALLOCATE_SHIPMENT` | `diy-oms-post-allocate-shipment-order` | 후 | `{shipmentOrder, allocations}` |

#### 12.4.4 할당 해제

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_DEALLOCATE_SHIPMENT` | `diy-oms-pre-deallocate-shipment-order` | 전 | `{shipmentOrder}` |
| `TRX_OMS_POST_DEALLOCATE_SHIPMENT` | `diy-oms-post-deallocate-shipment-order` | 후 | `{shipmentOrder, result}` |

#### 12.4.5 확정+할당 (원클릭)

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_CONFIRM_AND_ALLOCATE` | `diy-oms-pre-confirm-and-allocate` | 전 | `{shipmentOrder}` |
| `TRX_OMS_POST_CONFIRM_AND_ALLOCATE` | `diy-oms-post-confirm-and-allocate` | 후 | `{shipmentOrder, allocations}` |

#### 12.4.6 웨이브 생성

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_CREATE_WAVE` | `diy-oms-pre-create-wave` | 전 | `{orders, pickType, carrierCd}` |
| `TRX_OMS_POST_CREATE_WAVE` | `diy-oms-post-create-wave` | 후 | `{orders, pickType, carrierCd, wave}` |

#### 12.4.7 웨이브 확정 (Fulfillment/WCS 인계)

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_RELEASE_WAVE` | `diy-oms-pre-release-wave` | 전 | `{wave, orders, pickMethod}` |
| `TRX_OMS_POST_RELEASE_WAVE` | `diy-oms-post-release-wave` | 후 | `{wave, orders, pickMethod, result}` |

#### 12.4.8 주문 취소

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_CANCEL_SHIPMENT` | `diy-oms-pre-cancel-shipment-order` | 전 | `{shipmentOrder}` |
| `TRX_OMS_POST_CANCEL_SHIPMENT` | `diy-oms-post-cancel-shipment-order` | 후 | `{shipmentOrder, result}` |

#### 12.4.9 주문 마감

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_CLOSE_SHIPMENT` | `diy-oms-pre-close-shipment-order` | 전 | `{shipmentOrder}` |
| `TRX_OMS_POST_CLOSE_SHIPMENT` | `diy-oms-post-close-shipment-order` | 후 | `{shipmentOrder, result}` |

#### 12.4.10 보충 지시

| 상수명 | 서비스명 | 시점 | 파라미터 |
|--------|---------|------|----------|
| `TRX_OMS_PRE_CREATE_REPLENISH` | `diy-oms-pre-create-replenish-order` | 전 | `{wave, replenishItems}` |
| `TRX_OMS_POST_CREATE_REPLENISH` | `diy-oms-post-create-replenish-order` | 후 | `{wave, replenishItems, replenishOrder}` |

### 12.5 상수 정의 클래스

```java
/**
 * OMS 트랜잭션 커스텀 서비스 상수
 * 위치: operato.wms.oms.WmsOmsConstants
 */
public class WmsOmsConstants {

    // === 주문 임포트 ===
    public static final String TRX_OMS_PRE_IMPORT_SHIPMENT = "diy-oms-pre-import-shipment-orders";
    public static final String TRX_OMS_POST_IMPORT_SHIPMENT = "diy-oms-post-import-shipment-orders";

    // === 주문 확정 ===
    public static final String TRX_OMS_PRE_CONFIRM_SHIPMENT = "diy-oms-pre-confirm-shipment-order";
    public static final String TRX_OMS_POST_CONFIRM_SHIPMENT = "diy-oms-post-confirm-shipment-order";

    // === 재고 할당 ===
    public static final String TRX_OMS_PRE_ALLOCATE_SHIPMENT = "diy-oms-pre-allocate-shipment-order";
    public static final String TRX_OMS_POST_ALLOCATE_SHIPMENT = "diy-oms-post-allocate-shipment-order";

    // === 할당 해제 ===
    public static final String TRX_OMS_PRE_DEALLOCATE_SHIPMENT = "diy-oms-pre-deallocate-shipment-order";
    public static final String TRX_OMS_POST_DEALLOCATE_SHIPMENT = "diy-oms-post-deallocate-shipment-order";

    // === 확정+할당 (원클릭) ===
    public static final String TRX_OMS_PRE_CONFIRM_AND_ALLOCATE = "diy-oms-pre-confirm-and-allocate";
    public static final String TRX_OMS_POST_CONFIRM_AND_ALLOCATE = "diy-oms-post-confirm-and-allocate";

    // === 웨이브 생성 ===
    public static final String TRX_OMS_PRE_CREATE_WAVE = "diy-oms-pre-create-wave";
    public static final String TRX_OMS_POST_CREATE_WAVE = "diy-oms-post-create-wave";

    // === 웨이브 확정 (인계) ===
    public static final String TRX_OMS_PRE_RELEASE_WAVE = "diy-oms-pre-release-wave";
    public static final String TRX_OMS_POST_RELEASE_WAVE = "diy-oms-post-release-wave";

    // === 주문 취소 ===
    public static final String TRX_OMS_PRE_CANCEL_SHIPMENT = "diy-oms-pre-cancel-shipment-order";
    public static final String TRX_OMS_POST_CANCEL_SHIPMENT = "diy-oms-post-cancel-shipment-order";

    // === 주문 마감 ===
    public static final String TRX_OMS_PRE_CLOSE_SHIPMENT = "diy-oms-pre-close-shipment-order";
    public static final String TRX_OMS_POST_CLOSE_SHIPMENT = "diy-oms-post-close-shipment-order";

    // === 보충 지시 ===
    public static final String TRX_OMS_PRE_CREATE_REPLENISH = "diy-oms-pre-create-replenish-order";
    public static final String TRX_OMS_POST_CREATE_REPLENISH = "diy-oms-post-create-replenish-order";
}
```

### 12.6 구현 패턴 (OmsTransactionController 예시)

```java
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/oms_trx")
@ServiceDesc(description = "OMS Transaction Service API")
public class OmsTransactionController extends AbstractRestService {

    @Autowired
    private OmsTransactionService omsTrxService;

    @Autowired
    private ICustomService customSvc;

    /**
     * 주문 확정 처리 (REGISTERED → CONFIRMED)
     */
    @RequestMapping(value = "shipment_orders/{id}/confirm", method = RequestMethod.POST)
    @ApiDesc(description = "Confirm Shipment Order")
    public BaseResponse confirmShipmentOrder(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        // 1. 조회
        ShipmentOrder shipmentOrder = this.queryManager.select(ShipmentOrder.class, id);

        // 2. 커스텀 서비스 - 전 처리
        Map<String, Object> params = ValueUtil.newMap("shipmentOrder", shipmentOrder);
        this.customSvc.doCustomService(domainId,
            WmsOmsConstants.TRX_OMS_PRE_CONFIRM_SHIPMENT, params);

        // 3. 본 로직 실행
        ShipmentOrder result = this.omsTrxService.confirmShipmentOrder(shipmentOrder);

        // 4. 커스텀 서비스 - 후 처리 (전 처리 파라미터 + 결과)
        params.put("result", result);
        this.customSvc.doCustomService(domainId,
            WmsOmsConstants.TRX_OMS_POST_CONFIRM_SHIPMENT, params);

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 재고 할당 처리 (CONFIRMED → ALLOCATED)
     */
    @RequestMapping(value = "shipment_orders/{id}/allocate", method = RequestMethod.POST)
    @ApiDesc(description = "Allocate Shipment Order")
    public BaseResponse allocateShipmentOrder(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        // 1. 조회
        ShipmentOrder shipmentOrder = this.queryManager.select(ShipmentOrder.class, id);

        // 2. 커스텀 서비스 - 전 처리
        Map<String, Object> params = ValueUtil.newMap("shipmentOrder", shipmentOrder);
        this.customSvc.doCustomService(domainId,
            WmsOmsConstants.TRX_OMS_PRE_ALLOCATE_SHIPMENT, params);

        // 3. 본 로직 실행
        List<StockAllocation> allocations =
            this.omsTrxService.allocateShipmentOrder(shipmentOrder);

        // 4. 커스텀 서비스 - 후 처리 (전 처리 파라미터 + 할당 결과)
        params.put("allocations", allocations);
        this.customSvc.doCustomService(domainId,
            WmsOmsConstants.TRX_OMS_POST_ALLOCATE_SHIPMENT, params);

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 웨이브 확정 → Fulfillment/WCS 인계
     */
    @RequestMapping(value = "waves/{id}/release", method = RequestMethod.POST)
    @ApiDesc(description = "Release Wave")
    public BaseResponse releaseWave(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        // 1. 조회
        ShipmentWave wave = this.queryManager.select(ShipmentWave.class, id);
        List<ShipmentOrder> orders = this.omsTrxService.findOrdersByWave(id);

        // 2. 커스텀 서비스 - 전 처리
        Map<String, Object> params = ValueUtil.newMap(
            "wave,orders,pickMethod", wave, orders, wave.getPickMethod());
        this.customSvc.doCustomService(domainId,
            WmsOmsConstants.TRX_OMS_PRE_RELEASE_WAVE, params);

        // 3. 본 로직 실행 (pick_method별 Fulfillment/WCS 분기)
        Object result = this.omsTrxService.releaseWave(wave, orders);

        // 4. 커스텀 서비스 - 후 처리
        params.put("result", result);
        this.customSvc.doCustomService(domainId,
            WmsOmsConstants.TRX_OMS_POST_RELEASE_WAVE, params);

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }
}
```

### 12.7 커스텀 서비스 활용 예시

#### 특정 화주사 주문 확정 시 ERP 연동

```java
/**
 * 커스텀 서비스 구현 예시
 * custom_services 테이블에 등록:
 *   name: diy-oms-post-confirm-shipment-order
 *   service_type: GROOVY (또는 JAVA_CLASS)
 */
// params: {shipmentOrder: ShipmentOrder, result: ShipmentOrder}
def shipmentOrder = params.get("shipmentOrder")

// 특정 화주사인 경우 ERP에 출고 확정 통보
if (shipmentOrder.comCd == "COMPANY_A") {
    def erpService = xyz.elidom.sys.util.BeanUtil.get("erpApiService")
    erpService.notifyShipmentConfirmed(shipmentOrder)
}
```

#### 특정 채널 주문 임포트 시 자동 우선순위 설정

```java
/**
 * name: diy-oms-pre-import-shipment-orders
 */
// params: {biz_type: String, list: List<ImportShipmentOrder>}
def list = params.get("list")

list.each { item ->
    // 쿠팡 로켓배송은 자동 긴급 처리
    if (item.channelCd == "COUPANG" && item.carrierServiceType == "DAWN") {
        item.priorityCd = "URGENT"
    }
}
```

---

## 기존 outbound 모듈과의 대비

| 항목 | 기존 outbound | 신규 OMS |
|------|-------------|----------|
| 주문 테이블 | `release_orders` | `shipment_orders` |
| 주문 상세 | `release_order_items` | `shipment_order_items` |
| 웨이브 | `waves` | `shipment_waves` |
| 배송 정보 | `delivery_infos` | `shipment_deliveries` |
| 보충 지시 | `supply_orders/items` | `replenish_orders/items` |
| 재고 할당 | (없음) | `stock_allocations` ← **신규** |
| 외부 연동 | (없음) | `ref_order_no`, `if_status` ← **신규** |
| 우선순위 | (없음) | `priority_cd`, `ship_by_date`, `cutoff_time` ← **신규** |
| 부족 관리 | (없음) | `short_qty`, `BACK_ORDER` 상태 ← **신규** |
| 피킹 지시 | `picking_orders/items` | → **fulfillment 모듈로 이관** |
