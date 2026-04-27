package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사방넷 고객사 (Sabangnet Member/Partner)
 *
 * 사방넷 풀필먼트 API v2의 고객사(Receiving Partner)를 WMS 로컬 DB에
 * 캐시/동기화하는 엔티티. 물류사 권한에서만 사용 가능.
 *
 * 동기화 주기: 1일 1회 또는 필요 시 실행 권장 (SabangnetMemberService.receiveMember)
 * 사방넷 API:
 *   GET  /v2/member/partner/{member_id} — 고객사 조회(단일)
 *   GET  /v2/member/partners            — 고객사 조회(벌크)
 *   POST /v2/member/partner             — 고객사 등록
 *   PUT  /v2/member/partner/{member_id} — 고객사 수정
 *
 * @author HatioLab
 */
@Table(name = "sabangnet_members", idStrategy = GenerationRule.UUID,
        uniqueFields = "domainId,comCd,memberId,receiveId",
        indexes = {
                @Index(name = "ix_sabangnet_members_0", columnList = "domain_id,com_cd,member_id,receive_id", unique = true),
                @Index(name = "ix_sabangnet_members_1", columnList = "domain_id,com_cd,member_id"),
                @Index(name = "ix_sabangnet_members_2", columnList = "domain_id,receive_id,sync_status")
        })
