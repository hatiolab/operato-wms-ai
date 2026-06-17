# CJ대한통운 (일반) 상품추적 수신여부 확정

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4 — 1.3.9 (일반)상품추적(예약정보기준) 수신여부 확정 API

## 개요

`ReqMssGdsTrc`(대량 상품추적, → [tracking.md](tracking.md))를 `SND_YN=N`으로 호출한 경우,
데이터를 정상 수신했음을 CJ 시스템에 알리는 확정 API다.

```
ReqMssGdsTrc (SND_YN=N)
    → CJ: "아직 수신 확인 전" 상태로 표시
    → WMS: 데이터 처리 (DB 저장, 상태 갱신)
    → RcvMssGdsTrcCnfrm 호출
    → CJ: 해당 건 "수신 완료" 처리
    → 다음 ReqMssGdsTrc 호출 시 동일 건 재전송 안 함
```

**미호출 시 영향**: 수신 확정을 보내지 않으면 다음 `ReqMssGdsTrc` 호출 시 동일 데이터가 계속 반복 전송된다.

> `SND_YN=Y`로 호출한 경우에는 이 API 호출 없이 자동 처리된다.

---

## API 스펙

| 항목 | 내용 |
|------|------|
| 인터페이스명 | 상품추적대량 수신여부 업데이트 |
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/RcvMssGdsTrcCnfrm` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/RcvMssGdsTrcCnfrm` |
| Content-Type | `application/json` |
| CJ-Gateway-APIKey 헤더 | TOKEN_NUM 값 (1Day 토큰) |
| 전달 방식 | Raw JSON (Body) |

---

## 요청 파라미터

| Field | 설명 | Type | 필수 |
|-------|------|------|------|
| `TOKEN_NUM` | 1Day 토큰번호 | VARCHAR2(40) | Y |
| `CLNTNUM` | 고객 ID — **`CUST_ID` 아닌 `CLNTNUM`** (`ReqMssGdsTrc`와 다름) | VARCHAR2(20) | Y |
| `ARRAY` | 수신 확정 목록 (최대 500건) | ARRAY[] | Y |
| `ARRAY[].INVC_NO` | 운송장 번호 | VARCHAR2(20) | Y |
| `ARRAY[].CRG_ST` | 화물상태 코드 (`ReqMssGdsTrc` 응답 값 그대로) | VARCHAR2(2) | Y |

> **필드명 주의**: `ReqMssGdsTrc`는 `CUST_ID`, 이 API는 `CLNTNUM` — 같은 고객 ID를 다른 필드명으로 보낸다.

```json
{
  "DATA": {
    "CLNTNUM": "계약된 고객ID를 넣어 주세요",
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z",
    "ARRAY": [
      { "INVC_NO": "111112345612", "CRG_ST": "91" },
      { "INVC_NO": "111112345613", "CRG_ST": "82" },
      { "INVC_NO": "111112345614", "CRG_ST": "11" }
    ]
  }
}
```

---

## 응답 파라미터

| Field | 설명 | Type |
|-------|------|------|
| `RESULT_CD` | 결과코드 (`S`: 성공, `E`: 실패) | VARCHAR2(10) |
| `RESULT_DETAIL` | 결과상세 — 실패 시 에러내용 | VARCHAR2(5000) |

```json
{"RESULT_CD": "S", "RESULT_DETAIL": "Success."}
```

---

## 핵심 규칙

| 항목 | 내용 |
|------|------|
| 호출 조건 | `ReqMssGdsTrc`를 `SND_YN=N`으로 호출한 경우에만 필요 |
| 1회 최대 | **500건** |
| 500건 초과 시 | 분할하여 여러 번 호출 |
| `CRG_ST` 값 | `ReqMssGdsTrc` 응답에서 받은 값 그대로 전달 — 임의로 바꾸면 안 됨 |
| 미호출 시 | 다음 `ReqMssGdsTrc` 호출 시 같은 데이터 반복 수신 |
| 부분 실패 처리 | 처리 성공한 건만 확정 전송 — 실패 건은 제외하고 재처리 |

---

## 구현 방안

### 1. 대량 조회 전체 흐름에서의 위치

```
[스케줄러]

while true:
    ① ReqMssGdsTrc (SND_YN=N)
       └→ DATA가 비었으면 종료

    ② for each 스캔이벤트 in DATA:
          saveTrackingEvent()       -- DB 저장
          updateShipmentStatus()    -- shipment_orders 상태 갱신
          성공 건 → confirmed 목록에 추가

    ③ RcvMssGdsTrcCnfrm (confirmed 목록, 500건씩 분할)
       └→ CJ: 해당 건 수신 완료 처리

    ④ → 루프 반복 (잔여 미수신 건 계속 조회)
```

### 2. 확정 전송 구현

HTTP 호출은 `java.net.http.HttpClient`를 사용한다 (프로젝트 표준).

