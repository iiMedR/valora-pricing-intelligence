package com.smartpricing.demo.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

@Configuration
public class DemoMigrationConfiguration {
    @Bean
    FlywayMigrationStrategy guardedMigration(DemoSafetyGuard guard, Environment environment) {
        return flyway -> {
            // Refuse a misplaced demo command before Flyway can touch a normal database.
            if (guard.demoRequested() || environment.containsProperty("demo.action")) guard.requireDemo();
            flyway.migrate();
        };
    }
}
