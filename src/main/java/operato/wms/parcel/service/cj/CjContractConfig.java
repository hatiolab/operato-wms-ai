package operato.wms.parcel.service.cj;

/**
 * CJ대한통운 계약 설정 VO
 *
 * courier_contracts 테이블에서 로드한 CJ 연동 자격증명을 담는다.
 * domainId + contractNo 조합으로 Redis 캐시 키를 구성하므로 두 필드 모두 필수.
 */
public class CjContractConfig {

    /** 도메인 ID */
    private Long domainId;

    /** 계약 번호 (CUST_ID와 동일, Redis 캐시 키에 사용) */
    private String contractNo;

    /** CUST_ID — ReqOneDayToken 요청 파라미터 */
    private String custId;

    /** BIZ_REG_NUM (사업자번호) — ReqOneDayToken 요청 파라미터 */
    private String bizRegNum;

    /** CJ-Gateway-APIKey (1Day 토큰 발행 시 미사용, 이후 API 호출에 사용) */
    private String apiKey;

    /** API Base URL (예: https://dxapi.cjlogistics.com:5052) */
    private String apiBaseUrl;

    /** 중개업체 ID (중개업체 사용 시만, 선택) */
    private String userId;

    public Long getDomainId() { return domainId; }
    public void setDomainId(Long domainId) { this.domainId = domainId; }

    public String getContractNo() { return contractNo; }
    public void setContractNo(String contractNo) { this.contractNo = contractNo; }

    public String getCustId() { return custId; }
    public void setCustId(String custId) { this.custId = custId; }

    public String getBizRegNum() { return bizRegNum; }
    public void setBizRegNum(String bizRegNum) { this.bizRegNum = bizRegNum; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getApiBaseUrl() { return apiBaseUrl; }
    public void setApiBaseUrl(String apiBaseUrl) { this.apiBaseUrl = apiBaseUrl; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
}
