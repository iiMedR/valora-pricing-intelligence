package com.smartpricing.auth;
import com.smartpricing.demo.config.DemoSafetyGuard;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class DemoAccessTest {
    @Test void publicCredentialsCannotBeEnabledInNormalMode(){var guard=mock(DemoSafetyGuard.class);assertThatThrownBy(()->new DemoAccess(guard,new BCryptPasswordEncoder(12),true)).isInstanceOf(IllegalStateException.class);assertThat(new DemoAccess(guard,new BCryptPasswordEncoder(12),false).credentials()).isNull();}
    @Test void demoViewerHasOnlyViewerAuthorityAndABcryptHash(){var guard=mock(DemoSafetyGuard.class);when(guard.demoRequested()).thenReturn(true);var encoder=new BCryptPasswordEncoder(12);var access=new DemoAccess(guard,encoder,true);assertThat(access.viewer().getAuthorities()).extracting(Object::toString).containsExactly("ROLE_DEMO_VIEWER");assertThat(access.viewer().getPassword()).startsWith("$2a$12$");assertThat(encoder.matches(DemoAccess.PASSWORD,access.viewer().getPassword())).isTrue();}
}
