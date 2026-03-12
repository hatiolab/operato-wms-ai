# 백엔드 코드 품질 체크리스트

> 최종 업데이트: 2026-03-12
> 기준: [backend-quality.md](backend-quality.md) 분석 결과

이 문서는 백엔드 코드 품질 개선 작업의 진행 상황을 추적하기 위한 체크리스트입니다.

---

## 📊 전체 현황

| 우선순위 | 총 항목 | 완료 | 진행 중 | 미착수 | 완료율 |
|---------|--------|------|---------|--------|--------|
| 🔴 P1 | 4 | 0 | 0 | 4 | 0% |
| 🟡 P2 | 5 | 0 | 0 | 5 | 0% |
| 🟢 P3 | 2 | 0 | 0 | 2 | 0% |
| **합계** | **11** | **0** | **0** | **11** | **0%** |

---

## 🔴 P1 - 최우선 (Critical)

### 1. 테스트 코드 작성 (핵심 서비스)

- [ ] **InboundTransactionService 단위 테스트**
  - [ ] 입고 시작 로직 테스트
  - [ ] 입고 완료 로직 테스트
  - [ ] 재고 생성 로직 테스트
  - [ ] 상태 전이 테스트
  - [ ] 예외 처리 테스트

- [ ] **OutboundTransactionService 단위 테스트**
  - [ ] B2C 주문 임포트 테스트
  - [ ] B2B 주문 임포트 테스트
  - [ ] 출하 지시 생성 테스트
  - [ ] 주문 상태 전이 테스트
  - [ ] 예외 처리 테스트

- [ ] **InventoryTransactionService 단위 테스트**
  - [ ] 재고 이동 로직 테스트
  - [ ] 재고 분할 로직 테스트
  - [ ] 재고 병합 로직 테스트
  - [ ] 재고 수량 계산 테스트
  - [ ] 예외 처리 테스트

- [ ] **Controller 통합 테스트**
  - [ ] InboundTransactionController API 테스트
  - [ ] OutboundTransactionController API 테스트
  - [ ] InventoryController API 테스트
  - [ ] StocktakeController API 테스트

**영향도**: 매우 높음 | **난이도**: 높음
**관련 파일**: `src/test/java/operato/wms/**/*Test.java` (신규)
**예상 소요**: 2-3주

---

### 2. PickingOrderController.updateItem() 서비스 분리

- [ ] **PickingOrderService 클래스 생성**
  - [ ] `src/main/java/operato/wms/outbound/service/PickingOrderService.java` 생성
  - [ ] @Service, @Transactional 어노테이션 추가

- [ ] **비즈니스 로직 이전**
  - [ ] SQL 쿼리 → PickingOrderQueryStore로 이전 (60줄)
  - [ ] 상태 전이 로직 → Service 메서드로 분리
  - [ ] 재고 처리 로직 → InventoryTransactionService 호출

- [ ] **Controller 리팩토링**
  - [ ] PickingOrderController에서 @Transactional 제거
  - [ ] PickingOrderService 주입 및 호출
  - [ ] HTTP 요청/응답 처리만 남김

- [ ] **테스트 작성**
  - [ ] PickingOrderService 단위 테스트
  - [ ] PickingOrderController 통합 테스트

**영향도**: 높음 | **난이도**: 중간
**관련 파일**:
- `src/main/java/operato/wms/outbound/rest/PickingOrderController.java:updateItem()` (수정)
- `src/main/java/operato/wms/outbound/service/PickingOrderService.java` (신규)
- `src/main/java/operato/wms/outbound/query/store/PickingOrderQueryStore.java` (수정)

**예상 소요**: 3-5일

---

### 3. list.get(0) 빈 리스트 체크 추가

- [ ] **OutboundTransactionService.importReleaseOrders()**
  - 파일: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
  - 라인: 확인 필요
  - [ ] `ValueUtil.isEmpty(list)` 체크 추가
  - [ ] 빈 리스트 시 적절한 예외 발생

