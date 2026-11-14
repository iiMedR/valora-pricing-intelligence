package com.smartpricing.health;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HealthController.class)
@org.springframework.context.annotation.Import({com.smartpricing.auth.SecurityConfiguration.class,com.smartpricing.auth.AuthFoundation.class,com.smartpricing.auth.DemoAccess.class})
class HealthControllerTest {
    @org.springframework.test.context.bean.override.mockito.MockitoBean com.smartpricing.auth.AccountService accounts;
    @org.springframework.test.context.bean.override.mockito.MockitoBean com.smartpricing.demo.config.DemoSafetyGuard guard;
    @org.springframework.test.context.bean.override.mockito.MockitoBean com.smartpricing.subscription.BusinessMode businessMode;
    @Autowired MockMvc mvc;

    @Test void returnsStableStatus() throws Exception {
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk())
                .andExpect(content().json("{\"status\":\"UP\"}"));
    }

    @Test void allowsConfiguredLocalOrigin() throws Exception {
        mvc.perform(get("/api/v1/health").header("Origin", "http://localhost:4200"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
    }

    @Test void rejectsUnconfiguredOrigin() throws Exception {
        mvc.perform(get("/api/v1/health").header("Origin", "https://example.com"))
                .andExpect(status().isForbidden());
    }
}
