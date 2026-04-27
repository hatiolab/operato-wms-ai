package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사방넷 출고 릴리즈 (Sabangnet Release)
 *
 * 사방넷 풀필먼트 API v2의 출고(Release)를 WMS 로컬 DB에
 * 캐시/동기화하는 엔티티. 물류사 전용 API.
 *
 * 동기화 주기: 1일 1회 또는 업무 시간 중 주기적 실행 권장 (SabangnetOutOrderService.receiveOutOrders)
 * 사방넷 API:
 *   GET /v2/release/{릴리즈ID} — 출고 조회(단일)
 *   GET /v2/releases           — 출고 조회(벌크)
 *
 * 릴리즈 진행상태(release_status):
 *   1.출고요청, 3.출고지시, 5.출고작업중, 7.출고완료, 9.출고취소
 *
 * @author HatioLab
 */
@Table(name = "sabangnet_out_orders", idStrategy = GenerationRule.UUID,
        uniqueFields = "domainId,comCd,whCd,releaseId,receiveId",
        indexes = {
                @Index(name = "ix_sabangnet_out_orders_0", columnList = "domain_id,com_cd,wh_cd,release_id,receive_id", unique = true),
                @Index(name = "ix_sabangnet_out_orders_1", columnList = "domain_id,com_cd,wh_cd,release_status"),
                @Index(name = "ix_sabangnet_out_orders_2", columnList = "domain_id,com_cd,wh_cd,release_date"),
                @Index(name = "ix_sabangnet_out_orders_3", columnList = "domain_id,receive_id,sync_status")
        })
