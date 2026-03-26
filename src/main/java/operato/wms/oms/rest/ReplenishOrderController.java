package operato.wms.oms.rest;

import java.util.List;
import java.util.Map;
import xyz.elidom.dbist.dml.Filter;

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

import operato.wms.oms.entity.ReplenishOrder;
import operato.wms.oms.entity.ReplenishOrderItem;

import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.dbist.dml.Page;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/replenish_orders")
@ServiceDesc(description = "ReplenishOrder Service API")
public class ReplenishOrderController extends AbstractRestService {

	@Override
	protected Class<?> entityClass() {
		return ReplenishOrder.class;
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
	public ReplenishOrder findOne(@PathVariable("id") String id) {
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
	public ReplenishOrder create(@RequestBody ReplenishOrder input) {
		return this.createOne(input);
	}

	@PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public ReplenishOrder update(@PathVariable("id") String id, @RequestBody ReplenishOrder input) {
		return this.updateOne(input);
	}

	@DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@PostMapping(value = "/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<ReplenishOrder> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}

	@GetMapping(value = "/{id}/include_details", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find One included all details by ID")
	public Map<String, Object> findDetails(@PathVariable("id") String id) {
		return this.findOneIncludedDetails(id);
	}

	@GetMapping(value = "/{id}/items", produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search detail list by master ID")
	public List<ReplenishOrderItem> findReplenishOrderItems(@PathVariable("id") String id) {
		xyz.elidom.dbist.dml.Query query = new xyz.elidom.dbist.dml.Query();
		query.addFilter(new Filter("replenishOrderId", id));
		return this.queryManager.selectList(ReplenishOrderItem.class, query);
	}

	@PostMapping(value = "/{id}/update_multiple", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update, Delete multiple details at one time")
	public List<ReplenishOrderItem> updateMultipleReplenishOrderItem(@PathVariable("id") String id,
			@RequestBody List<ReplenishOrderItem> list) {
		for (ReplenishOrderItem item : list) {
			item.setReplenishOrderId(id);
		}

		this.cudMultipleData(ReplenishOrderItem.class, list);
		return this.findReplenishOrderItems(id);
	}

}