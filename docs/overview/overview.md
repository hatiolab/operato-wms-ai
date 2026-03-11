# Operato WMS — 프로젝트 개요

## 소개

**Operato WMS**는 자가 물류 및 3PL(Third Party Logistics)을 위한 클라우드 기반 창고관리시스템(Warehouse Management System)입니다.
하티오랩(HatioLab)이 개발하며, Spring Boot 기반 백엔드와 Web/PWA UI를 제공합니다.

## 주요 특징

- 클라우드/Web 기반, 브라우저 접근, PWA 모바일 지원
- 멀티 테넌시(3PL): 물리 창고를 논리 사이트로 분리, 화주사별 별도 실행 환경
- DAS/DPS 등 WCS 설비 연계 지원
- 3D 재고 모니터링 현황판 제공

## 저장소 구성

| 저장소 | 경로 | 역할 |
|--------|------|------|
| `operato-wms-ai` | `./` | 백엔드 — Spring Boot REST API 서버 |
| `operato-wms-ai` | `./frontend` | 프론트엔드 — Things Factory 기반 Web/PWA UI |
| `otarepo-core` | `../otarepo-core` | 공유 코어 라이브러리 (백엔드 서브모듈) |

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

### 프론트엔드 (operato-app)

| 항목 | 내용 |
|------|------|
| 프레임워크 | Things Factory (하티오랩 자체 프레임워크) |
| 모노레포 | Lerna + Yarn Workspaces |
| 언어 | TypeScript, JavaScript |
| 번들러 | Webpack (`@things-factory/builder`) |
| 패키지 매니저 | Yarn |
| 테스트 | Jest + Babel |
| 주요 패키지 | `@operato-app/operato-wes` (메인 WMS 앱) |
| UI 컴포넌트 | `@operato/*` 시리즈 (data-grist, layout, popup, graphql 등) |
| API 통신 | GraphQL (`@operato/graphql`) |
| 서버 사이드 | Node.js (Koa 기반, TypeORM, DB 마이그레이션 포함) |
