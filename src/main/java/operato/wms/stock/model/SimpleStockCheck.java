package operato.wms.stock.model;

/**
 * 수량 기반 재고 체크 모델
 * 
 * @author shortstop
 */
public class SimpleStockCheck {
    /**
     * 도메인 ID
     */
    private Long domainId;
    /**
     * 화주사 코드
     */
    private String comCd;
    /**
     * 창고 코드
     */
    private String whCd;
    /**
     * 상품 코드
     */
    private String skuCd;
    /**
     * 재고 수량
     */
    private Double invQty;
    
    public SimpleStockCheck() {
    }
    
    public SimpleStockCheck(Long domainId, String comCd, String whCd, String skuCd, Double invQty) {
        this.domainId = domainId;
        this.comCd = comCd;
        this.whCd = whCd;
        this.skuCd = skuCd;
        this.invQty = invQty;
    }
    
    public Long getDomainId() {
        return domainId;
    }
    
    public void setDomainId(Long domainId) {
        this.domainId = domainId;
    }
    
    public String getComCd() {
        return comCd;
    }
    
    public void setComCd(String comCd) {
        this.comCd = comCd;
    }
    
    public String getWhCd() {
        return whCd;
    }
    
    public void setWhCd(String whCd) {
        this.whCd = whCd;
    }
    
    public String getSkuCd() {
        return skuCd;
    }
    
    public void setSkuCd(String skuCd) {
        this.skuCd = skuCd;
    }
    
    public Double getInvQty() {
        return invQty;
    }
    
    public void setInvQty(Double invQty) {
        this.invQty = invQty;
    }
}
