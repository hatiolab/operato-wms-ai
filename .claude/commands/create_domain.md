신규 도메인을 생성하고 초기 설정을 자동으로 구성해줘.

파라미터: $ARGUMENTS (선택 — 비어있으면 순차 질문으로 수집)

## 처리 절차

### Step 0: 파라미터 수집

$ARGUMENTS 가 비어있으면 AskUserQuestion 도구를 사용하여 아래 항목을 **순서대로 하나씩** 질문한다.
모든 질문이 끝난 뒤 입력값을 요약 출력하고, 사용자 확인 후 Step 1을 실행한다.

질문 순서:

1. **도메인 ID** (숫자만 허용)
   - 질문: `도메인 ID를 입력해주세요. (숫자, 예: 16)`
   - 필수값 — 숫자가 아니면 재질문
   - 중복 확인: `SELECT id, name FROM domains WHERE id = {domain_id} AND deleted_at IS NULL`
     - 존재하지 않으면 → **신규 생성 모드** (`reinit_mode = false`)
     - 이미 존재하면 → AskUserQuestion으로 확인:
       ```
       도메인 ID {domain_id} ({name})이 이미 존재합니다.
       설정 데이터(메뉴/권한/roles 등)를 재초기화하시겠습니까?
       (재초기화 모드: domains 레코드는 유지하고 설정 데이터만 새로 생성)
       ```
       - 확인 → **재초기화 모드** (`reinit_mode = true`), `domain_name`과 `domain_display`는 기존 DB 값으로 자동 설정 (질문 2·3 생략)
       - 취소 → 중단

2. **도메인 이름** (영문 소문자, 숫자, 하이픈만 허용) — 신규 생성 모드일 때만 질문
   - 질문: `도메인 이름을 입력해주세요. (영문 소문자, 예: acme)`
   - 필수값 — 비어있으면 재질문

3. **도메인 표시명** (한국어 또는 영문) — 신규 생성 모드일 때만 질문
   - 질문: `도메인 표시명을 입력해주세요. (예: ACME 물류센터)`
   - 필수값 — 비어있으면 재질문
   - `brand_name` 과 `description` 에 동일한 값으로 저장

4. **관리자 이메일**
   - 질문: `관리자 계정 이메일을 입력해주세요. (예: admin@acme.com)`
   - 필수값 — 이메일 형식 확인

5. **초기 비밀번호**
   - 질문: `초기 비밀번호를 입력해주세요. (기본값: operato@123! — 엔터로 기본값 사용)`
   - 기본값: `operato@123!`

6. **기본 로케일**
   - 질문: `기본 로케일을 입력해주세요. (기본값: ko-KR — 엔터로 기본값 사용)`
   - 기본값: `ko-KR`

7. **프론트엔드 접근 URL**
   - 질문: `프론트엔드 접근 URL을 입력해주세요. (비워두면 복제 원본 도메인의 값 사용)`
   - 기본값: 없음 — 비워두면 Step 9에서 복제 원본 도메인의 `client.context.path` 값 그대로 사용

8. **복제 원본 도메인 ID**
   - 먼저 DB에서 도메인 목록을 조회하여 출력한다:
     ```python
     SELECT id, name, description FROM domains WHERE deleted_at IS NULL ORDER BY id
     ```
   - 출력 예시:
     ```
     복제 가능한 도메인 목록:
       [11] yujin      — 관리 도메인
       [12] avnet      — AVNET
       [13] satori     — 한국 사토리
     ```
   - 질문: `복제 원본 도메인 ID를 입력해주세요.`
   - 숫자가 아니거나 목록에 없는 ID면 재질문
   - 입력된 ID로 조회하여 `source_domain_id` 와 `source_domain_name` 확정

모든 항목 수집 후 확인 메시지 출력:

신규 생성 모드:
```
아래 내용으로 도메인을 생성합니다.

  ID       : {domain_id}
  이름     : {domain_name}
  표시명   : {domain_display}
  관리자   : {admin_email}
  비밀번호 : {init_password}
  로케일   : {locale}
  URL      : {client_url}
  복제 원본 : [{source_domain_id}] {source_domain_name}

진행할까요? (y/n)
```

재초기화 모드:
```
아래 내용으로 도메인 설정 데이터를 재초기화합니다.
(domains 레코드는 유지됩니다)

  ID       : {domain_id}
  이름     : {domain_name}
  표시명   : {domain_display}
  관리자   : {admin_email}
  비밀번호 : {init_password}
  로케일   : {locale}
  URL      : {client_url}
  복제 원본 : [{source_domain_id}] {source_domain_name}

진행할까요? (y/n)
```

