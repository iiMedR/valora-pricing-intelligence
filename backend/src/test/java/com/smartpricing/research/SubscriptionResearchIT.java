package com.smartpricing.research;

import com.smartpricing.subscription.SubscriptionService;
import com.smartpricing.subscription.SubscriptionService.Operation;
import java.math.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

/** Independent ledger arithmetic. Only the disposable database below is mutated. */
@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,properties="app.business-mode=SAAS_SUBSCRIPTION")
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class SubscriptionResearchIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired SubscriptionService service;
    @Autowired JdbcTemplate jdbc;
    static LocalDate d(String day){return LocalDate.parse("2024-06-"+day);}
    void plan(String id,String amount,String interval){service.ingest(new Operation(1,"plan-"+id,"PLAN",id,id,id,new BigDecimal(amount),"MAD",interval,d("01"),null,null),true);}
    void lifecycle(String id,String kind,String sub,String price,LocalDate day){service.ingest(new Operation(1,id,kind,null,null,price,null,null,null,day,sub,null),true);}
    void cash(String id,String kind,String sub,String amount,LocalDate day,String original){service.ingest(new Operation(1,id,kind,null,null,null,new BigDecimal(amount),"MAD",null,day,sub,original),true);}
    static BigDecimal percent(int numerator,int denominator){return BigDecimal.valueOf(numerator*100L).divide(BigDecimal.valueOf(denominator),6,RoundingMode.HALF_UP);}
    @Test void sparseCohortsReconcileWithoutMerchandiseElasticity()throws Exception {
        StringBuilder out=new StringBuilder("seed,beginningPaid,beginningMrr,newMrr,expansion,contraction,churned,endingMrr,netCashInWindow,subscriptionChurnPercent,rateGranularityPercent,label\n");
        for(long seed:new long[]{1001,1002,1003})for(int n:new int[]{0,1,5,20}) {
            for(String table:List.of("subscription_ingestion","subscription_payments","subscription_events","subscription_prices","subscription_plans")) {
                if(table.equals("subscription_payments"))jdbc.update("DELETE FROM subscription_payments WHERE kind='REFUND'");
                jdbc.update("DELETE FROM "+table);
            }
            plan("month","100","MONTHLY");plan("annual","1200","YEARLY");plan("upgrade","150","MONTHLY");plan("downgrade","50","MONTHLY");
            List<String> ids=new ArrayList<>();for(int i=0;i<n;i++)ids.add("research-"+seed+"-"+i);Collections.shuffle(ids,new Random(seed));
            for(int i=0;i<n;i++) {String sub=ids.get(i);boolean annual=i%2==1;lifecycle("start-"+sub,"START",sub,annual?"annual":"month",d("01"));cash("paid-"+sub,"PAID",sub,annual?"1200":"100",d("01"),null);}
            lifecycle("unpaid","START","unpaid","month",d("01"));
            if(n>0){lifecycle("end","CANCEL",ids.getFirst(),"month",LocalDate.of(2024,7,1));lifecycle("new","START","new-cohort","month",d("15"));cash("new-paid","PAID","new-cohort","100",d("15"),null);}
            if(n>=2)lifecycle("expansion","CHANGE",ids.get(1),"upgrade",d("10"));
            if(n>=3)lifecycle("contraction","CHANGE",ids.get(2),"downgrade",d("20"));
            if(n>=4)cash("refund","REFUND",ids.get(3),"100",d("25"),"paid-"+ids.get(3));
            int beginning=n*100,added=n>0?100:0,exp=n>=2?50:0,con=n>=3?50:0,churn=n>0?100:0,ending=beginning+added+exp-con-churn;
            var m=service.metrics(d("02"),LocalDate.of(2024,7,1));
            assertThat(m.mrr()).isEqualByComparingTo(BigDecimal.valueOf(ending));assertThat(m.arr()).isEqualByComparingTo(BigDecimal.valueOf(ending*12L));
            assertThat(m.movement().beginning()).isEqualByComparingTo(BigDecimal.valueOf(beginning));assertThat(m.movement().newMrr()).isEqualByComparingTo(BigDecimal.valueOf(added));
            assertThat(m.movement().expansion()).isEqualByComparingTo(BigDecimal.valueOf(exp));assertThat(m.movement().contraction()).isEqualByComparingTo(BigDecimal.valueOf(con));assertThat(m.movement().churned()).isEqualByComparingTo(BigDecimal.valueOf(churn));assertThat(m.movement().reconciliationDifference()).isZero();
            int netCash=added-(n>=4?100:0);assertThat(m.collectedNetCash()).isEqualByComparingTo(BigDecimal.valueOf(netCash));
            if(n==0){assertThat(m.subscriptionChurnPercent()).isNull();assertThat(m.grossRevenueChurnPercent()).isNull();}else{
                assertThat(m.subscriptionChurnPercent()).isEqualByComparingTo(percent(1,n));
                assertThat(m.grossRevenueChurnPercent()).isEqualByComparingTo(percent(churn+con,beginning));assertThat(m.netRevenueChurnPercent()).isEqualByComparingTo(percent(churn+con-exp,beginning));
                assertThat(service.metrics(d("02"),d("30")).activePaidSubscriptions()).isEqualTo(n+1);
            }
            out.append(LowDataBenchmarkTest.csv(seed,n,beginning,added,exp,con,churn,ending,netCash,m.subscriptionChurnPercent(),n==0?null:percent(1,n),"ACCOUNTING_ONLY_PRICE_RESPONSE_NOT_IDENTIFIED"));
        }
        LowDataBenchmarkTest.save("subscription-research.csv",out.toString());
    }
}
