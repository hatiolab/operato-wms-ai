package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "delivery_infos", idStrategy = GenerationRule.UUID, uniqueFields="rlsOrdNo,domainId", indexes = {
	@Index(name = "ix_delivery_infos_0", columnList = "release_order_id,domain_id", unique = true),
	@Index(name = "ix_delivery_infos_1", columnList = "rls_ord_no,domain_id", unique = true),
	@Index(name = "ix_delivery_infos_2", columnList =  "dlv_type,domain_id"),
	@Index(name = "ix_delivery_infos_3", columnList =  "dlv_no,domain_id"),
	@Index(name = "ix_delivery_infos_4", columnList =  "invoice_no,domain_id"),
	@Index(name = "ix_delivery_infos_5", columnList =  "export_flag,domain_id")
})
public class DeliveryInfo extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 906709188538273150L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "release_order_id", nullable = false, length = 40)
	private String releaseOrderId;

	@Column (name = "rls_ord_no", nullable = false, length = 30)
	private String rlsOrdNo;

	@Column (name = "dlv_type", length = 20)
	private String dlvType;

	@Column (name = "export_flag")
	private Boolean exportFlag;

	@Column (name = "dlv_vend_cd", length = 30)
	private String dlvVendCd;

	@Column (name = "vehicle_no", length = 30)
	private String vehicleNo;

	@Column (name = "dlv_no", length = 30)
	private String dlvNo;

	@Column (name = "invoice_no", length = 30)
	private String invoiceNo;

	@Column (name = "sender_cd", length = 30)
	private String senderCd;

	@Column (name = "sender_nm", length = 100)
	private String senderNm;

	@Column (name = "sender_phone", length = 20)
	private String senderPhone;

	@Column (name = "sender_phone2", length = 20)
	private String senderPhone2;

	@Column (name = "sender_zip_cd", length = 20)
	private String senderZipCd;

	@Column (name = "sender_addr")
	private String senderAddr;

	@Column (name = "sender_addr2")
	private String senderAddr2;

	@Column (name = "orderer_cd", length = 30)
	private String ordererCd;

	@Column (name = "orderer_nm", length = 100)
	private String ordererNm;

	@Column (name = "receiver_cd", length = 30)
	private String receiverCd;

	@Column (name = "receiver_nm", length = 100)
	private String receiverNm;

	@Column (name = "receiver_phone", length = 20)
	private String receiverPhone;

	@Column (name = "receiver_phone2", length = 20)
	private String receiverPhone2;

	@Column (name = "receiver_zip_cd", length = 20)
	private String receiverZipCd;

	@Column (name = "receiver_addr")
	private String receiverAddr;

	@Column (name = "receiver_addr2")
	private String receiverAddr2;

	@Column (name = "assort1_cd", length = 30)
	private String assort1Cd;

	@Column (name = "assort2_cd", length = 30)
	private String assort2Cd;

	@Column (name = "assort3_cd", length = 30)
	private String assort3Cd;

	@Column (name = "delivery_info_set", length = 2000)
	private String deliveryInfoSet;

	@Column (name = "memo", length = 100)
	private String memo;

	@Column (name = "remarks", length = 1000)
	private String remarks;

	@Column (name = "attr01", length = 100)
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

	public String getReleaseOrderId() {
		return releaseOrderId;
	}

	public void setReleaseOrderId(String releaseOrderId) {
		this.releaseOrderId = releaseOrderId;
	}

	public String getRlsOrdNo() {
		return rlsOrdNo;
	}

	public void setRlsOrdNo(String rlsOrdNo) {
		this.rlsOrdNo = rlsOrdNo;
	}

	public String getDlvType() {
		return dlvType;
	}

	public void setDlvType(String dlvType) {
		this.dlvType = dlvType;
	}

	public Boolean getExportFlag() {
		return exportFlag;
	}

	public void setExportFlag(Boolean exportFlag) {
		this.exportFlag = exportFlag;
	}

	public String getDlvVendCd() {
		return dlvVendCd;
	}

	public void setDlvVendCd(String dlvVendCd) {
		this.dlvVendCd = dlvVendCd;
	}

	public String getVehicleNo() {
		return vehicleNo;
	}

	public void setVehicleNo(String vehicleNo) {
		this.vehicleNo = vehicleNo;
	}

	public String getDlvNo() {
		return dlvNo;
	}

	public void setDlvNo(String dlvNo) {
		this.dlvNo = dlvNo;
	}

	public String getInvoiceNo() {
		return invoiceNo;
	}

	public void setInvoiceNo(String invoiceNo) {
		this.invoiceNo = invoiceNo;
	}

	public String getSenderCd() {
		return senderCd;
	}

	public void setSenderCd(String senderCd) {
		this.senderCd = senderCd;
	}

	public String getSenderNm() {
		return senderNm;
	}

	public void setSenderNm(String senderNm) {
		this.senderNm = senderNm;
	}

	public String getSenderPhone() {
		return senderPhone;
	}

	public void setSenderPhone(String senderPhone) {
		this.senderPhone = senderPhone;
	}

	public String getSenderPhone2() {
		return senderPhone2;
	}

	public void setSenderPhone2(String senderPhone2) {
		this.senderPhone2 = senderPhone2;
	}

	public String getSenderZipCd() {
		return senderZipCd;
	}

	public void setSenderZipCd(String senderZipCd) {
		this.senderZipCd = senderZipCd;
	}

	public String getSenderAddr() {
		return senderAddr;
	}

	public void setSenderAddr(String senderAddr) {
		this.senderAddr = senderAddr;
	}

	public String getSenderAddr2() {
		return senderAddr2;
	}

	public void setSenderAddr2(String senderAddr2) {
		this.senderAddr2 = senderAddr2;
	}

	public String getOrdererCd() {
		return ordererCd;
	}

	public void setOrdererCd(String ordererCd) {
		this.ordererCd = ordererCd;
	}

	public String getOrdererNm() {
		return ordererNm;
	}

	public void setOrdererNm(String ordererNm) {
		this.ordererNm = ordererNm;
	}

	public String getReceiverCd() {
		return receiverCd;
	}

	public void setReceiverCd(String receiverCd) {
		this.receiverCd = receiverCd;
	}

	public String getReceiverNm() {
		return receiverNm;
	}

	public void setReceiverNm(String receiverNm) {
		this.receiverNm = receiverNm;
	}

	public String getReceiverPhone() {
		return receiverPhone;
	}

	public void setReceiverPhone(String receiverPhone) {
		this.receiverPhone = receiverPhone;
	}

	public String getReceiverPhone2() {
		return receiverPhone2;
	}

	public void setReceiverPhone2(String receiverPhone2) {
		this.receiverPhone2 = receiverPhone2;
	}

	public String getReceiverZipCd() {
		return receiverZipCd;
	}

	public void setReceiverZipCd(String receiverZipCd) {
		this.receiverZipCd = receiverZipCd;
	}

	public String getReceiverAddr() {
		return receiverAddr;
	}

	public void setReceiverAddr(String receiverAddr) {
		this.receiverAddr = receiverAddr;
	}

	public String getReceiverAddr2() {
		return receiverAddr2;
	}

	public void setReceiverAddr2(String receiverAddr2) {
		this.receiverAddr2 = receiverAddr2;
	}

	public String getAssort1Cd() {
		return assort1Cd;
	}

	public void setAssort1Cd(String assort1Cd) {
		this.assort1Cd = assort1Cd;
	}

	public String getAssort2Cd() {
		return assort2Cd;
	}

	public void setAssort2Cd(String assort2Cd) {
		this.assort2Cd = assort2Cd;
	}

	public String getAssort3Cd() {
		return assort3Cd;
	}

	public void setAssort3Cd(String assort3Cd) {
		this.assort3Cd = assort3Cd;
	}

	public String getDeliveryInfoSet() {
		return deliveryInfoSet;
	}

	public void setDeliveryInfoSet(String deliveryInfoSet) {
		this.deliveryInfoSet = deliveryInfoSet;
	}

	public String getMemo() {
		return memo;
	}

	public void setMemo(String memo) {
		this.memo = memo;
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
}
