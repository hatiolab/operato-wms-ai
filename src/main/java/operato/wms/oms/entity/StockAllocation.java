package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 재고 할당
 *
 * @author HatioLab
 */
@Table(name = "stock_allocations", idStrategy = GenerationRule.UUID, indexes = {
	@Index(name = "ix_stock_allocations_0", columnList = "domain_id,shipment_order_id"),
	@Index(name = "ix_stock_allocations_1", columnList = "domain_id,shipment_order_item_id"),
	@Index(name = "ix_stock_allocations_2", columnList = "domain_id,inventory_id"),
	@Index(name = "ix_stock_allocations_3", columnList = "domain_id,sku_cd,status"),
	@Index(name = "ix_stock_allocations_4", columnList = "domain_id,status"),
	@Index(name = "ix_stock_allocations_5", columnList = "domain_id,expired_at,status")
})
public class StockAllocation extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 628359147236541298L;

	/**
	 * 할당 상태 - SOFT (임시 할당)
	 */
	public static final String STATUS_SOFT = "SOFT";
	/**
	 * 할당 상태 - HARD (확정 할당)
	 */
	public static final String STATUS_HARD = "HARD";
	/**
	 * 할당 상태 - RELEASED (릴리스 완료)
	 */
	public static final String STATUS_RELEASED = "RELEASED";
	/**
	 * 할당 상태 - EXPIRED (만료)
	 */
	public static final String STATUS_EXPIRED = "EXPIRED";
	/**
	 * 할당 상태 - CANCELLED (취소)
	 */
	public static final String STATUS_CANCELLED = "CANCELLED";

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
	 * 출하 주문 상세 ID (FK → shipment_order_items.id)
	 */
	@Column (name = "shipment_order_item_id", nullable = false, length = 40)
	private String shipmentOrderItemId;

	/**
	 * 재고 ID (FK → inventories.id)
	 */
	@Column (name = "inventory_id", nullable = false, length = 40)
	private String inventoryId;

	/**
	 * 상품 코드
	 */
	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 바코드
	 */
	@Column (name = "barcode", length = 50)
	private String barcode;

	/**
	 * 로케이션 코드
	 */
	@Column (name = "loc_cd", length = 30)
	private String locCd;

	/**
	 * 로트 번호
	 */
	@Column (name = "lot_no", length = 50)
	private String lotNo;

	/**
	 * 유통기한 (YYYY-MM-DD)
	 */
	@Column (name = "expired_date", length = 10)
	private String expiredDate;

	/**
	 * 할당 수량
	 */
	@Column (name = "alloc_qty", nullable = false)
	private Double allocQty;

	/**
	 * 할당 전략 (FEFO/FIFO/LEFO/MANUAL)
	 */
	@Column (name = "alloc_strategy", length = 20)
	private String allocStrategy;

	/**
	 * 상태 (SOFT/HARD/RELEASED/EXPIRED/CANCELLED)
	 */
	@Column (name = "status", nullable = false, length = 20)
	private String status;

	/**
	 * 할당 일시
	 */
	@Column (name = "allocated_at", length = 20)
	private String allocatedAt;

	/**
	 * 만료 일시
	 */
	@Column (name = "expired_at", length = 20)
	private String expiredAt;

	/**
	 * 릴리스 일시
	 */
	@Column (name = "released_at", length = 20)
	private String releasedAt;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 500)
	private String remarks;

	public StockAllocation() {
	}

	public StockAllocation(String id) {
		this.id = id;
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

	public String getShipmentOrderItemId() {
		return shipmentOrderItemId;
	}

	public void setShipmentOrderItemId(String shipmentOrderItemId) {
		this.shipmentOrderItemId = shipmentOrderItemId;
	}

	public String getInventoryId() {
		return inventoryId;
	}

	public void setInventoryId(String inventoryId) {
		this.inventoryId = inventoryId;
	}

	public String getSkuCd() {
		return skuCd;
	}

	public void setSkuCd(String skuCd) {
		this.skuCd = skuCd;
	}

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
	}

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
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

	public Double getAllocQty() {
		return allocQty;
	}

	public void setAllocQty(Double allocQty) {
		this.allocQty = allocQty;
	}

	public String getAllocStrategy() {
		return allocStrategy;
	}

	public void setAllocStrategy(String allocStrategy) {
		this.allocStrategy = allocStrategy;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getAllocatedAt() {
		return allocatedAt;
	}

	public void setAllocatedAt(String allocatedAt) {
		this.allocatedAt = allocatedAt;
	}

	public String getExpiredAt() {
		return expiredAt;
	}

	public void setExpiredAt(String expiredAt) {
		this.expiredAt = expiredAt;
	}

	public String getReleasedAt() {
		return releasedAt;
	}

	public void setReleasedAt(String releasedAt) {
		this.releasedAt = releasedAt;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 상태 초기화
		if (this.status == null) {
			this.status = StockAllocation.STATUS_SOFT;
		}

		// 할당 수량 초기화
		if (this.allocQty == null) {
			this.allocQty = 0.0;
		}
	}
}
