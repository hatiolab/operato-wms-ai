Excel 파일을 읽어 재고 마이그레이션 데이터를 DB에 등록해줘.

파라미터: $ARGUMENTS (선택 — 비어있으면 순차 질문으로 수집)

## 지원 Excel 형식

### 형식 A — 재고 직접 입력 (로지온 형식)
헤더: `com_cd, wh_cd, sku_cd, sku_bcd, sku_nm, prod_date, expired_date, lot_no, loc_cd, inv_qty, box_qty, pallet_qty, vend_cd, last_tran_cd, expire_status, status, del_flag, domain_id`

### 형식 B — 입고 주문 기반 (stock_migration_template 형식)
헤더: `rcv_no, rcv_date, wh_cd, com_cd, vend_cd, remarks, sku_cd, sku_nm, rcv_qty, barcode, expired_date, lot_no, loc_cd, po_no, prod_date, origin`

---

## 처리 절차

### Step 0: 파라미터 수집

$ARGUMENTS 가 비어있으면 AskUserQuestion 도구를 사용하여 아래 항목을 **순서대로 하나씩** 질문한다.

질문 순서:

1. **Excel 파일 경로**
   - 질문: `마이그레이션할 Excel 파일 경로를 입력해주세요. (기본값: .ai/stock_migration_template.xlsx)`
   - 비워두면 기본값 사용
   - `file_path` 에 저장

2. **입고 대기 로케이션 (rcv_wait_loc_cd)**
   - 질문: `입고 대기 존 로케이션 코드를 입력해주세요. (기본값: A-01-01)`
   - 비워두면 `A-01-01` 사용
   - `rcv_wait_loc_cd` 에 저장

3. **receivings 벤더코드 (형식 A인 경우만)**
   - Excel에 `domain_id` 컬럼이 있으면 형식 A로 판단
   - 질문: `입고 마스터에 사용할 벤더코드를 입력해주세요. (Excel 첫 번째 vend_cd 자동 제안)`
   - `rcv_vend_cd` 에 저장

---

### Step 1: Excel 파일 읽기 및 형식 감지

```python
import openpyxl

wb = openpyxl.load_workbook(file_path)
ws = wb.active

headers = [ws.cell(1, col).value for col in range(1, ws.max_column + 1)]

# 형식 감지
if 'domain_id' in headers:
    fmt = 'A'  # 재고 직접 입력 형식
else:
    fmt = 'B'  # 입고 주문 기반 형식

# 데이터 읽기 (헤더행 = 형식B: 1행, 형식A: 1행 / 형식B 데이터시작: 2행, 형식A 데이터시작: 2행)
# 형식 B의 경우 4행부터 데이터 (1~3행: 설명/헤더)
if fmt == 'B':
    # 실제 헤더 행 찾기 (rcv_no 가 있는 행)
    for hrow in range(1, 6):
        h = [ws.cell(hrow, c).value for c in range(1, ws.max_column + 1)]
        if 'rcv_no' in h or 'sku_cd' in h:
            headers = h
            data_start = hrow + 1
            break
else:
    data_start = 2

rows = []
for row in range(data_start, ws.max_row + 1):
    vals = [ws.cell(row, col).value for col in range(1, len(headers) + 1)]
    if all(v is None for v in vals):
        break
    if vals[headers.index('sku_cd')] is None:
        continue
    rows.append(dict(zip(headers, vals)))
```

읽기 완료 후 요약 출력:
```
📂 파일: {file_path}
   형식: {'A (재고 직접 입력)' if fmt=='A' else 'B (입고 주문 기반)'}
   데이터: {len(rows)}건
```

---

### Step 2: DB 접속 준비

DB 접속 정보는 `frontend/packages/operato-wes/config/config.development.js` 의 `ormconfig` 섹션에서 확인한다.
Python psycopg2 사용 (미설치 시 `pip3 install psycopg2-binary`).

---

### Step 3: 기준정보 확인 및 채번

#### 3-1. 형식 A 기준정보 추출
```python
# 형식 A: Excel에서 직접 추출
domain_id = rows[0]['domain_id']
com_cd    = rows[0]['com_cd']
wh_cd     = rows[0]['wh_cd']
```

#### 3-2. 형식 B 기준정보 추출
```python
# 형식 B: Excel에서 추출 (domain_id는 DB 도메인 조회 후 사용자 선택)
SELECT id, name FROM domains WHERE deleted_at IS NULL ORDER BY id
```

