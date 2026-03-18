package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

/**
 * VAS BOM 구성 품목 Entity
 *
 * BOM(세트 상품) 구성 품목의 상세 정보를 관리
 * - 세트 1개당 필요 수량(component_qty) 관리
 * - 생성/삭제 후 부모 BOM의 component_count, total_component_qty 자동 업데이트
 */
@Table(name = "vas_bom_items", idStrategy = GenerationRule.UUID, uniqueFields = "vasBomId,bomSeq,domainId", indexes = {
		@Index(name = "ix_vas_bom_items_0", columnList = "vas_bom_id,bom_seq,domain_id", unique = true),
		@Index(name = "ix_vas_bom_items_1", columnList = "vas_bom_id,domain_id"),
		@Index(name = "ix_vas_bom_items_2", columnList = "sku_cd,domain_id")
})
public class VasBomItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * BOM 마스터 ID (FK → vas_boms.id)
	 */
	@Column(name = "vas_bom_id", nullable = false, length = 40)
	private String vasBomId;

	/**
	 * 순번 (자동 채번)
	 */
	@Column(name = "bom_seq", nullable = false)
	private Integer bomSeq;

	/**
	 * 구성 상품 코드
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 구성 상품명 (자동 조회)
	 */
	@Column(name = "sku_nm", length = 255)
	private String skuNm;

	/**
	 * 세트 1개당 필요 수량
	 */
	@Column(name = "component_qty", nullable = false)
	private Double componentQty;

	/**
	 * 단위 (EA/BOX/SET 등)
	 */
	@Column(name = "unit", length = 10)
	private String unit;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	public VasBomItem() {
	}

	public VasBomItem(String id) {
		this.id = id;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getVasBomId() {
		return vasBomId;
	}

	public void setVasBomId(String vasBomId) {
		this.vasBomId = vasBomId;
	}

	public Integer getBomSeq() {
		return bomSeq;
	}

	public void setBomSeq(Integer bomSeq) {
		this.bomSeq = bomSeq;
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

	public Double getComponentQty() {
		return componentQty;
	}

	public void setComponentQty(Double componentQty) {
		this.componentQty = componentQty;
	}

	public String getUnit() {
		return unit;
	}

	public void setUnit(String unit) {
		this.unit = unit;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// bomSeq 자동 채번 (MAX(bom_seq) + 1)
		if (this.bomSeq == null || this.bomSeq == 0) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			String sql = "SELECT COALESCE(MAX(bom_seq), 0) FROM vas_bom_items WHERE domain_id = :domainId AND vas_bom_id = :vasBomId";
			Integer maxSeq = queryMgr.selectBySql(sql,
					ValueUtil.newMap("domainId,vasBomId", this.domainId, this.vasBomId),
					Integer.class);
			this.bomSeq = (maxSeq != null ? maxSeq : 0) + 1;
		}
	}

	@Override
	public void afterCreate() {
		super.afterCreate();
		this.updateParentBomCounts();
	}

	/**
	 * 부모 BOM의 component_count, total_component_qty 업데이트
	 */
	private void updateParentBomCounts() {
		if (ValueUtil.isNotEmpty(this.vasBomId)) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			VasBom bom = queryMgr.select(VasBom.class, this.vasBomId);

			if (bom != null) {
				String countSql = "SELECT COUNT(*) FROM vas_bom_items WHERE domain_id = :domainId AND vas_bom_id = :vasBomId";
				String qtySql = "SELECT COALESCE(SUM(component_qty), 0) FROM vas_bom_items WHERE domain_id = :domainId AND vas_bom_id = :vasBomId";

				Integer count = queryMgr.selectBySql(countSql,
						ValueUtil.newMap("domainId,vasBomId", this.domainId, this.vasBomId),
						Integer.class);
				Double totalQty = queryMgr.selectBySql(qtySql,
						ValueUtil.newMap("domainId,vasBomId", this.domainId, this.vasBomId),
						Double.class);

				bom.setComponentCount(count);
				bom.setTotalComponentQty(totalQty);
				queryMgr.update(bom, "componentCount", "totalComponentQty");
			}
		}
	}
}
