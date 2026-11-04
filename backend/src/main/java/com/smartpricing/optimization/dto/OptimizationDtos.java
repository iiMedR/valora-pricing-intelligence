package com.smartpricing.optimization.dto;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import java.time.*;
import java.util.*;

public final class OptimizationDtos {
    private OptimizationDtos() {}
    public enum Status { ACTIONABLE,DIAGNOSTIC_ONLY,INSUFFICIENT_DATA,UNRELIABLE_ELASTICITY,MISSING_COST,MISSING_PRICE,INACTIVE_VARIANT,INVALID_CONSTRAINTS,UNAVAILABLE_FORECAST }
    public record Inputs(String currentPrice,String unitCost,Instant priceEffectiveFrom,Instant costEffectiveFrom,
            Integer stockCap,Instant stockObservedAt,String stockQuality,String catalogMin,String catalogMax,String lowerBound,String upperBound,String referenceUnits) {}
    public record Scenario(String price,String expectedUnits,String estimatedContribution) {}
    public record Comparison(Scenario current,Scenario candidate,String estimatedUplift,String estimatedUpliftPercent) {}
    public record Evaluation(Identity variant,Window window,int horizonDays,Instant evaluationInstant,String modelVersion,
            Status status,List<String> reasons,List<String> assumptions,Inputs inputs,String recommendedPrice,
            Comparison comparison,Elasticity elasticity,Forecast forecast,List<Fold> backtests,List<Scenario> sensitivity) {}
    public record Overview(Window window,int horizonDays,String countScope,Map<Status,Long> statusCounts,PageView<Evaluation> results) {}
}
