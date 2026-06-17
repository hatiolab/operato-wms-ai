# CJ대한통운 1Day Token 발행

> 참조: CJ대한통운 택배 표준 API Developer Guide V3.9.4

## 개요

CJ대한통운 택배 API(예약 접수, 운송장 번호 생성, 상품추적 등)를 호출하기 전에
**1Day Token**을 먼저 발급받아야 한다. 이후 모든 API 요청에 `TOKEN_NUM` 파라미터를 포함한다.

```
고객사 → ReqOneDayToken (CUST_ID + BIZ_REG_NUM) → TOKEN_NUM 수신
       → 이후 모든 API 호출 시 TOKEN_NUM 포함
```

---

## API 스펙

| 항목 | 내용 |
|------|------|
| Method | POST |
| 개발 URL | `https://dxapi-dev.cjlogistics.com:5054/ReqOneDayToken` |
| 운영 URL | `https://dxapi.cjlogistics.com:5052/ReqOneDayToken` |
| Content-Type | `application/json` |
| Accept | `application/json` |
| CJ-Gateway-APIKey 헤더 | **1Day 토큰 발행 시 생략** (다른 API는 필수) |

### 요청 (Request)

```json
{
  "DATA": {
    "CUST_ID": "계약된 고객사 코드",
    "BIZ_REG_NUM": "청구 사업자번호"
  }
}
```

| Field | 설명 | Type | 필수 |
|-------|------|------|------|
| CUST_ID | 계약된 고객사 코드 | VARCHAR2(20) | Y |
| BIZ_REG_NUM | 청구 사업자번호 | VARCHAR2(10) | Y |
| USER_ID | 중개업체 ID (중개업체 사용 시만) | VARCHAR2(20) | N |

### 응답 (Response)

```json
{
  "RESULT_CD": "S",
  "RESULT_DETAIL": "Success",
  "DATA": {
    "TOKEN_NUM": "23c5c70e-97f8-4a46-9d4a-8b15b098429z",
    "TOKEN_EXPRTN_DTM": "20210327141012",
    "NOTICE": "공지사항 (있을 경우만)"
  }
}
```

| Field | 설명 | Type |
|-------|------|------|
| RESULT_CD | 결과 코드 (`S`: 성공, `E`: 실패) | VARCHAR2(10) |
| RESULT_DETAIL | 결과 상세 (실패 시 에러 내용) | VARCHAR2(5000) |
| TOKEN_NUM | 발급된 토큰번호 (CJ-Gateway-APIKey와 동일 값) | VARCHAR2(40) |
| TOKEN_EXPRTN_DTM | 토큰 만료시간 (format: `YYYYMMDDHHMMSS`) | VARCHAR2(14) |
| NOTICE | 공지사항 (있을 경우만 반환) | VARCHAR2(200) |

---

## 핵심 규칙

| 규칙 | 내용 |
|------|------|
| 유효시간 | **24시간** |
| 만료 전 재요청 | 기존 토큰 그대로 반환 (만료시간 유지) |
| 호출 빈도 제한 | **1초에 1회 초과 시 일정시간 차단** |
| 401 발생 시 | 기존 토큰 폐기 → **1분 이상** 대기 후 재발급 |
| 운영 권장 | 매일 자정 스케줄러로 토큰 갱신 후 시스템에 저장 |

### HTTP 에러 코드

| Code | 의미 | 처리 방안 |
|------|------|----------|
| 200 | 성공 | - |
| 400 | Bad Request (파라미터 오류) | 요청 파라미터 확인 |
| 401 | Authentication failed | 토큰 폐기 → 1분 대기 → 재발급 |
| 403 | Forbidden | 호출 권한 확인 |
| 429 | Too Many Requests | 지수 백오프 후 재시도 |
| 500 | Internal Server Error | 관리자 문의 |

---

## 구현 방안

### 1. 설정 관리 — `courier_contracts` 테이블

CJ 연동 자격증명을 `courier_contracts`의 확장 필드(`contract_no,contract_sub_no,api_key,api_base_url`)에 저장한다.
**도메인별로 CJ 계약이 여러 개 존재할 수 있으므로, `contract_no`가 계약의 고유 식별자**가 된다.

