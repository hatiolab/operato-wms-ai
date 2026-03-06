package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "supply_orders", idStrategy = GenerationRule.UUID, uniqueFields="supplyOrderNo,domainId", indexes = {
	@Index(name = "ix_supply_orders_0", columnList = "supply_order_no,domain_id", unique = true),
	@Index(name = "ix_supply_orders_1", columnList = "wave_no,domain_id"),
	@Index(name = "ix_supply_orders_2", columnList = "wh_cd,com_cd,order_date,domain_id"),
	@Index(name = "ix_supply_orders_3", columnList = "status,order_date,domain_id")
})
public class SupplyOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 398722235352333859L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "supply_order_no", nullable = false, length = 30)
	private String supplyOrderNo;

	@Column (name = "wave_no", nullable = false, length = 30)
	private String waveNo;

	@Column (name = "order_date", nullable = false, length = 10)
	private String orderDate;

	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	@Column (name = "plan_order", nullable = false)
	private Integer planOrder;

	@Column (name = "plan_sku", nullable = false)
	private Integer planSku;

	@Column (name = "plan_pcs", nullable = false)
	private Double planPcs;

	@Column (name = "result_pcs", nullable = false)
	private Double resultPcs;

	@Column (name = "progress_rate", nullable = false, length = 30)
	private String progressRate;

	@Column (name = "status", nullable = false, length = 10)
	private String status;

	@Column (name = "remarks", nullable = false, length = 1000)
	private String remarks;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getSupplyOrderNo() {
		return supplyOrderNo;
	}

	public void setSupplyOrderNo(String supplyOrderNo) {
		this.supplyOrderNo = supplyOrderNo;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
	}

	public String getOrderDate() {
		return orderDate;
	}

	public void setOrderDate(String orderDate) {
		this.orderDate = orderDate;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public Integer getPlanOrder() {
		return planOrder;
	}

	public void setPlanOrder(Integer planOrder) {
		this.planOrder = planOrder;
	}

	public Integer getPlanSku() {
		return planSku;
	}

	public void setPlanSku(Integer planSku) {
		this.planSku = planSku;
	}

	public Double getPlanPcs() {
		return planPcs;
	}

	public void setPlanPcs(Double planPcs) {
		this.planPcs = planPcs;
	}

	public Double getResultPcs() {
		return resultPcs;
	}

	public void setResultPcs(Double resultPcs) {
		this.resultPcs = resultPcs;
	}

	public String getProgressRate() {
		return progressRate;
	}

	public void setProgressRate(String progressRate) {
		this.progressRate = progressRate;
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
}
