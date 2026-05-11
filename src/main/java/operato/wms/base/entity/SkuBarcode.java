package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * SKU 다중 바코드 마스터.
 * 1개 SKU에 낱개/박스/팔레트 등 단위별·코드체계별 복수 바코드를 등록·관리한다.
 * PDA 스캔 시 어떤 바코드를 스캔해도 동일 SKU를 역조회할 수 있도록 지원한다.
 */
@Table(name = "sku_barcodes", idStrategy = GenerationRule.UUID, uniqueFields = "barcode,domainId", indexes = {
	@Index(name = "ix_sku_barcodes_0", columnList = "barcode,domain_id", unique = true),
	@Index(name = "ix_sku_barcodes_1", columnList = "com_cd,sku_cd,domain_id"),
	@Index(name = "ix_sku_barcodes_2", columnList = "com_cd,sku_cd,unit_type,domain_id")
})
public class SkuBarcode extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 714903825016473829L;

	/**
	 * 상품 바코드 고유 ID (UUID)
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
	 * 상품 코드 — SKU.sku_cd 참조
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 바코드 값 — 도메인 내 유일
	 */
	@Column(name = "barcode", nullable = false, length = 100)
	private String barcode;

	/**
	 * 바코드 유형 (EAN13/UPC/QR/CODE128/CUSTOM)
	 */
	@Column(name = "barcode_type", length = 20)
	private String barcodeType;

	/**
	 * 적용 단위 (EA/BOX/INNER/PALLET)
	 */
	@Column(name = "unit_type", length = 10)
	private String unitType;

	/**
	 * 해당 단위 1개당 낱개(EA) 수량.
	 * EA=1, BOX=20, PALLET=480 등. 바코드 스캔 시 수량 자동 환산에 사용
	 */
	@Column(name = "qty_per_unit")
	private Double qtyPerUnit;

	/**
	 * 대표 바코드 여부 — SKU당 1개만 true. 라벨 출력 기본값 등에 사용
	 */
	@Column(name = "is_default")
	private Boolean isDefault;

	/**
	 * 삭제 여부
	 */
	@Column(name = "del_flag")
	private Boolean delFlag;

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

	public String getSkuCd() {
		return skuCd;
	}

	public void setSkuCd(String skuCd) {
		this.skuCd = skuCd;
	}

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
	}

	public String getBarcodeType() {
		return barcodeType;
	}

	public void setBarcodeType(String barcodeType) {
		this.barcodeType = barcodeType;
	}

	public String getUnitType() {
		return unitType;
	}

	public void setUnitType(String unitType) {
		this.unitType = unitType;
	}

	public Double getQtyPerUnit() {
		return qtyPerUnit;
	}

	public void setQtyPerUnit(Double qtyPerUnit) {
		this.qtyPerUnit = qtyPerUnit;
	}

	public Boolean getIsDefault() {
		return isDefault;
	}

	public void setIsDefault(Boolean isDefault) {
		this.isDefault = isDefault;
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
}
