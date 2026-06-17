# CJ대한통운 주소정제 API

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4 — 1.3.4. (공통)주소 정제 API

## 개요

고객사 주소 문자열을 CJ대한통운 시스템에서 정제하여 배송 권역 코드, 집배점 정보 등을 반환한다.
택배 예약 접수(`RegBook`) 전에 수신자 주소를 검증하고 배송 가능 여부를 확인하는 용도로 사용한다.

---

## API 스펙

| 항목 | 내용 |
|------|------|
| 전송 주기 | 수시 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/ReqAddrRfnSm` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/ReqAddrRfnSm` |
| Content-Type | `application/json` |
| Accept | `application/json` |

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
    "CLNTNUM": "계약된 고객ID",
    "CLNTMGMCUSTCD": "계약된 고객ID",
    "ADDRESS": "서울특별시 중구 세종대로 9길 53 대한통운 12층",
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z"
  }
}
```

| Field | 설명 | Type | 필수 |
|-------|------|------|------|
| TOKEN_NUM | 1Day 토큰 발행 API로 발급받은 토큰번호 | VARCHAR2(40) | Y |
| CLNTNUM | 고객 ID (계약된 고객사 코드) | VARCHAR2(20) | Y |
| CLNTMGMCUSTCD | 협력사 코드 (없을 경우 고객ID로 대체) | VARCHAR2(20) | - |
| USER_ID | 중개업체 ID (중개업체 사용 시 필수) | VARCHAR2(20) | - |
| ADDRESS | 정제할 주소 | VARCHAR2(100) | Y |

### 응답 파라미터 (Response)

```json
{
  "RESULT_CD": "S",
  "RESULT_DETAIL": "Success",
  "DATA": {
    "CLSFCD": "5D32",
    "SUBCLSFCD": "1g",
    "CLSFADDR": "서소문 58-12 대한통운",
    "CLLDLVBRANNM": "중구소공",
    "CLLDLVEMPNM": "##",
    "CLLDLVEMPNICKNM": "G03-01",
    "RSPSDIV": "01",
    "P2PCD": null
  }
}
```

| Field | 설명 | Type |
|-------|------|------|
| RESULT_CD | 결과 코드 (`S`: 성공, `E`: 실패) | VARCHAR2(10) |
| RESULT_DETAIL | 결과 상세 (실패 시 에러 내용) | VARCHAR2(5000) |
| CLSFCD | 도착지 코드 | VARCHAR2(20) |
| SUBCLSFCD | 도착지 서브 코드 | VARCHAR2(20) |
| CLSFADDR | 주소 약칭 | VARCHAR2(100) |
| CLLDLVBRANNM | 배송집배점 명 | VARCHAR2(100) |
| CLLDLVEMPNM | 배송SM명 | VARCHAR2(100) |
| CLLDLVEMPNICKNM | SM분류코드 | VARCHAR2(100) |
| RSPSDIV | 권역 구분 | VARCHAR2(3) |
| P2PCD | P2P코드 | VARCHAR2(4) |

### 주소정제 에러 코드

| RESULT_CD | 내용 |
|-----------|------|
| S | 정제 성공 |
| -20000 | 입력 파라미터 중 코드 값이 잘못됨 |
| -20001 | CJ 대한통운에 등록되지 않은 고객 ID |
| -20002 | 입력 주소 분석 실패 |
| -20003 | 집배권역(집화·배송대리점) 설정값 없음 |
| -20004 | 집배권역 반환된 점소정보가 폐점/사용중지 |
| -20005 | 배송·집화 처리 사원이 설정되지 않음 |
| -20006 | 허브터미널에서 도착지 코드 추출 실패 |
| -20007 | 서버터미널에서 분류주소 추출 실패 |
| -20008 | 고객ID 계약 만료 또는 계약 없음 |
| -20009 | 입력 주소에 대해 배송이 불가능한 경우 |
| -20010 | 배송지연 발생가능 지역 |

---

## 구현 방안

### 1. CjAddressService

`AbstractQueryService`를 상속하여 `queryManager`로 `courier_contracts`를 직접 조회한다.
HTTP 호출은 `java.net.http.HttpClient`를 사용한다 (프로젝트 표준, `CjTokenService`와 동일).

```java
@Component
public class CjAddressService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjAddressService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * 주소정제 — 예약 접수 전 수신자 주소 검증 및 배송 권역 조회
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID) — 도메인 내 다수 계약 지원
     * @param address    정제할 주소 문자열
     * @return 정제 결과 (권역 코드, 집배점 등)
     */
    @SuppressWarnings("unchecked")
    public CjAddressResult refineAddress(Long domainId, String contractNo, String address) {
        CjContractConfig config = loadConfig(domainId, contractNo);
        String tokenNum = cjTokenService.getToken(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/ReqAddrRfnSm";

        try {
            Map<String, Object> data = new HashMap<>();
            data.put("TOKEN_NUM", tokenNum);
            data.put("CLNTNUM", config.getCustId());
            data.put("CLNTMGMCUSTCD", config.getCustId());
            data.put("ADDRESS", address);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("DATA", data);

            String requestJson = OBJECT_MAPPER.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("CJ-Gateway-APIKey", tokenNum)
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ElidomRuntimeException(
                    "CJ 주소정제 HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo
                );
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");
            if (!"S".equals(resultCd)) {
                String detail = (String) responseBody.get("RESULT_DETAIL");
                throw new CjAddressRefinementException(resultCd, detail, address);
            }

            Map<String, Object> responseData = (Map<String, Object>) responseBody.get("DATA");
            CjAddressResult result = new CjAddressResult();
            result.setClsfCd((String) responseData.get("CLSFCD"));
            result.setSubClsfCd((String) responseData.get("SUBCLSFCD"));
            result.setClsfAddr((String) responseData.get("CLSFADDR"));
            result.setDeliveryBranchNm((String) responseData.get("CLLDLVBRANNM"));
            result.setDeliverySmNm((String) responseData.get("CLLDLVEMPNM"));
            result.setSmClassNm((String) responseData.get("CLLDLVEMPNICKNM"));
            result.setRspsDivision((String) responseData.get("RSPSDIV"));
            result.setP2pCd((String) responseData.get("P2PCD"));
            return result;

        } catch (CjAddressRefinementException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException(
                "CJ 주소정제 오류: contractNo=" + contractNo + ", address=" + address, e
            );
        }
    }

    /** courier_contracts에서 계약 설정 로드 */
    @SuppressWarnings("unchecked")
    private CjContractConfig loadConfig(Long domainId, String contractNo) {
        String sql = """
            SELECT contract_no, contract_sub_no, api_key, api_base_url
            FROM courier_contracts
            WHERE domain_id   = :domainId
              AND dlv_vend_cd = 'cj'
              AND contract_no = :contractNo
              AND del_flag IS NOT TRUE
            """;

        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("contractNo", contractNo);

        Map row = this.queryManager.selectBySql(sql, params, Map.class);
        if (row == null) {
            throw new ElidomRuntimeException(
                "CJ 계약 정보 없음: domainId=" + domainId + ", contractNo=" + contractNo
            );
        }

        CjContractConfig config = new CjContractConfig();
        config.setDomainId(domainId);
        config.setContractNo((String) row.get("contract_no"));
        config.setCustId((String) row.get("contract_no"));
        config.setBizRegNum((String) row.get("contract_sub_no"));
        config.setApiKey((String) row.get("api_key"));
        config.setApiBaseUrl((String) row.get("api_base_url"));
        return config;
    }
}
```

### 2. 결과 VO

Lombok 미사용 — 수동 getter/setter 작성.

```java
public class CjAddressResult {
    private String clsfCd;           // 도착지 코드
    private String subClsfCd;        // 도착지 서브 코드
    private String clsfAddr;         // 주소 약칭
    private String deliveryBranchNm; // 배송집배점 명
    private String deliverySmNm;     // 배송SM명
    private String smClassNm;        // SM분류코드
    private String rspsDivision;     // 권역 구분
    private String p2pCd;            // P2P코드

