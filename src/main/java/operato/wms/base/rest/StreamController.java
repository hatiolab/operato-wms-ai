package operato.wms.base.rest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import operato.wms.base.entity.SKU;
import operato.wms.fulfillment.rest.PickingTaskController;
import operato.wms.inbound.rest.InboundTransactionController;
import operato.wms.stock.rest.InventoryController;
import xyz.elidom.orm.system.annotation.service.ApiDesc;
import xyz.elidom.orm.system.annotation.service.ServiceDesc;
import xyz.elidom.sys.system.service.AbstractRestService;

@RestController
@Transactional
@ResponseStatus(HttpStatus.OK)
@RequestMapping("/rest/stream")
@ServiceDesc(description = "Stream (PDF) Service API")
public class StreamController extends AbstractRestService {
    /**
     * Logger
     */
    protected Logger logger = LoggerFactory.getLogger(StreamController.class);
    /**
     * SKU 컨트롤러
     */
    @Autowired
    private SKUController skuCtrl;
    /**
     * Location 컨트롤러
     */
    @Autowired
    private LocationController locCtrl;
    /**
     * 입고 처리 컨트롤러
     */
    @Autowired
    private InboundTransactionController inboundTrxCtrl;
    /**
     * 재고 컨트롤러
     */
    @Autowired
    private InventoryController invCtrl;
    /**
     * 피킹 컨트롤러
     */
    @Autowired
    private PickingTaskController pickingCtrl;

    @Override
    protected Class<?> entityClass() {
        return SKU.class;
    }

    @RequestMapping(value = "/sku/{id}/download_sku_code", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download SKU Code")
    public void downloadSKUCode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.skuCtrl.downloadSKUCode(req, res, id);
    }

    @RequestMapping(value = "/sku/{id}/download_sku_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download SKU Barcode")
    public void downloadSKUBarcode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.skuCtrl.downloadSKUBarcode(req, res, id);
    }

    @RequestMapping(value = "/locations/{id}/download_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Location Barcode")
    public void downloadLocationBarcode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.locCtrl.downloadLocationBarcode(req, res, id);
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
    @RequestMapping(value = "/inbound_trx/receiving_orders/{id}/download_receiving_sheet", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Receiving Order Sheet")
    public void downloadForReceivingOrderSheet(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        this.inboundTrxCtrl.downloadForReceivingOrderSheet(req, res, id, template, printerId);
    }

    /**
     * 피킹 지시 ID로 피킹지시서 출력을 위한 PDF 다운로드
     * 
     * @param req
     * @param res
     * @param id        피킹 주문 ID
     * @param template
     * @param printerId
     * @return
     */
    @RequestMapping(value = "/picking_tasks/{id}/download_picking_sheet", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Picking Task Sheet")
    public void downloadPickingSheet(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        this.pickingCtrl.downloadPickingSheet(req, res, id, template, printerId);
    }

    @RequestMapping(value = "/inventories/{id}/download_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Inventory Barcode")
    public void downloadInventoryBarcode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.invCtrl.downloadInventoryBarcode(req, res, id);
    }
}
