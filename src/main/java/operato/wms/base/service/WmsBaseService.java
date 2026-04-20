package operato.wms.base.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.entity.StoragePolicy;
import operato.wms.base.entity.Warehouse;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.print.entity.Printer;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.util.MessageUtil;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.ValueUtil;

/**
 * Base 모듈 트랜잭션 처리 서비스
 * 
 * @author shortstop
 */
@Component
public class WmsBaseService extends AbstractQueryService {
    /**
     * 화주사 보관 정책 캐시
     */
    private Map<String, StoragePolicy> storagePolicyCache = new HashMap<String, StoragePolicy>();

    /**
     * 기본 일반 프린터 ID 조회
     * 
     * @param domainId
     * @return
     */
    public String getDefaultNormalPrinter(Long domainId) {
        Printer condition = new Printer();
        condition.setDomainId(domainId);
        condition.setPrinterType("NORMAL");
        condition.setDefaultFlag(true);
        List<Printer> printerList = this.queryManager.selectList(Printer.class, condition);

        if (ValueUtil.isEmpty(printerList)) {
            throw new ElidomRuntimeException("등록된 일반 프린터 중 기본 프린터가 없습니다.");
        } else {
            return printerList.get(0).getId();
        }
    }

    /**
     * 기본 바코드 프린터 ID 조회
     * 
     * @param domainId
     * @return
     */
    public String getDefaultBarcodePrinter(Long domainId) {
        Printer condition = new Printer();
        condition.setDomainId(domainId);
        condition.setPrinterType("BARCODE");
        condition.setDefaultFlag(true);
        List<Printer> printerList = this.queryManager.selectList(Printer.class, condition);

        if (ValueUtil.isEmpty(printerList)) {
            throw new ElidomRuntimeException("등록된 일반 프린터 중 기본 프린터가 없습니다.");
        } else {
            return printerList.get(0).getId();
        }
    }

    /**
     * 화주사 보관 정책 조회
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @return
     */
    public synchronized StoragePolicy findStoragePolicy(Long domainId, String comCd, String whCd) {
        // cacheKey로 캐시 조회
        String cacheKey = domainId + ":" + comCd + ":" + whCd;

        if (this.storagePolicyCache.containsKey(cacheKey)) {
            return this.storagePolicyCache.get(cacheKey);
        }

        // 캐시에 없으면 DB에서 조회
        Query storagePolicyQuery = new Query();
        storagePolicyQuery.addFilter("domain_id", domainId);
        storagePolicyQuery.addFilter("com_cd", comCd);
        storagePolicyQuery.addFilter("wh_cd", whCd);
        StoragePolicy policy = this.queryManager.selectByCondition(StoragePolicy.class, storagePolicyQuery);

        // 캐시에 보관 정책 저장
        this.storagePolicyCache.put(cacheKey, policy);

        // 보관 정책 리턴
        return policy;
    }

    /**
     * 창고 조회
     * 
     * @param whCd
     * @param withLock
     * @param exceptionWhenNotFound
     * @return
     */
    public Warehouse findWarehouse(String whCd, Boolean withLock, Boolean exceptionWhenNotFound) {
        Query warehouseQuery = new Query();
        warehouseQuery.addFilter("domain_id", Domain.currentDomainId());
        warehouseQuery.addFilter("wh_cd", whCd);
        Warehouse wh = this.selectRecord(Warehouse.class, warehouseQuery, withLock);

        if (exceptionWhenNotFound && (wh == null || true == wh.getDelFlag())) {
            throw ThrowUtil.newNotFoundRecord(MessageUtil.getTerm("menu.Warehouse"), whCd);
        }

        return true == wh.getDelFlag() ? null : wh;
    }

    /**
     * 로케이션 조회
     * 
     * @param locCd
     * @param withLock
     * @param exceptionWhenNotFound
     * @return
     */
    public Location findLocation(String locCd, Boolean withLock, Boolean exceptionWhenNotFound) {
        Query locQuery = new Query();
        locQuery.addFilter("domain_id", Domain.currentDomainId());
        locQuery.addFilter("loc_cd", locCd);
        Location loc = this.selectRecord(Location.class, locQuery, withLock);

        if (exceptionWhenNotFound && (loc == null || true == loc.getDelFlag())) {
            throw ThrowUtil.newNotFoundRecord(MessageUtil.getTerm("menu.Location"), locCd);
        }

        return true == loc.getDelFlag() ? null : loc;
    }

    /**
     * SKU 조회
     * 
     * @param comCd
     * @param skuCd
     * @param withLock
     * @param exceptionWhenNotFound
     * @return
     */
    public SKU findSku(String comCd, String skuCd, Boolean withLock, Boolean exceptionWhenNotFound) {
        Query skuQuery = new Query();
        skuQuery.addFilter("domain_id", Domain.currentDomainId());
        skuQuery.addFilter("com_cd", comCd);
        skuQuery.addFilter("sku_cd", skuCd);
        SKU sku = this.selectRecord(SKU.class, skuQuery, false);

        if (exceptionWhenNotFound && (sku == null || true == sku.getDelFlag())) {
            throw ThrowUtil.newNotFoundRecord(MessageUtil.getTerm("menu.SKU"), skuCd);
        }

        return true == sku.getDelFlag() ? null : sku;
    }

    /**
     * 레코드 조회
     * 
     * @param <T>
     * @param entityClass
     * @param condition
     * @param withLock
     * @return
     */
    public <T> T selectRecord(Class<T> entityClass, Query condition, Boolean withLock) {
        List<Filter> rawFilters = condition.getFilter();
        condition.setFilter(this.getAlignedFilters(rawFilters, entityClass));

        if (withLock == true) {
            return this.queryManager.selectByConditionWithLock(entityClass, condition);
        } else {
            return this.queryManager.selectByCondition(entityClass, condition);
        }
    };

    /**
     * 레코드 조회, 없으면 예외 발생
     * 
     * @param <T>
     * @param entityClass
     * @param condition
     * @param withLock
     * @param message
     * @param keyData
     * @return
     */
    public <T> T selectRecordWithException(Class<T> entityClass, Query condition, Boolean withLock, String message,
            String keyData) {
        T queryResult = this.selectRecord(entityClass, condition, withLock);

        if (ValueUtil.isEmpty(queryResult)) {
            throw ThrowUtil.newNotFoundRecord(message, keyData);
        }

        return queryResult;
    };

    private <T> List<Filter> getAlignedFilters(List<Filter> filters, Class<T> entityClass) {

        if (filters.stream().noneMatch(filter -> {
            return filter.getLeftOperand().equals("domainId");
        })) {
            filters.add(new Filter("domainId", Domain.currentDomainId()));
        }

        if (hasDelFlagField(entityClass) && filters.stream().noneMatch(filter -> {
            return filter.getLeftOperand().equals("delFlag");
        })) {
            filters.add(new Filter("delFlag", false));
        }

        return getNonNullRightOperandsFilters(filters);
    }

    private <T> boolean hasDelFlagField(Class<T> entityClass) {
        try {
            return entityClass.getDeclaredField("delFlag") != null;
        } catch (NoSuchFieldException e) {
            return false;
        }
    }

    private List<Filter> getNonNullRightOperandsFilters(List<Filter> filters) {
        return filters.stream().filter(filter -> ValueUtil.isNotEmpty(filter.getRightOperand()))
                .toList();
    }
}
