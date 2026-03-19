package operato.wms.vas.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 유통가공 실적 Entity
 *
 * 유통가공 작업 완료 후의 실적 기록
 * - 완성품 및 불량품 수량 관리
 * - 생성 후 부모 vas_orders의 completed_qty 자동 업데이트
 */
@Table(name = "vas_results", idStrategy = GenerationRule.UUID, uniqueFields = "vasOrderId,resultSeq,domainId", indexes = {
		@Index(name = "ix_vas_results_0", columnList = "vas_order_id,result_seq,domain_id", unique = true),
		@Index(name = "ix_vas_results_1", columnList = "vas_order_id,domain_id"),
		@Index(name = "ix_vas_results_2", columnList = "set_sku_cd,domain_id"),
		@Index(name = "ix_vas_results_3", columnList = "worker_id,domain_id"),
		@Index(name = "ix_vas_results_4", columnList = "work_date,domain_id"),
		@Index(name = "ix_vas_results_5", columnList = "stock_txn_id,domain_id")
})
public class VasResult extends xyz.elidom.orm.entity.basic.ElidomStampHook {

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
	 * 유통가공 작업 지시 번호 (vas_orders.vas_no 참조)
	 */
	@Column(name = "vas_no", length = 30)
	private String vasNo;

	/**
	 * 실적 순번 (자동 채번)
	 */
	@Column(name = "result_seq", nullable = false)
	private Integer resultSeq;

	/**
	 * 실적 유형 (ASSEMBLY/DISASSEMBLY)
	 */
	@Column(name = "result_type", nullable = false, length = 30)
	private String resultType;

	/**
	 * 완성품 코드 (세트 상품 코드)
	 */
	@Column(name = "set_sku_cd", nullable = false, length = 30)
	private String setSkuCd;

	/**
	 * 완성품명
	 */
	@Column(name = "set_sku_nm", length = 255)
	private String setSkuNm;

	/**
	 * 완성 수량
	 */
	@Column(name = "result_qty", nullable = false)
	private Double resultQty;

	/**
	 * 불량 수량
	 */
	@Column(name = "defect_qty")
	private Double defectQty;

	/**
	 * 적치 로케이션 (완성품 보관 위치)
	 */
	@Column(name = "dest_loc_cd", length = 20)
	private String destLocCd;

	/**
	 * 로트 번호
	 */
	@Column(name = "lot_no", length = 30)
	private String lotNo;

	/**
	 * 작업자 ID
	 */
	@Column(name = "worker_id", length = 32)
	private String workerId;

	/**
	 * 작업 일자 (YYYY-MM-DD)
	 */
	@Column(name = "work_date", nullable = false, length = 10)
	private String workDate;

	/**
	 * 재고 트랜잭션 ID (재고 처리 후 참조)
	 */
	@Column(name = "stock_txn_id", length = 40)
	private String stockTxnId;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	public VasResult() {
	}

	public VasResult(String id) {
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

	public String getVasNo() {
		return vasNo;
	}

	public void setVasNo(String vasNo) {
		this.vasNo = vasNo;
	}

	public Integer getResultSeq() {
		return resultSeq;
	}

	public void setResultSeq(Integer resultSeq) {
		this.resultSeq = resultSeq;
	}

	public String getResultType() {
		return resultType;
	}

	public void setResultType(String resultType) {
		this.resultType = resultType;
	}

	public String getSetSkuCd() {
		return setSkuCd;
	}

	public void setSetSkuCd(String setSkuCd) {
		this.setSkuCd = setSkuCd;
	}

	public String getSetSkuNm() {
		return setSkuNm;
	}

	public void setSetSkuNm(String setSkuNm) {
		this.setSkuNm = setSkuNm;
	}

	public Double getResultQty() {
		return resultQty;
	}

	public void setResultQty(Double resultQty) {
		this.resultQty = resultQty;
	}

	public Double getDefectQty() {
		return defectQty;
	}

	public void setDefectQty(Double defectQty) {
		this.defectQty = defectQty;
	}

	public String getDestLocCd() {
		return destLocCd;
	}

	public void setDestLocCd(String destLocCd) {
		this.destLocCd = destLocCd;
	}

	public String getLotNo() {
		return lotNo;
	}

	public void setLotNo(String lotNo) {
		this.lotNo = lotNo;
	}

	public String getWorkerId() {
		return workerId;
	}

	public void setWorkerId(String workerId) {
		this.workerId = workerId;
	}

	public String getWorkDate() {
		return workDate;
	}

	public void setWorkDate(String workDate) {
		this.workDate = workDate;
	}

	public String getStockTxnId() {
		return stockTxnId;
	}

	public void setStockTxnId(String stockTxnId) {
		this.stockTxnId = stockTxnId;
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

		// resultSeq 자동 채번 (MAX(result_seq) + 1)
		if (this.resultSeq == null || this.resultSeq == 0) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			String sql = "SELECT COALESCE(MAX(result_seq), 0) FROM vas_results WHERE domain_id = :domainId AND vas_order_id = :vasOrderId";
			Integer maxSeq = queryMgr.selectBySql(sql,
					ValueUtil.newMap("domainId,vasOrderId", this.domainId, this.vasOrderId),
					Integer.class);
			this.resultSeq = (maxSeq != null ? maxSeq : 0) + 1;
		}

		// 작업 일자 기본값 (오늘)
		if (ValueUtil.isEmpty(this.workDate)) {
			this.workDate = xyz.elidom.util.DateUtil.todayStr("yyyy-MM-dd");
		}

		// 불량 수량 초기화
		if (this.defectQty == null) {
			this.defectQty = 0.0;
		}
	}

	@Override
	public void afterCreate() {
		super.afterCreate();
		this.updateParentOrderCompletedQty();
	}

	/**
	 * 부모 vas_orders의 completed_qty 업데이트
	 */
	private void updateParentOrderCompletedQty() {
		if (ValueUtil.isNotEmpty(this.vasOrderId)) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			VasOrder order = queryMgr.select(VasOrder.class, this.vasOrderId);

			if (order != null) {
				String sql = "SELECT COALESCE(SUM(result_qty), 0) FROM vas_results WHERE domain_id = :domainId AND vas_order_id = :vasOrderId";
				Double totalResultQty = queryMgr.selectBySql(sql,
						ValueUtil.newMap("domainId,vasOrderId", this.domainId, this.vasOrderId),
						Double.class);

				order.setCompletedQty(totalResultQty);
				queryMgr.update(order, "completedQty");
			}
		}
	}
}
