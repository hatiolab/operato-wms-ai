# 재고 트랜잭션 / 수불 테이블 설계

## 개요

`inventory_hists`의 구조적 한계(스냅샷 방식, 변경량 없음, 동시성 취약)를 해소하기 위해
`inventory_trans` 테이블을 신규 설계한다.
`inventory_hists`는 기존 데이터 보존용으로 유지하되, 신규 트랜잭션은 `inventory_trans`에만 기록하고
구성 완료 후 `inventory_hists` 사용을 중단한다.

수불 현황 조회는 `inventory_trans`의 실시간 집계를 기본으로 하되,
월별/연간 조회 성능을 위해 `daily_stock_summaries` 일별 집계 테이블을 병행 운영한다.

---

## 1. `inventory_trans` 테이블

### 1.1 설계 원칙

- **Append-only**: DELETE 금지. 취소/오류는 역방향 트랜잭션(+/- 반전)으로 처리
- **변경량 중심**: `tran_qty`(+/-), `before_qty`, `after_qty` 세 값이 항상 함께 기록
- **참조 추적**: 어떤 업무 문서(입고/출고/조정)에서 발생했는지 `ref_doc_type` + `ref_doc_no`로 기록
- **inventory_id 직접 연결**: `barcode` 경유 간접 조회 제거

### 1.2 컬럼 정의

| 컬럼명 | 타입 | NOT NULL | 설명 |
|--------|------|----------|------|
| `id` | VARCHAR(40) | ✓ | PK (UUID) |
| `domain_id` | BIGINT | ✓ | 도메인 ID (멀티테넌시) |
| `inventory_id` | VARCHAR(40) | ✓ | FK → inventories.id |
| `barcode` | VARCHAR(50) | ✓ | 재고 바코드 (비정규화, 조회 편의) |
| `wh_cd` | VARCHAR(30) | ✓ | 창고 코드 |
| `com_cd` | VARCHAR(30) | ✓ | 화주사 코드 |
| `sku_cd` | VARCHAR(30) | ✓ | 상품 코드 |
| `loc_cd` | VARCHAR(30) | ✓ | 로케이션 코드 (트랜잭션 발생 시점) |
| `to_loc_cd` | VARCHAR(30) | | 이동 목적지 로케이션 (MOVE 트랜잭션 전용) |
| `lot_no` | VARCHAR(50) | | Lot 번호 |
| `serial_no` | VARCHAR(50) | | 시리얼 번호 |
| `expired_date` | VARCHAR(10) | | 유통기한 (YYYY-MM-DD) |
| `tran_type` | VARCHAR(20) | ✓ | 트랜잭션 유형 (아래 코드 목록 참조) |
| `direction` | VARCHAR(3) | ✓ | 수불 방향 (IN: 수량 증가, OUT: 수량 감소) |
| `tran_qty` | DECIMAL(15,3) | ✓ | 변경 수량 (입고: +, 출고/차감: -) |
| `before_qty` | DECIMAL(15,3) | ✓ | 변경 전 재고 수량 |
| `after_qty` | DECIMAL(15,3) | ✓ | 변경 후 재고 수량 |
| `ref_doc_type` | VARCHAR(20) | | 참조 문서 유형 (RCV/RLS/ADJ/MOVE/VAS/COUNT 등) |
| `ref_doc_no` | VARCHAR(50) | | 참조 문서 번호 |
| `ref_line_no` | VARCHAR(20) | | 참조 문서 라인 번호 |
| `reason_cd` | VARCHAR(30) | | 사유 코드 (ADJUST/SCRAP/HOLD 시 필수) |
| `reason` | VARCHAR(255) | | 사유 |
| `tran_date` | VARCHAR(10) | ✓ | 트랜잭션 발생일 (YYYY-MM-DD, 기간 조회 전용) |
| `tran_at` | TIMESTAMP | ✓ | 트랜잭션 발생 일시 (정렬 기준) |
| `worker_id` | VARCHAR(40) | | 작업자 ID |
| `device_cd` | VARCHAR(30) | | 처리 장비/PDA 코드 |
| `remarks` | VARCHAR(500) | | 비고 |
| `created_at` | TIMESTAMP | ✓ | 레코드 생성 일시 |
| `creator_id` | VARCHAR(40) | | 레코드 생성자 ID |

