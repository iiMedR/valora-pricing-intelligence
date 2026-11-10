package com.smartpricing.subscription;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;

class SubscriptionMigrationIT {
    @Test void v7AddsEmptyDomainWithoutChangingV1ToV6OrExistingBusinessData() throws Exception {
        try(var db=new PostgreSQLContainer<>("postgres:17.7-alpine")) {
            db.start();var config=Flyway.configure().dataSource(db.getJdbcUrl(),db.getUsername(),db.getPassword());config.target("6").load().migrate();
            try(var c=java.sql.DriverManager.getConnection(db.getJdbcUrl(),db.getUsername(),db.getPassword());var sql=c.createStatement()) {
                sql.executeUpdate("INSERT INTO products(id,name,status) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Retained catalog','ACTIVE')");
                String before=checksums(sql);assertThat(config.target("latest").load().migrate().migrationsExecuted).isEqualTo(1);assertThat(checksums(sql)).isEqualTo(before);
                try(var r=sql.executeQuery("SELECT name FROM products")){r.next();assertThat(r.getString(1)).isEqualTo("Retained catalog");}
                try(var r=sql.executeQuery("SELECT (SELECT count(*) FROM subscription_events)+(SELECT count(*) FROM subscription_prices)+(SELECT count(*) FROM subscription_payments)+(SELECT count(*) FROM installation_mode)")){r.next();assertThat(r.getInt(1)).isZero();}
            }
        }
    }
    String checksums(java.sql.Statement s)throws Exception {try(var r=s.executeQuery("SELECT string_agg(version||':'||checksum,',' ORDER BY installed_rank) FROM flyway_schema_history WHERE version IN ('1','2','3','4','5','6')")){r.next();return r.getString(1);}}
}
