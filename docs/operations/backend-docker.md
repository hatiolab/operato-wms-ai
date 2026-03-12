# Operato WMS Docker 빌드 및 실행 가이드

## 개요

`operato-wms-ai`는 **Nginx + Spring Boot** 분리 아키텍처로 Docker 배포합니다.

- **Nginx**: 프론트엔드 정적 파일 서빙 + 리버스 프록시 (외부 포트 80)
- **Spring Boot**: REST API 전용 (내부 포트 9191, 외부 미노출)

```
Client → Nginx (:80) → /* 정적 파일 (dist-app)
                      → /rest/* 백엔드 프록시 (operato-wms-ai:9191)
```

### 관련 파일

| 파일 | 위치 | 설명 |
|------|------|------|
| `Dockerfile` | `operato-wms-ai/` | 백엔드 멀티 스테이지 빌드 |
| `nginx/Dockerfile` | `operato-wms-ai/nginx/` | 프론트엔드 빌드 + Nginx 서빙 |
| `nginx/default.conf` | `operato-wms-ai/nginx/` | Nginx 사이트 설정 (리버스 프록시 + SPA) |
| `nginx/nginx.conf` | `operato-wms-ai/nginx/` | Nginx 메인 설정 (gzip, 업로드) |
| `.dockerignore` | `operato-wms-ai/` | 빌드 컨텍스트 제외 목록 |
| `docker-compose.yml` | `operato-wms-ai/` | 풀스택 서비스 구성 |
| `.env.example` | `operato-wms-ai/` | 환경변수 템플릿 |
| `.env` | `operato-wms-ai/` | 실제 환경변수 (git 미추적) |

---

## 1. 사전 요구사항

| 항목 | 최소 버전 | 확인 명령 |
|------|----------|----------|
| Docker | 24.x 이상 | `docker --version` |
| Docker Compose | V2 (compose 서브커맨드) | `docker compose version` |
| 디스크 공간 | 5GB 이상 | 빌드 캐시 포함 |

---

## 2. Build Context 주의사항

`operato-wms-ai`의 `settings.gradle`은 형제 디렉터리인 `otarepo-core`를 서브프로젝트로 참조합니다.

```groovy
// settings.gradle
include ':otarepo-core'
project(':otarepo-core').projectDir = new File('../otarepo-core')
```

따라서 Docker 빌드 컨텍스트를 **반드시 상위 디렉터리(`..`)** 로 설정해야 합니다.

```
Git/                          ← build context (..)
├── operato-wms-ai/           ← 프로젝트 루트 (docker-compose.yml 실행 위치)
│   ├── Dockerfile            ← 백엔드 빌드
│   ├── nginx/                ← Nginx 설정 + 프론트엔드 빌드
│   │   ├── Dockerfile
│   │   ├── default.conf
│   │   └── nginx.conf
│   ├── docker-compose.yml
│   ├── frontend/             ← 프론트엔드 소스 (Nginx Dockerfile에서 빌드)
│   └── src/
└── otarepo-core/             ← Gradle 서브프로젝트 (빌드 시 필요)
```

`docker-compose.yml`은 이를 자동으로 처리합니다:
```yaml
# 백엔드
build:
  context: ..
  dockerfile: operato-wms-ai/Dockerfile

# Nginx (프론트엔드)
build:
  context: ..
  dockerfile: operato-wms-ai/nginx/Dockerfile
```

---

## 3. Dockerfile 구조

### 백엔드 (Dockerfile)

```
Stage 1: builder (eclipse-temurin:18-jdk-alpine)
  ├── Gradle wrapper + 빌드 스크립트 복사  ← 레이어 캐시 활용
  ├── otarepo-core 복사
  ├── src 복사
  └── ./gradlew build -x test              ← JAR 생성

Stage 2: runtime (eclipse-temurin:18-jre-alpine)
  ├── 전용 사용자(wms) 생성                ← 보안: 비루트 실행
  ├── app.jar 복사 (builder → runtime)
  ├── /app/logs 디렉터리 생성
  └── EXPOSE 9191
```

**빌드 레이어 캐시 전략**: Gradle wrapper → 빌드 스크립트 → `otarepo-core` → `src` 순으로 복사하여, 소스 변경 시에만 마지막 레이어부터 재빌드합니다.

### Nginx (nginx/Dockerfile)

```
Stage 1: builder (node:20-alpine)
  ├── frontend/ 소스 복사
  ├── yarn install
  ├── yarn build (Lerna 전체 빌드)
  └── yarn workspace ... build:app          ← dist-app 생성

Stage 2: nginx (nginx:alpine)
  ├── nginx.conf + default.conf 복사
  ├── dist-app → /usr/share/nginx/html
  └── EXPOSE 80
```

> 프론트엔드는 Nginx 이미지 안에서 빌드되므로 별도의 사전 빌드가 불필요합니다.

