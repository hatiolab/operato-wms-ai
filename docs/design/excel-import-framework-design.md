# 엑셀 임포트 프레임워크 설계서

> 작성일: 2026-07-17  
> 관련 모듈: `base`  
> 참조 구현: `inventory-multi-create-popup.js`

---

## 1. 개요

현재 엑셀 임포트 화면(예: 재고 멀티 생성)은 컬럼 구성·검증 URL·처리 URL이 하드코딩되어 있어,
새로운 임포트 기능을 추가할 때마다 유사한 코드를 반복 작성해야 한다.

본 설계는 두 가지 범용 자산을 정의한다.

| 자산 | 역할 |
|------|------|
| **엑셀 템플릿 설정 화면** | 임포트 컬럼·공통 파라미터·가이드·URL을 설정하고 `.xlsx` 템플릿을 생성 |
| **동적 임포트 컴포넌트** | 설정 ID 하나를 받아 UI·검증·처리를 스스로 구성하는 재사용 팝업 |

---

## 2. 시스템 구성

```
┌─────────────────────────────────────────────────────────┐
│                  엑셀 템플릿 설정 화면                    │
│  (excel-template-list / excel-template-detail)           │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │ 기본 정보     │   │ 컬럼 설정     │   │ 작성가이드   │  │
│  │ name         │   │ col_role     │   │ 사용목적     │  │
│  │ import_url   │   │ key / label  │   │ 사용화면     │  │
│  │ validate_url │   │ type / req   │   │ 주의사항     │  │
│  └──────────────┘   └──────────────┘   └─────────────┘  │
│                              ↓                           │
│         [템플릿 다운로드]              [템플릿 업로드]       │
│  attachment_id 있음 → 첨부파일 다운로드  → ox-storage-upload-popup │
│  attachment_id 없음 → 동적 생성(xlsx)    → attachment_id 저장      │
└─────────────────────────────────────────────────────────┘
                              │  설정 ID 전달
                              ▼
┌─────────────────────────────────────────────────────────┐
│               동적 임포트 컴포넌트                        │
│         <dynamic-excel-import-popup templateId="…">      │
│                                                          │
│  Phase 1 ─ Upload   Phase 2 ─ Grid    Phase 3 ─ Done    │
│  파일 선택           공통 파라미터 선택  처리 결과 요약     │
│  ↓ 파싱              동적 컬럼 구성                        │
│  ↓ validate_url      검증 결과 표시                       │
│  ↓ (optional)        페이지당 100건                       │
│                      [임포트] 버튼                        │
│                      → import_url 1건씩 호출              │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 모델

### 3.1 `excel_templates` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `domain_id` | BIGINT | 멀티테넌시 |
| `name` | VARCHAR(100) | 템플릿 식별 이름 (예: `inventory.multi.create`) — `(domain_id, name)` 유니크 제약 |
| `description` | VARCHAR(500) | 화면에 표시할 설명 |
| `import_url` | VARCHAR(300) | 임포트 처리 REST URL (필수) |
| `validate_url` | VARCHAR(300) | 행 단위 검증 REST URL (선택) |
| `guide_purpose` | TEXT | 작성가이드 > 사용 목적 |
| `guide_screen_path` | VARCHAR(300) | 작성가이드 > 사용 화면 경로 |
| `guide_warnings` | TEXT | 작성가이드 > 주의사항 (줄바꿈 구분) |
| `template_attachment_id` | UUID | 확정 템플릿 파일의 첨부 ID (선택) — ID만으로 다운로드 가능, 파일명 변경 무관 |
| `creator` | VARCHAR(100) | |
| `updater` | VARCHAR(100) | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### 3.2 `excel_template_columns` 테이블

엑셀 데이터 컬럼(`col_role = 'column'`)과 공통 파라미터(`col_role = 'common_param'`)를 하나의 테이블로 관리한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `domain_id` | BIGINT | |
| `template_id` | UUID FK | `excel_templates.id` |
| `col_role` | VARCHAR(20) | `column` (엑셀 데이터 컬럼) \| `common_param` (공통 파라미터 — 모든 행에 공통 적용) |
| `col_order` | INTEGER | 순서 (0-based, `col_role` 내에서 독립 정렬) |
| `col_key` | VARCHAR(100) | 시스템 키 (예: `sku_cd`, `wh_cd`) |
| `col_label` | VARCHAR(100) | 한글 표시명 (예: `상품코드`, `창고`) |
| `col_type` | VARCHAR(30) | `text` \| `number` \| `date` \| `select` \| `key_value_select` \| `api_select` \| `code_select` |
| `required` | BOOLEAN | 필수 여부 |
| `default_value` | VARCHAR(200) | 초기값 (선택) — `common_param` 주로 사용 |
| `col_width` | INTEGER | 엑셀 컬럼 너비 (기본 18) — `column` 전용 |
| `select_source` | VARCHAR(500) | `select`: 쉼표 구분 단순 값 (예: `발견,누락,조정`) \| `key_value_select`: `키:설명` 쌍을 쉼표 구분 (예: `B2B_OUT:B2B 출고,B2C_OUT:B2C 출고`) \| `api_select`: REST URL (예: `warehouses`) \| `code_select`: 공통 코드 그룹명 (예: `INVENTORY_TRANSACTION`) |
| `select_value_key` | VARCHAR(100) | `api_select` 전용: 응답에서 value로 사용할 필드명 (예: `wh_cd`) |
| `select_label_key` | VARCHAR(200) | `api_select` 전용: 응답에서 label로 사용할 필드명 — 단일 (예: `wh_nm`) 또는 `·` 구분 복수 (예: `wh_cd·wh_nm`) 지원. 복수 시 각 필드값을 공백으로 이어 붙여 표시 (예: `WH01 중앙창고`) |
| `col_desc` | VARCHAR(500) | 작성가이드 컬럼 설명 |
| `grid_hidden` | BOOLEAN | `column` 전용 — 임포트 그리드 숨김 여부 (기본 false), UI 표시만 제어 |
| `import_skip` | BOOLEAN | `column` 전용 — 임포트 API body에서 제외 여부 (기본 false) |

### 3.3 `col_role`별 컬럼 적용 범위

| 컬럼 | `column` | `common_param` | 비고 |
|------|:---:|:---:|------|
| `col_order` | ✅ | ✅ | 역할 내 독립 정렬 |
| `col_key` | ✅ | ✅ | |
| `col_label` | ✅ | ✅ | |
| `col_type` | ✅ | ✅ | |
| `required` | ✅ | ✅ | |
| `default_value` | — | ✅ | 공통 파라미터 초기 선택값 |
| `col_width` | ✅ | — | 엑셀 컬럼 너비 |
| `select_source` | ✅ | ✅ | `select`/`key_value_select`/`api_select`/`code_select` 전용 |
| `select_value_key` | ✅ | ✅ | `api_select` 전용 |
| `select_label_key` | ✅ | ✅ | `api_select` 전용 |
| `col_desc` | ✅ | — | 작성가이드용 |
| `grid_hidden` | ✅ | — | |
| `import_skip` | ✅ | — | |

### 3.4 `grid_hidden` / `import_skip` 조합 동작 (`col_role = 'column'` 전용)

| `grid_hidden` | `import_skip` | 그리드 표시 | 임포트 body 포함 | 사용 예시 |
|:---:|:---:|:---:|:---:|------|
| false | false | ✅ 표시 | ✅ 전달 | 일반 입력 컬럼 (상품코드, 재고수량) |
| true | false | ❌ 숨김 | ✅ 전달 | 내부 시스템 키 (사용자에게 숨기되 처리에 필요) |
| false | true | ✅ 표시 | ❌ 제외 | 사용자 참고용 컬럼 (화면에 보이지만 서버 불필요) |
| true | true | ❌ 숨김 | ❌ 제외 | 완전 무시 컬럼 (엑셀에는 존재, 시스템과 무관) |

### 3.5 컬럼 타입별 동작

| `col_type` | 엑셀 셀 처리 | 그리드 표시 | 서버 전달값 | 검증 |
|------------|-------------|------------|------------|------|
| `text` | 문자열 | 텍스트 | 입력값 그대로 | 필수면 비어있으면 오류 |
| `number` | `parseFloat` | 숫자 우정렬 | 입력값 그대로 | 숫자 변환 불가 시 오류 |
| `date` | YYYY-MM-DD 파싱 | 날짜 | 입력값 그대로 | 날짜 형식 오류 시 경고 |
| `select` | `select_source` 쉼표 파싱으로 드롭다운 — 값 그대로 표시 | 텍스트 | 선택값 그대로 | 목록 외 값 입력 시 경고 |
| `key_value_select` | `select_source`의 `키:설명` 쌍 파싱으로 드롭다운 — 설명 표시 | description | `name` (키값) | 목록 외 값 입력 시 경고 |
| `api_select` | `select_source` API 호출 → `select_label_key` 목록으로 드롭다운. 엑셀/그리드에 label 표시, 서버에는 `select_value_key` 값 전달 (label→value 역매핑 사용) | label 표시 | `select_value_key` 값 | 목록 외 값 입력 시 경고 |
| `code_select` | `select_source` 공통 코드 그룹명으로 코드 목록 조회, `description` 표시 | description | `name` (코드값) | 목록 외 값 입력 시 경고 |

**`key_value_select` 상세:**

- `select_source` 형식: `키:설명` 쌍을 쉼표로 구분 (예: `B2B_OUT:B2B 출고,B2C_OUT:B2C 출고`)
- `code_select`와 동일한 방식으로 처리 — description(설명) 표시, name(키값) 전달
- 공통 코드 조회 없이 `select_source`에서 직접 파싱
  ```
  표시: "B2B 출고"  →  서버 전달: "B2B_OUT"
  표시: "B2C 출고"  →  서버 전달: "B2C_OUT"
  ```

**`code_select` 상세:**

- `select_source`에 공통 코드 그룹명 입력 (예: `INVENTORY_TRANSACTION`)
- 옵션 조회: `GET /rest/common_codes?name={select_source}`
- value/label 키는 고정 (`name` / `description`) — `select_value_key`, `select_label_key` 입력 불필요
- 사용자에게 `description`(한글 설명) 표시, 서버에는 `name`(코드값) 전달
  ```
  표시: "재고 조정"  →  서버 전달: "ADJUSTMENT"
  표시: "입고"      →  서버 전달: "INBOUND"
  ```

---

## 4. API 설계

### 4.1 엑셀 템플릿 CRUD

```
GET    /rest/excel_templates                   목록 조회
GET    /rest/excel_templates/{id}              단건 조회
POST   /rest/excel_templates                   생성
PUT    /rest/excel_templates/{id}              수정
DELETE /rest/excel_templates/{id}              삭제

