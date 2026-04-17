package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "companies", idStrategy = GenerationRule.UUID, uniqueFields="comCd,domainId", indexes = {
	@Index(name = "ix_companies_0", columnList = "com_cd,domain_id", unique = true),
	@Index(name = "ix_companies_1", columnList = "com_nm,domain_id"),
	@Index(name = "ix_companies_2", columnList = "com_group,domain_id"),
	@Index(name = "ix_companies_3", columnList = "biz_lic_no,domain_id"),
	@Index(name = "ix_companies_4", columnList = "del_flag,domain_id")
})
public class Company extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 976354727984257329L;

	/**
	 * 화주사 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 화주사 코드 - 도메인 내 고유 화주사 식별 코드. SKU, Inventory 등 전 모듈에서 참조
	 */
	@Column (name = "com_cd", nullable = false, length = 20)
	private String comCd;

	/**
	 * 화주사 명칭 - 화주사 공식 법인명
	 */
	@Column (name = "com_nm", nullable = false, length = 100)
	private String comNm;

	/**
	 * 화주사 별칭 - 내부 관리용 약칭 또는 줄임말
	 */
	@Column (name = "com_alias", length = 100)
	private String comAlias;

	/**
	 * 화주사 그룹 - 복수의 화주사를 묶어 관리하는 상위 그룹 코드 (예: 계열사 그룹)
	 */
	@Column (name = "com_group", length = 20)
	private String comGroup;

	/**
	 * 화주사 담당자 이름 - WMS 운영 담당 연락처 담당자명
	 */
	@Column (name = "com_mgr_nm", length = 50)
	private String comMgrNm;

	/**
	 * 화주사 담당자 이메일
	 */
	@Column (name = "com_mgr_email", length = 50)
	private String comMgrEmail;

	/**
	 * 화주사 담당자 전화번호
	 */
	@Column (name = "com_mgr_phone", length = 20)
	private String comMgrPhone;

	/**
	 * 사업자 등록 번호
	 */
	@Column (name = "biz_lic_no", length = 50)
	private String bizLicNo;

	/**
	 * 대표자 이름
	 */
	@Column (name = "rep_per_nm", length = 50)
	private String repPerNm;

	/**
	 * 업태 - 사업자 등록증 상의 업태 (예: 제조업, 도소매업)
	 */
	@Column (name = "biz_con_nm", length = 100)
	private String bizConNm;

	/**
	 * 종목 - 사업자 등록증 상의 종목 (예: 전자제품, 의류)
	 */
	@Column (name = "biz_item_nm", length = 100)
	private String bizItemNm;

	/**
	 * 회사 대표 전화번호
	 */
	@Column (name = "com_tel_no", length = 20)
	private String comTelNo;

	/**
	 * 고객센터(CS) 전화번호
	 */
	@Column (name = "cs_tel_no", length = 20)
	private String csTelNo;

	/**
	 * 팩스 번호
	 */
	@Column (name = "com_fax_no", length = 20)
	private String comFaxNo;

	/**
	 * 우편번호
	 */
	@Column (name = "com_zip_cd", length = 10)
	private String comZipCd;

	/**
	 * 회사 주소
	 */
	@Column (name = "com_addr")
	private String comAddr;

	/**
	 * 계약 유형 - 화주사와의 서비스 계약 유형 코드 (예: BASIC, PREMIUM, CUSTOM)
	 */
	@Column (name = "contract_type", length = 20)
	private String contractType;

	/**
	 * 기본 창고 코드 - 화주사가 주로 사용하는 창고 코드.
	 * 멀티 창고 환경에서 입출고 기본값으로 활용
	 */
	@Column (name = "wh_cd", length = 20)
	private String whCd;

	/**
	 * 정산 주기 - 3PL 서비스 비용 청구 주기 코드 (예: MONTHLY-월정산, WEEKLY-주정산, DAILY-일정산)
	 */
	@Column (name = "invoice_cycle", length = 20)
	private String invoiceCycle;

	/**
	 * 보관료 단가 - 보관 단위(CBM 또는 팔레트)당 청구 단가.
	 * 월별 보관료 자동 계산의 기준값
	 */
	@Column (name = "storage_rate")
	private Double storageRate;

	/**
	 * 작업료 단가 - 입출고 건당 또는 수량당 청구 단가.
	 * 작업 실적 기반 청구서 자동 계산의 기준값
	 */
	@Column (name = "handling_rate")
	private Double handlingRate;

	/**
	 * 최대 계정 수 - 이 화주사에 허용되는 WMS 사용자 계정 최대 수
	 */
	@Column (name = "max_account")
	private Integer maxAccount;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 255)
	private String remarks;

	/**
	 * 삭제 여부 - true이면 사용 중지된 화주사
	 */
	@Column (name = "del_flag")
	private Boolean delFlag = false;

	/**
	 * 사용자 정의 속성 1 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr01", length = 50)
	private String attr01;

	/**
	 * 사용자 정의 속성 2 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr02", length = 50)
	private String attr02;

	/**
	 * 사용자 정의 속성 3 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr03", length = 50)
	private String attr03;

	/**
	 * 사용자 정의 속성 4 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr04", length = 50)
	private String attr04;

	/**
	 * 사용자 정의 속성 5 - 운영사별 커스텀 속성 값
	 */
	@Column (name = "attr05", length = 50)
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

	public String getComNm() {
		return comNm;
	}

	public void setComNm(String comNm) {
		this.comNm = comNm;
	}

	public String getComAlias() {
		return comAlias;
	}

	public void setComAlias(String comAlias) {
		this.comAlias = comAlias;
	}

	public String getComGroup() {
		return comGroup;
	}

	public void setComGroup(String comGroup) {
		this.comGroup = comGroup;
	}

	public String getComMgrNm() {
		return comMgrNm;
	}

	public void setComMgrNm(String comMgrNm) {
		this.comMgrNm = comMgrNm;
	}

	public String getComMgrEmail() {
		return comMgrEmail;
	}

	public void setComMgrEmail(String comMgrEmail) {
		this.comMgrEmail = comMgrEmail;
	}

	public String getComMgrPhone() {
		return comMgrPhone;
	}

	public void setComMgrPhone(String comMgrPhone) {
		this.comMgrPhone = comMgrPhone;
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

	public String getComTelNo() {
		return comTelNo;
	}

	public void setComTelNo(String comTelNo) {
		this.comTelNo = comTelNo;
	}

	public String getCsTelNo() {
		return csTelNo;
	}

	public void setCsTelNo(String csTelNo) {
		this.csTelNo = csTelNo;
	}

	public String getComFaxNo() {
		return comFaxNo;
	}

	public void setComFaxNo(String comFaxNo) {
		this.comFaxNo = comFaxNo;
	}

	public String getComZipCd() {
		return comZipCd;
	}

	public void setComZipCd(String comZipCd) {
		this.comZipCd = comZipCd;
	}

	public String getComAddr() {
		return comAddr;
	}

	public void setComAddr(String comAddr) {
		this.comAddr = comAddr;
	}

	public String getContractType() {
		return contractType;
	}

	public void setContractType(String contractType) {
		this.contractType = contractType;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getInvoiceCycle() {
		return invoiceCycle;
	}

	public void setInvoiceCycle(String invoiceCycle) {
		this.invoiceCycle = invoiceCycle;
	}

	public Double getStorageRate() {
		return storageRate;
	}

	public void setStorageRate(Double storageRate) {
		this.storageRate = storageRate;
	}

	public Double getHandlingRate() {
		return handlingRate;
	}

	public void setHandlingRate(Double handlingRate) {
		this.handlingRate = handlingRate;
	}

	public Integer getMaxAccount() {
		return maxAccount;
	}

	public void setMaxAccount(Integer maxAccount) {
		this.maxAccount = maxAccount;
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
