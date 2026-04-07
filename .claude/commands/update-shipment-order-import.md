# update-shipment-order-import

출고 주문 엑셀 임포트 파일의 '원주문 번호', '주문일', '출고기한'을 업데이트합니다.

## 기능

- 엑셀 파일의 '원주문 번호' 컬럼을 찾아서 `DO-#{YYMMDD}-#{SEQ4자리}` 형식으로 업데이트
- 날짜 조건에 따른 시퀀스 시작점 자동 결정:
  - **오늘 이전 날짜**: `DO-#{오늘날짜}-0001`부터 시작
  - **오늘 날짜**: 마지막 시퀀스 +1부터 시작
- 같은 원주문 번호를 가진 행들은 동일한 새 번호로 그룹 업데이트
- 주문 라인별로 같은 주문은 동일한 번호 유지
- **주문일(B열)**: 오늘 이전이면 오늘 날짜(`YYYY-MM-DD`)로 변경
- **출고기한(C열)**: 오늘~오늘+2일 범위에서 임의 설정 (당일/익일/모레)

## 인자

```
update-shipment-order-import <파일경로>
```

- `<파일경로>`: 업데이트할 엑셀 파일 경로 (기본값: `templates/B2C-출고주문-O1-임포트.xlsx`)

## 처리 절차

### 1. 파일 확인

```python
import openpyxl
from datetime import datetime
from collections import OrderedDict
import re

file_path = '{파일경로}'
wb = openpyxl.load_workbook(file_path)
ws = wb.active
```

### 2. 원주문 번호 컬럼 찾기

'원주문 번호' 헤더를 가진 컬럼을 찾습니다 (보통 첫 번째 컬럼).

```python
order_no_col = 1  # 보통 첫 번째 컬럼
```

### 3. 현재 데이터 분석

```python
# 모든 원주문 번호 수집
original_values = []
for row in range(2, ws.max_row + 1):
    value = ws.cell(row, order_no_col).value
    if value:
        original_values.append((row, value))

# 마지막 주문번호 확인
last_value = original_values[-1][1] if original_values else None
```

### 4. 날짜 확인 및 시작 시퀀스 결정

```python
today = datetime.now().strftime('%y%m%d')

if last_value:
    # 날짜 추출: DO-YYMMDD-XXXX에서 YYMMDD 부분
    date_match = re.search(r'DO-(\d{6})-', last_value)
    if date_match:
        file_date = date_match.group(1)

        if file_date < today:
            # 오늘 이전 날짜면 0001부터 시작
            next_seq = 1
            print(f"파일 날짜({file_date})가 오늘({today})보다 이전 → 0001부터 시작")
        else:
            # 오늘 날짜면 마지막 시퀀스 +1부터
            seq_match = re.search(r'-(\d+)$', last_value)
            if seq_match:
                last_seq = int(seq_match.group(1))
                next_seq = last_seq + 1
                print(f"파일 날짜({file_date})가 오늘 → {last_seq:04d} 다음인 {next_seq:04d}부터 시작")
            else:
                next_seq = 1
    else:
        next_seq = 1
else:
    next_seq = 1
```

### 5. 고유 주문번호 추출 및 매핑 생성

```python
# 고유한 값들을 순서대로 추출 (같은 주문번호 그룹핑)
unique_values = list(OrderedDict.fromkeys([v for _, v in original_values]))

# 새 번호로 매핑 생성
mapping = {}
seq = next_seq
for old_value in unique_values:
    new_value = f"DO-{today}-{seq:04d}"
    mapping[old_value] = new_value
    seq += 1
```

### 6. 업데이트 적용 (원주문 번호)

```python
# 매핑에 따라 업데이트 (같은 원주문 번호는 같은 새 번호로)
for row, old_value in original_values:
    new_value = mapping[old_value]
    ws.cell(row, order_no_col).value = new_value
```

### 7. 주문일·출고기한 업데이트

