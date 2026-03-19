package operato.wms.inbound.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.entity.SKU;
import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.inbound.WmsInboundConfigConstants;
import operato.wms.inbound.WmsInboundConstants;
import operato.wms.inbound.entity.ImportReceivingOrder;
import operato.wms.inbound.entity.Receiving;
import operato.wms.inbound.entity.ReceivingItem;
import operato.wms.inbound.query.store.InboundQueryStore;
import operato.wms.stock.WmsStockConfigConstants;
import operato.wms.stock.entity.Inventory;
import xyz.anythings.sys.event.EventPublisher;
import xyz.anythings.sys.event.model.PrintEvent;
import xyz.anythings.sys.model.BaseResponse;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.anythings.sys.service.ICustomService;
import xyz.anythings.sys.util.AnyOrmUtil;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.print.PrintConstants;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 입고 모듈 트랜잭션 처리 서비스
 * 
 * @author shortstop
 */
@Component
public class InboundTransactionService extends AbstractQueryService {
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
     * 커스텀 서비스
     */
    @Autowired
    protected ICustomService customSvc;
    /**
     * 입고 쿼리 스토어
     */
    @Autowired
    protected InboundQueryStore inQueryStore;
    /**
     * 이벤트 퍼블리셔
     */
    @Autowired
    protected EventPublisher eventPublisher;
    
    /********************************************************************************************************
     *  입고 예정 트랜잭션 :  작성 or 업로드   ->  요청          ->     확정     ->      입고 작업     -> 입고 완료 
     *  입고 예정 상태    : (INWORK) 작성 중 -> (REQUEST) 요청 -> (READY) 대기 -> (RUNNING) 진행 중 -> (END) 완료  
     ********************************************************************************************************/
    
    /**
     * 입고 예정 정보 임포트
     * 
     * @param list
     * @return
     */
    public Receiving importReleaseOrders(List<ImportReceivingOrder> list) {
        ImportReceivingOrder firstOrder = list.get(0);
        
        // 요청일이 없다면 오늘 날짜로 입력
        if(ValueUtil.isEmpty(firstOrder.getRcvExpDate())) {
            firstOrder.setRcvExpDate(DateUtil.todayStr());
        }
        
        // 요청 유형이 없다면 일반 입고
        if(ValueUtil.isEmpty(firstOrder.getRcvType())) {
            firstOrder.setRcvType(WmsInboundConstants.RECEIVING_TYPE_NORMAL);
        }
        
        // 입고 예정 마스터 생성
        Receiving ro = ValueUtil.populate(firstOrder, new Receiving());
        //ro.setCreatedAt(null);
        //ro.setUpdatedAt(null);
        this.queryManager.insert(ro);
        
        // 입고 상세 정보
        List<ReceivingItem> newOrderItems = new ArrayList<ReceivingItem>();
        int rcvExpSeq = 1;
        
        for(ImportReceivingOrder order : list) {
            ReceivingItem ri = ValueUtil.populate(order, new ReceivingItem());
            ri.setReceivingId(ro.getId());
            
            if(ValueUtil.isEmpty(ri.getRcvExpSeq())) {
                ri.setRcvExpSeq(rcvExpSeq++);
            }
            
            if(ValueUtil.isEmpty(ri.getRcvExpDate())) {
                ri.setRcvExpDate(ro.getRcvReqDate());
            }
            
            ri.setRemarks(order.getItemRemarks());
            ri.setCreatedAt(null);
            ri.setUpdatedAt(null);
            newOrderItems.add(ri);
        }
        
        // 입고 상세 정보 생성
        AnyOrmUtil.insertBatch(newOrderItems, 100);
        
        // 리턴
        return ro;
    }
    