| 컬럼 | 저장 값 | 예시 |
|------|---------|------|
| `dlv_vend_cd` | 택배사 코드 | `cj` |
| `contract_no` | CUST_ID (고객사 코드, 계약번호) — **식별자** | `30586154` |
| `contract_sub_no` | BIZ_REG_NUM (사업자번호) | `1234567890` |
| `api_key` | CJ-Gateway-APIKey | `332d248e-ed7c-...` |
| `api_base_url` | API Base URL | `https://dxapi.cjlogistics.com:5052` |

계약번호로 단건 조회:
```sql
SELECT contract_no, contract_sub_no, api_key, api_base_url
FROM courier_contracts
WHERE domain_id    = :domainId
  AND dlv_vend_cd  = 'cj'
  AND contract_no  = :contractNo
  AND del_flag IS NOT TRUE
```

도메인 내 전체 유효 계약 목록 조회 (스케줄러용):
```sql
SELECT domain_id, contract_no, contract_sub_no, api_key, api_base_url
FROM courier_contracts
WHERE dlv_vend_cd = 'cj'
  AND del_flag IS NOT TRUE
  AND contract_no IS NOT NULL
ORDER BY domain_id, contract_no
```

### 2. 토큰 캐싱 — Redis

토큰을 Redis에 **도메인 + 계약번호** 조합으로 저장한다. TTL은 23시간 30분(만료 30분 전 갱신 보장).

**Redis Key 패턴**: `cj:token:{domainId}:{contractNo}`

```java
@Service
@RequiredArgsConstructor
public class CjTokenService {

    private final StringRedisTemplate redisTemplate;
    private final IQueryManager queryManager;
    private final RestTemplate restTemplate;

    private static final String REDIS_KEY_PREFIX = "cj:token:";
    private static final Duration TOKEN_TTL = Duration.ofMinutes(23 * 60 + 30); // 23.5시간

    /** 캐시 키 생성 — domainId + contractNo 조합 */
    private String cacheKey(Long domainId, String contractNo) {
        return REDIS_KEY_PREFIX + domainId + ":" + contractNo;
    }

    /** 유효한 토큰 반환 — 캐시 미스 시 자동 발급 */
    public String getToken(Long domainId, String contractNo) {
        String cached = redisTemplate.opsForValue().get(cacheKey(domainId, contractNo));
        if (cached != null) {
            return cached;
        }
        return refreshToken(domainId, contractNo);
    }

    /** 토큰 강제 갱신 (401 발생 시 또는 스케줄러에서 호출) */
    public String refreshToken(Long domainId, String contractNo) {
        CjContractConfig config = loadConfig(domainId, contractNo);
        String tokenNum = callReqOneDayToken(config);

        redisTemplate.opsForValue().set(cacheKey(domainId, contractNo), tokenNum, TOKEN_TTL);
        return tokenNum;
    }

    /** 토큰 폐기 (401 발생 시) */
    public void evictToken(Long domainId, String contractNo) {
        redisTemplate.delete(cacheKey(domainId, contractNo));
    }

    private String callReqOneDayToken(CjContractConfig config) {
        String url = config.getApiBaseUrl() + "/ReqOneDayToken";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 1Day 토큰 발행 시 CJ-Gateway-APIKey 헤더 생략

        Map<String, Object> body = Map.of(
            "DATA", Map.of(
                "CUST_ID", config.getCustId(),
                "BIZ_REG_NUM", config.getBizRegNum()
            )
        );

        ResponseEntity<Map> resp = restTemplate.exchange(
            url, HttpMethod.POST,
            new HttpEntity<>(body, headers), Map.class
        );

        Map<String, Object> data = (Map<String, Object>) resp.getBody().get("DATA");
        String resultCd = (String) resp.getBody().get("RESULT_CD");
        if (!"S".equals(resultCd)) {
            throw new RuntimeException("CJ 토큰 발급 실패: " + resp.getBody().get("RESULT_DETAIL"));
        }
        return (String) data.get("TOKEN_NUM");
    }

    /** contract_no 로 계약 설정 로드 */
    private CjContractConfig loadConfig(Long domainId, String contractNo) {
        String sql = """
            SELECT contract_no, contract_sub_no, api_key, api_base_url
            FROM courier_contracts
            WHERE domain_id   = :domainId
              AND dlv_vend_cd = 'cj'
              AND contract_no = :contractNo
              AND del_flag IS NOT TRUE
            """;
        Map<String, Object> row = queryManager.selectBySql(
            sql, Map.of("domainId", domainId, "contractNo", contractNo), Map.class
        );
        if (row == null) {
            throw new RuntimeException("CJ 계약 정보 없음: domainId=" + domainId + ", contractNo=" + contractNo);
        }
        return CjContractConfig.builder()
            .contractNo((String) row.get("contract_no"))
            .custId((String) row.get("contract_no"))
            .bizRegNum((String) row.get("contract_sub_no"))
            .apiKey((String) row.get("api_key"))
            .apiBaseUrl((String) row.get("api_base_url"))
            .userId(null)
            .build();
    }
}
```

