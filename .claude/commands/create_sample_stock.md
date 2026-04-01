입고 완료 주문 및 재고 샘플 데이터를 생성해줘.

파라미터: $ARGUMENTS (선택 — 비어있으면 순차 질문으로 수집)

## 처리 절차

### Step 0: 파라미터 수집

$ARGUMENTS 가 비어있으면 AskUserQuestion 도구를 사용하여 아래 항목을 **순서대로 하나씩** 질문한다.
모든 질문이 끝난 뒤 입력값을 요약 출력하고, 사용자 확인 후 Step 1을 실행한다.

질문 순서:

1. **대상 도메인 ID** (숫자만 허용)
   - 먼저 DB에서 도메인 목록을 조회하여 출력한다:
     ```python
     SELECT id, name, description FROM domains WHERE deleted_at IS NULL ORDER BY id
     ```
   - 출력 예시:
     ```
     등록된 도메인 목록:
       [11] yujin  — yujin
       [12] avnet  — AVNET
       [16] hkn    — HKN물류
     ```
   - 질문: `재고 샘플을 생성할 도메인 ID를 입력해주세요.`
   - 숫자가 아니거나 목록에 없는 ID면 재질문
   - 입력값을 `domain_id` 에 저장

2. **화주사 선택**
   - DB에서 해당 도메인의 화주사 목록을 조회하여 출력한다:
     ```python
     SELECT com_cd, com_nm FROM companies WHERE domain_id = {domain_id} ORDER BY com_cd
     ```
   - 출력 예시:
     ```
     화주사 목록:
       [1] PET01 — (주)펫코리아
       [2] PET02 — 반려동물유통
     ```
   - 질문: `재고 샘플을 생성할 화주사 번호를 선택해주세요.`
   - 번호가 범위를 벗어나면 재질문
   - 선택한 화주사의 `com_cd` 를 저장

   - 선택 후 해당 화주사의 SKU 수를 확인한다:
     ```python
     SELECT COUNT(*) FROM sku WHERE domain_id = {domain_id} AND com_cd = {com_cd} AND del_flag = false
     ```
   - SKU가 0개이면 아래 안내를 출력하고 생성 여부를 질문한다:
     ```
     ⚠ 화주사 {com_cd}에 등록된 상품(SKU)이 없습니다.

     /create_sample_master 스킬로 기준정보(상품 포함)를 먼저 생성할 수 있습니다.
     상품 없이는 재고 샘플을 생성할 수 없습니다.

     지금 상품 데이터를 생성하시겠습니까? (y/n)
     ```
     - `y` → `/create_sample_master` 스킬을 호출하여 해당 도메인의 기준정보를 생성한 뒤, SKU를 다시 조회하여 계속 진행
     - `n` 또는 그 외 → 아래 메시지 출력 후 **중단**:
       ```
       상품 데이터가 없어 재고 샘플을 생성할 수 없습니다.
       먼저 /create_sample_master 로 기준정보를 생성한 후 다시 시도해주세요.
       ```

3. **주문 생성 수량** (숫자만 허용)
   - 질문: `하루에 생성할 입고 주문 수를 입력해주세요. (기본값: 3)`
   - 기본값: 3, 숫자가 아니거나 1 미만이면 재질문
   - `orders_per_day` 에 저장

4. **주문당 상세 아이템 수** (숫자만 허용)
   - 질문: `입고 주문 1건당 아이템(상세) 수를 입력해주세요. (기본값: 5)`
   - 기본값: 5, 숫자가 아니거나 1 미만이면 재질문
   - `items_per_order` 에 저장

5. **입고 날짜** (YYYY-MM-DD 형식)
   - 질문: `입고 날짜를 입력해주세요. (기본값: 어제 날짜, 형식: YYYY-MM-DD)`
   - 비워두면 어제 날짜 사용
   - YYYY-MM-DD 형식이 아니면 재질문
   - `rcv_date` 에 저장

모든 항목 수집 후 확인 메시지 출력:

```
아래 내용으로 입고 완료 + 재고 샘플 데이터를 생성합니다.

  대상 도메인      : [{domain_id}] {domain_name}
  화주사           : {com_cd} — {com_nm}
  입고 날짜        : {rcv_date}
  하루 주문 수     : {orders_per_day}건
  주문당 아이템 수 : {items_per_order}개
  총 생성 주문 수  : {orders_per_day}건
  총 생성 아이템 수: {orders_per_day × items_per_order}개

  생성 대상:
    ✔ receivings (입고 주문) — status=END
    ✔ receiving_items (입고 상세) — status=END
    ✔ inventories (재고) — status=STORED, lastTranCd=MOVE
    ✔ inventory_hists (재고 이력) — 3단계 이력 (IN-INSP → IN → MOVE)

진행할까요? (y/n)
```

