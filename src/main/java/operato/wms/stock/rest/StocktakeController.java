package operato.wms.stock.rest;

import java.util.List;
import java.util.Map;

import operato.wms.stock.entity.Inventory;

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

import operato.wms.stock.entity.Stocktake;
import operato.wms.stock.entity.StocktakeItem;
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
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.ValueUtil;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/stocktakes")
@ServiceDesc(description = "Stocktake Service API")
public class StocktakeController extends AbstractRestService {

    /**
     * 커스텀 서비스 - 재고 실사 저장 전 처리
     */
    public static final String TRX_STOCK_TAKE_PRE_MULTIPLE_UPDATE = "diy-st-pre-multiple-update";
    /**
     * 커스텀 서비스 - 재고 실사 저장 후 처리
     */
    public static final String TRX_STOCK_TAKE_POST_MULTIPLE_UPDATE = "diy-st-post-multiple-update";
    /**
     * 커스텀 서비스 - 재고 실사 삭제 전 처리
     */
    public static final String TRX_STOCK_TAKE_PRE_DELETE = "diy-st-pre-delete";
    /**
     * 커스텀 서비스 - 재고 실사 삭제 후 처리
     */
    public static final String TRX_STOCK_TAKE_POST_DELETE = "diy-st-post-delete";
    /**
     * 커스텀 서비스 - 재고 실사 상세 삭제 전 처리
     */
    public static final String TRX_STOCK_TAKE_ITEM_PRE_DELETE = "diy-st-item-pre-delete";
    /**
     * 커스텀 서비스 - 재고 실사 상세 삭제 후 처리
     */
    public static final String TRX_STOCK_TAKE_ITEM_POST_DELETE = "diy-st-item-post-delete";
    /**
     * 커스텀 서비스 - 재고 실사 상세 저장 전 처리
     */
    public static final String TRX_STOCK_TAKE_ITEM_PRE_MULTIPLE_UPDATE = "diy-st-item-pre-multiple-update";
    /**
     * 커스텀 서비스 - 재고 실사 상세 저장 후 처리
     */
    public static final String TRX_STOCK_TAKE_ITEM_POST_MULTIPLE_UPDATE = "diy-st-item-post-multiple-update";
    /**
     * 커스텀 서비스 - 재고 실사 시작 전 처리
     */
    public static final String TRX_STOCK_TAKE_PRE_START_SERVICE = "diy-st-pre-start-service";
    /**
     * 커스텀 서비스 - 재고 실사 시작 후 처리
     */
    public static final String TRX_STOCK_TAKE_POST_START_SERVICE = "diy-st-post-start-service";
    /**
     * 커스텀 서비스 - 재고 실사 완료 전 처리
     */
    public static final String TRX_STOCK_TAKE_PRE_FINISH_SERVICE = "diy-st-pre-finish-service";
    /**
     * 커스텀 서비스 - 재고 실사 완료 후 처리
     */
    public static final String TRX_STOCK_TAKE_POST_FINISH_SERVICE = "diy-st-post-finish-service";
    /**
     * 커스텀 서비스 - 재고 실사 취소 전 처리
     */
    public static final String TRX_STOCK_TAKE_PRE_CANCEL_SERVICE = "diy-st-pre-cancel-service";
    /**
     * 커스텀 서비스 - 재고 실사 취소 후 처리
     */
    public static final String TRX_STOCK_TAKE_POST_CANCEL_SERVICE = "diy-st-post-cancel-service";

    /**
     * 커스텀 서비스
     */
    @Autowired
    protected ICustomService customSvc;

