package operato.wms.base.service;

import java.util.List;

import org.springframework.stereotype.Component;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.entity.Warehouse;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.client.ElidomRecordNotFoundException;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.print.entity.Printer;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.util.MessageUtil;
import xyz.elidom.util.ValueUtil;

/**
 * Base 모듈 트랜잭션 처리 서비스
 * 
 * @author shortstop
 */
@Component
public class WmsBaseService extends AbstractQueryService {
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
     * 창고 조회
     * 
     * @param whCd
     * @return
     */
    public Warehouse findWarehouse(String whCd) {
        Query warehouseQuery = new Query();
        warehouseQuery.addFilter("domain_id", Domain.currentDomainId());
        warehouseQuery.addFilter("wh_cd", whCd);
        return this.findWarehouse(warehouseQuery);
    }

    /**
     * 창고 조회
     * 
     * @param warehouseQuery
     * @return
     */
    public Warehouse findWarehouse(Query warehouseQuery) {
        return this.findWarehouse(warehouseQuery, false);
    }

    /**
     * 창고 조회
     * 
     * @param warehouseQuery
     * @param withLock
     * @return
     */
    public Warehouse findWarehouse(Query warehouseQuery, Boolean withLock) {
        return this.selectRecord(Warehouse.class, warehouseQuery, withLock);
    };

    /**
     * 창고 조회, 없으면 예외 발생
     * 
     * @param whCd
     * @return
     */
    public Warehouse findWarehouseWithException(String whCd, Boolean withLock) {
        Query warehouseQuery = new Query();
        warehouseQuery.addFilter("domain_id", Domain.currentDomainId());
        warehouseQuery.addFilter("wh_cd", whCd);
        return this.findWarehouseWithException(warehouseQuery, withLock);
    }

    /**
     * 창고 조회, 없으면 예외 발생
     * 
     * @param warehouseQuery
     * @param withLock
     * @return
     */
    public Warehouse findWarehouseWithException(Query warehouseQuery, Boolean withLock) {
        return this.findWarehouseWithException(warehouseQuery, withLock, SysConstants.EMPTY_STRING);
    };

    /**
     * 창고 조회, 없으면 예외 발생
     * 
     * @param warehouseQuery
     * @param withLock
     * @param target
     * @return
     */
    public Warehouse findWarehouseWithException(Query warehouseQuery, Boolean withLock, String target) {
        return this.findWarehouseWithException(warehouseQuery, withLock, "NOT_FOUND",
                MessageUtil.getTerm("menu.Warehouse"), target);
    };

    /**
     * 창고 조회, 없으면 예외 발생
     * 
     * @param warehouseQuery
     * @param withLock
     * @param message
     * @param params
     * @return
     */
    public Warehouse findWarehouseWithException(Query warehouseQuery, Boolean withLock, String message,
            String... params) {
        return this.selectRecordWithException(Warehouse.class, warehouseQuery, withLock, message,
                ValueUtil.toList(params));
    };

    /**
     * 로케이션 조회
     * 
     * @param locCd
     * @return
     */
    public Location findLocation(String locCd) {
        Query locationQuery = new Query();
        locationQuery.addFilter("domain_id", Domain.currentDomainId());
        locationQuery.addFilter("loc_cd", locCd);
        return this.findLocation(locationQuery);
    }

    /**
     * 로케이션 조회
     * 
     * @param whCd
     * @param locCd
     * @return
     */
    public Location findLocation(String whCd, String locCd) {
        Query locationQuery = new Query();
        locationQuery.addFilter("domain_id", Domain.currentDomainId());
        locationQuery.addFilter("wh_cd", whCd);
        locationQuery.addFilter("loc_cd", locCd);
        return this.findLocation(locationQuery);
    }

    /**
     * 로케이션 조회
     * 
     * @param locationQuery
     * @return
     */
    public Location findLocation(Query locationQuery) {
        return this.findLocation(locationQuery, false);
    }

    /**
     * 로케이션 조회
     * 
     * @param locationQuery
     * @param withLock
     * @return
     */
    public Location findLocation(Query locationQuery, Boolean withLock) {
        return this.selectRecord(Location.class, locationQuery, withLock);
    };

