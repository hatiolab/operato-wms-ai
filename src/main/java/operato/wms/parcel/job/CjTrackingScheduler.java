package operato.wms.parcel.job;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import operato.wms.parcel.service.cj.CjTrackingService;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.util.ValueUtil;

/**
 * CJ대한통운 상품추적 자동 동기화 스케줄러
 *
 * 오전 6시, 오후 2시에 전일 및 당일 추적 데이터를 동기화한다.
 * HA 환경에서는 mps.job.scheduler.enable=true 서버 한 대에서만 실행된다.
 *
 * 참조: docs/interface/courier/cj/tracking.md
 */
@Service
public class CjTrackingScheduler {

    private static final Logger log = LoggerFactory.getLogger(CjTrackingScheduler.class);

    @Autowired
    private CjTrackingService cjTrackingService;

    @Autowired
    private IQueryManager queryManager;

    @Autowired
    private Environment env;

    /**
     * 오전 6시, 오후 2시 — 전일 및 당일 추적 데이터 동기화
     *
     * 전일 데이터를 먼저 처리하여 늦게 갱신된 스캔 이벤트를 반영하고,
     * 당일 데이터로 최신 상태를 업데이트한다.
     */
    @Scheduled(cron = "0 0 6,14 * * *")
    @SuppressWarnings("unchecked")
    public void syncAllDomains() {
        if (!this.isJobEnabled()) {
            return;
        }

        String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.BASIC_ISO_DATE);

        List<Map> contracts = this.loadActiveContracts();
        if (contracts == null || contracts.isEmpty()) {
            log.info("CJ 추적 동기화 대상 계약 없음");
            return;
        }

        log.info("CJ 추적 동기화 시작: {}건 계약", contracts.size());
        int success = 0;
        int failure = 0;

        for (Map row : contracts) {
            Long domainId = ValueUtil.toLong(row.get("domain_id"));
            String contractNo = (String) row.get("contract_no");

            try {
                cjTrackingService.syncTrackingData(domainId, contractNo, yesterday);
                cjTrackingService.syncTrackingData(domainId, contractNo, today);
                success++;
            } catch (Exception e) {
                log.error("CJ 추적 동기화 실패: domainId={}, contractNo={}", domainId, contractNo, e);
                failure++;
            }
        }

        log.info("CJ 추적 동기화 완료: 성공={}, 실패={}", success, failure);
    }

    /**
     * Job 스케줄러 활성화 여부 확인
     * application.properties: mps.job.scheduler.enable=true/false
     */
    private boolean isJobEnabled() {
        /*
         * return ValueUtil.toBoolean(
         * this.env.getProperty(ConfigConstants.JOB_SCHEDULER_ENABLED,
         * AnyConstants.FALSE_STRING)
         * );
         */

        return false;
    }

    /**
     * 추적 동기화 대상 CJ 계약 전체 조회 (도메인 전체)
     */
    @SuppressWarnings("unchecked")
    private List<Map> loadActiveContracts() {
        String sql = """
                SELECT domain_id, contract_no
                FROM courier_contracts
                WHERE dlv_vend_cd = 'cj'
                  AND del_flag IS NOT TRUE
                  AND contract_no IS NOT NULL
                  AND api_base_url IS NOT NULL
                ORDER BY domain_id, contract_no
                """;
        return this.queryManager.selectListBySql(sql, new HashMap<>(), Map.class, 0, 0);
    }
}
