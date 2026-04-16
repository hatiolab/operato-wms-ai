package operato.wms.stock.entity;

import java.util.UUID;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.entity.User;
import xyz.elidom.sys.util.OperatoDateUtil;
import xyz.elidom.sys.util.ValueUtil;
import xyz.elidom.util.BeanUtil;

@Table(name = "inventory_hists", idStrategy = GenerationRule.UUID, uniqueFields = "barcode,histSeq,domainId", indexes = {
		@Index(name = "ix_inventory_hists_0", columnList = "domain_id,barcode,hist_seq", unique = true),
		@Index(name = "ix_inventory_hists_1", columnList = "domain_id,wh_cd,com_cd"),
		@Index(name = "ix_inventory_hists_2", columnList = "domain_id,wh_cd,vend_cd,maker_cd"),
		@Index(name = "ix_inventory_hists_3", columnList = "domain_id,wh_cd,loc_cd"),
		@Index(name = "ix_inventory_hists_4", columnList = "domain_id,wh_cd,invoice_no"),
		@Index(name = "ix_inventory_hists_5", columnList = "domain_id,wh_cd,lot_no"),
		@Index(name = "ix_inventory_hists_6", columnList = "domain_id,wh_cd,expired_date"),
		@Index(name = "ix_inventory_hists_7", columnList = "domain_id,wh_cd,expire_status"),
		@Index(name = "ix_inventory_hists_8", columnList = "domain_id,wh_cd,status"),
		@Index(name = "ix_inventory_hists_9", columnList = "domain_id,last_tran_cd")
})
public class InventoryHist extends xyz.elidom.orm.entity.basic.DomainCreateStamp {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 189375711741828130L;

	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	@Column(name = "barcode", nullable = false, length = 40)
	private String barcode;

	@Column(name = "hist_seq", nullable = false)
	private Integer histSeq;

	@Column(name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	@Column(name = "sku_bcd", length = 50)
	private String skuBcd;

	@Column(name = "sku_nm")
	private String skuNm;

	@Column(name = "vend_cd", length = 30)
	private String vendCd;

	@Column(name = "maker_cd", length = 30)
	private String makerCd;

	@Column(name = "loc_cd", nullable = false, length = 30)
	private String locCd;

	@Column(name = "pallet_cd", length = 30)
	private String palletCd;

	@Column(name = "po_no", length = 30)
	private String poNo;

	@Column(name = "invoice_no", length = 30)
	private String invoiceNo;

	@Column(name = "rcv_no", length = 30)
	private String rcvNo;

	@Column(name = "rcv_seq")
	private Integer rcvSeq;

	@Column(name = "rls_ord_no", length = 30)
	private String rlsOrdNo;

	@Column(name = "rls_line_no", length = 30)
	private String rlsLineNo;

	@Column(name = "pack_type", length = 20)
	private String packType;

	@Column(name = "pack_no", length = 30)
	private String packNo;

	@Column(name = "origin", length = 10)
	private String origin;

	@Column(name = "lot_no", length = 50)
	private String lotNo;

	@Column(name = "serial_no", length = 50)
	private String serialNo;

	@Column(name = "expired_date", length = 10)
	private String expiredDate;

	@Column(name = "prod_date", length = 10)
	private String prodDate;

	@Column(name = "weight")
	private Double weight;

	@Column(name = "cbm")
	private Double cbm;

	@Column(name = "pallet_qty")
	private Integer palletQty;

	@Column(name = "box_qty")
	private Integer boxQty;

	@Column(name = "ea_qty")
	private Double eaQty;

	@Column(name = "reserved_qty")
	private Double reservedQty;

	@Column(name = "inv_qty", nullable = false)
	private Double invQty;

	@Column(name = "last_tran_cd", length = 20)
	private String lastTranCd;

	@Column(name = "expire_status", length = 10)
	private String expireStatus;

	@Column(name = "owner", length = 32)
	private String owner;

	@Column(name = "status", length = 10)
	private String status;

	@Column(name = "erp_status", length = 20)
	private String erpStatus;

	@Column(name = "remarks", length = 1000)
	private String remarks;

	@Column(name = "del_flag")
	private Boolean delFlag;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public Integer getHistSeq() {
		return histSeq;
	}

	public void setHistSeq(Integer histSeq) {
		this.histSeq = histSeq;
	}

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
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

	public String getSkuCd() {
		return skuCd;
	}

	public void setSkuCd(String skuCd) {
		this.skuCd = skuCd;
	}

	public String getSkuBcd() {
		return skuBcd;
	}

	public void setSkuBcd(String skuBcd) {
		this.skuBcd = skuBcd;
	}

	public String getSkuNm() {
		return skuNm;
	}

	public void setSkuNm(String skuNm) {
		this.skuNm = skuNm;
	}

	public String getVendCd() {
		return vendCd;
	}

	public void setVendCd(String vendCd) {
		this.vendCd = vendCd;
	}

	public String getMakerCd() {
		return makerCd;
	}

	public void setMakerCd(String makerCd) {
		this.makerCd = makerCd;
	}

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
	}

