# Operato WMS 서비스 개발 가이드

> 이 문서는 `ref/operato-java-tools-doc.pdf`의 1.개요 ~ 2.표준화면 구성 내용을 기반으로 정리하였으며,
> 향후 엔티티 생성, 용어 등록, 공통코드 등록 자동화 skill 개발을 위한 참조 문서입니다.

---

## 목차

1. [개요](#1-개요)
2. [표준화면 구성](#2-표준화면-구성)
   - [2.1 엔티티 정의](#21-엔티티-정의)
   - [2.2 엔티티 컬럼 정의](#22-엔티티-컬럼-정의)
   - [2.3 용어 등록](#23-용어-등록)
   - [2.4 공통코드 등록](#24-공통코드-등록)
   - [2.5 마스터-디테일 화면](#25-마스터-디테일-화면)
3. [메타데이터 테이블 구조](#3-메타데이터-테이블-구조)
4. [API 응답 네이밍 컨벤션](#4-api-응답-네이밍-컨벤션-중요)
5. [자동화 참조 정보](#5-자동화-참조-정보)

---

## 1. 개요

### 1.1 Operato 개발 방식

Operato WMS는 **메타데이터 기반 개발(Metadata-Driven Development)** 방식을 사용한다.

핵심 특징:
- UI 화면을 코드가 아닌 **메타데이터(DB 레코드)**로 정의
- `entities` + `entity_columns` 테이블에 엔티티 정보를 등록하면 자동으로 CRUD 화면이 생성됨
- 검색 폼, 그리드, 상세 폼의 에디터/정렬/필터 등을 컬럼 메타데이터로 제어
- `terminologies` 테이블로 다국어 지원
- `common_codes` + `common_code_details` 테이블로 드롭다운 선택지 관리

### 1.2 개발 절차 흐름

```
1. Entity 정의 (entities 테이블)
   └→ name, table_name, bundle, search_url, multi_save_url ...

2. Entity Column 정의 (entity_columns 테이블)
   └→ 각 필드의 타입, 검색/그리드/폼 에디터, 정렬순서 ...

3. 용어 등록 (terminologies 테이블)
   └→ label.{field_name} 형식으로 다국어 번역 등록

4. 공통코드 등록 (common_codes + common_code_details)
   └→ code-combo 에디터 사용 필드의 선택지 등록

5. Entity Java 클래스 생성
   └→ JPA @Entity, @Table, @Column 어노테이션

6. Controller/Service 생성
   └→ REST API 엔드포인트

7. 테이블 생성 (DDL)
   └→ Hibernate auto-ddl 또는 수동 CREATE TABLE

8. 메뉴 등록 (menus 테이블)
   └→ Entity를 메뉴에 복사하여 화면 노출
```

---

## 2. 표준화면 구성

### 2.1 엔티티 정의

`entities` 테이블에 엔티티를 등록한다.

#### 필수 설정 항목

| 항목 | DB 컬럼 | 타입(크기) | 설명 | 예시 |
|------|---------|-----------|------|------|
| 이름 | `name` | String(36) | 엔티티 명 (PascalCase) | `RwaOrder` |
| 설명 | `description` | String(255) | 엔티티 설명 | `반품 지시` |
| 번들 | `bundle` | String(20) | 엔티티가 속한 번들 (모듈) 코드 (CommonCode→BUNDLE) | `rwa` |
| 테이블명 | `table_name` | String(36) | 엔티티와 매핑된 테이블 명 (snake_case, 복수형) | `rwa_orders` |
| 조회 URL | `search_url` | String(64) | 엔티티 정보 조회 URL (**첫글자 `/` 없이**) | `rwa_orders` |
| 저장 URL | `multi_save_url` | String(64) | CRUD 화면에서 그리드 정보를 저장할 URL (**첫글자 `/` 없이**) | `rwa_orders/update_multiple` |
| ID 유형 | `id_type` | String(15) | ID 유형 (CommonCode→ENTITY_ID_TYPE) | `uuid` |
| ID 필드 | `id_field` | String(36) | ID 역할을 하는 컬럼명 (엔티티에 `id` 필드가 있으면 `id`) | `id` |
| 대표 필드 | `title_field` | String(36) | 화면에 표시할 대표 필드 | `rwa_no` |
| 설명 필드 | `desc_field` | String(36) | 화면에 표시할 설명 필드 | `remarks` |
| 데이터 속성 | `data_prop` | String(36) | 조회시 리턴 데이터의 프로퍼티명 (기본: `items`) | `items` |
| 활성 여부 | `active` | Boolean(1) | 엔티티 활성화 (사용) 여부 | `true` |
| 고정 컬럼 | `fixed_columns` | Integer | CRUD 화면의 그리드에서 고정하고자 하는 컬럼 수 | `3` |

> **주의사항**
> - `search_url`, `multi_save_url`: 첫글자 `/`를 붙이지 않는다 (예: `rwa_orders`, `rwa_orders/update_multiple`)
> - `id_field`: 엔티티에 `id` 필드가 있으면 `id`로 설정한다
> - `data_prop`: 기본값은 `items`로 설정한다

#### INSERT 예시

> **id 컬럼 생략**: `entities`, `entity_columns` 테이블의 `id` 컬럼은 `uuid_generate_v4()` 기본값이 설정되어 있으므로 INSERT 시 생략한다.

```sql
INSERT INTO entities (
  domain_id, name, description, bundle, table_name,
  search_url, multi_save_url, id_type, id_field, title_field, desc_field,
  data_prop, active, fixed_columns, created_at, updated_at
) VALUES (
  :domain_id,
  'RwaOrder', '반품 지시', 'rwa', 'rwa_orders',
  'rwa_orders', 'rwa_orders/update_multiple',
  'uuid', 'id', 'rwa_no', 'remarks',
  'items', true, 3, now(), now()
);
```

---

### 2.2 엔티티 컬럼 정의

`entity_columns` 테이블에 각 필드의 메타데이터를 등록한다.

#### 필수 설정 항목

| 항목 | DB 컬럼 | 타입(크기) | 설명 | 예시 |
|------|---------|-----------|------|------|
| Entity ID | `entity_id` | String(40) | 엔티티 ID | `rwa-entity-order-0001` |
| 컬럼명 | `name` | String(36) | 엔티티와 매핑된 테이블의 컬럼명 | `rwa_no` |
| 설명 | `description` | String(255) | 엔티티와 매핑된 테이블의 컬럼 설명 | `반품 번호` |
| 순서 | `rank` | Integer | 테이블 컬럼 순서 (10 단위) | `20` |
| 용어 키 | `term` | String(40) | 화면에 표시할 용어 번역을 위한 정보 | `label.rwa_no` |
| 컬럼 유형 | `col_type` | String(15) | 컬럼 유형 (CommonCode→ENTITY_FIELD_TYPE) | `string`, `number`, `date` 등 |
| 컬럼 크기 | `col_size` | Integer | 컬럼 사이즈 (String일 때 최대 길이) | `30` |
| NULL 허용 | `nullable` | Boolean(1) | NULL 허용 여부 | `true` / `false` |

#### 입력 규칙

> **rank 시작값 및 증분**
> - `search_rank`, `sort_rank`, `grid_rank`는 **10부터 시작**하여 **10씩 증가**한다 (10, 20, 30, ...)
> - 0인 경우 해당 영역(검색/소팅/그리드)에 표시되지 않는다

> **공통코드 연관 필드 (ref_type / ref_name)**
> - 필드가 공통코드와 연관되어 있으면 `ref_type = 'CommonCode'`, `ref_name = {공통코드명}` 으로 설정한다
> - 예: status 필드 → `ref_type = 'CommonCode'`, `ref_name = 'RWA_ORDER_STATUS'`

> **엔티티 참조 필드 (ref_type = 'Entity')**
> - 컬럼명이 `_cd`로 끝나는 String 필드는 다른 엔티티를 참조하는 코드 필드로 판단한다
> - `ref_type = 'Entity'`, `ref_name = {참조 엔티티명}` 으로 설정한다
> - 참조 엔티티명은 컬럼의 의미와 프로젝트 내 Entity 클래스를 기반으로 판단한다
> - 예: `com_cd` → `ref_type = 'Entity'`, `ref_name = 'Company'`
> - 예: `wh_cd` → `ref_type = 'Entity'`, `ref_name = 'Warehouse'`
> - 예: `sku_cd` → `ref_type = 'Entity'`, `ref_name = 'Sku'`

> **search_editor / grid_editor 결정 규칙**
> - 기본값: `NULL`
> - `ref_type = 'CommonCode'`인 경우 → `code-combo`
> - `ref_type = 'Entity'`인 경우 → `resource-code`
>   - 단, `ref_type = 'Entity'`이고 `ref_name = 'User'`이면 설정하지 않는다 (NULL 유지)

> **날짜 필드 search_editor 규칙**
> - `col_type = 'date'` 또는 `col_type = 'datetime'`인 경우 → `search_editor = 'date-picker'`
> - String 타입이라도 컬럼명이 `_date`로 끝나는 경우 (날짜형 문자열) → `search_editor = 'date-picker'`
> - 예: `rwa_req_date` (String, length=10) → `search_editor = 'date-picker'`

#### 에디터 설정

| 항목 | DB 컬럼 | 타입(크기) | 설명 |
|------|---------|-----------|------|
| 검색 순서 | `search_rank` | Integer | 엔티티 CRUD 화면에서 검색 조건 순서 (0보다 커야 화면에 표시됨) |
| 검색 명 | `search_name` | String(36) | 검색 명 (파라미터명이 컬럼명과 다른 경우) |
| 검색 편집기 | `search_editor` | String(36) | 검색 편집기 (CommonCode→FORM_FIELD_EDITOR) |
| 검색 연산자 | `search_oper` | String(15) | 검색 조건 연산자 (CommonCode→QUERY_OPERATOR) |
| 검색 초기값 | `search_init_val` | String(255) | 검색 초기값 |
| 소팅 순서 | `sort_rank` | Integer | 검색 시 소팅 순서 (0보다 커야 적용됨) |
| 역소팅 | `reverse_sort` | Boolean(1) | 검색 시 역소팅 할 지 여부 |
| 그리드 순서 | `grid_rank` | Integer | 그리드에 표시할 순서 (0보다 큰 컬럼만 표시) |
| 그리드 편집기 | `grid_editor` | String(36) | 그리드 컬럼의 편집기 (CommonCode→GRID_COLUMN_EDITOR) |
| 그리드 너비 | `grid_width` | Integer | 그리드 컬럼의 너비값 (px) |
| 그리드 정렬 | `grid_align` | String(10) | 그리드 컬럼의 정렬값 - `left`/`center`/`far` 중 택1 (CommonCode→ALIGNMENT) |
| 그리드 포맷 | `grid_format` | String(128) | 그리드 컬럼의 데이터 포맷 형식 |
| 그리드 Validator | `grid_validator` | String(36) | 그리드 컬럼값이 유효한 지 체크하는 Validator |
| 폼 편집기 | `form_editor` | String(36) | 폼의 컬럼 편집기 |
| 폼 Validator | `form_validator` | String(36) | 폼 필드값이 유효한 지 체크하는 Validator |
| 폼 포맷 | `form_format` | String(128) | 폼 컬럼의 데이터 포맷 형식 |
| 유니크 순서 | `uniq_rank` | Integer | 유일값 여부 (0보다 큰 값들의 조합으로 Unique Index 생성) |
| 기본값 | `def_val` | String(128) | 폼이나 그리드에서 값을 입력하지 않았을 때 처리할 기본값 |
| 범위값 | `range_val` | String(128) | 컬럼값을 입력시 범위 정보 (Validation 용) |
| 가상 필드 | `virtual_field` | Boolean(1) | 테이블에 실제 존재하지 않는 가상 필드 여부 |
| 저장 무시 | `ignore_on_save` | Boolean(1) | 저장시 해당 컬럼 값을 반영하지 않을 지 여부 |

#### 에디터 타입 목록

| 에디터 타입 | 설명 | 사용 위치 |
|------------|------|----------|
| `hidden` | 숨김 | 검색/그리드/폼 |
| `readonly` | 읽기 전용 | 그리드/폼 |
| `text` | 일반 텍스트 입력 | 검색/그리드/폼 |
| `number` | 숫자 입력 | 그리드/폼 |
| `checkbox` | 체크박스 (boolean) | 그리드/폼 |
| `tristate-radio` | 3상태 라디오 (Y/N/전체) | 검색 |
| `code-combo` | 공통코드 드롭다운 | 검색/그리드/폼 |
| `resource-selector` | 엔티티 팝업 선택 | 그리드/폼 |
| `resource-code` | 엔티티 코드 직접 입력 | 그리드/폼 |
| `date-picker` | 날짜 선택 | 검색/그리드/폼 |
| `datetime-picker` | 날짜시간 선택 | 검색/그리드/폼 |
| `textarea` | 멀티라인 텍스트 | 폼 |
| `image-selector` | 이미지 선택 | 폼 |

#### 참조 타입 (Reference)

`code-combo`, `resource-selector` 등을 사용할 때 참조 정보를 설정한다 (CommonCode→ENTITY_REF_TYPE).

| 참조 유형 | `ref_type` | `ref_name` 값 | 추가 필드 | 설명 |
|----------|-----------|--------------|----------|------|
| 공통코드 | `CommonCode` | 공통코드명 | | `common_codes.name` 참조 |
| 엔티티 | `Entity` | Entity명 | `ref_url`, `ref_params`, `ref_related` | 다른 Entity의 데이터 참조 |
| 메뉴 | `Menu` | 메뉴명 | | 메뉴 팝업 참조 |

- `ref_url`: 참조 URL (String(128)) — Entity 참조 시 데이터 조회 API URL
- `ref_params`: 참조 파라미터 (String(128)) — 참조 API 호출 시 추가 파라미터
- `ref_related`: 참조 관계 필드 (String(128)) — 참조 선택 후 연관 필드 자동 매핑 정보

#### 검색 연산자 (search_oper)

| 연산자 | 설명 | SQL 매핑 |
|--------|------|----------|
| `contains` | 포함 (기본값) | `LIKE '%값%'` |
| `eq` | 같음 | `= 값` |
| `sw` | 시작 | `LIKE '값%'` |
| `ew` | 끝남 | `LIKE '%값'` |
| `gt` | 초과 | `> 값` |
| `gte` | 이상 | `>= 값` |
| `lt` | 미만 | `< 값` |
| `lte` | 이하 | `<= 값` |
| `in` | 포함 (목록) | `IN (값1, 값2, ...)` |
| `between` | 범위 | `BETWEEN 값1 AND 값2` |

#### INSERT 예시

> **id 컬럼 생략**: `entity_columns` 테이블의 `id` 컬럼은 `uuid_generate_v4()` 기본값이 설정되어 있으므로 INSERT 시 생략한다.

```sql
INSERT INTO entity_columns (
  domain_id, entity_id,
  name, description, rank, term,
  col_type, col_size, nullable,
  ref_type, ref_name,
  search_rank, search_editor, search_oper, sort_rank,
  grid_rank, grid_editor, grid_width, grid_align,
  uniq_rank, created_at, updated_at
) VALUES
-- PK (숨김)
(:domain_id, :entity_id,
 'id', 'ID', 10, 'label.id',
 'string', 40, false,
 NULL, NULL,
 0, NULL, NULL, 0,
 0, NULL, 0, 'center',
 0, now(), now()),

-- 반품 번호 (검색 1순위, 그리드 1순위, 읽기전용)
(:domain_id, :entity_id,
 'rwa_no', '반품 번호', 20, 'label.rwa_no',
 'string', 30, false,
 NULL, NULL,
 10, NULL, NULL, 10,
 10, 'readonly', 150, 'center',
 10, now(), now()),

-- 상태 (공통코드 에디터)
(:domain_id, :entity_id,
 'status', '상태', 60, 'label.status',
 'string', 20, true,
 'CommonCode', 'RWA_ORDER_STATUS',
 40, 'code-combo', 'eq', 0,
 50, 'code-combo', 100, 'center',
 0, now(), now());
```

> **참고**: `ref_type = 'CommonCode'`인 경우 `grid_editor`와 `search_editor`를 `code-combo`로 설정한다.

---

### 2.3 용어 등록

`terminologies` 테이블에 화면에 표시될 다국어 텍스트를 등록한다.

#### 용어 키 규칙

| 카테고리 | `category` | `name` 패턴 | 예시 |
|---------|-----------|------------|------|
| 필드 라벨 | `label` | `label.{field_name}` | `label.rwa_no` |
| 메뉴명 | `menu` | `menu.{menu_name}` | `menu.RwaOrder` |
| 메시지 | `message` | `message.{msg_key}` | `message.confirm_delete` |
| 유효성 검사 | `validation` | `validation.{key}` | `validation.required` |

#### 필드 라벨 자동 연결

Entity Column의 `term` 필드 값이 `label.{field_name}` 형식이면, 시스템이 `terminologies` 테이블에서 해당 locale의 `display` 값을 가져와 컬럼 설명으로 사용한다.

```
entity_columns.term = 'label.rwa_no'
  → terminologies: category='label', name='label.rwa_no', locale='ko', display='반품 번호'
  → terminologies: category='label', name='label.rwa_no', locale='en', display='RWA No.'
```

#### INSERT 예시

```sql
-- 한국어 용어
INSERT INTO terminologies (id, domain_id, name, locale, category, display, created_at, updated_at)
VALUES ('term-rwa-no-ko', :domain_id, 'label.rwa_no', 'ko', 'label', '반품 번호', now(), now());

-- 영어 용어
INSERT INTO terminologies (id, domain_id, name, locale, category, display, created_at, updated_at)
VALUES ('term-rwa-no-en', :domain_id, 'label.rwa_no', 'en', 'label', 'RWA No.', now(), now());
```

#### 로케일 목록

| 로케일 | 언어 |
|--------|------|
| `ko` | 한국어 |
| `en` | 영어 |
| `ja` | 일본어 |
| `zh` | 중국어 |

---

### 2.4 공통코드 등록

`common_codes` + `common_code_details` 테이블에 코드형 필드의 선택지를 등록한다.

#### 코드명 결정 규칙

```
패턴: {TABLE_NAME_SINGULAR}_{COLUMN_NAME}  (대문자, 언더스코어)

테이블명 → 복수형 's' 제거 → 대문자 변환
rwa_orders → RWA_ORDER
rwa_order_items → RWA_ORDER_ITEM

예시:
  rwa_orders.status → RWA_ORDER_STATUS
  rwa_orders.rwa_type → RWA_ORDER_RWA_TYPE
  rwa_order_items.defect_type → RWA_ORDER_ITEM_DEFECT_TYPE
```

#### 마스터 코드 INSERT

```sql
INSERT INTO common_codes (id, domain_id, name, description, bundle, created_at, updated_at)
VALUES (
  '{uuid}', :domain_id,
  'RWA_ORDER_STATUS', '반품 지시 상태', 'rwa',
  now(), now()
);
```

#### 상세 코드 INSERT

```sql
-- common_code_details에는 created_at/updated_at 컬럼이 없음!
INSERT INTO common_code_details (id, domain_id, parent_id, name, description, rank)
VALUES
  ('{uuid}', :domain_id, '{parent_code_id}', 'REQUEST',   '반품 요청', 10),
  ('{uuid}', :domain_id, '{parent_code_id}', 'APPROVED',  '승인',     20),
  ('{uuid}', :domain_id, '{parent_code_id}', 'COMPLETED', '완료',     30);
```

> **주의**: `common_code_details`에는 `created_at`/`updated_at` 컬럼이 **없다**. INSERT 시 반드시 제외해야 한다.

#### 공통코드 대상 필드 식별 기준

Entity Java 클래스에서 다음 조건을 만족하는 필드가 공통코드 대상:

1. `String` 타입
2. Javadoc 주석에 슬래시(`/`)로 구분된 허용 값이 있음 (예: `REQUEST/APPROVED/COMPLETED`)
3. 또는 `entity_columns.grid_editor = 'code'`로 등록됨

**제외 대상:**
- FK 참조 필드 (`*_id`, `*Id`)
- 자유 입력 필드 (코드, 명칭, 설명, 날짜, 번호 등)
- 확장 필드 (`attr01` ~ `attr05`)
- 비고 (`remarks`)

---

### 2.5 마스터-디테일 화면

마스터-디테일 관계는 `entities` 테이블의 추가 필드로 정의한다.

#### 디테일 엔티티 추가 설정

| 항목 | DB 컬럼 | 타입(크기) | 설명 | 예시 |
|------|---------|-----------|------|------|
| 마스터 ID | `master_id` | String(40) | Master / Detail 구조인 경우 Master 엔티티 ID | `rwa-entity-order-0001` |
| 관계 유형 | `association` | String(15) | 1:1, 1:N 관계 정의 (CommonCode→ASSOCIATION) | `one-to-many` |
| 데이터 속성 | `data_prop` | String(36) | 조회시 리턴 데이터에서 어떤 값을 데이터로 가져올지 하는 정보 | `items` |
| 참조 필드 | `ref_field` | String(36) | 참조 필드 (FK 컬럼명, 디테일 → 마스터) | `rwa_order_id` |
| 삭제 전략 | `del_strategy` | String(20) | 삭제 시 삭제 전략 (CommonCode→DELETE_STRATEGY) | `destroy_all` |

#### 관계 유형

| 값 | 설명 | UI 표현 |
|----|------|---------|
| `one-to-one` | 1:1 관계 | 하단에 폼으로 표시 |
| `one-to-many` | 1:N 관계 | 하단에 그리드로 표시 |

#### 삭제 전략

| 값 | 설명 |
|----|------|
| `destroy_all` | 마스터 삭제 시 디테일도 모두 삭제 |
| `nullify_all` | 마스터 삭제 시 FK를 NULL로 설정 |
| `exception` | 디테일이 있으면 삭제 불가 (예외 발생) |

#### INSERT 예시 (디테일 엔티티)

```sql
INSERT INTO entities (
  domain_id, name, description, bundle, table_name,
  search_url, multi_save_url, id_type, id_field, title_field, desc_field,
  master_id, association, data_prop, ref_field, del_strategy,
  active, fixed_columns, created_at, updated_at
) VALUES (
  :domain_id,
  'RwaOrderItem', '반품 지시 상세', 'rwa', 'rwa_order_items',
  'rwa_order_items', 'rwa_order_items/update_multiple',
  'uuid', 'id', 'sku_cd', 'remarks',
  :master_entity_id, 'one-to-many', 'items', 'rwa_order_id', 'destroy_all',
  true, 3, now(), now()
);
```

#### 다단계 마스터-디테일

3단계 이상도 가능:
```
RwaOrder (마스터)
  └→ RwaOrderItem (디테일, master_id = RwaOrder.id)
       ├→ RwaInspection (디테일, master_id = RwaOrderItem.id)
       └→ RwaDisposition (디테일, master_id = RwaOrderItem.id, 1:1)
```

---

## 3. 메타데이터 테이블 구조

### 3.1 entities 테이블

> Entity 클래스: `otarepo-core` → `xyz.elidom.base.entity.Resource`

| 컬럼 | 타입 | 필수 | 설명 | 참조 코드 |
|------|------|------|------|----------|
| `id` | String(40) | Y | ID | |
| `domain_id` | Integer(12) | Y | 도메인 ID | Entity→Domain |
| `name` | String(36) | Y | 엔티티 명 | |
| `description` | String(255) | N | 엔티티 설명 | |
| `bundle` | String(20) | Y | 엔티티가 속한 번들 (모듈) 코드 | CommonCode→BUNDLE |
| `table_name` | String(36) | Y | 엔티티와 매핑된 테이블 명 | |
| `search_url` | String(64) | N | 엔티티 정보 조회 URL | |
| `multi_save_url` | String(64) | N | 엔티티 정보 CRUD 화면에서 그리드 정보를 저장할 URL | |
| `id_type` | String(15) | N | ID 유형 | CommonCode→ENTITY_ID_TYPE |
| `id_field` | String(36) | N | ID 필드 (엔티티 컬럼 정보 중에 ID 역할을 하는 컬럼명) | |
| `title_field` | String(36) | N | 화면에 표시할 대표 필드 | |
| `desc_field` | String(36) | N | 화면에 표시할 설명 필드 | |
| `master_id` | String(40) | N | Master / Detail 구조인 경우 Master 엔티티 ID | Entity→Resource |
| `association` | String(15) | N | Master / Detail 구조인 경우 1:1, 1:N 관계 정의 | CommonCode→ASSOCIATION |
| `data_prop` | String(36) | N | 엔티티 조회시 리턴 데이터에서 어떤 값을 데이터로 가져올지 하는 정보 | |
| `ref_field` | String(36) | N | 참조 필드 | |
| `del_strategy` | String(20) | N | 삭제 시 삭제 전략 | CommonCode→DELETE_STRATEGY |
| `fixed_columns` | Integer | N | 엔티티 CRUD 화면의 그리드에서 고정하고자 하는 컬럼 수 | |
| `active` | Boolean(1) | N | 엔티티 활성화 (사용) 여부 | |
| `ext_entity` | Boolean(1) | N | 확장 엔티티 여부 | |
| `creator_id` | String(32) | N | 생성한 사용자 ID | Entity→User |
| `updater_id` | String(32) | N | 수정한 사용자 ID | Entity→User |
| `created_at` | DateTime | N | 생성시간 | |
| `updated_at` | DateTime | N | 수정시간 | |

**Unique**: `(domain_id, name)`

### 3.2 entity_columns 테이블

> Entity 클래스: `otarepo-core` → `xyz.elidom.base.entity.ResourceColumn`

| 컬럼 | 타입 | 필수 | 설명 | 참조 코드 |
|------|------|------|------|----------|
| `id` | String(40) | Y | 컬럼 ID | |
| `domain_id` | Integer(12) | Y | 도메인 ID | |
| `entity_id` | String(40) | Y | 엔티티 ID | Entity→Entity |
| `name` | String(36) | Y | 엔티티와 매핑된 테이블의 컬럼명 | |
| `description` | String(255) | N | 엔티티와 매핑된 테이블의 컬럼 설명 | |
| `rank` | Integer | Y | 테이블 컬럼 순서 | |
| `term` | String(40) | N | 화면에 표시할 용어 번역을 위한 정보 | |
| `col_type` | String(15) | Y | 컬럼 유형 | CommonCode→ENTITY_FIELD_TYPE |
| `col_size` | Integer | N | 컬럼 사이즈 | |
| `nullable` | Boolean(1) | N | NULL 허용 여부 | |
| `ref_type` | String(15) | N | 참조 유형 (Code, Entity, Menu) | CommonCode→ENTITY_REF_TYPE |
| `ref_name` | String(36) | N | 참조 명 (참조 유형의 이름) | |
| `ref_url` | String(128) | N | 참조 URL | |
| `ref_params` | String(128) | N | 참조 파라미터 | |
| `ref_related` | String(128) | N | 참조 관계 필드 | |
| `search_rank` | Integer | N | 엔티티 CRUD 화면에서 검색 조건 순서 (0보다 커야 화면에 표시됨) | |
| `search_name` | String(36) | N | 검색 명 | |
| `search_editor` | String(36) | N | 검색 편집기 | CommonCode→FORM_FIELD_EDITOR |
| `search_oper` | String(15) | N | 검색 조건 연산자 | CommonCode→QUERY_OPERATOR |
| `search_init_val` | String(255) | N | 검색 초기값 | |
| `sort_rank` | Integer | N | 엔티티 CRUD 화면에서 검색 시 소팅 순서 (0보다 커야 적용됨) | |
| `reverse_sort` | Boolean(1) | N | 엔티티 CRUD 화면에서 검색 시 역소팅 할 지 여부 | |
| `virtual_field` | Boolean(1) | N | 엔티티와 매핑된 테이블에 실제 존재하지 않는 가상 필드 여부 | |
| `grid_rank` | Integer | N | 엔티티 CRUD 화면의 그리드에 표시할 순서 (0보다 큰 컬럼만 표시) | |
| `grid_editor` | String(36) | N | 엔티티 CRUD 화면의 그리드 컬럼의 편집기 | CommonCode→GRID_COLUMN_EDITOR |
| `grid_format` | String(128) | N | 엔티티 CRUD 화면의 그리드 컬럼의 데이터 포맷 형식 | |
| `grid_validator` | String(36) | N | 엔티티 CRUD 화면의 그리드 컬럼값이 유효한 지 체크하는 Validator | |
| `grid_width` | Integer | N | 엔티티 CRUD 화면의 그리드 컬럼의 너비값 (px) | |
| `grid_align` | String(10) | N | 엔티티 CRUD 화면의 그리드 컬럼의 정렬값 | CommonCode→ALIGNMENT |
| `uniq_rank` | Integer | N | 테이블의 행 정보가 유일한 값인지 여부 (0보다 큰 값들의 조합으로 Unique Index 생성) | |
| `form_editor` | String(36) | N | 엔티티 CRUD 화면에 표시할 폼의 컬럼 편집기 | |
| `form_validator` | String(36) | N | 엔티티 CRUD 화면의 폼 필드값이 유효한 지 체크하는 Validator | |
| `form_format` | String(128) | N | 엔티티 CRUD 화면의 폼 컬럼의 데이터 포맷 형식 | |
| `def_val` | String(128) | N | 엔티티 CRUD 화면의 폼이나 그리드에서 값을 입력하지 않았을 때 처리할 기본값 | |
| `range_val` | String(128) | N | 컬럼값을 입력시 범위 정보 (Validation 용) | |
| `ignore_on_save` | Boolean(1) | N | 저장시 해당 컬럼 값을 반영하지 않을 지 (무시할 지) 여부 | |
| `creator_id` | String(32) | N | 생성한 사용자 ID | Entity→User |
| `updater_id` | String(32) | N | 수정한 사용자 ID | Entity→User |
| `created_at` | DateTime | N | 생성시간 | |
| `updated_at` | DateTime | N | 수정시간 | |

**Unique**: `(domain_id, entity_id, name)`

### 3.3 terminologies 테이블

> Entity 클래스: `otarepo-core` → `xyz.elidom.msg.entity.Terminology`

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | UUID(36) | Y | PK |
| `domain_id` | Long | Y | 도메인 ID |
| `name` | String(128) | Y | 용어 키 |
| `description` | String(500) | N | 설명 |
| `locale` | String(10) | Y | 로케일 (ko/en/ja/zh) |
| `category` | String(32) | Y | 카테고리 (label/menu/message) |
| `display` | String(1000) | N | 표시 문자 |
| `created_at` | DateTime | Y | 생성일시 |
| `updated_at` | DateTime | N | 수정일시 |

**Unique**: `(domain_id, locale, category, name)`

### 3.4 common_codes 테이블

> Entity 클래스: `otarepo-core` → `xyz.elidom.core.entity.Code`

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | UUID(36) | Y | PK |
| `domain_id` | Long | Y | 도메인 ID |
| `name` | String(64) | Y | 코드명 |
| `description` | String(500) | N | 설명 |
| `bundle` | String(32) | N | 모듈 번들명 |
| `created_at` | DateTime | Y | 생성일시 |
| `updated_at` | DateTime | N | 수정일시 |

**Unique**: `(domain_id, name)`

### 3.5 common_code_details 테이블

> Entity 클래스: `otarepo-core` → `xyz.elidom.core.entity.CodeDetail`

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | UUID(36) | Y | PK |
| `domain_id` | Long | Y | 도메인 ID |
| `parent_id` | UUID(36) | Y | 마스터 코드 ID (FK) |
| `name` | String(64) | Y | 코드 값 |
| `description` | String(500) | N | 설명 |
| `rank` | Integer | Y | 표시 순서 |
| `labels` | JSON | N | 다국어 라벨 |
| `data_1` ~ `data_5` | String(255) | N | 확장 데이터 |

**Unique**: `(domain_id, parent_id, name)`
**주의**: `created_at`/`updated_at` 컬럼 **없음**

---

## 4. API 응답 네이밍 컨벤션 (중요)

### 4.1 Jackson SNAKE_CASE 자동 변환

`application.properties`에 다음 설정이 되어 있다:

```properties
spring.jackson.property-naming-strategy=SNAKE_CASE
```

이 설정에 의해 **Spring이 JSON으로 직렬화할 때 Java 필드명(camelCase)을 자동으로 snake_case로 변환**한다.

#### Entity 객체 응답 — 자동 변환됨 (별도 처리 불필요)

```java
// Java Entity 필드: camelCase
private String shipmentNo;
private String custNm;
private Integer totalOrder;

// JSON 응답: Jackson이 자동으로 snake_case로 변환
// { "shipment_no": "...", "cust_nm": "...", "total_order": 0 }
```

CRUD API에서 Entity 객체를 그대로 반환하면 Jackson이 알아서 변환해주므로 **신경 쓸 것이 없다.**

#### Map 응답 — 자동 변환 안 됨 (반드시 snake_case로 키 작성)

```java
// ❌ 잘못된 예: Map 키를 camelCase로 작성하면 그대로 camelCase로 응답됨
Map<String, Object> result = new HashMap<>();
result.put("totalOrders", 100);     // → { "totalOrders": 100 }  ← camelCase 그대로!
result.put("successCount", 5);      // → { "successCount": 5 }   ← camelCase 그대로!

// ✅ 올바른 예: Map 키는 반드시 snake_case로 작성
Map<String, Object> result = new HashMap<>();
result.put("total_orders", 100);    // → { "total_orders": 100 }
result.put("success_count", 5);     // → { "success_count": 5 }
```

> **핵심 원칙**: Jackson의 `SNAKE_CASE` 전략은 **Java 객체의 getter/setter 이름**을 변환하는 것이므로,
> `Map<String, Object>`의 **문자열 키는 변환 대상이 아니다.**
> Map 기반 응답을 구성할 때는 반드시 snake_case로 키를 작성해야 한다.

### 4.2 Jackson 전체 설정 참고

```properties
# JSON 직렬화 설정 (application.properties)
spring.jackson.date-format=yyyy-MM-dd HH:mm:ss
spring.jackson.property-naming-strategy=SNAKE_CASE
spring.jackson.serialization.INDENT_OUTPUT=true
spring.jackson.serialization.FAIL_ON_EMPTY_BEANS=false
spring.jackson.default-property-inclusion=non-null
spring.jackson.time-zone=Asia/Seoul
```

| 설정 | 효과 |
|------|------|
| `property-naming-strategy=SNAKE_CASE` | Entity 필드 camelCase → snake_case 자동 변환 |
| `date-format` | 날짜를 `yyyy-MM-dd HH:mm:ss` 형식으로 직렬화 |
| `INDENT_OUTPUT=true` | JSON 응답을 들여쓰기하여 가독성 향상 |
| `FAIL_ON_EMPTY_BEANS=false` | 빈 객체도 직렬화 허용 |
| `default-property-inclusion=non-null` | null 값 필드는 JSON에서 제외 |
| `time-zone=Asia/Seoul` | 날짜 시간대를 한국 시간으로 설정 |

### 4.3 프론트엔드 데이터 바인딩 규칙

프론트엔드에서 API 응답 데이터를 바인딩할 때 **항상 snake_case 키**를 사용한다:

```javascript
// ✅ 올바른 예
${order.shipment_no}
${order.cust_nm}
${alloc.alloc_qty}

// ❌ 잘못된 예 (camelCase — 서버에서 snake_case로 오므로 매칭 실패)
${order.shipmentNo}
${order.custNm}
${alloc.allocQty}
```

---

## 5. 자동화 참조 정보

### 5.1 Entity Java 클래스 → 메타데이터 매핑 규칙

Entity Java 클래스 정보로부터 메타데이터를 자동 생성하기 위한 매핑 규칙:

#### Java 타입 → col_type

| Java 타입 | col_type |
|-----------|----------|
| `String` | `string` |
| `Integer`, `Long`, `int`, `long` | `number` |
| `Float`, `Double`, `BigDecimal` | `number` |
| `Boolean`, `boolean` | `boolean` |
| `Date`, `LocalDate` | `date` |
| `DateTime`, `LocalDateTime`, `Timestamp` | `datetime` |

#### @Column 어노테이션 → entity_columns 필드

| @Column 속성 | entity_columns 컬럼 |
|-------------|---------------------|
| `name` | `name` |
| `length` | `col_size` |
| `nullable` | `nullable` |

#### 필드 → grid_editor 자동 결정

| 조건 | grid_editor |
|------|------------|
| PK 필드 (`id`) | 미표시 (rank=0) |
| FK 필드 (`*_id`) | `readonly` 또는 미표시 |
| Boolean 타입 | `checkbox` |
| Date 타입 | `date-picker` |
| DateTime 타입 | `datetime-picker` |
| Javadoc에 슬래시 구분 허용값 | `code` (공통코드) |
| 나머지 String | `text` |
| 나머지 Number | `number` |

### 5.2 자동화 대상 테이블 목록

Entity 정보를 기반으로 자동 생성해야 하는 데이터:

| 순서 | 테이블 | 생성 기준 | 비고 |
|------|--------|----------|------|
| 1 | `entities` | Entity 클래스 1개당 1행 | 모든 도메인에 등록 |
| 2 | `entity_columns` | Entity 필드 1개당 1행 | 모든 도메인에 등록 |
| 3 | `terminologies` | Entity 필드 1개당 locale별 1행 | `label.{field_name}` 패턴 |
| 4 | `common_codes` | 코드형 필드 1개당 1행 | 모든 도메인에 등록 |
| 5 | `common_code_details` | 코드 값 1개당 1행 | 모든 도메인에 등록 |

### 5.3 도메인 정보

모든 메타데이터는 각 도메인별로 별도 등록해야 한다.

```sql
SELECT id, name FROM domains;
-- 11, yujin
-- 12, avnet
-- 13, satori
-- 14, adsemicon
-- 15, cdc
```

### 5.4 DB 접속 정보

- 접속 정보는 `frontend/packages/operato-wes/config/config.development.js` 파일에서 확인
- Python/psycopg2를 사용하여 접속 (psql CLI 미설치 환경 대응)

### 5.5 시스템 자동 추가 필드

Entity를 등록할 때 시스템이 자동으로 추가하는 필드 (entity_columns 등록 불필요):

| 필드명 | 설명 |
|--------|------|
| `domain_id` | 도메인 ID |
| `created_at` | 생성일시 |
| `creator_id` | 생성자 ID |
| `updated_at` | 수정일시 |
| `updater_id` | 수정자 ID |

### 5.6 Seed SQL 참고

> Seed SQL은 초기 개발 시 참고용으로 생성되었으며, `/entity_meta_by_entity` skill이 이를 대체한다.
> Entity 클래스 분석으로 entities, entity_columns, terminologies, common_codes, common_code_details를 자동 등록하므로 별도 Seed SQL 작성이 불필요하다.
