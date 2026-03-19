# Operato WMS 문서 디렉토리

> 최종 업데이트: 2026-03-18

Operato WMS 프로젝트의 전체 문서를 체계적으로 관리하는 디렉토리입니다.

---

## 📁 디렉토리 구조

```
docs/
├── overview/                      # 프로젝트 개요
│   └── overview.md                    - 프로젝트 개요, 비전, 목표
│
├── requirement/                   # 요구사항 정의
│   └── requirements.md                - 기능/비기능 요구사항, 업무 도메인
│
├── architecture/                  # 시스템 아키텍처
│   └── architecture.md                - 시스템 구조, 기술 스택, 배포 구성
│
├── design/                        # 설계 문서
│   ├── database-specification.md      - DB 스키마, ERD, 테이블 정의
│   ├── vas-table-design.md            - VAS(유통가공) 테이블 설계
│   ├── vas-screen-design.md           - VAS(유통가공) 화면 설계
│   ├── rwa-table-design.md            - RWA(반품) 테이블 설계
│   └── rwa-screen-design.md           - RWA(반품) 화면 설계
│
├── development/                   # 개발 가이드
│   ├── backend-dev-guide.md           - 백엔드 서비스 개발 가이드 (메타데이터, 엔티티)
│   └── frontend-dev-guide.md          - 프론트엔드 개발 가이드 (ServiceUtil, UiUtil, 컨벤션)
│
├── implementation/                # 구현 관련 문서
│   ├── api-list.md                    - REST API 엔드포인트 목록 및 명세
│   └── development-environment.md     - 개발 환경 구성 가이드 (VSCode)
│
├── operations/                    # 배포 및 운영
│   ├── operations-strategy.md         - 배포 전략, 환경별 구성, 모니터링
│   ├── backend-docker.md              - 백엔드 Docker 빌드 (Nginx 통합) ⭐
│   └── frontend-docker.md             - 프론트엔드 Standalone Docker (레거시)
│
├── quality/                       # 코드 품질 분석
│   ├── backend-quality.md             - 백엔드 코드 품질 상세 분석
│   ├── backend-quality-checklist.md   - 백엔드 품질 개선 체크리스트 (P1/P2/P3)
│   ├── backend-refactoring-plan.md    - 백엔드 리팩토링 계획 및 진행 상황
│   ├── backend-testing-guide.md       - 백엔드 테스트 작성 가이드 (JUnit 5)
│   ├── frontend-quality.md            - 프론트엔드 코드 품질 상세 분석
│   ├── frontend-quality-checklist.md  - 프론트엔드 품질 개선 체크리스트
│   └── frontend-testing-guide.md      - 프론트엔드 테스트 작성 가이드 (Jest, Playwright)
│
├── roadmap/                       # 제품 로드맵
│   └── roadmap.md                     - AI 시대 제품 로드맵, 단계별 계획
│
└── README.md                      # 이 문서 (문서 디렉토리 가이드)
```

**총 문서 수**: 24개 (README 포함)

---

## 📖 문서 목록

### 1️⃣ 개요 (overview/)

| 문서 | 설명 |
|------|------|
| [overview.md](overview/overview.md) | 프로젝트 개요, 비전, 목표, 핵심 기능 |

**용도**: 프로젝트 전체 맥락 이해, 신규 참여자 온보딩

---

### 2️⃣ 요구사항 (requirement/)

| 문서 | 설명 |
|------|------|
| [requirements.md](requirement/requirements.md) | 기능 요구사항, 비기능 요구사항, 업무 도메인 정의 |

**용도**: 구현 범위 확인, 기능 추가 시 참조

---

### 3️⃣ 아키텍처 (architecture/)

| 문서 | 설명 |
|------|------|
| [architecture.md](architecture/architecture.md) | 시스템 아키텍처, 기술 스택, 배포 구성, 디렉토리 구조 |

**용도**: 전체 시스템 구조 이해, 기술적 의사결정 참조

---

### 4️⃣ 설계 (design/)

