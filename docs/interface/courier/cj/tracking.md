# CJ대한통운 상품추적

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4
> — 1.3.5 (공통)상품추적(운송장 번호 기준), 1.3.8 (일반)상품추적(예약정보기준), 1.3.9 (일반)상품추적(예약정보기준) 수신여부 확인

## 개요

CJ대한통운은 배송 상태 조회 방식을 **두 가지** 제공한다.

| 구분 | API | Resource | 사용 목적 |
|------|-----|----------|---------|
| 단건 조회 | (공통)상품추적 운송장 기준 | `ReqOneGdsTrc` | 특정 운송장 번호 하나의 현재 상태 즉시 조회 |
| 대량 조회 | (일반)상품추적 예약정보 기준 | `ReqMssGdsTrc` | 일자별 미전송 추적 데이터 일괄 수신 (최대 500건) |
| 수신 확인 | 수신여부 업데이트 | `RcvMssGdsTrcCnfrm` | 대량 조회 데이터 수신 완료 알림 |

```
[단건 조회]
WMS → ReqOneGdsTrc(INVC_NO) → 최신 스캔 이력 1건 반환

[대량 조회 흐름]
WMS → ReqMssGdsTrc(REQ_DT, SND_YN=N) → 미전송 데이터 최대 500건
    → 저장 완료 후 → RcvMssGdsTrcCnfrm → 수신 확인 처리
    → 다시 ReqMssGdsTrc 호출 → 잔여 데이터 조회 (없을 때까지 반복)
```

**전제 조건**: `1Day Token` 발급 완료 (→ [1day-token.md](1day-token.md))

---

## 1. (공통)상품추적 — 운송장 번호 기준 (ReqOneGdsTrc)

### API 스펙

| 항목 | 내용 |
|------|------|
| 인터페이스명 | 상품추적 단건 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/ReqOneGdsTrc` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/ReqOneGdsTrc` |

### 요청 파라미터

| Field | 설명 | Type | 필수 |
|-------|------|------|------|
| `TOKEN_NUM` | 1Day 토큰번호 | VARCHAR2(40) | Y |
| `CLNTNUM` | 고객 ID (계약된 고객사 코드) — **`CUST_ID` 아닌 `CLNTNUM`** | VARCHAR2(20) | Y |
| `INVC_NO` | 운송장 번호 | VARCHAR2(20) | Y |
| `USER_ID` | 중개업체 ID (중개업체 사용 시만) | VARCHAR2(20) | N |

```json
{
  "DATA": {
    "CLNTNUM": "계약된 고객ID를 넣어 주세요",
    "INVC_NO": "636826218033",
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z"
  }
}
```

### 응답 파라미터

응답 `DATA`는 해당 운송장의 스캔 이력 배열(`ARRAY[]`)로 반환된다.

