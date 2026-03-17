지정된 Entity 클래스를 분석하여 `entities` + `entity_columns` 테이블에 메타데이터를 자동 등록해줘.

파라미터: $ARGUMENTS
- Entity 클래스명 (예: `RwaOrder`) 또는 패키지 경로 (예: `operato.wms.rwa.entity.RwaOrder`)
- 예시: `/entity_meta_by_entity RwaOrder`

> **참조 문서**: `docs/development/operato-service-dev-guide.md`

## 처리 절차

### 1. Entity 클래스 파일 찾기

`src/main/java/` 하위에서 Entity 클래스를 검색한다.
- 파일명 패턴: `{EntityClassName}.java`
- 클래스의 `@Table` 어노테이션에서 추출:
  - `name` → 테이블명 (예: `rwa_orders`)
  - `idStrategy` → ID 생성 전략 (UUID 등)
  - `uniqueFields` → 유니크 필드 조합
- 패키지에서 모듈명(bundle) 추출 (예: `operato.wms.rwa` → `rwa`)

### 2. Entity 필드 분석

각 필드에서 다음 정보를 추출한다:

| 소스 | 추출 정보 | 매핑 |
|------|----------|------|
| `@PrimaryKey` | PK 여부 | grid_rank=0 (숨김) |
| `@Column(name)` | DB 컬럼명 | entity_columns.name |
| `@Column(length)` | 컬럼 크기 | entity_columns.col_size |
| `@Column(nullable)` | NULL 허용 | entity_columns.nullable |
| Java 타입 | 컬럼 유형 | entity_columns.col_type |
| Javadoc 주석 | 한국어 설명 | entity_columns.description |
| Javadoc 슬래시(`/`) 값 | CommonCode 대상 | ref_type, ref_name |

#### Java 타입 → col_type 매핑

| Java 타입 | col_type |
|-----------|----------|
| `String` | `string` |
| `Integer` | `integer` |
| `Double` | `float` |
| `Boolean` | `boolean` |
| `java.util.Date` | `datetime` |

#### 시스템 자동 추가 필드 (entity_columns 등록 불필요)

다음 필드는 프레임워크가 자동 관리하므로 entity_columns에 등록하지 않는다:
- `domain_id`, `created_at`, `creator_id`, `updated_at`, `updater_id`

### 3. 마스터-디테일 관계 판별

FK 필드(`*_id`)가 다른 Entity의 테이블을 참조하는지 확인한다.

- FK 필드의 Javadoc에 `FK → {테이블명}.id` 패턴이 있으면 디테일 Entity로 판별
- 디테일 Entity인 경우:
  - DB에서 마스터 Entity 조회: `SELECT id FROM entities WHERE domain_id = :domain_id AND table_name = :master_table`
  - `master_id` = 마스터 Entity ID
  - `ref_field` = FK 컬럼명 (예: `rwa_order_id`)
  - `del_strategy` = `destroy_all` (기본값)
- **관계 유형 판별**:
  - `@Table(uniqueFields)`에서 FK 필드가 단독으로 unique이면 → `one-to-one`
  - 그 외 → `one-to-many`
- 마스터 Entity가 DB에 없으면 경고 출력 후 `master_id = NULL`로 진행

### 4. entities INSERT 값 결정

| 항목 | 결정 규칙 |
|------|----------|
| `id` | **생략** (uuid_generate_v4() 기본값) |
| `name` | Entity 클래스명 (PascalCase) |
| `description` | 클래스 Javadoc의 첫 줄 한국어 설명 |
| `bundle` | 패키지 모듈명 (예: `rwa`) |
| `table_name` | `@Table(name)` 값 |
| `search_url` | `{table_name}` (**첫글자 `/` 없음**) |
| `multi_save_url` | `{table_name}/update_multiple` (**첫글자 `/` 없음**) |
| `id_type` | `@Table.idStrategy`가 UUID면 `uuid` |
| `id_field` | Entity에 `id` 필드가 있으면 `id` |
| `title_field` | uniqueFields의 첫 번째 비-FK/비-domainId 필드 (snake_case) |
| `desc_field` | `remarks` 필드가 있으면 `remarks` |
| `data_prop` | `items` (기본값) |
| `active` | `true` |
| `fixed_columns` | `3` (기본값) |
| `master_id` | 디테일이면 마스터 Entity ID, 아니면 NULL |
| `association` | `one-to-one` 또는 `one-to-many` (디테일만) |
| `ref_field` | FK 컬럼명 (디테일만) |
| `del_strategy` | `destroy_all` (디테일만) |