    /**
     * 로케이션 조회, 없으면 예외 발생
     * 
     * @param locCd
     * @return
     */
    public Location findLocationWithException(String locCd, Boolean withLock) {
        Query locationQuery = new Query();
        locationQuery.addFilter("domain_id", Domain.currentDomainId());
        locationQuery.addFilter("loc_cd", locCd);
        return this.findLocationWithException(locationQuery, withLock);
    }

    /**
     * 로케이션 조회, 없으면 예외 발생
     * 
     * @param locationQuery
     * @param withLock
     * @return
     */
    public Location findLocationWithException(Query locationQuery, Boolean withLock) {
        return this.findLocationWithException(locationQuery, withLock, SysConstants.EMPTY_STRING);
    };

    /**
     * 로케이션 조회, 없으면 예외 발생
     * 
     * @param locationQuery
     * @param withLock
     * @param target
     * @return
     */
    public Location findLocationWithException(Query locationQuery, Boolean withLock, String target) {
        return this.findLocationWithException(locationQuery, withLock, "NOT_FOUND",
                MessageUtil.getTerm("menu.Location"), target);
    };

    /**
     * 로케이션 조회, 없으면 예외 발생
     * 
     * @param locationQuery
     * @param withLock
     * @param message
     * @param params
     * @return
     */
    public Location findLocationWithException(Query locationQuery, Boolean withLock, String message, String... params) {
        return this.selectRecordWithException(Location.class, locationQuery, withLock, message,
                ValueUtil.toList(params));
    };

    /**
     * SKU 조회
     * 
     * @param comCd
     * @param skuCd
     * @return
     */
    public SKU findSku(String comCd, String skuCd) {
        Query skuQuery = new Query();
        skuQuery.addFilter("domain_id", Domain.currentDomainId());
        skuQuery.addFilter("com_cd", comCd);
        skuQuery.addFilter("sku_cd", skuCd);
        return this.findSku(skuQuery);
    }

    /**
     * SKU 조회
     * 
     * @param skuQuery
     * @return
     */
    public SKU findSku(Query skuQuery) {
        return this.findSku(skuQuery, false);
    }

    /**
     * SKU 조회
     * 
     * @param skuQuery
     * @param withLock
     * @return
     */
    public SKU findSku(Query skuQuery, Boolean withLock) {
        return this.selectRecord(SKU.class, skuQuery, withLock);
    };

    /**
     * SKU 조회, 없으면 예외 발생
     * 
     * @param comCd
     * @param skuCd
     * @param withLock
     * @return
     */
    public SKU findSkuWithException(String comCd, String skuCd, Boolean withLock) {
        Query skuQuery = new Query();
        skuQuery.addFilter("domain_id", Domain.currentDomainId());
        skuQuery.addFilter("com_cd", comCd);
        skuQuery.addFilter("sku_cd", skuCd);
        return this.findSkuWithException(skuQuery, withLock);
    }

    /**
     * SKU 조회, 없으면 예외 발생
     * 
     * @param skuQuery
     * @param withLock
     * @return
     */
    public SKU findSkuWithException(Query skuQuery, Boolean withLock) {
        return this.findSkuWithException(skuQuery, withLock, SysConstants.EMPTY_STRING);
    };

    /**
     * SKU 조회, 없으면 예외 발생
     * 
     * @param skuQuery
     * @param withLock
     * @param target
     * @return
     */
    public SKU findSkuWithException(Query skuQuery, Boolean withLock, String target) {
        return this.findSkuWithException(skuQuery, withLock, "NOT_FOUND", MessageUtil.getTerm("menu.SKU"),
                target);
    };

    /**
     * SKU 조회, 없으면 예외 발생
     * 
     * @param skuQuery
     * @param withLock
     * @param message
     * @param params
     * @return
     */
    public SKU findSkuWithException(Query skuQuery, Boolean withLock, String message, String... params) {
        return this.selectRecordWithException(SKU.class, skuQuery, withLock, message, ValueUtil.toList(params));
    };

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
     * @param params
     * @return
     */
    public <T> T selectRecordWithException(Class<T> entityClass, Query condition, Boolean withLock, String message,
            List<String> params) {
        T queryResult = this.selectRecord(entityClass, condition, withLock);

        if (ValueUtil.isEmpty(queryResult)) {
            throw new ElidomRecordNotFoundException(message, params);
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
