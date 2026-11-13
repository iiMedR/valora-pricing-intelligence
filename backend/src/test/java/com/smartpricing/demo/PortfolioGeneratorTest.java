package com.smartpricing.demo;

import com.smartpricing.demo.generator.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PortfolioGeneratorTest {
    final PortfolioGenerator generator=new PortfolioGenerator();
    final DemoSeedConfig config=new DemoSeedConfig(PortfolioGenerator.SEED,DemoSeedConfig.DEFAULT_START);

    @Test void frozenDesignHasThirtyStoriesAndIndependentRepeatableWeeklyAssignments() {
        assertThat(generator.products()).hasSize(30);
        assertThat(generator.products().stream().map(p->p.sku()).distinct()).hasSize(30);
        for(var p:generator.products()) {
            var periods=generator.prices(config,p);
            assertThat(periods.getFirst().from()).isEqualTo(config.startDate());
            assertThat(periods.getLast().to()).isNull();
            for(var d=config.startDate();d.isBefore(config.endExclusive());d=d.plusDays(1)) {
                var day=generator.day(config,p,d);
                assertThat(day).isEqualTo(generator.day(config,p,d));
                assertThat(day.observedSales()).isBetween(0,day.available());
                var at=d;
                var period=periods.stream().filter(x->!at.isBefore(x.from())&&(x.to()==null||at.isBefore(x.to()))).toList();
                assertThat(period).hasSize(1);
                assertThat(day.listedPrice()).isEqualByComparingTo(period.getFirst().amount());
            }
        }
    }
    @Test void missingCostsAndObservedDatesRemainMissingAndErrorWitnessesAreNotHidden() {
        for(var p:generator.products()) {
            if(p.scenario()==DemoScenario.SPARSE) {
                assertThat(p.baseCost()).isNull();assertThat(generator.costs(config,p)).isEmpty();
                long n=config.startDate().datesUntil(config.endExclusive()).filter(d->generator.day(config,p,d).observed()).count();
                assertThat(n).isEqualTo(new int[]{5,20,50}[p.replica()-1]);
            }
            if(p.scenario()==DemoScenario.COST_CHANGE_UNKNOWN&&p.replica()==2)
                assertThat(generator.trueCost(p)).isGreaterThan(p.baseCost());
        }
        assertThatThrownBy(()->generator.validate(DemoSeedConfig.defaults())).isInstanceOf(com.smartpricing.common.ApiException.class);
    }
}