GET    /rest/excel_template_columns?query=...              컬럼 목록 조회 (template_id + col_role 필터)
POST   /rest/excel_templates/{id}/columns/update_multiple  컬럼 일괄 저장 (column + common_param 모두)
```

### 4.2 엑셀 파일 생성 및 업로드

#### 파일 생성 (다운로드)

```
GET /rest/excel_templates/{id}/xlsx
```

- 서버에서 openpyxl로 `.xlsx` 동적 생성 후 다운로드 응답
- 헤더: `Content-Disposition: attachment; filename="<name>-template.xlsx"`
- 생성 규칙: [6절](#6-엑셀-생성-규칙) 참조

#### 확정 템플릿 업로드

업로드 UI는 `domain-storage-browser.js`와 동일하게 **`ox-storage-upload-popup`** 컴포넌트를 사용한다.  
단, 파일은 스토리지 경로가 아닌 **첨부파일(attachments) 시스템**에 저장하여 ID만으로 영구 참조한다.

```javascript
// 참조: domain-storage-browser.js
import '@operato-app/metapage/dist-client/components/popup/ox-storage-upload-popup.js'

<ox-storage-upload-popup
  ?open="${this._uploadOpen}"
  @upload-complete="${this._onTemplateUploadComplete}"
  @close="${() => { this._uploadOpen = false }}">
