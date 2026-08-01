package operato.wms.rwa.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.rwa.service.RwaDashboardService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;

/**
 * 반품(RWA) 대시보드 컨트롤러
 *
 * Base URL: /rest/rwa_dashboard
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/rwa_dashboard")
@ServiceDesc(description = "RWA Dashboard Service API")
public class RwaDashboardController {

	@Autowired
	private RwaDashboardService rwaDashboardService;

	/**
	 * KPI 요약 조회
	 *
	 * GET /rest/rwa_dashboard/summary
	 */
	@GetMapping(value = "/summary", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get RWA Dashboard Summary")
	public Map<String, Object> getSummary(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaDashboardService.getSummary(comCd, whCd);
	}

	/**
	 * 반품 처리 프로세스 현황 조회
	 *
	 * GET /rest/rwa_dashboard/process
	 */
	@GetMapping(value = "/process", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get RWA Process Status")
	public List<Map<String, Object>> getProcess(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaDashboardService.getProcess(comCd, whCd);
	}

	/**
	 * 반품 재고 현황 조회 (도넛 차트용)
	 *
	 * GET /rest/rwa_dashboard/stock-status
	 */
	@GetMapping(value = "/stock-status", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get RWA Stock Status")
	public Map<String, Object> getStockStatus(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaDashboardService.getStockStatus(comCd, whCd);
	}

	/**
	 * 반품 재고 상세 현황 조회
	 *
	 * GET /rest/rwa_dashboard/stock-detail
	 */
	@GetMapping(value = "/stock-detail", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get RWA Stock Detail")
	public Map<String, Object> getStockDetail(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaDashboardService.getStockDetail(comCd, whCd);
	}

	/**
	 * 일별 반품 입고·출고 추이 조회
	 *
	 * GET /rest/rwa_dashboard/daily-trend
	 */
	@GetMapping(value = "/daily-trend", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get RWA Daily Trend")
	public List<Map<String, Object>> getDailyTrend(
			@RequestParam(name = "days", required = false, defaultValue = "7") Integer days,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaDashboardService.getDailyTrend(days, comCd, whCd);
	}

	/**
	 * 반품 재고 추이 조회
	 *
	 * GET /rest/rwa_dashboard/stock-trend
	 */
	@GetMapping(value = "/stock-trend", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get RWA Stock Trend")
	public List<Map<String, Object>> getStockTrend(
			@RequestParam(name = "days", required = false, defaultValue = "7") Integer days,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaDashboardService.getStockTrend(days, comCd, whCd);
	}

	/**
	 * 최근 알림 목록 조회
	 *
	 * GET /rest/rwa_dashboard/alerts
	 */
	@GetMapping(value = "/alerts", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get RWA Alerts")
	public List<Map<String, Object>> getAlerts(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaDashboardService.getAlerts(comCd, whCd);
	}
}
