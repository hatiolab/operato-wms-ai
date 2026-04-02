기준정보 샘플 데이터를 생성해줘.

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
   - 질문: `샘플 데이터를 생성할 도메인 ID를 입력해주세요.`
   - 숫자가 아니거나 목록에 없는 ID면 재질문
   - 이미 해당 도메인에 기준정보 데이터가 있으면 아래 테이블의 건수를 조회하여 출력 후 선택지 제공:
     ```
     도메인 {id} ({name})에 이미 기준정보 데이터가 존재합니다.
       warehouses       : N건
       zones            : N건
       locations        : N건
       companies        : N건
       vendors          : N건
       customers        : N건
       sku              : N건
       box_types        : N건
       courier_contracts: N건
       expiration_dates : N건
       vas_boms         : N건
       vas_bom_items    : N건
       runtime_envs               : N건
       runtime_env_items          : N건
       warehouse_charge_settings  : N건
       warehouse_charge_setting_items: N건

     처리 방식을 선택해주세요.
       [1] 기존 데이터 유지 후 추가 생성
       [2] 기존 데이터 초기화 후 새로 생성
       [3] 취소
     ```
     - `1` → `reset_mode = false` 로 설정 후 계속
     - `2` → `reset_mode = true` 로 설정 후 계속
     - `3` 또는 그 외 → **중단**
   - 기존 데이터가 없으면 `reset_mode = false` 로 설정

2. **업종 선택**
   - 질문:
     ```
     업종을 선택해주세요.
       [1] 식품 / 식료품 (Food)
       [2] 애견용품 (Pet Supplies)
       [3] 전자제품 / 전자부품 (Electronics)
       [4] 패션 / 의류 (Fashion)
       [5] 생활용품 / 잡화 (Household Goods)
     번호를 입력해주세요. (1~5)
     ```
   - 1~5 범위 외 입력 시 재질문
   - 선택값을 `industry` 변수에 저장

3. **피킹 존 로케이션 수**
   - 질문: `피킹 존(PICKABLE) 로케이션 수를 입력해주세요. (기본값: 20)`
   - 기본값: 20, 숫자가 아니거나 1 미만이면 재질문
   - `pick_loc_count` 에 저장

4. **화주사(companies) 수**
   - 질문: `화주사(companies) 수를 입력해주세요. (기본값: 1)`
   - 기본값: 1, 숫자가 아니거나 1 미만이면 재질문
   - `company_count` 에 저장

5. **거래처(customers) 수**
   - 질문: `거래처(customers) 수를 입력해주세요. (기본값: 3)`
   - 기본값: 3, 숫자가 아니거나 1 미만이면 재질문
   - `customer_count` 에 저장

6. **공급처(vendors) 수**
   - 질문: `공급처(vendors) 수를 입력해주세요. (기본값: 3)`
   - 기본값: 3, 숫자가 아니거나 1 미만이면 재질문
   - `vendor_count` 에 저장

7. **상품(SKU) 수**
   - 질문: `상품(SKU) 수를 입력해주세요. (기본값: 100)`
   - 기본값: 100, 숫자가 아니거나 1 미만이면 재질문
   - `sku_count` 에 저장

8. **VAS BOM 수**
   - 질문: `VAS BOM 수를 입력해주세요. (기본값: 10, 0이면 생성 안 함)`
   - 기본값: 10, 숫자가 아니거나 0 미만이면 재질문
   - `vas_count` 에 저장

모든 항목 수집 후 확인 메시지 출력:

```
아래 내용으로 기준정보 샘플 데이터를 생성합니다.

  대상 도메인      : [{domain_id}] {domain_name}
  초기화 여부      : {"⚠ 기존 데이터 초기화 후 새로 생성" if reset_mode else "기존 데이터 유지 후 추가 생성"}
  업종             : {industry_label}
  피킹 로케이션    : {pick_loc_count}개
  화주사           : {company_count}개
  거래처           : {customer_count}개
  공급처           : {vendor_count}개
  상품(SKU)        : {sku_count}개
  VAS BOM          : {vas_count}개

  + 창고 1개, 구역 5개(입고대기/피킹/출고/폐기/VAS), 나머지 구역 로케이션 각 1개
  + 박스유형 3개(S/M/L), 택배사계약 1개, 유효기간정책 2개
  + 화주사별: 런타임환경 설정(17항목), 창고요금설정(입고/출고 작업료, 각 5구간)

진행할까요? (y/n)
```

사용자가 `n` 또는 취소 의사를 밝히면 **중단**한다.

---

### Step 1: DB 접속 준비

DB 접속 정보는 `frontend/packages/operato-wes/config/config.development.js` 의 `ormconfig` 섹션에서 확인한다.
Python psycopg2 사용 (미설치 시 `pip3 install psycopg2-binary`).

---

### Step 1-5: 기존 데이터 초기화 (reset_mode = true 일 때만 실행)

`reset_mode = false` 이면 이 Step을 건너뛴다.

아래 테이블을 **FK 의존성 역순**으로 `domain_id = {domain_id}` 조건으로 DELETE한다.
각 테이블 삭제 후 삭제 건수를 출력한다.

```python
reset_tables = [
    'runtime_env_items',              # runtime_envs 참조
    'runtime_envs',
    'warehouse_charge_setting_items', # warehouse_charge_settings 참조
    'warehouse_charge_settings',
    'vas_bom_items',                  # vas_boms 참조
    'vas_boms',
    'courier_contracts',
    'box_types',
    'sku',
    'customers',
    'vendors',
    'companies',
    'locations',                      # zones 참조
    'zones',                          # warehouses 참조
    'warehouses',
    'expiration_dates',
]

for table in reset_tables:
    DELETE FROM {table} WHERE domain_id = {domain_id}
    print(f'  ✓ {table} {rowcount}건 삭제')
```

