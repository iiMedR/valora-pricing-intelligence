package com.smartpricing.optimization;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;

class ModelAuditMigrationIT {
    @Test void v6PreservesPriorSchemaChecksumsAndBusinessSettings()throws Exception {
        try(var db=new PostgreSQLContainer<>("postgres:17.7-alpine")) {
            db.start();var configuration=Flyway.configure().dataSource(db.getJdbcUrl(),db.getUsername(),db.getPassword());
            configuration.target("5").load().migrate();
            try(var connection=java.sql.DriverManager.getConnection(db.getJdbcUrl(),db.getUsername(),db.getPassword());var sql=connection.createStatement()) {
                sql.executeUpdate("UPDATE business_settings SET display_name='Retained business'");
                String before=checksums(sql);assertThat(configuration.target("6").load().migrate().migrationsExecuted).isEqualTo(1);
                assertThat(checksums(sql)).isEqualTo(before);
                try(var rows=sql.executeQuery("SELECT display_name FROM business_settings")){rows.next();assertThat(rows.getString(1)).isEqualTo("Retained business");}
                try(var rows=sql.executeQuery("SELECT count(*) FROM model_evaluation_audit")){rows.next();assertThat(rows.getInt(1)).isZero();}
            }
        }
    }
    String checksums(java.sql.Statement sql)throws Exception{try(var r=sql.executeQuery("SELECT string_agg(version||':'||checksum,',' ORDER BY installed_rank) FROM flyway_schema_history WHERE version IN ('1','2','3','4','5')")){r.next();return r.getString(1);}}
}
