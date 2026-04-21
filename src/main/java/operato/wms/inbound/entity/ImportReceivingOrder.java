package operato.wms.inbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 입고 정보 임포트 모델
 *
 * 엑셀 파일 업로드를 통한 입고 예정 일괄 등록에 사용하는 플랫 모델.
 * Receiving(헤더) + ReceivingItem(아이템) 정보를 한 행에 담아 임포트한 후
 * {@link operato.wms.inbound.service.InboundTransactionService#importReleaseOrders} 에서
 * Receiving / ReceivingItem으로 분리·저장한다. DB 테이블 없이 뷰 전용으로 사용된다.
 *
 * @author shortstop
 */
@Table(name = "import_receiving_orders", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class ImportReceivingOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 286856778440825026L;

    /**
     * ID
     */
    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    /**
     * 입고번호 - 입고 작업 식별 번호. 화주사+창고 범위 내 유일
     */
    @Column(name = "rcv_no", nullable = false, length = 20)
    private String rcvNo;

    /**
     * 입고요청번호 - 화주사가 발행한 입고 요청 번호 (ERP 연동 키)
     */
    @Column(name = "rcv_req_no", length = 20)
    private String rcvReqNo;

    /**
     * 입고요청일 - 화주사가 입고를 요청한 날짜 (yyyy-MM-dd)
     */
    @Column(name = "rcv_req_date", nullable = false, length = 10)
    private String rcvReqDate;

    /**
     * 입고유형 - 입고 처리 방식 구분
     * NORMAL: 일반 입고 / RETURN: 반품 / TRANSFER: 이관 / PRODUCTION: 생산입고
     */
    @Column(name = "rcv_type", nullable = false, length = 20)
    private String rcvType;

    /**
     * 창고코드 - 입고가 이루어지는 창고 코드
     */
    @Column(name = "wh_cd", length = 20)
    private String whCd;

    /**
     * 화주코드 - 입고 주체 화주사 코드
     */
    @Column(name = "com_cd", length = 20)
    private String comCd;

    /**
     * 공급처코드 - 상품을 공급하는 거래처(벤더) 코드
     */
    @Column(name = "vend_cd", length = 20)
    private String vendCd;

    /**
     * 담당자 - 입고 작업 담당 사용자 ID
     */
    @Column(name = "mgr_id", length = 32)
    private String mgrId;

    /**
     * 입고차량번호 - 상품을 운반한 차량의 번호판
     */
    @Column(name = "car_no", length = 30)
    private String carNo;

    /**
     * 기사명 - 입고 차량 운전 기사 이름
     */
    @Column(name = "driver_nm", length = 40)
    private String driverNm;

    /**
     * 기사연락처 - 입고 차량 운전 기사 연락처
     */
    @Column(name = "driver_tel", length = 20)
    private String driverTel;

    /**
     * 총 박스 수 - 입고 차량에 실려온 전체 박스 수량
     */
    @Column(name = "total_box")
    private Integer totalBox;

    /**
     * 박스 무게 - 박스 1개 평균 무게 (kg)
     */
    @Column(name = "box_wt")
    private Double boxWt;

    /**
     * 비고 - 입고 헤더 운영 메모 또는 특이사항
     */
    @Column(name = "remarks", length = 1000)
    private String remarks;

    /**
     * 입고예정순번 - 입고 예정 정보 기준 순번 (ERP 발행 순서)
     */
    @Column(name = "rcv_exp_seq", nullable = false)
    private Integer rcvExpSeq;

    /**
     * 상품코드 - 입고 대상 SKU 코드
     */
    @Column(name = "sku_cd", nullable = false, length = 30)
    private String skuCd;

    /**
     * 상품명 - 입고 대상 SKU 명칭
     */
    @Column(name = "sku_nm", length = 255)
    private String skuNm;

    /**
     * ERP Part No - ERP 시스템에서 사용하는 품목 번호
     */
    @Column(name = "erp_part_no", length = 30)
    private String erpPartNo;

    /**
     * 원산지 - 상품 생산 국가 또는 지역
     */
    @Column(name = "origin", length = 30)
    private String origin;

    /**
     * 소유자 - 재고 소유자 코드 (화주사 내 부서 또는 채널 구분)
     */
    @Column(name = "owner", length = 32)
    private String owner;

    /**
     * 입고예정일 - 이 아이템의 입고 예정 날짜 (yyyy-MM-dd)
     */
    @Column(name = "rcv_exp_date", nullable = false, length = 10)
    private String rcvExpDate;

    /**
     * 총입고예정수량 - 이 SKU의 전체 예정 수량 (분할 전 원본 수량)
     */
    @Column(name = "total_exp_qty", nullable = false)
    private Float totalExpQty;

    /**
     * 입고예정수량 - 이 순번의 입고 예정 수량
     */
    @Column(name = "rcv_exp_qty", nullable = false)
    private Float rcvExpQty;

    /**
     * 예정(PALLET) - 입고 예정 팔레트 수
     */
    @Column(name = "exp_pallet_qty")
    private Integer expPalletQty;

    /**
     * 예정(BOX) - 입고 예정 박스 수
     */
    @Column(name = "exp_box_qty")
    private Integer expBoxQty;

    /**
     * 예정(EA) - 입고 예정 낱개 수량
     */
    @Column(name = "exp_ea_qty")
    private Float expEaQty;

    /**
     * 로케이션 - 입고 상품이 적치될 로케이션 코드
     */
    @Column(name = "loc_cd", length = 20)
    private String locCd;

    /**
     * 검수결과(품목속성) - 검수 후 판정 결과
     * PASS: 합격 / FAIL: 불합격 / HOLD: 보류
     */
    @Column(name = "item_type", length = 20)
    private String itemType;

    /**
     * 검수수량 - 검수(수량 확인) 처리된 수량
     */
    @Column(name = "insp_qty")
    private Float inspQty;

    /**
     * 유효일자 - 상품의 유통기한 (yyyy-MM-dd)
     */
    @Column(name = "expired_date", length = 10)
    private String expiredDate;

    /**
     * 제조일자 - 상품 제조일 (yyyy-MM-dd). 유통기한 자동 계산의 기준일
     */
    @Column(name = "prd_date", length = 10)
    private String prdDate;

    /**
     * LOT - 로트 번호. SKU.lotFlag=true인 경우 필수 입력
     */
    @Column(name = "lot_no", length = 30)
    private String lotNo;

    /**
     * 바코드 - 입고 완료 시 발행되는 재고 바코드. 재고(Inventory) 추적 키
     */
    @Column(name = "barcode", length = 40)
    private String barcode;

    /**
     * INVOICE - 수입 인보이스 번호 (통관·정산 연계 키)
     */
    @Column(name = "invoice_no", length = 30)
    private String invoiceNo;

    /**
     * PO 번호 - 화주사 구매발주(Purchase Order) 번호
     */
    @Column(name = "po_no", length = 30)
    private String poNo;

    /**
     * B/L - 선하증권(Bill of Lading) 번호
     */
    @Column(name = "bl_no", length = 30)
    private String blNo;

    /**
     * 아이템 비고 - 입고 상세 아이템의 운영 메모 또는 특이사항. ReceivingItem.remarks로 저장됨
     */
    @Column(name = "item_remarks", length = 1000)
    private String itemRemarks;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRcvNo() {
        return rcvNo;
    }

    public void setRcvNo(String rcvNo) {
        this.rcvNo = rcvNo;
    }

    public String getRcvReqNo() {
        return rcvReqNo;
    }

    public void setRcvReqNo(String rcvReqNo) {
        this.rcvReqNo = rcvReqNo;
    }

    public String getRcvReqDate() {
        return rcvReqDate;
    }

    public void setRcvReqDate(String rcvReqDate) {
        this.rcvReqDate = rcvReqDate;
    }

    public String getRcvType() {
        return rcvType;
    }

    public void setRcvType(String rcvType) {
        this.rcvType = rcvType;
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

    public String getMgrId() {
        return mgrId;
    }

    public void setMgrId(String mgrId) {
        this.mgrId = mgrId;
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
    
    public Integer getTotalBox() {
		return totalBox;
	}

	public void setTotalBox(Integer totalBox) {
		this.totalBox = totalBox;
	}

	public Double getBoxWt() {
		return boxWt;
	}

	public void setBoxWt(Double boxWt) {
		this.boxWt = boxWt;
	}

	public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public Integer getRcvExpSeq() {
        return rcvExpSeq;
    }

    public void setRcvExpSeq(Integer rcvExpSeq) {
        this.rcvExpSeq = rcvExpSeq;
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

    public String getErpPartNo() {
        return erpPartNo;
    }

    public void setErpPartNo(String erpPartNo) {
        this.erpPartNo = erpPartNo;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public String getRcvExpDate() {
        return rcvExpDate;
    }

    public void setRcvExpDate(String rcvExpDate) {
        this.rcvExpDate = rcvExpDate;
    }

    public Float getTotalExpQty() {
        return totalExpQty;
    }

    public void setTotalExpQty(Float totalExpQty) {
        this.totalExpQty = totalExpQty;
    }

    public Float getRcvExpQty() {
        return rcvExpQty;
    }

    public void setRcvExpQty(Float rcvExpQty) {
        this.rcvExpQty = rcvExpQty;
    }

    public Integer getExpPalletQty() {
        return expPalletQty;
    }

    public void setExpPalletQty(Integer expPalletQty) {
        this.expPalletQty = expPalletQty;
    }

    public Integer getExpBoxQty() {
        return expBoxQty;
    }

    public void setExpBoxQty(Integer expBoxQty) {
        this.expBoxQty = expBoxQty;
    }

    public Float getExpEaQty() {
        return expEaQty;
    }

    public void setExpEaQty(Float expEaQty) {
        this.expEaQty = expEaQty;
    }

    public String getLocCd() {
        return locCd;
    }

    public void setLocCd(String locCd) {
        this.locCd = locCd;
    }

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
        this.itemType = itemType;
    }

    public Float getInspQty() {
        return inspQty;
    }

    public void setInspQty(Float inspQty) {
        this.inspQty = inspQty;
    }

    public String getExpiredDate() {
        return expiredDate;
    }

    public void setExpiredDate(String expiredDate) {
        this.expiredDate = expiredDate;
    }

    public String getPrdDate() {
        return prdDate;
    }

    public void setPrdDate(String prdDate) {
        this.prdDate = prdDate;
    }

    public String getLotNo() {
        return lotNo;
    }

    public void setLotNo(String lotNo) {
        this.lotNo = lotNo;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getInvoiceNo() {
        return invoiceNo;
    }

    public void setInvoiceNo(String invoiceNo) {
        this.invoiceNo = invoiceNo;
    }

    public String getPoNo() {
        return poNo;
    }

    public void setPoNo(String poNo) {
        this.poNo = poNo;
    }

    public String getBlNo() {
        return blNo;
    }

    public void setBlNo(String blNo) {
        this.blNo = blNo;
    }

    public String getItemRemarks() {
        return itemRemarks;
    }

    public void setItemRemarks(String itemRemarks) {
        this.itemRemarks = itemRemarks;
    }
}
