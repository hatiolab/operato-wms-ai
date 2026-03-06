package operato.wms.outbound.web.initializer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import operato.wms.outbound.config.ModuleProperties;
import operato.wms.outbound.query.store.OutboundQueryStore;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.config.ModuleConfigSet;
import xyz.elidom.sys.system.service.api.IEntityFieldCache;
import xyz.elidom.sys.system.service.api.IServiceFinder;

/**
 * Operato WMS Outbound Startup시 Framework 초기화 클래스 
 * 
 * @author shortstop
 */
@Component
public class OperatoWmsOutboundInitializer {
    /**
     * Logger
     */
    private Logger logger = LoggerFactory.getLogger(OperatoWmsOutboundInitializer.class);
    
    @Autowired
    @Qualifier("rest")
    private IServiceFinder restFinder;
    
    @Autowired
    private IEntityFieldCache entityFieldCache;
    
    @Autowired
    private IQueryManager queryManager;
    
    @Autowired
    private OutboundQueryStore outQueryStore;
    
    @Autowired
    private ModuleProperties module;
    
    @Autowired
    private ModuleConfigSet configSet;
        
    @EventListener({ ContextRefreshedEvent.class })
    public void refresh(ContextRefreshedEvent event) {
        this.logger.info("Operato WMS Outbound module refreshing...");
        
        this.configSet.addConfig(this.module.getName(), this.module);
        this.scanServices();
        
        this.logger.info("Operato WMS Outbound module refreshed!");
    }
    
    @EventListener({ApplicationReadyEvent.class})
    void ready(ApplicationReadyEvent event) {
        this.logger.info("Operato WMS Outbound module initializing...");
        
        this.initQueryStores();
                
        this.logger.info("Operato WMS Outbound module initialized!");
    }
    
    /**
     * 모듈 서비스 스캔 
     */
    private void scanServices() {
        this.entityFieldCache.scanEntityFieldsByBasePackage(this.module.getBasePackage());
        this.restFinder.scanServicesByPackage(this.module.getName(), this.module.getBasePackage());
    }
    
    /**
     * 쿼리 스토어 초기화
     */
    private void initQueryStores() {
        String dbType = this.queryManager.getDbType();
        this.outQueryStore.initQueryStore(dbType);
    }
}
