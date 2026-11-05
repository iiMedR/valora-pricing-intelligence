package com.smartpricing.shopify;

import com.smartpricing.demo.config.DemoSafetyGuard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@EnableConfigurationProperties(ShopifySettings.class)
@Order(-1000)
public class ShopifyConfiguration implements ApplicationRunner {
    private final ShopifySettings settings;private final TokenCipher cipher;private final DemoSafetyGuard guard;private final JdbcTemplate jdbc;private final boolean secure;
    public ShopifyConfiguration(ShopifySettings settings,TokenCipher cipher,DemoSafetyGuard guard,JdbcTemplate jdbc,@Value("${server.servlet.session.cookie.secure:false}")boolean secure){this.settings=settings;this.cipher=cipher;this.guard=guard;this.jdbc=jdbc;this.secure=secure;}
    @jakarta.annotation.PostConstruct public void validateSettings(){if(!guard.demoRequested()&&settings.enabled()){if(settings.clientId().isBlank()||settings.clientSecret().isBlank()||!secure)throw new IllegalStateException("Shopify requires client configuration, a public HTTPS origin and secure session cookies.");settings.publicOrigin();cipher.validateKey();}}
    @Override public void run(ApplicationArguments args){
        if(guard.demoRequested()){
            guard.requireDemo();
            if(jdbc.queryForObject("SELECT (SELECT count(*) FROM app_accounts)+(SELECT count(*) FROM shopify_oauth_states)+(SELECT count(*) FROM shopify_connection WHERE encrypted_access_token IS NOT NULL OR encrypted_refresh_token IS NOT NULL OR shop_domain IS NOT NULL)",Long.class)!=0)throw new IllegalStateException("Security accounts or real provider connections must not exist in the isolated demo.");
            return;
        }
    }
}
