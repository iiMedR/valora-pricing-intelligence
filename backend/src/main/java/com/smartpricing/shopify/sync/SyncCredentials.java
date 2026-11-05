package com.smartpricing.shopify.sync;

import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.shopify.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SyncCredentials {
    private final ShopifyRepository repository;private final ShopifyProvider provider;private final TokenCipher cipher;private final DemoSafetyGuard guard;private final ShopifySettings settings;private final Clock clock;
    public SyncCredentials(ShopifyRepository repository,ShopifyProvider provider,TokenCipher cipher,DemoSafetyGuard guard,ShopifySettings settings,Clock clock){this.repository=repository;this.provider=provider;this.cipher=cipher;this.guard=guard;this.settings=settings;this.clock=clock;}
    public record Access(String shop,long generation,String token){@Override public String toString(){return "Access[REDACTED]";}}
    @Transactional public Access access(String expectedShop,long generation){
        if(guard.demoRequested())throw new SyncFailure("DEMO_SYNC_DISABLED");
        var connection=repository.connection(true);
        if(!settings.enabled()||!connection.status().equals("CONNECTED")||!Objects.equals(expectedShop,connection.shop())||generation!=connection.generation())throw new SyncFailure("CONNECTION_CHANGED_OR_DISCONNECTED");
        if(connection.scopes()==null||!new HashSet<>(List.of(connection.scopes().split(","))).containsAll(ShopifySettings.SCOPES))throw new SyncFailure("REQUIRED_SCOPE_OR_PERMISSION_MISSING");
        try {
            if(connection.accessExpires()==null||!connection.accessExpires().isAfter(clock.instant().plusSeconds(60))){
                if(connection.refreshExpires()!=null&&!connection.refreshExpires().isAfter(clock.instant()))throw new SyncFailure("REAUTHORIZATION_REQUIRED");
                var tokens=provider.refresh(connection.shop(),cipher.open(connection.refresh(),connection.shop()+":refresh"));
                if(tokens==null||tokens.accessExpires()==null||!tokens.accessExpires().isAfter(clock.instant())||!new HashSet<>(tokens.scopes()).equals(new HashSet<>(ShopifySettings.SCOPES)))throw new SyncFailure("REAUTHORIZATION_REQUIRED");
                // Atomic rotation; never retain an obsolete refresh token. OAuth and disconnect use the same row lock.
                repository.rotate(tokens,cipher.seal(tokens.access(),connection.shop()+":access"),cipher.seal(tokens.refresh(),connection.shop()+":refresh"),clock.instant());
                return new Access(connection.shop(),generation,tokens.access());
            }
            return new Access(connection.shop(),generation,cipher.open(connection.access(),connection.shop()+":access"));
        }catch(SyncFailure safe){throw safe;}catch(RuntimeException ignored){throw new SyncFailure("REAUTHORIZATION_REQUIRED");}
    }
}