사용자가 `n` 또는 취소 의사를 밝히면 **중단**한다.

---

### Step 1: DB 접속 준비

DB 접속 정보는 `frontend/packages/operato-wes/config/config.development.js` 의 `ormconfig` 섹션에서 확인한다.
Python psycopg2 사용 (미설치 시 `pip3 install psycopg2-binary`).

---

### Step 2: 도메인 기준정보 조회

아래 정보를 조회하여 변수에 저장한다.

```python
# 첫 번째 창고
SELECT wh_cd FROM warehouses
WHERE domain_id = {domain_id}
ORDER BY created_at LIMIT 1
→ wh_cd

# 선택한 화주의 벤더 목록 (del_flag = false)
SELECT vend_cd, vend_nm FROM vendors
WHERE domain_id = {domain_id} AND com_cd = {com_cd} AND del_flag = false
ORDER BY vend_cd
→ vendors[]

# 선택한 화주의 SKU 목록
SELECT sku_cd, sku_nm, vend_cd, stock_unit, box_in_qty, use_expire_date
FROM sku
WHERE domain_id = {domain_id} AND com_cd = {com_cd} AND del_flag = false
ORDER BY vend_cd, sku_cd
→ skus[]

# 입고 대기 존(zone_type=RCV-WAIT) 로케이션 — 입고 검수·입고 이력에 사용
SELECT loc_cd FROM locations
WHERE domain_id = {domain_id} AND wh_cd = {wh_cd}
  AND zone_cd IN (
      SELECT zone_cd FROM zones
      WHERE domain_id = {domain_id} AND wh_cd = {wh_cd} AND zone_type = 'RCV-WAIT'
  )
ORDER BY loc_cd LIMIT 1
→ rcv_wait_loc_cd

# 피킹 존(zone_type=PICKABLE) 로케이션 목록 — 재고 최종 배치 위치
SELECT loc_cd FROM locations
WHERE domain_id = {domain_id} AND wh_cd = {wh_cd}
  AND zone_cd IN (
      SELECT zone_cd FROM zones
      WHERE domain_id = {domain_id} AND wh_cd = {wh_cd} AND zone_type = 'PICKABLE'
  )
ORDER BY loc_cd
→ pick_locs[]
```

조회 후 아래 내용 출력:
```
기준정보 조회 완료:
  창고          : {wh_cd}
  화주          : {com_cd}
  벤더          : {len(vendors)}개
  상품          : {len(skus)}개
  입고 대기 존  : {rcv_wait_loc_cd}
  피킹 존 수    : {len(pick_locs)}개
```

벤더가 없으면 오류 메시지 출력 후 **중단**:
```
⚠ 화주사 {com_cd}에 등록된 벤더가 없습니다.
  먼저 /create_sample_master 로 기준정보를 생성하세요.
```

`rcv_wait_loc_cd` 또는 `pick_locs` 가 없으면 오류 메시지 출력 후 **중단**:
```
⚠ 창고 {wh_cd}에 입고 대기 존 또는 피킹 존 로케이션이 없습니다.
  먼저 /create_sample_master 로 기준정보를 생성하세요.
```

---

### Step 3: 입고번호 채번

```python
# 해당 날짜 기존 입고번호 최대 SEQ 조회
date_str = rcv_date.replace('-', '')  # YYYYMMDD
SELECT rcv_no FROM receivings
WHERE domain_id = {domain_id} AND rcv_no LIKE 'IN{date_str}%'
ORDER BY rcv_no DESC LIMIT 1

# 없으면 SEQ = 1 부터 시작, 있으면 마지막 SEQ + 1 부터 시작
rcv_no = f"IN{date_str}{seq:04d}"
```

---

### Step 4: SKU 배분 전략

- 벤더 목록을 순환(round-robin)하며 입고 주문을 배분한다.
  - 주문 1 → 벤더 A, 주문 2 → 벤더 B, ... 벤더 수를 초과하면 처음부터 순환
- 해당 벤더의 SKU가 `items_per_order` 보다 적으면 다른 벤더의 SKU도 보충한다.
- 같은 주문에 동일 SKU가 중복되지 않도록 한다.

---

### Step 5: 수량 및 부가정보 계산

