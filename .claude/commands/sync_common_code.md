지정한 소스 도메인의 공통코드를 다른 모든 도메인에 동일하게 생성 또는 업데이트해줘.

파라미터: $ARGUMENTS
- 첫 번째: 소스 도메인 (domain_id 숫자 또는 domain name 문자열, 예: `18` 또는 `logion_demo`)
- 두 번째: 공통코드 명 (예: `INVENTORY_TRANSACTION`)
- 예시: `/sync_common_code 18 INVENTORY_TRANSACTION`

## 처리 절차

### 1. 파라미터 파싱

- 첫 번째 인자가 숫자이면 `domain_id`로, 문자열이면 `name`으로 도메인 조회
- 두 번째 인자는 공통코드 `name` (대소문자 구분 없이 대문자로 정규화)

### 2. DB 접속

- `frontend/packages/operato-wes/config/config.development.js` 파일에서 DB 접속 정보 확인
- Python/psycopg2 사용

### 3. 소스 데이터 조회

```sql
-- 소스 도메인 확인
SELECT id, name FROM domains WHERE id = {source} OR name = '{source}'

-- 소스 공통코드 마스터 조회
SELECT id, name, description, bundle
FROM common_codes
WHERE name = '{CODE_NAME}' AND domain_id = {source_domain_id}

-- 소스 공통코드 상세 조회 (rank 순)
SELECT name, description, rank, data_1, data_2, data_3, data_4, data_5, labels
FROM common_code_details
WHERE parent_id = '{source_cc_id}'
ORDER BY rank
```

소스 도메인에 해당 공통코드가 없으면 오류 메시지 출력 후 종료.

### 4. 대상 도메인에 동기화

소스 도메인을 제외한 모든 도메인에 대해 처리:

```sql
-- 대상 도메인 목록 (소스 도메인 제외)
SELECT id, name FROM domains WHERE id != {source_domain_id} ORDER BY id
```

**공통코드 마스터 처리**:
- 존재하지 않으면 INSERT (새 UUID 생성)
- 존재하면 UPDATE (description, bundle 업데이트)

```python
# INSERT
INSERT INTO common_codes (id, name, description, bundle, domain_id, created_at, updated_at)
VALUES (uuid4(), '{name}', '{description}', '{bundle}', {domain_id}, now(), now())

# UPDATE
UPDATE common_codes
SET description = '{description}', bundle = '{bundle}', updated_at = now()
WHERE id = '{existing_id}'
```

**공통코드 상세 처리** (소스의 모든 서브코드를 순회):
- 존재하지 않으면 INSERT
- 존재하면 UPDATE (description, rank, data_1~5, labels 업데이트)

```python
# INSERT
INSERT INTO common_code_details (id, parent_id, name, description, rank, domain_id,
    data_1, data_2, data_3, data_4, data_5, labels)
VALUES (uuid4(), '{parent_id}', '{name}', '{description}', {rank}, {domain_id},
    {data_1}, {data_2}, {data_3}, {data_4}, {data_5}, {labels})

# UPDATE
UPDATE common_code_details
SET description = '{description}', rank = {rank},
    data_1 = {data_1}, data_2 = {data_2}, data_3 = {data_3},
    data_4 = {data_4}, data_5 = {data_5}, labels = {labels}
WHERE id = '{existing_id}'
```

> **참고**: `common_code_details` 테이블에는 `created_at`/`updated_at` 컬럼이 **없음**

### 5. 결과 보고

```
✅ 공통코드 동기화 완료!

📋 소스
  도메인: {source_name} (id={source_domain_id})
  코드명: {CODE_NAME}
  설명: {description}
  Bundle: {bundle}

📦 서브코드 목록
  | 코드 | 설명 | 순서 |
  | DISCOVERY | 발견 | 10 |
  ...

📊 동기화 결과 ({target_count}개 도메인)
  common_codes        — INSERT: N건, UPDATE: N건
  common_code_details — INSERT: N건, UPDATE: N건
```

## 주의사항

- 소스 도메인 자신은 동기화 대상에서 제외
- 소스에 없는 서브코드는 대상 도메인에서 삭제하지 않음 (추가/업데이트만 수행)
- Unique 제약: `common_codes`는 `(domain_id, name)`, `common_code_details`는 `(domain_id, parent_id, name)`
- SQL seed 파일은 생성하지 않음 (DB 직접 처리만 수행)
