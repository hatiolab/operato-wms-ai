package operato.wms.stock.model;

/**
 * 재고 트랜잭션 모델
 * 
 * @author shortstop
 */
public class InvTransaction {

    /**
     * 재고 바코드 ID
     */
    private String id;
    /**
     * 재고 바코드
     */
    private String barcode;
    /**
     * 재고 창고
     */
    private String whCd;
    /**
     * 재고 화주사
     */
    private String comCd;
    /**
     * 재고 상품 코드
     */
    private String skuCd;
    /**
     * 재고 상품 바코드
     */
    private String skuBcd;
    /**
     * 재고 상품 명
     */
    private String skuNm;
    /**
     * 재고 공급사
     */
    private String vendCd;
    /**
     * 재고 수량
     */
    private Double invQty;
    /**
     * 재고 로케이션
     */
    private String locCd;
    /**
     * 원산지 
     */
    private String origin;
    /**
     * 트랜잭션 코드
     */
    private String tranCd;
    /**
     * 재고 이동 시 이동 로케이션
     */
    private String toLocCd;
    /**
     * 재고 분할 시 분할 수량
     */
    private Double toQty;
    /**
     * 재고 병합시 병합 바코드 
     */
    private String mergeBarcode;
    /**
     * 재고 병합시 병합 바코드의 로케이션 정보
     */
    private String mergeLocCd;
    /**
     * 각종 사유 정보
     */
    private String reason;
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getBarcode() {
        return barcode;
    }
    
    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }
    
    public String getWhCd() {
        return whCd;
    }
    
    public void setWhCd(String whCd) {
        this.whCd = whCd;
    }
    
    public String getComCd() {
        return comCd;
    }
    
    public void setComCd(String comCd) {
        this.comCd = comCd;
    }
    
    public String getSkuCd() {
        return skuCd;
    }
    public void setSkuCd(String skuCd) {
        this.skuCd = skuCd;
    }
    
    public String getSkuBcd() {
        return skuBcd;
    }
    
    public void setSkuBcd(String skuBcd) {
        this.skuBcd = skuBcd;
    }
    
    public String getSkuNm() {
        return skuNm;
    }
    
    public void setSkuNm(String skuNm) {
        this.skuNm = skuNm;
    }
    
    public String getVendCd() {
        return vendCd;
    }
    
    public void setVendCd(String vendCd) {
        this.vendCd = vendCd;
    }
    
    public Double getInvQty() {
        return invQty;
    }
    
    public void setInvQty(Double invQty) {
        this.invQty = invQty;
    }
    
    public String getLocCd() {
        return locCd;
    }
    
    public void setLocCd(String locCd) {
        this.locCd = locCd;
    }
    
    public String getTranCd() {
        return tranCd;
    }
    
    public void setTranCd(String tranCd) {
        this.tranCd = tranCd;
    }
    
    public String getToLocCd() {
        return toLocCd;
    }
    
    public void setToLocCd(String toLocCd) {
        this.toLocCd = toLocCd;
    }
    
    public Double getToQty() {
        return toQty;
    }
    
    public void setToQty(Double toQty) {
        this.toQty = toQty;
    }
    
    public String getMergeBarcode() {
        return mergeBarcode;
    }
    
    public void setMergeBarcode(String mergeBarcode) {
        this.mergeBarcode = mergeBarcode;
    }
    
    public String getMergeLocCd() {
        return mergeLocCd;
    }
    
    public void setMergeLocCd(String mergeLocCd) {
        this.mergeLocCd = mergeLocCd;
    }
    
    public String getReason() {
        return reason;
    }
    
    public void setReason(String reason) {
        this.reason = reason;
    }

	public String getOrigin() {
		return origin;
	}

	public void setOrigin(String origin) {
		this.origin = origin;
	}
    
}
