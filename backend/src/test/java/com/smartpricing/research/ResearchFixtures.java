package com.smartpricing.research;

import com.smartpricing.forecasting.dto.ForecastDtos.Day;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;

/** Independent count-process fixtures. Never imported by application or permanent seed code. */
final class ResearchFixtures {
    static final String VERSION="independent-count-process-v1";
    static final long[] DEV={11,17,23}, TEST={1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012};
    enum Kind {
        EMPTY, ZERO_SALES, N5_CONSTANT, N5_THREE, N20_TWO, N20_FIVE, N50_CONSTANT, N50_FIVE,
        SPARSE_LOW_DEMAND, GROWING100, GROWING250, GROWING500, MATURE3000, LARGE_CONSTANT,
        SEASONAL_CONFOUNDED, PROMO_DISCREPANCY, HIDDEN_MARKETING, WEEKDAY_TREND, STOCKOUT,
        REFUNDS_MISSING_COST, WEAK, STRONG, HIGH_NOISE, NONLINEAR, STRUCTURAL, OUTLIERS,
        KNOWN_OPTIMUM, COMPARABLE_POOL, HETEROGENEOUS_POOL
    }
    // Truth stays in an evaluator object; estimation APIs accept only List<Day>.
    record Truth(double localElasticity,double level,boolean nonlinear,boolean shouldAbstain,String target) {
        double demand(double price) { return level*(nonlinear?Math.exp(-2*(price-100)/100):Math.pow(price/100,localElasticity)); }
        double contribution(double price) { return (price-40)*demand(price); }
    }
    record Fixture(Kind kind,long seed,List<Day> observations,Truth truth,String hash,int nominalObservations) {}
    static Fixture generate(Kind kind,long seed) {
        int n=switch(kind) {case EMPTY->0;case N5_CONSTANT,N5_THREE->5;case N20_TWO,N20_FIVE,COMPARABLE_POOL,HETEROGENEOUS_POOL->20;case N50_CONSTANT,N50_FIVE,SPARSE_LOW_DEMAND->50;case GROWING100->100;case GROWING250->250;case GROWING500->500;case MATURE3000,LARGE_CONSTANT->3000;default->365;};
        double beta=switch(kind) {case WEAK,HETEROGENEOUS_POOL->-.25;case STRONG->-3;case SEASONAL_CONFOUNDED->-1.1;case PROMO_DISCREPANCY,HIDDEN_MARKETING->-1.2;case STRUCTURAL->-.3;default->-2;};
        double level=kind==Kind.SPARSE_LOW_DEMAND?.7:kind==Kind.KNOWN_OPTIMUM?1000:200;
        boolean negative=switch(kind) {case EMPTY,ZERO_SALES,N5_CONSTANT,N5_THREE,N20_TWO,N20_FIVE,N50_CONSTANT,N50_FIVE,SPARSE_LOW_DEMAND,GROWING100,LARGE_CONSTANT,SEASONAL_CONFOUNDED,PROMO_DISCREPANCY,HIDDEN_MARKETING,STOCKOUT,REFUNDS_MISSING_COST,STRUCTURAL,OUTLIERS,HETEROGENEOUS_POOL,COMPARABLE_POOL->true;default->false;};
        Truth truth=new Truth(beta,level,kind==Kind.NONLINEAR,negative,kind==Kind.NONLINEAR?"LOCAL_DERIVATIVE_AT_100":kind==Kind.STRUCTURAL?"FINAL_REGIME_LOCAL_RESPONSE":"CONSTANT_RESPONSE");
        return build(kind,seed,n,truth);
    }
    static Fixture donor(long seed,double beta) {return build(Kind.GROWING250,seed,250,new Truth(beta,200,false,false,"DONOR_ONLY"));}
    private static Fixture build(Kind kind,long seed,int n,Truth truth) {
        Random random=new Random(seed);int span=Math.max(365,n);LocalDate from=LocalDate.of(2020,1,1);
        Set<Integer> observed=new HashSet<>();List<Integer> candidates=new ArrayList<>();for(int i=0;i<span;i++)candidates.add(i);
        Collections.shuffle(candidates,new Random(seed^0x6a09e667L));for(int i=0;i<n;i++)observed.add(candidates.get(i));
        List<Day> rows=new ArrayList<>();
        for(int i=0;i<span;i++) {
            LocalDate day=from.plusDays(i);
            if(!observed.contains(i)) {rows.add(new Day(day,0,0,null,null,"UNOBSERVED","UNKNOWN",null,false,List.of()));continue;}
            boolean constant=Set.of(Kind.N5_CONSTANT,Kind.N50_CONSTANT,Kind.LARGE_CONSTANT).contains(kind);
            double price=constant?100:kind==Kind.N20_TWO?(random.nextBoolean()?80:120):kind==Kind.N5_THREE?new double[]{80,100,120}[random.nextInt(3)]:new double[]{80,90,100,110,120}[random.nextInt(5)];
            // A known recent reference is part of the experimental market design, not estimator truth.
            if(n>=100&&i>=span-56)price=100;
            double seasonal=1,marketing=1,trend=1,weekday=1;
            if(kind==Kind.SEASONAL_CONFOUNDED) {int phase=(i/30)%12;price=phase<4?80:phase<8?100:120;seasonal=.75+phase*.07;}
            if(kind==Kind.HIDDEN_MARKETING||kind==Kind.PROMO_DISCREPANCY)marketing=price<100?1.5:1;
            if(kind==Kind.WEEKDAY_TREND) {weekday=day.getDayOfWeek().getValue()<3?1.4:day.getDayOfWeek().getValue()>=6?.7:1;trend=1+.3*i/span+.12*(i>span/2?1:0);}
            double local=kind==Kind.STRUCTURAL&&i<span/2?-2.6:truth.localElasticity();
            double mean=truth.level()*(truth.nonlinear()?Math.exp(-2*(price-100)/100):Math.pow(price/100,local));
            mean*=seasonal*marketing*trend*weekday*Math.exp(random.nextGaussian()*(kind==Kind.HIGH_NOISE?.65:.03));
            long latent=poisson(random,mean),units=latent;boolean censored=false;
            if(kind==Kind.STOCKOUT&&i%3==0){units=Math.min(latent,40);censored=true;}
            if(kind==Kind.OUTLIERS&&i%41==0)units*=8;
            if(kind==Kind.ZERO_SALES)units=0;
            String effective=amount(price),listed=kind==Kind.PROMO_DISCREPANCY&&price<100?amount(price/0.8):effective;
            rows.add(new Day(day,units,kind==Kind.REFUNDS_MISSING_COST&&i%10==0?Math.min(units,2):0,listed,effective,VERSION,censored?"STOCKOUT":"IN_STOCK",censored?40:1000000,censored,List.of()));
        }
        List<Day> immutable=List.copyOf(rows);
        return new Fixture(kind,seed,immutable,truth,hash(immutable),n);
    }
    // Sum independent small Poissons: exact count sampler without exp(-large lambda) underflow.
    static long poisson(Random random,double lambda) {
        if(lambda<=0)return 0;long sum=0;
        while(lambda>0){double part=Math.min(20,lambda),limit=Math.exp(-part),product=1;int k=0;do{k++;product*=random.nextDouble();}while(product>limit);sum+=k-1;lambda-=part;}return sum;
    }
    static String amount(double value){return String.format(Locale.ROOT,"%.4f",value);}
    static String hash(List<Day> rows) {
        try {var digest=MessageDigest.getInstance("SHA-256");for(Day d:rows)digest.update((d.date()+"|"+d.units()+"|"+d.returnedUnits()+"|"+d.listedPrice()+"|"+d.effectivePrice()+"|"+d.availability()+"|"+d.censored()+"\n").getBytes(StandardCharsets.UTF_8));return HexFormat.of().formatHex(digest.digest());}catch(Exception e){throw new IllegalStateException(e);}
    }
    private ResearchFixtures() {}
}
