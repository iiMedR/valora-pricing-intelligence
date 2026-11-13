package com.smartpricing.config;

import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.demo.generator.DemoSeedConfig;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/environment")
public class EnvironmentController {
    private final DemoSafetyGuard guard;
    private final JdbcTemplate jdbc;
    public EnvironmentController(DemoSafetyGuard guard,JdbcTemplate jdbc) { this.guard=guard;this.jdbc=jdbc; }
    public record EnvironmentView(String mode,boolean synthetic,String label,String datasetVersion,String datasetState,String businessMode) {}
    private String businessMode() { var rows=jdbc.queryForList("SELECT mode FROM installation_mode WHERE id=1",String.class); return rows.isEmpty()?"ECOMMERCE":rows.getFirst(); }
    @GetMapping public EnvironmentView info() {
        if(!guard.demoRequested()) return new EnvironmentView("NORMAL",false,"Local workspace",null,"NOT_APPLICABLE",businessMode());
        guard.requireDemo();
        var versions=jdbc.queryForList("SELECT generator_version FROM demo_control.seed_runs WHERE id=1",String.class);
        String version=versions.isEmpty()?(guard.portfolioRequested()?"portfolio-v1":DemoSeedConfig.VERSION):versions.getFirst();
        return new EnvironmentView("DEMO",true,guard.portfolioRequested()?"Synthetic portfolio demo":"Synthetic Demo Data · Legacy research fixture",version,versions.isEmpty()?"NOT_INITIALIZED":"READY","ECOMMERCE");
    }
}
