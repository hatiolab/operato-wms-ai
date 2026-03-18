# .claude/ 디렉토리 가이드

Claude Code 프로젝트 설정 및 커스텀 명령(skill) 모음.

---

## 디렉토리 구조

```
.claude/
├── settings.json       # Claude Code 프로젝트 설정
├── commands/           # 커스텀 slash commands (skills)
│   ├── build.md                  # /build — Gradle 빌드 실행
│   ├── commit.md                 # /commit — git commit 생성
│   ├── log.md                    # /log — 작업 로그 기록
│   ├── create_module.md          # /create_module — 새 모듈 패키지 구조 자동 생성
│   ├── translate.md              # /translate — terminologies 미번역 항목 번역
│   ├── add_terminology.md        # /add_terminology — terminologies 용어 등록 (모든 도메인/언어)
│   ├── clear_frontend_cache.md   # /clear_frontend_cache — 프론트엔드 번역 캐시 삭제
│   ├── entity_meta_by_entity.md  # /entity_meta_by_entity — Entity 메타데이터 자동 등록 + 다국어 번역
│   ├── code_by_entity.md         # /code_by_entity — Entity 공통코드 대상 필드 자동 식별·일괄 등록
│   └── code_by_entity_column.md  # /code_by_entity_column — Entity 특정 필드 공통코드 등록
└── README.md           # 이 파일
```

---

## Custom Skills (commands/)

프로젝트 전용 slash command 모음. 각 `.md` 파일은 Claude에게 특정 작업을 수행하도록 지시하는 프롬프트입니다.

### 모듈 관리

#### `/create_module <moduleName>`
새로운 WMS 모듈 패키지 구조를 자동 생성합니다.
- **생성 패키지**: config, entity, query/store, rest, service, util, web/initializer
- **생성 파일**: ModuleProperties, QueryStore, Initializer, Util, Constants, ConfigConstants
- **예시**: `/create_module stock`
- **결과**: operato.wms.stock 패키지 전체 구조 + properties 파일

### 메타데이터 관리

#### `/entity_meta_by_entity <EntityName>`
Entity 클래스를 분석하여 UI 메타데이터를 자동 등록하고 다국어 번역까지 완료합니다.
- **등록 대상**: `entities`, `entity_columns`, `terminologies`, `common_codes`, `common_code_details`
- **자동 번역**: en/ja/zh locale의 미번역 항목 자동 번역
- **예시**: `/entity_meta_by_entity VasBom`
- **결과**: 5개 도메인 × 모든 테이블 메타데이터 + 다국어 번역 완료

#### `/translate`
terminologies 테이블의 미번역 항목(`display = category || '.' || name`)을 찾아 locale별로 번역합니다.
- **대상 언어**: ko(한국어), en(영어), ja(일본어), zh(중국어)
- **WMS 용어**: 물류/창고 도메인 전문 용어를 정확히 반영

#### `/add_terminology <category> <name> <display>`
terminologies 테이블에 새로운 용어를 등록합니다.
- **자동 등록**: 5개 도메인 × 4개 언어 = 20건 자동 생성
- **자동 번역**: WMS 전문 용어 딕셔너리 기반으로 en/ja/zh 자동 번역
- **예시**: `/add_terminology menu vas-home 유통가공`
- **결과**: ko(유통가공), en(VAS), ja(流通加工), zh(流通加工)

#### `/clear_frontend_cache`
프론트엔드 번역 캐시를 삭제합니다.
- **대상**: `frontend/packages/operato-wes/cache/translations/` 디렉토리 전체
- **용도**: terminologies 업데이트 후 프론트엔드에 반영되지 않을 때
- **효과**: 다음 실행 시 DB에서 최신 번역 자동 재로드

#### `/code_by_entity <EntityName>`
Entity 클래스에서 CommonCode 대상 필드를 자동 식별하여 공통코드를 일괄 등록합니다.
- **자동 인식**: Javadoc에 슬래시(`/`) 구분 허용값이 있는 필드
- **등록**: `common_codes` (마스터) + `common_code_details` (상세 값)

#### `/code_by_entity_column <EntityName> <fieldName>`
Entity의 특정 필드에 대한 공통코드를 수동으로 등록합니다.
- **용도**: `/code_by_entity`가 놓친 필드를 개별 등록

### 개발 워크플로우

#### `/build [옵션]`
백엔드 Gradle 빌드를 실행합니다.
- **옵션**: 기본 / `-x test` (테스트 제외) / `clean` / `docker`
- **예시**: `/build -x test` — 테스트 없이 빠른 빌드

#### `/commit [메시지]`
현재 대화에서 작업한 내용을 git commit으로 기록합니다.
- **메시지**: 한국어 커밋 메시지 자동 생성
- **Co-Authored-By**: Claude가 기여자로 자동 추가
- **푸시**: 명시적 요청 시에만 실행

#### `/log`
오늘 작업 내용을 `.ai/logs/YYYY-MM-DD.md` 파일에 마크다운으로 기록합니다.
- **용도**: 일일 작업 이력 관리

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
