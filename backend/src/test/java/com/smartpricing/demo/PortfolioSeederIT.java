package com.smartpricing.demo;

import com.smartpricing.SmartPricingApplication;
import com.smartpricing.demo.generator.*;
import com.smartpricing.demo.service.DemoSeedService;
import com.smartpricing.demo.config.DemoSafetyGuard;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles({"demo","portfolio"})
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class PortfolioSeederIT {
    static final String password=UUID.randomUUID().toString();
    @Container static PostgreSQLContainer<?> database=DemoSeederIT.container(password).withEnv("DEMO_FIXTURE","portfolio");
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->DemoSeederIT.url(database));r.add("spring.datasource.username",()->"smartpricing_demo");r.add("spring.datasource.password",()->password);
    }
    @Autowired DemoSeedService seeds;
    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.core.env.Environment environment;
    @Autowired javax.sql.DataSource dataSource;

    @Test void freshRunsCanonicalBytesIdempotencyResetIsolationAndFinancialReconciliation() throws Exception {
        var config=new DemoSeedConfig(PortfolioGenerator.SEED,DemoSeedConfig.DEFAULT_START);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM products",Long.class)).isZero();
        long began=System.nanoTime();var first=seeds.seed(config);long elapsed=System.nanoTime()-began;
        String canonical=seeds.canonicalExport();
        assertThat(first.generatorVersion()).isEqualTo("portfolio-v1");assertThat(first.variants()).isEqualTo(30);
        assertThat(first.checksum()).isEqualTo(HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(java.nio.charset.StandardCharsets.UTF_8))));
        assertThat(seeds.seed(config)).isEqualTo(first);
        assertThat(seeds.canonicalExport()).isEqualTo(canonical);
        assertThatThrownBy(()->seeds.resetAndSeed(config,null)).isInstanceOf(com.smartpricing.common.ApiException.class);
        var legacyEnvironment=new org.springframework.mock.env.MockEnvironment().withProperty("app.mode","demo");legacyEnvironment.setActiveProfiles("demo");
        assertThatThrownBy(()->new DemoSafetyGuard(legacyEnvironment,dataSource).requireDemo()).isInstanceOf(com.smartpricing.common.ApiException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_order_items WHERE line_net<>quantity*unit_price-discount_amount OR line_net<0",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM product_variants WHERE status='ARCHIVED'",Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders WHERE source<>'DEMO'",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM (SELECT i.id FROM sales_order_items i JOIN sales_refunds r ON r.item_id=i.id GROUP BY i.id,i.quantity,i.line_net HAVING sum(r.quantity)>i.quantity OR sum(r.amount)>i.line_net) invalid_refunds",Long.class)).isZero();
        String otherPassword=UUID.randomUUID().toString();
        try(var other=DemoSeederIT.container(otherPassword).withEnv("DEMO_FIXTURE","portfolio")) {
            other.start();
            try(var context=new SpringApplicationBuilder(SmartPricingApplication.class).profiles("demo","portfolio").web(WebApplicationType.NONE)
                    .run("--spring.datasource.url="+DemoSeederIT.url(other),"--spring.datasource.username=smartpricing_demo","--spring.datasource.password="+otherPassword,"--logging.level.root=WARN")) {
                var second=context.getBean(DemoSeedService.class);
                assertThat(second.seed(config)).isEqualTo(first);
                assertThat(second.canonicalExport()).isEqualTo(canonical);
            }
        }
        assertThat(seeds.resetAndSeed(config,DemoSafetyGuard.RESET_CONFIRMATION)).isEqualTo(first);
        assertThat(seeds.canonicalExport()).isEqualTo(canonical);
        var out=Path.of("target/portfolio-verification");Files.createDirectories(out);
        Files.writeString(out.resolve("canonical.jsonl"),canonical);
        Files.writeString(out.resolve("reproducibility.txt"),"twoFreshRunsByteIdentical=true\nidempotent=true\nresetReproducible=true\nlegacyProfileRejectedPortfolioMarker=true\nchecksum="+first.checksum()+"\nfirstSeedMillis="+elapsed/1000000+"\ncanonicalBytes="+canonical.getBytes(java.nio.charset.StandardCharsets.UTF_8).length+"\n");
    }
}
