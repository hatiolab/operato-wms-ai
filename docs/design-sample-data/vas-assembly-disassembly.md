# VAS 유통가공 샘플 데이터 — SET_ASSEMBLY / DISASSEMBLY

## 개요

SET_ASSEMBLY(세트 구성)와 DISASSEMBLY(해체)는 **유형별로 별도 BOM을 관리**한다.
동일한 세트 상품이라도 조립 시 투입 자재와 해체 시 회수 자재가 다를 수 있기 때문이다.
(예: 포장박스는 조립 시 투입되지만 해체 시 재사용 불가)


## 기준 데이터 (BOM)

### vas_boms — 유형별 별도 BOM

```
| bom_no             | set_sku_cd  | set_sku_nm | vas_type     | com_cd |
|--------------------|-------------|------------|--------------|--------|
| BOM-20260403-00001 | SET-GIFT-A  | 선물세트A   | SET_ASSEMBLY | COM001 |
| BOM-20260403-00002 | SET-GIFT-A  | 선물세트A   | DISASSEMBLY  | COM001 |
```

> 동일한 `set_sku_cd`에 대해 `vas_type`이 다른 BOM을 별도로 등록한다.
> 현재 `vas_boms` UNIQUE 인덱스는 `com_cd + set_sku_cd`이므로 `vas_type`을 포함하도록 변경이 필요하다.

### vas_bom_items — Assembly BOM (BOM-20260403-00001)

조립에 필요한 **투입 자재** 목록

```
| vas_bom_id         | bom_seq | sku_cd      | sku_nm  | component_qty |
|--------------------|---------|-------------|---------|---------------|
| BOM-20260403-00001 | 1       | SKU-SHAMPOO | 샴푸    | 1             |
| BOM-20260403-00001 | 2       | SKU-RINSE   | 린스    | 1             |
| BOM-20260403-00001 | 3       | SKU-BOX     | 선물박스 | 1             |
```

### vas_bom_items — Disassembly BOM (BOM-20260403-00002)

해체 후 **회수 가능한 자재** 목록 (박스는 해체 시 재사용 불가 → 제외)

```
| vas_bom_id         | bom_seq | sku_cd      | sku_nm | component_qty |
|--------------------|---------|-------------|--------|---------------|
| BOM-20260403-00002 | 1       | SKU-SHAMPOO | 샴푸   | 1             |
| BOM-20260403-00002 | 2       | SKU-RINSE   | 린스   | 1             |
```


## SET_ASSEMBLY 프로세스 (10세트 생성)

### Step 1. 작업 지시 생성 → vas_orders

```
| vas_no             | vas_type     | vas_bom_id         | plan_qty | completed_qty | status |
|--------------------|--------------|--------------------|----------|---------------|--------|
| VAS-20260403-00001 | SET_ASSEMBLY | BOM-20260403-00001 | 10       | 0             | PLAN   |
```

### Step 2. BOM 전개 → vas_order_items

`req_qty = plan_qty × component_qty`

```
| vas_order_id       | sku_cd      | sku_nm  | req_qty | alloc_qty | picked_qty | status  |
|--------------------|-------------|---------|---------|-----------|------------|---------|
| VAS-20260403-00001 | SKU-SHAMPOO | 샴푸    | 10      | 0         | 0          | PLANNED |
| VAS-20260403-00001 | SKU-RINSE   | 린스    | 10      | 0         | 0          | PLANNED |
| VAS-20260403-00001 | SKU-BOX     | 선물박스 | 10      | 0         | 0          | PLANNED |
```

### Step 3. 승인 → vas_orders.status = APPROVED

### Step 4. 자재 배정/피킹 → vas_order_items

모든 자재 피킹 완료 시 헤더 상태 자동 전환

```
| vas_order_id       | sku_cd      | picked_qty | status |
|--------------------|-------------|------------|--------|
| VAS-20260403-00001 | SKU-SHAMPOO | 10         | PICKED |
| VAS-20260403-00001 | SKU-RINSE   | 10         | PICKED |
| VAS-20260403-00001 | SKU-BOX     | 10         | PICKED |
```

→ `vas_orders.status = MATERIAL_READY` (자동 전환)

### Step 5. 작업 시작 → vas_orders.status = IN_PROGRESS