### 1.3 `tran_type` 코드 목록

| 코드 | 한글명 | `tran_qty` 부호 | `ref_doc_type` |
|------|--------|----------------|----------------|
| `IN` | 입고 | + | `RCV` |
| `IN_CANCEL` | 입고 취소 | - | `RCV` |
| `OUT` | 출고 | - | `SHIP` |
| `OUT_CANCEL` | 출고 취소 | + | `SHIP` |
| `MOVE_OUT` | 이동 출고 (출발지) | - | `MOVE` |
| `MOVE_IN` | 이동 입고 (목적지) | + | `MOVE` |
| `ADJUST_PLUS` | 재고 조정 (증가) | + | `ADJ` |
| `ADJUST_MINUS` | 재고 조정 (감소) | - | `ADJ` |
| `HOLD` | 홀드 | 0 | — |
| `RELEASE_HOLD` | 홀드 해제 | 0 | — |
| `SCRAP` | 폐기 | - | `SCRAP` |
| `SPLIT` | 분할 (원본 차감) | - | — |
| `SPLIT_NEW` | 분할 (신규 생성) | + | — |
| `MERGE` | 병합 (흡수) | + | — |
| `MERGE_OUT` | 병합 (소멸) | - | — |
| `VAS_OUT` | 유통가공 차감 | - | `VAS` |
| `RWA_RESTOCK` | 반품 재입고 | + | `RWA` |
| `COUNT_PLUS` | 실사 조정 (증가) | + | `COUNT` |
| `COUNT_MINUS` | 실사 조정 (감소) | - | `COUNT` |
| `NEW` | 재고 신규 생성 | + | — |

> MOVE는 이동 발생 시 MOVE_OUT(출발지) + MOVE_IN(목적지) 두 레코드를 함께 생성한다.
> HOLD/RELEASE_HOLD는 수량 변경 없이 상태 변경 이력만 남기므로 `tran_qty = 0`.

### 1.4 인덱스 정의

```sql
-- 기본 조회 (기간 + 창고 + 화주사)
CREATE INDEX ix_inv_trn_0 ON inventory_trans (domain_id, tran_date, wh_cd, com_cd);

-- 수불 집계용 (SKU 기준)
CREATE INDEX ix_inv_trn_1 ON inventory_trans (domain_id, tran_date, wh_cd, com_cd, sku_cd);

-- 재고 단위 이력 조회
CREATE INDEX ix_inv_trn_2 ON inventory_trans (domain_id, inventory_id, tran_at DESC);

-- 바코드 이력 조회 (barcode로 직접 검색 지원)
CREATE INDEX ix_inv_trn_3 ON inventory_trans (domain_id, barcode, tran_at DESC);

-- 참조 문서 역추적
CREATE INDEX ix_inv_trn_4 ON inventory_trans (domain_id, ref_doc_type, ref_doc_no);

-- 트랜잭션 유형별 조회
CREATE INDEX ix_inv_trn_5 ON inventory_trans (domain_id, tran_type, tran_date);

-- 작업자별 조회
CREATE INDEX ix_inv_trn_6 ON inventory_trans (domain_id, worker_id, tran_date);
```

### 1.5 정합성 규칙

```
after_qty = before_qty + tran_qty  (항상 성립)
after_qty >= 0                     (재고 음수 불가)
```

### 1.6 `inventory_hists` 대비 개선점 요약

