package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.util.ValueUtil;

@Table(name = "warehouse_charge_setting_items", idStrategy = GenerationRule.UUID, uniqueFields="warehouseChargeSettingId,type,code,domainId", indexes = {
	@Index(name = "ix_warehouse_charge_setting_item_0", columnList = "warehouse_charge_setting_id,type,code,domain_id", unique = true)
})
public class WarehouseChargeSettingItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 241718345551734997L;
	
	/**
	 * Default Type
	 */
	public static final String TYPE_DEFAULT = "DEFAULT";

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "warehouse_charge_setting_id", nullable = false, length = 40)
	private String warehouseChargeSettingId;

	@Column (name = "rank", nullable = false)
	private Integer rank;

	@Column (name = "type", nullable = false, length = 36)
	private String type;

	@Column (name = "code", nullable = false, length = 36)
	private String code;

	@Column (name = "value", nullable = false, length = 50)
	private String value;

	@Column (name = "remarks")
	private String remarks;

	@Column (name = "del_flag")
	private Boolean delFlag;

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

	public String getWarehouseChargeSettingId() {
		return warehouseChargeSettingId;
	}

	public void setWarehouseChargeSettingId(String warehouseChargeSettingId) {
		this.warehouseChargeSettingId = warehouseChargeSettingId;
	}

	public Integer getRank() {
		return rank;
	}

	public void setRank(Integer rank) {
		this.rank = rank;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getValue() {
		return value;
	}

	public void setValue(String value) {
		this.value = value;
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

	@Override
	public void beforeCreate() {
		super.beforeCreate();
		
		if ( ValueUtil.isEmpty(this.type) ) {
			this.type = TYPE_DEFAULT;
		}
	}	
	
}
