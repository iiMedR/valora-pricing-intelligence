package com.smartpricing.auth;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class LoginLimiter {
    private final Clock clock;private final Map<String,Attempt> attempts=new HashMap<>();
    private Instant globalUntil=Instant.MIN;private int globalCount;
    private record Attempt(Instant until,int count){}
    public LoginLimiter(Clock clock){this.clock=clock;}
    public synchronized boolean allow(String address){
        Instant now=clock.instant();attempts.entrySet().removeIf(e->!e.getValue().until().isAfter(now));
        if(!globalUntil.isAfter(now)){globalUntil=now.plusSeconds(60);globalCount=0;}if(globalCount>=30)return false;globalCount++;
        Attempt previous=attempts.get(address);
        if(previous==null&&attempts.size()>=4096)return false;
        if(previous!=null&&previous.count()>=8)return false;
        attempts.put(address,new Attempt(previous==null?now.plus(Duration.ofMinutes(15)):previous.until(),previous==null?1:previous.count()+1));return true;
    }
    public synchronized void success(String address){attempts.remove(address);}
}
