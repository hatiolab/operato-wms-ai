package operato.wms.outbound.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.outbound.WmsOutboundConfigConstants;
import operato.wms.outbound.WmsOutboundConstants;
import operato.wms.outbound.entity.DeliveryInfo;
import operato.wms.outbound.entity.ImportReleaseOrder;
import operato.wms.outbound.entity.OutboundOrder;
import operato.wms.outbound.entity.PickingOrder;
import operato.wms.outbound.entity.PickingOrderItem;
import operato.wms.outbound.entity.ReleaseOrder;
import operato.wms.outbound.entity.ReleaseOrderItem;
import operato.wms.outbound.query.store.OutboundQueryStore;
import operato.wms.stock.entity.Inventory;
import operato.wms.stock.model.SimpleStockCheck;
import operato.wms.stock.service.InventoryTransactionService;
import xyz.anythings.sys.event.EventPublisher;
import xyz.anythings.sys.event.model.PrintEvent;
import xyz.anythings.sys.model.BaseResponse;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.service.ICustomService;
import xyz.anythings.sys.util.AnyOrmUtil;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.entity.User;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 출고 모듈 트랜잭션 처리 서비스
 * 
 * @author shortstop
 */
@Component
public class OutboundTransactionService extends AbstractQueryService {
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
     * 재고 트랜잭션 서비스
     */
    @Autowired
    protected InventoryTransactionService invTrxSvc;
    /**
     * 출고용 쿼리 스토어
     */
    @Autowired
    protected OutboundQueryStore outQueryStore;
    /**
     * 커스텀 서비스
     */
    @Autowired
    protected ICustomService customSvc;
    /**
     * 이벤트 퍼블리셔
     */
    @Autowired
    protected EventPublisher eventPublisher;
    
    /********************************************************************************************************
     *  출고 주문 트랜잭션 :  등록 or 업로드   ->  요청          ->     확정     ->      입고 작업     -> 입고 완료 
     *  출고 주문 상태    : (REG) 등록 중 -> (REQUEST) 요청 -> (READY) 대기 -> (RUNNING) 진행 중 -> (END) 완료  
     ********************************************************************************************************/
    
    /**
     * 출고 주문 임포트 처리
     * 
     * @param list
     * @param isB2c
     * @return 출고 주문 리스트
     */
    public List<ReleaseOrder> importReleaseOrders(List<ImportReleaseOrder> list, boolean isB2c) {
        // 1. 필수 정보가 빠진 게 없는 지 체크
        for(ImportReleaseOrder order : list) {
            // 정보 체크 - 요청일, 창고, 화주사, 거래처, 출고 유형, 상품 코드, 수량 등....
            this.checkReleaseOrder(order, isB2c);
        }

        Map<String, String> roHash = new HashMap<String, String>();
        List<ReleaseOrder> newReleaseOrders = new ArrayList<ReleaseOrder>();
        List<ReleaseOrderItem> newOrderItems = new ArrayList<ReleaseOrderItem>();
        List<DeliveryInfo> newDeliveryOrders = new ArrayList<DeliveryInfo>();
        
        for(ImportReleaseOrder order : list) {
            // 출고 요청 번호 추출
            String rlsReqNo = order.getRlsReqNo();
            
            if(!roHash.keySet().contains(rlsReqNo)) {
                // 출고 번호가 이미 존재하는지 체크
                ReleaseOrder condition = new ReleaseOrder();
                condition.setRlsReqNo(rlsReqNo);
                if(this.queryManager.selectSize(ReleaseOrder.class, condition) > 0) {
                    throw ThrowUtil.newValidationErrorWithNoLog("출고 요청 번호 [" + rlsReqNo + "]는 이미 존재합니다.");
                }
                
                // 출고 오더 생성
                ReleaseOrder ro = ValueUtil.populate(order, condition);
                ro.setBizType(isB2c ? WmsOutboundConstants.BIZ_TYPE_B2C_OUT : WmsOutboundConstants.BIZ_TYPE_B2B_OUT);
                ro.setRemarks(null);
                ro.setCreatedAt(null);
                ro.setUpdatedAt(null);
                ro.setRequesterId(User.currentUser().getId());
                this.queryManager.insert(ro);
                newReleaseOrders.add(ro);
                
                // 출고 상세 정보 생성
                ReleaseOrderItem ri = ValueUtil.populate(order, new ReleaseOrderItem());
                ri.setReleaseOrderId(ro.getId());
                ri.setCreatedAt(null);
                ri.setUpdatedAt(null);
                newOrderItems.add(ri);
                
                // 배송 정보 생성
                DeliveryInfo di = ValueUtil.populate(order, new DeliveryInfo());
                di.setRlsOrdNo(ro.getRlsOrdNo());
                di.setCreatedAt(null);
                di.setUpdatedAt(null);
                di.setReleaseOrderId(ro.getId());
                newDeliveryOrders.add(di);
                
                roHash.put(rlsReqNo, ro.getId());
                
            } else {
                // 출고 상세 정보 생성
                String releaseOrderId = roHash.get(rlsReqNo);
                ReleaseOrderItem ri = ValueUtil.populate(order, new ReleaseOrderItem());
                ri.setReleaseOrderId(releaseOrderId);
                ri.setCreatedAt(null);
                ri.setUpdatedAt(null);
                newOrderItems.add(ri);
            }
        }
        
        if(!newOrderItems.isEmpty()) {
            AnyOrmUtil.insertBatch(newOrderItems, 100);
            AnyOrmUtil.insertBatch(newDeliveryOrders, 100);
        }
        
        return newReleaseOrders;
    }
    
    /**
     * 출고 주문 체크 - 요청일, 창고, 화주사, 거래처, 출고 유형, 상품 코드, 수량 등....
     * 
     * @param order
     * @param isB2c
     */
    private void checkReleaseOrder(ImportReleaseOrder order, boolean isB2c) {
        if(ValueUtil.isEmpty(order.getWhCd())) {
            throw new ElidomRuntimeException("창고 정보가 없습니다.");
        }
        
        if(ValueUtil.isEmpty(order.getComCd())) {
            throw new ElidomRuntimeException("화주사 정보가 없습니다.");
        }
        
        if(!isB2c && ValueUtil.isEmpty(order.getCustCd())) {
            throw new ElidomRuntimeException("거래처 정보가 없습니다.");
        }
        
        if(ValueUtil.isEmpty(order.getSkuCd())) {
            throw new ElidomRuntimeException("상품 정보가 없습니다.");
        }
        
        if(ValueUtil.isEmpty(order.getOrdQty()) || order.getOrdQty() == 0.0f) {
            throw new ElidomRuntimeException("주문 수량이 없습니다.");
        }
    }
    
    /**
     * 출고 요청 (상태 : REG -> REQ) 
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder requestReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_REG)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_REG);
        }
        
        // 2. 상세 품목 조회
        Map<String, Object> riParams = ValueUtil.newMap("domainId,releaseOrderId", releaseOrder.getDomainId(), releaseOrder.getId());
        List<ReleaseOrderItem> roItems = this.queryManager.selectList(ReleaseOrderItem.class, riParams);
        if(ValueUtil.isEmpty(roItems)) {
            throw new ElidomRuntimeException("출고 주문 상세 정보가 존재하지 않습니다.");
        }
        
        // 3. 주문 체크 & 업데이트
        for(ReleaseOrderItem item : roItems) {
            item.setStatus(ReleaseOrder.STATUS_REQ);
        }
        this.queryManager.updateBatch(roItems, "status", "updatedAt");
        
        // 4. 주문 상태 변경 
        releaseOrder.setStatus(ReleaseOrder.STATUS_REQ);
        this.queryManager.update(releaseOrder, "status", "updatedAt");
        
        // 5. 리턴
        return releaseOrder;
    }
    
    /**
     * 출고 요청 취소 (상태 : REQ -> REG)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder cancelRequestReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_REQ)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_REQ);
        }
        
        // 2. 주문 라인 상태 변경
        String sql = this.outQueryStore.getUpdateReleaseOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,releaseOrderId,status,now", releaseOrder.getDomainId(), releaseOrder.getId(), ReleaseOrder.STATUS_REG, new Date()));
        
        // 3. 주문 상태 변경 
        releaseOrder.setStatus(ReleaseOrder.STATUS_REG);
        this.queryManager.update(releaseOrder, "status", "updatedAt");
        
        // 5. 주문 예정 리턴
        return releaseOrder;
    }
    
    /**
     * 대상 분류 처리
     * 
     * @param list
     * @return
     */
    public List<ReleaseOrder> classifyReleaseOrders(List<ReleaseOrder> list) {
        // TODO 
        
        return list;
    }
    
