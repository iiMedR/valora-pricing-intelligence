package com.smartpricing.history;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class HistoryApiIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;
    @Autowired JdbcTemplate jdbc;
    String productId,variantId;
    @BeforeEach void prepareIsolatedDatabase() {
        jdbc.execute("TRUNCATE sales_refunds,sales_order_items,sales_orders,variant_price_history,variant_cost_history,inventory_snapshots,product_variants,products,categories");
        productId=post("/products",Map.of("name","History product"),201).path("id").asText();
        variantId=post("/products/"+productId+"/variants",Map.of("sku","HISTORY-1","name","Standard","costPrice","9","currentPrice","10","minPrice","5","maxPrice","20","status","ACTIVE"),201).path("id").asText();
    }
    ResponseEntity<JsonNode> call(HttpMethod method,String path,Object body) { return rest.exchange("/api/v1"+path,method,new HttpEntity<>(body),JsonNode.class); }
    JsonNode post(String path,Object body,int status) { var result=call(HttpMethod.POST,path,body); assertThat(result.getStatusCode().value()).as(result.toString()).isEqualTo(status); return result.getBody(); }
    JsonNode get(String path) { var result=call(HttpMethod.GET,path,null); assertThat(result.getStatusCode().value()).isEqualTo(200); return result.getBody(); }
    Map<String,Object> line(String id) { return new HashMap<>(Map.of("variantId",id,"quantity",2,"unitPrice","10.1234","discountAmount","1.0000")); }
    Map<String,Object> order(String ref) { return new HashMap<>(Map.of("source","MANUAL","externalReference",ref,"placedAt","2026-01-15T00:00:00Z","status","COMPLETED","currencyCode","MAD","shippingAmount","2","taxAmount","1","lines",List.of(line(variantId)))); }
    String history(String kind) { return "/products/variants/"+variantId+"/"+kind+"-history"; }
    Map<String,Object> period(String ref,String amount,String from,String to,long version) {
        var body=new HashMap<String,Object>(Map.of("source","MANUAL","externalReference",ref,"amount",amount,"currencyCode","MAD","quality","VERIFIED_CHANGE","validFrom",from,"variantVersion",version));
        if(to!=null) body.put("validTo",to); return body;
    }
    Map<String,Object> refund(String item,String ref,int quantity,String amount) {
        return new HashMap<>(Map.of("source","MANUAL","externalReference",ref,"refundedAt","2026-01-16T00:00:00Z","kind","LINE_RETURN","itemId",item,"quantity",quantity,"amount",amount,"currencyCode","MAD"));
    }

    @Test void immutableSalesSnapshotsPartialRefundsAndNetSemantics() {
        JsonNode created=post("/sales/orders",order("order-1"),201); String id=created.path("order").path("id").asText(); String item=created.path("lines").get(0).path("id").asText();
        assertThat(created.path("order").path("subtotal").asText()).isEqualTo("20.2468");
        assertThat(created.path("lines").get(0).path("unitCost").isNull()).isTrue();
        assertThat(created.path("lines").get(0).path("costProvenance").asText()).isEqualTo("UNKNOWN");
        assertThat(post("/sales/orders",order("order-1"),200).path("order").path("id").asText()).isEqualTo(id);
        post("/sales/orders/"+id+"/refunds",refund(item,"refund-1",1,"5.0000"),201);
        post("/sales/orders/"+id+"/refunds",refund(item,"refund-1",1,"5"),200);
        JsonNode detail=get("/sales/orders/"+id);
        assertThat(detail.path("order").path("recognizedNetMerchandise").asText()).isEqualTo("14.2468");
        var adjustment=refund(item,"financial",0,"1"); adjustment.put("kind","FINANCIAL_ADJUSTMENT"); post("/sales/orders/"+id+"/refunds",adjustment,201);
        var shipping=new HashMap<>(adjustment); shipping.remove("itemId"); shipping.put("kind","SHIPPING"); shipping.put("externalReference","shipping"); post("/sales/orders/"+id+"/refunds",shipping,201);
        assertThat(get("/sales/orders/"+id).path("order").path("recognizedNetMerchandise").asText()).isEqualTo("13.2468");
        assertThatThrownBy(()->jdbc.update("UPDATE sales_order_items SET unit_price=1 WHERE id=?",UUID.fromString(item))).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(()->jdbc.update("DELETE FROM sales_orders WHERE id=?",UUID.fromString(id))).isInstanceOf(DataIntegrityViolationException.class);
        call(HttpMethod.DELETE,"/products/"+productId+"/variants/"+variantId,null);
        call(HttpMethod.DELETE,"/products/"+productId,null);
        assertThat(get("/sales/orders/"+id).path("lines").get(0).path("unitPrice").asText()).isEqualTo("10.1234");
        assertThatThrownBy(()->jdbc.update("DELETE FROM product_variants WHERE id=?",UUID.fromString(variantId))).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void transactionsRollBackAndInvalidRefundsLeaveNoRows() {
        var invalid=order("bad-order"); invalid.put("lines",List.of(line(variantId),line(UUID.randomUUID().toString())));
        post("/sales/orders",invalid,404); assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders",Integer.class)).isZero();
        JsonNode created=post("/sales/orders",order("good"),201); String id=created.path("order").path("id").asText(),item=created.path("lines").get(0).path("id").asText();
        post("/sales/orders/"+id+"/refunds",refund(item,"too-many",3,"1"),409);
        post("/sales/orders/"+id+"/refunds",refund(item,"too-much",1,"100"),409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_refunds",Integer.class)).isZero();
        var invalidCurrency=order("wrong-currency"); invalidCurrency.put("currencyCode","USD"); post("/sales/orders",invalidCurrency,400);
        var invalidMoney=order("invalid-money"); var badLine=line(variantId); badLine.put("unitPrice","1.00001"); invalidMoney.put("lines",List.of(badLine)); post("/sales/orders",invalidMoney,400);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders",Integer.class)).isEqualTo(1);
    }

    @Test void statusesFiltersPaginationAndConflictingSourceKeys() {
        var unpaid=order("unpaid"); unpaid.put("status","UNPAID"); JsonNode created=post("/sales/orders",unpaid,201);
        assertThat(created.path("order").path("recognizedNetMerchandise").asText()).isEqualTo("0.0000");
        post("/sales/orders/"+created.path("order").path("id").asText()+"/refunds",refund(created.path("lines").get(0).path("id").asText(),"unpaid-refund",1,"1"),409);
        var conflict=order("unpaid"); post("/sales/orders",conflict,409);
        post("/sales/orders",order("completed"),201);
        JsonNode page=get("/sales/orders?status=UNPAID&source=MANUAL&from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z&size=1");
        assertThat(page.path("totalElements").asInt()).isEqualTo(1);
        assertThat(get("/sales/orders?page=1&size=1").path("content").size()).isEqualTo(1);
        assertThat(call(HttpMethod.GET,"/sales/orders?from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z",null).getStatusCode().value()).isEqualTo(400);
    }

    @Test void effectivePeriodsCostsAndCatalogEditsRemainConsistentWithoutRewritingOrders() {
        assertThat(get(history("price")).path("totalElements").asInt()).isZero();
        post(history("cost"),period("cost-past","3","2026-01-01T00:00:00Z","2026-02-01T00:00:00Z",0),201);
        post(history("cost"),period("cost-current","4","2026-02-01T00:00:00Z",null,0),201);
        post(history("price"),period("price-past","9","2026-01-01T00:00:00Z","2026-02-01T00:00:00Z",0),201);
        var current=period("price-current","12","2026-02-01T00:00:00Z",null,1); post(history("price"),current,201); post(history("price"),current,200);
        post(history("price"),period("outside-bounds","25","2026-03-01T00:00:00Z",null,2),409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM variant_price_history WHERE valid_to IS NULL AND quality='VERIFIED_CHANGE'",Integer.class)).isEqualTo(1);
        post(history("price"),period("overlap","11","2026-01-15T00:00:00Z","2026-01-20T00:00:00Z",0),409);
        var snapshot=period("snapshot","15","2026-01-15T00:00:00Z",null,0); snapshot.put("quality","SNAPSHOT"); post(history("price"),snapshot,201);
        JsonNode sales=post("/sales/orders",order("historical-cost"),201);
        assertThat(sales.path("lines").get(0).path("unitCost").asText()).isEqualTo("3.0000");
        assertThat(sales.path("lines").get(0).path("costProvenance").asText()).isEqualTo("EFFECTIVE_HISTORY");
        var boundaryOrder=order("boundary-cost"); boundaryOrder.put("placedAt","2026-02-01T00:00:00Z");
        assertThat(post("/sales/orders",boundaryOrder,201).path("lines").get(0).path("unitCost").asText()).isEqualTo("4.0000");
        JsonNode variant=get("/products/"+productId).path("variants").get(0);
        assertThat(variant.path("currentPrice").asText()).isEqualTo("12.0000");
        var edit=new HashMap<String,Object>(Map.of("sku","EDITED","name","Renamed","costPrice","8","currentPrice","13","minPrice","5","maxPrice","20","status","ACTIVE","version",variant.path("version").asLong()));
        assertThat(call(HttpMethod.PUT,"/products/"+productId+"/variants/"+variantId,edit).getStatusCode().value()).isEqualTo(200);
        assertThat(get(history("cost")).path("totalElements").asInt()).isEqualTo(3);
        assertThat(get("/sales/orders/"+sales.path("order").path("id").asText()).path("lines").get(0).path("sku").asText()).isEqualTo("HISTORY-1");
        assertThat(get("/sales/orders/"+sales.path("order").path("id").asText()).path("lines").get(0).path("unitCost").asText()).isEqualTo("3.0000");
        assertThatThrownBy(()->jdbc.update("INSERT INTO variant_price_history(id,variant_id,amount,currency_code,valid_from,valid_to,source,quality,payload_hash) VALUES (?,?,10,'MAD','2026-01-02T00:00:00Z','2026-01-03T00:00:00Z','MANUAL','VERIFIED_CHANGE','hash')",UUID.randomUUID(),UUID.fromString(variantId))).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void concurrentIdempotentOrdersAndInventoryDoNotDuplicate() throws Exception {
        var payload=order("concurrent");
        try(var pool=Executors.newFixedThreadPool(4)) {
            var tasks=new ArrayList<Callable<Integer>>(); for(int i=0;i<4;i++) tasks.add(()->call(HttpMethod.POST,"/sales/orders",payload).getStatusCode().value());
            var codes=pool.invokeAll(tasks).stream().map(f->{try{return f.get();}catch(Exception e){throw new RuntimeException(e);}}).toList();
            assertThat(codes.stream().filter(status->status==201).count()).isEqualTo(1); assertThat(codes).allMatch(code->code==200||code==201);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders",Integer.class)).isEqualTo(1);
        assertThat(get(history("inventory")).path("content").size()).isZero();
        var observation=new HashMap<String,Object>(Map.of("source","MANUAL","externalReference","stock-1","observedAt","2026-01-20T00:00:00Z","quantityAvailable",0,"quality","SNAPSHOT"));
        assertThat(post(history("inventory"),observation,201).path("stockState").asText()).isEqualTo("KNOWN_STOCKOUT");
        post(history("inventory"),observation,200); observation.put("quantityAvailable",2); post(history("inventory"),observation,409);
        observation.put("externalReference","inferred"); observation.put("quantityAvailable",0); observation.put("quality","INFERRED");
        assertThat(post(history("inventory"),observation,201).path("stockState").asText()).isEqualTo("UNCERTAIN");
        observation.put("externalReference","invalid"); observation.put("quantityAvailable",-1); post(history("inventory"),observation,400);
        assertThat(get(history("inventory")+"?size=1").path("totalPages").asInt()).isEqualTo(2);
    }
}
