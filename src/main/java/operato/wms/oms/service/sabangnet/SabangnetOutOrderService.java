package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import xyz.anythings.sys.service.AbstractQueryService;

import com.fasterxml.jackson.databind.ObjectMapper;
import operato.wms.oms.entity.SabangnetOutOrder;
import operato.wms.oms.entity.SabangnetOutOrderDetail;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 사방넷 출고(릴리즈) 서비스
 * - 출고 목록/단일 조회, 출고대상상품 조회, 재고할당 조회
 * - 출고회차, 피킹리스트, DAS 번호 등록/수정
 * - 출고취소, 기타정보 수정
 *
 * 사방넷 API (물류사 전용):
 *   GET    /v2/release/{릴리즈ID}               — 출고 조회(단일)
 *   GET    /v2/releases                         — 출고 조회(벌크)
 *   GET    /v2/release/items                    — 출고대상상품 조회(벌크)
 *   GET    /v2/release/item_stocks              — 출고대상상품 재고할당 조회(벌크)
 *   PATCH  /v2/release/cancel/{릴리즈ID}         — 출고취소 (출고요청 상태만 가능)
 *   GET    /v2/release/shipping_work            — 출고회차 조회(벌크)
 *   GET    /v2/release/picking_list/{출고지시ID} — 피킹리스트 조회(벌크)
 *   PUT    /v2/release_etc/{릴리즈ID}            — 기타정보 수정(단일)
 *   PUT    /v2/release_etcs                     — 기타정보 수정(벌크)
 *   POST   /v2/shipping/das_work                — DAS 번호 등록/수정(벌크)
 *
 * 릴리즈 진행상태(release_status):
 *   1.출고요청, 3.출고지시, 5.출고작업중, 7.출고완료, 9.출고취소
 */