---

## 4. 환경변수 설정

### 4-1. .env 파일 생성

```bash
cd operato-wms-ai
cp .env.example .env
```

`.env` 파일을 열어 실제 값으로 수정합니다:

```properties
# Jasypt 마스터 키 — application-prod.properties의 ENC(...) 복호화에 사용
JASYPT_ENCRYPTOR_PASSWORD=your-strong-master-key

# PostgreSQL 컨테이너 초기화 패스워드
# ⚠️ application-prod.properties의 spring.datasource.password ENC() 복호화 값과 반드시 일치해야 함
DB_PASSWORD=your-db-password
```

> ⚠️ `.env` 파일은 `.gitignore`에 포함되어 있어 git에 커밋되지 않습니다.

### 4-2. 환경변수 역할

| 변수명 | 사용처 | 비고 |
|--------|--------|------|
| `JASYPT_ENCRYPTOR_PASSWORD` | Spring Boot — ENC() 복호화 | 마스터 키 |
| `DB_PASSWORD` | PostgreSQL 컨테이너 초기화 전용 | Spring Boot는 ENC()로 패스워드를 내장하므로 직접 사용하지 않음 |

### 4-3. Spring Boot 런타임 환경변수 (docker-compose → 컨테이너)

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `SPRING_PROFILES_ACTIVE` | `prod` | Spring 프로파일 |
| `JAVA_OPTS` | `-Xmx512m -Djava.security.egd=file:/dev/./urandom` | JVM 옵션 |
| `JASYPT_ENCRYPTOR_PASSWORD` | `.env`에서 주입 | Jasypt 마스터 키 |

---

## 5. docker-compose 서비스 구성

```
nginx (:80) ──depends_on──► operato-wms-ai (:9191 내부)
                                  depends_on ──► postgres (:15432)
                                  depends_on ──► redis    (:6379)
```

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| `nginx` | 로컬 빌드 (`hatiolab/operato-nginx:latest`) | **80** (외부) | 정적 파일 + 리버스 프록시 |
| `operato-wms-ai` | 로컬 빌드 (`hatiolab/operato-wms-ai:latest`) | 9191 (내부) | REST API |
| `postgres` | `postgres:16-alpine` | 15432 | 데이터베이스 |
| `redis` | `redis:7-alpine` | 6379 | 세션/캐시 |

> 백엔드 포트(9191)는 `expose`로 내부 네트워크에만 노출됩니다. 외부에서는 Nginx(80)를 통해서만 접근 가능합니다.

---

## 6. 빌드

### 전체 스택 빌드
```bash
cd operato-wms-ai

# Nginx + 백엔드 + PostgreSQL + Redis 전체 빌드
docker compose build

# 개별 빌드
docker compose build nginx           # 프론트엔드 (Nginx)만
docker compose build operato-wms-ai  # 백엔드만
```

### 직접 빌드 (docker-compose 없이)
```bash
# operato-wms-ai/ 디렉터리에서 실행
# build context를 반드시 상위 디렉터리(..)로 지정

# 백엔드
docker build -f Dockerfile -t hatiolab/operato-wms-ai:latest ..

# Nginx (프론트엔드)
docker build -f nginx/Dockerfile -t hatiolab/operato-nginx:latest ..
```

### 빌드 캐시 무시 (강제 전체 재빌드)
```bash
docker compose build --no-cache
```

---

## 7. 실행

### 7-1. 전체 스택 시작

```bash
cd operato-wms-ai

# .env 파일 확인
cat .env

# 전체 스택 시작 (백그라운드)
docker compose up -d

# 빌드 포함 시작 (소스 변경 후)
docker compose up --build -d
```

### 7-2. 기동 상태 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# 기동 로그 실시간 확인 (Spring Boot 기동 약 60초 소요)
docker compose logs -f operato-wms-ai

# Nginx 로그 확인
docker compose logs -f nginx

# 헬스체크 (Nginx를 통해 접근)
curl http://localhost/actuator/health
# 정상: {"status":"UP"}

# 프론트엔드 확인
curl -s http://localhost/ | head -5
```

### 7-3. 개별 서비스 조작

```bash
# 백엔드만 재시작 (Nginx/PostgreSQL/Redis 유지)
docker compose restart operato-wms-ai

# 프론트엔드만 재빌드 (백엔드 재시작 불필요)
docker compose up --build -d nginx

# 백엔드 이미지 재빌드 후 재시작
docker compose up --build -d operato-wms-ai

# 특정 서비스 로그 확인
docker compose logs -f postgres
docker compose logs -f redis
```

---

## 8. 중지 및 정리

```bash
# 전체 스택 중지 (컨테이너 삭제, 볼륨 유지)
docker compose down

# 전체 중지 + 볼륨 삭제 ⚠️ DB 데이터 초기화
docker compose down -v

