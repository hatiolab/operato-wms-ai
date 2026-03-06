package operato.wms.base.rest;

import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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

import operato.wms.base.entity.RuntimeEnv;
import operato.wms.base.entity.RuntimeEnvItem;
import operato.wms.base.model.RuntimeConfig;
import xyz.anythings.sys.util.AnyOrmUtil;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/runtime_envs")
@ServiceDesc(description = "RuntimeEnv Service API")
public class RuntimeEnvController extends AbstractRestService {

	@Override
	protected Class<?> entityClass() {
		return RuntimeEnv.class;
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
	public RuntimeEnv findOne(@PathVariable("id") String id) {
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
	public RuntimeEnv create(@RequestBody RuntimeEnv input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public RuntimeEnv update(@PathVariable("id") String id, @RequestBody RuntimeEnv input) {
		return this.updateOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<RuntimeEnv> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}
	
    @RequestMapping(value="/{id}/items", method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description="Find RuntimeEnv Items By RuntimeEnv ID")
    public List<RuntimeEnvItem> searchEnviornmentItems(@PathVariable("id") String id) {
        Query query = AnyOrmUtil.newConditionForExecution(Domain.currentDomainId());
        query.addOrder("name", true);
        query.addFilter(new Filter("runtimeEnvId", id));
        return this.queryManager.selectList(RuntimeEnvItem.class, query);
    }
    
    @RequestMapping(value="/{id}/items/update_multiple", method=RequestMethod.POST, consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description="Update Multiple RuntimeEnv Items")
    @CacheEvict(cacheNames="RuntimeConfig", allEntries=true)
    public Boolean updateMultipleEnviornmentItems(@PathVariable("id") String id, @RequestBody List<RuntimeEnvItem> envItems) {
        for(RuntimeEnvItem item : envItems) { 
            item.setRuntimeEnvId(id); 
        }
        
        return this.cudMultipleData(RuntimeEnvItem.class, envItems);
    }
    
    @RequestMapping(value = "/item/{com_cd}/{wh_cd}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find one by comCd, whCd, itemName")
    @Cacheable(cacheNames="RuntimeConfig", keyGenerator="runtimeEnvFindApiKeyGenerator")
    public RuntimeConfig findEnvItem(@PathVariable("com_cd") String comCd, @PathVariable("wh_cd") String whCd, @RequestParam(name = "item_name", required = true) String itemName) {
        String sql = "select re.com_cd, re.wh_cd, ri.name as item_name, ri.value as item_value from runtime_envs re inner join runtime_env_items ri on re.id = ri.runtime_env_id where re.domain_id = :domainId and re.com_cd = :comCd and re.wh_cd = :whCd and ri.name = :itemName";
        Map<String, Object> condition = ValueUtil.newMap("domainId,comCd,whCd,itemName", Domain.currentDomainId(), comCd, whCd, itemName);
        return this.queryManager.selectBySql(sql, condition, RuntimeConfig.class);
    }
}