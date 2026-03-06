package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "waves", idStrategy = GenerationRule.UUID, uniqueFields="domainId,waveNo", indexes = {
	@Index(name = "ix_waves_0", columnList = "domain_id,wave_no", unique = true),
	@Index(name = "ix_waves_1", columnList = "domain_id,job_date,job_seq"),
	@Index(name = "ix_waves_2", columnList = "domain_id,job_date,com_cd,wh_cd"),
	@Index(name = "ix_waves_3", columnList = "domain_id,job_date,rls_type"),
	@Index(name = "ix_waves_4", columnList = "domain_id,job_date,export_flag,insp_flag"),
	@Index(name = "ix_waves_5", columnList = "domain_id,job_date,status")
})
public class Wave extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 996966121702347008L;
	
	/**
	 * 피킹 상태 - WAIT (대기)
	 */
	public static final String STATUS_WAIT = "WAIT";
	/**
	 * 피킹 상태 - RUN (실행 중)
	 */
	public static final String STATUS_RUN = "RUN";
	/**
	 * 피킹 상태 - END (완료)
	 */
	public static final String STATUS_END = "END";
	/**
	 * 피킹 상태 - CANCEL (취소)
	 */
	public static final String STATUS_CANCEL = "CANCEL";

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "wave_no", nullable = false, length = 30)
	private String waveNo;

	@Column (name = "job_date", nullable = false, length = 10)
	private String jobDate;

	@Column (name = "job_seq", nullable = false, length = 10)
	private String jobSeq;

	@Column (name = "com_cd", length = 30)
	private String comCd;

	@Column (name = "wh_cd", length = 30)
	private String whCd;

	@Column (name = "wave_type", length = 20)
	private String waveType;

	@Column (name = "rls_type", length = 20)
	private String rlsType;

	@Column (name = "rls_exe_type", length = 20)
	private String rlsExeType;

	@Column (name = "export_flag")
	private Boolean exportFlag;

	@Column (name = "insp_flag")
	private Boolean inspFlag;

	@Column (name = "label_template_cd", length = 36)
	private String labelTemplateCd;

	@Column (name = "plan_order")
	private Integer planOrder;

	@Column (name = "plan_sku")
	private Integer planSku;

	@Column (name = "plan_pcs")
	private Float planPcs;

	@Column (name = "result_order")
	private Integer resultOrder;

	@Column (name = "result_sku")
	private Integer resultSku;

	@Column (name = "result_pcs")
	private Float resultPcs;

	@Column (name = "status", length = 20)
	private String status;

	@Column (name = "started_at", length = 20)
	private String startedAt;

	@Column (name = "finished_at", length = 20)
	private String finishedAt;

	@Column (name = "reported_at", length = 20)
	private String reportedAt;

	@Column (name = "remarks", length = 1000)
	private String remarks;

	@Column (name = "attr01", length = 100)
	private String attr01;

	@Column (name = "attr02", length = 100)
	private String attr02;

	@Column (name = "attr03", length = 100)
	private String attr03;

	@Column (name = "attr04", length = 100)
	private String attr04;

	@Column (name = "attr05", length = 100)
	private String attr05;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
	}

	public String getJobDate() {
		return jobDate;
	}

	public void setJobDate(String jobDate) {
		this.jobDate = jobDate;
	}

	public String getJobSeq() {
		return jobSeq;
	}

	public void setJobSeq(String jobSeq) {
		this.jobSeq = jobSeq;
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

	public String getWaveType() {
		return waveType;
	}

	public void setWaveType(String waveType) {
		this.waveType = waveType;
	}

	public String getRlsType() {
		return rlsType;
	}

	public void setRlsType(String rlsType) {
		this.rlsType = rlsType;
	}

	public String getRlsExeType() {
		return rlsExeType;
	}

	public void setRlsExeType(String rlsExeType) {
		this.rlsExeType = rlsExeType;
	}

	public Boolean getExportFlag() {
		return exportFlag;
	}

	public void setExportFlag(Boolean exportFlag) {
		this.exportFlag = exportFlag;
	}

	public Boolean getInspFlag() {
		return inspFlag;
	}

	public void setInspFlag(Boolean inspFlag) {
		this.inspFlag = inspFlag;
	}

	public String getLabelTemplateCd() {
		return labelTemplateCd;
	}

	public void setLabelTemplateCd(String labelTemplateCd) {
		this.labelTemplateCd = labelTemplateCd;
	}

	public Integer getPlanOrder() {
		return planOrder;
	}

	public void setPlanOrder(Integer planOrder) {
		this.planOrder = planOrder;
	}

	public Integer getPlanSku() {
		return planSku;
	}

	public void setPlanSku(Integer planSku) {
		this.planSku = planSku;
	}

	public Float getPlanPcs() {
		return planPcs;
	}

	public void setPlanPcs(Float planPcs) {
		this.planPcs = planPcs;
	}

	public Integer getResultOrder() {
		return resultOrder;
	}

	public void setResultOrder(Integer resultOrder) {
		this.resultOrder = resultOrder;
	}

	public Integer getResultSku() {
		return resultSku;
	}

	public void setResultSku(Integer resultSku) {
		this.resultSku = resultSku;
	}

	public Float getResultPcs() {
		return resultPcs;
	}

	public void setResultPcs(Float resultPcs) {
		this.resultPcs = resultPcs;
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

	public String getFinishedAt() {
		return finishedAt;
	}

	public void setFinishedAt(String finishedAt) {
		this.finishedAt = finishedAt;
	}

	public String getReportedAt() {
		return reportedAt;
	}

	public void setReportedAt(String reportedAt) {
		this.reportedAt = reportedAt;
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
