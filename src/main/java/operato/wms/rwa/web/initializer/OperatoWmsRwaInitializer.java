package operato.wms.rwa.web.initializer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import operato.wms.rwa.config.ModuleProperties;
import operato.wms.rwa.query.store.RwaQueryStore;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.config.ModuleConfigSet;
import xyz.elidom.sys.system.service.api.IEntityFieldCache;
import xyz.elidom.sys.system.service.api.IServiceFinder;

/**
 * Operato WMS RWA Startup시 Framework 초기화 클래스
 *
 * @author HatioLab
 */
@Component
public class OperatoWmsRwaInitializer {
	/**
	 * Logger
	 */
	private Logger logger = LoggerFactory.getLogger(OperatoWmsRwaInitializer.class);

	@Autowired
	@Qualifier("rest")
	private IServiceFinder restFinder;

	@Autowired
	private IEntityFieldCache entityFieldCache;

	@Autowired
	private IQueryManager queryManager;

	@Autowired
	private RwaQueryStore rwaQueryStore;

	@Autowired
	private ModuleProperties module;

	@Autowired
	private ModuleConfigSet configSet;

	@EventListener({ ContextRefreshedEvent.class })
	public void refresh(ContextRefreshedEvent event) {
		this.logger.info("Operato WMS RWA module refreshing...");

		this.configSet.addConfig(this.module.getName(), this.module);
		this.scanServices();

		this.logger.info("Operato WMS RWA module refreshed!");
	}

	@EventListener({ApplicationReadyEvent.class})
	void ready(ApplicationReadyEvent event) {
		this.logger.info("Operato WMS RWA module initializing...");

		this.initQueryStores();

		this.logger.info("Operato WMS RWA module initialized!");
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
		this.rwaQueryStore.initQueryStore(dbType);
	}
}
