지정된 Entity의 특정 필드에 대한 공통코드를 `common_codes`(마스터) + `common_code_details`(상세) 테이블에 등록해줘.

파라미터: $ARGUMENTS
- 첫 번째: Entity 클래스명 (예: `RwaOrder`)
- 두 번째: 필드명 (예: `status`)
- 예시: `/code_by_entity_column RwaOrder status`

## 처리 절차

### 1. Entity 클래스 파일 찾기

`src/main/java/` 하위에서 Entity 클래스를 검색한다.
- 파일명 패턴: `{EntityClassName}.java`
- 클래스의 `@Table` 어노테이션, 필드 정의, Javadoc 주석을 확인

### 2. 필드 정보 수집

- 해당 필드의 `@Column` 어노테이션에서 DB 컬럼명, 길이 등 확인
- Javadoc 주석에서 허용 값 목록 파악 (예: `VISUAL/FUNCTIONAL/FULL`)
- 관련 상수 클래스(`Wms*Constants.java`)에서 코드 값과 설명 확인

### 3. 공통코드명 결정

- 패턴: `{ENTITY_TABLE_NAME}_{COLUMN_NAME}` (대문자, 언더스코어)
- 예: 테이블명 `rwa_orders` + 컬럼명 `status` → `RWA_ORDER_STATUS`
- 테이블명에서 마지막 `s`(복수형)는 제거: `rwa_orders` → `RWA_ORDER`

### 4. DB 접속

- `frontend/packages/operato-wes/config/config.development.js` 파일에서 DB 접속 정보 확인
- Python/psycopg2 사용 (psql CLI 미설치 환경 대응)
- psycopg2 미설치 시: `pip3 install psycopg2-binary`

### 5. 중복 확인

```sql
SELECT id FROM common_codes WHERE domain_id = %s AND name = '{CODE_NAME}'
```

이미 존재하는 도메인은 SKIP 처리.

### 6. 모든 도메인에 INSERT

```python
# 도메인 목록 조회
SELECT id, name FROM domains

# 마스터 코드 INSERT (도메인별)
INSERT INTO common_codes (id, domain_id, name, description, bundle, created_at, updated_at)
VALUES (%s, %s, '{CODE_NAME}', '{한국어 설명}', '{모듈 bundle}', now(), now())

# 상세 코드 INSERT (도메인별)
INSERT INTO common_code_details (id, domain_id, parent_id, name, description, rank)
VALUES (%s, %s, %s, '{코드값}', '{한국어 설명}', {rank})
```

- `id`: UUID 자동 생성
- `bundle`: Entity 패키지의 모듈명 (예: `operato.wms.rwa` → `rwa`)
- `rank`: 10 단위 증가 (10, 20, 30, ...)
- `description`: 상수 클래스의 Javadoc 또는 Entity 필드 주석에서 한국어 설명 추출

### 7. 결과 보고

- 도메인별 INSERT 건수 (마스터/상세)
- 등록된 코드 값 목록 테이블 형태로 출력

## 주의사항

- `common_code_details` 테이블에는 `created_at`/`updated_at` 컬럼이 **없음** (INSERT 시 제외)
- `common_codes` 테이블에는 `created_at`/`updated_at` 컬럼이 **있음**
- Unique 제약: `common_codes`는 `(domain_id, name)`, `common_code_details`는 `(domain_id, parent_id, name)`
- SQL seed 파일은 생성하지 않음 (DB 직접 INSERT만 수행)
