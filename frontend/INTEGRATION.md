# 프론트엔드 통합 가이드

## 통합 아키텍처

프론트엔드(`operato-wms-app`)는 `frontend/` 디렉토리에 통합되어 있으며, 배포 방식에 따라 다르게 서빙됩니다.

### 개발 모드 (분리 실행)

```
┌─────────────────────┐        ┌─────────────────────┐
│ 프론트엔드 (Koa BFF) │        │ 백엔드 (Spring Boot)│
│   localhost:5907    │───────▶│   localhost:9191    │
│   config.dev.js     │ REST   │   SPA disabled      │
└─────────────────────┘        └─────────────────────┘
```

### 운영 모드 A: Nginx Docker (권장)

```
                    ┌───────────────────┐
                    │      Nginx        │ :80
                    │  /* → static      │
                    │  /rest/* → proxy  │
                    └────────┬──────────┘
                             │ :9191 (내부)
                    ┌────────▼──────────┐
                    │   Spring Boot     │
                    │  REST API only    │
                    │  SPA disabled     │
                    └───────────────────┘
```

### 운영 모드 B: 통합 JAR (선택적)

```
┌─────────────────────────┐
│    Spring Boot (9191)   │
│  ┌───────────────────┐  │
│  │ static/ (dist-app)│  │
│  │  → SpaController  │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │   REST API (/rest)│  │
│  └───────────────────┘  │
└─────────────────────────┘
```

---

## 빌드 산출물

```
frontend/packages/operato-wes/
├── dist-server/    ← 서버 빌드 (TypeScript → JS, Lerna 빌드 시 생성)
├── dist-client/    ← 클라이언트 빌드 (TypeScript → JS)
└── dist-app/       ← 배포용 Webpack 번들 (build:app 시 생성)
                       → src/main/resources/static/ 으로 복사됨
```

---

## Gradle 빌드 연동

`build.gradle`에 정의된 태스크 체인 (조건부 실행):

```
yarnInstall
│  yarn install --frozen-lockfile
│  (node_modules가 이미 있으면 스킵)
│
└─> lernaBootstrap
    │  yarn run build
    │  (Lerna가 모든 패키지 빌드 → 로컬 의존성 해결, dist-server/ 생성)
    │
    └─> buildFrontend
        │  yarn workspace @operato-app/operato-wes run build:app
        │  (Webpack 번들 → dist-app/ 생성)
        │
        └─> copyFrontendDist
            │  dist-app/ → src/main/resources/static/
            │
            └─> processResources / bootJar  ← 조건부 의존성
                (frontend/ 존재 && SKIP_FRONTEND 미설정 시에만 실행)
                (Docker 빌드 시 자동 스킵)
```

**조건부 실행 로직**:
```groovy
if (file('frontend/package.json').exists() && !System.getenv('SKIP_FRONTEND')) {
    processResources { dependsOn copyFrontendDist }
    bootJar { dependsOn copyFrontendDist }
}
```

### 주요 Gradle 태스크

| 태스크 | 설명 | 명령 |
|--------|------|------|
| `buildAll` | 프론트엔드 + 백엔드 전체 빌드 | `./gradlew buildAll -x test` |
| `buildFrontend` | 프론트엔드만 빌드 | `./gradlew buildFrontend` |
| `bootRunDev` | 백엔드만 실행 (개발 모드) | `./gradlew bootRunDev` |
| `clean` | 전체 클린 (프론트엔드 산출물 포함) | `./gradlew clean` |

---

## Spring Boot 연동

### SPA 라우팅 (SpaController)

`operato.wms.spa.enabled` 설정으로 SPA 라우팅을 제어합니다.

| 환경 | 값 | 동작 |
|------|-----|------|
| 기본 (`application.properties`) | `false` | Nginx가 SPA 라우팅 처리 (Docker 배포) |
| 개발 (`application-dev.properties`) | `false` | 프론트엔드는 별도 포트(5907)에서 실행 |
| 통합 JAR 배포 시 | `true`로 변경 필요 | `static/` 파일 서빙 + SPA 라우팅 활성화 |

### CORS 설정 (개발 모드)

`application-dev.properties.template`:
```properties
spring.web.cors.allowed-origins=http://localhost:5907,http://127.0.0.1:5907
```

---

## 개발 vs 운영 비교

| 항목 | 개발 모드 | 운영 (Nginx Docker) | 운영 (통합 JAR) |
|------|----------|-------------------|----------------|
| 프론트엔드 | 별도 포트 5907 (Koa BFF) | Nginx :80 (정적 파일) | Spring Boot :9191 (static/) |
| 백엔드 | 포트 9191 | expose :9191 (내부만) | 포트 9191 (또는 9191) |
| SPA 라우팅 | 비활성화 | Nginx가 처리 | SpaController 활성화 |
| CORS | 허용 (localhost:5907) | 불필요 (Nginx 프록시) | 불필요 (동일 오리진) |
| HMR | 지원 (serve:dev) | 미지원 | 미지원 |
| 빌드 필요 | 없음 (개발 서버) | `docker compose build` | `./gradlew buildAll` |
| 프론트엔드 독립 배포 | N/A | ✅ 가능 | ❌ 불가 (백엔드 재빌드) |
| 보안 | 개발 전용 | ✅ 백엔드 미노출 | ⚠️ 백엔드 외부 노출 |

---

## 참고 문서

- [빌드 가이드](BUILD_GUIDE.md) — 빌드 방법 상세
- [백엔드 Docker 가이드](../docs/operations/backend-docker.md) — Nginx + 백엔드 통합 Docker 배포 (권장)
- [프론트엔드 Docker 가이드](../docs/operations/frontend-docker.md) — 프론트엔드 standalone Docker 배포 (레거시)
