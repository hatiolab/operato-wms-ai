VSCode에서 백엔드 실행 시 `classpath:WEB-INF/logback-spring.xml` 오류를 수정해줘.

## 증상

```
Logging system failed to initialize using configuration from 'classpath:WEB-INF/logback-spring.xml'
java.io.FileNotFoundException: class path resource [WEB-INF/logback-spring.xml] cannot be resolved to URL
```

## 원인

`.classpath` 파일의 `src/main/resources` 항목에 `excluding="**"` 속성이 설정되면,
VSCode Java 확장이 리소스 파일을 `bin/main/`에 복사하지 않는다.

VSCode 실행 시 클래스패스는 `bin/main/`(컴파일 결과)만 사용하므로
`src/main/resources/WEB-INF/logback-spring.xml`이 클래스패스에 존재하지 않아 오류 발생.

Gradle 프로젝트 동기화(Refresh) 시 Buildship이 `.classpath`를 재생성하면서
`excluding="**"`가 다시 추가될 수 있어 반복적으로 발생한다.

## 처리 절차

### 1. 현재 상태 확인

`.classpath` 파일에서 `src/main/resources` 항목을 확인한다.

```bash
grep "src/main/resources" .classpath
```

`excluding="**"` 가 있으면 수정 필요. 없으면 다른 원인이므로 사용자에게 알린다.

### 2. excluding="**" 제거

`.classpath` 파일에서 `src/main/resources` 항목의 `excluding="**"` 속성을 제거한다.

**변경 전:**
```xml
<classpathentry excluding="**" kind="src" output="bin/main" path="src/main/resources">
```

**변경 후:**
```xml
<classpathentry kind="src" output="bin/main" path="src/main/resources">
```

Read 도구로 파일을 먼저 읽은 뒤 Edit 도구로 수정한다.

### 3. 수정 결과 확인

```bash
grep "src/main/resources" .classpath
```

`excluding="**"` 가 제거됐는지 확인한다.

### 4. application.properties 확인 및 정리

이 오류를 해결하려고 `application.properties`에 `logging.config` 설정을 추가했다면 제거한다.

```bash
grep "logging.config" src/main/resources/application.properties
```

`logging.config=classpath:WEB-INF/logback-spring.xml` 라인이 있으면 제거한다.
(otarepo-core가 이미 동일한 설정을 가지고 있어 중복이며, 불필요한 설정임)

### 5. 결과 안내

수정 완료 후 사용자에게 다음을 안내한다:

```
✅ .classpath 수정 완료

VSCode에서 아래 중 하나를 실행해주세요:
  - Cmd+Shift+P → "Java: Clean Java Language Server Workspace"
  - 또는 VSCode Reload Window (Cmd+Shift+P → "Reload Window")

⚠️  주의: Gradle 프로젝트 동기화(Refresh Gradle Project) 시
    .classpath가 재생성되어 같은 증상이 재발할 수 있습니다.
    재발 시 /fix_classpath 를 다시 실행하세요.
```
