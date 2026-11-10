package com.smartpricing.subscription;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BusinessModeTest {
    @Test void populatedInstallationCannotInitializeAsSaas() {
        var jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForList("SELECT mode FROM installation_mode WHERE id=1",String.class)).thenReturn(List.of());
        when(jdbc.queryForObject("SELECT current_database()",String.class)).thenReturn("normal");
        when(jdbc.queryForObject(startsWith("SELECT EXISTS"),eq(Boolean.class))).thenReturn(true);
        assertThatThrownBy(()->new BusinessMode(jdbc,"SAAS_SUBSCRIPTION","MAD").run(new DefaultApplicationArguments())).hasMessageContaining("fresh installation");
        verify(jdbc,never()).update(startsWith("INSERT INTO installation_mode"),any(Object[].class));
    }
    @Test void permanentDemoCannotInitializeAsSaas() {
        var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForList(anyString(),eq(String.class))).thenReturn(List.of());when(jdbc.queryForObject("SELECT current_database()",String.class)).thenReturn("smartpricing_demo");
        assertThatThrownBy(()->new BusinessMode(jdbc,"SAAS_SUBSCRIPTION","MAD").run(new DefaultApplicationArguments())).hasMessageContaining("demo");
    }
    @Test void persistedModeCannotChangeOnRestart() {
        var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForList(anyString(),eq(String.class))).thenReturn(List.of("ECOMMERCE"));
        assertThatThrownBy(()->new BusinessMode(jdbc,"SAAS_SUBSCRIPTION","USD").run(new DefaultApplicationArguments())).hasMessageContaining("immutable");
        new BusinessMode(jdbc,"ECOMMERCE","MAD").run(new DefaultApplicationArguments());
    }
    @Test void unsupportedModeAndWindowFailClosed() {
        assertThatThrownBy(()->new BusinessMode(mock(JdbcTemplate.class),"OTHER","MAD").run(new DefaultApplicationArguments())).hasMessageContaining("Unsupported");
        assertThatThrownBy(()->SubscriptionService.window(java.time.LocalDate.of(2025,2,1),java.time.LocalDate.of(2025,1,1))).isInstanceOf(com.smartpricing.common.ApiException.class);
    }
}
