package operato.wms.oms.service.sabangnet;

import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 사방넷 API 공통 서비스
 * - 인증 서명 생성 (HMAC-SHA256)
 * - GET / POST 요청 처리
 * - 택배사 코드 상수 정의
 */
public class SabangnetApiService {

    /*
     * To-Do List
     * API-KEY, SECRET_KEY 관리 방안
     * . 창고-화주사별 설정에 저장
     * . application.properties 에 저장
     * . ...
     * 택배사 코드 상수를 공통 코드 사용하도록 변경
     * . CARRIER_CD (택배사 코드)
     * 
     */

    // ─────────────────────────────────────────
    // 설정
    // ─────────────────────────────────────────

    private static final String API_BASE_URL = "https://api.sabangnet.co.kr"; // 실제 URL은 사방넷에서 확인 필요
    private static final String API_KEY = "YOUR_API_KEY";
    private static final String SECRET_KEY = "YOUR_SECRET_KEY";

    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // ─────────────────────────────────────────
    // 택배사 코드 상수
    // ─────────────────────────────────────────

    public static final String COURIER_CJ = "CJ"; // CJ대한통운
    public static final String COURIER_HANJIN = "HANJIN"; // 한진택배
    public static final String COURIER_LOTTE = "LOTTE"; // 롯데택배
    public static final String COURIER_EPOST = "EPOST"; // 우체국택배
    public static final String COURIER_LOGEN = "LOGEN"; // 로젠택배

    // ─────────────────────────────────────────
    // 인증 유틸리티
    // ─────────────────────────────────────────

    /**
     * HMAC-SHA256 서명 생성
     */
    public static String generateSignature(Map<String, String> params) throws Exception {
        String sortedQuery = params.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(sortedQuery.getBytes(StandardCharsets.UTF_8));

        StringBuilder hex = new StringBuilder();
        for (byte b : hash)
            hex.append(String.format("%02x", b));
        return hex.toString();
    }

    /**
     * 공통 요청 헤더 생성
     */
    public static Map<String, String> buildHeaders(Map<String, String> params) throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        params.put("timestamp", timestamp);

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("api_key", API_KEY);
        headers.put("timestamp", timestamp);
        headers.put("signature", generateSignature(params));
        return headers;
    }

    // ─────────────────────────────────────────
    // HTTP 요청
    // ─────────────────────────────────────────

    /**
     * GET 요청
     */
    public static Map<String, Object> apiGet(String endpoint, Map<String, String> params) throws Exception {
        Map<String, String> signParams = new HashMap<>(params);
        Map<String, String> headers = buildHeaders(signParams);

        String query = params.entrySet().stream()
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
     */
    public static Map<String, Object> apiPost(String endpoint, Map<String, Object> payload) throws Exception {
        Map<String, String> signParams = new HashMap<>();
        payload.forEach((k, v) -> signParams.put(k, String.valueOf(v)));
        Map<String, String> headers = buildHeaders(signParams);

        String body = OBJECT_MAPPER.writeValueAsString(payload);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE_URL + endpoint))
                .POST(HttpRequest.BodyPublishers.ofString(body));
        headers.forEach(builder::header);

        HttpResponse<String> response = HTTP_CLIENT.send(
                builder.build(), HttpResponse.BodyHandlers.ofString());

        return OBJECT_MAPPER.readValue(response.body(), Map.class);
    }
}
