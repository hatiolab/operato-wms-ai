package operato.wms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.ServletComponentScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ImportResource;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync(proxyTargetClass = true)
@EnableScheduling
@EnableConfigurationProperties
@ServletComponentScan
@ComponentScan(basePackages = { "xyz.anythings.*", "xyz.elidom.*", "operato.*" })
@ImportResource({ "classpath:/WEB-INF/application-context.xml", "classpath:/WEB-INF/dataSource-context.xml" })
public class OperatoWmsApplication {
	
	public static void main(String[] args) {
		SpringApplication.run(OperatoWmsApplication.class, args);
	}
}
