package com.smartpricing.forecasting;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.*;
import com.smartpricing.demo.generator.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class DemandModelTest {
    final DemandModel model=new DemandModel(ForecastSettings.defaults());
    final LocalDate start=LocalDate.of(2025,1,1);
    List<Day> generated(DemoScenario scenario) {
        var generator=new DemoGenerator();var config=DemoSeedConfig.defaults();var plan=generator.products().stream().filter(p->p.scenario()==scenario&&p.replica()==1).findFirst().orElseThrow();
        List<Day> days=new ArrayList<>();
        for(LocalDate date=start;date.isBefore(config.endExclusive());date=date.plusDays(1)) {
            var d=generator.day(config,plan,date);String availability=!d.observed()?"UNKNOWN":d.available()==0?"STOCKOUT":"IN_STOCK";
            days.add(new Day(date,d.observedSales(),0,scenario==DemoScenario.SPARSE?null:d.listedPrice().toPlainString(),d.observedSales()==0?d.listedPrice().toPlainString():d.transactionPrice().toPlainString(),"TEST",availability,d.available(),d.observed()&&d.observedSales()>=d.available(),List.of()));
        }
        return days;
    }
    @Test void generatorTruthRecoveryIsTestOnlyAndConservative() {
        for(DemoScenario s:DemoScenario.values()) {
            var a=model.analyze(generated(s));System.out.println("SCENARIO "+s+" truth="+s.elasticity()+" estimate="+a.elasticity().estimate()+" rmse="+a.elasticity().logRmse()+" status="+a.readiness().status()+" reasons="+a.readiness().reasons());
            if(s==DemoScenario.ELASTIC_HIGH||s==DemoScenario.ELASTIC_LOW) {
                assertThat(a.elasticity().estimate()).as(s.name()).isNotNull().isCloseTo(s.elasticity(),within(s==DemoScenario.ELASTIC_HIGH?.35:.20));
            }
            if(s==DemoScenario.SPARSE)assertThat(a.elasticity().estimate()).isNull();
            if(s==DemoScenario.ZERO_SALES)assertThat(a.elasticity().reasons()).contains("ZERO_SALES_SELECTION");
            if(s==DemoScenario.PROMOTION)assertThat(a.elasticity().reasons()).contains("PRICE_DISCREPANCY_CONFOUNDING");
        }
    }
    @Test void constantAndLowVariationPriceCannotIdentifyElasticity() {
        var constant=generated(DemoScenario.ELASTIC_HIGH).stream().map(d->new Day(d.date(),d.units(),0,"100.0000","100.0000","TEST",d.availability(),d.observedStock(),false,List.of())).toList();
        assertThat(model.analyze(constant).elasticity().estimate()).isNull();assertThat(model.analyze(constant).readiness().reasons()).contains("INSUFFICIENT_PRICE_SPREAD","INSUFFICIENT_DISTINCT_PRICES");
        var tiny=constant.stream().map(d->new Day(d.date(),d.units(),0,"100.0000",d.date().getDayOfMonth()%2==0?"100.1000":"100.0000","TEST","IN_STOCK",100,false,List.of())).toList();
        assertThat(model.analyze(tiny).elasticity().estimate()).isNull();
        var invalid=constant.stream().map(d->new Day(d.date(),d.units(),0,null,"0.0000","TEST","IN_STOCK",100,false,List.of())).toList();
        assertThat(model.analyze(invalid).elasticity().estimate()).isNull();assertThat(model.analyze(invalid).readiness().missingPriceDays()).isEqualTo(365);
    }
    @Test void seasonalBaselineHorizonsAndTotalsIncludeZerosAndNeverReturnNan() {
        var data=generated(DemoScenario.ELASTIC_LOW);
        for(int h:List.of(7,14,30)) {
            var forecast=model.forecast(data,start.plusYears(1),h,false);assertThat(forecast.daily()).hasSize(h);
            BigDecimal sum=forecast.daily().stream().map(p->new BigDecimal(p.expectedUnits())).reduce(BigDecimal.ZERO,BigDecimal::add);
            assertThat(sum).isEqualByComparingTo(forecast.totalUnits());forecast.daily().forEach(p->{assertThat(new BigDecimal(p.expectedUnits()).signum()).isGreaterThanOrEqualTo(0);assertThat(p.lower()).isNull();});
        }
        assertThat(model.forecast(data,start.plusYears(1),7,true).reasons()).contains("CURRENTLY_ARCHIVED");
        assertThat(model.forecast(generated(DemoScenario.SPARSE),start.plusYears(1),7,false).status()).isEqualTo("INSUFFICIENT_DATA");
        var zero=data.stream().map(d->new Day(d.date(),0,0,"100.0000","100.0000","TEST","IN_STOCK",100,false,List.of())).toList();
        assertThat(model.forecast(zero,start.plusYears(1),7,false).totalUnits()).isEqualTo("0.0000");assertThat(model.analyze(zero).elasticity().estimate()).isNull();
    }
    @Test void unknownCensoredMissingPriceAndPositiveAssociationAreNotClamped() {
        var heavy=generated(DemoScenario.STOCKOUT).stream().map(d->new Day(d.date(),d.units(),0,null,null,"MISSING","STOCKOUT",0,true,List.of())).toList();
        assertThat(model.analyze(heavy).readiness().reasons()).contains("EXCESS_CENSORING");assertThat(model.analyze(heavy).elasticity().estimate()).isNull();
        var unknown=heavy.stream().map(d->new Day(d.date(),0,0,null,null,"MISSING","UNKNOWN",null,false,List.of())).toList();
        assertThat(model.analyze(unknown).readiness().reasons()).contains("EXCESS_UNKNOWN_INVENTORY");
        var rising=generated(DemoScenario.ELASTIC_HIGH).stream().map(d->new Day(d.date(),new BigDecimal(d.effectivePrice()).longValue(),0,d.listedPrice(),d.effectivePrice(),"TEST","IN_STOCK",10000,false,List.of())).toList();
        assertThat(model.analyze(rising).elasticity().estimate()).isNull();assertThat(model.analyze(rising).readiness().reasons()).contains("POSITIVE_ASSOCIATION_UNRELIABLE");
    }
    @Test void chronologicalBacktestComparesNaiveAndFutureChangesCannotLeakIntoEarlierPredictions() {
        var data=generated(DemoScenario.ELASTIC_LOW);var folds=model.backtest(data,start.plusYears(1),14);
        assertThat(folds).hasSize(2);assertThat(folds.getFirst().cutoff()).isEqualTo(LocalDate.of(2025,12,4));
        for(var fold:folds){assertThat(fold.status()).isEqualTo("EVALUATED");assertThat(fold.evaluatedDays()).isEqualTo(14);assertThat(fold.model().mae()).isFinite();assertThat(fold.naive().mae()).isFinite();}
        LocalDate cutoff=folds.getFirst().cutoff();var changed=data.stream().map(d->d.date().isBefore(cutoff)?d:new Day(d.date(),999999,0,"9999.0000","9999.0000","TEST","UNKNOWN",null,false,List.of())).toList();
        var second=model.backtest(changed,start.plusYears(1),14).getFirst();
        assertThat(second.daily().stream().map(TestPoint::modelUnits).toList()).isEqualTo(folds.getFirst().daily().stream().map(TestPoint::modelUnits).toList());
        var zero=data.stream().map(d->new Day(d.date(),0,0,"100.0000","100.0000","TEST","IN_STOCK",100,false,List.of())).toList();assertThat(model.backtest(zero,start.plusYears(1),7).getFirst().model().wapePercent()).isNull();
    }
}
