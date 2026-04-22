package operato.wms.oms.service.sabangnet;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 1. 상품 마스터 정보
 * 사방넷 상품 목록/상세 조회
 * WMS 상품 마스터 매핑 테이블 동기화
 * getSkuList(...); getSkuDetail(...); 어떤 데이터를 받는지 확인 필요.
 */
public class SabangnetSkuService {

    /*
     * To-Do List
     * System.out.printf(...) 제거
     * getSkuList(...) 의 page_size 를 설정으로 변경
     * syncSku(); WMS DB에 upsert 처리 구현 필요
     * 
     */

    /**
     * 사방넷 상품 목록 조회
     */
    public Map<String, Object> getSkuList(int page, int pageSize) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("page", String.valueOf(page));
        params.put("page_size", String.valueOf(pageSize));
        return SabangnetApiService.apiGet("/product/list", params);
    }

    /**
     * 사방넷 상품 상세 조회
     */
    public Map<String, Object> getSkuDetail(String productCode) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("product_code", productCode);
        return SabangnetApiService.apiGet("/product/detail", params);
    }

    /**
     * 상품 마스터 전체 동기화 (1일 1회 권장)
     * 사방넷 상품 → WMS 상품 마스터 매핑 테이블 갱신
     */
    public void syncSku() throws Exception {
        int page = 1;
        int totalCount = 0;

        while (true) {
            Map<String, Object> result = getSkuList(page, 100);
            Map<String, Object> data = (Map<String, Object>) result.get("data");
            List<Map<String, Object>> products = (List<Map<String, Object>>) data.get("products");

            if (products == null || products.isEmpty())
                break;

            for (Map<String, Object> product : products) {
                Map<String, Object> mapped = new LinkedHashMap<>();
                mapped.put("sabangnet_product_code", product.get("product_code"));
                mapped.put("product_name", product.get("product_name"));
                mapped.put("barcode", product.get("barcode"));
                mapped.put("options", product.getOrDefault("options", Collections.emptyList()));
                mapped.put("shop_mappings", product.getOrDefault("shop_mappings", Collections.emptyList()));
                mapped.put("synced_at", LocalDate.now().toString());

                // TODO: WMS DB에 upsert 처리
                // productMasterRepository.upsert(mapped);
                totalCount++;
            }
            page++;
        }
        System.out.printf("[상품 마스터] 총 %d개 상품 동기화 완료%n", totalCount);
    }
}
