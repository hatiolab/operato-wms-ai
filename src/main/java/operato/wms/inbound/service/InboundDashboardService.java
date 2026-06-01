package operato.wms.inbound.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.inbound.WmsInboundConstants;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 입고 대시보드 서비스
 *
 * 입고 홈 화면 및 PDA 화면의 대시보드 데이터 조회 로직을 담당한다.
 * InboundTransactionService에서 분리된 순수 조회 전용 서비스.
 *
 * @author HatioLab
 */
@Component
public class InboundDashboardService extends AbstractQueryService {

    /**
     * 대시보드 - 입고 상태별 건수 조회
     *
     * @param comCd      화주사 코드 (optional)
     * @param whCd       창고 코드 (optional)
     * @param targetDate 기준일 (optional, 기본값: 오늘)
     * @return 상태별 건수 Map { status: count }
     */
    public Map<String, Object> getDashboardStatusCounts(String comCd, String whCd, String targetDate) {
        String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();

        String sql = "SELECT status, COUNT(*) as count " +
                "FROM receivings " +
                "WHERE domain_id = :domainId " +
                "AND rcv_req_date = :targetDate ";

        Map<String, Object> params = ValueUtil.newMap("domainId,targetDate", Domain.currentDomainId(), date);

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
            params.put("whCd", whCd);
        }

