package operato.wms.parcel.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * Parcel 쿼리 스토어
 *
 * @author HatioLab
 */
@Component
public class ParcelQueryStore extends AbstractQueryStore {

	@Override
	public void initQueryStore(String databaseType) {
		this.databaseType = databaseType;
		this.basePath = "operato/wms/parcel/query/" + this.databaseType + SysConstants.SLASH;
		this.defaultBasePath = "operato/wms/parcel/query/ansi/";
	}

	// TODO: 쿼리 메서드 추가
	// 예시:
	// public String getSampleParcelQuery() {
	//     return this.getQueryByPath("parcel/SampleQuery");
	// }
}