```java
/**
 * 수신 확정 전송 — 500건 단위 분할
 * ReqMssGdsTrc(SND_YN=N) 처리 완료 후 반드시 호출
 *
 * @param domainId   도메인 ID
 * @param contractNo 계약 번호 (CUST_ID) — 대량 조회 시 사용한 계약과 동일
 * @param items      ReqMssGdsTrc 응답 DATA 중 처리 성공한 건만 전달
 */
@SuppressWarnings("unchecked")
public void confirmTracking(Long domainId, String contractNo, List<Map<String, Object>> items) {
    if (items == null || items.isEmpty()) return;

    CjContractConfig config = loadConfig(domainId, contractNo);
    String tokenNum = cjTokenService.getToken(domainId, contractNo);
    String url = config.getApiBaseUrl() + "/RcvMssGdsTrcCnfrm";

    // 500건 단위 분할
    for (int i = 0; i < items.size(); i += 500) {
        List<Map<String, Object>> batch = items.subList(i, Math.min(i + 500, items.size()));

        List<Map<String, Object>> array = batch.stream()
            .map(item -> {
                Map<String, Object> entry = new HashMap<>();
                entry.put("INVC_NO", item.get("INVC_NO"));
                entry.put("CRG_ST",  item.get("CRG_ST")); // 응답 값 그대로
                return entry;
            })
            .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("TOKEN_NUM", tokenNum);
        data.put("CLNTNUM",   config.getCustId()); // CUST_ID 아닌 CLNTNUM
        data.put("ARRAY",     array);

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
                log.error("RcvMssGdsTrcCnfrm HTTP 오류: status={}, domainId={}, contractNo={}, batch={}/{}",
                    response.statusCode(), domainId, contractNo,
                    i / 500 + 1, (items.size() - 1) / 500 + 1);
                continue;
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");
            if (!"S".equals(resultCd)) {
                log.error("RcvMssGdsTrcCnfrm 실패: domainId={}, contractNo={}, batch={}/{}, detail={}",
                    domainId, contractNo, i / 500 + 1, (items.size() - 1) / 500 + 1,
                    responseBody.get("RESULT_DETAIL"));
                // 확정 실패 시 다음 ReqMssGdsTrc에서 동일 데이터 재수신되므로 에러 로그만 남기고 계속 진행
            }

        } catch (Exception e) {
            log.error("RcvMssGdsTrcCnfrm 오류: domainId={}, contractNo={}", domainId, contractNo, e);
        }
    }
}
```

### 3. 처리 성공/실패 분리 패턴

확정 전송은 **처리에 성공한 건만** 포함해야 한다.
실패한 건을 포함하면 다음 조회 시 해당 건이 누락된다.

```java
public void syncTrackingData(Long domainId, String contractNo, String reqDt) {
    CjContractConfig config = loadConfig(domainId, contractNo);
    String url = config.getApiBaseUrl() + "/ReqMssGdsTrc";

    while (true) {
        String tokenNum = cjTokenService.getToken(domainId, contractNo);
        List<Map<String, Object>> data = callReqMssGdsTrc(domainId, contractNo, reqDt, tokenNum, url, config);
        if (data == null || data.isEmpty()) break;

        List<Map<String, Object>> confirmed = new ArrayList<>();
        List<Map<String, Object>> failed    = new ArrayList<>();

        for (Map<String, Object> item : data) {
            try {
                saveTrackingEvent(domainId, item);
                updateShipmentStatus(domainId, item);
                confirmed.add(item);           // 처리 성공 → 확정 대상
            } catch (Exception e) {
                log.error("추적 이벤트 처리 실패: invcNo={}", item.get("INVC_NO"), e);
                failed.add(item);              // 처리 실패 → 확정 제외 (다음 조회 시 재수신)
            }
        }

        if (!confirmed.isEmpty()) {
            confirmTracking(domainId, contractNo, confirmed);
        }

        if (failed.size() == data.size()) {
            // 전체 실패 → 무한 루프 방지를 위해 중단
            log.error("전체 추적 처리 실패, 동기화 중단: domainId={}, contractNo={}, reqDt={}",
                domainId, contractNo, reqDt);
            break;
        }
    }
}
```

### 4. 멱등성 보장

같은 건이 재수신될 때(확정 미전송으로 인한 재전송 등) 중복 저장을 방지한다.

```sql
-- tracking_events 테이블에 유니크 제약
CREATE UNIQUE INDEX uidx_tracking_event
    ON shipment_tracking_events (domain_id, invc_no, crg_st, scan_ymd, scan_hour);
```

```java
// INSERT 시 중복 무시
String sql = """
    INSERT INTO shipment_tracking_events (...)
    VALUES (...)
    ON CONFLICT (domain_id, invc_no, crg_st, scan_ymd, scan_hour) DO NOTHING
    """;
```

---

## 구현 순서

1. `CjTrackingService.confirmTracking()` 구현 — 500건 분할 전송
2. `syncTrackingData()` 내 성공/실패 분리 로직 추가
3. `shipment_tracking_events` 유니크 인덱스로 멱등성 확보
4. 확정 실패 시 에러 로그 → 다음 스케줄러 실행 시 자동 재수신되므로 알림 불필요

---

## 관련 API

| API | Resource | 용도 |
|-----|----------|------|
| 1Day 토큰 발행 | `ReqOneDayToken` | 인증 토큰 발급 (선행 필수) |
| (일반) 상품추적 대량 | `ReqMssGdsTrc` | 미수신 추적 데이터 조회 — 본 API의 선행 호출 |
| (공통) 상품추적 단건 | `ReqOneGdsTrc` | 특정 운송장 즉시 조회 (이 API와 무관) |
