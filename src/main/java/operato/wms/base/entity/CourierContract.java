package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "courier_contracts", idStrategy = GenerationRule.UUID, uniqueFields="dlvVendCd,contractNo,domainId", indexes = {
	@Index(name = "ix_courier_contracts_0", columnList = "dlv_vend_cd,contract_no,domain_id", unique = true)
})
public class CourierContract extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 925961719349483915L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	@Column (name = "dlv_vend_cd", nullable = false, length = 30)
	private String dlvVendCd;

	@Column (name = "contract_no", nullable = false, length = 30)
	private String contractNo;

	@Column (name = "start_bandwidth", length = 30)
	private String startBandwidth;

	@Column (name = "end_bandwidth", length = 30)
	private String endBandwidth;

	@Column (name = "total_cnt")
	private Integer totalCnt;

	@Column (name = "use_cnt")
	private Integer useCnt;

	@Column (name = "remain_cnt")
	private Integer remainCnt;

	@Column (name = "remarks", length = 1000)
	private String remarks;

	@Column (name = "del_flag")
	private Boolean delFlag;

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

	public String getDlvVendCd() {
		return dlvVendCd;
	}

	public void setDlvVendCd(String dlvVendCd) {
		this.dlvVendCd = dlvVendCd;
	}

	public String getContractNo() {
		return contractNo;
	}

	public void setContractNo(String contractNo) {
		this.contractNo = contractNo;
	}

	public String getStartBandwidth() {
		return startBandwidth;
	}

	public void setStartBandwidth(String startBandwidth) {
		this.startBandwidth = startBandwidth;
	}

	public String getEndBandwidth() {
		return endBandwidth;
	}

	public void setEndBandwidth(String endBandwidth) {
		this.endBandwidth = endBandwidth;
	}

	public Integer getTotalCnt() {
		return totalCnt;
	}

	public void setTotalCnt(Integer totalCnt) {
		this.totalCnt = totalCnt;
	}

	public Integer getUseCnt() {
		return useCnt;
	}

	public void setUseCnt(Integer useCnt) {
		this.useCnt = useCnt;
	}

	public Integer getRemainCnt() {
		return remainCnt;
	}

	public void setRemainCnt(Integer remainCnt) {
		this.remainCnt = remainCnt;
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
}