삭제 완료 후 출력:
```
⚠ 기존 기준정보 데이터 초기화 완료
  총 {총삭제건수}건 삭제
```

---

### Step 2: 업종별 데이터 템플릿 결정

`industry` 값에 따라 아래 템플릿을 사용한다. 이 템플릿은 코드 prefix, 상품명 패턴, 공급업체 유형, 거래처 유형 등을 결정한다.

#### [1] 식품 / 식료품 (Food)

```python
industry_label   = '식품 / 식료품'
com_prefix       = 'FOOD'        # 화주사 코드 prefix
vend_types       = ['SUPPLIER', 'SUPPLIER', 'COLD_CHAIN']  # vendor_count 수만큼 순환
cust_types       = ['B2B', 'B2B', 'B2C']  # customer_count 수만큼 순환

warehouse = {
    'wh_cd': 'WH001', 'wh_nm': '{com_prefix} 통합 물류센터',
    'wh_type': 'GENERAL', 'op_type': '3PL'
}

zones = [
    ('Z-RCV',  '입고 대기 존',   'RCV-WAIT', 'ROOM'),
    ('Z-PICK', '피킹 존',        'PICKABLE',  'ROOM'),
    ('Z-SHIP', '출고 작업 존',   'PICKING',   'ROOM'),
    ('Z-DEF',  '불량/폐기 존',   'DEFECT',    'ROOM'),
    ('Z-VAS',  '유통가공 작업장','VAS',       'ROOM'),
]

sku_categories = [
    # (name_prefix, names[], temp_type, use_expire, sku_type, box_in_qty)
    ('GRN', ['쌀 20kg', '잡곡 혼합 10kg', '찹쌀 5kg', '현미 10kg', '보리 5kg',
             '귀리 5kg', '수수 3kg', '흑미 5kg', '메밀 3kg', '녹두 1kg'],
     'ROOM', True, 'ITEM', 10),
    ('SNK', ['포테이토칩 오리지널', '포테이토칩 BBQ', '새우깡', '꿀버터칩',
             '고구마칩', '팝콘 버터맛', '뻥튀기 대용량', '쌀과자 50g',
             '크래커 모음', '웨하스 바닐라'],
     'ROOM', True, 'ITEM', 100),
    ('BEV', ['생수 500mL×24', '생수 2L×6', '녹차 500mL', '홍차 500mL',
             '오렌지주스 1L', '사과주스 1L', '우유 1L', '두유 190mL×16',
             '에너지드링크 250mL', '탄산수 500mL'],
     'ROOM', True, 'ITEM', 24),
    ('FRZ', ['냉동 삼겹살 1kg', '냉동 닭가슴살 500g', '냉동 새우 500g',
             '냉동 만두 1kg', '냉동 피자 400g', '냉동 볶음밥 500g',
             '아이스크림 바닐라 900mL', '냉동 블루베리 500g',
             '냉동 연어 500g', '냉동 갈비 1kg'],
     'FROZEN', True, 'ITEM', 20),
    ('REF', ['신선 딸기 500g', '신선 방울토마토 500g', '신선 파프리카 200g',
             '신선 양상추 200g', '신선 브로콜리 200g'],
     'COLD', True, 'ITEM', 10),
    ('SOS', ['간장 500mL', '고추장 500g', '된장 500g', '참기름 450mL',
             '들기름 450mL', '식초 500mL', '굴소스 500g', '마요네즈 500g',
             '케첩 500g', '올리브오일 500mL'],
     'ROOM', True, 'ITEM', 12),
    ('CNF', ['통조림 참치 150g', '통조림 고등어 200g', '통조림 꽁치 200g',
             '햄 340g', '스팸 200g'],
     'ROOM', True, 'ITEM', 24),
]

# VAS 세트 상품 예시
vas_set_templates = [
    ('명절 선물세트 A', 'SET_ASSEMBLY',
     [('GRN', 2.0), ('SNK', 3.0), ('SOS', 2.0)]),
    ('건강식품 패키지', 'REPACK',
     [('GRN', 1.0), ('BEV', 2.0)]),
    ('간편식 모음 세트', 'SET_ASSEMBLY',
     [('FRZ', 2.0), ('SNK', 2.0)]),
    ('음료 혼합 패키지', 'REPACK',
     [('BEV', 4.0), ('SNK', 1.0)]),
    ('캠핑 식품 패키지', 'SET_ASSEMBLY',
     [('CNF', 3.0), ('SNK', 2.0), ('BEV', 2.0)]),
]
```

#### [2] 애견용품 (Pet Supplies)

