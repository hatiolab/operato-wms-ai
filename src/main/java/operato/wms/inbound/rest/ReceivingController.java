package operato.wms.inbound.rest;

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

import operato.wms.inbound.WmsInboundConstants;
import operato.wms.inbound.entity.Receiving;
import operato.wms.inbound.entity.ReceivingItem;
import operato.wms.inbound.query.store.InboundQueryStore;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.core.rest.CodeController;
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
@RequestMapping("/rest/receivings")
@ServiceDesc(description = "Receiving Service API")
public class ReceivingController extends AbstractRestService {
	
    /**
     * Inbound 모듈 쿼리 스토어
     */
    @Autowired
    protected InboundQueryStore inbQueryStore;
    /**
     * 코드 컨트롤러
     */
	@Autowired
	protected CodeController codeCtrl;
	/**
	 * 커스텀 서비스
	 */
    @Autowired
    protected ICustomService customSvc;
	
	@Override
	protected Class<?> entityClass() {
		return Receiving.class;
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
	public Receiving findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}
	
	@RequestMapping(value = "/item/{id}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Receiving item find one by ID")
	public ReceivingItem findOneItem(@PathVariable("id") String id) {
		return this.getOne(ReceivingItem.class, id);
	}

	@RequestMapping(value = "/{id}/exist", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description = "Create")
	public Receiving create(@RequestBody Receiving input) {
		return this.createOne(input);
	}

	@RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description = "Update")
	public Receiving update(@PathVariable("id") String id, @RequestBody Receiving input) {
		return this.updateOne(input);
	}
	
    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void delete(@PathVariable("id") String id) {
        this.deleteOne(this.entityClass(), id);
    }
    
    @RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Create, Update or Delete multiple at one time")
    public Boolean multipleUpdate(@RequestBody List<Receiving> list) {
        Long domainId = Domain.currentDomainId();
        
        // 1. 입고 정보 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("list", list);
        this.customSvc.doCustomService(domainId, "diy-inb-pre-receivings-update", customParams);

        // 2. 상태 체크
        for (Receiving item : list) {
        	if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_UPDATE)) {
        		if (ValueUtil.isNotEqual(item.getStatus(), WmsInboundConstants.STATUS_INWORK)) {
        			throw new ElidomRuntimeException("[작성 중] 상태인 경우만 수정이 가능합니다.");
        		}
        	} else if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_DELETE)) {
        		if (ValueUtil.isNotEqual(this.findOne(item.getId()).getStatus(), WmsInboundConstants.STATUS_INWORK)) {
        			throw new ElidomRuntimeException("[작성 중] 상태인 경우만 삭제가 가능합니다.");
        		}
        	}
        }
        
        // 3. 입고 정보 업데이트
        this.cudMultipleData(this.entityClass(), list);
        
        // 4. 입고 정보 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, "diy-inb-post-receivings-update", customParams);
        
        // 5. 리턴
        return true;
    }
    
    @RequestMapping(value = "/{id}/items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Receiving Items By Receiving ID")
    public List<ReceivingItem> searchReceivingItems(
            @PathVariable("id") String id,
            @RequestParam(name = "sort", required = false) String sort) {
        
        Query query = new Query();
        query.addFilter(new Filter("receivingId", id));
        
        if (ValueUtil.isNotEmpty(sort) && sort.length() > 5) {
            query.addOrder(this.jsonParser.parse(sort, Order[].class));
        } else {
            query.addOrder("rcv_seq", true);
        }
        
        return this.queryManager.selectList(ReceivingItem.class, query);
    }
    
    @RequestMapping(value = "/{id}/items/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update Multiple Receiving Items")
    public Boolean multipleUpdateReceivingItems(
            @PathVariable("id") String id,
            @RequestBody List<ReceivingItem> receivingItems) {
        
        // 1. 입고 예정 조회
        Receiving rcv = this.findOne(id);
        
        if(rcv == null) {
            throw new ElidomRuntimeException("입고 예정 정보가 존재하지 않습니다.");
        }
        
        // 2. 상태 체크
        if (ValueUtil.isNotEqual(rcv.getStatus(), WmsInboundConstants.STATUS_INWORK)) {
            throw new ElidomRuntimeException("[작성 중] 상태인 경우만 수정이 가능합니다.");
        }        
        
        // 3. 입고 상세 정보 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("receiving,receivingItems", rcv, receivingItems);
        this.customSvc.doCustomService(rcv.getDomainId(), "diy-inb-pre-receiving-items-update", customParams);
        
        // 4. 입고 예정 순번, 입고 순번 Max Seq 조회
        String maxSeqSql = this.inbQueryStore.getMaxReceivingItemSeq();
        ReceivingItem maxSeq = this.queryManager.selectBySql(maxSeqSql, ValueUtil.newMap("receivingId", id), ReceivingItem.class);
        int maxRcvExpSeq = maxSeq.getRcvExpSeq();
        int maxRcvSeq = maxSeq.getRcvSeq();
        
        // 5. 입고 상세 정보 체크
        for(ReceivingItem item : receivingItems) {
            String cudFlag = item.getCudFlag_();
            
            // 5.1 생성인 경우 입고 순번 설정
            if (ValueUtil.isEqualIgnoreCase(cudFlag, SysConstants.CUD_FLAG_CREATE)) {
                // 최초 생성인 경우 초기 값 설정
                item.setReceivingId(id);
                // 입고 예정 순번
                item.setRcvExpSeq(maxRcvExpSeq++);
                // 입고 순번
                item.setRcvSeq(maxRcvSeq++);
                // 입고 예정일
                item.setRcvExpDate(rcv.getRcvReqDate());
            }
            
            if (ValueUtil.isEqualIgnoreCase(cudFlag, SysConstants.CUD_FLAG_CREATE) || ValueUtil.isEqualIgnoreCase(cudFlag, SysConstants.CUD_FLAG_UPDATE)) {
            	// 5.2 생성 혹은 수정인 경우 상품 정보 체크
                if(ValueUtil.isEmpty(item.getSkuCd()) && ValueUtil.isEmpty(item.getSkuNm())) {
                    throw new ElidomRuntimeException("상품 정보가 존재하지 않습니다.");
                }
                
                // 5.3 예정 수량 정보 체크
                if(item.getRcvExpQty() == null || item.getRcvExpQty() <= 0.0f) {
                	throw new ElidomRuntimeException("입고 예정 수량이 존재하지 않거나 0보다 작습니다.");
                }
            }
        }
        
        // 6. 입고 예정 상세 리스트 업데이트
        this.cudMultipleData(ReceivingItem.class, receivingItems);
        
        // 7. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(rcv.getDomainId(), "diy-inb-post-receiving-items-update", customParams);
        
        // 8. 리턴
        return true;
    }
}