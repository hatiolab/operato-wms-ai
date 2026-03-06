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

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "com_cd", nullable = false, length = 20)
	private String comCd;

	@Column (name = "com_nm", nullable = false, length = 100)
	private String comNm;

	@Column (name = "com_alias", length = 100)
	private String comAlias;

	@Column (name = "com_group", length = 20)
	private String comGroup;

	@Column (name = "com_mgr_nm", length = 50)
	private String comMgrNm;

	@Column (name = "com_mgr_email", length = 50)
	private String comMgrEmail;

	@Column (name = "com_mgr_phone", length = 20)
	private String comMgrPhone;

	@Column (name = "biz_lic_no", length = 50)
	private String bizLicNo;

	@Column (name = "rep_per_nm", length = 50)
	private String repPerNm;

	@Column (name = "biz_con_nm", length = 100)
	private String bizConNm;

	@Column (name = "biz_item_nm", length = 100)
	private String bizItemNm;

	@Column (name = "com_tel_no", length = 20)
	private String comTelNo;

	@Column (name = "cs_tel_no", length = 20)
	private String csTelNo;

	@Column (name = "com_fax_no", length = 20)
	private String comFaxNo;

	@Column (name = "com_zip_cd", length = 10)
	private String comZipCd;

	@Column (name = "com_addr")
	private String comAddr;

	@Column (name = "contract_type", length = 20)
	private String contractType;

	@Column (name = "max_account")
	private Integer maxAccount;

	@Column (name = "remarks", length = 255)
	private String remarks;

	@Column (name = "del_flag")
	private Boolean delFlag = false;

	@Column (name = "attr01", length = 50)
	private String attr01;

	@Column (name = "attr02", length = 50)
	private String attr02;

	@Column (name = "attr03", length = 50)
	private String attr03;

	@Column (name = "attr04", length = 50)
	private String attr04;

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
