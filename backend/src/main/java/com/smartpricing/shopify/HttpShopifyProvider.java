package com.smartpricing.shopify;

import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class HttpShopifyProvider implements ShopifyProvider {
    private final ShopifySettings settings;private final ObjectMapper mapper;private final Clock clock;
    private final HttpClient client;
    @org.springframework.beans.factory.annotation.Autowired
    public HttpShopifyProvider(ShopifySettings settings,ObjectMapper mapper,Clock clock){this(settings,mapper,clock,HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());}
    HttpShopifyProvider(ShopifySettings settings,ObjectMapper mapper,Clock clock,HttpClient client){this.settings=settings;this.mapper=mapper;this.clock=clock;this.client=client;}
    @Override public Tokens exchange(String domain,String code){
        try{
            String shop=ShopifyRules.shop(domain);if(!settings.enabled()||code==null||code.isBlank()||code.length()>2048)throw new IllegalStateException();
            String form="client_id="+encode(settings.clientId())+"&client_secret="+encode(settings.clientSecret())+"&code="+encode(code)+"&expiring=1";
            var request=HttpRequest.newBuilder(URI.create("https://"+shop+"/admin/oauth/access_token")).timeout(Duration.ofSeconds(10)).header("Content-Type","application/x-www-form-urlencoded").header("Accept","application/json").POST(HttpRequest.BodyPublishers.ofString(form)).build();
            JsonNode body=send(request);String access=body.path("access_token").asText(),refresh=body.path("refresh_token").asText();long seconds=body.path("expires_in").asLong(0),refreshSeconds=body.path("refresh_token_expires_in").asLong(0);
            if(access.isBlank()||refresh.isBlank()||access.length()>8192||refresh.length()>8192||seconds<=0||seconds>366L*86400||refreshSeconds>366L*86400)throw new IllegalStateException();
            var scopes=Arrays.stream(body.path("scope").asText().split(",")).filter(s->!s.isBlank()).sorted().toList();return new Tokens(access,refresh,clock.instant().plusSeconds(seconds),refreshSeconds>0?clock.instant().plusSeconds(refreshSeconds):null,scopes);
        }catch(Exception exception){if(exception instanceof InterruptedException)Thread.currentThread().interrupt();throw new IllegalStateException("Shopify token exchange failed.");}
    }
    @Override public boolean revoke(String domain,String access){
        try{
            if(access==null||!settings.enabled())return false;String shop=ShopifyRules.shop(domain);
            var request=HttpRequest.newBuilder(URI.create("https://"+shop+"/admin/api/2026-10/graphql.json")).timeout(Duration.ofSeconds(10)).header("X-Shopify-Access-Token",access).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{\"query\":\"mutation { appUninstall { app { id } userErrors { field message } } }\"}")).build();
            JsonNode result=send(request);return result.path("errors").isMissingNode()&&result.path("data").path("appUninstall").path("app").path("id").isTextual()&&result.path("data").path("appUninstall").path("userErrors").isEmpty();
        }catch(Exception exception){if(exception instanceof InterruptedException)Thread.currentThread().interrupt();return false;}
    }
    private JsonNode send(HttpRequest request)throws Exception{
        var response=client.send(request,HttpResponse.BodyHandlers.ofInputStream());try(var input=response.body()){if(response.statusCode()!=200)throw new IllegalStateException();byte[] body=input.readNBytes(65537);if(body.length>65536)throw new IllegalStateException();return mapper.readTree(body);}
    }
    private String encode(String value){return URLEncoder.encode(value,StandardCharsets.UTF_8);}
}
