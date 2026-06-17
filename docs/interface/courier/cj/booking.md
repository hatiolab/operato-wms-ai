# CJ대한통운 (일반) 예약 접수

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4 — 1.3.2 인터페이스 세부, 1.3.7 (일반)예약 접수 API

## 개요

WMS 포장 완료 시점에 CJ대한통운 Open API로 배송 예약을 등록하는 인터페이스.
이 API를 통해 택배사는 집화 스케줄을 준비하며, 이후 상품추적이 시작된다.

```
WMS(포장완료) → RegBook 요청 → CJ 시스템 등록 → 결과 수신
                                    ↓
               실물 택배 스캔 이후 상품추적 시작
```

**전제 조건**
- `1Day Token` 발급 완료 (→ [1day-token.md](1day-token.md))
- 운송장 번호 사전 발급 시 `ReqInvcNo` 선행 (→ [waybill-number.md](waybill-number.md))

---

## API 스펙

| 항목 | 내용 |
|------|------|
| 인터페이스명 | 예약 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/RegBook` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/RegBook` |
| Content-Type | `application/json` |
| CJ-Gateway-APIKey 헤더 | TOKEN_NUM 값 (1Day 토큰) |
| 전달 방식 | Raw JSON (Body) |

---

## 요청 파라미터

### 기본 정보 (PK 복합키)

| Field | 설명 | 형식 | 필수 |
|-------|------|------|------|
| `TOKEN_NUM` | 1Day 토큰번호 | VARCHAR2(40) | Y |
| `CUST_ID` | 계약된 고객사 코드 | VARCHAR2(20) | PK |
| `RCPT_YMD` | 접수일자 | VARCHAR2(9), YYYYMMDD | PK |
| `CUST_USE_NO` | 고객사용번호 (WMS 출고 주문번호) — 취소 기준키, 중복 시 취소 불가 | VARCHAR2(50) | PK |
| `RCPT_DV` | 접수구분 `01`: 일반 / `02`: 반품 | VARCHAR2(2) | PK |
| `WORK_DV_CD` | 작업구분코드 `01`: 일반 | VARCHAR2(2) | PK |
| `REQ_DV_CD` | 요청구분코드 `01`: 요청 / `02`: 취소 | VARCHAR2(2) | PK |
| `MPCK_KEY` | 합포장 키 — 합포 없으면 `YYYYMMDD_고객ID_CUST_USE_NO` | VARCHAR2(100) | PK |
| `MPCK_SEQ` | 합포장 순번 — 합포 없으면 `1` | NUMBER(20) | PK |

### 운임 및 계약 정보

| Field | 설명 | 값 | 필수 |
|-------|------|----|------|
| `CAL_DV_CD` | 정산구분코드 | `01`: 계약 운임 | Y |
| `FRT_DV_CD` | 운임구분코드 | `01`: 선불 / `02`: 착불 / `03`: 신용 | Y |
| `CNTR_ITEM_CD` | 계약품목코드 | `01`: 일반 품목 | Y |
| `BOX_TYPE_CD` | 박스타입코드 | `01`극소/`02`소/`03`중/`04`대1/`05`이형/`06`취급제한/`07`대2 | Y |
| `BOX_QTY` | 박스 수량 | | Y |
| `FRT` | 운임 (자료 운임일 경우) | | N |
| `CUST_MGMT_DLCM_CD` | 고객관리거래처코드 (택배사 관리 업체코드) | | Y |
| `DLV_DV` | 택배구분 | `01`: 택배 (고정) | Y |

### 보내는 분

| Field | 설명 | 필수 |
|-------|------|------|
| `SENDR_NM` | 보내는분 명 | Y |
| `SENDR_TEL_NO1` / `NO2` / `NO3` | 전화번호 분리 (ex: `02` / `1577` / `1111`) | Y |
| `SENDR_CELL_NO1` / `NO2` / `NO3` | 휴대폰 분리 | N |
| `SENDR_SAFE_NO1` / `NO2` / `NO3` | 안심번호 분리 | N |
| `SENDR_ZIP_NO` | 우편번호 (6자리) | Y |
| `SENDR_ADDR` | 주소 | Y |
| `SENDR_DETAIL_ADDR` | 상세주소 | Y |