| 항목 | `inventory_hists` | `inventory_trans` |
|------|-------------------|--------------------------|
| 변경량 | 없음 (스냅샷) | `tran_qty` (+/-) |
| 변경 전 수량 | 이전 레코드 비교 필요 | `before_qty` |
| 재고 FK | `barcode` 경유 간접 조회 | `inventory_id` 직접 연결 |
| hist_seq 채번 | SELECT MAX + 1 (동시성 취약) | UUID + `tran_at` (타임스탬프) |
| 이동 방향 | `last_tran_cd = MOVE` 단일 | MOVE_OUT / MOVE_IN 분리 |
| 참조 문서 | `rcv_no`, `rls_ord_no` 일부만 | `ref_doc_type` + `ref_doc_no` 통일 |
| 삭제 | DELETE API 개방 | Append-only, DELETE 금지 |
| 사유 코드 | `remarks` 자유 입력 | `reason_cd` 코드화 |

---

## 2. `daily_stock_summaries` 테이블

### 2.1 목적 및 운영 방식

`inventory_trans`에서 실시간 GROUP BY 집계는 **일별 단위**까지는 허용 범위이지만,
월간·연간 수불 조회(수개월치 집계)는 성능 저하가 우려된다.

따라서 **매일 0시 배치**로 전일 `tran_date`의 수불 데이터를 집계하여 이 테이블에 저장한다.
당일 수불은 `inventory_trans`를 직접 집계하고,
당일 이전 데이터는 `daily_stock_summaries`를 사용한다.

```
조회 기간 내 당일 포함 여부에 따른 데이터 소스 선택:

  ┌─────────────────────────────────────────────┐
  │ from_date ~ yesterday │ today                │
  │ stock_movement_       │ inventory_           │
  │ summaries (집계)       │ transactions (실시간) │
  └─────────────────────────────────────────────┘
  → 두 결과를 UNION 후 SKU 기준 합산
```

### 2.2 컬럼 정의

| 컬럼명 | 타입 | NOT NULL | 설명 |
|--------|------|----------|------|
| `id` | VARCHAR(40) | ✓ | PK (UUID) |
| `domain_id` | BIGINT | ✓ | 도메인 ID |
| `summary_date` | VARCHAR(10) | ✓ | 집계 기준일 (YYYY-MM-DD) |
| `wh_cd` | VARCHAR(30) | ✓ | 창고 코드 |
| `com_cd` | VARCHAR(30) | ✓ | 화주사 코드 |
| `sku_cd` | VARCHAR(30) | ✓ | 상품 코드 |
| `opening_qty` | DOUBLE PRECISION | ✓ | 기초 재고 (해당일 0시 기준) |
| `in_qty` | DOUBLE PRECISION | ✓ | 입고 수량 (IN + RWA_RESTOCK) |
| `out_qty` | DOUBLE PRECISION | ✓ | 출고 수량 (OUT + 입고 불량 반품) |
| `in_cancel_qty` | DOUBLE PRECISION | ✓ | 입고 취소 수량 |
| `out_cancel_qty` | DOUBLE PRECISION | ✓ | 출고 취소 수량 |
| `transfer_in_qty` | DOUBLE PRECISION | ✓ | 창고간 이동 입고 (MOVE_IN) |
| `transfer_out_qty` | DOUBLE PRECISION | ✓ | 창고간 이동 출고 (MOVE_OUT) |
| `adjust_plus_qty` | DOUBLE PRECISION | ✓ | 조정 증가 (ADJUST_PLUS + COUNT_PLUS) |
| `adjust_minus_qty` | DOUBLE PRECISION | ✓ | 조정 감소 (ADJUST_MINUS + COUNT_MINUS) |
| `add_qty` | DOUBLE PRECISION | ✓ | 추가 수량 (NEW) |
| `loss_qty` | DOUBLE PRECISION | ✓ | 손실 수량 (SCRAP / LOSS) |
| `vas_out_qty` | DOUBLE PRECISION | ✓ | 유통가공 차감 (VAS_OUT) |
| `closing_qty` | DOUBLE PRECISION | ✓ | 기말 재고 (= 기초 + 당일 변동 합산) |
| `tran_count` | INTEGER | ✓ | 해당일 총 트랜잭션 건수 |
| `created_at` | TIMESTAMP | ✓ | 배치 생성 일시 |
| `updated_at` | TIMESTAMP | | 재계산 일시 |

