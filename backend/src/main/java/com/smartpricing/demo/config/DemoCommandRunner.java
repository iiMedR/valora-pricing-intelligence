package com.smartpricing.demo.config;

import com.smartpricing.common.ApiException;
import com.smartpricing.demo.generator.DemoSeedConfig;
import com.smartpricing.demo.service.DemoSeedService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.*;
import org.springframework.stereotype.Component;

@Component
public class DemoCommandRunner implements ApplicationRunner {
    private final DemoSafetyGuard guard;
    private final ObjectProvider<DemoSeedService> seeds;
    private final ObjectMapper mapper;

    public DemoCommandRunner(DemoSafetyGuard guard,ObjectProvider<DemoSeedService> seeds,ObjectMapper mapper) {
        this.guard=guard;this.seeds=seeds;this.mapper=mapper;
    }
    @Override public void run(ApplicationArguments args) throws Exception {
        if(!args.containsOption("demo.action")) {
            if(guard.demoRequested()) guard.requireDemo(); // Also protect a demo startup with Flyway explicitly disabled.
            return; // No auto-seeding, including ordinary demo-profile startup.
        }
        guard.requireDemo();
        String action=option(args,"demo.action","");
        if(!java.util.Set.of("seed","reset","summary","export").contains(action)) throw ApiException.invalid("Demo action must be seed, reset, summary, or export.");
        if(action.equals("export")) {
            var target=java.nio.file.Path.of(option(args,"demo.export-file","target/demo-canonical.jsonl")).toAbsolutePath().normalize();
            java.nio.file.Files.createDirectories(target.getParent());
            java.nio.file.Files.writeString(target,seeds.getObject().canonicalExport(),java.nio.charset.StandardCharsets.UTF_8);
            System.out.println("DEMO_EXPORT "+target);
            return;
        }
        long defaultSeed=guard.portfolioRequested()?com.smartpricing.demo.generator.PortfolioGenerator.SEED:DemoSeedConfig.DEFAULT_SEED;
        DemoSeedConfig config=new DemoSeedConfig(Long.parseLong(option(args,"demo.seed",String.valueOf(defaultSeed))),
                LocalDate.parse(option(args,"demo.start-date",DemoSeedConfig.DEFAULT_START.toString())));
        Object result=switch(action) {
            case "seed" -> seeds.getObject().seed(config);
            case "reset" -> seeds.getObject().resetAndSeed(config,option(args,"demo.confirm-reset",null));
            default -> seeds.getObject().summary();
        };
        System.out.println("DEMO_SUMMARY "+mapper.writeValueAsString(result));
    }
    private String option(ApplicationArguments args,String name,String fallback) {
        var values=args.getOptionValues(name);
        if(values==null) return fallback;
        if(values.size()!=1) throw ApiException.invalid("Exactly one value is required for "+name+".");
        return values.getFirst();
    }
}