    @Override
    protected Class<?> entityClass() {
        return Stocktake.class;
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
    public Stocktake findOne(@PathVariable("id") String id) {
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
    public Stocktake create(@RequestBody Stocktake input) {
        return this.createOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update")
    public Stocktake update(@PathVariable("id") String id, @RequestBody Stocktake input) {
        return this.updateOne(input);
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void delete(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        // 1. 삭제 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("id", id);
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_PRE_DELETE, customParams);

        this.deleteOne(this.entityClass(), id);

        // 3. 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_POST_DELETE, customParams);
    }

    @RequestMapping(value = "/item/{id}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Delete")
    public void deleteItem(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        // 1. 삭제 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("id", id);
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_ITEM_PRE_DELETE, customParams);

        this.deleteOne(StocktakeItem.class, id);

        // 3. 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_ITEM_POST_DELETE, customParams);
    }

    @RequestMapping(value = "/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Create, Update or Delete multiple at one time")
    public Boolean multipleUpdate(@RequestBody List<Stocktake> list) {
        Long domainId = Domain.currentDomainId();

        // 상태 체크
        for (Stocktake item : list) {
            if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_UPDATE)) {
                if (ValueUtil.isNotEqual(item.getStatus(), Stocktake.STATUS_WAIT)) {
                    throw new ElidomRuntimeException("[대기] 상태인 경우만 수정이 가능합니다.");
                }
            } else if (ValueUtil.isEqualIgnoreCase(item.getCudFlag_(), SysConstants.CUD_FLAG_DELETE)) {
                if (ValueUtil.isNotEqual(this.findOne(item.getId()).getStatus(), Stocktake.STATUS_WAIT)) {
                    throw new ElidomRuntimeException("[대기] 상태인 경우만 삭제가 가능합니다.");
                }
            }
        }

        // 1. 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("list", list);
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_PRE_MULTIPLE_UPDATE, customParams);

        // 2. Multiple Update
        this.cudMultipleData(this.entityClass(), list);

        // 3. 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_POST_MULTIPLE_UPDATE, customParams);

