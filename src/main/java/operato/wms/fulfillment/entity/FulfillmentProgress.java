package operato.wms.fulfillment.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
CREATE OR REPLACE VIEW fulfillment_progress AS
SELECT
    pt.id,
    pt.pick_task_no,
    pt.wave_no,
    pt.shipment_order_id,
    pt.shipment_no,
    pt.order_date,
    pt.com_cd, pt.wh_cd,
    pt.pick_type, pt.pick_method,
    pt.worker_id,
    pt.plan_order, pt.plan_item, pt.plan_total,
    pt.result_total AS pick_result_qty,
    pt.short_total,
    pt.status AS pick_status,
    pt.started_at AS pick_started_at,
    pt.completed_at AS pick_completed_at,
    po.pack_order_no,
    po.insp_type, po.insp_result,
    po.total_box,
    po.carrier_cd,
    po.total_wt,
    po.dock_cd,
    po.status AS pack_status,
    po.started_at AS pack_started_at,
    po.completed_at AS pack_completed_at,
    po.manifested_at,
    po.shipped_at,
    pt.domain_id,
    pt.created_at, pt.updated_at
FROM
    picking_tasks pt
    LEFT OUTER JOIN packing_orders po
        ON pt.domain_id = po.domain_id
        AND (
            (pt.pick_type != 'TOTAL' AND pt.shipment_order_id = po.shipment_order_id)
            OR
            (pt.pick_type = 'TOTAL' AND pt.wave_no = po.wave_no)
        )
 */
/**
 * 풀필먼트 진행 현황 뷰
 *
 * @author HatioLab
 */
