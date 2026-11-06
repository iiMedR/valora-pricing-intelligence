package com.smartpricing.onboarding;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.forecasting.dto.ForecastDtos;
import com.smartpricing.shopify.sync.SyncCoordinator;
import java.time.*;
import java.util.*;

public final class ReadinessDtos {
    private ReadinessDtos(){}
    public enum State { UNKNOWN,MISSING,STALE,INSUFFICIENT,CONFLICTING,AVAILABLE }
    public record Finding(State status,String code,String message,String provenance){}
    public record Check(String code,int priority,String message,String href){}
    public record Window(LocalDate startDate,LocalDate endDate,Instant modelAsOf,Instant assessedAt,String currencyCode){}
    public record Coverage(long orders,long lines,long knownCostLines,long salesDays,LocalDate firstSale,LocalDate lastSale,long merchandiseRefunds){}
    public record Inputs(String currentPrice,String currentCost,String minimum,String maximum,Integer stock,Instant stockObservedAt,String costSource,Instant costRecordedAt,String mappingSource,String providerSku,boolean localEditConflict){}
    public record Variant(ForecastDtos.Identity variant,Inputs inputs,Coverage coverage,Map<String,Finding> dimensions,
        Finding analytics,Finding forecasting,Finding optimization,String forecastStatus,String optimizationStatus,
        ForecastDtos.Readiness demandDiagnostics,List<String> forecastReasons,List<String> optimizationReasons,
        String catalogHref,String historyHref){}
    public record Variants(Window window,boolean synthetic,String scope,String filter,PageView<Variant> results){}
    public record Detail(Window window,boolean synthetic,String scope,Variant assessment){}
    public record Summary(Window window,boolean synthetic,String scope,String workflowState,String workflowExplanation,
        String connectionStatus,SyncCoordinator.Status synchronization,Map<String,Long> counts,List<Check> checklist,
        String liveValidation,List<String> limitations){}
}
