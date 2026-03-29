# 수출(Export) 화면 설계

> 작성일: 2026-03-28
> 기준: Things Factory 프론트엔드 프레임워크
> 참조: `docs/design/oms-table-design.md` (section 5.8~5.9, 7.8~7.11)

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

국제 수출(`ship_type = EXPORT`) 주문의 **무역 조건·통관·운송·서류** 관리를 위한 전용 화면을 설계합니다.
기존 OMS/Fulfillment 화면이 국내 출하(NORMAL) 중심이므로, 수출 프로세스 고유의 통관 워크플로우,
선적 스케줄 관리, 수출 서류(CI/PL/B/L) 출력 등을 별도 모듈로 분리합니다.

### 1.2 설계 원칙

1. **통관 프로세스 중심**: PENDING → DECLARED → APPROVED 통관 워크플로우 시각화
2. **선적 스케줄 관리**: ETD/ETA 기반 일정 추적 및 지연 알림
3. **무역 서류 통합**: Commercial Invoice, Packing List, B/L 발행·관리 일원화
4. **기존 OMS 연계**: `shipment_orders` 기반 위에 수출 확장 정보(`shipment_export_details`) 1:1 연결
5. **메타데이터 기반**: Things Factory MetaGrist 활용

### 1.3 대상 사용자

| 사용자 | 역할 | 주요 화면 |
|--------|------|----------|
| 수출 관리자 | 수출 주문 등록, 통관 신고, 서류 관리 | 대시보드, 수출 주문 목록/상세 |
| 통관 담당자 | 통관 신고 접수, 승인/반려 처리 | 통관 현황 |
| 물류 관리자 | 선적 스케줄 관리, 컨테이너 추적 | 선적 스케줄 |
| 영업 담당자 | 수출 현황 모니터링 | 대시보드 |

---

## 2. 화면 구성 개요

### 2.1 화면 맵

```
export-home (수출 대시보드)
├─ 수출 주문 관리
│  ├─ export-order-list (수출 주문 목록)
│  └─ export-order-detail (수출 주문 상세 팝업)
├─ 통관 관리
│  └─ customs-status-list (통관 현황)
└─ 선적 관리
   └─ shipment-schedule (선적 스케줄)
```

### 2.2 수출 프로세스 흐름과 화면 매핑

```
 OMS 주문 등록 (ship_type=EXPORT)
       │
       ▼
 ┌─────────────────────────────┐
 │  수출 확장 정보 등록          │  → export-order-detail (탭2: 무역/통관)
 │  (무역조건, 인코텀즈, 통화)   │
 └─────────────┬───────────────┘
               │
               ▼
 ┌─────────────────────────────┐
 │  수출 품목 정보 등록          │  → export-order-detail (탭4: 수출 품목)
 │  (HS코드, 원산지, 외화금액)   │
 └─────────────┬───────────────┘
               │
               ▼
 ┌─────────────────────────────┐
 │  통관 신고                    │  → customs-status-list / export-order-detail
 │  PENDING → DECLARED          │
 └─────────────┬───────────────┘
               │
               ▼
 ┌─────────────────────────────┐
 │  통관 승인                    │  → customs-status-list
 │  DECLARED → APPROVED         │
 └─────────────┬───────────────┘
               │
               ▼
 ┌─────────────────────────────┐
 │  B/L 등록 + 선적 정보 확정    │  → export-order-detail (탭3: 운송/선적)
 │  (선박, 항차, 컨테이너 등)    │    shipment-schedule
 └─────────────┬───────────────┘
               │
               ▼
 ┌─────────────────────────────┐
 │  수출 서류 발행               │  → export-order-detail (탭5: 서류 관리)
 │  (CI, PL, B/L)              │
 └─────────────┬───────────────┘
               │
               ▼
 ┌─────────────────────────────┐
 │  출하 확정 (Fulfillment)      │  → 기존 packing-order-detail
 │  SHIPPED                     │
 └──────────────────────────────┘
```

### 2.3 통관 상태 전이 및 색상 매핑

#### 2.3.1 통관 상태 정의 및 색상

| 상태 | 코드 | 색상 | HEX | 설명 |
|------|------|------|-----|------|
| 신고 대기 | `PENDING` | 주황 | `#FF9800` | 수출 정보 등록, 통관 신고 전 |
| 신고 완료 | `DECLARED` | 파란 | `#2196F3` | 세관에 수출 신고 접수 |
| 통관 승인 | `APPROVED` | 녹색 | `#4CAF50` | 세관 심사 통과, 선적 가능 |
| 통관 반려 | `REJECTED` | 빨간 | `#D32F2F` | 세관 심사 반려, 보정 필요 |

#### 2.3.2 통관 상태 전이 다이어그램

```
PENDING ──→ DECLARED ──→ APPROVED
                │
                └──→ REJECTED
                       │
                       └──→ DECLARED (재신고)
```

#### 2.3.3 운송 수단별 색상

| 운송 수단 | 코드 | 색상 | HEX |
|----------|------|------|-----|
| 해상 | `SEA` | 파란 | `#1565C0` |
| 항공 | `AIR` | 인디고 | `#303F9F` |
| 육상 | `TRUCK` | 주황 | `#FF9800` |
| 철도 | `RAIL` | 보라 | `#7B1FA2` |

### 2.4 라우트 등록

**route.js 등록 경로**:

| 경로 | 화면 파일 | 메뉴명 |
|------|----------|--------|
| `/export-home` | `pages/export/export-home.js` | 수출 대시보드 |
| `/export-order-list` | `pages/export/export-order-list.js` | 수출 주문 목록 |
| `/customs-status-list` | `pages/export/customs-status-list.js` | 통관 현황 |
| `/shipment-schedule` | `pages/export/shipment-schedule.js` | 선적 스케줄 |

