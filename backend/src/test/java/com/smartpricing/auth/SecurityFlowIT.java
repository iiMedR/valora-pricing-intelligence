package com.smartpricing.auth;

import com.fasterxml.jackson.databind.*;
import com.smartpricing.shopify.*;
import java.time.*;
import java.util.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes=com.smartpricing.SmartPricingApplication.class,properties={"app.shopify.enabled=true","app.shopify.client-id=ephemeral-test-client","app.shopify.client-secret=ephemeral-test-secret","app.shopify.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","app.shopify.public-base-url=https://example.test","server.servlet.session.cookie.secure=true"})
@AutoConfigureMockMvc
@Testcontainers
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class SecurityFlowIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired MockMvc mvc;@Autowired JdbcTemplate jdbc;@Autowired ObjectMapper mapper;@Autowired AccountService accounts;@Autowired LoginLimiter limiter;
    @MockitoBean ShopifyProvider provider;
    static final String PASSWORD="Ephemeral-test-only-password-2026";
    @BeforeEach void prepare(){reset(provider);limiter.success("127.0.0.1");jdbc.execute("TRUNCATE shopify_oauth_states");jdbc.update("UPDATE shopify_connection SET status='DISCONNECTED',shop_domain=NULL,scopes=NULL,encrypted_access_token=NULL,encrypted_refresh_token=NULL,access_expires_at=NULL,refresh_expires_at=NULL,last_error=NULL,generation=0 WHERE id=1");if(accounts.find("test-admin").isEmpty())accounts.provision("test-admin",PASSWORD);when(provider.exchange(anyString(),anyString())).thenReturn(new ShopifyProvider.Tokens("ephemeral-test-access","ephemeral-test-refresh",Instant.now().plusSeconds(3600),Instant.now().plusSeconds(86400),ShopifySettings.SCOPES));when(provider.revoke(anyString(),anyString())).thenReturn(true);}
    MockHttpSession login()throws Exception{return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content(mapper.writeValueAsString(Map.of("username","test-admin","password",PASSWORD)))).andExpect(status().isOk()).andReturn().getRequest().getSession(false);}
    String connect(MockHttpSession session)throws Exception{var response=mvc.perform(post("/api/v1/integrations/shopify/connect").session(session).with(csrf()).contentType("application/json").content("{\"shop\":\"example-shop.myshopify.com\"}")).andExpect(status().isOk()).andReturn();String url=mapper.readTree(response.getResponse().getContentAsString()).path("authorizationUrl").asText();assertThat(url).startsWith("https://example-shop.myshopify.com/admin/oauth/authorize?");String query=java.net.URI.create(url).getRawQuery();return Arrays.stream(query.split("&")).filter(s->s.startsWith("state=")).findFirst().orElseThrow().substring(6);}
    org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder callback(String state,MockHttpSession session,String error,String shop){Map<String,String> params=new TreeMap<>(Map.of("shop",shop,"state",state,"timestamp",Long.toString(Instant.now().getEpochSecond())));params.put(error==null?"code":"error",error==null?"ephemeral-test-code":error);params.put("hmac",HexFormat.of().formatHex(ShopifyRules.hmac(ShopifyRules.canonical(params),"ephemeral-test-secret")));var request=get("/api/v1/integrations/shopify/callback");params.forEach(request::param);if(session!=null)request.session(session);return request;}
    @Test void provisioningHashAuthBoundariesAndCsrfAreEnforced()throws Exception{
        assertThat(jdbc.queryForObject("SELECT success FROM flyway_schema_history WHERE version='4'",Boolean.class)).isTrue();String hash=jdbc.queryForObject("SELECT password_hash FROM app_accounts",String.class);assertThat(hash).doesNotContain(PASSWORD).startsWith("$2");assertThatThrownBy(()->accounts.provision("another-admin",PASSWORD)).hasMessageContaining("already");
        mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized());mvc.perform(post("/api/v1/products").contentType("application/json").content("{\"name\":\"Denied\"}")).andExpect(status().isForbidden());mvc.perform(get("/api/v1/unknown-route")).andExpect(status().isUnauthorized());mvc.perform(get("/api/v1/products").with(user("viewer").roles("VIEWER"))).andExpect(status().isForbidden());
        MockHttpSession session=login();mvc.perform(get("/api/v1/products").session(session)).andExpect(status().isOk());mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(jsonPath("$.authenticated").value(true)).andExpect(jsonPath("$.username").value("test-admin"));mvc.perform(post("/api/v1/integrations/shopify/disconnect").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/shopify/sync").session(session).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/shopify/sync/status").with(user("viewer").roles("VIEWER"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/onboarding/summary").with(user("viewer").roles("VIEWER"))).andExpect(status().isForbidden());
    }
    @Test void loginRotatesSessionAndLogoutRevokesAccess()throws Exception{
        MockHttpSession before=new MockHttpSession();String old=before.getId();var result=mvc.perform(post("/api/v1/auth/login").session(before).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(Map.of("username","test-admin","password",PASSWORD)))).andExpect(status().isOk()).andReturn();MockHttpSession session=(MockHttpSession)result.getRequest().getSession(false);assertThat(session.getId()).isNotEqualTo(old);
        mvc.perform(post("/api/v1/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());assertThat(session.isInvalid()).isTrue();mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized());mvc.perform(get("/api/v1/auth/me")).andExpect(jsonPath("$.authenticated").value(false));
    }
    @Test void validCallbackStoresOnlyEncryptedCredentialsAndReplayDoesNotExchangeAgain()throws Exception{
        var session=login();String state=connect(session);mvc.perform(callback(state,session,null,"example-shop.myshopify.com")).andExpect(status().isSeeOther()).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=connected"));
        String access=jdbc.queryForObject("SELECT encrypted_access_token FROM shopify_connection",String.class),refresh=jdbc.queryForObject("SELECT encrypted_refresh_token FROM shopify_connection",String.class);assertThat(access).startsWith("v1:").doesNotContain("ephemeral-test-access");assertThat(refresh).startsWith("v1:").doesNotContain("ephemeral-test-refresh");assertThat(jdbc.queryForObject("SELECT consumed_at IS NOT NULL FROM shopify_oauth_states",Boolean.class)).isTrue();
        mvc.perform(get("/api/v1/integrations/shopify/status").session(session)).andExpect(jsonPath("$.status").value("CONNECTED")).andExpect(jsonPath("$.synchronization").value("SEE_SYNC_STATUS"));mvc.perform(callback(state,session,null,"example-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));verify(provider,times(1)).exchange(anyString(),anyString());
        assertThatThrownBy(()->jdbc.update("INSERT INTO shopify_connection(id,status) VALUES(2,'DISCONNECTED')")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void forgedMismatchedExpiredOrStaleSessionCallbackCannotConnect()throws Exception{
        var session=login();String state=connect(session);mvc.perform(get("/api/v1/integrations/shopify/callback").session(session).param("shop","example-shop.myshopify.com").param("state",state).param("hmac","0".repeat(64))).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));
        mvc.perform(callback(state,login(),null,"example-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));mvc.perform(callback(state,session,null,"different-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));mvc.perform(callback(state,null,null,"example-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));
        jdbc.update("UPDATE shopify_oauth_states SET created_at=now()-interval '20 minutes',expires_at=now()-interval '10 minutes'");mvc.perform(callback(state,session,null,"example-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));verifyNoInteractions(provider);assertThat(jdbc.queryForObject("SELECT encrypted_access_token FROM shopify_connection",String.class)).isNull();
    }
    @Test void denialAndExchangeFailureConsumeStateAndSanitizeErrors()throws Exception{
        var session=login();String denied=connect(session);mvc.perform(callback(denied,session,"access_denied","example-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=denied"));verifyNoInteractions(provider);assertThat(jdbc.queryForObject("SELECT last_error FROM shopify_connection",String.class)).isEqualTo("AUTHORIZATION_DENIED");
        String failed=connect(session);when(provider.exchange(anyString(),anyString())).thenThrow(new IllegalStateException("ephemeral-private-provider-detail"));mvc.perform(callback(failed,session,null,"example-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));mvc.perform(callback(failed,session,null,"example-shop.myshopify.com")).andExpect(redirectedUrl("https://example.test/store-connection/callback?outcome=failed"));verify(provider,times(1)).exchange(anyString(),anyString());assertThat(jdbc.queryForObject("SELECT last_error FROM shopify_connection",String.class)).isEqualTo("TOKEN_EXCHANGE_FAILED");
    }
    @Test void disconnectAlwaysErasesLocalCredentialsAndPreservesBusinessRecords()throws Exception{
        var session=login();String state=connect(session);mvc.perform(callback(state,session,null,"example-shop.myshopify.com")).andExpect(status().isSeeOther());jdbc.update("INSERT INTO app_metadata(key,value) VALUES('auth-preserved','retained') ON CONFLICT(key) DO NOTHING");when(provider.revoke(anyString(),anyString())).thenReturn(false);
        mvc.perform(post("/api/v1/integrations/shopify/disconnect").session(session).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DISCONNECTED")).andExpect(jsonPath("$.lastError").value("REMOTE_REVOCATION_UNCONFIRMED"));assertThat(jdbc.queryForObject("SELECT encrypted_access_token IS NULL AND encrypted_refresh_token IS NULL FROM shopify_connection",Boolean.class)).isTrue();assertThat(jdbc.queryForObject("SELECT value FROM app_metadata WHERE key='auth-preserved'",String.class)).isEqualTo("retained");
    }
}
