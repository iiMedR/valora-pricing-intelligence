package com.smartpricing.auth;

import com.smartpricing.common.ApiException;
import com.smartpricing.demo.config.DemoSafetyGuard;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager manager;private final SessionAuthenticationStrategy strategy;private final HttpSessionSecurityContextRepository contexts;private final LoginLimiter limiter;private final DemoSafetyGuard guard;private final DemoAccess demoAccess;
    public AuthController(AuthenticationManager manager,SessionAuthenticationStrategy strategy,HttpSessionSecurityContextRepository contexts,LoginLimiter limiter,DemoSafetyGuard guard,DemoAccess demoAccess){this.manager=manager;this.strategy=strategy;this.contexts=contexts;this.limiter=limiter;this.guard=guard;this.demoAccess=demoAccess;}
    public record SessionView(String mode,boolean authenticated,boolean readOnly,String username,boolean loginRequired,DemoAccess.Credentials demoAccount){}
    public record Login(@NotBlank @Size(max=64)String username,@NotNull @Size(max=72)String password){@Override public String toString(){return "Login[REDACTED]";}}
    @GetMapping("/me")public SessionView me(Authentication authentication){boolean demo=guard.demoRequested();boolean signedIn=(!demo||demoAccess.required())&&authentication!=null&&authentication.isAuthenticated()&&!(authentication instanceof AnonymousAuthenticationToken);return new SessionView(demo?"DEMO":"NORMAL",signedIn,demo,signedIn?authentication.getName():null,!demo||demoAccess.required(),demoAccess.credentials());}
    @GetMapping("/csrf")public java.util.Map<String,String> csrf(CsrfToken token){token.getToken();return java.util.Map.of("status","READY");}
    @PostMapping("/login")public SessionView login(@Valid @RequestBody Login body,HttpServletRequest request,HttpServletResponse response){
        if(guard.demoRequested()&&!demoAccess.required())throw new ApiException(HttpStatus.FORBIDDEN,"DEMO_READ_ONLY","Demo browsing is anonymous and read-only.");
        if(!limiter.allow(request.getRemoteAddr()))throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"LOGIN_THROTTLED","Too many sign-in attempts. Try again later.");
        if(body.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","Invalid account name or password.");
        try{
            Authentication auth=manager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(body.username(),body.password()));
            strategy.onAuthentication(auth,request,response);var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(auth);SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);limiter.success(request.getRemoteAddr());return me(auth);
        }catch(AuthenticationException failure){throw new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","Invalid account name or password.");}
    }
}
