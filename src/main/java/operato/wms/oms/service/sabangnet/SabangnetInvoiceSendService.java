package operato.wms.oms.service.sabangnet;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 5. 출고 송장 전송
 * - 사방넷 송장번호 단건 / 일괄 등록
 * - 실패 시 재시도 처리 (지수 백오프)
 */
public class SabangnetInvoiceSendService {

    /*
     * To-Do List
     * System.out.printf(...) 제거
     * WMS에서 당일 출고 완료 + 송장 미전송 주문 조회 구현 필요
     * WMS에서 송장 등록 완료 상태 업데이트
     * 슬랙/이메일/SMS 등으로 관리자 알림 발송
     * 샘플용 placeholder 제거 및 실제 WMS 데이터 연동
     */

    /**
     * 사방넷 송장번호 단건 등록
     */
    public Map<String, Object> sendInvoice(String orderNo,
            String courierCode,
            String invoiceNo) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("order_no", orderNo);
        payload.put("courier_code", courierCode);
        payload.put("invoice_no", invoiceNo);
        payload.put("shipped_date", LocalDate.now().toString());
        return SabangnetApiService.apiPost("/order/invoice", payload);
    }

    /**
     * 사방넷 송장번호 일괄 등록
     */
    public Map<String, Object> sendInvoiceBulk(List<Map<String, Object>> invoiceList) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("invoices", invoiceList);
        payload.put("shipped_date", LocalDate.now().toString());
        return SabangnetApiService.apiPost("/order/invoice/bulk", payload);
    }

    /**
     * 송장 등록 + 실패 시 재시도 처리 (최대 3회, 지수 백오프)
     */
    public void sendInvoiceWithRetry(String orderNo,
            String courierCode,
            String invoiceNo) {
        int maxRetry = 3;

        for (int attempt = 1; attempt <= maxRetry; attempt++) {
            try {
                Map<String, Object> result = sendInvoice(orderNo, courierCode, invoiceNo);

                if ("SUCCESS".equals(result.get("result_code"))) {
                    System.out.printf("[송장 등록 성공] 주문번호: %s, 송장번호: %s%n", orderNo, invoiceNo);
                    // TODO: WMS에서 송장 등록 완료 상태 업데이트
                    // outboundOrderRepository.updateInvoiceStatus(orderNo, "SENT");
                    return;
                } else {
                    System.out.printf("[송장 등록 실패] 시도 %d/%d, 주문번호: %s, 사유: %s%n",
                            attempt, maxRetry, orderNo, result.get("message"));
                }

            } catch (Exception e) {
                System.out.printf("[송장 등록 오류] 시도 %d/%d, 주문번호: %s, 오류: %s%n",
                        attempt, maxRetry, orderNo, e.getMessage());
            }

            // 지수 백오프: 2초, 4초
            if (attempt < maxRetry) {
                try {
                    Thread.sleep((long) Math.pow(2, attempt) * 1000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        // 3회 모두 실패 시 관리자 알림
        System.out.printf("[송장 등록 최종 실패] 관리자 알림 발송 - 주문번호: %s%n", orderNo);
        // TODO: 슬랙/이메일/SMS 등으로 관리자 알림 발송
        // notificationService.notifyAdmin("송장 등록 실패: " + orderNo);
    }

    /**
     * 당일 출고 완료 주문의 송장 일괄 전송
     */
    public void processDailyInvoices() throws Exception {
        // TODO: WMS에서 당일 출고 완료 + 송장 미전송 주문 조회
        // List<OutboundOrder> orders =
        // outboundOrderRepository.findByShippedDateAndInvoiceStatus(
        // LocalDate.now(), "PENDING");

        // 샘플용 placeholder
        List<Map<String, Object>> orders = Arrays.asList(
                new LinkedHashMap<String, Object>() {
                    {
                        put("sabangnet_order_no", "ORD001");
                        put("courier_code", SabangnetApiService.COURIER_CJ);
                        put("invoice_no", "111222333");
                    }
                },
                new LinkedHashMap<String, Object>() {
                    {
                        put("sabangnet_order_no", "ORD002");
                        put("courier_code", SabangnetApiService.COURIER_HANJIN);
                        put("invoice_no", "444555666");
                    }
                });

        List<Map<String, Object>> invoiceList = new ArrayList<>();
        for (Map<String, Object> order : orders) {
            Map<String, Object> invoice = new LinkedHashMap<>();
            invoice.put("order_no", order.get("sabangnet_order_no"));
            invoice.put("courier_code", order.get("courier_code"));
            invoice.put("invoice_no", order.get("invoice_no"));
            invoiceList.add(invoice);
        }

        Map<String, Object> result = sendInvoiceBulk(invoiceList);
        System.out.printf("[송장 일괄 전송] 총 %d건 전송 완료%n", invoiceList.size());

        // 실패 건 재처리
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        if (data != null) {
            List<Map<String, Object>> failed = (List<Map<String, Object>>) data.get("failed");
            if (failed != null) {
                for (Map<String, Object> item : failed) {
                    System.out.printf("[송장 재처리] 주문번호: %s%n", item.get("order_no"));
                    sendInvoiceWithRetry(
                            (String) item.get("order_no"),
                            (String) item.get("courier_code"),
                            (String) item.get("invoice_no"));
                }
            }
        }
    }
}
