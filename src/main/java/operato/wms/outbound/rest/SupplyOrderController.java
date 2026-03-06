package operato.wms.outbound.rest;

import java.util.List;

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

import operato.wms.outbound.entity.SupplyOrder;
import operato.wms.outbound.entity.SupplyOrderItem;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Order;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/supply_orders")
@ServiceDesc(description = "SupplyOrder Service API")
public class SupplyOrderController extends AbstractRestService {

    @Override
    protected Class<?> entityClass() {
        return SupplyOrder.class;
    }

    @RequestMapping(method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search (Pagination) By Search Conditions")
    public Page<?> index(@RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "select", required = false) String select,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "query", required = false) String query) {
        return this.search(this.entityClass(), page, limit, select, sort, query);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find one by ID")
    public SupplyOrder findOne(@PathVariable("id") String id) {
        return this.getOne(this.entityClass(), id);
    }

    @RequestMapping(value = "/{id}/exist", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Check exists By ID")
    public Boolean isExist(@PathVariable("id") String id) {
        return this.isExistOne(this.entityClass(), id);
    }

    @RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @ApiDesc(description = "Create")
    public SupplyOrder create(@RequestBody SupplyOrder input) {
        return this.createOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update")
    public SupplyOrder update(@PathVariable("id") String id, @RequestBody SupplyOrder input) {
        return this.updateOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void delete(@PathVariable("id") String id) {
        this.deleteOne(this.entityClass(), id);
    }

    @RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Create, Update or Delete multiple at one time")
    public Boolean multipleUpdate(@RequestBody List<SupplyOrder> list) {
        return this.cudMultipleData(this.entityClass(), list);
    }

    @RequestMapping(value = "/{id}/items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find Supply Order Items By Supply Order ID")
    public List<SupplyOrderItem> findSupplyOrderItems(@PathVariable("id") String id,
            @RequestParam(name = "sort", required = false) String sort) {
        Query query = new Query();
        query.addFilter(new Filter("supplyOrderId", id));
        if (ValueUtil.isNotEmpty(sort)) {
            query.addOrder(this.jsonParser.parse(sort, Order[].class));
        }

        return this.queryManager.selectList(SupplyOrderItem.class, query);
    }

    @RequestMapping(value = "/{id}/items/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update Multiple Supply Order Items")
    public Boolean updateMultipleSupplyOrderItems(@PathVariable("id") String id,
            @RequestBody List<SupplyOrderItem> supplyOrderItems) {
        for (SupplyOrderItem item : supplyOrderItems) {
            item.setSupplyOrderId(id);
        }

        return this.cudMultipleData(SupplyOrderItem.class, supplyOrderItems);
    }
}