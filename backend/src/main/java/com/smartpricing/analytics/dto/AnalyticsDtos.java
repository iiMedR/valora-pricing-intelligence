package com.smartpricing.analytics.dto;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import java.time.*;
import java.util.*;

public final class AnalyticsDtos {
    private AnalyticsDtos() {}
    public enum Granularity { DAY, MONTH }
    public enum Sort { NET_DESC, GROSS_DESC, NAME_ASC }
    public record Range(LocalDate startDate, LocalDate endDate, String timezone, String currencyCode) {}
    public record Metrics(String grossSales, String refundAmount, String netSales, long unitsSold,
            long unitsRefunded, long orders, String grossAverageOrderValue, long salesLines, long knownCostLines,
            long refundEvents, long knownCostRefundEvents, String knownCostSales, String knownCostRefunds,
            String knownCostNetSales, String historicalSoldCost, String knownContributionBeforeReturnRecovery,
            String knownContributionMarginPercent, String salesCostCoveragePercent, String costCoverageState) {}
    public record Overview(Range range, Metrics metrics) {}
    public record Bucket(LocalDate date, Metrics metrics) {}
    public record Trends(Range range, Granularity granularity, List<Bucket> content) {}
    public record Performance(UUID productId, UUID variantId, String name, String sku, String status,
            String productStatus, Metrics metrics) {}
    public record PerformancePage(Range range, PageView<Performance> results) {}
    public record Stock(UUID productId, UUID variantId, String productName, String name, String sku,
            String status, String productStatus, Integer quantityAvailable, Instant observedAt,
            String stockState, boolean stale) {}
    public record StockSummary(long variants, long stockouts, long unknown, long uncertain, long stale) {}
    public record Inventory(Range range, Instant asOf, int staleAfterHours, StockSummary summary, PageView<Stock> results) {}
}
