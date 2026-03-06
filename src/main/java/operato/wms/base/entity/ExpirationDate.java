package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "expiration_dates", idStrategy = GenerationRule.UUID)
public class ExpirationDate extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 955946608656329356L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "name", nullable = false, length = 50)
	private String name;

	@Column (name = "description", length = 50)
	private String description;

	@Column (name = "active_flag")
	private Boolean activeFlag;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public Boolean getActiveFlag() {
		return activeFlag;
	}

	public void setActiveFlag(Boolean activeFlag) {
		this.activeFlag = activeFlag;
	}	
}
