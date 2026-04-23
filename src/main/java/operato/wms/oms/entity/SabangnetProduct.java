package operato.wms.oms.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

/**
 * 사방넷 출고상품 (Sabangnet Shipping Product)
 *
 * 사방넷 풀필먼트 API v2의 출고상품(Shipping Product)을 WMS 로컬 DB에
 * 캐시/동기화하는 엔티티. 출고상품은 출고·재고 관리 관점의 최소 출고 단위 상품이다.
 *
 * 동기화 주기: 1일 1회 (SabangnetProductService.syncProduct)
 * 사방넷 API: GET /v2/product/shipping_products, GET /v2/product/shipping_product/{id}
 *
 * @author HatioLab
 */
@Table(name = "sabangnet_products", idStrategy = GenerationRule.UUID,
        uniqueFields = "domainId,comCd,whCd,shippingProductId,receiveId",
        indexes = {
                @Index(name = "ix_sabangnet_products_0", columnList = "domain_id,com_cd,wh_cd,shipping_product_id,receive_id", unique = true),
                @Index(name = "ix_sabangnet_products_1", columnList = "domain_id,com_cd,wh_cd,product_code"),
                @Index(name = "ix_sabangnet_products_2", columnList = "domain_id,com_cd,wh_cd,upc"),
                @Index(name = "ix_sabangnet_products_3", columnList = "domain_id,com_cd,wh_cd,status"),
                @Index(name = "ix_sabangnet_products_4", columnList = "domain_id,receive_id,sync_status")
        })
public class SabangnetProduct extends xyz.elidom.orm.entity.basic.ElidomStampHook {

    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = -2831047152309874631L;

    // ─────────────────────────────────────────
    // 활성화 상태 상수
    // ─────────────────────────────────────────

    /** 활성화 상태: 활성화 */
    public static final int STATUS_ACTIVE = 1;
    /** 활성화 상태: 비활성화 */
    public static final int STATUS_INACTIVE = 0;

    // ─────────────────────────────────────────
    // 유통기한/제조일자 사용 여부 상수
    // ─────────────────────────────────────────

    /** 유통기한/제조일자 사용여부: 사용 */
    public static final int DATE_USE = 1;
    /** 유통기한/제조일자 사용여부: 사용안함 */
    public static final int DATE_NOT_USE = 0;

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
    // 사방넷 출고상품 기본 정보
    // ─────────────────────────────────────────

    /**
     * 사방넷 출고상품 ID
     * 사방넷이 내부적으로 부여하는 출고상품 고유 식별자. 수정/조회 API 경로에 사용.
     */
    @Column(name = "shipping_product_id")
    private Integer shippingProductId;

    /**
     * 사방넷 고객사(화주사) ID
     * 물류사 권한으로 API를 호출할 때 필수로 지정하는 고객사 식별자.
     */
    @Column(name = "member_id")
    private Integer memberId;

    /**
     * 출고상품코드 (최대 20자)
     * 사방넷 내 출고상품 코드. 미지정 시 사방넷이 자동 생성.
     */
    @Column(name = "product_code", length = 20)
    private String productCode;

    /**
     * 공급사 ID
     * 해당 출고상품의 공급사를 나타내는 사방넷 공급사 식별자.
     */
    @Column(name = "supply_company_id")
    private Integer supplyCompanyId;

    /**
     * 매입처 ID
     * 출고상품의 매입처를 나타내는 사방넷 매입처 식별자.
     */
    @Column(name = "supplier_id")
    private Integer supplierId;

    /**
     * 출고상품 구분 ID
     * 사방넷 출고상품 카테고리(구분) 식별자.
     * GET /v2/product/shipping_product_categorys 로 목록 조회 가능.
     */
    @Column(name = "category_id")
    private Integer categoryId;

    /**
     * 상품명 (최대 100자) — 필수
     * 사방넷 출고상품의 표시 명칭.
     */
    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    /**
     * 대표 바코드 (최대 50자)
     * 출고상품의 대표 UPC/바코드. 추가 바코드는 SabangnetProductBarcode 엔티티 참고.
     */
    @Column(name = "upc", length = 50)
    private String upc;

    // ─────────────────────────────────────────
    // 관리 키워드
    // ─────────────────────────────────────────

    /**
     * 관리키워드1 (최대 30자)
     * 사방넷 출고상품의 사용자 정의 관리 태그/키워드 1번.
     */
    @Column(name = "manage_code1", length = 30)
    private String manageCode1;

    /**
     * 관리키워드2 (최대 30자)
     * 사방넷 출고상품의 사용자 정의 관리 태그/키워드 2번.
     */
    @Column(name = "manage_code2", length = 30)
    private String manageCode2;

    /**
     * 관리키워드3 (최대 30자)
     * 사방넷 출고상품의 사용자 정의 관리 태그/키워드 3번.
     */
    @Column(name = "manage_code3", length = 30)
    private String manageCode3;

