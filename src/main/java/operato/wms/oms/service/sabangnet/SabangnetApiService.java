package operato.wms.oms.service.sabangnet;

import com.fasterxml.jackson.databind.ObjectMapper;
import operato.wms.base.service.RuntimeConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import xyz.anythings.sys.service.AbstractQueryService;

/**
 * 사방넷 풀필먼트 API 공통 서비스
 * - 인증 서명 생성 (Datekey → Signkey → Base64 HMAC-SHA256)
 * - Authorization / Credential / Signature 헤더 처리
 * - GET / POST / PUT 요청 처리
 * - API Access Key / Secret Key 창고-화주사별 설정에서 동적 조회
 *
 * API Host : https://napi.sbfulfillment.co.kr (Sandbox / LIVE 동일)
 * Authorization 헤더:
 * LIVE → LIVE-HMAC-SHA256
 * Sandbox → API.SENDBOX-HMAC-SHA256
 * Credential 헤더:
 * <회사코드>/<api-access-key>/<YYYYMMDD>/srwms_request
 */
@Component
public class SabangnetApiService extends AbstractQueryService {

    // ─────────────────────────────────────────
    // 설정
    // ─────────────────────────────────────────

    /** 사방넷 풀필먼트 API 호스트 (Sandbox / LIVE 동일) */
    private static final String API_BASE_URL = "https://napi.sbfulfillment.co.kr";

    /** RuntimeConfig 키 — 사방넷 API Access Key */
    private static final String CONFIG_ACCESS_KEY = "oms.sabangnet.access.key";
    /** RuntimeConfig 키 — 사방넷 API Secret Key */
    private static final String CONFIG_SECRET_KEY = "oms.sabangnet.secret.key";
    /** RuntimeConfig 키 — 사방넷 Credential 헤더에 사용할 회사코드 */
    private static final String CONFIG_COMPANY_CODE = "oms.sabangnet.company.code";
    /**
     * RuntimeConfig 키 — 연동 환경 구분
     * 값: LIVE(운영) 또는 SANDBOX(테스트, 기본값)
     */
    private static final String CONFIG_ENV = "oms.sabangnet.env";

    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private RuntimeConfigService runtimeConfSvc;

    // ─────────────────────────────────────────
    // 인증 유틸리티
    // ─────────────────────────────────────────