- [ ] **OutboundTransactionService.importB2CReleaseOrders()**
  - 파일: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
  - 라인: 확인 필요
  - [ ] `ValueUtil.isEmpty(list)` 체크 추가
  - [ ] 빈 리스트 시 적절한 예외 발생

- [ ] **OutboundTransactionService.importB2BReleaseOrders()**
  - 파일: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
  - 라인: 확인 필요
  - [ ] `ValueUtil.isEmpty(list)` 체크 추가
  - [ ] 빈 리스트 시 적절한 예외 발생

- [ ] **전체 코드베이스 검색**
  - [ ] `list.get(0)` 패턴 전체 검색
  - [ ] 빈 리스트 체크 없는 경우 모두 수정

**영향도**: 높음 | **난이도**: 낮음
**관련 파일**: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
**예상 소요**: 1일

---

### 4. 오타 수정 (메서드명, 에러 메시지)

- [ ] **메서드명 오타 수정**
  - [ ] `OutboundTransactionController.downloadForPickingOrderSheef()` → `downloadForPickingOrderSheet()`
    - 파일: `src/main/java/operato/wms/outbound/rest/OutboundTransactionController.java`
  - [ ] `InboundTransactionController.getRecevingLabelTemplateName()` → `getReceivingLabelTemplateName()`
    - 파일: `src/main/java/operato/wms/inbound/rest/InboundTransactionController.java`
  - [ ] `StocktakeController.startStocktask()` → `startStocktake()`
    - 파일: `src/main/java/operato/wms/stock/rest/StocktakeController.java`
  - [ ] `StocktakeController.finishStocktask()` → `finishStocktake()`
    - 파일: `src/main/java/operato/wms/stock/rest/StocktakeController.java`

- [ ] **에러 메시지 오타 수정**
  - [ ] `InboundTransactionService.java`: `"입고지지서"` → `"입고지시서"`
    - 파일: `src/main/java/operato/wms/inbound/service/InboundTransactionService.java`
    - 에러 메시지 검색하여 모두 수정

- [ ] **Java 메서드명 컨벤션 수정**
  - [ ] `InventoryController.MultipleUpdateLoad()` → `multipleUpdateLoad()`
    - 파일: `src/main/java/operato/wms/stock/rest/InventoryController.java`
  - [ ] `InventoryController.MultipleUpdateAdjust()` → `multipleUpdateAdjust()`
    - 파일: `src/main/java/operato/wms/stock/rest/InventoryController.java`

**영향도**: 중간 | **난이도**: 낮음
**관련 파일**: 위 명시된 Controller 및 Service 파일들
**예상 소요**: 1일

---

## 🟡 P2 - 중요 (High)

### 5. @Transactional Controller → Service 이동

- [ ] **Service 클래스에 @Transactional 추가**
  - [ ] `InboundTransactionService` — `@Transactional` 추가
  - [ ] `OutboundTransactionService` — `@Transactional` 추가
  - [ ] `InventoryTransactionService` — `@Transactional` 추가
  - [ ] `StocktakeService` — `@Transactional` 추가

- [ ] **Controller 클래스에서 @Transactional 제거**
  - [ ] `InboundTransactionController` — 제거
  - [ ] `OutboundTransactionController` — 제거
  - [ ] `OutboundOrderController` — 제거
  - [ ] `PickingOrderController` — 제거
  - [ ] `ReleaseOrderController` — 제거
  - [ ] `SupplyOrderController` — 제거
  - [ ] `ReceivingOrderController` — 제거
  - [ ] `InventoryController` — 제거
  - [ ] `InventoryHistController` — 제거
  - [ ] `LocationInventoryController` — 제거
  - [ ] `StocktakeController` — 제거
  - [ ] 기타 모든 REST Controller 검증

- [ ] **트랜잭션 전파 검토**
  - [ ] Service 메서드별 트랜잭션 범위 확인
  - [ ] 필요 시 `@Transactional(propagation = ...)` 설정