### 받는 분

| Field | 설명 | 필수 |
|-------|------|------|
| `RCVR_NM` | 받는분 명 — 반품(RCPT_DV=02)이면 계약상 고정 회수지 정보 | Y |
| `RCVR_TEL_NO1` / `NO2` / `NO3` | 전화번호 분리 | Y |
| `RCVR_CELL_NO1` / `NO2` / `NO3` | 휴대폰 분리 | N |
| `RCVR_SAFE_NO1` / `NO2` / `NO3` | 안심번호 분리 | N |
| `RCVR_ZIP_NO` | 우편번호 (6자리) | Y |
| `RCVR_ADDR` | 주소 | Y |
| `RCVR_DETAIL_ADDR` | 상세주소 | Y |

### 주문자 (선택)

| Field | 설명 | 필수 |
|-------|------|------|
| `ORDRR_NM` | 주문자 명 | N |
| `ORDRR_TEL_NO1` / `NO2` / `NO3` | 전화번호 분리 | N |
| `ORDRR_CELL_NO1` / `NO2` / `NO3` | 휴대폰 분리 | N |
| `ORDRR_ZIP_NO` / `ORDRR_ADDR` / `ORDRR_DETAIL_ADDR` | 주문자 주소 | N |

### 운송장 및 배송 옵션

| Field | 설명 | 값 | 필수 |
|-------|------|----|------|
| `INVC_NO` | 운송장 번호 — 반품(RCPT_DV=02)이면 빈칸으로 전송 | VARCHAR2(20) | N |
| `ORI_INVC_NO` | 원운송장번호 — 반품 회수 시 원 출고 운송장번호 | VARCHAR2(20) | N |
| `ORI_ORD_NO` | 원주문 번호 | VARCHAR2(100) | N |
| `PRT_ST` | 운송장 출력상태 `01`미출력 / `02`선출력 / `03`선발번 — 반품이면 `01` 고정 | VARCHAR2(3) | Y |
| `ARTICLE_AMT` | 물품가액 | NUMBER(15) | N |
| `REMARK_1` | 비고1 (배송 메시지) | VARCHAR2(1000) | N |
| `REMARK_2` | 비고2 (보내는분 비고) | VARCHAR2(1000) | N |
| `REMARK_3` | 비고3 (받는분 비고) | VARCHAR2(1000) | N |
| `COD_YN` | COD 여부 — 기본 `N` | VARCHAR2(2) | N |
| `RCPT_SERIAL` | 접수시리얼 번호 | VARCHAR2(50) | N |
| `ETC_1` ~ `ETC_5` | 기타 | VARCHAR2(500) | N |

### 상품 정보 (ARRAY)

여러 상품은 `ARRAY` 배열로 전송. 합포장 처리건수가 다수이면 `MPCK_SEQ`로 구분.

| Field | 설명 | 필수 |
|-------|------|------|
| `MPCK_SEQ` | 합포장 순번 | PK |
| `GDS_CD` | 상품코드 | N |
| `GDS_NM` | 상품명 | Y |
| `GDS_QTY` | 상품수량 | N |
| `UNIT_CD` | 단품코드 — 합포 없으면 `1` 고정 | N |
| `UNIT_NM` | 단품명 | N |
| `GDS_AMT` | 상품가액 | N |

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

## 샘플 요청 (최소 필드)

