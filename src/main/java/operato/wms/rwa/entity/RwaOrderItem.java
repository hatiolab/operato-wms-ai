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
 * RWA 반품 지시 상세 Entity
 *
 * 반품 지시의 상세 항목 (SKU별 수량 등)
 * - 상태: REQUEST, APPROVED, RECEIVING, INSPECTED, DISPOSED, COMPLETED
 * - 처분 유형: RESTOCK, SCRAP, REPAIR, RETURN_VENDOR, DONATION
 */
@Table(name = "rwa_order_items", idStrategy = GenerationRule.UUID, uniqueFields="rwaOrderId,rwaSeq,domainId", indexes = {
	@Index(name = "ix_rwa_order_items_0", columnList = "rwa_order_id,rwa_seq,domain_id", unique = true),
	@Index(name = "ix_rwa_order_items_1", columnList = "rwa_order_id,domain_id"),
	@Index(name = "ix_rwa_order_items_2", columnList = "sku_cd,domain_id"),
	@Index(name = "ix_rwa_order_items_3", columnList = "status,domain_id"),
	@Index(name = "ix_rwa_order_items_4", columnList = "orig_order_no,domain_id"),
	@Index(name = "ix_rwa_order_items_5", columnList = "lot_no,domain_id"),
	@Index(name = "ix_rwa_order_items_6", columnList = "disposition_type,domain_id")
})
public class RwaOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 반품 지시 ID (FK → rwa_orders.id)
	 */
	@Column(name = "rwa_order_id", nullable = false, length = 40)
	private String rwaOrderId;

	/**
	 * 반품 순번 (자동 채번: MAX + 1)
	 */
	@Column(name = "rwa_seq", nullable = false)
	private Integer rwaSeq;

	/**
	 * 상태 (REQUEST/APPROVED/RECEIVING/INSPECTED/DISPOSED/COMPLETED)
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 상품 코드 (SKU)
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 상품명 (SKU 마스터에서 자동 조회)
	 */
	@Column(name = "sku_nm", length = 255)
	private String skuNm;

	/**
	 * 반품 요청 수량
	 */
	@Column(name = "rwa_req_qty", nullable = false)
	private Double rwaReqQty;

	/**
	 * 반품 실적 수량 (실제 입고된 수량)
	 */
	@Column(name = "rwa_qty")
	private Double rwaQty;

	/**
	 * 양품 수량 (검수 후)
	 */
	@Column(name = "good_qty")
	private Double goodQty;

	/**
	 * 불량 수량 (검수 후)
	 */
	@Column(name = "defect_qty")
	private Double defectQty;

	/**
	 * 처분 완료 수량
	 */
	@Column(name = "disposed_qty")
	private Double disposedQty;

	/**
	 * 박스 수
	 */
	@Column(name = "box_qty")
	private Integer boxQty;

	/**
	 * 팔레트 수
	 */
	@Column(name = "pallet_qty")
	private Integer palletQty;

	/**
	 * 입고 로케이션 코드
	 */
	@Column(name = "loc_cd", length = 20)
	private String locCd;

	/**
	 * 임시 보관 로케이션 코드
	 */
	@Column(name = "temp_loc_cd", length = 20)
	private String tempLocCd;

	/**
	 * 최종 로케이션 코드 (재입고 시)
	 */
	@Column(name = "final_loc_cd", length = 20)
	private String finalLocCd;

	/**
	 * 아이템 유형
	 */
	@Column(name = "item_type", length = 20)
	private String itemType;

	/**
	 * 로트 번호
	 */
	@Column(name = "lot_no", length = 30)
	private String lotNo;

	/**
	 * 유통기한 (YYYY-MM-DD)
	 */
	@Column(name = "expired_date", length = 10)
	private String expiredDate;

	/**
	 * 제조일자 (YYYY-MM-DD)
	 */
	@Column(name = "prd_date", length = 10)
	private String prdDate;

	/**
	 * 바코드
	 */
	@Column(name = "barcode", length = 40)
	private String barcode;

	/**
	 * 원 주문 번호 (추적용)
	 */
	@Column(name = "orig_order_no", length = 30)
	private String origOrderNo;

	/**
	 * 원 주문 순번
	 */
	@Column(name = "orig_order_seq")
	private Integer origOrderSeq;

	/**
	 * 반품 사유 코드
	 */
	@Column(name = "return_reason", length = 50)
	private String returnReason;

	/**
	 * 불량 유형 (DAMAGED/EXPIRED/WRONG_ITEM/MISSING_PARTS/FUNCTIONAL_DEFECT)
	 */
	@Column(name = "defect_type", length = 30)
	private String defectType;

	/**
	 * 불량 상세 설명
	 */
	@Column(name = "defect_desc", length = 500)
	private String defectDesc;

	/**
	 * 처분 유형 (RESTOCK/SCRAP/REPAIR/RETURN_VENDOR/DONATION)
	 */
	@Column(name = "disposition_type", length = 30)
	private String dispositionType;

	/**
	 * 처분 사유
	 */
	@Column(name = "disposition_reason", length = 500)
	private String dispositionReason;

	/**
	 * 검수 완료 수량 (good_qty + defect_qty)
	 */
	@Column(name = "inspected_qty")
	private Double inspectedQty;

	/**
	 * 검수자 ID
	 */
	@Column(name = "inspected_by", length = 32)
	private String inspectedBy;

	/**
	 * 검수 일시
	 */
	@Column(name = "inspected_at")
	private java.util.Date inspectedAt;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	/**
	 * 확장 필드 1
	 */
	@Column(name = "attr01", length = 100)
	private String attr01;

	/**
	 * 확장 필드 2
	 */
	@Column(name = "attr02", length = 100)
	private String attr02;

	/**
	 * 확장 필드 3
	 */
	@Column(name = "attr03", length = 100)
	private String attr03;

	/**
	 * 확장 필드 4
	 */
	@Column(name = "attr04", length = 100)
	private String attr04;

	/**
	 * 확장 필드 5
	 */
	@Column(name = "attr05", length = 100)
	private String attr05;

	public RwaOrderItem() {
	}

	public RwaOrderItem(String id) {
		this.id = id;
	}

	public RwaOrderItem(Long domainId, String rwaOrderId) {
		this.domainId = domainId;
		this.rwaOrderId = rwaOrderId;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getRwaOrderId() {
		return rwaOrderId;
	}

	public void setRwaOrderId(String rwaOrderId) {
		this.rwaOrderId = rwaOrderId;
	}

	public Integer getRwaSeq() {
		return rwaSeq;
	}

	public void setRwaSeq(Integer rwaSeq) {
		this.rwaSeq = rwaSeq;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
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

	public Double getRwaReqQty() {
		return rwaReqQty;
	}

	public void setRwaReqQty(Double rwaReqQty) {
		this.rwaReqQty = rwaReqQty;
	}

	public Double getRwaQty() {
		return rwaQty;
	}

	public void setRwaQty(Double rwaQty) {
		this.rwaQty = rwaQty;
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

	public Double getDisposedQty() {
		return disposedQty;
	}

	public void setDisposedQty(Double disposedQty) {
		this.disposedQty = disposedQty;
	}

	public Integer getBoxQty() {
		return boxQty;
	}

	public void setBoxQty(Integer boxQty) {
		this.boxQty = boxQty;
	}

	public Integer getPalletQty() {
		return palletQty;
	}

	public void setPalletQty(Integer palletQty) {
		this.palletQty = palletQty;
	}

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
	}

	public String getTempLocCd() {
		return tempLocCd;
	}

	public void setTempLocCd(String tempLocCd) {
		this.tempLocCd = tempLocCd;
	}

	public String getFinalLocCd() {
		return finalLocCd;
	}

	public void setFinalLocCd(String finalLocCd) {
		this.finalLocCd = finalLocCd;
	}

	public String getItemType() {
		return itemType;
	}

	public void setItemType(String itemType) {
		this.itemType = itemType;
	}

	public String getLotNo() {
		return lotNo;
	}

	public void setLotNo(String lotNo) {
		this.lotNo = lotNo;
	}

	public String getExpiredDate() {
		return expiredDate;
	}

	public void setExpiredDate(String expiredDate) {
		this.expiredDate = expiredDate;
	}

	public String getPrdDate() {
		return prdDate;
	}

	public void setPrdDate(String prdDate) {
		this.prdDate = prdDate;
	}

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
	}

	public String getOrigOrderNo() {
		return origOrderNo;
	}

	public void setOrigOrderNo(String origOrderNo) {
		this.origOrderNo = origOrderNo;
	}

	public Integer getOrigOrderSeq() {
		return origOrderSeq;
	}

	public void setOrigOrderSeq(Integer origOrderSeq) {
		this.origOrderSeq = origOrderSeq;
	}

	public String getReturnReason() {
		return returnReason;
	}

	public void setReturnReason(String returnReason) {
		this.returnReason = returnReason;
	}

	public String getDefectType() {
		return defectType;
	}

	public void setDefectType(String defectType) {
		this.defectType = defectType;
	}

	public String getDefectDesc() {
		return defectDesc;
	}

	public void setDefectDesc(String defectDesc) {
		this.defectDesc = defectDesc;
	}

	public String getDispositionType() {
		return dispositionType;
	}

	public void setDispositionType(String dispositionType) {
		this.dispositionType = dispositionType;
	}

	public String getDispositionReason() {
		return dispositionReason;
	}

	public void setDispositionReason(String dispositionReason) {
		this.dispositionReason = dispositionReason;
	}

	public Double getInspectedQty() {
		return inspectedQty;
	}

	public void setInspectedQty(Double inspectedQty) {
		this.inspectedQty = inspectedQty;
	}

	public String getInspectedBy() {
		return inspectedBy;
	}

	public void setInspectedBy(String inspectedBy) {
		this.inspectedBy = inspectedBy;
	}

	public java.util.Date getInspectedAt() {
		return inspectedAt;
	}

	public void setInspectedAt(java.util.Date inspectedAt) {
		this.inspectedAt = inspectedAt;
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

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 상태 초기화
		if (this.status == null) {
			this.status = WmsRwaConstants.STATUS_REQUEST;
		}

		// rwaSeq 자동 채번 (MAX(rwa_seq) + 1)
		if (this.rwaSeq == null || this.rwaSeq == 0) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			String sql = "SELECT COALESCE(MAX(rwa_seq), 0) FROM rwa_order_items WHERE domain_id = :domainId AND rwa_order_id = :rwaOrderId";
			Integer maxSeq = queryMgr.selectBySql(sql,
				ValueUtil.newMap("domainId,rwaOrderId", this.domainId, this.rwaOrderId),
				Integer.class);
			this.rwaSeq = (maxSeq != null ? maxSeq : 0) + 1;
		}

		// 수량 초기화
		if (this.rwaQty == null) {
			this.rwaQty = 0.0;
		}
		if (this.goodQty == null) {
			this.goodQty = 0.0;
		}
		if (this.defectQty == null) {
			this.defectQty = 0.0;
		}
		if (this.disposedQty == null) {
			this.disposedQty = 0.0;
		}
		if (this.inspectedQty == null) {
			this.inspectedQty = 0.0;
		}

		// TODO: SKU 명 자동 조회 로직 구현 필요
		// if (ValueUtil.isEmpty(this.skuNm) && ValueUtil.isNotEmpty(this.skuCd)) {
		//     SKU sku = queryMgr.select(SKU.class, new SKU(this.domainId, comCd, this.skuCd));
		//     if (sku != null) {
		//         this.skuNm = sku.getSkuNm();
		//     }
		// }
	}

	@Override
	public void beforeUpdate() {
		super.beforeUpdate();

		// 수량 검증: good_qty + defect_qty = inspected_qty
		if (this.inspectedQty != null && this.inspectedQty > 0) {
			double sumQty = (this.goodQty != null ? this.goodQty : 0.0)
						  + (this.defectQty != null ? this.defectQty : 0.0);
			if (Math.abs(sumQty - this.inspectedQty) > 0.001) {
				// 검수 수량과 양품+불량 수량이 일치하지 않음 - 자동 조정
				this.inspectedQty = sumQty;
			}
		}
	}
}
