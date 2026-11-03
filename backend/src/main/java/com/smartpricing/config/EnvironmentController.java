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
    public record EnvironmentView(String mode,boolean synthetic,String label,String datasetVersion,String datasetState) {}
    @GetMapping public EnvironmentView info() {
        if(!guard.demoRequested()) return new EnvironmentView("NORMAL",false,"Local workspace",null,"NOT_APPLICABLE");
        guard.requireDemo();
        var versions=jdbc.queryForList("SELECT generator_version FROM demo_control.seed_runs WHERE id=1",String.class);
        return new EnvironmentView("DEMO",true,"Synthetic Demo Data",versions.isEmpty()?DemoSeedConfig.VERSION:versions.getFirst(),versions.isEmpty()?"NOT_INITIALIZED":"READY");
    }
}
