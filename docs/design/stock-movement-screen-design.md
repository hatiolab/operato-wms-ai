# 수불 관리 화면 설계

## 개요

`inventory_transactions` + `stock_movement_summaries` 테이블을 기반으로 한
재고 트랜잭션 조회 및 수불 현황 화면 설계.

- **재고 트랜잭션 현황**: 바코드 단위 트랜잭션 이력 조회
- **수불 현황**: SKU × 기간 기준 입출고 집계 조회
- **수불 상세**: 특정 SKU의 기간 내 트랜잭션 드릴다운

---

## 화면 1. 재고 트랜잭션 현황

### 1.1 기본 정보

| 항목 | 내용 |
|------|------|
| 파일 경로 | `client/pages/stock/inventory-transaction-list.js` |
| 라우트 | `/inventory-transactions` |
| 메뉴 위치 | 재고 관리 > 재고 트랜잭션 현황 |
| 목적 | 바코드 단위로 발생한 모든 재고 트랜잭션 이력 조회 |

### 1.2 화면 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ [조회 기간] from ─ to   [창고] [화주사] [SKU]                  │
│ [트랜잭션 유형] ▼   [참조문서번호]   [바코드]   [조회] [초기화] │
├──────────────────────────────────────────────────────────────┤
│ 총 N건                          [Excel 다운로드]              │
├──────────────────────────────────────────────────────────────┤
│ 일시 │ 바코드 │ SKU명 │ 창고 │ 로케이션 │ 유형 │ 변경전 │ 변경량 │ 변경후 │ 참조문서 │ 작업자 │
│ ...  │        │       │      │          │      │       │       │       │         │        │
│ ...  │        │       │      │          │      │       │       │       │         │        │
├──────────────────────────────────────────────────────────────┤
│ [이전] [1] [2] [3] ... [다음]                                 │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 검색 필터

| 필드 | 유형 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `from_date` | 날짜 | ✓ | 오늘 -7일 | 조회 시작일 |
| `to_date` | 날짜 | ✓ | 오늘 | 조회 종료일 |
| `wh_cd` | 셀렉트 | | | 창고 |
| `com_cd` | 셀렉트 | | | 화주사 |
| `sku_cd` | 텍스트 | | | 상품 코드 |
| `tran_type` | 멀티 셀렉트 | | | 트랜잭션 유형 (복수 선택) |
| `ref_doc_no` | 텍스트 | | | 참조 문서 번호 |
| `barcode` | 텍스트 | | | 재고 바코드 |

### 1.4 그리드 컬럼

| 컬럼명 | 필드 | 정렬 | 설명 |
|--------|------|------|------|
| 트랜잭션 일시 | `tran_at` | DESC | YYYY-MM-DD HH:mm:ss |
| 바코드 | `barcode` | | |
| SKU명 | `sku_nm` | | |
| 창고 | `wh_cd` | | |
| 로케이션 | `loc_cd` | | 출발 로케이션 |
| 이동 목적지 | `to_loc_cd` | | MOVE 유형만 표시 |
| 유형 | `tran_type` | | 코드값 → 한글 레이블 표시 |
| 변경 전 | `before_qty` | | 우측 정렬, 소수 1자리 |
| 변경량 | `tran_qty` | | 양수: 파란색, 음수: 빨간색 |
| 변경 후 | `after_qty` | | 우측 정렬 |
| 참조 문서 | `ref_doc_type` + `ref_doc_no` | | 예: `RCV / RCV-240101-0001` |
| 사유 코드 | `reason_cd` | | |
| 사유 | `reason` | | |
| 작업자 | `worker_id` | | |

### 1.5 `tran_type` 한글 표시 매핑