#### 5-1. 입고 수량

```python
import random
n_box = random.randint(2, 5)
exp_qty = (sku['box_in_qty'] or 10) * n_box
rcv_qty = exp_qty  # 완료 처리이므로 예정수량 = 입고수량
```

#### 5-2. 유통기한 / LOT 번호

- SKU의 `use_expire_date = true` 인 경우에만 설정한다.
- `use_expire_date = false` 또는 NULL이면 `expired_date = NULL`, `lot_no = NULL`

```python
# use_expire_date = true 인 경우
import random
from datetime import date, timedelta

# 유통기한: 입고 날짜 기준 12~36개월 후 말일
months = random.randint(12, 36)
base = date.fromisoformat(rcv_date)
exp_date = (base.replace(day=1) + timedelta(days=32 * months)).replace(day=1) - timedelta(days=1)
expired_date = exp_date.strftime('%Y-%m-%d')

# LOT 번호: LOT + YYYYMM + 4자리 순번 (도메인 내 전체 기준 자동 증가)
lot_seq += 1
lot_no = f"LOT{base.strftime('%Y%m')}{lot_seq:04d}"
```

#### 5-3. 바코드 생성

각 receiving_item 및 inventory 에 고유 바코드를 생성한다.

```python
# 도메인 내 기존 재고 바코드 최대 SEQ 조회
SELECT barcode FROM inventories
WHERE domain_id = {domain_id} AND barcode LIKE 'BCD%'
ORDER BY barcode DESC LIMIT 1

# 없으면 seq = 1 부터, 있으면 마지막 seq + 1 부터
barcode = f"BCD{domain_id}{date_str}{seq:06d}"
```

---

### Step 6: 데이터 INSERT

모든 INSERT 는 하나의 Python 스크립트에서 **트랜잭션 단위**로 처리한다.
오류 발생 시 전체 롤백한다.

#### 6-1. receivings INSERT (status=END)

```python
INSERT INTO receivings (
    id, rcv_no, rcv_req_no, rcv_req_date, rcv_end_date,
    status, rcv_type, wh_cd, com_cd, vend_cd,
    total_box, box_wt, remarks,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (
    {uuid4()}, {rcv_no}, {rcv_no}, {rcv_date}, {rcv_date},
    'END', '1', {wh_cd}, {com_cd}, {vend_cd},
    {sum(n_box)}, NULL, '샘플 데이터',
    {domain_id}, 'system', 'system', NOW(), NOW()
)
```

#### 6-2. receiving_items INSERT (status=END, rcv_qty 설정)

`rcv_seq` 는 아이템 순번(1부터)으로 설정한다.

```python
INSERT INTO receiving_items (
    id, receiving_id, rcv_exp_seq, rcv_seq,
    status, sku_cd, sku_nm, origin,
    rcv_exp_date, rcv_date,
    total_exp_qty, rcv_exp_qty,
    exp_box_qty, exp_ea_qty,
    rcv_qty, rcv_box_qty, rcv_ea_qty,
    barcode,
    expired_date, lot_no,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (
    {uuid4()}, {receiving_id}, {rcv_exp_seq}, {rcv_exp_seq},
    'END', {sku_cd}, {sku_nm}, 'KR',
    {rcv_date}, {rcv_date},
    {exp_qty}, {exp_qty},
    {n_box}, {exp_qty},
    {rcv_qty}, {n_box}, {rcv_qty},
    {barcode},
    {expired_date or NULL}, {lot_no or NULL},
    {domain_id}, 'system', 'system', NOW(), NOW()
)
```

#### 6-3. inventories INSERT (status=STORED)

receiving_item 1건당 inventory 1건 생성한다.

- 재고의 최종 위치는 **피킹 존**(`pick_locs`)에서 순환(round-robin)하여 배정한다.
- 재고 상태는 `STORED`(보관 중), 마지막 트랜잭션은 `MOVE`(로케이션 이동)이다.

