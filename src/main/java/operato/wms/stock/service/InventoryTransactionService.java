package operato.wms.stock.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.model.InvTransaction;
import operato.wms.stock.model.SimpleStockCheck;
import operato.wms.stock.model.StockCheck;
import operato.wms.stock.query.store.StockQueryStore;
import xyz.anythings.sys.event.EventPublisher;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 재고 모듈 트랜잭션 처리 서비스
 * 
 * @author shortstop
 */
@Component
public class InventoryTransactionService extends AbstractQueryService {
    /**
     * 화주사 - 창고별 설정 조회 서비스
     */
    @Autowired
    protected RuntimeConfigService runtimeConfSvc;
    /**
     * WMS 기본 서비스
     */
    @Autowired
    protected WmsBaseService wmsBaseSvc;
    /**
     * 재고용 쿼리 스토어
     */
    @Autowired
    protected StockQueryStore stockQueryStore;
    /**
     * 이벤트 퍼블리셔
     */
    @Autowired
    protected EventPublisher eventPublisher;

    /********************************************************************************************************
     * 재 고 체 크 서 비 스
     ********************************************************************************************************/

    /**
     * 화주사, 창고별 상품 가용 재고 수량 리턴
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param skuCd
     * @return
     */
    public Double getAvailableStockByWh(Long domainId, String comCd, String whCd, String skuCd) {
        String sql = this.stockQueryStore.getAvailableStockQty();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,skuCd", domainId, comCd, whCd, skuCd);
        return this.queryManager.selectBySql(sql, params, Double.class);
    }

