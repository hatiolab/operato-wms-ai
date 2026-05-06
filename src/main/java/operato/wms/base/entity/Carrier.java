package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "carriers", idStrategy = GenerationRule.UUID, uniqueFields = "carrierCd,domainId", indexes = {
	@Index(name = "ix_carriers_0", columnList = "carrier_cd,domain_id", unique = true),
	@Index(name = "ix_carriers_1", columnList = "carrier_type,domain_id"),
	@Index(name = "ix_carriers_2", columnList = "del_flag,domain_id")
})
public class Carrier extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 381047293610582947L;

	/**
	 * 운송사 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 운송사 코드 - 도메인 내 유일 식별자 (예: CJ, LOGEN, HANJIN).
	 * Customer.defaultCarrierCd, CourierContract.dlvVendCd 참조 대상
	 */
	@Column(name = "carrier_cd", nullable = false, length = 30)
	private String carrierCd;

	/**
	 * 운송사 공식 명칭 (예: CJ대한통운, 롯데택배)
	 */
	@Column(name = "carrier_nm", nullable = false, length = 100)
	private String carrierNm;

	/**
	 * 내부 관리용 약칭
	 */
	@Column(name = "carrier_alias", length = 100)
	private String carrierAlias;

	/**
	 * 운송사 유형 코드 (COURIER/FREIGHT/DIRECT/PICKUP/INTERNATIONAL)
	 */
	@Column(name = "carrier_type", length = 20)
	private String carrierType;

	/**
	 * 운송사 대표 전화번호
	 */
	@Column(name = "tel_no", length = 20)
	private String telNo;

	/**
	 * 담당자 이름
	 */
	@Column(name = "mgr_nm", length = 50)
	private String mgrNm;

	/**
	 * 담당자 전화번호
	 */
	@Column(name = "mgr_phone", length = 20)
	private String mgrPhone;

	/**
	 * 담당자 이메일
	 */
	@Column(name = "mgr_email", length = 50)
	private String mgrEmail;

	/**
	 * 배송 추적 URL 템플릿. {invoice_no} 치환자 포함
	 * (예: https://trace.cjlogistics.com/web/detail.jsp?slipno={invoice_no})
	 */
	@Column(name = "tracking_url", length = 255)
	private String trackingUrl;

	/**
	 * API 자동 연동 여부. true이면 운송장 자동 발급 지원
	 */
	@Column(name = "api_flag")
	private Boolean apiFlag;

	/**
	 * API 인증 키 (암호화 저장 권장)
	 */
	@Column(name = "api_key", length = 255)
	private String apiKey;

	/**
	 * API 시크릿 키 (암호화 저장 권장)
	 */
	@Column(name = "secret_key", length = 255)
	private String secretKey;

	/**
	 * 운송장 유효성 체크 endpoint URL
	 */
	@Column(name = "validation_endpoint", length = 255)
	private String validationEndpoint;

	/**
	 * 운송장 발급 endpoint URL
	 */
	@Column(name = "issue_endpoint", length = 255)
	private String issueEndpoint;

	/**
	 * 운송장 출력 endpoint URL
	 */
	@Column(name = "print_endpoint", length = 255)
	private String printEndpoint;

	/**
	 * 운송장 취소 endpoint URL
	 */
	@Column(name = "cancel_endpoint", length = 255)
	private String cancelEndpoint;

	/**
	 * 삭제 여부
	 */
	@Column(name = "del_flag")
	private Boolean delFlag;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 1000)
	private String remarks;

	/**
	 * 사용자 정의 속성 1
	 */
	@Column(name = "attr01", length = 100)
	private String attr01;

	/**
	 * 사용자 정의 속성 2
	 */
	@Column(name = "attr02", length = 100)
	private String attr02;

	/**
	 * 사용자 정의 속성 3
	 */
	@Column(name = "attr03", length = 100)
	private String attr03;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getCarrierCd() {
		return carrierCd;
	}

	public void setCarrierCd(String carrierCd) {
		this.carrierCd = carrierCd;
	}

	public String getCarrierNm() {
		return carrierNm;
	}

	public void setCarrierNm(String carrierNm) {
		this.carrierNm = carrierNm;
	}

	public String getCarrierAlias() {
		return carrierAlias;
	}

	public void setCarrierAlias(String carrierAlias) {
		this.carrierAlias = carrierAlias;
	}

	public String getCarrierType() {
		return carrierType;
	}

	public void setCarrierType(String carrierType) {
		this.carrierType = carrierType;
	}

	public String getTelNo() {
		return telNo;
	}

	public void setTelNo(String telNo) {
		this.telNo = telNo;
	}

	public String getMgrNm() {
		return mgrNm;
	}

	public void setMgrNm(String mgrNm) {
		this.mgrNm = mgrNm;
	}

	public String getMgrPhone() {
		return mgrPhone;
	}

	public void setMgrPhone(String mgrPhone) {
		this.mgrPhone = mgrPhone;
	}

	public String getMgrEmail() {
		return mgrEmail;
	}

	public void setMgrEmail(String mgrEmail) {
		this.mgrEmail = mgrEmail;
	}

	public String getTrackingUrl() {
		return trackingUrl;
	}

	public void setTrackingUrl(String trackingUrl) {
		this.trackingUrl = trackingUrl;
	}

	public Boolean getApiFlag() {
		return apiFlag;
	}

	public void setApiFlag(Boolean apiFlag) {
		this.apiFlag = apiFlag;
	}

	public String getApiKey() {
		return apiKey;
	}

	public void setApiKey(String apiKey) {
		this.apiKey = apiKey;
	}

	public String getSecretKey() {
		return secretKey;
	}

	public void setSecretKey(String secretKey) {
		this.secretKey = secretKey;
	}

	public String getValidationEndpoint() {
		return validationEndpoint;
	}

	public void setValidationEndpoint(String validationEndpoint) {
		this.validationEndpoint = validationEndpoint;
	}

	public String getIssueEndpoint() {
		return issueEndpoint;
	}

	public void setIssueEndpoint(String issueEndpoint) {
		this.issueEndpoint = issueEndpoint;
	}

	public String getPrintEndpoint() {
		return printEndpoint;
	}

	public void setPrintEndpoint(String printEndpoint) {
		this.printEndpoint = printEndpoint;
	}

	public String getCancelEndpoint() {
		return cancelEndpoint;
	}

	public void setCancelEndpoint(String cancelEndpoint) {
		this.cancelEndpoint = cancelEndpoint;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
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
}
