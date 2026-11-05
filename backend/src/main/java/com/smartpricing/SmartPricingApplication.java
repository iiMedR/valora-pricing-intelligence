package com.smartpricing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class)
public class SmartPricingApplication {
    public static void main(String[] args) {
        var context = SpringApplication.run(SmartPricingApplication.class, args);
        if (java.util.Arrays.stream(args).anyMatch(argument -> argument.startsWith("--demo.action=")||argument.startsWith("--auth.action="))) {
            SpringApplication.exit(context);
        }
    }
}
