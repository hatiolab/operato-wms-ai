package operato.wms.oms.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import operato.wms.oms.service.OmsImportService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Order;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/shipment_orders")
@ServiceDesc(description = "ShipmentOrder Service API")
public class ShipmentOrderController extends AbstractRestService {

	@Autowired
	private OmsImportService importService;

	@Override
	protected Class<?> entityClass() {
		return ShipmentOrder.class;
	}

	@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search (Pagination) By Search Conditions")
	public Page<?> index(
			@RequestParam(name = "page", required = false) Integer page,
			@RequestParam(name = "limit", required = false) Integer limit,
			@RequestParam(name = "select", required = false) String select,
			@RequestParam(name = "sort", required = false) String sort,
			@RequestParam(name = "query", required = false) String query) {
		return this.search(this.entityClass(), page, limit, select, sort, query);
	}

	@GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by ID")
	public ShipmentOrder findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}

	@GetMapping(value = "/{id}/exist", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create")
	public ShipmentOrder create(@RequestBody ShipmentOrder input) {
		return this.createOne(input);
	}

	@PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public ShipmentOrder update(@PathVariable("id") String id, @RequestBody ShipmentOrder input) {
		return this.updateOne(input);
	}

	@DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@PostMapping(value = "/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<ShipmentOrder> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	@GetMapping(value = "/{id}/delivery", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find Shipment Order Items By Shipment Order ID")
	public ShipmentDelivery findShipmentDelivery(@PathVariable("id") String id) {
		Query query = new Query();
		query.addFilter(new Filter("shipmentOrderId", id));
		List<ShipmentDelivery> list = this.queryManager.selectList(ShipmentDelivery.class, query);
		return ValueUtil.isEmpty(list) ? null : list.get(0);
	}

	@GetMapping(value = "/{id}/items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find Shipment Order Items By Shipment Order ID")
	public List<ShipmentOrderItem> findShipmentOrderItems(@PathVariable("id") String id,
			@RequestParam(name = "sort", required = false) String sort) {
		Query query = new Query();
		query.addFilter(new Filter("shipmentOrderId", id));
		if (ValueUtil.isNotEmpty(sort) && sort.length() > 5) {
			query.addOrder(this.jsonParser.parse(sort, Order[].class));
		} else {
			query.addOrder("lineNo", true);
		}

		return this.queryManager.selectList(ShipmentOrderItem.class, query);
	}

	@PostMapping(value = "/{id}/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update Multiple Shipment Order Items")
	public Boolean updateMultipleShipmentOrderItems(@PathVariable("id") String id,
			@RequestBody List<ShipmentOrderItem> shipmentOrderItems) {
		for (ShipmentOrderItem item : shipmentOrderItems) {
			item.setShipmentOrderId(id);
		}

		return this.cudMultipleData(ShipmentOrderItem.class, shipmentOrderItems);
	}

	/**
	 * B2C 출하 주문 엑셀 임포트 (업로드 + 검증 + 등록)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/excel/b2c
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 임포트 결과 { total_rows, order_count, item_count, delivery_count }
	 */
	@RequestMapping(value = "import/b2c", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2C shipment orders from Excel (validate and register)")
	public Map<String, Object> importB2cExcel(@RequestBody List<ImportShipmentOrder> list) {
		// 1. 데이터 검증
		Map<String, Object> validationResult = this.importService.validateImportData(list, "B2C_OUT");

		// 2. 검증 오류가 있으면 예외 발생 (첫 번째 오류만 표시)
		int errorCount = (int) validationResult.getOrDefault("error", 0);
		if (errorCount > 0) {
			@SuppressWarnings("unchecked")
			List<Map<String, Object>> rows = (List<Map<String, Object>>) validationResult.get("rows");
			StringBuilder errorMsg = new StringBuilder();
			errorMsg.append("데이터 검증 오류가 발생했습니다 (총 ").append(errorCount).append("건의 오류)\n\n");

			// 첫 번째 오류만 표시
			for (Map<String, Object> row : rows) {
				Boolean valid = (Boolean) row.get("valid");
				if (valid != null && !valid) {
					int rowNo = (int) row.get("row_no");
					@SuppressWarnings("unchecked")
					List<String> errorMessages = (List<String>) row.get("error_messages");
					if (!errorMessages.isEmpty()) {
						errorMsg.append("[행 ").append(rowNo).append("] ").append(errorMessages.get(0));
						break; // 첫 번째 오류만 표시
					}
				}
			}

			throw new ElidomRuntimeException(errorMsg.toString().trim());
		}

		// 3. 검증 통과 시 임포트 실행
		Map<String, Object> importResult = this.importService.importShipmentOrders(list);
		return importResult;
	}

	/**
	 * B2B 출하 주문 엑셀 임포트 (업로드 + 검증 + 등록)
	 *
	 * POST /rest/oms_trx/shipment_orders/import/excel/b2b
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 임포트 결과 { total_rows, order_count, item_count, delivery_count }
	 */
	@RequestMapping(value = "import/b2b", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2B shipment orders from Excel (validate and register)")
	public Map<String, Object> importB2bExcel(@RequestBody List<ImportShipmentOrder> list) {
		// 1. 데이터 검증
		Map<String, Object> validationResult = this.importService.validateImportData(list, "B2B_OUT");

		// 2. 검증 오류가 있으면 예외 발생 (첫 번째 오류만 표시)
		int errorCount = (int) validationResult.getOrDefault("error", 0);
		if (errorCount > 0) {
			@SuppressWarnings("unchecked")
			List<Map<String, Object>> rows = (List<Map<String, Object>>) validationResult.get("rows");
			StringBuilder errorMsg = new StringBuilder();
			errorMsg.append("데이터 검증 오류가 발생했습니다 (총 ").append(errorCount).append("건의 오류)\n\n");

			// 첫 번째 오류만 표시
			for (Map<String, Object> row : rows) {
				Boolean valid = (Boolean) row.get("valid");
				if (valid != null && !valid) {
					int rowNo = (int) row.get("row_no");
					@SuppressWarnings("unchecked")
					List<String> errorMessages = (List<String>) row.get("error_messages");
					if (!errorMessages.isEmpty()) {
						errorMsg.append("[행 ").append(rowNo).append("] ").append(errorMessages.get(0));
						break; // 첫 번째 오류만 표시
					}
				}
			}

			throw new ElidomRuntimeException(errorMsg.toString().trim());
		}

		// 3. 검증 통과 시 임포트 실행
		Map<String, Object> importResult = this.importService.importShipmentOrders(list);
		return importResult;
	}
}