```json
{
  "DATA": {
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z",
    "CUST_ID": "계약된 고객사코드",
    "RCPT_YMD": "20250515",
    "CUST_USE_NO": "ORD-20250515-001",
    "RCPT_DV": "01",
    "WORK_DV_CD": "01",
    "REQ_DV_CD": "01",
    "MPCK_KEY": "20250515_고객ID_ORD-20250515-001",
    "CAL_DV_CD": "1",
    "FRT_DV_CD": "03",
    "CNTR_ITEM_CD": "01",
    "BOX_TYPE_CD": "02",
    "BOX_QTY": "1",
    "CUST_MGMT_DLCM_CD": "계약된 고객사코드",
    "SENDR_NM": "출발지 창고명",
    "SENDR_TEL_NO1": "02", "SENDR_TEL_NO2": "1577", "SENDR_TEL_NO3": "1111",
    "SENDR_ZIP_NO": "000000",
    "SENDR_ADDR": "서울 송파구 무순무순로",
    "SENDR_DETAIL_ADDR": "000동 000호",
    "RCVR_NM": "수신자명",
    "RCVR_TEL_NO1": "02", "RCVR_TEL_NO2": "1588", "RCVR_TEL_NO3": "1111",
    "RCVR_ZIP_NO": "000000",
    "RCVR_ADDR": "경기도 의왕시 무순무순로",
    "RCVR_DETAIL_ADDR": "예시아파트 000동 000호",
    "PRT_ST": "02",
    "INVC_NO": "111111111111",
    "DLV_DV": "01",
    "ARTICLE_AMT": "10000",
    "REMARK_1": "배송 요청사항",
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

## 핵심 규칙 및 주의사항

| 항목 | 내용 |
|------|------|
| 전송 주기 | 수시 (건별 단건 접수) |
| 대량 접수 | 단건 API 반복 호출 — 일괄 처리 API 없음 |
| PK 중복 | `CUST_ID + RCPT_YMD + CUST_USE_NO + RCPT_DV + WORK_DV_CD + REQ_DV_CD + MPCK_KEY + MPCK_SEQ` 조합이 PK |
| `CUST_USE_NO` 중복 | 취소 처리 불가 — WMS 주문번호를 고유하게 생성해야 함 |
| 합포장 키 무결성 | `MPCK_KEY`와 `MPCK_SEQ`의 조합은 반드시 무결성 보장 |
| 상품추적 시점 | 예약 접수 후 바로 추적되지 않음 — 실물 스캔 이후 추적 가능 |
| 전화번호 형식 | 반드시 3개 세그먼트로 분리하여 전송 (`010` / `1234` / `5678`) |

### 예약 취소 불가 케이스

1. **운송장 자체 출력 고객사** — 예약 접수 후 상품을 미발송해도 택배운임 청구됨
2. **운송장 스캔 완료** — 택배기사 인수 처리 이후 취소 불가
3. **대한통운 운송장 출력 후** — 출력 완료 이후 취소 불가

---

## 구현 방안

### 1. WMS 연동 흐름

```
포장 완료(fulfillment_packing_orders)
    ↓
운송장 번호 조회/발급 (INVC_NO, PRT_ST=02 선출력 또는 03 선발번)
    ↓
CjBookingService.book(domainId, contractNo, packingOrderId)
    ↓
RegBook 호출 → 결과 저장 (shipment_orders.cj_booking_result 등)
    ↓
운송장 라벨 출력
```

### 2. 전화번호 분리 유틸리티

WMS에 저장된 전화번호 (`010-1234-5678` 또는 `01012345678`)를 CJ API 형식으로 변환한다.

```java
public static String[] splitPhone(String phone) {
    if (phone == null || phone.isBlank()) return new String[]{"", "", ""};
    String digits = phone.replaceAll("[^0-9]", "");
    // 02 지역번호 처리 (9자리)
    if (digits.startsWith("02") && digits.length() == 9) {
        return new String[]{digits.substring(0, 2), digits.substring(2, 5), digits.substring(5)};
    }
    // 010/011 등 11자리
    if (digits.length() == 11) {
        return new String[]{digits.substring(0, 3), digits.substring(3, 7), digits.substring(7)};
    }
    // 02 지역번호 10자리
    if (digits.startsWith("02") && digits.length() == 10) {
        return new String[]{digits.substring(0, 2), digits.substring(2, 6), digits.substring(6)};
    }
    // 지역번호 10자리 (031-xxx-xxxx 등)
    if (digits.length() == 10) {
        return new String[]{digits.substring(0, 3), digits.substring(3, 6), digits.substring(6)};
    }
    return new String[]{digits, "", ""};
}
```

### 3. 합포장 키 생성 규칙

```java
// 합포 없는 단일 건
String mpckKey = rcptYmd + "_" + custId + "_" + custUseNo;
int mpckSeq = 1;

