package operato.wms.stock.service;

import java.util.List;
import java.util.Map;
import xyz.anythings.sys.util.AnyValueUtil;

import org.springframework.stereotype.Component;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.entity.StoragePolicy;
import operato.wms.inbound.WmsInboundConstants;
import operato.wms.oms.entity.StockAllocation;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.entity.InventoryTran;
import operato.wms.stock.model.InvTransaction;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * Fulfillment용 재고 모듈 트랜잭션 처리 서비스
 *
 * @author shortstop
 */
@Component
public class StockTransactionService extends BaseStockService {
    /**
     * 재고 임의 생성 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory createInventory(Long domainId, InvTransaction input) {
        // 재고 생성 공통 체크 프로세스 실행
        Object[] checkedObjects = this.checkForCreateInventory(domainId, input, Inventory.TRANSACTION_NEW);
        InventoryTran newInventory = (InventoryTran) checkedObjects[0];
        newInventory.setReasonCd(input.getReasonCd());
        newInventory.setReason(input.getReason());
        newInventory.setRemarks(input.getRemarks());
        Location location = (Location) checkedObjects[1];
        SKU sku = (SKU) checkedObjects[2];

        // 재고 트랜잭션 생성 처리
        return newInventory.createNewTransaction(location, sku);
    }

    /**
     * 세트 상품 조립 완성품 재고 생성
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory createSetAssembledInventory(Long domainId, InvTransaction input) {
        // 세트 상품 조립 완성품 재고 생성 공통 체크 프로세스 실행
        Object[] checkedObjects = this.checkForCreateInventory(domainId, input, InventoryTran.TRAN_TYPE_VAS_IN);
        InventoryTran newInventory = (InventoryTran) checkedObjects[0];
        Location location = (Location) checkedObjects[1];
        SKU sku = (SKU) checkedObjects[2];

        // 세트 상품 조립 완성품 재고 생성 처리
        return newInventory.createVasInTransaction(location, sku);
    }

    /**
     * 세트 상품 해체 시 구성품 재고 생성
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory createSetDisassembledInventory(Long domainId, InvTransaction input) {
        // 세트 상품 조립 해체 시 구성품 재고 생성 공통 체크 프로세스 실행
        Object[] checkedObjects = this.checkForCreateInventory(domainId, input, InventoryTran.TRAN_TYPE_VAS_IN);
        InventoryTran newInventory = (InventoryTran) checkedObjects[0];
        Location location = (Location) checkedObjects[1];
        SKU sku = (SKU) checkedObjects[2];

        // 세트 상품 해체 시 구성품 재고 생성 처리
        return newInventory.createVasInTransaction(location, sku);
    }

    /**
     * 세트 상품 조립 후 구성품 할당 재고로 부터 재고 차감
     * 
     * @param inventory
     * @param consumeQty
     * @param releaseQty
     * @return
     */
    public Inventory consumeSetAssembledInventory(Inventory inventory, double consumeQty, double releaseQty) {
        // 세트 상품 해체 구성품 재고 생성 처리
        InventoryTran consumeTran = new InventoryTran();
        return consumeTran.createVasConsumeAllocatedTransaction(inventory, consumeQty, releaseQty);
    }

    /**
     * 세트 상품 해체 시 세트 상품 할당 재고로 부터 재고 차감
     * 
     * @param inventory
     * @param consumeQty
     * @param releaseQty
     * @return
     */
    public Inventory consumeSetDisassembledInventory(Inventory inventory, double consumeQty, double releaseQty) {
        // 세트 상품 해체 구성품 재고 생성 처리
        InventoryTran consumeTran = new InventoryTran();
        return consumeTran.createVasConsumeAllocatedTransaction(inventory, consumeQty, releaseQty);
    }

    /**
     * 재고 입고 적치 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory putAway(Long domainId, InvTransaction input) {
        // 1. 재고 적치 공통 체크 프로세스
        Inventory inventory = this.checkForPutawayInventory(domainId, input);

        // 2. 바코드 재고 수량, 작업자 입력 수량 체크
        String toLocCd = input.getLocCd();
        double invQty = inventory.getInvQty();
        double putawayQty = input.getInvQty();

        // 3. 바코드 재고 수량이 적치 수량보다 크다면 재고 분할 처리
        if (invQty > putawayQty) {
            // 재고 분할 및 이동 처리
            inventory = inventory.split(toLocCd, putawayQty, input.getReasonCd(), input.getReason(),
                    input.getRemarks());
        }

        // 4. 재고 적치 처리 — 목적지 로케이션을 inventory에 먼저 반영 후 트랜잭션 생성
        inventory.setLocCd(toLocCd);
        InventoryTran tran = new InventoryTran();
        tran.setTranQty(inventory.getInvQty());
        tran.setToLocCd(toLocCd);
        tran.setRefDocType(InventoryTran.REF_DOC_TYPE_RCV);
        tran.setRefDocNo(inventory.getRcvNo());
        tran.setRefLineNo(ValueUtil.toString(inventory.getRcvSeq()));
        tran.setReasonCd(input.getReasonCd());
        tran.setReason(input.getReason());
        tran.setRemarks(input.getRemarks());
        tran.createReceiveTransaction(inventory);

        // 5. 입고 지시 상태 변경
        String sql = "update receivings set status = :status where domain_id = :domainId and rcv_no = :rcvNo and status = :prevStatus";
        Map<String, Object> params = ValueUtil.newMap("domainId,rcvNo,status,prevStatus", domainId,
                inventory.getRcvNo(), WmsInboundConstants.STATUS_PUTAWAY, WmsInboundConstants.STATUS_APPROVED);
        this.queryManager.executeBySql(sql, params);

        // 6. 재고 리턴
        return inventory;
    }

    /**
     * 반품 재입고 처리
     * 
     * @param domainId
     * @param inventory
     * @return
     */
    public Inventory restockByRwa(Long domainId, Inventory inventory) {
        InventoryTran invTran = new InventoryTran();
        return invTran.createRestockByRwaTransaction(inventory);
    }

