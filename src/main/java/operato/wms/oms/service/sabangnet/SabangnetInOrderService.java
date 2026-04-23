package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import xyz.anythings.sys.service.AbstractQueryService;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 사방넷 입고예정 서비스
 * - 사방넷 입고예정 목록/단일 조회 → WMS 입고 예정(receivings) 등록
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
 *
 * TODO:
 *   - syncReceivingPlans(): WMS receivings 테이블에 INSERT 구현 필요
 */
@Component
public class SabangnetInOrderService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetInOrderService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    /**
     * 사방넷 입고예정 목록 조회 (벌크)
     * 응답: response.data_list — 입고예정 기본 Object 리스트
     *
     * @param planDate   입고예정일자 (YYYYMMDD, null이면 조건 없음)
     * @param planStatus 입고예정 진행상태 (1.입고예정, 2.입고검수중, 3.입고완료, 4.입고취소)
     * @param page       페이지 번호
     */
    public Map<String, Object> getReceivingPlanList(String planDate, Integer planStatus,
            int page, String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        if (planDate != null)    params.put("plan_date", planDate);
        if (planStatus != null)  params.put("plan_status", String.valueOf(planStatus));
        params.put("page", String.valueOf(page));
        return sabangnetApiService.apiGet("/v2/inventory/receiving_plans", params, comCd, whCd);
    }

    /**
     * 사방넷 입고예정 단일 조회
     * 응답: response — 입고예정 기본 Object (plan_product_list 포함)
     *
     * @param receivingPlanId 입고예정 ID
     */
    public Map<String, Object> getReceivingPlanDetail(int receivingPlanId,
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
    public Map<String, Object> getReceivingPlanResult(int receivingPlanId,
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
    public Map<String, Object> registerReceivingPlan(String planDate,
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
    public Map<String, Object> cancelReceivingPlan(int receivingPlanId,
            String comCd, String whCd) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        return sabangnetApiService.apiPut(
                "/v2/inventory/receiving_plan/cancel/" + receivingPlanId, payload, comCd, whCd);
    }

    /**
     * 신규 입고예정 동기화 → WMS receivings 테이블 등록
     * 사방넷의 입고예정(plan_status=1) 목록을 조회하여 WMS에 반영
     * 폴링 주기: 1일 1회 또는 업무 시간 중 주기적 실행 권장
     */
    public void syncReceivingPlans(String comCd, String whCd) throws Exception {
        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int page = 1;
        int newCount = 0;

        while (true) {
            // 오늘 입고예정인 상태(1.입고예정) 목록 조회
            Map<String, Object> result = getReceivingPlanList(today, 1, page, comCd, whCd);

            if (!sabangnetApiService.isSuccess(result)) {
                log.error("[입고예정 동기화] API 오류 - code: {}, message: {}",
                        result.get("code"), result.get("message"));
                break;
            }

            Map<String, Object> response = (Map<String, Object>) result.get("response");
            List<Map<String, Object>> dataList =
                    (List<Map<String, Object>>) response.get("data_list");

            if (dataList == null || dataList.isEmpty()) break;

            for (Map<String, Object> plan : dataList) {
                int planId = Integer.parseInt(String.valueOf(plan.get("receiving_plan_id")));

                // 상세 조회로 plan_product_list 포함 정보 획득
                Map<String, Object> detailResult = getReceivingPlanDetail(planId, comCd, whCd);
                if (!sabangnetApiService.isSuccess(detailResult)) continue;

                Map<String, Object> detail = (Map<String, Object>) detailResult.get("response");

                Map<String, Object> wmsInbound = new LinkedHashMap<>();
                wmsInbound.put("sabangnet_receiving_plan_id", planId);
                wmsInbound.put("receiving_plan_code", detail.get("receiving_plan_code"));
                wmsInbound.put("plan_date",           detail.get("plan_date"));
                wmsInbound.put("plan_status",         detail.get("plan_status"));
                wmsInbound.put("memo",                detail.get("memo"));
                wmsInbound.put("plan_product_list",   detail.get("plan_product_list"));

                // TODO: WMS receivings 테이블에 INSERT (중복 체크 포함)
                // receivingRepository.upsertBySabangnetPlanId(wmsInbound);
                newCount++;
                log.info("[입고예정 등록] 입고예정ID: {}, 코드: {}",
                        planId, detail.get("receiving_plan_code"));
            }

            Object totalPage = response.get("total_page");
            if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage))) break;
            page++;
        }
        log.info("[입고예정 동기화] 총 {}건 등록 완료", newCount);
    }
}
