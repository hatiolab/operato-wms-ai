# Operato WMS AI — AGENTS.md

## 프로젝트 개요

> 상세 내용: `docs/overview/overview.md`

**Operato WMS** — 자가 물류 및 3PL을 위한 클라우드 기반 WMS. 하티오랩(HatioLab) 개발.

- 저장소: `./` (통합 레포) | `./frontend/` (프론트엔드 operato-wes) | 별도 레포: `otarepo-core` (공유 코어)
- 백엔드: Java 18 / Spring Boot 3.2.4 / Gradle 8.5 / PostgreSQL+Redis / Jasypt
- 프론트엔드: Things Factory / Lerna+Yarn / TypeScript / GraphQL / Node.js(Koa)
- **통합 구조**: 프론트엔드가 `frontend/` 디렉토리에 통합됨
- **배포 방식**: Docker (Nginx + 백엔드 분리, 권장) | 로컬 통합 JAR (선택적)


## 행동 지침

### 필수 규칙
- 커밋 메시지는 **한국어**로 작성 (`feat: 입고 API 추가`)
- DB 쿼리 시 `domain_id` 조건 **필수** (멀티테넌시)
- entities 테이블에 엔티티 정보 등록시 `search_url`, `multi_save_url` 값은 첫글자 `/` 없이 작성
- 코드 변경 후 `./gradlew build -x test`로 컴파일 확인

### 새 Entity 추가 시 필수 절차
1. Entity Java 클래스 작성 (JPA `@Entity`, `@Table`, Javadoc 한국어 주석)
2. `/entity_meta_by_entity {EntityName}` — 메타데이터 + 용어 + 공통코드 일괄 등록 + 번역
3. `docs/design/database-specification.md` 업데이트
4. Controller/Service 작성하지 않음

### 새 용어/코드 추가 시
- 새 용어: `/add_terminology {category} {name} {display}`
- 공통코드: `/code_by_entity_column {EntityName} {fieldName}`
- 새 용어 추가 후 번역 캐시 초기화: `/clear_frontend_cache`

### 하지 말 것
- `git add -A` 또는 `git add .` 사용 금지 — 파일 개별 지정
- `domain_id` 조건 없이 DELETE/UPDATE 쿼리 실행 금지
- pre-commit hook 실패 시 `--no-verify` 사용 금지

### 참조 문서
- 백엔드 개발: `docs/development/backend-dev-guide.md`
- 프론트엔드 개발: `docs/development/frontend-dev-guide.md`
- DB 스키마: `docs/design/database-specification.md`
- API 목록: `docs/implementation/api-list.md`


## 환경 정보

### DB 접속
- 백엔드(Spring): `src/main/resources/application-dev.properties` (git 미추적, 템플릿: `application-dev.properties.template`)
- 프론트엔드(TypeORM): `frontend/packages/operato-wes/config/config.development.js` → `ormconfig` 섹션
- Skill에서 DB 직접 접속 시: 프론트엔드 `config.development.js`의 `ormconfig`에서 host/port/database/username/password 참조
- 접속 도구: Python `psycopg2-binary` (psql CLI 미설치 환경 대응)

### 멀티테넌시
- 모든 업무 테이블에 `domain_id` 컬럼 존재 — 조회/수정/삭제 시 반드시 조건에 포함
- 도메인 목록: `SELECT id, name FROM domains`

### 주요 경로
- 엔티티: `src/main/java/operato/wms/{모듈}/entity/`
- SQL 쿼리: `src/main/resources/query/{모듈}/`
- 백엔드 설정: `src/main/resources/application.properties`
- 프론트 페이지: `frontend/packages/operato-wes/client/pages/{모듈}/`
- 프론트 라우트: `frontend/packages/operato-wes/client/route.js`
- 정적 페이지 등록: `frontend/packages/operato-wes/things-factory.config.js`


## 빌드 및 실행

- 개발 (통합): `./scripts/dev.sh` (백엔드 :9191 + 프론트 :5907)
- 백엔드만: `./gradlew bootRunDev`
- 프론트만: `cd frontend && yarn wms:dev`
- 컴파일 확인: `./gradlew build -x test`
- 테스트: `./gradlew test`
- Docker: `docker compose build && docker compose up -d` (Nginx :80 → 백엔드 :9191)
- 통합 JAR: `./scripts/build.sh` 또는 `./gradlew buildAll`
- 디버그: VSCode Cmd+Shift+D → **operato-wms-ai (debug-dev)** | 원격 attach: 포트 5004
- 백엔드 API: http://localhost:9191/rest

> 상세: `docs/operations/backend-docker.md`, `docs/implementation/development-environment.md`


## 업무 도메인

> 자세한 내용: `docs/requirement/requirements.md`

모듈: `base`(기준정보) | `inbound`(입고) | `outbound`(출고) | `stock`(재고) | VAS(유통가공)


## 코딩 컨벤션

