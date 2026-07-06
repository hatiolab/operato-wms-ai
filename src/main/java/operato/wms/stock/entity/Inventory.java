package operato.wms.stock.entity;

import java.math.BigDecimal;
import java.util.Map;

import operato.wms.base.entity.SKU;
import xyz.anythings.sys.service.ICustomService;
import xyz.anythings.sys.util.AnyValueUtil;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

@Table(name = "inventories", idStrategy = GenerationRule.UUID, indexes = {
		@Index(name = "ix_inventories_0", columnList = "domain_id,barcode,loc_cd,status,closed_at", unique = true),
		@Index(name = "ix_inventories_1", columnList = "domain_id,wh_cd,com_cd"),
		@Index(name = "ix_inventories_2", columnList = "domain_id,wh_cd,vend_cd"),
		@Index(name = "ix_inventories_3", columnList = "domain_id,wh_cd,com_cd,loc_cd,sku_cd"),
		@Index(name = "ix_inventories_4", columnList = "domain_id,wh_cd,lot_no,expired_date"),
		@Index(name = "ix_inventories_5", columnList = "domain_id,wh_cd,last_tran_cd"),
		@Index(name = "ix_inventories_6", columnList = "domain_id,wh_cd,rcv_no"),
		@Index(name = "ix_inventories_7", columnList = "domain_id,wh_cd,updated_at"),
		@Index(name = "ix_inventories_8", columnList = "domain_id,wh_cd,expire_status"),
		@Index(name = "ix_inventories_9", columnList = "domain_id,wh_cd,status"),
		@Index(name = "ix_inventories_10", columnList = "domain_id,wh_cd,del_flag")
})
public class Inventory extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 611417470988406642L;

	/**
	 * 재고 상태 - EMPTY (비어있음)
	 */
	public static final String STATUS_EMPTY = "EMPTY";
	/**
	 * 재고 상태 - WAIT (입고 대기)
	 */
	public static final String STATUS_WAITING = "WAITING";
	/**
	 * 재고 상태 - STORED (보관 중)
	 */
	public static final String STATUS_STORED = "STORED";
	/**
	 * 재고 상태 - RESERVED (피킹 예약) -> 제거 필요. 피킹 예약을 한다고 해서 재고 상태가 예약 상태로 변경되면 안되고 보관 중
	 * 상태로 되어 있다가 피킹 완료된 이후에 수량 차감 혹은 모든 수량이 차감되면 삭제되어야 함.
	 */
	public static final String STATUS_RESERVED = "RESERVED";
	/**
	 * 재고 상태 - PICKING (피킹 중) -> 제거 필요. 피킹 중인 상태에도 재고 상태가 보관 중으로 되어 있어야 하고, 피킹 완료된
	 * 이후에 수량 차감
	 * 혹은 모든 수량이 차감되면 삭제되어야 함.
	 */
	public static final String STATUS_PICK = "PICKING";
	/**
	 * 재고 상태 - LOCKED (잠김) -> 제거 필요, 상태에서 LOCKED를 제거하고 locked_flag를 추가로 만들어서 처리 필요
	 */
	public static final String STATUS_LOCK = "LOCKED";
	/**
	 * 재고 상태 - BAD (불량, 파손)
	 */
	public static final String STATUS_BAD = "BAD";

	/**
	 * 재고 임박 상태 - NORMAL (정상)
	 */
	public static final String EXPIRE_STATUS_NORMAL = "NORMAL";
	/**
	 * 재고 임박 상태 - IMMINENT (임박)
	 */
	public static final String EXPIRE_STATUS_IMMINENT = "IMMINENT";
	/**
	 * 재고 임박 상태 - EXPIRED (유효기간 지남)
	 */
	public static final String EXPIRE_STATUS_EXPIRED = "EXPIRED";

	/**
	 * 재고 트렌젝션 - IN-INSP (입고 검수) -> 제거 필요. 입고 검수는 트랜잭션으로 처리하지 말고 입고 검수 완료 후 적치 시점에
	 * 입고로 트랜잭션 처리 필요
	 */
	public static final String TRANSACTION_IN_INSP = "IN-INSP";
	/**
	 * 재고 트렌젝션 - IN (입고)
	 */
	public static final String TRANSACTION_IN = "IN";
	/**
	 * 재고 트렌젝션 - OUT (출고)
	 */
	public static final String TRANSACTION_OUT = "OUT";
	/**
	 * 재고 트렌젝션 - OUT_CANCEL (출고 취소)
	 */
	public static final String TRANSACTION_OUT_CANCEL = "OUT_CANCEL";
	/**
	 * 재고 트렌젝션 - MOVE (로케이션 이동)
	 */
	public static final String TRANSACTION_MOVE = "MOVE";
	/**
	 * 재고 트렌젝션 - TRANSFER (창고 이동)
	 */
	public static final String TRANSACTION_TRANSFER = "TRANSFER";
	/**
	 * 재고 트렌젝션 - ALLOCATE (피킹 할당)
	 */
	public static final String TRANSACTION_ALLOCATE = "ALLOCATE";
	/**
	 * 재고 트렌젝션 - DEALLOCATE (피킹 할당 해제)
	 */
	public static final String TRANSACTION_DEALLOCATE = "DEALLOCATE";
	/**
	 * 재고 트렌젝션 - HOLD (홀드)
	 */
	public static final String TRANSACTION_HOLD = "HOLD";
	/**
	 * 재고 트렌젝션 - RELEASE_HOLD (잠금 해제)
	 */
	public static final String TRANSACTION_RELEASE_HOLD = "RELEASE_HOLD";
	/**
	 * 재고 트렌젝션 - SCRAP (폐기 처리)
	 */
	public static final String TRANSACTION_SCRAP = "SCRAP";
	/**
	 * 재고 트렌젝션 - SPLIT (분할)
	 */
	public static final String TRANSACTION_SPLIT = "SPLIT";
	/**
	 * 재고 트렌젝션 - MERGE (병합)
	 */
	public static final String TRANSACTION_MERGE = "MERGE";
	/**
	 * 재고 트렌젝션 - MERGED (병합된 재고)
	 */
	public static final String TRANSACTION_MERGED = "MERGED";
	/**
	 * 재고 트렌젝션 - ADJUST (재고 조정)
	 */
	public static final String TRANSACTION_ADJUST = "ADJUST";
	/**
	 * 재고 트렌젝션 - COUNT (재고 실사)
	 */
	public static final String TRANSACTION_COUNT = "COUNT";
	/**
	 * 재고 트렌젝션 - NEW (재고 생성)
	 */
	public static final String TRANSACTION_NEW = "NEW";
	/**
	 * 재고 트렌젝션 - RWA_RESTOCK (반품 재입고)
	 */
	public static final String TRANSACTION_RWA_RESTOCK = "RWA_RESTOCK";
	/**
	 * 재고 트렌젝션 - VAS-OUT (유통가공 구성품 차감)
	 */
	public static final String TRANSACTION_VAS_OUT = "VAS-OUT";

	public Inventory() {
	}

	public Inventory(String id) {
		this.id = id;
	}

	public Inventory(Long domainId, String barcode, String locCd) {
		this.domainId = domainId;
		this.barcode = barcode;
		this.locCd = locCd;
	}

	/**
	 * 재고 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 재고 바코드 - 재고 단위를 식별하는 고유 바코드. 입고 시 자동 생성
	 */
	@Column(name = "barcode", nullable = false, length = 50)
	private String barcode;

	/**
	 * 창고 코드 - 재고가 위치한 창고
	 */
	@Column(name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 화주사 코드 - 재고를 소유한 화주사
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 상품 코드
	 */
	@Column(name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	/**
	 * 상품 바코드 - 상품 자체의 바코드 (재고 바코드와 구분)
	 */
	@Column(name = "sku_bcd", length = 50)
	private String skuBcd;

	/**
	 * 상품명
	 */
	@Column(name = "sku_nm", length = 255)
	private String skuNm;

	/**
	 * 공급업체 코드
	 */
	@Column(name = "vend_cd", length = 30)
	private String vendCd;

	/**
	 * 제조사 코드
	 */
	@Column(name = "maker_cd", length = 30)
	private String makerCd;

	/**
	 * 로케이션 코드 - 재고가 현재 보관된 위치
	 */
	@Column(name = "loc_cd", nullable = false, length = 30)
	private String locCd;

	/**
	 * 팔레트 코드 - 재고가 적재된 팔레트 단위 코드
	 */
	@Column(name = "pallet_cd", length = 30)
	private String palletCd;

	/**
	 * 발주 번호 (PO Number)
	 */
	@Column(name = "po_no", length = 30)
	private String poNo;

	/**
	 * 인보이스 번호 - 입고 시 공급업체가 발행한 송장 번호
	 */
	@Column(name = "invoice_no", length = 30)
	private String invoiceNo;

	/**
	 * 입고 번호 - 연결된 입고 주문 번호
	 */
	@Column(name = "rcv_no", length = 30)
	private String rcvNo;

	/**
	 * 입고 순번 - 입고 주문 내 라인 순번
	 */
	@Column(name = "rcv_seq")
	private Integer rcvSeq;

	/**
	 * 입고 확정 일시 (형식: YYYY-MM-DD HH:mm:ss)
	 */
	@Column(name = "received_at", length = 20)
	private String receivedAt;

	/**
	 * 재고 종료 일시 - 재고 소진 또는 폐기로 종료 처리된 일시 (형식: YYYY-MM-DD HH:mm:ss)
	 */
	@Column(name = "closed_at", length = 20)
	private String closedAt;

	/**
	 * 출고 주문 번호 - 예약/피킹 중인 출고 주문 번호
	 */
	@Column(name = "rls_ord_no", length = 30)
	private String rlsOrdNo;

	/**
	 * 출고 라인 번호 - 예약/피킹 중인 출고 주문의 라인 번호
	 */
	@Column(name = "rls_line_no", length = 30)
	private String rlsLineNo;

	/**
	 * 포장 유형 - 상품 포장 단위 유형 (예: PALLET, BOX, EA)
	 */
	@Column(name = "pack_type", length = 20)
	private String packType;

	/**
	 * 포장 번호 - 포장 단위 식별 번호
	 */
	@Column(name = "pack_no", length = 30)
	private String packNo;

	/**
	 * 원산지 코드
	 */
	@Column(name = "origin", length = 10)
	private String origin;

	/**
	 * Lot 번호 - 동일 생산 배치를 식별하는 번호
	 */
	@Column(name = "lot_no", length = 50)
	private String lotNo;

	/**
	 * 시리얼 번호 - 개별 상품 고유 식별 번호
	 */
	@Column(name = "serial_no", length = 50)
	private String serialNo;

	/**
	 * 유효기간 - 상품 소비 기한 (형식: YYYY-MM-DD)
	 */
	@Column(name = "expired_date", length = 10)
	private String expiredDate;

	/**
	 * 제조일자 (형식: YYYY-MM-DD)
	 */
	@Column(name = "prod_date", length = 10)
	private String prodDate;

	/**
	 * 중량 (kg)
	 */
	@Column(name = "weight")
	private Double weight;

	/**
	 * 부피 (CBM, Cubic Meter)
	 */
	@Column(name = "cbm")
	private Double cbm;

	/**
	 * 단가 - 재고 입고 시 단위 가격
	 */
	@Column(name = "unit_price")
	private BigDecimal unitPrice;

	/**
	 * 통화 코드 (ISO 4217, 예: KRW, USD, EUR)
	 */
	@Column(name = "currency_cd", length = 3)
	private String currencyCd;

	/**
	 * 팔레트 수량
	 */
	@Column(name = "pallet_qty")
	private Integer palletQty;

	/**
	 * 박스 수량
	 */
	@Column(name = "box_qty")
	private Integer boxQty;

	/**
	 * EA 수량 - 낱개 단위 수량
	 */
	@Column(name = "ea_qty")
	private Double eaQty;

	/**
	 * 예약 수량 - 출고 예약 또는 피킹 중인 수량
	 */
	@Column(name = "reserved_qty")
	private Double reservedQty;

	/**
	 * 재고 수량 - 현재 실제 보유 수량. 출고 확정 시 0으로 변경됨
	 */
	@Column(name = "inv_qty", nullable = false)
	private Double invQty;

	/**
	 * 마지막 트랜잭션 코드 - 재고에 마지막으로 수행된 작업 유형 (IN, OUT, MOVE 등)
	 */
	@Column(name = "last_tran_cd", length = 20)
	private String lastTranCd;

	/**
	 * 유효기간 임박 상태 - NORMAL(정상) / IMMINENT(임박) / EXPIRED(만료)
	 */
	@Column(name = "expire_status", length = 10)
	private String expireStatus;

	/**
	 * 소유자 - 재고를 점유한 작업자 또는 시스템 ID
	 */
	@Column(name = "owner", length = 32)
	private String owner;

	/**
	 * 재고 상태 - EMPTY / WAITING / STORED / RESERVED / PICKING / LOCKED / BAD
	 */
	@Column(name = "status", length = 10)
	private String status;

	/**
	 * ERP 연동 상태 - ERP 시스템과의 동기화 상태 코드
	 */
	@Column(name = "erp_status", length = 20)
	private String erpStatus;

	/**
	 * 비고 - 트랜잭션 사유 또는 메모
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	/**
	 * 삭제 여부 - true이면 재고 소진 또는 논리 삭제 처리된 상태
	 */
	@Column(name = "del_flag")
	private Boolean delFlag;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
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

	public String getSkuBcd() {
		return skuBcd;
	}

	public void setSkuBcd(String skuBcd) {
		this.skuBcd = skuBcd;
	}

	public String getSkuNm() {
		return skuNm;
	}

	public void setSkuNm(String skuNm) {
		this.skuNm = skuNm;
	}

	public String getVendCd() {
		return vendCd;
	}

	public void setVendCd(String vendCd) {
		this.vendCd = vendCd;
	}

	public String getMakerCd() {
		return makerCd;
	}

	public void setMakerCd(String makerCd) {
		this.makerCd = makerCd;
	}

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
	}

	public String getPalletCd() {
		return palletCd;
	}

	public void setPalletCd(String palletCd) {
		this.palletCd = palletCd;
	}

	public String getPoNo() {
		return poNo;
	}

	public void setPoNo(String poNo) {
		this.poNo = poNo;
	}

	public String getInvoiceNo() {
		return invoiceNo;
	}

	public void setInvoiceNo(String invoiceNo) {
		this.invoiceNo = invoiceNo;
	}

	public String getPackType() {
		return packType;
	}

	public void setPackType(String packType) {
		this.packType = packType;
	}

	public String getPackNo() {
		return packNo;
	}

	public void setPackNo(String packNo) {
		this.packNo = packNo;
	}

	public String getOrigin() {
		return origin;
	}

	public void setOrigin(String origin) {
		this.origin = origin;
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

	public Double getWeight() {
		return weight;
	}

	public void setWeight(Double weight) {
		this.weight = weight;
	}

	public Double getCbm() {
		return cbm;
	}

	public void setCbm(Double cbm) {
		this.cbm = cbm;
	}

	public BigDecimal getUnitPrice() {
		return unitPrice;
	}

	public void setUnitPrice(BigDecimal unitPrice) {
		this.unitPrice = unitPrice;
	}

	public String getCurrencyCd() {
		return currencyCd;
	}

	public void setCurrencyCd(String currencyCd) {
		this.currencyCd = currencyCd;
	}

	public Integer getPalletQty() {
		return palletQty;
	}

	public void setPalletQty(Integer palletQty) {
		this.palletQty = palletQty;
	}

	public Integer getBoxQty() {
		return boxQty;
	}

	public void setBoxQty(Integer boxQty) {
		this.boxQty = boxQty;
	}

	public Double getEaQty() {
		return eaQty;
	}

	public void setEaQty(Double eaQty) {
		this.eaQty = eaQty;
	}

	public Double getReservedQty() {
		return reservedQty;
	}

	public void setReservedQty(Double reservedQty) {
		this.reservedQty = reservedQty;
	}

	public Double getInvQty() {
		return invQty;
	}

	public void setInvQty(Double invQty) {
		this.invQty = invQty;
	}

	public String getLastTranCd() {
		return lastTranCd;
	}

	public void setLastTranCd(String lastTranCd) {
		this.lastTranCd = lastTranCd;
	}

	public String getExpireStatus() {
		return expireStatus;
	}

	public void setExpireStatus(String expireStatus) {
		this.expireStatus = expireStatus;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getErpStatus() {
		return erpStatus;
	}

	public void setErpStatus(String erpStatus) {
		this.erpStatus = erpStatus;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
	}

	public String getRcvNo() {
		return rcvNo;
	}

	public void setRcvNo(String rcvNo) {
		this.rcvNo = rcvNo;
	}

	public Integer getRcvSeq() {
		return rcvSeq;
	}

	public void setRcvSeq(Integer rcvSeq) {
		this.rcvSeq = rcvSeq;
	}

	public String getReceivedAt() {
		return receivedAt;
	}

	public void setReceivedAt(String receivedAt) {
		this.receivedAt = receivedAt;
	}

	public String getClosedAt() {
		return closedAt;
	}

	public void setClosedAt(String closedAt) {
		this.closedAt = closedAt;
	}

	public String getRlsOrdNo() {
		return rlsOrdNo;
	}

	public void setRlsOrdNo(String rlsOrdNo) {
		this.rlsOrdNo = rlsOrdNo;
	}

	public String getRlsLineNo() {
		return rlsLineNo;
	}

	public void setRlsLineNo(String rlsLineNo) {
		this.rlsLineNo = rlsLineNo;
	}

	public String getOwner() {
		return owner;
	}

	public void setOwner(String owner) {
		this.owner = owner;
	}

	/**
	 * 바코드 생성
	 * 
	 * @return
	 */
	public static String newBarcode() {
		return (String) BeanUtil.get(ICustomService.class).doCustomService(Domain.currentDomainId(),
				"diy-generate-inv-barcode", ValueUtil.newMap(SysConstants.EMPTY_STRING));
	}

	@Override
	public void beforeCreate() {
		this.id = null;
		super.beforeCreate();

		if (ValueUtil.isEmpty(this.barcode)) {
			this.barcode = Inventory.newBarcode();
		}

		if (ValueUtil.isEmpty(this.barcode)) {
			throw new ElidomRuntimeException("재고 바코드가 생성되지 않았습니다. 커스텀 서비스 [diy-generate-inv-barcode]를 확인하세요.");
		}

		this.weight = (this.weight == null) ? 0.0f : this.weight;
		this.cbm = (this.cbm == null) ? 0 : this.cbm;
		this.palletQty = (this.palletQty == null) ? 0 : this.palletQty;
		this.boxQty = (this.boxQty == null) ? 0 : this.boxQty;
		this.eaQty = (this.eaQty == null) ? 0.0 : this.eaQty;
		this.delFlag = (this.delFlag == null) ? false : this.delFlag;
		this.expireStatus = (this.expireStatus == null) ? Inventory.EXPIRE_STATUS_NORMAL : this.expireStatus;

		// 유통기한 계산
		this.calculateExpiryDate();

		if (this.invQty <= 0) {
			// 재고 소진시 상태 : 비어있음
			this.status = Inventory.STATUS_EMPTY;
			this.closedAt = DateUtil.currentTimeStr();
			// this.delFlag = true;
		} else {
			// 상태 초기화 : 보관 중
			this.status = (this.status == null) ? Inventory.STATUS_STORED : this.status;
		}
	}

	/**
	 * 유통기한 계산
	 */
	public void calculateExpiryDate() {
		// 이미 유통기한이 설정되어 있다면 계산하지 않음
		if (ValueUtil.isNotEmpty(this.skuNm) && ValueUtil.isNotEmpty(this.expiredDate)) {
			return;
		}

		String sql = "select id, sku_nm, prd_expired_period from sku where domain_id = :domainId and com_cd = :comCd and sku_cd = :skuCd";
		SKU sku = BeanUtil.get(IQueryManager.class).selectBySql(sql,
				ValueUtil.newMap("domainId,comCd,skuCd", this.domainId, this.comCd, this.skuCd), SKU.class);

		if (ValueUtil.isEmpty(this.skuNm)) {
			this.skuNm = sku.getSkuNm();
		}

		if (sku == null || ValueUtil.isEmpty(sku.getPrdExpiredPeriod()) || ValueUtil.isEmpty(this.prodDate)) {
			return;
		}

		// 유통기한 = 제조일 + prdExpiredPeriod(일)
		String expiredDate = DateUtil.addDateToStr(
				DateUtil.parse(this.prodDate, DateUtil.getDateFormat()),
				sku.getPrdExpiredPeriod());
		this.setExpiredDate(expiredDate);
	}

	@Override
	public void beforeUpdate() {
		super.beforeUpdate();

		// 입고 시 입고 시간 자동 설정
		if (ValueUtil.isEqualIgnoreCase(Inventory.TRANSACTION_IN, this.lastTranCd)) {
			this.receivedAt = DateUtil.currentTimeStr();
		}

		// 재고 수량이 0이면 상태 변경 및 마감 처리
		if (this.invQty <= 0) {
			this.status = Inventory.STATUS_EMPTY;
			this.closedAt = DateUtil.currentTimeStr();
			// 삭제 플래그는 폐기 시에만 처리 - TODO delFlag 사용 부분 모두 체크 필요
			// this.delFlag = true;
		}

		// 폐기 시 상태 : 폐기
		if (ValueUtil.isEqualIgnoreCase(this.lastTranCd, Inventory.TRANSACTION_SCRAP)) {
			this.closedAt = DateUtil.currentTimeStr();
			this.delFlag = true;
		}
	}

	/**
	 * 이동하려는 로케이션에 동일 상품, 동일 바코드, 보관 중 상태의 재고 조회
	 * 
	 * @param domainId
	 * @param barcode
	 * @param locCd
	 * @param skuCd
	 * @param status
	 * @return
	 */
	public static Inventory findInventory(Long domainId, String barcode, String locCd, String skuCd, String status) {
		Map<String, Object> params = ValueUtil.newMap("domainId,barcode,skuCd,locCd,status", domainId, barcode, skuCd,
				locCd, status);
		return BeanUtil.get(IQueryManager.class).selectByCondition(Inventory.class, params);
	}

	/**
	 * 재고 전체 이동 (Validation은 완료 된 상태에서 처리)
	 * 이동 로케이션에 동일 상품, 동일 소비기한의 보관 중 상태의 재고가 있다면 병합 처리하고 자신은 소진 처리
	 * 이동 로케이션에 동일 바코드의 보관 중 상태의 재고가 있다면 병합 처리하고 자신은 소진 처리
	 * 
	 * @param toLocCd
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public Inventory move(String toLocCd, String reasonCd, String reason, String remarks) {
		// 1. 트랜잭션 그룹 ID 생성
		IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
		String groupId = AnyValueUtil.newUuid32();
		String fromLocCd = this.locCd;

		// 2. MOVE-OUT 트랜잭션 이력 처리
		InventoryTran.createMoveOutTransactionHistory(this, fromLocCd, toLocCd, this.invQty, groupId,
				reasonCd, reason, remarks);

		// 3. 이동하려는 로케이션에 동일 상품, 동일 바코드, 보관 중 상태의 재고 조회 - 병합 여부 판단
		Inventory legacyInv = Inventory.findInventory(this.domainId, this.barcode, toLocCd, this.skuCd,
				Inventory.STATUS_STORED);

		// 4. 기존 재고가 있다면 기존 재고와 병합 처리
		if (legacyInv != null) {
			// 4-1. 이동할 로케이션에 동일 상품, 동일 바코드, 보관 중 상태의 재고가 있다면 병합 처리로 이동 처리
			return legacyInv.merge(this, groupId, reasonCd, reason, remarks);

			// 5. 기존 재고가 없다면 전체 이동 처리
		} else {
			// 5-1. 전체 이동 처리
			this.setLocCd(toLocCd);
			this.setLastTranCd(Inventory.TRANSACTION_MOVE);
			if (ValueUtil.isNotEmpty(remarks)) {
				this.setRemarks(remarks);
			}
			queryMgr.update(this);

			// 5-2. MOVE-IN 트랜잭션 이력 처리
			InventoryTran.createMoveInTransactionHistory(this, fromLocCd, toLocCd, this.invQty, groupId, reasonCd,
					reason, remarks);
			return this;
		}
	}

	/**
	 * 병합 처리 - 자신(this)의 재고를 mainInv에 병합 처리 후 mergedInv는 소진 처리
	 * 
	 * @param mergedInv
	 * @param groupId
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 */
	public Inventory merge(Inventory mergedInv, String groupId, String reasonCd, String reason, String remarks) {
		// 1. 쿼리 매니저
		IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
		String fromLocCd = mergedInv.getLocCd();
		String toLocCd = this.locCd;
		double mergeQty = mergedInv.getInvQty();

		// 2. 메인 재고 병합 처리 - 기존 재고에 재고 수량만 추가하고
		this.setInvQty(this.getInvQty() + mergeQty);
		this.setRemarks("바코드[" + mergedInv.getBarcode() + "], 로케이션[" + fromLocCd + "]와 수량[" + mergeQty + "] 병합");
		queryMgr.update(this, "invQty", "remarks");

		// 3. 병합 재고 소진 처리
		mergedInv.setLocCd(toLocCd);
		mergedInv.setInvQty(0.0);
		mergedInv.setRemarks("바코드[" + this.getBarcode() + "], 로케이션[" + toLocCd + "]와 수량[" + mergeQty + "] 병합된 후 소진");
		queryMgr.upsert(mergedInv);

		// 4. mergedInv 재고 MOVE-IN 트랜잭션 이력 처리
		InventoryTran.createMoveInTransactionHistory(mergedInv, fromLocCd, toLocCd, mergeQty, groupId,
				reasonCd, reason, remarks);

		// 5. 메인 재고 MERGE 트랜잭션 이력 처리
		InventoryTran.createMergeTransactionHistory(this, mergeQty, groupId, reasonCd, reason, remarks);

		// 6. 병합 재고 MERGE-OUT (소진) 트랜잭션 이력 처리
		InventoryTran.createMergedOutTransactionHistory(mergedInv, mergeQty, groupId, reasonCd, reason, remarks);

		// 7. 병합 재고 리턴
		return this;
	}

	/**
	 * 분할 (재고 부분 이동) (Validation은 완료 된 상태에서 처리)
	 * 
	 * @param toLocCd
	 * @param splitQty
	 * @param reasonCd
	 * @param reason
	 * @param remarks
	 * @return
	 */
	public Inventory split(String toLocCd, double splitQty, String reasonCd, String reason,
			String remarks) {
		// 1. 쿼리 매니저
		IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
		String groupId = AnyValueUtil.newUuid32();
		String fromLocCd = this.locCd;

		// 2. 메인 재고는 수량 차감만 (이동 안 함)
		this.setInvQty(this.invQty - splitQty);
		if (ValueUtil.isNotEmpty(remarks)) {
			this.setRemarks(this.remarks);
		}
		this.setLastTranCd(Inventory.TRANSACTION_SPLIT);
		queryMgr.update(this);

		// 3. 메인 재고 SPLIT 트랜잭션 이력 처리
		InventoryTran.createSplitTransactionHistory(this, splitQty, groupId, reasonCd, reason, remarks);

		// 4. 분할되는 재고는 이동 수량 만큼 신규 재고 생성 및 이동 처리
		Inventory movingInv = ValueUtil.populate(this, new Inventory());
		movingInv.setId(null);
		movingInv.setLastTranCd(Inventory.TRANSACTION_MOVE);
		movingInv.setInvQty(splitQty);
		movingInv.setReservedQty(0.0);
		movingInv.setRemarks(remarks);
		movingInv.setCreatedAt(null);
		// movingInv.setLocCd(toLocCd) -> 병합 시에는 병합 처리 코드에서 설정하고 병합이 아닐 시 7-1 에서 처리한다.
		// 지금 저장하면 안 됨. 이동 처리 시에 이동할 로케이션에 동일 바코드가 있는지 체크 후 이동 처리 필요

		// 5. 이동하려는 로케이션에 동일 상품, 동일 바코드, 보관 중 상태의 재고 조회 - 병합 여부 판단
		Inventory legacyInv = Inventory.findInventory(this.domainId, this.barcode, toLocCd, this.skuCd,
				Inventory.STATUS_STORED);

		// 6. 병합 처리 - legacyInv에 movingInv가 병합 처리
		if (legacyInv != null) {
			legacyInv.merge(movingInv, groupId, reasonCd, reason, remarks);

			// 7. movingInv 단순 이동 처리
		} else {
			// 7-1. movingInv 이동 처리
			movingInv.setLocCd(toLocCd);
			queryMgr.insert(movingInv);
			// 7-2. 재고 이동 트랜잭션 이력 처리
			InventoryTran.createMoveInTransactionHistory(movingInv, fromLocCd, toLocCd, splitQty, groupId, reasonCd,
					reason, remarks);
		}

		// 8. 분할로 분리된 재고 MOVE-OUT 트랜잭션 이력 처리
		InventoryTran.createSplitMoveOutTransactionHistory(movingInv, fromLocCd, splitQty, groupId, reasonCd, reason,
				remarks);

		// 9. 분할 재고 리턴
		return movingInv;
	}
}
