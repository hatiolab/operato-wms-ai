package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 보관 정책 마스터
 *
 * 화주사별 재고 보관 운영 기준을 정의한다.
 * 재고 불출 순서(FIFO/FEFO/LIFO), 유통기한 알림·차단 기준,
 * 자동 발주 여부 등을 화주사 단위로 설정한다.
 *
 * @author shortstop
 */
@Table(name = "storage_policies", idStrategy = GenerationRule.UUID, uniqueFields = "comCd,whCd,domainId", indexes = {
		@Index(name = "ix_storage_policies_0", columnList = "com_cd,wh_cd,domain_id", unique = true),
		@Index(name = "ix_storage_policies_1", columnList = "com_cd,release_strategy,domain_id")
})
public class StoragePolicy extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 391748562013847295L;

	/** 불출 전략: 입고일 선입선출 */
	public static final String RELEASE_STRATEGY_FIFO = "FIFO";
	/** 불출 전략: 유통기한 임박순 */
	public static final String RELEASE_STRATEGY_FEFO = "FEFO";
	/** 불출 전략: 후입선출 */
	public static final String RELEASE_STRATEGY_LIFO = "LIFO";
	/** 불출 전략: 수동 선택 */
	public static final String RELEASE_STRATEGY_MANUAL = "MANUAL";

	/** 적치 전략: SKU별 고정 로케이션 (Location.skuCd 기준) */
	public static final String PUTAWAY_STRATEGY_FIXED = "FIXED";
	/** 적치 전략: 빈 로케이션 자동 배정 (화주사 전용 또는 공용) */
	public static final String PUTAWAY_STRATEGY_RANDOM = "RANDOM";
	/** 적치 전략: SKU 속성(tempType) 기준 존 내 배정 */
	public static final String PUTAWAY_STRATEGY_ZONE = "ZONE";
	/** 적치 전략: 도크에서 가장 가까운 빈 로케이션 (Location.sortNo ASC) */
	public static final String PUTAWAY_STRATEGY_NEAREST = "NEAREST";

	/**
	 * 보관 정책 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 화주사 코드 - 이 정책이 적용되는 화주사 코드.
	 * whCd와 조합하여 도메인 내 유일
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 창고 코드 - 특정 창고에만 적용할 경우 지정.
	 * NULL이면 해당 화주사의 전체 창고에 적용
	 */
	@Column(name = "wh_cd", length = 30)
	private String whCd;

	/**
	 * 불출 순서 전략 - 재고 할당 시 사용할 불출 순서 기준.
	 * FIFO(입고일 선입선출), FEFO(유통기한 임박순), LIFO(후입선출), MANUAL(수동 선택)
	 */
	@Column(name = "release_strategy", length = 10)
	private String releaseStrategy = "FIFO";

	/**
	 * 유통기한 임박 알림 기준일 - 잔여 유통기한이 이 값(일) 이하로 남으면 경고 알림 발생.
	 * 예: 30 → 유통기한 30일 이하 재고 경고
	 */
	@Column(name = "expiry_alert_days")
	private Integer expiryAlertDays;

	/**
	 * 출고 차단 기준일 - 잔여 유통기한이 이 값(일) 이하이면 출고 불가 처리.
	 * 예: 7 → 유통기한 7일 이하 재고는 출고 차단
	 */
	@Column(name = "expiry_block_days")
	private Integer expiryBlockDays;

	/**
	 * 자동 발주 여부 - true이면 SKU.reorderPoint 도달 시 자동 발주 지시를 생성.
	 * false이면 담당자가 수동으로 발주
	 */
	@Column(name = "auto_reorder_flag")
	private Boolean autoReorderFlag = false;

	/**
	 * 입고 적치 전략 - 입고 상품을 어느 로케이션에 보관할지 결정하는 알고리즘.
	 * FIXED: SKU별 고정 로케이션(Location.skuCd 기준),
	 * RANDOM: 빈 로케이션 자동 배정,
	 * ZONE: SKU 속성(tempType/hazmatFlag) 기준 존 내 배정,
	 * NEAREST: 도크에서 가장 가까운 빈 로케이션(Location.sortNo 오름차순 기준)
	 */
	@Column(name = "putaway_strategy", length = 10)
	private String putawayStrategy;

	/**
	 * 입고 완료 후 기본 대기 로케이션 - 적치 로케이션 미지정 시 임시 보관할 기본 로케이션 코드.
	 * 입고 검수 완료 후 적치 지시 전 임시 대기 구역
	 */
	@Column(name = "default_wait_loc", length = 30)
	private String defaultWaitLoc;

	/**
	 * 입고지시서 템플릿 - 입고 작업 지시서 출력 시 사용할 리포트 템플릿 코드
	 */
	@Column(name = "inbound_sheet_tmpl", length = 30)
	private String inboundSheetTmpl;

	/**
	 * 재고 바코드 라벨 템플릿 - 입고 처리 완료 시 출력할 재고 바코드 라벨 템플릿 코드
	 */
	@Column(name = "inv_label_tmpl", length = 30)
	private String invLabelTmpl;

	/**
	 * 피킹지시서 템플릿 - 피킹 작업 지시서 출력 시 사용할 리포트 템플릿 코드
	 */
	@Column(name = "picking_sheet_tmpl", length = 30)
	private String pickingSheetTmpl;

	/**
	 * 피킹 후 재고 이동 여부 - true이면 피킹 완료 후 재고를 피킹존에서 포장존으로 이동 처리.
	 * false이면 피킹존에서 바로 포장 진행
	 */
	@Column(name = "picked_inv_move_flag")
	private Boolean pickedInvMoveFlag = false;

	/**
	 * B2B 출고 라벨 템플릿 - B2B 납품 시 출력할 출고 라벨 템플릿 코드 (파렛트 라벨 등)
	 */
	@Column(name = "b2b_label_tmpl", length = 30)
	private String b2bLabelTmpl;

	/**
	 * B2C 출고 라벨 템플릿 - B2C 택배 출고 시 출력할 송장/라벨 템플릿 코드
	 */
	@Column(name = "b2c_label_tmpl", length = 30)
	private String b2cLabelTmpl;

	/**
	 * 출고 거래명세서 템플릿 - 출고 시 출력할 거래명세서 리포트 템플릿 코드
	 */
	@Column(name = "outbound_sheet_tmpl", length = 30)
	private String outboundSheetTmpl;

	/**
	 * B2B 웨이브 사용 여부 - true이면 B2B 출고 시 웨이브 기반 피킹 처리.
	 * false이면 주문별 개별 피킹
	 */
	@Column(name = "b2b_wave_flag")
	private Boolean b2bWaveFlag = false;

	/**
	 * B2B 웨이브 생성 트리거 - B2B 웨이브를 언제 자동 생성할지 결정.
	 * MANUAL: 수동 생성, SCHEDULE: 스케줄 시각 기준, COUNT: 누적 주문 수 기준
	 */
	@Column(name = "b2b_wave_trigger", length = 10)
	private String b2bWaveTrigger;

	/**
	 * B2B 웨이브 생성 누적 개수 - b2bWaveTrigger = COUNT일 때 웨이브 자동 생성 임계 주문 수
	 */
	@Column(name = "b2b_wave_trigger_cnt")
	private Integer b2bWaveTriggerCnt;

	/**
	 * B2B 웨이브 생성 시 그룹핑 조건
	 */
	@Column(name = "b2b_wave_group_by", length = 50)
	private String b2bWaveGroupBy;

	/**
	 * B2C 웨이브 사용 여부 - true이면 B2C 출고 시 웨이브 기반 피킹 처리.
	 * false이면 주문별 개별 피킹
	 */
	@Column(name = "b2c_wave_flag")
	private Boolean b2cWaveFlag = false;

	/**
	 * B2C 웨이브 생성 트리거 - B2C 웨이브를 언제 자동 생성할지 결정.
	 * MANUAL: 수동 생성, SCHEDULE: 스케줄 시각 기준, COUNT: 누적 주문 수 기준
	 */
	@Column(name = "b2c_wave_trigger", length = 10)
	private String b2cWaveTrigger;

	/**
	 * B2C 웨이브 생성 누적 개수 - b2cWaveTrigger = COUNT일 때 웨이브 자동 생성 임계 주문 수
	 */
	@Column(name = "b2c_wave_trigger_cnt")
	private Integer b2cWaveTriggerCnt;

	/**
	 * B2C 웨이브 생성 시 그룹핑 조건
	 */
	@Column(name = "b2c_wave_group_by", length = 50)
	private String b2cWaveGroupBy;

	/**
	 * 삭제 여부 - true이면 비활성화된 정책. 신규 재고 처리 시 적용 제외
	 */
	@Column(name = "del_flag")
	private Boolean delFlag = false;

	/**
	 * 비고 - 운영 메모 또는 정책 변경 이력 등 자유 기록
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

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getReleaseStrategy() {
		return releaseStrategy;
	}

	public void setReleaseStrategy(String releaseStrategy) {
		this.releaseStrategy = releaseStrategy;
	}

	public Integer getExpiryAlertDays() {
		return expiryAlertDays;
	}

	public void setExpiryAlertDays(Integer expiryAlertDays) {
		this.expiryAlertDays = expiryAlertDays;
	}

	public Integer getExpiryBlockDays() {
		return expiryBlockDays;
	}

	public void setExpiryBlockDays(Integer expiryBlockDays) {
		this.expiryBlockDays = expiryBlockDays;
	}

	public Boolean getAutoReorderFlag() {
		return autoReorderFlag;
	}

	public void setAutoReorderFlag(Boolean autoReorderFlag) {
		this.autoReorderFlag = autoReorderFlag;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
	}

	public String getPutawayStrategy() {
		return putawayStrategy;
	}

	public void setPutawayStrategy(String putawayStrategy) {
		this.putawayStrategy = putawayStrategy;
	}

	public String getDefaultWaitLoc() {
		return defaultWaitLoc;
	}

	public void setDefaultWaitLoc(String defaultWaitLoc) {
		this.defaultWaitLoc = defaultWaitLoc;
	}

	public String getInboundSheetTmpl() {
		return inboundSheetTmpl;
	}

	public void setInboundSheetTmpl(String inboundSheetTmpl) {
		this.inboundSheetTmpl = inboundSheetTmpl;
	}

	public String getInvLabelTmpl() {
		return invLabelTmpl;
	}

	public void setInvLabelTmpl(String invLabelTmpl) {
		this.invLabelTmpl = invLabelTmpl;
	}

	public String getPickingSheetTmpl() {
		return pickingSheetTmpl;
	}

	public void setPickingSheetTmpl(String pickingSheetTmpl) {
		this.pickingSheetTmpl = pickingSheetTmpl;
	}

	public Boolean getPickedInvMoveFlag() {
		return pickedInvMoveFlag;
	}

	public void setPickedInvMoveFlag(Boolean pickedInvMoveFlag) {
		this.pickedInvMoveFlag = pickedInvMoveFlag;
	}

	public String getB2bLabelTmpl() {
		return b2bLabelTmpl;
	}

	public void setB2bLabelTmpl(String b2bLabelTmpl) {
		this.b2bLabelTmpl = b2bLabelTmpl;
	}

	public String getB2cLabelTmpl() {
		return b2cLabelTmpl;
	}

	public void setB2cLabelTmpl(String b2cLabelTmpl) {
		this.b2cLabelTmpl = b2cLabelTmpl;
	}

	public String getOutboundSheetTmpl() {
		return outboundSheetTmpl;
	}

	public void setOutboundSheetTmpl(String outboundSheetTmpl) {
		this.outboundSheetTmpl = outboundSheetTmpl;
	}

	public Boolean getB2bWaveFlag() {
		return b2bWaveFlag;
	}

	public void setB2bWaveFlag(Boolean b2bWaveFlag) {
		this.b2bWaveFlag = b2bWaveFlag;
	}

	public String getB2bWaveTrigger() {
		return b2bWaveTrigger;
	}

	public void setB2bWaveTrigger(String b2bWaveTrigger) {
		this.b2bWaveTrigger = b2bWaveTrigger;
	}

	public Integer getB2bWaveTriggerCnt() {
		return b2bWaveTriggerCnt;
	}

	public void setB2bWaveTriggerCnt(Integer b2bWaveTriggerCnt) {
		this.b2bWaveTriggerCnt = b2bWaveTriggerCnt;
	}

	public String getB2bWaveGroupBy() {
		return b2bWaveGroupBy;
	}

	public void setB2bWaveGroupBy(String b2bWaveGroupBy) {
		this.b2bWaveGroupBy = b2bWaveGroupBy;
	}

	public Boolean getB2cWaveFlag() {
		return b2cWaveFlag;
	}

	public void setB2cWaveFlag(Boolean b2cWaveFlag) {
		this.b2cWaveFlag = b2cWaveFlag;
	}

	public String getB2cWaveTrigger() {
		return b2cWaveTrigger;
	}

	public void setB2cWaveTrigger(String b2cWaveTrigger) {
		this.b2cWaveTrigger = b2cWaveTrigger;
	}

	public Integer getB2cWaveTriggerCnt() {
		return b2cWaveTriggerCnt;
	}

	public void setB2cWaveTriggerCnt(Integer b2cWaveTriggerCnt) {
		this.b2cWaveTriggerCnt = b2cWaveTriggerCnt;
	}

	public String getB2cWaveGroupBy() {
		return b2cWaveGroupBy;
	}

	public void setB2cWaveGroupBy(String b2cWaveGroupBy) {
		this.b2cWaveGroupBy = b2cWaveGroupBy;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}
}
