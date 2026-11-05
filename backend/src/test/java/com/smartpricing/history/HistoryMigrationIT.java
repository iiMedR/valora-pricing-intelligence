package com.smartpricing.history;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.sql.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class HistoryMigrationIT {
    @Container static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Test void upgradesV2AndRetainsCatalogWithoutInventingHistory() throws Exception {
        Flyway.configure().dataSource(database.getJdbcUrl(),database.getUsername(),database.getPassword()).target("2").load().migrate();
        try(Connection connection=DriverManager.getConnection(database.getJdbcUrl(),database.getUsername(),database.getPassword()); Statement sql=connection.createStatement()) {
            UUID product=UUID.randomUUID(),variant=UUID.randomUUID();
            sql.executeUpdate("INSERT INTO products(id,name) VALUES ('"+product+"','Retained product')");
            sql.executeUpdate("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price) VALUES ('"+variant+"','"+product+"','KEEP','Keep',3,10,5,20)");
            assertThat(Flyway.configure().dataSource(database.getJdbcUrl(),database.getUsername(),database.getPassword()).target("3").load().migrate().migrationsExecuted).isEqualTo(1);
            try(ResultSet rows=sql.executeQuery("SELECT sku FROM product_variants WHERE id='"+variant+"'")) { assertThat(rows.next()).isTrue(); assertThat(rows.getString(1)).isEqualTo("KEEP"); }
            try(ResultSet rows=sql.executeQuery("SELECT count(*) FROM variant_price_history")) { rows.next(); assertThat(rows.getInt(1)).isZero(); }
        }
    }
}