    public String getClsfCd() { return clsfCd; }
    public void setClsfCd(String clsfCd) { this.clsfCd = clsfCd; }

    public String getSubClsfCd() { return subClsfCd; }
    public void setSubClsfCd(String subClsfCd) { this.subClsfCd = subClsfCd; }

    public String getClsfAddr() { return clsfAddr; }
    public void setClsfAddr(String clsfAddr) { this.clsfAddr = clsfAddr; }

    public String getDeliveryBranchNm() { return deliveryBranchNm; }
    public void setDeliveryBranchNm(String deliveryBranchNm) { this.deliveryBranchNm = deliveryBranchNm; }

    public String getDeliverySmNm() { return deliverySmNm; }
    public void setDeliverySmNm(String deliverySmNm) { this.deliverySmNm = deliverySmNm; }

    public String getSmClassNm() { return smClassNm; }
    public void setSmClassNm(String smClassNm) { this.smClassNm = smClassNm; }

    public String getRspsDivision() { return rspsDivision; }
    public void setRspsDivision(String rspsDivision) { this.rspsDivision = rspsDivision; }

    public String getP2pCd() { return p2pCd; }
    public void setP2pCd(String p2pCd) { this.p2pCd = p2pCd; }
}
```

### 3. WMS 연동 흐름

주소정제는 **출하 주문(ShipmentOrder) 확정 또는 포장 완료 시점**에 수신자 주소를 검증하는 용도로 호출한다.

```
출하 주문 확정 (CONFIRMED)
  └─ CjAddressService.refineAddress(domainId, contractNo, rcvrAddr)
       ├─ 성공 → 권역 코드 저장, 예약 접수(RegBook) 진행 가능
       └─ 실패 (-20009 배송불가 등) → 주문 홀드 처리, 담당자 알림
```

#### 호출 지점 예시

```java
// FulfillmentPackingService 또는 ShipmentOrderService에서
// contractNo는 출하 주문에 지정된 택배 계약 번호 (courier_contracts.contract_no)
CjAddressResult addrResult = cjAddressService.refineAddress(
    domainId,
    order.getCourierContractNo(),
    order.getRcvrAddr() + " " + order.getRcvrDetailAddr()
);

// 배송 불가 에러코드 처리
// -20009: 배송불가 지역 → 주문 상태를 HOLD로 변경
// -20010: 배송지연 가능 지역 → 경고 메시지만 표시
```

### 4. 예외 처리

```java
public class CjAddressRefinementException extends RuntimeException {
    private final String resultCd;
    private final String address;

    public boolean isUndeliverable() {
        return "-20009".equals(resultCd);
    }

    public boolean isDelayPossible() {
        return "-20010".equals(resultCd);
    }
}
```

---

## 구현 순서

1. `CjAddressResult` VO 작성 (수동 getter/setter)
2. `CjAddressRefinementException` 예외 클래스 작성
3. `CjAddressService` 구현 (`AbstractQueryService` 상속, `CjTokenService` 주입)
4. 출하 주문 확정 / 포장 완료 서비스에서 `refineAddress(domainId, contractNo, address)` 호출 연동
5. 배송 불가(-20009) 발생 시 주문 홀드 처리 로직 추가

---

## 관련 문서

- [1day-token.md](1day-token.md) — 토큰 발행 (모든 API 호출 전 필수)
- [README.md](README.md) — CJ 연동 개요 및 설정
