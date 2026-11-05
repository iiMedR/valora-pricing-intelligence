package com.smartpricing.shopify;

import com.smartpricing.common.ApiException;
import com.smartpricing.demo.config.DemoSafetyGuard;
import jakarta.servlet.http.HttpSession;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShopifyService {
    public static final String BINDING="SHOPIFY_OAUTH_BINDING";
    private final ShopifyRepository repository;private final ShopifyProvider provider;private final ShopifySettings settings;private final TokenCipher cipher;private final DemoSafetyGuard guard;private final Clock clock;
    public ShopifyService(ShopifyRepository repository,ShopifyProvider provider,ShopifySettings settings,TokenCipher cipher,DemoSafetyGuard guard,Clock clock){this.repository=repository;this.provider=provider;this.settings=settings;this.cipher=cipher;this.guard=guard;this.clock=clock;}
    public record Status(String status,boolean configured,String shop,List<String> scopes,Instant connectedAt,Instant disconnectedAt,Instant accessExpiresAt,Instant refreshExpiresAt,String lastError,String synchronization){}
    @Transactional(readOnly=true)public Status status(){
        if(guard.demoRequested())return new Status("DEMO_DISABLED",false,null,List.of(),null,null,null,null,null,"SYNTHETIC_DEMO_ONLY");
        var record=repository.connection(false);String status=record.status();
        if(!settings.enabled())status="CONFIGURATION_REQUIRED";
        else if(status.equals("CONNECTED")&&record.accessExpires()!=null&&!record.accessExpires().isAfter(clock.instant()))status="REAUTHORIZATION_REQUIRED";
        else if(status.equals("PENDING")&&record.updated().isBefore(clock.instant().minus(Duration.ofMinutes(10))))status="AUTHORIZATION_EXPIRED";
        return new Status(status,settings.enabled(),record.shop(),record.scopes()==null?List.of():List.of(record.scopes().split(",")),record.connected(),record.disconnected(),record.accessExpires(),record.refreshExpires(),record.error(),"NOT_YET_SYNCHRONIZED_MILESTONE_09");
    }
    private void normal(){if(guard.demoRequested())throw new ApiException(HttpStatus.FORBIDDEN,"DEMO_CONNECTION_DISABLED","Real store connections are disabled in the synthetic demo.");}
    @Transactional public String connect(String domain,HttpSession session){
        normal();String shop=ShopifyRules.shop(domain);if(!settings.enabled())throw ApiException.conflict("SHOPIFY_NOT_CONFIGURED","Shopify is not configured. Complete the server-side HTTPS setup first.");cipher.validateKey();
        var current=repository.connection(true);if(current.status().equals("CONNECTED"))throw ApiException.conflict("DISCONNECT_REQUIRED","Disconnect the current installation before authorizing another connection.");
        String state=ShopifyRules.random(),binding=ShopifyRules.random();session.setAttribute(BINDING,binding);
        repository.pending(shop,ShopifyRules.hash(state),ShopifyRules.hash(binding),clock.instant(),current.generation()+1);
        return "https://"+shop+"/admin/oauth/authorize?client_id="+encode(settings.clientId())+"&scope="+encode(String.join(",",ShopifySettings.SCOPES))+"&redirect_uri="+encode(settings.callback())+"&state="+state;
    }
    @Transactional public String callback(Map<String,String[]> query,HttpSession session,boolean authenticated){
        if(guard.demoRequested()||!settings.enabled()||session==null||!authenticated)return "failed";
        Map<String,String> params;try{params=ShopifyRules.verify(query,settings.clientSecret(),clock);}catch(RuntimeException failure){return "failed";}
        Object bound=session.getAttribute(BINDING);if(!(bound instanceof String binding))return "failed";
        var current=repository.connection(true);var state=repository.state(ShopifyRules.hash(params.get("state"))).orElse(null);
        if(state==null||state.consumed()!=null||!state.expires().isAfter(clock.instant())||!ShopifyRules.equal(state.binding(),ShopifyRules.hash(binding))||!ShopifyRules.equal(state.hash(),ShopifyRules.hash(params.get("state")))||!state.shop().equals(params.get("shop"))||!Objects.equals(current.shop(),state.shop())||current.generation()!=state.generation()||!current.status().equals("PENDING"))return "failed";
        if(!repository.consume(state.hash(),clock.instant()))return "failed";session.removeAttribute(BINDING);
        if(params.containsKey("error")){repository.failed("AUTHORIZATION_DENIED",clock.instant());return "denied";}
        ShopifyProvider.Tokens tokens=null;
        try{
            String code=params.get("code");if(code==null||code.isBlank()||code.length()>2048)throw new IllegalArgumentException();
            tokens=provider.exchange(state.shop(),code);
            if(!new HashSet<>(tokens.scopes()).equals(new HashSet<>(ShopifySettings.SCOPES))||tokens.accessExpires()==null||!tokens.accessExpires().isAfter(clock.instant()))throw new IllegalStateException();
            String access=cipher.seal(tokens.access(),state.shop()+":access"),refresh=cipher.seal(tokens.refresh(),state.shop()+":refresh");
            repository.connected(tokens,access,refresh,clock.instant());return "connected";
        }catch(RuntimeException failure){if(tokens!=null)try{provider.revoke(state.shop(),tokens.access());}catch(RuntimeException ignored){}repository.failed("TOKEN_EXCHANGE_FAILED",clock.instant());return "failed";}
    }
    @Transactional public Status disconnect(){
        normal();var record=repository.connection(true);boolean remote=true;
        if(record.access()!=null){try{remote=provider.revoke(record.shop(),cipher.open(record.access(),record.shop()+":access"));}catch(RuntimeException failure){remote=false;}}
        repository.disconnect(remote?null:"REMOTE_REVOCATION_UNCONFIRMED",clock.instant());return status();
    }
    private String encode(String value){return URLEncoder.encode(value,StandardCharsets.UTF_8);}
}
