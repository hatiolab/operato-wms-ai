# Operato WMS 배포 및 운영 전략

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
│           브라우저 / PWA (모바일 PDA)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌─────────────────────┐     ┌─────────────────────┐
│  프론트엔드 서버     │     │   백엔드 API 서버    │
│  operato-wms-app    │     │  operato-wms-ai      │
│  Node.js (Koa)      │     │  Spring Boot 3.2.4   │
│  Port: 5907         │────▶│  Port: 9501          │
│  Docker 이미지:      │     │  Docker 이미지:      │
│  hatiolab/wms-client│     │  hatiolab/operato-   │
│                     │     │  wms-ai:latest       │
└─────────────────────┘     └──────────┬──────────┘
                                        │
               ┌────────────────────────┼──────────────────────┐
               │                        │                       │
               ▼                        ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐
    │   PostgreSQL     │    │      Redis        │   │   RabbitMQ       │
    │   Port: 15432    │    │   Port: 6379      │   │   Port: 25004    │
    │   DB: operatowms │    │   DB: 12          │   │   (선택적)       │
    └──────────────────┘    └──────────────────┘   └──────────────────┘
```

---

## 2. 구성 요소별 배포 방식

### 2-1. 백엔드 (operato-wms-ai)

**Docker 이미지** 방식으로 배포. 멀티 스테이지 빌드 (`Dockerfile`) + `docker-compose.yml`로 전체 스택 관리.

#### 관련 파일
| 파일 | 역할 |
|------|------|
| `Dockerfile` | 멀티 스테이지 빌드 (JDK18 빌드 → JRE18 런타임) |
| `.dockerignore` | 빌드 컨텍스트에서 불필요한 파일 제외 |
| `docker-compose.yml` | 백엔드 + PostgreSQL + Redis 풀스택 구성 |
| `.env.example` | 환경변수 템플릿 (`.env`로 복사하여 사용) |

#### Docker 이미지 빌드
```bash
# docker-compose 사용 (권장) — build context가 자동으로 .. 로 설정됨
docker compose build

# 직접 빌드 (수동)
docker build -f Dockerfile -t hatiolab/operato-wms-ai:latest ..
```

> **주의**: `settings.gradle`이 `../otarepo-core`를 참조하므로 build context를 반드시 상위 디렉터리(`..`)로 설정해야 합니다.

#### 전체 스택 실행 (docker-compose)
```bash
# .env 파일 생성 (최초 1회)
cp .env.example .env
# → .env 파일에 실제 값 입력

# 전체 스택 시작 (백엔드 + PostgreSQL + Redis)
docker compose up -d

# 빌드 포함 시작
docker compose up --build -d

# 로그 확인
docker compose logs -f operato-wms-ai

# 헬스체크
curl http://localhost:9501/actuator/health
```

#### 환경변수 (필수)
| 변수명 | 설명 | 주입 위치 |
|--------|------|----------|
| `JASYPT_ENCRYPTOR_PASSWORD` | Jasypt 마스터 키 — ENC() 복호화에 사용 | `.env` 파일 |
| `DB_PASSWORD` | PostgreSQL 컨테이너 초기 패스워드 설정 | `.env` 파일 |

> Spring Boot 앱이 직접 사용하는 DB/메일 패스워드는 `application-prod.properties`에 `ENC(...)` 형식으로 내장되어 있어 별도 환경변수 불필요.

#### 프로파일별 설정 파일
| 파일 | 환경 | 주요 차이점 |
|------|------|------------|
| `application.properties` | 공통 | Jasypt 설정, shutdown endpoint |
| `application-dev.properties` | 개발 | DB: localhost:15432, sqlAspect 로깅 활성화, git 미추적 |
| `application-prod.properties` | 운영 | DB/메일 패스워드 Jasypt ENC() 암호화 적용 |

---

### 2-2. 프론트엔드 (operato-wms-app)

**Docker 이미지** 방식으로 배포. 베이스 이미지: `hatiolab/operato-env:latest`

#### Docker 이미지 빌드 및 배포
```bash
cd ../operato-wms-app

