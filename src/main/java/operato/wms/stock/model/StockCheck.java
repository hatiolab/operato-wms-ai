package operato.wms.stock.model;

/**
 * 재고 체크 모델
 * 
 * @author shortstop
 */
public class StockCheck {
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
     * 존 코드
     */
    private String zoneCd;
    /**
     * 로케이션 코드
     */
    private String locCd;
    /**
     * 바코드
     */
    private String barcode;
    /**
     * Lot No.
     */
    private String lotNo;
    /**
     * 제조일
     */
    private String prdDate;
    /**
     * 유효기간
     */
    private String expiredDate;
    /**
     * 재고 수량
     */
    private Double invQty;
    
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
    
    public String getZoneCd() {
        return zoneCd;
    }
    
    public void setZoneCd(String zoneCd) {
        this.zoneCd = zoneCd;
    }
    
    public String getLocCd() {
        return locCd;
    }
    
    public void setLocCd(String locCd) {
        this.locCd = locCd;
    }
    
    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getLotNo() {
        return lotNo;
    }
    
    public void setLotNo(String lotNo) {
        this.lotNo = lotNo;
    }
    
    public String getPrdDate() {
        return prdDate;
    }
    
    public void setPrdDate(String prdDate) {
        this.prdDate = prdDate;
    }
    
    public String getExpiredDate() {
        return expiredDate;
    }
    
    public void setExpiredDate(String expiredDate) {
        this.expiredDate = expiredDate;
    }
    
    public Double getInvQty() {
        return invQty;
    }
    
    public void setInvQty(Double invQty) {
        this.invQty = invQty;
    }
}
