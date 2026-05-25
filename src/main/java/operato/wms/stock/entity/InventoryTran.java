package operato.wms.stock.entity;

import java.math.BigDecimal;
import java.util.Date;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 재고 트랜잭션 - 재고 수량 변동 이력을 Append-only로 기록한다.
 * 취소/오류는 역방향 트랜잭션(+/- 반전)으로 처리하며 DELETE는 금지한다.
 */
@Table(name = "inventory_trans", idStrategy = GenerationRule.UUID, indexes = {
		@Index(name = "ix_inv_trn_0", columnList = "domain_id,tran_date,wh_cd,com_cd"),
		@Index(name = "ix_inv_trn_1", columnList = "domain_id,tran_date,wh_cd,com_cd,sku_cd"),
		@Index(name = "ix_inv_trn_2", columnList = "domain_id,inventory_id,tran_at"),
		@Index(name = "ix_inv_trn_3", columnList = "domain_id,barcode,tran_at"),
		@Index(name = "ix_inv_trn_4", columnList = "domain_id,ref_doc_type,ref_doc_no"),
		@Index(name = "ix_inv_trn_5", columnList = "domain_id,tran_type,tran_date"),
		@Index(name = "ix_inv_trn_6", columnList = "domain_id,worker_id,tran_date")
})
public class InventoryTran extends xyz.elidom.orm.entity.basic.DomainCreateStamp {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/** 수불 방향 - IN (수량 증가) */
	public static final String DIRECTION_IN = "IN";
	/** 수불 방향 - OUT (수량 감소) */
	public static final String DIRECTION_OUT = "OUT";

	/** 트랜잭션 유형 - 입고 */
	public static final String TRAN_TYPE_IN = "IN";
	/** 트랜잭션 유형 - 출고 */
	public static final String TRAN_TYPE_OUT = "OUT";
	/** 트랜잭션 유형 - 이동 출고 (출발지) */
	public static final String TRAN_TYPE_MOVE_OUT = "MOVE_OUT";
	/** 트랜잭션 유형 - 이동 입고 (목적지) */
	public static final String TRAN_TYPE_MOVE_IN = "MOVE_IN";
	/** 트랜잭션 유형 - 재고 조정 (증가) */
	public static final String TRAN_TYPE_ADJUST_PLUS = "ADJUST_PLUS";
	/** 트랜잭션 유형 - 재고 조정 (감소) */
	public static final String TRAN_TYPE_ADJUST_MINUS = "ADJUST_MINUS";
	/** 트랜잭션 유형 - 폐기 / 손실 */
	public static final String TRAN_TYPE_SCRAP = "SCRAP";
	/** 트랜잭션 유형 - 분할 (원본 차감) */
	public static final String TRAN_TYPE_SPLIT = "SPLIT";
	/** 트랜잭션 유형 - 분할 (신규 생성) */
	public static final String TRAN_TYPE_SPLIT_NEW = "SPLIT_NEW";
	/** 트랜잭션 유형 - 병합 (흡수) */
	public static final String TRAN_TYPE_MERGE = "MERGE";
	/** 트랜잭션 유형 - 병합 (소멸) */
	public static final String TRAN_TYPE_MERGE_OUT = "MERGE_OUT";
	/** 트랜잭션 유형 - 유통가공 차감 */
	public static final String TRAN_TYPE_VAS_OUT = "VAS_OUT";
	/** 트랜잭션 유형 - 반품 재입고 */
	public static final String TRAN_TYPE_RWA_RESTOCK = "RWA_RESTOCK";
	/** 트랜잭션 유형 - 실사 조정 (증가) */
	public static final String TRAN_TYPE_COUNT_PLUS = "COUNT_PLUS";
	/** 트랜잭션 유형 - 실사 조정 (감소) */
	public static final String TRAN_TYPE_COUNT_MINUS = "COUNT_MINUS";
	/** 트랜잭션 유형 - 재고 신규 생성 */
	public static final String TRAN_TYPE_NEW = "NEW";

	// TODO 입고 취소는 반품 출고 프로세스, 출고 취소는 반품 입고 프로세스로 대체할지 고민 필요
	/** 트랜잭션 유형 - 입고 취소 */
	public static final String TRAN_TYPE_IN_CANCEL = "IN_CANCEL";
	/** 트랜잭션 유형 - 출고 취소 */
	public static final String TRAN_TYPE_OUT_CANCEL = "OUT_CANCEL";

