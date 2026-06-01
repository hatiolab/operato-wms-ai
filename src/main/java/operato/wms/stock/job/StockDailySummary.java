package operato.wms.stock.job;

import java.util.List;
import java.util.Date;
import java.util.HashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import operato.wms.stock.service.StockTransactionService;

import xyz.anythings.sys.AnyConstants;
import xyz.anythings.sys.ConfigConstants;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.util.ValueUtil;
import xyz.elidom.util.DateUtil;

@Service
public class StockDailySummary {
    /**
     * Logger
     */
    private Logger logger = LoggerFactory.getLogger(StockDailySummary.class);
    /**
     * 쿼리 매니저
     */
    @Autowired
    private IQueryManager queryManager;
    /**
     * 재고 서비스
     */
    @Autowired
    private StockTransactionService stockTrxSvc;
    /**
     * 이중화 서버의 양쪽에서 모두 처리되지 않게 한 쪽 서버에서 실행되도록 설정으로 처리하기 위함
     * application.properties 설정 - mps.job.scheduler.enable=true/false 설정 필요 (이중화 서버
     * 한 대는 true, 나머지 서버는 false로 설정, 한 대만 운영시 true로 설정)
     */
    @Autowired
    private Environment env;

    /**
     * 서버의 Job Scheduler가 활성화 되었는지 여부
     * 
     * @return
     */
    private boolean isJobEnabeld() {
        return ValueUtil
                .toBoolean(this.env.getProperty(ConfigConstants.JOB_SCHEDULER_ENABLED, AnyConstants.FALSE_STRING));
    }

    /**
     * 매일 밤 자정에 stock 일별 집계 실행
     */
    @Scheduled(cron = "0 30 0 * * ?")
    public void executeTask() {
        // 1. Job 스케줄러 활성화 여부 체크
        if (!this.isJobEnabeld()) {
            return;
        }

        // 2. 전체 도메인 정보 조회
        String sql = "SELECT ID FROM DOMAINS WHERE SYSTEM_FLAG IS NULL OR SYSTEM_FLAG = false ORDER BY ID ASC";
        List<Long> domainIds = this.queryManager.selectListBySql(sql, new HashMap<String, Object>(), Long.class, 0, 0);
        String today = DateUtil.dateStr(DateUtil.addDate(new Date(), -1), "yyyy-MM-dd");

        for (Long domainId : domainIds) {
            // 3. 재고 일별 집계 실행
            try {
                this.summarizeDailyStock(domainId, today);
            } catch (Exception e) {
                this.logger.error("도메인 [" + domainId + "]에 대한 재고 일별 집계 실행 중 오류 발생", e);
            }
        }
    }

    /**
     * 재고 일별 집계 처리
     * 
     * @param domainId
     * @param dateStr
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, timeout = 3600)
    public void summarizeDailyStock(Long domainId, String dateStr) {
        this.stockTrxSvc.summarizeDailyStock(domainId, dateStr);
    }
}
