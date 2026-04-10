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

/**
 * 재고 트랜잭션 컨트롤러
 *
 * 재고 적치(putaway), 이동, 폐기, 분할, 병합, 홀드/해제, 조정 등
 * 재고 상태를 변경하는 트랜잭션 API를 제공한다.
 * Base URL: /rest/inventory_trx
 *
 * 각 API는 DIY 커스텀 서비스(pre/post hook)를 지원한다.
 * pre 훅에서 true를 반환하면 기본 처리를 건너뛰고 커스텀 로직으로 대체된다.
 *
 * @author HatioLab
 */
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

    /**
     * 재고 적치 일괄 처리
     *
     * POST /rest/inventory_trx/put_away/list
     *
     * @param data { list: [ InvTransaction, ... ] } 형태의 요청 바디
     * @return 처리 결과 BaseResponse
     */
    @RequestMapping(value = "/put_away/list", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Put away")
    public BaseResponse putAwayList(@RequestBody Map<String, List<InvTransaction>> data) {
        List<InvTransaction> list = data.get("list");

        for (InvTransaction inv : list) {
            this.putAway(inv);
        }

        return new BaseResponse(true, "ok");
    }

    /**
     * 재고 신규 적치
     *
     * POST /rest/inventory_trx/put_away
     *
     * 입고된 상품을 지정 로케이션에 재고로 등록한다.
     * DIY: diy-inv-pre-putaway-inventory / diy-inv-post-putaway-inventory
     *
     * @param input 적치 트랜잭션 정보 (로케이션, SKU, 수량 등)
     * @return 생성된 재고 엔티티
     */
    @RequestMapping(value = "/put_away", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Put away")
    public Inventory putAway(@RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();

        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_PUTAWAY_INVENTORY, TRX_INV_POST_PUTAWAY_INVENTORY);

        if (customResult == null) {
            // 적치 처리
            Inventory inventory = this.invTrxSvc.putAway(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_PUTAWAY_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 기존 적치 수정
     *
     * PUT /rest/inventory_trx/put_away/{inventory_id}
     *
     * 기존 재고 레코드를 대상으로 로케이션·수량 등을 갱신한다.
     * DIY: diy-inv-pre-putaway-inventory / diy-inv-post-putaway-inventory
     *
     * @param inventoryId 수정할 재고 ID
     * @param input       적치 트랜잭션 정보
     * @return 수정된 재고 엔티티
     */
    @RequestMapping(value = "/put_away/{inventory_id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Put away")
    public Inventory putAway(@PathVariable("inventory_id") String inventoryId, @RequestBody InvTransaction input) {
        // 1. 커스텀 서비스 처리
        Long domainId = Domain.currentDomainId();
        input.setId(inventoryId);
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_PUTAWAY_INVENTORY, TRX_INV_POST_PUTAWAY_INVENTORY);

        if (customResult == null) {
            // 2. 적치 처리
            Inventory inventory = this.invTrxSvc.putAway(domainId, input);
            // 3. 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_PUTAWAY_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 4. 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 이동
     *
     * POST /rest/inventory_trx/{id}/move_inventory
     *
     * 재고를 현재 로케이션에서 다른 로케이션으로 이동한다.
     * DIY: diy-inv-pre-move-inventory / diy-inv-post-move-inventory
     *
     * @param id    이동할 재고 ID
     * @param input 이동 트랜잭션 정보 (목적지 로케이션 등)
     * @return 이동된 재고 엔티티
     */
    @RequestMapping(value = "/{id}/move_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Move Inventory")
    public Inventory moveInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);

        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_MOVE_INVENTORY, TRX_INV_POST_MOVE_INVENTORY);

        if (customResult == null) {
            // 재고 이동 처리
            Inventory inventory = this.invTrxSvc.moveInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_MOVE_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 폐기 처리
     *
     * POST /rest/inventory_trx/{id}/scrap_inventory
     *
     * 재고를 폐기 존(scrap zone)으로 이동하고 상태를 BAD로 변경한다.
     * DIY: diy-inv-pre-scrap-inventory / diy-inv-post-scrap-inventory
     *
     * @param id    폐기할 재고 ID
     * @param input 폐기 트랜잭션 정보 (폐기 사유 등)
     * @return 폐기 처리된 재고 엔티티
     */
    @RequestMapping(value = "/{id}/scrap_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Move Inventory To Scrap Zone")
    public Inventory scrapInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);

        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_SCRAP_INVENTORY, TRX_INV_POST_SCRAP_INVENTORY);

        if (customResult == null) {
            // 재고 스크랩 로케이션 이동 처리
            Inventory inventory = this.invTrxSvc.scrapInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_SCRAP_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 분할
     *
     * POST /rest/inventory_trx/{id}/split_inventory
     *
     * 하나의 재고 레코드를 두 개로 분할한다.
     * DIY: diy-inv-pre-split-inventory / diy-inv-post-split-inventory
     *
     * @param id    분할할 재고 ID
     * @param input 분할 트랜잭션 정보 (분할 수량 등)
     * @return 분할 후 새로 생성된 재고 엔티티
     */
    @RequestMapping(value = "/{id}/split_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Split Inventory")
    public Inventory splitInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);

        // 커스텀 서비스 전 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_SPLIT_INVENTORY, TRX_INV_POST_SPLIT_INVENTORY);

        if (customResult == null) {
            // 재고 분할 처리
            Inventory inventory = this.invTrxSvc.splitInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_SPLIT_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 병합
     *
     * POST /rest/inventory_trx/{id}/merge_inventory
     *
     * 같은 SKU·로케이션의 복수 재고 레코드를 하나로 합친다.
     * DIY: diy-inv-pre-merge-inventory / diy-inv-post-merge-inventory
     *
     * @param id    기준(대상) 재고 ID
     * @param input 병합 트랜잭션 정보 (병합할 재고 ID 목록 등)
     * @return 병합된 재고 엔티티
     */
    @RequestMapping(value = "/{id}/merge_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Merge Inventory")
    public Inventory mergeInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);

        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_MERGE_INVENTORY, TRX_INV_POST_MERGE_INVENTORY);

        if (customResult == null) {
            // 재고 분할 처리
            Inventory inventory = this.invTrxSvc.mergeInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_MERGE_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 홀드 (잠금)
     *
     * POST /rest/inventory_trx/{id}/hold_inventory
     *
     * 재고 상태를 LOCKED로 변경하여 출고·할당을 차단한다.
     * DIY: diy-inv-pre-hold-inventory / diy-inv-post-hold-inventory
     *
     * @param id    홀드할 재고 ID
     * @param input 홀드 트랜잭션 정보 (홀드 사유 등)
     * @return 홀드 처리된 재고 엔티티
     */
    @RequestMapping(value = "/{id}/hold_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Hold Inventory")
    public Inventory holdInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);

        // 커스텀 서비스 전 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_HOLD_INVENTORY, TRX_INV_POST_HOLD_INVENTORY);

        if (customResult == null) {
            // 재고 홀드 처리
            Inventory inventory = this.invTrxSvc.holdInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_HOLD_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 홀드 해제
     *
     * POST /rest/inventory_trx/{id}/release_hold_inventory
     *
     * LOCKED 상태의 재고를 STORED 상태로 복원하여 출고·할당을 허용한다.
     * DIY: diy-inv-pre-release-hold-inventory / diy-inv-post-release-hold-inventory
     *
     * @param id    홀드 해제할 재고 ID
     * @param input 홀드 해제 트랜잭션 정보
     * @return 홀드 해제된 재고 엔티티
     */
    @RequestMapping(value = "/{id}/release_hold_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Release Hold Inventory")
    public Inventory releaseHoldInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);

        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_RELEASE_HOLD_INVENTORY, TRX_INV_POST_RELEASE_HOLD_INVENTORY);

        if (customResult == null) {
            // 재고 홀드 해제 처리
            Inventory inventory = this.invTrxSvc.releaseHoldInventory(domainId, input);
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_RELEASE_HOLD_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * 재고 수량 조정
     *
     * POST /rest/inventory_trx/{id}/adjust_inventory
     *
     * 실사·오류 정정 등의 사유로 재고 수량을 직접 변경한다.
     * 변경 내역은 inventory_hists에 기록된다.
     * DIY: diy-inv-pre-adjust-inventory / diy-inv-post-adjust-inventory
     *
     * @param id    조정할 재고 ID
     * @param input 조정 트랜잭션 정보 (조정 수량, 사유 등)
     * @return 조정된 재고 엔티티
     */
    @RequestMapping(value = "/{id}/adjust_inventory", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Adjust Inventory")
    public Inventory adjustInventory(@PathVariable("id") String id, @RequestBody InvTransaction input) {
        Long domainId = Domain.currentDomainId();
        input.setId(id);

        // 커스텀 서비스 처리
        Object customResult = this.doCustomService(domainId, ValueUtil.newMap("input", input),
                TRX_INV_PRE_ADJUST_INVENTORY, TRX_INV_POST_ADJUST_INVENTORY);

        if (customResult == null) {
            // 재고 조정 처리
            Inventory inventory = (customResult == null) ? this.invTrxSvc.adjustInventory(domainId, input)
                    : (Inventory) customResult;
            // 커스텀 서비스 후 처리
            this.customSvc.doCustomService(domainId, TRX_INV_POST_ADJUST_INVENTORY,
                    ValueUtil.newMap("inventory", inventory));
            // 리턴
            return inventory;

        } else {
            // 리턴
            return (Inventory) customResult;
        }
    }

    /**
     * DIY 커스텀 서비스 pre 훅 실행 헬퍼
     *
     * pre 훅이 true를 반환하면 기본 비즈니스 로직을 건너뛰고
     * post 훅 결과를 반환한다. null 반환 시 기본 처리를 수행한다.
     *
     * @param domainId      현재 도메인 ID
     * @param custSvcParams 커스텀 서비스에 전달할 파라미터
     * @param preSvcName    pre 훅 서비스 이름 (TRX_INV_PRE_XXX)
     * @param postSvcName   post 훅 서비스 이름 (TRX_INV_POST_XXX)
     * @return pre 훅이 완전 대체 처리를 한 경우 해당 결과, 기본 처리가 필요한 경우 null
     */
    private Object doCustomService(Long domainId, Map<String, Object> custSvcParams, String preSvcName,
            String postSvcName) {
        //
        Object preSvcResult = this.customSvc.doCustomService(domainId, preSvcName, custSvcParams);

        // return 값이 true 이면 커스텀 서비스에서 완전 커스터마이징 처리
        if (preSvcResult != null && preSvcResult instanceof Boolean && ValueUtil.toBoolean(preSvcResult) == true) {
            Object postSvcResult = this.customSvc.doCustomService(domainId, postSvcName, custSvcParams);
            return postSvcResult instanceof Inventory ? (Inventory) postSvcResult : null;
        } else {
            return null;
        }
    }
}