```python
industry_label   = '애견용품'
com_prefix       = 'PET'

zones = [
    ('Z-RCV',  '입고 대기 존',   'RCV-WAIT', 'ROOM'),
    ('Z-PICK', '피킹 존',        'PICKABLE',  'ROOM'),
    ('Z-SHIP', '출고 작업 존',   'PICKING',   'ROOM'),
    ('Z-DEF',  '불량/폐기 존',   'DEFECT',    'ROOM'),
    ('Z-VAS',  '유통가공 작업장','VAS',       'ROOM'),
]

sku_categories = [
    ('FD',  ['강아지 사료 소형견 2kg', '강아지 사료 대형견 5kg', '강아지 사료 퍼피 1.5kg',
             '고양이 사료 실내 1.5kg', '강아지 사료 노령견 2kg',
             '습식사료 치킨맛 100g', '습식사료 소고기맛 100g',
             '처방식 사료 신장케어 1kg', '자연식 사료 오리고기 200g',
             '처방식 사료 피부케어 1kg'],
     'ROOM', True, 'ITEM', 20),
    ('TRT', ['강아지 간식 져키 100g', '강아지 간식 연어 50g', '고양이 간식 츄르 14g×4',
             '강아지 치아간식 덴탈껌', '강아지 간식 고구마 100g',
             '고양이 간식 동결건조 20g', '강아지 뼈다귀 간식',
             '강아지 간식 닭가슴살 스틱', '고양이 간식 참치 파우치',
             '강아지 프리미엄 간식 세트'],
     'ROOM', True, 'ITEM', 50),
    ('TOY', ['강아지 로프 장난감', '강아지 테니스공 3개세트', '고양이 낚싯대',
             '강아지 노즈워크 매트', '고양이 터널 장난감',
             '강아지 삑삑이 인형', '고양이 레이저 포인터',
             '강아지 IQ 퍼즐 장난감', '고양이 스크래처 판',
             '강아지 터그 장난감'],
     'ROOM', False, 'ITEM', 10),
    ('BED', ['강아지 쿠션 방석 소형', '강아지 쿠션 방석 대형', '고양이 숨숨집',
             '강아지 침대 도넛형', '고양이 해먹',
             '강아지 이동가방 소프트', '고양이 캐리어 하드케이스'],
     'ROOM', False, 'ITEM', 5),
    ('CLN', ['강아지 샴푸 500mL', '강아지 컨디셔너 500mL', '고양이 드라이샴푸',
             '강아지 발바닥 크림', '반려동물 귀세정제 100mL',
             '강아지 치약 세트', '반려동물 눈물자국 클리너',
             '발냄새 제거 스프레이', '항균 바디워시 펌프형'],
     'ROOM', True, 'ITEM', 20),
    ('HTH', ['종합 영양제 60정', '관절 영양제 오메가3', '유산균 영양제 30포',
             '눈건강 영양제', '피부모질 영양제'],
     'ROOM', True, 'ITEM', 30),
]

vas_set_templates = [
    ('애견 입양 스타터 키트', 'SET_ASSEMBLY',
     [('FD', 1.0), ('TRT', 2.0), ('TOY', 1.0), ('CLN', 1.0)]),
    ('강아지 생일 선물 세트', 'REPACK',
     [('TRT', 3.0), ('TOY', 2.0)]),
    ('고양이 케어 패키지', 'SET_ASSEMBLY',
     [('FD', 1.0), ('TRT', 2.0), ('CLN', 1.0)]),
    ('반려동물 건강 패키지', 'REPACK',
     [('HTH', 2.0), ('FD', 1.0)]),
    ('소형견 프리미엄 세트', 'SET_ASSEMBLY',
     [('FD', 1.0), ('TRT', 2.0), ('BED', 1.0), ('CLN', 1.0)]),
]
```

#### [3] 전자제품 / 전자부품 (Electronics)

```python
industry_label   = '전자제품 / 전자부품'
com_prefix       = 'ELEC'

zones = [
    ('Z-RCV',  '입고 대기 존',   'RCV-WAIT', 'ROOM'),
    ('Z-PICK', '피킹 존',        'PICKABLE',  'ROOM'),
    ('Z-SHIP', '출고 작업 존',   'PICKING',   'ROOM'),
    ('Z-DEF',  '불량/폐기 존',   'DEFECT',    'ROOM'),
    ('Z-VAS',  '유통가공 작업장','VAS',       'ROOM'),
]

sku_categories = [
    ('IC',  ['MCU STM32F103', 'MCU ATmega328P', 'MCU ESP32-WROOM', 'FPGA Xilinx XC7A35T',
             'DSP TMS320C6748', 'CPU i.MX8M Plus', 'SoC RK3399', 'MCU RP2040',
             'MCU STM32H743', 'ARM Cortex-M4 STM32F4'],
     'ROOM', False, 'ITEM', 500),
    ('MEM', ['DDR4 4GB Samsung', 'DDR4 8GB SK Hynix', 'NAND Flash 32GB',
             'EEPROM 256Kbit', 'SRAM 1Mbit', 'NOR Flash 128Mbit',
             'DDR3 2GB Micron', 'eMMC 64GB', 'SD Card 32GB', 'USB Flash 16GB'],
     'ROOM', False, 'ITEM', 200),
    ('CAP', ['전해 커패시터 100uF/50V', '세라믹 커패시터 100nF/50V',
             '탄탈 커패시터 10uF/16V', '필름 커패시터 1uF/63V',
             '전해 커패시터 1000uF/16V', 'MLCC 0402 10nF',
             'MLCC 0603 100nF', '전해 커패시터 220uF/35V',
             '세라믹 커패시터 10pF/100V', '전해 커패시터 470uF/25V'],
     'ROOM', False, 'ITEM', 1000),
    ('CON', ['USB-C 커넥터 16핀', 'HDMI 커넥터 19핀', 'RJ45 커넥터 8핀',
             'JST-XH 2핀 커넥터', 'JST-PH 4핀 커넥터',
             'D-Sub 9핀 수', 'SMA RF 커넥터', 'IDC 10핀 소켓',
             'FPC 커넥터 20핀 0.5mm', 'XH 커넥터 3핀',
             'PCI-E 16x 슬롯', 'D-Sub 9핀 암'],
     'ROOM', False, 'ITEM', 300),
    ('SEN', ['온습도 센서 DHT22', '압력 센서 BMP280', '가속도계 MPU-6050',
             '거리 센서 HC-SR04', '조도 센서 BH1750', 'CO2 센서 MH-Z19B',
             '홀 센서 A3144', '전류 센서 ACS712 30A', 'GPS 모듈 NEO-6M'],
     'ROOM', False, 'ITEM', 100),
    ('PWR', ['DC-DC 벅 컨버터 5V/3A', 'LDO 레귤레이터 LM7805',
             'AC-DC 어댑터 12V/2A', '리튬전지 3.7V 2000mAh',
             'MOSFET N채널 IRF540N', 'IGBT 모듈 600V/75A',
             '퓨즈 5A 250V', '전원 릴레이 12V'],
     'ROOM', False, 'ITEM', 200),
    ('CBL', ['USB-A to USB-C 1m', 'HDMI 케이블 2m', 'LAN CAT6 케이블 1m',
             'RS232 시리얼 케이블 1.5m', 'GPIO 점퍼 케이블 20cm F-F',
             'USB-A to Micro-B 1m', 'RS485 케이블 2m'],
     'ROOM', False, 'ITEM', 100),
    ('PKG', ['ESD 방지 봉투 소형', 'ESD 방지 봉투 중형',
             '에어캡 쿠션 50x50cm', '완충 스펀지 A4',
             '정전기 방지 트레이', 'PP 수납 케이스 소형'],
     'ROOM', False, 'ITEM', 500),
]

vas_set_templates = [
    ('MCU 스타터 키트', 'SET_ASSEMBLY',
     [('IC', 1.0), ('CAP', 4.0), ('CON', 1.0)]),
    ('IoT 센서 모듈 패키지', 'SET_ASSEMBLY',
     [('IC', 1.0), ('SEN', 2.0), ('CBL', 1.0)]),
    ('전원 관리 키트', 'SET_ASSEMBLY',
     [('PWR', 2.0), ('CAP', 2.0)]),
    ('메모리 번들 패키지', 'REPACK',
     [('MEM', 2.0), ('PKG', 1.0)]),
    ('전자부품 샘플 키트', 'REPACK',
     [('CAP', 5.0), ('CON', 3.0), ('PKG', 1.0)]),
]
```

