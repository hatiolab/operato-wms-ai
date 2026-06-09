package operato.wms.fulfillment.rest;

import java.util.List;
import java.util.Map;
import xyz.elidom.dbist.dml.Filter;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import operato.wms.fulfillment.entity.PackingOrder;
import operato.wms.base.entity.StoragePolicy;
import operato.wms.base.service.WmsBaseService;
import operato.wms.fulfillment.entity.PackingBox;
import operato.wms.fulfillment.entity.PackingOrderItem;

import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.sys.util.ValueUtil;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.exception.server.ElidomRuntimeException;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/packing_orders")
@ServiceDesc(description = "PackingOrder Service API")
public class PackingOrderController extends AbstractRestService {
	/**
	 * WMS Base Service
	 */
	@Autowired
	private WmsBaseService wmsBaseService;
	/**
	 * 리포트 컨트롤러
	 */
	@Autowired
	protected PrintoutController printoutCtrl;

	@Override
	protected Class<?> entityClass() {
		return PackingOrder.class;
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
	public PackingOrder findOne(@PathVariable("id") String id) {
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
	public PackingOrder create(@RequestBody PackingOrder input) {
		return this.createOne(input);
	}

	@PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public PackingOrder update(@PathVariable("id") String id, @RequestBody PackingOrder input) {
		return this.updateOne(input);
	}

	@DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@PostMapping(value = "/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<PackingOrder> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	@GetMapping(value = "/{id}/include_details", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find One included all details by ID")
	public Map<String, Object> findDetails(@PathVariable("id") String id) {
		return this.findOneIncludedDetails(id);
	}

	@GetMapping(value = "/{id}/boxes", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search detail list by master ID")
	public List<PackingBox> findPackingBoxes(@PathVariable("id") String id) {
		xyz.elidom.dbist.dml.Query query = new xyz.elidom.dbist.dml.Query();
		query.addFilter(new Filter("packingOrderId", id));
		return this.queryManager.selectList(PackingBox.class, query);
	}

	@PostMapping(value = "/{id}/boxes/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update, Delete multiple details at one time")
	public List<PackingBox> updatePackingBox(@PathVariable("id") String id, @RequestBody List<PackingBox> list) {
		for (PackingBox item : list) {
			item.setPackingOrderId(id);
		}

		this.cudMultipleData(PackingBox.class, list);
		return this.findPackingBoxes(id);
	}

	@GetMapping(value = "/{id}/items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search detail list by master ID")
	public List<PackingOrderItem> findPackingOrderItems(@PathVariable("id") String id) {
		xyz.elidom.dbist.dml.Query query = new xyz.elidom.dbist.dml.Query();
		query.addFilter(new Filter("packingOrderId", id));
		return this.queryManager.selectList(PackingOrderItem.class, query);
	}

	@PostMapping(value = "/{id}/items/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update, Delete multiple details at one time")
	public List<PackingOrderItem> updatePackingOrderItem(@PathVariable("id") String id,
			@RequestBody List<PackingOrderItem> list) {
		for (PackingOrderItem item : list) {
			item.setPackingOrderId(id);
		}

		this.cudMultipleData(PackingOrderItem.class, list);
		return this.findPackingOrderItems(id);
	}

	/**
	 * 출고 주문 ID로 거래명세서 출력을 위한 PDF 다운로드
	 * 
	 * @param req
	 * @param res
	 * @param id
	 * @param template
	 * @param printerId
	 * @return
	 */
	@GetMapping(value = "/{id}/download_packing_sheet", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Download Packing Sheet")
	public void downloadForPackingSheet(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("id") String id,
			@RequestParam(name = "template", required = false) String template,
			@RequestParam(name = "printer_id", required = false) String printerId) {

		// 1. 조회
		PackingOrder packingOrder = this.queryManager.select(PackingOrder.class, id);

		// 2. 템플릿이 비어 있다면 기본 거래명세서 템플릿 명 조회
		if (ValueUtil.isEmpty(template)) {
			StoragePolicy policy = this.wmsBaseService.findStoragePolicy(packingOrder.getDomainId(),
					packingOrder.getComCd(), packingOrder.getWhCd());

			template = policy.getOutboundSheetTmpl();

			if (ValueUtil.isEmpty(template)) {
				throw new ElidomRuntimeException("거래명세서 템플릿이 보관피킹 정책 설정에 설정되지 않았습니다.");
			}
		}

		// 3. 거래명세서 출력을 위한 PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, template,
				ValueUtil.newMap("packingOrder", packingOrder));
	}

	/**
	 * 포장 주문 ID로 거래명세서 출력을 위한 PDF 다운로드
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
			template = "INVOICE_LABEL_SHEET_BY_PACKING";
		}

		// 2. 송장 라벨 출력을 위한 PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, template, ValueUtil.newMap("id", id));
	}
}