	// TODO 재고 홀드 프로세스는 제거 - 재고 홀드의 경우 입,출고 홀드된 로케이션 이동 처리로 대체 필요
	/** 트랜잭션 유형 - 홀드 (수량 변동 없음) */
	public static final String TRAN_TYPE_HOLD = "HOLD";
	/** 트랜잭션 유형 - 홀드 해제 (수량 변동 없음) */
	public static final String TRAN_TYPE_RELEASE_HOLD = "RELEASE_HOLD";

	/** 참조 문서 유형 - 입고 */
	public static final String REF_DOC_TYPE_RCV = "RCV";
	/** 참조 문서 유형 - 출고 */
	public static final String REF_DOC_TYPE_SHIP = "SHIP";
	/** 참조 문서 유형 - 유통가공 */
	public static final String REF_DOC_TYPE_VAS = "VAS";
	/** 참조 문서 유형 - 재고 실사 */
	public static final String REF_DOC_TYPE_COUNT = "COUNT";
	/** 참조 문서 유형 - 반품 */
	public static final String REF_DOC_TYPE_RWA = "RWA";

	/**
	 * 참조 문서 유형 - 재고 조정
	 * TODO 현재 프로세스 상 참조 문서가 없으나 이력 추적을 위해 별도로 이력 관리 테이블 추가할 지 고민 필요
	 * 이력 테이블을 별도 관리 안 한다면 최소 한 번의 트랜잭션 마다 하나의 고유 문서번호를 발급해야함
	 */
	public static final String REF_DOC_TYPE_ADJ = "ADJ";
	/**
	 * 참조 문서 유형 - 로케이션 이동
	 * TODO 현재 프로세스 상 참조 문서가 없으나 이력 추적을 위해 별도로 이력 관리 테이블 추가할 지 고민 필요
	 * 이력 테이블을 별도 관리 안 한다면 최소 한 번의 트랜잭션 마다 하나의 고유 문서번호를 발급해야함
	 */
	public static final String REF_DOC_TYPE_MOVE = "MOVE";
	/**
	 * 참조 문서 유형 - 폐기
	 * TODO 현재 프로세스 상 참조 문서가 없으나 폐기 이력 추적을 위해 별도로 이력 관리 테이블 추가할 지 고민 필요
	 * 이력 테이블을 별도 관리 안 한다면 최소 한 번의 트랜잭션 마다 하나의 고유 문서번호를 발급해야함
	 */
	public static final String REF_DOC_TYPE_SCRAP = "SCRAP";

	// TODO 창고간 이동 트랜잭션 (TRANSFER) 프로세스 추가 필요

	/**
	 * 재고 트랜잭션 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 재고 원장 ID - FK → inventories.id
	 */
	@Column(name = "inventory_id", nullable = false, length = 40)
	private String inventoryId;

	/**
	 * 재고 바코드 (비정규화, 조회 편의)
	 */
	@Column(name = "barcode", nullable = false, length = 50)
	private String barcode;

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
	 * 로케이션 코드 - 트랜잭션 발생 시점의 위치
	 */
	@Column(name = "loc_cd", nullable = false, length = 30)
	private String locCd;

	/**
	 * 이동 목적지 로케이션 코드 - MOVE_OUT / MOVE_IN 트랜잭션 전용
	 */
	@Column(name = "to_loc_cd", length = 30)
	private String toLocCd;

	/**
	 * Lot 번호
	 */
	@Column(name = "lot_no", length = 50)
	private String lotNo;

	/**
	 * 시리얼 번호
	 */
	@Column(name = "serial_no", length = 50)
	private String serialNo;

	/**
	 * 유통기한 (형식: YYYY-MM-DD)
	 */
	@Column(name = "expired_date", length = 10)
	private String expiredDate;

	/**
	 * 트랜잭션 유형 - TRAN_TYPE_* 상수 참조
	 */
	@Column(name = "tran_type", nullable = false, length = 20)
	private String tranType;

	/**
	 * 수불 방향 - IN(수량 증가) / OUT(수량 감소)
	 */
	@Column(name = "direction", nullable = false, length = 3)
	private String direction;

