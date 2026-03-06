package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "customers", idStrategy = GenerationRule.UUID, uniqueFields="comCd,custCd,domainId", indexes = {
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

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "com_cd", nullable = false, length = 20)
	private String comCd;

	@Column (name = "cust_cd", nullable = false, length = 20)
	private String custCd;

	@Column (name = "cust_nm", nullable = false, length = 100)
	private String custNm;

	@Column (name = "cust_alias", length = 100)
	private String custAlias;

	@Column (name = "cust_type", length = 20)
	private String custType;

	@Column (name = "cust_group", length = 20)
	private String custGroup;

	@Column (name = "cust_mgr_nm", length = 40)
	private String custMgrNm;

	@Column (name = "cust_mgr_email", length = 50)
	private String custMgrEmail;

	@Column (name = "cust_mgr_phone", length = 20)
	private String custMgrPhone;

	@Column (name = "biz_lic_no", length = 50)
	private String bizLicNo;

	@Column (name = "rep_per_nm", length = 40)
	private String repPerNm;

	@Column (name = "biz_item_nm", length = 255)
	private String bizItemNm;

	@Column (name = "biz_con_nm", length = 255)
	private String bizConNm;

	@Column (name = "cust_tel_no", length = 20)
	private String custTelNo;

	@Column (name = "cust_fax_no", length = 20)
	private String custFaxNo;

	@Column (name = "cs_tel_no", length = 20)
	private String csTelNo;

	@Column (name = "cust_zip_cd", length = 100)
	private String custZipCd;

	@Column (name = "cust_addr", length = 255)
	private String custAddr;

	@Column (name = "contract_type", length = 20)
	private String contractType;

	@Column (name = "del_flag", nullable = false)
	private Boolean delFlag = false;

	@Column (name = "remarks", length = 255)
	private String remarks;

	@Column (name = "attr01", length = 100)
	private String attr01;

	@Column (name = "attr02", length = 100)
	private String attr02;

	@Column (name = "attr03", length = 100)
	private String attr03;

	@Column (name = "attr04", length = 100)
	private String attr04;

	@Column (name = "attr05", length = 100)
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

	public String getBizItemNm() {
		return bizItemNm;
	}

	public void setBizItemNm(String bizItemNm) {
		this.bizItemNm = bizItemNm;
	}

	public String getBizConNm() {
		return bizConNm;
	}

	public void setBizConNm(String bizConNm) {
		this.bizConNm = bizConNm;
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

	public String getCsTelNo() {
		return csTelNo;
	}

	public void setCsTelNo(String csTelNo) {
		this.csTelNo = csTelNo;
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
