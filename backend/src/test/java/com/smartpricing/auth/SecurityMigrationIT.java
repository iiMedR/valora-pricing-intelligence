package com.smartpricing.auth;

import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class SecurityMigrationIT {
    @Container static PostgreSQLContainer<?> database=new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Test void v3UpgradeRetainsBusinessDataAndPriorChecksums()throws Exception{
        var flyway=Flyway.configure().dataSource(database.getJdbcUrl(),database.getUsername(),database.getPassword());flyway.target("3").load().migrate();
        try(var connection=DriverManager.getConnection(database.getJdbcUrl(),database.getUsername(),database.getPassword());var sql=connection.createStatement()){
            sql.executeUpdate("INSERT INTO app_metadata(key,value) VALUES('security-upgrade','retained')");var before=checksums(sql);Flyway.configure().dataSource(database.getJdbcUrl(),database.getUsername(),database.getPassword()).load().migrate();assertThat(checksums(sql)).containsAll(before);
            try(var rows=sql.executeQuery("SELECT value FROM app_metadata WHERE key='security-upgrade'")){rows.next();assertThat(rows.getString(1)).isEqualTo("retained");}
            try(var rows=sql.executeQuery("SELECT count(*) FROM app_accounts")){rows.next();assertThat(rows.getInt(1)).isZero();}
            try(var rows=sql.executeQuery("SELECT status,encrypted_access_token,encrypted_refresh_token FROM shopify_connection")){rows.next();assertThat(rows.getString(1)).isEqualTo("DISCONNECTED");assertThat(rows.getString(2)).isNull();assertThat(rows.getString(3)).isNull();}
        }
    }
    List<String> checksums(Statement sql)throws Exception{List<String> result=new ArrayList<>();try(var rows=sql.executeQuery("SELECT version,checksum FROM flyway_schema_history WHERE version IN ('1','2','3') ORDER BY version")){while(rows.next())result.add(rows.getString(1)+":"+rows.getString(2));}return result;}
}