```python
from datetime import timedelta
import random

today_full = datetime.now()
today_str = today_full.strftime('%Y-%m-%d')

for row in range(2, ws.max_row + 1):
    # 주문일(B열): 오늘 이전이면 오늘로 변경
    order_date = ws.cell(row, 2).value
    if order_date and order_date < today_str:
        ws.cell(row, 2).value = today_str

    # 출고기한(C열): 오늘~오늘+2일 범위 임의 설정
    offset = random.choice([0, 1, 1, 2])  # 익일 비중 높게
    ws.cell(row, 3).value = (today_full + timedelta(days=offset)).strftime('%Y-%m-%d')

# 저장
wb.save(file_path)
```

## 사용 예시

### 기본 파일 업데이트

```bash
/update-shipment-order-import
```

### 특정 파일 지정

```bash
/update-shipment-order-import templates/B2C-출고주문-CJ-임포트.xlsx
```

## 실행 결과 예시

```
📂 파일: templates/B2C-출고주문-O1-임포트.xlsx

현재 '원주문 번호' 값들:
  행 2: DO-260329-0010
  행 3: DO-260329-0011
  행 4: DO-260329-0011
  행 5: DO-260329-0011

파일 날짜(260329)가 오늘(260330)보다 이전 → 0001부터 시작

고유한 주문번호: 2개
  1. DO-260329-0010 (1개 행)
  2. DO-260329-0011 (3개 행)

매핑 정보:
  DO-260329-0010 → DO-260330-0001 (1개 행)
  DO-260329-0011 → DO-260330-0002 (3개 행)

업데이트 중...
  행 2: DO-260329-0010 → DO-260330-0001
  행 3: DO-260329-0011 → DO-260330-0002
  행 4: DO-260329-0011 → DO-260330-0002
  행 5: DO-260329-0011 → DO-260330-0002

✅ 파일 저장 완료!
총 2개 고유 주문번호를 DO-260330-0001 ~ DO-260330-0002로 업데이트
총 4개 행 업데이트됨

📅 주문일 업데이트: 2026-03-29 → 2026-03-30 (4개 행)
📅 출고기한 업데이트: 2026-03-30 ~ 2026-04-01 범위로 임의 설정 (4개 행)
```

## 주요 규칙

### 날짜 기반 시퀀스 시작점

| 조건 | 시작 시퀀스 | 예시 |
|------|------------|------|
| 파일 날짜 < 오늘 | 0001부터 | DO-260329-0010 → DO-260330-0001 |
| 파일 날짜 = 오늘 | 마지막 seq + 1 | DO-260330-0010 → DO-260330-0011 |

### 같은 주문번호 그룹핑

- 원래 같은 주문번호였던 행들은 새 주문번호도 동일하게 유지
- 주문 라인이 여러 개인 경우 모두 같은 번호로 업데이트

**예시:**
```
이전:
  DO-260330-0010 (라인 1)
  DO-260330-0011 (라인 1, 2, 3) ← 3개 행
  DO-260330-0012 (라인 1)

새로 (마지막이 0012였으므로 0013부터):
  DO-260330-0013 (라인 1)
  DO-260330-0014 (라인 1, 2, 3) ← 3개 행 동일 번호
  DO-260330-0015 (라인 1)
```

## 필요한 라이브러리

```bash
pip install openpyxl
```

## 주의사항

- 엑셀 파일의 첫 번째 컬럼이 '원주문 번호'여야 합니다
- `DO-YYMMDD-XXXX` 형식을 준수해야 합니다
- 같은 주문의 여러 라인은 동일한 주문번호를 유지합니다
- 날짜가 바뀌면 자동으로 0001부터 새로 시작합니다
- 주문일(B열)은 오늘 이전일 때만 오늘로 변경 (오늘 이후면 유지)
- 출고기한(C열)은 항상 오늘~오늘+2일 범위로 재설정
