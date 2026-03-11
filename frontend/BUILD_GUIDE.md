# 프론트엔드 빌드 가이드

## 프로젝트 구조

```
frontend/
├── package.json          ← 루트 (Yarn Workspaces + Lerna)
├── lerna.json            ← Lerna 설정 (v7.0.50)
└── packages/
    ├── metapage/                      ← @operato-app/metapage
    ├── operato-logis-system-ui/       ← @operato-app/operato-logis-system-ui
    ├── operatofill/                   ← @operato-app/operatofill
    └── operato-wes/                   ← @operato-app/operato-wes (메인 앱)
        ├── client/                    ← 클라이언트 소스 (페이지, 라우트)
        ├── server/                    ← BFF 서버 소스 (Koa, TypeORM)
        ├── config/
        │   ├── config.development.js  ← 개발 환경 설정 (git 미추적)
        │   └── config.production.js   ← 운영 환경 설정 (포트 5907)
        ├── Dockerfile                 ← 프론트엔드 단독 Docker 빌드
        ├── dist-server/               ← 서버 빌드 산출물
        ├── dist-client/               ← 클라이언트 빌드 산출물
        └── dist-app/                  ← 배포용 Webpack 번들 (→ static/)
```

### 로컬 패키지 의존성

`operato-wes`는 같은 모노레포의 로컬 패키지를 참조합니다.
**반드시 `yarn build`(Lerna 전체 빌드)를 먼저 실행**해야 로컬 의존성이 해결됩니다.

```
operato-wes
  ├── @operato-app/metapage
  ├── @operato-app/operato-logis-system-ui
  └── @operato-app/operatofill
```

---

## 빌드 방법

### 1. Gradle 통합 빌드 (권장)

프로젝트 루트에서 실행합니다. 프론트엔드 빌드 후 `src/main/resources/static/`에 복사하여 백엔드 JAR에 포함됩니다.

```bash
# 전체 빌드 (프론트엔드 + 백엔드 → 단일 JAR)
./gradlew buildAll -x test

# 또는 빌드 스크립트 사용
./scripts/build.sh
```

**Gradle 빌드 태스크 흐름**:

```
yarnInstall                         ← yarn install --frozen-lockfile (node_modules 없을 때만)
  └─> lernaBootstrap                ← yarn run build (Lerna 전체 빌드, 로컬 의존성 해결)
        └─> buildFrontend           ← yarn workspace @operato-app/operato-wes run build:app
              └─> copyFrontendDist  ← dist-app/ → src/main/resources/static/
                    └─> build       ← Spring Boot JAR 생성
```

산출물: `build/libs/operato-wms-ai.jar`

### 2. 프론트엔드만 빌드

```bash
cd frontend

# Lerna 전체 빌드 (로컬 패키지 의존성 해결 필수)
yarn build

# 배포용 번들 빌드 (Webpack)
yarn workspace @operato-app/operato-wes run build:app

# 결과 확인
ls -la packages/operato-wes/dist-app/
```

### 3. 클린 빌드

```bash
# Gradle 클린 (프론트엔드 산출물 포함)
./gradlew clean

# 또는 수동 클린
cd frontend
rm -rf node_modules packages/*/dist-* packages/*/node_modules

# 재설치 및 빌드
yarn install
yarn build
yarn workspace @operato-app/operato-wes run build:app
```

---

## 개발 모드

### 통합 실행 (권장)

```bash
./scripts/dev.sh
```

### 개별 실행

```bash
# 터미널 1: 백엔드 (포트 9191)
./gradlew bootRunDev

# 터미널 2: 프론트엔드 (포트 5907)
cd frontend && yarn wms:dev
```

`yarn wms:dev`는 내부적으로 `yarn build` → `yarn workspace @operato-app/operato-wes serve:dev` 순으로 실행합니다.

- 프론트엔드: http://localhost:5907
- 백엔드 API: http://localhost:9191/rest
- 포트 설정: `packages/operato-wes/config/config.development.js`

### 개발 서버 종료

```bash
cd frontend/packages/operato-wes
yarn stop:dev
```

---

## Docker 배포

### Nginx 기반 배포 (운영 환경 권장)

프로젝트 루트에서 Nginx + 백엔드 통합 스택을 Docker로 배포합니다.

```bash
cd .. # 프로젝트 루트로 이동

# Nginx + 백엔드 전체 스택 빌드
docker compose build

# 실행
docker compose up -d

# 접속: http://localhost
# 프론트엔드는 Nginx 이미지 안에서 빌드되어 정적 파일로 서빙됩니다
```

**장점**:
- ✅ 프론트엔드/백엔드 독립 배포 (프론트엔드 변경 시 백엔드 재시작 불필요)
- ✅ 정적 파일 서빙 최적화 (Nginx gzip, 캐시 제어)
- ✅ 백엔드 포트 외부 미노출 (보안 강화)

자세한 내용은 [백엔드 Docker 가이드](../docs/operations/backend-docker.md) 참조.

### Standalone 프론트엔드 Docker (선택적/레거시)

프론트엔드를 별도 Node.js 컨테이너로 배포할 경우:

```bash
cd frontend/packages/operato-wes

# 클라이언트 빌드 + Docker 이미지 생성
yarn docker

# Docker 로컬 테스트 (localhost:4000 → 컨테이너:5907)
yarn docker:run

# Docker Hub 푸시
yarn docker:push
```

이미지: `hatiolab/operato-wes:latest` / `hatiolab/operato-wes:7.0.49`

자세한 내용은 [프론트엔드 Docker 가이드](../docs/operations/frontend-docker.md) 참조.

---

## 주의사항

1. **첫 빌드는 시간이 오래 걸립니다** — Lerna 빌드 ~5분, dist-app 빌드 ~3분
2. **기존 node_modules 활용** — Gradle `yarnInstall`은 이미 설치된 경우 자동 스킵
3. **`yarn build` 필수** — `build:app` 전에 반드시 Lerna 전체 빌드를 실행해야 로컬 패키지 의존성이 해결됨
4. **config.development.js는 git 미추적** — `config.development.js.template`을 복사하여 사용
