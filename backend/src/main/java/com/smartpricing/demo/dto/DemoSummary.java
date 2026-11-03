package com.smartpricing.demo.dto;

import java.time.LocalDate;
import java.util.List;

public record DemoSummary(String generatorVersion,long seed,LocalDate startDate,LocalDate endDate,
        int categories,int products,int variants,long orders,long orderLines,long refunds,
        long priceObservations,long costObservations,long inventoryObservations,long unknownCostLines,
        long zeroSalesVariantDates,String checksum,List<ScenarioSummary> scenarios) {
    public record ScenarioSummary(String scenario,int products,long orders,long observedUnits,long refunds,long inventoryObservations) {}
}
