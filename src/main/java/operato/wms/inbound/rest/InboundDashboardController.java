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
     * 적치 작업 PDA - 대기/완료 건수 요약 조회
     *
     * GET /rest/inbound_dashboard/putaway-summary
     *
     * - waiting_count: inventories 중 status = 'WAITING' 건수
     * - stored_count:  오늘 receiving_items 완료(END) 처리 중 inventories가 STORED 상태인 건수
     *
     * @return Map { waiting_count: N, stored_count: N }
     */
    @GetMapping("/putaway-summary")
    @ApiDesc(description = "Get Putaway Summary Counts")
    public Map<String, Object> getPutawaySummary() {
        return this.inbTrxService.getPutawaySummary();
    }
}
