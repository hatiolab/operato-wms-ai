package operato.wms.oms.service.sabangnet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import xyz.anythings.sys.service.AbstractQueryService;

import operato.wms.oms.entity.SabangnetMember;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 사방넷 고객사(화주사) 서비스
 * - 고객사 목록/단일 조회, 등록, 수정
 * - WMS 고객사 수신 (SabangnetMember 엔티티 매핑)
 *
 * 사방넷 API (물류사 전용):
 *   GET  /v2/member/partner/{member_id} — 고객사 조회(단일)
 *   GET  /v2/member/partners            — 고객사 조회(벌크)
 *   POST /v2/member/partner             — 고객사 등록
 *   PUT  /v2/member/partner/{member_id} — 고객사 수정
 *   GET  /v2/member/sub_masters         — 물류사 추가계정 조회(벌크)
 *
 * memberId : 사방넷의 화주사 구분 값 (WMS 의 comCd 와 같은 개념)
 */
@Component
public class SabangnetMemberService extends AbstractQueryService {

    private static final Logger log = LoggerFactory.getLogger(SabangnetMemberService.class);

    @Autowired
    private SabangnetApiService sabangnetApiService;

    // ─────────────────────────────────────────
    // 조회
    // ─────────────────────────────────────────

    /**
     * 사방넷 고객사 단일 조회
     * 응답: response — 고객사 기본 Object
     *
     * @param memberId 사방넷 고객사 ID
     * @param comCd    회사코드
     * @param whCd     창고코드
     */
    public Map<String, Object> getMember(int memberId, String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet("/v2/member/partner/" + memberId, null, comCd, whCd);
    }

    /**
     * 사방넷 고객사 목록 조회 (벌크) — 활성화 여부 필터 없음
     * 응답: response.data_list — 고객사 기본 Object 리스트
     *
     * @param page  페이지 번호 (1부터 시작)
     * @param comCd 회사코드
     * @param whCd  창고코드
     */
    public Map<String, Object> getMemberList(int page, String comCd, String whCd) throws Exception {
        return getMemberList(page, null, comCd, whCd);
    }

    /**
     * 사방넷 고객사 목록 조회 (벌크) — 활성화 여부 필터
     * 응답: response.data_list — 고객사 기본 Object 리스트
     *
     * @param page  페이지 번호 (1부터 시작)
     * @param useFg 활성화 여부 (Y.활성화 / N.비활성화 / null이면 전체)
     * @param comCd 회사코드
     * @param whCd  창고코드
     */
    public Map<String, Object> getMemberList(int page, String useFg,
            String comCd, String whCd) throws Exception {
        Map<String, String> params = new HashMap<>();
        params.put("page", String.valueOf(page));
        if (useFg != null)
            params.put("use_fg", useFg);
        return sabangnetApiService.apiGet("/v2/member/partners", params, comCd, whCd);
    }

    /**
     * 물류사 추가계정 조회 (벌크)
     * 응답: response.data_list — 추가계정 Object 리스트 (member_id, id, name, member_type, use_fg)
     *
     * @param comCd 회사코드
     * @param whCd  창고코드
     */
    public Map<String, Object> getSubMasterList(String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiGet("/v2/member/sub_masters", null, comCd, whCd);
    }

    // ─────────────────────────────────────────
    // 등록 / 수정
    // ─────────────────────────────────────────

    /**
     * 사방넷 고객사 등록 (WMS → 사방넷)
     * 필수 필드: id(로그인ID), name(회사명), biz_num(사업자번호), use_fg(활성화여부)
     * 응답: response.member_id — 등록된 고객사 ID
     *
     * @param payload 고객사 정보 Map (고객사 기본 Object 구조 참고)
     * @param comCd   회사코드
     * @param whCd    창고코드
     */
    public Map<String, Object> registerMember(Map<String, Object> payload,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiPost("/v2/member/partner", payload, comCd, whCd);
    }

    /**
     * 사방넷 고객사 수정 (WMS → 사방넷)
     * 수정할 필드만 payload에 포함하여 전송
     *
     * @param memberId 수정할 사방넷 고객사 ID
     * @param payload  수정할 필드 Map (고객사 기본 Object 구조 참고)
     * @param comCd    회사코드
     * @param whCd     창고코드
     */
    public Map<String, Object> updateMember(int memberId, Map<String, Object> payload,
            String comCd, String whCd) throws Exception {
        return sabangnetApiService.apiPut("/v2/member/partner/" + memberId, payload, comCd, whCd);
    }

