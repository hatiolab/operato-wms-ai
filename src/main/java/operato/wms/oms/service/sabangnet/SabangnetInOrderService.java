package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import xyz.anythings.sys.service.AbstractQueryService;

import operato.wms.oms.entity.SabangnetInOrder;
import operato.wms.oms.entity.SabangnetInOrderDetail;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 사방넷 입고예정 서비스
 * - 사방넷 입고예정 목록/단일 조회 → SabangnetInOrder / SabangnetInOrderDetail 엔티티 수신
 * - 예정대비 입고현황 조회
 *
 * 사방넷 API:
 *   입고예정 등록(단일)     : POST /v2/inventory/receiving_plan
 *   입고예정 수정          : PUT  /v2/inventory/receiving_plan/{입고예정ID}
 *   입고예정 취소          : PUT  /v2/inventory/receiving_plan/cancel/{입고예정ID}
 *   입고예정 조회(단일)     : GET  /v2/inventory/receiving_plan/{입고예정ID}
 *   입고예정 조회(벌크)     : GET  /v2/inventory/receiving_plans
 *   예정대비입고현황 조회   : GET  /v2/inventory/receiving_plan_result/{입고예정ID}
 *
 * 입고예정 진행상태(plan_status):
 *   1.입고예정, 2.입고검수중, 3.입고완료, 4.입고취소
 */
