package com.smartpricing.shopify.sync;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.sql.*;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class SyncMigrationIT {
    @Container static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Test void v4UpgradePreservesDataAndOldChecksumsWithoutSeedOrCredentials()throws Exception{
        Flyway.configure().dataSource(database.getJdbcUrl(),database.getUsername(),database.getPassword()).target("4").load().migrate();
        try(var connection=DriverManager.getConnection(database.getJdbcUrl(),database.getUsername(),database.getPassword());var sql=connection.createStatement()){
            sql.executeUpdate("INSERT INTO app_metadata(key,value) VALUES('v5-retention','preserved')");String before=checksums(sql);
            assertThat(Flyway.configure().dataSource(database.getJdbcUrl(),database.getUsername(),database.getPassword()).target("5").load().migrate().migrationsExecuted).isEqualTo(1);assertThat(checksums(sql)).isEqualTo(before);
            try(var rows=sql.executeQuery("SELECT (SELECT value FROM app_metadata WHERE key='v5-retention'),(SELECT count(*) FROM products),(SELECT count(*) FROM shopify_sync_job),(SELECT count(*) FROM app_accounts)")){rows.next();assertThat(rows.getString(1)).isEqualTo("preserved");assertThat(rows.getLong(2)).isZero();assertThat(rows.getLong(3)).isZero();assertThat(rows.getLong(4)).isZero();}
        }
    }
    String checksums(Statement sql)throws Exception{StringBuilder result=new StringBuilder();try(var rows=sql.executeQuery("SELECT version,checksum FROM flyway_schema_history WHERE version IN ('1','2','3','4') ORDER BY version")){while(rows.next())result.append(rows.getString(1)).append(':').append(rows.getString(2)).append(';');}return result.toString();}
}
