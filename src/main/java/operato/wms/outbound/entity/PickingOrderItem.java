package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.util.ValueUtil;

@Table(name = "picking_order_items", idStrategy = GenerationRule.UUID, indexes = {
    @Index(name = "ix_picking_order_items_0", columnList = "domain_id,pick_order_id,rls_line_no"),
    @Index(name = "ix_picking_order_items_1", columnList = "domain_id,pick_order_id,sku_cd"),
    @Index(name = "ix_picking_order_items_2", columnList = "domain_id,pick_order_id,from_loc_cd"),
    @Index(name = "ix_picking_order_items_3", columnList = "domain_id,pick_order_id,barcode"),
    @Index(name = "ix_picking_order_items_4", columnList = "domain_id,pick_order_id,status"),
    @Index(name = "ix_picking_order_items_5", columnList = "domain_id,pick_order_id,inventory_id")
})
public class PickingOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 272378931261846778L;
	
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

	@Column (name = "pick_order_id", nullable = false, length = 40)
	private String pickOrderId;
	
	@Column (name = "inventory_id", nullable = false, length = 40)
	private String inventoryId;
	
	@Column (name = "barcode", nullable = false, length = 30)
	private String barcode;

	@Column (name = "rank", nullable = false)
	private Integer rank;
	
    @Column (name = "rls_line_no", length = 5)
    private String rlsLineNo;

	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	@Column (name = "sku_nm")
	private String skuNm;

	@Column (name = "from_loc_cd", nullable = false, length = 30)
	private String fromLocCd;

	@Column (name = "to_loc_cd", nullable = false, length = 30)
	private String toLocCd;

	@Column (name = "lot_no", length = 50)
	private String lotNo;

	@Column (name = "serial_no", length = 50)
	private String serialNo;

	@Column (name = "expired_date", length = 20)
	private String expiredDate;

	@Column (name = "prod_date", length = 20)
	private String prodDate;

	@Column (name = "box_in_qty")
	private Double boxInQty;

	@Column (name = "order_qty", nullable = false)
	private Double orderQty;

	@Column (name = "order_box")
	private Integer orderBox;

	@Column (name = "order_ea")
	private Double orderEa;

	@Column (name = "pick_qty")
	private Double pickQty;

	@Column (name = "pick_box")
	private Integer pickBox;

	@Column (name = "pick_ea")
	private Double pickEa;
	
	@Column (name = "status", length = 10)
	private String status;

	@Column (name = "remarks", length = 1000)
	private String remarks;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getPickOrderId() {
		return pickOrderId;
	}

	public void setPickOrderId(String pickOrderId) {
		this.pickOrderId = pickOrderId;
	}
	
	public String getInventoryId() {
		return inventoryId;
	}

	public void setInventoryId(String inventoryId) {
		this.inventoryId = inventoryId;
	}

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
	}

	public Integer getRank() {
		return rank;
	}

	public void setRank(Integer rank) {
		this.rank = rank;
	}

	public String getRlsLineNo() {
        return rlsLineNo;
    }

    public void setRlsLineNo(String rlsLineNo) {
        this.rlsLineNo = rlsLineNo;
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

	public String getLotNo() {
		return lotNo;
	}

	public void setLotNo(String lotNo) {
		this.lotNo = lotNo;
	}

	public String getSerialNo() {
		return serialNo;
	}

	public void setSerialNo(String serialNo) {
		this.serialNo = serialNo;
	}

	public String getExpiredDate() {
		return expiredDate;
	}

	public void setExpiredDate(String expiredDate) {
		this.expiredDate = expiredDate;
	}

	public String getProdDate() {
		return prodDate;
	}

	public void setProdDate(String prodDate) {
		this.prodDate = prodDate;
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

	public Double getPickQty() {
		return pickQty;
	}

	public void setPickQty(Double pickQty) {
		this.pickQty = pickQty;
	}

	public Integer getPickBox() {
		return pickBox;
	}

	public void setPickBox(Integer pickBox) {
		this.pickBox = pickBox;
	}

	public Double getPickEa() {
		return pickEa;
	}

	public void setPickEa(Double pickEa) {
		this.pickEa = pickEa;
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
        
        // Status 설정
        if (ValueUtil.isEmpty(this.status)) {
            this.setStatus(PickingOrderItem.STATUS_WAIT);
        }
        
        // 수량 기본 설정
        if(this.orderBox == null) {
            this.orderBox = 0;
        }

        if(this.orderEa == null) {
            this.orderEa = 0.0;
        }

        if(this.pickQty == null) {
            this.pickQty = 0.0;
        }

        if(this.pickBox == null) {
            this.pickBox = 0;
        }

        if(this.pickEa == null) {
            this.pickEa = 0.0;
        }
    }
}
