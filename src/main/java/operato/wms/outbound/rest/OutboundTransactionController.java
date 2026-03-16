package operato.wms.outbound.rest;

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

import operato.wms.outbound.entity.ImportReleaseOrder;
import operato.wms.outbound.entity.OutboundOrder;
import operato.wms.outbound.entity.PickingOrder;
import operato.wms.outbound.entity.PickingOrderItem;
import operato.wms.outbound.entity.ReleaseOrder;
import operato.wms.outbound.entity.ReleaseOrderItem;
import operato.wms.outbound.service.OutboundTransactionService;
import operato.wms.stock.entity.Inventory;
import xyz.anythings.sys.model.BaseResponse;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.dml.Filter;
import xyz.elidom.dbist.dml.Query;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.print.rest.PrintoutController;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.system.service.AbstractRestService;
import xyz.elidom.util.ValueUtil;

/**
 * 출고 트랜잭션 처리용 컨트롤러
 * 기본 출고 프로세스에 대한 트랜잭션은 여기서 처리하고 각 프로세스 별 커스텀 서비스로 커스터마이징 처리한다.
 * 
 * @author shortstop
 */
@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/outbound_trx")
@ServiceDesc(description = "Outbound Transaction Service API")
public class OutboundTransactionController extends AbstractRestService {

