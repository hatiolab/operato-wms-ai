package operato.wms.base.rest;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
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

import operato.wms.base.entity.SKU;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/sku")
@ServiceDesc(description = "SKU Service API")
public class SKUController extends AbstractRestService {
	
	/**
     * 커스텀 서비스 - MultipleUpdate 전 처리
     */
    public static final String TRX_SKU_PRE_MULTIPLE_UPDATE = "diy-sku-pre-multiple-update";
    /**
     * 커스텀 서비스 - MultipleUpdate 후 처리
     */
    public static final String TRX_SKU_POST_MULTIPLE_UPDATE = "diy-sku-post-multiple-update";
	
	/**
     * 커스텀 서비스
     */
    @Autowired
    private ICustomService customSvc;

    @Override
    protected Class<?> entityClass() {
        return SKU.class;
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
    public SKU findOne(@PathVariable("id") String id) {
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
    public SKU create(@RequestBody SKU input) {
        return this.createOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update")
    public SKU update(@PathVariable("id") String id, @RequestBody SKU input) {
        return this.updateOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void delete(@PathVariable("id") String id) {
        this.deleteOne(this.entityClass(), id);
    }

    @RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Create, Update or Delete multiple at one time")
    public Boolean multipleUpdate(@RequestBody List<SKU> list) {
    	// 1. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("domain_id,list", Domain.currentDomainId(), list);
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_SKU_PRE_MULTIPLE_UPDATE, custSvcParams);
        
        // 2. 업데이트 
        this.cudMultipleData(this.entityClass(), list);
        
        // 3. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_SKU_POST_MULTIPLE_UPDATE, custSvcParams);
    	
        return true;
    }
}