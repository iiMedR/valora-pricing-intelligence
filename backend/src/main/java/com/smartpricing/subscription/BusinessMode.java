package com.smartpricing.subscription;

import com.smartpricing.common.ApiException;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;

@Component
public class BusinessMode implements ApplicationRunner, HandlerInterceptor, WebMvcConfigurer {
    private final JdbcTemplate jdbc;
    private final String requested;
    private final String initialCurrency;
    public BusinessMode(JdbcTemplate jdbc,@Value("${app.business-mode:ECOMMERCE}") String requested,@Value("${app.saas-currency:MAD}") String initialCurrency) {
        this.jdbc=jdbc; this.requested=requested; this.initialCurrency=initialCurrency;
    }
    public String mode() {
        var rows=jdbc.queryForList("SELECT mode FROM installation_mode WHERE id=1",String.class);
        return rows.isEmpty()?"ECOMMERCE":rows.getFirst();
    }
    @Override @Transactional public void run(ApplicationArguments args) {
        if(!requested.equals("ECOMMERCE")&&!requested.equals("SAAS_SUBSCRIPTION")) throw new IllegalStateException("Unsupported installation business mode.");
        var rows=jdbc.queryForList("SELECT mode FROM installation_mode WHERE id=1",String.class);
        if(!rows.isEmpty()) {
            if(!rows.getFirst().equals(requested)) throw new IllegalStateException("Installation mode is immutable; use a fresh installation.");
            return;
        }
        if(requested.equals("SAAS_SUBSCRIPTION")) {
            if("smartpricing_demo".equals(jdbc.queryForObject("SELECT current_database()",String.class))) throw new IllegalStateException("The permanent demo must remain e-commerce.");
            Boolean populated=jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM products) OR EXISTS(SELECT 1 FROM categories) OR EXISTS(SELECT 1 FROM sales_orders) OR EXISTS(SELECT 1 FROM shopify_connection WHERE status <> 'DISCONNECTED' OR generation > 0)",Boolean.class);
            if(Boolean.TRUE.equals(populated)) throw new IllegalStateException("SaaS mode requires a fresh installation without e-commerce data.");
            if(initialCurrency==null||!initialCurrency.matches("[A-Z]{3}"))throw new IllegalStateException("Use an ISO reporting currency.");
            java.util.Currency.getInstance(initialCurrency);
            jdbc.update("UPDATE business_settings SET currency_code=? WHERE id=1",initialCurrency);
        }
        jdbc.update("INSERT INTO installation_mode(id,mode) VALUES(1,?)",requested);
    }
    public void requireSaas() {
        if(!mode().equals("SAAS_SUBSCRIPTION")) throw ApiException.conflict("BUSINESS_MODE_MISMATCH","This installation is configured for e-commerce.");
    }
    @Override public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(this).addPathPatterns("/api/v1/**"); }
    @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler) {
        String p=java.util.Objects.toString(request.getAttribute(org.springframework.web.servlet.HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE),request.getServletPath());
        if(p.startsWith("/api/v1/saas")) { requireSaas(); return true; }
        if(mode().equals("SAAS_SUBSCRIPTION") && (p.matches("/api/v1/(products|categories|sales|analytics|forecasting|optimization|onboarding|shopify|integrations|demo|guidance)(/.*)?") || (p.equals("/api/v1/business-settings")&&!request.getMethod().equals("GET"))))
            throw ApiException.conflict("BUSINESS_MODE_MISMATCH","Use the subscription workspace for this installation.");
        return true;
    }
}