`vas_order_items.status = IN_USE`로 일괄 변경

### Step 6. 실적 등록 → vas_results

```
| vas_order_id       | result_type  | set_sku_cd | result_qty | defect_qty |
|--------------------|--------------|------------|------------|------------|
| VAS-20260403-00001 | SET_ASSEMBLY | SET-GIFT-A | 9          | 1          |
```

→ `vas_orders.completed_qty = 9`

### Step 7. 재고 처리 (미구현 TODO)

| 방향 | sku_cd | 수량 | 비고 |
|------|--------|------|------|
| 차감 | SKU-SHAMPOO | 10 | 투입 자재 소진 |
| 차감 | SKU-RINSE | 10 | 투입 자재 소진 |
| 차감 | SKU-BOX | 10 | 투입 자재 소진 |
| 증가 | SET-GIFT-A | 9 | 완성품 입고 |

> 불량 1개는 별도 처리 (폐기 또는 재작업)

### Step 8. 작업 완료/마감

```
vas_orders.status: IN_PROGRESS → COMPLETED → CLOSED
```


## DISASSEMBLY 프로세스 (5세트 해체)

### Step 1. 작업 지시 생성 → vas_orders

Disassembly 전용 BOM 사용

```
| vas_no             | vas_type    | vas_bom_id         | plan_qty | completed_qty | status |
|--------------------|-------------|--------------------|----------|---------------|--------|
| VAS-20260403-00002 | DISASSEMBLY | BOM-20260403-00002 | 5        | 0             | PLAN   |
```

### Step 2. BOM 전개 → vas_order_items

회수 예정 자재 목록 (박스 항목 없음)

```
| vas_order_id       | sku_cd      | sku_nm | req_qty | status  |
|--------------------|-------------|--------|---------|---------|
| VAS-20260403-00002 | SKU-SHAMPOO | 샴푸   | 5       | PLANNED |
| VAS-20260403-00002 | SKU-RINSE   | 린스   | 5       | PLANNED |
```

> DISASSEMBLY에서 `vas_order_items`의 의미는 **회수 예정 자재**이다.
> Assembly와 동일한 테이블을 사용하지만 의미가 반대임에 주의한다.

### Step 3~5. 승인 / 피킹 / 작업 시작

Assembly와 동일한 상태 전이 흐름

### Step 6. 실적 등록 → vas_results

```
| vas_order_id       | result_type | set_sku_cd | result_qty |
|--------------------|-------------|------------|------------|
| VAS-20260403-00002 | DISASSEMBLY | SET-GIFT-A | 5          |
```

→ `vas_orders.completed_qty = 5`

### Step 7. 재고 처리 (미구현 TODO)

| 방향 | sku_cd | 수량 | 비고 |
|------|--------|------|------|
| 차감 | SET-GIFT-A | 5 | 세트 상품 해체 투입 |
| 증가 | SKU-SHAMPOO | 5 | 회수 |
| 증가 | SKU-RINSE | 5 | 회수 |

> SKU-BOX는 재사용 불가로 Disassembly BOM에서 제외 → 재고 증가 없음


## 핵심 설계 포인트

### BOM 유형 분리의 필요성

| 항목 | Assembly BOM | Disassembly BOM |
|------|-------------|-----------------|
| `vas_bom_items` 의미 | 투입 자재 | 회수 자재 |
| `vas_order_items` 의미 | 피킹 대상 (소진) | 회수 예정 (입고) |
| 재고 처리 방향 | 구성품 차감 + 완성품 증가 | 세트 차감 + 구성품 증가 |
| 박스 포함 여부 | O | X (재사용 불가) |

### 현재 코드 변경 필요 사항

`vas_boms` 테이블의 UNIQUE 인덱스를 `com_cd + set_sku_cd + vas_type + domain_id`로 변경해야
동일 세트 상품에 대해 유형별 BOM을 별도 등록할 수 있다.

```java
// 현재 (변경 필요)
@Index(name = "ix_vas_boms_1", columnList = "com_cd,set_sku_cd,domain_id", unique = true)

// 변경 후
@Index(name = "ix_vas_boms_1", columnList = "com_cd,set_sku_cd,vas_type,domain_id", unique = true)
```
