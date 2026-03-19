# 재고 대시보드 화면 설계

## 개요

재고 현황을 실시간으로 모니터링하고 관리할 수 있는 대시보드 화면

## 화면 구성

### 1. 재고 현황 카드 (4개)

#### 1.1 전체 재고
- **표시**: 전체 재고 수량 (SKU 수 / 총 수량)
- **색상**: 파란색 (#2196F3)
- **아이콘**: 📦
- **클릭**: 재고 조회 화면으로 이동

#### 1.2 가용 재고
- **표시**: 출고 가능한 재고 (STORED 상태)
- **색상**: 녹색 (#4CAF50)
- **아이콘**: ✅
- **클릭**: status=STORED 필터로 재고 조회

#### 1.3 할당 재고
- **표시**: 출고 예약된 재고 (RESERVED 상태)
- **색상**: 주황색 (#FF9800)
- **아이콘**: 🔒
- **클릭**: status=RESERVED 필터로 재고 조회

#### 1.4 부족 재고
- **표시**: 안전재고 미만 SKU 수
- **색상**: 빨간색 (#F44336)
- **아이콘**: ⚠️
- **클릭**: 부족 재고 목록 조회

---

### 2. 재고 상태별 차트

**유형**: 막대 차트 (Bar Chart)

**데이터**:
- STORED (보관 중): 파란색
- RESERVED (예약됨): 주황색
- PICKING (피킹 중): 보라색
- LOCKED (잠김): 회색
- BAD (불량): 빨간색

**API**: `/rest/stock/dashboard/status-stats`

---

### 3. 유효기한 상태 카드 (3개)

#### 3.1 정상 재고
- **상태**: NORMAL
- **색상**: 녹색
- **표시**: SKU 수 / 수량

#### 3.2 임박 재고
- **상태**: IMMINENT (유효기한 30일 이내)
- **색상**: 주황색
- **표시**: SKU 수 / 수량

#### 3.3 만료 재고
- **상태**: EXPIRED
- **색상**: 빨간색
- **표시**: SKU 수 / 수량

---

### 4. 로케이션 유형별 통계 (3개)

#### 4.1 보관 로케이션
- **유형**: STORAGE, RACK
- **표시**: 사용률 (%)
- **색상**: 파란색

#### 4.2 피킹 로케이션
- **유형**: PICKING
- **표시**: 사용률 (%)
- **색상**: 녹색

#### 4.3 기타 로케이션
- **유형**: STAGING, INSPECT 등
- **표시**: 사용률 (%)
- **색상**: 회색

---

### 5. 알림 영역

#### 5.1 부족 재고 알림
- **조건**: `loadable_qty < safety_stock`
- **아이콘**: ⚠️
- **메시지**: "부족 재고 {count}건이 있습니다."
- **타입**: warning

#### 5.2 유효기한 임박 알림
- **조건**: `expire_status = 'IMMINENT'`
- **아이콘**: ⏰
- **메시지**: "유효기한 임박 상품 {count}건이 있습니다."
- **타입**: warning

#### 5.3 만료 재고 알림
- **조건**: `expire_status = 'EXPIRED'`
- **아이콘**: 🚫
- **메시지**: "유효기한 만료 상품 {count}건이 있습니다."
- **타입**: error

#### 5.4 장기 재고 알림
- **조건**: `last_tran_date < DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)`
- **아이콘**: 📊
- **메시지**: "90일 이상 미출고 재고 {count}건이 있습니다."
- **타입**: info

---

### 6. 바로가기 버튼 (4개)

1. **재고 조회** → `/inventories`
2. **재고 조정** → `/stock-adjustments`
3. **실사 작업** → `/stocktakes`
4. **재고 이동** → `/stock-moves`

---

## 백엔드 API 설계

### API 엔드포인트

#### 1. 재고 현황 조회
```
GET /rest/stock/dashboard/status-counts
```

**파라미터**:
- `com_cd` (optional): 화주사 코드
- `wh_cd` (optional): 창고 코드

**응답**:
```json
{
  "total_sku": 1500,
  "total_qty": 50000,
  "stored_qty": 45000,
  "reserved_qty": 3000,
  "picking_qty": 1500,
  "locked_qty": 300,
  "bad_qty": 200,
  "shortage_count": 25
}
```

---

#### 2. 재고 상태별 통계
```
GET /rest/stock/dashboard/status-stats
```

**파라미터**:
- `com_cd` (optional): 화주사 코드
- `wh_cd` (optional): 창고 코드

**응답**:
```json
{
  "STORED": 45000,
  "RESERVED": 3000,
  "PICKING": 1500,
  "LOCKED": 300,
  "BAD": 200
}
```

**SQL**:
```sql
SELECT status, SUM(loadable_qty) as qty
FROM inventories
WHERE domain_id = :domainId
  AND wh_cd = :whCd
  AND com_cd = :comCd
  AND status IN ('STORED', 'RESERVED', 'PICKING', 'LOCKED', 'BAD')
GROUP BY status
```

---

#### 3. 유효기한 상태별 통계
```
GET /rest/stock/dashboard/expire-stats
```

**파라미터**:
- `com_cd` (optional): 화주사 코드
- `wh_cd` (optional): 창고 코드

**응답**:
```json
{
  "NORMAL": { "sku_count": 1450, "qty": 48000 },
  "IMMINENT": { "sku_count": 30, "qty": 1500 },
  "EXPIRED": { "sku_count": 20, "qty": 500 }
}
```

**SQL**:
```sql
SELECT
  expire_status,
  COUNT(DISTINCT sku_cd) as sku_count,
  SUM(loadable_qty) as qty
FROM inventories
WHERE domain_id = :domainId
  AND wh_cd = :whCd
  AND com_cd = :comCd
  AND del_flag = 'N'
GROUP BY expire_status
```

---

#### 4. 로케이션 유형별 통계
```
GET /rest/stock/dashboard/location-stats
```

**파라미터**:
- `com_cd` (optional): 화주사 코드
- `wh_cd` (optional): 창고 코드

**응답**:
```json
{
  "STORAGE": { "total": 1000, "used": 850, "usage_rate": 85.0 },
  "PICKING": { "total": 200, "used": 180, "usage_rate": 90.0 },
  "OTHER": { "total": 100, "used": 50, "usage_rate": 50.0 }
}
```

**SQL**:
```sql
SELECT
  CASE
    WHEN l.loc_type IN ('STORAGE', 'RACK') THEN 'STORAGE'
    WHEN l.loc_type = 'PICKING' THEN 'PICKING'
    ELSE 'OTHER'
  END as loc_group,
  COUNT(l.id) as total,
  COUNT(i.id) as used
FROM locations l
LEFT JOIN inventories i ON l.loc_cd = i.loc_cd
  AND i.domain_id = :domainId
  AND i.loadable_qty > 0
WHERE l.domain_id = :domainId
  AND l.wh_cd = :whCd
GROUP BY loc_group
```

---

#### 5. 알림 데이터 조회
```
GET /rest/stock/dashboard/alerts
```

**파라미터**:
- `com_cd` (optional): 화주사 코드
- `wh_cd` (optional): 창고 코드

**응답**:
```json
[
  {
    "type": "warning",
    "icon": "⚠️",
    "message": "부족 재고 25건이 있습니다."
  },
  {
    "type": "warning",
    "icon": "⏰",
    "message": "유효기한 임박 상품 30건이 있습니다."
  },
  {
    "type": "error",
    "icon": "🚫",
    "message": "유효기한 만료 상품 20건이 있습니다."
  },
  {
    "type": "info",
    "icon": "📊",
    "message": "90일 이상 미출고 재고 15건이 있습니다."
  }
]
```

---

## 프론트엔드 구현

### 파일 위치
- **경로**: `frontend/packages/operato-wes/client/pages/stock/stock-home.js`
- **라우트**: `/stock-home`

### 컴포넌트 구조

```javascript
class StockHome extends PageView {
  static properties = {
    loading: Boolean,
    statusCounts: Object,
    statusStats: Object,
    expireStats: Object,
    locationStats: Object,
    alerts: Array
  }

  async pageUpdated(changes, lifecycle, before) {
    if (this.active) {
      await this._fetchDashboardData()
    }
  }

  async _fetchDashboardData() {
    this.loading = true
    try {
      const [statusCounts, statusStats, expireStats, locationStats, alerts] =
        await Promise.all([
          this._fetchStatusCounts(),
          this._fetchStatusStats(),
          this._fetchExpireStats(),
          this._fetchLocationStats(),
          this._fetchAlerts()
        ])

      this.statusCounts = statusCounts
      this.statusStats = statusStats
      this.expireStats = expireStats
      this.locationStats = locationStats
      this.alerts = alerts

      this.updateComplete.then(() => this._renderChart())
    } finally {
      this.loading = false
    }
  }

  _renderChart() {
    const ctx = this.renderRoot.querySelector('#statusChart')
    if (this._chart) {
      this._chart.destroy()
    }

    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['보관 중', '예약됨', '피킹 중', '잠김', '불량'],
        datasets: [{
          label: '수량',
          data: [
            this.statusStats.STORED,
            this.statusStats.RESERVED,
            this.statusStats.PICKING,
            this.statusStats.LOCKED,
            this.statusStats.BAD
          ],
          backgroundColor: [
            '#2196F3', // 파란색
            '#FF9800', // 주황색
            '#9C27B0', // 보라색
            '#9E9E9E', // 회색
            '#F44336'  // 빨간색
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    })
  }

  pageDisposed(lifecycle, before) {
    if (this._chart) {
      this._chart.destroy()
      this._chart = null
    }
  }
}
```

---

## 스타일 가이드

### Material Design 3 적용
- **카드**: elevation-1, border-radius: 12px
- **색상 팔레트**:
  - Primary: #2196F3
  - Success: #4CAF50
  - Warning: #FF9800
  - Error: #F44336
  - Info: #00BCD4
- **타이포그래피**:
  - 제목: 18px, font-weight: 600
  - 수량: 32px, font-weight: 700
  - 설명: 14px, font-weight: 400

---

## 데이터 흐름

```
1. 사용자 접속
   ↓
2. pageUpdated() 호출
   ↓
3. 5개 API 병렬 호출
   - status-counts
   - status-stats
   - expire-stats
   - location-stats
   - alerts
   ↓
4. 데이터 바인딩
   ↓
5. Chart.js 렌더링
   ↓
6. 화면 표시
```

---

## 입고/출고 대시보드와 비교

| 항목 | 입고 대시보드 | 출고 대시보드 | **재고 대시보드** |
|------|-------------|-------------|----------------|
| 상태 카드 | 4개 (INWORK/READY/START/END) | 4개 (REG/READY/RUN/END) | **4개 (전체/가용/할당/부족)** |
| 차트 | 유형별 (3개) | 유형별 (5개) | **상태별 (5개)** |
| 특화 통계 | 검수 현황 | 피킹 통계, 사업 유형 | **유효기한 상태, 로케이션 통계** |
| 알림 | 2개 | 2개 | **4개 (부족/임박/만료/장기)** |
| 바로가기 | 4개 | 4개 | **4개** |

---

## 구현 우선순위

### Phase 1 (필수)
1. 재고 현황 카드 4개
2. 재고 상태별 차트
3. 알림 (부족 재고, 유효기한 임박)
4. 바로가기 버튼

### Phase 2 (권장)
5. 유효기한 상태 카드
6. 로케이션 통계
7. 장기 재고 알림

### Phase 3 (선택)
8. 재고 회전율 분석
9. ABC 분석
10. 실시간 재고 변동 알림

---

## 주요 기술적 고려사항

### 1. 성능 최적화
- 대량 재고 조회 시 인덱스 활용 (ix_inventories_1, ix_inventories_3)
- 집계 쿼리는 GROUP BY + SUM 활용
- 캐싱 고려 (Redis, 5분 TTL)

### 2. 실시간성
- 재고 변동 시 WebSocket/SSE로 알림 가능
- 주기적 polling (30초 간격) 고려

### 3. 멀티테넌시
- 모든 쿼리에 `domain_id` 필터 필수
- `com_cd`, `wh_cd` 파라미터로 데이터 분리

### 4. 데이터 정합성
- `del_flag = 'N'` 조건 필수
- `loadable_qty > 0` 조건으로 실재고만 조회

---

## 예상 이슈 및 해결 방안

### 이슈 1: 대량 재고 조회 성능 저하
**해결**:
- 인덱스 최적화 (ix_inventories_1, ix_inventories_9)
- 페이지네이션 적용
- 캐싱 활용

### 이슈 2: 부족 재고 기준 불명확
**해결**:
- `safety_stock` 컬럼 활용
- 설정값으로 기준 조정 가능하도록 구현

### 이슈 3: 유효기한 계산 복잡도
**해결**:
- `expire_status` 컬럼 활용 (이미 계산된 값)
- 배치 작업으로 주기적 업데이트

---

## 참고 자료

- **입고 대시보드**: `docs/design/inbound-screen-design.md`
- **출고 대시보드**: `docs/design/outbound-screen-design.md`
- **Inventory 엔티티**: `src/main/java/operato/wms/stock/entity/Inventory.java`
