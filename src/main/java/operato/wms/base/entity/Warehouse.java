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

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	@Column (name = "wh_nm", nullable = false, length = 100)
	private String whNm;

	@Column (name = "wh_alias", length = 100)
	private String whAlias;

	@Column (name = "wh_type", length = 20)
	private String whType;

	@Column (name = "wh_group", length = 20)
	private String whGroup;

	@Column (name = "op_type", length = 20)
	private String opType;

	@Column (name = "zip_cd", length = 10)
	private String zipCd;

	@Column (name = "address")
	private String address;

	@Column (name = "del_flag")
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