| 문서 | 설명 |
|------|------|
| [database-specification.md](design/database-specification.md) | 데이터베이스 스키마, ERD, 테이블 정의 |
| [vas-table-design.md](design/vas-table-design.md) | VAS(유통가공) 모듈 테이블 설계 |
| [vas-screen-design.md](design/vas-screen-design.md) | VAS(유통가공) 모듈 화면 설계 |
| [rwa-table-design.md](design/rwa-table-design.md) | RWA(반품) 모듈 테이블 설계 |
| [rwa-screen-design.md](design/rwa-screen-design.md) | RWA(반품) 모듈 화면 설계 |

**용도**: DB 스키마 참조, 화면 설계 참조, 모듈 개발 시 기준 문서

---

### 5️⃣ 개발 가이드 (development/)

| 문서 | 설명 |
|------|------|
| [backend-dev-guide.md](development/backend-dev-guide.md) | 백엔드 서비스 개발 가이드 (메타데이터 기반 개발, 엔티티/용어/공통코드 등록) |
| [frontend-dev-guide.md](development/frontend-dev-guide.md) | 프론트엔드 개발 가이드 (ServiceUtil, UiUtil, openPopup, snake_case 컨벤션) |

**용도**: 새 화면/API 개발 시 필수 참조, 유틸리티 사용법, 코딩 컨벤션

---

### 6️⃣ 구현 (implementation/)

| 문서 | 설명 |
|------|------|
| [api-list.md](implementation/api-list.md) | REST API 엔드포인트 목록 및 명세 |
| [development-environment.md](implementation/development-environment.md) | 로컬 개발 환경 구성 가이드 (VSCode, Nginx 미사용) |

**용도**: API 개발 및 연동, 개발 환경 설정

---

### 7️⃣ 운영 (operations/)

| 문서 | 설명 |
|------|------|
| [operations-strategy.md](operations/operations-strategy.md) | 배포 및 운영 전략, 환경별 구성, 모니터링 |
| [backend-docker.md](operations/backend-docker.md) | 백엔드 Docker 빌드 및 실행 (Nginx 통합 배포) ⭐ **권장** |
| [frontend-docker.md](operations/frontend-docker.md) | 프론트엔드 Standalone Docker 배포 (레거시) |

**용도**: 배포 가이드, 운영 환경 설정, 문제 해결

---

### 8️⃣ 품질 관리 (quality/)

| 문서 | 설명 |
|------|------|
| [backend-quality.md](quality/backend-quality.md) | 백엔드 코드 품질 상세 분석 |
| [backend-quality-checklist.md](quality/backend-quality-checklist.md) | 백엔드 품질 개선 체크리스트 (P1: 4개, P2: 5개, P3: 2개) |
| [backend-refactoring-plan.md](quality/backend-refactoring-plan.md) | 백엔드 리팩토링 계획 및 진행 상황 |
| [backend-testing-guide.md](quality/backend-testing-guide.md) | 백엔드 테스트 작성 가이드 (JUnit 5, Mockito, Spring Boot Test) |
| [frontend-quality.md](quality/frontend-quality.md) | 프론트엔드 코드 품질 상세 분석 |
| [frontend-quality-checklist.md](quality/frontend-quality-checklist.md) | 프론트엔드 품질 개선 체크리스트 (P1: 3개, P2: 4개, P3: 2개) |
| [frontend-testing-guide.md](quality/frontend-testing-guide.md) | 프론트엔드 테스트 작성 가이드 (Jest, Playwright, Lit-Element) |

**용도**: 코드 리뷰, 리팩토링 우선순위 결정 및 진행 추적, 기술 부채 관리, 테스트 작성 가이드

---

### 9️⃣ 로드맵 (roadmap/)

| 문서 | 설명 |
|------|------|
| [roadmap.md](roadmap/roadmap.md) | AI 시대 제품 로드맵, 단계별 개발 계획 |

**용도**: 장기 개발 계획, 기능 우선순위 결정

---

## 🎯 목적별 문서 가이드

