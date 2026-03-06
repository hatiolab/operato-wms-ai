package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "locations", idStrategy = GenerationRule.UUID, uniqueFields="locCd,domainId", indexes = {
	@Index(name = "ix_locations_0", columnList = "loc_cd,domain_id", unique = true),
	@Index(name = "ix_locations_1", columnList = "wh_cd,zone_cd,domain_id"),
	@Index(name = "ix_locations_2", columnList = "del_flag,domain_id"),
	@Index(name = "ix_locations_3", columnList = "wh_cd,loc_type,domain_id"),
	@Index(name = "ix_locations_4", columnList = "wh_cd,temp_type,domain_id"),
	@Index(name = "ix_locations_5", columnList = "wh_cd,restrict_type,domain_id"),
	@Index(name = "ix_locations_6", columnList = "wh_cd,mixable_flag,domain_id")
})
public class Location extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 708402214490950313L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "wh_cd", nullable = false, length = 20)
	private String whCd;

	@Column (name = "loc_cd", nullable = false, length = 20)
	private String locCd;

	@Column (name = "loc_type", length = 20)
	private String locType;

	@Column (name = "loc_group", length = 20)
	private String locGroup;

	@Column (name = "zone_cd", nullable = false, length = 20)
	private String zoneCd;

	@Column (name = "loc_row", length = 10)
	private String locRow;

	@Column (name = "loc_col", length = 10)
	private String locCol;

	@Column (name = "loc_dan", length = 10)
	private String locDan;

	@Column (name = "loc_wdt")
	private Float locWdt;

	@Column (name = "loc_vtc")
	private Float locVtc;

	@Column (name = "loc_hgt")
	private Float locHgt;

	@Column (name = "loc_cbm")
	private Float locCbm;

	@Column (name = "temp_type", length = 20)
	private String tempType;

	@Column (name = "rack_type", length = 20)
	private String rackType;

	@Column (name = "restrict_type", length = 20)
	private String restrictType;

	@Column (name = "mixable_flag")
	private Boolean mixableFlag;

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

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
	}

	public String getLocType() {
		return locType;
	}

	public void setLocType(String locType) {
		this.locType = locType;
	}

	public String getLocGroup() {
		return locGroup;
	}

	public void setLocGroup(String locGroup) {
		this.locGroup = locGroup;
	}

	public String getZoneCd() {
		return zoneCd;
	}

	public void setZoneCd(String zoneCd) {
		this.zoneCd = zoneCd;
	}

	public String getLocRow() {
		return locRow;
	}

	public void setLocRow(String locRow) {
		this.locRow = locRow;
	}

	public String getLocCol() {
		return locCol;
	}

	public void setLocCol(String locCol) {
		this.locCol = locCol;
	}

	public String getLocDan() {
		return locDan;
	}

	public void setLocDan(String locDan) {
		this.locDan = locDan;
	}

	public Float getLocWdt() {
		return locWdt;
	}

	public void setLocWdt(Float locWdt) {
		this.locWdt = locWdt;
	}

	public Float getLocVtc() {
		return locVtc;
	}

	public void setLocVtc(Float locVtc) {
		this.locVtc = locVtc;
	}

	public Float getLocHgt() {
		return locHgt;
	}

	public void setLocHgt(Float locHgt) {
		this.locHgt = locHgt;
	}

	public Float getLocCbm() {
		return locCbm;
	}

	public void setLocCbm(Float locCbm) {
		this.locCbm = locCbm;
	}

	public String getTempType() {
		return tempType;
	}

	public void setTempType(String tempType) {
		this.tempType = tempType;
	}

	public String getRackType() {
		return rackType;
	}

	public void setRackType(String rackType) {
		this.rackType = rackType;
	}

	public String getRestrictType() {
		return restrictType;
	}

	public void setRestrictType(String restrictType) {
		this.restrictType = restrictType;
	}

	public Boolean getMixableFlag() {
		return mixableFlag;
	}

	public void setMixableFlag(Boolean mixableFlag) {
		this.mixableFlag = mixableFlag;
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