@Component
public class SabangnetOutOrderService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetOutOrderService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    // ─────────────────────────────────────────
    // 조회
    // ─────────────────────────────────────────

    /**
     * 사방넷 출고 단일 조회
     * 응답: response — 출고 기본 Object 전체 필드
     *
     * @param releaseId 릴리즈 ID
     */
    public Map<String, Object> getOutOrder(int releaseId,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet("/v2/release/" + releaseId, null, comCd, whCd);
    }

    /**
     * 사방넷 출고 목록 조회 (벌크)
     * 응답: response.data_list — 출고 기본 Object 리스트
     *
     * @param memberId      고객사 ID (필수)
     * @param releaseDate   출고요청일 (YYYYMMDD, null이면 조건 없음)
     * @param releaseStatus 출고 진행상태 (1.출고요청, 3.출고지시, 5.출고작업중, 7.출고완료, 9.출고취소, null이면 전체)
     * @param page          페이지 번호
     */
    public Map<String, Object> getOutOrderList(int memberId, String releaseDate,
            Integer releaseStatus, int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("member_id", String.valueOf(memberId));
        if (releaseDate != null)   params.put("release_date", releaseDate);
        if (releaseStatus != null) params.put("release_status", String.valueOf(releaseStatus));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/releases", params, comCd, whCd);
    }

    /**
     * 출고대상상품 조회 (벌크)
     * 응답: response.data_list — 출고대상상품 Object 리스트 (add_barcode_list 포함)
     *
     * @param memberId            고객사 ID (필수)
     * @param shippingOrderInfoId 출고지시 ID (null이면 조건 없음)
     * @param page                페이지 번호
     */
    public Map<String, Object> getOutOrderDetail(int memberId, Integer shippingOrderInfoId,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("member_id", String.valueOf(memberId));
        if (shippingOrderInfoId != null)
            params.put("shipping_order_info_id", String.valueOf(shippingOrderInfoId));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/release/items", params, comCd, whCd);
    }

    /**
     * 출고대상상품 재고할당 조회 (벌크)
     * 재고할당방식 옵션 사용 및 출고지시 이후 상태에서만 조회 가능
     * 응답: response.data_list — 출고대상상품 Object 리스트 (location_id, location_name, expire_date 추가)
     *
     * @param memberId            고객사 ID (필수)
     * @param shippingOrderInfoId 출고지시 ID (null이면 조건 없음)
     * @param page                페이지 번호
     */
    public Map<String, Object> getOutOrderDetailStocks(int memberId, Integer shippingOrderInfoId,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("member_id", String.valueOf(memberId));
        if (shippingOrderInfoId != null)
            params.put("shipping_order_info_id", String.valueOf(shippingOrderInfoId));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/release/item_stocks", params, comCd, whCd);
    }

    /**
     * 출고회차 조회 (벌크)
     * 응답: response.data_list — 출고회차 기본 Object 리스트
     *
     * @param memberId  고객사 ID (필수)
     * @param orderDate 출고지시일 (YYYYMMDD, null이면 조건 없음)
     * @param page      페이지 번호
     */
    public Map<String, Object> getOutOrderShippingWork(int memberId, String orderDate,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("member_id", String.valueOf(memberId));
        if (orderDate != null) params.put("order_date", orderDate);
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/release/shipping_work", params, comCd, whCd);
    }

    /**
     * 피킹리스트 조회 (벌크)
     * 응답: response.data_list — 피킹리스트 Object 리스트 (add_barcode_list 포함)
     *
     * @param shippingOrderInfoId 출고지시 ID (필수)
     * @param page                페이지 번호
     */
    public Map<String, Object> getPickingList(int shippingOrderInfoId,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet(
                "/v2/release/picking_list/" + shippingOrderInfoId, params, comCd, whCd);
    }

    // ─────────────────────────────────────────
    // 수정 / 취소
    // ─────────────────────────────────────────

    /**
     * 출고취소 (출고요청 상태인 경우에만 가능)
     *
     * @param releaseId 취소할 릴리즈 ID
     */
    public Map<String, Object> cancelOutOrder(int releaseId,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiPatch("/v2/release/cancel/" + releaseId, null, comCd, whCd);
    }

    /**
     * 기타정보 수정 (단일)
     * 수정할 필드만 payload에 포함하여 전송 (etc1~etc6)
     *
     * @param releaseId 수정할 릴리즈 ID
     * @param payload   수정할 필드 Map (etc1~etc6)
     */
    public Map<String, Object> updateOutOrderEtc(int releaseId, Map<String, Object> payload,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiPut("/v2/release_etc/" + releaseId, payload, comCd, whCd);
    }

    /**
     * 기타정보 수정 (벌크)
     * 수정 대상 목록 [{release_id, etc1~etc6}, ...]
     *
     * @param requestDataList 수정 대상 목록
     */
    public Map<String, Object> updateOutOrderEtcs(List<Map<String, Object>> requestDataList,
            String comCd, String whCd) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("request_data_list", requestDataList);
        return sabangnetApiService.apiPut("/v2/release_etcs", payload, comCd, whCd);
    }

    /**
     * DAS 번호 등록/수정 (벌크)
     *
     * @param memberId            고객사 ID (필수)
     * @param shippingOrderInfoId 출고지시 ID (필수)
     * @param gubun               자동생성 여부 (N.자동생성 사용안함(기본), Y.자동생성 사용)
     * @param requestDataList     {release_id, das_num} 목록 (gubun=N인 경우 필수)
     */
    public Map<String, Object> registerDasWork(int memberId, int shippingOrderInfoId,
            String gubun, List<Map<String, Object>> requestDataList,
            String comCd, String whCd) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("member_id", memberId);
        payload.put("shipping_order_info_id", shippingOrderInfoId);
        if (gubun != null) payload.put("gubun", gubun);
        if (requestDataList != null) payload.put("request_data_list", requestDataList);
        return sabangnetApiService.apiPost("/v2/shipping/das_work", payload, comCd, whCd);
    }

    // ─────────────────────────────────────────
    // 수신 (사방넷 → WMS 로컬 캐시)
    // ─────────────────────────────────────────

    /**
     * 사방넷 출고 수신 — 특정 고객사, 출고요청일 기준 (1일 1회 권장)
     * 사방넷 API → SabangnetOutOrder 엔티티 저장
     *
     * @param domainId    WMS 도메인 ID
     * @param memberId    사방넷 고객사 ID (필수)
     * @param releaseDate 출고요청일 (YYYYMMDD)
     * @param comCd       회사 코드 (Sabangnet Credential 조회 키)
     * @param whCd        창고 코드 (Sabangnet Credential 조회 키)
     */
    @Transactional
    public void receiveOutOrders(Long domainId, int memberId, String releaseDate,
            String comCd, String whCd) throws Exception {
        doReceiveOutOrders(domainId, memberId, releaseDate, comCd, whCd);
    }

    /**
     * 출고 수신 내부 공통 로직
     *
     * Step 1: getOutOrderList → SabangnetOutOrder 저장 + releaseId→outOrderId 맵 구성
     * Step 2: getOutOrderDetail → SabangnetOutOrderDetail 저장 (releaseId로 부모 연결)
     */
    @SuppressWarnings("unchecked")
    private void doReceiveOutOrders(Long domainId, int memberId, String releaseDate,
            String comCd, String whCd) throws Exception {
        String receiveId = UUID.randomUUID().toString();
        int orderCount  = 0;
        int detailCount = 0;

        log.info("[출고 수신] 시작 - comCd={}, whCd={}, memberId={}, releaseDate={}",
                comCd, whCd, memberId, releaseDate);

        // ── Step 1: 출고 목록 수신 → SabangnetOutOrder ───────────────────────────
        // releaseId → outOrderId 매핑 (Step 2에서 상세를 부모에 연결하기 위해 사용)
        // shippingOrderInfoId 고유값 수집 (Step 2에서 출고회차별 상품 조회에 사용)
        Map<Integer, String> releaseToOutOrderId = new HashMap<>();
        Set<Integer> shippingOrderInfoIds = new LinkedHashSet<>();
        int page = 1;

        while (true) {
            Map<String, Object> result = getOutOrderList(memberId, releaseDate, null, page, comCd, whCd);

            if (!sabangnetApiService.isSuccess(result)) {
                log.error("[출고 수신] 출고 목록 API 오류 - code: {}, message: {}",
                        result.get("code"), result.get("message"));
                break;
            }

            Map<String, Object> response = (Map<String, Object>) result.get("response");
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data_list");

            if (dataList == null || dataList.isEmpty()) break;

            List<SabangnetOutOrder> pageOrders = new ArrayList<>();

            for (Map<String, Object> src : dataList) {
                String outOrderId = UUID.randomUUID().toString();
                Integer releaseId = toInt(src.get("release_id"));
                Integer shippingOrderInfoId = toInt(src.get("shipping_order_info_id"));

                SabangnetOutOrder order = new SabangnetOutOrder();
                order.setId(outOrderId);
                order.setDomainId(domainId);
                order.setComCd(comCd);
                order.setWhCd(whCd);
                order.setReleaseId(releaseId);
                order.setMemberId(toInt(src.get("member_id")));
                order.setReleaseCode(toStr(src.get("release_code")));
                order.setOrderId(toInt(src.get("order_id")));
                order.setOrderCode(toStr(src.get("order_code")));
                order.setCompanyOrderCode(toStr(src.get("company_order_code")));
                order.setShippingMethodId(toInt(src.get("shipping_method_id")));
                order.setRequestShippingDt(toStr(src.get("request_shipping_dt")));
                order.setReleaseDate(toStr(src.get("release_date")));
                order.setReleaseStatus(toInt(src.get("release_status")));
                order.setCompleteDate(toStr(src.get("complete_date")));
                order.setShippingOrderInfoId(shippingOrderInfoId);
                order.setDeliveryAgencyId(toInt(src.get("delivery_agency_id")));
                order.setShippingCode(toStr(src.get("shipping_code")));
                order.setEtc1(toStr(src.get("etc1")));
                order.setEtc2(toStr(src.get("etc2")));
                order.setEtc3(toStr(src.get("etc3")));
                order.setEtc4(toStr(src.get("etc4")));
                order.setEtc5(toStr(src.get("etc5")));
                order.setEtc6(toStr(src.get("etc6")));
                order.setBuyerName(toStr(src.get("buyer_name")));
                order.setReceiverName(toStr(src.get("receiver_name")));
                order.setTel1(toStr(src.get("tel1")));
                order.setTel2(toStr(src.get("tel2")));
                order.setZipcode(toStr(src.get("zipcode")));
                order.setShippingAddress1(toStr(src.get("shipping_address1")));
                order.setShippingAddress2(toStr(src.get("shipping_address2")));
                order.setShippingMessage(toStr(src.get("shipping_message")));
                order.setChannelId(toInt(src.get("channel_id")));
                order.setDasNum(toStr(src.get("das_num")));
                order.setReceiveId(receiveId);
                order.setSyncStatus(SabangnetOutOrder.SYNC_STATUS_NONE);

                pageOrders.add(order);
                releaseToOutOrderId.put(releaseId, outOrderId);
                // 출고지시 이후 상태(shippingOrderInfoId 존재)인 릴리즈만 상품 조회 대상
                if (shippingOrderInfoId != null) shippingOrderInfoIds.add(shippingOrderInfoId);
                orderCount++;
            }

            this.queryManager.insertBatch(pageOrders);

            Object totalPage = response.get("total_page");
            if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage))) break;
            page++;
        }

        // ── Step 2: 출고대상상품 수신 → SabangnetOutOrderDetail ──────────────────
        // 출고회차(shippingOrderInfoId)별로 조회하여 다른 날짜 데이터 혼입 방지
        // TODO : 실제 데이터 확인 후, shippingOrderInfoId 값이 어떤 값인지 확인 필요. 
        ObjectMapper mapper = new ObjectMapper();

        for (Integer shippingOrderInfoId : shippingOrderInfoIds) {
            page = 1;
            while (true) {
                Map<String, Object> result = getOutOrderDetail(memberId, shippingOrderInfoId, page, comCd, whCd);

                if (!sabangnetApiService.isSuccess(result)) {
                    log.error("[출고 수신] 출고대상상품 API 오류 - shippingOrderInfoId={}, code: {}, message: {}",
                            shippingOrderInfoId, result.get("code"), result.get("message"));
                    break;
                }

                Map<String, Object> response = (Map<String, Object>) result.get("response");
                List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data_list");

                if (dataList == null || dataList.isEmpty()) break;

                List<SabangnetOutOrderDetail> pageDetails = new ArrayList<>();

                for (Map<String, Object> src : dataList) {
                    Integer releaseId = toInt(src.get("release_id"));
                    String outOrderId = releaseToOutOrderId.get(releaseId);
                    if (outOrderId == null) continue;

                    List<Object> addBarcodeRaw = (List<Object>) src.get("add_barcode_list");
                    String addBarcodeJson = null;
                    if (addBarcodeRaw != null && !addBarcodeRaw.isEmpty()) {
                        addBarcodeJson = mapper.writeValueAsString(addBarcodeRaw);
                    }

                    SabangnetOutOrderDetail detail = new SabangnetOutOrderDetail();
                    detail.setDomainId(domainId);
                    detail.setOutOrderId(outOrderId);
                    detail.setReleaseId(releaseId);
                    detail.setReleaseItemId(toInt(src.get("release_item_id")));
                    detail.setShippingProductId(toInt(src.get("shipping_product_id")));
                    detail.setQuantity(toInt(src.get("quantity")));
                    detail.setReleaseCode(toStr(src.get("release_code")));
                    detail.setReleaseStatus(toInt(src.get("release_status")));
                    detail.setProductName(toStr(src.get("product_name")));
                    detail.setProductCode(toStr(src.get("product_code")));
                    detail.setUpc(toStr(src.get("upc")));
                    detail.setShippingCode(toStr(src.get("shipping_code")));
                    detail.setReceiverName(toStr(src.get("receiver_name")));
                    detail.setAddBarcodeList(addBarcodeJson);
                    detail.setReceiveId(receiveId);
                    detail.setSyncStatus(SabangnetOutOrderDetail.SYNC_STATUS_NONE);

                    pageDetails.add(detail);
                    detailCount++;
                }

                if (!pageDetails.isEmpty()) {
                    this.queryManager.insertBatch(pageDetails);
                }

                Object totalPage = response.get("total_page");
                if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage))) break;
                page++;
            }
        }

        log.info("[출고 수신] 완료 - 출고 {}건, 출고대상상품 {}건", orderCount, detailCount);

        // TODO: WMS 출하 주문 동기화 (syncShipmentByOutOrder) 호출
        // syncShipmentByOutOrder(receiveId);
    }

    // ─────────────────────────────────────────
    // 동기화 (사방넷 캐시 → WMS 마스터)
    // ─────────────────────────────────────────

    /**
     * 수신된 출고를 WMS ShipmentOrder(출하 주문)와 동기화
     * receiveOutOrders() 실행 후 호출하여 수신 배치 단위로 동기화를 수행한다.
     *
     * @param receiveId receiveOutOrders() 실행 시 생성된 수신 배치 ID
     */
    @Transactional
    public void syncShipmentByOutOrder(String receiveId) {
        // TODO: SabangnetOutOrder → ShipmentOrder(출하 주문) 동기화
        //
        // Merge 전략 필요
        // - releaseCode 또는 companyOrderCode 기준으로 ShipmentOrder 존재 여부 확인 후 INSERT / UPDATE
        //
        // [SabangnetOutOrder → ShipmentOrder 필드 매핑]
        // SabangnetOutOrder 필드      ShipmentOrder 필드     비고
        // -----------------------------------------------------------------------
        // releaseCode              -> shipmentNo            출하번호
        // companyOrderCode         -> orderNo               주문번호
        // releaseDate (YYYYMMDD)   -> orderDate             YYYY-MM-DD 변환 필요
        // requestShippingDt        -> shipDate              YYYY-MM-DD 변환 필요
        // releaseStatus            -> status                상태 변환 필요:
        //                                                     1(출고요청)   → REQUEST
        //                                                     3(출고지시)   → ASSIGNED
        //                                                     5(출고작업중) → PICKING
        //                                                     7(출고완료)   → END
        //                                                     9(출고취소)   → CANCEL
        // shippingCode             -> invoiceNo             운송장번호
        // buyerName                -> orderName             주문자명
        // receiverName             -> consigneeName         받는분 이름
        // tel1                     -> consigneeTel          전화번호
        // zipcode                  -> zipcode               우편번호
        // shippingAddress1         -> address1              주소1
        // shippingAddress2         -> address2              주소2
        // shippingMessage          -> deliveryMessage       배송메시지
        // memberId                 -> comCd                 고객사 → 화주코드 역참조 필요
        // shippingMethodId            추가 필요              배송방식 (attr 활용 고려)
        // deliveryAgencyId            추가 필요              택배사 ID (attr 활용 고려)
        // channelId                   추가 필요              발주타입 ID (attr 활용 고려)
        // dasNum                      추가 필요              DAS 번호 (attr 활용 고려)
        // releaseId                   추가 필요              릴리즈 ID (attr 활용 고려)
        // receiveId                 - 동기화 전용 필드        ShipmentOrder 동기화 불필요
        // syncStatus                - 동기화 전용 필드        동기화 완료 후 'Y'로 업데이트
    }

    // ─────────────────────────────────────────
    // 유틸리티
    // ─────────────────────────────────────────

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
