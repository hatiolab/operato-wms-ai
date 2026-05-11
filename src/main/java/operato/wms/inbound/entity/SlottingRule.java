package operato.wms.inbound.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * 로케이션 배정 규칙 마스터.
 * SKU 속성(SKU 유형·온도 유형·ABC 등급·위험물 여부) 조건에 따라
 * 입고·적치 시 자동 배정할 구역(zone) 및 로케이션 유형·선택 전략을 정의한다.
 */
@Table(name = "slotting_rules", idStrategy = GenerationRule.UUID, indexes = {
		@Index(name = "ix_slotting_rules_0", columnList = "com_cd,wh_cd,domain_id"),
		@Index(name = "ix_slotting_rules_1", columnList = "com_cd,wh_cd,active_flag,domain_id")
})
public class SlottingRule extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 183746250917384628L;

	/**
	 * 로케이션 배정 규칙 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 20)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", nullable = false, length = 20)
	private String whCd;

	/**
	 * 규칙 명칭
	 */
	@Column(name = "rule_nm", nullable = false, length = 100)
	private String ruleNm;

	/**
	 * 규칙 적용 우선순위 (숫자 낮을수록 먼저 적용, 기본값 50)
	 */
	@Column(name = "priority")
	private Integer priority;

	/**
	 * 조건: SKU 코드 (특정 SKU에만 적용 시 지정)
	 */
	@Column(name = "cond_sku_cd", length = 30)
	private String condSkuCd;

	/**
	 * 조건: SKU 유형 (NORMAL/HEAVY/FRAGILE/OVERSIZED)
	 */
	@Column(name = "cond_sku_type", length = 20)
	private String condSkuType;

	/**
	 * 조건: 온도 유형 (ROOM/COLD/FROZEN)
	 */
	@Column(name = "cond_temp_type", length = 20)
	private String condTempType;

	/**
	 * 조건: ABC 등급 (A/B/C)
	 */
	@Column(name = "cond_abc_class", length = 5)
	private String condAbcClass;

	/**
	 * 조건: 위험물 여부
	 */
	@Column(name = "cond_hazmat")
	private Boolean condHazmat;

	/**
	 * 배정 대상: 구역 코드
	 */
	@Column(name = "target_zone_cd", length = 20)
	private String targetZoneCd;

	/**
	 * 배정 대상: 로케이션 유형 (RACK/FLOOR/SHELF/REFRIGERATOR/FREEZER)
	 */
	@Column(name = "target_loc_type", length = 20)
	private String targetLocType;

	/**
	 * 로케이션 선택 전략 (EMPTY_FIRST/NEAR_PICK/MIN_TRAVEL)
	 */
	@Column(name = "select_strategy", length = 20)
	private String selectStrategy;

	/**
	 * 규칙 활성 여부
	 */
	@Column(name = "active_flag")
	private Boolean activeFlag;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 255)
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

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getRuleNm() {
		return ruleNm;
	}

	public void setRuleNm(String ruleNm) {
		this.ruleNm = ruleNm;
	}

	public Integer getPriority() {
		return priority;
	}

	public void setPriority(Integer priority) {
		this.priority = priority;
	}

	public String getCondSkuCd() {
		return condSkuCd;
	}

	public void setCondSkuCd(String condSkuCd) {
		this.condSkuCd = condSkuCd;
	}

	public String getCondSkuType() {
		return condSkuType;
	}

	public void setCondSkuType(String condSkuType) {
		this.condSkuType = condSkuType;
	}

	public String getCondTempType() {
		return condTempType;
	}

	public void setCondTempType(String condTempType) {
		this.condTempType = condTempType;
	}

	public String getCondAbcClass() {
		return condAbcClass;
	}

	public void setCondAbcClass(String condAbcClass) {
		this.condAbcClass = condAbcClass;
	}

	public Boolean getCondHazmat() {
		return condHazmat;
	}

	public void setCondHazmat(Boolean condHazmat) {
		this.condHazmat = condHazmat;
	}

	public String getTargetZoneCd() {
		return targetZoneCd;
	}

	public void setTargetZoneCd(String targetZoneCd) {
		this.targetZoneCd = targetZoneCd;
	}

	public String getTargetLocType() {
		return targetLocType;
	}

	public void setTargetLocType(String targetLocType) {
		this.targetLocType = targetLocType;
	}

	public String getSelectStrategy() {
		return selectStrategy;
	}

	public void setSelectStrategy(String selectStrategy) {
		this.selectStrategy = selectStrategy;
	}

	public Boolean getActiveFlag() {
		return activeFlag;
	}

	public void setActiveFlag(Boolean activeFlag) {
		this.activeFlag = activeFlag;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}
}
