# 반품(RWA) 테이블 설계

> 작성일: 2026-03-12
> 기준: Operato WMS 표준 + 표준 WMS 반품 프로세스

---

## 목차

1. [개요](#1-개요)
2. [반품 프로세스](#2-반품-프로세스)
3. [테이블 설계](#3-테이블-설계)
4. [테이블 관계도](#4-테이블-관계도)
5. [상태 관리](#5-상태-관리)
6. [인덱스 전략](#6-인덱스-전략)
7. [비즈니스 규칙](#7-비즈니스-규칙)
8. [구현 가이드](#8-구현-가이드)

---

## 1. 개요

### 1.1 반품 (RWA - Return Warehouse Authorization)

**정의**: 고객 또는 내부에서 제품을 창고로 반입하여 검수하고 재고로 복원하거나 처분하는 프로세스

**반품 유형**:
| 반품 유형 | 코드 | 설명 |
|----------|------|------|
| 고객 반품 | `CUSTOMER_RETURN` | 고객이 구매한 제품을 반품 |
| 공급업체 반품 | `VENDOR_RETURN` | 입고된 불량품을 공급업체로 반송 |
| 재고 조정 반품 | `STOCK_ADJUST` | 내부 재고 조정을 위한 반품 |
| 불량품 반품 | `DEFECT_RETURN` | 품질 문제로 인한 반품 |
| 유통기한 임박 | `EXPIRED_RETURN` | 유통기한 임박 제품 반품 |

### 1.2 설계 원칙

1. **기존 구조 참조**: `receivings`, `receiving_items` 구조와 일관성 유지
2. **멀티 테넌시**: 모든 테이블에 `domain_id` 포함
3. **상태 관리**: 반품 프로세스 단계별 상태 추적
4. **검수 품질**: 반품 검수 및 처분 결정 지원
5. **재고 연동**: 재고 복원 또는 차감 자동화

### 1.3 테이블 구성

| 테이블 | 설명 | 관계 |
|--------|------|------|
| `rwa_orders` | 반품 지시 헤더 | 1:N → rwa_order_items |
| `rwa_order_items` | 반품 지시 상세 | N:1 → rwa_orders |
| `rwa_inspections` | 반품 검수 기록 | N:1 → rwa_order_items |
| `rwa_dispositions` | 반품 처분 결정 | 1:1 → rwa_order_items |

---

## 2. 반품 프로세스

### 2.1 표준 반품 프로세스

```
1. 반품 요청 (RWA 생성)
   ↓
2. 반품 승인
   ↓
3. 반품 접수 (입고)
   ↓
4. 반품 검수
   ↓
5. 처분 결정
   ├─ 재입고 (양품)
   ├─ 폐기 (불량)
   ├─ 수리/재가공
   └─ 공급업체 반송
   ↓
6. 재고 처리
   ├─ 재고 복원
   └─ 재고 차감
```

### 2.2 상태 전이도

```
[REQUEST] 반품 요청
    ↓
[APPROVED] 승인됨
    ↓
[RECEIVING] 입고 중
    ↓
[INSPECTING] 검수 중
    ↓
[INSPECTED] 검수 완료
    ↓
[DISPOSED] 처분 완료
    ↓
[COMPLETED] 완료
    ↓
[CLOSED] 마감

※ [REJECTED] 거부 (요청 단계에서)
※ [CANCELLED] 취소 (승인 전)
```

---

## 3. 테이블 설계

### 3.1 rwa_orders — 반품 지시 (헤더)

**설명**: 반품 지시의 헤더 정보를 관리

**Lifecycle**:
- `@PrePersist`: `rwa_no` 미설정 시 자동 채번 (`RWA-YYYYMMDD-XXXXX`)
- `@PreUpdate`: 상태 자동 계산

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| rwaNo | rwa_no | VARCHAR | N | 30 | 반품 번호 (UNIQUE) |
| rwaReqNo | rwa_req_no | VARCHAR | Y | 30 | 반품 요청 번호 (외부 시스템) |
| rwaReqDate | rwa_req_date | VARCHAR | N | 10 | 반품 요청 일자 |
| rwaEndDate | rwa_end_date | VARCHAR | Y | 10 | 반품 완료 일자 |
| status | status | VARCHAR | Y | 20 | 상태 (REQUEST/APPROVED/RECEIVING/INSPECTING/INSPECTED/DISPOSED/COMPLETED/CLOSED) |
| rwaType | rwa_type | VARCHAR | N | 30 | 반품 유형 (CUSTOMER_RETURN/VENDOR_RETURN/DEFECT_RETURN/STOCK_ADJUST/EXPIRED_RETURN) |
| whCd | wh_cd | VARCHAR | Y | 20 | 창고 코드 |
| comCd | com_cd | VARCHAR | Y | 20 | 화주사 코드 |
| vendCd | vend_cd | VARCHAR | Y | 20 | 공급사 코드 (공급업체 반품 시) |
| custCd | cust_cd | VARCHAR | Y | 30 | 고객 코드 (고객 반품 시) |
| custNm | cust_nm | VARCHAR | Y | 100 | 고객명 |
| orderNo | order_no | VARCHAR | Y | 30 | 원 주문 번호 (고객 반품 시) |
| invoiceNo | invoice_no | VARCHAR | Y | 30 | 인보이스 번호 |
| mgrId | mgr_id | VARCHAR | Y | 32 | 담당자 ID |
| inspFlag | insp_flag | BOOLEAN | Y | - | 검수 여부 (default: true) |
| qcFlag | qc_flag | BOOLEAN | Y | - | 품질검사 필요 여부 |
| totalBox | total_box | INTEGER | Y | - | 총 박스 수 |
| totalPallet | total_pallet | INTEGER | Y | - | 총 팔레트 수 |
| returnReason | return_reason | VARCHAR | Y | 50 | 반품 사유 코드 |
| returnReasonDesc | return_reason_desc | VARCHAR | Y | 500 | 반품 사유 상세 |
| carNo | car_no | VARCHAR | Y | 30 | 차량 번호 |
| driverNm | driver_nm | VARCHAR | Y | 40 | 운전자 명 |
| driverTel | driver_tel | VARCHAR | Y | 20 | 운전자 전화 |
| approvedBy | approved_by | VARCHAR | Y | 32 | 승인자 ID |
| approvedAt | approved_at | DATETIME | Y | - | 승인 일시 |
| inspectedBy | inspected_by | VARCHAR | Y | 32 | 검수자 ID |
| inspectedAt | inspected_at | DATETIME | Y | - | 검수 완료 일시 |
| disposedBy | disposed_by | VARCHAR | Y | 32 | 처분 결정자 ID |
| disposedAt | disposed_at | DATETIME | Y | - | 처분 완료 일시 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01 | attr01 | VARCHAR | Y | 100 | 확장 필드 1 |
| attr02 | attr02 | VARCHAR | Y | 100 | 확장 필드 2 |
| attr03 | attr03 | VARCHAR | Y | 100 | 확장 필드 3 |
| attr04 | attr04 | VARCHAR | Y | 100 | 확장 필드 4 |
| attr05 | attr05 | VARCHAR | Y | 100 | 확장 필드 5 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_rwa_orders_0 ON rwa_orders (rwa_no, domain_id);
CREATE INDEX ix_rwa_orders_1 ON rwa_orders (com_cd, domain_id);
CREATE INDEX ix_rwa_orders_2 ON rwa_orders (wh_cd, domain_id);
CREATE INDEX ix_rwa_orders_3 ON rwa_orders (com_cd, status, domain_id);
CREATE INDEX ix_rwa_orders_4 ON rwa_orders (rwa_req_date, com_cd, domain_id);
CREATE INDEX ix_rwa_orders_5 ON rwa_orders (rwa_type, com_cd, domain_id);
CREATE INDEX ix_rwa_orders_6 ON rwa_orders (order_no, com_cd, domain_id);
CREATE INDEX ix_rwa_orders_7 ON rwa_orders (cust_cd, com_cd, domain_id);
CREATE INDEX ix_rwa_orders_8 ON rwa_orders (vend_cd, com_cd, domain_id);
```

---

### 3.2 rwa_order_items — 반품 지시 상세

**설명**: 반품 지시의 상세 항목 (SKU별 수량 등)

**Lifecycle**:
- `@PrePersist`: `rwa_seq` 자동 채번 (`MAX(rwa_seq) + 1`), SKU 명 자동 조회
- `@PreUpdate`: 상태 자동 계산, 수량 검증

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| rwaOrderId | rwa_order_id | VARCHAR | N | 40 | FK → rwa_orders.id |
| rwaSeq | rwa_seq | INTEGER | N | - | 반품 순번 (자동 채번) |
| status | status | VARCHAR | Y | 20 | 상태 (REQUEST/APPROVED/RECEIVING/INSPECTED/DISPOSED/COMPLETED) |
| skuCd | sku_cd | VARCHAR | N | 30 | 상품 코드 |
| skuNm | sku_nm | VARCHAR | Y | 255 | 상품명 (자동 조회) |
| rwaReqQty | rwa_req_qty | DOUBLE | N | - | 반품 요청 수량 |
| rwaQty | rwa_qty | DOUBLE | Y | - | 반품 실적 수량 |
| goodQty | good_qty | DOUBLE | Y | - | 양품 수량 (검수 후) |
| defectQty | defect_qty | DOUBLE | Y | - | 불량 수량 (검수 후) |
| disposedQty | disposed_qty | DOUBLE | Y | - | 처분 완료 수량 |
| boxQty | box_qty | INTEGER | Y | - | 박스 수 |
| palletQty | pallet_qty | INTEGER | Y | - | 팔레트 수 |
| locCd | loc_cd | VARCHAR | Y | 20 | 입고 로케이션 코드 |
| tempLocCd | temp_loc_cd | VARCHAR | Y | 20 | 임시 보관 로케이션 |
| finalLocCd | final_loc_cd | VARCHAR | Y | 20 | 최종 로케이션 (재입고 시) |
| itemType | item_type | VARCHAR | Y | 20 | 아이템 유형 |
| lotNo | lot_no | VARCHAR | Y | 30 | 로트 번호 |
| expiredDate | expired_date | VARCHAR | Y | 10 | 유통기한 |
| prdDate | prd_date | VARCHAR | Y | 10 | 제조일자 |
| barcode | barcode | VARCHAR | Y | 40 | 바코드 |
| origOrderNo | orig_order_no | VARCHAR | Y | 30 | 원 주문 번호 |
| origOrderSeq | orig_order_seq | INTEGER | Y | - | 원 주문 순번 |
| returnReason | return_reason | VARCHAR | Y | 50 | 반품 사유 코드 |
| defectType | defect_type | VARCHAR | Y | 30 | 불량 유형 (검수 시) |
| defectDesc | defect_desc | VARCHAR | Y | 500 | 불량 상세 설명 |
| dispositionType | disposition_type | VARCHAR | Y | 30 | 처분 유형 (RESTOCK/SCRAP/REPAIR/RETURN_VENDOR) |
| dispositionReason | disposition_reason | VARCHAR | Y | 500 | 처분 사유 |
| inspectedQty | inspected_qty | DOUBLE | Y | - | 검수 완료 수량 |
| inspectedBy | inspected_by | VARCHAR | Y | 32 | 검수자 ID |
| inspectedAt | inspected_at | DATETIME | Y | - | 검수 일시 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01 | attr01 | VARCHAR | Y | 100 | 확장 필드 1 |
| attr02 | attr02 | VARCHAR | Y | 100 | 확장 필드 2 |
| attr03 | attr03 | VARCHAR | Y | 100 | 확장 필드 3 |
| attr04 | attr04 | VARCHAR | Y | 100 | 확장 필드 4 |
| attr05 | attr05 | VARCHAR | Y | 100 | 확장 필드 5 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_rwa_order_items_0 ON rwa_order_items (rwa_order_id, rwa_seq, domain_id);
CREATE INDEX ix_rwa_order_items_1 ON rwa_order_items (rwa_order_id, domain_id);
CREATE INDEX ix_rwa_order_items_2 ON rwa_order_items (sku_cd, domain_id);
CREATE INDEX ix_rwa_order_items_3 ON rwa_order_items (status, domain_id);
CREATE INDEX ix_rwa_order_items_4 ON rwa_order_items (orig_order_no, domain_id);
CREATE INDEX ix_rwa_order_items_5 ON rwa_order_items (lot_no, domain_id);
CREATE INDEX ix_rwa_order_items_6 ON rwa_order_items (disposition_type, domain_id);
```

---

### 3.3 rwa_inspections — 반품 검수 기록

**설명**: 반품 검수 상세 기록 (선택적, 품질 검사가 중요한 경우 사용)

**Lifecycle**:
- `@PrePersist`: `insp_seq` 자동 채번
- 검수 후 `rwa_order_items`의 `good_qty`, `defect_qty` 자동 업데이트

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| rwaOrderItemId | rwa_order_item_id | VARCHAR | N | 40 | FK → rwa_order_items.id |
| inspSeq | insp_seq | INTEGER | N | - | 검수 순번 (자동 채번) |
| inspType | insp_type | VARCHAR | Y | 20 | 검수 유형 (VISUAL/FUNCTIONAL/FULL) |
| inspBy | insp_by | VARCHAR | N | 32 | 검수자 ID |
| inspAt | insp_at | DATETIME | N | - | 검수 일시 |
| inspQty | insp_qty | DOUBLE | N | - | 검수 수량 |
| goodQty | good_qty | DOUBLE | N | - | 양품 수량 |
| defectQty | defect_qty | DOUBLE | N | - | 불량 수량 |
| defectType | defect_type | VARCHAR | Y | 30 | 불량 유형 (DAMAGED/EXPIRED/WRONG_ITEM/MISSING_PARTS/FUNCTIONAL_DEFECT) |
| defectGrade | defect_grade | VARCHAR | Y | 10 | 불량 등급 (A/B/C) |
| defectDesc | defect_desc | VARCHAR | Y | 1000 | 불량 상세 설명 |
| photoUrl | photo_url | VARCHAR | Y | 500 | 불량 사진 URL |
| inspResult | insp_result | VARCHAR | Y | 20 | 검수 결과 (PASS/FAIL/PARTIAL) |
| disposition | disposition | VARCHAR | Y | 30 | 처분 권고 (RESTOCK/SCRAP/REPAIR/RETURN_VENDOR) |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_rwa_inspections_0 ON rwa_inspections (rwa_order_item_id, insp_seq, domain_id);
CREATE INDEX ix_rwa_inspections_1 ON rwa_inspections (insp_by, domain_id);
CREATE INDEX ix_rwa_inspections_2 ON rwa_inspections (insp_at, domain_id);
CREATE INDEX ix_rwa_inspections_3 ON rwa_inspections (defect_type, domain_id);
```

---

### 3.4 rwa_dispositions — 반품 처분 결정

**설명**: 반품 항목의 최종 처분 결정 및 재고 처리 기록

**Lifecycle**:
- `@PrePersist`: 처분 유형별 재고 자동 처리
- 처분 완료 시 `rwa_order_items.disposition_type`, `disposed_qty` 자동 업데이트

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| rwaOrderItemId | rwa_order_item_id | VARCHAR | N | 40 | FK → rwa_order_items.id (UNIQUE) |
| dispositionType | disposition_type | VARCHAR | N | 30 | 처분 유형 (RESTOCK/SCRAP/REPAIR/RETURN_VENDOR/DONATION) |
| dispositionQty | disposition_qty | DOUBLE | N | - | 처분 수량 |
| restockLocCd | restock_loc_cd | VARCHAR | Y | 20 | 재입고 로케이션 (RESTOCK 시) |
| restockBy | restock_by | VARCHAR | Y | 32 | 재입고 처리자 |
| restockAt | restock_at | DATETIME | Y | - | 재입고 일시 |
| scrapLocCd | scrap_loc_cd | VARCHAR | Y | 20 | 폐기 로케이션 (SCRAP 시) |
| scrapBy | scrap_by | VARCHAR | Y | 32 | 폐기 처리자 |
| scrapAt | scrap_at | DATETIME | Y | - | 폐기 일시 |
| scrapMethod | scrap_method | VARCHAR | Y | 30 | 폐기 방법 (INCINERATION/LANDFILL/RECYCLE) |
| repairVendCd | repair_vend_cd | VARCHAR | Y | 30 | 수리 업체 코드 (REPAIR 시) |
| repairCost | repair_cost | DOUBLE | Y | - | 수리 비용 |
| repairStatus | repair_status | VARCHAR | Y | 20 | 수리 상태 (REQUESTED/IN_REPAIR/COMPLETED) |
| returnShipNo | return_ship_no | VARCHAR | Y | 30 | 반송 운송장 번호 (RETURN_VENDOR 시) |
| returnCarrier | return_carrier | VARCHAR | Y | 30 | 반송 운송사 |
| returnShippedAt | return_shipped_at | DATETIME | Y | - | 반송 발송 일시 |
| stockImpactFlag | stock_impact_flag | BOOLEAN | Y | - | 재고 영향 여부 (default: true) |
| stockTxnId | stock_txn_id | VARCHAR | Y | 40 | 재고 트랜잭션 ID (참조) |
| disposedBy | disposed_by | VARCHAR | N | 32 | 처분 결정자 ID |
| disposedAt | disposed_at | DATETIME | N | - | 처분 결정 일시 |
| dispositionReason | disposition_reason | VARCHAR | Y | 500 | 처분 사유 |
| financialImpact | financial_impact | DOUBLE | Y | - | 재무 영향 금액 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_rwa_dispositions_0 ON rwa_dispositions (rwa_order_item_id, domain_id);
CREATE INDEX ix_rwa_dispositions_1 ON rwa_dispositions (disposition_type, domain_id);
CREATE INDEX ix_rwa_dispositions_2 ON rwa_dispositions (disposed_at, domain_id);
CREATE INDEX ix_rwa_dispositions_3 ON rwa_dispositions (stock_txn_id, domain_id);
CREATE INDEX ix_rwa_dispositions_4 ON rwa_dispositions (repair_status, domain_id);
```

---

## 4. 테이블 관계도

```
┌────────────────────┐
│   rwa_orders       │ (반품 지시 헤더)
│ - id (PK)          │
│ - rwa_no           │
│ - status           │
│ - rwa_type         │
└────────┬───────────┘
         │ 1:N
         ▼
┌────────────────────┐
│ rwa_order_items    │ (반품 지시 상세)
│ - id (PK)          │
│ - rwa_order_id (FK)│
│ - sku_cd           │
│ - rwa_req_qty      │
│ - rwa_qty          │
│ - good_qty         │
│ - defect_qty       │
└────┬───────────┬───┘
     │ 1:N       │ 1:1
     ▼           ▼
┌────────────────┐ ┌────────────────────┐
│ rwa_inspections│ │ rwa_dispositions   │
│ - id (PK)      │ │ - id (PK)          │
│ - rwa_order_   │ │ - rwa_order_item_id│
│   item_id (FK) │ │   (FK, UNIQUE)     │
│ - insp_result  │ │ - disposition_type │
└────────────────┘ │ - disposition_qty  │
                   │ - stock_txn_id     │
                   └────────────────────┘
                            │
                            │ 참조
                            ▼
                   ┌────────────────────┐
                   │   inventories      │ (재고 테이블)
                   │ - stock_txn_id     │
                   └────────────────────┘
```

---

## 5. 상태 관리

### 5.1 rwa_orders 상태

| 상태 | 코드 | 설명 | 다음 가능 상태 |
|------|------|------|---------------|
| 반품 요청 | REQUEST | 반품 요청 접수 | APPROVED, REJECTED, CANCELLED |
| 승인됨 | APPROVED | 반품 승인 완료 | RECEIVING, CANCELLED |
| 입고 중 | RECEIVING | 반품 입고 진행 중 | INSPECTING |
| 검수 중 | INSPECTING | 반품 검수 진행 중 | INSPECTED |
| 검수 완료 | INSPECTED | 검수 완료 | DISPOSED |
| 처분 완료 | DISPOSED | 처분 결정 완료 | COMPLETED |
| 완료 | COMPLETED | 반품 처리 완료 | CLOSED |
| 마감 | CLOSED | 최종 마감 | - |
| 거부됨 | REJECTED | 반품 요청 거부 | - |
| 취소됨 | CANCELLED | 반품 취소 | - |

### 5.2 rwa_order_items 상태

| 상태 | 코드 | 설명 |
|------|------|------|
| 요청 | REQUEST | 반품 요청 |
| 승인 | APPROVED | 승인됨 |
| 입고 중 | RECEIVING | 입고 진행 중 |
| 검수 완료 | INSPECTED | 검수 완료 |
| 처분 완료 | DISPOSED | 처분 완료 |
| 완료 | COMPLETED | 처리 완료 |

### 5.3 처분 유형 (disposition_type)

| 유형 | 코드 | 설명 | 재고 영향 |
|------|------|------|----------|
| 재입고 | RESTOCK | 양품으로 판정, 재고 복원 | 재고 증가 (+) |
| 폐기 | SCRAP | 불량품 폐기 | 재고 영향 없음 |
| 수리 | REPAIR | 수리 후 재입고 | 재고 보류 → 증가 |
| 공급업체 반송 | RETURN_VENDOR | 공급업체로 반송 | 재고 영향 없음 |
| 기부 | DONATION | 기부 처리 | 재고 감소 (-) |

---

## 6. 인덱스 전략

### 6.1 성능 최적화 인덱스

**조회 성능**:
```sql
-- 반품 목록 조회 (화주사, 상태별)
CREATE INDEX ix_rwa_orders_status ON rwa_orders (com_cd, status, rwa_req_date, domain_id);

-- 원 주문 번호로 반품 추적
CREATE INDEX ix_rwa_order_items_orig_order ON rwa_order_items (orig_order_no, com_cd, domain_id);

-- SKU별 반품 집계
CREATE INDEX ix_rwa_order_items_sku ON rwa_order_items (sku_cd, rwa_req_date, domain_id);
```

**비즈니스 검색**:
```sql
-- 고객별 반품 이력
CREATE INDEX ix_rwa_orders_customer ON rwa_orders (cust_cd, rwa_req_date, domain_id);

-- 공급업체별 반품 (불량품 반송)
CREATE INDEX ix_rwa_orders_vendor ON rwa_orders (vend_cd, rwa_type, domain_id);

-- 처분 유형별 집계
CREATE INDEX ix_rwa_dispositions_type ON rwa_dispositions (disposition_type, disposed_at, domain_id);
```

---

## 7. 비즈니스 규칙

### 7.1 반품 생성 규칙

1. **반품 번호 자동 채번**: `RWA-YYYYMMDD-XXXXX` 형식
2. **상태 초기화**: 생성 시 `REQUEST` 상태
3. **검수 필수**: 기본적으로 `insp_flag = true`
4. **화주사/창고 필수**: `com_cd`, `wh_cd` 필수 입력

### 7.2 검수 규칙

1. **검수 완료 조건**: `inspected_qty = rwa_qty`
2. **양품/불량 합계**: `good_qty + defect_qty = inspected_qty`
3. **검수 없이 처분 금지**: `insp_flag = true` 일 때 검수 완료 후 처분 가능
4. **검수자 기록**: 검수 시 `inspected_by`, `inspected_at` 필수 기록

### 7.3 처분 규칙

1. **처분 유형별 필수 필드**:
   - `RESTOCK`: `restock_loc_cd` 필수
   - `SCRAP`: `scrap_method` 필수
   - `REPAIR`: `repair_vend_cd` 필수
   - `RETURN_VENDOR`: `return_ship_no` 필수

2. **재고 영향**:
   - `RESTOCK`: 재고 증가 (`stock_impact_flag = true`)
   - `SCRAP`: 재고 영향 없음 (`stock_impact_flag = false`)
   - `REPAIR`: 수리 완료 시 재고 증가
   - `RETURN_VENDOR`: 재고 영향 없음

3. **처분 수량 검증**: `disposition_qty <= rwa_qty`

### 7.4 상태 전이 규칙

1. **순차 진행**: `REQUEST → APPROVED → RECEIVING → INSPECTING → INSPECTED → DISPOSED → COMPLETED → CLOSED`
2. **역행 불가**: 완료된 단계로 돌아갈 수 없음
3. **취소 가능**: `APPROVED` 전까지 취소 가능
4. **거부 가능**: `REQUEST` 상태에서만 거부 가능

---

## 8. 구현 가이드

### 8.1 엔티티 클래스 예시

**RwaOrder.java**:
```java
@Entity
@Table(name = "rwa_orders")
@Index(columnList = "rwa_no, domain_id", unique = true)
public class RwaOrder extends ElidomStampHook {
    @Id
    @GenerationRule(GenerationRuleConstants.UUID)
    @Column(name = "id", length = 40, nullable = false)
    private String id;

    @Column(name = "rwa_no", length = 30, nullable = false)
    private String rwaNo;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "rwa_type", length = 30, nullable = false)
    private String rwaType;

    @Column(name = "com_cd", length = 20)
    private String comCd;

    @Column(name = "wh_cd", length = 20)
    private String whCd;

    // ... 기타 필드

    @PrePersist
    public void onPrePersist() {
        if (ValueUtil.isEmpty(this.rwaNo)) {
            this.rwaNo = generateRwaNo();
        }
        if (ValueUtil.isEmpty(this.status)) {
            this.status = "REQUEST";
        }
    }

    private String generateRwaNo() {
        String dateStr = DateUtil.toString(new Date(), "yyyyMMdd");
        // Custom 서비스로 일련번호 채번
        return "RWA-" + dateStr + "-" + getNextSeq();
    }
}
```

**RwaOrderItem.java**:
```java
@Entity
@Table(name = "rwa_order_items")
@Index(columnList = "rwa_order_id, rwa_seq, domain_id", unique = true)
public class RwaOrderItem extends ElidomStampHook {
    @Id
    @GenerationRule(GenerationRuleConstants.UUID)
    @Column(name = "id", length = 40, nullable = false)
    private String id;

    @Column(name = "rwa_order_id", length = 40, nullable = false)
    private String rwaOrderId;

    @Column(name = "rwa_seq", nullable = false)
    private Integer rwaSeq;

    @Column(name = "sku_cd", length = 30, nullable = false)
    private String skuCd;

    @Column(name = "rwa_req_qty", nullable = false)
    private Double rwaReqQty;

    @Column(name = "good_qty")
    private Double goodQty;

    @Column(name = "defect_qty")
    private Double defectQty;

    // ... 기타 필드

    @PrePersist
    public void onPrePersist() {
        if (ValueUtil.isNot Zero(this.rwaSeq)) {
            this.rwaSeq = getNextRwaSeq();
        }
    }
}
```

### 8.2 서비스 구현 예시

**RwaTransactionService.java**:
```java
@Service
public class RwaTransactionService {

    /**
     * 반품 지시 생성
     */
    public RwaOrder createRwaOrder(RwaOrder rwaOrder) {
        // 1. 반품 번호 자동 채번
        // 2. 상태 초기화
        // 3. 검증
        validateRwaOrder(rwaOrder);

        // 4. 저장
        return this.queryManager.insert(rwaOrder);
    }

    /**
     * 반품 검수 처리
     */
    @Transactional
    public RwaInspection inspectRwaItem(String rwaOrderItemId, RwaInspection inspection) {
        // 1. 반품 항목 조회
        RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, rwaOrderItemId);

        // 2. 검수 기록 저장
        inspection.setRwaOrderItemId(rwaOrderItemId);
        this.queryManager.insert(inspection);

        // 3. 반품 항목 수량 업데이트
        item.setGoodQty(item.getGoodQty() + inspection.getGoodQty());
        item.setDefectQty(item.getDefectQty() + inspection.getDefectQty());
        item.setInspectedQty(item.getGoodQty() + item.getDefectQty());
        item.setStatus("INSPECTED");
        this.queryManager.update(item);

        return inspection;
    }

    /**
     * 반품 처분 처리
     */
    @Transactional
    public RwaDisposition disposeRwaItem(String rwaOrderItemId, RwaDisposition disposition) {
        // 1. 반품 항목 조회
        RwaOrderItem item = this.queryManager.select(RwaOrderItem.class, rwaOrderItemId);

        // 2. 처분 결정 저장
        disposition.setRwaOrderItemId(rwaOrderItemId);
        this.queryManager.insert(disposition);

        // 3. 처분 유형별 재고 처리
        processStockByDispositionType(item, disposition);

        // 4. 반품 항목 상태 업데이트
        item.setDispositionType(disposition.getDispositionType());
        item.setDisposedQty(disposition.getDispositionQty());
        item.setStatus("DISPOSED");
        this.queryManager.update(item);

        return disposition;
    }

    /**
     * 처분 유형별 재고 처리
     */
    private void processStockByDispositionType(RwaOrderItem item, RwaDisposition disposition) {
        switch (disposition.getDispositionType()) {
            case "RESTOCK":
                // 재고 증가 (양품 재입고)
                restockInventory(item, disposition);
                break;
            case "SCRAP":
                // 폐기 처리 (재고 영향 없음)
                scrapInventory(item, disposition);
                break;
            case "REPAIR":
                // 수리 후 재입고 (보류)
                repairInventory(item, disposition);
                break;
            case "RETURN_VENDOR":
                // 공급업체 반송 (재고 영향 없음)
                returnToVendor(item, disposition);
                break;
        }
    }
}
```

### 8.3 API 엔드포인트 예시

**RwaTransactionController.java**:
```java
@RestController
@RequestMapping("rwa_trx")
public class RwaTransactionController {

    @Autowired
    private RwaTransactionService rwaService;

    /**
     * 반품 지시 생성
     */
    @PostMapping("/rwa_orders")
    public RwaOrder createRwaOrder(@RequestBody RwaOrder rwaOrder) {
        return this.rwaService.createRwaOrder(rwaOrder);
    }

    /**
     * 반품 검수
     */
    @PostMapping("/rwa_orders/{id}/items/{itemId}/inspect")
    public RwaInspection inspectItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @RequestBody RwaInspection inspection) {
        return this.rwaService.inspectRwaItem(itemId, inspection);
    }

    /**
     * 반품 처분
     */
    @PostMapping("/rwa_orders/{id}/items/{itemId}/dispose")
    public RwaDisposition disposeItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @RequestBody RwaDisposition disposition) {
        return this.rwaService.disposeRwaItem(itemId, disposition);
    }

    /**
     * 반품 목록 조회
     */
    @GetMapping("/rwa_orders")
    public List<RwaOrder> listRwaOrders(
            @RequestParam(required = false) String comCd,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String rwaType) {
        return this.rwaService.listRwaOrders(comCd, status, rwaType);
    }
}
```

---

## 9. 참고 문서

- [database-specification.md](database-specification.md) - 기존 데이터베이스 명세
- [requirements.md](../requirement/requirements.md) - 업무 요구사항
- [api-list.md](../implementation/api-list.md) - API 명세서

---

**작성자**: HatioLab 개발팀
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-03-12
