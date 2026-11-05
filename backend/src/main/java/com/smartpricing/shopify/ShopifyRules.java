package com.smartpricing.shopify;

import com.smartpricing.common.ApiException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

public final class ShopifyRules {
    private ShopifyRules(){}
    public static String shop(String value){if(value==null)throw ApiException.invalid("Enter a canonical myshopify.com shop domain.");String shop=value.trim().toLowerCase(Locale.ROOT);if(!shop.matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.myshopify\\.com"))throw ApiException.invalid("Enter a canonical myshopify.com shop domain without a URL, path or port.");return shop;}
    public static String random(){byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);return HexFormat.of().formatHex(bytes);}
    public static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(GeneralSecurityException e){throw new IllegalStateException("Hash algorithm unavailable");}}
    public static boolean equal(String a,String b){return a!=null&&b!=null&&MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8),b.getBytes(StandardCharsets.UTF_8));}
    public static String canonical(Map<String,String> params){return params.entrySet().stream().filter(e->!e.getKey().equals("hmac")).sorted(Map.Entry.comparingByKey()).map(e->e.getKey()+"="+e.getValue()).collect(java.util.stream.Collectors.joining("&"));}
    public static byte[] hmac(String message,String secret){try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));}catch(GeneralSecurityException e){throw new IllegalStateException("Signature algorithm unavailable");}}
    public static Map<String,String> verify(Map<String,String[]> raw,String secret,Clock clock){
        if(raw.size()>16||secret==null||secret.isBlank())throw invalid();Map<String,String> params=new TreeMap<>();int length=0;
        for(var entry:raw.entrySet()){
            if(!entry.getKey().matches("[a-zA-Z_]{1,64}")||entry.getValue().length!=1||entry.getValue()[0]==null)throw invalid();String value=entry.getValue()[0];length+=value.length();if(length>8192||value.chars().anyMatch(c->c<32||c==127))throw invalid();params.put(entry.getKey(),value);
        }
        try{
            String signature=params.get("hmac");if(signature==null||!signature.matches("[a-f0-9]{64}")||!MessageDigest.isEqual(hmac(canonical(params),secret),HexFormat.of().parseHex(signature)))throw invalid();
            long time=Long.parseLong(params.get("timestamp"));if(Math.abs(Math.subtractExact(clock.instant().getEpochSecond(),time))>300)throw invalid();
            if(!Objects.equals(params.get("shop"),shop(params.get("shop")))||!params.getOrDefault("state","").matches("[a-f0-9]{64}"))throw invalid();return params;
        }catch(RuntimeException exception){throw invalid();}
    }
    public static ApiException invalid(){return ApiException.invalid("Shopify authorization could not be verified. Start a new connection attempt.");}
}
