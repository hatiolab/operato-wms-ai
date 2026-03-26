package operato.wms.oms.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * Oms 쿼리 스토어
 *
 * @author HatioLab
 */
@Component
public class OmsQueryStore extends AbstractQueryStore {

	@Override
	public void initQueryStore(String databaseType) {
		this.databaseType = databaseType;
		this.basePath = "operato/wms/oms/query/" + this.databaseType + SysConstants.SLASH;
		this.defaultBasePath = "operato/wms/oms/query/ansi/";
	}
}
