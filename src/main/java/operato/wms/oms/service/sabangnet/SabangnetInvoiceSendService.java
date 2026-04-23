package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import xyz.anythings.sys.service.AbstractQueryService;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 사방넷 운송장 전송 서비스
 * - 사방넷 운송장 번호 단건/일괄 등록 (PUT)
 * - 실패 시 재시도 처리 (지수 백오프)
 *
 * 사방넷 API:
 *   운송장 수정(단일) : PUT /v2/release/shipping_code/{릴리즈ID}
 *                      Body: { delivery_agency_id(int), shipping_code(string) }
 *   운송장 수정(벌크) : PUT /v2/release/shipping_codes
 *                      Body: { request_data_list: [{release_id, delivery_agency_id, shipping_code}, ...] }
 *   운송장 일반 조회  : GET /v2/release/shipping_codes
 *   운송장 최근 조회  : GET /v2/release/recent_shipping_codes
 *
 * 주의:
 *   - 파라미터가 order_no → release_id(릴리즈 ID, integer) 로 변경됨
 *   - 택배사는 courier_code(문자) 아닌 delivery_agency_id(사방넷 택배사 ID, integer) 사용
 *   - 성공 응답 코드: "9999"
 *
 * TODO:
 *   - processDailyInvoices(): WMS에서 당일 출고완료 + 송장 미전송 주문 조회 구현 필요
 *   - WMS 송장 등록 완료 상태 업데이트 구현 필요
 *   - 슬랙/이메일/SMS 등 관리자 알림 발송 구현 필요
 */
