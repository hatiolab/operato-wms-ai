# 입고 관리 화면 설계

## 문서 정보
- **작성일**: 2026-03-20
- **목적**: 입고 관리 대시보드 화면 설계
- **참조**: VAS 대시보드 (`frontend/packages/operato-wes/client/pages/vas/vas-home.js`)

---

## 📊 입고 관리 대시보드 구성

### 1. 오늘의 입고 현황 (상태별 카드 - 클릭 가능)

4개의 상태 카드를 그리드 레이아웃으로 배치:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 📝 작성중    │ ⏳ 대기      │ 🚚 작업중    │ ✅ 완료     │
│   INWORK    │   READY     │   START     │    END      │
│    15건     │    23건     │    8건      │   142건     │
│  입고 준비   │  입고 대기   │  진행 중    │  오늘 완료  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 상태별 정의 및 동작
| 상태 | 코드 | 색상 | 설명 | 클릭 시 동작 |
|------|------|------|------|-------------|
| 📝 작성중 | INWORK | 회색 (#9E9E9E) | 입고 지시서 작성 중 | 입고 목록(status=INWORK, rcv_req_date=today) |
| ⏳ 대기 | READY | 파란색 (#2196F3) | 입고 대기 중 | 입고 목록(status=READY, rcv_req_date=today) |
| 🚚 작업중 | START | 주황색 (#FF9800) | 입고 진행 중 | 입고 모니터링(status=START, rcv_req_date=today) |
| ✅ 완료 | END | 녹색 (#4CAF50) | 오늘 완료된 입고 | 입고 실적 조회(rcv_end_date=today) |

#### 스타일링
- `border-left: 4px solid {상태별 색상}`: 상태별 시각적 강조
- 호버 시: `box-shadow` 증가 + `translateY(-2px)` 애니메이션
- 반응형: 모바일에서는 2열 그리드

---

### 2. 입고 유형별 현황 (막대 차트)

Chart.js를 이용한 막대 차트:

```
📈 입고 유형별 현황
┌────────────────────────┐
│  일반 입고:  ████████   │ 85건
│  반품 입고:  ███        │ 32건
│  기타 입고:  ██         │ 18건
└────────────────────────┘
```

#### 데이터 매핑
| 라벨 | 코드 | 색상 |
|------|------|------|
| 일반 입고 | NORMAL | #2196F3 (파란색) |
| 반품 입고 | RETURN | #F44336 (빨간색) |
| 기타 입고 | ETC | #9E9E9E (회색) |

#### Chart.js 설정
```javascript
{
  type: 'bar',
  data: {
    labels: ['일반 입고', '반품 입고', '기타 입고'],
    datasets: [{
      label: '입고 건수',
      data: [typeStats.NORMAL, typeStats.RETURN, typeStats.ETC],
      backgroundColor: ['#2196F3', '#F44336', '#9E9E9E'],
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

### 3. 검수 현황 (추가 통계 카드)

3개의 검수 상태 카드:

```
┌─────────────┬─────────────┬─────────────┐
│ 🔍 검수대기  │ ✔️ 검수완료  │ ⚠️ 불량     │
│    12건     │   128건     │    3건      │
└─────────────┴─────────────┴─────────────┘
```

#### 검수 상태 정의
| 상태 | 설명 | 색상 | 클릭 시 동작 |
|------|------|------|-------------|
| 🔍 검수대기 | inspFlag=true, insp_qty=0 | #2196F3 | 검수 대기 목록 |
| ✔️ 검수완료 | inspFlag=true, insp_qty>0, insp_status=PASS | #4CAF50 | 검수 완료 목록 |
| ⚠️ 불량 | insp_status=FAIL | #F44336 | 불량 목록 |

---

### 4. 주의 항목 (알림 섹션)

동적으로 생성되는 알림 리스트:

```
⚠️ 주의 항목
┌─────────────────────────────────────────┐
│ 🚨 지연 입고: 2건 (예정일 초과)          │
│ ⚠️  검수 불량: 3건 (즉시 처리 필요)      │
│ 📦 검수 대기 긴급건: 5건                │
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
  message: '지연 입고: 2건 (예정일 초과)'
}
```

---

### 5. 바로가기 버튼

4개의 주요 기능 바로가기:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 📝 입고지시  │ 🔍 입고검수  │ 📋 입고실적  │ 📦 재고조회  │
│   생성      │             │   조회      │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 버튼별 동작
| 버튼 | 아이콘 | 동작 | 페이지/팝업 |
|------|--------|------|------------|
| 입고지시 생성 | 📝 | 팝업 열기 | receiving-new-popup |
| 입고검수 | 🔍 | 페이지 이동 | receiving-inspection |
| 입고실적 조회 | 📋 | 페이지 이동 | receiving-results |
| 재고조회 | 📦 | 페이지 이동 | stock-list |

---

### 6. 최근 입고 내역 (선택적)

실시간 최근 입고 내역 테이블:

```
최근 입고 내역 (실시간)
┌──────────────┬───────────┬──────┬──────┬────────┐
│ 입고번호      │ 거래처     │ 상태  │ 수량  │ 일시    │
├──────────────┼───────────┼──────┼──────┼────────┤
│ RCV20260320-1│ ㈜한국상사 │ 완료  │ 150  │ 14:23  │
│ RCV20260320-2│ ABC 물류   │작업중 │  85  │ 13:45  │
└──────────────┴───────────┴──────┴──────┴────────┘
```

#### 테이블 컬럼
- 입고번호 (rcv_no): 클릭 시 상세 페이지 이동
- 거래처 (vend_cd): 거래처명 표시
- 상태 (status): 상태별 색상 배지
- 수량 (rcv_qty): 총 입고 수량
- 일시 (rcv_date): HH:mm 형식

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
- 작성중 (INWORK): #9E9E9E (회색)
- 대기 (READY): #2196F3 (파란색)
- 작업중 (START): #FF9800 (주황색)
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
GET /rest/receiving/dashboard/status-counts
Query: rcv_req_date (optional, default: today)
```

**Response:**
```json
{
  "INWORK": 15,
  "READY": 23,
  "START": 8,
  "END": 142,
  "CANCEL": 2
}
```

**로직:**
- 오늘 날짜(`rcv_req_date = today`) 기준
- domain_id 필터 필수
- status별 COUNT(*)

---

### 2. 입고 유형별 통계
```
GET /rest/receiving/dashboard/type-stats
Query: rcv_req_date (optional, default: today)
```

**Response:**
```json
{
  "NORMAL": 85,
  "RETURN": 32,
  "ETC": 18
}
```

**로직:**
- 오늘 날짜 기준
- rcv_type별 COUNT(*)
- status != 'CANCEL' 제외

---

### 3. 검수 현황 통계
```
GET /rest/receiving/dashboard/inspection-stats
Query: rcv_req_date (optional, default: today)
```

**Response:**
```json
{
  "WAIT": 12,
  "PASS": 128,
  "FAIL": 3
}
```

**로직:**
- ReceivingItem 테이블 기준
- WAIT: inspFlag=true AND insp_qty=0
- PASS: insp_status='PASS'
- FAIL: insp_status='FAIL'

---

### 4. 알림 데이터 조회
```
GET /rest/receiving/dashboard/alerts
```

**Response:**
```json
[
  {
    "type": "warning",
    "icon": "🚨",
    "message": "지연 입고: 2건 (예정일 초과)"
  },
  {
    "type": "info",
    "icon": "⚠️",
    "message": "검수 불량: 3건 (즉시 처리 필요)"
  }
]
```

**로직:**
- 지연 입고: `rcv_exp_date < today AND status != 'END'`
- 검수 불량: `insp_status = 'FAIL' AND rcv_date = today`
- 검수 대기 긴급건: `inspFlag=true AND insp_qty=0 AND urgent_flag=true`

---

### 5. 최근 입고 내역 (선택적)
```
GET /rest/receiving/dashboard/recent-list
Query: limit (default: 10)
```

**Response:**
```json
[
  {
    "rcvNo": "RCV20260320-1",
    "vendNm": "㈜한국상사",
    "status": "END",
    "totalQty": 150,
    "rcvDate": "2026-03-20 14:23:15"
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
frontend/packages/operato-wes/client/pages/inbound/
├── inbound-home.js              # 대시보드 메인 화면 (수정)
└── receiving-new-popup.js       # 입고 지시 생성 팝업 (신규)
```

### 컴포넌트 구조
```javascript
class InboundHome extends PageView {
  static properties = {
    loading: Boolean,
    statusCounts: Object,      // 상태별 건수
    typeStats: Object,         // 유형별 통계
    inspectionStats: Object,   // 검수 통계
    alerts: Array,             // 알림 목록
    recentList: Array          // 최근 내역
  }

  // 라이프사이클
  async pageUpdated(changes, lifecycle, before)
  async _fetchDashboardData()

  // API 호출
  async _fetchStatusCounts()
  async _fetchTypeStats()
  async _fetchInspectionStats()
  async _fetchAlerts()
  async _fetchRecentList()

  // 차트 렌더링
  _renderChart()

  // 네비게이션
  _navigateTo(page, filter)
  _openReceivingNewPopup()

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

1. **백엔드 API 구현** (ReceivingDashboardController.java)
   - [ ] status-counts 엔드포인트
   - [ ] type-stats 엔드포인트
   - [ ] inspection-stats 엔드포인트
   - [ ] alerts 엔드포인트
   - [ ] recent-list 엔드포인트 (선택)

2. **프론트엔드 화면 구현** (inbound-home.js)
   - [ ] 레이아웃 및 스타일 정의
   - [ ] 상태 카드 섹션
   - [ ] 유형별 차트 섹션
   - [ ] 검수 현황 섹션
   - [ ] 알림 섹션
   - [ ] 바로가기 버튼
   - [ ] 최근 내역 테이블 (선택)

3. **팝업 구현** (receiving-new-popup.js)
   - [ ] 입고 지시 생성 폼
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

- VAS 대시보드: `frontend/packages/operato-wes/client/pages/vas/vas-home.js`
- 입고 엔티티: `src/main/java/operato/wms/inbound/entity/Receiving.java`
- 입고 상수: `src/main/java/operato/wms/inbound/WmsInboundConstants.java`
- Chart.js 문서: https://www.chartjs.org/docs/latest/
