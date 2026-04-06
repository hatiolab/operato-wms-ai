package operato.wms.fulfillment.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.fulfillment.entity.PickingTask;
import operato.wms.fulfillment.service.FulfillmentPackingService;
import operato.wms.fulfillment.service.FulfillmentPickingService;
import operato.wms.fulfillment.service.FulfillmentShippingService;
import operato.wms.fulfillment.service.FulfillmentTrackingService;
import operato.wms.fulfillment.service.FulfillmentTransactionService;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.util.ValueUtil;

/**
 * 풀필먼트 트랜잭션 컨트롤러
 *
 * 피킹/포장/출하 트랜잭션 API를 제공한다.
 * Base URL: /rest/ful_trx
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/ful_trx")
@ServiceDesc(description = "Fulfillment Transaction Service API")
public class FulfillmentTransactionController {
	/**
	 * Fulfillment Transaction Service
	 */
	@Autowired
	private FulfillmentTransactionService fulTrxService;
	/**
	 * Fulfillment Picking Service
	 */
	@Autowired
	private FulfillmentPickingService pickingService;
	/**
	 * Fulfillment Packing Service
	 */
	@Autowired
	private FulfillmentPackingService packingService;
	/**
	 * Fulfillment Shipping Service
	 */
	@Autowired
	private FulfillmentShippingService shippingService;
	/**
	 * Fulfillment Tracking Service
	 */
	@Autowired
	private FulfillmentTrackingService trackingService;

	// ==================== 9.1 피킹 트랜잭션 API ====================

	/**
	 * 작업할 피킹 지시 목록 조회
	 * GET /rest/ful_trx/picking_tasks/todo
	 */
	@GetMapping(value = "picking_tasks/todo", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search todo picking tasks")
	@SuppressWarnings("rawtypes")
	public List<Map> searchPickingTasks() {
		return this.pickingService.searchTodoPickingTasks();
	}

	/**
	 * 작업 완료된 피킹 지시 목록 조회
	 * GET /rest/ful_trx/picking_tasks/done
	 */
	@GetMapping(value = "picking_tasks/done", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search done picking tasks")
	@SuppressWarnings("rawtypes")
	public List<Map> searchDonePickingTasks() {
		return this.pickingService.searchDonePickingTasks();
	}

	/**
	 * 피킹 지시 상세 조회
	 * GET /rest/ful_trx/picking_tasks/{id}
	 */
	@GetMapping(value = "picking_tasks/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get picking task detail")
	public Map<String, Object> getPickingTask(@PathVariable("id") String id) {
		return this.pickingService.getPickingTask(id);
	}

	/**
	 * 피킹 지시 생성 (OMS 웨이브 인계)
	 * POST /rest/ful_trx/picking_tasks/create
	 */
	@PostMapping(value = "picking_tasks/create", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create picking tasks from OMS wave release")
	public Map<String, Object> createPickingTasks(@RequestBody Map<String, Object> params) {
		return this.fulTrxService.createPickingTasks(params);
	}

	/**
	 * 피킹 시작 (CREATED → IN_PROGRESS)
	 * POST /rest/ful_trx/picking_tasks/{id}/start
	 */
	@PostMapping(value = "picking_tasks/{id}/start", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Start picking task")
	public Map<String, Object> startPickingTask(@PathVariable("id") String id) {
		return this.pickingService.startPickingTask(id);
	}

	/**
	 * 개별 아이템 피킹 확인 (스캔)
	 * POST /rest/ful_trx/picking_tasks/{id}/items/{item_id}/pick
	 */
	@PostMapping(value = "picking_tasks/{id}/items/{item_id}/pick", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm individual item pick (scan)")
	public Map<String, Object> pickItem(
			@PathVariable("id") String id,
			@PathVariable("item_id") String itemId,
			@RequestBody Map<String, Object> params) {
		return this.pickingService.pickItem(itemId, params);
	}

	/**
	 * 피킹 부족 처리
	 * POST /rest/ful_trx/picking_tasks/{id}/items/{item_id}/short
	 */
	@PostMapping(value = "picking_tasks/{id}/items/{item_id}/short", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Report short pick for item")
	public Map<String, Object> shortItem(
			@PathVariable("id") String id,
			@PathVariable("item_id") String itemId,
			@RequestBody Map<String, Object> params) {
		return this.pickingService.shortItem(itemId, params);
	}

	/**
	 * 피킹 완료 (IN_PROGRESS → COMPLETED) + 포장 지시 자동 생성
	 * POST /rest/ful_trx/picking_tasks/{id}/complete
	 *
	 * 피킹 완료 후 웨이브의 insp_flag가 true이면 포장 지시를 자동 생성한다.
	 */
	@PostMapping(value = "picking_tasks/{id}/complete", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Complete picking task and auto-create packing orders if insp_flag is true")
	public Map<String, Object> completePickingTask(@PathVariable("id") String id) {
		return this.fulTrxService.completePickingTaskWithPacking(id);
	}

	/**
	 * 피킹 취소 (CREATED/IN_PROGRESS → CANCELLED / COMPLETED → CREATED) (N건)
	 * POST /rest/ful_trx/picking_tasks/cancel
	 */
	@PostMapping(value = "picking_tasks/cancel", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel picking task list (supports both in-progress and completed cancellation)")
	public Map<String, Object> cancelPickingTaskList(@RequestBody List<PickingTask> list) {
		if (ValueUtil.isEmpty(list)) {
			throw new ElidomValidationException("피킹 지시 목록이 없습니다");
		}

		for (PickingTask task : list) {
			this.fulTrxService.cancelCompletedPickingTask(task.getId());
		}

		return ValueUtil.newMap("success", true);
	}

	/**
	 * 피킹 취소 (CREATED/IN_PROGRESS → CANCELLED / COMPLETED → CREATED)
	 * POST /rest/ful_trx/picking_tasks/{id}/cancel
	 *
	 * CREATED/IN_PROGRESS: 즉시 취소
	 * COMPLETED: 웨이브 미완료 + 포장 미처리 조건 확인 후 취소 (포장 지시 삭제, 주문 상태 원복 포함)
	 */
	@PostMapping(value = "picking_tasks/{id}/cancel", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel picking task (supports both in-progress and completed cancellation)")
	public Map<String, Object> cancelPickingTask(@PathVariable("id") String id) {
		Map<String, Object> taskInfo = this.pickingService.getPickingTask(id);
		String status = taskInfo.get("status") != null ? taskInfo.get("status").toString() : "";

		if ("COMPLETED".equals(status)) {
			return this.fulTrxService.cancelCompletedPickingTask(id);
		} else {
			return this.pickingService.cancelPickingTask(id);
		}
	}

	/**
	 * 피킹 시작+완료 일괄 (간소화 프로세스, CREATED → COMPLETED)
	 * POST /rest/ful_trx/picking_tasks/{id}/start_and_complete
	 *
	 * 피킹 완료 후 웨이브의 insp_flag가 true이면 포장 지시를 자동 생성한다.
	 */
	@PostMapping(value = "picking_tasks/{id}/start_and_complete", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Start and complete picking task at once")
	public Map<String, Object> startAndCompletePickingTask(@PathVariable("id") String id) {
		this.pickingService.startPickingTask(id);
		return this.fulTrxService.completePickingTaskWithPacking(id);
	}

	/**
	 * 피킹 항목 목록 조회
	 * GET /rest/ful_trx/picking_tasks/{id}/items
	 */
	@GetMapping(value = "picking_tasks/{id}/items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get picking task items")
	@SuppressWarnings("rawtypes")
	public List<Map> getPickingTaskItems(@PathVariable("id") String id) {
		return this.pickingService.getPickingTaskItems(id);
	}

	/**
	 * 작업자별 할당 목록 조회
	 * GET /rest/ful_trx/picking_tasks/worker/{worker_cd}
	 */
	@GetMapping(value = "picking_tasks/worker/{worker_cd}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get picking tasks assigned to worker")
	@SuppressWarnings("rawtypes")
	public List<Map> getWorkerTasks(@PathVariable("worker_cd") String workerCd) {
		return this.pickingService.getWorkerTasks(workerCd);
	}

	// ==================== 9.2 검수/포장 트랜잭션 API ====================

	/**
	 * 포장 주문 목록 조회 (상태/날짜 필터)
	 * GET /rest/ful_trx/packing_orders?status=INSPECTED&order_date=2024-01-01
	 */
	@GetMapping(value = "packing_orders", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search packing orders by status and order date")
	@SuppressWarnings("rawtypes")
	public List<Map> searchPackingOrders(
			@org.springframework.web.bind.annotation.RequestParam(name = "status", required = false) String status,
			@org.springframework.web.bind.annotation.RequestParam(name = "order_date", required = false) String orderDate) {
		return this.packingService.searchPackingOrders(status, orderDate);
	}

	/**
	 * 대기중인 포장 주문 목록 조회 (상태/날짜 필터)
	 * GET /rest/ful_trx/packing_orders/todo?order_date=2024-01-01
	 */
	@GetMapping(value = "packing_orders/todo", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search todo packing orders by status and order date")
	@SuppressWarnings("rawtypes")
	public List<Map> searchTodoPackingOrders(
			@org.springframework.web.bind.annotation.RequestParam(name = "order_date", required = false) String orderDate) {
		return this.packingService.searchTodoPackingOrders(orderDate);
	}

	/**
	 * 완료된 포장 주문 목록 조회 (상태/날짜 필터)
	 * GET /rest/ful_trx/packing_orders/done?order_date=2024-01-01
	 */
	@GetMapping(value = "packing_orders/done", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search done packing orders by status and order date")
	@SuppressWarnings("rawtypes")
	public List<Map> searchDonePackingOrders(
			@org.springframework.web.bind.annotation.RequestParam(name = "order_date", required = false) String orderDate) {
		return this.packingService.searchDonePackingOrders(orderDate);
	}

	/**
	 * 포장 아이템 조회 (packing_order_id로 필터)
	 * GET /rest/ful_trx/packing_order_items?packing_order_id={id}
	 */
	@GetMapping(value = "packing_order_items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get packing order items by packing_order_id")
	@SuppressWarnings("rawtypes")
	public List<Map> getPackingOrderItemsByOrderId(
			@org.springframework.web.bind.annotation.RequestParam("packing_order_id") String packingOrderId) {
		return this.packingService.getPackingOrderItemsByOrderId(packingOrderId);
	}

	/**
	 * 포장 지시 생성 (개별 피킹 완료 후, 1건)
	 * POST /rest/ful_trx/packing_orders/create
	 */
	@PostMapping(value = "packing_orders/create", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create packing order from individual picking task")
	public Map<String, Object> createPackingOrder(@RequestBody Map<String, Object> params) {
		String pickTaskId = (String) params.get("pick_task_id");
		return this.fulTrxService.createPackingOrders(pickTaskId);
	}

	/**
	 * 토탈 피킹 후 주문별 포장 지시 일괄 생성 (N건)
	 * POST /rest/ful_trx/packing_orders/create_from_batch
	 */
	@PostMapping(value = "packing_orders/create_from_batch", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create packing orders from batch picking task")
	public Map<String, Object> createPackingOrdersFromBatch(@RequestBody Map<String, Object> params) {
		String pickTaskId = (String) params.get("pick_task_id");
		return this.fulTrxService.createPackingOrdersFromBatch(pickTaskId);
	}

	/**
	 * 검수/포장 시작 (CREATED → IN_PROGRESS)
	 * POST /rest/ful_trx/packing_orders/{id}/start
	 */
	@PostMapping(value = "packing_orders/{id}/start", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Start packing order")
	public Map<String, Object> startPackingOrder(@PathVariable("id") String id) {
		return this.packingService.startPackingOrder(id);
	}

	/**
	 * 아이템 검수 (수량 대조)
	 * POST /rest/ful_trx/packing_orders/{id}/items/{item_id}/inspect
	 */
	@PostMapping(value = "packing_orders/{id}/items/{item_id}/inspect", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Inspect packing order item")
	public Map<String, Object> inspectItem(
			@PathVariable("id") String id,
			@PathVariable("item_id") String itemId,
			@RequestBody Map<String, Object> params) {
		return this.packingService.inspectItem(itemId, params);
	}

	/**
	 * 아이템 검수 완료 (finish)
	 * POST /rest/ful_trx/packing_order_items/{id}/finish
	 */
	@PostMapping(value = "packing_order_items/{id}/finish", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Finish packing order item inspection")
	public Map<String, Object> finishPackingItem(
			@PathVariable("id") String itemId,
			@RequestBody Map<String, Object> params) {
		return this.packingService.finishPackingItem(itemId, params);
	}

	/**
	 * 아이템 포장 (박스 투입)
	 * POST /rest/ful_trx/packing_orders/{id}/items/{item_id}/pack
	 */
	@PostMapping(value = "packing_orders/{id}/items/{item_id}/pack", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Pack item into box")
	public Map<String, Object> packItem(
			@PathVariable("id") String id,
			@PathVariable("item_id") String itemId,
			@RequestBody Map<String, Object> params) {
		return this.packingService.packItem(itemId, params);
	}

	/**
	 * 박스 생성 (OPEN)
	 * POST /rest/ful_trx/packing_orders/{id}/boxes/create
	 */
	@PostMapping(value = "packing_orders/{id}/boxes/create", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create new packing box")
	public Map<String, Object> createBox(@PathVariable("id") String packingOrderId) {
		return this.packingService.createBox(packingOrderId);
	}

	/**
	 * 박스 닫기 (OPEN → CLOSED)
	 * POST /rest/ful_trx/packing_orders/{id}/boxes/{box_id}/close
	 */
	@PostMapping(value = "packing_orders/{id}/boxes/{box_id}/close", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Close packing box")
	public Map<String, Object> closeBox(
			@PathVariable("id") String packingOrderId,
			@PathVariable("box_id") String boxId) {
		return this.packingService.closeBox(boxId);
	}

	/**
	 * 포장 완료 (IN_PROGRESS → COMPLETED)
	 * POST /rest/ful_trx/packing_orders/{id}/complete
	 */
	@PostMapping(value = "packing_orders/{id}/complete", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Complete packing order")
	public Map<String, Object> completePackingOrder(@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {
		return this.packingService.completePackingOrder(id, params);
	}

	/**
	 * 포장 취소 (→ CANCELLED, SHIPPED 제외)
	 * POST /rest/ful_trx/packing_orders/{id}/cancel
	 */
	@PostMapping(value = "packing_orders/{id}/cancel", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel packing order")
	public Map<String, Object> cancelPackingOrder(@PathVariable("id") String id) {
		return this.packingService.cancelPackingOrder(id);
	}

	/**
	 * 포장 항목 목록 조회
	 * GET /rest/ful_trx/packing_orders/{id}/items
	 */
	@GetMapping(value = "packing_orders/{id}/items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get packing order items")
	@SuppressWarnings("rawtypes")
	public List<Map> getPackingOrderItems(@PathVariable("id") String id) {
		return this.packingService.getPackingOrderItems(id);
	}

	/**
	 * 포장 박스 목록 조회
	 * GET /rest/ful_trx/packing_orders/{id}/boxes
	 */
	@GetMapping(value = "packing_orders/{id}/boxes", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get packing boxes")
	@SuppressWarnings("rawtypes")
	public List<Map> getPackingBoxes(@PathVariable("id") String id) {
		return this.packingService.getPackingBoxes(id);
	}

	// ==================== 9.3 출하 트랜잭션 API ====================

	/**
	 * 운송장 라벨 출력 (COMPLETED → LABEL_PRINTED)
	 * POST /rest/ful_trx/packing_orders/{id}/print_label
	 */
	@PostMapping(value = "packing_orders/{id}/print_label", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Print shipping label")
	public Map<String, Object> printLabel(@PathVariable("id") String id) {
		return this.shippingService.printLabel(id);
	}

	/**
	 * 적하 목록 전송 (LABEL_PRINTED → MANIFESTED)
	 * POST /rest/ful_trx/packing_orders/{id}/manifest
	 */
	@PostMapping(value = "packing_orders/{id}/manifest", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create manifest")
	public Map<String, Object> createManifest(@PathVariable("id") String id) {
		return this.shippingService.createManifest(id);
	}

	/**
	 * 출하 확정 (→ SHIPPED)
	 * POST /rest/ful_trx/packing_orders/{id}/confirm_shipping
	 */
	@PostMapping(value = "packing_orders/{id}/confirm_shipping", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm shipping")
	public Map<String, Object> confirmShipping(@PathVariable("id") String id) {
		return this.shippingService.confirmShipping(id);
	}

	/**
	 * 복수 출하 일괄 확정
	 * POST /rest/ful_trx/packing_orders/confirm_shipping_batch
	 */
	@PostMapping(value = "packing_orders/confirm_shipping_batch", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Batch confirm shipping")
	@SuppressWarnings("unchecked")
	public Map<String, Object> confirmShippingBatch(@RequestBody Map<String, Object> params) {
		List<String> ids = (List<String>) params.get("ids");
		return this.shippingService.confirmShippingBatch(ids);
	}

	/**
	 * 출하 취소 (SHIPPED → CANCELLED, 재고 복원)
	 * POST /rest/ful_trx/packing_orders/{id}/cancel_shipping
	 */
	@PostMapping(value = "packing_orders/{id}/cancel_shipping", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel shipping (with inventory restoration)")
	public Map<String, Object> cancelShipping(@PathVariable("id") String id) {
		return this.shippingService.cancelShipping(id);
	}

	/**
	 * 박스별 송장 번호 업데이트
	 * POST /rest/ful_trx/packing_boxes/{id}/update_invoice
	 */
	@PostMapping(value = "packing_boxes/{id}/update_invoice", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update box invoice number")
	public Map<String, Object> updateBoxInvoice(
			@PathVariable("id") String boxId,
			@RequestBody Map<String, Object> params) {
		String invoiceNo = (String) params.get("invoice_no");
		return this.shippingService.updateBoxInvoice(boxId, invoiceNo);
	}

	// ==================== 9.4 PDA 출하 확정 API ====================

	/**
	 * 도크 배정 — 미배정 포장 지시에 선택한 도크 일괄 배정
	 * POST /rest/ful_trx/shipping/assign_dock
	 */
	@PostMapping(value = "shipping/assign_dock", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Assign dock to unassigned packing orders")
	public Map<String, Object> assignDock(@RequestBody Map<String, Object> params) {
		String dockCd = (String) params.get("dock_cd");
		return this.shippingService.assignDock(dockCd);
	}

	/**
	 * 도크 목록 조회 (공통코드 DOCK_CODE + 대기 건수)
	 * GET /rest/ful_trx/shipping/dock_list
	 */
	@GetMapping(value = "shipping/dock_list", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get dock list with waiting count")
	@SuppressWarnings("rawtypes")
	public List<Map> getDockList() {
		return this.shippingService.getDockList();
	}

	/**
	 * 도크별 출하 대기 목록 조회
	 * GET /rest/ful_trx/shipping/waiting_list?dock_cd={dockCd}
	 */
	@GetMapping(value = "shipping/waiting_list", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get shipping waiting list by dock")
	public Map<String, Object> getWaitingList(
			@org.springframework.web.bind.annotation.RequestParam(name = "dock_cd") String dockCd) {
		return this.shippingService.getWaitingList(dockCd);
	}

	/**
	 * 송장번호로 출하 확정 (PDA 스캔)
	 * POST /rest/ful_trx/shipping/confirm_by_invoice
	 */
	@PostMapping(value = "shipping/confirm_by_invoice", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm shipping by invoice scan")
	public Map<String, Object> confirmShippingByInvoice(@RequestBody Map<String, Object> params) {
		String dockCd = (String) params.get("dock_cd");
		String invoiceNo = (String) params.get("invoice_no");
		return this.shippingService.confirmShippingByInvoice(dockCd, invoiceNo);
	}

	// ==================== 9.5 출고 추적 API ====================

	/**
	 * 출고 추적 조회
	 * GET /rest/ful_trx/tracking?keyword={keyword}&type={type}
	 *
	 * 송장번호/출고번호/포장번호/피킹번호/웨이브번호/원주문번호 중 하나를 입력하면
	 * 주문 → 웨이브 → 피킹 → 포장 → 박스/출하 전체 이력을 조회한다.
	 */
	@GetMapping(value = "tracking", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Track shipment by keyword")
	public Map<String, Object> trackShipment(
			@org.springframework.web.bind.annotation.RequestParam(name = "keyword", required = false) String keyword,
			@org.springframework.web.bind.annotation.RequestParam(name = "type", required = false, defaultValue = "auto") String type) {
		return this.trackingService.trackByKeyword(keyword, type);
	}
}