#### [4] 패션 / 의류 (Fashion)

```python
industry_label   = '패션 / 의류'
com_prefix       = 'FASH'

zones = [
    ('Z-RCV',  '입고 대기 존',   'RCV-WAIT', 'ROOM'),
    ('Z-PICK', '피킹 존',        'PICKABLE',  'ROOM'),
    ('Z-SHIP', '출고 작업 존',   'PICKING',   'ROOM'),
    ('Z-DEF',  '불량/반품 존',   'DEFECT',    'ROOM'),
    ('Z-VAS',  '태그/포장 작업장','VAS',      'ROOM'),
]

sku_categories = [
    ('TOP', ['반팔 티셔츠 화이트 S', '반팔 티셔츠 화이트 M', '반팔 티셔츠 화이트 L',
             '반팔 티셔츠 블랙 S', '반팔 티셔츠 블랙 M', '반팔 티셔츠 블랙 L',
             '긴팔 티셔츠 그레이 M', '긴팔 티셔츠 네이비 M',
             '후드티 오트밀 M', '후드티 블랙 L'],
     'ROOM', False, 'ITEM', 30),
    ('BOT', ['청바지 슬림핏 28', '청바지 슬림핏 30', '청바지 슬림핏 32',
             '면바지 베이지 30', '면바지 카키 30',
             '반바지 네이비 M', '반바지 카키 M',
             '레깅스 블랙 S', '레깅스 블랙 M', '슬랙스 차콜 32'],
     'ROOM', False, 'ITEM', 20),
    ('OUT', ['패딩 점퍼 블랙 M', '패딩 점퍼 네이비 L',
             '트렌치코트 베이지 M', '가죽자켓 블랙 M',
             '바람막이 그레이 M', '니트 가디건 아이보리 M',
             '울코트 카멜 M', '후드집업 그레이 L'],
     'ROOM', False, 'ITEM', 10),
    ('SHO', ['스니커즈 화이트 260', '스니커즈 화이트 265', '스니커즈 화이트 270',
             '슬립온 블랙 260', '로퍼 브라운 265',
             '샌들 베이지 250', '부츠 블랙 260',
             '러닝화 블루 270', '캔버스화 화이트 265'],
     'ROOM', False, 'ITEM', 20),
    ('BAG', ['숄더백 블랙', '토트백 베이지', '백팩 네이비',
             '크로스백 브라운', '클러치 블랙',
             '에코백 화이트', '웨이스트백 블랙'],
     'ROOM', False, 'ITEM', 10),
    ('ACC', ['울 머플러 그레이', '비니 블랙', '버킷햇 베이지',
             '선글라스 블랙 프레임', '벨트 블랙 105cm',
             '양말 5켤레 세트', '장갑 울혼방 M'],
     'ROOM', False, 'ITEM', 50),
]

vas_set_templates = [
    ('봄 코디 패키지', 'SET_ASSEMBLY',
     [('TOP', 1.0), ('BOT', 1.0), ('SHO', 1.0)]),
    ('가을 레이어드 세트', 'SET_ASSEMBLY',
     [('TOP', 1.0), ('OUT', 1.0), ('ACC', 1.0)]),
    ('출근룩 패키지', 'REPACK',
     [('TOP', 1.0), ('BOT', 1.0), ('BAG', 1.0)]),
    ('선물 패키지 리본포장', 'REPACK',
     [('ACC', 2.0), ('BAG', 1.0)]),
    ('운동화 케어 세트', 'SET_ASSEMBLY',
     [('SHO', 1.0), ('ACC', 1.0)]),
]
```

#### [5] 생활용품 / 잡화 (Household Goods)

