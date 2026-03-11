# .claude/ 디렉토리 가이드

Claude Code 프로젝트 설정 및 커스텀 명령(skill) 모음.

---

## 디렉토리 구조

```
.claude/
├── settings.json       # Claude Code 프로젝트 설정
├── commands/           # 커스텀 slash commands (skills)
│   ├── build.md        # /build — Gradle 빌드 실행
│   ├── commit.md       # /commit — git commit 생성
│   └── log.md          # /log — 작업 로그 기록
└── README.md           # 이 파일
```

---

## settings.json 상세 설명

### 전체 구조

```json
{
  "$schema": "...",
  "permissions": { "allow": [], "deny": [], "additionalDirectories": [] },
  "env": {},
  "language": "korean"
}
```

---

### permissions.allow — 자동 승인 도구

사용자 확인 없이 자동으로 실행이 허용되는 명령 목록.

| 패턴 | 설명 |
|------|------|
| `Bash(./gradlew *)` | Gradle 빌드/테스트/태스크 전체 허용 |
| `Bash(git status)` | 작업 트리 상태 확인 |
| `Bash(git diff *)` | 변경 내용 비교 |
| `Bash(git log *)` | 커밋 이력 조회 |
| `Bash(git add *)` | 파일 스테이징 |
| `Bash(git commit *)` | 커밋 생성 |
| `Bash(git branch *)` | 브랜치 목록/생성/삭제 |
| `Bash(git checkout *)` | 브랜치/파일 체크아웃 |
| `Bash(git stash *)` | 변경사항 임시 저장 |
| `Bash(docker-compose *)` | 컨테이너 구성 관리 |
| `Bash(docker ps *)` | 실행 중인 컨테이너 목록 |
| `Bash(docker logs *)` | 컨테이너 로그 조회 |

---

### permissions.deny — 영구 차단 도구

위험하거나 민감한 작업으로, 사용자가 명시적으로 요청해도 실행이 거부됨.

| 패턴 | 설명 | 차단 이유 |
|------|------|----------|
| `Bash(git push --force *)` | 강제 푸시 | 원격 이력 파괴 위험 |
| `Bash(git reset --hard *)` | 하드 리셋 | 로컬 변경사항 전체 삭제 |
| `Bash(rm -rf *)` | 재귀 강제 삭제 | 복구 불가 삭제 위험 |
| `Read(src/main/resources/application-dev.properties)` | 개발 환경설정 읽기 | DB 접속정보·비밀키 포함 |
| `Read(src/main/resources/application-prod.properties)` | 운영 환경설정 읽기 | DB 접속정보·비밀키 포함 |
| `Read(.env)` | 환경변수 파일 읽기 | API 키 등 민감 정보 포함 |

---

### permissions.additionalDirectories — 추가 작업 디렉토리

Claude Code가 기본 워킹 디렉토리(`operato-wms-ai`) 외에 접근할 수 있는 디렉토리.

| 경로 | 설명 |
|------|------|
| `frontend` | 프론트엔드 (Things Factory 기반) |
| `../otarepo-core` | 공유 코어 라이브러리 |

> 이 설정이 없으면 Claude가 관련 저장소의 파일을 읽거나 수정할 때 권한 오류가 발생함.

---

### env — 환경변수

Claude Code 세션 전체에 적용되는 환경변수.

| 변수 | 값 | 설명 |
|------|----|------|
| `JAVA_HOME` | `/Library/Java/JavaVirtualMachines/temurin-18.jdk/Contents/Home` | Java 18 경로. `./gradlew` 실행 시 사용. 변경 시 실제 경로 확인 필요 |
| `CLAUDE_CODE_AUTOCOMPACT_PCT_OVERRIDE` | `70` | 컨텍스트가 70% 찼을 때 자동 압축. 기본값(95%) 대비 토큰 절감 |
| `DISABLE_NON_ESSENTIAL_MODEL_CALLS` | `1` | 요약·분류 등 부가적 모델 호출 비활성화. 토큰 절감 |

> JAVA_HOME 경로 확인: `sudo /usr/libexec/java_home -v 18`

---

### language

```json
"language": "korean"
```

Claude의 응답 언어를 한국어로 고정. 이 설정이 없으면 사용자 입력 언어에 따라 자동 감지됨.

---

## 관련 파일

- [CLAUDE.md](../CLAUDE.md) — 프로젝트 전체 지침 (코딩 컨벤션, 아키텍처 등)
- [../.claudeignore](../.claudeignore) — Claude가 읽지 않을 파일 목록 (토큰 절감)
