package operato.wms.stock.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.ValueUtil;

/**
 * 재고 이동 이력 추적 서비스
 *
 * 상품별 재고현황 → 바코드별 재고 리스트 → 이동 이력 3단계 조회를 제공한다.
 *
 * @author HatioLab
 */
@Component
public class StockInventoryTrackerService extends AbstractQueryService {

    /**
     * 상품별 재고현황 조회 (좌측 그리드)
     *
     * @param comCd 화주사 코드 (optional)
     * @param skuCd 상품 코드 (optional, 부분 일치)
     * @param skuNm 상품명 (optional, 부분 일치)
     * @return com_cd, sku_cd, sku_nm, inv_qty, reserved_qty, avail_qty
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getStockSummary(String comCd, String skuCd, String skuNm) {
        String sql = "SELECT com_cd, sku_cd, sku_nm," +
                " SUM(inv_qty) AS inv_qty," +
                " SUM(COALESCE(reserved_qty, 0)) AS reserved_qty," +
                " SUM(inv_qty - COALESCE(reserved_qty, 0)) AS avail_qty" +
                " FROM inventories" +
                " WHERE domain_id = :domainId" +
                "   AND (del_flag IS NULL OR del_flag = false)";

        Map<String, Object> params = ValueUtil.newMap("domainId", Domain.currentDomainId());

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += " AND com_cd = :comCd";
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(skuCd)) {
            sql += " AND sku_cd LIKE :skuCd";
            params.put("skuCd", "%" + skuCd + "%");
        }
        if (ValueUtil.isNotEmpty(skuNm)) {
            sql += " AND sku_nm LIKE :skuNm";
            params.put("skuNm", "%" + skuNm + "%");
        }

        sql += " GROUP BY com_cd, sku_cd, sku_nm ORDER BY sku_cd";
        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

    /**
     * 바코드별 재고 리스트 조회 (우측 그리드)
     *
     * @param comCd 화주사 코드
     * @param skuCd 상품 코드
     * @return id, barcode, loc_cd, expired_date, lot_no, inv_qty, reserved_qty,
     *         avail_qty
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getInventoryList(String comCd, String skuCd) {
        String sql = "SELECT id, barcode, loc_cd, expired_date, lot_no," +
                " inv_qty, COALESCE(reserved_qty, 0) AS reserved_qty," +
                " (inv_qty - COALESCE(reserved_qty, 0)) AS avail_qty" +
                " FROM inventories" +
                " WHERE domain_id = :domainId" +
                "   AND (del_flag IS NULL OR del_flag = false)" +
                "   AND com_cd = :comCd" +
                "   AND sku_cd = :skuCd" +
                " ORDER BY loc_cd, barcode";

        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,skuCd", Domain.currentDomainId(), comCd, skuCd);
        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

    /**
     * 재고 이동 이력 조회 (하단 그리드)
     *
     * 표시 유형: 입고(NEW), 이동(MOVE_OUT), 수신(MOVE_IN), 출고(OUT), 조정(ADJUST*), 폐기(SCRAP)
     *
     * @param barcode 재고 바코드
     * @return tran_type, loc_cd, to_loc_cd, tran_qty, before_qty, after_qty,
     *         tran_at, remarks
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getMoveHistory(String barcode) {
        String sql = "SELECT tran_type, loc_cd, to_loc_cd," +
                " tran_qty, before_qty, after_qty," +
                " tran_at, tran_date, reason_cd, reason, remarks, ref_doc_type, ref_doc_no" +
                " FROM inventory_trans" +
                " WHERE domain_id = :domainId" +
                "   AND barcode = :barcode" +
                "   AND tran_type IN ('NEW','MOVE_OUT','MOVE_IN','OUT','ADJUST_PLUS','ADJUST_MINUS','ADJUST','SCRAP')" +
                " ORDER BY tran_at DESC" +
                " LIMIT 200";

        Map<String, Object> params = ValueUtil.newMap("domainId,barcode", Domain.currentDomainId(), barcode);
        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }
}
