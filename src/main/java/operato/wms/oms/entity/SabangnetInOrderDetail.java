package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사방넷 입고예정 상품 상세 (Sabangnet Receiving Plan Product)
 *
 * 사방넷 풀필먼트 API v2의 입고예정 응답 내 plan_product_list(plan_product_object 배열)를
 * WMS 로컬 DB에 저장하는 엔티티.
 *
 * 입고예정 1건은 여러 상품(plan_product_object)을 가질 수 있다.
 *
 * 사방넷 API: plan_product_object 구조
 *   - shipping_product_id      : integer, 출고상품 ID (필수)
 *   - quantity                 : integer, 예정수량 (필수)
 *   - receiving_plan_product_id: integer, 입고예정 상품 ID (조회 시 출력)
 *   - plan_product_status      : integer, 입고상태 (조회 시 출력; 1.미입고, 3.부분입고, 5.입고완료, 9.취소)
 *   - expire_date              : string(8), 유통기한 (YYYYMMDD)
 *   - make_date                : string(8), 제조일자 (YYYYMMDD)
 *
 * @author HatioLab
 */
@Table(name = "sabangnet_in_order_details", idStrategy = GenerationRule.UUID,
        uniqueFields = "domainId,inOrderId,receivingPlanProductId,receiveId",
        indexes = {
                @Index(name = "ix_sabangnet_in_order_details_0", columnList = "domain_id,in_order_id,receiving_plan_product_id,receive_id", unique = true),
                @Index(name = "ix_sabangnet_in_order_details_1", columnList = "domain_id,receiving_plan_id"),
                @Index(name = "ix_sabangnet_in_order_details_2", columnList = "domain_id,shipping_product_id"),
                @Index(name = "ix_sabangnet_in_order_details_3", columnList = "domain_id,receive_id,sync_status")
        })
public class SabangnetInOrderDetail extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 6194830572014739281L;

    // ─────────────────────────────────────────
    // 입고상태 상수
    // ─────────────────────────────────────────

    /** 입고예정 상품 입고상태: 미입고 */
    public static final int PRODUCT_STATUS_NOT_RECEIVED = 1;
    /** 입고예정 상품 입고상태: 부분입고 */
    public static final int PRODUCT_STATUS_PARTIAL = 3;
    /** 입고예정 상품 입고상태: 입고완료 */
    public static final int PRODUCT_STATUS_COMPLETED = 5;
    /** 입고예정 상품 입고상태: 취소 */
    public static final int PRODUCT_STATUS_CANCELLED = 9;

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
    // WMS 식별 / 연결 정보
    // ─────────────────────────────────────────

    /**
     * 상위 SabangnetInOrder 엔티티의 PK (UUID)
     * sabangnet_in_orders.id 참조. ON DELETE CASCADE 대상.
     */
    @Column(name = "in_order_id", nullable = false, length = 40)
    private String inOrderId;

    /**
     * 사방넷 입고예정 ID
     * sabangnet_in_orders.receiving_plan_id 와 동일한 값.
     * 부모 엔티티 join 없이 직접 조회를 위해 비정규화 보관.
     */
    @Column(name = "receiving_plan_id")
    private Integer receivingPlanId;

    // ─────────────────────────────────────────
    // 입고예정 상품 정보 (plan_product_object)
    // ─────────────────────────────────────────

    /**
     * 출고상품 ID — 필수
     * 사방넷 출고상품 식별자. SabangnetProduct.shippingProductId 와 연결.
     */
    @Column(name = "shipping_product_id", nullable = false)
    private Integer shippingProductId;

    /**
     * 예정수량 — 필수
     */
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    /**
     * 입고예정 상품 ID
     * 사방넷이 부여하는 입고예정 상품 고유 식별자. 조회 시에만 출력.
     */
    @Column(name = "receiving_plan_product_id")
    private Integer receivingPlanProductId;

    /**
     * 입고예정 상품 입고상태
     * 조회 시에만 출력. 1.미입고, 3.부분입고, 5.입고완료, 9.취소
     */
    @Column(name = "plan_product_status")
    private Integer planProductStatus;

    /**
     * 유통기한 (YYYYMMDD)
     * 유통기한 사용 상품인 경우에만 입력.
     */
    @Column(name = "expire_date", length = 8)
    private String expireDate;

    /**
     * 제조일자 (YYYYMMDD)
     * 제조일자 사용 상품인 경우에만 입력.
     */
    @Column(name = "make_date", length = 8)
    private String makeDate;

    // ─────────────────────────────────────────
    // 동기화
    // ─────────────────────────────────────────

    /**
     * 수신 배치 ID
     * receiveInOrders() 1회 실행 단위를 식별하는 UUID.
     * 부모 SabangnetInOrder의 receive_id와 동일한 값이 저장된다.
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

    public SabangnetInOrderDetail() {
    }

    public SabangnetInOrderDetail(String id) {
        this.id = id;
    }

    public SabangnetInOrderDetail(String inOrderId, Integer shippingProductId, Integer quantity) {
        this.inOrderId = inOrderId;
        this.shippingProductId = shippingProductId;
        this.quantity = quantity;
    }

    // ─────────────────────────────────────────
    // Getter / Setter
    // ─────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInOrderId() { return inOrderId; }
    public void setInOrderId(String inOrderId) { this.inOrderId = inOrderId; }

    public Integer getReceivingPlanId() { return receivingPlanId; }
    public void setReceivingPlanId(Integer receivingPlanId) { this.receivingPlanId = receivingPlanId; }

    public Integer getShippingProductId() { return shippingProductId; }
    public void setShippingProductId(Integer shippingProductId) { this.shippingProductId = shippingProductId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Integer getReceivingPlanProductId() { return receivingPlanProductId; }
    public void setReceivingPlanProductId(Integer receivingPlanProductId) { this.receivingPlanProductId = receivingPlanProductId; }

    public Integer getPlanProductStatus() { return planProductStatus; }
    public void setPlanProductStatus(Integer planProductStatus) { this.planProductStatus = planProductStatus; }

    public String getExpireDate() { return expireDate; }
    public void setExpireDate(String expireDate) { this.expireDate = expireDate; }

    public String getMakeDate() { return makeDate; }
    public void setMakeDate(String makeDate) { this.makeDate = makeDate; }

    public String getReceiveId() { return receiveId; }
    public void setReceiveId(String receiveId) { this.receiveId = receiveId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }
}
