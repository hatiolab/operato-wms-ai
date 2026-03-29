package operato.wms.fulfillment.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.fulfillment.service.FulfillmentDashboardService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;

/**
 * 풀필먼트 대시보드 컨트롤러
 *
 * 풀필먼트 대시보드 화면(fulfillment-home)에 필요한 통계/현황 API를 제공한다.
 * Base URL: /rest/ful_trx/dashboard
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/ful_trx/dashboard")
@ServiceDesc(description = "Fulfillment Dashboard Service API")
public class FulfillmentDashboardController {

	@Autowired
	private FulfillmentDashboardService dashboardService;

	/**
	 * 피킹 상태별 건수 조회
	 * GET /rest/ful_trx/dashboard/picking_status
	 */
	@GetMapping(value = "/picking_status", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get picking status counts")
	public Map<String, Object> getPickingStatus(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.dashboardService.getPickingStatus(orderDate);
	}

	/**
	 * 포장 상태별 건수 조회
	 * GET /rest/ful_trx/dashboard/packing_status
	 */
	@GetMapping(value = "/packing_status", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get packing status counts")
	public Map<String, Object> getPackingStatus(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.dashboardService.getPackingStatus(orderDate);
	}

	/**
	 * 출하 현황 조회
	 * GET /rest/ful_trx/dashboard/shipping_status
	 */
	@GetMapping(value = "/shipping_status", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get shipping status")
	public Map<String, Object> getShippingStatus(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.dashboardService.getShippingStatus(orderDate);
	}

	/**
	 * 작업자별 실적 조회
	 * GET /rest/ful_trx/dashboard/worker_performance
	 */
	@GetMapping(value = "/worker_performance", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get worker performance stats")
	@SuppressWarnings("rawtypes")
	public List<Map> getWorkerPerformance(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.dashboardService.getWorkerPerformance(orderDate);
	}

	/**
	 * 웨이브별 풀필먼트 진행률 조회
	 * GET /rest/ful_trx/dashboard/wave_progress/{wave_no}
	 */
	@GetMapping(value = "/wave_progress/{wave_no}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get wave fulfillment progress")
	public Map<String, Object> getWaveProgress(@PathVariable("wave_no") String waveNo) {
		return this.dashboardService.getWaveProgress(waveNo);
	}

	/**
	 * 도크별 출하 현황 조회
	 * GET /rest/ful_trx/dashboard/dock_status
	 */
	@GetMapping(value = "/dock_status", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get dock shipping status")
	@SuppressWarnings("rawtypes")
	public List<Map> getDockStatus(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.dashboardService.getDockStatus(orderDate);
	}
}