#### 3-3. rcv_no 채번 (마이그레이션: MG 접두사)
```python
from datetime import date
today = date.today()
date_str = today.strftime('%Y%m%d')

# 기존 마이그레이션 입고번호 최대 SEQ 조회
SELECT rcv_no FROM receivings
WHERE domain_id = {domain_id} AND rcv_no LIKE 'MG{date_str}%'
ORDER BY rcv_no DESC LIMIT 1

# 없으면 SEQ=1, 있으면 마지막+1
rcv_no = f"MG{date_str}{seq:04d}"
```

#### 3-4. barcode 채번 (도메인별 형식 자동 감지)

기존 재고 바코드를 조회하여 도메인에서 사용 중인 형식을 자동으로 감지한다.

```python
import re

SELECT barcode FROM inventories
WHERE domain_id = {domain_id} AND barcode IS NOT NULL
ORDER BY barcode DESC LIMIT 1

# 형식 감지 및 채번
if 기존 바코드 없음:
    # 기본값: 도메인 18 형식
    bcd_fmt  = 'YYYYMMDD_A'   # {YYYYMMDD}A{seq:05d}
    bcd_seq  = 1

elif re.match(r'^\d{8}A\d{5}$', 기존_바코드):
    # 도메인 18 형식: {YYYYMMDD}A{seq:05d}
    bcd_fmt  = 'YYYYMMDD_A'
    bcd_seq  = int(기존_바코드[-5:]) + 1

elif 기존_바코드.startswith('BCD'):
    # BCD 형식: BCD{domain_id}{YYYYMMDD}{seq:06d}
    bcd_fmt  = 'BCD'
    bcd_seq  = int(기존_바코드[-6:]) + 1

else:
    # 알 수 없는 형식 → 도메인 18 형식으로 fallback
    bcd_fmt  = 'YYYYMMDD_A'
    bcd_seq  = 1

# 아이템마다 barcode 생성
def next_barcode():
    global bcd_seq
    if bcd_fmt == 'YYYYMMDD_A':
        bcd = f"{date_str}A{bcd_seq:05d}"
    else:
        bcd = f"BCD{domain_id}{date_str}{bcd_seq:06d}"
    bcd_seq += 1
    return bcd
```

#### 3-5. 데이터 요약 및 사용자 확인

```
아래 내용으로 재고 마이그레이션 데이터를 생성합니다.

  대상 도메인      : [{domain_id}]
  화주사           : {com_cd}
  창고             : {wh_cd}
  입고번호 (rcv_no): {rcv_no}  ← 마스터 1건
  입고일자         : {today}
  입고 대기 존     : {rcv_wait_loc_cd}
  receivings 벤더  : {rcv_vend_cd}

  생성 대상:
    ✔ receivings         : 1건
    ✔ receiving_items    : {len(rows)}건
    ✔ inventories        : {len(rows)}건
    ✔ inventory_hists    : {len(rows) * 3}건 (재고당 3단계 이력)

진행할까요? (y/n)
```

사용자가 `n` 이면 중단한다.

---

### Step 4: 데이터 INSERT

모든 INSERT는 하나의 Python 스크립트에서 **트랜잭션 단위**로 처리한다.
오류 발생 시 전체 롤백한다.

#### 4-1. receivings INSERT (마이그레이션 입고 마스터 1건)

```python
from uuid import uuid4

# 형식 A: inv_qty 합계를 total_box 대신 사용 (box_qty 합계)
total_box = sum(r.get('box_qty') or 0 for r in rows)

INSERT INTO receivings (
    id, rcv_no, rcv_req_no, rcv_req_date, rcv_end_date,
    status, rcv_type, wh_cd, com_cd, vend_cd,
    total_box, box_wt, remarks,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (
    {uuid4()}, {rcv_no}, {rcv_no}, {today}, {today},
    'END', '1', {wh_cd}, {com_cd}, {rcv_vend_cd},
    {total_box}, NULL, '재고 마이그레이션',
    {domain_id}, 'system', 'system', NOW(), NOW()
)
```

#### 4-2. receiving_items INSERT (아이템별 1건)

