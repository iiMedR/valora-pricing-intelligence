package com.smartpricing.optimization.service;

import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("app.optimization")
public record OptimizationSettings(
        @DefaultValue("180") @Min(90) @Max(731) int minEligibleDays,
        @DefaultValue("0.80") @DecimalMin("0.5") @DecimalMax("1") double minCoverage,
        @DefaultValue("0.10") @DecimalMin("0") @DecimalMax("0.2") double maxUnknownShare,
        @DefaultValue("0.05") @DecimalMin("0") @DecimalMax("0.1") double maxCensoredShare,
        @DefaultValue("120") @Min(1) @Max(365) int maxPriceAgeDays,
        @DefaultValue("210") @Min(1) @Max(365) int maxCostAgeDays,
        @DefaultValue("24") @Min(1) @Max(24) int maxStockAgeHours,
        @DefaultValue("0.10") @DecimalMin("0.0001") @DecimalMax("0.2") double maxPriceChange,
        @DefaultValue("0.02") @DecimalMin("0") @DecimalMax("0.05") double maxReferenceMismatch,
        @DefaultValue("30") @DecimalMin("0") @DecimalMax("50") double maxBacktestWape,
        @DefaultValue("1.10") @DecimalMin("1") @DecimalMax("1.2") double maxBacktestMaeRatio,
        @DefaultValue("0.25") @DecimalMin("0.05") @DecimalMax("0.5") double maxStabilityDelta) {
    public static OptimizationSettings defaults(){return new OptimizationSettings(180,.8,.1,.05,120,210,24,.1,.02,30,1.1,.25);}
}
