package operato.wms.base.entity;

import java.util.Date;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "courier_contracts", idStrategy = GenerationRule.UUID, uniqueFields="dlvVendCd,contractNo,domainId", indexes = {
	@Index(name = "ix_courier_contracts_0", columnList = "dlv_vend_cd,contract_no,domain_id", unique = true)
})
public class CourierContract extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 925961719349483915L;

	/**
	 * 택배 계약 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 배송 벤더(택배사) 코드 - 계약 대상 택배사 코드 (예: CJ, LOGEN, HANJIN).
	 * contractNo와 조합으로 유일
	 */
	@Column (name = "dlv_vend_cd", nullable = false, length = 30)
	private String dlvVendCd;

	/**
	 * 계약 번호 - 택배사와 체결한 계약의 고유 번호 (운송장 번호 대역 할당 단위)
	 */
	@Column (name = "contract_no", nullable = false, length = 30)
	private String contractNo;

	/**
	 * 계약명 - 이 계약을 식별하는 명칭 (예: CJ대한통운 2024년 계약)
	 */
	@Column (name = "contract_nm", length = 100)
	private String contractNm;

	/**
	 * 계약 상태 - 계약의 현재 상태 코드
	 * (예: ACTIVE-유효, EXPIRED-만료, SUSPENDED-중지)
	 */
	@Column (name = "status", length = 20)
	private String status;

	/**
	 * 계약 시작일 - 이 계약이 유효하기 시작하는 날짜
	 */
	@Column (name = "contract_start_date")
	private Date contractStartDate;

	/**
	 * 계약 종료일 - 이 계약이 만료되는 날짜.
	 * 만료일 이후 운송장 발급 불가
	 */
	@Column (name = "contract_end_date")
	private Date contractEndDate;

	/**
	 * 기본 운임 - 이 계약의 건당 기본 배송 단가 (원).
	 * 중량·거리 할증 전 기준 요금
	 */
	@Column (name = "base_rate")
	private Double baseRate;

	/**
	 * kg당 추가 운임 - 기본 중량 초과 시 kg당 부과되는 추가 단가 (원/kg)
	 */
	@Column (name = "rate_per_kg")
	private Double ratePerKg;

	/**
	 * 유류할증료율 - 기본 운임에 곱하여 유류할증료를 산출하는 비율 (예: 0.15 = 15%).
	 * 유가 변동에 따라 주기적으로 갱신
	 */
	@Column (name = "fuel_surcharge_rate")
	private Double fuelSurchargeRate;

	/**
	 * 운송장 번호 시작 대역 - 이 계약에서 사용 가능한 운송장 번호 범위의 시작값
	 */
	@Column (name = "start_bandwidth")
	private Long startBandwidth;

	/**
	 * 운송장 번호 종료 대역 - 이 계약에서 사용 가능한 운송장 번호 범위의 끝값
	 */
	@Column (name = "end_bandwidth")
	private Long endBandwidth;

	/**
	 * 현재 발급 위치 번호 - 대역(startBandwidth ~ endBandwidth) 내에서
	 * 다음에 발급할 운송장 번호. 발급 시마다 1씩 증가
	 */
	@Column (name = "current_no")
	private Long currentNo;

	/**
	 * 총 운송장 수량 - 이 계약에서 할당된 운송장 번호 총 개수 (end - start + 1)
	 */
	@Column (name = "total_cnt")
	private Integer totalCnt;

	/**
	 * 사용된 운송장 수량 - 현재까지 출고에 사용된 운송장 번호 수
	 */
	@Column (name = "use_cnt")
	private Integer useCnt;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 1000)
	private String remarks;

	/**
	 * 삭제 여부 - true이면 만료 또는 사용 중지된 계약
	 */
	@Column (name = "del_flag")
	private Boolean delFlag;

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

	public String getDlvVendCd() {
		return dlvVendCd;
	}

	public void setDlvVendCd(String dlvVendCd) {
		this.dlvVendCd = dlvVendCd;
	}

	public String getContractNo() {
		return contractNo;
	}

	public void setContractNo(String contractNo) {
		this.contractNo = contractNo;
	}

	public String getContractNm() {
		return contractNm;
	}

	public void setContractNm(String contractNm) {
		this.contractNm = contractNm;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public Date getContractStartDate() {
		return contractStartDate;
	}

	public void setContractStartDate(Date contractStartDate) {
		this.contractStartDate = contractStartDate;
	}

	public Date getContractEndDate() {
		return contractEndDate;
	}

	public void setContractEndDate(Date contractEndDate) {
		this.contractEndDate = contractEndDate;
	}

	public Double getBaseRate() {
		return baseRate;
	}

	public void setBaseRate(Double baseRate) {
		this.baseRate = baseRate;
	}

	public Double getRatePerKg() {
		return ratePerKg;
	}

	public void setRatePerKg(Double ratePerKg) {
		this.ratePerKg = ratePerKg;
	}

	public Double getFuelSurchargeRate() {
		return fuelSurchargeRate;
	}

	public void setFuelSurchargeRate(Double fuelSurchargeRate) {
		this.fuelSurchargeRate = fuelSurchargeRate;
	}

	public Long getStartBandwidth() {
		return startBandwidth;
	}

	public void setStartBandwidth(Long startBandwidth) {
		this.startBandwidth = startBandwidth;
	}

	public Long getEndBandwidth() {
		return endBandwidth;
	}

	public void setEndBandwidth(Long endBandwidth) {
		this.endBandwidth = endBandwidth;
	}

	public Long getCurrentNo() {
		return currentNo;
	}

	public void setCurrentNo(Long currentNo) {
		this.currentNo = currentNo;
	}

	public Integer getTotalCnt() {
		return totalCnt;
	}

	public void setTotalCnt(Integer totalCnt) {
		this.totalCnt = totalCnt;
	}

	public Integer getUseCnt() {
		return useCnt;
	}

	public void setUseCnt(Integer useCnt) {
		this.useCnt = useCnt;
	}


	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
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
