package com.smartpricing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SmartPricingApplication {
    public static void main(String[] args) {
        var context = SpringApplication.run(SmartPricingApplication.class, args);
        if (java.util.Arrays.stream(args).anyMatch(argument -> argument.startsWith("--demo.action="))) {
            SpringApplication.exit(context);
        }
    }
}
