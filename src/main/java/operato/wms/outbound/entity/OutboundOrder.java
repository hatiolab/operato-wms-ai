package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

/**
 * 출고 주문 헤더 & 디테일 복합 엔티티 (뷰)
 * 
 * @author shortstop
 */
@Table(name = "outbound_orders", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class OutboundOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 644324486053449740L;

	@PrimaryKey
	@Column (name = "id", length = 100)
	private String id;

	@Column (name = "rls_ord_no", nullable = false, length = 30)
	private String rlsOrdNo;

	@Column (name = "rls_req_no", length = 30)
	private String rlsReqNo;

	@Column (name = "rls_req_date", nullable = false, length = 10)
	private String rlsReqDate;

	@Column (name = "rls_ord_date", nullable = false, length = 10)
	private String rlsOrdDate;

	@Column (name = "wave_no", length = 30)
	private String waveNo;

	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

	@Column (name = "cust_cd", nullable = false, length = 30)
	private String custCd;

	@Column (name = "biz_type", nullable = false, length = 10)
	private String bizType;

	@Column (name = "rls_type", length = 20)
	private String rlsType;

	@Column (name = "rls_exe_type", length = 20)
	private String rlsExeType;

	@Column (name = "dlv_type", length = 20)
	private String dlvType;

	@Column (name = "to_wh_cd", length = 30)
	private String toWhCd;

	@Column (name = "box_id", length = 30)
	private String boxId;

	@Column (name = "box_seq")
	private Integer boxSeq;

	@Column (name = "box_type", length = 20)
	private String boxType;
	
    @Column (name = "total_box")
    private Integer totalBox;
    
    @Column (name = "box_wt")
    private Double boxWt;

	@Column (name = "class_cd", length = 50)
	private String classCd;

	@Column (name = "report_no", length = 40)
	private String reportNo;

	@Column (name = "export_flag")
	private Boolean exportFlag;

	@Column (name = "label_template_cd", length = 36)
	private String labelTemplateCd;

	@Column (name = "status", length = 20)
	private String status;

	@Column (name = "started_at", length = 20)
	private String startedAt;

	@Column (name = "finished_at", length = 20)
	private String finishedAt;

	@Column (name = "reported_at", length = 20)
	private String reportedAt;

    @Column (name = "rls_line_no", length = 5)
    private String rlsLineNo;
    
	@Column (name = "line_no", length = 5)
	private String lineNo;

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

	@Column (name = "item_status", length = 20)
	private String itemStatus;

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
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getRlsOrdNo() {
		return rlsOrdNo;
	}

	public void setRlsOrdNo(String rlsOrdNo) {
		this.rlsOrdNo = rlsOrdNo;
	}

	public String getRlsReqNo() {
		return rlsReqNo;
	}

	public void setRlsReqNo(String rlsReqNo) {
		this.rlsReqNo = rlsReqNo;
	}

	public String getRlsReqDate() {
		return rlsReqDate;
	}

	public void setRlsReqDate(String rlsReqDate) {
		this.rlsReqDate = rlsReqDate;
	}

	public String getRlsOrdDate() {
		return rlsOrdDate;
	}

	public void setRlsOrdDate(String rlsOrdDate) {
		this.rlsOrdDate = rlsOrdDate;
	}

	public String getWaveNo() {
		return waveNo;
	}

	public void setWaveNo(String waveNo) {
		this.waveNo = waveNo;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getCustCd() {
		return custCd;
	}

	public void setCustCd(String custCd) {
		this.custCd = custCd;
	}

	public String getBizType() {
		return bizType;
	}

	public void setBizType(String bizType) {
		this.bizType = bizType;
	}

	public String getRlsType() {
		return rlsType;
	}

	public void setRlsType(String rlsType) {
		this.rlsType = rlsType;
	}

	public String getRlsExeType() {
		return rlsExeType;
	}

	public void setRlsExeType(String rlsExeType) {
		this.rlsExeType = rlsExeType;
	}

	public String getDlvType() {
		return dlvType;
	}

	public void setDlvType(String dlvType) {
		this.dlvType = dlvType;
	}

	public String getToWhCd() {
		return toWhCd;
	}

	public void setToWhCd(String toWhCd) {
		this.toWhCd = toWhCd;
	}

	public String getBoxId() {
		return boxId;
	}

	public void setBoxId(String boxId) {
		this.boxId = boxId;
	}

	public Integer getBoxSeq() {
		return boxSeq;
	}

	public void setBoxSeq(Integer boxSeq) {
		this.boxSeq = boxSeq;
	}

	public String getBoxType() {
		return boxType;
	}

	public void setBoxType(String boxType) {
		this.boxType = boxType;
	}

	public String getClassCd() {
		return classCd;
	}

	public void setClassCd(String classCd) {
		this.classCd = classCd;
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

    public String getReportNo() {
		return reportNo;
	}

	public void setReportNo(String reportNo) {
		this.reportNo = reportNo;
	}

	public Boolean getExportFlag() {
		return exportFlag;
	}

	public void setExportFlag(Boolean exportFlag) {
		this.exportFlag = exportFlag;
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

	public String getFinishedAt() {
		return finishedAt;
	}

	public void setFinishedAt(String finishedAt) {
		this.finishedAt = finishedAt;
	}

	public String getReportedAt() {
		return reportedAt;
	}

	public void setReportedAt(String reportedAt) {
		this.reportedAt = reportedAt;
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

	public String getItemStatus() {
		return itemStatus;
	}

	public void setItemStatus(String itemStatus) {
		this.itemStatus = itemStatus;
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
}
