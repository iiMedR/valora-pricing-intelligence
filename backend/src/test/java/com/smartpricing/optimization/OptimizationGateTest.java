package com.smartpricing.optimization;

import com.smartpricing.optimization.dto.OptimizationDtos.*;
import com.smartpricing.optimization.service.*;
import com.smartpricing.optimization.repository.OptimizationRepository.Market;
import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.*;
import com.smartpricing.demo.generator.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OptimizationGateTest {
    final LocalDate start=LocalDate.of(2025,1,1),end=LocalDate.of(2026,1,1);
    final Instant recent=Instant.parse("2025-12-31T00:00:00Z");
    final Identity identity=new Identity(UUID.randomUUID(),UUID.randomUUID(),"Test","Standard","TEST","ACTIVE","ACTIVE");
    List<Day> days(){List<Day> days=new ArrayList<>();for(LocalDate d=start;d.isBefore(end);d=d.plusDays(1))days.add(new Day(d,100,0,"100.0000","100.0000","TEST","IN_STOCK",10000,false,List.of()));return days;}
    Market market(){return new Market(new BigDecimal("50"),new BigDecimal("150"),new BigDecimal("100"),new BigDecimal("40"),recent,recent,10000,recent,"SNAPSHOT");}
    DemandModel ready(){var model=mock(DemandModel.class);var readiness=new Readiness("READY",365,365,0,0,0,0,0,0,3,"80.0000","120.0000",List.of("OBSERVATIONAL_ASSOCIATION"));var elasticity=new Elasticity("READY","TEST",-2.0,.01,365,null,null,readiness,List.of("OBSERVATIONAL_ASSOCIATION"));when(model.analyze(any())).thenReturn(new DemandModel.Analysis(days(),readiness,elasticity));when(model.baselineTraining(any())).thenReturn(days().subList(309,365));
        var points=new ArrayList<Point>();for(int i=0;i<7;i++)points.add(new Point(end.plusDays(i),"100.0000",null,null));when(model.forecast(any(),any(),anyInt(),anyBoolean())).thenReturn(new Forecast("READY","TEST","OBSERVED_SALES_CONDITIONAL_ON_AVAILABILITY","100.0000","700.0000",points,List.of()));
        var score=new ErrorMetrics(1.0,5.0,0.0,"700.0000");var naive=new ErrorMetrics(2.0,10.0,0.0,"700.0000");when(model.backtest(any(),any(),anyInt())).thenReturn(List.of(new Fold(end.minusDays(14),end.minusDays(7),"EVALUATED",56,7,0,0,700,score,naive,List.of(),List.of()),new Fold(end.minusDays(7),end,"EVALUATED",56,7,0,0,700,score,naive,List.of(),List.of())));return model;}
    OptimizationService service(DemandModel model){return new OptimizationService(null,model,null,new ContributionOptimizer(),OptimizationSettings.defaults());}
    ForecastService.Input input(){return new ForecastService.Input(identity,new Window(start,end,"UTC","MAD"),days());}
    @Test void supportedFixtureIsActionableWithBoundedPriceAndConditionalUplift(){var service=service(ready());var result=service.evaluate(input(),market(),7);assertThat(result.status()).isEqualTo(Status.ACTIONABLE);assertThat(result.recommendedPrice()).isEqualTo("90.0000");assertThat(result.comparison().estimatedUplift()).isEqualTo("1209.8765");assertThat(result.sensitivity()).hasSize(21);assertThat(result.assumptions()).contains("HORIZON_STOCK_CAP_NO_REPLENISHMENT","ESTIMATED_NOT_REALIZED_UPLIFT");assertThat(service.evaluate(input(),market(),7)).isEqualTo(result);}
    @Test void currentInactiveMissingCostStalePriceAndInvalidConstraintsAbstain(){
        var model=ready();var s=service(model);var m=market();var inactive=new Identity(identity.variantId(),identity.productId(),"Test","Standard","TEST","ARCHIVED","ACTIVE");assertAbstains(s.evaluate(new ForecastService.Input(inactive,input().window(),days()),m,7),Status.INACTIVE_VARIANT);
        assertAbstains(s.evaluate(input(),new Market(m.min(),m.max(),m.price(),null,m.priceFrom(),null,m.stock(),m.stockAt(),m.stockQuality()),7),Status.MISSING_COST);
        assertAbstains(s.evaluate(input(),new Market(m.min(),m.max(),m.price(),m.cost(),m.priceFrom(),Instant.parse("2020-01-01T00:00:00Z"),m.stock(),m.stockAt(),m.stockQuality()),7),Status.MISSING_COST);
        assertAbstains(s.evaluate(input(),new Market(m.min(),m.max(),m.price(),m.cost(),Instant.parse("2020-01-01T00:00:00Z"),m.costFrom(),m.stock(),m.stockAt(),m.stockQuality()),7),Status.MISSING_PRICE);
        assertAbstains(s.evaluate(input(),new Market(m.min(),m.max(),m.price(),new BigDecimal("150"),m.priceFrom(),m.costFrom(),m.stock(),m.stockAt(),m.stockQuality()),7),Status.INVALID_CONSTRAINTS);
        when(model.forecast(any(),any(),anyInt(),anyBoolean())).thenReturn(new Forecast("INSUFFICIENT_DATA","TEST","OBSERVED_SALES_CONDITIONAL_ON_AVAILABILITY","100.0000",null,List.of(),List.of()));
        assertAbstains(s.evaluate(input(),m,7),Status.UNAVAILABLE_FORECAST);
    }
    @Test void unreliableSeasonalAndSparseDemoScenariosNeverGetActionableFields(){
        var generator=new DemoGenerator();var config=DemoSeedConfig.defaults();var real=new DemandModel(ForecastSettings.defaults());
        for(DemoScenario scenario:List.of(DemoScenario.SEASONAL,DemoScenario.SPARSE,DemoScenario.ZERO_SALES,DemoScenario.STOCKOUT)){
            var plan=generator.products().stream().filter(p->p.replica()==1&&p.scenario()==scenario).findFirst().orElseThrow();List<Day> rows=new ArrayList<>();
            for(LocalDate date=start;date.isBefore(end);date=date.plusDays(1)){var d=generator.day(config,plan,date);rows.add(new Day(date,d.observedSales(),0,d.listedPrice().toPlainString(),(d.observedSales()==0?d.listedPrice():d.transactionPrice()).toPlainString(),"TEST",!d.observed()?"UNKNOWN":d.available()==0?"STOCKOUT":"IN_STOCK",d.available(),d.observed()&&d.observedSales()>=d.available(),List.of()));}
            var m=new Market(plan.basePrice().multiply(new BigDecimal(".5")),plan.basePrice().multiply(new BigDecimal("2")),plan.basePrice(),plan.baseCost(),recent,recent,60,recent,"SNAPSHOT");var evaluation=service(real).evaluate(new ForecastService.Input(identity,input().window(),rows),m,7);
            assertThat(evaluation.status()).isNotEqualTo(Status.ACTIONABLE);assertThat(evaluation.recommendedPrice()).isNull();assertThat(evaluation.comparison()).isNull();
            if(scenario==DemoScenario.SEASONAL)assertThat(evaluation.reasons()).contains("SEASONAL_OR_CALENDAR_CONFOUNDING");
        }
    }
    @Test void forecastSuccessAloneDoesNotOverrideConfoundingOrUnknownInventory(){var model=ready();var original=model.analyze(days());var risk=new Elasticity("READY","TEST",-.531116,.09,365,null,null,original.readiness(),List.of("PRICE_CALENDAR_CONFOUNDING_RISK"));when(model.analyze(any())).thenReturn(new DemandModel.Analysis(days(),original.readiness(),risk));assertAbstains(service(model).evaluate(input(),market(),7),Status.DIAGNOSTIC_ONLY);
        var m=market();assertAbstains(service(ready()).evaluate(input(),new Market(m.min(),m.max(),m.price(),m.cost(),m.priceFrom(),m.costFrom(),null,null,null),7),Status.DIAGNOSTIC_ONLY);}
    void assertAbstains(Evaluation evaluation,Status status){assertThat(evaluation.status()).isEqualTo(status);assertThat(evaluation.recommendedPrice()).isNull();assertThat(evaluation.comparison()).isNull();assertThat(evaluation.sensitivity()).isEmpty();assertThat(evaluation.reasons()).isNotEmpty();}
}