    /**
     * 재고 이동 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory moveInventory(Long domainId, InvTransaction input) {
        // 1. 재고 이동 기본 체크 포인트 체크
        Inventory inventory = this.checkForMoveInventory(domainId, input);

        // 2. 재고 수량과 이동 수량 체크하여 재고 전체 이동 혹은 부분 이동 처리
        Double invQty = inventory.getInvQty();
        Double moveQty = input.getToQty();

        if (moveQty == null || moveQty <= 0.0 || ValueUtil.toDouble(moveQty) >= ValueUtil.toDouble(invQty)) {
            // 2.1 재고 전체 이동 처리
            return inventory.move(input.getToLocCd(), input.getReasonCd(), input.getReason(),
                    input.getRemarks());
        } else {
            // 2.2 재고 부분 이동 처리
            return inventory.split(input.getToLocCd(), input.getToQty(), input.getReasonCd(), input.getReason(),
                    input.getRemarks());
        }
    }

    /**
     * 재고 이동 처리 - 재고 전체 수량 이동
     * 
     * @param inventory 이동하려는 재고
     * @param toLocCd   이동 로케이션 코드
     * @param reasonCd  이동 사유 코드
     * @param reason    이동 사유 명
     * @param remark    비고
     * @return
     */
    public Inventory moveInventory(Inventory inventory, String toLocCd, String reasonCd, String reason, String remark) {
        return inventory.move(toLocCd, reasonCd, reason, remark);
    }

    /**
     * 재고 부분 이동 처리 - 분할 후 이동 처리
     * 
     * @param inventory 이동하려는 재고 바코드
     * @param toLocCd   이동 로케이션 코드
     * @param moveQty   이동 수량
     * @param reasonCd  이동 사유 코드
     * @param reason    이동 사유 명
     * @param remark    비고
     * @return
     */
    public Inventory moveInventory(Inventory inventory, String toLocCd, double moveQty, String reasonCd, String reason,
            String remark) {
        return inventory.split(toLocCd, moveQty, reasonCd, reason, remark);
    }

    /**
     * 두 개의 재고 바코드 병합 처리
     * 
     * @param mainInv
     * @param mergeInv
     * @param reasonCd
     * @param reason
     * @param remark
     * @return
     */
    public Inventory mergeInventory(Inventory mainInv, Inventory mergeInv, String reasonCd, String reason,
            String remark) {
        return mainInv.merge(mergeInv, AnyValueUtil.newUuid32(), reasonCd, reason, remark);
    }

    /**
     * 재고 병합 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory mergeInventory(Long domainId, InvTransaction input) {
        // 1. 병합 전 재고 체크
        Inventory[] invArray = this.checkForMergeInventory(domainId, input);
        Inventory mainInventory = invArray[0];
        Inventory mergeInventory = invArray[1];

        // 2. 이동 작업 그룹 ID 생성
        String groupId = AnyValueUtil.newUuid32();

        // 3. 병합 처리 & 결과 리턴
        return mainInventory.merge(mergeInventory, groupId, input.getReasonCd(), input.getReason(), input.getRemarks());
    }

    /**
     * 재고 분할 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory splitInventory(Long domainId, InvTransaction input) {
        // 1. 분할 전 재고 체크
        Inventory inventory = this.checkForSplitInventory(domainId, input);
        // 2. 분할 처리
        return inventory.split(input.getToLocCd(), input.getToQty(), input.getReasonCd(), input.getReason(),
                input.getRemarks());
    }

    /**
     * 재고 홀드 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory holdInventory(Long domainId, InvTransaction input) {
        // 재고 홀드 체크
        Inventory inventory = this.checkForHoldInventory(domainId, input);

        // 재고 홀드 트랜잭션 처리
        InventoryTran invTran = new InventoryTran();
        invTran.setReasonCd(input.getReasonCd());
        invTran.setReason(input.getReason());
        invTran.setRemarks(input.getRemarks());
        return invTran.createHoldTransaction(inventory);
    }

    /**
     * 재고 홀드 해제 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory releaseHoldInventory(Long domainId, InvTransaction input) {
        // 재고 홀드 해제 체크
        Inventory inventory = this.checkForReleaseHoldInventory(domainId, input);

        // 재고 릴리즈 트랜잭션 처리 - 보관 중 상태로 전환 ...
        InventoryTran invTran = new InventoryTran();
        invTran.setReasonCd(input.getReasonCd());
        invTran.setReason(input.getReason());
        invTran.setRemarks(input.getRemarks());
        return invTran.createReleaseHoldTransaction(inventory);
    }

    /**
     * 재고 폐기 처리
     * 
     * @param domainId
     * @param input
     * @return
     */
    public Inventory scrapInventory(Long domainId, InvTransaction input) {
        // 재고 폐기 처리 전 체크
        Inventory inventory = this.checkForScrapInventory(domainId, input);

        // 재고 폐기 트랜잭션 처리
        InventoryTran invTran = new InventoryTran();
        invTran.setReasonCd(input.getReasonCd());
        invTran.setReason(input.getReason());
        invTran.setRemarks(input.getRemarks());
        invTran.createScrapTransaction(inventory);

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
        // 재고 조정을 위한 재고 체크
        Inventory inventory = this.checkForAdjustInventory(domainId, input, Inventory.TRANSACTION_ADJUST);

        // 입력값으로 재고 객체 생성
        InventoryTran invTran = ValueUtil.populate(inventory, new InventoryTran(), "domainId", "barcode", "whCd",
                "comCd", "skuCd", "skuNm", "locCd", "lotNo", "serialNo", "expiredDate");

        // 소비기한, Lot 정보는 수정되었을 때만 업데이트한다.
        if (ValueUtil.isNotEmpty(input.getExpiredDate())) {
            invTran.setExpiredDate(input.getExpiredDate());
        }
        if (ValueUtil.isNotEmpty(input.getLotNo())) {
            invTran.setLotNo(input.getLotNo());
        }

        // 재고 조정 수량, 사유, 비고 설정
        invTran.setTranQty(input.getToQty());
        invTran.setReasonCd(input.getReasonCd());
        invTran.setReason(input.getReason());
        invTran.setRemarks(input.getRemarks());

        // 재고 조정 트랜잭션 처리
        return invTran.createAdjustTransaction(inventory);
    }

