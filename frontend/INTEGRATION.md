# 프론트엔드 통합 가이드

## 📁 빌드 산출물 위치

Things Factory 프로젝트의 빌드는 다음과 같은 산출물을 생성합니다:

```
packages/operato-wes/
├── dist-client/    # 클라이언트 빌드 (webpack)
├── dist-server/    # 서버 빌드 (TypeScript)
└── dist-app/       # 통합 앱 빌드 (배포용)
```

## 🔧 Gradle 빌드 연동

현재 Gradle 설정은 다음과 같이 동작합니다:

1. **yarnInstall**: `yarn install` 실행
2. **buildFrontend**: `yarn build` 실행
   - Lerna가 모든 패키지의 `build` 스크립트 실행
   - TypeScript 컴파일 (서버 사이드)
3. **copyFrontendDist**: 빌드 산출물을 `src/main/resources/static/`로 복사

## ⚙️ 배포용 빌드 조정

### 옵션 1: dist-app 사용 (권장)

운영 배포 시 `dist-app`을 사용하려면 Gradle 설정 수정:

```gradle
// build.gradle의 buildFrontend 수정
task buildFrontend(type: com.github.gradle.node.yarn.task.YarnTask) {
    dependsOn yarnInstall
    args = ['workspace', '@operato-app/operato-wes', 'run', 'build:app']

    outputs.dir('frontend/packages/operato-wes/dist-app')
}

// copyFrontendDist 수정
task copyFrontendDist(type: Copy) {
    dependsOn buildFrontend

    from 'frontend/packages/operato-wes/dist-app'
    into 'src/main/resources/static'

    onlyIf {
        file('frontend/packages/operato-wes/dist-app').exists()
    }
}
```

### 옵션 2: dist-client 사용

클라이언트 빌드만 사용하려면:

```gradle
task buildFrontend(type: com.github.gradle.node.yarn.task.YarnTask) {
    dependsOn yarnInstall
    args = ['run', 'build:client']

    outputs.dir('frontend/packages/operato-wes/dist-client')
}
```

## 🚀 현재 상태

- ✅ 프론트엔드 복사 완료
- ✅ 기본 Gradle 빌드 설정 완료
- ⚠️ 빌드 산출물 경로 확인 필요
- ⚠️ 실제 빌드 테스트 필요

## 📝 다음 단계

1. **빌드 산출물 경로 확인**
   ```bash
   cd frontend
   yarn build
   # 어디에 산출물이 생성되는지 확인
   find . -name "dist*" -type d
   ```

2. **Gradle 설정 조정** (필요시)
   - `build.gradle`의 경로 수정

3. **통합 빌드 테스트**
   ```bash
   ./gradlew clean buildAll
   ```

4. **Spring Boot 실행 테스트**
   ```bash
   java -jar build/libs/operato-wms-ai.jar
   # http://localhost:9191 접속하여 프론트엔드 확인
   ```
