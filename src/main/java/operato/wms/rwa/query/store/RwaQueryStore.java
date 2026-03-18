package operato.wms.rwa.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * RWA(반품) 쿼리 스토어
 *
 * @author HatioLab
 */
@Component
public class RwaQueryStore extends AbstractQueryStore {

	@Override
	public void initQueryStore(String databaseType) {
		this.databaseType = databaseType;
		this.basePath = "operato/wms/rwa/query/" + this.databaseType + SysConstants.SLASH;
		this.defaultBasePath = "operato/wms/rwa/query/ansi/";
	}

	/**
	 * 반품 주문 재고 체크 서머리 조회
	 *
	 * @return
	 */
	public String getRwaOrderStockCheckSummary() {
		return this.getQueryByPath("rwa/RwaOrderStockCheckSummary");
	}

	/**
	 * 반품 주문 라인 다음 순번 조회
	 *
	 * @return
	 */
	public String getNextRwaOrderSeq() {
		return this.getQueryByPath("rwa/NextRwaOrderSeq");
	}

	/**
	 * 반품 주문 진행율 조회
	 *
	 * @return
	 */
	public String getRwaOrderProgress() {
		return this.getQueryByPath("rwa/CalcRwaOrderProgress");
	}

	/**
	 * 반품 검수 결과 집계
	 *
	 * @return
	 */
	public String getRwaInspectionSummary() {
		return this.getQueryByPath("inspection/RwaInspectionSummary");
	}

	/**
	 * 반품 처분 현황 조회
	 *
	 * @return
	 */
	public String getRwaDispositionStatus() {
		return this.getQueryByPath("disposition/RwaDispositionStatus");
	}
}
