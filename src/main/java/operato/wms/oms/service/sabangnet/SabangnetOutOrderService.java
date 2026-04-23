package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import xyz.anythings.sys.service.AbstractQueryService;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 사방넷 발주(출고 주문) 서비스
 * - 신규/취소 발주 수집 → WMS 출고 주문 등록/취소 처리
 *
 * 사방넷 API:
 *   발주 등록(단일)       : POST /v2/request/order
 *   발주 조회(단일)       : GET  /v2/request/order/{발주ID}
 *   발주 조회(벌크)       : GET  /v2/request/orders
 *   발주 취소요청 등록    : POST /v2/request/order_cancel
 *   발주 취소요청 조회(벌크): GET /v2/request/order_cancels
 *
 * 발주 진행상태(order_status):
 *   1.출고요청전, 3.출고요청, 5.송장등록완료, 7.출고완료, 9.출고취소
 *
 * 주의:
 *   - company_order_code(주문번호) 중복 불가
 *     (단, 발주 진행상태가 출고취소(9)인 건과 동일한 주문번호 재사용은 허용)
 *
 * TODO:
 *   - isOrderExists(): WMS DB에 주문 존재 여부 조회 구현 필요
 *   - WMS 출고 주문 테이블(shipment_orders)에 INSERT 구현 필요
 *   - syncCancelOrders(): WMS 출고 주문 취소 처리 구현 필요
 */
