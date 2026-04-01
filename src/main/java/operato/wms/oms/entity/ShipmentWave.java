package operato.wms.oms.entity;

import java.util.Map;

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
 * 출하 웨이브 Entity
 *
 * @author HatioLab
 */
@Table(name = "shipment_waves", idStrategy = GenerationRule.UUID, uniqueFields = "domainId,waveNo", indexes = {
		@Index(name = "ix_shipment_waves_0", columnList = "domain_id,wave_no", unique = true),
		@Index(name = "ix_shipment_waves_1", columnList = "domain_id,wave_date,wave_seq"),
		@Index(name = "ix_shipment_waves_2", columnList = "domain_id,wave_date,com_cd,wh_cd"),
		@Index(name = "ix_shipment_waves_3", columnList = "domain_id,wave_date,status"),
		@Index(name = "ix_shipment_waves_4", columnList = "domain_id,wave_date,carrier_cd"),
		@Index(name = "ix_shipment_waves_5", columnList = "domain_id,wave_date,pick_type")
})
public class ShipmentWave extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 상태 - CREATED (생성)
	 */
	public static final String STATUS_CREATED = "CREATED";
	/**
	 * 상태 - RELEASED (배정완료)
	 */
	public static final String STATUS_RELEASED = "RELEASED";
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
	 * 웨이브 번호
	 */
	@Column(name = "wave_no", nullable = false, length = 30)
	private String waveNo;

	/**
	 * 웨이브 일자 (YYYY-MM-DD)
	 */
	@Column(name = "wave_date", nullable = false, length = 10)
	private String waveDate;

	/**
	 * 웨이브 차수
	 */
	@Column(name = "wave_seq", nullable = false)
	private Integer waveSeq;

	/**
	 * 회사 코드
	 */
	@Column(name = "com_cd", length = 30)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", length = 30)
	private String whCd;

	/**
	 * 피킹 유형 (TOTAL/ZONE/INDIVIDUAL)
	 * - TOTAL: 토털 피킹 (여러 주문을 묶어 SKU별로 피킹 후 분배)
	 * - ZONE: 존별 피킹 (존별로 분할 피킹)
	 * - INDIVIDUAL: 개별 피킹 (주문별로 개별 피킹)
	 */
	@Column(name = "pick_type", length = 20)
	private String pickType;

	/**
	 * 배송 유형 (PARCEL/FREIGHT/CHARTER/QUICK/PICKUP/DIRECT)
	 */
	@Column(name = "dlv_type", length = 20)
	private String dlvType;

	/**
	 * WCS 위임 여부
	 * - true: WCS 시스템에 자동 피킹 지시
	 * - false: 수동 피킹 (종이 리스트 또는 모바일)
	 */
	@Column(name = "wcs_flag")
	private Boolean wcsFlag;

	/**
	 * 택배사 코드
	 */
	@Column(name = "carrier_cd", length = 30)
	private String carrierCd;

	/**
	 * 검수 여부
	 */
	@Column(name = "insp_flag")
	private Boolean inspFlag;

	/**
	 * 라벨 템플릿 코드
	 */
	@Column(name = "label_template_cd", length = 36)
	private String labelTemplateCd;

	/**
	 * 계획 주문 건수
	 */
	@Column(name = "plan_order")
	private Integer planOrder;

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
	 * 실적 주문 건수
	 */
	@Column(name = "result_order")
	private Integer resultOrder;

	/**
	 * 실적 품목 수
	 */
	@Column(name = "result_item")
	private Integer resultItem;

	/**
	 * 실적 총 수량
	 */
	@Column(name = "result_total")
	private Double resultTotal;

	/**
	 * 투입 피커 수
	 */
	@Column(name = "input_pickers")
	private Integer inputPickers;

	/**
	 * 상태 (CREATED/RELEASED/COMPLETED/CANCELLED)
	 */
	@Column(name = "status", nullable = false, length = 20)
	private String status;

	/**
	 * 릴리스 일시
	 */
	@Column(name = "released_at", length = 20)
	private String releasedAt;

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

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
	}

	public String getWaveDate() {
		return waveDate;
	}

	public void setWaveDate(String waveDate) {
		this.waveDate = waveDate;
	}

	public Integer getWaveSeq() {
		return waveSeq;
	}

	public void setWaveSeq(Integer waveSeq) {
		this.waveSeq = waveSeq;
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

	public String getDlvType() {
		return dlvType;
	}

	public void setDlvType(String dlvType) {
		this.dlvType = dlvType;
	}

	public Boolean getWcsFlag() {
		return wcsFlag;
	}

	public void setWcsFlag(Boolean wcsFlag) {
		this.wcsFlag = wcsFlag;
	}

	public String getCarrierCd() {
		return carrierCd;
	}

	public void setCarrierCd(String carrierCd) {
		this.carrierCd = carrierCd;
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

	public Integer getInputPickers() {
		return inputPickers;
	}

	public void setInputPickers(Integer inputPickers) {
		this.inputPickers = inputPickers;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getReleasedAt() {
		return releasedAt;
	}

	public void setReleasedAt(String releasedAt) {
		this.releasedAt = releasedAt;
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

		// 상태 기본값 설정
		if (ValueUtil.isEmpty(this.status)) {
			this.status = STATUS_CREATED;
		}

		// wave_date 기본값 설정 (당일)
		if (ValueUtil.isEmpty(this.waveDate)) {
			this.waveDate = DateUtil.todayStr();
		}

		// 당일 최대 wave_seq 조회
		String seqSql = "SELECT COALESCE(MAX(wave_seq), 0) FROM shipment_waves WHERE domain_id = :domainId AND wave_date = :waveDate";
		Map<String, Object> seqParams = ValueUtil.newMap("domainId,waveDate", domainId, this.waveDate);
		Integer maxSeq = BeanUtil.get(IQueryManager.class).selectBySql(seqSql, seqParams, Integer.class);
		this.waveSeq = (maxSeq != null ? maxSeq : 0) + 1;

		// 웨이브 번호 생성
		this.waveNo = "W-" + this.waveDate.replace("-", "").substring(2) + "-" + String.format("%03d", this.waveSeq);
	}
}
