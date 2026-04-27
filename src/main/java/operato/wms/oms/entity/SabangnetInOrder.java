package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사방넷 입고예정 (Sabangnet Receiving Plan)
 *
 * 사방넷 풀필먼트 API v2의 입고예정(Receiving Plan)을 WMS 로컬 DB에
 * 캐시/동기화하는 엔티티.
 *
 * 동기화 주기: 1일 1회 또는 업무 시간 중 주기적 실행 권장 (SabangnetInOrderService.receiveInOrders)
 * 사방넷 API: GET /v2/inventory/receiving_plans, GET /v2/inventory/receiving_plan/{id}
 *
 * @author HatioLab
 */
@Table(name = "sabangnet_in_orders", idStrategy = GenerationRule.UUID,
        uniqueFields = "domainId,comCd,whCd,receivingPlanId,receiveId",
        indexes = {
                @Index(name = "ix_sabangnet_in_orders_0", columnList = "domain_id,com_cd,wh_cd,receiving_plan_id,receive_id", unique = true),
                @Index(name = "ix_sabangnet_in_orders_1", columnList = "domain_id,com_cd,wh_cd,plan_status"),
                @Index(name = "ix_sabangnet_in_orders_2", columnList = "domain_id,com_cd,wh_cd,plan_date"),
                @Index(name = "ix_sabangnet_in_orders_3", columnList = "domain_id,receive_id,sync_status")
        })
public class SabangnetInOrder extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 3820194756301847291L;

    // ─────────────────────────────────────────
    // 진행상태 상수
    // ─────────────────────────────────────────

    /** 진행상태: 입고예정 */
    public static final int PLAN_STATUS_PLANNED = 1;
    /** 진행상태: 입고검수중 */
    public static final int PLAN_STATUS_INSPECTING = 2;
    /** 진행상태: 입고완료 */
    public static final int PLAN_STATUS_COMPLETED = 3;
    /** 진행상태: 입고취소 */
    public static final int PLAN_STATUS_CANCELLED = 4;

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
    // 사방넷 입고예정 기본 정보
    // ─────────────────────────────────────────

    /**
     * 사방넷 입고예정 ID
     */
    @Column(name = "receiving_plan_id")
    private Integer receivingPlanId;

    /**
     * 사방넷 고객사(화주사) ID
     * 물류사 권한으로 API를 호출할 때 필수로 지정하는 고객사 식별자.
     */
    @Column(name = "member_id")
    private Integer memberId;

    /**
     * 입고예정코드 (최대 20자)
     */
    @Column(name = "receiving_plan_code", length = 20)
    private String receivingPlanCode;

    /**
     * 입고예정일자 (YYYYMMDD) — 필수
     */
    @Column(name = "plan_date", nullable = false, length = 8)
    private String planDate;

    /**
     * 진행상태
     * 1.입고예정, 2.입고검수중, 3.입고완료, 4.입고취소
     */
    @Column(name = "plan_status")
    private Integer planStatus;

    /**
     * 완료일 (YYYYMMDD)
     */
    @Column(name = "complete_dt", length = 8)
    private String completeDt;

    /**
     * 입고예정 메모 (최대 250자)
     */
    @Column(name = "memo", length = 250)
    private String memo;

    /**
     * 추가정보1 (최대 50자)
     */
    @Column(name = "add_info1", length = 50)
    private String addInfo1;

    /**
     * 추가정보2 (최대 50자)
     */
    @Column(name = "add_info2", length = 50)
    private String addInfo2;

    /**
     * 추가정보3 (최대 50자)
     */
    @Column(name = "add_info3", length = 50)
    private String addInfo3;

    /**
     * 추가정보4 (최대 50자)
     */
    @Column(name = "add_info4", length = 50)
    private String addInfo4;

    /**
     * 추가정보5 (최대 50자)
     */
    @Column(name = "add_info5", length = 50)
    private String addInfo5;

    // ─────────────────────────────────────────
    // 동기화
    // ─────────────────────────────────────────

    /**
     * 수신 배치 ID
     * receiveInOrders() 1회 실행 단위를 식별하는 UUID.
     * 동일 배치에서 수신된 SabangnetInOrder·SabangnetInOrderDetail에 같은 값이 저장된다.
     */
    @Column(name = "receive_id", length = 40)
    private String receiveId;

    /**
     * WMS 입고 동기화 상태 (N/P/Y)
     * N.미동기화(초기값), P.동기화중, Y.동기화완료
     */
    @Column(name = "sync_status", length = 1)
    private String syncStatus;

    // ─────────────────────────────────────────
    // 생성자
    // ─────────────────────────────────────────

    public SabangnetInOrder() {
    }

    public SabangnetInOrder(String id) {
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

    public Integer getReceivingPlanId() { return receivingPlanId; }
    public void setReceivingPlanId(Integer receivingPlanId) { this.receivingPlanId = receivingPlanId; }

    public Integer getMemberId() { return memberId; }
    public void setMemberId(Integer memberId) { this.memberId = memberId; }

    public String getReceivingPlanCode() { return receivingPlanCode; }
    public void setReceivingPlanCode(String receivingPlanCode) { this.receivingPlanCode = receivingPlanCode; }

    public String getPlanDate() { return planDate; }
    public void setPlanDate(String planDate) { this.planDate = planDate; }

    public Integer getPlanStatus() { return planStatus; }
    public void setPlanStatus(Integer planStatus) { this.planStatus = planStatus; }

    public String getCompleteDt() { return completeDt; }
    public void setCompleteDt(String completeDt) { this.completeDt = completeDt; }

    public String getMemo() { return memo; }
    public void setMemo(String memo) { this.memo = memo; }

    public String getAddInfo1() { return addInfo1; }
    public void setAddInfo1(String addInfo1) { this.addInfo1 = addInfo1; }

    public String getAddInfo2() { return addInfo2; }
    public void setAddInfo2(String addInfo2) { this.addInfo2 = addInfo2; }

    public String getAddInfo3() { return addInfo3; }
    public void setAddInfo3(String addInfo3) { this.addInfo3 = addInfo3; }

    public String getAddInfo4() { return addInfo4; }
    public void setAddInfo4(String addInfo4) { this.addInfo4 = addInfo4; }

    public String getAddInfo5() { return addInfo5; }
    public void setAddInfo5(String addInfo5) { this.addInfo5 = addInfo5; }

    public String getReceiveId() { return receiveId; }
    public void setReceiveId(String receiveId) { this.receiveId = receiveId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }
}