        // 5. 리턴
        return true;
    }

    /**
     * Stocktake ID 값으로 재고실사 상세정보 조회
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "/{id}/items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Stocktake Items By Stocktake ID")
    public List<StocktakeItem> searchStocktakeItems(@PathVariable("id") String id,
            @RequestParam(name = "sort", required = false) String sort) {
        Query query = new Query();
        query.addFilter(new Filter("stocktakeId", id));
        if (ValueUtil.isNotEmpty(sort)) {
            query.addOrder(this.jsonParser.parse(sort, Order[].class));
        }

        return this.queryManager.selectList(StocktakeItem.class, query);
    }

    /**
     * 재고실사 상세정보 멀티 추가, 갱신 처리
     * 
     * @param id
     * @param stocktakeItems
     * @return
     */
    @RequestMapping(value = "/{id}/items/update_multiple", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Update Multiple Stocktake Items")
    public Boolean updateMultipleStocktaskItems(@PathVariable("id") String id,
            @RequestBody List<StocktakeItem> stocktakeItems) {
        if (ValueUtil.isEmpty(id) || ValueUtil.isEqualIgnoreCase(id, SysConstants.EMPTY_STRING)) {
            throw ThrowUtil.newValidationErrorWithNoLog("재고실사 ID가 파라미터로 넘어오지 않았습니다.");
        }

        Stocktake stocktake = this.findOne(id);

        for (StocktakeItem item : stocktakeItems) {
            item.setStocktakeId(id);
        }

        Long domainId = Domain.currentDomainId();

        // 1. 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("stocktake,stocktakeItems", stocktake, stocktakeItems);
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_ITEM_PRE_MULTIPLE_UPDATE, customParams);

        // 2. Multiple Update
        this.cudMultipleData(StocktakeItem.class, stocktakeItems);

        // 3. 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_ITEM_POST_MULTIPLE_UPDATE, customParams);

        // 5. 리턴
        return true;
    }

    @RequestMapping(value = "/{id}/start", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Start stocktake")
    public Stocktake startStocktask(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();

        Stocktake stocktake = this.findOne(id);

        // 1. 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("stocktake", stocktake);
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_PRE_START_SERVICE, customParams);

        // 2. 실사 항목별 전산 재고 수량(total_qty) 자동 계산
        // inventories 테이블에서 동일 com_cd + wh_cd + loc_cd + sku_cd 의 inv_qty 합산
        List<StocktakeItem> items = this.queryManager.selectList(StocktakeItem.class,
                ValueUtil.newMap("stocktakeId", id));

        if (items != null && !items.isEmpty()) {
            String invSumSql = "SELECT COALESCE(SUM(inv_qty), 0) FROM inventories" +
                    " WHERE domain_id = :domainId AND com_cd = :comCd AND wh_cd = :whCd" +
                    " AND loc_cd = :locCd AND sku_cd = :skuCd" +
                    " AND (del_flag IS NULL OR del_flag = false)";

            for (StocktakeItem item : items) {
                Map<String, Object> invParams = ValueUtil.newMap(
                        "domainId,comCd,whCd,locCd,skuCd",
                        domainId, stocktake.getComCd(), stocktake.getWhCd(),
                        item.getLocCd(), item.getSkuCd());
                Double totalQty = this.queryManager.selectBySql(invSumSql, invParams, Double.class);
                item.setTotalQty(totalQty != null ? totalQty : 0.0);
            }
            this.queryManager.updateBatch(items, "totalQty", "updatedAt");

            // 3. 실사 헤더 plan_sku 집계 (총 실사 대상 SKU 종류 수)
            long planSku = items.stream()
                    .map(StocktakeItem::getSkuCd)
                    .distinct()
                    .count();
            stocktake.setPlanSku((int) planSku);
        }

        stocktake.setStatus(Stocktake.STATUS_RUN);
        this.queryManager.update(Stocktake.class, stocktake, "status", "planSku");

        // 3. 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_POST_START_SERVICE, customParams);

        return stocktake;
    }

    @RequestMapping(value = "/{id}/finish", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Finish stocktake")
    public Stocktake finishStocktask(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();
        Stocktake stocktake = this.findOne(id);

        // 1. 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("stocktake", stocktake);
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_PRE_FINISH_SERVICE, customParams);

        // 2. 실사 항목별 차이 수량(diff_qty) 자동 계산: diff_qty = stocktake_qty - total_qty
        List<StocktakeItem> items = this.queryManager.selectList(StocktakeItem.class,
                ValueUtil.newMap("stocktakeId", id));

        int resultSku = 0;
        int diffSku = 0;

        if (items != null && !items.isEmpty()) {
            for (StocktakeItem item : items) {
                double totalQty = item.getTotalQty() != null ? item.getTotalQty() : 0.0;
                double stocktakeQty = item.getStocktakeQty() != null ? item.getStocktakeQty() : 0.0;
                item.setDiffQty(stocktakeQty - totalQty);
            }
            this.queryManager.updateBatch(items, "diffQty", "updatedAt");

            // 3. 실사 헤더 집계
            // result_sku: 실사 수량이 입력된 SKU 종류 수
            // diff_sku: 전산과 실사 수량이 다른 SKU 종류 수
            resultSku = (int) items.stream()
                    .filter(i -> i.getStocktakeQty() != null && i.getStocktakeQty() > 0)
                    .map(StocktakeItem::getSkuCd)
                    .distinct()
                    .count();
            diffSku = (int) items.stream()
                    .filter(i -> i.getDiffQty() != null && Math.abs(i.getDiffQty()) > 0.0001)
                    .map(StocktakeItem::getSkuCd)
                    .distinct()
                    .count();
        }

        stocktake.setResultSku(resultSku);
        stocktake.setDiffSku(diffSku);
        stocktake.setStatus(Stocktake.STATUS_END);
        this.queryManager.update(Stocktake.class, stocktake, "status", "resultSku", "diffSku");

        // 3. 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_POST_FINISH_SERVICE, customParams);

        return stocktake;
    }

    @RequestMapping(value = "/{id}/cancel", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel stocktake")
    public Stocktake cancelStocktask(@PathVariable("id") String id) {
        Long domainId = Domain.currentDomainId();
        Stocktake stocktake = this.findOne(id);

        // 1. 저장 전 처리 커스텀 서비스 호출
        Map<String, Object> customParams = ValueUtil.newMap("stocktake", stocktake);
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_PRE_CANCEL_SERVICE, customParams);

        // 2. Cancel - 재고 실사 상태를 CANCEL로 변경
        stocktake.setStatus(Stocktake.STATUS_CANCEL);
        this.queryManager.update(Stocktake.class, stocktake, "status");

        // 3. 저장 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(domainId, TRX_STOCK_TAKE_POST_CANCEL_SERVICE, customParams);

        return stocktake;
    }
}