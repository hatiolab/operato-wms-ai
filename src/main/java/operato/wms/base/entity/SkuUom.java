package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * SKU 단위 환산 마스터.
 * SKU의 낱개(EA) ↔ 박스(BOX) ↔ 팔레트(PALLET) 등 단위 간 수량 환산 기준을 관리한다.
 * 입고 수량 자동 환산, 발주 단위 관리, 재고 조회 시 단위 변환에 활용한다.
 */
@Table(name = "sku_uoms", idStrategy = GenerationRule.UUID, uniqueFields = "comCd,skuCd,fromUom,toUom,domainId", indexes = {
	@Index(name = "ix_sku_uoms_0", columnList = "com_cd,sku_cd,from_uom,to_uom,domain_id", unique = true),
	@Index(name = "ix_sku_uoms_1", columnList = "com_cd,sku_cd,domain_id")
})
public class SkuUom extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 298461057384920163L;

	/**
	 * SKU 단위 환산 고유 ID (UUID)
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
	 * 변환 원본 단위 (EA/BOX/INNER/PALLET)
	 */
	@Column(name = "from_uom", nullable = false, length = 10)
	private String fromUom;

	/**
	 * 변환 대상 단위 — 기준 단위(EA) (EA/BOX/INNER/PALLET)
	 */
	@Column(name = "to_uom", nullable = false, length = 10)
	private String toUom;

	/**
	 * 환산 계수 — from_uom 1개 = to_uom N개.
	 * 예: BOX→EA 환산 계수 20 = 박스 1개는 낱개 20개
	 */
	@Column(name = "conversion_factor", nullable = false)
	private Double conversionFactor;

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

	public String getFromUom() {
		return fromUom;
	}

	public void setFromUom(String fromUom) {
		this.fromUom = fromUom;
	}

	public String getToUom() {
		return toUom;
	}

	public void setToUom(String toUom) {
		this.toUom = toUom;
	}

	public Double getConversionFactor() {
		return conversionFactor;
	}

	public void setConversionFactor(Double conversionFactor) {
		this.conversionFactor = conversionFactor;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}
}
