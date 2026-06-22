package operato.wms.parcel.service.cj;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.sys.util.ValueUtil;

/**
 * CJ대한통운 주소정제 서비스
 *
 * ReqAddrRfnSm API를 호출하여 수신자 주소를 정제한다.
 * 예약 접수(RegBook) 전에 수신자 주소의 배송 가능 여부와 집배점 정보를 확인한다.
 *
 * 참조: docs/interface/courier/cj/address-refinement.md
 */
@Component
public class CjAddressService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(CjAddressService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CjTokenService cjTokenService;

    /**
     * 주소정제 — 예약 접수 전 수신자 주소 검증 및 배송 권역 조회
     *
     * @param domainId   도메인 ID
     * @param contractNo 계약 번호 (courier_contracts.contract_no)
     * @param address    정제할 주소 문자열 (주소 + 상세주소 결합 권장)
     * @return 정제 결과 (권역 코드, 집배점 등)
     * @throws CjAddressRefinementException 정제 실패 시 (-20009: 배송불가, -20010: 배송지연)
     */
    @SuppressWarnings("unchecked")
    public CjAddressResult refineAddress(Long domainId, String contractNo, String address) {
        CjContractConfig config = this.loadConfig(domainId, contractNo);
        String tokenNum = this.cjTokenService.getToken(domainId, contractNo);
        String url = config.getApiBaseUrl() + "/ReqAddrRfnSm";

        try {
            Map<String, Object> data = ValueUtil.newMap("TOKEN_NUM", tokenNum);
            data.put("CLNTNUM", config.getCustId());
            data.put("CLNTMGMCUSTCD", config.getCustId());
            data.put("ADDRESS", address);

            Map<String, Object> requestBody = ValueUtil.newMap("DATA", data);
            String requestJson = OBJECT_MAPPER.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("CJ-Gateway-APIKey", tokenNum)
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ElidomRuntimeException(
                        "CJ 주소정제 HTTP 오류: status=" + response.statusCode() + ", contractNo=" + contractNo);
            }

            Map<String, Object> responseBody = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String resultCd = (String) responseBody.get("RESULT_CD");

            if (!"S".equals(resultCd)) {
                String detail = (String) responseBody.get("RESULT_DETAIL");
                log.warn("CJ 주소정제 실패: resultCd={}, address={}, detail={}", resultCd, address, detail);
                throw new CjAddressRefinementException(resultCd, detail, address);
            }

            Map<String, Object> responseData = (Map<String, Object>) responseBody.get("DATA");
            CjAddressResult result = new CjAddressResult();
            // 1. 도착지 코드
            result.setClsfCd((String) responseData.get("CLSFCD"));
            // 2. 도착지 서브 코드
            result.setSubClsfCd((String) responseData.get("SUBCLSFCD"));
            // 3. 도착지 약칭주소
            result.setClsfAddr((String) responseData.get("CLSFADDR"));
            // 4. 배송지점명
            result.setDeliveryBranchNm((String) responseData.get("CLLDLVBRANNM"));
            // 5. 배송기사명
            result.setDeliverySmNm((String) responseData.get("CLLDLVEMPNM"));
            // 6. 배송기사 직급
            result.setSmClassNm((String) responseData.get("CLLDLVEMPNICKNM"));
            // 7. 권역 구분
            result.setRspsDivision((String) responseData.get("RSPSDIV"));
            // 8. P2P 코드
            result.setP2pCd((String) responseData.get("P2PCD"));

            log.debug("CJ 주소정제 완료: address={}, branch={}, clsfCd={}",
                    address, result.getDeliveryBranchNm(), result.getClsfCd());
            return result;

        } catch (CjAddressRefinementException e) {
            throw e;
        } catch (ElidomRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ElidomRuntimeException(
                    "CJ 주소정제 오류: contractNo=" + contractNo + ", address=" + address, e);
        }
    }

    /**
     * courier_contracts 테이블에서 계약 설정 로드
     */
    @SuppressWarnings("unchecked")
    private CjContractConfig loadConfig(Long domainId, String contractNo) {
        String sql = """
                SELECT contract_no, contract_sub_no, api_key, api_base_url
                FROM courier_contracts
                WHERE domain_id   = :domainId
                  AND dlv_vend_cd = 'cj'
                  AND contract_no = :contractNo
                  AND del_flag IS NOT TRUE
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("domainId", domainId);
        params.put("contractNo", contractNo);

        Map row = this.queryManager.selectBySql(sql, params, Map.class);
        if (row == null) {
            throw new ElidomRuntimeException(
                    "CJ 계약 정보 없음: domainId=" + domainId + ", contractNo=" + contractNo);
        }

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
