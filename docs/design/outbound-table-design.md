# 출고 모듈 설계 문서

> 작성일: 2026-03-22
> 대상: 중소 풀필먼트 창고 (일 100~5,000건, B2C 중심, 소량 다품종)

---

## 목차

1. [개요](#1-개요)
2. [표준 출고 프로세스](#2-표준-출고-프로세스)
3. [상태 전이 다이어그램](#3-상태-전이-다이어그램)
4. [테이블 설계](#4-테이블-설계)
5. [ER 다이어그램](#5-er-다이어그램)
6. [공통코드 및 상수](#6-공통코드-및-상수)
7. [주요 설정값](#7-주요-설정값)
8. [API 목록](#8-api-목록)
9. [재고 연동](#9-재고-연동)
10. [중소 풀필먼트 운영 가이드](#10-중소-풀필먼트-운영-가이드)

---

## 1. 개요

### 1.1 중소 풀필먼트 창고 특성

| 항목 | 특성 |
|------|------|
| 일 출고량 | 100 ~ 5,000건 |
| 주력 채널 | B2C (택배 배송) 80%, B2B (납품) 20% |
| 상품 특성 | 소량 다품종, 낱개(EA) 단위 출고 중심 |
| 작업 인력 | 5~30명 |
| 설비 | PDA 기반 수작업, 일부 DPS 연계 가능 |
| 피킹 방식 | 토탈 피킹 (상품별) + 오더 피킹 (주문별) |

### 1.2 지원 업무 유형

| 업무 유형 | 코드 | 설명 |
|----------|------|------|
| B2C 출고 | `B2C_OUT` | 개인 소비자 대상 택배 출고 |
| B2B 출고 | `B2B_OUT` | 기업 대상 납품 출고 |
| B2C 반품 출고 | `B2C_RTN` | 소비자 반품에 대한 재출고 |
| B2B 반품 출고 | `B2B_RTN` | 기업 반품에 대한 재출고 |

### 1.3 출고 유형

| 출고 유형 | 코드 | 설명 |
|----------|------|------|
| 일반 출고 | `NORMAL` | 표준 판매 출고 |
| 반품 출고 | `RETURN` | 반품 후 재출고 |
| 창고 이동 | `TRANSFER` | 타 창고로 이동 출고 |
| 폐기 | `SCRAP` | 폐기 처리용 출고 |
| 기타 | `ETC` | 기타 목적 출고 |

### 1.4 테이블 구성 요약

| # | 테이블 | 설명 | 유형 |
|---|--------|------|------|
| 1 | `release_orders` | 출고 지시 (헤더) | 실테이블 |
| 2 | `release_order_items` | 출고 지시 상세 | 실테이블 |
| 3 | `picking_orders` | 피킹 지시 (헤더) | 실테이블 |
| 4 | `picking_order_items` | 피킹 지시 상세 | 실테이블 |
| 5 | `waves` | 웨이브 | 실테이블 |
| 6 | `delivery_infos` | 배송 정보 | 실테이블 |
| 7 | `supply_orders` | 보충 지시 (헤더) | 실테이블 |
| 8 | `supply_order_items` | 보충 지시 상세 | 실테이블 |
| 9 | `release_order_status` | 출고 현황 뷰 | 뷰 (DB View) |
| 10 | `outbound_orders` | 출고 주문 뷰 | 뷰 (ignoreDdl) |
| 11 | `import_release_orders` | 임포트 스테이징 | 임포트 모델 |

---

## 2. 표준 출고 프로세스

### 2.1 B2C 출고 프로세스 (택배)

**특징**: 개인 소비자 대상 소량 다품종 출고. 합포장, 복수 주문 처리. DPS 연계 가능.

```
[SO 수신/접수 (API or Excel)]                   ← importReleaseOrders()
    ↓
[주문 확정 (REG → REQ)]                          ← requestReleaseOrder()
    ↓
[주문 유형 분석/대상 분류]                        ← classifyReleaseOrders()
    ├─ Single (낱개 1EA, 동일 패턴)
    └─ Complex (합포장, 복수 주문)
    ↓
[출고 접수 (REQ → WAIT)]                         ← acceptSingleReleaseOrder()
    ↓
[보충 지시 (선택)] ─→ [보충 지시서 출력] ─→ [보충 확정]
    ↓
[재고 할당/피킹 예약 (WAIT → READY)]             ← reserveForPicking()
    ↓
[웨이브 생성 + 피킹 지시 (READY → RUN)]         ← startSingleReleaseOrder()
    ↓                                                createPickingOrderByReleaseOrder()
[피킹 작업 (PDA)]                                ← pickPickingOrderItem()
    ↓
[피킹 완료 (PICKED)]                             ← closePickingOrder()
    ↓
[스캔 검수] ─→ [운송장 등록]
    ↓
[최종 출고 확정 (END)]                           ← closeReleaseOrder()
                                                    finalReleaseInventories()
```

**작업 횟수**: 총 3회 (보충, 피킹, 스캔 검수)

---

### 2.2 B2B 출고 프로세스 (납품)

**특징**: 기업 대상 대량 출고. 보충 지시 없이 직접 피킹 지시 가능.

```
[출고 예정 정보 등록 (API or Excel)]              ← importReleaseOrders()
    ↓
[주문 확정 (REG → REQ)]                          ← requestReleaseOrder()
    ↓
[출고 접수 (REQ → WAIT)]                         ← acceptSingleReleaseOrder()
    ↓
[보충 지시 (선택)] ─→ [보충 확정]
    ↓
[피킹 지시 (WAIT → READY → RUN)]                ← startSingleReleaseOrder()
    ↓
[피킹 작업 (PDA)]                                ← pickPickingOrderItem()
    ↓
[피킹 완료 → 출고 확정 (END)]                    ← closePickingOrder()
                                                    closeReleaseOrder()
```

---

### 2.3 간소화 프로세스 (중소 창고 권장)

소규모 창고에서는 불필요한 단계를 생략하여 운영 효율을 높일 수 있습니다.

```
[주문 접수 (Excel/API)]         ← importReleaseOrders()
    ↓
[주문 확정 + 접수]              ← requestReleaseOrder() → acceptSingleReleaseOrder()
    ↓
[피킹 지시 생성]                ← startSingleReleaseOrder()
    ↓
[PDA 피킹]                      ← pickPickingOrderItem()
    ↓
[출고 확정]                     ← closeReleaseOrder()
```

**생략 가능 항목**:
- **보충 지시**: 피킹존 = 보관존인 소규모 창고에서 불필요
- **웨이브**: 소량 주문 시 개별 출고로 충분
- **대상 분류**: 단일 유형 주문만 처리 시 불필요
- **스캔 검수**: 설정으로 ON/OFF 선택 가능

---

## 3. 상태 전이 다이어그램

### 3.1 출고 지시 (ReleaseOrder) 상태

```
REG ─→ REQ ─→ WAIT ─→ READY ─→ RUN ─→ PICKED ─→ END
 │       │       │        │       │        │
 │       │       │        │       │        └─── closeReleaseOrder()
 │       │       │        │       └──────────── pickPickingOrderItems()
 │       │       │        └──────────────────── startSingleReleaseOrder()
 │       │       └───────────────────────────── acceptSingleReleaseOrder()
 │       └───────────────────────────────────── requestReleaseOrder()
 └───────────────────────────────────────────── importReleaseOrders()

 * 어느 상태에서든 CANCEL 가능:
   cancelRequestReleaseOrder()  (REQ → REG)
   cancelAcceptSingleReleaseOrder()  (WAIT → REQ)
   cancelStartSingleReleaseOrder()  (RUN → WAIT)
   cancelReleaseOrder()  (→ CANCEL)
```

| 상태 | 코드 | 설명 |
|------|------|------|
| 등록 중 | `REG` | 주문 데이터 수신/등록 단계 |
| 출고 요청 | `REQ` | 출고 요청 확정, 검증 완료 |
| 출고 접수 | `WAIT` | 출고 접수 확인, 작업 대기 |
| 출고 지시 대기 | `READY` | 재고 할당 완료, 피킹 대기 |
| 출고 작업 중 | `RUN` | 피킹/출고 작업 진행 중 |
| 피킹 완료 | `PICKED` | 피킹 완료, 검수/출고 대기 |
| 출고 완료 | `END` | 최종 출고 확정, 재고 차감 |
| 출고 취소 | `CANCEL` | 출고 취소 |

### 3.2 피킹 지시 (PickingOrder) 상태

```
WAIT ─→ RUN ─→ END
  │       │
  │       └──── closePickingOrder()
  └──────────── startPickingOrder()

  * CANCEL: cancelPickingOrderByReleaseOrder()
```

| 상태 | 코드 | 설명 |
|------|------|------|
| 대기 | `WAIT` | 피킹 지시 생성, 작업 대기 |
| 작업 중 | `RUN` | 피킹 작업 진행 중 |
| 완료 | `END` | 피킹 완료 |
| 취소 | `CANCEL` | 피킹 취소 |

### 3.3 웨이브 (Wave) 상태

```
WAIT ─→ RUN ─→ END
  └── CANCEL ──┘
```

| 상태 | 코드 | 설명 |
|------|------|------|
| 대기 | `WAIT` | 웨이브 생성, 작업 대기 |
| 작업 중 | `RUN` | 웨이브 내 피킹 진행 중 |
| 완료 | `END` | 웨이브 내 모든 피킹 완료 |
| 취소 | `CANCEL` | 웨이브 취소 |

---

## 4. 테이블 설계

> 모든 테이블은 `ElidomStampHook`을 상속하여 `domain_id`, `created_at`, `created_by`, `updated_at`, `updated_by` 필드를 자동 포함합니다.

### 4.1 release_orders — 출고 지시 (헤더)

출고 주문의 헤더 정보. 1건의 출고 주문은 N건의 출고 상세 항목을 가진다.

**Lifecycle**:
- `@PrePersist` — `rls_req_no` 자동 채번 (`diy-generate-rls-ord-no`)
- `@PreDelete` — 연관 `release_order_items` 자동 삭제

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `rls_ord_no` | VARCHAR | N | 30 | 출고 주문 번호 |
| `rls_req_no` | VARCHAR | N | 30 | 출고 요청 번호 (자동 채번) |
| `rls_req_date` | VARCHAR | N | 10 | 출고 요청 일자 (YYYY-MM-DD) |
| `rls_ord_date` | VARCHAR | Y | 10 | 출고 지시 일자 (YYYY-MM-DD) |
| `wave_no` | VARCHAR | Y | 30 | 웨이브 번호 (FK → waves) |
| `com_cd` | VARCHAR | N | 30 | 화주사 코드 |
| `cust_cd` | VARCHAR | N | 30 | 고객사 코드 |
| `wh_cd` | VARCHAR | N | 30 | 창고 코드 |
| `biz_type` | VARCHAR | Y | 10 | 업무 유형 (B2C_OUT/B2B_OUT/B2C_RTN/B2B_RTN) |
| `rls_type` | VARCHAR | Y | 20 | 출고 유형 (NORMAL/RETURN/TRANSFER/SCRAP/ETC) |
| `rls_exe_type` | VARCHAR | Y | 20 | 실행 유형 (INDIVIDUAL/BATCH/EQUIPMENT) |
| `dlv_type` | VARCHAR | Y | 20 | 배송 유형 |
| `to_wh_cd` | VARCHAR | Y | 30 | 목적 창고 코드 (이동 출고 시) |
| `requester_id` | VARCHAR | Y | 36 | 요청자 ID |
| `po_no` | VARCHAR | Y | 30 | PO 번호 |
| `invoice_no` | VARCHAR | Y | 30 | 인보이스 번호 |
| `box_id` | VARCHAR | Y | 30 | 박스 ID |
| `box_seq` | INTEGER | Y | - | 박스 순번 |
| `box_type` | VARCHAR | Y | 20 | 박스 유형 |
| `total_box` | INTEGER | Y | - | 총 박스 수 |
| `box_wt` | DOUBLE | Y | - | 박스 무게 |
| `class_cd` | VARCHAR | Y | 50 | 분류 코드 |
| `report_no` | VARCHAR | Y | 40 | 보고서 번호 |
| `export_flag` | BOOLEAN | Y | - | 외부 출력 여부 |
| `label_template_cd` | VARCHAR | Y | 36 | 라벨 템플릿 코드 |
| `status` | VARCHAR | Y | 20 | 상태 (REG/REQ/WAIT/READY/RUN/PICKED/END/CANCEL) |
| `erp_status` | VARCHAR | Y | 20 | ERP 상태 |
| `started_at` | VARCHAR | Y | 20 | 시작 일시 |
| `finished_at` | VARCHAR | Y | 20 | 완료 일시 |
| `reported_at` | VARCHAR | Y | 20 | 보고 일시 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100~500 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_release_orders_0` | `domain_id, rls_req_no` | Y |
| `ix_release_orders_1` | `domain_id, rls_ord_no` | Y |
| `ix_release_orders_2` | `domain_id, rls_req_date, rls_ord_no, status, export_flag` | N |
| `ix_release_orders_3` | `domain_id, wave_no` | N |
| `ix_release_orders_4` | `domain_id, com_cd, wh_cd` | N |
| `ix_release_orders_5` | `domain_id, biz_type, rls_type, rls_exe_type, dlv_type` | N |
| `ix_release_orders_6` | `domain_id, po_no, invoice_no, box_id` | N |

---

### 4.2 release_order_items — 출고 지시 상세

출고 주문의 상세 항목. SKU 단위로 주문 수량, 출고 수량, 실적 수량을 관리.

**Lifecycle**:
- `@PrePersist` — `line_no` 자동 채번 (`MAX(line_no) + 1`)

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `release_order_id` | VARCHAR | N | 40 | FK → release_orders |
| `rank` | INTEGER | Y | - | 순위 |
| `rls_line_no` | VARCHAR | Y | 5 | 출고 라인 번호 |
| `line_no` | VARCHAR | N | 5 | 라인 번호 (자동 채번) |
| `rls_exp_seq` | INTEGER | Y | - | 출고 예정 순번 |
| `rls_seq` | INTEGER | Y | - | 출고 처리 순번 |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | - | 상품명 |
| `po_no` | VARCHAR | Y | 50 | PO 번호 |
| `do_no` | VARCHAR | Y | 50 | DO 번호 |
| `invoice_no` | VARCHAR | Y | 50 | 인보이스 번호 |
| `tot_ord_qty` | DOUBLE | Y | - | 총 주문 수량 |
| `ord_qty` | DOUBLE | N | - | 주문 수량 |
| `ord_pallet_qty` | DOUBLE | Y | - | 주문 팔레트 수 |
| `ord_box_qty` | DOUBLE | Y | - | 주문 박스 수 |
| `ord_ea_qty` | DOUBLE | Y | - | 주문 낱개 수 |
| `rls_qty` | DOUBLE | Y | - | 출고 수량 |
| `rpt_qty` | DOUBLE | Y | - | 실적 수량 |
| `expired_date` | VARCHAR | Y | 10 | 유통기한 |
| `prod_date` | VARCHAR | Y | 10 | 제조일자 |
| `lot_no` | VARCHAR | Y | 50 | 로트 번호 |
| `serial_no` | VARCHAR | Y | 50 | 시리얼 번호 |
| `barcode` | VARCHAR | Y | 50 | 바코드 |
| `zone_cd` | VARCHAR | Y | 30 | 구역 코드 |
| `loc_cd` | VARCHAR | Y | 30 | 로케이션 코드 |
| `pallet_cd` | VARCHAR | Y | 30 | 팔레트 코드 |
| `status` | VARCHAR | Y | 20 | 상태 (REG/REQ/WAIT/READY/RUN/PICKED/END/CANCEL) |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 |
|----------|------|
| `ix_release_order_items_0` | `domain_id, release_order_id` |
| `ix_release_order_items_1` | `domain_id, release_order_id, rls_line_no, line_no` |
| `ix_release_order_items_2` | `domain_id, release_order_id, sku_cd` |
| `ix_release_order_items_3` | `domain_id, release_order_id, po_no` |
| `ix_release_order_items_4` | `domain_id, release_order_id, invoice_no` |
| `ix_release_order_items_5` | `domain_id, release_order_id, lot_no` |
| `ix_release_order_items_6` | `domain_id, release_order_id, status` |
| `ix_release_order_items_7` | `domain_id, release_order_id, barcode` |

---

### 4.3 picking_orders — 피킹 지시 (헤더)

피킹 작업의 헤더 정보. 1건의 출고 주문에 대해 1건의 피킹 지시가 생성됨.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `pick_order_no` | VARCHAR | N | 30 | 피킹 지시 번호 (UNIQUE) |
| `order_seq` | INTEGER | N | - | 피킹 순번 |
| `wave_no` | VARCHAR | Y | 30 | 웨이브 번호 (FK → waves) |
| `order_date` | VARCHAR | N | 10 | 지시 일자 (YYYY-MM-DD) |
| `com_cd` | VARCHAR | N | 30 | 화주사 코드 |
| `wh_cd` | VARCHAR | N | 30 | 창고 코드 |
| `plan_order` | INTEGER | N | - | 계획 주문 수 |
| `plan_sku` | INTEGER | N | - | 계획 SKU 수 |
| `plan_pcs` | DOUBLE | N | - | 계획 수량 |
| `box_in_qty` | DOUBLE | Y | - | 박스 내 수량 |
| `plan_box` | INTEGER | Y | - | 계획 박스 수 |
| `plan_ea` | DOUBLE | Y | - | 계획 낱개 수 |
| `result_box` | INTEGER | Y | - | 실적 박스 수 |
| `result_pcs` | DOUBLE | Y | - | 실적 수량 |
| `progress_rate` | DOUBLE | Y | - | 진행률 (%) |
| `status` | VARCHAR | Y | 10 | 상태 (WAIT/RUN/END/CANCEL) |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_picking_orders_0` | `pick_order_no, domain_id` | Y |
| `ix_picking_orders_1` | `status, order_date, domain_id` | N |
| `ix_picking_orders_2` | `wave_no, domain_id` | N |
| `ix_picking_orders_3` | `wh_cd, com_cd, domain_id` | N |

---

### 4.4 picking_order_items — 피킹 지시 상세

피킹 작업의 상세 항목. 재고(Inventory)와 1:1 연결하여 어느 로케이션에서 어느 상품을 몇 개 피킹할지 지시.

**Lifecycle**:
- `@PrePersist` — 초기화 처리

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `pick_order_id` | VARCHAR | N | 40 | FK → picking_orders |
| `inventory_id` | VARCHAR | N | 40 | FK → inventories |
| `barcode` | VARCHAR | N | 30 | 재고 바코드 |
| `rank` | INTEGER | N | - | 피킹 순위 |
| `rls_line_no` | VARCHAR | Y | 5 | 출고 라인 번호 |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | - | 상품명 |
| `from_loc_cd` | VARCHAR | N | 30 | 피킹 출발 로케이션 |
| `to_loc_cd` | VARCHAR | N | 30 | 피킹 목적 로케이션 |
| `lot_no` | VARCHAR | Y | 50 | 로트 번호 |
| `serial_no` | VARCHAR | Y | 50 | 시리얼 번호 |
| `expired_date` | VARCHAR | Y | 20 | 유통기한 |
| `prod_date` | VARCHAR | Y | 20 | 제조일자 |
| `box_in_qty` | DOUBLE | Y | - | 박스 내 수량 |
| `order_qty` | DOUBLE | N | - | 주문 수량 |
| `order_box` | INTEGER | Y | - | 주문 박스 수 |
| `order_ea` | DOUBLE | Y | - | 주문 낱개 수 |
| `pick_qty` | DOUBLE | Y | - | 피킹 수량 |
| `pick_box` | INTEGER | Y | - | 피킹 박스 수 |
| `pick_ea` | DOUBLE | Y | - | 피킹 낱개 수 |
| `status` | VARCHAR | Y | 10 | 상태 (WAIT/RUN/END/CANCEL) |
| `remarks` | VARCHAR | Y | 1000 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 |
|----------|------|
| `ix_picking_order_items_0` | `domain_id, pick_order_id, rls_line_no` |
| `ix_picking_order_items_1` | `domain_id, pick_order_id, sku_cd` |
| `ix_picking_order_items_2` | `domain_id, pick_order_id, from_loc_cd` |
| `ix_picking_order_items_3` | `domain_id, pick_order_id, barcode` |
| `ix_picking_order_items_4` | `domain_id, pick_order_id, status` |
| `ix_picking_order_items_5` | `domain_id, pick_order_id, inventory_id` |

---

### 4.5 waves — 웨이브

동일 조건의 출고 주문을 묶어 한 번에 피킹 지시를 생성하는 그룹핑 단위.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `wave_no` | VARCHAR | N | 30 | 웨이브 번호 (UNIQUE) |
| `job_date` | VARCHAR | N | 10 | 작업 일자 (YYYY-MM-DD) |
| `job_seq` | VARCHAR | N | 10 | 작업 순번 |
| `com_cd` | VARCHAR | Y | 30 | 화주사 코드 |
| `wh_cd` | VARCHAR | Y | 30 | 창고 코드 |
| `wave_type` | VARCHAR | Y | 20 | 웨이브 유형 |
| `rls_type` | VARCHAR | Y | 20 | 출고 유형 |
| `rls_exe_type` | VARCHAR | Y | 20 | 실행 유형 |
| `export_flag` | BOOLEAN | Y | - | 외부 출력 여부 |
| `insp_flag` | BOOLEAN | Y | - | 검수 여부 |
| `label_template_cd` | VARCHAR | Y | 36 | 라벨 템플릿 코드 |
| `plan_order` | INTEGER | Y | - | 계획 주문 수 |
| `plan_sku` | INTEGER | Y | - | 계획 SKU 수 |
| `plan_pcs` | FLOAT | Y | - | 계획 수량 |
| `result_order` | INTEGER | Y | - | 실적 주문 수 |
| `result_sku` | INTEGER | Y | - | 실적 SKU 수 |
| `result_pcs` | FLOAT | Y | - | 실적 수량 |
| `status` | VARCHAR | Y | 20 | 상태 (WAIT/RUN/END/CANCEL) |
| `started_at` | VARCHAR | Y | 20 | 시작 일시 |
| `finished_at` | VARCHAR | Y | 20 | 완료 일시 |
| `reported_at` | VARCHAR | Y | 20 | 보고 일시 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_waves_0` | `domain_id, wave_no` | Y |
| `ix_waves_1` | `domain_id, job_date, job_seq` | N |
| `ix_waves_2` | `domain_id, job_date, com_cd, wh_cd` | N |
| `ix_waves_3` | `domain_id, job_date, rls_type` | N |
| `ix_waves_4` | `domain_id, job_date, export_flag, insp_flag` | N |
| `ix_waves_5` | `domain_id, job_date, status` | N |

---

### 4.6 delivery_infos — 배송 정보

출고 주문에 대한 발송인/주문자/수취인 배송 정보. 출고 주문과 1:1 관계.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `release_order_id` | VARCHAR | N | 40 | FK → release_orders (UNIQUE) |
| `rls_ord_no` | VARCHAR | N | 30 | 출고 주문 번호 (UNIQUE) |
| `dlv_type` | VARCHAR | Y | 20 | 배송 유형 |
| `export_flag` | BOOLEAN | Y | - | 수출 여부 |
| `dlv_vend_cd` | VARCHAR | Y | 30 | 택배사 코드 |
| `vehicle_no` | VARCHAR | Y | 30 | 차량 번호 |
| `dlv_no` | VARCHAR | Y | 30 | 배송 번호 |
| `invoice_no` | VARCHAR | Y | 30 | 송장 번호 |
| **발송인** | | | | |
| `sender_cd` | VARCHAR | Y | 30 | 발송인 코드 |
| `sender_nm` | VARCHAR | Y | 100 | 발송인 명 |
| `sender_phone` | VARCHAR | Y | 20 | 발송인 전화 |
| `sender_phone2` | VARCHAR | Y | 20 | 발송인 전화2 |
| `sender_zip_cd` | VARCHAR | Y | 20 | 발송인 우편번호 |
| `sender_addr` | VARCHAR | Y | - | 발송인 주소 |
| `sender_addr2` | VARCHAR | Y | - | 발송인 상세주소 |
| **주문자** | | | | |
| `orderer_cd` | VARCHAR | Y | 30 | 주문자 코드 |
| `orderer_nm` | VARCHAR | Y | 100 | 주문자 명 |
| **수취인** | | | | |
| `receiver_cd` | VARCHAR | Y | 30 | 수취인 코드 |
| `receiver_nm` | VARCHAR | Y | 100 | 수취인 명 |
| `receiver_phone` | VARCHAR | Y | 20 | 수취인 전화 |
| `receiver_phone2` | VARCHAR | Y | 20 | 수취인 전화2 |
| `receiver_zip_cd` | VARCHAR | Y | 20 | 수취인 우편번호 |
| `receiver_addr` | VARCHAR | Y | - | 수취인 주소 |
| `receiver_addr2` | VARCHAR | Y | - | 수취인 상세주소 |
| **기타** | | | | |
| `assort1_cd~3_cd` | VARCHAR | Y | 30 | 분류 코드 1~3 |
| `delivery_info_set` | VARCHAR | Y | 2000 | 배송 정보 세트 (JSON) |
| `memo` | VARCHAR | Y | 100 | 메모 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |
| `attr01~05` | VARCHAR | Y | 100 | 확장 필드 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_delivery_infos_0` | `release_order_id, domain_id` | Y |
| `ix_delivery_infos_1` | `rls_ord_no, domain_id` | Y |
| `ix_delivery_infos_2` | `dlv_type, domain_id` | N |
| `ix_delivery_infos_3` | `dlv_no, domain_id` | N |
| `ix_delivery_infos_4` | `invoice_no, domain_id` | N |
| `ix_delivery_infos_5` | `export_flag, domain_id` | N |

---

### 4.7 supply_orders — 보충 지시 (헤더)

피킹존 재고 부족 시 보관존에서 보충하는 지시 헤더.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `supply_order_no` | VARCHAR | N | 30 | 보충 지시 번호 (UNIQUE) |
| `wave_no` | VARCHAR | N | 30 | 웨이브 번호 (FK → waves) |
| `order_date` | VARCHAR | N | 10 | 지시 일자 |
| `com_cd` | VARCHAR | N | 30 | 화주사 코드 |
| `wh_cd` | VARCHAR | N | 30 | 창고 코드 |
| `plan_order` | INTEGER | N | - | 계획 주문 수 |
| `plan_sku` | INTEGER | N | - | 계획 SKU 수 |
| `plan_pcs` | DOUBLE | N | - | 계획 수량 |
| `result_pcs` | DOUBLE | N | - | 실적 수량 |
| `progress_rate` | VARCHAR | N | 30 | 진행률 |
| `status` | VARCHAR | N | 10 | 상태 |
| `remarks` | VARCHAR | N | 1000 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_supply_orders_0` | `supply_order_no, domain_id` | Y |
| `ix_supply_orders_1` | `wave_no, domain_id` | N |
| `ix_supply_orders_2` | `wh_cd, com_cd, order_date, domain_id` | N |
| `ix_supply_orders_3` | `status, order_date, domain_id` | N |

---

### 4.8 supply_order_items — 보충 지시 상세

보충 작업의 상세 항목. 어느 로케이션에서 어느 로케이션으로 얼마나 보충할지 지시.

| 컬럼명 | 타입 | Null | 길이 | 설명 |
|--------|------|------|------|------|
| `id` | VARCHAR | N | 40 | PK (UUID) |
| `supply_order_id` | VARCHAR | N | 40 | FK → supply_orders |
| `rank` | INTEGER | N | - | 순위 |
| `sku_cd` | VARCHAR | N | 30 | 상품 코드 |
| `sku_nm` | VARCHAR | Y | - | 상품명 |
| `from_loc_cd` | VARCHAR | N | 30 | 출발 로케이션 (보관존) |
| `to_loc_cd` | VARCHAR | N | 30 | 목적 로케이션 (피킹존) |
| `box_in_qty` | DOUBLE | Y | - | 박스 내 수량 |
| `order_qty` | DOUBLE | N | - | 주문 수량 |
| `order_box` | INTEGER | N | - | 주문 박스 수 |
| `order_ea` | DOUBLE | N | - | 주문 낱개 수 |
| `supply_qty` | DOUBLE | Y | - | 보충 수량 |
| `supply_box` | INTEGER | Y | - | 보충 박스 수 |
| `supply_ea` | DOUBLE | Y | - | 보충 낱개 수 |
| `remarks` | VARCHAR | Y | 1000 | 비고 |

**인덱스**:

| 인덱스명 | 컬럼 | 유니크 |
|----------|------|--------|
| `ix_supply_order_items_0` | `domain_id, supply_order_id, rank` | Y |
| `ix_supply_order_items_1` | `domain_id, supply_order_id, sku_cd` | N |
| `ix_supply_order_items_2` | `domain_id, supply_order_id, from_loc_cd` | N |
| `ix_supply_order_items_3` | `domain_id, supply_order_id, to_loc_cd` | N |

---

### 4.9 release_order_status — 출고 현황 뷰

출고 지시 헤더 + 상세 + 배송 정보를 조인한 DB View. 출고 현황 조회 화면에 사용.

```sql
CREATE OR REPLACE VIEW release_order_status AS
SELECT
    ri.id,
    ro.rls_ord_no, ro.rls_req_no, ro.rls_req_date, ro.rls_ord_date,
    ro.wave_no, ro.wh_cd, ro.com_cd, ro.cust_cd, ro.biz_type,
    ro.rls_type, ro.rls_exe_type, ro.dlv_type, ro.to_wh_cd,
    ro.export_flag, ro.status, ro.requester_id, ro.total_box,
    ro.box_wt, ro.started_at, ro.finished_at, ro.box_id, ro.box_type,
    ro.box_seq, COALESCE(ri.invoice_no, ro.invoice_no) as invoice_no,
    ri.rls_line_no, ri.line_no, ri.sku_cd, ri.sku_nm, ri.po_no, ri.do_no,
    ri.tot_ord_qty, ri.ord_qty, ri.rls_qty, ri.ord_pallet_qty, ri.ord_box_qty,
    ri.ord_ea_qty, ri.expired_date, ri.prod_date, ri.lot_no, ri.serial_no,
    ri.barcode, di.dlv_vend_cd, di.vehicle_no, di.dlv_no, di.sender_cd,
    di.sender_nm, di.sender_phone, di.sender_phone2, di.sender_zip_cd,
    di.sender_addr, di.sender_addr2, di.orderer_cd, di.orderer_nm,
    di.receiver_cd, di.receiver_nm, di.receiver_phone, di.receiver_phone2,
    di.receiver_zip_cd, di.receiver_addr, di.receiver_addr2, di.memo,
    ro.remarks, ri.attr01, ri.attr02, ri.attr03, ri.attr04, ri.attr05,
    ro.domain_id, ri.created_at, ri.updated_at
FROM
    release_orders ro
    INNER JOIN release_order_items ri ON ro.id = ri.release_order_id
    LEFT OUTER JOIN delivery_infos di ON ro.id = di.release_order_id
ORDER BY
    ro.rls_ord_no DESC, ri.rls_line_no DESC
```

---

### 4.10 outbound_orders — 출고 주문 뷰

출고 주문 헤더 + 상세를 조인한 복합 뷰. `ignoreDdl = true` (DDL 자동 생성 안 함).

주요 필드: 출고 헤더 정보 + 상세 항목 정보 + `item_status` (상세 상태)

---

### 4.11 import_release_orders — 임포트 스테이징

Excel/API 임포트 시 사용하는 스테이징 모델. `ignoreDdl = true`. 헤더 + 상세 + 배송 정보를 플랫 구조로 수신하여 `importReleaseOrders()`에서 정규화 처리.

주요 필드: 출고 헤더 + 상세 + 배송(발송인/주문자/수취인) 모든 정보를 단일 레코드로 포함.

---

## 5. ER 다이어그램

```
                                ┌─────────────────┐
                         ┌──── │     waves        │ ────┐
                         │     │ (웨이브)          │     │
                         │     └────────┬─────────┘     │
                         │              │                │
                    wave_no        wave_no           wave_no
                         │              │                │
                         ▼              ▼                ▼
┌───────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  release_orders   │  │ picking_orders  │  │  supply_orders   │
│ (출고 지시 헤더)   │  │ (피킹 지시 헤더) │  │ (보충 지시 헤더)  │
└────────┬──────────┘  └────────┬────────┘  └────────┬─────────┘
         │                      │                     │
    1:N  │                 1:N  │                1:N  │
         ▼                      ▼                     ▼
┌───────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│release_order_items│  │picking_order_   │  │supply_order_items│
│ (출고 지시 상세)   │  │items            │  │ (보충 지시 상세)  │
└───────────────────┘  │(피킹 지시 상세)  │  └──────────────────┘
                       └────────┬────────┘
                                │
                           N:1  │ inventory_id
                                ▼
                       ┌─────────────────┐
                       │   inventories   │
                       │ (재고)           │
                       └─────────────────┘

┌───────────────────┐
│  release_orders   │ ─── 1:1 ───▶ ┌─────────────────┐
│ (출고 지시 헤더)   │               │  delivery_infos  │
└───────────────────┘               │ (배송 정보)       │
                                    └─────────────────┘
```

**관계 요약**:

| 부모 | 자식 | 관계 | 연결 키 |
|------|------|------|---------|
| `release_orders` | `release_order_items` | 1:N | `release_order_id` |
| `release_orders` | `delivery_infos` | 1:1 | `release_order_id` |
| `waves` | `release_orders` | 1:N | `wave_no` |
| `waves` | `picking_orders` | 1:N | `wave_no` |
| `waves` | `supply_orders` | 1:N | `wave_no` |
| `picking_orders` | `picking_order_items` | 1:N | `pick_order_id` |
| `supply_orders` | `supply_order_items` | 1:N | `supply_order_id` |
| `inventories` | `picking_order_items` | 1:N | `inventory_id` |

---

## 6. 공통코드 및 상수

### 6.1 업무 유형 (bizType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `BIZ_TYPE_B2B_OUT` | `B2B_OUT` | B2B 출고 |
| `BIZ_TYPE_B2C_OUT` | `B2C_OUT` | B2C 출고 |
| `BIZ_TYPE_B2B_RTN` | `B2B_RTN` | B2B 반품 출고 |
| `BIZ_TYPE_B2C_RTN` | `B2C_RTN` | B2C 반품 출고 |

### 6.2 출고 유형 (rlsType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `RELEASE_TYPE_NORMAL` | `NORMAL` | 일반 출고 |
| `RELEASE_TYPE_RETURN` | `RETURN` | 반품 출고 |
| `RELEASE_TYPE_TRANSFER` | `TRANSFER` | 창고 이동 |
| `RELEASE_TYPE_SCRAP` | `SCRAP` | 폐기 |
| `RELEASE_TYPE_ETC` | `ETC` | 기타 출고 |

### 6.3 실행 유형 (rlsExeType)

| 코드 | 값 | 설명 |
|------|-----|------|
| `RLS_EXE_TYPE_INDIVIDUAL` | `INDIVIDUAL` | 개별 출고 (주문별 피킹) |
| `RLS_EXE_TYPE_BATCH` | `BATCH` | 일괄 출고 (토탈 피킹) |
| `RLS_EXE_TYPE_EQUIPMENT` | `EQUIPMENT` | 설비 출고 (DPS 연계) |

### 6.4 피킹 예약 방법 (pickingReserveMethod)

| 코드 | 값 | 설명 |
|------|-----|------|
| `INV_CHECK_ONLY` | `INV_CHECK_ONLY` | 가용 재고 체크만 (예약 안 함) |
| `QTY_ONLY` | `QTY_ONLY` | 상품별 수량만 예약 (바코드 예약 안 함) |
| `BARCODE` | `BARCODE` | 개별 바코드에 피킹 예약 |

### 6.5 피킹 예약 전략 (pickingReserveStrategy)

| 코드 | 값 | 설명 |
|------|-----|------|
| `EXPIRED_DATE` | `EXPIRED_DATE` | 유통기한 선입선출 |
| `FIFO` | `FIFO` | 입고 시간 선입선출 |
| `MANUAL` | `MANUAL` | 작업자 판단 |

---

## 7. 주요 설정값

`RuntimeEnvItem`에 등록하여 화주사/창고별 설정 가능.

| 설정키 | 기본값 | 설명 |
|--------|--------|------|
| `out.release.waiting.location` | - | 출고 대기 로케이션 (재고 임시 보관) |
| `out.picking.reservation.method` | `BARCODE` | 피킹 예약 방법 |
| `out.picking.reservation.strategy` | `FIFO` | 피킹 예약 전략 |
| `out.picking.order.auto-close.enabled` | `false` | 피킹 완료 시 피킹 지시 자동 마감 |
| `out.picking.auto-start.release-order.started` | `false` | 피킹 시작 시 출고 지시 자동 시작 |
| `out.picking.order.sheet.template` | - | 피킹 지시서 출력 템플릿 |
| `out.release.order.sheet.template` | - | 거래명세서 템플릿 |
| `out.release.label.template` | - | 출고 라벨 출력 템플릿 |

---

## 8. API 목록

Base URL: `/rest/outbound_trx`

### 8.1 주문 관리

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| B2C 임포트 | POST | `release_orders/import/excel/b2c` | B2C 출고 주문 엑셀 임포트 |
| B2B 임포트 | POST | `release_orders/import/excel/b2b` | B2B 출고 주문 엑셀 임포트 |
| 출고 요청 | POST | `release_orders/{id}/request` | 개별 출고 요청 (REG→REQ) |
| 출고 요청 (일괄) | POST | `release_orders/request` | 복수 출고 요청 |
| 출고 요청 취소 | POST | `release_orders/{id}/cancel_request` | 개별 출고 요청 취소 (REQ→REG) |
| 출고 요청 취소 (일괄) | POST | `release_orders/cancel_request` | 복수 출고 요청 취소 |

### 8.2 분류 및 접수

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| 대상 분류 | POST | `release_orders/classify` | 주문 유형 분석/분류 |
| 출고 접수 | POST | `release_orders/{id}/accept` | 개별 출고 접수 (REQ→WAIT) |
| 접수 취소 | POST | `release_orders/{id}/cancel_accept` | 출고 접수 취소 (WAIT→REQ) |

### 8.3 출고 작업

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| 작업 시작 | POST | `release_orders/{id}/start` | 출고 작업 시작 (WAIT→RUN) |
| 작업 시작 취소 | POST | `release_orders/{id}/cancel_start` | 작업 시작 취소 (RUN→WAIT) |
| 피킹 시작 | POST | `picking_orders/{id}/start` | 피킹 시작 |
| 피킹 처리 | POST | `picking_orders/pick` | 피킹 항목 처리 |
| 피킹+재고 처리 | POST | `picking_orders/pick_with_inventory` | 피킹 + 재고 지정 처리 |

### 8.4 출고 완료/취소

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| 출고 마감 | POST | `release_orders/{id}/close` | 출고 마감 (→END) |
| 출고 마감 (파라미터) | POST | `release_orders/{id}/close_by_params` | 파라미터 포함 출고 마감 |
| 출고 취소 | POST | `release_orders/{id}/cancel` | 출고 취소 (→CANCEL) |
| 라인 취소 | POST | `release_orders/{id}/cancel_line` | 개별 라인 취소 |

### 8.5 조회

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| 출고 주문 조회 | GET | `release_orders/{id}/items` | 출고 지시 상세 조회 |
| 작업 항목 조회 | GET | `release_orders/work_items` | 출고 작업 항목 조회 |
| 가용 재고 조회 | GET | `release_orders/{id}/inventories` | 출고용 가용 재고 조회 |
| 출고 라인 완료 | POST | `release_orders/finish_lines` | 출고 라인 완료 처리 |
| 개별 라인 완료 | POST | `release_order_items/{id}/finish` | 개별 라인 완료 처리 |

### 8.6 출력

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| 피킹 지시서 인쇄 | POST | `picking_orders/{id}/print_sheet` | 피킹 지시서 인쇄 |
| 거래명세서 인쇄 | POST | `release_orders/{id}/print_sheet` | 거래명세서 인쇄 |
| 피킹 지시서 다운로드 | GET | `picking_orders/{id}/download_sheet` | 피킹 지시서 PDF 다운로드 |
| 거래명세서 다운로드 | GET | `release_orders/{id}/download_sheet` | 거래명세서 PDF 다운로드 |

### 8.7 대시보드

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| 상태별 건수 | GET | `dashboard/status_counts` | 출고 상태별 건수 |
| 유형별 통계 | GET | `dashboard/type_stats` | 출고 유형별 통계 |
| 피킹 통계 | GET | `dashboard/picking_stats` | 피킹 진행 통계 |
| 업무유형별 통계 | GET | `dashboard/biz_type_stats` | B2C/B2B별 통계 |
| 알림 | GET | `dashboard/alerts` | 출고 관련 알림 |

### 8.8 CRUD API

각 엔티티별 기본 CRUD 컨트롤러 (`/rest/{entity_name}`):

| 엔티티 | Base URL | 컨트롤러 |
|--------|----------|----------|
| ReleaseOrder | `/rest/release_orders` | ReleaseOrderController |
| PickingOrder | `/rest/picking_orders` | PickingOrderController |
| Wave | `/rest/waves` | WaveController |
| DeliveryInfo | `/rest/delivery_infos` | DeliveryInfoController |
| SupplyOrder | `/rest/supply_orders` | SupplyOrderController |
| OutboundOrder | `/rest/outbound_orders` | OutboundOrderController |
| ReleaseOrderStatus | `/rest/release_order_status` | ReleaseOrderStatusController |

---

## 9. 재고 연동

출고 프로세스에서 재고(Inventory) 테이블과의 연동 규칙.

### 9.1 재고 상태 변화

| 시점 | 재고 상태 | lastTranCd | 설명 |
|------|----------|------------|------|
| 피킹 예약 | `RESERVED` | `RESERVE` | 출고 지시 확정 시 가용 재고 예약 |
| 피킹 작업 | `PICKING` | `PICK` | PDA 피킹 작업 수행 |
| 출고 확정 | `STORED` (수량 차감) | `OUT` | 최종 출고 → 재고 차감 |
| 출고 취소 | `STORED` (수량 복원) | `OUT_CANCEL` | 출고 취소 → 재고 복원 |

### 9.2 피킹 예약 방법별 동작

| 방법 | 동작 |
|------|------|
| `INV_CHECK_ONLY` | 가용 재고 수량 확인만, 실제 예약 없음 |
| `QTY_ONLY` | SKU별 총 가용수량에서 주문수량 차감 (개별 바코드 미지정) |
| `BARCODE` | 개별 Inventory 바코드에 RESERVED 상태 설정 |

### 9.3 피킹 예약 전략별 재고 선택

| 전략 | 선택 기준 |
|------|----------|
| `EXPIRED_DATE` | 유통기한이 가장 가까운 재고 우선 (FEFO) |
| `FIFO` | 입고 시간이 가장 오래된 재고 우선 |
| `MANUAL` | 작업자가 PDA에서 직접 재고 선택 |

---

## 10. 중소 풀필먼트 운영 가이드

### 10.1 권장 설정 (소규모 창고)

| 설정 | 권장값 | 이유 |
|------|--------|------|
| 피킹 예약 방법 | `BARCODE` | 정확한 재고 추적 |
| 피킹 예약 전략 | `FIFO` | 선입선출 보장 |
| 피킹 자동 마감 | `true` | 작업 단계 축소 |
| 피킹 자동 시작 | `true` | 작업 단계 축소 |

### 10.2 일일 운영 시나리오

**오전 (주문 접수 및 준비)**:
1. 전일 접수된 주문 확인 (`release_orders` status=REG)
2. 주문 일괄 확정 (`requestReleaseOrder`)
3. 주문 대상 분류 (`classifyReleaseOrders`)
4. 재고 할당 및 피킹 지시 생성 (`startSingleReleaseOrder`)
5. 피킹 지시서 출력

**오후 (피킹 및 출고)**:
1. PDA 피킹 작업 수행
2. 피킹 완료 확인
3. 출고 검수 (선택적)
4. 운송장 등록
5. 출고 마감 (`closeReleaseOrder`)

### 10.3 웨이브 없이 개별 출고

소량 창고에서는 웨이브 생성 없이 개별 주문 단위로 출고 처리 가능:

```
1. 주문 접수 → 확정 → 접수 (개별 건)
2. 출고 작업 시작 (자동으로 피킹 지시 생성)
3. PDA 피킹
4. 출고 마감
```

### 10.4 택배사 연동

1. `delivery_infos.dlv_vend_cd`에 택배사 코드 설정
2. `delivery_infos.invoice_no`에 운송장 번호 매핑
3. 출고 마감 후 택배사 API 호출 (커스텀 서비스로 구현)

커스텀 서비스 확장 포인트:
- `diy-outb-post-close-release` — 출고 마감 후 택배사 API 연동
- `diy-outb-post-import-release` — 주문 임포트 후 추가 처리

### 10.5 일일 마감 리포트

대시보드 API를 활용한 일일 마감:
- `getDashboardStatusCounts` — 상태별 건수 확인 (미완료 건 체크)
- `getDashboardTypeStats` — 유형별 출고 통계
- `getDashboardPickingStats` — 피킹 진행률 확인
- `getDashboardAlerts` — 주의 필요 건 확인

---

## 부록: 백엔드 구현 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| 엔티티 (11개) | 완료 | 실테이블 8 + 뷰/임포트 3 |
| REST 컨트롤러 (8개) | 완료 | CRUD + Transaction |
| OutboundTransactionService | 완료 | 40+ 메서드 |
| 상수/설정 | 완료 | WmsOutboundConstants, WmsOutboundConfigConstants |
| 프론트엔드 화면 | **미구현** | 출고 관리 화면 구현 필요 |
| PDA 피킹 화면 | **미구현** | 피킹 작업 PDA 화면 구현 필요 |
| 대시보드 화면 | **미구현** | 출고 대시보드 화면 구현 필요 |

**소스 파일 경로**:
- 엔티티: `src/main/java/operato/wms/outbound/entity/`
- 서비스: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
- 컨트롤러: `src/main/java/operato/wms/outbound/rest/`
- 상수: `src/main/java/operato/wms/outbound/WmsOutboundConstants.java`
- 설정: `src/main/java/operato/wms/outbound/WmsOutboundConfigConstants.java`
