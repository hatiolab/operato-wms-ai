package operato.wms.stock.service;

import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.entity.StoragePolicy;
import operato.wms.base.service.WmsBaseService;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.model.InvTransaction;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.ValueUtil;

/**
 * Fulfillment용 재고 모듈 트랜잭션 처리 서비스
 *
 * @author shortstop
 */
@Component
public class StockTransactionService extends AbstractQueryService {
    /**
     * WMS 기본 서비스
     */
    @Autowired
    protected WmsBaseService wmsBaseSvc;

    /**
     * 재고 임의 생성 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory createInventory(Long domainId, Inventory input) {
        // 화주사 데이터 체크
        ValueUtil.checkEmptyData(input.getComCd(), "label.com_cd");

        // 로케이션 데이터 체크
        ValueUtil.checkEmptyData(input.getLocCd(), "label.loc_cd");

        // 상품 코드 데이터 체크
        ValueUtil.checkEmptyData(input.getSkuCd(), "label.sku_cd");

        // 재고 수량 데이터 체크
        ValueUtil.checkEmptyNumber((Number) input.getInvQty(), "label.inv_qty");

        // 입력값으로 재고 객체 생성
        Inventory newInventory = ValueUtil.populate(input, new Inventory());

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location location = this.findAndCheckLocation(domainId, input.getLocCd(), Inventory.TRANSACTION_NEW);

        // 혼적 가능 여부 체크
        this.checkMixableLocation(location, input.getSkuCd());

        // Find SKU
        SKU sku = this.wmsBaseSvc.findSku(input.getComCd(), input.getSkuCd(), false, true);

        // 사용자가 입력한 정보대로 재고 정보 생성
        newInventory.setSkuNm(sku.getSkuNm());
        newInventory.setSkuBcd(sku.getSkuBarcd());
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

        // 트랜잭션 처리 체크
        if (ValueUtil.isEqualIgnoreCase(inventory.getLastTranCd(), Inventory.TRANSACTION_IN)) {
            throw ThrowUtil.newValidationErrorWithNoLog("이미 입고 처리되었습니다.");
        }

        // To 로케이션 체크
        ValueUtil.checkEmptyData(input.getLocCd(), "label.loc_cd");

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
     * @param domainId
     * @param input
     * @return
     */
    public Inventory moveInventory(Long domainId, InvTransaction input) {
        // 이동 로케이션 값 체크
        ValueUtil.checkEmptyData(input.getToLocCd(), "label.to_loc_cd");

        // 재고 이동 사유값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

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
     * 재고 이동 처리
     * 
     * @param inventory
     * @param toLocCd
     * @param remark
     * @return
     */
    public Inventory moveInventory(Inventory inventory, String toLocCd, String remark) {
        // To 로케이션 체크
        ValueUtil.checkEmptyData(toLocCd, "label.to_loc_cd");

        // 재고 조회 & 기본 체크 포인트 체크
        this.checkInventoryForTrx(inventory, Inventory.TRANSACTION_MOVE);

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location toLoc = this.findAndCheckLocation(inventory.getDomainId(), toLocCd, Inventory.TRANSACTION_MOVE);

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
        Inventory cond = new Inventory(inventory.getDomainId(), inventory.getBarcode(), toLocCd);
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
        // 원본 재고 조회 & 기본 체크 포인트 체크
        Inventory mainInventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_MERGE);
        // 병합할 바코드 체크
        ValueUtil.checkEmptyData(input.getMergeBarcode(), "label.merge_barcode");
        // 병합할 로케이션 체크
        ValueUtil.checkEmptyData(input.getMergeLocCd(), "label.merge_loc_cd");
        // 병합할 재고 조회 & 기본 체크 포인트 체크
        Inventory mergeInventory = this.findAndCheckInventory(domainId, input.getMergeBarcode(), input.getMergeLocCd(),
                Inventory.TRANSACTION_MERGE);
        // 병합 처리 & 결과 리턴
        return this.mergeInventory(mainInventory, mergeInventory, input.getReason());
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

        // 분할 수량 값 체크
        ValueUtil.checkEmptyNumber(splitQty, "label.split_qty");

        // 사유 값 체크
        ValueUtil.checkEmptyData(remark, "label.reason");

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
     * 재고 홀드 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory holdInventory(Long domainId, InvTransaction input) {
        // 사유 값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

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
        // 사유 값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

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
     * 재고 스크랩 로케이션 이동 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory scrapInventory(Long domainId, InvTransaction input) {
        // 이동 로케이션 값 체크
        ValueUtil.checkEmptyData(input.getToLocCd(), "label.to_loc_cd");

        // 사유 값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

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
     * 재고 조정 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory adjustInventory(Long domainId, InvTransaction input) {
        // 재고 조정 수량 값 체크
        ValueUtil.checkEmptyNumber(input.getToQty(), "label.to_qty");

        // 사유 값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

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
     * 가용 재고 조회 (StoragePolicy.releaseStrategy에 따라 정렬, needQty 충족분까지만 반환)
     *
     * 할당 전략 순으로 정렬한 뒤, 누적 가용 수량이 needQty를 처음으로 충족하는 행까지만 반환한다.
     * 윈도우 함수(SUM OVER)로 누적합을 계산하여 불필요한 행을 DB에서 미리 제거한다.
     *
     * 예) needQty=25, 재고 행: [10, 8, 12, 5] → 누적: [10, 18, 30, 35]
     * → 누적이 25를 처음 초과하는 3번째 행(누적 30)까지 반환 → [10, 8, 12]
     *
     * 전략별 정렬:
     * - FEFO : expired_date ASC NULLS LAST, created_at ASC
     * - FIFO : created_at ASC (기본값)
     * - LIFO : created_at DESC
     * - MANUAL : created_at ASC (작업자 선택 참고용)
     *
     * @param domainId    도메인 ID
     * @param comCd       화주사 코드
     * @param whCd        창고 코드
     * @param skuCd       상품 코드
     * @param needQty     필요 수량 — 이 수량을 충족하는 최소한의 재고 행만 반환
     * @param allocPolicy 불출 전략 (FIFO/FEFO/LIFO/MANUAL). null이면 FIFO 적용
     * @return 할당 우선순위 순, needQty 충족분까지의 가용 재고 목록
     */
    public List<Inventory> searchAvailableInventory(Long domainId, String comCd, String whCd, String skuCd,
            double needQty, String allocPolicy) {

        // 1. 전략 기본값 처리
        if (ValueUtil.isEmpty(allocPolicy)) {
            allocPolicy = StoragePolicy.RELEASE_STRATEGY_FIFO;
        }

        // 2. 전략별 ORDER BY 결정 (윈도우 함수 내부 정렬과 외부 정렬 모두 동일하게 적용)
        String orderBy;
        switch (allocPolicy) {
            case StoragePolicy.RELEASE_STRATEGY_FEFO:
                orderBy = "i.expired_date ASC NULLS LAST, i.created_at ASC";
                break;
            case StoragePolicy.RELEASE_STRATEGY_LIFO:
                orderBy = "i.created_at DESC";
                break;
            case StoragePolicy.RELEASE_STRATEGY_FIFO:
            case StoragePolicy.RELEASE_STRATEGY_MANUAL:
            default:
                orderBy = "i.created_at ASC";
                break;
        }

        // 3. 윈도우 함수로 누적 가용 수량 계산 후 needQty 충족분까지만 조회
        //
        // 누적합 조건: running_before < needQty
        // running_before = 현재 행 이전까지의 누적 가용 수량
        // → 현재 행 이전 누적이 아직 needQty 미만인 행만 반환
        // → 정확히 needQty를 채우는 마지막 행(부분 할당 행)도 포함됨
        String invSql = "SELECT * FROM (" +
                "  SELECT i.*, " +
                "    SUM(i.inv_qty - COALESCE(i.reserved_qty, 0)) OVER (" +
                "      ORDER BY " + orderBy +
                "      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW" +
                "    ) - (i.inv_qty - COALESCE(i.reserved_qty, 0)) AS running_before " +
                "  FROM inventories i " +
                "  WHERE i.domain_id = :domainId " +
                "    AND i.com_cd = :comCd " +
                "    AND i.wh_cd = :whCd " +
                "    AND i.sku_cd = :skuCd " +
                "    AND i.status = :status " +
                "    AND i.loc_cd in (select loc_cd from locations where domain_id = :domainId and wh_cd = :whCd and loc_type = 'PICKABLE' and (restrict_type is null or restrict_type != 'OUT') and (del_flag is null or del_flag = false)) "
                +
                "    AND (i.del_flag IS NULL OR i.del_flag = false) " +
                "    AND i.expire_status IN (:expireNormal, :expireImminent) " +
                "    AND (i.inv_qty - COALESCE(i.reserved_qty, 0)) > 0 " +
                ") ranked " +
                "WHERE running_before < :needQty " +
                "ORDER BY " + orderBy;

        Map<String, Object> invParams = ValueUtil.newMap(
                "domainId,comCd,whCd,skuCd,status,expireNormal,expireImminent,needQty",
                domainId, comCd, whCd, skuCd,
                Inventory.STATUS_STORED,
                Inventory.EXPIRE_STATUS_NORMAL,
                Inventory.EXPIRE_STATUS_IMMINENT,
                needQty);

        return this.queryManager.selectListBySql(invSql, invParams, Inventory.class, 0, 0);
    }

    /**
     * 재고 할당 처리
     * TODO 재고 할당시 재고 할당 방법에 따라 재고 할당 로직 수정 필요
     * 
     * @param inv
     * @param qty
     */
    public void allocateInventory(Inventory inv, double qty) {
        inv.setReservedQty(inv.getReservedQty() == null ? qty : inv.getReservedQty() + qty);
        inv.setUpdatedAt(new Date());
        this.queryManager.update(inv);
    }

    /**
     * 재고 할당 취소 처리
     * 
     * @param domainId
     * @param inventoryId
     * @param deallocQty
     */
    public void deallocateInventory(Long domainId, String inventoryId, double deallocQty) {
        String updInvSql = "UPDATE inventories SET reserved_qty = GREATEST(COALESCE(reserved_qty, 0) - :deallocQty, 0), updated_at = now() WHERE domain_id = :domainId AND id = :invId";
        Map<String, Object> updInvParams = ValueUtil.newMap("deallocQty,domainId,invId", deallocQty, domainId,
                inventoryId);
        this.queryManager.executeBySql(updInvSql, updInvParams);
    }

    /**
     * 재고 최종 출고 마감 처리
     * 
     * @param inventory
     * @param qty
     * @return
     */
    public Inventory closeShipmentInventory(Inventory inventory, double qty, String shipmentOrderNo) {
        inventory.setReservedQty(inventory.getReservedQty() - qty);
        inventory.setInvQty(inventory.getInvQty() - qty);
        inventory.setLastTranCd(Inventory.TRANSACTION_OUT);
        inventory.setRlsOrdNo(shipmentOrderNo);
        inventory.setUpdatedAt(new Date());
        this.queryManager.update(inventory);
        return inventory;
    }

    /**
     * 재고 최종 출고 마감 처리
     * 
     * @param domainId
     * @param inventoryId
     * @param qty
     * @param shipmentOrderNo
     */
    public void closeShipmentInventory(Long domainId, String inventoryId, double qty, String shipmentOrderNo) {
        Inventory inv = this.findAndCheckInventory(domainId, inventoryId, Inventory.TRANSACTION_OUT);
        this.closeShipmentInventory(inv, qty, shipmentOrderNo);
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
     * 재고 ID로 재고 정보 조회 & 기본 체크 포인트 체크
     * 
     * @param domainId
     * @param id
     * @param tranCd
     * @return
     */
    public Inventory findAndCheckInventory(Long domainId, String barcode, String locCd, String tranCd) {
        Inventory condition = new Inventory(domainId, barcode, locCd);
        Inventory inventory = this.queryManager.selectByCondition(Inventory.class, condition);
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

        Location location = this.wmsBaseSvc.findLocation(locCd, false, true);

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
            String sql = "select distinct(sku_cd) from inventories where domain_id = :domainId and loc_cd = :locCd and (del_flag is null or del_flag = false) and inv_qty > 0";
            List<String> skuList = this.queryManager.selectListBySql(sql,
                    ValueUtil.newMap("domainId,locCd", toLoc.getDomainId(), toLoc.getLocCd()), String.class, 0, 0);
            if (skuList.size() >= 1 && !skuList.contains(skuCd)) {
                throw ThrowUtil.newValidationErrorWithNoLog("다른 상품과 혼적이 불가한 로케이션입니다.");
            }
        }
    }
}
