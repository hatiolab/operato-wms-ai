# 개발 환경 구성 가이드

> 최종 업데이트: 2026-03-12
> IDE: VSCode
> 대상: 로컬 개발 환경 (Nginx 미사용)

이 문서는 Operato WMS 프로젝트의 로컬 개발 환경을 VSCode로 구성하는 가이드입니다.

---

## 📋 목차

1. [개요](#1-개요)
2. [필수 소프트웨어 설치](#2-필수-소프트웨어-설치)
3. [프로젝트 클론 및 초기 설정](#3-프로젝트-클론-및-초기-설정)
4. [VSCode 설정](#4-vscode-설정)
5. [백엔드 개발 환경 구성](#5-백엔드-개발-환경-구성)
6. [프론트엔드 개발 환경 구성](#6-프론트엔드-개발-환경-구성)
7. [데이터베이스 설정](#7-데이터베이스-설정)
8. [개발 서버 실행](#8-개발-서버-실행)
9. [디버깅](#9-디버깅)
10. [문제 해결](#10-문제-해결)

---

## 1. 개요

### 1.1 개발 환경 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    개발자 (VSCode)                   │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────┐                   ┌───────────────┐
│  프론트엔드    │                   │   백엔드       │
│  Koa :5907    │ ─── REST API ───> │  Spring :9191 │
│  (개발 서버)   │                   │  (bootRunDev) │
└───────────────┘                   └───────┬───────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
                  PostgreSQL           Redis            RabbitMQ
                    :5432              :6379              :5672
```

### 1.2 주요 특징

- ✅ **핫 리로드**: 백엔드/프론트엔드 코드 변경 시 자동 반영
- ✅ **분리된 서버**: 백엔드(9191), 프론트엔드(5907) 독립 실행
- ✅ **CORS 허용**: 개발 환경에서 localhost:5907 허용
- ✅ **디버깅 지원**: VSCode 디버거로 백엔드 디버깅 가능
- ⚠️ **Nginx 미사용**: 개발 환경에서는 프론트엔드 개발 서버 직접 사용

---

## 2. 필수 소프트웨어 설치

### 2.1 기본 도구

| 소프트웨어 | 버전 | 용도 | 설치 링크 |
|-----------|------|------|----------|
| **Java** | 18+ | 백엔드 실행 | [OpenJDK](https://adoptium.net/) |
| **Node.js** | 20+ | 프론트엔드 빌드/실행 | [Node.js](https://nodejs.org/) |
| **Yarn** | 1.22+ | 프론트엔드 패키지 관리 | `npm install -g yarn` |
| **PostgreSQL** | 15+ | 데이터베이스 | [PostgreSQL](https://www.postgresql.org/) |
| **Redis** | 7+ | 캐시/세션 | [Redis](https://redis.io/) |
| **Git** | 2.x | 버전 관리 | [Git](https://git-scm.com/) |
| **VSCode** | 최신 | IDE | [VSCode](https://code.visualstudio.com/) |

### 2.2 선택 도구

| 소프트웨어 | 용도 | 설치 링크 |
|-----------|------|----------|
| **RabbitMQ** | 메시지 큐 (선택) | [RabbitMQ](https://www.rabbitmq.com/) |
| **DBeaver** | DB 클라이언트 | [DBeaver](https://dbeaver.io/) |
| **Postman** | API 테스트 | [Postman](https://www.postman.com/) |

### 2.3 설치 확인

```bash
# 버전 확인
java -version        # 18 이상
node -v              # v20 이상
yarn -v              # 1.22 이상
psql --version       # 15 이상
redis-cli --version  # 7 이상
git --version        # 2.x
```

---

## 3. 프로젝트 클론 및 초기 설정

### 3.1 프로젝트 클론

```bash
# 1. 프로젝트 클론
git clone <repository-url>
cd operato-wms-ai

# 2. 서브모듈 초기화 (otarepo-core)
git submodule update --init --recursive
```

### 3.2 환경 설정 파일 생성

```bash
# 백엔드 개발 환경 설정 파일 생성
cp src/main/resources/application-dev.properties.template \
   src/main/resources/application-dev.properties

# 프론트엔드 개발 환경 설정 파일 생성
cp frontend/packages/operato-wes/config/config.development.js.template \
   frontend/packages/operato-wes/config/config.development.js
```

### 3.3 환경 설정 파일 수정

**`src/main/resources/application-dev.properties`**:

```properties
# 데이터베이스 설정
spring.datasource.url=jdbc:postgresql://localhost:5432/operato_wms
spring.datasource.username=your_username
spring.datasource.password=your_password

# Redis 설정
spring.data.redis.host=localhost
spring.data.redis.port=6379

# CORS 설정 (프론트엔드 개발 서버)
operato.wms.cors.allowed-origins=http://localhost:5907

# 서버 포트
server.port=9191
```

**`frontend/packages/operato-wes/config/config.development.js`**:

```javascript
module.exports = {
  port: 5907,
  host: 'localhost',
  apiUrl: 'http://localhost:9191',
  // 기타 설정...
}
```

---

## 4. VSCode 설정

### 4.1 필수 확장 프로그램

VSCode Extensions:

```
ext install vscjava.vscode-java-pack
ext install vscjava.vscode-spring-boot-dashboard
ext install dbaeumer.vscode-eslint
ext install esbenp.prettier-vscode
ext install ms-vscode.vscode-typescript-next
ext install redhat.vscode-yaml
ext install eamodio.gitlens
```

또는 VSCode에서 직접 설치:

1. **Java Extension Pack** - Java 개발 지원
2. **Spring Boot Extension Pack** - Spring Boot 개발 지원
3. **ESLint** - 프론트엔드 코드 린팅
4. **Prettier** - 코드 포맷팅
5. **TypeScript and JavaScript Language Features** - TypeScript 지원
6. **YAML** - YAML 파일 지원
7. **GitLens** - Git 기능 강화

### 4.2 VSCode 워크스페이스 설정

**`.vscode/settings.json`** (프로젝트 루트):

```json
{
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.compile.nullAnalysis.mode": "automatic",
  "java.format.settings.url": ".vscode/java-formatter.xml",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/.gradle": true,
    "**/build": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/dist-app": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/build": true,
    "**/.gradle": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[java]": {
    "editor.defaultFormatter": "redhat.java"
  }
}
```

### 4.3 디버그 설정

**`.vscode/launch.json`**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "operato-wms-ai (debug-dev)",
      "request": "attach",
      "hostName": "localhost",
      "port": 5004,
      "projectName": "operato-wms-ai"
    },
    {
      "type": "java",
      "name": "Spring Boot (직접 실행)",
      "request": "launch",
      "mainClass": "operato.wms.Application",
      "projectName": "operato-wms-ai",
      "args": "--spring.profiles.active=dev"
    }
  ]
}
```

---

## 5. 백엔드 개발 환경 구성

### 5.1 Gradle 빌드

```bash
# 1. 의존성 다운로드 및 빌드 (테스트 제외)
./gradlew clean build -x test

# 2. IDE 설정 생성
./gradlew eclipse  # Eclipse 사용 시
./gradlew idea     # IntelliJ 사용 시
```

### 5.2 데이터베이스 초기화

```bash
# PostgreSQL 데이터베이스 생성
psql -U postgres
```

```sql
CREATE DATABASE operato_wms;
CREATE USER wms_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE operato_wms TO wms_user;
\q
```

### 5.3 백엔드 개발 서버 실행

**방법 1: Gradle 명령어**

```bash
./gradlew bootRunDev
```

**방법 2: VSCode Spring Boot Dashboard**

1. VSCode 왼쪽 사이드바에서 "Spring Boot Dashboard" 열기
2. "operato-wms-ai" 앱 찾기
3. ▶️ 버튼 클릭하여 실행

**방법 3: 터미널에서 직접 실행**

```bash
# 디버그 모드로 실행 (포트 5004)
./gradlew bootRun --args='--spring.profiles.active=dev' \
  -Dagentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5004
```

### 5.4 백엔드 실행 확인

```bash
# 헬스 체크
curl http://localhost:9191/actuator/health

# 응답:
# {"status":"UP"}
```

브라우저에서 확인: http://localhost:9191/actuator/health

---

## 6. 프론트엔드 개발 환경 구성

### 6.1 의존성 설치

```bash
cd frontend

# Yarn 의존성 설치
yarn install
```

### 6.2 프론트엔드 개발 서버 실행

```bash
# frontend 디렉토리에서
yarn wms:dev
```

또는 프로젝트 루트에서:

```bash
cd frontend && yarn wms:dev
```

### 6.3 프론트엔드 실행 확인

브라우저에서 http://localhost:5907 접속

- 로그인 페이지가 표시되면 정상
- 백엔드 API 연결 확인: 네트워크 탭에서 `/rest/` 요청 확인

---

## 7. 데이터베이스 설정

### 7.1 PostgreSQL 설정

**데이터베이스 생성 및 권한 설정**:

```sql
-- 데이터베이스 생성
CREATE DATABASE operato_wms
  WITH ENCODING 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE template0;

-- 사용자 생성 및 권한 부여
CREATE USER wms_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE operato_wms TO wms_user;

-- 스키마 권한
\c operato_wms
GRANT ALL ON SCHEMA public TO wms_user;
```

### 7.2 Redis 설정

**Redis 서버 시작**:

```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis

# Windows
redis-server

# Redis 연결 확인
redis-cli ping
# 응답: PONG
```

### 7.3 초기 데이터 로드

```bash
# 백엔드 실행 시 자동으로 마이그레이션 실행
# Liquibase 또는 Flyway를 통해 스키마 생성

# 또는 수동으로 SQL 파일 실행
psql -U wms_user -d operato_wms -f src/main/resources/db/init.sql
```

---

## 8. 개발 서버 실행

### 8.1 통합 실행 스크립트

**`scripts/dev.sh`** (프로젝트 루트):

```bash
#!/bin/bash

echo "🚀 Operato WMS 개발 서버 시작..."

# 백엔드 시작 (백그라운드)
echo "📦 백엔드 서버 시작 (포트 9191)..."
./gradlew bootRunDev > /dev/null 2>&1 &
BACKEND_PID=$!

# 백엔드 준비 대기
echo "⏳ 백엔드 서버 준비 중..."
for i in {1..30}; do
  if curl -s http://localhost:9191/actuator/health > /dev/null; then
    echo "✅ 백엔드 서버 준비 완료"
    break
  fi
  sleep 1
done

# 프론트엔드 시작
echo "🎨 프론트엔드 서버 시작 (포트 5907)..."
cd frontend && yarn wms:dev

# Ctrl+C 시 백엔드도 종료
trap "kill $BACKEND_PID" EXIT
```

실행:

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

### 8.2 개별 실행 (권장)

**터미널 1 - 백엔드**:

```bash
./gradlew bootRunDev
```

**터미널 2 - 프론트엔드**:

```bash
cd frontend && yarn wms:dev
```

### 8.3 접속 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| **프론트엔드** | http://localhost:5907 | 개발 서버 (Koa) |
| **백엔드 API** | http://localhost:9191/rest | REST API |
| **Actuator** | http://localhost:9191/actuator | Spring Boot Actuator |
| **Health Check** | http://localhost:9191/actuator/health | 헬스 체크 |

---

## 9. 디버깅

### 9.1 백엔드 디버깅 (VSCode)

#### 방법 1: Remote Attach (권장)

1. **백엔드를 디버그 모드로 실행**:

   ```bash
   ./gradlew bootRunDev
   # 또는
   ./gradlew bootRun --args='--spring.profiles.active=dev' \
     -Dagentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5004
   ```

2. **VSCode에서 디버거 연결**:
   - `F5` 키 또는 Run → Start Debugging
   - "operato-wms-ai (debug-dev)" 선택
   - 브레이크포인트 설정 후 테스트

#### 방법 2: 직접 실행

1. **VSCode에서 직접 실행**:
   - `F5` 키 → "Spring Boot (직접 실행)" 선택
   - 자동으로 디버그 모드로 실행됨

2. **브레이크포인트**:
   - 코드 라인 왼쪽 클릭하여 브레이크포인트 설정
   - 빨간 점이 표시되면 설정 완료

### 9.2 프론트엔드 디버깅

#### Chrome DevTools 사용

1. **프론트엔드 개발 서버 실행**:
   ```bash
   cd frontend && yarn wms:dev
   ```

2. **Chrome에서 DevTools 열기**:
   - http://localhost:5907 접속
   - `F12` 또는 우클릭 → "검사"
   - Sources 탭에서 소스 코드 확인
   - 브레이크포인트 설정

#### VSCode 디버거 사용

**`.vscode/launch.json`**에 추가:

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "프론트엔드 디버깅 (Chrome)",
  "url": "http://localhost:5907",
  "webRoot": "${workspaceFolder}/frontend/packages/operato-wes/client",
  "sourceMaps": true
}
```

### 9.3 로그 확인

**백엔드 로그**:

```bash
# 콘솔에서 실시간 확인
tail -f logs/operato-wms.log

# 또는 Gradle 출력에서 확인
./gradlew bootRunDev  # 콘솔에 로그 출력
```

**프론트엔드 로그**:

- Chrome DevTools Console 탭
- 네트워크 탭에서 API 요청/응답 확인

---

## 10. 문제 해결

### 10.1 백엔드 실행 문제

#### 포트 충돌 (9191)

```bash
# 포트 사용 프로세스 확인
lsof -i :9191

# 프로세스 종료
kill -9 <PID>
```

#### 데이터베이스 연결 실패

```bash
# PostgreSQL 실행 확인
psql -U postgres -d operato_wms

# 연결 테스트
psql -h localhost -p 5432 -U wms_user -d operato_wms
```

**`application-dev.properties` 확인**:
- URL, username, password 정확성
- PostgreSQL 서버 실행 상태

#### Gradle 빌드 실패

```bash
# 캐시 삭제 후 재빌드
./gradlew clean build --refresh-dependencies -x test
```

### 10.2 프론트엔드 실행 문제

#### 포트 충돌 (5907)

```bash
# 포트 사용 프로세스 확인
lsof -i :5907

# 프로세스 종료
kill -9 <PID>
```

#### 의존성 설치 실패

```bash
# node_modules 삭제 후 재설치
cd frontend
rm -rf node_modules yarn.lock
yarn install
```

#### 백엔드 API 연결 실패

1. **백엔드 서버 실행 확인**:
   ```bash
   curl http://localhost:9191/actuator/health
   ```

2. **CORS 설정 확인**:
   - `application-dev.properties`의 `operato.wms.cors.allowed-origins` 확인
   - `http://localhost:5907` 포함 여부 확인

3. **프론트엔드 API URL 확인**:
   - `config.development.js`의 `apiUrl` 확인
   - `http://localhost:9191` 설정 확인

### 10.3 데이터베이스 문제

#### 마이그레이션 실패

```bash
# 마이그레이션 초기화 (주의: 데이터 삭제됨)
psql -U wms_user -d operato_wms -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 백엔드 재시작하여 마이그레이션 재실행
./gradlew bootRunDev
```

#### Redis 연결 실패

```bash
# Redis 실행 확인
redis-cli ping

# Redis 서버 시작
redis-server

# 연결 테스트
redis-cli -h localhost -p 6379
```

### 10.4 VSCode 디버깅 문제

#### 디버거 연결 실패

1. **백엔드가 디버그 모드로 실행 중인지 확인**:
   ```bash
   # 5004 포트 리스닝 확인
   lsof -i :5004
   ```

2. **launch.json의 포트 확인**:
   - `port: 5004` 설정 확인

3. **방화벽 확인**:
   - localhost:5004 허용 여부 확인

---

## 11. 개발 팁

### 11.1 핫 리로드 활용

**백엔드**:
- 코드 변경 시 Gradle이 자동으로 재시작
- `bootRunDev` 태스크가 `continuous` 모드로 실행됨

**프론트엔드**:
- Koa 개발 서버가 파일 변경 감지
- 브라우저 자동 새로고침 (Live Reload)

### 11.2 데이터베이스 스키마 확인

**DBeaver 사용**:
1. New Connection → PostgreSQL
2. Host: localhost, Port: 5432
3. Database: operato_wms
4. Username/Password: 설정한 값
5. Test Connection → Finish

### 11.3 API 테스트

**Postman 사용**:
1. GET http://localhost:9191/rest/domains/list
2. Authorization: 필요 시 설정
3. Send → 응답 확인

**curl 사용**:
```bash
# 도메인 목록 조회
curl http://localhost:9191/rest/domains/list

# 인증이 필요한 경우
curl -H "Authorization: Bearer <token>" \
     http://localhost:9191/rest/...
```

### 11.4 Git Hook 설정

**pre-commit hook** (`.git/hooks/pre-commit`):

```bash
#!/bin/bash

# 백엔드 코드 포맷 체크
./gradlew spotlessCheck

# 프론트엔드 린트
cd frontend && yarn lint

# 오류 발생 시 커밋 중단
if [ $? -ne 0 ]; then
  echo "❌ 코드 포맷 또는 린트 오류 발생"
  exit 1
fi
```

---

## 12. 참고 문서

### 프로젝트 문서
- [프로젝트 개요](../overview/overview.md)
- [시스템 아키텍처](../architecture/architecture.md)
- [API 명세](api-list.md)
- [백엔드 Docker 가이드](../operations/backend-docker.md)

### 개발 가이드
- [SETUP.md](../../SETUP.md) — 전체 설정 가이드
- [CLAUDE.md](../../CLAUDE.md) — 개발 가이드
- [프론트엔드 통합 가이드](../../frontend/INTEGRATION.md)

### 품질 관리
- [백엔드 테스트 가이드](../quality/backend-testing-guide.md)
- [프론트엔드 테스트 가이드](../quality/frontend-testing-guide.md)
- [백엔드 품질 체크리스트](../quality/backend-quality-checklist.md)

---

**작성자**: HatioLab 개발팀
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-03-12
