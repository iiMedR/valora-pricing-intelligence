package com.smartpricing.demo.controller;

import com.smartpricing.demo.service.DemoSeedService;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("demo")
@RequestMapping("/api/v1/demo")
public class DemoSummaryController {
    private final DemoSeedService seeds;
    public DemoSummaryController(DemoSeedService seeds) { this.seeds=seeds; }
    @GetMapping("/summary") public Map<String,Object> summary() { return seeds.summary(); }
}