</ox-storage-upload-popup>
```

**처리 흐름:**

1. [템플릿 업로드] 버튼 클릭 → `ox-storage-upload-popup` 열기
2. 사용자가 파일 선택·업로드
3. `upload-complete` 이벤트 수신 → `e.detail.attachment_id` 획득
4. 기존 `template_attachment_id`가 있으면 이전 첨부파일 삭제  
   (`DELETE /rest/attachments/{template_attachment_id}`)
5. `excel_templates.template_attachment_id` 를 새 ID로 업데이트  
   (`PUT /rest/excel_templates/{id}  { template_attachment_id: newId }`)

**[템플릿 다운로드] 버튼 우선순위:**

| 상태 | 동작 |
|------|------|
| `template_attachment_id` 있음 | 첨부파일 다운로드 (`/rest/attachments/{template_attachment_id}/download`) |
| `template_attachment_id` 없음 | 설정 기반 동적 생성 (`GET /rest/excel_templates/{id}/xlsx`) |

> 동적 임포트 컴포넌트의 **[템플릿 다운로드]** 버튼도 동일한 우선순위를 따른다.

### 4.3 행 단위 검증 (validate_url)

동적 임포트 컴포넌트가 엑셀 파싱 직후 **전체 행을 한 번에** 전달한다.

**요청 (POST)**
```json
{
  "rows": [
    { "sku_cd": "SKU-001", "loc_cd": "A-01-01", "inv_qty": 10 },
    { "sku_cd": "SKU-999", "loc_cd": "X-99-99", "inv_qty": -1 }
  ],
  "wh_cd": "WH001",
  "com_cd": "GRAIN_ON"
}
```
> 공통 파라미터(`_commonValues`)를 `rows`와 함께 전달한다. 서버 측 검증 로직에서 창고·화주사 등 컨텍스트가 필요할 수 있으므로 포함한다.

**응답**
```json
{
  "results": [
    { "index": 0, "valid": true,  "message": null },
    { "index": 1, "valid": false, "message": "SKU-999는 존재하지 않습니다." }
  ]
}
```

- `index`: `rows` 배열의 0-based 인덱스
- `valid`: false이면 해당 행을 `INVALID` 상태로 표시
- 응답이 없거나 오류이면 검증 단계를 건너뜀 (경고 토스트 표시)

### 4.4 행 단위 임포트 (import_url)

동적 임포트 컴포넌트가 행 **한 건씩** 호출한다.

**요청 (POST)**
```json
{ "sku_cd": "SKU-001", "loc_cd": "A-01-01", "inv_qty": 10 }
```

**응답 — 성공**
```json
{
  "success": true,
  "data": { "barcode": "BC-20260717-001", "sku_nm": "테스트상품" }
}
```

**응답 — 실패**
```json
{
  "success": false,
  "message": "재고 생성 실패: 로케이션이 존재하지 않습니다."
}
```

- `data` 객체의 키가 그리드 컬럼 키와 일치하면 해당 셀을 업데이트
- `success: false`이면 `message`를 결과 컬럼에 표시

---

## 5. 화면 설계

### 5.1 엑셀 템플릿 설정 화면

#### 5.1.1 목록 화면 (`excel-template-list`)

```
┌──────────────────────────────────────────────────────────────────┐
│ 엑셀 임포트 템플릿 관리                              [+ 새 템플릿] │
├──────┬──────────────────────┬────────────────┬───────────────────┤
│ 이름 │ 설명                  │ import URL     │ 등록일            │
├──────┼──────────────────────┼────────────────┼───────────────────┤
│ ...  │ ...                  │ ...            │ ...               │
└──────┴──────────────────────┴────────────────┴───────────────────┘
```

- 행 클릭 → 상세/편집 화면으로 이동

#### 5.1.2 상세/편집 화면 (`excel-template-detail`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 기본 정보                                                               │
│  이름 [________________] 설명 [________________________________]         │
│  임포트 URL (필수) [inventory_trx/create_inventory          ]           │
│  검증 URL (선택)   [inventory_trx/validate_inventory        ]           │
├────────────────────────────────────────────────────────────────────────┤
│ 컬럼 설정                                               [+ 컬럼 추가]   │
│  [전체] [엑셀 컬럼] [공통 파라미터]                                      │
│  ┌──┬──────────┬──────────┬─────────────┬──────────┬────┬──────┬──────┐ │
│  │# │역할      │시스템 키  │한글 표시명   │타입      │필수│너비  │숨김  │ │
│  ├──┼──────────┼──────────┼─────────────┼──────────┼────┼──────┼──────┤ │
│  │1 │엑셀 컬럼 │sku_cd   │상품코드      │text      │ ✓ │ 18  │      │ │
│  │2 │엑셀 컬럼 │inv_qty  │재고수량      │number    │ ✓ │ 14  │      │ │
│  │3 │엑셀 컬럼 │remarks  │비고          │text      │   │ 20  │      │ │
│  │4 │공통 파라미│wh_cd    │창고          │api_select │ ✓ │ —   │ —    │ │
│  │5 │공통 파라미│com_cd   │화주사        │api_select │ ✓ │ —   │ —    │ │
│  └──┴──────────┴──────────┴─────────────┴───────────┴────┴──────┴──────┘ │
│  ↑ ↓ (역할 내 순서 변경)   [삭제]                                          │
│  col_type이 select/key_value_select/api_select/code_select인 행은 select_source 입력 필요  │
├────────────────────────────────────────────────────────────────────────┤
│ 작성 가이드                                                             │
│  사용 목적    [____________________________________________]             │
│  사용 화면    [____________________________________________]             │
│  주의사항     [텍스트 영역 — 줄바꿈으로 항목 구분          ]             │
├────────────────────────────────────────────────────────────────────────┤
│ 확정 템플릿 파일                                                        │
│  상태: ✅ 업로드됨 (2026-07-17 14:32)   파일명: 재고멀티생성-v2.xlsx     │
│  attachment ID: afa3bc12-…-9e01  [📋 복사]                             │
│  또는                                                                   │
│  상태: ⚪ 미업로드 (설정 기반 동적 생성)                                 │
├────────────────────────────────────────────────────────────────────────┤
│  [저장]  [취소]       [템플릿 다운로드]  [템플릿 업로드]                │
└────────────────────────────────────────────────────────────────────────┘
```

