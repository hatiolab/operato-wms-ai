package operato.wms.stock.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.service.WmsBaseService;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.entity.InventoryTran;
import operato.wms.stock.model.InvTransaction;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 재고 관련 공통 서비스
 */
public class BaseStockService extends AbstractQueryService {
    /**
     * WMS 기본 서비스
     */
    @Autowired
    protected WmsBaseService wmsBaseSvc;

    /**
     * 재고 적치 처리 전 체크
     * 
     * @param domainId
     * @param input
     * @return
     */
    protected Inventory checkForPutawayInventory(Long domainId, InvTransaction input) {
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

        // 수량 체크
        if (input.getInvQty() > inventory.getInvQty()) {
            throw ThrowUtil.newValidationErrorWithNoLog("입력 수량이 재고 수량보다 큽니다.");
        }

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location toLoc = this.findAndCheckLocation(domainId, input.getLocCd(), Inventory.TRANSACTION_IN);

        // 혼적 가능 여부 체크
        this.checkMixableLocation(toLoc, inventory.getSkuCd());

        // 고정 SKU 로케이션 적치 제한 체크
        this.checkFixedSkuLocation(toLoc, inventory.getSkuCd());

        // 위험물 상품 로케이션 허용 여부 체크
        SKU putawaySku = this.wmsBaseSvc.findSku(inventory.getComCd(), inventory.getSkuCd(), false, false);
        this.checkHazmatLocation(toLoc, putawaySku);

        // 온도 유형 호환성 체크
        this.checkTemperatureType(toLoc, putawaySku);

        // 바코드 재고 수량, 작업자 입력 수량 체크
        double invQty = inventory.getInvQty();
        double inputQty = input.getInvQty();

        // 로케이션 최대 수량·중량 초과 검증 (분할 시 비례 중량 계산)
        double putawayWeight = (inventory.getWeight() != null && invQty > 0)
                ? inventory.getWeight() * inputQty / invQty
                : 0.0;
        this.checkLocationCapacity(toLoc, inputQty, putawayWeight);

        // 재고 리턴
        return inventory;
    }

    /**
     * 재고 생성 공통 체크 프로세스
     * 반환 배열 : [ 재고 트랜잭션 객체, 로케이션 객체, SKU 객체 ]
     * 
     * @param domainId
     * @param input
     * @param transactionType
     * @return
     */
    protected Object[] checkForCreateInventory(Long domainId, InvTransaction input, String transactionType) {
        // 화주사 데이터 체크
        ValueUtil.checkEmptyData(input.getComCd(), "label.com_cd");

        // 창고 데이터 체크
        ValueUtil.checkEmptyData(input.getWhCd(), "label.wh_cd");

        // 로케이션 데이터 체크
        ValueUtil.checkEmptyData(input.getLocCd(), "label.loc_cd");

        // 상품 코드 데이터 체크
        ValueUtil.checkEmptyData(input.getSkuCd(), "label.sku_cd");

        // 생성 수량 데이터 체크
        ValueUtil.checkEmptyNumber((Number) input.getInvQty(), "label.inv_qty");

        // 입력값으로 재고 객체 생성
        InventoryTran newInventory = ValueUtil.populate(input, new InventoryTran(), "whCd", "comCd", "skuCd", "skuNm",
                "lotNo", "serialNo", "expiredDate", "refDocType", "refDocNo", "refLineNo", "reasonCd", "reason",
                "remarks");
        newInventory.setDomainId(domainId);
        newInventory.setTranQty(input.getInvQty());

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location location = this.findAndCheckLocation(domainId, input.getLocCd(), transactionType);

        // 혼적 가능 여부 체크
        this.checkMixableLocation(location, input.getSkuCd());

        // 고정 SKU 로케이션 적치 제한 체크
        this.checkFixedSkuLocation(location, input.getSkuCd());

        // Find SKU
        SKU sku = this.wmsBaseSvc.findSku(input.getComCd(), input.getSkuCd(), false, true);

        // 위험물 상품 로케이션 허용 여부 체크
        this.checkHazmatLocation(location, sku);

        // 온도 유형 호환성 체크
        this.checkTemperatureType(location, sku);

        // 로케이션 최대 수량·중량 초과 검증
        double addWeight = (sku.getSkuWt() != null) ? sku.getSkuWt() * input.getInvQty() : 0.0;
        this.checkLocationCapacity(location, input.getInvQty(), addWeight);

        // 리턴
        return new Object[] { newInventory, location, sku };
    }

