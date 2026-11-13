package com.smartpricing.demo.config;

import com.smartpricing.demo.generator.DemoGenerator;
import com.smartpricing.demo.generator.PortfolioGenerator;
import org.springframework.context.annotation.*;

@Configuration
@Profile("demo")
public class DemoConfiguration {
    @Bean @Profile("!portfolio") DemoGenerator demoGenerator() { return new DemoGenerator(); }
    @Bean @Profile("portfolio") DemoGenerator portfolioGenerator() { return new PortfolioGenerator(); }
}
