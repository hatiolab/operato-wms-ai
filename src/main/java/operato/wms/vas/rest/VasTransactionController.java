package operato.wms.vas.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.vas.entity.VasOrder;
import operato.wms.vas.entity.VasOrderItem;
import operato.wms.vas.entity.VasResult;
import operato.wms.vas.service.VasTransactionService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.util.ValueUtil;

/**
 * VAS 트랜잭션 처리 API 컨트롤러
 *
 * 유통가공 작업 지시의 생명주기 관리
 * - 작업 지시 생성 (BOM 자재 자동 전개)
 * - 승인/취소
 * - 자재 배정/피킹
 * - 작업 시작
 * - 실적 등록
 * - 완료/마감
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/vas_trx")
@ServiceDesc(description = "VAS Transaction Service API")
public class VasTransactionController {

	@Autowired
	private VasTransactionService vasService;

	/********************************************************************************************************
	 * 1. 작업 지시 생성 및 승인
	 ********************************************************************************************************/

	/**
	 * 작업 지시 생성 (BOM 기반 자재 자동 전개)
	 *
	 * @param vasOrder 작업 지시 정보
	 * @return 생성된 작업 지시 (자재 상세 포함)
	 */
	@PostMapping(value = "/vas_orders", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create VAS Order (with BOM expansion)")
	public VasOrder createVasOrder(@RequestBody VasOrder vasOrder) {
		// BOM 기반 자재 전개 포함하여 작업 지시 생성
		VasOrder createdOrder = this.vasService.createVasOrder(vasOrder);

		// items는 별도 API로 조회 가능 (GET /rest/vas_orders/{id}/items)
		return createdOrder;
	}

	/**
	 * 작업 지시 승인
	 *
	 * @param id 작업 지시 ID
	 * @param params approvedBy (승인자 ID)
	 * @return 승인된 작업 지시
	 */
	@PostMapping(value = "/vas_orders/{id}/approve", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Approve VAS Order")
	public VasOrder approveVasOrder(
			@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {

		String approvedBy = (String) params.get("approvedBy");

		return this.vasService.approveVasOrder(id, approvedBy);
	}

	/**
	 * 작업 지시 취소
	 *
	 * @param id 작업 지시 ID
	 * @param params cancelReason (취소 사유)
	 * @return 취소된 작업 지시
	 */
	@PostMapping(value = "/vas_orders/{id}/cancel", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel VAS Order")
	public VasOrder cancelVasOrder(
			@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {

		String cancelReason = (String) params.get("cancelReason");

		return this.vasService.cancelVasOrder(id, cancelReason);
	}

	/********************************************************************************************************
	 * 2. 자재 배정 및 피킹
	 ********************************************************************************************************/

	/**
	 * 자재 배정
	 *
	 * @param itemId 작업 지시 상세 ID
	 * @param params allocQty, srcLocCd, lotNo
	 * @return 업데이트된 작업 지시 상세
	 */
	@PostMapping(value = "/vas_order_items/{itemId}/allocate", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Allocate Material for VAS")
	public VasOrderItem allocateMaterial(
			@PathVariable("itemId") String itemId,
			@RequestBody Map<String, Object> params) {

		Double allocQty = ValueUtil.toDouble(params.get("allocQty"));
		String srcLocCd = (String) params.get("srcLocCd");
		String lotNo = (String) params.get("lotNo");

		return this.vasService.allocateMaterial(itemId, allocQty, srcLocCd, lotNo);
	}

	/**
	 * 자재 피킹
	 *
	 * @param itemId 작업 지시 상세 ID
	 * @param params pickedQty
	 * @return 업데이트된 작업 지시 상세
	 */
	@PostMapping(value = "/vas_order_items/{itemId}/pick", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Pick Material for VAS")
	public VasOrderItem pickMaterial(
			@PathVariable("itemId") String itemId,
			@RequestBody Map<String, Object> params) {

		Double pickedQty = ValueUtil.toDouble(params.get("pickedQty"));

		return this.vasService.pickMaterial(itemId, pickedQty);
	}

	/**
	 * 자재 일괄 배정
	 *
	 * @param id 작업 지시 ID
	 * @param items 배정 대상 항목 목록 (itemId, allocQty, srcLocCd, lotNo)
	 * @return 업데이트된 작업 지시 상세 목록
	 */
	@PostMapping(value = "/vas_orders/{id}/allocate_all", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Allocate All Materials for VAS Order")
	public List<VasOrderItem> allocateAllMaterials(
			@PathVariable("id") String id,
			@RequestBody List<Map<String, Object>> items) {

		for (Map<String, Object> item : items) {
			String itemId = (String) item.get("itemId");
			Double allocQty = ValueUtil.toDouble(item.get("allocQty"));
			String srcLocCd = (String) item.get("srcLocCd");
			String lotNo = (String) item.get("lotNo");

			this.vasService.allocateMaterial(itemId, allocQty, srcLocCd, lotNo);
		}

		return this.vasService.listVasOrderItems(id);
	}

	/**
	 * 자재 일괄 피킹
	 *
	 * @param id 작업 지시 ID
	 * @param items 피킹 대상 항목 목록 (itemId, pickedQty)
	 * @return 업데이트된 작업 지시 상세 목록
	 */
	@PostMapping(value = "/vas_orders/{id}/pick_all", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Pick All Materials for VAS Order")
	public List<VasOrderItem> pickAllMaterials(
			@PathVariable("id") String id,
			@RequestBody List<Map<String, Object>> items) {

		for (Map<String, Object> item : items) {
			String itemId = (String) item.get("itemId");
			Double pickedQty = ValueUtil.toDouble(item.get("pickedQty"));

			this.vasService.pickMaterial(itemId, pickedQty);
		}

		return this.vasService.listVasOrderItems(id);
	}

	/********************************************************************************************************
	 * 3. 작업 시작 및 진행
	 ********************************************************************************************************/

	/**
	 * 작업 시작
	 *
	 * @param id 작업 지시 ID
	 * @param params workerId (작업자 ID)
	 * @return 작업 시작된 작업 지시
	 */
	@PostMapping(value = "/vas_orders/{id}/start", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Start VAS Work")
	public VasOrder startVasWork(
			@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {

		String workerId = (String) params.get("workerId");

		return this.vasService.startVasWork(id, workerId);
	}

	/********************************************************************************************************
	 * 4. 실적 등록
	 ********************************************************************************************************/

	/**
	 * 실적 등록
	 *
	 * @param id 작업 지시 ID
	 * @param result 실적 정보
	 * @return 생성된 실적
	 */
	@PostMapping(value = "/vas_orders/{id}/results", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Register VAS Result")
	public VasResult registerResult(
			@PathVariable("id") String id,
			@RequestBody VasResult result) {

		return this.vasService.registerResult(id, result);
	}

	/********************************************************************************************************
	 * 5. 작업 완료 및 마감
	 ********************************************************************************************************/

	/**
	 * 작업 완료
	 *
	 * @param id 작업 지시 ID
	 * @return 완료된 작업 지시
	 */
	@PostMapping(value = "/vas_orders/{id}/complete", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Complete VAS Work")
	public VasOrder completeVasOrder(@PathVariable("id") String id) {
		return this.vasService.completeVasOrder(id);
	}

	/**
	 * 작업 마감
	 *
	 * @param id 작업 지시 ID
	 * @return 마감된 작업 지시
	 */
	@PostMapping(value = "/vas_orders/{id}/close", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Close VAS Work")
	public VasOrder closeVasOrder(@PathVariable("id") String id) {
		return this.vasService.closeVasOrder(id);
	}

	/********************************************************************************************************
	 * 6. 조회 API
	 ********************************************************************************************************/

	/**
	 * 작업 지시 목록 조회
	 *
	 * @param comCd 화주사 코드
	 * @param status 상태
	 * @param vasType 유통가공 유형
	 * @param startDate 시작일
	 * @param endDate 종료일
	 * @return 작업 지시 목록
	 */
	@PostMapping(value = "/vas_orders/search", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search VAS Orders")
	public List<VasOrder> searchVasOrders(
			@RequestParam(name = "comCd", required = false) String comCd,
			@RequestParam(name = "status", required = false) String status,
			@RequestParam(name = "vasType", required = false) String vasType,
			@RequestParam(name = "startDate", required = false) String startDate,
			@RequestParam(name = "endDate", required = false) String endDate) {

		return this.vasService.listVasOrders(comCd, status, vasType, startDate, endDate);
	}

	/********************************************************************************************************
	 * 7. 모니터링 API
	 ********************************************************************************************************/

	/**
	 * 작업 진행 모니터링 - 주문 목록 조회 (자재 진행 요약 포함)
	 *
	 * GET /rest/vas_trx/monitor/orders
	 *
	 * @param status 상태 필터 (optional, 쉼표 구분 가능. 기본값: IN_PROGRESS,APPROVED,MATERIAL_READY)
	 * @return 주문 목록 (자재 진행 요약 포함)
	 */
	@GetMapping(value = "/monitor/orders", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get Monitor Orders with Material Summary")
	public List<Map<String, Object>> getMonitorOrders(
			@RequestParam(name = "status", required = false) String status) {

		List<String> statuses = null;
		if (ValueUtil.isNotEmpty(status)) {
			statuses = java.util.Arrays.asList(status.split(","));
		}

		return this.vasService.getMonitorOrders(statuses);
	}

	/********************************************************************************************************
	 * 8. 대시보드 통계 API
	 ********************************************************************************************************/

	/**
	 * 대시보드 - 상태별 건수 조회
	 *
	 * GET /rest/vas_trx/dashboard/status-counts
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd 창고 코드 (optional)
	 * @param targetDate 기준일 (optional, 기본값: 오늘)
	 * @return 상태별 건수 Map { status: count }
	 */
	@GetMapping("/dashboard/status-counts")
	@ApiDesc(description = "Get Dashboard Status Counts")
	public Map<String, Object> getDashboardStatusCounts(
			@RequestParam(name = "comCd", required = false) String comCd,
			@RequestParam(name = "whCd", required = false) String whCd,
			@RequestParam(name = "targetDate", required = false) String targetDate) {
		return this.vasService.getDashboardStatusCounts(comCd, whCd, targetDate);
	}

	/**
	 * 대시보드 - VAS 유형별 통계 조회
	 *
	 * GET /rest/vas_trx/dashboard/type-stats
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd 창고 코드 (optional)
	 * @param startDate 시작일 (optional, 기본값: 오늘)
	 * @param endDate 종료일 (optional, 기본값: 오늘)
	 * @return 유형별 건수 Map { vasType: count }
	 */
	@GetMapping("/dashboard/type-stats")
	@ApiDesc(description = "Get Dashboard Type Statistics")
	public Map<String, Object> getDashboardTypeStats(
			@RequestParam(name = "comCd", required = false) String comCd,
			@RequestParam(name = "whCd", required = false) String whCd,
			@RequestParam(name = "startDate", required = false) String startDate,
			@RequestParam(name = "endDate", required = false) String endDate) {
		return this.vasService.getDashboardTypeStats(comCd, whCd, startDate, endDate);
	}

	/**
	 * 대시보드 - 알림 데이터 조회
	 *
	 * GET /rest/vas_trx/dashboard/alerts
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd 창고 코드 (optional)
	 * @return 알림 목록 List<Map<String, Object>>
	 */
	@GetMapping("/dashboard/alerts")
	@ApiDesc(description = "Get Dashboard Alerts")
	public List<Map<String, Object>> getDashboardAlerts(
			@RequestParam(name = "comCd", required = false) String comCd,
			@RequestParam(name = "whCd", required = false) String whCd) {
		return this.vasService.getDashboardAlerts(comCd, whCd);
	}
}
