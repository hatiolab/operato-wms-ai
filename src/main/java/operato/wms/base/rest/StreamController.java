package operato.wms.base.rest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import operato.wms.base.entity.SKU;
import operato.wms.fulfillment.rest.PackingOrderController;
import operato.wms.fulfillment.rest.PickingTaskController;
import operato.wms.inbound.rest.InboundTransactionController;
import operato.wms.oms.rest.ShipmentOrderController;
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
     * 출고 컨트롤러
     */
    @Autowired
    private ShipmentOrderController shipmentCtrl;
    /**
     * 피킹 컨트롤러
     */
    @Autowired
    private PickingTaskController pickingCtrl;
    /**
     * 포장 컨트롤러
     */
    @Autowired
    private PackingOrderController packingCtrl;

    @Override
    protected Class<?> entityClass() {
        return SKU.class;
    }

    /**
     * SKU 정보 다운로드
     * 
     * @param req
     * @param res
     * @param id
     */
    @RequestMapping(value = "/sku/{id}/download_sku_code", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download SKU Code")
    public void downloadSKUCode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.skuCtrl.downloadSKUCode(req, res, id);
    }

    /**
     * SKU 바코드 다운로드
     * 
     * @param req
     * @param res
     * @param id
     */
    @RequestMapping(value = "/sku/{id}/download_sku_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download SKU Barcode")
    public void downloadSKUBarcode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.skuCtrl.downloadSKUBarcode(req, res, id);
    }

    /**
     * 로케이션 바코드 다운로드
     * 
     * @param req
     * @param res
     * @param id
     */
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

    /**
     * 재고 바코드 출력을 위한 PDF 다운로드
     *
     * @param req
     * @param res
     * @param id
     */
    @RequestMapping(value = "/inventories/{id}/download_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Inventory Barcode")
    public void downloadInventoryBarcode(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.invCtrl.downloadInventoryBarcode(req, res, id);
    }

    /**
     * 공급처 입고예정(ASN) 라벨 PDF 다운로드
     * 예정수량/팔레트당수량으로 라벨 매수를 계산하여 팔레트별 재고 바코드 라벨을 출력한다.
     *
     * @param req
     * @param res
     * @param id 공급처 입고예정 ID
     */
    @RequestMapping(value = "/supplier_shipments/{id}/download_labels", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Supplier Shipment Labels")
    public void downloadSupplierShipmentLabels(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id) {

        this.inboundTrxCtrl.downloadSupplierShipmentLabels(req, res, id);
    }

    /**
     * 로케이션 바코드 + 재고 바코드 출력을 위한 PDF 다운로드
     * 
     * @param req
     * @param res
     * @param barcode
     * @param locCd
     */
    @RequestMapping(value = "/inventories/{barcode}/{loc_cd}/download_barcode", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Inventory Barcode")
    public void downloadInventoryBarcodeByBarcodeLocation(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("barcode") String barcode,
            @PathVariable("loc_cd") String locCd) {

        this.invCtrl.downloadInventoryBarcode(req, res, barcode, locCd);
    }

    /**
     * 재고 ID 목록으로 여러 장의 바코드 라벨 PDF 다운로드 (MULTI_BARCODE_SHEET 템플릿)
     *
     * @param req
     * @param res
     * @param body ids — 재고 ID 목록
     */
    @PostMapping(value = "/inventories/download_multi_barcode", produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Multi Inventory Barcode Sheet")
    public void downloadMultiBarcode(
            HttpServletRequest req,
            HttpServletResponse res,
            @RequestBody Map<String, Object> body) {

        this.invCtrl.downloadMultiBarcode(req, res, body);
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
    @GetMapping(value = "/packing_orders/{id}/download_packing_sheet", produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Packing Sheet")
    public void downloadForPackingSheet(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        this.packingCtrl.downloadForPackingSheet(req, res, id, template, printerId);
    }

    /**
     * 포장 주문 ID로 송장 출력을 위한 PDF 다운로드
     * 
     * @param req
     * @param res
     * @param id
     * @param template
     * @param printerId
     * @return
     */
    @GetMapping(value = "/packing_orders/{id}/download_invoice_label", produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Invoice Label by packing")
    public void downloadInvoiceLabelByPacking(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        this.packingCtrl.downloadInvoiceLabel(req, res, id, template, printerId);
    }

    /**
     * 출고 주문 ID로 송장 출력을 위한 PDF 다운로드
     * 
     * @param req
     * @param res
     * @param id
     * @param template
     * @param printerId
     * @return
     */
    @GetMapping(value = "/shipment_orders/{id}/download_invoice_label", produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiDesc(description = "Download Invoice Label by Shipment")
    public void downloadInvoiceLabelByShipment(
            HttpServletRequest req,
            HttpServletResponse res,
            @PathVariable("id") String id,
            @RequestParam(name = "template", required = false) String template,
            @RequestParam(name = "printer_id", required = false) String printerId) {

        this.shipmentCtrl.downloadInvoiceLabel(req, res, id, template, printerId);
    }
}