    /**
     * 개별 출고 접수 처리 (상태 : REQ -> WAIT)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder acceptSingleReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 요청인 경우 확정 처리 가능
        if(ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_REQ)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_REQ);
        }

        // 2. 출고 상세 변경
        String sql = this.outQueryStore.getUpdateReleaseOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,releaseOrderId,status,now", releaseOrder.getDomainId(), releaseOrder.getId(), ReleaseOrder.STATUS_WAIT, new Date()));

        // 3. 개별 출고 설정
        releaseOrder.setRlsExeType(WmsOutboundConstants.RLS_EXE_TYPE_INDIVIDUAL);
        releaseOrder.setStatus(ReleaseOrder.STATUS_WAIT);
        if(ValueUtil.isEmpty(releaseOrder.getRlsOrdDate())) {
            releaseOrder.setRlsOrdDate(DateUtil.todayStr());
        }
        this.queryManager.update(releaseOrder, "status", "rlsOrdDate", "updatedAt");
        
        // 4. 리턴
        return releaseOrder;
    }
    
    /**
     * 개별 출고 접수 취소 처리 - (상태 : WAIT -> REQ)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder cancelAcceptSingleReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 상태가 출고 접수 상태인 경우 접수 취소 처리 가능
        if(ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_WAIT)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_WAIT);
        }
        
        // 2. 출고 주문 상세 상태 변경
        String sql = this.outQueryStore.getUpdateReleaseOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,releaseOrderId,status,now", releaseOrder.getDomainId(), releaseOrder.getId(), ReleaseOrder.STATUS_REQ, new Date()));
        
        // 3. 상태 변경
        releaseOrder.setStatus(ReleaseOrder.STATUS_REQ);
        this.queryManager.update(releaseOrder, "status", "updatedAt");
        
        // 4. 리턴
        return releaseOrder;
    }
    
    /**
     * 개별 출고 시작 처리 - (상태 : WAIT / READY -> RUN)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder startSingleReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 상태가 출고 접수 상태인 경우 작업 시작 처리 가능
        if(ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_WAIT) && ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_READY)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_WAIT);
        }
        
        // 2. 피킹 예약
        PickingOrder po = this.reserveForPicking(releaseOrder);
        
        // 3. 피킹 지시 자동 시작 모드이면 피킹 지시 시작
        if(po != null && ValueUtil.toBoolean(this.runtimeConfSvc.getRuntimeConfigValue(releaseOrder.getComCd(), releaseOrder.getWhCd(), WmsOutboundConfigConstants.PICKING_AUTO_START_ENABLED))) {
            this.startPickingOrder(po);
        }
        
        // 4. 출고 주문 상세 상태 변경
        String sql = this.outQueryStore.getUpdateReleaseOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,releaseOrderId,status", releaseOrder.getDomainId(), releaseOrder.getId(), ReleaseOrder.STATUS_RUN));
        
        // 5. 상태 변경
        releaseOrder.setStatus(ReleaseOrder.STATUS_RUN);
        releaseOrder.setStartedAt(DateUtil.currentTimeStr());
        this.queryManager.update(releaseOrder, "status", "startedAt", "updatedAt");
        
        // 6. 리턴
        return releaseOrder;
    }
    
    /**
     * 개별 출고 시작 취소 처리 - (상태 : RUN -> WAIT or READY)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder cancelStartSingleReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 상태가 출고 진행 중 상태이면 작업 시작 취소 처리 가능
        if(ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_RUN)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_RUN);
        }

        // 2. 피킹 예약 취소
        this.cancelReserveForPicking(releaseOrder);
        
        // 3. 출고 주문 상세 상태 변경
        String sql = this.outQueryStore.getUpdateReleaseOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,releaseOrderId,status", releaseOrder.getDomainId(), releaseOrder.getId(), ReleaseOrder.STATUS_WAIT));
        
        // 4. 상태 변경
        releaseOrder.setStartedAt(null);
        releaseOrder.setStatus(ReleaseOrder.STATUS_WAIT);
        this.queryManager.update(releaseOrder, "status", "startedAt", "updatedAt");
        
        // 5. 리턴
        return releaseOrder;
    }

    /**
     * 출고 주문 상세 정보로 가용 재고 조회
     * 
     * @param ro
     * @param item
     * @return
     */
    public List<Inventory> searchAvailableInventories(ReleaseOrder ro, ReleaseOrderItem item) {
        return this.invTrxSvc.searchAvailableInventoryForRelease(item.getDomainId(), ro.getComCd(), ro.getWhCd(), item.getSkuCd(), false);
    }
    
    /**
     * 피킹 지시 시작
     * 
     * @param pickingOrder
     * @return
     */
    public PickingOrder startPickingOrder(PickingOrder pickingOrder) {
        // 1. 피킹 시작 가능 조건 체크
        if (ValueUtil.isNotEqual(pickingOrder.getStatus(), PickingOrder.STATUS_WAIT)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", pickingOrder.getPickOrderNo(), PickingOrder.STATUS_WAIT);
        }
        
        // 2. 피킹 지시 상태 변경
        pickingOrder.setStatus(PickingOrder.STATUS_RUN);
        this.queryManager.update(pickingOrder, "status", "updatedAt");
        
        // 3. 피킹 지시 상세 상태 변경
        String sql = this.outQueryStore.getUpdatePickingOrderItems();
        Map<String, Object> params = ValueUtil.newMap("domainId,pickingOrderId,status", pickingOrder.getDomainId(), pickingOrder.getId(), PickingOrder.STATUS_RUN);
        this.queryManager.executeBySql(sql, params);

        // 4. 출고 주문 상태 변경
        ReleaseOrder releaseOrder = new ReleaseOrder(pickingOrder.getDomainId(), pickingOrder.getPickOrderNo());
        releaseOrder = this.queryManager.selectByCondition(ReleaseOrder.class, releaseOrder);
        releaseOrder.setStatus(ReleaseOrder.STATUS_RUN);
        this.queryManager.update(releaseOrder, "status", "updatedAt");

        // 5. 출고 주문 상세 상태 변경
        sql = this.outQueryStore.getUpdateReleaseOrderItems();
        params.put("releaseOrderId", releaseOrder.getId());
        this.queryManager.executeBySql(sql, params);
        
        // 6. 피킹 지시 리턴
        return pickingOrder;
    }
    
    /**
     * 피킹 지시 완료
     * 
     * @param pickingOrder
     * @return
     */
    public PickingOrder closePickingOrder(PickingOrder pickingOrder) {
        // 1. 피킹 마감 조건 체크
        if (ValueUtil.isNotEqual(pickingOrder.getStatus(), PickingOrder.STATUS_RUN)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.PickingOrder", pickingOrder.getPickOrderNo(), PickingOrder.STATUS_RUN);
        }
        
        // 2. 피킹 지시 완료 처리
        pickingOrder.setStatus(PickingOrder.STATUS_END);
        pickingOrder.setProgressRate(100.0);
        this.queryManager.update(pickingOrder, "status", "progressRate", "updatedAt");
        
        // 3. 피킹 지시 상세 완료 처리
        Map<String, Object> params = ValueUtil.newMap("domainId,pickingOrderId,status", pickingOrder.getDomainId(), pickingOrder.getId(), PickingOrder.STATUS_END);
        this.queryManager.executeBySql(this.outQueryStore.getUpdatePickingOrderItems(), params);
        
        // 4. 피킹 지시 완료시 자동 출고 마감 여부 
        if(ValueUtil.toBoolean(this.runtimeConfSvc.getRuntimeConfigValue(pickingOrder.getComCd(), pickingOrder.getWhCd(), WmsOutboundConfigConstants.PICKING_AUTO_CLOSING_ENABLED))) {
            // 5. 출고 주문 조회 후 마감 처리
            ReleaseOrder ro = this.queryManager.selectByCondition(ReleaseOrder.class, new ReleaseOrder(pickingOrder.getDomainId(), pickingOrder.getPickOrderNo()));
            if (ro != null) {
                // 출고 주문 자동 마감 처리
                ro.setStatus(ReleaseOrder.STATUS_PICKED);
                this.closeReleaseOrder(ro);
            }
        }

        // 6. 리턴
        return pickingOrder;
    }
    
