package operato.wms.parcel.service.cj;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;

/**
 * CJ대한통운 예약 취소 서비스
 *
 * CnclBook API를 호출하여 등록된 예약을 취소한다.
 * 예약 접수 시 저장한 원본 payload를 재사용하며 REQ_DV_CD만 '02'로 교체한다.
 *
 * 참조: docs/interface/courier/cj/booking-cancel.md
 */
@Component
public class CjBookingCancelService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjBookingCancelService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * CnclBook 호출 — 단건 예약 취소
     *
     * 예약 접수(RegBook) 시 저장한 원본 payload를 DB에서 조회하여,
     * TOKEN_NUM을 갱신하고 REQ_DV_CD를 '02'(취소)로 교체한 뒤 CnclBook을 호출한다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (courier_contracts.contract_no) — 예약 접수 시 사용한 계약과 동일
     * @param shipmentNo WMS 출고 주문번호 (예약 접수 시 CUST_USE_NO로 사용한 값)
     * @throws ElidomRuntimeException 예약 접수 이력 없음 또는 HTTP 오류 / CJ API가 E 코드를 반환한 경우
     */
    @SuppressWarnings("unchecked")
    public void cancel(Long domainId, String contractNo, String shipmentNo) {
        Map<String, Object> bookingPayload = this.loadBookingPayload(domainId, shipmentNo);
        if (bookingPayload == null) {
            throw new ElidomRuntimeException("CJ 예약 접수 이력 없음: shipmentNo=" + shipmentNo);
        }

        CjContractConfig config = this.loadConfig(domainId, contractNo);
        String tokenNum = this.cjTokenService.getToken(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/CnclBook";

        // 원본 payload 복사 후 TOKEN_NUM 갱신, REQ_DV_CD를 '02'(취소)로 변경
        Map<String, Object> cancelData = new LinkedHashMap<>(bookingPayload);
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
                        "CnclBook HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo);
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");
            String resultDetail = (String) responseBody.get("RESULT_DETAIL");

            this.saveCancelResult(domainId, shipmentNo, resultCd);

            if (!"S".equals(resultCd)) {
                log.warn("CJ CnclBook 실패: shipmentNo={}, contractNo={}, detail={}", shipmentNo, contractNo,
                        resultDetail);
                throw new ElidomRuntimeException("CnclBook 실패: " + resultDetail);
            }

            log.debug("CJ CnclBook 성공: shipmentNo={}", shipmentNo);

        } catch (Exception e) {
            throw new ElidomRuntimeException(
                    "CnclBook 오류: contractNo=" + contractNo + ", shipmentNo=" + shipmentNo, e);
        }
    }

    /**
     * 취소 가능 여부 확인
     *
     * 예약 접수 성공 이력이 있고 아직 취소되지 않은 경우 true를 반환한다.
     * 운송장 스캔 완료 등 CJ 측에서 취소 불가 판단하는 경우는 cancel() 호출 후 에러로 처리한다.
     *
     * @param domainId   도메인 ID
     * @param shipmentNo WMS 출고 주문번호
     * @return 취소 API 호출 가능 여부
     */
    public boolean isCancellable(Long domainId, String shipmentNo) {
        String sql = """
                SELECT cj_booking_result_cd, cj_cancel_result_cd
                FROM shipment_orders
                WHERE domain_id = :domainId
                  AND shipment_no = :shipmentNo
                LIMIT 1
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("shipmentNo", shipmentNo);

        Map row = this.queryManager.selectBySql(sql, params, Map.class);
        if (row == null)
            return false;

        // 예약 접수 성공 이력이 없으면 취소 불필요
        if (!"S".equals(row.get("cj_booking_result_cd")))
            return false;

        // 이미 취소 성공한 경우
        if ("S".equals(row.get("cj_cancel_result_cd")))
            return false;

        return true;
    }

    /**
     * shipment_orders에서 예약 접수 원본 payload 조회
     */
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
        if (row == null || row.get("cj_booking_payload") == null)
            return null;

        try {
            return OBJECT_MAPPER.readValue((String) row.get("cj_booking_payload"), Map.class);
        } catch (Exception e) {
            throw new ElidomRuntimeException(
                    "cj_booking_payload 파싱 실패: shipmentNo=" + shipmentNo, e);
        }
    }

    /**
     * 취소 결과 코드를 shipment_orders에 저장
     */
    private void saveCancelResult(Long domainId, String shipmentNo, String resultCd) {
        String sql = """
                UPDATE shipment_orders
                SET cj_cancel_result_cd = :resultCd, updated_at = now()
                WHERE domain_id = :domainId
                  AND shipment_no = :shipmentNo
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("shipmentNo", shipmentNo);
        params.put("resultCd", resultCd);

        this.queryManager.executeBySql(sql, params);
    }

    /**
     * courier_contracts 테이블에서 계약 설정 로드
     */
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
                    "CJ 계약 정보 없음: domainId=" + domainId + ", contractNo=" + contractNo);
        }

        CjContractConfig config = new CjContractConfig();
        config.setDomainId(domainId);
        config.setContractNo((String) row.get("contract_no"));
        config.setCustId((String) row.get("contract_no"));
        config.setApiBaseUrl((String) row.get("api_base_url"));
        return config;
    }
}
