package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.*;
import com.smartpricing.shopify.ShopifyRules;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.Flow;
import org.springframework.beans.factory.annotation.*;
import org.springframework.stereotype.Component;

@Component
public class GraphQlClient implements ShopifyGraphQl {
    public record Reply(int status,String version,byte[] body) { @Override public String toString(){return "Reply[REDACTED]";} }
    interface Transport { Reply send(HttpRequest request) throws Exception; }
    interface Pause { void waitFor(long milliseconds) throws InterruptedException; }
    private final ObjectMapper mapper;
    private final String version;
    private final Transport transport;
    private final Pause pause;
    @Autowired public GraphQlClient(ObjectMapper mapper,@Value("${app.shopify.sync.api-version:2026-10}")String version) {
        this(mapper,version,new Network(),Thread::sleep);
    }
    GraphQlClient(ObjectMapper mapper,String version,Transport transport,Pause pause) {
        if(!version.matches("20[2-9][0-9]-(01|04|07|10)"))throw new IllegalArgumentException("Pin an explicit Shopify quarterly API version.");
        this.mapper=mapper;this.version=version;this.transport=transport;this.pause=pause;
    }
    @Override public JsonNode query(String domain,String token,String query,Map<String,Object> variables) {
        String shop=ShopifyRules.shop(domain);
        if(token==null||token.isBlank()||!query.stripLeading().startsWith("query ")||query.contains("mutation"))throw new SyncFailure("READ_ONLY_QUERY_REQUIRED");
        for(int attempt=0;attempt<4;attempt++) {
            try {
                var request=HttpRequest.newBuilder(URI.create("https://"+shop+"/admin/api/"+version+"/graphql.json"))
                    .timeout(Duration.ofSeconds(15)).header("Content-Type","application/json").header("X-Shopify-Access-Token",token)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(Map.of("query",query,"variables",variables)))).build();
                Reply reply=transport.send(request);
                if(reply.status()==401)throw new SyncFailure("AUTHORIZATION_EXPIRED_OR_REVOKED");
                if(reply.status()==403)throw new SyncFailure("REQUIRED_SCOPE_OR_PERMISSION_MISSING");
                if(reply.status()==429||reply.status()>=500) { retry(attempt);continue; }
                if(reply.status()!=200)throw new SyncFailure("SHOPIFY_HTTP_REJECTED");
                if(reply.version()!=null&&!version.equals(reply.version()))throw new SyncFailure("API_VERSION_MISMATCH");
                JsonNode root=mapper.readTree(reply.body());
                if(root.hasNonNull("errors")&&!root.path("errors").isEmpty()) {
                    boolean throttled=false,onlyCosts=true;
                    for(JsonNode error:root.path("errors")) {
                        throttled|="THROTTLED".equals(error.path("extensions").path("code").asText());
                        onlyCosts&=error.path("path").toString().contains("\"unitCost\"");
                    }
                    if(throttled){retry(attempt);continue;}
                    if(!onlyCosts||root.path("data").isNull()||root.path("data").isMissingNode())throw new SyncFailure("GRAPHQL_PARTIAL_OR_SCHEMA_ERROR");
                    ((com.fasterxml.jackson.databind.node.ObjectNode)root.path("data")).put("_costUnavailable",true);
                }
                if(!root.path("data").isObject())throw new SyncFailure("GRAPHQL_INVALID_RESPONSE");
                JsonNode throttle=root.path("extensions").path("cost").path("throttleStatus");
                double available=throttle.path("currentlyAvailable").asDouble(1000),rate=throttle.path("restoreRate").asDouble(50);
                if(available<50&&rate>0)pause.waitFor(Math.min(5000,(long)Math.ceil((50-available)/rate*1000)));
                return root.path("data");
            } catch(SyncFailure failure){throw failure;}
              catch(InterruptedException interrupted){Thread.currentThread().interrupt();throw new SyncFailure("SYNC_INTERRUPTED");}
              catch(Exception failure){retry(attempt);}
        }
        throw new SyncFailure("SHOPIFY_RETRY_EXHAUSTED");
    }
    private void retry(int attempt) {
        if(attempt==3)throw new SyncFailure("SHOPIFY_RETRY_EXHAUSTED");
        try{pause.waitFor((500L<<attempt)+ThreadLocalRandom.current().nextLong(250));}
        catch(InterruptedException exception){Thread.currentThread().interrupt();throw new SyncFailure("SYNC_INTERRUPTED");}
    }
    private static final class Network implements Transport {
        private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
        public Reply send(HttpRequest request)throws Exception {
            var response=com.smartpricing.common.BoundedHttp.send(client,request,2_097_152,15);return new Reply(response.statusCode(),response.headers().firstValue("X-Shopify-API-Version").orElse(null),response.body());
        }
    }
}