# 방법 1: npm script 사용 (빌드 + 이미지 생성 + 태깅)
yarn workspace @operato-app/operato-wes run docker

# 방법 2: 이미지만 생성 (빌드 생략)
yarn workspace @operato-app/operato-wes run docker:only

# 이미지 실행 확인 (로컬 테스트)
yarn workspace @operato-app/operato-wes run docker:run
# → http://localhost:4000

# Docker Hub 푸시
yarn workspace @operato-app/operato-wes run docker:push
```

#### 생성되는 이미지
| 태그 | 설명 |
|------|------|
| `hatiolab/wms-client:latest` | 최신 버전 |
| `hatiolab/wms-client:{version}` | 버전 태그 (package.json의 version 값, 현재 0.0.8) |

#### 컨테이너 실행 (운영)
```bash
docker run -d \
  --name operato-wms-app \
  -p 5907:5907 \
  -e NODE_ENV=production \
  hatiolab/wms-client:latest
```

#### 로컬 개발 서버 실행
```bash
cd ../operato-wms-app

# 의존성 설치
yarn install

# 개발 서버 (빌드 후 실행, 포트 5907)
# 포트는 frontend/packages/operato-wes/config/config.development.js에서 설정
yarn wms:dev

# 개발 서버 종료
yarn workspace @operato-app/operato-wes run stop:dev
```

---

## 3. 인프라 구성

### 3-1. 필수 인프라 서비스

#### PostgreSQL
```
- 버전: PostgreSQL (권장 14+)
- 포트: 15432 (비표준 포트 사용 중 — 표준 5432와 구분)
- DB명: operatowms
- 사용자: postgres
- 테이블스페이스: pg_default (데이터 + 인덱스 동일)
- 운영 고려사항:
  - 멀티테넌트 구조 — domain_id로 테넌트 분리 (물리 DB는 공유)
  - UUID PK 사용 — 인덱스 단편화 모니터링 필요
  - VACUUM 정기 실행 권장 (재고 이력 테이블 특히 중요)
```

#### Redis
```
- 포트: 6379
- DB: 12 (다른 서비스와 DB 번호로 분리)
- 용도: Spring Session 저장, 애플리케이션 캐시
- Lettuce Pool: max-active=10, max-idle=10
- 운영 고려사항:
  - session timeout: 3600000ms (60분)
  - Redis 장애 시 세션 전체 소실 → 가용성 확보 필요 (Sentinel 또는 Cluster)
```

#### RabbitMQ (선택적)
```
- 주소: 60.196.69.234
- AMQP 포트: 25004 (표준 5672 대신 비표준)
- 관리 API 포트: 25003 (표준 15672 대신)
- 현재 상태: mq.module.use=false (비활성화)
- 활성화 시 큐: operato-emps, any_server, logis_server, anysys_server
```

### 3-2. 포트 정리

| 서비스 | 포트 | 비고 |
|--------|------|------|
| 백엔드 API (Spring Boot) | 9501 | REST API |
| 프론트엔드 (Node.js) | 5907 | Docker 컨테이너 expose |
| 프론트엔드 개발 서버 | 3000 / 3001 | 개발 환경만 |
| PostgreSQL | 15432 | 비표준 포트 |
| Redis | 6379 | 표준 포트 |
| RabbitMQ AMQP | 25004 | 비표준 포트 |
| RabbitMQ 관리 UI | 25003 | 비표준 포트 |
| 모니터 에이전트 | 5500 | monitorAgent |
| 컨트롤 에이전트 | 7001 | controlAgent |
| JVM 원격 디버그 | 5004 | 개발 환경만 |

---

## 4. 배포 절차

### 4-1. 백엔드 배포 체크리스트

```
□ 1. 소스 최신화
      git pull origin main

□ 2. .env 파일 확인
      cat .env  # JASYPT_ENCRYPTOR_PASSWORD, DB_PASSWORD 설정 여부 확인

