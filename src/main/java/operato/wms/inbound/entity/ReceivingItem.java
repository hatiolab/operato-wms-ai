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

@Table(name = "receiving_items", idStrategy = GenerationRule.UUID, uniqueFields="receivingId,domainId", indexes = {
	@Index(name = "ix_receiving_items_0", columnList = "rcv_seq,rcv_exp_seq,receiving_id,domain_id", unique = true),
	@Index(name = "ix_receiving_items_1", columnList = "invoice_no,domain_id"),
	@Index(name = "ix_receiving_items_2", columnList = "bl_no,domain_id")
})
public class ReceivingItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 809570530541891514L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "receiving_id", nullable = false, length = 40)
	private String receivingId;

	@Column (name = "rcv_exp_seq", nullable = false)
	private Integer rcvExpSeq;

	@Column (name = "rcv_seq")
	private Integer rcvSeq;

	@Column (name = "status", length = 20)
	private String status;

	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;
	
    @Column (name = "sku_nm", length = 255)
    private String skuNm;

	@Column (name = "erp_part_no", length = 30)
	private String erpPartNo;

	@Column (name = "origin", length = 30)
	private String origin;
	
	@Column (name = "owner", length = 32)
	private String owner;

	@Column (name = "rcv_exp_date", nullable = false, length = 10)
	private String rcvExpDate;

	@Column (name = "rcv_date", length = 10)
	private String rcvDate;

	@Column (name = "total_exp_qty", nullable = false)
	private Double totalExpQty;

	@Column (name = "rcv_exp_qty", nullable = false)
	private Double rcvExpQty;
	
	@Column (name = "exp_pallet_qty")
    private Integer expPalletQty;

	@Column (name = "exp_box_qty")
	private Integer expBoxQty;

	@Column (name = "exp_ea_qty")
	private Double expEaQty;

	@Column (name = "rcv_qty")
	private Double rcvQty;
	
	@Column (name = "rcv_pallet_qty")
    private Integer rcvPalletQty;

	@Column (name = "rcv_box_qty")
	private Integer rcvBoxQty;

	@Column (name = "rcv_ea_qty")
	private Double rcvEaQty;

	@Column (name = "loc_cd", length = 20)
	private String locCd;

	@Column (name = "item_type", length = 20)
	private String itemType;

	@Column (name = "insp_qty")
	private Double inspQty;

	@Column (name = "expired_date", length = 10)
	private String expiredDate;

	@Column (name = "prd_date", length = 10)
	private String prdDate;

	@Column (name = "lot_no", length = 30)
	private String lotNo;

	@Column (name = "barcode", length = 40)
	private String barcode;

	@Column (name = "invoice_no", length = 30)
	private String invoiceNo;

	@Column (name = "bl_no", length = 30)
	private String blNo;

    @Column (name = "po_no", length = 30)
    private String poNo;
    
    @Column (name = "pallet_cd", length = 30)
    private String palletCd;
    
	@Column (name = "remarks", length = 1000)
	private String remarks;
	
    @Column (name = "attr01", length = 100)
    private String attr01;

    @Column (name = "attr02", length = 100)
    private String attr02;

    @Column (name = "attr03", length = 100)
    private String attr03;

    @Column (name = "attr04", length = 100)
    private String attr04;

    @Column (name = "attr05", length = 100)
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
        
        if(this.totalExpQty == null || this.totalExpQty == 0) {
            this.totalExpQty = this.rcvExpQty; 
        }
        
        if(this.rcvExpQty == null || this.rcvExpQty == 0) {
            this.rcvExpQty = this.totalExpQty;
        }
        
        if(this.rcvSeq == null || this.rcvSeq == 0) {
            this.rcvSeq = this.rcvExpSeq;
        }
        
        if(this.status == null) {
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
        	isInQtyAutoSettingFlag = BeanUtil.get(RuntimeConfigService.class).getRuntimeConfigValue(receiving.getComCd(), receiving.getWhCd(), WmsInboundConfigConstants.RECEIPT_QTY_AUTO_SETTING_FLAG);
        }
        
        if(receiving == null) {
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
        	if ( ValueUtil.isNotEmpty(sku) && ValueUtil.isEqual(receiving.getStatus(), WmsInboundConstants.STATUS_START) && ValueUtil.isNotEmpty(this.rcvQty) && ValueUtil.isNotEqual(this.rcvQty, 0.0) ) {
        		// 입고 수량이 0이 아닌 경우 : 팔레트, 박스, 낱개 수량 계산 
        		this.setInQtyFromRcvQty(sku);
        	} else if ( ValueUtil.isNotEmpty(sku) && (ValueUtil.isEmpty(this.rcvQty) || ValueUtil.isEqual(this.rcvQty, 0.0)) ) {
        		// 입고 수량이 0인 경우 : 팔레트, 박스, 낱개 수량을 바탕으로 입고 수량 계산 
        		this.setRcvQtyFromInQty(sku);
        	}
        	
        }
        
    } 
    
    /**
     * 입고 수량을 바탕으로 팔레트, 박스, 낱개 수량 계산 
     * @param sku
     */
    public void setInQtyFromRcvQty(SKU sku) {
    	// 입고 수량이 0이 아닌 경우 : 팔레트, 박스, 낱개 수량 계산 
		if ( ValueUtil.isNotEmpty(sku) && ValueUtil.isNotEmpty(sku.getPltInQty()) && ValueUtil.isNotEqual(sku.getPltInQty(), 0) && ValueUtil.isNotEmpty(sku.getBoxInQty()) && ValueUtil.isNotEqual(sku.getBoxInQty(), 0) ) {
			// 팔레트 수량 계산 : 총수량 / 팔레트 박스 입수
			this.rcvPalletQty = ValueUtil.toInteger(Math.floor(this.rcvQty / (sku.getPltInQty() * sku.getBoxInQty())));
			// 박스 수량 계산 : (총수량 - (팔레트 수 * 팔레트 입수)) / 박스 입수 
			this.rcvBoxQty = ValueUtil.toInteger(Math.floor((this.rcvQty - (this.rcvPalletQty * (sku.getPltInQty() * sku.getBoxInQty()))) / sku.getBoxInQty()));
			// 낱개 수량 계산 : 총 수량 - (팔레트 수 * 팔레트 입수) - (박스 수 * 박스 입수)
			this.rcvEaQty = this.rcvQty - (this.rcvPalletQty * (sku.getPltInQty() * sku.getBoxInQty())) - (this.rcvBoxQty * sku.getBoxInQty());
		} else {
			this.rcvPalletQty = (this.rcvPalletQty == null) ? 0 : this.rcvPalletQty;
			this.rcvBoxQty = (this.rcvBoxQty == null) ? 0 : this.rcvBoxQty;
			this.rcvEaQty = (this.rcvEaQty == null) ? 0.0 : this.rcvEaQty;
		}
    }
    
    /**
     * 팔레트, 박스, 낱개 수량을 바탕으로 입고 수량 계산 
     * @param sku
     */
    public void setRcvQtyFromInQty(SKU sku) {
    	// 입고 수량 초기화 
    	this.rcvQty = 0.0;
    	
    	// 입고 수량이 0인 경우 : 팔레트, 박스, 낱개 수량을 바탕으로 입고 수량 계산 
		if ( ValueUtil.isNotEmpty(this.rcvPalletQty) && ValueUtil.isNotEqual(this.rcvPalletQty, 0) ) {
			// 입고 수량에 팔레트 수량 추가 
			this.rcvQty = this.rcvQty + (this.rcvPalletQty * sku.getPltInQty() * sku.getBoxInQty());
		}
		if ( ValueUtil.isNotEmpty(this.rcvBoxQty) && ValueUtil.isNotEqual(this.rcvBoxQty, 0) ) {
			// 입고 수량에 박스 수량 추가 
			this.rcvQty = this.rcvQty + (this.rcvBoxQty * sku.getBoxInQty());
		}
		if ( ValueUtil.isNotEmpty(this.rcvEaQty) && ValueUtil.isNotEqual(this.rcvEaQty, 0) ) {
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
        
        
        if ( ValueUtil.isEmpty(this.barcode) ) {
        	splitItem.setBarcode(null);
        	splitItem.setLotNo(null);
        	splitItem.setExpiredDate(null);
        }
        
        if(this.expPalletQty != null && this.expPalletQty > 0) {
            if(this.expPalletQty < this.rcvPalletQty) {
                throw new ElidomRuntimeException("입고 팔레트 수량이 예정 팔레트 수량 보다 큽니다.");
            }
            splitItem.setExpPalletQty(this.expPalletQty - this.rcvPalletQty);
        }
        
        if(this.expBoxQty != null && this.expBoxQty > 0) {
            if(this.expBoxQty < this.rcvBoxQty) {
                throw new ElidomRuntimeException("입고 박스 수량이 예정 박스 수량 보다 큽니다.");
            }
            splitItem.setExpBoxQty(this.expBoxQty - this.rcvBoxQty);
        }
        
        IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
        String sql = "select max(rcv_seq) from receiving_items where domain_id = :domainId and receiving_id = :receivingId";
        int nextRcvSeq = queryMgr.selectBySql(sql, ValueUtil.newMap("domainId,receivingId", this.domainId, this.receivingId), Integer.class) + 1;
        splitItem.setRcvSeq(nextRcvSeq);
        
        if(saveSplit) {
            queryMgr.insert(splitItem);
        }
        
        this.rcvExpQty = this.rcvQty;
        this.expPalletQty = this.rcvPalletQty;
        this.expBoxQty = this.rcvBoxQty;
        
        if(saveMain) {
            queryMgr.update(this);
        }
        
        return splitItem;
    }
}
