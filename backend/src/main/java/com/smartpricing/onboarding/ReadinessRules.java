package com.smartpricing.onboarding;

import static com.smartpricing.onboarding.ReadinessDtos.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class ReadinessRules {
    private ReadinessRules(){}
    public static Finding finding(State state,String code,String message,String source){return new Finding(state,code,message,source);}
    public static Finding constraints(BigDecimal price,BigDecimal cost,BigDecimal min,BigDecimal max){
        if(price==null||min==null||max==null)return finding(State.MISSING,"CONSTRAINTS_MISSING","Set a current price and explicit minimum/maximum limits.","CATALOG");
        if(price.signum()<=0||min.signum()<=0||min.compareTo(max)>0||price.compareTo(min)<0||price.compareTo(max)>0)return finding(State.CONFLICTING,"CONSTRAINTS_INVALID","Prices must be positive and minimum ≤ current ≤ maximum.","CATALOG");
        if(cost!=null&&cost.compareTo(max)>=0)return finding(State.CONFLICTING,"COST_AT_OR_ABOVE_MAXIMUM","No profitable positive-price range remains above the known cost.","CATALOG");
        if(min.compareTo(max)==0)return finding(State.INSUFFICIENT,"FIXED_PRICE_BOUNDS","Bounds are fixed at one quote; this is not permission for a price experiment.","CATALOG");
        return finding(State.AVAILABLE,"CONSTRAINTS_PRESENT","Explicit bounds are present; model feasibility is checked separately.","CATALOG");
    }
    public static Finding stock(Integer quantity,Instant at,String quality,Instant now,int maxHours){
        if(quantity==null||at==null)return finding(State.UNKNOWN,"INVENTORY_UNKNOWN","No stock observation is available; unknown is not zero.","UNKNOWN");
        if("INFERRED".equals(quality))return finding(State.UNKNOWN,"INVENTORY_INFERRED","Inferred stock is not trusted availability evidence.",quality);
        if(at.isBefore(now.minus(Duration.ofHours(maxHours))))return finding(State.STALE,"INVENTORY_STALE","The latest stock observation is too old for current availability.",quality);
        if(quantity==0)return finding(State.INSUFFICIENT,"CURRENT_STOCKOUT","Known zero at one observation does not establish historical stockout periods.",quality);
        return finding(State.AVAILABLE,"CURRENT_STOCK_OBSERVED","Recent positive stock is a point observation, not continuous availability.",quality);
    }
    public static String workflow(boolean demo,boolean connected,String jobState,long lines,boolean review){
        if(demo)return "SYNTHETIC_DEMO";
        if(!connected)return "NOT_CONNECTED";
        if(jobState==null)return "CONNECTED_NOT_SYNCED";
        if(Set.of("PENDING","RUNNING").contains(jobState))return "SYNC_RUNNING";
        if(Set.of("PARTIAL","FAILED").contains(jobState))return "SYNC_FAILED";
        return lines>0&&!review?"READY_FOR_ANALYTICS":"SYNC_COMPLETED_NEEDS_REVIEW";
    }
}