| 코드 | 표시 | 색상 |
|------|------|------|
| `IN`, `IN_INSP`, `RWA_RESTOCK` | 입고 계열 | 파란색 |
| `IN_CANCEL` | 입고 취소 | 회색 |
| `OUT` | 출고 | 빨간색 |
| `OUT_CANCEL` | 출고 취소 | 회색 |
| `MOVE_OUT` | 이동 출고 | 주황색 |
| `MOVE_IN` | 이동 입고 | 녹색 |
| `ADJUST_PLUS`, `COUNT_PLUS` | 조정+ | 파란색 |
| `ADJUST_MINUS`, `COUNT_MINUS` | 조정- | 빨간색 |
| `SCRAP` | 폐기 | 암적색 |
| `HOLD`, `RELEASE_HOLD` | 홀드/해제 | 회색 |
| `VAS_OUT` | 유통가공 | 보라색 |
| `SPLIT`, `MERGE` | 분할/병합 | 하늘색 |

### 1.6 행 클릭 동작

- 클릭 시 트랜잭션 상세 팝업 표시
- 참조 문서 번호 클릭 시 해당 업무 화면으로 이동
  - `ref_doc_type = RCV` → 입고 상세
  - `ref_doc_type = RLS` → 출고 주문 상세

### 1.7 백엔드 API

```
GET /rest/inventory_transactions
파라미터: from_date, to_date, wh_cd, com_cd, sku_cd, tran_type (쉼표 구분),
          ref_doc_no, barcode, page, limit, sort
응답: { total_count, items: [...], page, limit }
```

---

## 화면 2. 수불 현황

### 2.1 기본 정보

| 항목 | 내용 |
|------|------|
| 파일 경로 | `client/pages/stock/stock-movement-list.js` |
| 라우트 | `/stock-movements` |
| 메뉴 위치 | 재고 관리 > 수불 현황 |
| 목적 | SKU × 기간 기준 입출고 집계 현황 조회 |

### 2.2 화면 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ [조회 기간] from ─ to   [집계 단위] 일별 ▼                    │
│ [창고] ▼   [화주사] ▼   [SKU 코드]   [SKU명]                  │
│                                     [조회] [초기화] [Excel]  │
├──────────────────────────────────────────────────────────────┤
│ 합계 행: 기초재고 N | 입고 N | 출고 N | 조정 N | 기말재고 N   │
├──────────────────────────────────────────────────────────────┤
│ 기간 │ SKU│ SKU명 │ 기초재고 │ 입고 │ 입고취소 │ 출고 │ 출고취소 │ 이동입고 │ 이동출고 │ 조정+ │ 조정- │ 폐기 │ 기말재고 │
│      │     │       │          │      │          │      │          │          │          │       │       │      │          │
│      │     │       │          │      │          │      │          │          │          │       │       │      │          │
├──────────────────────────────────────────────────────────────┤
│ 합계 │     │       │          │      │          │      │          │          │          │       │       │      │          │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 검색 필터

| 필드 | 유형 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `from_date` | 날짜 | ✓ | 이번 달 1일 | 조회 시작일 |
| `to_date` | 날짜 | ✓ | 오늘 | 조회 종료일 |
| `period_type` | 셀렉트 | ✓ | `DAILY` | 일별 / 월별 |
| `wh_cd` | 셀렉트 | | | 창고 |
| `com_cd` | 셀렉트 | | | 화주사 |
| `sku_cd` | 텍스트 | | | 상품 코드 (부분 일치) |
| `sku_nm` | 텍스트 | | | 상품명 (부분 일치) |

### 2.4 그리드 컬럼