- **[전체] / [엑셀 컬럼] / [공통 파라미터]** 필터 칩으로 `col_role` 필터링
- **순서 변경**: `col_role` 내에서 독립적으로 정렬 (`col_order` 업데이트)
- **`col_role = 'column'` 전용**: 너비(`col_width`), 숨김(`grid_hidden`), 전달제외(`import_skip`) 입력 활성
- **`col_role = 'common_param'` 전용**: 초기값(`default_value`) 입력 활성, 너비·숨김·전달제외 비활성(회색)
- **[템플릿 다운로드]**: 저장 후 활성화
  - `template_attachment_id` 있으면 → `/rest/attachments/{template_attachment_id}/download`
  - `template_attachment_id` 없으면 → `GET /rest/excel_templates/{id}/xlsx` (동적 생성)
- **[템플릿 업로드]**: 저장 후 활성화 → `ox-storage-upload-popup` 열기
- **[📋 복사]**: `template_attachment_id` 값을 클립보드에 복사, 업로드된 경우에만 표시

---

### 5.2 동적 임포트 컴포넌트 (`dynamic-excel-import-popup`)

#### 속성 (Properties)

| 속성 | 타입 | 설명 |
|------|------|------|
| `templateId` | String | `excel_templates.id` (필수) |
| `title` | String | 팝업 타이틀 (선택, 기본: 템플릿 name) |

