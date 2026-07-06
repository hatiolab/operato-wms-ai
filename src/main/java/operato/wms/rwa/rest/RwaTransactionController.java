package operato.wms.rwa.rest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.rwa.entity.RwaDisposition;
import operato.wms.rwa.entity.RwaInspection;
import operato.wms.rwa.entity.RwaOrder;
import operato.wms.rwa.entity.RwaOrderItem;
import operato.wms.rwa.service.RwaTransactionService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

/**
 * RWA(Return Warehouse Authorization) 트랜잭션 처리 REST API Controller
 *
 * 반품 프로세스:
 * 1. POST /rwa_orders - 반품 지시 생성 (→ REQUEST, rwa_req_no 자동 채번)
 * 2. POST /rwa_orders/{id}/approve - 반품 승인 (→ APPROVED, rwa_no 자동 채번)
 * 3. POST /rwa_orders/{id}/reject - 반품 거부 (→ REJECTED, 승인 전 단계에서만)
 * 4. POST /rwa_orders/{id}/cancel - 반품 취소 (→ CANCELLED, 완료 전 어느 단계에서든)
 * 5. POST /rwa_orders/{id}/items/{itemId}/receive - 반품 입고 (→ 아이템 RECEIVED, 마스터 RECEIVING/RECEIVED 자동 전환)
 * 6. POST /rwa_orders/{id}/items/{itemId}/inspect - 검수 데이터 저장
 * 7. POST /rwa_orders/{id}/items/{itemId}/complete_inspection - 검수 완료 (→ 아이템 INSPECTED, 바코드 배치 채번)
 * 8. POST /rwa_orders/{id}/items/{itemId}/dispose - 처분 완료 (→ 아이템 DISPOSED, 마스터 DISPOSING→COMPLETED 자동 전환)
 *
 * 완료(COMPLETED) 전환은 모든 아이템이 DISPOSED 상태일 때 자동으로 처리됨.
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/rwa_trx")
@ServiceDesc(description = "RWA Transaction Service API")
public class RwaTransactionController extends AbstractRestService {

	@Autowired
	private RwaTransactionService rwaService;

	@Override
	protected Class<?> entityClass() {
		return RwaOrder.class;
	}

	/********************************************************************************************************
	 * 1. 반품 지시 생성 및 승인
	 ********************************************************************************************************/

	/**
	 * 반품 지시 생성
	 *
	 * POST /rest/rwa_trx/rwa_orders
	 *
	 * @param rwaOrder 반품 지시 정보
	 * @return 생성된 반품 지시
	 */
	@PostMapping("/rwa_orders")
	@ApiDesc(description = "Create RWA Order")
	public RwaOrder createRwaOrder(@RequestBody RwaOrder rwaOrder) {
		return this.rwaService.createRwaOrder(rwaOrder);
	}

	/**
	 * 반품 지시 생성 (상세 항목 포함)
	 *
	 * POST /rest/rwa_trx/rwa_orders/with_items
	 *
	 * @param params { rwaOrder: {...}, items: [...] }
	 * @return 생성된 반품 지시
	 */
	@PostMapping("/rwa_orders/with_items")
	@ApiDesc(description = "Create RWA Order with Items")
	public RwaOrder createRwaOrderWithItems(@RequestBody Map<String, Object> params) {
		RwaOrder rwaOrder = ValueUtil.populate(params.get("rwaOrder"), new RwaOrder());
		@SuppressWarnings("unchecked")
		List<Map<String, Object>> itemMaps = (List<Map<String, Object>>) params.get("items");

		List<RwaOrderItem> items = new ArrayList<>();
		if (itemMaps != null && !itemMaps.isEmpty()) {
			for (Map<String, Object> itemMap : itemMaps) {
				RwaOrderItem item = ValueUtil.populate(itemMap, new RwaOrderItem());
				items.add(item);
			}
		}

		return this.rwaService.createRwaOrderWithItems(rwaOrder, items);
	}

	/**
	 * 반품 지시 승인
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/approve
	 *
	 * @param id     반품 지시 ID
	 * @param params { approvedBy: "user_id" }
	 * @return 승인된 반품 지시
	 */
	@PostMapping("/rwa_orders/{id}/approve")
	@ApiDesc(description = "Approve RWA Order")
	public RwaOrder approveRwaOrder(
			@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {
		String approvedBy = (String) params.get("approvedBy");
		return this.rwaService.approveRwaOrder(id, approvedBy);
	}

	/**
	 * 반품 지시 거부
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/reject
	 *
	 * @param id     반품 지시 ID
	 * @param params { rejectedBy: "user_id", rejectReason: "..." }
	 * @return 거부된 반품 지시
	 */
	@PostMapping("/rwa_orders/{id}/reject")
	@ApiDesc(description = "Reject RWA Order")
	public RwaOrder rejectRwaOrder(
			@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {
		String rejectedBy = (String) params.get("rejectedBy");
		String rejectReason = (String) params.get("rejectReason");
		return this.rwaService.rejectRwaOrder(id, rejectedBy, rejectReason);
	}

	/********************************************************************************************************
	 * 2. 반품 입고
	 ********************************************************************************************************/

	/**
	 * 반품 입고 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/receive
	 *
	 * @param id     반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId 반품 상세 ID
	 * @param params { rwaQty: 10.0, locCd: "A-01-01" }
	 * @return 업데이트된 반품 상세
	 */
	@PostMapping("/rwa_orders/{id}/items/{itemId}/receive")
	@ApiDesc(description = "Receive RWA Item")
	public RwaOrderItem receiveRwaItem(
			@PathVariable("id") String id,
			@PathVariable("itemId") String itemId,
			@RequestBody Map<String, Object> params) {
		Double rwaQty = ValueUtil.toDouble(params.get("rwaQty"));
		String locCd = (String) params.get("locCd");
		return this.rwaService.receiveRwaItem(itemId, rwaQty, locCd);
	}

	/********************************************************************************************************
	 * 3. 반품 검수
	 ********************************************************************************************************/

	/**
	 * 반품 검수 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/inspect
	 *
	 * @param id         반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId     반품 상세 ID
	 * @param inspection 검수 정보
	 * @return 생성된 검수 기록
	 */
	@PostMapping("/rwa_orders/{id}/items/{itemId}/inspect")
	@ApiDesc(description = "Inspect RWA Item")
	public RwaInspection inspectRwaItem(
			@PathVariable("id") String id,
			@PathVariable("itemId") String itemId,
			@RequestBody RwaInspection inspection) {
		return this.rwaService.inspectRwaItem(itemId, inspection);
	}

	/**
	 * 반품 검수 완료 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/complete_inspection
	 *
	 * @param id     반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId 반품 상세 ID
	 * @return 업데이트된 반품 상세
	 */
	@PostMapping("/rwa_orders/{id}/items/{itemId}/complete_inspection")
	@ApiDesc(description = "Complete RWA Inspection")
	public RwaOrderItem completeInspection(
			@PathVariable("id") String id,
			@PathVariable("itemId") String itemId) {
		return this.rwaService.completeInspection(itemId);
	}

	/**
	 * 반품 검수 + 완료 원자 처리 (R4)
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/inspect_complete
	 * 검수기록 저장과 완료/재고이동을 하나의 트랜잭션으로 처리한다.
	 *
	 * @param id         반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId     반품 상세 ID
	 * @param inspection 검수 정보
	 * @return 완료된 반품 상세
	 */
	@PostMapping("/rwa_orders/{id}/items/{itemId}/inspect_complete")
	@ApiDesc(description = "Inspect and Complete RWA Item in one transaction")
	public RwaOrderItem inspectAndCompleteRwaItem(
			@PathVariable("id") String id,
			@PathVariable("itemId") String itemId,
			@RequestBody RwaInspection inspection) {
		return this.rwaService.inspectAndComplete(itemId, inspection);
	}

	/********************************************************************************************************
	 * 4. 반품 처분
	 ********************************************************************************************************/

	/**
	 * 반품 처분 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/dispose
	 *
	 * @param id          반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId      반품 상세 ID
	 * @param disposition 처분 정보
	 * @return 생성된 처분 기록
	 */
	@PostMapping("/rwa_orders/{id}/items/{itemId}/dispose")
	@ApiDesc(description = "Dispose RWA Item")
	public RwaDisposition disposeRwaItem(
			@PathVariable("id") String id,
			@PathVariable("itemId") String itemId,
			@RequestBody RwaDisposition disposition) {
		return this.rwaService.disposeRwaItem(itemId, disposition);
	}

	/**
	 * 반품 처분 일괄 완료 (양품/불량 분리 처분 + 반품 완료)
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/finalize
	 *
	 * "반품 완료" 버튼 클릭 시 호출. 각 아이템의 양품/불량 처분을 한 번에 처리하고 주문을 완료 상태로 전환.
	 *
	 * 요청 바디:
	 * {
	 *   "decisions": [
	 *     {
	 *       "item_id": "...",
	 *       "good_disposition": { "disposition_type": "RESTOCK", "restock_loc_cd": "A-01", "restock_expired_date": "2026-12-31" },
	 *       "defect_disposition": { "disposition_type": "SCRAP", "scrap_method": "INCINERATION" }
	 *     }
	 *   ]
	 * }
	 *
	 * @param id     반품 지시 ID
	 * @param params decisions 배열 포함 payload
	 * @return 완료된 반품 지시
	 */
	@PostMapping("/rwa_orders/{id}/finalize")
	@ApiDesc(description = "Finalize RWA Order with dispositions (good/defect split)")
	public RwaOrder finalizeOrderWithDispositions(
			@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {
		@SuppressWarnings("unchecked")
		List<Map<String, Object>> decisions = (List<Map<String, Object>>) params.get("decisions");
		if (decisions == null || decisions.isEmpty()) {
			throw new xyz.elidom.exception.server.ElidomValidationException("처분 결정 목록이 없습니다.");
		}
		return this.rwaService.finalizeOrderWithDispositions(id, decisions);
	}

	/********************************************************************************************************
	 * 5. 반품 완료 및 마감
	 ********************************************************************************************************/

	/**
	 * 반품 지시 취소 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/cancel
	 *
	 * 완료(COMPLETED), 거부(REJECTED), 취소(CANCELLED) 상태를 제외한 모든 단계에서 취소 가능.
	 *
	 * @param id     반품 지시 ID
	 * @param params { cancelReason: "취소 사유" }
	 * @return 취소된 반품 지시
	 */
	@PostMapping("/rwa_orders/{id}/cancel")
	@ApiDesc(description = "Cancel RWA Order")
	public RwaOrder cancelRwaOrder(
			@PathVariable("id") String id,
			@RequestBody(required = false) Map<String, Object> params) {
		String cancelReason = params != null ? (String) params.get("cancelReason") : null;
		return this.rwaService.cancelRwaOrder(id, cancelReason);
	}

	/********************************************************************************************************
	 * 6. 조회 API
	 ********************************************************************************************************/

	/**
	 * 반품 지시 목록 조회
	 *
	 * GET /rest/rwa_trx/rwa_orders
	 *
	 * @param comCd     화주사 코드
	 * @param status    상태
	 * @param rwaType   반품 유형
	 * @param startDate 시작일 (rwaReqDate >= startDate)
	 * @param endDate   종료일 (rwaReqDate <= endDate)
	 * @return 반품 지시 목록
	 */
	@GetMapping("/rwa_orders")
	@ApiDesc(description = "List RWA Orders")
	public List<RwaOrder> listRwaOrders(
			@RequestParam(name = "comCd", required = false) String comCd,
			@RequestParam(name = "status", required = false) String status,
			@RequestParam(name = "rwaType", required = false) String rwaType,
			@RequestParam(name = "startDate", required = false) String startDate,
			@RequestParam(name = "endDate", required = false) String endDate) {
		return this.rwaService.listRwaOrders(comCd, status, rwaType, startDate, endDate);
	}

	/**
	 * 반품 지시 상세 조회
	 *
	 * GET /rest/rwa_trx/rwa_orders/{id}
	 *
	 * @param id 반품 지시 ID
	 * @return 반품 지시
	 */
	@GetMapping("/rwa_orders/{id}")
	@ApiDesc(description = "Get RWA Order by ID")
	public RwaOrder getRwaOrder(@PathVariable("id") String id) {
		return this.queryManager.select(RwaOrder.class, id);
	}

	/**
	 * 반품 상세 목록 조회
	 *
	 * GET /rest/rwa_trx/rwa_orders/{id}/items
	 *
	 * @param id 반품 지시 ID
	 * @return 반품 상세 목록
	 */
	@GetMapping("/rwa_orders/{id}/items")
	@ApiDesc(description = "List RWA Order Items")
	public List<RwaOrderItem> listRwaOrderItems(@PathVariable("id") String id) {
		return this.rwaService.listRwaOrderItems(id);
	}

	/**
	 * 반품 검수 기록 조회
	 *
	 * GET /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/inspections
	 *
	 * @param id     반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId 반품 상세 ID
	 * @return 검수 기록 목록
	 */
	@GetMapping("/rwa_orders/{id}/items/{itemId}/inspections")
	@ApiDesc(description = "List RWA Inspections")
	public List<RwaInspection> listRwaInspections(
			@PathVariable("id") String id,
			@PathVariable("itemId") String itemId) {
		return this.rwaService.listRwaInspections(itemId);
	}

	/**
	 * 반품 처분 정보 조회
	 *
	 * GET /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/disposition
	 *
	 * @param id     반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId 반품 상세 ID
	 * @return 처분 기록 (1:1 관계)
	 */
	@GetMapping("/rwa_orders/{id}/items/{itemId}/disposition")
	@ApiDesc(description = "Get RWA Disposition")
	public RwaDisposition getRwaDisposition(
			@PathVariable("id") String id,
			@PathVariable("itemId") String itemId) {
		RwaDisposition condition = new RwaDisposition();
		condition.setDomainId(Domain.currentDomainId());
		condition.setRwaOrderItemId(itemId);
		return this.queryManager.selectByCondition(RwaDisposition.class, condition);
	}

	/********************************************************************************************************
	 * 7. 대시보드 통계 API
	 ********************************************************************************************************/

	/**
	 * 대시보드 - 상태별 건수 조회
	 *
	 * GET /rest/rwa_trx/dashboard/status-counts
	 *
	 * @param comCd      화주사 코드 (optional)
	 * @param whCd       창고 코드 (optional)
	 * @param targetDate 기준일 (optional, 기본값: 오늘)
	 * @return 상태별 건수 Map { status: count }
	 */
	@GetMapping("/dashboard/status-counts")
	@ApiDesc(description = "Get Dashboard Status Counts")
	public Map<String, Object> getDashboardStatusCounts(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd,
			@RequestParam(name = "target_date", required = false) String targetDate) {
		return this.rwaService.getDashboardStatusCounts(comCd, whCd, targetDate);
	}

	/**
	 * 대시보드 - 반품 유형별 통계 조회
	 *
	 * GET /rest/rwa_trx/dashboard/type-stats
	 *
	 * @param comCd     화주사 코드 (optional)
	 * @param whCd      창고 코드 (optional)
	 * @param startDate 시작일 (optional, 기본값: 오늘)
	 * @param endDate   종료일 (optional, 기본값: 오늘)
	 * @return 유형별 건수 Map { rwaType: count }
	 */
	@GetMapping("/dashboard/type-stats")
	@ApiDesc(description = "Get Dashboard Type Statistics")
	public Map<String, Object> getDashboardTypeStats(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd,
			@RequestParam(name = "start_date", required = false) String startDate,
			@RequestParam(name = "end_date", required = false) String endDate) {
		return this.rwaService.getDashboardTypeStats(comCd, whCd, startDate, endDate);
	}

	/**
	 * SKU 검색 (코드 또는 상품명 LIKE 검색)
	 *
	 * GET /rest/rwa_trx/sku/search?keyword=xxx&com_cd=xxx&page=1&limit=20
	 *
	 * @param keyword 검색어 (sku_cd 또는 sku_nm에 LIKE 검색)
	 * @param comCd   화주사 코드 (optional)
	 * @param page    페이지 번호 (기본값: 1)
	 * @param limit   페이지 크기 (기본값: 20)
	 * @return { items: [...], total: N }
	 */
	@GetMapping("/sku/search")
	@ApiDesc(description = "Search SKU by keyword (sku_cd or sku_nm LIKE)")
	public Map<String, Object> searchSku(
			@RequestParam(name = "keyword", required = false) String keyword,
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "page", defaultValue = "1") int page,
			@RequestParam(name = "limit", defaultValue = "20") int limit) {
		return this.rwaService.searchSku(keyword, comCd, page, limit);
	}

	/**
	 * 대시보드 - 알림 데이터 조회
	 *
	 * GET /rest/rwa_trx/dashboard/alerts
	 *
	 * @param comCd 화주사 코드 (optional)
	 * @param whCd  창고 코드 (optional)
	 * @return 알림 목록 List<Map<String, Object>>
	 */
	@GetMapping("/dashboard/alerts")
	@ApiDesc(description = "Get Dashboard Alerts")
	public List<Map<String, Object>> getDashboardAlerts(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd) {
		return this.rwaService.getDashboardAlerts(comCd, whCd);
	}

	/**
	 * 반품 모니터링 - 기간별 종합 집계 조회
	 *
	 * GET /rest/rwa_trx/dashboard/monitoring?start_date=&end_date=&com_cd=&wh_cd=
	 *
	 * @param comCd     화주사 코드 (optional)
	 * @param whCd      창고 코드 (optional)
	 * @param startDate 시작일 (optional, 기본값: 오늘)
	 * @param endDate   종료일 (optional, 기본값: 오늘)
	 * @return 종합 집계 Map
	 */
	@GetMapping("/dashboard/monitoring")
	@ApiDesc(description = "Get RWA Monitoring Aggregation")
	public Map<String, Object> getMonitoringData(
			@RequestParam(name = "com_cd", required = false) String comCd,
			@RequestParam(name = "wh_cd", required = false) String whCd,
			@RequestParam(name = "start_date", required = false) String startDate,
			@RequestParam(name = "end_date", required = false) String endDate) {
		return this.rwaService.getMonitoringData(comCd, whCd, startDate, endDate);
	}
}