| Field | 설명 | Type |
|-------|------|------|
| `RESULT_CD` | 결과코드 (`S`: 성공, `E`: 실패) | VARCHAR2(10) |
| `RESULT_DETAIL` | 결과상세 | VARCHAR2(5000) |
| `INVC_NO` | 운송장 번호 | VARCHAR2(20) |
| `CRG_ST` | 화물상태 코드 (→ [화물상태 코드](#화물상태-코드)) | VARCHAR2(2) |
| `CRG_ST_NM` | 화물상태 명 | VARCHAR2(50) |
| `SCAN_YMD` | 스캔 일자 | VARCHAR2(8) |
| `SCAN_HOUR` | 스캔 시간 | VARCHAR2(6) |
| `DEALT_BRAN_NM` | 처리점소 명 | VARCHAR2(100) |
| `DEALT_BRAN_TEL` | 처리점소 전화 | VARCHAR2(15) |
| `DEALT_EMP_NM` | 처리사원 명 | VARCHAR2(100) |
| `DEALT_EMP_TEL` | 처리사원 전화 | VARCHAR2(15) |
| `ACPTR_NM` | 인수자명 | VARCHAR2(100) |

```json
{
  "RESULT_CD": "S",
  "RESULT_DETAIL": "Success.",
  "DATA": [
    {
      "CRG_ST": "91",
      "CRG_ST_NM": "배송완료",
      "SCAN_YMD": "2020-12-31",
      "SCAN_HOUR": "10:34:02",
      "DEALT_BRAN_NM": "서울서대문",
      "DEALT_BRAN_TEL": "서울서대문(070-****-****)",
      "DEALT_EMP_NM": "이선",
      "DEALT_EMP_TEL": "070-****-****",
      "INVC_NO": "384091786506",
      "ACPTR_NM": "박일"
    }
  ]
}
```

### 주의사항 (CJ 가이드 명시)

| 규칙 | 내용 |
|------|------|
| 전체 조회 용도 부적합 | 전체 접수 건 일괄 추적에는 `ReqMssGdsTrc` 사용 권장 |
| 배송완료 건 제외 | `CRG_ST=91` 수신 후 해당 운송장은 **호출 목록에서 제거** |
| 장기 미완료 건 제외 | 10일 이상 배송완료 미수신 건은 호출 목록에서 제외 후 운영팀 확인 |
| 호출 주기 | 과도한 단주기 호출 금지 — **최소 3시간 간격** 권장 |

---

## 2. (일반)상품추적 — 예약정보 기준 (ReqMssGdsTrc)

일자별로 WMS에 아직 전달되지 않은(미전송) 추적 이벤트를 일괄로 가져오는 API.
1회 요청에 최대 500건 반환되며, 잔여 데이터가 있으면 수신 확인 후 반복 호출한다.

### API 스펙

| 항목 | 내용 |
|------|------|
| 인터페이스명 | 상품추적 대량 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/ReqMssGdsTrc` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/ReqMssGdsTrc` |

### 요청 파라미터

| Field | 설명 | Type | 필수 |
|-------|------|------|------|
| `TOKEN_NUM` | 1Day 토큰번호 | VARCHAR2(40) | Y |
| `CUST_ID` | 고객 ID (계약된 고객사 코드) | VARCHAR2(20) | Y |
| `REQ_DT` | 추적데이터 등록일자 (YYYYMMDD) | VARCHAR2(9) | Y |
| `SND_YN` | 수신 데이터 업데이트 여부 | VARCHAR2(1) | N |

**`SND_YN` 값 의미**

| 값 | 동작 |
|----|------|
| `Y` | 데이터 반환과 동시에 **수신 완료 자동 처리** — `RcvMssGdsTrcCnfrm` 호출 불필요 |
| `N` | 수신 완료 처리를 WMS에서 `RcvMssGdsTrcCnfrm`으로 직접 처리 — 미처리 시 동일 데이터 반복 전송됨 |

```json
{
  "DATA": {
    "CUST_ID": "계약된 고객ID를 넣어 주세요",
    "REQ_DT": "20201215",
    "SND_YN": "Y",
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z"
  }
}
```

### 응답 파라미터

응답 `DATA`는 배열(`ARRAY[]`)로 반환된다. 한 건은 특정 운송장의 특정 시점 스캔 이벤트 1개다.

| Field | 설명 | Type |
|-------|------|------|
| `RESULT_CD` | 결과코드 | VARCHAR2(10) |
| `RESULT_DETAIL` | 결과상세 | VARCHAR2(5000) |
| `CUST_ID` | 고객번호 | VARCHAR(20) |
| `RCPT_DV` | 예약구분 (`01`: 일반, `02`: 반품) | VARCHAR(20) |
| `INVC_NO` | 운송장 번호 | VARCHAR(20) |
| `CUST_USE_NO` | WMS 주문번호 (예약 접수 시 전달한 `CUST_USE_NO`) | VARCHAR2(100) |
| `CRG_ST` | 화물상태 코드 (→ [화물상태 코드](#화물상태-코드)) | VARCHAR2(2) |
| `CRG_ST_NM` | 화물상태 명 | VARCHAR2(50) |
| `SCAN_YMD` | 스캔일자 | VARCHAR2(8) |
| `SCAN_HOUR` | 스캔시간 | VARCHAR2(6) |
| `DEALT_BRAN_NM` | 처리 점소명 | VARCHAR2(50) |
| `DEALEMP_NM` | 처리자 명 | VARCHAR2(100) |
| `ACPTR_NM` | 인수자 명 | VARCHAR2(60) |
| `NO_CLDV_RSN_CD` | 미집화/미배송 사유코드 (→ [사유 코드](#미집화--미배송-사유-코드)) | VARCHAR2(2) |
| `DETAIL_RSN` | 미집화/미배송 상세 | VARCHAR2(50) |

```json
{
  "RESULT_CD": "S",
  "RESULT_DETAIL": "Success.",
  "DATA": [
    {
      "CUST_ID": "301***27",
      "RCPT_DV": "01",
      "INVC_NO": "38717**12912",
      "CUST_USE_NO": "58***78",
      "CRG_ST": "01",
      "CRG_ST_NM": "집화지시",
      "SCAN_YMD": "20201215",
      "SCAN_HOUR": "094404",
      "DEALT_BRAN_NM": "서울강남에스앤",
      "DEALEMP_NM": "정**",
      "ACPTR_NM": "본인",
      "NO_CLDV_RSN_CD": null,
      "DETAIL_RSN": null
    }
  ]
}
```

---

## 3. 수신여부 확정 (RcvMssGdsTrcCnfrm)

> 상세 구현 계획: [tracking-bulk-confirm.md](tracking-bulk-confirm.md)

`ReqMssGdsTrc`를 `SND_YN=N`으로 호출한 경우, 데이터 처리 완료 후 이 API로 수신 완료를 알려야 한다.
알리지 않으면 다음 `ReqMssGdsTrc` 호출 시 동일 데이터가 반복 반환된다.

### API 스펙

| 항목 | 내용 |
|------|------|
| 인터페이스명 | 상품추적대량 수신여부 업데이트 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/RcvMssGdsTrcCnfrm` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/RcvMssGdsTrcCnfrm` |

### 요청 파라미터

| Field | 설명 | Type | 필수 |
|-------|------|------|------|
| `TOKEN_NUM` | 1Day 토큰번호 | VARCHAR2(40) | Y |
| `CLNTNUM` | 고객 ID — **`CUST_ID` 아닌 `CLNTNUM`** | VARCHAR2(20) | Y |
| `ARRAY` | 수신 확인 목록 (최대 500건) | ARRAY[] | Y |
| `ARRAY[].INVC_NO` | 운송장 번호 | VARCHAR2(20) | Y |
| `ARRAY[].CRG_ST` | 화물상태 코드 | VARCHAR2(2) | Y |

```json
{
  "DATA": {
    "CLNTNUM": "계약된 고객ID를 넣어 주세요",
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z",
    "ARRAY": [
      { "INVC_NO": "111112345612", "CRG_ST": "91" }
    ]
  }
}
```

### 응답

```json
{"RESULT_CD": "S", "RESULT_DETAIL": "Success."}
```

> **주의**: `ReqOneGdsTrc`(단건)과 `RcvMssGdsTrcCnfrm`(수신확인)은 고객ID 파라미터 이름이 `CLNTNUM`이고,
> `ReqMssGdsTrc`(대량)는 `CUST_ID`다. 헷갈리기 쉬우므로 구현 시 주의.

---

## 화물상태 코드

| 코드 | 상태명 | WMS 대응 |
|------|--------|---------|
| `01` | 집화지시 | 배송 준비 |
| `11` | 집화처리 | 택배사 인수 완료 |
| `12` | 미집화 | 집화 실패 (`NO_CLDV_RSN_CD` 확인) |
| `41` | 간선상차 | 간선 운송 중 |
| `42` | 간선하차 | 배송지 도착 |
| `82` | 배송출발 | 배송 출발 |
| `84` | 미배송 | 배송 실패 (`NO_CLDV_RSN_CD` 확인) |
| `91` | 배송완료 | 완료 처리 → 추적 목록에서 제거 |

## 미집화 / 미배송 사유 코드

| 코드 | 사유 | 구분 |
|------|------|------|
| `01` | 재고 부족 / 고객정보 오류 | 미집화 / 미배송 |
| `02` | 업체 미출고 / 고객 부재 | 미집화 / 미배송 |
| `03` | 기집화 | 미집화 |
| `05` | 지연 도착 | 미배송 |
| `06` | 타택배 / 분류 오류 | 미집화 / 미배송 |
| `07` | 천재지변 | 미집화 |
| `08` | 주문취소(일반건) / 통화 불가능 | 미집화 / 미배송 |
| `09` | 집배구역 불일치 / 수취 거부 | 미집화 / 미배송 |
| `11` | 집화 예정 / 천재 지변 | 미집화 / 미배송 |
| `12` | 토요 휴무 | 미집화 |
| `13` | 취급불가/규격외품 | 미집화 |
| `16` | 고객 사용중 / 착지 변경 | 미집화 / 미배송 |
| `18` | 고객 부재 | 미집화 |
| `21` | 고객정보오류 / 상품 사고(파손/분실) | 미집화 / 미배송 |
| `24` | 지정일 배송 | 미배송 |
| `25` | 통화 안됨(4일이상) | 미집화 |
| `33` | 시간부족 / 도서/외곽지역 | 미집화 / 미배송 |
| `34` | 차량고장 | 미집화 |
| `38` | 도서/외곽지역 | 미집화 |
| `42` | 특판 잔류 | 미배송 |
| `44` | 중복 예약 | 미집화 |
| `49` | 집화 이관 | 미집화 |
| `55` | 결재 불가 | 미배송 |
| `56` | 배송전 취소 | 미배송 |

---

## 구현 방안

### 1. API 선택 기준

| 상황 | 사용 API |
|------|---------|
| 고객이 특정 주문의 배송 현황을 즉시 조회 | `ReqOneGdsTrc` (단건) |
| 전체 진행 중 주문의 배송 상태를 일괄 업데이트 (스케줄러) | `ReqMssGdsTrc` (대량) |
| 배송 완료 후 WMS 상태 자동 갱신 | `ReqMssGdsTrc` (대량, 스케줄러) |

### 2. 대량 조회 스케줄러 흐름

```
[일 2회 이상 스케줄러 — 예: 오전 6시, 오후 2시]

while true:
    ReqMssGdsTrc(REQ_DT=오늘, SND_YN=N)
    if DATA.isEmpty() → 종료
    
    for each item in DATA:
        shipment_orders 조회 (CUST_USE_NO → shipment_no)
        CRG_ST 기준으로 WMS 배송 상태 업데이트
        CRG_ST=91이면 shipment_orders.status = 'DELIVERED'
        CRG_ST=84이면 shipment_orders.dlv_fail_rsn 저장
    
    RcvMssGdsTrcCnfrm(처리 완료된 INVC_NO + CRG_ST 목록)
    → 다음 루프 (잔여 500건 조회)
```

### 3. DB 설계 — 추적 이벤트 저장

```sql
-- 배송 추적 이벤트 이력 테이블 (마이그레이션 추가)
CREATE TABLE shipment_tracking_events (
    id              BIGSERIAL PRIMARY KEY,
    domain_id       BIGINT       NOT NULL,
    shipment_no     VARCHAR(100) NOT NULL,   -- CUST_USE_NO 매핑
    invc_no         VARCHAR(20)  NOT NULL,   -- CJ 운송장 번호
    crg_st          VARCHAR(2)   NOT NULL,   -- 화물상태 코드
    crg_st_nm       VARCHAR(50),             -- 화물상태 명
    scan_ymd        VARCHAR(8),              -- 스캔 일자
    scan_hour       VARCHAR(6),              -- 스캔 시간
    dealt_bran_nm   VARCHAR(100),            -- 처리점소
    dealemp_nm      VARCHAR(100),            -- 처리자
    acptr_nm        VARCHAR(60),             -- 인수자
    no_cldv_rsn_cd  VARCHAR(2),              -- 미집화/미배송 사유
    detail_rsn      VARCHAR(50),             -- 상세 사유
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_domain_shipment ON shipment_tracking_events (domain_id, shipment_no);
CREATE INDEX idx_tracking_invc_no ON shipment_tracking_events (invc_no);
```

### 4. CjTrackingService

`AbstractQueryService`를 상속하여 `queryManager`로 직접 조회한다.
HTTP 호출은 `java.net.http.HttpClient`를 사용한다 (프로젝트 표준).

```java
@Service
public class CjTrackingService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjTrackingService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * 단건 조회 — ReqOneGdsTrc
     * 고객 화면에서 특정 운송장의 즉시 조회 시 사용
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID)
     * @param invcNo     운송장 번호
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> trackByInvcNo(Long domainId, String contractNo, String invcNo) {
        CjContractConfig config = loadConfig(domainId, contractNo);
        String tokenNum = cjTokenService.getToken(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/ReqOneGdsTrc";

        Map<String, Object> data = new HashMap<>();
        data.put("TOKEN_NUM", tokenNum);
        data.put("CLNTNUM",   config.getCustId()); // CUST_ID 아닌 CLNTNUM
        data.put("INVC_NO",   invcNo);

        Map<String, Object> responseBody = callApi(url, tokenNum, data);
        assertSuccess(responseBody);
        return (List<Map<String, Object>>) responseBody.get("DATA");
    }

    /**
     * 대량 조회 + 수신 확인 — ReqMssGdsTrc + RcvMssGdsTrcCnfrm
     * 스케줄러에서 일자별 미전송 데이터를 모두 소진할 때까지 반복 호출
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID)
     * @param reqDt      조회 일자 (YYYYMMDD)
     */
    @SuppressWarnings("unchecked")
    public void syncTrackingData(Long domainId, String contractNo, String reqDt) {
        CjContractConfig config = loadConfig(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/ReqMssGdsTrc";
        String confirmUrl = config.getApiBaseUrl() + "/RcvMssGdsTrcCnfrm";

        while (true) {
            String tokenNum = cjTokenService.getToken(domainId, contractNo);

            Map<String, Object> data = new HashMap<>();
            data.put("TOKEN_NUM", tokenNum);
            data.put("CUST_ID",   config.getCustId());
            data.put("REQ_DT",    reqDt);
            data.put("SND_YN",    "N");

            Map<String, Object> responseBody = callApi(url, tokenNum, data);
            assertSuccess(responseBody);

            List<Map<String, Object>> items = (List<Map<String, Object>>) responseBody.get("DATA");
            if (items == null || items.isEmpty()) break;

            // 추적 이벤트 저장 및 shipment_orders 상태 업데이트
            List<Map<String, Object>> confirmedItems = new ArrayList<>();
            for (Map<String, Object> item : items) {
                try {
                    saveTrackingEvent(domainId, item);
                    updateShipmentStatus(domainId, item);
                    confirmedItems.add(item);
                } catch (Exception e) {
                    log.error("추적 이벤트 처리 실패: invcNo={}", item.get("INVC_NO"), e);
                }
            }

            // 수신 확인 (500건 단위 분할)
            confirmTracking(domainId, config, tokenNum, confirmUrl, confirmedItems);
        }
    }

    private void confirmTracking(
        Long domainId, CjContractConfig config, String tokenNum,
        String confirmUrl, List<Map<String, Object>> items
    ) {
        for (int i = 0; i < items.size(); i += 500) {
            List<Map<String, Object>> batch = items.subList(i, Math.min(i + 500, items.size()));
            List<Map<String, Object>> array = batch.stream()
                .map(item -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("INVC_NO", item.get("INVC_NO"));
                    entry.put("CRG_ST",  item.get("CRG_ST"));
                    return entry;
                })
                .collect(Collectors.toList());

            Map<String, Object> data = new HashMap<>();
            data.put("TOKEN_NUM", tokenNum);
            data.put("CLNTNUM",   config.getCustId()); // CUST_ID 아닌 CLNTNUM
            data.put("ARRAY",     array);

            callApi(confirmUrl, tokenNum, data);
        }
    }

    private void updateShipmentStatus(Long domainId, Map<String, Object> item) {
        String crgSt     = (String) item.get("CRG_ST");
        String custUseNo = (String) item.get("CUST_USE_NO");
        if (custUseNo == null) return;

        String newStatus = switch (crgSt) {
            case "11" -> "PICKED_UP";
            case "82" -> "OUT_FOR_DELIVERY";
            case "91" -> "DELIVERED";
            case "84" -> "DELIVERY_FAILED";
            case "12" -> "PICKUP_FAILED";
            default   -> null;
        };
        if (newStatus == null) return;

        String sql = """
            UPDATE shipment_orders
            SET delivery_status     = :status,
                dlv_fail_rsn_cd     = :failRsnCd,
                dlv_fail_rsn_detail = :failRsnDetail
            WHERE domain_id = :domainId
              AND shipment_no = :shipmentNo
            """;
        Map<String, Object> params = new HashMap<>();
        params.put("domainId",      domainId);
        params.put("shipmentNo",    custUseNo);
        params.put("status",        newStatus);
        params.put("failRsnCd",     item.getOrDefault("NO_CLDV_RSN_CD", ""));
        params.put("failRsnDetail", item.getOrDefault("DETAIL_RSN", ""));
        this.queryManager.executeBySql(sql, params);
    }

    private void saveTrackingEvent(Long domainId, Map<String, Object> item) {
        String sql = """
            INSERT INTO shipment_tracking_events
              (domain_id, shipment_no, invc_no, crg_st, crg_st_nm,
               scan_ymd, scan_hour, dealt_bran_nm, dealemp_nm, acptr_nm,
               no_cldv_rsn_cd, detail_rsn)
            VALUES
              (:domainId, :shipmentNo, :invcNo, :crgSt, :crgStNm,
               :scanYmd, :scanHour, :dealtBranNm, :dealempNm, :acptrNm,
               :noCldvRsnCd, :detailRsn)
            ON CONFLICT DO NOTHING
            """;
        Map<String, Object> params = new HashMap<>();
        params.put("domainId",    domainId);
        params.put("shipmentNo",  item.getOrDefault("CUST_USE_NO", ""));
        params.put("invcNo",      item.get("INVC_NO"));
        params.put("crgSt",       item.get("CRG_ST"));
        params.put("crgStNm",     item.getOrDefault("CRG_ST_NM", ""));
        params.put("scanYmd",     item.getOrDefault("SCAN_YMD", ""));
        params.put("scanHour",    item.getOrDefault("SCAN_HOUR", ""));
        params.put("dealtBranNm", item.getOrDefault("DEALT_BRAN_NM", ""));
        params.put("dealempNm",   item.getOrDefault("DEALEMP_NM", ""));
        params.put("acptrNm",     item.getOrDefault("ACPTR_NM", ""));
        params.put("noCldvRsnCd", item.get("NO_CLDV_RSN_CD"));
        params.put("detailRsn",   item.get("DETAIL_RSN"));
        this.queryManager.executeBySql(sql, params);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callApi(String url, String tokenNum, Map<String, Object> data) {
        try {
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
                throw new ElidomRuntimeException("CJ API HTTP 오류: status=" + response.statusCode());
            }
            return OBJECT_MAPPER.readValue(response.body(), Map.class);

        } catch (ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException("CJ API 호출 오류: url=" + url, e);
        }
    }

    private void assertSuccess(Map<?, ?> body) {
        if (!"S".equals(body.get("RESULT_CD"))) {
            throw new CjApiException("상품추적 API 실패: " + body.get("RESULT_DETAIL"));
        }
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

### 5. 스케줄러

`CjTokenScheduler`와 동일한 패턴으로 `(domain_id, contract_no)` 쌍을 순회한다.
HA 환경에서는 `mps.job.scheduler.enable=true` 인스턴스 한 대에서만 실행된다.

```java
@Component
public class CjTrackingScheduler {

    private static final Logger log = LoggerFactory.getLogger(CjTrackingScheduler.class);

    @Autowired
    private CjTrackingService cjTrackingService;

    @Autowired
    private IQueryManager queryManager;

    @Autowired
    private Environment env;

    /** 오전 6시, 오후 2시 — 전일 및 당일 추적 데이터 동기화 */
    @Scheduled(cron = "0 0 6,14 * * *")
    @SuppressWarnings("unchecked")
    public void syncAllDomains() {
        if (!isJobEnabled()) {
            return;
        }

        String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.BASIC_ISO_DATE);

        List<Map> contracts = loadActiveContracts();
        for (Map row : contracts) {
            Long domainId = ValueUtil.toLong(row.get("domain_id"));
            String contractNo = (String) row.get("contract_no");
            try {
                cjTrackingService.syncTrackingData(domainId, contractNo, yesterday);
                cjTrackingService.syncTrackingData(domainId, contractNo, today);
            } catch (Exception e) {
                log.error("CJ 추적 동기화 실패: domainId={}, contractNo={}", domainId, contractNo, e);
            }
        }
    }

    private boolean isJobEnabled() {
        return ValueUtil.toBoolean(
            this.env.getProperty(ConfigConstants.JOB_SCHEDULER_ENABLED, AnyConstants.FALSE_STRING)
        );
    }

    @SuppressWarnings("unchecked")
    private List<Map> loadActiveContracts() {
        String sql = """
            SELECT domain_id, contract_no
            FROM courier_contracts
            WHERE dlv_vend_cd = 'cj'
              AND del_flag IS NOT TRUE
              AND contract_no IS NOT NULL
              AND api_base_url IS NOT NULL
            ORDER BY domain_id, contract_no
            """;
        return queryManager.selectListBySql(sql, new HashMap<>(), Map.class, 0, 0);
    }
}
```

---

## 구현 순서

1. DB 마이그레이션: `shipment_tracking_events` 테이블 생성, `shipment_orders`에 `delivery_status`, `dlv_fail_rsn_cd`, `dlv_fail_rsn_detail` 컬럼 추가
2. `CjTrackingService.trackByInvcNo()` — 단건 조회 구현
3. `CjTrackingService.syncTrackingData()` — 대량 조회 + 수신 확인 루프 구현
4. `CjTrackingScheduler` 구현 (오전 6시 / 오후 2시 실행)
5. 출고 현황 화면에서 `trackByInvcNo()` 연결

---

## 관련 API

| API | Resource | 용도 |
|-----|----------|------|
| 1Day 토큰 발행 | `ReqOneDayToken` | 인증 토큰 발급 (선행 필수) |
| (일반) 예약 접수 | `RegBook` | 추적 대상 예약 등록 |
| (일반) 예약 취소 | `CnclBook` | 취소 전 스캔 여부 확인 용도 |
