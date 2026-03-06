package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "zones", idStrategy = GenerationRule.UUID, uniqueFields="zoneCd,domainId", indexes = {
	@Index(name = "ix_zones_0", columnList = "zone_cd,domain_id", unique = true),
	@Index(name = "ix_zones_1", columnList = "wh_cd,domain_id"),
	@Index(name = "ix_zones_2", columnList = "zone_type,wh_cd,domain_id"),
	@Index(name = "ix_zones_3", columnList = "zone_group,wh_cd,domain_id"),
	@Index(name = "ix_zones_4", columnList = "temp_type,wh_cd,domain_id"),
	@Index(name = "ix_zones_5", columnList = "rack_type,wh_cd,domain_id"),
	@Index(name = "ix_zones_6", columnList = "system_flag,wh_cd,domain_id")
})
public class Zone extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 954759474442790874L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "wh_cd", nullable = false, length = 20)
	private String whCd;

	@Column (name = "zone_cd", nullable = false, length = 20)
	private String zoneCd;

	@Column (name = "zone_nm", length = 30)
	private String zoneNm;

	@Column (name = "zone_type", length = 20)
	private String zoneType;

	@Column (name = "zone_group", length = 20)
	private String zoneGroup;

	@Column (name = "temp_type", length = 20)
	private String tempType;

	@Column (name = "rack_type", length = 20)
	private String rackType;

	@Column (name = "system_flag")
	private Boolean systemFlag = false;

	@Column (name = "restrict_type", length = 20)
	private String restrictType;

	@Column (name = "remarks", length = 255)
	private String remarks;
  
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

	public String getZoneCd() {
		return zoneCd;
	}

	public void setZoneCd(String zoneCd) {
		this.zoneCd = zoneCd;
	}

	public String getZoneNm() {
		return zoneNm;
	}

	public void setZoneNm(String zoneNm) {
		this.zoneNm = zoneNm;
	}

	public String getZoneType() {
		return zoneType;
	}

	public void setZoneType(String zoneType) {
		this.zoneType = zoneType;
	}

	public String getZoneGroup() {
		return zoneGroup;
	}

	public void setZoneGroup(String zoneGroup) {
		this.zoneGroup = zoneGroup;
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

	public Boolean getSystemFlag() {
		return systemFlag;
	}

	public void setSystemFlag(Boolean systemFlag) {
		this.systemFlag = systemFlag;
	}

	public String getRestrictType() {
		return restrictType;
	}

	public void setRestrictType(String restrictType) {
		this.restrictType = restrictType;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}	
}
