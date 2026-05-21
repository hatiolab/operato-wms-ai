엑셀 파일(xxx_재고_yyyyMMdd.xlsx)을 읽어 inventories 테이블에 재고 데이터를 INSERT하는 스킬.

파라미터: 없음 (대화형으로 수집)

---

## 처리 절차

### Step 0: 파라미터 수집

AskUserQuestion 도구를 사용하여 아래 항목을 **순서대로 하나씩** 질문한다.

#### 0-1. 도메인 입력

```
작업할 도메인 ID를 입력해주세요. (예: 18)
```
- 입력값을 `domain_id` 에 저장

#### 0-2. 엑셀 파일 선택

`templates/` 폴더에서 `*_재고_*.xlsx` 형식의 파일 목록을 스캔한다:

```python
import glob
files = sorted(glob.glob('templates/*_재고_*.xlsx'))
```

파일이 있으면 목록을 보여주고 선택하도록 한다:
```
사용 가능한 재고 엑셀 파일 목록:
  [1] templates/로지온_재고_20260501.xlsx
  [2] templates/로지온_재고_20260515.xlsx
  ...

작업할 파일 번호를 선택하거나 직접 파일명을 입력해주세요.
```

파일이 없으면:
```
templates/ 폴더에 *_재고_*.xlsx 파일이 없습니다.
파일 경로를 직접 입력해주세요. (예: templates/로지온_재고_20260521.xlsx)
```

선택/입력값을 `file_path` 에 저장

#### 0-3. 화주사 입력

DB에서 해당 도메인의 화주사 목록을 조회하여 출력한다:
```python
SELECT com_cd, com_nm FROM companies WHERE domain_id = {domain_id} ORDER BY com_cd
```

출력 예시:
```
화주사 목록:
  [1] GRAIN_ON — (주)로지온코리아
  [2] BRAND01  — 브랜드원
  ...

화주사 코드를 선택하거나 직접 입력해주세요.
```
- 선택/입력값을 `com_cd` 에 저장

#### 0-4. 창고 입력

DB에서 해당 도메인의 창고 목록을 조회하여 출력한다:
```python
SELECT wh_cd, wh_nm FROM warehouses WHERE domain_id = {domain_id} ORDER BY wh_cd
```

출력 예시:
```
창고 목록:
  [1] WH001 — 로지온 물류센터
  [2] WH002 — 외부 창고
  ...

창고 코드를 선택하거나 직접 입력해주세요.
```
- 선택/입력값을 `wh_cd` 에 저장

#### 0-5. 로케이션 입력

DB에서 해당 도메인의 로케이션 샘플 3개를 조회하여 출력한다:
```python
SELECT loc_cd, loc_nm FROM locations WHERE domain_id = {domain_id} LIMIT 3
```

출력 예시:
```
로케이션 예시 (3개):
  A01-01-01-01
  A01-01-01-02
  A01-01-02-01

기본 로케이션 코드를 입력해주세요. (재고 INSERT 시 loc_cd로 사용)
```
- 입력값을 `loc_cd` 에 저장

#### 0-6. 수집 내용 확인

```
아래 내용으로 재고 데이터를 생성합니다.

  도메인       : {domain_id}
  엑셀 파일    : {file_path}
  화주사       : {com_cd}
  창고         : {wh_cd}
  로케이션     : {loc_cd}

진행할까요? (y/n)
```
- `n` 이면 중단

---

### Step 1: 엑셀 파일 읽기

```python
import openpyxl

wb = openpyxl.load_workbook(file_path)
ws = wb.active

# 헤더 행(1행) 읽기
headers = [ws.cell(1, col).value for col in range(1, ws.max_column + 1)]

# 데이터 행(2행~) 읽기
rows = []
for row in range(2, ws.max_row + 1):
    vals = [ws.cell(row, col).value for col in range(1, len(headers) + 1)]
    if all(v is None for v in vals):
        break
    d = dict(zip(headers, vals))
    # 상품코드 없는 행은 스킵
    if not d.get('상품코드'):
        continue
    rows.append(d)
```

읽기 완료 후 요약 출력:
```
📂 파일: {file_path}
   데이터: {len(rows)}건
```

---

### Step 2: DB 접속 준비

DB 접속 정보는 `frontend/packages/operato-wes/config/config.development.js` 의 `ormconfig` 섹션에서 확인한다.
Python psycopg2 사용 (미설치 시 `pip3 install psycopg2-binary`).

---

### Step 3: 사전 준비

#### 3-1. 스킬 시작 시간 기록

```python
from datetime import datetime
started_at = datetime.now()
```