| 컬럼명 | 필드 | 설명 |
|--------|------|------|
| 기간 | `summary_date` | 일별: YYYY-MM-DD, 월별: YYYY-MM |
| SKU 코드 | `sku_cd` | |
| SKU명 | `sku_nm` | |
| 창고 | `wh_cd` | |
| 화주사 | `com_cd` | |
| 기초 재고 | `opening_qty` | 우측 정렬, 파란색 |
| 입고 | `in_qty` | 우측 정렬 |
| 입고 취소 | `in_cancel_qty` | 숨김 (기본), 펼침 시 표시 |
| 출고 | `out_qty` | 우측 정렬 |
| 출고 취소 | `out_cancel_qty` | 숨김 (기본) |
| 이동 입고 | `transfer_in_qty` | 숨김 (기본) |
| 이동 출고 | `transfer_out_qty` | 숨김 (기본) |
| 조정 (+) | `adjust_plus_qty` | |
| 조정 (-) | `adjust_minus_qty` | |
| 폐기 | `scrap_qty` | |
| 기말 재고 | `closing_qty` | 우측 정렬, 굵게 |

> 취소·이동 컬럼은 기본 숨김 처리하고 "상세 컬럼 보기" 토글로 표시한다.

### 2.5 합계 행 (Footer Row)

그리드 하단에 **전체 합계 행** 고정 표시:
- 기초 재고: 조회된 첫 번째 날의 기초 재고 합계
- 입고 ~ 폐기: 기간 내 각 항목 합계
- 기말 재고: 조회된 마지막 날의 기말 재고 합계

### 2.6 행 클릭 동작 — 드릴다운

그리드 행 클릭 시 **화면 3(수불 상세)** 슬라이드 패널로 표시.
전달 파라미터: `summary_date`, `wh_cd`, `com_cd`, `sku_cd`, `period_type`

### 2.7 집계 단위별 데이터 소스

| 집계 단위 | 기간 내 어제까지 | 오늘 | 비고 |
|----------|----------------|------|------|
| 일별 | `stock_movement_summaries` | `inventory_transactions` 실시간 집계 | UNION 후 합산 |
| 월별 | `stock_movement_summaries` GROUP BY YYYY-MM | `inventory_transactions` 실시간 집계 | 당월 미완성 포함 |

### 2.8 백엔드 API

```
GET /rest/inventory_transactions/movements
파라미터: from_date, to_date, period_type (DAILY/MONTHLY),
          wh_cd, com_cd, sku_cd, sku_nm, page, limit
응답:
{
  "total_count": N,
  "summary": {              ← 전체 기간 합계
    "opening_qty": 0,
    "in_qty": 0,
    "out_qty": 0,
    ...
    "closing_qty": 0
  },
  "items": [
    {
      "summary_date": "2026-05-01",
      "sku_cd": "SKU001",
      "sku_nm": "상품명",
      "wh_cd": "WH01",
      "com_cd": "COM01",
      "opening_qty": 100,
      "in_qty": 50,
      "in_cancel_qty": 0,
      "out_qty": 30,
      "out_cancel_qty": 0,
      "transfer_in_qty": 0,
      "transfer_out_qty": 0,
      "adjust_plus_qty": 0,
      "adjust_minus_qty": 0,
      "scrap_qty": 0,
      "closing_qty": 120
    }
  ]
}
```

### 2.9 기초 재고 산출 방법

```sql
-- 조회 기간 시작일 이전까지의 누적 변동합으로 기초 재고 계산
-- (당일 집계 테이블이 없는 경우 inventory_transactions 직접 합산)

SELECT
  wh_cd, com_cd, sku_cd,
  SUM(tran_qty) AS running_qty
FROM inventory_transactions
WHERE domain_id = :domainId
  AND tran_date < :from_date
GROUP BY wh_cd, com_cd, sku_cd
```

> 또는 `stock_movement_summaries`에서 `summary_date = from_date - 1`의 `closing_qty` 사용.

---

## 화면 3. 수불 상세 (드릴다운)

### 3.1 기본 정보

| 항목 | 내용 |
|------|------|
| 파일 경로 | `client/pages/stock/stock-movement-detail.js` |
| 표시 방식 | 슬라이드 패널 (화면 2에서 드릴다운) 또는 라우트 `/stock-movements/:sku_cd` |
| 목적 | 특정 SKU의 기간 내 트랜잭션 상세 내역 조회 |

### 3.2 화면 레이아웃

