package operato.wms.inbound.rest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import operato.wms.base.service.RuntimeConfigService;
import operato.wms.base.service.WmsBaseService;
import operato.wms.inbound.WmsInboundConfigConstants;
import operato.wms.inbound.WmsInboundConstants;
import operato.wms.inbound.entity.ImportReceivingOrder;
import operato.wms.inbound.entity.Receiving;
import operato.wms.inbound.entity.ReceivingItem;
import operato.wms.inbound.service.InboundTransactionService;
import operato.wms.stock.entity.Inventory;
import xyz.anythings.sys.model.BaseResponse;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

/**
 * 입고 트랜잭션 처리용 컨트롤러
 * 기본 입고 프로세스에 대한 트랜잭션은 여기서 처리하고 각 프로세스 별 커스텀 서비스로 커스터마이징 처리한다.
 * 
 * @author shortstop
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/inbound_trx")
@ServiceDesc(description = "Inbound Transaction Service API")
public class InboundTransactionController extends AbstractRestService {
    /**
     * 커스텀 서비스 - 입고 주문 임포트 전 처리
     */
    public static final String TRX_INB_PRE_IMPORT_RECEIPT = "diy-inb-pre-import-receiving";
    /**
     * 커스텀 서비스 - 입고 주문 임포트 후 처리
     */
    public static final String TRX_INB_POST_IMPORT_RECEIPT = "diy-inb-post-import-receiving";
    /**
     * 커스텀 서비스 - 입고 요청 전 처리
     */
    public static final String TRX_INB_PRE_REQUEST_RECEIPT = "diy-inb-pre-request-receiving";
    /**
     * 커스텀 서비스 - 입고 요청 후 처리
     */
    public static final String TRX_INB_POST_REQUEST_RECEIPT = "diy-inb-post-request-receiving";
    /**
     * 커스텀 서비스 - 입고 요청 취소 전 처리
     */
    public static final String TRX_INB_PRE_CANCEL_REQUEST_RECEIPT = "diy-inb-pre-cancel-request-receiving";
    /**
     * 커스텀 서비스 - 입고 요청 취소 후 처리
     */
    public static final String TRX_INB_POST_CANCEL_REQUEST_RECEIPT = "diy-inb-post-cancel-request-receiving";
    /**
     * 커스텀 서비스 - 입고 접수 전 처리
     */
    public static final String TRX_INB_PRE_ACCEPT_RECEIPT = "diy-inb-pre-accept-receiving";
    /**
     * 커스텀 서비스 - 입고 접수 후 처리
     */
    public static final String TRX_INB_POST_ACCEPT_RECEIPT = "diy-inb-post-accept-receiving";
    /**
     * 커스텀 서비스 - 입고 접수 취소 전 처리
     */
    public static final String TRX_INB_PRE_CANCEL_ACCEPT_RECEIPT = "diy-inb-pre-cancel-accept-receiving";
    /**
     * 커스텀 서비스 - 입고 접수 취소 후 처리
     */
    public static final String TRX_INB_POST_CANCEL_ACCEPT_RECEIPT = "diy-inb-post-cancel-accept-receiving";
    /**
     * 커스텀 서비스 - 입고 작업 시작 전 처리
     */
    public static final String TRX_INB_PRE_START_RECEIPT = "diy-inb-pre-start-receiving";
    /**
     * 커스텀 서비스 - 입고 작업 시작 후 처리
     */
    public static final String TRX_INB_POST_START_RECEIPT = "diy-inb-post-start-receiving";
    /**
     * 커스텀 서비스 - 입고 작업 시작 취소 전 처리
     */
    public static final String TRX_INB_PRE_CANCEL_START_RECEIPT = "diy-inb-pre-cancel-start-receiving";
    /**
     * 커스텀 서비스 - 입고 작업 시작 취소 후 처리
     */
    public static final String TRX_INB_POST_CANCEL_START_RECEIPT = "diy-inb-post-cancel-start-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 하나 입고 완료 전 처리
     */
    public static final String TRX_INB_PRE_LINE_FINISH_RECEIPT = "diy-inb-pre-line-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 하나 입고 완료 후 처리
     */
    public static final String TRX_INB_POST_LINE_FINISH_RECEIPT = "diy-inb-post-line-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 리스트 입고 완료 전 처리
     */
    public static final String TRX_INB_PRE_LINES_FINISH_RECEIPT = "diy-inb-pre-lines-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 리스트 입고 완료 후 처리
     */
    public static final String TRX_INB_POST_LINES_FINISH_RECEIPT = "diy-inb-post-lines-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 리스트 입고 완료 취소 전 처리
     */
    public static final String TRX_INB_PRE_CANCEL_LINES_FINISH_RECEIPT = "diy-inb-pre-cancel-lines-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 리스트 입고 완료 취소 후 처리
     */
    public static final String TRX_INB_POST_CANCEL_LINES_FINISH_RECEIPT = "diy-inb-post-cancel-lines-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 입고 완료 취소 전 처리
     */
    public static final String TRX_INB_PRE_CANCEL_LINE_FINISH_RECEIPT = "diy-inb-pre-cancel-line-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 예정 주문 라인 입고 완료 취소 후 처리
     */
    public static final String TRX_INB_POST_CANCEL_LINE_FINISH_RECEIPT = "diy-inb-post-cancel-line-finish-receiving";
    /**
     * 커스텀 서비스 - 입고 작업 마감 전 처리
     */
    public static final String TRX_INB_PRE_CLOSE_RECEIPT = "diy-inb-pre-close-receiving";
    /**
     * 커스텀 서비스 - 입고 작업 마감 후 처리
     */
    public static final String TRX_INB_POST_CLOSE_RECEIPT = "diy-inb-post-close-receiving";
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
     * 인바운드 트랜잭션 서비스
     */
    @Autowired
    private InboundTransactionService inbTrxService;
    /**
     * 리포트 컨트롤러
     */
    @Autowired
    private PrintoutController printoutCtrl;
    /**
     * 커스텀 서비스
     */
    @Autowired
    private ICustomService customSvc;

    @Override
    protected Class<?> entityClass() {
        return Receiving.class;
    }

    /********************************************************************************************************
     * 입고 예정 트랜잭션 : 작성 or 업로드 -> 요청 -> 확정 -> 입고 작업 -> 입고 완료
     * 입고 예정 상태 : (INWORK) 작성 중 -> (REQUEST) 요청 -> (READY) 대기 -> (RUN) 진행 중 -> (END)
     * 완료
     ********************************************************************************************************/

    @RequestMapping(value = "receiving_orders/import/excel", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Import receiving orders")
    public List<ImportReceivingOrder> importReleaseOrders(@RequestBody List<ImportReceivingOrder> list) {
        Long domainId = Domain.currentDomainId();

        // 1. 커스텀 서비스 전 처리
        Map<String, Object> custSvcParams = ValueUtil.newMap("list", list);
        Object preSvcResult = this.customSvc.doCustomService(domainId, TRX_INB_PRE_IMPORT_RECEIPT, custSvcParams);

        // 2. 리턴값이 true이면 커스텀 서비스에서 완전 커스터마이징 처리
        if (preSvcResult != null && preSvcResult instanceof Boolean && ValueUtil.toBoolean(preSvcResult) == true) {
            this.customSvc.doCustomService(domainId, TRX_INB_POST_IMPORT_RECEIPT, custSvcParams);
            return list;
        }

        // 3. 임포트 처리
        Receiving receiving = this.inbTrxService.importReleaseOrders(list);

        // 4. 커스텀 서비스 후 처리
        custSvcParams.put("receiving", receiving);
        this.customSvc.doCustomService(domainId, TRX_INB_POST_IMPORT_RECEIPT, custSvcParams);

        // 5. 리턴
        return list;
    }

    /**
     * 입고 예정 정보 요청 처리 (상태 : INWORK -> REQUEST)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/request", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Request Receiving Order")
    public Receiving requestReceivingOrder(@PathVariable("id") String id) {
        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receivingOrder", receiving);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_REQUEST_RECEIPT, custSvcParams);

        // 3. 입고 예정 요청 처리
        this.inbTrxService.requestReceivingOrder(receiving);

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_REQUEST_RECEIPT, custSvcParams);

        // 5. 리턴
        return receiving;
    }

    /**
     * 입고 예정 정보 요청 취소 처리 (상태 : REQUEST -> INWORK, INWORK -> 삭제)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/cancel_request", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Request Receiving Order")
    public Receiving cancelRequestReceivingOrder(@PathVariable("id") String id) {
        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receivingOrder", receiving);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_CANCEL_REQUEST_RECEIPT, custSvcParams);

        // 3. 입고 예정 요청 처리
        this.inbTrxService.cancelRequestReceivingOrder(receiving);

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_CANCEL_REQUEST_RECEIPT, custSvcParams);

        // 5. 리턴
        return receiving;
    }

    /**
     * 입고 예정 정보 접수 처리 (상태 : REQUEST -> READY)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/accept", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Accept Receiving Order")
    public Receiving acceptReceivingOrder(@PathVariable("id") String id) {
        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receivingOrder", receiving);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_ACCEPT_RECEIPT, custSvcParams);

        // 3. 입고 예정 정보 접수 처리
        this.inbTrxService.acceptReceivingOrder(receiving);

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_ACCEPT_RECEIPT, custSvcParams);

        // 5. 리턴
        return receiving;
    }

    /**
     * 입고 예정 정보 접수 취소 처리 (상태 : READY -> REQUEST)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/cancel_accept", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Accept Receiving Order")
    public Receiving cancelAcceptReceivingOrder(@PathVariable("id") String id) {
        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receivingOrder", receiving);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_CANCEL_ACCEPT_RECEIPT, custSvcParams);

        // 3. 입고 예정 정보 접수 취소 처리
        this.inbTrxService.cancelAcceptReceivingOrder(receiving);

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_CANCEL_ACCEPT_RECEIPT, custSvcParams);

        // 5. 리턴
        return receiving;
    }

    /**
     * 입고 예정 작업 시작 처리 (상태 : READY -> START)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/start", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Start Receiving Order")
    public Receiving startReceivingOrder(@PathVariable("id") String id) {
        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receivingOrder", receiving);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_START_RECEIPT, custSvcParams);

        // 3. 입고 예정 작업 시작 처리
        this.inbTrxService.startReceivingOrder(receiving);

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_START_RECEIPT, custSvcParams);

        // 5. 리턴
        return receiving;
    }

    /**
     * 입고 예정 작업 시작 취소 처리 (상태 : START -> READY)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/cancel_start", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Start Receiving Order")
    public Receiving cancelStartReceivingOrder(@PathVariable("id") String id) {
        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receivingOrder", receiving);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_CANCEL_START_RECEIPT, custSvcParams);

        // 3. 입고 예정 작업 시작 취소 처리
        this.inbTrxService.cancelStartReceivingOrder(receiving);

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_CANCEL_START_RECEIPT, custSvcParams);

        // 5. 리턴
        return receiving;
    }

    /**
     * 입고 라인 리스트 완료 처리 (입고 라인별 완료 처리) (입고 상세 상태 : START -> END)
     * 
     * @param data
     * @param printerId
     * @return
     */
    @RequestMapping(value = "receiving_orders/lines/finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Finish Receiving Order Lines")
    public List<ReceivingItem> finishReceivingOrderLines(
            @RequestBody Map<String, List<ReceivingItem>> data,
            @RequestParam(name = "printerId", required = false) String printerId) {

        // 1. 입고 예정 라인 리스트 처리
        List<ReceivingItem> list = data.get("list");
        ReceivingItem firstItem = list.get(0);
        String receivingId = firstItem.getReceivingId();
        Receiving receiving = this.queryManager.select(Receiving.class, receivingId);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receiving,receivingItems", receiving, list);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_LINES_FINISH_RECEIPT, custSvcParams);

        // 3. 입고 예정 라인 입고 완료 처리
        List<ReceivingItem> listToFinish = this.inbTrxService.finishReceivingOrderLines(receiving, list, printerId);
        this.queryManager.updateBatch(listToFinish);

        // 4. 입고가 모두 끝났다면 자동 완료 처리
        String rcvAutoFlag = this.runtimeConfSvc.getRuntimeConfigValue(receiving.getComCd(), receiving.getWhCd(),
                WmsInboundConfigConstants.RECEIPT_FINISH_AUTO_FLAG);
        if (ValueUtil.toBoolean(rcvAutoFlag, true)) {
            String sql = "select count(id) from receiving_items where domain_id = :domainId and receiving_id = :receivingId and (status != :cancelStatus and status != :endStatus)";
            Map<String, Object> params = ValueUtil.newMap("domainId,receivingId,cancelStatus,endStatus",
                    receiving.getDomainId(), receiving.getId(), WmsInboundConstants.STATUS_CANCEL,
                    WmsInboundConstants.STATUS_END);
            if (this.queryManager.selectBySql(sql, params, Integer.class) == 0) {
                // 4.1 자동 마감 처리
                this.closeReceivingOrder(receiving.getId());
            }
        }

        // 5. 후 처리 커스텀 서비스 호출
        custSvcParams.put("receivingItems", listToFinish);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_LINES_FINISH_RECEIPT, custSvcParams);

        // 6. 입고 예정 주문 라인 리턴
        return listToFinish;
    }

    /**
     * 입고 라인 완료 처리 (입고 라인별 완료 처리) (입고 상세 상태 : START -> END)
     * 
     * @param id
     * @param receivingItem
     * @param printerId
     * @return
     */
    @RequestMapping(value = "receiving_orders/line/{id}/finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Finish Receiving Order Line")
    public ReceivingItem finishReceivingOrderLine(
            @PathVariable("id") String id,
            @RequestBody ReceivingItem receivingItem,
            @RequestParam(name = "printerId", required = false) String printerId) {

        // 1. 입고 예정 라인 처리
        ReceivingItem itemToFinish = this.queryManager.select(ReceivingItem.class, id);
        Receiving receiving = this.queryManager.select(Receiving.class, itemToFinish.getReceivingId());
        itemToFinish = ValueUtil.populateOnlyNotNullValue(receivingItem, itemToFinish);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receiving,receivingItem", receiving, itemToFinish);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_LINE_FINISH_RECEIPT, custSvcParams);

        // 3. 입고 예정 라인 입고 완료 처리
        itemToFinish = this.inbTrxService.finishReceivingOrderLine(receiving, itemToFinish, printerId);
        this.queryManager.update(itemToFinish);

        // 4. 입고가 모두 끝났다면 자동 완료 처리
        String rcvAutoFlag = this.runtimeConfSvc.getRuntimeConfigValue(receiving.getComCd(), receiving.getWhCd(),
                WmsInboundConfigConstants.RECEIPT_FINISH_AUTO_FLAG);
        if (ValueUtil.toBoolean(rcvAutoFlag, true)) {
            String sql = "select count(id) from receiving_items where domain_id = :domainId and receiving_id = :receivingId and (status != :cancelStatus and status != :endStatus)";
            Map<String, Object> params = ValueUtil.newMap("domainId,receivingId,cancelStatus,endStatus",
                    receiving.getDomainId(), receiving.getId(), WmsInboundConstants.STATUS_CANCEL,
                    WmsInboundConstants.STATUS_END);
            if (this.queryManager.selectBySql(sql, params, Integer.class) == 0) {
                // 4.1 자동 마감 처리
                this.closeReceivingOrder(receiving.getId());
            }
        }

        // 5. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_LINE_FINISH_RECEIPT, custSvcParams);

        // 6. 라인 정보 리턴
        return itemToFinish;
    }

    /**
     * 입고 라인 완료 처리 (입고 라인별 완료 처리) (입고 상세 상태 : START -> END)
     * 
     * @param receivingItem
     * @param printerId
     * @return
     */
    @RequestMapping(value = "receiving_orders/line/finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Finish Receiving Order Line")
    public ReceivingItem finishReceivingOrderLine(
            @RequestBody ReceivingItem receivingItem,
            @RequestParam(name = "printerId", required = false) String printerId) {
        return this.finishReceivingOrderLine(receivingItem.getId(), receivingItem, printerId);
    }

    /**
     * 입고 완료 처리 (상태 : START -> END)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/close", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Close Receiving Order")
    public Receiving closeReceivingOrder(@PathVariable("id") String id) {
        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receivingOrder", receiving);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_CLOSE_RECEIPT, custSvcParams);

        // 3. 입고 예정 정보 마감 처리
        this.inbTrxService.closeReceivingOrder(receiving);

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_CLOSE_RECEIPT, custSvcParams);

        // 5. 리턴
        return receiving;
    }

    /**
     * 입고 예정 정보 상품 입고 완료 리스트 취소 처리 (상태 : END -> START)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "receiving_orders/lines/cancel_finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Finish Receiving Order Lines")
    public List<ReceivingItem> cancelFinishReceivingOrderLines(@RequestBody Map<String, List<ReceivingItem>> data) {

        // 1. 입고 예정 라인 리스트 처리
        List<ReceivingItem> list = data.get("list");
        ReceivingItem firstItem = list.get(0);
        String receivingId = firstItem.getReceivingId();
        Receiving receiving = this.queryManager.select(Receiving.class, receivingId);

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receiving,receivingItems", receiving, list);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_CANCEL_LINES_FINISH_RECEIPT, custSvcParams);

        // 3. 입고 예정 라인 입고 완료 취소 처리
        this.inbTrxService.cancelFinishReceivingOrderLines(receiving, list);
        List<ReceivingItem> listToFinish = this.queryManager.selectList(ReceivingItem.class,
                ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));

        // 4. 후 처리 커스텀 서비스 호출
        custSvcParams.put("receivingItems", listToFinish);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_CANCEL_LINES_FINISH_RECEIPT,
                custSvcParams);

        // 5. 입고 예정 주문 라인 리스트 리턴
        return listToFinish;
    }

    /**
     * 입고 라인 완료 취소 처리 (입고 라인별 완료 처리) (입고 상세 상태 : END -> START)
     * 
     * @param receivingItem
     * @param printerId
     * @return
     */
    @RequestMapping(value = "receiving_orders/line/cancel_finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Finish Receiving Order Line")
    public List<ReceivingItem> cancelFinishReceivingOrderLine(@RequestBody ReceivingItem receivingItem) {

        // 1. 입고 예정 라인 처리
        Receiving receiving = this.queryManager.select(Receiving.class, receivingItem.getReceivingId());

        // 2. 전 처리 커스텀 서비스 호출
        Map<String, Object> custSvcParams = ValueUtil.newMap("receiving,receivingItem", receiving, receivingItem);
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_PRE_CANCEL_LINE_FINISH_RECEIPT, custSvcParams);

        // 3. 입고 예정 라인 입고 완료 취소 처리
        if (ValueUtil.isEqual(receivingItem.getStatus(), WmsInboundConstants.STATUS_END)) {
            this.inbTrxService.cancelFinishReceivingOrderLine(receiving, receivingItem);
        }
        List<ReceivingItem> listToFinish = this.queryManager.selectList(ReceivingItem.class,
                ValueUtil.newMap("domainId,receivingId", receiving.getDomainId(), receiving.getId()));

        // 4. 후 처리 커스텀 서비스 호출
        this.customSvc.doCustomService(receiving.getDomainId(), TRX_INB_POST_CANCEL_LINE_FINISH_RECEIPT,
                ValueUtil.newMap("receivingItems", listToFinish));

        // 5. 라인 정보 리턴
        return listToFinish;
    }

    /********************************************************************************************************
     * 작 업 화 면 A P I
     ********************************************************************************************************/
    /**
     * 입고 작업 화면 - 작업을 위해 입고 번호 (rcv_no)로 입고 예정 상세 정보 조회
     * 
     * @param page
     * @param limit
     * @param select
     * @param sort
     * @param query
     * @return
     */
    @RequestMapping(value = "/receivings/work_items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Receiving Work Items By Receiving No.")
    public List<ReceivingItem> getReceivingWorkItems(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "select", required = false) String select,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "query", required = false) String query) {

        // 1. 입고 번호 추출
        Query queryObj = this.parseQuery(ReceivingItem.class, page, limit, select, sort, query);
        List<Filter> filters = queryObj.getFilter();

        String rcvNo = null;
        String notCompleted = null;
        String barcode = null;
        for (Filter filter : filters) {
            if (ValueUtil.isEqual(filter.getLeftOperand(), "rcv_no")) {
                rcvNo = ValueUtil.toString(filter.getValue());
            } else if (ValueUtil.isEqual(filter.getLeftOperand(), "not_completed")) {
                notCompleted = ValueUtil.toString(filter.getValue());
            } else if (ValueUtil.isEqual(filter.getLeftOperand(), "barcode")) {
                barcode = ValueUtil.toString(filter.getValue());
            }
        }

        // 2. 입고 번호가 없다면 빈 리스트 리턴
        if (ValueUtil.isEmpty(rcvNo)) {
            return new ArrayList<ReceivingItem>(1);
        }

        // 3. 입고 주문 정보 조회
        return this.inbTrxService.getReceivingWorkItems(Domain.currentDomainId(), rcvNo, notCompleted, barcode);
    }

    /**
     * 적치 작업 화면 - 작업을 위해 입고 번호 (rcv_no)로 입고 예정 상세 정보 조회
     * 
     * @param page
     * @param limit
     * @param select
     * @param sort
     * @param query
     * @return
     */
    @RequestMapping(value = "/putaway/work_items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Putaway Work Items By Receiving No.")
    public List<Inventory> getPutawayWorkItems(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "select", required = false) String select,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "query", required = false) String query) {

        // 1. 입고 번호 추출
        Query queryObj = this.parseQuery(ReceivingItem.class, page, limit, select, sort, query);
        List<Filter> filters = queryObj.getFilter();

        String rcvNo = null;
        String barcode = null;
        for (Filter filter : filters) {
            if (ValueUtil.isEqual(filter.getLeftOperand(), "rcv_no")) {
                rcvNo = ValueUtil.toString(filter.getValue());
            } else if (ValueUtil.isEqual(filter.getLeftOperand(), "barcode")) {
                barcode = ValueUtil.toString(filter.getValue());
            }
        }

        // 2. 입고 번호가 없다면 빈 리스트 리턴
        if (ValueUtil.isEmpty(rcvNo)) {
            return new ArrayList<Inventory>(1);
        }

        // 3. 적치 예정 정보 조회
        return this.inbTrxService.getPutawayWorkItems(Domain.currentDomainId(), rcvNo, barcode);
    }

    /**
     * 적치 작업 화면 - 완료 항목 조회 (rcv_no 기준, inventories status = STORED)
     *
     * GET /rest/inbound_trx/putaway/done_items?rcv_no={rcvNo}
     *
     * @param rcvNo 입고 지시 번호
     * @return status = 'STORED' 인 재고 목록
     */
    @RequestMapping(value = "/putaway/done_items", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Putaway Done Items By Receiving No.")
    public List<Inventory> getPutawayDoneItems(
            @RequestParam(name = "rcv_no") String rcvNo) {

        if (ValueUtil.isEmpty(rcvNo)) {
            return new ArrayList<Inventory>(1);
        }

        return this.inbTrxService.getPutawayDoneItems(Domain.currentDomainId(), rcvNo);
    }

    /********************************************************************************************************
     * 출 력 물 인 쇄
     ********************************************************************************************************/

    /**
     * 입고지시서 출력
     * 
     * @param id
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/print_receiving_sheet", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Print Receiving Order Sheet")
    public BaseResponse printReceivingOrderSheet(@PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        Receiving receiving = this.queryManager.select(Receiving.class, id);

        // 2. 입고지시서 출력
        this.inbTrxService.printReceivingSheet(receiving, template, printerId);

        // 3. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 입고지지서 출력을 위한 PDF 다운로드
     *
     * @param req
     * @param res
     * @param id
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "receiving_orders/{id}/download_receiving_sheet", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Receiving Order Sheet")
    public void downloadForReceivingOrderSheet(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        Receiving ro = this.queryManager.select(Receiving.class, id);

        // 2. 템플릿이 비어 있다면 기본 피킹지시서 템플릿 명 조회
        if (ValueUtil.isEmpty(template)) {
            template = this.inbTrxService.getReceivingSheetTemplateName(ro, true);
        }

        // 3. 피킹지시서 출력을 위한 PDF 다운로드
        this.printoutCtrl.showPdfByPrintTemplateName(req, res, template, ValueUtil.newMap("receiving", ro));
    }
}
