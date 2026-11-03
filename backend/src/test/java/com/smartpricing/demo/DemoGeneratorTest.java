package com.smartpricing.demo;

import com.smartpricing.demo.generator.*;
import com.smartpricing.demo.generator.DemoGenerator.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class DemoGeneratorTest {
    DemoGenerator generator=new DemoGenerator();
    DemoSeedConfig config=DemoSeedConfig.defaults();

    @Test void fixedDateAndVersionGiveStableOrderIndependentObservations() {
        assertThat(generator.products()).hasSize(30);
        assertThat(generator.products().stream().map(ProductPlan::sku).distinct()).hasSize(30);
        ProductPlan product=generator.products().getFirst();
        var forward=new LinkedHashMap<LocalDate,DailyPlan>();
        config.startDate().datesUntil(config.endExclusive()).forEach(date->forward.put(date,generator.day(config,product,date)));
        for(LocalDate date=config.endExclusive().minusDays(1);!date.isBefore(config.startDate());date=date.minusDays(1))
            assertThat(generator.day(config,product,date)).isEqualTo(forward.get(date));
        assertThat(forward).hasSize(365);
        assertThat(new DemoSeedConfig(1,LocalDate.of(2024,1,1)).startDate().datesUntil(LocalDate.of(2025,1,1))).hasSize(366);
    }
    @Test void differentSeedsVaryDemandWithinBoundsWithoutChangingCatalogPrices() {
        DemoSeedConfig other=new DemoSeedConfig(config.seed()+1,config.startDate());
        long changed=0,totalA=0,totalB=0;
        for(ProductPlan product:generator.products()) for(LocalDate date=config.startDate();date.isBefore(config.endExclusive());date=date.plusDays(1)) {
            DailyPlan a=generator.day(config,product,date),b=generator.day(other,product,date);
            assertThat(a.observedSales()).isBetween(0,a.available()); assertThat(b.observedSales()).isBetween(0,b.available());
            assertThat(a.transactionPrice()).isPositive(); assertThat(b.listedPrice()).isEqualByComparingTo(a.listedPrice());
            if(a.observedSales()!=b.observedSales())changed++;
            totalA+=a.observedSales();totalB+=b.observedSales();
        }
        assertThat(changed).isGreaterThan(500);
        assertThat((double)totalB/totalA).isBetween(0.90,1.10);
    }
    @Test void elasticitySeasonalityAndPromotionsHaveDirectionalDifferences() {
        double high=quarterRatio(DemoScenario.ELASTIC_HIGH),low=quarterRatio(DemoScenario.ELASTIC_LOW);
        assertThat(high).isLessThan(0.65);assertThat(low).isGreaterThan(0.80);assertThat(high).isLessThan(low-0.15);
        var seasonal=product(DemoScenario.SEASONAL);
        double winter=average(seasonal,LocalDate.of(2025,1,1),LocalDate.of(2025,3,1));
        double summer=average(seasonal,LocalDate.of(2025,7,1),LocalDate.of(2025,9,1));
        assertThat(summer).isGreaterThan(winter*1.6);
        var promo=product(DemoScenario.PROMOTION);
        var days=config.startDate().datesUntil(config.endExclusive()).map(date->generator.day(config,promo,date)).toList();
        double discounted=days.stream().filter(day->day.transactionPrice().compareTo(day.listedPrice())<0).mapToInt(DailyPlan::observedSales).average().orElseThrow();
        double normal=days.stream().filter(day->day.transactionPrice().compareTo(day.listedPrice())==0).mapToInt(DailyPlan::observedSales).average().orElseThrow();
        assertThat(discounted).isGreaterThan(normal*1.15);
    }
    @Test void sparseStockoutUnknownCostsRetirementAndZeroSalesAreExplicit() {
        var stock=generator.day(config,product(DemoScenario.STOCKOUT),config.startDate().plusDays(155));
        assertThat(stock.available()).isZero();assertThat(stock.observedSales()).isZero();assertThat(stock.latentDemand()).isPositive();
        var sparse=product(DemoScenario.SPARSE);
        assertThat(config.startDate().datesUntil(config.endExclusive()).filter(date->generator.day(config,sparse,date).observed())).hasSize(5);
        assertThat(generator.prices(config,sparse)).hasSize(3);assertThat(generator.costs(config,sparse)).isEmpty();
        var costs=generator.costs(config,product(DemoScenario.COST_CHANGE_UNKNOWN));
        assertThat(costs.get(0).to()).isEqualTo(config.startDate().plusMonths(3));
        assertThat(costs.get(1).from()).isEqualTo(config.startDate().plusMonths(6));
        assertThat(generator.day(config,product(DemoScenario.ARCHIVE),LocalDate.of(2025,11,1)).observedSales()).isZero();
        var zero=generator.day(config,product(DemoScenario.ZERO_SALES),config.startDate());
        assertThat(zero.observedSales()).isZero();assertThat(zero.available()).isPositive();
    }
    private ProductPlan product(DemoScenario scenario){return generator.products().stream().filter(p->p.scenario()==scenario&&p.replica()==1).findFirst().orElseThrow();}
    private double average(ProductPlan product,LocalDate from,LocalDate to){return from.datesUntil(to).mapToInt(date->generator.day(config,product,date).observedSales()).average().orElseThrow();}
    private double quarterRatio(DemoScenario scenario){return average(product(scenario),LocalDate.of(2025,7,1),LocalDate.of(2025,10,1))/average(product(scenario),LocalDate.of(2025,1,1),LocalDate.of(2025,4,1));}
}
