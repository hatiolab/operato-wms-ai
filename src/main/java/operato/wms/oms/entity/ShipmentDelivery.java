package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * 배송 정보
 *
 * @author HatioLab
 */
@Table(name = "shipment_deliveries", idStrategy = GenerationRule.UUID, uniqueFields="domainId,shipmentOrderId", indexes = {
	@Index(name = "ix_shipment_deliveries_0", columnList = "domain_id,shipment_order_id", unique = true),
	@Index(name = "ix_shipment_deliveries_1", columnList = "domain_id,shipment_no", unique = true),
	@Index(name = "ix_shipment_deliveries_2", columnList = "domain_id,carrier_cd"),
	@Index(name = "ix_shipment_deliveries_3", columnList = "domain_id,invoice_no"),
	@Index(name = "ix_shipment_deliveries_4", columnList = "domain_id,receiver_phone")
})
public class ShipmentDelivery extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 906709188538273151L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 출하 주문 ID (FK → shipment_orders.id)
	 */
	@Column (name = "shipment_order_id", nullable = false, length = 40)
	private String shipmentOrderId;

	/**
	 * 출하 번호
	 */
	@Column (name = "shipment_no", nullable = false, length = 30)
	private String shipmentNo;

	/**
	 * 배송 유형 (STANDARD/EXPRESS/SAME_DAY/DAWN)
	 */
	@Column (name = "dlv_type", length = 20)
	private String dlvType;

	/**
	 * 택배사 코드
	 */
	@Column (name = "carrier_cd", length = 30)
	private String carrierCd;

	/**
	 * 택배 서비스 유형 (STANDARD/EXPRESS/COLD_CHAIN/BULKY)
	 */
	@Column (name = "carrier_service_type", length = 20)
	private String carrierServiceType;

	/**
	 * 차량 번호
	 */
	@Column (name = "vehicle_no", length = 30)
	private String vehicleNo;

	/**
	 * 송장 번호
	 */
	@Column (name = "invoice_no", length = 30)
	private String invoiceNo;

	/**
	 * 배송비
	 */
	@Column (name = "shipping_fee")
	private Double shippingFee;

	/**
	 * 발송인 코드
	 */
	@Column (name = "sender_cd", length = 30)
	private String senderCd;

	/**
	 * 발송인명
	 */
	@Column (name = "sender_nm", length = 100)
	private String senderNm;

	/**
	 * 발송인 전화번호
	 */
	@Column (name = "sender_phone", length = 20)
	private String senderPhone;

	/**
	 * 발송인 전화번호 2
	 */
	@Column (name = "sender_phone2", length = 20)
	private String senderPhone2;

	/**
	 * 발송인 우편번호
	 */
	@Column (name = "sender_zip_cd", length = 20)
	private String senderZipCd;

	/**
	 * 발송인 주소
	 */
	@Column (name = "sender_addr", length = 200)
	private String senderAddr;

	/**
	 * 발송인 상세주소
	 */
	@Column (name = "sender_addr2", length = 200)
	private String senderAddr2;

	/**
	 * 주문자 코드
	 */
	@Column (name = "orderer_cd", length = 30)
	private String ordererCd;

	/**
	 * 주문자명
	 */
	@Column (name = "orderer_nm", length = 100)
	private String ordererNm;

	/**
	 * 주문자 전화번호
	 */
	@Column (name = "orderer_phone", length = 20)
	private String ordererPhone;

	/**
	 * 수취인 코드
	 */
	@Column (name = "receiver_cd", length = 30)
	private String receiverCd;

	/**
	 * 수취인명
	 */
	@Column (name = "receiver_nm", length = 100)
	private String receiverNm;

	/**
	 * 수취인 전화번호
	 */
	@Column (name = "receiver_phone", length = 20)
	private String receiverPhone;

	/**
	 * 수취인 전화번호 2
	 */
	@Column (name = "receiver_phone2", length = 20)
	private String receiverPhone2;

	/**
	 * 수취인 우편번호
	 */
	@Column (name = "receiver_zip_cd", length = 20)
	private String receiverZipCd;

	/**
	 * 수취인 주소
	 */
	@Column (name = "receiver_addr", length = 200)
	private String receiverAddr;

	/**
	 * 수취인 상세주소
	 */
	@Column (name = "receiver_addr2", length = 200)
	private String receiverAddr2;

	/**
	 * 배송 메모
	 */
	@Column (name = "delivery_memo", length = 500)
	private String deliveryMemo;

	/**
	 * 배송 정보 세트 (JSON)
	 */
	@Column (name = "delivery_info_set", length = 2000)
	private String deliveryInfoSet;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 1000)
	private String remarks;

	/**
	 * 확장 필드 1
	 */
	@Column (name = "attr01", length = 100)
	private String attr01;

	/**
	 * 확장 필드 2
	 */
	@Column (name = "attr02", length = 100)
	private String attr02;

	/**
	 * 확장 필드 3
	 */
	@Column (name = "attr03", length = 100)
	private String attr03;

	/**
	 * 확장 필드 4
	 */
	@Column (name = "attr04", length = 100)
	private String attr04;

	/**
	 * 확장 필드 5
	 */
	@Column (name = "attr05", length = 100)
	private String attr05;

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

	public String getShipmentNo() {
		return shipmentNo;
	}

	public void setShipmentNo(String shipmentNo) {
		this.shipmentNo = shipmentNo;
	}

	public String getDlvType() {
		return dlvType;
	}

	public void setDlvType(String dlvType) {
		this.dlvType = dlvType;
	}

	public String getCarrierCd() {
		return carrierCd;
	}

	public void setCarrierCd(String carrierCd) {
		this.carrierCd = carrierCd;
	}

	public String getCarrierServiceType() {
		return carrierServiceType;
	}

	public void setCarrierServiceType(String carrierServiceType) {
		this.carrierServiceType = carrierServiceType;
	}

	public String getVehicleNo() {
		return vehicleNo;
	}

	public void setVehicleNo(String vehicleNo) {
		this.vehicleNo = vehicleNo;
	}

	public String getInvoiceNo() {
		return invoiceNo;
	}

	public void setInvoiceNo(String invoiceNo) {
		this.invoiceNo = invoiceNo;
	}

	public Double getShippingFee() {
		return shippingFee;
	}

	public void setShippingFee(Double shippingFee) {
		this.shippingFee = shippingFee;
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

	public String getOrdererPhone() {
		return ordererPhone;
	}

	public void setOrdererPhone(String ordererPhone) {
		this.ordererPhone = ordererPhone;
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

	public String getDeliveryMemo() {
		return deliveryMemo;
	}

	public void setDeliveryMemo(String deliveryMemo) {
		this.deliveryMemo = deliveryMemo;
	}

	public String getDeliveryInfoSet() {
		return deliveryInfoSet;
	}

	public void setDeliveryInfoSet(String deliveryInfoSet) {
		this.deliveryInfoSet = deliveryInfoSet;
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
