package operato.wms.outbound.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;


/**
CREATE OR REPLACE VIEW release_order_status AS
select 
    ri.id,
    ro.rls_ord_no,ro.rls_req_no,ro.rls_req_date,ro.rls_ord_date,
    ro.wave_no,ro.wh_cd,ro.com_cd,ro.cust_cd,ro.biz_type,
    ro.rls_type,ro.rls_exe_type,ro.dlv_type,ro.to_wh_cd,
    ro.export_flag,ro.status,ro.requester_id,ro.total_box, 
    ro.box_wt,ro.started_at,ro.finished_at,ro.box_id,ro.box_type,
    ro.box_seq,COALESCE(ri.invoice_no, ro.invoice_no) as invoice_no,
    ri.rls_line_no,ri.line_no,ri.sku_cd,ri.sku_nm,ri.po_no,ri.do_no,
    ri.tot_ord_qty,ri.ord_qty,ri.rls_qty,ri.ord_pallet_qty,ri.ord_box_qty,
    ri.ord_ea_qty,ri.expired_date,ri.prod_date,ri.lot_no,ri.serial_no,
    ri.barcode,di.dlv_vend_cd,di.vehicle_no,di.dlv_no,di.sender_cd,
    di.sender_nm,di.sender_phone,di.sender_phone2,di.sender_zip_cd,
    di.sender_addr,di.sender_addr2,di.orderer_cd,di.orderer_nm,
    di.receiver_cd,di.receiver_nm,di.receiver_phone,di.receiver_phone2,
    di.receiver_zip_cd,di.receiver_addr,di.receiver_addr2,di.memo,
    ro.remarks,ri.attr01,ri.attr02,ri.attr03,ri.attr04,ri.attr05,
    ro.domain_id,ri.created_at,ri.updated_at
from
    release_orders ro
    inner join 
    release_order_items ri on ro.id = ri.release_order_id
    left outer join
    delivery_infos di on ro.id = di.release_order_id
order by
    ro.rls_ord_no desc, ri.rls_line_no desc
*/
/**
 * 출고 현황 조회를 위한 헤더 & 디테일 & 배송 정보 복합 엔티티 (뷰)
 * 
 * @author shortstop
 */
