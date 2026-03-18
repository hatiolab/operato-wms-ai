지정된 모듈명으로 `operato.wms.{module}` 패키지 구조를 생성하고 모듈 설정 파일들을 자동 생성해줘.

파라미터: 모듈명 (소문자, 예: `vas`, `rwa`, `stock`)
- 예시: `/create_module vas`

## 생성할 패키지 구조

```
operato.wms.{module}/
├── config/
│   └── ModuleProperties.java
├── entity/                    # 디렉토리만 생성
├── query/
│   └── store/
│       └── {Module}QueryStore.java
├── rest/                      # 디렉토리만 생성
├── service/                   # 디렉토리만 생성
├── util/
│   └── OperatoWms{Module}Util.java
├── web/
│   └── initializer/
│       └── OperatoWms{Module}Initializer.java
├── Wms{Module}Constants.java
└── Wms{Module}ConfigConstants.java
```

## 생성할 파일 목록

### 1. Properties 파일

**파일 경로**: `src/main/resources/properties/operato-wms-{module}.properties`

**내용**:
```properties
operato.wms.{module}.name: wms-{module}
operato.wms.{module}.version: 1.0.0.0
operato.wms.{module}.built.at: {현재_일시}
operato.wms.{module}.projectName: operato-wms-{module}
operato.wms.{module}.description: Operato WMS {Module} Module
operato.wms.{module}.parentModule: wms-base
operato.wms.{module}.basePackage: operato.wms.{module}
operato.wms.{module}.scanEntityPackage: operato.wms.{module}.entity
operato.wms.{module}.scanServicePackage: operato.wms.{module}.rest
```

**변수 치환 규칙**:
- `{module}`: 소문자 모듈명 (예: `vas`)
- `{Module}`: PascalCase 모듈명 (예: `Vas`)
- `{MODULE}`: 대문자 모듈명 (예: `VAS`)
- `{현재_일시}`: `date +"%Y-%m-%d %H:%M:%S"` 결과

### 2. ModuleProperties.java

**파일 경로**: `src/main/java/operato/wms/{module}/config/ModuleProperties.java`

**템플릿**:
```java
/* Copyright © HatioLab Inc. All rights reserved. */
package operato.wms.{module}.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Component;

import xyz.elidom.sys.system.config.module.IModuleProperties;
import xyz.elidom.util.FormatUtil;

/**
 * operato-wms-{module} 모듈 정보 파일
 *
 * @author HatioLab
 */
@Component("operatoWms{Module}ModuleProperties")
@EnableConfigurationProperties
@PropertySource("classpath:/properties/operato-wms-{module}.properties")
public class ModuleProperties implements IModuleProperties {

	/**
	 * 모듈명
	 */
	@Value("${operato.wms.{module}.name}")
	private String name;

	/**
	 * 버전
	 */
	@Value("${operato.wms.{module}.version}")
	private String version;

	/**
	 * Module Built Time
	 */
	@Value("${operato.wms.{module}.built.at}")
	private String builtAt;

	/**
	 * 모듈 설명
	 */
	@Value("${operato.wms.{module}.description}")
	private String description;

	/**
	 * 부모 모듈
	 */
	@Value("${operato.wms.{module}.parentModule}")
	private String parentModule;

	/**
	 * 모듈 Base Package
	 */
	@Value("${operato.wms.{module}.basePackage}")
	private String basePackage;

	/**
	 * Scan Service Path
	 */
	@Value("${operato.wms.{module}.scanServicePackage}")
	private String scanServicePackage;

	/**
	 * Scan Entity Path
	 */
	@Value("${operato.wms.{module}.scanEntityPackage}")
	private String scanEntityPackage;

	/**
	 * Project Name
	 * @return
	 */
	@Value("${operato.wms.{module}.projectName}")
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
```

### 3. {Module}QueryStore.java

**파일 경로**: `src/main/java/operato/wms/{module}/query/store/{Module}QueryStore.java`

**템플릿**:
```java
package operato.wms.{module}.query.store;

import org.springframework.stereotype.Component;

import xyz.anythings.sys.service.AbstractQueryStore;
import xyz.elidom.sys.SysConstants;

/**
 * {Module} 쿼리 스토어
 *
 * @author HatioLab
 */
@Component
public class {Module}QueryStore extends AbstractQueryStore {

	@Override
	public void initQueryStore(String databaseType) {
		this.databaseType = databaseType;
		this.basePath = "operato/wms/{module}/query/" + this.databaseType + SysConstants.SLASH;
		this.defaultBasePath = "operato/wms/{module}/query/ansi/";
	}

	// TODO: 쿼리 메서드 추가
	// 예시:
	// public String getSample{Module}Query() {
	//     return this.getQueryByPath("{module}/SampleQuery");
	// }
}
```

### 4. OperatoWms{Module}Initializer.java

**파일 경로**: `src/main/java/operato/wms/{module}/web/initializer/OperatoWms{Module}Initializer.java`