```python
# 피킹 존 로케이션 round-robin
pick_loc_cd = pick_locs[item_global_idx % len(pick_locs)]

INSERT INTO inventories (
    id, barcode,
    wh_cd, com_cd, sku_cd, sku_bcd, sku_nm,
    vend_cd, loc_cd,
    rcv_no, rcv_seq,
    po_no, invoice_no,
    lot_no, expired_date, prod_date,
    origin,
    pallet_qty, box_qty, ea_qty,
    inv_qty, reserved_qty,
    last_tran_cd, expire_status, status,
    del_flag,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (
    {uuid4()}, {barcode},
    {wh_cd}, {com_cd}, {sku_cd}, {sku_barcd}, {sku_nm},
    {vend_cd}, {pick_loc_cd},
    {rcv_no}, {rcv_seq},
    {rcv_no}, NULL,
    {lot_no or NULL}, {expired_date or NULL}, NULL,
    'KR',
    NULL, {n_box}, {rcv_qty},
    {rcv_qty}, 0,
    'MOVE', {expire_status}, 'STORED',
    false,
    {domain_id}, 'system', 'system', NOW(), NOW()
)
```

`expire_status` 계산:
- `expired_date` 가 NULL → `'NORMAL'`
- `expired_date` < 오늘 → `'EXPIRED'`
- `expired_date` < 오늘 + 30일 → `'IMMINENT'`
- 그 외 → `'NORMAL'`

#### 6-4. inventory_hists INSERT (3단계 이력)

inventory 1건당 **3개의 이력**을 생성한다.

| hist_seq | status  | last_tran_cd | loc_cd          | 설명               |
|----------|---------|---------------|-----------------|--------------------|
| 1        | WAITING | IN-INSP       | rcv_wait_loc_cd | 입고 검수 (입고 대기 존) |
| 2        | STORED  | IN            | rcv_wait_loc_cd | 입고 완료 (입고 대기 존) |
| 3        | STORED  | MOVE          | pick_loc_cd     | 로케이션 이동 (피킹 존) |

```python
# hist_seq=1: 입고 검수 이력
INSERT INTO inventory_hists (
    id, barcode, hist_seq,
    wh_cd, com_cd, sku_cd, sku_bcd, sku_nm,
    vend_cd, loc_cd,
    rcv_no, rcv_seq,
    po_no, invoice_no,
    lot_no, expired_date, prod_date,
    origin,
    pallet_qty, box_qty, ea_qty,
    inv_qty, reserved_qty,
    last_tran_cd, expire_status, status,
    del_flag,
    domain_id, creator_id, created_at
) VALUES (
    {uuid4()}, {barcode}, 1,
    {wh_cd}, {com_cd}, {sku_cd}, {sku_barcd}, {sku_nm},
    {vend_cd}, {rcv_wait_loc_cd},
    {rcv_no}, {rcv_seq},
    {rcv_no}, NULL,
    {lot_no or NULL}, {expired_date or NULL}, NULL,
    'KR',
    NULL, {n_box}, {rcv_qty},
    {rcv_qty}, 0,
    'IN-INSP', {expire_status}, 'WAITING',
    false,
    {domain_id}, 'system', NOW()
)

# hist_seq=2: 입고 이력
INSERT INTO inventory_hists ( ... ) VALUES (
    {uuid4()}, {barcode}, 2,
    ...,
    {rcv_wait_loc_cd},
    ...,
    'IN', {expire_status}, 'STORED',
    ...
)

# hist_seq=3: 로케이션 이동 이력
INSERT INTO inventory_hists ( ... ) VALUES (
    {uuid4()}, {barcode}, 3,
    ...,
    {pick_loc_cd},
    ...,
    'MOVE', {expire_status}, 'STORED',
    ...
)
```

---

### Step 7: 결과 출력

주문별로 생성된 데이터를 출력하고, 완료 후 최종 요약을 출력한다.

주문별 출력 예시:
```
📦 IN202603310001 | VD001 (주)공급사A
  [1] SKU001 상품A | 수량 50개 | 유통기한 2027-12-31 | LOT202603_0001
  [2] SKU002 상품B | 수량 30개
  [3] SKU003 상품C | 수량 40개 | 유통기한 2028-06-30 | LOT202603_0002

📦 IN202603310002 | VD002 공급사B
  ...
```

최종 요약:
```
✅ 재고 샘플 데이터 생성 완료

  입고 날짜       : {rcv_date}
  총 입고 주문    : {orders_per_day}건 (receivings)
  총 입고 상세    : {총 receiving_items 건수}건 (receiving_items)
  총 재고 생성    : {총 inventories 건수}건 (inventories)
  총 재고 이력    : {총 inventory_hists 건수}건 (inventory_hists, 재고당 3건)
  유통기한 설정   : {유통기한 설정된 아이템 수}개
  LOT 설정        : {LOT 설정된 아이템 수}개
  입고 대기 존    : {rcv_wait_loc_cd}
  피킹 존 (사용)  : {사용된 pick_loc_cd 목록}
```