    /**
     * 재고 조정 공통 체크 프로세스
     * 
     * @param domainId
     * @param input
     * @param transactionType
     * @return
     */
    protected Inventory checkForAdjustInventory(Long domainId, InvTransaction input, String transactionType) {
        // 재고 ID 값 체크
        ValueUtil.checkEmptyData(input.getId(), "label.inventory_id");

        // 재고 조정 수량 값 체크
        ValueUtil.checkEmptyNumber(input.getToQty(), "label.to_qty");

        // 사유 값 체크
        ValueUtil.checkEmptyData(input.getReasonCd(), "label.reason_cd");

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_ADJUST);

        // 조정 수량 제약 조건 체크
        double reservedQty = inventory.getReservedQty();
        if (reservedQty > 0) {
            if (input.getToQty() < reservedQty) {
                throw ThrowUtil.newValidationErrorWithNoLog("조정 수량이 예약 수량보다 작을 수 없습니다.");
            }
        }

        // 재고 리턴
        return inventory;
    }

    /**
     * 재고 이동 공통 체크 프로세스
     * 
     * @param domainId
     * @param input
     * @return
     */
    protected Inventory checkForMoveInventory(Long domainId, InvTransaction input) {
        // 이동 로케이션 값 체크
        ValueUtil.checkEmptyData(input.getToLocCd(), "label.to_loc_cd");

        // 재고 이동 사유값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_MOVE);

        // 이동하려는 로케이션에 재고 이동이 가능한 지 체크
        this.checkForMoveInLocation(inventory, input.getToLocCd());

        // 재고 리턴
        return inventory;
    }

    /**
     * 재고 이동할 수 있는 로케이션 존재 여부 체크
     * 
     * @param inventory
     * @param toLocCd
     * @return
     */
    protected Location checkForMoveInLocation(Inventory inventory, String toLocCd) {
        // 이동 로케이션 값 체크
        ValueUtil.checkEmptyData(toLocCd, "label.to_loc_cd");

        // 재고 로케이션이 동일한 로케이션 인지 체크
        if (ValueUtil.isEqualIgnoreCase(inventory.getLocCd(), toLocCd)) {
            throw ThrowUtil.newValidationErrorWithNoLog("이동하려는 로케이션이 재고의 로케이션과 동일합니다.");
        }

        // 재고 할당 여부 체크
        if (inventory.getReservedQty() != null && inventory.getReservedQty() > 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("출고 예약된 재고입니다. 출고 예약 해제 후 이동 처리해주세요.");
        }

        // 로케이션 조회 & 기본 체크 포인트 체크
        Location toLoc = this.findAndCheckLocation(inventory.getDomainId(), toLocCd, Inventory.TRANSACTION_MOVE);

        // 동일창고 체크
        if (ValueUtil.isNotEqual(inventory.getWhCd(), toLoc.getWhCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "이동하려는 로케이션의 창고와 재고의 창고가 다릅니다. 창고간의 이동은 Transfer 트랜잭션으로 출고/입고 처리되어야 합니다.");
        }

        // From 로케이션 조회 & 기본 체크 포인트 체크
        this.findAndCheckLocation(inventory.getDomainId(), inventory.getLocCd(), Inventory.TRANSACTION_MOVE);

        // 혼적 가능 여부 체크
        this.checkMixableLocation(toLoc, inventory.getSkuCd());

        // 고정 SKU 로케이션 적치 제한 체크
        this.checkFixedSkuLocation(toLoc, inventory.getSkuCd());

        // 위험물 상품 로케이션 허용 여부 체크
        SKU moveSku = this.wmsBaseSvc.findSku(inventory.getComCd(), inventory.getSkuCd(), false, false);
        this.checkHazmatLocation(toLoc, moveSku);

        // 온도 유형 호환성 체크
        this.checkTemperatureType(toLoc, moveSku);

        // 로케이션 최대 수량·중량 초과 검증
        double moveWeight = (inventory.getWeight() != null) ? inventory.getWeight() : 0.0;
        this.checkLocationCapacity(toLoc, inventory.getInvQty(), moveWeight);

        // 이동할 로케이션 리턴
        return toLoc;
    }

    /**
     * 재고 폐기 공통 체크 프로세스
     * 
     * @param domainId
     * @param input
     * @return
     */
    protected Inventory checkForScrapInventory(Long domainId, InvTransaction input) {
        // 사유 코드 값 체크
        ValueUtil.checkEmptyData(input.getReasonCd(), "label.reason_cd");

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_SCRAP);

        // 재고 예약 수량 체크
        if (inventory.getReservedQty() != null && inventory.getReservedQty() > 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("예약된 재고가 존재하여 스크랩 처리할 수 없습니다.");
        }

        // 재고 리턴
        return inventory;
    }

    /**
     * 재고 홀드 공통 체크 프로세스
     * 
     * @param domainId
     * @param input
     * @return
     */
    protected Inventory checkForHoldInventory(Long domainId, InvTransaction input) {
        // 사유 값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_HOLD);

        // 예약 수량 체크
        if (inventory.getReservedQty() != null && inventory.getReservedQty() > 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("예약된 재고가 존재하여 홀드 처리할 수 없습니다.");
        }

        // 재고 리턴
        return inventory;
    }

    /**
     * 재고 홀드 해제 공통 체크 프로세스
     * 
     * @param domainId
     * @param input
     * @return
     */
    protected Inventory checkForReleaseHoldInventory(Long domainId, InvTransaction input) {
        // 사유 값 체크
        ValueUtil.checkEmptyData(input.getReason(), "label.reason");

        // 재고 조회 & 기본 체크 포인트 체크
        return this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_RELEASE_HOLD);
    }

    /**
     * 재고 병합 공통 체크 프로세스
     * 
     * @param domainId
     * @param input
     * @return
     */
    protected Inventory[] checkForMergeInventory(Long domainId, InvTransaction input) {
        // 원본 재고 조회 & 기본 체크 포인트 체크
        Inventory mainInventory = this.findAndCheckInventory(domainId, input.getId(), Inventory.TRANSACTION_MERGE);

        // 병합할 바코드 체크
        ValueUtil.checkEmptyData(input.getMergeBarcode(), "label.merge_barcode");

        // 병합할 로케이션 체크
        ValueUtil.checkEmptyData(input.getMergeLocCd(), "label.merge_loc_cd");

        // 병합할 재고 조회 & 기본 체크 포인트 체크
        Inventory mergeInventory = this.findAndCheckInventory(domainId, input.getMergeBarcode(), input.getMergeLocCd(),
                Inventory.TRANSACTION_MERGE);

        // 동일 재고 체크
        if (mainInventory.getId().equals(mergeInventory.getId())) {
            throw ThrowUtil.newValidationErrorWithNoLog("동일한 재고를 병합할 수 없습니다.");
        }

        // 동일 SKU 체크
        if (!mainInventory.getSkuCd().equals(mergeInventory.getSkuCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("동일한 SKU만 병합할 수 있습니다.");
        }

        // 소비기한이 있는 경우, 동일 소비기한 체크
        if (ValueUtil.isNotEmpty(mainInventory.getExpiredDate())) {
            if (!mainInventory.getExpiredDate().equals(mergeInventory.getExpiredDate())) {
                throw ThrowUtil.newValidationErrorWithNoLog("동일한 소비기한을 가진 재고만 병합할 수 있습니다.");
            }
        }

        // 할당 수량이 있다면 병합 불가
        if (mainInventory.getReservedQty() > 0 || mergeInventory.getReservedQty() > 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("할당 수량이 있는 재고는 병합할 수 없습니다.");
        }

        // 병합할 재고의 예약 수량 체크
        if (mergeInventory.getReservedQty() != null && mergeInventory.getReservedQty() > 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("할당 수량이 있는 재고는 병합할 수 없습니다.");
        }

        // 유효성 체크 완료 후 리턴
        return new Inventory[] { mainInventory, mergeInventory };
    }

    /**
     * 재고 분할 체크
     * 
     * @param domainId
     * @param input
     * @return
     */
    protected Inventory checkForSplitInventory(Long domainId, InvTransaction input) {
        return this.checkForSplitInventory(domainId, input.getId(), input.getToLocCd(), input.getToQty(),
                input.getRemarks());
    }

    /**
     * 재고 분할 체크
     * 
     * @param domainId
     * @param inventoryId
     * @param toLocCd
     * @param splitQty
     * @param remark
     * @return
     */
    protected Inventory checkForSplitInventory(Long domainId, String inventoryId, String toLocCd, double splitQty,
            String remark) {
        // 분할 수량 값 체크
        ValueUtil.checkEmptyNumber(splitQty, "label.split_qty");

        // 사유 값 체크
        ValueUtil.checkEmptyData(remark, "label.reason");

        // 재고 조회 & 기본 체크 포인트 체크
        Inventory inventory = this.findAndCheckInventory(domainId, inventoryId, Inventory.TRANSACTION_SPLIT);

        // 분할할 재고 수량 체크
        double remainQty = inventory.getInvQty() - splitQty;
        if (remainQty < 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("분할 수량이 재고 수량보다 큽니다.");
        }

        // 분할할 재고 수량 대비 예약 수량 체크
        if (ValueUtil.toDouble(inventory.getReservedQty(), 0.0) > remainQty) {
            throw ThrowUtil.newValidationErrorWithNoLog("분할할 재고 수량은 예약 수량보다 클 수 없습니다.");
        }

        // 이동 로케이션 존재 여부 및 이동 제한 체크
        if (ValueUtil.isNotEmpty(toLocCd)) {
            this.checkForMoveInLocation(inventory, toLocCd);
        }

        // 재고 리턴
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
     * 재고 바코드와 로케이션으로 재고 정보 조회 & 기본 체크 포인트 체크
     * 
     * @param domainId
     * @param barcode
     * @param locCd
     * @param tranCd
     * @return
     */
    public Inventory findAndCheckInventory(Long domainId, String barcode, String locCd, String tranCd) {
        Inventory condition = new Inventory(domainId, barcode, locCd);
        Inventory inventory = this.queryManager.selectByCondition(Inventory.class, condition);
        return this.checkInventoryForTrx(inventory, tranCd);
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

        if (ValueUtil.isNotEmpty(inventory.getClosedAt())) {
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
        // 로케이션 조회 및 체크
        Location location = this.wmsBaseSvc.findLocation(locCd, false, true);

        // 이동 시 이동 제한 체크
        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_MOVE)) {
            if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_MOVE)) {
                throw ThrowUtil.newValidationErrorWithNoLog("이동 제한이 걸린 로케이션이라 이동이 불가합니다.");
            }
        }

        // 입고 시 입고 대기 존 체크
        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_IN)
                || ValueUtil.isEqualIgnoreCase(tranCd, InventoryTran.TRAN_TYPE_VAS_IN)) {
            if (ValueUtil.isEqualIgnoreCase(location.getLocType(), "RCV-WAIT")) {
                throw ThrowUtil.newValidationErrorWithNoLog("입고 대기 존에 적치는 불가능합니다.");
            }

            if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_IN)) {
                throw ThrowUtil.newValidationErrorWithNoLog("입고 제한이 걸린 로케이션이라 입고가 불가합니다.");
            }
        }

        // 출고 시 출고 제한 체크
        if (ValueUtil.isEqualIgnoreCase(tranCd, Inventory.TRANSACTION_OUT)) {
            if (ValueUtil.isEqualIgnoreCase(location.getRestrictType(), Inventory.TRANSACTION_OUT)) {
                throw ThrowUtil.newValidationErrorWithNoLog("출고 제한이 걸린 로케이션이라 출고가 불가합니다.");
            }
        }

        // 로케이션 리턴
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

    /**
     * 고정 SKU 로케이션 적치 제한 체크
     *
     * Location.skuCd가 지정된 경우, 해당 로케이션에는 지정된 SKU만 적치할 수 있다.
     * 다른 SKU를 적치하려 하면 예외를 발생시킨다.
     *
     * @param toLoc 대상 로케이션
     * @param skuCd 적치하려는 SKU 코드
     */
    public void checkFixedSkuLocation(Location toLoc, String skuCd) {
        if (ValueUtil.isNotEmpty(toLoc.getSkuCd()) && ValueUtil.isNotEqual(toLoc.getSkuCd(), skuCd)) {
            throw ThrowUtil.newValidationErrorWithNoLog(
                    "로케이션 [" + toLoc.getLocCd() + "]은 상품 [" + toLoc.getSkuCd() + "] 전용 고정 로케이션입니다.");
        }
    }

    /**
     * W23-FL-2: 위험물 상품 로케이션 허용 여부 검증
     *
     * SKU.hazmatFlag가 true인 경우, Location.hazmatFlag도 true여야 한다.
     * sku가 null이거나 hazmatFlag가 false/null이면 검증을 건너뛴다.
     *
     * @param toLoc 대상 로케이션
     * @param sku   적치하려는 SKU (null 허용)
     */
    public void checkHazmatLocation(Location toLoc, SKU sku) {
        if (sku != null && Boolean.TRUE.equals(sku.getHazmatFlag())) {
            if (!Boolean.TRUE.equals(toLoc.getHazmatFlag())) {
                throw ThrowUtil.newValidationErrorWithNoLog(
                        "위험물 상품은 위험물 허용 로케이션에만 적치 가능합니다. 로케이션 ["
                                + toLoc.getLocCd() + "]은 위험물 적치가 불가합니다.");
            }
        }
    }

    /**
     * W23-FL-4: 온도 유형 호환성 검증
     *
     * SKU.tempType과 Location.tempType이 모두 설정된 경우, 두 값이 일치해야 한다.
     * 어느 한쪽이 null/empty이면 검증을 건너뛴다 (미설정 = 제한 없음).
     *
     * @param toLoc 대상 로케이션
     * @param sku   적치하려는 SKU (null 허용)
     */
    public void checkTemperatureType(Location toLoc, SKU sku) {
        if (sku != null && ValueUtil.isNotEmpty(sku.getTempType())
                && ValueUtil.isNotEmpty(toLoc.getTempType())) {
            if (!sku.getTempType().equals(toLoc.getTempType())) {
                throw ThrowUtil.newValidationErrorWithNoLog(
                        "상품의 보관 온도 조건(" + sku.getTempType() + ")과 "
                                + "로케이션의 온도 유형(" + toLoc.getTempType() + ")이 맞지 않습니다.");
            }
        }
    }

    /**
     * W1-FL-3: 로케이션 최대 수량·중량 초과 검증
     *
     * Location.maxQty 또는 Location.maxWeight가 설정된 경우,
     * 현재 재고 합계에 추가 수량·중량을 더했을 때 초과하면 예외를 발생시킨다.
     *
     * @param toLoc     대상 로케이션
     * @param addQty    추가될 수량
     * @param addWeight 추가될 중량 (알 수 없으면 0)
     */
    public void checkLocationCapacity(Location toLoc, double addQty, double addWeight) {
        if (toLoc.getMaxQty() != null && toLoc.getMaxQty() > 0) {
            String sql = "SELECT COALESCE(SUM(inv_qty), 0) FROM inventories " +
                    "WHERE domain_id = :domainId AND loc_cd = :locCd AND (del_flag IS NULL OR del_flag = false) AND inv_qty > 0";
            Double currentQty = this.queryManager.selectBySql(sql,
                    ValueUtil.newMap("domainId,locCd", toLoc.getDomainId(), toLoc.getLocCd()), Double.class);

            if (ValueUtil.toDouble(currentQty, 0.0) + addQty > toLoc.getMaxQty()) {
                throw ThrowUtil.newValidationErrorWithNoLog(
                        "로케이션 [" + toLoc.getLocCd() + "]의 최대 수량(" + toLoc.getMaxQty() + ")을 초과합니다.");
            }
        }

        if (toLoc.getMaxWeight() != null && toLoc.getMaxWeight() > 0 && addWeight > 0) {
            String sql = "SELECT COALESCE(SUM(weight), 0) FROM inventories " +
                    "WHERE domain_id = :domainId AND loc_cd = :locCd AND (del_flag IS NULL OR del_flag = false) AND inv_qty > 0";
            Double currentWeight = this.queryManager.selectBySql(sql,
                    ValueUtil.newMap("domainId,locCd", toLoc.getDomainId(), toLoc.getLocCd()), Double.class);

            if (ValueUtil.toDouble(currentWeight, 0.0) + addWeight > toLoc.getMaxWeight()) {
                throw ThrowUtil.newValidationErrorWithNoLog(
                        "로케이션 [" + toLoc.getLocCd() + "]의 최대 중량(" + toLoc.getMaxWeight() + ")을 초과합니다.");
            }
        }
    }
}