@Component
public class SabangnetInvoiceSendService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetInvoiceSendService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    /**
     * 사방넷 운송장 단건 등록
     * PUT /v2/release/shipping_code/{릴리즈ID}
     *
     * @param releaseId        사방넷 릴리즈(출고) ID
     * @param deliveryAgencyId 사방넷 택배사 ID (integer)
     * @param shippingCode     운송장 번호
     */
    public Map<String, Object> sendInvoice(int releaseId, int deliveryAgencyId,
            String shippingCode, String comCd, String whCd) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("delivery_agency_id", deliveryAgencyId);
        payload.put("shipping_code", shippingCode);
        return sabangnetApiService.apiPut(
                "/v2/release/shipping_code/" + releaseId, payload, comCd, whCd);
    }

    /**
     * 사방넷 운송장 일괄 등록
     * PUT /v2/release/shipping_codes
     *
     * @param invoiceList 운송장 목록
     *                    각 항목: { release_id(int), delivery_agency_id(int), shipping_code(string) }
     */
    public Map<String, Object> sendInvoiceBulk(List<Map<String, Object>> invoiceList,
            String comCd, String whCd) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("request_data_list", invoiceList);
        return sabangnetApiService.apiPut("/v2/release/shipping_codes", payload, comCd, whCd);
    }

    /**
     * 운송장 일반 조회 (출고희망일 기준)
     * GET /v2/release/shipping_codes
     *
     * @param requestShippingDt 출고희망일 (YYYYMMDD, 필수)
     * @param releaseStatus     출고 진행상태 (1.출고요청, 3.출고지시, 5.출고작업중, 7.출고완료, 9.출고취소)
     * @param page              페이지 번호
     */
    public Map<String, Object> getShippingCodes(String requestShippingDt, Integer releaseStatus,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new java.util.HashMap<>();
        params.put("request_shipping_dt", requestShippingDt);
        if (releaseStatus != null) params.put("release_status", String.valueOf(releaseStatus));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/release/shipping_codes", params, comCd, whCd);
    }

    /**
     * 운송장 최근 조회 (출고일 기준, 변경분만 조회)
     * GET /v2/release/recent_shipping_codes
     *
     * @param releaseDate   출고희망일 (YYYYMMDD, 필수)
     * @param lastHistoryId 직전 호출에서 받은 last_history_id (처음 호출 시 null)
     * @param page          페이지 번호
     */
    public Map<String, Object> getRecentShippingCodes(String releaseDate, Integer lastHistoryId,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new java.util.HashMap<>();
        params.put("release_date", releaseDate);
        if (lastHistoryId != null) params.put("last_history_id", String.valueOf(lastHistoryId));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/release/recent_shipping_codes", params, comCd, whCd);
    }

    /**
     * 운송장 단건 등록 + 실패 시 재시도 (최대 3회, 지수 백오프)
     *
     * @param releaseId        사방넷 릴리즈 ID
     * @param deliveryAgencyId 사방넷 택배사 ID
     * @param shippingCode     운송장 번호
     */
    public void sendInvoiceWithRetry(int releaseId, int deliveryAgencyId,
            String shippingCode, String comCd, String whCd) {
        int maxRetry = 3;

        for (int attempt = 1; attempt <= maxRetry; attempt++) {
            try {
                Map<String, Object> result = sendInvoice(
                        releaseId, deliveryAgencyId, shippingCode, comCd, whCd);

                if (sabangnetApiService.isSuccess(result)) {
                    log.info("[운송장 등록 성공] 릴리즈ID: {}, 운송장: {}", releaseId, shippingCode);
                    // TODO: WMS에서 송장 등록 완료 상태 업데이트
                    // shipmentOrderRepository.updateShippingCodeStatus(releaseId, "SENT");
                    return;
                } else {
                    log.warn("[운송장 등록 실패] 시도 {}/{}, 릴리즈ID: {}, code: {}, message: {}",
                            attempt, maxRetry, releaseId, result.get("code"), result.get("message"));
                }

            } catch (Exception e) {
                log.error("[운송장 등록 오류] 시도 {}/{}, 릴리즈ID: {}, 오류: {}",
                        attempt, maxRetry, releaseId, e.getMessage());
            }

            // 지수 백오프: 2초, 4초
            if (attempt < maxRetry) {
                try {
                    Thread.sleep((long) Math.pow(2, attempt) * 1000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }

        // 3회 모두 실패 시 관리자 알림
        log.error("[운송장 등록 최종 실패] 릴리즈ID: {} — 관리자 알림 필요", releaseId);
        // TODO: 슬랙/이메일/SMS 등으로 관리자 알림 발송
        // notificationService.notifyAdmin("운송장 등록 실패 - 릴리즈ID: " + releaseId);
    }

    /**
     * 당일 출고 완료 주문의 운송장 일괄 전송
     * 사방넷 릴리즈 ID 기준으로 일괄 PUT 요청 후 실패 건 재처리
     */
    public void processDailyInvoices(String comCd, String whCd) throws Exception {
        // TODO: WMS에서 당일 출고완료 + 송장 미전송 주문 조회
        // 각 항목에 sabangnet_release_id, delivery_agency_id, shipping_code 필요
        // List<ShipmentOrder> orders = shipmentOrderRepository.findPendingInvoices(LocalDate.now());

        // 샘플 placeholder — 실제 WMS 데이터로 교체 필요
        List<Map<String, Object>> invoiceList = new ArrayList<>();
        // invoiceList = orders.stream().map(o -> {
        //     Map<String, Object> item = new LinkedHashMap<>();
        //     item.put("release_id", o.getSabangnetReleaseId());
        //     item.put("delivery_agency_id", o.getDeliveryAgencyId());
        //     item.put("shipping_code", o.getShippingCode());
        //     return item;
        // }).collect(Collectors.toList());

        if (invoiceList.isEmpty()) {
            log.info("[운송장 일괄 전송] 전송 대상 없음");
            return;
        }

        Map<String, Object> result = sendInvoiceBulk(invoiceList, comCd, whCd);
        log.info("[운송장 일괄 전송] 총 {}건 전송 완료", invoiceList.size());

        if (!sabangnetApiService.isSuccess(result)) {
            log.error("[운송장 일괄 전송] API 오류 - code: {}, message: {}",
                    result.get("code"), result.get("message"));
            return;
        }

        // 벌크 실패 건 단건 재처리
        Map<String, Object> response = (Map<String, Object>) result.get("response");
        if (response == null) return;

        List<Map<String, Object>> processedList =
                (List<Map<String, Object>>) response.get("processed_data_list");
        if (processedList == null) return;

        // processed_data_list 중 실패 건 식별 후 재시도 (실패 구분 기준은 사방넷 응답 스펙 확인 필요)
        for (Map<String, Object> item : processedList) {
            if (!"9999".equals(item.get("code"))) {
                int releaseId = Integer.parseInt(String.valueOf(item.get("release_id")));
                int deliveryAgencyId = Integer.parseInt(String.valueOf(item.get("delivery_agency_id")));
                String shippingCode = String.valueOf(item.get("shipping_code"));
                log.warn("[운송장 재처리] 릴리즈ID: {}", releaseId);
                sendInvoiceWithRetry(releaseId, deliveryAgencyId, shippingCode, comCd, whCd);
            }
        }
    }
}