    /**
     * HMAC-SHA256 계산 후 Hex 문자열 반환
     */
    private String hmacSha256Hex(String message, byte[] key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        byte[] hash = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));

        StringBuilder hex = new StringBuilder();
        for (byte b : hash)
            hex.append(String.format("%02x", b));
        return hex.toString();
    }

    /**
     * Signature 생성 (사방넷 풀필먼트 규격)
     *
     * 1단계: Datekey = HMAC-SHA256(key=secretKey, message=YYYYMMDD) → Hex
     * 2단계: Signkey = HMAC-SHA256(key=Datekey, message=accessKeyId) → Hex
     * 3단계: Signature = Base64(Signkey.UTF-8 bytes)
     */
    private String generateSignature(String accessKeyId, String secretKey, String ymd) throws Exception {
        String dateKey = hmacSha256Hex(ymd, secretKey.getBytes(StandardCharsets.UTF_8));
        String signKey = hmacSha256Hex(accessKeyId, dateKey.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signKey.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 공통 요청 헤더 생성
     *
     * Authorization : LIVE-HMAC-SHA256 또는 API.SENDBOX-HMAC-SHA256
     * Credential : <회사코드>/<api-access-key>/<YYYYMMDD>/srwms_request
     * Signature : Base64 인코딩된 서명 값
     */
    private Map<String, String> buildHeaders(String comCd, String whCd) throws Exception {
        String accessKey = runtimeConfSvc.getRuntimeConfigValue(comCd, whCd, CONFIG_ACCESS_KEY);
        String secretKey = runtimeConfSvc.getRuntimeConfigValue(comCd, whCd, CONFIG_SECRET_KEY);
        String companyCode = runtimeConfSvc.getRuntimeConfigValue(comCd, whCd, CONFIG_COMPANY_CODE);
        String env = runtimeConfSvc.getRuntimeConfigValue(comCd, whCd, CONFIG_ENV);

        String ymd = new SimpleDateFormat("yyyyMMdd").format(Calendar.getInstance().getTime());

        // Authorization 타입: LIVE 이외는 모두 SANDBOX로 처리
        String authorization = "LIVE".equalsIgnoreCase(env)
                ? "LIVE-HMAC-SHA256"
                : "API.SENDBOX-HMAC-SHA256";

        // Credential: <회사코드>/<api-access-key>/<YYYYMMDD>/srwms_request
        String credential = companyCode + "/" + accessKey + "/" + ymd + "/srwms_request";

        String signature = generateSignature(accessKey, secretKey, ymd);

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Authorization", authorization);
        headers.put("Credential", credential);
        headers.put("Signature", signature);
        return headers;
    }

    // ─────────────────────────────────────────
    // HTTP 요청
    // ─────────────────────────────────────────

    /**
     * GET 요청
     *
     * @param endpoint API 경로 (예: /v2/product/shipping_products)
     * @param params   쿼리 파라미터 (nullable)
     */
    public Map<String, Object> apiGet(String endpoint, Map<String, String> params,
            String comCd, String whCd) throws Exception {
        Map<String, String> headers = buildHeaders(comCd, whCd);

        String query = (params == null || params.isEmpty()) ? ""
                : params.entrySet().stream()
                        .map(e -> e.getKey() + "=" + e.getValue())
                        .collect(Collectors.joining("&"));

        String url = API_BASE_URL + endpoint + (query.isEmpty() ? "" : "?" + query);

        HttpRequest.Builder builder = HttpRequest.newBuilder().uri(URI.create(url)).GET();
        headers.forEach(builder::header);

        HttpResponse<String> response = HTTP_CLIENT.send(
                builder.build(), HttpResponse.BodyHandlers.ofString());

        return OBJECT_MAPPER.readValue(response.body(), Map.class);
    }

    /**
     * POST 요청
     *
     * @param endpoint API 경로 (예: /v2/request/order)
     * @param payload  요청 본문
     */
    public Map<String, Object> apiPost(String endpoint, Map<String, Object> payload,
            String comCd, String whCd) throws Exception {
        Map<String, String> headers = buildHeaders(comCd, whCd);
        String body = OBJECT_MAPPER.writeValueAsString(payload);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE_URL + endpoint))
                .POST(HttpRequest.BodyPublishers.ofString(body));
        headers.forEach(builder::header);

        HttpResponse<String> response = HTTP_CLIENT.send(
                builder.build(), HttpResponse.BodyHandlers.ofString());

        return OBJECT_MAPPER.readValue(response.body(), Map.class);
    }

    /**
     * PUT 요청
     *
     * @param endpoint API 경로 (예: /v2/release/shipping_code/{releaseId})
     * @param payload  요청 본문
     */
    public Map<String, Object> apiPut(String endpoint, Map<String, Object> payload,
            String comCd, String whCd) throws Exception {
        Map<String, String> headers = buildHeaders(comCd, whCd);
        String body = OBJECT_MAPPER.writeValueAsString(payload);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE_URL + endpoint))
                .PUT(HttpRequest.BodyPublishers.ofString(body));
        headers.forEach(builder::header);

        HttpResponse<String> response = HTTP_CLIENT.send(
                builder.build(), HttpResponse.BodyHandlers.ofString());

        return OBJECT_MAPPER.readValue(response.body(), Map.class);
    }

    /**
     * 응답 코드 성공 여부 확인
     * 사방넷 풀필먼트 성공 응답 코드: "9999"
     */
    public boolean isSuccess(Map<String, Object> result) {
        return "9999".equals(result.get("code"));
    }
}
