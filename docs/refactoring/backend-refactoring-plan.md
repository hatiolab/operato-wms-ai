# 백엔드 리팩토링 계획서

> 작성일: 2026-03-08
> 대상: `operato-wms-ai` 백엔드 소스 (100 Java 파일, ~23,000 라인)
> 참조: `docs/quality/quality.md`

---

## 1. 리팩토링이 필요한 이유

현재 코드베이스는 Spring Boot 기반의 WMS 시스템으로, 기본 CRUD는 `AbstractRestService` 패턴으로 일관성 있게 구성되어 있다. 그러나 아래와 같은 구조적 문제들이 시스템 유지보수성, 안정성, 확장성을 심각하게 저해하고 있어 리팩토링이 필요하다.

### 1.1 유지보수성 저하

**현재 문제**:
- `PickingOrderController.updateItem()` 메서드 하나가 200+ 라인으로, 상태 검증 → SQL 조회 → 재고 계산 → 연관 엔티티 상태 전이까지 모든 비즈니스 로직을 담고 있다.
- 이 메서드 하나를 수정하려면 SQL 문자열, 상태 전이 로직, 연관 Controller 호출 등을 모두 이해해야 한다.
- 비즈니스 로직이 Controller, Service, Entity 세 곳에 분산되어 있어 어느 계층에 기능을 추가해야 할지 명확하지 않다.

**결과**: 새 기능 추가 또는 버그 수정 시 사이드 이펙트 발생 가능성이 높다.

### 1.2 테스트 불가능한 구조

**현재 문제**:
- Entity 클래스(`Receiving`, `ReleaseOrder`, `Inventory` 등)가 `@PrePersist`/`@PreUpdate` 훅 내부에서 `BeanUtil.get()`으로 스프링 빈(QueryManager, CustomService 등)을 직접 호출한다.
- Controller가 다른 Controller를 `BeanUtil.get(ReleaseOrderController.class)`로 직접 참조한다.
- `@Transactional`이 Service가 아닌 Controller에 선언되어 있어, Service 단위의 트랜잭션 격리 테스트가 불가능하다.

**결과**: 단위 테스트 작성이 사실상 불가능하며, 실제 테스트 파일이 0개다.

### 1.3 데이터 정합성 위험

**현재 문제**:
- 피킹 완료 처리 시 재고 차감 로직이 주석 처리되어 있다.
  ```java
  // 재고 처리
  // inv.setInvQty(inv.getInvQty() - pick_qty);
  // this.queryManager.updateBatch(Inventory.class, invList, ...);
  ```
- 재고 실사(Stocktake) 시작/완료 시 기준 수량 캡처와 차이 계산 로직이 TODO로 미구현 상태다.
- 이 두 가지는 WMS의 핵심 기능으로, 구현 누락 시 전산 재고와 실물 재고 불일치가 발생한다.

**결과**: 운영 중 재고 오차 발생 시 원인 추적이 어렵다.

### 1.4 확장성 부족

**현재 문제**:
- 상태 상수가 모듈마다 다른 방식(별도 Constants 클래스, Entity 내 static 필드)으로 정의되어 있어 일관성이 없다.
- QueryStore 패턴이 이미 도입되어 있으나, 일부 Controller에는 여전히 Raw SQL이 직접 작성되어 있다.
- 동일한 CRUD 패턴이 반복되는 서브 엔티티 조회(`/{id}/items`)에 공통 추상화가 없다.

---

## 2. 리팩토링 범위

### 우선순위 구분

| 단계 | 분류 | 내용 | 기대 효과 |
|------|------|------|----------|
| **Phase 1** | 즉시 수정 | 버그성 문제, 오타, 누락 구현 | 데이터 정합성, 코드 품질 |
| **Phase 2** | 구조 개선 | Controller 로직 → Service 분리 | 테스트 가능성, 유지보수성 |
| **Phase 3** | 설계 개선 | Entity 의존성 제거, 트랜잭션 이동 | 아키텍처 정상화 |
| **Phase 4** | 품질 확보 | 테스트 코드 작성 | 회귀 방지 |

---

## 3. Phase 1 — 즉시 수정 (데이터 정합성 & 코드 품질)

> 기능 변경 없이 버그, 오타, 누락 구현을 수정한다.

### 3.1 피킹 완료 시 재고 차감 구현

