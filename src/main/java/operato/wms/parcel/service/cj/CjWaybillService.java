package operato.wms.parcel.service.cj;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import operato.wms.parcel.entity.CourierContract;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.sys.util.ValueUtil;

/**
 * CJ대한통운 운송장 번호 발급 서비스
 *
 * 대역 방식(courier_contracts.start_bandwidth ~ end_bandwidth)과
 * API 채번 방식(ReqInvcNo)을 지원하며, 대역이 설정된 경우 대역 방식을 우선 사용한다.
 *
 * 참조: docs/interface/courier/cj/waybill-number.md
 */
@Component
public class CjWaybillService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjWaybillService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /** 대역 잔여 수량 경고 임계값 */
    private static final long BANDWIDTH_WARN_THRESHOLD = 100L;

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * 운송장 번호 발급 — 대역 방식 우선, 없으면 API 채번
     *
     * 포장 완료 직전 시점에만 호출해야 한다.
     * API 채번 방식은 당일 사용 원칙이므로 사전 선행 발급 금지 (CJ FAQ 1.4.9).
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (courier_contracts.contract_no)
     * @return 발급된 운송장 번호
     */
    public String issueWaybillNo(Long domainId, String contractNo) {
        CourierContract contract = this.loadActiveContract(domainId, contractNo);
        if (contract == null) {
            throw new ElidomRuntimeException(
                    "CJ 계약 정보 없음: domainId=" + domainId + ", contractNo=" + contractNo);
        }

        if (this.hasBandwidth(contract)) {
            return this.issueFromBandwidth(domainId, contractNo, contract);
        } else {
            return this.issueFromApi(domainId, contractNo, contract);
        }
    }

    // ── 대역 방식 ─────────────────────────────────────────────────────────────

    /**
     * 대역 설정 여부 확인
     */
    private boolean hasBandwidth(CourierContract contract) {
        return ValueUtil.isNotEmpty(contract.getStartBandwidth()) && contract.getStartBandwidth() > 0
                && ValueUtil.isNotEmpty(contract.getEndBandwidth()) && contract.getEndBandwidth() > 0;
    }

    /**
     * 대역에서 순차(+1) 채번 — DB UPDATE RETURNING으로 원자적 처리
     *
     * current_no 업데이트는 반드시 DB 레벨 원자적 UPDATE로 처리해야
     * 멀티 인스턴스 환경에서 동시 발급 충돌을 방지할 수 있다.
     */
    private String issueFromBandwidth(Long domainId, String contractNo, CourierContract contract) {
        String sql = """
                UPDATE courier_contracts
                   SET current_no = COALESCE(current_no, start_bandwidth - 1) + 1,
                       use_cnt    = COALESCE(use_cnt, 0) + 1,
                       updated_at = now()
                 WHERE id = :id
                   AND (COALESCE(current_no, start_bandwidth - 1) + 1) <= end_bandwidth
                RETURNING current_no
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("id", contract.getId());

        Long nextNo = this.queryManager.selectBySql(sql, params, Long.class);

        if (nextNo == null) {
            throw new ElidomRuntimeException(
                    "CJ 운송장 번호 대역 소진: contractNo=" + contractNo + ", contractId=" + contract.getId());
        }

        // 잔여 대역 경고
        long remaining = contract.getEndBandwidth() - nextNo;
        if (remaining < BANDWIDTH_WARN_THRESHOLD) {
            log.warn("CJ 운송장 번호 대역 잔여 {}건 — 재계약 필요 (contractNo={}, contractId={})",
                    remaining, contractNo, contract.getId());
        }

        log.debug("CJ 운송장 번호 발급(대역): contractNo={}, invcNo={}, remaining={}", contractNo, nextNo, remaining);
        return String.valueOf(nextNo);
    }

    // ── API 채번 방식 ──────────────────────────────────────────────────────────

    /**
     * ReqInvcNo API 호출하여 운송장 번호 건별 발급
     *
     * 1회 호출로 1건만 발급 가능 (CJ 정책).
     * 발급 번호는 생성 당일 반드시 사용해야 하며, 미사용 누적 시 API 제한될 수 있음.
     */
    @SuppressWarnings("unchecked")
    private String issueFromApi(Long domainId, String contractNo, CourierContract contract) {
        String tokenNum = this.cjTokenService.getToken(domainId, contractNo);
        String url = contract.getApiBaseUrl() + "/ReqInvcNo";

        try {
            Map<String, Object> data = new HashMap<>();
            data.put("TOKEN_NUM", tokenNum);
            data.put("CLNTNUM", contract.getContractNo());

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
                        "ReqInvcNo HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo);
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");

            if (!"S".equals(resultCd)) {
                throw new ElidomRuntimeException(
                        "운송장 번호 발급 실패: " + responseBody.get("RESULT_DETAIL"));
            }

            Map<String, Object> responseData = (Map<String, Object>) responseBody.get("DATA");
            String invcNo = (String) responseData.get("INVC_NO");

            // 사용 수량 증가
            Map<String, Object> updateParams = new HashMap<>();
            updateParams.put("id", contract.getId());
            this.queryManager.executeBySql(
                    "UPDATE courier_contracts SET use_cnt = COALESCE(use_cnt, 0) + 1, updated_at = now() WHERE id = :id",
                    updateParams);

            log.debug("CJ 운송장 번호 발급(API): contractNo={}, invcNo={}", contractNo, invcNo);
            return invcNo;

        } catch (ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException("ReqInvcNo 오류: contractNo=" + contractNo, e);
        }
    }

    // ── 내부 유틸리티 ──────────────────────────────────────────────────────────

    /**
     * 활성 계약 조회
     */
    private CourierContract loadActiveContract(Long domainId, String contractNo) {
        String sql = """
                SELECT id, contract_no, api_base_url,
                       start_bandwidth, end_bandwidth, current_no, total_cnt, use_cnt
                FROM courier_contracts
                WHERE domain_id   = :domainId
                  AND dlv_vend_cd = 'cj'
                  AND contract_no = :contractNo
                  AND del_flag IS NOT TRUE
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("contractNo", contractNo);

        return this.queryManager.selectBySql(sql, params, CourierContract.class);
    }
}