    /**
     * 입고 예정 정보 요청 처리 (상태 : INWORK -> REQUEST)
     * 
     * @param receiving
     * @return
     */
    public Receiving requestReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_INWORK)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_INWORK);
        }
        
        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class, ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));
        if(ValueUtil.isEmpty(receivingItems)) {
            throw new ElidomRuntimeException("입고 예정 상세 정보가 존재하지 않습니다.");
        }
        
        // 3. 품목 및 수량 체크
        for(ReceivingItem item : receivingItems) {
            if(item.getTotalExpQty() == null || item.getTotalExpQty() == 0) {
                throw new ElidomRuntimeException("품목 [" + item.getSkuCd() + "]에 예정 수량이 존재하지 않습니다.");
            }
            
            item.setStatus(WmsInboundConstants.STATUS_REQUEST);
        }
        
        // 4. 입고 예정 상태 변경 
        receiving.setStatus(WmsInboundConstants.STATUS_REQUEST);
        this.queryManager.update(receiving, "status", "updatedAt");
        
        // 5. 입고 상세 상태 변경
        this.queryManager.updateBatch(receivingItems, "status", "updatedAt");
        
        // 6. 입고 예정 리턴
        return receiving;
    }
    
    /**
     * 입고 예정 정보 요청 취소 처리 (상태 : REQUEST -> INWORK, INWORK -> 삭제)
     * 
     * @param receiving
     * @return
     */
    public Receiving cancelRequestReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_INWORK) && ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_REQUEST)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_INWORK);
        }
        
        // 2. 작성 중인 경우 삭제
        if(ValueUtil.isEqual(receiving.getStatus(), WmsInboundConstants.STATUS_INWORK)) {
            // 2.1 입고 예정 상세 삭제
            ReceivingItem riCond = new ReceivingItem(receiving.getDomainId(), receiving.getId());
            this.queryManager.deleteList(ReceivingItem.class, riCond);
            
            // 2.2 입고 예정 삭제
            this.queryManager.delete(receiving);
            
        // 3. 요청 상태인 경우 작성 중으로 
        } else {
            // 3.1 입고 예정 상태 변경 
            receiving.setStatus(WmsInboundConstants.STATUS_INWORK);
            this.queryManager.update(receiving, "status", "updatedAt");
            
            // 3.2 입고 상세 상태 변경
            String sql = this.inQueryStore.getUpdateReceivingOrderItems();
            this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,receivingId,status", receiving.getDomainId(), receiving.getId(), WmsInboundConstants.STATUS_INWORK));
        }
        
        // 4. 입고 예정 리턴
        return receiving;
    }
    
    /**
     * 입고 예정 정보 접수 처리 (상태 : REQUEST -> READY)
     * 
     * @param receiving
     * @return
     */
    public Receiving acceptReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_REQUEST)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_REQUEST);
        }
        
        // 2. 입고번호가 없다면 입고 예정번호와 동일하게 처리 
        if(ValueUtil.isEmpty(receiving.getRcvNo())) {
            receiving.setRcvNo(receiving.getRcvReqNo());
        }
        
        // 3. 입고 예정 상태 변경 
        receiving.setStatus(WmsInboundConstants.STATUS_READY);
        this.queryManager.update(receiving, "rcvNo", "status", "updatedAt");
        
        // 4. 입고 상세 상태 변경
        String sql = this.inQueryStore.getUpdateReceivingOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,receivingId,status", receiving.getDomainId(), receiving.getId(), WmsInboundConstants.STATUS_READY));
        
        // 5. 입고 예정 리턴
        return receiving;
    }
    
    /**
     * 입고 예정 정보 접수 취소 처리 (상태 : READY -> REQUEST)
     * 
     * @param receiving
     * @return
     */
    public Receiving cancelAcceptReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_READY)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_READY);
        }
        
        // 2. 입고 예정 상태 변경 
        receiving.setStatus(WmsInboundConstants.STATUS_REQUEST);
        this.queryManager.update(receiving, "status", "updatedAt");
        
        // 3. 입고 상세 상태 변경
        String sql = this.inQueryStore.getUpdateReceivingOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,receivingId,status", receiving.getDomainId(), receiving.getId(), WmsInboundConstants.STATUS_REQUEST));
        
        // 4. 입고 예정 리턴
        return receiving;
    }
    
    /**
     * 입고 정보 작업 처리 시작 (상태 : READY -> START)
     * 
     * @param receiving
     * @return
     */
    public Receiving startReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_READY)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_READY);
        }
        
        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class, ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));
        
        // 3. 품목 및 수량 체크
        for(ReceivingItem item : receivingItems) {
            item.setStatus(WmsInboundConstants.STATUS_START);
        }
        
        // 4. 입고 예정 상태 변경 
        receiving.setStatus(WmsInboundConstants.STATUS_START);
        this.queryManager.update(receiving, "status", "updatedAt");
        
        // 5. 입고 상세 상태 변경
        this.queryManager.updateBatch(receivingItems, "status", "updatedAt");

        // 6. 입고 정보 리턴
        return receiving;
    }
    
    /**
     * 입고 정보 작업 시작 취소 (상태 : START -> READY)
     * 
     * @param receiving
     * @return
     */
    public Receiving cancelStartReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_START);
        }
        
        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class, ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));
        
        // 3. 작업 정보 초기화 
        this.cancelFinishReceivingOrderLines(receiving, receivingItems);
        
        // 4. 품목 및 수량 체크
        for(ReceivingItem item : receivingItems) {
            item.setStatus(WmsInboundConstants.STATUS_READY);
        }
        
        // 5. 입고 예정 상태 변경 
        receiving.setStatus(WmsInboundConstants.STATUS_READY);
        this.queryManager.update(receiving, "status", "updatedAt");
        
        // 6. 입고 상세 상태 변경
        this.queryManager.updateBatch(receivingItems, "status", "updatedAt");

        // 7. 입고 정보 리턴
        return receiving;
    }
    
    /**
     * 입고 상세 라인 리스트 완료 처리
     * 
     * @param receiving
     * @param list
     * @param printerId
     * @return
     */
    public List<ReceivingItem> finishReceivingOrderLines(Receiving receiving, List<ReceivingItem> list, String printerId) {
        List<ReceivingItem> listToFinish = new ArrayList<ReceivingItem>();
        
        for(ReceivingItem item : list) {
            item = this.finishReceivingOrderLine(receiving, item, printerId);
            listToFinish.add(item);
        }
        
        return listToFinish;
    }
    
    /**
     * 입고 상세 라인 완료 처리
     * 
     * @param receiving
     * @param item
     * @param printerId
     * @return
     */
    public ReceivingItem finishReceivingOrderLine(Receiving receiving, ReceivingItem item, String printerId) {
        // 상태 체크
        if (ValueUtil.isNotEqual(item.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 작업 중인 상태가 아닙니다.");
        }
        
        if(item.getRcvQty() == null || item.getRcvQty() == 0) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 입고 수량이 0 입니다.");
        }
        
        if(item.getRcvQty() > item.getRcvExpQty()) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 입고 수량이 입고 예정수량보다 큽니다.");
        }
        
        if(receiving.getInspFlag()) {
            if(ValueUtil.isEmpty(item.getItemType())) {
                throw new ElidomRuntimeException("검수 결과 정보가 없습니다.");
            } else if(ValueUtil.isNotEqual(item.getItemType(), WmsInboundConstants.INSP_STATUS_PASS)) {
                throw new ElidomRuntimeException("검수 결과가 패스가 아닙니다.");
            }
            
            if(item.getInspQty() == 0 || item.getInspQty() < item.getRcvQty()) {
                throw new ElidomRuntimeException("검수 수량이 입고 수량보다 작습니다.");
            }
        }
        
        double splitQty = item.getRcvExpQty() - item.getRcvQty();
        
        // 예정 수량과 입고 수량이 다르면 자동 분할 처리
        if(splitQty > 0) {
            item.split(splitQty, false, true);
        }
        
        // 완료 처리
        if ( ValueUtil.isEmpty(item.getBarcode()) ) {
        	item.setBarcode(Inventory.newBarcode());
        }
        item.setRcvDate(DateUtil.todayStr());
        item.setStatus(WmsInboundConstants.STATUS_END);
        return item;
    }
    
    /**
     * 입고 정보 작업 완료 처리
     * 
     * @param receiving
     * @return
     */
    public Receiving closeReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_START);
        }
        
        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class, ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));
        String rcvDate = ValueUtil.isEmpty(receiving.getRcvEndDate()) ? DateUtil.todayStr() : receiving.getRcvEndDate();
        
        // 3. 품목 및 수량 체크
        for(ReceivingItem item : receivingItems) {
            if(item.getRcvExpQty() <= item.getRcvQty()) {
                item.setStatus(WmsInboundConstants.STATUS_END);
                item.setRcvDate(rcvDate);
            } else {
                throw new ElidomRuntimeException("품목 [" + item.getSkuCd() + "]은 아직 입고 처리가 완료되지 않았습니다.");
            }
        }
        
        // 4. 입고 예정 상태 변경 
        receiving.setStatus(WmsInboundConstants.STATUS_END);
        receiving.setRcvEndDate(rcvDate);
        this.queryManager.update(receiving, "status", "rcvEndDate", "updatedAt");
        
        // 5. 입고 상세 상태 변경
        this.queryManager.updateBatch(receivingItems, "status", "rcvDate", "updatedAt");
        
        // 6. 재고 정보 생성
        this.createInventoriesByReceivingOrder(receiving, receivingItems);
        
        // 7. 입고 정보 리턴
        return receiving;
    }
    
    /**
     * 입고 예정 정보 상품 입고 완료 취소 리스트 처리 (상태 : END -> START)
     * 
     * @param receiving
     * @param list
     * @param printerId
     * @return
     */
    public BaseResponse cancelFinishReceivingOrderLines(Receiving receiving, List<ReceivingItem> list) {
        
        for(ReceivingItem item : list) {
        	this.cancelFinishReceivingOrderLine(receiving, item);
        }
        
        return new BaseResponse(true, "ok");
        
    }
    
    /**
     * 입고 예정 정보 상품 입고 완료 취소 처리 (상태 : END -> START)
     * 
     * @param receiving, item
     * @return
     */
    public BaseResponse cancelFinishReceivingOrderLine(Receiving receiving, ReceivingItem item) {
        // 1. 상태 체크 : 예정 주문 상태 START (END 상태인 경우 재고 조정 처리)
        if(ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(), WmsInboundConstants.STATUS_START);
        }
        
        // 2. 입고 예정 상태 변경 
        receiving.setStatus(WmsInboundConstants.STATUS_START);
        this.queryManager.update(receiving, "status", "updatedAt");
        
        // 3. 초기화
        /* 입고 라인 초기화 */
        ReceivingItem workItem = new ReceivingItem();
        workItem.setDomainId(receiving.getDomainId());
        workItem.setReceivingId(receiving.getId());
        workItem.setRcvExpSeq(item.getRcvExpSeq());
        workItem.setSkuCd(item.getSkuCd());
        workItem.setStatus(WmsInboundConstants.STATUS_START);
        
        workItem = this.queryManager.selectByCondition(ReceivingItem.class, workItem);
        if (ValueUtil.isNotEmpty(workItem)) {
        	// 작업중인 대상이 존재하는 경우 
        	if ( ValueUtil.isNotEqual(item.getId(), workItem.getId()) ) {
        		// 조회 결과가 자신이 아닌 경우 
        		// 1. 수량 병합 
        		workItem.setRcvExpQty(workItem.getRcvExpQty() + item.getRcvExpQty());
        		// 2. 시퀀스 조정 
        		if (workItem.getRcvSeq() > item.getRcvSeq()) {
        			workItem.setRcvSeq(item.getRcvSeq());
        		}
        		// 3. 취소 대상 삭제 
        		this.queryManager.delete(item);
        		// 4. 변경된 정보 저장 
        		this.queryManager.update(workItem);
        	}
        } else {
        	// 작업중인 대상이 존재하지 않는 경우 
        	// 1. 상태 변경 : END > START
        	item.setStatus(WmsInboundConstants.STATUS_START);
        	// 2. 바코드 초기화 
        	item.setBarcode(null);
        	// 3. 수량 초기화
        	item.setRcvQty(0.0);
        	this.queryManager.update(item);
        }
        
        
        return new BaseResponse(true, "ok");
        
    }
    
    /**
     * 입고 작업 완료시 재고 정보 생성
     * 
     * @param receiving
     * @param receivingItems
     * @return
     */
    public List<Inventory> createInventoriesByReceivingOrder(Receiving receiving, List<ReceivingItem> receivingItems) {
        // 1. 기본 로케이션 설정에서 조회
        String defaultLocCd = this.runtimeConfSvc.getRuntimeConfigValue(receiving.getComCd(), receiving.getWhCd(), WmsInboundConfigConstants.RECEIPT_FINISH_LOCATION);
        
        List<Inventory> inventories = new ArrayList<Inventory>();
        for(ReceivingItem item : receivingItems) {
            if (ValueUtil.isNotEqual(item.getStatus(), WmsInboundConstants.STATUS_END) || item.getRcvQty() == null || item.getRcvQty() == 0) {
                continue;
            }
            
            SKU sku = queryManager.selectByCondition(SKU.class, new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));

            Inventory inv = new Inventory();
            inv.setBarcode(item.getBarcode());
            inv.setStatus(Inventory.STATUS_WAITING);
            inv.setLastTranCd(Inventory.TRANSACTION_IN_INSP);
            inv.setWhCd(receiving.getWhCd());
            inv.setComCd(receiving.getComCd());
            inv.setVendCd(receiving.getVendCd());
            inv.setPoNo(ValueUtil.isNotEmpty(item.getPoNo()) ? item.getPoNo() : receiving.getRcvReqNo());
            inv.setRcvNo(receiving.getRcvNo());
            inv.setRcvSeq(item.getRcvSeq());
            inv.setSkuCd(item.getSkuCd());
            inv.setSkuBcd(sku.getSkuBarcd());
            inv.setSkuNm(sku.getSkuNm());
            inv.setLocCd(defaultLocCd);
            inv.setProdDate(item.getPrdDate());
            inv.setExpiredDate(item.getExpiredDate());
            inv.setInvoiceNo(item.getInvoiceNo());
            inv.setInvQty(item.getRcvQty());
            inv.setPalletQty(item.getRcvPalletQty());
            inv.setBoxQty(item.getRcvBoxQty());
            inv.setLotNo(item.getLotNo());
            inv.setOrigin(item.getOrigin());
            inv.setDelFlag(false);
            this.updateInventoryExpiredInfo(inv, sku);
            
            inventories.add(inv);
        }
        
        this.queryManager.insertBatch(inventories);
        return inventories;
    }
    
    /**
     * 재고 유통기한 등 정보 업데이트
     * 
     * @param inv
     * @param sku
     */
    public void updateInventoryExpiredInfo(Inventory inv, SKU sku) {
        if(sku == null) {
            sku = queryManager.selectByCondition(SKU.class, new SKU(inv.getDomainId(), inv.getComCd(), inv.getSkuCd()));
        }
        
        // 유통기한 설정이 안 되어 있다면 유통기한 계산 설정
        if(ValueUtil.isEmpty(inv.getExpiredDate()) && ValueUtil.isNotEmpty(inv.getProdDate()) && ValueUtil.isNotEmpty(sku.getPrdExpiredPeriod())) {
            // 제조일자가 있는 경우 : 유통기한 = 제조일 + 제조일 유통기한
            inv.setExpiredDate(DateUtil.addDateToStr(DateUtil.parse(inv.getProdDate(), DateUtil.getDateFormat()), sku.getPrdExpiredPeriod()));
        }
        
        // 유효기간 상태 설정 : 재고에 유효 기간이 설정된 경우
        if(ValueUtil.isNotEmpty(inv.getExpiredDate())) {
            if(ValueUtil.isNotEmpty(sku.getImminentPeriod())) {
                // 임박 재고 전환 기준일이 지정된 경우 
                if (DateUtil.isBiggerThenTargetDate(inv.getExpiredDate(), DateUtil.addDateToStr(new Date(), sku.getImminentPeriod()))) {
                    // 정상 : 유효 기간이 임박재고 전환일 보다 큰 경우  
                    inv.setExpireStatus(Inventory.EXPIRE_STATUS_NORMAL);
                } else {
                    // 유효 기간이 임박재고 전환일 보다 작은 경우 : 유효기간 지남 / 임박 체크 
                    if(ValueUtil.isNotEmpty(sku.getNoOutPeriod()) && DateUtil.isBiggerThenTargetDate(DateUtil.addDateToStr(new Date(), sku.getNoOutPeriod()), inv.getExpiredDate())) {
                        // 유효기간 지남 : 출고 불가 기준일이 있고, 유효기간 보다 출고 불가 기준일이 큰경우 
                        inv.setExpireStatus(Inventory.EXPIRE_STATUS_EXPIRED);
                    } else {
                        // 임박 : 출고 불가 기준일이 없거나, 출고 불가 기준일 보다 유효 기간이 큰 경우 
                        inv.setExpireStatus(Inventory.EXPIRE_STATUS_IMMINENT);
                    }
                }
            } else if(ValueUtil.isNotEmpty(sku.getNoOutPeriod())) {
                // 출고 불가 기준일이 지정된 경우 
                if (DateUtil.isBiggerThenTargetDate(DateUtil.addDateToStr(new Date(), sku.getNoOutPeriod()), inv.getExpiredDate()) ) {
                    // 유효기간 지남 : 유효기간 보다 출고 불가 기준일이 큰 경우 
                    inv.setExpireStatus(Inventory.EXPIRE_STATUS_EXPIRED);
                } else {
                    // 정상 : 유효 기간이 임박재고 전환일 보다 큰 경우  
                    inv.setExpireStatus(Inventory.EXPIRE_STATUS_NORMAL);
                }
            } else {
                // 유효 기간 상태 : 정상 
                inv.setExpireStatus(Inventory.EXPIRE_STATUS_NORMAL);
            }
        }
    }
    
    /********************************************************************************************************
     *                                                  작 업 화 면 A P I 
     ********************************************************************************************************/
    
    /**
     * 입고 작업 화면 - 작업을 위해 입고 번호 (rcv_no)로 입고 예정 상세 정보 조회
     * 
     * @param domainId
     * @param rcvNo
     * @return
     */
    public List<ReceivingItem> getReceivingWorkItems(Long domainId, String rcvNo, String notCompleted, String barcode) {
        // 1. 입고 주문 정보 조회
        Receiving rcv = this.queryManager.selectByCondition(Receiving.class, new Receiving(Domain.currentDomainId(), rcvNo));
        
        if (rcv == null) {
            throw new ElidomRuntimeException("입고 주문 번호 [" + rcvNo + "]로 입고 주문을 찾을 수 없습니다.");
        }
        
        // 2. 입고 예정 정보 상태 체크
        if(ValueUtil.isEqual(rcv.getStatus(), WmsInboundConstants.STATUS_END)) {
            return new ArrayList<ReceivingItem>(1);
        }
        
        if(ValueUtil.isNotEqual(rcv.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw new ElidomRuntimeException("입고 작업을 처리할 수 있는 상태가 아닙니다.");
        }

        // 3. 입고 예정 상세 조회
        Query queryObj = AnyOrmUtil.newConditionForExecution(Domain.currentDomainId());
        queryObj.addFilter("receivingId", rcv.getId());
        if ( ValueUtil.isNotEmpty(notCompleted) && ValueUtil.toBoolean(notCompleted) ) {
        	queryObj.addFilter("status", WmsInboundConstants.STATUS_START);
        }
        if ( ValueUtil.isNotEmpty(barcode) ) {
        	queryObj.addFilter("barcode", barcode);
        }
        queryObj.addOrder("rcvSeq", true);
        List<ReceivingItem> items = this.queryManager.selectList(ReceivingItem.class, queryObj);
        
        // 4. 모바일 그리드에 표시할 내용 생성
        for(ReceivingItem item : items) {
            String remark = item.getRcvSeq() + ") " + item.getRcvExpSeq() + " / " + item.getSkuNm() + " / " + item.getRcvExpQty() + " / " + item.getRcvQty();
            item.setRemarks(remark);
        }
        
        // 5. 워크 아이템스 리턴
        return items;
    }
    
    /**
     * 적치 작업 화면 - 작업을 위해 입고 번호 (rcv_no)로 적치 예정 상세 정보 조회
     * 
     * @param domainId
     * @param rcvNo
     * @return
     */
    public List<Inventory> getPutawayWorkItems(Long domainId, String rcvNo, String barcode) {
        // 1. 입고 주문 정보 조회
        Receiving rcv = this.queryManager.selectByCondition(Receiving.class, new Receiving(Domain.currentDomainId(), rcvNo));
        
        if (rcv == null) {
            throw new ElidomRuntimeException("입고 주문 번호 [" + rcvNo + "]로 입고 주문을 찾을 수 없습니다.");
        }
        
        // 2. 입고 예정 정보 상태 체크
        if(ValueUtil.isNotEqual(rcv.getStatus(), WmsInboundConstants.STATUS_END)) {
            throw new ElidomRuntimeException("적치 작업을 처리할 수 있는 상태가 아닙니다.");
        }

        // 3. 입고 예정 상세 조회
        String rcvWaitLoc = this.runtimeConfSvc.getRuntimeConfigValue(rcv.getComCd(), rcv.getWhCd(), WmsInboundConfigConstants.RECEIPT_FINISH_LOCATION);
        Query queryObj = AnyOrmUtil.newConditionForExecution(Domain.currentDomainId());
        queryObj.addFilter("rcvNo", rcvNo);
        queryObj.addFilter("locCd", rcvWaitLoc);
        queryObj.addFilter("status", Inventory.STATUS_WAITING);
        queryObj.addFilter("delFlag", false);
        if ( ValueUtil.isNotEmpty(barcode) ) {
        	queryObj.addFilter("barcode", barcode);
        }
        queryObj.addOrder("rcvSeq", true);
        List<Inventory> items = this.queryManager.selectList(Inventory.class, queryObj);
        
        // 4. 재고 바코드 체크
        if(items == null || items.isEmpty()) {
        	return new ArrayList<Inventory>(1);
        }
        
        // 5. 모바일 그리드에 표시할 내용 생성
        for(Inventory item : items) {
            String remark = item.getRcvSeq() + ") " + item.getSkuNm() + " / " + item.getBarcode() + " / " + item.getInvQty();
            item.setRemarks(remark);
        }
        
        // 6. 워크 아이템스 리턴
        return items;
    }
    
    /********************************************************************************************************
     *                                                  인 쇄  
     ********************************************************************************************************/
    /**
     * 입고지시 번호로 입고지시서 출력
     * 
     * @param rcvNo
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReceivingSheet(String rcvNo, String templateName, String printerId) {
        Receiving receiving = this.queryManager.selectByCondition(Receiving.class, new Receiving(Domain.currentDomainId(), rcvNo));
        if(receiving == null) {
            throw ThrowUtil.newNotFoundRecord("menu.Receiving", rcvNo);
        }
        
        return this.printReceivingSheet(receiving, templateName, printerId);
    }
    
    /**
     * 입고 정보로 입고지시서 출력
     * 
     * @param receiving
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReceivingSheet(Receiving receiving, String templateName, String printerId) {
        if(ValueUtil.isEmpty(templateName)) {
            templateName = this.getReceivingSheetTemplateName(receiving, true);
        }
        
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultNormalPrinter(receiving.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("receiving", receiving);
        PrintEvent event = new PrintEvent(receiving.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType(PrintConstants.PRINTER_TYPE_NORMAL);
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 입고 번호로 입고 라벨 출력
     * 
     * @param rcvNo
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReceivingLabel(String rcvNo, String templateName, String printerId) {
        Long domainId = Domain.currentDomainId();
        Receiving condition = new Receiving();
        condition.setDomainId(domainId);
        condition.setRcvNo(rcvNo);
        Receiving receiving = this.queryManager.selectByCondition(Receiving.class, condition);
        if(receiving == null) {
            throw ThrowUtil.newNotFoundRecord("menu.Receiving", rcvNo);
        }
        
        return this.printReceivingLabel(receiving, templateName, printerId);
    }
    
    /**
     * 입고 정보로 입고 라벨 출력
     * 
     * @param receiving
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReceivingLabel(Receiving receiving, String templateName, String printerId) {
        if(ValueUtil.isEmpty(templateName)) {
            templateName = this.getRecevingLabelTemplateName(receiving, true);
        }
        
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultBarcodePrinter(receiving.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("receiving", receiving);
        PrintEvent event = new PrintEvent(receiving.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType("barcode");
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 입고 라인 Id로 입고 라벨 인쇄
     * 
     * @param receivingItemId
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReceivingItemLabel(String receivingItemId, String templateName, String printerId) {
        ReceivingItem receivingItem = this.queryManager.select(ReceivingItem.class, receivingItemId);
        if(receivingItem == null) {
            throw ThrowUtil.newNotFoundRecord("menu.ReceivingItem", receivingItemId);
        }
        
        return this.printReceivingItemLabel(receivingItem, templateName, printerId);
    }
    
    /**
     * 입고 라인 정보로 입고 라벨 인쇄
     * 
     * @param receivingItem
     * @param templateName
     * @param printerId
     * @return
     */
    public BaseResponse printReceivingItemLabel(ReceivingItem receivingItem, String templateName, String printerId) {
        if(ValueUtil.isEmpty(printerId)) {
            printerId = this.wmsBaseSvc.getDefaultBarcodePrinter(receivingItem.getDomainId());
        }
        
        Map<String, Object> templateParams = ValueUtil.newMap("receivingItem", receivingItem);
        PrintEvent event = new PrintEvent(receivingItem.getDomainId(), "WMS", printerId, templateName, templateParams);
        event.setPrintType("barcode");
        this.eventPublisher.publishEvent(event);
        return new BaseResponse(true, "ok");
    }
    
    /**
     * 입고 라벨 템플릿 이름 조회
     * 
     * @param ro
     * @param exceptionWhenEmpty
     * @return
     */
    public String getRecevingLabelTemplateName(Receiving rec, boolean exceptionWhenEmpty) {
        String templateName = this.runtimeConfSvc.getRuntimeConfigValue(rec.getComCd(), rec.getWhCd(), WmsStockConfigConstants.INV_BARCODE_LABEL_TEMPLATE);
        
        if(exceptionWhenEmpty && ValueUtil.isEmpty(templateName)) {
            throw new ElidomRuntimeException("입고 라벨 템플릿이 화주사-창고별 설정에 설정되지 않았습니다.");
        }
        
        return templateName;
    }
    
    /**
     * 입고지시서 템플릿 이름 조회
     *
     * @param rec
     * @param exceptionWhenEmpty
     * @return
     */
    public String getReceivingSheetTemplateName(Receiving rec, boolean exceptionWhenEmpty) {
        String templateName = this.runtimeConfSvc.getRuntimeConfigValue(rec.getComCd(), rec.getWhCd(), WmsInboundConfigConstants.RECEIPT_ORDER_SHEET_TEMPLATE);

        if(exceptionWhenEmpty && ValueUtil.isEmpty(templateName)) {
            throw new ElidomRuntimeException("입고지지서 템플릿이 화주사-창고별 설정에 설정되지 않았습니다.");
        }

        return templateName;
    }

    /********************************************************************************************************
     * 대 시 보 드   A P I
     ********************************************************************************************************/

    /**
     * 대시보드 - 입고 상태별 건수 조회
     *
     * @param comCd      화주사 코드 (optional)
     * @param whCd       창고 코드 (optional)
     * @param targetDate 기준일 (optional, 기본값: 오늘)
     * @return 상태별 건수 Map { status: count }
     */
    public Map<String, Object> getDashboardStatusCounts(String comCd, String whCd, String targetDate) {
        String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();

        String sql = "SELECT status, COUNT(*) as count " +
                "FROM receivings " +
                "WHERE domain_id = :domainId " +
                "AND rcv_req_date = :targetDate ";

        Map<String, Object> params = ValueUtil.newMap("domainId,targetDate", Domain.currentDomainId(), date);

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
            params.put("whCd", whCd);
        }

        sql += "GROUP BY status";

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
                sql, params, Map.class, 0, 0);

        // 결과를 Map으로 변환 (모든 상태 초기화)
        Map<String, Object> statusCounts = new java.util.HashMap<>();
        statusCounts.put("INWORK", 0);
        statusCounts.put("REQUEST", 0);
        statusCounts.put("READY", 0);
        statusCounts.put("START", 0);
        statusCounts.put("END", 0);
        statusCounts.put("CANCEL", 0);

        // 조회 결과를 Map에 반영
        for (Map<String, Object> row : results) {
            String status = (String) row.get("status");
            Object countObj = row.get("count");
            Integer count = countObj instanceof Long ? ((Long) countObj).intValue() : (Integer) countObj;
            statusCounts.put(status, count);
        }

        return statusCounts;
    }

    /**
     * 대시보드 - 입고 유형별 통계 조회
     *
     * @param comCd     화주사 코드 (optional)
     * @param whCd      창고 코드 (optional)
     * @param startDate 시작일 (optional, 기본값: 오늘)
     * @param endDate   종료일 (optional, 기본값: 오늘)
     * @return 유형별 건수 Map { rcvType: count }
     */
    public Map<String, Object> getDashboardTypeStats(String comCd, String whCd, String startDate, String endDate) {
        String start = ValueUtil.isNotEmpty(startDate) ? startDate : DateUtil.todayStr();
        String end = ValueUtil.isNotEmpty(endDate) ? endDate : DateUtil.todayStr();

        String sql = "SELECT rcv_type, COUNT(*) as count " +
                "FROM receivings " +
                "WHERE domain_id = :domainId " +
                "AND rcv_req_date >= :startDate " +
                "AND rcv_req_date <= :endDate " +
                "AND status != :cancelStatus ";

        Map<String, Object> params = ValueUtil.newMap("domainId,startDate,endDate,cancelStatus",
                Domain.currentDomainId(), start, end, WmsInboundConstants.STATUS_CANCEL);

        if (ValueUtil.isNotEmpty(comCd)) {
            sql += "AND com_cd = :comCd ";
            params.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql += "AND wh_cd = :whCd ";
            params.put("whCd", whCd);
        }

        sql += "GROUP BY rcv_type";

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
                sql, params, Map.class, 0, 0);

        // 결과를 Map으로 변환 (모든 유형 초기화)
        Map<String, Object> typeStats = new java.util.HashMap<>();
        typeStats.put("NORMAL", 0);
        typeStats.put("RETURN", 0);
        typeStats.put("ETC", 0);

        // 조회 결과를 Map에 반영
        for (Map<String, Object> row : results) {
            String rcvType = (String) row.get("rcv_type");
            Object countObj = row.get("count");
            Integer count = countObj instanceof Long ? ((Long) countObj).intValue() : (Integer) countObj;
            if (rcvType != null) {
                typeStats.put(rcvType, count);
            }
        }

        return typeStats;
    }

    /**
     * 대시보드 - 검수 현황 통계 조회
     *
     * @param comCd      화주사 코드 (optional)
     * @param whCd       창고 코드 (optional)
     * @param targetDate 기준일 (optional, 기본값: 오늘)
     * @return 검수 상태별 건수 Map { WAIT, PASS, FAIL }
     */
    public Map<String, Object> getDashboardInspectionStats(String comCd, String whCd, String targetDate) {
        String date = ValueUtil.isNotEmpty(targetDate) ? targetDate : DateUtil.todayStr();
        Long domainId = Domain.currentDomainId();

        Map<String, Object> inspectionStats = new java.util.HashMap<>();
        inspectionStats.put("WAIT", 0);
        inspectionStats.put("PASS", 0);
        inspectionStats.put("FAIL", 0);

        // 1. 검수 대기: inspFlag=true AND insp_qty IS NULL OR insp_qty = 0
        String sqlWait = "SELECT COUNT(DISTINCT ri.id) as count " +
                "FROM receiving_items ri " +
                "INNER JOIN receivings r ON ri.receiving_id = r.id " +
                "WHERE ri.domain_id = :domainId " +
                "AND r.rcv_req_date = :targetDate " +
                "AND r.insp_flag = true " +
                "AND (ri.insp_qty IS NULL OR ri.insp_qty = 0) ";

        Map<String, Object> paramsWait = ValueUtil.newMap("domainId,targetDate", domainId, date);

        if (ValueUtil.isNotEmpty(comCd)) {
            sqlWait += "AND r.com_cd = :comCd ";
            paramsWait.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sqlWait += "AND r.wh_cd = :whCd ";
            paramsWait.put("whCd", whCd);
        }

        Integer waitCount = this.queryManager.selectBySql(sqlWait, paramsWait, Integer.class);
        inspectionStats.put("WAIT", waitCount != null ? waitCount : 0);

        // 2. 검수 합격 (PASS)
        String sqlPass = "SELECT COUNT(DISTINCT ri.id) as count " +
                "FROM receiving_items ri " +
                "INNER JOIN receivings r ON ri.receiving_id = r.id " +
                "WHERE ri.domain_id = :domainId " +
                "AND r.rcv_req_date = :targetDate " +
                "AND ri.insp_qty IS NOT NULL " +
                "AND ri.insp_qty > 0 ";
        // 추후 insp_status 컬럼이 추가되면 AND ri.insp_status = 'PASS' 조건 추가

        Map<String, Object> paramsPass = ValueUtil.newMap("domainId,targetDate", domainId, date);

        if (ValueUtil.isNotEmpty(comCd)) {
            sqlPass += "AND r.com_cd = :comCd ";
            paramsPass.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sqlPass += "AND r.wh_cd = :whCd ";
            paramsPass.put("whCd", whCd);
        }

        Integer passCount = this.queryManager.selectBySql(sqlPass, paramsPass, Integer.class);
        inspectionStats.put("PASS", passCount != null ? passCount : 0);

        // 3. 검수 불량 (FAIL) - 추후 insp_status 컬럼이 추가되면 구현
        // 현재는 0으로 반환
        inspectionStats.put("FAIL", 0);

        return inspectionStats;
    }

    /**
     * 대시보드 - 알림 데이터 조회
     *
     * @param comCd 화주사 코드 (optional)
     * @param whCd  창고 코드 (optional)
     * @return 알림 목록 List<Map<String, Object>>
     */
    public List<Map<String, Object>> getDashboardAlerts(String comCd, String whCd) {
        List<Map<String, Object>> alerts = new java.util.ArrayList<>();
        Long domainId = Domain.currentDomainId();
        String today = DateUtil.todayStr();

        // 1. 지연 입고 알림: rcv_exp_date < today AND status != 'END' AND status != 'CANCEL'
        String sql1 = "SELECT COUNT(*) as count " +
                "FROM receivings " +
                "WHERE domain_id = :domainId " +
                "AND rcv_req_date < :today " +
                "AND status NOT IN (:completedStatuses) ";

        Map<String, Object> params1 = ValueUtil.newMap("domainId,today", domainId, today);
        params1.put("completedStatuses", java.util.Arrays.asList(
                WmsInboundConstants.STATUS_END,
                WmsInboundConstants.STATUS_CANCEL));

        if (ValueUtil.isNotEmpty(comCd)) {
            sql1 += "AND com_cd = :comCd ";
            params1.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql1 += "AND wh_cd = :whCd ";
            params1.put("whCd", whCd);
        }

        Integer delayedCount = this.queryManager.selectBySql(sql1, params1, Integer.class);
        if (delayedCount != null && delayedCount > 0) {
            Map<String, Object> alert = new java.util.HashMap<>();
            alert.put("type", "warning");
            alert.put("icon", "🚨");
            alert.put("message", "지연 입고: " + delayedCount + "건 (예정일 초과)");
            alerts.add(alert);
        }

        // 2. 검수 대기 긴급건: inspFlag=true AND insp_qty IS NULL
        String sql2 = "SELECT COUNT(DISTINCT ri.receiving_id) as count " +
                "FROM receiving_items ri " +
                "INNER JOIN receivings r ON ri.receiving_id = r.id " +
                "WHERE ri.domain_id = :domainId " +
                "AND r.insp_flag = true " +
                "AND r.rcv_req_date = :today " +
                "AND (ri.insp_qty IS NULL OR ri.insp_qty = 0) " +
                "AND r.status = :startStatus ";

        Map<String, Object> params2 = ValueUtil.newMap("domainId,today,startStatus",
                domainId, today, WmsInboundConstants.STATUS_START);

        if (ValueUtil.isNotEmpty(comCd)) {
            sql2 += "AND r.com_cd = :comCd ";
            params2.put("comCd", comCd);
        }
        if (ValueUtil.isNotEmpty(whCd)) {
            sql2 += "AND r.wh_cd = :whCd ";
            params2.put("whCd", whCd);
        }

        Integer inspWaitCount = this.queryManager.selectBySql(sql2, params2, Integer.class);
        if (inspWaitCount != null && inspWaitCount > 0) {
            Map<String, Object> alert = new java.util.HashMap<>();
            alert.put("type", "info");
            alert.put("icon", "⚠️");
            alert.put("message", "검수 대기 긴급건: " + inspWaitCount + "건");
            alerts.add(alert);
        }

        return alerts;
    }
}
