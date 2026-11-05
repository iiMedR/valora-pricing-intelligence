package com.smartpricing.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
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
class AnalyticsApiIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;
    @Autowired JdbcTemplate jdbc;
    String product,known,unknown,missing;
    @BeforeEach void setup() {
        com.smartpricing.auth.TestHttp.authenticate(rest,jdbc);
        jdbc.execute("TRUNCATE sales_refunds,sales_order_items,sales_orders,variant_price_history,variant_cost_history,inventory_snapshots,product_variants,products,categories");
        product=post("/products",Map.of("name","Analytics item")).path("id").asText();
        known=variant("KNOWN");unknown=variant("UNKNOWN");missing=variant("MISSING");
    }
    String variant(String sku) { return post("/products/"+product+"/variants",Map.of("sku",sku,"name",sku,"costPrice","99","currentPrice","10","minPrice","1","maxPrice","100","status","ACTIVE")).path("id").asText(); }
    JsonNode post(String path,Object body) { var r=rest.postForEntity("/api/v1"+path,body,JsonNode.class);assertThat(r.getStatusCode().value()).as(r.toString()).isEqualTo(201);return r.getBody(); }
    JsonNode get(String path) { var r=rest.getForEntity("/api/v1/analytics"+path,JsonNode.class);assertThat(r.getStatusCode().value()).as(r.toString()).isEqualTo(200);return r.getBody(); }
    Map<String,Object> line(String id,boolean cost) { var l=new HashMap<String,Object>(Map.of("variantId",id,"quantity",2,"unitPrice","10.1234","discountAmount","1"));if(cost)l.put("unitCost","3");return l; }
    JsonNode order(String ref,String status,String date,List<Map<String,Object>> lines) { return post("/sales/orders",Map.of("source","MANUAL","externalReference",ref,"placedAt",date,"status",status,"currencyCode","MAD","shippingAmount","2","taxAmount","1","lines",lines)); }
    void refund(String order,String item,String ref,String kind,int qty,String amount,String date) { var b=new HashMap<String,Object>(Map.of("source","MANUAL","externalReference",ref,"refundedAt",date,"kind",kind,"quantity",qty,"amount",amount,"currencyCode","MAD"));if(item!=null)b.put("itemId",item);post("/sales/orders/"+order+"/refunds",b); }
    static String range(String start,String end) { return "?startDate="+start+"&endDate="+end; }
    @Test void crossPeriodRefundsExactSnapshotsDistinctOrdersAndTrendsReconcile() {
        var sale=order("jan","COMPLETED","2025-01-31T23:59:59Z",List.of(line(known,true),line(unknown,false)));
        String id=sale.path("order").path("id").asText();String item=sale.path("lines").get(0).path("id").asText();
        // Find known line independently of UUID sort order.
        for(var l:sale.path("lines"))if(l.path("variantId").asText().equals(known))item=l.path("id").asText();
        refund(id,item,"return","LINE_RETURN",1,"5","2025-02-01T00:00:00Z");
        refund(id,item,"adjust","FINANCIAL_ADJUSTMENT",0,"1","2025-02-02T00:00:00Z");
        refund(id,null,"shipping","SHIPPING",0,"1","2025-02-02T00:00:00Z");
        order("cancelled","CANCELLED","2025-01-31T12:00:00Z",List.of(line(known,true)));
        order("unpaid","UNPAID","2025-01-31T12:00:00Z",List.of(line(known,true)));
        order("end-boundary","COMPLETED","2025-03-01T00:00:00Z",List.of(line(known,true)));
        // Current/history cost changes cannot rewrite the historical line snapshot.
        post("/products/variants/"+known+"/cost-history",Map.of("amount","80","currencyCode","MAD","validFrom","2025-02-01T00:00:00Z","source","MANUAL","quality","VERIFIED_CHANGE","externalReference","new-cost","variantVersion",0));
        rest.delete("/api/v1/products/"+product+"/variants/"+known);rest.delete("/api/v1/products/"+product);
        var jan=get("/overview"+range("2025-01-01","2025-02-01")).path("metrics");
        assertThat(jan.path("grossSales").asText()).isEqualTo("38.4936");assertThat(jan.path("orders").asInt()).isEqualTo(1);
        assertThat(jan.path("unitsSold").asInt()).isEqualTo(4);assertThat(jan.path("refundAmount").asText()).isEqualTo("0.0000");
        assertThat(jan.path("salesCostCoveragePercent").asText()).isEqualTo("50.0000");assertThat(jan.path("historicalSoldCost").asText()).isEqualTo("6.0000");
        var feb=get("/overview"+range("2025-02-01","2025-03-01")).path("metrics");
        assertThat(feb.path("netSales").asText()).isEqualTo("-6.0000");assertThat(feb.path("unitsRefunded").asInt()).isEqualTo(1);
        assertThat(feb.path("orders").asInt()).isZero();assertThat(feb.path("grossAverageOrderValue").isNull()).isTrue();
        assertThat(feb.path("knownContributionBeforeReturnRecovery").asText()).isEqualTo("-6.0000");
        var all=get("/overview"+range("2025-01-01","2025-03-01")).path("metrics");
        assertThat(all.path("netSales").asText()).isEqualTo("32.4936");assertThat(all.path("knownContributionBeforeReturnRecovery").asText()).isEqualTo("7.2468");
        for(String g:List.of("DAY","MONTH")) {
            var trend=get("/trends"+range("2025-01-01","2025-03-01")+"&granularity="+g).path("content");
            for(String field:List.of("grossSales","refundAmount","netSales","historicalSoldCost")) {
                BigDecimal sum=BigDecimal.ZERO;for(var b:trend)sum=sum.add(new BigDecimal(b.path("metrics").path(field).asText()));
                assertThat(sum).isEqualByComparingTo(all.path(field).asText());
            }
            assertThat(trend.size()).isEqualTo(g.equals("DAY")?59:2);
        }
        var row=get("/products"+range("2025-01-01","2025-03-01")).path("results").path("content").get(0);
        assertThat(row.path("status").asText()).isEqualTo("ARCHIVED");assertThat(row.path("metrics").path("netSales")).isEqualTo(all.path("netSales"));
        var variants=get("/products/"+product+"/variants"+range("2025-01-01","2025-03-01")+"&search=KNOWN&size=1").path("results");
        assertThat(variants.path("totalElements").asInt()).isEqualTo(2);assertThat(variants.path("content").size()).isEqualTo(1);
    }
    @Test void inventoryZeroUnknownUncertainStaleAndExclusiveAsOf() {
        stock(known,"2025-01-31T23:00:00Z",0,"SNAPSHOT","zero");
        stock(known,"2025-02-01T00:00:00Z",8,"SNAPSHOT","future");
        stock(unknown,"2025-01-20T00:00:00Z",0,"INFERRED","uncertain");
        var data=get("/inventory"+range("2025-01-01","2025-02-01"));
        assertThat(data.path("summary").path("stockouts").asInt()).isEqualTo(1);assertThat(data.path("summary").path("unknown").asInt()).isEqualTo(1);
        assertThat(data.path("summary").path("uncertain").asInt()).isEqualTo(1);assertThat(data.path("summary").path("stale").asInt()).isEqualTo(1);
        for(var s:data.path("results").path("content")) {
            if(s.path("sku").asText().equals("KNOWN")){assertThat(s.path("quantityAvailable").asInt()).isZero();assertThat(s.path("stale").asBoolean()).isFalse();}
            if(s.path("sku").asText().equals("MISSING")){assertThat(s.path("quantityAvailable").isNull()).isTrue();assertThat(s.path("observedAt").isNull()).isTrue();}
        }
    }
    void stock(String id,String date,int qty,String quality,String ref) {post("/products/variants/"+id+"/inventory-history",Map.of("source","MANUAL","externalReference",ref,"observedAt",date,"quantityAvailable",qty,"quality",quality));}
    @Test void emptyValidationPaginationUnknownIdsAndCurrencyFailClosed() {
        var zero=get("/overview"+range("2025-01-01","2025-02-01")).path("metrics");assertThat(zero.path("netSales").asText()).isEqualTo("0.0000");assertThat(zero.path("knownContributionBeforeReturnRecovery").isNull()).isTrue();
        for(String path:List.of("/overview?startDate=bad&endDate=2026-01-01","/overview"+range("2025-02-01","2025-01-01"),"/trends"+range("2020-01-01","2026-01-01"),"/products"+range("2025-01-01","2026-01-01")+"&sort=SQL","/products"+range("2025-01-01","2026-01-01")+"&size=101","/inventory"+range("2025-01-01","2026-01-01")+"&page=-1"))
            assertThat(rest.getForEntity("/api/v1/analytics"+path,JsonNode.class).getStatusCode().value()).as(path).isEqualTo(400);
        assertThat(rest.getForEntity("/api/v1/analytics/products/"+UUID.randomUUID()+"/variants"+range("2025-01-01","2026-01-01"),JsonNode.class).getStatusCode().value()).isEqualTo(404);
        assertThat(get("/products"+range("2025-01-01","2026-01-01")+"&search=%25").path("results").path("totalElements").asInt()).isZero();
        // A legacy incompatible business setting must never silently mix currencies.
        order("currency","COMPLETED","2025-01-15T00:00:00Z",List.of(line(known,true)));
        jdbc.update("UPDATE business_settings SET currency_code='USD' WHERE id=1");
        try {assertThat(rest.getForEntity("/api/v1/analytics/overview"+range("2025-01-01","2026-01-01"),JsonNode.class).getStatusCode().value()).isEqualTo(409);}
        finally {jdbc.update("UPDATE business_settings SET currency_code='MAD' WHERE id=1");}
    }
}
