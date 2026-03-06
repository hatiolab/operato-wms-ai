package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "runtime_env_items", idStrategy = GenerationRule.UUID, uniqueFields="runtimeEnvId,name", indexes = {
	@Index(name = "ix_runtime_env_items_0", columnList = "runtime_env_id,name", unique = true),
	@Index(name = "ix_runtime_env_items_1", columnList = "runtime_env_id,category")
})
public class RuntimeEnvItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 116922199338915049L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "runtime_env_id", nullable = false, length = 40)
	private String runtimeEnvId;

	@Column (name = "category", length = 30)
	private String category;

	@Column (name = "name", nullable = false, length = 50)
	private String name;

	@Column (name = "description")
	private String description;

	@Column (name = "value", length = 100)
	private String value;

	@Column (name = "config", length = 1000)
	private String config;

	@Column (name = "remarks", length = 255)
	private String remarks;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getRuntimeEnvId() {
        return runtimeEnvId;
    }

    public void setRuntimeEnvId(String runtimeEnvId) {
        this.runtimeEnvId = runtimeEnvId;
    }

    public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
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

	public String getValue() {
		return value;
	}

	public void setValue(String value) {
		this.value = value;
	}

	public String getConfig() {
		return config;
	}

	public void setConfig(String config) {
		this.config = config;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}
}