@Table(name = "fulfillment_progress", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class FulfillmentProgress extends xyz.elidom.orm.entity.basic.DomainTimeStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * PK (picking_tasks.id)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 피킹 지시 번호
	 */
	@Column(name = "pick_task_no", length = 30)
	private String pickTaskNo;

	/**
	 * 웨이브 번호
	 */
	@Column(name = "wave_no", length = 30)
	private String waveNo;

	/**
	 * 출하 주문 ID
	 */
	@Column(name = "shipment_order_id", length = 40)
	private String shipmentOrderId;

	/**
	 * 출하 주문 번호
	 */
	@Column(name = "shipment_no", length = 30)
	private String shipmentNo;

	/**
	 * 작업 일자
	 */
	@Column(name = "order_date", length = 10)
	private String orderDate;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", length = 30)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", length = 30)
	private String whCd;

	/**
	 * 피킹 유형
	 */
	@Column(name = "pick_type", length = 20)
	private String pickType;

	/**
	 * 피킹 방식
	 */
	@Column(name = "pick_method", length = 20)
	private String pickMethod;

	/**
	 * 피킹 작업자 ID
	 */
	@Column(name = "worker_id", length = 40)
	private String workerId;

	/**
	 * 계획 주문 수
	 */
	@Column(name = "plan_order")
	private Integer planOrder;

	/**
	 * 계획 SKU 종 수
	 */
	@Column(name = "plan_item")
	private Integer planItem;

	/**
	 * 계획 총 수량
	 */
	@Column(name = "plan_total")
	private Double planTotal;

	/**
	 * 피킹 실적 수량
	 */
	@Column(name = "pick_result_qty")
	private Double pickResultQty;

	/**
	 * 부족 총 수량
	 */
	@Column(name = "short_total")
	private Double shortTotal;

	/**
	 * 피킹 상태
	 */
	@Column(name = "pick_status", length = 20)
	private String pickStatus;

	/**
	 * 피킹 시작 일시
	 */
	@Column(name = "pick_started_at", length = 20)
	private String pickStartedAt;

	/**
	 * 피킹 완료 일시
	 */
	@Column(name = "pick_completed_at", length = 20)
	private String pickCompletedAt;

	/**
	 * 포장 지시 번호
	 */
	@Column(name = "pack_order_no", length = 30)
	private String packOrderNo;

	/**
	 * 검수 유형
	 */
	@Column(name = "insp_type", length = 20)
	private String inspType;

	/**
	 * 검수 결과
	 */
	@Column(name = "insp_result", length = 10)
	private String inspResult;

	/**
	 * 포장 박스 수
	 */
	@Column(name = "total_box")
	private Integer totalBox;

	/**
	 * 택배사 코드
	 */
	@Column(name = "carrier_cd", length = 30)
	private String carrierCd;

	/**
	 * 총 중량 (kg)
	 */
	@Column(name = "total_wt")
	private Double totalWt;

	/**
	 * 출하 도크 코드
	 */
	@Column(name = "dock_cd", length = 30)
	private String dockCd;

	/**
	 * 포장 상태
	 */
	@Column(name = "pack_status", length = 20)
	private String packStatus;

	/**
	 * 포장 시작 일시
	 */
	@Column(name = "pack_started_at", length = 20)
	private String packStartedAt;

	/**
	 * 포장 완료 일시
	 */
	@Column(name = "pack_completed_at", length = 20)
	private String packCompletedAt;

	/**
	 * 적하 목록 전송 일시
	 */
	@Column(name = "manifested_at", length = 20)
	private String manifestedAt;

	/**
	 * 출하 확정 일시
	 */
	@Column(name = "shipped_at", length = 20)
	private String shippedAt;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getPickTaskNo() {
		return pickTaskNo;
	}

	public void setPickTaskNo(String pickTaskNo) {
		this.pickTaskNo = pickTaskNo;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
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

	public String getOrderDate() {
		return orderDate;
	}

	public void setOrderDate(String orderDate) {
		this.orderDate = orderDate;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getPickType() {
		return pickType;
	}

	public void setPickType(String pickType) {
		this.pickType = pickType;
	}

	public String getPickMethod() {
		return pickMethod;
	}

	public void setPickMethod(String pickMethod) {
		this.pickMethod = pickMethod;
	}

	public String getWorkerId() {
		return workerId;
	}

	public void setWorkerId(String workerId) {
		this.workerId = workerId;
	}

	public Integer getPlanOrder() {
		return planOrder;
	}

	public void setPlanOrder(Integer planOrder) {
		this.planOrder = planOrder;
	}

	public Integer getPlanItem() {
		return planItem;
	}

	public void setPlanItem(Integer planItem) {
		this.planItem = planItem;
	}

	public Double getPlanTotal() {
		return planTotal;
	}

	public void setPlanTotal(Double planTotal) {
		this.planTotal = planTotal;
	}

	public Double getPickResultQty() {
		return pickResultQty;
	}

	public void setPickResultQty(Double pickResultQty) {
		this.pickResultQty = pickResultQty;
	}

	public Double getShortTotal() {
		return shortTotal;
	}

	public void setShortTotal(Double shortTotal) {
		this.shortTotal = shortTotal;
	}

	public String getPickStatus() {
		return pickStatus;
	}

	public void setPickStatus(String pickStatus) {
		this.pickStatus = pickStatus;
	}

	public String getPickStartedAt() {
		return pickStartedAt;
	}

	public void setPickStartedAt(String pickStartedAt) {
		this.pickStartedAt = pickStartedAt;
	}

	public String getPickCompletedAt() {
		return pickCompletedAt;
	}

	public void setPickCompletedAt(String pickCompletedAt) {
		this.pickCompletedAt = pickCompletedAt;
	}

	public String getPackOrderNo() {
		return packOrderNo;
	}

	public void setPackOrderNo(String packOrderNo) {
		this.packOrderNo = packOrderNo;
	}

	public String getInspType() {
		return inspType;
	}

	public void setInspType(String inspType) {
		this.inspType = inspType;
	}

	public String getInspResult() {
		return inspResult;
	}

	public void setInspResult(String inspResult) {
		this.inspResult = inspResult;
	}

	public Integer getTotalBox() {
		return totalBox;
	}

	public void setTotalBox(Integer totalBox) {
		this.totalBox = totalBox;
	}

	public String getCarrierCd() {
		return carrierCd;
	}

	public void setCarrierCd(String carrierCd) {
		this.carrierCd = carrierCd;
	}

	public Double getTotalWt() {
		return totalWt;
	}

	public void setTotalWt(Double totalWt) {
		this.totalWt = totalWt;
	}

	public String getDockCd() {
		return dockCd;
	}

	public void setDockCd(String dockCd) {
		this.dockCd = dockCd;
	}

	public String getPackStatus() {
		return packStatus;
	}

	public void setPackStatus(String packStatus) {
		this.packStatus = packStatus;
	}

	public String getPackStartedAt() {
		return packStartedAt;
	}

	public void setPackStartedAt(String packStartedAt) {
		this.packStartedAt = packStartedAt;
	}

	public String getPackCompletedAt() {
		return packCompletedAt;
	}

	public void setPackCompletedAt(String packCompletedAt) {
		this.packCompletedAt = packCompletedAt;
	}

	public String getManifestedAt() {
		return manifestedAt;
	}

	public void setManifestedAt(String manifestedAt) {
		this.manifestedAt = manifestedAt;
	}

	public String getShippedAt() {
		return shippedAt;
	}

	public void setShippedAt(String shippedAt) {
		this.shippedAt = shippedAt;
	}
}