    /**
     * 커스텀 서비스 - 출고 임포트 전 처리
     */
    public static final String TRX_OUTB_PRE_IMPORT_RELEASE = "diy-outb-pre-import-release";
    /**
     * 커스텀 서비스 - 출고 임포트 후 처리
     */
    public static final String TRX_OUTB_POST_IMPORT_RELEASE = "diy-outb-post-import-release";
    /**
     * 커스텀 서비스 - 출고 요청 후 처리
     */
    public static final String TRX_OUTB_POST_REQUEST_RELEASE = "diy-outb-post-request-release";
    /**
     * 커스텀 서비스 - 출고 요청 취소 후 처리
     */
    public static final String TRX_OUTB_POST_CANCEL_REQUEST_RELEASE = "diy-outb-post-cancel-request-release";
    /**
     * 커스텀 서비스 - 대상 분류 전 처리
     */
    public static final String TRX_OUTB_PRE_CLASSIFY_RELEASE = "diy-outb-pre-classify-release";
    /**
     * 커스텀 서비스 - 대상 분류 후 처리
     */
    public static final String TRX_OUTB_POST_CLASSIFY_RELEASE = "diy-outb-post-classify-release";
    /**
     * 커스텀 서비스 - 출고 접수 후 처리
     */
    public static final String TRX_OUTB_POST_ACCEPT_RELEASE = "diy-outb-post-accept-release";
    /**
     * 커스텀 서비스 - 출고 접수 후 처리
     */
    public static final String TRX_OUTB_POST_CANCEL_ACCEPT_RELEASE = "diy-outb-post-cancel-accept-release";
    /**
     * 커스텀 서비스 - 출고 작업 시작 후 처리
     */
    public static final String TRX_OUTB_POST_START_RELEASE = "diy-outb-post-start-release";
    /**
     * 커스텀 서비스 - 출고 작업 시작 취소 후 처리
     */
    public static final String TRX_OUTB_POST_CANCEL_START_RELEASE = "diy-outb-post-cancel-start-release";
    /**
     * 커스텀 서비스 - 출고 주문 라인 리스트 출고 완료 처리
     */
    public static final String TRX_OUTB_POST_FINISH_RELEASE_ORDER_LINES = "diy-outb-post-finish-release-lines";
    /**
     * 커스텀 서비스 - 출고 주문 라인 출고 완료 처리
     */
    public static final String TRX_OUTB_POST_FINISH_RELEASE_ORDER_LINE = "diy-outb-post-finish-release-line";
    /**
     * 커스텀 서비스 - 피킹 시작 후 처리
     */
    public static final String TRX_OUTB_POST_START_PICKING = "diy-outb-post-start-picking";
    /**
     * 커스텀 서비스 - 피킹 아이템 피킹 처리
     */
    public static final String TRX_OUTB_POST_PICK_PICKING = "diy-outb-post-pick-picking";
    /**
     * 커스텀 서비스 - 피킹 완료 후 처리
     */
    public static final String TRX_OUTB_POST_CLOSE_PICKING = "diy-outb-post-close-picking";
    /**
     * 커스텀 서비스 - 출고 취소 후 처리
     */
    public static final String TRX_OUTB_POST_CANCEL_RELEASE = "diy-outb-post-cancel-release";
    /**
     * 커스텀 서비스 - 출고 라인 취소 후 처리
     */
    public static final String TRX_OUTB_POST_CANCEL_RELEASE_LINE = "diy-outb-post-cancel-release-line";
    /**
     * 커스텀 서비스 - 출고 마감 후 처리
     */
    public static final String TRX_OUTB_POST_CLOSE_RELEASE = "diy-outb-post-close-release";
    /**
     * 커스텀 서비스 - 파라미터가 있는 출고 마감 전 처리
     */
    public static final String TRX_OUTB_PRE_CLOSE_BY_PARAMS_RELEASE = "diy-outb-pre-close-params-release";
    /**
     * 커스텀 서비스 - 파라미터가 있는 출고 마감 후 처리
     */
    public static final String TRX_OUTB_POST_CLOSE_BY_PARAMS_RELEASE = "diy-outb-post-close-params-release";
    /**
     * 출고 트랜잭션 서비스
     */
    @Autowired
    private OutboundTransactionService outbTrxService;
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
        return ReleaseOrder.class;
    }

    /******************************************************************************************************************
     * 출고 주문 트랜잭션 : 작성 or 업로드 -> 출고 요청 -> 출고 접수 -> 출고 작업 -> 출고 마감 -> 출고 취소
     * 출고 주문 상태 : (REG) 작성 중 -> (REQ) 요청 -> (WAIT) 출고 접수 -> (RUN) 작업 중 -> (END) 완료
     * -> (CANCEL) 취소
     ******************************************************************************************************************/

    /**
     * B2C용 출고 주문 임포트 처리
     * 
     * @param list
     * @return
     */
    @RequestMapping(value = "release_orders/import/excel/b2c", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Import B2C Release Orders")
    public List<ImportReleaseOrder> importB2CReleaseOrders(@RequestBody List<ImportReleaseOrder> list) {
        Long domainId = Domain.currentDomainId();

        // 1. 커스텀 서비스 호출 - 전 처리
        Map<String, Object> customParams = ValueUtil.newMap("release_type,list", "b2c", list);
        this.customSvc.doCustomService(domainId, TRX_OUTB_PRE_IMPORT_RELEASE, customParams);

        // 2. 임포트 처리
        List<ReleaseOrder> roList = this.outbTrxService.importReleaseOrders(list, true);

        // 3. 커스텀 서비스 호출 - 후 처리
        this.customSvc.doCustomService(domainId, TRX_OUTB_POST_IMPORT_RELEASE,
                ValueUtil.newMap("releaseOrders", roList));

        // 4. 리턴
        return list;
    }

    /**
     * B2B용 출고 주문 임포트 처리
     * 
     * @param list
     * @return
     */
    @RequestMapping(value = "release_orders/import/excel/b2b", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Import B2B Release Orders")
    public List<ImportReleaseOrder> importB2BReleaseOrders(@RequestBody List<ImportReleaseOrder> list) {
        Long domainId = Domain.currentDomainId();

        // 1. 커스텀 서비스 호출 - 전 처리
        Map<String, Object> customParams = ValueUtil.newMap("release_type,list", "b2b", list);
        this.customSvc.doCustomService(domainId, TRX_OUTB_PRE_IMPORT_RELEASE, customParams);

        // 2. 임포트 처리
        List<ReleaseOrder> roList = this.outbTrxService.importReleaseOrders(list, false);

        // 3. 커스텀 서비스 호출 - 후 처리
        this.customSvc.doCustomService(domainId, TRX_OUTB_POST_IMPORT_RELEASE,
                ValueUtil.newMap("releaseOrders", roList));

        // 4. 리턴
        return list;
    }

    /**
     * 출고 리스트 요청 처리 (상태 : REG -> REQ)
     * 
     * @param data
     * @return
     */
    @RequestMapping(value = "release_orders/request", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Request Release Orders")
    public BaseResponse requestReleaseOrderList(@RequestBody Map<String, List<ReleaseOrder>> data) {
        List<ReleaseOrder> list = data.get("list");

        for (ReleaseOrder order : list) {
            // 출고 요청 처리
            this.requestReleaseOrder(order.getId());
        }

        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 요청 처리 (상태 : REG -> REQ)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/request", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Request Release Order")
    public BaseResponse requestReleaseOrder(@PathVariable("id") String id) {
        // 1. 출고 주문 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 출고 예정 요청 처리
        this.outbTrxService.requestReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(Domain.currentDomainId(), TRX_OUTB_POST_REQUEST_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 리스트 요청 취소 처리 (상태 : REQ -> REG)
     * 
     * @param data
     * @return
     */
    @RequestMapping(value = "release_orders/cancel_request", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Request Release Orders")
    public BaseResponse cancelRequestReleaseOrderList(@RequestBody Map<String, List<ReleaseOrder>> data) {
        List<ReleaseOrder> list = data.get("list");

        for (ReleaseOrder order : list) {
            this.cancelRequestReleaseOrder(order.getId());
        }

        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 요청 취소 처리 (상태 : REQ -> REG)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/cancel_request", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Request Release Order")
    public BaseResponse cancelRequestReleaseOrder(@PathVariable("id") String id) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 출고 요청 처리
        this.outbTrxService.cancelRequestReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_CANCEL_REQUEST_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 주문 대상 분류 처리
     * 
     * @param data
     * @return
     */
    @RequestMapping(value = "release_orders/classify", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Classify Release Orders")
    public BaseResponse classifyReleaseOrder(@RequestBody Map<String, List<ReleaseOrder>> data) {
        List<ReleaseOrder> list = data.get("list");

        // 1. 커스텀 서비스 호출 - 대상 분류 전 처리
        Long domainId = Domain.currentDomainId();
        Map<String, Object> customSvcParams = ValueUtil.newMap("data", list);
        this.customSvc.doCustomService(domainId, TRX_OUTB_PRE_CLASSIFY_RELEASE, customSvcParams);

        // 2. 출고 예정 요청 처리
        this.outbTrxService.classifyReleaseOrders(list);

        // 3. 커스텀 서비스 호출 - 대상 분류 후 처리
        this.customSvc.doCustomService(domainId, TRX_OUTB_POST_CLASSIFY_RELEASE, customSvcParams);

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 개별 출고 주문 접수 처리 (REQ -> WAIT)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/accept", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Accept Single Release Order")
    public BaseResponse acceptSingleReleaseOrder(@PathVariable("id") String id) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 개별 출고 주문 접수 처리
        this.outbTrxService.acceptSingleReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_ACCEPT_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 개별 출고 주문 접수 취소 처리 (WAIT -> REQ)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/cancel_accept", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Accept Single Release Order")
    public BaseResponse cancelAcceptSingleReleaseOrder(@PathVariable("id") String id) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 개별 출고 주문 접수 취소 처리
        this.outbTrxService.cancelAcceptSingleReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_CANCEL_ACCEPT_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 개별 출고 주문 시작 처리 (WAIT -> RUN)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/start", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Start Release Order")
    public BaseResponse startReleaseOrder(@PathVariable("id") String id) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 개별 출고 주문 시작 처리
        this.outbTrxService.startSingleReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_START_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 개별 출고 주문 시작 취소 처리 (RUN -> WAIT)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/cancel_start", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Start Release Order")
    public BaseResponse cancelStartReleaseOrder(@PathVariable("id") String id) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 개별 출고 주문 시작 취소 처리
        this.outbTrxService.cancelStartSingleReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_CANCEL_START_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 피킹 지시 시작 처리
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "picking_orders/{id}/start", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Start Picking Order")
    public BaseResponse startPickingOrder(@PathVariable("id") String id) {
        // 1. 조회
        PickingOrder pickingOrder = this.queryManager.select(PickingOrder.class, id);

        // 2. 개별 출고 주문 확정 처리
        this.outbTrxService.startPickingOrder(pickingOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(pickingOrder.getDomainId(), TRX_OUTB_POST_START_PICKING,
                ValueUtil.newMap("pickingOrder", pickingOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 피킹 아이템 처리
     * 
     * @param data
     * @return
     */
    @RequestMapping(value = "picking_orders/pick", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Pick Picking Order Item")
    public BaseResponse pickPickingOrder(@RequestBody Map<String, List<PickingOrderItem>> data) {
        // 1. 피킹 아이템 추출
        List<PickingOrderItem> list = data.get("list");
        PickingOrderItem firstItem = list.get(0);

        // 2. 조회
        PickingOrder pickingOrder = this.queryManager.select(PickingOrder.class, firstItem.getPickOrderId());

        // 3. 개별 출고 주문 확정 처리
        this.outbTrxService.pickPickingOrderItems(pickingOrder, list);

        // 4. 커스텀 서비스 호출
        this.customSvc.doCustomService(pickingOrder.getDomainId(), TRX_OUTB_POST_PICK_PICKING,
                ValueUtil.newMap("pickingOrder", pickingOrder));

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 예약 바코드로 피킹 아이템 처리
     * 
     * @param data
     * @return
     */
    @RequestMapping(value = "picking_orders/item/{pick_item_id}/{inventory_id}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Pick Picking Order Item")
    public BaseResponse pickPickingOrderWithInventory(
            @PathVariable("pick_item_id") String pickItemId,
            @PathVariable("inventory_id") String inventoryId) {

        // 1. 바코드 조회
        Inventory inventory = this.queryManager.select(Inventory.class, inventoryId);
        PickingOrderItem item = this.queryManager.select(PickingOrderItem.class, pickItemId);

        // 2. 조회
        PickingOrder pickingOrder = this.queryManager.select(PickingOrder.class, item.getPickOrderId());

        // 3. 개별 출고 주문 확정 처리
        this.outbTrxService.pickPickingOrderItem(pickingOrder, item, inventory);

        // 4. 커스텀 서비스 호출
        this.customSvc.doCustomService(pickingOrder.getDomainId(), TRX_OUTB_POST_PICK_PICKING,
                ValueUtil.newMap("pickingOrder", pickingOrder));

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 주문 취소 처리 (RUN -> CANCEL)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/cancel_picked", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Release Order")
    public BaseResponse cancelReleaseOrder(@PathVariable("id") String id) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 출고 주문 취소 처리
        this.outbTrxService.cancelReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_CANCEL_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 주문 라인 취소 처리 (RUN -> CANCEL)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/item/{id}/cancel_picked", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Cancel Release Order Item")
    public BaseResponse cancelReleaseOrderItem(@PathVariable("id") String id, @RequestBody ReleaseOrderItem roItem) {
        // 1. 조회
        ReleaseOrderItem releaseOrderItem = this.queryManager.select(ReleaseOrderItem.class, id);
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, releaseOrderItem.getReleaseOrderId());

        if (ValueUtil.isNotEqual(releaseOrderItem.getStatus(), ReleaseOrder.STATUS_END)) {
            return new BaseResponse(true, "ok");
        }

        // 2. 출고 주문 취소 처리
        this.outbTrxService.cancelReleaseOrderItem(releaseOrder, releaseOrderItem);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_CANCEL_RELEASE_LINE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 개별 출고 주문 마감 처리 (상태 : PICKED -> END)
     * 
     * @param id
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/close", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Close Release Order")
    public BaseResponse closeReleaseOrder(@PathVariable("id") String id) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 출고 마감 처리
        this.outbTrxService.closeReleaseOrder(releaseOrder);

        // 3. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_CLOSE_RELEASE,
                ValueUtil.newMap("releaseOrder", releaseOrder));

        // 4. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 개별 출고 주문 마감 처리 (상태 : PICKED -> END)
     * 
     * @param id
     * @param data
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/close_by_params", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Close Release Order")
    public BaseResponse closeReleaseOrder(@PathVariable("id") String id, @RequestBody Map<String, Object> data) {
        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 커스텀 서비스 전 처리
        Map<String, Object> customParams = ValueUtil.newMap("releaseOrder,data", releaseOrder, data);
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_PRE_CLOSE_BY_PARAMS_RELEASE, customParams);

        // 3. 출고 마감 처리
        this.outbTrxService.closeReleaseOrder(releaseOrder);

        // 4. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_CLOSE_BY_PARAMS_RELEASE, customParams);

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /********************************************************************************************************
     * 작 업 A P I
     ********************************************************************************************************/
    /**
     * 출고 지시 번호로 출고 작업 상세 리스트 조회
     * 
     * @param page
     * @param limit
     * @param select
     * @param sort
     * @param query
     * @return
     */
    @RequestMapping(value = "release_orders/items", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Release Order Items for Release Order Work")
    public List<OutboundOrder> searchReleaseOrderItems(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "select", required = false) String select,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "query", required = false) String query) {

        // 1. 출고 작업 필터 정보에서 출고 지시 번호 추출
        Query queryObj = this.parseQuery(ReleaseOrder.class, 0, 0, "id", "[]", query);
        List<Filter> filters = queryObj.getFilter();
        Filter filter = null;

        for (Filter f : filters) {
            if (ValueUtil.isEqualIgnoreCase(f.getName(), "rls_ord_no")) {
                filter = f;
                break;
            }
        }

        // 2. 출고 지시 번호 필터가 없다면 빈 리스트 리턴
        if (filter == null) {
            return new ArrayList<OutboundOrder>(1);
        }

        // 3. 출고 지시 번호 값이 없다면 빈 리스트 리턴
        if (ValueUtil.isEmpty(filter.getValue())) {
            throw new ElidomRuntimeException("출고지시 번호를 입력하세요");
        }

        // 4. 출고 주문 상세 리스트 조회
        return this.outbTrxService.searchReleaseWorkItems(Domain.currentDomainId(),
                ValueUtil.toString(filter.getValue()), null, null);
    }

    /**
     * 출고 지시 번호로 출고 작업 상세 리스트 조회
     * 
     * @param page
     * @param limit
     * @param select
     * @param sort
     * @param query
     * @return
     */
    @RequestMapping(value = "releases/work_items", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Release Work Items for Release Order Work")
    public List<OutboundOrder> searchReleaseWorkItems(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "select", required = false) String select,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "query", required = false) String query) {

        // 1. 출고 작업 필터 정보에서 출고 지시 번호 추출
        Query queryObj = this.parseQuery(ReleaseOrder.class, 0, 0, "id", "[]", query);
        List<Filter> filters = queryObj.getFilter();

        String rlsOrdNo = null;
        String notCompleted = null;
        String barcode = null;
        for (Filter filter : filters) {
            if (ValueUtil.isEqual(filter.getLeftOperand(), "rls_ord_no")) {
                rlsOrdNo = ValueUtil.toString(filter.getValue());
            } else if (ValueUtil.isEqual(filter.getLeftOperand(), "not_completed")) {
                notCompleted = ValueUtil.toString(filter.getValue());
            } else if (ValueUtil.isEqual(filter.getLeftOperand(), "barcode")) {
                barcode = ValueUtil.toString(filter.getValue());
            }
        }

        // 2. 출고 지시 번호 필터가 없다면 빈 리스트 리턴
        if (ValueUtil.isEmpty(rlsOrdNo)) {
            return new ArrayList<OutboundOrder>(1);
        }

        // 3. 출고 주문 상세 리스트 조회
        List<OutboundOrder> roItems = this.outbTrxService.searchReleaseWorkItems(Domain.currentDomainId(), rlsOrdNo,
                notCompleted, barcode);

        // 4. 출고 작업에 맞게 가공
        for (OutboundOrder item : roItems) {
            String remark = item.getRlsLineNo() + ") [" + item.getLineNo() + "] " + item.getSkuNm() + " / "
                    + item.getOrdQty();
            item.setRemarks(remark);
        }

        // 6. 리턴
        return roItems;
    }

    /**
     * 출고 작업 상세 ID로 가용 재고 조회
     * 
     * @return
     */
    @RequestMapping(value = "release_orders/items/{id}/inventories", method = RequestMethod.GET, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Search Release Order Items for Release Order Work")
    public List<Inventory> searchInventoriesForReleaseOrderWork(@PathVariable("id") String id) {
        ReleaseOrderItem item = this.queryManager.select(new ReleaseOrderItem(id));
        ReleaseOrder ro = this.queryManager.select(new ReleaseOrder(item.getReleaseOrderId()));
        return this.outbTrxService.searchAvailableInventories(ro, item);
    }

    /**
     * 출고 주문 라인 리스트 완료 처리
     * 
     * @param data
     * @return
     */
    @RequestMapping(value = "release_orders/lines/finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Finish Release Order Lines")
    public BaseResponse finishReleaseOrderLines(@RequestBody Map<String, List<ReleaseOrderItem>> data) {
        // 1. 출고 주문 라인 아이템 추출
        List<ReleaseOrderItem> list = data.get("list");
        ReleaseOrderItem firstItem = list.get(0);

        // 2. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, firstItem.getReleaseOrderId());

        // 3. 개별 출고 주문 출고 완료 처리
        this.outbTrxService.finishReleaseOrderLines(releaseOrder, list);

        // 4. 커스텀 서비스 호출
        this.customSvc.doCustomService(releaseOrder.getDomainId(), TRX_OUTB_POST_FINISH_RELEASE_ORDER_LINES,
                ValueUtil.newMap("releaseOrder,releaseOrderLines", releaseOrder, list));

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 주문 라인 완료 처리
     * 
     * @param releaseOrderItemId
     * @param data
     * @return
     */
    @RequestMapping(value = "release_orders/line/{release_order_item_id}/finish", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Finish Release Order Line")
    public BaseResponse finishReleaseOrderLine(@PathVariable("release_order_item_id") String releaseOrderItemId,
            @RequestBody ReleaseOrderItem data) {
        // 1. 출고 주문 상세 조회
        ReleaseOrderItem roItem = this.queryManager.select(ReleaseOrderItem.class, releaseOrderItemId);

        // 2. 출고 주문 조회
        ReleaseOrder ro = this.queryManager.select(ReleaseOrder.class, roItem.getReleaseOrderId());

        ValueUtil.populate(data, roItem, "barcode", "locCd", "expiredDate", "rlsQty");

        // 3. 개별 출고 주문 출고 완료 처리
        this.outbTrxService.finishReleaseOrderLine(ro, roItem);

        // 4. 커스텀 서비스 호출
        this.customSvc.doCustomService(ro.getDomainId(), TRX_OUTB_POST_FINISH_RELEASE_ORDER_LINE,
                ValueUtil.newMap("releaseOrder,releaseOrderLine", ro, roItem));

        // 5. 리턴
        return new BaseResponse(true, "ok");
    }

    /********************************************************************************************************
     * 출 력 물 인 쇄
     ********************************************************************************************************/

    /**
     * 피킹 주문 ID로 피킹지시서 출력
     * 
     * @param id        피킹 주문 ID
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "picking_orders/{id}/print_picking_sheet", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Print Picking Order Sheet")
    public BaseResponse printPickingOrderSheet(
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        PickingOrder pickingOrder = this.queryManager.select(PickingOrder.class, id);

        // 2. 피킹지시서 출력
        this.outbTrxService.printPickingSheet(pickingOrder, template, printerId);

        // 3. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 주문 ID로 피킹지시서 출력
     * 
     * @param id        출고 주문 ID
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/print_picking_sheet", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Print Picking Order Sheet By Release Order ID")
    public BaseResponse printPickingOrderSheetByReleaseOrderId(
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        Map<String, Object> params = ValueUtil.newMap("releaseOrderId,", id);
        String sql = "select * from picking_orders where domain_id = :domainId and pick_order_no = (select rls_ord_no from release_orders where id = :releaseOrderId)";
        PickingOrder pickingOrder = this.queryManager.selectBySql(sql, params, PickingOrder.class);

        // 2. 피킹지시서 출력
        this.outbTrxService.printPickingSheet(pickingOrder, template, printerId);

        // 3. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 출고 주문 ID로 거래명세서 출력
     * 
     * @param id
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/print_release_sheet", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Print Release Order Sheet")
    public BaseResponse printReleaseOrderSheet(
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 거래명세서 출력
        this.outbTrxService.printTradeStatement(releaseOrder, template, printerId);

        // 3. 리턴
        return new BaseResponse(true, "ok");
    }

    /**
     * 피킹 주문 ID로 피킹지시서 출력을 위한 PDF 다운로드
     * 
     * @param req
     * @param res
     * @param id        피킹 주문 ID
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "picking_orders/{id}/download_picking_sheet", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Picking Order Sheet")
    public void downloadForPickingOrderSheef(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        PickingOrder ro = this.queryManager.select(PickingOrder.class, id);

        // 2. 템플릿이 비어 있다면 기본 피킹지시서 템플릿 명 조회
        if (ValueUtil.isEmpty(template)) {
            template = this.outbTrxService.getPickingSheetTemplateName(ro.getComCd(), ro.getWhCd(), true);
        }

        // 3. 피킹지시서 출력을 위한 PDF 다운로드
        this.printoutCtrl.showPdfByPrintTemplateName(req, res, template, ValueUtil.newMap("pickingOrder", ro));
    }

    /**
     * 출고 주문 ID로 피킹지시서 출력을 위한 PDF 다운로드
     * 
     * @param req
     * @param res
     * @param id        피킹 주문 ID
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/download_picking_sheet", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Picking Order Sheet")
    public void downloadForPickingOrderSheefByReleaseOrderId(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 템플릿이 비어 있다면 기본 피킹지시서 템플릿 명 조회
        if (ValueUtil.isEmpty(template)) {
            template = this.outbTrxService.getPickingSheetTemplateName(releaseOrder.getComCd(), releaseOrder.getWhCd(),
                    true);
        }

        // 3. 피킹지시서 출력을 위한 PDF 다운로드
        this.printoutCtrl.showPdfByPrintTemplateName(req, res, template,
                ValueUtil.newMap("releaseOrder", releaseOrder));
    }

    /**
     * 출고 주문 ID로 거래명세서 출력을 위한 PDF 다운로드
     * 
     * @param req
     * @param res
     * @param id
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "release_orders/{id}/download_release_sheet", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Release Order Sheet")
    public void downloadForReleaseOrderSheet(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        // 1. 조회
        ReleaseOrder releaseOrder = this.queryManager.select(ReleaseOrder.class, id);

        // 2. 템플릿이 비어 있다면 기본 피킹지시서 템플릿 명 조회
        if (ValueUtil.isEmpty(template)) {
            template = this.outbTrxService.getTradeStmtSheetTemplateName(releaseOrder.getComCd(),
                    releaseOrder.getWhCd(), true);
        }

        // 3. 피킹지시서 출력을 위한 PDF 다운로드
        this.printoutCtrl.showPdfByPrintTemplateName(req, res, template,
                ValueUtil.newMap("releaseOrder", releaseOrder));
    }
}
