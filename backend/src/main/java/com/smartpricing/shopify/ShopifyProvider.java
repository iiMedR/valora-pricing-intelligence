package com.smartpricing.shopify;

import java.time.Instant;
import java.util.List;

public interface ShopifyProvider {
    record Tokens(String access,String refresh,Instant accessExpires,Instant refreshExpires,List<String> scopes){@Override public String toString(){return "ShopifyTokens[REDACTED]";}}
    Tokens exchange(String shop,String code);
    default Tokens refresh(String shop,String refreshToken){throw new IllegalStateException("Token renewal requires reauthorization.");}
    boolean revoke(String shop,String access);
}
