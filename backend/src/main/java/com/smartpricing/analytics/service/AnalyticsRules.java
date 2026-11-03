package com.smartpricing.analytics.service;

import com.smartpricing.analytics.dto.AnalyticsDtos.*;
import com.smartpricing.common.ApiException;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;

public final class AnalyticsRules {
    private AnalyticsRules() {}
    public static void range(LocalDate start, LocalDate end) {
        if (start == null || end == null || !start.isBefore(end) || ChronoUnit.DAYS.between(start,end)>731
                || start.getYear()<1900 || end.getYear()>2200)
            throw ApiException.invalid("Use an increasing UTC date range of at most 731 days, within 1900–2200.");
    }
    public static void page(int page,int size,String search) {
        if(page<0 || page>100000 || size<1 || size>100 || search.length()>100)
            throw ApiException.invalid("Page must be 0–100000, size 1–100, search at most 100 characters.");
    }
    public static String money(BigDecimal value) { return value==null?null:value.setScale(4,RoundingMode.HALF_UP).toPlainString(); }
    public static String ratio(BigDecimal numerator,BigDecimal denominator,boolean percent) {
        if(denominator.signum()<=0) return null;
        return numerator.multiply(percent?new BigDecimal("100"):BigDecimal.ONE).divide(denominator,4,RoundingMode.HALF_UP).toPlainString();
    }
    public static Metrics metrics(BigDecimal gross, BigDecimal refunds, long units, long returned, long orders,
            long lines,long knownLines,long refundEvents,long knownRefundEvents,BigDecimal knownSales,
            BigDecimal knownRefunds,BigDecimal soldCost) {
        BigDecimal knownNet=knownSales.subtract(knownRefunds), contribution=knownNet.subtract(soldCost);
        long total=lines+refundEvents,known=knownLines+knownRefundEvents;
        String coverage=total==0?"NO_ACTIVITY":known==0?"UNKNOWN":known==total?"COMPLETE":"PARTIAL";
        return new Metrics(money(gross),money(refunds),money(gross.subtract(refunds)),units,returned,orders,
                ratio(gross,BigDecimal.valueOf(orders),false),lines,knownLines,refundEvents,knownRefundEvents,
                money(knownSales),money(knownRefunds),money(knownNet),money(soldCost),known==0?null:money(contribution),
                known==0?null:ratio(contribution,knownNet,true),ratio(BigDecimal.valueOf(knownLines),BigDecimal.valueOf(lines),true),coverage);
    }
    public static Metrics empty() { return metrics(BigDecimal.ZERO,BigDecimal.ZERO,0,0,0,0,0,0,0,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO); }
}