**영향도**: 높음 | **난이도**: 중간
**관련 파일**: 모든 Service 및 Controller 클래스
**예상 소요**: 2-3일

---

### 6. StocktakeController TODO 구현

- [ ] **실사 시작 시 기준 수량 자동 계산**
  - 파일: `src/main/java/operato/wms/stock/rest/StocktakeController.java:271`
  - [ ] 개별 상품 & 로케이션의 총 PCS 수 계산 로직 구현
  - [ ] Stocktake 엔티티에 기준 수량 저장
  - [ ] `startStocktake()` 메서드 완성

- [ ] **실사 완료 시 차이 자동 계산**
  - 파일: `src/main/java/operato/wms/stock/rest/StocktakeController.java:292`
  - [ ] 총 PCS 수와 처리 PCS 수의 차이 계산 로직 구현
  - [ ] 차이 수량을 Stocktake 엔티티에 저장
  - [ ] `finishStocktake()` 메서드 완성

- [ ] **재고 실사 결과 반영**
  - [ ] 차이 수량에 따른 재고 조정 로직 구현
  - [ ] 재고 이력(inventory_hists) 기록

- [ ] **테스트 작성**
  - [ ] StocktakeService 단위 테스트
  - [ ] 수량 계산 로직 테스트
  - [ ] 재고 조정 통합 테스트

**영향도**: 높음 | **난이도**: 높음
**관련 파일**: `src/main/java/operato/wms/stock/rest/StocktakeController.java`
**예상 소요**: 1주

---

### 7. Raw SQL → QueryStore 이전

- [ ] **PickingOrderController.updateItem() SQL 이전**
  - 파일: `src/main/java/operato/wms/outbound/rest/PickingOrderController.java`
  - [ ] 60줄 SQL → `PickingOrderQueryStore` 메서드로 이전
  - [ ] Controller에서 QueryStore 호출로 변경

- [ ] **InventoryHistController.listByInventoryId() SQL 이전**
  - 파일: `src/main/java/operato/wms/stock/rest/InventoryHistController.java:94`
  - [ ] SQL → `InventoryHistQueryStore` 메서드로 이전
  - [ ] Controller에서 QueryStore 호출로 변경

- [ ] **기타 Raw SQL 검색**
  - [ ] 프로젝트 전체에서 `String sql = "SELECT` 패턴 검색
  - [ ] 발견된 Raw SQL을 QueryStore로 이전

**영향도**: 중간 | **난이도**: 중간
**관련 파일**:
- `src/main/java/operato/wms/outbound/rest/PickingOrderController.java`
- `src/main/java/operato/wms/stock/rest/InventoryHistController.java`
- `src/main/java/operato/wms/outbound/query/store/PickingOrderQueryStore.java`
- `src/main/java/operato/wms/stock/query/store/InventoryHistQueryStore.java`

**예상 소요**: 2-3일

---

### 8. 상태 상수 정의 통일

- [ ] **현재 상태 상수 방식 조사**
  - [ ] inbound 모듈: `WmsInboundConstants.STATUS_WAIT` 사용 확인
  - [ ] outbound 모듈: `ReleaseOrder.STATUS_WAIT` 사용 확인
  - [ ] stock 모듈: `Stocktake.STATUS_WAIT` 사용 확인

- [ ] **통일 방안 결정**
  - [ ] 옵션 A: 모듈별 Constants 클래스로 통일
  - [ ] 옵션 B: Entity 내 상수로 통일
  - [ ] 팀 논의 후 결정

- [ ] **선택된 방안 적용**
  - [ ] outbound 모듈 상수 이전 (선택 시)
  - [ ] stock 모듈 상수 이전 (선택 시)
  - [ ] 또는 inbound 모듈 상수 이전 (선택 시)

- [ ] **전체 코드베이스 수정**
  - [ ] 상수 참조 코드 모두 수정
  - [ ] 테스트 코드 수정

