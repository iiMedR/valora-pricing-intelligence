package com.smartpricing.onboarding;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartpricing.auth.TestHttp;
import com.smartpricing.shopify.TokenCipher;
import com.smartpricing.shopify.sync.SyncRepository;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"app.shopify.enabled=true","app.shopify.client-id=ephemeral-id","app.shopify.client-secret=ephemeral-secret","app.shopify.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","app.shopify.public-base-url=https://example.test","server.servlet.session.cookie.secure=true","app.shopify.sync.worker-enabled=false"})
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class OnboardingIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;@Autowired JdbcTemplate jdbc;@Autowired TokenCipher cipher;@Autowired SyncRepository jobs;
    static final String SHOP="fixture-shop.myshopify.com";UUID product,variant;
    @BeforeEach void prepare(){
        jdbc.execute("TRUNCATE shopify_source_mapping,shopify_sync_job,shopify_sync_watermark,shopify_inventory_location,sales_orders,products CASCADE");
        jdbc.update("UPDATE shopify_connection SET status='DISCONNECTED',shop_domain=NULL,encrypted_access_token=NULL,encrypted_refresh_token=NULL,scopes=NULL,generation=1 WHERE id=1");TestHttp.authenticate(rest,jdbc);
    }
    JsonNode get(String path){var response=rest.getForEntity("/api/v1/onboarding"+path,JsonNode.class);assertThat(response.getStatusCode().value()).as(response.toString()).isEqualTo(200);return response.getBody();}
    void variant(BigDecimal cost){product=UUID.randomUUID();variant=UUID.randomUUID();jdbc.update("INSERT INTO products(id,name,status) VALUES(?,'Readiness fixture','ACTIVE')",product);jdbc.update("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price,status) VALUES(?,?,'READY-1','Fixture',?,10,5,20,'ACTIVE')",variant,product,cost);}
    void connected(){jdbc.update("UPDATE shopify_connection SET status='CONNECTED',shop_domain=?,scopes='read_inventory,read_locations,read_orders,read_products',encrypted_access_token=?,encrypted_refresh_token=?,access_expires_at=CURRENT_TIMESTAMP+INTERVAL '1 hour'",SHOP,cipher.seal("ephemeral-access",SHOP+":access"),cipher.seal("ephemeral-refresh",SHOP+":refresh"));}
    @Test void emptyDisconnectedReturnsUsefulGuidanceAndNoSideEffects(){
        var summary=get("/summary");assertThat(summary.path("workflowState").asText()).isEqualTo("NOT_CONNECTED");assertThat(summary.path("counts").path("variants").asInt()).isZero();assertThat(summary.toString()).doesNotContain("encrypted","ephemeral-access","refresh_token");
        assertThat(get("/readiness/variants").path("results").path("content").isEmpty()).isTrue();assertThat(jdbc.queryForObject("SELECT count(*) FROM shopify_sync_job",Long.class)).isZero();
    }
    @Test void missingCostStaleInventorySparseHistoryAndArchiveRemainSeparateFromEligibility(){
        variant(null);jdbc.update("INSERT INTO inventory_snapshots(id,variant_id,observed_at,quantity_available,source,quality,external_reference,payload_hash) VALUES(?,?,CURRENT_TIMESTAMP-INTERVAL '2 days',0,'MANUAL','SNAPSHOT','stale',repeat('a',64))",UUID.randomUUID(),variant);
        var detail=get("/readiness/variants/"+variant).path("assessment");assertThat(detail.path("dimensions").path("current_cost").path("status").asText()).isEqualTo("MISSING");assertThat(detail.path("inputs").path("currentCost").isNull()).isTrue();assertThat(detail.path("dimensions").path("inventory").path("status").asText()).isEqualTo("STALE");assertThat(detail.path("analytics").path("status").asText()).isEqualTo("MISSING");assertThat(detail.path("optimizationStatus").asText()).isNotEqualTo("ACTIONABLE");assertThat(detail.path("demandDiagnostics").path("reasons").toString()).contains("INSUFFICIENT_DISTINCT_PRICES");
        jdbc.update("UPDATE product_variants SET status='ARCHIVED',version=version+1 WHERE id=?",variant);assertThat(get("/readiness/variants/"+variant).path("assessment").path("optimizationStatus").asText()).isEqualTo("INACTIVE_VARIANT");
    }
    @Test void workflowReportsPendingFailedAndCompletedButNeverCertifiesModels(){
        connected();assertThat(get("/summary").path("workflowState").asText()).isEqualTo("CONNECTED_NOT_SYNCED");UUID id=UUID.randomUUID();jobs.create(id,SHOP,1,"INITIAL",Instant.now().minus(Duration.ofDays(7)),Instant.now(),100);
        assertThat(get("/summary").path("workflowState").asText()).isEqualTo("SYNC_RUNNING");jdbc.update("UPDATE shopify_sync_job SET state='PARTIAL',error_code='SHOPIFY_RETRY_EXHAUSTED' WHERE id=?",id);assertThat(get("/summary").path("workflowState").asText()).isEqualTo("SYNC_FAILED");
        jdbc.update("UPDATE shopify_sync_job SET state='SUCCEEDED',error_code=NULL WHERE id=?",id);assertThat(get("/summary").path("workflowState").asText()).isEqualTo("SYNC_COMPLETED_NEEDS_REVIEW");assertThat(get("/summary").path("synchronization").path("latest").path("state").asText()).isEqualTo("SUCCEEDED");
    }
    @Test void pagingFiltersAndShopScopeDoNotLeakOtherStoreMappings(){
        variant(null);connected();UUID otherProduct=UUID.randomUUID(),otherVariant=UUID.randomUUID();jdbc.update("INSERT INTO products(id,name) VALUES(?,'Other store')",otherProduct);jdbc.update("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price) VALUES(?,?,'OTHER','Other',1,10,5,15)",otherVariant,otherProduct);
        jobs.map("other-shop.myshopify.com","VARIANT","gid://shopify/ProductVariant/other",otherVariant,"fixture",0L,null,null,Instant.now());
        jobs.map("other-shop.myshopify.com","PRODUCT","gid://shopify/Product/other",otherProduct,"fixture",0L,null,null,Instant.now());
        jdbc.update("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price) VALUES(?,?,'OTHER-MANUAL','Unmapped child',1,10,5,15)",UUID.randomUUID(),otherProduct);
        assertThat(get("/readiness/variants?size=1&status=MISSING_COST").path("results").path("totalElements").asInt()).isEqualTo(1);assertThat(get("/readiness/variants?size=1&page=1").path("results").path("content").isEmpty()).isTrue();assertThat(get("/readiness/variants?search=OTHER").path("results").path("totalElements").asInt()).isZero();assertThat(rest.getForEntity("/api/v1/onboarding/readiness/variants/"+otherVariant,JsonNode.class).getStatusCode().value()).isEqualTo(404);
        jobs.map(SHOP,"PRODUCT","gid://shopify/Product/current",product,"fixture",0L,null,null,Instant.now());jdbc.update("UPDATE products SET version=version+1 WHERE id=?",product);assertThat(get("/readiness/variants/"+variant).path("assessment").path("inputs").path("localEditConflict").asBoolean()).isTrue();
    }
    @Test void mappingConflictAndStockoutExplainTruthWithoutMutatingRecords(){
        variant(new BigDecimal("25"));connected();jobs.map(SHOP,"VARIANT","gid://shopify/ProductVariant/1",variant,"fixture",0L,null,"",Instant.now());jdbc.update("UPDATE product_variants SET version=version+1 WHERE id=?",variant);
        jdbc.update("INSERT INTO inventory_snapshots(id,variant_id,observed_at,quantity_available,source,quality,external_reference,payload_hash) VALUES(?,?,CURRENT_TIMESTAMP,0,'SHOPIFY','SNAPSHOT','current-zero',repeat('a',64))",UUID.randomUUID(),variant);
        var before=jdbc.queryForMap("SELECT * FROM product_variants WHERE id=?",variant);var first=get("/readiness/variants/"+variant).path("assessment");assertThat(first.path("dimensions").path("mapping").path("status").asText()).isEqualTo("CONFLICTING");assertThat(first.path("dimensions").path("constraints").path("code").asText()).isEqualTo("COST_AT_OR_ABOVE_MAXIMUM");assertThat(first.path("dimensions").path("inventory").path("code").asText()).isEqualTo("CURRENT_STOCKOUT");get("/summary");get("/readiness/variants");assertThat(jdbc.queryForMap("SELECT * FROM product_variants WHERE id=?",variant)).isEqualTo(before);assertThat(jdbc.queryForObject("SELECT count(*) FROM shopify_sync_job",Long.class)).isZero();
    }
    @Test void invalidParametersAndUnauthorizedRequestsFailClosed(){
        for(String path:List.of("?size=11","?page=-1","?status=ACTIONABLE","?search="+"x".repeat(101),"?startDate=2026-01-01&endDate=2025-01-01"))assertThat(rest.getForEntity("/api/v1/onboarding/readiness/variants"+path,JsonNode.class).getStatusCode().value()).isEqualTo(400);
        var anonymous=new org.springframework.web.client.RestTemplate();assertThatThrownBy(()->anonymous.getForEntity(rest.getRootUri()+"/api/v1/onboarding/summary",String.class)).isInstanceOf(org.springframework.web.client.HttpClientErrorException.Unauthorized.class);
    }
    @Test void refundOnlyWindowCanBeObservableWithoutInventingDemandOrCost(){
        variant(null);UUID order=UUID.randomUUID(),item=UUID.randomUUID();
        jdbc.update("INSERT INTO sales_orders(id,source,external_reference,payload_hash,placed_at,status,currency_code,subtotal,discount_amount,shipping_amount,tax_amount) VALUES(?,'MANUAL','refund-origin',repeat('a',64),CURRENT_TIMESTAMP-INTERVAL '40 days','COMPLETED','MAD',10,0,0,0)",order);
        jdbc.update("INSERT INTO sales_order_items(id,order_id,variant_id,sku_snapshot,name_snapshot,quantity,currency_code,unit_price,discount_amount,line_net,cost_provenance) VALUES(?,?,?,'READY-1','Fixture',1,'MAD',10,0,10,'UNKNOWN')",item,order,variant);
        jdbc.update("INSERT INTO sales_refunds(id,order_id,item_id,source,external_reference,payload_hash,refunded_at,kind,quantity,amount,currency_code) VALUES(?,?,?,'MANUAL','financial-refund',repeat('a',64),CURRENT_TIMESTAMP-INTERVAL '1 day','FINANCIAL_ADJUSTMENT',0,2,'MAD')",UUID.randomUUID(),order,item);
        String range="?startDate="+LocalDate.now(ZoneOffset.UTC).minusDays(28)+"&endDate="+LocalDate.now(ZoneOffset.UTC);
        var row=get("/readiness/variants/"+variant+range).path("assessment");assertThat(row.path("coverage").path("lines").asInt()).isZero();assertThat(row.path("coverage").path("merchandiseRefunds").asInt()).isEqualTo(1);assertThat(row.path("analytics").path("status").asText()).isEqualTo("AVAILABLE");assertThat(row.path("inputs").path("currentCost").isNull()).isTrue();assertThat(row.path("optimizationStatus").asText()).isNotEqualTo("ACTIONABLE");
    }
}
