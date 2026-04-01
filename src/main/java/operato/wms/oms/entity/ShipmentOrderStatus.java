package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
CREATE OR REPLACE VIEW shipment_order_status AS
SELECT
    si.id,
    si.shipment_order_id,
    so.shipment_no, so.ref_order_no,
    so.order_date, so.ship_by_date, so.cutoff_time, so.priority_cd,
    so.wave_no, so.wh_cd, so.com_cd, so.cust_cd, so.cust_nm,
    so.biz_type, so.ship_type, so.pick_method, so.dlv_type,
    so.status,
    so.total_item, so.total_order, so.total_alloc, so.total_shipped,
    so.confirmed_at, so.allocated_at, so.released_at, so.shipped_at,
    si.line_no, si.sku_cd, si.sku_nm,
    si.order_qty, si.alloc_qty, si.shipped_qty, si.short_qty, si.cancel_qty,
    si.barcode, si.expired_date, si.lot_no,
    sd.receiver_nm, sd.receiver_phone, sd.receiver_zip_cd,
    sd.receiver_addr, sd.receiver_addr2, sd.delivery_memo,
    so.remarks,
    so.domain_id, si.created_at, si.updated_at
FROM
    shipment_orders so
    INNER JOIN shipment_order_items si ON so.id = si.shipment_order_id
    LEFT OUTER JOIN shipment_deliveries sd ON so.id = sd.shipment_order_id
 */
/**
 * 출하 주문 현황 뷰
 *
 * @author HatioLab
 */
@Table(name = "shipment_order_status", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class ShipmentOrderStatus extends xyz.elidom.orm.entity.basic.DomainTimeStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 482937561029384756L;

	/**
	 * PK (shipment_order_items.id)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 출하 주문 ID (shipment_orders.id)
	 */
	@Column(name = "shipment_order_id", length = 40)
	private String shipmentOrderId;

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
	 * 마감 시간 (HH:mm)
	 */
	@Column(name = "cutoff_time", length = 5)
	private String cutoffTime;

	/**
	 * 우선순위 코드
	 */
	@Column(name = "priority_cd", length = 10)
	private String priorityCd;

	/**
	 * 웨이브 번호
	 */
	@Column(name = "wave_no", length = 30)
	private String waveNo;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", length = 30)
	private String whCd;

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
	 * 피킹 방식
	 */
	@Column(name = "pick_method", length = 20)
	private String pickMethod;

	/**
	 * 배송 유형 (PARCEL/FREIGHT/CHARTER/QUICK/PICKUP/DIRECT)
	 */
	@Column(name = "dlv_type", length = 20)
	private String dlvType;

	/**
	 * 주문 상태
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 총 품목 수
	 */
	@Column(name = "total_item")
	private Integer totalItem;

	/**
	 * 총 주문 수량
	 */
	@Column(name = "total_order")
	private Double totalOrder;

	/**
	 * 총 할당 수량
	 */
	@Column(name = "total_alloc")
	private Double totalAlloc;

	/**
	 * 총 출하 수량
	 */
	@Column(name = "total_shipped")
	private Double totalShipped;

	/**
	 * 확정 일시
	 */
	@Column(name = "confirmed_at", length = 20)
	private String confirmedAt;

	/**
	 * 할당 일시
	 */
	@Column(name = "allocated_at", length = 20)
	private String allocatedAt;

	/**
	 * 릴리스 일시
	 */
	@Column(name = "released_at", length = 20)
	private String releasedAt;

	/**
	 * 출하 일시
	 */
	@Column(name = "shipped_at", length = 20)
	private String shippedAt;

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
	 * 할당 수량
	 */
	@Column(name = "alloc_qty")
	private Double allocQty;

	/**
	 * 출하 수량
	 */
	@Column(name = "shipped_qty")
	private Double shippedQty;

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

	public String getCutoffTime() {
		return cutoffTime;
	}

	public void setCutoffTime(String cutoffTime) {
		this.cutoffTime = cutoffTime;
	}

	public String getPriorityCd() {
		return priorityCd;
	}

	public void setPriorityCd(String priorityCd) {
		this.priorityCd = priorityCd;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
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

	public String getPickMethod() {
		return pickMethod;
	}

	public void setPickMethod(String pickMethod) {
		this.pickMethod = pickMethod;
	}

	public String getDlvType() {
		return dlvType;
	}

	public void setDlvType(String dlvType) {
		this.dlvType = dlvType;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public Integer getTotalItem() {
		return totalItem;
	}

	public void setTotalItem(Integer totalItem) {
		this.totalItem = totalItem;
	}

	public Double getTotalOrder() {
		return totalOrder;
	}

	public void setTotalOrder(Double totalOrder) {
		this.totalOrder = totalOrder;
	}

	public Double getTotalAlloc() {
		return totalAlloc;
	}

	public void setTotalAlloc(Double totalAlloc) {
		this.totalAlloc = totalAlloc;
	}

	public Double getTotalShipped() {
		return totalShipped;
	}

	public void setTotalShipped(Double totalShipped) {
		this.totalShipped = totalShipped;
	}

	public String getConfirmedAt() {
		return confirmedAt;
	}

	public void setConfirmedAt(String confirmedAt) {
		this.confirmedAt = confirmedAt;
	}

	public String getAllocatedAt() {
		return allocatedAt;
	}

	public void setAllocatedAt(String allocatedAt) {
		this.allocatedAt = allocatedAt;
	}

	public String getReleasedAt() {
		return releasedAt;
	}

	public void setReleasedAt(String releasedAt) {
		this.releasedAt = releasedAt;
	}

	public String getShippedAt() {
		return shippedAt;
	}

	public void setShippedAt(String shippedAt) {
		this.shippedAt = shippedAt;
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

	public Double getShippedQty() {
		return shippedQty;
	}

	public void setShippedQty(Double shippedQty) {
		this.shippedQty = shippedQty;
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
}