### 5. entity_columns INSERT 값 결정

각 필드별로 다음 메타데이터를 결정한다:

#### 기본 필드

| 항목 | 결정 규칙 |
|------|----------|
| `id` | **생략** (uuid_generate_v4() 기본값) |
| `entity_id` | 4단계에서 INSERT 후 `RETURNING id`로 획득한 값 |
| `name` | `@Column(name)` 값 (snake_case) |
| `description` | Javadoc 첫 줄 한국어 설명 |
| `rank` | 10부터 10씩 증가 (필드 순서대로) |
| `term` | `label.{column_name}` |
| `col_type` | Java 타입 매핑 (위 표 참조) |
| `col_size` | `@Column(length)` 값 (String만) |
| `nullable` | `@Column(nullable)` 반전 (nullable=false → false) |

#### 검색/정렬/그리드 rank

- **search_rank**: 주요 검색 대상 필드만 10, 20, 30, ... (나머지 0)
  - 검색 대상 후보: 코드/번호 필드, 상태 필드, 유형 필드, 날짜 필드
- **sort_rank**: 기본 정렬 대상만 10, 20 (나머지 0)
  - 정렬 대상 후보: 주요 번호 필드, 날짜 필드
- **grid_rank**: 그리드 표시 대상 필드만 10, 20, 30, ... (나머지 0)
  - 미표시: PK(`id`), FK(`*_id`), 확장 필드(`attr01`~`attr05`), 운영 상세 필드
  - 표시: 나머지 업무 필드

#### 참조 타입 (ref_type / ref_name)

- **CommonCode 필드** (Javadoc에 슬래시 구분 허용값이 있는 경우):
  - `ref_type` = `CommonCode`
  - `ref_name` = `{TABLE_NAME_SINGULAR}_{COLUMN_NAME}` (대문자)
  - 테이블명 복수형 `s` 제거: `rwa_orders` → `RWA_ORDER`

- **Entity 참조 필드** (컬럼명이 `_cd`로 끝나는 String 필드):
  - `ref_type` = `Entity`
  - `ref_name` = `{참조 엔티티명}` (컬럼의 의미와 프로젝트 내 Entity 클래스 기반 판단)
  - 예: `com_cd` → `ref_name = 'Company'`, `wh_cd` → `ref_name = 'Warehouse'`, `sku_cd` → `ref_name = 'Sku'`

#### 에디터 결정 규칙

| 조건 | grid_editor | search_editor |
|------|------------|---------------|
| PK 필드 (`id`) | 미표시 (grid_rank=0) | - |
| FK 필드 (`*_id`) | 미표시 (grid_rank=0) | - |
| `ref_type = 'CommonCode'` | `code-combo` | `code-combo` (search_rank>0일 때) |
| `ref_type = 'Entity'` (User 제외) | `resource-code` | `resource-code` (search_rank>0일 때) |
| Boolean 타입 | `checkbox` | - |
| 날짜 필드 (`col_type=date/datetime` 또는 `_date`로 끝남) | `date` | `date-picker` (search_rank>0일 때) |
| DateTime(java.util.Date) 시스템 필드 | `readonly` | - |
| Integer / Double 타입 | `number` | - |
| 긴 텍스트 (length >= 500) | `text` | - |
| 나머지 String | NULL | - |

#### 그리드 정렬 (grid_align)

