# CJ대한통운 (일반) 예약 취소

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4 — 1.3.2 인터페이스 세부, 1.3.10 (일반)예약취소 API

## 개요

이미 등록된 예약을 **운송장 상태 기준**으로 실시간 취소한다.
파라미터 구조는 예약 접수([booking.md](booking.md))와 동일하며,
`REQ_DV_CD`를 `02`(취소)로 바꾸어 **동일한 데이터를 재전송**하는 방식이다.

```
WMS(출고취소/배송취소) → CnclBook 요청 (REQ_DV_CD=02) → CJ 시스템 취소
```

**전제 조건**
- `1Day Token` 발급 완료 (→ [1day-token.md](1day-token.md))
- 취소 불가 상태가 아닐 것 (→ [취소 불가 케이스](#취소-불가-케이스) 참조)

---

## API 스펙

| 항목 | 내용 |
|------|------|
| 인터페이스명 | 예약취소 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/CnclBook` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/CnclBook` |
| Content-Type | `application/json` |
| CJ-Gateway-APIKey 헤더 | TOKEN_NUM 값 (1Day 토큰) |
| 전달 방식 | Raw JSON (Body) |

---

## 예약 접수와의 차이점 (핵심)

파라미터 목록은 예약 접수([booking.md](booking.md))와 **완전히 동일**하다.
단 하나, `REQ_DV_CD` 값만 다르다.

| Field | 예약 접수 값 | **예약 취소 값** |
|-------|------------|----------------|
| `REQ_DV_CD` | `01` (요청) | **`02` (취소)** |

나머지 모든 필드는 예약 접수 시 전송한 값을 그대로 재전송해야 한다.
특히 PK 구성 필드(`CUST_ID`, `RCPT_YMD`, `CUST_USE_NO`, `RCPT_DV`, `WORK_DV_CD`, `MPCK_KEY`, `MPCK_SEQ`)는 반드시 원본과 일치해야 한다.

---

## 요청 파라미터 요약

> 전체 파라미터 정의는 [booking.md — 요청 파라미터](booking.md#요청-파라미터) 참조.

### 취소 시 반드시 원본과 일치해야 하는 필드

| Field | 설명 | 비고 |
|-------|------|------|
| `CUST_ID` | 고객 ID | PK |
| `RCPT_YMD` | 접수일자 | PK — 예약 접수 시 사용한 날짜 |
| `CUST_USE_NO` | 고객사용번호 | PK — 취소처리 기준키, 중복이면 취소 불가 |
| `RCPT_DV` | 접수구분 | PK |
| `WORK_DV_CD` | 작업구분코드 | PK |
| `MPCK_KEY` | 합포장 키 | PK |
| `MPCK_SEQ` | 합포장 순번 | PK |

### 취소 시 변경하는 필드

| Field | 예약 접수 | **예약 취소** |
|-------|---------|------------|
| `REQ_DV_CD` | `01` | **`02`** |
| `TOKEN_NUM` | 발급된 토큰 | 현재 유효한 토큰 (갱신 가능) |

---

## 응답 파라미터

| Field | 설명 | Type |
|-------|------|------|
| `RESULT_CD` | 결과코드 (`S`: 성공, `E`: 실패) | VARCHAR2(10) |
| `RESULT_DETAIL` | 결과상세 — 실패 시 에러내용 | VARCHAR2(5000) |

```json
// 성공
{"RESULT_CD": "S", "RESULT_DETAIL": "Success."}

// 실패
{"RESULT_CD": "E", "RESULT_DETAIL": "ORA-00001"}
```

---

## 샘플 요청

```json
{
  "DATA": {
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z",
    "CUST_ID": "계약된 고객사코드",
    "RCPT_YMD": "20250515",
    "CUST_USE_NO": "ORD-20250515-001",
    "RCPT_DV": "01",
    "WORK_DV_CD": "01",
    "REQ_DV_CD": "02",
    "MPCK_KEY": "20250515_고객ID_ORD-20250515-001",
    "CAL_DV_CD": "1",
    "FRT_DV_CD": "03",
    "CNTR_ITEM_CD": "01",
    "BOX_TYPE_CD": "02",
    "BOX_QTY": "1",
    "FRT": "",
    "CUST_MGMT_DLCM_CD": "계약된 고객사코드",
    "SENDR_NM": "출발지 창고명",
    "SENDR_TEL_NO1": "02", "SENDR_TEL_NO2": "1577", "SENDR_TEL_NO3": "1111",
    "SENDR_CELL_NO1": "02", "SENDR_CELL_NO2": "1577", "SENDR_CELL_NO3": "1111",
    "SENDR_ZIP_NO": "000000",
    "SENDR_ADDR": "서울 송파구 무순무순로",
    "SENDR_DETAIL_ADDR": "000동 000호",
    "RCVR_NM": "수신자명",
    "RCVR_TEL_NO1": "02", "RCVR_TEL_NO2": "1588", "RCVR_TEL_NO3": "1111",
    "RCVR_CELL_NO1": "02", "RCVR_CELL_NO2": "1588", "RCVR_CELL_NO3": "1111",
    "RCVR_ZIP_NO": "000000",
    "RCVR_ADDR": "경기도 의왕시 무순무순로",
    "RCVR_DETAIL_ADDR": "예시아파트 000동 000호",
    "INVC_NO": "",
    "PRT_ST": "01",
    "ARTICLE_AMT": "10000",
    "REMARK_1": "배송 요청사항",
    "REMARK_2": "", "REMARK_3": "",
    "COD_YN": "N",
    "DLV_DV": "01",
    "MPCK_SEQ": "1",
    "ARRAY": [
      {
        "MPCK_SEQ": "1",
        "GDS_NM": "상품명",
        "GDS_QTY": "1",
        "UNIT_CD": "1"
      }
    ]
  }
}
```

---

## 취소 불가 케이스

| 케이스 | 이유 |
|--------|------|
| 운송장 자체 출력 후 예약 접수한 경우 (상품 미발송) | 오프라인 출고 상태 확인 불가 — 단, 상품 미발송이면 택배운임에서 제외 |
| 운송장 스캔 완료 | 택배기사 인수 처리로 간주 |
| 대한통운 운송장 출력 완료 | 출력 이후 취소 불가 |

---

## 구현 방안

### 1. WMS 연동 흐름

```
출고취소 요청 (shipment_orders 상태 변경)
    ↓
취소 가능 여부 사전 확인
  - booking_result_cd = 'S' (예약 접수 성공 이력 확인)
  - 운송장 스캔 여부, 출력 완료 여부
    ↓
CjBookingCancelService.cancel(domainId, contractNo, shipmentNo)
    ↓
  DB에서 예약 접수 원본 payload 조회
  TOKEN_NUM 갱신 + REQ_DV_CD = '02' 로 변경
  CnclBook 호출
    ↓
결과 저장 (shipment_orders.cancel_result_cd)
```

### 2. 원본 payload 보존 전략

취소 API는 예약 접수 시 전송한 데이터를 그대로 재사용해야 하므로,
예약 접수 성공 시 요청 본문을 DB에 저장해두는 것이 가장 안전하다.

**방법 A — payload JSON 컬럼 저장 (권장)**

```sql
-- shipment_orders 에 컬럼 추가 (마이그레이션)
ALTER TABLE shipment_orders
  ADD COLUMN cj_booking_payload  TEXT,    -- 예약 접수 요청 JSON 원본
  ADD COLUMN cj_booking_result_cd VARCHAR(2),
  ADD COLUMN cj_cancel_result_cd  VARCHAR(2);
```

```java
// 예약 접수 성공 후 저장
shipmentOrder.setCjBookingPayload(objectMapper.writeValueAsString(requestData));
shipmentOrder.setCjBookingResultCd("S");
```

**방법 B — shipment_orders 필드에서 재조합**

payload를 저장하지 않고 취소 시점에 `shipment_orders` + `warehouses` 데이터로 재조합.
단, 예약 접수 당시와 데이터가 달라질 수 있으므로 PK 불일치 위험이 있다.

### 3. CjBookingCancelService

`AbstractQueryService`를 상속하여 `queryManager`로 직접 조회한다.
HTTP 호출은 `java.net.http.HttpClient`를 사용한다 (프로젝트 표준).

```java
@Service
public class CjBookingCancelService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjBookingCancelService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * CnclBook 호출 — 예약 취소
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID) — 예약 접수 시 사용한 계약과 동일
     * @param shipmentNo WMS 출고 주문번호 (예약 접수 시 CUST_USE_NO로 사용한 값)
     */
    @SuppressWarnings("unchecked")
    public void cancel(Long domainId, String contractNo, String shipmentNo) {
        Map<String, Object> booking = loadBookingPayload(domainId, shipmentNo);
        if (booking == null) {
            throw new ElidomRuntimeException("예약 접수 이력 없음: " + shipmentNo);
        }

        String tokenNum = cjTokenService.getToken(domainId, contractNo);
        CjContractConfig config = loadConfig(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/CnclBook";

        // 원본 payload에서 REQ_DV_CD만 02로 교체
        Map<String, Object> cancelData = new LinkedHashMap<>(booking);
        cancelData.put("TOKEN_NUM", tokenNum);
        cancelData.put("REQ_DV_CD", "02");

        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("DATA", cancelData);
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
                    "CnclBook HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo
                );
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");
            String resultDetail = (String) responseBody.get("RESULT_DETAIL");

            saveCancelResult(domainId, shipmentNo, resultCd);

            if (!"S".equals(resultCd)) {
                throw new CjApiException("CnclBook 실패: " + resultDetail);
            }

        } catch (CjApiException | ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException("CnclBook 오류: contractNo=" + contractNo, e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadBookingPayload(Long domainId, String shipmentNo) {
        String sql = """
            SELECT cj_booking_payload
            FROM shipment_orders
            WHERE domain_id = :domainId
              AND shipment_no = :shipmentNo
            LIMIT 1
            """;
        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("shipmentNo", shipmentNo);
        Map row = this.queryManager.selectBySql(sql, params, Map.class);
        if (row == null || row.get("cj_booking_payload") == null) return null;
        try {
            return OBJECT_MAPPER.readValue((String) row.get("cj_booking_payload"), Map.class);
        } catch (Exception e) {
            throw new ElidomRuntimeException("booking payload 파싱 실패", e);
        }
    }

    private void saveCancelResult(Long domainId, String shipmentNo, String resultCd) {
        String sql = """
            UPDATE shipment_orders
            SET cj_cancel_result_cd = :resultCd
            WHERE domain_id = :domainId
              AND shipment_no = :shipmentNo
            """;
        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("shipmentNo", shipmentNo);
        params.put("resultCd", resultCd);
        this.queryManager.executeBySql(sql, params);
    }

    @SuppressWarnings("unchecked")
    private CjContractConfig loadConfig(Long domainId, String contractNo) {
        String sql = """
            SELECT contract_no, api_base_url
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
        config.setApiBaseUrl((String) row.get("api_base_url"));
        return config;
    }
}
```

### 4. 취소 가능 여부 사전 검증

```java
/** 취소 가능 여부 확인 — true이면 취소 API 호출 가능 */
public boolean isCancellable(Long domainId, String shipmentNo) {
    String sql = """
        SELECT cj_booking_result_cd, cj_cancel_result_cd, prt_st
        FROM shipment_orders
        WHERE domain_id = :domainId
          AND shipment_no = :shipmentNo
        LIMIT 1
        """;
    Map<String, Object> row = queryManager.selectBySql(
        sql, Map.of("domainId", domainId, "shipmentNo", shipmentNo), Map.class
    );
    if (row == null) return false;

    // 예약 접수 성공 이력 없으면 취소 불필요
    if (!"S".equals(row.get("cj_booking_result_cd"))) return false;

    // 이미 취소 성공한 경우
    if ("S".equals(row.get("cj_cancel_result_cd"))) return false;

    // 운송장 출력 완료(02:선출력)이면 스캔 여부에 따라 취소 불가할 수 있음
    // → CJ 측에서 최종 판단하므로 일단 시도 후 에러 처리
    return true;
}
```

---

## WMS 출고 취소 흐름과의 연계 포인트

```
출고취소 API 호출 또는 화면에서 취소 요청
    ↓
OutboundCancelService
    ├── isCancellable() 확인
    ├── CjBookingCancelService.cancel()  ← 예약 접수 이력이 있을 때만
    └── shipment_orders 상태 업데이트 (CANCELLED)
```

예약 접수 이전에 출고가 취소된 경우(`cj_booking_result_cd` 없음)에는
CnclBook 호출 없이 WMS 내부 상태만 변경한다.

---

## 구현 순서

1. DB 마이그레이션: `shipment_orders`에 `cj_booking_payload`, `cj_booking_result_cd`, `cj_cancel_result_cd` 컬럼 추가
2. [booking.md](booking.md) 구현부에서 예약 접수 성공 후 `cj_booking_payload` 저장 로직 추가
3. `CjBookingCancelService.cancel()` 구현
4. `isCancellable()` 검증 로직 구현
5. 출고취소 서비스(`OutboundCancelService`)에서 취소 호출 연결

---

## 관련 API

| API | Resource | 용도 |
|-----|----------|------|
| 1Day 토큰 발행 | `ReqOneDayToken` | 인증 토큰 발급 (선행 필수) |
| (일반) 예약 접수 | `RegBook` | 취소 대상 예약 원본 |
| (일반) 상품추적 | `ReqMssGdsTrc` | 취소 전 스캔 여부 확인 용도 |