    /**
     * 화주사, 창고, 존 별 상품 가용 재고 수량 리턴
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param zoneCd
     * @param skuCd
     * @return
     */
    public Double getAvailableStockByZone(Long domainId, String comCd, String whCd, String zoneCd, String skuCd) {
        String sql = this.stockQueryStore.getAvailableStockQty();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,skuCd,zoneCd", domainId, comCd, whCd, skuCd,
                zoneCd);
        return this.queryManager.selectBySql(sql, params, Double.class);
    }

    /**
     * 화주사, 창고, 로케이션 별 상품 가용 재고 수량 리턴
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param locCd
     * @param skuCd
     * @return
     */
    public Double getAvailableStockByLoc(Long domainId, String comCd, String whCd, String locCd, String skuCd) {
        String sql = this.stockQueryStore.getAvailableStockQty();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,skuCd,locCd", domainId, comCd, whCd, skuCd,
                locCd);
        return this.queryManager.selectBySql(sql, params, Double.class);
    }

    /**
     * 화주사, 창고, 로케이션, Lot No 별 상품 가용 재고 수량 리턴
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param skuCd
     * @param lotNo
     * @return
     */
    public Double getAvailableStockByLotNo(Long domainId, String comCd, String whCd, String skuCd, String lotNo) {
        String sql = this.stockQueryStore.getAvailableStockQty();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,skuCd,lotNo", domainId, comCd, whCd, skuCd,
                lotNo);
        return this.queryManager.selectBySql(sql, params, Double.class);
    }

    /**
     * 화주사, 창고, 로케이션, 제조일자 별 상품 가용 재고 수량 리턴
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param skuCd
     * @param expiredDate
     * @return
     */
    public Double getAvailableStockByPrdDate(Long domainId, String comCd, String whCd, String skuCd, String prdDate) {
        String sql = this.stockQueryStore.getAvailableStockQty();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,skuCd,prdDate", domainId, comCd, whCd, skuCd,
                prdDate);
        return this.queryManager.selectBySql(sql, params, Double.class);
    }

    /**
     * 화주사, 창고, 로케이션, 유효기간 별 상품 가용 재고 수량 리턴
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param skuCd
     * @param expiredDate
     * @return
     */
    public Double getAvailableStockByExpiredDate(Long domainId, String comCd, String whCd, String skuCd,
            String expiredDate) {
        String sql = this.stockQueryStore.getAvailableStockQty();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,skuCd,expiredDate", domainId, comCd, whCd,
                skuCd, expiredDate);
        return this.queryManager.selectBySql(sql, params, Double.class);
    }

    /**
     * 화주사, 창고별 상품 리스트 별 가용 재고 수량 리턴
     * 
     * @param stockCheckList
     * @param exceptionWhenNotEnough
     * @return
     */
    public List<SimpleStockCheck> getSimpleAvailableStockSummary(List<SimpleStockCheck> stockCheckList,
            boolean exceptionWhenNotEnough) {
        for (SimpleStockCheck stock : stockCheckList) {
            double availQty = this.getAvailableStockByWh(stock.getDomainId(), stock.getComCd(), stock.getWhCd(),
                    stock.getSkuCd());
            stock.setInvQty(availQty);
        }

        return stockCheckList;
    }

    /**
     * 재고 체크 조건에 따른 상품 리스트 별 가용 재고 수량 리턴
     * 
     * @param stockCheckList
     * @param exceptionWhenNotEnough
     * @return
     */
    public List<StockCheck> getAvailableStockSummary(List<StockCheck> stockCheckList, boolean exceptionWhenNotEnough) {
        // TODO
        return stockCheckList;
    }

    /**
     * 화주사, 창고별 상품 리스트 별 가용 재고가 충분한 지 체크
     * 
     * @param stockCheckList
     * @param exceptionWhenNotEnough 재고가 충분치 않은 경우 예외 발생 여부
     * @return
     */
    public boolean isAvailableStocks(List<SimpleStockCheck> stockCheckList, boolean exceptionWhenNotEnough) {
        boolean isEnough = true;

        for (SimpleStockCheck stock : stockCheckList) {
            double invQty = stock.getInvQty();
            double availQty = this.getAvailableStockByWh(stock.getDomainId(), stock.getComCd(), stock.getWhCd(),
                    stock.getSkuCd());

            if (invQty > availQty) {
                if (exceptionWhenNotEnough) {
                    throw new ElidomRuntimeException(
                            "상품 [" + stock.getSkuCd() + "]가 가용 재고가 출고 수량 [" + stock.getInvQty() + "] 보다 적습니다.");
                } else {
                    isEnough = false;
                    break;
                }
            }
        }

        return isEnough;
    }

    /**
     * 재고 체크 조건에 따른 상품 리스트 별 가용 재고가 충분한 지 체크
     * 
     * @param stockCheckList
     * @param exceptionWhenNotEnough 재고가 충분치 않은 경우 예외 발생 여부
     * @return
     */
    public boolean isAvailableStocksBy(List<StockCheck> stockCheckList, boolean exceptionWhenNotEnough) {
        // TODO
        return true;
    }

    /**
     * 창고, 화주사, 상품 코드, 주문 수량으로 option에 맞도록 가용 재고 리스트를 조회
     * 
     * @param domainId
     * @param whCd                   창고 코드
     * @param comCd                  화주사 코드
     * @param skuCd                  상품 코드
     * @param zoneCd                 로케이션 존, 빈 값 가능
     * @param locCd                  로케이션, 빈 값 가능
     * @param orderQty               주문 수량
     * @param reserveStrategy        가용 재고 조회 옵션 - 유통기한 (expired_date), 제조일
     *                               (prd_date), 선입 선출 (fifo)
     * @param exceptionWhenNotEnough 가용 재고가 충분치 않은 경우 예외 발생
     * @return
     */
    public List<Inventory> getAvailableInvQty(Long domainId, String whCd, String comCd, String skuCd, String zoneCd,
            String locCd, double orderQty, String reserveStrategy, boolean exceptionWhenNotEnough) {
        String sql = this.stockQueryStore.getAvailableStocksByQty();
        Map<String, Object> invQueryParams = ValueUtil.newMap("domainId,whCd,comCd,skuCd,ordQty", domainId, whCd, comCd,
                skuCd, orderQty);
        if (ValueUtil.isNotEmpty(zoneCd)) {
            invQueryParams.put("zoneCd", zoneCd);
        }
        if (ValueUtil.isNotEmpty(locCd)) {
            invQueryParams.put("locCd", locCd);
        }

        List<Inventory> invList = queryManager.selectListBySql(sql, invQueryParams, Inventory.class, 0, 0);

        if (ValueUtil.isEmpty(invList) && exceptionWhenNotEnough) {
            throw new ElidomRuntimeException("상품 [" + skuCd + "]의 가용 재고가 부족합니다.");
        }

        return invList;
    }

    /********************************************************************************************************
     * 재 고 예 약 서 비 스
     ********************************************************************************************************/

    /**
     * 출고 주문 번호로 예약 재고 조회
     * 
     * @return
     */
    public List<Inventory> getReservedInventoriesBy(Long domainId, String whCd, String comCd, String rlsOrdNo) {
        String sql = this.stockQueryStore.getSearchReservedInventories();
        Map<String, Object> params = ValueUtil.newMap("domainId,whCd,comCd,rlsOrdNo", domainId, whCd, comCd, rlsOrdNo);
        return this.queryManager.selectListBySql(sql, params, Inventory.class, 0, 0);
    }

    /**
     * 바코드 별 재고 예약 처리
     * 
     * @param domainId
     * @param whCd
     * @param comCd
     * @param skuCd
     * @param zoneCd
     * @param locCd
     * @param reservQty
     * @param reserveStrategy
     * @param exceptionWhenNotEnough
     * @param rlsOrdNo
     * @param lineNo
     * @return
     */
    public List<Inventory> reserveInvByBarcode(Long domainId, String whCd, String comCd, String skuCd, String zoneCd,
            String locCd, double reservQty, String reserveStrategy, boolean exceptionWhenNotEnough, String rlsOrdNo,
            String rlsLineNo) {
        List<Inventory> invList = this.getAvailableInvQty(domainId, whCd, comCd, skuCd, zoneCd, locCd, reservQty,
                reserveStrategy, exceptionWhenNotEnough);
        return this.reserveInvByBarcode(invList, reservQty, rlsOrdNo, rlsLineNo);
    }

    /**
     * 바코드 별 재고 예약 처리
     * 
     * @param inventories 예약 대상 재고 바코드 리스트
     * @param reservQty   총 예약 수량
     * @param rlsOrdNo    출고 번호
     * @param lineNo      출고 라인 번호
     * @return
     */
    public List<Inventory> reserveInvByBarcode(List<Inventory> inventories, double reservQty, String rlsOrdNo,
            String rlsLineNo) {
        double remainOrdQty = reservQty;
        List<Inventory> reservedInvs = new ArrayList<Inventory>();

        for (Inventory inv : inventories) {
            if (remainOrdQty > 0) {
                // 1. 재고 조회
                inv = this.queryManager.select(Inventory.class, inv.getId());

                // 2. 부분 재고 예약 처리
                if (remainOrdQty < inv.getInvQty()) {
                    // 2.1 재고 분할 처리
                    Inventory[] sInv = this.splitInventory(inv.getDomainId(), inv.getId(), remainOrdQty, "RESERVATION",
                            false);

                    // 2.2 분할 재고 예약 처리
                    Inventory splitInv = sInv[0];
                    splitInv.setStatus(Inventory.STATUS_RESERVED);
                    splitInv.setLastTranCd(Inventory.TRANSACTION_RESERVE);
                    splitInv.setRlsOrdNo(rlsOrdNo);
                    splitInv.setRlsLineNo(rlsLineNo);
                    this.queryManager.insert(Inventory.class, splitInv);
                    reservedInvs.add(splitInv);

                    // 2.3 메인 재고 업데이트
                    Inventory mainInv = sInv[1];
                    this.queryManager.update(Inventory.class, mainInv);

                    // 2.4 잔여 주문 수량 = 0
                    remainOrdQty = 0.0f;

                    // 3. 전체 재고 예약 처리
                } else {
                    // 3.1 Inventory 할당 : 전체 할당
                    inv.setStatus(Inventory.STATUS_RESERVED);
                    inv.setLastTranCd(Inventory.TRANSACTION_RESERVE);
                    inv.setRlsOrdNo(rlsOrdNo);
                    inv.setRlsLineNo(rlsLineNo);
                    this.queryManager.update(Inventory.class, inv);
                    reservedInvs.add(inv);

                    // 3.2 잔여 주문 수량 = 주문 수량 - 재고 수량
                    remainOrdQty = remainOrdQty - inv.getInvQty();
                }
            }
        }

        return reservedInvs;
    }

    /********************************************************************************************************
     * 재 고 예 약 취 소 서 비 스
     ********************************************************************************************************/

    /**
     * 바코드 별 예약된 재고 취소 처리
     * 
     * @param domainId
     * @param whCd
     * @param comCd
     * @param rlsOrdNo
     */
    public void cancelReserveInvByBarcode(Long domainId, String whCd, String comCd, String rlsOrdNo) {
        // 1. 출고 지시 번호로 예약 재고 조회
        Inventory condition = new Inventory();
        condition.setDomainId(domainId);
        condition.setWhCd(whCd);
        condition.setComCd(comCd);
        condition.setRlsOrdNo(rlsOrdNo);
        List<Inventory> invList = this.queryManager.selectList(Inventory.class, condition);

        condition.setRlsOrdNo(null);
        condition.setStatus(Inventory.STATUS_STORED);

        // 2. 예약 재고를 찾아 모두 예약 취소
        for (Inventory inv : invList) {
            condition.setBarcode(inv.getBarcode());
            Inventory storedInv = this.queryManager.selectByCondition(Inventory.class, condition);

            if (storedInv == null) {
                // 보관 중인 동일 바코드가 없는 경우
                inv.setStatus(Inventory.STATUS_STORED);
                inv.setLastTranCd(Inventory.TRANSACTION_IN);
                inv.setRlsOrdNo(null);
                this.queryManager.update(Inventory.class, inv);

            } else {
                // 보관 중인 동일 바코드가 있는 경우 - 보관 재고 수량 병합
                storedInv.setInvQty(storedInv.getInvQty() + inv.getInvQty());
                storedInv.setLastTranCd(Inventory.TRANSACTION_MERGE);
                this.queryManager.update(storedInv, "invQty", "lastTranCd");

                // 재고 삭제
                this.queryManager.delete(inv);
            }
        }
    }

    /**
     * 가용 재고 체크별(INV_CHECK_ONLY) 출고 주문 전체 예약된 재고 취소 처리
     * 
     * @param domainId
     * @param whCd
     * @param comCd
     * @param rlsOrdNo
     */
    public void cancelReserveForPickingByInvCheckOnly(Long domainId, String whCd, String comCd, String rlsOrdNo) {
        // 1. 출고 지시 번호로 예약 재고 조회
        Inventory condition = new Inventory();
        condition.setDomainId(domainId);
        condition.setWhCd(whCd);
        condition.setComCd(comCd);
        condition.setRlsOrdNo(rlsOrdNo);
        List<Inventory> invList = this.queryManager.selectList(Inventory.class, condition);

        condition.setRlsOrdNo(null);
        condition.setStatus(Inventory.STATUS_STORED);

        // 2. 예약 재고를 찾아 모두 예약 취소
        for (Inventory inv : invList) {
            condition.setBarcode(inv.getBarcode());
            // 재고 이력에서 마지막 보관 상태의 로케이션 조회
            String sql = this.stockQueryStore.getLastLocCdByHistory();
            Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,barcode,status", domainId, comCd, whCd,
                    inv.getBarcode(), Inventory.STATUS_STORED);
            String lastLocCd = this.queryManager.selectBySql(sql, params, String.class);

            if (ValueUtil.isNotEmpty(lastLocCd)) {
                condition.setLocCd(lastLocCd);
            }
            Inventory storedInv = this.queryManager.selectByCondition(Inventory.class, condition);

            if (storedInv == null) {
                // 보관 중인 동일 바코드가 없는 경우
                inv.setStatus(Inventory.STATUS_STORED);
                inv.setLastTranCd(Inventory.TRANSACTION_IN);
                inv.setRlsOrdNo(null);
                inv.setReservedQty(0.0);
                inv.setRlsLineNo(null);
                if (ValueUtil.isNotEmpty(lastLocCd)) {
                    inv.setLocCd(lastLocCd);
                }
                this.queryManager.update(Inventory.class, inv);

            } else {
                // 보관 중인 동일 바코드가 있는 경우 - 보관 재고 수량 병합
                storedInv.setInvQty(storedInv.getInvQty() + inv.getInvQty());
                storedInv.setLastTranCd(Inventory.TRANSACTION_MERGE);
                this.queryManager.update(storedInv, "invQty", "lastTranCd");

                // 재고 삭제
                this.queryManager.delete(inv);
            }
        }
    }

    /**
     * 가용 재고 체크 (INV_CHECK_ONLY) 출고 라인 예약된 재고 취소 처리
     * 
     * @param domainId
     * @param whCd
     * @param comCd
     * @param rlsOrdNo
     */
    public void cancelReserveLineForPickingByInvCheckOnly(Long domainId, String whCd, String comCd, String rlsOrdNo,
            String rlsLineNo) {
        // 1. 출고 지시 번호로 예약 재고 조회
        Inventory condition = new Inventory();
        condition.setDomainId(domainId);
        condition.setWhCd(whCd);
        condition.setComCd(comCd);
        condition.setRlsOrdNo(rlsOrdNo);
        condition.setRlsLineNo(rlsLineNo);
        condition.setStatus(Inventory.STATUS_PICK);

        Inventory reservedInv = this.queryManager.selectByCondition(Inventory.class, condition);
        // 2. 예약 재고 예약 취소
        if (ValueUtil.isNotEmpty(reservedInv)) {
            this.cancelReservedInventory(reservedInv);
        }

    }

    /**
     * 예약된 재고 취소 처리
     * 
     * @param reservedInventory
     */
    public void cancelReservedInventory(Inventory reservedInventory) {

        Inventory condition = new Inventory();
        condition.setDomainId(reservedInventory.getDomainId());
        condition.setWhCd(reservedInventory.getWhCd());
        condition.setComCd(reservedInventory.getComCd());
        condition.setRlsOrdNo(null);
        condition.setRlsLineNo(null);
        condition.setStatus(Inventory.STATUS_STORED);
        condition.setBarcode(reservedInventory.getBarcode());

        // 재고 이력에서 마지막 보관 상태의 로케이션 조회
        String sql = this.stockQueryStore.getLastLocCdByHistory();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,barcode,status",
                reservedInventory.getDomainId(), reservedInventory.getComCd(), reservedInventory.getWhCd(),
                reservedInventory.getBarcode(), Inventory.STATUS_STORED);
        String lastLocCd = this.queryManager.selectBySql(sql, params, String.class);

        if (ValueUtil.isNotEmpty(lastLocCd)) {
            condition.setLocCd(lastLocCd);
        }

        List<Inventory> storedInvList = this.queryManager.selectList(Inventory.class, condition);

        if (ValueUtil.isEmpty(storedInvList)) {
            // 보관 중인 동일 바코드가 없는 경우
            reservedInventory.setStatus(Inventory.STATUS_STORED);
            reservedInventory.setLastTranCd(Inventory.TRANSACTION_IN);
            if (ValueUtil.isNotEmpty(lastLocCd)) {
                reservedInventory.setLocCd(lastLocCd);
            }
            reservedInventory.setRlsOrdNo(null);
            reservedInventory.setRlsLineNo(null);
            reservedInventory.setReservedQty(0.0);
            this.queryManager.update(Inventory.class, reservedInventory);

        } else {
            Inventory storedInv = storedInvList.get(0);
            // 보관 중인 동일 바코드가 있는 경우 - 보관 재고 수량 병합
            storedInv.setInvQty(storedInv.getInvQty() + reservedInventory.getInvQty());
            storedInv.setLastTranCd(Inventory.TRANSACTION_MERGE);
            this.queryManager.update(storedInv, "invQty", "lastTranCd");

            // 재고 삭제
            this.queryManager.delete(reservedInventory);
        }
    }

    /********************************************************************************************************
     * 재 고 트 랜 잭 션 서 비 스
     ********************************************************************************************************/

    /**
     * 출고 처리를 위한 재고 조회
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param barcode
     * @param locCd
     * @param skuCd
     * @param exceptionWhenNotExist
     * @return
     */
    public Inventory findInventoryForRelease(Long domainId, String comCd, String whCd, String barcode, String locCd,
            String skuCd, boolean exceptionWhenNotExist) {
        String sql = this.stockQueryStore.getInventoryForRelease();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,barcode,locCd,skuCd", domainId, comCd, whCd,
                barcode, locCd, skuCd);
        List<Inventory> invList = this.queryManager.selectListBySql(sql, params, Inventory.class, 0, 0);

        if (ValueUtil.isEmpty(invList)) {
            if (exceptionWhenNotExist) {
                throw new ElidomRuntimeException(
                        "바코드 [" + barcode + "], 로케이션 [" + locCd + "]에 출고 처리할 상품 [" + skuCd + "] 재고가 존재하지 않습니다.");
            }
            return null;
        }

        return invList.get(0);
    }

    /**
     * 출고 처리를 위한 재고 조회
     * 
     * @param domainId
     * @param comCd
     * @param whCd
     * @param barcode
     * @param locCd
     * @param skuCd
     * @param exceptionWhenNotExist
     * @return
     */
    public List<Inventory> searchAvailableInventoryForRelease(Long domainId, String comCd, String whCd, String skuCd,
            boolean exceptionWhenNotExist) {
        String sql = this.stockQueryStore.getInventoryForRelease();
        Map<String, Object> params = ValueUtil.newMap("domainId,comCd,whCd,skuCd", domainId, comCd, whCd, skuCd);
        List<Inventory> invList = this.queryManager.selectListBySql(sql, params, Inventory.class, 0, 0);

        if (ValueUtil.isEmpty(invList) && exceptionWhenNotExist) {
            throw new ElidomRuntimeException(
                    "화주사 [" + comCd + "], 창고 [" + whCd + "]에 출고 처리할 상품 [" + skuCd + "]의 가용 재고가 존재하지 않습니다.");
        }

        return invList;
    }

    /**
     * 재고 출고를 위한 출고장 이동 처리
     * 
     * @param inventory
     * @param rlsOrdNo
     * @param lineNo
     * @param outQty
     * @param locCd
     * @param remark
     * @return
     */
    public Inventory moveInventoryForRelease(Inventory inventory, String rlsOrdNo, String rlsLineNo, double outQty,
            String locCd, String remark) {
        double invQty = inventory.getInvQty();

        if (invQty > outQty) {
            Inventory[] invs = this.splitInventory(inventory, outQty, null, false);
            Inventory invToOut = invs[0];
            invToOut.setLastTranCd(Inventory.TRANSACTION_OUT);
            invToOut.setStatus(Inventory.STATUS_PICK);
            invToOut.setReservedQty(outQty);
            invToOut.setLocCd(locCd);
            invToOut.setRlsOrdNo(rlsOrdNo);
            invToOut.setRlsLineNo(rlsLineNo);
            invToOut.setRemarks(remark);
            this.queryManager.insert(invToOut);
            this.queryManager.update(invs[1]);
            inventory = invToOut;

        } else {
            inventory.setLastTranCd(Inventory.TRANSACTION_OUT);
            inventory.setStatus(Inventory.STATUS_PICK);
            inventory.setReservedQty(outQty);
            inventory.setLocCd(locCd);
            inventory.setRlsOrdNo(rlsOrdNo);
            inventory.setRlsLineNo(rlsLineNo);
            inventory.setRemarks(remark);
            this.queryManager.update(inventory);
        }

        return inventory;
    }

    /**
     * 최종 출고 확정 처리
     * 
     * @param inventories
     * @return
     */
    public List<Inventory> finalReleaseInventories(List<Inventory> inventories) {
        for (Inventory inv : inventories) {
            inv.setReservedQty(inv.getInvQty());
            inv.setInvQty(0.0);
            inv.setLastTranCd(Inventory.TRANSACTION_OUT);
        }

        this.queryManager.updateBatch(inventories);
        return inventories;
    }

    /**
     * 최종 출고 확정 처리
     * 
     * @param inventory
     * @return
     */
    public Inventory finalReleaseInventory(Inventory inventory) {
        inventory.setReservedQty(inventory.getInvQty());
        inventory.setInvQty(0.0);
        inventory.setLastTranCd(Inventory.TRANSACTION_OUT);
        this.queryManager.update(inventory);
        return inventory;
    }

    /**
     * 재고 임의 생성 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory createInventory(Long domainId, Inventory input) {
        Inventory newInventory = ValueUtil.populate(input, new Inventory());

        if (ValueUtil.isEmpty(input.getComCd())) {
            // 화주사가 없습니다.
            throw ThrowUtil.newNotAllowedEmptyInfo("label.com_cd");
        }

        if (ValueUtil.isEmpty(input.getLocCd())) {
            // 로케이션이 없습니다.
            throw ThrowUtil.newNotAllowedEmptyInfo("label.loc_cd");
        }

        if (ValueUtil.isEmpty(input.getInvQty()) || input.getInvQty() == 0.0) {
            // 재고 수량이 없습니다.
            throw ThrowUtil.newNotAllowedEmptyInfo("label.inv_qty");
        }

        if (ValueUtil.isEmpty(input.getSkuCd())) {
            // 상품 코드가 없습니다.
            throw ThrowUtil.newNotAllowedEmptyInfo("label.sku_cd");
        }

        // Find and Check Location
        Location location = this.findAndCheckLocation(domainId, input.getLocCd(), Inventory.TRANSACTION_NEW);

        // 혼적 가능 여부 체크
        this.checkMixableLocation(location, input.getSkuCd());

        // Find SKU
        SKU sku = this.wmsBaseSvc.findSku(input.getComCd(), input.getSkuCd(), false, true);

        // 사용자가 입력한 정보대로 재고 정보 생성
        newInventory.setSkuNm(sku.getSkuNm());
        newInventory.setVendCd(sku.getVendCd());
        newInventory.setLastTranCd(Inventory.TRANSACTION_NEW);
        this.queryManager.insert(newInventory);

        // 생성 재고 정보 리턴
        return newInventory;
    }

    /**
     * 재고 입고 적치 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory putAway(Long domainId, InvTransaction input) {
        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_IN);

        if (ValueUtil.isEqualIgnoreCase(inventory.getLastTranCd(), Inventory.TRANSACTION_IN)) {
            throw ThrowUtil.newValidationErrorWithNoLog("이미 입고 처리되었습니다.");
        }

        if (ValueUtil.isEmpty(input.getLocCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("To 로케이션 값이 없습니다.");
        }

        if (ValueUtil.isEmpty(input.getInvQty()) || input.getInvQty() == 0.0f) {
            input.setInvQty(inventory.getInvQty());
        }

        if (input.getInvQty() > inventory.getInvQty()) {
            throw ThrowUtil.newValidationErrorWithNoLog("입력 수량이 재고 수량보다 큽니다.");
        }

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location toLoc = this.findAndCheckLocation(domainId, input.getLocCd(), Inventory.TRANSACTION_IN);

        // 혼적 가능 여부 체크
        this.checkMixableLocation(toLoc, inventory.getSkuCd());

        // 바코드 재고 수량, 작업자 입력 수량 체크
        double invQty = inventory.getInvQty();
        double inputQty = input.getInvQty();

        // 바코드 재고 수량이 입력 수량보다 크다면 재고 분할 처리
        if (invQty > inputQty) {
            Inventory[] invs = this.splitInventory(inventory, inputQty, null, false);
            Inventory remainInv = invs[1];
            this.queryManager.update(remainInv);
            inventory = invs[0];
        }

        // 적치 처리
        inventory.setLastTranCd(Inventory.TRANSACTION_IN);
        inventory.setStatus(Inventory.STATUS_STORED);
        this.queryManager.upsert(inventory);

        // 재고 이동 처리
        this.moveInventory(inventory, input.getLocCd(), null);

        // 재고 리턴
        return inventory;
    }

    /**
     * 재고 이동 처리
     * 
     * @param inventory
     * @param locCd
     * @param remark
     * @return
     */
    public Inventory moveInventory(Inventory inventory, String locCd, String remark) {
        // 이동 로케이션 값 체크
        if (ValueUtil.isEmpty(locCd)) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동 로케이션 값이 없습니다.");
        }

        // 재고 조회 & 기본 체크 포인트 체크
        this.checkInventoryForTrx(inventory, Inventory.TRANSACTION_MOVE);

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location toLoc = this.findAndCheckLocation(inventory.getDomainId(), locCd, Inventory.TRANSACTION_MOVE);

        if (ValueUtil.isEqualIgnoreCase(inventory.getLocCd(), toLoc.getLocCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동하려는 로케이션이 재고의 로케이션과 동일합니다.");
        }

        if (ValueUtil.isNotEqual(inventory.getWhCd(), toLoc.getWhCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "이동하려는 로케이션의 창고와 재고의 창고가 다릅니다. 창고간의 이동은 Transfer 트랜잭션으로 출고/입고 처리되어야 합니다.");
        }

        // From 로케이션 조회 & 기본 체크 포인트 체크
        this.findAndCheckLocation(inventory.getDomainId(), inventory.getLocCd(), null);

        // 혼적 가능 여부 체크
        this.checkMixableLocation(toLoc, inventory.getSkuCd());

        // 로케이션에 동일 바코드 조회
        Inventory cond = new Inventory(inventory.getDomainId(), inventory.getBarcode(), locCd);
        cond.setSkuCd(inventory.getSkuCd());
        Inventory alreadyExistInv = this.queryManager.selectByCondition(Inventory.class, cond);

        // 로케이션에 동일 바코드 재고가 이미 있다면 병합 처리
        if (alreadyExistInv != null) {
            return this.mergeInventory(alreadyExistInv, inventory, remark);
        }

        // 재고 이동 트랜잭션 처리
        inventory.setLocCd(toLoc.getLocCd());
        inventory.setLastTranCd(Inventory.TRANSACTION_MOVE);
        if (ValueUtil.isNotEmpty(remark)) {
            inventory.setRemarks(remark);
        }
        this.queryManager.upsert(inventory);

        // 재고 정보 리턴
        return inventory;
    }

    /**
     * 재고 이동 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory moveInventory(Long domainId, InvTransaction input) {
        // 이동 로케이션 값 체크
        if (ValueUtil.isEmpty(input.getToLocCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동 로케이션 값이 없습니다.");
        }

        // 재고 이동 사유값 체크
        if (ValueUtil.isEmpty(input.getReason())) {
            throw ThrowUtil.newValidationErrorWithNoLog("사유 값이 없습니다.");
        }

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_MOVE);

        // 재고 이동 처리
        if (ValueUtil.isEmpty(input.getToQty())) {
            return this.moveInventory(inventory, input.getToLocCd(), input.getReason());
        } else {
            return this.moveInventory(inventory, input.getToLocCd(), input.getToQty(), input.getReason());
        }
    }

    /**
     * 재고 바코드에서 모든 재고를 이동하는 것이 아니고 moveQty 만큼만 이동 처리
     * 
     * @param inventory
     * @param locCd
     * @param moveQty
     * @param remark
     * @return
     */
    public Inventory moveInventory(Inventory inventory, String locCd, double moveQty, String remark) {
        // 바코드 재고 수량, 작업자 입력 수량 체크
        double invQty = inventory.getInvQty();

        // 바코드 재고 수량이 이동할 수량보다 크다면 재고 분할 처리
        if (invQty > moveQty) {
            Inventory[] invs = this.splitInventory(inventory, moveQty, null, false);
            Inventory remainInv = invs[1];
            this.queryManager.update(remainInv);
            inventory = invs[0];
        }

        // 재고 이동 처리
        return this.moveInventory(inventory, locCd, remark);
    }

    /**
     * 재고 스크랩 로케이션 이동 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory scrapInventory(Long domainId, InvTransaction input) {
        if (ValueUtil.isEmpty(input.getToLocCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동 로케이션 값이 없습니다.");
        }

        if (ValueUtil.isEmpty(input.getReason())) {
            throw ThrowUtil.newValidationErrorWithNoLog("사유 값이 없습니다.");
        }

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_SCRAP);

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location toLoc = this.findAndCheckLocation(domainId, input.getToLocCd(), Inventory.TRANSACTION_SCRAP);

        if (ValueUtil.isEqualIgnoreCase(inventory.getLocCd(), toLoc.getLocCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동하려는 로케이션이 재고의 로케이션과 동일합니다.");
        }

        if (ValueUtil.isNotEqual(inventory.getWhCd(), toLoc.getWhCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동하려는 로케이션의 창고와 재고의 창고가 다릅니다.");
        }

        // From 로케이션 조회 & 기본 체크 포인트 체크
        this.findAndCheckLocation(domainId, inventory.getLocCd(), Inventory.TRANSACTION_MOVE);

        // 재고 이동 트랜잭션 처리
        inventory.setLocCd(toLoc.getLocCd());
        inventory.setRemarks(input.getReason());
        inventory.setLastTranCd(Inventory.TRANSACTION_SCRAP);
        this.queryManager.update(inventory);

        // 리턴
        return inventory;
    }

    /**
     * 재고 분할 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory splitInventory(Long domainId, InvTransaction input) {
        Inventory[] inv = this.splitInventory(domainId, input.getId(), input.getToQty(), input.getReason(), true);
        return inv[1];
    }

    /**
     * 재고 분할 처리
     * 
     * @param domainId
     * @param inventoryId
     * @param splitQty
     * @param remark
     * @param saveFlag
     * @return
     */
    public Inventory[] splitInventory(Long domainId, String inventoryId, double splitQty, String remark,
            boolean saveFlag) {
        if (splitQty <= 0.0f) {
            throw ThrowUtil.newValidationErrorWithNoLog("분할 수량 값이 없습니다.");
        }

        if (ValueUtil.isEmpty(remark)) {
            throw ThrowUtil.newValidationErrorWithNoLog("사유 값이 없습니다.");
        }

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, inventoryId, Inventory.TRANSACTION_SPLIT);

        // 재고 분할 처리
        return this.splitInventory(inventory, splitQty, remark, saveFlag);
    }

    /**
     * 재고 분할 처리
     * 
     * @param inventory
     * @param splitQty
     * @param remark
     * @param saveFlag
     * @return
     */
    public Inventory[] splitInventory(Inventory inventory, double splitQty, String remark, boolean saveFlag) {
        double remainQty = inventory.getInvQty() - splitQty;

        if (remainQty < 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("분할 수량이 재고 수량보다 큽니다.");
        }

        // 재고 분할 트랜잭션 처리
        inventory.setInvQty(remainQty);
        inventory.setRemarks(remark);
        inventory.setLastTranCd(Inventory.TRANSACTION_SPLIT);
        if (saveFlag) {
            this.queryManager.update(inventory);
        }

        // 재고 복사
        Inventory splitInv = ValueUtil.populate(inventory, new Inventory());
        splitInv.setId(null);
        splitInv.setInvQty(splitQty);

        if (saveFlag) {
            this.queryManager.insert(splitInv);
        }

        // 리턴
        return new Inventory[] { splitInv, inventory };
    }

    /**
     * 두 개의 재고 바코드 병합 처리
     * 
     * @param mainInv
     * @param mergeInv
     * @param remark
     * @return
     */
    public Inventory mergeInventory(Inventory mainInv, Inventory mergeInv, String remark) {
        mainInv.setInvQty(mainInv.getInvQty() + mergeInv.getInvQty());
        mainInv.setLastTranCd(Inventory.TRANSACTION_MERGE);
        if (ValueUtil.isNotEmpty(remark)) {
            mainInv.setRemarks(remark);
        }

        this.queryManager.update(mainInv, "lastTranCd", "invQty", "updatedAt");
        this.queryManager.delete(mergeInv);
        return mainInv;
    }

    /**
     * 재고 병합 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory mergeInventory(Long domainId, InvTransaction input) {
        // TODO 구현 ...
        return null;
    }

    /**
     * 재고 홀드 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory holdInventory(Long domainId, InvTransaction input) {
        if (ValueUtil.isEmpty(input.getReason())) {
            throw ThrowUtil.newValidationErrorWithNoLog("사유 값이 없습니다.");
        }

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_HOLD);

        // 재고 홀드 트랜잭션 처리
        inventory.setStatus(Inventory.STATUS_LOCK);
        inventory.setRemarks(input.getReason());
        inventory.setLastTranCd(Inventory.TRANSACTION_HOLD);
        this.queryManager.update(inventory);

        // 리턴
        return inventory;
    }

    /**
     * 재고 홀드 해제 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory releaseHoldInventory(Long domainId, InvTransaction input) {
        if (ValueUtil.isEmpty(input.getReason())) {
            throw ThrowUtil.newValidationErrorWithNoLog("사유 값이 없습니다.");
        }

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_RELEASE_HOLD);

        // 재고 릴리즈 트랜잭션 처리 - 보관 중 상태로 전환 ...
        inventory.setStatus(Inventory.STATUS_STORED);
        inventory.setRemarks(input.getReason());
        inventory.setLastTranCd(Inventory.TRANSACTION_RELEASE_HOLD);
        this.queryManager.update(inventory);

        // 리턴
        return inventory;
    }

    /**
     * 재고 조정 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory adjustInventory(Long domainId, InvTransaction input) {
        if (ValueUtil.isEmpty(input.getToQty())) {
            throw ThrowUtil.newValidationErrorWithNoLog("재고 조정 수량 값이 없습니다.");
        }

        if (ValueUtil.isEmpty(input.getReason())) {
            throw ThrowUtil.newValidationErrorWithNoLog("사유 값이 없습니다.");
        }

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_ADJUST);

        // 재고 조정 트랜잭션 처리
        inventory.setInvQty(input.getToQty());
        inventory.setRemarks(input.getReason());
        inventory.setLastTranCd(Inventory.TRANSACTION_ADJUST);
        this.queryManager.update(inventory);

        // 리턴
        return inventory;
    }

    /**
     * 재고 ID로 재고 정보 조회 & 기본 체크 포인트 체크
     * 
     * @param domainId
     * @param id
     * @param tranCd
     * @return
     */
    public Inventory findAndCheckInventory(Long domainId, String id, String tranCd) {
        Inventory condition = new Inventory(id);
        condition.setDomainId(domainId);
        Inventory inventory = this.queryManager.select(condition);
        this.checkInventoryForTrx(inventory, tranCd);
        return inventory;
    }

    /**
     * 재고 트랜잭션 전 재고 상태 체크
     * 
     * @param inventory
     * @param tranCd
     * @return
     */
    public Inventory checkInventoryForTrx(Inventory inventory, String tranCd) {
        if (inventory == null) {
            throw ThrowUtil.newValidationErrorWithNoLog("존재하지 않는 재고 바코드입니다.");
        }

        if (inventory.getDelFlag()) {
            throw ThrowUtil.newValidationErrorWithNoLog("이미 종료된 재고 바코드입니다.");
        }

        if (inventory.getInvQty() == 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("재고 수량이 0 입니다.");
        }

        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_HOLD)) {
            if (ValueUtil.isEqualIgnoreCase(inventory.getStatus(), Inventory.STATUS_LOCK)) {
                throw ThrowUtil.newValidationErrorWithNoLog("이미 홀드 처리된 재고입니다.");
            }

        } else if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_RELEASE_HOLD)) {
            if (ValueUtil.isNotEqual(inventory.getStatus(), Inventory.STATUS_LOCK)) {
                throw ThrowUtil.newValidationErrorWithNoLog("홀드 처리된 재고가 아닙니다.");
            }
        } else {
            if (ValueUtil.isEqualIgnoreCase(inventory.getStatus(), Inventory.STATUS_LOCK)) {
                throw ThrowUtil.newValidationErrorWithNoLog("홀드 처리된 재고입니다.");
            }
        }

        return inventory;
    }

    /**
     * 로케이션 코드로 로케이션 조회 & 기본 체크 포인트 체크
     * 
     * @param domainId
     * @param locCd
     * @param tranCd
     * @return
     */
    public Location findAndCheckLocation(Long domainId, String locCd, String tranCd) {
        Location condition = new Location();
        condition.setDomainId(domainId);
        condition.setLocCd(locCd);
        Location location = this.queryManager.selectByCondition(Location.class, condition);

        if (location == null) {
            throw ThrowUtil.newValidationErrorWithNoLog("로케이션 [" + locCd + "]이 존재하지 않습니다.");
        }

        if (location.getDelFlag()) {
            throw ThrowUtil.newValidationErrorWithNoLog("로케이션 [" + locCd + "]은 사용하지 않는 로케이션입니다.");
        }

        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_MOVE)) {
            if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_MOVE)) {
                throw ThrowUtil.newValidationErrorWithNoLog("이동 제한이 걸린 로케이션이라 이동이 불가합니다.");
            }
        }

        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_IN)) {
            if (ValueUtil.isEqualIgnoreCase(location.getLocType(), "RCV-WAIT")) {
                throw ThrowUtil.newValidationErrorWithNoLog("입고 대기 존에 적치는 불가능합니다.");
            }

            if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_IN)) {
                throw ThrowUtil.newValidationErrorWithNoLog("입고 제한이 걸린 로케이션이라 입고가 불가합니다.");
            }
        }

        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_OUT)) {
            if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_OUT)) {
                throw ThrowUtil.newValidationErrorWithNoLog("출고 제한이 걸린 로케이션이라 출고가 불가합니다.");
            }
        }

        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_SCRAP)) {
            if (ValueUtil.isNotEqual(location.getLocType(), "DEFECT")) {
                throw ThrowUtil.newValidationErrorWithNoLog("이동하려는 로케이션 유형이 불량(DEFECT) 유형이 아닙니다.");
            }
        }

        return location;
    }

    /**
     * 로케이션 혼적 체크
     *
     * @param toLoc
     * @param skuCd
     */
    public void checkMixableLocation(Location toLoc, String skuCd) {
        if (toLoc.getMixableFlag() == null || !toLoc.getMixableFlag()) {
            String sql = "select distinct(sku_cd) from inventories where domain_id = :domainId and loc_cd = :locCd and del_flag = false and inv_qty > 0";
            List<String> skuList = this.queryManager.selectListBySql(sql,
                    ValueUtil.newMap("domainId,locCd", toLoc.getDomainId(), toLoc.getLocCd()), String.class, 0, 0);
            if (skuList.size() >= 1 && !skuList.contains(skuCd)) {
                throw ThrowUtil.newValidationErrorWithNoLog("다른 상품과 혼적이 불가한 로케이션입니다.");
            }
        }
    }
}
