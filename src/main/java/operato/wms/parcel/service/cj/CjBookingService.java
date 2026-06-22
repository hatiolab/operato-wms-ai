package operato.wms.parcel.service.cj;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import operato.wms.parcel.util.PhoneUtil;
import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.util.ValueUtil;
import xyz.elidom.util.DateUtil;

/**
 * CJ대한통운 예약 접수 서비스
 *
 * RegBook API를 호출하여 배송 예약을 등록한다.
 * 포장 완료 시점에 호출하며, 결과로 운송장 번호를 확인한다.
 *
 * 참조: docs/interface/courier/cj/booking.md
 */
@Component
public class CjBookingService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjBookingService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * RegBook 호출 — 단건 예약 접수
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (courier_contracts.contract_no)
     * @param shipmentNo WMS 출고 주문번호 (CUST_USE_NO로 사용)
     * @param request    예약 접수 요청 데이터
     * @return 예약 결과 (shipmentNo, invcNo)
     * @throws ElidomRuntimeException HTTP 통신 오류 또는 설정 없음 / CJ API가 E 코드를 반환한 경우
     */
    @SuppressWarnings("unchecked")
    public CjBookingResult book(Long domainId, String contractNo, String shipmentNo, CjBookingRequest request) {
        CjContractConfig config = this.loadConfig(domainId, contractNo);
        String tokenNum = this.cjTokenService.getToken(domainId, contractNo);

        String rcptYmd = DateUtil.dateStr(new Date(), "yyyyMMdd");
        String mpckKey = rcptYmd + SysConstants.CHAR_UNDER_SCORE + config.getCustId() + SysConstants.CHAR_UNDER_SCORE
                + shipmentNo;
        String url = config.getApiBaseUrl() + "/RegBook";

        Map<String, Object> data = this.buildRequestData(config, tokenNum, rcptYmd, shipmentNo, mpckKey, request);

        try {
            Map<String, Object> requestBody = ValueUtil.newMap("DATA", data);
            String requestJson = OBJECT_MAPPER.writeValueAsString(requestBody);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("CJ-Gateway-APIKey", tokenNum)
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ElidomRuntimeException(
                        "RegBook HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo);
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");
            String resultDetail = (String) responseBody.get("RESULT_DETAIL");

            if (!"S".equals(resultCd)) {
                log.warn("CJ RegBook 실패: shipmentNo={}, contractNo={}, detail={}", shipmentNo, contractNo,
                        resultDetail);
                this.saveBookingResult(domainId, shipmentNo, "E", null);
                throw new ElidomRuntimeException("RegBook 실패: " + resultDetail);
            }

            // 취소 시 재사용할 수 있도록 요청 payload와 결과 저장
            this.saveBookingResult(domainId, shipmentNo, "S", OBJECT_MAPPER.writeValueAsString(data));

            log.debug("CJ RegBook 성공: shipmentNo={}, invcNo={}", shipmentNo, request.getInvcNo());
            return CjBookingResult.success(shipmentNo, request.getInvcNo());

        } catch (Exception e) {
            throw new ElidomRuntimeException(
                    "RegBook 오류: contractNo=" + contractNo + ", shipmentNo=" + shipmentNo, e);
        }
    }

    /**
     * RegBook 요청 DATA 맵 구성
     * 
     * @param config
     * @param tokenNum
     * @param rcptYmd
     * @param custUseNo
     * @param mpckKey
     * @param req
     * @return
     */
    private Map<String, Object> buildRequestData(
            CjContractConfig config, String tokenNum,
            String rcptYmd, String custUseNo, String mpckKey,
            CjBookingRequest req) {

        String[] sendrTel = PhoneUtil.splitPhone(req.getSenderTel());
        String[] sendrCell = PhoneUtil.splitPhone(req.getSenderMobile());
        String[] rcvrTel = PhoneUtil.splitPhone(req.getReceiverTel());
        String[] rcvrCell = PhoneUtil.splitPhone(req.getReceiverMobile());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("TOKEN_NUM", tokenNum);
        data.put("CUST_ID", config.getCustId());
        data.put("RCPT_YMD", rcptYmd);
        data.put("CUST_USE_NO", custUseNo);
        data.put("RCPT_DV", "01");
        data.put("WORK_DV_CD", "01");
        data.put("REQ_DV_CD", "01");
        data.put("MPCK_KEY", mpckKey);
        data.put("MPCK_SEQ", "1");
        data.put("CAL_DV_CD", "1");
        data.put("FRT_DV_CD", req.getFrtDvCd());
        data.put("CNTR_ITEM_CD", "01");
        data.put("BOX_TYPE_CD", req.getBoxTypeCd());
        data.put("BOX_QTY", String.valueOf(req.getBoxQty()));
        data.put("CUST_MGMT_DLCM_CD", config.getCustId());
        data.put("DLV_DV", "01");
        data.put("SENDR_NM", req.getSenderName());
        data.put("SENDR_TEL_NO1", sendrTel[0]);
        data.put("SENDR_TEL_NO2", sendrTel[1]);
        data.put("SENDR_TEL_NO3", sendrTel[2]);
        data.put("SENDR_CELL_NO1", sendrCell[0]);
        data.put("SENDR_CELL_NO2", sendrCell[1]);
        data.put("SENDR_CELL_NO3", sendrCell[2]);
        data.put("SENDR_ZIP_NO", req.getSenderZip());
        data.put("SENDR_ADDR", req.getSenderAddr());
        data.put("SENDR_DETAIL_ADDR", req.getSenderDetailAddr());
        data.put("RCVR_NM", req.getReceiverName());
        data.put("RCVR_TEL_NO1", rcvrTel[0]);
        data.put("RCVR_TEL_NO2", rcvrTel[1]);
        data.put("RCVR_TEL_NO3", rcvrTel[2]);
        data.put("RCVR_CELL_NO1", rcvrCell[0]);
        data.put("RCVR_CELL_NO2", rcvrCell[1]);
        data.put("RCVR_CELL_NO3", rcvrCell[2]);
        data.put("RCVR_ZIP_NO", req.getReceiverZip());
        data.put("RCVR_ADDR", req.getReceiverAddr());
        data.put("RCVR_DETAIL_ADDR", req.getReceiverDetailAddr());
        data.put("INVC_NO", req.getInvcNo() != null ? req.getInvcNo() : "");
        data.put("PRT_ST", req.getInvcNo() != null ? "02" : "01");
        data.put("ARTICLE_AMT", req.getArticleAmt() != null ? String.valueOf(req.getArticleAmt()) : "0");
        data.put("REMARK_1", req.getRemark1() != null ? req.getRemark1() : "");
        data.put("REMARK_2", "");
        data.put("REMARK_3", "");
        data.put("COD_YN", "N");
        data.put("ARRAY", this.buildGoodsArray(req.getGoods()));
        return data;
    }

    /**
     * 상품 목록 ARRAY 구성 — 비어있으면 더미 1건 삽입
     * 
     * @param goodsList
     * @return
     */
    private List<Map<String, Object>> buildGoodsArray(List<CjBookingRequest.Goods> goodsList) {
        if (goodsList == null || goodsList.isEmpty()) {
            Map<String, Object> dummy = new LinkedHashMap<>();
            dummy.put("MPCK_SEQ", "1");
            dummy.put("GDS_NM", "상품");
            dummy.put("GDS_QTY", "1");
            dummy.put("UNIT_CD", "1");
            return List.of(dummy);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < goodsList.size(); i++) {
            CjBookingRequest.Goods g = goodsList.get(i);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("MPCK_SEQ", String.valueOf(i + 1));
            item.put("GDS_CD", g.getGoodsCd() != null ? g.getGoodsCd() : "");
            item.put("GDS_NM", g.getGoodsNm());
            item.put("GDS_QTY", g.getGoodsQty() != null ? String.valueOf(g.getGoodsQty()) : "1");
            item.put("UNIT_CD", g.getUnitCd() != null ? g.getUnitCd() : "1");
            item.put("GDS_AMT", g.getGoodsAmt() != null ? g.getGoodsAmt() : "0");
            result.add(item);
        }

        return result;
    }

    /**
     * 예약 접수 결과와 payload를 shipment_orders에 저장
     * 
     * @param domainId
     * @param shipmentNo
     * @param resultCd
     * @param payload    취소 시 재사용할 RegBook 요청 DATA JSON (실패 시 null)
     */
    private void saveBookingResult(Long domainId, String shipmentNo, String resultCd, String payload) {
        String sql = "UPDATE shipment_orders SET cj_booking_result_cd = :resultCd, cj_booking_payload = :payload, updated_at = now() WHERE domain_id  = :domainId AND shipment_no = :shipmentNo";
        Map<String, Object> params = ValueUtil.newMap("domainId", domainId);
        params.put("shipmentNo", shipmentNo);
        params.put("resultCd", resultCd);
        params.put("payload", payload);
        this.queryManager.executeBySql(sql, params);
    }

    /**
     * courier_contracts 테이블에서 계약 설정 로드
     */
    private CjContractConfig loadConfig(Long domainId, String contractNo) {
        // 1. 택배 계약 정보 조회
        String sql = "SELECT contract_no, contract_sub_no, api_key, api_base_url FROM courier_contracts WHERE domain_id   = :domainId AND dlv_vend_cd = 'cj' AND contract_no = :contractNo AND del_flag IS NOT TRUE";
        Map<String, Object> params = ValueUtil.newMap("domainId,contractNo", domainId, contractNo);
        Map row = this.queryManager.selectBySql(sql, params, Map.class);

        // 2. 계약 정보가 없으면 예외 처리
        if (row == null) {
            throw new ElidomRuntimeException("CJ 계약 정보 없음: domainId=" + domainId + ", contractNo=" + contractNo);
        }

        // 3. 계약 설정 리턴
        CjContractConfig config = new CjContractConfig();
        config.setDomainId(domainId);
        config.setContractNo((String) row.get("contract_no"));
        config.setCustId((String) row.get("contract_no"));
        config.setBizRegNum((String) row.get("contract_sub_no"));
        config.setApiKey((String) row.get("api_key"));
        config.setApiBaseUrl((String) row.get("api_base_url"));
        return config;
    }
}
