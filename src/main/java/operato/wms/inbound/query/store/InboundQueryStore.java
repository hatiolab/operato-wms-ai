package operato.wms.inbound.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * 입고용 쿼리 스토어
 * 
 * @author shortstop
 */
@Component
public class InboundQueryStore extends AbstractQueryStore {
    
    @Override
    public void initQueryStore(String databaseType) {
        this.databaseType = databaseType;
        this.basePath = "operato/wms/inbound/query/" + this.databaseType + SysConstants.SLASH;
        this.defaultBasePath = "operato/wms/inbound/query/ansi/"; 
    }
    
    /**
     * 입고 상세 정보 상태 업데이트를 위한 쿼리
     *  
     * @return
     */
    public String getUpdateReceivingOrderItems() {
        return this.getQueryByPath("receiving/UpdateReceivingOrderItems");
    }
    
    /**
     * 최대 시퀀스 조회 쿼리
     * 
     * @return
     */
    public String getMaxReceivingItemSeq() {
        return this.getQueryByPath("receiving/MaxReceivingItemSeq");
    }
    
    /**
     * 입고 상품 완료 취소 처리를 위한 삭제 쿼리 : 해당 상품의 예정 순번 및 입고 순번이 1번이 아닌 대상 삭제 
     *  
     * @return
     */
    public String getDeleteCancelFinishReceivingOrderLine() {
        return this.getQueryByPath("receiving/DeleteCancelFinishReceivingOrderLine");
    }
    
    /**
     * 입고 상품 완료 취소 처리를 위한 수정 쿼리 : 해당 상품의 예정 순번 및 입고 순번 1번인 대상 초기화 
     *  
     * @return
     */
    public String getUpdateCancelFinishReceivingOrderLine() {
        return this.getQueryByPath("receiving/UpdateCancelFinishReceivingOrderLine");
    }
}