**템플릿**:
```java
package operato.wms.{module}.web.initializer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import operato.wms.{module}.config.ModuleProperties;
import operato.wms.{module}.query.store.{Module}QueryStore;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.config.ModuleConfigSet;
import xyz.elidom.sys.system.service.api.IEntityFieldCache;
import xyz.elidom.sys.system.service.api.IServiceFinder;

/**
 * Operato WMS {Module} Startup시 Framework 초기화 클래스
 *
 * @author HatioLab
 */
@Component
public class OperatoWms{Module}Initializer {
	/**
	 * Logger
	 */
	private Logger logger = LoggerFactory.getLogger(OperatoWms{Module}Initializer.class);

	@Autowired
	@Qualifier("rest")
	private IServiceFinder restFinder;

	@Autowired
	private IEntityFieldCache entityFieldCache;

	@Autowired
	private IQueryManager queryManager;

	@Autowired
	private {Module}QueryStore {module}QueryStore;

	@Autowired
	private ModuleProperties module;

	@Autowired
	private ModuleConfigSet configSet;

	@EventListener({ ContextRefreshedEvent.class })
	public void refresh(ContextRefreshedEvent event) {
		this.logger.info("Operato WMS {Module} module refreshing...");

		this.configSet.addConfig(this.module.getName(), this.module);
		this.scanServices();

		this.logger.info("Operato WMS {Module} module refreshed!");
	}

	@EventListener({ApplicationReadyEvent.class})
	void ready(ApplicationReadyEvent event) {
		this.logger.info("Operato WMS {Module} module initializing...");

		this.initQueryStores();

		this.logger.info("Operato WMS {Module} module initialized!");
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
		this.{module}QueryStore.initQueryStore(dbType);
	}
}
```

### 5. OperatoWms{Module}Util.java

**파일 경로**: `src/main/java/operato/wms/{module}/util/OperatoWms{Module}Util.java`

**템플릿**:
```java
package operato.wms.{module}.util;

/**
 * WMS {Module} 유틸리티
 *
 * @author HatioLab
 */
public class OperatoWms{Module}Util {

}
```

### 6. Wms{Module}Constants.java

**파일 경로**: `src/main/java/operato/wms/{module}/Wms{Module}Constants.java`

**템플릿**:
```java
package operato.wms.{module};

/**
 * WMS {Module} 모듈 상수 정의
 *
 * @author HatioLab
 */
public class Wms{Module}Constants {

	// TODO: 상수 정의 추가
	// 예시:
	// public static final String STATUS_ACTIVE = "ACTIVE";
	// public static final String STATUS_INACTIVE = "INACTIVE";

}
```

### 7. Wms{Module}ConfigConstants.java

**파일 경로**: `src/main/java/operato/wms/{module}/Wms{Module}ConfigConstants.java`

**템플릿**:
```java
package operato.wms.{module};

/**
 * WMS {Module} 모듈 설정 상수 정의
 *
 * @author HatioLab
 */
public class Wms{Module}ConfigConstants {

	// TODO: 설정 상수 정의 추가
	// 예시:
	// public static final String CONFIG_KEY_PREFIX = "wms.{module}.";

}
```

### 8. 쿼리 디렉토리 생성

**디렉토리 경로**:
```
src/main/resources/operato/wms/{module}/query/
└── ansi/
    └── {module}/    # 기본 쿼리 디렉토리
```

## 처리 절차

1. **모듈명 검증**
   - 소문자 알파벳만 허용 (예: `vas`, `rwa`, `stock`)
   - 이미 존재하는 모듈인지 확인 (`src/main/java/operato/wms/{module}` 디렉토리 존재 여부)

2. **변수 변환**
   - `{module}` → 입력받은 소문자 모듈명
   - `{Module}` → PascalCase 변환 (첫 글자 대문자)
   - `{MODULE}` → 대문자 변환
   - `{현재_일시}` → 현재 날짜/시각

3. **디렉토리 생성**
   ```bash
   mkdir -p src/main/java/operato/wms/{module}/config
   mkdir -p src/main/java/operato/wms/{module}/entity
   mkdir -p src/main/java/operato/wms/{module}/query/store
   mkdir -p src/main/java/operato/wms/{module}/rest
   mkdir -p src/main/java/operato/wms/{module}/service
   mkdir -p src/main/java/operato/wms/{module}/util
   mkdir -p src/main/java/operato/wms/{module}/web/initializer
   mkdir -p src/main/resources/operato/wms/{module}/query/ansi/{module}
   ```

4. **파일 생성**
   - 위 템플릿의 `{module}`, `{Module}`, `{MODULE}`, `{현재_일시}` 변수를 치환하여 파일 생성
   - Write tool로 각 파일 생성

5. **결과 보고**
   - 생성된 디렉토리 목록
   - 생성된 파일 목록
   - 모듈 구조 트리 출력

## 주의사항

- 이미 존재하는 모듈인 경우 경고 메시지 출력 후 중단
- 모듈명은 소문자 알파벳만 허용 (하이픈, 언더스코어 불가)
- 모든 파일에 Copyright 헤더 포함 (Java 파일만)
- `entity/`, `rest/`, `service/` 디렉토리는 생성만 하고 파일은 생성하지 않음 (사용자가 직접 추가)

## 예시

```bash
# 입력
/create_module stock

# 출력
✅ Stock 모듈 생성 완료!

📁 생성된 디렉토리:
  - src/main/java/operato/wms/stock/config
  - src/main/java/operato/wms/stock/entity
  - src/main/java/operato/wms/stock/query/store
  - src/main/java/operato/wms/stock/rest
  - src/main/java/operato/wms/stock/service
  - src/main/java/operato/wms/stock/util
  - src/main/java/operato/wms/stock/web/initializer
  - src/main/resources/operato/wms/stock/query/ansi/stock

📄 생성된 파일:
  - src/main/resources/properties/operato-wms-stock.properties
  - src/main/java/operato/wms/stock/config/ModuleProperties.java
  - src/main/java/operato/wms/stock/query/store/StockQueryStore.java
  - src/main/java/operato/wms/stock/web/initializer/OperatoWmsStockInitializer.java
  - src/main/java/operato/wms/stock/util/OperatoWmsStockUtil.java
  - src/main/java/operato/wms/stock/WmsStockConstants.java
  - src/main/java/operato/wms/stock/WmsStockConfigConstants.java
```
