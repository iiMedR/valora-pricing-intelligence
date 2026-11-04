package com.smartpricing.optimization.service;

import com.smartpricing.optimization.dto.OptimizationDtos.*;
import com.smartpricing.optimization.dto.OptimizationDtos.Overview;
import com.smartpricing.optimization.repository.OptimizationRepository;
import com.smartpricing.optimization.repository.OptimizationRepository.Market;
import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.*;
import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.common.ApiException;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.smartpricing.optimization.service.ContributionOptimizer.decimal;

@Service
@EnableConfigurationProperties(OptimizationSettings.class)
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class OptimizationService {
    private final ForecastService forecasts;private final DemandModel model;private final OptimizationRepository repository;
    private final ContributionOptimizer optimizer;private final OptimizationSettings settings;
    public OptimizationService(ForecastService forecasts,DemandModel model,OptimizationRepository repository,ContributionOptimizer optimizer,OptimizationSettings settings){this.forecasts=forecasts;this.model=model;this.repository=repository;this.optimizer=optimizer;this.settings=settings;}
    private LocalDate end(LocalDate end){return end==null?LocalDate.now(ZoneOffset.UTC):end;}
    private LocalDate start(LocalDate start,LocalDate end){return start==null?end.minusDays(365):start;}
    private void horizon(int days){if(days!=7&&days!=14&&days!=30)throw ApiException.invalid("horizonDays must be 7, 14 or 30.");}
    public Overview overview(LocalDate startDate,LocalDate endDate,int horizon,int page,int size,String search){
        horizon(horizon);var end=end(endDate);var batch=forecasts.batch(start(startDate,end),end,page,size,search);
        var ids=batch.identities().content().stream().map(Identity::variantId).toList();var inputs=repository.inputs(ids,instant(end),batch.window().currencyCode());
        var rows=batch.identities().content().stream().map(v->evaluate(new ForecastService.Input(v,batch.window(),batch.series().get(v.variantId())),inputs.get(v.variantId()),horizon)).toList();
        Map<Status,Long> counts=new EnumMap<>(Status.class);for(Status s:Status.values())counts.put(s,rows.stream().filter(r->r.status()==s).count());
        var old=batch.identities();return new Overview(batch.window(),horizon,"CURRENT_PAGE",counts,new PageView<>(rows,page,size,old.totalElements(),old.totalPages()));
    }
    public Evaluation recommendation(UUID id,LocalDate startDate,LocalDate endDate,int horizon){
        horizon(horizon);var end=end(endDate);var input=forecasts.input(id,start(startDate,end),end);
        return evaluate(input,repository.inputs(List.of(id),instant(end),input.window().currencyCode()).get(id),horizon);
    }
    private Instant instant(LocalDate end){return end.atStartOfDay(ZoneOffset.UTC).toInstant().minusNanos(1000);}
    public Evaluation evaluate(ForecastService.Input input,Market market,int horizon){
        horizon(horizon);var days=input.days();var identity=input.variant();var at=instant(input.window().endDate());
        var analysis=model.analyze(days);var elasticity=analysis.elasticity();var r=analysis.readiness();
        var forecast=model.forecast(days,input.window().endDate(),horizon,!identity.status().equals("ACTIVE")||!identity.productStatus().equals("ACTIVE"));
        var folds=model.backtest(days,input.window().endDate(),horizon);
        LinkedHashMap<String,Status> blockers=new LinkedHashMap<>();
        if(!identity.status().equals("ACTIVE")||!identity.productStatus().equals("ACTIVE"))blockers.put("CURRENT_CATALOG_INACTIVE",Status.INACTIVE_VARIANT);
        if(market==null||market.price()==null||market.price().signum()<=0||old(market.priceFrom(),at,Duration.ofDays(settings.maxPriceAgeDays())))blockers.put("MISSING_OR_STALE_EFFECTIVE_PRICE",Status.MISSING_PRICE);
        if(market==null||market.cost()==null||market.cost().signum()<0||old(market.costFrom(),at,Duration.ofDays(settings.maxCostAgeDays())))blockers.put("MISSING_OR_STALE_EFFECTIVE_COST",Status.MISSING_COST);
        if(r.status().equals("INSUFFICIENT_DATA"))blockers.put("INSUFFICIENT_DEMAND_EVIDENCE",Status.INSUFFICIENT_DATA);
        Double e=elasticity.estimate();
        if(e==null||!Double.isFinite(e)||e>=0||!elasticity.status().equals("READY"))blockers.put("ELASTICITY_NOT_TRUSTWORTHY",Status.UNRELIABLE_ELASTICITY);
        BigDecimal lower=null,upper=null;
        if(market!=null&&market.price()!=null&&market.cost()!=null&&r.minPrice()!=null&&r.maxPrice()!=null){
            BigDecimal change=BigDecimal.valueOf(settings.maxPriceChange());
            lower=market.min().max(market.cost()).max(new BigDecimal(r.minPrice())).max(market.price().multiply(BigDecimal.ONE.subtract(change))).setScale(4,RoundingMode.CEILING);
            upper=market.max().min(new BigDecimal(r.maxPrice())).min(market.price().multiply(BigDecimal.ONE.add(change))).setScale(4,RoundingMode.FLOOR);
            if(lower.signum()<=0||lower.compareTo(upper)>0||upper.compareTo(market.cost())<=0)blockers.put("NO_PROFITABLE_FEASIBLE_GRID",Status.INVALID_CONSTRAINTS);
        }else blockers.put("PRICE_SUPPORT_OR_CONSTRAINTS_UNAVAILABLE",Status.INVALID_CONSTRAINTS);
        BigDecimal q=forecast.totalUnits()==null?null:new BigDecimal(forecast.totalUnits());
        if(q==null||q.signum()<=0||forecast.daily().size()!=horizon)blockers.put("NO_POSITIVE_SUPPORTED_FORECAST",Status.UNAVAILABLE_FORECAST);
        if(elasticity.reasons().stream().anyMatch(s->s.contains("CALENDAR_CONFOUNDING")||s.contains("CALENDAR_COLLINEARITY")))blockers.put("SEASONAL_OR_CALENDAR_CONFOUNDING",Status.DIAGNOSTIC_ONLY);
        if(r.eligibleDays()<settings.minEligibleDays()||r.days()==0||(double)r.eligibleDays()/r.days()<settings.minCoverage())blockers.put("LOW_ELIGIBLE_COVERAGE",Status.DIAGNOSTIC_ONLY);
        if(r.days()>0&&((double)r.unknownDays()/r.days()>settings.maxUnknownShare()||(double)r.censoredDays()/r.days()>settings.maxCensoredShare()))blockers.put("CRITICAL_STOCK_COVERAGE",Status.DIAGNOSTIC_ONLY);
        if(r.zeroDays()>0||r.discrepancyDays()>0||r.outlierDays()>0)blockers.put("ZERO_DISCREPANCY_OR_OUTLIER_SELECTION",Status.DIAGNOSTIC_ONLY);
        if(e!=null&&days.size()>28){
            Double earlier=model.analyze(days.subList(0,days.size()-28)).elasticity().estimate();
            if(earlier==null||Math.abs(e-earlier)>settings.maxStabilityDelta())blockers.put("ELASTICITY_SUBWINDOW_UNSTABLE",Status.DIAGNOSTIC_ONLY);
        }
        if(folds.size()!=2||folds.stream().anyMatch(f->!f.status().equals("EVALUATED")||f.censoredDays()>0||f.unknownDays()>0||f.model()==null||f.naive()==null||f.model().wapePercent()==null||f.model().wapePercent()>settings.maxBacktestWape()||f.model().mae()>settings.maxBacktestMaeRatio()*f.naive().mae()))blockers.put("BACKTEST_EVIDENCE_INSUFFICIENT",Status.DIAGNOSTIC_ONLY);
        if(market==null||market.stock()==null||market.stock()<=0||"INFERRED".equals(market.stockQuality())||old(market.stockAt(),at,Duration.ofHours(settings.maxStockAgeHours())))blockers.put("NO_FRESH_TRUSTED_POSITIVE_STOCK",Status.DIAGNOSTIC_ONLY);
        if(market!=null&&market.price()!=null&&market.price().signum()>0){
            if(forecast.assumedPrice()==null||mismatch(new BigDecimal(forecast.assumedPrice()),market.price()))blockers.put("FORECAST_REFERENCE_PRICE_MISMATCH",Status.DIAGNOSTIC_ONLY);
            var baseline=model.baselineTraining(analysis);
            if(baseline.isEmpty()||baseline.stream().anyMatch(d->d.effectivePrice()==null||mismatch(new BigDecimal(d.effectivePrice()),market.price())))blockers.put("RECENT_PRICE_MIX_NOT_REFERENCE_DEMAND",Status.DIAGNOSTIC_ONLY);
        }
        Status status=blockers.isEmpty()?Status.ACTIONABLE:blockers.values().iterator().next();
        Comparison comparison=null;String recommended=null;List<Scenario> sensitivity=List.of();
        if(blockers.isEmpty()){
            try{
                var core=new ContributionOptimizer.Input(market.price(),q,market.cost(),e,lower,upper,BigDecimal.valueOf(market.stock()));
                var current=optimizer.at(core,market.price());var candidate=optimizer.optimize(core);BigDecimal uplift=candidate.contribution().subtract(current.contribution());
                if(uplift.signum()<0){status=Status.DIAGNOSTIC_ONLY;blockers.put("NO_SUPPORTED_CONTRIBUTION_IMPROVEMENT",status);}
                else{
                    recommended=decimal(candidate.price());comparison=new Comparison(scenario(current),scenario(candidate),decimal(uplift),current.contribution().signum()<=0?null:decimal(uplift.multiply(new BigDecimal("100")).divide(current.contribution(),12,RoundingMode.HALF_UP)));
                    List<Scenario> points=new ArrayList<>();Set<BigDecimal> seen=new HashSet<>();
                    for(int i=0;i<=20;i++){BigDecimal price=lower.add(upper.subtract(lower).multiply(BigDecimal.valueOf(i)).divide(new BigDecimal("20"),4,RoundingMode.HALF_UP)).setScale(4,RoundingMode.HALF_UP);if(seen.add(price))points.add(scenario(optimizer.at(core,price)));}sensitivity=List.copyOf(points);
                }
            }catch(IllegalArgumentException ex){status=Status.DIAGNOSTIC_ONLY;blockers.put("INVALID_OR_NONFINITE_MODEL_OUTPUT",status);}
        }
        if(status!=Status.ACTIONABLE){recommended=null;comparison=null;sensitivity=List.of();}
        var inputs=new Inputs(market==null?null:decimal(market.price()),market==null?null:decimal(market.cost()),market==null?null:market.priceFrom(),market==null?null:market.costFrom(),market==null?null:market.stock(),market==null?null:market.stockAt(),market==null?null:market.stockQuality(),market==null?null:decimal(market.min()),market==null?null:decimal(market.max()),decimal(lower),decimal(upper),decimal(q));
        return new Evaluation(identity,input.window(),horizon,at,"constrained-contribution-v1",status,List.copyOf(blockers.keySet()),List.of("OBSERVED_SALES_CONDITIONAL_ON_AVAILABILITY","NO_CAUSAL_ELASTICITY_PROOF","NO_CALIBRATED_INTERVAL","HORIZON_STOCK_CAP_NO_REPLENISHMENT","EXCLUDES_RETURNS_TAX_SHIPPING_FEES_MARKETING_OVERHEAD","CURRENT_CATALOG_POLICIES_EVENT_TIME_HISTORY","ESTIMATED_NOT_REALIZED_UPLIFT"),inputs,recommended,comparison,elasticity,forecast,folds,sensitivity);
    }
    private boolean old(Instant from,Instant at,Duration age){return from==null||from.isAfter(at)||from.isBefore(at.minus(age));}
    private boolean mismatch(BigDecimal actual,BigDecimal reference){return actual.subtract(reference).abs().divide(reference,12,RoundingMode.HALF_UP).compareTo(BigDecimal.valueOf(settings.maxReferenceMismatch()))>0;}
    private Scenario scenario(ContributionOptimizer.Projection p){return new Scenario(decimal(p.price()),decimal(p.units()),decimal(p.contribution()));}
}
