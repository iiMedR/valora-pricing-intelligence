package com.smartpricing.auth;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class SecurityHttpIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;@Autowired AccountService accounts;
    @Test void realHttpCookiesCsrfSessionAndLogoutAreEnforced(){
        String password="Ephemeral-cookie-test-password";accounts.provision("cookie-admin",password);
        var csrf=rest.getForEntity("/api/v1/auth/csrf",JsonNode.class);String csrfHeader=csrf.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE).stream().filter(s->s.startsWith("XSRF-TOKEN=")).findFirst().orElseThrow();assertThat(csrfHeader).contains("SameSite=Lax").doesNotContain("HttpOnly");String token=csrfHeader.split(";",2)[0];
        HttpHeaders headers=new HttpHeaders();headers.set(HttpHeaders.COOKIE,token);headers.setContentType(MediaType.APPLICATION_JSON);
        assertThat(rest.exchange("/api/v1/auth/login",HttpMethod.POST,new HttpEntity<>(Map.of("username","cookie-admin","password",password),headers),JsonNode.class).getStatusCode().value()).isEqualTo(403);
        headers.set("X-XSRF-TOKEN",token.substring("XSRF-TOKEN=".length()));var login=rest.exchange("/api/v1/auth/login",HttpMethod.POST,new HttpEntity<>(Map.of("username","cookie-admin","password",password),headers),JsonNode.class);assertThat(login.getStatusCode().value()).isEqualTo(200);
        String cookie=login.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE).stream().filter(s->s.startsWith("SP_SESSION=")).findFirst().orElseThrow();assertThat(cookie).contains("HttpOnly","SameSite=Lax");String session=cookie.split(";",2)[0];HttpHeaders auth=new HttpHeaders();auth.set(HttpHeaders.COOKIE,session);
        assertThat(rest.exchange("/api/v1/products",HttpMethod.GET,new HttpEntity<>(auth),JsonNode.class).getStatusCode().value()).isEqualTo(200);
        assertThat(rest.exchange("/api/v1/saas/plans?asOf=2025-01-31",HttpMethod.GET,new HttpEntity<>(auth),JsonNode.class).getStatusCode().value()).isEqualTo(409);
        var renewed=rest.exchange("/api/v1/auth/csrf",HttpMethod.GET,new HttpEntity<>(auth),JsonNode.class);String next=renewed.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE).stream().filter(s->s.startsWith("XSRF-TOKEN=")).findFirst().orElseThrow().split(";",2)[0];auth.set(HttpHeaders.COOKIE,session+"; "+next);auth.set("X-XSRF-TOKEN",next.substring("XSRF-TOKEN=".length()));
        assertThat(rest.exchange("/api/v1/auth/logout",HttpMethod.POST,new HttpEntity<>(Map.of(),auth),String.class).getStatusCode().value()).isEqualTo(204);
        assertThat(rest.exchange("/api/v1/products",HttpMethod.GET,new HttpEntity<>(auth),JsonNode.class).getStatusCode().value()).isEqualTo(401);
    }
}
