package operato.wms.stock.rest;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.stock.entity.Inventory;
import operato.wms.stock.model.InvTransaction;
import operato.wms.stock.service.InventoryTransactionService;
import xyz.anythings.sys.model.BaseResponse;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inventory_trx")
@ServiceDesc(description = "Inventory Service API")
public class InvTransactionController extends AbstractRestService {
    
    /**
     * 커스텀 서비스 - 재고 최초 입고 (putaway) 전 처리
     */
    public static final String TRX_INV_PRE_PUTAWAY_INVENTORY = "diy-inv-pre-putaway-inventory";
    /**
     * 커스텀 서비스 - 재고 최초 입고 (putaway) 후 처리
     */
    public static final String TRX_INV_POST_PUTAWAY_INVENTORY = "diy-inv-post-putaway-inventory";
    /**
     * 커스텀 서비스 - 재고 이동 전 처리
     */
    public static final String TRX_INV_PRE_MOVE_INVENTORY = "diy-inv-pre-move-inventory";
    /**
     * 커스텀 서비스 - 재고 이동 후 처리
     */
    public static final String TRX_INV_POST_MOVE_INVENTORY = "diy-inv-post-move-inventory";
    /**
     * 커스텀 서비스 - 폐기 이동 전 처리
     */
    public static final String TRX_INV_PRE_SCRAP_INVENTORY = "diy-inv-pre-scrap-inventory";
    /**
     * 커스텀 서비스 - 폐기 이동 후 처리
     */
    public static final String TRX_INV_POST_SCRAP_INVENTORY = "diy-inv-post-scrap-inventory";
    /**
     * 커스텀 서비스 - 분할 전 처리
     */
    public static final String TRX_INV_PRE_SPLIT_INVENTORY = "diy-inv-pre-split-inventory";
    /**
     * 커스텀 서비스 - 분할 후 처리
     */
    public static final String TRX_INV_POST_SPLIT_INVENTORY = "diy-inv-post-split-inventory";
    /**
     * 커스텀 서비스 - 병합 전 처리
     */
    public static final String TRX_INV_PRE_MERGE_INVENTORY = "diy-inv-pre-merge-inventory";
    /**
     * 커스텀 서비스 - 병합 후 처리
     */
    public static final String TRX_INV_POST_MERGE_INVENTORY = "diy-inv-post-merge-inventory";
    /**
     * 커스텀 서비스 - 홀드 전 처리
     */
    public static final String TRX_INV_PRE_HOLD_INVENTORY = "diy-inv-pre-hold-inventory";
    /**
     * 커스텀 서비스 - 홀드 후 처리
     */
    public static final String TRX_INV_POST_HOLD_INVENTORY = "diy-inv-post-hold-inventory";
    /**
     * 커스텀 서비스 - 홀드 해제 전 처리
     */
    public static final String TRX_INV_PRE_RELEASE_HOLD_INVENTORY = "diy-inv-pre-release-hold-inventory";
    /**
     * 커스텀 서비스 - 홀드 해제 후 처리
     */
    public static final String TRX_INV_POST_RELEASE_HOLD_INVENTORY = "diy-inv-post-release-hold-inventory";
    /**
     * 커스텀 서비스 - 재고 조정 전 처리
     */
    public static final String TRX_INV_PRE_ADJUST_INVENTORY = "diy-inv-pre-adjust-inventory";
    /**
     * 커스텀 서비스 - 재고 조정 후 처리
     */
    public static final String TRX_INV_POST_ADJUST_INVENTORY = "diy-inv-post-adjust-inventory";

    /**
     * 재고 트랜잭션 서비스
     */
    @Autowired
    private InventoryTransactionService invTrxSvc;
    /**
     * 커스텀 서비스
     */
    @Autowired
    private ICustomService customSvc;
    
    @Override
    protected Class<?> entityClass() {
        return Inventory.class;
    }
    
