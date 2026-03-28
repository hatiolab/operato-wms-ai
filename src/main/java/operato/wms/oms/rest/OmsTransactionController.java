package operato.wms.oms.rest;

import java.util.List;
import java.util.Map;

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
	 * @param params { groupBy, pickType, exeType, maxOrderCount, orderDate }
	 * @return 처리 결과 { waveCount, totalOrders, waves }
	 */
	@RequestMapping(value = "waves/create", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create waves automatically from allocated orders")
	public Map<String, Object> createAutoWaves(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.createAutoWaves(params);
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
	public Map<String, Object> previewAutoWaveTargets(@RequestParam(name = "order_date", required = false) String orderDate) {
		return this.omsTrxService.previewAutoWaveTargets(orderDate);
	}

	/* ============================================================
	 * 출하 주문 상태 변경 API
	 * ============================================================ */

	/**
	 * 출하 주문 확정
	 *
	 * POST /rest/oms_trx/shipment_orders/confirm
	 *
	 * @param params { ids: ["id1", "id2", ...] }
	 * @return { successCount, failCount, errors }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "shipment_orders/confirm", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Confirm shipment orders (REGISTERED → CONFIRMED)")
	public Map<String, Object> confirmOrders(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.confirmShipmentOrders((List<String>) params.get("ids"));
	}

	/**
	 * 출하 주문 재고 할당
	 *
	 * POST /rest/oms_trx/shipment_orders/allocate
	 *
	 * @param params { ids: ["id1", "id2", ...] }
	 * @return { successCount, allocatedCount, backOrderCount }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "shipment_orders/allocate", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Allocate inventory for shipment orders (CONFIRMED → ALLOCATED)")
	public Map<String, Object> allocateOrders(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.allocateShipmentOrders((List<String>) params.get("ids"));
	}

	/**
	 * 출하 주문 할당 해제
	 *
	 * POST /rest/oms_trx/shipment_orders/deallocate
	 *
	 * @param params { id: "order_id" }
	 * @return { success, releasedCount }
	 */
	@RequestMapping(value = "shipment_orders/deallocate", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Deallocate inventory from shipment order (ALLOCATED → CONFIRMED)")
	public Map<String, Object> deallocateOrder(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.deallocateShipmentOrder((String) params.get("id"));
	}

	/**
	 * 출하 주문 취소
	 *
	 * POST /rest/oms_trx/shipment_orders/cancel
	 *
	 * @param params { ids: ["id1", "id2", ...] }
	 * @return { successCount, failCount }
	 */
	@SuppressWarnings("unchecked")
	@RequestMapping(value = "shipment_orders/cancel", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Cancel shipment orders")
	public Map<String, Object> cancelOrders(@RequestBody Map<String, Object> params) {
		return this.omsTrxService.cancelShipmentOrders((List<String>) params.get("ids"));
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

	/* ============================================================
	 * 웨이브 상태 변경 API
	 * ============================================================ */

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
}
