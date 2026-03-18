package operato.wms.vas.entity;

import operato.wms.vas.WmsVasConstants;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 유통가공 작업 지시 헤더 Entity
 *
 * 유통가공 작업 지시의 헤더 정보를 관리
 * - 유통가공 유형: SET_ASSEMBLY, DISASSEMBLY, REPACK, LABEL, CUSTOM
 * - 상태: PLAN, APPROVED, MATERIAL_READY, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
 */
@Table(name = "vas_orders", idStrategy = GenerationRule.UUID, uniqueFields = "vasNo,domainId", indexes = {
		@Index(name = "ix_vas_orders_0", columnList = "vas_no,domain_id", unique = true),
		@Index(name = "ix_vas_orders_1", columnList = "com_cd,domain_id"),
		@Index(name = "ix_vas_orders_2", columnList = "wh_cd,domain_id"),
		@Index(name = "ix_vas_orders_3", columnList = "com_cd,status,domain_id"),
		@Index(name = "ix_vas_orders_4", columnList = "vas_req_date,com_cd,domain_id"),
		@Index(name = "ix_vas_orders_5", columnList = "vas_type,com_cd,domain_id"),
		@Index(name = "ix_vas_orders_6", columnList = "vas_bom_id,domain_id"),
		@Index(name = "ix_vas_orders_7", columnList = "priority,status,domain_id"),
		@Index(name = "ix_vas_orders_8", columnList = "worker_id,status,domain_id")
})
public class VasOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 유통가공 번호 (UNIQUE, 자동 채번: VAS-YYYYMMDD-XXXXX)
	 */
	@Column(name = "vas_no", nullable = false, length = 30)
	private String vasNo;

	/**
	 * 외부 요청 번호 (고객사 연동)
	 */
	@Column(name = "vas_req_no", length = 30)
	private String vasReqNo;

	/**
	 * 요청 일자 (YYYY-MM-DD)
	 */
	@Column(name = "vas_req_date", nullable = false, length = 10)
	private String vasReqDate;

	/**
	 * 완료 일자 (YYYY-MM-DD)
	 */
	@Column(name = "vas_end_date", length = 10)
	private String vasEndDate;

	/**
	 * 상태 (PLAN/APPROVED/MATERIAL_READY/IN_PROGRESS/COMPLETED/CLOSED/CANCELLED)
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 유통가공 유형 (SET_ASSEMBLY/DISASSEMBLY/REPACK/LABEL/CUSTOM)
	 */
	@Column(name = "vas_type", nullable = false, length = 30)
	private String vasType;

	/**
	 * BOM 마스터 ID (FK → vas_boms.id)
	 */
	@Column(name = "vas_bom_id", length = 40)
	private String vasBomId;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 20)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", length = 20)
	private String whCd;

	/**
	 * 유통가공장 로케이션 코드
	 */
	@Column(name = "work_loc_cd", length = 20)
	private String workLocCd;

	/**
	 * 계획 세트 수량
	 */
	@Column(name = "plan_qty", nullable = false)
	private Double planQty;

	/**
	 * 완성 수량
	 */
	@Column(name = "completed_qty")
	private Double completedQty;

	/**
	 * 담당자 ID
	 */
	@Column(name = "mgr_id", length = 32)
	private String mgrId;

	/**
	 * 작업자 ID
	 */
	@Column(name = "worker_id", length = 32)
	private String workerId;

	/**
	 * 우선순위 (HIGH/NORMAL/LOW)
	 */
	@Column(name = "priority", length = 10)
	private String priority;

	/**
	 * 계획 시작 일시
	 */
	@Column(name = "planned_start_at")
	private java.util.Date plannedStartAt;

	/**
	 * 계획 종료 일시
	 */
	@Column(name = "planned_end_at")
	private java.util.Date plannedEndAt;

	/**
	 * 실제 작업 시작 일시
	 */
	@Column(name = "started_at")
	private java.util.Date startedAt;

	/**
	 * 실제 작업 완료 일시
	 */
	@Column(name = "completed_at")
	private java.util.Date completedAt;

	/**
	 * 승인자 ID
	 */
	@Column(name = "approved_by", length = 32)
	private String approvedBy;

	/**
	 * 승인 일시
	 */
	@Column(name = "approved_at")
	private java.util.Date approvedAt;

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

	public VasOrder() {
	}

	public VasOrder(String id) {
		this.id = id;
	}

	public VasOrder(Long domainId, String vasNo) {
		this.domainId = domainId;
		this.vasNo = vasNo;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getVasNo() {
		return vasNo;
	}

	public void setVasNo(String vasNo) {
		this.vasNo = vasNo;
	}

	public String getVasReqNo() {
		return vasReqNo;
	}

	public void setVasReqNo(String vasReqNo) {
		this.vasReqNo = vasReqNo;
	}

	public String getVasReqDate() {
		return vasReqDate;
	}

	public void setVasReqDate(String vasReqDate) {
		this.vasReqDate = vasReqDate;
	}

	public String getVasEndDate() {
		return vasEndDate;
	}

	public void setVasEndDate(String vasEndDate) {
		this.vasEndDate = vasEndDate;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getVasType() {
		return vasType;
	}

	public void setVasType(String vasType) {
		this.vasType = vasType;
	}

	public String getVasBomId() {
		return vasBomId;
	}

	public void setVasBomId(String vasBomId) {
		this.vasBomId = vasBomId;
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

	public String getWorkLocCd() {
		return workLocCd;
	}

	public void setWorkLocCd(String workLocCd) {
		this.workLocCd = workLocCd;
	}

	public Double getPlanQty() {
		return planQty;
	}

	public void setPlanQty(Double planQty) {
		this.planQty = planQty;
	}

	public Double getCompletedQty() {
		return completedQty;
	}

	public void setCompletedQty(Double completedQty) {
		this.completedQty = completedQty;
	}

	public String getMgrId() {
		return mgrId;
	}

	public void setMgrId(String mgrId) {
		this.mgrId = mgrId;
	}

	public String getWorkerId() {
		return workerId;
	}

	public void setWorkerId(String workerId) {
		this.workerId = workerId;
	}

	public String getPriority() {
		return priority;
	}

	public void setPriority(String priority) {
		this.priority = priority;
	}

	public java.util.Date getPlannedStartAt() {
		return plannedStartAt;
	}

	public void setPlannedStartAt(java.util.Date plannedStartAt) {
		this.plannedStartAt = plannedStartAt;
	}

	public java.util.Date getPlannedEndAt() {
		return plannedEndAt;
	}

	public void setPlannedEndAt(java.util.Date plannedEndAt) {
		this.plannedEndAt = plannedEndAt;
	}

	public java.util.Date getStartedAt() {
		return startedAt;
	}

	public void setStartedAt(java.util.Date startedAt) {
		this.startedAt = startedAt;
	}

	public java.util.Date getCompletedAt() {
		return completedAt;
	}

	public void setCompletedAt(java.util.Date completedAt) {
		this.completedAt = completedAt;
	}

	public String getApprovedBy() {
		return approvedBy;
	}

	public void setApprovedBy(String approvedBy) {
		this.approvedBy = approvedBy;
	}

	public java.util.Date getApprovedAt() {
		return approvedAt;
	}

	public void setApprovedAt(java.util.Date approvedAt) {
		this.approvedAt = approvedAt;
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
		if (this.status == null) {
			this.status = WmsVasConstants.STATUS_PLAN;
		}

		// 유통가공 번호 자동 채번 (VAS-YYYYMMDD-XXXXX)
		if (ValueUtil.isEmpty(this.vasNo)) {
			String dateStr = DateUtil.todayStr("yyyyMMdd");
			// TODO: 일련번호 채번 서비스 구현 필요
			this.vasNo = this.vasReqNo;
		}

		// 요청 일자가 없는 경우 당일 날짜 설정
		if (ValueUtil.isEmpty(this.vasReqDate)) {
			this.vasReqDate = DateUtil.todayStr();
		}

		// 완성 수량 초기화
		if (this.completedQty == null) {
			this.completedQty = 0.0;
		}

		// 우선순위 기본값
		if (this.priority == null) {
			this.priority = WmsVasConstants.PRIORITY_NORMAL;
		}
	}
}