@Table(name = "release_order_status", ignoreDdl = true, idStrategy = GenerationRule.NONE)
public class ReleaseOrderStatus extends xyz.elidom.orm.entity.basic.DomainTimeStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 870573022622732174L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "rls_ord_no", length = 30)
	private String rlsOrdNo;

	@Column (name = "rls_req_no", length = 30)
	private String rlsReqNo;

	@Column (name = "rls_req_date", nullable = false, length = 10)
	private String rlsReqDate;

	@Column (name = "rls_ord_date", length = 10)
	private String rlsOrdDate;

	@Column (name = "wave_no", length = 30)
	private String waveNo;

    @Column (name = "wh_cd", nullable = false, length = 30)
    private String whCd;
    
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

	@Column (name = "export_flag")
	private Boolean exportFlag;

	@Column (name = "status", length = 20)
	private String status;
	
    @Column (name = "requester_id", length = 36)
    private String requesterId;

	@Column (name = "started_at", length = 20)
	private String startedAt;

	@Column (name = "finished_at", length = 20)
	private String finishedAt;

	@Column (name = "box_id", length = 30)
	private String boxId;

	@Column (name = "box_type", length = 20)
	private String boxType;

	@Column (name = "box_seq")
	private Integer boxSeq;
	
    @Column (name = "total_box")
    private Integer totalBox;
    
    @Column (name = "box_wt")
    private Double boxWt;
	
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

	@Column (name = "rls_qty")
	private Double rlsQty;

	@Column (name = "ord_pallet_qty")
	private Double ordPalletQty;

	@Column (name = "ord_box_qty")
	private Double ordBoxQty;

	@Column (name = "ord_ea_qty")
	private Double ordEaQty;

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

	@Column (name = "dlv_vend_cd", nullable = false, length = 30)
	private String dlvVendCd;

	@Column (name = "vehicle_no", length = 30)
	private String vehicleNo;

	@Column (name = "dlv_no", length = 30)
	private String dlvNo;

	@Column (name = "sender_cd", length = 30)
	private String senderCd;

	@Column (name = "sender_nm", length = 100)
	private String senderNm;

	@Column (name = "sender_phone", length = 20)
	private String senderPhone;

	@Column (name = "sender_phone2", length = 20)
	private String senderPhone2;

	@Column (name = "sender_zip_cd", length = 20)
	private String senderZipCd;

	@Column (name = "sender_addr")
	private String senderAddr;

	@Column (name = "sender_addr2")
	private String senderAddr2;

	@Column (name = "orderer_cd", length = 30)
	private String ordererCd;

	@Column (name = "orderer_nm", length = 100)
	private String ordererNm;

	@Column (name = "receiver_cd", length = 30)
	private String receiverCd;

	@Column (name = "receiver_nm", length = 100)
	private String receiverNm;

	@Column (name = "receiver_phone", length = 20)
	private String receiverPhone;

	@Column (name = "receiver_phone2", length = 20)
	private String receiverPhone2;

	@Column (name = "receiver_zip_cd", length = 20)
	private String receiverZipCd;

	@Column (name = "receiver_addr")
	private String receiverAddr;

	@Column (name = "receiver_addr2")
	private String receiverAddr2;

	@Column (name = "memo", length = 100)
	private String memo;

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

	public Boolean getExportFlag() {
		return exportFlag;
	}

	public void setExportFlag(Boolean exportFlag) {
		this.exportFlag = exportFlag;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getRequesterId() {
        return requesterId;
    }

    public void setRequesterId(String requesterId) {
        this.requesterId = requesterId;
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

	public String getBoxId() {
		return boxId;
	}

	public void setBoxId(String boxId) {
		this.boxId = boxId;
	}

	public String getBoxType() {
		return boxType;
	}

	public void setBoxType(String boxType) {
		this.boxType = boxType;
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

	public Integer getBoxSeq() {
		return boxSeq;
	}

	public void setBoxSeq(Integer boxSeq) {
		this.boxSeq = boxSeq;
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

	public Double getRlsQty() {
		return rlsQty;
	}

	public void setRlsQty(Double rlsQty) {
		this.rlsQty = rlsQty;
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

    public String getDlvVendCd() {
		return dlvVendCd;
	}

	public void setDlvVendCd(String dlvVendCd) {
		this.dlvVendCd = dlvVendCd;
	}

	public String getVehicleNo() {
		return vehicleNo;
	}

	public void setVehicleNo(String vehicleNo) {
		this.vehicleNo = vehicleNo;
	}

	public String getDlvNo() {
		return dlvNo;
	}

	public void setDlvNo(String dlvNo) {
		this.dlvNo = dlvNo;
	}

	public String getSenderCd() {
		return senderCd;
	}

	public void setSenderCd(String senderCd) {
		this.senderCd = senderCd;
	}

	public String getSenderNm() {
		return senderNm;
	}

	public void setSenderNm(String senderNm) {
		this.senderNm = senderNm;
	}

	public String getSenderPhone() {
		return senderPhone;
	}

	public void setSenderPhone(String senderPhone) {
		this.senderPhone = senderPhone;
	}

	public String getSenderPhone2() {
		return senderPhone2;
	}

	public void setSenderPhone2(String senderPhone2) {
		this.senderPhone2 = senderPhone2;
	}

	public String getSenderZipCd() {
		return senderZipCd;
	}

	public void setSenderZipCd(String senderZipCd) {
		this.senderZipCd = senderZipCd;
	}

	public String getSenderAddr() {
		return senderAddr;
	}

	public void setSenderAddr(String senderAddr) {
		this.senderAddr = senderAddr;
	}

	public String getSenderAddr2() {
		return senderAddr2;
	}

	public void setSenderAddr2(String senderAddr2) {
		this.senderAddr2 = senderAddr2;
	}

	public String getOrdererCd() {
		return ordererCd;
	}

	public void setOrdererCd(String ordererCd) {
		this.ordererCd = ordererCd;
	}

	public String getOrdererNm() {
		return ordererNm;
	}

	public void setOrdererNm(String ordererNm) {
		this.ordererNm = ordererNm;
	}

	public String getReceiverCd() {
		return receiverCd;
	}

	public void setReceiverCd(String receiverCd) {
		this.receiverCd = receiverCd;
	}

	public String getReceiverNm() {
		return receiverNm;
	}

	public void setReceiverNm(String receiverNm) {
		this.receiverNm = receiverNm;
	}

	public String getReceiverPhone() {
		return receiverPhone;
	}

	public void setReceiverPhone(String receiverPhone) {
		this.receiverPhone = receiverPhone;
	}

	public String getReceiverPhone2() {
		return receiverPhone2;
	}

	public void setReceiverPhone2(String receiverPhone2) {
		this.receiverPhone2 = receiverPhone2;
	}

	public String getReceiverZipCd() {
		return receiverZipCd;
	}

	public void setReceiverZipCd(String receiverZipCd) {
		this.receiverZipCd = receiverZipCd;
	}

	public String getReceiverAddr() {
		return receiverAddr;
	}

	public void setReceiverAddr(String receiverAddr) {
		this.receiverAddr = receiverAddr;
	}

	public String getReceiverAddr2() {
		return receiverAddr2;
	}

	public void setReceiverAddr2(String receiverAddr2) {
		this.receiverAddr2 = receiverAddr2;
	}

	public String getMemo() {
		return memo;
	}

	public void setMemo(String memo) {
		this.memo = memo;
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
