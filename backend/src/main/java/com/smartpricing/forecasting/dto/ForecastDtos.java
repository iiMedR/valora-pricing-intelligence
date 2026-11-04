package com.smartpricing.forecasting.dto;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import java.time.LocalDate;
import java.util.*;

public final class ForecastDtos {
    private ForecastDtos() {}
    public record Window(LocalDate startDate,LocalDate endDate,String timezone,String currencyCode) {}
    public record Identity(UUID variantId,UUID productId,String productName,String name,String sku,String status,String productStatus) {}
    public record Day(LocalDate date,long units,long returnedUnits,String listedPrice,String effectivePrice,String priceSource,
            String availability,Integer observedStock,boolean censored,List<String> exclusions) {}
    public record Readiness(String status,int days,int eligibleDays,int unknownDays,int censoredDays,int zeroDays,
            int missingPriceDays,int discrepancyDays,int outlierDays,int distinctPrices,String minPrice,String maxPrice,
            List<String> reasons) {}
    public record Elasticity(String status,String method,Double estimate,Double logRmse,int samples,
            Double confidenceLow,Double confidenceHigh,Readiness readiness,List<String> reasons) {}
    public record Point(LocalDate date,String expectedUnits,Double lower,Double upper) {}
    public record Forecast(String status,String method,String target,String assumedPrice,String totalUnits,List<Point> daily,List<String> reasons) {}
    public record Detail(Identity variant,Window window,Readiness readiness,Elasticity elasticity,Forecast forecast,List<Day> history) {}
    public record Summary(Identity variant,Readiness readiness) {}
    public record Overview(Window window,PageView<Summary> results) {}
    public record ErrorMetrics(Double mae,Double wapePercent,Double bias,String predictedUnits) {}
    public record TestPoint(LocalDate date,long actualUnits,String modelUnits,String naiveUnits,String availability) {}
    public record Fold(LocalDate cutoff,LocalDate endDate,String status,int trainingDays,int evaluatedDays,int censoredDays,
            int unknownDays,long actualUnits,ErrorMetrics model,ErrorMetrics naive,List<TestPoint> daily,List<String> reasons) {}
    public record Backtest(Identity variant,Window window,int horizonDays,String target,List<Fold> folds) {}
}
