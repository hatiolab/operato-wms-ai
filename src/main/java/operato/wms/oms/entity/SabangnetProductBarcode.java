package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사방넷 출고상품 추가 바코드 (Sabangnet Shipping Product Additional Barcode)
 *
 * 사방넷 풀필먼트 API v2의 출고상품 응답 내 add_barcode_list(add_barcode_object 배열)를
 * WMS 로컬 DB에 저장하는 엔티티.
 *
 * 출고상품 1개는 대표 바코드(upc) 외에 여러 추가 바코드를 가질 수 있으며,
 * 각 바코드에는 해당 바코드 1스캔이 나타내는 수량(quantity)이 함께 저장된다.
 * (예: 묶음 바코드 1개 = 낱개 6개)
 *
 * 사방넷 API: add_barcode_object 구조
 *   - barcode  : string(100), 바코드 값 (필수)
 *   - quantity : integer, 매칭 수량 (필수)
 *
 * @author HatioLab
 */
@Table(name = "sabangnet_product_barcodes", idStrategy = GenerationRule.UUID,
        uniqueFields = "domainId,productId,barcode,receiveId",
        indexes = {
                @Index(name = "ix_sabangnet_product_barcodes_0", columnList = "domain_id,product_id,barcode,receive_id", unique = true),
                @Index(name = "ix_sabangnet_product_barcodes_1", columnList = "domain_id,shipping_product_id"),
                @Index(name = "ix_sabangnet_product_barcodes_2", columnList = "domain_id,barcode"),
                @Index(name = "ix_sabangnet_product_barcodes_3", columnList = "domain_id,receive_id,sync_status")
        })
public class SabangnetProductBarcode extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 7042938510294857163L;

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
     * 상위 SabangnetProduct 엔티티의 PK (UUID)
     * sabangnet_products.id 참조. ON DELETE CASCADE 대상.
     */
    @Column(name = "product_id", nullable = false, length = 40)
    private String productId;

    /**
     * 사방넷 출고상품 ID
     * sabangnet_products.shipping_product_id 와 동일한 값.
     * 부모 엔티티 join 없이 직접 조회를 위해 비정규화 보관.
     */
    @Column(name = "shipping_product_id")
    private Integer shippingProductId;

    // ─────────────────────────────────────────
    // 바코드 정보 (add_barcode_object)
    // ─────────────────────────────────────────

    /**
     * 바코드 값 (최대 100자) — 필수
     * 추가 바코드 문자열. UPC-A, EAN-13, Code128 등 형식 불문.
     */
    @Column(name = "barcode", nullable = false, length = 100)
    private String barcode;

    /**
     * 바코드 매칭 수량 — 필수
     * 해당 바코드 1회 스캔이 나타내는 출고상품 낱개 수량.
     * (예: 묶음 바코드이면 6, 낱개 바코드이면 1)
     */
    @Column(name = "quantity")
    private Integer quantity;

    /**
     * 수신 배치 ID
     * receiveProduct() 1회 실행 단위를 식별하는 UUID.
     * 부모 SabangnetProduct의 receive_id와 동일한 값이 저장된다.
     */
    @Column(name = "receive_id", length = 40)
    private String receiveId;

    /**
     * WMS SKU 동기화 상태 (N/P/Y)
     * N.미동기화(초기값), P.동기화중, Y.동기화완료
     */
    @Column(name = "sync_status", length = 1)
    private String syncStatus;

    // ─────────────────────────────────────────
    // 생성자
    // ─────────────────────────────────────────

    public SabangnetProductBarcode() {
    }

    public SabangnetProductBarcode(String id) {
        this.id = id;
    }

    public SabangnetProductBarcode(String productId, String barcode, Integer quantity) {
        this.productId = productId;
        this.barcode = barcode;
        this.quantity = quantity;
    }

    // ─────────────────────────────────────────
    // Getter / Setter
    // ─────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public Integer getShippingProductId() { return shippingProductId; }
    public void setShippingProductId(Integer shippingProductId) { this.shippingProductId = shippingProductId; }

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getReceiveId() { return receiveId; }
    public void setReceiveId(String receiveId) { this.receiveId = receiveId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }
}
