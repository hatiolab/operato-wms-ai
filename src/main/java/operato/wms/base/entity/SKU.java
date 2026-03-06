package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "sku", idStrategy = GenerationRule.UUID, uniqueFields="comCd,skuCd,domainId", indexes = {
	@Index(name = "ix_sku_0", columnList = "com_cd,sku_cd,domain_id", unique = true),
	@Index(name = "ix_sku_1", columnList = "com_cd,vend_cd,domain_id"),
	@Index(name = "ix_sku_2", columnList = "com_cd,sku_nm,domain_id"),
	@Index(name = "ix_sku_3", columnList = "com_cd,sku_barcd,domain_id"),
	@Index(name = "ix_sku_4", columnList = "com_cd,sku_type,domain_id"),
	@Index(name = "ix_sku_5", columnList = "com_cd,sku_class,domain_id"),
	@Index(name = "ix_sku_6", columnList = "com_cd,mat_type,domain_id"),
	@Index(name = "ix_sku_7", columnList = "com_cd,temp_type,domain_id"),
	@Index(name = "ix_sku_8", columnList = "com_cd,bom_set_flag,domain_id"),
	@Index(name = "ix_sku_9", columnList = "del_flag,domain_id")
})
public class SKU extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 190420734368115192L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

	@Column (name = "vend_cd", length = 30)
	private String vendCd;

	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	@Column (name = "sku_nm", nullable = false, length = 200)
	private String skuNm;

	@Column (name = "sku_alias", length = 200)
	private String skuAlias;

	@Column (name = "sku_desc", length = 200)
	private String skuDesc;

	@Column (name = "sku_barcd", nullable = false, length = 30)
	private String skuBarcd;

	@Column (name = "sku_barcd2", length = 30)
	private String skuBarcd2;

	@Column (name = "sku_barcd3", length = 30)
	private String skuBarcd3;

	@Column (name = "case_barcd", length = 30)
	private String caseBarcd;

	@Column (name = "box_barcd", length = 30)
	private String boxBarcd;

	@Column (name = "mat_type", length = 10)
	private String matType;

	@Column (name = "sku_type", length = 20)
	private String skuType;

	@Column (name = "sku_class", length = 40)
	private String skuClass;

	@Column (name = "stock_unit", length = 6)
	private String stockUnit;

	@Column (name = "temp_type", length = 50)
	private String tempType;

	@Column (name = "fragile_flag")
	private Boolean fragileFlag;
	
    @Column (name = "variant_flag")
    private Boolean variantFlag;

	@Column (name = "box_in_qty")
	private Integer boxInQty;

	@Column (name = "plt_in_qty")
	private Integer pltInQty;

	@Column (name = "sku_wd")
	private Float skuWd;

	@Column (name = "sku_len")
	private Float skuLen;

	@Column (name = "sku_ht")
	private Float skuHt;

	@Column (name = "sku_vol")
	private Float skuVol;

	@Column (name = "sku_wt")
	private Float skuWt;

	@Column (name = "box_wd")
	private Float boxWd;

	@Column (name = "box_len")
	private Float boxLen;

	@Column (name = "box_ht")
	private Float boxHt;

	@Column (name = "box_vol")
	private Float boxVol;

	@Column (name = "box_wt")
	private Float boxWt;

	@Column (name = "use_expire_date")
	private Boolean useExpireDate;

	@Column (name = "expire_period")
	private Integer expirePeriod;

	@Column (name = "prd_expired_period")
	private Integer prdExpiredPeriod;

	@Column (name = "imminent_period")
	private Integer imminentPeriod;

	@Column (name = "no_out_period")
	private Integer noOutPeriod;

	@Column (name = "box_split_qty")
	private Float boxSplitQty;

	@Column (name = "set_prd_flag")
	private Boolean setPrdFlag;

	@Column (name = "bom_set_flag")
	private Boolean bomSetFlag;

	@Column (name = "image_url")
	private String imageUrl;

	@Column (name = "del_flag", nullable = false)
	private Boolean delFlag = false;

	@Column (name = "remarks", length = 255)
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
	
	public SKU() {
	}
	
    public SKU(String id) {
        this.id = id;
    }
    
    public SKU(Long domainId, String comCd, String skuCd) {
        this.domainId = domainId;
        this.comCd = comCd;
        this.skuCd = skuCd;
    }
  
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

	public String getSkuAlias() {
		return skuAlias;
	}

	public void setSkuAlias(String skuAlias) {
		this.skuAlias = skuAlias;
	}

	public String getSkuDesc() {
		return skuDesc;
	}

	public void setSkuDesc(String skuDesc) {
		this.skuDesc = skuDesc;
	}

	public String getSkuBarcd() {
		return skuBarcd;
	}

	public void setSkuBarcd(String skuBarcd) {
		this.skuBarcd = skuBarcd;
	}

	public String getSkuBarcd2() {
		return skuBarcd2;
	}

	public void setSkuBarcd2(String skuBarcd2) {
		this.skuBarcd2 = skuBarcd2;
	}

	public String getSkuBarcd3() {
		return skuBarcd3;
	}

	public void setSkuBarcd3(String skuBarcd3) {
		this.skuBarcd3 = skuBarcd3;
	}

	public String getCaseBarcd() {
		return caseBarcd;
	}

	public void setCaseBarcd(String caseBarcd) {
		this.caseBarcd = caseBarcd;
	}

	public String getBoxBarcd() {
		return boxBarcd;
	}

	public void setBoxBarcd(String boxBarcd) {
		this.boxBarcd = boxBarcd;
	}

	public String getMatType() {
		return matType;
	}

	public void setMatType(String matType) {
		this.matType = matType;
	}

	public String getSkuType() {
		return skuType;
	}

	public void setSkuType(String skuType) {
		this.skuType = skuType;
	}

	public String getSkuClass() {
		return skuClass;
	}

	public void setSkuClass(String skuClass) {
		this.skuClass = skuClass;
	}

	public String getStockUnit() {
		return stockUnit;
	}

	public void setStockUnit(String stockUnit) {
		this.stockUnit = stockUnit;
	}

	public String getTempType() {
		return tempType;
	}

	public void setTempType(String tempType) {
		this.tempType = tempType;
	}

	public Boolean getFragileFlag() {
		return fragileFlag;
	}

	public void setFragileFlag(Boolean fragileFlag) {
		this.fragileFlag = fragileFlag;
	}

	public Boolean getVariantFlag() {
        return variantFlag;
    }

    public void setVariantFlag(Boolean variantFlag) {
        this.variantFlag = variantFlag;
    }

    public Integer getBoxInQty() {
		return boxInQty;
	}

	public void setBoxInQty(Integer boxInQty) {
		this.boxInQty = boxInQty;
	}

	public Integer getPltInQty() {
		return pltInQty;
	}

	public void setPltInQty(Integer pltInQty) {
		this.pltInQty = pltInQty;
	}

	public Float getSkuWd() {
		return skuWd;
	}

	public void setSkuWd(Float skuWd) {
		this.skuWd = skuWd;
	}

	public Float getSkuLen() {
		return skuLen;
	}

	public void setSkuLen(Float skuLen) {
		this.skuLen = skuLen;
	}

	public Float getSkuHt() {
		return skuHt;
	}

	public void setSkuHt(Float skuHt) {
		this.skuHt = skuHt;
	}

	public Float getSkuVol() {
		return skuVol;
	}

	public void setSkuVol(Float skuVol) {
		this.skuVol = skuVol;
	}

	public Float getSkuWt() {
		return skuWt;
	}

	public void setSkuWt(Float skuWt) {
		this.skuWt = skuWt;
	}

	public Float getBoxWd() {
		return boxWd;
	}

	public void setBoxWd(Float boxWd) {
		this.boxWd = boxWd;
	}

	public Float getBoxLen() {
		return boxLen;
	}

	public void setBoxLen(Float boxLen) {
		this.boxLen = boxLen;
	}

	public Float getBoxHt() {
		return boxHt;
	}

	public void setBoxHt(Float boxHt) {
		this.boxHt = boxHt;
	}

	public Float getBoxVol() {
		return boxVol;
	}

	public void setBoxVol(Float boxVol) {
		this.boxVol = boxVol;
	}

	public Float getBoxWt() {
		return boxWt;
	}

	public void setBoxWt(Float boxWt) {
		this.boxWt = boxWt;
	}

	public Boolean getUseExpireDate() {
		return useExpireDate;
	}

	public void setUseExpireDate(Boolean useExpireDate) {
		this.useExpireDate = useExpireDate;
	}

	public Integer getExpirePeriod() {
		return expirePeriod;
	}

	public void setExpirePeriod(Integer expirePeriod) {
		this.expirePeriod = expirePeriod;
	}

	public Integer getPrdExpiredPeriod() {
		return prdExpiredPeriod;
	}

	public void setPrdExpiredPeriod(Integer prdExpiredPeriod) {
		this.prdExpiredPeriod = prdExpiredPeriod;
	}

	public Integer getImminentPeriod() {
		return imminentPeriod;
	}

	public void setImminentPeriod(Integer imminentPeriod) {
		this.imminentPeriod = imminentPeriod;
	}

	public Integer getNoOutPeriod() {
		return noOutPeriod;
	}

	public void setNoOutPeriod(Integer noOutPeriod) {
		this.noOutPeriod = noOutPeriod;
	}

	public Float getBoxSplitQty() {
		return boxSplitQty;
	}

	public void setBoxSplitQty(Float boxSplitQty) {
		this.boxSplitQty = boxSplitQty;
	}

	public Boolean getSetPrdFlag() {
		return setPrdFlag;
	}

	public void setSetPrdFlag(Boolean setPrdFlag) {
		this.setPrdFlag = setPrdFlag;
	}

	public Boolean getBomSetFlag() {
		return bomSetFlag;
	}

	public void setBomSetFlag(Boolean bomSetFlag) {
		this.bomSetFlag = bomSetFlag;
	}

	public String getImageUrl() {
		return imageUrl;
	}

	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
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