> 컬럼 설정과 공통 파라미터 모두 `excel_template_columns` 에서 `col_role`로 구분하여 자동 로드된다.

#### 사용 예시

```javascript
// 팝업 열기 — templateId 하나만 전달
UiUtil.openPopupBy('dynamic-excel-import-popup', {
  templateId: 'abc-123-def'
})
```

#### Phase 구성

```
Phase 1: upload  →  Phase 2: grid  →  (처리 완료)
```

---

#### Phase 1 — Upload

```
┌──────────────────────────────────────────────────────────┐
│ 📊 [템플릿명]  임포트                   [템플릿 다운로드] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│          ┌─────────────────────────────────┐             │
│          │                                 │             │
│          │   📂  여기에 파일을 끌어다 놓으세요  │             │
│          │   또는 클릭하여 파일 선택          │             │
│          │   (.xlsx, .xls 지원)            │             │
│          │                                 │             │
│          └─────────────────────────────────┘             │
│                                                          │
│   ℹ 반드시 제공된 템플릿 파일을 사용하세요.                │
└──────────────────────────────────────────────────────────┘
```

**업로드 후 처리 순서:**

1. `excelToObj()`로 파싱
2. `templateId`로 템플릿 설정 조회 (캐싱)
3. `col_role = 'column'` 컬럼 설정 기반으로 각 행 매핑 (`_mapRow()`)
4. `validate_url`이 있으면 → 전체 행 한 번에 POST 검증
   - 검증 결과를 각 행의 `_validMsg` / `_valid` 에 저장
5. Phase 2(grid)로 전환

---

#### Phase 2 — Grid

```
┌──────────────────────────────────────────────────────────────────┐
│ 📊 재고 멀티 생성       파일: 재고생성_20260717.xlsx               │
│ 창고 [WH001 ▼ *]  화주사 [GRAIN_ON ▼ *]  ← common_param (동적)   │
│ [전체] [대기] [완료] [오류] [검증오류]         상품코드 [    ]     │
├────┬────────┬────────┬──────┬────┬──────┬────────────────────────┤
│ #  │상품코드 │로케이션 │재고수량│Lot│소비기한│ 처리 결과              │
├────┼────────┼────────┼──────┼───┼──────┼────────────────────────┤
│  1 │SKU-001 │A-01-01 │  10  │   │      │ ⏳ 대기                 │
│  2 │SKU-999 │X-99-99 │  -1  │   │      │ ⚠ SKU-999 없음          │
│  3 │SKU-002 │B-02-01 │   5  │   │      │ ⏳ 대기                 │
└────┴────────┴────────┴──────┴───┴──────┴────────────────────────┘
│ 전체 150건  ✅ 완료 0  ❌ 오류 0  ⚠ 검증오류 1  ⏳ 대기 149       │
│                                  [◀ 1 2 3 ... ▶]  페이지당 100건  │
├──────────────────────────────────────────────────────────────────┤
│ [파일 재선택]  ⚠ 공통 파라미터 미입력 경고 (필수 항목)    [임포트] │
└──────────────────────────────────────────────────────────────────┘
```

