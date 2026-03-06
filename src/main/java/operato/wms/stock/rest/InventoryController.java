package operato.wms.stock.rest;

import java.util.ArrayList;
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

import operato.wms.stock.entity.Inventory;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inventories")
@ServiceDesc(description = "Inventory Service API")
public class InventoryController extends AbstractRestService {

	@Override
	protected Class<?> entityClass() {
		return Inventory.class;
	}

	@RequestMapping(method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search (Pagination) By Search Conditions")
	public Page<?> index(@RequestParam(name = "page", required = false) Integer page,
			@RequestParam(name = "limit", required = false) Integer limit,
			@RequestParam(name = "select", required = false) String select,
			@RequestParam(name = "sort", required = false) String sort,
			@RequestParam(name = "query", required = false) String query) {
	    
	    Query queryObj = this.parseQuery(this.entityClass(), page, limit, select, sort, query);
	    List<Filter> filters = queryObj.getFilter();
	    boolean delFlagExist = false;
	    for(Filter filter : filters) {
	        if(ValueUtil.isEqualIgnoreCase("del_flag", filter.getName())) {
	            delFlagExist = true;
	            break;
	        }
	    }
	    
	    if(!delFlagExist) {
	        Filter delFlagFilter = new Filter("del_flag", "=", "false");
	        filters.add(delFlagFilter);
	    }
		
	    return queryManager.selectPage(this.entityClass(), queryObj);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Find one by ID")
	public Inventory findOne(@PathVariable("id") String id) {
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
	public Inventory create(@RequestBody Inventory input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public Inventory update(@PathVariable("id") String id, @RequestBody Inventory input) {
		return this.updateOne(input);
	}
	
	/**
	 * PDA : 작업 화면 > 입고 적치 > 적치  
	 * @param id
	 * @param input
	 * @return
	 */
	@RequestMapping(value = "/work/load/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public Inventory updateWorkLoad(@PathVariable("id") String id, @RequestBody Inventory input) {
		Inventory inv = null;

		input.setId(id);
		
		List<Inventory> list = new ArrayList<Inventory>();
		list.add(input);
		
		if ( this.MultipleUpdateLoad(list) ) {
			inv = this.findOne(id);
		}
		
		return inv;
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<Inventory> list) {
		return this.cudMultipleData(this.entityClass(), list);
	}
	
	/**
	 * 재고 관리 > 입고 적치 작업 처리  
	 * 상태 : 입고 대기 > 보관 중 
	 * 로케이션 : 입력 받은 로케이션으로 변경 
	 * @param list
	 * @return
	 */
	@RequestMapping(value = "/load/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean MultipleUpdateLoad(@RequestBody List<Inventory> list) {
		
		List<Inventory> updateList = new ArrayList<Inventory>();
		
		for ( Inventory item : list ) {
			if ( ValueUtil.isEqual(item.getCudFlag_(), "u") && ValueUtil.isNotEmpty(item.getLocCd()) ) {
				
				item.setStatus(Inventory.STATUS_STORED);
				item.setLastTranCd(Inventory.TRANSACTION_IN);
				
				updateList.add(item);
			}
		}
		
		queryManager.updateBatch(this.entityClass(), updateList, "status", "lastTranCd", "locCd");
		
		return true;
	}
	
	/**
	 * 재고 관리 > 재고 조정 
	 * @param list
	 * @return
	 */
	@RequestMapping(value = "/adjust/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean MultipleUpdateAdjust(@RequestBody List<Inventory> list) {
		
		List<Inventory> updateList = new ArrayList<Inventory>();
		
		for ( Inventory item : list ) {
			if ( ValueUtil.isEqual(item.getCudFlag_(), "u") && ValueUtil.isNotEmpty(item.getInvQty()) ) {
				if ( ValueUtil.isNotEqual(this.findOne(item.getId()), item.getInvQty()) ) {
					if ( ValueUtil.isEmpty(item.getRemarks()) ) {
						throw new ElidomRuntimeException("재고 조정 사유를 반드시 입력해야 합니다.");
					}
					
					// 재고 정보 변경 
					item.setLastTranCd(Inventory.TRANSACTION_ADJUST);
					if ( item.getInvQty() <= 0 ) {
						// 재고가 0보다 작으면 상태 변경 : 비어있음 
						item.setStatus(Inventory.STATUS_EMPTY);
						item.setDelFlag(true);
					}
					updateList.add(item);
				}
			}
		}
		
		queryManager.updateBatch(this.entityClass(), updateList, "status", "lastTranCd", "delFlag", "invQty", "remarks");
		
		return true;
	}
	
}