### 3. 스케줄러 — 매일 자정 갱신

도메인별 **모든** 유효 CJ 계약의 토큰을 갱신한다.

```java
@Component
@RequiredArgsConstructor
public class CjTokenScheduler {

    private final CjTokenService cjTokenService;
    private final IQueryManager queryManager;

    /** 매일 자정 전체 도메인 × 계약번호 토큰 갱신 */
    @Scheduled(cron = "0 0 0 * * *")
    public void refreshAllTokens() {
        String sql = """
            SELECT domain_id, contract_no
            FROM courier_contracts
            WHERE dlv_vend_cd = 'cj'
              AND del_flag IS NOT TRUE
              AND contract_no IS NOT NULL
            ORDER BY domain_id, contract_no
            """;
        List<Map<String, Object>> rows = queryManager.selectListBySql(sql, Map.of(), Map.class, 0, 0);
        for (Map<String, Object> row : rows) {
            Long domainId = (Long) row.get("domain_id");
            String contractNo = (String) row.get("contract_no");
            try {
                cjTokenService.refreshToken(domainId, contractNo);
            } catch (Exception e) {
                log.error("CJ 토큰 갱신 실패: domainId={}, contractNo={}", domainId, contractNo, e);
            }
        }
    }
}
```

### 4. 401 에러 처리 (다른 API 호출부에서)

```java
try {
    return callCjApi(domainId, contractNo, request);
} catch (HttpClientErrorException e) {
    if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
        // 해당 계약의 토큰만 폐기 후 1분 대기
        cjTokenService.evictToken(domainId, contractNo);
        Thread.sleep(60_000);
        // 1회 재시도
        String newToken = cjTokenService.refreshToken(domainId, contractNo);
        return callCjApi(domainId, contractNo, request);
    }
    throw e;
}
```

---

## 구현 순서

1. `courier_contracts` 데이터에 CJ 자격증명 입력 (`contract_no,contract_sub_no,api_key,api_base_url`)
2. `CjContractConfig` VO 클래스 작성 (`contractNo` 필드 포함)
3. `CjTokenService` 구현 — `getToken/refreshToken/evictToken` 모두 `(domainId, contractNo)` 시그니처
4. `CjTokenScheduler` 구현 — `(domain_id, contract_no)` 쌍 전체 순회하여 갱신
5. 예약 접수 / 운송장 번호 생성 API에서 `cjTokenService.getToken(domainId, contractNo)` 사용

---

## 관련 API 목록

| API | Resource | 용도 |
|-----|----------|------|
| 1Day 토큰 발행 | `ReqOneDayToken` | 본 문서 |
| 주소정제 | `ReqAddrRfnSm` | 수신자 주소 검증 |
| 운송장 번호 생성 | `ReqInvcNo` | 송장번호 채번 |
| 예약 접수 | `RegBook` | 택배 배송 예약 |
| 상품추적 (운송장 기준) | `ReqOneGdsTrc` | 배송 상태 조회 |
| 예약 취소 | `CnclBook` | 배송 취소 |
