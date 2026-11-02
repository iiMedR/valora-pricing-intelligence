package com.smartpricing.catalog;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.sql.*;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class MigrationIT {
    @Container static PostgreSQLContainer<?> database = new PostgreSQLContainer<>("postgres:17.7-alpine");

    @Test void upgradesExistingV1WithoutLosingMetadata() throws Exception {
        Flyway.configure().dataSource(database.getJdbcUrl(), database.getUsername(), database.getPassword()).target("1").load().migrate();
        try (Connection connection = DriverManager.getConnection(database.getJdbcUrl(), database.getUsername(), database.getPassword());
             Statement sql = connection.createStatement()) {
            sql.executeUpdate("INSERT INTO app_metadata(key, value) VALUES ('upgrade-check', 'preserve')");
            assertThat(Flyway.configure().dataSource(database.getJdbcUrl(), database.getUsername(), database.getPassword()).load().migrate().migrationsExecuted).isEqualTo(1);
            try (ResultSet rows = sql.executeQuery("SELECT value FROM app_metadata WHERE key = 'upgrade-check'")) {
                assertThat(rows.next()).isTrue(); assertThat(rows.getString(1)).isEqualTo("preserve");
            }
            try (ResultSet rows = sql.executeQuery("SELECT currency_code FROM business_settings WHERE id = 1")) {
                assertThat(rows.next()).isTrue(); assertThat(rows.getString(1)).isEqualTo("MAD");
            }
        }
    }
}
