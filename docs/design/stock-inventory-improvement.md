# 재고 관리 테이블 문제점 및 개선 계획

## 개요

재고 원장(`inventories`), 재고 트랜잭션(`inventory_hists`), 재고 할당(`stock_allocations`) 세 테이블의
현행 구조를 분석하여 문제점과 개선 방향을 정리한다.

---

## 1. 재고 원장 — `inventories`

### 1.1 현행 구조 요약

| 역할 | 단위 | Unique Key |
|------|------|------------|
| 현재 재고 상태 보관 | 바코드 × 로케이션 | `(domain_id, barcode, loc_cd)` |

- `inv_qty`: 현재 보유 수량
- `reserved_qty`: 출고 예약된 수량 (stock_allocations 합계와 동기화 의도)
- `last_tran_cd`: 마지막 트랜잭션 유형
- `status`: EMPTY / WAITING / STORED / RESERVED / PICKING / LOCKED / BAD
- `del_flag`: 재고 소진 시 논리 삭제
- `received_at` ✅ (추가됨): 입고 확정 일시 (VARCHAR 20, YYYY-MM-DD HH:mm:ss)
- `closed_at` ✅ (추가됨): 재고 종료 일시 (VARCHAR 20)
- `unit_price` ✅ (추가됨): 단가 (DECIMAL 15,4)
- `currency_cd` ✅ (추가됨): 통화 코드 (VARCHAR 3, ISO 4217)

### 1.2 문제점

#### P1-1. 가용 수량 컬럼 없음 — 동시성 위험
- 가용 수량(`inv_qty - reserved_qty`)을 매번 계산해야 함
- 고빈도 출고 환경에서 두 값을 동시에 읽고 계산하는 사이에 다른 트랜잭션이 예약을 잡으면
  오버커밋(과예약) 발생 가능

#### P1-2. 피킹 임시 상태가 원장에 혼재
- `STATUS_RESERVED`, `STATUS_PICK`, `owner` 컬럼은 피킹 작업 중인 임시 상태
- 원장은 안정적인 재고 실황을 나타내야 하는데 수초~수분의 임시 상태가 혼재하여
  재고 현황 집계 신뢰성 저하
- "현재 STORED 재고"를 집계할 때 PICKING 상태 포함/제외 여부를 매번 판단해야 함

#### P1-3. ~~입고 확정일 컬럼 없음~~ ✅ 해결 — `received_at` 추가
- `received_at VARCHAR(20)` 컬럼 추가 완료
- 입고 완료 처리 시점에 `received_at`을 설정하여 `created_at`과 명확히 분리
- FIFO 출고 우선순위 기준으로 사용 가능 (`created_at` 대체)

#### P1-4. ~~단가 정보 없음~~ ✅ 해결 — `unit_price`, `currency_cd` 추가
- `unit_price DECIMAL(15,4)`, `currency_cd VARCHAR(3)` 컬럼 추가 완료
- 입고 확정 시 단가와 통화를 기록하여 재고 자산 가치 산출 및 ERP 연동 기반 마련

#### P1-5. `del_flag` 소진 처리 — 원장 데이터 소실 (부분 해결)
- 재고 소진 시 `del_flag = true` 처리
- `del_flag = false` 조건 조회 시 소진된 재고 이력이 집계에서 제외됨
- "이번 달 완전 소진된 SKU 목록" 등 소진 재고 분석 불가
- ✅ `closed_at VARCHAR(20)` 추가: 종료 일시를 기록하여 소진 시점 추적 가능
- `del_flag`와 `closed_at`의 이중 관리 구조는 유지 중 — 향후 `del_flag` 제거 검토 필요

#### P1-6. ~~`barcode` 길이 불일치~~ ✅ 해결
- `inventories.barcode` length를 50으로 통일 완료
- `inventory_hists.barcode`, `stock_allocations` 등 관련 테이블 동일 기준 적용

#### P1-7. ~~`updated_at` 인덱스 없음~~ ✅ 해결
- `updated_at` 인덱스 추가 완료 (`ix_inventories_7`)
- "마지막 연동 이후 변경된 재고" 조회 시 인덱스 스캔 가능

#### P1-8. SKU 비정규화 동기화 정책 미정
- `sku_nm`을 `inventories`에 직접 저장
- SKU 마스터에서 상품명 변경 시 기존 재고 레코드의 `sku_nm`이 자동 갱신되지 않음
- 동기화 정책(언제, 어떻게 갱신하는가)이 명시되지 않음

---

