package operato.wms.fulfillment.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.util.ValueUtil;

/**
 * 검수/포장 상세
 *
 * @author HatioLab
 */
@Table(name = "packing_order_items", idStrategy = GenerationRule.UUID, indexes = {
	@Index(name = "ix_packing_order_items_0", columnList = "domain_id,packing_order_id"),
	@Index(name = "ix_packing_order_items_1", columnList = "domain_id,packing_order_id,sku_cd"),
	@Index(name = "ix_packing_order_items_2", columnList = "domain_id,packing_box_id"),
	@Index(name = "ix_packing_order_items_3", columnList = "domain_id,shipment_order_item_id"),
	@Index(name = "ix_packing_order_items_4", columnList = "domain_id,packing_order_id,status")
})
public class PackingOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 상태 - WAIT (대기)
	 */
	public static final String STATUS_WAIT = "WAIT";
	/**
	 * 상태 - INSPECTED (검수 완료)
	 */
	public static final String STATUS_INSPECTED = "INSPECTED";
	/**
	 * 상태 - PACKED (포장 완료)
	 */
	public static final String STATUS_PACKED = "PACKED";
	/**
	 * 상태 - SHORT (부족)
	 */
	public static final String STATUS_SHORT = "SHORT";
	/**
	 * 상태 - CANCEL (취소)
	 */
	public static final String STATUS_CANCEL = "CANCEL";

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * FK → packing_orders
	 */
	@Column(name = "packing_order_id", nullable = false, length = 40)
	private String packingOrderId;

	/**
	 * FK → shipment_order_items
	 */
	@Column(name = "shipment_order_item_id", length = 40)
	private String shipmentOrderItemId;

	/**
	 * FK → packing_boxes (포장 후 매핑)
	 */
	@Column(name = "packing_box_id", length = 40)
	private String packingBoxId;

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
	 * 바코드
	 */
	@Column(name = "barcode", length = 50)
	private String barcode;

	/**
	 * 로트 번호
	 */
	@Column(name = "lot_no", length = 50)
	private String lotNo;

	/**
	 * 유통기한
	 */
	@Column(name = "expired_date", length = 10)
	private String expiredDate;

	/**
	 * 지시 수량 (= 피킹 실적)
	 */
	@Column(name = "order_qty", nullable = false)
	private Double orderQty;

	/**
	 * 검수 수량 (기본값 0)
	 */
	@Column(name = "insp_qty")
	private Double inspQty;

	/**
	 * 포장 수량 (기본값 0)
	 */
	@Column(name = "pack_qty")
	private Double packQty;

	/**
	 * 부족 수량 (기본값 0)
	 */
	@Column(name = "short_qty")
	private Double shortQty;

	/**
	 * 상태 (WAIT/INSPECTED/PACKED/SHORT/CANCEL)
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	public PackingOrderItem() {
	}

	public PackingOrderItem(String id) {
		this.id = id;
	}

	public PackingOrderItem(Long domainId, String packingOrderId) {
		this.domainId = domainId;
		this.packingOrderId = packingOrderId;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 상태 기본값 설정
		if (ValueUtil.isEmpty(this.status)) {
			this.status = STATUS_WAIT;
		}

		// 수량 기본값 초기화
		if (this.inspQty == null) {
			this.inspQty = 0.0;
		}
		if (this.packQty == null) {
			this.packQty = 0.0;
		}
		if (this.shortQty == null) {
			this.shortQty = 0.0;
		}
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getPackingOrderId() {
		return packingOrderId;
	}

	public void setPackingOrderId(String packingOrderId) {
		this.packingOrderId = packingOrderId;
	}

	public String getShipmentOrderItemId() {
		return shipmentOrderItemId;
	}

	public void setShipmentOrderItemId(String shipmentOrderItemId) {
		this.shipmentOrderItemId = shipmentOrderItemId;
	}

	public String getPackingBoxId() {
		return packingBoxId;
	}

	public void setPackingBoxId(String packingBoxId) {
		this.packingBoxId = packingBoxId;
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

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
	}

	public String getLotNo() {
		return lotNo;
	}

	public void setLotNo(String lotNo) {
		this.lotNo = lotNo;
	}

	public String getExpiredDate() {
		return expiredDate;
	}

	public void setExpiredDate(String expiredDate) {
		this.expiredDate = expiredDate;
	}

	public Double getOrderQty() {
		return orderQty;
	}

	public void setOrderQty(Double orderQty) {
		this.orderQty = orderQty;
	}

	public Double getInspQty() {
		return inspQty;
	}

	public void setInspQty(Double inspQty) {
		this.inspQty = inspQty;
	}

	public Double getPackQty() {
		return packQty;
	}

	public void setPackQty(Double packQty) {
		this.packQty = packQty;
	}

	public Double getShortQty() {
		return shortQty;
	}

	public void setShortQty(Double shortQty) {
		this.shortQty = shortQty;
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
}
