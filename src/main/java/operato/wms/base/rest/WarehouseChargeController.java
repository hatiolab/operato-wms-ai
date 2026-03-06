package operato.wms.base.rest;

import java.util.ArrayList;
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

import operato.wms.base.entity.WarehouseCharge;
import operato.wms.base.entity.WarehouseChargeSetting;
import operato.wms.base.entity.WarehouseChargeSettingItem;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Order;
import xyz.elidom.dbist.dml.Page;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/warehouse_charges")
@ServiceDesc(description="WarehouseCharge Service API")
public class WarehouseChargeController extends AbstractRestService {
	
	/**
     * 커스텀 서비스 - 정산 마감 전 처리 
     */
    public static final String TRX_WC_PRE_LINES_FINISH_WAREHOUSE_CHARGE = "diy-wc-pre-lines-finish-warehouse-charge";
    /**
     * 커스텀 서비스 - 정산 마감 후 처리 
     */
    public static final String TRX_WC_POST_LINES_FINISH_WAREHOUSE_CHARGE = "diy-wc-post-lines-finish-warehouse-charge";
    /**
     * 커스텀 서비스 - 정산 마감 취소 전 처리 
     */
    public static final String TRX_WC_PRE_LINES_CANCEL_WAREHOUSE_CHARGE = "diy-wc-pre-lines-cancel-warehouse-charge";
    /**
     * 커스텀 서비스 - 정산 마감 취소 후 처리 
     */
    public static final String TRX_WC_POST_LINES_CANCEL_WAREHOUSE_CHARGE = "diy-wc-post-lines-cancel-warehouse-charge";
    /**
     * 커스텀 서비스 - 정산 등록 전 처리 
     */
    public static final String TRX_WC_PRE_WAREHOUSE_CHARGE_UPDATE = "diy-wc-pre-warehouse-charge-update";
    /**
     * 커스텀 서비스 - 정산 등록 후 처리 
     */
    public static final String TRX_WC_POST_WAREHOUSE_CHARGE_UPDATE = "diy-wc-post-warehouse-charge-update";
    
    /**
     * 커스텀 서비스
     */
    @Autowired
    private ICustomService customSvc;

	@Override
	protected Class<?> entityClass() {
		return WarehouseCharge.class;
	}
  