사용자가 `n` 또는 취소 의사를 밝히면 **중단**한다.

---

### Step 1: 기반 데이터 준비

DB 접속 정보는 `frontend/packages/operato-wes/config/config.development.js` 의 `ormconfig` 섹션에서 확인한다.
Python psycopg2 사용 (미설치 시 `pip3 install psycopg2-binary`).

```python
# 복제 원본 도메인 확인 (Step 0에서 입력받은 source_domain_id)
SELECT id, name FROM domains WHERE id = {source_domain_id} AND deleted_at IS NULL
# 존재하지 않으면 오류 출력 후 중단

# 신규 생성 모드일 때만: 도메인 이름 중복 확인
if not reinit_mode:
    SELECT id FROM domains WHERE name = '{domain_name}'
    # 이미 존재하면 오류 출력 후 중단
```

#### 재초기화 모드 전용: 잔여 설정 데이터 확인 및 정리

`reinit_mode = true` 일 때, 설정 테이블에 잔여 데이터가 있으면 삭제 후 진행한다.

```python
config_tables = [
    'permissions', 'users_roles',
    'menu_columns', 'menu_buttons', 'menu_params',
    'menu_detail_buttons', 'menu_detail_columns', 'menu_details',
    'menus',
    'entity_columns', 'entities',
    'common_code_details', 'common_codes',
    'terminologies', 'settings', 'roles',
    'diy_services', 'diy_templates', 'printouts',
]

residual = {}
for tbl in config_tables:
    try:
        SELECT count(*) FROM {tbl} WHERE domain_id = {new_domain_id}
        if count > 0: residual[tbl] = count
    except: pass  # 테이블 없으면 SKIP

if residual:
    # 잔여 데이터 목록 출력
    print("⚠ 잔여 설정 데이터 발견:")
    for tbl, cnt in residual.items():
        print(f"  {tbl}: {cnt}건")

    # FK 의존성 순서대로 삭제
    for tbl in config_tables:
        if tbl in residual:
            DELETE FROM {tbl} WHERE domain_id = {new_domain_id}
            print(f"  ✓ {tbl} {rowcount}건 정리")
```

---

### Step 2: domains 테이블 INSERT

**재초기화 모드(`reinit_mode = true`)이면 이 Step을 건너뛴다.**

신규 생성 모드일 때만 INSERT:

```python
INSERT INTO domains (
    id, name, description, subdomain, brand_name,
    mw_site_cd, content_image, system_flag,
    site_port, creator_id, updater_id, created_at, updated_at
) VALUES (
    {domain_id},              -- id
    '{domain_name}',          -- name
    '{domain_display}',       -- description (표시명과 동일값)
    '{domain_name}',          -- subdomain
    '{domain_display}',       -- brand_name
    '{domain_name}',          -- mw_site_cd
    'OPERATION',              -- content_image
    false,                    -- system_flag
    0,                        -- site_port
    '{admin_email}',          -- creator_id
    '{admin_email}',          -- updater_id
    now(), now()
)
```

→ `{domain_id}` 를 이후 모든 steps에서 `new_domain_id` 로 사용한다.

---

### Step 3: roles 생성

아래 4개 role을 신규 도메인에 생성한다.

| name | description |
|------|-------------|
| admin | 관리자 |
| manager | 매니저 |
| guest | 게스트 |
| {domain_name} | {domain_display} |

```python
INSERT INTO roles (name, description, domain_id, creator_id, updater_id, created_at, updated_at)
VALUES (%s, %s, {new_domain_id}, '{admin_email}', '{admin_email}', now(), now())
RETURNING id, name
```

4개 role을 모두 INSERT 후 `{ name → id }` 매핑 딕셔너리를 저장한다.
(예: `new_roles = {'admin': 'uuid-...', 'manager': 'uuid-...', ...}`)

원본 도메인(avnet)의 role ID도 조회해두어 이후 permissions 복제 시 매핑에 사용한다:
```python
SELECT id, name FROM roles WHERE domain_id = {source_domain_id}
# source_roles = { name → id }
```

---

### Step 4: menus + menu_columns + menu_buttons + menu_details + menu_detail_buttons + menu_detail_columns + menu_params 복제

#### 4-1. menus 복제 (parent-child 구조 보존)

```python
SELECT * FROM menus WHERE domain_id = {source_domain_id} ORDER BY rank, id
```

