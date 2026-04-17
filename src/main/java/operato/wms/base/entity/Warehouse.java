package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * 창고 마스터
 * 
 * @author shortstop
 */
@Table(name = "warehouses", idStrategy = GenerationRule.UUID, uniqueFields="whCd,domainId", indexes = {
	@Index(name = "ix_warehouses_0", columnList = "wh_cd,domain_id", unique = true),
	@Index(name = "ix_warehouses_1", columnList = "wh_nm,domain_id"),
	@Index(name = "ix_warehouses_2", columnList = "wh_type,domain_id"),
	@Index(name = "ix_warehouses_3", columnList = "del_flag,domain_id")
})
public class Warehouse extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 118882544350121487L;

	/**
	 * 창고 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 창고 코드 - 도메인 내 고유 창고 식별 코드 (예: WH-A, INCHEON-01).
	 * Location.whCd, Company.whCd 등 전 모듈에서 참조
	 */
	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 창고 명칭 - 창고 공식 명칭 (예: 인천 물류센터 1동)
	 */
	@Column (name = "wh_nm", nullable = false, length = 100)
	private String whNm;

	/**
	 * 창고 별칭 - 내부 관리용 약칭 또는 줄임말 (예: 인천1)
	 */
	@Column (name = "wh_alias", length = 100)
	private String whAlias;

	/**
	 * 창고 유형 - 창고 기능/용도 분류 코드
	 * (예: GENERAL-일반, COLD-냉장, FROZEN-냉동, BONDED-보세, HAZMAT-위험물)
	 */
	@Column (name = "wh_type", length = 20)
	private String whType;

	/**
	 * 창고 그룹 - 복수의 창고를 묶어 관리하는 그룹 코드 (예: 계열사 통합 물류, 지역별 거점)
	 */
	@Column (name = "wh_group", length = 20)
	private String whGroup;

	/**
	 * 운영 유형 - 창고 운영 방식 코드
	 * (예: SELF-자가물류, 3PL-위탁물류, CONSIGN-위탁보관)
	 */
	@Column (name = "op_type", length = 20)
	private String opType;

	/**
	 * 창고 대표 전화번호 - 운송사·화주사 연락 시 기준 전화번호
	 */
	@Column (name = "wh_tel_no", length = 20)
	private String whTelNo;

	/**
	 * 창고 담당자 이름 - 입출고 협의 및 긴급 연락 담당자
	 */
	@Column (name = "wh_mgr_nm", length = 50)
	private String whMgrNm;

	/**
	 * 창고 담당자 전화번호
	 */
	@Column (name = "wh_mgr_phone", length = 20)
	private String whMgrPhone;

	/**
	 * 창고 담당자 이메일
	 */
	@Column (name = "wh_mgr_email", length = 50)
	private String whMgrEmail;

	/**
	 * 화주사 전용 코드 - 특정 화주사 전용으로 운영하는 창고의 화주사 코드.
	 * 값이 있으면 해당 화주사 재고만 보관 가능 (3PL 멀티 화주 구역 분리)
	 */
	@Column (name = "com_cd", length = 20)
	private String comCd;

	/**
	 * 우편번호 - 창고 소재지 우편번호
	 */
	@Column (name = "zip_cd", length = 10)
	private String zipCd;

	/**
	 * 창고 주소 - 창고 소재지 상세 주소
	 */
	@Column (name = "address")
	private String address;

	/**
	 * 창고 총 면적 (㎡) - 보관 용량 계획 및 보관료 산정 기준값
	 */
	@Column (name = "total_area")
	private Float totalArea;

	/**
	 * 최대 팔레트 수용 수 - 창고에 보관 가능한 최대 팔레트 수.
	 * 입고 가능 여부 사전 판단 및 재고 용량 모니터링에 활용
	 */
	@Column (name = "max_pallet_cnt")
	private Integer maxPalletCnt;

	/**
	 * 하역 도크 수 - 동시에 사용 가능한 입출고 도크 수.
	 * 차량 예약 및 동시 처리 가능 건수 제한에 활용
	 */
	@Column (name = "dock_cnt")
	private Integer dockCnt;

	/**
	 * 보관 최저 온도 (°C) - 냉장/냉동 창고의 최저 보관 온도.
	 * SKU의 tempType 매칭 검증에 활용
	 */
	@Column (name = "temp_min")
	private Float tempMin;

	/**
	 * 보관 최고 온도 (°C) - 냉장/냉동 창고의 최고 보관 온도
	 */
	@Column (name = "temp_max")
	private Float tempMax;

	/**
	 * 운영 시작 시간 (HH:mm) - 창고 운영 시작 시각.
	 * 입고 예약 가능 시간 및 납기일 계산에 활용
	 */
	@Column (name = "op_start_time", length = 5)
	private String opStartTime;

	/**
	 * 운영 종료 시간 (HH:mm) - 창고 운영 종료 시각
	 */
	@Column (name = "op_end_time", length = 5)
	private String opEndTime;

	/**
	 * 타임존 - 창고 소재지 타임존 코드 (예: Asia/Seoul, America/Los_Angeles).
	 * 다국가·다지역 창고 운영 시 시간 기준 통일에 필수
	 */
	@Column (name = "timezone", length = 50)
	private String timezone;

	/**
	 * 삭제 여부 - true이면 사용 중지된 창고. 입출고 대상에서 제외됨
	 */
	@Column (name = "del_flag")
	private Boolean delFlag = false;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 255)
	private String remarks;

	/**
	 * 사용자 정의 속성 1 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr01", length = 100)
	private String attr01;

	/**
	 * 사용자 정의 속성 2 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr02", length = 100)
	private String attr02;

	/**
	 * 사용자 정의 속성 3 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr03", length = 100)
	private String attr03;

	/**
	 * 사용자 정의 속성 4 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr04", length = 100)
	private String attr04;

	/**
	 * 사용자 정의 속성 5 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr05", length = 100)
	private String attr05;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getWhNm() {
		return whNm;
	}

	public void setWhNm(String whNm) {
		this.whNm = whNm;
	}

	public String getWhAlias() {
		return whAlias;
	}

	public void setWhAlias(String whAlias) {
		this.whAlias = whAlias;
	}

	public String getWhType() {
		return whType;
	}

	public void setWhType(String whType) {
		this.whType = whType;
	}

	public String getWhGroup() {
		return whGroup;
	}

	public void setWhGroup(String whGroup) {
		this.whGroup = whGroup;
	}

	public String getOpType() {
		return opType;
	}

	public void setOpType(String opType) {
		this.opType = opType;
	}

	public String getWhTelNo() {
		return whTelNo;
	}

	public void setWhTelNo(String whTelNo) {
		this.whTelNo = whTelNo;
	}

	public String getWhMgrNm() {
		return whMgrNm;
	}

	public void setWhMgrNm(String whMgrNm) {
		this.whMgrNm = whMgrNm;
	}

	public String getWhMgrPhone() {
		return whMgrPhone;
	}

	public void setWhMgrPhone(String whMgrPhone) {
		this.whMgrPhone = whMgrPhone;
	}

	public String getWhMgrEmail() {
		return whMgrEmail;
	}

	public void setWhMgrEmail(String whMgrEmail) {
		this.whMgrEmail = whMgrEmail;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getZipCd() {
		return zipCd;
	}

	public void setZipCd(String zipCd) {
		this.zipCd = zipCd;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public Float getTotalArea() {
		return totalArea;
	}

	public void setTotalArea(Float totalArea) {
		this.totalArea = totalArea;
	}

	public Integer getMaxPalletCnt() {
		return maxPalletCnt;
	}

	public void setMaxPalletCnt(Integer maxPalletCnt) {
		this.maxPalletCnt = maxPalletCnt;
	}

	public Integer getDockCnt() {
		return dockCnt;
	}

	public void setDockCnt(Integer dockCnt) {
		this.dockCnt = dockCnt;
	}

	public Float getTempMin() {
		return tempMin;
	}

	public void setTempMin(Float tempMin) {
		this.tempMin = tempMin;
	}

	public Float getTempMax() {
		return tempMax;
	}

	public void setTempMax(Float tempMax) {
		this.tempMax = tempMax;
	}

	public String getOpStartTime() {
		return opStartTime;
	}

	public void setOpStartTime(String opStartTime) {
		this.opStartTime = opStartTime;
	}

	public String getOpEndTime() {
		return opEndTime;
	}

	public void setOpEndTime(String opEndTime) {
		this.opEndTime = opEndTime;
	}

	public String getTimezone() {
		return timezone;
	}

	public void setTimezone(String timezone) {
		this.timezone = timezone;
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
