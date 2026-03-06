package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "warehouse_charge_settings", idStrategy = GenerationRule.UUID, uniqueFields="whCd,comCd,settingCd,domainId", indexes = {
	@Index(name = "ix_warehouse_charge_settings_0", columnList = "wh_cd,com_cd,setting_cd,domain_id", unique = true)
})
public class WarehouseChargeSetting extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 333317224980433800L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "wh_cd", nullable = false, length = 20)
	private String whCd;

	@Column (name = "com_cd", nullable = false, length = 20)
	private String comCd;

	@Column (name = "setting_cd", nullable = false, length = 36)
	private String settingCd;

	@Column (name = "setting_nm", nullable = false)
	private String settingNm;
	
	@Column (name = "value", length = 50)
	private String value;

	@Column (name = "default_flag")
	private Boolean defaultFlag;

	@Column (name = "remarks")
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

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getSettingCd() {
		return settingCd;
	}

	public void setSettingCd(String settingCd) {
		this.settingCd = settingCd;
	}

	public String getSettingNm() {
		return settingNm;
	}

	public void setSettingNm(String settingNm) {
		this.settingNm = settingNm;
	}

	public String getValue() {
		return value;
	}

	public void setValue(String value) {
		this.value = value;
	}

	public Boolean getDefaultFlag() {
		return defaultFlag;
	}

	public void setDefaultFlag(Boolean defaultFlag) {
		this.defaultFlag = defaultFlag;
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
