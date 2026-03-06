/* Copyright © HatioLab Inc. All rights reserved. */
package operato.wms.base.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Component;

import xyz.elidom.sys.system.config.module.IModuleProperties;
import xyz.elidom.util.FormatUtil;

/**
 * operato-wms-base 모듈 정보 파일
 * 
 * @author shortstop
 */
@Component("operatoWmsBaseModuleProperties")
@EnableConfigurationProperties
@PropertySource("classpath:/properties/operato-wms-base.properties")
public class ModuleProperties implements IModuleProperties {
	
	/**
	 * 모듈명
	 */
	@Value("${operato.wms.base.name}")
	private String name;
	
	/**
	 * 버전
	 */
	@Value("${operato.wms.base.version}")
	private String version;
	
	/**
	 * Module Built Time 
	 */
	@Value("${operato.wms.base.built.at}")
	private String builtAt;	
	
	/**
	 * 모듈 설명
	 */
	@Value("${operato.wms.base.description}")
	private String description;
	
	/**
	 * 부모 모듈
	 */
	@Value("${operato.wms.base.parentModule}")
	private String parentModule;
	
	/**
	 * 모듈 Base Package
	 */
	@Value("${operato.wms.base.basePackage}")
	private String basePackage;
	
	/**
	 * Scan Service Path
	 */
	@Value("${operato.wms.base.scanServicePackage}")
	private String scanServicePackage;
	
	/**
	 * Scan Entity Path
	 */
	@Value("${operato.wms.base.scanEntityPackage}")
	private String scanEntityPackage;
	
	/**
	 * Project Name
	 * @return
	 */
	@Value("${operato.wms.base.projectName}")
	private String projectName;
	
	public String getName() {
		return this.name;
	}

	public String getVersion() {
		return this.version;
	}
	
	public String getBuiltAt() {
		return builtAt;
	}

	public String getDescription() {
		return this.description;
	}
	
	public String getParentModule() {
		return this.parentModule;
	}

	public String getBasePackage() {
		return this.basePackage;
	}

	public String getScanServicePackage() {
		return this.scanServicePackage;
	}

	public String getScanEntityPackage() {
		return this.scanEntityPackage;
	}
	
	public String getProjectName() {
		return this.projectName;
	}

	@Override
	public String toString() {
		return FormatUtil.toJsonString(this);
	}
}