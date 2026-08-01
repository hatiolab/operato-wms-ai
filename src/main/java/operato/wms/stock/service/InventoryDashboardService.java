package operato.wms.stock.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.stock.entity.Inventory;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
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
        String totalSql = "SELECT COUNT(DISTINCT sku_cd) as sku_count, SUM(inv_qty) as total_qty, SUM(inv_qty - reserved_qty) as available_qty, SUM(reserved_qty) as reserved_qty "
                +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND (del_flag is null or del_flag = false) ";

        // 상태별 수량
        String statusSql = "SELECT status, SUM(inv_qty) as qty " +
                "FROM inventories " +
                "WHERE domain_id = :domainId " +
                "AND (del_flag is null or del_flag = false) ";

        if (ValueUtil.isNotEmpty(comCd)) {
            totalSql += "AND com_cd = :comCd ";
            statusSql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            totalSql += "AND wh_cd = :whCd ";
            statusSql += "AND wh_cd = :whCd ";
        }

        statusSql += "GROUP BY status";

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        Map<String, Object> totalResult = (Map<String, Object>) this.queryManager.selectBySql(totalSql, params,
                Map.class);

        List<Map<String, Object>> statusResults = (List<Map<String, Object>>) (List<?>) this.queryManager
                .selectListBySql(statusSql, params, Map.class, 0, 0);

        Map<String, Object> statusCounts = ValueUtil.newMap(
                "total_sku,total_qty,available_qty,reserved_qty,waiting_qty,locked_qty,bad_qty",
                ValueUtil.toInteger(totalResult.get("sku_count"), 0),
                ValueUtil.toInteger(totalResult.get("total_qty"), 0),
                ValueUtil.toInteger(totalResult.get("available_qty"), 0),
                ValueUtil.toInteger(totalResult.get("reserved_qty"), 0),
                0, 0, 0);

        for (Map<String, Object> row : statusResults) {
            String status = ValueUtil.toString(row.get("status"));
            Integer qty = ValueUtil.toInteger(row.get("qty"));

            if (ValueUtil.isEqual(status, Inventory.STATUS_WAITING)) {
                statusCounts.put("waiting_qty", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_LOCK)) {
                statusCounts.put("locked_qty", qty);
            } else if (ValueUtil.isEqual(status, Inventory.STATUS_BAD)) {
                statusCounts.put("bad_qty", qty);
            }
        }

        // 부족 재고 SKU 수 계산 (가용 재고 < safety_stock인 SKU)
        String shortageSql = "SELECT COUNT(*) FROM (" +
                "  SELECT i.sku_cd" +
                "  FROM inventories i" +
                "  INNER JOIN sku s ON s.domain_id = i.domain_id AND s.com_cd = i.com_cd AND s.sku_cd = i.sku_cd" +
                "  WHERE i.domain_id = :domainId" +
                "  AND (i.del_flag IS NULL OR i.del_flag = false)" +
                "  AND s.safety_stock IS NOT NULL AND s.safety_stock > 0 ";
        if (ValueUtil.isNotEmpty(comCd)) {
            shortageSql += "  AND i.com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            shortageSql += "  AND i.wh_cd = :whCd ";
        }
        shortageSql += "  GROUP BY i.sku_cd, i.com_cd" +
                "  HAVING SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) < MAX(s.safety_stock)" +
                ") shortage_skus";

        Integer shortageSkuCount = this.queryManager.selectBySql(shortageSql, params, Integer.class);
        statusCounts.put("shortage_sku", shortageSkuCount != null ? shortageSkuCount : 0);

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
                "  COALESCE(SUM(inv_qty), 0) as qty " +
                "FROM ( " +
                "  SELECT " +
                "    sku_cd, " +
                "    inv_qty, " +
                "    CASE " +
                "      WHEN NULLIF(expired_date, '') IS NULL THEN '" + Inventory.EXPIRE_STATUS_NORMAL + "' " +
                "      WHEN NULLIF(expired_date, '') !~ '^\\d{4}-\\d{2}-\\d{2}$' THEN '" + Inventory.EXPIRE_STATUS_NORMAL + "' " +
                "      WHEN NULLIF(expired_date, '')::date < CURRENT_DATE THEN '" + Inventory.EXPIRE_STATUS_EXPIRED + "' " +
                "      WHEN NULLIF(expired_date, '')::date <= CURRENT_DATE + INTERVAL '30 days' THEN '" +
                Inventory.EXPIRE_STATUS_IMMINENT + "' " +
                "      ELSE '" + Inventory.EXPIRE_STATUS_NORMAL + "' " +
                "    END as expire_status " +
                "  FROM inventories " +
                "  WHERE domain_id = :domainId " +
                "  AND (del_flag is null OR del_flag = false) " +
                "  AND COALESCE(inv_qty, 0) > 0 ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
        }

        sql += ") inventory_expire_stats ";
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
                "    WHEN l.loc_type = 'STORE' THEN 'STORAGE' " +
                "    WHEN l.loc_type = 'PICKABLE' THEN 'PICKING' " +
                "    WHEN l.loc_type = 'DEFECT' THEN 'DEFECT' " +
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
                "    WHEN l.loc_type = 'STORE' THEN 'STORAGE' " +
                "    WHEN l.loc_type = 'PICKABLE' THEN 'PICKING' " +
                "    WHEN l.loc_type = 'DEFECT' THEN 'DEFECT' " +
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
        locationStats.put("DEFECT", ValueUtil.newMap("total,used,usage_rate", 0, 0, 0.0));
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

        // 4. 부족 재고 알림 (가용 재고 < safety_stock)
        List<Map<String, Object>> shortageList = this.getShortageSkus(comCd, whCd);
        if (!shortageList.isEmpty()) {
            alerts.add(ValueUtil.newMap(
                    "type,icon,message,count",
                    "warning",
                    "📉",
                    "안전 재고 이하 SKU " + shortageList.size() + "건이 있습니다.",
                    shortageList.size()));
        }

        // 5. W23-FL-3: 재주문점 도달 알림 (가용 재고 < reorder_point)
        List<Map<String, Object>> reorderList = this.getReorderPointSkus(comCd, whCd);
        if (!reorderList.isEmpty()) {
            alerts.add(ValueUtil.newMap(
                    "type,icon,message,count",
                    "warning",
                    "📦",
                    "재주문점 도달 SKU " + reorderList.size() + "건이 있습니다.",
                    reorderList.size()));
        }

        return alerts;
    }

    /**
     * 부족 재고 SKU 목록 조회
     *
     * 가용 재고(inv_qty - reserved_qty)가 SKU의 safety_stock 미만인 SKU 목록을 반환한다.
     * safety_stock이 NULL이거나 0인 SKU는 제외한다.
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return [{ sku_cd, sku_nm, available_qty, safety_stock, shortage_qty }]
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getShortageSkus(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT i.sku_cd, MAX(s.sku_nm) AS sku_nm," +
                " SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) AS available_qty," +
                " MAX(s.safety_stock) AS safety_stock," +
                " MAX(s.safety_stock) - SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) AS shortage_qty" +
                " FROM inventories i" +
                " INNER JOIN sku s ON s.domain_id = i.domain_id AND s.com_cd = i.com_cd AND s.sku_cd = i.sku_cd" +
                " WHERE i.domain_id = :domainId" +
                " AND (i.del_flag IS NULL OR i.del_flag = false)" +
                " AND s.safety_stock IS NOT NULL AND s.safety_stock > 0";

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            sql += " AND i.com_cd = :comCd";
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += " AND i.wh_cd = :whCd";
            params.put("whCd", whCd);
        }

        sql += " GROUP BY i.sku_cd, i.com_cd" +
                " HAVING SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) < MAX(s.safety_stock)" +
                " ORDER BY shortage_qty DESC";

        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

    /**
     * 재고 이상 감지 건수 조회
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return diff_sku_count, negative_sku_count, long_term_count, daily_adjust_count, set_mismatch_count
     */
    public Map<String, Object> getAnomalyCounts(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();
        String monthStart = today.substring(0, 7) + "-01";
        String cutoff90 = LocalDate.now().minusDays(90).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        Map<String, Object> p = ValueUtil.newMap("domainId", domainId);
        String cf = ValueUtil.isNotEmpty(comCd) ? " AND com_cd = :comCd" : "";
        String wf = ValueUtil.isNotEmpty(whCd)  ? " AND wh_cd = :whCd"  : "";
        if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
        if (ValueUtil.isNotEmpty(whCd))  p.put("whCd",  whCd);

        // 이번 달 ADJUST 트랜잭션이 있는 SKU 수 (재고 차이 SKU 대리 지표)
        Map<String, Object> tp = new java.util.HashMap<>(p);
        tp.put("monthStart", monthStart);
        String diffSql = "SELECT COUNT(DISTINCT sku_cd) FROM inventory_trans " +
                "WHERE domain_id = :domainId AND tran_type = 'ADJUST' AND tran_date >= :monthStart" + cf + wf;

        // 음수 재고 SKU
        String negSql = "SELECT COUNT(DISTINCT sku_cd) FROM inventories " +
                "WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false) AND inv_qty < 0" + cf + wf;

        // 90일 이상 OUT 트랜잭션 없는 SKU (장기 미출고)
        Map<String, Object> lp = new java.util.HashMap<>(p);
        lp.put("cutoff", cutoff90);
        String longSql = "SELECT COUNT(DISTINCT i.sku_cd) FROM inventories i " +
                "WHERE i.domain_id = :domainId AND (i.del_flag IS NULL OR i.del_flag = false) AND i.inv_qty > 0" + cf + wf +
                " AND NOT EXISTS (SELECT 1 FROM inventory_trans t WHERE t.domain_id = i.domain_id" +
                " AND t.sku_cd = i.sku_cd AND t.tran_type = 'OUT' AND t.tran_date >= :cutoff)";

        // 당일 조정 건수
        Map<String, Object> dp = new java.util.HashMap<>(p);
        dp.put("today", today);
        String adjSql = "SELECT COUNT(*) FROM inventory_trans " +
                "WHERE domain_id = :domainId AND tran_type = 'ADJUST' AND tran_date = :today" + cf + wf;

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("diff_sku_count",    toLong(this.queryManager.selectBySql(diffSql, tp, Long.class)));
        result.put("negative_sku_count",toLong(this.queryManager.selectBySql(negSql,  p,  Long.class)));
        result.put("long_term_count",   toLong(this.queryManager.selectBySql(longSql, lp, Long.class)));
        result.put("daily_adjust_count",toLong(this.queryManager.selectBySql(adjSql,  dp, Long.class)));
        result.put("set_mismatch_count", 0L);
        return result;
    }

    /**
     * 입출고 흐름 조회 (오늘 기준)
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return inbound_qty, outbound_qty, return_qty, adjust_qty, split_qty
     */
    public Map<String, Object> getFlowSummary(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();

        Map<String, Object> p = ValueUtil.newMap("domainId,today", domainId, today);
        String cf = ValueUtil.isNotEmpty(comCd) ? " AND com_cd = :comCd" : "";
        String wf = ValueUtil.isNotEmpty(whCd)  ? " AND wh_cd = :whCd"  : "";
        if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
        if (ValueUtil.isNotEmpty(whCd))  p.put("whCd",  whCd);

        String base = "SELECT COALESCE(SUM(tran_qty), 0) FROM inventory_trans " +
                "WHERE domain_id = :domainId AND tran_date = :today";
        String inSql  = base + " AND tran_type = 'IN'" + cf + wf;
        String outSql = base + " AND tran_type = 'OUT'" + cf + wf;
        String retSql = base + " AND tran_type = 'RWA_RESTOCK'" + cf + wf;
        String adjSql = base + " AND tran_type = 'ADJUST'" + cf + wf;
        String sptSql = base + " AND tran_type IN ('SPLIT','SPLIT_NEW')" + cf + wf;

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("inbound_qty",  toLong(this.queryManager.selectBySql(inSql,  p, Double.class)));
        result.put("outbound_qty", toLong(this.queryManager.selectBySql(outSql, p, Double.class)));
        result.put("return_qty",   toLong(this.queryManager.selectBySql(retSql, p, Double.class)));
        result.put("adjust_qty",   Math.abs(toLong(this.queryManager.selectBySql(adjSql, p, Double.class))));
        result.put("split_qty",    toLong(this.queryManager.selectBySql(sptSql, p, Double.class)));
        return result;
    }

    /**
     * 재고 정확도 KPI 조회 (이번 달 기준)
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return accuracy_rate, counted_sku, diff_sku, diff_rate
     */
    public Map<String, Object> getAccuracySummary(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        String monthStart = DateUtil.todayStr().substring(0, 7) + "-01";

        Map<String, Object> p = ValueUtil.newMap("domainId,monthStart", domainId, monthStart);
        String cf = ValueUtil.isNotEmpty(comCd) ? " AND com_cd = :comCd" : "";
        String wf = ValueUtil.isNotEmpty(whCd)  ? " AND wh_cd = :whCd"  : "";
        if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
        if (ValueUtil.isNotEmpty(whCd))  p.put("whCd",  whCd);

        String countedSql = "SELECT COUNT(DISTINCT sku_cd) FROM inventory_trans " +
                "WHERE domain_id = :domainId AND tran_type = 'COUNT' AND tran_date >= :monthStart" + cf + wf;
        String diffSql = "SELECT COUNT(DISTINCT sku_cd) FROM inventory_trans " +
                "WHERE domain_id = :domainId AND tran_type = 'ADJUST' AND tran_date >= :monthStart" + cf + wf;

        long counted = toLong(this.queryManager.selectBySql(countedSql, p, Long.class));
        long diff    = toLong(this.queryManager.selectBySql(diffSql,    p, Long.class));
        double rate  = counted > 0 ? Math.max(0, Math.min(100, Math.round((1.0 - (double) diff / counted) * 1000) / 10.0)) : 0;
        double diffRate = counted > 0 ? Math.round((double) diff / counted * 1000) / 10.0 : 0;

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("accuracy_rate", rate);
        result.put("counted_sku",   counted);
        result.put("diff_sku",      diff);
        result.put("diff_rate",     diffRate);
        return result;
    }

    /**
     * TOP 위험 SKU 조회 (안전재고 미달 상위 10건)
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return List of { rank, sku_cd, sku_nm, current_qty, safety_stock, status, remarks }
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getTopRiskSkus(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        Map<String, Object> p = ValueUtil.newMap("domainId", domainId);
        String cf = ValueUtil.isNotEmpty(comCd) ? " AND i.com_cd = :comCd" : "";
        String wf = ValueUtil.isNotEmpty(whCd)  ? " AND i.wh_cd = :whCd"  : "";
        if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
        if (ValueUtil.isNotEmpty(whCd))  p.put("whCd",  whCd);

        String sql = "SELECT ROW_NUMBER() OVER (ORDER BY shortage_qty DESC) AS rank," +
                " sku_cd, sku_nm, current_qty, safety_qty AS safety_stock," +
                " CASE WHEN current_qty <= 0 THEN '품절 위험' ELSE '안전재고 미달' END AS status," +
                " remarks" +
                " FROM (" +
                "   SELECT i.sku_cd," +
                "          MAX(s.sku_nm) AS sku_nm," +
                "          COALESCE(SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)), 0) AS current_qty," +
                "          MAX(s.safety_stock) AS safety_qty," +
                "          MAX(s.safety_stock) - COALESCE(SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)), 0) AS shortage_qty," +
                "          MAX(s.remarks) AS remarks" +
                "   FROM inventories i" +
                "   INNER JOIN sku s ON s.domain_id = i.domain_id AND s.sku_cd = i.sku_cd" +
                "   WHERE i.domain_id = :domainId AND (i.del_flag IS NULL OR i.del_flag = false)" +
                "   AND s.safety_stock IS NOT NULL AND s.safety_stock > 0" + cf + wf +
                "   GROUP BY i.sku_cd" +
                "   HAVING COALESCE(SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)), 0) < MAX(s.safety_stock)" +
                " ) sub" +
                " ORDER BY shortage_qty DESC LIMIT 10";

        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, p, Map.class, 0, 0);
    }

    /**
     * 장기 재고 현황 조회 (미출고 기준)
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return days_30 / days_90 / days_180 각 { qty, sku_count }
     */
    public Map<String, Object> getLongTermStock(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, Object> p = ValueUtil.newMap("domainId", domainId);
        String cf = ValueUtil.isNotEmpty(comCd) ? " AND com_cd = :comCd" : "";
        String wf = ValueUtil.isNotEmpty(whCd)  ? " AND wh_cd = :whCd"  : "";
        if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
        if (ValueUtil.isNotEmpty(whCd))  p.put("whCd",  whCd);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        for (int days : new int[]{30, 90, 180}) {
            String cutoff = LocalDate.now().minusDays(days).format(fmt);
            Map<String, Object> dp = new java.util.HashMap<>(p);
            dp.put("cutoff", cutoff);

            String qtySql = "SELECT COALESCE(SUM(inv_qty),0) FROM inventories i " +
                    "WHERE i.domain_id = :domainId AND (i.del_flag IS NULL OR i.del_flag = false) AND i.inv_qty > 0" + cf + wf +
                    " AND NOT EXISTS (SELECT 1 FROM inventory_trans t WHERE t.domain_id = i.domain_id" +
                    " AND t.sku_cd = i.sku_cd AND t.tran_type = 'OUT' AND t.tran_date >= :cutoff)";
            String skuSql = "SELECT COUNT(DISTINCT sku_cd) FROM inventories i " +
                    "WHERE i.domain_id = :domainId AND (i.del_flag IS NULL OR i.del_flag = false) AND i.inv_qty > 0" + cf + wf +
                    " AND NOT EXISTS (SELECT 1 FROM inventory_trans t WHERE t.domain_id = i.domain_id" +
                    " AND t.sku_cd = i.sku_cd AND t.tran_type = 'OUT' AND t.tran_date >= :cutoff)";

            long qty = toLong(this.queryManager.selectBySql(qtySql, dp, Double.class));
            long sku = toLong(this.queryManager.selectBySql(skuSql, dp, Long.class));
            result.put("days_" + days, ValueUtil.newMap("qty,sku_count", qty, sku));
        }
        return result;
    }

    /**
     * 세트 재고 현황 조회
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return set_sku, set_release_plan, set_mismatch, kit_convert_plan
     */
    public Map<String, Object> getSetStockSummary(String comCd, String whCd) {
        return ValueUtil.newMap("set_sku,set_release_plan,set_mismatch,kit_convert_plan", 0L, 0L, 0L, 0L);
    }

    /**
     * 실사/조정 현황 조회 (이번 달 기준)
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return audit_count, adjust_in_count, adjust_in_qty, adjust_out_count, adjust_out_qty, pending_diff_count, pending_diff_qty
     */
    public Map<String, Object> getAuditAdjustment(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        String monthStart = DateUtil.todayStr().substring(0, 7) + "-01";

        Map<String, Object> p = ValueUtil.newMap("domainId,monthStart", domainId, monthStart);
        String cf = ValueUtil.isNotEmpty(comCd) ? " AND com_cd = :comCd" : "";
        String wf = ValueUtil.isNotEmpty(whCd)  ? " AND wh_cd = :whCd"  : "";
        if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
        if (ValueUtil.isNotEmpty(whCd))  p.put("whCd",  whCd);

        String baseTran = "FROM inventory_trans WHERE domain_id = :domainId AND tran_date >= :monthStart";

        String auditSql  = "SELECT COUNT(*) " + baseTran + " AND tran_type = 'COUNT'" + cf + wf;
        String adjInCnt  = "SELECT COUNT(*) " + baseTran + " AND tran_type = 'ADJUST' AND tran_qty > 0" + cf + wf;
        String adjInQty  = "SELECT COALESCE(SUM(tran_qty),0) " + baseTran + " AND tran_type = 'ADJUST' AND tran_qty > 0" + cf + wf;
        String adjOutCnt = "SELECT COUNT(*) " + baseTran + " AND tran_type = 'ADJUST' AND tran_qty < 0" + cf + wf;
        String adjOutQty = "SELECT COALESCE(SUM(ABS(tran_qty)),0) " + baseTran + " AND tran_type = 'ADJUST' AND tran_qty < 0" + cf + wf;

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("audit_count",      toLong(this.queryManager.selectBySql(auditSql,  p, Long.class)));
        result.put("adjust_in_count",  toLong(this.queryManager.selectBySql(adjInCnt,  p, Long.class)));
        result.put("adjust_in_qty",    toLong(this.queryManager.selectBySql(adjInQty,  p, Double.class)));
        result.put("adjust_out_count", toLong(this.queryManager.selectBySql(adjOutCnt, p, Long.class)));
        result.put("adjust_out_qty",   toLong(this.queryManager.selectBySql(adjOutQty, p, Double.class)));
        result.put("pending_diff_count", 0L);
        result.put("pending_diff_qty",   0L);
        return result;
    }

    /**
     * 로케이션 사용률 상세 조회
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return types 배열 + analysis { available, full, inefficient, mixed_sku }
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getLocationUsageSummary(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        Map<String, Object> p = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) p.put("comCd", comCd);
        if (ValueUtil.isNotEmpty(whCd))  p.put("whCd",  whCd);
        String wf = ValueUtil.isNotEmpty(whCd) ? " AND l.wh_cd = :whCd" : "";

        String typesSql = "SELECT " +
                "CASE l.loc_type WHEN 'STORE' THEN '보관' WHEN 'PICKABLE' THEN '피킹'" +
                "  WHEN 'DEFECT' THEN '불량' WHEN 'HOLD' THEN '보류' END AS loc_group," +
                "l.loc_type," +
                "COUNT(l.id) AS total," +
                "COUNT(CASE WHEN COALESCE(i.inv_qty,0) > 0 THEN 1 END) AS used " +
                "FROM locations l " +
                "LEFT JOIN (SELECT loc_cd, SUM(inv_qty) AS inv_qty FROM inventories " +
                "  WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false) GROUP BY loc_cd) i " +
                "ON i.loc_cd = l.loc_cd " +
                "WHERE l.domain_id = :domainId AND l.loc_type IN ('STORE', 'PICKABLE', 'DEFECT', 'HOLD')" + wf +
                " GROUP BY l.loc_type" +
                " ORDER BY CASE l.loc_type WHEN 'STORE' THEN 1 WHEN 'PICKABLE' THEN 2 WHEN 'DEFECT' THEN 3 WHEN 'HOLD' THEN 4 END";

        List<Map<String, Object>> typeRows =
                (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(typesSql, p, Map.class, 0, 0);

        for (Map<String, Object> row : typeRows) {
            long total = toLong(row.get("total"));
            long used  = toLong(row.get("used"));
            long avail = total - used;
            double rate = total > 0 ? Math.round((double) used / total * 1000) / 10.0 : 0;
            row.put("available", avail);
            row.put("usage_rate", rate);
        }

        // 분석: FULL 로케이션, 비효율 적치, 혼적 SKU
        String fullSql = "SELECT COUNT(*) FROM (" +
                "SELECT loc_cd FROM inventories WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false)" +
                " GROUP BY loc_cd HAVING SUM(inv_qty) >= 100) sub";
        String mixSql  = "SELECT COUNT(*) FROM (" +
                "SELECT loc_cd FROM inventories WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false)" +
                " AND inv_qty > 0 GROUP BY loc_cd HAVING COUNT(DISTINCT sku_cd) > 1) sub";
        String availSql= "SELECT COUNT(l.id) FROM locations l " +
                "LEFT JOIN (SELECT loc_cd, SUM(inv_qty) AS inv_qty FROM inventories " +
                "  WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false) GROUP BY loc_cd) i " +
                "ON i.loc_cd = l.loc_cd WHERE l.domain_id = :domainId AND COALESCE(i.inv_qty,0) = 0" + wf;

        Map<String, Object> analysis = new java.util.LinkedHashMap<>();
        analysis.put("available",   toLong(this.queryManager.selectBySql(availSql, p, Long.class)));
        analysis.put("full",        toLong(this.queryManager.selectBySql(fullSql,  p, Long.class)));
        analysis.put("inefficient", 0L);
        analysis.put("mixed_sku",   toLong(this.queryManager.selectBySql(mixSql,   p, Long.class)));

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("types",    typeRows);
        result.put("analysis", analysis);
        return result;
    }

    /** Number → long 변환 (null 안전) */
    private long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Long)    return (Long) val;
        if (val instanceof Integer) return ((Integer) val).longValue();
        if (val instanceof Double)  return ((Double) val).longValue();
        if (val instanceof Number)  return ((Number) val).longValue();
        return 0L;
    }

    /**
     * W23-FL-3: 재주문점 도달 SKU 목록 조회
     *
     * 가용 재고(inv_qty - reserved_qty)가 SKU의 reorder_point 미만인 SKU 목록을 반환한다.
     * reorder_point가 NULL이거나 0인 SKU는 제외한다.
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return [{ sku_cd, sku_nm, available_qty, reorder_point, shortage_qty }]
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getReorderPointSkus(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT i.sku_cd, i.com_cd, MAX(s.sku_nm) AS sku_nm," +
                " SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) AS available_qty," +
                " MAX(s.reorder_point) AS reorder_point," +
                " MAX(s.reorder_point) - SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) AS shortage_qty" +
                " FROM inventories i" +
                " INNER JOIN sku s ON s.domain_id = i.domain_id AND s.com_cd = i.com_cd AND s.sku_cd = i.sku_cd" +
                " WHERE i.domain_id = :domainId" +
                " AND (i.del_flag IS NULL OR i.del_flag = false)" +
                " AND s.reorder_point IS NOT NULL AND s.reorder_point > 0";

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) {
            sql += " AND i.com_cd = :comCd";
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += " AND i.wh_cd = :whCd";
            params.put("whCd", whCd);
        }

        sql += " GROUP BY i.sku_cd, i.com_cd" +
                " HAVING SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) < MAX(s.reorder_point)" +
                " ORDER BY shortage_qty DESC";

        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

}
