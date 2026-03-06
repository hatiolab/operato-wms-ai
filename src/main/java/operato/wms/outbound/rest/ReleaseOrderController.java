package operato.wms.outbound.rest;

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

import operato.wms.outbound.entity.ReleaseOrder;
import operato.wms.outbound.entity.ReleaseOrderItem;
import operato.wms.outbound.query.store.OutboundQueryStore;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Order;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/release_orders")
@ServiceDesc(description = "ReleaseOrder Service API")
public class ReleaseOrderController extends AbstractRestService {

    /**
     * Outbound 모듈 쿼리 스토어
     */
    @Autowired
    protected OutboundQueryStore outbQueryStore;
    /**
     * 커스텀 서비스
     */
    @Autowired
    protected ICustomService customSvc;
    
	@Override
	protected Class<?> entityClass() {
		return ReleaseOrder.class;
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
	public ReleaseOrder findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}
	
	@RequestMapping(value = "item/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "ReleaseOrderItem find one by ID")
	public ReleaseOrderItem findOneItem(@PathVariable("id") String id) {
		return this.getOne(ReleaseOrderItem.class, id);
	}

	@RequestMapping(value = "/{id}/exist", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create")
	public ReleaseOrder create(@RequestBody ReleaseOrder input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public ReleaseOrder update(@PathVariable("id") String id, @RequestBody ReleaseOrder input) {
		return this.updateOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}

	@RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<ReleaseOrder> list) {
	    Long domainId = Domain.currentDomainId();
	    
        // 1. 출고 정보 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("list", list);
        this.customSvc.doCustomService(domainId, "diy-outb-pre-releases-update", customParams);
        
        // 2. 상태 체크
        for (ReleaseOrder item : list) {
            if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_UPDATE)) {
                if (ValueUtil.isNotEqual(item.getStatus(), ReleaseOrder.STATUS_REG)) {
                    throw new ElidomRuntimeException("[등록 중] 상태인 경우만 수정이 가능합니다.");
                }
            } else if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_DELETE)) {
            	if (ValueUtil.isNotEqual(this.findOne(item.getId()).getStatus(), ReleaseOrder.STATUS_REG)) {
            		throw new ElidomRuntimeException("[등록 중] 상태인 경우만 삭제가 가능합니다.");
            	}
            }
        }
        
        // 3. 출고 예정 상세 리스트 업데이트
        this.cudMultipleData(this.entityClass(), list);
        
        // 4. 입고 정보 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, "diy-outb-post-releases-update", customParams);

        // 5. 리턴
        return true;
	}

    @RequestMapping(value = "/{id}/items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Find Release Order Items By Release Order ID")
    public List<ReleaseOrderItem> findReleaseOrderItems(@PathVariable("id") String id, @RequestParam(name = "sort", required = false) String sort) {
        Query query = new Query();
        query.addFilter(new Filter("releaseOrderId", id));
        if (ValueUtil.isNotEmpty(sort) && sort.length() > 5) {
            query.addOrder(this.jsonParser.parse(sort, Order[].class));
        } else {
            query.addOrder("lineNo", true);
            query.addOrder("rank", true);
        }
        
        return this.queryManager.selectList(ReleaseOrderItem.class, query);
    }

    @RequestMapping(value = "/{id}/items/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update Multiple Release Order Items")
    public Boolean updateMultipleReleaseOrderItems(@PathVariable("id") String id, @RequestBody List<ReleaseOrderItem> releaseOrderItems) {
        // 1. 출고 예정 조회
        ReleaseOrder release = this.findOne(id);
        
        if(release == null) {
            throw new ElidomRuntimeException("출고 예정 정보가 존재하지 않습니다.");
        }
        
        // 2. 상태 체크
        if (ValueUtil.isNotEqual(release.getStatus(), ReleaseOrder.STATUS_REG)) {
            throw new ElidomRuntimeException("[등록 중] 상태인 경우만 수정이 가능합니다.");
        }        
        
        // 3. 출고 상세 정보 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("release,releaseItems", release, releaseOrderItems);
        this.customSvc.doCustomService(release.getDomainId(), "diy-outb-pre-release-items-update", customParams);
        
        // 4. Max 출고 라인 번호 조회
        String maxSeqSql = this.outbQueryStore.getNextReleaseOrderLineNo();
        Integer maxLineNo = this.queryManager.selectBySql(maxSeqSql, ValueUtil.newMap("domainId,releaseOrderId", release.getDomainId(), id), Integer.class);
        
        // 5. 출고 상세 주문 설정
        for(ReleaseOrderItem item : releaseOrderItems) {
            item.setReleaseOrderId(id);
            
            // 5.1 생성인 경우 주문 라인 번호 설정
            if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_CREATE)) {
                String nextLineNo = ValueUtil.toString(maxLineNo);
                // 주문 라인 번호 
                item.setLineNo(nextLineNo);
                // 출고 라인 번호
                item.setRlsLineNo(nextLineNo);
                maxLineNo++;
            }
            
            if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_CREATE) || ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_UPDATE)) {
            	// 5.2 생성 혹은 수정인 경우 상품 정보 체크
                if(ValueUtil.isEmpty(item.getSkuCd()) && ValueUtil.isEmpty(item.getSkuNm())) {
                    throw new ElidomRuntimeException("상품 정보가 존재하지 않습니다.");
                }
                
                // 5.3 예정 수량 정보 체크
                if(item.getOrdQty() == null || item.getOrdQty() <= 0.0f) {
                	throw new ElidomRuntimeException("출고 주문 수량이 존재하지 않거나 0보다 작습니다.");
                }
            }
            
            if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_DELETE) ) {
            	if (ValueUtil.isNotEqual(this.findOneItem(item.getId()).getStatus(), ReleaseOrderItem.STATUS_REG)) {
            		 throw new ElidomRuntimeException("[등록 중] 상태인 경우만 삭제가 가능합니다.");
            	}
            }
            
        }
        
        // 6. 출고 상세 주문 업데이트
        this.cudMultipleData(ReleaseOrderItem.class, releaseOrderItems);
        
        // 7. 출고 상세 정보 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(release.getDomainId(), "diy-outb-post-release-items-update", customParams);
        
        // 8. 리턴
        return true;
    }
    	
	@RequestMapping(value = "/rls_exe_type/{rls_exe_type}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Search (Pagination) By Search Conditions")
	public Page<?> searchReleaseOrderByRlsExeType(
			@PathVariable("rls_exe_type") String rlsExeType,
			@RequestParam(name = "page", required = false) Integer page,
			@RequestParam(name = "limit", required = false) Integer limit,
			@RequestParam(name = "select", required = false) String select,
			@RequestParam(name = "sort", required = false) String sort,
			@RequestParam(name = "query", required = false) String query) {
		
		Query queryObj = this.parseQuery(this.entityClass(), page, limit, select, sort, query);
		queryObj.removeFilter("rls_exe_type");
		queryObj.addFilter(new Filter("rls_exe_type", rlsExeType));
		queryObj.addOrder("createdAt", false);
		return queryManager.selectPage(this.entityClass(), queryObj);
	}
}