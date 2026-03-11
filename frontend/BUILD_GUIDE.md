# 프론트엔드 빌드 가이드

## 🐛 **Lerna 모노레포 의존성 문제**

### 문제
- `operato-wes`가 `@operato-app/metapage`를 참조
- 실제 로컬 패키지명은 `@operato-app/metapage`
- Yarn이 npm registry에서 찾으려고 시도 → 실패

### 해결책
Lerna가 로컬 의존성을 먼저 빌드하도록 `yarn build` 실행 필요

---

## 🔧 **Gradle 빌드 프로세스** (수정됨)

```
1. yarnInstall
   └─> yarn install --frozen-lockfile
       (이미 node_modules 있으면 스킵)

2. lernaBootstrap
   └─> yarn run build
       └─> Lerna가 모든 패키지 빌드
           └─> 로컬 의존성(@operato-app/metapage 등) 해결
           └─> dist-server/ 생성

3. buildFrontend
   └─> yarn workspace @operato-app/operato-wes run build:app
       └─> dist-app/ 생성 (배포용)

4. copyFrontendDist
   └─> dist-app/ → src/main/resources/static/
```

---

## 📝 **수동 빌드 (문제 발생 시)**

### 방법 1: 기존 node_modules 활용
```bash
cd frontend

# 이미 설치되어 있다면 이 단계 스킵
# yarn install

# Lerna 전체 빌드
yarn build

# dist-app 빌드
yarn workspace @operato-app/operato-wes run build:app

# 결과 확인
ls -la packages/operato-wes/dist-app
```

### 방법 2: 클린 빌드
```bash
cd frontend

# 클린
rm -rf node_modules packages/*/dist-* packages/*/node_modules

# 의존성 설치
yarn install

# 전체 빌드
yarn build
yarn workspace @operato-app/operato-wes run build:app
```

---

## ✅ **Gradle 빌드 테스트**

```bash
# 프론트엔드만 빌드
./gradlew buildFrontend

# 전체 빌드
./gradlew buildAll
```

---

## ⚠️ **주의사항**

1. **첫 빌드는 시간이 오래 걸립니다**
   - Lerna bootstrap: ~5분
   - dist-app 빌드: ~3분

2. **기존 node_modules 활용**
   - 이미 설치된 node_modules가 있으면 Gradle이 자동으로 스킵
   - 강제 재설치: `rm -rf frontend/node_modules`

3. **로컬 패키지 이름 불일치**
   - 원본 프로젝트에서 이미 해결된 문제
   - 기존 빌드 방식(`yarn build`) 그대로 사용
