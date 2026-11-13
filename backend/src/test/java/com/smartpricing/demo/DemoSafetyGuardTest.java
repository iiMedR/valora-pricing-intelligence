package com.smartpricing.demo;

import com.smartpricing.common.ApiException;
import com.smartpricing.demo.config.DemoSafetyGuard;
import javax.sql.DataSource;
import java.sql.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class DemoSafetyGuardTest {
    @Test void incompatiblePortfolioOrSaasProfilesFailBeforeDatabaseAccess() {
        DataSource database=mock(DataSource.class);
        for(String[] profiles:new String[][]{{"portfolio"},{"demo","portfolio","local"},{"demo","saas"}}) {
            var env=new MockEnvironment().withProperty("app.mode","demo");env.setActiveProfiles(profiles);
            assertThatThrownBy(()->new DemoSafetyGuard(env,database).requireDemo()).isInstanceOf(ApiException.class);
        }
        verifyNoInteractions(database);
    }
    @Test void legacyAndPortfolioMarkersAreNotInterchangeable() throws Exception {
        for(boolean portfolio:new boolean[]{false,true}) {
            var env=new MockEnvironment().withProperty("app.mode","demo");env.setActiveProfiles(portfolio?new String[]{"demo","portfolio"}:new String[]{"demo"});
            DataSource database=mock(DataSource.class);Connection connection=mock(Connection.class);Statement sql=mock(Statement.class);
            ResultSet identity=mock(ResultSet.class),marker=mock(ResultSet.class);
            when(database.getConnection()).thenReturn(connection);when(connection.createStatement()).thenReturn(sql);
            when(sql.executeQuery(contains("current_database()"))).thenReturn(identity);
            when(identity.next()).thenReturn(true);when(identity.getString(1)).thenReturn("smartpricing_demo");when(identity.getString(2)).thenReturn("smartpricing_demo");
            when(sql.executeQuery(contains("SELECT e.marker"))).thenReturn(marker);when(marker.next()).thenReturn(true);
            when(marker.getString(1)).thenReturn(portfolio?"SMARTPRICING_ISOLATED_SYNTHETIC_V1":"SMARTPRICING_ISOLATED_PORTFOLIO_V1");
            when(marker.getString(2)).thenReturn("smartpricing_demo_admin");
            assertThatThrownBy(()->new DemoSafetyGuard(env,database).requireDemo()).isInstanceOf(ApiException.class);
            verify(sql,never()).execute(anyString());verify(sql,never()).executeUpdate(anyString());
        }
    }
    @Test void normalProfileAndBooleanFlagAloneAreRefusedWithoutDatabaseAccess() {
        DataSource database=mock(DataSource.class);
        for(String mode:new String[]{"normal","demo"}) {
            var environment=new MockEnvironment().withProperty("app.mode",mode);environment.setActiveProfiles("local");
            var guard=new DemoSafetyGuard(environment,database);
            assertThatThrownBy(guard::requireDemo).isInstanceOf(ApiException.class);
            assertThatThrownBy(()->guard.requireReset(DemoSafetyGuard.RESET_CONFIRMATION)).isInstanceOf(ApiException.class);
        }
        verifyNoInteractions(database);
    }
    @Test void wrongDatabaseAndRoleCannotBeMadeSafeByDemoProfile() throws Exception {
        var environment=new MockEnvironment().withProperty("app.mode","demo");environment.setActiveProfiles("demo");
        DataSource database=mock(DataSource.class);Connection connection=mock(Connection.class);Statement sql=mock(Statement.class);ResultSet row=mock(ResultSet.class);
        when(database.getConnection()).thenReturn(connection);when(connection.createStatement()).thenReturn(sql);when(sql.executeQuery(anyString())).thenReturn(row);
        when(row.next()).thenReturn(true);when(row.getString(1)).thenReturn("smartpricing");when(row.getString(2)).thenReturn("smartpricing");
        assertThatThrownBy(()->new DemoSafetyGuard(environment,database).requireDemo()).isInstanceOf(ApiException.class);
        verify(sql,never()).execute(anyString());verify(sql,never()).executeUpdate(anyString());
    }
}
