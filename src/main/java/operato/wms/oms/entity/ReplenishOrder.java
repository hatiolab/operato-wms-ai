package operato.wms.oms.entity;

import org.apache.commons.lang.StringUtils;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.dev.entity.RangedSeq;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;
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
	 * 계획 품목 수
	 */
	@Column(name = "plan_item")
	private Integer planItem;

	/**
	 * 계획 총 수량
	 */
	@Column(name = "plan_total")
	private Double planTotal;

	/**
	 * 실적 총 수량
	 */
	@Column(name = "result_total")
	private Double resultTotal;

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

	public Double getResultTotal() {
		return resultTotal;
	}

	public void setResultTotal(Double resultTotal) {
		this.resultTotal = resultTotal;
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

		// 보충 지시 번호 생성
		if (ValueUtil.isEmpty(this.replenishNo)) {
			String today = DateUtil.todayStr("yyMMdd");
			Integer seq = RangedSeq.increaseSequence(this.domainId, "REPLENISH_NO", "REPLENISH_NO", "DATE", today, null,
					null);
			this.replenishNo = "RP" + Domain.currentDomainId() + SysConstants.DASH + today + SysConstants.DASH
					+ StringUtils.leftPad(String.valueOf(seq), 4, "0");
		}
	}
}
