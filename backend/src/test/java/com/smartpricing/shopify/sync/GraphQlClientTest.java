package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Flow;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class GraphQlClientTest {
    GraphQlClient.Reply reply(int status,String body){return new GraphQlClient.Reply(status,"2026-10",body.getBytes(StandardCharsets.UTF_8));}
    @Test void retriesRateLimitServerFailureAndNetworkWithBoundedJitterAndPinnedReadOnlyUrl(){
        AtomicInteger attempts=new AtomicInteger();List<Long> waits=new ArrayList<>();
        var client=new GraphQlClient(new ObjectMapper(),"2026-10",request->{assertThat(request.uri().toString()).isEqualTo("https://fixture-shop.myshopify.com/admin/api/2026-10/graphql.json");int attempt=attempts.getAndIncrement();if(attempt==0)return reply(429,"private payload");if(attempt==1)throw new java.io.IOException("private payload");return reply(200,"{\"data\":{\"ok\":true}}");},waits::add);
        assertThat(client.query("fixture-shop.myshopify.com","ephemeral-token","query Test { shop { id } }",Map.of()).path("ok").asBoolean()).isTrue();assertThat(attempts.get()).isEqualTo(3);assertThat(waits).hasSize(2);assertThat(waits.getFirst()).isBetween(500L,749L);
        assertThatThrownBy(()->client.query("evil.test","ephemeral-token","query Test { shop { id } }",Map.of())).hasMessageContaining("canonical");assertThatThrownBy(()->client.query("fixture-shop.myshopify.com","ephemeral-token","mutation Test {}",Map.of())).hasMessage("READ_ONLY_QUERY_REQUIRED");
    }
    @Test void rejectsSchemaPartialAuthAndVersionFailuresWithoutPayloadLeak(){
        for(var response:List.of(reply(401,"secret"),reply(403,"secret"),reply(200,"{\"data\":{\"orders\":null},\"errors\":[{\"message\":\"private customer payload\",\"path\":[\"orders\"]}]}"),new GraphQlClient.Reply(200,"2027-01","{\"data\":{}}".getBytes(StandardCharsets.UTF_8)))){
            AtomicInteger attempts=new AtomicInteger();var client=new GraphQlClient(new ObjectMapper(),"2026-10",request->{attempts.incrementAndGet();return response;},time->{});
            assertThatThrownBy(()->client.query("fixture-shop.myshopify.com","ephemeral-token","query Test {}",Map.of())).isInstanceOf(SyncFailure.class).hasMessageNotContaining("secret").hasMessageNotContaining("customer").hasMessageNotContaining("ephemeral-token").hasNoCause();assertThat(attempts.get()).isEqualTo(1);
        }
    }
    @Test void costPermissionMayDegradeButThrottleAndTransientErrorsHaveMaximumAttempts(){
        var cost=new GraphQlClient(new ObjectMapper(),"2026-10",request->reply(200,"{\"data\":{\"productVariants\":{}},\"errors\":[{\"path\":[\"productVariants\",\"nodes\",0,\"inventoryItem\",\"unitCost\"]}]}"),time->{});
        assertThat(cost.query("fixture-shop.myshopify.com","ephemeral-token","query Test {}",Map.of()).path("_costUnavailable").asBoolean()).isTrue();
        AtomicInteger attempts=new AtomicInteger();var throttle=new GraphQlClient(new ObjectMapper(),"2026-10",request->{attempts.incrementAndGet();return reply(200,"{\"errors\":[{\"extensions\":{\"code\":\"THROTTLED\"}}]}");},time->{});
        assertThatThrownBy(()->throttle.query("fixture-shop.myshopify.com","ephemeral-token","query Test {}",Map.of())).hasMessage("SHOPIFY_RETRY_EXHAUSTED");assertThat(attempts.get()).isEqualTo(4);
    }
    @Test void boundedSubscriberRejectsOversizedBodyAndCancelsStream(){
        var subscriber=new com.smartpricing.common.BoundedHttp.Body(2_097_152);AtomicInteger cancelled=new AtomicInteger();subscriber.onSubscribe(new Flow.Subscription(){public void request(long n){}public void cancel(){cancelled.incrementAndGet();}});subscriber.onNext(List.of(ByteBuffer.allocate(2_097_153)));assertThat(cancelled.get()).isEqualTo(1);assertThatThrownBy(()->subscriber.getBody().toCompletableFuture().join()).hasCauseInstanceOf(IllegalStateException.class);
    }
    @Test void wholeResponseDeadlineCancelsAnUnfinishedBody()throws Exception{
        var client=org.mockito.Mockito.mock(java.net.http.HttpClient.class);var unfinished=new java.util.concurrent.CompletableFuture<java.net.http.HttpResponse<byte[]>>();
        org.mockito.Mockito.when(client.sendAsync(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<byte[]>>any())).thenReturn(unfinished);
        var request=java.net.http.HttpRequest.newBuilder(java.net.URI.create("https://fixture-shop.myshopify.com")).build();
        assertThatThrownBy(()->com.smartpricing.common.BoundedHttp.send(client,request,65536,0)).isInstanceOf(java.util.concurrent.TimeoutException.class);assertThat(unfinished.isCancelled()).isTrue();
    }
}
