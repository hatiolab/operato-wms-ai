package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * 상품 마스터
 * 관련 엔티티 : VasBom, VasBomItem, Inventory, ReceivingItem,
 * ShipmentOrderItem, StockAllocation, PickingTaskItem, PackingOrderItem
 */
@Table(name = "sku", idStrategy = GenerationRule.UUID, uniqueFields = "comCd,skuCd,domainId", indexes = {
		@Index(name = "ix_sku_0", columnList = "com_cd,sku_cd,domain_id", unique = true),
		@Index(name = "ix_sku_1", columnList = "com_cd,vend_cd,domain_id"),
		@Index(name = "ix_sku_2", columnList = "com_cd,sku_nm,domain_id"),
		@Index(name = "ix_sku_3", columnList = "com_cd,sku_barcd,domain_id"),
		@Index(name = "ix_sku_4", columnList = "com_cd,sku_type,domain_id"),
		@Index(name = "ix_sku_5", columnList = "com_cd,sku_class,domain_id"),
		@Index(name = "ix_sku_6", columnList = "com_cd,mat_type,domain_id"),
		@Index(name = "ix_sku_7", columnList = "com_cd,bom_set_flag,domain_id"),
		@Index(name = "ix_sku_8", columnList = "del_flag,domain_id")
})
public class SKU extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 190420734368115192L;

	/**
	 * 상품 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 화주사 코드 - 상품을 소유한 화주사 식별 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 공급업체 코드 - 상품을 공급하는 벤더사 코드
	 */
	@Column(name = "vend_cd", length = 30)
	private String vendCd;

	/**
	 * 상품 코드 - 화주사 내 고유 상품 식별 코드 (comCd + skuCd 조합으로 유일)
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 상품명
	 */
	@Column(name = "sku_nm", nullable = false, length = 200)
	private String skuNm;

	/**
	 * 상품 별칭 - 내부 관리용 상품 약칭 또는 별명
	 */
	@Column(name = "sku_alias", length = 200)
	private String skuAlias;

	/**
	 * 상품 설명
	 */
	@Column(name = "sku_desc", length = 200)
	private String skuDesc;

	/**
	 * 상품 바코드 (주 바코드) - 낱개 단위 스캔용 바코드
	 */
	@Column(name = "sku_barcd", nullable = false, length = 30)
	private String skuBarcd;

	/**
	 * 상품 바코드 2 - 대체 바코드 (예: EAN, UPC 등 추가 바코드)
	 */
	@Column(name = "sku_barcd2", length = 30)
	private String skuBarcd2;

	/**
	 * 상품 바코드 3 - 추가 대체 바코드
	 */
	@Column(name = "sku_barcd3", length = 30)
	private String skuBarcd3;

	/**
	 * 케이스 바코드 - 케이스(묶음) 단위 스캔용 바코드
	 */
	@Column(name = "case_barcd", length = 30)
	private String caseBarcd;

	/**
	 * 박스 바코드 - 박스 단위 스캔용 바코드
	 */
	@Column(name = "box_barcd", length = 30)
	private String boxBarcd;

	/**
	 * 자재 유형 - 원자재/반제품/완제품 등 자재 분류 코드
	 */
	@Column(name = "mat_type", length = 10)
	private String matType;

	/**
	 * 상품 유형 - 상품 분류 코드 (예: NORMAL, SET, VAS 등)
	 */
	@Column(name = "sku_type", length = 20)
	private String skuType;

	/**
	 * 상품 분류 - 카테고리 또는 품목 분류 코드 - 화주사에 따라 다름
	 */
	@Column(name = "sku_class", length = 40)
	private String skuClass;

	/**
	 * 재고 단위 - 재고 관리 기준 단위 (예: EA, BOX, PCS)
	 */
	@Column(name = "stock_unit", length = 6)
	private String stockUnit;

	/**
	 * 온도 유형 - 보관 온도 조건 코드 (예: ROOM, COLD, FROZEN)
	 */
	@Column(name = "temp_type", length = 50)
	private String tempType;

	/**
	 * 파손 주의 여부 - true이면 취급 주의(Fragile) 상품
	 */
	@Column(name = "fragile_flag")
	private Boolean fragileFlag;

	/**
	 * 옵션 상품 여부 - true이면 색상/사이즈 등 속성이 있는 옵션(variant) 상품
	 */
	@Column(name = "variant_flag")
	private Boolean variantFlag;

	/**
	 * Lot 번호 관리 여부 - true이면 입고/출고 시 Lot 번호 입력 필수.
	 * 동일 Lot 단위로 재고 추적 및 리콜 대응이 필요한 상품에 사용
	 */
	@Column(name = "lot_flag")
	private Boolean lotFlag;

	/**
	 * 시리얼 번호 관리 여부 - true이면 입고/출고 시 개별 시리얼 번호 입력 필수.
	 * 낱개 단위 추적이 필요한 고가 상품, 전자제품 등에 사용
	 */
	@Column(name = "serial_flag")
	private Boolean serialFlag;

	/**
	 * 위험물 여부 - true이면 위험물(Hazardous Material) 상품.
	 * 위험물 상품은 전용 로케이션에만 보관 가능하며, 혼적 및 일반 구역 적치가 제한됨
	 */
	@Column(name = "hazmat_flag")
	private Boolean hazmatFlag;

	/**
	 * 박스 입수량 - 박스 1개에 들어가는 낱개(EA) 수량
	 */
	@Column(name = "box_in_qty")
	private Integer boxInQty;

	/**
	 * 팔레트 입수량 - 팔레트 1개에 들어가는 박스 수량
	 */
	@Column(name = "plt_in_qty")
	private Integer pltInQty;

	/**
	 * 안전 재고 수량 - 재고가 이 수량 이하로 내려가면 안 되는 최소 보유 수량.
	 * 조달 지연, 수요 급증 등 비상 상황에 대비한 버퍼 재고
	 */
	@Column(name = "safety_stock")
	private Double safetyStock;

	/**
	 * 재주문점 수량 - 재고가 이 수량 이하로 떨어지면 발주를 시작해야 하는 임계치.
	 * 리드타임 동안 소비될 수량 + 안전 재고를 합산하여 설정
	 * (예: 하루 판매 50개 × 리드타임 3일 + safetyStock 100 = 250)
	 */
	@Column(name = "reorder_point")
	private Double reorderPoint;

	/**
	 * 상품 폭 - 낱개 상품의 가로 길이 (mm)
	 */
	@Column(name = "sku_wd")
	private Float skuWd;

	/**
	 * 상품 길이 - 낱개 상품의 세로 길이 (mm)
	 */
	@Column(name = "sku_len")
	private Float skuLen;

	/**
	 * 상품 높이 - 낱개 상품의 높이 (mm)
	 */
	@Column(name = "sku_ht")
	private Float skuHt;

	/**
	 * 상품 부피 - 낱개 상품의 부피 (CBM)
	 */
	@Column(name = "sku_vol")
	private Float skuVol;

	/**
	 * 상품 중량 - 낱개 상품의 무게 (kg)
	 */
	@Column(name = "sku_wt")
	private Float skuWt;

	/**
	 * 박스 폭 - 박스 포장 단위의 가로 길이 (mm)
	 */
	@Column(name = "box_wd")
	private Float boxWd;

	/**
	 * 박스 길이 - 박스 포장 단위의 세로 길이 (mm)
	 */
	@Column(name = "box_len")
	private Float boxLen;

	/**
	 * 박스 높이 - 박스 포장 단위의 높이 (mm)
	 */
	@Column(name = "box_ht")
	private Float boxHt;

	/**
	 * 박스 부피 - 박스 포장 단위의 부피 (CBM)
	 */
	@Column(name = "box_vol")
	private Float boxVol;

	/**
	 * 박스 중량 - 박스 포장 단위의 무게 (kg)
	 */
	@Column(name = "box_wt")
	private Float boxWt;

	/**
	 * 중량 단위 - skuWt, boxWt 등 중량 필드의 측정 단위 (예: kg, g, lb)
	 */
	@Column(name = "weight_unit", length = 6)
	private String weightUnit;

	/**
	 * 치수 단위 - skuWd/Len/Ht, boxWd/Len/Ht 등 치수 필드의 측정 단위 (예: mm, cm, inch)
	 */
	@Column(name = "dimension_unit", length = 6)
	private String dimensionUnit;

	/**
	 * 유효기간 관리 여부 - true이면 입고 시 유효기간 입력 필수
	 */
	@Column(name = "use_expire_date")
	private Boolean useExpireDate;

	/**
	 * 유효기간 (일) - 제조일로부터 소비 가능한 총 기간 (일 단위)
	 */
	@Column(name = "expire_period")
	private Integer expirePeriod;

	/**
	 * 제조 후 출고 가능 기간 (일) - 제조일로부터 출고가 허용되는 기간. 이 기간 이후만 출고 가능
	 */
	@Column(name = "prd_expired_period")
	private Integer prdExpiredPeriod;

	/**
	 * 임박 기간 (일) - 유효기간 만료 전 임박 알림을 발생시키는 기준 일수
	 */
	@Column(name = "imminent_period")
	private Integer imminentPeriod;

	/**
	 * 출고 불가 기간 (일) - 유효기간 만료 전 출고를 금지하는 기준 일수
	 */
	@Column(name = "no_out_period")
	private Integer noOutPeriod;

	/**
	 * 세트 상품 여부 - true이면 복수 상품으로 구성된 세트 상품
	 */
	@Column(name = "set_prd_flag")
	private Boolean setPrdFlag;

	/**
	 * BOM 세트 여부 - true이면 BOM(Bill of Materials) 구조로 구성된 상품
	 */
	@Column(name = "bom_set_flag")
	private Boolean bomSetFlag;

	/**
	 * 상품 이미지 URL
	 */
	@Column(name = "image_url")
	private String imageUrl;

	/**
	 * 삭제 여부 - true이면 사용 중지된 상품
	 */
	@Column(name = "del_flag", nullable = false)
	private Boolean delFlag = false;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 255)
	private String remarks;

	/**
	 * 사용자 정의 속성 1 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr01", length = 100)
	private String attr01;

	/**
	 * 사용자 정의 속성 2 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr02", length = 100)
	private String attr02;

	/**
	 * 사용자 정의 속성 3 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr03", length = 100)
	private String attr03;

	/**
	 * 사용자 정의 속성 4 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr04", length = 100)
	private String attr04;

	/**
	 * 사용자 정의 속성 5 - 화주사별 커스텀 속성 값
	 */
	@Column(name = "attr05", length = 100)
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

	public Boolean getLotFlag() {
		return lotFlag;
	}

	public void setLotFlag(Boolean lotFlag) {
		this.lotFlag = lotFlag;
	}

	public Boolean getSerialFlag() {
		return serialFlag;
	}

	public void setSerialFlag(Boolean serialFlag) {
		this.serialFlag = serialFlag;
	}

	public Boolean getHazmatFlag() {
		return hazmatFlag;
	}

	public void setHazmatFlag(Boolean hazmatFlag) {
		this.hazmatFlag = hazmatFlag;
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

	public Double getSafetyStock() {
		return safetyStock;
	}

	public void setSafetyStock(Double safetyStock) {
		this.safetyStock = safetyStock;
	}

	public Double getReorderPoint() {
		return reorderPoint;
	}

	public void setReorderPoint(Double reorderPoint) {
		this.reorderPoint = reorderPoint;
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

	public String getWeightUnit() {
		return weightUnit;
	}

	public void setWeightUnit(String weightUnit) {
		this.weightUnit = weightUnit;
	}

	public String getDimensionUnit() {
		return dimensionUnit;
	}

	public void setDimensionUnit(String dimensionUnit) {
		this.dimensionUnit = dimensionUnit;
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
