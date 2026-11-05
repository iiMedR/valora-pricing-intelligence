package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

public interface ShopifyGraphQl {
    JsonNode query(String shop, String accessToken, String query, Map<String,Object> variables);
}
