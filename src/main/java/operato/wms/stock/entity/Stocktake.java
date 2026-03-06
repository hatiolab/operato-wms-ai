package operato.wms.stock.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "stocktakes", idStrategy = GenerationRule.UUID, uniqueFields="comCd,whCd,jobDate,jobSeq,domainId", indexes = {
	@Index(name = "ix_stocktakes_0", columnList = "com_cd,wh_cd,job_date,job_seq,domain_id", unique = true)
})
public class Stocktake extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 500379602915342592L;
	
	/**
     * 재고 실사 상태 - WAIT (대기)
     */
    public static final String STATUS_WAIT = "WAIT";
    /**
     * 재고 실사 상태 - RUN (실행 중)
     */
    public static final String STATUS_RUN = "RUN";
    /**
     * 재고 실사 상태 - END (완료)
     */
    public static final String STATUS_END = "END";
    /**
     * 재고 실사 상태 - CANCEL (취소)
     */
    public static final String STATUS_CANCEL = "CANCEL";

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	@Column (name = "job_date", nullable = false, length = 10)
	private String jobDate;

	@Column (name = "job_seq", nullable = false)
	private Integer jobSeq;

	@Column (name = "plan_sku")
	private Integer planSku;

	@Column (name = "result_sku")
	private Integer resultSku;
	
    @Column (name = "diff_sku")
    private Integer diffSku;

	@Column (name = "remarks", length = 1000)
	private String remarks;

	@Column (name = "status", length = 10)
	private String status;
	
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

	public String getJobDate() {
		return jobDate;
	}

	public void setJobDate(String jobDate) {
		this.jobDate = jobDate;
	}

	public Integer getJobSeq() {
		return jobSeq;
	}

	public void setJobSeq(Integer jobSeq) {
		this.jobSeq = jobSeq;
	}

	public Integer getPlanSku() {
		return planSku;
	}

	public void setPlanSku(Integer planSku) {
		this.planSku = planSku;
	}

	public Integer getResultSku() {
		return resultSku;
	}

	public void setResultSku(Integer resultSku) {
		this.resultSku = resultSku;
	}

	public Integer getDiffSku() {
        return diffSku;
    }

    public void setDiffSku(Integer diffSku) {
        this.diffSku = diffSku;
    }

    public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
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
