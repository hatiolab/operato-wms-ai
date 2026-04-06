package operato.wms.fulfillment.rest;

import java.util.List;
import java.util.Map;

import xyz.anythings.sys.model.BaseResponse;
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
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import operato.wms.fulfillment.entity.PickingTask;
import operato.wms.fulfillment.entity.PickingTaskItem;
import operato.wms.fulfillment.service.FulfillmentPickingService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;
import xyz.elidom.dbist.dml.Page;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/picking_tasks")
@ServiceDesc(description = "PickingTask Service API")
public class PickingTaskController extends AbstractRestService {
	/**
	 * 풀필먼트 피킹 서비스
	 */
	@Autowired
	private FulfillmentPickingService fulfillmentPickingService;
	/**
	 * 리포트 컨트롤러
	 */
	@Autowired
	private PrintoutController printoutCtrl;

	@Override
	protected Class<?> entityClass() {
		return PickingTask.class;
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
	public PickingTask findOne(@PathVariable("id") String id) {
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
	public PickingTask create(@RequestBody PickingTask input) {
		return this.createOne(input);
	}

	@PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public PickingTask update(@PathVariable("id") String id, @RequestBody PickingTask input) {
		return this.updateOne(input);
	}

	@DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@PostMapping(value = "/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<PickingTask> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	@GetMapping(value = "/{id}/include_details", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find One included all details by ID")
	public Map<String, Object> findDetails(@PathVariable("id") String id) {
		return this.findOneIncludedDetails(id);
	}

	@GetMapping(value = "/{id}/items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search detail list by master ID")
	public List<PickingTaskItem> findPickingTaskItem(@PathVariable("id") String id) {
		xyz.elidom.dbist.dml.Query query = new xyz.elidom.dbist.dml.Query();
		query.addFilter(new Filter("pickTaskId", id));
		return this.queryManager.selectList(PickingTaskItem.class, query);
	}

	@PostMapping(value = "/{id}/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update, Delete multiple details at one time")
	public List<PickingTaskItem> updatePickingTaskItem(@PathVariable("id") String id,
			@RequestBody List<PickingTaskItem> list) {
		for (PickingTaskItem item : list) {
			item.setPickTaskId(id);
		}

		this.cudMultipleData(PickingTaskItem.class, list);
		return this.findPickingTaskItem(id);
	}

	/**
	 * 피킹 지시 ID로 피킹지시서 출력을 위한 PDF 다운로드
	 * 
	 * @param req
	 * @param res
	 * @param id        피킹 주문 ID
	 * @param template
	 * @param printerId
	 * @return
	 */
	@RequestMapping(value = "/{id}/download_picking_sheet", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Download Picking Task Sheet")
	public void downloadPickingSheet(
			HttpServletRequest req,
			HttpServletResponse res,
			@PathVariable("id") String id,
			@RequestParam(name = "template", required = false) String template,
			@RequestParam(name = "printer_id", required = false) String printerId) {

		// 1. 조회
		PickingTask pickingTask = this.queryManager.select(PickingTask.class, id);

		// 2. 템플릿이 비어 있다면 기본 피킹지시서 템플릿 명 조회
		if (ValueUtil.isEmpty(template)) {
			template = this.fulfillmentPickingService.getPickingSheetTemplateName(pickingTask.getComCd(),
					pickingTask.getWhCd(),
					true);
		}

		// 3. 피킹지시서 출력을 위한 PDF 다운로드
		this.printoutCtrl.showPdfByPrintTemplateName(req, res, template, ValueUtil.newMap("pickingTask", pickingTask));
	}

	/**
	 * 피킹 지시 ID로 피킹지시서 출력
	 * 
	 * @param id        피킹 지시 ID
	 * @param template
	 * @param printerId
	 * @return
	 */
	@RequestMapping(value = "/{id}/print_picking_sheet", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Print Picking Task Sheet")
	public BaseResponse printPickingSheet(
			@PathVariable("id") String id,
			@RequestParam(name = "template", required = false) String template,
			@RequestParam(name = "printer_id", required = false) String printerId) {

		// 1. 조회
		PickingTask pickingTask = this.queryManager.select(PickingTask.class, id);

		// 2. 피킹지시서 출력
		this.fulfillmentPickingService.printPickingSheet(pickingTask, template, printerId);

		// 3. 리턴
		return new BaseResponse(true, "ok");
	}
}