- `id` 를 신규 UUID로 교체 (`uuid_generate_v4()` 또는 Python `uuid.uuid4()`)
- 구 id → 신 id 매핑 딕셔너리 유지: `menu_id_map = {}`
- `parent_id` 가 있는 경우 → `menu_id_map[old_parent_id]` 로 교체
- `domain_id` → `new_domain_id` 로 교체
- `role_id` 가 있는 경우 → `new_roles` 딕셔너리로 role name 기반 교체 (없으면 NULL)
- INSERT 순서: `parent_id IS NULL` 인 것 먼저, 그 다음 자식 순서로

```python
INSERT INTO menus (
    id, name, description, parent_id, template, menu_type, category,
    rank, icon_path, hidden_flag, routing, routing_type,
    resource_type, resource_name, resource_url, grid_save_url,
    pagination, domain_id, role_id,
    creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 4-2. menu_columns 복제

```python
SELECT * FROM menu_columns WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `menu_id` → `menu_id_map[old_menu_id]` 로 교체
- `domain_id` → `new_domain_id`

```python
INSERT INTO menu_columns (
    id, menu_id, name, description, rank, ref_menu_id,
    col_name, col_header, col_width, col_type, col_align,
    hidden_flag, uneditable_flag, required_flag,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 4-3. menu_buttons 복제

```python
SELECT * FROM menu_buttons WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `menu_id` → `menu_id_map[old_menu_id]` 로 교체
- `domain_id` → `new_domain_id`

```python
INSERT INTO menu_buttons (
    id, menu_id, name, description, rank, button_type,
    icon_path, action_type, action_name,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 4-4. menu_details 복제

```python
SELECT * FROM menu_details WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID, 구 id → 신 id 매핑 딕셔너리 유지: `menu_detail_id_map = {}`
- `menu_id` → `menu_id_map[old_menu_id]` 로 교체
- `domain_id` → `new_domain_id`

```python
INSERT INTO menu_details (
    id, menu_id, name, description, rank, ...
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 4-5. menu_detail_buttons 복제

```python
SELECT * FROM menu_detail_buttons WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `menu_detail_id` → `menu_detail_id_map[old_menu_detail_id]` 로 교체
- `domain_id` → `new_domain_id`

```python
INSERT INTO menu_detail_buttons (
    id, menu_detail_id, name, description, rank, ...
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 4-6. menu_detail_columns 복제

```python
SELECT * FROM menu_detail_columns WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `menu_detail_id` → `menu_detail_id_map[old_menu_detail_id]` 로 교체
- `domain_id` → `new_domain_id`

```python
INSERT INTO menu_detail_columns (
    id, menu_detail_id, name, description, rank, ...
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 4-7. menu_params 복제

```python
SELECT * FROM menu_params WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `menu_id` → `menu_id_map[old_menu_id]` 로 교체
- `domain_id` → `new_domain_id`

```python
INSERT INTO menu_params (
    id, menu_id, name, description, rank, ...
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

> 실제 컬럼 목록은 `information_schema.columns` 에서 확인 후 사용한다.

---

### Step 5: terminologies 복제

```python
SELECT * FROM terminologies WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `domain_id` → `new_domain_id`
- 나머지 컬럼 그대로 복제

```python
INSERT INTO terminologies (
    domain_id, name, locale, category, display, created_at, updated_at
) VALUES (...)
```

---

### Step 6: entities + entity_columns 복제

#### 6-1. entities 복제

