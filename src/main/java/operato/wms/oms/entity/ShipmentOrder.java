package operato.wms.oms.entity;

import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 출하 주문
 *
 * @author HatioLab
 */
@Table(name = "shipment_orders", idStrategy = GenerationRule.UUID, uniqueFields="domainId,shipmentNo", indexes = {
	@Index(name = "ix_shipment_orders_0", columnList = "domain_id,shipment_no", unique = true),
	@Index(name = "ix_shipment_orders_1", columnList = "domain_id,ref_order_no"),
	@Index(name = "ix_shipment_orders_2", columnList = "domain_id,order_date,status"),
	@Index(name = "ix_shipment_orders_3", columnList = "domain_id,wave_no"),
	@Index(name = "ix_shipment_orders_4", columnList = "domain_id,com_cd,wh_cd"),
	@Index(name = "ix_shipment_orders_5", columnList = "domain_id,biz_type,ship_type,pick_method"),
	@Index(name = "ix_shipment_orders_6", columnList = "domain_id,cust_cd,order_date"),
	@Index(name = "ix_shipment_orders_7", columnList = "domain_id,priority_cd,ship_by_date")
})
public class ShipmentOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 359214403927582353L;

	/**
     * 출하 상태 - REGISTERED (등록)
     */
    public static final String STATUS_REGISTERED = "REGISTERED";
    /**
     * 출하 상태 - CONFIRMED (확정)
     */
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    /**
     * 출하 상태 - ALLOCATED (할당 완료)
     */
    public static final String STATUS_ALLOCATED = "ALLOCATED";
    /**
     * 출하 상태 - WAVED (웨이브 처리)
     */
    public static final String STATUS_WAVED = "WAVED";
    /**
     * 출하 상태 - RELEASED (릴리스 완료)
     */
    public static final String STATUS_RELEASED = "RELEASED";
    /**
     * 출하 상태 - PICKING (피킹 중)
     */
    public static final String STATUS_PICKING = "PICKING";
    /**
     * 출하 상태 - PACKING (포장 중)
     */
    public static final String STATUS_PACKING = "PACKING";
    /**
     * 출하 상태 - SHIPPED (출하 완료)
     */
    public static final String STATUS_SHIPPED = "SHIPPED";
    /**
     * 출하 상태 - CLOSED (마감)
     */
    public static final String STATUS_CLOSED = "CLOSED";
    /**
     * 출하 상태 - BACK_ORDER (백오더)
     */
    public static final String STATUS_BACK_ORDER = "BACK_ORDER";
    /**
     * 출하 상태 - CANCELLED (취소)
     */
    public static final String STATUS_CANCELLED = "CANCELLED";

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 출하 번호
	 */
	@Column (name = "shipment_no", nullable = false, length = 30)
	private String shipmentNo;

	/**
	 * 참조 주문 번호 (채널 주문 번호)
	 */
	@Column (name = "ref_order_no", length = 50)
	private String refOrderNo;

	/**
	 * 주문일자 (YYYY-MM-DD)
	 */
	@Column (name = "order_date", nullable = false, length = 10)
	private String orderDate;

	/**
	 * 출하 기한일 (YYYY-MM-DD)
	 */
	@Column (name = "ship_by_date", length = 10)
	private String shipByDate;

	/**
	 * 마감 시간 (HH:mm)
	 */
	@Column (name = "cutoff_time", length = 5)
	private String cutoffTime;

	/**
	 * 우선순위 코드 (URGENT/HIGH/NORMAL/LOW)
	 */
	@Column (name = "priority_cd", length = 10)
	private String priorityCd;

	/**
	 * 웨이브 번호
	 */
	@Column (name = "wave_no", length = 30)
	private String waveNo;

	/**
	 * 회사 코드
	 */
	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 고객 코드
	 */
	@Column (name = "cust_cd", length = 30)
	private String custCd;

	/**
	 * 고객명
	 */
	@Column (name = "cust_nm", length = 100)
	private String custNm;

	/**
	 * 창고 코드
	 */
	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 업무 유형 (B2C_OUT/B2B_OUT/B2C_RTN/B2B_RTN)
	 */
	@Column (name = "biz_type", length = 10)
	private String bizType;

	/**
	 * 출하 유형 (PARCEL/FREIGHT/DIRECT/STORE_PICKUP)
	 */
	@Column (name = "ship_type", length = 20)
	private String shipType;

	/**
	 * 피킹 방식 (WCS/PAPER/INSPECT/PICK)
	 */
	@Column (name = "pick_method", length = 20)
	private String pickMethod;

	/**
	 * 배송 유형 (STANDARD/EXPRESS/SAME_DAY/DAWN)
	 */
	@Column (name = "dlv_type", length = 20)
	private String dlvType;

	/**
	 * 택배사 코드
	 */
	@Column (name = "carrier_cd", length = 30)
	private String carrierCd;

	/**
	 * 이동 대상 창고 코드
	 */
	@Column (name = "to_wh_cd", length = 30)
	private String toWhCd;

	/**
	 * 총 품목 수
	 */
	@Column (name = "total_item")
	private Integer totalItem;

	/**
	 * 총 주문 수량
	 */
	@Column (name = "total_order")
	private Double totalOrder;

	/**
	 * 총 할당 수량
	 */
	@Column (name = "total_alloc")
	private Double totalAlloc;

	/**
	 * 총 출하 수량
	 */
	@Column (name = "total_shipped")
	private Double totalShipped;

	/**
	 * 라벨 템플릿 코드
	 */
	@Column (name = "label_template_cd", length = 36)
	private String labelTemplateCd;

	/**
	 * 상태 (REGISTERED/CONFIRMED/ALLOCATED/WAVED/RELEASED/PICKING/PACKING/SHIPPED/CLOSED/BACK_ORDER/CANCELLED)
	 */
	@Column (name = "status", nullable = false, length = 20)
	private String status;

	/**
	 * 인터페이스 상태
	 */
	@Column (name = "if_status", length = 20)
	private String ifStatus;

	/**
	 * 확정 일시
	 */
	@Column (name = "confirmed_at", length = 20)
	private String confirmedAt;

	/**
	 * 할당 일시
	 */
	@Column (name = "allocated_at", length = 20)
	private String allocatedAt;

	/**
	 * 릴리스 일시
	 */
	@Column (name = "released_at", length = 20)
	private String releasedAt;

	/**
	 * 출하 일시
	 */
	@Column (name = "shipped_at", length = 20)
	private String shippedAt;

	/**
	 * 마감 일시
	 */
	@Column (name = "closed_at", length = 20)
	private String closedAt;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 1000)
	private String remarks;

	/**
	 * 확장 필드 1
	 */
	@Column (name = "attr01", length = 100)
	private String attr01;

	/**
	 * 확장 필드 2
	 */
	@Column (name = "attr02", length = 100)
	private String attr02;

	/**
	 * 확장 필드 3
	 */
	@Column (name = "attr03", length = 100)
	private String attr03;

	/**
	 * 확장 필드 4
	 */
	@Column (name = "attr04", length = 100)
	private String attr04;

	/**
	 * 확장 필드 5
	 */
	@Column (name = "attr05", length = 100)
	private String attr05;

	public ShipmentOrder() {
	}

	public ShipmentOrder(String id) {
	    this.id = id;
	}

	public ShipmentOrder(Long domainId, String shipmentNo) {
	    this.domainId = domainId;
	    this.shipmentNo = shipmentNo;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getShipmentNo() {
		return shipmentNo;
	}

	public void setShipmentNo(String shipmentNo) {
		this.shipmentNo = shipmentNo;
	}

	public String getRefOrderNo() {
		return refOrderNo;
	}

	public void setRefOrderNo(String refOrderNo) {
		this.refOrderNo = refOrderNo;
	}

	public String getOrderDate() {
		return orderDate;
	}

	public void setOrderDate(String orderDate) {
		this.orderDate = orderDate;
	}

	public String getShipByDate() {
		return shipByDate;
	}

	public void setShipByDate(String shipByDate) {
		this.shipByDate = shipByDate;
	}

	public String getCutoffTime() {
		return cutoffTime;
	}

	public void setCutoffTime(String cutoffTime) {
		this.cutoffTime = cutoffTime;
	}

	public String getPriorityCd() {
		return priorityCd;
	}

	public void setPriorityCd(String priorityCd) {
		this.priorityCd = priorityCd;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getCustCd() {
		return custCd;
	}

	public void setCustCd(String custCd) {
		this.custCd = custCd;
	}

	public String getCustNm() {
		return custNm;
	}

	public void setCustNm(String custNm) {
		this.custNm = custNm;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getBizType() {
		return bizType;
	}

	public void setBizType(String bizType) {
		this.bizType = bizType;
	}

	public String getShipType() {
		return shipType;
	}

	public void setShipType(String shipType) {
		this.shipType = shipType;
	}

	public String getPickMethod() {
		return pickMethod;
	}

	public void setPickMethod(String pickMethod) {
		this.pickMethod = pickMethod;
	}

	public String getDlvType() {
		return dlvType;
	}

	public void setDlvType(String dlvType) {
		this.dlvType = dlvType;
	}

	public String getCarrierCd() {
		return carrierCd;
	}

	public void setCarrierCd(String carrierCd) {
		this.carrierCd = carrierCd;
	}

	public String getToWhCd() {
		return toWhCd;
	}

	public void setToWhCd(String toWhCd) {
		this.toWhCd = toWhCd;
	}

	public Integer getTotalItem() {
		return totalItem;
	}

	public void setTotalItem(Integer totalItem) {
		this.totalItem = totalItem;
	}

	public Double getTotalOrder() {
		return totalOrder;
	}

	public void setTotalOrder(Double totalOrder) {
		this.totalOrder = totalOrder;
	}

	public Double getTotalAlloc() {
		return totalAlloc;
	}

	public void setTotalAlloc(Double totalAlloc) {
		this.totalAlloc = totalAlloc;
	}

	public Double getTotalShipped() {
		return totalShipped;
	}

	public void setTotalShipped(Double totalShipped) {
		this.totalShipped = totalShipped;
	}

	public String getLabelTemplateCd() {
		return labelTemplateCd;
	}

	public void setLabelTemplateCd(String labelTemplateCd) {
		this.labelTemplateCd = labelTemplateCd;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getIfStatus() {
		return ifStatus;
	}

	public void setIfStatus(String ifStatus) {
		this.ifStatus = ifStatus;
	}

	public String getConfirmedAt() {
		return confirmedAt;
	}

	public void setConfirmedAt(String confirmedAt) {
		this.confirmedAt = confirmedAt;
	}

	public String getAllocatedAt() {
		return allocatedAt;
	}

	public void setAllocatedAt(String allocatedAt) {
		this.allocatedAt = allocatedAt;
	}

	public String getReleasedAt() {
		return releasedAt;
	}

	public void setReleasedAt(String releasedAt) {
		this.releasedAt = releasedAt;
	}

	public String getShippedAt() {
		return shippedAt;
	}

	public void setShippedAt(String shippedAt) {
		this.shippedAt = shippedAt;
	}

	public String getClosedAt() {
		return closedAt;
	}

	public void setClosedAt(String closedAt) {
		this.closedAt = closedAt;
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
        this.status = (this.status == null) ? ShipmentOrder.STATUS_REGISTERED : this.status;

        // 출하 번호가 없다면 자동 생성
        if(ValueUtil.isEmpty(this.shipmentNo)) {
            this.shipmentNo = (String)BeanUtil.get(ICustomService.class).doCustomService(Domain.currentDomainId(), "diy-generate-shipment-no", ValueUtil.newMap("order", this));
        }

        // 주문일이 없는 경우 당일 날짜 설정
        if(this.orderDate == null) {
        	this.orderDate = DateUtil.todayStr();
        }
	}
}
