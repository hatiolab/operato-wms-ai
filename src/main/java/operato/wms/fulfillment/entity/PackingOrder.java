package operato.wms.fulfillment.entity;

import org.apache.commons.lang.StringUtils;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.dev.entity.RangedSeq;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 검수/포장/출하 지시 (헤더)
 *
 * @author HatioLab
 */
@Table(name = "packing_orders", idStrategy = GenerationRule.UUID, uniqueFields = "domainId,packOrderNo", indexes = {
		@Index(name = "ix_packing_orders_0", columnList = "domain_id,pack_order_no", unique = true),
		@Index(name = "ix_packing_orders_1", columnList = "domain_id,shipment_order_id"),
		@Index(name = "ix_packing_orders_2", columnList = "domain_id,wave_no"),
		@Index(name = "ix_packing_orders_3", columnList = "domain_id,pick_task_no"),
		@Index(name = "ix_packing_orders_4", columnList = "domain_id,order_date,status"),
		@Index(name = "ix_packing_orders_5", columnList = "domain_id,station_cd,status"),
		@Index(name = "ix_packing_orders_6", columnList = "domain_id,carrier_cd,status"),
		@Index(name = "ix_packing_orders_7", columnList = "domain_id,dock_cd,status")
})
public class PackingOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 상태 - CREATED (생성)
	 */
	public static final String STATUS_CREATED = "CREATED";
	/**
	 * 상태 - IN_PROGRESS (진행 중)
	 */
	public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
	/**
	 * 상태 - COMPLETED (포장 완료)
	 */
	public static final String STATUS_COMPLETED = "COMPLETED";
	/**
	 * 상태 - LABEL_PRINTED (라벨 출력)
	 */
	public static final String STATUS_LABEL_PRINTED = "LABEL_PRINTED";
	/**
	 * 상태 - MANIFESTED (적하 목록 전송)
	 */
	public static final String STATUS_MANIFESTED = "MANIFESTED";
	/**
	 * 상태 - SHIPPED (출하 완료)
	 */
	public static final String STATUS_SHIPPED = "SHIPPED";
	/**
	 * 상태 - CANCELLED (취소)
	 */
	public static final String STATUS_CANCELLED = "CANCELLED";

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 포장 지시 번호 (자동 채번, UNIQUE)
	 */
	@Column(name = "pack_order_no", nullable = false, length = 30)
	private String packOrderNo;

	/**
	 * 연결 피킹 지시 번호
	 */
	@Column(name = "pick_task_no", length = 30)
	private String pickTaskNo;

	/**
	 * FK → shipment_orders
	 */
	@Column(name = "shipment_order_id", length = 40)
	private String shipmentOrderId;

	/**
	 * 출하 주문 번호
	 */
	@Column(name = "shipment_no", length = 30)
	private String shipmentNo;

	/**
	 * 웨이브 번호
	 */
	@Column(name = "wave_no", length = 30)
	private String waveNo;

	/**
	 * 작업 일자
	 */
	@Column(name = "order_date", nullable = false, length = 10)
	private String orderDate;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 검수 유형 (FULL/SAMPLING/SKIP)
	 */
	@Column(name = "insp_type", length = 20)
	private String inspType;

	/**
	 * 검수 결과 (PASS/FAIL)
	 */
	@Column(name = "insp_result", length = 10)
	private String inspResult;

	/**
	 * 포장 스테이션 코드
	 */
	@Column(name = "station_cd", length = 30)
	private String stationCd;

	/**
	 * 작업자 ID
	 */
	@Column(name = "worker_id", length = 40)
	private String workerId;

	/**
	 * 검수 수량
	 */
	@Column(name = "insp_qty")
	private Double inspQty;

	/**
	 * 포장 박스 수
	 */
	@Column(name = "total_box")
	private Integer totalBox;

	/**
	 * 택배사 코드
	 */
	@Column(name = "carrier_cd", length = 30)
	private String carrierCd;

	/**
	 * 택배 서비스 유형 (STANDARD/EXPRESS/SAME_DAY/NEXT_DAY/ECONOMY)
	 */
	@Column(name = "carrier_service_type", length = 20)
	private String carrierServiceType;

	/**
	 * 총 중량 (kg)
	 */
	@Column(name = "total_wt")
	private Double totalWt;

	/**
	 * 출하 도크 코드
	 */
	@Column(name = "dock_cd", length = 30)
	private String dockCd;

	/**
	 * 라벨 템플릿 코드
	 */
	@Column(name = "label_template_cd", length = 36)
	private String labelTemplateCd;

	/**
	 * 상태 (CREATED/IN_PROGRESS/COMPLETED/LABEL_PRINTED/MANIFESTED/SHIPPED/CANCELLED)
	 */
	@Column(name = "status", nullable = false, length = 20)
	private String status;

	/**
	 * 작업 시작 일시
	 */
	@Column(name = "started_at", length = 20)
	private String startedAt;

	/**
	 * 작업 완료 일시
	 */
	@Column(name = "completed_at", length = 20)
	private String completedAt;

	/**
	 * 적하 목록 전송 일시
	 */
	@Column(name = "manifested_at", length = 20)
	private String manifestedAt;

	/**
	 * 출하 확정 일시
	 */
	@Column(name = "shipped_at", length = 20)
	private String shippedAt;

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

	public PackingOrder() {
	}

	public PackingOrder(String id) {
		this.id = id;
	}

	public PackingOrder(Long domainId, String packOrderNo) {
		this.domainId = domainId;
		this.packOrderNo = packOrderNo;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getPackOrderNo() {
		return packOrderNo;
	}

	public void setPackOrderNo(String packOrderNo) {
		this.packOrderNo = packOrderNo;
	}

	public String getPickTaskNo() {
		return pickTaskNo;
	}

	public void setPickTaskNo(String pickTaskNo) {
		this.pickTaskNo = pickTaskNo;
	}

	public String getShipmentOrderId() {
		return shipmentOrderId;
	}

	public void setShipmentOrderId(String shipmentOrderId) {
		this.shipmentOrderId = shipmentOrderId;
	}

	public String getShipmentNo() {
		return shipmentNo;
	}

	public void setShipmentNo(String shipmentNo) {
		this.shipmentNo = shipmentNo;
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

	public String getInspType() {
		return inspType;
	}

	public void setInspType(String inspType) {
		this.inspType = inspType;
	}

	public String getInspResult() {
		return inspResult;
	}

	public void setInspResult(String inspResult) {
		this.inspResult = inspResult;
	}

	public String getStationCd() {
		return stationCd;
	}

	public void setStationCd(String stationCd) {
		this.stationCd = stationCd;
	}

	public String getWorkerId() {
		return workerId;
	}

	public void setWorkerId(String workerId) {
		this.workerId = workerId;
	}

	public Double getInspQty() {
		return inspQty;
	}

	public void setInspQty(Double inspQty) {
		this.inspQty = inspQty;
	}

	public Integer getTotalBox() {
		return totalBox;
	}

	public void setTotalBox(Integer totalBox) {
		this.totalBox = totalBox;
	}

	public String getCarrierCd() {
		return carrierCd;
	}

	public void setCarrierCd(String carrierCd) {
		this.carrierCd = carrierCd;
	}

	public String getCarrierServiceType() {
		return carrierServiceType;
	}

	public void setCarrierServiceType(String carrierServiceType) {
		this.carrierServiceType = carrierServiceType;
	}

	public Double getTotalWt() {
		return totalWt;
	}

	public void setTotalWt(Double totalWt) {
		this.totalWt = totalWt;
	}

	public String getDockCd() {
		return dockCd;
	}

	public void setDockCd(String dockCd) {
		this.dockCd = dockCd;
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

	public String getStartedAt() {
		return startedAt;
	}

	public void setStartedAt(String startedAt) {
		this.startedAt = startedAt;
	}

	public String getCompletedAt() {
		return completedAt;
	}

	public void setCompletedAt(String completedAt) {
		this.completedAt = completedAt;
	}

	public String getManifestedAt() {
		return manifestedAt;
	}

	public void setManifestedAt(String manifestedAt) {
		this.manifestedAt = manifestedAt;
	}

	public String getShippedAt() {
		return shippedAt;
	}

	public void setShippedAt(String shippedAt) {
		this.shippedAt = shippedAt;
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

		// 상태 기본값 설정
		if (ValueUtil.isEmpty(this.status)) {
			this.status = STATUS_CREATED;
		}

		// 작업일자 기본값 설정 (당일)
		if (ValueUtil.isEmpty(this.orderDate)) {
			this.orderDate = DateUtil.todayStr();
		}

		// pick_task_no 자동 채번
		if (ValueUtil.isEmpty(this.packOrderNo)) {
			Integer seq = RangedSeq.increaseSequence(Domain.currentDomainId(), "PACK_ORDER_NO", "DATE",
					this.orderDate,
					null,
					null, null);
			String serialNo = StringUtils.leftPad(String.valueOf(seq), 5, "0");
			this.packOrderNo = "PO-" + this.orderDate.replaceAll("-", "").substring(2) + "-" + serialNo;
		}
	}
}
