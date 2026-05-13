# update-shipment-order-import

출고 주문 엑셀 임포트 파일의 '원주문 번호', '출고준비 번호', '주문일', '출고기한'을 업데이트합니다.

## 기능

- 엑셀 파일의 '원주문 번호' 컬럼을 찾아서 `DO-#{YYMMDD}-#{SEQ4자리}` 형식으로 업데이트
- 날짜 조건에 따른 시퀀스 시작점 자동 결정:
  - **오늘 이전 날짜**: `DO-#{오늘날짜}-0001`부터 시작
  - **오늘 날짜**: 마지막 시퀀스 +1부터 시작
- 같은 원주문 번호를 가진 행들은 동일한 새 번호로 그룹 업데이트
- 주문 라인별로 같은 주문은 동일한 번호 유지
- **출고준비 번호** 컬럼이 있으면 `YYMMDD-#{SEQ4자리}` 형식으로 업데이트
  - '-' 앞쪽을 오늘 날짜(YYMMDD)로, '-' 뒤쪽 시퀀스를 +1씩 증가
  - 날짜 기반 시작 시퀀스 결정 방식은 원주문 번호와 동일
  - 같은 출고준비 번호를 가진 행들은 동일한 새 번호로 그룹 업데이트
- **주문일(B열)**: 오늘 이전이면 오늘 날짜(`YYYY-MM-DD`)로 변경
- **출고기한(C열)**: 오늘~오늘+2일 범위에서 임의 설정 (당일/익일/모레)

## 인자

```
update-shipment-order-import <파일명>
```

- `<파일명>`: `templates/` 폴더 아래의 파일명 (예: `LOGION-B2C-출고주문-템플릿.xlsx`)
- 파일명만 입력하면 되며, `templates/` 경로는 자동으로 붙습니다
- 인자 생략 시 기본값: `LOGION-B2C-출고주문-템플릿.xlsx`

## 처리 절차

### 1. 파일 확인

인자로 받은 `$ARGUMENTS`가 있으면 `templates/$ARGUMENTS`를 사용하고, 없으면 `templates/LOGION-B2C-출고주문-템플릿.xlsx`를 기본값으로 사용합니다.

```python
import openpyxl
from datetime import datetime
from collections import OrderedDict
import re
import sys

file_name = sys.argv[1] if len(sys.argv) > 1 else 'LOGION-B2C-출고주문-템플릿.xlsx'
file_path = f'templates/{file_name}'
wb = openpyxl.load_workbook(file_path)
ws = wb.active
```

### 2. 컬럼 위치 찾기

헤더 행에서 '원주문 번호'와 '출고준비 번호' 컬럼 위치를 찾습니다.

```python
order_no_col = None
wave_no_col = None
for col in range(1, ws.max_column + 1):
    header = ws.cell(1, col).value
    if header == '원주문 번호':
        order_no_col = col
    elif header == '출고준비 번호':
        wave_no_col = col

if order_no_col is None:
    print("❌ '원주문 번호' 컬럼을 찾을 수 없습니다.")
    exit(1)

print(f"'원주문 번호' 컬럼: {order_no_col}열")
if wave_no_col:
    print(f"'출고준비 번호' 컬럼: {wave_no_col}열")
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

### 4. 날짜 확인 및 시작 시퀀스 결정 (공통 함수)

```python
today = datetime.now().strftime('%y%m%d')

def calc_next_seq(last_val, date_pattern):
    """마지막 값에서 날짜 추출 후 시작 시퀀스 결정"""
    if not last_val:
        return 1
    date_match = re.search(date_pattern, str(last_val))
    if not date_match:
        return 1
    file_date = date_match.group(1)
    if file_date < today:
        print(f"  파일 날짜({file_date})가 오늘({today})보다 이전 → 0001부터 시작")
        return 1
    seq_match = re.search(r'-(\d+)$', str(last_val))
    if seq_match:
        last_seq = int(seq_match.group(1))
        next_seq = last_seq + 1
        print(f"  파일 날짜({file_date})가 오늘 → {last_seq:04d} 다음인 {next_seq:04d}부터 시작")
        return next_seq
    return 1
