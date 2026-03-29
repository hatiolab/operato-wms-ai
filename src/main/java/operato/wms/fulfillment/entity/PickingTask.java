package operato.wms.fulfillment.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 피킹 지시 (헤더)
 *
 * OMS 웨이브 확정 시 생성되는 피킹 작업 단위.
 * 개별 피킹은 주문별 1건, 토탈 피킹은 웨이브별 1건 생성.
 *
 * @author HatioLab
 */
@Table(name = "picking_tasks", idStrategy = GenerationRule.UUID, uniqueFields = "domainId,pickTaskNo", indexes = {
	@Index(name = "ix_picking_tasks_0", columnList = "domain_id,pick_task_no", unique = true),
	@Index(name = "ix_picking_tasks_1", columnList = "domain_id,wave_no"),
	@Index(name = "ix_picking_tasks_2", columnList = "domain_id,shipment_order_id"),
	@Index(name = "ix_picking_tasks_3", columnList = "domain_id,order_date,status"),
	@Index(name = "ix_picking_tasks_4", columnList = "domain_id,com_cd,wh_cd"),
	@Index(name = "ix_picking_tasks_5", columnList = "domain_id,worker_id,status"),
	@Index(name = "ix_picking_tasks_6", columnList = "domain_id,pick_type,status")
})
public class PickingTask extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 335660072161620030L;

	/**
	 * 상태 - CREATED (생성)
	 */
	public static final String STATUS_CREATED = "CREATED";
	/**
	 * 상태 - IN_PROGRESS (진행 중)
	 */
	public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
	/**
	 * 상태 - COMPLETED (완료)
	 */
	public static final String STATUS_COMPLETED = "COMPLETED";
	/**
	 * 상태 - CANCELLED (취소)
	 */
	public static final String STATUS_CANCELLED = "CANCELLED";

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 피킹 지시 번호 (자동 채번, UNIQUE)
	 */
	@Column(name = "pick_task_no", nullable = false, length = 30)
	private String pickTaskNo;

	/**
	 * 웨이브 번호 (FK -> shipment_waves)
	 */
	@Column(name = "wave_no", nullable = false, length = 30)
	private String waveNo;

	/**
	 * 출하 주문 ID (개별 피킹 시, FK -> shipment_orders)
	 */
	@Column(name = "shipment_order_id", length = 40)
	private String shipmentOrderId;

	/**
	 * 출하 주문 번호 (개별 피킹 시)
	 */
	@Column(name = "shipment_no", length = 30)
	private String shipmentNo;

	/**
	 * 작업 일자 (YYYY-MM-DD)
	 */
	@Column(name = "order_date", nullable = false, length = 10)
	private String orderDate;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 피킹 유형 (INDIVIDUAL/TOTAL/ZONE)
	 */
	@Column(name = "pick_type", nullable = false, length = 20)
	private String pickType;

	/**
	 * 피킹 방식 (WCS/PAPER/INSPECT/PICK)
	 */
	@Column(name = "pick_method", length = 20)
	private String pickMethod;

	/**
	 * 존 코드 (존 피킹 시)
	 */
	@Column(name = "zone_cd", length = 30)
	private String zoneCd;

	/**
	 * 피킹 작업자 ID
	 */
	@Column(name = "worker_id", length = 40)
	private String workerId;

	/**
	 * 우선순위 코드 (URGENT/HIGH/NORMAL/LOW)
	 */
	@Column(name = "priority_cd", length = 10)
	private String priorityCd;

	/**
	 * 예상 소요 시간 (분)
	 */
	@Column(name = "estimated_time")
	private Integer estimatedTime;

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
	 * 실적 주문 수
	 */
	@Column(name = "result_order")
	private Integer resultOrder;

	/**
	 * 실적 SKU 종 수
	 */
	@Column(name = "result_item")
	private Integer resultItem;

	/**
	 * 실적 총 수량
	 */
	@Column(name = "result_total")
	private Double resultTotal;

	/**
	 * 부족 총 수량
	 */
	@Column(name = "short_total")
	private Double shortTotal;

	/**
	 * 상태 (CREATED/IN_PROGRESS/COMPLETED/CANCELLED)
	 */
	@Column(name = "status", nullable = false, length = 20)
	private String status;

	/**
	 * 작업 시작 일시
	 */
	@Column(name = "started_at", length = 20)
	private String startedAt;

	/**
	 * 작업 완료 일시
	 */
	@Column(name = "completed_at", length = 20)
	private String completedAt;

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

	public PickingTask() {
	}

	public PickingTask(String id) {
		this.id = id;
	}

	public PickingTask(Long domainId, String pickTaskNo) {
		this.domainId = domainId;
		this.pickTaskNo = pickTaskNo;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 상태 기본값 설정
		if (ValueUtil.isEmpty(this.status)) {
			this.status = STATUS_CREATED;
		}

		// 작업일자 기본값 설정 (당일)
		if (ValueUtil.isEmpty(this.orderDate)) {
			this.orderDate = DateUtil.todayStr();
		}

		// pick_task_no 자동 채번
		if (ValueUtil.isEmpty(this.pickTaskNo)) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			String sql = "SELECT COALESCE(MAX(CAST(SUBSTRING(pick_task_no FROM '[0-9]+$') AS INTEGER)), 0) + 1"
					+ " FROM picking_tasks WHERE domain_id = :domainId AND order_date = :orderDate";
			Integer nextSeq = queryMgr.selectBySql(sql,
					ValueUtil.newMap("domainId,orderDate", this.domainId, this.orderDate),
					Integer.class);
			this.pickTaskNo = "PICK-" + this.orderDate.replace("-", "") + "-" + String.format("%04d", nextSeq != null ? nextSeq : 1);
		}

		// 실적 수량 기본값 초기화
		if (this.resultOrder == null) {
			this.resultOrder = 0;
		}
		if (this.resultItem == null) {
			this.resultItem = 0;
		}
		if (this.resultTotal == null) {
			this.resultTotal = 0.0;
		}
		if (this.shortTotal == null) {
			this.shortTotal = 0.0;
		}
	}

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

	public String getZoneCd() {
		return zoneCd;
	}

	public void setZoneCd(String zoneCd) {
		this.zoneCd = zoneCd;
	}

	public String getWorkerId() {
		return workerId;
	}

	public void setWorkerId(String workerId) {
		this.workerId = workerId;
	}

	public String getPriorityCd() {
		return priorityCd;
	}

	public void setPriorityCd(String priorityCd) {
		this.priorityCd = priorityCd;
	}

	public Integer getEstimatedTime() {
		return estimatedTime;
	}

	public void setEstimatedTime(Integer estimatedTime) {
		this.estimatedTime = estimatedTime;
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

	public Integer getResultOrder() {
		return resultOrder;
	}

	public void setResultOrder(Integer resultOrder) {
		this.resultOrder = resultOrder;
	}

	public Integer getResultItem() {
		return resultItem;
	}

	public void setResultItem(Integer resultItem) {
		this.resultItem = resultItem;
	}

	public Double getResultTotal() {
		return resultTotal;
	}

	public void setResultTotal(Double resultTotal) {
		this.resultTotal = resultTotal;
	}

	public Double getShortTotal() {
		return shortTotal;
	}

	public void setShortTotal(Double shortTotal) {
		this.shortTotal = shortTotal;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getStartedAt() {
		return startedAt;
	}

	public void setStartedAt(String startedAt) {
		this.startedAt = startedAt;
	}

	public String getCompletedAt() {
		return completedAt;
	}

	public void setCompletedAt(String completedAt) {
		this.completedAt = completedAt;
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