```python
industry_label   = '생활용품 / 잡화'
com_prefix       = 'HOME'

zones = [
    ('Z-RCV',  '입고 대기 존',   'RCV-WAIT', 'ROOM'),
    ('Z-PICK', '피킹 존',        'PICKABLE',  'ROOM'),
    ('Z-SHIP', '출고 작업 존',   'PICKING',   'ROOM'),
    ('Z-DEF',  '불량/폐기 존',   'DEFECT',    'ROOM'),
    ('Z-VAS',  '유통가공 작업장','VAS',       'ROOM'),
]

sku_categories = [
    ('CLN', ['주방세제 500mL', '주방세제 1L 리필', '세탁세제 액체 3L',
             '섬유유연제 2L', '주방 漂白제 500mL', '욕실 세정제 500mL',
             '유리 세정제 500mL', '세탁세제 분말 3kg',
             '다목적 세정제 스프레이', '변기세정제 500mL'],
     'ROOM', True, 'ITEM', 12),
    ('KIT', ['주방 수세미 3개입', '고무장갑 M', '고무장갑 L',
             '행주 면 5장', '알루미늄 호일 30m', '랩 30m',
             '지퍼백 소 50매', '지퍼백 중 30매', '종이타월 150매×3롤',
             '비닐봉지 30매'],
     'ROOM', False, 'ITEM', 20),
    ('BTH', ['샴푸 500mL', '린스 500mL', '바디워시 500mL',
             '폼클렌징 150mL', '치약 150g', '칫솔 3개입',
             '면도기 4중날', '생리대 30매', '화장솜 100매',
             '핸드크림 75mL'],
     'ROOM', True, 'ITEM', 24),
    ('STG', ['수납박스 소형 3개세트', '수납박스 중형 2개세트',
             '행거 스텐 이동식', '옷걸이 플라스틱 10개',
             '서랍 정리함 5칸', '신발정리함 4단',
             '벽걸이 선반 2단', '투명 수납박스 12L'],
     'ROOM', False, 'ITEM', 5),
    ('LIT', ['LED 전구 9W E26', 'LED 전구 13W E26',
             'LED 형광등 30W', '멀티탭 4구 2m', '멀티탭 6구 3m',
             'USB 충전 어댑터 20W', '연장선 3구 5m',
             'AA 건전지 8개입', 'AAA 건전지 8개입'],
     'ROOM', False, 'ITEM', 30),
    ('PET', ['물티슈 100매×3팩', '화장지 30m×30롤',
             '키친타월 200매', '위생봉투 50매',
             '마스크 KF94 10매', '일회용 장갑 100매'],
     'ROOM', False, 'ITEM', 24),
]

vas_set_templates = [
    ('신혼 살림 패키지', 'SET_ASSEMBLY',
     [('KIT', 2.0), ('CLN', 2.0), ('BTH', 2.0)]),
    ('입주 청소 세트', 'REPACK',
     [('CLN', 3.0), ('KIT', 2.0)]),
    ('욕실 용품 패키지', 'SET_ASSEMBLY',
     [('BTH', 3.0), ('PET', 1.0)]),
    ('수납 정리 세트', 'REPACK',
     [('STG', 2.0), ('KIT', 1.0)]),
    ('가정 필수품 패키지', 'SET_ASSEMBLY',
     [('CLN', 1.0), ('BTH', 1.0), ('LIT', 1.0), ('PET', 1.0)]),
]
```

---

### Step 3: 창고 / 구역 / 로케이션 생성

DB 접속 정보를 읽고, 아래 순서로 생성한다.

#### 3-1. 창고 (warehouses) — 1건

```python
INSERT INTO warehouses (id, domain_id, wh_cd, wh_nm, wh_alias, wh_type, op_type,
    zip_cd, address, del_flag, remarks, creator_id, updater_id, created_at, updated_at)
VALUES (uuid4(), {domain_id}, 'WH001', '{com_prefix} 물류센터', '{com_prefix}-WH1',
        업종별 wh_type, '3PL', '', '', false, '샘플 창고', 1, 1, now(), now())
```

#### 3-2. 구역 (zones) — 5건

업종별 zones 템플릿 사용. `wh_cd = 'WH001'`, `temp_type = 'ROOM'`.
- `rack_type`: zone_type=`PICKABLE` 또는 `PICKING`이면 `'SHELF'`, 나머지는 `'PLAIN'`

#### 3-3. 로케이션 (locations)

모든 로케이션 공통 설정:
- `mixable_flag = true`, `loc_type = 'NORMAL'`, `temp_type = 'ROOM'`
- `rack_type`: zone_type=`PICKABLE` 또는 `PICKING`인 존은 `'SHELF'`, 나머지는 `'PLAIN'`
- `restrict_type`: zone_type=`DEFECT`인 존은 `'OUT'`, 나머지는 `null`

- **Z-RCV** (입고 대기): `A-01-01` 1건 — rack_type=`PLAIN`
- **Z-PICK** (피킹): `B-{row:02d}-{col:02d}` 형식으로 `pick_loc_count`건 생성 — rack_type=`SHELF`
  - row는 01부터, 각 row당 최대 6개 col, 넘치면 row 증가
- **Z-SHIP** (출고): `STG-01` 1건 — rack_type=`SHELF`
- **Z-DEF** (불량/폐기): `NG-01` 1건 — rack_type=`PLAIN`, restrict_type=`OUT`
- **Z-VAS** (유통가공): `VAS-01` 1건 — rack_type=`PLAIN`

---

### Step 4: 화주사 (companies) 생성

`company_count` 만큼 생성한다.

```python
for i in range(1, company_count + 1):
    com_cd  = f'{com_prefix}{i:02d}'
    com_nm  = f'({업종별 법인 유형}) {com_prefix}{i:02d} 주식회사'  # 예: (주)FOOD01
    INSERT INTO companies (id, domain_id, com_cd, com_nm, com_alias, biz_lic_no,
        com_tel_no, com_zip_cd, com_addr, contract_type, del_flag,
        creator_id, updater_id, created_at, updated_at)
    VALUES (uuid4(), {domain_id}, com_cd, com_nm, com_cd,
            f'{100+i:03d}-{10+i:02d}-{10000+i:05d}',
            f'02-{1000+i:04d}-{2000+i:04d}',
            f'{0+i:05d}', f'서울특별시 강남구 샘플로 {i}',
            'CONSIGNMENT', false, 1, 1, now(), now())
```