## 2. 재고 트랜잭션 — `inventory_hists`

### 2.1 현행 구조 요약

| 역할 | 생성 시점 | 식별 키 |
|------|----------|---------|
| 재고 상태 변경 이력 저장 | Inventory JPA 콜백(`afterCreate`, `afterUpdate`) | `(domain_id, barcode, hist_seq)` |

- 재고 전체 상태 **스냅샷**을 매 변경마다 기록
- `last_tran_cd`: 트랜잭션 유형 코드
- `hist_seq`: `SELECT MAX(hist_seq)` 후 +1 채번

### 2.2 문제점

#### P2-1. 스냅샷 방식 — 변경량(delta) 없음 (가장 심각)
- `inv_qty`는 변경 후 잔여 수량이지 변경량이 아님
- 수량 변화량(±얼마)을 알려면 이전 레코드와 비교 계산 필요
- 수불 현황에서 입고 합계 / 출고 합계 집계가 불가능

```
hist_seq=1  inv_qty=100  last_tran_cd=IN    → 입고량: ?
hist_seq=2  inv_qty= 80  last_tran_cd=OUT   → 출고량: 이전 레코드와 차이 계산 필요
hist_seq=3  inv_qty= 75  last_tran_cd=ADJUST → 조정량: 이전 레코드와 차이 계산 필요
```

#### P2-2. `hist_seq` 채번 동시성 취약
- `SELECT MAX(hist_seq)` 후 +1 패턴은 동시 트랜잭션 시 같은 barcode에 동일 `hist_seq` 중복 가능
- Unique Index(`ix_inventory_hists_0`)에 걸려 트랜잭션 오류 발생

```java
// InventoryHist.create() — race condition 발생 지점
String sql = "select max(hist_seq) from inventory_hists where ... and barcode = :barcode";
Integer maxSeq = queryMgr.selectBySql(sql, ...);
this.setHistSeq(ValueUtil.toInteger(maxSeq, 0) + 1);
```

#### P2-3. JPA 콜백 의존 — SQL 일괄처리 시 이력 누락
- 이력 생성이 JPA `afterCreate()`/`afterUpdate()` 콜백에 의존
- 직접 SQL UPDATE/DELETE로 재고를 변경하면 콜백이 호출되지 않아 이력 누락
- 코드 주석에도 명시: "insert, update 쿼리로 처리하면 이력에 남지 않는다"
- 대량 이관, 일괄 조정 작업에서 이력이 비어있는 상황 발생 가능

#### P2-4. `inventory_id` 없이 `barcode`로만 추적
- 이력 레코드가 `barcode` 문자열로만 재고를 식별
- `inventories.id`(UUID)와 직접 연결이 없어 barcode 변경/재사용 시 이력 추적 단절

```java
// InventoryHistController — barcode 경유 간접 조회
"select * from inventory_hists where ... and barcode = (select barcode from inventories where id = :inventoryId)"
```

#### P2-5. 조정 사유 관리 컬럼 없음
- `remarks`(자유 입력 문자열) 외에 체계적 사유 코드 없음
- 재고 조정(ADJUST), 폐기(SCRAP), 홀드(HOLD) 각각의 사유를 코드로 구분/집계 불가
- 참조 문서 번호(실사 ID, 조정 전표 번호 등) 저장 컬럼 없음

#### P2-6. 이력 삭제 가능한 구조
- `InventoryHistController`에 DELETE API가 열려 있음
- `del_flag` 컬럼도 존재
- 감사(audit) 목적의 이력은 append-only 불변 데이터여야 하나 삭제 가능

---

## 3. 재고 할당 — `stock_allocations`

### 3.1 현행 구조 요약

| 역할 | 상태 흐름 | 주요 연결 |
|------|----------|----------|
| 출고 주문 → 재고 바코드 간 할당 매핑 | SOFT → HARD → RELEASED / CANCELLED | shipment_order_items ↔ inventories |

- `alloc_qty`: 할당 수량
- `alloc_type`: SHIPMENT / VAS
- `alloc_strategy`: FEFO / FIFO / LEFO / MANUAL
- `expired_at`: 할당 만료 일시
- `inventories.reserved_qty` = 활성 할당(`SOFT`+`HARD`)의 합계 (동기화 의도)

### 3.2 문제점

