# CJ대한통운 운송장 번호 생성

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4 — 1.3.6. 운송장 번호 생성 API

## 개요

CJ대한통운 운송장 번호 발급 방식은 두 가지다.

| 방식 | 설명 | 사용 조건 |
|------|------|-----------|
| **대역 방식** | CJ로부터 사전 발급받은 번호 대역을 `courier_contracts`에 등록 후 순차 채번 | 번호 대역 계약이 있는 경우 |
| **API 채번 방식** | 포장 시점마다 `ReqInvcNo` API를 호출하여 번호를 건별 발급 | 번호 대역이 없는 경우 |

### 대역 방식 채번 룰

CJ 공식 API 가이드(V3.9.4)에는 대역 방식의 채번 알고리즘이 별도 명시되어 있지 않다.
대역은 **CJ가 고객사에 사전 발급한 연속 번호 범위**이므로, `start_bandwidth`부터 `end_bandwidth`까지
**순번(+1) 방식으로 순차 채번**하는 것이 올바른 방법이다.

> **주의**: 대역 방식에서 번호는 고객사가 직접 관리하므로, 동시 발급 충돌 방지를 위해
> Java 레벨 synchronized가 아닌 **DB 레벨 원자적 UPDATE**가 필수다.

### API 채번 방식 제약 사항 (FAQ 1.4.9)

CJ 공식 FAQ에 명시된 중요 제약:

| 제약 | 내용 |
|------|------|
| **당일 사용 원칙** | 발급한 운송장 번호는 **생성 당일** 사용을 원칙으로 함 |
| **미사용 누적 금지** | 미사용 번호가 다수 발생할 경우 API 호출이 **제한(차단)**될 수 있음 |
| **1회 1건 원칙** | API 1회 호출로 1건만 발급 가능 (배치 발급 불가) |

→ API 채번 방식은 포장 직전 시점에만 호출하고, 사전 선행 발급은 금지해야 한다.

---

## API 스펙 — ReqInvcNo

| 항목 | 내용 |
|------|------|
| 전송 주기 | 수시 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/ReqInvcNo` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/ReqInvcNo` |
| Content-Type | `application/json` |

> **주의**: 다수의 운송장 번호가 필요한 경우 생성 건수만큼 API를 반복 호출해야 한다.

### 요청 헤더

```http
CJ-Gateway-APIKey: {TOKEN_NUM}
Content-Type: application/json
Accept: application/json
```

### 요청 파라미터 (Request)

```json
{
  "DATA": {
    "CLNTNUM": "계약된 고객ID를 넣어 주세요",
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z"
  }
}
```

| Field | 설명 | Type | 필수 |
|-------|------|------|------|
| TOKEN_NUM | 1Day 토큰번호 | VARCHAR2(40) | Y |
| CLNTNUM | 고객 ID (계약된 고객사 코드) | VARCHAR2(20) | Y |
| USER_ID | 중개업체 ID (중개업체 사용 시 필수) | VARCHAR2(20) | N |

### 응답 파라미터 (Response)

```json
{
  "RESULT_CD": "S",
  "RESULT_DETAIL": "Success",
  "DATA": {
    "INVC_NO": "650000000033"
  }
}
```

| Field | 설명 | Type |
|-------|------|------|
| RESULT_CD | 결과코드 (`S`: 성공, `E`: 실패) | VARCHAR2(10) |
| RESULT_DETAIL | 결과상세 (실패 시 에러내용) | VARCHAR2(5000) |
| INVC_NO | 발급된 운송장 번호 | VARCHAR2(20) |

---

## courier_contracts 테이블 — 대역 방식 구조

