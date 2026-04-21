package operato.wms.inbound.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.entity.StoragePolicy;
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

        // 유통기한 자동 계산: 제조일이 있고 유통기한이 비어있는 경우 SKU의 prdExpiredPeriod 기반으로 계산
        if (ValueUtil.isNotEmpty(item.getPrdDate()) && ValueUtil.isEmpty(item.getExpiredDate())) {
            this.calculateExpiryDateForItem(receiving, item);
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
     * 입고 상세 라인 유통기한 자동 계산
     *
     * 제조일(prdDate)이 있고 유통기한(expiredDate)이 비어있을 때,
     * SKU 마스터의 prdExpiredPeriod(유통기한 일수)를 기반으로 자동 계산한다.
     * StoragePolicy의 expiryBlockDays와 비교하여 출고 차단 기준 위반 시 경고를 출력한다.
     *
     * @param receiving 입고 주문
     * @param item 입고 상세 라인
     */
    public void calculateExpiryDateForItem(Receiving receiving, ReceivingItem item) {
        SKU sku = this.queryManager.selectByCondition(SKU.class,
                new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));
        if (sku == null || sku.getPrdExpiredPeriod() == null) {
            return;
        }

        // 유통기한 = 제조일 + prdExpiredPeriod(일)
        String expiredDate = DateUtil.addDateToStr(
                DateUtil.parse(item.getPrdDate(), DateUtil.getDateFormat()),
                sku.getPrdExpiredPeriod());
        item.setExpiredDate(expiredDate);
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
    
    /**
     * 적치 추천 로케이션 조회
     *
     * StoragePolicy.putawayStrategy에 따라 SKU·화주사 조건에 맞는 로케이션을 추천한다.
     *
     * - FIXED : Location.skuCd가 해당 SKU로 지정된 STORAGE 로케이션
     * - ZONE  : SKU.tempType 과 Location.tempType 이 일치하는 STORAGE 로케이션 중 재고 없는 곳
     * - NEAREST : sortNo ASC 기준으로 가장 가까운 빈 STORAGE 로케이션
     * - RANDOM(기본) : 화주사 comCd 또는 미지정(null) 로케이션 중 재고 없는 빈 곳 (sortNo ASC)
     *
     * 공통 필터: del_flag=false, restrict_type IS NULL, loc_type='STORAGE'
     *
     * @param domainId 도메인 ID
     * @param comCd    화주사 코드
     * @param whCd     창고 코드
     * @param skuCd    SKU 코드
     * @param limit    추천 로케이션 최대 반환 수 (0이면 기본 5)
     * @return 추천 로케이션 목록
     */
    public List<Location> recommendPutawayLocations(Long domainId, String comCd, String whCd, String skuCd, int limit) {
        if (limit <= 0) {
            limit = 5;
        }

        // SKU 조회 (tempType, hazmatFlag 참조)
        SKU sku = this.queryManager.selectByCondition(SKU.class, new SKU(domainId, comCd, skuCd));

        // StoragePolicy 조회 (putawayStrategy 결정)
        StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(domainId, comCd, whCd);
        String strategy = (policy != null && ValueUtil.isNotEmpty(policy.getPutawayStrategy()))
                ? policy.getPutawayStrategy() : StoragePolicy.PUTAWAY_STRATEGY_RANDOM;

        // 공통 서브쿼리: 재고가 있는 로케이션 목록
        String occupiedSubSql = "SELECT DISTINCT loc_cd FROM inventories"
                + " WHERE domain_id = :domainId AND wh_cd = :whCd"
                + " AND (del_flag IS NULL OR del_flag = false) AND inv_qty > 0";

        String baseSql = "SELECT * FROM locations"
                + " WHERE domain_id = :domainId AND wh_cd = :whCd"
                + " AND loc_type = 'STORAGE'"
                + " AND (del_flag IS NULL OR del_flag = false)"
                + " AND (restrict_type IS NULL OR restrict_type = '')";

        Map<String, Object> params = ValueUtil.newMap("domainId,whCd,limit", domainId, whCd, limit);
        String sql;

        if (StoragePolicy.PUTAWAY_STRATEGY_FIXED.equals(strategy)) {
            // FIXED: Location.skuCd가 해당 SKU로 지정된 로케이션
            sql = baseSql
                    + " AND sku_cd = :skuCd"
                    + " ORDER BY sort_no ASC NULLS LAST"
                    + " LIMIT :limit";
            params.put("skuCd", skuCd);

        } else if (StoragePolicy.PUTAWAY_STRATEGY_ZONE.equals(strategy)) {
            // ZONE: SKU.tempType과 Location.tempType 일치, 재고 없는 빈 로케이션
            String tempType = (sku != null) ? sku.getTempType() : null;
            sql = baseSql
                    + " AND loc_cd NOT IN (" + occupiedSubSql + ")"
                    + (ValueUtil.isNotEmpty(tempType)
                            ? " AND temp_type = :tempType"
                            : " AND (temp_type IS NULL OR temp_type = '')")
                    + " ORDER BY sort_no ASC NULLS LAST"
                    + " LIMIT :limit";
            if (ValueUtil.isNotEmpty(tempType)) {
                params.put("tempType", tempType);
            }

        } else if (StoragePolicy.PUTAWAY_STRATEGY_NEAREST.equals(strategy)) {
            // NEAREST: sortNo ASC 기준 가장 가까운 빈 로케이션
            sql = baseSql
                    + " AND loc_cd NOT IN (" + occupiedSubSql + ")"
                    + " ORDER BY sort_no ASC NULLS LAST"
                    + " LIMIT :limit";

        } else {
            // RANDOM(기본): 화주사 전용 또는 공용(com_cd IS NULL) 빈 로케이션
            sql = baseSql
                    + " AND loc_cd NOT IN (" + occupiedSubSql + ")"
                    + " AND (com_cd = :comCd OR com_cd IS NULL OR com_cd = '')"
                    + " ORDER BY sort_no ASC NULLS LAST"
                    + " LIMIT :limit";
            params.put("comCd", comCd);
        }

        return this.queryManager.selectListBySql(sql, params, Location.class, 0, 0);
    }

    /**
     * 적치 작업 화면 - 완료 항목 조회 (rcv_no 기준, inventories status = STORED)
     *
     * @param domainId
     * @param rcvNo    입고 지시 번호
     * @return status = 'STORED' 인 재고 목록
     */
    public List<Inventory> getPutawayDoneItems(Long domainId, String rcvNo) {
        Query queryObj = AnyOrmUtil.newConditionForExecution(domainId);
        queryObj.addFilter("rcvNo", rcvNo);
        queryObj.addFilter("status", Inventory.STATUS_STORED);
        queryObj.addFilter("delFlag", false);
        queryObj.addOrder("rcvSeq", true);
        return this.queryManager.selectList(Inventory.class, queryObj);
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
}