```

### 5. 고유 주문번호 추출 및 매핑 생성

```python
# 원주문 번호: DO-YYMMDD-XXXX 형식
next_seq = calc_next_seq(last_value, r'DO-(\d{6})-')
unique_values = list(OrderedDict.fromkeys([v for _, v in original_values]))
mapping = {}
seq = next_seq
for old_value in unique_values:
    mapping[old_value] = f"DO-{today}-{seq:04d}"
    seq += 1
```

### 6. 업데이트 적용 (원주문 번호)

```python
# 매핑에 따라 업데이트 (같은 원주문 번호는 같은 새 번호로)
for row, old_value in original_values:
    ws.cell(row, order_no_col).value = mapping[old_value]
```

### 6-1. 출고준비 번호 업데이트 (컬럼이 있는 경우만)

```python
if wave_no_col:
    wave_values = []
    for row in range(2, ws.max_row + 1):
        value = ws.cell(row, wave_no_col).value
        if value:
            wave_values.append((row, str(value)))

    if wave_values:
        last_wave = wave_values[-1][1]
        # 출고준비 번호: YYMMDD-XXXX 형식
        next_wave_seq = calc_next_seq(last_wave, r'^(\d{6})-')
        unique_wave = list(OrderedDict.fromkeys([v for _, v in wave_values]))
        wave_mapping = {}
        seq = next_wave_seq
        for old_val in unique_wave:
            wave_mapping[old_val] = f"{today}-{seq:04d}"
            seq += 1

        print(f"\n출고준비 번호 매핑 ({len(unique_wave)}개):")
        for old, new in wave_mapping.items():
            cnt = sum(1 for _, v in wave_values if v == old)
            print(f"  {old} → {new} ({cnt}개 행)")

        for row, old_val in wave_values:
            ws.cell(row, wave_no_col).value = wave_mapping[old_val]
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

### 특정 파일 지정 (파일명만)

```bash
/update-shipment-order-import LOGION-B2C-출고주문-템플릿.xlsx
```

## 실행 결과 예시

```
📂 파일: templates/LOGION-B2C-출고주문-템플릿.xlsx

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

| 조건 | 시작 시퀀스 | 원주문 번호 예시 | 출고준비 번호 예시 |
|------|------------|----------------|-----------------|
| 파일 날짜 < 오늘 | 0001부터 | DO-260329-0010 → DO-260330-0001 | 260329-0010 → 260330-0001 |
| 파일 날짜 = 오늘 | 마지막 seq + 1 | DO-260330-0010 → DO-260330-0011 | 260330-0010 → 260330-0011 |

### 같은 번호 그룹핑

- 원래 같은 번호였던 행들은 새 번호도 동일하게 유지 (원주문 번호, 출고준비 번호 모두 동일 적용)
- 주문 라인이 여러 개인 경우 모두 같은 번호로 업데이트

### 출고준비 번호

- 헤더에 '출고준비 번호' 컬럼이 없으면 해당 처리를 건너뜀
- 형식: `YYMMDD-XXXX` (원주문 번호와 달리 `DO-` 접두사 없음)

## 필요한 라이브러리

```bash
pip install openpyxl
```

## 주의사항

- 헤더 행에서 '원주문 번호' 컬럼을 자동 탐색합니다 (고정 열 위치 아님)
- `DO-YYMMDD-XXXX` 형식을 준수해야 합니다
- 출고준비 번호는 `YYMMDD-XXXX` 형식을 준수해야 합니다
- 같은 주문/준비 번호를 가진 라인들은 동일한 번호로 유지합니다
- 날짜가 바뀌면 자동으로 0001부터 새로 시작합니다
- 주문일(B열)은 오늘 이전일 때만 오늘로 변경 (오늘 이후면 유지)
- 출고기한(C열)은 항상 오늘~오늘+2일 범위로 재설정
