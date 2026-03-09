# Operato WMS AI — CLAUDE.md

## 프로젝트 개요

**Operato WMS**는 자가 물류 및 3PL(Third Party Logistics)을 위한 클라우드 기반 창고관리시스템(Warehouse Management System)입니다.
하티오랩(HatioLab)이 개발하며, Spring Boot 기반 백엔드와 Web/PWA UI를 제공합니다.

### 주요 특징
- 클라우드/Web 기반, 브라우저 접근, PWA 모바일 지원
- 멀티 테넌시(3PL): 물리 창고를 논리 사이트로 분리, 화주사별 별도 실행 환경
- DAS/DPS 등 WCS 설비 연계 지원
- 3D 재고 모니터링 현황판 제공

### 저장소 구성

| 저장소 | 경로 | 역할 |
|--------|------|------|
| `operato-wms-ai` | `./` (현재) | 백엔드 — Spring Boot REST API 서버 |
| `operato-wms-app` | `../operato-wms-app` | 프론트엔드 — Things Factory 기반 Web/PWA UI |
| `otarepo-core` | `../otarepo-core` | 공유 코어 라이브러리 (백엔드 서브모듈) |

---

## 기술 스택

### 백엔드 (operato-wms-ai)

| 항목 | 내용 |
|------|------|
| Language | Java 18 (sourceCompatibility: 17) |
| Framework | Spring Boot 3.2.4 |
| Build | Gradle 8.5 (wrapper) |
| DB 드라이버 | MySQL, PostgreSQL, Oracle (ojdbc11) |
| 캐시 | Redis (Spring Session + Cache) |
| 검색 | Elasticsearch |
| 메시징 | RabbitMQ (AMQP) |
| 스케줄러 | Quartz |
| 보안 | Spring Security, JWT (jjwt 0.12.3), Jasypt |
| 스크립팅 | Groovy (JSR-223), JRuby |
| 문서/보고서 | JasperReports, Apache POI, PDFBox, OpenPDF, jXLS |
| 바코드/QR | Barcode4J, ZXing |
| SVG | Apache Batik |
| 서브모듈 | `otarepo-core` (../otarepo-core) |

### 프론트엔드 (operato-wms-app)

| 항목 | 내용 |
|------|------|
| 프레임워크 | Things Factory (하티오랩 자체 프레임워크) |
| 모노레포 | Lerna + Yarn Workspaces |
| 언어 | TypeScript, JavaScript |
| 번들러 | Webpack (`@things-factory/builder`) |
| 패키지 매니저 | Yarn |
| 테스트 | Jest + Babel |
| 주요 패키지 | `@things-factory/operato-wms-ui` (메인 WMS UI) |
| UI 컴포넌트 | `@operato/*` 시리즈 (data-grist, layout, popup, graphql 등) |
| API 통신 | GraphQL (`@operato/graphql`) |
| 서버 사이드 | Node.js (Koa 기반, TypeORM, DB 마이그레이션 포함) |

---

## 빌드 및 실행

### 백엔드 빌드
```bash
JAVA_HOME=$(/usr/libexec/java_home -v 18) ./gradlew build
```

### 백엔드 디버그 실행 (VSCode)
- `실행 및 디버그` (Cmd+Shift+D) → **operato-wms-ai (debug)** 선택
- 또는 원격 attach: **operato-wms-ai (attach)** (포트 5004)

### 백엔드 환경 설정
- `src/main/resources/application.properties` — 공통 설정
- `src/main/resources/application-dev.properties` — 개발 환경 설정 (git 미추적)
- `spring.profiles.active=dev` 로 실행

### 프론트엔드 빌드 및 실행
```bash
cd ../operato-wms-app

# 의존성 설치
yarn install

# 전체 빌드
yarn build

# 개발 서버 실행 (operato-wms-ui)
yarn wms:dev       # 빌드 후 개발 서버 (포트 3000/3001)
yarn wms           # 프로덕션 모드 실행
```

---

## 프로젝트 구조

### 백엔드 (operato-wms-ai)

```
src/main/java/operato/wms/
├── OperatoWmsApplication.java       # 메인 클래스
├── config/                          # 전역 설정
├── base/                            # 기준 정보 모듈
│   ├── entity/                      # SKU, Warehouse, Location, Zone, Company 등
│   ├── rest/                        # REST 컨트롤러
│   ├── service/                     # 비즈니스 서비스
│   └── query/store/                 # 쿼리 저장소
├── inbound/                         # 입고 관리 모듈
│   ├── entity/                      # Receiving, ReceivingItem 등
│   └── rest/                        # ReceivingController 등
├── outbound/                        # 출고 관리 모듈
│   ├── entity/                      # ReleaseOrder, PickingOrder, Wave 등
│   └── rest/                        # ReleaseOrderController 등
└── stock/                           # 재고 관리 모듈
    ├── entity/                      # Inventory, InventoryHist, Stocktake 등
    └── rest/                        # InventoryController 등
```

### 프론트엔드 (operato-wms-app)

