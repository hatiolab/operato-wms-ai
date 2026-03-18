package operato.wms.vas.entity;

import operato.wms.vas.WmsVasConstants;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 유통가공 작업 지시 상세 Entity
 *
 * 유통가공 작업에 필요한 자재별 상세 정보를 관리
 * - BOM 구성 품목 × 계획 수량으로 자동 생성
 * - 수량 추적: req_qty → alloc_qty → picked_qty → used_qty
 */
@Table(name = "vas_order_items", idStrategy = GenerationRule.UUID, uniqueFields = "vasOrderId,vasSeq,domainId", indexes = {
		@Index(name = "ix_vas_order_items_0", columnList = "vas_order_id,vas_seq,domain_id", unique = true),
		@Index(name = "ix_vas_order_items_1", columnList = "vas_order_id,domain_id"),
		@Index(name = "ix_vas_order_items_2", columnList = "sku_cd,domain_id"),
		@Index(name = "ix_vas_order_items_3", columnList = "status,domain_id"),
		@Index(name = "ix_vas_order_items_4", columnList = "lot_no,domain_id"),
		@Index(name = "ix_vas_order_items_5", columnList = "src_loc_cd,domain_id")
})
public class VasOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 유통가공 작업 지시 ID (FK → vas_orders.id)
	 */
	@Column(name = "vas_order_id", nullable = false, length = 40)
	private String vasOrderId;

	/**
	 * 순번 (자동 채번)
	 */
	@Column(name = "vas_seq", nullable = false)
	private Integer vasSeq;

	/**
	 * 구성 상품 코드 (자재)
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 구성 상품명 (자동 조회)
	 */
	@Column(name = "sku_nm", length = 255)
	private String skuNm;

	/**
	 * 소요 수량 (= plan_qty × component_qty)
	 */
	@Column(name = "req_qty", nullable = false)
	private Double reqQty;

	/**
	 * 배정 수량
	 */
	@Column(name = "alloc_qty")
	private Double allocQty;

	/**
	 * 피킹 완료 수량
	 */
	@Column(name = "picked_qty")
	private Double pickedQty;

	/**
	 * 사용 수량 (실제 작업에 투입된 수량)
	 */
	@Column(name = "used_qty")
	private Double usedQty;

	/**
	 * 손실 수량
	 */
	@Column(name = "loss_qty")
	private Double lossQty;

	/**
	 * 자재 피킹 로케이션
	 */
	@Column(name = "src_loc_cd", length = 20)
	private String srcLocCd;

	/**
	 * 작업 로케이션
	 */
	@Column(name = "work_loc_cd", length = 20)
	private String workLocCd;

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
	 * 상태 (PLANNED/ALLOCATED/PICKING/PICKED/IN_USE/COMPLETED)
	 */
	@Column(name = "status", length = 20)
	private String status;

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

	public VasOrderItem() {
	}

	public VasOrderItem(String id) {
		this.id = id;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getVasOrderId() {
		return vasOrderId;
	}

	public void setVasOrderId(String vasOrderId) {
		this.vasOrderId = vasOrderId;
	}

	public Integer getVasSeq() {
		return vasSeq;
	}

	public void setVasSeq(Integer vasSeq) {
		this.vasSeq = vasSeq;
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

	public Double getReqQty() {
		return reqQty;
	}

	public void setReqQty(Double reqQty) {
		this.reqQty = reqQty;
	}

	public Double getAllocQty() {
		return allocQty;
	}

	public void setAllocQty(Double allocQty) {
		this.allocQty = allocQty;
	}

	public Double getPickedQty() {
		return pickedQty;
	}

	public void setPickedQty(Double pickedQty) {
		this.pickedQty = pickedQty;
	}

	public Double getUsedQty() {
		return usedQty;
	}

	public void setUsedQty(Double usedQty) {
		this.usedQty = usedQty;
	}

	public Double getLossQty() {
		return lossQty;
	}

	public void setLossQty(Double lossQty) {
		this.lossQty = lossQty;
	}

	public String getSrcLocCd() {
		return srcLocCd;
	}

	public void setSrcLocCd(String srcLocCd) {
		this.srcLocCd = srcLocCd;
	}

	public String getWorkLocCd() {
		return workLocCd;
	}

	public void setWorkLocCd(String workLocCd) {
		this.workLocCd = workLocCd;
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

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// vasSeq 자동 채번 (MAX(vas_seq) + 1)
		if (this.vasSeq == null || this.vasSeq == 0) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			String sql = "SELECT COALESCE(MAX(vas_seq), 0) FROM vas_order_items WHERE domain_id = :domainId AND vas_order_id = :vasOrderId";
			Integer maxSeq = queryMgr.selectBySql(sql,
					ValueUtil.newMap("domainId,vasOrderId", this.domainId, this.vasOrderId),
					Integer.class);
			this.vasSeq = (maxSeq != null ? maxSeq : 0) + 1;
		}

		// 상태 초기화
		if (this.status == null) {
			this.status = WmsVasConstants.ITEM_STATUS_PLANNED;
		}

		// 수량 초기화
		if (this.allocQty == null) {
			this.allocQty = 0.0;
		}
		if (this.pickedQty == null) {
			this.pickedQty = 0.0;
		}
		if (this.usedQty == null) {
			this.usedQty = 0.0;
		}
		if (this.lossQty == null) {
			this.lossQty = 0.0;
		}
	}
}