#### P3-1. `reserved_qty` 정합성 보장 메커니즘 없음 (가장 심각)
- 두 값의 일치를 강제하는 DB 제약이나 트리거 없음
- `allocateInventory()`는 JPA 객체 update → 동시 접근 시 lost update 위험
- `deallocateInventory()`는 직접 SQL → 두 경로 혼용으로 정합성 오염 가능
- `StockAllocationController`의 CRUD API로 직접 레코드 삭제 시 `reserved_qty` 미복원

```java
// StockTransactionService.allocateInventory()
// TODO 재고 할당시 재고 할당 방법에 따라 재고 할당 로직 수정 필요
inv.setReservedQty(inv.getReservedQty() + qty);
this.queryManager.update(inv);  // ← 동시성 위험
```

#### P3-2. `alloc_strategy` 컬럼만 있고 전략별 분기 로직 미구현
- FEFO / FIFO / LEFO / MANUAL 값을 저장하도록 설계됐지만
- 실제 할당 코드는 단순 가용 수량 순서로만 재고를 선택
- 컬럼 선언과 실제 동작 불일치

#### P3-3. `picked_qty` 없음 — 부분 피킹 추적 불가
- 할당 수량(`alloc_qty`)은 있지만 실제 피킹 완료 수량 컬럼 없음
- 할당 50ea 중 45ea만 피킹 시 short 5ea를 `StockAllocation` 레벨에서 확인 불가
- `PickingTaskItem` 테이블 JOIN이 필수

#### P3-4. `expired_at` 자동 만료 처리 연계 없음
- 만료 시간 기반 인덱스(`ix_stock_allocations_5`)가 있지만
- EXPIRED 상태 전환 시 `inventories.reserved_qty`를 자동 복원하는 배치/스케줄러 없음
- 만료 할당이 누적되면 `reserved_qty`가 실제보다 크게 유지되어 가용 재고 부족 현상 발생

#### P3-5. `wh_cd` 없음 — 창고별 할당 현황 조회 비효율
- 창고별 할당 현황 조회 시 반드시 `inventories` JOIN 필요
- 빈번한 조회 패턴에 추가 JOIN 비용 발생

#### P3-6. 할당 유형이 SHIPMENT / VAS 두 가지만
- 보충 출고(REPLENISH), 폐기(SCRAP), 실사 잠금(INVENTORY_COUNT) 등도
  재고 선점이 필요하지만 할당 유형에 없음
- 현재 이들 처리는 `stock_allocations`를 우회하여 직접 재고 상태를 변경하므로
  선점 내역이 남지 않음

#### P3-7. 할당 우선순위(priority) 없음
- 동일 재고에 복수 주문 할당 후 재고 부족 발생 시 어떤 주문을 우선 처리할지 불명확
- 긴급 주문, 당일 출고 마감 주문의 우선순위를 할당 레벨에서 표현할 수 없음

#### P3-8. CRUD API 직접 개방 — 정합성 오염 위험
- `StockAllocationController`가 표준 CRUD를 그대로 제공
- 할당은 반드시 트랜잭션 서비스를 경유해야 `reserved_qty`가 동기화되지만
  API로 직접 생성/삭제하면 즉시 정합성 파괴

---

## 4. 개선 Task 목록

### 🔴 High Priority (운영 안정성 직결)

#### TASK-01. `reserved_qty` 정합성 보장
- `allocateInventory()` / `deallocateInventory()`를 `SELECT FOR UPDATE` 또는
  DB 수준 원자적 UPDATE(`reserved_qty = reserved_qty + :qty`)로 변경
- `StockAllocationController` write API(POST/PUT/DELETE)를 비활성화하고
  트랜잭션 서비스 경유 강제
- 주기적 정합성 검증 배치 추가: `SUM(alloc_qty) vs reserved_qty` 불일치 감지 및 알림

#### TASK-02. `alloc_strategy` 전략별 할당 로직 구현
- FEFO: `expired_date` 오름차순 우선 선택
- FIFO: `rcv_confirmed_at`(입고 확정일, TASK-04에서 추가) 오름차순 우선 선택
- LEFO: `expired_date` 내림차순 우선 선택
- MANUAL: 호출자가 특정 `inventory_id`를 지정

#### TASK-03. `expired_at` 만료 배치 구현
- 스케줄러: SOFT/HARD 상태에서 `expired_at < now()`인 할당을 EXPIRED로 전환
- 전환 시 `inventories.reserved_qty` 자동 복원 포함
- 만료 시 출고 주문 상태도 연계 업데이트(ALLOCATED → PENDING 복귀 등)

---

### 🟡 Medium Priority (원장 정확도 및 분석 기능)