public class SabangnetMember extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 7412038591024650183L;

    // ─────────────────────────────────────────
    // 동기화 상태 상수
    // ─────────────────────────────────────────

    /** 동기화 상태: 미동기화 (초기값) */
    public static final String SYNC_STATUS_NONE = "N";
    /** 동기화 상태: 동기화 중 */
    public static final String SYNC_STATUS_PROCESSING = "P";
    /** 동기화 상태: 동기화 완료 */
    public static final String SYNC_STATUS_DONE = "Y";

    // ─────────────────────────────────────────
    // 기본 키
    // ─────────────────────────────────────────

    /**
     * PK (UUID)
     */
    @PrimaryKey
    @Column(name = "id", nullable = false, length = 40)
    private String id;

    // ─────────────────────────────────────────
    // WMS 식별 정보
    // ─────────────────────────────────────────

    /**
     * 회사 코드 (WMS 멀티테넌시 식별자)
     */
    @Column(name = "com_cd", nullable = false, length = 30)
    private String comCd;

    // ─────────────────────────────────────────
    // 사방넷 고객사 기본 정보
    // ─────────────────────────────────────────

    /**
     * 사방넷 고객사 ID
     * 조회 시 출력. 등록 응답으로 반환되는 식별자.
     */
    @Column(name = "member_id")
    private Integer memberId;

    /**
     * 고객사 코드 (최대 4자)
     * 조회 시 출력.
     */
    @Column(name = "partner_code", length = 4)
    private String partnerCode;

    /**
     * 고객사 로그인 ID (최대 20자) — 필수, unique
     * 사방넷 API 필드명은 'id'이나 엔티티 PK와 충돌을 피하기 위해 login_id로 저장.
     */
    @Column(name = "login_id", nullable = false, length = 20)
    private String loginId;

    /**
     * 회사명 (최대 100자) — 필수
     */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * 사업자번호 (최대 20자) — 필수
     */
    @Column(name = "biz_num", nullable = false, length = 20)
    private String bizNum;

    /**
     * 대표자 (최대 30자)
     */
    @Column(name = "ceo", length = 30)
    private String ceo;

    /**
     * 담당자명 (최대 30자)
     */
    @Column(name = "manager", length = 30)
    private String manager;

    /**
     * 추가계정구분 (최대 1자)
     * P.마스터, A.추가
     */
    @Column(name = "member_type", length = 1)
    private String memberType;

    /**
     * 이메일 (최대 100자)
     */
    @Column(name = "email", length = 100)
    private String email;

    /**
     * 종목 (최대 100자)
     */
    @Column(name = "jongmok", length = 100)
    private String jongmok;

    /**
     * 업태 (최대 100자)
     */
    @Column(name = "uptae", length = 100)
    private String uptae;

    /**
     * 전화 (최대 20자)
     */
    @Column(name = "tel", length = 20)
    private String tel;

    /**
     * 휴대폰 (최대 20자)
     */
    @Column(name = "hp", length = 20)
    private String hp;

    /**
     * 팩스 (최대 20자)
     */
    @Column(name = "fax", length = 20)
    private String fax;

    /**
     * 주소 우편번호 (최대 10자)
     */
    @Column(name = "zipcode", length = 10)
    private String zipcode;

    /**
     * 주소1 (최대 150자)
     */
    @Column(name = "address1", length = 150)
    private String address1;

    /**
     * 주소2 (최대 150자)
     */
    @Column(name = "address2", length = 150)
    private String address2;

    /**
     * 특이사항 (최대 150자)
     */
    @Column(name = "memo", length = 150)
    private String memo;

    /**
     * 발송자명 (최대 100자)
     */
    @Column(name = "default_shipping_name", length = 100)
    private String defaultShippingName;

    /**
     * CS 전화번호 (최대 20자)
     */
    @Column(name = "default_shipping_tel", length = 20)
    private String defaultShippingTel;

    /**
     * 발송지 우편번호 (최대 10자)
     */
    @Column(name = "default_shipping_zipcode", length = 10)
    private String defaultShippingZipcode;

    /**
     * 발송지 주소1 (최대 150자)
     */
    @Column(name = "default_shipping_address1", length = 150)
    private String defaultShippingAddress1;

    /**
     * 발송지 주소2 (최대 150자)
     */
    @Column(name = "default_shipping_address2", length = 150)
    private String defaultShippingAddress2;

    /**
     * 활성화 여부 (최대 1자) — 필수
     * Y.활성화, N.비활성화
     */
    @Column(name = "use_fg", nullable = false, length = 1)
    private String useFg;

    // ─────────────────────────────────────────
    // 동기화
    // ─────────────────────────────────────────

    /**
     * 수신 배치 ID
     * receiveMember() 1회 실행 단위를 식별하는 UUID.
     */
    @Column(name = "receive_id", length = 40)
    private String receiveId;

    /**
     * WMS 고객사 동기화 상태 (N/P/Y)
     * N.미동기화(초기값), P.동기화중, Y.동기화완료
     */
    @Column(name = "sync_status", length = 1)
    private String syncStatus;

    // ─────────────────────────────────────────
    // 생성자
    // ─────────────────────────────────────────

    public SabangnetMember() {
    }

    public SabangnetMember(String id) {
        this.id = id;
    }

    // ─────────────────────────────────────────
    // Getter / Setter
    // ─────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getComCd() { return comCd; }
    public void setComCd(String comCd) { this.comCd = comCd; }

    public Integer getMemberId() { return memberId; }
    public void setMemberId(Integer memberId) { this.memberId = memberId; }

    public String getPartnerCode() { return partnerCode; }
    public void setPartnerCode(String partnerCode) { this.partnerCode = partnerCode; }

    public String getLoginId() { return loginId; }
    public void setLoginId(String loginId) { this.loginId = loginId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBizNum() { return bizNum; }
    public void setBizNum(String bizNum) { this.bizNum = bizNum; }

    public String getCeo() { return ceo; }
    public void setCeo(String ceo) { this.ceo = ceo; }

    public String getManager() { return manager; }
    public void setManager(String manager) { this.manager = manager; }

    public String getMemberType() { return memberType; }
    public void setMemberType(String memberType) { this.memberType = memberType; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getJongmok() { return jongmok; }
    public void setJongmok(String jongmok) { this.jongmok = jongmok; }

    public String getUptae() { return uptae; }
    public void setUptae(String uptae) { this.uptae = uptae; }

    public String getTel() { return tel; }
    public void setTel(String tel) { this.tel = tel; }

    public String getHp() { return hp; }
    public void setHp(String hp) { this.hp = hp; }

    public String getFax() { return fax; }
    public void setFax(String fax) { this.fax = fax; }

    public String getZipcode() { return zipcode; }
    public void setZipcode(String zipcode) { this.zipcode = zipcode; }

    public String getAddress1() { return address1; }
    public void setAddress1(String address1) { this.address1 = address1; }

    public String getAddress2() { return address2; }
    public void setAddress2(String address2) { this.address2 = address2; }

    public String getMemo() { return memo; }
    public void setMemo(String memo) { this.memo = memo; }

    public String getDefaultShippingName() { return defaultShippingName; }
    public void setDefaultShippingName(String defaultShippingName) { this.defaultShippingName = defaultShippingName; }

    public String getDefaultShippingTel() { return defaultShippingTel; }
    public void setDefaultShippingTel(String defaultShippingTel) { this.defaultShippingTel = defaultShippingTel; }

    public String getDefaultShippingZipcode() { return defaultShippingZipcode; }
    public void setDefaultShippingZipcode(String defaultShippingZipcode) { this.defaultShippingZipcode = defaultShippingZipcode; }

    public String getDefaultShippingAddress1() { return defaultShippingAddress1; }
    public void setDefaultShippingAddress1(String defaultShippingAddress1) { this.defaultShippingAddress1 = defaultShippingAddress1; }

    public String getDefaultShippingAddress2() { return defaultShippingAddress2; }
    public void setDefaultShippingAddress2(String defaultShippingAddress2) { this.defaultShippingAddress2 = defaultShippingAddress2; }

    public String getUseFg() { return useFg; }
    public void setUseFg(String useFg) { this.useFg = useFg; }

    public String getReceiveId() { return receiveId; }
    public void setReceiveId(String receiveId) { this.receiveId = receiveId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }
}
