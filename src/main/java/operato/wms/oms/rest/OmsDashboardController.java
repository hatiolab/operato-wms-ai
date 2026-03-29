package operato.wms.oms.rest;

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

import operato.wms.oms.service.OmsDashboardService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;

/**
 * OMS 대시보드 컨트롤러
 *
 * OMS 대시보드 화면(oms-home)에 필요한 통계/현황 API를 제공한다.
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/oms_dashboard")
@ServiceDesc(description = "OMS Dashboard Service API")
public class OmsDashboardController {

	@Autowired
	private OmsDashboardService omsDashboardService;

	/**
	 * 상태별 건수 조회
	 *
	 * GET /rest/oms_dashboard/status_counts
	 *
	 * @param orderDate 기준일 (optional, 기본값: 오늘)
	 * @return 상태별 건수 Map (11개 상태)
	 */
	@GetMapping(value = "/status_counts", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Status Counts")
	public Map<String, Object> getStatusCounts(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.omsDashboardService.getStatusCounts(orderDate);
	}

	/**
	 * 업무 유형별 통계 조회
	 *
	 * GET /rest/oms_dashboard/biz_type_stats
	 *
	 * @param orderDate 기준일 (optional, 기본값: 오늘)
	 * @return 업무유형별 건수 Map (B2C_OUT, B2B_OUT, B2C_RTN, B2B_RTN)
	 */
	@GetMapping(value = "/biz_type_stats", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Business Type Statistics")
	public Map<String, Object> getBizTypeStats(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.omsDashboardService.getBizTypeStats(orderDate);
	}

	/**
	 * 채널(고객)별 통계 조회
	 *
	 * GET /rest/oms_dashboard/channel_stats
	 *
	 * @param orderDate 기준일 (optional, 기본값: 오늘)
	 * @return 채널별 건수 리스트 [{ cust_cd, cust_nm, count }]
	 */
	@GetMapping(value = "/channel_stats", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Channel Statistics")
	public List<Map<String, Object>> getChannelStats(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.omsDashboardService.getChannelStats(orderDate);
	}

	/**
	 * 웨이브 진행 현황 조회
	 *
	 * GET /rest/oms_dashboard/wave_stats
	 *
	 * @param waveDate 기준일 (optional, 기본값: 오늘)
	 * @return 웨이브 상태별 건수 Map (CREATED, RELEASED, COMPLETED, CANCELLED)
	 */
	@GetMapping(value = "/wave_stats", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Wave Statistics")
	public Map<String, Object> getWaveStats(
			@RequestParam(name = "wave_date", required = false) String waveDate) {
		return this.omsDashboardService.getWaveStats(waveDate);
	}

	/**
	 * 할당 현황 통계 조회
	 *
	 * GET /rest/oms_dashboard/allocation_stats
	 *
	 * @return 할당 현황 Map (total_orders, allocated_orders, back_orders, alloc_rate, soft_alloc_expiring_soon)
	 */
	@GetMapping(value = "/allocation_stats", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Allocation Statistics")
	public Map<String, Object> getAllocationStats() {
		return this.omsDashboardService.getAllocationStats();
	}

	/**
	 * 마감 임박/주의 알림 목록 조회
	 *
	 * GET /rest/oms_dashboard/cutoff_alerts
	 *
	 * @return 알림 목록 [{ type, message, count }]
	 */
	@GetMapping(value = "/cutoff_alerts", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Cutoff Alerts")
	public List<Map<String, Object>> getCutoffAlerts() {
		return this.omsDashboardService.getCutoffAlerts();
	}
}