    /**
     * 상품 설명 (최대 250자)
     */
    @Column(name = "product_desc", length = 250)
    private String productDesc;

    // ─────────────────────────────────────────
    // 낱개 치수/무게
    // ─────────────────────────────────────────

    /**
     * 낱개 가로 (단위: mm)
     */
    @Column(name = "single_width")
    private Integer singleWidth;

    /**
     * 낱개 세로 (단위: mm)
     */
    @Column(name = "single_length")
    private Integer singleLength;

    /**
     * 낱개 높이 (단위: mm)
     */
    @Column(name = "single_height")
    private Integer singleHeight;

    /**
     * 낱개 무게 (단위: g)
     */
    @Column(name = "single_weight")
    private Integer singleWeight;

    // ─────────────────────────────────────────
    // 카톤박스 치수/무게/입수
    // ─────────────────────────────────────────

    /**
     * 카톤박스 가로 (단위: mm)
     */
    @Column(name = "box_width")
    private Integer boxWidth;

    /**
     * 카톤박스 세로 (단위: mm)
     */
    @Column(name = "box_length")
    private Integer boxLength;

    /**
     * 카톤박스 높이 (단위: mm)
     */
    @Column(name = "box_height")
    private Integer boxHeight;

    /**
     * 카톤박스 무게 (단위: g)
     */
    @Column(name = "box_weight")
    private Integer boxWeight;

    /**
     * 카톤박스 낱개 입수 수량
     * 한 카톤박스에 들어가는 낱개 단위 수량.
     */
    @Column(name = "single_eta")
    private Integer singleEta;

    /**
     * 팔레트 입수 수량
     * 팔레트 1개에 적재 가능한 카톤박스(또는 낱개) 수량.
     */
    @Column(name = "palet_count")
    private Integer paletCount;

    // ─────────────────────────────────────────
    // 유통기한 / 제조일자 설정
    // ─────────────────────────────────────────

    /**
     * 유통기한 사용 여부
     * 1.사용, 0.사용안함 (기본: 0.사용안함)
     * 입고/재고 관리 시 유통기한 입력 필수 여부를 결정.
     */
    @Column(name = "use_expire_date")
    private Integer useExpireDate;

    /**
     * 제조일자 사용 여부
     * 1.사용, 0.사용안함 (기본: 0.사용안함)
     * 입고 시 제조일자 입력 필수 여부를 결정.
     */
    @Column(name = "use_make_date")
    private Integer useMakeDate;

    /**
     * 제조일로부터 유통기한 일수
     * 제조일자 기준으로 자동 계산되는 유통기한까지의 일수.
     * use_make_date=1, use_expire_date=1인 경우 자동 계산에 사용.
     */
    @Column(name = "expire_date_by_make_date")
    private Integer expireDateByMakeDate;

    /**
     * 임박재고 전환 기준일
     * 유통기한까지 남은 일수가 이 값 이하이면 임박재고로 분류.
     */
    @Column(name = "warning_expire_date")
    private Integer warningExpireDate;

    /**
     * 출고불가 기준일
     * 유통기한까지 남은 일수가 이 값 이하이면 출고 대상에서 제외.
     */
    @Column(name = "restricted_expire_date")
    private Integer restrictedExpireDate;

    // ─────────────────────────────────────────
    // 출고 편집 / 합포장
    // ─────────────────────────────────────────

    /**
     * 출고편집코드 (최대 20자)
     * 출고 처리 시 사용하는 편집 기준 코드.
     */
    @Column(name = "edit_code", length = 20)
    private String editCode;

    /**
     * 최대 합포장 수량
     * 하나의 포장 박스에 함께 담을 수 있는 최대 수량.
     */
    @Column(name = "max_quantity_per_box")
    private Integer maxQuantityPerBox;

    // ─────────────────────────────────────────
    // 로케이션 정보
    // ─────────────────────────────────────────

    /**
     * 대표 로케이션 ID
     * 해당 출고상품의 주 보관 로케이션 식별자.
     * loc_type=2(출고가능) 로케이션만 사용 가능하며, 자체 로케이션 생성 옵션 사용 시에만 입력 가능.
     */
    @Column(name = "location_id")
    private Integer locationId;

    /**
     * 로케이션 적정 수량
     * 대표 로케이션에 보관해야 하는 적정 재고 수량.
     */
    @Column(name = "location_quantity")
    private Integer locationQuantity;

    // ─────────────────────────────────────────
    // 상태 / 동기화
    // ─────────────────────────────────────────

    /**
     * 활성화 여부
     * 1.활성화, 0.비활성화 (기본: 1.활성화)
     */
    @Column(name = "status")
    private Integer status;

    /**
     * 사방넷 동기화 일시 (YYYY-MM-DD)
     * SabangnetProductService.receiveProduct() 실행 시 갱신.
     */
    @Column(name = "synced_at", length = 20)
    private String syncedAt;