**그리드 컬럼 구성 규칙 (`col_role = 'column'`):**

- `col_order` 순서대로 컬럼 생성
- `grid_hidden = true` 컬럼은 그리드에서 숨김 — 데이터는 메모리에 보관, `import_skip`에 따라 body 포함 여부 결정
- `import_skip = true` 컬럼은 그리드 표시 여부와 무관하게 임포트 API body에서 제외
- 마지막에 **처리 결과** 컬럼 고정 추가
- `import_url` 성공 응답의 `data` 키가 컬럼 키와 일치하면 해당 셀 갱신

**공통 파라미터 영역 (`col_role = 'common_param'`):**

- `col_order` 순서대로 그리드 상단에 입력 필드 동적 렌더링
- `col_type`별 UI:
  - `text` → `<input type="text">`
  - `select` → `<select>` (`select_source` 쉼표 파싱 — 값 그대로 표시·전달)
  - `key_value_select` → `<select>` (`select_source`의 `키:설명` 쌍 파싱 → 설명 표시, 키값 전달)
  - `api_select` → `<select>` (`select_source` API 호출 → `select_value_key`/`select_label_key`로 옵션 구성)
  - `code_select` → `<select>` (`GET /rest/common_codes?name={select_source}` 호출 → `description` 표시, `name` 전달)
- 옵션 1개이면 자동 선택
- `required = true` 항목은 미선택 시 붉은 테두리 표시

**행 상태:**

| 상태 | 표시 | 조건 |
|------|------|------|
| `PENDING` | ⏳ 대기 | 초기 상태 |
| `INVALID` | ⚠ [메시지] | validate_url 검증 실패 |
| `PROCESSING` | ⏳ 처리중... (스피너) | 현재 처리 중인 행 |
| `DONE` | ✅ 완료 | import_url 성공 |
| `ERROR` | ❌ [메시지] | import_url 실패 |

**필터 칩 동작:**

- `[전체]`: 모든 행
- `[대기]`: PENDING
- `[완료]`: DONE
- `[오류]`: ERROR
- `[검증오류]`: INVALID (validate_url 결과)

**행 상태별 처리 대상:**

| 처리 모드 | 대상 행 |
|-----------|--------|
| 기본 [임포트] | `_createStatus=null AND _valid=true` (PENDING만) |
| [오류 재처리] | `_createStatus='ERROR'` 행 추가 포함 |
| [검증오류 포함 강제 진행] | `_valid=false` (INVALID) 행도 포함 |

**[임포트] 버튼 클릭 시 검증:**

- `required = true`인 공통 파라미터 중 미입력된 항목이 있으면 토스트 경고 후 중단
- 경고 메시지: `"[창고], [화주사]을(를) 선택해주세요."`

---

## 6. 엑셀 생성 규칙

서버에서 Python(openpyxl)으로 `.xlsx`를 동적 생성한다.

### 6.1 Sheet 1 — 데이터 입력 시트 (`{name}`)

`col_role = 'column'` 행만 엑셀 컬럼으로 생성한다.

| 처리 | 규칙 |
|------|------|
| Row 1 (헤더) | `col_label` 값 (한글), 파란 배경·흰 글씨 |
| Excel 이름 정의 | 각 헤더 셀에 `col_key`를 DefinedName으로 등록 → `excelToObj()`가 `cell.name`으로 읽음 |
| `col_type = date` | 셀 서식: `YYYY-MM-DD` |
| `col_type = select` | `select_source` 쉼표 파싱 값으로 드롭다운 DataValidation 적용 (Row 2~1000) |
| `col_type = key_value_select` | `select_source`의 `키:설명` 쌍 파싱 → 설명 목록으로 드롭다운 DataValidation 적용 (Row 2~1000) |
| `col_type = api_select` | 엑셀 생성 시점에 `select_source` API 호출 → `select_label_key` 값 목록으로 드롭다운 DataValidation 적용 |
| `col_type = code_select` | 엑셀 생성 시점에 `GET /rest/common_codes?name={select_source}` 호출 → `description` 목록으로 드롭다운 DataValidation 적용 |
| `col_width` | 컬럼 너비 적용 |
| 데이터 행 | Row 2~ (비어있음) |

