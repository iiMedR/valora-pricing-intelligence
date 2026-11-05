package com.smartpricing.auth;

import com.smartpricing.common.ApiException;
import com.smartpricing.demo.config.DemoSafetyGuard;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final JdbcTemplate jdbc;private final PasswordEncoder passwords;private final DemoSafetyGuard guard;
    public AccountService(JdbcTemplate jdbc,PasswordEncoder passwords,DemoSafetyGuard guard){this.jdbc=jdbc;this.passwords=passwords;this.guard=guard;}
    public record Account(String username,String hash) { @Override public String toString(){return "Account[REDACTED]";} }
    public Optional<Account> find(String username){return jdbc.query("SELECT username,password_hash FROM app_accounts WHERE id=1 AND username=?",(rs,n)->new Account(rs.getString(1),rs.getString(2)),username.toLowerCase(Locale.ROOT)).stream().findFirst();}
    @Transactional public void provision(String username,String password){
        if(guard.demoRequested()||"smartpricing_demo".equals(jdbc.queryForObject("SELECT current_database()",String.class)))throw ApiException.conflict("DEMO_AUTH_DISABLED","Accounts cannot be provisioned in the isolated demo.");
        if(username==null||!username.toLowerCase(Locale.ROOT).matches("[a-z0-9._-]{3,64}")||password==null||password.length()<12||password.getBytes(StandardCharsets.UTF_8).length>72)
            throw ApiException.invalid("Use a 3–64 character account name and a password of at least 12 characters, at most 72 UTF-8 bytes.");
        jdbc.execute("SELECT pg_advisory_xact_lock(831472815)");
        if(jdbc.queryForObject("SELECT count(*) FROM app_accounts",Long.class)>0)throw ApiException.conflict("ADMIN_ALREADY_PROVISIONED","The one-time administrator is already provisioned.");
        jdbc.update("INSERT INTO app_accounts(id,username,password_hash) VALUES(1,?,?)",username.toLowerCase(Locale.ROOT),passwords.encode(password));
    }
}