첫 번째 화주사 코드(`{com_prefix}01`)를 `primary_com_cd` 로 저장하여 이후 SKU/VAS/런타임환경에서 사용한다.

---

### Step 5: 공급처 (vendors) 생성

`vendor_count` 만큼 생성한다. 택배사 1개는 고정으로 추가한다.

```python
for i in range(1, vendor_count + 1):
    vend_cd   = f'VD{i:03d}'
    vend_type = vend_types[(i-1) % len(vend_types)]
    vend_nm   = 업종별 공급업체명 패턴으로 생성
    INSERT INTO vendors (id, domain_id, com_cd, vend_cd, vend_nm, vend_alias, vend_type,
        vend_mgr_nm, vend_mgr_email, vend_mgr_phone, del_flag,
        creator_id, updater_id, created_at, updated_at)

# 택배사 고정 추가 (CJ대한통운)
INSERT INTO vendors (..., vend_cd='CJ001', vend_nm='CJ대한통운', vend_type='COURIER', ...)
```

---

### Step 6: 거래처 (customers) 생성

`customer_count` 만큼 생성한다.

```python
for i in range(1, customer_count + 1):
    cust_cd   = f'CUST{i:03d}'
    cust_type = cust_types[(i-1) % len(cust_types)]
    cust_nm   = 업종별 거래처명 패턴으로 생성  # 예: (주)고객사001
    INSERT INTO customers (id, domain_id, com_cd, cust_cd, cust_nm, cust_type,
        cust_tel_no, cust_zip_cd, cust_addr, del_flag,
        creator_id, updater_id, created_at, updated_at)
```

거래처명은 업종에 맞게 생성:
- 식품: `(주)유통채널{i:03d}`, `{i:03d}마트`, `온라인몰{i:03d}` 순환
- 애견용품: `(주)펫샵{i:03d}`, `동물병원{i:03d}`, `온라인펫몰{i:03d}` 순환
- 전자제품: `(주)전자유통{i:03d}`, `{i:03d}전자`, `IT부품상사{i:03d}` 순환
- 패션: `(주)패션유통{i:03d}`, `스타일샵{i:03d}`, `온라인몰{i:03d}` 순환
- 생활용품: `(주)생활유통{i:03d}`, `홈마트{i:03d}`, `온라인몰{i:03d}` 순환

---

### Step 7: 상품 (SKU) 생성

`sku_count` 만큼 생성한다. 업종별 `sku_categories` 템플릿을 순환하면서 채운다.

```python
# sku_categories 내 상품명 목록을 순환하며 sku_count개 생성
# 모든 상품명을 사용한 경우 패턴 변형(숫자 suffix 추가)으로 계속 생성
# 벤더는 vend_types 기반으로 순환 배정 (CJ001 제외)

idx = 0
for sku_no in range(1, sku_count + 1):
    cat = sku_categories[idx % len(sku_categories)]
    cat_prefix, names, temp_type, use_exp, sku_type, box_qty = cat
    name_idx = (sku_no - 1) // len(sku_categories) * len(sku_categories)
    sku_cd   = f'{com_prefix}-{sku_no:03d}'
    sku_nm   = names[(sku_no - 1) % len(names)]  # 순환, 중복 시 suffix 추가
    barcd    = f'88{domain_id:02d}{sku_no:06d}'
    vend_cd  = f'VD{(sku_no % vendor_count) + 1:03d}'

    # 카테고리별 치수/무게/팔레트 입수 — cat_prefix 기준으로 적당한 값 사용
    # (sku_wd, sku_len, sku_ht 단위: cm / sku_wt 단위: g)
    dims = get_sku_dims(cat_prefix, sku_nm)
    # get_sku_dims() 반환: dict { wd, len, ht, wt, plt_in_qty }
    # sku_vol = wd * len * ht (자동 계산)

    # 유효기간 관련 (use_exp=True인 경우에만 값 설정, False이면 모두 0)
    if use_exp:
        expire_period      = 카테고리별 적정값 (예: 180~730일)
        prd_expired_period = expire_period + 추가 여유기간 (예: 90~365일)
        imminent_period    = 30~60일
        no_out_period      = 7~14일
    else:
        expire_period = prd_expired_period = imminent_period = no_out_period = 0

    INSERT INTO sku (id, domain_id, com_cd, vend_cd, sku_cd, sku_nm, sku_barcd,
        sku_type, stock_unit, temp_type, use_expire_date, bom_set_flag, del_flag,
        plt_in_qty, sku_wd, sku_len, sku_ht, sku_vol, sku_wt,
        expire_period, prd_expired_period, imminent_period, no_out_period,
        creator_id, updater_id, created_at, updated_at)
    idx += 1
```

**카테고리별 치수/무게 기준값** (업종 템플릿에서 `box_in_qty`와 함께 정의):

| 크기 유형 | 가로(wd) | 세로(len) | 높이(ht) | 무게(wt) | plt_in_qty |
|---|---|---|---|---|---|
| 대형 (사료, 침구 등) | 30~50 cm | 40~60 cm | 15~20 cm | 500~5000 g | 10~40 |
| 중형 (간식, 장난감 등) | 12~25 cm | 15~30 cm | 5~15 cm | 100~800 g | 50~150 |
| 소형 (영양제, 위생용품 등) | 5~10 cm | 5~10 cm | 10~20 cm | 100~500 g | 100~200 |
| 세트 상품 | 30~40 cm | 35~45 cm | 20~30 cm | 1000~3000 g | 10~20 |

**중복 상품명 처리**: 같은 이름이 반복될 경우 ` #{n}` suffix를 붙여 구분.

---

### Step 8: 박스 유형 (box_types) 생성 — 3건 고정