**파일**: [PickingOrderController.java](../../src/main/java/operato/wms/outbound/rest/PickingOrderController.java#L302-L319)

현재 피킹 완료 처리 시 `ReleaseOrderItem` 상태 업데이트는 동작하지만, 재고(`Inventory`) 차감이 주석으로 비활성화되어 있다. 피킹 완료 후 재고가 차감되지 않으면 전산 재고와 실물 재고가 불일치한다.

**수정 방향**: Phase 2에서 `PickingOrderService`로 분리하면서 함께 구현. 단, 누락 확인 즉시 요구사항과 함께 검토.

### 3.2 재고 실사 핵심 로직 구현

**파일**: [StocktakeController.java](../../src/main/java/operato/wms/stock/rest/StocktakeController.java#L271-L292)

```java
// startStocktask (L271): TODO — 기준 수량 캡처 미구현
// finishStocktask (L292): TODO — 차이 계산 미구현
```

`StocktakeItem`에 기준 수량(`baseQty`), 실사 수량(`countQty`), 차이(`diffQty`) 필드가 있다면 시작 시 `baseQty` 스냅샷 저장, 완료 시 `diffQty` 계산 로직을 구현해야 한다.

### 3.3 오타 수정

| 파일 | 오타 | 수정 |
|------|------|------|
| [OutboundTransactionController.java](../../src/main/java/operato/wms/outbound/rest/OutboundTransactionController.java) | `downloadForPickingOrderSheef` | `downloadForPickingOrderSheet` |
| [InboundTransactionController.java](../../src/main/java/operato/wms/inbound/rest/InboundTransactionController.java) | `getRecevingLabelTemplateName` | `getReceivingLabelTemplateName` |
| [InboundTransactionService.java](../../src/main/java/operato/wms/inbound/service/InboundTransactionService.java) | `"입고지지서"` | `"입고지시서"` |
| [StocktakeController.java](../../src/main/java/operato/wms/stock/rest/StocktakeController.java) | `startStocktask`, `finishStocktask`, `cancelStocktask` | `startStocktake`, `finishStocktake`, `cancelStocktake` |

### 3.4 Java 명명 규칙 위반 수정

**파일**: [InventoryController.java](../../src/main/java/operato/wms/stock/rest/InventoryController.java)

```java
// 수정 전 (대문자 시작 - Java 컨벤션 위반)
public Boolean MultipleUpdateLoad(...)
public Boolean MultipleUpdateAdjust(...)

// 수정 후
public Boolean multipleUpdateLoad(...)
public Boolean multipleUpdateAdjust(...)
```

> **주의**: API URL(`/update_multiple_load`, `/update_multiple_adjust`)은 변경하지 않는다. 메서드명만 수정.

### 3.5 빈 리스트 체크 추가

**파일**: [OutboundTransactionService.java](../../src/main/java/operato/wms/outbound/service/OutboundTransactionService.java)

`importReleaseOrders`, `importB2CReleaseOrders`, `importB2BReleaseOrders` 메서드에서 `list.get(0)` 호출 전 빈 리스트 체크가 없다.

```java
// 수정 전
ReleaseOrder first = list.get(0); // IndexOutOfBoundsException 위험

// 수정 후
if (ValueUtil.isEmpty(list)) {
    throw ThrowUtil.newValidationErrorWithNoLog("처리할 출고 주문이 없습니다.");
}
ReleaseOrder first = list.get(0);
```

---

## 4. Phase 2 — 구조 개선 (Controller → Service 분리)

> Controller는 HTTP 요청/응답만 처리하고, 비즈니스 로직은 Service로 이전한다.

### 4.1 PickingOrderService 신설

`PickingOrderController.updateItem()` (~200+ 라인)을 `PickingOrderService`로 분리한다.

**현재 구조**:
```
PickingOrderController.updateItem()
  ├─ 입력 검증 (바코드, 로케이션, LOT)
  ├─ 피킹 상태 처리 (WAIT / RUN / END)
  ├─ 피킹 지시 전체 완료 체크 (Native SQL)
  ├─ ReleaseOrder 상태 전이 (PICKED)
  ├─ ReleaseOrderItem 실적 수량 계산 (60줄 CTE SQL)
  ├─ 재고 차감 처리 (주석 처리 — 미구현)
  └─ ReleaseOrderController 직접 참조 (BeanUtil.get)
```

**목표 구조**:
```
PickingOrderController.updateItem()  [HTTP 처리만]
  └─ PickingOrderService.processPickingItem()
       ├─ validatePickingInput()      [입력 검증]
       ├─ updatePickingItemStatus()   [피킹 상태 처리]
       ├─ checkPickingOrderComplete() [완료 여부 확인]
       ├─ updateReleaseOrderStatus()  [출고 지시 상태 전이]
       └─ deductInventory()          [재고 차감]
```

**적용 원칙**:
- SQL은 `OutboundQueryStore`로 이전
- `BeanUtil.get(ReleaseOrderController.class)` → `@Autowired ReleaseOrderService` (또는 직접 queryManager 사용)

### 4.2 OutboundTransactionService 분리 검토

현재 `OutboundTransactionService`는 단일 파일에 B2C 주문 임포트, B2B 주문 임포트, 상태 전이 등이 혼재되어 있다. 아래와 같이 책임 분리를 검토한다.

```
OutboundTransactionService (현재)
  ├─ OrderImportService    — B2C / B2B 주문 임포트
  ├─ PickingService        — 피킹 지시, 피킹 확정
  └─ ReleaseService        — 출고 확정, 출고 취소
```

> 현재 서비스 규모와 팀 리소스를 고려해 단계적으로 분리한다.

### 4.3 Raw SQL → QueryStore 이전

컨트롤러/서비스에 직접 작성된 SQL을 해당 모듈의 QueryStore로 이전한다.

| 현재 위치 | SQL 내용 | 이전 대상 |
|----------|---------|---------|
| `PickingOrderController.updateItem()` L190-253 | 피킹 실적 CTE SQL | `OutboundQueryStore.getPickingResultSummary()` |
| `PickingOrderController.updateItem()` L176 | 미완료 피킹 아이템 카운트 | `OutboundQueryStore.getIncompletePickingItemCount()` |
| `PickingOrderController.updateItem()` L182 | 출고 지시 조회 by wave | `OutboundQueryStore.getReleaseOrderByWaveNo()` |
| `InventoryHistController.listByInventoryId()` L94 | 재고 이력 조회 | `StockQueryStore.getInventoryHistByInventoryId()` |

---

## 5. Phase 3 — 설계 개선 (Entity 의존성 제거, 트랜잭션 이동)

### 5.1 Entity 클래스에서 Spring 빈 직접 참조 제거

**현재 문제**: Entity의 `@PrePersist`, `@PreUpdate` 훅에서 `BeanUtil.get()`으로 스프링 빈을 직접 참조한다. 이는 Entity를 Spring 컨텍스트에 강결합시켜 단위 테스트를 불가능하게 만든다.

```java
// 현재 (Entity 내부에서 스프링 빈 참조 — 안티패턴)
// Receiving.java:332
this.rcvReqNo = (String) BeanUtil.get(ICustomService.class)
    .doCustomService(..., "diy-generate-req-rcv-no", ...);

// ReceivingItem.java:489
IQueryManager queryManager = BeanUtil.get(IQueryManager.class);

// ReleaseOrder.java:494, Inventory.java:576 등 동일 패턴
```

**목표**: Entity는 순수 데이터 컨테이너로 유지하고, 번호 채번·상태 검증 등의 로직은 Service 계층으로 이전한다.

```java
// 목표 (Service에서 처리)
// InboundTransactionService.java
public Receiving createReceiving(Receiving receiving) {
    receiving.setRcvReqNo(receiptNoGenerator.generate(receiving)); // 번호 채번
    return this.queryManager.insert(receiving);
}
```

> **주의**: 이 변경은 영향 범위가 크고 Entity의 Lifecycle 이벤트 제거가 필요하므로, 충분한 테스트 코드 확보 후 진행한다.

### 5.2 @Transactional을 Controller → Service로 이동

**현재**: 모든 Controller에 `@Transactional` 선언, Service에는 없음.

**목표**: Controller에서 `@Transactional` 제거, 각 Service 메서드에 적절한 트랜잭션 전파 레벨 적용.

```java
// 수정 전 (Controller)
@RestController
@Transactional  // ← 제거
public class PickingOrderController extends AbstractRestService { ... }

// 수정 후 (Service)
@Service
public class PickingOrderService {
    @Transactional
    public PickingOrderItem processPickingItem(String id, PickingOrderItem input) { ... }

    @Transactional(readOnly = true)
    public List<PickingOrderItem> findItemsByOrderId(String orderId) { ... }
}
```

### 5.3 상태 상수 정의 통일

모듈별로 다른 방식의 상태 상수 정의를 통일한다.

**현재 방식**:
```java
// inbound — 별도 Constants 클래스
WmsInboundConstants.STATUS_WAIT

// outbound / stock — Entity 내 static 필드
ReleaseOrder.STATUS_WAIT
Stocktake.STATUS_WAIT
```

**목표**: 모듈별 Constants 클래스로 통일

```java
// WmsOutboundConstants.java (신설)
public class WmsOutboundConstants {
    public static final String RELEASE_ORDER_STATUS_WAIT    = "WAIT";
    public static final String RELEASE_ORDER_STATUS_READY   = "READY";
    public static final String RELEASE_ORDER_STATUS_PICKED  = "PICKED";
    public static final String RELEASE_ORDER_STATUS_END     = "END";

    public static final String PICKING_ORDER_STATUS_WAIT = "WAIT";
    // ...
}
```

---

## 6. Phase 4 — 테스트 코드 작성

### 6.1 테스트 전략

Phase 2~3 리팩토링을 통해 Service 계층이 분리되면 단위 테스트 작성이 가능해진다.

```
src/test/java/operato/wms/
├── inbound/
│   └── service/
│       └── InboundTransactionServiceTest.java  [우선순위 1]
├── outbound/
│   └── service/
│       ├── PickingOrderServiceTest.java         [우선순위 1]
│       └── OutboundTransactionServiceTest.java  [우선순위 2]
└── stock/
    └── service/
        ├── InventoryTransactionServiceTest.java [우선순위 2]
        └── StocktakeServiceTest.java            [우선순위 2]
```

### 6.2 테스트 우선 대상 시나리오

**InboundTransactionService**:
- 입고 시작 → 입고 완료 → 재고 생성 정상 흐름
- 이미 완료된 입고에 재완료 시도 시 예외 발생
- 바코드 중복 생성 방지

**PickingOrderService** (Phase 2 분리 후):
- 피킹 완료 시 `PickingOrderItem.STATUS_END` 설정
- 모든 아이템 완료 시 `PickingOrder.STATUS_END` 설정
- 피킹 완료 시 재고 수량 차감 정합성
- 주문 수량 초과 피킹 시 예외 발생

**StocktakeService** (Phase 1 구현 후):
- 실사 시작 시 기준 수량 스냅샷 저장
- 실사 완료 시 차이 수량 자동 계산

### 6.3 테스트 환경 설정

```gradle
// build.gradle — 이미 포함된 의존성 확인 필요
testImplementation 'org.springframework.boot:spring-boot-starter-test'
testImplementation 'org.mockito:mockito-core'
```

---

## 7. 단계별 실행 계획

| Phase | 작업 | 선행 조건 | 예상 영향 범위 |
|-------|------|----------|--------------|
| Phase 1-A | 오타 수정, 명명 규칙 수정 | 없음 | 낮음 (API URL 변경 없음) |
| Phase 1-B | 빈 리스트 체크 추가 | 없음 | 낮음 |
| Phase 1-C | 재고 실사 TODO 구현 | 요구사항 확인 | 중간 |
| Phase 1-D | 피킹 재고 차감 구현 | 요구사항 확인 | 높음 |
| Phase 2-A | PickingOrderService 분리 | Phase 1 완료 | 중간 |
| Phase 2-B | Raw SQL → QueryStore 이전 | Phase 2-A | 낮음 |
| Phase 2-C | OutboundTransactionService 분리 | Phase 2-A | 중간 |
| Phase 3-A | @Transactional 이동 | Phase 2 완료 | 중간 |
| Phase 3-B | 상태 상수 통일 | Phase 3-A | 낮음 |
| Phase 3-C | Entity BeanUtil.get() 제거 | Phase 4 테스트 확보 후 | 높음 |
| Phase 4 | 테스트 코드 작성 | Phase 2 완료 | 없음 |

---

## 8. 리팩토링 원칙

1. **API 하위 호환성 유지**: URL, Request/Response 형식 변경 없이 내부 구조만 개선한다.
2. **단계적 진행**: 한 번에 전체를 바꾸지 않는다. Phase 순서를 지키고 각 Phase 완료 후 검증한다.
3. **테스트 선행**: Phase 3-C(Entity 의존성 제거)처럼 영향 범위가 큰 작업은 반드시 테스트 코드 확보 후 진행한다.
4. **기존 패턴 활용**: QueryStore, CustomService 훅, AbstractRestService 등 이미 도입된 좋은 패턴을 적극 활용한다.
5. **비즈니스 로직 검증 우선**: Phase 1-C, 1-D는 기술적 리팩토링이 아니라 비즈니스 로직의 정상화이므로, 요구사항 담당자와 반드시 확인 후 진행한다.

---

*관련 문서: [코드 품질 분석](../quality/quality.md) | [API 명세](../implementation/api-list.md) | [요구사항](../requirement/requirements.md)*
