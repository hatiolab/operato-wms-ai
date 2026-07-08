package operato.wms.inbound.entity;

import java.util.Date;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.dbist.annotation.Relation;
import operato.wms.base.entity.relation.CompanyRef;
import operato.wms.stock.entity.Inventory;
import xyz.elidom.dev.entity.RangedSeq;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * 공급처 입고예정 (ASN)
 *
 * 공급처(vendor)가 로지온으로 발송할 상품과 수량을 사전에 등록하는 입고예정통지(ASN) 정보를 관리한다.
 * 라벨에 인쇄되는 재고 바코드(barcode)가 검수·적치까지 이어지는 골든 스레드 역할을 하며,
 * 적치 시 실재고(inventories) 생성 때 재채번 없이 이 barcode를 그대로 사용한다.
 *
 * @author shortstop
 */
@Table(name = "supplier_shipments", idStrategy = GenerationRule.UUID, indexes = {
		@Index(name = "ix_supplier_shipments_0", columnList = "barcode,domain_id", unique = true),
		@Index(name = "ix_supplier_shipments_1", columnList = "asn_no,domain_id"),
		@Index(name = "ix_supplier_shipments_2", columnList = "vend_cd,domain_id"),
		@Index(name = "ix_supplier_shipments_3", columnList = "com_cd,domain_id"),
		@Index(name = "ix_supplier_shipments_4", columnList = "sku_cd,com_cd,domain_id")
})
public class SupplierShipment extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 135519379888372135L;

	/** ID */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/** ASN번호 - 입고예정 채번 번호 (ASN-YYMMDD-00001) */
	@Column (name = "asn_no", length = 20)
	private String asnNo;

	/** 공급처코드 */
	@Column (name = "vend_cd", length = 20)
	private String vendCd;

	/** 화주코드 */
	@Column (name = "com_cd", length = 20)
	private String comCd;

	@Relation(field = "comCd")
	private CompanyRef com;

	/** 상품코드 */
	@Column (name = "sku_cd", length = 30)
	private String skuCd;

	/** 상품명 (등록 시점 스냅샷) */
	@Column (name = "sku_nm")
	private String skuNm;

	/** 재고바코드 - 라벨 인쇄용, 적치 시 실재고에 그대로 사용(골든 스레드) */
	@Column (name = "barcode", nullable = false, length = 50)
	private String barcode;

	/** 예정수량 */
	@Column (name = "exp_qty")
	private Float expQty;

	/** 창고코드 - 가상 공급처 창고 */
	@Column (name = "wh_cd", length = 20)
	private String whCd;

	/** 로케이션코드 - 공급처별 가상 로케이션 */
	@Column (name = "loc_cd", length = 20)
	private String locCd;

	/** 로트번호 */
	@Column (name = "lot_no", length = 30)
	private String lotNo;

	/** 소비기한 (yyyy-MM-dd) */
	@Column (name = "expired_date", length = 10)
	private String expiredDate;

	/** 예상입고일 (yyyy-MM-dd) */
	@Column (name = "eta", length = 10)
	private String eta;

	/** 박스입수 - 박스당 수량 */
	@Column (name = "box_in_qty")
	private Integer boxInQty;

	/** 팔레트박스입수 - 팔레트당 박스 수 */
	@Column (name = "plt_in_qty")
	private Integer pltInQty;

	/** 팔레트당수량 = box_in_qty × plt_in_qty */
	@Column (name = "pallet_qty")
	private Integer palletQty;

	/** 라벨출력여부 */
	@Column (name = "label_flag", nullable = false)
	private Boolean labelFlag;

	/** 오더생성여부 - 로지온이 입고주문으로 전환함 */
	@Column (name = "order_flag", nullable = false)
	private Boolean orderFlag;

	/** 입고번호 - 오더 생성 시 연결된 입고(receivings.rcv_no) */
	@Column (name = "rcv_no", length = 20)
	private String rcvNo;

	/** 오더생성시각 */
	@Column (name = "ordered_at", type = xyz.elidom.dbist.annotation.ColumnType.DATETIME)
	private Date orderedAt;

	/** 비고 */
	@Column (name = "remarks", length = 1000)
	private String remarks;

	/** 삭제여부 */
	@Column (name = "del_flag", nullable = false)
	private Boolean delFlag;

	/** 확장 필드 1 */
	@Column (name = "attr01", length = 100)
	private String attr01;

	/** 확장 필드 2 */
	@Column (name = "attr02", length = 100)
	private String attr02;

	/** 확장 필드 3 */
	@Column (name = "attr03", length = 100)
	private String attr03;

	/** 확장 필드 4 */
	@Column (name = "attr04", length = 100)
	private String attr04;

	/** 확장 필드 5 */
	@Column (name = "attr05", length = 100)
	private String attr05;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getAsnNo() {
		return asnNo;
	}

	public void setAsnNo(String asnNo) {
		this.asnNo = asnNo;
	}

	public String getVendCd() {
		return vendCd;
	}

	public void setVendCd(String vendCd) {
		this.vendCd = vendCd;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public CompanyRef getCom() {
		return com;
	}

	public void setCom(CompanyRef com) {
		this.com = com;

		if(this.com != null) {
			String refId = this.com.getId();
			if (refId != null)
				this.comCd = refId;
		}

		if(this.comCd == null) {
			this.comCd = "";
		}
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

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
	}

	public Float getExpQty() {
		return expQty;
	}

	public void setExpQty(Float expQty) {
		this.expQty = expQty;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
	}

	public String getLotNo() {
		return lotNo;
	}

	public void setLotNo(String lotNo) {
		this.lotNo = lotNo;
	}

	public String getExpiredDate() {
		return expiredDate;
	}

	public void setExpiredDate(String expiredDate) {
		this.expiredDate = expiredDate;
	}

	public String getEta() {
		return eta;
	}

	public void setEta(String eta) {
		this.eta = eta;
	}

	public Integer getBoxInQty() {
		return boxInQty;
	}

	public void setBoxInQty(Integer boxInQty) {
		this.boxInQty = boxInQty;
	}

	public Integer getPltInQty() {
		return pltInQty;
	}

	public void setPltInQty(Integer pltInQty) {
		this.pltInQty = pltInQty;
	}

	public Integer getPalletQty() {
		return palletQty;
	}

	public void setPalletQty(Integer palletQty) {
		this.palletQty = palletQty;
	}

	public Boolean getLabelFlag() {
		return labelFlag;
	}

	public void setLabelFlag(Boolean labelFlag) {
		this.labelFlag = labelFlag;
	}

	public Boolean getOrderFlag() {
		return orderFlag;
	}

	public void setOrderFlag(Boolean orderFlag) {
		this.orderFlag = orderFlag;
	}

	public String getRcvNo() {
		return rcvNo;
	}

	public void setRcvNo(String rcvNo) {
		this.rcvNo = rcvNo;
	}

	public Date getOrderedAt() {
		return orderedAt;
	}

	public void setOrderedAt(Date orderedAt) {
		this.orderedAt = orderedAt;
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

	/**
	 * 생성 전 처리 — ASN번호·재고바코드 채번, 팔레트당수량 계산, 플래그 기본값 세팅
	 */
	@Override
	public void beforeCreate() {
		super.beforeCreate();

		// ASN 번호 채번 (ASN-YYMMDD-00001) — 행마다 고유하게 부여
		if (ValueUtil.isEmpty(this.asnNo)) {
			String dateStr = DateUtil.todayStr("yyMMdd");
			Integer seq = RangedSeq.increaseSequence(Domain.currentDomainId(), "ASN_NO", "ASN_NO", "DATE", dateStr, null, null);
			this.asnNo = "ASN-" + dateStr + "-" + String.format("%05d", seq);
		}

		// 재고 바코드 채번 — 입고/적치 시 실재고와 동일한 채번(diy-generate-inv-barcode) 사용 (골든 스레드)
		if (ValueUtil.isEmpty(this.barcode)) {
			this.barcode = Inventory.newBarcode();
		}

		// 팔레트당 수량 = 박스입수 × 팔레트박스입수 (둘 다 있을 때만)
		if (this.palletQty == null && this.boxInQty != null && this.pltInQty != null) {
			this.palletQty = this.boxInQty * this.pltInQty;
		}

		// 플래그 기본값
		if (this.labelFlag == null) {
			this.labelFlag = Boolean.FALSE;
		}
		if (this.orderFlag == null) {
			this.orderFlag = Boolean.FALSE;
		}
		if (this.delFlag == null) {
			this.delFlag = Boolean.FALSE;
		}
	}
}
