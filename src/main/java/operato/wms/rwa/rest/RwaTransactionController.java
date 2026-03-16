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
 * 1. POST /rwa_orders - 반품 지시 생성
 * 2. POST /rwa_orders/{id}/approve - 반품 승인
 * 3. POST /rwa_orders/{id}/items/{itemId}/receive - 반품 입고
 * 4. POST /rwa_orders/{id}/items/{itemId}/inspect - 반품 검수
 * 5. POST /rwa_orders/{id}/items/{itemId}/dispose - 반품 처분
 * 6. POST /rwa_orders/{id}/complete - 반품 완료
 * 7. POST /rwa_orders/{id}/close - 반품 마감
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
	 * @param id 반품 지시 ID
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
	 * @param id 반품 지시 ID
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
	 * @param id 반품 지시 ID (미사용, URL 일관성 유지)
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
	 * @param id 반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId 반품 상세 ID
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
	 * @param id 반품 지시 ID (미사용, URL 일관성 유지)
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

	/********************************************************************************************************
	 * 4. 반품 처분
	 ********************************************************************************************************/

	/**
	 * 반품 처분 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/items/{itemId}/dispose
	 *
	 * @param id 반품 지시 ID (미사용, URL 일관성 유지)
	 * @param itemId 반품 상세 ID
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

	/********************************************************************************************************
	 * 5. 반품 완료 및 마감
	 ********************************************************************************************************/

	/**
	 * 반품 지시 완료 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/complete
	 *
	 * @param id 반품 지시 ID
	 * @return 완료된 반품 지시
	 */
	@PostMapping("/rwa_orders/{id}/complete")
	@ApiDesc(description = "Complete RWA Order")
	public RwaOrder completeRwaOrder(@PathVariable("id") String id) {
		return this.rwaService.completeRwaOrder(id);
	}

	/**
	 * 반품 지시 마감 처리
	 *
	 * POST /rest/rwa_trx/rwa_orders/{id}/close")
	 *
	 * @param id 반품 지시 ID
	 * @return 마감된 반품 지시
	 */
	@PostMapping("/rwa_orders/{id}/close")
	@ApiDesc(description = "Close RWA Order")
	public RwaOrder closeRwaOrder(@PathVariable("id") String id) {
		return this.rwaService.closeRwaOrder(id);
	}

	/********************************************************************************************************
	 * 6. 조회 API
	 ********************************************************************************************************/

	/**
	 * 반품 지시 목록 조회
	 *
	 * GET /rest/rwa_trx/rwa_orders
	 *
	 * @param comCd 화주사 코드
	 * @param status 상태
	 * @param rwaType 반품 유형
	 * @param startDate 시작일 (rwaReqDate >= startDate)
	 * @param endDate 종료일 (rwaReqDate <= endDate)
	 * @return 반품 지시 목록
	 */
	@GetMapping("/rwa_orders")
	@ApiDesc(description = "List RWA Orders")
	public List<RwaOrder> listRwaOrders(
			@RequestParam(required = false) String comCd,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String rwaType,
			@RequestParam(required = false) String startDate,
			@RequestParam(required = false) String endDate) {
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
	 * @param id 반품 지시 ID (미사용, URL 일관성 유지)
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
	 * @param id 반품 지시 ID (미사용, URL 일관성 유지)
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
}
