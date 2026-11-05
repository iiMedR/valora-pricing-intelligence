package com.smartpricing.shopify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.*;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.concurrent.Flow;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class HttpProviderTest {
    @Test void exchangeUsesPinnedHttpsFormExpiryAndRedactsProviderFailures()throws Exception{
        HttpClient client=mock(HttpClient.class);@SuppressWarnings("unchecked")HttpResponse<byte[]> response=mock(HttpResponse.class);when(response.statusCode()).thenReturn(200);when(response.body()).thenAnswer(i->("{\"access_token\":\"ephemeral-access\",\"refresh_token\":\"ephemeral-refresh\",\"expires_in\":3600,\"refresh_token_expires_in\":7776000,\"scope\":\"read_products,read_orders,read_inventory,read_locations\"}".getBytes(StandardCharsets.UTF_8)));when(client.sendAsync(any(),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(java.util.concurrent.CompletableFuture.completedFuture(response));
        Instant now=Instant.parse("2026-11-12T00:00:00Z");var provider=new HttpShopifyProvider(new ShopifySettings(true,"test-id","ephemeral-secret","","https://example.test"),new ObjectMapper(),Clock.fixed(now,ZoneOffset.UTC),client);var tokens=provider.exchange("example-shop.myshopify.com","ephemeral-code");assertThat(tokens.accessExpires()).isEqualTo(now.plusSeconds(3600));assertThat(tokens.toString()).doesNotContain("ephemeral-access","ephemeral-refresh");
        var capture=org.mockito.ArgumentCaptor.forClass(HttpRequest.class);verify(client).sendAsync(capture.capture(),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());var request=capture.getValue();assertThat(request.uri().toString()).isEqualTo("https://example-shop.myshopify.com/admin/oauth/access_token");assertThat(request.timeout().orElseThrow()).isEqualTo(Duration.ofSeconds(10));assertThat(body(request)).contains("expiring=1","client_id=test-id","code=ephemeral-code");
        when(response.statusCode()).thenReturn(302);assertThatThrownBy(()->provider.exchange("example-shop.myshopify.com","ephemeral-code")).hasMessage("Shopify token exchange failed.").hasNoCause();
    }
    @Test void malformedDomainsNeverReachHttpAndRevocationIsBounded()throws Exception{
        HttpClient client=mock(HttpClient.class);var provider=new HttpShopifyProvider(new ShopifySettings(true,"test-id","ephemeral-secret","","https://example.test"),new ObjectMapper(),Clock.systemUTC(),client);assertThatThrownBy(()->provider.exchange("localhost:8080","fake-code")).isInstanceOf(IllegalStateException.class);assertThat(provider.revoke("evil.test","ephemeral-token")).isFalse();verifyNoInteractions(client);
        @SuppressWarnings("unchecked")HttpResponse<byte[]> response=mock(HttpResponse.class);when(response.statusCode()).thenReturn(200);when(response.body()).thenAnswer(i->("{\"data\":{\"appUninstall\":{\"app\":{\"id\":\"test-installation\"},\"userErrors\":[]}}}".getBytes(StandardCharsets.UTF_8)));when(client.sendAsync(any(),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(java.util.concurrent.CompletableFuture.completedFuture(response));assertThat(provider.revoke("example-shop.myshopify.com","ephemeral-token")).isTrue();
    }
    @Test void refreshUsesServerSideRotatingGrantWithoutAnAuthorizationCode()throws Exception{
        HttpClient client=mock(HttpClient.class);@SuppressWarnings("unchecked")HttpResponse<byte[]> response=mock(HttpResponse.class);when(response.statusCode()).thenReturn(200);when(response.body()).thenReturn("{\"access_token\":\"ephemeral-rotated-access\",\"refresh_token\":\"ephemeral-rotated-refresh\",\"expires_in\":3600,\"scope\":\"read_products,read_orders,read_inventory,read_locations\"}".getBytes(StandardCharsets.UTF_8));when(client.sendAsync(any(),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(java.util.concurrent.CompletableFuture.completedFuture(response));
        var provider=new HttpShopifyProvider(new ShopifySettings(true,"test-id","ephemeral-secret","","https://example.test"),new ObjectMapper(),Clock.systemUTC(),client);assertThat(provider.refresh("example-shop.myshopify.com","ephemeral-old-refresh").refresh()).isEqualTo("ephemeral-rotated-refresh");var capture=org.mockito.ArgumentCaptor.forClass(HttpRequest.class);verify(client).sendAsync(capture.capture(),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());assertThat(body(capture.getValue())).contains("grant_type=refresh_token","refresh_token=ephemeral-old-refresh").doesNotContain("&code=","expiring=1");
    }
    private String body(HttpRequest request){ByteArrayOutputStream out=new ByteArrayOutputStream();request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>(){public void onSubscribe(Flow.Subscription subscription){subscription.request(Long.MAX_VALUE);}public void onNext(ByteBuffer buffer){byte[] data=new byte[buffer.remaining()];buffer.get(data);out.writeBytes(data);}public void onError(Throwable error){throw new AssertionError("Body unavailable");}public void onComplete(){}});return out.toString(StandardCharsets.UTF_8);}
}
