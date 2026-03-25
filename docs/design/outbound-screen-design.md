# 출고 관리 화면 설계

## 문서 정보
- **작성일**: 2026-03-20
- **목적**: 출고 관리 대시보드 화면 설계
- **참조**: VAS 대시보드, 입고 대시보드

---

## 📊 출고 관리 대시보드 구성

### 1. 오늘의 출고 현황 (상태별 카드 - 클릭 가능)

4개의 핵심 상태 카드를 그리드 레이아웃으로 배치:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 📝 등록중    │ ⏳ 대기      │ 📦 작업중    │ ✅ 완료     │
│    REG      │   READY     │    RUN      │    END      │
│    12건     │    28건     │    15건     │   156건     │
│ 출고 준비    │ 지시 대기    │ 진행 중     │ 오늘 완료   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 상태별 정의 및 동작
| 상태 | 코드 | 색상 | 설명 | 클릭 시 동작 |
|------|------|------|------|-------------|
| 📝 등록중 | REG | 회색 (#9E9E9E) | 출고 지시 등록 중 | 출고 목록(status=REG, rls_req_date=today) |
| ⏳ 대기 | READY | 파란색 (#2196F3) | 출고 지시 대기 | 출고 목록(status=READY, rls_req_date=today) |
| 📦 작업중 | RUN | 주황색 (#FF9800) | 출고 작업 진행 중 | 출고 모니터링(status=RUN, rls_req_date=today) |
| ✅ 완료 | END | 녹색 (#4CAF50) | 오늘 완료된 출고 | 출고 실적 조회(rls_ord_date=today, status=END) |

**추가 상태** (선택적 표시):
- REQ: 출고 요청 (대기 전 단계)
- WAIT: 출고 요청 확인 (대기 전 단계)
- PICKED: 피킹 완료 (검수/패킹 대기)

#### 스타일링
- `border-left: 4px solid {상태별 색상}`: 상태별 시각적 강조
- 호버 시: `box-shadow` 증가 + `translateY(-2px)` 애니메이션
- 반응형: 모바일에서는 2열 그리드

---

### 2. 출고 유형별 현황 (막대 차트)

Chart.js를 이용한 막대 차트:

```
📈 출고 유형별 현황
┌────────────────────────┐
│  일반 출고: ████████    │ 95건
│  반품 출고: ███         │ 28건
│  창고 이동: ██          │ 15건
│  폐기:     █            │ 8건
│  기타:     █            │ 5건
└────────────────────────┘
```

#### 데이터 매핑
| 라벨 | 코드 | 색상 |
|------|------|------|
| 일반 출고 | NORMAL | #2196F3 (파란색) |
| 반품 출고 | RETURN | #F44336 (빨간색) |
| 창고 이동 | TRANSFER | #FF9800 (주황색) |
| 폐기 | SCRAP | #9E9E9E (회색) |
| 기타 출고 | ETC | #757575 (진한 회색) |

#### Chart.js 설정
```javascript
{
  type: 'bar',
  data: {
    labels: ['일반 출고', '반품 출고', '창고 이동', '폐기', '기타'],
    datasets: [{
      label: '출고 건수',
      data: [typeStats.NORMAL, typeStats.RETURN, typeStats.TRANSFER, typeStats.SCRAP, typeStats.ETC],
      backgroundColor: ['#2196F3', '#F44336', '#FF9800', '#9E9E9E', '#757575'],
      borderRadius: 8
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
          callback: value => `${value}건`
        }
      }
    }
  }
}
```

---

### 3. 피킹 현황 (통계 카드)

3개의 피킹 상태 카드:

```
┌─────────────┬─────────────┬─────────────┐
│ 📋 피킹대기  │ 🔄 피킹중    │ ✔️ 피킹완료  │
│    18건     │    12건     │   142건     │
└─────────────┴─────────────┴─────────────┘
```

#### 피킹 상태 정의
| 상태 | 설명 | 색상 | 클릭 시 동작 |
|------|------|------|-------------|
| 📋 피킹대기 | READY 상태 (지시 대기) | #2196F3 | 피킹 대기 목록 |
| 🔄 피킹중 | RUN 상태 (작업 진행) | #FF9800 | 피킹 작업 목록 |
| ✔️ 피킹완료 | PICKED 상태 (피킹 완료) | #4CAF50 | 피킹 완료 목록 |

---

### 4. 비즈니스 유형별 현황 (선택적 - 파이 차트)

B2B/B2C 출고 비율 표시:

```
🏢 비즈니스 유형별 현황
┌────────────────────────┐
│      ◐ B2B 출고: 68%    │
│      ◑ B2C 출고: 32%    │
└────────────────────────┘
```

#### 데이터 매핑
| 유형 | 코드 | 색상 |
|------|------|------|
| B2B 출고 | B2B_OUT | #1976D2 |
| B2C 출고 | B2C_OUT | #03A9F4 |
| B2B 반품 | B2B_RTN | #D32F2F |
| B2C 반품 | B2C_RTN | #F44336 |

---

### 5. 주의 항목 (알림 섹션)

동적으로 생성되는 알림 리스트:

```
⚠️ 주의 항목
┌─────────────────────────────────────────┐
│ 🚨 지연 출고: 3건 (예정일 초과)          │
│ ⚠️  피킹 지연: 5건 (2시간 경과)         │
│ 📦 검수 대기: 8건                       │
└─────────────────────────────────────────┘
```

#### 알림 타입
| 타입 | 아이콘 | 배경색 | border-left | 조건 |
|------|--------|--------|-------------|------|
| 경고 (warning) | 🚨 | #FFEBEE | #F44336 | 지연, 긴급 |
| 주의 (info) | ⚠️ | #FFF3E0 | #FF9800 | 일반 주의사항 |

#### 알림 데이터 구조
```javascript
{
  type: 'warning',  // 'warning' | 'info'
  icon: '🚨',
  message: '지연 출고: 3건 (예정일 초과)'
}
```

---

### 6. 바로가기 버튼

5개의 주요 기능 바로가기:

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ 📝 출고지시  │ 📦 피킹작업  │ 📋 출고실적  │ 🚚 배송현황  │ 📊 재고조회  │
│   생성      │             │   조회      │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 버튼별 동작
| 버튼 | 아이콘 | 동작 | 페이지/팝업 |
|------|--------|------|------------|
| 출고지시 생성 | 📝 | 팝업 열기 | release-order-new-popup |
| 피킹작업 | 📦 | 페이지 이동 | picking-orders |
| 출고실적 조회 | 📋 | 페이지 이동 | release-orders (status=END) |
| 배송현황 | 🚚 | 페이지 이동 | delivery-info |
| 재고조회 | 📊 | 페이지 이동 | inventories |

---

### 7. 최근 출고 내역 (선택적)

실시간 최근 출고 내역 테이블:

```
최근 출고 내역 (실시간)
┌──────────────┬───────────┬──────┬──────┬────────┐
│ 출고번호      │ 고객       │ 상태  │ 수량  │ 일시    │
├──────────────┼───────────┼──────┼──────┼────────┤
│ RLS20260320-1│ ㈜삼성전자 │ 완료  │ 250  │ 14:30  │
│ RLS20260320-2│ ABC 마트   │작업중 │ 120  │ 13:50  │
└──────────────┴───────────┴──────┴──────┴────────┘
```

#### 테이블 컬럼
- 출고번호 (rls_ord_no): 클릭 시 상세 페이지 이동
- 고객 (cust_cd): 고객명 표시
- 상태 (status): 상태별 색상 배지
- 수량 (total_qty): 총 출고 수량
- 일시 (rls_ord_date): HH:mm 형식

---

## 🎨 디자인 시스템

### 레이아웃
- **컨테이너**: `.dashboard-container` - flexbox, column 방향, gap: 24px
- **섹션 제목**: `.section-title` - 18px, font-weight: 600, 아이콘 포함
- **카드**: `.status-card` - border-radius: 12px, padding: 24px, box-shadow

### 색상 시스템 (Material Design 3)
- **배경**: `var(--md-sys-color-background)`
- **카드 배경**: `var(--md-sys-color-surface)`
- **텍스트**: `var(--md-sys-color-on-surface)`
- **Primary**: `var(--md-sys-color-primary)`

### 상태별 색상
- 등록중 (REG): #9E9E9E (회색)
- 요청 (REQ): #BDBDBD (밝은 회색)
- 확인 (WAIT): #90CAF9 (밝은 파란색)
- 대기 (READY): #2196F3 (파란색)
- 작업중 (RUN): #FF9800 (주황색)
- 피킹완료 (PICKED): #66BB6A (연녹색)
- 완료 (END): #4CAF50 (녹색)
- 취소 (CANCEL): #F44336 (빨간색)

### 반응형 디자인
```css
@media screen and (max-width: 768px) {
  .status-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }
}
```

---

## 🔧 백엔드 API 요구사항

### 1. 상태별 건수 조회
```
GET /rest/outbound_trx/dashboard/status-counts
Query: rls_req_date (optional, default: today)
```

**Response:**
```json
{
  "REG": 12,
  "REQ": 8,
  "WAIT": 15,
  "READY": 28,
  "RUN": 15,
  "PICKED": 22,
  "END": 156,
  "CANCEL": 3
}
```

**로직:**
- 오늘 날짜(`rls_req_date = today`) 기준
- domain_id 필터 필수
- status별 COUNT(*)

---

### 2. 출고 유형별 통계
```
GET /rest/outbound_trx/dashboard/type-stats
Query: rls_req_date (optional, default: today)
```

**Response:**
```json
{
  "NORMAL": 95,
  "RETURN": 28,
  "TRANSFER": 15,
  "SCRAP": 8,
  "ETC": 5
}
```

**로직:**
- 오늘 날짜 기준
- rls_type별 COUNT(*)
- status != 'CANCEL' 제외

---

### 3. 피킹 현황 통계
```
GET /rest/outbound_trx/dashboard/picking-stats
Query: rls_req_date (optional, default: today)
```

**Response:**
```json
{
  "WAIT": 18,
  "PICKING": 12,
  "PICKED": 142
}
```

**로직:**
- WAIT: status='READY'
- PICKING: status='RUN'
- PICKED: status='PICKED'

---

### 4. 비즈니스 유형별 통계 (선택적)
```
GET /rest/outbound_trx/dashboard/biz-type-stats
Query: rls_req_date (optional, default: today)
```

**Response:**
```json
{
  "B2B_OUT": 103,
  "B2C_OUT": 48,
  "B2B_RTN": 0,
  "B2C_RTN": 0
}
```

**로직:**
- biz_type별 COUNT(*)
- status != 'CANCEL' 제외

---

### 5. 알림 데이터 조회
```
GET /rest/outbound_trx/dashboard/alerts
```

**Response:**
```json
[
  {
    "type": "warning",
    "icon": "🚨",
    "message": "지연 출고: 3건 (예정일 초과)"
  },
  {
    "type": "info",
    "icon": "⚠️",
    "message": "피킹 지연: 5건 (2시간 경과)"
  }
]
```

**로직:**
- 지연 출고: `rls_req_date < today AND status NOT IN ('END', 'CANCEL')`
- 피킹 지연: `status = 'RUN' AND updated_at < now() - interval '2 hours'`
- 검수 대기: `status = 'PICKED'` (검수 프로세스가 있는 경우)

---

### 6. 최근 출고 내역 (선택적)
```
GET /rest/outbound_trx/dashboard/recent-list
Query: limit (default: 10)
```

**Response:**
```json
[
  {
    "rlsOrdNo": "RLS20260320-1",
    "custNm": "㈜삼성전자",
    "status": "END",
    "totalQty": 250,
    "rlsOrdDate": "2026-03-20 14:30:00"
  }
]
```

**로직:**
- ORDER BY updated_at DESC
- LIMIT 10
- status != 'CANCEL'

---

## 💻 프론트엔드 구현 계획

### 파일 구조
```
frontend/packages/operato-wes/client/pages/outbound/
├── outbound-home.js              # 대시보드 메인 화면 (수정)
└── release-order-new-popup.js    # 출고 지시 생성 팝업 (신규 또는 기존)
```

### 컴포넌트 구조
```javascript
class OutboundHome extends PageView {
  static properties = {
    loading: Boolean,
    statusCounts: Object,      // 상태별 건수
    typeStats: Object,         // 유형별 통계
    pickingStats: Object,      // 피킹 통계
    bizTypeStats: Object,      // 비즈니스 유형 통계 (선택)
    alerts: Array,             // 알림 목록
    recentList: Array          // 최근 내역
  }

  // 라이프사이클
  async pageUpdated(changes, lifecycle, before)
  async _fetchDashboardData()

  // API 호출
  async _fetchStatusCounts()
  async _fetchTypeStats()
  async _fetchPickingStats()
  async _fetchBizTypeStats()
  async _fetchAlerts()
  async _fetchRecentList()

  // 차트 렌더링
  _renderTypeChart()
  _renderBizTypeChart()

  // 네비게이션
  _navigateTo(page, filter)
  _openReleaseOrderNewPopup()

  // 정리
  pageDisposed(lifecycle)
}
```

### 의존성
- `chart.js/auto`: 차트 렌더링
- `@operato/layout`: `openPopup` - 팝업 열기
- `@operato-app/metapage/dist-client`: `ServiceUtil`, `UiUtil`, `ValueUtil`

---

## 📝 구현 순서

1. **백엔드 API 구현** (OutboundDashboardController.java 또는 OutboundTransactionController.java 확장)
   - [ ] status-counts 엔드포인트
   - [ ] type-stats 엔드포인트
   - [ ] picking-stats 엔드포인트
   - [ ] biz-type-stats 엔드포인트 (선택)
   - [ ] alerts 엔드포인트
   - [ ] recent-list 엔드포인트 (선택)

2. **프론트엔드 화면 구현** (outbound-home.js)
   - [ ] 레이아웃 및 스타일 정의
   - [ ] 상태 카드 섹션 (4개 핵심 상태)
   - [ ] 유형별 차트 섹션
   - [ ] 피킹 현황 섹션
   - [ ] 비즈니스 유형 차트 (선택)
   - [ ] 알림 섹션
   - [ ] 바로가기 버튼
   - [ ] 최근 내역 테이블 (선택)

3. **팝업 구현** (release-order-new-popup.js)
   - [ ] 출고 지시 생성 폼
   - [ ] 유효성 검증
   - [ ] 생성 완료 후 대시보드 새로고침

4. **테스트 및 최적화**
   - [ ] API 응답 시간 확인
   - [ ] 반응형 디자인 테스트
   - [ ] 브라우저 호환성 테스트

---

## 🎯 성공 지표

- **로딩 속도**: 대시보드 초기 로딩 < 1초
- **실시간성**: API 호출 후 화면 업데이트 < 500ms
- **사용성**: 주요 기능 2클릭 이내 접근
- **반응형**: 모바일/태블릿/데스크톱 모두 정상 동작

---

## 📚 참조 문서

- 입고 대시보드: `docs/design/inbound-screen-design.md`
- VAS 대시보드: `frontend/packages/operato-wes/client/pages/vas/vas-home.js`
- 출고 엔티티: `src/main/java/operato/wms/outbound/entity/ReleaseOrder.java`
- 출고 상수: `src/main/java/operato/wms/outbound/WmsOutboundConstants.java`
- Chart.js 문서: https://www.chartjs.org/docs/latest/

---

## 💡 주요 차이점 (입고 vs 출고)

| 항목 | 입고 | 출고 |
|------|------|------|
| **주요 상태** | INWORK, READY, START, END | REG, READY, RUN, END |
| **상태 개수** | 4개 (핵심) | 4개 (핵심), 8개 (전체) |
| **중간 프로세스** | 검수 | 피킹 |
| **유형** | NORMAL, RETURN, ETC (3개) | NORMAL, RETURN, TRANSFER, SCRAP, ETC (5개) |
| **추가 분류** | - | 비즈니스 유형 (B2B/B2C) |
| **주요 작업** | 입고 검수 | 피킹 작업 |

---
---

# B2C 피킹 작업 화면 설계 (PDA)

## 문서 정보
- **작성일**: 2026-03-24
- **목적**: B2C 출고 피킹 작업을 위한 PDA 모바일 화면 설계
- **참조**: vas-pda-pick.js, rwa-disposition-work.js, gi-barcode-work-page.js
- **대상 사용자**: 창고 피킹 작업자 (PDA/모바일 단말기)

---

## 📋 화면 개요

### 목적
B2C 택배 출고 주문에 대한 피킹 작업을 PDA 단말기에서 수행하는 모바일 최적화 화면.
작업자가 피킹 지시서의 항목을 순서대로 로케이션 이동 → 바코드 스캔 → 수량 확인하여 피킹을 완료한다.

### 화면 흐름
```
[피킹 지시 선택] → [피킹 작업 시작] → [항목별 피킹] → [피킹 완료]
     (1단계)           (2단계)           (3단계)          (4단계)
```

### 파일 경로
```
frontend/packages/operato-wes/client/pages/work/outbound-picking-work.js
```

### 라우트 등록
```javascript
// route.ts
'outbound_picking_work': { page: 'outbound-picking-work' }

// things-factory.config.js
{ tag: 'outbound-picking-work', module: './pages/work/outbound-picking-work' }
```

---

## 🖥️ 화면 구성

### 1단계: 피킹 지시 선택 화면

작업자가 할당된 피킹 지시를 선택하거나, 피킹 지시서의 바코드를 스캔하여 작업을 시작한다.

```
┌──────────────────────────────────┐
│  📦 B2C 피킹 작업                │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 🔍 피킹 지시번호 스캔     │   │
│  │ [___________________] 🔊 │   │
│  └──────────────────────────┘   │
│                                  │
│  ── 오늘의 피킹 지시 ──          │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 📋 PKO-20260324-001      │   │
│  │ 주문: 5건 | SKU: 12종     │   │
│  │ 수량: 48pcs               │   │
│  │ 상태: ⏳ 대기              │   │
│  │                [시작 →]   │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 📋 PKO-20260324-002      │   │
│  │ 주문: 3건 | SKU: 8종      │   │
│  │ 수량: 25pcs               │   │
│  │ 상태: 🔄 작업중 (40%)     │   │
│  │ ████░░░░░░               │   │
│  │                [계속 →]   │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 📋 PKO-20260324-003      │   │
│  │ 주문: 1건 | SKU: 2종      │   │
│  │ 수량: 8pcs                │   │
│  │ 상태: ⏳ 대기              │   │
│  │                [시작 →]   │   │
│  └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

#### 피킹 지시 카드 정보

| 필드 | 소스 | 설명 |
|------|------|------|
| 지시번호 | `pickOrderNo` | PKO-YYYYMMDD-NNN |
| 주문 건수 | `planOrder` | 포함된 출고 주문 수 |
| SKU 종수 | `planSku` | 피킹 대상 SKU 종류 |
| 총 수량 | `planPcs` | 총 피킹 수량 (pcs) |
| 상태 | `status` | WAIT: 대기, RUN: 작업중 |
| 진행률 | `progressRate` | RUN 상태일 때 진행률 표시 |

#### 카드 스타일

| 상태 | border-left 색상 | 버튼 텍스트 |
|------|-----------------|------------|
| WAIT | #2196F3 (파란색) | 시작 → |
| RUN | #FF9800 (주황색) | 계속 → |

#### API 호출
```
GET /rest/picking_orders?status=WAIT,RUN&order_date={today}
```
- `domain_id` 자동 포함
- 바코드 스캔 시: `pickOrderNo`로 검색

---

### 2단계: 피킹 작업 시작

피킹 지시를 선택하면 작업이 시작되고, 피킹 항목 목록을 로딩한다.

#### WAIT 상태인 경우
```
POST /rest/outbound_trx/picking_orders/{id}/start
```
- 피킹 지시 상태: WAIT → RUN
- 피킹 항목 상태: WAIT → RUN
- 출고 지시 상태: READY → RUN (자동)

#### RUN 상태인 경우 (이어서 작업)
```
GET /rest/picking_orders/{id}/items
```
- 이미 진행 중인 항목 목록 로딩
- 완료된 항목은 스킵, 미완료 첫 항목부터 시작

---

### 3단계: 항목별 피킹 작업 화면 (메인)

실제 피킹 작업이 수행되는 핵심 화면. 작업자는 항목 순서대로 로케이션을 이동하고 바코드를 스캔하여 피킹한다.

```
┌──────────────────────────────────┐
│  📦 PKO-20260324-001     🔊  ✕  │
│  ████████████░░░░  7/12 (58%)   │
│                                  │
│  ── 현재 피킹 항목 ──            │
│                                  │
│  ┌──────────────────────────┐   │
│  │  📍 로케이션              │   │
│  │  ┌──────────────────┐    │   │
│  │  │   A-01-02-03     │    │   │
│  │  └──────────────────┘    │   │
│  │                          │   │
│  │  📦 상품 정보             │   │
│  │  SKU: SKU-A1234          │   │
│  │  상품명: 에어팟 프로 2세대 │   │
│  │  LOT: LOT20260301        │   │
│  │  유통기한: 2027-03-01     │   │
│  │                          │   │
│  │  📊 수량                  │   │
│  │  지시: 3 EA               │   │
│  │                          │   │
│  │  🔍 바코드 스캔           │   │
│  │  [___________________]   │   │
│  │                          │   │
│  │  수량: [  3  ] EA        │   │
│  │                          │   │
│  │  ┌──────┐  ┌──────────┐ │   │
│  │  │ 건너뛰기│  │ ✓ 피킹확인│ │   │
│  │  └──────┘  └──────────┘ │   │
│  └──────────────────────────┘   │
│                                  │
│  ── 피킹 항목 목록 ──            │
│                                  │
│  ✅ A-01-01-01 | SKU-B5678 × 2  │
│  ✅ A-01-01-02 | SKU-C9012 × 5  │
│  ...                             │
│  ✅ A-01-02-01 | SKU-D3456 × 1  │
│  → A-01-02-03 | SKU-A1234 × 3  │  ← 현재
│  ☐ A-02-01-01 | SKU-E7890 × 4  │
│  ☐ A-02-01-03 | SKU-F2345 × 2  │
│  ...                             │
│                                  │
└──────────────────────────────────┘
```

#### 상단 헤더 영역

| 요소 | 설명 |
|------|------|
| 피킹 지시번호 | `pickOrderNo` 표시 |
| 음성 토글 (🔊/🔇) | 음성 안내 ON/OFF |
| 닫기 (✕) | 1단계로 돌아가기 (확인 팝업) |
| 진행률 바 | `progressRate` 기반, 녹색 그래디언트 |
| 진행 수치 | `완료/전체 (%)` 형식 |

#### 현재 피킹 항목 카드

| 필드 | 소스 (PickingOrderItem) | 표시 |
|------|------------------------|------|
| 로케이션 | `fromLocCd` | 큰 글씨 (28px), 파란색 배경 박스 |
| SKU 코드 | `skuCd` | 고정폭 글꼴 |
| 상품명 | `skuNm` | 일반 텍스트 |
| LOT 번호 | `lotNo` | 있을 때만 표시 |
| 유통기한 | `expiredDate` | 있을 때만 표시 |
| 지시 수량 | `orderQty` (EA) / `orderBox` (Box) | 굵은 글씨 |
| 바코드 입력 | `barcode` 비교용 | OxInputBarcode 컴포넌트 |
| 피킹 수량 | `pickQty` 입력 | 기본값 = orderQty |

#### 로케이션 표시 스타일
```css
.location-display {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  padding: 16px 24px;
  background: #E3F2FD;
  border: 2px solid #2196F3;
  border-radius: 12px;
  color: #1565C0;
  letter-spacing: 2px;
}
```

#### 피킹 항목 목록 (체크리스트)

| 아이콘 | 상태 | 배경색 | 글꼴 |
|--------|------|--------|------|
| ✅ | END (완료) | #E8F5E9 | 취소선 없음, 회색 텍스트 |
| → | RUN (현재) | #FFF3E0 | 굵은 글씨, 주황색 좌측 보더 |
| ☐ | WAIT (대기) | 투명 | 일반 텍스트 |

#### 항목 정렬 순서
`rank` 필드 기준 오름차순 (로케이션 이동 최적화 순서)

---

### 피킹 확인 프로세스

작업자가 바코드를 스캔하고 피킹 확인 버튼을 누르면:

```
[바코드 스캔] → [바코드 검증] → [수량 입력] → [피킹 확인]
                                                    ↓
                                              [API 호출]
                                                    ↓
                                        [성공: 다음 항목 이동]
                                        [실패: 에러 표시 + 재시도]
```

#### 바코드 검증 로직

1. **스캔된 바코드** vs **항목의 barcode** 비교
2. 일치하면 → 수량 입력 필드 활성화 (기본값: orderQty)
3. 불일치하면 → 에러 피드백 + 음성 안내 "바코드가 일치하지 않습니다"

#### 피킹 확인 API

**방법 1: 개별 항목 피킹 (권장 — PDA 작업)**
```
POST /rest/outbound_trx/picking_orders/item/{pickItemId}/{inventoryId}
```
- 바코드 검증, 로케이션 검증, LOT 검증 서버에서 수행
- 재고 이동 (피킹존 → 출고대기존) 자동 처리
- 진행률 자동 계산
- 100% 완료 시 자동 마감

**방법 2: Operator 전용 API (상세 검증)**
```
PUT /rest/picking_orders/item/operator/{id}
Body: {
  barcode: "scanned_barcode",
  fromLocCd: "A-01-02-03",
  lotNo: "LOT20260301",
  pickQty: 3,
  pickBox: 0,
  pickEa: 3
}
```
- 바코드/로케이션/LOT 3중 검증
- 부분 피킹 지원 (pickQty < orderQty)
- 상태 자동 전이 (END/RUN/WAIT)
- 피킹 지시 자동 마감 체크
- 출고 지시 항목 수량 자동 업데이트

#### 피드백 토스트

| 유형 | 배경색 | 메시지 예시 | 음성 안내 |
|------|--------|------------|----------|
| 성공 | #4CAF50 | "피킹 완료 (7/12)" | "피킹 완료. 다음 항목으로 이동합니다." |
| 에러 | #F44336 | "바코드 불일치" | "바코드가 일치하지 않습니다." |
| 경고 | #FF9800 | "수량 초과" | "지시 수량을 초과할 수 없습니다." |
| 정보 | #2196F3 | "로케이션 이동: B-02" | "다음 로케이션은 B-02입니다." |

#### 건너뛰기 동작
- 현재 항목을 건너뛰고 다음 미완료 항목으로 이동
- 건너뛴 항목은 상태 변경 없이 목록에서 ☐(대기) 유지
- 모든 항목을 돌았는데 미완료 항목이 남은 경우 → "미완료 항목이 N건 있습니다. 다시 시도하시겠습니까?" 팝업

---

### 4단계: 피킹 완료 화면

모든 항목의 피킹이 완료되면 완료 화면을 표시한다.

```
┌──────────────────────────────────┐
│                                  │
│          ✅ 피킹 완료!           │
│                                  │
│  ┌──────────────────────────┐   │
│  │  피킹 지시: PKO-001       │   │
│  │  총 SKU: 12종             │   │
│  │  총 수량: 48 EA           │   │
│  │  소요 시간: 12분 34초      │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  📄 피킹 지시서 출력       │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  📋 다음 피킹 지시 시작    │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  🏠 목록으로 돌아가기      │   │
│  └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

#### 완료 시 자동 처리

1. 피킹 지시 마감: `closePickingOrder()` → status = END
2. 출고 지시 상태 변경: RUN → PICKED (개별 출고인 경우)
3. `out.picking.order.auto-close.enabled = true` 설정 시 자동 수행

#### 피킹 지시서 출력
```
POST /rest/outbound_trx/picking_orders/{id}/print_picking_sheet
Query: template={template_name}&printer_id={printer_id}
```
- 설정키: `out.picking.order.sheet.template`
- 프린터 ID는 PDA 설정에서 지정

---

## 🔧 컴포넌트 구조

### Properties 정의

```javascript
class OutboundPickingWork extends localize(i18next)(PageView) {
  static properties = {
    // 화면 상태
    loading: { type: Boolean },
    screen: { type: String },         // 'order-select' | 'work' | 'complete'

    // 피킹 지시 목록 (1단계)
    pickingOrders: { type: Array },

    // 선택된 피킹 지시 (2~4단계)
    pickingOrder: { type: Object },
    pickingItems: { type: Array },

    // 작업 진행 상태
    currentItemIndex: { type: Number },
    completedCount: { type: Number },
    totalCount: { type: Number },

    // 스캔/입력
    scanValue: { type: String },
    pickQty: { type: Number },
    barcodeMatched: { type: Boolean },

    // 피드백
    feedbackMsg: { type: String },
    feedbackType: { type: String },   // 'success' | 'error' | 'warning' | 'info'

    // 서비스
    voiceEnabled: { type: Boolean },
    startTime: { type: Number }       // 작업 시작 시각 (소요 시간 계산용)
  }
}
```

### 라이프사이클

```javascript
async pageUpdated(changes, lifecycle, before) {
  if (this.active) {
    this._startScannerService()
    await this._loadPickingOrders()
  } else {
    this._stopScannerService()
  }
}

pageDisposed(lifecycle) {
  this._stopScannerService()
}
```

### 주요 메서드

```javascript
// 1단계: 피킹 지시 목록 로딩
async _loadPickingOrders()

// 1단계: 바코드 스캔으로 피킹 지시 선택
async _onScanPickingOrder(barcode)

// 2단계: 피킹 작업 시작
async _startPickingWork(pickingOrder)

// 3단계: 바코드 스캔 이벤트 핸들러
_onBarcodeScan(e)

// 3단계: 바코드 검증
_validateBarcode(scannedBarcode)

// 3단계: 피킹 확인
async _confirmPick()

// 3단계: 항목 건너뛰기
_skipCurrentItem()

// 3단계: 다음 미완료 항목으로 이동
_moveToNextItem()

// 4단계: 피킹 완료 처리
_onPickingComplete()

// 4단계: 피킹 지시서 출력
async _printPickingSheet()

// 서비스: 음성 안내
_voiceGuide(message)

// 서비스: 피드백 토스트 표시
_showFeedback(type, message)

// 서비스: 하드웨어 스캐너
_startScannerService()
_stopScannerService()
```

---

## 🔄 API 흐름 요약

### 전체 API 호출 시퀀스

```
┌─────────────────────────────────────────────────────────┐
│ 1단계: 피킹 지시 선택                                     │
│   GET /rest/picking_orders?status=WAIT,RUN               │
│       &order_date={today}&biz_type=B2C_OUT               │
├─────────────────────────────────────────────────────────┤
│ 2단계: 작업 시작                                          │
│   POST /rest/outbound_trx/picking_orders/{id}/start      │
│   GET  /rest/picking_orders/{id}/items                   │
├─────────────────────────────────────────────────────────┤
│ 3단계: 항목별 피킹 (반복)                                  │
│   PUT /rest/picking_orders/item/operator/{itemId}        │
│     Body: { barcode, fromLocCd, lotNo, pickQty, ... }    │
├─────────────────────────────────────────────────────────┤
│ 4단계: 완료                                               │
│   (자동 마감 — 마지막 항목 피킹 시 서버에서 자동 처리)        │
│   POST /rest/outbound_trx/picking_orders/{id}/           │
│         print_picking_sheet (선택)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 스타일 가이드 (PDA 최적화)

### 전체 레이아웃
```css
:host {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #F5F5F5;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### 터치 타겟 (최소 크기)
```css
button, .touchable {
  min-height: 52px;
  min-width: 52px;
  font-size: 16px;
  padding: 12px 24px;
  border-radius: 8px;
}
```

### 피킹 확인 버튼 (강조)
```css
.btn-confirm-pick {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  color: white;
  font-size: 18px;
  font-weight: 700;
  min-height: 56px;
  flex: 2;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.btn-confirm-pick:active {
  transform: scale(0.97);
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}
```

### 건너뛰기 버튼
```css
.btn-skip {
  background: #F5F5F5;
  color: #757575;
  font-size: 14px;
  min-height: 52px;
  flex: 1;
  border: 1px solid #E0E0E0;
  border-radius: 12px;
}
```

### 피드백 토스트
```css
.feedback-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  z-index: 1000;
  animation: fadeInOut 2s ease;
  max-width: 90%;
  text-align: center;
}

.feedback-success { background: #4CAF50; }
.feedback-error   { background: #F44336; }
.feedback-warning { background: #FF9800; }
.feedback-info    { background: #2196F3; }

@keyframes fadeInOut {
  0%   { opacity: 0; transform: translateX(-50%) translateY(20px); }
  15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  85%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
```

### 진행률 바
```css
.progress-bar {
  height: 8px;
  background: #E0E0E0;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF9800, #4CAF50);
  border-radius: 4px;
  transition: width 0.3s ease;
}
```

---

## 📱 음성 안내 시나리오

VoiceService를 활용한 피킹 작업 음성 안내:

| 시점 | 음성 메시지 | 메서드 |
|------|-----------|--------|
| 작업 시작 | "피킹 작업을 시작합니다. 총 {N}건입니다." | `guide()` |
| 항목 이동 | "{로케이션}으로 이동하세요." | `guide()` |
| 바코드 일치 | "확인되었습니다." (비프음) | `success()` |
| 바코드 불일치 | "바코드가 일치하지 않습니다." | `error()` |
| 피킹 확인 | "피킹 완료. {완료}/{전체}." | `success()` |
| 수량 초과 | "지시 수량을 초과할 수 없습니다." | `warning()` |
| 로케이션 변경 | "다음 로케이션은 {loc}입니다." | `info()` |
| 전체 완료 | "모든 피킹이 완료되었습니다." | `success()` |

---

## ⚙️ 관련 설정값 (RuntimeEnvItem)

| 설정키 | 기본값 | 설명 | 화면 영향 |
|--------|--------|------|----------|
| `out.release.waiting.location` | - | 출고 대기 로케이션 | 피킹 후 재고 이동 목적지 |
| `out.picking.reservation.method` | BARCODE | 피킹 예약 방법 | BARCODE: 바코드 스캔 필수 |
| `out.picking.reservation.strategy` | FIFO | 피킹 예약 전략 | 항목 순서(rank) 결정 |
| `out.picking.order.auto-close.enabled` | false | 자동 마감 여부 | true: 마지막 항목 완료 시 자동 마감 |
| `out.picking.auto-start.release-order.started` | false | 피킹 시작 시 출고 자동 시작 | true: 피킹 시작과 동시에 출고 지시 RUN |
| `out.picking.order.sheet.template` | - | 피킹 지시서 템플릿 | 완료 화면에서 출력 시 사용 |

---

## 📝 구현 순서

1. **프론트엔드 화면 파일 생성**
   - [ ] `outbound-picking-work.js` — PDA 피킹 작업 화면
   - [ ] `route.ts`에 라우트 등록
   - [ ] `things-factory.config.js`에 페이지 등록

2. **1단계: 피킹 지시 선택 화면**
   - [ ] 피킹 지시 목록 로딩 및 카드 렌더링
   - [ ] 바코드 스캔으로 피킹 지시 선택
   - [ ] 상태별 필터링 (WAIT/RUN만)

3. **3단계: 피킹 작업 화면**
   - [ ] 현재 항목 카드 (로케이션, SKU, 수량)
   - [ ] 바코드 스캔 → 검증 → 피킹 확인 플로우
   - [ ] 항목 체크리스트 (완료/현재/대기)
   - [ ] 진행률 표시
   - [ ] 건너뛰기 기능

4. **4단계: 완료 화면**
   - [ ] 완료 통계 (SKU, 수량, 소요 시간)
   - [ ] 피킹 지시서 출력 버튼
   - [ ] 다음 작업/목록 복귀 네비게이션

5. **부가 기능**
   - [ ] VoiceService 음성 안내 연동
   - [ ] HardwareScannerService 하드웨어 스캐너 연동
   - [ ] 피드백 토스트 UI

---

## 📚 참조 문서

- 출고 대시보드 설계: 본 문서 상단 섹션
- 출고 테이블 설계: `docs/design/outbound-table-design.md`
- VAS PDA 피킹 (패턴 참조): `frontend/packages/operato-wes/client/pages/work/vas-pda-pick.js`
- 반품 처분 작업 (패턴 참조): `frontend/packages/operato-wes/client/pages/work/rwa-disposition-work.js`
- 출고 엔티티: `src/main/java/operato/wms/outbound/entity/PickingOrder.java`
- 출고 트랜잭션: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
- 피킹 컨트롤러: `src/main/java/operato/wms/outbound/rest/PickingOrderController.java`
- 출고 상수: `src/main/java/operato/wms/outbound/WmsOutboundConstants.java`
- 출고 설정: `src/main/java/operato/wms/outbound/WmsOutboundConfigConstants.java`

---
---

# B2C 출고 검수/포장 화면 설계 (PDA)

## 문서 정보
- **작성일**: 2026-03-25
- **목적**: B2C 출고 피킹 완료 후 검수 및 포장 작업을 위한 PDA 모바일 화면 설계
- **참조**: pda-wms-shipment-barcode.ts, outbound-picking-work.js, OutboundTransactionService.java
- **대상 사용자**: 창고 검수/포장 작업자 (PDA/모바일 단말기)
- **선행 조건**: 피킹 작업 완료 (ReleaseOrder.status = PICKED)

---

## 화면 개요

### 목적
B2C 택배 출고 주문에 대해 피킹 완료된 상품의 검수(바코드 스캔으로 수량/품목 확인)와 포장(박스 배정, 운송장 등록)을 PDA 단말기에서 수행하는 모바일 최적화 화면.

### 업무 위치
```
주문 접수 → 피킹 지시 → 피킹 작업 → [검수/포장] → 최종 출고 확정
                                       ^^^^^^^^
                                       본 화면 범위
```

### 화면 흐름
```
[출고 지시 선택] → [검수 작업] → [포장/운송장] → [출고 확정]
     (1단계)         (2단계)        (3단계)         (4단계)
```

### 파일 경로
```
frontend/packages/operato-wes/client/pages/work/outbound-inspection-work.js
```

### 라우트 등록
```javascript
// route.ts
import './pages/work/outbound-inspection-work'

// things-factory.config.js
{ tagname: 'outbound-inspection-work', page: 'outbound-inspection-work' }
```

---

## 화면 구성

### 1단계: 출고 지시 선택 화면

피킹 완료(PICKED) 상태의 출고 지시를 선택하거나 바코드를 스캔하여 검수 작업을 시작한다.

```
┌──────────────────────────────────┐
│  검수/포장 작업                    │
│                                  │
│  ┌──────────────────────────┐   │
│  │  출고 지시번호 스캔        │   │
│  │  [___________________]   │   │
│  └──────────────────────────┘   │
│                                  │
│  ── 검수 대기 목록 ──            │
│                                  │
│  ┌──────────────────────────┐   │
│  │  RLS-20260325-001         │   │
│  │  고객: 홍길동              │   │
│  │  SKU: 3종 | 수량: 5EA     │   │
│  │  피킹 완료: 10:32          │   │
│  │  배송: CJ대한통운          │   │
│  │               [검수 시작]  │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  RLS-20260325-002         │   │
│  │  고객: 김철수              │   │
│  │  SKU: 1종 | 수량: 2EA     │   │
│  │  피킹 완료: 10:45          │   │
│  │  배송: 한진택배            │   │
│  │               [검수 시작]  │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  RLS-20260325-003         │   │
│  │  고객: 박영희              │   │
│  │  SKU: 7종 | 수량: 12EA    │   │
│  │  피킹 완료: 11:03          │   │
│  │  배송: 롯데택배            │   │
│  │               [검수 시작]  │   │
│  └──────────────────────────┘   │
│                                  │
│  검수 대기: 3건                  │
│                                  │
└──────────────────────────────────┘
```

#### 출고 지시 카드 정보

| 필드 | 소스 | 설명 |
|------|------|------|
| 출고 지시번호 | `rlsOrdNo` | RLS-YYYYMMDD-NNN |
| 고객명 | `DeliveryInfo.receiverNm` | 수령인 이름 |
| SKU 종수 | items count (distinct skuCd) | 검수 대상 SKU 종류 |
| 총 수량 | items sum (rlsQty) | 총 검수 수량 (EA) |
| 피킹 완료 시각 | `startedAt` or picking finishedAt | HH:mm 표시 |
| 배송업체 | `DeliveryInfo.dlvVendCd` | 택배사 이름 |

#### 카드 스타일

| 조건 | border-left 색상 | 설명 |
|------|-----------------|------|
| 기본 (PICKED) | #FF9800 (주황색) | 검수 대기 |
| 긴급 주문 | #F44336 (빨간색) | 당일 마감 등 |
| 소량 (1~2건) | #4CAF50 (녹색) | 빠른 처리 가능 |

#### API 호출
```
GET /rest/release_orders?status=PICKED&biz_type=B2C_OUT&order_date={today}
```
- `domain_id` 자동 포함
- 바코드 스캔 시: `rlsOrdNo`로 검색
- DeliveryInfo JOIN으로 배송 정보 함께 조회

---

### 2단계: 검수 작업 화면

피킹된 상품을 바코드 스캔으로 하나씩 확인한다. 피킹 목록과 대조하여 품목/수량이 정확한지 검수한다.

```
┌──────────────────────────────────┐
│  RLS-20260325-001        🔊  ✕  │
│  ████████████░░░░  3/5 (60%)    │
│                                  │
│  ── 현재 검수 항목 ──            │
│                                  │
│  ┌──────────────────────────┐   │
│  │  상품 정보                │   │
│  │  SKU: SKU-A1234           │   │
│  │  상품명: 에어팟 프로 2세대 │   │
│  │  LOT: LOT20260301         │   │
│  │  유통기한: 2027-03-01     │   │
│  │                           │   │
│  │  출고 수량: 2 EA           │   │
│  │                           │   │
│  │  바코드 스캔               │   │
│  │  [___________________]    │   │
│  │                           │   │
│  │  검수 수량: [  2  ] EA    │   │
│  │                           │   │
│  │  ┌────────┐ ┌──────────┐ │   │
│  │  │ 건너뛰기 │ │ 검수 확인  │ │   │
│  │  └────────┘ └──────────┘ │   │
│  └──────────────────────────┘   │
│                                  │
│  ── 검수 항목 목록 ──            │
│                                  │
│  ✅ SKU-B5678 에어팟 케이스 × 1  │
│  ✅ SKU-C9012 충전 케이블   × 1  │
│  ✅ SKU-D3456 스크린 필름   × 1  │
│  → SKU-A1234 에어팟 프로    × 2  │  ← 현재
│  ☐ SKU-E7890 보호 파우치    × 1  │
│                                  │
└──────────────────────────────────┘
```

#### 검수 항목 카드 정보

| 필드 | 소스 (ReleaseOrderItem) | 표시 |
|------|------------------------|------|
| SKU 코드 | `skuCd` / `productCd` | 고정폭 글꼴 |
| 상품명 | `skuNm` / `productNm` | 일반 텍스트 |
| LOT 번호 | `lotNo` | 있을 때만 표시 |
| 유통기한 | `expiredDate` | 있을 때만 표시 |
| 출고 수량 | `rlsQty` | 굵은 글씨 |
| 바코드 입력 | `barcode` 비교용 | OxInputBarcode 컴포넌트 |
| 검수 수량 | `rptQty` 입력 | 기본값 = rlsQty |

#### 검수 확인 프로세스

```
[바코드 스캔] → [바코드 검증] → [수량 입력/확인] → [검수 확인]
                                                       ↓
                                                 [API 호출]
                                                       ↓
                                           [성공: 다음 항목 이동]
                                           [실패: 에러 표시 + 재시도]
```

#### 바코드 검증 로직

1. **스캔된 바코드** vs **항목의 barcode** 비교
2. 일치하면 → 수량 입력 필드 활성화 (기본값: rlsQty)
3. 불일치하면 → 에러 피드백 + 음성 안내 "바코드가 일치하지 않습니다"
4. 수량 불일치 시 (부분 검수):
   - 검수 수량 < 출고 수량 → 경고 "부분 검수입니다. 계속하시겠습니까?"
   - 검수 수량 > 출고 수량 → 에러 "출고 수량을 초과할 수 없습니다"

#### 검수 확인 API

```
POST /rest/outbound_trx/release_orders/line/{release_order_item_id}/finish
Body: {
  barcode: "scanned_barcode",
  locCd: "SHIP-ZONE-01",
  rlsQty: 2,
  expiredDate: "2027-03-01",
  lotNo: "LOT20260301"
}
```
- 개별 출고 라인을 END 상태로 변경
- 모든 라인 완료 시 ReleaseOrder 상태 자동 확인

#### 검수 항목 목록 (체크리스트)

| 아이콘 | 상태 | 배경색 | 글꼴 |
|--------|------|--------|------|
| ✅ | END (완료) | #E8F5E9 | 회색 텍스트 |
| → | 현재 검수중 | #FFF3E0 | 굵은 글씨, 주황색 좌측 보더 |
| ☐ | 대기 | 투명 | 일반 텍스트 |

#### 피드백 토스트

| 유형 | 배경색 | 메시지 예시 | 음성 안내 |
|------|--------|------------|----------|
| 성공 | #4CAF50 | "검수 완료 (3/5)" | "검수 완료. 다음 항목으로 이동합니다." |
| 에러 | #F44336 | "바코드 불일치" | "바코드가 일치하지 않습니다." |
| 경고 | #FF9800 | "수량 불일치" | "출고 수량과 다릅니다. 확인해주세요." |
| 정보 | #2196F3 | "전체 검수 완료" | "모든 상품의 검수가 완료되었습니다." |

---

### 3단계: 포장/운송장 화면

모든 검수 항목이 완료되면 포장 정보와 운송장 번호를 입력한다.

```
┌──────────────────────────────────┐
│  포장/운송장 등록                  │
│  RLS-20260325-001                │
│                                  │
│  ── 검수 완료 요약 ──             │
│                                  │
│  ┌──────────────────────────┐   │
│  │  총 SKU: 5종              │   │
│  │  총 수량: 6 EA            │   │
│  │  검수 소요: 3분 21초       │   │
│  └──────────────────────────┘   │
│                                  │
│  ── 배송 정보 ──                 │
│                                  │
│  ┌──────────────────────────┐   │
│  │  수령인: 홍길동            │   │
│  │  연락처: 010-1234-5678    │   │
│  │  주소: 서울시 강남구 ...   │   │
│  │  배송업체: CJ대한통운      │   │
│  └──────────────────────────┘   │
│                                  │
│  ── 포장 정보 입력 ──            │
│                                  │
│  박스 유형                       │
│  [  소형 ▼  ]                   │
│                                  │
│  박스 수량                       │
│  [  1  ] 개                     │
│                                  │
│  박스 중량 (선택)                 │
│  [     ] kg                     │
│                                  │
│  ── 운송장 등록 ──               │
│                                  │
│  운송장번호 스캔                  │
│  [___________________]          │
│                                  │
│  또는                            │
│  ┌──────────────────────────┐   │
│  │  자동 운송장 발급           │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │       출고 확정              │   │
│  └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

#### 배송 정보 표시 (읽기 전용)

| 필드 | 소스 (DeliveryInfo) | 설명 |
|------|---------------------|------|
| 수령인 | `receiverNm` | 수령인 이름 |
| 연락처 | `receiverPhone` | 수령인 전화번호 |
| 주소 | `receiverAddr` | 배송지 주소 |
| 배송업체 | `dlvVendCd` | 택배사 코드 → 이름 변환 |

#### 포장 정보 입력

| 필드 | 소스 (ReleaseOrder) | 입력 유형 | 기본값 |
|------|---------------------|----------|--------|
| 박스 유형 | `boxId` | 드롭다운 (소형/중형/대형/특대형) | 자동 추천 |
| 박스 수량 | `totalBox` | 숫자 입력 | 1 |
| 박스 중량 | `boxWt` | 숫자 입력 (선택) | - |

#### 박스 유형 자동 추천 로직
```
if (totalQty <= 3)  → 소형 (SMALL)
if (totalQty <= 10) → 중형 (MEDIUM)
if (totalQty <= 30) → 대형 (LARGE)
else                → 특대형 (XLARGE)
```

#### 운송장 등록 방법

**방법 1: 바코드 스캔**
- 택배사에서 발급받은 운송장 바코드를 스캔
- OxInputBarcode 컴포넌트 사용
- 스캔 후 `DeliveryInfo.dlvNo`에 자동 입력

**방법 2: 자동 발급**
- 택배사 연동 API를 통해 자동 발급
- 설정: `out.delivery.auto-invoice.enabled`
- 미구현 시 비활성화 처리

---

### 4단계: 출고 확정 및 완료 화면

운송장까지 등록이 완료되면 최종 출고를 확정한다.

```
┌──────────────────────────────────┐
│                                  │
│          ✅ 출고 완료!            │
│                                  │
│  ┌──────────────────────────┐   │
│  │  출고 지시: RLS-001        │   │
│  │  고객: 홍길동              │   │
│  │  총 SKU: 5종              │   │
│  │  총 수량: 6 EA            │   │
│  │  박스: 소형 × 1개          │   │
│  │  운송장: 123456789012     │   │
│  │  배송: CJ대한통운          │   │
│  │  소요 시간: 5분 12초       │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  배송 라벨 출력             │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  거래명세서 출력            │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  다음 검수 시작             │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  목록으로 돌아가기          │   │
│  └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

#### 출고 확정 처리 순서

```
[출고 확정 버튼 클릭]
  ↓
1. 포장 정보 저장 (ReleaseOrder: boxId, totalBox, boxWt)
  ↓
2. 운송장 정보 저장 (DeliveryInfo: dlvNo, invoiceNo)
  ↓
3. 출고 마감 API 호출
   POST /rest/outbound_trx/release_orders/{id}/close_by_params
   Body: {
     boxId: "SMALL",
     totalBox: 1,
     boxWt: 0.5,
     dlvNo: "123456789012",
     invoiceNo: "123456789012"
   }
  ↓
4. 서버 처리:
   - ReleaseOrder: PICKED → END
   - finishedAt 시간 기록
   - finalReleaseInventories() → 재고 최종 차감
   - DeliveryInfo 업데이트
  ↓
5. 완료 화면 표시
```

#### 출력 API

| 출력물 | API | 설정키 |
|--------|-----|--------|
| 배송 라벨 | `POST /rest/outbound_trx/release_orders/{id}/print_release_label` | `out.release.label.template` |
| 거래명세서 | `POST /rest/outbound_trx/release_orders/{id}/print_trade_statement` | `out.release.order.sheet.template` |

---

## 상태 전이 다이어그램

### ReleaseOrder 상태 (검수/포장 관련)

```
                     피킹 완료
                        ↓
  ... → RUN → PICKED → END
              ↑ 검수 시작   ↑ 출고 확정
              |             |
              | finishReleaseOrderLine()  (개별 라인)
              | closeReleaseOrder()       (최종 마감)
```

### ReleaseOrderItem 상태

```
  RUN → END (개별 라인 검수 완료)
   ↑      ↑
   |      finishReleaseOrderLine()
   |
   피킹 완료 후 상태
```

### 전체 프로세스 상태 연계

```
[PickingOrder]          [ReleaseOrder]         [DeliveryInfo]
WAIT → RUN → END   →   RUN → PICKED → END     dlvNo 등록
                         ↑              ↑
                     전체 피킹완료   출고확정
                     (자동 변경)    (수동 확정)
```

---

## 컴포넌트 구조

### Properties 정의

```javascript
class OutboundInspectionWork extends localize(i18next)(PageView) {
  static properties = {
    // 화면 상태
    loading: { type: Boolean },
    screen: { type: String },        // 'order-select' | 'inspection' | 'packing' | 'complete'

    // 출고 지시 목록 (1단계)
    releaseOrders: { type: Array },

    // 선택된 출고 지시 (2~4단계)
    releaseOrder: { type: Object },
    releaseItems: { type: Array },
    deliveryInfo: { type: Object },

    // 검수 진행 상태 (2단계)
    currentItemIndex: { type: Number },
    completedCount: { type: Number },
    totalCount: { type: Number },

    // 스캔/입력 (2단계)
    scanValue: { type: String },
    inspectionQty: { type: Number },
    barcodeMatched: { type: Boolean },

    // 포장 정보 (3단계)
    boxType: { type: String },       // 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE'
    boxCount: { type: Number },
    boxWeight: { type: Number },
    trackingNo: { type: String },

    // 피드백
    feedbackMsg: { type: String },
    feedbackType: { type: String },  // 'success' | 'error' | 'warning' | 'info'

    // 서비스
    voiceEnabled: { type: Boolean },
    startTime: { type: Number }      // 작업 시작 시각 (소요 시간 계산용)
  }
}
```

### 라이프사이클

```javascript
async pageUpdated(changes, lifecycle, before) {
  if (this.active) {
    this._startScannerService()
    await this._loadReleaseOrders()
  } else {
    this._stopScannerService()
  }
}

pageDisposed(lifecycle) {
  this._stopScannerService()
}
```

### 주요 메서드

```javascript
// 1단계: 검수 대기 출고 지시 목록 로딩
async _loadReleaseOrders()

// 1단계: 바코드 스캔으로 출고 지시 선택
async _onScanReleaseOrder(barcode)

// 2단계: 검수 작업 시작 (출고 지시 선택)
async _startInspection(releaseOrder)

// 2단계: 출고 항목 및 배송 정보 로딩
async _loadReleaseItems(releaseOrderId)
async _loadDeliveryInfo(releaseOrderId)

// 2단계: 바코드 스캔 이벤트 핸들러
_onBarcodeScan(value)

// 2단계: 바코드 검증
_validateBarcode(scannedBarcode)

// 2단계: 검수 확인 (개별 라인 완료)
async _confirmInspection()

// 2단계: 항목 건너뛰기
_skipCurrentItem()

// 2단계: 다음 미완료 항목으로 이동
_moveToNextItem()

// 2단계 → 3단계: 전체 검수 완료 → 포장 화면 전환
_onInspectionComplete()

// 3단계: 박스 유형 자동 추천
_recommendBoxType()

// 3단계: 운송장 바코드 스캔
_onTrackingScan(value)

// 3단계 → 4단계: 출고 확정
async _confirmRelease()

// 4단계: 배송 라벨 출력
async _printReleaseLabel()

// 4단계: 거래명세서 출력
async _printTradeStatement()

// 서비스: 음성 안내
_voiceGuide(message)

// 서비스: 피드백 토스트 표시
_showFeedback(type, message)

// 서비스: 하드웨어 스캐너
_startScannerService()
_stopScannerService()
```

---

## API 흐름 요약

### 전체 API 호출 시퀀스

```
┌─────────────────────────────────────────────────────────┐
│ 1단계: 출고 지시 선택                                     │
│   GET /rest/release_orders                               │
│       ?status=PICKED&biz_type=B2C_OUT&order_date={today} │
│   GET /rest/delivery_infos?release_order_id={id}         │
├─────────────────────────────────────────────────────────┤
│ 2단계: 검수 작업                                          │
│   GET  /rest/release_order_items                         │
│        ?release_order_id={id}&status=RUN,PICKED          │
│                                                          │
│   POST /rest/outbound_trx/release_orders/line            │
│        /{release_order_item_id}/finish  (반복)            │
│     Body: { barcode, locCd, rlsQty, lotNo, expiredDate } │
├─────────────────────────────────────────────────────────┤
│ 3단계: 포장/운송장                                        │
│   PUT /rest/release_orders/{id}                          │
│     Body: { boxId, totalBox, boxWt }                     │
│   PUT /rest/delivery_infos/{id}                          │
│     Body: { dlvNo, invoiceNo }                           │
├─────────────────────────────────────────────────────────┤
│ 4단계: 출고 확정                                          │
│   POST /rest/outbound_trx/release_orders/{id}/close      │
│     (또는 close_by_params)                                │
│                                                          │
│   POST /rest/outbound_trx/release_orders/{id}/           │
│         print_release_label (선택)                        │
│   POST /rest/outbound_trx/release_orders/{id}/           │
│         print_trade_statement (선택)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 스타일 가이드 (PDA 최적화)

### 전체 레이아웃
```css
:host {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #F5F5F5;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### 출고 지시 카드 (1단계)
```css
.release-order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-left: 4px solid #FF9800;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.release-order-card:active {
  transform: scale(0.98);
}

.release-order-card.urgent {
  border-left-color: #F44336;
}

.release-order-card .order-no {
  font-size: 16px;
  font-weight: 700;
  color: #212121;
}

.release-order-card .customer-name {
  font-size: 14px;
  color: #616161;
  margin-top: 4px;
}

.release-order-card .order-summary {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 13px;
  color: #757575;
}

.release-order-card .delivery-vendor {
  display: inline-block;
  background: #E3F2FD;
  color: #1565C0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 8px;
}
```

### 검수 확인 버튼 (2단계)
```css
.btn-confirm-inspection {
  background: linear-gradient(135deg, #2196F3, #1565C0);
  color: white;
  font-size: 18px;
  font-weight: 700;
  min-height: 56px;
  flex: 2;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

.btn-confirm-inspection:active {
  transform: scale(0.97);
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
}

.btn-confirm-inspection:disabled {
  background: #BDBDBD;
  box-shadow: none;
}
```

### 출고 확정 버튼 (3단계)
```css
.btn-confirm-release {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  font-size: 18px;
  font-weight: 700;
  min-height: 56px;
  width: 100%;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  margin-top: 16px;
}

.btn-confirm-release:disabled {
  background: #BDBDBD;
  box-shadow: none;
}
```

### 배송 정보 카드 (3단계)
```css
.delivery-info-card {
  background: #FFF8E1;
  border: 1px solid #FFE082;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
}

.delivery-info-card .label {
  font-size: 12px;
  color: #F57F17;
  font-weight: 600;
}

.delivery-info-card .value {
  font-size: 14px;
  color: #212121;
  margin-top: 2px;
}
```

### 포장 정보 입력 (3단계)
```css
.packing-form .form-group {
  margin-bottom: 16px;
}

.packing-form label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #616161;
  margin-bottom: 6px;
}

.packing-form select,
.packing-form input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  background: white;
}

.packing-form select:focus,
.packing-form input:focus {
  border-color: #2196F3;
  outline: none;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.15);
}
```

### 진행률 바
```css
.progress-bar {
  height: 8px;
  background: #E0E0E0;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF9800, #4CAF50);
  border-radius: 4px;
  transition: width 0.3s ease;
}
```

### 피드백 토스트
```css
.feedback-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  z-index: 1000;
  animation: fadeInOut 2s ease;
  max-width: 90%;
  text-align: center;
}

.feedback-success { background: #4CAF50; }
.feedback-error   { background: #F44336; }
.feedback-warning { background: #FF9800; }
.feedback-info    { background: #2196F3; }

@keyframes fadeInOut {
  0%   { opacity: 0; transform: translateX(-50%) translateY(20px); }
  15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  85%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
```

---

## 음성 안내 시나리오

VoiceService를 활용한 검수/포장 작업 음성 안내:

| 시점 | 음성 메시지 | 메서드 |
|------|-----------|--------|
| 검수 시작 | "검수 작업을 시작합니다. 총 {N}건입니다." | `guide()` |
| 바코드 일치 | "확인되었습니다." | `success()` |
| 바코드 불일치 | "바코드가 일치하지 않습니다." | `error()` |
| 검수 확인 | "검수 완료. {완료}/{전체}." | `success()` |
| 수량 불일치 | "수량이 다릅니다. 확인해주세요." | `warning()` |
| 전체 검수 완료 | "모든 검수가 완료되었습니다. 포장을 진행해주세요." | `info()` |
| 운송장 스캔 | "운송장이 등록되었습니다." | `success()` |
| 출고 확정 | "출고가 완료되었습니다." | `success()` |

---

## 관련 설정값 (RuntimeEnvItem)

| 설정키 | 기본값 | 설명 | 화면 영향 |
|--------|--------|------|----------|
| `out.release.waiting.location` | - | 출고 대기 로케이션 | 검수 완료 후 재고 이동 목적지 |
| `out.picking.order.auto-close.enabled` | false | 피킹 완료 시 자동 마감 | true: 검수 단계 생략 (직접 출고 확정) |
| `out.release.label.template` | - | 배송 라벨 템플릿 | 완료 화면에서 출력 시 사용 |
| `out.release.order.sheet.template` | - | 거래명세서 템플릿 | 완료 화면에서 출력 시 사용 |
| `out.delivery.auto-invoice.enabled` | false | 자동 운송장 발급 | true: 자동 발급 버튼 활성화 |

---

## 피킹 작업 화면과의 비교

| 항목 | 피킹 작업 화면 | 검수/포장 작업 화면 |
|------|--------------|-------------------|
| **파일** | outbound-picking-work.js | outbound-inspection-work.js |
| **대상 데이터** | PickingOrder/PickingOrderItem | ReleaseOrder/ReleaseOrderItem |
| **선행 상태** | PickingOrder.WAIT/RUN | ReleaseOrder.PICKED |
| **화면 모드** | 3단계 (선택→작업→완료) | 4단계 (선택→검수→포장→완료) |
| **바코드 검증** | 상품 바코드 + 로케이션 | 상품 바코드만 |
| **수량 관리** | pickQty (피킹 수량) | rptQty (검수 수량) |
| **추가 입력** | - | 박스 유형, 운송장번호 |
| **출력물** | 피킹 지시서 | 배송 라벨, 거래명세서 |
| **완료 시** | ReleaseOrder → PICKED | ReleaseOrder → END |
| **재고 변경** | 보관존 → 출고대기존 | 출고대기존 → 최종 출고 (삭제) |

---

## 구현 순서

1. **프론트엔드 화면 파일 생성**
   - [ ] `outbound-inspection-work.js` — PDA 검수/포장 작업 화면
   - [ ] `route.ts`에 라우트 등록
   - [ ] `things-factory.config.js`에 페이지 등록

2. **1단계: 출고 지시 선택 화면**
   - [ ] PICKED 상태 출고 지시 목록 로딩 및 카드 렌더링
   - [ ] 바코드 스캔으로 출고 지시 선택
   - [ ] 배송 정보(DeliveryInfo) 함께 표시

3. **2단계: 검수 작업 화면**
   - [ ] 검수 항목 카드 (SKU, 수량)
   - [ ] 바코드 스캔 → 검증 → 검수 확인 플로우
   - [ ] 항목 체크리스트 (완료/현재/대기)
   - [ ] 진행률 표시
   - [ ] 건너뛰기 기능

4. **3단계: 포장/운송장 화면**
   - [ ] 검수 완료 요약
   - [ ] 배송 정보 표시 (읽기 전용)
   - [ ] 포장 정보 입력 (박스 유형/수량/중량)
   - [ ] 운송장 바코드 스캔 또는 수동 입력

5. **4단계: 출고 확정 및 완료 화면**
   - [ ] 출고 확정 API 호출 (close_by_params)
   - [ ] 완료 통계 (SKU, 수량, 소요 시간)
   - [ ] 배송 라벨 / 거래명세서 출력 버튼
   - [ ] 다음 작업/목록 복귀 네비게이션

6. **부가 기능**
   - [ ] VoiceService 음성 안내 연동
   - [ ] HardwareScannerService 하드웨어 스캐너 연동
   - [ ] 피드백 토스트 UI

---

## 참조 문서

- 출고 대시보드 설계: 본 문서 상단 섹션
- B2C 피킹 작업 화면 설계: 본 문서 중간 섹션
- 출고 테이블 설계: `docs/design/outbound-table-design.md`
- 기존 PDA 출고 바코드: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-barcode.ts`
- 기존 PDA 출고 수량: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-quantity.ts`
- B2C 피킹 작업 구현: `frontend/packages/operato-wes/client/pages/work/outbound-picking-work.js`
- 출고 엔티티: `src/main/java/operato/wms/outbound/entity/ReleaseOrder.java`
- 배송 엔티티: `src/main/java/operato/wms/outbound/entity/DeliveryInfo.java`
- 출고 트랜잭션: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
- 출고 컨트롤러: `src/main/java/operato/wms/outbound/rest/OutboundTransactionController.java`
- 출고 상수: `src/main/java/operato/wms/outbound/WmsOutboundConstants.java`
- 출고 설정: `src/main/java/operato/wms/outbound/WmsOutboundConfigConstants.java`

---
---

# B2C 출고 검수/포장 화면 설계 (PC)

## 문서 정보
- **작성일**: 2026-03-25
- **목적**: B2C 출고 피킹 완료 후 검수 및 포장 작업을 위한 PC 데스크탑 화면 설계
- **참조**: rwa-inspection-list.js (PC 리스트 패턴), pda-wms-shipment-barcode.ts, OutboundTransactionService.java
- **대상 사용자**: 검수/포장 담당자 (PC + USB 바코드 스캐너)
- **선행 조건**: 피킹 작업 완료 (ReleaseOrder.status = PICKED)

---

## 화면 개요

### 목적
B2C 택배 출고 주문에 대해 피킹 완료된 상품의 검수(바코드 스캔으로 수량/품목 확인)와 포장(박스 배정, 운송장 등록)을 PC 화면에서 수행한다. PDA와 달리 넓은 화면을 활용하여 **출고 지시 목록과 검수 작업을 동시에** 볼 수 있다.

### PDA 화면과의 차이점

| 항목 | PDA 화면 | PC 화면 |
|------|---------|---------|
| **레이아웃** | 단일 컬럼, 단계별 전환 | 2패널 (좌: 목록, 우: 작업 영역) |
| **화면 전환** | 4단계 순차 모드 | 좌측 목록 항상 노출, 우측만 변경 |
| **바코드 입력** | OxInputBarcode + HardwareScannerService | 일반 input + USB 바코드 스캐너 |
| **데이터 표시** | 한 번에 1개 항목 | 전체 항목 테이블 + 스캔 시 자동 체크 |
| **음성 안내** | VoiceService 기본 활성 | 선택적 (기본 비활성) |
| **터치 최적화** | min-height 52px 버튼 | 일반 크기 버튼, hover 효과 |
| **너비** | max-width: 480px | 반응형 (전체 화면) |

### 업무 위치
```
주문 접수 → 피킹 지시 → 피킹 작업 → [검수/포장] → 최종 출고 확정
                                       ^^^^^^^^
                                       본 화면 범위
```

### 화면 흐름 (PC)
```
좌측 패널: 출고 지시 목록 (항상 표시)
우측 패널: [선택 대기] → [검수 작업] → [포장/운송장] → [출고 완료]
```

### 파일 경로
```
frontend/packages/operato-wes/client/pages/outbound/outbound-inspection.js
```

### 라우트 등록
```javascript
// route.ts
import './pages/outbound/outbound-inspection'

// things-factory.config.js
{ tagname: 'outbound-inspection', page: 'outbound-inspection' }
```

---

## 전체 레이아웃

### 2패널 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│  B2C 출고 검수/포장                             [새로고침] [설정]        │
├──────────────────────┬──────────────────────────────────────────────────┤
│                      │                                                  │
│  좌측 패널 (350px)    │  우측 패널 (나머지)                               │
│  출고 지시 목록        │  검수/포장 작업 영역                              │
│                      │                                                  │
│  ┌────────────────┐  │  (출고 지시를 선택하면 작업 영역이 표시됨)          │
│  │ [검색/필터]     │  │                                                  │
│  └────────────────┘  │                                                  │
│                      │                                                  │
│  검수 대기: 8건       │                                                  │
│                      │                                                  │
│  ┌────────────────┐  │                                                  │
│  │ RLS-001       ☐│  │                                                  │
│  │ 홍길동 | 5종 6EA│  │                                                  │
│  │ CJ대한통운      │  │                                                  │
│  │ 10:32          │  │                                                  │
│  └────────────────┘  │                                                  │
│  ┌────────────────┐  │                                                  │
│  │ RLS-002  ★ 긴급│  │                                                  │
│  │ 김철수 | 1종 2EA│  │                                                  │
│  │ 한진택배        │  │                                                  │
│  │ 10:45          │  │                                                  │
│  └────────────────┘  │                                                  │
│  ┌────────────────┐  │                                                  │
│  │ RLS-003       ☐│  │                                                  │
│  │ 박영희 | 7종12EA│  │                                                  │
│  │ 롯데택배        │  │                                                  │
│  │ 11:03          │  │                                                  │
│  └────────────────┘  │                                                  │
│  ...                 │                                                  │
│                      │                                                  │
├──────────────────────┴──────────────────────────────────────────────────┤
│  오늘 처리: 완료 23건 / 대기 8건 / 전체 31건                 14:32:05    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 좌측 패널: 출고 지시 목록

항상 표시되는 패널로, PICKED 상태의 출고 지시를 목록으로 보여준다.

### 검색/필터 영역

```
┌──────────────────────┐
│ [출고번호 검색____🔍] │
│                      │
│ [전체:31] [대기:8]   │
│ [진행:2]  [완료:21]  │
└──────────────────────┘
```

| 필터 | 조건 | 배지 색상 |
|------|------|----------|
| 전체 | 모든 상태 | #757575 (회색) |
| 대기 | status = PICKED | #FF9800 (주황) |
| 진행 | 검수 진행중 (클라이언트 상태) | #2196F3 (파란) |
| 완료 | status = END | #4CAF50 (녹색) |

### 출고 지시 카드

```
┌────────────────────────┐
│ RLS-20260325-001    ☐  │
│ 홍길동 | 5종 6EA       │
│ ┌──────────┐           │
│ │CJ대한통운 │           │
│ └──────────┘           │
│ 피킹완료: 10:32        │
│ ████████░░░░ 60%       │  ← 검수 진행중일 때만
└────────────────────────┘
```

#### 카드 상태별 스타일

| 상태 | border-left | 배경 | 설명 |
|------|------------|------|------|
| 대기 (PICKED) | #FF9800 | white | 검수 전 |
| 진행중 | #2196F3 | #E3F2FD | 검수 작업 중 (선택됨) |
| 긴급 | #F44336 | #FFF3E0 | 당일 마감 등 |
| 완료 (END) | #4CAF50 | #F5F5F5 | 출고 확정 완료 |

#### API 호출
```
GET /rest/release_orders?status=PICKED,END&biz_type=B2C_OUT&order_date={today}
```

---

## 우측 패널: 작업 영역

출고 지시를 선택하면 우측에 작업 영역이 표시된다.

### 선택 대기 상태 (미선택)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
│              좌측 목록에서 출고 지시를 선택하세요           │
│                                                          │
│              또는 출고 지시번호를 스캔하세요               │
│              [______________________] 🔍                 │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 검수 작업 상태

출고 지시를 선택하면 검수 작업 영역이 표시된다.

```
┌──────────────────────────────────────────────────────────┐
│  RLS-20260325-001 | 홍길동 | CJ대한통운        [✕ 닫기]  │
│  ████████████░░░░░  3/5 완료 (60%)                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌── 바코드 스캔 ──────────────────────────────────────┐ │
│  │  [바코드를 스캔하세요________________________] 🔍    │ │
│  │  마지막 스캔: SKU-C9012 (충전 케이블) ✅             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── 검수 항목 목록 ───────────────────────────────────┐ │
│  │                                                      │ │
│  │  # │ SKU        │ 상품명          │ LOT      │ 출고  │ │
│  │    │            │                 │          │ 수량  │ │
│  │────┼────────────┼─────────────────┼──────────┼───────│ │
│  │ 1  │ SKU-B5678  │ 에어팟 케이스    │ -        │ 1 ✅  │ │
│  │ 2  │ SKU-C9012  │ 충전 케이블      │ -        │ 1 ✅  │ │
│  │ 3  │ SKU-D3456  │ 스크린 필름      │ -        │ 1 ✅  │ │
│  │ 4  │ SKU-A1234  │ 에어팟 프로 2세대│LOT260301 │ 2 ☐  │ │  ← 현재
│  │ 5  │ SKU-E7890  │ 보호 파우치      │ -        │ 1 ☐  │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── 현재 스캔 대상 ───────────────────────────────────┐ │
│  │  SKU-A1234 | 에어팟 프로 2세대                       │ │
│  │  LOT: LOT20260301 | 유통기한: 2027-03-01             │ │
│  │  출고 수량: 2 EA                                     │ │
│  │                                                      │ │
│  │  검수 수량: [ 2 ] EA    [건너뛰기] [✓ 검수 확인]     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### 검수 항목 테이블 컬럼

| 컬럼 | 소스 | 너비 | 설명 |
|------|------|------|------|
| # | row index | 40px | 순번 |
| SKU | `skuCd` / `productCd` | 120px | SKU 코드 |
| 상품명 | `skuNm` / `productNm` | flex | 상품명 |
| LOT | `lotNo` | 100px | LOT 번호 (없으면 `-`) |
| 유통기한 | `expiredDate` | 100px | YYYY-MM-DD (없으면 `-`) |
| 출고수량 | `rlsQty` | 80px | 숫자 + 단위 |
| 상태 | - | 40px | ✅ 완료 / ☐ 대기 |

#### 테이블 행 스타일

| 상태 | 배경색 | 글꼴 | 아이콘 |
|------|--------|------|--------|
| 완료 (END) | #E8F5E9 | #9E9E9E (회색) | ✅ |
| 현재 스캔 대상 | #FFF3E0 + 좌측 3px 주황 보더 | 굵은 글씨 #212121 | → |
| 대기 | 투명 | #616161 | ☐ |

#### 바코드 스캔 로직 (USB 스캐너)

USB 바코드 스캐너는 키보드 입력으로 동작하므로 일반 input 필드에 자동 포커스를 유지한다.

```javascript
_onBarcodeInput(e) {
  if (e.key === 'Enter') {
    const barcode = e.target.value.trim()
    if (!barcode) return

    // 항목 검색: barcode 매칭
    const matchIndex = this.releaseItems.findIndex(
      item => item.status !== 'END' && item.barcode === barcode
    )

    if (matchIndex >= 0) {
      this.currentItemIndex = matchIndex
      this._autoConfirmIfSingleQty()
    } else {
      this._showFeedback('error', '일치하는 상품이 없습니다')
    }

    e.target.value = ''
    e.target.focus()
  }
}
```

**자동 확인 로직**: 수량이 1인 항목은 바코드 스캔만으로 자동 검수 완료 처리
```javascript
_autoConfirmIfSingleQty() {
  const item = this.releaseItems[this.currentItemIndex]
  if (item.rlsQty === 1) {
    this._confirmInspection()  // 자동 확인
  }
  // 수량 2 이상이면 수량 입력 필요 → 현재 스캔 대상 패널 표시
}
```

#### 검수 확인 API
```
POST /rest/outbound_trx/release_orders/line/{release_order_item_id}/finish
Body: {
  barcode: "scanned_barcode",
  locCd: "SHIP-ZONE-01",
  rlsQty: 2,
  expiredDate: "2027-03-01",
  lotNo: "LOT20260301"
}
```

---

### 포장/운송장 상태

모든 검수 항목이 완료되면 포장/운송장 입력 영역으로 전환된다.

```
┌──────────────────────────────────────────────────────────┐
│  RLS-20260325-001 | 홍길동 | CJ대한통운        [✕ 닫기]  │
│  ████████████████  5/5 검수 완료 (100%)                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌── 검수 완료 요약 ──────────────┬── 배송 정보 ────────┐ │
│  │                                │                      │ │
│  │  총 SKU: 5종                   │  수령인: 홍길동       │ │
│  │  총 수량: 6 EA                 │  연락처: 010-1234-.. │ │
│  │  검수 소요: 2분 15초            │  주소: 서울시 강남.. │ │
│  │  전체 일치: ✅                  │  배송: CJ대한통운    │ │
│  │                                │                      │ │
│  └────────────────────────────────┴──────────────────────┘ │
│                                                          │
│  ┌── 포장 정보 ─────────────────────────────────────────┐ │
│  │                                                      │ │
│  │  박스 유형: [소형 ▼]   박스 수량: [ 1 ]개            │ │
│  │  박스 중량: [    ] kg  (선택)                         │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── 운송장 등록 ───────────────────────────────────────┐ │
│  │                                                      │ │
│  │  운송장번호: [____________________________] 🔍       │ │
│  │                                                      │ │
│  │  [자동 운송장 발급]  (택배사 연동 시)                  │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                    출고 확정                           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [배송 라벨 출력]  [거래명세서 출력]                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### 포장 정보 (인라인 폼)

| 필드 | 소스 | 입력 유형 | 기본값 | PC 특화 |
|------|------|----------|--------|---------|
| 박스 유형 | `boxId` | 드롭다운 | 자동 추천 | 키보드 단축키 (1:소/2:중/3:대) |
| 박스 수량 | `totalBox` | 숫자 | 1 | Tab으로 이동 |
| 박스 중량 | `boxWt` | 숫자 (선택) | - | - |

#### 운송장 등록

| 방법 | 설명 | 동작 |
|------|------|------|
| USB 바코드 스캔 | 운송장 바코드 스캔 | input에 자동 입력 |
| 수동 입력 | 키보드로 직접 입력 | - |
| 자동 발급 | 택배사 API 연동 | 설정 활성화 시 버튼 표시 |

#### 출고 확정 API
```
POST /rest/outbound_trx/release_orders/{id}/close_by_params
Body: {
  boxId: "SMALL",
  totalBox: 1,
  boxWt: 0.5,
  dlvNo: "123456789012",
  invoiceNo: "123456789012"
}
```

---

### 출고 완료 상태

출고 확정 완료 후 좌측 목록을 자동 갱신하고, 다음 대기 건 자동 선택 옵션을 제공한다.

```
┌──────────────────────────────────────────────────────────┐
│  RLS-20260325-001 | 홍길동 | CJ대한통운                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    ✅ 출고 완료!                           │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  출고 지시: RLS-20260325-001                          │ │
│  │  고객: 홍길동                                         │ │
│  │  총 SKU: 5종 | 총 수량: 6 EA                          │ │
│  │  박스: 소형 × 1개                                     │ │
│  │  운송장: 123456789012                                 │ │
│  │  배송: CJ대한통운                                     │ │
│  │  소요 시간: 3분 28초                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [배송 라벨 출력]  [거래명세서 출력]  [다음 검수 시작 →]   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**다음 검수 시작**: 클릭 시 좌측 목록의 다음 대기 건을 자동 선택

---

## 키보드 단축키 (PC 최적화)

| 단축키 | 동작 | 화면 |
|--------|------|------|
| `Enter` | 바코드 스캔 확인 / 검수 확인 | 검수 |
| `Tab` | 다음 입력 필드로 이동 | 전체 |
| `Escape` | 현재 작업 취소 / 닫기 | 전체 |
| `F2` | 검수 확인 | 검수 |
| `F3` | 항목 건너뛰기 | 검수 |
| `F5` | 목록 새로고침 | 전체 |
| `F8` | 출고 확정 | 포장 |
| `Ctrl+P` | 배송 라벨 출력 | 완료 |

---

## 컴포넌트 구조

### Properties 정의

```javascript
class OutboundInspection extends localize(i18next)(PageView) {
  static properties = {
    // 화면 상태
    loading: { type: Boolean },
    rightPanelMode: { type: String },  // 'empty' | 'inspection' | 'packing' | 'complete'

    // 좌측 패널: 출고 지시 목록
    releaseOrders: { type: Array },
    filterStatus: { type: String },    // 'ALL' | 'PICKED' | 'WORKING' | 'END'
    searchKeyword: { type: String },
    statusCounts: { type: Object },    // { all: 31, picked: 8, working: 2, end: 21 }

    // 우측 패널: 선택된 출고 지시
    selectedOrder: { type: Object },   // ReleaseOrder
    releaseItems: { type: Array },     // ReleaseOrderItem[]
    deliveryInfo: { type: Object },    // DeliveryInfo

    // 검수 진행 상태
    currentItemIndex: { type: Number },
    completedCount: { type: Number },
    totalCount: { type: Number },
    lastScannedItem: { type: Object }, // 마지막 스캔 결과

    // 포장 정보
    boxType: { type: String },
    boxCount: { type: Number },
    boxWeight: { type: Number },
    trackingNo: { type: String },

    // 피드백
    feedbackMsg: { type: String },
    feedbackType: { type: String },

    // 타이머
    startTime: { type: Number }
  }
}
```

### 라이프사이클

```javascript
async pageUpdated(changes, lifecycle, before) {
  if (this.active) {
    await this._loadReleaseOrders()
    this._setupKeyboardShortcuts()
  } else {
    this._removeKeyboardShortcuts()
  }
}

pageDisposed(lifecycle) {
  this._removeKeyboardShortcuts()
}
```

### 주요 메서드

```javascript
// === 좌측 패널: 목록 관리 ===
async _loadReleaseOrders()     // 출고 지시 목록 로딩 (필터 적용)
_onFilterChange(status)        // 필터 변경
_onSearch(keyword)             // 검색 (출고번호/고객명)
_onSelectOrder(releaseOrder)   // 목록 항목 선택

// === 우측 패널: 검수 작업 ===
async _startInspection(releaseOrder)            // 검수 시작
async _loadReleaseItems(releaseOrderId)         // 출고 항목 로딩
async _loadDeliveryInfo(releaseOrderId)         // 배송 정보 로딩
_onBarcodeInput(e)                              // 바코드 입력 처리 (USB)
_matchAndConfirm(barcode)                       // 바코드 매칭 → 항목 검수
_autoConfirmIfSingleQty()                       // 수량 1 자동 확인
async _confirmInspection()                      // 검수 확인 (개별 라인)
_skipCurrentItem()                              // 항목 건너뛰기
_moveToNextItem()                               // 다음 미완료 항목
_onInspectionComplete()                         // 전체 검수 완료 → 포장

// === 우측 패널: 포장/운송장 ===
_recommendBoxType()                             // 박스 유형 자동 추천
_onTrackingInput(e)                             // 운송장 입력 처리
async _confirmRelease()                         // 출고 확정

// === 우측 패널: 완료 ===
async _printReleaseLabel()                      // 배송 라벨 출력
async _printTradeStatement()                    // 거래명세서 출력
_startNextInspection()                          // 다음 검수 시작

// === 공통 ===
_setupKeyboardShortcuts()                       // 키보드 단축키 설정
_removeKeyboardShortcuts()                      // 키보드 단축키 해제
_showFeedback(type, message)                    // 피드백 토스트 표시
_closeWork()                                    // 작업 닫기
```

---

## API 흐름 요약

### 전체 API 호출 시퀀스

```
┌───────────────────────────────────────────────────────────────┐
│ 좌측: 출고 지시 목록                                           │
│   GET /rest/release_orders                                     │
│       ?status=PICKED,END&biz_type=B2C_OUT&order_date={today}   │
├───────────────────────────────────────────────────────────────┤
│ 우측: 출고 지시 선택 시                                         │
│   GET  /rest/release_order_items                               │
│        ?release_order_id={id}                                  │
│   GET  /rest/delivery_infos                                    │
│        ?release_order_id={id}                                  │
├───────────────────────────────────────────────────────────────┤
│ 우측: 검수 작업 (반복)                                          │
│   POST /rest/outbound_trx/release_orders/line                  │
│        /{release_order_item_id}/finish                         │
│     Body: { barcode, locCd, rlsQty, lotNo, expiredDate }      │
├───────────────────────────────────────────────────────────────┤
│ 우측: 출고 확정                                                 │
│   POST /rest/outbound_trx/release_orders/{id}/close_by_params  │
│     Body: { boxId, totalBox, boxWt, dlvNo, invoiceNo }         │
├───────────────────────────────────────────────────────────────┤
│ 우측: 출력 (선택)                                               │
│   POST /rest/outbound_trx/release_orders/{id}/                 │
│         print_release_label                                    │
│   POST /rest/outbound_trx/release_orders/{id}/                 │
│         print_trade_statement                                  │
└───────────────────────────────────────────────────────────────┘
```

---

## 스타일 가이드 (PC 최적화)

### 전체 레이아웃
```css
:host {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: #FAFAFA;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #E0E0E0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
```

### 좌측 패널
```css
.left-panel {
  width: 350px;
  min-width: 300px;
  max-width: 400px;
  background: white;
  border-right: 1px solid #E0E0E0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-area {
  padding: 12px 16px;
  border-bottom: 1px solid #F0F0F0;
}

.search-area input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  font-size: 13px;
}

.filter-chips {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  border-bottom: 1px solid #F0F0F0;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #E0E0E0;
  background: white;
  transition: all 0.15s;
}

.filter-chip.active {
  background: #1976D2;
  color: white;
  border-color: #1976D2;
}

.order-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
```

### 출고 지시 카드 (좌측)
```css
.order-card {
  background: white;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 6px;
  border-left: 3px solid #FF9800;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid #F0F0F0;
}

.order-card:hover {
  background: #F5F5F5;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.order-card.selected {
  border-left-color: #2196F3;
  background: #E3F2FD;
  border-color: #90CAF9;
}

.order-card.completed {
  border-left-color: #4CAF50;
  opacity: 0.7;
}
```

### 우측 패널
```css
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #FAFAFA;
}

.right-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #E0E0E0;
}

.right-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
```

### 바코드 입력 영역
```css
.barcode-input-area {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  margin-bottom: 16px;
}

.barcode-input-area input {
  width: 100%;
  padding: 10px 14px;
  font-size: 15px;
  font-family: 'Courier New', monospace;
  border: 2px solid #E0E0E0;
  border-radius: 6px;
}

.barcode-input-area input:focus {
  border-color: #2196F3;
  outline: none;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.15);
}
```

### 검수 항목 테이블
```css
.inspection-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.inspection-table th {
  background: #F5F5F5;
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #616161;
  border-bottom: 1px solid #E0E0E0;
}

.inspection-table td {
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid #F0F0F0;
}

.inspection-table tr.completed {
  background: #E8F5E9;
  color: #9E9E9E;
}

.inspection-table tr.current {
  background: #FFF3E0;
  font-weight: 600;
  border-left: 3px solid #FF9800;
}

.inspection-table tr:hover {
  background: #F5F5F5;
}
```

### 출고 확정 버튼
```css
.btn-release-confirm {
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.btn-release-confirm:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.btn-release-confirm:disabled {
  background: #BDBDBD;
  box-shadow: none;
  cursor: default;
}
```

### 하단 상태바
```css
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 24px;
  background: #263238;
  color: #B0BEC5;
  font-size: 12px;
}
```

### 피드백 토스트 (PC 우상단)
```css
.feedback-toast {
  position: fixed;
  top: 60px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  z-index: 1000;
  animation: slideInOut 2.5s ease;
  max-width: 360px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.feedback-success { background: #4CAF50; }
.feedback-error   { background: #F44336; }
.feedback-warning { background: #FF9800; }
.feedback-info    { background: #2196F3; }

@keyframes slideInOut {
  0%   { opacity: 0; transform: translateX(100px); }
  10%  { opacity: 1; transform: translateX(0); }
  85%  { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(100px); }
}
```

---

## 관련 설정값 (RuntimeEnvItem)

PDA 설계와 동일한 설정값을 사용한다.

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `out.release.waiting.location` | - | 출고 대기 로케이션 |
| `out.picking.order.auto-close.enabled` | false | 피킹 완료 시 자동 마감 |
| `out.release.label.template` | - | 배송 라벨 템플릿 |
| `out.release.order.sheet.template` | - | 거래명세서 템플릿 |
| `out.delivery.auto-invoice.enabled` | false | 자동 운송장 발급 |

---

## 구현 순서

1. **프론트엔드 화면 파일 생성**
   - [ ] `outbound-inspection.js` — PC 검수/포장 작업 화면
   - [ ] `route.ts`에 라우트 등록
   - [ ] `things-factory.config.js`에 페이지 등록

2. **레이아웃 및 좌측 패널**
   - [ ] 2패널 레이아웃 (좌측 350px + 우측 flex)
   - [ ] 출고 지시 목록 로딩 및 카드 렌더링
   - [ ] 상태별 필터 칩 (전체/대기/진행/완료)
   - [ ] 검색 기능 (출고번호/고객명)
   - [ ] 하단 상태바 (처리 현황)

3. **우측 패널: 검수 작업**
   - [ ] 바코드 입력 영역 (USB 스캐너 + 키보드)
   - [ ] 검수 항목 테이블 (전체 항목 표시)
   - [ ] 바코드 스캔 → 자동 매칭 → 행 체크 플로우
   - [ ] 수량 1 항목 자동 확인 로직
   - [ ] 현재 스캔 대상 패널 (수량 2+ 항목)
   - [ ] 진행률 바

4. **우측 패널: 포장/운송장**
   - [ ] 검수 완료 요약 + 배송 정보 (2컬럼)
   - [ ] 포장 정보 인라인 폼
   - [ ] 운송장 입력 (스캔/수동/자동발급)
   - [ ] 출고 확정 버튼

5. **우측 패널: 완료**
   - [ ] 완료 통계
   - [ ] 배송 라벨 / 거래명세서 출력
   - [ ] 다음 검수 자동 시작

6. **부가 기능**
   - [ ] 키보드 단축키 (F2, F3, F5, F8, Ctrl+P)
   - [ ] 피드백 토스트 (우상단)

---

## 참조 문서

- B2C 검수/포장 PDA 설계: 본 문서 PDA 검수/포장 섹션
- B2C 피킹 작업 화면 설계: 본 문서 피킹 섹션
- 출고 테이블 설계: `docs/design/outbound-table-design.md`
- PC 리스트 패턴: `frontend/packages/operato-wes/client/pages/rwa/rwa-inspection-list.js`
- 기존 PDA 출고: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-barcode.ts`
- 출고 엔티티: `src/main/java/operato/wms/outbound/entity/ReleaseOrder.java`
- 배송 엔티티: `src/main/java/operato/wms/outbound/entity/DeliveryInfo.java`
- 출고 트랜잭션: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
- 출고 컨트롤러: `src/main/java/operato/wms/outbound/rest/OutboundTransactionController.java`
- B2C 출고 확정 PDA 설계: 본 문서 출고 확정 PDA 섹션

---
---

# B2C 출고 확정 화면 설계 (PDA)

## 문서 정보
- **작성일**: 2026-03-25
- **목적**: B2C 출고 피킹/검수 완료 후 운송장 등록 및 최종 출고 확정을 위한 PDA 화면 설계
- **참조**: outbound-picking-work.js (PDA 피킹 패턴), pda-wms-shipment-barcode.ts, OutboundTransactionService.java
- **대상 사용자**: 출고 확정 담당자 (PDA + 하드웨어 바코드 스캐너)
- **대상 상태**: `PICKED` (피킹 완료) → `END` (출고 완료)

---

## 화면 개요

### 업무 흐름에서의 위치

```
주문 접수 → 피킹 지시 → [PDA 피킹] → [검수/포장] → 📍출고 확정(본 화면) → 완료
                                                        │
                                                        ├─ 출고 지시 스캔
                                                        ├─ 운송장 번호 등록
                                                        ├─ 배송 라벨 출력
                                                        └─ 출고 확정 처리
```

### 핵심 사용 시나리오

1. **단건 출고 확정**: 출고 지시 바코드 스캔 → 운송장 스캔 → 출고 확정
2. **연속 출고 확정**: 여러 건을 연속으로 스캔하며 빠르게 처리 (Express Mode)
3. **라벨 출력 후 확정**: 배송 라벨 출력 → 운송장 스캔 → 출고 확정

### 설계 원칙

- **최소 터치**: 바코드 스캔 중심, 스캔 2회(출고번호 + 운송장)로 1건 처리
- **연속 작업**: 확정 완료 후 자동으로 다음 건 스캔 대기
- **시각적 명확성**: 상태별 색상 구분, 큰 폰트(18px+), 큰 버튼(56px+)
- **음성 피드백**: voiceService 활용, 스캔 성공/실패/완료 안내

---

## 화면 구성 (3단계)

### Stage 1: 출고 지시 스캔

피킹 완료(`PICKED`) 상태의 출고 지시를 스캔하여 선택합니다.

```
┌─────────────────────────────────────┐
│  ← 출고 확정                    🔊  │  헤더 (뒤로가기 + 음성 토글)
├─────────────────────────────────────┤
│                                     │
│  📦 출고 지시 번호를 스캔하세요      │  안내 메시지
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔍 출고 지시 번호 스캔/입력   │   │  OxInputBarcode
│  └─────────────────────────────┘   │
│                                     │
│  ─── 오늘의 출고 확정 대기 ────     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ RLS-2026-0301     김철수     │   │
│  │ 3건 / 일반출고    PICKED     │   │  대기 목록 카드
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ RLS-2026-0302     이영희     │   │
│  │ 1건 / 일반출고    PICKED     │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ RLS-2026-0303     박지민     │   │
│  │ 5건 / 일반출고    PICKED     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─── 오늘 처리 현황 ────────────    │
│  ┌───────┬──────────┐              │
│  │ 대기  │  완료     │              │
│  │  12건 │  45건     │              │  간단 통계
│  └───────┴──────────┘              │
│                                     │
└─────────────────────────────────────┘
```

#### 데이터 소스

```
GET /rest/release_orders?query=[
  {"name":"status","value":"PICKED"},
  {"name":"rls_req_date","value":"2026-03-25"}
]&sort=[{"name":"rls_ord_no","desc":false}]
```

#### 카드 표시 정보

| 항목 | 필드 | 비고 |
|------|------|------|
| 출고 지시 번호 | `rls_ord_no` | 굵은 폰트 |
| 수신인명 | DeliveryInfo → `receiver_nm` | |
| 아이템 수 | `total_line_cnt` | "N건" |
| 출고 유형 | `rls_type` | 코드 → 명칭 변환 |
| 상태 | `status` | 배지 (PICKED = 주황색) |

#### 카드 클릭 / 스캔 동작

- 카드 클릭 또는 바코드 스캔 시 → **Stage 2**로 전환
- 스캔한 번호가 `PICKED` 상태가 아닌 경우 → 에러 토스트 + 음성 안내

---

### Stage 2: 출고 정보 확인 & 운송장 등록

선택된 출고 지시의 상세 정보를 확인하고, 운송장 번호를 등록합니다.

```
┌─────────────────────────────────────┐
│  ← 출고 확정                    🔊  │
├─────────────────────────────────────┤
│                                     │
│  ┌─ 출고 정보 ─────────────────┐   │
│  │ RLS-2026-0301               │   │  출고 지시 번호
│  │ 일반출고 | 2026-03-25       │   │  유형 + 날짜
│  │                             │   │
│  │ 📦 출고 상품                │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ SKU-001  운동화 A  × 2  │ │   │
│  │ │ SKU-002  티셔츠 B  × 1  │ │   │  출고 아이템 목록
│  │ │ SKU-003  모자 C    × 3  │ │   │
│  │ └─────────────────────────┘ │   │
│  │         합계: 3품목 / 6개   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ 배송 정보 ─────────────────┐   │
│  │ 👤 김철수                   │   │
│  │ 📱 010-1234-5678            │   │  DeliveryInfo
│  │ 📍 서울시 강남구 역삼동 123  │   │
│  │ 📝 부재 시 경비실에 맡겨주세요 │  │  배송 메모
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ 운송장 등록 ───────────────┐   │
│  │                             │   │
│  │ 배송 업체:                  │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ CJ대한통운          ▼  │ │   │  배송업체 선택
│  │ └─────────────────────────┘ │   │
│  │                             │   │
│  │ 운송장 번호:                │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ 🔍 운송장 스캔/입력      │ │   │  OxInputBarcode
│  │ └─────────────────────────┘ │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────┐  ┌───────────────┐  │
│  │  🏷️ 라벨  │  │ 📄 거래명세서 │  │  출력 버튼
│  └───────────┘  └───────────────┘  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     ✅ 출고 확정             │   │  확정 버튼 (큰 초록색)
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

#### 출고 아이템 조회

```
GET /rest/release_order_items?query=[
  {"name":"release_order_id","value":"{selectedOrderId}"}
]
```

#### 배송 정보 조회

```
GET /rest/delivery_infos?query=[
  {"name":"release_order_id","value":"{selectedOrderId}"}
]
```

#### 배송 업체 코드 (드롭다운)

| 코드 | 표시명 |
|------|--------|
| CJ | CJ대한통운 |
| HANJIN | 한진택배 |
| LOTTE | 롯데택배 |
| LOGEN | 로젠택배 |
| POST | 우체국택배 |
| ETC | 기타 |

#### 운송장 등록 API

운송장 번호 스캔/입력 시 DeliveryInfo를 업데이트합니다.

```
PUT /rest/delivery_infos/{deliveryInfoId}
Body: {
  "invoiceNo": "1234567890123",
  "dlvVendCd": "CJ",
  "dlvType": "COURIER"
}
```

#### 출력 버튼 동작

**배송 라벨 출력**:
```
POST /rest/outbound_trx/release_orders/{id}/print_release_label
```

**거래명세서 출력**:
```
POST /rest/outbound_trx/release_orders/{id}/print_release_sheet
```

#### 출고 확정 처리

운송장 번호가 등록된 상태에서 확정 버튼 클릭:

```
POST /rest/outbound_trx/release_orders/{id}/close_by_params
Body: {
  "invoiceNo": "1234567890123",
  "dlvVendCd": "CJ",
  "dlvType": "COURIER"
}
```

#### 확정 전 검증 로직

1. **운송장 번호 필수**: 미입력 시 → "운송장 번호를 입력해주세요" 경고
2. **배송 업체 필수**: 미선택 시 → "배송 업체를 선택해주세요" 경고
3. **상태 확인**: `PICKED` 상태가 아니면 → "출고 확정할 수 없는 상태입니다" 에러
4. **중복 확정 방지**: 이미 `END` 상태면 → "이미 출고 확정된 건입니다" 안내

---

### Stage 3: 출고 확정 완료

출고 확정이 성공하면 완료 화면을 표시하고, 다음 건으로 자동 전환합니다.

```
┌─────────────────────────────────────┐
│  ← 출고 확정                    🔊  │
├─────────────────────────────────────┤
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │    ✅ 완료     │           │  큰 체크 아이콘
│         │               │           │
│         └───────────────┘           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 출고 번호  RLS-2026-0301    │   │
│  │ 수신인    김철수             │   │
│  │ 운송장    1234567890123     │   │
│  │ 배송업체  CJ대한통운         │   │  확정 결과 요약
│  │ 상품      3품목 / 6개       │   │
│  │ 처리시간  00:42             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────┐  ┌───────────────┐  │
│  │  🏷️ 라벨  │  │ 📄 거래명세서 │  │  출력 버튼
│  └───────────┘  └───────────────┘  │
│                                     │
│  ─── 오늘 처리 현황 ────────────    │
│  ┌───────┬──────────┐              │
│  │ 대기  │  완료     │              │
│  │  11건 │  46건     │              │
│  └───────┴──────────┘              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     📦 다음 출고 확정        │   │  다음 건 버튼
│  └─────────────────────────────┘   │
│                                     │
│  3초 후 자동으로 다음 건 스캔 대기... │  자동 전환 안내
│                                     │
└─────────────────────────────────────┘
```

#### 자동 전환 로직

- 확정 완료 후 3초 카운트다운 → Stage 1로 자동 복귀
- "다음 출고 확정" 버튼 클릭 시 즉시 Stage 1으로 복귀
- 대기 건이 없으면 "모든 출고 확정이 완료되었습니다" 표시

---

## 빠른 연속 처리 모드 (Express Mode)

대량 출고 확정 시 최소 터치로 연속 처리할 수 있는 모드입니다.

### 활성화 조건

- 배송 업체가 사전 설정된 경우 (기본값 있음)
- 운송장 번호가 바코드로 스캔 가능한 경우

### 플로우

```
[출고 지시 스캔] → [운송장 스캔] → [자동 확정] → [다음 출고 지시 스캔] → ...
                                        │
                                        └─ 음성: "출고 확정 완료. 46건째"
```

### 동작 방식

1. Stage 1에서 출고 지시 바코드 스캔 → Stage 2로 전환
2. Stage 2에서 운송장 바코드 스캔 → **자동으로 출고 확정 API 호출**
3. 확정 성공 → 음성 피드백 + Stage 1로 즉시 복귀 (Stage 3 생략)
4. 확정 실패 → 에러 표시 + Stage 2 유지

### Express Mode 토글

```html
<!-- 헤더 영역에 토글 스위치 -->
<div class="express-toggle">
  <label>연속 처리</label>
  <md-switch ?selected="${this.expressMode}"
    @change="${e => this.expressMode = e.target.selected}">
  </md-switch>
</div>
```

---

## 컴포넌트 구조

### 파일 위치

```
frontend/packages/operato-wes/client/pages/work/outbound-release-work.js
```

### 클래스 구조

```javascript
import { PageView } from '@operato/shell'
import { localize, i18next } from '@operato/i18n'
import { ServiceUtil, UiUtil, TermsUtil } from '@operato/utils'
import { HardwareScannerService } from './hardware-scanner-service.js'
import { voiceService } from './voice-service.js'

class OutboundReleaseWork extends localize(i18next)(PageView) {
  static properties = {
    screen: { type: String },          // 'order-scan' | 'confirm' | 'complete'
    expressMode: { type: Boolean },     // 연속 처리 모드
    voiceEnabled: { type: Boolean },    // 음성 안내

    // 데이터
    pendingOrders: { type: Array },     // PICKED 상태 목록
    selectedOrder: { type: Object },    // 선택된 출고 지시
    releaseItems: { type: Array },      // 출고 아이템 목록
    deliveryInfo: { type: Object },     // 배송 정보

    // 입력값
    dlvVendCd: { type: String },        // 배송 업체 코드
    invoiceNo: { type: String },        // 운송장 번호

    // 통계
    todayPending: { type: Number },
    todayCompleted: { type: Number },
    startTime: { type: Number },

    // UI
    feedbackMsg: { type: String },
    feedbackType: { type: String },
    autoReturnTimer: { type: Number },
  }

  constructor() {
    super()
    this.screen = 'order-scan'
    this.expressMode = false
    this.voiceEnabled = voiceService.enabled
    this.pendingOrders = []
    this.selectedOrder = null
    this.releaseItems = []
    this.deliveryInfo = {}
    this.dlvVendCd = ''
    this.invoiceNo = ''
    this.todayPending = 0
    this.todayCompleted = 0
  }
}

customElements.define('outbound-release-work', OutboundReleaseWork)
```

### 주요 메서드

```javascript
// === 생명주기 ===
async pageUpdated(changes, lifecycle, before) {
  if (this.active) {
    this._scannerService = new HardwareScannerService({
      onScan: barcode => this._handleGlobalScan(barcode)
    })
    this._scannerService.start()
    await this._loadPendingOrders()
  } else {
    this._scannerService?.stop()
  }
}

pageDisposed() {
  this._scannerService?.stop()
  this._scannerService = null
  if (this.autoReturnTimer) clearTimeout(this.autoReturnTimer)
}

// === 데이터 로드 ===
async _loadPendingOrders() {
  const today = new Date().toISOString().split('T')[0]
  const data = await ServiceUtil.restGet('release_orders', {
    query: JSON.stringify([
      { name: 'status', value: 'PICKED' },
      { name: 'rls_req_date', value: today }
    ]),
    sort: JSON.stringify([{ name: 'rls_ord_no', desc: false }])
  })
  this.pendingOrders = data?.items || data || []
  this.todayPending = this.pendingOrders.length

  const completed = await ServiceUtil.restGet('release_orders', {
    query: JSON.stringify([
      { name: 'status', value: 'END' },
      { name: 'rls_req_date', value: today }
    ])
  })
  this.todayCompleted = completed?.total || (completed?.items || completed || []).length
}

async _loadOrderDetail(orderId) {
  this.releaseItems = await ServiceUtil.restGet('release_order_items', {
    query: JSON.stringify([{ name: 'release_order_id', value: orderId }])
  }).then(d => d?.items || d || [])

  const dlvList = await ServiceUtil.restGet('delivery_infos', {
    query: JSON.stringify([{ name: 'release_order_id', value: orderId }])
  }).then(d => d?.items || d || [])
  this.deliveryInfo = dlvList[0] || {}

  this.invoiceNo = this.deliveryInfo.invoiceNo || ''
  this.dlvVendCd = this.deliveryInfo.dlvVendCd || ''
}

// === 바코드 스캔 ===
_handleGlobalScan(barcode) {
  if (this.screen === 'order-scan') {
    this._onScanReleaseOrder(barcode)
  } else if (this.screen === 'confirm') {
    this._onScanInvoice(barcode)
  }
}

async _onScanReleaseOrder(barcode) {
  const order = this.pendingOrders.find(o => o.rls_ord_no === barcode)
  if (!order) {
    try {
      const data = await ServiceUtil.restGet('release_orders', {
        query: JSON.stringify([{ name: 'rls_ord_no', value: barcode }])
      })
      const found = (data?.items || data || [])[0]
      if (!found) {
        this._showFeedback('출고 지시를 찾을 수 없습니다', 'error')
        voiceService.error('출고 지시를 찾을 수 없습니다')
        return
      }
      if (found.status !== 'PICKED') {
        this._showFeedback('출고 확정할 수 없는 상태입니다', 'warning')
        voiceService.warning('출고 확정할 수 없는 상태입니다')
        return
      }
      this._selectOrder(found)
    } catch (err) {
      this._showFeedback('조회 실패', 'error')
      voiceService.error('조회에 실패했습니다')
    }
    return
  }
  this._selectOrder(order)
}

async _selectOrder(order) {
  this.selectedOrder = order
  this.startTime = Date.now()
  await this._loadOrderDetail(order.id)
  this.screen = 'confirm'
  voiceService.guide(`${order.rls_ord_no}. 운송장 번호를 스캔해주세요`)
}

async _onScanInvoice(barcode) {
  this.invoiceNo = barcode
  this._showFeedback('운송장 번호 등록됨', 'success')
  voiceService.success('운송장 등록 완료')

  if (this.expressMode && this.dlvVendCd) {
    await this._confirmRelease()
  }
}

// === 출고 확정 ===
async _confirmRelease() {
  if (!this.invoiceNo) {
    this._showFeedback('운송장 번호를 입력해주세요', 'warning')
    voiceService.warning('운송장 번호를 입력해주세요')
    return
  }
  if (!this.dlvVendCd) {
    this._showFeedback('배송 업체를 선택해주세요', 'warning')
    voiceService.warning('배송 업체를 선택해주세요')
    return
  }

  try {
    if (this.deliveryInfo.id) {
      await ServiceUtil.restPut(`delivery_infos/${this.deliveryInfo.id}`, {
        invoiceNo: this.invoiceNo,
        dlvVendCd: this.dlvVendCd,
        dlvType: 'COURIER'
      })
    }

    await ServiceUtil.restPost(
      `outbound_trx/release_orders/${this.selectedOrder.id}/close_by_params`,
      { invoiceNo: this.invoiceNo, dlvVendCd: this.dlvVendCd, dlvType: 'COURIER' }
    )

    this.todayCompleted++
    this.todayPending--

    if (this.expressMode) {
      voiceService.success(`출고 확정 완료. ${this.todayCompleted}건째`)
      this._showFeedback(`출고 확정 완료 (${this.todayCompleted}건)`, 'success')
      this._resetToScan()
    } else {
      voiceService.success('출고 확정이 완료되었습니다')
      this.screen = 'complete'
      this._startAutoReturn()
    }
  } catch (err) {
    console.error('출고 확정 실패:', err)
    this._showFeedback('출고 확정 실패', 'error')
    voiceService.error('출고 확정에 실패했습니다')
  }
}

// === 출력 ===
async _printReleaseLabel() {
  await ServiceUtil.restPost(
    `outbound_trx/release_orders/${this.selectedOrder.id}/print_release_label`
  )
  this._showFeedback('배송 라벨 출력 요청', 'info')
}

async _printTradeStatement() {
  await ServiceUtil.restPost(
    `outbound_trx/release_orders/${this.selectedOrder.id}/print_release_sheet`
  )
  this._showFeedback('거래명세서 출력 요청', 'info')
}

// === 화면 전환 ===
_resetToScan() {
  this.selectedOrder = null
  this.releaseItems = []
  this.deliveryInfo = {}
  this.invoiceNo = ''
  this.screen = 'order-scan'
  this._loadPendingOrders()
}

_startAutoReturn() {
  this.autoReturnTimer = setTimeout(() => {
    this._resetToScan()
  }, 3000)
}

// === 피드백 ===
_showFeedback(msg, type = 'info') {
  this.feedbackMsg = msg
  this.feedbackType = type
  if (this._feedbackTimer) clearTimeout(this._feedbackTimer)
  this._feedbackTimer = setTimeout(() => {
    this.feedbackMsg = ''
    this.feedbackType = ''
  }, 2000)
}
```

---

## 상태 전이 다이어그램

### 화면 상태 전이

```
                  ┌──────────────────────┐
                  │                      │
                  ▼                      │
┌──────────┐  스캔/클릭  ┌──────────┐   │
│ order-   │──────────→│ confirm  │   │
│ scan     │           │          │   │
│          │←──────────│          │   │
└──────────┘  뒤로가기   └────┬─────┘   │
                              │         │
                         출고 확정      │
                              │         │
                              ▼         │
                       ┌──────────┐    │
                       │ complete │────┘
                       │          │ 3초 후 자동
                       └──────────┘ 또는 버튼 클릭
```

### Express Mode 전이

```
┌──────────┐  출고번호 스캔  ┌──────────┐  운송장 스캔   ┌──────────┐
│ order-   │─────────────→│ confirm  │─────────────→│ order-   │
│ scan     │               │ (자동확정) │  (즉시 복귀)  │ scan     │
└──────────┘               └──────────┘               └──────────┘
```

### 출고 주문 상태 전이

```
PICKED ──── close_by_params ────→ END
  │                                 │
  │  (본 화면에서 처리하는 구간)      │ (재고 차감 자동 처리)
  │                                 │
  └── 운송장 등록 + 출고 확정 ──────┘
```

---

## API 흐름 요약

### Stage 1 → Stage 2 전환 시

```
① GET /rest/release_orders
     ?query=[{"name":"status","value":"PICKED"},{"name":"rls_req_date","value":"today"}]
   → 대기 목록 로드

② 바코드 스캔 또는 카드 클릭

③ GET /rest/release_order_items
     ?query=[{"name":"release_order_id","value":"{id}"}]
   → 출고 아이템 로드

④ GET /rest/delivery_infos
     ?query=[{"name":"release_order_id","value":"{id}"}]
   → 배송 정보 로드
```

### Stage 2 → Stage 3 전환 시 (출고 확정)

```
⑤ PUT /rest/delivery_infos/{deliveryInfoId}
   Body: { invoiceNo, dlvVendCd, dlvType }
   → 배송 정보 업데이트

⑥ POST /rest/outbound_trx/release_orders/{id}/close_by_params
   Body: { invoiceNo, dlvVendCd, dlvType }
   → 출고 확정 (PICKED → END)
   → 내부적으로 finalReleaseInventories() 호출 → 재고 차감
```

### 출력 (선택)

```
⑦ POST /rest/outbound_trx/release_orders/{id}/print_release_label
   → 배송 라벨 출력

⑧ POST /rest/outbound_trx/release_orders/{id}/print_release_sheet
   → 거래명세서 출력
```

---

## 스타일 가이드 (PDA 최적화)

### 색상 체계

```css
/* 상태별 색상 */
--color-picked: #FF9800;     /* PICKED 상태 - 주황 */
--color-end: #4CAF50;        /* END 상태 - 초록 */
--color-error: #F44336;      /* 에러 - 빨강 */
--color-info: #2196F3;       /* 정보 - 파랑 */

/* 배경 */
--bg-card: #FFFFFF;
--bg-surface: var(--md-sys-color-surface);
--bg-section: #F5F5F5;
```

### 카드 스타일

```css
.order-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  border-left: 4px solid var(--color-picked);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.order-card:active {
  transform: scale(0.98);
}

.order-card .order-no {
  font-size: 18px;
  font-weight: 700;
}

.order-card .receiver {
  font-size: 15px;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 4px;
}

.order-card .meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 13px;
  color: #999;
}

.order-card .status-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: #FFF3E0;
  color: #E65100;
}
```

### 버튼 스타일

```css
/* 출고 확정 메인 버튼 */
.btn-confirm-release {
  width: 100%;
  min-height: 56px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.btn-confirm-release:active {
  transform: scale(0.97);
}

.btn-confirm-release:disabled {
  background: #E0E0E0;
  color: #999;
  box-shadow: none;
}

/* 다음 건 버튼 */
.btn-next {
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #2196F3, #1976D2);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

/* 출력 버튼 (보조) */
.btn-print {
  flex: 1;
  min-height: 44px;
  border: 1px solid #E0E0E0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  background: #fff;
}
```

### 배송 메모 강조

```css
.delivery-memo {
  background: #FFF8E1;
  border-left: 3px solid #FFC107;
  border-radius: 0 8px 8px 0;
  padding: 10px 14px;
  margin-top: 8px;
  font-size: 14px;
  color: #795548;
}
```

### 피드백 토스트

```css
.feedback-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  z-index: 100;
  animation: fadeInOut 2s ease forwards;
}

.feedback-toast.success { background: #4CAF50; }
.feedback-toast.error { background: #F44336; }
.feedback-toast.warning { background: #FF9800; }
.feedback-toast.info { background: #2196F3; }

@keyframes fadeInOut {
  0%   { opacity: 0; transform: translateX(-50%) translateY(20px); }
  15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  85%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}
```

### 완료 화면 체크 아이콘

```css
.complete-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  animation: scaleIn 0.3s ease;
}

@keyframes scaleIn {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

---

## 음성 안내 시나리오

| 시점 | 메시지 | 유형 |
|------|--------|------|
| 페이지 진입 | "출고 확정 화면입니다. 출고 지시를 스캔해주세요" | guide |
| 출고 지시 스캔 성공 | "{출고번호}. 운송장 번호를 스캔해주세요" | guide |
| 출고 지시 조회 실패 | "출고 지시를 찾을 수 없습니다" | error |
| 상태 불일치 | "출고 확정할 수 없는 상태입니다" | warning |
| 운송장 스캔 | "운송장 등록 완료" | success |
| 출고 확정 성공 | "출고 확정이 완료되었습니다" | success |
| Express 확정 성공 | "출고 확정 완료. N건째" | success |
| 출고 확정 실패 | "출고 확정에 실패했습니다" | error |
| 운송장 미입력 확정 | "운송장 번호를 입력해주세요" | warning |
| 배송업체 미선택 확정 | "배송 업체를 선택해주세요" | warning |
| 모든 건 완료 | "모든 출고 확정이 완료되었습니다" | success |

---

## 관련 설정값 (RuntimeEnvItem)

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `out.release.waiting.location` | - | 출고 대기 로케이션 |
| `out.release.label.template` | - | 출고 라벨 템플릿명 |
| `out.release.trade.stmt.template` | - | 거래명세서 템플릿명 |
| `out.release.default.dlv.vend.cd` | - | 기본 배송 업체 코드 |
| `out.release.express.mode.enabled` | false | Express 모드 기본 활성화 |

---

## 기존 PDA 화면과의 비교

| 비교 항목 | B2C 피킹 작업 (PDA) | B2C 출고 확정 (PDA) |
|-----------|---------------------|---------------------|
| 파일명 | outbound-picking-work.js | outbound-release-work.js |
| 대상 상태 | WAIT/RUN → 피킹 수행 | PICKED → END 확정 |
| 바코드 스캔 | SKU 바코드 (상품 확인) | 출고번호 + 운송장 바코드 |
| 핵심 동작 | 피킹 수량 확인 | 운송장 등록 + 출고 확정 |
| 작업 단위 | 피킹 아이템 1건씩 | 출고 지시 1건 전체 |
| Express 모드 | - | 연속 확정 지원 |
| 출력 기능 | 피킹 지시서 | 배송 라벨 + 거래명세서 |
| 화면 전환 | 3단계 (선택→작업→완료) | 3단계 (스캔→확정→완료) |

---

## 구현 순서

### Phase 1: 기본 기능

1. **outbound-release-work.js 생성**
   - [ ] Lit Element 기본 구조 + PageView 상속
   - [ ] 3단계 화면 전환 (order-scan / confirm / complete)
   - [ ] HardwareScannerService 연동

2. **Stage 1: 출고 지시 스캔**
   - [ ] PICKED 상태 목록 조회 및 카드 렌더링
   - [ ] OxInputBarcode로 출고 번호 스캔
   - [ ] 오늘 처리 현황 통계

3. **Stage 2: 확정 처리**
   - [ ] 출고 아이템 목록 + 배송 정보 표시
   - [ ] 배송 업체 선택 (드롭다운)
   - [ ] 운송장 번호 스캔/입력
   - [ ] DeliveryInfo 업데이트 + 출고 확정 API 호출
   - [ ] 검증 로직 (운송장 필수, 배송업체 필수)

4. **Stage 3: 완료**
   - [ ] 확정 결과 요약
   - [ ] 3초 자동 복귀 + 수동 "다음 건" 버튼

### Phase 2: 부가 기능

5. **Express 모드**
   - [ ] 토글 스위치 UI
   - [ ] 운송장 스캔 시 자동 확정
   - [ ] Stage 3 생략 → Stage 1 즉시 복귀

6. **출력 기능**
   - [ ] 배송 라벨 출력 버튼
   - [ ] 거래명세서 출력 버튼

7. **음성 안내**
   - [ ] voiceService 연동
   - [ ] 각 시나리오별 음성 메시지

### Phase 3: 등록

8. **라우트/설정 등록**
   - [ ] route.ts에 import 추가
   - [ ] things-factory.config.js에 라우트 등록
   - [ ] 메뉴 용어 등록 (OutboundReleaseWork)

---

## 참조 문서

- B2C 피킹 작업 PDA 설계: 본 문서 피킹 섹션
- B2C 검수/포장 PDA 설계: 본 문서 검수/포장 PDA 섹션
- B2C 검수/포장 PC 설계: 본 문서 검수/포장 PC 섹션
- 출고 테이블 설계: `docs/design/outbound-table-design.md`
- PDA 피킹 구현: `frontend/packages/operato-wes/client/pages/work/outbound-picking-work.js`
- 기존 PDA 출고: `frontend/packages/operato-wes/client/pages/pda/pda-wms-shipment-barcode.ts`
- 출고 엔티티: `src/main/java/operato/wms/outbound/entity/ReleaseOrder.java`
- 배송 엔티티: `src/main/java/operato/wms/outbound/entity/DeliveryInfo.java`
- 출고 트랜잭션: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
- 출고 컨트롤러: `src/main/java/operato/wms/outbound/rest/OutboundTransactionController.java`

---
---

# B2C 피킹 작업 화면 설계 (PC)

## 문서 정보
- **작성일**: 2026-03-22
- **목적**: B2C 출고 피킹 작업을 위한 PC 데스크톱 화면 설계
- **참조**: outbound-inspection.js (검수/포장 PC 화면), outbound-picking-work.js (피킹 PDA 화면)
- **대상 사용자**: 창고 관리자 / 피킹 작업자 (PC 모니터 + USB 바코드 스캐너)

---

## 화면 개요

### 목적
B2C 택배 출고 주문에 대한 피킹 작업을 PC 화면에서 관리하는 데스크톱 최적화 화면.
PDA 화면(outbound-picking-work.js)과 동일한 업무 로직을 사용하되, 넓은 화면을 활용한 2패널 레이아웃으로 피킹 지시 목록 관리와 상세 작업을 동시에 수행할 수 있다.

### 업무 위치
```
주문 접수 → 피킹 지시 → [피킹 작업] → 검수/포장 → 최종 출고 확정
                          ^^^^^^^^
                          본 화면 범위
```

### PDA vs PC 화면 비교
| 항목 | PDA (outbound-picking-work.js) | PC (outbound-picking-pc.js) |
|------|-------------------------------|---------------------------|
| 레이아웃 | 단일 컬럼, 480px max | 2패널 (좌 350px + 우 flex) |
| 스캔 방식 | HardwareScannerService (PDA) | USB 바코드 스캐너 (키보드 에뮬) |
| 항목 표시 | 체크리스트 카드 | 테이블 (행 클릭) |
| 키보드 단축키 | 없음 | F2/F3/F5/Escape |
| 음성 안내 | voiceService | 없음 (PC에서 불필요) |
| 목록 전환 | 전체 화면 전환 | 좌측 패널 항상 보임 |
| 동시 정보 | 제한적 | 넓은 화면 활용 가능 |

### 파일 경로
```
frontend/packages/operato-wes/client/pages/outbound/outbound-picking-pc.js
```

### 라우트 등록
```javascript
// route.ts
import './pages/outbound/outbound-picking-pc'

// things-factory.config.js
{ tagname: 'outbound-picking-pc', page: 'outbound-picking-pc' }
```

---

## 전체 레이아웃

### 구조 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│  📦 B2C 피킹 작업                                    [↻ 새로고침]  │
├───────────────────────┬─────────────────────────────────────────────┤
│  🔍 [검색_________]  │  📋 PKO-20260322-001        고객: 홍길동    │
│  ┌────┬────┬────┐    │  ████████░░░░  5/8 (62%)                   │
│  │전체│대기│진행│    │                                             │
│  │ 6 │ 4 │ 2 │    ├─────────────────────────────────────────────┤
│  └────┴────┴────┘    │                                             │
│                       │  [현재 스캔 대상 패널]                       │
│  ┌──────────────┐    │  ┌─────────────────────────────────────┐    │
│  │PKO-001      →│    │  │ 📍 A-01-02-03                      │    │
│  │주문:5 | SKU:12│    │  │ SKU: SKU-A1234                     │    │
│  │수량:48pcs    │    │  │ 상품명: 에어팟 프로 2세대            │    │
│  │████████░░ 62%│    │  │ LOT: LOT20260301 | 유통: 2027-03-01 │    │
│  └──────────────┘    │  │                                     │    │
│  ┌──────────────┐    │  │ 지시수량: 3 EA                      │    │
│  │PKO-002      →│    │  │ 🔍 [바코드 스캔_________]           │    │
│  │주문:3 | SKU:8 │    │  │ 수량: [  3  ] / 3 EA               │    │
│  │수량:25pcs    │    │  │                                     │    │
│  │⏳ 대기       │    │  │      [건너뛰기(F3)] [✓ 피킹확인(F2)]│    │
│  └──────────────┘    │  └─────────────────────────────────────┘    │
│  ┌──────────────┐    │                                             │
│  │PKO-003      →│    │  [피킹 항목 테이블]                         │
│  │주문:1 | SKU:2 │    │  ┌───┬────────┬──────────┬────┬────┬──┐   │
│  │수량:8pcs     │    │  │ # │ 로케이션│ SKU코드   │수량│상태│  │   │
│  │⏳ 대기       │    │  ├───┼────────┼──────────┼────┼────┼──┤   │
│  └──────────────┘    │  │ 1 │A-01-01 │SKU-B5678 │ 2  │ ✅ │  │   │
│                       │  │ 2 │A-01-01 │SKU-C9012 │ 5  │ ✅ │  │   │
│                       │  │ 3 │A-01-02 │SKU-D3456 │ 1  │ ✅ │  │   │
│                       │  │ 4 │A-01-02 │SKU-E7890 │ 4  │ ✅ │  │   │
│                       │  │ 5 │A-01-02 │SKU-A1234 │ 3  │ → │  │   │
│                       │  │ 6 │A-02-01 │SKU-F2345 │ 2  │ ☐ │  │   │
│                       │  │ 7 │A-02-01 │SKU-G6789 │ 6  │ ☐ │  │   │
│                       │  │ 8 │A-02-03 │SKU-H0123 │ 1  │ ☐ │  │   │
│                       │  └───┴────────┴──────────┴────┴────┴──┘   │
│                       │                                             │
│                       │  [🏠 목록으로(Esc)]                         │
├───────────────────────┴─────────────────────────────────────────────┤
│  ✅ 완료: 28건 | ⏳ 대기: 4건 | 🔄 진행: 2건 | 📊 오늘 총: 34건   │
└─────────────────────────────────────────────────────────────────────┘
```

### 레이아웃 사양

| 영역 | 스타일 | 설명 |
|------|--------|------|
| 전체 | `display: flex; flex-direction: column; height: 100%` | 뷰포트 꽉 채움 |
| 페이지 헤더 | `padding: 12px 24px; border-bottom: 1px solid #E0E0E0` | 타이틀 + 새로고침 |
| 좌측 패널 | `width: 350px; min-width: 300px; border-right: 1px solid #E0E0E0` | 검색 + 필터 + 목록 |
| 우측 패널 | `flex: 1; overflow: hidden` | 작업 영역 |
| 하단 상태바 | `padding: 6px 24px; background: #263238; color: #B0BEC5` | 실시간 통계 |

---

## 좌측 패널: 피킹 지시 목록

### 1. 검색 영역

```
┌─────────────────────────────┐
│ 🔍 [피킹지시번호 또는 검색___] │
└─────────────────────────────┘
```

- 실시간 필터링 (onChange)
- `pickOrderNo`, `waveNo` 기준 부분일치 검색
- 포커스 시 border-color: primary

### 2. 상태 필터 칩

```
┌────────┬──────────┬──────────┐
│ 전체 6 │ ⏳ 대기 4 │ 🔄 진행 2 │
└────────┴──────────┴──────────┘
```

| 필터 | status 조건 | 색상 |
|------|------------|------|
| 전체 | ALL | 기본 |
| 대기 | WAIT | #2196F3 (파란) |
| 진행 | RUN | #FF9800 (주황) |

- 활성 칩: primary 색상 배경 + 흰 글씨
- 건수 배지: 동적 업데이트

### 3. 피킹 지시 카드

```
┌──────────────────────────┐
│ 📋 PKO-20260322-001      │
│ 주문: 5건 | SKU: 12종     │
│ 수량: 48pcs               │
│ ████████░░░░ 62%          │  ← RUN 상태일 때만
│                    계속 → │
└──────────────────────────┘
```

#### 카드 정보

| 필드 | 소스 | 표시 |
|------|------|------|
| 지시번호 | `pick_order_no` | 13px, bold |
| 주문 건수 | `plan_order` | 메타 텍스트 |
| SKU 종수 | `plan_sku` | 메타 텍스트 |
| 총 수량 | `plan_pcs` | 메타 텍스트 |
| 진행률 | `progress_rate` | RUN일 때 프로그레스바 |
| 웨이브 | `wave_no` | 있으면 vendor-badge 표시 |

#### 카드 스타일

| 상태 | border-left | 우측 액션 |
|------|------------|----------|
| WAIT | #2196F3 (파란) | `시작 →` |
| RUN | #FF9800 (주황) | `계속 →` |
| 선택됨 | #2196F3 + `background: #E3F2FD` | - |

#### API 호출
```
GET /rest/picking_orders?status=WAIT,RUN&order_date={today}
```

---

## 우측 패널: 작업 영역

### 모드 전환

우측 패널은 3개의 모드를 가진다:

| 모드 | 조건 | 표시 내용 |
|------|------|----------|
| `empty` | 피킹 지시 미선택 | 빈 상태 안내 + 바코드 스캔 입력 |
| `work` | 피킹 작업 진행 중 | 헤더 + 진행률 + 현재 항목 + 테이블 |
| `complete` | 모든 항목 완료 | 완료 카드 + 통계 + 출력/네비게이션 |

### Mode: empty (초기 상태)

```
┌─────────────────────────────────────────────┐
│                                             │
│              📦                              │
│                                             │
│       좌측에서 피킹 지시를 선택하거나         │
│       바코드를 스캔하세요                    │
│                                             │
│       [피킹 지시번호 스캔___________]        │
│                                             │
│       단축키: F5 새로고침                    │
│                                             │
└─────────────────────────────────────────────┘
```

- 바코드 입력: USB 스캐너 키보드 에뮬레이션 대응
- Enter 시 `pickOrderNo`로 검색 후 자동 선택

### Mode: work (피킹 작업)

#### 우측 헤더

```
┌─────────────────────────────────────────────────────┐
│  📋 PKO-20260322-001       주문 5건 | SKU 12종      │
│  ████████████░░░░░░  5/8 항목 (62%)         [닫기]  │
└─────────────────────────────────────────────────────┘
```

| 요소 | 설명 |
|------|------|
| 피킹 지시번호 | `pick_order_no`, bold 14px |
| 주문/SKU 요약 | `plan_order`건, `plan_sku`종, grey 텍스트 |
| 진행률 바 | 8px 높이, `linear-gradient(90deg, #FF9800, #4CAF50)` |
| 진행 수치 | `완료/전체 항목 (%)` |
| 닫기 버튼 | 목록으로 복귀 (미완료 항목 있으면 확인 팝업) |

#### 현재 스캔 대상 패널

```
┌─────────────────────────────────────────────────┐
│  📍 현재 피킹 항목                                │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │            A-01-02-03                    │    │  ← 로케이션 (큰 글씨)
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────┬──────────────────────┐      │
│  │ SKU            │ SKU-A1234             │      │
│  │ 상품명         │ 에어팟 프로 2세대      │      │
│  │ LOT            │ LOT20260301           │      │  ← 있을 때만 표시
│  │ 유통기한       │ 2027-03-01            │      │  ← 있을 때만 표시
│  │ 지시 수량      │ 3 EA                   │      │
│  └────────────────┴──────────────────────┘      │
│                                                  │
│  🔍 바코드 스캔                                   │
│  [_________________________________________]     │
│  ✓ 바코드 확인 완료                               │  ← 성공 시 초록 텍스트
│                                                  │
│  수량: [  3  ] / 3 EA                            │
│                                                  │
│  ┌──────────────┐   ┌──────────────────────┐    │
│  │ 건너뛰기 (F3) │   │ ✓ 피킹 확인 (F2)     │    │
│  └──────────────┘   └──────────────────────┘    │
└─────────────────────────────────────────────────┘
```

#### 현재 항목 패널 상세

| 요소 | 스타일 | 설명 |
|------|--------|------|
| 패널 컨테이너 | `border-left: 4px solid #FF9800; border-radius: 8px; box-shadow` | 현재 작업 강조 |
| 로케이션 | `font-size: 24px; font-weight: 700; background: #E3F2FD; border: 2px solid #2196F3; text-align: center; padding: 12px; border-radius: 8px; letter-spacing: 2px` | 큰 글씨 로케이션 |
| 상품 정보 | 2열 테이블 (라벨/값) | `font-size: 14px` |
| 바코드 입력 | `font-family: 'Courier New'; font-size: 15px; border: 2px solid #E0E0E0` | 포커스 시 primary border |
| 바코드 성공 | `color: #4CAF50; font-weight: 600` | ✓ 표시 |
| 수량 입력 | `width: 80px; text-align: center; font-size: 15px` | 기본값 = orderQty |
| 건너뛰기 | `background: #F5F5F5; color: #757575; border: 1px solid #E0E0E0` | F3 단축키 |
| 피킹 확인 | `background: #4CAF50; color: white; font-weight: 700` | F2 단축키, disabled 시 회색 |

#### 피킹 항목 테이블

```
┌───┬────────────┬──────────────────┬──────────┬────────┬──────┬──────┐
│ # │ 로케이션    │ SKU코드           │ 상품명   │ 지시수량│ 피킹 │ 상태  │
├───┼────────────┼──────────────────┼──────────┼────────┼──────┼──────┤
│ 1 │ A-01-01-01 │ SKU-B5678        │ 아이폰 15│   2    │  2   │  ✅  │
│ 2 │ A-01-01-02 │ SKU-C9012        │ 갤럭시 24│   5    │  5   │  ✅  │
│ 3 │ A-01-02-01 │ SKU-D3456        │ 맥북 에어│   1    │  1   │  ✅  │
│ 4 │ A-01-02-01 │ SKU-E7890        │ 아이패드 │   4    │  4   │  ✅  │
│ 5 │ A-01-02-03 │ SKU-A1234        │ 에어팟   │   3    │  -   │  →   │  ← 현재
│ 6 │ A-02-01-01 │ SKU-F2345        │ 갤럭시 탭│   2    │  -   │  ☐   │
│ 7 │ A-02-01-03 │ SKU-G6789        │ 맥 미니  │   6    │  -   │  ☐   │
│ 8 │ A-02-03-01 │ SKU-H0123        │ 갤워치   │   1    │  -   │  ☐   │
└───┴────────────┴──────────────────┴──────────┴────────┴──────┴──────┘
```

#### 테이블 컬럼 정의

| 컬럼 | 필드 | 너비 | 정렬 | 설명 |
|------|------|------|------|------|
| # | (index) | 40px | 중앙 | 행 번호 |
| 로케이션 | `from_loc_cd` | 120px | 좌측 | 고정폭 글꼴 |
| SKU코드 | `sku_cd` | 140px | 좌측 | 고정폭 글꼴 |
| 상품명 | `sku_nm` | flex | 좌측 | 초과 시 말줄임 |
| 지시수량 | `order_qty` | 80px | 우측 | tabular-nums |
| 피킹수량 | `pick_qty` | 80px | 우측 | 완료 시 표시, 미완료 시 `-` |
| 상태 | `status` | 50px | 중앙 | 아이콘 (✅/→/☐) |

#### 테이블 행 스타일

| 상태 | 배경색 | 글꼴 | border-left |
|------|--------|------|------------|
| END (완료) | `#E8F5E9` | 회색 (#9E9E9E) | 없음 |
| RUN (현재) | `#FFF3E0` | 굵은 600 | `3px solid #FF9800` |
| WAIT (대기) | 투명 | 일반 | 없음 |
| hover | `#F5F5F5` | - | - |

- 행 클릭 시 해당 항목으로 이동 (완료 항목은 무시)
- `rank` 필드 기준 오름차순 정렬 (로케이션 이동 최적화)

### Mode: complete (피킹 완료)

```
┌─────────────────────────────────────────────┐
│                                             │
│              ✅                              │
│        피킹 완료!                            │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  피킹 지시: PKO-20260322-001         │   │
│  │  총 SKU: 12종                        │   │
│  │  총 수량: 48 EA                      │   │
│  │  소요 시간: 8분 42초                  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  📄 피킹 지시서 출력                   │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  📋 다음 피킹 지시 (Enter)            │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  🏠 목록으로                          │   │
│  └──────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

#### 완료 화면 상세

| 요소 | 스타일 | 설명 |
|------|--------|------|
| 체크 아이콘 | `font-size: 48px` | ✅ |
| 완료 메시지 | `font-size: 20px; font-weight: 700; color: #4CAF50` | "피킹 완료!" |
| 결과 요약 | 카드, stat-row 레이아웃 | 지시번호, SKU, 수량, 소요시간 |
| 피킹 지시서 출력 | `btn-action` 스타일 | POST print_picking_sheet |
| 다음 피킹 지시 | `btn-action.primary` 스타일 | Enter 단축키, 자동 좌측 목록 갱신 |
| 목록으로 | `btn-action` 스타일 | 우측 패널 → empty 모드 |

---

## 하단 상태바

```
┌───────────────────────────────────────────────────────────────┐
│ ✅ 완료: 28건 | ⏳ 대기: 4건 | 🔄 진행: 2건 | 📊 오늘 총: 34건 │
└───────────────────────────────────────────────────────────────┘
```

| 항목 | 데이터 소스 | 색상 |
|------|-----------|------|
| 완료 | status=END 건수 | 녹색 |
| 대기 | status=WAIT 건수 | 파란색 |
| 진행 | status=RUN 건수 | 주황색 |
| 오늘 총 | 전체 건수 | 흰색 |

- 배경: `#263238` (다크)
- 텍스트: `#B0BEC5` (라벨), `#ECEFF1` (값)
- 피킹 지시 완료 시 자동 갱신

---

## 키보드 단축키

| 단축키 | 동작 | 조건 |
|--------|------|------|
| F2 | 피킹 확인 | work 모드 + 바코드 매칭 완료 |
| F3 | 건너뛰기 | work 모드 + 현재 항목 존재 |
| F5 | 새로고침 | 항상 (피킹 지시 목록 재조회) |
| Escape | 목록으로 복귀 | work 모드 (미완료 시 확인 팝업) |
| Enter | 다음 피킹 지시 | complete 모드 |

### 단축키 등록 방식

```javascript
connectedCallback() {
  super.connectedCallback()
  this._keydownHandler = (e) => this._handleKeydown(e)
  document.addEventListener('keydown', this._keydownHandler)
}

disconnectedCallback() {
  super.disconnectedCallback()
  document.removeEventListener('keydown', this._keydownHandler)
}

_handleKeydown(e) {
  switch (e.key) {
    case 'F2':
      e.preventDefault()
      this._confirmPick()
      break
    case 'F3':
      e.preventDefault()
      this._skipCurrentItem()
      break
    case 'F5':
      e.preventDefault()
      this._loadPickingOrders()
      break
    case 'Escape':
      this._confirmBackToList()
      break
    case 'Enter':
      if (this.rightPanelMode === 'complete') {
        this._startNextPicking()
      }
      break
  }
}
```

---

## 바코드 스캔 처리

### USB 바코드 스캐너 (키보드 에뮬레이션)

PC 화면에서는 PDA의 HardwareScannerService 대신, USB 바코드 스캐너가 키보드 입력으로 바코드를 전달한다.

#### 처리 방식

1. **빈 상태(empty 모드)**: 중앙 입력 필드에 포커스 → Enter 시 피킹 지시 검색
2. **작업 모드(work 모드)**: 바코드 입력 필드에 포커스 → Enter 시 바코드 검증

#### 자동 포커스 관리

```javascript
async _focusBarcodeInput() {
  await this.updateComplete
  const input = this.shadowRoot?.getElementById('barcodeInput')
  if (input) {
    input.value = ''
    input.focus()
  }
}
```

- 피킹 지시 선택 후 → 바코드 입력 필드 자동 포커스
- 피킹 확인/건너뛰기 후 → 다음 항목의 바코드 입력 필드 자동 포커스
- 입력 후 자동 클리어

#### 바코드 검증 로직

| 단계 | 동작 | 피드백 |
|------|------|--------|
| 스캔 | `barcode` 또는 `sku_cd`와 비교 | - |
| 일치 | `barcodeMatched = true` | 토스트: "✓ 바코드 확인 완료" (성공) |
| 불일치 | `barcodeMatched = false` | 토스트: "✗ 바코드 불일치" (에러) |
| 수량 1 자동확인 | `orderQty === 1 && barcodeMatched` | 자동으로 _confirmPick() 호출 |

---

## 피킹 확인 프로세스 (API)

### 1. 피킹 작업 시작

#### WAIT 상태인 경우
```
POST /rest/outbound_trx/picking_orders/{id}/start
```
- PickingOrder: WAIT → RUN
- ReleaseOrder: READY → RUN (자동)

#### RUN 상태인 경우 (이어서 작업)
```
GET /rest/picking_orders/{id}/items
```
- 이미 진행 중인 항목 로딩
- 미완료 첫 항목부터 시작

### 2. 항목별 피킹 확인

```
PUT /rest/picking_orders/item/operator/{itemId}
Content-Type: application/json

{
  "barcode": "스캔된 바코드",
  "fromLocCd": "A-01-02-03",
  "lotNo": "LOT20260301",
  "pickQty": 3,
  "pickBox": 0,
  "pickEa": 3
}
```

#### 서버 검증 항목
| 항목 | 조건 | 에러 메시지 |
|------|------|-----------|
| 피킹 지시 상태 | status == RUN | "피킹지시의 상태가 실행 중이 아닙니다" |
| 바코드 일치 | orgItem.barcode == input.barcode | "선택한 작업의 바코드와 일치하지 않습니다" |
| 로케이션 일치 | orgItem.fromLocCd == input.fromLocCd | "선택한 작업의 로케이션과 일치하지 않습니다" |
| LOT 일치 | orgItem.lotNo == input.lotNo (있는 경우) | "선택한 작업의 Lot 번호와 일치하지 않습니다" |
| 수량 유효 | pickQty <= orderQty | "입력 수량이 주문 수량을 초과하였습니다" |

#### 자동 상태 전이
| 조건 | 결과 |
|------|------|
| pickQty == orderQty | 항목 → END |
| 0 < pickQty < orderQty | 항목 → RUN (부분 피킹) |
| pickQty == 0 | 항목 → WAIT |
| 모든 항목 END | 피킹 지시 → END, 출고 지시 → PICKED |

### 3. 피킹 지시서 출력

```
POST /rest/outbound_trx/picking_orders/{id}/print_picking_sheet
Query: template={template_name}&printer_id={printer_id}
```

---

## 피드백 토스트

### PC 화면 위치

PDA와 달리, PC 화면의 토스트는 **우측 상단**에 표시된다 (outbound-inspection.js 패턴).

```css
.feedback-toast {
  position: fixed;
  top: 60px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  z-index: 1000;
  max-width: 360px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideInOut 2.5s ease forwards;
}

.feedback-toast.success { background: #4CAF50; }
.feedback-toast.error   { background: #F44336; }
.feedback-toast.warning { background: #FF9800; }
.feedback-toast.info    { background: #2196F3; }

@keyframes slideInOut {
  0%   { opacity: 0; transform: translateX(20px); }
  15%  { opacity: 1; transform: translateX(0); }
  85%  { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(20px); }
}
```

### 피드백 시나리오

| 시점 | 유형 | 메시지 |
|------|------|--------|
| 바코드 일치 | success | "✓ 바코드 확인 완료" |
| 바코드 불일치 | error | "✗ 바코드가 일치하지 않습니다" |
| 피킹 확인 성공 | success | "피킹 완료 (5/8)" |
| 피킹 확인 실패 | error | "{에러 메시지}" |
| 수량 미입력 | warning | "수량을 입력해주세요" |
| 수량 초과 | warning | "지시 수량을 초과할 수 없습니다" |
| 건너뛰기 | info | "항목 건너뛰기" |
| 피킹 지시 시작 | info | "피킹 작업을 시작합니다" |
| 전체 완료 | success | "모든 피킹이 완료되었습니다!" |
| 피킹 지시 미발견 | error | "피킹 지시를 찾을 수 없습니다" |

---

## 컴포넌트 구조

### Properties 정의

```javascript
class OutboundPickingPc extends localize(i18next)(PageView) {
  static get properties() {
    return {
      // 화면 상태
      loading: { type: Boolean },
      rightPanelMode: { type: String },    // 'empty' | 'work' | 'complete'

      // 좌측 패널
      pickingOrders: { type: Array },
      filterStatus: { type: String },      // 'ALL' | 'WAIT' | 'RUN'
      searchKeyword: { type: String },
      selectedOrderId: { type: String },

      // 작업 데이터
      pickingOrder: { type: Object },
      pickingItems: { type: Array },
      currentItemIndex: { type: Number },

      // 스캔/입력
      barcodeMatched: { type: Boolean },
      pickQty: { type: Number },

      // 통계
      completedCount: { type: Number },
      totalCount: { type: Number },
      startTime: { type: Number },
      statsWait: { type: Number },
      statsRun: { type: Number },
      statsEnd: { type: Number },

      // 피드백
      feedbackMsg: { type: String },
      feedbackType: { type: String }
    }
  }
}
```

### 라이프사이클

```javascript
async pageUpdated(changes, lifecycle, before) {
  if (this.active) {
    await this._loadPickingOrders()
    this._loadStats()
  }
}

connectedCallback() {
  super.connectedCallback()
  this._keydownHandler = (e) => this._handleKeydown(e)
  document.addEventListener('keydown', this._keydownHandler)
}

disconnectedCallback() {
  super.disconnectedCallback()
  if (this._keydownHandler) {
    document.removeEventListener('keydown', this._keydownHandler)
  }
}
```

### 주요 메서드

```javascript
// === 렌더링 ===
render()
_renderLeftPanel()
_renderPickingOrderCard(order)
_renderRightPanel()
_renderEmptyPanel()
_renderWorkPanel()
_renderCurrentItemPanel()
_renderItemTable()
_renderCompletePanel()

// === 좌측 패널 ===
async _loadPickingOrders()
_getFilteredOrders()
_onFilterChange(status)
_onSearch(keyword)

// === 피킹 작업 ===
async _selectOrder(order)
async _startPickingWork(order)
_moveToNextItem(initial)
_focusItem(idx)
_initPickForm()

// === 바코드 ===
_onBarcodeInput(e)
_onBarcodeScan(value)
_focusBarcodeInput()

// === 피킹 확인 ===
async _confirmPick()
_skipCurrentItem()

// === 완료 ===
_onPickingComplete()
async _printPickingSheet()
_startNextPicking()
_backToList()
_confirmBackToList()

// === 통계 ===
async _loadStats()
_calcTotalPickedQty()

// === 키보드 ===
_handleKeydown(e)

// === 유틸리티 ===
_todayStr()
_showFeedback(msg, type)
```

---

## API 흐름 요약

```
┌─────────────────────────────────────────────────────────────┐
│ 초기 로딩                                                    │
│   GET /rest/picking_orders?status=WAIT,RUN&order_date=today │
├─────────────────────────────────────────────────────────────┤
│ 피킹 지시 선택 (WAIT인 경우)                                  │
│   POST /rest/outbound_trx/picking_orders/{id}/start         │
│   GET  /rest/picking_orders/{id}/items                      │
├─────────────────────────────────────────────────────────────┤
│ 피킹 지시 선택 (RUN인 경우)                                   │
│   GET  /rest/picking_orders/{id}/items                      │
├─────────────────────────────────────────────────────────────┤
│ 항목별 피킹 (반복)                                           │
│   PUT /rest/picking_orders/item/operator/{itemId}           │
│     Body: { barcode, fromLocCd, lotNo, pickQty, ... }       │
├─────────────────────────────────────────────────────────────┤
│ 피킹 완료                                                   │
│   (마지막 항목 피킹 시 서버에서 자동 마감)                     │
│   POST /rest/outbound_trx/picking_orders/{id}/              │
│         print_picking_sheet (선택)                           │
├─────────────────────────────────────────────────────────────┤
│ 하단 상태바 통계                                              │
│   GET /rest/picking_orders?status=END&order_date=today      │
│   (또는 별도 통계 API)                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 스타일 가이드 (PC 최적화)

### 좌측 패널 스타일

```css
.left-panel {
  width: 350px;
  min-width: 300px;
  background: var(--md-sys-color-surface, white);
  border-right: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-area {
  padding: 12px 16px;
  border-bottom: 1px solid #F0F0F0;
}

.search-area input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
  border-radius: 6px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
}

.search-area input:focus {
  border-color: var(--md-sys-color-primary, #1976D2);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
}

.filter-chips {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  border-bottom: 1px solid #F0F0F0;
}

.filter-chip {
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
  background: var(--md-sys-color-surface, white);
  transition: all 0.15s;
}

.filter-chip.active {
  background: var(--md-sys-color-primary, #1976D2);
  color: white;
  border-color: var(--md-sys-color-primary, #1976D2);
}

.filter-chip .badge {
  display: inline-block;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 11px;
  text-align: center;
  margin-left: 4px;
  background: rgba(0,0,0,0.08);
}

.filter-chip.active .badge {
  background: rgba(255,255,255,0.3);
}
```

### 우측 패널 스타일

```css
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--md-sys-color-background, #FAFAFA);
}

.right-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--md-sys-color-surface, white);
  border-bottom: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
}

.right-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
```

### 진행률 바

```css
.progress-bar {
  height: 8px;
  background: #E0E0E0;
  border-radius: 4px;
  overflow: hidden;
  margin: 0 24px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF9800, #4CAF50);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: right;
  font-size: 12px;
  color: var(--md-sys-color-on-surface-variant, #757575);
  padding: 4px 24px 8px;
}
```

### 현재 항목 패널

```css
.current-item-panel {
  background: var(--md-sys-color-surface, white);
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  margin-bottom: 16px;
  border-left: 4px solid #FF9800;
}

.location-display {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  padding: 12px 20px;
  background: #E3F2FD;
  border: 2px solid #2196F3;
  border-radius: 8px;
  color: #1565C0;
  letter-spacing: 2px;
  margin-bottom: 12px;
}
```

### 피킹 항목 테이블

```css
.picking-table-wrap {
  background: var(--md-sys-color-surface, white);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  margin-bottom: 16px;
}

.picking-table {
  width: 100%;
  border-collapse: collapse;
}

.picking-table th {
  background: var(--md-sys-color-surface-variant, #F5F5F5);
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant, #616161);
  border-bottom: 1px solid var(--md-sys-color-outline-variant, #E0E0E0);
}

.picking-table td {
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid #F0F0F0;
  color: var(--md-sys-color-on-surface, #424242);
}

.picking-table tr.completed {
  background: #E8F5E9;
}

.picking-table tr.completed td {
  color: #9E9E9E;
}

.picking-table tr.current {
  background: #FFF3E0;
  font-weight: 600;
  border-left: 3px solid #FF9800;
}

.picking-table tr:hover:not(.completed) {
  background: var(--md-sys-color-surface-variant, #F5F5F5);
  cursor: pointer;
}

.picking-table .col-num { width: 40px; text-align: center; }
.picking-table .col-loc { width: 120px; font-family: 'Courier New', monospace; }
.picking-table .col-sku { width: 140px; font-family: 'Courier New', monospace; }
.picking-table .col-name { /* flex */ }
.picking-table .col-qty { width: 80px; text-align: right; font-variant-numeric: tabular-nums; }
.picking-table .col-status { width: 50px; text-align: center; font-size: 16px; }
```

### 하단 상태바

```css
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 24px;
  background: #263238;
  color: #B0BEC5;
  font-size: 12px;
}

.status-bar .stats {
  display: flex;
  gap: 16px;
}

.status-bar .stat-label { color: #78909C; }
.status-bar .stat-value { color: #ECEFF1; font-weight: 600; margin-left: 4px; }
```

---

## 구현 순서

### Phase 1: 기본 구조

1. **outbound-picking-pc.js 생성**
   - [ ] Lit Element 기본 구조 + PageView 상속
   - [ ] 2패널 레이아웃 (좌측 350px + 우측 flex)
   - [ ] 하단 상태바

2. **좌측 패널**
   - [ ] 피킹 지시 목록 조회 및 카드 렌더링
   - [ ] 검색 필터 (키워드 + 상태 칩)
   - [ ] 선택 상태 하이라이트

### Phase 2: 작업 영역

3. **우측 패널 - empty 모드**
   - [ ] 빈 상태 안내 + 바코드 스캔 입력

4. **우측 패널 - work 모드**
   - [ ] 헤더 (지시번호 + 진행률)
   - [ ] 현재 항목 패널 (로케이션, SKU, 바코드, 수량)
   - [ ] 피킹 항목 테이블
   - [ ] 바코드 스캔 → 검증 → 피킹 확인 API 호출

5. **우측 패널 - complete 모드**
   - [ ] 완료 통계 (SKU, 수량, 소요시간)
   - [ ] 피킹 지시서 출력
   - [ ] 다음 작업 / 목록 복귀

### Phase 3: 부가 기능

6. **키보드 단축키**
   - [ ] F2 (피킹 확인), F3 (건너뛰기), F5 (새로고침), Escape (복귀)
   - [ ] Enter (complete 모드에서 다음 피킹)

7. **자동 포커스 관리**
   - [ ] 피킹 지시 선택 후 바코드 입력 포커스
   - [ ] 피킹 확인/건너뛰기 후 다음 바코드 포커스

8. **피드백 토스트**
   - [ ] 우측 상단 토스트 (slideInOut 애니메이션)
   - [ ] 시나리오별 메시지

### Phase 4: 등록

9. **라우트/설정 등록**
   - [ ] route.ts에 import 추가
   - [ ] things-factory.config.js에 라우트 등록
   - [ ] 메뉴 용어 등록 (OutboundPickingPc)

---

## 참조 문서

- B2C 피킹 작업 PDA 설계: 본 문서 "B2C 피킹 작업 화면 설계 (PDA)" 섹션
- B2C 검수/포장 PC 설계: 본 문서 "B2C 출고 검수/포장 화면 설계 (PC)" 섹션
- 검수/포장 PC 구현: `frontend/packages/operato-wes/client/pages/outbound/outbound-inspection.js`
- 피킹 PDA 구현: `frontend/packages/operato-wes/client/pages/work/outbound-picking-work.js`
- 출고 테이블 설계: `docs/design/outbound-table-design.md`
- 피킹 엔티티: `src/main/java/operato/wms/outbound/entity/PickingOrder.java`
- 피킹 상세 엔티티: `src/main/java/operato/wms/outbound/entity/PickingOrderItem.java`
- 피킹 컨트롤러: `src/main/java/operato/wms/outbound/rest/PickingOrderController.java`
- 출고 트랜잭션: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
- 출고 컨트롤러: `src/main/java/operato/wms/outbound/rest/OutboundTransactionController.java`
