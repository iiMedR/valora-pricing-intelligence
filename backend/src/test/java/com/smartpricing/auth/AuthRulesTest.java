package com.smartpricing.auth;

import com.smartpricing.demo.config.DemoSafetyGuard;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthRulesTest {
    @Test void secureCsrfCookieIsReadableOnlyAsCsrfNotAsSession(){var repository=new SecurityConfiguration().csrfTokens(true);var servlet=new org.springframework.mock.web.MockServletContext();servlet.setMajorVersion(6);var request=new org.springframework.mock.web.MockHttpServletRequest(servlet);var response=new org.springframework.mock.web.MockHttpServletResponse();repository.saveToken(repository.generateToken(request),request,response);assertThat(response.getHeader("Set-Cookie")).contains("XSRF-TOKEN=","Secure").doesNotContain("HttpOnly");assertThat(response.getCookie("XSRF-TOKEN").getAttribute("SameSite")).isEqualTo("Lax");}
    @Test void adaptivePasswordHashIsSaltedAndNotReversible(){var encoder=new BCryptPasswordEncoder(12);String password="Ephemeral-only-test-password";String a=encoder.encode(password),b=encoder.encode(password);assertThat(a).isNotEqualTo(password).isNotEqualTo(b);assertThat(encoder.matches(password,a)).isTrue();assertThat(encoder.matches("wrong-password",a)).isFalse();}
    @Test void demoProvisioningFailsBeforeAccountWrite(){var guard=mock(DemoSafetyGuard.class);when(guard.demoRequested()).thenReturn(true);var account=new AccountService(null,new BCryptPasswordEncoder(12),guard);assertThatThrownBy(()->account.provision("test-admin","Ephemeral-only-test-password")).hasMessageContaining("demo");}
    @Test void loginLimitsAreBoundedExpireAndSuccessResetsOnlyIp(){var clock=mock(Clock.class);Instant now=Instant.parse("2026-11-12T00:00:00Z");when(clock.instant()).thenReturn(now);var limiter=new LoginLimiter(clock);for(int i=0;i<8;i++)assertThat(limiter.allow("127.0.0.1")).isTrue();assertThat(limiter.allow("127.0.0.1")).isFalse();limiter.success("127.0.0.1");assertThat(limiter.allow("127.0.0.1")).isTrue();for(int i=0;i<30;i++)limiter.allow("address-"+i);assertThat(limiter.allow("new-address")).isFalse();when(clock.instant()).thenReturn(now.plusSeconds(901));assertThat(limiter.allow("127.0.0.1")).isTrue();}
}