□ 3. 운영 DB 마이그레이션 필요 여부 확인
      (dbist.ddl.enable=false 이므로 스키마 변경 시 별도 DDL 수동 실행)

□ 4. Docker 이미지 빌드
      docker compose build operato-wms-ai

□ 5. 컨테이너 재시작
      docker compose up -d operato-wms-ai

□ 6. 기동 로그 확인 (약 60초 소요)
      docker compose logs -f operato-wms-ai

□ 7. 헬스체크 확인
      curl http://localhost:9501/actuator/health
      # → {"status":"UP"} 확인

□ 8. 이전 이미지 정리 (선택)
      docker image prune -f
```

### 4-2. 프론트엔드 배포 체크리스트

```
□ 1. 소스 최신화
      cd ../operato-wms-app && git pull origin main

□ 2. Docker 이미지 빌드 및 태깅
      yarn workspace @operato-app/operato-wes run docker

□ 3. 이미지 확인
      docker images | grep wms-client

□ 4. 기존 컨테이너 교체
      docker stop operato-wms-app
      docker rm operato-wms-app
      docker run -d --name operato-wms-app -p 5907:5907 hatiolab/wms-client:latest

□ 5. 컨테이너 동작 확인
      docker logs -f operato-wms-app

□ 6. Docker Hub 푸시 (선택)
      yarn workspace @operato-app/operato-wes run docker:push
```

---

## 5. 모니터링 및 관리

### 5-1. Spring Boot Actuator

```bash
# 헬스 체크
GET /actuator/health

# 정상 응답 예시
{
  "status": "UP",
  "components": { "db": {...}, "redis": {...} }
}
```

- `management.endpoint.health.show-details=when-authorized` — 인증된 사용자에게만 상세 정보 노출
- Shutdown endpoint: dev 환경에서만 활성화 (`management.endpoint.shutdown.enabled=false` in common)

### 5-2. Spring Boot Admin

- Admin 서버 URL: `http://admin.hatiolab.com/admin`
- 클라이언트 등록 주기: 60초
- 상태 모니터링 주기: 60초, 유효기간: 75초
- 애플리케이션이 Admin 서버에 자동 등록/해제됨

### 5-3. 로깅

```
설정 파일: src/main/resources/WEB-INF/logback-spring.xml
```

개발 환경 SQL 로깅 (application-dev.properties):
```properties
sqlAspect.enabled=true
sqlAspect.prettyPrint=true        # SQL 포맷팅
sqlAspect.combinedPrint=true      # SQL + 파라미터 함께 출력
sqlAspect.includeElapsedTime=true # 실행 시간 포함
```

---

## 6. DB 스키마 관리

### 현재 방식
- `dbist.ddl.enable=false` — **자동 DDL 비활성화** (운영 안전)
- 스키마 변경 시 DBA가 **직접 DDL 수동 실행** 필요
- 엔티티 경로: `dbist.base.entity.path=xyz.elidom,xyz.anythings,operato.logis`

### 초기 셋업 (신규 환경 구축)
```properties
# application.properties 또는 -dev.properties에 임시 활성화
dbist.ddl.enable=true
elidom.initial.setup=true
elidom.initial.domain.id=9300
elidom.initial.domain.name=Things Adminstrator
elidom.initial.admin.id=admin
elidom.initial.admin.passwd=admin
# ... (나머지 초기 설정값 주석 해제)
```
초기 셋업 완료 후 반드시 `dbist.ddl.enable=false`로 복구.

### 프론트엔드 DB 마이그레이션 (TypeORM)
```bash
cd ../operato-wms-app

# 마이그레이션 실행
yarn workspace @operato-app/operato-wes run migration

# 마이그레이션 롤백
yarn workspace @operato-app/operato-wes run migration:revert
```

---

## 7. 보안 운영

### 7-1. 시크릿 관리

