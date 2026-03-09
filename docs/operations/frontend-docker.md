# Operato WMS 프론트엔드 Docker 빌드 및 실행 가이드

## 개요

`operato-wms-app`은 Things Factory 프레임워크 기반의 Lerna 모노레포 프로젝트로,
`hatiolab/operato-env:latest` 베이스 이미지를 사용하여 Docker 컨테이너로 배포합니다.

### 관련 파일

| 파일 | 위치 | 설명 |
|------|------|------|
| `Dockerfile` | `operato-wms-app/` | 단일 스테이지 빌드 정의 |
| `packages/operato-wms-ui/package.json` | `operato-wms-app/` | Docker 빌드/실행 스크립트 |

---

## 1. 사전 요구사항

| 항목 | 최소 버전 | 확인 명령 |
|------|----------|----------|
| Docker | 24.x 이상 | `docker --version` |
| Node.js | 18.x 이상 | `node --version` |
| Yarn | 1.x (Classic) | `yarn --version` |
| 디스크 공간 | 3GB 이상 | 빌드 캐시 포함 |

---

## 2. Dockerfile 구조

```
Stage 1: 단일 스테이지 (hatiolab/operato-env:latest)
  ├── COPY . .                                           ← 전체 모노레포 복사
  ├── yarn install                                       ← 의존성 설치
  ├── yarn clean                                         ← 이전 빌드 결과 정리
  ├── yarn build                                         ← 서버 사이드 TypeScript 빌드
  ├── yarn workspace @things-factory/operato-wms-app     ← 클라이언트 번들 빌드
  │     run build:client
  └── EXPOSE 5907
      CMD: yarn workspace @things-factory/operato-wms-app run serve
```

**베이스 이미지**: `hatiolab/operato-env:latest` — Node.js, Yarn, Things Factory CLI 등 빌드 환경이 사전 설치된 이미지

---

## 3. 빌드

### 3-1. 스크립트를 이용한 빌드 (권장)

`packages/operato-wms-ui/package.json`에 정의된 Docker 스크립트를 사용합니다.

```bash
cd operato-wms-app/packages/operato-wms-ui

# 클라이언트 빌드 + Docker 이미지 빌드
yarn docker

# Docker 이미지 빌드만 (클라이언트 빌드 없이)
yarn docker:only
```

**`yarn docker`**: `build:app` (Webpack 클라이언트 번들 빌드) → `things-factory-dockerize` 순으로 실행
**`yarn docker:only`**: 이미 빌드된 결과물로 Docker 이미지만 생성

### 3-2. 직접 빌드

```bash
cd operato-wms-app

# 이미지 이름: hatiolab/wms-client:latest
docker build -t hatiolab/wms-client:latest .

# 버전 태그 포함
docker build \
  -t hatiolab/wms-client:latest \
  -t hatiolab/wms-client:0.0.8 \
  .
```

### 3-3. 플랫폼 지정 빌드 (Apple Silicon → 배포 서버)

```bash
# linux/amd64 플랫폼 명시 (Things Factory 스크립트 기본값)
docker buildx build \
  --platform linux/amd64 \
  -t hatiolab/wms-client:latest \
  -t hatiolab/wms-client:0.0.8 \
  .
```

> ⚠️ Apple Silicon(M1/M2/M3) Mac에서 빌드 시 배포 서버(amd64)와 아키텍처가 다를 수 있습니다.
> `--platform linux/amd64` 옵션으로 크로스 컴파일하세요.

---

## 4. 실행

### 4-1. 운영 환경 실행

컨테이너는 포트 **5907**에서 Koa BFF 서버를 실행합니다.

```bash
# 기본 실행
docker run -d \
  --name wms-client \
  -p 5907:5907 \
  --restart unless-stopped \
  hatiolab/wms-client:latest
```

### 4-2. 로컬 테스트 실행 (스크립트)

```bash
cd operato-wms-app/packages/operato-wms-ui

# 포트 4000:3000 매핑으로 실행
yarn docker:run
```

