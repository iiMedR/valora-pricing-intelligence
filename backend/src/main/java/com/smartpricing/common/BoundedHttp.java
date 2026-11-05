package com.smartpricing.common;

import java.io.ByteArrayOutputStream;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.Flow;

/** Deadline includes streaming the whole body, not just receiving response headers. */
public final class BoundedHttp {
    private BoundedHttp(){}
    public static HttpResponse<byte[]> send(HttpClient client,HttpRequest request,int maxBytes,int seconds)throws Exception{
        var future=client.sendAsync(request,info->new Body(maxBytes));
        try{return future.get(seconds,TimeUnit.SECONDS);}finally{if(!future.isDone())future.cancel(true);}
    }
    public static class Body implements HttpResponse.BodySubscriber<byte[]> {
        private final int limit;private final CompletableFuture<byte[]> result=new CompletableFuture<>();
        private final ByteArrayOutputStream bytes=new ByteArrayOutputStream();private Flow.Subscription subscription;
        public Body(int limit){this.limit=limit;}
        public CompletionStage<byte[]> getBody(){return result;}
        public void onSubscribe(Flow.Subscription value){subscription=value;value.request(1);}
        public void onNext(List<ByteBuffer> buffers){
            for(var buffer:buffers){if((long)bytes.size()+buffer.remaining()>limit){subscription.cancel();result.completeExceptionally(new IllegalStateException("Provider response exceeds configured limit."));return;}byte[] value=new byte[buffer.remaining()];buffer.get(value);bytes.writeBytes(value);}subscription.request(1);
        }
        public void onError(Throwable ignored){result.completeExceptionally(new IllegalStateException("Provider response could not be read."));}
        public void onComplete(){result.complete(bytes.toByteArray());}
    }
}
