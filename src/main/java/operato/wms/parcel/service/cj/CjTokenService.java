package operato.wms.parcel.service.cj;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.util.ValueUtil;

/**
 * CJ대한통운 1Day Token 서비스
 *
 * 토큰 발급(ReqOneDayToken), Redis 캐싱, 폐기를 담당한다.
 * 토큰은 domainId + contractNo 조합으로 캐싱하여 도메인별 다수 계약을 지원한다.
 *
 * Redis Key 패턴: cj:token:{domainId}:{contractNo}
 * TTL: 23시간 30분 (만료 30분 전 갱신 보장)
 *
 * 참조: docs/interface/courier/cj/1day-token.md
 */
@Component
public class CjTokenService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjTokenService.class);

    private static final String REDIS_KEY_PREFIX = "cj:token:";
    private static final Duration TOKEN_TTL = Duration.ofMinutes(23 * 60 + 30);

    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private StringRedisTemplate redisTemplate;

    // ─────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────

    /**
     * 유효한 토큰 반환 — 캐시 히트 시 즉시 반환, 미스 시 자동 발급
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID)
     * @return TOKEN_NUM
     */
    public String getToken(Long domainId, String contractNo) {
        String cached = this.redisTemplate.opsForValue().get(this.cacheKey(domainId, contractNo));
        if (ValueUtil.isNotEmpty(cached)) {
            return cached;
        }
        return this.refreshToken(domainId, contractNo);
    }

    /**
     * 토큰 강제 갱신 — 스케줄러 또는 401 발생 후 재발급 시 호출
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID)
     * @return 새로 발급된 TOKEN_NUM
     */
    public String refreshToken(Long domainId, String contractNo) {
        CjContractConfig config = this.loadConfig(domainId, contractNo);
        String tokenNum = this.callReqOneDayToken(config);
        this.redisTemplate.opsForValue().set(this.cacheKey(domainId, contractNo), tokenNum, TOKEN_TTL);
        log.info("CJ 토큰 갱신 완료: domainId={}, contractNo={}", domainId, contractNo);
        return tokenNum;
    }

    /**
     * 토큰 캐시 폐기 — 401 Authentication failed 발생 시 호출 후 1분 대기
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (CUST_ID)
     */
    public void evictToken(Long domainId, String contractNo) {
        this.redisTemplate.delete(this.cacheKey(domainId, contractNo));
        log.info("CJ 토큰 폐기: domainId={}, contractNo={}", domainId, contractNo);
    }

    // ─────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────

    /** Redis 캐시 키 생성 */
    private String cacheKey(Long domainId, String contractNo) {
        return REDIS_KEY_PREFIX + domainId + ":" + contractNo;
    }

    /**
     * ReqOneDayToken API 호출
     *
     * POST {apiBaseUrl}/ReqOneDayToken
     * CJ-Gateway-APIKey 헤더 생략 (1Day 토큰 발행 규칙)
     */
    @SuppressWarnings("unchecked")
    private String callReqOneDayToken(CjContractConfig config) {
        String url = config.getApiBaseUrl() + "/ReqOneDayToken";

        try {
            Map<String, Object> data = new HashMap<>();
            data.put("CUST_ID", config.getCustId());
            data.put("BIZ_REG_NUM", config.getBizRegNum());
            if (ValueUtil.isNotEmpty(config.getUserId())) {
                data.put("USER_ID", config.getUserId());
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("DATA", data);

            String requestJson = OBJECT_MAPPER.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ElidomRuntimeException(
                    "CJ 1Day 토큰 발급 HTTP 오류: status=" + response.statusCode()
                    + ", contractNo=" + config.getContractNo()
                );
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");

            if (!"S".equals(resultCd)) {
                throw new ElidomRuntimeException(
                    "CJ 1Day 토큰 발급 실패: RESULT_CD=" + resultCd
                    + ", RESULT_DETAIL=" + responseBody.get("RESULT_DETAIL")
                    + ", contractNo=" + config.getContractNo()
                );
            }

            Map<String, Object> responseData = (Map<String, Object>) responseBody.get("DATA");
            return (String) responseData.get("TOKEN_NUM");

        } catch (ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException(
                "CJ 1Day 토큰 발급 중 오류: contractNo=" + config.getContractNo(), e
            );
        }
    }

    /**
     * courier_contracts 테이블에서 계약 설정 로드
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호
     */
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