	/**
	 * 변경 수량 - 입고: 양수(+), 출고/차감: 음수(-), HOLD: 0
	 */
	@Column(name = "tran_qty", nullable = false)
	private BigDecimal tranQty;

	/**
	 * 변경 전 재고 수량
	 */
	@Column(name = "before_qty", nullable = false)
	private BigDecimal beforeQty;

	/**
	 * 변경 후 재고 수량 (= before_qty + tran_qty)
	 */
	@Column(name = "after_qty", nullable = false)
	private BigDecimal afterQty;

	/**
	 * 참조 문서 유형 - REF_DOC_TYPE_* 상수 참조 (RCV/RLS/ADJ/MOVE/VAS/COUNT/SCRAP/RWA)
	 */
	@Column(name = "ref_doc_type", length = 20)
	private String refDocType;

	/**
	 * 참조 문서 번호
	 */
	@Column(name = "ref_doc_no", length = 50)
	private String refDocNo;

	/**
	 * 참조 문서 라인 번호
	 */
	@Column(name = "ref_line_no", length = 20)
	private String refLineNo;

	/**
	 * 사유 코드 - ADJUST / SCRAP / HOLD 트랜잭션 시 필수
	 */
	@Column(name = "reason_cd", length = 30)
	private String reasonCd;

	/**
	 * 사유 설명
	 */
	@Column(name = "reason", length = 255)
	private String reason;

	/**
	 * 트랜잭션 발생일 (형식: YYYY-MM-DD) - 기간 조회 전용
	 */
	@Column(name = "tran_date", nullable = false, length = 10)
	private String tranDate;

	/**
	 * 트랜잭션 발생 일시 - 정렬 기준
	 */
	@Column(name = "tran_at", nullable = false)
	private Date tranAt;

	/**
	 * 작업자 ID
	 */
	@Column(name = "worker_id", length = 40)
	private String workerId;

	/**
	 * 처리 장비 / PDA 코드
	 */
	@Column(name = "device_cd", length = 30)
	private String deviceCd;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 500)
	private String remarks;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
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

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
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

	public String getTranType() {
		return tranType;
	}

	public void setTranType(String tranType) {
		this.tranType = tranType;
	}

	public String getDirection() {
		return direction;
	}

	public void setDirection(String direction) {
		this.direction = direction;
	}

	public BigDecimal getTranQty() {
		return tranQty;
	}

	public void setTranQty(BigDecimal tranQty) {
		this.tranQty = tranQty;
	}

	public BigDecimal getBeforeQty() {
		return beforeQty;
	}

	public void setBeforeQty(BigDecimal beforeQty) {
		this.beforeQty = beforeQty;
	}

	public BigDecimal getAfterQty() {
		return afterQty;
	}

	public void setAfterQty(BigDecimal afterQty) {
		this.afterQty = afterQty;
	}

	public String getRefDocType() {
		return refDocType;
	}

	public void setRefDocType(String refDocType) {
		this.refDocType = refDocType;
	}

	public String getRefDocNo() {
		return refDocNo;
	}

	public void setRefDocNo(String refDocNo) {
		this.refDocNo = refDocNo;
	}

	public String getRefLineNo() {
		return refLineNo;
	}

	public void setRefLineNo(String refLineNo) {
		this.refLineNo = refLineNo;
	}

	public String getReasonCd() {
		return reasonCd;
	}

	public void setReasonCd(String reasonCd) {
		this.reasonCd = reasonCd;
	}

	public String getReason() {
		return reason;
	}

	public void setReason(String reason) {
		this.reason = reason;
	}

	public String getTranDate() {
		return tranDate;
	}

	public void setTranDate(String tranDate) {
		this.tranDate = tranDate;
	}

	public Date getTranAt() {
		return tranAt;
	}

	public void setTranAt(Date tranAt) {
		this.tranAt = tranAt;
	}

	public String getWorkerId() {
		return workerId;
	}

	public void setWorkerId(String workerId) {
		this.workerId = workerId;
	}

	public String getDeviceCd() {
		return deviceCd;
	}

	public void setDeviceCd(String deviceCd) {
		this.deviceCd = deviceCd;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}
}
