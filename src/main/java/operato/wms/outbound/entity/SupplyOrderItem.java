package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "supply_order_items", idStrategy = GenerationRule.UUID, indexes = {
    @Index(name = "ix_supply_order_items_0", columnList = "domain_id,supply_order_id,rank", unique = true),
    @Index(name = "ix_supply_order_items_1", columnList = "domain_id,supply_order_id,sku_cd"),
    @Index(name = "ix_supply_order_items_2", columnList = "domain_id,supply_order_id,from_loc_cd"),
    @Index(name = "ix_supply_order_items_3", columnList = "domain_id,supply_order_id,to_loc_cd")
})
public class SupplyOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 905759094271142983L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "supply_order_id", nullable = false, length = 40)
	private String supplyOrderId;

	@Column (name = "rank", nullable = false)
	private Integer rank;

	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	@Column (name = "sku_nm")
	private String skuNm;

	@Column (name = "from_loc_cd", nullable = false, length = 30)
	private String fromLocCd;

	@Column (name = "to_loc_cd", nullable = false, length = 30)
	private String toLocCd;

	@Column (name = "box_in_qty")
	private Double boxInQty;

	@Column (name = "order_qty", nullable = false)
	private Double orderQty;

	@Column (name = "order_box", nullable = false)
	private Integer orderBox;

	@Column (name = "order_ea", nullable = false)
	private Double orderEa;

	@Column (name = "supply_qty")
	private Double supplyQty;

	@Column (name = "supply_box")
	private Integer supplyBox;

	@Column (name = "supply_ea")
	private Double supplyEa;

	@Column (name = "remarks", length = 1000)
	private String remarks;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getSupplyOrderId() {
		return supplyOrderId;
	}

	public void setSupplyOrderId(String supplyOrderId) {
		this.supplyOrderId = supplyOrderId;
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

	public Double getBoxInQty() {
		return boxInQty;
	}

	public void setBoxInQty(Double boxInQty) {
		this.boxInQty = boxInQty;
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

	public Double getSupplyQty() {
		return supplyQty;
	}

	public void setSupplyQty(Double supplyQty) {
		this.supplyQty = supplyQty;
	}

	public Integer getSupplyBox() {
		return supplyBox;
	}

	public void setSupplyBox(Integer supplyBox) {
		this.supplyBox = supplyBox;
	}

	public Double getSupplyEa() {
		return supplyEa;
	}

	public void setSupplyEa(Double supplyEa) {
		this.supplyEa = supplyEa;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}	
}