### 백엔드 (operato-wms-ai)
- 패키지: `operato.wms.{모듈}.{레이어}` (예: `operato.wms.inbound.rest`)
- Entity: JPA 엔티티, 각 모듈의 `entity/` 하위
- Controller: REST, `{도메인}Controller.java` 네이밍
- Service: 트랜잭션 서비스, `{도메인}TransactionService.java` 또는 `{도메인}Service.java`
- QueryStore: 복잡한 조회 쿼리, `query/store/` 하위
- Initializer: 모듈 초기화, `web/initializer/` 하위
- 모듈별 상수: `Wms{Module}Constants.java`, `Wms{Module}ConfigConstants.java`

### 프론트엔드 (frontend/)
- 위치: `frontend/packages/`
- 패키지명: `@operato-app/{패키지명}` 스코프 (메인 앱: `@operato-app/operato-wes`)
- 화면 파일: `client/pages/{모듈}/{도메인}-{액션}.js` (예: `inbound/receive-list.js`)
- Things Factory 라우트: `client/route.js`에 페이지 경로 등록
- 서버 라우트: `server/routes.ts`에 Koa 라우터로 등록 (`bootstrap-module-*-route` 이벤트)
- DB 마이그레이션: `server/migrations/`에 TypeORM 마이그레이션 파일 추가
- API 통신: GraphQL 우선, 백엔드 REST API는 `/rest/` 경로로 직접 호출
- 상태관리: Redux (actions/reducers 패턴)
- 빌드 산출물: `frontend/packages/operato-wes/dist-app/` → `src/main/resources/static/` (자동 복사)

### 프론트엔드 필수 규칙 (`docs/development/frontend-dev-guide.md` 요약)
- **한글 JSDoc 주석 필수**: 모든 메서드에 `/** 한글 설명 */` 작성 (static get, render, _renderXxx, _fetchXxx, _onXxx, 유틸리티 등 예외 없음)
- **TermsUtil 사용 필수**: UI 텍스트는 `TermsUtil.tLabel()`, `tButton()`, `tText()` 등 사용 — 문자열 하드코딩 금지
- **ServiceUtil 사용 필수**: API 호출은 `ServiceUtil.restGet/restPost` 사용 — `fetch()` 직접 사용 금지
- **페이지 자체 헤더 금지**: 타이틀은 `get context()` 에서 설정 — `render()` 내 자체 헤더(`<h2>` 등) 금지
- **데이터 바인딩은 snake_case**: 백엔드 응답 속성은 `order.shipment_no` (camelCase 접근 시 undefined)
- **참고 예시**: `fulfillment-picking-pc.js` (100% 준수 파일)


## Codex Skills (`.Codex/commands/`)

프로젝트에 등록된 Codex slash command 목록. 새 skill 추가 시 이 테이블을 업데이트하세요.

| 명령 | 설명 |
|------|------|
| `/build` | 백엔드 Gradle 빌드 (기본/테스트 제외/클린/Docker용) |
| `/commit` | git commit (한국어 메시지, 선택적 스테이징) |
| `/log` | 작업 내용을 `.ai/logs/YYYY-MM-DD.md`에 기록 |
| `/create_module` | 모듈 패키지 구조 생성. 인자: `moduleName` |
| `/entity_meta_by_entity` | Entity → entities + entity_columns + terminologies + common_codes 일괄 등록 + 번역. 인자: `EntityName` |
| `/add_term` | 용어 등록 (모든 도메인, ko/en/ja/zh). 인자: `category name display` |
| `/add_message` | 메시지 등록 (모든 도메인, ko/en/ja/zh). 인자: `name display`. 인자: `name display` |
| `/translate` | 미번역 항목 번역 (ko/en/zh) |
| `/code_by_entity` | Entity 공통코드 일괄 등록. 인자: `EntityName` |
| `/code_by_entity_column` | 필드별 공통코드 등록. 인자: `EntityName fieldName` |
| `/clear_frontend_cache` | 프론트엔드 번역 캐시 삭제 |
| `/update-shipment-order-import` | 출고주문 임포트 엑셀 파일의 원주문 번호 업데이트. 인자: `[파일경로]` (선택) |
| `/create_domain` | 신규 도메인 생성 및 초기 설정 (순차 질문 → menus/roles/permissions 등 자동 복제). 인자: 없음 (대화형) |
| `/delete_domain` | 도메인 삭제 (설정 데이터만 또는 전체 선택, 이중 확인 절차 포함). 인자: 없음 (대화형) |
| `/create_sample_master` | 기준정보 샘플 데이터 생성 (도메인·업종·수량 입력 → 창고/구역/로케이션/화주사/거래처/SKU/VAS 등 자동 생성). 인자: 없음 (대화형) |
| `/create_sample_in` | 입고 주문 샘플 데이터 생성 (도메인·주문수·아이템수·입고예정일·일수 입력 → receivings + receiving_items 자동 생성). 인자: 없음 (대화형) |
| `/create_sample_stock` | 입고 완료 + 재고 샘플 데이터 생성 (도메인·화주사·주문수·아이템수·입고날짜 입력 → receivings(END) + receiving_items(END) + inventories + inventory_hists 자동 생성). 인자: 없음 (대화형) |
| `/create_stock_by_sku` | 특정 품목 지정 재고 생성 (도메인·화주사·SKU 선택·수량 입력 → 지정한 SKU에 대해 receivings(END) + receiving_items(END) + inventories + inventory_hists 생성). 인자: 없음 (대화형) |