> `key_value_select` / `code_select` / `api_select` 컬럼은 사용자가 **설명(label)**으로 입력하며,  
> 임포트 시 컴포넌트가 description→value 역매핑으로 **실제 값으로 치환**하여 서버에 전달한다.

### 6.2 Sheet 2 — 작성가이드

`guide_purpose`, `guide_screen_path`, `guide_warnings`, `col_role = 'column'` 컬럼 정보로 생성한다.

섹션 구성:
1. 타이틀
2. 템플릿 사용 목적 (`guide_purpose`)
3. 사용 화면 (`guide_screen_path`)
4. 컬럼 설명 (`col_role = 'column'` 기반)
5. 주의사항 (`guide_warnings` 줄바꿈 분리)

---

## 7. 동적 임포트 처리 흐름

```
컴포넌트 마운트
   │
   ├─ GET /rest/excel_templates/{templateId}                     ← 템플릿 설정 로드 (1회)
   │   └─ import_url, validate_url 저장
   │
   ├─ GET /rest/excel_template_columns?template_id={templateId}  ← 컬럼 전체 로드 (1회)
   │   ├─ col_role='column' → _columns 저장 (그리드 컬럼 구성용)
   │   │   └─ select 계열 타입 컬럼 옵션 로드 및 역매핑 맵 구성 (_selectMaps[col_key] = {label→value})
   │   │       ├─ key_value_select : select_source의 '키:설명' 파싱 → {설명: 키} 맵
   │   │       ├─ api_select       : select_source API 호출 → {select_label_key값: select_value_key값} 맵
   │   │       └─ code_select      : GET /rest/common_codes?name={select_source} 호출 → {description: name} 맵
   │   │
   │   └─ col_role='common_param' → _commonParams 저장 (상단 파라미터 렌더링용)
   │       └─ select 계열 타입 옵션 로드 및 역매핑 맵 구성 (_selectMaps[col_key] = {label→value})
   │           ├─ select      : select_source 쉼표 파싱 (역매핑 불필요 — 값 그대로 전달)
   │           ├─ key_value_select : select_source의 '키:설명' 파싱 → {설명: 키} 맵
   │           ├─ api_select  : select_source API 호출 → select_value_key/select_label_key로 옵션 및 맵 구성
   │           └─ code_select : GET /rest/common_codes?name={select_source} 호출 → {description: name} 맵
   │       └─ 옵션 1개이면 자동 선택
   │       └─ required=true 항목은 미선택 시 붉은 테두리 표시
   │
   ▼ Phase 1: Upload
파일 선택 / 드롭
   │
   ├─ excelToObj() 파싱
   │   └─ cell.name(영문 key) 우선, 없으면 cell.value.toLowerCase()
   │
   ├─ _mapRow() : _columns 기반 타입 변환 및 역매핑 적용
   │   ├─ text              → String
   │   ├─ number            → parseFloat
   │   ├─ date              → YYYY-MM-DD
   │   ├─ select            → String (select_source 외 값이면 _validMsg 설정)
   │   ├─ key_value_select  → _selectMaps[col_key]로 label→value 치환 (맵에 없으면 _validMsg 설정)
   │   ├─ api_select        → _selectMaps[col_key]로 label→value 치환 (맵에 없으면 _validMsg 설정)
   │   └─ code_select       → _selectMaps[col_key]로 description→name 치환 (맵에 없으면 _validMsg 설정)
   │
   ├─ [validate_url 있을 때]
   │   POST validate_url({
   │     rows: [...],          ← 역매핑 치환 완료된 행 데이터
   │     ..._commonValues      ← 공통 파라미터 값도 함께 전달 (서버 검증에 필요할 수 있음)
   │   })
   │   └─ results 각 행에 _valid=false, _validMsg 반영 (INVALID 상태)
   │
   └─ Phase 2: Grid 전환

   ▼ Phase 2: Grid
[임포트] 버튼 클릭
   │
   ├─ _commonParams 필수값 미입력 검증 (required=true인 항목 중 _commonValues[col_key] 없으면 중단)
   ├─ 처리 대상:
   │   └─ _createStatus=null AND _valid=true 인 행 (PENDING)
   │       → [오류 재처리] 모드: _createStatus='ERROR' 인 행 추가 포함
   │       → [강제 진행] 모드: _valid=false(INVALID) 행도 포함
   │
   └─ for each target item:
       │
       ├─ [일시정지 확인] → _paused이면 resume 대기
       ├─ item._createStatus = 'PROCESSING'
       │
       ├─ POST import_url({
       │     ...item(import_skip=false인 col_key 필드만, 이미 value로 치환된 값),
       │     ..._commonValues (역매핑 치환 완료된 공통 파라미터 값)
       │   })
       │
       ├─ 성공:
       │   item._createStatus = 'DONE'
       │   item에 data 필드 병합 (col_key 매칭 → 그리드 셀 갱신)
       │
       └─ 실패:
           item._createStatus = 'ERROR'
           item._errorMsg = message
```

