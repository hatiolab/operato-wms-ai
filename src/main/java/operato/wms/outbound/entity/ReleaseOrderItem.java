package operato.wms.outbound.entity;

import operato.wms.outbound.query.store.OutboundQueryStore;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.ValueUtil;

@Table(name = "release_order_items", idStrategy = GenerationRule.UUID, indexes = {
    @Index(name = "ix_release_order_items_0", columnList = "domain_id,release_order_id"),
    @Index(name = "ix_release_order_items_1", columnList = "domain_id,release_order_id,rls_line_no,line_no"),
    @Index(name = "ix_release_order_items_2", columnList = "domain_id,release_order_id,sku_cd"),
    @Index(name = "ix_release_order_items_3", columnList = "domain_id,release_order_id,po_no"),
    @Index(name = "ix_release_order_items_4", columnList = "domain_id,release_order_id,invoice_no"),
    @Index(name = "ix_release_order_items_5", columnList = "domain_id,release_order_id,lot_no"),
    @Index(name = "ix_release_order_items_6", columnList = "domain_id,release_order_id,status"),
    @Index(name = "ix_release_order_items_7", columnList = "domain_id,release_order_id,barcode")
})
public class ReleaseOrderItem extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 881634757168854791L;
	
	/**
     * 출고 상태 - REG (출고 등록 중)
     */
    public static final String STATUS_REG = "REG";
    /**
     * 출고 상태 - REQ (출고 요청)
     */
    public static final String STATUS_REQ = "REQ";
    /**
     * 출고 상태 - WAIT (출고 요청 확인)
     */
    public static final String STATUS_WAIT = "WAIT";
    /**
     * 출고 상태 - READY (출고지시 대기)
     */
    public static final String STATUS_READY = "READY";
    /**
     * 출고 상태 - RUN (출고 작업 중)
     */
    public static final String STATUS_RUN = "RUN";
    /**
     * 출고 상태 - PICKED (피킹 완료)
     */
    public static final String STATUS_PICKED = "PICKED";
    /**
     * 출고 상태 - END (출고 완료)
     */
    public static final String STATUS_END = "END";
    /**
     * 출고 상태 - CANCEL (출고 취소)
     */
    public static final String STATUS_CANCEL = "CANCEL";

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "release_order_id", nullable = false, length = 40)
	private String releaseOrderId;

    @Column (name = "rank")
    private Integer rank;
    
    @Column (name = "rls_line_no", length = 5)
    private String rlsLineNo;
    
	@Column (name = "line_no", nullable = false, length = 5)
	private String lineNo;
	
	@Column (name = "rls_exp_seq")
	private Integer rlsExpSeq;

	@Column (name = "rls_seq")
	private Integer rlsSeq;

	@Column (name = "sku_cd", nullable = false, length = 30)
	private String skuCd;

	@Column (name = "sku_nm")
	private String skuNm;

	@Column (name = "po_no", length = 50)
	private String poNo;

	@Column (name = "do_no", length = 50)
	private String doNo;

	@Column (name = "invoice_no", length = 50)
	private String invoiceNo;

    @Column (name = "tot_ord_qty")
    private Double totOrdQty;
    
	@Column (name = "ord_qty", nullable = false)
	private Double ordQty;

	@Column (name = "ord_pallet_qty")
	private Double ordPalletQty;

	@Column (name = "ord_box_qty")
	private Double ordBoxQty;

	@Column (name = "ord_ea_qty")
	private Double ordEaQty;

	@Column (name = "rls_qty")
	private Double rlsQty;

	@Column (name = "rpt_qty")
	private Double rptQty;

	@Column (name = "expired_date", length = 10)
	private String expiredDate;

	@Column (name = "prod_date", length = 10)
	private String prodDate;

	@Column (name = "lot_no", length = 50)
	private String lotNo;

	@Column (name = "serial_no", length = 50)
	private String serialNo;

	@Column (name = "barcode", length = 50)
	private String barcode;

	@Column (name = "zone_cd", length = 30)
	private String zoneCd;

	@Column (name = "loc_cd", length = 30)
	private String locCd;
	
	@Column (name = "pallet_cd", length = 30)
    private String palletCd;

	@Column (name = "status", length = 20)
	private String status;

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
	
	public ReleaseOrderItem() {
	}
	
    public ReleaseOrderItem(String id) {
        this.id = id;
    }
    
    public ReleaseOrderItem(Long domainId, String releaseOrderId) {
        this.domainId = domainId;
        this.releaseOrderId = releaseOrderId;
    }
	
	public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getReleaseOrderId() {
        return releaseOrderId;
    }

    public void setReleaseOrderId(String releaseOrderId) {
        this.releaseOrderId = releaseOrderId;
    }

    public Integer getRank() {
        return rank;
    }

    public void setRank(Integer rank) {
        this.rank = rank;
    }

    public String getRlsLineNo() {
        return rlsLineNo;
    }

    public void setRlsLineNo(String rlsLineNo) {
        this.rlsLineNo = rlsLineNo;
    }

    public String getLineNo() {
        return lineNo;
    }

    public void setLineNo(String lineNo) {
        this.lineNo = lineNo;
    }

	public Integer getRlsExpSeq() {
		return rlsExpSeq;
	}

	public void setRlsExpSeq(Integer rlsExpSeq) {
		this.rlsExpSeq = rlsExpSeq;
	}

	public Integer getRlsSeq() {
		return rlsSeq;
	}

	public void setRlsSeq(Integer rlsSeq) {
		this.rlsSeq = rlsSeq;
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

    public String getPoNo() {
        return poNo;
    }

    public void setPoNo(String poNo) {
        this.poNo = poNo;
    }

    public String getDoNo() {
        return doNo;
    }

    public void setDoNo(String doNo) {
        this.doNo = doNo;
    }

    public String getInvoiceNo() {
        return invoiceNo;
    }

    public void setInvoiceNo(String invoiceNo) {
        this.invoiceNo = invoiceNo;
    }

    public Double getTotOrdQty() {
        return totOrdQty;
    }

    public void setTotOrdQty(Double totOrdQty) {
        this.totOrdQty = totOrdQty;
    }

    public Double getOrdQty() {
        return ordQty;
    }

    public void setOrdQty(Double ordQty) {
        this.ordQty = ordQty;
    }

    public Double getOrdPalletQty() {
        return ordPalletQty;
    }

    public void setOrdPalletQty(Double ordPalletQty) {
        this.ordPalletQty = ordPalletQty;
    }

    public Double getOrdBoxQty() {
        return ordBoxQty;
    }

    public void setOrdBoxQty(Double ordBoxQty) {
        this.ordBoxQty = ordBoxQty;
    }

    public Double getOrdEaQty() {
        return ordEaQty;
    }

    public void setOrdEaQty(Double ordEaQty) {
        this.ordEaQty = ordEaQty;
    }

    public Double getRlsQty() {
        return rlsQty;
    }

    public void setRlsQty(Double rlsQty) {
        this.rlsQty = rlsQty;
    }

    public Double getRptQty() {
        return rptQty;
    }

    public void setRptQty(Double rptQty) {
        this.rptQty = rptQty;
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

    public String getZoneCd() {
        return zoneCd;
    }

    public void setZoneCd(String zoneCd) {
        this.zoneCd = zoneCd;
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

	public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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
        
        // 라인 번호 : lineNo = rlsExpSeq (등록 번호) 
        // 출고 라인 번호 : rlsLineNo = rlsSeq (작업 번호)
        
        // Line No 설정 
        if (ValueUtil.isEmpty(this.lineNo)) {
        	String sql = BeanUtil.get(OutboundQueryStore.class).getNextReleaseOrderLineNo();
        	Integer nextLineNo = BeanUtil.get(IQueryManager.class).selectBySql(sql, ValueUtil.newMap("domainId,releaseOrderId", Domain.currentDomainId(), this.releaseOrderId), Integer.class);
        	this.setLineNo(ValueUtil.toString(nextLineNo));
        }
        
        // 출고 라인 번호 설정
        if(ValueUtil.isEmpty(this.rlsLineNo)) {
            this.rlsLineNo = this.lineNo;
        }
        
        this.setRlsExpSeq(ValueUtil.toInteger(this.getLineNo()));
        this.setRlsSeq(ValueUtil.toInteger(this.getRlsLineNo()));
        
        // Status 설정
        if (ValueUtil.isEmpty(this.status)) {
        	this.setStatus(ReleaseOrderItem.STATUS_REG);
        }
        
        // 수량 기본 설정
        this.totOrdQty = this.ordQty;
        
        if(this.ordPalletQty == null) {
            this.ordPalletQty = 0.0;
        }

        if(this.ordBoxQty == null) {
            this.ordBoxQty = 0.0;
        }

        if(this.ordEaQty == null) {
            this.ordEaQty = 0.0;
        }

        if(this.rlsQty == null) {
            this.rlsQty = 0.0;
        }

        if(this.rptQty == null) {
            this.rptQty = 0.0;
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
    public ReleaseOrderItem split(Double splitQty, boolean saveMain, boolean saveSplit) {
        ReleaseOrderItem splitItem = ValueUtil.populate(this, new ReleaseOrderItem());
        
        splitItem.setId(null);
        splitItem.setZoneCd(null);
        splitItem.setLocCd(null);
        splitItem.setBarcode(null);
        splitItem.setLotNo(null);
        splitItem.setExpiredDate(null);
        splitItem.setProdDate(null);
        splitItem.setSerialNo(null);
        splitItem.setTotOrdQty(this.totOrdQty);
        splitItem.setOrdQty(splitQty);
        splitItem.setRlsQty(0.0);
        splitItem.setCreatedAt(null);
        splitItem.setUpdatedAt(null);
        
        IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
        String sql = "select count(id) from release_order_items where domain_id = :domainId and release_order_id = :releaseOrderId";
        int nextRank = queryMgr.selectBySql(sql, ValueUtil.newMap("domainId,releaseOrderId", this.domainId, this.releaseOrderId), Integer.class) + 1;
        splitItem.setRank(nextRank);
        splitItem.setRlsLineNo("" + nextRank);
        splitItem.setRlsSeq(nextRank);
        
        if(saveSplit) {
            queryMgr.insert(splitItem);
        }
        
        this.ordQty = this.rlsQty;
        
        if(saveMain) {
            queryMgr.update(this);
        }
        
        return splitItem;
    }
}