    /**
     * 수신 배치 ID
     * receiveProduct() 1회 실행 단위를 식별하는 UUID.
     * 동일 배치에서 수신된 SabangnetProduct·SabangnetProductBarcode에 같은 값이 저장된다.
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

    public SabangnetProduct() {
    }

    public SabangnetProduct(String id) {
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

    public Integer getShippingProductId() { return shippingProductId; }
    public void setShippingProductId(Integer shippingProductId) { this.shippingProductId = shippingProductId; }

    public Integer getMemberId() { return memberId; }
    public void setMemberId(Integer memberId) { this.memberId = memberId; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public Integer getSupplyCompanyId() { return supplyCompanyId; }
    public void setSupplyCompanyId(Integer supplyCompanyId) { this.supplyCompanyId = supplyCompanyId; }

    public Integer getSupplierId() { return supplierId; }
    public void setSupplierId(Integer supplierId) { this.supplierId = supplierId; }

    public Integer getCategoryId() { return categoryId; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getUpc() { return upc; }
    public void setUpc(String upc) { this.upc = upc; }

    public String getManageCode1() { return manageCode1; }
    public void setManageCode1(String manageCode1) { this.manageCode1 = manageCode1; }

    public String getManageCode2() { return manageCode2; }
    public void setManageCode2(String manageCode2) { this.manageCode2 = manageCode2; }

    public String getManageCode3() { return manageCode3; }
    public void setManageCode3(String manageCode3) { this.manageCode3 = manageCode3; }

    public String getProductDesc() { return productDesc; }
    public void setProductDesc(String productDesc) { this.productDesc = productDesc; }

    public Integer getSingleWidth() { return singleWidth; }
    public void setSingleWidth(Integer singleWidth) { this.singleWidth = singleWidth; }

    public Integer getSingleLength() { return singleLength; }
    public void setSingleLength(Integer singleLength) { this.singleLength = singleLength; }

    public Integer getSingleHeight() { return singleHeight; }
    public void setSingleHeight(Integer singleHeight) { this.singleHeight = singleHeight; }

    public Integer getSingleWeight() { return singleWeight; }
    public void setSingleWeight(Integer singleWeight) { this.singleWeight = singleWeight; }

    public Integer getBoxWidth() { return boxWidth; }
    public void setBoxWidth(Integer boxWidth) { this.boxWidth = boxWidth; }

    public Integer getBoxLength() { return boxLength; }
    public void setBoxLength(Integer boxLength) { this.boxLength = boxLength; }

    public Integer getBoxHeight() { return boxHeight; }
    public void setBoxHeight(Integer boxHeight) { this.boxHeight = boxHeight; }

    public Integer getBoxWeight() { return boxWeight; }
    public void setBoxWeight(Integer boxWeight) { this.boxWeight = boxWeight; }

    public Integer getSingleEta() { return singleEta; }
    public void setSingleEta(Integer singleEta) { this.singleEta = singleEta; }

    public Integer getPaletCount() { return paletCount; }
    public void setPaletCount(Integer paletCount) { this.paletCount = paletCount; }

    public Integer getUseExpireDate() { return useExpireDate; }
    public void setUseExpireDate(Integer useExpireDate) { this.useExpireDate = useExpireDate; }

    public Integer getUseMakeDate() { return useMakeDate; }
    public void setUseMakeDate(Integer useMakeDate) { this.useMakeDate = useMakeDate; }

    public Integer getExpireDateByMakeDate() { return expireDateByMakeDate; }
    public void setExpireDateByMakeDate(Integer expireDateByMakeDate) { this.expireDateByMakeDate = expireDateByMakeDate; }

    public Integer getWarningExpireDate() { return warningExpireDate; }
    public void setWarningExpireDate(Integer warningExpireDate) { this.warningExpireDate = warningExpireDate; }

    public Integer getRestrictedExpireDate() { return restrictedExpireDate; }
    public void setRestrictedExpireDate(Integer restrictedExpireDate) { this.restrictedExpireDate = restrictedExpireDate; }

    public String getEditCode() { return editCode; }
    public void setEditCode(String editCode) { this.editCode = editCode; }

    public Integer getMaxQuantityPerBox() { return maxQuantityPerBox; }
    public void setMaxQuantityPerBox(Integer maxQuantityPerBox) { this.maxQuantityPerBox = maxQuantityPerBox; }

    public Integer getLocationId() { return locationId; }
    public void setLocationId(Integer locationId) { this.locationId = locationId; }

    public Integer getLocationQuantity() { return locationQuantity; }
    public void setLocationQuantity(Integer locationQuantity) { this.locationQuantity = locationQuantity; }

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }

    public String getSyncedAt() { return syncedAt; }
    public void setSyncedAt(String syncedAt) { this.syncedAt = syncedAt; }

    public String getReceiveId() { return receiveId; }
    public void setReceiveId(String receiveId) { this.receiveId = receiveId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }
}
