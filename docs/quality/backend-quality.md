# 백엔드 코드 품질 분석 보고서

> 최종 업데이트: 2026-03-12
> 범위: 백엔드 (operato-wms-ai)

---

## 목차

1. [개요](#1-개요)
2. [아키텍처 품질](#2-아키텍처-품질)
3. [명명 규칙](#3-명명-규칙)
4. [에러 처리](#4-에러-처리)
5. [테스트](#5-테스트)
6. [코드 스멜](#6-코드-스멜)
7. [보안](#7-보안)
8. [개선 우선순위](#8-개선-우선순위)

---

## 1. 개요

| 항목 | 수치 |
|------|------|
| 총 Java 파일 수 | 100개 |
| 총 코드 라인 수 | 약 23,015줄 |
| 패키지 구성 | base, inbound, outbound, stock |
| REST Controller 수 | 15개 |
| Service 클래스 수 | 4개 (InboundTransactionService, OutboundTransactionService, InventoryTransactionService, StocktakeService) |
| 테스트 파일 수 | **0개** |

**종합 평가**: 기본 CRUD 구조는 `AbstractRestService` 패턴으로 일관성 있게 구성되어 있으나, 비즈니스 로직 분리, 테스트 부재, 코드 중복, 네이밍 오류 등에서 개선이 필요하다.

---

## 2. 아키텍처 품질

### 🔴 HIGH - 비즈니스 로직이 Controller에 존재

**파일**: `outbound/rest/PickingOrderController.java`

`updateItem()` 메서드 (~200+ 라인)에 SQL 직접 작성, 상태 전이 로직, 재고 처리가 모두 포함되어 있다. Controller는 HTTP 요청/응답만 담당해야 하며, 비즈니스 로직은 Service 계층으로 분리해야 한다.

```java
// PickingOrderController.updateItem() - Controller에 직접 SQL 작성 (안티패턴)
StringBuffer sb = new StringBuffer();
sb.append("SELECT po.*, poi.*, ...");
sb.append(" FROM picking_orders po ...");
// ~60줄의 SQL
```

**권장**: `PickingOrderService` 클래스 신설 후 로직 이전.

### 🔴 HIGH - @Transactional 위치 오류

모든 REST Controller에 `@Transactional`이 선언되어 있고, Service 클래스에는 없다. Spring의 표준 패턴은 Service 계층에 트랜잭션을 정의하는 것이다. Controller에 트랜잭션을 선언하면 예외 처리나 트랜잭션 전파 제어가 어려워진다.

```java
// 현재 (Controller에 @Transactional)
@RestController
@Transactional  // ← Controller에 있음
public class PickingOrderController extends AbstractRestService { ... }

// @Component만 선언된 Service
@Component
public class InboundTransactionService { ... }  // @Transactional 없음
```

### 🟡 MEDIUM - Raw SQL이 Controller에 직접 포함

`PickingOrderController.updateItem()`과 `InventoryHistController.listByInventoryId()`에 SQL이 직접 작성되어 있다. 프로젝트에 `QueryStore` 패턴(예: `WmsOutboundQueryStore`)이 이미 적용되어 있으므로, 일관성을 위해 SQL은 QueryStore로 이전해야 한다.

```java
// InventoryHistController.java:94
String sql = "select * from inventory_hists where domain_id = :domainId and barcode = (select barcode from inventories where id = :inventoryId) order by hist_seq desc";
```

### 🟡 MEDIUM - 상태 상수 정의 불일치

상태 상수가 세 가지 다른 방식으로 정의되어 있어 일관성이 없다.

| 모듈 | 방식 | 예시 |
|------|------|------|
| inbound | 별도 상수 클래스 | `WmsInboundConstants.STATUS_WAIT` |
| outbound | Entity 내 static 필드 | `ReleaseOrder.STATUS_WAIT` |
| stock | Entity 내 static 필드 | `Stocktake.STATUS_WAIT` |

**권장**: 모듈별 Constants 클래스로 통일하거나, 전체를 Entity 내 상수로 통일.

### 🟢 LOW - 커스텀 서비스 훅의 일관성 미흡

`StocktakeController`에는 pre/post 커스텀 서비스 훅이 잘 적용되어 있으나, `SupplyOrderController`와 `OutboundOrderController` 등의 단순 CRUD 컨트롤러에는 없다. 표준화된 확장 지점을 정의할 필요가 있다.

---

## 3. 명명 규칙

### 🔴 HIGH - 메서드명 Java 컨벤션 위반

`InventoryController`의 다음 메서드들이 대문자로 시작한다 (Java 컨벤션: 메서드는 소문자 시작).

```java
// src/main/java/operato/wms/stock/rest/InventoryController.java
public Boolean MultipleUpdateLoad(...) { ... }   // → multipleUpdateLoad()
public Boolean MultipleUpdateAdjust(...) { ... } // → multipleUpdateAdjust()
```

### 🔴 HIGH - 오타 (Typo)

| 파일 | 오타 | 올바른 표기 |
|------|------|------------|
| `OutboundTransactionController.java` | `downloadForPickingOrderSheef` | `downloadForPickingOrderSheet` |
| `InboundTransactionController.java` | `getRecevingLabelTemplateName` | `getReceivingLabelTemplateName` |
| `InboundTransactionService.java` | `"입고지지서"` (에러 메시지) | `"입고지시서"` |

### 🟡 MEDIUM - 메서드명 일관성 부족

동일한 개념의 작업인데 메서드명이 모듈마다 다르다.

| 모듈 | 재고실사 시작 | 재고실사 완료 |
|------|------------|------------|
| StocktakeController | `startStocktask` | `finishStocktask` |

`Stocktake`(재고실사)이지만 메서드명에 `Stocktask`(오타)가 사용되고 있다. `startStocktake`, `finishStocktake`로 수정 필요.

### 🟡 MEDIUM - 주석의 상태명과 코드 불일치

주석에는 `RUNNING`으로 표기되어 있으나 실제 코드에서는 `STATUS_START`를 사용하는 경우가 있다. 주석과 코드를 동기화해야 한다.

---

## 4. 에러 처리

### 🔴 HIGH - IndexOutOfBoundsException 위험

`importReleaseOrders`, `importB2CReleaseOrders`, `importB2BReleaseOrders` 메서드에서 빈 리스트 체크 없이 `list.get(0)`을 호출한다.

```java
// OutboundTransactionService.java (예시 패턴)
List<ReleaseOrder> list = ...; // DB 조회 결과
ReleaseOrder first = list.get(0); // ← 빈 경우 IndexOutOfBoundsException
```

**권장**: `ValueUtil.isEmpty(list)` 체크 후 적절한 예외 발생.

### 🟡 MEDIUM - TODO 주석이 프로덕션 코드에 존재

`StocktakeController`의 핵심 비즈니스 로직이 구현되지 않은 채 TODO로 남아있다.

```java
// StocktakeController.java:271
// TODO Start - 개별 상품 & 로케이션의 총 PCS 수를 자동 계산하여 업데이트 ...
stocktake.setStatus(Stocktake.STATUS_RUN);

// StocktakeController.java:292
// TODO Finish - 개별 상품 & 로케이션의 총 PCS 수와 처리 PCS 수의 차이를 자동 계산하여 업데이트 ...
stocktake.setStatus(Stocktake.STATUS_END);
```

재고 실사의 핵심인 "실사 시작 시 기준 수량 캡처"와 "완료 시 차이 계산"이 미구현 상태이다.

### 🟡 MEDIUM - 주석 처리된 비즈니스 로직

`OutboundTransactionService.importReleaseOrders()`에 주석 처리된 코드가 있다.

```java
//ro.setCreatedAt(null);
//ro.setUpdatedAt(null);
```

주석 처리된 코드가 의도적인 비활성화인지, 개발 중 임시 처리인지 불명확하다. 명확한 주석을 추가하거나 삭제해야 한다.

---

## 5. 테스트

### 🔴 HIGH - 테스트 코드 전무

`src/test/java/operato/wms/` 디렉토리가 존재하지 않으며, 단 하나의 테스트 클래스도 없다.

| 테스트 유형 | 현황 |
|------------|------|
| 단위 테스트 (Unit Test) | 없음 |
| 통합 테스트 (Integration Test) | 없음 |
| API 테스트 (Controller Test) | 없음 |

**우선 도입 권장 영역**:
1. `InboundTransactionService` - 복잡한 상태 전이 로직 (입고 시작→완료→재고 생성)
2. `OutboundTransactionService` - B2C/B2B 주문 임포트 로직
3. `InventoryTransactionService` - 재고 이동, 분할, 병합 로직

**권장 프레임워크**: JUnit 5 + Mockito + Spring Boot Test

---

## 6. 코드 스멜

### 🟡 MEDIUM - 주석 처리된 재고 처리 코드 (PickingOrderController)

피킹 완료 처리 후 재고 업데이트 로직이 주석 처리되어 있다. 서비스 레이어로 이전하면서 누락된 것으로 보인다.

```java
// PickingOrderController.java (updateItem 내부)
// TODO: inventory update ...
// inventory.setPickedQty(inventory.getPickedQty() + pickedQty);
// this.queryManager.update(inventory);
```

피킹 후 재고 반영이 실제로 되지 않고 있을 가능성이 있어 데이터 정합성 확인이 필요하다.

### 🟡 MEDIUM - 중복 코드 패턴

모든 15개 Controller가 동일한 CRUD 보일러플레이트를 가진다 (`index`, `findOne`, `isExist`, `create`, `update`, `delete`, `multipleUpdate`). `AbstractRestService`로 일부 처리되고 있으나, 서브 엔티티 조회 패턴(예: `/{id}/items`)도 중복이 많다.

### 🟢 LOW - 미사용 import 및 변수

일부 Controller에서 실제로 사용하지 않는 import가 포함되어 있다. IDE의 "Optimize Imports" 기능으로 정리 가능.

### 🟢 LOW - 매직 스트링

상태값이 문자열 리터럴로 직접 사용되는 경우가 있다.

```java
// 예시: 상수 대신 문자열 직접 사용
if ("WAIT".equals(status)) { ... }
```

---

## 7. 보안

### 🟡 MEDIUM - SQL Injection 잠재적 위험

`PickingOrderController.updateItem()`과 `InventoryHistController`에서 Native SQL을 직접 사용한다. `:paramName` 방식의 Named Parameter를 사용하고 있어 직접적인 SQL Injection은 방어되고 있으나, 동적 SQL 구성 시 주의가 필요하다.

```java
// InventoryHistController.java:94 - Named Parameter 사용 (안전)
String sql = "select * from inventory_hists where domain_id = :domainId ...";
Map<String, Object> params = ValueUtil.newMap("domainId,inventoryId", ...);
```

### 🟢 LOW - 권한 체크 부재

Controller 레벨에서 `@PreAuthorize` 또는 별도 권한 검사가 없다. `AbstractRestService`의 부모 프레임워크(elidom)에서 처리되는지 확인이 필요하다.

---

## 8. 개선 우선순위

| 우선순위 | 이슈 | 영향도 | 난이도 |
|---------|------|--------|--------|
| 🔴 P1 | 테스트 코드 작성 (핵심 서비스) | 매우 높음 | 높음 |
| 🔴 P1 | `PickingOrderController.updateItem()` 서비스 분리 | 높음 | 중간 |
| 🔴 P1 | `list.get(0)` 빈 리스트 체크 추가 | 높음 | 낮음 |
| 🔴 P1 | 오타 수정 (메서드명, 에러 메시지) | 중간 | 낮음 |
| 🟡 P2 | `@Transactional` Controller → Service 이동 | 높음 | 중간 |
| 🟡 P2 | StocktakeController TODO 구현 | 높음 | 높음 |
| 🟡 P2 | Raw SQL → QueryStore 이전 | 중간 | 중간 |
| 🟡 P2 | 상태 상수 정의 통일 | 낮음 | 낮음 |
| 🟡 P2 | Java 메서드명 컨벤션 수정 (`MultipleUpdate*`) | 낮음 | 낮음 |
| 🟢 P3 | 주석 처리된 코드 정리 | 낮음 | 낮음 |
| 🟢 P3 | 미사용 import 정리 | 낮음 | 낮음 |

---

*이 문서는 코드 정적 분석 및 수동 리뷰를 기반으로 작성되었습니다.*
