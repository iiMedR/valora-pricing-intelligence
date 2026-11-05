package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SyncRulesTest {
    private final ObjectMapper mapper=new ObjectMapper();
    @Test void moneyIsExactCurrencyAwareAndNeverRounded()throws Exception{
        assertThat(SyncRules.amount(mapper.readTree("{\"amount\":\"12.3400\",\"currencyCode\":\"MAD\"}"),"MAD")).isEqualByComparingTo("12.34");
        assertThatThrownBy(()->SyncRules.amount(mapper.readTree("{\"amount\":\"0.12345\",\"currencyCode\":\"MAD\"}"),"MAD")).hasMessage("UNSUPPORTED_MONEY_PRECISION");assertThatThrownBy(()->SyncRules.amount(mapper.readTree("{\"amount\":\"10\",\"currencyCode\":\"USD\"}"),"MAD")).hasMessage("UNSUPPORTED_CURRENCY");
    }
    @Test void truncatedResourcesAndInvalidIdentifiersNeverSilentlyImport()throws Exception{
        assertThatThrownBy(()->SyncRules.complete(mapper.readTree("{\"nodes\":[],\"pageInfo\":{\"hasNextPage\":true}}"))).hasMessage("NESTED_RESOURCE_LIMIT_REACHED");assertThatThrownBy(()->SyncRules.id(mapper.createObjectNode())).hasMessage("SOURCE_ID_MISSING_OR_INVALID");
    }
}