#### 3-2. barcode 채번 (도메인별 형식 자동 감지)

기존 재고 바코드를 조회하여 도메인에서 사용 중인 형식을 자동으로 감지한다:

```python
import re
from datetime import date

today = date.today()
date_str = today.strftime('%Y%m%d')

SELECT barcode FROM inventories
WHERE domain_id = {domain_id} AND barcode IS NOT NULL
ORDER BY barcode DESC LIMIT 1

# 형식 감지 및 채번 시작 seq 결정
if 기존 바코드 없음:
    bcd_fmt = 'YYYYMMDD_A'
    bcd_seq = 1
elif re.match(r'^\d{8}A\d{5}$', 기존_바코드):
    # 도메인 18 형식: {YYYYMMDD}A{seq:05d}
    bcd_fmt = 'YYYYMMDD_A'
    bcd_seq = int(기존_바코드[-5:]) + 1
elif 기존_바코드.startswith('BCD'):
    # BCD 형식: BCD{domain_id}{YYYYMMDD}{seq:06d}
    bcd_fmt = 'BCD'
    bcd_seq = int(기존_바코드[-6:]) + 1
else:
    bcd_fmt = 'YYYYMMDD_A'
    bcd_seq = 1

def next_barcode():
    global bcd_seq
    if bcd_fmt == 'YYYYMMDD_A':
        bcd = f"{date_str}A{bcd_seq:05d}"
    else:
        bcd = f"BCD{domain_id}{date_str}{bcd_seq:06d}"
    bcd_seq += 1
    return bcd
```

#### 3-3. 공급처 코드 사전 조회 (vendors 테이블)

엑셀의 `공급(매입)처` 컬럼 값들을 미리 수집하여 한 번에 조회한다:

```python
vend_nms = list(set(r.get('공급(매입)처') for r in rows if r.get('공급(매입)처')))

SELECT vend_cd, vend_nm FROM vendors
WHERE domain_id = {domain_id} AND vend_nm = ANY(ARRAY[{vend_nms}])

# vend_nm → vend_cd 매핑 딕셔너리 생성
vend_map = {row['vend_nm']: row['vend_cd'] for row in result}
```

---

### Step 4: inventories INSERT

모든 INSERT는 하나의 Python 스크립트에서 **트랜잭션 단위**로 처리한다.
오류 발생 시 전체 롤백한다.

#### 컬럼 매핑 규칙

| inventories 컬럼 | 값 | 비고 |
|---|---|---|
| `id` | `uuid4()` | UUID 자동 생성 |
| `barcode` | `next_barcode()` | 시스템 채번 |
| `com_cd` | 사용자 입력 | |
| `wh_cd` | 사용자 입력 | |
| `loc_cd` | 사용자 입력 | |
| `sku_cd` | 엑셀 `상품코드` | |
| `sku_bcd` | 엑셀 `바코드` | |
| `sku_nm` | 엑셀 `상품명` | |
| `prod_date` | 엑셀 `제조일자` | yyyy-MM-dd 형식으로 변환 |
| `expired_date` | 엑셀 `소비기한` | yyyy-MM-dd 형식으로 변환 |
| `lot_no` | 엑셀 `로트번호` | 한글 포함 시 NULL 처리 |
| `inv_qty` | 엑셀 `현재고` | |
| `reserved_qty` | `0` | 고정 |
| `box_qty` | 엑셀 `박스수량 합계` | |
| `pallet_qty` | 엑셀 `파렛트 수량` | |
| `vend_cd` | `vend_map.get(공급(매입)처)` | 없으면 NULL |
| `last_tran_cd` | `'NEW'` | 고정 |
| `expire_status` | `'NORMAL'` | 고정 |
| `status` | `'STORED'` | 고정 |
| `del_flag` | `false` | 고정 |
| `creator_id` | `'devmaster@hatiolab.com'` | 고정 |
| `updater_id` | `'devmaster@hatiolab.com'` | 고정 |
| `created_at` | `started_at` | 스킬 시작 시간 |
| `updated_at` | `started_at` | 스킬 시작 시간 |
| `domain_id` | 사용자 입력 | |

#### 날짜 변환 함수

```python
def to_date_str(val):
    """날짜 값을 yyyy-MM-dd 문자열로 변환. 변환 불가 시 None 반환"""
    if val is None:
        return None
    if isinstance(val, (date, datetime)):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    # 숫자형 (엑셀 시리얼 번호)
    if s.isdigit():
        from datetime import timedelta
        excel_epoch = date(1899, 12, 30)
        return (excel_epoch + timedelta(days=int(s))).strftime('%Y-%m-%d')
    # 슬래시/점 구분자 처리
    for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d', '%m/%d/%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except:
            pass
    return None
```

