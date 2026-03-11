# Operato WMS AI

> 자가 물류 및 3PL을 위한 클라우드 기반 WMS (Warehouse Management System)

## 📁 프로젝트 구조

```
operato-wms-ai/
├── src/
│   ├── main/
│   │   ├── java/                # 백엔드 소스
│   │   │   └── operato/wms/
│   │   └── resources/
│   │       ├── static/          # 빌드된 프론트엔드 (자동 생성)
│   │       └── application.properties
│   └── test/
├── frontend/                    # 프론트엔드 (operato-wms-app 통합)
│   ├── packages/
│   │   ├── operato-wes/        # 메인 WMS 앱
│   │   ├── operatofill/
│   │   ├── metapage/
│   │   └── operato-logis-system-ui/
│   ├── lerna.json
│   └── package.json
├── scripts/                     # 헬퍼 스크립트
│   ├── dev.sh                  # 개발 모드 실행
│   └── build.sh                # 전체 빌드
├── build.gradle
└── README.md
```

## 🚀 빠른 시작

### 필수 요구사항

- **Java 18** (Azul Zulu 18 권장)
- **Node.js 18+** & **Yarn 1.22+** (프론트엔드용)
- **PostgreSQL** or **MySQL**
- **Redis**

### 1️⃣ 개발 환경 설정

```bash
# application-dev.properties 생성
cp src/main/resources/application-dev.properties.template \
   src/main/resources/application-dev.properties

# DB, Redis 등 설정 편집
vi src/main/resources/application-dev.properties
```

### 2️⃣ 개발 모드 실행

```bash
# 방법 1: 스크립트 사용 (권장)
./scripts/dev.sh

# 방법 2: 개별 실행
# 터미널 1 - 백엔드 (포트 9191)
./gradlew bootRunDev

# 터미널 2 - 프론트엔드 (포트 5907)
cd frontend && yarn wms:dev
```

**접속 URL:**
- 프론트엔드: http://localhost:5907 (포트는 `frontend/packages/operato-wes/config/config.development.js`에서 설정)
- 백엔드 API: http://localhost:9191/rest

### 3️⃣ 배포용 빌드

```bash
# 프론트엔드 + 백엔드 통합 빌드
./scripts/build.sh

# 또는
./gradlew clean buildAll -x test

# 결과물: build/libs/operato-wms-ai.jar
```

### 4️⃣ 운영 모드 실행

```bash
# 단일 JAR 실행 (프론트엔드 포함)
java -jar build/libs/operato-wms-ai.jar

# 접속: http://localhost:9191
```

## 🛠️ 기술 스택

### 백엔드
- **Java 18** + **Spring Boot 3.2.4**
- **Gradle 8.5**
- PostgreSQL / MySQL / Redis
- Jasypt (암호화)

### 프론트엔드
- **Things Factory** (Lerna + Yarn)
- TypeScript / JavaScript
- GraphQL
- Lit-Element

### 공유 라이브러리
- **otarepo-core** (별도 레포)

## 📖 상세 문서

- [프로젝트 개요](docs/overview/overview.md)
- [요구사항](docs/requirement/requirements.md)
- [개발 가이드](CLAUDE.md)

## 🔧 Gradle 태스크

```bash
# 백엔드만 빌드
./gradlew clean build -x test

# 프론트엔드 + 백엔드 통합 빌드
./gradlew buildAll

# 개발 모드 실행 (백엔드만)
./gradlew bootRunDev

# 프론트엔드 빌드만
./gradlew buildFrontend

# 전체 클린
./gradlew clean
```

## 📝 개발 모드 vs 배포 모드

| 항목 | 개발 모드 | 배포 모드 |
|------|----------|----------|
| **프론트엔드** | 별도 포트 (3000) | 통합 (9191) |
| **백엔드** | 포트 9191 | 포트 9191 |
| **핫 리로드** | ✅ 지원 | ❌ |
| **CORS** | 허용 | 불필요 |
| **SPA 라우팅** | 비활성화 | 활성화 |
| **빌드 산출물** | 없음 | JAR 파일 |

## 🤝 기여

HatioLab 내부 프로젝트입니다.

## 📄 라이선스

Copyright © HatioLab Inc. All rights reserved.