	@RequestMapping(method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Search (Pagination) By Search Conditions")  
	public Page<?> index(
		@RequestParam(name="page", required=false) Integer page, 
		@RequestParam(name="limit", required=false) Integer limit, 
		@RequestParam(name="select", required=false) String select, 
		@RequestParam(name="sort", required=false) String sort,
		@RequestParam(name="query", required=false) String query) {   
		return this.search(this.entityClass(), page, limit, select, sort, query);
	}

	@RequestMapping(value="/{id}", method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Find one by ID")
	public WarehouseCharge findOne(@PathVariable("id") String id) {
		return this.getOne(this.entityClass(), id);
	}
	
	@RequestMapping(value="/setting/{wh_cd}/{com_cd}/{setting_cd}", method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Find one setting by setting code")
	public WarehouseChargeSetting findOneSettingBySeetingCd(
			@PathVariable("wh_cd") String whCd,
			@PathVariable("com_cd") String comCd,
			@PathVariable("setting_cd") String settingCd) {
		
		WarehouseChargeSetting setting = new WarehouseChargeSetting();
		setting.setDomainId(Domain.currentDomainId());
		setting.setWhCd(whCd);
		setting.setComCd(comCd);
		setting.setSettingCd(settingCd);
		
		return this.queryManager.selectByCondition(WarehouseChargeSetting.class, setting);
	}

	@RequestMapping(value="/{id}/exist", method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Check exists By ID")
	public Boolean isExist(@PathVariable("id") String id) {
		return this.isExistOne(this.entityClass(), id);
	}

	@RequestMapping(method=RequestMethod.POST, consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@ApiDesc(description="Create")
	public WarehouseCharge create(@RequestBody WarehouseCharge input) {
		return this.createOne(input);
	}

	@RequestMapping(value="/{id}", method=RequestMethod.PUT, consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Update")
	public WarehouseCharge update(@PathVariable("id") String id, @RequestBody WarehouseCharge input) {
		return this.updateOne(input);
	}
  
	@RequestMapping(value="/{id}", method=RequestMethod.DELETE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Delete")
	public void delete(@PathVariable("id") String id) {
		this.deleteOne(this.entityClass(), id);
	}  
  
	@RequestMapping(value="/update_multiple", method=RequestMethod.POST, consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Create, Update or Delete multiple at one time")
	public Boolean multipleUpdate(@RequestBody List<WarehouseCharge> list) {
		Long domainId = Domain.currentDomainId();
		
		// 정산 등록 전 처리 커스텀 서비스 호출
		Map<String, Object> customParams = ValueUtil.newMap("list", list);
        this.customSvc.doCustomService(domainId, TRX_WC_PRE_WAREHOUSE_CHARGE_UPDATE, customParams);
		
		for ( WarehouseCharge item : list ) {
        	if ( ValueUtil.isEqual(item.getStatus(), WarehouseCharge.STATUS_END) ) {
        		throw new ElidomRuntimeException("마감된 정산은 수정 할 수 없습니다. " + item.getChargeNo() );
        	}
        }
		
		// 정산 등록 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_WC_POST_WAREHOUSE_CHARGE_UPDATE, customParams);
		
		return this.cudMultipleData(this.entityClass(), list);
	}
	
	@RequestMapping(value="/settings/update_multiple", method=RequestMethod.POST, consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Create, Update or Delete multiple at one time")
	public Boolean multipleUpdateWarehouseChargeSetting(@RequestBody List<WarehouseChargeSetting> list) {
		return this.cudMultipleData(WarehouseChargeSetting.class, list);
	}
	
	@RequestMapping(value="/settings/{id}/items/update_multiple", method=RequestMethod.POST, consumes=MediaType.APPLICATION_JSON_VALUE, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Create, Update or Delete multiple at one time")
	public Boolean multipleUpdateWarehouseChargeSettingDetail(
			@PathVariable("id") String id,
			@RequestBody List<WarehouseChargeSettingItem> list) {
		for ( WarehouseChargeSettingItem detail : list ) {
			detail.setWarehouseChargeSettingId(id);
		}
		
		return this.cudMultipleData(WarehouseChargeSettingItem.class, list);
	}
	
	@RequestMapping(value="/settings", method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Search (Pagination) By Search Conditions")  
	public Page<?> searchSettings(
		@RequestParam(name="page", required=false) Integer page, 
		@RequestParam(name="limit", required=false) Integer limit, 
		@RequestParam(name="select", required=false) String select, 
		@RequestParam(name="sort", required=false) String sort,
		@RequestParam(name="query", required=false) String query) {
		
		return this.search(WarehouseChargeSetting.class, page, limit, select, sort, query);
	}
	
	@RequestMapping(value="/settings/{id}/items", method=RequestMethod.GET, produces=MediaType.APPLICATION_JSON_VALUE)
	@ApiDesc(description="Search (Pagination) By Search Conditions")  
	public List<WarehouseChargeSettingItem> searchSettingsDetails(
		@PathVariable("id") String id,
		@RequestParam(name="sort", required=false) String sort) {
		
		Query query = new Query();
		query.addFilter(new Filter("warehouseChargeSettingId", id));
		
		if (ValueUtil.isNotEmpty(sort) && sort.length() > 5) {
			query.addOrder(this.jsonParser.parse(sort, Order[].class));
		} else {
		    query.addOrder("rank", true);
		}
		
		return this.queryManager.selectList(WarehouseChargeSettingItem.class, query);
		
	}
	
	@RequestMapping(value = "lines/finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Finish Warehouse Charge Lines")
    public List<WarehouseCharge> finishWarehouseChargeLines(
            @RequestBody Map<String, List<WarehouseCharge>> data,
            @RequestParam(name = "printerId", required = false) String printerId) {
        
        // 1. 리스트 처리
        List<WarehouseCharge> list = data.get("list");
        
        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("warehouseCharges", list);
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_WC_PRE_LINES_FINISH_WAREHOUSE_CHARGE, custSvcParams);
        
        List<WarehouseCharge> listToFinish = new ArrayList<WarehouseCharge>();
        
        String endYear = DateUtil.getYear();
        String endMonth = DateUtil.getMonth();
        
        // 3. 마감 처리 
        for ( WarehouseCharge item : list ) {
        	if ( ValueUtil.isNotEqual(item.getStatus(), WarehouseCharge.STATUS_READY) ) {
        		throw new ElidomRuntimeException("마감 작업은 대기 상태의 정산만 가능합니다. " + item.getChargeNo() );
        	} else {
        		// 상태 : 대기 > 마감 
        		item.setStatus(WarehouseCharge.STATUS_END);
        		if ( ValueUtil.isEmpty(item.getEndYear()) && ValueUtil.isEmpty(item.getEndMonth()) ) {
        			// 마감 년/월 정보가 없는 경우 : 최초 마감시 (수정된 경우 수정된 값 유지) 
        			item.setEndYear(endYear);
        			item.setEndMonth(endMonth);
        		}
        		listToFinish.add(this.queryManager.update(WarehouseCharge.class, item, "endYear", "endMonth", "status"));
        	}
        }
        
        // 4. 후 처리 커스텀 서비스 호출
        custSvcParams.put("warehouseCharges", listToFinish);
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_WC_POST_LINES_FINISH_WAREHOUSE_CHARGE, custSvcParams);

        // 5. 정산 마감 리스트 리턴
        return listToFinish;
    }
	
	@RequestMapping(value = "lines/cancel", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Warehouse Charge Lines")
    public List<WarehouseCharge> cancelWarehouseChargeLines(
            @RequestBody Map<String, List<WarehouseCharge>> data,
            @RequestParam(name = "printerId", required = false) String printerId) {
        
        // 1. 리스트 처리
        List<WarehouseCharge> list = data.get("list");
        
        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("warehouseCharges", list);
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_WC_PRE_LINES_CANCEL_WAREHOUSE_CHARGE, custSvcParams);
        
        List<WarehouseCharge> listToFinish = new ArrayList<WarehouseCharge>();
        
        // 3. 마감 취소 처리 
        for ( WarehouseCharge item : list ) {
        	if ( ValueUtil.isNotEqual(item.getStatus(), WarehouseCharge.STATUS_END) ) {
        		throw new ElidomRuntimeException("마감 취소 작업은 마감 상태의 정산만 가능합니다. " + item.getChargeNo() );
        	} else {
        		// 상태 : 마감 > 대기  
        		item.setStatus(WarehouseCharge.STATUS_READY);
        		listToFinish.add(this.queryManager.update(WarehouseCharge.class, item, "status"));
        	}
        }
        
        // 4. 후 처리 커스텀 서비스 호출
        custSvcParams.put("warehouseCharges", listToFinish);
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_WC_POST_LINES_CANCEL_WAREHOUSE_CHARGE, custSvcParams);

        // 5. 정산 마감 취소 리스트 리턴
        return listToFinish;
    }

}