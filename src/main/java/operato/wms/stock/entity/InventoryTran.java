package operato.wms.stock.entity;

import java.util.Date;

import operato.wms.base.entity.Location;
import operato.wms.base.entity.SKU;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.exception.server.ElidomValidationException;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

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
		@Index(name = "ix_inv_trn_6", columnList = "domain_id,worker_id,tran_date"),
		@Index(name = "ix_inv_trn_7", columnList = "domain_id,group_id")
})
public class InventoryTran extends xyz.elidom.orm.entity.basic.DomainCreateStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 1L;

	/** 수불 방향 - IN (수량 증가) */
	public static final String DIRECTION_IN = "IN";
	/** 수불 방향 - OUT (수량 감소) */
	public static final String DIRECTION_OUT = "OUT";
	/** 수불 방향 - NONE (수량 변경 없음) */
	public static final String DIRECTION_NA = "N/A";

	/** 트랜잭션 유형 - 재고 신규 생성 */
	public static final String TRAN_TYPE_NEW = "NEW";
	/** 트랜잭션 유형 - 입고 */
	public static final String TRAN_TYPE_IN = "IN";
	/** 트랜잭션 유형 - 출고 */
	public static final String TRAN_TYPE_OUT = "OUT";
	/** 트랜잭션 유형 - 이동 출고 (출발지) */
	public static final String TRAN_TYPE_MOVE_OUT = "MOVE_OUT";
	/** 트랜잭션 유형 - 이동 입고 (목적지) */
	public static final String TRAN_TYPE_MOVE_IN = "MOVE_IN";
	/** 트랜잭션 유형 - 재고 조정 */
	public static final String TRAN_TYPE_ADJUST = "ADJUST";
	/** 트랜잭션 유형 - 폐기 처리 */
	public static final String TRAN_TYPE_SCRAP = "SCRAP";
	/** 트랜잭션 유형 - 분할 (원본 차감) */
	public static final String TRAN_TYPE_SPLIT = "SPLIT";
	/** 트랜잭션 유형 - 분할 (신규 생성) */
	public static final String TRAN_TYPE_SPLIT_NEW = "SPLIT_NEW";
	/** 트랜잭션 유형 - 병합 (흡수) */
	public static final String TRAN_TYPE_MERGE = "MERGE";
	/** 트랜잭션 유형 - 병합 (소멸) */
	public static final String TRAN_TYPE_MERGE_OUT = "MERGE_OUT";
	/** 트랜잭션 유형 - 유통가공 조립 후 입고 */
	public static final String TRAN_TYPE_VAS_IN = "VAS_IN";
	/** 트랜잭션 유형 - 유통가공 조립시 구성품 차감 */
	public static final String TRAN_TYPE_VAS_OUT = "VAS_OUT";
	/** 트랜잭션 유형 - 반품 재입고 */
	public static final String TRAN_TYPE_RWA_RESTOCK = "RWA_RESTOCK";
	/** 트랜잭션 유형 - 실사 조정 */
	public static final String TRAN_TYPE_COUNT = "COUNT";

	/** 트랜잭션 유형 - 재고 할당 */
	public static final String TRAN_TYPE_ALLOCATE = "ALLOCATE";
	/** 트랜잭션 유형 - 재고 할당 해제 */
	public static final String TRAN_TYPE_DEALLOCATE = "DEALLOCATE";

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
	 * 상품명
	 */
	@Column(name = "sku_nm", length = 200)
	private String skuNm;

	/**
	 * 로케이션 코드 - 트랜잭션 발생 시점의 위치
	 */
	@Column(name = "loc_cd", length = 30)
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
	private Double tranQty;

	/**
	 * 변경 전 재고 수량
	 */
	@Column(name = "before_qty", nullable = false)
	private Double beforeQty;

	/**
	 * 변경 후 재고 수량 (= before_qty + tran_qty)
	 */
	@Column(name = "after_qty", nullable = false)
	private Double afterQty;

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

	/**
	 * 이동 작업 그룹 ID — 하나의 이동 작업(moveInventory)에서 발생하는
	 * MOVE_OUT / MOVE_IN / SPLIT / SPLIT_NEW / MERGE / MERGE_OUT 트랜잭션을 묶는 식별자
	 */
	@Column(name = "group_id", length = 40)
	private String groupId;

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

	public String getSkuNm() {
		return skuNm;
	}

	public void setSkuNm(String skuNm) {
		this.skuNm = skuNm;
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

	public Double getTranQty() {
		return tranQty;
	}

	public void setTranQty(Double tranQty) {
		this.tranQty = tranQty;
	}

	public Double getBeforeQty() {
		return beforeQty;
	}

	public void setBeforeQty(Double beforeQty) {
		this.beforeQty = beforeQty;
	}

	public Double getAfterQty() {
		return afterQty;
	}

	public void setAfterQty(Double afterQty) {
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

	public String getGroupId() {
		return groupId;
	}

	public void setGroupId(String groupId) {
		this.groupId = groupId;
	}

	@Override
	public void beforeCreate() {
		super.beforeCreate();

		if (ValueUtil.isEmpty(this.tranDate)) {
			this.tranDate = DateUtil.todayStr();
		}

		if (this.tranAt == null) {
			this.tranAt = new Date();
		}
	}

	/**
	 * 재고 생성 트랜잭션 생성 (각종 Validation은 끝난 상태에서 호출되는 Method)
	 * 
	 * @param location
	 * @param sku
	 * @return
	 */
	public Inventory createNewTransaction(Location location, SKU sku) {
		// 입력값으로 재고 객체 생성
		Inventory inventory = ValueUtil.populate(this, new Inventory(), "domainId", "whCd", "comCd", "skuCd",
				"lotNo", "serialNo", "expiredDate", "remarks");

		// 사용자가 입력한 정보대로 재고 정보 생성
		inventory.setInvQty(this.getTranQty());
		inventory.setLocCd(location.getLocCd());
		inventory.setSkuNm(sku.getSkuNm());
		inventory.setSkuBcd(sku.getSkuBarcd());
		inventory.setVendCd(sku.getVendCd());
		inventory.setLastTranCd(Inventory.TRANSACTION_NEW);
		inventory.setStatus(Inventory.STATUS_STORED);
		BeanUtil.get(IQueryManager.class).insert(inventory);

		// 재고 생성 트랜잭션 생성
		this.inventoryId = inventory.getId();
		this.barcode = inventory.getBarcode();
		this.tranType = InventoryTran.TRAN_TYPE_NEW;
		this.direction = InventoryTran.DIRECTION_IN;
		this.beforeQty = 0.0;
		this.afterQty = this.tranQty;
		this.toLocCd = inventory.getLocCd();
		this.locCd = null;
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getCreatorId();
		this.skuNm = sku.getSkuNm();
		this.createTransaction();

		// 재고 정보 반환
		return inventory;
	}

	/**
	 * 세트상품 조립 후 완성품 재고 트랜잭션 생성 혹은 세트상품 해제 후 구성품 재고 생성 트랜잭션 생성
	 * (각종 Validation은 끝난 상태에서 호출되는 Method)
	 * 
	 * @param location
	 * @param sku
	 * @return
	 */
	public Inventory createVasInTransaction(Location location, SKU sku) {
		// 입력값으로 재고 객체 생성
		Inventory inventory = ValueUtil.populate(this, new Inventory(), "domainId", "whCd", "comCd", "skuCd",
				"lotNo", "serialNo", "expiredDate", "remarks");

		// 사용자가 입력한 정보대로 재고 정보 생성
		inventory.setInvQty(this.getTranQty());
		inventory.setLocCd(location.getLocCd());
		inventory.setSkuNm(sku.getSkuNm());
		inventory.setSkuBcd(sku.getSkuBarcd());
		inventory.setVendCd(sku.getVendCd());
		inventory.setLastTranCd(InventoryTran.TRAN_TYPE_VAS_IN);
		inventory.setStatus(Inventory.STATUS_STORED);
		inventory.setRcvNo(this.getRefDocNo());
		BeanUtil.get(IQueryManager.class).insert(inventory);

		// 재고 생성 트랜잭션 생성
		this.inventoryId = inventory.getId();
		this.barcode = inventory.getBarcode();
		this.tranType = InventoryTran.TRAN_TYPE_VAS_IN;
		this.direction = InventoryTran.DIRECTION_IN;
		this.beforeQty = 0.0;
		this.afterQty = this.tranQty;
		this.toLocCd = inventory.getLocCd();
		this.locCd = null;
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getCreatorId();
		if (this.refDocType == null) {
			this.refDocType = InventoryTran.REF_DOC_TYPE_VAS;
		}
		this.createTransaction();

		// 재고 정보 반환
		return inventory;
	}

	/**
	 * 조정 트랜잭션 생성
	 * (각종 Validation은 끝난 상태에서 호출되는 Method)
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createAdjustTransaction(Inventory inventory) {
		// 재고 조정 전 재고 상태 저장
		this.beforeQty = inventory.getInvQty();
		this.afterQty = this.tranQty;
		this.tranQty = Math.abs(this.afterQty - this.beforeQty);
		this.direction = this.beforeQty > this.afterQty ? InventoryTran.DIRECTION_OUT : InventoryTran.DIRECTION_IN;

		// 재고 조정 처리
		if (ValueUtil.isNotEmpty(this.expiredDate)) {
			inventory.setExpiredDate(this.expiredDate);
		}

		if (ValueUtil.isNotEmpty(this.lotNo)) {
			inventory.setLotNo(this.lotNo);
		}

		inventory.setInvQty(this.afterQty);
		inventory.setRemarks(this.remarks);
		inventory.setLastTranCd(Inventory.TRANSACTION_ADJUST);
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 재고 조정 트랜잭션 생성
		this.inventoryId = inventory.getId();
		this.tranType = InventoryTran.TRAN_TYPE_ADJUST;
		this.toLocCd = inventory.getLocCd();
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getCreatorId();
		this.createTransaction();

		// 재고 정보 반환
		return inventory;
	}

	/**
	 * 세트상품 해체 후 구성품 재고 차감 트랜잭션 생성
	 * (각종 Validation은 끝난 상태에서 호출되는 Method)
	 * 
	 * @param inventory
	 * @param consumeQty
	 * @param releaseQty
	 * @return
	 */
	public Inventory createVasConsumeAllocatedTransaction(Inventory inventory, double consumeQty, double releaseQty) {
		// 재고 차감 이전 수량
		double invQty = inventory.getInvQty() != null ? inventory.getInvQty() : 0.0;
		double afterQty = Math.max(invQty - consumeQty, 0.0);
		double reservedQty = inventory.getReservedQty() != null ? inventory.getReservedQty() : 0.0;

		if (consumeQty > invQty + 0.0001) {
			throw new ElidomValidationException(
					"할당 원재고 수량이 부족합니다. SKU: " + inventory.getSkuCd() +
							", 재고: " + invQty + ", 차감: " + consumeQty);
		}

		inventory.setInvQty(afterQty);
		inventory.setReservedQty(Math.max(reservedQty - releaseQty, 0.0));
		inventory.setLastTranCd(Inventory.TRANSACTION_VAS_OUT);
		inventory.setUpdatedAt(new Date());
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 세트 상품에 대한 구성품 재고 차감 트랜잭션 생성
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd", "skuCd", "skuNm",
				"lotNo", "serialNo", "expiredDate", "remarks");
		this.inventoryId = inventory.getId();
		this.tranType = InventoryTran.TRAN_TYPE_VAS_OUT;
		this.direction = InventoryTran.DIRECTION_OUT;
		this.tranQty = consumeQty;
		this.beforeQty = invQty;
		this.afterQty = afterQty;
		this.locCd = inventory.getLocCd();
		this.toLocCd = inventory.getLocCd();
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 재고 정보 반환
		return inventory;
	}

	/**
	 * VAS 자재 할당 재고 소비 트랜잭션 생성 (피킹분/손실분 분리)
	 *
	 * alloc_qty 전량(pickedQty + lossQty)을 재고에서 차감하며,
	 * 정상 소비분은 VAS_OUT, 현물 부족으로 미피킹된 잔량은 ADJUST 트랜잭션으로 각각 남긴다.
	 *
	 * @param inventory  할당 원재고
	 * @param pickedQty  정상 소비 수량 (VAS_OUT)
	 * @param lossQty    손실 청산 수량 (ADJUST)
	 * @param releaseQty 예약 해소 수량
	 * @return 갱신된 재고
	 */
	public Inventory createVasConsumeWithLossTransaction(Inventory inventory, double pickedQty, double lossQty,
			double releaseQty) {
		double invQty = inventory.getInvQty() != null ? inventory.getInvQty() : 0.0;
		double totalConsume = pickedQty + lossQty;
		double reservedQty = inventory.getReservedQty() != null ? inventory.getReservedQty() : 0.0;

		if (totalConsume > invQty + 0.0001) {
			throw new ElidomValidationException(
					"할당 원재고 수량이 부족합니다. SKU: " + inventory.getSkuCd() +
							", 재고: " + invQty + ", 차감: " + totalConsume);
		}

		double afterQty = Math.max(invQty - totalConsume, 0.0);

		// 1. 재고/예약 수량 갱신 (alloc 전량 차감)
		inventory.setInvQty(afterQty);
		inventory.setReservedQty(Math.max(reservedQty - releaseQty, 0.0));
		inventory.setLastTranCd(Inventory.TRANSACTION_VAS_OUT);
		inventory.setUpdatedAt(new Date());
		BeanUtil.get(IQueryManager.class).update(inventory);

		String today = DateUtil.todayStr();
		Date nowAt = new Date();
		double runningBefore = invQty;

		// 2. 정상 소비 트랜잭션 (VAS_OUT)
		if (pickedQty > 0.0001) {
			InventoryTran outTran = ValueUtil.populate(inventory, new InventoryTran(),
					"domainId", "barcode", "whCd", "comCd", "skuCd", "skuNm", "lotNo", "serialNo", "expiredDate",
					"remarks");
			outTran.id = null;
			outTran.inventoryId = inventory.getId();
			outTran.tranType = InventoryTran.TRAN_TYPE_VAS_OUT;
			outTran.direction = InventoryTran.DIRECTION_OUT;
			outTran.tranQty = pickedQty;
			outTran.beforeQty = runningBefore;
			runningBefore -= pickedQty;
			outTran.afterQty = runningBefore;
			outTran.locCd = inventory.getLocCd();
			outTran.toLocCd = inventory.getLocCd();
			outTran.tranDate = today;
			outTran.tranAt = nowAt;
			outTran.workerId = inventory.getUpdaterId();
			outTran.createTransaction();
		}

		// 3. 손실 청산 트랜잭션 (ADJUST) — 현물 부족으로 미피킹된 잔량
		if (lossQty > 0.0001) {
			InventoryTran adjTran = ValueUtil.populate(inventory, new InventoryTran(),
					"domainId", "barcode", "whCd", "comCd", "skuCd", "skuNm", "lotNo", "serialNo", "expiredDate",
					"remarks");
			adjTran.id = null;
			adjTran.inventoryId = inventory.getId();
			adjTran.tranType = InventoryTran.TRAN_TYPE_ADJUST;
			adjTran.direction = InventoryTran.DIRECTION_OUT;
			adjTran.tranQty = lossQty;
			adjTran.beforeQty = runningBefore;
			runningBefore -= lossQty;
			adjTran.afterQty = runningBefore;
			adjTran.locCd = inventory.getLocCd();
			adjTran.toLocCd = inventory.getLocCd();
			adjTran.tranDate = today;
			adjTran.tranAt = nowAt;
			adjTran.workerId = inventory.getUpdaterId();
			adjTran.reason = "현물 부족 손실 청산 (VAS 자재피킹)";
			adjTran.createTransaction();
		}

		return inventory;
	}

	/**
	 * 로케이션으로 MOVE-IN 트랜잭션 이력 생성
	 * 
	 * @param inventory
	 * @param fromLocCd
	 * @param toLocCd
	 * @param moveInQty
	 * @param groupId
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public static InventoryTran createMoveInTransactionHistory(Inventory inventory, String fromLocCd, String toLocCd,
			double moveInQty, String groupId, String reasonCd, String reason, String remarks) {
		InventoryTran moveInTran = ValueUtil.populate(inventory, new InventoryTran());
		moveInTran.setId(null);
		moveInTran.setInventoryId(inventory.getId());
		moveInTran.setTranType(InventoryTran.TRAN_TYPE_MOVE_IN);
		moveInTran.setDirection(InventoryTran.DIRECTION_IN);
		moveInTran.setRefDocType(InventoryTran.REF_DOC_TYPE_MOVE);
		moveInTran.setBeforeQty(0.0);
		moveInTran.setGroupId(groupId);
		moveInTran.setTranQty(moveInQty);
		moveInTran.setAfterQty(moveInQty);
		moveInTran.setLocCd(fromLocCd);
		moveInTran.setToLocCd(toLocCd);
		moveInTran.setReasonCd(reasonCd);
		moveInTran.setReason(reason);
		moveInTran.setRemarks(remarks);
		moveInTran.setWorkerId(inventory.getUpdaterId());
		moveInTran.setCreatorId(inventory.getUpdaterId());
		moveInTran.setCreatedAt(null);
		BeanUtil.get(IQueryManager.class).insert(moveInTran);
		return moveInTran;
	}

	/**
	 * 로케이션으로 MOVE-OUT 트랜잭션 이력 생성
	 * 
	 * @param inventory
	 * @param fromLocCd
	 * @param toLocCd
	 * @param oriQty
	 * @param moveOutQty
	 * @param groupId
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public static InventoryTran createMoveOutTransactionHistory(Inventory inventory, String fromLocCd, String toLocCd,
			double moveOutQty, String groupId, String reasonCd, String reason, String remarks) {
		InventoryTran moveOutTran = ValueUtil.populate(inventory, new InventoryTran(),
				"domainId", "barcode", "whCd", "comCd", "skuCd", "skuNm", "lotNo", "serialNo", "expiredDate");
		moveOutTran.setId(null);
		moveOutTran.setInventoryId(inventory.getId());
		moveOutTran.setTranType(InventoryTran.TRAN_TYPE_MOVE_OUT);
		moveOutTran.setDirection(InventoryTran.DIRECTION_OUT);
		moveOutTran.setRefDocType(InventoryTran.REF_DOC_TYPE_MOVE);
		moveOutTran.setGroupId(groupId);
		moveOutTran.setTranQty(moveOutQty);
		moveOutTran.setBeforeQty(moveOutQty);
		moveOutTran.setAfterQty(0.0);
		moveOutTran.setLocCd(fromLocCd);
		moveOutTran.setToLocCd(toLocCd);
		moveOutTran.setReasonCd(reasonCd);
		moveOutTran.setReason(reason);
		moveOutTran.setRemarks(remarks);
		moveOutTran.setWorkerId(inventory.getUpdaterId());
		moveOutTran.setCreatorId(inventory.getUpdaterId());
		moveOutTran.setCreatedAt(null);
		BeanUtil.get(IQueryManager.class).insert(moveOutTran);
		return moveOutTran;
	}

	/**
	 * 재고 분할 트랜잭션 이력 생성
	 * 
	 * @param inventory
	 * @param splitQty
	 * @param groupId
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public static InventoryTran createSplitTransactionHistory(Inventory inventory,
			double splitQty, String groupId, String reasonCd, String reason, String remarks) {
		InventoryTran splitTran = ValueUtil.populate(inventory, new InventoryTran(),
				"domainId", "barcode", "whCd", "comCd", "skuCd", "skuNm", "lotNo", "serialNo", "expiredDate");
		splitTran.setId(null);
		splitTran.setInventoryId(inventory.getId());
		splitTran.setTranType(InventoryTran.TRAN_TYPE_SPLIT);
		splitTran.setDirection(InventoryTran.DIRECTION_OUT);
		splitTran.setRefDocType(InventoryTran.REF_DOC_TYPE_MOVE);
		splitTran.setGroupId(groupId);
		splitTran.setTranQty(splitQty);
		splitTran.setBeforeQty(inventory.getInvQty() + splitQty);
		splitTran.setAfterQty(inventory.getInvQty());
		splitTran.setLocCd(inventory.getLocCd());
		splitTran.setToLocCd(inventory.getLocCd());
		splitTran.setReasonCd(reasonCd);
		splitTran.setReason(reason);
		splitTran.setRemarks(remarks);
		splitTran.setWorkerId(inventory.getUpdaterId());
		splitTran.setCreatorId(inventory.getUpdaterId());
		splitTran.setCreatedAt(null);
		BeanUtil.get(IQueryManager.class).insert(splitTran);
		return splitTran;
	}

	/**
	 * 재고 분할 후 생성 된 재고의 MOVE-OUT 트랜잭션 이력 생성
	 * 
	 * @param inventory
	 * @param fromLocCd
	 * @param splitQty
	 * @param groupId
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public static InventoryTran createSplitMoveOutTransactionHistory(Inventory inventory,
			String fromLocCd, double splitQty, String groupId, String reasonCd, String reason, String remarks) {
		InventoryTran splitNewTran = ValueUtil.populate(inventory, new InventoryTran(),
				"domainId", "barcode", "whCd", "comCd", "skuCd", "skuNm", "lotNo", "serialNo", "expiredDate");
		splitNewTran.setId(null);
		splitNewTran.setInventoryId(inventory.getId());
		splitNewTran.setTranType(InventoryTran.TRAN_TYPE_MOVE_OUT);
		splitNewTran.setDirection(InventoryTran.DIRECTION_OUT);
		splitNewTran.setRefDocType(InventoryTran.REF_DOC_TYPE_MOVE);
		splitNewTran.setGroupId(groupId);
		splitNewTran.setTranQty(splitQty);
		splitNewTran.setBeforeQty(splitQty);
		splitNewTran.setAfterQty(0.0);
		splitNewTran.setLocCd(fromLocCd);
		splitNewTran.setToLocCd(inventory.getLocCd());
		splitNewTran.setReasonCd(reasonCd);
		splitNewTran.setReason(reason);
		splitNewTran.setRemarks(remarks);
		splitNewTran.setWorkerId(inventory.getUpdaterId());
		splitNewTran.setCreatorId(inventory.getUpdaterId());
		splitNewTran.setCreatedAt(null);
		BeanUtil.get(IQueryManager.class).insert(splitNewTran);
		return splitNewTran;
	}

	/**
	 * 재고 병합 처리 이후 재고 병합 트랜잭션 이력 생성
	 * 
	 * @param inventory
	 * @param mergedQty
	 * @param groupId
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public static InventoryTran createMergeTransactionHistory(Inventory inventory, double mergedQty, String groupId,
			String reasonCd, String reason, String remarks) {
		InventoryTran mergedTran = ValueUtil.populate(inventory, new InventoryTran());
		mergedTran.setId(null);
		mergedTran.setBeforeQty(inventory.getInvQty() - mergedQty);
		mergedTran.setTranQty(mergedQty);
		mergedTran.setAfterQty(inventory.getInvQty());
		mergedTran.setLocCd(inventory.getLocCd());
		mergedTran.setToLocCd(inventory.getLocCd());
		mergedTran.setInventoryId(inventory.getId());
		mergedTran.setDirection(InventoryTran.DIRECTION_IN);
		mergedTran.setTranType(InventoryTran.TRAN_TYPE_MERGE);
		mergedTran.setRefDocType(InventoryTran.REF_DOC_TYPE_MOVE);
		mergedTran.setGroupId(groupId);
		mergedTran.setReasonCd(reasonCd);
		mergedTran.setReason(reason);
		mergedTran.setRemarks(remarks);
		mergedTran.setWorkerId(inventory.getUpdaterId());
		mergedTran.setCreatorId(inventory.getUpdaterId());
		mergedTran.setCreatedAt(null);
		BeanUtil.get(IQueryManager.class).insert(mergedTran);
		return mergedTran;
	}

	/**
	 * 병합 처리된 이후 소진된 트랜잭션 이력 생성
	 * 
	 * @param mergedOutInv
	 * @param mergeOutQty
	 * @param groupId
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public static InventoryTran createMergedOutTransactionHistory(Inventory mergedOutInv, double mergeOutQty,
			String groupId, String reasonCd, String reason, String remarks) {
		InventoryTran mergedOutTran = ValueUtil.populate(mergedOutInv, new InventoryTran());
		mergedOutTran.setId(null);
		mergedOutTran.setInventoryId(mergedOutInv.getId());
		mergedOutTran.setBeforeQty(mergeOutQty);
		mergedOutTran.setTranQty(mergeOutQty);
		mergedOutTran.setAfterQty(0.0);
		mergedOutTran.setLocCd(mergedOutInv.getLocCd());
		mergedOutTran.setToLocCd(mergedOutInv.getLocCd());
		mergedOutTran.setDirection(InventoryTran.DIRECTION_OUT);
		mergedOutTran.setTranType(InventoryTran.TRAN_TYPE_MERGE_OUT);
		mergedOutTran.setRefDocType(InventoryTran.REF_DOC_TYPE_MOVE);
		mergedOutTran.setGroupId(groupId);
		mergedOutTran.setReasonCd(reasonCd);
		mergedOutTran.setReason(reason);
		mergedOutTran.setRemarks(remarks);
		mergedOutTran.setWorkerId(mergedOutInv.getUpdaterId());
		mergedOutTran.setCreatorId(mergedOutInv.getUpdaterId());
		mergedOutTran.setCreatedAt(null);
		BeanUtil.get(IQueryManager.class).insert(mergedOutTran);
		return mergedOutTran;
	}

	/**
	 * 폐기 트랜잭션 생성
	 * (각종 Validation은 끝난 상태에서 호출되는 Method)
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createScrapTransaction(Inventory inventory) {
		// 재고 트랜잭션 수량 설정
		this.beforeQty = inventory.getInvQty();
		this.tranQty = inventory.getInvQty();
		this.afterQty = 0.0;

		// 기본 재고 정보 복사
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "locCd", "lotNo", "serialNo", "expiredDate");

		// 재고 폐기 처리
		inventory.setStatus(Inventory.STATUS_EMPTY);
		inventory.setLastTranCd(Inventory.TRANSACTION_SCRAP);
		inventory.setClosedAt(DateUtil.currentTimeStr());
		inventory.setDelFlag(true);
		inventory.setRemarks(this.remarks);
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 재고 트랜잭션 정보 생성
		this.inventoryId = inventory.getId();
		this.tranType = InventoryTran.TRAN_TYPE_SCRAP;
		this.direction = InventoryTran.DIRECTION_OUT;
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 재고 리턴
		return inventory;
	}

	/**
	 * 홀드 트랜잭션 생성
	 * (각종 Validation은 끝난 상태에서 호출되는 Method)
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createHoldTransaction(Inventory inventory) {
		// 재고 홀드 처리
		inventory.setStatus(Inventory.STATUS_LOCK);
		inventory.setLastTranCd(Inventory.TRANSACTION_HOLD);
		inventory.setRemarks(this.remarks);
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 기본 재고 정보 복사
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "locCd", "lotNo", "serialNo", "expiredDate");

		// 재고 홀드 트랜잭션 생성
		this.beforeQty = inventory.getInvQty();
		this.tranQty = 0.0;
		this.afterQty = inventory.getInvQty();
		this.inventoryId = inventory.getId();
		this.direction = InventoryTran.DIRECTION_NA;
		this.tranType = InventoryTran.TRAN_TYPE_HOLD;
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 재고 리턴
		return inventory;
	}

	/**
	 * 홀드 해제 트랜잭션 생성
	 * (각종 Validation은 끝난 상태에서 호출되는 Method)
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createReleaseHoldTransaction(Inventory inventory) {
		// 재고 홀드 처리
		inventory.setStatus(Inventory.STATUS_STORED);
		inventory.setLastTranCd(Inventory.TRANSACTION_RELEASE_HOLD);
		inventory.setRemarks(this.remarks);
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 기본 재고 정보 복사
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "locCd", "lotNo", "serialNo", "expiredDate");

		// 재고 홀드 트랜잭션 생성
		this.beforeQty = inventory.getInvQty();
		this.tranQty = 0.0;
		this.afterQty = inventory.getInvQty();
		this.inventoryId = inventory.getId();
		this.direction = InventoryTran.DIRECTION_NA;
		this.tranType = InventoryTran.TRAN_TYPE_RELEASE_HOLD;
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 재고 리턴
		return inventory;
	}

	/**
	 * 입고 트랜잭션 생성
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createReceiveTransaction(Inventory inventory) {
		// 1. 트랜잭션 수량 정보 설정
		this.beforeQty = 0.0;
		this.tranQty = inventory.getInvQty();
		this.afterQty = inventory.getInvQty();

		// 2. 재고 입고 처리
		inventory.setInvQty(afterQty);
		inventory.setLastTranCd(Inventory.TRANSACTION_IN);
		inventory.setStatus(Inventory.STATUS_STORED);
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 3. 재고 트랜잭션 이력 추가
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "lotNo", "serialNo", "expiredDate");

		this.inventoryId = inventory.getId();
		this.toLocCd = inventory.getLocCd();
		this.tranType = InventoryTran.TRAN_TYPE_IN;
		this.direction = InventoryTran.DIRECTION_IN;
		this.refDocType = InventoryTran.REF_DOC_TYPE_RCV;
		// this.refDocNo = inventory.getRcvNo();
		// this.refLineNo = inventory.getRcvSeq() == null ? null :
		// ValueUtil.toString(inventory.getRcvSeq());
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 4. 재고 리턴
		return inventory;
	}

	/**
	 * 출고 트랜잭션 생성
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createShipmentTransaction(Inventory inventory) {
		// 1. 트랜잭션 수량 설정
		this.beforeQty = inventory.getInvQty();
		this.afterQty = this.beforeQty - this.tranQty;
		this.afterQty = this.afterQty < 0 ? 0.0 : this.afterQty;
		double afterReservedQty = inventory.getReservedQty() - tranQty;
		afterReservedQty = afterReservedQty < 0 ? 0.0 : afterReservedQty;

		// 2. 재고 출고 처리
		inventory.setInvQty(this.afterQty);
		inventory.setReservedQty(afterReservedQty);
		inventory.setLastTranCd(Inventory.TRANSACTION_OUT);
		inventory.setRlsOrdNo(this.refDocNo);
		inventory.setUpdatedAt(new Date());
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 3. 재고 기본 정보 복사
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "locCd", "lotNo", "serialNo", "expiredDate");

		// 4. 재고 트랜잭션 이력 추가
		this.inventoryId = inventory.getId();
		this.toLocCd = inventory.getLocCd();
		this.tranType = InventoryTran.TRAN_TYPE_OUT;
		this.direction = InventoryTran.DIRECTION_OUT;
		this.refDocType = InventoryTran.REF_DOC_TYPE_SHIP;
		// this.refDocNo = inventory.getRlsOrdNo();
		// this.refLineNo = inventory.getRlsLineNo() == null ? null :
		// ValueUtil.toString(inventory.getRlsLineNo());
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 5. 재고 리턴
		return inventory;
	}

	/**
	 * 입고 취소 트랜잭션 생성
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createCancelReceiveTransaction(Inventory inventory) {
		// 1. 트랜잭션 수량 정보 설정
		this.beforeQty = 0.0;
		this.tranQty = inventory.getInvQty();
		this.afterQty = 0.0;

		// 2. 재고 입고 처리
		inventory.setInvQty(afterQty);
		inventory.setLastTranCd(InventoryTran.TRAN_TYPE_IN_CANCEL);
		inventory.setStatus(Inventory.STATUS_EMPTY);
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 3. 트랜잭션 정보 설정
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "lotNo", "serialNo", "expiredDate");

		this.inventoryId = inventory.getId();
		this.toLocCd = inventory.getLocCd();
		this.tranType = InventoryTran.TRAN_TYPE_IN_CANCEL;
		this.direction = InventoryTran.DIRECTION_OUT;
		this.refDocType = InventoryTran.REF_DOC_TYPE_RCV;
		// this.refDocNo = inventory.getRcvNo();
		// this.refLineNo = inventory.getRcvSeq() == null ? null :
		// ValueUtil.toString(inventory.getRcvSeq());
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 4. 재고 리턴
		return inventory;
	}

	/**
	 * 출고 취소 트랜잭션 생성
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createCancelShipmentTransaction(Inventory inventory) {
		// 1. 트랜잭션 수량 설정
		this.beforeQty = inventory.getInvQty();
		this.afterQty = this.beforeQty + this.tranQty;
		this.afterQty = this.afterQty < 0 ? 0.0 : this.afterQty;
		double afterReservedQty = inventory.getReservedQty() + tranQty;
		afterReservedQty = afterReservedQty < 0 ? 0.0 : afterReservedQty;
		this.refDocType = InventoryTran.REF_DOC_TYPE_SHIP;
		this.refDocNo = inventory.getRlsOrdNo();
		this.refLineNo = inventory.getRlsLineNo() == null ? null : ValueUtil.toString(inventory.getRlsLineNo());

		// 2. 재고 출고 처리
		inventory.setInvQty(this.afterQty);
		inventory.setReservedQty(afterReservedQty);
		inventory.setLastTranCd(InventoryTran.TRAN_TYPE_OUT_CANCEL);
		inventory.setRlsOrdNo(null);
		inventory.setStatus(InventoryTran.TRAN_TYPE_OUT_CANCEL);
		inventory.setUpdatedAt(new Date());
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 3. 재고 기본 정보 복사
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "locCd", "lotNo", "serialNo", "expiredDate");

		// 4. 재고 트랜잭션 이력 추가
		this.inventoryId = inventory.getId();
		this.toLocCd = inventory.getLocCd();
		this.tranType = InventoryTran.TRAN_TYPE_OUT_CANCEL;
		this.direction = InventoryTran.DIRECTION_IN;
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 5. 재고 리턴
		return inventory;
	}

	/**
	 * 반품 재입고 트랜잭션 처리
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createRestockByRwaTransaction(Inventory inventory) {
		// 1. 트랜잭션 수량 정보 설정
		this.beforeQty = 0.0;
		this.tranQty = inventory.getInvQty();
		this.afterQty = inventory.getInvQty();

		// 2. 재고 입고 처리
		inventory.setLastTranCd(Inventory.TRANSACTION_RWA_RESTOCK);
		inventory.setStatus(Inventory.STATUS_STORED);
		inventory.setReceivedAt(DateUtil.currentTimeStr());
		BeanUtil.get(IQueryManager.class).insert(inventory);

		// 3. 재고 트랜잭션 이력 추가
		ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
				"skuCd", "skuNm", "lotNo", "serialNo", "expiredDate");

		this.inventoryId = inventory.getId();
		this.toLocCd = inventory.getLocCd();
		this.tranType = InventoryTran.TRAN_TYPE_RWA_RESTOCK;
		this.direction = InventoryTran.DIRECTION_IN;
		this.refDocType = InventoryTran.REF_DOC_TYPE_RWA;
		this.refDocNo = inventory.getRcvNo();
		this.refLineNo = ValueUtil.toString(inventory.getRcvSeq());
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getUpdaterId();
		this.createTransaction();

		// 4. 재고 리턴
		return inventory;
	}

	/**
	 * 실사 트랜잭션 처리
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createCountTransaction(Inventory inventory) {
		// 재고 실사 전 재고 상태 저장
		this.beforeQty = inventory.getInvQty();
		this.afterQty = this.tranQty;
		this.tranQty = Math.abs(this.afterQty - this.beforeQty);
		this.direction = this.beforeQty > this.afterQty ? InventoryTran.DIRECTION_OUT : InventoryTran.DIRECTION_IN;

		// 재고 실사 처리
		inventory.setInvQty(this.afterQty);
		inventory.setRemarks(this.remarks);
		inventory.setLastTranCd(Inventory.TRANSACTION_COUNT);
		BeanUtil.get(IQueryManager.class).update(inventory);

		// 재고 실사 트랜잭션 생성
		this.inventoryId = inventory.getId();
		this.tranType = InventoryTran.TRAN_TYPE_COUNT;
		this.toLocCd = inventory.getLocCd();
		this.tranDate = DateUtil.todayStr();
		this.tranAt = new Date();
		this.workerId = inventory.getCreatorId();
		this.createTransaction();

		// 재고 실사 반환
		return inventory;
	}

	/**
	 * 할당 트랜잭션 처리
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createAllocateTransaction(Inventory inventory) {
		// 1. 재고 할당 수량 설정
		double oriReservedQty = ValueUtil.toDouble(inventory.getReservedQty(), 0.0);
		double newReservedQty = oriReservedQty + this.tranQty;

		// 2. 재고 할당 처리
		inventory.setLastTranCd(Inventory.TRANSACTION_ALLOCATE);
		inventory.setReservedQty(newReservedQty);
		BeanUtil.get(IQueryManager.class).update(inventory, "lastTranCd", "reservedQty", "updatedAt", "updaterId");

		// 3. 재고 트랜잭션 정보 생성
		/*
		 * this.beforeQty = oriReservedQty;
		 * this.afterQty = newReservedQty;
		 * ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
		 * "skuCd", "skuNm", "locCd", "lotNo",
		 * "serialNo", "expiredDate");
		 * 
		 * this.inventoryId = inventory.getId();
		 * this.toLocCd = inventory.getLocCd();
		 * this.tranType = InventoryTran.TRAN_TYPE_ALLOCATE;
		 * this.direction = InventoryTran.DIRECTION_NA;
		 * this.tranDate = DateUtil.todayStr();
		 * this.tranAt = new Date();
		 * this.workerId = inventory.getUpdaterId();
		 * this.createTransaction();
		 */

		// 4. 재고 리턴
		return inventory;
	}

	/**
	 * 할당 해제 트랜잭션 처리
	 * 
	 * @param inventory
	 * @return
	 */
	public Inventory createDeallocateTransaction(Inventory inventory) {
		// 1. 재고 할당 수량 설정
		double oriReservedQty = ValueUtil.toDouble(inventory.getReservedQty(), 0.0);
		double newReservedQty = oriReservedQty - this.tranQty;
		newReservedQty = newReservedQty < 0.0 ? 0.0 : newReservedQty;

		// 2. 재고 할당 해제 처리
		inventory.setLastTranCd(Inventory.TRANSACTION_DEALLOCATE);
		inventory.setReservedQty(newReservedQty);
		BeanUtil.get(IQueryManager.class).update(inventory, "lastTranCd", "reservedQty", "updatedAt", "updaterId");

		// 3. 재고 트랜잭션 정보 생성
		/*
		 * this.beforeQty = oriReservedQty;
		 * this.afterQty = newReservedQty;
		 * ValueUtil.populate(inventory, this, "domainId", "barcode", "whCd", "comCd",
		 * "skuCd", "skuNm", "locCd", "lotNo", "serialNo", "expiredDate");
		 * 
		 * this.inventoryId = inventory.getId();
		 * this.toLocCd = inventory.getLocCd();
		 * this.tranType = InventoryTran.TRAN_TYPE_DEALLOCATE;
		 * this.direction = InventoryTran.DIRECTION_NA;
		 * this.tranDate = DateUtil.todayStr();
		 * this.tranAt = new Date();
		 * this.workerId = inventory.getUpdaterId();
		 * this.createTransaction();
		 */

		// 4. 재고 리턴
		return inventory;
	}

	/**
	 * 트랜잭션 생성
	 * 
	 * @return
	 */
	private InventoryTran createTransaction() {
		BeanUtil.get(IQueryManager.class).insert(this);
		return this;
	}
}
