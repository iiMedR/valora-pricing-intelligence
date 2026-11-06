package com.smartpricing.demo;

import java.nio.file.Path;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.utility.MountableFile;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class)
@ActiveProfiles("demo")
@AutoConfigureMockMvc
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class DemoReadOnlyIT {
    static final String password=UUID.randomUUID().toString();
    @Container static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine").withDatabaseName("postgres").withUsername("smartpricing_demo_admin").withPassword(UUID.randomUUID().toString()).withEnv("DEMO_DB_PASSWORD",password).withCopyFileToContainer(MountableFile.forHostPath(Path.of("../infra/demo/10-isolated-demo.sh").toAbsolutePath().normalize()),"/docker-entrypoint-initdb.d/10-isolated-demo.sh");
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->database.getJdbcUrl().replace("/postgres","/smartpricing_demo"));r.add("spring.datasource.username",()->"smartpricing_demo");r.add("spring.datasource.password",()->password);}
    @Autowired MockMvc mvc;@Autowired JdbcTemplate jdbc;
    @Test void demoBrowsesAnonymouslyButCannotWriteOrConnectOrProvisionSecrets()throws Exception{
        mvc.perform(get("/api/v1/products")).andExpect(status().isOk());mvc.perform(get("/api/v1/auth/me")).andExpect(jsonPath("$.mode").value("DEMO")).andExpect(jsonPath("$.readOnly").value(true)).andExpect(jsonPath("$.authenticated").value(false));
        mvc.perform(get("/api/v1/integrations/shopify/status")).andExpect(jsonPath("$.status").value("DEMO_DISABLED"));
        mvc.perform(get("/api/v1/shopify/sync/status")).andExpect(status().isOk()).andExpect(jsonPath("$.demo").value(true)).andExpect(jsonPath("$.connected").value(false)).andExpect(jsonPath("$.shop").isEmpty());
        mvc.perform(post("/api/v1/shopify/sync").with(csrf()).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/onboarding/summary")).andExpect(status().isOk()).andExpect(jsonPath("$.synthetic").value(true)).andExpect(jsonPath("$.workflowState").value("SYNTHETIC_DEMO")).andExpect(jsonPath("$.synchronization.shop").isEmpty());
        mvc.perform(get("/api/v1/onboarding/readiness/variants")).andExpect(status().isOk());mvc.perform(post("/api/v1/onboarding/summary").with(csrf())).andExpect(status().isForbidden());
        for(String path:List.of("/api/v1/products","/api/v1/auth/login","/api/v1/integrations/shopify/connect","/api/v1/integrations/shopify/disconnect"))mvc.perform(post(path).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_accounts",Long.class)).isZero();assertThat(jdbc.queryForObject("SELECT count(*) FROM shopify_oauth_states",Long.class)).isZero();assertThat(jdbc.queryForObject("SELECT encrypted_access_token FROM shopify_connection",String.class)).isNull();assertThat(jdbc.queryForObject("SELECT success FROM flyway_schema_history WHERE version='4'",Boolean.class)).isTrue();
    }
}