| 구분 | 관리 방식 | 위치 |
|------|----------|------|
| DB 패스워드 (dev/prod 공통) | Jasypt ENC() 암호화 | `application-dev/prod.properties` |
| 메일 패스워드 (dev/prod 공통) | Jasypt ENC() 암호화 | `application-dev/prod.properties` |
| Jasypt 마스터 키 (개발) | 환경변수 `JASYPT_ENCRYPTOR_PASSWORD` | `.vscode/launch.json` (git 미추적) |
| Jasypt 마스터 키 (운영) | 환경변수 `JASYPT_ENCRYPTOR_PASSWORD` | `.env` 파일 (git 미추적) |
| PostgreSQL 컨테이너 패스워드 | 환경변수 `DB_PASSWORD` | `.env` 파일 (git 미추적) |

> ⚠️ `application-dev.properties`와 `.vscode/launch.json`, `.env`는 모두 git 추적에서 제외됨. 신규 개발자는 Jasypt 마스터 키를 별도로 전달받아 `.vscode/launch.json` 또는 `.env`에 설정해야 함.

### 7-2. Permit URL 정책

인증 없이 접근 가능한 공개 URL (`security.all.permit.uri`):
- `/rest/login`, `/rest/logout`
- `/rest/users/register`, `/rest/users/approval`, `/rest/users/reject`
- `/rest/domains/list`, `/rest/domain_apps`, `/rest/domains/current_domain`
- `/rest/seeds`, `/rest/download/public`
- 기타 계정 관련 초기화 엔드포인트

읽기 전용 허용 URL (`security.read.only.uri`):
- `/rest/fonts`, `/rest/publishers`, `/rest/download/public`

### 7-3. JWT 토큰

- 쿠키 키: `access_token.wmsapp`
- 가상 호스트 기반 도메인 미사용 (`useVirtualHostBasedDomain=false`)
- 서브도메인 오프셋: 2

---

## 8. 스케일링 및 고가용성 고려사항

### 현재 구조의 제약

| 항목 | 현재 상태 | 고가용성 구성 방안 |
|------|----------|-----------------|
| 세션 | Redis JDBC 혼합 (`spring.session.store-type=JDBC`) | Redis Sentinel/Cluster로 단일장애점 제거 |
| 애플리케이션 서버 | 단일 인스턴스 추정 | 로드밸런서 + 다중 인스턴스 (스티키 세션 또는 Redis 세션 공유) |
| DB | 단일 PostgreSQL | Read Replica 추가, PgBouncer 커넥션 풀링 |
| Redis | 단일 인스턴스 | Sentinel 구성 (Master 1 + Replica 2) |
| 스케줄러 | `quartz.scheduler.enable=false` | Quartz 클러스터 모드 (DB 기반 잠금) |

### WAS URL 브로드캐스트 설정
```properties
# 다중 WAS 환경에서 변경 필요
redis.was.urls=localhost:9501
# → redis.was.urls=was1:9501,was2:9501,was3:9501
```

### 커넥션 풀 설정
```properties
spring.datasource.hikari.maximum-pool-size=10  # WAS 수에 따라 조정
spring.data.redis.lettuce.pool.max-active=10
```

---

## 9. 장애 대응

### 9-1. 주요 장애 시나리오

| 증상 | 원인 추정 | 대응 |
|------|----------|------|
| 로그인 불가 | Redis 다운 (세션 저장 실패) | Redis 재시작, 세션 DB fallback 확인 |
| API 응답 없음 | DB 커넥션 풀 고갈 | HikariCP 로그 확인, 풀 사이즈 조정 |
| 느린 응답 | SQL 미최적화, N+1 쿼리 | sqlAspect 로그 분석, QueryStore 쿼리 튜닝 |
| 재고 불일치 | 주석 처리된 재고 차감 코드 미실행 | `PickingOrderController.updateItem()` 재고 차감 로직 확인 (리팩토링 대상) |
| 메모리 부족 | JasperReports 대용량 리포트 | Xmx 증가 또는 스트리밍 방식 전환 |

