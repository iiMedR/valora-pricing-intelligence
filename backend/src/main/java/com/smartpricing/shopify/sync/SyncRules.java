package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.*;
import java.time.*;

public final class SyncRules {
    private SyncRules(){}
    public static String id(JsonNode node){String id=node.path("id").asText();if(id.isBlank()||id.length()>256||id.chars().anyMatch(c->c<32))throw new SyncFailure("SOURCE_ID_MISSING_OR_INVALID");return id;}
    public static Instant time(JsonNode node,String field){try{Instant value=Instant.parse(node.path(field).asText());if(value.isAfter(Instant.now().plusSeconds(5)))throw new IllegalArgumentException();return value.truncatedTo(java.time.temporal.ChronoUnit.MICROS);}catch(RuntimeException ignored){throw new SyncFailure("SOURCE_TIMESTAMP_INVALID");}}
    public static BigDecimal amount(JsonNode money,String currency){
        if(!currency.equals(money.path("currencyCode").asText()))throw new SyncFailure("UNSUPPORTED_CURRENCY");
        try{BigDecimal value=new BigDecimal(money.path("amount").asText()).setScale(4,RoundingMode.UNNECESSARY);if(value.signum()<0||value.precision()-value.scale()>15)throw new IllegalArgumentException();return value;}catch(RuntimeException ignored){throw new SyncFailure("UNSUPPORTED_MONEY_PRECISION");}
    }
    public static BigDecimal bag(JsonNode parent,String field,String currency){return amount(parent.path(field).path("shopMoney"),currency);}
    public static void complete(JsonNode connection){if(!connection.path("nodes").isArray()||!connection.path("pageInfo").has("hasNextPage"))throw new SyncFailure("GRAPHQL_INVALID_RESPONSE");if(connection.path("pageInfo").path("hasNextPage").asBoolean())throw new SyncFailure("NESTED_RESOURCE_LIMIT_REACHED");}
    public static String text(JsonNode node,String field,int max){String value=node.path(field).asText().strip();if(value.isEmpty())value="Shopify item";return value.substring(0,Math.min(max,value.length()));}
}
