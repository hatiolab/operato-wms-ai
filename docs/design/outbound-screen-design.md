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
