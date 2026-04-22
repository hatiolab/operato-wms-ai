package operato.wms.oms.service.sabangnet;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 4. 재고 동기화
 * - 사방넷 재고 조회 / 단건 / 일괄 업데이트
 * - WMS 가용재고 계산 및 동기화
 */
public class SabangnetStockSyncService {

    /*
     * To-Do List
     * System.out.printf(...) 제거
     * calculateAvailableQty(...); WMS 가용재고 계산 구현 필요
     * syncStockAll(); WMS에서 전체 상품 코드 목록 조회 구현 필요
     * syncStockSingle(); 단건 재고 즉시 동기화 (출고/입고/조정 발생 시 호출) 사용 여부 확인
     */

    /**
     * 사방넷 현재 재고 조회
     */
    public Map<String, Object> getStockList() throws Exception {
        return SabangnetApiService.apiGet("/stock/list", new HashMap<>());
    }

    /**
     * 사방넷 재고 수량 단건 업데이트
     */
    public Map<String, Object> updateStock(String productCode, int availableQty) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("product_code", productCode);
        payload.put("available_qty", availableQty);
        return SabangnetApiService.apiPost("/stock/update", payload);
    }

    /**
     * 재고 일괄 업데이트
     * stockList: [{"product_code": "P001", "available_qty": 100}, ...]
     */
    public Map<String, Object> bulkUpdateStock(List<Map<String, Object>> stockList) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("stocks", stockList);
        return SabangnetApiService.apiPost("/stock/bulk_update", payload);
    }

    /**
     * WMS 가용재고 계산
     * 가용재고 = 총재고 - 불량재고 - 보류재고 - 출고예정재고
     * TODO: 실제 WMS DB 조회로 대체 필요
     */
    private int calculateAvailableQty(String productCode) {
        // int totalQty = inventoryRepository.sumQty(productCode, "NORMAL");
        // int defectQty = inventoryRepository.sumQty(productCode, "DEFECT");
        // int holdQty = inventoryRepository.sumQty(productCode, "HOLD");
        // int pendingQty = outboundItemRepository.sumPendingQty(productCode);
        // return totalQty - defectQty - holdQty - pendingQty;
        return 100; // 샘플용 placeholder
    }

    /**
     * 전체 재고 동기화 (매일 새벽 전체 보정 권장)
     */
    public void syncStockAll() throws Exception {
        // TODO: WMS에서 전체 상품 코드 목록 조회
        // List<String> productCodes = productMasterRepository.findAllProductCodes();
        List<String> productCodes = Arrays.asList("P001", "P002", "P003"); // 샘플용 placeholder

        List<Map<String, Object>> stockList = new ArrayList<>();
        for (String productCode : productCodes) {
            int availableQty = calculateAvailableQty(productCode);
            Map<String, Object> stock = new LinkedHashMap<>();
            stock.put("product_code", productCode);
            stock.put("available_qty", availableQty);
            stockList.add(stock);
        }

        bulkUpdateStock(stockList);
        System.out.printf("[재고 동기화] 총 %d개 상품 재고 동기화 완료%n", stockList.size());
    }

    /**
     * 단건 재고 즉시 동기화 (출고/입고/조정 발생 시 호출)
     */
    public void syncStockSingle(String productCode) throws Exception {
        int availableQty = calculateAvailableQty(productCode);
        updateStock(productCode, availableQty);
        System.out.printf("[재고 즉시 동기화] 상품코드: %s, 가용재고: %d%n", productCode, availableQty);
    }
}