    /**
     * 재고 할당 처리 (기본: HARD 상태)
     *
     * @param inv           재고
     * @param allocStrategy 할당 전략
     * @param allocateQty   할당 수량
     * @param allocType     할당 유형
     * @param orderId       주문 아이디
     * @param orderNo       주문 번호
     * @param orderItemId   주문 아이템 아이디
     */
    public Inventory allocateInventory(Inventory inv, String allocStrategy, double allocateQty, String allocType,
            String orderId, String orderNo, String orderItemId) {
        return this.allocateInventory(inv, allocStrategy, allocateQty, allocType, orderId, orderNo, orderItemId,
                StockAllocation.STATUS_HARD);
    }

    /**
     * 재고 할당 처리 (초기 상태 지정 가능)
     *
     * B2C 주문은 SOFT로 생성 후 웨이브 릴리즈 시 HARD로 전환,
     * B2B 및 VAS는 HARD로 직접 생성한다.
     *
     * @param inv           재고
     * @param allocStrategy 할당 전략
     * @param allocateQty   할당 수량
     * @param allocType     할당 유형
     * @param orderId       주문 아이디
     * @param orderNo       주문 번호
     * @param orderItemId   주문 아이템 아이디
     * @param status        초기 할당 상태 (SOFT / HARD)
     */
    public Inventory allocateInventory(Inventory inv, String allocStrategy, double allocateQty, String allocType,
            String orderId, String orderNo, String orderItemId, String status) {

        StockAllocation alloc = new StockAllocation();
        alloc.setDomainId(inv.getDomainId());
        alloc.setShipmentOrderId(orderId);
        alloc.setShipmentOrderItemId(orderItemId);
        alloc.setInventoryId(inv.getId());
        alloc.setSkuCd(inv.getSkuCd());
        alloc.setBarcode(inv.getBarcode());
        alloc.setLocCd(inv.getLocCd());
        alloc.setLotNo(inv.getLotNo());
        alloc.setExpiredDate(inv.getExpiredDate());
        alloc.setAllocQty(allocateQty);
        alloc.setAllocType(allocType);
        alloc.setAllocStrategy(allocStrategy);
        alloc.setStatus(status);
        alloc.setAllocatedAt(DateUtil.currentTimeStr());
        this.queryManager.insert(alloc);

        // 재고 할당
        InventoryTran invTran = new InventoryTran();
        invTran.setRefDocType(ValueUtil.isEqualIgnoreCase(StockAllocation.ALLOC_TYPE_SHIPMENT, allocType)
                ? InventoryTran.REF_DOC_TYPE_SHIP
                : InventoryTran.REF_DOC_TYPE_VAS);
        invTran.setRefDocNo(orderNo);
        invTran.setTranQty(allocateQty);
        return invTran.createAllocateTransaction(inv);
    }

    /**
     * 재고 할당 해제 처리
     * 
     * @param stockAllocation
     * @return
     */
    public Inventory deallocateInventory(StockAllocation stockAllocation) {
        // 재고 체크
        Inventory inventory = this.findAndCheckInventory(stockAllocation.getDomainId(),
                stockAllocation.getInventoryId(), Inventory.TRANSACTION_DEALLOCATE);

        // 재고 할당 해제
        InventoryTran invTran = new InventoryTran();
        invTran.setTranQty(stockAllocation.getAllocQty());
        invTran.setRefDocType(
                ValueUtil.isEqualIgnoreCase(stockAllocation.getAllocType(), StockAllocation.ALLOC_TYPE_SHIPMENT)
                        ? InventoryTran.REF_DOC_TYPE_SHIP
                        : InventoryTran.REF_DOC_TYPE_VAS);
        invTran.setRefDocNo(stockAllocation.getShipmentOrderId());
        invTran.createDeallocateTransaction(inventory);

        // 재고 할당 삭제
        this.queryManager.delete(stockAllocation);

        // 재고 리턴
        return inventory;
    }

