package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 보충 지시 상세
 *
 * @author HatioLab
 */
@Table(name = "replenish_order_items", idStrategy = GenerationRule.UUID, uniqueFields = "domainId,replenishOrderId,rank", indexes = {
    @Index(name = "ix_replenish_order_items_0", columnList = "domain_id,replenish_order_id,rank", unique = true),
    @Index(name = "ix_replenish_order_items_1", columnList = "domain_id,replenish_order_id,sku_cd"),
    @Index(name = "ix_replenish_order_items_2", columnList = "domain_id,replenish_order_id,from_loc_cd"),
    @Index(name = "ix_replenish_order_items_3", columnList = "domain_id,replenish_order_id,to_loc_cd")
})
public class ReplenishOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 848373920384756289L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 보충 지시 ID (FK → replenish_orders.id)
	 */
	@Column (name = "replenish_order_id", nullable = false, length = 40)
	private String replenishOrderId;

	/**
	 * 순번
	 */
	@Column (name = "rank", nullable = false)
	private Integer rank;

	/**
	 * 상품 코드
	 */
	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 상품명
	 */
	@Column (name = "sku_nm", length = 100)
	private String skuNm;

	/**
	 * 출발 로케이션 코드
	 */
	@Column (name = "from_loc_cd", nullable = false, length = 30)
	private String fromLocCd;

	/**
	 * 도착 로케이션 코드
	 */
	@Column (name = "to_loc_cd", nullable = false, length = 30)
	private String toLocCd;

	/**
	 * 지시 수량
	 */
	@Column (name = "order_qty", nullable = false)
	private Double orderQty;

	/**
	 * 지시 박스 수
	 */
	@Column (name = "order_box")
	private Integer orderBox;

	/**
	 * 지시 낱개 수량
	 */
	@Column (name = "order_ea")
	private Double orderEa;

	/**
	 * 실적 수량
	 */
	@Column (name = "result_qty")
	private Double resultQty;

	/**
	 * 실적 박스 수
	 */
	@Column (name = "result_box")
	private Integer resultBox;

	/**
	 * 실적 낱개 수량
	 */
	@Column (name = "result_ea")
	private Double resultEa;

	/**
	 * 상태
	 */
	@Column (name = "status", length = 20)
	private String status;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 1000)
	private String remarks;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getReplenishOrderId() {
		return replenishOrderId;
	}

	public void setReplenishOrderId(String replenishOrderId) {
		this.replenishOrderId = replenishOrderId;
	}

	public Integer getRank() {
		return rank;
	}

	public void setRank(Integer rank) {
		this.rank = rank;
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

	public String getFromLocCd() {
		return fromLocCd;
	}

	public void setFromLocCd(String fromLocCd) {
		this.fromLocCd = fromLocCd;
	}

	public String getToLocCd() {
		return toLocCd;
	}

	public void setToLocCd(String toLocCd) {
		this.toLocCd = toLocCd;
	}

	public Double getOrderQty() {
		return orderQty;
	}

	public void setOrderQty(Double orderQty) {
		this.orderQty = orderQty;
	}

	public Integer getOrderBox() {
		return orderBox;
	}

	public void setOrderBox(Integer orderBox) {
		this.orderBox = orderBox;
	}

	public Double getOrderEa() {
		return orderEa;
	}

	public void setOrderEa(Double orderEa) {
		this.orderEa = orderEa;
	}

	public Double getResultQty() {
		return resultQty;
	}

	public void setResultQty(Double resultQty) {
		this.resultQty = resultQty;
	}

	public Integer getResultBox() {
		return resultBox;
	}

	public void setResultBox(Integer resultBox) {
		this.resultBox = resultBox;
	}

	public Double getResultEa() {
		return resultEa;
	}

	public void setResultEa(Double resultEa) {
		this.resultEa = resultEa;
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

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// 수량 기본 설정
		if (this.orderBox == null) {
			this.orderBox = 0;
		}

		if (this.orderEa == null) {
			this.orderEa = 0.0;
		}

		if (this.resultQty == null) {
			this.resultQty = 0.0;
		}

		if (this.resultBox == null) {
			this.resultBox = 0;
		}

		if (this.resultEa == null) {
			this.resultEa = 0.0;
		}
	}
}
