package operato.wms.inbound.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
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

        // 1. 지연 입고 알림: rcv_req_date < today AND status != 'END' AND status != 'STORED' AND status != 'CANCEL'
        String sql1 = "SELECT COUNT(*) as count " +
                "FROM receivings " +
                "WHERE domain_id = :domainId " +
                "AND rcv_req_date < :today " +
                "AND status NOT IN (:completedStatuses) ";

        Map<String, Object> params1 = ValueUtil.newMap("domainId,today", domainId, today);
        params1.put("completedStatuses", java.util.Arrays.asList(
                WmsInboundConstants.STATUS_END,
                WmsInboundConstants.STATUS_STORED,
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

    /**
     * 대시보드 KPI 요약 조회
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return today_count, today_qty, completion_rate, urgent_count, urgent_qty,
     *         delayed_count, delayed_qty, safety_shortage_count, weekly_qty, weekly_start, weekly_end
     */
    public Map<String, Object> getDashboardSummary(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();
        String thisMonth = today.substring(0, 7);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate todayDate = LocalDate.now();
        String weekStart = todayDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).format(fmt);
        String weekEnd   = todayDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY)).format(fmt);

        Map<String, Object> result = new java.util.LinkedHashMap<>();

        // 1. 오늘 입고 예정 건수
        String todayCntSql = "SELECT COUNT(DISTINCT r.id) FROM receivings r " +
                "WHERE r.domain_id = :domainId AND r.rcv_req_date = :today AND r.status != 'CANCEL'";
        Map<String, Object> todayP = ValueUtil.newMap("domainId,today", domainId, today);
        if (ValueUtil.isNotEmpty(comCd)) { todayCntSql += " AND r.com_cd = :comCd"; todayP.put("comCd", comCd); }
        if (ValueUtil.isNotEmpty(whCd))  { todayCntSql += " AND r.wh_cd = :whCd";   todayP.put("whCd", whCd); }
        result.put("today_count", toLong(this.queryManager.selectBySql(todayCntSql, todayP, Long.class)));

        // 2. 오늘 입고 예정 수량
        String todayQtySql = "SELECT COALESCE(SUM(ri.rcv_exp_qty), 0) " +
                "FROM receiving_items ri INNER JOIN receivings r ON r.id = ri.receiving_id AND r.domain_id = ri.domain_id " +
                "WHERE r.domain_id = :domainId AND r.rcv_req_date = :today AND r.status != 'CANCEL'";
        if (ValueUtil.isNotEmpty(comCd)) { todayQtySql += " AND r.com_cd = :comCd"; }
        if (ValueUtil.isNotEmpty(whCd))  { todayQtySql += " AND r.wh_cd = :whCd"; }
        result.put("today_qty", toLong(this.queryManager.selectBySql(todayQtySql, todayP, Double.class)));

        // 3. 이번 달 입고 완료율
        String doneSql = "SELECT COUNT(CASE WHEN r.status IN ('END', 'STORED') THEN 1 END) FROM receivings r " +
                "WHERE r.domain_id = :domainId AND SUBSTRING(r.rcv_req_date, 1, 7) = :thisMonth AND r.status != 'CANCEL'";
        String totalSql = "SELECT COUNT(*) FROM receivings r " +
                "WHERE r.domain_id = :domainId AND SUBSTRING(r.rcv_req_date, 1, 7) = :thisMonth AND r.status != 'CANCEL'";
        Map<String, Object> monthP = ValueUtil.newMap("domainId,thisMonth", domainId, thisMonth);
        if (ValueUtil.isNotEmpty(comCd)) { doneSql += " AND r.com_cd = :comCd"; totalSql += " AND r.com_cd = :comCd"; monthP.put("comCd", comCd); }
        if (ValueUtil.isNotEmpty(whCd))  { doneSql += " AND r.wh_cd = :whCd";   totalSql += " AND r.wh_cd = :whCd";   monthP.put("whCd", whCd); }
        long doneCnt  = toLong(this.queryManager.selectBySql(doneSql,  monthP, Long.class));
        long totalCnt = toLong(this.queryManager.selectBySql(totalSql, monthP, Long.class));
        result.put("completion_rate", totalCnt > 0 ? (int) Math.round((double) doneCnt / totalCnt * 100) : 0);

        // 4. 긴급 입고 건수 및 수량 (rcv_type = 'URGENT')
        String urgCntSql = "SELECT COUNT(DISTINCT r.id) FROM receivings r " +
                "WHERE r.domain_id = :domainId AND r.rcv_type = 'URGENT' AND r.status NOT IN ('END', 'STORED', 'CANCEL')";
        String urgQtySql = "SELECT COALESCE(SUM(ri.rcv_exp_qty), 0) " +
                "FROM receiving_items ri INNER JOIN receivings r ON r.id = ri.receiving_id AND r.domain_id = ri.domain_id " +
                "WHERE r.domain_id = :domainId AND r.rcv_type = 'URGENT' AND r.status NOT IN ('END', 'STORED', 'CANCEL')";
        Map<String, Object> urgP = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) { urgCntSql += " AND r.com_cd = :comCd"; urgQtySql += " AND r.com_cd = :comCd"; urgP.put("comCd", comCd); }
        if (ValueUtil.isNotEmpty(whCd))  { urgCntSql += " AND r.wh_cd = :whCd";   urgQtySql += " AND r.wh_cd = :whCd";   urgP.put("whCd", whCd); }
        result.put("urgent_count", toLong(this.queryManager.selectBySql(urgCntSql, urgP, Long.class)));
        result.put("urgent_qty",   toLong(this.queryManager.selectBySql(urgQtySql, urgP, Double.class)));

        // 5. 입고 지연 건수 및 수량 (예정일 초과, 미완료)
        String dlyCntSql = "SELECT COUNT(DISTINCT r.id) FROM receivings r " +
                "WHERE r.domain_id = :domainId AND r.rcv_req_date < :today AND r.status NOT IN ('END', 'STORED', 'CANCEL')";
        String dlyQtySql = "SELECT COALESCE(SUM(ri.rcv_exp_qty), 0) " +
                "FROM receiving_items ri INNER JOIN receivings r ON r.id = ri.receiving_id AND r.domain_id = ri.domain_id " +
                "WHERE r.domain_id = :domainId AND r.rcv_req_date < :today AND r.status NOT IN ('END', 'STORED', 'CANCEL')";
        Map<String, Object> dlyP = ValueUtil.newMap("domainId,today", domainId, today);
        if (ValueUtil.isNotEmpty(comCd)) { dlyCntSql += " AND r.com_cd = :comCd"; dlyQtySql += " AND r.com_cd = :comCd"; dlyP.put("comCd", comCd); }
        if (ValueUtil.isNotEmpty(whCd))  { dlyCntSql += " AND r.wh_cd = :whCd";   dlyQtySql += " AND r.wh_cd = :whCd";   dlyP.put("whCd", whCd); }
        result.put("delayed_count", toLong(this.queryManager.selectBySql(dlyCntSql, dlyP, Long.class)));
        result.put("delayed_qty",   toLong(this.queryManager.selectBySql(dlyQtySql, dlyP, Double.class)));

        // 6. 안전재고 미달 SKU 수
        String safetySql = "SELECT COUNT(*) FROM (" +
                "  SELECT s.sku_cd FROM sku s " +
                "  LEFT JOIN (SELECT sku_cd, SUM(inv_qty) AS total FROM inventories WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false) GROUP BY sku_cd) inv ON inv.sku_cd = s.sku_cd " +
                "  WHERE s.domain_id = :domainId AND (s.del_flag IS NULL OR s.del_flag = false) " +
                "  AND s.safety_stock IS NOT NULL AND s.safety_stock > 0 " +
                "  AND COALESCE(inv.total, 0) < s.safety_stock" +
                ") sub";
        result.put("safety_shortage_count", toLong(this.queryManager.selectBySql(safetySql, ValueUtil.newMap("domainId", domainId), Long.class)));

        // 7. 이번 주 입고 예정 수량
        String wkQtySql = "SELECT COALESCE(SUM(ri.rcv_exp_qty), 0) " +
                "FROM receiving_items ri INNER JOIN receivings r ON r.id = ri.receiving_id AND r.domain_id = ri.domain_id " +
                "WHERE r.domain_id = :domainId AND r.rcv_req_date >= :weekStart AND r.rcv_req_date <= :weekEnd AND r.status != 'CANCEL'";
        Map<String, Object> wkP = ValueUtil.newMap("domainId,weekStart,weekEnd", domainId, weekStart, weekEnd);
        if (ValueUtil.isNotEmpty(comCd)) { wkQtySql += " AND r.com_cd = :comCd"; wkP.put("comCd", comCd); }
        if (ValueUtil.isNotEmpty(whCd))  { wkQtySql += " AND r.wh_cd = :whCd";   wkP.put("whCd", whCd); }
        result.put("weekly_qty",   toLong(this.queryManager.selectBySql(wkQtySql, wkP, Double.class)));
        result.put("weekly_start", weekStart.substring(5));
        result.put("weekly_end",   weekEnd.substring(5));

        return result;
    }

    /**
     * 월간 캘린더 이벤트 조회
     *
     * @param year  조회 연도 (null이면 올해)
     * @param month 조회 월 (null이면 이번 달, 1-based)
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return List of { event_date, event_type, event_label, event_qty }
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getCalendarEvents(Integer year, Integer month, String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();

        LocalDate ref = LocalDate.now();
        int yr = (year  != null) ? year  : ref.getYear();
        int mo = (month != null) ? month : ref.getMonthValue();

        String monthStart = String.format("%04d-%02d-01", yr, mo);
        String monthEnd   = LocalDate.of(yr, mo, 1)
                .with(TemporalAdjusters.lastDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        String sql = "SELECT r.rcv_req_date AS event_date, " +
                "CASE " +
                "  WHEN r.rcv_type = 'URGENT' THEN 'urgent' " +
                "  WHEN r.status IN ('END', 'STORED') THEN 'done' " +
                "  WHEN r.rcv_req_date < :today AND r.status NOT IN ('END', 'STORED', 'CANCEL') THEN 'delay' " +
                "  ELSE 'normal' " +
                "END AS event_type, " +
                "COALESCE(NULLIF(TRIM(r.remarks), ''), r.rcv_no) AS event_label, " +
                "COALESCE((SELECT SUM(ri.rcv_exp_qty) FROM receiving_items ri WHERE ri.receiving_id = r.id AND ri.domain_id = r.domain_id), 0) AS event_qty " +
                "FROM receivings r " +
                "WHERE r.domain_id = :domainId " +
                "AND r.status != 'CANCEL' " +
                "AND r.rcv_req_date >= :monthStart " +
                "AND r.rcv_req_date <= :monthEnd ";

        Map<String, Object> params = ValueUtil.newMap("domainId,today,monthStart,monthEnd",
                domainId, today, monthStart, monthEnd);
        if (ValueUtil.isNotEmpty(comCd)) { sql += "AND r.com_cd = :comCd "; params.put("comCd", comCd); }
        if (ValueUtil.isNotEmpty(whCd))  { sql += "AND r.wh_cd = :whCd ";   params.put("whCd", whCd); }
        sql += "ORDER BY r.rcv_req_date, r.rcv_type";

        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

    /**
     * 입고 권고 리스트 조회 (안전재고 미달 SKU, 최대 20건)
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional — 재고는 loc_cd 기준이므로 사용하지 않음)
     * @return List of { sku_cd, sku_nm, current_qty, safety_qty, recommended_qty, reason, remarks }
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getReplenishmentList(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT s.sku_cd, s.sku_nm, " +
                "COALESCE(inv.total_qty, 0) AS current_qty, " +
                "s.safety_stock AS safety_qty, " +
                "GREATEST(s.safety_stock - COALESCE(inv.total_qty, 0), 0) AS recommended_qty, " +
                "'안전재고 미달' AS reason, " +
                "s.remarks " +
                "FROM sku s " +
                "LEFT JOIN (" +
                "  SELECT sku_cd, SUM(inv_qty) AS total_qty FROM inventories " +
                "  WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false) ";

        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        if (ValueUtil.isNotEmpty(comCd)) { sql += "AND com_cd = :comCd "; params.put("comCd", comCd); }
        sql += "  GROUP BY sku_cd" +
                ") inv ON inv.sku_cd = s.sku_cd " +
                "WHERE s.domain_id = :domainId " +
                "AND (s.del_flag IS NULL OR s.del_flag = false) " +
                "AND s.safety_stock IS NOT NULL AND s.safety_stock > 0 " +
                "AND COALESCE(inv.total_qty, 0) < s.safety_stock ";
        if (ValueUtil.isNotEmpty(comCd)) { sql += "AND s.com_cd = :comCd "; }
        sql += "ORDER BY (s.safety_stock - COALESCE(inv.total_qty, 0)) DESC " +
                "LIMIT 20";

        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

    /**
     * 공지사항 목록 조회
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 공지사항 목록 (notice_type, notice_title, notice_date)
     */
    public List<Map<String, Object>> getNotices(String comCd, String whCd) {
        return new java.util.ArrayList<>();
    }

    /** Number → long 변환 (null 안전) */
    private long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Long)    return (Long) val;
        if (val instanceof Integer) return ((Integer) val).longValue();
        if (val instanceof Double)  return ((Double) val).longValue();
        return 0L;
    }
}
