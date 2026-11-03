package com.smartpricing.analytics;

import com.smartpricing.analytics.service.AnalyticsRules;
import com.smartpricing.analytics.repository.AnalyticsRepository;
import com.smartpricing.common.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class AnalyticsRulesTest {
    @Test void exactDiscountedMerchandiseAndPartialCostCoverage() {
        var m=AnalyticsRules.metrics(new BigDecimal("39.2468"),new BigDecimal("6"),4,1,1,2,1,2,1,new BigDecimal("19.2468"),new BigDecimal("5"),new BigDecimal("6"));
        assertThat(m.netSales()).isEqualTo("33.2468");assertThat(m.grossAverageOrderValue()).isEqualTo("39.2468");
        assertThat(m.knownContributionBeforeReturnRecovery()).isEqualTo("8.2468");assertThat(m.knownCostNetSales()).isEqualTo("14.2468");
        assertThat(m.salesCostCoveragePercent()).isEqualTo("50.0000");assertThat(m.costCoverageState()).isEqualTo("PARTIAL");
        assertThat(m.knownContributionMarginPercent()).isEqualTo(AnalyticsRules.ratio(new BigDecimal("8.2468"),new BigDecimal("14.2468"),true));
    }
    @Test void emptyAndUnknownAreNotInventedProfit() {
        var empty=AnalyticsRules.empty();assertThat(empty.grossSales()).isEqualTo("0.0000");assertThat(empty.grossAverageOrderValue()).isNull();
        assertThat(empty.knownContributionBeforeReturnRecovery()).isNull();assertThat(empty.salesCostCoveragePercent()).isNull();
        assertThat(empty.costCoverageState()).isEqualTo("NO_ACTIVITY");
        var unknown=AnalyticsRules.metrics(BigDecimal.TEN,BigDecimal.ZERO,1,0,1,1,0,0,0,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO);
        assertThat(unknown.costCoverageState()).isEqualTo("UNKNOWN");assertThat(unknown.knownContributionBeforeReturnRecovery()).isNull();
    }
    @Test void refundOnlyPeriodHasNegativeContributionAndNoAovOrMargin() {
        var m=AnalyticsRules.metrics(BigDecimal.ZERO,new BigDecimal("5"),0,1,0,0,0,1,1,BigDecimal.ZERO,new BigDecimal("5"),BigDecimal.ZERO);
        assertThat(m.netSales()).isEqualTo("-5.0000");assertThat(m.knownContributionBeforeReturnRecovery()).isEqualTo("-5.0000");
        assertThat(m.knownContributionMarginPercent()).isNull();assertThat(m.grossAverageOrderValue()).isNull();assertThat(m.costCoverageState()).isEqualTo("COMPLETE");
    }
    @Test void knownZeroDenominatorAndExactLargeMoney() {
        assertThat(AnalyticsRules.ratio(BigDecimal.ONE,BigDecimal.ZERO,true)).isNull();
        assertThat(AnalyticsRules.money(new BigDecimal("999999999999999.1234"))).isEqualTo("999999999999999.1234");
        assertThat(AnalyticsRules.ratio(BigDecimal.ONE,new BigDecimal("3"),false)).isEqualTo("0.3333");
    }
    @Test void utcBoundariesAndBoundedRequests() {
        LocalDate start=LocalDate.of(2025,1,1);AnalyticsRules.range(start,start.plusDays(731));
        assertThatThrownBy(()->AnalyticsRules.range(start,start)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->AnalyticsRules.range(start,start.plusDays(732))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->AnalyticsRules.page(-1,20,"")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->AnalyticsRules.page(0,101,"")).isInstanceOf(ApiException.class);
        var repository=new AnalyticsRepository(null);
        assertThat(repository.params(start,start.plusDays(1)).getValue("start").toString()).contains("2025-01-01");
    }
}
