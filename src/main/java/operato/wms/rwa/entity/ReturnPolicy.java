package operato.wms.rwa.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * 반품 정책 마스터.
 * 화주사별 반품 처리 정책을 정의한다.
 * 반품 입고 시 재입고 가능 여부, 검수 필요 여부, 불량품 처리 방식을 결정하는 기준으로 사용된다.
 */
@Table(name = "return_policies", idStrategy = GenerationRule.UUID, uniqueFields = "comCd,domainId", indexes = {
		@Index(name = "ix_return_policies_0", columnList = "com_cd,domain_id", unique = true)
})
public class ReturnPolicy extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 392847165028374916L;

	/**
	 * 반품 정책 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 화주사 코드. 화주사당 1개 정책
	 */
	@Column(name = "com_cd", nullable = false, length = 20)
	private String comCd;

	/**
	 * 반품 허용 기간 (일). 출고일 기준. NULL이면 기간 제한 없음
	 */
	@Column(name = "return_period_days")
	private Integer returnPeriodDays;

	/**
	 * 반품 입고 시 검수 필수 여부
	 */
	@Column(name = "inspect_required")
	private Boolean inspectRequired;

	/**
	 * 정상 반품품 재입고 허용 여부
	 */
	@Column(name = "restock_yn")
	private Boolean restockYn;

	/**
	 * 재입고 기본 로케이션 코드. NULL이면 원래 로케이션으로 복귀
	 */
	@Column(name = "restock_loc_cd", length = 20)
	private String restockLocCd;

	/**
	 * 불량품 처리 방식 (RESTOCK/DEFECT_LOC/SCRAP/RETURN_VEND)
	 */
	@Column(name = "defect_handling", length = 20)
	private String defectHandling;

	/**
	 * 불량품 이동 대상 로케이션 코드
	 */
	@Column(name = "defect_loc_cd", length = 20)
	private String defectLocCd;

	/**
	 * 재입고 시 재고 가치 차감률 (0.00~1.00). 중고 처리 시 활용
	 */
	@Column(name = "restock_deduct_rate")
	private Double restockDeductRate;

	/**
	 * 검수 없이 자동 재입고 허용 여부
	 */
	@Column(name = "auto_restock_yn")
	private Boolean autoRestockYn;

	/**
	 * 삭제 여부
	 */
	@Column(name = "del_flag")
	private Boolean delFlag;

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

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public Integer getReturnPeriodDays() {
		return returnPeriodDays;
	}

	public void setReturnPeriodDays(Integer returnPeriodDays) {
		this.returnPeriodDays = returnPeriodDays;
	}

	public Boolean getInspectRequired() {
		return inspectRequired;
	}

	public void setInspectRequired(Boolean inspectRequired) {
		this.inspectRequired = inspectRequired;
	}

	public Boolean getRestockYn() {
		return restockYn;
	}

	public void setRestockYn(Boolean restockYn) {
		this.restockYn = restockYn;
	}

	public String getRestockLocCd() {
		return restockLocCd;
	}

	public void setRestockLocCd(String restockLocCd) {
		this.restockLocCd = restockLocCd;
	}

	public String getDefectHandling() {
		return defectHandling;
	}

	public void setDefectHandling(String defectHandling) {
		this.defectHandling = defectHandling;
	}

	public String getDefectLocCd() {
		return defectLocCd;
	}

	public void setDefectLocCd(String defectLocCd) {
		this.defectLocCd = defectLocCd;
	}

	public Double getRestockDeductRate() {
		return restockDeductRate;
	}

	public void setRestockDeductRate(Double restockDeductRate) {
		this.restockDeductRate = restockDeductRate;
	}

	public Boolean getAutoRestockYn() {
		return autoRestockYn;
	}

	public void setAutoRestockYn(Boolean autoRestockYn) {
		this.autoRestockYn = autoRestockYn;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}
}
