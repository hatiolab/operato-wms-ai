package operato.wms.oms.rest;

import java.util.List;

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

import operato.wms.oms.entity.ShipmentOrder;
import operato.wms.oms.entity.ShipmentOrderItem;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Order;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/shipment_orders")
@ServiceDesc(description = "ShipmentOrder Service API")
public class ShipmentOrderController extends AbstractRestService {

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
}