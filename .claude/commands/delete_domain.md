도메인과 관련 데이터를 삭제해줘. `/create_domain` 으로 생성된 도메인의 초기 설정 데이터 및 업무 데이터를 정리한다.

파라미터: $ARGUMENTS (선택 — 비어있으면 대화형으로 진행)

## 처리 절차

### Step 0: 삭제 대상 도메인 선택

DB 접속 정보는 `frontend/packages/operato-wes/config/config.development.js` 의 `ormconfig` 섹션에서 확인한다.
Python psycopg2 사용.

현재 도메인 목록을 조회하여 출력한다:

```python
SELECT id, name, description, created_at
FROM domains
WHERE deleted_at IS NULL
ORDER BY id
```

출력 예시:
```
현재 도메인 목록:
  [11] yujin       — 관리 도메인
  [12] avnet       — AVNET
  [13] satori      — 한국 사토리
  [14] adsemicon   — AD 반도체
  [15] cdc         — 테스트
```

AskUserQuestion 도구로 질문:
```
삭제할 도메인 ID를 입력해주세요. (위 목록의 숫자 ID)
```

입력값이 숫자가 아니면 재질문한다.

입력된 ID로 조회:
```python
SELECT id, name, description, system_flag FROM domains WHERE id = {input} AND deleted_at IS NULL
```

도메인이 존재하지 않으면 오류 출력 후 중단:
```
❌ ID={input} 에 해당하는 도메인이 없습니다.
```

**보호 도메인 체크** — 위 조회 결과에서 아래에 해당하면 즉시 중단:
- `id IN (11, 12)` (보호 도메인 — 삭제 불가)
- `system_flag = true` (시스템 도메인 — 삭제 불가)

```python
if domain['id'] in (11, 12) or domain['system_flag'] == True:
    # 즉시 중단
```

중단 메시지:
```
⛔ '{name}' (id={id}) 도메인은 삭제할 수 없습니다.
   (보호 도메인 또는 시스템 도메인)
```

---

### Step 1: 삭제 범위 분석 및 선택

대상 도메인(`target_domain_id`)의 데이터를 카테고리별로 COUNT 조회한다:

```python
# 설정 데이터 (create_domain 스킬이 복제한 것들)
SELECT 'roles'               AS tbl, count(*) FROM roles               WHERE domain_id = {target_domain_id}
SELECT 'menus'               AS tbl, count(*) FROM menus               WHERE domain_id = {target_domain_id}
SELECT 'menu_columns'        AS tbl, count(*) FROM menu_columns        WHERE domain_id = {target_domain_id}
SELECT 'menu_buttons'        AS tbl, count(*) FROM menu_buttons        WHERE domain_id = {target_domain_id}
SELECT 'menu_details'        AS tbl, count(*) FROM menu_details        WHERE domain_id = {target_domain_id}
SELECT 'menu_detail_buttons' AS tbl, count(*) FROM menu_detail_buttons WHERE domain_id = {target_domain_id}
SELECT 'menu_detail_columns' AS tbl, count(*) FROM menu_detail_columns WHERE domain_id = {target_domain_id}
SELECT 'menu_params'         AS tbl, count(*) FROM menu_params         WHERE domain_id = {target_domain_id}
SELECT 'terminologies'       AS tbl, count(*) FROM terminologies       WHERE domain_id = {target_domain_id}
SELECT 'entities'            AS tbl, count(*) FROM entities            WHERE domain_id = {target_domain_id}
SELECT 'entity_columns'      AS tbl, count(*) FROM entity_columns      WHERE domain_id = {target_domain_id}
SELECT 'common_codes'        AS tbl, count(*) FROM common_codes        WHERE domain_id = {target_domain_id}
SELECT 'common_code_details' AS tbl, count(*) FROM common_code_details WHERE domain_id = {target_domain_id}
SELECT 'permissions'         AS tbl, count(*) FROM permissions         WHERE domain_id = {target_domain_id}
SELECT 'settings'            AS tbl, count(*) FROM settings            WHERE domain_id = {target_domain_id}
SELECT 'users_roles'         AS tbl, count(*) FROM users_roles         WHERE domain_id = {target_domain_id}
SELECT 'domain_users'        AS tbl, count(*) FROM domain_users        WHERE domain_id = {target_domain_id}
SELECT 'diy_services'        AS tbl, count(*) FROM diy_services        WHERE domain_id = {target_domain_id}
SELECT 'diy_templates'       AS tbl, count(*) FROM diy_templates       WHERE domain_id = {target_domain_id}
SELECT 'printouts'           AS tbl, count(*) FROM printouts           WHERE domain_id = {target_domain_id}
SELECT 'messages'            AS tbl, count(*) FROM messages            WHERE domain_id = {target_domain_id}

# 업무 기준 데이터
SELECT 'warehouses'          AS tbl, count(*) FROM warehouses          WHERE domain_id = {target_domain_id}
SELECT 'zones'               AS tbl, count(*) FROM zones               WHERE domain_id = {target_domain_id}
SELECT 'locations'           AS tbl, count(*) FROM locations           WHERE domain_id = {target_domain_id}
SELECT 'sku'                 AS tbl, count(*) FROM sku                 WHERE domain_id = {target_domain_id}
SELECT 'customers'           AS tbl, count(*) FROM customers           WHERE domain_id = {target_domain_id}
SELECT 'vendors'             AS tbl, count(*) FROM vendors             WHERE domain_id = {target_domain_id}

# 업무 트랜잭션 데이터
SELECT 'inventories'         AS tbl, count(*) FROM inventories         WHERE domain_id = {target_domain_id}
SELECT 'inventory_hists'     AS tbl, count(*) FROM inventory_hists     WHERE domain_id = {target_domain_id}
SELECT 'receiving_orders'    AS tbl, count(*) FROM receiving_orders    WHERE domain_id = {target_domain_id}
SELECT 'receiving_items'     AS tbl, count(*) FROM receiving_items     WHERE domain_id = {target_domain_id}
SELECT 'release_orders'      AS tbl, count(*) FROM release_orders      WHERE domain_id = {target_domain_id}
SELECT 'release_order_items' AS tbl, count(*) FROM release_order_items WHERE domain_id = {target_domain_id}

# 로그 데이터
SELECT 'login_histories'     AS tbl, count(*) FROM login_histories     WHERE domain_id = {target_domain_id}
SELECT 'error_logs'          AS tbl, count(*) FROM error_logs          WHERE domain_id = {target_domain_id}
```