@Component
public class SabangnetInOrderService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetInOrderService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    /**
     * 사방넷 입고예정 목록 조회 (벌크) — 전체 화주사
     * 응답: response.data_list — 입고예정 기본 Object 리스트
     *
     * @param planDate   입고예정일자 (YYYYMMDD, null이면 조건 없음)
     * @param planStatus 입고예정 진행상태 (1.입고예정, 2.입고검수중, 3.입고완료, 4.입고취소)
     * @param page       페이지 번호
     */
    public Map<String, Object> getInOrderList(String planDate, Integer planStatus,
            int page, String comCd, String whCd) throws Exception {
        return getInOrderList(planDate, planStatus, page, comCd, whCd, null);
    }

    /**
     * 사방넷 입고예정 목록 조회 (벌크) — 특정 화주사
     * 응답: response.data_list — 입고예정 기본 Object 리스트
     *
     * @param planDate   입고예정일자 (YYYYMMDD, null이면 조건 없음)
     * @param planStatus 입고예정 진행상태 (1.입고예정, 2.입고검수중, 3.입고완료, 4.입고취소)
     * @param page       페이지 번호
     * @param memberId   사방넷 고객사(화주사) ID (null이면 전체 화주사)
     */
    public Map<String, Object> getInOrderList(String planDate, Integer planStatus,
            int page, String comCd, String whCd, Integer memberId) throws Exception {
        Map<String, String> params = new HashMap<>();
        if (planDate != null)    params.put("plan_date", planDate);
        if (planStatus != null)  params.put("plan_status", String.valueOf(planStatus));
        if (memberId != null)    params.put("member_id", String.valueOf(memberId));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/inventory/receiving_plans", params, comCd, whCd);
    }

    /**
     * 사방넷 입고예정 단일 조회
     * 응답: response — 입고예정 기본 Object (plan_product_list 포함)
     *
     * @param receivingPlanId 입고예정 ID
     */
    public Map<String, Object> getInOrder(int receivingPlanId,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet(
                "/v2/inventory/receiving_plan/" + receivingPlanId, null, comCd, whCd);
    }

    /**
     * 예정대비 입고현황 조회
     * 응답: response.receiving_plan_product — 상품별 입고 실적
     *
     * @param receivingPlanId 입고예정 ID
     */
    public Map<String, Object> getInOrderResult(int receivingPlanId,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet(
                "/v2/inventory/receiving_plan_result/" + receivingPlanId, null, comCd, whCd);
    }

    /**
     * 입고예정 등록 (WMS → 사방넷)
     * WMS에서 입고 예정을 생성하면 사방넷에도 등록
     *
     * @param planDate        입고예정일자 (YYYYMMDD, 필수)
     * @param planProductList 입고 상품 목록 [{shipping_product_id, plan_quantity}, ...]
     * @param memo            입고예정 메모
     */
    public Map<String, Object> registerInOrder(String planDate,
            List<Map<String, Object>> planProductList, String memo,
            String comCd, String whCd) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("plan_date", planDate);
        payload.put("plan_product_list", planProductList);
        if (memo != null && !memo.isEmpty()) payload.put("memo", memo);
        return sabangnetApiService.apiPost("/v2/inventory/receiving_plan", payload, comCd, whCd);
    }

    /**
     * 입고예정 취소 (WMS → 사방넷)
     * 입고 진행상태가 입고예정(1)인 경우에만 취소 가능
     *
     * @param receivingPlanId 취소할 입고예정 ID
     */
    public Map<String, Object> cancelInOrder(int receivingPlanId,
            String comCd, String whCd) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        return sabangnetApiService.apiPut(
                "/v2/inventory/receiving_plan/cancel/" + receivingPlanId, payload, comCd, whCd);
    }

    /**
     * 사방넷 입고예정 수신 — 전체 화주사 (1일 1회 권장)
     * 사방넷 API → SabangnetInOrder / SabangnetInOrderDetail 엔티티 저장
     *
     * @param domainId WMS 도메인 ID
     * @param comCd    회사 코드 (Sabangnet Credential 조회 키)
     * @param whCd     창고 코드 (Sabangnet Credential 조회 키)
     */
    @Transactional
    public void receiveInOrders(Long domainId, String comCd, String whCd) throws Exception {
        doReceiveInOrders(domainId, comCd, whCd, null);
    }

    /**
     * 사방넷 입고예정 수신 — 특정 화주사 (1일 1회 권장)
     * 사방넷 API → SabangnetInOrder / SabangnetInOrderDetail 엔티티 저장
     *
     * @param domainId WMS 도메인 ID
     * @param comCd    회사 코드 (Sabangnet Credential 조회 키)
     * @param whCd     창고 코드 (Sabangnet Credential 조회 키)
     * @param memberId 사방넷 고객사(화주사) ID
     */
    @Transactional
    public void receiveInOrders(Long domainId, String comCd, String whCd, Integer memberId) throws Exception {
        doReceiveInOrders(domainId, comCd, whCd, memberId);
    }

    /**
     * 입고예정 수신 내부 공통 로직
     * 오늘 입고예정(plan_status=1) 목록을 전 페이지 조회하여 로컬 DB에 적재한다.
     *
     * 응답 구조:
     * response.data_list  : 입고예정 목록
     * response.total_page : 전체 페이지 수
     */
    @SuppressWarnings("unchecked")
    private void doReceiveInOrders(Long domainId, String comCd, String whCd, Integer memberId) throws Exception {
        // 이번 수신 배치 전체를 식별하는 UUID — InOrder·InOrderDetail에 동일하게 저장
        String receiveId = UUID.randomUUID().toString();
        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int page = 1;
        int orderCount  = 0;
        int detailCount = 0;

        String memberLabel = memberId != null ? "memberId=" + memberId : "전체 화주사";
        log.info("[입고예정 수신] 시작 - comCd={}, whCd={}, {}, planDate={}", comCd, whCd, memberLabel, today);

        while (true) {
            // 오늘 입고예정(plan_status=1) 목록 조회
            Map<String, Object> result = getInOrderList(today, SabangnetInOrder.PLAN_STATUS_PLANNED, page, comCd, whCd, memberId);

            if (!sabangnetApiService.isSuccess(result)) {
                log.error("[입고예정 수신] API 오류 - code: {}, message: {}",
                        result.get("code"), result.get("message"));
                break;
            }

            Map<String, Object> response = (Map<String, Object>) result.get("response");
            List<Map<String, Object>> dataList =
                    (List<Map<String, Object>>) response.get("data_list");

            if (dataList == null || dataList.isEmpty()) break;

            List<SabangnetInOrder>       pageOrders  = new ArrayList<>();
            List<SabangnetInOrderDetail> pageDetails = new ArrayList<>();

            for (Map<String, Object> plan : dataList) {
                Integer planId = toInt(plan.get("receiving_plan_id"));

                // 상세 조회로 plan_product_list 포함 정보 획득
                Map<String, Object> detailResult = getInOrder(planId, comCd, whCd);
                if (!sabangnetApiService.isSuccess(detailResult)) {
                    log.warn("[입고예정 수신] 상세 조회 실패 - planId={}", planId);
                    continue;
                }

                Map<String, Object> detail = (Map<String, Object>) detailResult.get("response");

                // InOrder 엔티티 ID를 미리 할당해서 InOrderDetail의 inOrderId에 참조
                String inOrderId = UUID.randomUUID().toString();

                SabangnetInOrder inOrder = new SabangnetInOrder();
                inOrder.setId(inOrderId);                                                // PK (UUID, 사전 할당)
                inOrder.setDomainId(domainId);                                           // 도메인 ID (멀티테넌시)
                inOrder.setComCd(comCd);                                                 // 회사 코드
                inOrder.setWhCd(whCd);                                                   // 창고 코드
                inOrder.setReceivingPlanId(planId);                                      // 사방넷 입고예정 ID
                inOrder.setMemberId(toInt(detail.get("member_id")));                     // 사방넷 고객사(화주사) ID
                inOrder.setReceivingPlanCode(toStr(detail.get("receiving_plan_code")));  // 입고예정코드
                inOrder.setPlanDate(toStr(detail.get("plan_date")));                     // 입고예정일자 (YYYYMMDD)
                inOrder.setPlanStatus(toInt(detail.get("plan_status")));                 // 진행상태
                inOrder.setCompleteDt(toStr(detail.get("complete_dt")));                 // 완료일 (YYYYMMDD)
                inOrder.setMemo(toStr(detail.get("memo")));                              // 입고예정 메모
                inOrder.setAddInfo1(toStr(detail.get("add_info1")));                     // 추가정보1
                inOrder.setAddInfo2(toStr(detail.get("add_info2")));                     // 추가정보2
                inOrder.setAddInfo3(toStr(detail.get("add_info3")));                     // 추가정보3
                inOrder.setAddInfo4(toStr(detail.get("add_info4")));                     // 추가정보4
                inOrder.setAddInfo5(toStr(detail.get("add_info5")));                     // 추가정보5
                inOrder.setReceiveId(receiveId);                                         // 수신 배치 ID
                inOrder.setSyncStatus(SabangnetInOrder.SYNC_STATUS_NONE);                // 동기화 상태 (N:미동기화)
                pageOrders.add(inOrder);
                orderCount++;

                // plan_product_list → InOrderDetail 엔티티 목록
                List<Map<String, Object>> productList =
                        (List<Map<String, Object>>) detail.getOrDefault("plan_product_list",
                                Collections.emptyList());
                for (Map<String, Object> product : productList) {
                    SabangnetInOrderDetail inDetail = new SabangnetInOrderDetail();
                    inDetail.setDomainId(domainId);                                                     // 도메인 ID (멀티테넌시)
                    inDetail.setInOrderId(inOrderId);                                                   // 부모 SabangnetInOrder PK
                    inDetail.setReceivingPlanId(planId);                                                // 사방넷 입고예정 ID (비정규화)
                    inDetail.setShippingProductId(toInt(product.get("shipping_product_id")));           // 출고상품 ID (필수)
                    inDetail.setQuantity(toInt(product.get("quantity")));                               // 예정수량 (필수)
                    inDetail.setReceivingPlanProductId(toInt(product.get("receiving_plan_product_id"))); // 입고예정 상품 ID
                    inDetail.setPlanProductStatus(toInt(product.get("plan_product_status")));           // 입고예정 상품 입고상태
                    inDetail.setExpireDate(toStr(product.get("expire_date")));                          // 유통기한 (YYYYMMDD)
                    inDetail.setMakeDate(toStr(product.get("make_date")));                              // 제조일자 (YYYYMMDD)
                    inDetail.setReceiveId(receiveId);                                                   // 수신 배치 ID
                    inDetail.setSyncStatus(SabangnetInOrderDetail.SYNC_STATUS_NONE);                    // 동기화 상태 (N:미동기화)
                    pageDetails.add(inDetail);
                    detailCount++;
                }
            }

            this.queryManager.insertBatch(pageOrders);
            if (!pageDetails.isEmpty()) {
                this.queryManager.insertBatch(pageDetails);
            }

            // 마지막 페이지 도달 시 종료
            Object totalPage = response.get("total_page");
            if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage))) break;
            page++;
        }

        log.info("[입고예정 수신] 완료 - 입고예정 {}건, 상세 {}건", orderCount, detailCount);

        // TODO : 입고 주문 동기화 (syncReceivingByInOrder) 호출
        // syncReceivingByInOrder(receiveId);
    }

    /**
     * 수신된 입고예정을 WMS Receiving / ReceivingItem과 동기화
     * receiveInOrders() 실행 후 호출하여 수신 배치 단위로 동기화를 수행한다.
     *
     * @param receiveId receiveInOrders() 실행 시 생성된 수신 배치 ID
     */
    @Transactional
    public void syncReceivingByInOrder(String receiveId) {
        // TODO: SabangnetInOrder → receivings, SabangnetInOrderDetail → receiving_items 동기화
        //
        // Merge 전략 필요
        // - rcvReqNo 중복 여부 확인 후 INSERT / SKIP
        // - shippingProductId → skuCd 역참조 필요 (sabangnet_products.product_code → SKU.sku_cd)
        // - planStatus → Receiving.status 변환 필요
        // - 날짜 형식 변환 필요 (YYYYMMDD → YYYY-MM-DD)
        // - ReceivingItem.rcvExpSeq 채번 필요
        //
        // [SabangnetInOrder → Receiving 필드 매핑]
        // SabangnetInOrder 필드       Receiving 필드       비고
        // -----------------------------------------------------------------------
        // comCd                    -> comCd               화주코드 (직접 매핑)
        // whCd                     -> whCd                창고코드 (직접 매핑)
        // receivingPlanCode        -> rcvReqNo            입고요청번호 (null 이면 "SABN-{receivingPlanId}" 사용)
        // receivingPlanCode        -> rcvNo               입고번호 (rcvReqNo 와 동일값)
        // planDate (YYYYMMDD)      -> rcvReqDate          YYYY-MM-DD 변환 필요 (필수)
        // planStatus               -> status              상태 변환 필요:
        //                                                   1(입고예정)   → REQUEST
        //                                                   2(입고검수중) → START
        //                                                   3(입고완료)   → END
        //                                                   4(입고취소)   → 취소 처리 (별도)
        // completeDt (YYYYMMDD)    -> rcvEndDate          YYYY-MM-DD 변환 필요
        // memo                     -> remarks             입고예정 메모 → 비고
        // addInfo1                 -> attr01              추가정보 1-5 → 확장 필드 1-5
        // addInfo2                 -> attr02
        // addInfo3                 -> attr03
        // addInfo4                 -> attr04
        // addInfo5                 -> attr05
        //                             rcvType             추가 필요 → 고정값 "NORMAL" (사방넷은 일반 입고)
        // receivingPlanId             추가 필요            Receiving 에 없음 (attr 활용 고려)
        // memberId                    추가 필요            Receiving 에 없음 (comCd 로 간접 식별)
        // receiveId                 - 동기화 전용 필드      Receiving 동기화 불필요
        // syncStatus                - 동기화 전용 필드      동기화 완료 후 'Y' 로 업데이트
        //
        // [SabangnetInOrderDetail → ReceivingItem 필드 매핑]
        // SabangnetInOrderDetail 필드  ReceivingItem 필드   비고
        // -----------------------------------------------------------------------
        // inOrderId                -> receivingId         생성된 Receiving.id 사용
        // shippingProductId        -> skuCd              SabangnetProduct.productCode 역참조 필요
        //                                                   sabangnet_products.shipping_product_id → product_code → SKU.sku_cd
        // shippingProductId           추가 필요            ReceivingItem 에 없음 (attr 활용 고려)
        // quantity (Integer)       -> rcvExpQty (Double)  예정수량 (Integer → Double 변환 필요)
        // quantity (Integer)       -> totalExpQty (Double) 총입고예정수량 (rcvExpQty 와 동일값)
        // expireDate (YYYYMMDD)    -> expiredDate         YYYY-MM-DD 변환 필요
        // makeDate (YYYYMMDD)      -> prdDate             YYYY-MM-DD 변환 필요
        // receivingPlanProductId      추가 필요            ReceivingItem 에 없음
        // planProductStatus           추가 필요            ReceivingItem 에 없음
        //                             rcvExpDate          추가 필요 → 부모 SabangnetInOrder.planDate 사용
        //                             rcvExpSeq           추가 필요 → 상세 순번 채번 필요 (필수 필드)
        //                             status              추가 필요 → 초기값 WmsInboundConstants.STATUS_REQUEST
        // receiveId                 - 동기화 전용 필드      ReceivingItem 동기화 불필요
        // syncStatus                - 동기화 전용 필드      동기화 완료 후 'Y' 로 업데이트
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