```bash
# 직접 실행 (동일)
docker run --platform linux/amd64 -p 4000:3000 hatiolab/wms-client:latest
```

브라우저에서 `http://localhost:4000` 으로 접근합니다.

### 4-3. 환경변수 주입

백엔드 API URL 등을 환경변수로 주입할 수 있습니다.

```bash
docker run -d \
  --name wms-client \
  -p 5907:5907 \
  -e NODE_ENV=production \
  -e API_BASE_URL=http://backend-host:9501 \
  hatiolab/wms-client:latest
```

---

## 5. 기동 상태 확인

```bash
# 컨테이너 상태 확인
docker ps | grep wms-client

# 실시간 로그 확인
docker logs -f wms-client

# 기동 확인
curl http://localhost:5907
```

---

## 6. 중지 및 정리

```bash
# 컨테이너 중지
docker stop wms-client

# 컨테이너 삭제
docker rm wms-client

# 중지 + 삭제 한번에
docker rm -f wms-client

# 이미지 삭제
docker rmi hatiolab/wms-client:latest
```

---

## 7. Docker Hub 푸시

```bash
cd operato-wms-app/packages/operato-wms-ui

# latest + 버전 태그 동시 푸시
yarn docker:push
```

```bash
# 직접 푸시
docker image push hatiolab/wms-client:latest
docker image push hatiolab/wms-client:0.0.8
```

> ⚠️ Docker Hub 로그인이 필요합니다: `docker login`

---

## 8. 이미지 정보

| 항목 | 값 |
|------|-----|
| 베이스 이미지 | `hatiolab/operato-env:latest` |
| 이미지 이름 | `hatiolab/wms-client` |
| 최신 태그 | `latest` |
| 버전 태그 | `0.0.8` (package.json `version` 기준) |
| 서비스 포트 | `5907` (운영), `3000` (로컬 테스트 내부) |
| 노출 포트 | `5907` |

---

## 9. 풀스택 연동 (백엔드 + 프론트엔드)

백엔드(`operato-wms-ai`)와 프론트엔드를 함께 운영할 경우:

```
백엔드: http://localhost:9501  (operato-wms-ai Docker)
프론트엔드: http://localhost:5907  (wms-client Docker)
```

프론트엔드 BFF(Koa 서버)는 `/api/*` 요청을 백엔드로 프록시합니다. 운영 환경에서는 Nginx 등 리버스 프록시를 앞에 두는 것을 권장합니다.

---

## 10. 개발 서버 (Docker 없이 로컬 개발)

Docker 없이 로컬 개발 환경에서 실행하려면:

```bash
cd operato-wms-app

# 의존성 설치
yarn install

# 개발 서버 실행 (포트 3000 + 3001)
cd packages/operato-wms-ui
yarn serve:dev

# 개발 서버 종료
yarn stop:dev
```

| 포트 | 용도 |
|------|------|
| 3000 | BFF 서버 (Koa) |
| 3001 | Webpack Dev Server (HMR) |

---

## 11. 트러블슈팅

### 빌드 실패: 의존성 설치 오류

```
error An unexpected error occurred: "https://registry.yarnpkg.com/..."
```

**해결**:
```bash
# 캐시 삭제 후 재설치
yarn cache clean
yarn install
```

---

### 빌드 실패: Webpack 메모리 부족

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**해결**:
```bash
# Node.js 힙 메모리 증가
NODE_OPTIONS="--max-old-space-size=4096" yarn docker
```

---

### Apple Silicon에서 실행 오류

```
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)
```

**해결**: `--platform linux/amd64` 옵션을 추가하거나, ARM용 이미지를 별도로 빌드하세요.

```bash
docker run --platform linux/amd64 -p 5907:5907 hatiolab/wms-client:latest
```

---

### 컨테이너 실행 후 페이지 접근 불가

```bash
# 로그 확인
docker logs wms-client

# 포트 바인딩 확인
docker inspect wms-client | grep -A 10 PortBindings

# 포트 점유 확인
lsof -i :5907
```
