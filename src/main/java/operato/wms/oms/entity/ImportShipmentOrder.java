package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 출하 주문 임포트 모델
 *
 * @author HatioLab
 */
@Table(name = "import_shipment_orders", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class ImportShipmentOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 692847503826192847L;

	/**
	 * PK
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 출하 번호
	 */
	@Column(name = "shipment_no", length = 30)
	private String shipmentNo;

	/**
	 * 참조 주문 번호 (채널 주문 번호)
	 */
	@Column(name = "ref_order_no", length = 50)
	private String refOrderNo;

	/**
	 * 주문일자 (YYYY-MM-DD)
	 */
	@Column(name = "order_date", length = 10)
	private String orderDate;

	/**
	 * 출하 기한일 (YYYY-MM-DD)
	 */
	@Column(name = "ship_by_date", length = 10)
	private String shipByDate;

	/**
	 * 회사 코드
	 */
	@Column(name = "com_cd", length = 30)
	private String comCd;

	/**
	 * 고객 코드
	 */
	@Column(name = "cust_cd", length = 30)
	private String custCd;

	/**
	 * 고객명
	 */
	@Column(name = "cust_nm", length = 100)
	private String custNm;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", length = 30)
	private String whCd;

	/**
	 * 업무 유형 (B2C_OUT/B2B_OUT/B2C_RTN/B2B_RTN)
	 */
	@Column(name = "biz_type", length = 10)
	private String bizType;

	/**
	 * 출하 유형 (NORMAL/RETURN/TRANSFER/SCRAP/EXPORT/ETC)
	 */
	@Column(name = "ship_type", length = 20)
	private String shipType;

	/**
	 * 배송 유형 (STANDARD/EXPRESS/SAME_DAY/DAWN)
	 */
	@Column(name = "dlv_type", length = 20)
	private String dlvType;

	/**
	 * 우선순위 코드 (URGENT/HIGH/NORMAL/LOW)
	 */
	@Column(name = "priority_cd", length = 10)
	private String priorityCd;

	/**
	 * 라인 번호
	 */
	@Column(name = "line_no", length = 5)
	private String lineNo;

	/**
	 * 상품 코드
	 */
	@Column(name = "sku_cd", length = 30)
	private String skuCd;

	/**
	 * 상품명
	 */
	@Column(name = "sku_nm", length = 100)
	private String skuNm;

	/**
	 * 주문 수량
	 */
	@Column(name = "order_qty")
	private Double orderQty;

	/**
	 * 단가
	 */
	@Column(name = "unit_price")
	private Double unitPrice;

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
	 * 바코드
	 */
	@Column(name = "barcode", length = 50)
	private String barcode;

	/**
	 * 발송인명
	 */
	@Column(name = "sender_nm", length = 100)
	private String senderNm;

	/**
	 * 발송인 전화번호
	 */
	@Column(name = "sender_phone", length = 20)
	private String senderPhone;

	/**
	 * 발송인 우편번호
	 */
	@Column(name = "sender_zip_cd", length = 20)
	private String senderZipCd;

	/**
	 * 발송인 주소
	 */
	@Column(name = "sender_addr", length = 200)
	private String senderAddr;

	/**
	 * 주문자명
	 */
	@Column(name = "orderer_nm", length = 100)
	private String ordererNm;

	/**
	 * 수취인명
	 */
	@Column(name = "receiver_nm", length = 100)
	private String receiverNm;

	/**
	 * 수취인 전화번호
	 */
	@Column(name = "receiver_phone", length = 20)
	private String receiverPhone;

	/**
	 * 수취인 우편번호
	 */
	@Column(name = "receiver_zip_cd", length = 20)
	private String receiverZipCd;

	/**
	 * 수취인 주소
	 */
	@Column(name = "receiver_addr", length = 200)
	private String receiverAddr;

	/**
	 * 수취인 상세주소
	 */
	@Column(name = "receiver_addr2", length = 200)
	private String receiverAddr2;

	/**
	 * 배송 메모
	 */
	@Column(name = "delivery_memo", length = 500)
	private String deliveryMemo;

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

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getShipmentNo() {
		return shipmentNo;
	}

	public void setShipmentNo(String shipmentNo) {
		this.shipmentNo = shipmentNo;
	}

	public String getRefOrderNo() {
		return refOrderNo;
	}

	public void setRefOrderNo(String refOrderNo) {
		this.refOrderNo = refOrderNo;
	}

	public String getOrderDate() {
		return orderDate;
	}

	public void setOrderDate(String orderDate) {
		this.orderDate = orderDate;
	}

	public String getShipByDate() {
		return shipByDate;
	}

	public void setShipByDate(String shipByDate) {
		this.shipByDate = shipByDate;
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

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getBizType() {
		return bizType;
	}

	public void setBizType(String bizType) {
		this.bizType = bizType;
	}

	public String getShipType() {
		return shipType;
	}

	public void setShipType(String shipType) {
		this.shipType = shipType;
	}

	public String getDlvType() {
		return dlvType;
	}

	public void setDlvType(String dlvType) {
		this.dlvType = dlvType;
	}

	public String getPriorityCd() {
		return priorityCd;
	}

	public void setPriorityCd(String priorityCd) {
		this.priorityCd = priorityCd;
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

	public Double getUnitPrice() {
		return unitPrice;
	}

	public void setUnitPrice(Double unitPrice) {
		this.unitPrice = unitPrice;
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

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
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

	public String getOrdererNm() {
		return ordererNm;
	}

	public void setOrdererNm(String ordererNm) {
		this.ordererNm = ordererNm;
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
