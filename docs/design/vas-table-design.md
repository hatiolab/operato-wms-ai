# 유통가공(VAS) 테이블 설계

> 작성일: 2026-03-17
> 기준: Operato WMS 표준 + 표준 WMS 유통가공 프로세스

---

## 목차

1. [개요](#1-개요)
2. [유통가공 프로세스](#2-유통가공-프로세스)
3. [테이블 설계](#3-테이블-설계)
4. [테이블 관계도](#4-테이블-관계도)
5. [상태 관리](#5-상태-관리)
6. [인덱스 전략](#6-인덱스-전략)
7. [비즈니스 규칙](#7-비즈니스-규칙)
8. [구현 가이드](#8-구현-가이드)
9. [참고 문서](#9-참고-문서)

---

## 1. 개요

### 1.1 유통가공 (VAS - Value-Added Service)

**정의**: BOM(Bill of Materials) 기반으로 개별 상품을 세트 상품으로 구성(Assembly)하거나, 세트 상품을 개별 상품으로 해체(Disassembly)하며, 재포장/라벨링 등 부가 작업을 수행하는 프로세스

**유통가공 유형**:
| 유통가공 유형 | 코드 | 설명 |
|-------------|------|------|
| 세트 구성 | `SET_ASSEMBLY` | BOM 기준 개별 상품 → 세트 상품 조립 |
| 세트 해체 | `DISASSEMBLY` | 세트 상품 → 개별 상품 분리 |
| 재포장 | `REPACK` | 포장 변경 또는 재포장 작업 |
| 라벨링 | `LABEL` | 라벨 부착 또는 교체 작업 |
| 기타 가공 | `CUSTOM` | 고객 요청에 따른 기타 부가 작업 |

### 1.2 설계 원칙

1. **BOM 마스터 관리**: 세트 상품의 구성 정보를 사전에 등록하여 반복 활용
2. **멀티 테넌시**: 모든 테이블에 `domain_id` 포함
3. **상태 관리**: 유통가공 프로세스 단계별 상태 추적
4. **수량 추적**: 계획 수량, 배정 수량, 피킹 수량, 사용 수량, 완성 수량 단계별 추적
5. **재고 연동**: 자재 출고(차감) 및 완성품 입고(증가) 자동화

### 1.3 테이블 구성

| 테이블 | 설명 | 관계 |
|--------|------|------|
| `vas_boms` | BOM 마스터 (세트 상품 정의) | 1:N → vas_bom_items |
| `vas_bom_items` | BOM 구성 품목 | N:1 → vas_boms |
| `vas_orders` | 유통가공 작업 지시 (헤더) | 1:N → vas_order_items, 1:N → vas_results |
| `vas_order_items` | 유통가공 작업 지시 상세 | N:1 → vas_orders |
| `vas_results` | 유통가공 실적 | N:1 → vas_orders |

---

## 2. 유통가공 프로세스

### 2.1 표준 유통가공 프로세스

```
1. BOM 마스터 등록 (사전 준비)
   ↓
2. 유통가공 작업 지시 생성 (계획)
   ↓
3. 작업 지시 승인
   ↓
4. 자재 배정 및 피킹 지시
   ├─ 자재 로케이션 할당
   └─ 피킹 작업 (PDA)
   ↓
5. 자재 준비 완료
   ↓
6. 유통가공 작업 수행
   ├─ 세트 구성 (Assembly)
   ├─ 세트 해체 (Disassembly)
   ├─ 재포장 (Repack)
   └─ 라벨링 (Label)
   ↓
7. 실적 등록
   ├─ 완성품 수량 등록
   └─ 불량 수량 등록
   ↓
8. 재고 처리
   ├─ 자재 재고 차감
   └─ 완성품 재고 증가
   ↓
9. 작업 완료
   ↓
10. 마감
```

### 2.2 상태 전이도

```
[PLAN] 계획
    ↓
[APPROVED] 승인됨
    ↓
[MATERIAL_READY] 자재 준비 완료
    ↓
[IN_PROGRESS] 작업 중
    ↓
[COMPLETED] 완료
    ↓
[CLOSED] 마감

※ [CANCELLED] 취소 (승인 전)
```

---

## 3. 테이블 설계

### 3.1 vas_boms — BOM 마스터 (세트 상품 정의)

**설명**: 세트 상품의 구성 정보(BOM)를 관리하는 마스터 테이블

**Lifecycle**:
- `@PrePersist`: `bom_no` 미설정 시 자동 채번 (`BOM-YYYYMMDD-XXXXX`), 상태 기본값 `ACTIVE`
- `@PreUpdate`: `component_count`, `total_component_qty` 자동 계산

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| bomNo | bom_no | VARCHAR | N | 30 | BOM 번호 (UNIQUE) |
| setSkuCd | set_sku_cd | VARCHAR | N | 30 | 세트 상품 코드 |
| setSkuNm | set_sku_nm | VARCHAR | Y | 255 | 세트 상품명 (자동 조회) |
| vasType | vas_type | VARCHAR | N | 30 | 유통가공 유형 (SET_ASSEMBLY/DISASSEMBLY/REPACK/LABEL/CUSTOM) |
| status | status | VARCHAR | Y | 20 | 상태 (ACTIVE/INACTIVE) |
| comCd | com_cd | VARCHAR | N | 20 | 화주사 코드 |
| whCd | wh_cd | VARCHAR | Y | 20 | 창고 코드 |
| componentCount | component_count | INTEGER | Y | - | 구성 품목 수 (자동 계산) |
| totalComponentQty | total_component_qty | DOUBLE | Y | - | 세트 1개당 총 자재 수량 (자동 계산) |
| validFrom | valid_from | VARCHAR | Y | 10 | 유효 시작일 (YYYY-MM-DD) |
| validTo | valid_to | VARCHAR | Y | 10 | 유효 종료일 (YYYY-MM-DD) |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01 | attr01 | VARCHAR | Y | 100 | 확장 필드 1 |
| attr02 | attr02 | VARCHAR | Y | 100 | 확장 필드 2 |
| attr03 | attr03 | VARCHAR | Y | 100 | 확장 필드 3 |
| attr04 | attr04 | VARCHAR | Y | 100 | 확장 필드 4 |
| attr05 | attr05 | VARCHAR | Y | 100 | 확장 필드 5 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_vas_boms_0 ON vas_boms (bom_no, domain_id);
CREATE UNIQUE INDEX ix_vas_boms_1 ON vas_boms (com_cd, set_sku_cd, domain_id);
CREATE INDEX ix_vas_boms_2 ON vas_boms (com_cd, domain_id);
CREATE INDEX ix_vas_boms_3 ON vas_boms (com_cd, vas_type, domain_id);
CREATE INDEX ix_vas_boms_4 ON vas_boms (com_cd, status, domain_id);
CREATE INDEX ix_vas_boms_5 ON vas_boms (wh_cd, domain_id);
```

---

### 3.2 vas_bom_items — BOM 구성 품목

**설명**: BOM(세트 상품) 구성 품목의 상세 정보를 관리

**Lifecycle**:
- `@PrePersist`: `bom_seq` 자동 채번 (`MAX(bom_seq) + 1`), SKU 명 자동 조회
- 생성/삭제 후 `vas_boms`의 `component_count`, `total_component_qty` 자동 업데이트

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| vasBomId | vas_bom_id | VARCHAR | N | 40 | FK → vas_boms.id |
| bomSeq | bom_seq | INTEGER | N | - | 순번 (자동 채번) |
| skuCd | sku_cd | VARCHAR | N | 30 | 구성 상품 코드 |
| skuNm | sku_nm | VARCHAR | Y | 255 | 구성 상품명 (자동 조회) |
| componentQty | component_qty | DOUBLE | N | - | 세트 1개당 필요 수량 |
| unit | unit | VARCHAR | Y | 10 | 단위 (EA/BOX/SET 등) |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_vas_bom_items_0 ON vas_bom_items (vas_bom_id, bom_seq, domain_id);
CREATE INDEX ix_vas_bom_items_1 ON vas_bom_items (vas_bom_id, domain_id);
CREATE INDEX ix_vas_bom_items_2 ON vas_bom_items (sku_cd, domain_id);
```

---

### 3.3 vas_orders — 유통가공 작업 지시 (헤더)

**설명**: 유통가공 작업 지시의 헤더 정보를 관리

**Lifecycle**:
- `@PrePersist`: `vas_no` 미설정 시 자동 채번 (`VAS-YYYYMMDD-XXXXX`), 상태 기본값 `PLAN`
- `@PreUpdate`: 상태 자동 계산

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| vasNo | vas_no | VARCHAR | N | 30 | 유통가공 번호 (UNIQUE) |
| vasReqNo | vas_req_no | VARCHAR | Y | 30 | 외부 요청 번호 (고객사 연동) |
| vasReqDate | vas_req_date | VARCHAR | N | 10 | 요청 일자 (YYYY-MM-DD) |
| vasEndDate | vas_end_date | VARCHAR | Y | 10 | 완료 일자 (YYYY-MM-DD) |
| status | status | VARCHAR | Y | 20 | 상태 (PLAN/APPROVED/MATERIAL_READY/IN_PROGRESS/COMPLETED/CLOSED/CANCELLED) |
| vasType | vas_type | VARCHAR | N | 30 | 유통가공 유형 (SET_ASSEMBLY/DISASSEMBLY/REPACK/LABEL/CUSTOM) |
| vasBomId | vas_bom_id | VARCHAR | Y | 40 | FK → vas_boms.id (BOM 참조) |
| comCd | com_cd | VARCHAR | N | 20 | 화주사 코드 |
| whCd | wh_cd | VARCHAR | Y | 20 | 창고 코드 |
| workLocCd | work_loc_cd | VARCHAR | Y | 20 | 유통가공장 로케이션 코드 |
| planQty | plan_qty | DOUBLE | N | - | 계획 세트 수량 |
| completedQty | completed_qty | DOUBLE | Y | - | 완성 수량 |
| mgrId | mgr_id | VARCHAR | Y | 32 | 담당자 ID |
| workerId | worker_id | VARCHAR | Y | 32 | 작업자 ID |
| priority | priority | VARCHAR | Y | 10 | 우선순위 (HIGH/NORMAL/LOW) |
| plannedStartAt | planned_start_at | DATETIME | Y | - | 계획 시작 일시 |
| plannedEndAt | planned_end_at | DATETIME | Y | - | 계획 종료 일시 |
| startedAt | started_at | DATETIME | Y | - | 실제 작업 시작 일시 |
| completedAt | completed_at | DATETIME | Y | - | 실제 작업 완료 일시 |
| approvedBy | approved_by | VARCHAR | Y | 32 | 승인자 ID |
| approvedAt | approved_at | DATETIME | Y | - | 승인 일시 |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01 | attr01 | VARCHAR | Y | 100 | 확장 필드 1 |
| attr02 | attr02 | VARCHAR | Y | 100 | 확장 필드 2 |
| attr03 | attr03 | VARCHAR | Y | 100 | 확장 필드 3 |
| attr04 | attr04 | VARCHAR | Y | 100 | 확장 필드 4 |
| attr05 | attr05 | VARCHAR | Y | 100 | 확장 필드 5 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_vas_orders_0 ON vas_orders (vas_no, domain_id);
CREATE INDEX ix_vas_orders_1 ON vas_orders (com_cd, domain_id);
CREATE INDEX ix_vas_orders_2 ON vas_orders (wh_cd, domain_id);
CREATE INDEX ix_vas_orders_3 ON vas_orders (com_cd, status, domain_id);
CREATE INDEX ix_vas_orders_4 ON vas_orders (vas_req_date, com_cd, domain_id);
CREATE INDEX ix_vas_orders_5 ON vas_orders (vas_type, com_cd, domain_id);
CREATE INDEX ix_vas_orders_6 ON vas_orders (vas_bom_id, domain_id);
CREATE INDEX ix_vas_orders_7 ON vas_orders (priority, status, domain_id);
CREATE INDEX ix_vas_orders_8 ON vas_orders (worker_id, status, domain_id);
```

---

### 3.4 vas_order_items — 유통가공 작업 지시 상세

**설명**: 유통가공 작업에 필요한 자재별 상세 정보를 관리 (BOM 구성 품목 × 계획 수량으로 자동 생성)

**Lifecycle**:
- `@PrePersist`: `vas_seq` 자동 채번, SKU 명 자동 조회, `req_qty` 계산 검증
- `@PreUpdate`: 수량 검증 (`picked_qty <= alloc_qty <= req_qty`)

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| vasOrderId | vas_order_id | VARCHAR | N | 40 | FK → vas_orders.id |
| vasSeq | vas_seq | INTEGER | N | - | 순번 (자동 채번) |
| skuCd | sku_cd | VARCHAR | N | 30 | 구성 상품 코드 (자재) |
| skuNm | sku_nm | VARCHAR | Y | 255 | 구성 상품명 (자동 조회) |
| reqQty | req_qty | DOUBLE | N | - | 소요 수량 (= plan_qty × component_qty) |
| allocQty | alloc_qty | DOUBLE | Y | - | 배정 수량 |
| pickedQty | picked_qty | DOUBLE | Y | - | 피킹 완료 수량 |
| usedQty | used_qty | DOUBLE | Y | - | 사용 수량 (실제 작업에 투입된 수량) |
| lossQty | loss_qty | DOUBLE | Y | - | 손실 수량 |
| srcLocCd | src_loc_cd | VARCHAR | Y | 20 | 자재 피킹 로케이션 |
| workLocCd | work_loc_cd | VARCHAR | Y | 20 | 작업 로케이션 |
| lotNo | lot_no | VARCHAR | Y | 30 | 로트 번호 |
| expiredDate | expired_date | VARCHAR | Y | 10 | 유통기한 (YYYY-MM-DD) |
| status | status | VARCHAR | Y | 20 | 상태 (PLANNED/ALLOCATED/PICKING/PICKED/IN_USE/COMPLETED) |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |
| attr01 | attr01 | VARCHAR | Y | 100 | 확장 필드 1 |
| attr02 | attr02 | VARCHAR | Y | 100 | 확장 필드 2 |
| attr03 | attr03 | VARCHAR | Y | 100 | 확장 필드 3 |
| attr04 | attr04 | VARCHAR | Y | 100 | 확장 필드 4 |
| attr05 | attr05 | VARCHAR | Y | 100 | 확장 필드 5 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_vas_order_items_0 ON vas_order_items (vas_order_id, vas_seq, domain_id);
CREATE INDEX ix_vas_order_items_1 ON vas_order_items (vas_order_id, domain_id);
CREATE INDEX ix_vas_order_items_2 ON vas_order_items (sku_cd, domain_id);
CREATE INDEX ix_vas_order_items_3 ON vas_order_items (status, domain_id);
CREATE INDEX ix_vas_order_items_4 ON vas_order_items (lot_no, domain_id);
CREATE INDEX ix_vas_order_items_5 ON vas_order_items (src_loc_cd, domain_id);
```

---

### 3.5 vas_results — 유통가공 실적

**설명**: 유통가공 작업 완료 후의 실적 기록 (완성품 및 불량품 수량)

**Lifecycle**:
- `@PrePersist`: `result_seq` 자동 채번, `worked_at` 기본값 현재 일시
- `@PostPersist`: `vas_orders.completed_qty` 자동 업데이트, 재고 처리 트리거

| Java Field | 컬럼 | 타입 | Null | 길이 | 설명 |
|-----------|------|------|------|------|------|
| id | id | VARCHAR | N | 40 | PK, UUID |
| vasOrderId | vas_order_id | VARCHAR | N | 40 | FK → vas_orders.id |
| resultSeq | result_seq | INTEGER | N | - | 실적 순번 (자동 채번) |
| resultType | result_type | VARCHAR | N | 30 | 실적 유형 (ASSEMBLY/DISASSEMBLY) |
| setSkuCd | set_sku_cd | VARCHAR | N | 30 | 완성품 코드 (세트 상품 코드) |
| setSkuNm | set_sku_nm | VARCHAR | Y | 255 | 완성품명 |
| resultQty | result_qty | DOUBLE | N | - | 완성 수량 |
| defectQty | defect_qty | DOUBLE | Y | - | 불량 수량 |
| destLocCd | dest_loc_cd | VARCHAR | Y | 20 | 적치 로케이션 (완성품 보관 위치) |
| lotNo | lot_no | VARCHAR | Y | 30 | 로트 번호 |
| workerId | worker_id | VARCHAR | Y | 32 | 작업자 ID |
| workedAt | worked_at | DATETIME | N | - | 작업 일시 |
| stockTxnId | stock_txn_id | VARCHAR | Y | 40 | 재고 트랜잭션 ID (재고 처리 후 참조) |
| remarks | remarks | VARCHAR | Y | 1000 | 비고 |

**인덱스**:
```sql
CREATE UNIQUE INDEX ix_vas_results_0 ON vas_results (vas_order_id, result_seq, domain_id);
CREATE INDEX ix_vas_results_1 ON vas_results (vas_order_id, domain_id);
CREATE INDEX ix_vas_results_2 ON vas_results (set_sku_cd, domain_id);
CREATE INDEX ix_vas_results_3 ON vas_results (worker_id, domain_id);
CREATE INDEX ix_vas_results_4 ON vas_results (worked_at, domain_id);
CREATE INDEX ix_vas_results_5 ON vas_results (stock_txn_id, domain_id);
```

---

## 4. 테이블 관계도

```
┌────────────────────┐
│   vas_boms         │ (BOM 마스터)
│ - id (PK)          │
│ - bom_no           │
│ - set_sku_cd       │
│ - vas_type         │
│ - status           │
└────────┬───────────┘
         │ 1:N
         ▼
┌────────────────────┐
│ vas_bom_items      │ (BOM 구성 품목)
│ - id (PK)          │
│ - vas_bom_id (FK)  │
│ - sku_cd           │
│ - component_qty    │
└────────────────────┘

         ※ vas_orders.vas_bom_id → vas_boms.id (참조)

┌────────────────────┐
│   vas_orders       │ (유통가공 작업 지시)
│ - id (PK)          │
│ - vas_no           │
│ - vas_bom_id (FK)  │←── vas_boms.id
│ - status           │
│ - plan_qty         │
│ - completed_qty    │
└────┬───────────┬───┘
     │ 1:N       │ 1:N
     ▼           ▼
┌────────────────┐ ┌────────────────────┐
│ vas_order_items│ │ vas_results        │
│ - id (PK)      │ │ - id (PK)          │
│ - vas_order_id │ │ - vas_order_id (FK)│
│   (FK)         │ │ - result_type      │
│ - sku_cd       │ │ - result_qty       │
│ - req_qty      │ │ - defect_qty       │
│ - used_qty     │ │ - set_sku_cd       │
└────────────────┘ │ - stock_txn_id     │
                   └────────┬───────────┘
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

### 5.1 vas_boms 상태

| 상태 | 코드 | 설명 |
|------|------|------|
| 활성 | ACTIVE | BOM 사용 가능 |
| 비활성 | INACTIVE | BOM 사용 중지 |

### 5.2 vas_orders 상태

| 상태 | 코드 | 설명 | 다음 가능 상태 |
|------|------|------|---------------|
| 계획 | PLAN | 작업 계획 등록 | APPROVED, CANCELLED |
| 승인됨 | APPROVED | 작업 지시 승인 | MATERIAL_READY, CANCELLED |
| 자재 준비 완료 | MATERIAL_READY | 자재 피킹 완료, 작업 가능 | IN_PROGRESS |
| 작업 중 | IN_PROGRESS | 유통가공 작업 진행 중 | COMPLETED |
| 완료 | COMPLETED | 작업 완료, 실적 등록 완료 | CLOSED |
| 마감 | CLOSED | 최종 마감 | - |
| 취소됨 | CANCELLED | 작업 지시 취소 | - |

### 5.3 vas_order_items 상태

| 상태 | 코드 | 설명 |
|------|------|------|
| 계획됨 | PLANNED | 소요 수량 계산 완료 |
| 배정됨 | ALLOCATED | 재고 배정 완료 |
| 피킹 중 | PICKING | 자재 피킹 진행 중 |
| 피킹 완료 | PICKED | 자재 피킹 완료 |
| 사용 중 | IN_USE | 작업에 투입 중 |
| 완료 | COMPLETED | 자재 사용 완료 |

### 5.4 유통가공 유형별 재고 영향

| 유형 | 코드 | 자재 재고 | 완성품 재고 |
|------|------|----------|-----------|
| 세트 구성 | SET_ASSEMBLY | 차감 (-) | 증가 (+) |
| 세트 해체 | DISASSEMBLY | 증가 (+) | 차감 (-) |
| 재포장 | REPACK | 차감 (-) | 증가 (+) |
| 라벨링 | LABEL | 변동 없음 | 변동 없음 |
| 기타 가공 | CUSTOM | 경우에 따라 결정 | 경우에 따라 결정 |

---

## 6. 인덱스 전략

### 6.1 성능 최적화 인덱스

**조회 성능**:
```sql
-- 작업 지시 목록 조회 (화주사, 상태별)
CREATE INDEX ix_vas_orders_status ON vas_orders (com_cd, status, vas_req_date, domain_id);

-- BOM 기준 작업 지시 추적
CREATE INDEX ix_vas_orders_bom ON vas_orders (vas_bom_id, com_cd, domain_id);

-- SKU별 자재 소요 집계
CREATE INDEX ix_vas_order_items_sku ON vas_order_items (sku_cd, status, domain_id);
```

**비즈니스 검색**:
```sql
-- 우선순위별 작업 목록
CREATE INDEX ix_vas_orders_priority ON vas_orders (priority, status, vas_req_date, domain_id);

-- 작업자별 실적 이력
CREATE INDEX ix_vas_results_worker ON vas_results (worker_id, worked_at, domain_id);

-- 완성품별 실적 집계
CREATE INDEX ix_vas_results_set_sku ON vas_results (set_sku_cd, worked_at, domain_id);

-- BOM 마스터 세트 상품 검색
CREATE INDEX ix_vas_boms_set_sku ON vas_boms (com_cd, set_sku_cd, status, domain_id);
```

---

## 7. 비즈니스 규칙

### 7.1 BOM 생성 규칙

1. **BOM 번호 자동 채번**: `BOM-YYYYMMDD-XXXXX` 형식
2. **상태 초기화**: 생성 시 `ACTIVE` 상태
3. **화주사 필수**: `com_cd` 필수 입력
4. **세트 상품 코드 유일성**: 동일 `com_cd` + `set_sku_cd` 조합은 유일해야 함
5. **구성 품목 최소 1개**: BOM에는 최소 1개 이상의 구성 품목이 있어야 함
6. **자기 참조 금지**: `set_sku_cd`와 `vas_bom_items.sku_cd`가 동일할 수 없음
7. **유효기간 검증**: `valid_from <= valid_to`

### 7.2 작업 지시 생성 규칙

1. **작업 번호 자동 채번**: `VAS-YYYYMMDD-XXXXX` 형식
2. **상태 초기화**: 생성 시 `PLAN` 상태
3. **화주사 필수**: `com_cd` 필수 입력
4. **BOM 참조**: `SET_ASSEMBLY` 또는 `DISASSEMBLY` 유형은 `vas_bom_id` 필수
5. **BOM 유효성**: 참조하는 BOM의 `status`가 `ACTIVE`이고, 유효기간 내여야 함
6. **계획 수량 검증**: `plan_qty > 0`
7. **자재 자동 전개**: 작업 지시 생성 시 BOM 구성 품목 기반으로 `vas_order_items` 자동 생성 (`req_qty = plan_qty × component_qty`)

### 7.3 작업 규칙

1. **자재 준비 완료 조건**: 모든 `vas_order_items`의 `picked_qty >= req_qty`
2. **작업 시작 조건**: 상태가 `MATERIAL_READY`일 때만 작업 시작 가능
3. **수량 검증**: `used_qty <= picked_qty`, `loss_qty <= used_qty`
4. **실적 등록 조건**: 상태가 `IN_PROGRESS`일 때만 실적 등록 가능

### 7.4 완료 규칙

1. **완료 조건**: `completed_qty >= plan_qty` (또는 모든 실적 등록 완료)
2. **재고 처리**:
   - ASSEMBLY: 자재 재고 차감 (`used_qty`만큼) + 완성품 재고 증가 (`result_qty`만큼)
   - DISASSEMBLY: 세트 상품 재고 차감 + 개별 상품 재고 증가
3. **불량 처리**: `defect_qty`는 재고에 반영하지 않음 (별도 불량 재고 또는 폐기 처리)
4. **손실 처리**: `loss_qty`는 재고 차감 처리 (자재 손실분)

### 7.5 상태 전이 규칙

1. **순차 진행**: `PLAN → APPROVED → MATERIAL_READY → IN_PROGRESS → COMPLETED → CLOSED`
2. **역행 불가**: 완료된 단계로 돌아갈 수 없음
3. **취소 가능**: `APPROVED` 전까지 취소 가능
4. **자재 준비 자동 전이**: 모든 `vas_order_items`가 `PICKED` 상태가 되면 헤더를 `MATERIAL_READY`로 자동 전환

---

## 8. 구현 가이드

### 8.1 엔티티 클래스 예시

**VasBom.java**:
```java
@Table(name = "vas_boms", idStrategy = GenerationRule.UUID, uniqueFields = "bomNo,domainId", indexes = {
    @Index(name = "ix_vas_boms_0", columnList = "bom_no,domain_id", unique = true),
    @Index(name = "ix_vas_boms_1", columnList = "com_cd,set_sku_cd,domain_id", unique = true),
    @Index(name = "ix_vas_boms_2", columnList = "com_cd,domain_id"),
    @Index(name = "ix_vas_boms_3", columnList = "com_cd,vas_type,domain_id"),
    @Index(name = "ix_vas_boms_4", columnList = "com_cd,status,domain_id"),
    @Index(name = "ix_vas_boms_5", columnList = "wh_cd,domain_id")
})
public class VasBom extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    @Column(name = "bom_no", nullable = false, length = 30)
    private String bomNo;

    @Column(name = "set_sku_cd", nullable = false, length = 30)
    private String setSkuCd;

    @Column(name = "set_sku_nm", length = 255)
    private String setSkuNm;

    @Column(name = "vas_type", nullable = false, length = 30)
    private String vasType;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "com_cd", nullable = false, length = 20)
    private String comCd;

    // ... 기타 필드

    @Override
    public void beforeCreate() {
        super.beforeCreate();

        if (this.status == null) {
            this.status = WmsVasConstants.BOM_STATUS_ACTIVE;
        }

        if (ValueUtil.isEmpty(this.bomNo)) {
            String dateStr = DateUtil.todayStr("yyyyMMdd");
            // TODO: 일련번호 채번 서비스 구현 필요
            this.bomNo = this.bomNo;
        }
    }
}
```

**VasOrder.java**:
```java
@Table(name = "vas_orders", idStrategy = GenerationRule.UUID, uniqueFields = "vasNo,domainId", indexes = {
    @Index(name = "ix_vas_orders_0", columnList = "vas_no,domain_id", unique = true),
    @Index(name = "ix_vas_orders_1", columnList = "com_cd,domain_id"),
    @Index(name = "ix_vas_orders_2", columnList = "wh_cd,domain_id"),
    @Index(name = "ix_vas_orders_3", columnList = "com_cd,status,domain_id"),
    @Index(name = "ix_vas_orders_4", columnList = "vas_req_date,com_cd,domain_id"),
    @Index(name = "ix_vas_orders_5", columnList = "vas_type,com_cd,domain_id"),
    @Index(name = "ix_vas_orders_6", columnList = "vas_bom_id,domain_id"),
    @Index(name = "ix_vas_orders_7", columnList = "priority,status,domain_id"),
    @Index(name = "ix_vas_orders_8", columnList = "worker_id,status,domain_id")
})
public class VasOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    @Column(name = "vas_no", nullable = false, length = 30)
    private String vasNo;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "vas_type", nullable = false, length = 30)
    private String vasType;

    @Column(name = "vas_bom_id", length = 40)
    private String vasBomId;

    @Column(name = "com_cd", nullable = false, length = 20)
    private String comCd;

    @Column(name = "plan_qty", nullable = false)
    private Double planQty;

    @Column(name = "completed_qty")
    private Double completedQty;

    @Column(name = "priority", length = 10)
    private String priority;

    // ... 기타 필드

    @Override
    public void beforeCreate() {
        super.beforeCreate();

        if (this.status == null) {
            this.status = WmsVasConstants.STATUS_PLAN;
        }

        if (ValueUtil.isEmpty(this.vasNo)) {
            String dateStr = DateUtil.todayStr("yyyyMMdd");
            // TODO: 일련번호 채번 서비스 구현 필요
            this.vasNo = this.vasReqNo;
        }

        if (ValueUtil.isEmpty(this.vasReqDate)) {
            this.vasReqDate = DateUtil.todayStr();
        }

        if (this.completedQty == null) {
            this.completedQty = 0.0;
        }

        if (ValueUtil.isEmpty(this.priority)) {
            this.priority = WmsVasConstants.PRIORITY_NORMAL;
        }
    }
}
```

### 8.2 서비스 구현 예시

**VasTransactionService.java**:
```java
@Component
public class VasTransactionService extends AbstractQueryService {

    /**
     * 유통가공 작업 지시 생성 (BOM 기반 자재 자동 전개)
     */
    @Transactional
    public VasOrder createVasOrder(VasOrder vasOrder) {
        // 1. 필수 필드 검증
        this.validateVasOrder(vasOrder);

        // 2. BOM 유효성 검증 (SET_ASSEMBLY, DISASSEMBLY인 경우)
        if (vasOrder.getVasBomId() != null) {
            VasBom bom = this.queryManager.select(VasBom.class, vasOrder.getVasBomId());
            if (bom == null || !WmsVasConstants.BOM_STATUS_ACTIVE.equals(bom.getStatus())) {
                throw ThrowUtil.newValidationErrorWithNoLog("유효한 BOM이 아닙니다.");
            }
        }

        // 3. 작업 지시 생성
        this.queryManager.insert(vasOrder);

        // 4. BOM 기반 자재 전개 (vas_bom_items → vas_order_items)
        if (vasOrder.getVasBomId() != null) {
            this.expandBomToOrderItems(vasOrder);
        }

        return vasOrder;
    }

    /**
     * BOM 기반 자재 전개
     */
    private void expandBomToOrderItems(VasOrder vasOrder) {
        Query query = new Query();
        query.addFilter("domainId", vasOrder.getDomainId());
        query.addFilter("vasBomId", vasOrder.getVasBomId());
        query.addOrder("bomSeq", true);

        List<VasBomItem> bomItems = this.queryManager.selectList(VasBomItem.class, query);

        for (VasBomItem bomItem : bomItems) {
            VasOrderItem orderItem = new VasOrderItem();
            orderItem.setDomainId(vasOrder.getDomainId());
            orderItem.setVasOrderId(vasOrder.getId());
            orderItem.setSkuCd(bomItem.getSkuCd());
            orderItem.setSkuNm(bomItem.getSkuNm());
            orderItem.setReqQty(vasOrder.getPlanQty() * bomItem.getComponentQty());
            orderItem.setStatus(WmsVasConstants.ITEM_STATUS_PLANNED);
            this.queryManager.insert(orderItem);
        }
    }

    /**
     * 작업 지시 승인
     */
    @Transactional
    public VasOrder approveVasOrder(String vasOrderId, String approvedBy) {
        VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
        if (!WmsVasConstants.STATUS_PLAN.equals(vasOrder.getStatus())) {
            throw ThrowUtil.newValidationErrorWithNoLog("승인 가능한 상태가 아닙니다.");
        }
        vasOrder.setStatus(WmsVasConstants.STATUS_APPROVED);
        vasOrder.setApprovedBy(approvedBy);
        vasOrder.setApprovedAt(new java.util.Date());
        this.queryManager.update(vasOrder, "status", "approvedBy", "approvedAt");
        return vasOrder;
    }

    /**
     * 실적 등록
     */
    @Transactional
    public VasResult registerResult(String vasOrderId, VasResult result) {
        VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
        if (!WmsVasConstants.STATUS_IN_PROGRESS.equals(vasOrder.getStatus())) {
            throw ThrowUtil.newValidationErrorWithNoLog("실적 등록 가능한 상태가 아닙니다.");
        }

        result.setVasOrderId(vasOrderId);
        result.setDomainId(vasOrder.getDomainId());
        this.queryManager.insert(result);

        // completed_qty 누적 업데이트
        double currentCompleted = vasOrder.getCompletedQty() != null ? vasOrder.getCompletedQty() : 0.0;
        vasOrder.setCompletedQty(currentCompleted + result.getResultQty());
        this.queryManager.update(vasOrder, "completedQty");

        // TODO: 재고 처리 로직
        // processInventoryByVasType(vasOrder, result);

        return result;
    }

    /**
     * 작업 완료
     */
    @Transactional
    public VasOrder completeVasOrder(String vasOrderId) {
        VasOrder vasOrder = this.queryManager.select(VasOrder.class, vasOrderId);
        if (!WmsVasConstants.STATUS_IN_PROGRESS.equals(vasOrder.getStatus())) {
            throw ThrowUtil.newValidationErrorWithNoLog("완료 가능한 상태가 아닙니다.");
        }
        vasOrder.setStatus(WmsVasConstants.STATUS_COMPLETED);
        vasOrder.setCompletedAt(new java.util.Date());
        vasOrder.setVasEndDate(DateUtil.todayStr());
        this.queryManager.update(vasOrder, "status", "completedAt", "vasEndDate");
        return vasOrder;
    }
}
```

### 8.3 API 엔드포인트 예시

**VasBomController.java** (CRUD):
```java
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/vas_boms")
@ServiceDesc(description = "VAS BOM Service API")
public class VasBomController extends AbstractRestService {

    @Override
    protected Class<?> entityClass() {
        return VasBom.class;
    }

    // GET    /rest/vas_boms              — 목록 조회 (페이징)
    // GET    /rest/vas_boms/{id}         — 단건 조회
    // POST   /rest/vas_boms              — 생성
    // PUT    /rest/vas_boms/{id}         — 수정
    // DELETE /rest/vas_boms/{id}         — 삭제
    // POST   /rest/vas_boms/update_multiple — 일괄 생성/수정/삭제

    // GET    /rest/vas_boms/{id}/items   — BOM 구성 품목 조회
    // POST   /rest/vas_boms/{id}/items/update_multiple — BOM 구성 품목 일괄 수정
}
```

**VasTransactionController.java** (트랜잭션):
```java
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/vas_trx")
@ServiceDesc(description = "VAS Transaction Service API")
public class VasTransactionController extends AbstractRestService {

    @Autowired
    private VasTransactionService vasService;

    // POST /rest/vas_trx/vas_orders                 — 작업 지시 생성 (BOM 자재 자동 전개)
    // POST /rest/vas_trx/vas_orders/{id}/approve    — 작업 지시 승인
    // POST /rest/vas_trx/vas_orders/{id}/start      — 작업 시작
    // POST /rest/vas_trx/vas_orders/{id}/results    — 실적 등록
    // POST /rest/vas_trx/vas_orders/{id}/complete   — 작업 완료
    // POST /rest/vas_trx/vas_orders/{id}/close      — 작업 마감
    // POST /rest/vas_trx/vas_orders/{id}/cancel     — 작업 취소
}
```

---

## 9. 참고 문서

- [database-specification.md](database-specification.md) - 기존 데이터베이스 명세
- [rwa-table-design.md](rwa-table-design.md) - 반품 테이블 설계 (참조)
- [requirements.md](../requirement/requirements.md) - 업무 요구사항
- [api-list.md](../implementation/api-list.md) - API 명세서

---

**작성자**: HatioLab 개발팀
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-03-17
