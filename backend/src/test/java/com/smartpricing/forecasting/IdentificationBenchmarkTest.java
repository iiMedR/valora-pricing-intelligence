package com.smartpricing.forecasting;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

/** experimental-v1: independent of demo generator, fixed seeds and predeclared .12 error tolerance. */
class IdentificationBenchmarkTest {
    final DemandModel model=new DemandModel(ForecastSettings.defaults());
    final LegacyDemandModel old=new LegacyDemandModel(ForecastSettings.defaults());
    static List<Day> fixture(double beta,long seed,String scenario) {
        Random random=new Random(seed);List<Day> rows=new ArrayList<>();
        for(int i=0;i<365;i++) {
            LocalDate date=LocalDate.of(2025,1,1).plusDays(i);double phase=2*Math.PI*i/365.2425;
            double price=new double[]{80,100,120}[random.nextInt(3)];
            if(scenario.equals("CONFOUNDED"))price=100*Math.exp(.25*Math.sin(phase));
            if(scenario.equals("CONSTANT"))price=100;
            // Day-of-week price policy is independent of season; explicit controls must separate it.
            if(scenario.equals("SEASONAL")&&date.getDayOfWeek()==DayOfWeek.MONDAY)price*=1.12;
            double logUnits=Math.log(200)+beta*Math.log(price/100)+.3*Math.sin(phase)+.15*i/365.2425
                    +(date.getDayOfWeek()==DayOfWeek.MONDAY?.3:0)+random.nextGaussian()*.03;
            long units=Math.round(Math.exp(logUnits));String listed=String.format(Locale.ROOT,"%.4f",price);
            String effective=listed;boolean censored=false;
            if(scenario.equals("PROMOTION")&&i%3==0){effective=String.format(Locale.ROOT,"%.4f",price*.8);units*=2;}
            if(scenario.equals("STOCKOUT")&&i%2==0){units=0;censored=true;}
            if(scenario.equals("ZERO"))units=0;
            rows.add(new Day(date,units,0,listed,effective,"EXPERIMENTAL_V1",censored?"STOCKOUT":"IN_STOCK",censored?0:10000,censored,List.of()));
        }
        return rows;
    }
    @Test void independentlyIdentifiableReplicatesRecoverWithoutCalibratedIntervalClaim() {
        System.out.println("BENCHMARK scenario,seed,truth,old,new,error,identification,calendarR2,residualPriceSd,uncertainty");
        for(String scenario:List.of("HIGH","LOW","SEASONAL"))for(long seed=41;seed<=45;seed++) {
            double truth=scenario.equals("HIGH")?-2.6:scenario.equals("LOW")?-.25:-1.1;
            var rows=fixture(truth,seed,scenario);var a=model.analyze(rows).elasticity();var legacy=old.analyze(rows).elasticity();
            assertThat(a.estimate()).as(scenario+seed+" "+a.reasons()).isNotNull().isCloseTo(truth,within(.12));
            assertThat(a.confidenceLow()).isNull();assertThat(a.identification().uncertaintyStatus()).isEqualTo("UNCERTAINTY_UNAVAILABLE");
            if(scenario.equals("SEASONAL"))assertThat(Math.abs(a.estimate()-truth)).isLessThan(Math.abs(legacy.estimate()-truth));
            System.out.printf(Locale.ROOT,"BENCHMARK %s,%d,%.2f,%s,%s,%.6f,%s,%s,%s,%s%n",scenario,seed,truth,legacy.estimate(),a.estimate(),Math.abs(a.estimate()-truth),a.identification().status(),a.identification().calendarPriceR2(),a.identification().residualLogPriceSd(),a.identification().uncertaintyStatus());
        }
    }
    @Test void confoundingSelectionAndInsufficientEvidenceNeverBecomeAuthority() {
        for(String scenario:List.of("CONFOUNDED","CONSTANT","STOCKOUT","ZERO"))assertThat(model.analyze(fixture(-1.1,41,scenario)).elasticity().estimate()).as(scenario).isNull();
        assertThat(model.analyze(fixture(-1.1,41,"PROMOTION")).readiness().discrepancyDays()).isPositive();
        assertThat(model.analyze(fixture(-1.1,41,"HIGH").subList(0,40)).elasticity().estimate()).isNull();
        assertThat(model.analyze(fixture(-1.1,41,"HIGH").subList(0,100)).elasticity().reasons()).contains("TOO_FEW_CONTROLLED_SAMPLES");
    }
    @Test void experimentalConfoundingAndSelectionBlockOptimizerDespiteCompleteMarketInputs() {
        var id=new Identity(UUID.fromString("00000000-0000-0000-0000-000000000001"),UUID.fromString("00000000-0000-0000-0000-000000000002"),"Experiment","Standard","EXPERIMENTAL","ACTIVE","ACTIVE");
        var at=Instant.parse("2025-12-31T00:00:00Z");
        var market=new com.smartpricing.optimization.repository.OptimizationRepository.Market(new java.math.BigDecimal("50"),new java.math.BigDecimal("150"),new java.math.BigDecimal("100"),new java.math.BigDecimal("40"),at,at,10000,at,"SNAPSHOT");
        var optimizer=new com.smartpricing.optimization.service.OptimizationService(null,model,null,new com.smartpricing.optimization.service.ContributionOptimizer(),com.smartpricing.optimization.service.OptimizationSettings.defaults());
        for(String scenario:List.of("CONFOUNDED","PROMOTION","STOCKOUT","CONSTANT","ZERO")) {
            var rows=fixture(-1.1,41,scenario);var result=optimizer.evaluate(new ForecastService.Input(id,new Window(LocalDate.of(2025,1,1),LocalDate.of(2026,1,1),"UTC","MAD"),rows),market,7);
            assertThat(result.status()).isNotEqualTo(com.smartpricing.optimization.dto.OptimizationDtos.Status.ACTIONABLE);
            assertThat(result.recommendedPrice()).isNull();assertThat(result.comparison()).isNull();assertThat(result.sensitivity()).isEmpty();
            System.out.println("BENCHMARK_BLOCKED "+scenario+" old="+old.analyze(rows).elasticity().estimate()+" new="+result.elasticity().estimate()+" status="+result.status()+" reasons="+result.reasons()+" identification="+result.elasticity().identification());
        }
    }
    @Test void permanentScenarioComparisonIsDiagnosticAndDoesNotReadTruthAtRuntime() {
        var fixture=new DemandModelTest();
        for(var scenario:com.smartpricing.demo.generator.DemoScenario.values()) {
            var rows=fixture.generated(scenario);var previous=old.analyze(rows).elasticity();var current=model.analyze(rows).elasticity();
            System.out.println("PERMANENT_BENCHMARK "+scenario+" truth="+scenario.elasticity()+" old="+previous.estimate()+" new="+current.estimate()+" n="+current.samples()+" identification="+current.identification()+" reasons="+current.reasons());
        }
    }
    @Test void chronologicalPrefixFitAndDiagnosticsAreDeterministic() {
        var rows=fixture(-1.1,41,"SEASONAL");var prefix=rows.subList(0,250);
        var first=model.analyze(prefix);var mutated=new ArrayList<>(rows);mutated.subList(250,365).clear();
        assertThat(model.analyze(mutated)).isEqualTo(first);
        assertThat(first.elasticity().identification().residualDegreesOfFreedom()).isEqualTo(237);
    }
}
