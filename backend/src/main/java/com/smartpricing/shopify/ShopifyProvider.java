package com.smartpricing.shopify;

import java.time.Instant;
import java.util.List;

public interface ShopifyProvider {
    record Tokens(String access,String refresh,Instant accessExpires,Instant refreshExpires,List<String> scopes){@Override public String toString(){return "ShopifyTokens[REDACTED]";}}
    Tokens exchange(String shop,String code);
    boolean revoke(String shop,String access);
}