// 합포장 (여러 주문을 하나의 박스에)
String mpckKey = rcptYmd + "_" + custId + "_" + masterOrderNo;
int mpckSeq = itemIndex + 1; // 1부터 순번
```

### 4. CjBookingService

`AbstractQueryService`를 상속하여 `queryManager`로 `courier_contracts`를 직접 조회한다.
HTTP 호출은 `java.net.http.HttpClient`를 사용한다 (프로젝트 표준).

```java
@Service
public class CjBookingService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjBookingService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * RegBook 호출 — 단건 예약 접수
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID) — 도메인 내 다수 계약 지원
     * @param shipmentNo WMS 출고 주문번호 (CUST_USE_NO로 사용)
     * @param request    예약 접수 요청 데이터
     */
    @SuppressWarnings("unchecked")
    public CjBookingResult book(Long domainId, String contractNo, String shipmentNo, CjBookingRequest request) {
        CjContractConfig config = loadConfig(domainId, contractNo);
        String tokenNum = cjTokenService.getToken(domainId, contractNo);

        String rcptYmd = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String mpckKey = rcptYmd + "_" + config.getCustId() + "_" + shipmentNo;

        Map<String, Object> data = buildRequestBody(config, tokenNum, rcptYmd, shipmentNo, mpckKey, request);
        String url = config.getApiBaseUrl() + "/RegBook";

        try {
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
                    "RegBook HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo
                );
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");
            String resultDetail = (String) responseBody.get("RESULT_DETAIL");

            if (!"S".equals(resultCd)) {
                throw new CjApiException("RegBook 실패: " + resultDetail);
            }
            return CjBookingResult.success(shipmentNo, request.getInvcNo());

        } catch (CjApiException | ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException("RegBook 오류: contractNo=" + contractNo, e);
        }
    }

    private Map<String, Object> buildRequestBody(
        CjContractConfig config, String tokenNum,
        String rcptYmd, String custUseNo, String mpckKey,
        CjBookingRequest req
    ) {
        String[] sendrTel  = PhoneUtil.splitPhone(req.getSenderTel());
        String[] sendrCell = PhoneUtil.splitPhone(req.getSenderMobile());
        String[] rcvrTel   = PhoneUtil.splitPhone(req.getReceiverTel());
        String[] rcvrCell  = PhoneUtil.splitPhone(req.getReceiverMobile());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("TOKEN_NUM",           tokenNum);
        data.put("CUST_ID",             config.getCustId());
        data.put("RCPT_YMD",            rcptYmd);
        data.put("CUST_USE_NO",         custUseNo);
        data.put("RCPT_DV",             "01");
        data.put("WORK_DV_CD",          "01");
        data.put("REQ_DV_CD",           "01");
        data.put("MPCK_KEY",            mpckKey);
        data.put("CAL_DV_CD",           "1");
        data.put("FRT_DV_CD",           req.getFrtDvCd());
        data.put("CNTR_ITEM_CD",        "01");
        data.put("BOX_TYPE_CD",         req.getBoxTypeCd());
        data.put("BOX_QTY",             req.getBoxQty());
        data.put("CUST_MGMT_DLCM_CD",   config.getCustId());
        data.put("SENDR_NM",            req.getSenderName());
        data.put("SENDR_TEL_NO1",       sendrTel[0]);
        data.put("SENDR_TEL_NO2",       sendrTel[1]);
        data.put("SENDR_TEL_NO3",       sendrTel[2]);
        data.put("SENDR_CELL_NO1",      sendrCell[0]);
        data.put("SENDR_CELL_NO2",      sendrCell[1]);
        data.put("SENDR_CELL_NO3",      sendrCell[2]);
        data.put("SENDR_ZIP_NO",        req.getSenderZip());
        data.put("SENDR_ADDR",          req.getSenderAddr());
        data.put("SENDR_DETAIL_ADDR",   req.getSenderDetailAddr());
        data.put("RCVR_NM",             req.getReceiverName());
        data.put("RCVR_TEL_NO1",        rcvrTel[0]);
        data.put("RCVR_TEL_NO2",        rcvrTel[1]);
        data.put("RCVR_TEL_NO3",        rcvrTel[2]);
        data.put("RCVR_CELL_NO1",       rcvrCell[0]);
        data.put("RCVR_CELL_NO2",       rcvrCell[1]);
        data.put("RCVR_CELL_NO3",       rcvrCell[2]);
        data.put("RCVR_ZIP_NO",         req.getReceiverZip());
        data.put("RCVR_ADDR",           req.getReceiverAddr());
        data.put("RCVR_DETAIL_ADDR",    req.getReceiverDetailAddr());
        data.put("INVC_NO",             req.getInvcNo() != null ? req.getInvcNo() : "");
        data.put("PRT_ST",              req.getInvcNo() != null ? "02" : "01");
        data.put("ARTICLE_AMT",         req.getArticleAmt());
        data.put("REMARK_1",            req.getRemark1() != null ? req.getRemark1() : "");
        data.put("REMARK_2",            "");
        data.put("REMARK_3",            "");
        data.put("COD_YN",              "N");
        data.put("DLV_DV",              "01");
        data.put("MPCK_SEQ",            "1");
        data.put("ARRAY",               buildGoodsArray(req.getGoods()));
        return data;
    }

    private List<Map<String, Object>> buildGoodsArray(List<CjBookingRequest.Goods> goodsList) {
        if (goodsList == null || goodsList.isEmpty()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("MPCK_SEQ", "1"); item.put("GDS_NM", "상품");
            item.put("GDS_QTY", "1");  item.put("UNIT_CD", "1");
            return List.of(item);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < goodsList.size(); i++) {
            CjBookingRequest.Goods g = goodsList.get(i);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("MPCK_SEQ", String.valueOf(i + 1));
            item.put("GDS_CD",   g.getGoodsCd() != null ? g.getGoodsCd() : "");
            item.put("GDS_NM",   g.getGoodsNm());
            item.put("GDS_QTY",  g.getGoodsQty());
            item.put("UNIT_CD",  g.getUnitCd() != null ? g.getUnitCd() : "1");
            item.put("GDS_AMT",  g.getGoodsAmt() != null ? g.getGoodsAmt() : "0");
            result.add(item);
        }
        return result;
    }

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

