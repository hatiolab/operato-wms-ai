package operato.wms.outbound.entity;

import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

@Table(name = "release_orders", idStrategy = GenerationRule.UUID, uniqueFields="domainId,rlsOrdNo", indexes = {
	@Index(name = "ix_release_orders_0", columnList = "domain_id,rls_req_no", unique = true),
	@Index(name = "ix_release_orders_1", columnList = "domain_id,rls_ord_no", unique = true),
	@Index(name = "ix_release_orders_2", columnList = "domain_id,rls_req_date,rls_ord_no,status,export_flag"),
	@Index(name = "ix_release_orders_3", columnList = "domain_id,wave_no"),
	@Index(name = "ix_release_orders_4", columnList = "domain_id,com_cd,wh_cd"),
	@Index(name = "ix_release_orders_5", columnList = "domain_id,biz_type,rls_type,rls_exe_type,dlv_type"),
	@Index(name = "ix_release_orders_6", columnList = "domain_id,po_no,invoice_no,box_id")
})
public class ReleaseOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 359214403927582352L;
	
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

	@Column (name = "rls_ord_no", nullable = false, length = 30)
	private String rlsOrdNo;

	@Column (name = "rls_req_no", nullable = false, length = 30)
	private String rlsReqNo;

	@Column (name = "rls_req_date", nullable = false, length = 10)
	private String rlsReqDate;

	@Column (name = "rls_ord_date", length = 10)
	private String rlsOrdDate;

	@Column (name = "wave_no", length = 30)
	private String waveNo;

	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

	@Column (name = "cust_cd", nullable = false, length = 30)
	private String custCd;

	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	@Column (name = "biz_type", length = 10)
	private String bizType;

	@Column (name = "rls_type", length = 20)
	private String rlsType;

	@Column (name = "rls_exe_type", length = 20)
	private String rlsExeType;

	@Column (name = "dlv_type", length = 20)
	private String dlvType;

	@Column (name = "to_wh_cd", length = 30)
	private String toWhCd;
	
    @Column (name = "requester_id", length = 36)
    private String requesterId;

	@Column (name = "po_no", length = 30)
	private String poNo;

	@Column (name = "invoice_no", length = 30)
	private String invoiceNo;

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
	
	@Column (name = "erp_status", length = 20)
	private String erpStatus;

	@Column (name = "started_at", length = 20)
	private String startedAt;

	@Column (name = "finished_at", length = 20)
	private String finishedAt;

	@Column (name = "reported_at", length = 20)
	private String reportedAt;

	@Column (name = "remarks", length = 1000)
	private String remarks;

	@Column (name = "attr01", length = 500)
	private String attr01;

	@Column (name = "attr02", length = 100)
	private String attr02;

	@Column (name = "attr03", length = 100)
	private String attr03;

	@Column (name = "attr04", length = 100)
	private String attr04;

	@Column (name = "attr05", length = 100)
	private String attr05;
	
	public ReleaseOrder() {
	}
	
	public ReleaseOrder(String id) {
	    this.id = id;
	}
	
	public ReleaseOrder(Long domainId, String rlsOrdNo) {
	    this.domainId = domainId;
	    this.rlsOrdNo = rlsOrdNo;
	}
  
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

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
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

	public String getRequesterId() {
        return requesterId;
    }

    public void setRequesterId(String requesterId) {
        this.requesterId = requesterId;
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

    public String getClassCd() {
		return classCd;
	}

	public void setClassCd(String classCd) {
		this.classCd = classCd;
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

	public String getErpStatus() {
		return erpStatus;
	}

	public void setErpStatus(String erpStatus) {
		this.erpStatus = erpStatus;
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
        
        // 상태 초기화
        this.status = (this.status == null) ? ReleaseOrder.STATUS_REG : this.status;
        
        // 출고 요청번호가 없다면 출고 요청 번호 자동 생성
        if(ValueUtil.isEmpty(this.rlsReqNo)) {
            this.rlsReqNo = (String)BeanUtil.get(ICustomService.class).doCustomService(Domain.currentDomainId(), "diy-generate-rls-ord-no", ValueUtil.newMap("order", this));
        } else {
            // 출고 요청 번호가 입력이 되었다면 중복 체크
            ReleaseOrder condition = new ReleaseOrder();
            condition.setWhCd(this.whCd);
            condition.setComCd(this.comCd);
            condition.setRlsReqNo(this.rlsReqNo);
            
            if(BeanUtil.get(IQueryManager.class).selectSize(ReleaseOrder.class, condition) > 0) {
                throw ThrowUtil.newValidationErrorWithNoLog("출고요청 번호 [" + this.rlsReqNo + "]는 이미 존재합니다.");
            }            
        }
        
        // 출고요청 번호가 입력도 안 되었고 커스텀 서비스가 구현되지 않았다면 에러!
        if(ValueUtil.isEmpty(this.rlsReqNo)) {
            throw ThrowUtil.newValidationErrorWithNoLog("출고요청 번호가 존재하지 않습니다!");
        }
        
        // 출고 지시 번호가 없는 경우 출고 요청 번호와 동일하게 설정
        if(ValueUtil.isEmpty(this.rlsOrdNo)) {
        	this.rlsOrdNo = this.rlsReqNo;
        }
        
        // 출고 요청일이 없는 경우 당일 날짜 설정
        if(this.rlsReqDate == null) {
        	this.rlsReqDate = DateUtil.todayStr();
        }
	}
	
    @Override
    public void beforeDelete() {
        super.beforeDelete();
        
        if(this.status != null && ValueUtil.isNotEqual(this.status, ReleaseOrder.STATUS_REG)) {
            throw new ElidomRuntimeException("출고 주문은 삭제할 수 있는 상태가 아닙니다.");
        }
        
        IQueryManager queryMgr = BeanUtil.get(IQueryManager.class);
        String sql = "delete from release_order_items where domain_id = :domainId and release_order_id = :releaseOrderId";
        queryMgr.executeBySql(sql, ValueUtil.newMap("domainId,releaseOrderId", this.getDomainId(), this.getId()));
    }
}