#### TASK-04. `inventory_hists` 변경량 컬럼 추가
- `tran_qty` (트랜잭션 수량, +/-): 해당 트랜잭션에서 변경된 수량
- `before_qty` (변경 전 수량): 스냅샷 방식 보완
- 수불 현황 집계 쿼리를 `tran_qty` 기준으로 단순화 가능

#### TASK-05. `inventory_hists` 이력 생성 신뢰성 개선
- `hist_seq` 채번을 `SELECT MAX + 1` → DB sequence 또는 UUID + 타임스탬프 조합으로 변경
- 이력 생성 로직을 JPA 콜백에서 명시적 서비스 메서드로 분리
  (`StockTransactionService.recordHistory()`)하여 직접 SQL 처리 시에도 이력 보장
- `InventoryHistController` DELETE API 비활성화

#### TASK-06. `inventory_hists`에 `inventory_id` FK 추가
- `barcode` 경유 간접 조인을 `inventory_id` 직접 조인으로 변경
- barcode 변경/재사용 시에도 이력 추적 보장

#### ~~TASK-07~~. ✅ `inventories` 입고 확정일 추가 — 완료
- `received_at VARCHAR(20)` 컬럼 추가 완료 (입고 완료 처리 시점에 설정)
- FIFO 출고 우선순위 기준으로 사용 (`created_at` 대체)

#### ~~TASK-08~~. ✅ `inventories.barcode` 길이 통일 — 완료
- `inventories.barcode` length 50으로 확장 완료 (inventory_hists, stock_allocations와 통일)

---

### 🟢 Low Priority (운영 편의 및 확장성)

#### TASK-09. `stock_allocations`에 `wh_cd` 추가
- 할당 생성 시 `inventories.wh_cd`를 복사하여 저장
- 창고별 할당 현황 조회 시 inventories JOIN 없이 단독 조회 가능

#### TASK-10. `stock_allocations`에 `picked_qty` 추가
- 피킹 완료 처리 시 `picked_qty` 업데이트
- 할당 단계에서 partial fulfillment 추적 가능

#### TASK-11. 할당 유형 확장
- `ALLOC_TYPE_REPLENISH`, `ALLOC_TYPE_SCRAP`, `ALLOC_TYPE_COUNT` 상수 추가
- scrap/hold/replenish 처리 시 stock_allocations 경유로 통일

#### TASK-12. `stock_allocations`에 우선순위(`priority`) 추가
- Integer 타입 우선순위 컬럼 추가 (낮을수록 높은 우선순위)
- 재고 부족 시 우선순위 높은 주문을 먼저 할당 유지

#### ~~TASK-13~~. ✅ `inventories`에 단가 컬럼 추가 — 완료
- `unit_price DECIMAL(15,4)`, `currency_cd VARCHAR(3)` 추가 완료
- 입고 확정 시 입고 단가 기록
- 재고 자산 가치 산출, ERP 회계 연동 기반 마련

#### TASK-14. `inventory_hists`에 조정 사유 컬럼 추가
- `reason_cd` (조정/폐기/홀드 사유 코드)
- `ref_doc_no` (참조 문서 번호: 실사 ID, 조정 전표 번호 등)

---

## 5. 테이블 간 정합성 규칙 (개선 후 기준)

```
inventories.reserved_qty
    = SELECT SUM(alloc_qty)
      FROM stock_allocations
      WHERE domain_id = ?
        AND inventory_id = ?
        AND status IN ('SOFT', 'HARD')

inventories.inv_qty >= inventories.reserved_qty  (항상 성립해야 함)

inventory_hists.after_qty (= 현재 inv_qty)
    = inventory_hists.before_qty + inventory_hists.tran_qty
```

---

## 6. 개선 우선순위 로드맵

```
Phase 1 (운영 안정성)
  TASK-01  reserved_qty 정합성 보장
  TASK-03  expired_at 만료 배치
  TASK-08  barcode 길이 통일 ✅ 완료

Phase 2 (원장 정확도)
  TASK-04  tran_qty / before_qty 추가
  TASK-05  이력 생성 신뢰성 개선
  TASK-07  received_at 추가 ✅ 완료

Phase 3 (분석 및 확장)
  TASK-02  alloc_strategy 구현
  TASK-06  inventory_id FK 추가
  TASK-09  wh_cd 추가
  TASK-10  picked_qty 추가
  TASK-11  할당 유형 확장
  TASK-12  priority 추가
  TASK-13  unit_price / currency_cd 추가 ✅ 완료
  TASK-14  reason_cd / ref_doc_no 추가
```