# 백엔드만 중지 (Nginx/DB/Redis 유지)
docker compose stop operato-wms-ai

# 사용하지 않는 이미지 정리
docker image prune -f
```

---

## 9. 볼륨 관리

| 볼륨명 | 마운트 위치 | 내용 |
|--------|------------|------|
| `operato-wms-ai_postgres-data` | `/var/lib/postgresql/data` | PostgreSQL 데이터 |
| `operato-wms-ai_redis-data` | `/data` | Redis 영구 데이터 |
| `operato-wms-ai_wms-logs` | `/app/logs` | 애플리케이션 로그 |

```bash
# 볼륨 목록 확인
docker volume ls | grep operato

# 로그 파일 직접 접근
docker compose exec operato-wms-ai ls /app/logs
docker compose exec operato-wms-ai tail -f /app/logs/application.$(date +%Y-%m-%d).log
```

---

## 10. 트러블슈팅

### 빌드 실패: `otarepo-core` 를 찾을 수 없음

```
COPY failed: file not found in build context or excluded by .dockerignore: stat otarepo-core
```

**원인**: build context가 `operato-wms-ai/` 로 설정됨
**해결**: `operato-wms-ai/` 디렉터리에서 실행하되, `docker compose` 명령 사용 (자동으로 `..` 설정)

```bash
# 올바른 실행 위치
cd operato-wms-ai
docker compose build   # ✅
```

---

### 컨테이너 기동 실패: `Failed to decrypt`

```
com.ulisesbocchio.jasyptspringboot.exception.DecryptionException:
  Failed to decrypt property ...
```

**원인**: `JASYPT_ENCRYPTOR_PASSWORD`가 잘못되었거나 설정되지 않음
**해결**:
```bash
# .env 파일 확인
cat .env | grep JASYPT

# 환경변수 주입 확인
docker compose exec operato-wms-ai env | grep JASYPT
```

---

### Spring Boot 기동 실패: DB 연결 오류

```
Unable to acquire JDBC Connection
```

**원인 1**: PostgreSQL 컨테이너가 아직 준비되지 않음 (정상 — healthcheck 대기 중)
**원인 2**: `DB_PASSWORD`와 ENC() 복호화 값 불일치

```bash
# PostgreSQL 상태 확인
docker compose ps postgres
docker compose logs postgres

# PostgreSQL 직접 접속 테스트
docker compose exec postgres psql -U postgres -d operatowms -c "SELECT 1;"
```

---

### 포트 충돌

```
Error: Bind for 0.0.0.0:80 failed: port is already allocated
```

**해결**:
```bash
# 포트 점유 프로세스 확인
lsof -i :80
lsof -i :15432
lsof -i :6379

# 기존 컨테이너 확인
docker ps | grep -E "80|15432|6379"
```

---

### Nginx 502 Bad Gateway

**원인**: 백엔드(operato-wms-ai)가 아직 기동 중이거나 다운됨
**해결**:
```bash
# 백엔드 상태 확인
docker compose ps operato-wms-ai

# 백엔드 로그 확인
docker compose logs -f operato-wms-ai

# 백엔드 헬스체크 (내부)
docker compose exec operato-wms-ai wget -qO- http://localhost:9191/actuator/health
```

---

## 11. 운영 배포 시 추가 고려사항

### Jasypt 마스터 키 교체
운영 환경에서는 기본값(`operato-wms-secret`) 대신 강력한 마스터 키를 사용해야 합니다. 마스터 키를 변경하면 ENC() 값도 재암호화가 필요합니다.

```bash
# 재암호화 방법: JasyptEncrypt 유틸리티 실행
# (jasypt-1.9.3.jar + bcprov-jdk15on-1.67.jar 필요)
java -cp "/path/to/jasypt.jar:/path/to/bcprov.jar" JasyptEncrypt
```

### 이미지 태깅 및 레지스트리 푸시
```bash
# 버전 태그 추가
docker tag hatiolab/operato-wms-ai:latest hatiolab/operato-wms-ai:1.0.0
docker tag hatiolab/operato-nginx:latest hatiolab/operato-nginx:1.0.0

# Docker Hub 푸시
docker push hatiolab/operato-wms-ai:latest
docker push hatiolab/operato-wms-ai:1.0.0
docker push hatiolab/operato-nginx:latest
docker push hatiolab/operato-nginx:1.0.0
```

### 프론트엔드만 업데이트

프론트엔드 변경 시 **백엔드 재빌드/재시작이 불필요**합니다:

```bash
# Nginx 이미지만 재빌드 + 재시작
docker compose up --build -d nginx
```

### 로그 보존
로그는 `wms-logs` Docker 볼륨에 저장되며, logback 설정에 따라 30일 보존, 최대 1GB 용량 제한이 적용됩니다 (`WEB-INF/logback-spring.xml`).
