package com.smartpricing.history.service;

import com.smartpricing.common.ApiException;
import com.smartpricing.history.dto.HistoryDtos.*;
import com.smartpricing.sales.dto.SalesDtos.OrderStatus;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;

public final class HistoryRules {
    private HistoryRules() {}
    public static BigDecimal money(BigDecimal amount, boolean nullable, boolean positive) {
        if (amount == null) {
            if (nullable) return null;
            throw ApiException.invalid("A monetary amount is required.");
        }
        if (amount.signum()<0 || (positive && amount.signum()==0) || amount.scale()>4 || amount.precision()-amount.scale()>15)
            throw ApiException.invalid("Money must be " + (positive ? "positive" : "nonnegative") + " with at most 15 integer digits and 4 decimal places.");
        return amount.setScale(4, RoundingMode.UNNECESSARY);
    }
    public static BigDecimal lineNet(BigDecimal unitPrice, int quantity, BigDecimal discount) {
        if (quantity<1 || quantity>1000000) throw ApiException.invalid("Quantity must be between 1 and 1000000.");
        BigDecimal gross = money(money(unitPrice,false,false).multiply(BigDecimal.valueOf(quantity)),false,false);
        BigDecimal net = gross.subtract(money(discount,false,false));
        return money(net,false,false);
    }
    public static BigDecimal recognized(OrderStatus status, BigDecimal net) {
        return status==OrderStatus.COMPLETED ? net : BigDecimal.ZERO.setScale(4);
    }
    public record CostSnapshot(BigDecimal amount, String provenance) {}
    public static CostSnapshot cost(BigDecimal provided, BigDecimal effectiveHistory) {
        return provided!=null ? new CostSnapshot(provided,"PROVIDED")
                : effectiveHistory!=null ? new CostSnapshot(effectiveHistory,"EFFECTIVE_HISTORY") : new CostSnapshot(null,"UNKNOWN");
    }
    public static String decimal(BigDecimal amount) { return amount==null ? null : amount.toPlainString(); }
    public static Instant time(Instant instant) {
        if (instant==null || instant.isAfter(Instant.now())) throw ApiException.invalid("Observation/transaction timestamps must be present and not in the future.");
        return instant.truncatedTo(ChronoUnit.MICROS);
    }
    public static void period(Instant from, Instant to, Quality quality) {
        time(from);
        if(to!=null) { time(to); if(!to.isAfter(from)) throw ApiException.invalid("validTo must be later than validFrom."); }
        if(quality!=Quality.VERIFIED_CHANGE && to!=null) throw ApiException.invalid("Snapshots/inferred entries are point observations, not effective periods.");
    }
    public static boolean overlaps(Instant a, Instant endA, Instant b, Instant endB) {
        return (endB==null || a.isBefore(endB)) && (endA==null || b.isBefore(endA));
    }
    public static void reference(Source source, String ref) {
        if(source==null || (ref!=null && (ref.isBlank() || !ref.equals(ref.strip()) || ref.length()>160))
                || (source!=Source.MANUAL && ref==null)) throw ApiException.invalid("Source reference must be nonblank, unpadded, at most 160 characters; provider sources require a reference.");
    }
    public static String stockState(int quantity, Quality quality) {
        if(quantity<0) throw ApiException.invalid("Inventory cannot be negative.");
        return quality==Quality.INFERRED ? "UNCERTAIN" : quantity==0 ? "KNOWN_STOCKOUT" : "AVAILABLE";
    }
    public static void page(int page,int size) { if(page<0 || size<1 || size>100) throw ApiException.invalid("Page must be nonnegative; size must be 1–100."); }
    public static void dates(Instant from,Instant to) {
        if(from!=null && to!=null && !to.isAfter(from)) throw ApiException.invalid("Date filter end must be after start ([from,to)).");
    }
}
