package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사용자-화주사 매핑
 *
 * 사용자별 접근 가능한 화주사를 지정한다.
 * 매핑 레코드가 없는 사용자는 도메인 내 모든 화주사에 접근 가능한 것으로 간주한다.
 *
 * @author HatioLab
 */
@Table(name = "user_companies", idStrategy = GenerationRule.UUID, uniqueFields = "userId,companyId,domainId", indexes = {
		@Index(name = "ix_user_companies_0", columnList = "user_id,company_id,domain_id", unique = true),
		@Index(name = "ix_user_companies_1", columnList = "user_id,domain_id"),
		@Index(name = "ix_user_companies_2", columnList = "company_id,domain_id")
})
public class UserCompany extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 사용자 ID - 접근 권한을 부여할 사용자의 로그인 ID (users.id 참조)
	 */
	@Column(name = "user_id", nullable = false, length = 40)
	private String userId;

	/**
	 * 화주사 ID - 접근을 허용할 화주사 ID (companies.id 참조)
	 */
	@Column(name = "company_id", nullable = false, length = 20)
	private String companyId;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getUserId() {
		return userId;
	}

	public void setUserId(String userId) {
		this.userId = userId;
	}

	public String getCompanyId() {
		return companyId;
	}

	public void setCompanyId(String companyId) {
		this.companyId = companyId;
	}
}
