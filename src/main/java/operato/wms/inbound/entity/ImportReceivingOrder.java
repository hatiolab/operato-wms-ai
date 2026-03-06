package operato.wms.inbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 입고 정보 임포트 모델
 * 
 * @author shortstop
 */
@Table(name = "import_receiving_orders", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class ImportReceivingOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 286856778440825026L;

    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    @Column(name = "rcv_no", nullable = false, length = 20)
    private String rcvNo;

    @Column(name = "rcv_req_no", length = 20)
    private String rcvReqNo;

    @Column(name = "rcv_req_date", nullable = false, length = 10)
    private String rcvReqDate;

    @Column(name = "rcv_type", nullable = false, length = 20)
    private String rcvType;

    @Column(name = "wh_cd", length = 20)
    private String whCd;

    @Column(name = "com_cd", length = 20)
    private String comCd;

    @Column(name = "vend_cd", length = 20)
    private String vendCd;

    @Column(name = "mgr_id", length = 32)
    private String mgrId;

    @Column(name = "car_no", length = 30)
    private String carNo;

    @Column(name = "driver_nm", length = 40)
    private String driverNm;

    @Column(name = "driver_tel", length = 20)
    private String driverTel;
    
    @Column (name = "total_box")
    private Integer totalBox;
    
    @Column (name = "box_wt")
    private Double boxWt;

    @Column(name = "remarks", length = 1000)
    private String remarks;

    @Column(name = "rcv_exp_seq", nullable = false)
    private Integer rcvExpSeq;

    @Column(name = "sku_cd", nullable = false, length = 30)
    private String skuCd;

    @Column(name = "sku_nm", length = 255)
    private String skuNm;

    @Column(name = "erp_part_no", length = 30)
    private String erpPartNo;

    @Column(name = "origin", length = 30)
    private String origin;

    @Column(name = "owner", length = 32)
    private String owner;

    @Column(name = "rcv_exp_date", nullable = false, length = 10)
    private String rcvExpDate;

    @Column(name = "total_exp_qty", nullable = false)
    private Float totalExpQty;

    @Column(name = "rcv_exp_qty", nullable = false)
    private Float rcvExpQty;

    @Column(name = "exp_pallet_qty")
    private Integer expPalletQty;

    @Column(name = "exp_box_qty")
    private Integer expBoxQty;

    @Column(name = "exp_ea_qty")
    private Float expEaQty;

    @Column(name = "loc_cd", length = 20)
    private String locCd;

    @Column(name = "item_type", length = 20)
    private String itemType;

    @Column(name = "insp_qty")
    private Float inspQty;

    @Column(name = "expired_date", length = 10)
    private String expiredDate;

    @Column(name = "prd_date", length = 10)
    private String prdDate;

    @Column(name = "lot_no", length = 30)
    private String lotNo;

    @Column(name = "barcode", length = 40)
    private String barcode;

    @Column(name = "invoice_no", length = 30)
    private String invoiceNo;

    @Column(name = "po_no", length = 30)
    private String poNo;

    @Column(name = "bl_no", length = 30)
    private String blNo;

    @Column(name = "item_remarks", length = 1000)
    private String itemRemarks;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRcvNo() {
        return rcvNo;
    }

    public void setRcvNo(String rcvNo) {
        this.rcvNo = rcvNo;
    }

    public String getRcvReqNo() {
        return rcvReqNo;
    }

    public void setRcvReqNo(String rcvReqNo) {
        this.rcvReqNo = rcvReqNo;
    }

    public String getRcvReqDate() {
        return rcvReqDate;
    }

    public void setRcvReqDate(String rcvReqDate) {
        this.rcvReqDate = rcvReqDate;
    }

    public String getRcvType() {
        return rcvType;
    }

    public void setRcvType(String rcvType) {
        this.rcvType = rcvType;
    }

    public String getWhCd() {
        return whCd;
    }

    public void setWhCd(String whCd) {
        this.whCd = whCd;
    }

    public String getComCd() {
        return comCd;
    }

    public void setComCd(String comCd) {
        this.comCd = comCd;
    }

    public String getVendCd() {
        return vendCd;
    }

    public void setVendCd(String vendCd) {
        this.vendCd = vendCd;
    }

    public String getMgrId() {
        return mgrId;
    }

    public void setMgrId(String mgrId) {
        this.mgrId = mgrId;
    }

    public String getCarNo() {
        return carNo;
    }

    public void setCarNo(String carNo) {
        this.carNo = carNo;
    }

    public String getDriverNm() {
        return driverNm;
    }

    public void setDriverNm(String driverNm) {
        this.driverNm = driverNm;
    }

    public String getDriverTel() {
        return driverTel;
    }

    public void setDriverTel(String driverTel) {
        this.driverTel = driverTel;
    }
    
    public Integer getTotalBox() {
		return totalBox;
	}

	public void setTotalBox(Integer totalBox) {
		this.totalBox = totalBox;
	}

	public Double getBoxWt() {
		return boxWt;
	}

	public void setBoxWt(Double boxWt) {
		this.boxWt = boxWt;
	}

	public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public Integer getRcvExpSeq() {
        return rcvExpSeq;
    }

    public void setRcvExpSeq(Integer rcvExpSeq) {
        this.rcvExpSeq = rcvExpSeq;
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

    public String getErpPartNo() {
        return erpPartNo;
    }

    public void setErpPartNo(String erpPartNo) {
        this.erpPartNo = erpPartNo;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public String getRcvExpDate() {
        return rcvExpDate;
    }

    public void setRcvExpDate(String rcvExpDate) {
        this.rcvExpDate = rcvExpDate;
    }

    public Float getTotalExpQty() {
        return totalExpQty;
    }

    public void setTotalExpQty(Float totalExpQty) {
        this.totalExpQty = totalExpQty;
    }

    public Float getRcvExpQty() {
        return rcvExpQty;
    }

    public void setRcvExpQty(Float rcvExpQty) {
        this.rcvExpQty = rcvExpQty;
    }

    public Integer getExpPalletQty() {
        return expPalletQty;
    }

    public void setExpPalletQty(Integer expPalletQty) {
        this.expPalletQty = expPalletQty;
    }

    public Integer getExpBoxQty() {
        return expBoxQty;
    }

    public void setExpBoxQty(Integer expBoxQty) {
        this.expBoxQty = expBoxQty;
    }

    public Float getExpEaQty() {
        return expEaQty;
    }

    public void setExpEaQty(Float expEaQty) {
        this.expEaQty = expEaQty;
    }

    public String getLocCd() {
        return locCd;
    }

    public void setLocCd(String locCd) {
        this.locCd = locCd;
    }

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
        this.itemType = itemType;
    }

    public Float getInspQty() {
        return inspQty;
    }

    public void setInspQty(Float inspQty) {
        this.inspQty = inspQty;
    }

    public String getExpiredDate() {
        return expiredDate;
    }

    public void setExpiredDate(String expiredDate) {
        this.expiredDate = expiredDate;
    }

    public String getPrdDate() {
        return prdDate;
    }

    public void setPrdDate(String prdDate) {
        this.prdDate = prdDate;
    }

    public String getLotNo() {
        return lotNo;
    }

    public void setLotNo(String lotNo) {
        this.lotNo = lotNo;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getInvoiceNo() {
        return invoiceNo;
    }

    public void setInvoiceNo(String invoiceNo) {
        this.invoiceNo = invoiceNo;
    }

    public String getPoNo() {
        return poNo;
    }

    public void setPoNo(String poNo) {
        this.poNo = poNo;
    }

    public String getBlNo() {
        return blNo;
    }

    public void setBlNo(String blNo) {
        this.blNo = blNo;
    }

    public String getItemRemarks() {
        return itemRemarks;
    }

    public void setItemRemarks(String itemRemarks) {
        this.itemRemarks = itemRemarks;
    }
}