    // ─────────────────────────────────────────
    // 수신 (사방넷 → WMS 로컬 캐시)
    // ─────────────────────────────────────────

    /**
     * 사방넷 고객사 수신 — 활성화 고객사 전체 (1일 1회 권장)
     * 사방넷 API → SabangnetMember 엔티티 저장
     *
     * @param domainId WMS 도메인 ID
     * @param comCd    회사 코드 (Sabangnet Credential 조회 키)
     * @param whCd     창고 코드 (Sabangnet Credential 조회 키)
     */
    @Transactional
    public void receiveMember(Long domainId, String comCd, String whCd) throws Exception {
        doReceiveMember(domainId, comCd, whCd, null);
    }

    /**
     * 사방넷 고객사 수신 — 활성화 여부 필터 지정
     * 사방넷 API → SabangnetMember 엔티티 저장
     *
     * @param domainId WMS 도메인 ID
     * @param comCd    회사 코드 (Sabangnet Credential 조회 키)
     * @param whCd     창고 코드 (Sabangnet Credential 조회 키)
     * @param useFg    활성화 여부 필터 (Y/N, null이면 전체)
     */
    @Transactional
    public void receiveMember(Long domainId, String comCd, String whCd, String useFg) throws Exception {
        doReceiveMember(domainId, comCd, whCd, useFg);
    }

    /**
     * 고객사 수신 내부 공통 로직
     *
     * 응답 구조:
     * response.data_list  : 고객사 목록
     * response.total_page : 전체 페이지 수
     */
    @SuppressWarnings("unchecked")
    private void doReceiveMember(Long domainId, String comCd, String whCd, String useFg) throws Exception {
        // 이번 수신 배치 전체를 식별하는 UUID
        String receiveId = UUID.randomUUID().toString();
        int page = 1;
        int totalCount = 0;

        String filterLabel = useFg != null ? "useFg=" + useFg : "전체";
        log.info("[고객사 수신] 시작 - comCd={}, whCd={}, filter={}", comCd, whCd, filterLabel);

        while (true) {
            Map<String, Object> result = getMemberList(page, useFg, comCd, whCd);

            if (!sabangnetApiService.isSuccess(result)) {
                log.error("[고객사 수신] API 오류 - code: {}, message: {}",
                        result.get("code"), result.get("message"));
                break;
            }

            Map<String, Object> response = (Map<String, Object>) result.get("response");
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data_list");

            if (dataList == null || dataList.isEmpty())
                break;

            List<SabangnetMember> pageMembers = new ArrayList<>();

            for (Map<String, Object> src : dataList) {
                SabangnetMember member = new SabangnetMember();
                member.setId(UUID.randomUUID().toString());                              // PK (UUID)
                member.setDomainId(domainId);                                            // 도메인 ID (멀티테넌시)
                member.setComCd(comCd);                                                  // 회사 코드
                member.setMemberId(toInt(src.get("member_id")));                         // 사방넷 고객사 ID
                member.setPartnerCode(toStr(src.get("partner_code")));                   // 고객사 코드
                member.setLoginId(toStr(src.get("id")));                                 // 고객사 로그인 ID (API 필드명: id)
                member.setName(toStr(src.get("name")));                                  // 회사명
                member.setBizNum(toStr(src.get("biz_num")));                             // 사업자번호
                member.setCeo(toStr(src.get("ceo")));                                    // 대표자
                member.setManager(toStr(src.get("manager")));                            // 담당자명
                member.setMemberType(toStr(src.get("member_type")));                     // 추가계정구분 (P/A)
                member.setEmail(toStr(src.get("email")));                                // 이메일
                member.setJongmok(toStr(src.get("jongmok")));                           // 종목
                member.setUptae(toStr(src.get("uptae")));                                // 업태
                member.setTel(toStr(src.get("tel")));                                    // 전화
                member.setHp(toStr(src.get("hp")));                                      // 휴대폰
                member.setFax(toStr(src.get("fax")));                                    // 팩스
                member.setZipcode(toStr(src.get("zipcode")));                            // 주소 우편번호
                member.setAddress1(toStr(src.get("address1")));                          // 주소1
                member.setAddress2(toStr(src.get("address2")));                          // 주소2
                member.setMemo(toStr(src.get("memo")));                                  // 특이사항
                member.setDefaultShippingName(toStr(src.get("default_shipping_name")));  // 발송자명
                member.setDefaultShippingTel(toStr(src.get("default_shipping_tel")));    // CS 전화번호
                member.setDefaultShippingZipcode(toStr(src.get("default_shipping_zipcode"))); // 발송지 우편번호
                member.setDefaultShippingAddress1(toStr(src.get("default_shipping_address1"))); // 발송지 주소1
                member.setDefaultShippingAddress2(toStr(src.get("default_shipping_address2"))); // 발송지 주소2
                member.setUseFg(toStr(src.get("use_fg")));                               // 활성화 여부 (Y/N)
                member.setReceiveId(receiveId);                                          // 수신 배치 ID
                member.setSyncStatus(SabangnetMember.SYNC_STATUS_NONE);                  // WMS 동기화 상태 (N:미동기화)
                pageMembers.add(member);
                totalCount++;
            }

            this.queryManager.insertBatch(pageMembers);

            // 마지막 페이지 도달 시 종료
            Object totalPage = response.get("total_page");
            if (totalPage == null || page >= Integer.parseInt(String.valueOf(totalPage)))
                break;

            page++;
        }

        log.info("[고객사 수신] 완료 - 총 {}개", totalCount);

        // TODO : WMS 고객사 동기화 (syncCustomerByMember) 호출
        // syncCustomerByMember(receiveId);
    }

