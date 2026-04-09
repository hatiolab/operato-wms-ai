package operato.wms.stock.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.stock.entity.Inventory;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.ValueUtil;

/**
 * 재고 대시보드 서비스
 *
 * 재고 현황, 상태별 통계, 유효기한 통계, 로케이션 통계, 알림 등
 * 대시보드용 조회 API를 제공한다.
 *
 * @author HatioLab
 */
@Component
public class InventoryDashboardService extends AbstractQueryService {

    /**
     * 대시보드 - 재고 현황 조회
     *
     * @param comCd 화주사 코드
     * @param whCd  창고 코드
     * @return 재고 현황 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardStatusCounts(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        // 전체 SKU 수 및 총 수량
        String totalSql = "SELECT COUNT(DISTINCT sku_cd) as sku_count, SUM(inv_qty) as total_qty " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND del_flag = 'N' ";

        if (ValueUtil.isNotEmpty(comCd)) {
            totalSql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            totalSql += "AND wh_cd = :whCd ";
        }

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        Map<String, Object> totalResult = (Map<String, Object>) this.queryManager.selectBySql(totalSql, params,
                Map.class);

        // 상태별 수량
        String statusSql = "SELECT status, SUM(inv_qty) as qty " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND del_flag = 'N' ";

        if (ValueUtil.isNotEmpty(comCd)) {
            statusSql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            statusSql += "AND wh_cd = :whCd ";
        }

        statusSql += "GROUP BY status";

        List<Map<String, Object>> statusResults = (List<Map<String, Object>>) (List<?>) this.queryManager
                .selectListBySql(statusSql, params, Map.class, 0, 0);

        Map<String, Object> statusCounts = ValueUtil.newMap(
                "total_sku,total_qty,stored_qty,reserved_qty,picking_qty,locked_qty,bad_qty,shortage_count",
                ValueUtil.toInteger(totalResult.get("sku_count"), 0),
                ValueUtil.toInteger(totalResult.get("total_qty"), 0),
                0, 0, 0, 0, 0, 0);

        for (Map<String, Object> row : statusResults) {
            String status = ValueUtil.toString(row.get("status"));
            Integer qty = ValueUtil.toInteger(row.get("qty"));

            if (ValueUtil.isEqual(status, Inventory.STATUS_STORED)) {
                statusCounts.put("stored_qty", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_RESERVED)) {
                statusCounts.put("reserved_qty", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_PICK)) {
                statusCounts.put("picking_qty", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_LOCK)) {
                statusCounts.put("locked_qty", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_BAD)) {
                statusCounts.put("bad_qty", qty);
            }
        }

        // TODO: 부족 재고 계산 (safety_stock 컬럼이 있는 경우)

        return statusCounts;
    }

    /**
     * 대시보드 - 재고 상태별 통계 조회
     *
     * @param comCd 화주사 코드
     * @param whCd  창고 코드
     * @return 상태별 수량 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardStatusStats(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT status, SUM(inv_qty) as qty " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND del_flag = 'N' " +
                "AND status IN ('" + Inventory.STATUS_STORED + "', '" +
                Inventory.STATUS_RESERVED + "', '" +
                Inventory.STATUS_PICK + "', '" +
                Inventory.STATUS_LOCK + "', '" +
                Inventory.STATUS_BAD + "') ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
        }

        sql += "GROUP BY status";

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql,
                params, Map.class, 0, 0);

        Map<String, Object> statusStats = ValueUtil.newMap(
                "STORED,RESERVED,PICKING,LOCKED,BAD",
                0, 0, 0, 0, 0);

        for (Map<String, Object> row : results) {
            String status = ValueUtil.toString(row.get("status"));
            Integer qty = ValueUtil.toInteger(row.get("qty"));

            if (ValueUtil.isEqual(status, Inventory.STATUS_STORED)) {
                statusStats.put("STORED", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_RESERVED)) {
                statusStats.put("RESERVED", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_PICK)) {
                statusStats.put("PICKING", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_LOCK)) {
                statusStats.put("LOCKED", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_BAD)) {
                statusStats.put("BAD", qty);
            }
        }

        return statusStats;
    }

    /**
     * 대시보드 - 유효기한 상태별 통계 조회
     *
     * @param comCd 화주사 코드
     * @param whCd  창고 코드
     * @return 유효기한 상태별 통계 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardExpireStats(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT " +
                "  expire_status, " +
                "  COUNT(DISTINCT sku_cd) as sku_count, " +
                "  SUM(inv_qty) as qty " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND del_flag = 'N' ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
        }

        sql += "GROUP BY expire_status";

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql,
                params, Map.class, 0, 0);

        Map<String, Object> expireStats = ValueUtil.newMap("NORMAL", ValueUtil.newMap("sku_count,qty", 0, 0));
        expireStats.put("IMMINENT", ValueUtil.newMap("sku_count,qty", 0, 0));
        expireStats.put("EXPIRED", ValueUtil.newMap("sku_count,qty", 0, 0));

        for (Map<String, Object> row : results) {
            String expireStatus = ValueUtil.toString(row.get("expire_status"));
            Integer skuCount = ValueUtil.toInteger(row.get("sku_count"));
            Integer qty = ValueUtil.toInteger(row.get("qty"));

            if (ValueUtil.isEqual(expireStatus, Inventory.EXPIRE_STATUS_NORMAL)) {
                expireStats.put("NORMAL", ValueUtil.newMap("sku_count,qty", skuCount, qty));
            } else if (ValueUtil.isEqual(expireStatus, Inventory.EXPIRE_STATUS_IMMINENT)) {
                expireStats.put("IMMINENT", ValueUtil.newMap("sku_count,qty", skuCount, qty));
            } else if (ValueUtil.isEqual(expireStatus, Inventory.EXPIRE_STATUS_EXPIRED)) {
                expireStats.put("EXPIRED", ValueUtil.newMap("sku_count,qty", skuCount, qty));
            }
        }

        return expireStats;
    }

    /**
     * 대시보드 - 로케이션 유형별 통계 조회
     *
     * @param comCd 화주사 코드
     * @param whCd  창고 코드
     * @return 로케이션 유형별 통계 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardLocationStats(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT " +
                "  CASE " +
                "    WHEN l.loc_type IN ('STORAGE', 'RACK') THEN 'STORAGE' " +
                "    WHEN l.loc_type = 'PICKABLE' THEN 'PICKING' " +
                "    ELSE 'OTHER' " +
                "  END as loc_group, " +
                "  COUNT(l.id) as total, " +
                "  COUNT(i.id) as used " +
                "FROM locations l " +
                "LEFT JOIN inventories i ON l.loc_cd = i.loc_cd " +
                "  AND i.domain_id = :domainId " +
                "  AND i.inv_qty > 0 " +
                "  AND i.del_flag = 'N' ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "  AND i.com_cd = :comCd ";
        }

        sql += "WHERE l.domain_id = :domainId ";

        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND l.wh_cd = :whCd ";
        }

        sql += "GROUP BY " +
                "  CASE " +
                "    WHEN l.loc_type IN ('STORAGE', 'RACK') THEN 'STORAGE' " +
                "    WHEN l.loc_type = 'PICKABLE' THEN 'PICKING' " +
                "    ELSE 'OTHER' " +
                "  END";

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql,
                params, Map.class, 0, 0);

        Map<String, Object> locationStats = ValueUtil.newMap("STORAGE",
                ValueUtil.newMap("total,used,usage_rate", 0, 0, 0.0));
        locationStats.put("PICKING", ValueUtil.newMap("total,used,usage_rate", 0, 0, 0.0));
        locationStats.put("OTHER", ValueUtil.newMap("total,used,usage_rate", 0, 0, 0.0));

        for (Map<String, Object> row : results) {
            String locGroup = ValueUtil.toString(row.get("loc_group"));
            Integer total = ValueUtil.toInteger(row.get("total"));
            Integer used = ValueUtil.toInteger(row.get("used"));
            Double usageRate = total > 0 ? (used * 100.0 / total) : 0.0;

            locationStats.put(locGroup, ValueUtil.newMap("total,used,usage_rate", total, used, usageRate));
        }

        return locationStats;
    }

    /**
     * 대시보드 - 알림 데이터 조회
     *
     * @param comCd 화주사 코드
     * @param whCd  창고 코드
     * @return 알림 목록
     */
    public List<Map<String, Object>> getDashboardAlerts(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        List<Map<String, Object>> alerts = new ArrayList<>();

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        // 1. 유효기한 임박 상품 조회 (IMMINENT)
        String imminentSql = "SELECT COUNT(DISTINCT sku_cd) as count " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND expire_status = '" + Inventory.EXPIRE_STATUS_IMMINENT + "' " +
                "AND (del_flag is null OR del_flag = false) ";

        if (ValueUtil.isNotEmpty(comCd)) {
            imminentSql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            imminentSql += "AND wh_cd = :whCd ";
        }

        int imminentCount = this.queryManager.selectBySql(imminentSql, params, Integer.class);
        if (imminentCount > 0) {
            alerts.add(ValueUtil.newMap(
                    "type,icon,message",
                    "warning",
                    "⏰",
                    "유효기한 임박 상품 " + imminentCount + "건이 있습니다."));
        }

        // 2. 유효기한 만료 상품 조회 (EXPIRED)
        String expiredSql = "SELECT COUNT(DISTINCT sku_cd) as count " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND expire_status = '" + Inventory.EXPIRE_STATUS_EXPIRED + "' " +
                "AND (del_flag is null OR del_flag = false) ";

        if (ValueUtil.isNotEmpty(comCd)) {
            expiredSql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            expiredSql += "AND wh_cd = :whCd ";
        }

        int expiredCount = this.queryManager.selectBySql(expiredSql, params, Integer.class);
        if (expiredCount > 0) {
            alerts.add(ValueUtil.newMap(
                    "type,icon,message",
                    "error",
                    "🚫",
                    "유효기한 만료 상품 " + expiredCount + "건이 있습니다."));
        }

        // 3. 장기 재고 조회 (90일 이상 미출고)
        String longTermSql = "SELECT COUNT(DISTINCT sku_cd) as count " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND del_flag = 'N' " +
                "AND updated_at < CURRENT_DATE - INTERVAL '90 days' ";

        if (ValueUtil.isNotEmpty(comCd)) {
            longTermSql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            longTermSql += "AND wh_cd = :whCd ";
        }

        int longTermCount = this.queryManager.selectBySql(longTermSql, params, Integer.class);
        if (longTermCount > 0) {
            alerts.add(ValueUtil.newMap(
                    "type,icon,message",
                    "info",
                    "📊",
                    "90일 이상 미출고 재고 " + longTermCount + "건이 있습니다."));
        }

        // TODO: 4. 부족 재고 알림 (safety_stock 컬럼이 있는 경우)

        return alerts;
    }

}