public class SabangnetOutOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 5830271946503847192L;

    // ─────────────────────────────────────────
    // 진행상태 상수
    // ─────────────────────────────────────────

    /** 진행상태: 출고요청 */
    public static final int RELEASE_STATUS_REQUESTED = 1;
    /** 진행상태: 출고지시 */
    public static final int RELEASE_STATUS_ASSIGNED = 3;
    /** 진행상태: 출고작업중 */
    public static final int RELEASE_STATUS_WORKING = 5;
    /** 진행상태: 출고완료 */
    public static final int RELEASE_STATUS_COMPLETED = 7;
    /** 진행상태: 출고취소 */
    public static final int RELEASE_STATUS_CANCELLED = 9;

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

    /**
     * 창고 코드 (WMS 창고 식별자)
     */
    @Column(name = "wh_cd", nullable = false, length = 30)
    private String whCd;

    // ─────────────────────────────────────────
    // 사방넷 출고 기본 정보
    // ─────────────────────────────────────────

    /**
     * 사방넷 릴리즈 ID
     */
    @Column(name = "release_id")
    private Integer releaseId;

    /**
     * 사방넷 고객사(화주사) ID
     */
    @Column(name = "member_id")
    private Integer memberId;

    /**
     * 릴리즈코드 (최대 100자)
     */
    @Column(name = "release_code", length = 100)
    private String releaseCode;

    /**
     * 발주 ID
     */
    @Column(name = "order_id")
    private Integer orderId;

    /**
     * 오더코드 (최대 20자)
     */
    @Column(name = "order_code", length = 20)
    private String orderCode;

    /**
     * 주문번호 (최대 100자)
     */
    @Column(name = "company_order_code", length = 100)
    private String companyOrderCode;

    /**
     * 배송방식
     * 1.택배, 2.직송, 3.새벽배송, 4.당일배송
     */
    @Column(name = "shipping_method_id")
    private Integer shippingMethodId;

    /**
     * 출고희망일 (YYYYMMDD)
     */
    @Column(name = "request_shipping_dt", length = 8)
    private String requestShippingDt;

    /**
     * 출고요청일 (YYYYMMDD)
     */
    @Column(name = "release_date", length = 8)
    private String releaseDate;

    /**
     * 출고 진행상태
     * 1.출고요청, 3.출고지시, 5.출고작업중, 7.출고완료, 9.출고취소
     */
    @Column(name = "release_status")
    private Integer releaseStatus;

    /**
     * 출고완료일 (YYYYMMDD)
     */
    @Column(name = "complete_date", length = 8)
    private String completeDate;

    /**
     * 출고회차 ID
     */
    @Column(name = "shipping_order_info_id")
    private Integer shippingOrderInfoId;

    /**
     * 택배사 ID
     */
    @Column(name = "delivery_agency_id")
    private Integer deliveryAgencyId;

    /**
     * 운송장 번호 (최대 50자)
     */
    @Column(name = "shipping_code", length = 50)
    private String shippingCode;

    /**
     * 출고정보1 (최대 50자)
     */
    @Column(name = "etc1", length = 50)
    private String etc1;

    /**
     * 출고정보2 (최대 50자)
     */
    @Column(name = "etc2", length = 50)
    private String etc2;

    /**
     * 출고정보3 (최대 50자)
     */
    @Column(name = "etc3", length = 50)
    private String etc3;

    /**
     * 출고정보4 (최대 50자)
     */
    @Column(name = "etc4", length = 50)
    private String etc4;

    /**
     * 출고정보5 (최대 50자)
     */
    @Column(name = "etc5", length = 50)
    private String etc5;

    /**
     * 출고정보6 (최대 50자)
     */
    @Column(name = "etc6", length = 50)
    private String etc6;

    /**
     * 주문자명 (최대 100자)
     */
    @Column(name = "buyer_name", length = 100)
    private String buyerName;

    /**
     * 받는분 이름 (최대 100자)
     */
    @Column(name = "receiver_name", length = 100)
    private String receiverName;

    /**
     * 받는분 전화번호1 (최대 20자)
     */
    @Column(name = "tel1", length = 20)
    private String tel1;

    /**
     * 받는분 전화번호2 (최대 20자)
     */
    @Column(name = "tel2", length = 20)
    private String tel2;

    /**
     * 받는분 우편번호 (최대 20자)
     */
    @Column(name = "zipcode", length = 20)
    private String zipcode;

    /**
     * 받는분 주소1 (최대 150자)
     */
    @Column(name = "shipping_address1", length = 150)
    private String shippingAddress1;

    /**
     * 받는분 주소2 (최대 150자)
     */
    @Column(name = "shipping_address2", length = 150)
    private String shippingAddress2;

    /**
     * 배송 메시지 (최대 150자)
     */
    @Column(name = "shipping_message", length = 150)
    private String shippingMessage;

    /**
     * 발주타입 ID
     */
    @Column(name = "channel_id")
    private Integer channelId;

    /**
     * DAS 번호 (최대 4자)
     */
    @Column(name = "das_num", length = 4)
    private String dasNum;

    // ─────────────────────────────────────────
    // 동기화
    // ─────────────────────────────────────────

    /**
     * 수신 배치 ID
     * receiveOutOrders() 1회 실행 단위를 식별하는 UUID.
     * 동일 배치에서 수신된 SabangnetOutOrder·SabangnetOutOrderDetail에 같은 값이 저장된다.
     */
    @Column(name = "receive_id", length = 40)
    private String receiveId;

    /**
     * WMS 출하 동기화 상태 (N/P/Y)
     * N.미동기화(초기값), P.동기화중, Y.동기화완료
     */
    @Column(name = "sync_status", length = 1)
    private String syncStatus;

    // ─────────────────────────────────────────
    // 생성자
    // ─────────────────────────────────────────

    public SabangnetOutOrder() {
    }

    public SabangnetOutOrder(String id) {
        this.id = id;
    }

    // ─────────────────────────────────────────
    // Getter / Setter
    // ─────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getComCd() { return comCd; }
    public void setComCd(String comCd) { this.comCd = comCd; }

    public String getWhCd() { return whCd; }
    public void setWhCd(String whCd) { this.whCd = whCd; }

    public Integer getReleaseId() { return releaseId; }
    public void setReleaseId(Integer releaseId) { this.releaseId = releaseId; }

    public Integer getMemberId() { return memberId; }
    public void setMemberId(Integer memberId) { this.memberId = memberId; }

    public String getReleaseCode() { return releaseCode; }
    public void setReleaseCode(String releaseCode) { this.releaseCode = releaseCode; }

    public Integer getOrderId() { return orderId; }
    public void setOrderId(Integer orderId) { this.orderId = orderId; }

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

    public String getCompanyOrderCode() { return companyOrderCode; }
    public void setCompanyOrderCode(String companyOrderCode) { this.companyOrderCode = companyOrderCode; }

    public Integer getShippingMethodId() { return shippingMethodId; }
    public void setShippingMethodId(Integer shippingMethodId) { this.shippingMethodId = shippingMethodId; }

    public String getRequestShippingDt() { return requestShippingDt; }
    public void setRequestShippingDt(String requestShippingDt) { this.requestShippingDt = requestShippingDt; }

    public String getReleaseDate() { return releaseDate; }
    public void setReleaseDate(String releaseDate) { this.releaseDate = releaseDate; }

    public Integer getReleaseStatus() { return releaseStatus; }
    public void setReleaseStatus(Integer releaseStatus) { this.releaseStatus = releaseStatus; }

    public String getCompleteDate() { return completeDate; }
    public void setCompleteDate(String completeDate) { this.completeDate = completeDate; }

    public Integer getShippingOrderInfoId() { return shippingOrderInfoId; }
    public void setShippingOrderInfoId(Integer shippingOrderInfoId) { this.shippingOrderInfoId = shippingOrderInfoId; }

    public Integer getDeliveryAgencyId() { return deliveryAgencyId; }
    public void setDeliveryAgencyId(Integer deliveryAgencyId) { this.deliveryAgencyId = deliveryAgencyId; }

    public String getShippingCode() { return shippingCode; }
    public void setShippingCode(String shippingCode) { this.shippingCode = shippingCode; }

    public String getEtc1() { return etc1; }
    public void setEtc1(String etc1) { this.etc1 = etc1; }

    public String getEtc2() { return etc2; }
    public void setEtc2(String etc2) { this.etc2 = etc2; }

    public String getEtc3() { return etc3; }
    public void setEtc3(String etc3) { this.etc3 = etc3; }

    public String getEtc4() { return etc4; }
    public void setEtc4(String etc4) { this.etc4 = etc4; }

    public String getEtc5() { return etc5; }
    public void setEtc5(String etc5) { this.etc5 = etc5; }

    public String getEtc6() { return etc6; }
    public void setEtc6(String etc6) { this.etc6 = etc6; }

    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }

    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }

    public String getTel1() { return tel1; }
    public void setTel1(String tel1) { this.tel1 = tel1; }

    public String getTel2() { return tel2; }
    public void setTel2(String tel2) { this.tel2 = tel2; }

    public String getZipcode() { return zipcode; }
    public void setZipcode(String zipcode) { this.zipcode = zipcode; }

    public String getShippingAddress1() { return shippingAddress1; }
    public void setShippingAddress1(String shippingAddress1) { this.shippingAddress1 = shippingAddress1; }

    public String getShippingAddress2() { return shippingAddress2; }
    public void setShippingAddress2(String shippingAddress2) { this.shippingAddress2 = shippingAddress2; }

    public String getShippingMessage() { return shippingMessage; }
    public void setShippingMessage(String shippingMessage) { this.shippingMessage = shippingMessage; }

    public Integer getChannelId() { return channelId; }
    public void setChannelId(Integer channelId) { this.channelId = channelId; }

    public String getDasNum() { return dasNum; }
    public void setDasNum(String dasNum) { this.dasNum = dasNum; }

    public String getReceiveId() { return receiveId; }
    public void setReceiveId(String receiveId) { this.receiveId = receiveId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }
}
