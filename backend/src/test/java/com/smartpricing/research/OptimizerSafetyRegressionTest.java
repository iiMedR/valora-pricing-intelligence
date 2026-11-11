package com.smartpricing.research;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.*;
import com.smartpricing.optimization.service.*;
import com.smartpricing.optimization.repository.OptimizationRepository.Market;
import com.smartpricing.optimization.dto.OptimizationDtos.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class OptimizerSafetyRegressionTest {
    final DemandModel model=new DemandModel(ForecastSettings.defaults());
    final OptimizationService current=new OptimizationService(null,model,null,new ContributionOptimizer(),OptimizationSettings.defaults());
    final FrozenOptimizationService prior=new FrozenOptimizationService(null,model,null,new ContributionOptimizer(),OptimizationSettings.defaults());
    ForecastService.Input input(List<Day> days){return new ForecastService.Input(new Identity(UUID.nameUUIDFromBytes("safety-variant".getBytes()),UUID.nameUUIDFromBytes("safety-product".getBytes()),"Independent safety fixture","Standard","SAFETY","ACTIVE","ACTIVE"),new Window(days.getFirst().date(),days.getLast().date().plusDays(1),"UTC","MAD"),days);}
    Market market(List<Day> days,boolean missing){Instant at=days.getLast().date().atStartOfDay(ZoneOffset.UTC).toInstant();return new Market(new BigDecimal("50"),new BigDecimal("150"),new BigDecimal("100"),missing?null:new BigDecimal("40"),at,at,1000000,at,"SNAPSHOT");}
    Evaluation evaluate(ResearchFixtures.Kind kind,long seed){var f=ResearchFixtures.generate(kind,seed);return current.evaluate(input(f.observations()),market(f.observations(),kind==ResearchFixtures.Kind.REFUNDS_MISSING_COST),30);}
    void regression(ResearchFixtures.Kind kind,long seed,String reason){
        var f=ResearchFixtures.generate(kind,seed);var days=f.observations();
        assertThat(prior.evaluate(input(days),market(days,false),30).status()).isEqualTo(Status.ACTIONABLE);
        var actual=evaluate(kind,seed);assertThat(actual.status()).isNotEqualTo(Status.ACTIONABLE);
        assertThat(actual.reasons()).contains(reason);assertThat(actual.recommendedPrice()).isNull();assertThat(actual.comparison()).isNull();assertThat(actual.sensitivity()).isEmpty();
    }
    @Test void hiddenMarketing1001AbstainsOnResponseShape(){regression(ResearchFixtures.Kind.HIDDEN_MARKETING,1001,"PRICE_RESPONSE_SHAPE_MISMATCH");}
    @Test void hiddenMarketing1012AbstainsOnResponseShape(){regression(ResearchFixtures.Kind.HIDDEN_MARKETING,1012,"PRICE_RESPONSE_SHAPE_MISMATCH");}
    @Test void structural1001AbstainsOnDisjointStability(){regression(ResearchFixtures.Kind.STRUCTURAL,1001,"DISJOINT_PRICE_RESPONSE_UNSTABLE");}
    @Test void structural1003AbstainsOnDisjointStability(){regression(ResearchFixtures.Kind.STRUCTURAL,1003,"DISJOINT_PRICE_RESPONSE_UNSTABLE");}
    @Test void structural1007AbstainsOnDisjointStability(){regression(ResearchFixtures.Kind.STRUCTURAL,1007,"DISJOINT_PRICE_RESPONSE_UNSTABLE");}
    @Test void structural1008AbstainsOnDisjointStability(){regression(ResearchFixtures.Kind.STRUCTURAL,1008,"DISJOINT_PRICE_RESPONSE_UNSTABLE");}
    @Test void developmentProbesAndPriorNegativeControlsWithhold(){
        assertThat(evaluate(ResearchFixtures.Kind.HIDDEN_MARKETING,23).status()).isNotEqualTo(Status.ACTIONABLE);
        assertThat(evaluate(ResearchFixtures.Kind.STRUCTURAL,11).status()).isNotEqualTo(Status.ACTIONABLE);
        for(var kind:List.of(ResearchFixtures.Kind.SEASONAL_CONFOUNDED,ResearchFixtures.Kind.N5_THREE,ResearchFixtures.Kind.STOCKOUT,ResearchFixtures.Kind.REFUNDS_MISSING_COST,ResearchFixtures.Kind.PROMO_DISCREPANCY,ResearchFixtures.Kind.OUTLIERS))assertThat(evaluate(kind,17).status()).as(kind.name()).isNotEqualTo(Status.ACTIONABLE);
    }
    @Test void genuineIndependentCyclicPriceFixtureStillAllowsNinety(){
        List<Day> days=new ArrayList<>();for(int i=0;i<365;i++){var date=LocalDate.of(2025,1,1).plusDays(i);double price=i>=243?100:new double[]{80,100,120}[(date.getDayOfYear())%3];long units=Math.round(1000000/(price*price));String p=ResearchFixtures.amount(price);days.add(new Day(date,units,0,p,p,"INDEPENDENT_CYCLIC","IN_STOCK",1000000,false,List.of()));}
        var result=current.evaluate(input(days),market(days,false),7);assertThat(result.status()).as(result.reasons().toString()).isEqualTo(Status.ACTIONABLE);assertThat(result.recommendedPrice()).isEqualTo("90.0000");
    }
    @Test void reportAllClassesOnKnownAndProspectiveSplitsWithoutTuning()throws Exception {
        StringBuilder csv=new StringBuilder("split,scenario,seed,fixtureHash,unsafe,httpWindowSupported,oldStatus,newStatus,oldPrice,newPrice,blockers\n");
        for(String split:List.of("DEV","KNOWN_REGRESSION","PROSPECTIVE")){
            long[] seeds=split.equals("DEV")?ResearchFixtures.DEV:split.equals("KNOWN_REGRESSION")?ResearchFixtures.TEST:java.util.stream.LongStream.rangeClosed(2001,2020).toArray();
            for(long seed:seeds)for(var kind:ResearchFixtures.Kind.values()){
                var f=ResearchFixtures.generate(kind,seed);var days=f.observations();var in=input(days);var m=market(days,kind==ResearchFixtures.Kind.REFUNDS_MISSING_COST);
                var old=prior.evaluate(in,m,30);var now=current.evaluate(in,m,30);
                boolean api=days.size()<=731&&!in.window().endDate().isAfter(LowDataBenchmarkTest.BENCHMARK_AS_OF.plusDays(1));
                csv.append(LowDataBenchmarkTest.csv(split,kind,seed,f.hash(),f.truth().shouldAbstain(),api,old.status(),now.status(),old.recommendedPrice(),now.recommendedPrice(),String.join(";",now.reasons())));
            }
        }
        LowDataBenchmarkTest.save("optimizer-safety.csv",csv.toString());
    }
}