```python
# 형식 A: rcv_qty = inv_qty, box_qty = box_qty, pallet_qty = pallet_qty
# 형식 B: rcv_qty = rcv_qty, box_qty = NULL

for seq, row in enumerate(rows, 1):
    rcv_qty  = row.get('inv_qty') or row.get('rcv_qty') or 0
    box_qty  = row.get('box_qty')
    sku_vend = row.get('vend_cd') or rcv_vend_cd

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
        {uuid4()}, {receiving_id}, {seq}, {seq},
        'END', {row['sku_cd']}, {row['sku_nm']}, {row.get('origin') or 'KR'},
        {today}, {today},
        {rcv_qty}, {rcv_qty},
        {box_qty}, {rcv_qty},
        {rcv_qty}, {box_qty}, {rcv_qty},
        {barcode},
        {row.get('expired_date') or NULL}, {row.get('lot_no') or NULL},
        {domain_id}, 'system', 'system', NOW(), NOW()
    )
```

#### 4-3. inventories INSERT (아이템별 1건)

```python
# expire_status 계산 (형식 B 또는 Excel 값 재계산)
def calc_expire_status(expired_date):
    if not expired_date:
        return 'NORMAL'
    exp = expired_date if isinstance(expired_date, date) else date.fromisoformat(str(expired_date)[:10])
    if exp < today:
        return 'EXPIRED'
    if exp < today + timedelta(days=30):
        return 'IMMINENT'
    return 'NORMAL'

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
    {wh_cd}, {com_cd}, {row['sku_cd']}, {row.get('sku_bcd') or NULL}, {row['sku_nm']},
    {row.get('vend_cd') or rcv_vend_cd}, {row['loc_cd']},
    {rcv_no}, {seq},
    {rcv_no}, NULL,
    {row.get('lot_no') or NULL}, {row.get('expired_date') or NULL}, {row.get('prod_date') or NULL},
    {row.get('origin') or 'KR'},
    {row.get('pallet_qty') or NULL}, {row.get('box_qty') or NULL}, {rcv_qty},
    {rcv_qty}, 0,
    'MOVE', {calc_expire_status(row.get('expired_date'))}, 'STORED',
    false,
    {domain_id}, 'system', 'system', NOW(), NOW()
)
```

#### 4-4. inventory_hists INSERT (재고당 3단계 이력)

`create_sample_stock` 방식과 동일하게 3단계 이력을 생성한다.

| hist_seq | status  | last_tran_cd | loc_cd          | 설명 |
|----------|---------|--------------|-----------------|------|
| 1        | WAITING | IN-INSP      | rcv_wait_loc_cd | 입고 검수 (입고 대기 존) |
| 2        | STORED  | IN           | rcv_wait_loc_cd | 입고 완료 (입고 대기 존) |
| 3        | STORED  | MOVE         | row['loc_cd']   | 로케이션 이동 (최종 위치) |

```python
for hist_seq, (hist_status, hist_tran, hist_loc) in enumerate([
    ('WAITING', 'IN-INSP', rcv_wait_loc_cd),
    ('STORED',  'IN',      rcv_wait_loc_cd),
    ('STORED',  'MOVE',    row['loc_cd']),
], 1):
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
        {uuid4()}, {barcode}, {hist_seq},
        {wh_cd}, {com_cd}, {row['sku_cd']}, {row.get('sku_bcd') or NULL}, {row['sku_nm']},
        {row.get('vend_cd') or rcv_vend_cd}, {hist_loc},
        {rcv_no}, {seq},
        {rcv_no}, NULL,
        {row.get('lot_no') or NULL}, {row.get('expired_date') or NULL}, {row.get('prod_date') or NULL},
        {row.get('origin') or 'KR'},
        {row.get('pallet_qty') or NULL}, {row.get('box_qty') or NULL}, {rcv_qty},
        {rcv_qty}, 0,
        {hist_tran}, {calc_expire_status(row.get('expired_date'))}, {hist_status},
        false,
        {domain_id}, 'system', NOW()
    )
```

---

### Step 5: 결과 출력

아이템별 처리 현황을 출력하고, 완료 후 최종 요약을 출력한다.

아이템별 출력 예시:
```
[  1/265] SKU001 상품명A       | 수량 3,847 | 바코드 BCD16202605190000001 | LOC A01-01-01-01
[  2/265] SKU002 상품명B       | 수량 4,346 | 바코드 BCD16202605190000002 | 유통기한 2029-04-06
...
```

최종 요약:
```
✅ 재고 마이그레이션 완료

  입고번호         : {rcv_no}
  입고일자         : {today}
  입고 대기 존     : {rcv_wait_loc_cd}

  receivings       : 1건
  receiving_items  : {len(rows)}건
  inventories      : {len(rows)}건
  inventory_hists  : {len(rows) * 3}건

  inv_qty 합계     : {total_inv_qty:,} EA
  유통기한 설정    : {exp_cnt}건
  LOT 설정         : {lot_cnt}건
```
