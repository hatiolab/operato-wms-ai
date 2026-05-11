package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * 보충 규칙 마스터.
 * 피킹존(전방 로케이션)의 재고 자동 보충 규칙을 정의한다.
 * 재고가 trigger_qty 이하가 되면 보관존(후방 벌크)에서 피킹존으로 보충 지시를 자동 생성한다.
 */
@Table(name = "replenish_rules", idStrategy = GenerationRule.UUID, uniqueFields = "comCd,whCd,skuCd,toLocCd,domainId", indexes = {
		@Index(name = "ix_replenish_rules_0", columnList = "com_cd,wh_cd,sku_cd,to_loc_cd,domain_id", unique = true),
		@Index(name = "ix_replenish_rules_1", columnList = "com_cd,wh_cd,sku_cd,domain_id"),
		@Index(name = "ix_replenish_rules_2", columnList = "wh_cd,active_flag,domain_id")
})
public class ReplenishRule extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 570293841627485039L;

	/**
	 * 보충 규칙 고유 ID (UUID)
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
	 * 상품 코드
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 보충 출발 로케이션 코드 (보관존). NULL이면 자동 결정
	 */
	@Column(name = "from_loc_cd", length = 20)
	private String fromLocCd;

	/**
	 * 보충 도착 로케이션 코드 (피킹존)
	 */
	@Column(name = "to_loc_cd", nullable = false, length = 20)
	private String toLocCd;

	/**
	 * 보충 트리거 유형 (QTY/RATIO/TIME)
	 */
	@Column(name = "trigger_type", length = 10)
	private String triggerType;

	/**
	 * 보충 트리거 수량. 재고가 이 값 이하가 되면 보충 지시 생성
	 */
	@Column(name = "trigger_qty")
	private Double triggerQty;

	/**
	 * 보충 트리거 비율 (0.00~1.00). trigger_type=RATIO 시 사용
	 */
	@Column(name = "trigger_ratio")
	private Double triggerRatio;

	/**
	 * 1회 보충 수량. NULL이면 max_qty까지 채움
	 */
	@Column(name = "replenish_qty")
	private Double replenishQty;

	/**
	 * 피킹 로케이션 최대 보관 수량
	 */
	@Column(name = "max_qty")
	private Double maxQty;

	/**
	 * 보충 작업 우선순위 (낮을수록 먼저 처리, 기본값 50)
	 */
	@Column(name = "priority")
	private Integer priority;

	/**
	 * 규칙 활성화 여부
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

	public String getSkuCd() {
		return skuCd;
	}

	public void setSkuCd(String skuCd) {
		this.skuCd = skuCd;
	}

	public String getFromLocCd() {
		return fromLocCd;
	}

	public void setFromLocCd(String fromLocCd) {
		this.fromLocCd = fromLocCd;
	}

	public String getToLocCd() {
		return toLocCd;
	}

	public void setToLocCd(String toLocCd) {
		this.toLocCd = toLocCd;
	}

	public String getTriggerType() {
		return triggerType;
	}

	public void setTriggerType(String triggerType) {
		this.triggerType = triggerType;
	}

	public Double getTriggerQty() {
		return triggerQty;
	}

	public void setTriggerQty(Double triggerQty) {
		this.triggerQty = triggerQty;
	}

	public Double getTriggerRatio() {
		return triggerRatio;
	}

	public void setTriggerRatio(Double triggerRatio) {
		this.triggerRatio = triggerRatio;
	}

	public Double getReplenishQty() {
		return replenishQty;
	}

	public void setReplenishQty(Double replenishQty) {
		this.replenishQty = replenishQty;
	}

	public Double getMaxQty() {
		return maxQty;
	}

	public void setMaxQty(Double maxQty) {
		this.maxQty = maxQty;
	}

	public Integer getPriority() {
		return priority;
	}

	public void setPriority(Integer priority) {
		this.priority = priority;
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
