package operato.wms.base.service;

import java.util.List;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryService;
import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.print.entity.Printer;
import xyz.elidom.util.ValueUtil;

/**
 * Base 모듈 트랜잭션 처리 서비스
 * 
 * @author shortstop
 */
@Component
public class WmsBaseService extends AbstractQueryService {
    /**
     * 기본 일반 프린터 ID 조회
     * 
     * @return
     */
    public String getDefaultNormalPrinter(Long domainId) {
        Printer condition = new Printer();
        condition.setDomainId(domainId);
        condition.setPrinterType("NORMAL");
        condition.setDefaultFlag(true);
        List<Printer> printerList = this.queryManager.selectList(Printer.class, condition);
        
        if(ValueUtil.isEmpty(printerList)) {
            throw new ElidomRuntimeException("등록된 일반 프린터 중 기본 프린터가 없습니다.");
        } else {
            return printerList.get(0).getId();
        }
    }
    
    /**
     * 기본 바코드 프린터 ID 조회
     * 
     * @return
     */
    public String getDefaultBarcodePrinter(Long domainId) {
        Printer condition = new Printer();
        condition.setDomainId(domainId);
        condition.setPrinterType("BARCODE");
        condition.setDefaultFlag(true);
        List<Printer> printerList = this.queryManager.selectList(Printer.class, condition);
        
        if(ValueUtil.isEmpty(printerList)) {
            throw new ElidomRuntimeException("등록된 일반 프린터 중 기본 프린터가 없습니다.");
        } else {
            return printerList.get(0).getId();
        }
    }
}