    /**
     * 출고 주문 마감 처리 (상태 : RUN -> END)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder closeReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 출고 주문 상태 체크
        if (ValueUtil.isNotEqual(releaseOrder.getStatus(), ReleaseOrder.STATUS_PICKED)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_PICKED);
        }
        
        // 2. 출고 주문 상태 변경
        releaseOrder.setStatus(PickingOrder.STATUS_END);
        releaseOrder.setFinishedAt(DateUtil.currentTimeStr());
        this.queryManager.update(releaseOrder, "status", "finishedAt", "updatedAt");
        
        // 4. 출고 주문 상세 상태 변경
        String sql = this.outQueryStore.getUpdateReleaseOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,releaseOrderId,status", releaseOrder.getDomainId(), releaseOrder.getId(), PickingOrder.STATUS_END));
        
        // 5. 출고 대기 로케이션에 임시로 이동해놓은 재고를 모두 출고 처리
        this.finalReleaseInventories(releaseOrder);
        
		// 6. 리턴
        return releaseOrder;
    }
    
    /**
     * 출고 주문 전체 취소 처리 (상태 : RUN -> CANCEL)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder cancelReleaseOrder(ReleaseOrder releaseOrder) {
        // 1. 출고 주문 상태 체크
        String status = releaseOrder.getStatus();
        if (ValueUtil.isNotEqual(status, ReleaseOrder.STATUS_PICKED) && ValueUtil.isNotEqual(status, ReleaseOrder.STATUS_RUN)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_PICKED + " or " + ReleaseOrder.STATUS_RUN);
        }
        
        // 2. 출고 주문 상태 변경
        releaseOrder.setStatus(PickingOrder.STATUS_RUN);
        releaseOrder.setFinishedAt(DateUtil.currentTimeStr());
        this.queryManager.update(releaseOrder, "status", "finishedAt", "updatedAt");
        
        // 3. 피킹 예약 취소
        this.cancelReserveForPicking(releaseOrder);
        
        // 4. 출고 주문 상세 최초 라인 업데이트 
        String updateSql = this.outQueryStore.getUpdateCancelPickedReleaseOrderLine();
        Map<String, Object> params = ValueUtil.newMap("domainId,releaseOrderId,status", releaseOrder.getDomainId(), releaseOrder.getId(), PickingOrder.STATUS_RUN);
        this.queryManager.executeBySql(updateSql, params);

        // 5. 출고 주문 상세 최초 라인 제외한 나머지 라인 삭제 
        String deleteSql = this.outQueryStore.getDeleteCancelPickedReleaseOrderLine();
        this.queryManager.executeBySql(deleteSql, params);
        
        
        // 5. 리턴
        return releaseOrder;
    }
    
    /**
     * 출고 주문 라인 취소 처리 (상태 : RUN -> CANCEL)
     * 
     * @param releaseOrder
     * @return
     */
    public ReleaseOrder cancelReleaseOrderItem(ReleaseOrder releaseOrder, ReleaseOrderItem releaseOrderItem) {
        // 1. 출고 주문 상태 체크
        String status = releaseOrder.getStatus();
        if (ValueUtil.isNotEqual(status, ReleaseOrder.STATUS_PICKED) && ValueUtil.isNotEqual(status, ReleaseOrder.STATUS_RUN)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", releaseOrder.getRlsOrdNo(), ReleaseOrder.STATUS_PICKED + " or " + ReleaseOrder.STATUS_RUN);
        }
        
        // 2. 출고 주문 상태 변경
        releaseOrder.setStatus(ReleaseOrder.STATUS_RUN);
        releaseOrder.setFinishedAt(DateUtil.currentTimeStr());
        this.queryManager.update(releaseOrder, "status", "finishedAt", "updatedAt");
        
        // 3. 피킹 예약 취소
        this.cancelReserveLineForPicking(releaseOrder, releaseOrderItem);
        
        Query queryObj = AnyOrmUtil.newConditionForExecution(releaseOrder.getDomainId());
        queryObj.addFilter("releaseOrderId", releaseOrder.getId());
        queryObj.addFilter("status", ReleaseOrder.STATUS_RUN);
        queryObj.addFilter("skuCd", releaseOrderItem.getSkuCd());
        queryObj.addFilter("lineNo", releaseOrderItem.getLineNo());
        queryObj.addOrder("rlsLineNo", false);
        List<ReleaseOrderItem> rlsItemList = this.queryManager.selectList(ReleaseOrderItem.class, queryObj);
        
        if (ValueUtil.isNotEmpty(rlsItemList)) {
        	// 4. 병합 
        	ReleaseOrderItem targetItem = rlsItemList.get(0);
        	targetItem.setTotOrdQty(targetItem.getTotOrdQty() + releaseOrderItem.getRlsQty());
        	targetItem.setOrdQty(targetItem.getOrdQty() + releaseOrderItem.getRlsQty());
        	if ( ValueUtil.toInteger(targetItem.getRlsLineNo()) > ValueUtil.toInteger(releaseOrderItem.getRlsLineNo()) ) {
        		targetItem.setRlsLineNo(releaseOrderItem.getRlsLineNo());
        	}
        	this.queryManager.update(ReleaseOrderItem.class, targetItem);
        	this.queryManager.delete(ReleaseOrderItem.class, releaseOrderItem);
        } else {
        	// 4. 초기화 
        	releaseOrderItem.setOrdQty(releaseOrderItem.getTotOrdQty());
        	releaseOrderItem.setRlsQty(0.0);
        	releaseOrderItem.setExpiredDate(null);
        	releaseOrderItem.setBarcode(null);
        	releaseOrderItem.setStatus(ReleaseOrder.STATUS_RUN);
        	releaseOrderItem.setLocCd(null);
        	this.queryManager.update(ReleaseOrderItem.class, releaseOrderItem);
        }
        
        // 5. 리턴
        return releaseOrder;
    }
    
    /********************************************************************************************************
     *                                              피 킹 처 리
     ********************************************************************************************************/
    /**
     * 피킹 아이템 피킹 처리
     * 
     * @param pickingOrder
     * @param pickingOrderItems
     * @return
     */
    public PickingOrder pickPickingOrderItems(PickingOrder pickingOrder, List<PickingOrderItem> pickingOrderItems) {
        // 1. 피킹 가능 여부 체크
        if (ValueUtil.isNotEqual(pickingOrder.getStatus(), PickingOrder.STATUS_RUN)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.OutboundOrder", pickingOrder.getPickOrderNo(), PickingOrder.STATUS_RUN);
        }
        
        // 2. 기본 출고 대기 로케이션 조회
        String outLocCd = this.runtimeConfSvc.getRuntimeConfigValue(pickingOrder.getComCd(), pickingOrder.getWhCd(), WmsOutboundConfigConstants.RELEASE_WAITING_LOCATION);
        
        // 3. 피킹 처리
        for(PickingOrderItem item : pickingOrderItems) {
            // 3.1 피킹 오더 상세 피킹 처리 
            item.setPickQty(item.getOrderQty());
            item.setStatus(PickingOrder.STATUS_END);
            
            // 3.2 피킹 오더 상세에 대한 예약 재고 조회
            Inventory inv = this.queryManager.select(Inventory.class, item.getInventoryId());
            
            // 3.3 재고를 출고 대기 로케이션으로 이동 처리
            this.invTrxSvc.moveInventoryForRelease(inv, inv.getRlsOrdNo(), inv.getRlsLineNo(), inv.getInvQty(), outLocCd, null);
        }
        this.queryManager.updateBatch(pickingOrderItems, "pickQty", "status");
        
        // 4. 진행율 계산
        String sql = this.outQueryStore.getPickingOrderProgress();
        Map<String, Object> params = ValueUtil.newMap("domainId,pickOrderId,status", pickingOrder.getDomainId(), pickingOrder.getId(), PickingOrder.STATUS_END);
        int progressRate = this.queryManager.selectBySql(sql, params, Integer.class);
        
        if(progressRate >= 100.0f) {
            // 5.1 피킹 작업이 끝났으면 피킹 지시 마감 처리
            this.closePickingOrder(pickingOrder);
        } else {
            // 5.2 진행율 업데이트
            pickingOrder.setProgressRate(ValueUtil.toDouble(progressRate));
            this.queryManager.update(pickingOrder, "progressRate");            
        }
        
        // 6. 리턴
        return pickingOrder;
    }
    
