package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "runtime_envs", idStrategy = GenerationRule.UUID, uniqueFields="domainId,whCd,comCd", indexes = {
	@Index(name = "ix_runtime_envs_0", columnList = "domain_id,wh_cd,com_cd", unique = true)
})
public class RuntimeEnv extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 864791338331958868L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

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
}
