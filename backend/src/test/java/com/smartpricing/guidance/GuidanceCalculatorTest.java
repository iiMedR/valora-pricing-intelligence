package com.smartpricing.guidance;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static com.smartpricing.guidance.GuidanceCalculator.*;
import static org.assertj.core.api.Assertions.*;

class GuidanceCalculatorTest {
    static BigDecimal n(String s){return s==null?null:new BigDecimal(s);}
    CommerceInput commerce(String candidate,String current,String scenario,String cost,String fixed,String margin,boolean confirmed){return new CommerceInput("MAD",30,n(candidate),n(current),n(scenario),n(cost),null,n(fixed),n(margin),null,null,null,null,confirmed);}
    @Test void knownFactsAndExplicitScenarioDoNotPredictSales(){
        var r=GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce("80","100","156.25",null,"1000","40",true));
        assertThat(r.facts()).containsEntry("unitContribution","60.0000").containsEntry("marginPercent","60.0000");
        assertThat(r.current()).containsEntry("totalContribution","6000.0000").containsEntry("breakEvenUnits","17");
        assertThat(r.scenario()).containsEntry("totalContribution","6250.0000").containsEntry("breakEvenUnits","25").containsEntry("targetMarginPrice","66.6667");
        assertThat(r.resultEvidence()).isEqualTo(Evidence.CALCULATED_SCENARIO);assertThat(r.exclusions()).anyMatch(s->s.contains("Not a predicted"));
    }
    @Test void missingCostUnitsOrConsentCannotBecomeInventedTotals(){
        var absent=GuidanceCalculator.commerce("v","MAD",n("100"),null,commerce("80",null,null,null,null,null,true));
        assertThat(absent.facts().get("unitContribution")).isNull();assertThat(absent.scenario()).isEmpty();assertThat(absent.missing()).isNotEmpty();
        var noUnits=GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce("80",null,null,null,null,null,true));
        assertThat(noUnits.scenario()).doesNotContainKey("totalContribution");assertThat(noUnits.scenario().get("breakEvenUnits")).isNull();
        var noConsent=GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce("80","10","10",null,null,null,false));assertThat(noConsent.scenario()).isEmpty();
    }
    @Test void assumedCostStaysSeparateFromMissingRecordedCost(){
        var r=GuidanceCalculator.commerce("v","MAD",n("100"),null,commerce("80","10","20","40",null,null,true));
        assertThat(r.facts().get("unitCost")).isNull();assertThat(r.scenario()).containsEntry("totalContribution","800.0000");assertThat(r.assumptions()).containsEntry("assumedUnitCost","40");
    }
    @Test void taxDiscountFeesRefundAndShippingDefinitionsAreHandCheckable(){
        var in=new CommerceInput("MAD",14,n("120"),n("10"),n("10"),null,n("5"),n("1000"),n("40"),n("10"),n("20"),n("2"),n("12"),true);
        var r=GuidanceCalculator.commerce("v","MAD",n("120"),n("40"),in);
        //108 gross,90 tax-exclusive less40 cost/5shipping/2.16fee =42.84. Refund12 ->10 revenue.
        assertThat(r.scenario()).containsEntry("unitContribution","42.8400").containsEntry("totalContribution","418.4000").containsEntry("grossBillings","1080.0000").containsEntry("netCashAfterFeesAndRefunds","1046.4000").containsEntry("breakEvenUnits","24");
    }
    @Test void zeroAndNegativeContributionDoNotProduceFiniteBreakEven(){
        for(String price:new String[]{"40","20"}){
            var r=GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce(price,"0","0",null,"1000",null,true));assertThat(r.scenario().get("breakEvenUnits")).isNull();assertThat(r.scenario()).containsEntry("totalContribution","0.0000");
        }
        assertThat(GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce("80","0","0",null,"0",null,true)).scenario()).containsEntry("breakEvenUnits","0");
    }
    @Test void invalidMoneyPrecisionCurrencyAndBoundsAreRejected(){
        for(String price:new String[]{"0","-1","1.00001","1000000000001","1E+100000"})assertThatThrownBy(()->GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce(price,"1","1",null,null,null,true))).isInstanceOf(com.smartpricing.common.ApiException.class);
        var wrong=new CommerceInput("USD",30,null,null,null,null,null,null,null,null,null,null,null,false);
        assertThatThrownBy(()->GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),wrong)).hasMessageContaining("currency");
        assertThatThrownBy(()->GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce("80","1000001","1",null,null,null,true))).hasMessageContaining("1,000,000");
        assertThatThrownBy(()->GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),commerce("80","1","1",null,null,"100",true))).hasMessageContaining("100%");
    }
    @Test void impossibleMarginAndZeroPriceDoNotBecomeSuggestions(){
        assertThat(GuidanceCalculator.basic(BigDecimal.ZERO,n("40")).get("marginPercent")).isNull();
        var in=new CommerceInput("MAD",30,n("80"),n("1"),n("1"),null,null,null,n("90"),null,null,n("20"),null,true);
        assertThat(GuidanceCalculator.commerce("v","MAD",n("100"),n("40"),in).scenario().get("targetMarginPrice")).isNull();
    }
    @Test void requiredPriceRoundsUpAndDoesNotInventAPositiveThresholdAtZeroCost(){
        assertThat(GuidanceCalculator.commerce("v","MAD",n("150"),n("80"),commerce("150","1","1",null,null,"30",true)).scenario()).containsEntry("targetMarginPrice","114.2858");
        assertThat(GuidanceCalculator.commerce("v","MAD",n("100"),n("0"),commerce("80","1","1",null,null,"40",true)).scenario().get("targetMarginPrice")).isNull();
    }
    SubscriptionInput saas(String candidate,Integer start,Integer added,Integer cancelled,String cost,String fixed,String discount,String fee,String refund){return new SubscriptionInput("MAD",n(candidate),start,added,cancelled,n(cost),n(fixed),n(discount),n(fee),n(refund),true);}
    @Test void annualBillingsAndMonthlyRunRateRemainDifferent(){
        var r=GuidanceCalculator.subscription("p","MAD","YEARLY","2025-01-01",n("1200"),saas("1440",10,2,1,"240","1000","10","2","120"));
        assertThat(r.facts()).containsEntry("monthlyPrice","100.0000");assertThat(r.current()).containsEntry("grossBillings","10800.0000").containsEntry("normalizedMonthlyRecurring","900.0000");
        assertThat(r.scenario()).containsEntry("assumedSubscribers","11").containsEntry("grossBillings","14256.0000").containsEntry("normalizedMonthlyRecurring","1188.0000").containsEntry("normalizedAnnualRecurring","14256.0000").containsEntry("totalContribution","11210.8800");
    }
    @Test void monthlyScenarioChangesCountsOnlyThroughExplicitAssumptions(){
        var r=GuidanceCalculator.subscription("p","MAD","MONTHLY","2025-01-01",n("100"),saas("150",2,0,1,"40","100",null,null,null));
        assertThat(r.current()).containsEntry("normalizedMonthlyRecurring","200.0000");assertThat(r.scenario()).containsEntry("normalizedMonthlyRecurring","150.0000").containsEntry("normalizedAnnualRecurring","1800.0000").containsEntry("totalContribution","110.0000").containsEntry("breakEvenUnits","1");
    }
    @Test void subscriptionMissingInputsAndInvalidTransitionsFailClosed(){
        var missing=GuidanceCalculator.subscription("p","MAD","MONTHLY","2025-01-01",n("100"),saas("150",null,null,null,null,null,null,null,null));assertThat(missing.scenario()).isEmpty();
        assertThatThrownBy(()->GuidanceCalculator.subscription("p","MAD","MONTHLY","2025-01-01",n("100"),saas("150",1,0,2,"0",null,null,null,null))).hasMessageContaining("Cancellations");
        assertThatThrownBy(()->GuidanceCalculator.subscription("p","MAD","WEEKLY","2025-01-01",n("100"),saas("150",1,0,0,"0",null,null,null,null))).hasMessageContaining("monthly");
        assertThatThrownBy(()->GuidanceCalculator.subscription("p","MAD","MONTHLY","2025-01-01",n("100"),saas("150",0,0,0,"0",null,null,null,"10"))).hasMessageContaining("refunds");
    }
}
