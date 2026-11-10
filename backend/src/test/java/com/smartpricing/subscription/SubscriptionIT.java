package com.smartpricing.subscription;

import com.smartpricing.subscription.SubscriptionService.*;
import com.smartpricing.common.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"app.business-mode=SAAS_SUBSCRIPTION","server.servlet.session.cookie.name=SP_SAAS_SESSION"})
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class SubscriptionIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired SubscriptionService service; @Autowired JdbcTemplate jdbc; @Autowired TestRestTemplate rest;
    static LocalDate date(String s){return LocalDate.parse(s);}
    static Operation plan(String source,String plan,String price,String amount,String interval,String day) {return new Operation(1,source,"PLAN",plan,"Plan "+plan,price,new BigDecimal(amount),"MAD",interval,date(day),null,null);}
    static Operation event(String source,String kind,String sub,String price,String day) {return new Operation(1,source,kind,null,null,price,null,null,null,date(day),sub,null);}
    static Operation paid(String source,String kind,String sub,String amount,String day,String charge) {return new Operation(1,source,kind,null,null,null,new BigDecimal(amount),"MAD",null,date(day),sub,charge);}
    @BeforeEach void clear(){jdbc.update("DELETE FROM subscription_ingestion");jdbc.update("DELETE FROM subscription_payments WHERE kind='REFUND'");jdbc.update("DELETE FROM subscription_payments");jdbc.update("DELETE FROM subscription_events");jdbc.update("DELETE FROM subscription_prices");jdbc.update("DELETE FROM subscription_plans");}
    void fixture() {
        service.ingest(plan("plan-month","basic","m100","100","MONTHLY","2025-01-01"),true);
        service.ingest(plan("plan-year","annual","y1200","1200","YEARLY","2025-01-01"),true);
        service.ingest(plan("plan-up","basic","m150","150","MONTHLY","2025-01-10"),true);
        service.ingest(event("start-a","START","sub-a","m100","2025-01-01"),true);
        service.ingest(event("start-b","START","sub-b","y1200","2025-01-01"),true);
        service.ingest(paid("cash-a","PAID","sub-a","100","2025-01-01",null),true);
        service.ingest(paid("cash-b","PAID","sub-b","1200","2025-01-01",null),true);
        service.ingest(event("upgrade-a","CHANGE","sub-a","m150","2025-01-10"),true);
        service.ingest(event("end-b","CANCEL","sub-b","y1200","2025-01-20"),true);
        service.ingest(paid("refund-b","REFUND","sub-b","100","2025-01-21","cash-b"),true);
    }
    @Test void annualUpgradeEffectiveChurnAndCashAreHandCheckable() {
        fixture();
        var early=service.metrics(date("2025-01-01"),date("2025-01-19"));
        assertThat(early.mrr()).isEqualByComparingTo("250");assertThat(early.arr()).isEqualByComparingTo("3000");assertThat(early.activePaidSubscriptions()).isEqualTo(2);
        var m=service.metrics(date("2025-01-02"),date("2025-01-31"));
        assertThat(m.mrr()).isEqualByComparingTo("150");assertThat(m.arr()).isEqualByComparingTo("1800");assertThat(m.collectedNetCash()).isEqualByComparingTo("-100");
        assertThat(m.movement().beginning()).isEqualByComparingTo("200");assertThat(m.movement().expansion()).isEqualByComparingTo("50");assertThat(m.movement().churned()).isEqualByComparingTo("100");assertThat(m.movement().reconciliationDifference()).isZero();
        assertThat(m.subscriptionChurnPercent()).isEqualByComparingTo("50");assertThat(m.grossRevenueChurnPercent()).isEqualByComparingTo("50");assertThat(m.netRevenueChurnPercent()).isEqualByComparingTo("25");
        assertThat(service.subscribers("sub-b",0,10,date("2025-01-19")).content().getFirst().scheduledEnd()).isEqualTo(date("2025-01-20"));
        var history=service.planHistory("basic",date("2025-01-09"),date("2025-01-10"));
        assertThat(history.trend().getFirst().mrr()).isEqualByComparingTo("100");assertThat(history.trend().getLast().mrr()).isEqualByComparingTo("150");
    }
    @Test void previewReplayConflictAndAtomicFailureNeverOverwriteHistory() {
        var p=plan("p","basic","m100","100","MONTHLY","2025-01-01");
        assertThat(service.ingest(p,false).status()).isEqualTo("VALID");assertThat(service.prices()).isEmpty();
        assertThat(service.ingest(p,true).status()).isEqualTo("RECORDED");assertThat(service.ingest(p,true).status()).isEqualTo("UNCHANGED");
        assertThatThrownBy(()->service.ingest(plan("p","basic","m101","101","MONTHLY","2025-01-01"),true)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.ingest(plan("other","basic","m100","10","MONTHLY","2025-01-02"),true)).isInstanceOf(ApiException.class);
        assertThat(service.prices()).hasSize(1);assertThat(jdbc.queryForObject("SELECT count(*) FROM subscription_ingestion",Long.class)).isEqualTo(1);
        // Force a failure after plan/price inserts, proving actual transaction rollback.
        jdbc.execute("ALTER TABLE subscription_ingestion ADD CONSTRAINT qa_reject_late CHECK(source_id <> 'blocked')");
        try {
            assertThatThrownBy(()->service.ingest(plan("blocked","rollback","rollback-price","100","MONTHLY","2025-01-01"),true)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        } finally { jdbc.execute("ALTER TABLE subscription_ingestion DROP CONSTRAINT qa_reject_late"); }
        assertThat(service.prices()).hasSize(1);assertThat(jdbc.queryForObject("SELECT count(*) FROM subscription_plans WHERE id='rollback'",Long.class)).isZero();
    }
    @Test void unpaidMissingPriceCurrencyRefundBoundsAndTransitionsFailClosed() {
        fixture();service.ingest(event("unpaid","START","unpaid-sub","m100","2025-01-01"),true);
        assertThat(service.metrics(date("2025-01-01"),date("2025-01-02")).activePaidSubscriptions()).isEqualTo(2);
        assertThatThrownBy(()->service.ingest(event("missing","START","x","absent","2025-01-01"),true)).hasMessageContaining("not found");
        assertThatThrownBy(()->service.ingest(event("invalid","CHANGE","sub-b","m100","2025-01-25"),true)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.ingest(paid("over","REFUND","sub-b","1101","2025-01-21","cash-b"),true)).hasMessageContaining("exceed");
        assertThatThrownBy(()->service.ingest(plan("zero","zero","z","0","MONTHLY","2025-01-01"),true)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.ingest(plan("weekly","w","w","20","WEEKLY","2025-01-01"),true)).isInstanceOf(ApiException.class);
        var wrong=new Operation(1,"eur","PLAN","eur","Plan Euro","eur",BigDecimal.TEN,"EUR","MONTHLY",date("2025-01-01"),null,null);
        assertThatThrownBy(()->service.ingest(wrong,true)).hasMessageContaining("Currency");
        assertThatThrownBy(()->service.metrics(date("2024-01-01"),date("2025-12-31"))).isInstanceOf(ApiException.class);
    }
    @Test void downgradeReactivationAndZeroDenominatorAreExplicit() {
        fixture();service.ingest(event("down-a","CHANGE","sub-a","m100","2025-01-25"),true);service.ingest(event("back-b","REACTIVATE","sub-b","y1200","2025-01-26"),true);
        var m=service.metrics(date("2025-01-02"),date("2025-01-31"));assertThat(m.mrr()).isEqualByComparingTo("200");assertThat(m.movement().contraction()).isEqualByComparingTo("50");assertThat(m.movement().reactivation()).isEqualByComparingTo("100");assertThat(m.movement().reconciliationDifference()).isZero();
        assertThat(service.metrics(date("2025-01-01"),date("2025-01-01")).subscriptionChurnPercent()).isNull();
    }
    @Test void actualSessionCsrfAndCrossModeAccessAreEnforced() {
        assertThat(rest.getForEntity("/api/v1/saas/plans?asOf=2025-01-31",String.class).getStatusCode().value()).isEqualTo(401);
        com.smartpricing.auth.TestHttp.authenticate(rest,jdbc);
        assertThat(rest.getForEntity("/api/v1/products",String.class).getStatusCode().value()).isEqualTo(409);
        assertThat(rest.getForEntity("/api/v1/saas/plans?asOf=2025-01-31",String.class).getStatusCode().value()).isEqualTo(200);
        var interceptors=java.util.List.copyOf(rest.getRestTemplate().getInterceptors());rest.getRestTemplate().setInterceptors(java.util.List.of((request,body,execution)->{return interceptors.getFirst().intercept(request,body,(r,b)->{r.getHeaders().remove("X-XSRF-TOKEN");return execution.execute(r,b);});}));
        try {assertThat(rest.postForEntity("/api/v1/saas/entry/commit",plan("x","x","x","100","MONTHLY","2025-01-01"),String.class).getStatusCode().value()).isEqualTo(403);}finally{rest.getRestTemplate().setInterceptors(interceptors);}
        var logout=rest.postForEntity("/api/v1/auth/logout",java.util.Map.of(),String.class);
        assertThat(logout.getStatusCode().value()).isEqualTo(204);
        assertThat(logout.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE)).anyMatch(c->c.startsWith("SP_SAAS_SESSION=")&&c.contains("Max-Age=0"));
        assertThat(rest.getForEntity("/api/v1/saas/plans?asOf=2025-01-31",String.class).getStatusCode().value()).isEqualTo(401);
    }
}