존재하지 않는 테이블은 조회를 생략한다 (try/except).

결과를 카테고리별로 출력:

```
📊 삭제 대상 데이터 현황 — {domain_name} (id={target_domain_id})

[ 설정 데이터 — create_domain으로 복제된 초기 설정 ]
  roles               :    4건
  menus               :  230건
  menu_columns        : 3652건
  menu_buttons        :  494건
  terminologies       : 5145건
  entities            :  107건
  entity_columns      : 2442건
  common_codes        :  136건
  common_code_details :  751건
  permissions         :  873건
  settings            :   46건

[ 업무 기준 데이터 — 창고/구역/상품 등 ]
  warehouses          :    1건
  zones               :    5건
  locations           :   82건
  sku                 :  123건
  ...

[ 업무 트랜잭션 데이터 — 실제 입출고/재고 ]
  inventories         : 1947건
  receiving_orders    :  xxx건
  release_orders      :  388건
  ...

[ 로그 데이터 ]
  login_histories     : 29770건
  error_logs          :  2404건
  messages            :   918건
```

AskUserQuestion으로 삭제 범위 선택:

```
삭제 범위를 선택해주세요.

  1. 설정 데이터만 삭제
     (메뉴/권한/용어/엔티티/공통코드/설정/roles)
     → 도메인 레코드와 업무 데이터는 유지됩니다.

  2. 전체 삭제
     (설정 + 업무 기준 + 업무 트랜잭션 + 로그 + 도메인 레코드 전체)
     → 복구 불가. 도메인이 완전히 제거됩니다.

번호를 입력해주세요 (1 또는 2):
```

---

### Step 2: 이중 확인

선택된 범위에 따라 경고 메시지 출력 후 AskUserQuestion으로 최종 확인:

```
⚠️  경고: 이 작업은 되돌릴 수 없습니다.

삭제 도메인 : {domain_name} (id={target_domain_id})
삭제 범위   : {선택된 범위}
총 삭제 건수: 약 {total}건

확인을 위해 도메인 ID '{target_domain_id}' 를 정확히 입력해주세요:
```

입력값이 `target_domain_id` 와 정확히 일치하지 않으면 **즉시 중단**:
```
❌ 도메인 ID가 일치하지 않습니다. 삭제를 취소합니다.
```

---

### Step 3: 데이터 삭제 실행

선택한 범위에 따라 아래 순서로 DELETE를 실행한다.
각 테이블 삭제 전 해당 테이블 존재 여부를 확인한다 (try/except로 처리).

#### 공통 — 설정 데이터 삭제 (범위 1, 2 모두 실행)

FK 의존성을 고려한 삭제 순서:

