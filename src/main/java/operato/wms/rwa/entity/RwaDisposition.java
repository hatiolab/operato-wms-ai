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
 * RWA 반품 처분 결정 Entity
 *
 * 반품 항목의 최종 처분 결정 및 재고 처리 기록
 * - 처분 유형: RESTOCK, SCRAP, REPAIR, RETURN_VENDOR, DONATION
 * - 재고 영향: RESTOCK(+), SCRAP(없음), REPAIR(보류→+), RETURN_VENDOR(없음), DONATION(-)
 * - rwa_order_item_id는 UNIQUE (1:1 관계)
 */
@Table(name = "rwa_dispositions", idStrategy = GenerationRule.UUID, uniqueFields="rwaOrderItemId,domainId", indexes = {
	@Index(name = "ix_rwa_dispositions_0", columnList = "rwa_order_item_id,domain_id", unique = true),
	@Index(name = "ix_rwa_dispositions_1", columnList = "disposition_type,domain_id"),
	@Index(name = "ix_rwa_dispositions_2", columnList = "disposed_at,domain_id"),
	@Index(name = "ix_rwa_dispositions_3", columnList = "stock_txn_id,domain_id"),
	@Index(name = "ix_rwa_dispositions_4", columnList = "repair_status,domain_id")
})
public class RwaDisposition extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 반품 상세 ID (FK → rwa_order_items.id, UNIQUE 1:1 관계)
	 */
	@Column(name = "rwa_order_item_id", nullable = false, length = 40)
	private String rwaOrderItemId;

	/**
	 * 처분 유형 (RESTOCK/SCRAP/REPAIR/RETURN_VENDOR/DONATION)
	 */
	@Column(name = "disposition_type", nullable = false, length = 30)
	private String dispositionType;

	/**
	 * 처분 수량
	 */
	@Column(name = "disposition_qty", nullable = false)
	private Double dispositionQty;

	/**
	 * 재입고 로케이션 코드 (처분유형=RESTOCK 시)
	 */
	@Column(name = "restock_loc_cd", length = 20)
	private String restockLocCd;

	/**
	 * 재입고 처리자 ID (처분유형=RESTOCK 시)
	 */
	@Column(name = "restock_by", length = 32)
	private String restockBy;

	/**
	 * 재입고 일시 (처분유형=RESTOCK 시)
	 */
	@Column(name = "restock_at")
	private java.util.Date restockAt;

	/**
	 * 폐기 로케이션 코드 (처분유형=SCRAP 시)
	 */
	@Column(name = "scrap_loc_cd", length = 20)
	private String scrapLocCd;

	/**
	 * 폐기 처리자 ID (처분유형=SCRAP 시)
	 */
	@Column(name = "scrap_by", length = 32)
	private String scrapBy;

	/**
	 * 폐기 일시 (처분유형=SCRAP 시)
	 */
	@Column(name = "scrap_at")
	private java.util.Date scrapAt;

	/**
	 * 폐기 방법 (처분유형=SCRAP 시)
	 */
	@Column(name = "scrap_method", length = 30)
	private String scrapMethod;

	/**
	 * 수리 업체 코드 (처분유형=REPAIR 시)
	 */
	@Column(name = "repair_vend_cd", length = 30)
	private String repairVendCd;

	/**
	 * 수리 비용 (처분유형=REPAIR 시)
	 */
	@Column(name = "repair_cost")
	private Double repairCost;

	/**
	 * 수리 상태 (REQUESTED/IN_PROGRESS/COMPLETED, 처분유형=REPAIR 시)
	 */
	@Column(name = "repair_status", length = 20)
	private String repairStatus;

	/**
	 * 반송 송장 번호 (처분유형=RETURN_VENDOR 시)
	 */
	@Column(name = "return_ship_no", length = 30)
	private String returnShipNo;

	/**
	 * 반송 운송사 (처분유형=RETURN_VENDOR 시)
	 */
	@Column(name = "return_carrier", length = 30)
	private String returnCarrier;

	/**
	 * 반송 출하 일시 (처분유형=RETURN_VENDOR 시)
	 */
	@Column(name = "return_shipped_at")
	private java.util.Date returnShippedAt;

	/**
	 * 재고 영향 여부 (true: 재고 변동 발생)
	 */
	@Column(name = "stock_impact_flag")
	private Boolean stockImpactFlag;

	/**
	 * 재고 트랜잭션 ID (재고 처리 후 연결된 트랜잭션 ID)
	 */
	@Column(name = "stock_txn_id", length = 40)
	private String stockTxnId;

	/**
	 * 처분 결정자 ID
	 */
	@Column(name = "disposed_by", nullable = false, length = 32)
	private String disposedBy;

	/**
	 * 처분 완료 일시
	 */
	@Column(name = "disposed_at", nullable = false)
	private java.util.Date disposedAt;

	/**
	 * 처분 사유
	 */
	@Column(name = "disposition_reason", length = 500)
	private String dispositionReason;

	/**
	 * 재무 영향 금액
	 */
	@Column(name = "financial_impact")
	private Double financialImpact;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	public RwaDisposition() {
	}

	public RwaDisposition(String id) {
		this.id = id;
	}

	public RwaDisposition(Long domainId, String rwaOrderItemId) {
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

	public String getDispositionType() {
		return dispositionType;
	}

	public void setDispositionType(String dispositionType) {
		this.dispositionType = dispositionType;
	}

	public Double getDispositionQty() {
		return dispositionQty;
	}

	public void setDispositionQty(Double dispositionQty) {
		this.dispositionQty = dispositionQty;
	}

	public String getRestockLocCd() {
		return restockLocCd;
	}

	public void setRestockLocCd(String restockLocCd) {
		this.restockLocCd = restockLocCd;
	}

	public String getRestockBy() {
		return restockBy;
	}

	public void setRestockBy(String restockBy) {
		this.restockBy = restockBy;
	}

	public java.util.Date getRestockAt() {
		return restockAt;
	}

	public void setRestockAt(java.util.Date restockAt) {
		this.restockAt = restockAt;
	}

	public String getScrapLocCd() {
		return scrapLocCd;
	}

	public void setScrapLocCd(String scrapLocCd) {
		this.scrapLocCd = scrapLocCd;
	}

	public String getScrapBy() {
		return scrapBy;
	}

	public void setScrapBy(String scrapBy) {
		this.scrapBy = scrapBy;
	}

	public java.util.Date getScrapAt() {
		return scrapAt;
	}

	public void setScrapAt(java.util.Date scrapAt) {
		this.scrapAt = scrapAt;
	}

	public String getScrapMethod() {
		return scrapMethod;
	}

	public void setScrapMethod(String scrapMethod) {
		this.scrapMethod = scrapMethod;
	}

	public String getRepairVendCd() {
		return repairVendCd;
	}

	public void setRepairVendCd(String repairVendCd) {
		this.repairVendCd = repairVendCd;
	}

	public Double getRepairCost() {
		return repairCost;
	}

	public void setRepairCost(Double repairCost) {
		this.repairCost = repairCost;
	}

	public String getRepairStatus() {
		return repairStatus;
	}

	public void setRepairStatus(String repairStatus) {
		this.repairStatus = repairStatus;
	}

	public String getReturnShipNo() {
		return returnShipNo;
	}

	public void setReturnShipNo(String returnShipNo) {
		this.returnShipNo = returnShipNo;
	}

	public String getReturnCarrier() {
		return returnCarrier;
	}

	public void setReturnCarrier(String returnCarrier) {
		this.returnCarrier = returnCarrier;
	}

	public java.util.Date getReturnShippedAt() {
		return returnShippedAt;
	}

	public void setReturnShippedAt(java.util.Date returnShippedAt) {
		this.returnShippedAt = returnShippedAt;
	}

	public Boolean getStockImpactFlag() {
		return stockImpactFlag;
	}

	public void setStockImpactFlag(Boolean stockImpactFlag) {
		this.stockImpactFlag = stockImpactFlag;
	}

	public String getStockTxnId() {
		return stockTxnId;
	}

	public void setStockTxnId(String stockTxnId) {
		this.stockTxnId = stockTxnId;
	}

	public String getDisposedBy() {
		return disposedBy;
	}

	public void setDisposedBy(String disposedBy) {
		this.disposedBy = disposedBy;
	}

	public java.util.Date getDisposedAt() {
		return disposedAt;
	}

	public void setDisposedAt(java.util.Date disposedAt) {
		this.disposedAt = disposedAt;
	}

	public String getDispositionReason() {
		return dispositionReason;
	}

	public void setDispositionReason(String dispositionReason) {
		this.dispositionReason = dispositionReason;
	}

	public Double getFinancialImpact() {
		return financialImpact;
	}

	public void setFinancialImpact(Double financialImpact) {
		this.financialImpact = financialImpact;
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

		// 처분 일시 기본값
		if (this.disposedAt == null) {
			this.disposedAt = new java.util.Date();
		}

		// 재고 영향 플래그 설정
		if (this.stockImpactFlag == null) {
			this.stockImpactFlag = WmsRwaConstants.DEFAULT_STOCK_IMPACT_FLAG;
		}

		// 처분 유형별 재고 영향 플래그 자동 설정
		if (ValueUtil.isNotEmpty(this.dispositionType)) {
			switch (this.dispositionType) {
				case WmsRwaConstants.DISPOSITION_TYPE_RESTOCK:
					// 재입고: 재고 증가
					this.stockImpactFlag = true;
					if (this.restockAt == null) {
						this.restockAt = this.disposedAt;
					}
					break;
				case WmsRwaConstants.DISPOSITION_TYPE_SCRAP:
					// 폐기: 재고 영향 없음
					this.stockImpactFlag = false;
					if (this.scrapAt == null) {
						this.scrapAt = this.disposedAt;
					}
					break;
				case WmsRwaConstants.DISPOSITION_TYPE_REPAIR:
					// 수리: 수리 완료 후 재고 증가 (보류)
					this.stockImpactFlag = false;
					if (ValueUtil.isEmpty(this.repairStatus)) {
						this.repairStatus = WmsRwaConstants.REPAIR_STATUS_REQUESTED;
					}
					break;
				case WmsRwaConstants.DISPOSITION_TYPE_RETURN_VENDOR:
					// 공급업체 반송: 재고 영향 없음
					this.stockImpactFlag = false;
					if (this.returnShippedAt == null) {
						this.returnShippedAt = this.disposedAt;
					}
					break;
				case WmsRwaConstants.DISPOSITION_TYPE_DONATION:
					// 기부: 재고 차감
					this.stockImpactFlag = true;
					break;
			}
		}

	}

	@Override
	public void afterCreate() {
		super.afterCreate();

		// 처분 완료 후 rwa_order_items의 disposition_type, disposed_qty 자동 업데이트
		if (ValueUtil.isNotEmpty(this.rwaOrderItemId)) {
			IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
			RwaOrderItem item = queryMgr.select(RwaOrderItem.class, this.rwaOrderItemId);

			if (item != null) {
				item.setDispositionType(this.dispositionType);
				item.setDisposedQty(this.dispositionQty);
				item.setStatus(WmsRwaConstants.STATUS_DISPOSED);

				queryMgr.update(item);
			}
		}
	}

}
