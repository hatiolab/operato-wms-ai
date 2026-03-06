package operato.wms.base.model;

import java.io.Serializable;

/**
 * 고객사 - 화주사 별 설정 항목 명
 * 
 * @author shortstop
 */
public class RuntimeConfig implements Serializable {
    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 1L;
    /**
     * 도메인 ID
     */
    private Long domainId;
    /**
     * 고객사 코드
     */
    private String comCd;
    /**
     * 화주사 코드
     */
    private String whCd;
    /**
     * 설정 항목 명
     */
    private String itemName;
    /**
     * 설정 항목 값
     */
    private String itemValue;
    
    public RuntimeConfig() {
    }
    
    public RuntimeConfig(Long domainId, String comCd, String whCd, String itemName, String itemValue) {
        this.domainId = domainId;
        this.comCd = comCd;
        this.whCd = whCd;
        this.itemName = itemName;
        this.itemValue = itemValue;
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
    
    public String getItemName() {
        return itemName;
    }
    
    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getItemValue() {
        return itemValue;
    }

    public void setItemValue(String itemValue) {
        this.itemValue = itemValue;
    }
}
