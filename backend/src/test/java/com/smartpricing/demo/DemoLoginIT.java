package com.smartpricing.demo;

import com.smartpricing.auth.DemoAccess;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,properties="app.demo.require-login=true")
@ActiveProfiles("demo") @AutoConfigureMockMvc @Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class DemoLoginIT {
    static final String password=UUID.randomUUID().toString();
    @Container static PostgreSQLContainer<?> database=DemoSeederIT.container(password);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->DemoSeederIT.url(database));r.add("spring.datasource.username",()->"smartpricing_demo");r.add("spring.datasource.password",()->password);}
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc;
    String credentials(){return "{\"username\":\""+DemoAccess.USERNAME+"\",\"password\":\""+DemoAccess.PASSWORD+"\"}";}
    MockHttpSession login()throws Exception{return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content(credentials())).andExpect(status().isOk()).andExpect(jsonPath("$.authenticated").value(true)).andExpect(jsonPath("$.readOnly").value(true)).andReturn().getRequest().getSession(false);}
    @Test void anonymousReadsRequireLoginAndCredentialsAreExplicitlyPublic()throws Exception{
        mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
        mvc.perform(get("/api/v1/demo/summary")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isOk()).andExpect(jsonPath("$.authenticated").value(false)).andExpect(jsonPath("$.loginRequired").value(true)).andExpect(jsonPath("$.demoAccount.username").value(DemoAccess.USERNAME)).andExpect(jsonPath("$.demoAccount.password").value(DemoAccess.PASSWORD));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_accounts",Long.class)).isZero();
    }
    @Test void loginUsesCsrfAndRotatesSessionWhilePreservingReadOnlyAuthorization()throws Exception{
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(credentials())).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"username\":\"demo\",\"password\":\"incorrect-password\"}")).andExpect(status().isUnauthorized());
        var before=new MockHttpSession();String id=before.getId();
        var result=mvc.perform(post("/api/v1/auth/login").session(before).with(csrf()).contentType("application/json").content(credentials())).andExpect(status().isOk()).andReturn();
        var session=(MockHttpSession)result.getRequest().getSession(false);assertThat(session.getId()).isNotEqualTo(id);
        mvc.perform(get("/api/v1/products").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(jsonPath("$.username").value("demo")).andExpect(jsonPath("$.readOnly").value(true));
        for(String path:java.util.List.of("/api/v1/products","/api/v1/integrations/shopify/connect","/api/v1/shopify/sync","/api/v1/optimization/variants/"+UUID.randomUUID()+"/evaluations"))mvc.perform(post(path).session(session).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/saas/plans?asOf=2025-01-31").session(session)).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM model_evaluation_audit",Long.class)).isZero();
    }
    @Test void logoutRequiresCsrfAndInvalidatesProtectedAccess()throws Exception{
        var session=login();mvc.perform(post("/api/v1/auth/logout").session(session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/products").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized());
    }
}
