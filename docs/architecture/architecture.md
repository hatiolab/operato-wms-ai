# Operato WMS — 시스템 아키텍처

## 전체 구성

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser/PWA)                    │
│              operato-wms-app (Things Factory UI)             │
│                    Port 5907 (운영) / 3000 (개발)             │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API / GraphQL
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              operato-wms-ai (Spring Boot)                    │
│                       Port 9501                             │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  base/   │  │ inbound/ │  │outbound/ │  │  stock/  │   │
│  │ 기준정보  │  │   입고   │  │   출고   │  │   재고   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         otarepo-core (공유 코어 라이브러리)              │  │
│  │   ElidomStampHook · QueryManager · BeanUtil · ...     │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
  PostgreSQL  Redis  (Elasticsearch / RabbitMQ / Quartz)
   Port 5432  6379
```

## 레이어 구조

각 도메인 모듈(`base`, `inbound`, `outbound`, `stock`)은 동일한 레이어 구조를 따릅니다.

```
{module}/
├── entity/          # JPA 엔티티 (@Entity, @PrePersist, @PreUpdate, @PreDelete)
├── rest/            # REST 컨트롤러 (@RestController) — 현재 비즈니스 로직 포함
├── service/         # 비즈니스 서비스 (@Service, @Transactional)
└── query/store/     # 복잡한 조회 쿼리 (QueryStore 패턴)
```

> **주의**: 현재 `@Transactional`이 Controller 레이어에 혼재되어 있음.
> 리팩토링 계획: `docs/refactoring/backend-refactoring-plan.md`

## 백엔드 소스 구조

```
src/main/java/operato/wms/
├── OperatoWmsApplication.java       # 메인 클래스
├── config/                          # 전역 설정 (Security, Redis, Jasypt 등)
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

## 프론트엔드 소스 구조

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

## 멀티 테넌시 구조

- 모든 엔티티에 `domain_id` (BIGINT) 컬럼 포함 — `ElidomStampHook`에서 자동 설정
- 물리 창고를 논리 사이트(domain)로 분리하여 화주사별 격리

## 데이터 계층

| 저장소 | 용도 |
|--------|------|
| PostgreSQL | 메인 데이터베이스 (재고, 입출고, 기준정보) |
| Redis | 세션 관리 + 캐시 (`spring.session.store-type=redis`) |
| Elasticsearch | 검색 (선택적) |
| RabbitMQ | 비동기 메시징 (선택적) |

## Docker 배포 구성

```
docker-compose.yml
├── operato-wms-ai   (Port 9501) — Spring Boot JAR, linux/amd64
├── postgres         (Port 15432 → 5432) — PostgreSQL 16
└── redis            (Port 6379) — Redis 7
```

> 상세: `docs/operations/` 하위 Docker 가이드 참조