```python
# 1. 권한 및 사용자-role 연결 먼저 (roles 참조)
DELETE FROM permissions WHERE domain_id = {target_domain_id}
DELETE FROM users_roles WHERE domain_id = {target_domain_id}

# 2. 메뉴 관련 (menus 참조)
DELETE FROM menu_columns WHERE domain_id = {target_domain_id}
DELETE FROM menu_buttons WHERE domain_id = {target_domain_id}
DELETE FROM menu_params WHERE domain_id = {target_domain_id}
DELETE FROM menu_detail_buttons WHERE domain_id = {target_domain_id}
DELETE FROM menu_detail_columns WHERE domain_id = {target_domain_id}
DELETE FROM menu_details WHERE domain_id = {target_domain_id}
DELETE FROM menus WHERE domain_id = {target_domain_id}

# 3. 엔티티 관련 (entities 참조)
DELETE FROM entity_columns WHERE domain_id = {target_domain_id}
DELETE FROM entities WHERE domain_id = {target_domain_id}

# 4. 공통코드 관련 (common_codes 참조)
DELETE FROM common_code_details WHERE domain_id = {target_domain_id}
DELETE FROM common_codes WHERE domain_id = {target_domain_id}

# 5. DIY 및 출력 설정
DELETE FROM diy_templates WHERE domain_id = {target_domain_id}
DELETE FROM diy_services  WHERE domain_id = {target_domain_id}
DELETE FROM printouts     WHERE domain_id = {target_domain_id}
DELETE FROM messages      WHERE domain_id = {target_domain_id}

# 6. 독립 테이블
DELETE FROM terminologies WHERE domain_id = {target_domain_id}
DELETE FROM settings WHERE domain_id = {target_domain_id}
DELETE FROM roles WHERE domain_id = {target_domain_id}
```

#### 범위 2 추가 — 업무 데이터 및 도메인 삭제

```python
# 업무 트랜잭션 (디테일 먼저)
DELETE FROM release_order_status WHERE domain_id = {target_domain_id}
DELETE FROM release_order_items WHERE domain_id = {target_domain_id}
DELETE FROM release_orders WHERE domain_id = {target_domain_id}
DELETE FROM receiving_items WHERE domain_id = {target_domain_id}
DELETE FROM receiving_order_status WHERE domain_id = {target_domain_id}
DELETE FROM receiving_orders WHERE domain_id = {target_domain_id}
DELETE FROM inventory_hists WHERE domain_id = {target_domain_id}
DELETE FROM inventories WHERE domain_id = {target_domain_id}

# 업무 기준 데이터
DELETE FROM sku WHERE domain_id = {target_domain_id}
DELETE FROM locations WHERE domain_id = {target_domain_id}
DELETE FROM zones WHERE domain_id = {target_domain_id}
DELETE FROM warehouses WHERE domain_id = {target_domain_id}
DELETE FROM customers WHERE domain_id = {target_domain_id}
DELETE FROM vendors WHERE domain_id = {target_domain_id}
DELETE FROM ranged_seqs WHERE domain_id = {target_domain_id}

# 로그 데이터
DELETE FROM login_histories WHERE domain_id = {target_domain_id}
DELETE FROM error_logs WHERE domain_id = {target_domain_id}

# 사용자 연결 해제
DELETE FROM domain_users WHERE domain_id = {target_domain_id}

# 해당 도메인에만 속한 users 삭제
# (다른 도메인에도 연결된 사용자는 유지)
DELETE FROM users
WHERE domain_id = {target_domain_id}
  AND login NOT IN (
    SELECT user_id FROM domain_users WHERE domain_id != {target_domain_id}
  )

# 나머지 domain_id 컬럼 보유 테이블 일괄 정리
# (위에서 명시적으로 처리하지 않은 테이블들)
# information_schema.columns 에서 domain_id 컬럼 보유 테이블을 동적으로 조회하여
# 각각 DELETE FROM {table} WHERE domain_id = {target_domain_id} 실행
# 단, 아래 테이블은 제외 (이미 처리했거나 공유 데이터):
#   domains, users, domain_users

# 최종: 도메인 소프트 삭제 (deleted_at 기록)
UPDATE domains SET deleted_at = now() WHERE id = {target_domain_id}
```

각 DELETE 실행 후 `rowcount` 를 누적하여 진행 상황을 출력한다:
```
  ✓ permissions       873건 삭제
  ✓ menu_columns     3652건 삭제
  ...
```

---

### Step 4: 결과 보고

```
✅ 도메인 삭제 완료!

  도메인 : {domain_name} (id={target_domain_id})
  범위   : {선택된 범위}

📊 삭제 결과
  설정 데이터  :  {n}건
  업무 데이터  :  {n}건  (범위 2인 경우)
  로그 데이터  :  {n}건  (범위 2인 경우)
  합계         :  {total}건
```

---

## 주의사항

- `id IN (11, 12)` 또는 `system_flag=true` 도메인은 삭제 불가 — 보호 도메인
- 도메인 이름 재입력 확인 절차를 반드시 거친다 — 오타로 인한 실수 방지
- 각 DELETE 는 `domain_id = {target_domain_id}` 조건을 반드시 포함
- 존재하지 않는 테이블은 try/except 로 처리하고 SKIP (경고 없이)
- users 삭제 시 다른 도메인에 연결된 사용자는 유지
- 범위 1(설정 데이터만) 선택 시 도메인 레코드(`domains` 테이블)는 삭제하지 않는다
- DB 접속 정보: `frontend/packages/operato-wes/config/config.development.js` → `ormconfig` 섹션
