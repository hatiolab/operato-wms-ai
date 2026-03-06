package operato.wms.inbound.rest;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.inbound.entity.ReceivingOrderStatus;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/receiving_order_status")
@ServiceDesc(description = "ReceivingOrderStatus Service API")
public class ReceivingOrderStatusController extends AbstractRestService {

    @Override
    protected Class<?> entityClass() {
        return ReceivingOrderStatus.class;
    }

    @RequestMapping(method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search (Pagination) By Search Conditions")
    public Page<?> index(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "select", required = false) String select,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "query", required = false) String query) {
        return this.search(this.entityClass(), page, limit, select, sort, query);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find one by ID")
    public ReceivingOrderStatus findOne(@PathVariable("id") String id) {
        return this.getOne(this.entityClass(), id);
    }
}