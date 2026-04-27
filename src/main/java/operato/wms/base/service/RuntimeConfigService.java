package operato.wms.base.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import operato.wms.base.model.RuntimeConfig;
import operato.wms.base.rest.RuntimeEnvController;

/**
 * 환경설정 조회 서비스 (캐쉬 이용)
 * 
 * @author shortstop
 */
@Component
public class RuntimeConfigService {
    
    /**
     * 환경설정 컨트롤러
     */
    @Autowired
    private RuntimeEnvController runtimeCtrl;

    /**
     * 화주사 - 창고 - 설정 명으로 설정 값 조회
     *  
     * @param comCd
     * @param whCd
     * @param configName
     * @return
     */
    public String getRuntimeConfigValue(String comCd, String whCd, String configName) {
        RuntimeConfig rc = this.runtimeCtrl.findEnvItem(comCd, whCd, configName);
        return rc != null ? rc.getItemValue() : null;
    }
}
