package com.smartpricing.auth;

import com.smartpricing.demo.config.DemoSafetyGuard;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.web.*;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.authentication.session.*;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.util.StringUtils;

@Configuration
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfiguration {
    @Bean AuthenticationManager authenticationManager(AccountService accounts,org.springframework.security.crypto.password.PasswordEncoder passwords,DemoAccess demoAccess){
        UserDetailsService users=username->{if(demoAccess.required()){if(DemoAccess.USERNAME.equals(username))return demoAccess.viewer();throw new UsernameNotFoundException("Invalid credentials");}return accounts.find(username).map(a->User.withUsername(a.username()).password(a.hash()).roles("ADMIN").build()).orElseThrow(()->new UsernameNotFoundException("Invalid credentials"));};
        var provider=new DaoAuthenticationProvider(users);provider.setPasswordEncoder(passwords);return new ProviderManager(provider);
    }
    @Bean HttpSessionSecurityContextRepository securityContexts(){return new HttpSessionSecurityContextRepository();}
    @Bean CookieCsrfTokenRepository csrfTokens(@Value("${server.servlet.session.cookie.secure:false}")boolean secure){
        var repository=CookieCsrfTokenRepository.withHttpOnlyFalse();repository.setCookieCustomizer(c->c.secure(secure).sameSite("Lax").path("/"));return repository;
    }
    @Bean SessionAuthenticationStrategy sessionStrategy(CookieCsrfTokenRepository csrf){return new CompositeSessionAuthenticationStrategy(List.of(new ChangeSessionIdAuthenticationStrategy(),new CsrfAuthenticationStrategy(csrf)));}
    @Bean SecurityFilterChain security(HttpSecurity http,DemoSafetyGuard guard,DemoAccess demoAccess,HttpSessionSecurityContextRepository contexts,CookieCsrfTokenRepository csrf,ObjectMapper mapper,@Value("${server.servlet.session.cookie.name:SP_SESSION}") String sessionCookie) throws Exception {
        boolean demo=guard.demoRequested();
        if(demo)guard.requireDemo(); // Validate live identity before the web server can serve anonymous demo data.
        http.cors(c->{}).csrf(c->c.csrfTokenRepository(csrf).csrfTokenRequestHandler(new SpaCsrfHandler()))
            .securityContext(c->c.securityContextRepository(contexts).requireExplicitSave(true))
            .requestCache(c->c.disable()).formLogin(c->c.disable()).httpBasic(c->c.disable())
            .headers(c->c.referrerPolicy(r->r.policy(ReferrerPolicy.NO_REFERRER)))
            .exceptionHandling(c->c.authenticationEntryPoint((req,res,e)->error(res,mapper,demo&&!demoAccess.required()?403:401,demo&&!demoAccess.required()?"DEMO_READ_ONLY":"AUTHENTICATION_REQUIRED",demo&&!demoAccess.required()?"The synthetic demo permits read-only browsing only.":"Sign in to continue."))
                .accessDeniedHandler((req,res,e)->error(res,mapper,403,demo?"DEMO_READ_ONLY":"ACCESS_DENIED",demo?"The synthetic demo permits read-only browsing only.":"Action denied. Check your session and CSRF token.")))
            .authorizeHttpRequests(c->{
                c.requestMatchers(HttpMethod.GET,"/api/v1/health","/actuator/health","/api/v1/environment","/api/v1/auth/me","/api/v1/auth/csrf","/api/v1/integrations/shopify/callback").permitAll();
                if(demo){
                    var reads=c.requestMatchers(HttpMethod.GET,"/api/v1/guidance/products/*/variants/*","/api/v1/onboarding/summary","/api/v1/onboarding/readiness/variants","/api/v1/onboarding/readiness/variants/*","/api/v1/shopify/sync/status","/api/v1/products/**","/api/v1/categories/**","/api/v1/business-settings","/api/v1/sales/**","/api/v1/analytics/**","/api/v1/forecasting/**","/api/v1/optimization/**","/api/v1/demo/summary","/api/v1/integrations/shopify/status");
                    if(demoAccess.required()){
                        reads.hasRole("DEMO_VIEWER");
                        c.requestMatchers(HttpMethod.POST,"/api/v1/auth/login").permitAll();
                    }else reads.permitAll();
                }else{
                    c.requestMatchers(HttpMethod.GET,"/api/v1/guidance/products/*/variants/*").hasRole("ADMIN");
                    c.requestMatchers(HttpMethod.GET,"/api/v1/onboarding/summary","/api/v1/onboarding/readiness/variants","/api/v1/onboarding/readiness/variants/*").hasRole("ADMIN");
                    c.requestMatchers("/api/v1/shopify/sync","/api/v1/shopify/sync/**").hasRole("ADMIN");
                    c.requestMatchers("/api/v1/saas/**").hasRole("ADMIN");
                    c.requestMatchers(HttpMethod.POST,"/api/v1/auth/login").permitAll();
                    c.requestMatchers("/api/v1/products/**","/api/v1/categories/**","/api/v1/business-settings","/api/v1/sales/**","/api/v1/analytics/**","/api/v1/forecasting/**","/api/v1/optimization/**","/api/v1/integrations/shopify/status","/api/v1/integrations/shopify/connect","/api/v1/integrations/shopify/disconnect").hasRole("ADMIN");
                }
                c.anyRequest().denyAll();
            });
        if(!demo||demoAccess.required())http.logout(c->c.logoutUrl("/api/v1/auth/logout").invalidateHttpSession(true).clearAuthentication(true).deleteCookies(sessionCookie,"XSRF-TOKEN").logoutSuccessHandler((req,res,a)->res.setStatus(204)));
        return http.build();
    }
    private void error(HttpServletResponse response,ObjectMapper mapper,int status,String code,String message)throws java.io.IOException{
        response.setStatus(status);response.setContentType("application/json");mapper.writeValue(response.getWriter(),Map.of("code",code,"message",message,"timestamp",java.time.Instant.now().toString(),"fieldErrors",Map.of()));
    }
    static class SpaCsrfHandler implements CsrfTokenRequestHandler {
        private final CsrfTokenRequestHandler plain=new CsrfTokenRequestAttributeHandler(),xor=new XorCsrfTokenRequestAttributeHandler();
        public void handle(HttpServletRequest request,HttpServletResponse response,Supplier<CsrfToken> token){xor.handle(request,response,token);token.get();}
        public String resolveCsrfTokenValue(HttpServletRequest request,CsrfToken token){return (StringUtils.hasText(request.getHeader(token.getHeaderName()))?plain:xor).resolveCsrfTokenValue(request,token);}
    }
}
