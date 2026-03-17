지정된 Entity 클래스에서 공통코드 대상 필드를 자동으로 찾아서 `common_codes`(마스터) + `common_code_details`(상세) 테이블에 일괄 등록해줘.

파라미터: $ARGUMENTS
- Entity 클래스명 (예: `RwaOrderItem`)
- 예시: `/code_by_entity RwaOrderItem`

## 처리 절차

### 1. Entity 클래스 파일 찾기

`src/main/java/` 하위에서 Entity 클래스를 검색한다.
- 파일명 패턴: `{EntityClassName}.java`
- 클래스의 `@Table` 어노테이션에서 테이블명 추출
- 패키지에서 모듈명(bundle) 추출 (예: `operato.wms.rwa` → `rwa`)

### 2. 공통코드 대상 필드 식별

다음 조건을 **모두** 만족하는 필드를 공통코드 대상으로 판별한다:
- String 타입
- Javadoc 주석에 허용 값이 슬래시(`/`)로 구분되어 있음 (예: `VISUAL/FUNCTIONAL/FULL`)
- 또는 `grid_editor`가 `code`인 entity_columns 등록이 있음

**제외 대상:**
- FK 참조 필드 (`*_id`)
- 자유 입력 필드 (코드, 명칭, 설명, 날짜, 번호 등)
- 확장 필드 (`attr01`~`attr05`)
- 비고 (`remarks`)

### 3. 상수 클래스에서 코드 값 수집

- 같은 모듈의 `Wms*Constants.java`에서 해당 필드와 매핑되는 상수 그룹을 찾는다
- 상수의 Javadoc 주석에서 한국어 설명을 추출한다
- 예: `STATUS_REQUEST = "REQUEST"` + Javadoc `상태: 반품 요청` → name=`REQUEST`, description=`반품 요청`

### 4. 공통코드명 결정

- 패턴: `{ENTITY_TABLE_NAME}_{COLUMN_NAME}` (대문자, 언더스코어)
- 테이블명에서 마지막 `s`(복수형)는 제거: `rwa_order_items` → `RWA_ORDER_ITEM`
- 예: `RWA_ORDER_ITEM_STATUS`, `RWA_ORDER_ITEM_DEFECT_TYPE`

### 5. DB 접속

- `frontend/packages/operato-wes/config/config.development.js` 파일에서 DB 접속 정보 확인
- Python/psycopg2 사용 (psql CLI 미설치 환경 대응)
- psycopg2 미설치 시: `pip3 install psycopg2-binary`

### 6. 중복 확인 후 모든 도메인에 INSERT

```python
# 도메인 목록 조회
SELECT id, name FROM domains

# 도메인별 중복 확인
SELECT id FROM common_codes WHERE domain_id = %s AND name = %s
# 이미 존재하면 SKIP

# 마스터 코드 INSERT
INSERT INTO common_codes (id, domain_id, name, description, bundle, created_at, updated_at)
VALUES (%s, %s, %s, %s, %s, now(), now())

# 상세 코드 INSERT
INSERT INTO common_code_details (id, domain_id, parent_id, name, description, rank)
VALUES (%s, %s, %s, %s, %s, %s)
```

- `id`: UUID 자동 생성
- `rank`: 10 단위 증가 (10, 20, 30, ...)

### 7. 결과 보고

- 식별된 공통코드 대상 필드 목록
- 공통코드명, 상세 코드 값, INSERT 건수를 테이블 형태로 출력

## 주의사항

- `common_code_details` 테이블에는 `created_at`/`updated_at` 컬럼이 **없음**
- `common_codes` 테이블에는 `created_at`/`updated_at` 컬럼이 **있음**
- Unique 제약: `common_codes`는 `(domain_id, name)`, `common_code_details`는 `(domain_id, parent_id, name)`
- SQL seed 파일은 생성하지 않음 (DB 직접 INSERT만 수행)
- 한 Entity에 공통코드 대상 필드가 여러 개면 **한번에 모두** 등록
