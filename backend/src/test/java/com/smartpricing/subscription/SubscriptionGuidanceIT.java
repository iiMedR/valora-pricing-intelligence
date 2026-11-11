package com.smartpricing.subscription;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="app.business-mode=SAAS_SUBSCRIPTION")
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class SubscriptionGuidanceIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired SubscriptionService service;@Autowired TestRestTemplate rest;@Autowired JdbcTemplate jdbc;
    @Test void annualScenarioIsAuthenticatedPeriodAwareScopedAndReadOnly(){
        com.smartpricing.auth.TestHttp.authenticate(rest,jdbc);
        service.ingest(new SubscriptionService.Operation(1,"annual-plan","PLAN","annual","Annual","annual1200",new BigDecimal("1200"),"MAD","YEARLY",LocalDate.of(2025,1,1),null,null),true);
        service.ingest(new SubscriptionService.Operation(1,"other-plan","PLAN","other","Other","other100",new BigDecimal("100"),"MAD","MONTHLY",LocalDate.of(2025,1,1),null,null),true);
        String path="/api/v1/saas/plans/annual/guidance?priceId=annual1200&asOf=2025-01-31";
        var response=rest.getForEntity(path+"&candidatePrice=1440&retainedSubscribers=10&newSubscribers=2&cancellations=1&servicingCost=240&discountPercent=10&feePercent=2&refunds=120&costsConfirmed=true",JsonNode.class);
        assertThat(response.getStatusCode().value()).as(response.toString()).isEqualTo(200);
        assertThat(response.getBody().path("facts").path("monthlyPrice").asText()).isEqualTo("100.0000");assertThat(response.getBody().path("scenario").path("normalizedMonthlyRecurring").asText()).isEqualTo("1188.0000");assertThat(response.getBody().path("scenario").path("totalContribution").asText()).isEqualTo("11210.8800");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM subscription_ingestion",Long.class)).isEqualTo(2);assertThat(jdbc.queryForObject("SELECT count(*) FROM subscription_events",Long.class)).isZero();assertThat(jdbc.queryForObject("SELECT count(*) FROM model_evaluation_audit",Long.class)).isZero();
        assertThat(rest.getForEntity(path.replace("priceId=annual1200","priceId=other100"),String.class).getStatusCode().value()).isEqualTo(404);
        assertThat(rest.getForEntity(path.replace("asOf=2025-01-31","asOf=2024-01-01"),String.class).getStatusCode().value()).isEqualTo(404);
        assertThat(rest.getForEntity(path+"&retainedSubscribers=1.5",String.class).getStatusCode().value()).isEqualTo(400);
        assertThat(rest.getForEntity(path+"&interval=MONTHLY",String.class).getStatusCode().value()).isEqualTo(400);
        assertThat(rest.getForEntity("/api/v1/guidance/products/00000000-0000-0000-0000-000000000001/variants/00000000-0000-0000-0000-000000000002",String.class).getStatusCode().value()).isEqualTo(409);
        assertThat(new TestRestTemplate().getForEntity(rest.getRootUri()+path,String.class).getStatusCode().value()).isEqualTo(401);
        assertThat(rest.postForEntity(path,null,String.class).getStatusCode().value()).isEqualTo(405);
    }
}
