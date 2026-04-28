package operato.wms.oms.job;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.quartz.DisallowConcurrentExecution;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import operato.wms.base.entity.StoragePolicy;
import operato.wms.oms.service.OmsWaveService;
import xyz.elidom.job.model.JobModel;
import xyz.elidom.job.system.job.AbstractJob;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.util.ValueUtil;

/**
 * B2C 용 자동 웨이브 생성 Job
 *
 * Quartz 스케줄러에 의해 트리거되며, StoragePolicy B2C 웨이브 관련 설정값을 읽어
 * 자동 웨이브 그루핑 파라미터를 구성하고 OmsWaveService.createAutoWaves()를 호출한다.
 *
 * jobs 테이블 설정:
 * handler_type = "static"
 * handler = "operato.wms.oms.job.OmsB2BWaveJob"
 *
 * @author HatioLab
 */
@Component
@DisallowConcurrentExecution
public class OmsB2CWaveJob extends AbstractJob {
    /**
     * QueryManager
     */
    @Autowired
    private IQueryManager queryManager;
    /**
     * Wave Service
     */
    @Autowired
    private OmsWaveService waveService;

    @Override
    @Transactional
    public Object doExecuteJob(JobExecutionContext context, JobModel jobModel) throws JobExecutionException {
        List<StoragePolicy> policyList = this.queryManager.selectList(StoragePolicy.class,
                ValueUtil.newMap("domainId", jobModel.getDomainId()));

        for (StoragePolicy policy : policyList) {
            this.createAutoWave(policy);
        }

        return context;
    }

    private Map<String, Object> createAutoWave(StoragePolicy policy) {
        // 1. 창고, 화주사 코드 추출
        String comCd = policy.getComCd();
        String whCd = policy.getWhCd();

        // 2. 활성화 여부 확인
        String b2cWaveTrigger = policy.getB2cWaveTrigger();

        if (!ValueUtil.isEqualIgnoreCase(b2cWaveTrigger, "SCHEDULE")) {
            return null;
        }

        // 3. 설정값 조회
        String groupByStr = policy.getB2cWaveGroupBy();
        int maxOrderCount = policy.getB2cWaveTriggerCnt();

        // 4. group_by 파싱 (쉼표 구분 → List)
        List<String> groupBy = new ArrayList<>();
        if (ValueUtil.isNotEmpty(groupByStr)) {
            for (String field : groupByStr.split(SysConstants.COMMA)) {
                String trimmed = field.trim();
                if (!trimmed.isEmpty()) {
                    groupBy.add(trimmed);
                }
            }
        }

        // 5. 파라미터 맵 구성
        Map<String, Object> params = ValueUtil.newMap("wh_cd,com_cd,group_by,pick_type,max_order_count", whCd, comCd,
                groupBy, "TOTAL", maxOrderCount == 0 ? 100 : maxOrderCount);

        // 6. 자동 웨이브 생성
        return this.waveService.createAutoWaves(params);
    }
}
