package com.smartpricing.auth;

import com.smartpricing.demo.config.DemoSafetyGuard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Public portfolio-only viewer. Never provisions or authenticates a normal administrator. */
@Component
public class DemoAccess {
    public static final String USERNAME = "demo";
    public static final String PASSWORD = "ValoraDemo2026!";
    private final boolean required;
    private final String hash;
    public DemoAccess(DemoSafetyGuard guard, PasswordEncoder passwords,
                      @Value("${app.demo.require-login:false}") boolean required) {
        if (required && !guard.demoRequested()) throw new IllegalStateException("Public demo credentials require an isolated demo installation.");
        this.required = required;
        this.hash = required ? passwords.encode(PASSWORD) : null;
    }
    public boolean required() { return required; }
    public UserDetails viewer() { return User.withUsername(USERNAME).password(hash).roles("DEMO_VIEWER").build(); }
    public record Credentials(String username, String password) {}
    public Credentials credentials() { return required ? new Credentials(USERNAME, PASSWORD) : null; }
}
