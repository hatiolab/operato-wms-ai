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
import xyz.elidom.util.ClassUtil;
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
     * @param exceptionWhenNotFound
     * @return
     */
    public <T> T findRecord(Class<T> entityClass, Object condition, Boolean withLock, Boolean exceptionWhenNotFound) {
        T record = null;

        if (condition instanceof Query) {
            record = this.selectRecord(entityClass, (Query) condition, withLock);

        } else {
            if (withLock == true) {
                record = this.queryManager.selectByConditionWithLock(entityClass, condition);
            } else {
                record = this.queryManager.selectByCondition(entityClass, condition);
            }
        }

        if (exceptionWhenNotFound) {
            if (record == null) {
                throw ThrowUtil.newNotFoundRecord(MessageUtil.getTerm("menu." + entityClass.getSimpleName()), "Data");
            } else {
                if (this.hasDelFlagField(entityClass) && ValueUtil.isTrue(ClassUtil.getFieldValue(record, "delFlag"))) {
                    throw ThrowUtil.newNotFoundRecord(MessageUtil.getTerm("menu." + entityClass.getSimpleName()),
                            "Data");
                }
            }
        }

        return record;
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

    /**
     * 사용자가 접근 가능한 화주사 코드 목록 조회
     *
     * user_companies 매핑 레코드가 없는 사용자는 도메인 내 전체 화주사를 반환한다.
     *
     * @param domainId 도메인 ID
     * @param userId   사용자 로그인 ID
     * @return 화주사 코드 목록
     */
    @SuppressWarnings("unchecked")
    public List<String> getUserCompanyCodes(Long domainId, String userId) {
        // 매핑 레코드 존재 여부 확인
        String countSql = "SELECT COUNT(*) FROM user_companies WHERE domain_id = :domainId AND user_id = :userId";
        Integer mappingCount = this.queryManager.selectBySql(countSql,
                ValueUtil.newMap("domainId,userId", domainId, userId), Integer.class);

        if (mappingCount == null || mappingCount == 0) {
            // 매핑 없음 → 도메인 내 전체 활성 화주사 코드 반환
            String allSql = "SELECT com_cd FROM companies WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false) ORDER BY com_cd";
            List<Map<String, Object>> rows = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
                    allSql, ValueUtil.newMap("domainId", domainId), Map.class, 0, 0);
            return rows.stream()
                    .map(r -> r.get("com_cd") != null ? r.get("com_cd").toString() : null)
                    .filter(ValueUtil::isNotEmpty)
                    .toList();
        }

        // 매핑 있음 → 허용된 화주사 코드만 반환 (company_id FK로 JOIN)
        String sql = "SELECT c.com_cd FROM user_companies uc" +
                " INNER JOIN companies c ON c.id = uc.company_id AND c.domain_id = uc.domain_id" +
                " WHERE uc.domain_id = :domainId AND uc.user_id = :userId" +
                " AND (c.del_flag IS NULL OR c.del_flag = false)" +
                " ORDER BY c.com_cd";
        List<Map<String, Object>> rows = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
                sql, ValueUtil.newMap("domainId,userId", domainId, userId), Map.class, 0, 0);
        return rows.stream()
                .map(r -> r.get("com_cd") != null ? r.get("com_cd").toString() : null)
                .filter(ValueUtil::isNotEmpty)
                .toList();
    }

    /**
     * 사용자가 접근 가능한 화주사 목록 조회 (Company 객체)
     *
     * user_companies 매핑 레코드가 없는 사용자는 도메인 내 전체 화주사를 반환한다.
     *
     * @param domainId 도메인 ID
     * @param userId   사용자 로그인 ID
     * @return 화주사 목록 [{ com_cd, com_nm, com_alias }]
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserAccessibleCompanies(Long domainId, String userId) {
        String countSql = "SELECT COUNT(*) FROM user_companies WHERE domain_id = :domainId AND user_id = :userId";
        Integer mappingCount = this.queryManager.selectBySql(countSql,
                ValueUtil.newMap("domainId,userId", domainId, userId), Integer.class);

        String sql;
        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);

        if (mappingCount == null || mappingCount == 0) {
            // 매핑 없음 → 전체 활성 화주사
            sql = "SELECT com_cd as name, com_nm as description FROM companies WHERE domain_id = :domainId AND (del_flag IS NULL OR del_flag = false) ORDER BY com_cd";
        } else {
            // 매핑 있음 → 허용된 화주사만 반환 (company_id FK로 JOIN)
            sql = "SELECT c.com_cd as name, c.com_nm as description" +
                    " FROM companies c" +
                    " INNER JOIN user_companies uc ON uc.company_id = c.id AND uc.domain_id = c.domain_id" +
                    " WHERE c.domain_id = :domainId AND uc.user_id = :userId" +
                    " AND (c.del_flag IS NULL OR c.del_flag = false)" +
                    " ORDER BY c.com_cd";
            params.put("userId", userId);
        }

        return (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }
}
