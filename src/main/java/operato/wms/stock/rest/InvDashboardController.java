package operato.wms.stock.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.stock.entity.Inventory;
import operato.wms.stock.service.InventoryDashboardService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;

/**
 * 재고 대시보드 컨트롤러
 *
 * 재고 현황, 상태별 통계, 유효기한 통계, 로케이션 통계, 알림 등
 * 대시보드용 조회 API를 제공한다.
 * Base URL: /rest/inv_dashboard
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inv_dashboard")
@ServiceDesc(description = "Inventory Dashboard Service API")
public class InvDashboardController extends AbstractRestService {

	/**
	 * 재고 대시보드 서비스
	 */
	@Autowired
	private InventoryDashboardService invDashSvc;

	@Override
	protected Class<?> entityClass() {
		return Inventory.class;
	}

	/**
	 * 대시보드 - 재고 현황 조회
	 *
	 * GET /rest/inv_dashboard/status-counts
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 재고 현황 Map
	 */
	@RequestMapping(value = "/status-counts", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Dashboard Status Counts")
	public Map<String, Object> getDashboardStatusCounts(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.invDashSvc.getDashboardStatusCounts(comCd, whCd);
	}

	/**
	 * 대시보드 - 재고 상태별 통계 조회
	 *
	 * GET /rest/inv_dashboard/status-stats
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 상태별 수량 Map { status: qty }
	 */
	@RequestMapping(value = "/status-stats", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Dashboard Status Statistics")
	public Map<String, Object> getDashboardStatusStats(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.invDashSvc.getDashboardStatusStats(comCd, whCd);
	}

	/**
	 * 대시보드 - 유효기한 상태별 통계 조회
	 *
	 * GET /rest/inv_dashboard/expire-stats
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 유효기한 상태별 통계 Map { expireStatus: { sku_count, qty } }
	 */
	@RequestMapping(value = "/expire-stats", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Dashboard Expire Statistics")
	public Map<String, Object> getDashboardExpireStats(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.invDashSvc.getDashboardExpireStats(comCd, whCd);
	}

	/**
	 * 대시보드 - 로케이션 유형별 통계 조회
	 *
	 * GET /rest/inv_dashboard/location-stats
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 로케이션 유형별 통계 Map { locGroup: { total, used, usage_rate } }
	 */
	@RequestMapping(value = "/location-stats", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Dashboard Location Statistics")
	public Map<String, Object> getDashboardLocationStats(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.invDashSvc.getDashboardLocationStats(comCd, whCd);
	}

	/**
	 * 대시보드 - 알림 데이터 조회
	 *
	 * GET /rest/inv_dashboard/alerts
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 알림 목록 List<Map<String, Object>>
	 */
	@RequestMapping(value = "/alerts", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Dashboard Alerts")
	public List<Map<String, Object>> getDashboardAlerts(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.invDashSvc.getDashboardAlerts(comCd, whCd);
	}

}
