/* Copyright © HatioLab Inc. All rights reserved. */
package operato.wms.fulfillment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Component;

import xyz.elidom.sys.system.config.module.IModuleProperties;
import xyz.elidom.util.FormatUtil;

/**
 * operato-wms-fulfillment 모듈 정보 파일
 *
 * @author HatioLab
 */
@Component("operatoWmsFulfillmentModuleProperties")
@EnableConfigurationProperties
@PropertySource("classpath:/properties/operato-wms-fulfillment.properties")
public class ModuleProperties implements IModuleProperties {

	/**
	 * 모듈명
	 */
	@Value("${operato.wms.fulfillment.name}")
	private String name;

	/**
	 * 버전
	 */
	@Value("${operato.wms.fulfillment.version}")
	private String version;

	/**
	 * Module Built Time
	 */
	@Value("${operato.wms.fulfillment.built.at}")
	private String builtAt;

	/**
	 * 모듈 설명
	 */
	@Value("${operato.wms.fulfillment.description}")
	private String description;

	/**
	 * 부모 모듈
	 */
	@Value("${operato.wms.fulfillment.parentModule}")
	private String parentModule;

	/**
	 * 모듈 Base Package
	 */
	@Value("${operato.wms.fulfillment.basePackage}")
	private String basePackage;

	/**
	 * Scan Service Path
	 */
	@Value("${operato.wms.fulfillment.scanServicePackage}")
	private String scanServicePackage;

	/**
	 * Scan Entity Path
	 */
	@Value("${operato.wms.fulfillment.scanEntityPackage}")
	private String scanEntityPackage;

	/**
	 * Project Name
	 * @return
	 */
	@Value("${operato.wms.fulfillment.projectName}")
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
