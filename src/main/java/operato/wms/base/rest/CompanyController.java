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

import operato.wms.base.entity.Company;
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
@RequestMapping("/rest/companies")
@ServiceDesc(description = "Company Service API")
public class CompanyController extends AbstractRestService {
	
	/**
     * 커스텀 서비스 - MultipleUpdate 전 처리
     */
    public static final String TRX_COM_PRE_MULTIPLE_UPDATE = "diy-com-pre-multiple-update";
    /**
     * 커스텀 서비스 - MultipleUpdate 후 처리
     */
    public static final String TRX_COM_POST_MULTIPLE_UPDATE = "diy-com-post-multiple-update";
    
    /**
     * 커스텀 서비스
     */
    @Autowired
    private ICustomService customSvc;
	
    @Override
    protected Class<?> entityClass() {
        return Company.class;
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
    public Company findOne(@PathVariable("id") String id) {
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
    public Company create(@RequestBody Company input) {
        return this.createOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update")
    public Company update(@PathVariable("id") String id, @RequestBody Company input) {
        return this.updateOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void delete(@PathVariable("id") String id) {
        this.deleteOne(this.entityClass(), id);
    }

    @RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Create, Update or Delete multiple at one time")
    public Boolean multipleUpdate(@RequestBody List<Company> list) {
		// 화주사 정보 변경 분에 대하여 mw에 반영 
		// this.setMwQueueList(list);
		
        // 1. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("domain_id,list", Domain.currentDomainId(), list);
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_COM_PRE_MULTIPLE_UPDATE, custSvcParams);
        
        // 2. 업데이트 
        this.cudMultipleData(this.entityClass(), list);
        
        // 3. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_COM_POST_MULTIPLE_UPDATE, custSvcParams);
    	
        return true;
    }
    
	/**
	 * 화주사 정보 변경 분에 대해 mw 반영 
	 * @param list
	 */
	/*private void setMwQueueList(List<Company> list) {
		// 현재 도메인 검색 
		Domain domain = Domain.currentDomain();
		
		// 도메인에 siteCd 가 있을 경우에만 MW 이벤트 발생 
		if(ValueUtil.isNotEmpty(domain.getMwSiteCd())) {
			// 화주사 내용 변경 분에 대한 rabbitmq 에서의 이벤트 처리 리스트 
			List<IQueueNameModel> queueModels = new ArrayList<IQueueNameModel>();
			
			for(Company company : list) {
				// Update 는 기존 Queue 이름에 대한 조회가 필요 
				if(company.getCudFlag_().equalsIgnoreCase(SysConstants.CUD_FLAG_UPDATE)) {
					Company befCompany = this.findOne(company.getId());
					
					// StageCd 가 변경 되면 이벤트 발생  
					if(ValueUtil.isNotEqual(befCompany.getComCd(), company.getComCd())) {
						queueModels.add(new MwQueueNameModel(domain.getId(), domain.getMwSiteCd(), befCompany.getComCd(), company.getComCd(), company.getCudFlag_()));
					}
					
				} else {
					queueModels.add(new MwQueueNameModel(domain.getId(), domain.getMwSiteCd(), null, company.getComCd(), company.getCudFlag_()));
				}
			}
			
			if(queueModels.size() > 0 ) {
				MwQueueManageEvent event = new MwQueueManageEvent(domain.getId(), queueModels);
				eventPublisher.publishEvent(event);
			}
		}
	} */  
    
//    /**
//     * 애플리케이션 초기화 시점에 생성할 M/W 큐 리스트를 조회
//     * 
//     * @param event
//     */
//	@EventListener(condition = "#event.isExecuted() == false")
//	@Order(Ordered.LOWEST_PRECEDENCE)
//	public void getRabbitMqVhostQueueList(MwQueueListEvent event) {
//		Company condCompany = new Company();
//		condCompany.setDomainId(event.getDomainId());
//		
//		List<Company> companyList = this.queryManager.selectList(Company.class, condCompany);
//		List<String> queueNames = new ArrayList<String>(companyList.size());
//		
//		for(Company comp : companyList) {
//			queueNames.add(comp.getComCd());
//		}
//		
//		event.setQueueNames(queueNames);
//		event.setExecuted(true);
//	}
}