팝업 (route.js 미등록):
- `export-order-detail` — 목록에서 `UiUtil.openPopupByElement()` 호출

---

## 3. 화면별 상세 설계

### 3.1 수출 대시보드 (export-home)

#### 목적
수출 주문의 통관·선적·서류 현황을 한눈에 파악하고 주요 기능에 빠르게 접근

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  🌐 수출 대시보드                                        2026-03-28  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ① 통관 상태별 현황 (카드)                                          │
│  ┌──────────┬──────────┬──────────┬──────────┐                      │
│  │ ⏳ 신고대기│ 📋 신고완료│ ✅ 승인  │ ❌ 반려  │                      │
│  │ PENDING  │DECLARED  │APPROVED  │REJECTED  │                      │
│  │   12건   │    8건   │   45건   │    2건   │                      │
│  └──────────┴──────────┴──────────┴──────────┘                      │
│                                                                      │
│  ② 운송 수단별 현황 (도넛)      ③ 목적지 국가별 현황 (막대)         │
│  ┌────────────────────────┐  ┌──────────────────────────────┐      │
│  │     ◐ 해상(SEA): 55%  │  │ 미국:    ████████████  45건   │      │
│  │     ◑ 항공(AIR): 30%  │  │ 중국:    ██████████    35건   │      │
│  │     ◒ 육상(TRUCK): 10%│  │ 일본:    ████████      28건   │      │
│  │     ◓ 철도(RAIL):  5% │  │ 베트남:  ██████        22건   │      │
│  └────────────────────────┘  │ 독일:    ████          15건   │      │
│                               └──────────────────────────────┘      │
│                                                                      │
│  ④ 금주 출항/도착 예정                                              │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  월  │  화  │  수  │  목  │  금  │  토  │  일             │      │
│  │      │ ETD:3│ ETD:2│      │ ETA:5│ ETD:1│                 │      │
│  │      │ ETA:1│      │ ETA:2│      │      │                 │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ⑤ 주의 항목 (알림)                                                 │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ 🚨 통관 반려: 2건 (보정 필요)                              │      │
│  │ ⚠️ ETD 3일 이내: 5건 (선적 준비 필요)                     │      │
│  │ ⏰ B/L 미등록: 3건 (통관 승인 후 미처리)                   │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ⑥ 바로가기                                                         │
│  ┌──────────┬──────────┬──────────┬──────────┐                      │
│  │ 📋 수출   │ 🛃 통관   │ 🚢 선적   │ 📊 OMS   │                      │
│  │  주문목록 │  현황    │  스케줄  │  대시보드 │                      │
│  └──────────┴──────────┴──────────┴──────────┘                      │
│                                                                      │
│  ⑦ 최근 수출 주문 내역                                              │
│  ┌────────────────┬──────┬────────┬──────┬──────┬──────┬──────┐    │
│  │ 출하번호        │ 목적지│인코텀즈│운송수단│ B/L  │통관상태│주문상태│    │
│  ├────────────────┼──────┼────────┼──────┼──────┼──────┼──────┤    │
│  │ SHP20260328-E01│ US   │ FOB    │ SEA  │BL-01 │ 승인 │ 할당 │    │
│  │ SHP20260328-E02│ CN   │ CIF    │ AIR  │  -   │ 대기 │ 확정 │    │
│  └────────────────┴──────┴────────┴──────┴──────┴──────┴──────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### ① 통관 상태별 카드 상세

| 상태 | 코드 | 색상 | border-left | 클릭 시 동작 |
|------|------|------|-------------|-------------|
| 신고 대기 | PENDING | `#FF9800` | 4px solid | 수출 주문 목록(customs_status=PENDING) |
| 신고 완료 | DECLARED | `#2196F3` | 4px solid | 수출 주문 목록(customs_status=DECLARED) |
| 통관 승인 | APPROVED | `#4CAF50` | 4px solid | 수출 주문 목록(customs_status=APPROVED) |
| 통관 반려 | REJECTED | `#D32F2F` | 4px solid | 수출 주문 목록(customs_status=REJECTED) |

#### ② 운송 수단별 현황 (도넛 차트)

