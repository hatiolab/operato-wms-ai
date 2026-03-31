package operato.wms.oms.rest;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.service.OmsTransactionService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.sys.util.ValueUtil;

/**
 * OMS 트랜잭션 컨트롤러
 *
 * 출하 주문 임포트(검증/확정) 등 트랜잭션 API를 제공한다.
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/oms_trx")
@ServiceDesc(description = "OMS Transaction Service API")
public class OmsTransactionController extends AbstractRestService {

	@Autowired
	private OmsTransactionService omsTrxService;

	@Override
	protected Class<?> entityClass() {
		return ShipmentOrder.class;
	}

	/**
	 * B2C 출하 주문 엑셀 임포트 (업로드 + 검증)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/excel/b2c
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 검증 결과 { total, valid, error, rows }
	 */
	@RequestMapping(value = "shipment_orders/import/excel/b2c", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2C shipment orders from Excel (validate)")
	public Map<String, Object> importB2cExcel(@RequestBody List<ImportShipmentOrder> list) {
		return this.omsTrxService.validateImportData(list, "B2C_OUT");
	}

	/**
	 * B2B 출하 주문 엑셀 임포트 (업로드 + 검증)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/excel/b2b
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 검증 결과 { total, valid, error, rows }
	 */
	@RequestMapping(value = "shipment_orders/import/excel/b2b", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2B shipment orders from Excel (validate)")
	public Map<String, Object> importB2bExcel(@RequestBody List<ImportShipmentOrder> list) {
		return this.omsTrxService.validateImportData(list, "B2B_OUT");
	}

	/**
	 * 출하 주문 임포트 확정 (검증 완료 후 실제 등록)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/confirm
	 *
	 * @param list 검증 완료된 임포트 데이터 (오류 행 제외)
	 * @return 처리 결과 { totalRows, orderCount, itemCount, deliveryCount }
	 */
	@RequestMapping(value = "shipment_orders/import/confirm", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm and process shipment order import")
	public Map<String, Object> importConfirm(@RequestBody List<ImportShipmentOrder> list) {
		return this.omsTrxService.importShipmentOrders(list);
	}

	/**
	 * 자동 웨이브 생성
	 *
	 * POST /rest/oms_trx/waves/create
	 *
	 * @param params { groupBy, pickType, pickMethod, maxOrderCount, orderDate }
	 * @return 처리 결과 { waveCount, totalOrders, waves }
	 */
	@RequestMapping(value = "waves/create", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create waves automatically from allocated orders")
	public Map<String, Object> createAutoWaves(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.createAutoWaves(params);
	}

	/**
	 * 웨이브 생성 (할당 완료된 주문 리스트) - 피킹 방법, 피킹 유형 등에 대한 설정은 웨이브 시작 시에 ...
	 *
	 * POST /rest/oms_trx/waves/create_wave
	 *
	 * @param params [{ id: 'id1', ... }, {id : 'id2', ...}, ...]
	 * @return { wave_no, wave_seq, order_count, sku_count, total_qty,
	 *         skipped_count, errors }
	 */
	@RequestMapping(value = "waves/create_wave", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create waves from selected allocated orders, other settings later...")
	public Map<String, Object> createWave(@RequestBody List<ShipmentOrder> list) {
		return this.omsTrxService.createWave(list, null, null);
	}

	/**
	 * 수동 웨이브 생성 (주문 직접 선택)
	 *
	 * POST /rest/oms_trx/waves/create_manual
	 *
	 * @param params { orders: [{ id, ... }], pick_type, pick_method }
	 * @return { wave_no, wave_seq, order_count, sku_count, total_qty,
	 *         skipped_count, errors }
	 */
	@RequestMapping(value = "waves/create_manual", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create wave manually from selected orders")
	public Map<String, Object> createManualWave(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.createManualWave(params);
	}

	/**
	 * 자동 웨이브 대상 건수 조회
	 *
	 * GET /rest/oms_trx/waves/preview
	 *
	 * @param orderDate 주문일자 (optional, default: today)
	 * @return { totalOrders }
	 */
	@RequestMapping(value = "waves/preview", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Preview auto wave target order count")
	public Map<String, Object> previewAutoWaveTargets(
			@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.omsTrxService.previewAutoWaveTargets(orderDate);
	}

	/*
	 * ============================================================
	 * 출하 주문 상태 변경 API
	 * ============================================================
	 */

	/**
	 * 출하 주문 확정 + 재고 할당 (단건)
	 *
	 * POST /rest/oms_trx/shipment_orders/{id}/confirm_and_allocate
	 *
	 * REGISTERED → CONFIRMED → ALLOCATED (또는 BACK_ORDER)를 한 번에 수행한다.
	 *
	 * @param id 주문 ID
	 * @return { success, status, allocated_qty, back_order }
	 */
	@RequestMapping(value = "shipment_orders/{id}/confirm_and_allocate", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm and allocate shipment order (REGISTERED → CONFIRMED → ALLOCATED)")
	public Map<String, Object> confirmAndAllocateOrder(@PathVariable("id") String id) {
		return this.omsTrxService.confirmAndAllocateShipmentOrder(id);
	}

	/**
	 * 출하 주문 확정
	 *
	 * POST /rest/oms_trx/shipment_orders/confirm
	 *
	 * @param params { ids: ["id1", "id2", ...] }
	 * @return { success_count, fail_count, errors }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "shipment_orders/confirm", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm shipment orders (REGISTERED → CONFIRMED)")
	public Map<String, Object> confirmOrders(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.confirmShipmentOrders((List<String>) params.get("ids"));
	}

	/**
	 * 출하 주문 확정 (Multiple)
	 *
	 * POST /rest/oms_trx/shipment_orders/confirm_list
	 *
	 * @param params [{ id: "id1" }, { id: "id2" }, ...]
	 * @return { success_count, fail_count, errors }
	 */
	@RequestMapping(value = "shipment_orders/confirm_list", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm shipment orders (REGISTERED → CONFIRMED)")
	public Map<String, Object> confirmOrderList(@RequestBody List<ShipmentOrder> list) {
		List<String> ids = list.stream().map(ShipmentOrder::getId).collect(Collectors.toList());
		return this.omsTrxService.confirmShipmentOrders(ids);
	}

	/**
	 * 출하 주문 재고 할당
	 *
	 * POST /rest/oms_trx/shipment_orders/allocate
	 *
	 * @param params { ids: ["id1", "id2", ...] }
	 * @return { success_count, allocated_count, back_order_count }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "shipment_orders/allocate", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Allocate inventory for shipment orders (CONFIRMED → ALLOCATED)")
	public Map<String, Object> allocateOrders(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.allocateShipmentOrders((List<String>) params.get("ids"));
	}

	/**
	 * 출하 주문 재고 할당 (Multiple)
	 *
	 * POST /rest/oms_trx/shipment_orders/allocate_list
	 *
	 * @param params [{ id: "id1" }, { id: "id2" }, ...]
	 * @return { success_count, allocated_count, back_order_count }
	 */
	@RequestMapping(value = "shipment_orders/allocate_list", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Allocate inventory for shipment orders (CONFIRMED → ALLOCATED)")
	public Map<String, Object> allocateOrders(@RequestBody List<ShipmentOrder> list) {
		List<String> ids = list.stream().map(ShipmentOrder::getId).collect(Collectors.toList());
		return this.omsTrxService.allocateShipmentOrders(ids);
	}

	/**
	 * 출하 주문 할당 해제
	 *
	 * POST /rest/oms_trx/shipment_orders/deallocate
	 *
	 * @param params { id: "order_id" }
	 * @return { success, released_count }
	 */
	@RequestMapping(value = "shipment_orders/deallocate", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Deallocate inventory from shipment order (ALLOCATED → CONFIRMED)")
	public Map<String, Object> deallocateOrder(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.deallocateShipmentOrder((String) params.get("id"));
	}

	/**
	 * 출하 주문 재고 할당 (Multiple)
	 *
	 * POST /rest/oms_trx/shipment_orders/deallocate_list
	 *
	 * @param params [{ id: "id1" }, { id: "id2" }, ...]
	 * @return { success_count, allocated_count, back_order_count }
	 */
	@RequestMapping(value = "shipment_orders/deallocate_list", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Deallocate inventory from shipment order (ALLOCATED → CONFIRMED)")
	public Map<String, Object> deallocateOrderList(@RequestBody List<ShipmentOrder> list) {
		List<String> ids = list.stream().map(ShipmentOrder::getId).collect(Collectors.toList());
		Map<String, Object> result = ValueUtil.newMap("success,released_count", true, 0);
		for (String id : ids) {
			Map<String, Object> itemResult = this.omsTrxService.deallocateShipmentOrder(id);
			if ((Boolean) itemResult.get("success")) {
				result.put("released_count",
						(Integer) result.get("released_count") + (Integer) itemResult.get("released_count"));
			} else {
				result.put("success", false);
			}
		}

		return result;
	}

	/**
	 * 출하 주문 취소
	 *
	 * POST /rest/oms_trx/shipment_orders/cancel
	 *
	 * @param params { ids: ["id1", "id2", ...] }
	 * @return { success_count, fail_count }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "shipment_orders/cancel", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel shipment orders")
	public Map<String, Object> cancelOrders(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.cancelShipmentOrders((List<String>) params.get("ids"));
	}

	/**
	 * 출하 주문 취소 (Multiple)
	 *
	 * POST /rest/oms_trx/shipment_orders/cancel_list
	 *
	 * @param params [{ id: "id1" }, { id: "id2" }, ...]
	 * @return { success_count, fail_count }
	 */
	@RequestMapping(value = "shipment_orders/cancel_list", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel shipment orders")
	public Map<String, Object> cancelOrdersList(@RequestBody List<ShipmentOrder> list) {
		List<String> ids = list.stream().map(ShipmentOrder::getId).collect(Collectors.toList());
		return this.omsTrxService.cancelShipmentOrders(ids);
	}

	/**
	 * 출하 주문 마감
	 *
	 * POST /rest/oms_trx/shipment_orders/{id}/close
	 *
	 * @param id 주문 ID
	 * @return { success }
	 */
	@RequestMapping(value = "shipment_orders/{id}/close", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Close shipment order (SHIPPED → CLOSED)")
	public Map<String, Object> closeOrder(@PathVariable("id") String id) {
		return this.omsTrxService.closeShipmentOrder(id);
	}

	/**
	 * 출하 주문 마감 (Multiple)
	 *
	 * POST /rest/oms_trx/shipment_orders/close_list
	 *
	 * @param params [{ id: "id1" }, { id: "id2" }, ...]
	 * @return { success }
	 */
	@RequestMapping(value = "shipment_orders/close_list", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Close shipment order (SHIPPED → CLOSED)")
	public Map<String, Object> closeOrderList(@RequestBody List<ShipmentOrder> list) {
		List<String> ids = list.stream().map(ShipmentOrder::getId).collect(Collectors.toList());
		for (String id : ids) {
			this.omsTrxService.closeShipmentOrder(id);
		}

		return ValueUtil.newMap("success", true);
	}

	/*
	 * ============================================================
	 * 웨이브 상세 조회 API
	 * ============================================================
	 */

	/**
	 * 웨이브 포함 주문 목록 조회
	 *
	 * GET /rest/oms_trx/waves/{id}/orders
	 *
	 * @param id 웨이브 ID
	 * @return 주문 목록
	 */
	@RequestMapping(value = "waves/{id}/orders", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get orders in wave")
	public List<Map> getWaveOrders(@PathVariable("id") String id) {
		return this.omsTrxService.getWaveOrders(id);
	}

	/**
	 * 웨이브 SKU 합산 요약 조회
	 *
	 * GET /rest/oms_trx/waves/{id}/summary
	 *
	 * @param id 웨이브 ID
	 * @return SKU 합산 목록
	 */
	@RequestMapping(value = "waves/{id}/summary", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Get wave SKU summary")
	public List<Map> getWaveSummary(@PathVariable("id") String id) {
		return this.omsTrxService.getWaveSummary(id);
	}

	/**
	 * 웨이브에 주문 추가
	 *
	 * POST /rest/oms_trx/waves/{id}/add_orders
	 *
	 * @param id     웨이브 ID
	 * @param params { ids: ["orderId1", "orderId2", ...] }
	 * @return { addedCount, waveNo }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "waves/{id}/add_orders", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Add orders to wave")
	public Map<String, Object> addOrdersToWave(@PathVariable("id") String id, @RequestBody Map<String, Object> params) {
		return this.omsTrxService.addOrdersToWave(id, (List<String>) params.get("ids"));
	}

	/**
	 * 웨이브에서 주문 제거
	 *
	 * POST /rest/oms_trx/waves/{id}/remove_orders
	 *
	 * @param id     웨이브 ID
	 * @param params { ids: ["orderId1", "orderId2", ...] }
	 * @return { removedCount, waveNo }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "waves/{id}/remove_orders", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Remove orders from wave")
	public Map<String, Object> removeOrdersFromWave(@PathVariable("id") String id,
			@RequestBody Map<String, Object> params) {
		return this.omsTrxService.removeOrdersFromWave(id, (List<String>) params.get("ids"));
	}

	/*
	 * ============================================================
	 * 웨이브 상태 변경 API
	 * ============================================================
	 */

	/**
	 * 웨이브 확정 (릴리스)
	 *
	 * POST /rest/oms_trx/waves/{id}/release
	 *
	 * @param id 웨이브 ID
	 * @return { success, orderCount }
	 */
	@RequestMapping(value = "waves/{id}/release", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Release wave (CREATED → RELEASED)")
	public Map<String, Object> releaseWave(@PathVariable("id") String id) {
		return this.omsTrxService.releaseWave(id);
	}

	/**
	 * 웨이브 취소
	 *
	 * POST /rest/oms_trx/waves/{id}/cancel
	 *
	 * @param id 웨이브 ID
	 * @return { success, restoredOrderCount }
	 */
	@RequestMapping(value = "waves/{id}/cancel", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel wave (CREATED → CANCELLED)")
	public Map<String, Object> cancelWave(@PathVariable("id") String id) {
		return this.omsTrxService.cancelWave(id);
	}

	/*
	 * ============================================================
	 * 보충 지시 트랜잭션 API
	 * ============================================================
	 */

	/**
	 * 보충 지시 시작
	 *
	 * POST /rest/oms_trx/replenish_orders/{id}/start
	 *
	 * @param id 보충 지시 ID
	 * @return { success }
	 */
	@RequestMapping(value = "replenish_orders/{id}/start", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Start replenish order (CREATED → IN_PROGRESS)")
	public Map<String, Object> startReplenishOrder(@PathVariable("id") String id) {
		return this.omsTrxService.startReplenishOrder(id);
	}

	/**
	 * 보충 지시 완료
	 *
	 * POST /rest/oms_trx/replenish_orders/{id}/complete
	 *
	 * @param id 보충 지시 ID
	 * @return { success, resultTotal }
	 */
	@RequestMapping(value = "replenish_orders/{id}/complete", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Complete replenish order (IN_PROGRESS → COMPLETED)")
	public Map<String, Object> completeReplenishOrder(@PathVariable("id") String id) {
		return this.omsTrxService.completeReplenishOrder(id);
	}

	/**
	 * 보충 지시 취소
	 *
	 * POST /rest/oms_trx/replenish_orders/{id}/cancel
	 *
	 * @param id 보충 지시 ID
	 * @return { success }
	 */
	@RequestMapping(value = "replenish_orders/{id}/cancel", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel replenish order (→ CANCELLED)")
	public Map<String, Object> cancelReplenishOrder(@PathVariable("id") String id) {
		return this.omsTrxService.cancelReplenishOrder(id);
	}
}