    /**
     * 재고 부분 할당 취소
     * 
     * @param stockAllocation 재고 할당
     * @param deallocQty      할당 부분 취소 수량
     * @return
     */
    public Inventory deallocatePartialInventory(StockAllocation stockAllocation, double deallocQty) {
        // 1. 재고 체크
        Inventory inventory = this.findAndCheckInventory(stockAllocation.getDomainId(),
                stockAllocation.getInventoryId(), Inventory.TRANSACTION_DEALLOCATE);

        // 2. 재고 할당 해제
        InventoryTran invTran = new InventoryTran();
        invTran.setTranQty(deallocQty);
        invTran.setRefDocType(
                ValueUtil.isEqualIgnoreCase(stockAllocation.getAllocType(), StockAllocation.ALLOC_TYPE_SHIPMENT)
                        ? InventoryTran.REF_DOC_TYPE_SHIP
                        : InventoryTran.REF_DOC_TYPE_VAS);
        invTran.setRefDocNo(stockAllocation.getShipmentOrderId());
        invTran.createDeallocateTransaction(inventory);

        // 3. 재고 할당 업데이트
        stockAllocation.setAllocQty(stockAllocation.getAllocQty() - deallocQty);
        this.queryManager.update(stockAllocation, "allocQty", "updatedAt", "updaterId");

        // 4. 재고 리턴
        return inventory;
    }

    /**
     * 재고 최종 출고 마감 처리
     * 
     * @param inventory
     * @param outQty
     * @param shipmentOrderNo
     * @return
     */
    public Inventory closeShipmentInventory(Inventory inventory, double outQty, String shipmentOrderNo) {
        /*
         * inventory.setReservedQty(inventory.getReservedQty() - outQty);
         * inventory.setInvQty(inventory.getInvQty() - outQty);
         * inventory.setLastTranCd(Inventory.TRANSACTION_OUT);
         * inventory.setRlsOrdNo(shipmentOrderNo);
         * inventory.setUpdatedAt(new Date());
         * this.queryManager.update(inventory);
         * return inventory;
         */

        // 출고 처리
        InventoryTran invTran = new InventoryTran();
        invTran.setTranQty(outQty);
        invTran.setRefDocType(InventoryTran.REF_DOC_TYPE_SHIP);
        invTran.setRefDocNo(shipmentOrderNo);
        return invTran.createShipmentTransaction(inventory);
    }

    /**
     * 재고 최종 출고 마감 처리
     * 
     * @param domainId
     * @param inventoryId
     * @param outQty
     * @param shipmentOrderNo
     */
    public Inventory closeShipmentInventory(Long domainId, String inventoryId, double outQty, String shipmentOrderNo) {
        Inventory inv = this.findAndCheckInventory(domainId, inventoryId, Inventory.TRANSACTION_OUT);
        return this.closeShipmentInventory(inv, outQty, shipmentOrderNo);
    }

