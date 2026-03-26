package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 보충 지시 Entity
 *
 * @author HatioLab
 */
@Table(name = "replenish_orders", idStrategy = GenerationRule.UUID, uniqueFields = "domainId,replenishNo", indexes = {
	@Index(name = "ix_replenish_orders_0", columnList = "domain_id,replenish_no", unique = true),
	@Index(name = "ix_replenish_orders_1", columnList = "domain_id,wave_no"),
	@Index(name = "ix_replenish_orders_2", columnList = "domain_id,order_date,status"),
	@Index(name = "ix_replenish_orders_3", columnList = "domain_id,com_cd,wh_cd")
})
public class ReplenishOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 보충 상태 - CREATED (생성)
	 */
	public static final String STATUS_CREATED = "CREATED";
	/**
	 * 보충 상태 - IN_PROGRESS (진행 중)
	 */
	public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
	/**
	 * 보충 상태 - COMPLETED (완료)
	 */
	public static final String STATUS_COMPLETED = "COMPLETED";
	/**
	 * 보충 상태 - CANCELLED (취소)
	 */
	public static final String STATUS_CANCELLED = "CANCELLED";

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 보충 지시 번호
	 */
	@Column(name = "replenish_no", nullable = false, length = 30)
	private String replenishNo;

	/**
	 * 웨이브 번호
	 */
	@Column(name = "wave_no", length = 30)
	private String waveNo;

	/**
	 * 지시일자 (YYYY-MM-DD)
	 */
	@Column(name = "order_date", nullable = false, length = 10)
	private String orderDate;

	/**
	 * 회사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 계획 SKU 수
	 */
	@Column(name = "plan_sku_count")
	private Integer planSkuCount;

	/**
	 * 계획 총 수량
	 */
	@Column(name = "plan_total_qty")
	private Double planTotalQty;

	/**
	 * 실적 총 수량
	 */
	@Column(name = "result_total_qty")
	private Double resultTotalQty;

	/**
	 * 상태 (CREATED/IN_PROGRESS/COMPLETED/CANCELLED)
	 */
	@Column(name = "status", nullable = false, length = 20)
	private String status;

	/**
	 * 시작 일시
	 */
	@Column(name = "started_at", length = 20)
	private String startedAt;

	/**
	 * 완료 일시
	 */
	@Column(name = "completed_at", length = 20)
	private String completedAt;

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

	public String getReplenishNo() {
		return replenishNo;
	}

	public void setReplenishNo(String replenishNo) {
		this.replenishNo = replenishNo;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
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

	public Integer getPlanSkuCount() {
		return planSkuCount;
	}

	public void setPlanSkuCount(Integer planSkuCount) {
		this.planSkuCount = planSkuCount;
	}

	public Double getPlanTotalQty() {
		return planTotalQty;
	}

	public void setPlanTotalQty(Double planTotalQty) {
		this.planTotalQty = planTotalQty;
	}

	public Double getResultTotalQty() {
		return resultTotalQty;
	}

	public void setResultTotalQty(Double resultTotalQty) {
		this.resultTotalQty = resultTotalQty;
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

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 상태 초기화
		if (ValueUtil.isEmpty(this.status)) {
			this.status = STATUS_CREATED;
		}

		// 지시 일자 초기화
		if (ValueUtil.isEmpty(this.orderDate)) {
			this.orderDate = DateUtil.todayStr();
		}
	}
}
