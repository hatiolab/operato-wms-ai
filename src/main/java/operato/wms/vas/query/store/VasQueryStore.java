package operato.wms.vas.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * VAS(유통가공) 쿼리 스토어
 *
 * @author HatioLab
 */
@Component
public class VasQueryStore extends AbstractQueryStore {

	@Override
	public void initQueryStore(String databaseType) {
		this.databaseType = databaseType;
		this.basePath = "operato/wms/vas/query/" + this.databaseType + SysConstants.SLASH;
		this.defaultBasePath = "operato/wms/vas/query/ansi/";
	}

	/**
	 * VAS 작업 지시 진행율 조회
	 *
	 * @return
	 */
	public String getVasOrderProgress() {
		return this.getQueryByPath("vas/CalcVasOrderProgress");
	}

	/**
	 * VAS 작업 지시 상세 다음 순번 조회
	 *
	 * @return
	 */
	public String getNextVasOrderItemSeq() {
		return this.getQueryByPath("vas/NextVasOrderItemSeq");
	}

	/**
	 * VAS 자재 소요량 계산
	 *
	 * @return
	 */
	public String getVasMaterialRequirement() {
		return this.getQueryByPath("vas/VasMaterialRequirement");
	}

	/**
	 * VAS 작업 실적 집계
	 *
	 * @return
	 */
	public String getVasResultSummary() {
		return this.getQueryByPath("result/VasResultSummary");
	}

	/**
	 * VAS BOM 구성품 조회
	 *
	 * @return
	 */
	public String getVasBomComponents() {
		return this.getQueryByPath("bom/VasBomComponents");
	}

	/**
	 * VAS 작업장 재고 조회
	 *
	 * @return
	 */
	public String getVasWorkLocationStock() {
		return this.getQueryByPath("vas/VasWorkLocationStock");
	}
}
