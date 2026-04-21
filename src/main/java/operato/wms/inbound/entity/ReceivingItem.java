package operato.wms.inbound.entity;

import operato.wms.base.entity.SKU;
import operato.wms.base.service.RuntimeConfigService;
import operato.wms.inbound.WmsInboundConfigConstants;
import operato.wms.inbound.WmsInboundConstants;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

@Table(name = "receiving_items", idStrategy = GenerationRule.UUID, uniqueFields = "receivingId,domainId", indexes = {
        @Index(name = "ix_receiving_items_0", columnList = "rcv_seq,rcv_exp_seq,receiving_id,domain_id", unique = true),
        @Index(name = "ix_receiving_items_1", columnList = "invoice_no,domain_id"),
        @Index(name = "ix_receiving_items_2", columnList = "bl_no,domain_id")
})
/**
 * 입고 상세 아이템
 *
 * 입고 마스터(Receiving)에 연결된 SKU별 입고 예정·실적 상세 정보를 관리한다.
 * 수량 단위(팔레트/박스/EA), 검수 결과, 로트·시리얼·유통기한 등 이력 추적 정보를 포함한다.
 *
 * @author shortstop
 */
public class ReceivingItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 809570530541891514L;

    /**
     * ID
     */
    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    /**
     * RECEIVING ID - 소속 입고 마스터(Receiving)의 UUID
     */
    @Column(name = "receiving_id", nullable = false, length = 40)
    private String receivingId;

    /**
     * 입고예정순번 - 입고 예정 정보 기준 순번 (ERP 발행 순서)
     */
    @Column(name = "rcv_exp_seq", nullable = false)
    private Integer rcvExpSeq;

    /**
     * 입고순번 - 실제 입고 작업 순번. 수량 분할 시 새 순번이 부여됨
     */
    @Column(name = "rcv_seq")
    private Integer rcvSeq;

    /**
     * 입고상태 - 아이템별 진행 상태
     * INWORK: 작성 중 / REQUEST: 요청 / READY: 대기 / START: 진행 중 / END: 완료
     */
    @Column(name = "status", length = 20)
    private String status;

    /**
     * 상품코드 - 입고 대상 SKU 코드
     */
    @Column(name = "sku_cd", nullable = false, length = 30)
    private String skuCd;

    /**
     * 상품명 - 입고 대상 SKU 명칭 (조회용 비정규화 필드)
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
     * 입고일자 - 실제 입고가 완료된 날짜 (yyyy-MM-dd). 완료 처리 시 자동 세팅
     */
    @Column(name = "rcv_date", length = 10)
    private String rcvDate;

    /**
     * 총입고예정수량 - 이 SKU의 전체 예정 수량 (분할 전 원본 수량)
     */
    @Column(name = "total_exp_qty", nullable = false)
    private Double totalExpQty;

    /**
     * 입고예정수량 - 이 순번의 입고 예정 수량 (분할 후 잔여 예정 수량)
     */
    @Column(name = "rcv_exp_qty", nullable = false)
    private Double rcvExpQty;

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
    private Double expEaQty;

    /**
     * 입고수량 - 실제 입고 처리된 수량
     */
    @Column(name = "rcv_qty")
    private Double rcvQty;

    /**
     * 입고(PALLET) - 실제 입고된 팔레트 수
     */
    @Column(name = "rcv_pallet_qty")
    private Integer rcvPalletQty;

    /**
     * 입고(BOX) - 실제 입고된 박스 수
     */
    @Column(name = "rcv_box_qty")
    private Integer rcvBoxQty;

    /**
     * 입고(EA) - 실제 입고된 낱개 수량
     */
    @Column(name = "rcv_ea_qty")
    private Double rcvEaQty;

    /**
     * 로케이션 - 입고 상품이 적치될 (또는 적치된) 로케이션 코드
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
    private Double inspQty;

    /**
     * 유효일자 - 상품의 유통기한 (yyyy-MM-dd). SKU.lotFlag=true 시 또는 수동 입력
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
     * 시리얼 번호 - 개체 식별 시리얼 번호. SKU.serialFlag=true인 경우 필수 입력
     */
    @Column(name = "serial_no", length = 40)
    private String serialNo;

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
     * B/L - 선하증권(Bill of Lading) 번호
     */
    @Column(name = "bl_no", length = 30)
    private String blNo;

    /**
     * PO 번호 - 화주사 구매발주(Purchase Order) 번호
     */
    @Column(name = "po_no", length = 30)
    private String poNo;

    /**
     * 팔레트 코드 - 입고 상품이 적재된 팔레트 코드
     */
    @Column(name = "pallet_cd", length = 30)
    private String palletCd;

    /**
     * 비고 - 운영 메모 또는 특이사항 자유 기록
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

    public ReceivingItem() {
    }

    public ReceivingItem(String id) {
        this.id = id;
    }

    public ReceivingItem(Long domainId, String receivingId) {
        this.domainId = domainId;
        this.receivingId = receivingId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getReceivingId() {
        return receivingId;
    }

    public void setReceivingId(String receivingId) {
        this.receivingId = receivingId;
    }

    public Integer getRcvExpSeq() {
        return rcvExpSeq;
    }

    public void setRcvExpSeq(Integer rcvExpSeq) {
        this.rcvExpSeq = rcvExpSeq;
    }

    public Integer getRcvSeq() {
        return rcvSeq;
    }

    public void setRcvSeq(Integer rcvSeq) {
        this.rcvSeq = rcvSeq;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public String getRcvDate() {
        return rcvDate;
    }

    public void setRcvDate(String rcvDate) {
        this.rcvDate = rcvDate;
    }

    public Double getTotalExpQty() {
        return totalExpQty;
    }

    public void setTotalExpQty(Double totalExpQty) {
        this.totalExpQty = totalExpQty;
    }

    public Double getRcvExpQty() {
        return rcvExpQty;
    }

    public void setRcvExpQty(Double rcvExpQty) {
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

    public Double getExpEaQty() {
        return expEaQty;
    }

    public void setExpEaQty(Double expEaQty) {
        this.expEaQty = expEaQty;
    }

    public Double getRcvQty() {
        return rcvQty;
    }

    public void setRcvQty(Double rcvQty) {
        this.rcvQty = rcvQty;
    }

    public Integer getRcvPalletQty() {
        return rcvPalletQty;
    }

    public void setRcvPalletQty(Integer rcvPalletQty) {
        this.rcvPalletQty = rcvPalletQty;
    }

    public Integer getRcvBoxQty() {
        return rcvBoxQty;
    }

    public void setRcvBoxQty(Integer rcvBoxQty) {
        this.rcvBoxQty = rcvBoxQty;
    }

    public Double getRcvEaQty() {
        return rcvEaQty;
    }

    public void setRcvEaQty(Double rcvEaQty) {
        this.rcvEaQty = rcvEaQty;
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

    public Double getInspQty() {
        return inspQty;
    }

    public void setInspQty(Double inspQty) {
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

    public String getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(String serialNo) {
        this.serialNo = serialNo;
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

    public String getBlNo() {
        return blNo;
    }

    public void setBlNo(String blNo) {
        this.blNo = blNo;
    }

    public String getPoNo() {
        return poNo;
    }

    public void setPoNo(String poNo) {
        this.poNo = poNo;
    }

    public String getPalletCd() {
        return palletCd;
    }

    public void setPalletCd(String palletCd) {
        this.palletCd = palletCd;
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

        if (this.totalExpQty == null || this.totalExpQty == 0) {
            this.totalExpQty = this.rcvExpQty;
        }

        if (this.rcvExpQty == null || this.rcvExpQty == 0) {
            this.rcvExpQty = this.totalExpQty;
        }

        if (this.rcvSeq == null || this.rcvSeq == 0) {
            this.rcvSeq = this.rcvExpSeq;
        }

        if (this.status == null) {
            this.status = WmsInboundConstants.STATUS_INWORK;
        }

        if (ValueUtil.isEmpty(this.rcvExpDate)) {
            this.setRcvExpDate(this.rcvExpDate);
        }

    }

    @Override
    public void beforeUpdate() {
        super.beforeUpdate();

        IQueryManager queryManager = BeanUtil.get(IQueryManager.class);

        Receiving receiving = null;
        String isInQtyAutoSettingFlag = null;

        if (ValueUtil.isNotEmpty(this.receivingId)) {
            receiving = queryManager.select(Receiving.class, receivingId);
            isInQtyAutoSettingFlag = BeanUtil.get(RuntimeConfigService.class).getRuntimeConfigValue(
                    receiving.getComCd(), receiving.getWhCd(), WmsInboundConfigConstants.RECEIPT_QTY_AUTO_SETTING_FLAG);
        }

        if (receiving == null) {
            throw new ElidomRuntimeException("입고 번호가 존재하지 않습니다.");
        }

        // 입수 수량 자동 계산을 사용 하는 경우
        if (ValueUtil.toBoolean(isInQtyAutoSettingFlag, false)) {
            SKU sku = null;
            if (ValueUtil.isNotEmpty(receiving) && ValueUtil.isNotEmpty(this.skuCd)) {
                sku = new SKU(this.domainId, receiving.getComCd(), this.skuCd);
                sku = queryManager.selectByCondition(SKU.class, sku);
            }

            // 수량 자동 계산
            if (ValueUtil.isNotEmpty(sku) && ValueUtil.isEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START)
                    && ValueUtil.isNotEmpty(this.rcvQty) && ValueUtil.isNotEqual(this.rcvQty, 0.0)) {
                // 입고 수량이 0이 아닌 경우 : 팔레트, 박스, 낱개 수량 계산
                this.setInQtyFromRcvQty(sku);
            } else if (ValueUtil.isNotEmpty(sku)
                    && (ValueUtil.isEmpty(this.rcvQty) || ValueUtil.isEqual(this.rcvQty, 0.0))) {
                // 입고 수량이 0인 경우 : 팔레트, 박스, 낱개 수량을 바탕으로 입고 수량 계산
                this.setRcvQtyFromInQty(sku);
            }

        }

    }

    /**
     * 입고 수량을 바탕으로 팔레트, 박스, 낱개 수량 계산
     * 
     * @param sku
     */
    public void setInQtyFromRcvQty(SKU sku) {
        // 입고 수량이 0이 아닌 경우 : 팔레트, 박스, 낱개 수량 계산
        if (ValueUtil.isNotEmpty(sku) && ValueUtil.isNotEmpty(sku.getPltInQty())
                && ValueUtil.isNotEqual(sku.getPltInQty(), 0) && ValueUtil.isNotEmpty(sku.getBoxInQty())
                && ValueUtil.isNotEqual(sku.getBoxInQty(), 0)) {
            // 팔레트 수량 계산 : 총수량 / 팔레트 박스 입수
            this.rcvPalletQty = ValueUtil.toInteger(Math.floor(this.rcvQty / (sku.getPltInQty() * sku.getBoxInQty())));
            // 박스 수량 계산 : (총수량 - (팔레트 수 * 팔레트 입수)) / 박스 입수
            this.rcvBoxQty = ValueUtil.toInteger(Math.floor(
                    (this.rcvQty - (this.rcvPalletQty * (sku.getPltInQty() * sku.getBoxInQty()))) / sku.getBoxInQty()));
            // 낱개 수량 계산 : 총 수량 - (팔레트 수 * 팔레트 입수) - (박스 수 * 박스 입수)
            this.rcvEaQty = this.rcvQty - (this.rcvPalletQty * (sku.getPltInQty() * sku.getBoxInQty()))
                    - (this.rcvBoxQty * sku.getBoxInQty());
        } else {
            this.rcvPalletQty = (this.rcvPalletQty == null) ? 0 : this.rcvPalletQty;
            this.rcvBoxQty = (this.rcvBoxQty == null) ? 0 : this.rcvBoxQty;
            this.rcvEaQty = (this.rcvEaQty == null) ? 0.0 : this.rcvEaQty;
        }
    }

    /**
     * 팔레트, 박스, 낱개 수량을 바탕으로 입고 수량 계산
     * 
     * @param sku
     */
    public void setRcvQtyFromInQty(SKU sku) {
        // 입고 수량 초기화
        this.rcvQty = 0.0;

        // 입고 수량이 0인 경우 : 팔레트, 박스, 낱개 수량을 바탕으로 입고 수량 계산
        if (ValueUtil.isNotEmpty(this.rcvPalletQty) && ValueUtil.isNotEqual(this.rcvPalletQty, 0)) {
            // 입고 수량에 팔레트 수량 추가
            this.rcvQty = this.rcvQty + (this.rcvPalletQty * sku.getPltInQty() * sku.getBoxInQty());
        }
        if (ValueUtil.isNotEmpty(this.rcvBoxQty) && ValueUtil.isNotEqual(this.rcvBoxQty, 0)) {
            // 입고 수량에 박스 수량 추가
            this.rcvQty = this.rcvQty + (this.rcvBoxQty * sku.getBoxInQty());
        }
        if (ValueUtil.isNotEmpty(this.rcvEaQty) && ValueUtil.isNotEqual(this.rcvEaQty, 0)) {
            // 입고 수량에 낱개 수량 추가
            this.rcvQty = this.rcvQty + rcvEaQty;
        }
    }

    /**
     * 분할 처리
     * 
     * @param splitQty
     * @param saveMain
     * @param saveSplit
     * @return
     */
    public ReceivingItem split(Double splitQty, boolean saveMain, boolean saveSplit) {
        ReceivingItem splitItem = ValueUtil.populate(this, new ReceivingItem());

        splitItem.setId(null);
        splitItem.setItemType(null);
        splitItem.setInspQty(0.0);

        splitItem.setPrdDate(null);

        splitItem.setRcvExpQty(splitQty);
        splitItem.setRcvQty(0.0);
        splitItem.setRcvPalletQty(0);
        splitItem.setRcvBoxQty(0);
        splitItem.setCreatedAt(null);
        splitItem.setUpdatedAt(null);

        if (ValueUtil.isEmpty(this.barcode)) {
            splitItem.setBarcode(null);
            splitItem.setLotNo(null);
            splitItem.setExpiredDate(null);
        }

        if (this.expPalletQty != null && this.expPalletQty > 0) {
            if (this.expPalletQty < this.rcvPalletQty) {
                throw new ElidomRuntimeException("입고 팔레트 수량이 예정 팔레트 수량 보다 큽니다.");
            }
            splitItem.setExpPalletQty(this.expPalletQty - this.rcvPalletQty);
        }

        if (this.expBoxQty != null && this.expBoxQty > 0) {
            if (this.expBoxQty < this.rcvBoxQty) {
                throw new ElidomRuntimeException("입고 박스 수량이 예정 박스 수량 보다 큽니다.");
            }
            splitItem.setExpBoxQty(this.expBoxQty - this.rcvBoxQty);
        }

        IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
        String sql = "select max(rcv_seq) from receiving_items where domain_id = :domainId and receiving_id = :receivingId";
        int nextRcvSeq = queryMgr.selectBySql(sql,
                ValueUtil.newMap("domainId,receivingId", this.domainId, this.receivingId), Integer.class) + 1;
        splitItem.setRcvSeq(nextRcvSeq);

        if (saveSplit) {
            queryMgr.insert(splitItem);
        }

        this.rcvExpQty = this.rcvQty;
        this.expPalletQty = this.rcvPalletQty;
        this.expBoxQty = this.rcvBoxQty;

        if (saveMain) {
            queryMgr.update(this);
        }

        return splitItem;
    }
}