        sql += "GROUP BY status";

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
                sql, params, Map.class, 0, 0);

        // 결과를 Map으로 변환 (모든 상태 초기화)
        Map<String, Object> statusCounts = new java.util.HashMap<>();
        statusCounts.put("INWORK", 0);
        statusCounts.put("REQUEST", 0);
        statusCounts.put("READY", 0);
        statusCounts.put("START", 0);
        statusCounts.put("END", 0);
        statusCounts.put("CANCEL", 0);

        // 조회 결과를 Map에 반영
        for (Map<String, Object> row : results) {
            String status = (String) row.get("status");
            Object countObj = row.get("count");
            Integer count = countObj instanceof Long ? ((Long) countObj).intValue() : (Integer) countObj;
            statusCounts.put(status, count);
        }

        return statusCounts;
    }

    /**
     * 대시보드 - 입고 유형별 통계 조회
     *
     * @param comCd     화주사 코드 (optional)
     * @param whCd      창고 코드 (optional)
     * @param startDate 시작일 (optional, 기본값: 오늘)
     * @param endDate   종료일 (optional, 기본값: 오늘)
     * @return 유형별 건수 Map { rcvTypeName: count }
     */
    public Map<String, Object> getDashboardTypeStats(String comCd, String whCd, String startDate, String endDate) {
        String start = ValueUtil.isNotEmpty(startDate) ? startDate : DateUtil.todayStr();
        String end = ValueUtil.isNotEmpty(endDate) ? endDate : DateUtil.todayStr();
        Long domainId = Domain.currentDomainId();

        String codeSql = "SELECT ccd.name AS rcv_type, ccd.description AS type_name " +
                "FROM common_codes cc " +
                "INNER JOIN common_code_details ccd " +
                "  ON ccd.domain_id = cc.domain_id " +
                " AND ccd.parent_id = cc.id " +
                "WHERE cc.domain_id = :domainId " +
                "AND cc.name = 'RECEIVING_TYPE' " +
                "ORDER BY COALESCE(ccd.rank, 999999), ccd.name";

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> types = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
                codeSql, ValueUtil.newMap("domainId", domainId), Map.class, 0, 0);

        Map<String, String> typeNames = new java.util.LinkedHashMap<>();
        Map<String, Object> typeStats = new java.util.LinkedHashMap<>();
        for (Map<String, Object> type : types) {
            String rcvType = (String) type.get("rcv_type");
            String typeName = (String) type.get("type_name");
            if (ValueUtil.isNotEmpty(rcvType)) {
                String label = ValueUtil.isNotEmpty(typeName) ? typeName : rcvType;
                typeNames.put(rcvType, label);
                typeStats.put(label, 0);
            }
        }

        String sql = "SELECT rcv_type, COUNT(*) as count " +
                "FROM receivings " +
                "WHERE domain_id = :domainId " +
                "AND rcv_req_date >= :startDate " +
                "AND rcv_req_date <= :endDate " +
                "AND status != :cancelStatus ";

        Map<String, Object> params = ValueUtil.newMap("domainId,startDate,endDate,cancelStatus",
                domainId, start, end, WmsInboundConstants.STATUS_CANCEL);

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
            params.put("whCd", whCd);
        }

        sql += "GROUP BY rcv_type";

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
                sql, params, Map.class, 0, 0);

        // 조회 결과를 Map에 반영
        for (Map<String, Object> row : results) {
            String rcvType = (String) row.get("rcv_type");
            Object countObj = row.get("count");
            Integer count = countObj instanceof Long ? ((Long) countObj).intValue() : (Integer) countObj;
            if (rcvType != null) {
                String label = typeNames.getOrDefault(rcvType, rcvType);
                typeStats.put(label, count);
            }
        }

        return typeStats;
    }

    /**
     * 대시보드 - 검수 현황 통계 조회
     *
     * @param comCd      화주사 코드 (optional)
     * @param whCd       창고 코드 (optional)
     * @param targetDate 기준일 (optional, 기본값: 오늘)
     * @return 검수 상태별 건수 Map { WAIT, PASS, FAIL }
     */
    public Map<String, Object> getDashboardInspectionStats(String comCd, String whCd, String targetDate) {
        String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();
        Long domainId = Domain.currentDomainId();

        Map<String, Object> inspectionStats = new java.util.HashMap<>();
        inspectionStats.put("WAIT", 0);
        inspectionStats.put("PASS", 0);
        inspectionStats.put("FAIL", 0);

        // 1. 검수 대기: inspFlag=true AND insp_qty IS NULL OR insp_qty = 0
        String sqlWait = "SELECT COUNT(DISTINCT ri.id) as count " +
                "FROM receiving_items ri " +
                "INNER JOIN receivings r ON ri.receiving_id = r.id " +
                "WHERE ri.domain_id = :domainId " +
                "AND r.rcv_req_date = :targetDate " +
                "AND r.insp_flag = true " +
                "AND (ri.insp_qty IS NULL OR ri.insp_qty = 0) ";

        Map<String, Object> paramsWait = ValueUtil.newMap("domainId,targetDate", domainId, date);

        if (ValueUtil.isNotEmpty(comCd)) {
            sqlWait += "AND r.com_cd = :comCd ";
            paramsWait.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sqlWait += "AND r.wh_cd = :whCd ";
            paramsWait.put("whCd", whCd);
        }

        Integer waitCount = this.queryManager.selectBySql(sqlWait, paramsWait, Integer.class);
        inspectionStats.put("WAIT", waitCount != null ? waitCount : 0);

        // 2. 검수 합격 (PASS)
        String sqlPass = "SELECT COUNT(DISTINCT ri.id) as count " +
                "FROM receiving_items ri " +
                "INNER JOIN receivings r ON ri.receiving_id = r.id " +
                "WHERE ri.domain_id = :domainId " +
                "AND r.rcv_req_date = :targetDate " +
                "AND ri.insp_qty IS NOT NULL " +
                "AND ri.insp_qty > 0 ";
        // 추후 insp_status 컬럼이 추가되면 AND ri.insp_status = 'PASS' 조건 추가

        Map<String, Object> paramsPass = ValueUtil.newMap("domainId,targetDate", domainId, date);

        if (ValueUtil.isNotEmpty(comCd)) {
            sqlPass += "AND r.com_cd = :comCd ";
            paramsPass.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sqlPass += "AND r.wh_cd = :whCd ";
            paramsPass.put("whCd", whCd);
        }

        Integer passCount = this.queryManager.selectBySql(sqlPass, paramsPass, Integer.class);
        inspectionStats.put("PASS", passCount != null ? passCount : 0);

        // 3. 검수 불량 (FAIL) - 추후 insp_status 컬럼이 추가되면 구현
        inspectionStats.put("FAIL", 0);

        return inspectionStats;
    }

    /**
     * 대시보드 - 알림 데이터 조회
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 알림 목록 List<Map<String, Object>>
     */
    public List<Map<String, Object>> getDashboardAlerts(String comCd, String whCd) {
        List<Map<String, Object>> alerts = new java.util.ArrayList<>();
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();

        // 1. 지연 입고 알림: rcv_req_date < today AND status != 'END' AND status != 'CANCEL'
        String sql1 = "SELECT COUNT(*) as count " +
                "FROM receivings " +
                "WHERE domain_id = :domainId " +
                "AND rcv_req_date < :today " +
                "AND status NOT IN (:completedStatuses) ";

        Map<String, Object> params1 = ValueUtil.newMap("domainId,today", domainId, today);
        params1.put("completedStatuses", java.util.Arrays.asList(
                WmsInboundConstants.STATUS_END,
                WmsInboundConstants.STATUS_CANCEL));

        if (ValueUtil.isNotEmpty(comCd)) {
            sql1 += "AND com_cd = :comCd ";
            params1.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql1 += "AND wh_cd = :whCd ";
            params1.put("whCd", whCd);
        }

        Integer delayedCount = this.queryManager.selectBySql(sql1, params1, Integer.class);
        if (delayedCount != null && delayedCount > 0) {
            Map<String, Object> alert = new java.util.HashMap<>();
            alert.put("type", "warning");
            alert.put("icon", "🚨");
            alert.put("message", "지연 입고: " + delayedCount + "건 (예정일 초과)");
            alerts.add(alert);
        }

        // 2. 검수 대기 긴급건: inspFlag=true AND insp_qty IS NULL
        String sql2 = "SELECT COUNT(DISTINCT ri.receiving_id) as count " +
                "FROM receiving_items ri " +
                "INNER JOIN receivings r ON ri.receiving_id = r.id " +
                "WHERE ri.domain_id = :domainId " +
                "AND r.insp_flag = true " +
                "AND r.rcv_req_date = :today " +
                "AND (ri.insp_qty IS NULL OR ri.insp_qty = 0) " +
                "AND r.status = :startStatus ";

        Map<String, Object> params2 = ValueUtil.newMap("domainId,today,startStatus",
                domainId, today, WmsInboundConstants.STATUS_START);

        if (ValueUtil.isNotEmpty(comCd)) {
            sql2 += "AND r.com_cd = :comCd ";
            params2.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql2 += "AND r.wh_cd = :whCd ";
            params2.put("whCd", whCd);
        }

        Integer inspWaitCount = this.queryManager.selectBySql(sql2, params2, Integer.class);
        if (inspWaitCount != null && inspWaitCount > 0) {
            Map<String, Object> alert = new java.util.HashMap<>();
            alert.put("type", "info");
            alert.put("icon", "⚠️");
            alert.put("message", "검수 대기 긴급건: " + inspWaitCount + "건");
            alerts.add(alert);
        }

        return alerts;
    }

    /**
     * 적치 현황 요약 조회
     *
     * - 적치 대기: 현재 WAITING 상태로 남아있는 전체 재고 건수
     * - 적치 완료: 오늘 적치 작업으로 실제 보관 로케이션에 이동된 재고 건수
     * - 완료 재고 수량: 오늘 적치 완료된 재고 수량 합계
     *
     * @return Map { waiting_count: N, stored_count: N, stored_qty: N }
     */
    public Map<String, Object> getPutawaySummary() {
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();

        String waitingSql = "SELECT COUNT(*) " +
                "FROM inventories i " +
                "WHERE i.domain_id = :domainId " +
                "AND i.status = 'WAITING' " +
                "AND i.rcv_no IS NOT NULL " +
                "AND (i.del_flag IS NULL OR i.del_flag = false)";

        Integer waitingCount = this.queryManager.selectBySql(
                waitingSql, ValueUtil.newMap("domainId", domainId), Integer.class);

        String putawaySubQuery = "SELECT ih.barcode, MAX(ih.inv_qty) AS inv_qty " +
                "FROM inventory_hists ih " +
                "WHERE ih.domain_id = :domainId " +
                "AND ih.rcv_no IS NOT NULL " +
                "AND ih.last_tran_cd = 'MOVE' " +
                "AND ih.status = 'STORED' " +
                "AND CAST(ih.created_at AS DATE) = CAST(:today AS DATE) " +
                "AND EXISTS ( " +
                "  SELECT 1 " +
                "  FROM inventory_hists prev " +
                "  WHERE prev.domain_id = ih.domain_id " +
                "  AND prev.barcode = ih.barcode " +
                "  AND prev.hist_seq = ih.hist_seq - 1 " +
                "  AND prev.last_tran_cd = 'IN' " +
                "  AND prev.status = 'STORED' " +
                ") " +
                "GROUP BY ih.barcode";

        String storedCountSql = "SELECT COUNT(*) " +
                "FROM (" + putawaySubQuery + ") putaway";

        Integer storedCount = this.queryManager.selectBySql(
                storedCountSql, ValueUtil.newMap("domainId,today", domainId, today), Integer.class);

        String storedQtySql = "SELECT COALESCE(SUM(putaway.inv_qty), 0) " +
                "FROM (" + putawaySubQuery + ") putaway";

        Double storedQty = this.queryManager.selectBySql(
                storedQtySql, ValueUtil.newMap("domainId,today", domainId, today), Double.class);

        return ValueUtil.newMap("waiting_count,stored_count,stored_qty", ValueUtil.toInteger(waitingCount, 0),
                ValueUtil.toInteger(storedCount, 0), ValueUtil.toInteger(storedQty, 0));
    }
}
