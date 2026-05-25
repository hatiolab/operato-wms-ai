package operato.wms.stock.entity;

import java.util.Date;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 일별 재고 수불 집계 - inventory_trans를 매일 0시 배치로 집계하여 저장한다.
 * 당일 이전 수불 조회 시 이 테이블을 사용하고, 당일은 inventory_trans를 직접 집계한다.
 */
@Table(name = "daily_stock_summaries", idStrategy = GenerationRule.UUID, indexes = {
		@Index(name = "ix_dly_stk_sum_0", columnList = "domain_id,summary_date,wh_cd,com_cd,sku_cd", unique = true),
		@Index(name = "ix_dly_stk_sum_1", columnList = "domain_id,wh_cd,com_cd,summary_date"),
		@Index(name = "ix_dly_stk_sum_2", columnList = "domain_id,com_cd,sku_cd,summary_date")
})
public class DailyStockSummary extends xyz.elidom.orm.entity.basic.DomainCreateStamp {

	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 일별 수불 집계 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 집계 기준일 (형식: YYYY-MM-DD)
	 */
	@Column(name = "summary_date", nullable = false, length = 10)
	private String summaryDate;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 상품 코드
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 기초 재고 수량 - 해당일 0시 기준
	 */
	@Column(name = "opening_qty", nullable = false)
	private Double openingQty;

	/**
	 * 입고 수량 (IN + RWA_RESTOCK)
	 */
	@Column(name = "in_qty", nullable = false)
	private Double inQty;

	/**
	 * 출고 수량 (OUT)
	 */
	@Column(name = "out_qty", nullable = false)
	private Double outQty;

	/**
	 * 입고 취소 수량 (IN_CANCEL)
	 */
	@Column(name = "in_cancel_qty", nullable = false)
	private Double inCancelQty;

	/**
	 * 출고 취소 수량 (OUT_CANCEL)
	 */
	@Column(name = "out_cancel_qty", nullable = false)
	private Double outCancelQty;

	/**
	 * 창고간 이동 입고 수량 (MOVE_IN)
	 */
	@Column(name = "transfer_in_qty", nullable = false)
	private Double transferInQty;

	/**
	 * 창고간 이동 출고 수량 (MOVE_OUT)
	 */
	@Column(name = "transfer_out_qty", nullable = false)
	private Double transferOutQty;

	/**
	 * 조정 증가 수량 (ADJUST_PLUS + COUNT_PLUS)
	 */
	@Column(name = "adjust_plus_qty", nullable = false)
	private Double adjustPlusQty;

	/**
	 * 조정 감소 수량 (ADJUST_MINUS + COUNT_MINUS)
	 */
	@Column(name = "adjust_minus_qty", nullable = false)
	private Double adjustMinusQty;

	/**
	 * 재고 신규 추가 수량 (NEW)
	 */
	@Column(name = "add_qty", nullable = false)
	private Double addQty;

	/**
	 * 손실 수량 (SCRAP / LOSS)
	 */
	@Column(name = "loss_qty", nullable = false)
	private Double lossQty;

	/**
	 * 유통가공 차감 수량 (VAS_OUT)
	 */
	@Column(name = "vas_out_qty", nullable = false)
	private Double vasOutQty;

	/**
	 * 기말 재고 수량 - closing_qty = opening_qty + in_qty - in_cancel_qty
	 * - out_qty + out_cancel_qty
	 * + transfer_in_qty - transfer_out_qty
	 * + adjust_plus_qty - adjust_minus_qty
	 * + add_qty - loss_qty - vas_out_qty
	 */
	@Column(name = "closing_qty", nullable = false)
	private Double closingQty;

	/**
	 * 해당일 총 트랜잭션 건수
	 */
	@Column(name = "tran_count", nullable = false)
	private Integer tranCount;

	/**
	 * 재계산 일시 - 배치 재실행 시 업데이트
	 */
	@Column(name = "updated_at")
	private Date updatedAt;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getSummaryDate() {
		return summaryDate;
	}

	public void setSummaryDate(String summaryDate) {
		this.summaryDate = summaryDate;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
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

	public Double getOpeningQty() {
		return openingQty;
	}

	public void setOpeningQty(Double openingQty) {
		this.openingQty = openingQty;
	}

	public Double getInQty() {
		return inQty;
	}

	public void setInQty(Double inQty) {
		this.inQty = inQty;
	}

	public Double getOutQty() {
		return outQty;
	}

	public void setOutQty(Double outQty) {
		this.outQty = outQty;
	}

	public Double getInCancelQty() {
		return inCancelQty;
	}

	public void setInCancelQty(Double inCancelQty) {
		this.inCancelQty = inCancelQty;
	}

	public Double getOutCancelQty() {
		return outCancelQty;
	}

	public void setOutCancelQty(Double outCancelQty) {
		this.outCancelQty = outCancelQty;
	}

	public Double getTransferInQty() {
		return transferInQty;
	}

	public void setTransferInQty(Double transferInQty) {
		this.transferInQty = transferInQty;
	}

	public Double getTransferOutQty() {
		return transferOutQty;
	}

	public void setTransferOutQty(Double transferOutQty) {
		this.transferOutQty = transferOutQty;
	}

	public Double getAdjustPlusQty() {
		return adjustPlusQty;
	}

	public void setAdjustPlusQty(Double adjustPlusQty) {
		this.adjustPlusQty = adjustPlusQty;
	}

	public Double getAdjustMinusQty() {
		return adjustMinusQty;
	}

	public void setAdjustMinusQty(Double adjustMinusQty) {
		this.adjustMinusQty = adjustMinusQty;
	}

	public Double getAddQty() {
		return addQty;
	}

	public void setAddQty(Double addQty) {
		this.addQty = addQty;
	}

	public Double getLossQty() {
		return lossQty;
	}

	public void setLossQty(Double lossQty) {
		this.lossQty = lossQty;
	}

	public Double getVasOutQty() {
		return vasOutQty;
	}

	public void setVasOutQty(Double vasOutQty) {
		this.vasOutQty = vasOutQty;
	}

	public Double getClosingQty() {
		return closingQty;
	}

	public void setClosingQty(Double closingQty) {
		this.closingQty = closingQty;
	}

	public Integer getTranCount() {
		return tranCount;
	}

	public void setTranCount(Integer tranCount) {
		this.tranCount = tranCount;
	}

	public Date getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(Date updatedAt) {
		this.updatedAt = updatedAt;
	}
}
