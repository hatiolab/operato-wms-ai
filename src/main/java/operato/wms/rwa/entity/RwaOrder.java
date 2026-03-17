package operato.wms.rwa.entity;

import operato.wms.rwa.WmsRwaConstants;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * RWA(Return Warehouse Authorization) 반품 지시 헤더 Entity
 *
 * 반품 지시의 헤더 정보를 관리
 * - 반품 유형: CUSTOMER_RETURN, VENDOR_RETURN, DEFECT_RETURN, STOCK_ADJUST,
 * EXPIRED_RETURN
 * - 상태: REQUEST, APPROVED, RECEIVING, INSPECTING, INSPECTED, DISPOSED,
 * COMPLETED, CLOSED, REJECTED, CANCELLED
 */
@Table(name = "rwa_orders", idStrategy = GenerationRule.UUID, uniqueFields = "rwaNo,domainId", indexes = {
		@Index(name = "ix_rwa_orders_0", columnList = "rwa_no,domain_id", unique = true),
		@Index(name = "ix_rwa_orders_1", columnList = "com_cd,domain_id"),
		@Index(name = "ix_rwa_orders_2", columnList = "wh_cd,domain_id"),
		@Index(name = "ix_rwa_orders_3", columnList = "com_cd,status,domain_id"),
		@Index(name = "ix_rwa_orders_4", columnList = "rwa_req_date,com_cd,domain_id"),
		@Index(name = "ix_rwa_orders_5", columnList = "rwa_type,com_cd,domain_id"),
		@Index(name = "ix_rwa_orders_6", columnList = "order_no,com_cd,domain_id"),
		@Index(name = "ix_rwa_orders_7", columnList = "cust_cd,com_cd,domain_id"),
		@Index(name = "ix_rwa_orders_8", columnList = "vend_cd,com_cd,domain_id")
})
public class RwaOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 반품 번호 (UNIQUE, 자동 채번: RWA-YYYYMMDD-XXXXX)
	 */
	@Column(name = "rwa_no", nullable = false, length = 30)
	private String rwaNo;

	/**
	 * 반품 요청 번호 (외부 시스템 연동용)
	 */
	@Column(name = "rwa_req_no", length = 30)
	private String rwaReqNo;

	/**
	 * 반품 요청 일자 (YYYY-MM-DD)
	 */
	@Column(name = "rwa_req_date", nullable = false, length = 10)
	private String rwaReqDate;

	/**
	 * 반품 완료 일자 (YYYY-MM-DD)
	 */
	@Column(name = "rwa_end_date", length = 10)
	private String rwaEndDate;

	/**
	 * 상태
	 * (REQUEST/APPROVED/RECEIVING/INSPECTING/INSPECTED/DISPOSED/COMPLETED/CLOSED/REJECTED/CANCELLED)
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 반품 유형
	 * (CUSTOMER_RETURN/VENDOR_RETURN/DEFECT_RETURN/STOCK_ADJUST/EXPIRED_RETURN)
	 */
	@Column(name = "rwa_type", nullable = false, length = 30)
	private String rwaType;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", length = 20)
	private String whCd;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", length = 20)
	private String comCd;

	/**
	 * 공급사 코드 (공급업체 반품 시)
	 */
	@Column(name = "vend_cd", length = 20)
	private String vendCd;

	/**
	 * 고객 코드 (고객 반품 시)
	 */
	@Column(name = "cust_cd", length = 30)
	private String custCd;

	/**
	 * 고객명
	 */
	@Column(name = "cust_nm", length = 100)
	private String custNm;

	/**
	 * 원 주문 번호 (고객 반품 시)
	 */
	@Column(name = "order_no", length = 30)
	private String orderNo;

	/**
	 * 인보이스 번호
	 */
	@Column(name = "invoice_no", length = 30)
	private String invoiceNo;

	/**
	 * 담당자 ID
	 */
	@Column(name = "mgr_id", length = 32)
	private String mgrId;

	/**
	 * 검수 여부 (default: true)
	 */
	@Column(name = "insp_flag")
	private Boolean inspFlag;

	/**
	 * 품질검사 필요 여부
	 */
	@Column(name = "qc_flag")
	private Boolean qcFlag;

	/**
	 * 총 박스 수
	 */
	@Column(name = "total_box")
	private Integer totalBox;

	/**
	 * 총 팔레트 수
	 */
	@Column(name = "total_pallet")
	private Integer totalPallet;

	/**
	 * 반품 사유 코드
	 */
	@Column(name = "return_reason", length = 50)
	private String returnReason;

	/**
	 * 반품 사유 상세 설명
	 */
	@Column(name = "return_reason_desc", length = 500)
	private String returnReasonDesc;

	/**
	 * 차량 번호
	 */
	@Column(name = "car_no", length = 30)
	private String carNo;

	/**
	 * 운전자명
	 */
	@Column(name = "driver_nm", length = 40)
	private String driverNm;

	/**
	 * 운전자 전화번호
	 */
	@Column(name = "driver_tel", length = 20)
	private String driverTel;

	/**
	 * 승인자 ID
	 */
	@Column(name = "approved_by", length = 32)
	private String approvedBy;

	/**
	 * 승인 일시
	 */
	@Column(name = "approved_at")
	private java.util.Date approvedAt;

	/**
	 * 검수자 ID
	 */
	@Column(name = "inspected_by", length = 32)
	private String inspectedBy;

	/**
	 * 검수 완료 일시
	 */
	@Column(name = "inspected_at")
	private java.util.Date inspectedAt;

	/**
	 * 처분 결정자 ID
	 */
	@Column(name = "disposed_by", length = 32)
	private String disposedBy;

	/**
	 * 처분 완료 일시
	 */
	@Column(name = "disposed_at")
	private java.util.Date disposedAt;

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

	public RwaOrder() {
	}

	public RwaOrder(String id) {
		this.id = id;
	}

	public RwaOrder(Long domainId, String rwaNo) {
		this.domainId = domainId;
		this.rwaNo = rwaNo;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getRwaNo() {
		return rwaNo;
	}

	public void setRwaNo(String rwaNo) {
		this.rwaNo = rwaNo;
	}

	public String getRwaReqNo() {
		return rwaReqNo;
	}

	public void setRwaReqNo(String rwaReqNo) {
		this.rwaReqNo = rwaReqNo;
	}

	public String getRwaReqDate() {
		return rwaReqDate;
	}

	public void setRwaReqDate(String rwaReqDate) {
		this.rwaReqDate = rwaReqDate;
	}

	public String getRwaEndDate() {
		return rwaEndDate;
	}

	public void setRwaEndDate(String rwaEndDate) {
		this.rwaEndDate = rwaEndDate;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getRwaType() {
		return rwaType;
	}

	public void setRwaType(String rwaType) {
		this.rwaType = rwaType;
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

	public String getVendCd() {
		return vendCd;
	}

	public void setVendCd(String vendCd) {
		this.vendCd = vendCd;
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

	public String getOrderNo() {
		return orderNo;
	}

	public void setOrderNo(String orderNo) {
		this.orderNo = orderNo;
	}

	public String getInvoiceNo() {
		return invoiceNo;
	}

	public void setInvoiceNo(String invoiceNo) {
		this.invoiceNo = invoiceNo;
	}

	public String getMgrId() {
		return mgrId;
	}

	public void setMgrId(String mgrId) {
		this.mgrId = mgrId;
	}

	public Boolean getInspFlag() {
		return inspFlag;
	}

	public void setInspFlag(Boolean inspFlag) {
		this.inspFlag = inspFlag;
	}

	public Boolean getQcFlag() {
		return qcFlag;
	}

	public void setQcFlag(Boolean qcFlag) {
		this.qcFlag = qcFlag;
	}

	public Integer getTotalBox() {
		return totalBox;
	}

	public void setTotalBox(Integer totalBox) {
		this.totalBox = totalBox;
	}

	public Integer getTotalPallet() {
		return totalPallet;
	}

	public void setTotalPallet(Integer totalPallet) {
		this.totalPallet = totalPallet;
	}

	public String getReturnReason() {
		return returnReason;
	}

	public void setReturnReason(String returnReason) {
		this.returnReason = returnReason;
	}

	public String getReturnReasonDesc() {
		return returnReasonDesc;
	}

	public void setReturnReasonDesc(String returnReasonDesc) {
		this.returnReasonDesc = returnReasonDesc;
	}

	public String getCarNo() {
		return carNo;
	}

	public void setCarNo(String carNo) {
		this.carNo = carNo;
	}

	public String getDriverNm() {
		return driverNm;
	}

	public void setDriverNm(String driverNm) {
		this.driverNm = driverNm;
	}

	public String getDriverTel() {
		return driverTel;
	}

	public void setDriverTel(String driverTel) {
		this.driverTel = driverTel;
	}

	public String getApprovedBy() {
		return approvedBy;
	}

	public void setApprovedBy(String approvedBy) {
		this.approvedBy = approvedBy;
	}

	public java.util.Date getApprovedAt() {
		return approvedAt;
	}

	public void setApprovedAt(java.util.Date approvedAt) {
		this.approvedAt = approvedAt;
	}

	public String getInspectedBy() {
		return inspectedBy;
	}

	public void setInspectedBy(String inspectedBy) {
		this.inspectedBy = inspectedBy;
	}

	public java.util.Date getInspectedAt() {
		return inspectedAt;
	}

	public void setInspectedAt(java.util.Date inspectedAt) {
		this.inspectedAt = inspectedAt;
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
		if (this.status == null) {
			this.status = WmsRwaConstants.STATUS_REQUEST;
		}

		// 반품 번호 자동 채번 (RWA-YYYYMMDD-XXXXX)
		if (ValueUtil.isEmpty(this.rwaNo)) {
			String dateStr = DateUtil.todayStr("yyyyMMdd");
			// TODO: 일련번호 채번 서비스 구현 필요
			// this.rwaNo = WmsRwaConstants.RWA_NO_PREFIX + dateStr + "-" + getNextSeq();
			this.rwaNo = this.rwaReqNo;
		}

		// 반품 요청일이 없는 경우 당일 날짜 설정
		if (ValueUtil.isEmpty(this.rwaReqDate)) {
			this.rwaReqDate = DateUtil.todayStr();
		}

		// 검수 플래그 기본값
		if (this.inspFlag == null) {
			this.inspFlag = WmsRwaConstants.DEFAULT_INSP_FLAG;
		}
	}
}
