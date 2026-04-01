입고 주문 샘플 데이터를 생성해줘.

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
   - 질문: `입고 주문을 생성할 도메인 ID를 입력해주세요.`
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
   - 질문: `입고 주문을 생성할 화주사 번호를 선택해주세요.`
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
     상품 없이는 입고 주문을 생성할 수 없습니다.

     지금 상품 데이터를 생성하시겠습니까? (y/n)
     ```
     - `y` → `/create_sample_master` 스킬을 호출하여 해당 도메인의 기준정보를 생성한 뒤, SKU를 다시 조회하여 계속 진행
     - `n` 또는 그 외 → 아래 메시지 출력 후 **중단**:
       ```
       상품 데이터가 없어 입고 주문을 생성할 수 없습니다.
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

5. **입고 예정일** (YYYY-MM-DD 형식)
   - 질문: `입고 예정일을 입력해주세요. (기본값: 오늘 날짜, 형식: YYYY-MM-DD)`
   - 비워두면 오늘 날짜 사용
   - YYYY-MM-DD 형식이 아니면 재질문
   - `base_date` 에 저장

6. **생성 일수** (숫자만 허용)
   - 질문: `몇 일치 주문을 생성할까요? (기본값: 1일 — 입고 예정일 하루만 생성)`
   - 기본값: 1, 숫자가 아니거나 1 미만이면 재질문
   - `day_count` 에 저장
   - `base_date`가 오늘 날짜가 **아닌** 경우 주말(토·일)을 제외하고 날짜를 계산한다는 안내 표시

모든 항목 수집 후 확인 메시지 출력:

```
아래 내용으로 입고 주문 샘플 데이터를 생성합니다.

  대상 도메인      : [{domain_id}] {domain_name}
  화주사           : {com_cd} — {com_nm}
  하루 주문 수     : {orders_per_day}건
  주문당 아이템 수 : {items_per_order}개
  기준 입고예정일  : {base_date}
  생성 일수        : {day_count}일 (주말 제외 여부: {"오늘 기준이므로 주말 포함" if 오늘 == base_date else "주말 제외"})
  생성 날짜 목록   : {날짜 목록 출력 — 최대 10개까지만 나열, 초과 시 "외 N일"}
  총 생성 주문 수  : {orders_per_day × len(날짜목록)}건
  총 생성 아이템 수: {orders_per_day × len(날짜목록) × items_per_order}개

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
SELECT wh_cd FROM warehouses WHERE domain_id = {domain_id} ORDER BY created_at LIMIT 1
→ wh_cd

# 선택한 화주의 벤더 목록 (del_flag = false)
SELECT vend_cd, vend_nm FROM vendors WHERE domain_id = {domain_id} AND com_cd = {com_cd} AND del_flag = false ORDER BY vend_cd
→ vendors[]

# 선택한 화주의 SKU 목록
SELECT sku_cd, sku_nm, vend_cd, stock_unit, box_in_qty, use_expire_date
FROM sku
WHERE domain_id = {domain_id} AND com_cd = {com_cd} AND del_flag = false
ORDER BY vend_cd, sku_cd
→ skus[]
```

조회 후 아래 내용 출력:
```
기준정보 조회 완료:
  창고    : {wh_cd}
  화주    : {com_cd}
  벤더    : {len(vendors)}개
  상품    : {len(skus)}개
```

벤더가 없으면 오류 메시지 출력 후 **중단**:
```
⚠ 화주사 {com_cd}에 등록된 벤더가 없습니다.
  먼저 /create_sample_master 로 기준정보를 생성하세요.
```

---

### Step 3: 날짜 목록 생성

```python
from datetime import date, timedelta

today = date.today()
base = date.fromisoformat(base_date)

date_list = []
cursor = base
while len(date_list) < day_count:
    if base == today:
        # 오늘 기준이면 주말 포함
        date_list.append(cursor)
        cursor += timedelta(days=1)
    else:
        # 오늘 아닌 경우 주말(토=5, 일=6) 제외
        if cursor.weekday() < 5:
            date_list.append(cursor)
        cursor += timedelta(days=1)
```

---

### Step 4: 입고 주문 생성

#### 4-1. 입고번호 채번 규칙

