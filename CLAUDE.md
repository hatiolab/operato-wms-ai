# Operato WMS AI — CLAUDE.md

## 프로젝트 개요

> 상세 내용: `docs/overview/overview.md`

**Operato WMS** — 자가 물류 및 3PL을 위한 클라우드 기반 WMS. 하티오랩(HatioLab) 개발.

- 저장소: `./` (통합 레포) | `./frontend/` (프론트엔드 operato-wes) | 별도 레포: `otarepo-core` (공유 코어)
- 백엔드: Java 18 / Spring Boot 3.2.4 / Gradle 8.5 / PostgreSQL+Redis / Jasypt
- 프론트엔드: Things Factory / Lerna+Yarn / TypeScript / GraphQL / Node.js(Koa)
- **통합 구조**: 프론트엔드가 `frontend/` 디렉토리에 통합됨
- **배포 방식**: Docker (Nginx + 백엔드 분리, 권장) | 로컬 통합 JAR (선택적)


## 빌드 및 실행

### 개발 모드 (권장)
```bash
# 통합 실행 (백엔드 + 프론트엔드)
./scripts/dev.sh

# 또는 개별 실행
# 터미널 1: 백엔드 (포트 9191)
./gradlew bootRunDev

# 터미널 2: 프론트엔드 (포트 5907)
cd frontend && yarn wms:dev
```

### Docker 배포 (운영 환경 권장)
```bash
# Nginx + 백엔드 전체 스택 빌드
docker compose build

# 실행 (Nginx:80, 백엔드:9191 내부)
docker compose up -d

# 접속: http://localhost
# 헬스체크: http://localhost/actuator/health
```

### 로컬 통합 JAR 빌드 (선택적)
```bash
# 프론트엔드 + 백엔드 통합 빌드
./scripts/build.sh
# 또는
./gradlew buildAll

# 결과: build/libs/operato-wms-ai.jar (단일 파일)
# 주의: application.properties에서 operato.wms.spa.enabled=true 필요
```

### 기타
- 환경설정: `application-dev.properties` (git 미추적, 템플릿 제공)
- VSCode 디버그: Cmd+Shift+D → **operato-wms-ai (debug-dev)** | 원격 attach: 포트 5004
- 프론트엔드 개발 서버: http://localhost:5907 (포트는 `frontend/packages/operato-wes/config/config.development.js`에서 설정)
- 백엔드 API: http://localhost:9191/rest


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


## Claude Skills (`.claude/commands/`)

프로젝트에 등록된 Claude slash command 목록입니다.
새 skill을 추가할 때마다 이 테이블을 업데이트하세요.

| 명령 | 파일 | 설명 |
|------|------|------|
| `/build` | `.claude/commands/build.md` | 백엔드(`operato-wms-ai`) Gradle 빌드 실행. 옵션: 기본/테스트 제외/클린/Docker용 |
| `/commit` | `.claude/commands/commit.md` | 이 대화의 작업 내용을 git commit으로 기록. 한국어 메시지, 선택적 스테이징, 푸시는 명시 요청 시에만 |
| `/log` | `.claude/commands/log.md` | 오늘 작업 내용을 `.ai/logs/YYYY-MM-DD.md`에 기록 |
| `/translate` | `.claude/commands/translate.md` | terminologies 테이블의 미번역 항목을 locale별(ko/en/zh)로 번역하여 DB 업데이트 |
| `/code_by_entity_column` | `.claude/commands/code_by_entity_column.md` | Entity 필드의 코드 값을 common_codes/common_code_details 테이블에 등록. 인자: `EntityName fieldName` |
| `/code_by_entity` | `.claude/commands/code_by_entity.md` | Entity의 공통코드 대상 필드를 자동 식별하여 일괄 등록. 인자: `EntityName` |
| `/entity_meta_by_entity` | `.claude/commands/entity_meta_by_entity.md` | Entity 클래스를 분석하여 entities + entity_columns 메타데이터 자동 등록. 인자: `EntityName` |
