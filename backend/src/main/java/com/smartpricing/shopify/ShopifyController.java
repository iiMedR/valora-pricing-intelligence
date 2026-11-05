package com.smartpricing.shopify;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/integrations/shopify")
public class ShopifyController {
    private final ShopifyService service;private final ShopifySettings settings;private final String frontend;private final com.smartpricing.demo.config.DemoSafetyGuard guard;
    public ShopifyController(ShopifyService service,ShopifySettings settings,com.smartpricing.demo.config.DemoSafetyGuard guard,@Value("${app.frontend-origin}")String frontend){this.service=service;this.settings=settings;this.guard=guard;
        URI uri=URI.create(frontend);if(uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!(uri.getPath().isEmpty()||uri.getPath().equals("/"))||!("https".equals(uri.getScheme())||"http".equals(uri.getScheme())&&uri.getHost().equals("localhost")))throw new IllegalStateException("Frontend origin must be HTTPS or local HTTP, without paths or query parameters.");this.frontend=uri.getScheme()+"://"+uri.getRawAuthority();}
    public record ShopInput(@NotBlank @Size(max=80)String shop){}
    @GetMapping("/status")public ShopifyService.Status status(){return service.status();}
    @PostMapping("/connect")public Map<String,String> connect(@Valid @RequestBody ShopInput input,HttpServletRequest request){return Map.of("authorizationUrl",service.connect(input.shop(),request.getSession(true)));}
    @PostMapping("/disconnect")public ShopifyService.Status disconnect(){return service.disconnect();}
    @GetMapping("/callback")public ResponseEntity<Void> callback(HttpServletRequest request,Authentication authentication){
        String outcome=service.callback(request.getParameterMap(),request.getSession(false),authentication!=null&&authentication.isAuthenticated()&&!(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken));
        String origin=settings.enabled()&&!guard.demoRequested()?settings.publicOrigin():frontend;
        return ResponseEntity.status(303).location(URI.create(origin+"/store-connection/callback?outcome="+outcome)).header("Referrer-Policy","no-referrer").header("Cache-Control","no-store").build();
    }
}
