package operato.wms.oms.rest;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

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

import operato.wms.oms.entity.ShipmentWave;

import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;
import xyz.elidom.dbist.dml.Page;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/shipment_waves")
@ServiceDesc(description = "ShipmentWave Service API")
public class ShipmentWaveController extends AbstractRestService {

	@Autowired
	private PrintoutController printoutCtrl;

	@Override
	protected Class<?> entityClass() {
		return ShipmentWave.class;
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
	public ShipmentWave findOne(@PathVariable("id") String id) {
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
	public ShipmentWave create(@RequestBody ShipmentWave input) {
		return this.createOne(input);
	}

	@PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public ShipmentWave update(@PathVariable("id") String id, @RequestBody ShipmentWave input) {
		return this.updateOne(input);
	}

	@DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@PostMapping(value = "/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<ShipmentWave> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	/**
	 * 웨이브 ID로 피킹지시서 PDF 다운로드
	 *
	 * @param req
	 * @param res
	 * @param id       웨이브 ID
	 * @param template 템플릿명 (미지정시 PICKING_ORDER_SHEET 사용)
	 */
	@GetMapping(value = "/{id}/download_picking_sheet", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Download Picking Order Sheet by Wave ID")
	public void downloadPickingSheet(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("id") String id,
			@RequestParam(name = "template", required = false) String template) {

		// 1. 웨이브 조회
		ShipmentWave wave = this.queryManager.select(ShipmentWave.class, id);

		// 2. 템플릿명 기본값
		if (ValueUtil.isEmpty(template)) {
			template = "PICKING_TASK_SHEET2";
		}

		// 3. PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, template, ValueUtil.newMap("wave", wave));
	}
}