    /**
     * 이동 목적지 로케이션 유효성 사전 검증
     *
     * 로케이션 존재 여부, 삭제 여부, 이동 제한(restrictType=MOVE) 여부를 체크한다.
     * 유효한 경우 로케이션 정보를 반환한다.
     *
     * @param domainId 도메인 ID
     * @param toLocCd  목적지 로케이션 코드
     * @return 유효한 Location 엔티티
     */
    public Location validateLocationForMoveIn(Long domainId, String toLocCd) {
        // 목적지 로케이션 코드 값 체크
        ValueUtil.checkEmptyData(toLocCd, "label.to_loc_cd");
        // 로케이션 조회
        Location location = this.wmsBaseSvc.findLocation(toLocCd, false, true);

        if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_IN)) {
            throw ThrowUtil.newValidationErrorWithNoLog("입고 제한이 걸린 로케이션이라 " + toLocCd + " 으로 이동이 불가합니다.");
        }

        // 로케이션 리턴
        return location;
    }

    /**
     * 보충 작업 도착 로케이션 유효성 사전 검증 (PDA 보충 화면 전용)
     *
     * @param domainId  도메인 ID
     * @param toLocCd   도착 로케이션 코드
     * @param fromLocCd 출발 로케이션 코드 (보충 아이템의 from_loc_cd)
     * @param skuCd     보충 대상 SKU 코드
     * @param whCd      보충 지시 창고 코드
     * @return 유효한 Location 엔티티
     */
    public Location validateLocationForReplenish(Long domainId, String toLocCd, String fromLocCd, String skuCd,
            String whCd) {
        // 1. 도착 로케이션 조회 (존재·삭제 체크, 없으면 예외)
        ValueUtil.checkEmptyData(toLocCd, "label.to_loc_cd");
        Location toLoc = this.wmsBaseSvc.findLocation(toLocCd, false, true);

        // 2. 창고 불일치 체크
        if (ValueUtil.isNotEmpty(whCd) && !whCd.equals(toLoc.getWhCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "도착 로케이션의 창고[" + toLoc.getWhCd() + "]가 보충 지시 창고[" + whCd + "]와 다릅니다.");
        }

        // 3. 로케이션 유형이 STORE(보관)이면 불가
        if ("STORE".equals(toLoc.getLocType())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "보관(STORE) 로케이션[" + toLocCd + "]으로는 보충 이동이 불가합니다. 피킹(PICKABLE) 로케이션을 지정하세요.");
        }

        // 4. 출고 제한 로케이션 체크 (이후 피킹 불가)
        if ("OUT".equals(toLoc.getRestrictType())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "출고 제한 로케이션[" + toLocCd + "]으로 보충 시 이후 피킹이 불가합니다.");
        }

        // 5. 입고 제한 로케이션 체크
        if ("IN".equals(toLoc.getRestrictType())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "입고 제한이 걸린 로케이션[" + toLocCd + "]으로는 이동이 불가합니다.");
        }

        // 6. 고정 SKU 불일치 체크
        if (ValueUtil.isNotEmpty(toLoc.getSkuCd()) && ValueUtil.isNotEmpty(skuCd)
                && !toLoc.getSkuCd().equals(skuCd)) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "고정 SKU 로케이션[" + toLocCd + "]의 지정 SKU[" + toLoc.getSkuCd() + "]와 보충 SKU[" + skuCd + "]가 다릅니다.");
        }

        // 7. 혼적 불가 로케이션에 이미 다른 SKU 재고 존재 체크
        if (Boolean.FALSE.equals(toLoc.getMixableFlag()) && ValueUtil.isNotEmpty(skuCd)) {
            String existSql = "SELECT COUNT(*) FROM inventories WHERE domain_id = :domainId AND loc_cd = :locCd AND sku_cd <> :skuCd AND (del_flag IS NULL OR del_flag = false) AND inv_qty > 0";
            Long cnt = this.queryManager.selectBySql(existSql,
                    ValueUtil.newMap("domainId,locCd,skuCd", domainId, toLocCd, skuCd), Long.class);
            if (cnt != null && cnt > 0) {
                throw ThrowUtil.newValidationErrorWithNoLog(
                        "혼적 불가 로케이션[" + toLocCd + "]에 이미 다른 SKU 재고가 존재합니다.");
            }
        }

        // 8. 출발 로케이션 출고 제한 체크
        if (ValueUtil.isNotEmpty(fromLocCd)) {
            Location fromLoc = this.wmsBaseSvc.findLocation(fromLocCd, false, true);
            if ("OUT".equals(fromLoc.getRestrictType())) {
                throw ThrowUtil.newValidationErrorWithNoLog(
                        "출발 로케이션[" + fromLocCd + "]이 출고 제한 상태라 보충 이동이 불가합니다. 보충 지시를 확인하세요.");
            }
        }

        return toLoc;
    }

    /**
     * 이동 출고 로케이션 유효성 사전 검증
     *
     * 로케이션 존재 여부, 삭제 여부, 이동 제한(restrictType=OUT) 여부를 체크한다.
     * 유효한 경우 로케이션 정보를 반환한다.
     *
     * @param domainId  도메인 ID
     * @param fromLocCd 출고 로케이션 코드
     * @return 유효한 Location 엔티티
     */
    public Location validateLocationForMoveOut(Long domainId, String fromLocCd) {
        // 목적지 로케이션 코드 값 체크
        ValueUtil.checkEmptyData(fromLocCd, "label.from_loc_cd");

        // 로케이션 조회
        Location location = this.wmsBaseSvc.findLocation(fromLocCd, false, true);

        // 출고 제한 로케이션 체크
        if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_OUT)) {
            throw ThrowUtil.newValidationErrorWithNoLog("출고 제한이 걸린 로케이션이라 " + fromLocCd + " 에서 출고가 불가합니다.");
        }

        // 로케이션 리턴
        return location;
    }

    /**
     * 재고 바코드 이동 가능 여부 사전 검증
     *
     * 아래 항목을 순서대로 체크한다.
     * 1. 바코드로 재고 조회 (del_flag=false)
     * 2. 재고 기본 체크 (존재, 수량 > 0, LOCKED 상태 여부)
     * 3. 목적지 로케이션 조회 & 이동 제한 체크
     * 4. 현재 로케이션과 목적지 동일 여부
     * 5. 창고 일치 여부
     * 6. 화주사 전용 로케이션 체크
     * 7. 고정 SKU 로케이션 체크
     * 8. 혼적 가능 여부 체크
     *
     * @param domainId  도메인 ID
     * @param fromLocCd 출고 로케이션 코드
     * @param barcode   재고 바코드
     * @param toLocCd   목적지 로케이션 코드
     * @return 유효한 Inventory 엔티티
     */
    public Inventory validateInventoryForMove(Long domainId, String fromLocCd, String barcode, String toLocCd) {
        // 출고 로케이션 코드 존재 여부 체크
        ValueUtil.checkEmptyData(fromLocCd, "label.from_loc_cd");

        // 바코드 존재 여부 체크
        ValueUtil.checkEmptyData(barcode, "label.barcode");

        // 목적지 로케이션 코드 존재 여부 체크
        ValueUtil.checkEmptyData(toLocCd, "label.to_loc_cd");

        // 바코드로 재고 조회 (삭제되지 않은 재고만)
        String sql = "SELECT * FROM inventories WHERE domain_id = :domainId AND loc_cd = :locCd AND barcode = :barcode AND (del_flag IS NULL OR del_flag = false) LIMIT 1";
        Inventory inventory = this.queryManager.selectBySql(
                sql, ValueUtil.newMap("domainId,locCd,barcode", domainId, fromLocCd, barcode), Inventory.class);

        // 존재하지 않는 재고
        if (inventory == null) {
            throw ThrowUtil
                    .newValidationErrorWithNoLog("해당 로케이션[" + fromLocCd + "]에 재고 바코드[" + barcode + "]가 존재하지 않습니다.");
        }

        // 재고 예약 수량이 있는지 체크
        if (inventory.getReservedQty() != null && inventory.getReservedQty() > 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("예약 수량이 있는 재고는 이동할 수 없습니다.");
        }

        // 재고 기본 유효성 체크 (존재, 삭제, 수량, LOCKED 상태 등)
        this.checkInventoryForTrx(inventory, Inventory.TRANSACTION_MOVE);

        // 목적지 로케이션 조회 & 이동 제한(restrict_type=MOVE) 체크
        Location toLoc = this.validateLocationForMoveIn(domainId, toLocCd);

        // 현재 로케이션과 목적지 동일 여부 체크
        if (ValueUtil.isEqualIgnoreCase(inventory.getLocCd(), toLocCd)) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동하려는 로케이션이 재고의 현재 로케이션과 동일합니다.");
        }

        // 창고 일치 여부 체크 (창고 간 이동 불가)
        if (ValueUtil.isNotEqual(inventory.getWhCd(), toLoc.getWhCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "이동 로케이션의 창고와 재고의 창고가 다릅니다. 창고 간 이동은 Transfer 트랜잭션을 이용하세요.");
        }

        // 화주사 전용 로케이션 체크
        if (ValueUtil.isNotEmpty(toLoc.getComCd()) && ValueUtil.isNotEqual(toLoc.getComCd(), inventory.getComCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "화주사 [" + toLoc.getComCd() + "] 전용 로케이션입니다. 해당 재고(" + inventory.getComCd() + ")는 이동할 수 없습니다.");
        }

        // 고정 SKU 로케이션 체크
        this.checkFixedSkuLocation(toLoc, inventory.getSkuCd());

        // 혼적 가능 여부 체크
        this.checkMixableLocation(toLoc, inventory.getSkuCd());

        // toLocCd로 이동 가능한 재고 리턴
        return inventory;
    }

    /**
     * 재고 병합 대상 유효성 사전 검증
     *
     * 아래 항목을 순서대로 체크한다.
     * 1. merge_barcode, merge_loc_cd 값 존재 여부
     * 2. (barcode, loc_cd)로 재고 조회
     * 3. 재고 기본 유효성 체크 (존재, 삭제, 수량, LOCKED 상태)
     * 4. 기준 재고(base_inventory_id)와 동일 여부 — 자기 자신 병합 차단
     *
     * @param domainId        도메인 ID
     * @param mergeBarcode    병합 대상 바코드
     * @param mergeLocCd      병합 대상 로케이션 코드
     * @param baseInventoryId 기준 재고 ID (null 허용 — 동일성 체크 생략)
     * @return 유효한 병합 대상 Inventory 엔티티
     */
    public Inventory validateInventoryForMerge(Long domainId, String mergeBarcode, String mergeLocCd,
            String baseInventoryId) {
        // 병합 바코드 값 체크
        ValueUtil.checkEmptyData(mergeBarcode, "label.merge_barcode");

        // 병합 로케이션 값 체크
        ValueUtil.checkEmptyData(mergeLocCd, "label.merge_loc_cd");

        // (barcode, loc_cd)로 재고 조회 & 기본 체크
        Inventory target = this.findAndCheckInventory(domainId, mergeBarcode, mergeLocCd,
                Inventory.TRANSACTION_MERGE);

        // 기준 재고와 동일한지 체크 (자기 자신 병합 불가)
        if (ValueUtil.isNotEmpty(baseInventoryId) && ValueUtil.isEqualIgnoreCase(target.getId(), baseInventoryId)) {
            throw ThrowUtil.newValidationErrorWithNoLog("기준 재고와 동일한 재고는 병합할 수 없습니다.");
        }

        // 원본 재고 조회 & 기본 체크 포인트 체크
        Inventory mainInventory = this.findAndCheckInventory(domainId, baseInventoryId, Inventory.TRANSACTION_MERGE);

        // 동일 재고 체크
        if (mainInventory.getId().equals(target.getId())) {
            throw ThrowUtil.newValidationErrorWithNoLog("동일한 재고를 병합할 수 없습니다.");
        }

        // 동일 SKU 체크
        if (!mainInventory.getSkuCd().equals(target.getSkuCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("동일한 SKU만 병합할 수 있습니다.");
        }

        // 소비기한이 있는 경우, 동일 소비기한 체크
        if (ValueUtil.isNotEmpty(mainInventory.getExpiredDate())) {
            if (!mainInventory.getExpiredDate().equals(target.getExpiredDate())) {
                throw ThrowUtil.newValidationErrorWithNoLog("동일한 소비기한을 가진 재고만 병합할 수 있습니다.");
            }
        }

        // 할당 수량이 있다면 병합 불가
        if (mainInventory.getReservedQty() > 0 || target.getReservedQty() > 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("할당 수량이 있는 재고는 병합할 수 없습니다.");
        }

        return target;
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
                orderBy = "expired_date ASC NULLS LAST, created_at ASC";
                break;
            case StoragePolicy.RELEASE_STRATEGY_LIFO:
                orderBy = "created_at DESC";
                break;
            case StoragePolicy.RELEASE_STRATEGY_FIFO:
            case StoragePolicy.RELEASE_STRATEGY_MANUAL:
            default:
                orderBy = "created_at ASC";
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
     * 바코드로 SKU 정보 리스트 조회 — PDA 공통 바코드 스캔 지원
     *
     * 항상 리스트로 반환하며, 프론트엔드에서 결과 수에 따라 처리한다:
     * - 1건: 바로 매칭 처리
     * - 2건 이상: 상품 선택 팝업 표시
     *
     * 매칭 순서:
     * 1. inventories.barcode 직접 매칭 → 단건 (재고 바코드는 유일)
     * 2. sku.sku_barcd / sku_barcd2 / sku_barcd3 역조회 → 복수 가능
     * 3. sku.sku_cd 폴백 → 단건 (화주사 내 유일)
     *
     * @param domainId      도메인 ID
     * @param barcode       스캔된 바코드 문자열
     * @param comCd         화주사 코드 (null 허용 — 전체 검색)
     * @param skipInventory true이면 재고 바코드(inventories.barcode) 조회를 건너뜀
     *                      — 재고 이동·출고 등 재고 바코드가 무의미한 화면에서 사용
     * @return [{ sku_cd, sku_nm, sku_barcd }, ...] — 항상 리스트
     */
    public List<SKU> resolveBarcode(Long domainId, String barcode, String comCd, boolean skipInventory) {
        ValueUtil.checkEmptyData(barcode, "label.barcode");

        String comFilter = ValueUtil.isNotEmpty(comCd) ? " AND com_cd = :comCd" : "";
        Map<String, Object> params = ValueUtil.newMap("domainId,barcode", domainId, barcode);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }

        // 1. 재고 바코드 직접 매칭 — skipInventory=false일 때만 시도, 재고 바코드는 유일하므로 단건만 반환
        if (!skipInventory) {
            String invSql = "SELECT com_cd, sku_cd, sku_nm, barcode as sku_barcd FROM inventories" +
                    " WHERE domain_id = :domainId AND barcode = :barcode" + comFilter + " LIMIT 1";
            SKU invResult = this.queryManager.selectBySql(invSql, params, SKU.class);
            if (invResult != null) {
                return List.of(invResult);
            }
        }

        // 2. SKU 마스터 바코드(sku_barcd / sku_barcd2 / sku_barcd3) 역조회 — 복수 가능
        String skuBarcdSql = "SELECT com_cd, sku_cd, sku_nm, sku_barcd FROM sku" +
                " WHERE domain_id = :domainId" + comFilter +
                " AND (sku_barcd = :barcode OR sku_barcd2 = :barcode OR sku_barcd3 = :barcode)";
        List<SKU> skuList = (List<SKU>) this.queryManager.selectListBySql(skuBarcdSql,
                params, SKU.class, 0, 0);
        if (skuList != null && !skuList.isEmpty()) {
            return skuList;
        }

        // 3. SKU 코드 폴백 — sku_cd는 화주사 내 유일하므로 단건만 반환
        String skuCdSql = "SELECT com_cd, sku_cd, sku_nm, sku_barcd FROM sku" +
                " WHERE domain_id = :domainId" + comFilter + " AND sku_cd = :barcode LIMIT 1";
        SKU skuResult = this.queryManager.selectBySql(skuCdSql, params, SKU.class);
        if (skuResult != null) {
            return List.of(skuResult);
        }

        throw ThrowUtil.newValidationErrorWithNoLog("바코드에 해당하는 상품을 찾을 수 없습니다: " + barcode);
    }

    /**
     * 일별 재고 수불 집계 — inventory_trans를 집계하여 daily_stock_summaries에 UPSERT한다.
     * 이미 집계된 날짜를 재실행하면 전체 덮어쓰기(UPSERT)로 처리되므로 멱등성이 보장된다.
     *
     * @param domainId    도메인 ID
     * @param summaryDate 집계 기준일 (YYYY-MM-DD)
     * @return UPSERT된 레코드 수
     */
    public int summarizeDailyStock(Long domainId, String summaryDate) {
        Map<String, Object> params = ValueUtil.newMap("domainId,summaryDate", domainId, summaryDate);

        // 1. 기존 집계 데이터 삭제 (재실행 멱등 보장)
        this.queryManager.executeBySql(
                "DELETE FROM daily_stock_summaries WHERE domain_id = :domainId AND summary_date = :summaryDate",
                params);

        // 2. opening CTE: summaryDate 이전 각 바코드의 마지막 after_qty 합산 → 기초 재고
        // daily CTE: summaryDate 당일 tran_type별 수량 집계
        // combined CTE: 기초 재고가 있는 상품(트랜잭션 없음 포함) ∪ 당일 트랜잭션 상품
        String insertSql = "WITH opening AS (" +
                "  SELECT wh_cd, com_cd, sku_cd, sku_nm, SUM(after_qty) AS opening_qty" +
                "  FROM (" +
                "    SELECT DISTINCT ON (inventory_id) wh_cd, com_cd, sku_cd, sku_nm, after_qty" +
                "    FROM inventory_trans" +
                "    WHERE domain_id = :domainId AND tran_date < :summaryDate" +
                "    ORDER BY inventory_id, tran_at DESC" +
                "  ) last_trans" +
                "  GROUP BY wh_cd, com_cd, sku_cd, sku_nm" +
                ")," +
                "daily AS (" +
                "  SELECT wh_cd, com_cd, sku_cd, sku_nm," +
                "    SUM(CASE WHEN tran_type IN ('IN','RWA_RESTOCK') THEN tran_qty ELSE 0 END) AS in_qty," +
                "    SUM(CASE WHEN tran_type = 'OUT' THEN tran_qty ELSE 0 END) AS out_qty," +
                "    SUM(CASE WHEN tran_type = 'IN_CANCEL' THEN tran_qty ELSE 0 END) AS in_cancel_qty," +
                "    SUM(CASE WHEN tran_type = 'OUT_CANCEL' THEN tran_qty ELSE 0 END) AS out_cancel_qty," +
                "    SUM(CASE WHEN tran_type = 'TRANSFER_IN' THEN tran_qty ELSE 0 END) AS transfer_in_qty," +
                "    SUM(CASE WHEN tran_type = 'TRANSFER_OUT' THEN tran_qty ELSE 0 END) AS transfer_out_qty," +
                "    SUM(CASE WHEN tran_type IN ('ADJUST','COUNT') AND direction = 'IN' THEN tran_qty ELSE 0 END) AS adjust_plus_qty,"
                +
                "    SUM(CASE WHEN tran_type IN ('ADJUST','COUNT') AND direction = 'OUT' THEN tran_qty ELSE 0 END) AS adjust_minus_qty,"
                +
                "    SUM(CASE WHEN tran_type = 'NEW' THEN tran_qty ELSE 0 END) AS add_qty," +
                "    SUM(CASE WHEN tran_type = 'SCRAP' THEN tran_qty ELSE 0 END) AS loss_qty," +
                "    SUM(CASE WHEN tran_type = 'VAS_OUT' THEN tran_qty ELSE 0 END) AS vas_out_qty," +
                "    SUM(CASE WHEN tran_type = 'VAS_IN' THEN tran_qty ELSE 0 END) AS vas_in_qty," +
                "    CAST(COUNT(*) AS integer) AS tran_count" +
                "  FROM inventory_trans" +
                "  WHERE domain_id = :domainId AND tran_date = :summaryDate" +
                "  GROUP BY wh_cd, com_cd, sku_cd, sku_nm" +
                ")," +
                "combined AS (" +
                "  SELECT wh_cd, com_cd, sku_cd, sku_nm FROM opening WHERE opening_qty > 0" +
                "  UNION" +
                "  SELECT wh_cd, com_cd, sku_cd, sku_nm FROM daily" +
                ")" +
                "INSERT INTO daily_stock_summaries (" +
                "  id, domain_id, summary_date, wh_cd, com_cd, sku_cd, sku_nm," +
                "  opening_qty, in_qty, out_qty, in_cancel_qty, out_cancel_qty," +
                "  transfer_in_qty, transfer_out_qty, adjust_plus_qty, adjust_minus_qty," +
                "  add_qty, loss_qty, vas_out_qty, vas_in_qty, closing_qty, tran_count," +
                "  created_at, updated_at" +
                ") SELECT" +
                "  gen_random_uuid()::text, :domainId, :summaryDate," +
                "  c.wh_cd, c.com_cd, c.sku_cd, c.sku_nm," +
                "  COALESCE(o.opening_qty, 0)," +
                "  COALESCE(d.in_qty, 0), COALESCE(d.out_qty, 0)," +
                "  COALESCE(d.in_cancel_qty, 0), COALESCE(d.out_cancel_qty, 0)," +
                "  COALESCE(d.transfer_in_qty, 0), COALESCE(d.transfer_out_qty, 0)," +
                "  COALESCE(d.adjust_plus_qty, 0), COALESCE(d.adjust_minus_qty, 0)," +
                "  COALESCE(d.add_qty, 0), COALESCE(d.loss_qty, 0)," +
                "  COALESCE(d.vas_out_qty, 0), COALESCE(d.vas_in_qty, 0)," +
                "  COALESCE(o.opening_qty, 0)" +
                "    + COALESCE(d.in_qty, 0) - COALESCE(d.in_cancel_qty, 0)" +
                "    - COALESCE(d.out_qty, 0) + COALESCE(d.out_cancel_qty, 0)" +
                "    + COALESCE(d.transfer_in_qty, 0) - COALESCE(d.transfer_out_qty, 0)" +
                "    + COALESCE(d.adjust_plus_qty, 0) - COALESCE(d.adjust_minus_qty, 0)" +
                "    + COALESCE(d.add_qty, 0) - COALESCE(d.loss_qty, 0)" +
                "    + COALESCE(d.vas_in_qty, 0) - COALESCE(d.vas_out_qty, 0)," +
                "  COALESCE(d.tran_count, 0), now(), now()" +
                " FROM combined c" +
                " LEFT JOIN opening o ON o.wh_cd = c.wh_cd AND o.com_cd = c.com_cd AND o.sku_cd = c.sku_cd" +
                " LEFT JOIN daily d ON d.wh_cd = c.wh_cd AND d.com_cd = c.com_cd AND d.sku_cd = c.sku_cd";

        this.queryManager.executeBySql(insertSql, params);

        String countSql = "SELECT COUNT(*) FROM daily_stock_summaries WHERE domain_id = :domainId AND summary_date = :summaryDate";
        Long count = this.queryManager.selectBySql(countSql, params, Long.class);
        return count != null ? count.intValue() : 0;
    }
}
