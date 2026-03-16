package operato.wms.rwa.entity;

import operato.wms.rwa.WmsRwaConstants;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

/**
 * RWA 반품 검수 기록 Entity
 *
 * 반품 검수 상세 기록 (선택적, 품질 검사가 중요한 경우 사용)
 * - 검수 유형: VISUAL, FUNCTIONAL, FULL
 * - 불량 유형: DAMAGED, EXPIRED, WRONG_ITEM, MISSING_PARTS, FUNCTIONAL_DEFECT
 * - 검수 결과: PASS, FAIL, PARTIAL
 * - 처분 권고: RESTOCK, SCRAP, REPAIR, RETURN_VENDOR
 */
@Table(name = "rwa_inspections", idStrategy = GenerationRule.UUID, uniqueFields="rwaOrderItemId,inspSeq,domainId", indexes = {
	@Index(name = "ix_rwa_inspections_0", columnList = "rwa_order_item_id,insp_seq,domain_id", unique = true),
	@Index(name = "ix_rwa_inspections_1", columnList = "insp_by,domain_id"),
	@Index(name = "ix_rwa_inspections_2", columnList = "insp_at,domain_id"),
	@Index(name = "ix_rwa_inspections_3", columnList = "defect_type,domain_id")
})
public class RwaInspection extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 반품 상세 ID (FK → rwa_order_items.id)
	 */
	@Column(name = "rwa_order_item_id", nullable = false, length = 40)
	private String rwaOrderItemId;

	/**
	 * 검수 순번 (동일 반품 상세 내 자동 채번)
	 */
	@Column(name = "insp_seq", nullable = false)
	private Integer inspSeq;

	/**
	 * 검수 유형 (VISUAL/FUNCTIONAL/FULL)
	 */
	@Column(name = "insp_type", length = 20)
	private String inspType;

	/**
	 * 검수자 ID
	 */
	@Column(name = "insp_by", nullable = false, length = 32)
	private String inspBy;

	/**
	 * 검수 일시
	 */
	@Column(name = "insp_at", nullable = false)
	private java.util.Date inspAt;

	/**
	 * 검수 수량 (= good_qty + defect_qty)
	 */
	@Column(name = "insp_qty", nullable = false)
	private Double inspQty;

	/**
	 * 양품 수량
	 */
	@Column(name = "good_qty", nullable = false)
	private Double goodQty;

	/**
	 * 불량 수량
	 */
	@Column(name = "defect_qty", nullable = false)
	private Double defectQty;

	/**
	 * 불량 유형 (DAMAGED/EXPIRED/WRONG_ITEM/MISSING_PARTS/FUNCTIONAL_DEFECT)
	 */
	@Column(name = "defect_type", length = 30)
	private String defectType;

	/**
	 * 불량 등급 (A/B/C 등)
	 */
	@Column(name = "defect_grade", length = 10)
	private String defectGrade;

	/**
	 * 불량 상세 설명
	 */
	@Column(name = "defect_desc", length = 1000)
	private String defectDesc;

	/**
	 * 검수 사진 URL
	 */
	@Column(name = "photo_url", length = 500)
	private String photoUrl;

	/**
	 * 검수 결과 (PASS/FAIL/PARTIAL)
	 */
	@Column(name = "insp_result", length = 20)
	private String inspResult;

	/**
	 * 처분 권고 (RESTOCK/SCRAP/REPAIR/RETURN_VENDOR)
	 */
	@Column(name = "disposition", length = 30)
	private String disposition;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	public RwaInspection() {
	}

	public RwaInspection(String id) {
		this.id = id;
	}

	public RwaInspection(Long domainId, String rwaOrderItemId) {
		this.domainId = domainId;
		this.rwaOrderItemId = rwaOrderItemId;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getRwaOrderItemId() {
		return rwaOrderItemId;
	}

	public void setRwaOrderItemId(String rwaOrderItemId) {
		this.rwaOrderItemId = rwaOrderItemId;
	}

	public Integer getInspSeq() {
		return inspSeq;
	}

	public void setInspSeq(Integer inspSeq) {
		this.inspSeq = inspSeq;
	}

	public String getInspType() {
		return inspType;
	}

	public void setInspType(String inspType) {
		this.inspType = inspType;
	}

	public String getInspBy() {
		return inspBy;
	}

	public void setInspBy(String inspBy) {
		this.inspBy = inspBy;
	}

	public java.util.Date getInspAt() {
		return inspAt;
	}

	public void setInspAt(java.util.Date inspAt) {
		this.inspAt = inspAt;
	}

	public Double getInspQty() {
		return inspQty;
	}

	public void setInspQty(Double inspQty) {
		this.inspQty = inspQty;
	}

	public Double getGoodQty() {
		return goodQty;
	}

	public void setGoodQty(Double goodQty) {
		this.goodQty = goodQty;
	}

	public Double getDefectQty() {
		return defectQty;
	}

	public void setDefectQty(Double defectQty) {
		this.defectQty = defectQty;
	}

	public String getDefectType() {
		return defectType;
	}

	public void setDefectType(String defectType) {
		this.defectType = defectType;
	}

	public String getDefectGrade() {
		return defectGrade;
	}

	public void setDefectGrade(String defectGrade) {
		this.defectGrade = defectGrade;
	}

	public String getDefectDesc() {
		return defectDesc;
	}

	public void setDefectDesc(String defectDesc) {
		this.defectDesc = defectDesc;
	}

	public String getPhotoUrl() {
		return photoUrl;
	}

	public void setPhotoUrl(String photoUrl) {
		this.photoUrl = photoUrl;
	}

	public String getInspResult() {
		return inspResult;
	}

	public void setInspResult(String inspResult) {
		this.inspResult = inspResult;
	}

	public String getDisposition() {
		return disposition;
	}

	public void setDisposition(String disposition) {
		this.disposition = disposition;
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

		// inspSeq 자동 채번 (MAX(insp_seq) + 1)
		if (this.inspSeq == null || this.inspSeq == 0) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			String sql = "SELECT COALESCE(MAX(insp_seq), 0) FROM rwa_inspections WHERE domain_id = :domainId AND rwa_order_item_id = :rwaOrderItemId";
			Integer maxSeq = queryMgr.selectBySql(sql,
				ValueUtil.newMap("domainId,rwaOrderItemId", this.domainId, this.rwaOrderItemId),
				Integer.class);
			this.inspSeq = (maxSeq != null ? maxSeq : 0) + 1;
		}

		// 검수 일시 기본값
		if (this.inspAt == null) {
			this.inspAt = new java.util.Date();
		}

		// 수량 검증: insp_qty = good_qty + defect_qty
		if (this.inspQty != null && this.inspQty > 0) {
			double sumQty = (this.goodQty != null ? this.goodQty : 0.0)
						  + (this.defectQty != null ? this.defectQty : 0.0);
			if (Math.abs(sumQty - this.inspQty) > 0.001) {
				// 검수 수량과 양품+불량 수량이 일치하지 않으면 자동 조정
				this.inspQty = sumQty;
			}
		}

		// 검수 결과 자동 판정
		if (ValueUtil.isEmpty(this.inspResult)) {
			if (this.defectQty == null || this.defectQty == 0) {
				this.inspResult = WmsRwaConstants.INSP_RESULT_PASS;
			} else if (this.goodQty == null || this.goodQty == 0) {
				this.inspResult = WmsRwaConstants.INSP_RESULT_FAIL;
			} else {
				this.inspResult = WmsRwaConstants.INSP_RESULT_PARTIAL;
			}
		}

		// 처분 권고 자동 설정
		if (ValueUtil.isEmpty(this.disposition)) {
			if (WmsRwaConstants.INSP_RESULT_PASS.equals(this.inspResult)) {
				this.disposition = WmsRwaConstants.DISPOSITION_TYPE_RESTOCK;
			} else if (WmsRwaConstants.INSP_RESULT_FAIL.equals(this.inspResult)) {
				this.disposition = WmsRwaConstants.DISPOSITION_TYPE_SCRAP;
			}
		}
	}

	@Override
	public void afterCreate() {
		super.afterCreate();

		// 검수 후 rwa_order_items의 good_qty, defect_qty 자동 업데이트
		if (ValueUtil.isNotEmpty(this.rwaOrderItemId)) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			RwaOrderItem item = queryMgr.select(RwaOrderItem.class, this.rwaOrderItemId);

			if (item != null) {
				double currentGoodQty = item.getGoodQty() != null ? item.getGoodQty() : 0.0;
				double currentDefectQty = item.getDefectQty() != null ? item.getDefectQty() : 0.0;

				item.setGoodQty(currentGoodQty + (this.goodQty != null ? this.goodQty : 0.0));
				item.setDefectQty(currentDefectQty + (this.defectQty != null ? this.defectQty : 0.0));
				item.setInspectedQty(item.getGoodQty() + item.getDefectQty());

				// 검수 완료 상태로 변경
				if (item.getInspectedQty() >= item.getRwaQty()) {
					item.setStatus(WmsRwaConstants.STATUS_INSPECTED);
				}

				queryMgr.update(item);
			}
		}
	}
}
