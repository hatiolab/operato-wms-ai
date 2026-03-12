# 백엔드 테스트 가이드

> 최종 업데이트: 2026-03-12
> 기준: JUnit 5 + Mockito + Spring Boot Test

이 문서는 Operato WMS 백엔드의 테스트 작성 가이드입니다.

---

## 📋 목차

1. [개요](#1-개요)
2. [테스트 환경 설정](#2-테스트-환경-설정)
3. [단위 테스트 (Unit Test)](#3-단위-테스트-unit-test)
4. [통합 테스트 (Integration Test)](#4-통합-테스트-integration-test)
5. [API 테스트 (Controller Test)](#5-api-테스트-controller-test)
6. [테스트 데이터 관리](#6-테스트-데이터-관리)
7. [모범 사례 (Best Practices)](#7-모범-사례-best-practices)
8. [자주 발생하는 문제와 해결](#8-자주-발생하는-문제와-해결)

---

## 1. 개요

### 1.1 테스트 전략

| 테스트 유형 | 비율 | 범위 | 실행 속도 |
|------------|------|------|----------|
| 단위 테스트 (Unit) | 70% | Service, Util, QueryStore | 매우 빠름 |
| 통합 테스트 (Integration) | 20% | Service + Repository + DB | 중간 |
| API 테스트 (E2E) | 10% | Controller + 전체 스택 | 느림 |

### 1.2 테스트 우선순위

**P1 - 최우선 (반드시 작성)**:
- 비즈니스 로직이 복잡한 Service 클래스
- 상태 전이가 있는 메서드
- 재고, 주문 등 핵심 도메인 로직
- 돈이나 수량 계산 관련 로직

**P2 - 중요**:
- QueryStore의 복잡한 쿼리
- REST Controller의 주요 엔드포인트
- 유틸리티 클래스의 핵심 메서드

**P3 - 선택**:
- 단순 CRUD 메서드
- Getter/Setter
- 간단한 유틸리티 메서드

---

## 2. 테스트 환경 설정

### 2.1 의존성 추가 (build.gradle)

```gradle
dependencies {
    // 기본 Spring Boot Test
    testImplementation 'org.springframework.boot:spring-boot-starter-test'

    // JUnit 5
    testImplementation 'org.junit.jupiter:junit-jupiter-api:5.9.3'
    testRuntimeOnly 'org.junit.jupiter:junit-jupiter-engine:5.9.3'

    // Mockito
    testImplementation 'org.mockito:mockito-core:5.3.1'
    testImplementation 'org.mockito:mockito-junit-jupiter:5.3.1'

    // AssertJ (더 읽기 쉬운 assertion)
    testImplementation 'org.assertj:assertj-core:3.24.2'

    // H2 Database (테스트용 인메모리 DB)
    testImplementation 'com.h2database:h2'
}

test {
    useJUnitPlatform()
}
```

### 2.2 디렉토리 구조

```
src/
├── main/
│   └── java/
│       └── operato/wms/
│           ├── base/
│           ├── inbound/
│           │   ├── entity/
│           │   ├── rest/
│           │   ├── service/
│           │   └── query/store/
│           ├── outbound/
│           └── stock/
└── test/
    ├── java/
    │   └── operato/wms/
    │       ├── base/
    │       ├── inbound/
    │       │   ├── service/
    │       │   │   └── InboundTransactionServiceTest.java
    │       │   └── rest/
    │       │       └── InboundTransactionControllerTest.java
    │       ├── outbound/
    │       └── stock/
    └── resources/
        ├── application-test.properties
        └── test-data.sql
```

### 2.3 테스트 설정 파일

**`src/test/resources/application-test.properties`**:

```properties
# H2 인메모리 데이터베이스
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

# JPA 설정
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# 로깅 레벨
logging.level.operato.wms=DEBUG
logging.level.org.hibernate.SQL=DEBUG
```

---

## 3. 단위 테스트 (Unit Test)

### 3.1 Service 단위 테스트 기본 구조

```java
package operato.wms.inbound.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("입고 트랜잭션 서비스 테스트")
class InboundTransactionServiceTest {

    @Mock
    private ReceivingOrderRepository receivingOrderRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @InjectMocks
    private InboundTransactionService service;

    private ReceivingOrder testOrder;

    @BeforeEach
    void setUp() {
        // 테스트 데이터 준비
        testOrder = new ReceivingOrder();
        testOrder.setId("RO-001");
        testOrder.setStatus(WmsInboundConstants.STATUS_WAIT);
        testOrder.setQty(100);
    }

    @Test
    @DisplayName("입고 시작 - 정상 케이스")
    void startReceiving_Success() {
        // Given
        when(receivingOrderRepository.findById("RO-001"))
            .thenReturn(Optional.of(testOrder));

        // When
        service.startReceiving("RO-001");

        // Then
        assertThat(testOrder.getStatus())
            .isEqualTo(WmsInboundConstants.STATUS_START);
        verify(receivingOrderRepository, times(1))
            .save(testOrder);
    }

    @Test
    @DisplayName("입고 시작 - 존재하지 않는 주문")
    void startReceiving_OrderNotFound() {
        // Given
        when(receivingOrderRepository.findById("INVALID"))
            .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> service.startReceiving("INVALID"))
            .isInstanceOf(EntityNotFoundException.class)
            .hasMessageContaining("주문을 찾을 수 없습니다");
    }

    @Test
    @DisplayName("입고 시작 - 이미 시작된 주문")
    void startReceiving_AlreadyStarted() {
        // Given
        testOrder.setStatus(WmsInboundConstants.STATUS_START);
        when(receivingOrderRepository.findById("RO-001"))
            .thenReturn(Optional.of(testOrder));

        // When & Then
        assertThatThrownBy(() -> service.startReceiving("RO-001"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("이미 시작된 주문입니다");
    }

    @Test
    @DisplayName("입고 완료 - 재고 생성 확인")
    void finishReceiving_CreatesInventory() {
        // Given
        testOrder.setStatus(WmsInboundConstants.STATUS_START);
        when(receivingOrderRepository.findById("RO-001"))
            .thenReturn(Optional.of(testOrder));

        // When
        service.finishReceiving("RO-001");

        // Then
        assertThat(testOrder.getStatus())
            .isEqualTo(WmsInboundConstants.STATUS_END);
        verify(inventoryRepository, times(1))
            .save(any(Inventory.class));
    }
}
```

### 3.2 주요 Mockito 메서드

```java
// Mock 객체 동작 정의
when(repository.findById(anyString())).thenReturn(Optional.of(entity));
when(repository.save(any())).thenReturn(entity);
doThrow(new RuntimeException()).when(repository).delete(any());

// 메서드 호출 검증
verify(repository, times(1)).save(any());
verify(repository, never()).delete(any());
verify(repository, atLeastOnce()).findAll();

// ArgumentCaptor 사용
ArgumentCaptor<Inventory> captor = ArgumentCaptor.forClass(Inventory.class);
verify(inventoryRepository).save(captor.capture());
Inventory savedInventory = captor.getValue();
assertThat(savedInventory.getQty()).isEqualTo(100);
```

### 3.3 AssertJ 주요 메서드

```java
// 기본 검증
assertThat(actual).isEqualTo(expected);
assertThat(actual).isNotNull();
assertThat(number).isGreaterThan(10);
assertThat(string).startsWith("RO-");

// 컬렉션 검증
assertThat(list).hasSize(3);
assertThat(list).contains(item1, item2);
assertThat(list).extracting("id").contains("RO-001", "RO-002");

// 예외 검증
assertThatThrownBy(() -> service.method())
    .isInstanceOf(IllegalStateException.class)
    .hasMessageContaining("에러 메시지");

// 객체 필드 검증
assertThat(order)
    .hasFieldOrPropertyWithValue("status", "WAIT")
    .hasFieldOrPropertyWithValue("qty", 100);
```

---

## 4. 통합 테스트 (Integration Test)

### 4.1 Spring Boot Test 기본 구조

```java
package operato.wms.inbound.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional  // 각 테스트 후 롤백
@DisplayName("입고 트랜잭션 서비스 통합 테스트")
class InboundTransactionServiceIntegrationTest {

    @Autowired
    private InboundTransactionService service;

    @Autowired
    private ReceivingOrderRepository receivingOrderRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    private ReceivingOrder testOrder;

    @BeforeEach
    void setUp() {
        // 실제 DB에 테스트 데이터 저장
        testOrder = new ReceivingOrder();
        testOrder.setOrderNo("RO-001");
        testOrder.setStatus(WmsInboundConstants.STATUS_WAIT);
        testOrder.setQty(100);
        testOrder = receivingOrderRepository.save(testOrder);
    }

    @Test
    @DisplayName("입고 시작 → 완료 전체 플로우")
    void fullReceivingFlow() {
        // 1. 입고 시작
        service.startReceiving(testOrder.getOrderNo());

        ReceivingOrder started = receivingOrderRepository
            .findById(testOrder.getId()).orElseThrow();
        assertThat(started.getStatus())
            .isEqualTo(WmsInboundConstants.STATUS_START);

        // 2. 입고 완료
        service.finishReceiving(testOrder.getOrderNo());

        ReceivingOrder finished = receivingOrderRepository
            .findById(testOrder.getId()).orElseThrow();
        assertThat(finished.getStatus())
            .isEqualTo(WmsInboundConstants.STATUS_END);

        // 3. 재고 생성 확인
        List<Inventory> inventories = inventoryRepository
            .findByOrderNo(testOrder.getOrderNo());
        assertThat(inventories).hasSize(1);
        assertThat(inventories.get(0).getQty()).isEqualTo(100);
    }

    @Test
    @DisplayName("동시 입고 시작 시도 - 낙관적 락 테스트")
    void concurrentStartReceiving() throws Exception {
        CountDownLatch latch = new CountDownLatch(2);
        AtomicInteger successCount = new AtomicInteger(0);

        // 2개의 스레드가 동시에 입고 시작 시도
        for (int i = 0; i < 2; i++) {
            new Thread(() -> {
                try {
                    service.startReceiving(testOrder.getOrderNo());
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    // 예상된 예외
                } finally {
                    latch.countDown();
                }
            }).start();
        }

        latch.await();

        // 1개만 성공해야 함
        assertThat(successCount.get()).isEqualTo(1);
    }
}
```

### 4.2 TestContainers 사용 (PostgreSQL)

```java
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class InboundServiceTestContainersTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private InboundTransactionService service;

    @Test
    void testWithRealPostgreSQL() {
        // 실제 PostgreSQL 환경에서 테스트
    }
}
```

---

## 5. API 테스트 (Controller Test)

### 5.1 MockMvc를 사용한 Controller 테스트

```java
package operato.wms.inbound.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InboundTransactionController.class)
@DisplayName("입고 트랜잭션 Controller 테스트")
class InboundTransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InboundTransactionService service;

    @Test
    @DisplayName("POST /rest/inbound/start - 입고 시작 API")
    void startReceiving() throws Exception {
        // Given
        String orderNo = "RO-001";
        given(service.startReceiving(orderNo)).willReturn(true);

        // When & Then
        mockMvc.perform(post("/rest/inbound/start")
                .param("orderNo", orderNo)
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("GET /rest/inbound/{id} - 입고 조회 API")
    void getReceivingOrder() throws Exception {
        // Given
        ReceivingOrder order = new ReceivingOrder();
        order.setId("RO-001");
        order.setStatus("WAIT");
        given(service.findById("RO-001")).willReturn(order);

        // When & Then
        mockMvc.perform(get("/rest/inbound/RO-001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("RO-001"))
            .andExpect(jsonPath("$.status").value("WAIT"));
    }

    @Test
    @DisplayName("POST /rest/inbound - 입고 생성 API")
    void createReceivingOrder() throws Exception {
        // Given
        ReceivingOrder order = new ReceivingOrder();
        order.setOrderNo("RO-001");
        order.setQty(100);

        ReceivingOrder created = new ReceivingOrder();
        created.setId("1");
        created.setOrderNo("RO-001");
        created.setQty(100);
        given(service.create(any(ReceivingOrder.class))).willReturn(created);

        // When & Then
        mockMvc.perform(post("/rest/inbound")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(order)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("1"))
            .andExpect(jsonPath("$.orderNo").value("RO-001"));
    }
}
```

### 5.2 전체 스택 통합 테스트

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("입고 API E2E 테스트")
class InboundApiE2ETest {

    @Autowired
    private TestRestTemplate restTemplate;

    @LocalServerPort
    private int port;

    @Test
    @DisplayName("입고 전체 플로우 E2E 테스트")
    void fullInboundFlow() {
        String baseUrl = "http://localhost:" + port + "/rest/inbound";

        // 1. 입고 주문 생성
        ReceivingOrder order = new ReceivingOrder();
        order.setOrderNo("RO-001");
        order.setQty(100);

        ResponseEntity<ReceivingOrder> createResponse = restTemplate
            .postForEntity(baseUrl, order, ReceivingOrder.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String orderId = createResponse.getBody().getId();

        // 2. 입고 시작
        ResponseEntity<String> startResponse = restTemplate
            .postForEntity(baseUrl + "/start?orderNo=RO-001", null, String.class);

        assertThat(startResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 3. 입고 조회
        ResponseEntity<ReceivingOrder> getResponse = restTemplate
            .getForEntity(baseUrl + "/" + orderId, ReceivingOrder.class);

        assertThat(getResponse.getBody().getStatus())
            .isEqualTo(WmsInboundConstants.STATUS_START);
    }
}
```

---

## 6. 테스트 데이터 관리

### 6.1 Test Fixture 빌더 패턴

```java
public class ReceivingOrderTestBuilder {

    private String id = "RO-001";
    private String orderNo = "RO-001";
    private String status = WmsInboundConstants.STATUS_WAIT;
    private Integer qty = 100;

    public static ReceivingOrderTestBuilder builder() {
        return new ReceivingOrderTestBuilder();
    }

    public ReceivingOrderTestBuilder id(String id) {
        this.id = id;
        return this;
    }

    public ReceivingOrderTestBuilder status(String status) {
        this.status = status;
        return this;
    }

    public ReceivingOrderTestBuilder qty(Integer qty) {
        this.qty = qty;
        return this;
    }

    public ReceivingOrder build() {
        ReceivingOrder order = new ReceivingOrder();
        order.setId(id);
        order.setOrderNo(orderNo);
        order.setStatus(status);
        order.setQty(qty);
        return order;
    }
}

// 사용 예
ReceivingOrder order = ReceivingOrderTestBuilder.builder()
    .status(WmsInboundConstants.STATUS_START)
    .qty(200)
    .build();
```

### 6.2 @Sql을 사용한 데이터 준비

```java
@SpringBootTest
@Sql(scripts = "/test-data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/cleanup.sql", executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
class InboundServiceWithSqlTest {

    @Test
    void test() {
        // test-data.sql이 실행된 후 테스트
    }
}
```

**`src/test/resources/test-data.sql`**:

```sql
INSERT INTO receiving_orders (id, order_no, status, qty)
VALUES ('RO-001', 'RO-001', 'WAIT', 100);

INSERT INTO receiving_orders (id, order_no, status, qty)
VALUES ('RO-002', 'RO-002', 'START', 200);
```

---

## 7. 모범 사례 (Best Practices)

### 7.1 테스트 명명 규칙

```java
// ✅ Good: 메서드명_시나리오_예상결과
@Test
void startReceiving_WhenOrderIsWaiting_ThenStatusChangesToStart() { }

@Test
void startReceiving_WhenOrderNotFound_ThenThrowsException() { }

// ✅ Good: DisplayName 사용
@Test
@DisplayName("입고 시작 - 대기 상태 주문을 시작 상태로 변경")
void startReceivingTest1() { }

// ❌ Bad: 불명확한 이름
@Test
void test1() { }
```

### 7.2 Given-When-Then 패턴

```java
@Test
void test() {
    // Given (준비): 테스트에 필요한 데이터와 환경 설정
    ReceivingOrder order = new ReceivingOrder();
    order.setStatus("WAIT");
    when(repository.findById("RO-001")).thenReturn(Optional.of(order));

    // When (실행): 테스트할 메서드 호출
    service.startReceiving("RO-001");

    // Then (검증): 결과 확인
    assertThat(order.getStatus()).isEqualTo("START");
    verify(repository).save(order);
}
```

### 7.3 테스트 독립성 유지

```java
// ✅ Good: 각 테스트가 독립적
@BeforeEach
void setUp() {
    // 각 테스트마다 새로운 데이터 준비
}

// ❌ Bad: 테스트 간 의존성
static ReceivingOrder sharedOrder;  // 공유 변수 사용 금지

@Test
void test1() {
    sharedOrder = new ReceivingOrder();  // 다른 테스트에 영향
}

@Test
void test2() {
    sharedOrder.setStatus("START");  // test1에 의존
}
```

### 7.4 하나의 테스트는 하나의 동작만 검증

```java
// ✅ Good: 하나의 동작만 테스트
@Test
void startReceiving_ChangesStatus() {
    service.startReceiving("RO-001");
    assertThat(order.getStatus()).isEqualTo("START");
}

@Test
void startReceiving_SavesOrder() {
    service.startReceiving("RO-001");
    verify(repository).save(order);
}

// ❌ Bad: 여러 동작을 한 테스트에서 검증
@Test
void startReceiving_DoesEverything() {
    service.startReceiving("RO-001");
    assertThat(order.getStatus()).isEqualTo("START");
    verify(repository).save(order);
    verify(inventoryService).checkStock();
    // ... 너무 많은 검증
}
```

---

## 8. 자주 발생하는 문제와 해결

### 8.1 LazyInitializationException

```java
// ❌ Problem
@Test
void test() {
    ReceivingOrder order = repository.findById("RO-001").get();
    order.getItems().size();  // LazyInitializationException!
}

// ✅ Solution 1: @Transactional 추가
@Test
@Transactional
void test() {
    ReceivingOrder order = repository.findById("RO-001").get();
    order.getItems().size();  // OK
}

// ✅ Solution 2: fetch join 사용
@Query("SELECT o FROM ReceivingOrder o LEFT JOIN FETCH o.items WHERE o.id = :id")
ReceivingOrder findByIdWithItems(@Param("id") String id);
```

### 8.2 테스트 간 데이터 충돌

```java
// ✅ Solution 1: @Transactional로 롤백
@SpringBootTest
@Transactional  // 각 테스트 후 자동 롤백
class ServiceTest { }

// ✅ Solution 2: @DirtiesContext
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ServiceTest { }

// ✅ Solution 3: @BeforeEach에서 데이터 정리
@BeforeEach
void setUp() {
    repository.deleteAll();
}
```

### 8.3 Mock 객체가 null을 반환

```java
// ❌ Problem
@Mock
private ReceivingOrderRepository repository;

@Test
void test() {
    ReceivingOrder order = repository.findById("RO-001").get();  // NullPointerException!
}

// ✅ Solution: Mock 동작 정의
@Test
void test() {
    when(repository.findById("RO-001"))
        .thenReturn(Optional.of(new ReceivingOrder()));

    ReceivingOrder order = repository.findById("RO-001").get();  // OK
}
```

### 8.4 @Transactional이 작동하지 않음

```java
// ❌ Problem: private 메서드
@Transactional
private void privateMethod() { }  // 트랜잭션 적용 안 됨

// ✅ Solution: public 메서드로 변경
@Transactional
public void publicMethod() { }  // OK

// ❌ Problem: 같은 클래스 내부 호출
public void outerMethod() {
    this.innerMethod();  // 트랜잭션 적용 안 됨
}

@Transactional
public void innerMethod() { }

// ✅ Solution: 다른 Bean에서 호출
@Autowired
private SameService self;

public void outerMethod() {
    self.innerMethod();  // OK
}
```

---

## 📚 참고 자료

- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [AssertJ Documentation](https://assertj.github.io/doc/)
- [Spring Boot Testing](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing)

---

**다음 단계**: [backend-quality-checklist.md](backend-quality-checklist.md)의 P1-1 테스트 코드 작성 시작

**작성자**: 개발팀
**검토자**: 시니어 개발자
