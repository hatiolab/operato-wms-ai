package operato.wms.inbound.entity;

import operato.wms.inbound.WmsInboundConstants;
import xyz.anythings.sys.service.ICustomService;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.sys.util.ThrowUtil;
import xyz.elidom.util.BeanUtil;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

@Table(name = "receivings", idStrategy = GenerationRule.UUID, uniqueFields="rcvNo,comCd,domainId", indexes = {
	@Index(name = "ix_receivings_0", columnList = "rcv_no,com_cd,domain_id", unique = true),
	@Index(name = "ix_receivings_1", columnList = "com_cd,domain_id"),
	@Index(name = "ix_receivings_2", columnList = "wh_cd,domain_id"),
	@Index(name = "ix_receivings_3", columnList = "vend_cd,domain_id"),
	@Index(name = "ix_receivings_4", columnList = "com_cd,rcv_req_no,domain_id"),
	@Index(name = "ix_receivings_5", columnList = "com_cd,status,domain_id"),
	@Index(name = "ix_receivings_6", columnList = "rcv_req_date,com_cd,domain_id"),
	@Index(name = "ix_receivings_7", columnList = "rcv_end_date,com_cd,domain_id")
})
public class Receiving extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 368463186233844943L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "rcv_no", nullable = false, length = 20)
	private String rcvNo;

	@Column (name = "rcv_req_no", length = 20)
	private String rcvReqNo;

	@Column (name = "rcv_req_date", nullable = false, length = 10)
	private String rcvReqDate;

	@Column (name = "rcv_end_date", length = 10)
	private String rcvEndDate;

	@Column (name = "status", length = 20)
	private String status;
	
	@Column (name = "erp_status", length = 20)
	private String erpStatus;

	@Column (name = "rcv_type", nullable = false, length = 20)
	private String rcvType;

	@Column (name = "wh_cd", length = 20)
	private String whCd;

	@Column (name = "com_cd", length = 20)
	private String comCd;

	@Column (name = "vend_cd", length = 20)
	private String vendCd;
	
    @Column (name = "mgr_id", length = 32)
    private String mgrId;

	@Column (name = "insp_flag", length = 50)
	private Boolean inspFlag;

	@Column (name = "label_flag", length = 50)
	private Boolean labelFlag;

	@Column (name = "car_no", length = 30)
	private String carNo;

	@Column (name = "driver_nm", length = 40)
	private String driverNm;

	@Column (name = "driver_tel", length = 20)
	private String driverTel;
	
    @Column (name = "total_box")
    private Integer totalBox;
    
    @Column (name = "box_wt")
    private Double boxWt;

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
  
    public Receiving() {
    }
    
    public Receiving(String id) {
        this.id = id;
    }
    
    public Receiving(Long domainId, String rcvNo) {
        this.domainId = domainId;
        this.rcvNo = rcvNo;
    }
    
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

	public String getRcvEndDate() {
		return rcvEndDate;
	}

	public void setRcvEndDate(String rcvEndDate) {
		this.rcvEndDate = rcvEndDate;
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

    public Boolean getInspFlag() {
		return inspFlag;
	}

	public void setInspFlag(Boolean inspFlag) {
		this.inspFlag = inspFlag;
	}

	public Boolean getLabelFlag() {
		return labelFlag;
	}

	public void setLabelFlag(Boolean labelFlag) {
		this.labelFlag = labelFlag;
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
        
        // 상태
        if(this.status == null) {
            this.status = WmsInboundConstants.STATUS_INWORK;
        }
        
        // 입고요청 번호가 없다면 입고 요청번호 자동 생성
        if(ValueUtil.isEmpty(this.rcvReqNo)) {
            this.rcvReqNo = (String)BeanUtil.get(ICustomService.class).doCustomService(Domain.currentDomainId(), "diy-generate-req-rcv-no", ValueUtil.newMap("order", this));
            
        // 입고요청 번호를 입력하였다면 중복 체크
        } else {
            // 입고 요청번호 존재 여부 체크
            Receiving condition = new Receiving();
            condition.setDomainId(Domain.currentDomainId());
            condition.setWhCd(this.whCd);
            condition.setComCd(this.comCd);
            condition.setRcvReqNo(rcvReqNo);
            
            if(BeanUtil.get(IQueryManager.class).selectSize(Receiving.class, condition) > 0) {
                throw ThrowUtil.newValidationErrorWithNoLog("입고요청 번호 [" + rcvReqNo + "]는 이미 존재합니다.");
            }            
        }
        
        // 입고요청번호가 입력도 안 되었고 커스텀 서비스가 구현되지 않았다면 에러!
        if(ValueUtil.isEmpty(this.rcvReqNo)) {
            throw ThrowUtil.newValidationErrorWithNoLog("입고요청 번호가 존재하지 않습니다!");
        }
        
        // 입고 지시 번호가 없으면 입고 요청 번호로 복사
        if(ValueUtil.isEmpty(this.rcvNo)) {
            this.rcvNo = this.rcvReqNo;
        }
        
        // 입고 요청일이 없는 경우 당일 날짜 설정
        if(this.rcvReqDate == null) {
            this.rcvReqDate = DateUtil.todayStr();
        }
    }
}