#### 로트번호 한글 체크 함수

```python
import re

def clean_lot_no(val):
    """로트번호에 한글이 포함되어 있으면 None 반환"""
    if val is None:
        return None
    s = str(val).strip()
    if re.search(r'[가-힣]', s):
        return None
    return s if s else None
```

#### INSERT 실행

```python
from uuid import uuid4

success = 0
failed = 0
errors = []

INV_SQL = """
    INSERT INTO inventories (
        id, barcode,
        com_cd, wh_cd, loc_cd,
        sku_cd, sku_bcd, sku_nm,
        prod_date, expired_date, lot_no,
        inv_qty, reserved_qty,
        box_qty, pallet_qty,
        vend_cd,
        last_tran_cd, expire_status, status, del_flag,
        creator_id, updater_id, created_at, updated_at,
        domain_id
    ) VALUES (
        %s, %s,
        %s, %s, %s,
        %s, %s, %s,
        %s, %s, %s,
        %s, 0,
        %s, %s,
        %s,
        'NEW', 'NORMAL', 'STORED', false,
        'devmaster@hatiolab.com', 'devmaster@hatiolab.com', %s, %s,
        %s
    )
"""

HIST_SQL = """
    INSERT INTO inventory_hists (
        id, barcode, hist_seq,
        com_cd, wh_cd, loc_cd,
        sku_cd, sku_bcd, sku_nm,
        prod_date, expired_date, lot_no,
        inv_qty, reserved_qty,
        box_qty, pallet_qty,
        vend_cd,
        last_tran_cd, expire_status, status, del_flag,
        creator_id, created_at,
        domain_id
    ) VALUES (
        %s, %s, 1,
        %s, %s, %s,
        %s, %s, %s,
        %s, %s, %s,
        %s, 0,
        %s, %s,
        %s,
        'NEW', 'NORMAL', 'STORED', false,
        'devmaster@hatiolab.com', %s,
        %s
    )
"""

with conn.cursor() as cur:
    try:
        for i, row in enumerate(rows, 1):
            barcode    = next_barcode()
            vend_cd    = vend_map.get(row.get('공급(매입)처'))
            prod_date  = to_date_str(row.get('제조일자'))
            exp_date   = to_date_str(row.get('소비기한'))
            lot_no     = clean_lot_no(row.get('로트번호'))
            inv_qty    = row.get('현재고') or 0
            box_qty    = row.get('박스수량 합계')
            pallet_qty = row.get('파렛트 수량')
            sku_cd     = row.get('상품코드')
            sku_bcd    = row.get('바코드')
            sku_nm     = row.get('상품명')

            # inventories INSERT
            cur.execute(INV_SQL, (
                str(uuid4()), barcode,
                com_cd, wh_cd, loc_cd,
                sku_cd, sku_bcd, sku_nm,
                prod_date, exp_date, lot_no,
                inv_qty,
                box_qty, pallet_qty,
                vend_cd,
                started_at, started_at,
                domain_id
            ))

            # inventory_hists INSERT (hist_seq=1, 재고 직접 등록 이력)
            cur.execute(HIST_SQL, (
                str(uuid4()), barcode,
                com_cd, wh_cd, loc_cd,
                sku_cd, sku_bcd, sku_nm,
                prod_date, exp_date, lot_no,
                inv_qty,
                box_qty, pallet_qty,
                vend_cd,
                started_at,
                domain_id
            ))

            success += 1
            print(f"[{i:4d}/{len(rows)}] {sku_cd:<15} {str(sku_nm or '')[:20]:<20} | 수량 {inv_qty:>6} | 바코드 {barcode}")

        conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"❌ 오류 발생 — 전체 롤백: {e}")
        raise
```

---

### Step 5: 결과 출력

```
✅ 재고 데이터 INSERT 완료

  도메인       : {domain_id}
  화주사       : {com_cd}
  창고         : {wh_cd}
  로케이션     : {loc_cd}
  엑셀 파일    : {file_path}

  inventories     : {success}건 INSERT
  inventory_hists : {success}건 INSERT (건당 1건)
  유통기한 설정   : {exp_cnt}건
  LOT 설정        : {lot_cnt}건
  공급처 매핑     : {vend_cnt}건 ({vend_miss}건 미매핑)
  inv_qty 합계    : {total_inv_qty:,} EA
```

오류가 있었다면:
```
⚠ {failed}건 처리 실패:
  - {오류 내용}
```