    // ─────────────────────────────────────────
    // 동기화 (사방넷 캐시 → WMS 마스터)
    // ─────────────────────────────────────────

    /**
     * 수신된 고객사를 WMS Customer(화주사)와 동기화
     * receiveMember() 실행 후 호출하여 수신 배치 단위로 동기화를 수행한다.
     *
     * @param receiveId receiveMember() 실행 시 생성된 수신 배치 ID
     */
    @Transactional
    public void syncCustomerByMember(String receiveId) {
        // TODO: SabangnetMember → Customer(화주사) 동기화
        //
        // Merge 전략 필요
        // - loginId 또는 memberId 기준으로 Customer 존재 여부 확인 후 INSERT / UPDATE
        //
        // [SabangnetMember → Customer 필드 매핑]
        // SabangnetMember 필드          Customer 필드        비고
        // -----------------------------------------------------------------------
        // comCd                      -> comCd               회사코드 (직접 매핑)
        // memberId                      추가 필요             Customer에 없음 (attr 활용 고려)
        // loginId                    -> custCd              고객사 로그인 ID → 화주사 코드
        // name                       -> custNm              회사명
        // bizNum                     -> bizNo               사업자번호
        // ceo                        -> ceoNm               대표자
        // manager                    -> mgrNm               담당자명
        // tel                        -> tel                 전화
        // hp                         -> hp                  휴대폰 (없으면 attr 활용)
        // fax                        -> fax                 팩스 (없으면 attr 활용)
        // email                      -> email               이메일
        // zipcode                    -> zipcode             우편번호
        // address1                   -> address             주소 (address1 + ' ' + address2 조합)
        // address2                   -> address             주소 (조합)
        // memo                       -> remarks             특이사항
        // useFg (Y/N)                -> delFlag (Y→false, N→true)  활성화 여부 (역방향 변환)
        // memberType                    추가 필요             추가계정구분 (attr 활용 고려)
        // jongmok                       추가 필요             Customer에 없음
        // uptae                         추가 필요             Customer에 없음
        // defaultShippingName           추가 필요             발송자명 (attr 활용 고려)
        // defaultShippingTel            추가 필요             CS 전화번호
        // defaultShippingZipcode        추가 필요             발송지 우편번호
        // defaultShippingAddress1       추가 필요             발송지 주소
        // defaultShippingAddress2       추가 필요             발송지 주소
        // receiveId                  - 동기화 전용 필드       Customer 동기화 불필요
        // syncStatus                 - 동기화 전용 필드       동기화 완료 후 'Y' 로 업데이트
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
