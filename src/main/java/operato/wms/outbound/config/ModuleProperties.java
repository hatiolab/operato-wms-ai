/* Copyright © HatioLab Inc. All rights reserved. */
package operato.wms.outbound.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Component;

import xyz.elidom.sys.system.config.module.IModuleProperties;
import xyz.elidom.util.FormatUtil;

/**
 * operato-wms-outbound 모듈 정보 파일
 * 
 * @author shortstop
 */
@Component("operatoWmsOutboundModuleProperties")
@EnableConfigurationProperties
@PropertySource("classpath:/properties/operato-wms-outbound.properties")
public class ModuleProperties implements IModuleProperties {
	
	/**
	 * 모듈명
	 */
	@Value("${operato.wms.outbound.name}")
	private String name;
	
	/**
	 * 버전
	 */
	@Value("${operato.wms.outbound.version}")
	private String version;
	
	/**
	 * Module Built Time 
	 */
	@Value("${operato.wms.outbound.built.at}")
	private String builtAt;	
	
	/**
	 * 모듈 설명
	 */
	@Value("${operato.wms.outbound.description}")
	private String description;
	
	/**
	 * 부모 모듈
	 */
	@Value("${operato.wms.outbound.parentModule}")
	private String parentModule;
	
	/**
	 * 모듈 Base Package
	 */
	@Value("${operato.wms.outbound.basePackage}")
	private String basePackage;
	
	/**
	 * Scan Service Path
	 */
	@Value("${operato.wms.outbound.scanServicePackage}")
	private String scanServicePackage;
	
	/**
	 * Scan Entity Path
	 */
	@Value("${operato.wms.outbound.scanEntityPackage}")
	private String scanEntityPackage;
	
	/**
	 * Project Name
	 * @return
	 */
	@Value("${operato.wms.outbound.projectName}")
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