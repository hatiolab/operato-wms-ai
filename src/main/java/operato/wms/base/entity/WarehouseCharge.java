package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Relation;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.sys.entity.relation.UserRef;

@Table(name = "warehouse_charges", idStrategy = GenerationRule.UUID, uniqueFields="whCd,comCd,chargeNo,skuCd,ioType,chargeType,domainId", indexes = {
	@Index(name = "ix_warehouse_charges_0", columnList = "wh_cd,com_cd,charge_no,sku_cd,io_type,charge_type,domain_id", unique = true),
	@Index(name = "ix_warehouse_charges_1", columnList = "domain_id,charge_date"),
	@Index(name = "ix_warehouse_charges_2", columnList = "domain_id,io_type,charge_date"),
	@Index(name = "ix_warehouse_charges_3", columnList = "domain_id,charge_date,end_year,end_month"),
	@Index(name = "ix_warehouse_charges_4", columnList = "domain_id,charge_date,end_year"),
	@Index(name = "ix_warehouse_charges_5", columnList = "domain_id,io_type,charge_type,charge_date"),
	@Index(name = "ix_warehouse_charges_6", columnList = "domain_id,io_type,charge_type,charge_date,end_year"),
	@Index(name = "ix_warehouse_charges_7", columnList = "domain_id,io_type,charge_type,end_year,end_month"),
	@Index(name = "ix_warehouse_charges_8", columnList = "domain_id,end_year"),
	@Index(name = "ix_warehouse_charges_9", columnList = "domain_id,end_year,end_month")
})
public class WarehouseCharge extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 864134456880106168L;
	
	/**
     * io_type - INBOUND (입고)
     */
    public static final String IO_TYPE_INBOUND = "INBOUND";
    
    /**
     * io_type - OUTBOUND (출고)
     */
    public static final String IO_TYPE_OUTBOUND = "OUTBOUND";
    
    /**
	 * 상태 : 대기 
	 */
	public static final String STATUS_READY = "READY";
	
	/**
	 * 상태 : 마감 
	 */
	public static final String STATUS_END = "END";
    
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "wh_cd", nullable = false, length = 20)
	private String whCd;

	@Column (name = "com_cd", nullable = false, length = 20)
	private String comCd;

	@Column (name = "cust_cd", length = 20)
	private String custCd;
	
	@Column (name = "cust_nm", length = 100)
	private String custNm;

	@Column (name = "vend_cd", length = 20)
	private String vendCd;
	
	@Column (name = "vend_nm", length = 100)
	private String vendNm;

	@Column (name = "charge_no", nullable = false, length = 20)
	private String chargeNo;

	@Column (name = "io_type", nullable = false, length = 20)
	private String ioType;

	@Column (name = "charge_type", nullable = false, length = 20)
	private String chargeType;

	@Column (name = "charge_date", nullable = false, length = 10)
	private String chargeDate;
	
	@Column (name = "sku_cd", length = 30)
	private String skuCd;

	@Column (name = "sku_nm", length = 200)
	private String skuNm;
	
	@Column (name = "unit_price")
	private Double unitPrice;
	
	@Column (name = "qty")
	private Double qty;
	
	@Column (name = "commision")
	private Double commision;

	@Column (name = "mgr_id", length = 32)
	private String mgrId;

	@Relation(field = "mgrId")
	private UserRef mgr;

	@Column (name = "requester", length = 32)
	private String requester;

	@Column (name = "shipping_type", length = 20)
	private String shippingType;

	@Column (name = "delivery_type", length = 20)
	private String deliveryType;

	@Column (name = "delivery_from", length = 20)
	private String deliveryFrom;

	@Column (name = "delivery_to", length = 20)
	private String deliveryTo;

	@Column (name = "total_box")
    private Integer totalBox;
	
    @Column (name = "box_wt")
    private Double boxWt;

	@Column (name = "total_charge")
	private Double totalCharge;

	@Column (name = "forwarder", length = 100)
	private String forwarder;

	@Column (name = "remarks", length = 1000)
	private String remarks;
	
	@Column (name = "end_year", length = 4)
	private String endYear;
	
	@Column (name = "end_month", length = 2)
	private String endMonth;
	
	@Column (name = "status", length = 20)
	private String status;
	
	@Column (name = "erp_status", length = 20)
	private String erpStatus;

	@Column (name = "charge01")
	private Double charge01;

	@Column (name = "charge02")
	private Double charge02;

	@Column (name = "charge03")
	private Double charge03;

	@Column (name = "charge04")
	private Double charge04;

	@Column (name = "charge05")
	private Double charge05;

	@Column (name = "charge06")
	private Double charge06;

	@Column (name = "charge07")
	private Double charge07;

	@Column (name = "charge08")
	private Double charge08;

	@Column (name = "charge09")
	private Double charge09;

	@Column (name = "charge10")
	private Double charge10;
	
	@Column (name = "attr01", length = 500)
    private String attr01;

    @Column (name = "attr02", length = 100)
    private String attr02;

    @Column (name = "attr03", length = 100)
    private String attr03;

    @Column (name = "attr04", length = 100)
    private String attr04;

    @Column (name = "attr05", length = 100)
    private String attr05;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
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
	
	public String getCustCd() {
		return custCd;
	}

	public void setCustCd(String custCd) {
		this.custCd = custCd;
	}
	
	public String getCustNm() {
		return custNm;
	}

	public void setCustNm(String custNm) {
		this.custNm = custNm;
	}

	public String getVendCd() {
		return vendCd;
	}

	public void setVendCd(String vendCd) {
		this.vendCd = vendCd;
	}
	
	public String getVendNm() {
		return vendNm;
	}

	public void setVendNm(String vendNm) {
		this.vendNm = vendNm;
	}

	public String getChargeNo() {
		return chargeNo;
	}

	public void setChargeNo(String chargeNo) {
		this.chargeNo = chargeNo;
	}

	public String getIoType() {
		return ioType;
	}

	public void setIoType(String ioType) {
		this.ioType = ioType;
	}

	public String getChargeType() {
		return chargeType;
	}

	public void setChargeType(String chargeType) {
		this.chargeType = chargeType;
	}

	public String getChargeDate() {
		return chargeDate;
	}

	public void setChargeDate(String chargeDate) {
		this.chargeDate = chargeDate;
	}

	public String getMgrId() {
		return mgrId;
	}

	public void setMgrId(String mgrId) {
		this.mgrId = mgrId;
	}

	public UserRef getMgr() {
		return mgr;
	}

	public void setMgr(UserRef mgr) {
		this.mgr = mgr;

		if(this.mgr != null) {
			String refId = this.mgr.getId();
			if (refId != null)
				this.mgrId = refId;
		}
	
		if(this.mgrId == null) {
			this.mgrId = "";
		}
	}

	public String getRequester() {
		return requester;
	}

	public void setRequester(String requester) {
		this.requester = requester;
	}

	public String getShippingType() {
		return shippingType;
	}

	public void setShippingType(String shippingType) {
		this.shippingType = shippingType;
	}

	public String getDeliveryType() {
		return deliveryType;
	}

	public void setDeliveryType(String deliveryType) {
		this.deliveryType = deliveryType;
	}

	public String getDeliveryFrom() {
		return deliveryFrom;
	}

	public void setDeliveryFrom(String deliveryFrom) {
		this.deliveryFrom = deliveryFrom;
	}

	public String getDeliveryTo() {
		return deliveryTo;
	}

	public void setDeliveryTo(String deliveryTo) {
		this.deliveryTo = deliveryTo;
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

	public Double getTotalCharge() {
		return totalCharge;
	}

	public void setTotalCharge(Double totalCharge) {
		this.totalCharge = totalCharge;
	}

	public String getForwarder() {
		return forwarder;
	}

	public void setForwarder(String forwarder) {
		this.forwarder = forwarder;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public Double getCharge01() {
		return charge01;
	}

	public void setCharge01(Double charge01) {
		this.charge01 = charge01;
	}

	public Double getCharge02() {
		return charge02;
	}

	public void setCharge02(Double charge02) {
		this.charge02 = charge02;
	}

	public Double getCharge03() {
		return charge03;
	}

	public void setCharge03(Double charge03) {
		this.charge03 = charge03;
	}

	public Double getCharge04() {
		return charge04;
	}

	public void setCharge04(Double charge04) {
		this.charge04 = charge04;
	}

	public Double getCharge05() {
		return charge05;
	}

	public void setCharge05(Double charge05) {
		this.charge05 = charge05;
	}

	public Double getCharge06() {
		return charge06;
	}

	public void setCharge06(Double charge06) {
		this.charge06 = charge06;
	}

	public Double getCharge07() {
		return charge07;
	}

	public void setCharge07(Double charge07) {
		this.charge07 = charge07;
	}

	public Double getCharge08() {
		return charge08;
	}

	public void setCharge08(Double charge08) {
		this.charge08 = charge08;
	}

	public Double getCharge09() {
		return charge09;
	}

	public void setCharge09(Double charge09) {
		this.charge09 = charge09;
	}

	public Double getCharge10() {
		return charge10;
	}

	public void setCharge10(Double charge10) {
		this.charge10 = charge10;
	}
	
	public String getEndYear() {
		return endYear;
	}

	public void setEndYear(String endYear) {
		this.endYear = endYear;
	}

	public String getEndMonth() {
		return endMonth;
	}

	public void setEndMonth(String endMonth) {
		this.endMonth = endMonth;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getErpStatus() {
		return erpStatus;
	}

	public void setErpStatus(String erpStatus) {
		this.erpStatus = erpStatus;
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

	public Double getUnitPrice() {
		return unitPrice;
	}

	public void setUnitPrice(Double unitPrice) {
		this.unitPrice = unitPrice;
	}

	public Double getQty() {
		return qty;
	}

	public void setQty(Double qty) {
		this.qty = qty;
	}

	public Double getCommision() {
		return commision;
	}

	public void setCommision(Double commision) {
		this.commision = commision;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();
		
		this.status = (this.status == null) ? STATUS_READY : this.status;
		this.totalBox = (this.totalBox == null) ? 0 : this.totalBox;
		this.boxWt = (this.boxWt == null) ? 0.0f : this.boxWt;
		this.charge01 = (this.charge01 == null) ? 0.0 : this.charge01;
		this.charge02 = (this.charge02 == null) ? 0.0 : this.charge02;
		this.charge03 = (this.charge03 == null) ? 0.0 : this.charge03;
		this.charge04 = (this.charge04 == null) ? 0.0 : this.charge04;
		this.charge05 = (this.charge05 == null) ? 0.0 : this.charge05;
		this.charge06 = (this.charge06 == null) ? 0.0 : this.charge06;
		this.charge07 = (this.charge07 == null) ? 0.0 : this.charge07;
		this.charge08 = (this.charge08 == null) ? 0.0 : this.charge08;
		this.charge09 = (this.charge09 == null) ? 0.0 : this.charge09;
		this.charge10 = (this.charge10 == null) ? 0.0 : this.charge10;
		this.totalCharge = this.charge01 + this.charge02 + this.charge03 + this.charge04 + this.charge05 + this.charge06 + this.charge07 + this.charge08 + this.charge09 + this.charge10;
	}

	@Override
	public void beforeUpdate() {
		super.beforeUpdate();
		
		this.charge01 = (this.charge01 == null) ? 0.0 : this.charge01;
		this.charge02 = (this.charge02 == null) ? 0.0 : this.charge02;
		this.charge03 = (this.charge03 == null) ? 0.0 : this.charge03;
		this.charge04 = (this.charge04 == null) ? 0.0 : this.charge04;
		this.charge05 = (this.charge05 == null) ? 0.0 : this.charge05;
		this.charge06 = (this.charge06 == null) ? 0.0 : this.charge06;
		this.charge07 = (this.charge07 == null) ? 0.0 : this.charge07;
		this.charge08 = (this.charge08 == null) ? 0.0 : this.charge08;
		this.charge09 = (this.charge09 == null) ? 0.0 : this.charge09;
		this.charge10 = (this.charge10 == null) ? 0.0 : this.charge10;
		
		this.totalCharge = this.charge01 + this.charge02 + this.charge03 + this.charge04 + this.charge05 + this.charge06 + this.charge07 + this.charge08 + this.charge09 + this.charge10;
	}
	
}