### 2.3 기말 재고 산출 공식

```
closing_qty = opening_qty
            + in_qty - in_cancel_qty
            - out_qty + out_cancel_qty
            + transfer_in_qty - transfer_out_qty
            + adjust_plus_qty - adjust_minus_qty
            + add_qty
            - loss_qty
            - vas_out_qty
```

### 2.4 인덱스 정의

```sql
-- PK 외 메인 조회 인덱스
CREATE UNIQUE INDEX ix_dly_stk_sum_0
    ON daily_stock_summaries (domain_id, summary_date, wh_cd, com_cd, sku_cd);

-- 기간 범위 + 창고 조회
CREATE INDEX ix_dly_stk_sum_1
    ON daily_stock_summaries (domain_id, wh_cd, com_cd, summary_date);

-- SKU 기준 기간 조회
CREATE INDEX ix_dly_stk_sum_2
    ON daily_stock_summaries (domain_id, com_cd, sku_cd, summary_date);
```

### 2.5 배치 처리 흐름

```
[매일 00:10 배치]

1. 대상일 = 어제 (yesterday)

2. inventory_trans에서 집계:
   SELECT
     wh_cd, com_cd, sku_cd,
     SUM(CASE WHEN tran_type IN ('IN','RWA_RESTOCK') THEN tran_qty ELSE 0 END) AS in_qty,
     SUM(CASE WHEN tran_type = 'IN_CANCEL'                     THEN ABS(tran_qty) ELSE 0 END) AS in_cancel_qty,
     SUM(CASE WHEN tran_type = 'OUT'                           THEN ABS(tran_qty) ELSE 0 END) AS out_qty,
     ...
   WHERE domain_id = ? AND tran_date = ?
   GROUP BY wh_cd, com_cd, sku_cd

3. 기초 재고 = 전일 daily_stock_summaries.closing_qty
   (전일 레코드 없으면 inventory_trans 누적 합산으로 역산)

4. 기말 재고 계산 후 UPSERT (재실행 안전성 보장)
```

---

## 3. 테이블 연관 관계

```
inventories (재고 원장)
    │ 1
    │
    │ N
inventory_trans (재고 트랜잭션) ──── [ref_doc_no 참조] ───→ receivings
    │                                                              shipment_orders
    │ [집계 배치]                                                   adjustments 등
    ↓
daily_stock_summaries (수불 집계)


stock_allocations (재고 할당)
    │ inventory_id FK
    └─→ inventories
```

---

## 4. `inventory_hists` 이관 전략

### Phase 1 (현재 ~ 구성 완료 전)
- `inventory_trans`에 신규 트랜잭션 기록 시작
- `inventory_hists`는 읽기 전용 유지 (과거 이력 조회용)
- 화면에서 `inventory_trans` 우선 조회, 없으면 `inventory_hists` fallback

### Phase 2 (이관 완료 후)
- `inventory_hists` 조회를 제거하고 `inventory_trans`만 사용
- `inventory_hists`는 아카이브 테이블로 전환 (조회 전용)

### 데이터 마이그레이션 (선택적)
```sql
-- inventory_hists의 마지막 스냅샷을 기반으로
-- 재고 바코드별 최초 생성 이력 한 건만 NEW 유형으로 이관
INSERT INTO inventory_trans (
    id, domain_id, inventory_id, barcode, ...
    tran_type, tran_qty, before_qty, after_qty, tran_date, tran_at
)
SELECT
    gen_random_uuid(), h.domain_id,
    (SELECT id FROM inventories WHERE barcode = h.barcode AND domain_id = h.domain_id LIMIT 1),
    h.barcode, ...
    'NEW', h.inv_qty, 0, h.inv_qty,
    DATE(h.created_at), h.created_at
FROM inventory_hists h
WHERE h.hist_seq = 1  -- 최초 생성 이력만
```