```sql
-- 대역 방식에서 활용되는 핵심 컬럼
SELECT
    id,
    dlv_vend_cd,       -- 택배사 코드 (CJ001)
    contract_no,       -- 계약 번호
    start_bandwidth,   -- 운송장 번호 대역 시작 (예: 621000000001)
    end_bandwidth,     -- 운송장 번호 대역 종료 (예: 621000001000)
    current_no,        -- 현재까지 채번된 마지막 번호
    total_cnt,         -- 총 발급 가능 수량
    use_cnt,           -- 사용된 수량
    status             -- 계약 상태
FROM courier_contracts
WHERE domain_id = :domainId
  AND dlv_vend_cd = 'cj'
  AND del_flag IS NOT TRUE
```

대역 방식에서는 `current_no`를 원자적으로 증가시켜 충돌 없이 채번한다.

---

## 구현 방안

### 1. CjWaybillService — 통합 채번 서비스

`AbstractQueryService`를 상속하여 `queryManager`로 직접 조회한다.
HTTP 호출은 `java.net.http.HttpClient`를 사용한다 (프로젝트 표준).

```java
@Service
public class CjWaybillService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjWaybillService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * 운송장 번호 발급 — 대역 방식 우선, 없으면 API 채번
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID) — 어느 계약으로 발급할지 지정
     */
    public String issueWaybillNo(Long domainId, String contractNo) {
        CourierContract contract = loadActiveContract(domainId, contractNo);

        if (hasBandwidth(contract)) {
            return issueFromBandwidth(contract);
        } else {
            return issueFromApi(domainId, contractNo, contract);
        }
    }

    // ── 대역 방식 ──────────────────────────────────────

    private boolean hasBandwidth(CourierContract contract) {
        return contract.getStartBandwidth() != null
            && contract.getEndBandwidth() != null;
    }

    /**
     * 대역에서 순차(+1) 채번 — DB UPDATE로 원자적 처리
     * CJ 가이드에 별도 채번 알고리즘 없음; 연속 번호 범위를 순번으로 사용
     */
    private String issueFromBandwidth(CourierContract contract) {
        String sql = """
            UPDATE courier_contracts
               SET current_no = COALESCE(current_no, start_bandwidth - 1) + 1,
                   use_cnt    = COALESCE(use_cnt, 0) + 1,
                   updated_at = now()
             WHERE id = :id
               AND (COALESCE(current_no, start_bandwidth - 1) + 1) <= end_bandwidth
            RETURNING current_no
            """;

        Long nextNo = this.queryManager.selectBySql(
            sql, Map.of("id", contract.getId()), Long.class
        );

        if (nextNo == null) {
            throw new ElidomRuntimeException("운송장 번호 대역이 소진되었습니다. 계약 ID: " + contract.getId());
        }
        return String.valueOf(nextNo);
    }

    // ── API 채번 방식 ──────────────────────────────────

    /**
     * CJ ReqInvcNo API 호출하여 운송장 번호 발급
     */
    @SuppressWarnings("unchecked")
    private String issueFromApi(Long domainId, String contractNo, CourierContract contract) {
        String tokenNum = cjTokenService.getToken(domainId, contractNo);
        String url = contract.getApiBaseUrl() + "/ReqInvcNo";

        try {
            Map<String, Object> data = new HashMap<>();
            data.put("TOKEN_NUM", tokenNum);
            data.put("CLNTNUM", contract.getContractNo()); // CUST_ID

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("DATA", data);
            String requestJson = OBJECT_MAPPER.writeValueAsString(requestBody);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("CJ-Gateway-APIKey", tokenNum)
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ElidomRuntimeException(
                    "ReqInvcNo HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo
                );
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");
            if (!"S".equals(resultCd)) {
                throw new ElidomRuntimeException(
                    "운송장 번호 발급 실패: " + responseBody.get("RESULT_DETAIL")
                );
            }

            Map<String, Object> responseData = (Map<String, Object>) responseBody.get("DATA");
            String invcNo = (String) responseData.get("INVC_NO");

            // 사용 수량 증가
            Map<String, Object> updateParams = new HashMap<>();
            updateParams.put("id", contract.getId());
            this.queryManager.executeBySql(
                "UPDATE courier_contracts SET use_cnt = COALESCE(use_cnt,0)+1, updated_at=now() WHERE id = :id",
                updateParams
            );

            return invcNo;

        } catch (ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException("ReqInvcNo 오류: contractNo=" + contractNo, e);
        }
    }

    private CourierContract loadActiveContract(Long domainId, String contractNo) {
        String sql = """
            SELECT id, dlv_vend_cd, contract_no, api_base_url,
                   start_bandwidth, end_bandwidth, current_no, total_cnt, use_cnt
            FROM courier_contracts
            WHERE domain_id   = :domainId
              AND dlv_vend_cd = 'cj'
              AND contract_no = :contractNo
              AND del_flag IS NOT TRUE
            """;
        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("contractNo", contractNo);
        return this.queryManager.selectBySql(sql, params, CourierContract.class);
    }
}
```

