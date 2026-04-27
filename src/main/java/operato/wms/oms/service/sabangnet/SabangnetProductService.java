package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import xyz.anythings.sys.service.AbstractQueryService;

import operato.wms.oms.entity.SabangnetProduct;
import operato.wms.oms.entity.SabangnetProductBarcode;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 사방넷 출고상품(SKU) 서비스
 * - 출고상품 목록/단일 조회
 * - WMS 상품 마스터 수신 (SabangnetProduct / SabangnetProductBarcode 엔티티 매핑)
 *
 * 사방넷 API:
 * 출고상품 조회(벌크) : GET /v2/product/shipping_products
 * 출고상품 조회(단일) : GET /v2/product/shipping_product/{출고상품ID}
 *
 * memberId : 사방넷의 화주사 구분 값 (WMS 의 comCd 와 같은 개념)
 */
@Component
public class SabangnetProductService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetProductService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    /**
     * 사방넷 출고상품 목록 조회 (벌크) — 전체 화주사
     * 응답: response.data_list — 출고상품 기본 Object 리스트
     *
     * @param page  페이지 번호 (1부터 시작)
     * @param comCd 회사코드
     * @param whCd  창고코드
     */
    public Map<String, Object> getProductList(int page, String comCd, String whCd) throws Exception {
        return getProductList(page, comCd, whCd, null);
    }

    /**
     * 사방넷 출고상품 목록 조회 (벌크) — 특정 화주사
     * 응답: response.data_list — 출고상품 기본 Object 리스트
     *
     * @param page     페이지 번호 (1부터 시작)
     * @param comCd    회사코드
     * @param whCd     창고코드
     * @param memberId 사방넷 고객사(화주사) ID (null이면 전체 화주사)
     */
    public Map<String, Object> getProductList(int page, String comCd, String whCd, Integer memberId) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("page", String.valueOf(page));
        if (memberId != null)
            params.put("member_id", String.valueOf(memberId));
        return sabangnetApiService.apiGet("/v2/product/shipping_products", params, comCd, whCd);
    }

    /**
     * 사방넷 출고상품 단일 조회
     * 응답: response — 출고상품 기본 Object
     *
     * @param shippingProductId 사방넷 출고상품 ID
     */
    public Map<String, Object> getProduct(int shippingProductId,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet(
                "/v2/product/shipping_product/" + shippingProductId, null, comCd, whCd);
    }

    /**
     * 출고상품 코드로 출고상품 검색 (벌크 조회, product_code 필터) — 전체 화주사
     */
    public Map<String, Object> findProductByCode(String productCode,
            String comCd, String whCd) throws Exception {
        return findProductByCode(productCode, comCd, whCd, null);
    }

    /**
     * 출고상품 코드로 출고상품 검색 (벌크 조회, product_code 필터) — 특정 화주사
     *
     * @param memberId 사방넷 고객사(화주사) ID (null이면 전체 화주사)
     */
    public Map<String, Object> findProductByCode(String productCode,
            String comCd, String whCd, Integer memberId) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("product_code", productCode);
        if (memberId != null)
            params.put("member_id", String.valueOf(memberId));
        return sabangnetApiService.apiGet("/v2/product/shipping_products", params, comCd, whCd);
    }

    /**
     * 사방넷 출고상품 수신 — 전체 화주사 (1일 1회 권장)
     * 사방넷 API → SabangnetProduct / SabangnetProductBarcode 엔티티 매핑
     */
    @Transactional
    public void receiveProduct(Long domainId, String comCd, String whCd) throws Exception {
        doReceiveProduct(domainId, comCd, whCd, null);
    }

    /**
     * 사방넷 출고상품 수신 — 특정 화주사 (1일 1회 권장)
     * 사방넷 API → SabangnetProduct / SabangnetProductBarcode 엔티티 매핑
     *
     * @param memberId 사방넷 고객사(화주사) ID
     */
    @Transactional
    public void receiveProduct(Long domainId, String comCd, String whCd, Integer memberId) throws Exception {
        doReceiveProduct(domainId, comCd, whCd, memberId);
    }

    /**
     * 출고상품 수신 내부 공통 로직
     *
     * 응답 구조:
     * response.data_list : 출고상품 목록
     * response.total_page : 전체 페이지 수
     */
    @SuppressWarnings("unchecked")
    private void doReceiveProduct(Long domainId, String comCd, String whCd, Integer memberId) throws Exception {
        // 이번 수신 배치 전체를 식별하는 UUID — Product·Barcode에 동일하게 저장
        String receiveId = UUID.randomUUID().toString();
        int page = 1;
        int totalCount = 0;
        int barcodeCount = 0;

        String memberLabel = memberId != null ? "memberId=" + memberId : "전체 화주사";
        log.info("[출고상품 수신] 시작 - comCd={}, whCd={}, {}", comCd, whCd, memberLabel);

        while (true) {
            Map<String, Object> result = getProductList(page, comCd, whCd, memberId);

            if (!sabangnetApiService.isSuccess(result)) {
                log.error("[출고상품 수신] API 오류 - code: {}, message: {}",
                        result.get("code"), result.get("message"));
                break;
            }

            Map<String, Object> response = (Map<String, Object>) result.get("response");
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data_list");

            if (dataList == null || dataList.isEmpty())
                break;

            List<SabangnetProduct> pageProducts = new ArrayList<>();
            List<SabangnetProductBarcode> pageBarcodes = new ArrayList<>();

            for (Map<String, Object> src : dataList) {
                // product ID를 미리 할당해서 barcode의 productId에 참조
                String productId = UUID.randomUUID().toString();

                SabangnetProduct product = new SabangnetProduct();
                product.setId(productId);                                               // PK (UUID, 사전 할당)
                product.setDomainId(domainId);                                          // 도메인 ID (멀티테넌시)
                product.setComCd(comCd);                                                // 회사 코드
                product.setWhCd(whCd);                                                  // 창고 코드
                product.setShippingProductId(toInt(src.get("shipping_product_id")));    // 사방넷 출고상품 ID
                product.setMemberId(toInt(src.get("member_id")));                       // 사방넷 고객사(화주사) ID
                product.setProductCode(toStr(src.get("product_code")));                 // 출고상품코드 (최대 20자)
                product.setSupplyCompanyId(toInt(src.get("supply_company_id")));        // 공급사 ID
                product.setSupplierId(toInt(src.get("supplier_id")));                   // 매입처 ID
                product.setCategoryId(toInt(src.get("category_id")));                   // 출고상품 구분 ID
                product.setProductName(toStr(src.get("product_name")));                 // 상품명 (최대 100자)
                product.setUpc(toStr(src.get("upc")));                                  // 대표 바코드 (최대 50자)
                product.setManageCode1(toStr(src.get("manage_code1")));                 // 관리키워드1 (최대 30자)
                product.setManageCode2(toStr(src.get("manage_code2")));                 // 관리키워드2 (최대 30자)
                product.setManageCode3(toStr(src.get("manage_code3")));                 // 관리키워드3 (최대 30자)
                product.setProductDesc(toStr(src.get("product_desc")));                 // 상품 설명 (최대 250자)
                product.setSingleWidth(toInt(src.get("single_width")));                 // 낱개 가로 (mm)
                product.setSingleLength(toInt(src.get("single_length")));               // 낱개 세로 (mm)
                product.setSingleHeight(toInt(src.get("single_height")));               // 낱개 높이 (mm)
                product.setSingleWeight(toInt(src.get("single_weight")));               // 낱개 무게 (g)
                product.setBoxWidth(toInt(src.get("box_width")));                       // 카톤박스 가로 (mm)
                product.setBoxLength(toInt(src.get("box_length")));                     // 카톤박스 세로 (mm)
                product.setBoxHeight(toInt(src.get("box_height")));                     // 카톤박스 높이 (mm)
                product.setBoxWeight(toInt(src.get("box_weight")));                     // 카톤박스 무게 (g)
                product.setSingleEta(toInt(src.get("single_eta")));                     // 카톤박스 낱개 입수 수량
                product.setPaletCount(toInt(src.get("palet_count")));                   // 팔레트 입수 수량
                product.setUseExpireDate(toInt(src.get("use_expire_date")));            // 유통기한 사용 여부 (1:사용, 0:사용안함)
                product.setUseMakeDate(toInt(src.get("use_make_date")));                // 제조일자 사용 여부 (1:사용, 0:사용안함)
                product.setExpireDateByMakeDate(toInt(src.get("expire_date_by_make_date"))); // 제조일로부터 유통기한 일수
                product.setWarningExpireDate(toInt(src.get("warning_expire_date")));    // 임박재고 전환 기준일
                product.setRestrictedExpireDate(toInt(src.get("restricted_expire_date"))); // 출고불가 기준일
                product.setEditCode(toStr(src.get("edit_code")));                       // 출고편집코드 (최대 20자)
                product.setMaxQuantityPerBox(toInt(src.get("max_quantity_per_box")));   // 최대 합포장 수량
                product.setLocationId(toInt(src.get("location_id")));                   // 대표 로케이션 ID
                product.setLocationQuantity(toInt(src.get("location_quantity")));       // 로케이션 적정 수량
                product.setStatus(toInt(src.get("status")));                            // 활성화 여부 (1:활성화, 0:비활성화)
                product.setSyncedAt(null);                                              // 사방넷 동기화 일시 (수신 시점 미기록)
                product.setReceiveId(receiveId);                                        // 수신 배치 ID
                product.setSyncStatus(SabangnetProduct.SYNC_STATUS_NONE);               // WMS SKU 동기화 상태 (N:미동기화)
                pageProducts.add(product);

                List<Map<String, Object>> barcodeList = (List<Map<String, Object>>) src.getOrDefault("add_barcode_list",
                        Collections.emptyList());
                for (Map<String, Object> b : barcodeList) {
                    SabangnetProductBarcode barcode = new SabangnetProductBarcode();
                    barcode.setDomainId(domainId);
                    barcode.setProductId(productId);
                    barcode.setShippingProductId(toInt(src.get("shipping_product_id")));
                    barcode.setBarcode(toStr(b.get("barcode")));
                    barcode.setQuantity(toInt(b.get("quantity")));
                    barcode.setReceiveId(receiveId);
                    barcode.setSyncStatus(SabangnetProductBarcode.SYNC_STATUS_NONE);
                    pageBarcodes.add(barcode);
                    barcodeCount++;
                }
                totalCount++;
            }

            this.queryManager.insertBatch(pageProducts);
            if (!pageBarcodes.isEmpty()) {
                this.queryManager.insertBatch(pageBarcodes);
            }

            // 마지막 페이지 도달 시 종료
            Object totalPage = response.get("total_page");
            if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage)))
                break;

            page++;
        }
        log.info("[출고상품 수신] 완료 - 총 {}개, 추가바코드 {}개", totalCount, barcodeCount);

        // TODO : 상품 동기화 (syncSkuByProduct) 호출
        // syncSkuByProduct(receiveId);
    }

    /**
     * 수신된 출고상품을 WMS SKU와 동기화
     * receiveProduct() 실행 후 호출하여 수신 배치 단위로 동기화를 수행한다.
     *
     * @param receiveId receiveProduct() 실행 시 생성된 수신 배치 ID
     */
    @Transactional
    public void syncSkuByProduct(String receiveId) {
        // TODO: WMS SKU 와 동기화 작업
        //
        // Merge 전략 필요
        // 화주사 코드 확인 : 사방넷 : memberId -> WMS : comCd
        // receiveId 와 같이 상품 정보 업데이트시 어떤 인터페이스로 변경되었는지 추척하는 컬럼 필요 할 것 같음
        // 사방넷의 경우 바코드 테이블이 별도로 있는 것 같음 -> SKU 테이블과 연동 방안 필요
        //
        // [SabangnetProduct -> SKU 필드 매핑]
        // SabangnetProduct 필드        SKU 필드              비고
        // -----------------------------------------------------------------------
        // comCd                     -> SKU.comCd             화주사 코드 (동일)
        // whCd                         추가 필요               SKU에 없음 (창고는 별도 엔티티)
        // shippingProductId            추가 필요               사방넷 전용 ID (attr 활용 고려)
        // memberId                     추가 필요               사방넷 고객사 ID
        // productCode               -> SKU.skuCd             상품 코드 (키 매핑)
        // supplyCompanyId              추가 필요               사방넷 공급사 ID (WMS에 매핑 없음)
        // supplierId                -> SKU.vendCd            공급업체 코드 (Integer -> String 변환 필요)
        // categoryId                -> SKU.skuClass          카테고리 (Integer -> String 변환 필요)
        // productName               -> SKU.skuNm             상품명
        // upc                       -> SKU.skuBarcd          대표 바코드
        // manageCode1               -> SKU.attr01            관리키워드1 (커스텀 속성 활용)
        // manageCode2               -> SKU.attr02            관리키워드2
        // manageCode3               -> SKU.attr03            관리키워드3
        // productDesc               -> SKU.skuDesc           상품 설명
        // singleWidth               -> SKU.skuWd             낱개 가로 (단위 동일: mm, Integer -> Float 변환 필요)
        // singleLength              -> SKU.skuLen            낱개 세로 (Integer -> Float 변환 필요)
        // singleHeight              -> SKU.skuHt             낱개 높이 (Integer -> Float 변환 필요)
        // singleWeight              -> SKU.skuWt             낱개 무게 (단위 차이: g->kg, 1000으로 나누기 필요)
        // boxWidth                  -> SKU.boxWd             박스 가로 (Integer -> Float 변환 필요)
        // boxLength                 -> SKU.boxLen            박스 세로 (Integer -> Float 변환 필요)
        // boxHeight                 -> SKU.boxHt             박스 높이 (Integer -> Float 변환 필요)
        // boxWeight                 -> SKU.boxWt             박스 무게 (단위 차이: g->kg, 1000으로 나누기 필요)
        // singleEta                 -> SKU.boxInQty          박스 입수 수량 (낱개 기준)
        // paletCount                -> SKU.pltInQty          팔레트 입수 수량
        // useExpireDate             -> SKU.useExpireDate     유통기한 사용 여부 (Integer 1/0 -> Boolean 변환 필요)
        // useMakeDate                  추가 필요               SKU에 없음 (제조일자 관리 여부)
        // expireDateByMakeDate      -> SKU.expirePeriod      유통기한 일수 (의미 유사, 확인 필요)
        // warningExpireDate         -> SKU.imminentPeriod    임박재고 전환 기준일
        // restrictedExpireDate      -> SKU.noOutPeriod       출고불가 기준일
        // editCode                     추가 필요               SKU에 없음 (출고편집코드)
        // maxQuantityPerBox            추가 필요               SKU에 없음 (최대 합포장 수량)
        // locationId                   추가 필요               SKU에 없음 (로케이션 엔티티에서 관리)
        // locationQuantity             추가 필요               SKU에 없음 (로케이션 적정 수량)
        // status                    -> SKU.delFlag           활성화 여부 (status=0이면 delFlag=true, 역방향 변환)
        // syncedAt                   - 동기화 전용 필드          SKU 동기화 불필요
        // receiveId                  - 동기화 전용 필드          SKU 동기화 불필요
        // syncStatus                 - 동기화 전용 필드          SKU 동기화 완료 후 'Y' 로 업데이트
        //
        // [SabangnetProductBarcode -> SKU 필드 매핑]
        // SabangnetProductBarcode 필드  SKU 필드              비고
        // -----------------------------------------------------------------------
        // productId                  - SabangnetProduct 참조  SKU 연결은 productCode -> skuCd 로 조회
        // shippingProductId          - 사방넷 전용 ID           SKU 동기화 불필요
        // barcode (quantity=1)      -> SKU.skuBarcd2         추가 낱개 바코드 (2번째)
        // barcode (quantity=1)      -> SKU.skuBarcd3         추가 낱개 바코드 (3번째, 슬롯 소진 시 추가 필요)
        // barcode (quantity>1)      -> SKU.caseBarcd         묶음 단위 바코드 (박스/케이스 바코드로 매핑)
        // quantity (>1)             -> SKU.boxInQty          묶음 수량 (singleEta 와 중복 확인 필요)
        // receiveId                  - 동기화 전용 필드          SKU 동기화 불필요
        // syncStatus                 - 동기화 전용 필드          SKU 동기화 완료 후 'Y' 로 업데이트
    }

    /** JSON 응답 값을 Integer로 안전하게 변환 */
    private Integer toInt(Object val) {
        if (val == null)
            return null;
        if (val instanceof Integer)
            return (Integer) val;
        if (val instanceof Number)
            return ((Number) val).intValue();
        try {
            return Integer.parseInt(String.valueOf(val));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** JSON 응답 값을 String으로 변환 */
    private String toStr(Object val) {
        return val == null ? null : String.valueOf(val);
    }
}
