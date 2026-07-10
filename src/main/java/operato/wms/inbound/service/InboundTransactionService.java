package operato.wms.inbound.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import operato.wms.base.entity.StoragePolicy;
import operato.wms.base.entity.Warehouse;
import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.inbound.WmsInboundConstants;
import operato.wms.inbound.entity.ImportReceivingOrder;
import operato.wms.inbound.entity.Receiving;
import operato.wms.inbound.entity.ReceivingItem;
import operato.wms.inbound.entity.SupplierShipment;
import operato.wms.inbound.query.store.InboundQueryStore;
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
import xyz.elidom.util.BeanUtil;
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
     * 입고 예정 트랜잭션 : 작성 or 업로드 -> 요청 -> 확정 -> 입고 작업 -> 입고 완료
     * 입고 예정 상태 : (INWORK) 작성 중 -> (REQUEST) 요청 -> (READY) 대기 -> (RUNNING) 진행 중 ->
     * (END) 완료
     ********************************************************************************************************/

    /**
     * 입고 예정 정보 임포트
     * 
     * @param list
     * @return
     */
    public Receiving importReleaseOrders(List<ImportReceivingOrder> list) {
        Long domainId = Domain.currentDomainId();
        ICustomService custSvc = BeanUtil.get(ICustomService.class);

        // 엑셀의 각 행을 독립적인 입고주문(마스터 1 + 상세 1)으로 생성한다.
        // 입고번호(입고요청번호)는 행마다 diy-generate-rcv-req-no 로 자동 채번하여 고유하게 부여한다.
        Receiving firstRo = null;

        for (ImportReceivingOrder order : list) {
            if (ValueUtil.isEmpty(order.getSkuCd()))
                continue;

            if (order.getRcvExpQty() != null && order.getRcvExpQty() <= 0) {
                throw new ElidomRuntimeException("SKU [" + order.getSkuCd() + "]의 예정수량은 0보다 커야 합니다.");
            }

            // 요청일이 없다면 오늘 날짜로 입력
            if (ValueUtil.isEmpty(order.getRcvExpDate())) {
                order.setRcvExpDate(DateUtil.todayStr());
            }
            // 요청 유형이 없다면 일반 입고
            if (ValueUtil.isEmpty(order.getRcvType())) {
                order.setRcvType(WmsInboundConstants.RECEIVING_TYPE_NORMAL);
            }

            // 행마다 고유 입고번호 자동 채번
            String rcvNo = ValueUtil.toString(
                    custSvc.doCustomService(domainId, "diy-generate-rcv-req-no", new HashMap<String, Object>()));

            // 입고 예정 마스터 생성 (행별 1건)
            Receiving ro = ValueUtil.populate(order, new Receiving());
            ro.setRcvNo(rcvNo);
            ro.setRcvReqNo(rcvNo);
            this.queryManager.insert(ro);

            // 입고 상세 정보 생성 (행별 1건)
            ReceivingItem ri = ValueUtil.populate(order, new ReceivingItem());
            ri.setReceivingId(ro.getId());
            ri.setRcvExpSeq(1);
            if (ValueUtil.isEmpty(ri.getRcvExpDate())) {
                ri.setRcvExpDate(ro.getRcvReqDate());
            }
            ri.setRemarks(order.getItemRemarks());
            ri.setCreatedAt(null);
            ri.setUpdatedAt(null);
            this.queryManager.insert(ri);

            if (firstRo == null) {
                firstRo = ro;
            }
        }

        // 후처리 커스텀 서비스 호환을 위해 대표(첫) 입고주문을 리턴
        return firstRo;
    }

    /**
     * 입고 예정 정보 생성 - 입고 항목 1건으로만 생성하는 케이스
     * 
     * @param order
     * @return
     */
    public Receiving createSingleReceivingOrder(ImportReceivingOrder order) {
        // 1. 필수 컬럼 체크 - 창고
        if (ValueUtil.isEmpty(order.getWhCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("창고 코드가 없습니다.");
        }

        // 2. 필수 컬럼 체크 - 화주사
        if (ValueUtil.isEmpty(order.getComCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("화주사 코드가 없습니다.");
        }

        // 3. 필수 컬럼 체크 - 공급처
        if (ValueUtil.isEmpty(order.getVendCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("공급처 코드가 없습니다.");
        }

        // 4. 필수 컬럼 체크 - 상품
        if (ValueUtil.isEmpty(order.getSkuCd())) {
            throw ThrowUtil.newValidationErrorWithNoLog("상품 코드가 없습니다.");
        }

        // 5. 필수 컬럼 체크 - 입고예정일
        if (ValueUtil.isEmpty(order.getRcvReqDate())) {
            throw ThrowUtil.newValidationErrorWithNoLog("입고예정일이 없습니다.");
        }

        // 6. 필수 컬럼 체크 - 입고예정수량
        if (ValueUtil.isEmpty(order.getRcvExpQty()) || order.getRcvExpQty() <= 0) {
            throw ThrowUtil.newValidationErrorWithNoLog("입고예정수량이 없습니다.");
        }

        // 7. 상품 조회
        SKU sku = this.queryManager.selectByCondition(SKU.class,
                ValueUtil.newMap("domainId,skuCd,comCd", Domain.currentDomainId(), order.getSkuCd(), order.getComCd()));

        // 8. 상품 존재여부 체크
        if (ValueUtil.isEmpty(sku)) {
            throw ThrowUtil.newValidationErrorWithNoLog("상품 정보가 존재하지 않습니다.");
        }

        // 9. 입고 지시 마스터 설정
        Receiving receiving = ValueUtil.populate(order, new Receiving());

        // 10. 요청일이 없다면 오늘 날짜로 입력
        if (ValueUtil.isEmpty(order.getRcvExpDate())) {
            receiving.setRcvReqDate(DateUtil.todayStr());
        }

        // 11. 요청 유형이 없다면 일반 입고
        if (ValueUtil.isEmpty(order.getRcvType())) {
            order.setRcvType(WmsInboundConstants.RECEIVING_TYPE_NORMAL);
        }

        // 12. 입고 지시 마스터 생성
        this.queryManager.insert(receiving);

        // 13. 입고 상세 정보 생성 (행별 1건)
        ReceivingItem item = ValueUtil.populate(order, new ReceivingItem());
        item.setReceivingId(receiving.getId());
        item.setRcvExpSeq(1);
        if (ValueUtil.isEmpty(item.getRcvExpDate())) {
            item.setRcvExpDate(receiving.getRcvReqDate());
        }
        item.setSkuNm(sku.getSkuNm());
        item.setExpPalletQty(sku.getPltInQty());
        item.setExpBoxQty(sku.getBoxInQty());
        item.setRemarks(order.getItemRemarks());
        this.queryManager.insert(item);

        // 14. 생성된 입고 지시 리턴
        return receiving;
    }

    /**
     * 공급처 입고예정(ASN) 목록으로부터 입고주문 일괄 생성
     *
     * "입고예정 접수 현황" 화면에서 멀티셀렉한 공급처 입고예정 행마다 입고주문(Receiving) 1건 +
     * 입고상세(ReceivingItem) 1건을 생성한다. 이미 유효한(취소되지 않은) 입고주문이 연결된 행은
     * 스킵하고, 연결된 입고주문이 없거나 취소(CANCEL)된 경우에는 재생성한다.
     * 생성 시 supplier_shipment.barcode 를 그대로 receiving_item.barcode 로 전달하여 골든스레드를 유지한다.
     *
     * @param domainId    도메인 ID
     * @param shipmentIds 선택된 공급처 입고예정 ID 목록
     * @return 처리 결과 (created, skipped, details)
     */
    public Map<String, Object> createReceivingOrdersFromShipments(Long domainId, List<String> shipmentIds) {
        int created = 0;
        int skipped = 0;
        List<Map<String, Object>> details = new ArrayList<>();

        for (String ssId : shipmentIds) {
            if (ValueUtil.isEmpty(ssId)) {
                continue;
            }

            // 1. 공급처 입고예정 조회 (도메인 필수)
            SupplierShipment ss = this.queryManager.selectByCondition(SupplierShipment.class,
                    ValueUtil.newMap("domainId,id", domainId, ssId));
            if (ss == null) {
                skipped++;
                details.add(ValueUtil.newMap("id,result,message", ssId, "SKIP", "공급처 입고예정을 찾을 수 없습니다."));
                continue;
            }

            // 2. 재생성 가능 여부 판단 - 연결된 입고주문 상태 확인 (취소되지 않은 오더가 있으면 스킵)
            if (ValueUtil.isNotEmpty(ss.getRcvNo())) {
                Receiving exist = this.queryManager.selectByCondition(Receiving.class,
                        ValueUtil.newMap("domainId,rcvNo,comCd", domainId, ss.getRcvNo(), ss.getComCd()));
                if (exist != null && ValueUtil.isNotEqual(exist.getStatus(), WmsInboundConstants.STATUS_CANCEL)) {
                    skipped++;
                    details.add(ValueUtil.newMap("id,asn_no,result,message", ssId, ss.getAsnNo(), "SKIP",
                            "이미 입고주문[" + ss.getRcvNo() + "]이 존재합니다."));
                    continue;
                }
            }

            // 3. 입고주문(Receiving) 생성 - rcv_no는 beforeCreate에서 자동 채번, status는 INWORK
            Receiving receiving = new Receiving();
            receiving.setWhCd(ss.getWhCd());
            receiving.setComCd(ss.getComCd());
            receiving.setVendCd(ss.getVendCd());
            // 입고유형: 일반입고 공통코드 값 "1" (RECEIVING_TYPE_NORMAL 상수는 "NORMAL"이 아님에 주의)
            receiving.setRcvType("1");
            receiving.setRcvReqDate(ValueUtil.isNotEmpty(ss.getEta()) ? ss.getEta() : DateUtil.todayStr());
            this.queryManager.insert(receiving);

            // 4. 입고상세(ReceivingItem) 생성 - 골든스레드 barcode 그대로 전달
            ReceivingItem item = new ReceivingItem();
            item.setReceivingId(receiving.getId());
            item.setRcvExpSeq(1);
            item.setSkuCd(ss.getSkuCd());
            item.setSkuNm(ss.getSkuNm());
            item.setRcvExpDate(receiving.getRcvReqDate());
            double qty = (ss.getExpQty() == null) ? 0.0 : ss.getExpQty().doubleValue();
            item.setTotalExpQty(qty);
            item.setRcvExpQty(qty);
            item.setBarcode(ss.getBarcode());
            item.setLotNo(ss.getLotNo());
            item.setExpiredDate(ss.getExpiredDate());
            item.setLocCd(ss.getLocCd());
            this.queryManager.insert(item);

            // 5. 공급처 입고예정 갱신 - 오더 생성 표시 (order_flag/rcv_no/ordered_at)
            ss.setOrderFlag(Boolean.TRUE);
            ss.setRcvNo(receiving.getRcvNo());
            ss.setOrderedAt(new Date());
            this.queryManager.update(ss, "orderFlag", "rcvNo", "orderedAt");

            created++;
            details.add(ValueUtil.newMap("id,asn_no,result,rcv_no", ssId, ss.getAsnNo(), "CREATED",
                    receiving.getRcvNo()));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("details", details);
        return result;
    }

    /**
     * 입고 예정 정보 요청 처리 (상태 : INWORK -> REQUEST)
     * 
     * @param receiving
     * @return
     */
    public Receiving requestReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_INWORK)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_INWORK);
        }

        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class,
                ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));
        if (ValueUtil.isEmpty(receivingItems)) {
            throw new ElidomRuntimeException("입고 예정 상세 정보가 존재하지 않습니다.");
        }

        // 3. 품목 및 수량 체크
        for (ReceivingItem item : receivingItems) {
            if (item.getTotalExpQty() == null || item.getTotalExpQty() == 0) {
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
     * 입고 예정 정보 요청 취소 처리 (상태 : REQUEST -> INWORK)
     *
     * @param receiving
     * @return
     */
    public Receiving cancelRequestReceivingOrder(Receiving receiving) {
        // 1. 상태 체크 (입고요청 상태만 허용)
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_REQUEST)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_REQUEST);
        }

        // 2. 입고 예정 상태 변경
        receiving.setStatus(WmsInboundConstants.STATUS_INWORK);
        this.queryManager.update(receiving, "status", "updatedAt");

        // 3. 입고 상세 상태 변경
        String sql = this.inQueryStore.getUpdateReceivingOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,receivingId,status", receiving.getDomainId(),
                receiving.getId(), WmsInboundConstants.STATUS_INWORK));

        // 4. 입고 예정 리턴
        return receiving;
    }

    /**
     * 입고 주문 취소 처리 (상태 : INWORK -> CANCEL)
     *
     * @param receiving
     * @return
     */
    public Receiving cancelReceivingOrder(Receiving receiving) {
        // 1. 상태 체크 (작성중 상태만 허용)
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_INWORK)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_INWORK);
        }

        // 2. 입고 예정 상태 변경
        receiving.setStatus(WmsInboundConstants.STATUS_CANCEL);
        this.queryManager.update(receiving, "status", "updatedAt");

        // 3. 입고 상세 상태 변경
        String sql = this.inQueryStore.getUpdateReceivingOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,receivingId,status", receiving.getDomainId(),
                receiving.getId(), WmsInboundConstants.STATUS_CANCEL));

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
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_REQUEST)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_REQUEST);
        }

        // 2. 입고번호가 없다면 입고 예정번호와 동일하게 처리
        if (ValueUtil.isEmpty(receiving.getRcvNo())) {
            receiving.setRcvNo(receiving.getRcvReqNo());
        }

        // 3. 입고 예정 상태 변경
        receiving.setStatus(WmsInboundConstants.STATUS_READY);
        this.queryManager.update(receiving, "rcvNo", "status", "updatedAt");

        // 4. 입고 상세 상태 변경
        String sql = this.inQueryStore.getUpdateReceivingOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,receivingId,status", receiving.getDomainId(),
                receiving.getId(), WmsInboundConstants.STATUS_READY));

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
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_READY)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_READY);
        }

        // 2. 입고 예정 상태 변경
        receiving.setStatus(WmsInboundConstants.STATUS_REQUEST);
        this.queryManager.update(receiving, "status", "updatedAt");

        // 3. 입고 상세 상태 변경
        String sql = this.inQueryStore.getUpdateReceivingOrderItems();
        this.queryManager.executeBySql(sql, ValueUtil.newMap("domainId,receivingId,status", receiving.getDomainId(),
                receiving.getId(), WmsInboundConstants.STATUS_REQUEST));

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
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_READY)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_READY);
        }

        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class,
                ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));

        // 3. 품목 및 수량 체크
        for (ReceivingItem item : receivingItems) {
            item.setStatus(WmsInboundConstants.STATUS_START);
        }

        // W23-FL-5: 창고 팔레트 수용 용량 사전 경고
        int planPalletCnt = receivingItems.stream()
                .mapToInt(item -> item.getExpPalletQty() != null ? item.getExpPalletQty() : 0)
                .sum();
        String capacityWarning = this.checkWarehousePalletCapacity(
                receiving.getDomainId(), receiving.getWhCd(), planPalletCnt);
        if (capacityWarning != null) {
            // 경고가 있으면 id=null + remarks에 경고 문구를 담아 반환 (입고 진행은 계속)
            Receiving warning = new Receiving();
            warning.setId(null);
            warning.setRemarks(capacityWarning);
            return warning;
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
     * W23-FL-5: 창고 팔레트 수용 용량 초과 여부 사전 경고
     *
     * Warehouse.maxPalletCnt가 설정된 경우, 현재 보관 중인 팔레트 수에
     * 추가 입고 팔레트 수를 합산하여 초과 여부를 확인한다.
     * 초과 시 경고 문자열 반환, 정상이거나 maxPalletCnt 미설정이면 null 반환.
     *
     * @param domainId     도메인 ID
     * @param whCd         창고 코드
     * @param addPalletCnt 추가 입고 예정 팔레트 수
     * @return 경고 문자열 (초과 시), null (정상 시)
     */
    public String checkWarehousePalletCapacity(Long domainId, String whCd, int addPalletCnt) {
        Warehouse wh = this.wmsBaseSvc.findWarehouse(whCd, false, false);
        if (wh == null || wh.getMaxPalletCnt() == null || wh.getMaxPalletCnt() <= 0) {
            return null;
        }

        String sql = "SELECT COALESCE(SUM(pallet_qty), 0) FROM inventories"
                + " WHERE domain_id = :domainId AND wh_cd = :whCd"
                + " AND (del_flag IS NULL OR del_flag = false) AND inv_qty > 0";
        Integer currentCnt = this.queryManager.selectBySql(sql,
                ValueUtil.newMap("domainId,whCd", domainId, whCd), Integer.class);
        if (currentCnt == null)
            currentCnt = 0;

        int totalCnt = currentCnt + addPalletCnt;
        if (totalCnt > wh.getMaxPalletCnt()) {
            return "창고 [" + whCd + "] 수용 용량 초과: 현재 " + currentCnt
                    + "개 + 입고 예정 " + addPalletCnt + "개 = " + totalCnt
                    + "개 (최대 " + wh.getMaxPalletCnt() + "개)";
        }
        return null;
    }

    /**
     * 입고 정보 작업 시작 취소 (상태 : START -> READY)
     * 
     * @param receiving
     * @return
     */
    public Receiving cancelStartReceivingOrder(Receiving receiving) {
        // 1. 상태 체크
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_START);
        }

        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class,
                ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));

        // 3. 작업 정보 초기화
        this.cancelFinishReceivingOrderLines(receiving, receivingItems);

        // 4. 품목 및 수량 체크
        for (ReceivingItem item : receivingItems) {
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
    public List<ReceivingItem> finishReceivingOrderLines(Receiving receiving, List<ReceivingItem> list,
            String printerId) {
        List<ReceivingItem> listToFinish = new ArrayList<ReceivingItem>();

        for (ReceivingItem item : list) {
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

        if (item.getRcvQty() == null || item.getRcvQty() <= 0) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 입고 수량이 0보다 커야 합니다.");
        }

        // 초과 입고(오버수량) 허용 — 현장에서 예정수량보다 많이 입고되는 경우가 있어 예정수량 초과 검증을 제거함

        if (receiving.getInspFlag()) {
            if (ValueUtil.isEmpty(item.getItemType())) {
                throw new ElidomRuntimeException("검수 결과 정보가 없습니다.");
            } else if (ValueUtil.isNotEqual(item.getItemType(), WmsInboundConstants.INSP_STATUS_PASS)) {
                throw new ElidomRuntimeException("검수 결과가 패스가 아닙니다.");
            }

            if (item.getInspQty() == 0 || item.getInspQty() < item.getRcvQty()) {
                throw new ElidomRuntimeException("검수 수량이 입고 수량보다 작습니다.");
            }
        }

        // 상품 조회
        SKU sku = this.queryManager.selectByCondition(SKU.class,
                new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));

        // lotFlag에 따른 필수 입력 검증
        if (sku != null && Boolean.TRUE.equals(sku.getLotFlag()) && ValueUtil.isEmpty(item.getLotNo())) {
            throw new ElidomRuntimeException("SKU [" + item.getSkuCd() + "]는 로트 추적 대상입니다. 로트 번호를 입력하세요.");
        }

        // serialFlag에 따른 필수 입력 검증
        if (sku != null && Boolean.TRUE.equals(sku.getSerialFlag()) && ValueUtil.isEmpty(item.getSerialNo())) {
            throw new ElidomRuntimeException("SKU [" + item.getSkuCd() + "]는 시리얼 추적 대상입니다. 시리얼 번호를 입력하세요.");
        }

        // 예정 수량과 입고 수량이 다르면 자동 분할 처리
        double splitQty = item.getRcvExpQty() - item.getRcvQty();
        if (splitQty > 0) {
            // 분할 처리
            item.split(splitQty, false, true);
        }

        // 유통기한 자동 계산: 제조일이 있고 유통기한이 비어있는 경우 SKU의 prdExpiredPeriod 기반으로 계산
        if (ValueUtil.isNotEmpty(item.getPrdDate()) && ValueUtil.isEmpty(item.getExpiredDate())) {
            this.calculateExpiryDateForItem(receiving, item, sku);
        }

        item.setRcvDate(DateUtil.todayStr());
        item.setStatus(WmsInboundConstants.STATUS_END);

        // 입고 항목별 완료 처리
        if (ValueUtil.isEmpty(item.getBarcode())) {
            // 재고 바코드 생성 & 재고 생성
            item.setBarcode(Inventory.newBarcode());
            this.createInventoryByItem(receiving, item);
        }

        // 아이템 리턴
        return item;
    }

    /**
     * 입고 라인 완료 처리 (v2 — 공급처 라벨 재고바코드 기반)
     *
     * 기존 {@link #finishReceivingOrderLine} 과 동일한 검증·분할·유통기한 로직을 수행하되,
     * item.barcode 에 공급처 라벨의 재고바코드가 주입돼 있으면 그 값을 그대로 재고(inventories.barcode)에
     * 사용한다(골든 스레드). barcode 가 비어 있으면 기존과 동일하게 새로 채번하며, 재고 생성은 항상 수행한다.
     *
     * @param receiving
     * @param item
     * @param printerId
     * @return
     */
    public ReceivingItem finishReceivingOrderLineByBarcode(Receiving receiving, ReceivingItem item, String printerId) {
        // 상태 체크
        if (ValueUtil.isNotEqual(item.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 작업 중인 상태가 아닙니다.");
        }

        if (item.getRcvQty() == null || item.getRcvQty() <= 0) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 입고 수량이 0보다 커야 합니다.");
        }

        if (receiving.getInspFlag()) {
            if (ValueUtil.isEmpty(item.getItemType())) {
                throw new ElidomRuntimeException("검수 결과 정보가 없습니다.");
            } else if (ValueUtil.isNotEqual(item.getItemType(), WmsInboundConstants.INSP_STATUS_PASS)) {
                throw new ElidomRuntimeException("검수 결과가 패스가 아닙니다.");
            }
            if (item.getInspQty() == 0 || item.getInspQty() < item.getRcvQty()) {
                throw new ElidomRuntimeException("검수 수량이 입고 수량보다 작습니다.");
            }
        }

        // 상품 조회
        SKU sku = this.queryManager.selectByCondition(SKU.class,
                new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));

        // lotFlag / serialFlag 필수 입력 검증
        if (sku != null && Boolean.TRUE.equals(sku.getLotFlag()) && ValueUtil.isEmpty(item.getLotNo())) {
            throw new ElidomRuntimeException("SKU [" + item.getSkuCd() + "]는 로트 추적 대상입니다. 로트 번호를 입력하세요.");
        }
        if (sku != null && Boolean.TRUE.equals(sku.getSerialFlag()) && ValueUtil.isEmpty(item.getSerialNo())) {
            throw new ElidomRuntimeException("SKU [" + item.getSkuCd() + "]는 시리얼 추적 대상입니다. 시리얼 번호를 입력하세요.");
        }

        // 예정 수량과 입고 수량이 다르면 자동 분할 처리
        double splitQty = item.getRcvExpQty() - item.getRcvQty();
        if (splitQty > 0) {
            // v2: 주입된 재고바코드가 잔여(미입고) 분할 라인으로 복사되지 않도록,
            //     분할 동안만 바코드를 비웠다가 입고분에 복원한다. (분할 라인은 다음 입고 시 별도 라벨 사용)
            String keepBarcode = item.getBarcode();
            item.setBarcode(null);
            item.split(splitQty, false, true);
            item.setBarcode(keepBarcode);
        }

        // 유통기한 자동 계산
        if (ValueUtil.isNotEmpty(item.getPrdDate()) && ValueUtil.isEmpty(item.getExpiredDate())) {
            this.calculateExpiryDateForItem(receiving, item, sku);
        }

        item.setRcvDate(DateUtil.todayStr());
        item.setStatus(WmsInboundConstants.STATUS_END);

        // 입고 항목별 완료 처리 (v2)
        // 공급처 라벨 재고바코드가 주입돼 있으면 그대로 사용(골든 스레드), 없으면 채번. 재고는 항상 생성한다.
        if (ValueUtil.isEmpty(item.getBarcode())) {
            item.setBarcode(Inventory.newBarcode());
        }
        this.createInventoryByItem(receiving, item);

        return item;
    }

    /**
     * 입고 상세 라인 불량 처리
     * 
     * @param receiving
     * @param item
     * @param printerId
     * @return
     */
    public ReceivingItem defectReceivingOrderLine(Receiving receiving, ReceivingItem item, String printerId) {
        // 상태 체크
        if (ValueUtil.isNotEqual(item.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 작업 중인 상태가 아닙니다.");
        }

        if (item.getRcvQty() == null || item.getRcvQty() <= 0) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 입고 수량이 0보다 커야 합니다.");
        }

        if (item.getRcvQty() > item.getRcvExpQty()) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 입고 수량이 입고 예정수량보다 큽니다.");
        }

        // 입고 지시 검수 필수인 경우 검수 여부 체크
        if (receiving.getInspFlag()) {
            if (ValueUtil.isEmpty(item.getItemType())) {
                throw new ElidomRuntimeException("검수 결과 정보가 없습니다.");
            } else if (ValueUtil.isNotEqual(item.getItemType(), WmsInboundConstants.INSP_STATUS_PASS)) {
                throw new ElidomRuntimeException("검수 결과가 패스가 아닙니다.");
            }

            if (item.getInspQty() == 0 || item.getInspQty() < item.getRcvQty()) {
                throw new ElidomRuntimeException("검수 수량이 입고 수량보다 작습니다.");
            }
        }

        // 상품 조회
        SKU sku = this.queryManager.selectByCondition(SKU.class,
                new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));

        // lotFlag에 따른 필수 입력 검증
        if (sku != null && Boolean.TRUE.equals(sku.getLotFlag()) && ValueUtil.isEmpty(item.getLotNo())) {
            throw new ElidomRuntimeException("SKU [" + item.getSkuCd() + "]는 로트 추적 대상입니다. 로트 번호를 입력하세요.");
        }

        // serialFlag에 따른 필수 입력 검증
        if (sku != null && Boolean.TRUE.equals(sku.getSerialFlag()) && ValueUtil.isEmpty(item.getSerialNo())) {
            throw new ElidomRuntimeException("SKU [" + item.getSkuCd() + "]는 시리얼 추적 대상입니다. 시리얼 번호를 입력하세요.");
        }

        // 예정 수량과 입고 수량이 다르면 자동 분할 처리
        double splitQty = item.getRcvExpQty() - item.getRcvQty();
        if (splitQty > 0) {
            item.split(splitQty, false, true);
        }

        // 메인 입고 항목에 불량 정보 설정 - 불량 처리 로직
        item.setStatus(WmsInboundConstants.STATUS_BAD);
        item.setRcvDate(DateUtil.todayStr());
        if (ValueUtil.isEmpty(item.getBarcode())) {
            item.setBarcode(Inventory.newBarcode());
        }
        this.queryManager.update(item);

        // 불량 재고 생성 후 불량 로케이션 이동 처리
        this.processRejectedReceivingItem(receiving, item);

        // 아이템 리턴
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
     * @param item      입고 상세 라인
     * @param sku       SKU 정보
     */
    public void calculateExpiryDateForItem(Receiving receiving, ReceivingItem item, SKU sku) {
        if (sku == null) {
            sku = this.queryManager.selectByCondition(SKU.class,
                    new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));
        }

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
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_START);
        }

        // 2. 상세 품목 조회
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class,
                ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));
        String rcvDate = ValueUtil.isEmpty(receiving.getRcvEndDate()) ? DateUtil.todayStr() : receiving.getRcvEndDate();

        // 3. 품목 및 수량 체크
        for (ReceivingItem item : receivingItems) {
            if (ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_REJECTED)
                    || ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_BAD)
                    || ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_SHORT)
                    || ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_CANCEL)) {
                // 반려/취소/불량/미입고된 아이템은 상태 유지
                continue;
            }
            if (item.getRcvExpQty() <= item.getRcvQty()) {
                item.setStatus(WmsInboundConstants.STATUS_END);
                item.setRcvDate(rcvDate);
            } else {
                // 예정수량보다 적게 입고된(부족) 라인은 마감 시 미입고(SHORT)로 종결한다.
                // (현장: 예정 1000개 중 900개만 입고되고 100개는 들어오지 않는 under 입고 케이스)
                item.setStatus(WmsInboundConstants.STATUS_SHORT);
            }
        }

        // 4. 디테일에 불량(BAD)/미입고(SHORT) 유형이 하나라도 있는지 집계 (마스터 플래그 반영용)
        boolean hasDefect = false;
        boolean hasShort = false;
        for (ReceivingItem item : receivingItems) {
            if (ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_BAD)) {
                hasDefect = true;
            } else if (ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_SHORT)) {
                hasShort = true;
            }
        }

        // 5. 입고 예정 상태 변경 + 불량/미입고 존재 플래그 반영
        receiving.setStatus(WmsInboundConstants.STATUS_END);
        receiving.setRcvEndDate(rcvDate);
        receiving.setDefectFlag(hasDefect);
        receiving.setShortFlag(hasShort);
        this.queryManager.update(receiving, "status", "rcvEndDate", "defectFlag", "shortFlag", "updatedAt");

        // 6. 입고 상세 상태 변경
        this.queryManager.updateBatch(receivingItems, "status", "rcvDate", "updatedAt");

        // 7. 재고 정보 생성
        // 2026-06-26 수정 : 재고 생성 시점을 입고 항목 완료 시점으로 변경
        // this.createInventoriesByReceivingOrder(receiving, receivingItems);

        // 8. 입고 정보 리턴
        return receiving;
    }

    /**
     * 입고 주문 검수 승인 처리 (상태 : END -> APPROVED)
     * 화주사가 입고 완료된 주문을 검수 후 승인하는 처리
     *
     * @param receiving
     * @return
     */
    public Receiving approveReceivingOrder(Receiving receiving) {
        // 1. 상태 체크 (입고 완료(END) 상태에서만 승인 가능)
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_END)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_END);
        }

        // 2. 입고 주문 상태 변경 (END -> APPROVED)
        receiving.setStatus(WmsInboundConstants.STATUS_APPROVED);
        this.queryManager.update(receiving, "status", "updatedAt");

        // 3. 상세 품목 상태도 동일하게 변경
        List<ReceivingItem> receivingItems = this.queryManager.selectList(ReceivingItem.class,
                ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));

        for (ReceivingItem item : receivingItems) {
            // 반려(REJECTED)·불량(BAD)·미입고(SHORT) 아이템은 상태 유지 (검수 승인 대상에서 제외)
            if (ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_REJECTED)
                    || ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_BAD)
                    || ValueUtil.isEqual(item.getStatus(), WmsInboundConstants.STATUS_SHORT)) {
                continue;
            }
            item.setStatus(WmsInboundConstants.STATUS_APPROVED);
        }
        this.queryManager.updateBatch(receivingItems, "status", "updatedAt");

        // 4. 입고 정보 리턴
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

        for (ReceivingItem item : list) {
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
        if (ValueUtil.isNotEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw ThrowUtil.newInvalidStatus("terms.menu.receiving-plan", receiving.getRcvReqNo(),
                    WmsInboundConstants.STATUS_START);
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
            if (ValueUtil.isNotEqual(item.getId(), workItem.getId())) {
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
     * 입고 작업 항목 별로 재고 생성
     * 
     * @param receiving
     * @param item
     * @return
     */
    public Inventory createInventoryByItem(Receiving receiving, ReceivingItem item) {
        // 1. 기본 로케이션 설정에서 조회
        StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(receiving.getDomainId(), receiving.getComCd(),
                receiving.getWhCd());
        String defaultLocCd = policy.getDefaultWaitLoc();
        String status = item.getStatus();

        // 2. 상태 체크 : END, BAD인 경우에만 재고 생성 가능
        if (ValueUtil.isNotEqual(status, WmsInboundConstants.STATUS_END)
                && ValueUtil.isNotEqual(status, WmsInboundConstants.STATUS_BAD)) {
            throw new ElidomRuntimeException("입고 항목의 작업이 끝나지 않았습니다.");
        }

        if (item.getRcvQty() == null || item.getRcvQty() < 0.0f) {
            throw new ElidomRuntimeException("입고 수량이 유효하지 않습니다.");
        }

        SKU sku = queryManager.selectByCondition(SKU.class,
                new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));

        // 3. 입고 정보로 재고 생성
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
        this.queryManager.insert(inv);

        // 4. 생성 재고 리턴
        return inv;
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
        StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(receiving.getDomainId(), receiving.getComCd(),
                receiving.getWhCd());
        String defaultLocCd = policy.getDefaultWaitLoc();

        List<Inventory> inventories = new ArrayList<Inventory>();
        for (ReceivingItem item : receivingItems) {
            if (ValueUtil.isNotEqual(item.getStatus(), WmsInboundConstants.STATUS_END) || item.getRcvQty() == null
                    || item.getRcvQty() == 0) {
                continue;
            }

            SKU sku = queryManager.selectByCondition(SKU.class,
                    new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));

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
        if (sku == null) {
            sku = queryManager.selectByCondition(SKU.class, new SKU(inv.getDomainId(), inv.getComCd(), inv.getSkuCd()));
        }

        // 유통기한 설정이 안 되어 있다면 유통기한 계산 설정
        if (ValueUtil.isEmpty(inv.getExpiredDate()) && ValueUtil.isNotEmpty(inv.getProdDate())
                && ValueUtil.isNotEmpty(sku.getPrdExpiredPeriod())) {
            // 제조일자가 있는 경우 : 유통기한 = 제조일 + 제조일 유통기한
            inv.setExpiredDate(DateUtil.addDateToStr(DateUtil.parse(inv.getProdDate(), DateUtil.getDateFormat()),
                    sku.getPrdExpiredPeriod()));
        }

        // 유효기간 상태 설정 : 재고에 유효 기간이 설정된 경우
        if (ValueUtil.isNotEmpty(inv.getExpiredDate())) {
            if (ValueUtil.isNotEmpty(sku.getImminentPeriod())) {
                // 임박 재고 전환 기준일이 지정된 경우
                if (DateUtil.isBiggerThenTargetDate(inv.getExpiredDate(),
                        DateUtil.addDateToStr(new Date(), sku.getImminentPeriod()))) {
                    // 정상 : 유효 기간이 임박재고 전환일 보다 큰 경우
                    inv.setExpireStatus(Inventory.EXPIRE_STATUS_NORMAL);
                } else {
                    // 유효 기간이 임박재고 전환일 보다 작은 경우 : 유효기간 지남 / 임박 체크
                    if (ValueUtil.isNotEmpty(sku.getNoOutPeriod()) && DateUtil.isBiggerThenTargetDate(
                            DateUtil.addDateToStr(new Date(), sku.getNoOutPeriod()), inv.getExpiredDate())) {
                        // 유효기간 지남 : 출고 불가 기준일이 있고, 유효기간 보다 출고 불가 기준일이 큰경우
                        inv.setExpireStatus(Inventory.EXPIRE_STATUS_EXPIRED);
                    } else {
                        // 임박 : 출고 불가 기준일이 없거나, 출고 불가 기준일 보다 유효 기간이 큰 경우
                        inv.setExpireStatus(Inventory.EXPIRE_STATUS_IMMINENT);
                    }
                }
            } else if (ValueUtil.isNotEmpty(sku.getNoOutPeriod())) {
                // 출고 불가 기준일이 지정된 경우
                if (DateUtil.isBiggerThenTargetDate(DateUtil.addDateToStr(new Date(), sku.getNoOutPeriod()),
                        inv.getExpiredDate())) {
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
     * 작 업 화 면 A P I
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
        Receiving rcv = this.queryManager.selectByCondition(Receiving.class,
                new Receiving(Domain.currentDomainId(), rcvNo));

        if (rcv == null) {
            throw new ElidomRuntimeException("입고 주문 번호 [" + rcvNo + "]로 입고 주문을 찾을 수 없습니다.");
        }

        // 2. 입고 예정 정보 상태 체크
        if (ValueUtil.isEqual(rcv.getStatus(), WmsInboundConstants.STATUS_END)) {
            return new ArrayList<ReceivingItem>(1);
        }

        if (ValueUtil.isNotEqual(rcv.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw new ElidomRuntimeException("입고 작업을 처리할 수 있는 상태가 아닙니다.");
        }

        // 3. 입고 예정 상세 조회
        Query queryObj = AnyOrmUtil.newConditionForExecution(Domain.currentDomainId());
        queryObj.addFilter("receivingId", rcv.getId());
        if (ValueUtil.isNotEmpty(notCompleted) && ValueUtil.toBoolean(notCompleted)) {
            queryObj.addFilter("status", WmsInboundConstants.STATUS_START);
        }
        if (ValueUtil.isNotEmpty(barcode)) {
            queryObj.addFilter("barcode", barcode);
        }
        queryObj.addOrder("rcvSeq", true);
        List<ReceivingItem> items = this.queryManager.selectList(ReceivingItem.class, queryObj);

        // 4. 모바일 그리드에 표시할 내용 생성
        for (ReceivingItem item : items) {
            String remark = item.getRcvSeq() + ") " + item.getRcvExpSeq() + " / " + item.getSkuNm() + " / "
                    + item.getRcvExpQty() + " / " + item.getRcvQty();
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
        Receiving rcv = this.queryManager.selectByCondition(Receiving.class,
                new Receiving(Domain.currentDomainId(), rcvNo));

        if (rcv == null) {
            throw new ElidomRuntimeException("입고 주문 번호 [" + rcvNo + "]로 입고 주문을 찾을 수 없습니다.");
        }

        // 2. 입고 예정 정보 상태 체크
        if (ValueUtil.isNotEqual(rcv.getStatus(), WmsInboundConstants.STATUS_APPROVED)
                && ValueUtil.isNotEqual(rcv.getStatus(), WmsInboundConstants.STATUS_PUTAWAY)) {
            throw new ElidomRuntimeException("적치 작업을 처리할 수 있는 상태가 아닙니다.");
        }

        // 3. 입고 예정 상세 조회
        StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(rcv.getDomainId(), rcv.getComCd(), rcv.getWhCd());
        String rcvWaitLoc = policy.getDefaultWaitLoc();

        Query queryObj = AnyOrmUtil.newConditionForExecution(Domain.currentDomainId());
        queryObj.addFilter("rcvNo", rcvNo);
        queryObj.addFilter("locCd", rcvWaitLoc);
        queryObj.addFilter("status", Inventory.STATUS_WAITING);
        queryObj.addFilter("delFlag", false);
        if (ValueUtil.isNotEmpty(barcode)) {
            queryObj.addFilter("barcode", barcode);
        }
        queryObj.addOrder("rcvSeq", true);
        List<Inventory> items = this.queryManager.selectList(Inventory.class, queryObj);

        // 4. 재고 바코드 체크
        if (items == null || items.isEmpty()) {
            return new ArrayList<Inventory>(1);
        }

        // 5. 모바일 그리드에 표시할 내용 생성
        for (Inventory item : items) {
            String remark = item.getRcvSeq() + ") " + item.getSkuNm() + " / " + item.getBarcode() + " / "
                    + item.getInvQty();
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
     * - ZONE : SKU.tempType 과 Location.tempType 이 일치하는 STORAGE 로케이션 중 재고 없는 곳
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
                ? policy.getPutawayStrategy()
                : StoragePolicy.PUTAWAY_STRATEGY_RANDOM;

        // 공통 서브쿼리: 재고가 있는 로케이션 목록
        String occupiedSubSql = "SELECT DISTINCT loc_cd FROM inventories"
                + " WHERE domain_id = :domainId AND wh_cd = :whCd"
                + " AND (del_flag IS NULL OR del_flag = false) AND inv_qty > 0";

        // W23-FL-2: 위험물 상품이면 hazmat_flag=true인 로케이션만 추천
        String hazmatFilter = (sku != null && Boolean.TRUE.equals(sku.getHazmatFlag()))
                ? " AND hazmat_flag = true"
                : "";

        String baseSql = "SELECT * FROM locations"
                + " WHERE domain_id = :domainId AND wh_cd = :whCd"
                + " AND loc_type = 'STORE'"
                + " AND (del_flag IS NULL OR del_flag = false)"
                + " AND (restrict_type IS NULL OR restrict_type = '')"
                + hazmatFilter;

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
            // NEAREST: sortNo ASC 기준 가장 가까운 빈 로케이션 (W23-FL-4: tempType 필터 추가)
            String tempType = (sku != null) ? sku.getTempType() : null;
            sql = baseSql
                    + " AND loc_cd NOT IN (" + occupiedSubSql + ")"
                    + (ValueUtil.isNotEmpty(tempType)
                            ? " AND (temp_type = :tempType OR temp_type IS NULL OR temp_type = '')"
                            : "")
                    + " ORDER BY sort_no ASC NULLS LAST"
                    + " LIMIT :limit";
            if (ValueUtil.isNotEmpty(tempType)) {
                params.put("tempType", tempType);
            }

        } else {
            // RANDOM(기본): 화주사 전용 또는 공용(com_cd IS NULL) 빈 로케이션 (W23-FL-4: tempType 필터 추가)
            String tempType = (sku != null) ? sku.getTempType() : null;
            sql = baseSql
                    + " AND loc_cd NOT IN (" + occupiedSubSql + ")"
                    + " AND (com_cd = :comCd OR com_cd IS NULL OR com_cd = '')"
                    + (ValueUtil.isNotEmpty(tempType)
                            ? " AND (temp_type = :tempType OR temp_type IS NULL OR temp_type = '')"
                            : "")
                    + " ORDER BY sort_no ASC NULLS LAST"
                    + " LIMIT :limit";
            params.put("comCd", comCd);
            if (ValueUtil.isNotEmpty(tempType)) {
                params.put("tempType", tempType);
            }
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

    /**
     * 적치 작업 입고 목록 조회 — 입고별 WAITING/STORED 건수 및 적치 진행 상태 포함
     *
     * 다음 입고 주문을 반환한다.
     * <ul>
     * <li>대기/작업중: 상태가 APPROVED·PUTAWAY 이고 적치 대기(WAITING) 1건 이상</li>
     * <li>완료: 상태가 END 이고 당일(rcv_end_date) 적치 완료되어 전 항목 STORED</li>
     * </ul>
     * 각 입고 건마다 적치 진행 상태(putaway_status)를 재고 건수 기준으로 산출한다.
     * <ul>
     * <li>WAITING — 적치 시작 전(STORED 0건)</li>
     * <li>PUTAWAY — 일부 적치됨(WAITING·STORED 혼재)</li>
     * <li>DONE — 전부 적치됨(WAITING 0건)</li>
     * </ul>
     *
     * @param domainId 도메인 ID
     * @return 입고별 적치 현황 목록 (rcv_no, rcv_req_date, com_cd, vend_cd, status,
     *         waiting_count, stored_count, putaway_status)
     */
    public List<Map> getPutawayReceivingList(Long domainId) {
        String sql = "SELECT r.rcv_no, r.rcv_req_date, r.com_cd, r.vend_cd, r.status" +
                ", COUNT(CASE WHEN i.status = 'WAITING' THEN 1 END) AS waiting_count" +
                ", COUNT(CASE WHEN i.status = 'STORED' THEN 1 END) AS stored_count" +
                ", CASE" +
                "    WHEN COUNT(CASE WHEN i.status = 'STORED' THEN 1 END) > 0" +
                "         AND COUNT(CASE WHEN i.status = 'WAITING' THEN 1 END) = 0 THEN 'DONE'" +
                "    WHEN COUNT(CASE WHEN i.status = 'STORED' THEN 1 END) > 0" +
                "         AND COUNT(CASE WHEN i.status = 'WAITING' THEN 1 END) > 0 THEN 'PUTAWAY'" +
                "    ELSE 'WAITING'" +
                "  END AS putaway_status" +
                " FROM receivings r" +
                " JOIN inventories i ON r.domain_id = i.domain_id AND r.rcv_no = i.rcv_no" +
                " WHERE r.domain_id = :domainId" +
                " AND (i.del_flag IS NULL OR i.del_flag = false)" +
                " AND i.status IN ('WAITING', 'STORED')" +
                " AND r.status IN ('APPROVED', 'PUTAWAY', 'END')" +
                " AND (r.status <> 'END' OR r.rcv_end_date = :today)" +
                " GROUP BY r.rcv_no, r.rcv_req_date, r.com_cd, r.vend_cd, r.status" +
                " HAVING (" +
                "    (r.status IN ('APPROVED', 'PUTAWAY')" +
                "     AND COUNT(CASE WHEN i.status = 'WAITING' THEN 1 END) > 0)" +
                "    OR (r.status = 'END'" +
                "        AND COUNT(CASE WHEN i.status = 'WAITING' THEN 1 END) = 0" +
                "        AND COUNT(CASE WHEN i.status = 'STORED' THEN 1 END) > 0)" +
                " )" +
                " ORDER BY r.rcv_no DESC";
        Map<String, Object> params = ValueUtil.newMap("domainId,today", domainId, DateUtil.todayStr());
        return (List<Map>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

    /**
     * 입고주문 목록용 상품 요약 조회 — N+1 제거
     *
     * 여러 입고주문(receiving_id)에 대해 한 번의 쿼리로 각 주문의
     * 대표 상품명(첫 디테일 라인 기준)과 디테일 라인 수를 집계한다.
     * (기존: 주문마다 receivings/{id}/items 를 호출해 전체 디테일을 받아오던 방식 대체)
     *
     * @param domainId     도메인 ID
     * @param receivingIds 입고주문 ID 목록
     * @return 주문별 요약 [{ receiving_id, sku_nm, item_count }]
     */
    public List<Map> getReceivingSkuSummary(Long domainId, List<String> receivingIds) {
        if (ValueUtil.isEmpty(receivingIds)) {
            return new java.util.ArrayList<Map>(1);
        }
        String sql = "SELECT ri.receiving_id AS receiving_id" +
                ", (array_agg(ri.sku_nm ORDER BY ri.rcv_seq))[1] AS sku_nm" +
                ", COUNT(*) AS item_count" +
                " FROM receiving_items ri" +
                " WHERE ri.domain_id = :domainId AND ri.receiving_id IN (:receivingIds)" +
                " GROUP BY ri.receiving_id";
        Map<String, Object> params = ValueUtil.newMap("domainId,receivingIds", domainId, receivingIds);
        return (List<Map>) this.queryManager.selectListBySql(sql, params, Map.class, 0, 0);
    }

    /********************************************************************************************************
     * 인 쇄
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
        Receiving receiving = this.queryManager.selectByCondition(Receiving.class,
                new Receiving(Domain.currentDomainId(), rcvNo));
        if (receiving == null) {
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
        if (ValueUtil.isEmpty(templateName)) {
            templateName = this.getReceivingSheetTemplateName(receiving, true);
        }

        if (ValueUtil.isEmpty(printerId)) {
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
        if (receiving == null) {
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
        if (ValueUtil.isEmpty(templateName)) {
            templateName = this.getRecevingLabelTemplateName(receiving, true);
        }

        if (ValueUtil.isEmpty(printerId)) {
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
        if (receivingItem == null) {
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
        if (ValueUtil.isEmpty(printerId)) {
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
        StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(rec.getDomainId(), rec.getComCd(), rec.getWhCd());

        if (exceptionWhenEmpty && (policy == null || ValueUtil.isEmpty(policy.getInvLabelTmpl()))) {
            throw new ElidomRuntimeException("재고 바코드 라벨 템플릿이 화주사-창고별 보관 정책 설정에 설정되지 않았습니다.");
        }

        return policy.getInvLabelTmpl();
    }

    /**
     * 입고지시서 템플릿 이름 조회
     *
     * @param rec
     * @param exceptionWhenEmpty
     * @return
     */
    public String getReceivingSheetTemplateName(Receiving rec, boolean exceptionWhenEmpty) {
        StoragePolicy policy = this.wmsBaseSvc.findStoragePolicy(rec.getDomainId(), rec.getComCd(), rec.getWhCd());

        if (exceptionWhenEmpty && (policy == null || ValueUtil.isEmpty(policy.getInboundSheetTmpl()))) {
            throw new ElidomRuntimeException("입고지지서 템플릿이 화주사-창고별 보관 정책 설정에 설정되지 않았습니다.");
        }

        return policy.getInboundSheetTmpl();
    }

    /********************************************************************************************************
     * 검수 반려 트랜잭션 (W23-IR-1, W23-IR-2)
     ********************************************************************************************************/

    /**
     * 입고 상세 라인 반려 처리 (W23-IR-1)
     *
     * 검수 중인(START) 라인을 REJECTED 상태로 전환하고 반려 사유를 remarks에 기록한다.
     * 반려 수량이 있는 경우 불량(DEFECT) 로케이션에 불량 재고를 생성한다.
     *
     * @param receiving    입고 주문
     * @param item         입고 상세 라인
     * @param rejectReason 반려 사유
     * @return 반려 처리된 입고 상세 라인
     */
    public ReceivingItem rejectReceivingOrderLine(Receiving receiving, ReceivingItem item, String rejectReason) {
        if (ValueUtil.isNotEqual(item.getStatus(), WmsInboundConstants.STATUS_START)) {
            throw new ElidomRuntimeException("입고 순번 [" + item.getRcvSeq() + "]은 작업 중인 상태가 아닙니다.");
        }

        item.setStatus(WmsInboundConstants.STATUS_REJECTED);
        item.setRemarks(rejectReason);
        item.setRcvDate(DateUtil.todayStr());

        // TODO 검수 승인 시 반려를 하는 경우 불량 재고를 생성해야 하는지 체크 필요 - 반려 상태만 남기면 되는 거 아닌지 ...
        this.processRejectedReceivingItem(receiving, item);
        return item;
    }

    /**
     * 반려 재고 처리 (W23-IR-2)
     *
     * 반려된 입고 라인의 수량(rcvQty)이 있으면 창고의 DEFECT 로케이션에 불량 재고(STATUS_BAD)를 생성한다.
     * DEFECT 로케이션이 없으면 재고 생성 없이 반환한다.
     *
     * @param receiving 입고 주문
     * @param item      반려된 입고 상세 라인
     */
    public void processRejectedReceivingItem(Receiving receiving, ReceivingItem item) {
        if (item.getRcvQty() == null || item.getRcvQty() == 0) {
            return;
        }

        // DEFECT 로케이션 조회
        String defectLocSql = "SELECT loc_cd FROM locations WHERE domain_id = :domainId AND wh_cd = :whCd AND loc_type = 'DEFECT' AND (del_flag IS NULL OR del_flag = false) LIMIT 1";
        String defectLocCd = this.queryManager.selectBySql(defectLocSql,
                ValueUtil.newMap("domainId,whCd", receiving.getDomainId(), receiving.getWhCd()), String.class);

        if (ValueUtil.isEmpty(defectLocCd)) {
            return;
        }

        // 불량 로케이션에 재고 생성
        SKU sku = this.queryManager.selectByCondition(SKU.class,
                new SKU(receiving.getDomainId(), receiving.getComCd(), item.getSkuCd()));

        Inventory inv = new Inventory();
        inv.setBarcode(ValueUtil.isNotEmpty(item.getBarcode()) ? item.getBarcode() : Inventory.newBarcode());
        inv.setStatus(Inventory.STATUS_BAD);
        inv.setLastTranCd(Inventory.TRANSACTION_IN_INSP);
        inv.setWhCd(receiving.getWhCd());
        inv.setComCd(receiving.getComCd());
        inv.setVendCd(receiving.getVendCd());
        inv.setPoNo(ValueUtil.isNotEmpty(item.getPoNo()) ? item.getPoNo() : receiving.getRcvReqNo());
        inv.setRcvNo(receiving.getRcvNo());
        inv.setRcvSeq(item.getRcvSeq());
        inv.setSkuCd(item.getSkuCd());
        if (sku != null) {
            inv.setSkuBcd(sku.getSkuBarcd());
            inv.setSkuNm(sku.getSkuNm());
        }
        inv.setLocCd(defectLocCd);
        inv.setProdDate(item.getPrdDate());
        inv.setExpiredDate(item.getExpiredDate());
        inv.setInvoiceNo(item.getInvoiceNo());
        inv.setInvQty(item.getRcvQty());
        inv.setLotNo(item.getLotNo());
        inv.setRemarks(item.getRemarks());
        inv.setDelFlag(false);
        this.queryManager.insert(inv);
    }

    /**
     * 적치 작업 완료 처리 — 입고 주문 상태를 PUTAWAY → END로 변경
     *
     * 모든 재고 항목 적치 완료 또는 수동 작업완료 시 호출.
     * 입고 주문의 상태가 PUTAWAY인 경우에만 처리하며, 이미 END이면 그대로 반환.
     *
     * @param domainId 도메인 ID
     * @param rcvNo    입고번호
     * @return 업데이트된 Receiving 객체
     */
    public Receiving completePutaway(Long domainId, String rcvNo) {
        // 1. 입고 주문 조회
        Receiving rcv = this.queryManager.selectByCondition(Receiving.class,
                new Receiving(domainId, rcvNo));

        if (rcv == null) {
            throw new ElidomRuntimeException("입고 주문 번호 [" + rcvNo + "]로 입고 주문을 찾을 수 없습니다.");
        }

        // 2. 이미 완료 상태이면 그대로 반환
        if (ValueUtil.isEqual(rcv.getStatus(), WmsInboundConstants.STATUS_END)) {
            return rcv;
        }

        // 3. PUTAWAY 상태가 아니면 오류
        if (ValueUtil.isNotEqual(rcv.getStatus(), WmsInboundConstants.STATUS_PUTAWAY)) {
            throw new ElidomRuntimeException("적치 완료 처리가 가능한 상태가 아닙니다. 현재 상태: " + rcv.getStatus());
        }

        // 4. 입고 주문 상태를 END로 변경
        rcv.setStatus(WmsInboundConstants.STATUS_END);
        rcv.setRcvEndDate(DateUtil.todayStr());
        this.queryManager.update(rcv, "status", "rcvEndDate", "updatedAt");

        return rcv;
    }
}