### 신규 개발자 온보딩
1. [overview.md](overview/overview.md) — 프로젝트 전체 맥락 파악
2. [architecture.md](architecture/architecture.md) — 시스템 구조 이해
3. [requirements.md](requirement/requirements.md) — 업무 도메인 이해
4. [development-environment.md](implementation/development-environment.md) — 로컬 개발 환경 설정 (VSCode)
5. [backend-docker.md](operations/backend-docker.md) — Docker 배포 환경 (선택)

### 기능 개발
1. [requirements.md](requirement/requirements.md) — 요구사항 확인
2. [database-specification.md](design/database-specification.md) — DB 스키마 참조
3. [backend-dev-guide.md](development/backend-dev-guide.md) — 백엔드 개발 패턴 (메타데이터, 엔티티)
4. [frontend-dev-guide.md](development/frontend-dev-guide.md) — 프론트엔드 개발 패턴 (ServiceUtil, UiUtil)
5. [api-list.md](implementation/api-list.md) — API 명세 확인

### 배포 및 운영
1. [operations-strategy.md](operations/operations-strategy.md) — 배포 전략 수립
2. [backend-docker.md](operations/backend-docker.md) — Docker 배포 실행

### 코드 품질 개선
1. [backend-quality.md](quality/backend-quality.md) — 백엔드 코드 품질 분석 확인
2. [frontend-quality.md](quality/frontend-quality.md) — 프론트엔드 코드 품질 분석 확인
3. [backend-quality-checklist.md](quality/backend-quality-checklist.md) — 백엔드 개선 작업 체크리스트
4. [frontend-quality-checklist.md](quality/frontend-quality-checklist.md) — 프론트엔드 개선 작업 체크리스트
5. [backend-refactoring-plan.md](quality/backend-refactoring-plan.md) — 백엔드 리팩토링 계획 수립 및 추적
6. [backend-testing-guide.md](quality/backend-testing-guide.md) — 백엔드 테스트 코드 작성 가이드
7. [frontend-testing-guide.md](quality/frontend-testing-guide.md) — 프론트엔드 테스트 코드 작성 가이드

---

## 📝 문서 작성 규칙

### 1. 파일 네이밍
- 소문자 + 하이픈(-) 사용
- 명확하고 설명적인 이름
- 예: `backend-docker.md`, `database-specification.md`

### 2. 문서 구조
```markdown
# 제목
> 작성일: YYYY-MM-DD
> 업데이트: YYYY-MM-DD (선택)

## 목차 (선택)

## 개요

## 주요 내용...

---
*작성자 또는 참고사항*
```

### 3. 업데이트 관리
- 중요한 변경 시 "최종 업데이트" 날짜 갱신
- 변경 이력이 중요한 문서는 하단에 변경 이력 섹션 추가

### 4. 상호 참조
- 관련 문서는 상대 경로로 링크
- 예: `[아키텍처 문서](../architecture/architecture.md)`

---

## 🔄 문서 유지보수

### 정기 검토 항목
- [ ] 최신 코드베이스와 문서 일치 여부
- [ ] 깨진 링크 확인
- [ ] 오래된 정보 업데이트
- [ ] 새로운 기능 문서화 추가

### 문서 추가 시
1. 적절한 디렉토리에 배치
2. 이 README.md에 문서 추가
3. 관련 문서에 상호 참조 링크 추가

---

## 📚 외부 문서

프로젝트 루트의 주요 문서:
- [CLAUDE.md](../CLAUDE.md) — Claude Code용 개발 가이드
- [README.md](../README.md) — 프로젝트 전체 README
- [SETUP.md](../SETUP.md) — 개발 환경 설정 가이드

프론트엔드 문서:
- [frontend/INTEGRATION.md](../frontend/INTEGRATION.md) — 프론트엔드 통합 가이드
- [frontend/BUILD_GUIDE.md](../frontend/BUILD_GUIDE.md) — 프론트엔드 빌드 가이드

---

**문의**: HatioLab 개발팀
**문서 관리**: 프로젝트 전체 참여자