```python
# company_id는 primary_com_cd에 해당하는 companies.id 조회 후 사용
boxes = [
    ('S-BOX', 'S형 소형박스', 30.0, 20.0, 15.0),
    ('M-BOX', 'M형 중형박스', 40.0, 30.0, 25.0),
    ('L-BOX', 'L형 대형박스', 60.0, 40.0, 35.0),
]
INSERT INTO box_types (id, domain_id, com_cd, wh_cd, company_id, box_type_cd, box_type_nm,
    box_len, box_wd, box_ht, box_vol, creator_id, updater_id, created_at, updated_at)
```

---

### Step 9: 택배사 계약 (courier_contracts) 생성 — 1건 고정

```python
INSERT INTO courier_contracts (id, domain_id, dlv_vend_cd, contract_no,
    start_bandwidth, end_bandwidth, total_cnt, use_cnt, remain_cnt, remarks,
    creator_id, updater_id, created_at, updated_at)
VALUES (uuid4(), {domain_id}, 'CJ001', 'CJ-2026-001',
        '621000000001', '621000001000', 1000, 0, 1000,
        'CJ대한통운 2026년 1차 계약', 1, 1, now(), now())
```

---

### Step 10: 유효기간 정책 (expiration_dates) 생성 — 2건 고정

```python
items = [
    ('제조일자 기준 관리', '제조일자 기준으로 유통기한 D+730일 적용', True),
    ('유통기한 직접 입력', '입고 시 유통기한을 직접 스캔/입력하여 관리', True),
]
INSERT INTO expiration_dates (id, domain_id, name, description, active_flag,
    creator_id, updater_id, created_at, updated_at)
```

---

### Step 11: VAS BOM 생성

`vas_count` 가 0이면 이 Step을 건너뛴다.

1. **세트 SKU 생성**: `vas_count` 만큼 세트 상품 SKU를 추가 생성 (`bom_set_flag = true`, `sku_type = 'SET'`)
   - sku_cd: `{com_prefix}-SET-{i:03d}`, sku_nm: 업종별 `vas_set_templates[i].name`
   - 템플릿이 부족하면 `{name} #{n}` 형태로 반복

2. **VAS BOM 생성**: 각 세트 SKU에 대해 `vas_boms` INSERT
   - `bom_no`: `BOM-{com_prefix}-{i:03d}`
   - `vas_type`: 템플릿의 `vas_type`
   - `status`: `ACTIVE`
   - `valid_from`: `2026-01-01`, `valid_to`: `2026-12-31`

3. **VAS BOM 구성품 생성**: 각 BOM에 대해 `vas_bom_items` INSERT
   - 템플릿의 구성 카테고리(예: `('GRN', 2.0)`)에서 해당 카테고리의 첫 번째 SKU를 사용
   - `bom_seq`: 1부터 순번
   - `component_count`, `total_component_qty` 집계 후 `vas_boms` UPDATE

---

### Step 12: 런타임 환경 설정 및 창고 요금 설정

화주사(`companies`)별로 아래를 반복한다. 생성된 모든 화주사 코드 목록(`com_cd_list = [{com_prefix}01, {com_prefix}02, ...]`)을 순회한다.

#### 12-1. runtime_envs — 화주사별 1건

```python
for com_cd in com_cd_list:
    INSERT INTO runtime_envs (id, domain_id, wh_cd, com_cd,
        creator_id, updater_id, created_at, updated_at)
    VALUES (uuid4(), {domain_id}, 'WH001', com_cd, 1, 1, now(), now())
```

#### 12-2. runtime_env_items — 화주사별 17건

```python
for com_cd in com_cd_list:
    runtime_env_id = 해당 화주사의 runtime_envs.id

    items = [
        ('inbound',  'in.putaway.strategy',                    '입고 적치 전략',                        'DISTANCE',              '잘 나가는 상품이 출고장에 가깝게 적치'),
        ('inbound',  'in.receipt.finish.location',              '입고 처리 완료시 기본 로케이션',          'A-01-01',               '입고 대기 존'),
        ('inbound',  'in.receipt.finish.auto.flag',             '입고 완료시 자동 완료 처리 여부',         'false',                 None),
        ('inbound',  'in.receipt.qty.auto.setting.flag',        '입고 수량 자동 계산 처리',               'false',                 None),
        ('inbound',  'in.receipt.order.sheet.template',         '입고지시서 템플릿',                      'RECEIVING_ORDER_SHEET', '값이 없다면 출력하지 않음'),
        ('inventory','inv.barcode.label.template',              '바코드 라벨 템플릿',                     'INVENTORY_BARCODE',     None),
        ('outbound', 'out.picking.reservation.strategy',        '할당 전략',                             'FIFO',                  'FIFO / EXPIRED_DATE / MANUAL'),
        ('outbound', 'out.picking.reservation.method',          '피킹 예약 방식',                         'INV_CHECK_ONLY',        None),
        ('outbound', 'out.picking.order.sheet.template',        '피킹지시서 템플릿',                      'PICKING_ORDER_SHEET',   '값이 없다면 출력하지 않음'),
        ('outbound', 'out.picking.order.auto-close.enabled',    '피킹 완료시 자동 마감 여부',              'false',                 None),
        ('outbound', 'out.picking.auto-start.release-order.started', '출고 피킹 시작시 자동 시작 여부',  'false',                 None),
        ('outbound', 'out.wave.creation.trigger',               '웨이브 생성 트리거',                     'MANUAL',                'SCHEDULER / ORDER_COUNT / MANUAL'),
        ('outbound', 'out.wave.creation.trigger.order_count',   '웨이브 생성 누적 주문 개수',              '50',                    None),
        ('outbound', 'out.release.waiting.location',            '출고 확정 전 임시 로케이션',              'STG-01',                None),
        ('outbound', 'out.release.order.sheet.template',        '거래명세서 템플릿',                      'TRADE_STATEMENT_SHEET', '값이 없다면 출력하지 않음'),
        ('outbound', 'out.release.label.template',              '출고 라벨 출력 템플릿',                  '',                      '출력 안 함'),
        ('rwa',      'rwa.disposition.auto.stock.flag',         '처분 즉시 재고 반영 여부',               'false',                 None),
    ]
    for (category, name, description, value, remarks) in items:
        INSERT INTO runtime_env_items (id, domain_id, runtime_env_id,
            category, name, description, value, remarks,
            creator_id, updater_id, created_at, updated_at)
        VALUES (uuid4(), {domain_id}, runtime_env_id,
                category, name, description, value, remarks, 1, 1, now(), now())
```

