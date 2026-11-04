package com.smartpricing.demo;

import com.smartpricing.SmartPricingApplication;
import com.smartpricing.business.dto.BusinessDtos.Update;
import com.smartpricing.business.service.BusinessService;
import com.smartpricing.common.ApiException;
import com.smartpricing.config.EnvironmentController;
import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.demo.generator.DemoSeedConfig;
import com.smartpricing.demo.service.DemoSeedService;
import com.smartpricing.sales.service.SalesService;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.utility.MountableFile;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class, webEnvironment=SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("demo")
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class DemoSeederIT {
    static final String appPassword=UUID.randomUUID().toString();
    @Container static PostgreSQLContainer<?> database=container(appPassword);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",()->url(database));
        registry.add("spring.datasource.username",()->"smartpricing_demo");
        registry.add("spring.datasource.password",()->appPassword);
    }
    @Autowired DemoSeedService seeds;
    @Autowired JdbcTemplate jdbc;
    @Autowired BusinessService business;
    @Autowired EnvironmentController environment;
    @Autowired com.smartpricing.analytics.service.AnalyticsService analytics;
    @Autowired com.smartpricing.forecasting.service.ForecastService forecasting;
    @Autowired com.smartpricing.optimization.service.OptimizationService optimization;
    @MockitoSpyBean SalesService sales;

    @Test void reproducibilityAtomicFailureIdempotencyResetAndIsolation() {
        assertThat(environment.info().synthetic()).isTrue();
        assertThat(environment.info().datasetState()).isEqualTo("NOT_INITIALIZED");
        assertThat(count("products")).isZero(); // Demo profile alone never seeds.
        assertThatThrownBy(()->jdbc.update("UPDATE demo_control.environment SET marker='unsafe'")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        doThrow(new IllegalStateException("Injected seed failure")).when(sales).create(any());
        assertThatThrownBy(()->seeds.seed(DemoSeedConfig.defaults())).hasMessageContaining("Injected seed failure");
        assertThat(count("products")).isZero();assertThat(count("sales_orders")).isZero();assertThat(count("demo_control.seed_runs")).isZero();
        reset(sales);

        var first=seeds.seed(DemoSeedConfig.defaults());
        assertThat(first.products()).isEqualTo(30);assertThat(first.variants()).isEqualTo(30);assertThat(first.categories()).isEqualTo(5);
        assertThat(first.priceObservations()).isEqualTo(117);assertThat(first.costObservations()).isEqualTo(57);assertThat(first.inventoryObservations()).isEqualTo(9870);
        assertThat(first.orders()).isGreaterThan(9000);assertThat(first.refunds()).isPositive();assertThat(first.unknownCostLines()).isPositive();
        assertThat(first.scenarios()).hasSize(10);assertThat(environment.info().datasetState()).isEqualTo("READY");
        var completed=jdbc.queryForObject("SELECT completed_at FROM demo_control.seed_runs",java.sql.Timestamp.class);
        assertThat(seeds.seed(DemoSeedConfig.defaults())).isEqualTo(first);
        var reportingEnd=first.endDate().plusDays(1);
        var report=analytics.overview(first.startDate(),reportingEnd);
        assertThat(report.metrics().orders()).isEqualTo(first.orders());
        var trend=analytics.trends(first.startDate(),reportingEnd,com.smartpricing.analytics.dto.AnalyticsDtos.Granularity.MONTH);
        var trendNet=trend.content().stream().map(b->new java.math.BigDecimal(b.metrics().netSales())).reduce(java.math.BigDecimal.ZERO,java.math.BigDecimal::add);
        assertThat(trendNet).isEqualByComparingTo(report.metrics().netSales());
        analytics.products(first.startDate(),reportingEnd,null,0,20,com.smartpricing.analytics.dto.AnalyticsDtos.Sort.NET_DESC,"");
        analytics.inventory(first.startDate(),reportingEnd,0,20);
        var demandOverview=forecasting.overview(first.startDate(),reportingEnd,0,10,"");
        var optimizationPage=optimization.overview(first.startDate(),reportingEnd,7,0,10,"");
        assertThat(optimizationPage.results().totalElements()).isEqualTo(first.variants());
        for(String scenario:java.util.List.of("SEASONAL","ELASTIC_HIGH","SPARSE","ZERO_SALES","STOCKOUT","COST_CHANGE_UNKNOWN","ARCHIVE")) {
            var variantId=jdbc.queryForObject("SELECT id FROM product_variants WHERE sku=?",java.util.UUID.class,"DEMO-"+scenario+"-1");
            var evaluation=optimization.recommendation(variantId,first.startDate(),reportingEnd,7);
            assertThat(evaluation.status()).isNotEqualTo(com.smartpricing.optimization.dto.OptimizationDtos.Status.ACTIONABLE);
            assertThat(evaluation.recommendedPrice()).isNull();assertThat(evaluation.comparison()).isNull();assertThat(evaluation.sensitivity()).isEmpty();
            if(scenario.equals("SEASONAL"))assertThat(evaluation.reasons()).contains("SEASONAL_OR_CALENDAR_CONFOUNDING");
            if(scenario.equals("COST_CHANGE_UNKNOWN"))assertThat(optimization.recommendation(variantId,first.startDate(),first.startDate().plusMonths(5),7).status()).isEqualTo(com.smartpricing.optimization.dto.OptimizationDtos.Status.MISSING_COST);
        }
        assertThat(demandOverview.results().totalElements()).isEqualTo(first.variants());
        for(String sku:java.util.List.of("DEMO-ELASTIC_HIGH-1","DEMO-ELASTIC_LOW-1","DEMO-SPARSE-1","DEMO-ZERO_SALES-1")) {
            var variantId=jdbc.queryForObject("SELECT id FROM product_variants WHERE sku=?",java.util.UUID.class,sku);
            var demand=forecasting.detail(variantId,first.startDate(),reportingEnd,7);
            if(sku.contains("ELASTIC_")) {
                assertThat(demand.elasticity().estimate()).isNotNull();assertThat(demand.forecast().daily()).hasSize(7);
                assertThat(forecasting.backtest(variantId,first.startDate(),reportingEnd,7).folds()).hasSize(2);
            } else assertThat(demand.elasticity().estimate()).isNull();
        }
        assertThat(seeds.seed(DemoSeedConfig.defaults())).isEqualTo(first); // Read-only analytics preserves normalized checksum.
        assertThat(jdbc.queryForObject("SELECT completed_at FROM demo_control.seed_runs",java.sql.Timestamp.class)).isEqualTo(completed);
        invariants(jdbc);
        assertThatThrownBy(()->seeds.resetAndSeed(DemoSeedConfig.defaults(),null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->seeds.seed(new DemoSeedConfig(first.seed()+1,first.startDate()))).isInstanceOf(ApiException.class);
        assertThat(count("sales_orders")).isEqualTo(first.orders());

        var settings=business.get();business.update(new Update("Edited synthetic workspace",settings.currencyCode(),settings.version()));
        assertThatThrownBy(()->seeds.seed(DemoSeedConfig.defaults())).isInstanceOfSatisfying(ApiException.class,error->assertThat(error.code()).isEqualTo("DEMO_DATA_CHANGED"));
        settings=business.get();business.update(new Update("Atlas Home & Pantry — Synthetic Demo",settings.currencyCode(),settings.version()));
        assertThat(seeds.seed(DemoSeedConfig.defaults())).isEqualTo(first);

        doThrow(new IllegalStateException("Injected reset failure")).when(sales).create(any());
        assertThatThrownBy(()->seeds.resetAndSeed(new DemoSeedConfig(first.seed()+1,first.startDate()),DemoSafetyGuard.RESET_CONFIRMATION)).hasMessageContaining("Injected reset failure");
        reset(sales);
        assertThat(seeds.seed(DemoSeedConfig.defaults())).isEqualTo(first); // Transactional reset rollback retained the old dataset.

        String secondPassword=UUID.randomUUID().toString();
        try(var second=container(secondPassword)) {
            second.start();
            try(var context=new SpringApplicationBuilder(SmartPricingApplication.class).profiles("demo").web(WebApplicationType.NONE).run(
                    "--spring.datasource.url="+url(second),"--spring.datasource.username=smartpricing_demo",
                    "--spring.datasource.password="+secondPassword,"--logging.level.root=WARN")) {
                var secondSeeds=context.getBean(DemoSeedService.class);
                var repeated=secondSeeds.seed(DemoSeedConfig.defaults());
                assertThat(repeated).isEqualTo(first); // Independent database IDs/audit timestamps normalize away.
                var varied=secondSeeds.resetAndSeed(new DemoSeedConfig(first.seed()+1,first.startDate()),DemoSafetyGuard.RESET_CONFIRMATION);
                assertThat(varied.checksum()).isNotEqualTo(first.checksum());
                assertThat(varied.products()).isEqualTo(first.products());assertThat(varied.inventoryObservations()).isEqualTo(first.inventoryObservations());
                invariants(context.getBean(JdbcTemplate.class));
            }
        }
    }
    long count(String table){return jdbc.queryForObject("SELECT count(*) FROM "+table,Long.class);}
    static void invariants(JdbcTemplate jdbc) {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id JOIN inventory_snapshots s ON s.variant_id=i.variant_id AND s.observed_at::date=o.placed_at::date WHERE i.quantity>s.quantity_available",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_order_items WHERE line_net<>quantity*unit_price-discount_amount OR line_net<0",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id JOIN demo_control.catalog_mappings m ON m.entity_kind='VARIANT' AND m.entity_id=i.variant_id WHERE m.scenario_id='COST_CHANGE_UNKNOWN' AND o.placed_at>='2025-04-01' AND o.placed_at<'2025-07-01' AND i.unit_cost IS NULL",Long.class)).isEqualTo(273);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM product_variants WHERE status='ARCHIVED'",Long.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_order_items i JOIN product_variants v ON v.id=i.variant_id WHERE v.status='ARCHIVED'",Long.class)).isPositive();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders WHERE source<>'DEMO'",Long.class)).isZero();
        for(String table:new String[]{"variant_price_history","variant_cost_history"})
            assertThat(jdbc.queryForObject("SELECT count(*) FROM "+table+" a JOIN "+table+" b ON a.variant_id=b.variant_id AND a.id<b.id WHERE a.quality='VERIFIED_CHANGE' AND b.quality='VERIFIED_CHANGE' AND tstzrange(a.valid_from,a.valid_to,'[)') && tstzrange(b.valid_from,b.valid_to,'[)')",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM (SELECT i.id FROM sales_order_items i JOIN sales_refunds r ON r.item_id=i.id GROUP BY i.id,i.quantity,i.line_net HAVING sum(r.quantity)>i.quantity OR sum(r.amount)>i.line_net) invalid_refunds",Long.class)).isZero();
    }
    static PostgreSQLContainer<?> container(String password) {
        return new PostgreSQLContainer<>("postgres:17.7-alpine").withDatabaseName("postgres").withUsername("smartpricing_demo_admin")
                .withPassword(UUID.randomUUID().toString()).withEnv("DEMO_DB_PASSWORD",password)
                .withCopyFileToContainer(MountableFile.forHostPath(Path.of("../infra/demo/10-isolated-demo.sh").toAbsolutePath().normalize()),"/docker-entrypoint-initdb.d/10-isolated-demo.sh");
    }
    static String url(PostgreSQLContainer<?> container){return container.getJdbcUrl().replace("/postgres","/smartpricing_demo");}
}