### 9-2. 헬스체크 URL 목록
```
백엔드: http://{host}:9501/actuator/health
Spring Boot Admin: http://admin.hatiolab.com/admin
```

### 9-3. Graceful Shutdown
```bash
# Docker compose (운영 환경 권장 — SIGTERM 전송 후 graceful 종료)
docker compose stop operato-wms-ai       # 개별 서비스 종료
docker compose down                      # 전체 스택 종료 (컨테이너 삭제)
docker compose down -v                   # 전체 종료 + 볼륨 삭제 (데이터 초기화 시)

# Actuator shutdown (dev 환경)
curl -X POST http://localhost:9501/actuator/shutdown
```

---

## 10. 개발 환경 신규 구성 가이드

### 백엔드 개발 환경 구성

#### 방법 A: VSCode 디버그 실행 (로컬 직접 실행)
```bash
# 1. 저장소 클론
git clone <repo-url> operato-wms-ai
cd operato-wms-ai

# 2. 서브모듈 초기화 (otarepo-core)
git submodule update --init --recursive

# 3. application-dev.properties 생성 (git 미추적 파일)
cp src/main/resources/application-prod.properties \
   src/main/resources/application-dev.properties
# → spring.datasource.url 등 로컬 환경에 맞게 수정

# 4. VSCode launch.json 환경변수 확인
# .vscode/launch.json의 JASYPT_ENCRYPTOR_PASSWORD 값 설정
# (기본값 "operato-wms-secret"이 이미 설정되어 있음)

# 5. 빌드
JAVA_HOME=$(/usr/libexec/java_home -v 18) ./gradlew build

# 6. VSCode 디버그 실행
# Cmd+Shift+D → "operato-wms-ai (debug-dev)" 선택
```

#### 방법 B: Docker Compose 실행 (인프라 포함 통합 실행)
```bash
# 1. 저장소 클론 및 서브모듈 초기화
git clone <repo-url> operato-wms-ai
cd operato-wms-ai
git submodule update --init --recursive

# 2. 환경변수 파일 생성
cp .env.example .env
# → .env의 JASYPT_ENCRYPTOR_PASSWORD, DB_PASSWORD 값 설정

# 3. 전체 스택 빌드 및 실행 (백엔드 + PostgreSQL + Redis)
docker compose up --build -d

# 4. 기동 확인
docker compose logs -f operato-wms-ai
curl http://localhost:9501/actuator/health
```

### 프론트엔드 개발 환경 구성

```bash
# 1. 저장소 클론
git clone <repo-url> operato-wms-app
cd operato-wms-app

# 2. Node.js 버전 확인 (dev.yml 기준: v12.14.0 — 현재는 상위 버전도 가능)

# 3. 의존성 설치
yarn install

# 4. 전체 빌드 (최초 1회 필요)
yarn build

# 5. 개발 서버 실행
yarn wms:dev
# → http://localhost:5907 (config.development.js에서 설정)
```

---

## 11. 향후 개선 과제

| 우선순위 | 항목 | 내용 |
|---------|------|------|
| ✅ 완료 | Dockerfile 작성 (백엔드) | 멀티 스테이지 빌드, JRE 런타임 이미지 |
| ✅ 완료 | docker-compose 작성 | 백엔드 + PostgreSQL + Redis 풀스택 구성 |
| 🔴 High | CI/CD 파이프라인 구성 | GitHub Actions 또는 Jenkins 기반 자동 빌드/배포 |
| 🟠 Medium | 환경변수 관리 도구 도입 | HashiCorp Vault 또는 AWS Secrets Manager |
| 🟠 Medium | 헬스체크 자동화 | Prometheus + Grafana 모니터링 대시보드 |
| 🟡 Low | Node.js 버전 업그레이드 | dev.yml 기준 v12 → LTS 버전으로 |
| 🟡 Low | 프론트엔드 CLAUDE.md 추가 | `operato-wms-app` 루트에 별도 CLAUDE.md 작성 |
