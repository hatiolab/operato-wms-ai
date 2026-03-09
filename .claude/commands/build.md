백엔드(`operato-wms-ai`) 빌드를 실행해줘.

## 빌드 절차

### 1. Java 버전 확인

```bash
/usr/libexec/java_home -v 18
```

Java 18이 없으면 사용자에게 알리고 중단.

### 2. 빌드 실행

다음 명령을 실행한다:

```bash
cd /Users/shortstop/Git/operato-wms-ai
JAVA_HOME=$(/usr/libexec/java_home -v 18) ./gradlew build
```

### 3. 빌드 옵션

사용자가 특정 옵션을 언급한 경우 다음 플래그를 적용:

| 상황 | 명령 |
|------|------|
| 기본 빌드 (테스트 포함) | `./gradlew build` |
| 테스트 제외 (빠른 빌드) | `./gradlew build -x test` |
| 클린 후 빌드 | `./gradlew clean build` |
| 클린 후 빌드 (테스트 제외) | `./gradlew clean build -x test` |
| Docker용 빌드 | `./gradlew build -x test --no-daemon --console=plain` |

사용자가 옵션을 명시하지 않으면 **기본 빌드**(`./gradlew build`)를 실행.

### 4. 결과 해석

#### 빌드 성공 시

```
BUILD SUCCESSFUL in Xs
```

생성된 JAR 파일 경로를 확인하고 사용자에게 알려줌:
```bash
ls -lh build/libs/*.jar
```

#### 빌드 실패 시

오류 메시지를 분석하여 원인과 해결 방법을 제시:

| 오류 패턴 | 원인 | 해결 방법 |
|-----------|------|-----------|
| `Could not find com.xxx:yyy` | 의존성 다운로드 실패 | 네트워크 확인 후 `./gradlew build --refresh-dependencies` |
| `error: cannot find symbol` | 컴파일 오류 | 오류 위치의 소스 코드 확인 |
| `Tests FAILED` | 테스트 실패 | 실패 테스트 목록과 원인 분석, 또는 `-x test`로 재시도 제안 |
| `otarepo-core not found` | 서브모듈 누락 | `ls ../otarepo-core` 확인 |
| `Could not resolve project :otarepo-core` | otarepo-core 경로 문제 | `settings.gradle` 확인 |
| `Unsupported class file major version` | Java 버전 불일치 | `JAVA_HOME` 설정 확인 |

빌드 완료 후 성공/실패 여부와 주요 결과를 요약해서 알려줘.
