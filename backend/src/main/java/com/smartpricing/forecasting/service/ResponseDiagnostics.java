package com.smartpricing.forecasting.service;

import com.smartpricing.forecasting.dto.ForecastDtos.Day;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Versioned optimizer-only guardrails; not a causal test or calibrated significance test. */
public final class ResponseDiagnostics {
    public static final String VERSION="response-adequacy-v1";
    public static final double MAX_TIER_LOG_RESIDUAL=Math.log(1.10);
    public static List<String> assess(DemandModel.Analysis analysis,double rankTolerance,double stabilityDelta) {
        var eligible=analysis.history().stream().filter(d->d.exclusions().isEmpty()).toList();
        List<String> reasons=new ArrayList<>();
        try {
            var full=ControlledElasticity.fit(eligible,rankTolerance);
            if(full.maxPriceMeanResidual()==null)reasons.add("PRICE_RESPONSE_SHAPE_UNCHECKED");
            else if(full.maxPriceMeanResidual()>MAX_TIER_LOG_RESIDUAL)reasons.add("PRICE_RESPONSE_SHAPE_MISMATCH");
            var history=analysis.history();
            var midpoint=history.getFirst().date().plusDays((ChronoUnit.DAYS.between(history.getFirst().date(),history.getLast().date())+1)/2);
            var before=eligible.stream().filter(d->d.date().isBefore(midpoint)).toList();
            var after=eligible.stream().filter(d->!d.date().isBefore(midpoint)).toList();
            var early=ControlledElasticity.fit(before,rankTolerance);var late=ControlledElasticity.fit(after,rankTolerance);
            if(early.residualPriceSd()<.03||late.residualPriceSd()<.03||early.calendarR2()>.70||late.calendarR2()>.70)
                reasons.add("DISJOINT_PRICE_RESPONSE_UNCHECKED");
            else if(Math.abs(early.beta()-late.beta())>stabilityDelta)reasons.add("DISJOINT_PRICE_RESPONSE_UNSTABLE");
        } catch(IllegalArgumentException|NoSuchElementException ex) {reasons.add("DISJOINT_PRICE_RESPONSE_UNCHECKED");}
        return List.copyOf(reasons);
    }
    private ResponseDiagnostics() {}
}
