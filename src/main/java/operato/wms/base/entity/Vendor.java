package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "vendors", idStrategy = GenerationRule.UUID, uniqueFields="comCd,vendCd,domainId", indexes = {
	@Index(name = "ix_vendors_0", columnList = "com_cd,vend_cd,domain_id", unique = true),
    @Index(name = "ix_vendors_1", columnList = "vend_nm,domain_id"),
    @Index(name = "ix_vendors_2", columnList = "del_flag,domain_id"),
    @Index(name = "ix_vendors_3", columnList = "vend_type,domain_id"),
    @Index(name = "ix_vendors_4", columnList = "biz_lic_no,domain_id")
})
public class Vendor extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 189999155070254204L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "com_cd", nullable = false, length = 20)
	private String comCd;

	@Column (name = "vend_cd", nullable = false, length = 20)
	private String vendCd;

	@Column (name = "vend_nm", nullable = false, length = 100)
	private String vendNm;

	@Column (name = "vend_alias", length = 100)
	private String vendAlias;

	@Column (name = "vend_type", length = 20)
	private String vendType;

	@Column (name = "vend_group", length = 20)
	private String vendGroup;

	@Column (name = "vend_mgr_nm", length = 40)
	private String vendMgrNm;

	@Column (name = "vend_mgr_email", length = 50)
	private String vendMgrEmail;

	@Column (name = "vend_mgr_phone", length = 20)
	private String vendMgrPhone;

	@Column (name = "biz_lic_no", length = 50)
	private String bizLicNo;

	@Column (name = "rep_per_nm", length = 40)
	private String repPerNm;

	@Column (name = "biz_item_nm")
	private String bizItemNm;

	@Column (name = "biz_con_nm")
	private String bizConNm;

	@Column (name = "vend_tel_no", length = 20)
	private String vendTelNo;

	@Column (name = "vend_fax_no", length = 20)
	private String vendFaxNo;

	@Column (name = "cs_tel_no", length = 20)
	private String csTelNo;

	@Column (name = "vend_zip_cd", length = 100)
	private String vendZipCd;

	@Column (name = "vend_addr")
	private String vendAddr;

	@Column (name = "contract_type", length = 20)
	private String contractType;

	@Column (name = "del_flag", nullable = false)
	private Boolean delFlag = false;

	@Column (name = "remarks", length = 1000)
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

	public String getVendCd() {
		return vendCd;
	}

	public void setVendCd(String vendCd) {
		this.vendCd = vendCd;
	}

	public String getVendNm() {
		return vendNm;
	}

	public void setVendNm(String vendNm) {
		this.vendNm = vendNm;
	}

	public String getVendAlias() {
		return vendAlias;
	}

	public void setVendAlias(String vendAlias) {
		this.vendAlias = vendAlias;
	}

	public String getVendType() {
		return vendType;
	}

	public void setVendType(String vendType) {
		this.vendType = vendType;
	}

	public String getVendGroup() {
		return vendGroup;
	}

	public void setVendGroup(String vendGroup) {
		this.vendGroup = vendGroup;
	}

	public String getVendMgrNm() {
		return vendMgrNm;
	}

	public void setVendMgrNm(String vendMgrNm) {
		this.vendMgrNm = vendMgrNm;
	}

	public String getVendMgrEmail() {
		return vendMgrEmail;
	}

	public void setVendMgrEmail(String vendMgrEmail) {
		this.vendMgrEmail = vendMgrEmail;
	}

	public String getVendMgrPhone() {
		return vendMgrPhone;
	}

	public void setVendMgrPhone(String vendMgrPhone) {
		this.vendMgrPhone = vendMgrPhone;
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

	public String getVendTelNo() {
		return vendTelNo;
	}

	public void setVendTelNo(String vendTelNo) {
		this.vendTelNo = vendTelNo;
	}

	public String getVendFaxNo() {
		return vendFaxNo;
	}

	public void setVendFaxNo(String vendFaxNo) {
		this.vendFaxNo = vendFaxNo;
	}

	public String getCsTelNo() {
		return csTelNo;
	}

	public void setCsTelNo(String csTelNo) {
		this.csTelNo = csTelNo;
	}

	public String getVendZipCd() {
		return vendZipCd;
	}

	public void setVendZipCd(String vendZipCd) {
		this.vendZipCd = vendZipCd;
	}

	public String getVendAddr() {
		return vendAddr;
	}

	public void setVendAddr(String vendAddr) {
		this.vendAddr = vendAddr;
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
