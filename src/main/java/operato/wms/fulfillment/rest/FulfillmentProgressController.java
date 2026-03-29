package operato.wms.fulfillment.rest;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.fulfillment.entity.FulfillmentProgress;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;

/**
 * 풀필먼트 진행 현황 컨트롤러 (읽기 전용)
 *
 * fulfillment_progress 뷰를 기반으로 피킹→포장→출하 통합 현황을 조회한다.
 *
 * @author HatioLab
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/fulfillment_progress")
@ServiceDesc(description = "FulfillmentProgress Service API")
public class FulfillmentProgressController extends AbstractRestService {

	@Override
	protected Class<?> entityClass() {
		return FulfillmentProgress.class;
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
	public FulfillmentProgress findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}
}
