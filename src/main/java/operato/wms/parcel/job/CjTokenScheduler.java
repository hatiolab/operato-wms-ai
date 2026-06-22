package operato.wms.parcel.job;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import operato.wms.parcel.service.cj.CjCourierService;
import operato.wms.parcel.service.cj.CjTokenService;
import xyz.anythings.sys.AnyConstants;
import xyz.anythings.sys.ConfigConstants;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.ValueUtil;

/**
 * CJ대한통운 1Day Token 자동 갱신 스케줄러
 *
 * 매일 자정 모든 도메인의 유효한 CJ 계약(domain_id + contract_no 쌍)에 대해
 * 토큰을 미리 갱신하여 운영 중 토큰 만료로 인한 API 오류를 방지한다.
 *
 * 이중화 서버 환경에서는 application.properties의
 * mps.job.scheduler.enable=true 설정이 된 서버 한 대에서만 실행된다.
 *
 * 참조: docs/interface/courier/cj/1day-token.md
 */
@Service
public class CjTokenScheduler {

    private static final Logger log = LoggerFactory.getLogger(CjTokenScheduler.class);

    @Autowired
    private CjCourierService cjCourierService;

    @Autowired
    private IQueryManager queryManager;

    @Autowired
    private Environment env;

    /**
     * 매일 자정 전체 도메인 × CJ 계약 토큰 갱신
     *
     * courier_contracts에서 dlv_vend_cd='cj'이고 유효한 계약(domain_id, contract_no) 쌍을
     * 조회하여 각각 토큰을 갱신한다.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void refreshAllTokens() {
        if (!this.isJobEnabled()) {
            return;
        }

        String sql = """
                SELECT domain_id, contract_no
                FROM courier_contracts
                WHERE dlv_vend_cd = :dlvVendCd
                  AND del_flag IS NOT TRUE
                  AND contract_no IS NOT NULL
                  AND api_base_url IS NOT NULL
                ORDER BY domain_id, contract_no
                """;

        List<Map> rows = this.queryManager.selectListBySql(sql, ValueUtil.newMap("dlvVendCd", "cj"), Map.class, 0, 0);

        if (rows == null || rows.isEmpty()) {
            log.info("CJ 토큰 갱신 대상 계약 없음");
            return;
        }

        log.info("CJ 토큰 갱신 시작: {}건", rows.size());
        int success = 0;
        int failure = 0;

        for (Map row : rows) {
            Long domainId = ValueUtil.toLong(row.get("domain_id"));
            String contractNo = (String) row.get("contract_no");
            try {
                this.cjCourierService.refreshToken(domainId, contractNo);
                success++;
            } catch (Exception e) {
                log.error("CJ 토큰 갱신 실패: domainId={}, contractNo={}", domainId, contractNo, e);
                failure++;
            }
        }

        log.info("CJ 토큰 갱신 완료: 성공={}, 실패={}", success, failure);
    }

    /**
     * Job 스케줄러 활성화 여부 확인
     * application.properties: mps.job.scheduler.enable=true/false
     */
    private boolean isJobEnabled() {
        return ValueUtil.toBoolean(
                this.env.getProperty(ConfigConstants.JOB_SCHEDULER_ENABLED, AnyConstants.FALSE_STRING));
    }
}
