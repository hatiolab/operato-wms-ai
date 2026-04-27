package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사방넷 출고대상상품 상세 (Sabangnet Release Item)
 *
 * 사방넷 풀필먼트 API v2의 출고대상상품(GET /v2/release/items) 응답을
 * WMS 로컬 DB에 저장하는 엔티티.
 *
 * 출고(SabangnetOutOrder) 1건은 여러 출고대상상품(release_item_object)을 가질 수 있다.
 *
 * 사방넷 API: GET /v2/release/items
 *   - release_item_id  : integer, 출고대상상품 ID
 *   - release_id       : integer, 릴리즈 ID
 *   - shipping_product_id : integer, 출고상품 ID
 *   - quantity         : integer, 수량
 *   - product_name     : string(100), 출고상품명
 *   - product_code     : string(20), 출고상품코드
 *   - upc              : string(50), 대표바코드
 *   - shipping_code    : string(50), 운송장 번호
 *   - receiver_name    : string(100), 받는분 이름
 *   - add_barcode_list : array, 추가바코드 리스트 [{barcode, quantity}]
 *
 * @author HatioLab
 */
@Table(name = "sabangnet_out_order_details", idStrategy = GenerationRule.UUID,
        uniqueFields = "domainId,outOrderId,releaseItemId,receiveId",
        indexes = {
                @Index(name = "ix_sabangnet_out_order_details_0", columnList = "domain_id,out_order_id,release_item_id,receive_id", unique = true),
                @Index(name = "ix_sabangnet_out_order_details_1", columnList = "domain_id,release_id"),
                @Index(name = "ix_sabangnet_out_order_details_2", columnList = "domain_id,shipping_product_id"),
                @Index(name = "ix_sabangnet_out_order_details_3", columnList = "domain_id,receive_id,sync_status")
        })
public class SabangnetOutOrderDetail extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 2947301856402918473L;

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
     * 상위 SabangnetOutOrder 엔티티의 PK (UUID)
     * sabangnet_out_orders.id 참조. ON DELETE CASCADE 대상.
     */
    @Column(name = "out_order_id", nullable = false, length = 40)
    private String outOrderId;

    /**
     * 사방넷 릴리즈 ID
     * sabangnet_out_orders.release_id 와 동일한 값.
     * 부모 엔티티 join 없이 직접 조회를 위해 비정규화 보관.
     */
    @Column(name = "release_id")
    private Integer releaseId;

    // ─────────────────────────────────────────
    // 출고대상상품 정보 (release_item_object)
    // ─────────────────────────────────────────

    /**
     * 출고대상상품 ID
     */
    @Column(name = "release_item_id")
    private Integer releaseItemId;

    /**
     * 출고상품 ID — 필수
     * 사방넷 출고상품 식별자. SabangnetProduct.shippingProductId 와 연결.
     */
    @Column(name = "shipping_product_id", nullable = false)
    private Integer shippingProductId;

    /**
     * 수량 — 필수
     */
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    /**
     * 릴리즈코드 (최대 20자)
     * 비정규화 보관.
     */
    @Column(name = "release_code", length = 20)
    private String releaseCode;

    /**
     * 출고 진행상태
     * 비정규화 보관. 1.출고요청, 3.출고지시, 5.출고작업중, 7.출고완료, 9.출고취소
     */
    @Column(name = "release_status")
    private Integer releaseStatus;

    /**
     * 출고상품명 (최대 100자)
     */
    @Column(name = "product_name", length = 100)
    private String productName;

    /**
     * 출고상품코드 (최대 20자)
     */
    @Column(name = "product_code", length = 20)
    private String productCode;

    /**
     * 대표바코드 (최대 50자)
     */
    @Column(name = "upc", length = 50)
    private String upc;

    /**
     * 운송장 번호 (최대 50자)
     * 비정규화 보관.
     */
    @Column(name = "shipping_code", length = 50)
    private String shippingCode;

    /**
     * 받는분 이름 (최대 100자)
     * 비정규화 보관.
     */
    @Column(name = "receiver_name", length = 100)
    private String receiverName;

    /**
     * 추가바코드 리스트 (JSON)
     * add_barcode_list 배열을 JSON 문자열로 직렬화하여 저장.
     * 형식: [{"barcode":"...", "quantity":1}, ...]
     */
    @Column(name = "add_barcode_list", length = 2000)
    private String addBarcodeList;

    // ─────────────────────────────────────────
    // 동기화
    // ─────────────────────────────────────────

    /**
     * 수신 배치 ID
     * receiveOutOrders() 1회 실행 단위를 식별하는 UUID.
     * 부모 SabangnetOutOrder의 receive_id와 동일한 값이 저장된다.
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

    public SabangnetOutOrderDetail() {
    }

    public SabangnetOutOrderDetail(String id) {
        this.id = id;
    }

    // ─────────────────────────────────────────
    // Getter / Setter
    // ─────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOutOrderId() { return outOrderId; }
    public void setOutOrderId(String outOrderId) { this.outOrderId = outOrderId; }

    public Integer getReleaseId() { return releaseId; }
    public void setReleaseId(Integer releaseId) { this.releaseId = releaseId; }

    public Integer getReleaseItemId() { return releaseItemId; }
    public void setReleaseItemId(Integer releaseItemId) { this.releaseItemId = releaseItemId; }

    public Integer getShippingProductId() { return shippingProductId; }
    public void setShippingProductId(Integer shippingProductId) { this.shippingProductId = shippingProductId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getReleaseCode() { return releaseCode; }
    public void setReleaseCode(String releaseCode) { this.releaseCode = releaseCode; }

    public Integer getReleaseStatus() { return releaseStatus; }
    public void setReleaseStatus(Integer releaseStatus) { this.releaseStatus = releaseStatus; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getUpc() { return upc; }
    public void setUpc(String upc) { this.upc = upc; }

    public String getShippingCode() { return shippingCode; }
    public void setShippingCode(String shippingCode) { this.shippingCode = shippingCode; }

    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }

    public String getAddBarcodeList() { return addBarcodeList; }
    public void setAddBarcodeList(String addBarcodeList) { this.addBarcodeList = addBarcodeList; }

    public String getReceiveId() { return receiveId; }
    public void setReceiveId(String receiveId) { this.receiveId = receiveId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }
}
