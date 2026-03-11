# Operato WMS - 통합 프로젝트 설정 가이드

## 📋 **완료된 작업**

✅ 프론트엔드(operato-wms-app) `frontend/` 디렉토리로 통합
✅ Gradle 빌드 설정 (Node.js 플러그인)
✅ Spring Boot SPA 라우팅 지원
✅ 개발/배포 스크립트 생성
✅ .gitignore 업데이트

---

## 🚀 **빠른 시작**

### 1️⃣ 사전 준비

```bash
# application-dev.properties 생성
cp src/main/resources/application-dev.properties.template \
   src/main/resources/application-dev.properties

# DB, Redis 등 설정 편집
vi src/main/resources/application-dev.properties
```

### 2️⃣ 개발 모드 실행

**방법 A: 통합 스크립트 (권장)**
```bash
./scripts/dev.sh
```

**방법 B: 개별 실행**
```bash
# 터미널 1: 백엔드 (포트 9191)
./gradlew bootRunDev

# 터미널 2: 프론트엔드 (포트 3000)
cd frontend && yarn wms:dev
```

**접속:**
- 프론트엔드 개발 서버: http://localhost:3000
- 백엔드 API: http://localhost:9191/rest

### 3️⃣ 운영 배포용 빌드

```bash
# 전체 빌드
./scripts/build.sh

# 또는
./gradlew clean buildAll -x test

# 결과: build/libs/operato-wms-ai.jar (단일 파일, 프론트엔드 포함)
```

### 4️⃣ 운영 모드 실행

```bash
java -jar build/libs/operato-wms-ai.jar

# 접속: http://localhost:9191
# → 프론트엔드 + 백엔드 통합 서비스
```

---

## 🏗️ **프로젝트 구조**

```
operato-wms-ai/
├── src/main/
│   ├── java/
│   │   └── operato/wms/
│   │       └── base/web/controller/
│   │           └── SpaController.java       # SPA 라우팅
│   └── resources/
│       ├── static/                          # 빌드된 프론트엔드 (자동)
│       ├── application.properties
│       └── application-dev.properties.template
├── frontend/                                # operato-wms-app
│   ├── packages/
│   │   ├── operato-wes/                    # 메인 WMS 앱
│   │   │   └── dist-app/                   # 빌드 산출물
│   │   ├── operatofill/
│   │   ├── metapage/
│   │   └── operato-logis-system-ui/
│   ├── package.json
│   └── lerna.json
├── scripts/
│   ├── dev.sh                               # 개발 모드
│   └── build.sh                             # 통합 빌드
├── build.gradle                             # Gradle 설정
├── README.md
├── CLAUDE.md
└── SETUP.md (this file)
```

---

## ⚙️ **Gradle 태스크**

```bash
# 백엔드만 빌드
./gradlew clean build -x test

# 프론트엔드 + 백엔드 통합 빌드
./gradlew buildAll

# 프론트엔드 빌드만
./gradlew buildFrontend

# 프론트엔드 의존성 설치
./gradlew yarnInstall

# 개발 모드 (백엔드만)
./gradlew bootRunDev

# 전체 클린
./gradlew clean

# 태스크 목록 확인
./gradlew tasks --group=build
```

---

## 🔧 **빌드 프로세스**

### 운영 배포 빌드 (`./gradlew buildAll`):

```
1. yarnInstall
   └─> yarn install (프론트엔드 의존성)

2. lernaBootstrap
   └─> yarn run build (모든 패키지 빌드)

3. buildFrontend
   └─> yarn workspace @operato-app/operato-wes run build:app
       └─> frontend/packages/operato-wes/dist-app/ 생성

4. copyFrontendDist
   └─> dist-app/ → src/main/resources/static/ 복사

5. build
   └─> Spring Boot JAR 빌드
       └─> build/libs/operato-wms-ai.jar (프론트엔드 포함)
```

---

## 📝 **개발 vs 배포 모드**

| 항목 | 개발 모드 | 배포 모드 |
|------|----------|----------|
| **프론트엔드** | 별도 포트 (3000) | 통합 (9191) |
| **백엔드** | 포트 9191 | 포트 9191 |
| **핫 리로드** | ✅ 지원 | ❌ |
| **CORS** | 허용 (localhost:3000) | 불필요 |
| **SPA 라우팅** | 비활성화 | 활성화 |
| **빌드 시간** | 빠름 (백엔드만) | 느림 (전체) |
| **배포 파일** | 없음 | JAR 1개 |

---

## 🐛 **문제 해결**

### 1. 프론트엔드 빌드 실패

```bash
# 의존성 재설치
cd frontend
rm -rf node_modules yarn.lock
yarn install

# 패키지별 빌드 확인
yarn workspace @operato-app/operato-wes run build:app
```

### 2. Gradle 빌드 실패

```bash
# Gradle 캐시 클린
./gradlew clean --no-daemon
rm -rf build/
./gradlew buildAll
```

### 3. SPA 라우팅 안 됨

- `application.properties`의 `operato.wms.spa.enabled=true` 확인
- `SpaController.java`가 컴파일되었는지 확인
- 개발 모드에서는 SPA 라우팅 비활성화됨 (정상)

### 4. CORS 에러 (개발 모드)

- `application-dev.properties`의 CORS 설정 확인
- 프론트엔드가 http://localhost:3000에서 실행 중인지 확인

---

## 📚 **추가 문서**

- [프로젝트 개요](docs/overview/overview.md)
- [요구사항](docs/requirement/requirements.md)
- [프론트엔드 통합 가이드](frontend/INTEGRATION.md)
- [개발 가이드](CLAUDE.md)

---

## ✅ **체크리스트**

배포 전 확인 사항:

- [ ] `./gradlew buildAll` 성공
- [ ] `java -jar build/libs/operato-wms-ai.jar` 실행 성공
- [ ] http://localhost:9191 접속하여 프론트엔드 확인
- [ ] REST API 동작 확인 (http://localhost:9191/rest/...)
- [ ] 환경 변수 / 프로퍼티 설정 완료
- [ ] 데이터베이스 마이그레이션 완료

---

**문의**: HatioLab 개발팀
**업데이트**: 2026-03-11
