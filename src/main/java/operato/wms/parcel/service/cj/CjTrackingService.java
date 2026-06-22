package operato.wms.parcel.service.cj;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;

/**
 * CJ대한통운 상품추적 서비스
 *
 * 단건 조회(ReqOneGdsTrc)와 대량 조회(ReqMssGdsTrc) + 수신 확인(RcvMssGdsTrcCnfrm)을 담당한다.
 * 대량 조회는 스케줄러(CjTrackingScheduler)에서 호출하며,
 * 단건 조회는 화면에서 즉시 조회 시 호출한다.
 *
 * 전제: shipment_orders 테이블에 delivery_status, dlv_fail_rsn_cd,
 * dlv_fail_rsn_detail 컬럼 추가 마이그레이션 필요.
 * 참조: docs/interface/courier/cj/tracking.md
 */
@Component
public class CjTrackingService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjTrackingService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /** 배송완료 화물상태 코드 */
    private static final String CRG_ST_DELIVERED = "91";
    /** 배송실패 화물상태 코드 */
    private static final String CRG_ST_DELIVERY_FAILED = "84";
    /** 미집화 화물상태 코드 */
    private static final String CRG_ST_PICKUP_FAILED = "12";

    @Autowired
    private CjTokenService cjTokenService;

    // ── 단건 조회 ──────────────────────────────────────────────────────────────

    /**
     * 운송장 번호 기준 단건 조회 — ReqOneGdsTrc
     *
     * 고객 화면에서 특정 운송장의 배송 현황을 즉시 조회할 때 사용한다.
     * 전체 이력 일괄 업데이트 목적에는 적합하지 않으므로 syncTrackingData() 사용 권장.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (courier_contracts.contract_no)
     * @param invcNo     운송장 번호
     * @return 해당 운송장의 스캔 이력 목록 (최신순)
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> trackByInvcNo(Long domainId, String contractNo, String invcNo) {
        CjContractConfig config = this.loadConfig(domainId, contractNo);
        String tokenNum = this.cjTokenService.getToken(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/ReqOneGdsTrc";

        Map<String, Object> data = new HashMap<>();
        data.put("TOKEN_NUM", tokenNum);
        data.put("CLNTNUM", config.getCustId()); // ReqOneGdsTrc는 CLNTNUM 사용
        data.put("INVC_NO", invcNo);

        Map<String, Object> responseBody = this.callApi(url, tokenNum, data);
        this.assertSuccess(responseBody, "ReqOneGdsTrc");

        List<Map<String, Object>> result = (List<Map<String, Object>>) responseBody.get("DATA");
        return result != null ? result : new ArrayList<>();
    }

    // ── 대량 조회 + 수신 확인 ────────────────────────────────────────────────────

    /**
     * 일자별 미전송 추적 데이터 동기화 — ReqMssGdsTrc + RcvMssGdsTrcCnfrm
     *
     * 500건 단위로 잔여 데이터가 없을 때까지 반복 조회하며,
     * 각 배치 처리 완료 후 RcvMssGdsTrcCnfrm으로 수신 확인을 전송한다.
     * 처리 실패한 건은 수신 확인 대상에서 제외하므로 다음 호출 시 재전송된다.
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (courier_contracts.contract_no)
     * @param reqDt      조회 일자 (YYYYMMDD)
     */
    @SuppressWarnings("unchecked")
    public void syncTrackingData(Long domainId, String contractNo, String reqDt) {
        CjContractConfig config = this.loadConfig(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/ReqMssGdsTrc";
        String confirmUrl = config.getApiBaseUrl() + "/RcvMssGdsTrcCnfrm";

        int totalProcessed = 0;

        while (true) {
            // 토큰은 루프마다 갱신 (장시간 실행 시 만료 방지)
            String tokenNum = this.cjTokenService.getToken(domainId, contractNo);

            Map<String, Object> data = new HashMap<>();
            data.put("TOKEN_NUM", tokenNum);
            data.put("CUST_ID", config.getCustId()); // ReqMssGdsTrc는 CUST_ID 사용
            data.put("REQ_DT", reqDt);
            data.put("SND_YN", "N"); // 수신 확인을 WMS에서 직접 처리

            Map<String, Object> responseBody = this.callApi(url, tokenNum, data);
            this.assertSuccess(responseBody, "ReqMssGdsTrc");

            List<Map<String, Object>> items = (List<Map<String, Object>>) responseBody.get("DATA");
            if (items == null || items.isEmpty())
                break;

            // 추적 이벤트 저장 및 shipment_orders 상태 업데이트 — 성공 건만 수신 확인 대상
            List<Map<String, Object>> confirmedItems = new ArrayList<>();
            List<Map<String, Object>> failedItems = new ArrayList<>();

            for (Map<String, Object> item : items) {
                try {
                    this.saveTrackingEvent(domainId, item);
                    this.updateShipmentStatus(domainId, item);
                    confirmedItems.add(item);
                } catch (Exception e) {
                    log.error("추적 이벤트 처리 실패: invcNo={}, crgSt={}",
                            item.get("INVC_NO"), item.get("CRG_ST"), e);
                    failedItems.add(item);
                }
            }

            // 처리 성공 건만 수신 확인 전송 (실패 건은 다음 조회 시 재수신)
            if (!confirmedItems.isEmpty()) {
                this.confirmTracking(config, tokenNum, confirmUrl, confirmedItems);
            }

            totalProcessed += confirmedItems.size();

            // 전체 실패 시 무한 루프 방지
            if (!failedItems.isEmpty() && confirmedItems.isEmpty()) {
                log.error("추적 데이터 전체 처리 실패, 동기화 중단: domainId={}, contractNo={}, reqDt={}",
                        domainId, contractNo, reqDt);
                break;
            }
        }

        if (totalProcessed > 0) {
            log.info("CJ 추적 동기화 완료: domainId={}, contractNo={}, reqDt={}, processed={}건",
                    domainId, contractNo, reqDt, totalProcessed);
        }
    }

    // ── 수신 확인 ─────────────────────────────────────────────────────────────

    /**
     * 수신 확인 전송 — RcvMssGdsTrcCnfrm (500건 단위 분할)
     *
     * SND_YN=N으로 조회한 데이터는 처리 완료 후 반드시 호출해야 한다.
     * 미호출 시 다음 ReqMssGdsTrc 호출 시 동일 데이터가 반복 전송된다.
     * 수신 확인에는 CUST_ID가 아닌 CLNTNUM 파라미터를 사용한다.
     */
    private void confirmTracking(
            CjContractConfig config, String tokenNum,
            String confirmUrl, List<Map<String, Object>> items) {

        for (int i = 0; i < items.size(); i += 500) {
            List<Map<String, Object>> batch = items.subList(i, Math.min(i + 500, items.size()));

            List<Map<String, Object>> array = batch.stream()
                    .map(item -> {
                        Map<String, Object> entry = new HashMap<>();
                        entry.put("INVC_NO", item.get("INVC_NO"));
                        entry.put("CRG_ST", item.get("CRG_ST")); // 응답 값 그대로 전달
                        return entry;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> data = new HashMap<>();
            data.put("TOKEN_NUM", tokenNum);
            data.put("CLNTNUM", config.getCustId()); // 수신 확인은 CLNTNUM 사용
            data.put("ARRAY", array);

            try {
                Map<String, Object> responseBody = this.callApi(confirmUrl, tokenNum, data);
                if (!"S".equals(responseBody.get("RESULT_CD"))) {
                    log.error("RcvMssGdsTrcCnfrm 실패: batch={}/{}, detail={}",
                            i / 500 + 1, (items.size() - 1) / 500 + 1, responseBody.get("RESULT_DETAIL"));
                }
            } catch (Exception e) {
                // 수신 확인 실패 시 다음 조회에서 재수신되므로 오류 로그만 남기고 계속 진행
                log.error("RcvMssGdsTrcCnfrm 오류: batch={}/{}",
                        i / 500 + 1, (items.size() - 1) / 500 + 1, e);
            }
        }
    }

    // ── DB 처리 ──────────────────────────────────────────────────────────────

    /**
     * 추적 이벤트 저장 — shipment_tracking_events
     *
     * ON CONFLICT DO NOTHING으로 중복 이벤트를 멱등하게 처리한다.
     * unique constraint: (domain_id, invc_no, crg_st, scan_ymd, scan_hour)
     */
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
                ON CONFLICT (domain_id, invc_no, crg_st, scan_ymd, scan_hour) DO NOTHING
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("shipmentNo", item.getOrDefault("CUST_USE_NO", ""));
        params.put("invcNo", item.get("INVC_NO"));
        params.put("crgSt", item.get("CRG_ST"));
        params.put("crgStNm", item.getOrDefault("CRG_ST_NM", ""));
        params.put("scanYmd", item.getOrDefault("SCAN_YMD", ""));
        params.put("scanHour", item.getOrDefault("SCAN_HOUR", ""));
        params.put("dealtBranNm", item.getOrDefault("DEALT_BRAN_NM", ""));
        params.put("dealempNm", item.getOrDefault("DEALEMP_NM", ""));
        params.put("acptrNm", item.getOrDefault("ACPTR_NM", ""));
        params.put("noCldvRsnCd", item.get("NO_CLDV_RSN_CD"));
        params.put("detailRsn", item.get("DETAIL_RSN"));

        this.queryManager.executeBySql(sql, params);
    }

    /**
     * 화물상태 코드 기준으로 shipment_orders 배송 상태 업데이트
     *
     * 전제: shipment_orders 테이블에 아래 컬럼 마이그레이션 필요
     * - delivery_status VARCHAR(30)
     * - dlv_fail_rsn_cd VARCHAR(2)
     * - dlv_fail_rsn_detail VARCHAR(50)
     */
    private void updateShipmentStatus(Long domainId, Map<String, Object> item) {
        String crgSt = (String) item.get("CRG_ST");
        String custUseNo = (String) item.get("CUST_USE_NO");
        if (custUseNo == null || custUseNo.isBlank())
            return;

        String newStatus = this.toDeliveryStatus(crgSt);
        if (newStatus == null)
            return;

        String sql = """
                UPDATE shipment_orders
                SET delivery_status      = :status,
                    dlv_fail_rsn_cd      = :failRsnCd,
                    dlv_fail_rsn_detail  = :failRsnDetail,
                    updated_at           = now()
                WHERE domain_id  = :domainId
                  AND shipment_no = :shipmentNo
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("shipmentNo", custUseNo);
        params.put("status", newStatus);
        params.put("failRsnCd", item.getOrDefault("NO_CLDV_RSN_CD", null));
        params.put("failRsnDetail", item.getOrDefault("DETAIL_RSN", null));

        this.queryManager.executeBySql(sql, params);
    }

    /**
     * CJ 화물상태 코드 → WMS delivery_status 변환
     * 상태 변화에 의미 있는 코드만 처리하며, 나머지는 null 반환(업데이트 생략).
     */
    private String toDeliveryStatus(String crgSt) {
        if (crgSt == null)
            return null;
        switch (crgSt) {
            case "11":
                return "PICKED_UP"; // 집화처리
            case "41":
                return "IN_TRANSIT"; // 간선상차
            case "82":
                return "OUT_FOR_DELIVERY"; // 배송출발
            case "91":
                return "DELIVERED"; // 배송완료
            case "84":
                return "DELIVERY_FAILED"; // 미배송
            case "12":
                return "PICKUP_FAILED"; // 미집화
            default:
                return null;
        }
    }

    // ── 공통 유틸리티 ─────────────────────────────────────────────────────────

    /**
     * CJ API HTTP 호출 공통 메서드
     */
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
                throw new ElidomRuntimeException("CJ API HTTP 오류: status=" + response.statusCode() + ", url=" + url);
            }

            return OBJECT_MAPPER.readValue(response.body(), Map.class);

        } catch (ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException("CJ API 호출 오류: url=" + url, e);
        }
    }

    /**
     * API 응답 성공 여부 검증
     */
    private void assertSuccess(Map<?, ?> body, String apiName) {
        if (!"S".equals(body.get("RESULT_CD"))) {
            throw new ElidomRuntimeException(apiName + " 실패: " + body.get("RESULT_DETAIL"));
        }
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
