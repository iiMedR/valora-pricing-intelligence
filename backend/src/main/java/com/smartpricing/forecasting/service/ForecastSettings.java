package com.smartpricing.forecasting.service;

import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("app.forecasting")
public record ForecastSettings(
        @DefaultValue("28") @Min(14) @Max(56) int minBaselineDays,
        @DefaultValue("56") @Min(56) @Max(180) int lookbackDays,
        @DefaultValue("90") @Min(30) @Max(365) int minFitDays,
        @DefaultValue("3") @Min(3) @Max(10) int minDistinctPrices,
        @DefaultValue("0.15") @DecimalMin("0.05") @DecimalMax("1") double minSpread,
        @DefaultValue("0.20") @DecimalMin("0") @DecimalMax("0.5") double maxUnknownShare,
        @DefaultValue("0.20") @DecimalMin("0") @DecimalMax("0.5") double maxCensoredShare,
        @DefaultValue("0.02") @DecimalMin("0") @DecimalMax("0.1") double maxPriceDiscrepancy,
        @DefaultValue("0.35") @DecimalMin("0.05") @DecimalMax("1") double maxLogRmse,
        @DefaultValue("5") @DecimalMin("1") @DecimalMax("10") double maxAbsoluteElasticity,
        @DefaultValue("0.00000001") @DecimalMin("0.000000000001") @DecimalMax("0.001") double rankTolerance,
        @DefaultValue("4") @DecimalMin("2") @DecimalMax("10") double outlierFactor,
        @DefaultValue("3") @Min(1) @Max(14) int minWeekdaySamples) {
    public static ForecastSettings defaults() { return new ForecastSettings(28,56,90,3,.15,.2,.2,.02,.35,5,1e-8,4,3); }
}
