# VAS 모듈 테스트 코드

## 현재 상태

⚠️ **테스트 환경 개선 필요**

VAS 모듈의 통합 테스트 코드가 작성되어 있으나, 현재 프로젝트의 복잡한 의존성 구조로 인해 실행이 불가능합니다.

## 작성된 테스트

### 1. VAS 트랜잭션 API 테스트 (`VasTransactionControllerTest.java`)
- **테스트 수**: 17개
- **범위**: VAS 전체 프로세스 시나리오
  - 작업 지시 생성/승인/취소
  - 자재 배정 및 피킹 (개별/일괄)
  - 작업 시작/실적 등록/완료/마감
  - 조회, 모니터링, 대시보드 API

### 2. VAS 주문 CRUD API 테스트 (`VasOrderControllerTest.java`)
- **테스트 수**: 12개
- **범위**: 기본 CRUD 및 상세 조회
  - 생성/조회/수정/삭제
  - 페이지네이션 및 검색
  - 다중 데이터 처리
  - 상세 정보 조회 (items, results)

### 3. VAS 실적 CRUD API 테스트 (`VasResultControllerTest.java`)
- **테스트 수**: 7개
- **범위**: 기본 CRUD 작업
  - 생성/조회/수정/삭제
  - 페이지네이션 및 검색
  - 예외 처리

### 4. VAS 컨트롤러 단위 테스트 (`VasControllerSimpleTest.java`)
- **테스트 수**: 3개
- **범위**: 컨트롤러 라우팅 검증
  - 대시보드 API 호출 확인
  - MockBean을 사용한 단위 테스트

## 문제점

### Spring 컨텍스트 초기화 실패
프로젝트의 다음 의존성들로 인해 테스트 환경 구성이 복잡합니다:
- Elasticsearch
- Redis
- RabbitMQ
- Quartz Scheduler
- otarepo-core 모듈
- Jasypt 암호화

### 에러 메시지
```
Could not resolve placeholder 'sqlAspect.enabled'
Could not open ServletContext resource [/application.properties]
```

## 테스트 실행 방법 (향후)

테스트 환경이 개선되면 다음 명령어로 실행 가능:

```bash
# 전체 테스트
./gradlew test

# VAS 모듈만
./gradlew test --tests "operato.wms.vas.*"

# 특정 테스트 클래스
./gradlew test --tests "VasTransactionControllerTest"
```

## 향후 개선 사항

1. **테스트 전용 설정 프로파일 구성**
   - 외부 의존성을 모두 비활성화한 test 프로파일
   - `@TestConfiguration`으로 최소 빈만 로드

2. **Mock 서비스 레이어**
   - `@MockBean`을 활용한 Service 계층 모킹
   - 실제 DB 없이 컨트롤러 레이어만 테스트

3. **Testcontainers 활용**
   - Docker 기반 통합 테스트 환경
   - PostgreSQL, Redis 등을 컨테이너로 실행

4. **CI/CD 파이프라인 구성**
   - GitHub Actions 또는 Jenkins에서 자동 테스트
   - 격리된 환경에서 통합 테스트 실행

## 파일 구조

```
src/test/
├── java/operato/wms/vas/rest/
│   ├── VasTransactionControllerTest.java  (@Disabled)
│   ├── VasOrderControllerTest.java        (@Disabled)
│   ├── VasResultControllerTest.java       (@Disabled)
│   └── VasControllerSimpleTest.java       (@Disabled)
└── resources/
    ├── application-test.properties        (H2 설정)
    └── test-data.sql                       (초기 데이터)
```

## 참고

모든 테스트 클래스는 현재 `@Disabled` 어노테이션으로 비활성화되어 있습니다.