---

## 8. 컴포넌트 구조 (프론트엔드)

### 8.1 파일 위치

```
metapage/client/pages/
├── excel-template-list.js          # 템플릿 목록
├── excel-template-detail.js        # 템플릿 상세/편집 (column + common_param 통합 관리)
└── dynamic-excel-import-popup.js   # 동적 임포트 팝업 (범용)
```

### 8.2 `dynamic-excel-import-popup.js` 주요 Properties

```javascript
static get properties() {
  return {
    templateId: String,           // 필수: 템플릿 ID
    title: String,                // 선택: 팝업 제목

    // 내부 상태
    _template: Object,            // 로드된 템플릿 설정
    _columns: Array,              // col_role='column' 목록
    _commonParams: Array,         // col_role='common_param' 목록
    _commonValues: Object,        // 공통 파라미터 입력값 { col_key: value } — value는 이미 역매핑 치환된 값
    _selectMaps: Object,          // select 계열 역매핑 맵 { col_key: { label: value } } — _columns/_commonParams 모두 포함
    phase: String,                // 'upload' | 'grid'
    items: Array,                 // 전체 데이터 (메모리)
    processing: Boolean,
    currentProcessingIdx: Number,
    filterStatus: String,
    currentPage: Number,          // 기본 1
    pageSize: Number,             // 기본 100
    _tick: Number,                // 강제 리렌더
    _paused: Boolean,
  }
}
```

### 8.3 백엔드 파일 위치

```
operato-core/xyz/elidom/dev/
├── entity/
│   ├── ExcelTemplate.java
│   └── ExcelTemplateColumn.java    # col_role 필드로 column/common_param 구분
├── rest/
│   ├── ExcelTemplateController.java
│   └── ExcelTemplateColumnController.java
└── service/
    └── ExcelTemplateService.java   # xlsx 생성 로직 (Python subprocess 또는 Java POI)
```

> **xlsx 생성**: Java에서 Apache POI 사용 또는 Python 스크립트를 subprocess로 호출.  
> Apache POI 의존성이 이미 있으면 POI 우선 사용.

---

## 9. 구현 순서

```
Step 1  ExcelTemplate, ExcelTemplateColumn Entity 작성 (col_role 필드 포함)
Step 2  /entity_meta_by_entity 로 메타데이터 등록
Step 3  ExcelTemplateController, ExcelTemplateColumnController 작성
Step 4  xlsx 생성 API (GET /{id}/xlsx) 구현
Step 4a 템플릿 업로드: 화면에서 ox-storage-upload-popup 사용, upload-complete 이벤트로 template_attachment_id 저장
Step 5  excel-template-list.js / excel-template-detail.js 화면 개발
Step 6  dynamic-excel-import-popup.js 범용 팝업 개발
Step 7  기존 inventory-multi-create-popup.js → dynamic-excel-import-popup 기반으로 교체 (선택)
```

---

## 10. 고려 사항

| 항목 | 결정 |
|------|------|
| 대량 데이터 | 전체 데이터 메모리 보관, UI는 페이지당 100건 렌더 |
| 일시정지/재개 | `_paused` 플래그로 처리 루프 내에서 `await Promise` 대기 |
| 에러 행 재처리 | 필터 `[오류]` 선택 후 [임포트] 재클릭 → ERROR 행만 재시도 |
| validate_url 실패 | 검증 오류 행도 임포트 가능 (사용자가 강제 진행 선택) |
| 템플릿 캐싱 | 컴포넌트 마운트 시 1회 로드, 이후 캐싱 |
| 멀티테넌시 | `domain_id` 조건 백엔드에서 처리, 프론트는 무관 |
| 보안 | `import_url` / `validate_url`은 백엔드 내부 상대 경로만 허용 (절대 URL 차단) |