```
┌──────────────────────────────────────────────────┐
│ [SKU: SKU001] [SKU명: 상품명] [기간: 2026-05-01 ~ 2026-05-31] │
│ [창고: WH01]  [화주사: COM01]                     │
├──────────────────────────────────────────────────┤
│ 기초재고: 100   기말재고: 120   순변동: +20        │
├──────────────────────────────────────────────────┤
│ 일시 │ 바코드 │ 로케이션 │ 유형 │ 변경전 │ 변경량 │ 변경후 │ 참조문서 │
│      │        │          │      │       │       │       │         │
├──────────────────────────────────────────────────┤
│ 합계:          │      │  입고: N  │  출고: N  │  조정: N  │
└──────────────────────────────────────────────────┘
```

### 3.3 그리드 컬럼

| 컬럼명 | 필드 | 설명 |
|--------|------|------|
| 트랜잭션 일시 | `tran_at` | YYYY-MM-DD HH:mm |
| 바코드 | `barcode` | |
| 로케이션 | `loc_cd` | |
| 유형 | `tran_type` | 한글 레이블 + 색상 (화면 1과 동일) |
| 변경 전 | `before_qty` | 우측 정렬 |
| 변경량 | `tran_qty` | 양수: 파란색, 음수: 빨간색 |
| 변경 후 | `after_qty` | 우측 정렬 |
| 참조 문서 | `ref_doc_type` + `ref_doc_no` | 클릭 → 관련 화면 이동 |
| 사유 | `reason_cd` | |
| 작업자 | `worker_id` | |

### 3.4 상단 요약 카드

```
┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  기초 재고   │  │   기말 재고  │  │  총 입고  │  │  총 출고  │  │   조정   │
│    100      │  │    120      │  │   +50    │  │   -30    │  │   +/-0   │
└─────────────┘  └─────────────┘  └──────────┘  └──────────┘  └──────────┘
```

### 3.5 백엔드 API

```
GET /rest/inventory_transactions/movement_detail
파라미터: from_date, to_date, wh_cd, com_cd, sku_cd, page, limit
응답:
{
  "opening_qty": 100,
  "closing_qty": 120,
  "in_qty": 50,
  "out_qty": 30,
  "adjust_qty": 0,
  "tran_count": 15,
  "items": [ ... inventory_transactions 레코드 ... ]
}
```

---

## 화면 간 네비게이션 흐름

```
재고 트랜잭션 현황              수불 현황                 수불 상세
(inventory-transaction-list)  (stock-movement-list)  (stock-movement-detail)

                               [SKU 행 클릭]
                                    ───────────────────→ 슬라이드 패널
                                                          (해당 SKU 트랜잭션)

재고 관리 > 재고 조회
  (inventory-list)
    ↓ [이력 탭]
  inventory-transaction-list
  (barcode 필터 적용)
```

---

## 메뉴 구성 (재고 관리 하위)

```
재고 관리
├── 재고 대시보드          (stock-home)
├── 재고 조회              (inventory-list)
├── 재고 트랜잭션 현황      (inventory-transaction-list)  ← 신규
├── 수불 현황              (stock-movement-list)          ← 신규
├── 재고 이동              (stock-move)
├── 재고 조정              (stock-adjustment)
└── 실사 관리              (stocktake)
```

---

## 구현 참고 파일

| 참고 대상 | 파일 경로 | 활용 포인트 |
|-----------|----------|------------|
| 그리드 패턴 | `client/pages/fulfillment/fulfillment-picking-pc.js` | 100% 규칙 준수 예시 |
| 수불 현황 API 참고 | `src/.../InventoryHistController.java` `searchTransactions()` | 기존 파라미터 구조 |
| 테이블 설계 | `docs/design/stock-transaction-table-design.md` | inventory_transactions 스키마 |
| 개선 계획 | `docs/design/stock-inventory-improvement.md` | 전체 개선 Task 목록 |
