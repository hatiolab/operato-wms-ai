package operato.wms.stock.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * 입고용 쿼리 스토어
 * 
 * @author shortstop
 */
@Component
public class StockQueryStore extends AbstractQueryStore {
    
    @Override
    public void initQueryStore(String databaseType) {
        this.databaseType = databaseType;
        this.basePath = "operato/wms/stock/query/" + this.databaseType + SysConstants.SLASH;
        this.defaultBasePath = "operato/wms/stock/query/ansi/"; 
    }
    
    /**
     * 가용 재고 수량 조회
     *  
     * @return
     */
    public String getAvailableStockQty() {
        return this.getQueryByPath("AvailableStockQty");
    }
    
    /**
     * 주문 수량으로 가용 재고 리스트 조회
     *  
     * @return
     */
    public String getAvailableStocksByQty() {
        return this.getQueryByPath("AvailableStocksByQty");
    }
    
    /**
     * 출고 작업 시 피킹 예약된 재고 조회
     * 
     * @return
     */
    public String getSearchReservedInventories() {
        return this.getQueryByPath("SearchReservedInventories");
    }
    
    /**
     * 출고를 위한 재고 조회
     * 
     * @return
     */
    public String getInventoryForRelease() {
        return this.getQueryByPath("InventoryForRelease");
    }
    
    /**
     * 재고 이력에서 마지막 로케이션 코드 조회 
     * @return
     */
    public String getLastLocCdByHistory() {
    	return this.getQueryByPath("LastLocCdByHistory");
    }
}