```python
# 날짜별 기존 입고번호 최대 SEQ 조회
SELECT rcv_no FROM receivings
WHERE domain_id = {domain_id} AND rcv_no LIKE 'IN{YYYYMMDD}%'
ORDER BY rcv_no DESC LIMIT 1

# 없으면 SEQ = 1 부터 시작
# 있으면 마지막 SEQ + 1 부터 시작
rcv_no = f"IN{YYYYMMDD}{seq:04d}"
```

#### 4-2. SKU 배분 전략

- 벤더 목록을 순환(round-robin)하며 입고 주문을 배분한다.
  - 주문 1 → 벤더 A, 주문 2 → 벤더 B, ... 벤더 수를 초과하면 처음부터 순환
- 해당 벤더의 SKU가 `items_per_order`보다 적으면 다른 벤더의 SKU도 보충한다.
- 같은 날 같은 주문에 동일 SKU가 중복되지 않도록 한다.

#### 4-3. 입고 수량 계산

```python
# box_in_qty가 있으면 박스 2~5개 랜덤
import random
n_box = random.randint(2, 5)
exp_qty = (sku['box_in_qty'] or 10) * n_box
```

#### 4-4. 유통기한 / LOT 번호 처리

- SKU의 `use_expire_date = true` 인 경우에만 설정한다.
- `use_expire_date = false` 또는 NULL이면 `expired_date = NULL`, `lot_no = NULL`

```python
# use_expire_date = true 인 경우
import random
from datetime import date
from dateutil.relativedelta import relativedelta  # 없으면 timedelta로 계산

# 유통기한: 오늘 기준 12~36개월 후 말일
months = random.randint(12, 36)
exp_date = (date.today().replace(day=1) + timedelta(days=32 * months)).replace(day=1) - timedelta(days=1)
expired_date = exp_date.strftime('%Y-%m-%d')

# LOT 번호: LOT + YYYYMM + 4자리 순번 (도메인 내 전체 기준 자동 증가)
lot_seq += 1
lot_no = f"LOT{date.today().strftime('%Y%m')}{lot_seq:04d}"
```

> 말일 계산 단순화: 다음 달 1일 - 1일로 계산한다.

#### 4-5. 헤더 / 아이템 INSERT

```python
# receivings INSERT
INSERT INTO receivings (
    id, rcv_no, rcv_req_no, rcv_req_date, rcv_end_date,
    status, rcv_type, wh_cd, com_cd, vend_cd,
    total_box, box_wt, remarks,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (
    {uuid4()}, {rcv_no}, {rcv_no}, {rcv_date}, NULL,
    'INWORK', '1', {wh_cd}, {com_cd}, {vend_cd},
    {total_box}, NULL, NULL,
    {domain_id}, 'system', 'system', NOW(), NOW()
)

# receiving_items INSERT
INSERT INTO receiving_items (
    id, receiving_id, rcv_exp_seq, rcv_seq,
    status, sku_cd, sku_nm, origin,
    rcv_exp_date, rcv_date,
    total_exp_qty, rcv_exp_qty,
    exp_box_qty, exp_ea_qty,
    rcv_qty, rcv_box_qty, rcv_ea_qty,
    expired_date, lot_no,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (
    {uuid4()}, {receiving_id}, {seq}, NULL,
    'INWORK', {sku_cd}, {sku_nm}, 'KR',
    {rcv_date}, NULL,
    {exp_qty}, {exp_qty},
    {n_box}, {exp_qty},
    NULL, NULL, NULL,
    {expired_date or NULL}, {lot_no or NULL},
    {domain_id}, 'system', 'system', NOW(), NOW()
)
```

---

### Step 5: 결과 출력

날짜별로 진행 상황을 출력하고, 완료 후 최종 요약을 출력한다.

날짜별 진행 출력 예시:
```
📦 2026-04-01 (1/3일)
  IN202604010001 | VD001 (주)공급사A | 5개 아이템 | 총 150개
  IN202604010002 | VD002 공급사B    | 5개 아이템 | 총 200개
  IN202604010003 | VD003 공급사C    | 5개 아이템 | 총 180개

📦 2026-04-02 (2/3일)
  ...
```

최종 요약:
```
✅ 입고 주문 샘플 데이터 생성 완료

  생성 날짜   : {day_count}일 ({date_list[0]} ~ {date_list[-1]})
  총 주문 수  : {총 receivings 건수}건
  총 아이템 수: {총 receiving_items 건수}개
  유통기한 설정: {유통기한 설정된 아이템 수}개
  LOT 설정    : {LOT 설정된 아이템 수}개
```