### 2. WMS 연동 흐름

운송장 번호는 **포장 완료(PACKING → SHIPPED) 시점**에 발급한다.

```
포장 화면에서 [포장 완료] 버튼 클릭
  └─ FulfillmentPackingService.completePacking(domainId, orderId)
       ├─ CjWaybillService.issueWaybillNo(domainId, contractNo)
       │    ├─ 대역 방식: courier_contracts.current_no 원자적 증가
       │    └─ API 방식: ReqInvcNo 호출
       ├─ ShipmentOrder.invoiceNo 저장
       └─ 운송장 라벨 출력 (Jasper Report)
```

#### 서비스 호출 예시

```java
// FulfillmentPackingService에서
String invoiceNo = cjWaybillService.issueWaybillNo(domainId, contractNo);
order.setInvoiceNo(invoiceNo);
queryManager.update(order);
```

### 3. 대역 소진 알림

대역 방식에서 잔여 수량이 임계값 이하로 떨어지면 알림을 발생시킨다.

```java
// 채번 후 잔여 대역 확인
long remaining = contract.getEndBandwidth() - nextNo;
if (remaining < 100) {
    log.warn("CJ 운송장 번호 대역 잔여 {}건 — 재계약 필요 (contractId={})",
        remaining, contract.getId());
    // 슬랙/이메일 알림 발송
}
```

---

## 구현 순서

1. `CourierContract` VO/Entity 정비 (`start_bandwidth`, `end_bandwidth`, `current_no` 필드 포함)
2. `CjWaybillService` 구현
   - `issueFromBandwidth()` — DB UPDATE RETURNING 원자적 채번
   - `issueFromApi()` — ReqInvcNo API 호출
3. `FulfillmentPackingService.completePacking()`에서 `issueWaybillNo()` 호출 연동
4. `ShipmentOrder.invoiceNo` 저장
5. 대역 소진 임계값 알림 로직 추가

---

## 주의사항

- **API 채번 방식**:
  - 1회 API 호출로 **1건만** 발급 가능 (배치 발급 불가, CJ 정책)
  - 발급한 번호는 **생성 당일** 사용해야 한다 (CJ FAQ 1.4.9 명시)
  - 사전 선행 발급 금지 — 미사용 번호가 누적되면 API 호출이 제한될 수 있음
  - 따라서 **포장 완료 직전 시점**에만 호출할 것
- **대역 방식**:
  - `current_no` 업데이트는 반드시 **DB 레벨 원자적 UPDATE**로 처리해야 동시 발급 충돌을 방지할 수 있다 (Java 레벨 `synchronized`는 멀티 인스턴스 환경에서 미작동)
  - 채번 알고리즘은 순번(+1) 방식 — CJ 가이드에 별도 알고리즘 없음
- 발급된 운송장 번호는 예약 접수(`RegBook`) 시 `INVC_NO` 파라미터로 전달해야 한다

---

## 관련 문서

- [1day-token.md](1day-token.md) — 토큰 발행 (모든 API 호출 전 필수)
- [address-refinement.md](address-refinement.md) — 주소정제 (예약 접수 전 주소 검증)
- [README.md](README.md) — CJ 연동 개요 및 설정