    @RequestMapping(value = "/put_away/list", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Put away")
    public BaseResponse putAwayList(@RequestBody Map<String, List<InvTransaction>> data) {
        List<InvTransaction> list = data.get("list");
        
        for(InvTransaction inv : list) {
            this.putAway(inv);
        }
        
        return new BaseResponse(true, "ok");
    }
    
    @RequestMapping(value = "/put_away", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Put away")
    public Inventory putAway(@RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        
        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_PUTAWAY_INVENTORY, TRX_INV_POST_PUTAWAY_INVENTORY);
        
        if(customResult == null) {
            // 적치 처리
            Inventory inventory = this.invTrxSvc.putAway(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_PUTAWAY_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴 
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/put_away/{inventory_id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Put away")
    public Inventory putAway(@PathVariable("inventory_id") String inventoryId, @RequestBody InvTransaction input) {
        // 1. 커스텀 서비스 처리
        Long domainId = Domain.currentDomainId();
        input.setId(inventoryId);
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_PUTAWAY_INVENTORY, TRX_INV_POST_PUTAWAY_INVENTORY);
        
        if(customResult == null) {
            // 2. 적치 처리
            Inventory inventory = this.invTrxSvc.putAway(domainId, input);
            // 3. 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_PUTAWAY_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 4. 리턴 
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/{id}/move_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Move Inventory")
    public Inventory moveInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);
        
        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_MOVE_INVENTORY, TRX_INV_POST_MOVE_INVENTORY);

        if(customResult == null) {
            // 재고 이동 처리 
            Inventory inventory = this.invTrxSvc.moveInventory(domainId, input);            
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_MOVE_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/{id}/scrap_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Move Inventory To Scrap Zone")
    public Inventory scrapInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);
        
        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_SCRAP_INVENTORY, TRX_INV_POST_SCRAP_INVENTORY);
        
        if(customResult == null) {
            // 재고 스크랩 로케이션 이동 처리
            Inventory inventory = this.invTrxSvc.scrapInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_SCRAP_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/{id}/split_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Split Inventory")
    public Inventory splitInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);
        
        // 커스텀 서비스 전 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_SPLIT_INVENTORY, TRX_INV_POST_SPLIT_INVENTORY);
        
        if(customResult == null) {
            // 재고 분할 처리
            Inventory inventory = this.invTrxSvc.splitInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_SPLIT_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/{id}/merge_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Merge Inventory")
    public Inventory mergeInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);
        
        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_MERGE_INVENTORY, TRX_INV_POST_MERGE_INVENTORY);
        
        if(customResult == null) {
            // 재고 분할 처리
            Inventory inventory = this.invTrxSvc.mergeInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_MERGE_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/{id}/hold_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Hold Inventory")
    public Inventory holdInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);
        
        // 커스텀 서비스 전 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_HOLD_INVENTORY, TRX_INV_POST_HOLD_INVENTORY);
        
        if(customResult == null) {
            // 재고 홀드 처리
            Inventory inventory = this.invTrxSvc.holdInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_HOLD_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/{id}/release_hold_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Release Hold Inventory")
    public Inventory releaseHoldInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);
        
        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_RELEASE_HOLD_INVENTORY, TRX_INV_POST_RELEASE_HOLD_INVENTORY);

        if(customResult == null) {
            // 재고 홀드 해제 처리
            Inventory inventory = this.invTrxSvc.releaseHoldInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_RELEASE_HOLD_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    @RequestMapping(value = "/{id}/adjust_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Adjust Inventory")
    public Inventory adjustInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);
        
        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input), TRX_INV_PRE_ADJUST_INVENTORY, TRX_INV_POST_ADJUST_INVENTORY);
        
        if(customResult == null) {
            // 재고 조정 처리
            Inventory inventory = (customResult == null) ? this.invTrxSvc.adjustInventory(domainId, input) : (Inventory)customResult;                
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_ADJUST_INVENTORY, ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;
            
        } else {
            // 리턴
            return (Inventory)customResult;
        }
    }
    
    /**
     * 커스텀 서비스 처리
     * 
     * @param domainId
     * @param custSvcParams
     * @param preSvcName
     * @param postSvcName
     * @return
     */
    private Object doCustomService(Long domainId, Map<String, Object> custSvcParams, String preSvcName, String postSvcName) {
        // 
        Object preSvcResult = this.customSvc.doCustomService(domainId, preSvcName, custSvcParams);
        
        // return 값이 true 이면 커스텀 서비스에서 완전 커스터마이징 처리 
        if(preSvcResult != null && preSvcResult instanceof Boolean && ValueUtil.toBoolean(preSvcResult) == true) {
            Object postSvcResult = this.customSvc.doCustomService(domainId, postSvcName, custSvcParams);
            return postSvcResult instanceof Inventory ? (Inventory)postSvcResult : null;
        } else {
            return null;
        }
    }

    /********************************************************************************************************
     * 대 시 보 드   A P I
     ********************************************************************************************************/

    /**
     * 대시보드 - 재고 현황 조회
     *
     * GET /rest/inventory_trx/dashboard/status-counts
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 재고 현황 Map
     */
    @RequestMapping(value = "/dashboard/status-counts", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Get Dashboard Status Counts")
    public Map<String, Object> getDashboardStatusCounts(
            @org.springframework.web.bind.annotation.RequestParam(name = "com_cd", required = false) String comCd,
            @org.springframework.web.bind.annotation.RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.invTrxSvc.getDashboardStatusCounts(comCd, whCd);
    }

    /**
     * 대시보드 - 재고 상태별 통계 조회
     *
     * GET /rest/inventory_trx/dashboard/status-stats
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 상태별 수량 Map { status: qty }
     */
    @RequestMapping(value = "/dashboard/status-stats", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Get Dashboard Status Statistics")
    public Map<String, Object> getDashboardStatusStats(
            @org.springframework.web.bind.annotation.RequestParam(name = "com_cd", required = false) String comCd,
            @org.springframework.web.bind.annotation.RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.invTrxSvc.getDashboardStatusStats(comCd, whCd);
    }

    /**
     * 대시보드 - 유효기한 상태별 통계 조회
     *
     * GET /rest/inventory_trx/dashboard/expire-stats
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 유효기한 상태별 통계 Map { expireStatus: { sku_count, qty } }
     */
    @RequestMapping(value = "/dashboard/expire-stats", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Get Dashboard Expire Statistics")
    public Map<String, Object> getDashboardExpireStats(
            @org.springframework.web.bind.annotation.RequestParam(name = "com_cd", required = false) String comCd,
            @org.springframework.web.bind.annotation.RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.invTrxSvc.getDashboardExpireStats(comCd, whCd);
    }

    /**
     * 대시보드 - 로케이션 유형별 통계 조회
     *
     * GET /rest/inventory_trx/dashboard/location-stats
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 로케이션 유형별 통계 Map { locGroup: { total, used, usage_rate } }
     */
    @RequestMapping(value = "/dashboard/location-stats", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Get Dashboard Location Statistics")
    public Map<String, Object> getDashboardLocationStats(
            @org.springframework.web.bind.annotation.RequestParam(name = "com_cd", required = false) String comCd,
            @org.springframework.web.bind.annotation.RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.invTrxSvc.getDashboardLocationStats(comCd, whCd);
    }

    /**
     * 대시보드 - 알림 데이터 조회
     *
     * GET /rest/inventory_trx/dashboard/alerts
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 알림 목록 List<Map<String, Object>>
     */
    @RequestMapping(value = "/dashboard/alerts", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Get Dashboard Alerts")
    public List<Map<String, Object>> getDashboardAlerts(
            @org.springframework.web.bind.annotation.RequestParam(name = "com_cd", required = false) String comCd,
            @org.springframework.web.bind.annotation.RequestParam(name = "wh_cd", required = false) String whCd) {
        return this.invTrxSvc.getDashboardAlerts(comCd, whCd);
    }
}
