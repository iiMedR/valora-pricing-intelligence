package com.smartpricing.guidance;

import com.smartpricing.common.ApiException;
import java.math.*;
import java.util.*;

/** Pure, bounded decimal arithmetic. Never reads history, estimates demand or persists a scenario. */
public final class GuidanceCalculator {
    public enum Evidence { OBSERVED, KNOWN_INPUT, MERCHANT_ASSUMPTION, CALCULATED_SCENARIO, MODEL_ESTIMATE, ACTIONABLE_OPTIMIZATION }
    public record CommerceInput(String currency,Integer periodDays,BigDecimal candidatePrice,BigDecimal currentUnits,BigDecimal scenarioUnits,
        BigDecimal assumedUnitCost,BigDecimal extraUnitCost,BigDecimal fixedCosts,BigDecimal targetMarginPercent,
        BigDecimal discountPercent,BigDecimal taxPercent,BigDecimal feePercent,BigDecimal refunds,Boolean costsConfirmed) {}
    public record SubscriptionInput(String currency,BigDecimal candidatePrice,Integer retainedSubscribers,Integer newSubscribers,Integer cancellations,
        BigDecimal servicingCost,BigDecimal fixedCosts,BigDecimal discountPercent,BigDecimal feePercent,BigDecimal refunds,Boolean costsConfirmed) {}
    public record Result(String version,String businessMode,String resourceId,String currency,String period,String asOf,
        Evidence sourceEvidence,Evidence assumptionEvidence,Evidence resultEvidence,
        Map<String,String> facts,Map<String,String> current,Map<String,String> scenario,Map<String,String> assumptions,List<String> missing,List<String> exclusions) {}
    public static final MathContext MC=MathContext.DECIMAL128;
    private static final BigDecimal HUNDRED=new BigDecimal("100"),MAX=new BigDecimal("1000000000000");
    static final String VERSION="deterministic-guidance-v1";
    static BigDecimal amount(BigDecimal value,String name,boolean positive) {
        if(value!=null&&(value.scale()>4||value.precision()>19||value.compareTo(MAX)>0||value.signum()<0||(positive&&value.signum()==0)))throw ApiException.invalid(name+" must be "+(positive?"positive":"nonnegative")+", at most 1,000,000,000,000 and four decimal places.");
        return value;
    }
    static BigDecimal percent(BigDecimal value,String name,boolean hundredAllowed){amount(value,name,false);if(value!=null&&(value.compareTo(HUNDRED)>0||(!hundredAllowed&&value.compareTo(HUNDRED)==0)))throw ApiException.invalid(name+" must be below "+(hundredAllowed?"or equal to ":"")+"100%.");return value;}
    static BigDecimal units(BigDecimal value,String name){amount(value,name,false);if(value!=null&&value.compareTo(new BigDecimal("1000000"))>0)throw ApiException.invalid(name+" must be at most 1,000,000.");return value;}
    static void currency(String supplied,String actual){if(supplied!=null&&!supplied.equals(actual))throw ApiException.invalid("Scenario currency must match the recorded currency; no conversion is available.");}
    static String decimal(BigDecimal value){return value==null?null:value.setScale(4,RoundingMode.HALF_UP).toPlainString();}
    static BigDecimal zero(BigDecimal n){return n==null?BigDecimal.ZERO:n;}
    static Map<String,String> map(){return new LinkedHashMap<>();}
    static BigDecimal fraction(BigDecimal n){return zero(n).divide(HUNDRED,MC);}
    static Map<String,String> basic(BigDecimal price,BigDecimal cost){
        var values=map();values.put("price",decimal(price));values.put("unitCost",decimal(cost));
        BigDecimal contribution=price==null||price.signum()<=0||cost==null?null:price.subtract(cost);
        values.put("unitContribution",decimal(contribution));values.put("marginPercent",contribution==null?null:decimal(contribution.divide(price,MC).multiply(HUNDRED)));
        return values;
    }
    static Map<String,String> project(BigDecimal price,BigDecimal cost,BigDecimal count,BigDecimal extra,BigDecimal discount,BigDecimal tax,BigDecimal fee,BigDecimal refund,BigDecimal fixed,BigDecimal target){
        var values=map();if(price==null||price.signum()<=0||cost==null)return values;
        BigDecimal taxFactor=BigDecimal.ONE.add(fraction(tax)),discountFactor=BigDecimal.ONE.subtract(fraction(discount));
        BigDecimal gross=price.multiply(discountFactor,MC),revenue=gross.divide(taxFactor,MC);
        BigDecimal contribution=revenue.subtract(cost).subtract(zero(extra)).subtract(gross.multiply(fraction(fee),MC));
        values.put("price",decimal(price));values.put("unitContribution",decimal(contribution));values.put("marginPercent",revenue.signum()==0?null:decimal(contribution.divide(revenue,MC).multiply(HUNDRED)));
        BigDecimal netRefund=zero(refund).divide(taxFactor,MC);
        if(count!=null){
            BigDecimal billings=gross.multiply(count,MC);if(zero(refund).compareTo(billings)>0)throw ApiException.invalid("Assumed refunds cannot exceed this scenario's gross billings.");
            values.put("grossBillings",decimal(billings));values.put("netSales",decimal(revenue.multiply(count,MC).subtract(netRefund)));
            values.put("netCashAfterFeesAndRefunds",decimal(billings.subtract(billings.multiply(fraction(fee),MC)).subtract(zero(refund))));
            values.put("totalContribution",decimal(contribution.multiply(count,MC).subtract(netRefund)));
        }
        values.put("breakEvenUnits",fixed==null||contribution.signum()<=0?null:fixed.add(netRefund).divide(contribution,0,RoundingMode.CEILING).toPlainString());
        BigDecimal denominator=target==null?null:discountFactor.multiply(BigDecimal.ONE.subtract(fraction(target)).divide(taxFactor,MC).subtract(fraction(fee)),MC);
        BigDecimal targetCost=cost.add(zero(extra));
        values.put("targetMarginPrice",denominator==null||denominator.signum()<=0||targetCost.signum()<=0?null:targetCost.divide(denominator,4,RoundingMode.CEILING).toPlainString());
        return values;
    }
    static Map<String,String> assumptions(Object... pairs){var result=map();for(int i=0;i<pairs.length;i+=2)if(pairs[i+1]!=null)result.put(pairs[i].toString(),pairs[i+1].toString());return result;}
    public static Result commerce(String id,String currency,BigDecimal price,BigDecimal cost,CommerceInput in){
        currency(in.currency(),currency);int days=in.periodDays()==null?30:in.periodDays();if(days<1||days>366)throw ApiException.invalid("Use a scenario period of 1–366 days.");
        amount(in.candidatePrice(),"Candidate price",true);units(in.currentUnits(),"Current-price units");units(in.scenarioUnits(),"Scenario units");
        amount(in.assumedUnitCost(),"Assumed unit cost",false);amount(in.extraUnitCost(),"Extra variable unit cost",false);amount(in.fixedCosts(),"Fixed costs",false);amount(in.refunds(),"Refunds",false);
        percent(in.discountPercent(),"Discount",true);percent(in.taxPercent(),"Tax",true);percent(in.feePercent(),"Payment fee",false);percent(in.targetMarginPercent(),"Target margin",false);
        var missing=new ArrayList<String>();var current=map();var scenario=map();BigDecimal usedCost=in.assumedUnitCost()==null?cost:in.assumedUnitCost();
        if(cost==null)missing.add("Recorded unit cost is missing. Add a cost or enter an explicitly assumed cost.");
        if(usedCost==null)missing.add("Contribution needs a known or explicitly assumed unit cost.");
        if(!Boolean.TRUE.equals(in.costsConfirmed()))missing.add("Confirm the simplified cost and refund assumptions to compare scenarios.");
        else if(usedCost!=null){
            current=project(price,usedCost,in.currentUnits(),in.extraUnitCost(),in.discountPercent(),in.taxPercent(),in.feePercent(),in.refunds(),in.fixedCosts(),in.targetMarginPercent());
            scenario=project(in.candidatePrice(),usedCost,in.scenarioUnits(),in.extraUnitCost(),in.discountPercent(),in.taxPercent(),in.feePercent(),in.refunds(),in.fixedCosts(),in.targetMarginPercent());
        }
        if(in.currentUnits()==null||in.scenarioUnits()==null)missing.add("Supply expected units at both prices for period totals; volumes are assumptions, not forecasts.");
        if(in.candidatePrice()==null)missing.add("Enter a candidate price to compare.");
        return new Result(VERSION,"ECOMMERCE",id,currency,days+" days",java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString(),Evidence.KNOWN_INPUT,Evidence.MERCHANT_ASSUMPTION,Evidence.CALCULATED_SCENARIO,basic(price,cost),current,scenario,
            assumptions("candidatePrice",in.candidatePrice(),"currentUnits",in.currentUnits(),"scenarioUnits",in.scenarioUnits(),"assumedUnitCost",in.assumedUnitCost(),"extraUnitCost",in.extraUnitCost(),"fixedCosts",in.fixedCosts(),"targetMarginPercent",in.targetMarginPercent(),"discountPercent",in.discountPercent(),"taxPercent",in.taxPercent(),"feePercent",in.feePercent(),"refunds",in.refunds(),"costsConfirmed",in.costsConfirmed()),missing,
            List.of("Not a predicted demand response. No optimized or recommended price.","Facts show current catalog price minus recorded cost, not historical sales profit.","Confirmation explicitly treats unentered tax, discount, shipping/extra cost, fees and refunds as zero for this scenario only.","Other business expenses excluded; fixed costs are used only for break-even. Refunds do not reverse costs or transaction fees."));
    }
    public static Result subscription(String id,String currency,String interval,String asOf,BigDecimal price,SubscriptionInput in){
        currency(in.currency(),currency);if(!Set.of("MONTHLY","YEARLY").contains(interval))throw ApiException.invalid("Use a monthly or annual recorded price.");
        amount(in.candidatePrice(),"Candidate billing-period price",true);amount(in.servicingCost(),"Servicing cost per subscriber per billing period",false);amount(in.fixedCosts(),"Fixed billing-period costs",false);amount(in.refunds(),"Billing-period refunds",false);percent(in.discountPercent(),"Discount",true);percent(in.feePercent(),"Payment fee",false);
        for(Integer n:Arrays.asList(in.retainedSubscribers(),in.newSubscribers(),in.cancellations()))if(n!=null&&(n<0||n>1000000))throw ApiException.invalid("Subscriber assumptions must be whole counts from 0–1,000,000.");
        var missing=new ArrayList<String>();var facts=map();facts.put("price",decimal(price));facts.put("monthlyPrice",decimal(interval.equals("YEARLY")?price.divide(new BigDecimal("12"),MC):price));
        var current=map();var scenario=map();
        if(!Boolean.TRUE.equals(in.costsConfirmed()))missing.add("Confirm the billing-period cost assumptions before calculating scenarios.");
        if(in.servicingCost()==null)missing.add("Enter servicing cost per subscriber per billing period, explicitly zero if none is assumed.");
        if(in.retainedSubscribers()==null||in.newSubscribers()==null||in.cancellations()==null)missing.add("Supply assumed starting subscribers, new subscribers and cancellations; none are inferred from price.");
        if(in.retainedSubscribers()!=null&&in.cancellations()!=null&&in.cancellations()>in.retainedSubscribers())throw ApiException.invalid("Cancellations cannot exceed assumed starting subscribers.");
        if(missing.isEmpty()){
            int currentCount=in.retainedSubscribers(),scenarioCount=currentCount-in.cancellations()+in.newSubscribers();if(scenarioCount>1000000)throw ApiException.invalid("Resulting subscribers exceed the scenario bound.");
            current=project(price,in.servicingCost(),BigDecimal.valueOf(currentCount),null,in.discountPercent(),null,in.feePercent(),in.refunds(),in.fixedCosts(),null);
            scenario=project(in.candidatePrice(),in.servicingCost(),BigDecimal.valueOf(scenarioCount),null,in.discountPercent(),null,in.feePercent(),in.refunds(),in.fixedCosts(),null);
            recurring(current,interval,currentCount,price,in.discountPercent());recurring(scenario,interval,scenarioCount,in.candidatePrice(),in.discountPercent());
        }
        if(in.candidatePrice()==null)missing.add("Enter a candidate price in the recorded billing period.");
        return new Result(VERSION,"SAAS_SUBSCRIPTION",id,currency,interval,asOf,Evidence.OBSERVED,Evidence.MERCHANT_ASSUMPTION,Evidence.CALCULATED_SCENARIO,facts,current,scenario,
            assumptions("candidatePrice",in.candidatePrice(),"retainedSubscribers",in.retainedSubscribers(),"newSubscribers",in.newSubscribers(),"cancellations",in.cancellations(),"servicingCost",in.servicingCost(),"fixedCosts",in.fixedCosts(),"discountPercent",in.discountPercent(),"feePercent",in.feePercent(),"refunds",in.refunds(),"costsConfirmed",in.costsConfirmed()),missing,
            List.of("No validated subscription price optimization model exists. Subscriber response is assumed, not predicted.","Every scenario count is assumed assigned to this price for a full billing period; existing subscribers do not automatically change plans.","Normalized recurring revenue is a scenario run rate, not recognized accounting revenue or cash collected. Ledger MRR/ARR remain unchanged.","Cash assumes full-period charges paid; tax and other expenses excluded. Refunds reduce cash/contribution without automatically reducing recurring run rate; fees and servicing costs are not reversed."));
    }
    static void recurring(Map<String,String> values,String interval,int count,BigDecimal price,BigDecimal discount){if(values.isEmpty())return;BigDecimal gross=price.multiply(BigDecimal.ONE.subtract(fraction(discount)),MC).multiply(BigDecimal.valueOf(count),MC);BigDecimal monthly=interval.equals("YEARLY")?gross.divide(new BigDecimal("12"),MC):gross;values.put("assumedSubscribers",Integer.toString(count));values.put("normalizedMonthlyRecurring",decimal(monthly));values.put("normalizedAnnualRecurring",decimal(monthly.multiply(new BigDecimal("12"))));}
    private GuidanceCalculator() {}
}
