package operato.wms.inbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
CREATE OR REPLACE VIEW receiving_order_status AS
select
    ri.id, r.rcv_no, r.rcv_req_no, r.rcv_req_date, r.rcv_end_date, 
    r.status, r.rcv_type, r.wh_cd, r.com_cd, r.vend_cd, r.mgr_id, 
    r.insp_flag, r.label_flag, r.total_box, r.box_wt, r.car_no, 
    r.driver_nm, r.driver_tel, r.remarks, ri.rcv_exp_seq, 
    ri.rcv_seq, ri.status as item_status, ri.sku_cd, ri.sku_nm, 
    ri.erp_part_no, ri.origin, ri.rcv_exp_date, ri.rcv_date, 
    ri.total_exp_qty, ri.rcv_exp_qty, ri.exp_pallet_qty, 
    ri.exp_box_qty, ri.exp_ea_qty, ri.rcv_qty, ri.rcv_box_qty, 
    ri.rcv_pallet_qty, ri.rcv_ea_qty, ri.loc_cd, ri.item_type, 
    ri.insp_qty, ri.expired_date, ri.prd_date, ri.lot_no, ri.po_no, 
    ri.invoice_no, ri.bl_no, ri.barcode, ri.owner, 
    ri.remarks as item_remarks, ri.domain_id, ri.created_at, ri.updated_at
from 
    receivings r
    inner join
    receiving_items ri on r.id = ri.receiving_id
order by
    ri.created_at desc
 */
/**
 * 입고 주문 헤더 & 디테일 복합 엔티티 (뷰)
 * 
 * @author shortstop
 */