**영향도**: 낮음 | **난이도**: 낮음
**관련 파일**:
- `src/main/java/operato/wms/inbound/WmsInboundConstants.java`
- `src/main/java/operato/wms/outbound/entity/ReleaseOrder.java`
- `src/main/java/operato/wms/stock/entity/Stocktake.java`

**예상 소요**: 1-2일

---

### 9. Java 메서드명 컨벤션 수정 (MultipleUpdate*)

✅ **P1 항목 4번에 포함** (중복 항목)

---

## 🟢 P3 - 개선 (Medium)

### 10. 주석 처리된 코드 정리

- [ ] **PickingOrderController 주석 코드**
  - 파일: `src/main/java/operato/wms/outbound/rest/PickingOrderController.java`
  - [ ] 재고 업데이트 로직 주석 코드 검토
    ```java
    // TODO: inventory update ...
    // inventory.setPickedQty(inventory.getPickedQty() + pickedQty);
    // this.queryManager.update(inventory);
    ```
  - [ ] 필요 시 로직 복구, 불필요 시 삭제

- [ ] **OutboundTransactionService 주석 코드**
  - 파일: `src/main/java/operato/wms/outbound/service/OutboundTransactionService.java`
  - [ ] `importReleaseOrders()` 주석 코드 검토
    ```java
    //ro.setCreatedAt(null);
    //ro.setUpdatedAt(null);
    ```
  - [ ] 의도 파악 후 삭제 또는 명확한 주석 추가

- [ ] **전체 코드베이스 검색**
  - [ ] 3줄 이상 주석 처리된 코드 검색
  - [ ] Git 히스토리 확인 후 정리

**영향도**: 낮음 | **난이도**: 낮음
**관련 파일**: 위 명시된 파일들
**예상 소요**: 1일

---

### 11. 미사용 import 정리

- [ ] **IDE "Optimize Imports" 실행**
  - [ ] IntelliJ IDEA: Ctrl+Alt+O (Windows/Linux) / Cmd+Opt+O (Mac)
  - [ ] 모든 Java 파일에 대해 일괄 적용

- [ ] **정적 분석 도구 활용**
  - [ ] Checkstyle 설정 검토
  - [ ] PMD UnusedImports 룰 활성화
  - [ ] 빌드 시 자동 체크 설정

**영향도**: 낮음 | **난이도**: 낮음
**관련 파일**: 모든 Java 파일
**예상 소요**: 1시간

---

## 📋 진행 상황 업데이트 가이드

### 체크리스트 업데이트 방법

1. **작업 시작 시**
   - [ ] → [진행 중] 으로 표시
   - 전체 현황 테이블의 "진행 중" 개수 증가

2. **작업 완료 시**
   - [진행 중] → [x] 으로 표시
   - 전체 현황 테이블의 "완료" 개수 증가
   - 완료율 재계산

3. **하위 항목**
   - 모든 하위 항목이 완료되면 상위 항목도 완료 처리

### 완료율 계산

```
완료율 = (완료 항목 수 / 총 항목 수) × 100
```

---

## 🎯 마일스톤

### Phase 1: 긴급 수정 (1-2주)
- [ ] P1-3: list.get(0) 빈 리스트 체크 추가
- [ ] P1-4: 오타 수정
- [ ] P3-11: 미사용 import 정리

### Phase 2: 아키텍처 개선 (3-4주)
- [ ] P1-2: PickingOrderController 서비스 분리
- [ ] P2-5: @Transactional 이동
- [ ] P2-7: Raw SQL → QueryStore 이전

### Phase 3: 핵심 기능 개선 (4-6주)
- [ ] P2-6: StocktakeController TODO 구현
- [ ] P3-10: 주석 처리된 코드 정리

### Phase 4: 테스트 구축 (6-8주)
- [ ] P1-1: 테스트 코드 작성 (핵심 서비스)

---

**다음 리뷰**: 1주 후
**책임자**: 개발팀 리드
**관련 문서**: [backend-quality.md](backend-quality.md), [backend-refactoring-plan.md](../refactoring/backend-refactoring-plan.md)
