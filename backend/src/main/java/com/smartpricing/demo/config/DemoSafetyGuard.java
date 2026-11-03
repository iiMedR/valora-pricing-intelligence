package com.smartpricing.demo.config;

import com.smartpricing.common.ApiException;
import java.sql.*;
import java.util.Arrays;
import javax.sql.DataSource;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class DemoSafetyGuard {
    public static final String RESET_CONFIRMATION = "RESET_SYNTHETIC_DEMO";
    private final Environment environment;
    private final DataSource dataSource;
    private volatile boolean identityVerified;

    public DemoSafetyGuard(Environment environment, DataSource dataSource) {
        this.environment = environment;
        this.dataSource = dataSource;
    }

    public boolean demoRequested() {
        return Arrays.asList(environment.getActiveProfiles()).contains("demo")
                || "demo".equals(environment.getProperty("app.mode"));
    }

    public void requireDemoMode() {
        var profiles = Arrays.asList(environment.getActiveProfiles());
        if (!profiles.contains("demo") || profiles.contains("local")
                || !"demo".equals(environment.getProperty("app.mode"))) {
            throw refused("An exclusive demo profile and demo application mode are required.");
        }
    }

    public void requireDemo() {
        requireDemoMode();
        try (Connection connection = dataSource.getConnection(); Statement sql = connection.createStatement()) {
            try (ResultSet identity = sql.executeQuery("SELECT current_database(),current_user,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user)")) {
                identity.next();
                if (!"smartpricing_demo".equals(identity.getString(1))
                        || !"smartpricing_demo".equals(identity.getString(2)) || identity.getBoolean(3)) {
                    throw refused("The target is not the restricted, dedicated demo database.");
                }
            }
            try (ResultSet marker = sql.executeQuery("""
                    SELECT e.marker,pg_get_userbyid(c.relowner)
                    FROM demo_control.environment e
                    JOIN pg_class c ON c.oid='demo_control.environment'::regclass WHERE e.id=1
                    """)) {
                if (!marker.next() || !"SMARTPRICING_ISOLATED_SYNTHETIC_V1".equals(marker.getString(1))
                        || !"smartpricing_demo_admin".equals(marker.getString(2))) {
                    throw refused("The read-only isolated-demo identity marker is invalid.");
                }
            }
            try (ResultSet rights = sql.executeQuery("SELECT has_table_privilege(current_user,'demo_control.environment','INSERT,UPDATE,DELETE,TRUNCATE')")) {
                rights.next();
                if (rights.getBoolean(1)) throw refused("The application must not be able to modify its identity marker.");
            }
            identityVerified = true;
        } catch (SQLException exception) {
            throw refused("The isolated demo database or its identity marker is unavailable.");
        }
    }

    public void requireVerifiedDemo() {
        requireDemoMode();
        // The configured DataSource is fixed for this application context. Resets always re-check the live identity.
        if (!identityVerified) requireDemo();
    }

    public void requireReset(String confirmation) {
        requireDemo();
        if (!RESET_CONFIRMATION.equals(confirmation)) throw refused("Reset requires the explicit RESET_SYNTHETIC_DEMO confirmation flag.");
    }

    private ApiException refused(String message) {
        return ApiException.conflict("DEMO_SAFETY_REFUSAL", message);
    }
}
