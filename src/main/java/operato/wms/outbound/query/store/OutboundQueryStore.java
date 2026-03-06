package operato.wms.outbound.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * 출고용 쿼리 스토어
 * 
 * @author shortstop
 */
@Component
public class OutboundQueryStore extends AbstractQueryStore {
    
    @Override
    public void initQueryStore(String databaseType) {
        this.databaseType = databaseType;
        this.basePath = "operato/wms/outbound/query/" + this.databaseType + SysConstants.SLASH;
        this.defaultBasePath = "operato/wms/outbound/query/ansi/"; 
    }
        
    /**
     * 개별 출고 주문 작업 시 피킹 예약을 위한 토털 피킹 서머리 조회
     * 
     * @return
     */
    public String getTotalPickingForSingleReleaseOrder() {
        return this.getQueryByPath("picking/TotalPickingForSingleReleaseOrder");
    }
    
    /**
     * 피킹 지시 주문 라인 업데이트 쿼리
     * 
     * @return
     */
    public String getUpdatePickingOrderItems() {
        return this.getQueryByPath("picking/UpdatePickingOrderItems");
    }
    
    /**
     * 피킹 지시 진행율 쿼리
     * 
     * @return
     */
    public String getPickingOrderProgress() {
        return this.getQueryByPath("picking/CalcPickingOrderProgress");
    }
        
    /**
     * 출고 주문 라인 업데이트 쿼리
     * 
     * @return
     */
    public String getUpdateReleaseOrderItems() {
        return this.getQueryByPath("release/UpdateReleaseOrderItems");
    }
    
    /**
     * 출고 주문 다음 라인 번호 조회
     * 
     * @return
     */
    public String getNextReleaseOrderLineNo() {
        return this.getQueryByPath("release/NextReleaseOrderLineNo");
    }
    
    /**
     * 출고 주문 재고 체크 서머리 조회
     * 
     * @return
     */
    public String getReleaseOrderStockCheckSummary() {
        return this.getQueryByPath("release/ReleaseOrderStockCheckSummary");
    }
    
    /**
     * 출고 주문 라인 취소 업데이트 : 출고 주문 라인 최초 등록 상태로 업데이트 
     * 
     * @return
     */
    public String getUpdateCancelPickedReleaseOrderLine() {
        return this.getQueryByPath("release/UpdateCancelPickedReleaseOrderLine");
    }
    
    /**
     * 출고 주문 라인 취소 삭제 : 출고 주문 라인 최초 등록 라인을 제외한 나머지 삭제 
     * 
     * @return
     */
    public String getDeleteCancelPickedReleaseOrderLine() {
        return this.getQueryByPath("release/DeleteCancelPickedReleaseOrderLine");
    }
}
