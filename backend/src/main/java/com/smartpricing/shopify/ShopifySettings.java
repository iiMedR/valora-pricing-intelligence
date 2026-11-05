package com.smartpricing.shopify;

import java.net.URI;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("app.shopify")
public record ShopifySettings(@DefaultValue("false")boolean enabled,@DefaultValue("")String clientId,
        @DefaultValue("")String clientSecret,@DefaultValue("")String encryptionKey,@DefaultValue("")String publicBaseUrl) {
    public static final List<String> SCOPES=List.of("read_inventory","read_locations","read_orders","read_products");
    public String publicOrigin(){
        try{URI uri=URI.create(publicBaseUrl);if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getRawUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!(uri.getPath().isEmpty()||uri.getPath().equals("/")))throw new IllegalArgumentException();return uri.getScheme()+"://"+uri.getRawAuthority();}
        catch(RuntimeException exception){throw new IllegalStateException("Shopify requires a configured public HTTPS origin without path, query or user information.");}
    }
    public String callback(){return publicOrigin()+"/api/v1/integrations/shopify/callback";}
    @Override public String toString(){return "ShopifySettings[REDACTED]";}
}