    /**
     * 피킹 주문을 재고 (바코드)를 선택하여 라인 완료 처리
     * 
     * @param po
     * @param item
     * @param inventory
     * @return
     */
    public PickingOrderItem pickPickingOrderItem(PickingOrder po, PickingOrderItem item, Inventory inventory) {
        // 1. 완료 처리 가능 여부 체크
        if(ValueUtil.isEqual(item.getStatus(), ReleaseOrder.STATUS_END)) {
            throw new ElidomRuntimeException("피킹 라인 [" + item.getRank() + "]은 이미 완료되었습니다. 다른 라인을 선택하세요.");
        }
        
        if (ValueUtil.isNotEqual(item.getStatus(), ReleaseOrder.STATUS_RUN)) {
            throw new ElidomRuntimeException("피킹 라인 [" + item.getRank() + "]은 작업 중인 상태가 아닙니다.");
        }
        
        if (ValueUtil.isEmpty(item.getBarcode())) {
            throw new ElidomRuntimeException("피킹 라인 [" + item.getRank() + "]은 바코드 정보가 없습니다.");
        }
                
        if(item.getPickQty() > item.getOrderQty()) {
            throw new ElidomRuntimeException("피킹 라인 [" + item.getRank() + "]은 예정 수량이 주문 수량보다 큽니다.");
        }
        
        if(inventory.getInvQty() > item.getOrderQty()) {
            throw new ElidomRuntimeException("피킹 라인 [" + item.getRank() + "]은 재고 수량이 주문 수량보다 큽니다.");
        }
        
        if(ValueUtil.isNotEqual(inventory.getId(), item.getInventoryId())) {
            throw new ElidomRuntimeException("피킹 지시에 예약된 재고 바코드와 실제 입력된 재고 바코드가 같지 않습니다.");
        }
        
        // 2. 출고 대기 로케이션으로 재고 이동 처리
        double invRsvQty = inventory.getInvQty();
        String outLocCd = this.runtimeConfSvc.getRuntimeConfigValue(po.getComCd(), po.getWhCd(), WmsOutboundConfigConstants.RELEASE_WAITING_LOCATION);
        this.invTrxSvc.moveInventoryForRelease(inventory, inventory.getRlsOrdNo(), inventory.getRlsLineNo(), invRsvQty, outLocCd, null);
        
        // 3. 피킹 주문 라인 완료 처리
        item.setBarcode(inventory.getBarcode());
        item.setLotNo(inventory.getLotNo());
        item.setProdDate(inventory.getProdDate());
        item.setExpiredDate(inventory.getExpiredDate());
        item.setSerialNo(inventory.getSerialNo());
        item.setToLocCd(outLocCd);
        item.setOrderQty(invRsvQty);
        item.setPickQty(invRsvQty);
        item.setProdDate(inventory.getProdDate());
        if(item.getPickQty() >= item.getOrderQty()) {
            item.setStatus(ReleaseOrder.STATUS_END);
        }
        this.queryManager.update(item);
        
        // 4. 피킹 주문과 연관된 출고 주문 완료 처리 - 출고 주문 상세 정보는 분할 처리하지 않는다.
        String sql = "select * from release_order_items where domain_id = :domainId and status = :status and rls_line_no = :rlsLineNo and release_order_id = (select id from release_orders where domain_id = :domainId and rls_ord_no = :rlsOrdNo) and ord_qty > rls_qty";
        Map<String, Object> qParams = ValueUtil.newMap("domainId,rlsOrdNo,rlsLineNo,status", po.getDomainId(), inventory.getRlsOrdNo(), inventory.getRlsLineNo(), ReleaseOrderItem.STATUS_RUN);
        double invRemainQty = invRsvQty;
        
        while(invRemainQty > 0) {
            ReleaseOrderItem roi = this.queryManager.selectBySql(sql, qParams, ReleaseOrderItem.class);
            if(roi != null) {
                // 출고 주문에 채울 수량 
                double roiFillQty = roi.getOrdQty() - roi.getRlsQty();
                invRemainQty = invRemainQty - roiFillQty;
                roi.setRlsQty(invRemainQty > 0 ? (roi.getRlsQty() + roiFillQty) : roi.getOrdQty());
                
                // 부가 정보
                if(ValueUtil.isEmpty(roi.getBarcode())) {
                    roi.setBarcode(inventory.getBarcode());
                }
                
                if(ValueUtil.isEmpty(roi.getLotNo())) {
                    roi.setLotNo(inventory.getLotNo());
                }
                
                if(ValueUtil.isEmpty(roi.getProdDate())) {
                    roi.setProdDate(inventory.getProdDate());
                }
                
                if(ValueUtil.isEmpty(roi.getExpiredDate())) {
                    roi.setExpiredDate(inventory.getExpiredDate());
                }
                
                if(ValueUtil.isEmpty(roi.getSerialNo())) {
                    roi.setSerialNo(inventory.getSerialNo());
                }
                
                if(ValueUtil.isEmpty(roi.getLocCd())) {
                    roi.setLocCd(outLocCd);
                }
                
                this.queryManager.update(roi);
            } else {
                invRemainQty = 0;
            }
        }
        
        // 5. 진행율 계산
        Map<String, Object> params = ValueUtil.newMap("domainId,pickOrderId,status", po.getDomainId(), po.getId(), PickingOrder.STATUS_END);
        int progressRate = this.queryManager.selectBySql(this.outQueryStore.getPickingOrderProgress(), params, Integer.class);

        // 6. 진행율이 100인지 여부에 따라서 ...
        if(progressRate >= 100.0f) {
            // 6.1 피킹 주문 상세가 완료되었다면 피킹 지시 마감
            this.closePickingOrder(po);
        } else {
            // 6.2 진행율 업데이트
            po.setProgressRate(ValueUtil.toDouble(progressRate));
            this.queryManager.update(po, "progressRate");
        }
        
        // 6. 리턴
        return item;
    }
    
    /********************************************************************************************************
     *                                        피 킹 예 약 을 위 한 재 고 체 크
     ********************************************************************************************************/
    /**
     * 출고 주문에 대한 재고가 충분한 지 체크
     * 
     * @param ro
     */
    public void checkAvailableInventories(ReleaseOrder ro) {
        String sql = this.outQueryStore.getReleaseOrderStockCheckSummary();
        Map<String, Object> params = ValueUtil.newMap("domainId,releaseOrderId", ro.getDomainId(), ro.getId());
        List<SimpleStockCheck> stockCheckList = this.queryManager.selectListBySql(sql, params, SimpleStockCheck.class, 0, 0);
        this.invTrxSvc.isAvailableStocks(stockCheckList, true);
    }
    
    /********************************************************************************************************
     *                                        피 킹 예 약 (할 당) 처 리
     ********************************************************************************************************/
    /**
     * 출고 주문별 피킹 예약 처리
     * 
     * @param ro
     */
    public PickingOrder reserveForPicking(ReleaseOrder ro) {
        // 1. 피킹 가능한 지 재고 체크
        this.checkAvailableInventories(ro);
        
        // 2. 피킹 예약 방법 조회
        String pickRsvMtd = this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.PICKING_RESERVE_METHOD);
        
