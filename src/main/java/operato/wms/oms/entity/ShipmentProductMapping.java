package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 출고 상품 매칭 규칙 마스터.
 * 공급처(거래처)가 보낸 엑셀의 상품명 문자열을 우리 WMS의 상품코드/수량으로 매칭하기 위한 규칙을 정의한다.
 * 예) 그레인온이 보낸 "파로 유기농 파우더 15g 30포 * 2" → sku_cd=XXX, order_qty=2 로 매칭.
 * 출고 주문 임포트 시 (domain_id, com_cd, vend_cd, ext_prod_nm) 조합으로 정확히 일치하는 규칙을 찾아 상품/수량을 결정한다.
 *
 * @author HatioLab
 */
@Table(name = "shipment_product_mappings", idStrategy = GenerationRule.UUID, uniqueFields = "comCd,vendCd,extProdNm,domainId", indexes = {
    @Index(name = "ix_shipment_product_mappings_0", columnList = "domain_id,com_cd,vend_cd,ext_prod_nm", unique = true),
    @Index(name = "ix_shipment_product_mappings_1", columnList = "domain_id,vend_cd"),
    @Index(name = "ix_shipment_product_mappings_2", columnList = "domain_id,sku_cd")
})
public class ShipmentProductMapping extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 1L;

    /**
     * PK (UUID)
     */
    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    /**
     * 화주사 코드
     */
    @Column(name = "com_cd", nullable = false, length = 20)
    private String comCd;

    /**
     * 공급처(거래처) 코드
     */
    @Column(name = "vend_cd", nullable = false, length = 30)
    private String vendCd;

    /**
     * 공급처가 보낸 상품명 (매칭 키, 전체 문자열 그대로 저장. 예: "파로 유기농 파우더 15g 30포 * 2")
     */
    @Column(name = "ext_prod_nm", nullable = false, length = 255)
    private String extProdNm;

    /**
     * 우리 WMS 상품 코드
     */
    @Column(name = "sku_cd", nullable = false, length = 30)
    private String skuCd;

    /**
     * 우리 WMS 상품명
     */
    @Column(name = "sku_nm", length = 100)
    private String skuNm;

    /**
     * 발주수량 (해당 상품명 매칭 시 출고할 수량. 예: "... * 2" → 2)
     */
    @Column(name = "order_qty", nullable = false)
    private Double orderQty;

    /**
     * 비고
     */
    @Column(name = "remarks", length = 255)
    private String remarks;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getComCd() {
        return comCd;
    }

    public void setComCd(String comCd) {
        this.comCd = comCd;
    }

    public String getVendCd() {
        return vendCd;
    }

    public void setVendCd(String vendCd) {
        this.vendCd = vendCd;
    }

    public String getExtProdNm() {
        return extProdNm;
    }

    public void setExtProdNm(String extProdNm) {
        this.extProdNm = extProdNm;
    }

    public String getSkuCd() {
        return skuCd;
    }

    public void setSkuCd(String skuCd) {
        this.skuCd = skuCd;
    }

    public String getSkuNm() {
        return skuNm;
    }

    public void setSkuNm(String skuNm) {
        this.skuNm = skuNm;
    }

    public Double getOrderQty() {
        return orderQty;
    }

    public void setOrderQty(Double orderQty) {
        this.orderQty = orderQty;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
