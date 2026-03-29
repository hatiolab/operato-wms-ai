package operato.wms.fulfillment.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.util.ValueUtil;

/**
 * 피킹 지시 상세
 *
 * @author HatioLab
 */
@Table(name = "picking_task_items", idStrategy = GenerationRule.UUID, indexes = {
		@Index(name = "ix_picking_task_items_0", columnList = "domain_id,pick_task_id,rank", unique = true),
		@Index(name = "ix_picking_task_items_1", columnList = "domain_id,pick_task_id,sku_cd"),
		@Index(name = "ix_picking_task_items_2", columnList = "domain_id,pick_task_id,from_loc_cd"),
		@Index(name = "ix_picking_task_items_3", columnList = "domain_id,pick_task_id,barcode"),
		@Index(name = "ix_picking_task_items_4", columnList = "domain_id,pick_task_id,status"),
		@Index(name = "ix_picking_task_items_5", columnList = "domain_id,pick_task_id,inventory_id"),
		@Index(name = "ix_picking_task_items_6", columnList = "domain_id,shipment_order_id"),
		@Index(name = "ix_picking_task_items_7", columnList = "domain_id,stock_allocation_id")
})
public class PickingTaskItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 상태 - WAIT (대기)
	 */
	public static final String STATUS_WAIT = "WAIT";
	/**
	 * 상태 - RUN (진행)
	 */
	public static final String STATUS_RUN = "RUN";
	/**
	 * 상태 - PICKED (완료)
	 */
	public static final String STATUS_PICKED = "PICKED";
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
	 * FK → picking_tasks
	 */
	@Column(name = "pick_task_id", nullable = false, length = 40)
	private String pickTaskId;

	/**
	 * FK → shipment_orders (개별 피킹 시)
	 */
	@Column(name = "shipment_order_id", length = 40)
	private String shipmentOrderId;

	/**
	 * FK → shipment_order_items
	 */
	@Column(name = "shipment_order_item_id", length = 40)
	private String shipmentOrderItemId;

	/**
	 * FK → stock_allocations
	 */
	@Column(name = "stock_allocation_id", length = 40)
	private String stockAllocationId;

	/**
	 * FK → inventories
	 */
	@Column(name = "inventory_id", nullable = false, length = 40)
	private String inventoryId;

	/**
	 * 순번 (피킹 경로 순서)
	 */
	@Column(name = "rank", nullable = false)
	private Integer rank;

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
	 * 재고 바코드
	 */
	@Column(name = "barcode", length = 50)
	private String barcode;

	/**
	 * 출발 로케이션 (피킹존)
	 */
	@Column(name = "from_loc_cd", nullable = false, length = 30)
	private String fromLocCd;

	/**
	 * 도착 로케이션 (포장 스테이션/출하 도크)
	 */
	@Column(name = "to_loc_cd", length = 30)
	private String toLocCd;

	/**
	 * 로트 번호
	 */
	@Column(name = "lot_no", length = 50)
	private String lotNo;

	/**
	 * 시리얼 번호
	 */
	@Column(name = "serial_no", length = 50)
	private String serialNo;

	/**
	 * 유통기한
	 */
	@Column(name = "expired_date", length = 10)
	private String expiredDate;

	/**
	 * 지시 수량
	 */
	@Column(name = "order_qty", nullable = false)
	private Double orderQty;

	/**
	 * 실적 수량 (기본값 0)
	 */
	@Column(name = "pick_qty")
	private Double pickQty;

	/**
	 * 부족 수량 (기본값 0)
	 */
	@Column(name = "short_qty")
	private Double shortQty;

	/**
	 * 상태 (WAIT/RUN/PICKED/SHORT/CANCEL)
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 피킹 완료 시각
	 */
	@Column(name = "picked_at", length = 20)
	private String pickedAt;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	public PickingTaskItem() {
	}

	public PickingTaskItem(String id) {
		this.id = id;
	}

	public PickingTaskItem(Long domainId, String pickTaskId) {
		this.domainId = domainId;
		this.pickTaskId = pickTaskId;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 상태 기본값 설정
		if (ValueUtil.isEmpty(this.status)) {
			this.status = STATUS_WAIT;
		}

		// 수량 기본값 초기화
		if (this.pickQty == null) {
			this.pickQty = 0.0;
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

	public String getPickTaskId() {
		return pickTaskId;
	}

	public void setPickTaskId(String pickTaskId) {
		this.pickTaskId = pickTaskId;
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

	public String getStockAllocationId() {
		return stockAllocationId;
	}

	public void setStockAllocationId(String stockAllocationId) {
		this.stockAllocationId = stockAllocationId;
	}

	public String getInventoryId() {
		return inventoryId;
	}

	public void setInventoryId(String inventoryId) {
		this.inventoryId = inventoryId;
	}

	public Integer getRank() {
		return rank;
	}

	public void setRank(Integer rank) {
		this.rank = rank;
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

	public String getFromLocCd() {
		return fromLocCd;
	}

	public void setFromLocCd(String fromLocCd) {
		this.fromLocCd = fromLocCd;
	}

	public String getToLocCd() {
		return toLocCd;
	}

	public void setToLocCd(String toLocCd) {
		this.toLocCd = toLocCd;
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

	public Double getOrderQty() {
		return orderQty;
	}

	public void setOrderQty(Double orderQty) {
		this.orderQty = orderQty;
	}

	public Double getPickQty() {
		return pickQty;
	}

	public void setPickQty(Double pickQty) {
		this.pickQty = pickQty;
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

	public String getPickedAt() {
		return pickedAt;
	}

	public void setPickedAt(String pickedAt) {
		this.pickedAt = pickedAt;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}
}