@Table(name = "receiving_order_status", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class ReceivingOrderStatus extends xyz.elidom.orm.entity.basic.DomainTimeStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 606119921045128366L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "rcv_no", nullable = false, length = 20)
	private String rcvNo;

	@Column (name = "rcv_req_no", length = 20)
	private String rcvReqNo;

	@Column (name = "rcv_req_date", nullable = false, length = 10)
	private String rcvReqDate;

	@Column (name = "rcv_end_date", length = 10)
	private String rcvEndDate;

	@Column (name = "status", length = 20)
	private String status;

	@Column (name = "rcv_type", nullable = false, length = 20)
	private String rcvType;

	@Column (name = "wh_cd", length = 20)
	private String whCd;

	@Column (name = "com_cd", length = 20)
	private String comCd;

	@Column (name = "vend_cd", length = 20)
	private String vendCd;
	
    @Column (name = "mgr_id", length = 32)
    private String mgrId;

	@Column (name = "insp_flag", length = 50)
	private Boolean inspFlag;

	@Column (name = "label_flag", length = 50)
	private Boolean labelFlag;

    @Column (name = "total_box")
    private Integer totalBox;
    
    @Column (name = "box_wt")
    private Double boxWt;
    
	@Column (name = "car_no", length = 30)
	private String carNo;

	@Column (name = "driver_nm", length = 40)
	private String driverNm;

	@Column (name = "driver_tel", length = 20)
	private String driverTel;
    
	@Column (name = "remarks", length = 1000)
	private String remarks;

	@Column (name = "rcv_exp_seq", nullable = false)
	private Integer rcvExpSeq;

	@Column (name = "rcv_seq", nullable = false)
	private Integer rcvSeq;

	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;
	
    @Column (name = "sku_nm", length = 255)
    private String skuNm;

	@Column (name = "erp_part_no", length = 30)
	private String erpPartNo;

	@Column (name = "origin", length = 30)
	private String origin;

	@Column (name = "owner", length = 32)
	private String owner;

	@Column (name = "rcv_exp_date", nullable = false, length = 10)
	private String rcvExpDate;

	@Column (name = "rcv_date", length = 10)
	private String rcvDate;

	@Column (name = "total_exp_qty", nullable = false)
	private Double totalExpQty;

	@Column (name = "rcv_exp_qty", nullable = false)
	private Double rcvExpQty;

	@Column (name = "exp_pallet_qty")
	private Integer expPalletQty;

	@Column (name = "exp_box_qty")
	private Integer expBoxQty;

	@Column (name = "exp_ea_qty")
	private Double expEaQty;

	@Column (name = "rcv_qty")
	private Double rcvQty;

	@Column (name = "rcv_pallet_qty")
	private Integer rcvPalletQty;

	@Column (name = "rcv_box_qty")
	private Integer rcvBoxQty;

	@Column (name = "rcv_ea_qty")
	private Double rcvEaQty;

	@Column (name = "loc_cd", length = 20)
	private String locCd;

	@Column (name = "item_type", length = 20)
	private String itemType;

	@Column (name = "insp_qty")
	private Double inspQty;

	@Column (name = "expired_date", length = 10)
	private String expiredDate;

	@Column (name = "prd_date", length = 10)
	private String prdDate;

	@Column (name = "lot_no", length = 30)
	private String lotNo;

	@Column (name = "barcode", length = 40)
	private String barcode;

	@Column (name = "invoice_no", length = 30)
	private String invoiceNo;

	@Column (name = "bl_no", length = 30)
	private String blNo;
	
    @Column (name = "po_no", length = 30)
    private String poNo;

	@Column (name = "item_status", length = 10)
	private String itemStatus;

	@Column (name = "item_remarks", length = 1000)
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

	public String getRcvEndDate() {
		return rcvEndDate;
	}

	public void setRcvEndDate(String rcvEndDate) {
		this.rcvEndDate = rcvEndDate;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
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

    public Boolean getInspFlag() {
		return inspFlag;
	}

	public void setInspFlag(Boolean inspFlag) {
		this.inspFlag = inspFlag;
	}

	public Boolean getLabelFlag() {
		return labelFlag;
	}

	public void setLabelFlag(Boolean labelFlag) {
		this.labelFlag = labelFlag;
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

	public Integer getRcvSeq() {
		return rcvSeq;
	}

	public void setRcvSeq(Integer rcvSeq) {
		this.rcvSeq = rcvSeq;
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

	public String getRcvDate() {
		return rcvDate;
	}

	public void setRcvDate(String rcvDate) {
		this.rcvDate = rcvDate;
	}

	public Double getTotalExpQty() {
		return totalExpQty;
	}

	public void setTotalExpQty(Double totalExpQty) {
		this.totalExpQty = totalExpQty;
	}

	public Double getRcvExpQty() {
		return rcvExpQty;
	}

	public void setRcvExpQty(Double rcvExpQty) {
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

	public Double getExpEaQty() {
		return expEaQty;
	}

	public void setExpEaQty(Double expEaQty) {
		this.expEaQty = expEaQty;
	}

	public Double getRcvQty() {
		return rcvQty;
	}

	public void setRcvQty(Double rcvQty) {
		this.rcvQty = rcvQty;
	}

	public Integer getRcvPalletQty() {
		return rcvPalletQty;
	}

	public void setRcvPalletQty(Integer rcvPalletQty) {
		this.rcvPalletQty = rcvPalletQty;
	}

	public Integer getRcvBoxQty() {
		return rcvBoxQty;
	}

	public void setRcvBoxQty(Integer rcvBoxQty) {
		this.rcvBoxQty = rcvBoxQty;
	}

	public Double getRcvEaQty() {
		return rcvEaQty;
	}

	public void setRcvEaQty(Double rcvEaQty) {
		this.rcvEaQty = rcvEaQty;
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

	public Double getInspQty() {
		return inspQty;
	}

	public void setInspQty(Double inspQty) {
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

	public String getBlNo() {
		return blNo;
	}

	public void setBlNo(String blNo) {
		this.blNo = blNo;
	}

	public String getPoNo() {
        return poNo;
    }

    public void setPoNo(String poNo) {
        this.poNo = poNo;
    }

    public String getItemStatus() {
        return itemStatus;
    }

    public void setItemStatus(String itemStatus) {
        this.itemStatus = itemStatus;
    }

    public String getItemRemarks() {
        return itemRemarks;
    }

    public void setItemRemarks(String itemRemarks) {
        this.itemRemarks = itemRemarks;
    }
}
