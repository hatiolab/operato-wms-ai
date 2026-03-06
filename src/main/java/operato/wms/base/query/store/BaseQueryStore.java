package operato.wms.base.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * 마스터 용 쿼리 스토어
 * 
 * @author shortstop
 */
@Component
public class BaseQueryStore extends AbstractQueryStore {
    
    @Override
    public void initQueryStore(String databaseType) {
        this.databaseType = databaseType;
        this.basePath = "operato/wms/base/query/" + this.databaseType + SysConstants.SLASH;
        this.defaultBasePath = "operato/wms/base/query/ansi/"; 
    }
    
}
