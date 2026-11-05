package com.smartpricing.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    private final String[] origins;

    public WebConfiguration(@Value("${app.cors.allowed-origins}") String[] origins) {
        if(java.util.Arrays.stream(origins).anyMatch(origin->origin.contains("*")))throw new IllegalArgumentException("Credentialed CORS requires explicit trusted origins.");
        this.origins = origins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins(origins)
                .allowCredentials(true).allowedHeaders("Content-Type","X-XSRF-TOKEN")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}