        // 3. 피킹 예약 방법이 바코드 별 예약인 경우 (어떤 바코드가 나갈지 사전에 모두 지정)
        if(ValueUtil.isEqualIgnoreCase(pickRsvMtd, WmsOutboundConfigConstants.PICKING_RESERVE_METHOD_BARCODE)) {
            // 바코드 별 피킹 예약
            return this.reserveForPickingByBarcode(ro);
            
        // 4. 그렇지 않은 경우
        } else {
            return null;
        }
    }
    
    /**
     * 출고 주문별 피킹 예약 - 바코드 별 피킹 예약
     * 
     * @param ro
     */
    public PickingOrder reserveForPickingByBarcode(ReleaseOrder ro) {
        // 재고 조회 쿼리 : 가용 재고가 있는 경우 주문 수량이 충족되는 만큼 재고 리스트 리턴
        String reserveStrategy = this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.PICKING_RESERVE_STRATEGY);
        // 주문 상세 리스트
        List<ReleaseOrderItem> itemList = this.queryManager.selectList(ReleaseOrderItem.class, new ReleaseOrderItem(ro.getDomainId(), ro.getId()));
        
        for (ReleaseOrderItem item : itemList) {
            // 재고 예약 처리
            this.invTrxSvc.reserveInvByBarcode(item.getDomainId(), ro.getWhCd(), ro.getComCd(), item.getSkuCd(), null, null, item.getOrdQty(), reserveStrategy, false, ro.getRlsOrdNo(), item.getRlsLineNo());
        }
        
        // 피킹 지시 생성
        return this.createPickingOrderByReleaseOrder(ro);
    }
    
    /**
     * 출고 주문별 피킹 예약 취소
     * 
     * @param ro
     */
    public void cancelReserveForPicking(ReleaseOrder ro) {
        // 1. 피킹 예약 방법 조회
        String pickRsvMtd = this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.PICKING_RESERVE_METHOD);
        
        // 2. 피킹 예약 방법이 BARCODE인 경우 피킹 예약 취소 && 피킹 지시 삭제
        if(ValueUtil.isEqualIgnoreCase(pickRsvMtd, WmsOutboundConfigConstants.PICKING_RESERVE_METHOD_BARCODE)) {
            this.cancelReserveForPickingByBarcode(ro);
        } else if(ValueUtil.isEqualIgnoreCase(pickRsvMtd, WmsOutboundConfigConstants.PICKING_RESERVE_METHOD_INV_CHECK_ONLY)) {
        	// 피킹 예약 방법이 INV_CHECK_ONLY인 경우 
        	this.cancelReserveForPickingByInvCheckOnly(ro);
        }
    }
    
    /**
     * 출고 주문 라인 별 피킹 예약 취소
     * 
     * @param ro
     */
    public void cancelReserveLineForPicking(ReleaseOrder ro, ReleaseOrderItem roItem) {
        // 1. 피킹 예약 방법 조회
        String pickRsvMtd = this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.PICKING_RESERVE_METHOD);
        
        // 2. 피킹 예약 방법이 BARCODE인 경우 피킹 예약 취소 && 피킹 지시 삭제
        if(ValueUtil.isEqualIgnoreCase(pickRsvMtd, WmsOutboundConfigConstants.PICKING_RESERVE_METHOD_BARCODE)) {
        	// To-Do 바코드인 경우 처리 구현 필요 
        }else if(ValueUtil.isEqualIgnoreCase(pickRsvMtd, WmsOutboundConfigConstants.PICKING_RESERVE_METHOD_INV_CHECK_ONLY)) {
        	// 피킹 예약 방법이 INV_CHECK_ONLY인 경우 
        	this.cancelReserveLineForPickingByInvCheckOnly(ro, roItem);
        }
    }
    
    /**
     * 출고 주문별 피킹 예약 취소 - 바코드 별 피킹 예약 취소
     * 
     * @param ro
     */
    public void cancelReserveForPickingByBarcode(ReleaseOrder ro) {
        // 1. 피킹 지시 삭제
        this.cancelPickingOrderByReleaseOrder(ro);
        
        // 2. 피킹 예약 취소 처리
        this.invTrxSvc.cancelReserveInvByBarcode(ro.getDomainId(), ro.getWhCd(), ro.getComCd(), ro.getRlsOrdNo());
    }
    
    public void cancelReserveForPickingByInvCheckOnly(ReleaseOrder ro) {
        // 1. 피킹 예약 취소 처리
        this.invTrxSvc.cancelReserveForPickingByInvCheckOnly(ro.getDomainId(), ro.getWhCd(), ro.getComCd(), ro.getRlsOrdNo());
    }
    
    public void cancelReserveLineForPickingByInvCheckOnly(ReleaseOrder ro, ReleaseOrderItem roItem) {
        // 1. 피킹 예약 취소 처리
        this.invTrxSvc.cancelReserveLineForPickingByInvCheckOnly(ro.getDomainId(), ro.getWhCd(), ro.getComCd(), ro.getRlsOrdNo(), roItem.getRlsLineNo());
    }
    
    /**
     * 피킹 지시 생성
     * 
     * @param ro
     * @return
     */
    public PickingOrder createPickingOrderByReleaseOrder(ReleaseOrder ro) {
        // 1. 출고 주문 토털 피킹 서머리 조회
        String summaryQuery = this.outQueryStore.getTotalPickingForSingleReleaseOrder(); 
        Map<String, Object> qParams = ValueUtil.newMap("domainId,whCd,comCd,rlsOrdNo", ro.getDomainId(), ro.getWhCd(), ro.getComCd(), ro.getRlsOrdNo());
        PickingOrder pick = this.queryManager.selectBySql(summaryQuery, qParams, PickingOrder.class);
        
        // 2. 피킹 지시 생성
        pick.setPickOrderNo(ro.getRlsOrdNo());
        pick.setOrderDate(DateUtil.todayStr());
        pick.setStatus(PickingOrder.STATUS_WAIT);
        pick = this.queryManager.insert(PickingOrder.class, pick);

        // 3. 피킹 할당 재고 조회
        List<Inventory> invList = this.invTrxSvc.getReservedInventoriesBy(ro.getDomainId(), ro.getWhCd(), ro.getComCd(), ro.getRlsOrdNo());
        
        if(ValueUtil.isNotEmpty(invList)) {
            List<PickingOrderItem> poItems = new ArrayList<PickingOrderItem>();
            String outLocCd = this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.RELEASE_WAITING_LOCATION);
            int rank = 0;
            
            // 4. 피킹 지시 상세 리스트 생성
            for(Inventory inv : invList) {
                PickingOrderItem pickItem = ValueUtil.populate(inv, new PickingOrderItem());
                pickItem.setId(null);
                pickItem.setPickOrderId(pick.getId());
                pickItem.setInventoryId(inv.getId());
                pickItem.setBarcode(inv.getBarcode());
                pickItem.setRlsLineNo(inv.getRlsLineNo());
                pickItem.setRank(++rank);
                pickItem.setFromLocCd(inv.getLocCd());
                pickItem.setToLocCd(outLocCd);
                pickItem.setOrderQty(inv.getInvQty());
                pickItem.setStatus(PickingOrderItem.STATUS_WAIT);
                poItems.add(pickItem);
            }
            
            if(ValueUtil.isNotEmpty(poItems)) {
                this.queryManager.insertBatch(poItems);
            }
        }
        
        // 5. 피킹 지시 리턴
        return pick;
    }
    
    /**
     * 피킹 지시 삭제
     * 
     * @param ro
     */
    public void cancelPickingOrderByReleaseOrder(ReleaseOrder ro) {
        // 1. 피킹 지시 조회
        PickingOrder pickCondition = new PickingOrder(ro.getDomainId(), ro.getRlsOrdNo());
        pickCondition.setWhCd(ro.getWhCd());
        pickCondition.setComCd(ro.getComCd());
        List<PickingOrder> pickList = queryManager.selectList(PickingOrder.class, pickCondition);
        
        // 2. 피킹 지시별 상세 삭제
        for(PickingOrder pick : pickList) {
            if(ValueUtil.isNotEqual(pick.getStatus(), PickingOrder.STATUS_WAIT) && ValueUtil.isNotEqual(pick.getStatus(), PickingOrder.STATUS_RUN)) {
                throw new ElidomRuntimeException("피킹 지시 [" + pick.getPickOrderNo() + "]를 취소할 수 있는 상태가 아닙니다.");
            }

            PickingOrderItem item = new PickingOrderItem();
            item.setPickOrderId(pick.getId());
            this.queryManager.deleteBatch(PickingOrderItem.class, queryManager.selectList(PickingOrderItem.class, item));
        }
        
        // 3. 피킹 지시 삭제
        this.queryManager.deleteBatch(PickingOrder.class, pickList);
    }
    
    /********************************************************************************************************
     *                                        작 업 처 리 관 련 A P I
     ********************************************************************************************************/
    
    /**
     * 출고 주문 상세 리스트 
     * 
     * @param domainId
     * @param rlsOrdNo
     * @param status
     * @return
     */
    public List<OutboundOrder> searchReleaseWorkItems(Long domainId, String rlsOrdNo, String notCompleted, String barcode) {
        // 1. 출고 작업 조회
        ReleaseOrder ro = this.queryManager.selectByCondition(ReleaseOrder.class, new ReleaseOrder(domainId, rlsOrdNo));
        if(ro == null) {
            throw new ElidomRuntimeException("출고 지시번호 [" + rlsOrdNo + "]로 출고 주문을 찾을 수 없습니다.");
        }
        
        if(ValueUtil.isEqual(ro.getStatus(), ReleaseOrder.STATUS_END)) {
            throw new ElidomRuntimeException("출고 주문 [" + rlsOrdNo + "]은 작업이 이미 종료되었습니다.");
        }
        
        if(ValueUtil.isNotEqual(ro.getStatus(), ReleaseOrder.STATUS_RUN) && ValueUtil.isNotEqual(ro.getStatus(), ReleaseOrder.STATUS_PICKED)) {
            throw new ElidomRuntimeException("출고 주문 [" + rlsOrdNo + "]은 작업을 진행할 수 있는 상태가 아닙니다.");
        }
        
        // 2. 출고 주문 상세 리스트 조회
        String sql = "select :rlsOrdNo as rls_ord_no, roi.* from release_order_items roi where roi.domain_id = :domainId and roi.release_order_id = :roId #if($status) and status = :status #end #if($barcode) and barcode = :barcode #end order by rls_line_no";
        Map<String, Object> params = ValueUtil.newMap("domainId,roId,rlsOrdNo", ro.getDomainId(), ro.getId(), rlsOrdNo);
        if ( ValueUtil.isNotEmpty(notCompleted) && ValueUtil.toBoolean(notCompleted) ) {
        	params.put("status", ReleaseOrder.STATUS_RUN);
        }
        if ( ValueUtil.isNotEmpty(barcode) ) {
        	params.put("barcode", barcode);
        }
        
        List<OutboundOrder> roItems = this.queryManager.selectListBySql(sql, params, OutboundOrder.class, 0, 0);
        if(ValueUtil.isEmpty(roItems)) {
            // 출고 주문 상세 정보가 존재하지 않습니다.
            return new ArrayList<OutboundOrder>(1);
        }
        
        // 3. 리턴
        return roItems;
    }
    
    /**
     * 출고 주문 라인 리스트 완료 처리 (피킹 주문이 없어서 출고 주문에서 바로 처리하는 경우) 
     * 
     * @param releaseOrder
     * @param items
     * @return
     */
    public List<ReleaseOrderItem> finishReleaseOrderLines(ReleaseOrder releaseOrder, List<ReleaseOrderItem> items) {
        for(ReleaseOrderItem item : items) {
            this.finishReleaseOrderLine(releaseOrder, item);
        }        
        return items;
    }
    
    /**
     * 출고 주문 라인 완료 처리 (피킹 주문이 없어서 출고 주문에서 바로 처리하는 경우)
     * 
     * @param ro
     * @param item
     * @return
     */
    public ReleaseOrderItem finishReleaseOrderLine(ReleaseOrder ro, ReleaseOrderItem item) {
        // 1. 재고 조회
        Inventory inventory = this.invTrxSvc.findInventoryForRelease(item.getDomainId(), ro.getComCd(), ro.getWhCd(), item.getBarcode(), item.getLocCd(), item.getSkuCd(), true);
        // 2. 출고 수량 계산 
        double releaseQty = (item.getRlsQty() != null && item.getRlsQty() > 0.0f) ? item.getRlsQty() : item.getOrdQty();
        double rlsQty = inventory.getInvQty() > releaseQty ? releaseQty : inventory.getInvQty();
        // 3. 출고 완료 처리
        return this.finishReleaseOrderLine(ro, item, inventory, rlsQty);
    }
    
    /**
     * 출고 주문을 재고 (바코드)를 선택하여 라인 완료 처리 (피킹 주문이 없어서 출고 주문에서 바로 처리하는 경우)
     * 
     * @param ro
     * @param item
     * @param inventory
     * @param rlsQty 출고 수량
     * @return
     */
    public ReleaseOrderItem finishReleaseOrderLine(ReleaseOrder ro, ReleaseOrderItem item, Inventory inventory, Double rlsQty) {
        // 1. 출고 수량이 없다면 재고 수량이 출고 수량
        if(rlsQty == null) {
            rlsQty = inventory.getInvQty();
        }
        
        // 2. 완료 처리 가능 여부 체크
        if(rlsQty > item.getOrdQty()) {
            throw new ElidomRuntimeException("주문 라인 [" + item.getRlsLineNo() + "]은 출고 수량이 주문 수량보다 큽니다.");
        }
        
        if(ValueUtil.isEqual(item.getStatus(), ReleaseOrder.STATUS_END)) {
            throw new ElidomRuntimeException("주문 라인 [" + item.getRlsLineNo() + "]은 이미 완료되었습니다. 다른 라인을 선택하세요.");
        }
        
        if (ValueUtil.isNotEqual(item.getStatus(), ReleaseOrder.STATUS_RUN)) {
            throw new ElidomRuntimeException("주문 라인 [" + item.getRlsLineNo() + "]은 작업 중인 상태가 아닙니다.");
        }
        
        if (ValueUtil.isEmpty(item.getBarcode())) {
            throw new ElidomRuntimeException("주문 라인 [" + item.getRlsLineNo() + "]은 바코드 정보가 없습니다.");
        }
        
        if (ValueUtil.isEmpty(item.getLocCd())) {
            throw new ElidomRuntimeException("주문 라인 [" + item.getRlsLineNo() + "]은 로케이션 정보가 없습니다.");
        }
        
        // 3. 출고 수량 만큼만 출고 대기 로케이션으로 재고 이동 처리
        double invRsvQty = item.getOrdQty() >= rlsQty ? rlsQty : item.getOrdQty();
        double splitQty = item.getOrdQty() - rlsQty;
        String outLocCd = this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.RELEASE_WAITING_LOCATION);
        this.invTrxSvc.moveInventoryForRelease(inventory, ro.getRlsOrdNo(), item.getRlsLineNo(), invRsvQty, outLocCd, null);
        
        // 4. 주문 수량이 재고 수량보다 크면 출고 라인 분할 처리
        if(splitQty > 0) {
            item.split(splitQty, false, true);
        }
        
        // 5. 출고 주문 라인 완료 처리
        if(ValueUtil.isEmpty(item.getBarcode())) {
            item.setBarcode(inventory.getBarcode());
        }
        
        if(ValueUtil.isEmpty(item.getLotNo())) {
            item.setLotNo(inventory.getLotNo());
        }
        
        if(ValueUtil.isEmpty(item.getExpiredDate())) {
            item.setExpiredDate(inventory.getExpiredDate());
        }
        
        if(ValueUtil.isEmpty(item.getProdDate())) {
            item.setProdDate(inventory.getProdDate());
        }
        
        if(ValueUtil.isEmpty(item.getSerialNo())) {
            item.setSerialNo(inventory.getSerialNo());
        }
        
        item.setLocCd(inventory.getLocCd());
        item.setOrdQty(invRsvQty);
        item.setRlsQty(invRsvQty);
        item.setStatus(ReleaseOrder.STATUS_END);
        this.queryManager.update(item);
        
        // 6. 출고 주문 상세 완료 여부 체크
        Map<String, Object> params = ValueUtil.newMap("domainId,releaseOrderId,statusCancel,statusEnd", ro.getDomainId(), ro.getId(), ReleaseOrder.STATUS_CANCEL, ReleaseOrder.STATUS_END);
        String sql = "select count(id) as cnt from release_order_items where release_order_id = :releaseOrderId and (status != :statusCancel and status != :statusEnd)";
        
        // 7. 출구 주문이 모두 완료되었다면 출고 주문 완료 처리
        if(this.queryManager.selectBySql(sql, params, Integer.class) == 0) {
            // 7.1 출고 주문 상세 상태 피킹 완료
            params.put("status", ReleaseOrder.STATUS_PICKED);
            sql = this.outQueryStore.getUpdateReleaseOrderItems();
            this.queryManager.executeBySql(sql, params);

            // 7.2 출고 주문 상태 피킹 완료
            ro.setStatus(ReleaseOrder.STATUS_PICKED);
            ro.setFinishedAt(DateUtil.currentTimeStr());
            this.queryManager.update(ro, "status", "finishedAt", "updatedAt");
            
            // 7.3 피킹 상세를 모두 처리한 경우 피킹 오더를 자동 종료 시킨다면 피킹 주문이 모두 완료되었는지 체크 후 자동 완료
            if(ValueUtil.toBoolean(this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.PICKING_AUTO_CLOSING_ENABLED))) {
                this.closeReleaseOrder(ro);
            }
        }
        
        // 8. 리턴
        return item;
    }
    
    /********************************************************************************************************
     *                                        출 고 확 정 시 최 종 출 고 처 리
     ********************************************************************************************************/
    /**
     * 출고 주문에 따른 재고 최종 차감 처리
     * 
     * @param ro
     */
    public void finalReleaseInventories(ReleaseOrder ro) {
        // 1. 출고 주문별 출고 처리 재고 조회
        String outLocCd = this.runtimeConfSvc.getRuntimeConfigValue(ro.getComCd(), ro.getWhCd(), WmsOutboundConfigConstants.RELEASE_WAITING_LOCATION);
        String query = "select * from inventories where domain_id = :domainId and com_cd = :comCd and wh_cd = :whCd and loc_cd = :locCd and rls_ord_no = :rlsOrdNo and status = :status";
        Map<String, Object> invParams = ValueUtil.newMap("domainId,whCd,comCd,rlsOrdNo,locCd,status", ro.getDomainId(), ro.getWhCd(), ro.getComCd(), ro.getRlsOrdNo(), outLocCd, Inventory.STATUS_PICK);
        List<Inventory> inventories = this.queryManager.selectListBySql(query, invParams, Inventory.class, 0, 0);
                
        // 2. 재고 최종 출고 처리
        this.invTrxSvc.finalReleaseInventories(inventories);
    }
    
    /********************************************************************************************************
     *                                               인 쇄  
     ********************************************************************************************************/
    
    /**
     * 피킹지시 번호로 피킹지시서 출력
     * 
     * @param pickingOrderNo
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printPickingSheet(String pickingOrderNo, String templateName, String printerId) {
        PickingOrder pickingOrder = this.queryManager.selectByCondition(PickingOrder.class, new PickingOrder(Domain.currentDomainId(), pickingOrderNo));
        if(pickingOrder == null) {
            throw ThrowUtil.newNotFoundRecord("menu.PickingOrder", pickingOrderNo);
        }
        
        return this.printPickingSheet(pickingOrder, templateName, printerId);
    }
    
    /**
     * 피킹지시로 피킹지시서 출력
     * 
     * @param pickingOrder
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printPickingSheet(PickingOrder pickingOrder, String templateName, String printerId) {
        if(ValueUtil.isEmpty(templateName)) {
            templateName = this.getPickingSheetTemplateName(pickingOrder.getComCd(), pickingOrder.getWhCd(), true);
        }
        
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultNormalPrinter(pickingOrder.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("pickingOrder", pickingOrder);
        PrintEvent event = new PrintEvent(pickingOrder.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType("normal");
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 출고 주문 번호로 거래명세서 출력
     * 
     * @param rlsOrdNo
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printTradeStatement(String rlsOrdNo, String templateName, String printerId) {
        ReleaseOrder releaseOrder = this.queryManager.selectByCondition(ReleaseOrder.class, new ReleaseOrder(Domain.currentDomainId(), rlsOrdNo));
        if(releaseOrder == null) {
            throw ThrowUtil.newNotFoundRecord("menu.ReleaseOrder", rlsOrdNo);
        }
        
        return this.printTradeStatement(releaseOrder, templateName, printerId);
    }
    
    /**
     * 출고 주문으로 거래명세서 출력
     * 
     * @param releaseOrder
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printTradeStatement(ReleaseOrder releaseOrder, String templateName, String printerId) {
        if(ValueUtil.isEmpty(templateName)) {
            templateName = this.getTradeStmtSheetTemplateName(releaseOrder.getComCd(), releaseOrder.getWhCd(), true);
        }
        
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultNormalPrinter(releaseOrder.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("releaseOrder", releaseOrder);
        PrintEvent event = new PrintEvent(releaseOrder.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType("normal");
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 피킹 오더로 거래명세서 출력
     * 
     * @param releaseOrder
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printTradeStatement(PickingOrder pickingOrder, String templateName, String printerId) {
        if(ValueUtil.isEmpty(templateName)) {
            templateName = this.getTradeStmtSheetTemplateName(pickingOrder.getComCd(), pickingOrder.getWhCd(), true);
        }
        
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultNormalPrinter(pickingOrder.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("pickingOrder", pickingOrder);
        PrintEvent event = new PrintEvent(pickingOrder.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType("normal");
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 출고 주문 번호로 출고 라벨 출력
     * 
     * @param rlsOrdNo
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReleaseLabel(String rlsOrdNo, String templateName, String printerId) {
        ReleaseOrder releaseOrder = this.queryManager.selectByCondition(ReleaseOrder.class, new ReleaseOrder(Domain.currentDomainId(), rlsOrdNo));
        if(releaseOrder == null) {
            throw ThrowUtil.newNotFoundRecord("menu.ReleaseOrder", rlsOrdNo);
        }
        
        return this.printReleaseLabel(releaseOrder, templateName, printerId);
    }
    
    /**
     * 출고 주문으로 출고 라벨 출력
     * 
     * @param releaseOrder
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReleaseLabel(ReleaseOrder releaseOrder, String templateName, String printerId) {
        if(ValueUtil.isEmpty(templateName)) {
            templateName = this.getReleaseLabelTemplateName(releaseOrder.getComCd(), releaseOrder.getWhCd(), true);
        }
        
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultBarcodePrinter(releaseOrder.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("releaseOrder", releaseOrder);
        PrintEvent event = new PrintEvent(releaseOrder.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType("barcode");
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 피킹 오더로 출고 라벨 출력
     * 
     * @param releaseOrder
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReleaseLabel(PickingOrder pickingOrder, String templateName, String printerId) {
        if(ValueUtil.isEmpty(templateName)) {
            templateName = this.getReleaseLabelTemplateName(pickingOrder.getComCd(), pickingOrder.getWhCd(), true);
        }
        
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultBarcodePrinter(pickingOrder.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("pickingOrder", pickingOrder);
        PrintEvent event = new PrintEvent(pickingOrder.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType("barcode");
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 출고 라벨 템플릿 이름 조회
     * 
     * @param comCd
     * @param whCd
     * @param exceptionWhenEmpty
     * @return
     */
    public String getReleaseLabelTemplateName(String comCd, String whCd, boolean exceptionWhenEmpty) {
        String templateName = this.runtimeConfSvc.getRuntimeConfigValue(comCd, whCd, WmsOutboundConfigConstants.RELEASE_LABEL_TEMPLATE);
        
        if(exceptionWhenEmpty && ValueUtil.isEmpty(templateName)) {
            throw new ElidomRuntimeException("출고 라벨 템플릿이 화주사-창고별 설정에 설정되지 않았습니다.");
        }
        
        return templateName;
    }
    
    /**
     * 거래명세서 템플릿 이름 조회
     * 
     * @param comCd
     * @param whCd
     * @param exceptionWhenEmpty
     * @return
     */
    public String getTradeStmtSheetTemplateName(String comCd, String whCd, boolean exceptionWhenEmpty) {
        String templateName = this.runtimeConfSvc.getRuntimeConfigValue(comCd, whCd, WmsOutboundConfigConstants.RELEASE_TRADE_STMT_TEMPLATE);
        
        if(exceptionWhenEmpty && ValueUtil.isEmpty(templateName)) {
            throw new ElidomRuntimeException("거래명세서 템플릿이 화주사-창고별 설정에 설정되지 않았습니다.");
        }
        
        return templateName;
    }
    
    /**
     * 피킹지시서 템플릿 이름 조회
     * 
     * @param comCd
     * @param whCd
     * @param exceptionWhenEmpty
     * @return
     */
    public String getPickingSheetTemplateName(String comCd, String whCd, boolean exceptionWhenEmpty) {
        String templateName = this.runtimeConfSvc.getRuntimeConfigValue(comCd, whCd, WmsOutboundConfigConstants.PICKING_ORDER_SHEET_TEMPLATE);
        
        if(exceptionWhenEmpty && ValueUtil.isEmpty(templateName)) {
            throw new ElidomRuntimeException("피킹지시서 템플릿이 화주사-창고별 설정에 설정되지 않았습니다.");
        }
        
        return templateName;
    }

    /********************************************************************************************************
     *                                        대 시 보 드   A P I
     ********************************************************************************************************/

    /**
     * 대시보드 - 출고 상태별 건수 조회
     *
     * @param comCd 화주사 코드
     * @param whCd 창고 코드
     * @param targetDate 기준일 (기본값: 오늘)
     * @return 상태별 건수 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardStatusCounts(String comCd, String whCd, String targetDate) {
        String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT status, COUNT(*) as count " +
                "FROM release_orders " +
                "WHERE domain_id = :domainId " +
                "AND rls_ord_date = :targetDate ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
        }

        sql += "GROUP BY status";

        Map<String, Object> params = ValueUtil.newMap("domainId,targetDate", domainId, date);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);

        // 결과를 Map으로 변환
        Map<String, Object> statusCounts = ValueUtil.newMap(
                "REG,READY,RUN,END",
                0, 0, 0, 0
        );

        for (Map<String, Object> row : results) {
            String status = ValueUtil.toString(row.get("status"));
            Integer count = ValueUtil.toInteger(row.get("count"));
            statusCounts.put(status, count);
        }

        return statusCounts;
    }

    /**
     * 대시보드 - 출고 유형별 통계 조회
     *
     * @param comCd 화주사 코드
     * @param whCd 창고 코드
     * @param startDate 시작일 (기본값: 오늘)
     * @param endDate 종료일 (기본값: 오늘)
     * @return 유형별 건수 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardTypeStats(String comCd, String whCd, String startDate, String endDate) {
        String sDate = ValueUtil.isNotEmpty(startDate) ? startDate : DateUtil.todayStr();
        String eDate = ValueUtil.isNotEmpty(endDate) ? endDate : DateUtil.todayStr();
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT rls_type, COUNT(*) as count " +
                "FROM release_orders " +
                "WHERE domain_id = :domainId " +
                "AND rls_ord_date BETWEEN :startDate AND :endDate ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
        }

        sql += "GROUP BY rls_type";

        Map<String, Object> params = ValueUtil.newMap("domainId,startDate,endDate", domainId, sDate, eDate);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);

        // 결과를 Map으로 변환
        Map<String, Object> typeStats = ValueUtil.newMap(
                "NORMAL,RETURN,TRANSFER,SCRAP,ETC",
                0, 0, 0, 0, 0
        );

        for (Map<String, Object> row : results) {
            String rlsType = ValueUtil.toString(row.get("rls_type"));
            Integer count = ValueUtil.toInteger(row.get("count"));
            if (ValueUtil.isNotEmpty(rlsType)) {
                typeStats.put(rlsType, count);
            }
        }

        return typeStats;
    }

    /**
     * 대시보드 - 피킹 통계 조회
     *
     * @param comCd 화주사 코드
     * @param whCd 창고 코드
     * @param targetDate 기준일 (기본값: 오늘)
     * @return 피킹 상태별 건수 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardPickingStats(String comCd, String whCd, String targetDate) {
        String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT status, COUNT(*) as count " +
                "FROM picking_orders " +
                "WHERE domain_id = :domainId " +
                "AND order_date = :targetDate ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
        }

        sql += "GROUP BY status";

        Map<String, Object> params = ValueUtil.newMap("domainId,targetDate", domainId, date);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);

        // 결과를 Map으로 변환
        Map<String, Object> pickingStats = ValueUtil.newMap(
                "WAIT,RUN,END",
                0, 0, 0
        );

        for (Map<String, Object> row : results) {
            String status = ValueUtil.toString(row.get("status"));
            Integer count = ValueUtil.toInteger(row.get("count"));
            pickingStats.put(status, count);
        }

        return pickingStats;
    }

    /**
     * 대시보드 - 사업 유형별 통계 조회
     *
     * @param comCd 화주사 코드
     * @param whCd 창고 코드
     * @param targetDate 기준일 (기본값: 오늘)
     * @return 사업 유형별 건수 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardBusinessTypeStats(String comCd, String whCd, String targetDate) {
        String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();
        Long domainId = Domain.currentDomainId();

        String sql = "SELECT biz_type, COUNT(*) as count " +
                "FROM release_orders " +
                "WHERE domain_id = :domainId " +
                "AND rls_ord_date = :targetDate ";

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
        }

        sql += "GROUP BY biz_type";

        Map<String, Object> params = ValueUtil.newMap("domainId,targetDate", domainId, date);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);

        // 결과를 Map으로 변환
        Map<String, Object> bizTypeStats = ValueUtil.newMap(
                "B2B,B2C",
                0, 0
        );

        for (Map<String, Object> row : results) {
            String bizType = ValueUtil.toString(row.get("biz_type"));
            Integer count = ValueUtil.toInteger(row.get("count"));
            if (ValueUtil.isNotEmpty(bizType)) {
                // biz_type 값이 'B2B_OUT' 또는 'B2C_OUT' 형태일 수 있으므로 변환
                if (bizType.contains("B2B")) {
                    bizTypeStats.put("B2B", count);
                } else if (bizType.contains("B2C")) {
                    bizTypeStats.put("B2C", count);
                }
            }
        }

        return bizTypeStats;
    }

    /**
     * 대시보드 - 알림 데이터 조회
     *
     * @param comCd 화주사 코드
     * @param whCd 창고 코드
     * @return 알림 목록
     */
    public List<Map<String, Object>> getDashboardAlerts(String comCd, String whCd) {
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();
        List<Map<String, Object>> alerts = new ArrayList<>();

        // 1. 지연 출고 건수 조회 (출고 예정일이 지났는데 아직 RUN 상태인 건)
        String delaySql = "SELECT COUNT(*) as count " +
                "FROM release_orders " +
                "WHERE domain_id = :domainId " +
                "AND status IN ('REG', 'READY', 'RUN') " +
                "AND rls_ord_date < :today ";

        if (ValueUtil.isNotEmpty(comCd)) {
            delaySql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            delaySql += "AND wh_cd = :whCd ";
        }

        Map<String, Object> params = ValueUtil.newMap("domainId,today", domainId, today);
        if (ValueUtil.isNotEmpty(comCd)) {
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            params.put("whCd", whCd);
        }

        int delayCount = this.queryManager.selectBySql(delaySql, params, Integer.class);
        if (delayCount > 0) {
            Map<String, Object> alert = ValueUtil.newMap(
                    "type,icon,message",
                    "warning",
                    "⚠️",
                    "지연 출고 " + delayCount + "건이 있습니다."
            );
            alerts.add(alert);
        }

        // 2. 피킹 대기 건수 조회
        String pickWaitSql = "SELECT COUNT(*) as count " +
                "FROM picking_orders " +
                "WHERE domain_id = :domainId " +
                "AND status = 'WAIT' " +
                "AND order_date = :today ";

        if (ValueUtil.isNotEmpty(comCd)) {
            pickWaitSql += "AND com_cd = :comCd ";
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            pickWaitSql += "AND wh_cd = :whCd ";
        }

        int pickWaitCount = this.queryManager.selectBySql(pickWaitSql, params, Integer.class);
        if (pickWaitCount > 0) {
            Map<String, Object> alert = ValueUtil.newMap(
                    "type,icon,message",
                    "info",
                    "📦",
                    "피킹 대기 " + pickWaitCount + "건이 있습니다."
            );
            alerts.add(alert);
        }

        return alerts;
    }
}