@Component
public class SabangnetOutOrderService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetOutOrderService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    /**
     * 사방넷 발주 목록 조회 (벌크)
     * 응답: response.data_list — 발주 기본 Object 리스트
     *
     * @param orderStatus  발주 진행상태 (1.출고요청전, 3.출고요청, 5.송장등록완료, 7.출고완료, 9.출고취소)
     * @param orderDt      발주 등록일 (YYYYMMDD, null이면 조건 없음)
     * @param page         페이지 번호
     */
    public Map<String, Object> getOrderList(int orderStatus, String orderDt,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("order_status", String.valueOf(orderStatus));
        if (orderDt != null) params.put("order_dt", orderDt);
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/request/orders", params, comCd, whCd);
    }

    /**
     * 사방넷 발주 단일 조회
     * 응답: response — 발주 기본 Object (order_product_list 포함)
     *
     * @param orderId 사방넷 발주 ID
     */
    public Map<String, Object> getOrderDetail(int orderId,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet("/v2/request/order/" + orderId, null, comCd, whCd);
    }

    /**
     * 발주 취소요청 목록 조회 (벌크)
     * 응답: response.data_list — 발주 취소요청 기본 Object 리스트
     *
     * @param cancelStatus 취소요청 상태 (1.취소요청, 2.취소요청 승인, 3.취소요청 반려)
     * @param regDate      요청일 (YYYYMMDD, null이면 조건 없음)
     * @param page         페이지 번호
     */
    public Map<String, Object> getCancelOrderList(Integer cancelStatus, String regDate,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        if (cancelStatus != null) params.put("cancel_status", String.valueOf(cancelStatus));
        if (regDate != null)      params.put("reg_date", regDate);
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/request/order_cancels", params, comCd, whCd);
    }

    /**
     * WMS DB에 주문 존재 여부 확인 (멱등성 처리)
     *
     * @param orderId 사방넷 발주 ID
     */
    private boolean isOrderExists(int orderId) {
        // TODO: WMS shipment_orders 테이블에서 sabangnet_order_id로 조회
        // return shipmentOrderRepository.existsBySabangnetOrderId(orderId);
        return false;
    }

    /**
     * 신규 발주 수집 → WMS 출고 주문 등록 (5~10분 간격 폴링 권장)
     * 발주 진행상태 1(출고요청전) 기준으로 조회
     */
    public void syncNewOrders(String comCd, String whCd) throws Exception {
        int page = 1;
        int newCount = 0;

        while (true) {
            Map<String, Object> result = getOrderList(1, null, page, comCd, whCd);

            if (!sabangnetApiService.isSuccess(result)) {
                log.error("[발주 동기화] API 오류 - code: {}, message: {}",
                        result.get("code"), result.get("message"));
                break;
            }

            Map<String, Object> response = (Map<String, Object>) result.get("response");
            List<Map<String, Object>> dataList =
                    (List<Map<String, Object>>) response.get("data_list");

            if (dataList == null || dataList.isEmpty()) break;

            for (Map<String, Object> order : dataList) {
                int orderId = Integer.parseInt(String.valueOf(order.get("order_id")));

                // 중복 발주 방지 (멱등성)
                if (isOrderExists(orderId)) {
                    log.debug("[발주 스킵] 이미 처리된 발주: {}", orderId);
                    continue;
                }

                // 상세 조회로 order_product_list 포함 정보 획득
                Map<String, Object> detailResult = getOrderDetail(orderId, comCd, whCd);
                if (!sabangnetApiService.isSuccess(detailResult)) continue;

                Map<String, Object> detail = (Map<String, Object>) detailResult.get("response");

                Map<String, Object> wmsOrder = new LinkedHashMap<>();
                wmsOrder.put("sabangnet_order_id",      orderId);
                wmsOrder.put("order_code",              detail.get("order_code"));
                wmsOrder.put("company_order_code",      detail.get("company_order_code"));
                wmsOrder.put("shipping_method_id",      detail.get("shipping_method_id"));
                wmsOrder.put("order_status",            detail.get("order_status"));
                wmsOrder.put("request_shipping_dt",     detail.get("request_shipping_dt"));
                wmsOrder.put("buyer_name",              detail.get("buyer_name"));
                wmsOrder.put("receiver_name",           detail.get("receiver_name"));
                wmsOrder.put("tel1",                    detail.get("tel1"));
                wmsOrder.put("tel2",                    detail.get("tel2"));
                wmsOrder.put("zipcode",                 detail.get("zipcode"));
                wmsOrder.put("shipping_address1",       detail.get("shipping_address1"));
                wmsOrder.put("shipping_address2",       detail.get("shipping_address2"));
                wmsOrder.put("shipping_message",        detail.get("shipping_message"));
                wmsOrder.put("order_product_list",      detail.get("order_product_list"));

                // TODO: WMS shipment_orders 테이블에 INSERT
                // shipmentOrderRepository.insert(wmsOrder);
                newCount++;
                log.info("[발주 등록] 발주ID: {}, 주문번호: {}",
                        orderId, detail.get("company_order_code"));
            }

            Object totalPage = response.get("total_page");
            if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage))) break;
            page++;
        }
        log.info("[발주 동기화] 총 {}건 신규 발주 등록 완료", newCount);
    }

    /**
     * 취소 승인 발주 수집 → WMS 출고 주문 취소 처리
     * 취소요청 상태 2(취소요청 승인) 기준으로 조회하여 모든 페이지 처리
     */
    public void syncCancelOrders(String comCd, String whCd) throws Exception {
        int page = 1;
        int cancelCount = 0;

        while (true) {
            Map<String, Object> result = getCancelOrderList(2, null, page, comCd, whCd);

            if (!sabangnetApiService.isSuccess(result)) {
                log.error("[발주 취소 동기화] API 오류 - code: {}, message: {}",
                        result.get("code"), result.get("message"));
                break;
            }

            Map<String, Object> response = (Map<String, Object>) result.get("response");
            List<Map<String, Object>> dataList =
                    (List<Map<String, Object>>) response.get("data_list");

            if (dataList == null || dataList.isEmpty()) break;

            for (Map<String, Object> cancel : dataList) {
                int orderId = Integer.parseInt(String.valueOf(cancel.get("order_id")));
                // TODO: WMS에서 해당 주문 취소 처리 (출고 허용 시점 확인 필요)
                // shipmentOrderRepository.updateStatus(orderId, "CANCEL");
                cancelCount++;
                log.info("[발주 취소] 발주ID: {}, 취소ID: {}", orderId, cancel.get("cancel_id"));
            }

            Object totalPage = response.get("total_page");
            if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage))) break;
            page++;
        }
        log.info("[발주 취소 동기화] 총 {}건 취소 처리 완료", cancelCount);
    }
}
