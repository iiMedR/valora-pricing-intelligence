package com.smartpricing.guidance;

import com.fasterxml.jackson.databind.JsonNode;
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

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class GuidanceIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;@Autowired JdbcTemplate jdbc;
    String product,variant,path;
    @BeforeEach void setup(){
        com.smartpricing.auth.TestHttp.authenticate(rest,jdbc);
        product=rest.postForObject("/api/v1/products",Map.of("name","Guidance fixture"),JsonNode.class).path("id").asText();
        variant=rest.postForObject("/api/v1/products/"+product+"/variants",Map.of("name","Standard","sku",UUID.randomUUID().toString(),"costPrice","40","currentPrice","100","minPrice","50","maxPrice","200","status","ACTIVE"),JsonNode.class).path("id").asText();
        path="/api/v1/guidance/products/"+product+"/variants/"+variant;
    }
    @Test void authenticatedEphemeralArithmeticDoesNotSaveOrChangePrices(){
        var before=jdbc.queryForMap("SELECT current_price,cost_price,version FROM product_variants WHERE id=?",UUID.fromString(variant));
        var response=rest.getForEntity(path+"?candidatePrice=80&currentUnits=100&scenarioUnits=156.25&costsConfirmed=true&fixedCosts=1000&currency=MAD",JsonNode.class);
        assertThat(response.getStatusCode().value()).as(response.toString()).isEqualTo(200);
        assertThat(response.getBody().path("current").path("totalContribution").asText()).isEqualTo("6000.0000");assertThat(response.getBody().path("scenario").path("totalContribution").asText()).isEqualTo("6250.0000");assertThat(response.getBody().path("resultEvidence").asText()).isEqualTo("CALCULATED_SCENARIO");
        assertThat(jdbc.queryForMap("SELECT current_price,cost_price,version FROM product_variants WHERE id=?",UUID.fromString(variant))).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM model_evaluation_audit",Long.class)).isZero();assertThat(jdbc.queryForObject("SELECT count(*) FROM sales_orders",Long.class)).isZero();
    }
    @Test void membershipModeAuthenticationAndValidationFailClosed(){
        var anonymous=new TestRestTemplate();assertThat(anonymous.getForEntity(rest.getRootUri()+path,String.class).getStatusCode().value()).isEqualTo(401);
        assertThat(rest.getForEntity(path.replace(variant,UUID.randomUUID().toString()),String.class).getStatusCode().value()).isEqualTo(404);
        String other=rest.postForObject("/api/v1/products",Map.of("name","Other product"),JsonNode.class).path("id").asText();
        assertThat(rest.getForEntity(path.replace(product,other),String.class).getStatusCode().value()).isEqualTo(404);
        for(String query:List.of("currency=USD","candidatePrice=0","candidatePrice=NaN","candidatePrice=1e100000","scenarioUnits=-1","periodDays=367","periodDays=1.5","feePercent=100","billingPeriod=YEARLY","candidatePrice=80&candidatePrice=90"))assertThat(rest.getForEntity(path+"?"+query,String.class).getStatusCode().value()).as(query).isEqualTo(400);
        assertThat(rest.getForEntity("/api/v1/saas/plans/x/guidance?priceId=y&asOf=2025-01-01",String.class).getStatusCode().value()).isEqualTo(409);
    }
    @Test void unsupportedMutationsAreDeniedAndSessionLossRemovesAccess(){
        assertThat(rest.postForEntity(path,Map.of(),String.class).getStatusCode().value()).isEqualTo(403);
        assertThat(rest.postForEntity("/api/v1/auth/logout",Map.of(),String.class).getStatusCode().value()).isEqualTo(204);
        assertThat(rest.getForEntity(path,String.class).getStatusCode().value()).isEqualTo(401);
    }
}