#### 12-3. warehouse_charge_settings 및 items — 화주사별

화주사별 창고 요금 설정 2건 + 각 설정에 대한 구간 요금 items를 생성한다.

```python
for com_cd in com_cd_list:
    # 설정 1: 입고 작업료
    in_setting_id = uuid4()
    INSERT INTO warehouse_charge_settings (id, domain_id, wh_cd, com_cd,
        setting_cd, setting_nm, value, default_flag, remarks,
        creator_id, updater_id, created_at, updated_at)
    VALUES (in_setting_id, {domain_id}, 'WH001', com_cd,
            'IN_WORKING_EXPENSES', '입고 작업료', '8000', true,
            '팔레트당 입고 작업료 (원)',
            1, 1, now(), now())

    # 설정 1의 구간 items (중량별 단계 요금)
    in_items = [
        (10, 'DEFAULT', '10',  '4400', '10 Kg 이하'),
        (20, 'DEFAULT', '20',  '5500', '20 Kg 이하'),
        (30, 'DEFAULT', '30',  '6600', '30 Kg 이하'),
        (40, 'DEFAULT', '40',  '9900', '40 Kg 이하'),
        (50, 'DEFAULT', '50', '12100', '50 Kg 이하'),
    ]
    for (rank, type_, code, value, remarks) in in_items:
        INSERT INTO warehouse_charge_setting_items (id, domain_id,
            warehouse_charge_setting_id, rank, type, code, value, del_flag, remarks,
            creator_id, updater_id, created_at, updated_at)
        VALUES (uuid4(), {domain_id}, in_setting_id, rank, type_, code, value, false, remarks,
                1, 1, now(), now())

    # 설정 2: 출고 작업료
    out_setting_id = uuid4()
    INSERT INTO warehouse_charge_settings (id, domain_id, wh_cd, com_cd,
        setting_cd, setting_nm, value, default_flag, remarks,
        creator_id, updater_id, created_at, updated_at)
    VALUES (out_setting_id, {domain_id}, 'WH001', com_cd,
            'OUT_WORKING_EXPENSES', '출고 작업료', '7000', true,
            '팔레트당 출고 작업료 (원)',
            1, 1, now(), now())

    # 설정 2의 구간 items
    out_items = [
        (10, 'DEFAULT', '10',  '3500', '10 Kg 이하'),
        (20, 'DEFAULT', '20',  '4500', '20 Kg 이하'),
        (30, 'DEFAULT', '30',  '5500', '30 Kg 이하'),
        (40, 'DEFAULT', '40',  '8000', '40 Kg 이하'),
        (50, 'DEFAULT', '50', '10000', '50 Kg 이하'),
    ]
    for (rank, type_, code, value, remarks) in out_items:
        INSERT INTO warehouse_charge_setting_items (id, domain_id,
            warehouse_charge_setting_id, rank, type, code, value, del_flag, remarks,
            creator_id, updater_id, created_at, updated_at)
        VALUES (uuid4(), {domain_id}, out_setting_id, rank, type_, code, value, false, remarks,
                1, 1, now(), now())
```

---

### Step 13: 결과 보고

모든 단계 완료 후 아래 형식으로 출력한다.

```
✅ 기준정보 샘플 데이터 생성 완료!

📋 생성 정보
  도메인     : [{domain_id}] {domain_name}
  업종       : {industry_label}

📦 창고 / 공간
  warehouses        :  1건 (WH001)
  zones             :  5건 (입고대기/피킹/출고/불량/유통가공)
  locations         : {pick_loc_count + 4}건 (피킹존 {pick_loc_count}개 + 기타 각 1개)

🏢 거래처
  companies         : {company_count}건
  vendors           : {vendor_count + 1}건 ({vendor_count}개 + CJ대한통운)
  customers         : {customer_count}건

📦 상품 / 출고
  sku               : {sku_count}건 (일반) + {vas_count}건 (세트) = {sku_count + vas_count}건
  box_types         :  3건 (S/M/L)
  courier_contracts :  1건 (CJ대한통운)
  expiration_dates  :  2건

🔧 VAS
  vas_boms          : {vas_count}건
  vas_bom_items     : {총 구성품 건수}건

⚙ 런타임 환경 / 요금 설정 (화주사별)
  runtime_envs                  : {company_count}건
  runtime_env_items             : {company_count * 17}건
  warehouse_charge_settings     : {company_count * 2}건 (입고/출고 작업료)
  warehouse_charge_setting_items: {company_count * 10}건 (설정별 5구간씩)
```

---

## 주의사항

- `domain_id` 는 반드시 `domains` 테이블에 존재하는 값만 허용
- 모든 신규 UUID는 Python `uuid.uuid4()` 로 생성
- `domain_id` 조건 없이 DELETE/UPDATE 절대 금지
- VAS BOM 생성 시 세트 SKU는 반드시 먼저 생성 후 BOM에서 참조
- `box_types.company_id` 는 `companies.id` (UUID) 를 조회하여 사용
- DB 접속 정보: `frontend/packages/operato-wes/config/config.development.js` → `ormconfig` 섹션
- Python psycopg2 사용 (`pip3 install psycopg2-binary`)
