package operato.wms.fulfillment.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * Fulfillment 쿼리 스토어
 *
 * @author HatioLab
 */
@Component
public class FulfillmentQueryStore extends AbstractQueryStore {

	@Override
	public void initQueryStore(String databaseType) {
		this.databaseType = databaseType;
		this.basePath = "operato/wms/fulfillment/query/" + this.databaseType + SysConstants.SLASH;
		this.defaultBasePath = "operato/wms/fulfillment/query/ansi/";
	}
}
