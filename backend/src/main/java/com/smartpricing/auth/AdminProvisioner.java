package com.smartpricing.auth;

import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(0)
public class AdminProvisioner implements ApplicationRunner {
    private final AccountService accounts;public AdminProvisioner(AccountService accounts){this.accounts=accounts;}
    @Override public void run(ApplicationArguments arguments){
        if(!arguments.containsOption("auth.action"))return;
        var actions=arguments.getOptionValues("auth.action");
        if(actions==null||actions.size()!=1||!actions.getFirst().equals("provision"))throw new IllegalArgumentException("Only explicit admin provisioning is supported.");
        accounts.provision(System.getenv("ADMIN_USERNAME"),System.getenv("ADMIN_PASSWORD"));
        System.out.println("Administrator provisioned. One-time setup is now closed.");
    }
}
