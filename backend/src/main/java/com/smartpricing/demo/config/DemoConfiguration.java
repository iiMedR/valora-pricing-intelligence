package com.smartpricing.demo.config;

import com.smartpricing.demo.generator.DemoGenerator;
import org.springframework.context.annotation.*;

@Configuration
@Profile("demo")
public class DemoConfiguration {
    @Bean DemoGenerator demoGenerator() { return new DemoGenerator(); }
}