허용값: `left`, `center`, `far` (3가지만 사용)

| col_type | grid_align |
|----------|-----------|
| `integer`, `float` | `far` |
| `boolean` | `center` |
| 긴 텍스트, 이름 필드 (`*_nm`) | `left` |
| 나머지 | `center` |

#### 그리드 너비 (grid_width) 기본값

| 유형 | grid_width |
|------|-----------|
| 코드/상태 필드 | 100 |
| 번호/날짜 필드 | 120~150 |
| 이름 필드 | 150~200 |
| 수량/숫자 필드 | 80 |
| Boolean 필드 | 80 |
| 긴 텍스트 | 200 |

#### search_oper 결정

- `ref_type = 'CommonCode'` 이고 `search_rank > 0` → `eq`
- `ref_type = 'Entity'` 이고 `search_rank > 0` → `eq`
- 날짜 필드 (`_date`로 끝남) 이고 `search_rank > 0` → `eq`
- 그 외 → NULL (프레임워크 기본값 사용)

### 6. DB 접속 및 INSERT

- `frontend/packages/operato-wes/config/config.development.js` 파일에서 DB 접속 정보 확인
- Python/psycopg2 사용 (psql CLI 미설치 환경 대응)
- psycopg2 미설치 시: `pip3 install psycopg2-binary`

```python
# 도메인 목록 조회
SELECT id, name FROM domains

# 도메인별 중복 확인
SELECT id FROM entities WHERE domain_id = %s AND name = %s
# 이미 존재하면 SKIP (경고 출력)

# entities INSERT (id 생략)
INSERT INTO entities (
    domain_id, name, description, bundle, table_name,
    search_url, multi_save_url, id_type, id_field, title_field, desc_field,
    data_prop, active, fixed_columns,
    master_id, association, ref_field, del_strategy,
    created_at, updated_at
) VALUES (%s, ..., now(), now())
RETURNING id

# entity_columns INSERT (id 생략)
INSERT INTO entity_columns (
    domain_id, entity_id, name, description, rank, term,
    col_type, col_size, nullable,
    ref_type, ref_name,
    search_rank, search_editor, search_oper, sort_rank,
    grid_rank, grid_editor, grid_width, grid_align,
    uniq_rank, created_at, updated_at
) VALUES (%s, ..., now(), now())
```

### 7. 결과 보고

- Entity 정보 테이블: 이름, 테이블명, bundle, 마스터-디테일 관계
- entity_columns 요약: 총 컬럼 수, CommonCode 필드 수, 검색 필드 수, 그리드 표시 필드 수
- 도메인별 INSERT 건수 (entities / entity_columns)
- CommonCode 필드 목록 (ref_name 포함)

## 주의사항

- `entities`, `entity_columns` 테이블의 `id` 컬럼은 `uuid_generate_v4()` 기본값 → INSERT 시 **생략**
- `search_url`, `multi_save_url`: 첫글자 `/`를 붙이지 **않는다**
- `id_field`: Entity에 `id` 필드가 있으면 반드시 `id`로 설정
- `data_prop`: 기본값은 `items`
- 시스템 자동 추가 필드 (`domain_id`, `created_at`, `creator_id`, `updated_at`, `updater_id`)는 entity_columns에 등록하지 않는다
- `search_rank`, `sort_rank`, `grid_rank`는 **10부터 시작**하여 **10씩 증가** (10, 20, 30, ...)
- CommonCode 필드의 `search_editor`/`grid_editor`는 `code-combo`
- `common_codes` 등록은 이 skill의 범위가 아님 (별도 `/code_by_entity` 사용)
- Unique 제약: `entities`는 `(domain_id, name)`, `entity_columns`는 `(domain_id, entity_id, name)`
- 마스터-디테일 관계에서 마스터 Entity가 DB에 없으면 경고 출력 후 `master_id = NULL`로 진행
- `operato-service-dev-guide.md` 문서의 규칙을 최우선으로 따른다
