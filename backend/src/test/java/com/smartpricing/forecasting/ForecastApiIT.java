package com.smartpricing.forecasting;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartpricing.forecasting.repository.DemandRepository;
import com.smartpricing.forecasting.service.DemandModel;
import java.util.*;
import java.time.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class ForecastApiIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;@Autowired JdbcTemplate jdbc;@Autowired DemandRepository repository;@Autowired DemandModel model;
    String product,variant;
    @BeforeEach void prepare(){com.smartpricing.auth.TestHttp.authenticate(rest,jdbc);jdbc.execute("TRUNCATE shopify_order_metadata,sales_refunds,sales_order_items,sales_orders,variant_price_history,variant_cost_history,inventory_snapshots,product_variants,products,categories");product=post("/products",Map.of("name","Demand fixture")).path("id").asText();variant=post("/products/"+product+"/variants",Map.of("name","Standard","sku","DEMAND-TEST","costPrice","1","currentPrice","10","minPrice","1","maxPrice","100","status","ACTIVE")).path("id").asText();}
    JsonNode post(String path,Object body){var r=rest.postForEntity("/api/v1"+path,body,JsonNode.class);assertThat(r.getStatusCode().value()).as(r.toString()).isEqualTo(201);return r.getBody();}
    JsonNode get(String path){var r=rest.getForEntity("/api/v1/forecasting"+path,JsonNode.class);assertThat(r.getStatusCode().value()).as(r.toString()).isEqualTo(200);return r.getBody();}
    String range="?startDate=2025-01-01&endDate=2025-03-01";
    void stock(String date,int qty,String ref,String quality){post("/products/variants/"+variant+"/inventory-history",Map.of("source","MANUAL","externalReference",ref,"observedAt",date,"quantityAvailable",qty,"quality",quality));}
    void listed(String from,String to,String amount,String ref){var b=new HashMap<String,Object>(Map.of("source","MANUAL","externalReference",ref,"validFrom",from,"amount",amount,"currencyCode","MAD","quality","VERIFIED_CHANGE"));if(to!=null)b.put("validTo",to);else b.put("variantVersion",jdbc.queryForObject("SELECT version FROM product_variants WHERE id=?",Long.class,UUID.fromString(variant)));post("/products/variants/"+variant+"/price-history",b);}
    JsonNode order(String date,String ref,String status){return post("/sales/orders",Map.of("source","MANUAL","externalReference",ref,"placedAt",date,"status",status,"currencyCode","MAD","lines",List.of(Map.of("variantId",variant,"quantity",2,"unitPrice","10","discountAmount","2"),Map.of("variantId",variant,"quantity",1,"unitPrice","12","discountAmount","0"))));}
    @Test void dailyUnitsRefundPriceInventoryAndMissingDaysAreAligned(){
        listed("2025-01-01T00:00:00Z","2025-02-01T00:00:00Z","10","past");listed("2025-02-01T00:00:00Z",null,"20","later");
        stock("2025-01-01T00:00:00Z",100,"known","SNAPSHOT");stock("2025-01-04T00:00:00Z",0,"zero","SNAPSHOT");stock("2025-01-05T00:00:00Z",1,"cap","SNAPSHOT");stock("2025-01-06T00:00:00Z",100,"uncertain","INFERRED");
        var sale=order("2025-01-01T23:59:59Z","sale","COMPLETED");order("2025-01-01T12:00:00Z","second","COMPLETED");order("2025-01-01T10:00:00Z","ignored","UNPAID");
        var line=sale.path("lines").get(0);post("/sales/orders/"+sale.path("order").path("id").asText()+"/refunds",Map.of("source","MANUAL","externalReference","returned","refundedAt","2025-02-01T00:00:00Z","kind","LINE_RETURN","itemId",line.path("id").asText(),"quantity",1,"amount","1","currencyCode","MAD"));
        order("2025-01-05T12:00:00Z","cap-sales","COMPLETED");
        var days=repository.series(List.of(UUID.fromString(variant)),LocalDate.of(2025,1,1),LocalDate.of(2025,3,1)).get(UUID.fromString(variant));
        assertThat(days).hasSize(59);assertThat(days.get(0).units()).isEqualTo(6);assertThat(days.get(0).effectivePrice()).isEqualTo("10.0000");
        assertThat(days.get(0).returnedUnits()).isZero();assertThat(days.get(31).returnedUnits()).isEqualTo(1);assertThat(days.get(31).listedPrice()).isEqualTo("20.0000");
        assertThat(days.get(2).availability()).isEqualTo("UNKNOWN");assertThat(days.get(3).availability()).isEqualTo("STOCKOUT");assertThat(days.get(4).censored()).isTrue();assertThat(days.get(5).availability()).isEqualTo("UNKNOWN");
        var json=get("/variants/"+variant+"/demand"+range);assertThat(json.path("forecast").path("reasons").toString()).contains("CURRENTLY_ARCHIVED");
        assertThat(json.toString()).doesNotContain("NaN","Infinity");assertThat(get("/overview"+range+"&search=DEMAND").path("results").path("totalElements").asInt()).isEqualTo(1);
    }
    @Test void futurePersistedEventsCannotChangeEarlierForecastAndArchivedHistoryRemains(){
        listed("2025-01-01T00:00:00Z",null,"10","open");
        for(LocalDate d=LocalDate.of(2025,1,1);d.isBefore(LocalDate.of(2025,3,1));d=d.plusDays(1)){stock(d+"T00:00:00Z",100,d.toString(),"SNAPSHOT");order(d+"T12:00:00Z",d.toString(),"COMPLETED");}
        var id=UUID.fromString(variant);var start=LocalDate.of(2025,1,1);var cutoff=LocalDate.of(2025,3,1);
        var before=model.forecast(repository.series(List.of(id),start,cutoff).get(id),cutoff,7,false);
        listed("2025-03-01T00:00:00Z",null,"90","future-price");stock("2025-03-01T00:00:00Z",0,"future-stock","SNAPSHOT");order("2025-03-02T12:00:00Z","future-sale","COMPLETED");
        var after=model.forecast(repository.series(List.of(id),start,cutoff).get(id),cutoff,7,false);assertThat(after).isEqualTo(before);
        assertThat(before.assumedPrice()).isEqualTo("10.0000");assertThat(before.daily()).hasSize(7);
        rest.delete("/api/v1/products/"+product+"/variants/"+variant);
        assertThat(get("/variants/"+variant+"/demand"+range).path("history").size()).isEqualTo(59);
    }
    @Test void emptyNormalAndInvalidInputsNeverFabricateForecast(){
        jdbc.execute("TRUNCATE product_variants,products CASCADE");assertThat(get("/overview"+range).path("results").path("content").isEmpty()).isTrue();
        for(String path:List.of("/overview?startDate=bad&endDate=2026-01-01","/overview?startDate=2025-01-01&endDate=2025-01-02","/overview"+range+"&size=11","/overview"+range+"&page=-1","/variants/"+variant+"/demand"+range+"&horizonDays=8"))assertThat(rest.getForEntity("/api/v1/forecasting"+path,JsonNode.class).getStatusCode().value()).as(path).isEqualTo(400);
        assertThat(rest.getForEntity("/api/v1/forecasting/variants/"+variant+"/readiness"+range,JsonNode.class).getStatusCode().value()).isEqualTo(404);
    }
}
