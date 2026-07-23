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

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import operato.wms.oms.WmsOmsConfigConstants;
import operato.wms.oms.entity.ImportShipmentOrder;
import operato.wms.oms.entity.ShipmentDelivery;
import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import operato.wms.oms.service.OmsImportService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;
import xyz.anythings.sys.service.ICustomService;
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
	/**
	 * 커스텀 서비스
	 */
	@Autowired
	private ICustomService customSvc;
	/**
	 * 임포트 서비스
	 */
	@Autowired
	private OmsImportService importService;
	/**
	 * 리포트 컨트롤러
	 */
	@Autowired
	protected PrintoutController printoutCtrl;

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
	 * B2C 출하 주문 한 건 임포트 - 커스텀 서비스에서 100% 구현
	 *
	 * POST importone/b2c/by_custom/{order_type}
	 *
	 * @param list 출하주문 데이터
	 * @return 임포트 결과
	 */
	@RequestMapping(value = "import_one/b2c/by_custom/{order_type}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2C shipment orders from by custom service")
	public List<ImportShipmentOrder> importOneB2cByCustomService(@PathVariable("order_type") String orderType,
			@RequestBody List<ImportShipmentOrder> list) {
		Map<String, Object> params = ValueUtil.newMap("order_type,biz_type,list", orderType,
				WmsOmsConfigConstants.SHIPMENT_ORDER_BIZ_TYPE_B2C_OUT, list);
		String diyServiceUrl = "diy-importone-b2c-so-" + orderType;
		Object result = this.customSvc.doCustomService(Domain.currentDomainId(), diyServiceUrl, params);
		if (result != null && result instanceof List) {
			return (List<ImportShipmentOrder>) result;
		} else {
			return list;
		}
	}

	/**
	 * B2B 출하 주문 한 건 임포트 - 커스텀 서비스에서 100% 구현
	 *
	 * POST importone/b2b/by_custom/{order_type}
	 *
	 * @param order 출하주문 데이터
	 * @return 임포트 결과
	 */
	@RequestMapping(value = "import_one/b2b/by_custom/{order_type}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2B shipment orders from by custom service")
	public List<ImportShipmentOrder> importOneB2bByCustomService(@PathVariable("order_type") String orderType,
			@RequestBody List<ImportShipmentOrder> list) {
		Map<String, Object> params = ValueUtil.newMap("order_type,biz_type,list", orderType,
				WmsOmsConfigConstants.SHIPMENT_ORDER_BIZ_TYPE_B2B_OUT, list);
		String diyServiceUrl = "diy-importone-b2b-so-" + orderType;
		Object result = this.customSvc.doCustomService(Domain.currentDomainId(), diyServiceUrl, params);
		if (result != null && result instanceof List) {
			return (List<ImportShipmentOrder>) result;
		} else {
			return list;
		}
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
		// 0. B2B 출고주문 생성 화면 전용 기본값 강제
		// (해당 컬럼들은 화면에서 입력받지 않으므로 서버에서 고정 세팅한다)
		// - biz_type : B2B 진입점이므로 B2B_OUT 고정
		// - ship_type: 현재 정책상 NORMAL 고정 (추후 정책 확정 시 변경)
		// - wh_cd : 창고 선택 UI 정비 전까지 WH001 고정
		// TODO 수정 - 커스텀 서비스로 ...
		for (ImportShipmentOrder row : list) {
			row.setBizType(WmsOmsConfigConstants.SHIPMENT_ORDER_BIZ_TYPE_B2B_OUT);
			row.setShipType("NORMAL");
			row.setWhCd("WH001");
		}

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

	/**
	 * B2C 출하 주문 엑셀 임포트 (Validation) - 커스텀 서비스에서 100% 구현
	 *
	 * POST /rest/shipment_orders/import_validate/b2c/by_custom
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 임포트 결과 { total_rows, order_count, item_count, delivery_count }
	 */
	@RequestMapping(value = "import_validate/b2c/by_custom", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Validate For Import B2C shipment orders from Excel by custom service (validate)")
	public List<ImportShipmentOrder> importB2cExcelByCustomService(@RequestBody List<ImportShipmentOrder> list) {
		Map<String, Object> params = ValueUtil.newMap("biz_type,list",
				WmsOmsConfigConstants.SHIPMENT_ORDER_BIZ_TYPE_B2C_OUT, list);
		this.customSvc.doCustomService(Domain.currentDomainId(), "diy-validate-b2c-shipment-order", params);
		return list;
	}

	/**
	 * B2B 출하 주문 엑셀 임포트 (Validation) - 커스텀 서비스에서 100% 구현
	 *
	 * POST /rest/shipment_orders/import_validate/b2b/by_custom
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 임포트 결과 { total_rows, order_count, item_count, delivery_count }
	 */
	@RequestMapping(value = "import_validate/b2b/by_custom", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Validate For Import B2B shipment orders from Excel by custom service (validate)")
	public List<ImportShipmentOrder> importB2bExcelByCustomService(@RequestBody List<ImportShipmentOrder> list) {
		Map<String, Object> params = ValueUtil.newMap("biz_type,list",
				WmsOmsConfigConstants.SHIPMENT_ORDER_BIZ_TYPE_B2B_OUT, list);
		this.customSvc.doCustomService(Domain.currentDomainId(), "diy-validate-b2b-shipment-order", params);
		return list;
	}

	/**
	 * B2C 출하 주문 엑셀 임포트 - 커스텀 서비스에서 100% 구현
	 *
	 * POST import/b2c/by_custom/{order_type}
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 임포트 결과 { total_rows, order_count, item_count, delivery_count }
	 */
	@RequestMapping(value = "import/b2c/by_custom/{order_type}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2C shipment orders from by custom service")
	public List<ImportShipmentOrder> importB2cByCustomService(@PathVariable("order_type") String orderType,
			@RequestBody List<ImportShipmentOrder> list) {
		Map<String, Object> params = ValueUtil.newMap("order_type,biz_type,list", orderType,
				WmsOmsConfigConstants.SHIPMENT_ORDER_BIZ_TYPE_B2C_OUT, list);
		String diyServiceUrl = "diy-import-b2c-so-" + orderType;
		this.customSvc.doCustomService(Domain.currentDomainId(), diyServiceUrl, params);
		return list;
	}

	/**
	 * B2B 출하 주문 엑셀 임포트 - 커스텀 서비스에서 100% 구현
	 *
	 * POST import/b2b/by_custom/{order_type}
	 *
	 * @param list 엑셀에서 파싱된 임포트 데이터
	 * @return 임포트 결과 { total_rows, order_count, item_count, delivery_count }
	 */
	@RequestMapping(value = "import/b2b/by_custom/{order_type}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Import B2B shipment orders from by custom service")
	public List<ImportShipmentOrder> importB2bByCustomService(@PathVariable("order_type") String orderType,
			@RequestBody List<ImportShipmentOrder> list) {
		Map<String, Object> params = ValueUtil.newMap("order_type,biz_type,list", orderType,
				WmsOmsConfigConstants.SHIPMENT_ORDER_BIZ_TYPE_B2B_OUT, list);
		String diyServiceUrl = "diy-import-b2b-so-" + orderType;
		this.customSvc.doCustomService(Domain.currentDomainId(), diyServiceUrl, params);
		return list;
	}

	/**
	 * 출고 주문 ID로 송장 출력을 위한 PDF 다운로드
	 * 
	 * @param req
	 * @param res
	 * @param id
	 * @param template
	 * @param printerId
	 * @return
	 */
	@GetMapping(value = "/{id}/download_invoice_label", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Download Invoice Label")
	public void downloadInvoiceLabel(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("id") String id,
			@RequestParam(name = "template", required = false) String template,
			@RequestParam(name = "printer_id", required = false) String printerId) {

		// 1. 템플릿이 비어 있다면 기본 거래명세서 템플릿 명 조회
		if (ValueUtil.isEmpty(template)) {
			template = "INVOICE_LABEL_SHEET_BY_SHIPMENT";
		}

		// 2. 송장 라벨 출력을 위한 PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, template, ValueUtil.newMap("id", id));
	}
}