### 5. WMS 출고 흐름과의 연계 포인트

```
shipment_orders (출고 주문)
    ↓ 피킹 완료
fulfillment_packing_orders (포장 주문)
    ↓ 포장 완료 이벤트
CjBookingService.book(domainId, contractNo, shipmentNo)
    → INVC_NO: waybill_numbers 테이블에서 사전 발급된 번호 사용
    → CUST_USE_NO: shipment_orders.shipment_no
    → GDS_NM: 출고 주문 품목명 (shipment_order_items)
    → RCVR_*: 수하인 정보 (shipment_orders.rcvr_*)
    → SENDR_*: 창고 주소 (warehouses 테이블)
    ↓ 결과 저장
shipment_orders.booking_result_cd  ('S' / 'E')
shipment_orders.booking_invc_no    (운송장 번호 확인용)
```

---

## 구현 순서

1. `PhoneUtil.splitPhone()` 유틸리티 구현 및 단위 테스트
2. `CjBookingRequest` VO / `CjBookingResult` VO 클래스 작성
3. `CjBookingService.book()` 구현
4. `shipment_orders` 테이블에 `booking_result_cd`, `booking_invc_no` 컬럼 추가 (마이그레이션)
5. 포장 완료 처리 서비스(`PackingTransactionService`)에서 `CjBookingService.book()` 호출 연결
6. 401 에러 발생 시 토큰 갱신 후 1회 재시도 로직 적용 (→ [1day-token.md](1day-token.md) 참조)

---

## 관련 API

| API | Resource | 용도 |
|-----|----------|------|
| 1Day 토큰 발행 | `ReqOneDayToken` | 인증 토큰 발급 (선행 필수) |
| 운송장 번호 생성 | `ReqInvcNo` | 사전 운송장 채번 |
| 주소정제 | `ReqAddrRfnSm` | 수신자 주소 검증 (선택) |
| (일반)예약 취소 | `CnclBook` | 예약 취소 |
| (일반)상품추적 | `ReqMssGdsTrc` | 배송 상태 조회 |