```javascript
{
  type: 'doughnut',
  data: {
    labels: ['해상(SEA)', '항공(AIR)', '육상(TRUCK)', '철도(RAIL)'],
    datasets: [{
      data: [stats.SEA, stats.AIR, stats.TRUCK, stats.RAIL],
      backgroundColor: ['#1565C0', '#303F9F', '#FF9800', '#7B1FA2']
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

#### ③ 목적지 국가별 현황 (수평 막대 차트)

```javascript
{
  type: 'bar',
  data: {
    labels: destStats.map(d => d.country_nm),
    datasets: [{
      label: '주문 건수',
      data: destStats.map(d => d.count),
      backgroundColor: '#1565C0',
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

#### ④ 금주 출항/도착 예정

| 표시 | 설명 | 색상 |
|------|------|------|
| ETD | 출항 예정 건수 | `#1565C0` (파란) |
| ETA | 도착 예정 건수 | `#4CAF50` (녹색) |

#### ⑤ 알림 섹션

| 타입 | 아이콘 | 배경색 | border-left | 조건 |
|------|--------|--------|-------------|------|
| 긴급 (danger) | 🚨 | `#FFEBEE` | `#D32F2F` | 통관 반려(REJECTED) 건 존재 |
| 경고 (warning) | ⚠️ | `#FFF3E0` | `#FF9800` | ETD 3일 이내 |
| 주의 (info) | ⏰ | `#E3F2FD` | `#2196F3` | 통관 승인 후 B/L 미등록 |

#### ⑥ 바로가기 버튼

| 버튼 | 아이콘 | 동작 | 페이지 |
|------|--------|------|--------|
| 수출 주문목록 | 📋 | 페이지 이동 | export-order-list |
| 통관 현황 | 🛃 | 페이지 이동 | customs-status-list |
| 선적 스케줄 | 🚢 | 페이지 이동 | shipment-schedule |
| OMS 대시보드 | 📊 | 페이지 이동 | oms-home |

#### ⑦ 최근 수출 주문 내역 테이블

| 컬럼 | 필드 | 너비 | 설명 |
|------|------|------|------|
| 출하번호 | `shipmentNo` | 160px | 클릭 시 상세 팝업 |
| 목적지 | `destCountryCd` | 60px | 국가 코드 |
| 인코텀즈 | `incoterms` | 70px | 배지 렌더링 |
| 운송수단 | `transportMode` | 70px | 아이콘+배지 |
| B/L | `blNo` | 120px | 미등록 시 "-" |
| 통관상태 | `customsStatus` | 80px | 통관 상태 배지 |
| 주문상태 | `status` | 80px | OMS 주문 상태 배지 |

#### 백엔드 API

**1. 통관 상태별 건수**
```
GET /rest/export/dashboard/customs_status_counts
Query: order_date (optional, default: today)
```

Response:
```json
{
  "PENDING": 12,
  "DECLARED": 8,
  "APPROVED": 45,
  "REJECTED": 2
}
```

**2. 운송 수단별 통계**
```
GET /rest/export/dashboard/transport_mode_stats
Query: order_date (optional, default: today)
```

Response:
```json
{
  "SEA": 38,
  "AIR": 21,
  "TRUCK": 7,
  "RAIL": 3
}
```

**3. 목적지 국가별 통계**
```
GET /rest/export/dashboard/destination_stats
Query: order_date (optional, default: today), limit (optional, default: 10)
```

Response:
```json
[
  { "dest_country_cd": "US", "country_nm": "미국", "count": 45 },
  { "dest_country_cd": "CN", "country_nm": "중국", "count": 35 },
  { "dest_country_cd": "JP", "country_nm": "일본", "count": 28 }
]
```

**4. 금주 출항/도착 예정 요약**
```
GET /rest/export/dashboard/schedule_summary
Query: week_start (optional, default: 이번 주 월요일)
```

Response:
```json
[
  { "date": "2026-03-30", "etd_count": 3, "eta_count": 1 },
  { "date": "2026-03-31", "etd_count": 2, "eta_count": 0 },
  { "date": "2026-04-01", "etd_count": 0, "eta_count": 2 }
]
```

**5. 알림 목록**
```
GET /rest/export/dashboard/alerts
```

Response:
```json
[
  { "type": "danger", "message": "통관 반려: 2건 (보정 필요)", "count": 2 },
  { "type": "warning", "message": "ETD 3일 이내: 5건 (선적 준비 필요)", "count": 5 },
  { "type": "info", "message": "B/L 미등록: 3건 (통관 승인 후 미처리)", "count": 3 }
]
```

**6. 최근 수출 주문**
```
GET /rest/export/dashboard/recent_orders
Query: limit (optional, default: 10)
```

Response:
```json
[
  {
    "shipment_no": "SHP20260328-E01",
    "dest_country_cd": "US",
    "incoterms": "FOB",
    "transport_mode": "SEA",
    "bl_no": "BL-2026-001",
    "customs_status": "APPROVED",
    "status": "ALLOCATED"
  }
]
```

---

### 3.2 수출 주문 목록 (export-order-list)

#### 목적
수출 주문(`ship_type=EXPORT`)을 전용 목록으로 조회·검색하고, 통관 신고 등 수출 전용 액션 수행

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 수출 주문 관리                                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  통관 상태 요약                                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐                      │
│  │ ⏳ 대기   │ 📋 신고  │ ✅ 승인  │ ❌ 반려  │                      │
│  │   12건   │    8건   │   45건   │    2건   │                      │
│  └──────────┴──────────┴──────────┴──────────┘                      │
│                                                                      │
│  🔍 검색 조건                                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ 주문일: [____] ~ [____]  주문상태: [전체 ▼]               │       │
│  │ 통관상태: [전체 ▼]  운송수단: [전체 ▼]  인코텀즈: [전체 ▼]│       │
│  │ 목적지국가: [____]  B/L: [____]  출하번호: [____]         │       │
│  │                                           [초기화] [조회]  │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  일괄 액션: [일괄 통관 신고] [일괄 B/L 등록] [서류 일괄 출력]        │
│                                                                      │
│  ┌────┬──────────┬──────┬────┬──────┬────┬──────┬──────┬──────┬──┐ │
│  │ ☐  │ 출하번호  │참조번호│목적지│인코텀즈│통화│ 운송  │ B/L  │통관상태│상태│ │
│  ├────┼──────────┼──────┼────┼──────┼────┼──────┼──────┼──────┼──┤ │
│  │ ☐  │SHP-E001  │EXP-01│ US │ FOB  │USD │ SEA  │BL-01 │ 승인 │할당│ │
│  │ ☐  │SHP-E002  │EXP-02│ CN │ CIF  │CNY │ AIR  │  -   │ 대기 │확정│ │
│  │ ☐  │SHP-E003  │EXP-03│ JP │ FOB  │JPY │ SEA  │  -   │ 반려 │확정│ │
│  │ ☐  │SHP-E004  │EXP-04│ DE │ DDP  │EUR │TRUCK │BL-02 │ 신고 │할당│ │
│  └────┴──────────┴──────┴────┴──────┴────┴──────┴──────┴──────┴──┘ │
│                                                                      │
│  [엑셀 다운로드]                         전체 67건  1/4 [<] [1] [>]  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 검색 조건

| 필드 | 타입 | 매핑 | 설명 |
|------|------|------|------|
| 주문일 | 날짜 범위 | `order_date` | 기본값: 최근 1주 |
| 주문 상태 | 셀렉트 | `status` | 11개 OMS 상태 + 전체 |
| 통관 상태 | 셀렉트 | `customs_status` | PENDING/DECLARED/APPROVED/REJECTED |
| 운송 수단 | 셀렉트 | `transport_mode` | SEA/AIR/TRUCK/RAIL |
| 인코텀즈 | 셀렉트 | `incoterms` | FOB/CIF/EXW/DDP/DAP/FCA/CFR |
| 목적지 국가 | 텍스트 | `dest_country_cd` | 자동완성 (like 검색) |
| B/L 번호 | 텍스트 | `bl_no` | like 검색 |
| 출하번호 | 텍스트 | `shipment_no` | like 검색 |

#### 그리드 컬럼

| 컬럼 | 필드 | 너비 | 정렬 | 렌더러 |
|------|------|------|------|--------|
| 선택 | - | 40px | 중앙 | checkbox |
| 출하번호 | `shipmentNo` | 160px | 좌 | link (상세 팝업) |
| 참조번호 | `refOrderNo` | 140px | 좌 | |
| 주문일 | `orderDate` | 90px | 중앙 | |
| 목적지 | `destCountryCd` | 60px | 중앙 | country-flag |
| 인코텀즈 | `incoterms` | 70px | 중앙 | badge |
| 통화 | `currencyCd` | 50px | 중앙 | |
| 외화 금액 | `totalAmountFc` | 100px | 우 | number (소수점 2자리) |
| 운송수단 | `transportMode` | 80px | 중앙 | transport-badge |
| B/L | `blNo` | 120px | 좌 | 미등록 시 회색 "-" |
| ETD | `etd` | 90px | 중앙 | 3일 이내 주황 강조 |
| 통관상태 | `customsStatus` | 80px | 중앙 | customs-status-badge |
| 주문상태 | `status` | 80px | 중앙 | status-badge |

#### 일괄 액션 버튼

| 버튼 | 조건 | API | 설명 |
|------|------|-----|------|
| 일괄 통관 신고 | customs_status=PENDING | `POST /rest/export_trx/declare` | PENDING→DECLARED |
| 일괄 B/L 등록 | customs_status=APPROVED | `POST /rest/export_trx/register_bl` | B/L 번호 일괄 입력 팝업 |
| 서류 일괄 출력 | customs_status=APPROVED | `POST /rest/export_trx/print_documents` | CI+PL 일괄 PDF |

---

### 3.3 수출 주문 상세 (export-order-detail)

#### 목적
개별 수출 주문의 무역조건·통관·운송·품목·서류를 조회·편집하고, 통관 신고 등 트랜잭션을 실행

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 수출 주문 상세                         SHP20260328-E01            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  주문상태: [🔵 할당(ALLOCATED)]   통관상태: [🟢 승인(APPROVED)]       │
│                                                                      │
│  🛃 통관 타임라인                                                    │
│  ●─────────●─────────●─────────○                                    │
│  대기      신고      승인      (반려)                                │
│                       ▲ 현재                                         │
│                                                                      │
│  액션: [통관 신고] [통관 승인] [B/L 등록] [서류 출력] [취소]          │
│                                                                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐           │
│  │ 기본정보 │ 무역/통관│ 운송/선적│ 수출 품목│ 서류 관리│           │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘           │
│                                                                      │
│  [기본정보 탭]                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ 출하번호: SHP20260328-E01    참조번호: EXP-2026-0001    │        │
│  │ 주문일: 2026-03-28           출하기한: 2026-04-05       │        │
│  │ 화주사: AVNET                고객: ABC Corp (US)        │        │
│  │ 창고: WH-01                  업무유형: B2B_OUT          │        │
│  │ 출하유형: EXPORT             배송유형: CHARTER           │        │
│  │ 총품목수: 5                  총주문수량: 100             │        │
│  │ 총할당수량: 100              총출하수량: 0               │        │
│  │ 비고: ___________________________                        │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 탭 구성

**탭 1: 기본정보**
- 기존 `shipment_orders` 헤더 필드를 폼 레이아웃으로 표시
- OMS 주문 상태 타임라인 시각화

**탭 2: 무역/통관 (shipment_export_details)**

```
┌─────────────────────────────────────────────────────────┐
│  🌐 무역 조건                                            │
│                                                          │
│  목적지 국가: US (미국)         원산지: KR (한국)        │
│  인코텀즈: FOB                  통화: USD                │
│  총 금액(외화): $12,500.00     환율: 1,350.50           │
│                                                          │
│  ─── 통관 정보 ─────────────────────────────────────   │
│  수출 신고번호: 202603280001    수출 허가번호: EL-001    │
│  신고 일시: 2026-03-28 10:30   통관 상태: 🟢 승인       │
│  관세사 코드: CB-001            관세사명: 한국관세법인    │
│                                                          │
│  ─── 상업 서류 ─────────────────────────────────────   │
│  상업 송장번호: CI-2026-0001   L/C 번호: LC-2026-ABC    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

| 필드 | 매핑 | 편집 가능 | 설명 |
|------|------|----------|------|
| 목적지 국가 | `destCountryCd` | ✅ (PENDING) | ISO 3166-1 alpha-2 |
| 원산지 국가 | `originCountryCd` | ✅ (PENDING) | |
| 인코텀즈 | `incoterms` | ✅ (PENDING) | 셀렉트 (7개 옵션) |
| 통화 코드 | `currencyCd` | ✅ (PENDING) | USD/EUR/JPY/CNY 등 |
| 총 금액(외화) | `totalAmountFc` | ✅ (PENDING) | 소수점 2자리 |
| 환율 | `exchangeRate` | ✅ (PENDING) | KRW 기준 |
| 수출 신고번호 | `exportDeclarationNo` | ✅ (DECLARED) | 신고 후 입력 |
| 수출 허가번호 | `exportLicenseNo` | ✅ | |
| 신고 일시 | `declaredAt` | 자동 | 신고 시 자동 설정 |
| 통관 상태 | `customsStatus` | 자동 | 트랜잭션으로 변경 |
| 관세사 코드 | `customsBrokerCd` | ✅ | |
| 관세사명 | `customsBrokerNm` | ✅ | |
| 상업 송장번호 | `commercialInvoiceNo` | ✅ | |
| L/C 번호 | `lcNo` | ✅ | |

**탭 3: 운송/선적 (shipment_export_details)**

```
┌─────────────────────────────────────────────────────────┐
│  🚢 운송 정보                                            │
│                                                          │
│  운송 수단: 🚢 SEA (해상)                                │
│  B/L 번호: MAEU-202603-001     선박명: EVER GIVEN       │
│  항차: V.2026-E015              선적항: KRPUS (부산항)   │
│  양륙항: USLAX (로스앤젤레스)                             │
│  출항 예정일(ETD): 2026-04-01  도착 예정일(ETA): 2026-04-15│
│                                                          │
│  ─── 컨테이너 ──────────────────────────────────────   │
│  컨테이너 번호: MAEU1234567    유형: 40HC                │
│  봉인 번호: SEAL-20260328-01                              │
│                                                          │
│  ─── 중량 ──────────────────────────────────────────   │
│  총 순중량: 2,500.00 kg        총 총중량: 2,800.00 kg   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

| 필드 | 매핑 | 편집 가능 | 설명 |
|------|------|----------|------|
| 운송 수단 | `transportMode` | ✅ | SEA/AIR/TRUCK/RAIL |
| B/L 번호 | `blNo` | ✅ | 선하증권 또는 AWB |
| 선박명 | `vesselNm` | ✅ | 항공편명 포함 |
| 항차 | `voyageNo` | ✅ | |
| 선적항 | `portOfLoading` | ✅ | UN/LOCODE |
| 양륙항 | `portOfDischarge` | ✅ | UN/LOCODE |
| 출항 예정일 | `etd` | ✅ | YYYY-MM-DD |
| 도착 예정일 | `eta` | ✅ | YYYY-MM-DD |
| 컨테이너 번호 | `containerNo` | ✅ | ISO 6346 형식 |
| 컨테이너 유형 | `containerType` | ✅ | 20FT/40FT/40HC/LCL |
| 봉인 번호 | `sealNo` | ✅ | |
| 총 순중량 | `totalNetWt` | ✅ | kg, 소수점 2자리 |
| 총 총중량 | `totalGrossWt` | ✅ | kg, 소수점 2자리 |

**탭 4: 수출 품목 (shipment_export_items)**

```
┌──────┬────────┬──────┬──────┬────────┬────────┬──────┬──────┐
│ SKU  │ 상품명  │HS코드│원산지│외화단가 │외화금액 │순중량 │총중량 │
├──────┼────────┼──────┼──────┼────────┼────────┼──────┼──────┤
│SKU-A │ 상품A  │8542.3│ KR   │$25.00  │$500.00 │ 50.0 │ 55.0 │
│SKU-B │ 상품B  │8471.3│ KR   │$150.00 │$3,000  │ 80.0 │ 90.0 │
│SKU-C │ 상품C  │8504.4│ CN   │$10.00  │$200.00 │ 30.0 │ 35.0 │
├──────┴────────┴──────┴──────┼────────┼────────┼──────┼──────┤
│                        합계  │         │$3,700  │160.0 │180.0 │
└─────────────────────────────┴────────┴────────┴──────┴──────┘
```

| 컬럼 | 필드 | 설명 |
|------|------|------|
| SKU | `skuCd` | 조인: shipment_order_items.sku_cd |
| 상품명 | `skuNm` | 조인: shipment_order_items.sku_nm |
| 주문수량 | `orderQty` | 조인: shipment_order_items.order_qty |
| HS 코드 | `hsCd` | 관세 분류 코드 |
| 원산지 | `originCountryCd` | 품목별 원산지 |
| 외화 단가 | `unitPriceFc` | 통화별 포맷 |
| 외화 금액 | `amountFc` | 통화별 포맷 |
| 순중량 | `netWt` | kg |
| 총중량 | `grossWt` | kg |

**탭 5: 서류 관리**

```
┌─────────────────────────────────────────────────────────┐
│  📄 수출 서류                                            │
│                                                          │
│  ┌──────────────────────┬──────┬──────┬────────────┐   │
│  │ 서류 유형             │ 번호 │ 상태 │ 액션        │   │
│  ├──────────────────────┼──────┼──────┼────────────┤   │
│  │ Commercial Invoice   │CI-001│ 발행 │ [출력] [다운]│   │
│  │ Packing List         │PL-001│ 발행 │ [출력] [다운]│   │
│  │ Bill of Lading (B/L) │BL-001│ 등록 │ [출력] [다운]│   │
│  │ 수출 신고서           │ED-001│ 승인 │ [출력] [다운]│   │
│  └──────────────────────┴──────┴──────┴────────────┘   │
│                                                          │
│  [서류 일괄 출력] [서류 일괄 다운로드]                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

| 서류 | 번호 필드 | 생성 시점 | 설명 |
|------|----------|----------|------|
| Commercial Invoice | `commercialInvoiceNo` | 통관 신고 시 | 상업 송장 |
| Packing List | (자동 생성) | 통관 신고 시 | 포장 명세서 |
| B/L | `blNo` | B/L 등록 시 | 선하증권 / AWB |
| 수출 신고서 | `exportDeclarationNo` | 통관 승인 시 | 세관 수출 신고서 |

#### 통관 상태별 액션 버튼 활성화

| 현재 통관 상태 | 통관 신고 | 통관 승인 | B/L 등록 | 서류 출력 | 취소 |
|--------------|----------|----------|---------|----------|------|
| PENDING | ✅ | - | - | - | ✅ |
| DECLARED | - | ✅ | - | - | ✅ |
| APPROVED | - | - | ✅ | ✅ | - |
| REJECTED | ✅ (재신고) | - | - | - | ✅ |

#### 통관 타임라인 CSS

```css
.customs-timeline {
  display: flex;
  align-items: center;
  gap: 0;
}
.customs-timeline .step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.customs-timeline .step .dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--md-sys-color-outline);
}
.customs-timeline .step.active .dot {
  background: var(--step-color);
  box-shadow: 0 0 0 4px rgba(var(--step-color-rgb), 0.2);
}
.customs-timeline .step.completed .dot {
  background: var(--step-color);
}
.customs-timeline .step.rejected .dot {
  background: #D32F2F;
  border: 2px solid #B71C1C;
}
```

---

### 3.4 통관 현황 (customs-status-list)

#### 목적
통관 프로세스 진행 상태를 모니터링하고, 반려 건에 대한 신속한 대응 지원

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  🛃 통관 현황                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  상태 파이프라인                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                      │
│  │  PENDING  │───→│ DECLARED │───→│ APPROVED │                      │
│  │   12건    │    │    8건   │    │   45건   │                      │
│  └──────────┘    └────┬─────┘    └──────────┘                      │
│                       │                                              │
│                       ▼                                              │
│                 ┌──────────┐                                         │
│                 │ REJECTED │                                         │
│                 │    2건   │                                         │
│                 └──────────┘                                         │
│                                                                      │
│  🔍 검색 조건                                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ 신고일: [____] ~ [____]  통관상태: [전체 ▼]               │       │
│  │ 관세사: [____]  목적지국가: [____]  운송수단: [전체 ▼]     │       │
│  │                                           [초기화] [조회]  │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  ┌──────────┬──────────┬──────┬────┬──────┬──────────┬──────┬────┐ │
│  │ 출하번호  │수출신고번호│관세사│목적│운송  │ 신고일시  │반려사유│상태│ │
│  ├──────────┼──────────┼──────┼────┼──────┼──────────┼──────┼────┤ │
│  │SHP-E001  │ED-001    │한국관│ US │ SEA  │03-28 10:3│      │승인│ │
│  │SHP-E003  │ED-003    │대한관│ JP │ SEA  │03-28 11:0│HS오류│반려│ │  ← 빨간 행
│  │SHP-E005  │  -       │  -   │ DE │TRUCK │    -     │      │대기│ │
│  └──────────┴──────────┴──────┴────┴──────┴──────────┴──────┴────┘ │
│                                                                      │
│  일괄 액션: [일괄 재신고] [반려 사유 확인]                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 검색 조건

| 필드 | 타입 | 매핑 | 설명 |
|------|------|------|------|
| 신고일 | 날짜 범위 | `declared_at` | |
| 통관 상태 | 셀렉트 | `customs_status` | PENDING/DECLARED/APPROVED/REJECTED |
| 관세사 | 텍스트 | `customs_broker_nm` | like 검색 |
| 목적지 국가 | 텍스트 | `dest_country_cd` | |
| 운송 수단 | 셀렉트 | `transport_mode` | SEA/AIR/TRUCK/RAIL |

#### 그리드 컬럼

| 컬럼 | 필드 | 너비 | 정렬 | 렌더러 |
|------|------|------|------|--------|
| 선택 | - | 40px | 중앙 | checkbox |
| 출하번호 | `shipmentNo` | 160px | 좌 | link (상세 팝업) |
| 수출 신고번호 | `exportDeclarationNo` | 140px | 좌 | 미등록 시 "-" |
| 수출 허가번호 | `exportLicenseNo` | 120px | 좌 | |
| 관세사 | `customsBrokerNm` | 120px | 좌 | |
| 목적지 | `destCountryCd` | 60px | 중앙 | country-flag |
| 인코텀즈 | `incoterms` | 70px | 중앙 | badge |
| 운송수단 | `transportMode` | 80px | 중앙 | transport-badge |
| 신고일시 | `declaredAt` | 130px | 중앙 | |
| 반려 사유 | `remarks` | 150px | 좌 | REJECTED 시만 표시, 빨간 텍스트 |
| 통관상태 | `customsStatus` | 80px | 중앙 | customs-status-badge |

#### 반려 건 하이라이트

```css
.row-rejected {
  background-color: #FFEBEE !important;
}
.row-rejected .remarks-cell {
  color: #D32F2F;
  font-weight: 500;
}
```

#### API

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/rest/shipment_export_details` | 목록 조회 (조인) |
| POST | `/rest/export_trx/declare` | 통관 신고 (PENDING→DECLARED) |
| POST | `/rest/export_trx/approve` | 통관 승인 (DECLARED→APPROVED) |
| POST | `/rest/export_trx/reject` | 통관 반려 (DECLARED→REJECTED) |
| POST | `/rest/export_trx/re_declare` | 재신고 (REJECTED→DECLARED) |

---

### 3.5 선적 스케줄 (shipment-schedule)

#### 목적
수출 주문의 운송/선적 일정을 관리하고, ETD/ETA 기반 스케줄 추적

#### 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚢 선적 스케줄                                 [그리드 뷰] [캘린더 뷰]│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 검색 조건                                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ ETD: [____] ~ [____]  운송수단: [전체 ▼]                  │       │
│  │ 선적항: [____]  양륙항: [____]  선박/항공편: [____]        │       │
│  │                                           [초기화] [조회]  │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  [그리드 뷰]                                                        │
│  ┌──────────┬──────┬────┬──────┬──────────┬──────┬──────┬────┬──┐ │
│  │ 출하번호  │ B/L  │운송│선박/편│선적항→양륙│ ETD  │ ETA  │컨테│상태│ │
│  ├──────────┼──────┼────┼──────┼──────────┼──────┼──────┼────┼──┤ │
│  │SHP-E001  │BL-01 │SEA │EVER G│KRPUS→USLX│04-01 │04-15 │40HC│승인│ │
│  │SHP-E002  │AWB-01│AIR │KE901 │KRICN→CNPVG│03-30│03-31 │ -  │신고│ │  ← 주황 (ETD 3일 이내)
│  │SHP-E004  │BL-02 │SEA │HMM SP│KRPUS→DEHAM│04-10│04-28 │20FT│승인│ │
│  │SHP-E006  │  -   │SEA │  -   │  -  → -  │  -  │  -   │ -  │대기│ │  ← 회색 (미등록)
│  └──────────┴──────┴────┴──────┴──────────┴──────┴──────┴────┴──┘ │
│                                                                      │
│  [캘린더 뷰]                                                        │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │           2026년 4월                                      │      │
│  │  월   │ 화   │ 수   │ 목   │ 금   │ 토   │ 일            │      │
│  │       │  1   │  2   │  3   │  4   │  5   │  6            │      │
│  │       │🚢E01 │      │      │      │      │               │      │
│  │  7    │  8   │  9   │ 10   │ 11   │ 12   │ 13            │      │
│  │       │      │      │🚢E04 │      │      │               │      │
│  │ 14    │ 15   │ 16   │ 17   │ 18   │ 19   │ 20            │      │
│  │       │📦E01 │      │      │      │      │               │      │
│  └──────────────────────────────────────────────────────────┘      │
│  🚢 = ETD (출항), 📦 = ETA (도착)                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 검색 조건

| 필드 | 타입 | 매핑 | 설명 |
|------|------|------|------|
| ETD 범위 | 날짜 범위 | `etd` | 기본값: 이번 달 |
| 운송 수단 | 셀렉트 | `transport_mode` | SEA/AIR/TRUCK/RAIL |
| 선적항 | 텍스트 | `port_of_loading` | UN/LOCODE |
| 양륙항 | 텍스트 | `port_of_discharge` | UN/LOCODE |
| 선박/항공편 | 텍스트 | `vessel_nm` | like 검색 |

#### 그리드 컬럼

| 컬럼 | 필드 | 너비 | 정렬 | 렌더러 |
|------|------|------|------|--------|
| 출하번호 | `shipmentNo` | 160px | 좌 | link (상세 팝업) |
| B/L | `blNo` | 130px | 좌 | 미등록 시 회색 "-" |
| 운송수단 | `transportMode` | 80px | 중앙 | transport-badge |
| 선박/편명 | `vesselNm` | 120px | 좌 | |
| 항차 | `voyageNo` | 90px | 좌 | |
| 선적항 | `portOfLoading` | 80px | 중앙 | |
| 양륙항 | `portOfDischarge` | 80px | 중앙 | |
| ETD | `etd` | 90px | 중앙 | date, 3일 이내 주황, 초과 빨간 |
| ETA | `eta` | 90px | 중앙 | date |
| 컨테이너 | `containerNo` | 120px | 좌 | |
| 컨테이너 유형 | `containerType` | 70px | 중앙 | badge |
| 봉인번호 | `sealNo` | 100px | 좌 | |
| 통관상태 | `customsStatus` | 80px | 중앙 | customs-status-badge |

#### ETD 강조 규칙

```css
/* ETD 3일 이내 — 주황 강조 */
.row-etd-soon {
  background-color: #FFF3E0 !important;
}
.row-etd-soon .etd-cell {
  color: #FF9800;
  font-weight: 600;
}

/* ETD 초과 — 빨간 강조 */
.row-etd-overdue {
  background-color: #FFEBEE !important;
}
.row-etd-overdue .etd-cell {
  color: #D32F2F;
  font-weight: 600;
}
```

조건:
- ETD 3일 이내: `etd - today <= 3일` AND `customsStatus != 'APPROVED'`
- ETD 초과: `etd < today` AND 미출하

#### 캘린더 뷰

```javascript
{
  view: 'dayGridMonth',
  events: scheduleData.map(item => ([
    {
      title: `🚢 ${item.shipment_no}`,
      date: item.etd,
      color: '#1565C0',
      extendedProps: { type: 'etd', ...item }
    },
    {
      title: `📦 ${item.shipment_no}`,
      date: item.eta,
      color: '#4CAF50',
      extendedProps: { type: 'eta', ...item }
    }
  ])).flat(),
  eventClick: (info) => openExportOrderDetail(info.event.extendedProps)
}
```

---

## 4. UI/UX 컨셉

### 4.1 통관 상태 배지

```css
.customs-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #FFFFFF;
}

.customs-status-badge.PENDING { background: #FF9800; }
.customs-status-badge.DECLARED { background: #2196F3; }
.customs-status-badge.APPROVED { background: #4CAF50; }
.customs-status-badge.REJECTED { background: #D32F2F; }
```

### 4.2 운송 수단 배지

```css
.transport-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #FFFFFF;
}

.transport-badge.SEA { background: #1565C0; }
.transport-badge.SEA::before { content: '🚢'; }
.transport-badge.AIR { background: #303F9F; }
.transport-badge.AIR::before { content: '✈️'; }
.transport-badge.TRUCK { background: #FF9800; }
.transport-badge.TRUCK::before { content: '🚛'; }
.transport-badge.RAIL { background: #7B1FA2; }
.transport-badge.RAIL::before { content: '🚂'; }
```

### 4.3 인코텀즈 배지

```css
.incoterms-badge {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #E3F2FD;
  color: #1565C0;
  border: 1px solid #90CAF9;
}
```

### 4.4 국가 플래그 렌더러

```javascript
// 국가 코드 → 플래그 이모지 변환
function countryFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

// 사용: countryFlag('US') → '🇺🇸', countryFlag('KR') → '🇰🇷'
```

---

## 5. 기술 스택

### 5.1 프론트엔드

| 기술 | 용도 |
|------|------|
| LitElement | 웹 컴포넌트 기반 UI |
| MetaGrist | 메타데이터 기반 그리드 (목록 화면) |
| Chart.js | 대시보드 차트 (도넛, 막대) |
| FullCalendar | 선적 스케줄 캘린더 뷰 |
| Material Design 3 | 디자인 시스템 |
| Redux | 상태 관리 |

### 5.2 API 통신

| 방식 | 용도 | 예시 |
|------|------|------|
| GraphQL | MetaGrist CRUD 조회 | `query { shipmentExportDetails { ... } }` |
| REST (ServiceUtil) | 트랜잭션 API | `ServiceUtil.post('/rest/export_trx/declare', ...)` |
| REST (fetch) | 대시보드 통계 | `fetch('/rest/export/dashboard/...')` |

---

## 6. 구현 우선순위

### Phase 1: 수출 주문 관리 (우선)

| 순서 | 화면 | 파일 | 설명 |
|------|------|------|------|
| 1 | 수출 대시보드 | `export-home.js` | 현황 파악 |
| 2 | 수출 주문 목록 | `export-order-list.js` | 주문 조회/일괄 처리 |
| 3 | 수출 주문 상세 | `export-order-detail.js` | 5탭 상세 (무역/통관/운송/품목/서류) |

### Phase 2: 통관·선적 관리

| 순서 | 화면 | 파일 | 설명 |
|------|------|------|------|
| 4 | 통관 현황 | `customs-status-list.js` | 통관 파이프라인 모니터링 |
| 5 | 선적 스케줄 | `shipment-schedule.js` | ETD/ETA 관리, 캘린더 뷰 |

---

## 7. 구현 현황

> 최종 업데이트: 2026-03-28

### 프론트엔드 화면

| # | 화면 | 파일 | 상태 | 구현일 | 비고 |
|---|------|------|------|--------|------|
| 1 | 수출 대시보드 | `export-home.js` | ⬜ 미구현 | | |
| 2 | 수출 주문 목록 | `export-order-list.js` | ⬜ 미구현 | | |
| 3 | 수출 주문 상세 | `export-order-detail.js` | ⬜ 미구현 | | |
| 4 | 통관 현황 | `customs-status-list.js` | ⬜ 미구현 | | |
| 5 | 선적 스케줄 | `shipment-schedule.js` | ⬜ 미구현 | | |

### 백엔드 컨트롤러

| # | 컨트롤러 | 경로 | 상태 | 비고 |
|---|---------|------|------|------|
| 1 | `ExportDashboardController` | `/rest/export/dashboard` | ⬜ 미구현 | 6개 GET API |
| 2 | `ExportTransactionController` | `/rest/export_trx` | ⬜ 미구현 | 통관/B/L/서류 트랜잭션 |
| 3 | `ShipmentExportDetailController` | `/rest/shipment_export_details` | ⬜ 미구현 | CRUD |
| 4 | `ShipmentExportItemController` | `/rest/shipment_export_items` | ⬜ 미구현 | CRUD |

### 엔티티

| # | 엔티티 | 테이블 | 상태 | 비고 |
|---|--------|--------|------|------|
| 1 | `ShipmentExportDetail` | `shipment_export_details` | ⬜ 미구현 | 테이블 설계만 완료 (oms-table-design.md) |
| 2 | `ShipmentExportItem` | `shipment_export_items` | ⬜ 미구현 | 테이블 설계만 완료 |

### 라우트 등록

| # | 페이지 | tagname | 상태 |
|---|--------|---------|------|
| 1 | 수출 대시보드 | `export-home` | ⬜ 미등록 |
| 2 | 수출 주문 목록 | `export-order-list` | ⬜ 미등록 |
| 3 | 통관 현황 | `customs-status-list` | ⬜ 미등록 |
| 4 | 선적 스케줄 | `shipment-schedule` | ⬜ 미등록 |
