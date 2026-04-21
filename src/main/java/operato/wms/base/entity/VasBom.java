package operato.wms.base.entity;

import org.apache.commons.lang.StringUtils;

import operato.wms.vas.WmsVasConstants;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;
import xyz.elidom.dev.entity.RangedSeq;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;
import xyz.elidom.util.DateUtil;
import xyz.elidom.util.ValueUtil;

/**
 * VAS BOM 마스터 Entity
 *
 * 세트 상품의 구성 정보(BOM)를 관리하는 마스터 테이블
 * - 유통가공 유형: SET_ASSEMBLY, DISASSEMBLY, REPACK, LABEL, CUSTOM
 * - 상태: ACTIVE/INACTIVE
 */
@Table(name = "vas_boms", idStrategy = GenerationRule.UUID, uniqueFields = "bomNo,domainId", indexes = {
		@Index(name = "ix_vas_boms_0", columnList = "bom_no,domain_id", unique = true),
		@Index(name = "ix_vas_boms_1", columnList = "com_cd,set_sku_cd,domain_id", unique = true),
		@Index(name = "ix_vas_boms_2", columnList = "com_cd,domain_id"),
		@Index(name = "ix_vas_boms_3", columnList = "com_cd,vas_type,domain_id"),
		@Index(name = "ix_vas_boms_4", columnList = "com_cd,status,domain_id"),
		@Index(name = "ix_vas_boms_5", columnList = "wh_cd,domain_id")
})
public class VasBom extends xyz.elidom.orm.entity.basic.ElidomStampHook {

	private static final long serialVersionUID = 1L;

	/**
	 * PK (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * BOM 번호 (UNIQUE, 자동 채번: BOM-YYYYMMDD-XXXXX)
	 */
	@Column(name = "bom_no", nullable = false, length = 30)
	private String bomNo;

	/**
	 * 세트 상품 코드
	 */
	@Column(name = "set_sku_cd", nullable = false, length = 30)
	private String setSkuCd;

	/**
	 * 세트 상품명 (자동 조회)
	 */
	@Column(name = "set_sku_nm", length = 255)
	private String setSkuNm;

	/**
	 * 유통가공 유형 (SET_ASSEMBLY/DISASSEMBLY/REPACK/LABEL/CUSTOM)
	 */
	@Column(name = "vas_type", nullable = false, length = 30)
	private String vasType;

	/**
	 * 상태 (ACTIVE/INACTIVE)
	 */
	@Column(name = "status", length = 20)
	private String status;

	/**
	 * 화주사 코드
	 */
	@Column(name = "com_cd", nullable = false, length = 20)
	private String comCd;

	/**
	 * 창고 코드
	 */
	@Column(name = "wh_cd", length = 20)
	private String whCd;

	/**
	 * 구성 품목 수 (자동 계산)
	 */
	@Column(name = "component_count")
	private Integer componentCount;

	/**
	 * 세트 1개당 총 자재 수량 (자동 계산)
	 */
	@Column(name = "total_component_qty")
	private Double totalComponentQty;

	/**
	 * 유효 시작일 (YYYY-MM-DD)
	 */
	@Column(name = "valid_from", length = 10)
	private String validFrom;

	/**
	 * 유효 종료일 (YYYY-MM-DD)
	 */
	@Column(name = "valid_to", length = 10)
	private String validTo;

	/**
	 * 비고
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

	public VasBom() {
	}

	public VasBom(String id) {
		this.id = id;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getBomNo() {
		return bomNo;
	}

	public void setBomNo(String bomNo) {
		this.bomNo = bomNo;
	}

	public String getSetSkuCd() {
		return setSkuCd;
	}

	public void setSetSkuCd(String setSkuCd) {
		this.setSkuCd = setSkuCd;
	}

	public String getSetSkuNm() {
		return setSkuNm;
	}

	public void setSetSkuNm(String setSkuNm) {
		this.setSkuNm = setSkuNm;
	}

	public String getVasType() {
		return vasType;
	}

	public void setVasType(String vasType) {
		this.vasType = vasType;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public Integer getComponentCount() {
		return componentCount;
	}

	public void setComponentCount(Integer componentCount) {
		this.componentCount = componentCount;
	}

	public Double getTotalComponentQty() {
		return totalComponentQty;
	}

	public void setTotalComponentQty(Double totalComponentQty) {
		this.totalComponentQty = totalComponentQty;
	}

	public String getValidFrom() {
		return validFrom;
	}

	public void setValidFrom(String validFrom) {
		this.validFrom = validFrom;
	}

	public String getValidTo() {
		return validTo;
	}

	public void setValidTo(String validTo) {
		this.validTo = validTo;
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
		if (this.status == null) {
			this.status = WmsVasConstants.BOM_STATUS_ACTIVE;
		}

		// BOM 번호 자동 채번 (BOM-YYMMDD-XXXXX)
		if (ValueUtil.isEmpty(this.bomNo)) {
			String dateStr = DateUtil.todayStr("yyMMdd");
			Integer seq = RangedSeq.increaseSequence(Domain.currentDomainId(), "BOM_NO", "BOM_NO", "DATE", dateStr,
					null, null);
			String serialNo = StringUtils.leftPad(String.valueOf(seq), 5, "0");
			this.bomNo = "BOM" + Domain.currentDomainId() + SysConstants.DASH + dateStr + SysConstants.DASH + serialNo;
		}

		// 구성 품목 수 초기화
		if (this.componentCount == null) {
			this.componentCount = 0;
		}

		// 총 자재 수량 초기화
		if (this.totalComponentQty == null) {
			this.totalComponentQty = 0.0;
		}
	}
}
