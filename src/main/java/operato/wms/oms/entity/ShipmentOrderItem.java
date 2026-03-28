package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 출하 주문 상세
 *
 * @author HatioLab
 */
@Table(name = "shipment_order_items", idStrategy = GenerationRule.UUID, indexes = {
    @Index(name = "ix_shipment_order_items_0", columnList = "domain_id,shipment_order_id"),
    @Index(name = "ix_shipment_order_items_1", columnList = "domain_id,shipment_order_id,sku_cd"),
    @Index(name = "ix_shipment_order_items_2", columnList = "domain_id,shipment_order_id,line_no"),
    @Index(name = "ix_shipment_order_items_3", columnList = "domain_id,shipment_order_id,barcode"),
    @Index(name = "ix_shipment_order_items_4", columnList = "domain_id,shipment_order_id,status")
})
public class ShipmentOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 1L;

    /**
     * 상태 - REGISTERED (등록)
     */
    public static final String STATUS_REGISTERED = "REGISTERED";

    /**
     * PK (UUID)
     */
    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    /**
     * 출하 주문 ID (FK → shipment_orders.id)
     */
    @Column(name = "shipment_order_id", nullable = false, length = 40)
    private String shipmentOrderId;

    /**
     * 라인 번호 (자동 채번)
     */
    @Column(name = "line_no", nullable = false, length = 5)
    private String lineNo;

    /**
     * 상품 코드
     */
    @Column(name = "sku_cd", nullable = false, length = 30)
    private String skuCd;

    /**
     * 상품명
     */
    @Column(name = "sku_nm", length = 100)
    private String skuNm;

    /**
     * 주문 수량
     */
    @Column(name = "order_qty", nullable = false)
    private Double orderQty;

    /**
     * 할당 수량
     */
    @Column(name = "alloc_qty")
    private Double allocQty;

    /**
     * 부족 수량
     */
    @Column(name = "short_qty")
    private Double shortQty;

    /**
     * 취소 수량
     */
    @Column(name = "cancel_qty")
    private Double cancelQty;

    /**
     * 출하 완료 수량
     */
    @Column(name = "shipped_qty")
    private Double shippedQty;

    /**
     * 단가
     */
    @Column(name = "unit_price")
    private Double unitPrice;

    /**
     * 바코드
     */
    @Column(name = "barcode", length = 50)
    private String barcode;

    /**
     * 유통기한 (YYYY-MM-DD)
     */
    @Column(name = "expired_date", length = 10)
    private String expiredDate;

    /**
     * 로트 번호
     */
    @Column(name = "lot_no", length = 50)
    private String lotNo;

    /**
     * 상태
     */
    @Column(name = "status", length = 20)
    private String status;

    /**
     * 비고
     */
    @Column(name = "remarks", length = 1000)
    private String remarks;

    /**
     * 확장 필드 1
     */
    @Column(name = "attr01", length = 100)
    private String attr01;

    /**
     * 확장 필드 2
     */
    @Column(name = "attr02", length = 100)
    private String attr02;

    /**
     * 확장 필드 3
     */
    @Column(name = "attr03", length = 100)
    private String attr03;

    /**
     * 확장 필드 4
     */
    @Column(name = "attr04", length = 100)
    private String attr04;

    /**
     * 확장 필드 5
     */
    @Column(name = "attr05", length = 100)
    private String attr05;

    public ShipmentOrderItem() {
    }

    public ShipmentOrderItem(String id) {
        this.id = id;
    }

    public ShipmentOrderItem(Long domainId, String shipmentOrderId) {
        this.domainId = domainId;
        this.shipmentOrderId = shipmentOrderId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getShipmentOrderId() {
        return shipmentOrderId;
    }

    public void setShipmentOrderId(String shipmentOrderId) {
        this.shipmentOrderId = shipmentOrderId;
    }

    public String getLineNo() {
        return lineNo;
    }

    public void setLineNo(String lineNo) {
        this.lineNo = lineNo;
    }

    public String getSkuCd() {
        return skuCd;
    }

    public void setSkuCd(String skuCd) {
        this.skuCd = skuCd;
    }

    public String getSkuNm() {
        return skuNm;
    }

    public void setSkuNm(String skuNm) {
        this.skuNm = skuNm;
    }

    public Double getOrderQty() {
        return orderQty;
    }

    public void setOrderQty(Double orderQty) {
        this.orderQty = orderQty;
    }

    public Double getAllocQty() {
        return allocQty;
    }

    public void setAllocQty(Double allocQty) {
        this.allocQty = allocQty;
    }

    public Double getShortQty() {
        return shortQty;
    }

    public void setShortQty(Double shortQty) {
        this.shortQty = shortQty;
    }

    public Double getCancelQty() {
        return cancelQty;
    }

    public void setCancelQty(Double cancelQty) {
        this.cancelQty = cancelQty;
    }

    public Double getShippedQty() {
        return shippedQty;
    }

    public void setShippedQty(Double shippedQty) {
        this.shippedQty = shippedQty;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getExpiredDate() {
        return expiredDate;
    }

    public void setExpiredDate(String expiredDate) {
        this.expiredDate = expiredDate;
    }

    public String getLotNo() {
        return lotNo;
    }

    public void setLotNo(String lotNo) {
        this.lotNo = lotNo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getAttr01() {
        return attr01;
    }

    public void setAttr01(String attr01) {
        this.attr01 = attr01;
    }

    public String getAttr02() {
        return attr02;
    }

    public void setAttr02(String attr02) {
        this.attr02 = attr02;
    }

    public String getAttr03() {
        return attr03;
    }

    public void setAttr03(String attr03) {
        this.attr03 = attr03;
    }

    public String getAttr04() {
        return attr04;
    }

    public void setAttr04(String attr04) {
        this.attr04 = attr04;
    }

    public String getAttr05() {
        return attr05;
    }

    public void setAttr05(String attr05) {
        this.attr05 = attr05;
    }

    @Override
    public void beforeCreate() {
        super.beforeCreate();

        // Line No 자동 채번
        if (ValueUtil.isEmpty(this.lineNo)) {
            IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
            String sql = "SELECT COALESCE(MAX(CAST(line_no AS INTEGER)), 0) + 1 FROM shipment_order_items WHERE domain_id = :domainId AND shipment_order_id = :shipmentOrderId";
            Integer nextLineNo = queryMgr.selectBySql(sql,
                ValueUtil.newMap("domainId,shipmentOrderId", this.domainId, this.shipmentOrderId),
                Integer.class);
            this.lineNo = ValueUtil.toString(nextLineNo);
        }

        // Status 기본값 설정
        if (ValueUtil.isEmpty(this.status)) {
            this.status = STATUS_REGISTERED;
        }

        // 수량 기본값 초기화
        if (this.allocQty == null) {
            this.allocQty = 0.0;
        }
        if (this.shortQty == null) {
            this.shortQty = 0.0;
        }
        if (this.cancelQty == null) {
            this.cancelQty = 0.0;
        }
        if (this.shippedQty == null) {
            this.shippedQty = 0.0;
        }
        if (this.unitPrice == null) {
            this.unitPrice = 0.0;
        }
    }
}
