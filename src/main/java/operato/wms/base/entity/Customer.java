package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "customers", idStrategy = GenerationRule.UUID, uniqueFields = "comCd,custCd,domainId", indexes = {
		@Index(name = "ix_customers_0", columnList = "com_cd,cust_cd,domain_id", unique = true),
		@Index(name = "ix_customers_1", columnList = "cust_nm,domain_id"),
		@Index(name = "ix_customers_2", columnList = "del_flag,domain_id"),
		@Index(name = "ix_customers_3", columnList = "cust_type,domain_id"),
		@Index(name = "ix_customers_4", columnList = "biz_lic_no,domain_id")

})
public class Customer extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 380499372774713966L;

	/**
	 * 거래처(고객사) 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 화주사 코드 - 이 거래처가 속한 화주사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 20)
	private String comCd;

	/**
	 * 거래처 코드 - 화주사 내 고유 거래처 식별 코드 (comCd + custCd 조합으로 유일)
	 */
	@Column(name = "cust_cd", nullable = false, length = 20)
	private String custCd;

	/**
	 * 거래처 명칭 - 거래처 공식 법인명 또는 상호명
	 */
	@Column(name = "cust_nm", nullable = false, length = 100)
	private String custNm;

	/**
	 * 거래처 별칭 - 내부 관리용 약칭 또는 줄임말
	 */
	@Column(name = "cust_alias", length = 100)
	private String custAlias;

	/**
	 * 거래처 유형 - 거래처 분류 코드 (예: RETAIL-소매, WHOLESALE-도매, ONLINE-온라인몰)
	 */
	@Column(name = "cust_type", length = 20)
	private String custType;

	/**
	 * 거래처 그룹 - 복수의 거래처를 묶어 관리하는 그룹 코드
	 */
	@Column(name = "cust_group", length = 20)
	private String custGroup;

	/**
	 * 거래처 담당자 이름
	 */
	@Column(name = "cust_mgr_nm", length = 40)
	private String custMgrNm;

	/**
	 * 거래처 담당자 이메일
	 */
	@Column(name = "cust_mgr_email", length = 50)
	private String custMgrEmail;

	/**
	 * 거래처 담당자 전화번호
	 */
	@Column(name = "cust_mgr_phone", length = 20)
	private String custMgrPhone;

	/**
	 * 사업자 등록 번호
	 */
	@Column(name = "biz_lic_no", length = 50)
	private String bizLicNo;

	/**
	 * 대표자 이름
	 */
	@Column(name = "rep_per_nm", length = 40)
	private String repPerNm;

	/**
	 * 업태 - 사업자 등록증 상의 업태 (예: 제조업, 도소매업)
	 */
	@Column(name = "biz_con_nm", length = 255)
	private String bizConNm;

	/**
	 * 종목 - 사업자 등록증 상의 종목 (예: 전자제품, 의류)
	 */
	@Column(name = "biz_item_nm", length = 255)
	private String bizItemNm;

	/**
	 * 거래처 대표 전화번호
	 */
	@Column(name = "cust_tel_no", length = 20)
	private String custTelNo;

	/**
	 * 팩스 번호
	 */
	@Column(name = "cust_fax_no", length = 20)
	private String custFaxNo;

	/**
	 * 우편번호
	 */
	@Column(name = "cust_zip_cd", length = 100)
	private String custZipCd;

	/**
	 * 거래처 주소
	 */
	@Column(name = "cust_addr", length = 255)
	private String custAddr;

	/**
	 * 계약 유형 - 거래처와의 거래 계약 유형 코드 (예: CONSIGN-위탁, DIRECT-직거래)
	 */
	@Column(name = "contract_type", length = 20)
	private String contractType;

	/**
	 * 배송지 우편번호 - 실제 출고 배송지 우편번호. 사업장 주소(custZipCd)와 다를 수 있음
	 */
	@Column(name = "delivery_zip_cd", length = 100)
	private String deliveryZipCd;

	/**
	 * 배송지 주소 - 실제 출고 배송지 주소. 사업장 주소(custAddr)와 다를 수 있음
	 */
	@Column(name = "delivery_addr", length = 255)
	private String deliveryAddr;

	/**
	 * 기본 운송사 코드 - 이 거래처의 출고 시 기본으로 사용할 운송사 코드.
	 * 출고 지시 생성 시 자동 세팅
	 */
	@Column(name = "default_carrier_cd", length = 30)
	private String defaultCarrierCd;

	/**
	 * 기본 배송 방법 - 이 거래처의 기본 배송 방법 코드
	 * (예: COURIER-택배, TRUCK-화물차, DIRECT-직납, PICKUP-픽업)
	 */
	@Column(name = "default_ship_method", length = 20)
	private String defaultShipMethod;

	/**
	 * 택배 계약 번호 - 거래처 자체 택배사 계약 계정 번호.
	 * 착불 또는 거래처 선불 처리 시 사용
	 */
	@Column(name = "courier_account_no", length = 50)
	private String courierAccountNo;

	/**
	 * 배송 리드타임 (일) - 출고 지시 후 거래처에 실제 도착까지 소요되는 평균 일수.
	 * 출고 예정일 계산 및 납기 준수 여부 판단에 활용
	 */
	@Column(name = "lead_time_days")
	private Integer leadTimeDays;

	/**
	 * 삭제 여부 - true이면 거래 중지된 거래처
	 */
	@Column(name = "del_flag", nullable = false)
	private Boolean delFlag = false;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 255)
	private String remarks;

	/**
	 * 사용자 정의 속성 1 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr01", length = 100)
	private String attr01;

	/**
	 * 사용자 정의 속성 2 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr02", length = 100)
	private String attr02;

	/**
	 * 사용자 정의 속성 3 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr03", length = 100)
	private String attr03;

	/**
	 * 사용자 정의 속성 4 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr04", length = 100)
	private String attr04;

	/**
	 * 사용자 정의 속성 5 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr05", length = 100)
	private String attr05;

	public Customer() {
	}

	public Customer(String id) {
		this.id = id;
	}

	public Customer(Long domainId, String comCd, String custCd) {
		this.domainId = domainId;
		this.comCd = comCd;
		this.custCd = custCd;
	}

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

	public String getCustCd() {
		return custCd;
	}

	public void setCustCd(String custCd) {
		this.custCd = custCd;
	}

	public String getCustNm() {
		return custNm;
	}

	public void setCustNm(String custNm) {
		this.custNm = custNm;
	}

	public String getCustAlias() {
		return custAlias;
	}

	public void setCustAlias(String custAlias) {
		this.custAlias = custAlias;
	}

	public String getCustType() {
		return custType;
	}

	public void setCustType(String custType) {
		this.custType = custType;
	}

	public String getCustGroup() {
		return custGroup;
	}

	public void setCustGroup(String custGroup) {
		this.custGroup = custGroup;
	}

	public String getCustMgrNm() {
		return custMgrNm;
	}

	public void setCustMgrNm(String custMgrNm) {
		this.custMgrNm = custMgrNm;
	}

	public String getCustMgrEmail() {
		return custMgrEmail;
	}

	public void setCustMgrEmail(String custMgrEmail) {
		this.custMgrEmail = custMgrEmail;
	}

	public String getCustMgrPhone() {
		return custMgrPhone;
	}

	public void setCustMgrPhone(String custMgrPhone) {
		this.custMgrPhone = custMgrPhone;
	}

	public String getBizLicNo() {
		return bizLicNo;
	}

	public void setBizLicNo(String bizLicNo) {
		this.bizLicNo = bizLicNo;
	}

	public String getRepPerNm() {
		return repPerNm;
	}

	public void setRepPerNm(String repPerNm) {
		this.repPerNm = repPerNm;
	}

	public String getBizConNm() {
		return bizConNm;
	}

	public void setBizConNm(String bizConNm) {
		this.bizConNm = bizConNm;
	}

	public String getBizItemNm() {
		return bizItemNm;
	}

	public void setBizItemNm(String bizItemNm) {
		this.bizItemNm = bizItemNm;
	}

	public String getCustTelNo() {
		return custTelNo;
	}

	public void setCustTelNo(String custTelNo) {
		this.custTelNo = custTelNo;
	}

	public String getCustFaxNo() {
		return custFaxNo;
	}

	public void setCustFaxNo(String custFaxNo) {
		this.custFaxNo = custFaxNo;
	}


	public String getCustZipCd() {
		return custZipCd;
	}

	public void setCustZipCd(String custZipCd) {
		this.custZipCd = custZipCd;
	}

	public String getCustAddr() {
		return custAddr;
	}

	public void setCustAddr(String custAddr) {
		this.custAddr = custAddr;
	}

	public String getContractType() {
		return contractType;
	}

	public void setContractType(String contractType) {
		this.contractType = contractType;
	}

	public String getDeliveryZipCd() {
		return deliveryZipCd;
	}

	public void setDeliveryZipCd(String deliveryZipCd) {
		this.deliveryZipCd = deliveryZipCd;
	}

	public String getDeliveryAddr() {
		return deliveryAddr;
	}

	public void setDeliveryAddr(String deliveryAddr) {
		this.deliveryAddr = deliveryAddr;
	}

	public String getDefaultCarrierCd() {
		return defaultCarrierCd;
	}

	public void setDefaultCarrierCd(String defaultCarrierCd) {
		this.defaultCarrierCd = defaultCarrierCd;
	}

	public String getDefaultShipMethod() {
		return defaultShipMethod;
	}

	public void setDefaultShipMethod(String defaultShipMethod) {
		this.defaultShipMethod = defaultShipMethod;
	}

	public String getCourierAccountNo() {
		return courierAccountNo;
	}

	public void setCourierAccountNo(String courierAccountNo) {
		this.courierAccountNo = courierAccountNo;
	}

	public Integer getLeadTimeDays() {
		return leadTimeDays;
	}

	public void setLeadTimeDays(Integer leadTimeDays) {
		this.leadTimeDays = leadTimeDays;
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
