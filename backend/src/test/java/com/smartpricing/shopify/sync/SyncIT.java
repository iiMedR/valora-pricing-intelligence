package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.smartpricing.auth.TestHttp;
import com.smartpricing.shopify.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"app.shopify.enabled=true","app.shopify.client-id=ephemeral-id","app.shopify.client-secret=ephemeral-secret","app.shopify.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","app.shopify.public-base-url=https://example.test","server.servlet.session.cookie.secure=true","app.shopify.sync.worker-enabled=false"})
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class SyncIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired SyncCoordinator sync;@Autowired SyncRepository repository;@Autowired JdbcTemplate jdbc;@Autowired ObjectMapper mapper;@Autowired TokenCipher cipher;@Autowired TestRestTemplate rest;
    @MockitoBean ShopifyGraphQl graph;@MockitoBean ShopifyProvider provider;
    JsonNode fixture;Instant now;static final String SHOP="fixture-shop.myshopify.com";
    @BeforeEach void prepare()throws Exception{
        reset(graph,provider);now=Instant.now().minusSeconds(60);
        jdbc.execute("TRUNCATE shopify_sync_job,shopify_source_mapping,shopify_sync_watermark,shopify_inventory_location,sales_orders,products CASCADE");
        jdbc.update("UPDATE shopify_connection SET status='CONNECTED',shop_domain=?,generation=10,scopes=?,encrypted_access_token=?,encrypted_refresh_token=?,access_expires_at=?,refresh_expires_at=? WHERE id=1",SHOP,String.join(",",ShopifySettings.SCOPES),cipher.seal("ephemeral-access",SHOP+":access"),cipher.seal("ephemeral-refresh",SHOP+":refresh"),java.sql.Timestamp.from(now.plusSeconds(3600)),java.sql.Timestamp.from(now.plusSeconds(86400)));
        String source=new String(getClass().getResourceAsStream("/shopify/sanitized-import.json").readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);
        fixture=mapper.readTree(source.replace("$created",now.minus(Duration.ofDays(4)).toString()).replace("$updated",now.minus(Duration.ofDays(1)).toString()));
        when(graph.query(anyString(),anyString(),anyString(),anyMap())).thenAnswer(invocation->{String query=invocation.getArgument(2);String key=query.contains("query Catalog")?"catalog":query.contains("query Inventory")?"inventory":query.contains("query Refund")?"refund":"orders";return fixture.path(key).deepCopy();});
    }
    SyncRepository.Job start(int pages){return sync.start(new SyncCoordinator.Start("INITIAL",now.minus(Duration.ofDays(7)),now,pages,null));}
    SyncRepository.Job finish(UUID id){for(int tick=0;tick<15&&Set.of("PENDING","RUNNING").contains(repository.job(id).state());tick++)sync.runOne();return repository.job(id);}
    long count(String table){return jdbc.queryForObject("SELECT count(*) FROM "+table,Long.class);}
    @Test void importsSnapshotsRefundsZeroInventoryAndRepeatsWithoutDuplicates(){
        var job=finish(start(100).id());assertThat(job.state()).isEqualTo("SUCCEEDED");
        assertThat(count("products")).isEqualTo(1);assertThat(count("product_variants")).isEqualTo(1);assertThat(count("sales_orders")).isEqualTo(1);assertThat(count("sales_refunds")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT cost_price FROM product_variants",BigDecimal.class)).isNull();assertThat(jdbc.queryForObject("SELECT unit_cost FROM sales_order_items",BigDecimal.class)).isNull();
        assertThat(jdbc.queryForObject("SELECT line_net FROM sales_order_items",BigDecimal.class)).isEqualByComparingTo("18");assertThat(jdbc.queryForObject("SELECT name_snapshot FROM sales_order_items",String.class)).isEqualTo("Original sale title");assertThat(jdbc.queryForObject("SELECT quantity_available FROM inventory_snapshots",Integer.class)).isZero();assertThat(count("shopify_inventory_location")).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT quality FROM variant_price_history",String.class)).isEqualTo("SNAPSHOT");assertThat(count("variant_cost_history")).isZero();
        long mappings=count("shopify_source_mapping");assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");assertThat(count("sales_orders")).isEqualTo(1);assertThat(count("sales_refunds")).isEqualTo(1);assertThat(count("inventory_snapshots")).isEqualTo(1);assertThat(count("variant_price_history")).isEqualTo(1);assertThat(count("shopify_source_mapping")).isEqualTo(mappings);
        assertThat(sync.status().lastSuccessfulSync()).isNotNull();assertThat(sync.status().toString()).doesNotContain("ephemeral-access","ephemeral-refresh");
        var levels=(ArrayNode)fixture.path("inventory").path("inventoryItem").path("inventoryLevels").path("nodes");var first=levels.get(0);levels.set(0,levels.get(1));levels.set(1,first);
        assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");assertThat(count("inventory_snapshots")).isEqualTo(1); // Provider ordering does not invent a new observation.
    }
    @Test void budgetInterruptionAndRestartResumeSavedPageWithNoDuplicateWrites(){
        var job=start(1);sync.runOne();assertThat(repository.checkpoints(job.id()).getFirst().complete()).isTrue();sync.runOne();assertThat(repository.job(job.id()).state()).isEqualTo("PARTIAL");assertThat(repository.job(job.id()).errorCode()).isEqualTo("PAGE_BUDGET_REACHED_RESUME_REQUIRED");
        sync.start(new SyncCoordinator.Start(null,null,null,null,job.id()));assertThat(finish(job.id()).state()).isEqualTo("SUCCEEDED");assertThat(count("inventory_snapshots")).isEqualTo(1);assertThat(repository.job(job.id()).attempts()).isEqualTo(2);
        var incremental=sync.start(new SyncCoordinator.Start("INCREMENTAL",null,null,100,null));assertThat(incremental.from()).isEqualTo(repository.watermark(SHOP).minus(Duration.ofHours(48)));assertThat(finish(incremental.id()).state()).isEqualTo("SUCCEEDED");assertThat(count("sales_orders")).isEqualTo(1);
    }
    @Test void currencyFailureDoesNotAdvancePageAndCorrectedRetryWorks(){
        ((ObjectNode)fixture.path("orders").path("orders").path("nodes").get(0)).put("currencyCode","USD");
        var job=finish(start(100).id());assertThat(job.state()).isEqualTo("PARTIAL");assertThat(job.errorCode()).isEqualTo("UNSUPPORTED_CURRENCY");assertThat(repository.checkpoints(job.id()).get(1).complete()).isFalse();assertThat(count("sales_orders")).isZero();assertThat(repository.watermark(SHOP)).isNull();
        ((ObjectNode)fixture.path("orders").path("orders").path("nodes").get(0)).put("currencyCode","MAD");sync.start(new SyncCoordinator.Start(null,null,null,null,job.id()));assertThat(finish(job.id()).state()).isEqualTo("SUCCEEDED");
    }
    @Test void immutableOrderConflictAndManualEditsAreDetected(){
        assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");
        ((ObjectNode)fixture.path("orders").path("orders").path("nodes").get(0).path("lineItems").path("nodes").get(0).path("originalUnitPriceSet").path("shopMoney")).put("amount","11");
        assertThat(finish(start(100).id()).errorCode()).isEqualTo("IMMUTABLE_ORDER_CONFLICT");assertThat(jdbc.queryForObject("SELECT unit_price FROM sales_order_items",BigDecimal.class)).isEqualByComparingTo("10");
        jdbc.update("UPDATE product_variants SET name='Local edit',version=version+1");assertThat(finish(start(100).id()).errorCode()).isEqualTo("LOCAL_EDIT_CONFLICT");assertThat(jdbc.queryForObject("SELECT name FROM product_variants",String.class)).isEqualTo("Local edit");
    }
    @Test void concurrencyConnectionGenerationAndRefreshAreSafe(){
        var job=start(100);assertThatThrownBy(()->start(100)).hasMessageContaining("already");
        jdbc.update("UPDATE shopify_connection SET generation=generation+1");sync.runOne();assertThat(repository.job(job.id()).errorCode()).isEqualTo("CONNECTION_CHANGED_OR_DISCONNECTED");assertThat(count("products")).isZero();
        assertThatThrownBy(()->sync.start(new SyncCoordinator.Start(null,null,null,null,job.id()))).hasMessageContaining("earlier installation");
        jdbc.update("UPDATE shopify_connection SET access_expires_at=CURRENT_TIMESTAMP-INTERVAL '1 minute'");when(provider.refresh(anyString(),anyString())).thenReturn(new ShopifyProvider.Tokens("ephemeral-new-access","ephemeral-new-refresh",Instant.now().plusSeconds(3600),Instant.now().plusSeconds(86400),ShopifySettings.SCOPES));
        assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");verify(provider,times(1)).refresh(SHOP,"ephemeral-refresh");assertThat(cipher.open(jdbc.queryForObject("SELECT encrypted_refresh_token FROM shopify_connection",String.class),SHOP+":refresh")).isEqualTo("ephemeral-new-refresh");
    }
    @Test void protectedHttpContractRejectsAnonymousCsrfAndDisconnectedStore(){
        var anonymous=new org.springframework.web.client.RestTemplate();assertThatThrownBy(()->anonymous.getForEntity(rest.getRootUri()+"/api/v1/shopify/sync/status",String.class)).isInstanceOf(org.springframework.web.client.HttpClientErrorException.Unauthorized.class);
        TestHttp.authenticate(rest,jdbc);assertThat(rest.getForEntity("/api/v1/shopify/sync/status",String.class).getStatusCode().value()).isEqualTo(200);
        var accepted=rest.postForEntity("/api/v1/shopify/sync",new SyncCoordinator.Start("INITIAL",now.minus(Duration.ofDays(7)),now,100,null),JsonNode.class);assertThat(accepted.getStatusCode().value()).isEqualTo(202);UUID jobId=UUID.fromString(accepted.getBody().path("id").asText());
        assertThat(rest.postForEntity("/api/v1/shopify/sync",new SyncCoordinator.Start("INITIAL",now.minus(Duration.ofDays(7)),now,100,null),String.class).getStatusCode().value()).isEqualTo(409);
        assertThat(finish(jobId).state()).isEqualTo("SUCCEEDED");assertThat(rest.getForEntity("/api/v1/shopify/sync/jobs/"+jobId,JsonNode.class).getBody().path("job").path("state").asText()).isEqualTo("SUCCEEDED");assertThat(rest.getForEntity("/api/v1/shopify/sync/jobs?page=0&size=20",JsonNode.class).getBody()).hasSize(1);
        UUID product=jdbc.queryForObject("SELECT id FROM products",UUID.class);assertThat(rest.getForEntity("/api/v1/products/"+product,JsonNode.class).getBody().path("variants").get(0).path("costPrice").isNull()).isTrue();
        JsonNode saved=rest.getForEntity("/api/v1/products/"+product,JsonNode.class).getBody().path("variants").get(0);UUID imported=UUID.fromString(saved.path("id").asText());
        var edit=Map.of("sku",saved.path("sku").asText(),"name",saved.path("name").asText(),"costPrice","4","currentPrice","10","minPrice","5","maxPrice","15","status","ACTIVE","version",saved.path("version").asLong());
        assertThat(rest.exchange("/api/v1/products/"+product+"/variants/"+imported,org.springframework.http.HttpMethod.PUT,new org.springframework.http.HttpEntity<>(edit),JsonNode.class).getStatusCode().value()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT unit_cost FROM sales_order_items",BigDecimal.class)).isNull();assertThat(jdbc.queryForObject("SELECT source FROM variant_cost_history WHERE quality='VERIFIED_CHANGE'",String.class)).isEqualTo("MANUAL");
        assertThat(finish(start(100).id()).errorCode()).isEqualTo("LOCAL_EDIT_CONFLICT");assertThat(jdbc.queryForObject("SELECT cost_price FROM product_variants",BigDecimal.class)).isEqualByComparingTo("4");
        assertThat(rest.getForEntity("/api/v1/onboarding/readiness/variants/"+imported,JsonNode.class).getBody().path("assessment").path("inputs").path("localEditConflict").asBoolean()).isTrue();
        jdbc.update("UPDATE shopify_connection SET status='DISCONNECTED',encrypted_access_token=NULL,encrypted_refresh_token=NULL");assertThat(rest.postForEntity("/api/v1/shopify/sync",new SyncCoordinator.Start("INITIAL",now.minus(Duration.ofDays(7)),now,100,null),String.class).getStatusCode().value()).isEqualTo(409);
        assertThat(count("products")).isEqualTo(1);
    }
    @Test void catalogPaginationPreservesMissingSkuIdentityAndTruncationCannotAdvanceOrders(){
        JsonNode first=fixture.path("catalog").deepCopy(),second=fixture.path("catalog").deepCopy();
        ((ObjectNode)first.path("productVariants").path("pageInfo")).put("hasNextPage",true).put("endCursor","page-1");
        var variant=(ObjectNode)second.path("productVariants").path("nodes").get(0);variant.put("id","gid://shopify/ProductVariant/502");((ObjectNode)variant.path("inventoryItem")).put("id","gid://shopify/InventoryItem/52");
        when(graph.query(anyString(),anyString(),eq(SyncQueries.CATALOG),anyMap())).thenAnswer(i->{Map<String,Object> args=i.getArgument(3);return (args.get("after")==null?first:second).deepCopy();});
        ((ObjectNode)fixture.path("orders").path("orders").path("nodes").get(0).path("lineItems").path("pageInfo")).put("hasNextPage",true);
        var job=finish(start(100).id());assertThat(job.errorCode()).isEqualTo("NESTED_RESOURCE_LIMIT_REACHED");assertThat(count("product_variants")).isEqualTo(2);assertThat(jdbc.queryForObject("SELECT count(DISTINCT sku) FROM product_variants",Long.class)).isEqualTo(2);assertThat(count("sales_orders")).isZero();assertThat(repository.checkpoints(job.id()).get(1).complete()).isFalse();
        ((ObjectNode)fixture.path("orders").path("orders").path("nodes").get(0).path("lineItems").path("pageInfo")).put("hasNextPage",false);sync.start(new SyncCoordinator.Start(null,null,null,null,job.id()));assertThat(finish(job.id()).state()).isEqualTo("SUCCEEDED");
    }
    @Test void cancelledTestPendingAndRemovedVariantOrdersHaveConservativeAccounting(){
        var order=(ObjectNode)fixture.path("orders").path("orders").path("nodes").get(0);order.put("cancelledAt",now.minus(Duration.ofDays(2)).toString());
        assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");assertThat(jdbc.queryForObject("SELECT status FROM sales_orders",String.class)).isEqualTo("CANCELLED");assertThat(count("sales_refunds")).isZero();
        jdbc.update("DELETE FROM shopify_source_mapping WHERE resource IN ('ORDER','LINE','REFUND')");jdbc.execute("TRUNCATE sales_orders CASCADE");order.putNull("cancelledAt");order.put("test",true);assertThat(finish(start(100).id()).warnings()).contains("TEST_ORDER_EXCLUDED");assertThat(count("sales_orders")).isZero();
        order.put("test",false);order.put("displayFinancialStatus","PENDING");assertThat(finish(start(100).id()).warnings()).contains("UNSETTLED_ORDER_DEFERRED");assertThat(count("sales_orders")).isZero();
        order.put("displayFinancialStatus","PAID");((ObjectNode)order.path("lineItems").path("nodes").get(0)).putNull("variant");assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");assertThat(count("sales_orders")).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT count(*) FROM product_variants WHERE status='ARCHIVED' AND current_price=0 AND cost_price IS NULL",Long.class)).isEqualTo(1);
    }
    @Test void negativeInventoryRemainsProvenanceWithoutInventingZeroAndUnavailableCostsStayUnknown(){
        ((ObjectNode)fixture.path("catalog").path("productVariants").path("nodes").get(0)).put("price","0.50");
        ((ObjectNode)fixture.path("catalog").path("productVariants").path("nodes").get(0).path("product")).put("title","A");((ObjectNode)fixture.path("catalog").path("productVariants").path("nodes").get(0)).putNull("sku");
        ((ObjectNode)fixture.path("inventory").path("inventoryItem").path("inventoryLevels").path("nodes").get(0).path("quantities").get(0)).put("quantity",-2);
        var job=finish(start(100).id());assertThat(job.state()).isEqualTo("SUCCEEDED");assertThat(job.warnings()).contains("INVENTORY_NEGATIVE_OR_UNKNOWN_NOT_AGGREGATED","COST_UNAVAILABLE");assertThat(count("inventory_snapshots")).isZero();assertThat(jdbc.queryForObject("SELECT min(available) FROM shopify_inventory_location",Integer.class)).isEqualTo(-2);
        assertThat(jdbc.queryForObject("SELECT max_price FROM product_variants",BigDecimal.class)).isEqualByComparingTo("0.50");
        assertThat(jdbc.queryForObject("SELECT name FROM products",String.class)).isEqualTo("Shopify A");assertThat(jdbc.queryForObject("SELECT source_sku FROM shopify_source_mapping WHERE resource='VARIANT'",String.class)).isEmpty();
    }
    @Test void readFailureDoesNotCommitAnyPageAndRunningJobsAreRestartRecoverable(){
        when(graph.query(anyString(),anyString(),eq(SyncQueries.CATALOG),anyMap())).thenThrow(new SyncFailure("SHOPIFY_RETRY_EXHAUSTED"));var job=finish(start(100).id());assertThat(job.state()).isEqualTo("FAILED");assertThat(count("products")).isZero();assertThat(repository.checkpoints(job.id()).getFirst().cursor()).isNull();
        when(graph.query(anyString(),anyString(),eq(SyncQueries.CATALOG),anyMap())).thenAnswer(i->fixture.path("catalog").deepCopy());sync.start(new SyncCoordinator.Start(null,null,null,null,job.id()));repository.running(job.id());assertThat(finish(job.id()).state()).isEqualTo("SUCCEEDED");assertThat(count("sales_orders")).isEqualTo(1);
    }
    @Test void removedCatalogVariantArchivesWithoutBreakingHistoryAndCanReappear()throws Exception{
        assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");
        JsonNode empty=fixture.path("catalog").deepCopy();((ArrayNode)empty.path("productVariants").path("nodes")).removeAll();
        when(graph.query(anyString(),anyString(),eq(SyncQueries.CATALOG),anyMap())).thenAnswer(i->empty.deepCopy());assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");assertThat(jdbc.queryForObject("SELECT status FROM product_variants",String.class)).isEqualTo("ARCHIVED");assertThat(count("sales_order_items")).isEqualTo(1);
        when(graph.query(anyString(),anyString(),eq(SyncQueries.CATALOG),anyMap())).thenAnswer(i->fixture.path("catalog").deepCopy());assertThat(finish(start(100).id()).state()).isEqualTo("SUCCEEDED");assertThat(jdbc.queryForObject("SELECT status FROM product_variants",String.class)).isEqualTo("ACTIVE");assertThat(count("sales_orders")).isEqualTo(1);
        when(graph.query(anyString(),anyString(),eq(SyncQueries.CATALOG),anyMap())).thenAnswer(i->empty.deepCopy());
        var concurrentJob=start(100);
        try(var manual=java.sql.DriverManager.getConnection(database.getJdbcUrl(),database.getUsername(),database.getPassword());var statement=manual.createStatement()){
            manual.setAutoCommit(false);statement.executeUpdate("UPDATE product_variants SET name='Concurrent local edit',version=version+1");
            var importer=java.util.concurrent.CompletableFuture.runAsync(sync::runOne);boolean blocked=false;
            for(int attempt=0;attempt<100&&!blocked;attempt++){blocked=jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'UPDATE product_variants SET status=%'",Integer.class)>0;if(!blocked)Thread.sleep(50);}
            manual.commit();assertThat(blocked).as("Importer reached the version-checked archival write while a local edit held the row").isTrue();importer.get(10,java.util.concurrent.TimeUnit.SECONDS);
        }
        assertThat(repository.job(concurrentJob.id()).errorCode()).isEqualTo("LOCAL_EDIT_CONFLICT");assertThat(jdbc.queryForObject("SELECT name FROM product_variants",String.class)).isEqualTo("Concurrent local edit");assertThat(jdbc.queryForObject("SELECT status FROM product_variants",String.class)).isEqualTo("ACTIVE");
    }
}
