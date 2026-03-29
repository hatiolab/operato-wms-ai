package operato.wms.fulfillment.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.util.ValueUtil;

/**
 * 포장 박스
 *
 * @author HatioLab
 */
@Table(name = "packing_boxes", idStrategy = GenerationRule.UUID, indexes = {
	@Index(name = "ix_packing_boxes_0", columnList = "domain_id,packing_order_id,box_seq", unique = true),
	@Index(name = "ix_packing_boxes_1", columnList = "domain_id,packing_order_id"),
	@Index(name = "ix_packing_boxes_2", columnList = "domain_id,invoice_no"),
	@Index(name = "ix_packing_boxes_3", columnList = "domain_id,status")
})
public class PackingBox extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 상태 - OPEN (열림)
	 */
	public static final String STATUS_OPEN = "OPEN";
	/**
	 * 상태 - CLOSED (닫힘)
	 */
	public static final String STATUS_CLOSED = "CLOSED";
	/**
	 * 상태 - SHIPPED (출하)
	 */
	public static final String STATUS_SHIPPED = "SHIPPED";

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
	 * 박스 순번 (포장 지시 내 UNIQUE)
	 */
	@Column(name = "box_seq", nullable = false)
	private Integer boxSeq;

	/**
	 * 박스 유형 코드 (BOX/BAG/ENVELOPE/PALLET, FK → 박스유형 마스터)
	 */
	@Column(name = "box_type_cd", length = 20)
	private String boxTypeCd;

	/**
	 * 박스 중량 (kg)
	 */
	@Column(name = "box_wt")
	private Double boxWt;

	/**
	 * 포함 아이템 종 수
	 */
	@Column(name = "total_item")
	private Integer totalItem;

	/**
	 * 포함 총 수량
	 */
	@Column(name = "total_qty")
	private Double totalQty;

	/**
	 * 송장 번호 (택배 운송장 번호)
	 */
	@Column(name = "invoice_no", length = 50)
	private String invoiceNo;

	/**
	 * 차량 번호
	 */
	@Column(name = "vehicle_no", length = 30)
	private String vehicleNo;

	/**
	 * 라벨 출력 여부
	 */
	@Column(name = "label_printed_flag")
	private Boolean labelPrintedFlag;

	/**
	 * 라벨 출력 일시
	 */
	@Column(name = "label_printed_at", length = 20)
	private String labelPrintedAt;

	/**
	 * 박스별 출하 확정 일시
	 */
	@Column(name = "shipped_at", length = 20)
	private String shippedAt;

	/**
	 * 상태 (OPEN/CLOSED/SHIPPED)
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 500)
	private String remarks;

	public PackingBox() {
	}

	public PackingBox(String id) {
		this.id = id;
	}

	public PackingBox(Long domainId, String packingOrderId) {
		this.domainId = domainId;
		this.packingOrderId = packingOrderId;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 상태 기본값 설정
		if (ValueUtil.isEmpty(this.status)) {
			this.status = STATUS_OPEN;
		}

		// 라벨 출력 여부 기본값
		if (this.labelPrintedFlag == null) {
			this.labelPrintedFlag = false;
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

	public Integer getBoxSeq() {
		return boxSeq;
	}

	public void setBoxSeq(Integer boxSeq) {
		this.boxSeq = boxSeq;
	}

	public String getBoxTypeCd() {
		return boxTypeCd;
	}

	public void setBoxTypeCd(String boxTypeCd) {
		this.boxTypeCd = boxTypeCd;
	}

	public Double getBoxWt() {
		return boxWt;
	}

	public void setBoxWt(Double boxWt) {
		this.boxWt = boxWt;
	}

	public Integer getTotalItem() {
		return totalItem;
	}

	public void setTotalItem(Integer totalItem) {
		this.totalItem = totalItem;
	}

	public Double getTotalQty() {
		return totalQty;
	}

	public void setTotalQty(Double totalQty) {
		this.totalQty = totalQty;
	}

	public String getInvoiceNo() {
		return invoiceNo;
	}

	public void setInvoiceNo(String invoiceNo) {
		this.invoiceNo = invoiceNo;
	}

	public String getVehicleNo() {
		return vehicleNo;
	}

	public void setVehicleNo(String vehicleNo) {
		this.vehicleNo = vehicleNo;
	}

	public Boolean getLabelPrintedFlag() {
		return labelPrintedFlag;
	}

	public void setLabelPrintedFlag(Boolean labelPrintedFlag) {
		this.labelPrintedFlag = labelPrintedFlag;
	}

	public String getLabelPrintedAt() {
		return labelPrintedAt;
	}

	public void setLabelPrintedAt(String labelPrintedAt) {
		this.labelPrintedAt = labelPrintedAt;
	}

	public String getShippedAt() {
		return shippedAt;
	}

	public void setShippedAt(String shippedAt) {
		this.shippedAt = shippedAt;
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
