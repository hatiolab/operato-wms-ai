package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import xyz.anythings.sys.service.AbstractQueryService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 사방넷 재고 동기화 서비스
 * - 사방넷 풀필먼트에서 재고 조회 → WMS 로컬 DB 갱신 방향으로 동작
 *
 * 사방넷 API:
 *   재고 조회(단일) : GET /v2/inventory/stock/{출고상품ID}
 *   재고 조회(벌크) : GET /v2/inventory/stocks  (최대 100개)
 *   로케이션 재고 조회(단일상품) : GET /v2/inventory/stock_locations
 *   유통기한별 재고 조회         : GET /v2/inventory/stock_expire
 *
 * 응답 재고 필드:
 *   total_stock, normal_stock(출고가능), order_stock, shipping_stock,
 *   damaged_stock, return_stock, keeping_stock, receiving_stock
 *
 * 주의: 사방넷 풀필먼트 API에는 재고 수량을 외부에서 직접 수정하는 API가 없습니다.
 *       재고는 입고예정 등록/처리 및 발주 처리를 통해 사방넷 내부에서 변동됩니다.
 *       이 서비스는 사방넷 재고를 조회하여 WMS 로컬 DB에 반영하는 역할을 합니다.
 *
 * TODO:
 *   - syncStockAll(): WMS에서 전체 출고상품 ID 목록 조회 구현 필요
 *   - updateLocalStock(): WMS 재고 테이블(inventories) 업데이트 구현 필요
 */
@Component
public class SabangnetStockService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetStockService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    /**
     * 사방넷 단일 상품 재고 조회
     * 응답: response — 재고 기본 Object
     *
     * @param shippingProductId 사방넷 출고상품 ID
     */
    public Map<String, Object> getStock(int shippingProductId,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet(
                "/v2/inventory/stock/" + shippingProductId, null, comCd, whCd);
    }

    /**
     * 사방넷 다중 상품 재고 조회 (최대 100개)
     * 응답: response.data_list — 재고 기본 Object 리스트
     *
     * @param shippingProductIds 조회할 출고상품 ID 목록 (최대 100개)
     * @param page               페이지 번호
     */
    public Map<String, Object> getStocks(List<Integer> shippingProductIds, int page,
            String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        // 사방넷 배열 파라미터 형식: shipping_product_ids%5B0%5D=xxx
        for (int i = 0; i < shippingProductIds.size(); i++) {
            params.put("shipping_product_ids[" + i + "]", String.valueOf(shippingProductIds.get(i)));
        }
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/inventory/stocks", params, comCd, whCd);
    }

    /**
     * 로케이션별 재고 조회 (물류사 권한 전용)
     * 응답: response.data_list — 로케이션 재고 리스트
     *
     * @param shippingProductId 출고상품 ID (필수)
     * @param locType           재고 구분 (1.입고, 2.출고가능, 5.반품, 6.불량, 7.보관)
     * @param locationId        로케이션 ID (null이면 전체)
     * @param page              페이지 번호
     */
    public Map<String, Object> getStockByLocation(int shippingProductId, Integer locType,
            Integer locationId, int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("shipping_product_id", String.valueOf(shippingProductId));
        if (locType != null)    params.put("loc_type", String.valueOf(locType));
        if (locationId != null) params.put("location_id", String.valueOf(locationId));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/inventory/stock_locations", params, comCd, whCd);
    }

    /**
     * 유통기한별 재고 조회 (물류사 권한 전용)
     * 응답: response.data_list — 유통기한별 재고 리스트 (expire_date, total_stock, normal_stock)
     *
     * @param shippingProductIds 출고상품 ID 목록 (최대 50개, 필수)
     * @param memberId           고객사 ID (물류사 권한인 경우 필수)
     * @param page               페이지 번호
     */
    public Map<String, Object> getStockByExpireDate(List<Integer> shippingProductIds,
            int memberId, int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("member_id", String.valueOf(memberId));
        for (int i = 0; i < shippingProductIds.size(); i++) {
            params.put("shipping_product_ids[" + i + "]", String.valueOf(shippingProductIds.get(i)));
        }
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/inventory/stock_expire", params, comCd, whCd);
    }

    /**
     * WMS 로컬 재고 업데이트 (사방넷 재고 기준)
     * 사방넷에서 조회한 재고 정보로 WMS inventories 테이블 갱신
     *
     * @param stockData 사방넷 재고 기본 Object
     *                  (shipping_product_id, total_stock, normal_stock, ...)
     */
    private void updateLocalStock(Map<String, Object> stockData) {
        // TODO: WMS inventories 테이블 업데이트
        // inventoryRepository.upsertBySabangnetProductId(
        //     stockData.get("shipping_product_id"),
        //     stockData.get("normal_stock")   // 출고가능 재고
        // );
    }

    /**
     * 전체 재고 동기화 (매일 새벽 권장)
     * 사방넷 재고 → WMS 로컬 재고 테이블 갱신
     *
     * @param shippingProductIds 동기화할 출고상품 ID 목록 (WMS DB에서 조회)
     */
    public void syncStockAll(List<Integer> shippingProductIds,
            String comCd, String whCd) throws Exception {
        // 100개 단위로 분할 요청
        int batchSize = 100;
        int totalSynced = 0;

        for (int i = 0; i < shippingProductIds.size(); i += batchSize) {
            List<Integer> batch = shippingProductIds.subList(
                    i, Math.min(i + batchSize, shippingProductIds.size()));

            int page = 1;
            while (true) {
                Map<String, Object> result = getStocks(batch, page, comCd, whCd);

                if (!sabangnetApiService.isSuccess(result)) {
                    log.error("[재고 동기화] API 오류 - code: {}, message: {}",
                            result.get("code"), result.get("message"));
                    break;
                }

                Map<String, Object> response = (Map<String, Object>) result.get("response");
                List<Map<String, Object>> dataList =
                        (List<Map<String, Object>>) response.get("data_list");

                if (dataList == null || dataList.isEmpty()) break;

                for (Map<String, Object> stockData : dataList) {
                    updateLocalStock(stockData);
                    totalSynced++;
                }

                Object totalPage = response.get("total_page");
                if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage))) break;
                page++;
            }
        }
        log.info("[재고 동기화] 총 {}개 상품 재고 동기화 완료", totalSynced);
    }

    /**
     * 단건 재고 즉시 동기화 (입고/출고/조정 발생 시 호출)
     */
    public void syncStockSingle(int shippingProductId, String comCd, String whCd) throws Exception {
        Map<String, Object> result = getStock(shippingProductId, comCd, whCd);

        if (!sabangnetApiService.isSuccess(result)) {
            log.error("[재고 즉시 동기화] API 오류 - 출고상품ID: {}, code: {}, message: {}",
                    shippingProductId, result.get("code"), result.get("message"));
            return;
        }

        Map<String, Object> stockData = (Map<String, Object>) result.get("response");
        updateLocalStock(stockData);
        log.info("[재고 즉시 동기화] 출고상품ID: {}, 출고가능 재고: {}",
                shippingProductId, stockData.get("normal_stock"));
    }
}
