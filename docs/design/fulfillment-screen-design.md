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
8. [출고 추적 화면 상세 설계](#8-출고-추적-화면-상세-설계)
9. [PDA 출하 확정 화면 상세 설계](#9-pda-출하-확정-화면-상세-설계)
10. [PDA 피킹 화면 상세 설계](#10-pda-피킹-화면-상세-설계)
11. [PDA 포장 화면 상세 설계](#11-pda-포장-화면-상세-설계)

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
├─ 모니터링
│  └─ fulfillment-progress (풀필먼트 진행 현황)
└─ 추적/조회
   └─ shipment-tracking (출고 추적)
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
| 7. 출고 추적 (송장/번호 기반) | shipment-tracking | 전체 |

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
| 7 | 출고 추적 | `shipment-tracking.js` | ✅ 완료 | 2026-04-03 | 송장/출고/포장/웨이브/원주문번호 통합 추적 |
| 8 | PDA 출하 확정 | `pda-fulfillment-shipping.js` | ✅ 완료 | 2026-04-03 | PDA 도크 선택 + 송장 스캔 출하 확정 |
| 9 | PDA 피킹 | `pda-fulfillment-picking.js` | ✅ 완료 | 2026-04-03 | PDA 바코드 스캔 피킹 작업 |
| 10 | PDA 포장 | `pda-fulfillment-packing.js` | ✅ 완료 | 2026-04-03 | PDA 바코드 스캔 검수/포장 작업 |

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
| 6 | `FulfillmentTrackingService` | ✅ 완료 | 출고 추적 조회 |

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
| 5 | 출고 추적 | `shipment-tracking` | ✅ 완료 |
| 6 | PDA 출하 확정 | `pda-fulfillment-shipping` | ✅ 완료 |
| 7 | PDA 피킹 | `pda-fulfillment-picking` | ✅ 완료 |
| 8 | PDA 포장 | `pda-fulfillment-packing` | ✅ 완료 |

---

## 8. 출고 추적 화면 상세 설계

> 작성일: 2026-04-03
> 화면명: 출고 추적 (Shipment Tracking)
> 파일: `frontend/packages/operato-wes/client/pages/fulfillment/shipment-tracking.js`

### 8.1 목적

송장번호, 출고번호, 포장번호, 피킹번호, 웨이브번호, 원주문번호 중 하나를 입력하면 해당 건의 **주문 → 웨이브 → 피킹 → 포장 → 박스/출하** 전체 이력을 한 화면에서 추적할 수 있는 조회 전용 화면.

### 8.2 데이터 추적 경로

```
송장번호 (invoice_no)
  └─ PackingBox (packing_boxes.invoice_no)
       └─ PackingOrder (packing_order_id)
            ├─ pick_task_no ──→ PickingTask
            ├─ shipment_no ──→ ShipmentOrder
            │                    ├─ ref_order_no (원주문번호)
            │                    └─ wave_no ──→ ShipmentWave
            └─ wave_no ────────→ ShipmentWave
```

### 8.3 파일 위치 및 등록

| 항목 | 값 |
|------|---|
| 프론트엔드 파일 | `frontend/packages/operato-wes/client/pages/fulfillment/shipment-tracking.js` |
| 커스텀 엘리먼트 | `<shipment-tracking>` |
| route.ts 등록 | `fulfillment/shipment-tracking` |
| things-factory.config.js | `{ tagname: 'shipment-tracking', page: 'shipment-tracking' }` |
| 라우트 경로 | `/shipment-tracking` |

### 8.4 전체 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│ [page-header]  출고 추적                                         │
├──────────────────────────────────────────────────────────────────┤
│ [search-section]                                                 │
│  ┌────────────────┐  ┌────────────────────────────────┐  ┌────┐ │
│  │ 자동감지     ▼ │  │ 🔍 번호 입력 또는 바코드 스캔   │  │조회│ │
│  └────────────────┘  └────────────────────────────────┘  └────┘ │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [summary-cards] ─────────────────────────────────────────────── │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 원주문    │  │ 출고주문  │  │ 웨이브    │  │ 배송사    │        │
│  │ CH-00123 │  │ SH-0045  │  │ W-0403-1 │  │ CJ대한통운│        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│ [flow-timeline] ────────────────────────────────────────────── │
│  ●━━━━●━━━━●━━━━●━━━━●━━━━○                                    │
│  주문   할당   웨이브  피킹   포장   출하                           │
│                                                                  │
│ [tab-bar] ─────────────────────────────────────────────────── │
│  [ 주문 정보 ]  [ 피킹 ]  [ 포장 ]  [ 박스/송장 ]                 │
│                                                                  │
│ [tab-content] (스크롤 가능) ──────────────────────────────────── │
│  (탭별 상세 내용)                                                 │
└──────────────────────────────────────────────────────────────────┘
```

### 8.5 섹션별 상세

#### 8.5.1 검색 섹션 (search-section)

| 요소 | 설명 |
|------|------|
| 검색 유형 셀렉트 | `자동감지(기본)` / 송장번호 / 출고번호 / 포장번호 / 피킹번호 / 웨이브번호 / 원주문번호 |
| 검색 입력 | `autofocus`, Enter키 자동 검색 (USB 바코드 스캔 대응) |
| 조회 버튼 | 검색 실행 |

**자동감지 로직** (입력값 접두사 패턴 기반):

| 접두사 | 판별 결과 |
|--------|----------|
| `W-` | 웨이브번호 → `shipment_waves.wave_no` |
| `PICK-` | 피킹번호 → `picking_tasks.pick_task_no` |
| `PACK-` | 포장번호 → `packing_orders.pack_order_no` |
| `SH-` | 출고번호 → `shipment_orders.shipment_no` |
| 그 외 | 순차 조회: 송장번호 → 출고번호 → 원주문번호 |

#### 8.5.2 요약 카드 (summary-cards)

4개 카드를 가로 배치하여 핵심 식별 정보를 한눈에 표시.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 원주문번호    │  │ 출고번호      │  │ 웨이브        │  │ 배송         │
│              │  │              │  │              │  │              │
│ CH-20260401  │  │ SH-260401-01│  │ W-260402-001 │  │ CJ대한통운    │
│ -00123   [📋]│  │          [📋]│  │          [📋]│  │ 일반택배      │
│              │  │              │  │              │  │              │
│ 고객: 홍길동  │  │ 화주: ABC물류 │  │ 유형: 토탈피킹 │  │              │
│ 주문일: 04-01│  │ 3종 / 15EA  │  │ 5건 포함     │  │              │
│              │  │              │  │              │  │              │
│ [🟢 SHIPPED ]│  │ [🟢 SHIPPED ]│  │ [🟢 COMPLETED]│ │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**CSS 레이아웃**:
```css
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
/* 반응형: 태블릿 2열, 모바일 1열 */
@media (max-width: 1199px) { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 767px) { grid-template-columns: 1fr; }
```

| 카드 | 주요 표시 내용 | 데이터 소스 |
|------|--------------|------------|
| 원주문번호 | ref_order_no, cust_nm, order_date, status | ShipmentOrder |
| 출고번호 | shipment_no, com_cd, total_item/total_order, status | ShipmentOrder |
| 웨이브 | wave_no, pick_type, 포함 주문 건수, status | ShipmentWave |
| 배송 | carrier_cd(배송사명), carrier_service_type, dlv_type | ShipmentOrder |

- 번호 옆 `[📋]` 클립보드 복사 버튼
- 데이터 없는 카드: 회색 배경 + "정보 없음" 표시

#### 8.5.3 흐름 타임라인 (flow-timeline)

가로 방향 6단계 타임라인으로 전체 진행 상황을 시각화.

```
●━━━━━━━●━━━━━━━●━━━━━━━●━━━━━━━●━━━━━━━○
주문접수   재고할당   웨이브    피킹     포장     출하

04-01     04-01     04-02    04-02    04-03     -
10:00     14:30     09:00    09:30    13:00

   4h 30m     18h 30m    30m      3h 30m     -
  (할당소요)   (대기)    (피킹)    (포장)   (출하대기)
```

**6단계 매핑**:

| 단계 | 조건 | 시각 필드 |
|------|------|----------|
| 주문접수 | ShipmentOrder.status >= CONFIRMED | `shipment_order.confirmed_at` |
| 재고할당 | ShipmentOrder.status >= ALLOCATED | `shipment_order.allocated_at` |
| 웨이브 | ShipmentOrder.status >= RELEASED | `shipment_order.released_at` |
| 피킹 | PickingTask.status = COMPLETED | `picking_task.completed_at` |
| 포장 | PackingOrder.status >= COMPLETED | `packing_order.completed_at` |
| 출하 | PackingOrder.status = SHIPPED 또는 PackingBox.status = SHIPPED | `packing_order.shipped_at` |

**스타일 규칙**:

| 상태 | 원 모양 | 선 스타일 | 색상 |
|------|--------|----------|------|
| 완료 | `●` 채워진 원 | `━━` 실선 | `var(--md-sys-color-primary)` (#1976D2) |
| 현재 진행 | `●` + pulse 애니메이션 | `━━` 실선 | #FF9800 (주황) |
| 미도달 | `○` 빈 원 | `┈┈` 점선 | #BDBDBD (회색) |

- 구간 소요시간: 연결선 위에 `font-size: 11px; color: #9E9E9E`로 표시

#### 8.5.4 탭 바 (tab-bar)

```
[ 주문 정보 (3) ]  [ 피킹 (8) ]  [ 포장 (3) ]  [ 박스/송장 (1) ]
═══════════════
```

- 기존 `packing-order-detail.js`와 동일한 Material Design 3 탭 스타일
- 활성 탭: `border-bottom: 2px solid var(--md-sys-color-primary)`
- 괄호 안 숫자: 해당 탭의 상세 아이템 건수
- 지연 로딩: 탭 전환 시 해당 데이터만 API 호출

### 8.6 탭별 상세 내용

#### 8.6.1 탭 1: 주문 정보

**출고 주문 정보 (Info Grid — 3열)**:

| 행 | 컬럼 1 | 컬럼 2 | 컬럼 3 |
|----|--------|--------|--------|
| 1 | 출고번호: `shipment_no` | 원주문번호: `ref_order_no` | 주문일자: `order_date` |
| 2 | 화주사: `com_cd` | 고객코드: `cust_cd` | 고객명: `cust_nm` |
| 3 | 업무유형: `biz_type` | 출고유형: `ship_type` | 배송유형: `dlv_type` |
| 4 | 배송사: `carrier_cd` | 서비스유형: `carrier_service_type` | 상태: `status` (뱃지) |
| 합계행 | 총 품목: `total_item`종 | 주문수량: `total_order` EA | 할당수량: `total_alloc` EA / 출하수량: `total_shipped` EA |

**주문 상세 테이블** (`shipment_order_items`):

| # | SKU | 상품명 | 주문수량 | 할당수량 | 출하수량 | 부족 | LOT | 유통기한 |
|---|-----|-------|---------|---------|---------|-----|-----|---------|
| 01 | SKU-A001 | 상품A | 5 | 5 | 5 | 0 | L001 | 26-12-31 |
| **합계** | | | **15** | **15** | **15** | **0** | | |

**재고 할당 테이블** (`stock_allocations`):

| # | SKU | 로케이션 | 할당전략 | 수량 | 상태 | 할당시각 |
|---|-----|---------|---------|------|------|---------|
| 1 | SKU-A001 | A-01-01 | FEFO | 5 | RELEASED | 04-01 14:30 |

#### 8.6.2 탭 2: 피킹

**피킹 지시 정보 (Info Grid — 3열)**:

| 행 | 컬럼 1 | 컬럼 2 | 컬럼 3 |
|----|--------|--------|--------|
| 1 | 피킹번호: `pick_task_no` | 웨이브번호: `wave_no` | 피킹유형: `pick_type` |
| 2 | 피킹방법: `pick_method` | 작업자: `worker_id` | 상태: `status` (뱃지) |
| 3 | 시작시각: `started_at` | 완료시각: `completed_at` | 소요시간: (계산값) |
| 합계행 | 계획: `plan_order`건 `plan_item`종 `plan_total` EA | 실적: `result_order`건 `result_item`종 `result_total` EA | 부족: `short_total` EA |

**피킹 항목 테이블** (`picking_task_items`):

| 순위 | SKU | 피킹위치 | 행선지 | 지시수량 | 피킹수량 | 부족 | 상태 | 피킹시각 |
|------|-----|---------|-------|---------|---------|------|------|---------|
| 1 | SKU-A001 | A-01-01 | PK-ST1 | 5 | 5 | 0 | PICKED | 09:32 |

**상태 뱃지 색상** (기존 `picking-task-detail.js` 패턴):

| 상태 | 색상 |
|------|------|
| WAIT | #9E9E9E (회색) |
| RUN | #FF9800 (주황) |
| PICKED | #4CAF50 (초록) |
| SHORT | #F44336 (빨강) |
| CANCEL | #D32F2F (진한 빨강) |

#### 8.6.3 탭 3: 포장

**포장 지시 정보 (Info Grid — 3열)**:

| 행 | 컬럼 1 | 컬럼 2 | 컬럼 3 |
|----|--------|--------|--------|
| 1 | 포장번호: `pack_order_no` | 검수유형: `insp_type` | 작업 스테이션: `station_cd` |
| 2 | 작업자: `worker_id` | 검수결과: `insp_result` | 상태: `status` (뱃지) |
| 3 | 시작시각: `started_at` | 완료시각: `completed_at` | 소요시간: (계산값) |
| 합계행 | 총 박스: `total_box`개 | 총 중량: `total_wt` kg | |

**포장 항목 테이블** (`packing_order_items`):

| # | SKU | 상품명 | 주문수량 | 검수수량 | 포장수량 | 부족 | 박스# | 상태 |
|---|-----|-------|---------|---------|---------|------|-------|------|
| 1 | SKU-A001 | 상품A | 5 | 5 | 5 | 0 | #1 | PACKED |

**상태 뱃지 색상** (기존 `packing-order-detail.js` 패턴):

| 상태 | 색상 |
|------|------|
| WAIT | #9E9E9E (회색) |
| INSPECTED | #2196F3 (파랑) |
| PACKED | #4CAF50 (초록) |
| SHORT | #F44336 (빨강) |
| CANCEL | #D32F2F (진한 빨강) |

#### 8.6.4 탭 4: 박스/송장

**박스 목록 테이블** (`packing_boxes`):

| 박스# | 박스유형 | 송장번호 | 중량(kg) | 품목수 | 수량 | 라벨출력 | 상태 |
|------|---------|---------|---------|-------|------|---------|------|
| 1 | 소형 | 6012345678901 | 2.5 | 3종 | 15EA | ✅ | CLOSED |

**박스 클릭 → 하위 상세 표시** (해당 박스에 포함된 상품):

| # | SKU | 상품명 | 수량 | LOT | 유통기한 |
|---|-----|-------|------|-----|---------|
| 1 | SKU-A001 | 상품A | 5 | L001 | 26-12-31 |

**박스 상태 뱃지 색상**:

| 상태 | 색상 |
|------|------|
| OPEN | #FF9800 (주황) |
| CLOSED | #2196F3 (파랑) |
| SHIPPED | #4CAF50 (초록) |

### 8.7 빈 상태 / 에러 처리

| 상태 | 표시 내용 |
|------|----------|
| 검색 전 | 중앙 아이콘 + "송장번호, 출고번호 등을 입력하여 추적 정보를 조회하세요" |
| 로딩 중 | 스피너 + "조회 중..." |
| 결과 없음 | 경고 아이콘 + "'{keyword}'에 해당하는 출고 정보를 찾을 수 없습니다" |
| 부분 데이터 없음 | 해당 탭 영역에 "피킹 정보가 없습니다" 등 개별 안내 |

### 8.8 컴포넌트 Properties

```javascript
static get properties() {
  return {
    // 검색
    searchKeyword: String,
    searchType: String,           // 'auto' | 'invoice' | 'shipment' | 'packing' | 'picking' | 'wave' | 'ref_order'

    // 데이터
    shipmentOrder: Object,        // 출고 주문 헤더
    shipmentOrderItems: Array,    // 출고 주문 상세
    stockAllocations: Array,      // 재고 할당
    wave: Object,                 // 웨이브
    pickingTask: Object,          // 피킹 지시 헤더
    pickingTaskItems: Array,      // 피킹 항목
    packingOrder: Object,         // 포장 지시 헤더
    packingOrderItems: Array,     // 포장 항목
    packingBoxes: Array,          // 박스 목록

    // UI 상태
    activeTab: Number,            // 0: 주문정보, 1: 피킹, 2: 포장, 3: 박스/송장
    loading: Boolean,
    searched: Boolean,            // 검색 실행 여부 (빈 상태 분기용)
    notFound: Boolean             // 결과 없음
  }
}
```

### 8.9 백엔드 API

#### 엔드포인트

```
GET /rest/fulfillment/tracking?keyword={검색어}&type={검색유형}
```

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `keyword` | String | Y | 검색어 |
| `type` | String | N | `auto`(기본) / `invoice` / `shipment` / `packing` / `picking` / `wave` / `ref_order` |

#### 응답 구조

> Map 응답이므로 모든 키를 snake_case로 직접 작성 (Jackson SNAKE_CASE 규칙)

```json
{
  "shipment_order": {
    "id": "uuid",
    "shipment_no": "SH-260401-001",
    "ref_order_no": "CH-20260401-00123",
    "wave_no": "W-260402-001",
    "com_cd": "ABC",
    "cust_cd": "C001",
    "cust_nm": "홍길동",
    "biz_type": "B2C_OUT",
    "ship_type": "NORMAL",
    "dlv_type": "PARCEL",
    "carrier_cd": "CJ",
    "carrier_service_type": "STANDARD",
    "total_item": 3,
    "total_order": 15.0,
    "total_alloc": 15.0,
    "total_shipped": 15.0,
    "status": "SHIPPED",
    "order_date": "2026-04-01",
    "confirmed_at": "2026-04-01 10:00:00",
    "allocated_at": "2026-04-01 14:30:00",
    "released_at": "2026-04-02 09:00:00",
    "shipped_at": "2026-04-03 16:00:00"
  },
  "shipment_order_items": [ ... ],
  "stock_allocations": [ ... ],
  "wave": {
    "wave_no": "W-260402-001",
    "wave_date": "2026-04-02",
    "pick_type": "TOTAL",
    "status": "COMPLETED"
  },
  "picking_task": {
    "pick_task_no": "PICK-260402-0001",
    "pick_type": "TOTAL",
    "pick_method": "PAPER",
    "worker_id": "...",
    "plan_order": 5,
    "plan_item": 3,
    "plan_total": 15.0,
    "result_order": 5,
    "result_item": 3,
    "result_total": 15.0,
    "short_total": 0.0,
    "status": "COMPLETED",
    "started_at": "2026-04-02 09:30:00",
    "completed_at": "2026-04-02 10:00:00"
  },
  "picking_task_items": [ ... ],
  "packing_order": {
    "pack_order_no": "PACK-260403-001",
    "insp_type": "FULL",
    "insp_result": "PASS",
    "station_cd": "PK-ST1",
    "worker_id": "...",
    "total_box": 1,
    "total_wt": 2.5,
    "status": "COMPLETED",
    "started_at": "2026-04-03 13:00:00",
    "completed_at": "2026-04-03 13:15:00"
  },
  "packing_order_items": [ ... ],
  "packing_boxes": [
    {
      "id": "uuid",
      "box_seq": 1,
      "box_type_cd": "SMALL",
      "box_wt": 2.5,
      "total_item": 3,
      "total_qty": 15.0,
      "invoice_no": "6012345678901",
      "label_printed_flag": true,
      "status": "CLOSED"
    }
  ]
}
```

#### 백엔드 조회 전략

단일 쿼리가 아닌 **단계별 순차 조회**:

```
1. keyword + type 으로 기준 테이블 조회
   ┌─ invoice  → SELECT * FROM packing_boxes WHERE invoice_no = ?
   │            → packing_order_id로 packing_orders 조회
   │            → shipment_order_id로 shipment_orders 조회
   ├─ shipment → SELECT * FROM shipment_orders WHERE shipment_no = ?
   ├─ packing  → SELECT * FROM packing_orders WHERE pack_order_no = ?
   │            → shipment_order_id로 shipment_orders 조회
   ├─ picking  → SELECT * FROM picking_tasks WHERE pick_task_no = ?
   │            → shipment_order_id 또는 wave_no로 shipment_orders 조회
   ├─ wave     → SELECT * FROM shipment_waves WHERE wave_no = ?
   │            → wave_no로 shipment_orders 조회 (첫 번째 건)
   ├─ ref_order→ SELECT * FROM shipment_orders WHERE ref_order_no = ?
   └─ auto     → 순차 시도: invoice → shipment → ref_order → packing → picking → wave

2. shipment_order 확정 후 나머지 연결 데이터 조회
   ├─ shipment_order_items  WHERE shipment_order_id = ?
   ├─ stock_allocations     WHERE shipment_order_id = ?
   ├─ wave                  WHERE wave_no = shipment_order.wave_no
   ├─ picking_task          WHERE shipment_order_id = ? (개별) 또는 wave_no = ? (토탈)
   ├─ picking_task_items    WHERE pick_task_id = ?
   ├─ packing_order         WHERE shipment_order_id = ? (개별) 또는 wave_no = ? (토탈)
   ├─ packing_order_items   WHERE packing_order_id = ?
   └─ packing_boxes         WHERE packing_order_id = ?
```

> **구현 위치**: `FulfillmentTrackingService` (신규) 또는 기존 `FulfillmentTransactionController`에 조회 엔드포인트 추가

### 8.10 반응형 대응

| 뷰포트 | 요약 카드 | Info Grid | 테이블 |
|--------|----------|-----------|--------|
| >= 1200px (데스크탑) | 4열 | 3열 | 전체 컬럼 |
| 768~1199px (태블릿) | 2열 | 2열 | 주요 컬럼만 |
| < 768px (모바일) | 1열 | 1열 | 가로 스크롤 |

---

## 9. PDA 출하 확정 화면 상세 설계

> 작성일: 2026-04-03
> 참조: `docs/design/pda-shipping-confirm-design.md` (상세 설계서)

### 9.1 목적

도크 앞에서 차량 상차 직전에 작업자가 **PDA로 송장번호를 스캔하여 출하 확정**하는 화면.
도크 코드를 선택한 뒤, 해당 도크에 배정된 포장 건의 송장번호를 연속 스캔하면 건별로 즉시 출하 확정(`SHIPPED`) 처리된다.

### 9.2 업무 흐름

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  도크 선택   │ ──→ │ 대기 건 조회  │ ──→ │ 송장 바코드  │ ──→ │  출하 확정   │
│  (dock_cd)  │     │(COMPLETED ~  │     │    스캔      │     │  (SHIPPED)   │
│             │     │ MANIFESTED)  │     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 9.3 대상 사용자

| 사용자 | 역할 | 디바이스 |
|--------|------|----------|
| 출하 작업자 | 도크에서 상차 전 송장 스캔 | PDA (Android) |
| 출하 관리자 | 도크별 출하 현황 모니터링 | PDA / 태블릿 |

### 9.4 사전 조건

- 포장 작업이 완료되어 `PackingOrder` 상태가 `COMPLETED`, `LABEL_PRINTED`, 또는 `MANIFESTED`
- `PackingBox`에 `invoice_no`(송장번호)가 등록되어 있어야 함
- `PackingOrder`에 `dock_cd`가 배정되어 있어야 함

### 9.5 화면 레이아웃

```
┌──────────────────────────────────────────────────────┐
│  📦 PDA 출하 확정                    [초기화] [전체확정]│
├──────────────────────────────────────────────────────┤
│                                                       │
│  도크: [DOCK-01 ▼]                                    │
│                                                       │
│  ┌─── 현황 요약 ───────────────────────────────────┐ │
│  │  대기: 15건  │  스캔완료: 8건  │  총: 23건      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  송장 스캔: [________________________] 🔍             │
│                                                       │
│  ┌─ 스캔결과 ─┬─ 대기목록 ─┐                        │
│  └────────────┴────────────┘                         │
│                                                       │
│  [스캔결과 탭]                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ ✅ 1234567890  CJ대한통운  PACK-001  10:30   │    │
│  │ ✅ 1234567891  CJ대한통운  PACK-002  10:31   │    │
│  │ ✅ 1234567892  한진택배    PACK-003  10:32   │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  [대기목록 탭]                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ ⏳ PACK-004  SHP-004  CJ대한통운  2박스      │    │
│  │ ⏳ PACK-005  SHP-005  한진택배    1박스      │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 9.6 구역별 설명

| 구역 | 설명 |
|------|------|
| 헤더 | 페이지 제목, 초기화/전체확정 버튼 |
| 도크 선택 | `ox-select`로 도크 코드 선택 (변경 시 대기 건 자동 조회) |
| 현황 요약 | 대기/스캔완료/총 건수 실시간 카운트 |
| 송장 스캔 | `ox-input-barcode`로 송장 바코드 스캔 입력 |
| 탭 영역 | 스캔결과 탭 (출하 확정 완료 건) / 대기목록 탭 (미출하 건) |

### 9.7 상세 기능

#### 9.7.1 도크 선택

- `ox-select` 컴포넌트로 구현
- 도크 목록은 `packing_orders` 테이블에서 `DISTINCT dock_cd` 조회 (출하 대기 건이 있는 도크만)
- 도크 변경 시: 해당 도크의 출하 대기 건 조회 → 스캔 결과 초기화 → 바코드 입력 포커스

#### 9.7.2 송장 바코드 스캔 → 출하 확정

```
스캔 → 송장번호 유효성 검증 → 중복 체크 → 출하 확정 API 호출 → UI 갱신 → 포커스 리셋
```

- 대기 목록에서 송장번호 검색 → 없으면 에러 토스트
- 중복 스캔 체크 → 이미 확정이면 경고
- 출하 확정 API 호출 → 성공 시 스캔 완료 목록에 추가, 대기 목록에서 제거
- 복수 박스 주문: 마지막 박스 스캔 시 자동 포장 지시 출하 확정

#### 9.7.3 전체 출하 확정 (일괄)

- "전체확정" 버튼으로 현재 도크의 모든 대기 건 일괄 처리
- 확인 팝업 후 기존 `confirm_shipping_batch` API 활용

### 9.8 API 설계 (신규 3건)

#### 9.8.1 도크 목록 조회

```
GET /rest/ful_trx/shipping/dock_list
```

**Service**: `FulfillmentShippingService.getDockList()`

```sql
SELECT COALESCE(dock_cd, 'UNASSIGNED') AS dock_cd,
       COUNT(*) AS waiting_count,
       SUM(COALESCE(total_box, 0)) AS total_box_count
FROM packing_orders
WHERE domain_id = :domainId
  AND dock_cd IS NOT NULL
  AND status IN ('COMPLETED', 'LABEL_PRINTED', 'MANIFESTED')
GROUP BY dock_cd
ORDER BY dock_cd
```

**응답**: `[{ "dock_cd": "DOCK-01", "waiting_count": 15, "total_box_count": 23 }]`

#### 9.8.2 도크별 출하 대기 목록

```
GET /rest/ful_trx/shipping/waiting_list?dock_cd={dockCd}
```

**Service**: `FulfillmentShippingService.getWaitingList(dockCd)`

```sql
SELECT po.id, po.pack_order_no, po.shipment_no, po.wave_no,
       po.carrier_cd, po.total_box, po.total_wt, po.status,
       pb.invoice_no, pb.box_seq, pb.id AS box_id
FROM packing_orders po
LEFT JOIN packing_boxes pb ON pb.domain_id = po.domain_id
  AND pb.packing_order_id = po.id AND pb.status IN ('OPEN', 'CLOSED')
WHERE po.domain_id = :domainId AND po.dock_cd = :dockCd
  AND po.status IN ('COMPLETED', 'LABEL_PRINTED', 'MANIFESTED')
ORDER BY po.carrier_cd, po.pack_order_no, pb.box_seq
```

**응답**: `{ "summary": { ... }, "items": [{ pack_order_no, shipment_no, boxes: [...] }] }`

#### 9.8.3 송장번호로 출하 확정

```
POST /rest/ful_trx/shipping/confirm_by_invoice
```

**Service**: `FulfillmentShippingService.confirmShippingByInvoice(dockCd, invoiceNo)`

**요청**: `{ "dock_cd": "DOCK-01", "invoice_no": "1234567890" }`

**로직**:
1. `invoice_no`로 `packing_boxes` 조회 → `packing_order_id` 확보
2. `dock_cd` 일치 검증
3. 스캔된 박스 `status` → `SHIPPED`
4. 모든 박스 SHIPPED 시 `confirmShipping()` 호출
5. 응답: 스캔 결과 + 잔여 박스 수 + 전체 완료 여부

### 9.9 상태 전이

```
PackingOrder:  COMPLETED / LABEL_PRINTED / MANIFESTED  ──→  SHIPPED
PackingBox:    OPEN / CLOSED                           ──→  SHIPPED
```

기존 `FulfillmentShippingService.confirmShipping()` 로직을 **송장번호 기반으로 래핑**한 것이다.

### 9.10 프론트엔드 구현

| 항목 | 값 |
|------|-----|
| 파일명 | `pda-fulfillment-shipping.js` |
| 경로 | `frontend/packages/operato-wes/client/pages/pda/` |
| 태그명 | `pda-fulfillment-shipping` |
| 클래스 | `PdaFulfillmentShipping extends connect(store)(PageView)` |
| 라우트 | `things-factory.config.js`에 등록 |

**Properties**:
- `dockCd`, `dockList` — 도크 선택
- `waitingList`, `scannedList` — 데이터
- `currentTab` (`'scanned'` | `'waiting'`) — 탭 상태
- `loading`, `processing` — UI 상태
- `waitingCount`, `scannedCount`, `waitingBoxCount`, `scannedBoxCount` — 요약

### 9.11 에러 처리

| 에러 상황 | 메시지 | 처리 |
|----------|--------|------|
| 도크 미선택 상태에서 스캔 | "도크를 먼저 선택해주세요" | 바코드 입력 disabled |
| 존재하지 않는 송장번호 | "해당 송장번호의 출하 건을 찾을 수 없습니다" | 에러 토스트 + 진동 |
| 이미 출하 확정된 송장 | "이미 출하 확정된 송장입니다: {invoiceNo}" | 경고 토스트 |
| 다른 도크의 송장 | "이 송장은 {actualDock} 도크에 배정되어 있습니다" | 에러 토스트 + 진동 |
| 출하 불가 상태 | "포장 지시 상태가 {status}이므로 출하 확정할 수 없습니다" | 에러 토스트 |

### 9.12 구현 파일 목록

| # | 파일 | 작업 | 복잡도 |
|---|------|------|--------|
| 1 | `src/.../service/FulfillmentShippingService.java` | 수정 — getDockList, getWaitingList, confirmShippingByInvoice 추가 | 중간 (~120줄) |
| 2 | `src/.../rest/FulfillmentTransactionController.java` | 수정 — 3개 엔드포인트 추가 | 낮음 (~30줄) |
| 3 | `frontend/.../pages/pda/pda-fulfillment-shipping.js` | **신규** — PDA 출하 확정 화면 | 높음 (~500줄) |
| 4 | `frontend/.../client/route.ts` | 수정 — import 1줄 | 단순 |
| 5 | `frontend/.../things-factory.config.js` | 수정 — 등록 1줄 | 단순 |

---

## 10. PDA 피킹 화면 상세 설계

> 작성일: 2026-04-03
> 화면명: PDA 피킹 (PDA Fulfillment Picking)
> 파일: `frontend/packages/operato-wes/client/pages/pda/pda-fulfillment-picking.js`

### 10.1 목적

창고 내 보관랙을 돌아다니며 **PDA로 상품 바코드를 스캔하여 피킹 작업을 수행**하는 화면.
작업자가 피킹 지시를 선택한 뒤, 피킹 경로(rank) 순으로 로케이션과 상품 정보를 안내받고, 바코드 스캔으로 피킹을 확인한다.

### 10.2 업무 흐름

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 피킹지시 선택│ ──→ │ 피킹 시작    │ ──→ │ 로케이션 이동│ ──→ │ 바코드 스캔  │
│ (task 목록) │     │ (CREATED →   │     │ + 상품 피킹  │     │ + 수량 확인  │
│             │     │  IN_PROGRESS)│     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                     │
                                              ┌──────────────┐      │ 전체 완료
                                              │  피킹 완료   │ ◀────┘
                                              │ (COMPLETED)  │
                                              │ + 포장지시   │
                                              │   자동 생성  │
                                              └──────────────┘
```

### 10.3 대상 사용자

| 사용자 | 역할 | 디바이스 |
|--------|------|----------|
| 피킹 작업자 | 보관랙에서 상품 피킹 | PDA (Android) |
| 피킹 관리자 | 작업 할당 및 모니터링 | PDA / 태블릿 |

### 10.4 사전 조건

- OMS에서 웨이브 확정 → 피킹 지시(`PickingTask`) 생성 완료
- 피킹 지시 상태가 `CREATED` 또는 `IN_PROGRESS`
- 피킹 항목(`PickingTaskItem`)에 `from_loc_cd`, `sku_cd`, `barcode`, `order_qty` 정보 존재

### 10.5 화면 레이아웃

#### 10.5.1 피킹 지시 선택 화면 (초기)

```
┌──────────────────────────────────────────────────────┐
│  📋 PDA 피킹                            [새로고침]    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─── 내 피킹 작업 ───────────────────────────────┐ │
│  │ 🟡 PICK-20260403-001   W-20260403-001          │ │
│  │    개별피킹 · 5건/12EA · CREATED                │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ 🔵 PICK-20260403-002   W-20260403-002          │ │
│  │    토탈피킹 · 15건/48EA · IN_PROGRESS (3/15)    │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ 🟡 PICK-20260403-003   W-20260403-003          │ │
│  │    존별피킹 · A존 · 8건/24EA · CREATED          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 10.5.2 피킹 작업 화면

```
┌──────────────────────────────────────────────────────┐
│  ◀ PICK-20260403-001             [부족] [작업완료]    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─── 진행률 ────────────────────────────────────┐  │
│  │ ████████░░░░░░░░░░░░  3/5건  (12/20 EA)       │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── 현재 피킹 항목 ───────────────────────────┐  │
│  │                                                │  │
│  │  📍 로케이션                                   │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │        A-01-02-03                       │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  📦 상품: SKU-A001 (멀티비타민 60정)           │  │
│  │  🔢 수량: 5 EA                                │  │
│  │                                                │  │
│  │  바코드: [________________________] 🔍         │  │
│  │                                                │  │
│  │  피킹수량: [ 5 ] EA   [확인]                   │  │
│  │                                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ 피킹목록 ─┬─ 완료목록 ─┐                        │
│  └─────────────┴────────────┘                        │
│                                                       │
│  [피킹목록 탭]                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ ▶ #4  A-01-03-01  SKU-B002  3EA   RUN       │    │
│  │   #5  A-02-01-02  SKU-C003  2EA   RUN       │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  [완료목록 탭]                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ ✅ #1  A-01-01-01  SKU-D004  4EA   PICKED   │    │
│  │ ✅ #2  A-01-01-03  SKU-E005  3EA   PICKED   │    │
│  │ ⚠️ #3  A-01-02-01  SKU-F006  2EA   SHORT    │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 10.5.3 피킹 완료 화면

```
┌──────────────────────────────────────────────────────┐
│  PDA 피킹                                             │
├──────────────────────────────────────────────────────┤
│                                                       │
│              ✅ 피킹 완료!                             │
│                                                       │
│  ┌─── 결과 요약 ─────────────────────────────────┐  │
│  │  피킹지시: PICK-20260403-001                   │  │
│  │  피킹수량: 18 EA                               │  │
│  │  부족수량: 2 EA                                │  │
│  │  처리건수: 5건 (완료 4 / 부족 1)                │  │
│  │  소요시간: 12분 30초                            │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│        [다음 피킹 작업]    [목록으로]                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 10.6 구역별 설명

| 구역 | 설명 |
|------|------|
| 헤더 | 페이지 제목 / 피킹지시번호, 뒤로가기/부족/완료 버튼 |
| 진행률 바 | 전체 항목 대비 완료 항목 수 + 수량 표시 (프로그레스 바) |
| 현재 피킹 항목 | 로케이션(대형 폰트), 상품 정보, 바코드 스캔 입력, 수량 입력 |
| 탭 영역 | 피킹목록 탭 (미완료 항목) / 완료목록 탭 (PICKED/SHORT 항목) |

### 10.7 상세 기능

#### 10.7.1 피킹 지시 선택

- 화면 진입 시 `GET /rest/ful_trx/picking_tasks/todo` 호출하여 할당된 피킹 지시 목록 표시
- 카드 형태로 표시: 피킹지시번호, 웨이브번호, 피킹 유형(개별/토탈/존별), 항목수/수량, 상태
- 상태별 색상: `CREATED` = 노랑, `IN_PROGRESS` = 파랑
- 카드 클릭 시 피킹 작업 화면으로 전환

#### 10.7.2 피킹 시작

- `CREATED` 상태 지시 선택 시 자동으로 `POST /rest/ful_trx/picking_tasks/{id}/start` 호출
- 상태가 `IN_PROGRESS`로 전환되고 모든 항목이 `WAIT` → `RUN` 변경
- 이미 `IN_PROGRESS`인 경우 시작 API 호출 생략 (이어하기)

#### 10.7.3 피킹 항목 순차 안내

- `GET /rest/ful_trx/picking_tasks/{id}/items`로 항목 목록 로드
- `rank` 순으로 정렬하여 미완료(`RUN`) 항목 중 첫 번째를 현재 피킹 항목으로 표시
- 현재 항목 정보:
  - **로케이션** (`from_loc_cd`): 대형 폰트로 눈에 띄게 표시
  - **상품**: `sku_cd` + `sku_nm`
  - **수량**: `order_qty` EA
  - **바코드 스캔 입력**: `ox-input-barcode` 컴포넌트

#### 10.7.4 바코드 스캔 → 피킹 확인

```
스캔 → 바코드 매칭 → 수량 확인 → 피킹 API → 다음 항목 이동 → 포커스 리셋
```

**바코드 매칭 로직** (PC 피킹과 동일):
1. 현재 항목의 `barcode` 또는 `sku_cd`와 비교
2. 일치하면: 해당 항목 피킹 처리
3. 불일치하면: 전체 미완료 항목에서 검색
   - 발견: 해당 항목으로 자동 전환 후 피킹 처리
   - 미발견: 에러 토스트 + 진동

**수량 처리**:
- 스캔 시 `order_qty`를 기본값으로 자동 입력 (대부분 1건씩 피킹)
- 수량 수정이 필요한 경우 수량 입력 필드에서 직접 변경 후 확인 버튼
- `POST /rest/ful_trx/picking_tasks/{id}/items/{item_id}/pick` 호출 (파라미터: `{ pick_qty }`)

**자동 다음 항목 이동**:
- 피킹 성공 시 다음 `RUN` 상태 항목으로 자동 이동
- 바코드 입력 필드 자동 포커스

#### 10.7.5 부족 처리 (Short)

- 헤더의 "부족" 버튼 또는 항목별 스와이프로 부족 처리
- 확인 팝업: "현재 항목을 부족 처리하시겠습니까?"
- `POST /rest/ful_trx/picking_tasks/{id}/items/{item_id}/short` 호출
- 파라미터: `{ short_qty: order_qty, pick_qty: 0 }` (전량 부족 기본)
- 부분 피킹 후 부족: `{ short_qty: order_qty - pick_qty, pick_qty: 실제피킹수 }`

#### 10.7.6 피킹 완료

- 모든 항목이 `PICKED` 또는 `SHORT` 상태가 되면 자동으로 완료 안내
- "작업완료" 버튼 클릭 시 `POST /rest/ful_trx/picking_tasks/{id}/complete` 호출
- 완료 화면 표시: 결과 요약 (피킹수량, 부족수량, 소요시간)
- "다음 피킹 작업" 버튼: 다음 할당 지시 자동 선택
- "목록으로" 버튼: 피킹 지시 선택 화면으로 복귀

### 10.8 API 사용 (기존 API — 신규 없음)

PDA 피킹은 기존 PC 피킹과 동일한 API를 사용한다. **신규 API 추가 불필요.**

| # | API | 메서드 | 용도 |
|---|-----|--------|------|
| 1 | `/rest/ful_trx/picking_tasks/todo` | GET | 할당 피킹 지시 목록 |
| 2 | `/rest/ful_trx/picking_tasks/{id}` | GET | 피킹 지시 상세 |
| 3 | `/rest/ful_trx/picking_tasks/{id}/items` | GET | 피킹 항목 목록 |
| 4 | `/rest/ful_trx/picking_tasks/{id}/start` | POST | 피킹 시작 |
| 5 | `/rest/ful_trx/picking_tasks/{id}/items/{item_id}/pick` | POST | 개별 아이템 피킹 확인 |
| 6 | `/rest/ful_trx/picking_tasks/{id}/items/{item_id}/short` | POST | 부족 처리 |
| 7 | `/rest/ful_trx/picking_tasks/{id}/complete` | POST | 피킹 완료 |

### 10.9 상태 전이

```
PickingTask:      CREATED  ──→  IN_PROGRESS  ──→  COMPLETED
PickingTaskItem:  WAIT     ──→  RUN          ──→  PICKED / SHORT
```

- **CREATED → IN_PROGRESS**: 피킹 시작 시 (항목 전체 WAIT → RUN)
- **RUN → PICKED**: 바코드 스캔 + 수량 확인 시
- **RUN → SHORT**: 부족 처리 시
- **IN_PROGRESS → COMPLETED**: 모든 항목 처리 후 완료 버튼

### 10.10 프론트엔드 구현

| 항목 | 값 |
|------|-----|
| 파일명 | `pda-fulfillment-picking.js` |
| 경로 | `frontend/packages/operato-wes/client/pages/pda/` |
| 태그명 | `pda-fulfillment-picking` |
| 클래스 | `PdaFulfillmentPicking extends connect(store)(PageView)` |
| 라우트 | `things-factory.config.js`에 등록 |

**Properties (상태)**:

| Property | 타입 | 설명 |
|----------|------|------|
| `mode` | String | 화면 모드 (`'list'` / `'work'` / `'complete'`) |
| `taskList` | Array | 피킹 지시 목록 |
| `currentTask` | Object | 선택된 피킹 지시 |
| `taskItems` | Array | 피킹 항목 전체 목록 |
| `currentItem` | Object | 현재 피킹 대상 항목 |
| `currentItemIndex` | Number | 현재 항목 인덱스 |
| `pickQty` | Number | 피킹 수량 입력값 |
| `currentTabKey` | String | 탭 키 (`'todo'` / `'done'`) |
| `loading` | Boolean | 로딩 상태 |
| `processing` | Boolean | API 처리 중 상태 |
| `startedAt` | String | 작업 시작 시각 (소요시간 계산용) |

**주요 메서드**:

| 메서드 | 설명 |
|--------|------|
| `_loadTaskList()` | 피킹 지시 목록 조회 |
| `_selectTask(task)` | 피킹 지시 선택 → 시작 → 항목 로드 |
| `_loadTaskItems()` | 피킹 항목 목록 로드 + 현재 항목 설정 |
| `_moveToNextItem()` | 다음 미완료 항목으로 이동 |
| `_onScanBarcode(e)` | 바코드 스캔 핸들러 (매칭 → 피킹 확인) |
| `_findItemByBarcode(barcode)` | 바코드/SKU로 항목 검색 |
| `_confirmPick()` | 피킹 확인 API 호출 |
| `_shortItem()` | 부족 처리 |
| `_completeTask()` | 피킹 완료 |
| `_goBack()` | 목록 화면으로 복귀 |
| `_selectNextTask()` | 다음 피킹 지시 자동 선택 |

### 10.11 에러 처리

| 에러 상황 | 메시지 | 처리 |
|----------|--------|------|
| 할당된 피킹 지시 없음 | "할당된 피킹 작업이 없습니다" | 빈 목록 + 새로고침 안내 |
| 바코드 불일치 | "일치하는 상품을 찾을 수 없습니다: {barcode}" | 에러 토스트 + 진동 |
| 이미 피킹 완료된 항목 스캔 | "이미 피킹 완료된 상품입니다" | 경고 토스트 |
| 피킹 시작 실패 | "피킹 지시를 시작할 수 없습니다: {message}" | 에러 토스트 |
| 피킹 완료 실패 | "피킹 완료 처리에 실패했습니다: {message}" | 에러 토스트 |
| 수량 초과 입력 | "지시 수량({order_qty})을 초과할 수 없습니다" | 입력값 제한 |
| 네트워크 오류 | "서버 연결에 실패했습니다. 다시 시도해주세요" | 에러 토스트 + 재시도 안내 |

### 10.12 PC 피킹과의 차이점

| 항목 | PC 피킹 (`fulfillment-picking-pc.js`) | PDA 피킹 (`pda-fulfillment-picking.js`) |
|------|--------------------------------------|----------------------------------------|
| 레이아웃 | 2패널 (좌: 목록, 우: 작업) | 단일 화면 (모드 전환: list → work → complete) |
| 디바이스 | 데스크탑/모니터 | 핸드헬드 PDA (5~6인치) |
| 바코드 입력 | USB 스캐너 (키보드 에뮬레이션) | PDA 내장 스캐너 (`ox-input-barcode`) |
| 로케이션 표시 | 작업 패널 상단 | 화면 중앙 대형 폰트 (이동 시 한눈에 확인) |
| 수량 입력 | 마우스/키보드 | 터치/PDA 키패드 |
| 항목 테이블 | 전체 항목 한 눈에 표시 | 탭으로 분리 (미완료/완료) |
| 바코드 매칭 | 순서 무관 스캔 허용 | 동일 (순서 무관 스캔) |

### 10.13 구현 파일 목록

| # | 파일 | 작업 | 복잡도 |
|---|------|------|--------|
| 1 | `frontend/.../pages/pda/pda-fulfillment-picking.js` | **신규** — PDA 피킹 화면 | 높음 (~600줄) |
| 2 | `frontend/.../client/route.ts` | 수정 — import 1줄 | 단순 |
| 3 | `frontend/.../things-factory.config.js` | 수정 — 등록 1줄 | 단순 |

> **참고**: 백엔드 신규 API 없음. 기존 피킹 트랜잭션 API(`/rest/ful_trx/picking_tasks/*`)를 그대로 사용.

---

## 11. PDA 포장 화면 상세 설계

> 작성일: 2026-04-03
> 화면명: PDA 포장 (PDA Fulfillment Packing)
> 파일: `frontend/packages/operato-wes/client/pages/pda/pda-fulfillment-packing.js`

### 11.1 목적

포장 스테이션에서 작업자가 **PDA로 상품 바코드를 스캔하여 검수(inspection)하고, 박스에 포장(packing)하여 출고를 확정**하는 화면.
PC 포장 화면(`fulfillment-packing-pc.js`)의 PDA 최적화 버전으로, 동일한 검수→포장→완료 워크플로우를 터치/바코드 중심 UI로 제공한다.

### 11.2 업무 흐름

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 포장지시 선택│ ──→ │ 포장 시작    │ ──→ │ 바코드 스캔  │ ──→ │ 포장 정보    │ ──→ │  포장 완료   │
│ (todo 목록) │     │ (CREATED →   │     │ + 검수 확인  │     │ 박스/운송장  │     │ (COMPLETED)  │
│             │     │  IN_PROGRESS)│     │ (전 항목)    │     │  입력        │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 11.3 대상 사용자

| 사용자 | 역할 | 디바이스 |
|--------|------|----------|
| 포장 작업자 | 포장 스테이션에서 검수/포장 실행 | PDA (Android) |
| 포장 관리자 | 작업 할당 및 모니터링 | PDA / 태블릿 |

### 11.4 사전 조건

- 피킹 완료 후 포장 지시(`PackingOrder`)가 생성되어 있어야 함
- 포장 지시 상태가 `CREATED` 또는 `IN_PROGRESS`
- 포장 항목(`PackingOrderItem`)에 `sku_cd`, `barcode`, `order_qty` 정보 존재

### 11.5 화면 레이아웃

#### 11.5.1 포장 지시 선택 화면 (list 모드)

```
┌──────────────────────────────────────────────────────┐
│  📦 PDA 포장                              [새로고침]   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─── 현황 요약 ───────────────────────────────────┐ │
│  │  대기: 8건  │  진행: 2건  │  완료: 15건          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ 대기 ──┬─ 진행중 ──┬─ 완료 ──┐                  │
│  └──────────┴───────────┴─────────┘                  │
│                                                       │
│  ┌─── 포장 지시 목록 ─────────────────────────────┐ │
│  │ 🟡 PACK-20260403-001   SHP-20260403-001        │ │
│  │    SKU 3종 · 5EA · CJ대한통운 · CREATED         │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ 🟡 PACK-20260403-002   SHP-20260403-002        │ │
│  │    SKU 1종 · 2EA · 한진택배 · CREATED           │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ 🔵 PACK-20260403-003   SHP-20260403-003        │ │
│  │    SKU 2종 · 8EA · CJ대한통운 · IN_PROGRESS     │ │
│  │    ████░░░░░░  2/5 검수완료                     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  포장번호 스캔: [________________________] 🔍         │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 11.5.2 검수 작업 화면 (inspection 모드)

```
┌──────────────────────────────────────────────────────┐
│  ◀ PACK-20260403-001                  [건너뛰기]      │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─── 진행률 ────────────────────────────────────┐  │
│  │ ████████░░░░░░░░░░░░  2/3종  (3/5 EA)         │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── 현재 검수 항목 ─────────────────────────────┐ │
│  │                                                  │ │
│  │  📦 상품: SKU-A001 (멀티비타민 60정)             │ │
│  │  🔢 수량: 0 / 2 EA                              │ │
│  │  📋 LOT: LOT-2026-001  유통기한: 2027-06-30     │ │
│  │                                                  │ │
│  │  바코드: [________________________] 🔍           │ │
│  │                                                  │ │
│  │  ┌─ 스캔 결과 피드백 ────────────────────────┐  │ │
│  │  │ ✅ SKU-A001 스캔 확인 (1/2)                │  │ │
│  │  └───────────────────────────────────────────┘  │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ 대기 ──┬─ 완료 ──┐                               │
│  └──────────┴─────────┘                               │
│                                                       │
│  [대기 탭]                                            │
│  ┌──────────────────────────────────────────────┐    │
│  │ ▶ SKU-A001  멀티비타민  2EA  0/2  WAIT       │    │
│  │   SKU-B002  오메가3     1EA  0/1  WAIT       │    │
│  │   SKU-C003  프로바이틱  2EA  0/2  WAIT       │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 11.5.3 포장 정보 입력 화면 (packing 모드)

```
┌──────────────────────────────────────────────────────┐
│  ◀ PACK-20260403-001                                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─── ✅ 검수 완료 ──────────────────────────────┐  │
│  │  검수 항목: 3종 5EA 전체 완료                   │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── 포장 정보 ──────────────────────────────────┐ │
│  │                                                  │ │
│  │  📦 박스 유형                                    │ │
│  │  [SMALL] [MEDIUM] [LARGE] [XLARGE]              │ │
│  │                                                  │ │
│  │  📦 박스 수량: [ 1 ]                             │ │
│  │                                                  │ │
│  │  ⚖️ 박스 중량(kg): [ 0.0 ]                      │ │
│  │                                                  │ │
│  │  🏷️ 운송장번호                                   │ │
│  │  [________________________] 🔍                   │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│        [출고 확정]                                     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 11.5.4 포장 완료 화면 (complete 모드)

```
┌──────────────────────────────────────────────────────┐
│  PDA 포장                                             │
├──────────────────────────────────────────────────────┤
│                                                       │
│              ✅ 포장 완료!                             │
│                                                       │
│  ┌─── 결과 요약 ─────────────────────────────────┐  │
│  │  포장지시: PACK-20260403-001                   │  │
│  │  검수수량: 5 EA (3종)                          │  │
│  │  박스유형: MEDIUM × 1박스                      │  │
│  │  운송장: 1234567890                            │  │
│  │  택배사: CJ대한통운                             │  │
│  │  소요시간: 3분 45초                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│        [다음 포장 작업]    [목록으로]                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 11.6 구역별 설명

| 구역 | 설명 |
|------|------|
| 헤더 | 페이지 제목 / 포장지시번호, 뒤로가기/건너뛰기 버튼 |
| 현황 요약 | 대기/진행/완료 건수 카운트 (list 모드) |
| 필터 칩 | 대기/진행중/완료 필터 (list 모드) |
| 포장번호 스캔 | 포장번호 바코드 스캔으로 빠른 선택 (list 모드) |
| 진행률 바 | 전체 검수 항목 대비 완료 항목 수 + 수량 (inspection 모드) |
| 현재 검수 항목 | 상품 정보, 수량 카운트, 바코드 스캔 입력, 스캔 결과 피드백 (inspection 모드) |
| 탭 영역 | 대기/완료 탭 (inspection 모드) / 포장 정보 입력 (packing 모드) |

### 11.7 상세 기능

#### 11.7.1 포장 지시 선택

- 화면 진입 시 `GET /rest/ful_trx/packing_orders/todo` 호출하여 대기/진행 중 포장 지시 목록 표시
- 카드 형태로 표시: 포장지시번호, 출하번호, SKU 종수, 수량, 택배사, 상태
- 상태별 색상: `CREATED` = 노랑, `IN_PROGRESS` = 파랑
- `IN_PROGRESS` 상태 카드는 검수 진행률(프로그레스 바) 추가 표시
- 카드 클릭 시 검수 작업 화면으로 전환
- 하단 포장번호 스캔 입력으로 포장번호 바코드 스캔하여 빠르게 선택 가능

#### 11.7.2 포장 시작

- `CREATED` 상태 지시 선택 시 자동으로 `POST /rest/ful_trx/packing_orders/{id}/start` 호출
- 상태가 `IN_PROGRESS`로 전환
- 이미 `IN_PROGRESS`인 경우 시작 API 호출 생략 (이어하기)
- 포장 항목 로드: `GET /rest/ful_trx/packing_order_items?packing_order_id={id}`

#### 11.7.3 바코드 스캔 → 검수 확인

```
스캔 → 바코드 매칭 → 검수수량 +1 → 수량 충족 시 자동 완료 → 다음 항목 → 포커스 리셋
```

**바코드 매칭 로직** (PC 포장과 동일):
1. 미완료 항목(`status !== 'INSPECTED'`) 중에서 `barcode` 또는 `sku_cd`와 비교
2. 매칭됨 + 수량 < 주문수량: 검수수량(`insp_qty`) +1 증가
3. 매칭됨 + 수량 ≥ 주문수량 (모두 스캔): `POST /rest/ful_trx/packing_order_items/{id}/finish` 호출
4. 매칭 못 함: 에러 토스트 + 진동

**검수 항목 자동 완료**:
- `insp_qty` ≥ `order_qty`이면 자동으로 검수 완료 API 호출
- 응답에서 상태 `INSPECTED`로 변경 → 완료 탭으로 이동

**전체 검수 완료 감지**:
- 모든 항목이 `INSPECTED` 상태가 되면 자동으로 포장 정보 입력 화면(packing 모드)으로 전환

#### 11.7.4 포장 정보 입력 + 출고 확정

검수 완료 후 포장 정보를 입력하고 출고를 확정한다:

1. **박스 유형 선택**: `SMALL` / `MEDIUM` / `LARGE` / `XLARGE`
   - 자동 추천: 총 수량 기반 (≤3 → SMALL, ≤10 → MEDIUM, ≤30 → LARGE, 그 외 → XLARGE)
2. **박스 수량**: 기본값 1
3. **박스 중량(kg)**: 기본값 0
4. **운송장번호**: 바코드 스캔 또는 수동 입력 (필수)

"출고 확정" 버튼 클릭 시:
- `POST /rest/ful_trx/packing_orders/{id}/complete` 호출
- Body: `{ boxType, boxCount, boxWeight, trackingNo }`
- 성공 시 complete 모드로 전환

#### 11.7.5 포장 완료

- 완료 통계 표시: 검수 수량, 박스 유형/수량, 운송장번호, 택배사, 소요시간
- "다음 포장 작업" 버튼: 다음 대기 중 포장 지시 자동 선택
- "목록으로" 버튼: 포장 지시 선택 화면으로 복귀

### 11.8 API 사용 (기존 API — 신규 없음)

PDA 포장은 기존 PC 포장과 동일한 API를 사용한다. **신규 API 추가 불필요.**

| # | API | 메서드 | 용도 |
|---|-----|--------|------|
| 1 | `/rest/ful_trx/packing_orders/todo` | GET | 대기 포장 지시 목록 |
| 2 | `/rest/ful_trx/packing_orders/done` | GET | 완료 포장 지시 목록 |
| 3 | `/rest/ful_trx/packing_order_items?packing_order_id={id}` | GET | 포장 항목 목록 |
| 4 | `/rest/ful_trx/packing_orders/{id}/start` | POST | 포장 시작 |
| 5 | `/rest/ful_trx/packing_order_items/{id}/finish` | POST | 검수 항목 완료 |
| 6 | `/rest/ful_trx/packing_orders/{id}/complete` | POST | 포장 완료 (출고 확정) |

### 11.9 상태 전이

```
PackingOrder:      CREATED  ──→  IN_PROGRESS  ──→  COMPLETED
PackingOrderItem:  WAIT     ──→  INSPECTED    ──→  PACKED
```

- **CREATED → IN_PROGRESS**: 포장 시작 시
- **WAIT → INSPECTED**: 바코드 스캔 + 수량 확인 시 (검수 완료)
- **INSPECTED → PACKED**: 포장 완료 API 호출 시 (자동 일괄 전환)
- **IN_PROGRESS → COMPLETED**: 포장 정보 입력 후 출고 확정 시

### 11.10 프론트엔드 구현

| 항목 | 값 |
|------|-----|
| 파일명 | `pda-fulfillment-packing.js` |
| 경로 | `frontend/packages/operato-wes/client/pages/pda/` |
| 태그명 | `pda-fulfillment-packing` |
| 클래스 | `PdaFulfillmentPacking extends connect(store)(PageView)` |
| 라우트 | `things-factory.config.js`에 등록 |

**Properties (상태)**:

| Property | 타입 | 설명 |
|----------|------|------|
| `mode` | String | 화면 모드 (`'list'` / `'inspection'` / `'packing'` / `'complete'`) |
| `packingOrders` | Array | 포장 지시 목록 |
| `filterStatus` | String | 필터 (`'ALL'` / `'CREATED'` / `'IN_PROGRESS'` / `'COMPLETED'`) |
| `selectedOrder` | Object | 선택된 포장 지시 |
| `packingItems` | Array | 검수 항목 전체 목록 |
| `currentItem` | Object | 현재 검수 대상 항목 |
| `currentItemIndex` | Number | 현재 항목 인덱스 |
| `completedCount` | Number | 검수 완료된 항목 수 |
| `totalCount` | Number | 총 검수 대상 항목 수 |
| `lastScannedItem` | Object | 마지막 스캔 결과 `{success, message}` |
| `currentTabKey` | String | 탭 키 (`'waiting'` / `'done'`) |
| `boxType` | String | 박스 유형 (`'SMALL'` / `'MEDIUM'` / `'LARGE'` / `'XLARGE'`) |
| `boxCount` | Number | 박스 수량 (기본 1) |
| `boxWeight` | Number | 박스 중량 (기본 0) |
| `trackingNo` | String | 운송장번호 |
| `loading` | Boolean | 로딩 상태 |
| `processing` | Boolean | API 처리 중 상태 |
| `startedAt` | String | 작업 시작 시각 (소요시간 계산용) |

**주요 메서드**:

| 메서드 | 설명 |
|--------|------|
| `_loadPackingOrders()` | 포장 지시 목록 조회 (todo + done) |
| `_selectOrder(order)` | 포장 지시 선택 → 시작 → 항목 로드 |
| `_onScanPackingOrder(barcode)` | 포장번호 바코드 스캔으로 빠른 선택 |
| `_loadPackingItems()` | 포장 항목 로드 + 현재 항목 설정 |
| `_moveToNextItem()` | 다음 미검수 항목으로 이동 |
| `_onBarcodeInput(e)` | 바코드 스캔 핸들러 (매칭 → 검수 수량 증가) |
| `_findItemByBarcode(barcode)` | 바코드/SKU로 항목 검색 |
| `_confirmInspection(item)` | 검수 완료 API 호출 |
| `_onInspectionComplete()` | 전체 검수 완료 → packing 모드 전환 |
| `_recommendBoxType()` | 수량 기반 박스 유형 자동 추천 |
| `_confirmRelease()` | 포장 완료 (출고 확정) API 호출 |
| `_goBack()` | 목록 화면으로 복귀 |
| `_selectNextOrder()` | 다음 포장 지시 자동 선택 |
| `_refresh()` | 목록 새로고침 |

### 11.11 에러 처리

| 에러 상황 | 메시지 | 처리 |
|----------|--------|------|
| 대기 중 포장 지시 없음 | "대기 중인 포장 작업이 없습니다" | 빈 목록 + 새로고침 안내 |
| 바코드 불일치 | "일치하는 상품을 찾을 수 없습니다: {barcode}" | 에러 토스트 + 진동 |
| 이미 검수 완료된 항목 스캔 | "이미 검수 완료된 상품입니다" | 경고 토스트 |
| 포장 시작 실패 | "포장 작업을 시작할 수 없습니다: {message}" | 에러 토스트 |
| 운송장번호 미입력 | "운송장번호를 입력해주세요" | 입력 필드 하이라이트 |
| 포장 완료 실패 | "포장 완료 처리에 실패했습니다: {message}" | 에러 토스트 |
| 네트워크 오류 | "서버 연결에 실패했습니다. 다시 시도해주세요" | 에러 토스트 + 재시도 안내 |

### 11.12 PC 포장과의 차이점

| 항목 | PC 포장 (`fulfillment-packing-pc.js`) | PDA 포장 (`pda-fulfillment-packing.js`) |
|------|--------------------------------------|----------------------------------------|
| 레이아웃 | 2패널 (좌: 목록, 우: 작업) | 단일 화면 (모드 전환: list → inspection → packing → complete) |
| 디바이스 | 데스크탑/모니터 | 핸드헬드 PDA (5~6인치) |
| 바코드 입력 | USB 스캐너 (키보드 에뮬레이션) | PDA 내장 스캐너 (`ox-input-barcode`) |
| 검수 테이블 | 전체 항목 한 눈에 표시 | 탭으로 분리 (대기/완료), 현재 항목 강조 표시 |
| 단축키 | F2(검수)/F5(새로고침)/F8(출고)/Esc(닫기) | 없음 (터치 전용) |
| 포장 정보 입력 | 같은 패널 내 인라인 입력 | 별도 화면(packing 모드)으로 분리 |
| 포장번호 선택 | 좌측 패널 목록 클릭 | 카드 목록 또는 포장번호 바코드 스캔 |

### 11.13 구현 파일 목록

| # | 파일 | 작업 | 복잡도 |
|---|------|------|--------|
| 1 | `frontend/.../pages/pda/pda-fulfillment-packing.js` | **신규** — PDA 포장 화면 | 높음 (~700줄) |
| 2 | `frontend/.../client/route.ts` | 수정 — import 1줄 | 단순 |
| 3 | `frontend/.../things-factory.config.js` | 수정 — 등록 1줄 | 단순 |

> **참고**: 백엔드 신규 API 없음. 기존 포장 트랜잭션 API(`/rest/ful_trx/packing_orders/*`, `/rest/ful_trx/packing_order_items/*`)를 그대로 사용.
