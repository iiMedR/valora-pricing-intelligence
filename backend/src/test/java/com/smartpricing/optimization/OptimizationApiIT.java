package com.smartpricing.optimization;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class OptimizationApiIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;@Autowired JdbcTemplate jdbc;
    String product,variant;final String range="?startDate=2025-01-01&endDate=2026-01-01";
    @BeforeEach void prepare(){com.smartpricing.auth.TestHttp.authenticate(rest,jdbc);jdbc.execute("TRUNCATE shopify_order_metadata,sales_refunds,sales_order_items,sales_orders,variant_price_history,variant_cost_history,inventory_snapshots,product_variants,products,categories");product=post("/products",Map.of("name","Independent price fixture")).path("id").asText();variant=post("/products/"+product+"/variants",Map.of("name","Standard","sku","INDEPENDENT","costPrice","999","currentPrice","100","minPrice","50","maxPrice","150","status","ACTIVE")).path("id").asText();var activate=rest.exchange("/api/v1/products/"+product,HttpMethod.PUT,new HttpEntity<>(Map.of("name","Independent price fixture","status","ACTIVE","version",0)),JsonNode.class);assertThat(activate.getStatusCode().value()).isEqualTo(200);}
    JsonNode post(String path,Object body){var response=rest.postForEntity("/api/v1"+path,body,JsonNode.class);assertThat(response.getStatusCode().value()).as(response.toString()).isEqualTo(201);return response.getBody();}
    JsonNode get(String path){var response=rest.getForEntity("/api/v1/optimization"+path,JsonNode.class);assertThat(response.getStatusCode().value()).as(response.toString()).isEqualTo(200);return response.getBody();}
    void fixture(){
        // Test-only immutable financial fixtures, with independently cycling prices then a constant recent reference.
        String days="WITH days AS (SELECT d::date AS day,CASE WHEN d::date>='2025-09-01' THEN 100 ELSE CASE extract(doy FROM d)::int%3 WHEN 0 THEN 80 WHEN 1 THEN 100 ELSE 120 END END::numeric price FROM generate_series(timestamp '2025-01-01',timestamp '2025-12-31',interval '1 day') d) ";
        jdbc.update(days+"INSERT INTO sales_orders(id,source,external_reference,payload_hash,placed_at,status,currency_code,subtotal,discount_amount,shipping_amount,tax_amount) SELECT md5(day::text)::uuid,'MANUAL','sale:'||day,repeat('a',64),(day::timestamp AT TIME ZONE 'UTC')+interval '12 hours','COMPLETED','MAD',round(1000000/(price*price))*price,0,0,0 FROM days");
        jdbc.update(days+"INSERT INTO sales_order_items(id,order_id,variant_id,sku_snapshot,name_snapshot,quantity,currency_code,unit_price,discount_amount,line_net,unit_cost,cost_provenance) SELECT md5('line:'||day)::uuid,md5(day::text)::uuid,?,'INDEPENDENT','Standard',round(1000000/(price*price))::int,'MAD',price,0,round(1000000/(price*price))*price,40,'PROVIDED' FROM days",UUID.fromString(variant));
        jdbc.update(days+"INSERT INTO variant_price_history(id,variant_id,amount,currency_code,valid_from,valid_to,source,quality,external_reference,payload_hash) SELECT md5('price:'||day)::uuid,?,price,'MAD',day::timestamp AT TIME ZONE 'UTC',CASE WHEN day=date '2025-12-31' THEN NULL ELSE (day+1)::timestamp AT TIME ZONE 'UTC' END,'MANUAL','VERIFIED_CHANGE','price:'||day,repeat('a',64) FROM days",UUID.fromString(variant));
        jdbc.update(days+"INSERT INTO inventory_snapshots(id,variant_id,observed_at,quantity_available,source,quality,external_reference,payload_hash) SELECT md5('stock:'||day)::uuid,?,day::timestamp AT TIME ZONE 'UTC',10000,'MANUAL','SNAPSHOT','stock:'||day,repeat('a',64) FROM days",UUID.fromString(variant));
        post("/products/variants/"+variant+"/cost-history",Map.of("source","MANUAL","externalReference","cost","quality","VERIFIED_CHANGE","amount","40","currencyCode","MAD","validFrom","2025-10-01T00:00:00Z","validTo","2026-01-01T00:00:00Z"));
    }
    @Test void actionableRequiresIndependentEvidenceAndGetIsDeterministicReadOnly(){fixture();var before=jdbc.queryForMap("SELECT current_price,cost_price,version FROM product_variants WHERE id=?",UUID.fromString(variant));
        var first=get("/variants/"+variant+"/recommendation"+range);assertThat(first.path("status").asText()).as(first.toPrettyString()).isEqualTo("ACTIONABLE");assertThat(first.path("recommendedPrice").asText()).isEqualTo("90.0000");assertThat(first.path("inputs").path("unitCost").asText()).isEqualTo("40.0000");assertThat(first.path("sensitivity").size()).isEqualTo(21);
        assertThat(get("/variants/"+variant+"/recommendation"+range)).isEqualTo(first);assertThat(get("/variants/"+variant+"/sensitivity"+range)).isEqualTo(first);
        assertThat(jdbc.queryForMap("SELECT current_price,cost_price,version FROM product_variants WHERE id=?",UUID.fromString(variant))).isEqualTo(before);assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders",Integer.class)).isEqualTo(365);
        var page=get("/overview"+range+"&search=INDEPENDENT&size=1");assertThat(page.path("countScope").asText()).isEqualTo("CURRENT_PAGE");assertThat(page.path("statusCounts").path("ACTIONABLE").asInt()).isEqualTo(1);assertThat(page.path("results").path("totalElements").asInt()).isEqualTo(1);
        assertThat(get("/overview"+range+"&page=1&size=1").path("results").path("content").isEmpty()).isTrue();
        var readiness=rest.getForEntity("/api/v1/onboarding/readiness/variants/"+variant+range,JsonNode.class);assertThat(readiness.getStatusCode().value()).isEqualTo(200);var assessment=readiness.getBody().path("assessment");assertThat(assessment.path("optimizationStatus").asText()).isEqualTo(first.path("status").asText());assertThat(assessment.path("optimizationReasons")).isEqualTo(first.path("reasons"));assertThat(assessment.path("forecasting").path("status").asText()).isEqualTo("AVAILABLE");assertThat(assessment.path("analytics").path("status").asText()).isEqualTo("AVAILABLE");assertThat(assessment.has("recommendedPrice")).isFalse();
    }
    @Test void missingOrExpiredCostsNeverFallBackToCatalogAndArchiveRetainsHistory(){fixture();
        var later=get("/variants/"+variant+"/recommendation?startDate=2025-02-01&endDate=2026-02-01");assertThat(later.path("status").asText()).isEqualTo("MISSING_COST");assertThat(later.path("inputs").path("unitCost").isNull()).isTrue();assertThat(later.path("recommendedPrice").isNull()).isTrue();assertThat(later.path("comparison").isNull()).isTrue();
        rest.delete("/api/v1/products/"+product+"/variants/"+variant);var archived=get("/variants/"+variant+"/recommendation"+range);assertThat(archived.path("status").asText()).isEqualTo("INACTIVE_VARIANT");assertThat(archived.path("recommendedPrice").isNull()).isTrue();assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_order_items",Integer.class)).isEqualTo(365);
    }
    @Test void explicitAuditIsDeduplicatedImmutableAndSeparateFromBusinessOutcomes(){fixture();
        String path="/api/v1/optimization/variants/"+variant+"/evaluations"+range;
        var saved=rest.postForEntity(path,null,JsonNode.class);assertThat(saved.getStatusCode().value()).isEqualTo(200);
        var snapshot=saved.getBody();assertThat(snapshot.path("outcomeStatus").asText()).isEqualTo("NOT_MEASURED");assertThat(snapshot.path("result").path("recommendedPrice").asText()).isEqualTo("90.0000");
        assertThat(snapshot.path("fingerprint").asText()).hasSize(64);assertThat(snapshot.toString()).doesNotContain("password","accessToken","clientSecret");
        assertThat(rest.postForEntity(path,null,JsonNode.class).getBody()).isEqualTo(snapshot);
        var history=get("/variants/"+variant+"/evaluations");assertThat(history.path("totalElements").asInt()).isEqualTo(1);assertThat(history.path("content").get(0)).isEqualTo(snapshot);
        get("/variants/"+variant+"/recommendation"+range);assertThat(get("/variants/"+variant+"/evaluations").path("totalElements").asInt()).isEqualTo(1);
        assertThat(rest.postForEntity(path+"&horizonDays=14",null,JsonNode.class).getStatusCode().value()).isEqualTo(200);
        assertThat(get("/variants/"+variant+"/evaluations?size=1&page=1").path("content").size()).isEqualTo(1);
        assertThatThrownBy(()->jdbc.update("UPDATE model_evaluation_audit SET model_version='tampered' WHERE id=?",UUID.fromString(snapshot.path("id").asText()))).hasMessageContaining("append-only");
        assertThatThrownBy(()->jdbc.update("DELETE FROM model_evaluation_audit WHERE id=?",UUID.fromString(snapshot.path("id").asText()))).hasMessageContaining("append-only");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders",Integer.class)).isEqualTo(365);
    }
    @Test void auditRequiresSessionAndCsrfAndValidBoundedHistory(){
        var anonymous=new org.springframework.web.client.RestTemplate();String path=rest.getRootUri()+"/api/v1/optimization/variants/"+variant+"/evaluations";
        assertThatThrownBy(()->anonymous.getForEntity(path,String.class)).isInstanceOf(org.springframework.web.client.HttpClientErrorException.Unauthorized.class);
        assertThatThrownBy(()->anonymous.postForEntity(path,null,String.class)).isInstanceOf(org.springframework.web.client.HttpClientErrorException.Forbidden.class);
        rest.getRestTemplate().getInterceptors().add((request,body,execution)->{request.getHeaders().remove("X-XSRF-TOKEN");return execution.execute(request,body);});
        assertThat(rest.postForEntity("/api/v1/optimization/variants/"+variant+"/evaluations"+range,null,JsonNode.class).getStatusCode().value()).isEqualTo(403);
        assertThat(rest.getForEntity("/api/v1/optimization/variants/"+variant+"/evaluations?size=11",JsonNode.class).getStatusCode().value()).isEqualTo(400);
    }
    @Test void emptyNormalValidationAndMissingIdsAreSafe(){jdbc.execute("TRUNCATE product_variants,products CASCADE");assertThat(get("/overview"+range).path("results").path("content").isEmpty()).isTrue();
        for(String path:List.of("/overview?startDate=bad&endDate=2026-01-01","/overview"+range+"&horizonDays=8","/overview"+range+"&size=11","/overview"+range+"&page=-1","/overview?startDate=2026-01-01&endDate=2025-01-01"))assertThat(rest.getForEntity("/api/v1/optimization"+path,JsonNode.class).getStatusCode().value()).as(path).isEqualTo(400);
        assertThat(rest.getForEntity("/api/v1/optimization/variants/"+variant+"/recommendation"+range,JsonNode.class).getStatusCode().value()).isEqualTo(404);
    }
}