	public String getPalletCd() {
		return palletCd;
	}

	public void setPalletCd(String palletCd) {
		this.palletCd = palletCd;
	}

	public String getPoNo() {
		return poNo;
	}

	public void setPoNo(String poNo) {
		this.poNo = poNo;
	}

	public String getInvoiceNo() {
		return invoiceNo;
	}

	public void setInvoiceNo(String invoiceNo) {
		this.invoiceNo = invoiceNo;
	}

	public String getPackType() {
		return packType;
	}

	public void setPackType(String packType) {
		this.packType = packType;
	}

	public String getPackNo() {
		return packNo;
	}

	public void setPackNo(String packNo) {
		this.packNo = packNo;
	}

	public String getOrigin() {
		return origin;
	}

	public void setOrigin(String origin) {
		this.origin = origin;
	}

	public String getLotNo() {
		return lotNo;
	}

	public void setLotNo(String lotNo) {
		this.lotNo = lotNo;
	}

	public String getSerialNo() {
		return serialNo;
	}

	public void setSerialNo(String serialNo) {
		this.serialNo = serialNo;
	}

	public String getExpiredDate() {
		return expiredDate;
	}

	public void setExpiredDate(String expiredDate) {
		this.expiredDate = expiredDate;
	}

	public String getProdDate() {
		return prodDate;
	}

	public void setProdDate(String prodDate) {
		this.prodDate = prodDate;
	}

	public Double getWeight() {
		return weight;
	}

	public void setWeight(Double weight) {
		this.weight = weight;
	}

	public Double getCbm() {
		return cbm;
	}

	public void setCbm(Double cbm) {
		this.cbm = cbm;
	}

	public Integer getPalletQty() {
		return palletQty;
	}

	public void setPalletQty(Integer palletQty) {
		this.palletQty = palletQty;
	}

	public Integer getBoxQty() {
		return boxQty;
	}

	public void setBoxQty(Integer boxQty) {
		this.boxQty = boxQty;
	}

	public Double getEaQty() {
		return eaQty;
	}

	public void setEaQty(Double eaQty) {
		this.eaQty = eaQty;
	}

	public Double getReservedQty() {
		return reservedQty;
	}

	public void setReservedQty(Double reservedQty) {
		this.reservedQty = reservedQty;
	}

	public Double getInvQty() {
		return invQty;
	}

	public void setInvQty(Double invQty) {
		this.invQty = invQty;
	}

	public String getLastTranCd() {
		return lastTranCd;
	}

	public void setLastTranCd(String lastTranCd) {
		this.lastTranCd = lastTranCd;
	}

	public String getExpireStatus() {
		return expireStatus;
	}

	public void setExpireStatus(String expireStatus) {
		this.expireStatus = expireStatus;
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

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
	}

	public String getRcvNo() {
		return rcvNo;
	}

	public void setRcvNo(String rcvNo) {
		this.rcvNo = rcvNo;
	}

	public Integer getRcvSeq() {
		return rcvSeq;
	}

	public void setRcvSeq(Integer rcvSeq) {
		this.rcvSeq = rcvSeq;
	}

	public String getRlsOrdNo() {
		return rlsOrdNo;
	}

	public void setRlsOrdNo(String rlsOrdNo) {
		this.rlsOrdNo = rlsOrdNo;
	}

	public String getRlsLineNo() {
		return rlsLineNo;
	}

	public void setRlsLineNo(String rlsLineNo) {
		this.rlsLineNo = rlsLineNo;
	}

	public String getOwner() {
		return owner;
	}

	public void setOwner(String owner) {
		this.owner = owner;
	}

	public void create(Boolean save, Inventory inventory) {
		ValueUtil.populate(inventory, this);
		this.setId(UUID.randomUUID().toString());
		this.setDomainId(this.domainId == null ? Domain.currentDomainId() : this.domainId);

		String sql = "select max(hist_seq) from inventory_hists where domain_id = :domainId and barcode = :barcode";
		IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
		Integer maxSeq = queryMgr.selectBySql(sql,
				ValueUtil.newMap("domainId,barcode", this.getDomainId(), this.getBarcode()), Integer.class);

		this.setHistSeq(ValueUtil.toInteger(maxSeq, 0) + 1);
		this.setCreatorId(User.currentUser().getId());
		this.setCreatedAt(OperatoDateUtil.getDate());
		this.delFlag = false;

		if (save) {
			queryMgr.insert(this);
		}
	}
}
