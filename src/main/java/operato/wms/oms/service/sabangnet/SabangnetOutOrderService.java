package operato.wms.oms.service.sabangnet;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 3. 출고 주문 정보
 * - 신규/취소 주문 수집
 * - WMS 출고 주문 등록 (멱등성 처리)
 */
public class SabangnetOutOrderService {

    /*
     * To-Do List
     * System.out.printf(...) 제거
     * WMS DB에 주문 존재 여부 확인 (멱등성 처리) 구현 필요
     * WMS 출고 주문 테이블에 INSERT 구현 필요
     * syncCancelOrders(); WMS 출고 주문 취소 처리 허용 시점 확인 필요
     * WMS에서 해당 주문 취소 처리 구현 필요
     * getOrderList(...) 의 page_size 를 설정으로 변경
     */

    /**
     * 사방넷 주문 목록 조회
     * status: NEW(신규), CANCEL(취소), RETURN(반품)
     */
    public Map<String, Object> getOrderList(String status, int page) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("status", status);
        params.put("page", String.valueOf(page));
        params.put("page_size", "100");
        return SabangnetApiService.apiGet("/order/list", params);
    }

    /**
     * 사방넷 주문 상세 조회
     */
    public Map<String, Object> getOrderDetail(String orderNo) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("order_no", orderNo);
        return SabangnetApiService.apiGet("/order/detail", params);
    }

    /**
     * WMS DB에 주문 존재 여부 확인 (멱등성 처리)
     * TODO: 실제 DB 조회로 대체 필요
     */
    private boolean isOrderExists(String orderNo) {
        // return outboundOrderRepository.existsBySabangnetOrderNo(orderNo);
        return false; // 샘플용 placeholder
    }

    /**
     * 신규 주문 수집 → WMS 출고 주문 등록 (5~10분 간격 폴링 권장)
     */
    public void syncNewOrders() throws Exception {
        int page = 1;
        int newCount = 0;

        while (true) {
            Map<String, Object> result = getOrderList("NEW", page);
            Map<String, Object> data = (Map<String, Object>) result.get("data");
            List<Map<String, Object>> orders = (List<Map<String, Object>>) data.get("orders");

            if (orders == null || orders.isEmpty())
                break;

            for (Map<String, Object> order : orders) {
                String orderNo = (String) order.get("order_no");

                // 중복 주문 방지 (멱등성)
                if (isOrderExists(orderNo)) {
                    System.out.printf("[주문 스킵] 이미 처리된 주문: %s%n", orderNo);
                    continue;
                }

                Map<String, Object> detail = getOrderDetail(orderNo);

                Map<String, Object> wmsOrder = new LinkedHashMap<>();
                wmsOrder.put("sabangnet_order_no", orderNo);
                wmsOrder.put("shop_order_no", detail.get("shop_order_no"));
                wmsOrder.put("shop_name", detail.get("shop_name"));
                wmsOrder.put("receiver_name", detail.get("receiver_name"));
                wmsOrder.put("receiver_phone", detail.get("receiver_phone"));
                wmsOrder.put("receiver_address", detail.get("receiver_address"));
                wmsOrder.put("delivery_memo", detail.get("delivery_memo"));
                wmsOrder.put("items", detail.get("items"));
                wmsOrder.put("created_at", LocalDate.now().toString());

                // TODO: WMS 출고 주문 테이블에 INSERT
                // outboundOrderRepository.insert(wmsOrder);
                newCount++;
                System.out.printf("[출고 주문 등록] 주문번호: %s%n", orderNo);
            }
            page++;
        }
        System.out.printf("[출고 주문] 총 %d개 신규 주문 등록 완료%n", newCount);
    }

    /**
     * 취소 주문 수집 → WMS 출고 주문 취소 처리
     */
    public void syncCancelOrders() throws Exception {
        Map<String, Object> result = getOrderList("CANCEL", 1);
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        List<Map<String, Object>> orders = (List<Map<String, Object>>) data.get("orders");

        if (orders == null)
            return;

        for (Map<String, Object> order : orders) {
            String orderNo = (String) order.get("order_no");
            // TODO: WMS에서 해당 주문 취소 처리
            // outboundOrderRepository.updateStatus(orderNo, "CANCEL");
            System.out.printf("[주문 취소] 주문번호: %s%n", orderNo);
        }
    }
}
