package operato.wms.oms.service.sabangnet;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 2. 입고 주문 정보
 * - 사방넷 발주 목록/상세 조회
 * - WMS 입고 예정 등록
 * - 입고 완료 처리
 */
public class SabangnetInOrderService {

    /*
     * To-Do List
     * syncPurchaseOrders(); WMS 입고 예정 테이블에 등록 구현 필요
     * confirmPurchaseReceive(...); WMS 입고 확정 후 사방넷에 통보
     */

    /**
     * 사방넷 발주 목록 조회
     */
    public Map<String, Object> getPurchaseList(String startDate, String endDate) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("start_date", startDate);
        params.put("end_date", endDate);
        params.put("status", "NEW");
        return SabangnetApiService.apiGet("/purchase/list", params);
    }

    /**
     * 사방넷 발주 상세 조회
     */
    public Map<String, Object> getPurchaseDetail(String purchaseNo) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("purchase_no", purchaseNo);
        return SabangnetApiService.apiGet("/purchase/detail", params);
    }

    /**
     * 입고 완료 처리 (WMS 입고 확정 후 사방넷에 통보)
     * items: [{"product_code": "P001", "received_qty": 100}, ...]
     */
    public Map<String, Object> confirmPurchaseReceive(String purchaseNo,
            List<Map<String, Object>> items) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("purchase_no", purchaseNo);
        payload.put("received_date", LocalDate.now().toString());
        payload.put("items", items);
        return SabangnetApiService.apiPost("/purchase/receive", payload);
    }

    /**
     * 신규 발주 동기화 → WMS 입고 예정 등록
     */
    public void syncPurchaseOrders() throws Exception {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        Map<String, Object> result = getPurchaseList(today, today);
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        List<Map<String, Object>> purchases = (List<Map<String, Object>>) data.get("purchases");

        if (purchases == null)
            return;

        for (Map<String, Object> purchase : purchases) {
            String purchaseNo = (String) purchase.get("purchase_no");
            Map<String, Object> detail = getPurchaseDetail(purchaseNo);

            Map<String, Object> wmsInbound = new LinkedHashMap<>();
            wmsInbound.put("purchase_no", purchaseNo);
            wmsInbound.put("supplier", detail.get("supplier_name"));
            wmsInbound.put("expected_date", detail.get("expected_date"));
            wmsInbound.put("items", detail.get("items"));

            // TODO: WMS 입고 예정 테이블에 등록
            // inboundOrderRepository.insert(wmsInbound);
            System.out.printf("[입고 예정 등록] 발주번호: %s%n", purchaseNo);
        }
    }
}
