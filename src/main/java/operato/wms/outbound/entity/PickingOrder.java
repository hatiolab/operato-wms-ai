package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "picking_orders", idStrategy = GenerationRule.UUID, uniqueFields="pickOrderNo,domainId", indexes = {
	@Index(name = "ix_picking_orders_0", columnList = "pick_order_no,domain_id", unique = true),
	@Index(name = "ix_picking_orders_1", columnList = "status,order_date,domain_id"),
	@Index(name = "ix_picking_orders_2", columnList = "wave_no,domain_id"),
	@Index(name = "ix_picking_orders_3", columnList = "wh_cd,com_cd,domain_id")
})
public class PickingOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 992590555109261888L;
	
	/**
	 * 피킹 상태 - WAIT (대기)
	 */
	public static final String STATUS_WAIT = "WAIT";
	/**
	 * 피킹 상태 - RUN (실행 중)
	 */
	public static final String STATUS_RUN = "RUN";
	/**
	 * 피킹 상태 - END (완료)
	 */
	public static final String STATUS_END = "END";
	/**
	 * 피킹 상태 - CANCEL (취소)
	 */
	public static final String STATUS_CANCEL = "CANCEL";

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "pick_order_no", nullable = false, length = 30)
	private String pickOrderNo;

	@Column (name = "order_seq", nullable = false)
	private Integer orderSeq;

	@Column (name = "wave_no", length = 30)
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

	@Column (name = "box_in_qty")
	private Double boxInQty;

	@Column (name = "plan_box")
	private Integer planBox;

	@Column (name = "plan_ea")
	private Double planEa;

    @Column (name = "result_box")
    private Integer resultBox;
    
	@Column (name = "result_pcs")
	private Double resultPcs;
	
	@Column (name = "progress_rate")
	private Double progressRate;

	@Column (name = "status", length = 10)
	private String status;

	@Column (name = "remarks", length = 1000)
	private String remarks;

	@Column (name = "attr01", length = 100)
	private String attr01;

	@Column (name = "attr02", length = 100)
	private String attr02;

	@Column (name = "attr03", length = 100)
	private String attr03;

	@Column (name = "attr04", length = 100)
	private String attr04;

	@Column (name = "attr05", length = 100)
	private String attr05;
	
	public PickingOrder() {
	}
	
	public PickingOrder(String id) {
	    this.id = id;
	}
	
    public PickingOrder(Long domainId, String pickOrderNo) {
        this.domainId = domainId;
        this.pickOrderNo = pickOrderNo;
    }
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getPickOrderNo() {
		return pickOrderNo;
	}

	public void setPickOrderNo(String pickOrderNo) {
		this.pickOrderNo = pickOrderNo;
	}

	public Integer getOrderSeq() {
		return orderSeq;
	}

	public void setOrderSeq(Integer orderSeq) {
		this.orderSeq = orderSeq;
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

	public Double getBoxInQty() {
		return boxInQty;
	}

	public void setBoxInQty(Double boxInQty) {
		this.boxInQty = boxInQty;
	}

	public Integer getPlanBox() {
		return planBox;
	}

	public void setPlanBox(Integer planBox) {
		this.planBox = planBox;
	}

	public Double getPlanEa() {
		return planEa;
	}

	public void setPlanEa(Double planEa) {
		this.planEa = planEa;
	}

	public Integer getResultBox() {
        return resultBox;
    }

    public void setResultBox(Integer resultBox) {
        this.resultBox = resultBox;
    }

    public Double getResultPcs() {
		return resultPcs;
	}

	public void setResultPcs(Double resultPcs) {
		this.resultPcs = resultPcs;
	}

    public Double getProgressRate() {
		return progressRate;
	}

	public void setProgressRate(Double progressRate) {
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

}
