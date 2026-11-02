package com.smartpricing.history;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartpricing.common.ApiException;
import com.smartpricing.history.dto.HistoryDtos.*;
import com.smartpricing.history.service.*;
import com.smartpricing.sales.dto.SalesDtos.*;
import com.smartpricing.sales.service.SalesRules;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class HistoryRulesTest {
    Instant a=Instant.parse("2026-01-01T00:00:00Z"),b=Instant.parse("2026-01-02T00:00:00Z"),c=Instant.parse("2026-01-03T00:00:00Z");
    @Test void arithmeticIsExactAndDoesNotRound() {
        assertThat(HistoryRules.lineNet(new BigDecimal("0.1234"),3,new BigDecimal("0.0002"))).isEqualByComparingTo("0.3700");
        assertThat(HistoryRules.money(new BigDecimal("1.2"),false,false).toPlainString()).isEqualTo("1.2000");
        assertThatThrownBy(()->HistoryRules.lineNet(BigDecimal.ONE,2,new BigDecimal("3"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->HistoryRules.lineNet(new BigDecimal("999999999999999"),2,BigDecimal.ZERO)).isInstanceOf(ApiException.class);
    }
    @ParameterizedTest @ValueSource(strings={"-1","1.00001","1.00000","1000000000000000"})
    void rejectsInvalidAmounts(String value) { assertThatThrownBy(()->HistoryRules.money(new BigDecimal(value),false,false)).isInstanceOf(ApiException.class); }
    @Test void excludesUnpaidAndCancelledFromRecognizedSales() {
        assertThat(HistoryRules.recognized(OrderStatus.COMPLETED,BigDecimal.TEN)).isEqualByComparingTo("10");
        assertThat(HistoryRules.recognized(OrderStatus.UNPAID,BigDecimal.TEN)).isZero();
        assertThat(HistoryRules.recognized(OrderStatus.CANCELLED,BigDecimal.TEN)).isZero();
    }
    @Test void unknownCostsStayUnknownAndExplicitCostsTakePrecedence() {
        assertThat(HistoryRules.cost(null,null).amount()).isNull();
        assertThat(HistoryRules.cost(null,null).provenance()).isEqualTo("UNKNOWN");
        assertThat(HistoryRules.cost(null,BigDecimal.TEN).provenance()).isEqualTo("EFFECTIVE_HISTORY");
        assertThat(HistoryRules.cost(BigDecimal.ONE,BigDecimal.TEN).amount()).isEqualByComparingTo("1");
    }
    @Test void halfOpenPeriodsAndDatesAreValidated() {
        assertThat(HistoryRules.overlaps(a,b,b,c)).isFalse();
        assertThat(HistoryRules.overlaps(a,null,b,c)).isTrue();
        assertThatThrownBy(()->HistoryRules.period(b,a,Quality.VERIFIED_CHANGE)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->HistoryRules.period(a,b,Quality.SNAPSHOT)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->HistoryRules.dates(b,a)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->HistoryRules.time(Instant.now().plusSeconds(60))).isInstanceOf(ApiException.class);
    }
    @Test void stockoutIsKnownOnlyForTrustedObservations() {
        assertThat(HistoryRules.stockState(0,Quality.SNAPSHOT)).isEqualTo("KNOWN_STOCKOUT");
        assertThat(HistoryRules.stockState(0,Quality.INFERRED)).isEqualTo("UNCERTAIN");
        assertThat(HistoryRules.stockState(2,Quality.SNAPSHOT)).isEqualTo("AVAILABLE");
        assertThatThrownBy(()->HistoryRules.stockState(-1,Quality.SNAPSHOT)).isInstanceOf(ApiException.class);
    }
    @Test void canonicalKeysPreserveIdempotencyAndRejectConflicts() {
        var support=new HistorySupport(mock(JdbcTemplate.class),new ObjectMapper().findAndRegisterModules());
        assertThat(support.fingerprint(Map.of("amount",new BigDecimal("1.0000")))).isEqualTo(support.fingerprint(Map.of("amount",BigDecimal.ONE)));
        assertThatThrownBy(()->support.samePayload("old","new")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->HistoryRules.reference(Source.SHOPIFY,null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->HistoryRules.reference(Source.MANUAL," ")).isInstanceOf(ApiException.class);
    }
    OrderView order() {
        return new ObjectMapper().findAndRegisterModules().convertValue(Map.of("status","COMPLETED","placedAt",a.toString(),"currencyCode","MAD","shippingAmount","2"),OrderView.class);
    }
    LineView line() { return new LineView(UUID.randomUUID(),UUID.randomUUID(),"SKU","Name",2,"MAD",null,"10","1","19",null,"UNKNOWN",null); }
    RefundWrite refund(RefundKind kind,int quantity,String amount,UUID item) {
        return new RefundWrite(Source.MANUAL,"refund",b,kind,item,quantity,new BigDecimal(amount),"MAD",null);
    }
    @Test void refundsCheckCumulativeQuantityAndMoneyIndependently() {
        var line=line();
        SalesRules.refund(refund(RefundKind.LINE_RETURN,1,"5",line.id()),order(),line,0,BigDecimal.ZERO);
        assertThatThrownBy(()->SalesRules.refund(refund(RefundKind.LINE_RETURN,2,"1",line.id()),order(),line,1,BigDecimal.ONE)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->SalesRules.refund(refund(RefundKind.LINE_RETURN,1,"15",line.id()),order(),line,0,BigDecimal.TEN)).isInstanceOf(ApiException.class);
    }
    @Test void financialAdjustmentsAreNotQuantityReturnsAndShippingIsSeparate() {
        var line=line();
        SalesRules.refund(refund(RefundKind.FINANCIAL_ADJUSTMENT,0,"2",line.id()),order(),line,0,BigDecimal.ZERO);
        assertThatThrownBy(()->SalesRules.refund(refund(RefundKind.FINANCIAL_ADJUSTMENT,1,"2",line.id()),order(),line,0,BigDecimal.ZERO)).isInstanceOf(ApiException.class);
        SalesRules.refund(refund(RefundKind.SHIPPING,0,"2",null),order(),null,0,BigDecimal.ZERO);
        assertThatThrownBy(()->SalesRules.refund(refund(RefundKind.TAX,0,"1",null),order(),null,0,BigDecimal.ZERO)).isInstanceOf(ApiException.class);
    }
}