```python
SELECT * FROM entities WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID, 구 id → 신 id 매핑: `entity_id_map = {}`
- `domain_id` → `new_domain_id`
- `master_id` 가 있는 경우 → `entity_id_map[old_master_id]` 로 교체
  (master_id가 아직 처리 안 된 경우: master → detail 순서로 정렬 후 INSERT)

```python
INSERT INTO entities (
    id, name, description, bundle, table_name,
    search_url, multi_save_url, id_type, id_field,
    title_field, desc_field, data_prop, active,
    fixed_columns, master_id, association, ref_field, del_strategy,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 6-2. entity_columns 복제

```python
SELECT * FROM entity_columns WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `entity_id` → `entity_id_map[old_entity_id]` 로 교체
- `domain_id` → `new_domain_id`

```python
INSERT INTO entity_columns (
    id, entity_id, name, description, rank, term,
    col_type, col_size, nullable,
    ref_type, ref_name,
    search_rank, search_editor, search_oper, sort_rank,
    grid_rank, grid_editor, grid_width, grid_align,
    uniq_rank, domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

> 실제 컬럼 목록은 `information_schema.columns` 에서 확인 후 사용한다.

---

### Step 7: common_codes + common_code_details 복제

#### 7-1. common_codes 복제

```python
SELECT * FROM common_codes WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID, 구 id → 신 id 매핑: `code_id_map = {}`
- `domain_id` → `new_domain_id`

```python
INSERT INTO common_codes (
    id, name, description, bundle,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 7-2. common_code_details 복제

```python
SELECT * FROM common_code_details WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `parent_id` → `code_id_map[old_parent_id]` 로 교체
- `domain_id` → `new_domain_id`
- **주의**: `created_at`, `updated_at` 컬럼 없음 — INSERT 시 제외

```python
INSERT INTO common_code_details (
    id, parent_id, name, description, rank,
    data_1, data_2, data_3, data_4, data_5,
    labels, domain_id
) VALUES (...)
```

---

### Step 8: permissions 복제

```python
SELECT * FROM permissions WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `role_id` → `source_roles[name]` 로 구 role name을 찾은 뒤 → `new_roles[name]` 으로 교체
  - 매핑 안 되는 role_id 는 SKIP (경고 출력)
- `resource_id` → 리소스 타입이 `Menu` 인 경우 `menu_id_map[old_resource_id]` 로 교체
  - 매핑 안 되는 resource_id 는 원본 값 유지
- `domain_id` → `new_domain_id`

```python
INSERT INTO permissions (
    id, role_id, resource_id, resource_type, action_name, method_name,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

---

### Step 9: diy_services + diy_templates + printouts 복제

세 테이블 모두 `domain_id` 기반으로 복제한다. 실제 컬럼 목록은 `information_schema.columns` 에서 확인 후 사용한다.

#### 9-1. diy_services 복제

```python
SELECT * FROM diy_services WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID, 구 id → 신 id 매핑: `diy_service_id_map = {}`
- `domain_id` → `new_domain_id`
- 나머지 컬럼 그대로 복제

```python
INSERT INTO diy_services (
    -- information_schema.columns 로 실제 컬럼 확인 후 사용
    id, ..., domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 9-2. diy_templates 복제

```python
SELECT * FROM diy_templates WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `service_id` 컬럼이 있으면 → `diy_service_id_map[old_service_id]` 로 교체 (없으면 원본 유지)
- `domain_id` → `new_domain_id`

```python
INSERT INTO diy_templates (
    -- information_schema.columns 로 실제 컬럼 확인 후 사용
    id, ..., domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

#### 9-3. printouts 복제

```python
SELECT * FROM printouts WHERE domain_id = {source_domain_id}
```

- `id` → 신규 UUID
- `domain_id` → `new_domain_id`
- 나머지 컬럼 그대로 복제

```python
INSERT INTO printouts (
    -- information_schema.columns 로 실제 컬럼 확인 후 사용
    id, ..., domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

---

### Step 10: settings INSERT (구 Step 9)

아래 항목들을 `new_domain_id` 로 INSERT한다.
복제 원본 도메인(`source_domain_id`)의 settings에서 공통 항목은 그대로 복제하되,
**도메인별 고유값** 항목만 수집한 파라미터로 교체한다.

```python
SELECT * FROM settings WHERE domain_id = {source_domain_id}
```

복제 시 아래 name에 해당하는 value는 파라미터 값으로 교체:

| name | 교체값 |
|------|--------|
| `locale.default` | `{locale}` |
| `client.context.path` | `{client_url}` (비어있으면 원본 값 그대로 유지) |
| `seed.source.domain.name` | `{domain_name}` |
| `security.init.pass` | `{init_password}` |
| `login.info.message` | `{domain_display} 센터에 오신 것을 환영합니다.` |

나머지 항목은 value 그대로 복제한다.

```python
INSERT INTO settings (
    id, name, description, value, category,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (...)
```

---

### Step 11: 관리자 계정 생성

```python
# 계정 중복 확인 (이메일 기준, 다른 도메인에 이미 있을 수 있음)
SELECT id FROM users WHERE email = '{admin_email}'
```

계정이 없으면 신규 생성:

```python
INSERT INTO users (
    login, email, name,
    encrypted_password,   -- bcrypt hash of init_password (Python bcrypt 라이브러리 사용)
    admin_flag, active_flag, super_user, operator_flag,
    account_type, user_type, status,
    locale, fail_count,
    domain_id, creator_id, updater_id, created_at, updated_at
) VALUES (
    '{admin_email}', '{admin_email}', '{domain_display} 관리자',
    {bcrypt_hash},
    true, true, false, false,
    'user', 'user', 'activated',
    '{locale}', 0,
    {new_domain_id}, '{admin_email}', '{admin_email}', now(), now()
)
RETURNING id
```

bcrypt 해시 생성:
```python
import bcrypt
hashed = bcrypt.hashpw(init_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
# bcrypt 미설치 시: pip3 install bcrypt
```

이미 계정이 존재하면 INSERT 생략하고 기존 user id 사용.

---

### Step 12: domain_users INSERT

대상 사용자 목록을 구성한다:
1. 입력받은 관리자 계정 (`{admin_email}`)
2. `super_user = true` 인 모든 사용자

```python
# 대상 사용자 목록: 관리자 계정 + super_user=true 사용자 (중복 제거)
target_users = set()
target_users.add('{admin_email}')

SELECT id FROM users WHERE super_user = true
# → 조회된 id를 모두 target_users에 추가

# 각 사용자에 대해 중복 확인 후 INSERT
for user_id in target_users:
    SELECT id FROM domain_users WHERE domain_id = {new_domain_id} AND user_id = {user_id}
    # 없으면:
    INSERT INTO domain_users (
        id, user_id, domain_id,
        creator_id, updater_id, created_at, updated_at
    ) VALUES (
        uuid.uuid4(), {user_id}, {new_domain_id},
        '{admin_email}', '{admin_email}', now(), now()
    )
```

---

### Step 13: users_roles INSERT

admin role을 연결할 대상 사용자 목록을 구성한다:
1. 입력받은 관리자 계정 (`{admin_email}`)
2. `super_user = true` 인 모든 사용자

```python
# admin role id 조회 (Step 3에서 생성한 new_roles['admin'])
admin_role_id = new_roles['admin']

# 대상 사용자 목록: 관리자 계정 + super_user=true 사용자 (중복 제거)
target_users = set()
target_users.add('{admin_email}')

SELECT id FROM users WHERE super_user = true
# → 조회된 id를 모두 target_users에 추가

# 각 사용자에 대해 중복 확인 후 INSERT
for user_id in target_users:
    SELECT id FROM users_roles WHERE user_id = {user_id} AND role_id = {admin_role_id} AND domain_id = {new_domain_id}
    # 없으면:
    INSERT INTO users_roles (
        id, user_id, role_id, users_id, roles_id, domain_id
    ) VALUES (
        uuid.uuid4(),    -- id
        {user_id},       -- user_id
        {admin_role_id}, -- role_id (new_roles['admin'])
        {user_id},       -- users_id (user_id와 동일)
        {admin_role_id}, -- roles_id (role_id와 동일)
        {new_domain_id}  -- domain_id
    )
```

---

### Step 14: 결과 보고

모든 단계 완료 후 아래 형식으로 결과를 출력한다.

```
✅ 도메인 생성 완료!

📋 도메인 정보
  ID       : {new_domain_id}
  이름     : {domain_name}
  표시명   : {domain_display}
  관리자   : {admin_email}
  로케일   : {locale}

📊 초기 데이터 설정 결과
  roles               :  4건 생성
  menus               : {n}건 복제
  menu_columns        : {n}건 복제
  menu_buttons        : {n}건 복제
  menu_details        : {n}건 복제
  menu_detail_buttons : {n}건 복제
  menu_detail_columns : {n}건 복제
  menu_params         : {n}건 복제
  terminologies       : {n}건 복제
  entities            : {n}건 복제
  entity_columns      : {n}건 복제
  common_codes        : {n}건 복제
  common_code_details : {n}건 복제
  permissions         : {n}건 복제
  diy_services        : {n}건 복제
  diy_templates       : {n}건 복제
  printouts           : {n}건 복제
  settings            : {n}건 생성
  users               : {신규생성 또는 기존계정 사용}
  domain_users        : {n}건 등록 (관리자 + super_user 대상)
  users_roles         : {n}건 등록 (관리자 + super_user 대상)
```

---

## 주의사항

- `domain_id` 중복 확인 필수 — 이미 존재하면 즉시 중단 (Step 0 입력 시 재질문)
- `domain_name` 중복 확인 필수 — 이미 존재하면 즉시 중단
- 복제 원본은 Step 0에서 사용자가 입력한 `source_domain_id` 사용 (고정값 없음)
- `common_code_details` 테이블에는 `created_at` / `updated_at` 컬럼 없음 — INSERT 시 반드시 제외
- menus의 `parent_id` 재귀 참조 → 반드시 부모 먼저 INSERT (rank 기준 정렬 활용)
- entities의 `master_id` 재귀 참조 → master 먼저 INSERT (`master_id IS NULL` 우선 처리)
- permissions의 `role_id` 매핑 실패 시 해당 건 SKIP 후 경고 출력 (중단하지 않음)
- users 테이블의 `encrypted_password` 는 반드시 bcrypt 해시로 저장
- 모든 신규 UUID는 Python `uuid.uuid4()` 로 생성
- DB 접속 정보: `frontend/packages/operato-wes/config/config.development.js` → `ormconfig` 섹션
