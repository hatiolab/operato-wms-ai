package operato.wms.inbound.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.inbound.service.InboundDashboardService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;

/**
 * 입고 대시보드 컨트롤러
 *
 * 입고 홈 화면에서 사용하는 대시보드 데이터 조회 API를 제공한다.
 * Base URL: /rest/inbound_dashboard
 *
 * @author HatioLab
 */
@RestController
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inbound_dashboard")
@ServiceDesc(description = "Inbound Dashboard API")
public class InboundDashboardController {

    /**
     * 입고 대시보드 서비스
     */
    @Autowired
    private InboundDashboardService inbTrxService;

    /**
     * 대시보드 - 입고 상태별 건수 조회
     *
     * GET /rest/inbound_dashboard/status-counts
     *
     * @param comCd      화주사 코드 (optional)
     * @param whCd       창고 코드 (optional)
     * @param targetDate 기준일 (optional, 기본값: 오늘)
     * @return 상태별 건수 Map { status: count }
     */
    @GetMapping("/status-counts")
    @ApiDesc(description = "Get Dashboard Status Counts")
    public Map<String, Object> getDashboardStatusCounts(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd,
            @RequestParam(name = "target_date", required = false) String targetDate) {
        return this.inbTrxService.getDashboardStatusCounts(comCd, whCd, targetDate);
    }

    /**
     * 대시보드 - 입고 유형별 통계 조회
     *
     * GET /rest/inbound_dashboard/type-stats
     *
     * @param comCd     화주사 코드 (optional)
     * @param whCd      창고 코드 (optional)
     * @param startDate 시작일 (optional, 기본값: 오늘)
     * @param endDate   종료일 (optional, 기본값: 오늘)
     * @return 유형별 건수 Map { rcvType: count }
     */
    @GetMapping("/type-stats")
    @ApiDesc(description = "Get Dashboard Type Statistics")
    public Map<String, Object> getDashboardTypeStats(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd,
            @RequestParam(name = "start_date", required = false) String startDate,
            @RequestParam(name = "end_date", required = false) String endDate) {
        return this.inbTrxService.getDashboardTypeStats(comCd, whCd, startDate, endDate);
    }

    /**
     * 대시보드 - 검수 현황 통계 조회
     *
     * GET /rest/inbound_dashboard/inspection-stats
     *
     * @param comCd      화주사 코드 (optional)
     * @param whCd       창고 코드 (optional)
     * @param targetDate 기준일 (optional, 기본값: 오늘)
     * @return 검수 상태별 건수 Map { inspStatus: count }
     */
    @GetMapping("/inspection-stats")
    @ApiDesc(description = "Get Dashboard Inspection Statistics")
    public Map<String, Object> getDashboardInspectionStats(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd,
            @RequestParam(name = "target_date", required = false) String targetDate) {
        return this.inbTrxService.getDashboardInspectionStats(comCd, whCd, targetDate);
    }

    /**
     * 대시보드 - 알림 데이터 조회
     *
     * GET /rest/inbound_dashboard/alerts
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 알림 목록 List<Map<String, Object>>
     */
    @GetMapping("/alerts")
    @ApiDesc(description = "Get Dashboard Alerts")
    public List<Map<String, Object>> getDashboardAlerts(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.inbTrxService.getDashboardAlerts(comCd, whCd);
    }

    /**
     * 적치 현황 요약 조회
     *
     * GET /rest/inbound_dashboard/putaway-summary
     *
     * - waiting_count: 현재 적치 대기 중인 전체 재고 건수
     * - stored_count: 오늘 적치 완료한 재고 건수
     * - stored_qty: 오늘 적치 완료한 재고 수량 합계
     *
     * @return Map { waiting_count: N, stored_count: N, stored_qty: N }
     */
    @GetMapping("/putaway-summary")
    @ApiDesc(description = "Get Putaway Summary Counts")
    public Map<String, Object> getPutawaySummary() {
        return this.inbTrxService.getPutawaySummary();
    }

    /**
     * 대시보드 KPI 요약 조회
     *
     * GET /rest/inbound_dashboard/summary
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return today_count, today_qty, completion_rate, urgent_count, urgent_qty,
     *         delayed_count, delayed_qty, safety_shortage_count, weekly_qty, weekly_start, weekly_end
     */
    @GetMapping("/summary")
    @ApiDesc(description = "Get Dashboard KPI Summary")
    public Map<String, Object> getDashboardSummary(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.inbTrxService.getDashboardSummary(comCd, whCd);
    }

    /**
     * 월간 캘린더 이벤트 조회
     *
     * GET /rest/inbound_dashboard/calendar-events?year=2026&month=6
     *
     * @param year  조회 연도 (optional, 기본값: 올해)
     * @param month 조회 월 (optional, 기본값: 이번 달)
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return List of { event_date, event_type(normal/urgent/done/delay), event_label, event_qty }
     */
    @GetMapping("/calendar-events")
    @ApiDesc(description = "Get Calendar Events for Month")
    public List<Map<String, Object>> getCalendarEvents(
            @RequestParam(name = "year", required = false) Integer year,
            @RequestParam(name = "month", required = false) Integer month,
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.inbTrxService.getCalendarEvents(year, month, comCd, whCd);
    }

    /**
     * 입고 권고 리스트 조회 (안전재고 미달 SKU)
     *
     * GET /rest/inbound_dashboard/replenishment-list
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return List of { sku_cd, sku_nm, current_qty, safety_qty, recommended_qty, reason, remarks }
     */
    @GetMapping("/replenishment-list")
    @ApiDesc(description = "Get Replenishment Recommendation List (Safety Stock Shortage)")
    public List<Map<String, Object>> getReplenishmentList(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.inbTrxService.getReplenishmentList(comCd, whCd);
    }

    /**
     * 공지사항 목록 조회
     *
     * GET /rest/inbound_dashboard/notices
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 공지사항 목록 List<Map> { notice_type(URGENT/INFO/NORMAL), notice_title, notice_date }
     */
    @GetMapping("/notices")
    @ApiDesc(description = "Get Dashboard Notices")
    public List<Map<String, Object>> getNotices(
            @RequestParam(name = "com_cd", required = false) String comCd,
            @RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.inbTrxService.getNotices(comCd, whCd);
    }
}