```
packages/
├── operato-wms-ui/                  # 메인 WMS UI 패키지
│   ├── client/                      # 브라우저 클라이언트 코드
│   │   ├── pages/                   # 화면 페이지
│   │   │   ├── inbound/             # 입고 화면
│   │   │   ├── outbound/            # 출고 화면
│   │   │   ├── inventory/           # 재고 화면
│   │   │   ├── master/              # 기준 정보 화면
│   │   │   ├── settlement/          # 정산 화면
│   │   │   ├── work/                # 작업 화면
│   │   │   └── config/              # 설정 화면
│   │   ├── actions/                 # Redux 액션
│   │   ├── reducers/                # Redux 리듀서
│   │   └── themes/                  # UI 테마
│   └── server/                      # Node.js 서버 사이드 (BFF)
│       ├── controllers/             # 서버 컨트롤러
│       ├── middlewares/             # Koa 미들웨어
│       ├── migrations/              # TypeORM DB 마이그레이션
│       └── routes.ts                # 라우트 등록
├── operato-logis-system-ui/         # 물류 시스템 공통 UI
├── metapage/                        # 메타페이지 컴포넌트
└── operatofill/                     # 자동입력 유틸
```

---

## 업무 도메인

### 기준 정보 (Base)
- 화주사(Company), 거래처(Customer), 공급처(Vendor), 창고(Warehouse), 로케이션(Location), 존(Zone), 상품(SKU), 박스 타입(BoxType), 택배 계약(CourierContract), 창고 요금(WarehouseCharge)

### 입고 관리 (Inbound)
| 단계 | 설명 |
|------|------|
| 입고예정 등록 | API 또는 엑셀로 입고 예정 데이터 등록 |
| 입고처리 | 실물 입고 후 검수 및 수량 확인 |
| 적치 | 입고대기존 → 보관랙 로케이션 이동 (추천 로케이션 전략 적용) |
| 입고실적 수량조정 | 입고 수량 오류 수정 |

### 출고 관리 (Outbound)
| 단계 | 설명 |
|------|------|
| 출고예정 등록 | SO 접수 (API 또는 엑셀) |
| 주문확정 | 출고 대상 전표 확정 |
| 보충지시 | 피킹 로케이션 재고 보충 (Single/Complex 구분) |
| 피킹지시 | 피킹 작업 지시 생성 |
| 피킹확정 | 피킹 작업 완료 처리 |
| 출고검수 | 송장/주문번호 기반 스캔 검수 |
| 출고확정 | 최종 출고 처리 |
| 거래명세서 출력 | 출고 전표 출력 |

- 출고 유형: **B2C** (택배, DPS 피킹), **B2B** (팔레트/박스 단위)
- Wave: 복수 주문 묶음 처리 단위

### 재고 관리 (Stock)
- Inventory: 현재 재고 (로케이션, 상품, 수량, 로트 속성)
- InventoryHist: 재고 이동 이력 (입출하 이력)
- Stocktake: 재고 실사 지시 및 실적
- 재고 이동, 재고 조정, 재고 조사, 선입선출(FIFO) 처리

### 유통가공 (Value-Added Service)
- 세트 구성 BOM 등록, 유통가공 계획, 보충/해체 처리

### 기타
- 운송비/물류비 정산, 택배사 기업간 연계(CJ, 롯데, 우체국 등), 대시보드

---

## 코딩 컨벤션

### 백엔드 (operato-wms-ai)
- 패키지: `operato.wms.{모듈}.{레이어}` (예: `operato.wms.inbound.rest`)
- Entity: JPA 엔티티, 각 모듈의 `entity/` 하위
- Controller: REST, `{도메인}Controller.java` 네이밍
- Service: 트랜잭션 서비스, `{도메인}TransactionService.java` 또는 `{도메인}Service.java`
- QueryStore: 복잡한 조회 쿼리, `query/store/` 하위
- Initializer: 모듈 초기화, `web/initializer/` 하위
- 모듈별 상수: `Wms{Module}Constants.java`, `Wms{Module}ConfigConstants.java`

### 프론트엔드 (operato-wms-app)
- 패키지명: `@things-factory/{패키지명}` 스코프
- 화면 파일: `client/pages/{모듈}/{도메인}-{액션}.js` (예: `inbound/receive-list.js`)
- Things Factory 라우트: `client/route.js`에 페이지 경로 등록
- 서버 라우트: `server/routes.ts`에 Koa 라우터로 등록 (`bootstrap-module-*-route` 이벤트)
- DB 마이그레이션: `server/migrations/`에 TypeORM 마이그레이션 파일 추가
- API 통신: GraphQL 우선, 백엔드 REST API는 `/rest/` 경로로 직접 호출
- 상태관리: Redux (actions/reducers 패턴)

---

## 주요 참조 문서

| 파일 | 내용 |
|------|------|
| `ref/Operato-WMS.pdf` | WMS 소개, 아키텍처, 주요 기능 |
| `ref/Operato-WMS-운영프로세스.pdf` | AS-IS/TO-BE 프로세스, 기능 목록 |
| `ref/WMS-FunctionList-V1.xlsx` | 기능 목록 상세 |
| `ref/Operato-WMS-UsersGuide.pptx` | 사용자 가이드 |
