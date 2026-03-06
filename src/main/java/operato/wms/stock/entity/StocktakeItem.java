package operato.wms.stock.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "stocktake_items", idStrategy = GenerationRule.UUID, uniqueFields="stocktakeId,skuCd,domainId", indexes = {
	@Index(name = "ix_stocktake_items_0", columnList = "stocktake_id,sku_cd,domain_id", unique = true)
})
public class StocktakeItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 247576618419904670L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "stocktake_id", nullable = false, length = 40)
	private String stocktakeId;

	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	@Column (name = "sku_nm", nullable = false, length = 200)
	private String skuNm;

	@Column (name = "zone_cd", length = 30)
	private String zoneCd;

	@Column (name = "loc_cd", length = 30)
	private String locCd;

	@Column (name = "total_qty", nullable = false)
	private Double totalQty;

	@Column (name = "stocktake_qty")
	private Double stocktakeQty;

	@Column (name = "diff_qty")
	private Double diffQty;

	@Column (name = "status", length = 20)
	private String status;

	@Column (name = "remarks", length = 1000)
	private String remarks;
	
	@Column (name = "attr01", length = 100)
    private String attr01;

    @Column (name = "attr02", length = 100)
    private String attr02;

    @Column (name = "attr03", length = 100)
    private String attr03;

    @Column (name = "attr04", length = 100)
    private String attr04;

    @Column (name = "attr05", length = 100)
    private String attr05;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getStocktakeId() {
		return stocktakeId;
	}

	public void setStocktakeId(String stocktakeId) {
		this.stocktakeId = stocktakeId;
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

	public Double getTotalQty() {
		return totalQty;
	}

	public void setTotalQty(Double totalQty) {
		this.totalQty = totalQty;
	}

	public Double getStocktakeQty() {
		return stocktakeQty;
	}

	public void setStocktakeQty(Double stocktakeQty) {
		this.stocktakeQty = stocktakeQty;
	}

	public Double getDiffQty() {
		return diffQty;
	}

	public void setDiffQty(Double diffQty) {
		this.diffQty = diffQty;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public String getAttr01() {
		return attr01;
	}

	public void setAttr01(String attr01) {
		this.attr01 = attr01;
	}

	public String getAttr02() {
		return attr02;
	}

	public void setAttr02(String attr02) {
		this.attr02 = attr02;
	}

	public String getAttr03() {
		return attr03;
	}

	public void setAttr03(String attr03) {
		this.attr03 = attr03;
	}

	public String getAttr04() {
		return attr04;
	}

	public void setAttr04(String attr04) {
		this.attr04 = attr04;
	}

	public String getAttr05() {
		return attr05;
	}

	public void setAttr05(String attr05) {
		this.attr05 = attr05;
	}
	
}
