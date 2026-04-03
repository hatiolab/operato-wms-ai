# Fulfillment 화면 설계

> 작성일: 2026-03-28
> 기준: Things Factory 프론트엔드 프레임워크
> 참조: `docs/design/fulfillment-table-design.md`

---

## 목차

1. [개요](#1-개요)
2. [화면 구성 개요](#2-화면-구성-개요)
3. [화면별 상세 설계](#3-화면별-상세-설계)
4. [UI/UX 컨셉](#4-uiux-컨셉)
5. [기술 스택](#5-기술-스택)
6. [구현 우선순위](#6-구현-우선순위)
7. [구현 현황](#7-구현-현황)

---

## 1. 개요

### 1.1 목적

Fulfillment 모듈의 **피킹·검수/포장·출하** 전체 프로세스를 효율적으로 관리할 수 있는 화면을 설계합니다.
OMS 모듈이 확정한 웨이브를 인계받아 **"어떻게, 어디서, 누가"** 작업할 것인지를 실행하고 결과를 기록하는 **실행 계층**을 다룹니다.

### 1.2 설계 원칙

1. **프로세스 중심 설계**: 피킹 → 검수/포장 → 라벨 → 출하 흐름에 따른 직관적 구성
2. **상태 시각화**: PickingTask 4개, PackingOrder 7개, PackingBox 3개 상태를 색상으로 명확히 구분
3. **작업자 효율**: 포장 스테이션 관리, 도크 출하 모니터링
4. **실시간 모니터링**: 피킹 부족, 검수 실패, 출하 지연 알림으로 선제 대응
5. **메타데이터 기반**: Things Factory MetaGrist 활용

### 1.3 대상 사용자

| 사용자 | 역할 | 주요 화면 |
|--------|------|----------|
| 풀필먼트 관리자 | 피킹·포장·출하 전반 관리 | 대시보드, 진행 현황 |
| 피킹 관리자 | 피킹 지시 확인, 진행 모니터링 | 피킹 목록/상세 |
| 포장 관리자 | 검수/포장/라벨/출하 관리 | 포장 목록/상세 |
| 현장 작업자 | PDA/RF를 통한 피킹·포장 실행 | (PDA 화면 — 별도 설계) |

---

## 2. 화면 구성 개요

### 2.1 화면 맵

```
fulfillment-home (풀필먼트 대시보드)
├─ 피킹 관리
│  ├─ picking-task-list (피킹 지시 목록)
│  └─ picking-task-detail (피킹 지시 상세 — 팝업)
├─ 검수/포장/출하 관리
│  ├─ packing-order-list (검수/포장/출하 지시 목록)
│  └─ packing-order-detail (검수/포장/출하 상세 — 팝업)
└─ 모니터링
   └─ fulfillment-progress (풀필먼트 진행 현황)
```

### 2.2 프로세스 흐름과 화면 매핑

| 프로세스 단계 | 화면 | 사용자 |
|--------------|------|--------|
| 1. 피킹 지시 확인 | picking-task-list | 피킹 관리자 |
| 2. 피킹 실행/완료 | picking-task-detail, fulfillment-picking-pc | 피킹 관리자/작업자 |
| 2-1. 포장 지시 자동 생성 | (백엔드 자동) | — |
| 2-2. 피킹 완료 후 취소 | picking-task-list, picking-task-detail | 피킹 관리자 |
| 3. 검수/포장 실행 | packing-order-list, fulfillment-packing-pc | 포장 관리자/작업자 |
| 4. 라벨 출력/매니페스트 | packing-order-detail | 포장 관리자 |
| 5. 출하 확정 | packing-order-list (일괄), packing-order-detail (개별) | 풀필먼트 관리자 |
| 6. 전체 진행 현황 파악 | fulfillment-progress, fulfillment-home | 전체 |

#### 2.2.1 피킹 완료 → 포장 지시 자동 생성

피킹 지시가 **COMPLETED** 상태로 전환될 때, 해당 웨이브의 `insp_flag`(검수/포장 수행 여부)에 따라 포장 지시를 자동 생성한다.

```
피킹 완료 API 호출 (POST /rest/ful_trx/picking_tasks/{id}/complete)
  │
  ├─ 1. PickingTask → COMPLETED (실적 수량 집계)
  │
  ├─ 2. shipment_waves.insp_flag 조회
  │
  ├─ insp_flag = true
  │   ├─ INDIVIDUAL 피킹 → PackingOrder 1건 생성 (주문 1:1)
  │   └─ TOTAL 피킹     → PackingOrder N건 생성 (웨이브 내 주문별 각 1건)
  │   └─ ShipmentOrder.status → PACKING
  │
  └─ insp_flag = false
      └─ 포장 지시 미생성 (피킹 완료로 종결)
```

**응답 예시** (`insp_flag = true`, INDIVIDUAL 피킹):
```json
{
  "success": true,
  "pick_task_no": "PICK-260401-0001",
  "status": "COMPLETED",
  "result_total": 5.0,
  "short_total": 0.0,
  "packing_created": true,
  "pack_order_no": "PACK-260401-0001",
  "pack_item_count": 3
}
```

**응답 예시** (`insp_flag = false`):
```json
{
  "success": true,
  "pick_task_no": "PICK-260401-0002",
  "status": "COMPLETED",
  "packing_created": false
}
```

> **구현 위치**: `FulfillmentTransactionService.completePickingTaskWithPacking()` — 피킹 완료와 포장 지시 생성을 하나의 트랜잭션으로 처리

#### 2.2.2 피킹 완료 후 취소

피킹 지시가 **COMPLETED** 상태일 때, 일정 조건을 만족하면 취소할 수 있다.

**취소 가능 조건:**
1. 해당 웨이브가 **COMPLETED** 상태가 아닐 것
2. 관련 포장 지시가 모두 **CREATED** 상태일 것 (검수/포장이 시작되지 않은 경우만)

```
피킹 취소 API 호출 (POST /rest/ful_trx/picking_tasks/{id}/cancel)
  │
  ├─ 1. PickingTask.status == COMPLETED 확인
  │
  ├─ 2. ShipmentWave.status != COMPLETED 확인
  │     └─ 실패 시: "웨이브가 이미 완료되어 취소 불가" 예외
  │
  ├─ 3. 관련 PackingOrder 상태 확인 (pick_task_no로 조회)
  │     └─ 하나라도 IN_PROGRESS 이후 상태 → "포장이 이미 처리 중이므로 취소 불가" 예외
  │
  ├─ 4. 포장 지시 삭제
  │     ├─ packing_order_items 삭제
  │     └─ packing_orders 삭제
  │
  ├─ 5. 피킹 지시 원복
  │     ├─ picking_task_items: PICKED/SHORT → CANCEL (pick_qty, short_qty 초기화)
  │     └─ picking_tasks: COMPLETED → CANCELLED (실적 수량 초기화)
  │
  └─ 6. 출하 주문 상태 원복
        ├─ INDIVIDUAL: 해당 주문 PACKING/PICKING → RELEASED
        └─ TOTAL: 웨이브 내 모든 주문 PACKING/PICKING → RELEASED
```

**응답 예시** (취소 성공):
```json
{
  "success": true,
  "pick_task_no": "PICK-260401-0001",
  "cancelled_pack_order_count": 1,
  "cancelled_pack_item_count": 3,
  "reverted_order_count": 1
}
```

**에러 응답 예시** (웨이브 완료):
```
"웨이브 [W-260401-001]가 이미 완료되어 피킹을 취소할 수 없습니다"
```

**에러 응답 예시** (포장 처리 중):
```
"포장 지시 [PACK-260401-0001]가 이미 처리 중이므로 피킹을 취소할 수 없습니다 (현재 상태: IN_PROGRESS)"
```

> **구현 위치**: `FulfillmentTransactionService.cancelCompletedPickingTask()` — 포장 지시 삭제 + 피킹 취소 + 주문 원복을 하나의 트랜잭션으로 처리
> **참고**: CREATED/IN_PROGRESS 상태의 피킹 취소는 기존 `FulfillmentPickingService.cancelPickingTask()`에서 처리. Controller에서 상태에 따라 자동 분기.

### 2.3 상태 전이 및 색상 매핑

#### 2.3.1 피킹 지시 (PickingTask) 상태

| 상태 | 코드 | 색상 | HEX | 설명 |
|------|------|------|-----|------|
| 생성 | `CREATED` | 보라색 | `#7B1FA2` | 피킹 지시 생성, 작업 대기 |
| 진행 중 | `IN_PROGRESS` | 주황색 | `#FF9800` | 피킹 작업 진행 중 (PDA 스캔 시작) |
| 완료 | `COMPLETED` | 녹색 | `#4CAF50` | 전체 피킹 완료 |
| 취소 | `CANCELLED` | 빨간색 | `#D32F2F` | 피킹 지시 취소 |

```
CREATED ─→ IN_PROGRESS ─→ COMPLETED
   │              │
   └──────────────┴── CANCELLED (어느 상태에서든)
```

#### 2.3.2 검수/포장/출하 (PackingOrder) 상태

| 상태 | 코드 | 색상 | HEX | 설명 |
|------|------|------|-----|------|
| 생성 | `CREATED` | 보라색 | `#7B1FA2` | 포장 지시 생성, 작업 대기 |
| 진행 중 | `IN_PROGRESS` | 주황색 | `#FF9800` | 검수/포장 작업 진행 중 |
| 완료 | `COMPLETED` | 파란색 | `#2196F3` | 검수/포장 완료, 출하 대기 |
| 라벨 출력 | `LABEL_PRINTED` | 남색 | `#1565C0` | 운송장/라벨 출력 완료 |
| 적하 목록 | `MANIFESTED` | 인디고 | `#303F9F` | 적하 목록(매니페스트) 전송 완료 |
| 출하 완료 | `SHIPPED` | 녹색 | `#4CAF50` | 최종 출하 확정 (차량 상차 완료) |
| 취소 | `CANCELLED` | 빨간색 | `#D32F2F` | 취소 (포장 전 취소 또는 출하 후 취소) |

```
CREATED → IN_PROGRESS → COMPLETED → LABEL_PRINTED → MANIFESTED → SHIPPED
                                                                     ↑
                                               (매니페스트 생략 가능) ─┘
CANCELLED (어느 상태에서든)
```

#### 2.3.3 포장 박스 (PackingBox) 상태

| 상태 | 코드 | 색상 | HEX | 설명 |
|------|------|------|-----|------|
| 열림 | `OPEN` | 주황색 | `#FF9800` | 포장 진행 중 (아이템 투입 가능) |
| 닫힘 | `CLOSED` | 파란색 | `#2196F3` | 포장 완료 (봉함, 중량 확정) |
| 출하 | `SHIPPED` | 녹색 | `#4CAF50` | 출하 확정 |

### 2.4 라우트 등록

**route.js 등록 경로**:

| 경로 | 화면 파일 | 메뉴명 |
|------|----------|--------|
| `/fulfillment-home` | `pages/fulfillment/fulfillment-home.js` | 풀필먼트 대시보드 |
| `/picking-task-list` | `pages/fulfillment/picking-task-list.js` | 피킹 지시 목록 |
| `/packing-order-list` | `pages/fulfillment/packing-order-list.js` | 검수/포장/출하 목록 |
| `/fulfillment-progress` | `pages/fulfillment/fulfillment-progress.js` | 풀필먼트 진행 현황 |

> **팝업 화면** (`picking-task-detail`, `packing-order-detail`)은 라우트에 등록하지 않고, 목록 화면에서 `UiUtil.openPopupByElement()`로 호출합니다.

---

## 3. 화면별 상세 설계

### 3.1 풀필먼트 대시보드 (fulfillment-home)

#### 목적
오늘의 피킹·포장·출하 현황을 한눈에 파악하고 주요 기능에 빠르게 접근

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 풀필먼트 대시보드                                    2026-03-28  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ① 피킹 진행 현황 (상태별 카드)                                     │
│  ┌──────────┬──────────┬──────────┬──────────┐                      │
│  │ 🟣 생성   │ 🟠 진행중 │ 🟢 완료   │ 🔴 취소  │                      │
│  │ CREATED  │IN_PROGRE │COMPLETED │CANCELLED │                      │
│  │   25건   │   18건   │   45건   │    2건   │                      │
│  └──────────┴──────────┴──────────┴──────────┘                      │
│                                                                      │
│  ② 포장/출하 진행 현황 (상태별 카드)                                │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐  │
│  │🟣생성  │🟠진행  │🔵완료  │🔷라벨  │🟦적하  │🟢출하  │🔴취소  │  │
│  │CREATED │IN_PROG │COMPL   │LABEL_P │MANIF   │SHIPPED │CANCEL  │  │
│  │  12건  │   8건  │  15건  │   5건  │   3건  │  30건  │   1건  │  │
│  └────────┴────────┴────────┴────────┴────────┴────────┴────────┘  │
│                                                                      │
│  ③ 피킹유형별 현황 (도넛)        ④ 시간대별 출하량 (막대)          │
│  ┌────────────────────────┐   ┌──────────────────────────────┐     │
│  │     ◐ 개별: 60%        │   │  09:  ██████████      15건   │     │
│  │     ◑ 토탈: 30%        │   │  10:  ████████████████ 22건  │     │
│  │     ◒ 존:   10%        │   │  11:  ██████████████   18건  │     │
│  └────────────────────────┘   │  12:  ████             8건   │     │
│                                │  13:  ██████████       12건  │     │
│  ⑤ 작업자 실적 (수평 막대)     └──────────────────────────────┘     │
│  ┌──────────────────────────────┐                                   │
│  │ 김작업:  ████████████  45건  │                                   │
│  │ 이피킹:  ██████████    38건  │                                   │
│  │ 박포장:  ████████      32건  │                                   │
│  │ 최출하:  ██████        25건  │                                   │
│  └──────────────────────────────┘                                   │
│                                                                      │
│  ⑥ 주의 항목 (알림)                                                │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ 🚨 피킹 부족 발생: 3건 (SHORT 상태 항목 존재)             │      │
│  │ ⚠️ 검수 실패: 1건 (FAIL — 수량 불일치)                    │      │
│  │ ⏰ 출하 지연: 5건 (포장 완료 후 2시간 이상 미출하)         │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ⑦ 바로가기                                                        │
│  ┌──────────┬──────────┬──────────┬──────────┐                     │
│  │ 📦 피킹   │ 📋 포장  │ 📊 진행  │ 🏠 OMS  │                     │
│  │   목록    │   목록   │   현황   │ 대시보드 │                     │
│  └──────────┴──────────┴──────────┴──────────┘                     │
│                                                                      │
│  ⑧ 최근 피킹/포장 내역                                             │
│  ┌────────────┬──────────┬──────┬──────┬──────┬──────┬──────┐     │
│  │ 피킹번호    │웨이브번호 │피킹유형│작업자│계획  │실적  │ 상태 │     │
│  ├────────────┼──────────┼──────┼──────┼──────┼──────┼──────┤     │
│  │PICK-001    │WAVE-001  │TOTAL │김작업│ 120  │  85  │ 진행 │     │
│  │PICK-002    │WAVE-001  │INDIV │이피킹│   3  │   3  │ 완료 │     │
│  └────────────┴──────────┴──────┴──────┴──────┴──────┴──────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### ① 피킹 진행 현황 카드

| 상태 | 코드 | 색상 | border-left | 클릭 시 동작 |
|------|------|------|-------------|-------------|
| 생성 | CREATED | `#7B1FA2` | 4px solid | 피킹 목록(status=CREATED, order_date=today) |
| 진행중 | IN_PROGRESS | `#FF9800` | 4px solid | 피킹 목록(status=IN_PROGRESS, order_date=today) |
| 완료 | COMPLETED | `#4CAF50` | 4px solid | 피킹 목록(status=COMPLETED, order_date=today) |
| 취소 | CANCELLED | `#D32F2F` | 4px solid | 피킹 목록(status=CANCELLED, order_date=today) |

#### ② 포장/출하 진행 현황 카드

| 상태 | 코드 | 색상 | border-left | 클릭 시 동작 |
|------|------|------|-------------|-------------|
| 생성 | CREATED | `#7B1FA2` | 4px solid | 포장 목록(status=CREATED) |
| 진행중 | IN_PROGRESS | `#FF9800` | 4px solid | 포장 목록(status=IN_PROGRESS) |
| 완료 | COMPLETED | `#2196F3` | 4px solid | 포장 목록(status=COMPLETED) |
| 라벨 | LABEL_PRINTED | `#1565C0` | 4px solid | 포장 목록(status=LABEL_PRINTED) |
| 적하 | MANIFESTED | `#303F9F` | 4px solid | 포장 목록(status=MANIFESTED) |
| 출하 | SHIPPED | `#4CAF50` | 4px solid | 포장 목록(status=SHIPPED) |
| 취소 | CANCELLED | `#D32F2F` | 4px solid | 포장 목록(status=CANCELLED) |

#### ③ 피킹유형별 현황 (도넛 차트)

```javascript
{
  type: 'doughnut',
  data: {
    labels: ['개별(INDIVIDUAL)', '토탈(TOTAL)', '존(ZONE)'],
    datasets: [{
      data: [pickTypeStats.INDIVIDUAL, pickTypeStats.TOTAL, pickTypeStats.ZONE],
      backgroundColor: ['#03A9F4', '#1976D2', '#7B1FA2']
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw}건 (${ctx.formattedValue}%)`
        }
      }
    }
  }
}
```

#### ④ 시간대별 출하량 (수직 막대 차트)

```javascript
{
  type: 'bar',
  data: {
    labels: hourlyStats.map(h => `${h.hour}시`),
    datasets: [{
      label: '출하 건수',
      data: hourlyStats.map(h => h.count),
      backgroundColor: '#4CAF50',
      borderRadius: 6
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 5 } }
    }
  }
}
```

#### ⑤ 작업자 실적 (수평 막대 차트)

```javascript
{
  type: 'bar',
  data: {
    labels: workerStats.map(w => w.worker_nm),
    datasets: [{
      label: '완료 건수',
      data: workerStats.map(w => w.completed_count),
      backgroundColor: '#42A5F5',
      borderRadius: 6
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    scales: {
      x: { beginAtZero: true, ticks: { callback: v => `${v}건` } }
    }
  }
}
```

#### ⑥ 알림 섹션

| 타입 | 아이콘 | 배경색 | border-left | 조건 |
|------|--------|--------|-------------|------|
| 긴급 (danger) | 🚨 | `#FFEBEE` | `#F44336` | SHORT 상태 피킹 항목 존재 |
| 경고 (warning) | ⚠️ | `#FFF3E0` | `#FF9800` | 검수 FAIL 존재 |
| 주의 (info) | ⏰ | `#E3F2FD` | `#2196F3` | 포장 완료 후 2시간 이상 미출하 |

#### ⑦ 바로가기 버튼

| 버튼 | 아이콘 | 동작 | 페이지 |
|------|--------|------|--------|
| 피킹 목록 | 📦 | 페이지 이동 | picking-task-list |
| 포장 목록 | 📋 | 페이지 이동 | packing-order-list |
| 진행 현황 | 📊 | 페이지 이동 | fulfillment-progress |
| OMS 대시보드 | 🏠 | 페이지 이동 | oms-home |

#### ⑧ 최근 피킹/포장 내역 테이블

| 컬럼 | 필드 | 너비 | 설명 |
|------|------|------|------|
| 피킹번호 | `pick_task_no` | 130px | 클릭 시 상세 팝업 |
| 웨이브 | `wave_no` | 130px | |
| 피킹유형 | `pick_type` | 80px | 배지 렌더링 |
| 작업자 | `worker_id` | 80px | |
| 계획 | `plan_total` | 60px | 우측 정렬 |
| 실적 | `result_total` | 60px | 우측 정렬 |
| 상태 | `status` | 80px | 상태 배지 |

#### 백엔드 API

**1. 피킹 상태별 건수 조회**
```
GET /rest/ful_trx/dashboard/picking_status
Query: order_date (optional, default: today)
```

Response:
```json
{
  "CREATED": 25,
  "IN_PROGRESS": 18,
  "COMPLETED": 45,
  "CANCELLED": 2
}
```

**2. 포장 상태별 건수 조회**
```
GET /rest/ful_trx/dashboard/packing_status
Query: order_date (optional, default: today)
```

Response:
```json
{
  "CREATED": 12,
  "IN_PROGRESS": 8,
  "COMPLETED": 15,
  "LABEL_PRINTED": 5,
  "MANIFESTED": 3,
  "SHIPPED": 30,
  "CANCELLED": 1
}
```

**3. 출하 현황**
```
GET /rest/ful_trx/dashboard/shipping_status
Query: order_date (optional, default: today)
```

Response:
```json
{
  "total_shipped": 30,
  "total_box": 42,
  "total_wt": 186.5,
  "pending_shipment": 23,
  "hourly_stats": [
    { "hour": 9, "count": 15 },
    { "hour": 10, "count": 22 }
  ]
}
```

**4. 작업자별 실적**
```
GET /rest/ful_trx/dashboard/worker_performance
Query: order_date (optional, default: today)
```

Response:
```json
[
  { "worker_id": "W001", "worker_nm": "김작업", "pick_count": 45, "pick_qty": 320, "pack_count": 12 },
  { "worker_id": "W002", "worker_nm": "이피킹", "pick_count": 38, "pick_qty": 280, "pack_count": 8 }
]
```

**5. 웨이브별 풀필먼트 진행률**
```
GET /rest/ful_trx/dashboard/wave_progress/{wave_no}
```

Response:
```json
{
  "wave_no": "WAVE-20260328-001",
  "total_orders": 50,
  "pick_completed": 35,
  "pack_completed": 20,
  "shipped": 15,
  "pick_rate": 70.0,
  "pack_rate": 40.0,
  "ship_rate": 30.0
}
```

**6. 도크별 출하 현황**
```
GET /rest/ful_trx/dashboard/dock_status
Query: order_date (optional, default: today)
```

Response:
```json
[
  { "dock_cd": "DOCK-01", "carrier_cd": "CJ", "waiting_count": 5, "shipped_count": 12 },
  { "dock_cd": "DOCK-02", "carrier_cd": "HANJIN", "waiting_count": 3, "shipped_count": 8 }
]
```

---

### 3.2 피킹 지시 목록 (picking-task-list)

#### 목적
피킹 지시를 조회·검색하고, 일괄 취소 등 대량 처리 수행

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📦 피킹 지시 관리                                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  상태 요약                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐                      │
│  │ 🟣 생성   │ 🟠 진행중 │ 🟢 완료   │ 🔴 취소  │                      │
│  │   25건   │   18건   │   45건   │    2건   │                      │
│  └──────────┴──────────┴──────────┴──────────┘                      │
│                                                                      │
│  🔍 검색 조건                                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ 작업일: [____] ~ [____]  상태: [전체 ▼]  피킹유형: [전체 ▼]│       │
│  │ 피킹방식: [전체 ▼]  웨이브: [____]  작업자: [____]         │       │
│  │ 출하번호: [____]                          [초기화] [조회]  │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  일괄 액션: [일괄 취소]                                              │
│                                                                      │
│  ┌──┬────────┬────────┬──────┬──────┬──────┬──────┬──────┬───┬───┐ │
│  │☐ │피킹번호 │웨이브   │출하번호│피킹유형│피킹방식│작업자 │계획  │실적│상태│ │
│  ├──┼────────┼────────┼──────┼──────┼──────┼──────┼──────┼───┼───┤ │
│  │☐ │PICK-001│WAVE-001│SHP-01│INDIV │ PICK │김작업│  120│ 85│진행│ │
│  │☐ │PICK-002│WAVE-001│SHP-02│INDIV │ PICK │이피킹│    3│  3│완료│ │
│  │☐ │PICK-003│WAVE-002│ -    │TOTAL │ PICK │ -   │  500│  0│생성│ │
│  └──┴────────┴────────┴──────┴──────┴──────┴──────┴──────┴───┴───┘ │
│                                                                      │
│  [엑셀 다운로드]                       전체 90건  1/5 [<] [1] [>]   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 검색 조건

| 필드 | 타입 | 매핑 | 설명 |
|------|------|------|------|
| 작업일 | 날짜 범위 | `order_date` | 기본값: 오늘 |
| 상태 | 셀렉트 | `status` | CREATED/IN_PROGRESS/COMPLETED/CANCELLED + 전체 |
| 피킹유형 | 셀렉트 | `pick_type` | INDIVIDUAL/TOTAL/ZONE |
| 피킹방식 | 셀렉트 | `pick_method` | WCS/PAPER/INSPECT/PICK |
| 웨이브 | 텍스트 | `wave_no` | like 검색 |
| 작업자 | 텍스트 | `worker_id` | 자동완성 |
| 출하번호 | 텍스트 | `shipment_no` | like 검색 (개별 피킹 시) |

#### 그리드 컬럼

| 컬럼 | 필드 | 너비 | 정렬 | 렌더러 |
|------|------|------|------|--------|
| 선택 | - | 40px | 중앙 | checkbox |
| 피킹번호 | `pick_task_no` | 140px | 좌 | link (상세 팝업) |
| 웨이브 | `wave_no` | 140px | 좌 | |
| 출하번호 | `shipment_no` | 130px | 좌 | 개별 피킹만 표시 |
| 피킹유형 | `pick_type` | 90px | 중앙 | badge |
| 피킹방식 | `pick_method` | 80px | 중앙 | badge |
| 존 | `zone_cd` | 70px | 중앙 | 존 피킹만 표시 |
| 작업자 | `worker_id` | 80px | 중앙 | |
| 계획수량 | `plan_total` | 80px | 우 | number |
| 실적수량 | `result_total` | 80px | 우 | number |
| 부족수량 | `short_total` | 80px | 우 | number (>0 시 빨간) |
| 진행률 | (계산) | 100px | 중앙 | progress-bar |
| 상태 | `status` | 80px | 중앙 | status-badge |

#### 일괄 액션 버튼

| 버튼 | 조건 | API | 설명 |
|------|------|-----|------|
| 일괄 취소 | 선택된 행 | `POST /rest/ful_trx/picking_tasks/{id}/cancel` | →CANCELLED |

#### 행 클릭 동작

행 클릭(또는 피킹번호 링크 클릭) 시 `picking-task-detail` 팝업을 `UiUtil.openPopupByElement()`로 표시.

#### MetaGrist 설정

```javascript
{
  entity: 'PickingTask',
  searchUrl: 'picking_tasks',
  multiSaveUrl: 'picking_tasks',
  columns: [
    { name: 'pick_task_no', width: 140, renderer: 'link' },
    { name: 'wave_no', width: 140 },
    { name: 'shipment_no', width: 130 },
    { name: 'pick_type', width: 90, align: 'center', renderer: 'badge' },
    { name: 'pick_method', width: 80, align: 'center', renderer: 'badge' },
    { name: 'zone_cd', width: 70, align: 'center' },
    { name: 'worker_id', width: 80, align: 'center' },
    { name: 'plan_total', width: 80, align: 'right', renderer: 'number' },
    { name: 'result_total', width: 80, align: 'right', renderer: 'number' },
    { name: 'short_total', width: 80, align: 'right', renderer: 'number' },
    { name: 'status', width: 80, align: 'center', renderer: 'status-badge' }
  ]
}
```

---

### 3.3 피킹 지시 상세 (picking-task-detail) — 팝업

#### 목적
개별 피킹 지시의 전체 정보를 조회하고, 시작/완료/취소 트랜잭션을 실행

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📦 피킹 지시 상세                              PICK-20260328-001    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🏷️ 상태 타임라인                                                   │
│  ●─────────────────○──────────────────○                             │
│  생성(CREATED)     진행(IN_PROGRESS)   완료(COMPLETED)              │
│  ▲ 현재                                                             │
│                                                                      │
│  액션: [피킹 시작] [피킹 완료] [취소]                               │
│                                                                      │
│  ┌──────────┬──────────┐                                            │
│  │ 기본정보 │ 피킹 항목│                                            │
│  └──────────┴──────────┘                                            │
│                                                                      │
│  [기본정보 탭]                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ 피킹번호: PICK-20260328-001   웨이브: WAVE-20260328-001 │        │
│  │ 출하번호: SHP-20260328-005    작업일: 2026-03-28        │        │
│  │ 화주사: AVNET                  창고: WH-01               │        │
│  │ 피킹유형: INDIVIDUAL           피킹방식: PICK            │        │
│  │ 존: -                          작업자: 김작업 (W001)     │        │
│  │                                                          │        │
│  │ ┌─── 계획 ────────┐   ┌─── 실적 ────────┐              │        │
│  │ │ 주문수:     1    │   │ 주문수:     1   │              │        │
│  │ │ SKU종수:    3    │   │ SKU종수:    2   │              │        │
│  │ │ 총수량:     5    │   │ 총수량:     3   │              │        │
│  │ └─────────────────┘   │ 부족수량:   2   │              │        │
│  │                        └─────────────────┘              │        │
│  │ 시작일시: 2026-03-28 09:30                               │        │
│  │ 완료일시: -                                               │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
│  [피킹 항목 탭]                                                      │
│  ┌───┬──────┬────────┬────────┬──────┬──────┬──────┬──────┬──────┐ │
│  │순번│ SKU  │ 상품명  │피킹로케 │ 바코드│지시수량│실적수량│부족수량│ 상태│ │
│  ├───┼──────┼────────┼────────┼──────┼──────┼──────┼──────┼──────┤ │
│  │ 1 │SKU-A │ 상품A  │A-01-02 │BC-001│    2 │    2 │    0 │PICKED│ │
│  │ 2 │SKU-B │ 상품B  │B-02-01 │BC-002│    1 │    1 │    0 │PICKED│ │
│  │ 3 │SKU-C │ 상품C  │C-01-03 │BC-003│    2 │    0 │    2 │SHORT │ │
│  └───┴──────┴────────┴────────┴──────┴──────┴──────┴──────┴──────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 탭 구성

**탭 1: 기본정보**
- 헤더 필드를 폼 레이아웃으로 표시 (읽기 전용)
- 계획/실적 요약 카드
- 상태 타임라인 (3단계: 생성 → 진행 → 완료)

**탭 2: 피킹 항목 (PickingTaskItems)**

| 컬럼 | 필드 | 너비 | 설명 |
|------|------|------|------|
| 순번 | `rank` | 50px | 피킹 경로 순서 |
| SKU | `sku_cd` | 80px | 상품 코드 |
| 상품명 | `sku_nm` | 120px | |
| 피킹 로케이션 | `from_loc_cd` | 80px | 출발 로케이션 |
| 도착 로케이션 | `to_loc_cd` | 80px | 포장 스테이션/도크 |
| 바코드 | `barcode` | 100px | |
| 로트 | `lot_no` | 80px | |
| 유통기한 | `expired_date` | 80px | |
| 지시수량 | `order_qty` | 70px | 우측 정렬 |
| 실적수량 | `pick_qty` | 70px | 우측 정렬 |
| 부족수량 | `short_qty` | 70px | >0 시 빨간색 |
| 상태 | `status` | 70px | 배지 (WAIT/RUN/PICKED/SHORT/CANCEL) |

**피킹 항목 상태 색상**:

| 상태 | 색상 | 설명 |
|------|------|------|
| WAIT | `#9E9E9E` (회색) | 피킹 대기 |
| RUN | `#FF9800` (주황) | 피킹 중 |
| PICKED | `#4CAF50` (녹색) | 피킹 완료 |
| SHORT | `#F44336` (빨간) | 피킹 부족 |
| CANCEL | `#D32F2F` (진빨간) | 취소 |

#### 상태별 버튼 활성화

| 현재 상태 | 피킹 시작 | 피킹 완료 | 취소 |
|----------|----------|----------|------|
| CREATED | ✅ | - | ✅ |
| IN_PROGRESS | - | ✅ | ✅ (확인 필요) |
| COMPLETED | - | - | - |
| CANCELLED | - | - | - |

#### API

| 버튼 | API | 설명 |
|------|-----|------|
| 피킹 시작 | `POST /rest/ful_trx/picking_tasks/{id}/start` | CREATED → IN_PROGRESS |
| 피킹 완료 | `POST /rest/ful_trx/picking_tasks/{id}/complete` | IN_PROGRESS → COMPLETED |
| 취소 | `POST /rest/ful_trx/picking_tasks/{id}/cancel` | → CANCELLED |
| 피킹 항목 조회 | `GET /rest/ful_trx/picking_tasks/{id}/items` | 항목 목록 (Lazy Loading) |

---

### 3.4 검수/포장/출하 지시 목록 (packing-order-list)

#### 목적
검수/포장/출하 지시를 조회·검색하고, 라벨 출력/매니페스트/일괄 출하 확정 등 대량 처리 수행

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 검수/포장/출하 관리                                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  상태 요약                                                           │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐  │
│  │🟣생성  │🟠진행  │🔵완료  │🔷라벨  │🟦적하  │🟢출하  │🔴취소  │  │
│  │  12건  │   8건  │  15건  │   5건  │   3건  │  30건  │   1건  │  │
│  └────────┴────────┴────────┴────────┴────────┴────────┴────────┘  │
│                                                                      │
│  🔍 검색 조건                                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ 작업일: [____] ~ [____]  상태: [전체 ▼]  검수유형: [전체 ▼]│       │
│  │ 스테이션: [____]  택배사: [전체 ▼]  도크: [____]           │       │
│  │ 포장번호: [____]  웨이브: [____]          [초기화] [조회]  │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  일괄 액션: [라벨 출력] [매니페스트] [일괄 출하 확정] [일괄 취소]   │
│                                                                      │
│  ┌──┬────────┬────────┬──────┬──────┬──────┬──────┬──────┬───┬───┐ │
│  │☐ │포장번호 │피킹번호 │출하번호│웨이브 │검수유형│택배사 │박스수│도크│상태│ │
│  ├──┼────────┼────────┼──────┼──────┼──────┼──────┼──────┼───┼───┤ │
│  │☐ │PACK-001│PICK-001│SHP-01│WV-001│ FULL │  CJ  │   2 │D-1│완료│ │
│  │☐ │PACK-002│PICK-002│SHP-02│WV-001│ SKIP │한진  │   1 │D-2│출하│ │
│  │☐ │PACK-003│PICK-003│SHP-03│WV-002│ FULL │  CJ  │   3 │D-1│진행│ │
│  └──┴────────┴────────┴──────┴──────┴──────┴──────┴──────┴───┴───┘ │
│                                                                      │
│  [엑셀 다운로드]                       전체 74건  1/4 [<] [1] [>]   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 검색 조건

| 필드 | 타입 | 매핑 | 설명 |
|------|------|------|------|
| 작업일 | 날짜 범위 | `order_date` | 기본값: 오늘 |
| 상태 | 셀렉트 | `status` | 7개 상태 + 전체 |
| 검수유형 | 셀렉트 | `insp_type` | FULL/SAMPLING/SKIP |
| 스테이션 | 텍스트 | `station_cd` | 자동완성 |
| 택배사 | 셀렉트 | `carrier_cd` | 택배사 공통코드 |
| 도크 | 텍스트 | `dock_cd` | 자동완성 |
| 포장번호 | 텍스트 | `pack_order_no` | like 검색 |
| 웨이브 | 텍스트 | `wave_no` | like 검색 |

#### 그리드 컬럼

| 컬럼 | 필드 | 너비 | 정렬 | 렌더러 |
|------|------|------|------|--------|
| 선택 | - | 40px | 중앙 | checkbox |
| 포장번호 | `pack_order_no` | 140px | 좌 | link (상세 팝업) |
| 피킹번호 | `pick_task_no` | 130px | 좌 | |
| 출하번호 | `shipment_no` | 130px | 좌 | |
| 웨이브 | `wave_no` | 130px | 좌 | |
| 검수유형 | `insp_type` | 80px | 중앙 | badge |
| 검수결과 | `insp_result` | 70px | 중앙 | result-badge (PASS=녹, FAIL=빨) |
| 스테이션 | `station_cd` | 80px | 중앙 | |
| 택배사 | `carrier_cd` | 80px | 중앙 | |
| 박스수 | `total_box` | 60px | 우 | number |
| 총중량 | `total_wt` | 70px | 우 | number (kg) |
| 도크 | `dock_cd` | 70px | 중앙 | |
| 상태 | `status` | 100px | 중앙 | status-badge |

#### 일괄 액션 버튼

| 버튼 | 조건 | API | 설명 |
|------|------|-----|------|
| 라벨 출력 | 선택된 행 status=COMPLETED | `POST /rest/ful_trx/packing_orders/{id}/print_label` | COMPLETED→LABEL_PRINTED |
| 매니페스트 | 선택된 행 status=LABEL_PRINTED | `POST /rest/ful_trx/packing_orders/{id}/manifest` | LABEL_PRINTED→MANIFESTED |
| 일괄 출하 확정 | 선택된 행 | `POST /rest/ful_trx/packing_orders/confirm_shipping_batch` | →SHIPPED |
| 일괄 취소 | 선택된 행 (SHIPPED 제외) | `POST /rest/ful_trx/packing_orders/{id}/cancel` | →CANCELLED |

**일괄 출하 확정 조건**:
- `COMPLETED`, `LABEL_PRINTED`, `MANIFESTED` 중 하나의 상태여야 함
- 매니페스트 설정이 비활성(`ful.shipping.manifest.enabled = false`)인 경우 COMPLETED에서 바로 SHIPPED 가능

#### MetaGrist 설정

```javascript
{
  entity: 'PackingOrder',
  searchUrl: 'packing_orders',
  multiSaveUrl: 'packing_orders',
  columns: [
    { name: 'pack_order_no', width: 140, renderer: 'link' },
    { name: 'pick_task_no', width: 130 },
    { name: 'shipment_no', width: 130 },
    { name: 'wave_no', width: 130 },
    { name: 'insp_type', width: 80, align: 'center', renderer: 'badge' },
    { name: 'insp_result', width: 70, align: 'center', renderer: 'result-badge' },
    { name: 'station_cd', width: 80, align: 'center' },
    { name: 'carrier_cd', width: 80, align: 'center' },
    { name: 'total_box', width: 60, align: 'right', renderer: 'number' },
    { name: 'total_wt', width: 70, align: 'right', renderer: 'number' },
    { name: 'dock_cd', width: 70, align: 'center' },
    { name: 'status', width: 100, align: 'center', renderer: 'status-badge' }
  ]
}
```

---

### 3.5 검수/포장/출하 상세 (packing-order-detail) — 팝업

#### 목적
개별 포장 지시의 전체 정보를 조회하고, 시작/완료/라벨/매니페스트/출하확정/취소 트랜잭션을 실행

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 검수/포장/출하 상세                          PACK-20260328-001   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🏷️ 상태 타임라인                                                   │
│  ●─────○─────○─────○─────○─────○                                   │
│  생성  진행  완료  라벨  적하  출하                                  │
│  ▲ 현재                                                             │
│                                                                      │
│  액션: [시작] [완료] [라벨출력] [매니페스트] [출하확정] [취소]       │
│                                                                      │
│  ┌──────────┬──────────┬──────────┐                                 │
│  │ 기본정보 │ 포장 항목│ 포장 박스│                                 │
│  └──────────┴──────────┴──────────┘                                 │
│                                                                      │
│  [기본정보 탭]                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ 포장번호: PACK-20260328-001  피킹번호: PICK-20260328-001│        │
│  │ 출하번호: SHP-20260328-005   웨이브: WAVE-20260328-001  │        │
│  │ 작업일: 2026-03-28           화주사: AVNET              │        │
│  │ 창고: WH-01                  작업자: 박포장 (W003)      │        │
│  │                                                          │        │
│  │ 검수유형: FULL (전수 검수)    검수결과: PASS ✅           │        │
│  │ 택배사: CJ대한통운            도크: DOCK-01              │        │
│  │ 스테이션: STN-02                                         │        │
│  │                                                          │        │
│  │ ┌─── 계획 ────────┐   ┌─── 실적 ────────┐              │        │
│  │ │ SKU수:      3    │   │ SKU수:      3   │              │        │
│  │ │ 총수량:     5    │   │ 총수량:     5   │              │        │
│  │ └─────────────────┘   │ 검수수량:   5   │              │        │
│  │                        │ 박스수:     2   │              │        │
│  │                        │ 총중량:  3.2kg  │              │        │
│  │                        └─────────────────┘              │        │
│  │                                                          │        │
│  │ 시작일시:    2026-03-28 10:15                            │        │
│  │ 완료일시:    2026-03-28 10:30                            │        │
│  │ 적하전송일시: -                                          │        │
│  │ 출하확정일시: -                                          │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
│  [포장 항목 탭]                                                      │
│  ┌──────┬────────┬──────┬──────┬──────┬──────┬──────┬──────┐       │
│  │ SKU  │ 상품명  │바코드│지시수량│검수수량│포장수량│부족수량│ 상태 │       │
│  ├──────┼────────┼──────┼──────┼──────┼──────┼──────┼──────┤       │
│  │SKU-A │ 상품A  │BC-001│    2 │    2 │    2 │    0 │PACKED│       │
│  │SKU-B │ 상품B  │BC-002│    1 │    1 │    1 │    0 │PACKED│       │
│  │SKU-C │ 상품C  │BC-003│    2 │    2 │    2 │    0 │PACKED│       │
│  └──────┴────────┴──────┴──────┴──────┴──────┴──────┴──────┘       │
│                                                                      │
│  [포장 박스 탭]                                                      │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐  │
│  │박스순번│유형  │중량  │아이템│수량  │송장번호│라벨  │출하일시│ 상태│  │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤  │
│  │  1   │ BOX  │1.8kg│   2  │   3  │INV-01│ ✅   │  -   │CLOSED│  │
│  │  2   │ BAG  │1.4kg│   1  │   2  │INV-02│ ✅   │  -   │CLOSED│  │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 탭 구성

**탭 1: 기본정보**
- 헤더 필드를 폼 레이아웃으로 표시 (읽기 전용)
- 검수유형/검수결과 표시 (PASS: 녹색 배지, FAIL: 빨간 배지)
- 계획/실적 요약 카드
- 상태 타임라인 (6단계: 생성 → 진행 → 완료 → 라벨 → 적하 → 출하)

**탭 2: 포장 항목 (PackingOrderItems)** — Lazy Loading

| 컬럼 | 필드 | 너비 | 설명 |
|------|------|------|------|
| SKU | `sku_cd` | 80px | 상품 코드 |
| 상품명 | `sku_nm` | 120px | |
| 바코드 | `barcode` | 100px | |
| 로트 | `lot_no` | 80px | |
| 유통기한 | `expired_date` | 80px | |
| 지시수량 | `order_qty` | 70px | 우측 정렬 |
| 검수수량 | `insp_qty` | 70px | 우측 정렬 |
| 포장수량 | `pack_qty` | 70px | 우측 정렬 |
| 부족수량 | `short_qty` | 70px | >0 시 빨간색 |
| 상태 | `status` | 80px | 배지 (WAIT/INSPECTED/PACKED/SHORT/CANCEL) |

**포장 항목 상태 색상**:

| 상태 | 색상 | 설명 |
|------|------|------|
| WAIT | `#9E9E9E` (회색) | 대기 |
| INSPECTED | `#2196F3` (파란) | 검수 완료 |
| PACKED | `#4CAF50` (녹색) | 포장 완료 |
| SHORT | `#F44336` (빨간) | 부족 |
| CANCEL | `#D32F2F` (진빨간) | 취소 |

**탭 3: 포장 박스 (PackingBoxes)** — Lazy Loading

| 컬럼 | 필드 | 너비 | 설명 |
|------|------|------|------|
| 박스순번 | `box_seq` | 60px | |
| 유형 | `box_type_cd` | 80px | 배지 (BOX/BAG/ENVELOPE/PALLET) |
| 중량 | `box_wt` | 70px | kg 표시 |
| 아이템 | `total_item` | 60px | 종 수 |
| 수량 | `total_qty` | 60px | |
| 송장번호 | `invoice_no` | 120px | |
| 차량번호 | `vehicle_no` | 80px | |
| 라벨 | `label_printed_flag` | 50px | ✅/❌ |
| 라벨출력일시 | `label_printed_at` | 130px | |
| 출하일시 | `shipped_at` | 130px | |
| 상태 | `status` | 70px | 배지 (OPEN/CLOSED/SHIPPED) |

#### 상태별 버튼 활성화

| 현재 상태 | 시작 | 완료 | 라벨출력 | 매니페스트 | 출하확정 | 취소 | 출하취소 |
|----------|------|------|---------|-----------|---------|------|---------|
| CREATED | ✅ | - | - | - | - | ✅ | - |
| IN_PROGRESS | - | ✅ | - | - | - | ✅ | - |
| COMPLETED | - | - | ✅ | - | ✅* | ✅ | - |
| LABEL_PRINTED | - | - | - | ✅ | ✅* | ✅ | - |
| MANIFESTED | - | - | - | - | ✅ | ✅ | - |
| SHIPPED | - | - | - | - | - | - | ✅ |
| CANCELLED | - | - | - | - | - | - | - |

> *출하확정: 매니페스트 설정(`ful.shipping.manifest.enabled`)이 비활성이면 COMPLETED/LABEL_PRINTED에서 바로 가능

#### API

| 버튼 | API | 설명 |
|------|-----|------|
| 시작 | `POST /rest/ful_trx/packing_orders/{id}/start` | CREATED → IN_PROGRESS |
| 완료 | `POST /rest/ful_trx/packing_orders/{id}/complete` | IN_PROGRESS → COMPLETED |
| 라벨출력 | `POST /rest/ful_trx/packing_orders/{id}/print_label` | COMPLETED → LABEL_PRINTED |
| 매니페스트 | `POST /rest/ful_trx/packing_orders/{id}/manifest` | LABEL_PRINTED → MANIFESTED |
| 출하확정 | `POST /rest/ful_trx/packing_orders/{id}/confirm_shipping` | → SHIPPED |
| 취소 | `POST /rest/ful_trx/packing_orders/{id}/cancel` | → CANCELLED (SHIPPED 제외) |
| 출하 취소 | `POST /rest/ful_trx/packing_orders/{id}/cancel_shipping` | SHIPPED → CANCELLED (재고 복원 포함) |
| 포장 항목 조회 | `GET /rest/ful_trx/packing_orders/{id}/items` | Lazy Loading |
| 포장 박스 조회 | `GET /rest/ful_trx/packing_orders/{id}/boxes` | Lazy Loading |

---

### 3.6 풀필먼트 진행 현황 (fulfillment-progress)

#### 목적
피킹→포장→출하 전체 프로세스의 진행 현황을 통합 조회 (읽기 전용)

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 풀필먼트 진행 현황                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 검색 조건                                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ 작업일: [____] ~ [____]  웨이브: [____]  출하번호: [____] │       │
│  │ 피킹상태: [전체 ▼]  포장상태: [전체 ▼]  피킹유형: [전체 ▼]│       │
│  │                                           [초기화] [조회] │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  ┌────────┬──────┬──────┬──────┬──────┬──────┬────────┬──────┐     │
│  │피킹번호 │웨이브│출하번호│피킹유형│피킹상태│포장번호│포장상태 │출하일시│     │
│  ├────────┼──────┼──────┼──────┼──────┼──────┼────────┼──────┤     │
│  │PICK-001│WV-001│SHP-01│INDIV │🟢완료│PACK-01│🟢출하  │10:45 │     │
│  │PICK-002│WV-001│SHP-02│INDIV │🟢완료│PACK-02│🔵완료  │ -    │     │
│  │PICK-003│WV-002│ -   │TOTAL │🟠진행│  -   │  -     │ -    │     │
│  │PICK-004│WV-002│SHP-04│INDIV │🟣생성│  -   │  -     │ -    │     │
│  └────────┴──────┴──────┴──────┴──────┴──────┴────────┴──────┘     │
│                                                                      │
│  [엑셀 다운로드]                      전체 120건  1/6 [<] [1] [>]   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 검색 조건

| 필드 | 타입 | 매핑 | 설명 |
|------|------|------|------|
| 작업일 | 날짜 범위 | `order_date` | 기본값: 오늘 |
| 웨이브 | 텍스트 | `wave_no` | like 검색 |
| 출하번호 | 텍스트 | `shipment_no` | like 검색 |
| 피킹상태 | 셀렉트 | `pick_status` | CREATED/IN_PROGRESS/COMPLETED/CANCELLED |
| 포장상태 | 셀렉트 | `pack_status` | 7개 상태 |
| 피킹유형 | 셀렉트 | `pick_type` | INDIVIDUAL/TOTAL/ZONE |

#### 그리드 컬럼

| 컬럼 | 필드 | 너비 | 정렬 | 렌더러 |
|------|------|------|------|--------|
| 피킹번호 | `pick_task_no` | 140px | 좌 | link |
| 웨이브 | `wave_no` | 130px | 좌 | |
| 출하번호 | `shipment_no` | 130px | 좌 | |
| 피킹유형 | `pick_type` | 80px | 중앙 | badge |
| 피킹방식 | `pick_method` | 80px | 중앙 | badge |
| 작업자 | `worker_id` | 80px | 중앙 | |
| 계획수량 | `plan_total` | 70px | 우 | number |
| 피킹실적 | `pick_result_qty` | 70px | 우 | number |
| 부족수량 | `short_total` | 70px | 우 | number (>0 빨간) |
| 피킹상태 | `pick_status` | 80px | 중앙 | pick-status-badge |
| 포장번호 | `pack_order_no` | 130px | 좌 | |
| 검수유형 | `insp_type` | 70px | 중앙 | badge |
| 검수결과 | `insp_result` | 60px | 중앙 | result-badge |
| 박스수 | `total_box` | 50px | 우 | number |
| 택배사 | `carrier_cd` | 70px | 중앙 | |
| 도크 | `dock_cd` | 70px | 중앙 | |
| 포장상태 | `pack_status` | 90px | 중앙 | pack-status-badge |
| 출하일시 | `shipped_at` | 130px | 중앙 | |

> 이 화면은 `fulfillment_progress` 뷰를 기반으로 조회하며, **읽기 전용**(수정/삭제 불가)입니다.

#### 토탈 피킹 포장 매칭 안내

토탈 피킹(`pick_type = 'TOTAL'`)은 1건의 피킹 지시가 웨이브 전체를 처리하므로, 포장 지시와의 매칭 결과가 개별 피킹과 다릅니다:

| 상황 | 표시 결과 | 안내 |
|------|----------|------|
| 포장 미생성 | 포장번호·포장상태 등 빈 값 | 피킹유형이 TOTAL인 행의 포장 컬럼이 비어있으면 "포장 미생성" 회색 텍스트 표시 |
| 포장 생성 후 | 1 피킹 × N 포장으로 행 확장 | 동일 `pickTaskNo`가 여러 행에 반복 표시됨 (정상) |

**UI 처리**:
- 포장 컬럼(`pack_order_no`, `pack_status`, `pack_started_at`, `pack_completed_at`, `manifested_at`, `shipped_at`)이 NULL이고 `pick_type = 'TOTAL'`이면 → 포장번호 셀에 `<span class="empty-hint">포장 미생성</span>` 표시
- 동일 `pick_task_no`가 반복되는 행은 피킹 컬럼을 병합하지 않고 그대로 표시 (그리드 단순화)

```css
.empty-hint {
  color: #9E9E9E;
  font-size: 11px;
  font-style: italic;
}
```

#### MetaGrist 설정

```javascript
{
  entity: 'FulfillmentProgress',
  searchUrl: 'fulfillment_progress',
  columns: [
    { name: 'pick_task_no', width: 140, renderer: 'link' },
    { name: 'wave_no', width: 130 },
    { name: 'shipment_no', width: 130 },
    { name: 'pick_type', width: 80, align: 'center', renderer: 'badge' },
    { name: 'pick_method', width: 80, align: 'center', renderer: 'badge' },
    { name: 'worker_id', width: 80, align: 'center' },
    { name: 'plan_total', width: 70, align: 'right', renderer: 'number' },
    { name: 'pick_result_qty', width: 70, align: 'right', renderer: 'number' },
    { name: 'short_total', width: 70, align: 'right', renderer: 'number' },
    { name: 'pick_status', width: 80, align: 'center', renderer: 'status-badge' },
    { name: 'pack_order_no', width: 130 },
    { name: 'insp_type', width: 70, align: 'center', renderer: 'badge' },
    { name: 'insp_result', width: 60, align: 'center', renderer: 'result-badge' },
    { name: 'total_box', width: 50, align: 'right', renderer: 'number' },
    { name: 'carrier_cd', width: 70, align: 'center' },
    { name: 'dock_cd', width: 70, align: 'center' },
    { name: 'pack_status', width: 90, align: 'center', renderer: 'status-badge' },
    { name: 'shipped_at', width: 130, align: 'center' }
  ]
}
```

---

## 4. UI/UX 컨셉

### 4.1 색상 시스템

```css
:root {
  /* PickingTask 상태 */
  --pick-status-created: #7B1FA2;
  --pick-status-in-progress: #FF9800;
  --pick-status-completed: #4CAF50;
  --pick-status-cancelled: #D32F2F;

  /* PackingOrder 상태 */
  --pack-status-created: #7B1FA2;
  --pack-status-in-progress: #FF9800;
  --pack-status-completed: #2196F3;
  --pack-status-label-printed: #1565C0;
  --pack-status-manifested: #303F9F;
  --pack-status-shipped: #4CAF50;
  --pack-status-cancelled: #D32F2F;

  /* PackingBox 상태 */
  --box-status-open: #FF9800;
  --box-status-closed: #2196F3;
  --box-status-shipped: #4CAF50;

  /* PickingTaskItem 상태 */
  --item-status-wait: #9E9E9E;
  --item-status-run: #FF9800;
  --item-status-picked: #4CAF50;
  --item-status-short: #F44336;
  --item-status-cancel: #D32F2F;

  /* PackingOrderItem 상태 */
  --pitem-status-wait: #9E9E9E;
  --pitem-status-inspected: #2196F3;
  --pitem-status-packed: #4CAF50;
  --pitem-status-short: #F44336;
  --pitem-status-cancel: #D32F2F;
}
```

### 4.2 상태별 배지 컴포넌트

#### PickingTask 배지

```css
.pick-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #FFFFFF;
}

.pick-status-badge.CREATED { background: #7B1FA2; }
.pick-status-badge.IN_PROGRESS { background: #FF9800; }
.pick-status-badge.COMPLETED { background: #4CAF50; }
.pick-status-badge.CANCELLED { background: #D32F2F; }
```

#### PackingOrder 배지

```css
.pack-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #FFFFFF;
}

.pack-status-badge.CREATED { background: #7B1FA2; }
.pack-status-badge.IN_PROGRESS { background: #FF9800; }
.pack-status-badge.COMPLETED { background: #2196F3; }
.pack-status-badge.LABEL_PRINTED { background: #1565C0; }
.pack-status-badge.MANIFESTED { background: #303F9F; }
.pack-status-badge.SHIPPED { background: #4CAF50; }
.pack-status-badge.CANCELLED { background: #D32F2F; }
```

#### 검수 결과 배지

```css
.result-badge.PASS { background: #4CAF50; color: #FFFFFF; }
.result-badge.FAIL { background: #F44336; color: #FFFFFF; }
```

#### 박스 유형 배지

```css
.box-type-badge.BOX { background: #795548; color: #FFFFFF; }
.box-type-badge.BAG { background: #9C27B0; color: #FFFFFF; }
.box-type-badge.ENVELOPE { background: #FF9800; color: #FFFFFF; }
.box-type-badge.PALLET { background: #607D8B; color: #FFFFFF; }
```

### 4.3 상태 타임라인

#### 피킹 지시 타임라인 (3단계)

```css
.pick-timeline {
  display: flex;
  align-items: center;
  gap: 0;
}
.pick-timeline .step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.pick-timeline .step .dot {
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--md-sys-color-outline);
}
.pick-timeline .step.active .dot {
  background: var(--step-color);
  box-shadow: 0 0 0 4px rgba(var(--step-color-rgb), 0.2);
}
.pick-timeline .step.completed .dot { background: var(--step-color); }
.pick-timeline .step .line { height: 2px; flex: 1; background: var(--md-sys-color-outline-variant); }
.pick-timeline .step.completed .line { background: var(--step-color); }
```

#### 포장/출하 타임라인 (6단계)

생성 → 진행 → 완료 → 라벨 → 적하 → 출하

> 매니페스트 설정이 비활성이면 '적하' 단계를 회색으로 표시하고 건너뛸 수 있음

### 4.4 진행률 바

```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--md-sys-color-outline-variant);
  border-radius: 4px;
}
.progress-bar .fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #7B1FA2, #4CAF50);
  transition: width 0.3s ease;
}
```

### 4.5 반응형 디자인

```css
/* 대시보드 카드 */
.pick-status-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.pack-status-cards {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}

@media screen and (max-width: 1024px) {
  .pick-status-cards { grid-template-columns: repeat(2, 1fr); }
  .pack-status-cards { grid-template-columns: repeat(4, 1fr); }
}

@media screen and (max-width: 768px) {
  .pick-status-cards { grid-template-columns: repeat(2, 1fr); }
  .pack-status-cards { grid-template-columns: repeat(2, 1fr); }

  .chart-container { flex-direction: column; }
  .search-form { flex-direction: column; }
}
```

---

## 5. 기술 스택

### 5.1 프론트엔드

| 기술 | 용도 |
|------|------|
| LitElement | 웹 컴포넌트 기반 UI |
| MetaGrist | 메타데이터 기반 그리드 (목록 화면) |
| Chart.js | 대시보드 차트 (도넛, 막대) |
| Material Design 3 | 디자인 시스템 |
| Redux | 상태 관리 (actions/reducers) |

### 5.2 API 통신

| 방식 | 용도 | 예시 |
|------|------|------|
| GraphQL | MetaGrist CRUD 조회 | `query { pickingTasks { ... } }` |
| REST (ServiceUtil) | 트랜잭션 API 호출 | `ServiceUtil.post('/rest/ful_trx/...')` |
| REST (fetch) | 대시보드 통계 조회 | `fetch('/rest/ful_trx/dashboard/...')` |

#### ServiceUtil 사용 패턴

```javascript
import { ServiceUtil } from '@operato-app/operato-wes'

// 피킹 시작
async startPickingTask(taskId) {
  const response = await ServiceUtil.post(
    `/rest/ful_trx/picking_tasks/${taskId}/start`
  )
  // 성공 시 팝업 데이터 리프레시
  this._refreshDetail()
}

// 일괄 출하 확정
async confirmShippingBatch(selectedIds) {
  const response = await ServiceUtil.post(
    '/rest/ful_trx/packing_orders/confirm_shipping_batch',
    { ids: selectedIds }
  )
  this._refreshGrid()
}
```

---

## 6. 구현 우선순위

### Phase 1: 핵심 피킹/포장 관리 (우선)

| 순서 | 화면 | 파일 | 설명 |
|------|------|------|------|
| 1 | 풀필먼트 대시보드 | `fulfillment-home.js` | 현황 파악 |
| 2 | 피킹 지시 목록 | `picking-task-list.js` | 피킹 조회/일괄 취소 |
| 3 | 피킹 지시 상세 | `picking-task-detail.js` | 개별 피킹 관리 (팝업) |

### Phase 2: 포장/출하 관리 (차순)

| 순서 | 화면 | 파일 | 설명 |
|------|------|------|------|
| 4 | 검수/포장/출하 목록 | `packing-order-list.js` | 포장 조회/일괄 처리 |
| 5 | 검수/포장/출하 상세 | `packing-order-detail.js` | 개별 포장/출하 관리 (팝업) |

### Phase 3: 모니터링

| 순서 | 화면 | 파일 | 설명 |
|------|------|------|------|
| 6 | 풀필먼트 진행 현황 | `fulfillment-progress.js` | 통합 진행 현황 (뷰 기반) |

---

## 7. 구현 현황

> 최종 업데이트: 2026-03-28

### 프론트엔드 화면

| # | 화면 | 파일 | 상태 | 구현일 | 비고 |
|---|------|------|------|--------|------|
| 1 | 풀필먼트 대시보드 | `fulfillment-home.js` | ⬜ 미구현 | - | |
| 2 | 피킹 지시 목록 | `picking-task-list.js` | ⬜ 미구현 | - | |
| 3 | 피킹 지시 상세 | `picking-task-detail.js` | ⬜ 미구현 | - | |
| 4 | 검수/포장/출하 목록 | `packing-order-list.js` | ⬜ 미구현 | - | |
| 5 | 검수/포장/출하 상세 | `packing-order-detail.js` | ⬜ 미구현 | - | |
| 6 | 풀필먼트 진행 현황 | `fulfillment-progress.js` | ⬜ 미구현 | - | |

### 백엔드 컨트롤러

| # | 컨트롤러 | 경로 | 상태 | 비고 |
|---|---------|------|------|------|
| 1 | `PickingTaskController` | `/rest/picking_tasks` | ⬜ 미구현 | CRUD |
| 2 | `PackingOrderController` | `/rest/packing_orders` | ⬜ 미구현 | CRUD |
| 3 | `PackingBoxController` | `/rest/packing_boxes` | ⬜ 미구현 | CRUD |
| 4 | `FulfillmentProgressController` | `/rest/fulfillment_progress` | ⬜ 미구현 | 읽기 전용 |
| 5 | `FulfillmentTransactionController` | `/rest/ful_trx` | ⬜ 미구현 | 트랜잭션 API |

### 백엔드 서비스

| # | 서비스 | 상태 | 비고 |
|---|--------|------|------|
| 1 | `FulfillmentTransactionService` | ⬜ 미구현 | 피킹/포장/출하 트랜잭션 |
| 2 | `FulfillmentPickingService` | ⬜ 미구현 | 피킹 로직 |
| 3 | `FulfillmentPackingService` | ⬜ 미구현 | 검수/포장 로직 |
| 4 | `FulfillmentShippingService` | ⬜ 미구현 | 출하 로직 |
| 5 | `FulfillmentEventPublisher` | ⬜ 미구현 | OMS 이벤트 발행 |

### 엔티티

| # | 엔티티 | 테이블 | 상태 | 비고 |
|---|--------|--------|------|------|
| 1 | `PickingTask` | `picking_tasks` | ✅ 완료 | 4개 상태 상수 |
| 2 | `PickingTaskItem` | `picking_task_items` | ✅ 완료 | 5개 상태 상수 |
| 3 | `PackingOrder` | `packing_orders` | ✅ 완료 | 7개 상태 상수 |
| 4 | `PackingOrderItem` | `packing_order_items` | ✅ 완료 | 5개 상태 상수 |
| 5 | `PackingBox` | `packing_boxes` | ✅ 완료 | 3개 상태 상수 |
| 6 | `FulfillmentProgress` | `fulfillment_progress` | ✅ 완료 | 뷰 (ignoreDdl) |

### 라우트 등록

| # | 페이지 | tagname | 상태 |
|---|--------|---------|------|
| 1 | 풀필먼트 대시보드 | `fulfillment-home` | ⬜ 미등록 |
| 2 | 피킹 지시 목록 | `picking-task-list` | ⬜ 미등록 |
| 3 | 검수/포장/출하 목록 | `packing-order-list` | ⬜ 미등록 |
| 4 | 풀필먼트 진행 현황 | `fulfillment-progress` | ⬜ 미등록 |
