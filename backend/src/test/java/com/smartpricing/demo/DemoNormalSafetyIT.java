package com.smartpricing.demo;

import com.smartpricing.SmartPricingApplication;
import com.smartpricing.catalog.dto.CatalogDtos.ProductWrite;
import com.smartpricing.catalog.service.CatalogService;
import com.smartpricing.config.EnvironmentController;
import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.demo.service.DemoSeedService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.core.env.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class, webEnvironment=SpringBootTest.WebEnvironment.NONE)
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class DemoNormalSafetyIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired CatalogService catalog;
    @Autowired JdbcTemplate jdbc;
    @Autowired EnvironmentController environment;
    @Autowired ObjectProvider<DemoSeedService> seeds;

    @Test void normalDatabaseRetainsPreexistingRecordsAndRejectsBothDemoCommandsBeforeMigration() {
        var product=catalog.createProduct(new ProductWrite("Protected normal product",null,null,null,null));
        jdbc.update("INSERT INTO app_metadata(key,value) VALUES ('protected-marker','retained')");
        assertThat(environment.info().synthetic()).isFalse();assertThat(seeds.getIfAvailable()).isNull();
        for(String action:List.of("seed","reset")) {
            StandardEnvironment properties=new StandardEnvironment();
            properties.getPropertySources().addFirst(new MapPropertySource("isolated-normal-test",Map.of(
                    "spring.datasource.url",database.getJdbcUrl(),"spring.datasource.username",database.getUsername(),
                    "spring.datasource.password",database.getPassword(),"logging.level.root","OFF")));
            assertThatThrownBy(()->new SpringApplicationBuilder(SmartPricingApplication.class).environment(properties).profiles("local").web(WebApplicationType.NONE)
                    .run("--demo.action="+action,"--demo.confirm-reset="+DemoSafetyGuard.RESET_CONFIRMATION)).isInstanceOf(Exception.class);
            assertThat(jdbc.queryForObject("SELECT name FROM products WHERE id=?",String.class,product.id())).isEqualTo("Protected normal product");
            assertThat(jdbc.queryForObject("SELECT value FROM app_metadata WHERE key='protected-marker'",String.class)).isEqualTo("retained");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success",Integer.class)).isEqualTo(6);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders",Integer.class)).isZero();
        }
    }
}
