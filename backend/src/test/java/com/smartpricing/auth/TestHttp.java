package com.smartpricing.auth;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.client.RestTemplate;
import static org.assertj.core.api.Assertions.*;

// Actual session + cookie CSRF login for existing business integration tests; no bypass profile/filter.
public final class TestHttp {
    private static final String PASSWORD="Ephemeral-test-only-password-2026";
    private static final String HASH=new BCryptPasswordEncoder(12).encode(PASSWORD);
    public static void authenticate(TestRestTemplate rest,JdbcTemplate jdbc){
        jdbc.update("INSERT INTO app_accounts(id,username,password_hash) VALUES(1,'test-admin',?) ON CONFLICT(id) DO NOTHING",HASH);
        RestTemplate login=new RestTemplate();Map<String,String> cookies=new LinkedHashMap<>();String base=rest.getRootUri();
        var csrf=login.getForEntity(base+"/api/v1/auth/csrf",JsonNode.class);read(cookies,csrf.getHeaders());
        HttpHeaders headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);headers.set(HttpHeaders.COOKIE,cookie(cookies));headers.set("X-XSRF-TOKEN",cookies.get("XSRF-TOKEN"));
        var signed=login.exchange(base+"/api/v1/auth/login",HttpMethod.POST,new HttpEntity<>(Map.of("username","test-admin","password",PASSWORD),headers),JsonNode.class);assertThat(signed.getStatusCode().value()).isEqualTo(200);read(cookies,signed.getHeaders());
        HttpHeaders refresh=new HttpHeaders();refresh.set(HttpHeaders.COOKIE,cookie(cookies));read(cookies,login.exchange(base+"/api/v1/auth/csrf",HttpMethod.GET,new HttpEntity<>(refresh),JsonNode.class).getHeaders());
        rest.getRestTemplate().setInterceptors(List.of((request,body,execution)->{request.getHeaders().set(HttpHeaders.COOKIE,cookie(cookies));request.getHeaders().set("X-XSRF-TOKEN",cookies.get("XSRF-TOKEN"));return execution.execute(request,body);}));
    }
    private static void read(Map<String,String> cookies,HttpHeaders headers){for(String line:headers.getOrEmpty(HttpHeaders.SET_COOKIE)){String[] pair=line.split(";",2)[0].split("=",2);if(pair.length==2){if(pair[1].isEmpty())cookies.remove(pair[0]);else cookies.put(pair[0],pair[1]);}}}
    private static String cookie(Map<String,String> cookies){return cookies.entrySet().stream().map(e->e.getKey()+"="+e.getValue()).collect(java.util.stream.Collectors.joining("; "));}
}
